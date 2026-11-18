# Guía de marcas para autores: regenerar Word y PDF

Fuente única: `docs/guia-marcas-para-autores.md`. Los comentarios
`<!-- tipo: … -->` y `<!-- captura: nombre | pie -->` del `.md` marcan la banda de color
y la captura de cada marca. Regenerar cuando cambien las marcas
(`docs/gpt/marcas-autoria.md`) o el aspecto de un tipo en la carcasa.

1. Curso de ejemplo (una pantalla por marca, con el mismo texto que la guía) y carcasa,
   en una carpeta de trabajo fuera del repo (`<tmp>`):
   ```
   cp -r src/runtime/* <tmp>/site/
   python scripts/guia-marcas/make_course.py <tmp>/site/data/course.json
   ```
   Imprime la lista de ids de pantalla en orden.
2. Servir y capturar (Chrome del sistema; `playwright-core` instalado en `<tmp>`, no en
   el repo):
   ```
   cd <tmp>/site && python -m http.server 8765      # en segundo plano
   cd <tmp> && node <repo>/scripts/guia-marcas/shoot.mjs '<ids en JSON>'   # → shots/*.png
   ```
   Recortar el blanco inferior de cada captura y reducirlas a ~1250 px de ancho (el PDF
   pasa de 6 MB a 1,5 MB). Las capturas de los tipos «solo en el editor» y de
   `tarjetas_imagen` (necesitan imágenes subidas a mano) se reaprovechan del `.docx`
   anterior (`word/media/`).
3. `python scripts/guia-marcas/build_docx.py <carpeta_capturas>` → `docs/…docx`, y
   `docx2pdf` (usa Word) para el `.pdf`.
