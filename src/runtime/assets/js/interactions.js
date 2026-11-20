/* =============================================================================
 * interactions.js — Motor de interacciones (todos los tipos del enum)
 * Patrón registro: Interactions.register(type, factory).
 * factory(el, data, ctx) -> controller { result() }
 *   ctx = { state, save(state), announce(msg), esc(str) }
 *   result() -> { completed, scored, correct, score, maxScore }
 * Todo feedback es TEXTUAL además de visual. Sin dependencias externas.
 * ===========================================================================*/
(function (global) {
  'use strict';

  // Acepta el ID desnudo o la URL pegada (watch, youtu.be, embed, shorts).
  function ytIdOf(v) {
    var m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/.exec(String(v || ''));
    return m ? m[1] : String(v || '').trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Texto enriquecido: subconjunto SEGURO de markdown -> HTML.
  // Permite **negrita**, *cursiva* y enlaces [texto](http(s)://... | mailto:...).
  // Primero escapa todo (anti-XSS) y luego aplica el formato controlado.
  function rich(s) {
    var out = esc(s);
    out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g, function (m, t, url) {
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
    });
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return out;
  }

  // Markdown de bloque (párrafos, listas, encabezados) para cuerpos largos de
  // interacciones (accordion/tabs). Reusa el renderer si ya está cargado; si no,
  // cae a inline. Así las listas dentro de un accordion salen como <ul>, no en línea.
  function block(s) {
    return (global.Renderer && global.Renderer.mdToHtml) ? global.Renderer.mdToHtml(s) : '<p>' + rich(s) + '</p>';
  }

  // Versión en texto plano (para atributos: aria-label, <option>, etc.).
  function stripTags(s) {
    return String(s == null ? '' : s)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1');
  }

  // Resuelve una ruta de asset a una blob URL si la previsualización del editor
  // la ha inyectado en window.__ASSETS__. En el SCORM real no existe ese mapa y
  // la ruta relativa se usa tal cual.
  function assetUrl(p) {
    if (!p) return p;
    var map = global.__ASSETS__;
    if (map && Object.prototype.hasOwnProperty.call(map, p)) return map[p];
    return p;
  }

  // --- Narración por ítem (accordion/tabs/flip_cards/timeline/image_cards/
  // flashcards): un audio corto por ítem que suena SOLO la primera vez que se
  // revela (nunca antes: leerlo al cargar la pantalla chafaría el propio
  // mecanismo de descubrimiento). Solo puede sonar un audio de narración a la
  // vez en toda la carcasa (de pantalla o de ítem): revelar un ítem para el
  // audio de pantalla (`ctx.pauseScreenNarration`, ver app.js) y viceversa
  // (`Interactions.stopItemAudio`, que app.js llama al navegar/activar el
  // audio de pantalla). Como cada pantalla tiene como mucho una interacción,
  // basta con una única referencia "activa" a nivel de módulo.
  var activeItemAudio = null;
  function stopItemAudio() {
    if (activeItemAudio) { try { activeItemAudio.pause(); } catch (e) {} activeItemAudio = null; }
  }
  // El alumno cambia la velocidad mientras un ítem está sonando: se aplica al
  // vuelo (app.js llama a esto desde el selector de velocidad de la barra).
  function setItemAudioRate(rate) {
    if (activeItemAudio) { try { activeItemAudio.playbackRate = rate; } catch (e) {} }
  }
  // Igual que setItemAudioRate pero para el volumen (app.js llama a esto desde
  // el control de volumen del reproductor de la barra).
  function setItemAudioVolume(vol) {
    if (activeItemAudio) { try { activeItemAudio.volume = vol; } catch (e) {} }
  }
  // Markup del audio oculto de un ítem (vive dentro del cuerpo/cara que ya
  // está oculto hasta el revelado). Sin control de «escuchar de nuevo»: suena
  // siempre que el ítem se abre (ver revealItemAudio); si resulta repetitivo,
  // el alumno desactiva el audio con las opciones generales de la barra
  // inferior.
  function itemAudioMarkup(src) {
    if (!src) return '';
    return '<span class="me-item-audio">' +
      '<audio class="me-item-narration" preload="auto"><source src="' + esc(assetUrl(src)) + '"></audio></span>';
  }
  // Localiza el <audio> de un ítem ya insertado en `container`.
  // Devuelve `{audio}` (o null si el ítem no tiene audio).
  function wireItemAudio(container) {
    var box = container.querySelector('.me-item-audio');
    return box ? { audio: box.querySelector('.me-item-narration') } : null;
  }
  // Reproduce el audio de un ítem revelado: para cualquier otra narración (de
  // pantalla o de otro ítem), aplica la velocidad elegida por el alumno y
  // respeta el toggle 🔊/🔇.
  function playItemAudio(ctx, audioEl) {
    if (!audioEl) return;
    stopItemAudio();
    if (ctx && typeof ctx.pauseScreenNarration === 'function') ctx.pauseScreenNarration();
    if (!ctx || typeof ctx.audioEnabled !== 'function' || !ctx.audioEnabled()) return;
    try {
      audioEl.currentTime = 0;
      audioEl.playbackRate = (ctx.audioRate && ctx.audioRate()) || 1;
      audioEl.volume = (ctx.audioVolume && ctx.audioVolume());
      if (!(audioEl.volume >= 0)) audioEl.volume = 1;
    } catch (e) {}
    activeItemAudio = audioEl;
    var p = audioEl.play();
    if (p && p.catch) p.catch(function () {});
  }
  // Punto único de "revelado" para las 6 factories: dispara el audio del
  // ítem. Se llama en CADA apertura (no solo la primera vez): el alumno puede
  // reabrir un accordion/pestaña/tarjeta ya vista tantas veces como quiera y
  // vuelve a oír la narración cada vez.
  function revealItemAudio(ctx, entry) {
    if (entry) playItemAudio(ctx, entry.audio);
  }

  var registry = {};
  function register(type, factory) { registry[type] = factory; }

  function shuffle(arr, seed) {
    // Barajado REAL pero determinista (Fisher-Yates con PRNG sembrado): la misma
    // interacción baraja igual en cada carga (casa con suspend_data y la
    // reanudación), pero el orden del autor no se sirve tal cual al alumno.
    // Ojo: ordenar por (id + semilla) NO baraja — el prefijo (id) decide.
    var rnd = seededRandom(String(seed));
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Nº de intentos de una interacción evaluable. Por defecto 1; 0 = ilimitados.
  function attemptsOf(data) {
    return data.attempts == null ? 1 : data.attempts;
  }

  // Reordena items según una lista de ids guardada (restauración de sort_steps).
  function orderByIds(items, ids) {
    var byId = {};
    items.forEach(function (s) { byId[s.id] = s; });
    var res = [];
    ids.forEach(function (id) { if (byId[id]) { res.push(byId[id]); delete byId[id]; } });
    items.forEach(function (s) { if (byId[s.id]) res.push(s); });
    return res;
  }

  function feedbackBox(data) {
    return '<div class="me-feedback" role="status" aria-live="polite" hidden></div>';
  }
  // Reinicia la animación CSS de un nodo que persiste (reflow para replay).
  function replay(node) {
    node.style.animation = 'none';
    void node.offsetWidth;
    node.style.animation = '';
  }

  function showFeedback(el, ok, data) {
    var box = el.querySelector('.me-feedback');
    if (!box) return;
    var msg = ok ? (data.feedback.correct || 'Correcto.') : (data.feedback.incorrect || 'Revisa tu respuesta.');
    var expl = data.feedback.explanation ? '<p class="me-expl">' + rich(data.feedback.explanation) + '</p>' : '';
    box.className = 'me-feedback ' + (ok ? 'is-ok' : 'is-error');
    box.innerHTML = '<strong>' + (ok ? '✔ ' : '✖ ') + rich(msg) + '</strong>' + expl;
    box.hidden = false;
    replay(box);
  }

  // Feedback en ventana modal (además de la caja en línea, que queda como registro):
  // la caja inferior puede quedar fuera de la vista. Se cierra con el botón, clicando
  // fuera o con Esc; al cerrar devuelve el foco a `returnFocus`.
  function showFeedbackModal(el, ok, data, returnFocus) {
    var doc = el.ownerDocument;
    var inline = el.querySelector('.me-feedback');
    if (inline) inline.hidden = true; // el modal sustituye a la caja en línea (que solo se pinta al restaurar)
    var old = doc.querySelector('.me-fbmodal');
    if (old) old.remove();
    var msg = ok ? (data.feedback.correct || 'Correcto.') : (data.feedback.incorrect || 'Revisa tu respuesta.');
    var expl = data.feedback.explanation ? '<p class="me-expl">' + rich(data.feedback.explanation) + '</p>' : '';
    var m = doc.createElement('div');
    m.className = 'me-modal me-fbmodal';
    m.innerHTML = '<div class="me-modal-card me-fbmodal-card ' + (ok ? 'is-ok' : 'is-error') + '" role="dialog" aria-modal="true" aria-label="Resultado">' +
      '<div class="me-fbmodal-body"><strong>' + (ok ? '✔ ' : '✖ ') + rich(msg) + '</strong>' + expl + '</div>' +
      '<div class="me-fbmodal-foot"><button type="button" class="me-btn me-fbmodal-close">Cerrar</button></div></div>';
    function close() {
      doc.removeEventListener('keydown', onKey, true);
      m.remove();
      if (returnFocus && returnFocus.focus) returnFocus.focus();
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    m.querySelector('.me-fbmodal-close').addEventListener('click', close);
    doc.addEventListener('keydown', onKey, true);
    doc.body.appendChild(m);
    m.querySelector('.me-fbmodal-close').focus();
  }

  function header(data) {
    return (data.prompt ? '<p class="me-prompt">' + rich(data.prompt) + '</p>' : '') +
           (data.instructions ? '<p class="me-instructions">' + rich(data.instructions) + '</p>' : '');
  }

  // Puntero principal táctil (móvil/tableta). Decide las instrucciones de los
  // ejercicios de ordenar/colocar y si se ofrece el arrastre nativo HTML5, que en
  // táctil no es fiable (el dedo hace scroll). Un portátil con pantalla táctil
  // tiene puntero principal fino: conserva el arrastre con ratón.
  function isCoarse() {
    try { return !!(global.matchMedia && global.matchMedia('(pointer: coarse)').matches); } catch (e) { return false; }
  }

  // Botón Comprobar: nace desactivado; cuando `ready()` (respuesta completa) se cumple,
  // se activa y, si el cambio viene del usuario (`pulse`), late para invitar a comprobar.
  // El pulso se apaga al clicar y vuelve si se cambia la respuesta.
  function wireCheck(el, ready) {
    var btn = el.querySelector('.me-check');
    if (!btn) return function () {};
    btn.disabled = true;
    btn.addEventListener('click', function () { btn.classList.remove('me-pulse'); });
    return function (pulse) {
      var ok = ready();
      btn.disabled = !ok;
      btn.classList.toggle('me-pulse', !!(ok && pulse));
    };
  }

  // Indicador textual de intentos junto al botón Comprobar (`.me-attempts`),
  // para evaluables con `attempts` finitos (attemptsOf > 0). Con intentos
  // ilimitados no hay nada que agotar, así que no se muestra nada. Se llama
  // al pintar (fresca o restaurada) y tras cada check(), con los intentos ya
  // consumidos y si el intento actual fue correcto.
  function attemptsHint(el, maxAtt) {
    var node = el.querySelector('.me-attempts');
    if (!node || maxAtt <= 0) return function () {};
    return function (used, correct) {
      if (correct) { node.textContent = ''; return; }
      var remaining = Math.max(0, maxAtt - used);
      node.textContent = used === 0 ? ('Intentos disponibles: ' + maxAtt + '.')
        : remaining === 0 ? 'Sin más intentos.'
        : 'Te ' + (remaining === 1 ? 'queda 1 intento' : 'quedan ' + remaining + ' intentos') + '.';
    };
  }

  // --- 1. Accordion ----------------------------------------------------------
  register('accordion', function (el, data, ctx) {
    var items = (data.config.items || []);
    var seen = (ctx.state && ctx.state.seen) || {}; // índice -> true (persistido)
    var html = header(data) + '<div class="me-accordion">';
    items.forEach(function (it, i) {
      var id = 'acc-' + i;
      html += '<div class="me-acc-item">' +
        '<button class="me-acc-head' + (seen[i] ? ' is-seen' : '') + '" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="me-acc-title">' + rich(it.title) + '</span>' +
        '<span class="me-seen-check" aria-hidden="true">✓</span></button>' +
        '<div class="me-acc-body" id="' + id + '" role="region" hidden>' + itemAudioMarkup(it.audio_src) + block(it.body) + '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
    var heads = [].slice.call(el.querySelectorAll('.me-acc-head'));
    var bodies = [].slice.call(el.querySelectorAll('.me-acc-body'));
    var audioEls = bodies.map(function (b) { return wireItemAudio(b); });
    // Pulso en el primero para invitar al clic, solo si aún no se ha abierto ninguno
    if (!Object.keys(seen).length && heads[0]) heads[0].classList.add('me-pulse');
    heads.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        stopItemAudio();
        // Exclusivo: al abrir uno se cierran los demás
        heads.forEach(function (other, j) {
          var on = other === btn && !open;
          other.classList.remove('me-pulse');
          other.setAttribute('aria-expanded', String(on));
          bodies[j].hidden = !on;
        });
        if (!open) {
          if (!seen[i]) { seen[i] = true; btn.classList.add('is-seen'); ctx.save({ seen: seen }); }
          revealItemAudio(ctx, audioEls[i]);
        }
      });
    });
    // Completada solo cuando se han abierto TODOS los apartados: con la regla
    // «exigir completar las interacciones» activa, no deja avanzar hasta entonces.
    return { result: function () {
      return { completed: items.every(function (_, i) { return !!seen[i]; }), scored: false };
    } };
  });

  // --- 2. Tabs ---------------------------------------------------------------
  register('tabs', function (el, data, ctx) {
    var items = (data.config.items || []);
    var seen = (ctx.state && ctx.state.seen) || {}; // índice -> true (persistido)
    seen[0] = true; // la primera pestaña está visible desde el principio
    var tablist = '<div class="me-tabs" role="tablist">';
    var panels = '';
    items.forEach(function (it, i) {
      var sel = i === 0;
      tablist += '<button role="tab" id="tab-' + i + '" aria-controls="panel-' + i + '" aria-selected="' + sel + '" tabindex="' + (sel ? '0' : '-1') + '"' +
        (seen[i] ? ' class="is-seen"' : '') + '>' + rich(it.title) +
        '<span class="me-seen-check" aria-hidden="true">✓</span></button>';
      panels += '<div role="tabpanel" id="panel-' + i + '" aria-labelledby="tab-' + i + '" ' + (sel ? '' : 'hidden') + '>' + itemAudioMarkup(it.audio_src) + block(it.body) + '</div>';
    });
    tablist += '</div>';
    el.innerHTML = header(data) + '<div class="me-tabs-box">' + tablist + panels + '</div>';
    var tabs = [].slice.call(el.querySelectorAll('[role=tab]'));
    var tabPanels = [].slice.call(el.querySelectorAll('[role=tabpanel]'));
    var audioEls = tabPanels.map(function (p) { return wireItemAudio(p); });
    // Pulso en la segunda pestaña (la primera ya está activa) hasta que se cambie
    if (Object.keys(seen).length <= 1 && tabs[1]) tabs[1].classList.add('me-pulse');
    function activate(i) {
      stopItemAudio();
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.classList.remove('me-pulse');
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        tabPanels[j].hidden = !on;
        if (on) t.focus();
      });
      if (!seen[i]) { seen[i] = true; tabs[i].classList.add('is-seen'); ctx.save({ seen: seen }); }
      revealItemAudio(ctx, audioEls[i]);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length); }
      });
    });
    // Completada solo cuando se han visitado TODAS las pestañas (la primera
    // cuenta desde el principio porque ya está visible).
    return { result: function () {
      return { completed: items.every(function (_, i) { return !!seen[i]; }), scored: false };
    } };
  });

  // --- 3. Flip cards ---------------------------------------------------------
  register('flip_cards', function (el, data, ctx) {
    // Volteo 3D real (CSS rotateY): ambas caras viven en el DOM apiladas; la
    // visibilidad la resuelve backface-visibility y el lector de pantalla usa
    // aria-hidden. La impresión aplana las dos caras vía print.css.
    var cards = (data.config.cards || []);
    var seen = (ctx.state && ctx.state.seen) || {}; // índice -> true (persistido)
    var html = header(data) + '<div class="me-cards">';
    cards.forEach(function (c, i) {
      html += '<button class="me-card' + (seen[i] ? ' is-seen' : '') + '" aria-pressed="false" data-i="' + i + '" title="Pulsa para girar la tarjeta">' +
        '<span class="me-flip-inner">' +
        '<span class="me-card-front">' + block(c.front) + '<span class="me-flip-tab" aria-hidden="true"></span></span>' +
        '<span class="me-card-back" aria-hidden="true">' + block(c.back) + itemAudioMarkup(c.audio_src) + '</span></span></button>';
    });
    el.innerHTML = html + '</div>';
    var btns = [].slice.call(el.querySelectorAll('.me-card'));
    var audioEls = btns.map(function (b) { return wireItemAudio(b); });
    // Pulso en la primera para invitar al clic, solo si aún no se ha girado ninguna
    if (!Object.keys(seen).length && btns[0]) btns[0].classList.add('me-pulse');
    function setFlip(btn, on) {
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('.me-card-front').setAttribute('aria-hidden', String(on));
      btn.querySelector('.me-card-back').setAttribute('aria-hidden', String(!on));
    }
    btns.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var flipped = btn.getAttribute('aria-pressed') === 'true';
        stopItemAudio();
        // Exclusivo: al girar una se devuelven las demás a su anverso
        btns.forEach(function (b) {
          b.classList.remove('me-pulse');
          setFlip(b, b === btn && !flipped);
        });
        if (!flipped) {
          if (!seen[i]) { seen[i] = true; btn.classList.add('is-seen'); ctx.save({ seen: seen }); }
          revealItemAudio(ctx, audioEls[i]);
        }
      });
    });
    // Completada solo cuando se han girado TODAS las tarjetas.
    return { result: function () {
      return { completed: cards.every(function (_, i) { return !!seen[i]; }), scored: false };
    } };
  });

  // --- 6. Single choice / 7. True-false (comparten lógica) -------------------
  function choiceFactory(el, data, ctx) {
    // Opciones barajadas (determinista por id); Verdadero/Falso conserva su orden.
    var opts = data.type === 'true_false' ? (data.options || []) : shuffle(data.options || [], data.id);
    var name = 'opt-' + data.id;
    var maxAtt = attemptsOf(data); // 0 = ilimitados
    var html = header(data) + '<fieldset class="me-choices"><legend class="sr-only">' + esc(data.prompt) + '</legend>';
    opts.forEach(function (o) {
      html += '<label class="me-choice"><input type="radio" name="' + name + '" value="' + esc(o.id) + '"> <span>' + rich(o.text) + '</span></label>';
    });
    html += '</fieldset><button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);
    el.innerHTML = html;
    var attempts = 0, done = false, correct = false;
    var updateAttempts = attemptsHint(el, maxAtt);
    var refreshCheck = wireCheck(el, hasAnswer);
    el.querySelector('.me-choices').addEventListener('change', function () { if (!done) refreshCheck(true); });

    function lock() {
      el.querySelectorAll('input').forEach(function (i) { i.disabled = true; });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
    }

    // Marca visual (color + icono) de la opción elegida al comprobar.
    function markChoice(input, ok) {
      el.querySelectorAll('.me-choice').forEach(function (l) { l.classList.remove('is-right', 'is-wrong'); });
      var lbl = input && input.closest('.me-choice');
      if (lbl) { lbl.classList.add(ok ? 'is-right' : 'is-wrong'); replay(lbl); }
    }

    if (ctx.state && ctx.state.value) {
      var pre = el.querySelector('input[value="' + ctx.state.value + '"]');
      if (pre) pre.checked = true;
      attempts = ctx.state.attempts || 0;
      if (typeof ctx.state.correct === 'boolean') {
        correct = ctx.state.correct;
        showFeedback(el, correct, data);
        markChoice(pre, correct);
        if (correct || (maxAtt > 0 && attempts >= maxAtt)) { done = true; lock(); }
      }
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false); // respuesta restaurada sin resolver: activo sin pulso

    function hasAnswer() { return !!el.querySelector('input[name="' + name + '"]:checked'); }
    function check() {
      if (done) return { resolved: true, correct: correct };
      var sel = el.querySelector('input[name="' + name + '"]:checked');
      if (!sel) { ctx.announce('Selecciona una opción.'); return { resolved: false, correct: false }; }
      attempts++;
      var opt = opts.filter(function (o) { return o.id === sel.value; })[0];
      correct = !!(opt && opt.correct);
      showFeedbackModal(el, correct, data, el.querySelector('.me-check'));
      markChoice(sel, correct);
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      if (done) lock();
      updateAttempts(attempts, correct);
      ctx.save({ value: sel.value, correct: correct, attempts: attempts });
      ctx.announce(correct ? 'Respuesta correcta.' : (done ? 'Respuesta incorrecta. Sin más intentos.' : 'Respuesta incorrecta. Inténtalo de nuevo.'));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);

    return {
      result: function () {
        return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 };
      },
      check: check,
      hasAnswer: hasAnswer,
    };
  }
  register('single_choice', choiceFactory);
  register('true_false', choiceFactory);

  // --- 5. Sort steps (ordenar) ----------------------------------------------
  // Arrastrar y soltar (ratón) + botones ▲▼ y flechas de teclado (accesible).
  register('sort_steps', function (el, data, ctx) {
    var steps = (data.config.steps || []); // [{id, text, order}]
    var shown;
    if (ctx.state && ctx.state.order && ctx.state.order.length) {
      shown = orderByIds(steps, ctx.state.order);
    } else {
      shown = shuffle(steps, data.id);
      // Si el barajado deja por azar el orden correcto, rota uno: el ejercicio
      // nunca se sirve ya resuelto.
      var solved = steps.slice().sort(function (a, b) { return a.order - b.order; })
        .map(function (s) { return s.id; }).join('');
      if (steps.length > 1 && shown.map(function (s) { return s.id; }).join('') === solved) {
        shown = shown.slice(1).concat([shown[0]]);
      }
    }
    // Instrucción según el puntero principal: en táctil el arrastre nativo no es
    // fiable (el dedo hace scroll), así que ahí no se promete y se guía a ▲ ▼.
    var coarse = isCoarse();
    var html = header(data) +
      '<p class="me-sort-hint">' + (coarse
        ? 'Toca las flechas ▲ ▼ de cada paso para subirlo o bajarlo hasta su posición.'
        : 'Arrastra los pasos para ordenarlos o usa los botones ▲ ▼.') +
      '<span class="sr-only"> Con teclado: enfoca un paso y usa las flechas arriba y abajo.</span></p>' +
      '<ol class="me-sort' + (coarse ? ' is-touch' : '') + '" aria-label="Lista ordenable">';
    shown.forEach(function (s) {
      var plain = esc(stripTags(s.text));
      html += '<li class="me-sort-item" data-id="' + esc(s.id) + '" draggable="' + (coarse ? 'false' : 'true') + '" tabindex="0" aria-roledescription="elemento reordenable">' +
        '<span class="me-sort-grip" aria-hidden="true">⋮⋮</span>' +
        '<span class="me-sort-pos"><span class="sr-only">Posición </span><span class="me-sort-num"></span><span class="sr-only">.</span></span>' +
        ' <span class="me-sort-text">' + rich(s.text) + '</span>' +
        ' <span class="me-sort-ctrl"><button type="button" class="me-up" aria-label="Subir «' + plain + '»">▲</button>' +
        '<button type="button" class="me-down" aria-label="Bajar «' + plain + '»">▼</button></span></li>';
    });
    el.innerHTML = html + '</ol><p class="me-sort-tally" aria-live="polite" hidden></p>' +
      '<button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);
    var list = el.querySelector('.me-sort');
    var tally = el.querySelector('.me-sort-tally');
    var attempts = (ctx.state && ctx.state.attempts) || 0;
    var maxAtt = attemptsOf(data);
    var updateAttempts = attemptsHint(el, maxAtt);
    // Aquí «responder» es reordenar: el botón se activa al primer movimiento
    var refreshCheck = wireCheck(el, function () { return true; });

    function expectedIds() {
      return steps.slice().sort(function (a, b) { return a.order - b.order; }).map(function (s) { return s.id; });
    }
    function currentIds() {
      return [].slice.call(list.children).map(function (li) { return li.getAttribute('data-id'); });
    }
    // Número de posición visible y ▲ ▼ desactivados en los extremos (sin efecto ahí).
    function renumber() {
      var items = [].slice.call(list.children);
      items.forEach(function (li, i) {
        li.querySelector('.me-sort-num').textContent = String(i + 1);
        if (!done) {
          li.querySelector('.me-up').disabled = i === 0;
          li.querySelector('.me-down').disabled = i === items.length - 1;
        }
      });
    }
    function textOf(li) { var t = li.querySelector('.me-sort-text'); return t ? t.textContent : ''; }
    // Resalta brevemente el paso recién movido para no perderlo de vista.
    function flash(li) {
      li.classList.remove('is-moved'); void li.offsetWidth; li.classList.add('is-moved');
      clearTimeout(li._meMoved);
      li._meMoved = setTimeout(function () { li.classList.remove('is-moved'); }, 900);
    }
    function move(li, dir) {
      if (done) return false;
      var moved = false;
      if (dir < 0 && li.previousElementSibling) { list.insertBefore(li, li.previousElementSibling); moved = true; }
      else if (dir > 0 && li.nextElementSibling) { list.insertBefore(li.nextElementSibling, li); moved = true; }
      if (!moved) return false;
      renumber(); flash(li);
      tally.hidden = true; // la cuenta de la última comprobación ya no vale
      refreshCheck(true);
      var pos = [].indexOf.call(list.children, li) + 1;
      ctx.announce('«' + textOf(li) + '» ahora en la posición ' + pos + ' de ' + list.children.length + '.');
      return true;
    }

    // Botones ▲▼: el foco se queda en el botón pulsado (o pasa al otro si llegó al extremo).
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('.me-up, .me-down'); if (!btn) return;
      var li = btn.closest('.me-sort-item'); if (!li) return;
      var up = btn.classList.contains('me-up');
      move(li, up ? -1 : 1);
      var target = btn.disabled ? li.querySelector(up ? '.me-down' : '.me-up') : btn;
      if (target && !target.disabled) target.focus();
    });

    // Teclado: flechas arriba/abajo reordenan el elemento enfocado
    list.addEventListener('keydown', function (e) {
      var li = e.target.closest('.me-sort-item'); if (!li) return;
      if (e.key === 'ArrowUp') { e.preventDefault(); move(li, -1); li.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(li, 1); li.focus(); }
    });

    // Drag & drop nativo (ratón)
    function afterElement(y) {
      var items = [].slice.call(list.querySelectorAll('.me-sort-item:not(.is-dragging)'));
      var closest = { offset: -Infinity, el: null };
      items.forEach(function (child) {
        var box = child.getBoundingClientRect();
        var offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) closest = { offset: offset, el: child };
      });
      return closest.el;
    }
    list.addEventListener('dragstart', function (e) {
      var li = e.target.closest('.me-sort-item'); if (!li) return;
      li.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', li.getAttribute('data-id')); } catch (err) {}
    });
    list.addEventListener('dragend', function (e) {
      var li = e.target.closest('.me-sort-item'); if (li) li.classList.remove('is-dragging');
      if (!done) refreshCheck(true);
    });
    list.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var dragging = list.querySelector('.is-dragging'); if (!dragging) return;
      var after = afterElement(e.clientY);
      if (after == null) list.appendChild(dragging);
      else list.insertBefore(dragging, after);
      renumber();
    });
    list.addEventListener('drop', function (e) { e.preventDefault(); tally.hidden = true; });

    var correct = false, done = false;
    function lockSort() {
      list.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      list.querySelectorAll('.me-sort-item').forEach(function (li) { li.setAttribute('draggable', 'false'); });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
      markSorted();
    }
    // Ya resuelta (acierto o intentos agotados, nunca antes: desvelaría el
    // orden): cada paso queda ✔/✖ y el mal colocado dice dónde lo puso el
    // alumno y dónde va, más la explicación del paso si el autor la escribió.
    function markSorted() {
      var expected = expectedIds();
      [].slice.call(list.children).forEach(function (li, i) {
        var id = li.getAttribute('data-id');
        var want = expected.indexOf(id);
        var ok = want === i;
        var step = steps.filter(function (s) { return s.id === id; })[0] || {};
        li.classList.remove('is-right', 'is-wrong');
        li.classList.add(ok ? 'is-right' : 'is-wrong');
        var old = li.querySelector('.me-sort-why'); if (old) old.remove();
        var why = (ok ? '' : 'Lo pusiste en la posición ' + (i + 1) + '; va en la ' + (want + 1) + '. ') +
          (step.explanation ? rich(step.explanation) : '');
        if (why) {
          var p = el.ownerDocument.createElement('p');
          p.className = 'me-sort-why';
          p.innerHTML = why;
          li.appendChild(p);
        }
      });
    }
    // Tras fallar: cuántos pasos están ya en su sitio, sin decir cuáles (marcarlos
    // desvelaría el orden mientras queden intentos). Devuelve el texto mostrado.
    function showTally() {
      var exp = expectedIds();
      var ok = currentIds().filter(function (id, i) { return exp[i] === id; }).length;
      var n = exp.length;
      tally.textContent = ok + ' de ' + n + (n === 1 ? ' paso está' : ' pasos están') + ' en su sitio.';
      tally.hidden = false;
      return tally.textContent;
    }
    renumber();
    if (ctx.state && typeof ctx.state.correct === 'boolean') {
      correct = ctx.state.correct; showFeedback(el, correct, data);
      if (correct || (maxAtt > 0 && attempts >= maxAtt)) { done = true; lockSort(); }
      // El orden restaurado es el de la última comprobación (ctx.save solo en check).
      if (!correct) showTally();
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false); // orden restaurado sin resolver: activo sin pulso
    function check() {
      if (done) return { resolved: true, correct: correct };
      var order = currentIds();
      var expected = expectedIds();
      correct = JSON.stringify(order) === JSON.stringify(expected);
      attempts++;
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      showFeedbackModal(el, correct, data, el.querySelector('.me-check'));
      updateAttempts(attempts, correct);
      ctx.save({ order: order, correct: correct, attempts: attempts });
      if (done) lockSort();
      var tallyMsg = correct ? '' : ' ' + showTally();
      if (correct) tally.hidden = true;
      ctx.announce(correct ? 'Orden correcto.' : (done ? 'Orden incorrecto.' + tallyMsg + ' Sin más intentos.' : 'Orden incorrecto.' + tallyMsg + ' Inténtalo de nuevo.'));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);
    return {
      result: function () { return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 }; },
      check: check,
      hasAnswer: function () { return true; },
    };
  });

  // --- 4. Match pairs / 8. Classification -> arrastrar a categorías ----------
  // Tocar y colocar (táctil, teclado y ratón) + DnD nativo con ratón.
  function dragAssignFactory(el, data, ctx) {
    var groups = data.config.groups || [];   // [{id, label}]
    var opts = shuffle(data.options || [], data.id); // [{id, text, group}], pool barajado
    var assign = {};                          // itemId -> groupId ('' = sin asignar)
    if (ctx.state && ctx.state.answers) assign = Object.assign({}, ctx.state.answers);
    // En táctil no se ofrece el arrastre nativo (no es fiable y choca con el scroll).
    var coarse = isCoarse();
    var isMatch = data.type === 'match_pairs';
    var uid = 'me-dnd-' + String(data.id || '').replace(/[^A-Za-z0-9_-]/g, '_');

    function chipHtml(o) {
      return '<div class="me-chip" role="button" draggable="' + (coarse ? 'false' : 'true') + '" tabindex="0" aria-pressed="false" data-id="' + esc(o.id) + '">' +
        '<span class="me-chip-text">' + rich(o.text) + '</span></div>';
    }
    // Cada zona es un grupo (no un botón: dentro hay chips, que sí lo son) con su
    // botón real «Colocar aquí», visible solo mientras hay una pieza seleccionada.
    function zoneHtml(cls, zoneId, idx, titleHtml, dropLabel, dropText) {
      var tid = uid + '-t' + idx;
      return '<div class="' + cls + ' me-dnd-zone" data-zone="' + esc(zoneId) + '" role="group" aria-labelledby="' + tid + '">' +
        '<p class="me-dnd-title" id="' + tid + '">' + titleHtml + '</p>' +
        '<div class="me-dnd-list" data-zone-list="' + esc(zoneId) + '"></div>' +
        '<button type="button" class="me-dnd-drop" aria-label="' + dropLabel + '">' + dropText + '</button></div>';
    }

    var hint = coarse
      ? (isMatch ? 'Toca un elemento y después toca la casilla con la que se relaciona.'
                 : 'Toca un elemento y después toca la categoría donde va.')
      : (isMatch ? 'Arrastra cada elemento a la casilla con la que se relaciona, o haz clic en él y después en la casilla.'
                 : 'Arrastra cada elemento a su categoría, o haz clic en él y después en la categoría.');
    var html = header(data) +
      '<p class="me-sort-hint">' + hint +
      '<span class="sr-only"> Con teclado: Intro para seleccionar un elemento y después el botón «Colocar aquí» de su destino.</span></p>' +
      '<div class="me-dnd' + (coarse ? ' is-touch' : '') + '">' +
      zoneHtml('me-dnd-pool', '', 0, 'Sin asignar', 'Devolver a «Sin asignar»', 'Devolver aquí') +
      '<div class="me-dnd-groups">';
    groups.forEach(function (g, i) {
      html += zoneHtml('me-dnd-group', g.id, i + 1, rich(g.label), 'Colocar en «' + esc(stripTags(g.label)) + '»', 'Colocar aquí');
    });
    html += '</div></div>' +
      '<div class="me-dnd-bar" hidden><span class="me-dnd-bar-text"></span>' +
      '<button type="button" class="me-dnd-cancel">Cancelar</button></div>' +
      '<button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);
    el.innerHTML = html;
    var dnd = el.querySelector('.me-dnd');
    var bar = el.querySelector('.me-dnd-bar');
    var attempts = (ctx.state && ctx.state.attempts) || 0;
    var maxAtt = attemptsOf(data);
    var updateAttempts = attemptsHint(el, maxAtt);
    // config.force_complete: ausente o true (proyectos antiguos) → Comprobar solo
    // se activa con TODO colocado; false → basta con haber colocado algo (lo que
    // falte cuenta como fallo al comprobar). Sigue siendo necesario pulsar Comprobar.
    var force = (data.config || {}).force_complete !== false;
    var ready = function () { return force ? allAssigned() : anyAssigned(); };
    var refreshCheck = wireCheck(el, ready);

    // Construye los chips y los coloca en su zona inicial
    var chips = {};
    opts.forEach(function (o) {
      var tmp = document.createElement('div');
      tmp.innerHTML = chipHtml(o);
      chips[o.id] = tmp.firstChild;
    });
    function listFor(zone) { return el.querySelector('[data-zone-list="' + (zone || '') + '"]'); }
    // Al mover una pieza se borra su marca de la última comprobación (el resto la conserva).
    function place(id) {
      chips[id].classList.remove('is-right', 'is-wrong');
      (listFor(assign[id] || '') || listFor('')).appendChild(chips[id]);
    }
    // Tras Comprobar: cada pieza en su categoría → verde ✔; en otra o sin colocar → rojo ✖.
    function markChips() {
      opts.forEach(function (o) {
        var ok = !!assign[o.id] && assign[o.id] === o.group;
        chips[o.id].classList.toggle('is-right', ok);
        chips[o.id].classList.toggle('is-wrong', !ok);
      });
    }
    opts.forEach(function (o) { place(o.id); });

    // Tocar y colocar (táctil / teclado / ratón): se selecciona un chip y luego
    // se toca la zona destino. Enter/Espacio equivalen al toque.
    var pickedId = null, locked = false;
    function chipText(id) { var t = chips[id] && chips[id].querySelector('.me-chip-text'); return t ? t.textContent : ''; }
    // Selección visible: la pieza resaltada, las zonas destino destacadas con su
    // botón «Colocar aquí» (la zona donde ya está, no) y una barra con Cancelar.
    function setPicked(id) {
      if (pickedId && chips[pickedId]) {
        chips[pickedId].classList.remove('is-picked');
        chips[pickedId].setAttribute('aria-pressed', 'false');
      }
      pickedId = id;
      if (id) {
        chips[id].classList.add('is-picked');
        chips[id].setAttribute('aria-pressed', 'true');
      }
      dnd.classList.toggle('is-picking', !!id);
      var here = id ? (assign[id] || '') : null;
      el.querySelectorAll('.me-dnd-zone').forEach(function (z) {
        z.classList.toggle('is-current', id != null && z.getAttribute('data-zone') === here);
      });
      bar.hidden = !id;
      if (id) bar.querySelector('.me-dnd-bar-text').textContent = 'Seleccionado: «' + chipText(id) + '». ' +
        (isMatch ? 'Toca la casilla con la que se relaciona.' : 'Toca la categoría donde va.');
    }
    // Coloca el chip seleccionado en `zone` (misma lógica para tocar la zona o
    // una pieza que ya está dentro de ella).
    function dropPicked(zone) {
      var picked = pickedId;
      assign[picked] = zone.getAttribute('data-zone');
      setPicked(null); place(picked); chips[picked].focus();
      refreshCheck(true);
      var title = zone.querySelector('.me-dnd-title');
      ctx.announce('Colocado en «' + (title ? title.textContent : 'Sin asignar') + '».');
    }
    el.addEventListener('click', function (e) {
      if (locked) return;
      var chip = e.target.closest('.me-chip');
      if (chip) {
        var id = chip.getAttribute('data-id');
        // Con una pieza ya seleccionada, tocar OTRA pieza que está en una categoría
        // distinta de la de la seleccionada equivale a tocar esa categoría: si no, al
        // tocar una zona por el centro (donde suele haber una pieza) no se podía soltar.
        if (pickedId && pickedId !== id) {
          var chipZone = chip.closest('.me-dnd-zone');
          if (chipZone && chipZone.getAttribute('data-zone') !== (assign[pickedId] || '')) {
            dropPicked(chipZone);
            return;
          }
        }
        setPicked(pickedId === id ? null : id);
        if (pickedId) ctx.announce('«' + chipText(pickedId) + '» seleccionado. Elige dónde colocarlo con «Colocar aquí».');
        return;
      }
      if (e.target.closest('.me-dnd-cancel')) { cancelPick(); return; }
      var zone = e.target.closest('.me-dnd-zone');
      if (zone && pickedId) dropPicked(zone);
    });
    function cancelPick() {
      var id = pickedId; if (!id) return;
      setPicked(null); chips[id].focus();
      ctx.announce('Selección cancelada.');
    }
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pickedId) { e.preventDefault(); cancelPick(); return; }
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target.closest('.me-chip'); if (!t) return; // los <button> ya responden solos
      e.preventDefault(); t.click();
    });

    // Drag & drop (ratón)
    var draggingId = null;
    el.addEventListener('dragstart', function (e) {
      var chip = e.target.closest('.me-chip'); if (!chip) return;
      draggingId = chip.getAttribute('data-id');
      chip.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', draggingId); } catch (err) {}
    });
    el.addEventListener('dragend', function (e) {
      var chip = e.target.closest('.me-chip'); if (chip) chip.classList.remove('is-dragging');
      el.querySelectorAll('.me-dnd-zone').forEach(function (z) { z.classList.remove('is-over'); });
    });
    el.querySelectorAll('.me-dnd-zone').forEach(function (zone) {
      zone.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; zone.classList.add('is-over'); });
      zone.addEventListener('dragleave', function () { zone.classList.remove('is-over'); });
      zone.addEventListener('drop', function (e) {
        e.preventDefault(); zone.classList.remove('is-over');
        if (draggingId == null) return;
        assign[draggingId] = zone.getAttribute('data-zone');
        setPicked(null); place(draggingId); draggingId = null;
        refreshCheck(true);
      });
    });

    var correct = false, done = false;
    function lockAssign() {
      locked = true; setPicked(null);
      el.querySelectorAll('.me-chip').forEach(function (c) {
        c.setAttribute('draggable', 'false'); c.removeAttribute('role');
        c.removeAttribute('aria-pressed'); c.tabIndex = -1;
      });
      el.querySelectorAll('.me-dnd-drop').forEach(function (b) { b.disabled = true; });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
    }
    if (ctx.state && typeof ctx.state.correct === 'boolean') {
      correct = ctx.state.correct; showFeedback(el, correct, data);
      markChips(); // la asignación guardada es la de la última comprobación
      if (correct || (maxAtt > 0 && attempts >= maxAtt)) { done = true; lockAssign(); }
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false); // asignación restaurada sin resolver: activo sin pulso
    function allAssigned() { return opts.every(function (o) { return !!assign[o.id]; }); }
    function anyAssigned() { return opts.some(function (o) { return !!assign[o.id]; }); }
    function check() {
      if (done) return { resolved: true, correct: correct };
      var all = true;
      opts.forEach(function (o) { if (!assign[o.id] || assign[o.id] !== o.group) all = false; });
      correct = all; attempts++;
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      showFeedbackModal(el, correct, data, el.querySelector('.me-check'));
      markChips();
      updateAttempts(attempts, correct);
      ctx.save({ answers: assign, correct: correct, attempts: attempts });
      if (done) lockAssign();
      var nOk = opts.filter(function (o) { return !!assign[o.id] && assign[o.id] === o.group; }).length;
      ctx.announce(correct ? 'Clasificación correcta.' : (nOk + ' de ' + opts.length + ' elementos bien colocados.' + (done ? ' Sin más intentos.' : ' Revisa los marcados en rojo e inténtalo de nuevo.')));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);
    return {
      result: function () { return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 }; },
      check: check,
      hasAnswer: ready,
    };
  }
  register('match_pairs', dragAssignFactory);
  register('classification', dragAssignFactory);

  // --- 9. Scenario decision --------------------------------------------------
  register('scenario_decision', function (el, data, ctx) {
    // config.scenario (texto), options con correct + feedback por opción
    var html = header(data);
    if (data.config.scenario) html += '<div class="me-scenario">' + rich(data.config.scenario) + '</div>';
    html += '<div class="me-choices">';
    shuffle(data.options || [], data.id).forEach(function (o) {
      html += '<button class="me-btn me-option" data-id="' + esc(o.id) + '">' + rich(o.text) + '</button>';
    });
    el.innerHTML = html + '</div>' + feedbackBox(data);
    var correct = false, done = false;
    function markOption(id, ok) {
      el.querySelectorAll('.me-option').forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); });
      var btn = el.querySelector('.me-option[data-id="' + id + '"]');
      if (btn) btn.classList.add(ok ? 'is-right' : 'is-wrong');
    }
    el.querySelectorAll('.me-option').forEach(function (b) {
      b.addEventListener('click', function () {
        var o = (data.options || []).filter(function (x) { return x.id === b.dataset.id; })[0];
        correct = !!o.correct; done = true;
        markOption(o.id, correct);
        showFeedbackModal(el, correct, { feedback: { correct: o.feedback || data.feedback.correct, incorrect: o.feedback || data.feedback.incorrect, explanation: data.feedback.explanation } }, b);
        ctx.save({ choice: o.id, correct: correct });
        ctx.announce(correct ? 'Decisión correcta.' : 'Decisión mejorable.');
      });
    });
    if (ctx.state && ctx.state.choice) {
      var so = (data.options || []).filter(function (x) { return x.id === ctx.state.choice; })[0];
      if (so) {
        correct = !!so.correct; done = true;
        markOption(so.id, correct);
        var sb = el.querySelector('.me-feedback');
        sb.className = 'me-feedback ' + (correct ? 'is-ok' : 'is-error');
        sb.innerHTML = '<strong>' + (correct ? '✔ ' : '✖ ') + rich(so.feedback || (correct ? data.feedback.correct : data.feedback.incorrect)) + '</strong>' +
          (data.feedback.explanation ? '<p class="me-expl">' + rich(data.feedback.explanation) + '</p>' : '');
        sb.hidden = false;
      }
    }
    return { result: function () { return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 }; } };
  });

  // Resumen al terminar una práctica de varios pasos: «X/N», anillo con el
  // porcentaje (conic-gradient sobre --pct) y un mensaje según el acierto.
  function summaryCard(ok, total) {
    var pct = Math.round(ok / Math.max(1, total) * 100);
    var msg = pct === 100 ? '¡Perfecto!' : pct >= 70 ? 'Muy bien' : pct >= 50 ? 'Vas bien: repasa los comentarios de los fallos'
      : 'Repasa los comentarios de cada paso';
    return '<div class="me-summary" role="status">' +
      '<div class="me-summary-ring" style="--pct:' + pct + '"><strong>' + ok + '/' + total + '</strong></div>' +
      '<div><p class="me-summary-msg">' + msg + '</p><p class="me-summary-sub">' + pct + ' % de aciertos</p></div></div>';
  }

  // --- Caso por decisiones (scenario_steps) ----------------------------------
  // Un caso que avanza decisión a decisión: cada paso muestra su situación y
  // sus opciones (barajadas, deterministas por id); al elegir se marca la
  // opción y sale su comentario en línea, y «Siguiente decisión» avanza. Una
  // respuesta por paso (la primera cuenta, sin `attempts`). Al terminar,
  // resumen de aciertos. Crédito parcial: score = points × aciertos/pasos.
  // Estado { picks: [id de opción | null, por paso en orden de autor], idx
  // (paso a la vista; == nº de pasos = resumen), done }. `done` se conserva al
  // «Repetir» (solo sin nota) para no volver a bloquear la navegación.
  register('scenario_steps', function (el, data, ctx) {
    var cfg = data.config || {};
    var steps = (cfg.steps || []).filter(function (s) { return s && (s.options || []).length; });
    var n = steps.length;
    var st = ctx.state || {};
    function optOf(step, id) { return (step.options || []).filter(function (o) { return o.id === id; })[0] || null; }
    var picks = steps.map(function (s, i) { var id = st.picks && st.picks[i]; return id && optOf(s, id) ? id : null; });
    var idx = Math.max(0, Math.min(typeof st.idx === 'number' ? st.idx : 0, n));
    var done = !!st.done || (n > 0 && picks.every(Boolean));
    function hits() { return picks.filter(function (id, i) { var o = id && optOf(steps[i], id); return !!(o && o.correct); }).length; }
    function save() { ctx.save({ picks: picks.slice(), idx: idx, done: done }); }

    function paint() {
      var html = header(data);
      if (cfg.scenario) html += '<div class="me-scenario">' + rich(cfg.scenario) + '</div>';
      if (!n) { el.innerHTML = html; return; }
      html += '<div class="me-steps" role="group" aria-label="Decisiones del caso">' +
        '<ol class="me-steps-dots" aria-hidden="true">';
      steps.forEach(function (s, i) {
        var o = picks[i] && optOf(s, picks[i]);
        html += '<li class="' + (o ? (o.correct ? 'is-ok' : 'is-bad') : '') + (i === idx ? ' is-current' : '') + '"></li>';
      });
      html += '</ol>';
      if (idx >= n) {
        html += summaryCard(hits(), n);
        if (!data.scored) html += '<button type="button" class="me-btn me-steps-restart">↺ Repetir el caso</button>';
      } else {
        var step = steps[idx];
        var picked = picks[idx] && optOf(step, picks[idx]);
        html += '<div class="me-step">' +
          '<p class="me-step-count">Decisión ' + (idx + 1) + ' de ' + n + '</p>' +
          '<div class="me-step-text">' + block(step.text) + '</div><div class="me-choices">';
        shuffle(step.options, data.id + ':' + (step.id || idx)).forEach(function (o) {
          var mark = picked ? (o.id === picked.id ? (o.correct ? ' is-right' : ' is-wrong') : '') : '';
          html += '<button type="button" class="me-btn me-option' + mark + '" data-id="' + esc(o.id) + '"' + (picked ? ' disabled' : '') + '>' + rich(o.text) + '</button>';
        });
        html += '</div>';
        if (picked) {
          var fb = picked.feedback || (picked.correct ? data.feedback.correct : data.feedback.incorrect);
          html += '<div class="me-feedback ' + (picked.correct ? 'is-ok' : 'is-error') + '" role="status">' +
            '<strong>' + (picked.correct ? '✔ ' : '✖ ') + rich(fb) + '</strong></div>' +
            '<button type="button" class="me-btn me-primary me-steps-next">' + (idx === n - 1 ? 'Ver el resumen' : 'Siguiente decisión') + ' →</button>';
        }
        html += '</div>';
      }
      el.innerHTML = html + '</div>';
    }

    el.addEventListener('click', function (e) {
      var opt = e.target.closest('.me-option');
      if (opt && el.contains(opt) && idx < n && !picks[idx]) {
        picks[idx] = opt.getAttribute('data-id');
        if (picks.every(Boolean)) done = true;
        var o = optOf(steps[idx], picks[idx]);
        paint();
        save();
        ctx.announce(o && o.correct ? 'Decisión correcta.' : 'Decisión mejorable.');
        var next = el.querySelector('.me-steps-next'); if (next) next.focus();
        return;
      }
      if (e.target.closest('.me-steps-next')) {
        idx++;
        paint();
        save();
        var first = el.querySelector('.me-option:not([disabled])') || el.querySelector('.me-summary');
        if (first && first.focus) first.focus();
        if (idx >= n) ctx.announce('Caso terminado: ' + hits() + ' de ' + n + ' decisiones acertadas.');
        return;
      }
      if (e.target.closest('.me-steps-restart')) {
        picks = steps.map(function () { return null; });
        idx = 0;
        paint();
        save();
      }
    });
    paint();

    return {
      result: function () {
        var pts = data.points || 1;
        if (!n) return { completed: true, scored: false, correct: false, score: 0, maxScore: pts };
        var ok = hits();
        return { completed: done, scored: !!data.scored, correct: done && ok === n, score: done ? pts * ok / n : 0, maxScore: pts };
      },
    };
  });

  // --- Conversación ramificada (decision_tree) -------------------------------
  // Diálogo tipo chat: cada nodo es lo que dice un personaje (`speaker`, id de
  // `config.characters`) y sus respuestas (`choices`, cada una `to` otro nodo).
  // Un nodo sin respuestas válidas es un FINAL con `outcome` good/bad/neutral y
  // un comentario (`feedback`). Empieza en el primer nodo. Antes de llegar a un
  // final se puede deshacer la última respuesta; al llegar, «Volver a empezar»
  // permite explorar otros caminos, pero la nota la fija el PRIMER final
  // alcanzado (`first`), como un intento único. Estado { path: [índice de
  // respuesta en cada nodo recorrido], first: 'good'|'bad'|'neutral'|null }.
  // El grafo no admite ciclos (validador DT_CYCLE); aun así, el recorrido se
  // corta a nº de nodos pasos para no colgarse con un proyecto mal formado.
  register('decision_tree', function (el, data, ctx) {
    var cfg = data.config || {};
    var nodes = cfg.nodes || [];
    var byId = {};
    nodes.forEach(function (nd) { if (nd && nd.id) byId[nd.id] = nd; });
    var chars = {};
    (cfg.characters || []).forEach(function (c) { if (c && c.id) chars[c.id] = c; });
    function choicesOf(nd) { return (nd.choices || []).filter(function (c) { return c && byId[c.to]; }); }
    var start = nodes[0] || null;
    var st = ctx.state || {};
    var first = st.first === 'good' || st.first === 'bad' || st.first === 'neutral' ? st.first : null;
    var path = [];
    (function replayPath() {
      var cur = start;
      (st.path || []).some(function (k) {
        var ch = cur && choicesOf(cur)[k];
        if (!ch || path.length >= nodes.length) return true;
        path.push(k);
        cur = byId[ch.to];
        return false;
      });
    })();
    // Nodos recorridos según `path` (el último es el actual).
    function trail() {
      var out = [start], cur = start;
      path.forEach(function (k) { cur = byId[choicesOf(cur)[k].to]; out.push(cur); });
      return out;
    }
    var OUTCOME = {
      good: { cls: 'is-good', icon: '✔', label: 'Buen final' },
      bad: { cls: 'is-bad', icon: '✖', label: 'Final mejorable' },
      neutral: { cls: 'is-neutral', icon: '●', label: 'Fin de la conversación' },
    };
    function outcomeOf(nd) { return OUTCOME[nd.outcome] ? nd.outcome : 'neutral'; }
    // Aspecto de app de mensajería (genérico, sin marcas): cabecera con avatar,
    // burbujas con colita (personaje a la izquierda en blanco, alumno a la
    // derecha en verde con ✓✓), narración y finales como avisos centrados, y
    // las respuestas como sugerencias en la zona del teclado. Con un solo
    // personaje es un chat individual; con varios, un grupo que pone el nombre
    // (en su color) encima de cada burbuja.
    var people = (cfg.characters || []).filter(function (c) { return c && c.id; });
    var group = people.length > 1;
    var AV_COLORS = ['#00897b', '#5e35b1', '#d81b60', '#f4511e', '#3949ab', '#7cb342'];
    function colorOf(id) {
      var k = people.map(function (c) { return c.id; }).indexOf(id);
      return AV_COLORS[(k < 0 ? 0 : k) % AV_COLORS.length];
    }
    function initials(name) {
      var w = String(name || '').trim().split(/\s+/).filter(Boolean);
      return w.length ? (w[0].charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : '')).toUpperCase() : '?';
    }
    function topBar() {
      var main = people[0];
      var title = group ? 'Conversación' : (main && main.name ? main.name : 'Conversación');
      var sub = group ? people.map(function (c) { return c.name; }).concat(['tú']).join(', ')
        : (main && main.role ? main.role : 'en línea');
      var avatar = group ? '<span class="me-dt-avatar is-group" aria-hidden="true">' + (people.length + 1) + '</span>'
        : '<span class="me-dt-avatar" style="--av:' + colorOf(main ? main.id : '') + '" aria-hidden="true">' + esc(initials(main ? main.name : '')) + '</span>';
      return '<div class="me-dt-bar">' + avatar + '<div class="me-dt-bar-txt"><strong>' + esc(title) +
        '</strong><small>' + esc(sub) + '</small></div></div>';
    }
    function bubble(nd) {
      if (!String(nd.text || '').trim()) return '';
      var who = chars[nd.speaker];
      if (!who) return '<li class="me-dt-sys">' + block(nd.text) + '</li>'; // narración
      return '<li class="me-dt-msg">' +
        (group ? '<span class="me-dt-who" style="color:' + colorOf(who.id) + '">' + esc(who.name || '') +
          (who.role ? ' <small>· ' + esc(who.role) + '</small>' : '') + '</span>'
          : '<span class="sr-only">' + esc(who.name || '') + ': </span>') +
        '<div class="me-dt-text">' + block(nd.text) + '</div></li>';
    }
    function myBubble(text) {
      return '<li class="me-dt-msg is-me"><span class="sr-only">Tú: </span><div class="me-dt-text">' + rich(text) +
        '<span class="me-dt-ticks" aria-hidden="true">✓✓</span></div></li>';
    }
    // «Escribiendo…» entre la respuesta del alumno y la del personaje: solo al
    // responder (nunca al restaurar ni con las animaciones desactivadas).
    var typing = false;
    function motionOff() {
      var doc = el.ownerDocument, win = doc.defaultView;
      return (doc.body && doc.body.classList.contains('me-motion-none')) ||
        !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function paint() {
      var html = header(data);
      if (!start) { el.innerHTML = html; return; }
      var t = trail();
      var cur = t[t.length - 1];
      var atEnd = !choicesOf(cur).length;
      html += '<div class="me-dt-phone">' + topBar() + '<ol class="me-dt-chat" aria-live="polite">';
      t.forEach(function (nd, i) {
        if (typing && i === t.length - 1) return; // aún «escribiendo»
        html += bubble(nd);
        if (i < path.length) html += myBubble(choicesOf(nd)[path[i]].text);
      });
      if (typing) {
        var whoT = chars[cur.speaker];
        html += '<li class="me-dt-msg me-dt-typing" aria-label="' + esc((whoT && whoT.name) || 'El personaje') + ' está escribiendo">' +
          '<span></span><span></span><span></span></li>';
      } else if (atEnd) {
        var oc = OUTCOME[outcomeOf(cur)];
        html += '<li class="me-dt-end ' + oc.cls + '" role="status"><strong>' + oc.icon + ' ' + oc.label + '</strong>' +
          (cur.feedback ? '<div class="me-dt-text">' + block(cur.feedback) + '</div>' : '') + '</li>';
      }
      html += '</ol><div class="me-dt-reply">';
      if (typing) {
        html += '<p class="me-dt-reply-label">…</p>';
      } else if (!atEnd) {
        html += '<p class="me-dt-reply-label" id="dt-q-' + esc(data.id) + '">Elige tu respuesta</p>' +
          '<div class="me-dt-choices" role="group" aria-labelledby="dt-q-' + esc(data.id) + '">';
        choicesOf(cur).forEach(function (ch, k) {
          html += '<button type="button" class="me-dt-choice" data-k="' + k + '">' + rich(ch.text) +
            '<span class="me-dt-send" aria-hidden="true">➤</span></button>';
        });
        html += '</div>';
      } else {
        html += '<button type="button" class="me-btn me-dt-restart">↺ Volver a empezar</button>';
      }
      html += '</div></div><div class="me-dt-foot">' +
        (!typing && !atEnd && path.length ? '<button type="button" class="me-btn me-dt-undo">↶ Deshacer la última respuesta</button>' : '') +
        (atEnd && !typing && first && t.length > 1 && data.scored ? '<span class="me-dt-note">Cuenta el primer final al que llegaste.</span>' : '') +
        '</div>';
      el.innerHTML = html;
      var chat = el.querySelector('.me-dt-chat');
      chat.scrollTop = chat.scrollHeight; // como en una app de chat: lo último, abajo
    }

    function afterReply() {
      var t = trail(), cur = t[t.length - 1];
      if (!choicesOf(cur).length) ctx.announce(OUTCOME[outcomeOf(cur)].label + '.');
      var nextBtn = el.querySelector('.me-dt-choice') || el.querySelector('.me-dt-restart');
      if (nextBtn) nextBtn.focus({ preventScroll: true });
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.me-dt-choice');
      if (b && el.contains(b) && !typing) {
        path.push(+b.getAttribute('data-k'));
        var t = trail(), cur = t[t.length - 1];
        if (!choicesOf(cur).length && !first) first = outcomeOf(cur);
        ctx.save({ path: path.slice(), first: first });
        // Solo «escribe» un personaje que va a decir algo.
        typing = !motionOff() && !!chars[cur.speaker] && !!String(cur.text || '').trim();
        paint();
        if (typing) setTimeout(function () { typing = false; paint(); afterReply(); }, 900);
        else afterReply();
        return;
      }
      if (e.target.closest('.me-dt-undo')) {
        path.pop();
        paint();
        ctx.save({ path: path.slice(), first: first });
        var c0 = el.querySelector('.me-dt-choice'); if (c0) c0.focus();
        return;
      }
      if (e.target.closest('.me-dt-restart')) {
        path = [];
        paint();
        ctx.save({ path: [], first: first });
        var c1 = el.querySelector('.me-dt-choice'); if (c1) c1.focus();
      }
    });
    paint();

    return {
      result: function () {
        var pts = data.points || 1;
        if (!start) return { completed: true, scored: false, correct: false, score: 0, maxScore: pts };
        return { completed: !!first, scored: !!data.scored, correct: first === 'good', score: first === 'good' ? pts : 0, maxScore: pts };
      },
    };
  });

  // --- Fórmulas del reto numérico --------------------------------------------
  // Evaluador SEGURO (descenso recursivo, sin eval/Function): + - * / ^,
  // paréntesis, números con punto decimal, identificadores (variables y
  // resultados anteriores) y funciones round(x[, decimales]) min max abs sqrt
  // floor ceil. Lanza Error ante una fórmula mal escrita, un valor que falta o
  // un resultado no finito (división por cero). Duplicado a propósito en
  // src/calc/formula.ts (el runtime no comparte módulos con el editor): si
  // cambia la gramática, cambiar los tres (y la copia en Python de
  // validate_course, docs/gpt/contrato-course-json.md §11).
  var CALC_FN = {
    round: function (x, d) { var f = Math.pow(10, d || 0); return Math.round(x * f) / f; },
    min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
  };
  function evalFormula(src, vars) {
    var s = String(src == null ? '' : src), i = 0;
    function fail(msg) { throw new Error(msg); }
    function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
    function expr() {
      var v = term();
      for (;;) {
        ws();
        var c = s.charAt(i);
        if (c === '+') { i++; v += term(); } else if (c === '-') { i++; v -= term(); } else return v;
      }
    }
    function term() {
      var v = unary();
      for (;;) {
        ws();
        var c = s.charAt(i);
        if (c === '*') { i++; v *= unary(); } else if (c === '/') { i++; v /= unary(); } else return v;
      }
    }
    function unary() {
      ws();
      if (s.charAt(i) === '-') { i++; return -unary(); }
      if (s.charAt(i) === '+') { i++; return unary(); }
      return power();
    }
    function power() {
      var b = atom();
      ws();
      if (s.charAt(i) === '^') { i++; return Math.pow(b, unary()); }
      return b;
    }
    function atom() {
      ws();
      var rest = s.slice(i), m;
      if ((m = /^(\d+\.?\d*|\.\d+)/.exec(rest))) { i += m[0].length; return parseFloat(m[0]); }
      if ((m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
        var name = m[0];
        i += name.length;
        ws();
        if (s.charAt(i) === '(') {
          var key = name.toLowerCase();
          // Solo funciones PROPIAS de CALC_FN: nunca heredadas (constructor, toString…).
          var fn = Object.prototype.hasOwnProperty.call(CALC_FN, key) ? CALC_FN[key] : null;
          if (!fn) fail('Función desconocida: ' + name);
          i++;
          var args = [expr()];
          ws();
          while (s.charAt(i) === ',') { i++; args.push(expr()); ws(); }
          if (s.charAt(i) !== ')') fail('Falta un paréntesis de cierre');
          i++;
          return fn.apply(null, args);
        }
        if (!Object.prototype.hasOwnProperty.call(vars, name)) fail('Nombre desconocido: ' + name);
        var v = vars[name];
        if (typeof v !== 'number' || !isFinite(v)) fail('Falta el valor de ' + name);
        return v;
      }
      if (s.charAt(i) === '(') {
        i++;
        var inner = expr();
        ws();
        if (s.charAt(i) !== ')') fail('Falta un paréntesis de cierre');
        i++;
        return inner;
      }
      fail(i >= s.length ? 'La fórmula está incompleta' : 'Carácter inesperado: ' + s.charAt(i));
    }
    var out = expr();
    ws();
    if (i < s.length) fail('Carácter inesperado: ' + s.charAt(i));
    if (typeof out !== 'number' || !isFinite(out)) fail('El resultado no es un número válido');
    return out;
  }
  // Número escrito por el alumno: admite coma decimal (y entonces el punto es
  // separador de miles), espacios y los símbolos € y %. null si no es un número.
  function parseUserNumber(t) {
    var s = String(t == null ? '' : t).replace(/[\s€%]/g, '');
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    if (!/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return null;
    return parseFloat(s);
  }
  function fmtNumber(v, dec) {
    try { return new Intl.NumberFormat('es-ES', { maximumFractionDigits: dec }).format(v); }
    catch (e) { return String(Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)).replace('.', ','); }
  }
  function decimalsOf(r) { var d = +r.decimals; return isFinite(d) ? Math.max(0, Math.min(6, Math.round(d))) : 2; }

  // --- Reto numérico (calculator) --------------------------------------------
  // `config: { mode: 'challenge'|'tool', variables: [{id, label, unit, value}],
  // results: [{id, label, formula, unit, decimals}] }`. Cada resultado se
  // calcula en orden y puede usar los anteriores.
  // - challenge (evaluable, Comprobar + attempts): se muestran los datos y el
  //   alumno escribe cada resultado. Acierta si se desvía como mucho media
  //   unidad del último decimal pedido o un 0,5 % (lo mayor: redondear a
  //   menos decimales no penaliza). Al resolverse se muestra la solución de
  //   los fallados. Estado { values: [texto saneado por resultado], correct,
  //   attempts } — solo dígitos y , . + - (ASCII acotado, ver codec).
  // - tool (informativa): el alumno escribe los datos y ve los resultados al
  //   momento. Completa al calcular todo una vez (`{ used: true }`).
  register('calculator', function (el, data, ctx) {
    var cfg = data.config || {};
    var vars = (cfg.variables || []).filter(function (v) { return v && v.id; });
    var results = (cfg.results || []).filter(function (r) { return r && r.id; });
    var tool = cfg.mode === 'tool';
    var st = ctx.state || {};
    // Siempre una celda (vacía si no hay unidad): la rejilla de .me-calc-row cuenta con ella.
    function unit(u) { return ' <span class="me-calc-unit">' + esc(u || '') + '</span>'; }
    function compute(values) {
      var scope = {}, out = {};
      vars.forEach(function (v) { scope[v.id] = values[v.id]; });
      results.forEach(function (r) {
        try { out[r.id] = evalFormula(r.formula, scope); } catch (e) { out[r.id] = null; }
        scope[r.id] = out[r.id];
      });
      return out;
    }

    if (tool) {
      var used = !!st.used;
      var html = header(data) + '<div class="me-calc is-tool"><div class="me-calc-in">';
      vars.forEach(function (v, i) {
        html += '<label class="me-calc-row"><span class="me-calc-label">' + rich(v.label || v.id) + '</span>' +
          '<input type="text" inputmode="decimal" class="me-calc-input" data-v="' + i + '" maxlength="16" value="' +
          (typeof v.value === 'number' ? esc(fmtNumber(v.value, 6)) : '') + '">' + unit(v.unit) + '</label>';
      });
      html += '</div><div class="me-calc-out" aria-live="polite">';
      results.forEach(function (r, i) {
        html += '<div class="me-calc-row"><span class="me-calc-label">' + rich(r.label || r.id) + '</span>' +
          '<output class="me-calc-value" data-r="' + i + '">—</output>' + unit(r.unit) + '</div>';
      });
      el.innerHTML = html + '</div></div>';
      var inputs = [].slice.call(el.querySelectorAll('.me-calc-input'));
      function refresh(fromUser) {
        var values = {}, complete = true;
        inputs.forEach(function (inp, i) {
          var x = parseUserNumber(inp.value);
          values[vars[i].id] = x;
          if (x === null) complete = false;
        });
        var out = compute(values);
        results.forEach(function (r, i) {
          var o = el.querySelector('.me-calc-value[data-r="' + i + '"]');
          o.textContent = out[r.id] === null ? '—' : fmtNumber(out[r.id], decimalsOf(r));
        });
        if (fromUser && complete && !used) { used = true; ctx.save({ used: true }); }
      }
      el.addEventListener('input', function () { refresh(true); });
      refresh(false);
      return { result: function () { return { completed: used, scored: false, correct: false, score: 0, maxScore: data.points || 1 }; } };
    }

    // --- Modo reto ---
    var given = {};
    vars.forEach(function (v) { given[v.id] = typeof v.value === 'number' ? v.value : +v.value; });
    var expected = compute(given);
    var maxAtt = attemptsOf(data);
    var h = header(data) + '<div class="me-calc"><div class="me-calc-data"><p class="me-calc-title">Datos</p><dl>';
    vars.forEach(function (v) {
      h += '<div><dt>' + rich(v.label || v.id) + '</dt><dd>' + esc(fmtNumber(given[v.id], 6)) + unit(v.unit) + '</dd></div>';
    });
    h += '</dl></div><div class="me-calc-in">';
    results.forEach(function (r, i) {
      h += '<label class="me-calc-row"><span class="me-calc-label">' + rich(r.label || r.id) + '</span>' +
        '<input type="text" inputmode="decimal" class="me-calc-input" data-r="' + i + '" maxlength="16" autocomplete="off">' + unit(r.unit) +
        '<span class="me-calc-sol" hidden></span></label>';
    });
    el.innerHTML = h + '</div></div><button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);
    var boxes = [].slice.call(el.querySelectorAll('.me-calc-input'));
    var attempts = st.attempts || 0, correct = false, done = false;
    var updateAttempts = attemptsHint(el, maxAtt);
    function hasAnswer() { return boxes.every(function (b) { return parseUserNumber(b.value) !== null; }); }
    var refreshCheck = wireCheck(el, hasAnswer);
    function clean(t) { return String(t || '').replace(/[^0-9.,+-]/g, '').slice(0, 16); }
    function isRight(r, txt) {
      var x = parseUserNumber(txt), exp = expected[r.id];
      if (x === null || exp === null) return false;
      var tol = Math.max(0.5 * Math.pow(10, -decimalsOf(r)), Math.abs(exp) * 0.005) + 1e-9;
      return Math.abs(x - exp) <= tol;
    }
    function mark(showSolution) {
      results.forEach(function (r, i) {
        var ok = isRight(r, boxes[i].value);
        boxes[i].classList.remove('is-right', 'is-wrong');
        boxes[i].classList.add(ok ? 'is-right' : 'is-wrong');
        var sol = boxes[i].parentNode.querySelector('.me-calc-sol');
        sol.hidden = !(showSolution && !ok && expected[r.id] !== null);
        if (!sol.hidden) sol.textContent = 'Solución: ' + fmtNumber(expected[r.id], decimalsOf(r)) + (r.unit ? ' ' + r.unit : '');
      });
    }
    function lock() {
      boxes.forEach(function (b) { b.readOnly = true; });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
    }
    if (Array.isArray(st.values)) {
      boxes.forEach(function (b, i) { b.value = clean(st.values[i]); });
      if (typeof st.correct === 'boolean') {
        correct = st.correct;
        done = correct || (maxAtt > 0 && attempts >= maxAtt);
        mark(done);
        showFeedback(el, correct, data);
        if (done) lock();
      }
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false);
    el.addEventListener('input', function (e) {
      if (done || !e.target.classList.contains('me-calc-input')) return;
      e.target.classList.remove('is-right', 'is-wrong');
      refreshCheck(true);
    });
    function check() {
      if (done) return { resolved: true, correct: correct };
      if (!hasAnswer()) { ctx.announce('Escribe un número en cada resultado.'); return { resolved: false, correct: false }; }
      attempts++;
      correct = results.every(function (r, i) { return isRight(r, boxes[i].value); });
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      mark(done);
      showFeedbackModal(el, correct, data, el.querySelector('.me-check'));
      if (done) lock();
      updateAttempts(attempts, correct);
      ctx.save({ values: boxes.map(function (b) { return clean(b.value); }), correct: correct, attempts: attempts });
      ctx.announce(correct ? 'Resultado correcto.' : (done ? 'Resultado incorrecto. Sin más intentos.' : 'Resultado incorrecto. Inténtalo de nuevo.'));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);
    return {
      result: function () {
        return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 };
      },
      check: check,
      hasAnswer: hasAnswer,
    };
  });

  // --- 10. Case practice (reflexión guiada + autoevaluación por rúbrica) ------
  // Sin campo de texto a propósito: la respuesta se piensa o se escribe en papel
  // (no gasta suspend_data); solo se persisten los criterios marcados.
  register('case_practice', function (el, data, ctx) {
    var rubric = data.config.rubric || []; // [{label}]
    var html = header(data) +
      '<p class="me-case-hint">Piensa tu respuesta con calma —o escríbela en un papel—' +
      (rubric.length ? ' y, cuando la tengas, autoevalúate con la rúbrica.' : '.') + '</p>';
    // La rúbrica es una card desplegable (mismo patrón/clases que el accordion:
    // «+», glow y expansión automática al imprimir vienen heredados).
    var rid = 'rubric-' + data.id;
    if (rubric.length) {
      html += '<div class="me-rubric">' +
        '<button class="me-acc-head" type="button" aria-expanded="false" aria-controls="' + rid + '">' +
        '<span class="me-acc-title">Autoevalúate según la rúbrica</span></button>' +
        '<div class="me-acc-body" id="' + rid + '" role="region" hidden><ul>';
      rubric.forEach(function (r, i) { html += '<li><label><input type="checkbox" data-r="' + i + '"> ' + esc(r.label) + '</label></li>'; });
      html += '</ul></div></div>';
    }
    el.innerHTML = html;
    var boxes = [].slice.call(el.querySelectorAll('.me-rubric input'));
    // rubric: índices de los criterios marcados (compacto para suspend_data)
    var marked0 = (ctx.state && ctx.state.rubric) || [];
    marked0.forEach(function (i) { if (boxes[i]) boxes[i].checked = true; });
    var head = el.querySelector('.me-rubric .me-acc-head');
    if (head) {
      var body = document.getElementById(rid);
      // Con autoevaluación empezada se muestra abierta; si no, late para invitar
      if (marked0.length) { head.setAttribute('aria-expanded', 'true'); body.hidden = false; }
      else head.classList.add('me-pulse');
      head.addEventListener('click', function () {
        var open = head.getAttribute('aria-expanded') === 'true';
        head.classList.remove('me-pulse');
        head.setAttribute('aria-expanded', String(!open));
        body.hidden = open;
      });
    }
    el.addEventListener('change', function (e) {
      if (!e.target.closest('.me-rubric')) return;
      var marked = [];
      boxes.forEach(function (b, i) { if (b.checked) marked.push(i); });
      ctx.save({ rubric: marked });
    });
    return { result: function () { return { completed: true, scored: false }; } };
  });

  // --- 11. Hotspots accesibles ----------------------------------------------
  register('hotspots', function (el, data, ctx) {
    // config: { image, alt, spots:[{id,x,y,w,h,label,correct,feedback,audio_src}] }
    var c = data.config || {};
    var html = header(data) + '<div class="me-hotspot-wrap"><img src="' + esc(assetUrl(c.image)) + '" alt="' + esc(c.alt || '') + '" class="me-hotspot-img">';
    (c.spots || []).forEach(function (s) {
      // El audio de la zona (si se generó) va DENTRO del botón, oculto —
      // wireItemAudio() lo localiza igual que en accordion/tabs. Suena solo al
      // clicar (abajo), nunca antes: aquí NO hay un «índice hablado» general
      // como en accordion — sería leer las opciones de la pregunta en voz alta
      // (ver buildTranscript.ts, hotspots no está en REVEALABLE_TYPES).
      html += '<button class="me-hotspot" data-id="' + esc(s.id) + '" aria-label="' + esc(s.label) + '" ' +
        'style="left:' + s.x + '%;top:' + s.y + '%;width:' + (s.w || 8) + '%;height:' + (s.h || 8) + '%">' +
        itemAudioMarkup(s.audio_src) + '</button>';
    });
    // Solo la imagen con sus zonas: cada zona ya es un <button> con aria-label
    // (focusable con teclado y anunciado por lector), así que no hace falta una
    // lista textual aparte (se retiró en jul 2026: duplicaba los botones y
    // desvelaba las etiquetas de las zonas bajo la imagen).
    el.innerHTML = html + '</div>' + feedbackBox(data);
    // Hay que encontrar TODAS las zonas correctas. Las encontradas quedan en verde y las
    // erróneas en rojo (se pueden seguir pulsando). Completa al hallar la última correcta;
    // `correct` (y la puntuación) exige además no haber fallado ningún clic. Sin zonas
    // correctas configuradas, cualquier clic completa (comportamiento previo).
    var spots = c.spots || [];
    var total = spots.filter(function (x) { return x.correct; }).length;
    var found = {}, wrong = {};
    var correct = false, done = false;
    function count(o) { return Object.keys(o).length; }
    function paint() {
      el.querySelectorAll('.me-hotspot').forEach(function (b) {
        b.classList.toggle('is-right', !!found[b.dataset.id]);
        b.classList.toggle('is-wrong', !!wrong[b.dataset.id]);
      });
      done = total ? count(found) >= total : (count(found) + count(wrong)) > 0;
      correct = done && count(wrong) === 0;
    }
    function fbFor(s, partial) {
      var okMsg = s.feedback || data.feedback.correct || 'Correcto.';
      if (partial) okMsg += ' (' + count(found) + ' de ' + total + ' zonas encontradas)';
      return { feedback: { correct: okMsg, incorrect: s.feedback || data.feedback.incorrect, explanation: data.feedback.explanation } };
    }
    // Pulso en las zonas para invitar al clic (en todas: señalar solo una sesgaría
    // la respuesta); se apaga al primer intento
    if (!(ctx.state && (ctx.state.found || ctx.state.wrong || ctx.state.choice))) {
      el.querySelectorAll('.me-hotspot').forEach(function (b) { b.classList.add('me-pulse'); });
    }
    function pick(id) {
      el.querySelectorAll('.me-hotspot').forEach(function (b) { b.classList.remove('me-pulse'); });
      var s = spots.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      if (!total) { found = {}; wrong = {}; } // sin correctas: el último clic manda
      (s.correct ? found : wrong)[id] = true;
      paint();
      var isOk = !!s.correct;
      var fb = fbFor(s, isOk && total > 1 && !done);
      showFeedbackModal(el, isOk, fb, el.querySelector('.me-hotspot[data-id="' + id + '"]'));
      ctx.save({ found: Object.keys(found), wrong: Object.keys(wrong), correct: correct });
      ctx.announce(isOk ? (done ? 'Zona correcta. Has encontrado todas.' : 'Zona correcta.') : 'Zona incorrecta.');
    }
    el.querySelectorAll('.me-hotspot').forEach(function (b) {
      // El audio de zona suena al clicar, nunca al restaurar estado (abajo):
      // es una pista que acompaña el gesto, no una narración automática.
      b.addEventListener('click', function () { pick(b.dataset.id); revealItemAudio(ctx, wireItemAudio(b)); });
    });
    var st = ctx.state || {};
    if (st.found || st.wrong) {
      (st.found || []).forEach(function (id) { found[id] = true; });
      (st.wrong || []).forEach(function (id) { wrong[id] = true; });
    } else if (st.choice) { // estado antiguo: un único clic
      var hs = spots.filter(function (x) { return x.id === st.choice; })[0];
      if (hs) { if (hs.correct) found[hs.id] = true; else wrong[hs.id] = true; }
    }
    if (count(found) + count(wrong)) {
      paint();
      var last = spots.filter(function (x) { return found[x.id] || wrong[x.id]; }).pop();
      if (last) showFeedback(el, !!found[last.id], fbFor(last, false));
    }
    return { result: function () { return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 }; } };
  });

  // --- 12. Video con transcripción y subtítulos VTT --------------------------
  // Vídeo con preguntas opcionales en timestamps (config.questions:
  // [{ time (segundos), prompt, options: [{text, correct, feedback?}] }]).
  // El vídeo se PAUSA al llegar al timestamp y muestra la pregunta en overlay;
  // al responder (1 intento por pregunta) se ve el feedback y se reanuda.
  // - video_file: nativo (timeupdate/pause/play).
  // - YouTube: puente postMessage del IFrame API (enablejsapi=1, sin cargar JS
  //   externo). Si el puente no entrega tiempo (bloqueado), las preguntas
  //   aparecen como lista visible bajo el vídeo: siempre son respondibles.
  // Sin preguntas se comporta como siempre (informativa, completa al render).
  register('video', function (el, data, ctx) {
    var c = data.config || {};
    var questions = (c.questions || []).filter(function (q) {
      return q && String(q.prompt || '').trim() && (q.options || []).length >= 2;
    });
    var answered = (ctx.state && ctx.state.answered) || {}; // idx -> {choice, correct}

    var html = header(data) + '<div class="me-iv-box">';
    if (c.youtube) {
      html += '<div class="me-video"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(ytIdOf(c.youtube)) +
        (questions.length ? '?enablejsapi=1' : '') +
        '" title="' + esc(stripTags(data.prompt) || 'Vídeo') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>';
    } else if (c.src) {
      html += '<video class="me-video" controls preload="metadata"' + (c.poster ? ' poster="' + esc(assetUrl(c.poster)) + '"' : '') + '>' +
        '<source src="' + esc(assetUrl(c.src)) + '">';
      (c.tracks || []).forEach(function (t) {
        html += '<track kind="' + esc(t.kind || 'subtitles') + '" src="' + esc(assetUrl(t.src)) + '" srclang="' + esc(t.lang || 'es') + '" label="' + esc(t.label || 'Español') + '" default>';
      });
      html += '</video>';
    }
    html += '<div class="me-iv-overlay" hidden></div></div>';
    if (questions.length) {
      html += '<p class="me-iv-progress" aria-live="polite"></p>';
      // Contenedor del modo lista (fallback YouTube sin puente): oculto de serie.
      html += '<div class="me-iv-list" hidden></div>';
    }
    if (c.transcript) {
      html += '<details class="me-transcript"><summary>Ver transcripción</summary><div>' + esc(c.transcript) + '</div></details>';
    }
    el.innerHTML = html;

    if (!questions.length) {
      return { result: function () { return { completed: true, scored: false }; } };
    }

    var overlay = el.querySelector('.me-iv-overlay');
    var progress = el.querySelector('.me-iv-progress');
    var videoEl = el.querySelector('video');
    var iframeEl = el.querySelector('iframe');
    var listBox = el.querySelector('.me-iv-list');

    function answeredCount() { return Object.keys(answered).length; }
    function refreshProgress() {
      progress.textContent = 'Preguntas del vídeo: ' + answeredCount() + ' de ' + questions.length + ' respondidas.';
    }
    refreshProgress();

    // --- Control de reproducción (nativo o puente YouTube) -----------------
    var yt = { ready: false, time: 0 };
    function ytCmd(func) {
      if (iframeEl && iframeEl.contentWindow) {
        iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
      }
    }
    function pause() { if (videoEl) videoEl.pause(); else ytCmd('pauseVideo'); }
    function play() { if (videoEl) videoEl.play(); else ytCmd('playVideo'); }
    function currentTime() { return videoEl ? videoEl.currentTime : yt.time; }

    // --- Pregunta en overlay -------------------------------------------------
    function renderQuestion(i, box, onDone) {
      var q = questions[i];
      var prev = answered[i];
      var h = '<div class="me-iv-q" role="group" aria-label="Pregunta del vídeo">' +
        '<p class="me-iv-prompt">' + rich(q.prompt) + '</p><div class="me-iv-opts">';
      (q.options || []).forEach(function (o, j) {
        h += '<button type="button" class="me-iv-opt' +
          (prev && prev.choice === j ? (prev.correct ? ' is-right' : ' is-wrong') : '') +
          '" data-j="' + j + '"' + (prev ? ' disabled' : '') + '>' + rich(o.text) + '</button>';
      });
      h += '</div><div class="me-iv-fb"' + (prev ? '' : ' hidden') + '></div>' +
        (onDone ? '<button type="button" class="me-btn me-primary me-iv-continue" hidden>Continuar</button>' : '') +
        '</div>';
      box.innerHTML = h;
      var fb = box.querySelector('.me-iv-fb');
      function showFb(o, ok) {
        fb.hidden = false;
        fb.className = 'me-iv-fb ' + (ok ? 'is-ok' : 'is-error');
        fb.innerHTML = '<strong>' + (ok ? '✔ ' : '✖ ') + '</strong>' +
          rich(o.feedback || (ok ? (data.feedback.correct || 'Correcto.') : (data.feedback.incorrect || 'No es correcto.')));
      }
      if (prev) showFb(q.options[prev.choice] || {}, prev.correct);
      box.querySelector('.me-iv-opts').addEventListener('click', function (e) {
        var btn = e.target.closest('.me-iv-opt');
        if (!btn || answered[i]) return;
        var j = +btn.getAttribute('data-j');
        var ok = !!q.options[j].correct;
        answered[i] = { choice: j, correct: ok };
        btn.classList.add(ok ? 'is-right' : 'is-wrong');
        [].slice.call(box.querySelectorAll('.me-iv-opt')).forEach(function (b) { b.disabled = true; });
        showFb(q.options[j], ok);
        ctx.save({ answered: answered });
        refreshProgress();
        ctx.announce(ok ? 'Respuesta correcta.' : 'Respuesta incorrecta.');
        var cont = box.querySelector('.me-iv-continue');
        if (cont) { cont.hidden = false; cont.focus(); }
      });
      var cont = box.querySelector('.me-iv-continue');
      if (cont) cont.addEventListener('click', function () { onDone(); });
    }

    var showing = false;
    function pendingAt(t) {
      for (var i = 0; i < questions.length; i++) {
        if (!answered[i] && t >= (questions[i].time || 0)) return i;
      }
      return -1;
    }
    function maybeAsk() {
      if (showing) return;
      var i = pendingAt(currentTime());
      if (i === -1) return;
      showing = true;
      pause();
      overlay.hidden = false;
      renderQuestion(i, overlay, function () {
        overlay.hidden = true;
        showing = false;
        // Otra pregunta en el mismo punto: se muestra antes de reanudar.
        if (pendingAt(currentTime()) !== -1) { maybeAsk(); return; }
        play();
      });
      overlay.querySelector('.me-iv-opt').focus();
    }

    if (videoEl) {
      videoEl.addEventListener('timeupdate', maybeAsk);
      videoEl.addEventListener('seeked', maybeAsk);
    } else if (iframeEl) {
      // Puente YouTube: pedir escucha hasta recibir infoDelivery con el tiempo.
      var gotInfo = false;
      var onMsg = function (e) {
        if (!iframeEl.isConnected) { global.removeEventListener('message', onMsg); return; }
        if (e.source !== iframeEl.contentWindow) return;
        var d;
        try { d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
        if (d && d.info && typeof d.info.currentTime === 'number') {
          gotInfo = true;
          yt.time = d.info.currentTime;
          maybeAsk();
        }
      };
      global.addEventListener('message', onMsg);
      var listenTries = 0;
      var listener = setInterval(function () {
        if (!iframeEl.isConnected || gotInfo || listenTries++ > 20) { clearInterval(listener); return; }
        if (iframeEl.contentWindow) {
          iframeEl.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: String(data.id) }), '*');
        }
      }, 500);
      // Fallback: sin señal de tiempo en 6 s, preguntas como lista visible.
      setTimeout(function () {
        if (gotInfo || !iframeEl.isConnected) return;
        listBox.hidden = false;
        listBox.innerHTML = '<p class="me-iv-list-head">Preguntas del vídeo</p>';
        questions.forEach(function (_, i) {
          var slot = document.createElement('div');
          listBox.appendChild(slot);
          renderQuestion(i, slot, null);
        });
      }, 6000);
    }

    return {
      result: function () {
        var total = questions.length;
        var okCount = 0;
        questions.forEach(function (_, i) { if (answered[i] && answered[i].correct) okCount++; });
        var all = answeredCount() >= total;
        var pts = data.points || 1;
        return {
          completed: all,
          scored: !!data.scored,
          correct: all && okCount === total,
          score: Math.round(pts * (okCount / total) * 100) / 100,
          maxScore: pts,
        };
      },
      hasAnswer: function () { return answeredCount() > 0; },
    };
  });

  // --- 13. Rellenar huecos (fill_blanks) --------------------------------------
  // config.text contiene huecos [[respuesta correcta]]; cada hueco se renderiza
  // como <select> cuyo pool de opciones son todas las respuestas + distractores
  // (config.distractors), barajadas de forma determinista.
  // Con config.mode === 'type' el hueco es un campo de texto: el alumno escribe
  // la respuesta y vale cualquiera de las alternativas [[a|b]] (sin distinguir
  // mayúsculas, tildes ni espacios de más). Sin `mode` (proyectos antiguos y
  // nuevos por defecto) todo sigue como siempre: desplegables, y un «|» dentro
  // del hueco es texto literal. Estado escrito: { ok: [acierto por hueco],
  // correct, attempts } — nunca el texto del alumno (al restaurar, un hueco
  // acertado muestra la respuesta del autor y uno fallado queda vacío).
  function normAnswer(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  register('fill_blanks', function (el, data, ctx) {
    var typed = (data.config || {}).mode === 'type';
    var text = String((data.config || {}).text || '');
    var answers = [];
    // Trocea el texto: parte fija escapada + un select por hueco.
    var body = '';
    var re = /\[\[(.+?)\]\]/g;
    var last = 0, m2;
    while ((m2 = re.exec(text)) !== null) {
      body += rich(text.slice(last, m2.index)).replace(/\n/g, '<br>');
      answers.push(m2[1].trim());
      body += '@@BLANK' + (answers.length - 1) + '@@';
      last = re.lastIndex;
    }
    body += rich(text.slice(last)).replace(/\n/g, '<br>');

    // Pool: respuestas + distractores, sin duplicados, orden determinista.
    var pool = [];
    answers.concat((data.config || {}).distractors || []).forEach(function (t) {
      t = String(t).trim();
      if (t && pool.indexOf(t) === -1) pool.push(t);
    });
    pool = shuffle(pool.map(function (t) { return { id: t }; }), data.id).map(function (x) { return x.id; });

    var optionsHtml = pool.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');
    // Alternativas válidas por hueco (solo en modo escrito se trocea por «|»).
    var alts = answers.map(function (a) {
      var l = typed ? a.split('|').map(function (x) { return x.trim(); }).filter(Boolean) : [a];
      return l.length ? l : [a];
    });
    answers.forEach(function (_, i) {
      var longest = alts[i].reduce(function (n, a) { return Math.max(n, a.length); }, 4);
      body = body.replace('@@BLANK' + i + '@@', typed
        ? '<input type="text" class="me-blank me-blank-input" data-i="' + i + '" aria-label="Hueco ' + (i + 1) + '"' +
          ' autocomplete="off" spellcheck="false" maxlength="' + Math.min(80, longest + 20) + '" size="' + Math.min(30, longest + 2) + '">' +
          '<span class="me-blank-sol" hidden></span>'
        : '<select class="me-blank" data-i="' + i + '" aria-label="Hueco ' + (i + 1) + '">' +
          '<option value="">…</option>' + optionsHtml + '</select>');
    });

    var maxAtt = attemptsOf(data);
    el.innerHTML = header(data) + '<p class="me-blanks">' + body + '</p>' +
      '<button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);

    var selects = [].slice.call(el.querySelectorAll('.me-blank'));
    var attempts = 0, done = false, correct = false;
    var updateAttempts = attemptsHint(el, maxAtt);
    var refreshCheck = wireCheck(el, function () {
      return selects.every(function (s) { return !!s.value.trim(); });
    });
    el.addEventListener(typed ? 'input' : 'change', function (e) {
      if (!done && e.target.closest('.me-blank')) {
        if (typed) e.target.classList.remove('is-right', 'is-wrong');
        refreshCheck(true);
      }
    });
    function isRight(i, v) {
      return typed
        ? alts[i].some(function (a) { return normAnswer(a) === normAnswer(v); })
        : v === answers[i];
    }

    function lock() {
      selects.forEach(function (s) { s.disabled = true; });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
    }
    function markBlanks() {
      selects.forEach(function (s, i) {
        var ok = isRight(i, s.value);
        s.classList.remove('is-right', 'is-wrong');
        s.classList.add(ok ? 'is-right' : 'is-wrong');
        replay(s);
        // Modo escrito, ya resuelto: el hueco fallado muestra la respuesta esperada.
        var sol = typed && s.nextElementSibling;
        if (sol && sol.classList.contains('me-blank-sol')) {
          sol.hidden = !(done && !ok);
          sol.textContent = alts[i][0];
        }
      });
    }
    function hasAnswer() {
      return selects.some(function (s) { return !!s.value; });
    }
    function check() {
      if (done) return { resolved: true, correct: correct };
      if (selects.some(function (s) { return !s.value.trim(); })) {
        ctx.announce('Completa todos los huecos.');
        return { resolved: false, correct: false };
      }
      attempts++;
      correct = selects.every(function (s, i) { return isRight(i, s.value); });
      showFeedbackModal(el, correct, data, el.querySelector('.me-check'));
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      markBlanks();
      if (done) lock();
      updateAttempts(attempts, correct);
      ctx.save(typed
        ? { ok: selects.map(function (s, i) { return isRight(i, s.value); }), correct: correct, attempts: attempts }
        : { values: selects.map(function (s) { return s.value; }), correct: correct, attempts: attempts });
      ctx.announce(correct ? 'Todos los huecos correctos.' : (done ? 'Hay huecos incorrectos. Sin más intentos.' : 'Hay huecos incorrectos. Inténtalo de nuevo.'));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);

    var restored = ctx.state && (typed ? ctx.state.ok : ctx.state.values);
    if (restored) {
      if (typed) restored.forEach(function (ok, i) { if (selects[i]) selects[i].value = ok ? alts[i][0] : ''; });
      else restored.forEach(function (v, i) { if (selects[i]) selects[i].value = v; });
      attempts = ctx.state.attempts || 0;
      if (typeof ctx.state.correct === 'boolean') {
        correct = ctx.state.correct;
        if (correct || (maxAtt > 0 && attempts >= maxAtt)) done = true;
        showFeedback(el, correct, data);
        markBlanks();
        if (done) lock();
      }
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false); // valores restaurados sin resolver: activo sin pulso

    return {
      result: function () {
        return { completed: done, scored: !!data.scored, correct: correct, score: correct ? (data.points || 1) : 0, maxScore: data.points || 1 };
      },
      check: check,
      hasAnswer: hasAnswer,
    };
  });

  // --- 14. Línea de tiempo (timeline) -----------------------------------------
  // config.milestones: [{ label (fecha/fase), title, body }]. Informativa: hitos
  // sobre una línea vertical; cada uno se despliega como un accordion.
  register('timeline', function (el, data, ctx) {
    var miles = (data.config || {}).milestones || [];
    var seen = (ctx.state && ctx.state.seen) || {}; // índice -> true (persistido)
    var html = header(data) + '<ol class="me-tl">';
    miles.forEach(function (mi, i) {
      var id = 'tl-' + i;
      html += '<li class="me-tl-item">' +
        '<button class="me-tl-head' + (seen[i] ? ' is-seen' : '') + '" aria-expanded="false" aria-controls="' + id + '">' +
        (mi.label ? '<span class="me-tl-label">' + rich(mi.label) + '</span>' : '') +
        '<span class="me-tl-title">' + rich(mi.title || '') + '</span>' +
        '<span class="me-seen-check" aria-hidden="true">✓</span></button>' +
        '<div class="me-tl-body" id="' + id + '" role="region" hidden>' + itemAudioMarkup(mi.audio_src) + block(mi.body || '') + '</div></li>';
    });
    html += '</ol>';
    el.innerHTML = html;
    var heads = [].slice.call(el.querySelectorAll('.me-tl-head'));
    var bodies = [].slice.call(el.querySelectorAll('.me-tl-body'));
    var audioEls = bodies.map(function (b) { return wireItemAudio(b); });
    // Pulso en el primer hito para invitar al clic, solo si aún no se ha abierto ninguno
    if (!Object.keys(seen).length && heads[0]) heads[0].classList.add('me-pulse');
    heads.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        stopItemAudio();
        // Exclusivo: al abrir un hito se cierran los demás
        heads.forEach(function (other, j) {
          var on = other === btn && !open;
          other.classList.remove('me-pulse');
          other.setAttribute('aria-expanded', String(on));
          bodies[j].hidden = !on;
        });
        if (!open) {
          if (!seen[i]) { seen[i] = true; btn.classList.add('is-seen'); ctx.save({ seen: seen }); }
          revealItemAudio(ctx, audioEls[i]);
        }
      });
    });
    // Completada solo cuando se han desplegado TODOS los hitos.
    return { result: function () {
      return { completed: miles.every(function (_, i) { return !!seen[i]; }), scored: false };
    } };
  });

  // --- 15. Tarjetas de repaso (flashcards) -------------------------------------
  // config.cards: [{ front, back }] (mismo shape que flip_cards). Autoevaluación:
  // una carta cada vez → «Mostrar respuesta» → «¿La sabías?» Sí/No → resumen.
  // No puntúa (scored: false recomendado); guarda el repaso en el estado.
  register('flashcards', function (el, data, ctx) {
    var cards = (data.config || {}).cards || [];
    if (!cards.length) {
      el.innerHTML = header(data);
      return { result: function () { return { completed: true, scored: false }; } };
    }
    var st = ctx.state || {};
    var idx = st.idx || 0;
    var known = st.known || []; // true/false por carta respondida
    if (idx > cards.length) idx = 0;
    // Completada al terminar el repaso una vez; «Repetir repaso» no la des-completa
    // (el flag persiste para no re-bloquear el avance en repasos posteriores).
    var doneOnce = !!st.done || (idx >= cards.length && known.length >= cards.length);

    var html = header(data) + '<div class="me-fc">' +
      '<p class="me-fc-progress" aria-live="polite"></p>' +
      '<div class="me-fc-stage"></div>' +
      '<div class="me-fc-controls"></div></div>';
    el.innerHTML = html;
    var stage = el.querySelector('.me-fc-stage');
    var controls = el.querySelector('.me-fc-controls');
    var progress = el.querySelector('.me-fc-progress');

    function save() { ctx.save({ idx: idx, known: known, done: doneOnce }); }

    function renderSummary() {
      var yes = known.filter(function (k) { return k; }).length;
      progress.textContent = '';
      stage.innerHTML = '<div class="me-fc-summary"><p><strong>' + yes + ' de ' + cards.length +
        '</strong> tarjetas sabidas.</p>' +
        (yes < cards.length ? '<p>Repite el repaso para afianzar las que fallaste.</p>' : '<p>¡Repaso completo!</p>') + '</div>';
      controls.innerHTML = '<button class="me-btn" type="button">↻ Repetir repaso</button>';
      controls.querySelector('button').addEventListener('click', function () {
        idx = 0; known = []; save(); renderCard(false);
      });
    }

    // Pulso-glow solo la primera vez (repaso sin empezar); no vuelve al repetir
    var pulseLeft = !st.idx && !(st.known || []).length;

    function renderCard(revealed) {
      // Corta el audio de la carta anterior en cualquier transición (nueva
      // carta o vuelta al anverso): el repaso no tiene un "seen" persistente
      // como accordion/tabs, así que cada "Mostrar respuesta" es su propio
      // revelado y suena de nuevo (repetir el repaso es justo repasar otra vez).
      stopItemAudio();
      if (idx >= cards.length) { renderSummary(); return; }
      var c = cards[idx];
      progress.textContent = 'Tarjeta ' + (idx + 1) + ' de ' + cards.length;
      stage.innerHTML = '<div class="me-fc-card' + (revealed ? ' is-revealed' : '') +
        (!revealed && idx === 0 && pulseLeft ? ' me-pulse' : '') + '">' +
        '<span class="me-flip-tab" aria-hidden="true"></span>' +
        '<div class="me-fc-front">' + block(c.front) + '</div>' +
        (revealed ? '<div class="me-fc-back">' + block(c.back) + itemAudioMarkup(c.audio_src) + '</div>' : '') + '</div>';
      if (!revealed) {
        controls.innerHTML = '<button class="me-btn me-primary" type="button">Mostrar respuesta</button>';
        var show = function () { pulseLeft = false; renderCard(true); };
        controls.querySelector('button').addEventListener('click', show);
        // La lengüeta «+» invita a tocar la carta: el clic también revela
        stage.querySelector('.me-fc-card').addEventListener('click', show);
      } else {
        var backAudio = wireItemAudio(stage.querySelector('.me-fc-back'));
        revealItemAudio(ctx, backAudio);
        controls.innerHTML = '<span class="me-fc-ask">¿La sabías?</span>' +
          '<button class="me-btn me-fc-yes" type="button">✔ Sí</button>' +
          '<button class="me-btn me-fc-no" type="button">✖ Aún no</button>';
        controls.querySelector('.me-fc-yes').addEventListener('click', function () { answer(true); });
        controls.querySelector('.me-fc-no').addEventListener('click', function () { answer(false); });
      }
    }
    function answer(knew) {
      known[idx] = knew;
      idx++;
      if (idx >= cards.length) doneOnce = true;
      save();
      if (idx >= cards.length) renderSummary();
      else renderCard(false);
    }

    if (idx >= cards.length && known.length >= cards.length) renderSummary();
    else renderCard(false);

    return { result: function () { return { completed: doneOnce, scored: false }; } };
  });

  // --- 16. HTML a medida (iframe sandbox) — contrato «MeEmbed v1» -------------
  // El autor pega HTML+CSS+JS propios (animaciones, interactivos ad hoc).
  // config: { html, css, js, height?, require_completion?, state_max? }
  // (height en px; sin ella, alto automático). Corre en <iframe
  // sandbox="allow-scripts"> SIN allow-same-origin: origen opaco, así el
  // código NO puede tocar la API SCORM, el estado del curso ni el DOM de la
  // carcasa. La invariante anti-XSS se mantiene porque nada del autor se
  // inyecta en nuestro DOM: viaja escapado dentro del atributo srcdoc.
  //
  // Contrato MeEmbed v1 (window.MeEmbed dentro del iframe, ver
  // docs/html-embed-contract.md para el detalle autor-facing):
  //   version: 1 | id: string | completed: boolean | state: <JSON> | null
  //   stateMax: number (presupuesto de caracteres de `state`)
  //   complete(): marca la interacción como completada (una vez, idempotente
  //     de cara al alumno: repetir la llamada no hace nada nuevo).
  //   saveState(obj): intenta guardar `obj` como estado propio del
  //     interactivo — silenciosamente rechazado (con console.warn) si no es
  //     serializable, si supera `stateMax` o si su JSON contiene algún
  //     carácter fuera de ASCII imprimible (0x20-0x7E) o el carácter `~`.
  //     Esta última regla es deliberada: el estado debe caber en índices,
  //     booleanos y claves de una letra (p. ej. `{"s":[0,2]}`), nunca texto
  //     libre con tildes/emoji — así el medidor de memoria del editor
  //     (estimateSuspendSize) puede acotar el peor caso SIN un factor de
  //     escape, porque sabe que el contenido real nunca lo necesitará. La
  //     carcasa vuelve a comprobar tamaño Y alfabeto al recibir el mensaje,
  //     nunca se fía del propio iframe.
  // Todo el canal es postMessage con `{meEmbed: id, ...}`, validado también
  // por `e.source` (el mensaje debe venir del iframe de ESTA interacción,
  // relevante porque con origen opaco no hay `e.origin` que comprobar).
  register('html_embed', function (el, data, ctx) {
    var c = data.config || {};
    var height = parseInt(c.height, 10) || 0;
    var stateMax = (typeof c.state_max === 'number' && isFinite(c.state_max)) ? c.state_max : 100;
    stateMax = Math.max(0, Math.min(300, stateMax));
    var savedState = ctx.state || {};
    var done = !!savedState.done;
    var stateData = ('data' in savedState) ? savedState.data : null;
    function persist() { ctx.save({ done: done, data: stateData }); }
    // El código del usuario no debe poder cerrar por accidente su propio
    // <script>/<style> dentro del documento interno.
    function noClose(s, tag) {
      return String(s || '').replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);
    }
    var embedId = JSON.stringify(String(data.id));
    // Estado inicial embebido como JS literal dentro del <script> del shim:
    // escapar «<» como < evita que un cierre de "script" colado dentro
    // del JSON (por ejemplo si `stateData` guardara texto libre) termine el
    // <script> del documento interno antes de tiempo — más general que
    // `noClose`, que solo cubre los cierres de tag literales. (Ojo al editar
    // este comentario: no escribir aquí la secuencia de cierre de "script"
    // sin partirla — este archivo se incrusta ENTERO, comentarios incluidos,
    // dentro de un <script> real en la Vista previa del editor, ver
    // buildPreview.ts.)
    var initialStateJson = JSON.stringify(stateData === undefined ? null : stateData).replace(/</g, '\\u003c');
    var meEmbedShim = '<script>window.MeEmbed={version:1,id:' + embedId +
      ',completed:' + (done ? 'true' : 'false') +
      ',state:' + initialStateJson + ',stateMax:' + stateMax + ',' +
      'complete:function(){this.completed=true;parent.postMessage({meEmbed:' + embedId + ',completed:true},"*");},' +
      'saveState:function(o){var s;try{s=JSON.stringify(o);}catch(e){' +
      'console.warn("MeEmbed.saveState: el estado no se pudo convertir a JSON.");return;}' +
      'if(/[^\\x20-\\x7e]|~/.test(s)){console.warn("MeEmbed.saveState: el estado debe ser ' +
      'ASCII imprimible (sin tildes/emoji ni el caracter ~): usa indices, booleanos y claves ' +
      'de una letra.");return;}' +
      'if(s.length>this.stateMax){console.warn("MeEmbed.saveState: estado de "+s.length+' +
      '" caracteres, supera el presupuesto de "+this.stateMax+".");return;}' +
      'this.state=o;parent.postMessage({meEmbed:' + embedId + ',state:s},"*");}};<\/script>';
    // Sin alto fijo, el documento interno reporta su altura por postMessage
    // (único canal disponible con origen opaco).
    var resizer = '<script>(function(){var h=0;function post(){var n=document.documentElement.scrollHeight;' +
      'if(n!==h){h=n;parent.postMessage({meEmbed:' + embedId + ',height:n},"*");}}' +
      'if(window.ResizeObserver){new ResizeObserver(post).observe(document.documentElement);}' +
      'else{setInterval(post,600);}window.addEventListener("load",post);post();})();<\/script>';
    var doc = '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<style>html,body{margin:0}' + noClose(c.css, 'style') + '</style></head><body>' +
      meEmbedShim +
      String(c.html || '') +
      (c.js ? '<script>' + noClose(c.js, 'script') + '<\/script>' : '') +
      (height ? '' : resizer) + '</body></html>';
    el.innerHTML = header(data) +
      '<iframe class="me-embed" sandbox="allow-scripts" srcdoc="' + esc(doc) + '"' +
      ' title="' + esc(stripTags(data.prompt) || 'Contenido interactivo') + '"' +
      (height ? ' style="height:' + height + 'px"' : '') + '></iframe>';
    // Único listener, siempre activo (antes solo existía para el auto-resize):
    // también recibe finalización y estado, ambos posibles con alto fijo.
    var frame = el.querySelector('.me-embed');
    var onMsg = function (e) {
      if (!frame.isConnected) { global.removeEventListener('message', onMsg); return; }
      if (e.source !== frame.contentWindow) return; // solo el iframe de ESTA interacción
      var d = e.data;
      if (!d || d.meEmbed !== String(data.id)) return;
      if (!height && typeof d.height === 'number') {
        frame.style.height = Math.max(40, d.height | 0) + 'px';
      }
      if (d.completed === true && !done) {
        done = true;
        persist();
        if (c.require_completion) ctx.announce('Actividad completada. Ya puedes continuar.');
      }
      // Re-validación en la carcasa, nunca se fía del iframe: tamaño Y
      // alfabeto (ASCII imprimible, sin '~') — el mismo criterio del shim,
      // repetido aquí porque un iframe modificado (o un mensaje falsificado
      // desde otro origen del propio sandbox) podría saltárselo.
      if (typeof d.state === 'string' && d.state.length <= stateMax && !(/[^\x20-\x7e]|~/.test(d.state))) {
        var parsed;
        try { parsed = JSON.parse(d.state); } catch (e2) { parsed = undefined; }
        if (parsed !== undefined) { stateData = parsed; persist(); }
      }
    };
    global.addEventListener('message', onMsg);
    return {
      result: function () {
        return { completed: c.require_completion ? done : true, scored: false };
      },
    };
  });

  // --- 17. Tarjetas de imagen (modal texto + imagen) ---------------------------
  // config.cards: [{ image, alt, title, text }]. Informativa: cada tarjeta
  // muestra su imagen (+ título) y al clicarla se abre una modal con el texto a
  // la izquierda y la imagen a la derecha. Mismo lenguaje de affordance que el
  // resto: lengüeta «+», pulso-glow en la primera y check verde al verla.
  register('image_cards', function (el, data, ctx) {
    var cards = (data.config || {}).cards || [];
    var seen = (ctx.state && ctx.state.seen) || {}; // índice -> true (persistido)
    // show_cover_image: false → la tarjeta muestra solo el título (aspecto de
    // flip card); la imagen sigue viéndose en la modal. Por defecto, con imagen.
    var cover = (data.config || {}).show_cover_image !== false;
    var html = header(data) + '<div class="me-imgcards' + (cover ? '' : ' is-textcover') + '">';
    cards.forEach(function (c, i) {
      html += '<div class="me-imgcard-wrap">' +
        '<button class="me-imgcard' + (seen[i] ? ' is-seen' : '') + '" type="button" data-i="' + i + '"' +
        (c.title ? '' : ' aria-label="' + esc(stripTags(c.alt || 'Ver detalle')) + '"') + '>' +
        '<span class="me-flip-tab" aria-hidden="true"></span>' +
        (c.image && cover ? '<img src="' + esc(assetUrl(c.image)) + '" alt="' + esc(c.alt || '') + '" loading="lazy">' : '') +
        (c.title ? '<span class="me-imgcard-title">' + rich(c.title) + '</span>' : '') +
        '</button>' +
        // Solo impresión: el texto de la modal, oculto en pantalla (print.css lo muestra)
        '<div class="me-imgcard-print" hidden>' + block(c.text || '') + '</div>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
    var btns = [].slice.call(el.querySelectorAll('.me-imgcard'));
    if (!Object.keys(seen).length && btns.length) btns[0].classList.add('me-pulse');

    function openCard(c) {
      var overlay = document.createElement('div');
      overlay.className = 'me-modal me-icmodal';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', stripTags(c.title || c.alt || 'Detalle'));
      overlay.innerHTML = '<div class="me-modal-card me-icmodal-card">' +
        '<div class="me-modal-head"><h2 class="me-modal-title">' + rich(c.title || '') + '</h2>' +
        '<button class="me-modal-close me-icon-btn" aria-label="Cerrar">✕</button></div>' +
        '<div class="me-icmodal-body">' +
        '<div class="me-icmodal-text">' + block(c.text || '') + itemAudioMarkup(c.audio_src) + '</div>' +
        (c.image ? '<figure class="me-icmodal-media"><img class="me-zoomable" src="' + esc(assetUrl(c.image)) +
          '" alt="' + esc(c.alt || '') + '" tabindex="0" role="button" aria-label="Ampliar imagen"></figure>' : '') +
        '</div></div>';
      var audioEntry = wireItemAudio(overlay.querySelector('.me-icmodal-text'));
      revealItemAudio(ctx, audioEntry);
      var last = document.activeElement;
      function close() {
        stopItemAudio();
        overlay.remove();
        document.removeEventListener('keydown', onKey);
        if (last && last.focus) last.focus();
      }
      function onKey(e) {
        if (e.key !== 'Escape') return;
        // Con el lightbox abierto encima, Esc cierra solo el lightbox.
        var lb = document.getElementById('me-lightbox');
        if (lb && !lb.hidden) return;
        close();
      }
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay || e.target.closest('.me-modal-close')) close();
      });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
      overlay.querySelector('.me-modal-close').focus();
    }

    el.querySelector('.me-imgcards').addEventListener('click', function (e) {
      var btn = e.target.closest('.me-imgcard');
      if (!btn) return;
      var i = +btn.getAttribute('data-i');
      btns.forEach(function (b) { b.classList.remove('me-pulse'); });
      if (!seen[i]) { seen[i] = true; btn.classList.add('is-seen'); ctx.save({ seen: seen }); }
      openCard(cards[i]);
    });

    return { result: function () { return { completed: true, scored: false }; } };
  });

  // --- 18. Antes / después (comparador de imágenes) ---------------------------
  // config: { before_image, before_alt, after_image, after_alt,
  //           before_label?, after_label? }. Informativa: dos imágenes
  // superpuestas; un divisor deslizante (input range accesible) recorta la de
  // «antes» con clip-path. Completa al mover el divisor una vez.
  register('before_after', function (el, data, ctx) {
    var c = data.config || {};
    var labelB = c.before_label || 'Antes';
    var labelA = c.after_label || 'Después';
    var moved = !!(ctx.state && ctx.state.moved);
    var pos = (ctx.state && typeof ctx.state.pos === 'number') ? ctx.state.pos : 50;
    el.innerHTML = header(data) +
      '<div class="me-ba">' +
      '<img class="me-ba-after" src="' + esc(assetUrl(c.after_image)) + '" alt="' + esc(c.after_alt || '') + '">' +
      '<img class="me-ba-before" src="' + esc(assetUrl(c.before_image)) + '" alt="' + esc(c.before_alt || '') + '">' +
      '<span class="me-ba-label me-ba-label-b">' + rich(labelB) + '</span>' +
      '<span class="me-ba-label me-ba-label-a">' + rich(labelA) + '</span>' +
      '<span class="me-ba-divider" aria-hidden="true"><span class="me-ba-handle' + (moved ? '' : ' me-pulse') + '">◂▸</span></span>' +
      '<input class="me-ba-range" type="range" min="0" max="100" step="1" value="' + pos + '"' +
      ' aria-label="' + esc(stripTags(data.prompt) || 'Comparador antes y después') + '">' +
      '</div>' +
      // Solo impresión: ambas imágenes completas con su etiqueta (print.css lo muestra)
      '<div class="me-ba-print" hidden>' +
      '<figure><img src="' + esc(assetUrl(c.before_image)) + '" alt="' + esc(c.before_alt || '') + '"><figcaption>' + rich(labelB) + '</figcaption></figure>' +
      '<figure><img src="' + esc(assetUrl(c.after_image)) + '" alt="' + esc(c.after_alt || '') + '"><figcaption>' + rich(labelA) + '</figcaption></figure>' +
      '</div>';

    var box = el.querySelector('.me-ba');
    var range = el.querySelector('.me-ba-range');
    var handle = el.querySelector('.me-ba-handle');
    function apply(p) {
      // La imagen «antes» se recorta por la derecha; el divisor sigue al valor.
      box.style.setProperty('--me-ba-pos', p + '%');
    }
    apply(pos);
    range.addEventListener('input', function () {
      pos = +range.value;
      apply(pos);
      if (!moved) {
        moved = true;
        handle.classList.remove('me-pulse');
        ctx.announce('Comparador activado: desliza para comparar ambas imágenes.');
      }
      ctx.save({ moved: true, pos: pos });
    });

    return { result: function () { return { completed: moved, scored: false }; } };
  });

  // --- 19. Sopa de letras (word_search) ---------------------------------------
  // config: { words: [string] }. Evaluable opcional y AUTOVALIDANTE: sin botón
  // Comprobar ni attempts — se toca la primera y la última letra de una palabra
  // y se valida al momento (mismo criterio «tocar y colocar» que el drag&drop).
  // El grid se genera DETERMINISTA desde data.id para que la restauración desde
  // suspend_data ({found}) reconstruya exactamente el mismo tablero.
  register('word_search', function (el, data, ctx) {
    // PRNG sembrado (mulberry32) con hash del id: mismo tablero en cada sesión.
    function seedOf(s) {
      var h = 1779033703 ^ s.length;
      for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
      return h >>> 0;
    }
    function mulberry32(a) {
      return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        var t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    // Normaliza para el tablero: mayúsculas, sin acentos (Ñ se conserva), sin espacios.
    var NTILDE = String.fromCharCode(209); // letra enye
    var WSMARK = String.fromCharCode(1);   // marcador interno (nunca visible)
    var DIACRITICS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
    function norm(w) {
      return String(w || '').toUpperCase()
        .split(NTILDE).join(WSMARK) // aparta la enye para que NFD no la descomponga
        .normalize('NFD').replace(DIACRITICS, '') // quita acentos
        .split(WSMARK).join(NTILDE)
        .replace(new RegExp('[^A-Z' + NTILDE + ']', 'g'), '');
    }

    var rawWords = ((data.config || {}).words || []).map(function (w) { return String(w || '').trim(); }).filter(Boolean);
    var words = [];
    var wordMap = {}; // normalizada -> original (para la lista visible)
    rawWords.forEach(function (w) {
      var n = norm(w);
      if (n.length >= 3 && n.length <= 12 && !wordMap[n]) { words.push(n); wordMap[n] = w; }
    });

    if (!words.length) {
      el.innerHTML = header(data) + '<p class="me-warn">Sopa de letras sin palabras válidas (3–12 letras).</p>';
      return { result: function () { return { completed: true, scored: false }; } };
    }

    var rnd = mulberry32(seedOf(String(data.id)));
    var maxLen = words.reduce(function (m, w) { return Math.max(m, w.length); }, 0);
    var size = Math.max(8, Math.min(14, maxLen, 14));
    size = Math.max(size, Math.min(14, maxLen + 2, Math.ceil(Math.sqrt(words.join('').length * 2.2))));

    // Colocación: 4 direcciones (→ ↓ ↘ ↗), con reintentos; permite cruces
    // compatibles (misma letra en la celda).
    var DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];
    var grid = [], placements = {}; // palabra -> [ [r,c], ... ]
    for (var r = 0; r < size; r++) { grid.push([]); for (var q = 0; q < size; q++) grid[r].push(''); }
    // Las largas primero: más difíciles de encajar.
    var toPlace = words.slice().sort(function (a, b) { return b.length - a.length; });
    toPlace.forEach(function (w) {
      for (var att = 0; att < 200; att++) {
        var d = DIRS[Math.floor(rnd() * DIRS.length)];
        var r0 = Math.floor(rnd() * size), c0 = Math.floor(rnd() * size);
        var rEnd = r0 + d[0] * (w.length - 1), cEnd = c0 + d[1] * (w.length - 1);
        if (rEnd < 0 || rEnd >= size || cEnd < 0 || cEnd >= size) continue;
        var cells = [], ok = true;
        for (var k = 0; k < w.length; k++) {
          var rr = r0 + d[0] * k, cc = c0 + d[1] * k;
          if (grid[rr][cc] && grid[rr][cc] !== w[k]) { ok = false; break; }
          cells.push([rr, cc]);
        }
        if (!ok) continue;
        cells.forEach(function (rc, k2) { grid[rc[0]][rc[1]] = w[k2]; });
        placements[w] = cells;
        return;
      }
      // Sin hueco tras 200 intentos: la palabra queda fuera del tablero (y de la
      // lista), para no dejar una palabra imposible de encontrar.
    });
    words = words.filter(function (w) { return placements[w]; });

    // Relleno sesgado a las letras de las propias palabras (dificulta sin frustrar).
    var poolLetters = (words.join('') + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('');
    for (var r2 = 0; r2 < size; r2++) for (var c2 = 0; c2 < size; c2++) {
      if (!grid[r2][c2]) grid[r2][c2] = poolLetters[Math.floor(rnd() * poolLetters.length)];
    }

    var found = (ctx.state && ctx.state.found) || []; // palabras normalizadas
    found = found.filter(function (w) { return placements[w]; });

    var html = header(data) + '<div class="me-ws">' +
      '<div class="me-ws-grid" role="group" aria-label="Tablero de la sopa de letras" style="--me-ws-size:' + size + '">';
    for (var r3 = 0; r3 < size; r3++) for (var c3 = 0; c3 < size; c3++) {
      html += '<button type="button" class="me-ws-cell" data-r="' + r3 + '" data-c="' + c3 + '"' +
        ' aria-label="Fila ' + (r3 + 1) + ', columna ' + (c3 + 1) + ': ' + grid[r3][c3] + '">' + grid[r3][c3] + '</button>';
    }
    html += '</div><ul class="me-ws-words" aria-label="Palabras a encontrar">';
    words.forEach(function (w) {
      html += '<li class="me-ws-word' + (found.indexOf(w) !== -1 ? ' is-found' : '') + '" data-w="' + esc(w) + '">' + esc(wordMap[w]) + '</li>';
    });
    html += '</ul></div>' + feedbackBox(data);
    el.innerHTML = html;

    var cellAt = function (r4, c4) { return el.querySelector('.me-ws-cell[data-r="' + r4 + '"][data-c="' + c4 + '"]'); };
    function markFound(w) {
      (placements[w] || []).forEach(function (rc) { cellAt(rc[0], rc[1]).classList.add('is-found'); });
      var li = el.querySelector('.me-ws-word[data-w="' + w + '"]');
      if (li) li.classList.add('is-found');
    }
    found.forEach(markFound);

    var first = null; // celda inicial seleccionada
    function clearPick() {
      if (first) { first.classList.remove('is-picked'); first = null; }
    }
    function lineBetween(a, b) {
      // Devuelve las celdas de la recta a→b si es horizontal/vertical/diagonal.
      var dr = b.r - a.r, dc = b.c - a.c;
      var len = Math.max(Math.abs(dr), Math.abs(dc)) + 1;
      if (!(dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc))) return null;
      var sr = dr === 0 ? 0 : (dr > 0 ? 1 : -1), sc = dc === 0 ? 0 : (dc > 0 ? 1 : -1);
      var cells = [];
      for (var k = 0; k < len; k++) cells.push([a.r + sr * k, a.c + sc * k]);
      return cells;
    }
    function wordDone() { return words.every(function (w) { return found.indexOf(w) !== -1; }); }

    el.querySelector('.me-ws-grid').addEventListener('click', function (e) {
      var cell = e.target.closest('.me-ws-cell');
      if (!cell || wordDone()) return;
      var pt = { r: +cell.getAttribute('data-r'), c: +cell.getAttribute('data-c') };
      if (!first) {
        first = cell;
        cell.classList.add('is-picked');
        ctx.announce('Letra inicial marcada. Toca la última letra de la palabra.');
        return;
      }
      if (cell === first) { clearPick(); return; }
      var a = { r: +first.getAttribute('data-r'), c: +first.getAttribute('data-c') };
      var cells = lineBetween(a, pt);
      clearPick();
      if (!cells) { ctx.announce('La selección debe ser una línea recta.'); return; }
      var s = cells.map(function (rc) { return grid[rc[0]][rc[1]]; }).join('');
      var rev = s.split('').reverse().join('');
      var hit = null;
      words.forEach(function (w) {
        if (found.indexOf(w) !== -1) return;
        if (w === s || w === rev) hit = w;
      });
      if (hit) {
        found.push(hit);
        markFound(hit);
        ctx.save({ found: found });
        ctx.announce('«' + wordMap[hit] + '» encontrada. ' + (words.length - found.length) + ' restantes.');
        if (wordDone()) showFeedback(el, true, data);
      } else {
        ctx.announce('Ahí no hay ninguna palabra de la lista.');
      }
    });

    if (wordDone()) showFeedback(el, true, data);

    return {
      result: function () {
        var all = wordDone();
        var pts = data.points || 1;
        return {
          completed: all,
          scored: !!data.scored,
          correct: all,
          score: Math.round(pts * (found.length / words.length) * 100) / 100,
          maxScore: pts,
        };
      },
      hasAnswer: function () { return found.length > 0; },
    };
  });

  // Normalización compartida de respuestas/letras: mayúsculas, sin acentos
  // (la enye se preserva), solo A-Z + enye. Misma regla que la sopa de letras.
  var NTILDE = String.fromCharCode(209);
  var normLetters = (function () {
    var MARK = String.fromCharCode(1);
    var DIACRITICS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
    return function (s) {
      return String(s || '').toUpperCase()
        .split(NTILDE).join(MARK)
        .normalize('NFD').replace(DIACRITICS, '')
        .split(MARK).join(NTILDE)
        .replace(new RegExp('[^A-Z' + NTILDE + '0-9 ]', 'g'), '')
        .replace(/\s+/g, ' ').trim();
    };
  })();
  // PRNG determinista compartido (mismo tablero en cada sesión por id).
  function seededRandom(seedStr) {
    var h = 1779033703 ^ seedStr.length;
    for (var i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    var a = h >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // Tarjeta de pregunta de opción única reutilizable (vídeo interactivo, imagen
  // oculta): pinta enunciado + opciones, 1 intento, feedback, persiste vía cb.
  function questionCard(box, q, prev, fallbackFb, onAnswer) {
    var h = '<div class="me-iv-q" role="group" aria-label="Pregunta">' +
      '<p class="me-iv-prompt">' + rich(q.prompt) + '</p><div class="me-iv-opts">';
    (q.options || []).forEach(function (o, j) {
      h += '<button type="button" class="me-iv-opt' +
        (prev && prev.choice === j ? (prev.correct ? ' is-right' : ' is-wrong') : '') +
        '" data-j="' + j + '"' + (prev ? ' disabled' : '') + '>' + rich(o.text) + '</button>';
    });
    h += '</div><div class="me-iv-fb"' + (prev ? '' : ' hidden') + '></div></div>';
    box.innerHTML = h;
    var fb = box.querySelector('.me-iv-fb');
    function showFb(o, ok) {
      fb.hidden = false;
      fb.className = 'me-iv-fb ' + (ok ? 'is-ok' : 'is-error');
      fb.innerHTML = '<strong>' + (ok ? '✔ ' : '✖ ') + '</strong>' +
        rich(o.feedback || (ok ? (fallbackFb.correct || 'Correcto.') : (fallbackFb.incorrect || 'No es correcto.')));
    }
    if (prev) showFb(q.options[prev.choice] || {}, prev.correct);
    box.querySelector('.me-iv-opts').addEventListener('click', function (e) {
      var btn = e.target.closest('.me-iv-opt');
      if (!btn || btn.disabled) return;
      var j = +btn.getAttribute('data-j');
      var ok = !!q.options[j].correct;
      btn.classList.add(ok ? 'is-right' : 'is-wrong');
      [].slice.call(box.querySelectorAll('.me-iv-opt')).forEach(function (b) { b.disabled = true; });
      showFb(q.options[j], ok);
      onAnswer(j, ok);
    });
  }

  // --- 20. Crucigrama (crossword) ----------------------------------------------
  // config.entries: [{ word, clue }]. Evaluable con Comprobar + intentos (como
  // fill_blanks). El layout se autocalcula con cruces, determinista por id; las
  // palabras sin encaje se descartan (nunca una pista sin casillas). Autoavance:
  // escribir una letra salta solo a la siguiente casilla de la palabra activa
  // (Retroceso en una casilla vacía vuelve a la anterior); en una casilla de
  // cruce, clicarla dos veces seguidas cambia de dirección (across/down) — ver
  // `cellDir`/`curDir` más abajo.
  register('crossword', function (el, data, ctx) {
    var entries = ((data.config || {}).entries || []).map(function (en) {
      // Solo letras: normLetters conserva dígitos y espacios, aquí sobran.
      return { word: normLetters(en.word || '').replace(/[0-9 ]/g, ''), clue: String(en.clue || '').trim() };
    }).filter(function (en) { return en.word.length >= 3 && en.word.length <= 12 && en.clue; });
    // Dedup
    var seenW = {};
    entries = entries.filter(function (en) { if (seenW[en.word]) return false; seenW[en.word] = 1; return true; });

    if (!entries.length) {
      el.innerHTML = header(data) + '<p class="me-warn">Crucigrama sin palabras válidas (3–12 letras con pista).</p>';
      return { result: function () { return { completed: true, scored: false }; } };
    }

    // Colocación con cruces sobre un grid disperso {'r,c': letra}.
    var grid = {}, placed = [];
    function cellsOf(word, r, c, dr, dc) {
      var cells = [];
      for (var k = 0; k < word.length; k++) cells.push([r + dr * k, c + dc * k]);
      return cells;
    }
    function fits(word, r, c, dr, dc) {
      // Casilla previa y posterior libres (no alargar otra palabra).
      if (grid[(r - dr) + ',' + (c - dc)] != null) return false;
      if (grid[(r + dr * word.length) + ',' + (c + dc * word.length)] != null) return false;
      var crosses = 0;
      for (var k = 0; k < word.length; k++) {
        var rr = r + dr * k, cc = c + dc * k;
        var cur = grid[rr + ',' + cc];
        if (cur != null) {
          if (cur !== word[k]) return false;
          crosses++;
        } else {
          // Sin vecinos laterales (evita palabras pegadas ilegibles).
          if (grid[(rr + dc) + ',' + (cc + dr)] != null) return false;
          if (grid[(rr - dc) + ',' + (cc - dr)] != null) return false;
        }
      }
      return placed.length === 0 || crosses > 0;
    }
    function put(word, clue, r, c, dr, dc) {
      cellsOf(word, r, c, dr, dc).forEach(function (rc, k) { grid[rc[0] + ',' + rc[1]] = word[k]; });
      placed.push({ word: word, clue: clue, r: r, c: c, dr: dr, dc: dc });
    }
    var sorted = entries.slice().sort(function (a, b) { return b.word.length - a.word.length; });
    put(sorted[0].word, sorted[0].clue, 0, 0, 0, 1); // la más larga, horizontal
    sorted.slice(1).forEach(function (en) {
      var w = en.word;
      for (var pi = 0; pi < placed.length; pi++) {
        var p = placed[pi];
        var pdr = p.dr === 0 ? 1 : 0, pdc = p.dc === 0 ? 1 : 0; // perpendicular
        for (var k = 0; k < w.length; k++) {
          for (var m = 0; m < p.word.length; m++) {
            if (p.word[m] !== w[k]) continue;
            var cr = p.r + p.dr * m, cc = p.c + p.dc * m; // celda de cruce
            var r0 = cr - pdr * k, c0 = cc - pdc * k;
            if (fits(w, r0, c0, pdr, pdc)) { put(w, en.clue, r0, c0, pdr, pdc); return; }
          }
        }
      }
      // sin encaje: descartada
    });

    // Bounding box y numeración en orden de lectura.
    var minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
    Object.keys(grid).forEach(function (key) {
      var p2 = key.split(',');
      minR = Math.min(minR, +p2[0]); maxR = Math.max(maxR, +p2[0]);
      minC = Math.min(minC, +p2[1]); maxC = Math.max(maxC, +p2[1]);
    });
    placed.forEach(function (p) { p.r -= minR; p.c -= minC; });
    var rows = maxR - minR + 1, cols = maxC - minC + 1;
    placed.sort(function (a, b) { return (a.r - b.r) || (a.c - b.c) || (a.dr - b.dr); });
    var numAt = {}, nextNum = 1;
    placed.forEach(function (p) {
      var key = p.r + ',' + p.c;
      if (!numAt[key]) numAt[key] = nextNum++;
      p.num = numAt[key];
    });

    // Qué dirección(es) pasan por cada casilla (una casilla de cruce admite
    // las dos) — para saber hacia dónde saltar sola al escribir una letra.
    var cellDir = {};
    placed.forEach(function (p) {
      cellsOf(p.word, p.r, p.c, p.dr, p.dc).forEach(function (rc) {
        var k = rc[0] + ',' + rc[1];
        if (!cellDir[k]) cellDir[k] = { across: false, down: false };
        if (p.dc === 1) cellDir[k].across = true; else cellDir[k].down = true;
      });
    });

    var values = (ctx.state && ctx.state.values) || {}; // 'r,c' -> letra
    var maxAtt = attemptsOf(data);

    var html = header(data) + '<div class="me-cw">' +
      '<div class="me-cw-grid" style="--me-cw-cols:' + cols + '" role="group" aria-label="Casillas del crucigrama">';
    for (var r = 0; r < rows; r++) for (var c2 = 0; c2 < cols; c2++) {
      var key2 = (r + minR) + ',' + (c2 + minC);
      if (grid[key2] == null) { html += '<span class="me-cw-void"></span>'; continue; }
      var k2 = r + ',' + c2;
      html += '<span class="me-cw-box">' + (numAt[k2] ? '<i class="me-cw-num">' + numAt[k2] + '</i>' : '') +
        '<input class="me-cw-cell" maxlength="2" data-k="' + k2 + '" value="' + esc(values[k2] || '') + '"' +
        ' aria-label="Casilla fila ' + (r + 1) + ', columna ' + (c2 + 1) + '"></span>';
    }
    html += '</div><div class="me-cw-clues">';
    ['Horizontales', 'Verticales'].forEach(function (title, v) {
      var list = placed.filter(function (p) { return (v === 0 ? p.dc === 1 : p.dr === 1); });
      if (!list.length) return;
      html += '<p class="me-cw-clues-head">' + title + '</p><ol class="me-cw-clue-list">';
      list.forEach(function (p) {
        html += '<li value="' + p.num + '" data-w="' + esc(p.word) + '">' + rich(p.clue) + ' <span class="me-cw-len">(' + p.word.length + ')</span></li>';
      });
      html += '</ol>';
    });
    html += '</div></div><button class="me-btn me-check">Comprobar</button><span class="me-attempts" aria-live="polite"></span>' + feedbackBox(data);
    el.innerHTML = html;

    var inputs = [].slice.call(el.querySelectorAll('.me-cw-cell'));
    var attempts = 0, done = false, correct = false;
    var updateAttempts = attemptsHint(el, maxAtt);
    // config.force_complete: ausente o true (proyectos antiguos) → Comprobar solo
    // se activa con TODAS las casillas rellenas; false → basta con una letra (las
    // palabras incompletas cuentan como fallo). Hay que pulsar Comprobar igualmente.
    var force = (data.config || {}).force_complete !== false;
    var refreshCheck = wireCheck(el, function () {
      return force
        ? inputs.every(function (inp) { return normLetters(inp.value).length === 1; })
        : inputs.some(function (inp) { return normLetters(inp.value).length === 1; });
    });

    // Autoavance: al escribir una letra, el foco salta solo a la siguiente
    // casilla de la palabra que se está rellenando (y Retroceso en una casilla
    // ya vacía vuelve a la anterior) — así no hay que clicar cada casilla una
    // a una. `curDir` es la dirección activa («across»/«down»); una casilla de
    // cruce (pasan las dos palabras) la cambia al clicarla dos veces seguidas,
    // igual que en un crucigrama de periódico. Por teclado (Tab, o el salto
    // automático) se mantiene la dirección mientras la casilla la admita.
    var curDir = 'across';
    var lastClickedKey = null;
    function dirsOf(k) { return cellDir[k] || { across: false, down: false }; }
    function neighborKey(k, dir, delta) {
      var rc = k.split(',').map(Number);
      if (dir === 'across') rc[1] += delta; else rc[0] += delta;
      return rc[0] + ',' + rc[1];
    }
    function cellAt(k) { return el.querySelector('.me-cw-cell[data-k="' + k + '"]'); }
    el.addEventListener('focusin', function (e) {
      var inp = e.target.closest('.me-cw-cell');
      if (!inp) return;
      var d = dirsOf(inp.getAttribute('data-k'));
      if (!d[curDir]) curDir = d.across ? 'across' : 'down';
    });
    el.addEventListener('click', function (e) {
      var inp = e.target.closest('.me-cw-cell');
      if (!inp) return;
      var k = inp.getAttribute('data-k');
      var d = dirsOf(k);
      if (k === lastClickedKey && d.across && d.down) curDir = curDir === 'across' ? 'down' : 'across';
      lastClickedKey = k;
    });
    el.addEventListener('input', function (e) {
      var inp = e.target.closest('.me-cw-cell');
      if (!inp || done) return;
      var ch = normLetters(inp.value).slice(-1);
      inp.value = ch;
      refreshCheck(true);
      if (ch) {
        var next = cellAt(neighborKey(inp.getAttribute('data-k'), curDir, 1));
        if (next) { next.focus(); next.select(); }
      }
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Backspace' || done) return;
      var inp = e.target.closest('.me-cw-cell');
      if (!inp || inp.value) return; // solo si la casilla ya estaba vacía
      var prev = cellAt(neighborKey(inp.getAttribute('data-k'), curDir, -1));
      if (prev) {
        e.preventDefault();
        prev.value = '';
        prev.focus();
        prev.select();
        refreshCheck(true);
      }
    });

    function wordOk(p) {
      return cellsOf(p.word, p.r, p.c, p.dr, p.dc).every(function (rc, k) {
        var inp = el.querySelector('.me-cw-cell[data-k="' + rc[0] + ',' + rc[1] + '"]');
        return inp && normLetters(inp.value) === p.word[k];
      });
    }
    function markWords() {
      inputs.forEach(function (inp) { inp.classList.remove('is-right', 'is-wrong'); });
      placed.forEach(function (p) {
        var ok = wordOk(p);
        cellsOf(p.word, p.r, p.c, p.dr, p.dc).forEach(function (rc) {
          var inp = el.querySelector('.me-cw-cell[data-k="' + rc[0] + ',' + rc[1] + '"]');
          // Una casilla de cruce solo se marca bien si TODAS sus palabras lo están.
          if (!ok) inp.classList.add('is-wrong');
          else if (!inp.classList.contains('is-wrong')) inp.classList.add('is-right');
        });
      });
    }
    function okCount() { return placed.filter(wordOk).length; }
    function lock() {
      inputs.forEach(function (inp) { inp.disabled = true; });
      var cb = el.querySelector('.me-check'); if (cb) cb.disabled = true;
    }
    function saveState() {
      var vals = {};
      inputs.forEach(function (inp) { if (inp.value) vals[inp.getAttribute('data-k')] = inp.value; });
      ctx.save({ values: vals, attempts: attempts, correct: correct });
    }
    function hasAnswer() { return inputs.some(function (inp) { return !!inp.value; }); }
    function check() {
      if (done) return { resolved: true, correct: correct };
      // Con force_complete (por defecto en proyectos antiguos) exige todo relleno;
      // sin él, solo que haya al menos una letra.
      if (force ? inputs.some(function (inp) { return !inp.value; }) : !hasAnswer()) {
        ctx.announce(force ? 'Rellena todas las casillas.' : 'Escribe alguna letra antes de comprobar.');
        return { resolved: false, correct: false };
      }
      attempts++;
      correct = okCount() === placed.length;
      markWords();
      showFeedback(el, correct, data);
      done = correct || (maxAtt > 0 && attempts >= maxAtt);
      if (done) lock();
      updateAttempts(attempts, correct);
      saveState();
      ctx.announce(correct ? 'Crucigrama correcto.' : okCount() + ' de ' + placed.length + ' palabras correctas.' + (done ? ' Sin más intentos.' : ''));
      return { resolved: done, correct: correct };
    }
    el.querySelector('.me-check').addEventListener('click', check);

    if (ctx.state && typeof ctx.state.correct === 'boolean') {
      attempts = ctx.state.attempts || 0;
      correct = ctx.state.correct;
      markWords();
      showFeedback(el, correct, data);
      if (correct || (maxAtt > 0 && attempts >= maxAtt)) { done = true; lock(); }
    }
    updateAttempts(attempts, correct);
    if (!done) refreshCheck(false);

    return {
      result: function () {
        var pts = data.points || 1;
        return {
          completed: done, scored: !!data.scored, correct: correct,
          score: Math.round(pts * (okCount() / placed.length) * 100) / 100,
          maxScore: pts,
        };
      },
      check: check,
      hasAnswer: hasAnswer,
    };
  });

  // --- 21. Imagen oculta (hidden_image) ----------------------------------------
  // config: { image, alt, questions: [{prompt, options}] }. Cada acierto destapa
  // su parte de la imagen (losetas en orden aleatorio determinista); al terminar
  // todas las preguntas la imagen se muestra entera. 1 intento por pregunta.
  register('hidden_image', function (el, data, ctx) {
    var c = data.config || {};
    var questions = (c.questions || []).filter(function (q) {
      return q && String(q.prompt || '').trim() && (q.options || []).length >= 2;
    });
    var answers = (ctx.state && ctx.state.answers) || {}; // idx -> {choice, correct}
    var TILES = 12; // 4x3

    if (!questions.length || !c.image) {
      el.innerHTML = header(data) + '<p class="me-warn">Imagen oculta sin imagen o sin preguntas.</p>';
      return { result: function () { return { completed: true, scored: false }; } };
    }

    var html = header(data) + '<div class="me-hi">' +
      '<div class="me-hi-stage"><img src="' + esc(assetUrl(c.image)) + '" alt="' + esc(c.alt || '') + '">' +
      '<div class="me-hi-tiles" aria-hidden="true">';
    for (var t = 0; t < TILES; t++) html += '<span class="me-hi-tile" data-t="' + t + '"></span>';
    html += '</div></div>' +
      '<p class="me-hi-progress" aria-live="polite"></p>' +
      '<div class="me-hi-q"></div></div>';
    el.innerHTML = html;

    var rnd = seededRandom(String(data.id));
    var order = [];
    for (var i2 = 0; i2 < TILES; i2++) order.push(i2);
    order.sort(function () { return rnd() - 0.5; });

    var qBox = el.querySelector('.me-hi-q');
    var progressEl = el.querySelector('.me-hi-progress');

    function counts() {
      var done2 = 0, ok = 0;
      questions.forEach(function (_, i) { if (answers[i]) { done2++; if (answers[i].correct) ok++; } });
      return { done: done2, ok: ok };
    }
    function refreshTiles() {
      var st = counts();
      var reveal = st.done >= questions.length ? TILES : Math.floor(TILES * (st.ok / questions.length));
      order.forEach(function (tileIdx, pos) {
        var tile = el.querySelector('.me-hi-tile[data-t="' + tileIdx + '"]');
        tile.classList.toggle('is-open', pos < reveal);
      });
      progressEl.textContent = st.done >= questions.length
        ? 'Imagen desvelada: ' + st.ok + ' de ' + questions.length + ' aciertos.'
        : 'Preguntas: ' + st.done + ' de ' + questions.length + ' · cada acierto destapa la imagen.';
    }
    function nextPending() {
      for (var i = 0; i < questions.length; i++) if (!answers[i]) return i;
      return -1;
    }
    function renderCurrent() {
      var i = nextPending();
      refreshTiles();
      if (i === -1) {
        var st = counts();
        qBox.innerHTML = '<p class="me-hi-end">' + (st.ok === questions.length
          ? rich(data.feedback.correct || '¡Imagen desvelada al completo!')
          : 'Actividad terminada: ' + st.ok + ' de ' + questions.length + ' aciertos.') + '</p>';
        return;
      }
      questionCard(qBox, questions[i], null, data.feedback, function (j, ok) {
        answers[i] = { choice: j, correct: ok };
        ctx.save({ answers: answers });
        ctx.announce(ok ? 'Correcto: se destapa parte de la imagen.' : 'Incorrecto.');
        setTimeout(renderCurrent, 1200); // deja leer el feedback antes de avanzar
      });
    }
    renderCurrent();

    return {
      result: function () {
        var st = counts();
        var pts = data.points || 1;
        return {
          completed: st.done >= questions.length,
          scored: !!data.scored,
          correct: st.ok === questions.length,
          score: Math.round(pts * (st.ok / questions.length) * 100) / 100,
          maxScore: pts,
        };
      },
      hasAnswer: function () { return counts().done > 0; },
    };
  });

  // --- 22. Rosco A-Z (az_quiz, tipo pasapalabra) --------------------------------
  // config.items: [{ clue, answer }] — la letra se deriva de la respuesta. El
  // alumno escribe la respuesta o pasa palabra (la letra vuelve en la siguiente
  // vuelta). Autovalidante: sin Comprobar ni attempts; 1 oportunidad por letra.
  //
  // `res` se guarda por `origIdx` (posición en `config.items` YA filtrado, sin
  // ordenar) — NUNCA por la posición en `items` (orden alfabético de PINTADO,
  // que se deriva de la respuesta). Si no fuera así, editar el texto de una
  // respuesta y que le cambie la inicial reordenaría el rosco entero y
  // desplazaría lo ya respondido de OTRAS preguntas al reanudar. `origIdx` es
  // estable frente a ese caso (solo se ve afectado por añadir/quitar/reordenar
  // entradas de `config.items`, el mismo límite que ya tienen accordion/tabs/
  // flip_cards/case_practice/flashcards, indexados igual). state_codec.js
  // (`azQuizItems`) usa el mismo orden de autor, sin ordenar por letra, para
  // que las posiciones que guarda coincidan con `origIdx`.
  register('az_quiz', function (el, data, ctx) {
    var itemsByAuthor = ((data.config || {}).items || []).map(function (q) {
      var answer = String(q.answer || '').trim();
      return { clue: String(q.clue || '').trim(), answer: answer, letter: normLetters(answer).charAt(0) };
    }).filter(function (q) { return q.clue && q.answer && q.letter; });
    // `items`: mismo contenido, orden de PINTADO (alfabético); cada uno
    // recuerda su `origIdx` (posición estable en itemsByAuthor) para guardar.
    var items = itemsByAuthor.map(function (q, origIdx) {
      return { origIdx: origIdx, clue: q.clue, answer: q.answer, letter: q.letter };
    });
    items.sort(function (a, b) { return a.letter < b.letter ? -1 : a.letter > b.letter ? 1 : 0; });

    if (!items.length) {
      el.innerHTML = header(data) + '<p class="me-warn">Rosco sin definiciones válidas.</p>';
      return { result: function () { return { completed: true, scored: false }; } };
    }

    var res = (ctx.state && ctx.state.res) || {}; // origIdx -> {given, correct}

    var html = header(data) + '<div class="me-az">' +
      '<div class="me-az-letters" role="group" aria-label="Letras del rosco">';
    items.forEach(function (q, i) {
      html += '<span class="me-az-letter" data-i="' + i + '">' + esc(q.letter) + '</span>';
    });
    html += '</div><div class="me-az-play"></div></div>';
    el.innerHTML = html;

    var playBox = el.querySelector('.me-az-play');
    function chip(i) { return el.querySelector('.me-az-letter[data-i="' + i + '"]'); }
    function refreshChips(currentI) {
      items.forEach(function (q, i) {
        var cEl = chip(i);
        var r = res[q.origIdx];
        cEl.className = 'me-az-letter' +
          (r ? (r.correct ? ' is-right' : ' is-wrong') : '') +
          (i === currentI ? ' is-current' : '');
      });
    }
    // `from`/el resultado son índices de PINTADO (posición en `items`), para
    // poder recorrer el rosco en orden alfabético; solo la consulta a `res`
    // pasa por `origIdx`.
    function nextPending(from) {
      for (var k = 1; k <= items.length; k++) {
        var i = (from + k) % items.length;
        if (!res[items[i].origIdx]) return i;
      }
      return -1;
    }
    function displayIndexOfOrigIdx(origIdx) {
      for (var i = 0; i < items.length; i++) if (items[i].origIdx === origIdx) return i;
      return -1; // la pregunta ya no existe (se quitó de config.items): se ignora
    }
    var current = res.__last != null ? nextPending(displayIndexOfOrigIdx(res.__last)) : (function () {
      for (var i = 0; i < items.length; i++) if (!res[items[i].origIdx]) return i;
      return -1;
    })();

    function counts() {
      var done2 = 0, ok = 0;
      items.forEach(function (q) { var r = res[q.origIdx]; if (r) { done2++; if (r.correct) ok++; } });
      return { done: done2, ok: ok };
    }
    function renderPlay() {
      refreshChips(current);
      if (current === -1) {
        var st = counts();
        playBox.innerHTML = '<p class="me-az-end">Rosco terminado: <strong>' + st.ok + ' de ' + items.length + '</strong> aciertos.</p>';
        return;
      }
      var q = items[current];
      // Cota de longitud del texto tecleado: sin ella es texto libre sin
      // límite y su peor caso pesaría lo que quisiera en suspend_data. Nunca
      // por debajo de la propia respuesta (+margen para despistes/espacios).
      // state_codec.js (estimateSuspendSize) usa la MISMA fórmula.
      var azMaxLen = Math.min(120, Math.max(40, q.answer.length + 10));
      playBox.innerHTML =
        '<p class="me-az-clue"><span class="me-az-starts">Empieza por ' + esc(q.letter) + '</span> ' + rich(q.clue) + '</p>' +
        '<div class="me-az-controls">' +
        '<input class="me-az-input" type="text" autocomplete="off" maxlength="' + azMaxLen + '" aria-label="Tu respuesta">' +
        '<button type="button" class="me-btn me-primary me-az-send">Responder</button>' +
        '<button type="button" class="me-btn me-az-pass">Pasapalabra</button></div>' +
        '<div class="me-iv-fb" hidden></div>';
      var input = playBox.querySelector('.me-az-input');
      var fb = playBox.querySelector('.me-iv-fb');
      input.focus();
      function advance() {
        current = nextPending(current);
        renderPlay();
      }
      function answer() {
        var given = input.value.trim();
        if (!given) { ctx.announce('Escribe una respuesta o pulsa Pasapalabra.'); return; }
        var ok = normLetters(given) === normLetters(items[current].answer);
        // Solo se guarda texto para las respuestas INCORRECTAS, y solo su
        // forma normalizada y ASCII, recortada a `azMaxLen` — el feedback
        // SIEMPRE muestra la respuesta correcta del propio contenido, nunca
        // lo que escribió el alumno, así que no hace falta conservarlo tal
        // cual. `normLetters` ya quita tildes pero conserva la Ñ (no es
        // ASCII): se sustituye por N en vez de borrarla (perderla del todo
        // convertiría "NIÑO" en "NIO", no en "NINO"). Un estado antiguo con
        // `given` sin normalizar se sigue leyendo igual (la comparación de
        // más abajo, al restaurar, usa normLetters sobre lo que haya,
        // normalizado o no).
        res[items[current].origIdx] = ok
          ? { correct: true }
          : { given: normLetters(given).split(String.fromCharCode(209)).join('N').slice(0, azMaxLen), correct: false };
        res.__last = items[current].origIdx;
        ctx.save({ res: res });
        fb.hidden = false;
        fb.className = 'me-iv-fb ' + (ok ? 'is-ok' : 'is-error');
        fb.innerHTML = '<strong>' + (ok ? '✔ ' : '✖ ') + '</strong>' +
          (ok ? 'Correcto.' : 'La respuesta era «' + rich(items[current].answer) + '».');
        refreshChips(-1);
        ctx.announce(ok ? 'Correcto.' : 'Incorrecto. La respuesta era ' + items[current].answer + '.');
        playBox.querySelector('.me-az-send').disabled = true;
        playBox.querySelector('.me-az-pass').disabled = true;
        input.disabled = true;
        setTimeout(advance, 1400);
      }
      playBox.querySelector('.me-az-send').addEventListener('click', answer);
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') answer(); });
      playBox.querySelector('.me-az-pass').addEventListener('click', function () {
        ctx.announce('Pasapalabra. La letra ' + items[current].letter + ' volverá después.');
        advance();
      });
    }
    renderPlay();

    return {
      result: function () {
        var st = counts();
        var pts = data.points || 1;
        return {
          completed: st.done >= items.length,
          scored: !!data.scored,
          correct: st.ok === items.length,
          score: Math.round(pts * (st.ok / items.length) * 100) / 100,
          maxScore: pts,
        };
      },
      hasAnswer: function () { return counts().done > 0; },
    };
  });

  // --- 23. Puzzle de imagen ------------------------------------------------------
  // config: { image, alt, cols?, rows? } (def. 3×3). Piezas barajadas de forma
  // determinista; tocar dos piezas las intercambia (mismo criterio accesible
  // «tocar y colocar»). Completa al resolverse.
  register('puzzle', function (el, data, ctx) {
    var c = data.config || {};
    var cols = Math.min(5, Math.max(2, +c.cols || 3));
    var rows = Math.min(5, Math.max(2, +c.rows || 3));
    var n = cols * rows;

    if (!c.image) {
      el.innerHTML = header(data) + '<p class="me-warn">Puzzle sin imagen.</p>';
      return { result: function () { return { completed: true, scored: false }; } };
    }

    var order = (ctx.state && ctx.state.order) || null; // posición -> pieza
    var solvedOnce = !!(ctx.state && ctx.state.solved);
    if (!order || order.length !== n) {
      var rnd = seededRandom(String(data.id));
      order = [];
      for (var i = 0; i < n; i++) order.push(i);
      do {
        order.sort(function () { return rnd() - 0.5; });
      } while (order.every(function (p, i3) { return p === i3; }));
    }

    var html = header(data) + '<div class="me-pz" role="group" aria-label="Puzzle">' +
      '<div class="me-pz-grid" style="--me-pz-cols:' + cols + '; --me-pz-rows:' + rows + '">';
    for (var pos = 0; pos < n; pos++) html += '<button type="button" class="me-pz-piece" data-pos="' + pos + '"></button>';
    html += '</div><p class="me-pz-status" aria-live="polite"></p></div>';
    el.innerHTML = html;

    var gridEl = el.querySelector('.me-pz-grid');
    var statusEl = el.querySelector('.me-pz-status');
    var pieces = [].slice.call(el.querySelectorAll('.me-pz-piece'));
    var url = assetUrl(c.image);

    function paint() {
      pieces.forEach(function (btn, pos2) {
        var piece = order[pos2];
        var pr = Math.floor(piece / cols), pc = piece % cols;
        btn.style.backgroundImage = 'url("' + url + '")';
        btn.style.backgroundPosition = (cols > 1 ? (pc / (cols - 1)) * 100 : 0) + '% ' + (rows > 1 ? (pr / (rows - 1)) * 100 : 0) + '%';
        btn.setAttribute('aria-label', 'Pieza en posición ' + (pos2 + 1));
        btn.classList.toggle('is-home', piece === pos2);
      });
    }
    function solved() { return order.every(function (p, i4) { return p === i4; }); }
    function refreshStatus() {
      var okN = order.filter(function (p, i5) { return p === i5; }).length;
      statusEl.textContent = solved()
        ? '¡Puzzle resuelto!'
        : okN + ' de ' + n + ' piezas en su sitio. Toca dos piezas para intercambiarlas.';
    }

    var picked = -1;
    function finish() {
      gridEl.classList.add('is-solved');
      pieces.forEach(function (b) { b.disabled = true; });
      ctx.announce('Puzzle resuelto.');
    }
    gridEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.me-pz-piece');
      if (!btn || solved()) return;
      var pos3 = +btn.getAttribute('data-pos');
      if (picked === -1) {
        picked = pos3;
        btn.classList.add('is-picked');
        return;
      }
      var a = picked; picked = -1;
      pieces[a].classList.remove('is-picked');
      if (a === pos3) return;
      var tmp = order[a]; order[a] = order[pos3]; order[pos3] = tmp;
      paint();
      refreshStatus();
      if (solved()) { solvedOnce = true; finish(); }
      ctx.save({ order: order, solved: solvedOnce });
    });

    paint();
    refreshStatus();
    if (solved()) finish();

    return {
      result: function () {
        var ok = solvedOnce || solved();
        return {
          completed: ok, scored: !!data.scored, correct: ok,
          score: ok ? (data.points || 1) : 0, maxScore: data.points || 1,
        };
      },
      hasAnswer: function () { return solvedOnce || solved(); },
    };
  });

  global.Interactions = { register: register, render: function (el, data, ctx) {
    var f = registry[data.type];
    if (!f) { el.innerHTML = '<p class="me-warn">Tipo de interacción no soportado: ' + esc(data.type) + '</p>'; return { result: function () { return { completed: true, scored: false }; } }; }
    return f(el, data, ctx);
  }, esc: esc, rich: rich, stripTags: stripTags, asset: assetUrl, shuffle: shuffle, stopItemAudio: stopItemAudio, setItemAudioRate: setItemAudioRate, setItemAudioVolume: setItemAudioVolume, normLetters: normLetters, evalFormula: evalFormula, parseUserNumber: parseUserNumber };
})(window);
