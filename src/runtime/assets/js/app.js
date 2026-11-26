/* =============================================================================
 * app.js — Orquestador de la carcasa SCORM
 * Carga data/course.json, monta menú/contenido, aplica reglas SCORM 1.2,
 * persiste en suspend_data y reanuda sesión. Depende de:
 *   scorm_api.js, accessibility.js, interactions.js, renderer.js
 * ===========================================================================*/
(function (global) {
  'use strict';

  var COURSE = null;
  var SCREENS = [];          // lista plana { unit, screen, isFinalTest }
  var current = 0;
  var startTotalSeconds = 0; // tiempo de sesión acumulado al entrar a la pantalla
  var sessionStart = Date.now();
  var screenEnter = Date.now();
  var activeController = null;

  var STATE = { visited: {}, interactions: {}, results: {}, attempts: 0, finalScore: 0 };

  // Locución: activada por defecto. La preferencia se recuerda entre sesiones si
  // el navegador lo permite (localStorage puede fallar en algún LMS: try/catch).
  var audioEnabled = true;
  try { if (global.localStorage && localStorage.getItem('me-audio-enabled') === '0') audioEnabled = false; } catch (e) {}

  // Velocidad de la narración (pantalla e ítems): 1/1.25/1.5/2×, recordada
  // entre sesiones igual que audioEnabled.
  var audioRate = 1;
  try {
    var savedRate = parseFloat(global.localStorage && localStorage.getItem('me-audio-rate'));
    if (savedRate === 1 || savedRate === 1.25 || savedRate === 1.5 || savedRate === 2) audioRate = savedRate;
  } catch (e) {}

  // Volumen de la narración (pantalla e ítems): 0..1, recordado entre sesiones
  // igual que audioRate.
  var audioVolume = 1;
  try {
    var savedVol = parseFloat(global.localStorage && localStorage.getItem('me-audio-volume'));
    if (savedVol >= 0 && savedVol <= 1) audioVolume = savedVol;
  } catch (e) {}
  // Tamaño del texto (A− / A+): factor sobre el rem de <html> en pasos fijos,
  // recordado entre sesiones igual que el audio. Es una preferencia del
  // dispositivo, no del intento: va en localStorage y no en suspend_data.
  var TEXT_SCALES = [1, 1.25, 1.5, 2];
  var textScaleIdx = 0;
  try {
    var savedScale = parseFloat(global.localStorage && localStorage.getItem('me-text-scale'));
    if (TEXT_SCALES.indexOf(savedScale) >= 0) textScaleIdx = TEXT_SCALES.indexOf(savedScale);
  } catch (e) {}
  document.documentElement.style.setProperty('--me-text-scale', String(TEXT_SCALES[textScaleIdx]));
  // El alumno arrastra el seek del reproductor: mientras dura el arrastre no se
  // pisa el valor desde 'timeupdate' (si no, el pulgar «salta» bajo el dedo).
  var seekDragging = false;

  // Modo autor (previsualización del editor): navegación libre sin restricciones
  // de tiempo mínimo, interacciones obligatorias ni secuencia. En el SCORM real
  // (sin este flag) se aplican todas las reglas configuradas. En la Vista
  // estudiante se puede desactivar temporalmente con el conmutador flotante
  // (setupAuthorToggle) para probar el comportamiento real del curso.
  var AUTHOR = !!global.__AUTHOR_MODE__;

  // ---- Carga -------------------------------------------------------------
  function boot() {
    SCORM.initialize();
    // restore() necesita COURSE (StateCodec decodifica por posición contra su
    // estructura), así que se llama tras cargarlo, no antes.
    // Modo previsualización del editor: datos inyectados en memoria.
    if (global.__COURSE_DATA__) { COURSE = global.__COURSE_DATA__; restore(); setup(); return; }
    fetch('data/course.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (data) { COURSE = data; restore(); setup(); })
      .catch(function (e) {
        document.getElementById('me-content').innerHTML = '<p class="me-warn">No se pudo cargar el curso: ' + esc(e) + '</p>';
      });
  }

  // Formato v2 (posicional, compacto) con migración automática del formato
  // antiguo (JSON por ids) — ver state_codec.js.
  function restore() {
    STATE = StateCodec.decode(SCORM.getSuspend(), COURSE, (COURSE.scorm && COURSE.scorm.layouts) || []);
  }
  // Protección de tamaño: cmi.suspend_data tiene un límite de 4096 caracteres
  // en SCORM 1.2. Si el estado completo no cabe, se prueba con degradación
  // creciente (ver degradeDetail en state_codec.js: primero el detalle de
  // exploratorias ya completas, luego respuestas escritas ya acertadas,
  // luego el estado interno de html_embed ya completados) — nunca se tocan
  // visited/results/attempts/finalScore. Si ni así cabe, no se sobrescribe:
  // es preferible conservar la última escritura válida que guardar un
  // suspend_data cortado que el LMS podría truncar o rechazar.
  function persist() {
    var budget = StateCodec.encodeWithBudget(STATE, COURSE, 4096);
    if (budget.fits) {
      SCORM.setSuspend(budget.raw);
    } else if (global.console && global.console.warn) {
      global.console.warn('[SCORM] suspend_data no cabe ni degradado al máximo (' + budget.size + ' > 4096): se conserva la última escritura válida.', budget.breakdown);
    }
    SCORM.setLocation(String(current));
    SCORM.commit();
  }

  // ---- Registro de respuestas en el LMS (cmi.interactions, opcional) -----
  // Solo si el paquete se exportó con «Registrar respuestas» (el export escribe
  // `scorm.track_interactions: true` en el course.json del ZIP; no es un campo
  // del esquema ni se guarda en el .scormproj). Sirve para analizar en el LMS
  // dónde fallan o se atascan los alumnos. Es independiente de suspend_data:
  // no ocupa su presupuesto de 4096 ni interviene en la reanudación (en SCORM
  // 1.2 las interacciones son de solo escritura). Cada «Comprobar» añade una
  // entrada nueva; se limita el volumen por sesión para no inflar el LMS. Un
  // valor que el LMS rechace nunca debe bloquear al alumno: todo en try/catch
  // y, si el LMS no admite interacciones, se deja de intentar.
  var IX = { count: -1, written: 0, perId: {}, lastAttempts: {}, off: false };
  var IX_MAX_TOTAL = 300, IX_MAX_PER_ID = 10;
  function ixEnabled() {
    return !IX.off && !SCORM.isStandalone() && !SCORM.isReview() &&
      !!(COURSE && COURSE.scorm && COURSE.scorm.track_interactions);
  }
  function ixPad(n) { return (n < 10 ? '0' : '') + n; }
  // CMIIdentifier: ASCII imprimible sin espacios, ≤ 255.
  function ixId(raw) { return String(raw).replace(/[^\x21-\x7E]/g, '_').slice(0, 255); }
  // CMITime (hora del día) y CMITimespan (latencia) de SCORM 1.2.
  function ixClock() { var d = new Date(); return ixPad(d.getHours()) + ':' + ixPad(d.getMinutes()) + ':' + ixPad(d.getSeconds()); }
  function ixSpan(sec) {
    sec = Math.max(0, Math.min(sec, 9999 * 3600));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    return (h < 10 ? '0' : '') + h + ':' + ixPad(m) + ':' + ixPad(s);
  }
  // Respuesta del alumno: el estado de la interacción sin los campos de
  // control, en JSON compacto y recortado a los 255 caracteres de SCORM 1.2.
  function ixResponse(v) {
    var o = v;
    if (v && typeof v === 'object') {
      o = {};
      Object.keys(v).forEach(function (k) { if (k !== 'attempts' && k !== 'correct') o[k] = v[k]; });
    }
    var s;
    try { s = typeof o === 'string' ? o : JSON.stringify(o); } catch (e) { s = ''; }
    return String(s == null ? '' : s).slice(0, 255);
  }
  function ixRecord(id, result, response, latencySec) {
    if (!ixEnabled()) return;
    try {
      if (IX.count < 0) IX.count = parseInt(SCORM.get('cmi.interactions._count'), 10) || 0;
      var key = ixId(id), per = IX.perId[key] || 0;
      if (IX.written >= IX_MAX_TOTAL || per >= IX_MAX_PER_ID) return;
      var p = 'cmi.interactions.' + IX.count + '.';
      if (!SCORM.set(p + 'id', key)) { IX.off = true; return; }
      SCORM.set(p + 'time', ixClock());
      SCORM.set(p + 'type', 'performance');
      SCORM.set(p + 'student_response', ixResponse(response));
      SCORM.set(p + 'result', result);
      SCORM.set(p + 'latency', ixSpan(latencySec));
      IX.count++; IX.written++; IX.perId[key] = per + 1;
    } catch (e) { IX.off = true; }
  }
  // Tras cada guardado de una interacción de pantalla: registra un intento
  // nuevo (las que llevan `attempts`) o el paso a resuelta (las que no).
  // `prev` es el resultado antes de este guardado.
  function ixAfterSave(sc, st, prev, r) {
    if (!ixEnabled() || !sc.interaction || !r) return;
    var id = sc.interaction.type + ':' + sc.interaction.id;
    var lat = (Date.now() - screenEnter) / 1000;
    var att = st && typeof st.attempts === 'number' ? st.attempts : null;
    if (att != null) {
      if (att > (IX.lastAttempts[sc.interaction.id] || 0)) {
        IX.lastAttempts[sc.interaction.id] = att;
        ixRecord(id, r.correct ? 'correct' : 'wrong', st, lat);
      }
    } else if (r.completed && !(prev && prev.completed)) {
      ixRecord(id, r.scored ? (r.correct ? 'correct' : 'wrong') : 'neutral', st, lat);
    }
  }

  function flatten() {
    SCREENS = [];
    // Pantallas sueltas de introducción del paquete SCORM, antes de cualquier
    // módulo (portada, bienvenida, objetivos generales…): se navegan igual que
    // cualquier otra (Anterior/Siguiente, progreso, finalización), pero
    // buildMenu() no les da entrada de índice — ver `isIntro` ahí.
    (COURSE.intro_screens || []).forEach(function (sc) { SCREENS.push({ unit: null, module: null, screen: sc, isFinalTest: false, isIntro: true }); });
    (COURSE.modules || []).forEach(function (m) {
      // Pantallas propias del módulo (portada/presentación): siempre antes de
      // las de sus unidades. Mismo orden que screenContainers() en el editor.
      (m.screens || []).forEach(function (sc) { SCREENS.push({ unit: null, module: m, screen: sc, isFinalTest: false }); });
      (m.units || []).forEach(function (u) {
        // Bloque de «pantallas sueltas entre unidades» (u.loose): NO es una
        // unidad real — se pasa `unit: null` para que se traten exactamente
        // como las pantallas propias del módulo (miga de pan, coverLevel,
        // entrada de menú), igual que screenContainers() en el editor.
        var owner = u.loose ? null : u;
        (u.screens || []).forEach(function (sc) { SCREENS.push({ unit: owner, module: m, screen: sc, isFinalTest: false }); });
      });
      // Pantallas de cierre del módulo (closing_screens): sueltas, después de
      // todas sus unidades — para un resumen/cierre antes de pasar al
      // siguiente módulo. Mismo tratamiento que las de arriba (module, sin
      // unit), solo cambia dónde caen en el orden.
      (m.closing_screens || []).forEach(function (sc) { SCREENS.push({ unit: null, module: m, screen: sc, isFinalTest: false, isClosing: true }); });
    });
    if (COURSE.assessments && COURSE.assessments.final_test && (COURSE.assessments.final_test.questions || []).length) {
      SCREENS.push({ unit: null, module: null, screen: { id: '__final__', type: 'final_test', title: COURSE.assessments.final_test.title || 'Test final', required: true }, isFinalTest: true });
    }
    // Pantalla de resultados al final, si hay algo que calificar (test final o
    // interacciones evaluables). Muestra la nota, APTO/NO APTO y el desglose.
    var hasFinal = COURSE.assessments && COURSE.assessments.final_test && (COURSE.assessments.final_test.questions || []).length;
    var hasScoredInter = SCREENS.some(function (e) { return !e.isFinalTest && e.screen.interaction && e.screen.interaction.scored; });
    // En modo «screens» la pantalla existe SIEMPRE, aunque no haya nada que
    // calificar: es el cierre («¡Enhorabuena!» o qué falta) de un paquete sin
    // test. Ese caso NO entra en la estructura de state_codec.js (flattenScreens),
    // a propósito: no es obligatoria, su visita no importa (el codec mapea por id)
    // y así no cambia la huella de los paquetes ya publicados en ese modo.
    var screensMode = ((COURSE.scorm && COURSE.scorm.rules) || {}).completion_mode === 'screens';
    if (hasFinal || hasScoredInter || screensMode) {
      SCREENS.push({ unit: null, module: null, screen: { id: '__results__', type: 'results', title: 'Resultados', required: false }, isResults: true });
    }
    // Pantallas sueltas de cierre del paquete SCORM (COURSE.closing_screens):
    // lo último de todo, después incluso del test final y los resultados —
    // simétrico a intro_screens, que va lo primero de todo.
    (COURSE.closing_screens || []).forEach(function (sc) { SCREENS.push({ unit: null, module: null, screen: sc, isFinalTest: false, isOutro: true }); });
  }

  // ---- Setup UI ----------------------------------------------------------
  function setup() {
    flatten();
    applyBranding();
    buildMenu();
    bindChrome();
    // Curso sin pantallas (estructura vacía en el editor): mensaje amable en
    // vez de romper (goTo leería SCREENS[0], que no existe).
    if (!SCREENS.length) {
      document.getElementById('me-content').innerHTML =
        '<article class="me-screen"><p class="me-warn">Este curso aún no tiene pantallas. Añádelas en el editor para previsualizarlo.</p></article>';
      document.getElementById('me-position').textContent = '0 / 0';
      refreshNavState();
      return;
    }
    var rules = COURSE.scorm.rules || {};
    if (rules.allow_resume) {
      var loc = parseInt(SCORM.getLocation(), 10);
      if (!isNaN(loc) && loc >= 0 && loc < SCREENS.length) current = loc;
    }
    // En modo autor (Vista estudiante) arranca en la diapositiva activa del editor.
    if (AUTHOR && global.__START_SCREEN_ID__) {
      for (var si = 0; si < SCREENS.length; si++) {
        if (SCREENS[si].screen && SCREENS[si].screen.id === global.__START_SCREEN_ID__) { current = si; break; }
      }
    }
    if (SCORM.getStatus() === 'not attempted') SCORM.setStatus('incomplete');
    // En móvil el menú lateral arranca cerrado para no tapar el contenido.
    if (isMobile()) document.getElementById('me-app').classList.add('me-menu-hidden');
    reflectMenuUI();
    goTo(current, true);
  }

  function isMobile() { return global.matchMedia && global.matchMedia('(max-width: 760px)').matches; }
  function closeMenuIfMobile() {
    if (isMobile()) {
      document.getElementById('me-app').classList.add('me-menu-hidden');
      reflectMenuUI();
    }
  }

  function applyBranding() {
    var shell = COURSE.shell || {};
    if (shell.primary_color) document.documentElement.style.setProperty('--me-primary', shell.primary_color);
    if (shell.accent_color) document.documentElement.style.setProperty('--me-accent', shell.accent_color);
    // Nivel de animación de la carcasa (shell.motion): none | subtle | rich.
    MOTION = ['none', 'rich', 'vivid'].indexOf(shell.motion) >= 0 ? shell.motion : 'subtle';
    document.body.classList.add('me-motion-' + MOTION);
    // 'vivid' (Llamativas) incluye todo lo de 'rich' (revelado progresivo): el CSS
    // de 'rich' aplica también con esta clase; las reglas propias van en me-motion-vivid.
    if (MOTION === 'vivid') document.body.classList.add('me-motion-rich');
    // Velocidad (shell.motion_speed): fast | normal | slow. La clase alimenta
    // la variable CSS --me-speed; SPEED escala los delays de la cascada JS.
    var spd = shell.motion_speed === 'fast' || shell.motion_speed === 'slow' ? shell.motion_speed : 'normal';
    SPEED = spd === 'fast' ? 1 : spd === 'slow' ? 3 : 1.5;
    document.body.classList.add('me-speed-' + spd);
    // La marca solo se muestra si el autor la configuró: sin marca, la cabecera
    // lleva únicamente el título del curso (con estilo destacado, .me-no-brand).
    // 'SCORMEditor' era el default histórico del schema: se trata como «sin marca».
    var brand = (shell.brand || '').trim();
    if (!brand || brand === 'SCORMEditor') {
      document.getElementById('me-brand').hidden = true;
      document.querySelector('.me-topbar').classList.add('me-no-brand');
    } else {
      document.getElementById('me-brand').textContent = brand;
    }
    document.getElementById('me-course-title').textContent = COURSE.course.title || '';
    document.title = COURSE.course.title || 'Curso SCORM';
    document.documentElement.lang = (shell.language || COURSE.course.language || 'es');
    // Los rótulos personalizados de glosario/recursos (glossary_title /
    // bibliography_title) los recoge buildMenu() directamente al generar las
    // entradas del menú lateral (ya no son botones propios de la topbar).
  }

  // Datos de la pantalla «Instrucciones de uso» (template `guide` en
  // renderer.js): se deducen del propio curso, no los escribe el autor, para
  // que la guía no se desfase al añadir/quitar audio, materiales o test.
  function guideInfo() {
    var rules = COURSE.scorm.rules || {};
    var screens = SCREENS.filter(function (e) { return e.screen && !e.isFinalTest && !e.isResults; })
      .map(function (e) { return e.screen; });
    var materials = [];
    if ((COURSE.glossary || []).length) materials.push({ icon: 'book-open', title: glossaryTitle() });
    if ((COURSE.bibliography || []).length) materials.push({ icon: 'paperclip', title: bibliographyTitle() });
    if ((COURSE.attachments || []).length) materials.push({ icon: 'file-text', title: attachmentsTitle() });
    return {
      navigation: rules.navigation || 'mixed',
      hasAudio: screens.some(function (s) { return !!s.audio_src; }),
      hasTranscripts: screens.some(function (s) { return !!s.transcript && !s.transcript_hidden; }),
      hasMinTime: screens.some(function (s) { return (s.min_time_seconds || 0) > 0; }),
      hasScored: rules.score_source !== 'final_test' && screens.some(function (s) { return s.interaction && s.interaction.scored; }),
      hasFinalTest: SCREENS.some(function (e) { return e.isFinalTest; }),
      materials: materials,
    };
  }

  function glossaryTitle() {
    return (COURSE.glossary_title || '').trim() || 'Glosario';
  }
  function bibliographyTitle() {
    return (COURSE.bibliography_title || '').trim() || 'Recursos y bibliografía';
  }
  function attachmentsTitle() {
    return (COURSE.attachments_title || '').trim() || 'Documentos';
  }
  // Peso legible de un documento adjunto (coma decimal, como en el editor).
  function fmtBytes(n) {
    if (!n) return '';
    if (n >= 1048576) return (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  // Etiqueta de una pantalla en el menú lateral: mismo criterio y prefijo
  // «Actividad: » que el título de la propia diapositiva (renderer.js, .me-screen-scored)
  // cuando su interacción puntúa y las actividades cuentan para la nota.
  function menuScreenLabel(sc) {
    var showScored = (COURSE.scorm.rules || {}).score_source !== 'final_test';
    var scored = showScored && sc.interaction && sc.interaction.scored;
    var title = sc.title || sc.type;
    // Criterio editorial: toda actividad se titula «Actividad: …» (evaluable o
    // no); si el autor ya lo escribió, no se duplica.
    return (scored && !/^actividad\s*:/i.test(title) ? 'Actividad: ' : '') + title;
  }

  function buildMenu() {
    var nav = document.getElementById('me-menu');
    var html = '';
    var idx = 0;
    // Pantallas de introducción del paquete SCORM (COURSE.intro_screens): van
    // primero en SCREENS (flatten()) y también primero en el menú, sueltas
    // (sin agrupar bajo un título de módulo, porque no pertenecen a ninguno).
    var introScreens = COURSE.intro_screens || [];
    if (introScreens.length) {
      html += '<div class="me-menu-module me-menu-intro"><ul>';
      introScreens.forEach(function (sc) {
        html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
          '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
        idx++;
      });
      html += '</ul></div>';
    }
    (COURSE.modules || []).forEach(function (m) {
      html += '<div class="me-menu-module"><p class="me-menu-mtitle">' + esc(m.title) + '</p>';
      // Pantallas propias del módulo: cuelgan del título del módulo, sin rótulo
      // de unidad ni mini-barra (refreshMenuChecks tolera su ausencia).
      var mCount = (m.screens || []).length;
      if (mCount) {
        html += '<div class="me-menu-unit" data-start="' + idx + '" data-count="' + mCount + '"><ul>';
        (m.screens || []).forEach(function (sc) {
          html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
            '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
          idx++;
        });
        html += '</ul></div>';
      }
      (m.units || []).forEach(function (u) {
        // Bloque de «pantallas sueltas entre unidades» (u.loose): NO es una
        // unidad real — mismo tratamiento que las pantallas propias/de cierre
        // del módulo, arriba: sueltas, sin título de unidad ni mini-barra de
        // progreso, sin bloque propio si está vacío.
        if (u.loose) {
          var looseScreens = u.screens || [];
          if (!looseScreens.length) return;
          html += '<div class="me-menu-unit" data-start="' + idx + '" data-count="' + looseScreens.length + '"><ul>';
          looseScreens.forEach(function (sc) {
            html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
              '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
            idx++;
          });
          html += '</ul></div>';
          return;
        }
        // Unidad real con el título oculto en el menú (`unit.hide_menu_title`):
        // sus pantallas se listan igual, solo desaparecen el rótulo de la
        // unidad y la mini-barra de progreso (la unidad sigue existiendo a
        // todos los demás efectos: editor, validación, miga de pan de cada
        // pantalla).
        if (u.hide_menu_title) {
          var titledScreens = u.screens || [];
          if (!titledScreens.length) return;
          html += '<div class="me-menu-unit" data-start="' + idx + '" data-count="' + titledScreens.length + '"><ul>';
          titledScreens.forEach(function (sc) {
            html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
              '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
            idx++;
          });
          html += '</ul></div>';
          return;
        }
        // data-start/data-count delimitan las pantallas de la unidad para el
        // contador y la mini-barra de progreso (refreshMenuChecks los rellena).
        var count = (u.screens || []).length;
        html += '<div class="me-menu-unit" data-start="' + idx + '" data-count="' + count + '">' +
          '<p class="me-menu-utitle"><span>' + esc(u.title) + '</span>' +
          '<span class="me-menu-count"></span></p>' +
          '<div class="me-menu-uprog" aria-hidden="true"><div class="me-menu-uprog-fill"></div></div><ul>';
        (u.screens || []).forEach(function (sc) {
          html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
            '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
          idx++;
        });
        html += '</ul></div>';
      });
      // Pantallas de cierre del módulo: mismo tratamiento que las propias de
      // arriba (sueltas, sin unidad ni mini-barra), después de sus unidades.
      var closingCount = (m.closing_screens || []).length;
      if (closingCount) {
        html += '<div class="me-menu-unit" data-start="' + idx + '" data-count="' + closingCount + '"><ul>';
        (m.closing_screens || []).forEach(function (sc) {
          html += '<li><button class="me-menu-link" data-idx="' + idx + '">' + esc(menuScreenLabel(sc)) +
            '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
          idx++;
        });
        html += '</ul></div>';
      }
      html += '</div>';
    });
    // Pantallas sintéticas finales (test final y/o resultados), que van tras los
    // módulos en SCREENS a partir del índice acumulado. Agrupadas bajo un
    // rótulo propio («Evaluación»), con el mismo tratamiento visual que un
    // módulo/tema (.me-menu-final, ver styles.css) — antes salían sueltas,
    // sin distinguirse del resto del índice. Acotado por `evalEnd`, no por
    // `SCREENS.length`: el cierre del paquete SCORM (COURSE.closing_screens)
    // va SIEMPRE lo último de todo (flatten()) y necesita su propio grupo,
    // no colarse dentro de «Evaluación».
    var evalEnd = SCREENS.length - (COURSE.closing_screens || []).length;
    if (idx < evalEnd) {
      html += '<div class="me-menu-final"><p class="me-menu-mtitle">Evaluación</p><ul>';
      for (var k = idx; k < evalEnd; k++) {
        html += '<li><button class="me-menu-link" data-idx="' + k + '">' +
          esc(menuScreenLabel(SCREENS[k].screen)) + '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
      }
      html += '</ul></div>';
      idx = evalEnd;
    }
    if (idx < SCREENS.length) {
      html += '<div class="me-menu-final"><p class="me-menu-mtitle">Cierre</p><ul>';
      for (var k2 = idx; k2 < SCREENS.length; k2++) {
        html += '<li><button class="me-menu-link" data-idx="' + k2 + '">' +
          esc(menuScreenLabel(SCREENS[k2].screen)) + '<span class="me-menu-check" aria-hidden="true"></span></button></li>';
      }
      html += '</ul></div>';
    }
    // Materiales transversales del curso (Glosario, Recursos): al final del
    // índice, con icono. Clase propia (.me-menu-material, no .me-menu-link)
    // para que refreshMenuChecks no los confunda con pantallas navegables —
    // abren un modal (data-modal) en vez de tener data-idx. Cada botón solo
    // aparece si su sección tiene contenido (igual que el test final, que
    // solo entra en el índice si existe).
    var materialsHtml = '';
    if ((COURSE.glossary || []).length) {
      materialsHtml += '<li><button type="button" class="me-menu-material" data-modal="glossary">' +
        '<span data-icon="book-open" aria-hidden="true"></span>' + esc(glossaryTitle()) + '</button></li>';
    }
    if ((COURSE.bibliography || []).length) {
      materialsHtml += '<li><button type="button" class="me-menu-material" data-modal="resources">' +
        '<span data-icon="paperclip" aria-hidden="true"></span>' + esc(bibliographyTitle()) + '</button></li>';
    }
    if ((COURSE.attachments || []).length) {
      materialsHtml += '<li><button type="button" class="me-menu-material" data-modal="documents">' +
        '<span data-icon="file-text" aria-hidden="true"></span>' + esc(attachmentsTitle()) + '</button></li>';
    }
    if (materialsHtml) html += '<div class="me-menu-materials"><ul>' + materialsHtml + '</ul></div>';
    nav.innerHTML = html;
    global.MEIcons.hydrate(nav);
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('.me-menu-link, .me-menu-material'); if (!b) return;
      var modal = b.getAttribute('data-modal');
      if (modal) { openModal(modal); closeMenuIfMobile(); return; }
      var target = parseInt(b.getAttribute('data-idx'), 10);
      if (canNavigateTo(target)) { goTo(target); closeMenuIfMobile(); }
      else A11Y.announce('Esa pantalla aún no está disponible. Completa las anteriores.');
    });
  }

  function bindChrome() {
    document.getElementById('me-prev').addEventListener('click', function () { goRelative(-1); });
    document.getElementById('me-next').addEventListener('click', function () { goRelative(1); });
    document.getElementById('me-toggle-menu').addEventListener('click', toggleMenu);
    document.getElementById('me-menu-tab').addEventListener('click', toggleMenu);
    document.getElementById('me-btn-transcript').addEventListener('click', toggleTranscript);
    document.getElementById('me-btn-audio').addEventListener('click', toggleAudio);
    reflectAudioButton();
    document.getElementById('me-btn-playpause').addEventListener('click', togglePlayPause);
    var seekEl = document.getElementById('me-audio-seek');
    seekEl.addEventListener('pointerdown', function () { seekDragging = true; });
    seekEl.addEventListener('pointerup', function () { seekDragging = false; });
    seekEl.addEventListener('input', function () {
      var a = currentNarration();
      if (!a || !isFinite(a.duration) || a.duration <= 0) return;
      a.currentTime = (parseFloat(seekEl.value) / 1000) * a.duration;
    });
    var volEl = document.getElementById('me-audio-volume');
    volEl.value = String(audioVolume);
    volEl.addEventListener('input', function () { setAudioVolume(parseFloat(volEl.value)); });
    var rateSel = document.getElementById('me-audio-rate');
    if (rateSel) {
      rateSel.value = String(audioRate);
      rateSel.addEventListener('change', function () { setAudioRate(parseFloat(rateSel.value)); });
    }
    setupTextSize();
    document.getElementById('me-btn-print').addEventListener('click', function () { window.print(); });
    document.getElementById('me-btn-help').addEventListener('click', function () { openModal('help'); });
    document.getElementById('me-btn-close').addEventListener('click', requestExit);
    setupFullscreen();
    document.querySelectorAll('.me-modal-close').forEach(function (b) { b.addEventListener('click', closeModals); });
    A11Y.bindShortcuts({ next: function () { goRelative(1); }, prev: function () { goRelative(-1); }, menu: toggleMenu, transcript: toggleTranscript });
    // pagehide además de beforeunload: Safari/iOS no dispara beforeunload de
    // forma fiable. finishSession es idempotente, así que oír ambos es seguro.
    global.addEventListener('beforeunload', function () { finishSession(); });
    global.addEventListener('pagehide', function () { finishSession(); });
    setupLightbox();
    setupProgressScrub();
    setupPrint();
    setupAuthorToggle();
  }

  // ---- Conmutador de modo autor (solo previsualización) --------------------
  // Píldora flotante que permite desactivar el modo autor para ver el
  // comportamiento real de la diapositiva (tiempo mínimo, interacciones
  // obligatorias, navegación). Solo se crea si __AUTHOR_MODE__ existe: en el
  // SCORM exportado no aparece. Por defecto el modo autor está activado.
  function setupAuthorToggle() {
    if (!global.__AUTHOR_MODE__) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'me-author-toggle';
    // Anclada a .me-body: queda sobre la esquina superior derecha del área de
    // contenido (persistente: no la borra el re-render de cada diapositiva).
    document.querySelector('.me-body').appendChild(btn);
    function reflect() {
      btn.classList.toggle('is-on', AUTHOR);
      btn.setAttribute('aria-pressed', String(AUTHOR));
      btn.innerHTML = '<span class="me-author-dot" aria-hidden="true"></span>Modo autor: ' +
        (AUTHOR ? 'activado' : 'desactivado');
      btn.title = AUTHOR
        ? 'Navegación libre, sin reglas. Pulsa para probar el comportamiento real del curso.'
        : 'Se aplican las reglas reales del curso. Pulsa para volver a la navegación libre.';
    }
    btn.addEventListener('click', function () {
      AUTHOR = !AUTHOR;
      // Al pasar a modo real, el tiempo mínimo de la pantalla actual cuenta
      // desde ahora (si no, llevaría ya consumido el rato de edición previa).
      if (!AUTHOR) { screenEnter = Date.now(); startMinTimer(); }
      reflect();
      refreshMenuChecks();
      refreshNavState();
      A11Y.announce(AUTHOR
        ? 'Modo autor activado: navegación libre.'
        : 'Modo autor desactivado: se aplican las reglas del curso.');
    });
    reflect();
  }

  // Impresión: solo se imprime la pantalla actual (ver print/print.css). Las
  // interactividades informativas (desplegables, pestañas, tarjetas) ocultan
  // contenido tras un clic; al imprimir lo mostramos todo para que el papel sea
  // completo, y lo restauramos al terminar. Se engancha a los eventos nativos
  // beforeprint/afterprint, así funciona igual con el botón Imprimir y con Ctrl+P.
  function setupPrint() {
    var undo = [];
    global.addEventListener('beforeprint', function () {
      undo = [];
      var content = document.getElementById('me-content');
      if (!content) return;

      // Desplegables (accordion y línea de tiempo): abrir todos los apartados.
      content.querySelectorAll('.me-acc-head[aria-expanded="false"], .me-tl-head[aria-expanded="false"]').forEach(function (head) {
        head.setAttribute('aria-expanded', 'true');
        var body = document.getElementById(head.getAttribute('aria-controls'));
        if (body) body.hidden = false;
        undo.push(function () {
          head.setAttribute('aria-expanded', 'false');
          if (body) body.hidden = true;
        });
      });

      // Pestañas (tabs): mostrar todos los paneles, cada uno rotulado con el
      // título de su pestaña (el orden del DOM es tablist + paneles seguidos).
      content.querySelectorAll('[role=tabpanel]').forEach(function (panel) {
        var wasHidden = panel.hidden;
        panel.hidden = false;
        var tab = document.getElementById(panel.getAttribute('aria-labelledby') || '');
        var label = null;
        if (tab) {
          label = document.createElement('p');
          label.className = 'me-print-tablabel';
          label.textContent = tab.textContent;
          panel.parentNode.insertBefore(label, panel);
        }
        undo.push(function () {
          panel.hidden = wasHidden;
          if (label) label.remove();
        });
      });

      // Tarjetas (flip cards): con el volteo 3D ambas caras están siempre en el
      // DOM; el aplanado (anverso y reverso a la vez) lo hace print.css.
    });
    global.addEventListener('afterprint', function () {
      undo.forEach(function (fn) { fn(); });
      undo = [];
    });
  }

  // Ampliación de imágenes (lightbox) accesible. Funciona por delegación, así
  // que cubre cualquier imagen .me-zoomable renderada en cada pantalla.
  function setupLightbox() {
    if (document.getElementById('me-lightbox')) return;
    var lb = document.createElement('div');
    lb.id = 'me-lightbox';
    lb.className = 'me-lightbox';
    lb.hidden = true;
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Imagen ampliada');
    lb.innerHTML = '<div class="me-lightbox-tools">' +
      '<button class="me-lightbox-zoom" data-zoom="out" aria-label="Alejar (−)">−</button>' +
      '<button class="me-lightbox-zoom" data-zoom="in" aria-label="Acercar (+)">+</button>' +
      '<button class="me-lightbox-close" aria-label="Cerrar (Esc)">✕</button></div>' +
      '<img class="me-lightbox-img" alt="" draggable="false">';
    document.body.appendChild(lb);
    var img = lb.querySelector('.me-lightbox-img');

    // --- Zoom propio (pellizco, doble toque, arrastre, rueda, + / −) --------
    // No se usa el zoom del navegador porque en pantalla completa (Fullscreen
    // API) Chrome para Android lo desactiva, y la app de Moodle lo bloquea
    // siempre. La imagen se transforma con translate+scale (origen en su
    // centro); `tx/ty` es el desplazamiento respecto a su posición ajustada.
    var MAX = 6, scale = 1, tx = 0, ty = 0;
    var pointers = {}, gesture = null, moved = false, lastTap = 0, lastTapX = 0, lastTapY = 0;
    function apply() {
      img.style.transform = scale === 1 && !tx && !ty ? '' : 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
      lb.classList.toggle('is-zoomed', scale > 1.001);
    }
    function clampPan() {
      // Sin huecos: la imagen ampliada no puede separarse del borde visible.
      var mx = Math.max(0, (img.offsetWidth * scale - lb.clientWidth) / 2);
      var my = Math.max(0, (img.offsetHeight * scale - lb.clientHeight) / 2);
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
    }
    // Centro de la imagen sin transformar, en coordenadas de pantalla.
    function center() {
      return { x: img.offsetLeft + img.offsetWidth / 2, y: img.offsetTop + img.offsetHeight / 2 };
    }
    // Lleva la escala a `next` manteniendo quieto el punto de pantalla (fx, fy),
    // partiendo de un estado base (s0, x0, y0): así sirve igual para la rueda
    // (base = estado actual) que para el pellizco (base = estado al empezar).
    function zoomAround(next, fx, fy, s0, x0, y0) {
      var c = center();
      next = Math.max(1, Math.min(MAX, next));
      var k = next / s0;
      tx = (fx - c.x) - k * (fx - c.x - x0);
      ty = (fy - c.y) - k * (fy - c.y - y0);
      scale = next;
      if (scale === 1) { tx = 0; ty = 0; }
      clampPan(); apply();
    }
    function zoomStep(factor) {
      var r = lb.getBoundingClientRect();
      zoomAround(scale * factor, r.left + r.width / 2, r.top + r.height / 2, scale, tx, ty);
    }
    function resetZoom() { scale = 1; tx = 0; ty = 0; pointers = {}; gesture = null; apply(); }
    function startGesture() {
      var ids = Object.keys(pointers);
      if (ids.length >= 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        gesture = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s0: scale, x0: tx, y0: ty };
      } else if (ids.length === 1) {
        var p = pointers[ids[0]];
        gesture = { kind: 'pan', px: p.x, py: p.y, x0: tx, y0: ty };
      } else gesture = null;
    }
    lb.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, onBg: e.target === lb };
      if (Object.keys(pointers).length === 1) moved = false;
      try { lb.setPointerCapture(e.pointerId); } catch (err) { /* sin captura, sigue funcionando */ }
      startGesture();
    });
    lb.addEventListener('pointermove', function (e) {
      var p = pointers[e.pointerId];
      if (!p || !gesture) return;
      p.x = e.clientX; p.y = e.clientY;
      if (Math.abs(p.x - p.sx) > 8 || Math.abs(p.y - p.sy) > 8) moved = true;
      if (gesture.kind === 'pinch') {
        var ids = Object.keys(pointers), a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        // Escala respecto al punto medio inicial y, después, se arrastra con él.
        zoomAround(gesture.s0 * d / gesture.d0, gesture.mx, gesture.my, gesture.s0, gesture.x0, gesture.y0);
        if (scale > 1) { tx += mx - gesture.mx; ty += my - gesture.my; clampPan(); apply(); }
      } else if (scale > 1) {
        tx = gesture.x0 + (p.x - gesture.px); ty = gesture.y0 + (p.y - gesture.py);
        clampPan(); apply();
      }
    });
    function endPointer(e) {
      if (!pointers[e.pointerId]) return;
      var p = pointers[e.pointerId];
      delete pointers[e.pointerId];
      startGesture(); // de pellizco a arrastre con el dedo que queda, sin saltos
      if (e.type !== 'pointerup' || moved || Object.keys(pointers).length) return;
      // Toque en el fondo: cierra. Se decide aquí y no en `click` porque, con la
      // captura de puntero, el clic llega siempre al visor y no a la imagen.
      if (p.onBg) { close(); return; }
      // Doble toque / doble clic: alterna entre ajustada y ampliada en ese punto.
      var now = Date.now();
      if (now - lastTap < 320 && Math.abs(p.x - lastTapX) < 30 && Math.abs(p.y - lastTapY) < 30) {
        lastTap = 0;
        if (scale > 1) resetZoom(); else zoomAround(2.5, p.x, p.y, scale, tx, ty);
      } else { lastTap = now; lastTapX = p.x; lastTapY = p.y; }
    }
    lb.addEventListener('pointerup', endPointer);
    lb.addEventListener('pointercancel', endPointer);
    lb.addEventListener('wheel', function (e) {
      if (lb.hidden) return;
      e.preventDefault();
      zoomAround(scale * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY, scale, tx, ty);
    }, { passive: false });
    window.addEventListener('resize', function () { if (!lb.hidden) { clampPan(); apply(); } });

    // Diálogo modal: fondo inerte, Tab atrapado, Esc cierra y el foco vuelve a
    // la imagen que lo abrió (A11Y.trapFocus).
    var release = null;
    function open(src, alt) {
      if (!lb.hidden) return;
      resetZoom();
      img.src = src; img.alt = alt || '';
      lb.hidden = false;
      release = A11Y.trapFocus(lb, { onEscape: close, fallback: A11Y.focusMain });
      lb.querySelector('.me-lightbox-close').focus();
    }
    function close() {
      if (lb.hidden) return;
      lb.hidden = true; img.removeAttribute('src'); resetZoom();
      if (release) { var r = release; release = null; r(); }
    }
    lb.addEventListener('click', function (e) {
      var z = e.target.closest && e.target.closest('.me-lightbox-zoom');
      if (z) { zoomStep(z.getAttribute('data-zoom') === 'in' ? 1.5 : 1 / 1.5); return; }
      if (e.target.classList.contains('me-lightbox-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      // Esc lo gestiona A11Y.trapFocus (onEscape: close).
      if (!lb.hidden && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoomStep(1.5); }
      else if (!lb.hidden && (e.key === '-' || e.key === '_')) { e.preventDefault(); zoomStep(1 / 1.5); }
      else if (!lb.hidden && e.key === '0') { e.preventDefault(); resetZoom(); }
      else if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('me-zoomable')) {
        e.preventDefault(); open(e.target.getAttribute('src'), e.target.getAttribute('alt'));
      }
    });
    document.addEventListener('click', function (e) {
      var z = e.target.closest && e.target.closest('.me-zoomable');
      if (z) open(z.getAttribute('src'), z.getAttribute('alt'));
    });
  }

  // ---- Navegación --------------------------------------------------------
  function canNavigateTo(target) {
    if (AUTHOR) return true;
    var nav = (COURSE.scorm.rules || {}).navigation || 'mixed';
    if (nav === 'free') return true;
    if (target <= current) return true;            // volver atrás siempre
    if (nav === 'mixed') {
      // permitido si todas las pantallas previas obligatorias están "ok"
      for (var i = 0; i < target; i++) if (isRequired(i) && !screenSatisfied(i)) return false;
      return true;
    }
    // sequential: solo la siguiente y si la actual está satisfecha
    return target === current + 1 && screenSatisfied(current);
  }

  function goRelative(delta) {
    // Dentro del test final paginado los botones de la carcasa mueven primero
    // las preguntas; solo en los extremos cambian de diapositiva (así no hay
    // dos pares de botones Anterior/Siguiente compitiendo).
    if (finalNav && (delta > 0 ? finalNav.next() : finalNav.prev())) return;
    // Al salir del test hacia delante con fallos e intentos restantes, avisa
    // antes (modal); «Continuar» reintenta el avance ya sin interceptar.
    if (delta > 0 && finalLeave && finalLeave(function () { finalLeave = null; goRelative(delta); })) return;
    var t = current + delta;
    // Anterior/Siguiente nunca llevan `disabled` (se quedarían sin foco al
    // llegar a un extremo, ver refreshNavState): en los extremos se explica.
    if (t < 0) { A11Y.announce('Ya estás en la primera pantalla.'); return; }
    if (t >= SCREENS.length) { A11Y.announce('Esta es la última pantalla.'); return; }
    if (delta > 0 && !AUTHOR && !screenSatisfied(current)) { A11Y.announce(blockReason(current)); return; }
    if (!canNavigateTo(t)) { A11Y.announce('Pantalla no disponible todavía.'); return; }
    goTo(t, false, true);
  }

  function goTo(idx, isRestore) {
    // Si se navega desde un control de la barra inferior (Anterior/Siguiente,
    // barra de progreso), el foco se queda en él: sobrevive al re-render y el
    // alumno puede seguir pulsando (WCAG 2.4.3). Se mira antes de re-renderizar.
    var act = document.activeElement;
    var keepFocus = !!(act && act.closest && act.closest('.me-toolbar'));
    saveTime();
    if (activeController) activeController = null;
    // Corta cualquier audio de ítem (accordion/tabs/…) que siguiera sonando de
    // la pantalla anterior: el DOM de la interacción se destruye al re-renderizar,
    // pero el audio seguiría reproduciéndose de fondo si no se para explícito.
    if (global.Interactions && global.Interactions.stopItemAudio) global.Interactions.stopItemAudio();
    var navDir = idx >= current ? 'fwd' : 'back'; // dirección de la transición (nivel «Llamativas»)
    current = idx;
    screenEnter = Date.now();
    var entry = SCREENS[idx];
    // En la previsualización avisa al editor de la pantalla actual, para que al
    // volver a la pestaña «Editar» se sitúe en la misma diapositiva (test final
    // excluido). Depende de estar en la Vista estudiante (__AUTHOR_MODE__), no
    // del conmutador de modo autor: sigue sincronizando aunque se desactive.
    if (global.__AUTHOR_MODE__ && entry.screen && !entry.isFinalTest && !entry.isResults && global.parent && global.parent !== global) {
      try { global.parent.postMessage({ type: 'me-screen-change', screenId: entry.screen.id }, '*'); } catch (e) {}
    }
    var content = document.getElementById('me-content');
    content.setAttribute('data-dir', navDir);

    finalNav = null; finalLeave = null; // renderFinalTest los repone si toca
    if (entry.isResults) {
      renderResults(content);
    } else if (entry.isFinalTest) {
      renderFinalTest(content, entry.screen);
    } else {
      var sc = entry.screen;
      // Intentos ya consumidos (sesión anterior o visita previa): no se
      // vuelven a registrar en cmi.interactions al restaurar la pantalla.
      if (sc.interaction) {
        var savedSt = STATE.interactions[sc.interaction.id];
        var savedAtt = savedSt && typeof savedSt.attempts === 'number' ? savedSt.attempts : 0;
        if (savedAtt > (IX.lastAttempts[sc.interaction.id] || 0)) IX.lastAttempts[sc.interaction.id] = savedAtt;
      }
      var ctx = {
        state: (STATE.interactions[sc.interaction ? sc.interaction.id : ''] || null),
        save: function (st) {
          if (!sc.interaction) return;
          var prevResult = STATE.results[sc.interaction.id];
          STATE.interactions[sc.interaction.id] = st;
          var r = activeController ? activeController.result() : null;
          if (r) STATE.results[sc.interaction.id] = r;
          ixAfterSave(sc, st, prevResult, r);
          recomputeAndPersist();
          refreshNavState();
          refreshMenuChecks(); // ✓ y bloqueos del índice al completar la actividad
        },
        announce: A11Y.announce,
        // Coordinación con la narración de pantalla: los ítems que se narran al
        // revelarse (accordion/tabs/flip_cards/timeline/image_cards/flashcards)
        // paran el audio de pantalla si sonaba, y respetan el mismo toggle 🔊/🔇.
        audioEnabled: function () { return audioEnabled; },
        audioRate: function () { return audioRate; },
        audioVolume: function () { return audioVolume; },
        pauseScreenNarration: function () { var a = currentNarration(); if (a) a.pause(); },
        // La etiqueta «Evaluable» solo tiene sentido si las actividades cuentan
        // para la nota; con score_source 'final_test' puntúa solo el test final.
        showScoredBadge: (COURSE.scorm.rules || {}).score_source !== 'final_test',
        // Nivel de una portada (`type: 'cover'`, único): lo decide el
        // contenedor de ESTA pantalla, no un campo del esquema — ver el
        // template `cover` en renderer.js.
        coverLevel: !entry.module ? 'course' : !entry.unit ? 'module' : 'unit',
        // Ubicación de la pantalla en el curso (miga «Módulo › Unidad» de la tarjeta).
        crumb: {
          module: entry.module ? (entry.module.title || '') : '',
          unit: entry.unit ? (entry.unit.title || '') : '',
        },
        // Pantalla «Instrucciones de uso» (`type: 'guide'`): qué controles
        // tiene ESTE paquete, para que la guía solo explique lo que existe.
        guide: sc.type === 'guide' ? guideInfo() : null,
      };
      var rendered = Renderer.render(content, sc, ctx);
      activeController = rendered.interaction;
      if (sc.type === 'guide') wireFolds(content); // desplegables del resumen de controles
      applyReveal(sc.id, content);
      // Captura el estado inicial. Las de exploración (accordion, tabs,
      // flip_cards, timeline, flashcards) devuelven completed solo cuando se ha
      // visto TODO su contenido; video SIN preguntas, case_practice y html_embed
      // se consideran completadas al renderizarse — salvo html_embed con
      // `require_completion`, que no completa hasta que el propio interactivo
      // llama a MeEmbed.complete() (contrato «MeEmbed v1», ver interactions.js).
      // Las evaluables (y video con preguntas) devuelven completed:false hasta
      // que el usuario las resuelve. No se sobrescribe un resultado ya guardado
      // (reanudación de sesión).
      if (activeController && sc.interaction && !STATE.results[sc.interaction.id]) {
        STATE.results[sc.interaction.id] = activeController.result();
      }
    }

    markVisited(idx);
    playCurrentNarration();
    refreshAudioPlayer();
    refreshTranscriptButton();
    updateProgress();
    refreshMenuChecks();
    refreshNavState();
    document.getElementById('me-position').textContent = (idx + 1) + ' / ' + SCREENS.length;
    // Título de la pestaña: «pantalla — curso» (WCAG 2.4.2).
    var courseTitle = (COURSE.course && COURSE.course.title) || 'Curso SCORM';
    var screenLabel = menuScreenLabel(entry.screen);
    document.title = screenLabel ? screenLabel + ' — ' + courseTitle : courseTitle;
    // Cambio de pantalla (WCAG 4.1.3/2.4.3): si el foco estaba en la barra
    // inferior se queda allí y se anuncia «Pantalla N de M: título»; si no, va
    // al <h1> de la pantalla (que el lector ya lee al enfocarlo, por eso solo se
    // anuncia la posición). En restauración no se roba el foco ni se anuncia.
    if (!isRestore) {
      var where = 'Pantalla ' + (idx + 1) + ' de ' + SCREENS.length;
      if (keepFocus && act.isConnected !== false) A11Y.announce(where + (screenLabel ? ': ' + screenLabel : ''));
      else { A11Y.focusMain(); A11Y.announce(where); }
    }
    recomputeAndPersist();
    startMinTimer();
  }

  // Tiempo mínimo de la pantalla: cuenta atrás visible junto a Siguiente
  // («Podrás continuar en 0:20», #me-next-wait) que se refresca cada segundo SIN
  // región viva (no se anuncia cada segundo); al vencer se anuncia una sola vez
  // «Ya puedes continuar» si no queda nada más pendiente (WCAG 3.3.x / 2.2.1).
  var minTimer = null;
  function startMinTimer() {
    if (minTimer) { clearInterval(minTimer); minTimer = null; }
    refreshNavState();
    if (!SCREENS[current] || waitRemaining() <= 0) return; // curso sin pantallas o sin espera
    minTimer = setInterval(function () {
      if (waitRemaining() > 0) { refreshWait(); return; }
      clearInterval(minTimer); minTimer = null;
      refreshNavState();
      refreshMenuChecks();
      if (!AUTHOR && screenSatisfied(current)) A11Y.announce('Ya puedes continuar.');
    }, 1000);
  }
  // Segundos que faltan del tiempo mínimo de la pantalla actual (0 si no aplica:
  // modo autor, pantalla no obligatoria o test final).
  function waitRemaining() {
    var e = SCREENS[current];
    if (!e || e.isFinalTest || AUTHOR || !isRequired(current)) return 0;
    var min = e.screen.min_time_seconds || 0;
    return Math.max(0, Math.ceil(min - (Date.now() - screenEnter) / 1000));
  }
  function refreshWait() {
    var el = document.getElementById('me-next-wait');
    var next = document.getElementById('me-next');
    if (!el || !next) return;
    var left = waitRemaining();
    if (left > 0) {
      el.textContent = 'Podrás continuar en ' + formatTime(left);
      el.hidden = false;
      next.setAttribute('aria-describedby', 'me-next-wait');
    } else {
      el.hidden = true;
      el.textContent = '';
      next.removeAttribute('aria-describedby');
    }
  }

  // ---- Reglas de "pantalla satisfecha" -----------------------------------
  function isRequired(idx) {
    var e = SCREENS[idx];
    return e.isFinalTest ? true : !!e.screen.required;
  }
  function minTimeOk(idx) {
    var e = SCREENS[idx];
    if (e.isFinalTest) return true;
    var min = e.screen.min_time_seconds || 0;
    if (min <= 0) return true;
    if (idx !== current) return true; // ya pasada
    return (Date.now() - screenEnter) / 1000 >= min;
  }
  function interactionOk(idx) {
    var e = SCREENS[idx];
    if (e.isFinalTest) return !!STATE.results.__final__;
    var sc = e.screen;
    if (!sc.interaction) return true;
    if (!(COURSE.scorm.rules || {}).require_interactions) return true;
    var r = STATE.results[sc.interaction.id];
    return !!(r && r.completed);
  }
  function screenSatisfied(idx) {
    if (!isRequired(idx)) return true;
    return minTimeOk(idx) && interactionOk(idx);
  }
  function blockReason(idx) {
    if (!minTimeOk(idx)) {
      var left = idx === current ? waitRemaining() : 0;
      return 'Permanece un poco más en esta pantalla antes de continuar.' +
        (left > 0 ? ' Podrás continuar en ' + formatTime(left) + '.' : '');
    }
    // Solo se llega aquí con la pantalla sin satisfacer: en el test final eso
    // significa que aún no se ha comprobado.
    if (SCREENS[idx].isFinalTest) return 'Comprueba el test para continuar.';
    if (!interactionOk(idx)) return 'Completa la actividad de esta pantalla para continuar.';
    return 'Pantalla no disponible.';
  }

  function markVisited(idx) {
    var e = SCREENS[idx];
    STATE.visited[e.screen.id] = true;
  }

  // ---- Progreso y finalización -------------------------------------------
  function requiredScreens() {
    return SCREENS.filter(function (_, i) { return isRequired(i) && SCREENS[i].screen.scorm && SCREENS[i].screen.scorm.counts_for_completion !== false; });
  }
  function updateProgress() {
    var total = SCREENS.length;
    var visited = SCREENS.filter(function (e) { return STATE.visited[e.screen.id]; }).length;
    var donePct = total ? Math.round((visited / total) * 100) : 0;   // completado (tono tenue)
    var posPct = total ? Math.round(((current + 1) / total) * 100) : 0; // posición actual (tono sólido)
    var bar = document.getElementById('me-progress-bar');
    bar.style.width = posPct + '%';
    document.getElementById('me-progress-done').style.width = donePct + '%';
    var pe = bar.parentElement;
    pe.setAttribute('aria-valuemax', String(Math.max(1, total)));
    pe.setAttribute('aria-valuenow', String(current + 1));
    pe.setAttribute('aria-valuetext', 'Pantalla ' + (current + 1) + ' de ' + total + ' (' + donePct + '% visitado)');
  }

  // ---- Barra de progreso arrastrable ---------------------------------------
  // Además de Anterior/Siguiente, se puede cambiar de pantalla pulsando o
  // deslizando por la barra (y con ←/→/Inicio/Fin si tiene el foco). Respeta
  // EXACTAMENTE las mismas reglas que los botones: hacia atrás siempre; hacia
  // delante solo hasta donde dejaría avanzar «Siguiente» (pantalla actual
  // satisfecha + canNavigateTo). Arrastrando solo se previsualiza (barra +
  // globo con el título); la pantalla cambia al soltar, para no re-renderizar
  // en cada píxel. Fuera del tope alcanzable el control se queda en el tope.
  function canAdvanceTo(t) {
    if (t <= current) return true;
    if (AUTHOR) return true;
    return screenSatisfied(current) && canNavigateTo(t);
  }
  function maxReachable() {
    var t = current;
    while (t + 1 < SCREENS.length && canAdvanceTo(t + 1)) t++;
    return t;
  }
  function scrubTo(t) {
    if (t === current) return;
    if (t > current) {
      // Test final con intentos pendientes: mismo aviso que «Siguiente».
      if (finalLeave && finalLeave(function () { finalLeave = null; scrubTo(t); })) return;
    }
    goTo(t, false, true);
  }
  function setupProgressScrub() {
    var el = document.querySelector('.me-progress');
    if (!el || !global.PointerEvent) return;
    var tip = document.createElement('div');
    tip.className = 'me-progress-tip';
    tip.hidden = true;
    tip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tip);
    var dragging = false, preview = -1, wanted = -1;

    function indexAt(clientX) {
      var r = el.getBoundingClientRect();
      var frac = r.width ? (clientX - r.left) / r.width : 0;
      return Math.max(0, Math.min(SCREENS.length - 1, Math.floor(frac * SCREENS.length)));
    }
    function show(clientX) {
      wanted = indexAt(clientX);
      preview = Math.min(wanted, maxReachable());
      var r = el.getBoundingClientRect();
      var pct = ((preview + 1) / SCREENS.length) * 100;
      document.getElementById('me-progress-bar').style.width = pct + '%';
      var label = (preview + 1) + ' / ' + SCREENS.length + ' — ' + menuScreenLabel(SCREENS[preview].screen);
      if (wanted > preview) label += ' · completa esta pantalla para avanzar';
      tip.textContent = label;
      tip.hidden = false;
      tip.style.left = Math.max(8, Math.min(global.innerWidth - 8, r.left + (r.width * pct) / 100)) + 'px';
      tip.style.bottom = (global.innerHeight - r.top + 8) + 'px';
    }
    function end(commit) {
      if (!dragging) return;
      dragging = false;
      tip.hidden = true;
      el.classList.remove('is-scrubbing');
      var t = preview, blocked = commit && wanted > t && t === current;
      if (commit && t >= 0 && t !== current) scrubTo(t);
      else updateProgress();
      if (blocked) A11Y.announce(blockReason(current));
      preview = wanted = -1;
    }
    el.addEventListener('pointerdown', function (e) {
      if (e.button != null && e.button !== 0) return;
      dragging = true;
      el.classList.add('is-scrubbing');
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      show(e.clientX);
      e.preventDefault();
    });
    el.addEventListener('pointermove', function (e) { if (dragging) show(e.clientX); });
    el.addEventListener('pointerup', function () { end(true); });
    el.addEventListener('pointercancel', function () { end(false); });
    el.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') { e.preventDefault(); goRelative(-1); }
      else if (k === 'ArrowRight' || k === 'ArrowUp') { e.preventDefault(); goRelative(1); }
      else if (k === 'Home') { e.preventDefault(); scrubTo(0); }
      else if (k === 'End') { e.preventDefault(); scrubTo(maxReachable()); }
    });
  }

  // Snapshot del estado del curso para el desglose de calificaciones de la
  // pantalla de resultados (renderResults). Los pesos son los del curso COMPLETO
  // (puntos de todas las evaluables, no solo las ya visitadas): así el alumno ve
  // cuánto valdrá cada actividad al terminar.
  function progressSnapshot() {
    var rules = COURSE.scorm.rules || {};
    var src = rules.score_source || 'final_test';
    var w = Math.min(100, Math.max(0, rules.mixed_final_weight == null ? 70 : rules.mixed_final_weight));
    var practiceWeight = src === 'final_test' ? 0 : (src === 'unit_tests' ? 100 : 100 - w);
    var finalWeight = src === 'final_test' ? 100 : (src === 'unit_tests' ? 0 : w);

    var totalPts = 0;
    SCREENS.forEach(function (e) {
      if (e.isFinalTest || e.isResults || !e.screen.interaction) return;
      if (e.screen.interaction.scored) totalPts += (e.screen.interaction.points || 1);
    });

    var items = [];
    SCREENS.forEach(function (e, i) {
      if (e.isFinalTest || e.isResults || !e.screen.interaction) return;
      var it = e.screen.interaction;
      var r = STATE.results[it.id];
      var state;
      if (!r || !r.completed) state = 'pending';
      else if (!it.scored || !r.scored) state = 'done';
      else if (r.correct) state = 'correct';
      else state = (r.score || 0) > 0 ? 'partial' : 'incorrect';
      items.push({
        idx: i,
        title: e.screen.title || 'Actividad',
        unit: e.unit ? (e.unit.title || '') : '',
        scored: !!it.scored,
        required: isRequired(i),
        state: state,
        score: r ? (r.score || 0) : 0,
        maxScore: it.scored ? (it.points || 1) : 0,
        weightPct: (it.scored && totalPts > 0 && practiceWeight > 0)
          ? Math.round(((it.points || 1) / totalPts) * practiceWeight) : 0,
      });
    });

    var ft = COURSE.assessments && COURSE.assessments.final_test;
    var finalRow = null;
    if (ft && (ft.questions || []).length && finalWeight > 0) {
      var fr = STATE.results.__final__;
      finalRow = {
        idx: SCREENS.findIndex(function (e) { return e.isFinalTest; }),
        title: ft.title || 'Test final',
        done: !!fr,
        score: fr ? (fr.score || 0) : 0,
        maxScore: fr ? (fr.maxScore || 0) : (ft.questions || []).length,
        weightPct: finalWeight,
      };
    }

    var req = requiredScreens();
    var seenReq = req.filter(function (e) { return STATE.visited[e.screen.id]; }).length;
    return {
      score: computeScore(),
      minScore: rules.min_score || 0,
      source: src,
      items: items,
      finalRow: finalRow,
      seenReq: seenReq,
      totalReq: req.length,
    };
  }

  function computeScore() {
    var rules = COURSE.scorm.rules || {};
    var src = rules.score_source || 'final_test';
    var got = 0, max = 0;
    function addResult(r) { if (r && r.scored) { got += r.score || 0; max += r.maxScore || 0; } }
    if (src === 'final_test') {
      var fr = STATE.results.__final__;
      if (fr) { got = fr.score; max = fr.maxScore; }
    } else if (src === 'unit_tests') {
      SCREENS.forEach(function (e) { if (!e.isFinalTest && e.screen.interaction) addResult(STATE.results[e.screen.interaction.id]); });
    } else { // mixed: media PONDERADA entre práctica y test final (no por puntos).
      // Cada bloque se normaliza a su propio % y se combinan con `mixed_final_weight`.
      var pg = 0, pm = 0;
      SCREENS.forEach(function (e) {
        if (e.isFinalTest || !e.screen.interaction) return;
        var r = STATE.results[e.screen.interaction.id];
        if (r && r.scored) { pg += r.score || 0; pm += r.maxScore || 0; }
      });
      var f = STATE.results.__final__;
      var practicePct = pm > 0 ? (pg / pm) * 100 : null;
      var finalPct = (f && f.maxScore > 0) ? (f.score / f.maxScore) * 100 : null;
      var w = Math.min(100, Math.max(0, rules.mixed_final_weight == null ? 70 : rules.mixed_final_weight)) / 100;
      if (practicePct != null && finalPct != null) return Math.round(finalPct * w + practicePct * (1 - w));
      if (finalPct != null) return Math.round(finalPct);
      if (practicePct != null) return Math.round(practicePct);
      return 0;
    }
    return max > 0 ? Math.round((got / max) * 100) : 0;
  }

  function evaluateCompletion() {
    var rules = COURSE.scorm.rules || {};
    var req = requiredScreens();
    var seenReq = req.filter(function (e) { return STATE.visited[e.screen.id]; }).length;
    var pctSeen = req.length ? (seenReq / req.length) * 100 : 100;
    var screensOk = pctSeen >= (rules.min_required_screens_pct || 100);

    // La nota se calcula y persiste SIEMPRE (Resultados/LMS la necesitan para
    // mostrar el APTO/NO APTO informativo, sea cual sea el modo de finalización).
    var score = computeScore();
    STATE.finalScore = score;
    // Un paquete sin nada evaluable (una bienvenida, un vídeo de presentación…)
    // no envía nota: si no, el LMS mostraría un 0 en el libro de calificaciones.
    var gradable = !!(COURSE.assessments && COURSE.assessments.final_test && (COURSE.assessments.final_test.questions || []).length) ||
      SCREENS.some(function (e) { return e.screen.interaction && e.screen.interaction.scored; });
    if (gradable) SCORM.setScore(score, 0, 100);

    // Modo «screens»: completa con solo llegar al final. Ignora a propósito
    // interacciones obligatorias y nota mínima para el lesson_status — pero
    // ambas se siguen calificando (arriba y en el desglose de Resultados).
    if ((rules.completion_mode || 'evaluation') === 'screens') {
      var screensStatus = screensOk ? 'completed' : 'incomplete';
      SCORM.setStatus(screensStatus);
      return screensStatus;
    }

    var interactionsOk = true;
    if (rules.require_interactions) {
      SCREENS.forEach(function (e, i) {
        if (!e.isFinalTest && isRequired(i) && e.screen.interaction) {
          var r = STATE.results[e.screen.interaction.id];
          if (!(r && r.completed)) interactionsOk = false;
        }
      });
    }

    var hasScoredContent = (function () {
      if ((rules.score_source) === 'final_test') return !!(COURSE.assessments && COURSE.assessments.final_test && COURSE.assessments.final_test.questions.length);
      return SCREENS.some(function (e) { return e.screen.interaction && e.screen.interaction.scored; });
    })();
    var scoreOk = !hasScoredContent || score >= (rules.min_score || 0);

    var status;
    if (!screensOk || !interactionsOk) status = 'incomplete';
    else if (hasScoredContent) status = scoreOk ? 'passed' : 'failed';
    else status = 'completed';
    SCORM.setStatus(status);
    return status;
  }

  function recomputeAndPersist() {
    evaluateCompletion();
    persist();
  }

  // ---- Chrome / paneles --------------------------------------------------
  function toggleMenu() {
    document.getElementById('me-app').classList.toggle('me-menu-hidden');
    reflectMenuUI();
  }
  // Sincroniza los dos controles de plegado del índice (botón ☰ de la barra
  // superior y pestaña lateral): aria-expanded y sentido de la flecha.
  function reflectMenuUI() {
    var visible = menuVisible();
    // Plegado (escritorio) o slide-over cerrado (móvil) el menú solo se aparta
    // con transform: inert lo saca del orden de Tab y del árbol accesible
    // (WCAG 2.4.3/1.3.2). styles.css añade visibility:hidden diferida como
    // respaldo para navegadores sin inert.
    document.getElementById('me-menu').inert = !visible;
    document.getElementById('me-toggle-menu').setAttribute('aria-expanded', String(visible));
    var tab = document.getElementById('me-menu-tab');
    tab.setAttribute('aria-expanded', String(visible));
    tab.querySelector('.me-menu-tab-arrow').innerHTML = global.MEIcons.svg(visible ? 'chevron-left' : 'chevron-right');
  }
  // ---- Pantalla completa ---------------------------------------------------
  // Botón de la cabecera que pone el curso a pantalla completa (Fullscreen API,
  // con fallback webkit para navegadores/LMS antiguos). Si el entorno no lo
  // permite (p. ej. un iframe de LMS sin allowfullscreen, o iPhone), el botón
  // permanece oculto: nunca se muestra un control muerto.
  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  // A− / A+ de la topbar: sube/baja un paso de TEXT_SCALES, desactiva el botón
  // en el extremo y persiste la elección (try/catch: localStorage puede fallar).
  function setupTextSize() {
    var smaller = document.getElementById('me-btn-text-smaller');
    var larger = document.getElementById('me-btn-text-larger');
    function apply(idx) {
      textScaleIdx = Math.max(0, Math.min(TEXT_SCALES.length - 1, idx));
      document.documentElement.style.setProperty('--me-text-scale', String(TEXT_SCALES[textScaleIdx]));
      smaller.disabled = textScaleIdx === 0;
      larger.disabled = textScaleIdx === TEXT_SCALES.length - 1;
      try { if (global.localStorage) localStorage.setItem('me-text-scale', String(TEXT_SCALES[textScaleIdx])); } catch (e) {}
    }
    smaller.addEventListener('click', function () { apply(textScaleIdx - 1); });
    larger.addEventListener('click', function () { apply(textScaleIdx + 1); });
    apply(textScaleIdx);
  }

  function setupFullscreen() {
    var btn = document.getElementById('me-btn-fullscreen');
    var root = document.documentElement;
    var supported = (document.fullscreenEnabled || document.webkitFullscreenEnabled) &&
      (root.requestFullscreen || root.webkitRequestFullscreen);
    if (!supported) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      if (fullscreenElement()) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        var p = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        if (p && p.catch) p.catch(function () {});
      }
    });
    // El estado puede cambiar también por Esc o por el propio navegador: el
    // icono/etiqueta se sincronizan en el evento, no en el clic.
    document.addEventListener('fullscreenchange', reflectFullscreenButton);
    document.addEventListener('webkitfullscreenchange', reflectFullscreenButton);
  }
  function reflectFullscreenButton() {
    var btn = document.getElementById('me-btn-fullscreen');
    var on = !!fullscreenElement();
    btn.querySelector('[data-icon]').innerHTML = global.MEIcons.svg(on ? 'minimize' : 'maximize');
    var label = on ? 'Salir de pantalla completa' : 'Pantalla completa';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  // Transcripción oculta por el autor (`screen.transcript_hidden`): el botón se
  // desactiva en esa pantalla (como A−/A+ en su extremo) en vez de esconderse,
  // para que la barra no cambie de forma al navegar.
  function refreshTranscriptButton() {
    var btn = document.getElementById('me-btn-transcript');
    var entry = SCREENS[current];
    var off = !!(entry && entry.screen && !entry.isFinalTest && entry.screen.transcript_hidden);
    btn.disabled = off;
    var label = off ? 'Transcripción no disponible en esta pantalla' : 'Transcripción (Alt+T)';
    btn.title = label;
    btn.setAttribute('aria-label', off ? label : 'Transcripción');
  }

  function toggleTranscript() {
    var entry = SCREENS[current];
    var t = entry && !entry.isFinalTest && !entry.screen.transcript_hidden ? entry.screen.transcript : '';
    if (!t) { A11Y.announce('Esta pantalla no tiene transcripción.'); return; }
    openModalHtml('Transcripción', '<div class="me-prose">' + Renderer.mdToHtml(t) + '</div>');
  }

  // ---- Locución de la diapositiva ----------------------------------------
  // Elemento <audio> oculto que el renderer inyecta en la pantalla actual.
  function currentNarration() {
    return document.querySelector('#me-content .me-narration-audio');
  }
  // Reproduce la locución de la pantalla actual desde el principio (si está
  // activada). El navegador puede bloquear el autoplay hasta que haya una
  // interacción del usuario: en ese caso se ignora el rechazo silenciosamente.
  function playCurrentNarration() {
    var a = currentNarration();
    if (!a) return;
    if (!audioEnabled) { a.pause(); return; }
    // Solo suena una narración a la vez: si un ítem (accordion/tabs/…) estaba
    // sonando, se calla antes de arrancar la de pantalla.
    if (global.Interactions && global.Interactions.stopItemAudio) global.Interactions.stopItemAudio();
    try { a.currentTime = 0; a.playbackRate = audioRate; a.volume = audioVolume; } catch (e) {}
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }
  // Cambia la velocidad de reproducción (1/1.25/1.5/2×): se aplica al vuelo a
  // la narración que esté sonando (de pantalla o de ítem) y se recuerda para
  // las siguientes.
  function setAudioRate(rate) {
    if (rate !== 1 && rate !== 1.25 && rate !== 1.5 && rate !== 2) return;
    audioRate = rate;
    try { if (global.localStorage) localStorage.setItem('me-audio-rate', String(rate)); } catch (e) {}
    var a = currentNarration();
    if (a) { try { a.playbackRate = rate; } catch (e) {} }
    if (global.Interactions && global.Interactions.setItemAudioRate) global.Interactions.setItemAudioRate(rate);
  }
  // Cambia el volumen (0..1): igual patrón que setAudioRate, se aplica al
  // vuelo y se recuerda para las siguientes pantallas/sesiones.
  function setAudioVolume(vol) {
    if (!(vol >= 0 && vol <= 1)) return;
    audioVolume = vol;
    try { if (global.localStorage) localStorage.setItem('me-audio-volume', String(vol)); } catch (e) {}
    var a = currentNarration();
    if (a) { try { a.volume = vol; } catch (e) {} }
    if (global.Interactions && global.Interactions.setItemAudioVolume) global.Interactions.setItemAudioVolume(vol);
  }
  function reflectAudioButton() {
    var btn = document.getElementById('me-btn-audio');
    if (!btn) return;
    // Rótulo fijo («Sonido de la narración», index.html) + aria-pressed = sonido
    // activado: el lector dice «pulsado» cuando suena, no al revés.
    btn.setAttribute('aria-pressed', String(audioEnabled));
    btn.classList.toggle('is-on', audioEnabled);
    btn.querySelector('[data-icon]').innerHTML = global.MEIcons.svg(audioEnabled ? 'volume-on' : 'volume-off');
  }
  function setAudioEnabled(on) {
    audioEnabled = on;
    try { if (global.localStorage) localStorage.setItem('me-audio-enabled', on ? '1' : '0'); } catch (e) {}
    reflectAudioButton();
  }
  function toggleAudio() {
    setAudioEnabled(!audioEnabled);
    if (audioEnabled) { playCurrentNarration(); A11Y.announce('Audio activado.'); }
    else {
      var a = currentNarration(); if (a) a.pause();
      if (global.Interactions && global.Interactions.stopItemAudio) global.Interactions.stopItemAudio();
      A11Y.announce('Audio desactivado.');
    }
  }

  // ---- Reproductor de la narración (barra inferior) ----------------------
  // Bloque completo (play/pause, seek, volumen, velocidad): oculto si la
  // pantalla actual no tiene audio_src. El icono 🔊/🔇 y el volumen son el
  // mismo estado global de siempre (audioEnabled/audioVolume); el play/pause
  // es transporte nuevo sobre el <audio> real.
  //
  // `.paused` NO sirve de fuente de verdad: el navegador lo pone a false en
  // cuanto se llama a .play(), aunque el recurso no llegue a sonar nunca (ruta
  // sin archivo subido, ver tts-narracion.md, o archivo roto) — con eso el
  // icono se quedaría en «pausa» para siempre sin sonar nada. Solo el evento
  // 'playing' confirma que de verdad hay audio fluyendo; narrationPlaying lo
  // recuerda hasta el siguiente pause/ended/error.
  var narrationPlaying = false;
  function refreshAudioPlayer() {
    var player = document.getElementById('me-audio-player');
    if (!player) return;
    var entry = SCREENS[current];
    var hasAudio = !!(entry && !entry.isFinalTest && !entry.isResults && entry.screen.audio_src);
    player.hidden = !hasAudio;
    if (!hasAudio) return;
    var a = currentNarration();
    if (!a) return;
    narrationPlaying = false;
    try { a.volume = audioVolume; } catch (e) {}
    a.addEventListener('timeupdate', updateSeekUI);
    a.addEventListener('loadedmetadata', updateSeekUI);
    a.addEventListener('playing', function () { narrationPlaying = true; reflectPlayPause(); });
    a.addEventListener('pause', function () { narrationPlaying = false; reflectPlayPause(); });
    a.addEventListener('ended', function () { narrationPlaying = false; reflectPlayPause(); });
    a.addEventListener('error', function () { narrationPlaying = false; reflectPlayPause(); });
    updateSeekUI();
    reflectPlayPause();
  }
  function togglePlayPause() {
    var a = currentNarration();
    if (!a) return;
    if (!narrationPlaying) {
      if (!audioEnabled) setAudioEnabled(true);
      if (global.Interactions && global.Interactions.stopItemAudio) global.Interactions.stopItemAudio();
      var p = a.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      a.pause();
    }
  }
  function reflectPlayPause() {
    var btn = document.getElementById('me-btn-playpause');
    if (!btn) return;
    btn.querySelector('[data-icon]').innerHTML = global.MEIcons.svg(narrationPlaying ? 'pause' : 'play');
    var label = narrationPlaying ? 'Pausar narración' : 'Reproducir narración';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
  function updateSeekUI() {
    var a = currentNarration();
    var seekEl = document.getElementById('me-audio-seek');
    var timeEl = document.getElementById('me-audio-time');
    if (!a || !seekEl) return;
    var dur = isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
    if (!seekDragging) seekEl.value = dur ? String(Math.round((a.currentTime / dur) * 1000)) : '0';
    if (timeEl) timeEl.textContent = formatTime(a.currentTime) + ' / ' + formatTime(dur);
    // El lector dice «1:23 de 4:10» en vez del valor bruto 0–1000 del range.
    seekEl.setAttribute('aria-valuetext', formatTime(a.currentTime) + ' de ' + formatTime(dur));
  }
  function formatTime(s) {
    s = Math.max(0, Math.round(s || 0));
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
  function openModal(which) {
    if (which === 'glossary') {
      var g = (COURSE.glossary || []).map(function (t) { return '<dt>' + esc(t.term) + '</dt><dd>' + esc(t.definition) + '</dd>'; }).join('');
      openModalHtml(glossaryTitle(), g ? '<dl class="me-glossary">' + g + '</dl>' : '<p>Glosario vacío.</p>');
    } else if (which === 'resources') {
      var b = (COURSE.bibliography || []).map(function (e) {
        return '<li>' + esc(e.ref) + (e.url ? ' — <a href="' + esc(e.url) + '" target="_blank" rel="noopener">enlace</a>' : '') + '</li>';
      }).join('');
      openModalHtml(bibliographyTitle(), b ? '<ul>' + b + '</ul>' : '<p>Sin recursos.</p>');
    } else if (which === 'documents') {
      // Documentos PDF adjuntos: solo rutas assets/…pdf (el editor y los
      // validadores ya lo garantizan; aquí se filtra por si el JSON se editó a
      // mano). La ruta se resuelve con Interactions.asset: blob URL en la Vista
      // estudiante, ruta relativa dentro del paquete SCORM.
      var d = (COURSE.attachments || []).filter(function (a) { return /^assets\/[^"'<>]+\.pdf$/i.test(a.src || ''); }).map(function (a) {
        var href = esc(global.Interactions.asset(a.src));
        var name = esc((a.src.split('/').pop()) || 'documento.pdf');
        var meta = 'PDF' + (a.size ? ' · ' + fmtBytes(a.size) : '');
        return '<li class="me-doc"><span class="me-doc-ico" data-icon="file-text" aria-hidden="true"></span><div class="me-doc-body">' +
          '<a class="me-doc-title" href="' + href + '" target="_blank" rel="noopener">' + esc(a.title || a.src.split('/').pop()) + '</a>' +
          (a.description ? '<p class="me-doc-desc">' + esc(a.description) + '</p>' : '') +
          '<p class="me-doc-meta">' + meta + ' · <a href="' + href + '" target="_blank" rel="noopener">Abrir</a> · <a href="' + href + '" download="' + name + '">Descargar</a></p>' +
          '</div></li>';
      }).join('');
      openModalHtml(attachmentsTitle(), d ? '<ul class="me-docs">' + d + '</ul>' : '<p>Sin documentos.</p>');
      global.MEIcons.hydrate(document.getElementById('me-modal'));
    } else if (which === 'help') {
      openModalHtml('Ayuda', '<ul><li><strong>Alt + →</strong> Siguiente</li><li><strong>Alt + ←</strong> Anterior</li><li><strong>Alt + M</strong> Menú</li><li><strong>Alt + T</strong> Transcripción</li></ul><p>Usa Tab para navegar por los controles.</p><p>Con los botones <strong>A−</strong> y <strong>A+</strong> de la barra superior puedes cambiar el tamaño del texto; se recuerda en este dispositivo.</p>');
    }
  }
  // Modal genérico (Transcripción, Glosario, Recursos, Documentos, Ayuda):
  // diálogo accesible vía A11Y.trapFocus — fondo inerte, Tab atrapado, Esc
  // cierra y el foco vuelve al control que lo abrió (WCAG 2.1.2/2.4.3/2.4.11).
  // Si se abre otro con uno ya abierto (p. ej. Alt+T), se reutiliza la trampa
  // y se conserva el control de origen.
  var modalRelease = null;
  function openModalHtml(title, bodyHtml) {
    var modal = document.getElementById('me-modal');
    modal.querySelector('.me-modal-title').textContent = title;
    modal.querySelector('.me-modal-body').innerHTML = bodyHtml;
    modal.hidden = false;
    if (!modalRelease) modalRelease = A11Y.trapFocus(modal, { onEscape: closeModals, fallback: A11Y.focusMain });
    modal.querySelector('.me-modal-close').focus();
  }
  function closeModals() {
    var modal = document.getElementById('me-modal');
    if (modal.hidden) return;
    modal.hidden = true;
    if (modalRelease) { var r = modalRelease; modalRelease = null; r(); }
    else A11Y.focusMain();
  }

  function refreshNavState() {
    var prev = document.getElementById('me-prev');
    var next = document.getElementById('me-next');
    // aria-disabled, NO disabled: el botón sigue siendo enfocable (no pierde el
    // foco al quedar bloqueado justo tras pulsarlo) y al pulsarlo goRelative
    // anuncia el motivo (blockReason). El aspecto atenuado sale de
    // [aria-disabled="true"] en styles.css.
    // Sin pantallas no hay nada que navegar (curso vacío en el editor).
    if (!SCREENS.length) { setNavDisabled(prev, true); setNavDisabled(next, true); refreshWait(); return; }
    // Con el test paginado en pantalla, los botones también mueven preguntas:
    // solo se bloquean cuando ni la pregunta ni la diapositiva pueden avanzar.
    setNavDisabled(prev, current <= 0 && !(finalNav && !finalNav.atFirst()));
    var last = current >= SCREENS.length - 1;
    var blocked = last || (!AUTHOR && !screenSatisfied(current));
    setNavDisabled(next, blocked && !(finalNav && !finalNav.atLast()));
    refreshWait();
    // Solo se toca el texto (no el icono de flecha): un textContent aquí
    // borraría el <span data-icon> del botón en cada navegación.
    var nextLabel = next.querySelector('.me-nav-btn-label');
    if (nextLabel) nextLabel.textContent = last ? 'Fin' : 'Siguiente';
  }
  function setNavDisabled(btn, off) {
    btn.disabled = false; // por si un estado anterior lo dejó con disabled real
    if (off) btn.setAttribute('aria-disabled', 'true');
    else btn.removeAttribute('aria-disabled');
  }
  // El menú lateral está visible cuando #me-app NO lleva la clase me-menu-hidden
  // (cubre tanto el plegado de escritorio como el slide-over cerrado en móvil).
  function menuVisible() {
    return !document.getElementById('me-app').classList.contains('me-menu-hidden');
  }

  // Estado de cada pantalla en el índice (WCAG 1.3.1/4.1.2): aria-current en la
  // actual; «completada» como texto para lectores (el ✓ es aria-hidden); y las
  // que la navegación aún no deja abrir, con aria-disabled + atenuadas
  // (.is-locked) — siguen enfocables y al pulsarlas se explica por qué no.
  function refreshMenuChecks() {
    document.querySelectorAll('.me-menu-link').forEach(function (b) {
      var i = parseInt(b.getAttribute('data-idx'), 10);
      var e = SCREENS[i];
      var done = STATE.visited[e.screen.id] && screenSatisfied(i);
      var locked = i !== current && !canNavigateTo(i);
      b.classList.toggle('is-done', !!done);
      b.classList.toggle('is-current', i === current);
      b.classList.toggle('is-locked', locked);
      if (i === current) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
      if (locked) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      var chk = b.querySelector('.me-menu-check');
      if (chk) chk.textContent = done ? '✓' : '';
      var sr = b.querySelector('.me-menu-sr');
      if (!sr) { sr = document.createElement('span'); sr.className = 'sr-only me-menu-sr'; b.appendChild(sr); }
      sr.textContent = done ? ' (completada)' : '';
    });
    // Contador «hechas/total» y mini-barra de progreso de cada unidad.
    document.querySelectorAll('.me-menu-unit[data-count]').forEach(function (unit) {
      var start = parseInt(unit.getAttribute('data-start'), 10);
      var count = parseInt(unit.getAttribute('data-count'), 10);
      var done = 0;
      for (var i = start; i < start + count; i++) {
        var e = SCREENS[i];
        if (e && STATE.visited[e.screen.id] && screenSatisfied(i)) done++;
      }
      var c = unit.querySelector('.me-menu-count');
      if (c) c.textContent = done + '/' + count;
      var f = unit.querySelector('.me-menu-uprog-fill');
      if (f) f.style.width = (count ? Math.round((done / count) * 100) : 0) + '%';
    });
  }

  // ---- Test final --------------------------------------------------------
  // Puentes entre el test final y la navegación de la carcasa: finalNav mueve
  // las preguntas del test paginado; finalLeave avisa antes de abandonar el
  // test con fallos e intentos restantes. goTo los limpia y renderFinalTest
  // los repone mientras el test esté en pantalla.
  var finalNav = null;
  var finalLeave = null;

  // Modal del test final (informativa o de confirmación). Reutiliza las clases
  // .me-modal/.me-exit-* de la confirmación de salida para heredar sus estilos.
  function testDialog(opts) {
    var overlay = document.createElement('div');
    overlay.className = 'me-modal me-exit-confirm';
    overlay.setAttribute('role', opts.confirm ? 'alertdialog' : 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', opts.label || opts.title);
    var btns = opts.actions.map(function (a, i) {
      return '<button type="button" class="me-btn' + (a.primary ? ' me-primary' : '') + '" data-act="' + i + '">' + a.label + '</button>';
    }).join('');
    overlay.innerHTML = '<div class="me-modal-card me-exit-card">' +
      '<div class="me-modal-head"><h2 class="me-modal-title">' + opts.title + '</h2></div>' +
      '<p class="me-exit-msg">' + opts.body + '</p>' +
      '<div class="me-exit-actions">' + btns + '</div></div>';
    // Diálogo accesible (A11Y.trapFocus): fondo inerte, Tab atrapado, Esc
    // cierra y el foco vuelve a quien lo abrió.
    var release = null;
    function close() {
      overlay.remove();
      if (release) { var r = release; release = null; r(); }
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelectorAll('button[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        close();
        var a = opts.actions[Number(b.getAttribute('data-act'))];
        if (a.onClick) a.onClick();
      });
    });
    document.body.appendChild(overlay);
    release = A11Y.trapFocus(overlay, { onEscape: close, fallback: A11Y.focusMain });
    var first = overlay.querySelector('.me-primary') || overlay.querySelector('button[data-act]');
    if (first) first.focus();
  }

  // «Te quedan N intentos…» / «Puedes repetir el test…» (remaining -1 = sin límite).
  function attemptsMsg(remaining) {
    if (remaining < 0) return 'Puedes repetir el test tantas veces como necesites para mejorar la nota.';
    if (remaining === 0) return 'Has agotado los intentos.';
    return 'Te ' + (remaining === 1 ? 'queda 1 intento' : 'quedan ' + remaining + ' intentos') + ' para mejorar el test.';
  }

  function renderFinalTest(content, screen) {
    var test = COURSE.assessments.final_test;
    var saved = STATE.finalAnswers || {};
    var rules = COURSE.scorm.rules || {};
    var allowed = rules.attempts_allowed || 0;
    var attemptsUsed = STATE.attempts || 0;
    var exhausted = allowed > 0 && attemptsUsed >= allowed;
    var questions = test.questions || [];
    // Modo «una pregunta por pantalla»: todas las preguntas siguen en el DOM
    // (paint() y la restauración no cambian), solo se muestra la actual. Las
    // preguntas se mueven con los botones Anterior/Siguiente de la carcasa
    // (vía finalNav) y con el navegador de cuadritos.
    var paged = !!test.one_question_per_screen && questions.length > 1;
    // Nota mínima única: el APTO/NO APTO usa rules.min_score. Si la nota del
    // curso no sale solo del test (score_source mixto/práctica), el test no
    // dicta veredicto: muestra la puntuación y remite a «Resultados».
    var showVerdict = (rules.score_source || 'final_test') === 'final_test';
    var minScore = rules.min_score || 0;

    // Sin texto fijo: solo las instrucciones configurables del test (vacías por
    // defecto = no se pinta nada) y el contador de intentos si hay límite.
    var html = '<article class="me-screen"><h1>' + esc(screen.title) + '</h1>' +
      (test.instructions ? '<p class="me-instructions">' + rich(test.instructions) + '</p>' : '') +
      (allowed > 0 ? '<p class="me-instructions">Intentos: ' + Math.min(attemptsUsed, allowed) + '/' + allowed + '.</p>' : '') +
      '<form id="me-final">';
    if (paged) {
      // Navegador de preguntas: un cuadrito numerado por pregunta con su estado
      // (sin responder / respondida / acertada / fallada) y salto directo al clic.
      // Rótulo «Preguntas:» + cuadritos; el contador «Pregunta X de N» ya es
      // redundante en pantalla y queda solo como región viva para lectores.
      html += '<div class="me-qnav-row"><span class="me-qnav-label" aria-hidden="true">Preguntas:</span>' +
        '<div class="me-qnav" role="group" aria-label="Preguntas del test">';
      questions.forEach(function (q, qi) {
        html += '<button type="button" class="me-qnav-btn" data-qi="' + qi + '" aria-label="Pregunta ' + (qi + 1) + '">' + (qi + 1) + '</button>';
      });
      html += '</div></div><p class="me-final-prog sr-only" aria-live="polite"></p>';
    }
    questions.forEach(function (q, qi) {
      html += '<fieldset class="me-q" data-qi="' + qi + '"' + (paged && qi > 0 ? ' hidden' : '') + '><legend>' + (qi + 1) + '. ' + rich(q.prompt) + '</legend>';
      // Opciones barajadas (determinista por id de pregunta); V/F conserva su orden.
      var shownOpts = q.type === 'true_false' ? (q.options || []) : global.Interactions.shuffle(q.options || [], q.id);
      shownOpts.forEach(function (o) {
        var checked = saved[q.id] === o.id ? ' checked' : '';
        html += '<label class="me-choice"><input type="radio" name="q-' + esc(q.id) + '" value="' + esc(o.id) + '"' + checked + (exhausted ? ' disabled' : '') + '> <span>' + rich(o.text) + '</span></label>';
      });
      html += '<div class="me-feedback" data-q="' + esc(q.id) + '" role="status" aria-live="polite" hidden></div></fieldset>';
    });
    html += '<div class="me-final-nav">' +
      '<button type="submit" class="me-btn me-primary"' + (exhausted ? ' disabled' : '') + (paged ? ' hidden' : '') + '>Comprobar test</button>' +
      '</div></form>' +
      '<div id="me-final-summary" class="me-final-summary" hidden></div>' +
      '<div id="me-final-result" aria-live="polite"></div></article>';
    content.innerHTML = html;

    var qCurrent = 0;
    var mode = 'questions'; // 'questions' | 'summary' (vista de resultado, solo paginado)
    var verdicts = {}; // q.id → true/false tras corregir; se borra al re-responder
    var dirty = false;  // respuestas cambiadas desde la última comprobación

    // Salta a la primera pregunta fallada (o a la 1ª si no consta ninguna).
    function goFirstWrong() {
      var fw = -1;
      questions.forEach(function (q, qi) { if (fw < 0 && verdicts[q.id] === false) fw = qi; });
      showQ(fw < 0 ? 0 : fw);
    }

    function refreshQnav() {
      if (!paged) return;
      content.querySelectorAll('.me-qnav-btn').forEach(function (b) {
        var qi = Number(b.getAttribute('data-qi'));
        var q = questions[qi];
        var answered = !!content.querySelector('input[name="q-' + q.id + '"]:checked');
        var v = verdicts[q.id];
        b.className = 'me-qnav-btn' +
          (mode === 'questions' && qi === qCurrent ? ' is-current' : '') +
          (v === true ? ' is-ok' : v === false ? ' is-error' : answered ? ' is-answered' : '');
        if (qi === qCurrent) b.setAttribute('aria-current', 'true');
        else b.removeAttribute('aria-current');
      });
    }

    function showQ(i) {
      if (!paged) return;
      mode = 'questions';
      document.getElementById('me-final-summary').hidden = true;
      qCurrent = Math.max(0, Math.min(questions.length - 1, i));
      content.querySelectorAll('fieldset.me-q').forEach(function (fs) {
        fs.hidden = Number(fs.getAttribute('data-qi')) !== qCurrent;
      });
      content.querySelector('.me-final-prog').textContent = 'Pregunta ' + (qCurrent + 1) + ' de ' + questions.length;
      // En paginado el formulario no tiene botón visible: «Comprobar test» vive
      // en la pantalla de resultado, tras la última pregunta (verlo en una
      // pregunta suelta confundía: parecía comprobar solo esa pregunta).
      content.querySelector('#me-final button[type=submit]').hidden = true;
      refreshQnav();
      refreshNavState();
    }

    // Vista de resultado del test (solo paginado): estado, aciertos, intentos
    // restantes y acciones. Se muestra al comprobar y al volver a la pantalla
    // con el test ya comprobado; desde aquí «Siguiente» sale de la pantalla
    // (con el aviso de finalLeave si hay fallos e intentos) y «Anterior» o los
    // cuadritos vuelven a las preguntas para revisarlas o corregirlas.
    function showSummary() {
      if (!paged) return;
      mode = 'summary';
      content.querySelectorAll('fieldset.me-q').forEach(function (fs) { fs.hidden = true; });
      content.querySelector('#me-final button[type=submit]').hidden = true;
      // Por comprobar (primer intento sin corregir, o respuestas cambiadas desde
      // la última comprobación): aquí el mensaje es la acción de comprobar, no
      // un resultado viejo. Este es el ÚNICO sitio con «Comprobar test» en paginado.
      var checked = !!STATE.results.__final__;
      if (dirty || !checked) {
        content.querySelector('.me-final-prog').textContent = 'Fin del test';
        var pending = document.getElementById('me-final-summary');
        pending.innerHTML =
          '<div class="me-result-hero"><strong>' + (checked ? 'Respuestas modificadas' : 'Fin del test') + '</strong>' +
          '<p>' + (checked
            ? 'Has cambiado respuestas desde la última comprobación. Comprueba el test para ver tu nuevo resultado.'
            : 'Has llegado al final. Comprueba tus respuestas para ver tu resultado.') + '</p></div>' +
          '<div class="me-final-nav">' +
          '<button type="button" class="me-btn me-primary" id="me-final-check">Comprobar test</button>' +
          '<button type="button" class="me-btn" id="me-final-review">Revisar las respuestas</button></div>';
        pending.hidden = false;
        document.getElementById('me-final-check').addEventListener('click', comprobar);
        document.getElementById('me-final-review').addEventListener('click', function () { showQ(0); });
        refreshQnav();
        refreshNavState();
        A11Y.announce('Comprueba el test para ver tu resultado.');
        return;
      }
      content.querySelector('.me-final-prog').textContent = 'Resultado del test';
      var r = STATE.results.__final__;
      var pct = r && r.maxScore ? Math.round((r.score / r.maxScore) * 100) : 0;
      var pass = pct >= minScore;
      var aciertos = questions.filter(function (q) { return verdicts[q.id] === true; }).length;
      var remaining = allowed > 0 ? Math.max(0, allowed - (STATE.attempts || 0)) : -1;
      var mejorable = pct < 100 && remaining !== 0;
      var box = document.getElementById('me-final-summary');
      box.innerHTML =
        '<div class="me-result-hero ' + (showVerdict ? (pass ? 'is-ok' : 'is-error') : '') + '">' +
        '<strong>' + (showVerdict
          ? 'Puntuación: ' + pct + '% — ' + (pass ? 'APTO' : 'NO APTO')
          : 'Puntuación del test: ' + pct + '%') + '</strong>' +
        '<p>Has acertado ' + aciertos + ' de ' + questions.length + ' preguntas.' +
        (showVerdict ? '' : ' La calificación del curso se muestra en «Resultados».') +
        (pct < 100 ? ' ' + attemptsMsg(remaining) : '') + '</p></div>' +
        '<div class="me-final-nav">' +
        (mejorable ? '<button type="button" class="me-btn me-primary" id="me-final-retry">Repetir el test</button>' : '') +
        '<button type="button" class="me-btn" id="me-final-review">Revisar las respuestas</button>' +
        '</div>';
      box.hidden = false;
      var retry = document.getElementById('me-final-retry');
      if (retry) retry.addEventListener('click', goFirstWrong);
      document.getElementById('me-final-review').addEventListener('click', function () { showQ(0); });
      refreshQnav();
      refreshNavState();
      A11Y.announce('Resultado del test: ' + pct + ' por ciento.');
    }

    if (paged) {
      finalNav = {
        atFirst: function () { return mode === 'questions' && qCurrent === 0; },
        // «Siguiente» siempre tiene recorrido interno hasta desembocar en la
        // pantalla final (por comprobar o resultado); solo desde ella se sale.
        atLast: function () { return mode === 'summary'; },
        prev: function () {
          if (mode === 'summary') { showQ(questions.length - 1); return true; }
          if (qCurrent === 0) return false;
          showQ(qCurrent - 1); return true;
        },
        next: function () {
          if (mode === 'summary') return false;
          if (qCurrent < questions.length - 1) { showQ(qCurrent + 1); return true; }
          showSummary(); return true;
        },
      };
      content.querySelector('.me-qnav').addEventListener('click', function (e) {
        var b = e.target.closest('.me-qnav-btn'); if (!b) return;
        showQ(Number(b.getAttribute('data-qi')));
      });
      showQ(0);
    }

    // Aviso antes de avanzar de diapositiva con el test corregido pero mejorable
    // (hay fallos) y margen para reintentar; lo consulta goRelative.
    finalLeave = function (proceed) {
      // Modo «screens»: la finalización no depende de la nota, así que el test
      // final tampoco retiene al alumno al salir (ver evaluateCompletion).
      if ((rules.completion_mode || 'evaluation') === 'screens') return false;
      var r = STATE.results.__final__;
      if (!r || !r.scored || !r.maxScore) return false;
      var pct = Math.round((r.score / r.maxScore) * 100);
      var remaining = allowed > 0 ? allowed - (STATE.attempts || 0) : -1;
      // Con 100% o sin intentos restantes se sale sin estorbar.
      if (pct >= 100 || remaining === 0) return false;
      // Suspenso con intentos: NO se avanza (sin botón «Continuar»). En modo
      // autor se degrada al aviso para conservar la navegación libre del preview.
      if (showVerdict && pct < minScore && !AUTHOR) {
        testDialog({
          title: '✖ Test no superado',
          confirm: true,
          body: 'Tu resultado actual es del ' + pct + '% y necesitas un ' + minScore +
            '% para aprobar. ' + attemptsMsg(remaining),
          actions: [
            { label: 'Repetir el test', primary: true, onClick: goFirstWrong },
            { label: 'Seguir revisando' },
          ],
        });
        return true;
      }
      // Aprobado (o sin veredicto propio) pero mejorable: avisa y deja continuar.
      testDialog({
        title: '⚠ Puedes mejorar el test',
        confirm: true,
        body: 'Tu resultado actual es del ' + pct + '%' +
          (showVerdict && pct < minScore ? ' (NO APTO)' : '') + '. ' +
          attemptsMsg(remaining) + ' ¿Quieres continuar de todos modos?',
        actions: [
          { label: 'Quedarme en el test', primary: true },
          { label: 'Continuar', onClick: proceed },
        ],
      });
      return true;
    };

    // Pinta el feedback por pregunta y la nota a partir de un mapa de respuestas.
    function paint(answers) {
      var got = 0, max = 0;
      questions.forEach(function (q) {
        max += q.points || 1;
        var chosen = answers[q.id];
        var box = content.querySelector('.me-feedback[data-q="' + q.id + '"]');
        if (chosen != null) {
          var opt = (q.options || []).filter(function (o) { return o.id === chosen; })[0];
          var ok = !!(opt && opt.correct);
          if (ok) got += q.points || 1;
          verdicts[q.id] = ok;
          box.className = 'me-feedback ' + (ok ? 'is-ok' : 'is-error');
          box.innerHTML = '<strong>' + (ok ? '✔ ' : '✖ ') + rich(ok ? q.feedback.correct : q.feedback.incorrect) + '</strong>' +
            (q.feedback.explanation ? '<p class="me-expl">' + rich(q.feedback.explanation) + '</p>' : '');
          box.hidden = false;
        }
      });
      var score = max ? Math.round((got / max) * 100) : 0;
      var pass = score >= minScore;
      // En paginado el estado lo da la vista de resultado (showSummary); el
      // banner inline solo se usa en el modo clásico, con los intentos.
      if (!paged) {
        var remaining = allowed > 0 ? Math.max(0, allowed - (STATE.attempts || 0)) : -1;
        var extra = score < 100 ? ' ' + attemptsMsg(remaining) : '';
        document.getElementById('me-final-result').innerHTML = showVerdict
          ? '<div class="me-feedback ' + (pass ? 'is-ok' : 'is-error') + '"><strong>Puntuación: ' + score + '% — ' + (pass ? 'APTO' : 'NO APTO') + '.</strong>' + extra + '</div>'
          : '<div class="me-feedback"><strong>Puntuación del test: ' + score + '%.</strong> La calificación del curso se muestra en «Resultados».' + extra + '</div>';
      }
      refreshQnav();
      return { got: got, max: max, score: score, pass: pass };
    }

    // Restaura el resultado si ya se había enviado (mismo intento u otra sesión):
    // en paginado se entra directamente por la vista de resultado.
    if (STATE.results.__final__ && Object.keys(saved).length) {
      paint(saved);
      if (paged) showSummary();
    }

    // Al cambiar una respuesta, el feedback de esa pregunta y la nota del envío
    // anterior dejan de describir la selección actual: se retiran.
    document.getElementById('me-final').addEventListener('change', function (e) {
      var fs = e.target.closest('fieldset.me-q'); if (!fs) return;
      var box = fs.querySelector('.me-feedback');
      if (box) { box.hidden = true; }
      var q = questions[Number(fs.getAttribute('data-qi'))];
      if (q) delete verdicts[q.id];
      dirty = true;
      document.getElementById('me-final-result').innerHTML = '';
      if (paged) showQ(qCurrent); // refresca cuadritos y visibilidad de «Comprobar test»
      else refreshQnav();
    });

    // Corrige el intento actual (desde el botón del formulario o desde la vista
    // de resultado con respuestas modificadas). Con preguntas sin responder,
    // avisa y salta a la primera pendiente.
    function comprobar() {
      if (allowed > 0 && (STATE.attempts || 0) >= allowed) return;
      var answers = {}, answered = 0, firstMissing = -1;
      questions.forEach(function (q, qi) {
        var sel = content.querySelector('input[name="q-' + q.id + '"]:checked');
        if (sel) { answers[q.id] = sel.value; answered++; }
        else if (firstMissing < 0) firstMissing = qi;
      });
      if (answered < questions.length) { A11Y.announce('Responde a todas las preguntas.'); showQ(firstMissing); return; }

      // El intento se consume antes de pintar: así banner y vista de resultado
      // calculan los intentos restantes ya descontado este.
      STATE.attempts = attemptsUsed = (STATE.attempts || 0) + 1;
      var res = paint(answers);
      STATE.finalAnswers = answers;
      dirty = false;
      STATE.results.__final__ = { completed: true, scored: true, correct: res.pass, score: res.got, maxScore: res.max };
      // Una entrada por pregunta y envío (cmi.interactions, si está activado).
      var lat = (Date.now() - screenEnter) / 1000;
      questions.forEach(function (q) { ixRecord('final_test:' + q.id, verdicts[q.id] ? 'correct' : 'wrong', answers[q.id], lat); });
      A11Y.announce('Puntuación ' + res.score + ' por ciento.' + (showVerdict ? (res.pass ? ' Apto.' : ' No apto.') : ''));

      // Al comprobar, el test paginado aterriza en la vista de resultado (estado,
      // intentos restantes y acciones); el clásico mantiene su banner inline.
      if (paged) showSummary();

      if (allowed > 0 && attemptsUsed >= allowed) {
        content.querySelector('#me-final button[type=submit]').disabled = true;
        content.querySelectorAll('#me-final input').forEach(function (i) { i.disabled = true; });
      }
      recomputeAndPersist();
      refreshMenuChecks();
      refreshNavState();
    }

    document.getElementById('me-final').addEventListener('submit', function (ev) {
      ev.preventDefault();
      // En paginado, Enter navega (nunca comprueba directamente): siguiente
      // pregunta o, tras la última, la pantalla final con su «Comprobar test».
      if (paged) {
        if (qCurrent < questions.length - 1) showQ(qCurrent + 1);
        else showSummary();
        return;
      }
      comprobar();
    });
  }

  // Pantalla final de resultados: nota, APTO/NO APTO y desglose de calificaciones.
  function renderResults(content) {
    var rules = COURSE.scorm.rules || {};
    var status = evaluateCompletion();      // actualiza SCORM + STATE.finalScore
    var incomplete = status === 'incomplete';

    // Modo «screens»: la nota no decide nada, así que no tiene sentido mostrarla
    // como resumen — solo si el alumno ha terminado (o le falta) y Salir. El
    // mensaje usa el título del propio paquete en vez de «el curso»: un SCORM
    // puede ser un curso completo, un módulo suelto, una unidad o un tema (ver
    // invariante en CLAUDE.md), y el título es lo único universal que lo nombra.
    if ((rules.completion_mode || 'evaluation') === 'screens') {
      var cTitle = ((COURSE.course && COURSE.course.title) || '').trim();
      var sHtml = '<article class="me-screen me-screen-results"><h1>Resultados</h1>';
      if (incomplete) {
        sHtml += '<div class="me-result-hero is-warn"><div class="me-result-state">⚠ Aún no has terminado</div></div>' +
          '<p class="me-instructions">Completa todas las pantallas requeridas para terminarlo.</p>';
        // Lista de las pantallas requeridas que aún faltan por visitar, con
        // acceso directo — en Vista alumno normalmente no se llega aquí sin
        // haberlas visto (screenSatisfied lo exige), pero puede pasar en modo
        // autor/libre o si el alumno saltó pantallas con navegación libre.
        var pending = [];
        SCREENS.forEach(function (e, i) {
          if (e.isResults || !isRequired(i)) return;
          if (e.screen.scorm && e.screen.scorm.counts_for_completion === false) return;
          if (STATE.visited[e.screen.id]) return;
          pending.push({ idx: i, title: menuScreenLabel(e.screen), unit: e.unit ? (e.unit.title || '') : '' });
        });
        if (pending.length) {
          sHtml += '<table class="me-pr-table"><thead><tr><th scope="col">Pantalla</th>' +
            '<th scope="col"><span class="sr-only">Ir a la pantalla</span></th></tr></thead><tbody>';
          pending.forEach(function (it) {
            sHtml += '<tr><th scope="row">' + esc(it.title) +
              (it.unit ? ' <span class="me-pr-unit">' + esc(it.unit) + '</span>' : '') + '</th>' +
              '<td><button type="button" class="me-btn me-pr-goto" data-idx="' + it.idx + '">Ir a la pantalla →</button></td></tr>';
          });
          sHtml += '</tbody></table>';
        }
      } else {
        sHtml += '<div class="me-result-hero is-ok"><div class="me-result-state">✔ ¡Enhorabuena' +
          (cTitle ? ', has completado «' + esc(cTitle) + '»' : ', lo has completado') + '!</div></div>';
      }
      sHtml += '<div class="me-result-actions"><button type="button" class="me-btn" id="me-btn-exit">Salir</button></div></article>';
      content.innerHTML = sHtml;
      var sExitBtn = content.querySelector('#me-btn-exit');
      if (sExitBtn) sExitBtn.addEventListener('click', requestExit);
      wireGotoButtons(content);
      if (!incomplete) celebrate();
      return;
    }

    var score = STATE.finalScore;
    var min = rules.min_score || 0;
    // APTO/NO APTO informativo: siempre nota vs. mínima, aunque en modo
    // «screens» el lesson_status ya no sea 'passed'/'failed' (ver evaluateCompletion).
    var pass = !incomplete && score >= min;
    var p = progressSnapshot();

    var cls = incomplete ? 'is-warn' : (pass ? 'is-ok' : 'is-error');
    var estado = incomplete ? '⚠ Curso incompleto' : (pass ? '✔ APTO' : '✖ NO APTO');
    var html = '<article class="me-screen me-screen-results"><h1>Resultados</h1>' +
      '<div class="me-result-hero ' + cls + '">' +
      // Sin aria-label sobre un div genérico (no se anuncia): la cifra animada
      // es aria-hidden (no se lee 60 veces) y el valor va en texto sr-only.
      '<p class="me-result-score"><span class="sr-only">Nota: ' + score + ' %</span>' +
      '<span class="me-result-num" aria-hidden="true">' + score + '%</span></p>' +
      '<div class="me-result-state">' + estado + '</div>' +
      '<div class="me-result-min">Nota mínima para aprobar: ' + min + '%</div></div>';
    var evalItems = p.items.filter(function (it) { return it.scored; });
    if (evalItems.length || p.finalRow) {
      // Plegado por defecto siempre: el veredicto ya está en la cabecera, el
      // desglose es para quien quiera el detalle, no un paso obligatorio.
      html += foldHtml('me-fold-results', 'Desglose de calificaciones', resultsBreakdownHtml(p, evalItems), false);
    }
    if (incomplete) html += '<p class="me-instructions">Completa todas las pantallas y actividades requeridas para obtener la calificación final.</p>';
    else if (!pass) html += '<p class="me-instructions">No has alcanzado la nota mínima del ' + min + '% necesaria para aprobar' +
      (evalItems.length || p.finalRow ? ' (mira el desglose para ver qué actividades te han restado más)' : '') + '.</p>';

    // Acciones finales: Reintentar (solo NO APTO y si quedan intentos) y Salir.
    // attempts_allowed: 0 = ilimitados; STATE.attempts cuenta los ya consumidos.
    var allowed = rules.attempts_allowed == null ? 0 : rules.attempts_allowed;
    var canRetry = !incomplete && !pass && (allowed === 0 || (STATE.attempts + 1) < allowed);
    var retriesLeft = allowed === 0 ? null : allowed - STATE.attempts - 1;
    html += '<div class="me-result-actions">';
    if (canRetry) {
      html += '<button type="button" class="me-btn me-primary" id="me-btn-retry">↺ Reintentar el curso</button>' +
        (retriesLeft != null ? '<span class="me-result-retries">' +
          (retriesLeft === 1 ? 'Te queda 1 intento.' : 'Te quedan ' + retriesLeft + ' intentos.') + '</span>' : '');
    }
    if (!incomplete && !pass && !canRetry && allowed > 0) {
      html += '<span class="me-result-retries">Has agotado los ' + allowed + ' intentos permitidos.</span>';
    }
    // Salir se ofrece SIEMPRE: con calificación cierra el intento; con el curso
    // incompleto pide confirmación (el progreso queda guardado para reanudar).
    html += '<button type="button" class="me-btn" id="me-btn-exit">Salir del curso</button>';
    html += '</div></article>';
    content.innerHTML = html;

    wireFolds(content);
    var retryBtn = content.querySelector('#me-btn-retry');
    if (retryBtn) retryBtn.addEventListener('click', retryCourse);
    var exitBtn = content.querySelector('#me-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', requestExit);
    wireGotoButtons(content);

    // Refuerzo del logro: la nota sube animada y, si está APTO, confeti (una
    // vez por sesión). Con prefers-reduced-motion no se anima nada.
    var scoreEl = content.querySelector('.me-result-num');
    if (scoreEl) animateNumber(scoreEl, score, '%');
    if (pass && !incomplete) celebrate();
  }

  var RESULT_STATE_LABELS = {
    pending: ['⏳', 'Pendiente', 'is-pending'],
    done: ['✔', 'Hecha', 'is-done'],
    correct: ['✔', 'Correcta', 'is-ok'],
    partial: ['◐', 'Parcial', 'is-partial'],
    incorrect: ['✖', 'Incorrecta', 'is-ko'],
  };

  // Tabla del desglose de calificaciones: una fila por pantalla evaluable (y el
  // test final si cuenta para la nota) con su estado, puntos y peso final. Las
  // pendientes llevan un botón para saltar directo a esa pantalla — el intento
  // SCORM sigue abierto, así que el alumno puede completarla sin perder lo hecho.
  function resultsBreakdownHtml(p, evalItems) {
    var tbl = '<table class="me-pr-table"><thead><tr><th scope="col">Actividad</th><th scope="col">Estado</th>' +
      '<th scope="col">Puntos</th><th scope="col">Peso en la nota</th><th scope="col"><span class="sr-only">Ir a la actividad</span></th></tr></thead><tbody>';
    evalItems.forEach(function (it) {
      var lbl = RESULT_STATE_LABELS[it.state] || RESULT_STATE_LABELS.pending;
      var goto = it.state === 'pending'
        ? '<button type="button" class="me-btn me-pr-goto" data-idx="' + it.idx + '">Ir a la actividad →</button>' : '';
      tbl += '<tr><th scope="row">' + esc(it.title) + (it.unit ? ' <span class="me-pr-unit">' + esc(it.unit) + '</span>' : '') + '</th>' +
        '<td class="me-pr-state ' + lbl[2] + '">' + lbl[0] + ' ' + lbl[1] + '</td>' +
        '<td>' + (it.state === 'pending' ? '—' : it.score + '/' + it.maxScore) + '</td>' +
        '<td>' + (it.weightPct ? it.weightPct + '%' : '—') + '</td>' +
        '<td>' + goto + '</td></tr>';
    });
    if (p.finalRow) {
      var f = p.finalRow;
      var fgoto = !f.done ? '<button type="button" class="me-btn me-pr-goto" data-idx="' + f.idx + '">Ir al test final →</button>' : '';
      tbl += '<tr class="me-pr-final"><th scope="row">' + esc(f.title) + '</th>' +
        '<td class="me-pr-state ' + (f.done ? 'is-ok' : 'is-pending') + '">' + (f.done ? '✔ Realizado' : '⏳ Pendiente') + '</td>' +
        '<td>' + (f.done ? f.score + '/' + f.maxScore : '—') + '</td>' +
        '<td>' + f.weightPct + '%</td>' +
        '<td>' + fgoto + '</td></tr>';
    }
    tbl += '</tbody></table>';
    if (p.source === 'final_test') {
      tbl += '<p class="me-pr-note">La nota del curso es la del test final; las actividades son práctica y requisito para terminar.</p>';
    } else if (p.source === 'mixed' && p.finalRow) {
      tbl += '<p class="me-pr-note">La nota combina la práctica (' + (100 - p.finalRow.weightPct) + '%) y el test final (' + p.finalRow.weightPct + '%).</p>';
    }
    return tbl;
  }

  // Sección plegable genérica (mismo patrón/clases que el accordion de las
  // interacciones: setupPrint la expande al imprimir y print.css la muestra).
  function foldHtml(id, title, inner, open) {
    return '<div class="me-fold me-acc-item">' +
      '<button class="me-acc-head" aria-expanded="' + (open ? 'true' : 'false') + '" aria-controls="' + id + '">' +
      '<span class="me-acc-title">' + esc(title) + '</span></button>' +
      '<div class="me-acc-body" id="' + id + '" role="region"' + (open ? '' : ' hidden') + '>' + inner + '</div></div>';
  }
  // Saltar a una pantalla/actividad pendiente sin cerrar el intento: navegar
  // hacia atrás en SCREENS siempre está permitido (canNavigateTo), sea cual
  // sea el modo de navegación del curso. Compartido por el desglose de
  // calificaciones (evaluation) y la lista de pantallas pendientes (screens).
  function wireGotoButtons(root) {
    root.querySelectorAll('.me-pr-goto').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.getAttribute('data-idx'), 10);
        if (isNaN(idx) || idx < 0) return;
        if (canNavigateTo(idx)) goTo(idx, false, true);
        else A11Y.announce('Esa pantalla aún no está disponible.');
      });
    });
  }
  function wireFolds(root) {
    root.querySelectorAll('.me-fold > .me-acc-head').forEach(function (head) {
      head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', String(!open));
        var body = document.getElementById(head.getAttribute('aria-controls'));
        if (body) body.hidden = open;
      });
    });
  }

  // Nuevo intento: se limpian respuestas y resultados (práctica y test final)
  // pero NO las pantallas vistas — el contenido ya se estudió; lo que se repite
  // es la evaluación. El contador de intentos viaja en suspend_data.
  function retryCourse() {
    STATE.attempts = (STATE.attempts || 0) + 1;
    STATE.interactions = {};
    STATE.results = {};
    STATE.finalScore = 0;
    SCORM.setStatus('incomplete');
    recomputeAndPersist();
    refreshMenuChecks();
    A11Y.announce('Nuevo intento iniciado. Las actividades se han reiniciado.');
    goTo(0, true);
    // El botón pulsado desaparece con el re-render: el foco pasa al título.
    A11Y.focusMain();
  }

  // Confirmación al salir con el curso incompleto: el progreso queda guardado
  // (exit=suspend) y al volver se reanuda donde se dejó — o se empieza de nuevo
  // si el curso desactiva la reanudación. Modal propia (mismas clases .me-modal
  // que glosario/recursos) con foco inicial en la opción segura.
  function confirmExitIncomplete() {
    var rules = COURSE.scorm.rules || {};
    var resumeMsg = rules.allow_resume !== false
      ? 'Tu progreso queda guardado: al volver al curso continuarás donde lo dejaste, o podrás comenzar un nuevo intento si el campus lo permite.'
      : 'Este curso no guarda la reanudación: al volver a entrar comenzarás un nuevo intento desde el principio.';
    var overlay = document.createElement('div');
    overlay.className = 'me-modal me-exit-confirm';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Confirmar salida del curso');
    overlay.innerHTML = '<div class="me-modal-card me-exit-card">' +
      '<div class="me-modal-head"><h2 class="me-modal-title">⚠ El curso está incompleto</h2></div>' +
      '<p class="me-exit-msg">Todavía te quedan pantallas o actividades por completar, así que no se registrará una calificación. ' + resumeMsg + '</p>' +
      '<div class="me-exit-actions">' +
      '<button type="button" class="me-btn me-primary me-exit-stay">Seguir en el curso</button>' +
      '<button type="button" class="me-btn me-exit-go">Salir de todos modos</button>' +
      '</div></div>';
    // Diálogo accesible (A11Y.trapFocus), como testDialog.
    var release = null;
    function close() {
      overlay.remove();
      if (release) { var r = release; release = null; r(); }
    }
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    overlay.querySelector('.me-exit-stay').addEventListener('click', close);
    overlay.querySelector('.me-exit-go').addEventListener('click', function () {
      close();
      exitCourse();
    });
    document.body.appendChild(overlay);
    release = A11Y.trapFocus(overlay, { onEscape: close, fallback: A11Y.focusMain });
    overlay.querySelector('.me-exit-stay').focus();
  }

  // Salir: cierra la comunicación SCORM (nota y tiempo quedan registrados) e
  // intenta cerrar la ventana. Si el navegador no lo permite (lo habitual si la
  // ventana no la abrió un script), se muestra una DESPEDIDA a pantalla completa
  // que cubre la carcasa: la sesión ya está cerrada y seguir navegando no
  // persistiría nada, así que no se deja el curso interactivo detrás.
  // Botón «Cerrar» de la cabecera y «Salir del curso» de Resultados comparten
  // esta misma lógica: con el curso incompleto pide confirmación (el progreso
  // queda guardado para reanudar); si no, cierra la sesión SCORM directamente.
  function requestExit() {
    if (evaluateCompletion() === 'incomplete') confirmExitIncomplete();
    else exitCourse();
  }

  // Página del curso en Moodle, para el botón «Volver al curso» de la despedida.
  // Moodle sirve el paquete desde su propio dominio, así que la carcasa puede
  // mirar en las ventanas que la contienen: primero M.cfg (wwwroot + courseId),
  // y si no, cualquier enlace a course/view.php (migas, «Salir de la
  // actividad»). Fuera de Moodle, con otro dominio o en la Vista estudiante del
  // editor, no encuentra nada y la despedida se queda con el mensaje de siempre.
  function lmsCourseUrl() {
    var w = global, seen = 0;
    while (w && seen++ < 10) {
      try {
        var M = w.M;
        if (M && M.cfg && M.cfg.wwwroot && M.cfg.courseId && M.cfg.courseId > 1) {
          return M.cfg.wwwroot + '/course/view.php?id=' + M.cfg.courseId;
        }
        var a = w.document.querySelector('a[href*="/course/view.php?id="]');
        if (a && /\/course\/view\.php\?id=\d+/.test(a.href)) return a.href;
      } catch (e) { /* ventana de otro dominio: se sigue subiendo */ }
      if (w === w.parent) break;
      w = w.parent;
    }
    return '';
  }
  function goToLmsCourse(url) {
    try { global.top.location.href = url; } catch (e) { global.location.href = url; }
  }

  function exitCourse() {
    finishSession();
    // Si el alumno amplió la carcasa a pantalla completa, se sale antes de la
    // despedida: quien no sepa restaurar la ventana (sobre todo en móvil) no
    // se queda atrapado en ella.
    if (fullscreenElement()) {
      try {
        var p = (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    global.close();
    setTimeout(function () {
      var url = AUTHOR ? '' : lmsCourseUrl();
      var auto = !!(url && (COURSE.scorm.rules || {}).auto_return);
      // Despedida como diálogo modal (la carcasa de detrás queda inerte: la
      // sesión ya está cerrada). Sin role=status: era una región viva y el
      // contador se anunciaba cada segundo; se anuncia una vez al aparecer.
      var AUTO_SECONDS = 20; // WCAG 2.2.1: margen holgado + se detiene con cualquier tecla o clic
      var bye = document.createElement('div');
      bye.className = 'me-exit-done';
      bye.setAttribute('role', 'dialog');
      bye.setAttribute('aria-modal', 'true');
      bye.setAttribute('aria-labelledby', 'me-exit-done-title');
      bye.innerHTML = '<div class="me-exit-done-card">' +
        '<div class="me-exit-done-icon" aria-hidden="true">✔</div>' +
        '<h1 id="me-exit-done-title">Sesión finalizada</h1>' +
        (url
          ? '<p>Tu progreso ha quedado registrado.</p>' +
            '<button type="button" class="me-btn me-primary me-exit-return">Volver al curso</button>' +
            (auto ? '<p class="me-exit-auto">Volviendo al curso en <span class="me-exit-count">' + AUTO_SECONDS + '</span> s · ' +
              '<button type="button" class="me-exit-keep">Quedarme aquí</button></p>' : '')
          : '<p>Tu progreso ha quedado registrado.<br>Ya puedes cerrar esta pestaña para volver al campus.</p>') +
        '</div>';
      document.body.appendChild(bye);
      A11Y.trapFocus(bye); // sin release: no hay vuelta a la carcasa
      if (!url) {
        bye.querySelector('h1').setAttribute('tabindex', '-1');
        bye.querySelector('h1').focus();
        A11Y.announce('Sesión finalizada. Tu progreso ha quedado registrado. Ya puedes cerrar esta pestaña.');
        return;
      }
      var timer = null;
      function stopCountdown() {
        if (!timer) return;
        clearInterval(timer); timer = null;
        document.removeEventListener('keydown', stopCountdown, true);
        document.removeEventListener('pointerdown', stopCountdown, true);
        var line = bye.querySelector('.me-exit-auto');
        if (!line) return;
        var hadFocus = line.contains(document.activeElement);
        line.textContent = 'Cuenta atrás detenida: vuelve al curso cuando quieras.';
        // Diferido: si fue Intro sobre «Quedarme aquí», el keypress/click de esa
        // misma tecla no debe caer en «Volver al curso».
        if (hadFocus) setTimeout(function () { bye.querySelector('.me-exit-return').focus(); }, 50);
      }
      bye.querySelector('.me-exit-return').addEventListener('click', function () {
        if (timer) { clearInterval(timer); timer = null; }
        goToLmsCourse(url);
      });
      if (!auto) {
        bye.querySelector('.me-exit-return').focus();
        A11Y.announce('Sesión finalizada. Tu progreso ha quedado registrado.');
        return;
      }
      // Foco inicial en «Quedarme aquí» (la opción que detiene la vuelta).
      var keep = bye.querySelector('.me-exit-keep');
      keep.addEventListener('click', stopCountdown); // respaldo: el pointerdown/keydown ya la detienen
      keep.focus();
      A11Y.announce('Sesión finalizada. Volverás al curso automáticamente en ' + AUTO_SECONDS +
        ' segundos. Pulsa cualquier tecla para quedarte aquí.');
      var left = AUTO_SECONDS;
      timer = setInterval(function () {
        left--;
        var n = bye.querySelector('.me-exit-count');
        if (n) n.textContent = String(left);
        if (left <= 0) { clearInterval(timer); timer = null; goToLmsCourse(url); }
      }, 1000);
      // Cualquier tecla o clic detiene la cuenta (en captura, antes que nada).
      // Se engancha en el siguiente tick: el Intro/clic que abrió la despedida
      // ya pasó, pero así no hay carrera con su keyup/pointerup.
      setTimeout(function () {
        if (!timer) return;
        document.addEventListener('keydown', stopCountdown, true);
        document.addEventListener('pointerdown', stopCountdown, true);
      }, 0);
    }, 400);
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // ---- Revelado progresivo del contenido (shell.motion = 'rich') -----------
  // Primera visita a una pantalla: los bloques visibles entran en cascada
  // (delays cortos, con tope) y los que quedan bajo el pliegue aparecen al
  // hacer scroll (IntersectionObserver). El alumno marca el ritmo con su
  // scroll: NUNCA se retiene contenido por temporizador. Pantallas ya vistas
  // en la sesión no se re-animan. Sin IntersectionObserver (navegador muy
  // antiguo) todo se muestra al instante. El contenido siempre está en el DOM
  // (solo opacity/transform): lectores de pantalla e impresión intactos.
  var MOTION = 'subtle';
  var SPEED = 1.5; // multiplicador de shell.motion_speed (fast 1 / normal 1.5 / slow 3)
  var REVEALED = {};
  var revealObserver = null;

  function applyReveal(screenId, content) {
    if (revealObserver) { revealObserver.disconnect(); revealObserver = null; }
    if ((MOTION !== 'rich' && MOTION !== 'vivid') || prefersReducedMotion() || REVEALED[screenId]) return;
    REVEALED[screenId] = true;
    var blocks = [].slice.call(content.querySelectorAll(
      '.me-prose > *, .me-media, .me-interaction, .me-transcript'));
    if (!blocks.length) return;
    var fold = content.getBoundingClientRect().bottom;
    var delay = 0;
    var below = [];
    blocks.forEach(function (b) {
      if (b.getBoundingClientRect().top < fold) {
        b.classList.add('me-rv');
        b.style.animationDelay = Math.round(Math.min(delay, 560 * SPEED)) + 'ms'; // tope de cascada
        delay += 70 * SPEED;
      } else {
        below.push(b);
      }
    });
    if (!below.length || !('IntersectionObserver' in global)) return;
    below.forEach(function (b) { b.classList.add('me-rv-wait'); });
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.remove('me-rv-wait');
        en.target.classList.add('me-rv');
        revealObserver.unobserve(en.target);
      });
    }, { root: content, rootMargin: '0px 0px -8% 0px' });
    below.forEach(function (b) { revealObserver.observe(b); });
  }

  // Cuenta de 0 al valor final con easing (para la nota de Resultados).
  function animateNumber(el, target, suffix) {
    if (prefersReducedMotion()) { el.textContent = target + suffix; return; }
    var t0 = null, dur = 900;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) global.requestAnimationFrame(step);
    }
    global.requestAnimationFrame(step);
  }

  // Confeti ligero propio (canvas efímero, paleta corporativa, sin dependencias).
  var celebrated = false;
  function celebrate() {
    if (celebrated || prefersReducedMotion() || MOTION === 'none') return;
    celebrated = true;
    var canvas = document.createElement('canvas');
    canvas.className = 'me-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.width = global.innerWidth;
    canvas.height = global.innerHeight;
    document.body.appendChild(canvas);
    var c2d = canvas.getContext('2d');
    if (!c2d) { canvas.remove(); return; }
    var colors = ['#6DC3C0', '#F4C910', '#7787BF', '#F4D6D2'];
    var parts = [];
    for (var i = 0; i < 120; i++) {
      parts.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.5,
        w: 6 + Math.random() * 5, h: 8 + Math.random() * 6,
        vx: -1.2 + Math.random() * 2.4, vy: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI, vr: -0.12 + Math.random() * 0.24,
        color: colors[i % colors.length],
      });
    }
    var t0 = Date.now(), DURATION = 2400;
    function frame() {
      var elapsed = Date.now() - t0;
      c2d.clearRect(0, 0, canvas.width, canvas.height);
      c2d.globalAlpha = elapsed > DURATION - 500 ? Math.max(0, (DURATION - elapsed) / 500) : 1;
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        c2d.save();
        c2d.translate(p.x, p.y);
        c2d.rotate(p.rot);
        c2d.fillStyle = p.color;
        c2d.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        c2d.restore();
      });
      if (elapsed < DURATION) global.requestAnimationFrame(frame);
      else canvas.remove();
    }
    global.requestAnimationFrame(frame);
  }

  // ---- Tiempo / cierre ---------------------------------------------------
  function saveTime() {}
  var sessionFinished = false;
  function finishSession() {
    if (sessionFinished) return; // puede llegar por pagehide Y beforeunload
    sessionFinished = true;
    var secs = Math.round((Date.now() - sessionStart) / 1000);
    SCORM.setSessionTime(secs);
    // Si se cierra antes de cargar el curso no hay nada que evaluar.
    var status = COURSE ? evaluateCompletion() : SCORM.getStatus();
    // Salida sin terminar → exit=suspend para que LMS estrictos conserven el
    // intento y permitan reanudar (salvo que el curso desactive allow_resume).
    var rules = (COURSE && COURSE.scorm && COURSE.scorm.rules) || {};
    SCORM.setExit(status === 'incomplete' && rules.allow_resume !== false ? 'suspend' : '');
    SCORM.finish();
  }

  var esc = function (s) { return global.Interactions.esc(s); };
  var rich = function (s) { return global.Interactions.rich(s); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
