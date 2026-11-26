/* =============================================================================
 * accessibility.js — Utilidades de accesibilidad para la carcasa
 * - Región aria-live para anuncios (feedback textual no visual).
 * - Atajos de teclado de navegación.
 * - Gestión de foco al cambiar de pantalla.
 * - Diálogos modales: trampa de foco, fondo inerte y devolución del foco.
 * ===========================================================================*/
(function (global) {
  'use strict';

  var liveRegion = null;
  function ensureLive() {
    if (liveRegion) return liveRegion;
    liveRegion = document.createElement('div');
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('role', 'status');
    // Marca para que trapFocus no la vuelva inerte: los anuncios hechos con un
    // diálogo abierto deben seguir oyéndose.
    liveRegion.setAttribute('data-me-live', '');
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  // Elementos que pueden recibir el foco con Tab dentro de `root` (visibles).
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), iframe, audio[controls], video[controls], [tabindex]:not([tabindex="-1"])';
  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      return !el.closest('[hidden]') && !el.closest('[inert]') && (el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    });
  }
  // ¿Se le puede devolver el foco? (sigue en el documento, visible y no inerte).
  function canFocus(el) {
    return !!(el && el.focus && el !== document.body && el.isConnected !== false &&
      document.documentElement.contains(el) && !el.closest('[inert]') && !el.closest('[hidden]') &&
      (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  // Pila de diálogos abiertos (un visor de imagen puede abrirse sobre el modal
  // de una tarjeta): solo el de arriba atrapa el Tab.
  var dialogs = [];
  // En captura sobre window: el Esc del diálogo de arriba no llega a los
  // oyentes de los de debajo (p. ej. el visor sobre el modal de una tarjeta).
  global.addEventListener('keydown', function (e) {
    var top = dialogs[dialogs.length - 1];
    if (!top) return;
    if (e.key === 'Escape' && top.onEscape) { e.preventDefault(); e.stopPropagation(); top.onEscape(); return; }
    if (e.key !== 'Tab') return;
    var items = focusables(top.el);
    if (!items.length) { e.preventDefault(); top.el.focus(); return; }
    var first = items[0], last = items[items.length - 1];
    var inside = top.el.contains(document.activeElement);
    if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus(); }
  }, true);

  var A11Y = {
    announce: function (msg) {
      var r = ensureLive();
      r.textContent = '';
      // doble rAF para forzar el re-anuncio en lectores de pantalla
      requestAnimationFrame(function () { requestAnimationFrame(function () { r.textContent = msg; }); });
    },

    // Foco al cambiar de pantalla: al <h1> de la pantalla (tabindex -1, solo
    // programático) para que el lector lea dónde se está; si no hay título, al
    // área de contenido. El área conserva tabindex 0 (no -1): tiene scroll
    // propio y también debe poder alcanzarse con Tab para desplazarla con las
    // flechas (WCAG 2.1.1).
    focusMain: function () {
      var main = document.getElementById('me-content');
      if (!main) return;
      main.setAttribute('tabindex', '0');
      var h = main.querySelector('h1');
      if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
      else main.focus();
    },

    // Convierte `el` en diálogo modal accesible mientras esté abierto:
    // - vuelve inerte el resto del <body> (#me-app y cualquier otro modal debajo),
    //   salvo la región de anuncios;
    // - el Tab cicla dentro del diálogo; Esc llama a opts.onEscape (si se da);
    // - devuelve una función `release(restoreFocus)` que deshace todo y, salvo
    //   restoreFocus === false, devuelve el foco a quien abrió el diálogo
    //   (opts.returnFocus o el elemento enfocado al llamar). Si ese elemento ya
    //   no es enfocable (re-render, menú plegado), usa opts.fallback().
    // El foco inicial lo pone quien llama (cada diálogo sabe cuál es su opción segura).
    trapFocus: function (el, opts) {
      opts = opts || {};
      ensureLive();
      var returnTo = opts.returnFocus || document.activeElement;
      var inerted = [];
      Array.prototype.forEach.call(document.body.children, function (child) {
        if (child === el || child.contains(el) || child.hasAttribute('data-me-live') || child.tagName === 'SCRIPT') return;
        if (child.inert) return;
        child.inert = true;
        inerted.push(child);
      });
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      var entry = { el: el, onEscape: opts.onEscape || null };
      dialogs.push(entry);
      var released = false;
      return function release(restoreFocus) {
        if (released) return;
        released = true;
        var i = dialogs.indexOf(entry);
        if (i >= 0) dialogs.splice(i, 1);
        inerted.forEach(function (child) { child.inert = false; });
        if (restoreFocus === false) return;
        if (canFocus(returnTo)) returnTo.focus();
        else if (opts.fallback) opts.fallback();
      };
    },

    // Atajos globales: Alt+→ siguiente, Alt+← anterior, Alt+M menú, Alt+T transcripción
    bindShortcuts: function (handlers) {
      document.addEventListener('keydown', function (e) {
        if (!e.altKey) return;
        // Con un diálogo abierto no se navega por detrás de él.
        if (dialogs.length) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); handlers.next && handlers.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); handlers.prev && handlers.prev(); }
        else if (e.key.toLowerCase() === 'm') { e.preventDefault(); handlers.menu && handlers.menu(); }
        else if (e.key.toLowerCase() === 't') { e.preventDefault(); handlers.transcript && handlers.transcript(); }
      });
    },
  };

  global.A11Y = A11Y;
})(window);
