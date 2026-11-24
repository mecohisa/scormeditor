# Flujo «factoría» para unidades grandes (SCORMEditor)

Procedimiento **obligatorio** cuando se pide generar una **unidad completa** (varios
temas) para SCORMEditor a partir de PDF/DOC/texto. Complementa a
`contrato-course-json.md` (estructura), `guia-diseno-interacciones.md` (criterio,
Regla Nº1 de no resumir) y `ejemplo-course-json.md` (forma).

## Por qué existe este flujo
Un `course.json` con los `transcript` completos de una unidad entera **no cabe en una
sola respuesta**: el modelo, al intentar «escupirlo» de golpe, comprime y **resume**
(cobertura observada ~44 % del texto fuente). La solución no es escribir mejor el
prompt, sino **trocear la producción**: trabajar **tema a tema**, generar **parciales
auditables descargables** y **fusionar solo al final**. Requiere Code Interpreter /
Data Analysis activo.

## Regla crítica
**Nunca** escribas el `course.json` completo de una unidad larga directamente en el
chat. Constrúyelo **mediante archivos** con Code Interpreter (un `dict` por tema que
se vuelca a un parcial descargable). El usuario recibe **archivos**, no JSON gigante.

## Las tres fases
1. **Inventario** (Fase 0): planificar la unidad, sin generar nada final.
2. **Tema parcial** (Fase 1–2): producir y auditar **un** tema, guardar su parcial.
3. **Fusión final** (Fase 3): unir los parciales aprobados en un único `.scormproj`.

Por defecto (petición directa) las tres fases se **encadenan de forma autónoma**, sin
preguntar entre temas; ver «Órdenes de trabajo típicas» al final.

---

## Fase 0 — Inventario de la unidad
1. **Extrae el índice real** de la unidad desde el documento (no de memoria).
2. Identifica todos los **temas, epígrafes, subepígrafes, actividades, imágenes,
   tablas, casos, glosario y bibliografía**.
3. **Comprueba si el documento numera DOS niveles a la vez** (`1.`/`2.`/`3.`… temas y
   `1.1`/`1.2`/`2.1`… subtemas dentro de cada uno, contrato §3): si es así, el plan se
   organiza por **tema → sus subtemas** (cada subtema producido como su propio parcial
   más abajo, ver «Si hay dos niveles reales»), no como una lista plana de temas.
4. Estima el **nº de palabras fuente por tema** (o por subtema, si hay dos niveles).
5. Devuelve un **plan de producción**: lista de temas (con sus subtemas si aplica),
   palabras fuente estimadas, nº de pantallas previsto, imágenes detectadas.
6. En una **petición directa** («genera el `.scormproj` de…»), el inventario es un
   paso interno: muestra el plan brevemente y **continúa con el primer tema sin
   esperar orden**. Solo te detienes aquí si la orden era un **análisis previo** (ver
   «Órdenes de trabajo típicas»): entonces amplía el plan con la **propuesta de
   empaquetado** en `.scormproj` y no generes nada.

---

## Fase 1 — Producción tema a tema
Para **cada** tema, y **solo** ese tema (ver Regla Nº1 de la guía):
1. **Extrae el texto completo CON su formato** (no en plano): con PyMuPDF
   `get_text("dict")`, conserva las **negritas** del original (`flags`/fuente «Bold» →
   `**...**`), detecta **encabezados** (tamaño/estilo → `## `/`### `) y **cajas
   destacadas** (etiqueta o recuadro/color → callouts `::: tipo`).
2. **Monta el guion de pantallas del tema** (guía, sección «El guion de pantallas»):
   tabla bloque→pantalla→interacción, con el **nº de caracteres** de cada pantalla y
   su **chequeo de ritmo** (informativa ~1 de cada 3-4 pantallas, nunca >3 seguidas
   de solo texto; evaluables al final de cada subtema (+1 intercalada si es largo), tipos variados; ninguna pantalla de
   >~800 caracteres sin informativa). Corrige la tabla antes de escribir nada. Si la orden pedía
   **«enséñame el guion»**, entrega aquí el guion completo y espera el OK del usuario.
3. **Segmenta según el guion**, en orden: **una pantalla por fila** (o más si un bloque
   mezcla ideas). Sin tope: 20-40+ pantallas por tema es normal.
4. Conserva el texto **casi literal (~100%)**: NO resumas ni reescribas «para
   e-learning»; usa las palabras del documento con solo retoques de conexión. El texto
   va **visible** (`student_text` y/o dentro de accordion/tabs/flip_cards que lo
   **contienen**) y **duplicado íntegro en `transcript`**.
5. Presenta el texto de forma amena con interactividades **informativas** (que
   contienen el texto fuente; ~1 de cada 3-4 pantallas) y, cada **4-5 pantallas**, una
   pantalla de checkpoint con una interactividad **aplicada en pantalla propia** (sin
   teoría: solo el enunciado), **alternando todo el repertorio evaluable** sin repetir
   tipo dos veces seguidas (incluidas las prácticas de varios pasos —
   `scenario_steps`, `decision_tree`, `calculator`— donde el contenido las pida; sin
   `sort_steps`, y `match_pairs` con moderación), cada una **después** de lo que
   evalúa, titulada «Actividad: …» y con `attempts: 3`. Cierra cada tema con un repaso
   (`flashcards` o `az_quiz`, `scored: false`) y la «Síntesis del tema»; sopa de letras
   y crucigrama solo si hay vocabulario técnico que fijar.
   Nunca `hotspots`/`before_after`/`hidden_image`/`puzzle`/`video`/`html_embed`
   (los añade el editor humano). Una interacción por pantalla, según el guion.
6. Añade callouts (`::: tipo`), `source_refs` reales (página real del PDF, no
   aproximada), imágenes del tema y su `alt`.

### Control de cobertura (obligatorio antes de cerrar un tema)
1. Cuenta las **palabras del texto fuente** del tema.
2. Cuenta las **palabras del texto conservado** (visible + `transcript`, sin contar el
   duplicado).
3. `ratio_conservacion = palabras_conservadas / palabras_fuente`.
4. Objetivo **≈1.0 (mínimo ≥0.95)**. Si `ratio < 0.95`: **NO** cierres el tema. Añade
   pantallas, recupera listas, ejemplos, actividades y matices omitidos, y **recalcula**.
5. Registra en el informe: palabras fuente, palabras conservadas, % conservado,
   epígrafes cubiertos, imágenes incluidas, imágenes omitidas, incidencias.

### El parcial (archivo descargable)
Genera **un parcial por tema**. Si el tema **no** tiene imágenes, un `.json`; si
**tiene** imágenes, un **`.scormpart`** (ZIP con el `.json` en la raíz + `assets/`).
Nómbralo `u01_t01.partial.json` / `u01_t01.scormpart`.

Estructura del parcial (`*.partial.json`):

```json
{
  "partial_version": "1.0.0",
  "tema_id": "u01_t01",
  "unit": {
    "id": "u01_t01",
    "title": "Tema 1. ...",
    "summary": "...",
    "status": "ok",
    "screens": [ /* pantallas del tema, forma del contrato §4 */ ]
  },
  "glossary": [ /* términos del tema, forma §8 */ ],
  "bibliography": [ /* referencias del tema, forma §8 */ ],
  "question_bank": [ /* preguntas del tema, forma §7 (single_choice/true_false) */ ],
  "assets": [ "assets/img/u01_t01_fig1.png" ],
  "coverage": {
    "palabras_fuente": 0,
    "palabras_conservadas": 0,
    "ratio": 0.0,
    "epigrafes_cubiertos": [],
    "imagenes_incluidas": [],
    "imagenes_omitidas": [],
    "incidencias": []
  }
}
```

- `unit` es una **unidad del contrato** (`modules[].units[]`): en la fusión se inserta
  tal cual.
- Las rutas de `assets[]` deben coincidir con las referenciadas en las pantallas del
  tema (misma regla que §11). En un `.scormpart`, los binarios van en `assets/`.

### Si el documento tiene dos niveles reales (temas + subtemas)
Cuando el Fase 0 detectó numeración de dos niveles (contrato §3): **el parcial pasa a
ser por subtema**, no por tema — cada subtema es la `unit` real; el tema (nivel 1) es
el `module` que agrupa varios parciales. Dos cambios sobre lo anterior:
- **Nombre del fichero con los dos índices**: `u01_t01_st01.partial.json` (tema 1,
  subtema 1), `u01_t01_st02.partial.json`, `u01_t02_st01.partial.json`… — el `st0N`
  extra es lo único que cambia frente al nombrado de un solo nivel.
- **Campo `modulo_title` añadido** al JSON del parcial (mismo nivel que `tema_id`): el
  título del tema (módulo) al que pertenece ese subtema, idéntico car-a-car en todos
  los subtemas de un mismo tema (así la fusión los agrupa). Ejemplo: `"tema_id":
  "u01_t01_st01", "modulo_title": "Tema 1. Definición y propósito"`.
- **`unit.title` es ahora el del SUBTEMA, no el del tema** — conserva el número de dos
  niveles tal cual lo trae el documento (`"1.2 Comunicación con la familia"`, no
  `"Tema 1. ..."` del ejemplo de un solo nivel de más arriba, que ahí sí sería el tema):
  sin el número delante se pierde qué subtema del documento original es cada unidad
  (contrato §3).

Todo lo demás (control de cobertura, Fase 2, formato de `unit`) es igual que con un
solo nivel — la única diferencia es a qué contenedor va cada parcial en la fusión.

---

## Fase 2 — Validación por tema
Al terminar cada tema, registra:
1. El parcial guardado (`.json` o `.scormpart`).
2. **Informe de cobertura** (los campos de `coverage`).
3. **Lista de incidencias** (imágenes omitidas, epígrafes dudosos, contenido que
   requiere revisión humana).

En **petición directa** (el modo habitual): **continúa con el siguiente tema sin
preguntar**; los informes por tema se acumulan y se entregan juntos al final. Solo en
**modo paso a paso** (pedido expresamente) entregas el enlace al parcial y preguntas
si sigues. En ambos modos, si el ratio de un tema quedó `< 0.95` tras reintentar,
detente y avísalo como **incidencia bloqueante**.

---

## Fase 3 — Fusión final
Cuando **todos** los temas estén aprobados:
1. **Lee todos los parciales** generados (`.json` / `.scormpart`).
2. **Fusiona** las `unit` de cada parcial dentro de `modules[].units[]` (en orden). Con
   un solo nivel, todas van al único módulo. Con dos niveles reales (`modulo_title` en
   el parcial, ver «Si hay dos niveles reales»), agrupa antes por `modulo_title`: un
   `module` por grupo, con sus `unit` en el orden de los subtemas.
3. **Unifica** glosario, bibliografía, evaluación, assets y `quality_checklist`.
4. **Deduplica** términos de glosario (por `term`) y referencias (por `ref`/`url`).
5. Monta la **evaluación**: por defecto el test va en **Moodle** (contrato §2):
   `assessments` vacío (`final_test: null`), `score_source: "unit_tests"` y los
   `question_bank` de los parciales se entregan **aparte** (fichero de preguntas para
   el cuestionario de Moodle). Solo si el usuario pide el test dentro del paquete,
   vuelca los `question_bank` en `assessments.final_test.questions`
   (`test_in_scorm=True` en `merge_unit`).
6. Construye **un único `.scormproj`** con `build_scormproj` (contrato §11):
   `course.json` en la raíz + `assets/` con todos los binarios; **sin rutas rotas**.
7. **Valida** el paquete antes de entregarlo.
8. **Revisión de fidelidad** (obligatoria, ver abajo) antes de dar el enlace.

### Revisión de fidelidad (obligatoria antes de entregar)
El ratio de palabras (≥0.95) mide **cuánto** texto se conserva, no **si el mensaje
didáctico sigue siendo el mismo**. Antes de entregar, compara el curso generado con la
fuente (con Code Interpreter, releyendo el PDF, no de memoria):
1. **Esquema**: reconstruye el índice de epígrafes del PDF y comprueba que **cada
   epígrafe tiene su(s) pantalla(s)**, en el **mismo orden**, y que los sub-epígrafes
   hermanos conservan la **misma jerarquía** entre sí (mismo nivel `###`; ninguno
   degradado a línea numerada/negrita).
2. **Fronteras**: ninguna pantalla arranca con contenido residual del epígrafe
   anterior ni termina invadiendo el siguiente.
3. **Formato fuente**: negritas (`**` presente si el PDF tiene bold), cajas destacadas
   → callouts, y las imágenes junto a **su** texto.
4. **Estructura de pantallas**: `cover` sin contenido didáctico; bibliografía solo en
   `bibliography[]` (sin pantalla «Referencias»); variedad de interacciones
   informativas (no todo `accordion`).
5. Registra el resultado como parte del informe final (epígrafes verificados,
   desajustes corregidos). Si algo falla, **corrige y repite** antes de entregar.

### Entrega final
- Enlace al `.scormproj`.
- **Informe global de cobertura**: % de conservación global y por tema.
- Imágenes incluidas / no incluidas.
- Incidencias pendientes.

### Helper de fusión (Code Interpreter)

```python
import json, zipfile, glob, os

def load_partial(path):
    if path.endswith('.scormpart'):
        z = zipfile.ZipFile(path)
        name = next(n for n in z.namelist() if n.endswith('.partial.json'))
        data = json.loads(z.read(name))
        assets = {n: z.read(n) for n in z.namelist()
                  if n.startswith('assets/') and not n.endswith('/')}
        return data, assets
    return json.loads(open(path, encoding='utf-8').read()), {}

def merge_unit(base_course, partials, test_in_scorm=False):
    """base_course: dict con course/scorm/shell ya definidos.
    Un solo nivel: incluye modules=[{id,title,units:[]}] (un módulo fijo, como siempre).
    Dos niveles reales (parciales con 'modulo_title'): NO hace falta 'modules' aquí, se
    reconstruye agrupando por modulo_title (un module real por tema, ver «Si hay dos
    niveles reales»).
    partials: lista de rutas a parciales aprobados, en orden.
    test_in_scorm: False (por defecto) = test en Moodle; devuelve el banco de preguntas
    aparte. True = test dentro del paquete (solo si el usuario lo pide)."""
    units, glo, bib, qbank, asset_files = [], [], [], [], {}
    mod_order, mod_units = [], {}  # agrupación por modulo_title, solo si hay dos niveles
    for p in partials:
        data, assets = load_partial(p)
        units.append(data['unit'])
        glo += data.get('glossary', [])
        bib += data.get('bibliography', [])
        qbank += data.get('question_bank', [])
        asset_files.update(assets)
        mod_title = data.get('modulo_title')
        if mod_title:
            if mod_title not in mod_units:
                mod_order.append(mod_title)
                mod_units[mod_title] = []
            mod_units[mod_title].append(data['unit'])
    # dedup
    seen=set(); glo=[g for g in glo if (g['term'] not in seen and not seen.add(g['term']))]
    seenb=set(); bib=[b for b in bib if ((b.get('ref'),b.get('url')) not in seenb and not seenb.add((b.get('ref'),b.get('url'))))]
    if mod_order:
        base_course['modules'] = [
            {'id': f'm{i+1}', 'title': t, 'units': mod_units[t]} for i, t in enumerate(mod_order)
        ]
    else:
        base_course['modules'][0]['units'] = units
    base_course['glossary'] = glo
    base_course['bibliography'] = bib
    rules = base_course.setdefault('scorm', {}).setdefault('rules', {})
    if test_in_scorm:
        base_course['assessments'] = {'unit_tests': [],
            'final_test': {'id':'A01','unit_id':units[0]['id'],'title':'Evaluación final',
                           'questions': qbank}}
        rules['score_source'] = 'mixed'   # checkpoints scored + test final
        return base_course, asset_files, []
    base_course['assessments'] = {'unit_tests': [], 'final_test': None}
    rules['score_source'] = 'unit_tests'  # nota = actividades evaluables (test en Moodle)
    return base_course, asset_files, qbank

# uso, un solo nivel: course, asset_files, qbank = merge_unit(base, sorted(glob.glob('u01_t*.*')))
# uso, dos niveles:   course, asset_files, qbank = merge_unit(base, sorted(glob.glob('u01_t*_st*.*')))
#      build_scormproj(course, asset_files)   # del contrato §11
#      qbank → entrégalo aparte (preguntas para el cuestionario de Moodle)
```

---

## Órdenes de trabajo típicas (para el usuario)

La orden habitual es **directa**: el usuario pide el `.scormproj` de un curso, una
unidad o un tema. **La factoría se encarga sola de conseguirlo con este flujo**; las
fases son el procedimiento interno, no órdenes que deba dar el usuario.

**Petición directa (la habitual):**
> Genera el `.scormproj` de la Unidad N.

> Genérame el curso completo (un `.scormproj` por unidad).

> Hazme el Tema 3 de la Unidad 1 en un `.scormproj`.

Comportamiento: ejecuta **todo el flujo de forma autónoma** — inventario interno →
temas parciales con su control de cobertura → fusión → revisión de fidelidad — **sin
preguntar entre temas**. Solo te detienes si:
- (a) hay una **incidencia bloqueante** (ratio <0.95 irrecuperable, contenido
  ilegible, ambigüedad que exige decisión del usuario), o
- (b) vas a quedarte **sin espacio**: guarda los parciales en disco y di «continúa»
  para seguir en la siguiente respuesta (**nunca** resumas para «caber»).

Al final entrega el enlace al `.scormproj` (o a los `.scormproj`, si son varios) +
el informe global de cobertura y fidelidad.

**Prompt reforzado (el recomendado; probado con buen resultado, jul 2026).** Versión
de la petición directa que re-ancla en el mensaje las reglas que más se incumplen.
Si el GPT recibe una orden con esta forma, debe tratar las reglas numeradas como
**bloqueantes**: si alguna falla, corrige y regenera antes de entregar.

> Adjunto el PDF. Genera el .scormproj COMPLETO de la Unidad N en modo factoría
> autónomo: encadena inventario → temas parciales → fusión sin preguntarme nada
> entre temas. Si te quedas sin espacio, guarda parciales y di solo «continúa».
>
> Antes de producir, abre y lee con Code Interpreter contrato-course-json.md,
> guia-diseno-interacciones.md y referencia-rapida.md. No trabajes de memoria.
>
> Reglas INNEGOCIABLES (si alguna falla, corrige y regenera antes de entregarme nada):
> 1. Texto extraído con extract_text_markdown (contrato §11), nunca en plano.
>    Ratio de cobertura ≥0.95 por tema y negritas ** conservadas (assert en Python).
> 2. Los ejercicios prácticos (case_practice, reflection, ::: reflect)
>    van en SU PROPIA pantalla, solo con el enunciado. La «Resolución propuesta» /
>    «Clave de reflexión» va en feedback.explanation, NUNCA visible en student_text.
> 3. Nunca dos callouts del mismo tipo en una pantalla: eso son dos pantallas.
> 4. Sin rótulos («Actividad práctica», «Resolución propuesta:», «Idea clave:»…).
> 5. Frases partidas por la maquetación del PDF reagrupadas en un párrafo; ítems de
>    lista en líneas consecutivas SIN línea en blanco entre ellos; espacio tras
>    cerrar negrita (**útil** y, no **útil**y).
> 6. Cada cover con «Tema N» visible; bibliografía solo en bibliography[] con
>    formato homogéneo (Autor/Entidad (año). Título. Fuente.); varía las
>    interacciones informativas (tabs/flip_cards solo con ≤4 ítems).
> 7. Antes de producir cada tema, monta el guion de pantallas (guía), con el nº de
>    caracteres de cada pantalla, y pasa su chequeo de ritmo: informativa ~1 de
>    cada 3-4 pantallas (nunca 3 seguidas de solo texto), checkpoint aplicado cada
>    4-5 pantallas, tipos variados, y ninguna pantalla de más de ~800 caracteres
>    sin interactividad informativa (repártela en una que contenga el texto, o
>    divide). Divide siempre por unidad de sentido y cambio de intención
>    (definición→aplicación, explicación→actividad, procedimiento→beneficios),
>    nunca con un corte mecánico de longitud: los caracteres son solo una alarma.
> 8. Toda evaluable o pregunta directa en SU PROPIA pantalla titulada «Actividad: …»
>    (sin teoría en student_text: intro de 2-3 frases con la instrucción de acción
>    final en negrita), DESPUÉS de todo lo que evalúa, con attempts: 3, alternando el
>    repertorio (choice, V/F, huecos, clasificar, escenario, caso por decisiones,
>    conversación, reto numérico si hay cálculo, caso; parejas con moderación y con
>    la instrucción de cómo responder en móvil; nunca ordenar pasos). Cierre de cada
>    tema: tarjetas de repaso o rosco + «Síntesis del tema»; sopa de letras y
>    crucigrama solo si hay vocabulario técnico que fijar.
>    Nunca hotspots, before_after, hidden_image, puzzle, vídeo interactivo ni
>    html_embed: esos los añade el editor humano desde SCORMEditor.
> 9. Máximo UNA imagen por pantalla y siempre como visual_resource, nunca ![...]
>    dentro de student_text; serie de figuras → una pantalla por punto, cada una
>    titulada con su punto. Si una pantalla ya lleva texto+imagen, NINGUNA interactividad en ella
>    (tampoco tabs/timeline/accordion): va en la pantalla siguiente con solo una
>    frase introductoria. Ni callouts vacíos ni rótulos/flechas de una infografía
>    volcados como texto suelto.
> 10. Nada de párrafos de desarrollo dentro de accordion/tabs/flip_cards: si cada
>     elemento tiene título propio, un párrafo de desarrollo o su imagen, va en su
>     propia pantalla tras una pantalla índice. Desplegables solo para listas cortas
>     (rótulo + 1-3 frases que aporten más que el rótulo); solo rótulos sin
>     desarrollo → lista en student_text. Ítems sin «a)»/«1.».
> 11. Una pantalla = una idea y UNA sola acción mental (comprender, explorar,
>     practicar, decidir o repasar). Ninguna interacción tras varios párrafos de
>     desarrollo: pantalla propia, con 1-2 frases naturales de introducción (qué
>     hacer y para qué). Series de tipos/formatos/casos: cada pantalla titulada
>     con su elemento concreto, sin clonar el título genérico del epígrafe.
> 12. En los campos de interacción (prompt, instructions, opciones, feedback,
>     front/back) solo negrita, cursiva y enlaces: nada de ##, ::: ni listas (eso
>     va en student_text o en los body de accordion/tabs/timeline, que sí admiten
>     markdown completo). Y si la extracción deja párrafos enteros en negrita o
>     como encabezado, restáuralos a párrafo normal.
> 13. IDs únicos en todo el curso (pantallas, interacciones, módulos, unidades,
>     tests, preguntas). authoring_entity = «MECOHISA S.L.» pero shell.brand VACÍO.
>     Test y foros van en Moodle: sin final_test, score_source "unit_tests",
>     completion_mode "screens", min_score 50, auto_return true; las preguntas de
>     test del documento, aparte. El preflight validate_course (contrato
>     §11) debe quedar a CERO errores y CERO avisos antes de empaquetar; no me
>     entregues el paquete si queda alguno.
> 14. Títulos: desde documento, el epígrafe literal con su número («3.2. …»);
>     los que redactes, nominales (no «Qué vas a aprender»); imagen de contenido
>     debajo del texto (layout bottom); lo que no sale del documento, marcado con
>     review y nota concreta.
>
> Antes de entregar: pasa el checklist de referencia-rapida.md y la revisión de
> fidelidad contra el PDF (cada epígrafe con su pantalla, mismo orden y jerarquía).
> En el informe final: % de cobertura por tema, nº de ** conservadas y resultado
> del checklist punto por punto.

(Sustituye «Unidad N» por lo que se pida —una unidad, un tema o el curso completo—.
El informe punto por punto del final no es
decorativo: obliga a autoevaluarse contra la lista y mejora el cumplimiento. Si el
usuario detecta un incumplimiento, la corrección más eficaz es en el mismo chat:
«Incumples la regla N. Corrígelo y regenera el .scormproj».)

**Con guion previo (una parada para revisar el troceo):**
> Genera el `.scormproj` de la Unidad N y enséñame antes el guion de pantallas.

Comportamiento: inventario + extracción + **guion completo de la unidad** (la tabla de
la guía: pantalla, epígrafe fuente, forma del bloque, **nº de caracteres**,
interacción, evaluable), **una
sola parada** para que el usuario lo apruebe o corrija sobre la tabla, y después
producción autónoma hasta la entrega. Corregir el guion es barato; regenerar la
unidad, no.

**Análisis previo (sin generar nada):**
> Analiza el documento: qué contenido hay, qué volumen tiene cada unidad/tema y cómo
> conviene dividirlo en SCORMs para Moodle.

Comportamiento: solo la Fase 0 ampliada — índice real del documento; palabras,
páginas e imágenes por unidad y tema; pantallas estimadas; y una **propuesta de
empaquetado** (qué `.scormproj` crear: normalmente uno por unidad —cada SCO de
Moodle—, u otra división si el volumen lo aconseja). Termina preguntando qué opción
produce. **No generes ningún parcial ni `.scormproj`.**

**Paso a paso (solo si el usuario lo pide expresamente):**
> Trabaja solo el Tema 1 y enséñame el parcial antes de seguir.

Comportamiento: el flujo con parada y pregunta entre temas (Fase 2 con validación
del usuario).
