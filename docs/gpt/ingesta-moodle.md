# Ingesta desde backup Moodle (fuente alternativa a PDF/Word)

Se activa **solo** cuando el usuario adjunta un backup Moodle (`.tar.gz`/`.tgz`/`.zip`/
`.mbz`, formato `moodle2`: contiene `moodle_backup.xml`, `activities/`, `sections/`,
`files/`, `files.xml`, `questions.xml`) en vez de un PDF/Word. **No cambia nada del
resto del contrato**: `contrato-course-json.md`, `guia-diseno-interacciones.md` y
`flujo-factoria-unidades.md` se aplican tal cual — este documento solo sustituye el
**paso de extracción** (`extract_text_markdown` → `extract_moodle_backup`, más abajo) y
añade unas pocas reglas propias de esta fuente (numeradas 1 a 4 más abajo). Todo
lo demás (guion de pantallas,
interactividades, checkpoints, callouts, objetivos, portada/resumen, glosario,
bibliografía, empaquetado `.scormproj`, `validate_course`/`build_scormproj`) se
mantiene **sin cambios**.

> Distinto de `scripts/moodle-import/` del repo (herramienta Node determinista, mapeo
> literal página→pantalla sin enriquecer): este documento es para que **el GPT
> enriquezca pedagógicamente** el backup Moodle exactamente igual que hace con un
> PDF/Word — portada, objetivos, interactividades variadas, checkpoints, cierre.

## Alcance
Solo interesan las actividades **`lesson`** (páginas de contenido, sin ramificar) y,
únicamente si el usuario pide el test dentro del SCORM, **`quiz`** (preguntas
`multichoice`/`truefalse` de un banco simple; por defecto el test se queda en Moodle,
ver «Quiz y foros»). Cualquier otra
actividad (`forum`, `label`, `page`, `resource`, `customcert`…) se ignora: no tiene
equivalente en el modelo de SCORMEditor.

## Regla nueva 1 — la página de Moodle es una PISTA de corte, no un molde rígido
**Corregida (jul 2026) tras detectar en producción real (Unidad 2 de un curso) que la
versión anterior de esta regla («nunca fusiones el contenido de dos páginas en una
sola pantalla») producía peor resultado que con PDF**: unidades con el mismo `title`
repetido en 6-10 pantallas seguidas (copiado literal del `title` de página de Moodle,
que el autor a menudo NO cambia entre páginas consecutivas de un mismo apartado) y una
lista de 4-5 puntos que Moodle trae en 4-5 páginas separadas acababa en 4-5 pantallas
casi idénticas (una frase cada una) en vez de **una** pantalla o interactividad bien
formada con todos los puntos — exactamente lo que el criterio de PDF ya evita.

La regla correcta:
- **Fidelidad de orden y contenido, sí; fidelidad de recuento de pantallas, no.** El
  **orden real** de las páginas (enlazado `prevpageid`/`nextpageid` de `lesson.xml`,
  nunca el título) es la fuente de verdad de la secuencia: nunca reordenes ni te
  saltes contenido de una página. Pero el número de pantallas que generes **no tiene
  que ser 1:1 con el número de páginas**.
- **Detecta cuándo varias páginas consecutivas son en realidad UN solo bloque**: señal
  clara — el `title` de página se repite igual (o casi igual) en páginas seguidas, o
  cada página trae solo un fragmento de una misma lista/idea (p. ej. una página por
  cada punto de una enumeración). En ese caso, **trátalas como una unidad de sentido
  única** (mismo criterio que con un PDF: «una idea y UNA acción mental por pantalla;
  pantalla nueva al cambiar la intención») y decide tú, con tu criterio pedagógico
  normal y el **criterio de corte** de la guía («Corte: pantalla propia o
  desplegable»), en cuántas pantallas se reparte esa unidad: si cada punto es solo un
  rótulo o una frase breve, una sola pantalla con el listado completo o una
  interactividad (`accordion`/`tabs`) con **todos** los puntos como ítems (nunca un
  `accordion`/`tabs` de un único ítem); si cada punto trae su párrafo de desarrollo o
  su propia imagen, **una pantalla índice** con la lista + **una pantalla por punto**,
  titulada con él. Lo único que no debes hacer es perder alguno de los puntos que
  traían las páginas fusionadas, ni dejar varias pantallas casi idénticas con el mismo
  título.
- Sí puedes también **dividir** una página larga en varias pantallas si mezcla ideas
  distintas, o **insertar** pantallas nuevas alrededor (portada del tema, objetivos,
  checkpoints, cierre) — el guion de pantallas de siempre decide, exactamente igual
  que con un PDF; las páginas de Moodle son el material de partida, no el guion.
- Cada **lección** de la sección (`mod_lesson`) es un candidato natural a **unidad**
  (`modules[].units[]`) o, si son muchas y cortas, agrupa varias lecciones de la misma
  sección en una sola unidad — decide con el mismo criterio de tamaño que usarías con
  un PDF (evita unidades de 2-3 pantallas sueltas).

**Caso real que motivó esta corrección** (para reconocer el patrón): 5 páginas de
Moodle seguidas, todas tituladas «1.4 Diversidad de formatos», cada una con **un único
formato** (`## Formatos más habituales` + 1-2 frases) y **su propia imagen**
(`[IMG src="2. Infografía..." ]`, `[IMG src="3. Relato narrativo..."]`…). La versión
anterior de la regla generó 5 pantallas de contenido casi idénticas (mismo `title`,
un párrafo cada una). **Lo correcto**: reconocer que son 5 elementos de una misma
enumeración, cada uno con su texto y su imagen → **una pantalla índice** («Formatos
de la historia de vida»: una frase de entrada + la lista de los 5 formatos) y **una
pantalla por formato**, titulada con su nombre («Relato narrativo», «Línea de
vida»…), con su texto y su imagen debajo (`layout: "bottom"`). Nunca el `title` de
Moodle repetido en las cinco.

## Regla nueva 1.1 — un título es una ETIQUETA, nunca una copia de una frase del origen
**Corregida por segunda vez (jul 2026)**: la primera corrección de esta regla solo
prohibía copiar el `title` de página de Moodle — y el GPT, cumpliéndola al pie de la
letra, empezó a copiar en su lugar **otra frase repetida del origen**: el encabezado
`##` que Moodle repite dentro del propio texto de varias páginas seguidas (7 pantallas
tituladas literalmente «Formatos más habituales», que es el `## Formatos más
habituales` que aparece igual en las 7 páginas). **La regla de fondo, generalizada**:

> Un `title` de pantalla, un `interaction.prompt`, o el `title` de un ítem de
> `accordion`/`tabs`/`flip_cards`/`timeline` es una **etiqueta que resume o representa
> el contenido con tus propias palabras** — nunca el resultado de copiar/recortar la
> frase que tengas más a mano (el `title` de página de Moodle, un `##` del texto, o el
> arranque del párrafo que va a mostrar). No es una prohibición literal de palabras
> concretas ni un recuento: es sentido común editorial, el mismo criterio que ya
> aplicas al titular una pantalla de PDF sin epígrafe explícito — **¿qué idea distingue
> a esto de sus vecinos?**, y eso es el título. Cuando dos pantallas o dos ítems te
> queden con el mismo título, es la señal de que no has parado a pensar cuál es la idea
> propia de cada uno — vuelve a leer el contenido y decide.

Esto es criterio editorial al **redactar** — no lo conviertas en una lista mientras
escribes. La red de seguridad mecánica va **después**, al entregar:
`check_moodle_titles` (más abajo en este documento) detecta automáticamente títulos
de ítem genéricos por plantilla («Aspecto 1», «Clave 2»…) y títulos truncados a mitad
de frase — los dos fallos que se han colado en producción real pese a esta regla.
Ejecútalo siempre antes de empaquetar (regla 12 del prompt reforzado).

**Ejemplo real (antes → después)**, mismo caso que en la Regla nueva 1 (5 páginas
seguidas, todas con `## Formatos más habituales`, cada una con un formato distinto):

❌ Generado (dos veces, con la regla anterior):
```json
{"id": "s29", "title": "Formatos más habituales", "student_text": "## Formatos más habituales\n\n- **Documento estructurado: **(Ejemplo: ficha o registro...)"},
{"id": "s30", "title": "Formatos más habituales", "student_text": "## Formatos más habituales\n\n- **Relato narrativo: **(Ejemplo: historia contada...)"}
```
✅ Correcto — una pantalla índice y una pantalla por formato, cada una con SU título
(cada formato trae su párrafo y su imagen, así que no va en un desplegable):
```json
{"id": "s29", "title": "Formatos de la historia de vida", "student_text": "La historia de vida puede recogerse de diferentes maneras. No hay un único formato válido. Los más habituales son:\n- Documento estructurado\n- Relato narrativo\n- Línea de vida\n- Material gráfico\n- Formatos digitales"},
{"id": "s30", "title": "Documento estructurado", "student_text": "Ficha o registro en el centro con apartados como datos personales, gustos, hábitos...", "visual_resource": {"kind": "image", "src": "assets/img/s30_documento.png", "alt": "...", "layout": "bottom", "media_align": "center"}},
{"id": "s31", "title": "Relato narrativo", "student_text": "Historia contada de forma continua donde la persona relata su vida con sus propias palabras..."}
```
(El título de cada pantalla = el nombre del formato, 1-3 palabras, que SÍ puede
coincidir con una frase corta del origen si esa frase ya era el nombre propio del
concepto —«Documento estructurado» es el nombre del formato, no un resumen de su
primera frase—, pero nunca la primera cláusula genérica de la explicación como «Por
ejemplo» o «Un aspecto clave del modelo actual». Si los formatos fueran solo rótulos
con una frase cada uno y sin imagen, entonces sí: una pantalla con un `accordion` de
cinco ítems.)

## Recordatorio de formato — integridad de `**` y `:::` al fusionar/reescribir texto
Al consolidar contenido de varias páginas (Regla nueva 1) es fácil desemparejar
negritas o dejar una valla de callout a mitad de línea — **pasó en producción real**:
`"Por ejemplo**:"` (falta el `**` de apertura), `"*** Tareas del alumnado:***"` (triple
asterisco), y `"...útil**::: important"` (el `:::` quedó pegado al final de la frase
anterior en la misma línea — el runtime exige `:::` **sola en su línea**, si no, el
callout no se pinta y salen los símbolos sueltos). Antes de entregar cada pantalla:
- **Cuenta los `**`** de cada campo de texto: tienen que ser pares (abre y cierra). Si
  sale impar, hay una negrita rota — corrígela o quítala, nunca la dejes a medias.
- **Nunca `*` triple o simple suelto** (`*texto*` es cursiva, `**texto**` es negrita;
  no mezcles ni triples).
- **Toda valla `::: tipo`/`:::`de cierre va SOLA en su línea**, con una línea en blanco
  antes y después del bloque — nunca pegada al final de la frase previa.
- El origen Moodle trae a menudo listas con el término destacado al inicio
  (`- **Documento estructurado: **(Ejemplo…)`). `extract_moodle_backup` ya las entrega
  con el espacio correcto tras el guion (`- **Término:** desarrollo`); no lo pierdas
  al reescribir (`-**Término:**desarrollo`, sin espacio, **no se renderiza como
  lista** — contrato §4.1).
- Si vas a **conservar un fragmento tal cual** de la extracción (sin fusionarlo ni
  reordenarlo), cópialo literal — no lo reteclees: así no se desempareja nada.

## Regla nueva 2 — cajas de diseño personalizado → callouts
Las páginas suelen traer `<div class="caja caja-COLOR">` (colores vistos:
`verde`/`roja`/`violeta`/`naranja`/`azul`/`amarilla`/`rosa`) con un `<h4>` de rótulo.
`extract_moodle_backup` (abajo) las conserva **crudas**, marcadas
`[CAJA class="caja-COLOR"]…[/CAJA]`, con el `<h4>` dentro: **tú decides** el callout
final leyendo el rótulo del `<h4>`, igual que ya infieres callouts de una caja de color
en un PDF. Tabla de partida (amplíala si el rótulo no encaja):

| Rótulo del `<h4>` (o similar) | Callout |
|---|---|
| «Importante» | `important` |
| «¿Sabías que…?» | `fact` |
| «Actividad práctica» / «Caso práctico» / con tarea | sin callout: pantalla `case_practice` o `reflection` en la **pantalla siguiente**, solución en `feedback.explanation` (regla de siempre) |
| «Síntesis» / «En resumen» | `summary` |
| «Caso» / «Ejemplo» (sin tarea) | `case` |
| «Reflexiona» / «Clave de reflexión» / «Resolución propuesta» | `reflect` |
| «Consejo» | `tip` |
| «Atención» | `warn` |
| «Referencias» / bibliografía suelta | **no** la metas como callout: pásala a `bibliography[]` (regla de siempre) |
| Sin rótulo claro o color sin equivalente | bloque personalizado `::: custom \| #color \| icono \| título` |

Nunca copies la clase CSS ni el color hex de Moodle al bloque personalizado — no hay
forma fiable de saber el hex real del tema Moodle; elige un color de la paleta
corporativa ya usada en el curso (ver `guia-diseno-interacciones.md`).

## Regla nueva 3 — marcas de trabajo interno del autor
Títulos con prefijo `(MODIFICAR)`, `(BORRAR)`, `(REVISAR)` o `(PENDIENTE)`: **limpia el
prefijo** del `title`/`course.title` visible, pero deja rastro — añade a
`editor_notes` de la primera pantalla que salga de esa lección: `"Importado de Moodle:
el origen llevaba la marca «(MODIFICAR)», revisar contenido."` y pon
`"status": "borrador"` en **esas pantallas** (`screen.status`).

> **`status: "borrador"` es EXCLUSIVO de pantalla — nunca lo pongas en la unidad ni en
> el módulo.** `Unit.status` es un enum DISTINTO y más corto (`"ok"` |
> `"esqueleto_pendiente_desarrollo"`, sin `"borrador"`): si una lección entera viene
> marcada y se te ocurre propagar el mismo `"borrador"` a `unit.status` para
> "resumir", **rompe la carga en el editor real** (detectado en producción:
> `modules.0.units.0.status: Invalid enum value`) aunque `validate_course` no lo
> pillara en su momento (ya corregido, contrato §11, chequea ahora este enum). Si
> quieres señalar que una unidad entera está pendiente de revisión, dilo en el
> `summary` de la unidad o dedúcelo de que todas sus pantallas están en `borrador` —
> nunca toques `unit.status`; omite esa clave (el default `"ok"` es correcto) o pon
> `"ok"` explícito.

Una lección entera `(BORRAR)` (plantilla, relleno de prueba): **ignórala por
completo**, no generes pantallas de ella.

## Quiz y foros de la sección → se quedan en Moodle
Por defecto, **una unidad = una sección de Moodle con lección(es) = un `.scormproj`**
(como en «Genérame el curso completo, un `.scormproj` por unidad» de
`flujo-factoria-unidades.md`). Los `quiz` y los `forum` de la sección **no** entran en
el paquete: el test y los foros viven en Moodle (contrato §2, reglas SCORM por
defecto: `final_test: null`, `score_source: "unit_tests"`, `completion_mode:
"screens"`). Si el usuario pide expresamente el test dentro del SCORM, cada `quiz`
aporta su `question_bank` (mismo shape del contrato §7: `single_choice`/`true_false`,
banco simple `multichoice`/`truefalse` de Moodle) y se vuelca en
`assessments.final_test` (`merge_unit(..., test_in_scorm=True)` si se fusionan
varias secciones).

## Regla nueva 4 — limpieza propia de cada tipo de copia
- **Copia con lecciones (HTML)**: limpia también las **portadas**, no solo los
  títulos de pantalla («Unidad 1 - TEMA 1. LA PREVENCIÓN DE CAÍDAS» → `cover` con
  «Tema 1. La prevención de caídas»: sin el prefijo de gestión y sin mayúsculas
  sostenidas). Una página que **solo repite el título** del tema se convierte en la
  **portada del tema**, no en una pantalla de contenido vacía. Las **reflexiones
  abiertas** del original («Piensa en…», «Reflexiona sobre…» sin respuesta única) van
  en pantalla propia («Actividad: …») como callout `reflect` con sus **preguntas
  numeradas** (`1. `…), tal cual: sin inventar rúbricas ni convertirlas en
  `case_practice`.
- **Copia con SCORM (Captivate/Storyline)**: los títulos de tema se quedan sin el
  soporte («Tema 3. Vídeo: Movilización segura» → «Tema 3. Movilización segura»; igual
  con «Presentación:», «Animación:»…). Lo dudoso (texto de diapositiva ilegible,
  interacción del original sin equivalente, orden incierto, audio sin transcripción)
  se marca para revisión con `review` (`{"flagged": true, "note": "…"}`, contrato §4)
  y una nota concreta de **qué** revisar («Diapositiva 12 de Captivate: el arrastre
  original tenía 6 elementos y solo se leen 4»).

## `extract_moodle_backup` (Code Interpreter, Python estándar — sin dependencias)

```python
import tarfile, zipfile, os, re, glob
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import unquote

def _extract_archive(path, dest):
    if tarfile.is_tarfile(path):
        with tarfile.open(path) as t:
            t.extractall(dest, filter="data")
    else:
        with zipfile.ZipFile(path) as z:
            z.extractall(dest)
    return dest


class _MoodleHtmlToMd(HTMLParser):
    """Portado del mismo algoritmo probado en el importador Node
    (scripts/moodle-import/html-to-md.mjs): pila de bloques, listas
    aplanadas (Moodle a veces anida <ul> mal formado), cajas conservadas
    crudas para que el GPT las clasifique (regla nueva 2)."""
    INLINE = {"strong", "b", "em", "i", "u", "span", "br", "a"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out, self.buf, self.stack = [], "", []

    def _flush(self):
        t = self.buf.strip()
        if t:
            self.out.append(t)
        self.buf = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("strong", "b"):
            self.buf += "**"
        elif tag in ("em", "i"):
            self.buf += "*"
        elif tag == "a" and a.get("href"):
            self.buf += "["
            self.stack.append(("a", a["href"]))
        elif tag == "br":
            self.buf += "\n"
        elif tag == "h4":
            self._flush()
        elif tag == "li":
            self._flush()
        elif tag == "img":
            self._flush()
            src = unquote((a.get("src") or "").replace("@@PLUGINFILE@@/", ""))
            self.out.append(f'[IMG src="{src}" alt="{a.get("alt", "")}"]')
        elif tag == "div" and "caja" in (a.get("class") or ""):
            self._flush()
            self.out.append(f'[CAJA class="{a.get("class")}"]')

    def handle_endtag(self, tag):
        if tag in ("strong", "b"):
            self.buf += "**"
        elif tag in ("em", "i"):
            self.buf += "*"
        elif tag == "a" and self.stack and self.stack[-1][0] == "a":
            _, href = self.stack.pop()
            self.buf += f"]({href})"
        elif tag == "h4":
            t = self.buf.strip(); self.buf = ""
            if t:
                self.out.append("## " + t)
        elif tag == "li":
            t = self.buf.strip(); self.buf = ""
            if t:
                self.out.append("- " + t)
        elif tag == "div":
            self._flush()
            # cierra la última caja abierta sin cerrar (aproximación: Moodle
            # no anida cajas, basta con cerrar al primer </div> tras abrirla)
            for i in range(len(self.out) - 1, -1, -1):
                if self.out[i].startswith('[CAJA') and not self.out[i].startswith('[CAJA_END'):
                    self.out.append("[/CAJA]")
                    break

    def handle_data(self, data):
        self.buf += re.sub(r"\s+", " ", data)

    def result(self):
        self._flush()
        return "\n\n".join(self.out)


def _md(html):
    p = _MoodleHtmlToMd()
    p.feed(html or "")
    return p.result()


def _pages_in_order(lesson_el):
    pages = {p.get("id"): p for p in lesson_el.findall(".//pages/page")}
    head = next((p for p in pages.values() if p.findtext("prevpageid") == "0"), None)
    ordered, seen, cur = [], set(), head
    while cur is not None and cur.get("id") not in seen:
        seen.add(cur.get("id")); ordered.append(cur)
        nxt = cur.findtext("nextpageid")
        cur = pages.get(nxt) if nxt and nxt != "0" else None
    for p in pages.values():  # red de seguridad: páginas huérfanas del enlazado
        if p.get("id") not in seen:
            ordered.append(p)
    return ordered


def _files_index(backup_dir):
    """component|filearea|itemid|filename -> ruta física files/<hash[:2]>/<hash>."""
    idx = {}
    root = ET.parse(os.path.join(backup_dir, "files.xml")).getroot()
    for f in root.findall("file"):
        fn = f.findtext("filename")
        if not fn or fn == "." or f.findtext("mimetype") in (None, "$@NULL@$"):
            continue
        key = (f.findtext("component"), f.findtext("filearea"),
               f.findtext("itemid"), unquote(fn))
        h = f.findtext("contenthash")
        idx[key] = os.path.join(backup_dir, "files", h[:2], h)
    return idx


def _question_bank(backup_dir):
    root = ET.parse(os.path.join(backup_dir, "questions.xml")).getroot()
    bank = {}
    for entry in root.findall(".//question_bank_entry"):
        entry_id = entry.get("id")
        q = entry.find(".//questions/question")
        if q is not None:
            bank[entry_id] = q
    return bank


def _question_to_dict(q):
    qtype = q.findtext("qtype")
    prompt = _md(q.findtext("questiontext")).replace("\n", " ").strip()
    if qtype == "multichoice":
        single = q.findtext(".//multichoice/single") == "1"
        opts = [{"text": _md(a.findtext("answertext")).replace("\n", " ").strip(),
                 "correct": float(a.findtext("fraction") or 0) > 0}
                for a in q.findall(".//plugin_qtype_multichoice_question/answers/answer")]
        return {"prompt": prompt, "type": "single_choice" if single else "multiple_choice",
                "options": opts}
    if qtype == "truefalse":
        opts = [{"text": a.findtext("answertext").strip(),
                 "correct": float(a.findtext("fraction") or 0) > 0}
                for a in q.findall(".//plugin_qtype_truefalse_question/answers/answer")]
        return {"prompt": prompt, "type": "true_false", "options": opts}
    return None


def extract_moodle_backup(archive_path, workdir="/mnt/data/_moodle_extract"):
    """Devuelve:
    {
      "course_title": str,
      "sections": [
        { "section_id": str, "title": str,
          "lessons": [ { "title": str, "flagged": bool,  # (MODIFICAR)/(REVISAR)/...
                          "pages": [ {"title": str, "md": str} ] } ],
          "quiz_title": str | None,
          "questions": [ {prompt, type, options[{text,correct}]} ] },
        ...
      ],
      "resolve_image": callable(page_id, filename) -> ruta física o None,
      "skipped_questions": [ {unit, quiz, qtype, name} ],  # ver nota tras la función
    }
    Ignora lecciones marcadas (BORRAR) y actividades que no sean lesson/quiz.
    """
    backup_dir = _extract_archive(archive_path, workdir)
    bxml = ET.parse(os.path.join(backup_dir, "moodle_backup.xml")).getroot()
    course_title = bxml.findtext(".//original_course_fullname") or ""

    acts = [{"moduleid": a.findtext("moduleid"), "sectionid": a.findtext("sectionid"),
             "modulename": a.findtext("modulename"), "title": a.findtext("title") or "",
             "directory": a.findtext("directory")}
            for a in bxml.findall(".//activities/activity")]
    secs = [{"id": s.findtext("sectionid"), "title": s.findtext("title") or ""}
            for s in bxml.findall(".//sections/section")]

    FLAG_RE = re.compile(r"^\s*\((MODIFICAR|REVISAR|PENDIENTE)\)\s*")
    DISCARD_RE = re.compile(r"^\s*\(BORRAR\)")

    files_idx = _files_index(backup_dir)
    qbank = _question_bank(backup_dir)

    def resolve_image(page_id, filename):
        return files_idx.get(("mod_lesson", "page_contents", page_id, unquote(filename)))

    sections_out = []
    skipped_questions = []
    for sec in secs:
        sec_acts = [a for a in acts if a["sectionid"] == sec["id"]]
        lessons = [a for a in sec_acts if a["modulename"] == "lesson"
                   and not DISCARD_RE.match(a["title"])]
        quizzes = [a for a in sec_acts if a["modulename"] == "quiz"]
        if not lessons or not quizzes:
            continue  # no sigue el patrón "lecciones + 1 test": portada/cierre del curso

        lessons_out = []
        for lesson in lessons:
            lx = ET.parse(os.path.join(backup_dir, lesson["directory"], "lesson.xml")).getroot()
            pages = []
            for p in _pages_in_order(lx):
                pages.append({"title": (p.findtext("title") or "").strip(),
                              "md": _md(p.findtext("contents"))})
            lessons_out.append({
                "title": FLAG_RE.sub("", lesson["title"]).strip(),
                "flagged": bool(FLAG_RE.match(lesson["title"])),
                "pages": pages,
            })

        quiz = quizzes[0]
        qx = ET.parse(os.path.join(backup_dir, quiz["directory"], "quiz.xml")).getroot()
        instances = sorted(qx.findall(".//question_instances/question_instance"),
                            key=lambda qi: int(qi.findtext("slot") or 0))
        questions = []
        for qi in instances:
            entry_id = qi.findtext(".//question_reference/questionbankentryid")
            q = qbank.get(entry_id)
            if q is None:
                continue
            d = _question_to_dict(q)
            if d:
                questions.append(d)
            else:  # qtype no soportado (match/shortanswer/essay/numerical…): NUNCA
                    # lo inventes como single_choice sin opciones — repórtalo.
                skipped_questions.append({"unit": sec["title"], "quiz": quiz["title"],
                                           "qtype": q.findtext("qtype"),
                                           "name": (q.findtext("name") or "").strip()})

        sections_out.append({
            "section_id": sec["id"], "title": sec["title"],
            "lessons": lessons_out,
            "quiz_title": FLAG_RE.sub("", quiz["title"]).strip(),
            "questions": questions,
        })

    return {"course_title": course_title, "sections": sections_out,
            "resolve_image": resolve_image, "skipped_questions": skipped_questions}
```

`skipped_questions`: preguntas del banco que NO son `multichoice`/`truefalse` (p. ej.
`match`, `shortanswer`, `essay`, `numerical`) — **no tienen equivalente en
`QuizQuestion`** (contrato §7, solo `single_choice`/`true_false`/`multiple_choice`).
No las inventes ni las conviertas a una aproximación: **avísalo** — una línea en el
informe final por pregunta omitida (unidad, tipo Moodle, enunciado) para que el autor
la añada a mano en el editor si la quiere conservar.

### Uso típico (dentro del flujo de fábrica)

```python
data = extract_moodle_backup("/mnt/data/Copia-curso.tar.gz")
print(f'"{data["course_title"]}" — {len(data["sections"])} secciones con lección+quiz')
for sec in data["sections"]:
    n_pages = sum(len(l["pages"]) for l in sec["lessons"])
    print(f'  {sec["title"]}: {len(sec["lessons"])} lecciones, {n_pages} páginas, '
          f'{len(sec["questions"])} preguntas')
if data["skipped_questions"]:
    print(f'\n⚠ {len(data["skipped_questions"])} pregunta(s) sin equivalente, EXCLUIDAS:')
    for s in data["skipped_questions"]:
        print(f'  {s["unit"]} / {s["quiz"]}: [{s["qtype"]}] {s["name"]}')
# A partir de aquí: Fase 0 (inventario, ya es EXACTO, no una estimación) →
# Fase 1 por sección (monta el guion de pantallas por UNIDAD DE SENTIDO —agrupa o
# divide páginas según la idea, regla nueva 1—, con título propio por pantalla
# —regla nueva 1.1—, clasifica cada `[CAJA class="caja-X"]…[/CAJA]` en un callout
# —regla nueva 2— y cada `[IMG src="…" alt="…"]` en un visual_resource resuelto con
# resolve_image(page_id, filename)) → Fase 3 (build_scormproj, contrato §11).
```

Las imágenes que devuelve `resolve_image` son **rutas físicas en disco**: léelas con
`open(ruta, "rb").read()` para meterlas en el `asset_files` de `build_scormproj` (§11
del contrato), con `alt` obligatorio igual que en el flujo de PDF.

## `check_moodle_titles` — autocontrol MECÁNICO antes de entregar (obligatorio)

**Por qué existe (jul 2026, tercera corrección de este documento)**: las Reglas 1.1 y
el recordatorio de formato, escritas como prosa, se incumplieron tres veces seguidas
en producción real, cada vez de una forma nueva — primero copiando el `title` de
página de Moodle, luego copiando un `##` repetido del texto, luego con **títulos de
ítem genéricos por plantilla** (`"Aspecto 1"`, `"Clave 2"`, `"Concepto 3"`,
`"Momento 1"` — ni siquiera derivados del contenido, un patrón nuevo) y **títulos de
pantalla truncados a mitad de frase** (`"No es un documento"` en vez de «Un proceso,
no un documento», `"solo es útil si guía las"` cortado en seco) en vez de redactados.
La prosa sola no basta — igual que `validate_course` (contrato §11) no se explica solo
con prosa, sino con una función que **falla mecánicamente** si algo no cuadra. Esta es
esa función para la calidad editorial específica de origen Moodle (el schema no la
detecta: un título truncado o repetido sigue siendo un `string` válido).

```python
import re

GENERIC_ITEM_TITLE = re.compile(
    r'^(Aspecto|Clave|Concepto|Momento|Idea|Punto|Elemento|Ítem|Paso)\s*\d*$', re.I)
HEADING_NUMBERING = re.compile(r'^(#{2,4})\s*\d+(?:\.\d+)*\.?\s+', re.M)

def _norm(t):
    return re.sub(r'\s+', ' ', str(t or '')).strip().lower()

def check_moodle_titles(course):
    """Preflight de calidad editorial específico de la ingesta Moodle. Devuelve
    mensajes 'WARN: ...'. No sustituye a validate_course (§11) — corre ADEMÁS,
    antes de empaquetar. Cero WARN antes de entregar; si alguno es un falso
    positivo genuino (título corto que coincide con un nombre propio del
    concepto, ver Regla 1.1), anótalo en el informe en vez de ignorarlo en
    silencio."""
    out = []
    titles_seen = {}

    def check_text_field(where, text):
        if not text:
            return
        stars = text.count('**')
        if stars % 2 != 0:
            out.append(f"WARN: {where}: negrita ** desemparejada — cuenta {stars}, revisa el campo completo")
        if 'Por ejemplo:**' in text or re.search(r'[^*]\*\*:\s', text):
            out.append(f"WARN: {where}: negrita rota tipo «Por ejemplo:**» (falta el ** de apertura)")
        for m in re.finditer(r'^.*:::.*\S.*$', text, re.M):
            line = m.group(0).strip()
            if not re.match(r'^:::\s*[A-Za-z]*\s*.*$', line) and line != ':::':
                out.append(f"WARN: {where}: ':::' pegado a texto en la misma línea (debe ir sola): {line[:60]!r}")
        m = HEADING_NUMBERING.search(text)
        if m:
            out.append(f"WARN: {where}: encabezado con numeración de Moodle sin quitar ({m.group(0).strip()} …)")

    def check_title(where, title, body, is_item=False):
        if not title:
            return
        if is_item and GENERIC_ITEM_TITLE.match(title.strip()):
            out.append(f"WARN: {where}: título de ítem genérico por plantilla «{title}» — "
                        f"redáctalo a partir de SU contenido, nunca 'Aspecto N'/'Concepto N'/'Clave N'")
        if body:
            # Quita marcas de bloque (##, -, :::) para comparar solo el texto real
            bn = re.sub(r'^[#\-\s:]+', '', _norm(body))
            tn = _norm(title)
            if tn and len(tn) > 8 and (bn.startswith(tn) or tn in bn[:len(tn) + 15]):
                out.append(f"WARN: {where}: título «{title}» es un recorte literal del arranque del "
                            f"propio texto (frase truncada, no un título compuesto)")
        key = _norm(title)
        if key:
            titles_seen.setdefault(key, []).append(where)

    for m in course.get('modules', []):
        for u in m.get('units', []):
            for s in u.get('screens', []):
                where = f"pantalla {s.get('id')} «{s.get('title')}»"
                check_title(where, s.get('title'), s.get('student_text'))
                check_text_field(where + '.student_text', s.get('student_text'))
                it = s.get('interaction')
                if it:
                    check_text_field(where + '.interaction.prompt', it.get('prompt'))
                    cfg = it.get('config') or {}
                    for key in ('items', 'cards', 'milestones'):
                        for i, x in enumerate(cfg.get(key) or []):
                            body = x.get('body') or x.get('back') or ''
                            title = x.get('title') or x.get('front') or x.get('label') or ''
                            iwhere = f"{where}.{key}[{i}]"
                            check_title(iwhere, title, body, is_item=True)
                            check_text_field(iwhere, body)

    for key, wheres in titles_seen.items():
        if len(wheres) > 1:
            out.append(f"WARN: título «{key}» repetido en {len(wheres)} sitios: "
                        f"{', '.join(wheres[:6])}{'…' if len(wheres) > 6 else ''} — "
                        f"revisa si cada uno es de verdad continuación de la misma idea")
    return out
```

**Úsala así**, sobre el `course` de CADA `.scormproj` antes de `build_scormproj` (§11):
```python
warnings = check_moodle_titles(course)
for w in warnings: print(w)
```
**Cero WARN antes de entregar** (misma disciplina que `validate_course` a cero
errores). Un WARN de título repetido puede ser un falso positivo legítimo
(continuación genuina de una misma idea en pantallas consecutivas) — en ese caso
anótalo explícitamente en el informe final («título X repetido en pantallas N/M:
continuación de la misma idea, no un fallo»), nunca lo ignores en silencio sin
revisarlo primero.

## Orden de trabajo típica (prompt reforzado, jul 2026)

Análogo al «Prompt reforzado» de `flujo-factoria-unidades.md` para PDF, pero con las
reglas propias de esta fuente ancladas como bloqueantes. Petición directa habitual:

> Genera todos los `.scormproj` del backup Moodle adjunto (uno por unidad).

Con esta forma, trata las reglas numeradas del prompt reforzado (más abajo) como
**bloqueantes**: si alguna falla, corrige y regenera antes de entregar.

> Adjunto el backup de Moodle (.tar.gz). Genera **todos los `.scormproj` COMPLETOS**
> del curso en modo factoría autónomo: un `.scormproj` por cada sección de Moodle que
> tenga lecciones (una por unidad). Encadena inventario → unidades → fusión sin
> preguntarme nada entre unidades. Si te quedas sin espacio, guarda parciales y di
> solo «continúa».
>
> Antes de producir, abre y lee con Code Interpreter `ingesta-moodle.md`,
> `contrato-course-json.md`, `guia-diseno-interacciones.md` y `referencia-rapida.md`.
> No trabajes de memoria.
>
> Reglas INNEGOCIABLES (si alguna falla, corrige y regenera antes de entregarme nada):
> 1. Extrae con `extract_moodle_backup` (`ingesta-moodle.md`), nunca reconstruyas el
>    contenido de memoria. Ratio de cobertura ≥0.95 por unidad y negritas `**`
>    conservadas.
> 2. **Nunca pierdas ni reordenes contenido de página** (el orden real es el enlazado
>    `prevpageid`/`nextpageid`, nunca el título), pero el número de pantallas NO tiene
>    que ser 1:1 con el número de páginas: si varias páginas seguidas repiten el mismo
>    `title` o son fragmentos de una misma lista/idea, trátalas como una unidad: lista
>    o desplegable si son rótulos o frases breves; pantalla índice + una pantalla por
>    punto si cada uno trae su párrafo o su imagen (ver el caso «Diversidad de
>    formatos» en `ingesta-moodle.md`) — igual que decidirías con un PDF. Limpia
>    también las portadas y convierte en portada la página que solo repite el título
>    (regla 4).
> 2b. Cada `title`/`prompt`/`item.title` **representa el contenido con tus propias
>     palabras** (sentido común editorial, no un recorte de la frase que tengas más a
>     mano: ni el `title` de página de Moodle, ni un `##` repetido, ni el arranque del
>     `body`). Si dos pantallas o dos ítems acaban con el mismo título sin ser
>     continuación genuina de una misma idea, es que no pensaste la idea propia de
>     cada uno — vuelve a leerlos y decide (regla 1.1, con ejemplo antes/después en
>     `ingesta-moodle.md`).
> 2c. **Antes de entregar cada `.scormproj`, verifica la integridad de `**` y `:::`**
>     en TODOS los campos de texto: cuenta los `**` de cada campo (deben ser pares),
>     nunca `*`/`***` sueltos, y toda valla `:::` va sola en su línea con blanco antes
>     y después. Pasó en producción real: `"Por ejemplo**:"` (negrita sin abrir),
>     `"*** Tareas:***"` (triple asterisco), `"...útil**::: important"` (callout pegado
>     a la frase anterior, no se pinta). Si vas a conservar un fragmento tal cual de la
>     extracción, cópialo literal — no lo reteclees.
> 3. Cada `[CAJA class="caja-COLOR"]…[/CAJA]` la clasificas tú en un callout leyendo su
>    `<h4>` (tabla de partida más arriba), nunca la dejas como texto plano ni la
>    copias literal.
> 4. Títulos con `(MODIFICAR)`/`(BORRAR)`/`(REVISAR)`/`(PENDIENTE)`: limpia el prefijo
>    del título visible, pero deja rastro en `editor_notes` + `status: "borrador"`.
>    Una lección `(BORRAR)` entera: ignórala.
> 5. Los ejercicios prácticos (`case_practice`, `reflection`, `::: reflect`)
>    van en SU PROPIA pantalla («Actividad: …»), solo con el enunciado. La «Resolución
>    propuesta» / «Clave de reflexión» va en `feedback.explanation`, NUNCA visible en
>    `student_text`. Una reflexión abierta sin solución: callout `reflect` con sus
>    preguntas numeradas, sin rúbrica inventada.
> 6. Nunca dos callouts del mismo tipo en una pantalla: eso son dos pantallas. Sin
>    rótulos («Actividad práctica», «Idea clave:»…).
> 7. Antes de producir cada unidad, monta el guion de pantallas (guía) **por unidad de
>    sentido** (las páginas de Moodle son el material de partida, agrúpalas o
>    divídelas según la idea, regla 2), con chequeo de ritmo: informativa ~1 de cada
>    3-4 pantallas, checkpoint
>    al final de cada subtema (+1 intercalada si es largo), tipos variados, ninguna pantalla de más de ~800 caracteres sin
>    revisar (dividir por donde cambia la idea).
> 8. Toda evaluable o pregunta directa en SU PROPIA pantalla titulada «Actividad: …»,
>    después de todo lo que evalúa, con `attempts: 3`, alternando el repertorio
>    (choice, V/F, huecos, clasificar, escenario, caso por decisiones, conversación,
>    reto numérico si hay cálculo, caso; parejas con moderación; nunca ordenar
>    pasos). Cierre de cada unidad: tarjetas de repaso o rosco + «Síntesis del tema».
>    Nunca hotspots, before_after, hidden_image, puzzle, vídeo interactivo ni
>    html_embed.
> 9. Máximo UNA imagen por pantalla y siempre como `visual_resource` (resuelta con
>    `resolve_image`), debajo del texto (`layout: "bottom"`), nunca `![...]` en
>    `student_text`.
> 10. El quiz y los foros de cada sección se quedan en Moodle: `final_test: null`,
>     `score_source: "unit_tests"`, `completion_mode: "screens"`, `min_score: 50`,
>     `auto_return: true` (nunca una pantalla `unit_quiz` con el test escrito).
> 11. IDs únicos en todo cada curso. `authoring_entity` = «MECOHISA S.L.» pero
>     `shell.brand` VACÍO. El preflight `validate_course` (contrato §11) a CERO
>     errores y CERO avisos antes de empaquetar cada `.scormproj`.
> 12. **Ejecuta `check_moodle_titles(course)` (`ingesta-moodle.md`) sobre CADA curso
>     antes de empaquetarlo, a CERO WARN.** Es un chequeo mecánico, no una
>     sugerencia: detecta exactamente los fallos que se han colado en producción
>     (títulos de ítem genéricos «Aspecto 1»/«Clave 2», títulos truncados a mitad de
>     frase, numeración de Moodle sin quitar, negritas `**` rotas, títulos
>     repetidos). Corrige cada WARN antes de seguir; si alguno es un falso positivo
>     genuino (continuación real de la misma idea), anótalo en el informe, no lo
>     descartes en silencio.
>
> Antes de entregar cada uno: pasa el checklist de `referencia-rapida.md`, la
> revisión de fidelidad (cada página de Moodle con su(s) pantalla(s), mismo orden) Y
> `check_moodle_titles` a CERO WARN (regla 12).
> En el informe final: por unidad — nº de páginas Moodle origen, nº de pantallas
> generadas, % de cobertura, y el resultado de
> `check_moodle_titles` (0 WARN, o la lista de falsos positivos anotados).

**Análisis previo (sin generar nada)**, **con guion previo** y **paso a paso**: mismo
comportamiento que en `flujo-factoria-unidades.md` («Órdenes de trabajo típicas»),
sustituyendo «el documento»/«el PDF» por «el backup Moodle».
