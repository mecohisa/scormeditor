/* =============================================================================
 * renderer.js — Renderizadores de pantalla (uno por tipo de screen)
 * Renderer.render(container, screen, ctx) -> { interaction: controller|null }
 *   ctx = { state, save(state), announce(msg) }  (para la interacción)
 * Convierte student_text (markdown ligero) a HTML seguro.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var esc = global.Interactions.esc;
  var asset = global.Interactions.asset;
  var rich = global.Interactions.rich;

  // Markdown ligero y SEGURO -> HTML. Soporta:
  //   ## / ### encabezados, **negrita**, *cursiva*, [texto](url),
  //   listas con "- ", listas numeradas con "1. ",
  //   bloques destacados:  ::: tip|warn|important|info ... :::
  // Todo el texto pasa por inline()/rich() que escapa antes de aplicar formato.
  // Colores alineados con la paleta corporativa de teleformación:
  //   #6DC3C0 turquesa · #F4C910 naranja · #F4D6D2 rosa · #7787BF violeta.
  var CALLOUTS = {
    tip:       { cls: 'me-callout-tip',       icon: '💡', label: 'Consejo' },
    info:      { cls: 'me-callout-info',      icon: 'ℹ️', label: 'Información' },
    warn:      { cls: 'me-callout-warn',      icon: '⚠️', label: 'Atención' },
    important: { cls: 'me-callout-important', icon: '📌', label: 'Importante' },
    fact:      { cls: 'me-callout-fact',      icon: '🧠', label: '¿Sabías que…?' },
    reflect:   { cls: 'me-callout-reflect',   icon: '💭', label: 'Reflexiona' },
    case:      { cls: 'me-callout-case',      icon: '🧪', label: 'Caso práctico' },
    // Bloques con estructura (ver renderStats/renderColumns): solo se pintan
    // así, como callout, si les falta la estructura que necesitan.
    stats:     { cls: 'me-callout-info',      icon: '📊', label: 'Cifras destacadas' },
    compare:   { cls: 'me-callout-info',      icon: '⚖️', label: 'Comparativa' },
    dodont:    { cls: 'me-callout-info',      icon: '✅', label: 'Qué hacer y qué evitar' }
  };
  function renderCallout(type, innerHtml) {
    var c = CALLOUTS[type] || CALLOUTS.info;
    return '<aside class="me-callout ' + c.cls + '" role="note">' +
      '<p class="me-callout-title"><span class="me-callout-ico" aria-hidden="true">' + c.icon +
      '</span>' + c.label + '</p>' +
      '<div class="me-callout-body">' + innerHtml + '</div></aside>';
  }
  // Bloque personalizado: "::: custom | #color | icono | título". El color se
  // valida (solo hex) para evitar inyección en el atributo style; icono y título
  // se escapan como el resto del texto. Icono y título son OPCIONALES: si ambos
  // están vacíos no se pinta cabecera (queda solo el filete de color + cuerpo).
  function renderCustomCallout(params, innerHtml) {
    var parts = String(params).split('|');
    // Tras "::: custom" el resto empieza por "| ...", así que el primer segmento
    // llega vacío; lo descartamos para que color/icono/título caigan en su sitio.
    if (parts.length && parts[0].trim() === '') parts.shift();
    var color = (parts[0] || '').trim();
    var icon = (parts[1] || '').trim();
    var title = (parts[2] || '').trim();
    var safe = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#7787BF';
    var style = 'border-left-color:' + safe + ';background:color-mix(in srgb,' + safe + ' 18%,white);';
    var titleHtml = (icon || title)
      ? '<p class="me-callout-title">' +
          (icon ? '<span class="me-callout-ico" aria-hidden="true">' + esc(icon) + '</span>' : '') +
          esc(title) + '</p>'
      : '';
    return '<aside class="me-callout me-callout-custom" role="note" style="' + style + '">' +
      titleHtml +
      '<div class="me-callout-body">' + innerHtml + '</div></aside>';
  }

  // Bloques con estructura (::: stats | compare | dodont): el autor escribe
  // markdown normal dentro del bloque (lista, encabezados) y la carcasa lo
  // presenta como tarjetas o columnas, sin sintaxis propia. Si falta la
  // estructura que necesitan, devuelven null y el bloque se pinta como un
  // callout normal: nunca se pierde contenido.
  var STRUCTURED = { stats: 'Cifras destacadas', compare: 'Comparativa', dodont: 'Qué hacer y qué evitar' };
  var RE_LIST_ITEM = /^\s*(?:[-*•·–—]|\d+[.)])\s+(.*)$/;
  // Encabezado de columna: "## …"/"### …" o una línea que es solo negrita.
  function headingOf(ln) {
    var m = /^\s*#{2,3}\s+(.*)$/.exec(ln) || /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(ln);
    return m ? m[1] : null;
  }
  // Cifras: cada punto de la lista es «**cifra** texto» (la negrita inicial es
  // la cifra grande). Las líneas que no son de la lista van como entradilla.
  function renderStats(lines) {
    var intro = [], items = [];
    lines.forEach(function (ln) {
      var li = RE_LIST_ITEM.exec(ln);
      if (li) items.push(li[1]); else intro.push(ln);
    });
    if (!items.length) return null;
    var html = '<div class="me-block me-block-stats" role="group" aria-label="' + STRUCTURED.stats + '">' +
      blocksToHtml(intro) + '<ul class="me-stats">';
    items.forEach(function (t) {
      var m = /^\*\*(.+?)\*\*\s*[:–—-]?\s*(.*)$/.exec(t);
      html += '<li class="me-stat">' + (m ? '<strong class="me-stat-value">' + inline(m[1]) + '</strong>' : '') +
        '<span class="me-stat-label">' + inline(m ? m[2] : t) + '</span></li>';
    });
    return html + '</ul></div>';
  }
  // Comparativa / qué hacer-qué evitar: cada encabezado abre una columna con
  // lo que haya debajo. En dodont la 1.ª columna es «sí» (✓) y el resto «no» (✗).
  function renderColumns(type, lines) {
    var intro = [], cols = [];
    lines.forEach(function (ln) {
      var h = headingOf(ln);
      if (h !== null) cols.push({ title: h, lines: [] });
      else if (cols.length) cols[cols.length - 1].lines.push(ln);
      else intro.push(ln);
    });
    if (cols.length < 2) return null;
    var dodont = type === 'dodont';
    var html = '<div class="me-block me-block-' + type + '" role="group" aria-label="' + STRUCTURED[type] + '">' +
      blocksToHtml(intro) + '<div class="me-cols" style="--n:' + cols.length + '">';
    cols.forEach(function (c, k) {
      var tone = dodont ? (k === 0 ? ' is-do' : ' is-dont') : '';
      html += '<section class="me-col' + tone + '"><h3 class="me-col-title">' +
        (dodont ? '<span class="me-col-ico" aria-hidden="true">' + (k === 0 ? '✓' : '✗') + '</span>' : '') +
        inline(c.title) + '</h3>' + blocksToHtml(c.lines) + '</section>';
      if (!dodont && cols.length === 2 && k === 0) html += '<span class="me-cols-vs" aria-hidden="true">vs</span>';
    });
    return html + '</div></div>';
  }

  // Id de un vídeo de YouTube a partir de una URL completa (watch, youtu.be,
  // embed, shorts); null si no se reconoce. Réplica de `extractYoutubeId`
  // (src/media/youtube.ts): el editor sí puede importar ese módulo, este
  // runtime es JS plano sin build y no puede compartirlo (ver CLAUDE.md).
  function youtubeId(url) {
    var m = /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/.exec(url);
    return m ? m[1] : null;
  }

  function mdToHtml(text) {
    if (!text) return '';
    return blocksToHtml(String(text).split(/\r?\n/));
  }
  function blocksToHtml(lines) {
    var html = '', i;
    // Listas, con anidamiento por SANGRÍA: cada línea de ítem abre una sublista
    // si está más sangrada que la anterior (el editor escribe 2 espacios por
    // nivel; se admite cualquier sangría: 3–4 espacios o tabuladores también).
    // Pila de listas abiertas, cada una con su <li> abierto: {tag, indent}.
    var lists = [];
    function closeListsTo(depth) {
      while (lists.length > depth) html += '</li></' + lists.pop().tag + '>';
    }
    function closeLists() { closeListsTo(0); }
    function indentOf(s) { return /^[ 	]*/.exec(s)[0].replace(/	/g, '  ').length; }
    function listItem(tag, indent, openAttrs, liOpen) {
      while (lists.length && lists[lists.length - 1].indent > indent) closeListsTo(lists.length - 1);
      var top = lists[lists.length - 1];
      if (top && top.indent === indent && top.tag === tag) {
        html += '</li>';
      } else {
        // Mismo nivel pero otro tipo (viñeta ↔ número): se cierra esa lista y
        // se abre la nueva en el mismo sitio (dentro del <li> padre si lo hay).
        if (top && top.indent === indent) closeListsTo(lists.length - 1);
        html += '<' + tag + openAttrs + '>';
        lists.push({ tag: tag, indent: indent });
      }
      html += liOpen;
    }
    for (i = 0; i < lines.length; i++) {
      var ln = lines[i];
      // Alineación de encabezado/párrafo: prefijo "{center}"/"{right}" (izquierda
      // = sin marca, default implícito). Solo se aplica a esos dos casos más
      // abajo; listas y callouts la ignoran (fuera de alcance a propósito).
      var align = '';
      var am = /^\{(center|right)\}\s?/.exec(ln);
      if (am) { align = am[1]; ln = ln.slice(am[0].length); }
      // Apertura de bloque destacado: "::: tipo" o "::: custom | #color | icono | título".
      var open = /^\s*:::\s*([A-Za-z]+)\s*(.*)$/.exec(ln);
      if (open) {
        closeLists();
        var type = open[1].toLowerCase();
        var rest = open[2] || '';
        var inner = [];
        for (i++; i < lines.length && !/^\s*:::\s*$/.test(lines[i]); i++) inner.push(lines[i]);
        var structured = type === 'stats' ? renderStats(inner)
          : (type === 'compare' || type === 'dodont') ? renderColumns(type, inner) : null;
        if (structured) { html += structured; continue; }
        var innerHtml = blocksToHtml(inner);
        html += type === 'custom' ? renderCustomCallout(rest, innerHtml) : renderCallout(type, innerHtml);
        continue;
      }
      var h = /^(#{2,3})\s+(.*)$/.exec(ln); // ## y ### (h1 es el título)
      if (h) {
        closeLists();
        var lv = h[1].length;
        html += '<h' + lv + (align ? ' style="text-align:' + align + '"' : '') + '>' + inline(h[2]) + '</h' + lv + '>';
        continue;
      }
      // Línea que es SOLO negrita (con dos puntos opcionales) => encabezado.
      // Cubre títulos que el origen trae como "**Título**" en vez de "## Título".
      var bh = /^\s*\*\*(.+?)\*\*\s*:?\s*$/.exec(ln);
      if (bh) {
        closeLists();
        html += '<h3' + (align ? ' style="text-align:' + align + '"' : '') + '>' + inline(bh[1]) + '</h3>';
        continue;
      }
      var oli = /^\s*(\d+)[.)]\s+(.*)/.exec(ln);
      if (oli) {
        // Honra el número que escribió el autor (value="N"): así, aunque haya
        // párrafos entre los ítems y la lista se "parta" en varios <ol>, la
        // numeración sigue siendo 1, 2, 3 y no se reinicia a 1.
        listItem('ol', indentOf(ln), ' start="' + oli[1] + '"', '<li value="' + oli[1] + '">' + inline(oli[2]));
        continue;
      }
      // Imagen en línea propia: ![alt](assets/… | http(s)://…), con ancho
      // opcional en % (`![alt|50](ruta)`) y pie opcional entre comillas
      // (`![alt|50](ruta "Pie de foto")`, misma convención que el `title` de
      // markdown estándar). Bloque, no inline: una imagen ocupa su propio
      // renglón. Solo rutas de assets o URL absolutas http(s) (anti-inyección);
      // amplía con el lightbox (.me-zoomable). Si la URL es de YouTube, la
      // MISMA sintaxis incrusta un vídeo en vez de una imagen (despacho por
      // URL, sin sintaxis ni nodo aparte — ver ImageFigureNode.tsx e
      // interacciones.md). El pie pasa por rich() (negrita/cursiva/enlaces),
      // igual que el de un recurso visual.
      var im = /^\s*!\[([^\]|]*)(?:\|(\d{1,3}))?\]\((assets\/[^\s)]+|https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)\s*$/.exec(ln);
      if (im) {
        closeLists();
        var iw = im[2] ? Math.min(100, Math.max(10, parseInt(im[2], 10))) : 0;
        var caption = im[4] ? '<figcaption>' + rich(im[4]) + '</figcaption>' : '';
        var ytId = youtubeId(im[3]);
        if (ytId) {
          html += '<figure class="me-md-img"><div class="me-video"' + (iw ? ' style="width:' + iw + '%"' : '') +
            '><iframe src="https://www.youtube-nocookie.com/embed/' + esc(ytId) +
            '" title="' + esc(im[1] || 'Vídeo') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>' + caption + '</figure>';
        } else {
          html += '<figure class="me-md-img"><img class="me-zoomable" src="' + esc(asset(im[3])) +
            '" alt="' + esc(im[1]) + '" loading="lazy" tabindex="0" role="button" aria-label="Ampliar imagen"' +
            (iw ? ' style="width:' + iw + '%"' : '') + '>' + caption + '</figure>';
        }
        continue;
      }
      // Viñetas: además de "-", admite "*", "•", "·", "–", "—" (los que suelen
      // aparecer en PDF/DOC), para que las listas no queden como párrafo corrido.
      var uli = /^\s*[-*•·–—]\s+(.*)/.exec(ln);
      if (uli) {
        listItem('ul', indentOf(ln), '', '<li>' + inline(uli[1]));
        continue;
      }
      closeLists();
      if (ln.trim() !== '') html += '<p' + (align ? ' style="text-align:' + align + '"' : '') + '>' + inline(ln) + '</p>';
    }
    closeLists();
    return html;
  }
  function inline(s) {
    // Texto enriquecido: **negrita**, *cursiva* y enlaces [texto](url).
    return global.Interactions.rich(s);
  }

  function mediaBlock(vr) {
    if (!vr || vr.kind === 'none' || !vr.src) return '';
    // Pie/leyenda: mismo `rich()` que el resto de textos cortos (negrita,
    // cursiva, enlaces) — antes solo se escapaba (`esc`), sin dar formato,
    // inconsistente con el resto de la carcasa (p. ej. las etiquetas del
    // comparador antes/después sí usan `rich()`).
    if (vr.kind === 'image') {
      return '<figure class="me-figure"><img src="' + esc(asset(vr.src)) + '" alt="' + esc(vr.alt || '') +
        '" class="me-zoomable" tabindex="0" role="button" aria-label="Ampliar imagen">' +
        (vr.caption ? '<figcaption>' + rich(vr.caption) + '</figcaption>' : '') + '</figure>';
    }
    if (vr.kind === 'video_youtube') {
      // Solo valores conocidos: la clase acaba en el DOM.
      var ratio = ['4x3', '1x1', '9x16'].indexOf(vr.media_ratio) >= 0 ? vr.media_ratio : '16x9';
      // El pie, si lo hay, viaja también en el `title` del iframe (accesible
      // sin depender del figcaption) además de mostrarse debajo, como la imagen.
      return '<figure class="me-figure"><div class="me-video me-ratio-' + ratio + '"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(youtubeId(vr.src) || vr.src) +
        '" title="' + esc(vr.caption || 'Vídeo') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>' +
        (vr.caption ? '<figcaption>' + rich(vr.caption) + '</figcaption>' : '') + '</figure>';
    }
    if (vr.kind === 'video_file') {
      var t = (vr.tracks || []).map(function (tr) {
        return '<track kind="' + esc(tr.kind || 'subtitles') + '" src="' + esc(asset(tr.src)) + '" srclang="' + esc(tr.lang) + '" label="' + esc(tr.label) + '" default>';
      }).join('');
      return '<figure class="me-figure"><video class="me-video" controls preload="metadata"' + (vr.poster ? ' poster="' + esc(asset(vr.poster)) + '"' : '') + '><source src="' + esc(asset(vr.src)) + '">' + t + '</video>' +
        (vr.caption ? '<figcaption>' + rich(vr.caption) + '</figcaption>' : '') + '</figure>';
    }
    if (vr.kind === 'audio') {
      return '<audio class="me-audio" controls preload="metadata"><source src="' + esc(asset(vr.src)) + '"></audio>';
    }
    return '';
  }

  // Coloca media y texto según visual_resource.layout (top|bottom|left|right).
  function mediaTextLayout(s, mediaHtml, proseHtml, proseClass) {
    var pc = 'me-prose' + (proseClass ? ' ' + proseClass : '');
    var prose = '<div class="' + pc + '">' + proseHtml + '</div>';
    if (!mediaHtml) return prose;
    var vr = s.visual_resource || {};
    var layout = vr.layout || 'top';
    var mediaCls = 'me-media';
    // En top/bottom, opciones de centrado y ancho completo del recurso.
    if (layout === 'top' || layout === 'bottom') {
      if (vr.media_align === 'center') mediaCls += ' me-media-center';
      if (vr.media_full) mediaCls += ' me-media-full';
    }
    var media = '<div class="' + mediaCls + '">' + mediaHtml + '</div>';
    var inner = (layout === 'bottom' || layout === 'right') ? (prose + media) : (media + prose);
    var mw = (s.visual_resource && s.visual_resource.media_width) || '50';
    return '<div class="me-layout me-layout-' + layout + ' me-mw-' + mw + '">' + inner + '</div>';
  }

  // Plantillas por tipo de pantalla. Todas respetan la posición del recurso
  // (visual_resource.layout) a través de mediaTextLayout.
  var templates = {
    // Portada («type: cover», único): el diseño lo decide el NIVEL del
    // contenedor donde vive la pantalla en cada momento (ctx.coverLevel,
    // calculado en app.js a partir de entry.module/entry.unit), no un campo
    // fijo del esquema — mover la pantalla de nivel (p. ej. «Subir de nivel»
    // en el árbol, o arrastrarla a mano) le cambia el diseño solo con eso, sin
    // retipar nada. Tres niveles, tres tratamientos — sin ningún rótulo de
    // nivel («Módulo», «Unidad»…) encima del título en ninguno: al alumno no
    // le aporta nada y, si el curso usa rótulos personalizados poco
    // frecuentes, chirría más que ayuda. La diferencia entre 'course' y
    // 'module' NO es solo de tono (con solo eso quedaban demasiado
    // parecidas): mismas esquinas superiores redondeadas y mismo «a sangre
    // completa», pero 'module' lleva degradado y 'course' fondo sólido más
    // oscuro que cualquier punto de ese degradado, además de una marca
    // ornamental (`.me-course-mark`, rombo entre dos líneas — nunca texto)
    // que 'module' no lleva.
    // - 'course' (.me-course-cover): banda sólida a sangre completa, la más
    //   oscura de las tres, con marca ornamental — el paquete SCORM es el
    //   nivel más externo.
    // - 'module' (.me-module-cover): banda degradada a sangre completa, sin
    //   marca — un salto de jerarquía cualitativo frente al hero degradado y
    //   CONTENIDO de 'unit' (el degradado es más oscuro y a sangre completa
    //   en vez de contenido), pero un escalón por debajo de 'course'.
    // - 'unit' (.me-cover a secas): hero degradado, contenido en la tarjeta.
    cover: function (s, ctx) {
      var level = (ctx && ctx.coverLevel) || 'unit';
      var levelClass = level === 'course' ? ' me-course-cover' : level === 'module' ? ' me-module-cover' : '';
      var mark = level === 'course' ? '<p class="me-course-mark" aria-hidden="true"><span></span></p>' : '';
      return '<header class="me-cover' + levelClass + '">' + mark +
        '<h1>' + esc(s.title) + '</h1>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text)) + '</header>';
    },
    objectives: function (s) {
      // El `objective` NO se pinta aquí: el `student_text` de esta pantalla ya
      // presenta los objetivos al alumno y mostrarlo duplicaría el contenido.
      return '<h1>' + esc(s.title) + '</h1>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text));
    },
    route: function (s) { return templates.content(s); },
    summary: function (s) {
      return '<h1>' + esc(s.title) + '</h1>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text), 'me-summary');
    },
    reflection: function (s) {
      return '<h1>' + esc(s.title) + '</h1>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text), 'me-reflection');
    },
    forum_prompt: function (s) {
      return '<h1>' + esc(s.title) + '</h1><div class="me-forum"><p class="me-forum-tag">Actividad de foro</p>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text)) + '</div>';
    },
    content_placeholder: function (s) {
      return '<h1>' + esc(s.title) + '</h1><div class="me-placeholder" role="note"><strong>⚠ Contenido pendiente de desarrollo.</strong>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text)) + '</div>';
    },
    video: function (s) {
      return '<h1>' + esc(s.title) + '</h1>' + mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text));
    },
    content: function (s) {
      // El `objective` NO se muestra como banner en cada pantalla de contenido
      // (queda como metadato de trazabilidad); los objetivos se presentan al alumno
      // en la pantalla dedicada `objectives`.
      return '<h1>' + esc(s.title) + '</h1>' +
        mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text));
    },
    unit_quiz: function (s) {
      return '<h1>' + esc(s.title) + '</h1>' + mediaTextLayout(s, mediaBlock(s.visual_resource), mdToHtml(s.student_text));
    },
    // Instrucciones de uso: el recurso visual (normalmente el vídeo demo que
    // trae la receta) y el texto del autor arriba y, debajo, el resumen de
    // controles que genera la propia carcasa con los mismos iconos que los
    // botones reales, en desplegables. Solo lista lo que existe en ESTE paquete
    // (ctx.guide, ver guideInfo en app.js): sin audio no explica el
    // reproductor, sin glosario no lo menciona… Así no se desfasa nunca con el
    // curso ni con la carcasa, y el autor no tiene que escribirla.
    guide: function (s, ctx) {
      var media = mediaBlock(s.visual_resource);
      var intro = (s.student_text || '').trim() || media
        ? mediaTextLayout(s, media, mdToHtml(s.student_text)) : '';
      // Con vídeo, el resumen es un repaso: plegado. Sin vídeo es el contenido
      // principal: abierto.
      return '<h1>' + esc(s.title) + '</h1>' + intro + guideHtml((ctx && ctx.guide) || {}, s.id, !media);
    },
  };

  // ---- Guía de controles (template `guide`) --------------------------------
  function ico(name) {
    return global.MEIcons ? global.MEIcons.svg(name) : '';
  }
  // «Tecla» que imita el botón real de la carcasa (solo dibujo, no clicable).
  function gKey(inner, cls) {
    return '<span class="me-guide-key' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + inner + '</span>';
  }
  function gItem(keys, label, text) {
    return '<li class="me-guide-item"><div class="me-guide-keys">' + keys + '</div>' +
      '<div class="me-guide-text"><strong>' + label + '</strong> ' + text + '</div></li>';
  }
  // Cada sección es un desplegable con el mismo marcado que las secciones
  // plegables de la carcasa (`foldHtml` en app.js): app.js los engancha con
  // wireFolds y setupPrint los abre al imprimir.
  var gFoldN = 0;
  var gFoldPrefix = '';
  var gFoldOpen = false;
  function gSection(title, items) {
    var id = 'me-guide-' + gFoldPrefix + '-' + (gFoldN++);
    return '<div class="me-fold me-acc-item me-guide-section">' +
      '<button class="me-acc-head" type="button" aria-expanded="' + gFoldOpen + '" aria-controls="' + id + '">' +
      '<span class="me-acc-title">' + title + '</span></button>' +
      '<div class="me-acc-body" id="' + id + '" role="region"' + (gFoldOpen ? '' : ' hidden') + '>' +
      '<ul class="me-guide-list">' + items + '</ul></div></div>';
  }
  function guideHtml(g, screenId, open) {
    gFoldN = 0;
    gFoldPrefix = String(screenId || 'g').replace(/[^\w-]/g, '');
    gFoldOpen = !!open;
    var nav = g.navigation || 'mixed';
    var navNote = nav === 'free'
      ? 'Puedes recorrer las pantallas en el orden que prefieras.'
      : nav === 'sequential'
        ? 'Las pantallas se recorren en orden: para avanzar tienes que completar la actual.'
        : 'Puedes volver atrás cuando quieras; para saltar más adelante, antes tienes que completar las pantallas obligatorias.';
    if (g.hasMinTime) navNote += ' Algunas pantallas piden un tiempo mínimo antes de dejarte continuar.';

    var html = '<div class="me-guide">' +
      '<p class="me-guide-lead">' + (open ? 'Resumen de los controles:' : 'Resumen de los controles (pulsa cada apartado para desplegarlo):') + '</p>';

    html += gSection('Moverte por la unidad',
      gItem(gKey(ico('arrow-left') + 'Anterior', 'me-guide-key-nav') + gKey('Siguiente' + ico('arrow-right'), 'me-guide-key-nav'),
        'Anterior / Siguiente.', 'Pasan a la pantalla anterior o a la siguiente. Están en la barra inferior.') +
      gItem(gKey('3 / 12', 'me-guide-key-progress'),
        'Barra de progreso.', 'Indica en qué pantalla estás y cuántas hay; puedes deslizarla para ir a otra.') +
      gItem(gKey(ico('menu')),
        'Índice.', 'Abre y cierra el menú con todas las pantallas de la unidad; las que ya has completado aparecen marcadas.') +
      '<li class="me-guide-note">' + navNote + '</li>');

    var audio = '';
    if (g.hasAudio) {
      audio +=
        gItem(gKey(ico('play')) + gKey(ico('pause')),
          'Reproducir / pausar.', 'La narración empieza sola al entrar en cada pantalla; aquí la pausas o la reanudas. Arrastra la barra del reproductor para avanzar o retroceder.') +
        gItem(gKey(ico('volume-on')),
          'Sonido.', 'Silencia la narración o ajusta su volumen con el control deslizante.') +
        gItem(gKey('1×', 'me-guide-key-text'),
          'Velocidad.', 'Escucha la narración más deprisa (1,25×, 1,5× o 2×).');
    }
    audio += gItem(gKey(ico('file-text')),
      'Transcripción.', g.hasAudio
        ? 'Muestra por escrito lo que dice la narración o el vídeo de la pantalla, por si no puedes o no quieres escucharlo.'
        : 'Muestra el texto completo del vídeo o del audio de la pantalla, cuando lo tiene.');
    html += gSection(g.hasAudio ? 'Audio y transcripción' : 'Transcripción', audio);

    html += gSection('Herramientas',
      gItem(gKey('<span class="me-guide-a-s">A</span>−', 'me-guide-key-text') + gKey('A+', 'me-guide-key-text'),
        'Tamaño del texto.', 'Reduce o amplía la letra. Se recuerda en este dispositivo.') +
      gItem(gKey(ico('printer')),
        'Imprimir.', 'Imprime la pantalla que estás viendo o guárdala como PDF.') +
      gItem(gKey(ico('maximize')),
        'Pantalla completa.', 'Aprovecha toda la pantalla (si tu navegador lo permite). Vuelve a pulsarlo para salir.') +
      gItem(gKey(ico('help-circle')),
        'Ayuda.', 'Recuerda los atajos de teclado.') +
      gItem(gKey(ico('log-out'), 'me-guide-key-close'),
        'Cerrar.', 'Termina la sesión y vuelves al aula virtual. Tu progreso se guarda y podrás continuar donde lo dejaste.'));

    if (g.materials && g.materials.length) {
      html += gSection('Materiales de consulta', g.materials.map(function (m) {
        return gItem(gKey(ico(m.icon)), esc(m.title) + '.', 'Al final del índice; puedes consultarlo en cualquier momento.');
      }).join(''));
    }

    var act = gItem(gKey('Comprobar', 'me-guide-key-check'),
      'Actividades.', 'Resuelve la actividad y pulsa Comprobar para ver si has acertado y leer la explicación.');
    if (g.hasScored) {
      act += gItem(gKey('Evaluable', 'me-guide-key-scored'),
        'Actividades evaluables.', 'Las que llevan esta etiqueta cuentan para tu nota.');
    }
    if (g.hasFinalTest) {
      act += gItem(gKey('✓', 'me-guide-key-text'),
        'Test final.', 'Al terminar el contenido encontrarás un test de evaluación; tu resultado aparece al final.');
    }
    act += '<li class="me-guide-note">Esta unidad es una parte de tu curso: los cuestionarios, foros y demás actividades están en el aula virtual.</li>';
    html += gSection('Actividades', act);

    html += gSection('Con el teclado',
      gItem(gKey('Alt') + gKey('→') + gKey('←'), 'Siguiente / anterior.', '') +
      gItem(gKey('Alt') + gKey('M'), 'Índice.', '') +
      gItem(gKey('Alt') + gKey('T'), 'Transcripción.', '') +
      gItem(gKey('Tab'), 'Recorrer los controles.', 'Pulsa Intro o Espacio para activarlos.'));

    html += '<p class="me-guide-footer">Tu progreso se guarda automáticamente: puedes salir y volver cuando quieras.</p>';
    return html + '</div>';
  }

  // Locución de la diapositiva (si la hay). El reproductor NO es visible: el
  // audio se controla desde app.js (reproducción automática al entrar y botón de
  // activar/desactivar en la barra superior). El elemento se mantiene en el DOM
  // sin `controls` (invisible) para poder reproducirlo por código.
  function narrationBlock(s) {
    if (!s.audio_src) return '';
    return '<audio class="me-narration-audio" preload="auto" aria-hidden="true">' +
      '<source src="' + esc(asset(s.audio_src)) + '"></audio>';
  }

  function render(container, screen, ctx) {
    var tpl = templates[screen.type] || templates.content;
    var html = tpl(screen, ctx);
    // Pantalla evaluable: la interacción puntúa (interaction.scored) y las
    // actividades cuentan para la nota (ctx.showScoredBadge, según score_source).
    // Señal: título+descripción en tarjeta amarilla (clase .me-screen-scored, ver
    // styles.css) con la etiqueta «Evaluable» dentro del título — ver más abajo.
    var isScored = !!(ctx && ctx.showScoredBadge && screen.interaction && screen.interaction.scored);
    // Pantalla marcada «pendiente de revisión» (screen.review.flagged): banner
    // superior + borde rojo grueso. Excepción deliberada a la invariante
    // «Vista estudiante = export» (ver CLAUDE.md) — estas pantallas nunca
    // llegan al paquete SCORM real (stripFlaggedForReview en schema/review.ts),
    // así que esto solo se ve aquí, en el visor del propio editor.
    var reviewFlagged = !!(screen.review && screen.review.flagged);
    var reviewBanner = reviewFlagged
      ? '<div class="me-review-banner" role="note"><strong>⚠ Pendiente de revisión</strong>' +
        (screen.review.note ? '<p>' + esc(screen.review.note) + '</p>' : '') +
        '<p class="me-review-hint">No se incluirá en el paquete SCORM exportado.</p></div>'
      : '';
    // Miga de ubicación «Módulo › Unidad» sobre el título, para que el alumno
    // sepa siempre dónde está aunque el menú lateral esté plegado (o en móvil).
    // No se pinta en la portada (hero) ni si módulo y unidad repiten título.
    var crumb = '';
    if (ctx && ctx.crumb && screen.type !== 'cover') {
      var cparts = [];
      if (ctx.crumb.module) cparts.push(esc(ctx.crumb.module));
      if (ctx.crumb.unit && ctx.crumb.unit !== ctx.crumb.module) cparts.push(esc(ctx.crumb.unit));
      if (cparts.length) {
        crumb = '<p class="me-crumb">' +
          cparts.join('<span class="me-crumb-sep" aria-hidden="true">›</span>') + '</p>';
      }
    }
    container.innerHTML = '<article class="me-screen me-screen-' + esc(screen.type) +
      (isScored ? ' me-screen-scored' : '') + (reviewFlagged ? ' me-screen-review' : '') + '">' +
      reviewBanner + crumb + narrationBlock(screen) + html +
      (screen.interaction ? '<section class="me-interaction" aria-label="Actividad"></section>' : '') + '</article>';

    // Icono + «Actividad: » delante del título de la pantalla evaluable, y la
    // etiqueta «Evaluable» dentro de la misma tarjeta amarilla (antes flotaba
    // sobre toda la pantalla): el GPT sigue generando el título del tema tal
    // cual (ver guia-diseno-interacciones.md), la app compone esto en la Vista
    // estudiante (y por tanto en el export, misma fuente — ver CLAUDE.md), sin
    // tocar `screen.title` en course.json.
    if (isScored) {
      var titleH1 = container.querySelector('.me-screen > h1');
      if (titleH1) {
        var icon = global.MEIcons ? global.MEIcons.svg('edit-3') : '';
        titleH1.innerHTML =
          '<span class="me-h1-text"><span class="me-scored-prefix">' + icon + 'Actividad: </span>' +
          titleH1.innerHTML + '</span><span class="me-scored-badge">Evaluable</span>';
      }
    }

    var controller = null;
    if (screen.interaction) {
      var mount = container.querySelector('.me-interaction');
      // Posición de la interacción respecto al texto: 'top' la sube justo debajo del
      // título (encima del texto); por defecto queda debajo ('bottom').
      if (screen.interaction_layout === 'top') {
        var h1 = container.querySelector('.me-screen > h1');
        if (h1) h1.insertAdjacentElement('afterend', mount);
      }
      controller = global.Interactions.render(mount, screen.interaction, ctx);
    }
    return { interaction: controller };
  }

  global.Renderer = { render: render, mdToHtml: mdToHtml };
})(window);
