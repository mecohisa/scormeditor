/* =============================================================================
 * accessibility.js — Utilidades de accesibilidad para la carcasa
 * - Región aria-live para anuncios (feedback textual no visual).
 * - Atajos de teclado de navegación.
 * - Gestión de foco al cambiar de pantalla.
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
    document.body.appendChild(liveRegion);
    return liveRegion;
  }

  var A11Y = {
    announce: function (msg) {
      var r = ensureLive();
      r.textContent = '';
      // doble rAF para forzar el re-anuncio en lectores de pantalla
      requestAnimationFrame(function () { requestAnimationFrame(function () { r.textContent = msg; }); });
    },

    focusMain: function () {
      var main = document.getElementById('me-content');
      // tabindex 0 (no -1): el área tiene scroll propio y también debe poder
      // alcanzarse con Tab para desplazarla con las flechas (WCAG 2.1.1).
      if (main) { main.setAttribute('tabindex', '0'); main.focus(); }
    },

    // Atajos globales: Alt+→ siguiente, Alt+← anterior, Alt+M menú, Alt+T transcripción
    bindShortcuts: function (handlers) {
      document.addEventListener('keydown', function (e) {
        if (!e.altKey) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); handlers.next && handlers.next(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); handlers.prev && handlers.prev(); }
        else if (e.key.toLowerCase() === 'm') { e.preventDefault(); handlers.menu && handlers.menu(); }
        else if (e.key.toLowerCase() === 't') { e.preventDefault(); handlers.transcript && handlers.transcript(); }
      });
    },
  };

  global.A11Y = A11Y;
})(window);
