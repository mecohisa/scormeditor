import { useRef } from 'react'
import { SettingsWindow } from './SettingsModal'
import { useCourseStore } from '../store/courseStore'
import { startTour } from './GuidedTour'
import {
  INTERACTION_GROUPS,
  INTERACTION_GROUP_LABELS,
  INTERACTION_GROUP_HINTS,
  INTERACTION_RECIPES,
} from '../schema/interactionRecipes'
import { interactionTypeLabel } from '../schema/labels'

/**
 * Manual de usuario integrado (menú Ayuda → «Manual de usuario»).
 * El contenido vive aquí como JSX (misma fuente que la UI: si cambia la
 * interfaz, se actualiza este fichero). Las capturas se cargan de
 * `src/assets/help/*.png` por nombre: añadir/actualizar una captura = soltar
 * el png; si falta, la figura no se pinta (el manual sigue siendo válido).
 * El catálogo de interacciones (`INTERACTION_RECIPES`) se importa en vivo: al
 * añadir un tipo nuevo al editor, esta sección se actualiza sola.
 */
const SHOTS = import.meta.glob('../assets/help/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function shotUrl(id: string): string | null {
  const key = Object.keys(SHOTS).find((p) => p.endsWith(`/${id}.png`))
  return key ? SHOTS[key] : null
}

function Shot({ id, caption }: { id: string; caption: string }) {
  const url = shotUrl(id)
  if (!url) return null
  return (
    <figure className="ed-help-shot">
      <img src={url} alt={caption} loading="lazy" />
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

function Kbd({ k }: { k: string }) {
  return <kbd className="ed-help-kbd">{k}</kbd>
}

type Section = { id: string; title: string; body: React.ReactNode }

const SECTIONS: Section[] = [
  {
    id: 'que-es',
    title: 'Qué es SCORMEditor',
    body: (
      <>
        <p>
          SCORMEditor es un editor que funciona íntegramente en tu navegador y genera
          paquetes <strong>SCORM 1.2</strong> listos para subir a Moodle u otro LMS.
          No necesitas instalar nada ni depender de herramientas como Articulate o
          Captivate: el curso exportado es HTML autocontenido.
        </p>
        <p>Trabajarás con dos archivos distintos; conviene tener clara la diferencia:</p>
        <ul>
          <li>
            El <strong>proyecto</strong> (<code>.scormproj</code>) es tu documento de
            trabajo, como un <code>.docx</code>: lo guardas, lo reabres y lo sigues
            editando. Contiene el curso y sus imágenes/audios.
          </li>
          <li>
            El <strong>SCORM ZIP</strong> es el paquete final que se sube al LMS. Se
            genera con «Archivo → Exportar SCORM ZIP» y no se reedita: los cambios se
            hacen siempre sobre el proyecto y se vuelve a exportar.
          </li>
        </ul>
        <p>
          Todo se procesa y se guarda <strong>en tu equipo</strong>: el editor no sube
          tu contenido a ningún servidor. Este manual cubre el editor completo: todos
          los tipos de pantalla e interacción, la narración por voz, los ajustes del
          curso y la exportación. Si prefieres verlo en acción antes de leer, usa el
          <strong> tour guiado</strong> (botón al pie de este índice).
        </p>
      </>
    ),
  },
  {
    id: 'primeros-pasos',
    title: 'Primeros pasos: crear, abrir y guardar',
    body: (
      <>
        <p>
          Al abrir SCORMEditor sin nada que retomar (primera vez, o navegador limpio) verás
          una <strong>pantalla de bienvenida</strong> con cuatro puntos de partida: empezar
          en blanco, ver la demo, abrir un archivo local o —si tu organización tiene la nube
          activada— abrir un proyecto de la nube. Elegir cualquiera la descarta para
          siempre: no vuelve a interrumpir en cargas posteriores.
        </p>
        <p>
          Todo el ciclo de vida del documento está en el menú <strong>Archivo</strong>{' '}
          de la barra superior:
        </p>
        <ul>
          <li>
            <strong>Nuevo (vacío)</strong> crea un curso mínimo desde cero;{' '}
            <strong>Nuevo (demo)</strong> carga un curso de ejemplo con todos los tipos
            de pantalla e interacción — muy útil para curiosear cómo está hecho cada uno.
          </li>
          <li>
            <strong>Abrir proyecto…</strong> admite un <code>.scormproj</code> y también
            un ZIP SCORM exportado antes (se reimporta como proyecto editable).
          </li>
          <li>
            <strong>Guardar</strong> (<Kbd k="Ctrl + S" />) escribe el{' '}
            <code>.scormproj</code>. En Chrome/Edge se reescribe el mismo archivo sin
            volver a preguntar; en Firefox/Safari se descarga. «Guardar como…» fuerza un
            archivo nuevo.
          </li>
          <li>
            <strong>Borrar recursos huérfanos (N)</strong> aparece solo si el proyecto
            acumula imágenes o audios que ya no usa ninguna pantalla (por ejemplo tras
            sustituir una imagen varias veces): reduce el peso del <code>.scormproj</code>.
            Es irreversible, así que solo interesa antes de archivar el curso.
          </li>
        </ul>
        <Shot id="toolbar" caption="Barra superior: título del curso, indicador de guardado y los menús Archivo/Ayuda. Debajo, en la fila de pestañas: Deshacer/Rehacer y ⚙ Ajustes." />
        <p>
          Junto al título verás el <strong>indicador de estado</strong>: «Sin guardar»
          (punto) o «Guardado» (✓). Es además un botón: pulsarlo guarda. Aunque cierres
          sin guardar, el trabajo se conserva automáticamente en el navegador y se
          restaura al volver a abrir la página — es una red de seguridad, no un
          sustituto del guardado: el proyecto de verdad es siempre el archivo{' '}
          <code>.scormproj</code>.
        </p>
        <p>
          <strong>Deshacer/Rehacer</strong> (<Kbd k="Ctrl + Z" /> / <Kbd k="Ctrl + Y" />)
          cubren cualquier cambio de contenido, hasta 50 pasos.
        </p>
      </>
    ),
  },
  {
    id: 'nube',
    title: 'Nube y trabajo en equipo',
    body: (
      <>
        <p>
          La nube es un <strong>añadido opcional</strong> que activa quien despliega
          SCORMEditor para su organización: un proyecto guardado en la nube es exactamente
          el mismo <code>.scormproj</code> de siempre, solo que vive en un servidor
          compartido en vez de en tu equipo. Si tu instalación no la tiene activada, no
          verás ningún botón de nube y el editor funciona 100% local, igual que siempre —
          esta sección no te afecta.
        </p>
        <h4>Entrar y organizaciones</h4>
        <p>
          El chip <strong>«Nube: sin conectar»</strong> de la barra superior abre el inicio
          de sesión (enlace mágico al correo, sin contraseña; las cuentas las da de alta
          quien administre la organización). Cada persona pertenece a una organización con
          un <strong>rol</strong>: <strong>Propietario</strong> (ve y edita todo, gestiona
          miembros y carpetas), <strong>Editor</strong> o <strong>Visor</strong>.
        </p>
        <h4>Carpetas y permisos por profesor</h4>
        <p>
          Dentro de una organización, cada <strong>carpeta</strong> puede tener sus propios
          permisos por persona — pensado para un centro donde cada profesor debe ver y
          editar solo sus propios cursos, no los de los demás. Quien crea una carpeta recibe
          acceso de edición automáticamente; el botón <strong>«Gestionar acceso»</strong> de
          cada carpeta (solo visible para el Propietario) concede o retira edición/lectura a
          otros miembros. El Propietario siempre ve y edita todas las carpetas, las tenga
          concedidas o no.
        </p>
        <h4>Guardar y versiones</h4>
        <p>
          Con un documento de la nube abierto, guardar es el mismo gesto de siempre
          (<Kbd k="Ctrl + S" /> o el indicador de estado); además se sube sola tras un par de
          minutos de inactividad si hay cambios sin subir. Cada subida crea una{' '}
          <strong>versión completa e independiente</strong> en el historial: nunca se
          sobrescribe ni se pierde una versión anterior. Si alguien sube una versión
          mientras tú tienes el documento abierto (incluido tú mismo desde otra pestaña), un
          aviso te ofrece descargar la más reciente desde <strong>☁ Nube</strong>.
        </p>
        <h4>Bloqueo de edición y «Tomar el control»</h4>
        <p>
          Mientras otra persona tiene el documento abierto, tu árbol y tu editor de
          pantallas quedan en <strong>solo lectura</strong> (Vista estudiante, Validación e
          Informe se pueden seguir consultando con normalidad). Si de verdad necesitas
          editar, el botón <strong>«Tomar el control»</strong> te lo cede al instante, con un
          aviso previo. No hay cola ni «solicitar turno»: para un equipo pequeño y de
          confianza basta con avisar antes de actuar, y es seguro porque las versiones nunca
          se pierden, aunque dos personas suban «a la vez» solo quedan dos versiones en el
          historial. Si la otra persona cierra la pestaña, el control vuelve solo, sin que
          nadie tenga que pulsar nada.
        </p>
        <p>
          Los documentos borrados van a una <strong>papelera</strong> aparte, no desaparecen
          sin más; purgarlos en firme es una acción explícita del Propietario.
        </p>
      </>
    ),
  },
  {
    id: 'arbol',
    title: 'La estructura del curso: el árbol',
    body: (
      <>
        <p>
          El panel izquierdo de la pestaña <strong>Editor</strong> es el árbol del
          curso: <strong>módulos → unidades → pantallas</strong>. La pantalla es la
          unidad básica de contenido (lo que el alumno ve de una vez). Un módulo puede
          tener, además de sus unidades, <strong>pantallas propias</strong> (por ejemplo
          una portada de bloque) que se muestran siempre antes que sus unidades.
        </p>
        <Shot id="arbol" caption="Árbol del curso: módulos, unidades y pantallas, con las secciones Evaluación y Materiales al final." />
        <ul>
          <li>
            <strong>Añadir</strong>: «+ Añadir pantalla…» al pie de cada unidad (o de
            cada módulo, para una pantalla propia) abre un selector de <em>recetas</em>{' '}
            (ver más abajo). «+ Añadir unidad» y «+ Añadir módulo» crean la estructura;
            el lápiz renombra el curso, los módulos y las unidades ahí mismo.
          </li>
          <li>
            <strong>Reordenar</strong>: las pantallas se arrastran por su asa; los
            módulos y unidades se mueven con las flechas ▲/▼ que aparecen junto a su
            nombre (una unidad puede cruzar al módulo de al lado desde el extremo).
          </li>
          <li>
            <strong>Duplicar y eliminar</strong> por pantalla, unidad o módulo (eliminar
            algo con contenido pide confirmación, y siempre puedes deshacer).
          </li>
          <li>
            <strong>Reutilizar pantallas entre cursos</strong>: el botón de descarga de la
            cabecera de una pantalla la exporta (a ella u otras que marques) a un archivo
            <code>.scormscreen</code> con sus imágenes, audios y términos de glosario; en otro
            curso, «Añadir pantalla…» › <em>Importar pantallas…</em> las inserta ahí.
          </li>
          <li>
            El <strong>filtro</strong> de la parte superior busca por título o tipo de
            pantalla.
          </li>
          <li>
            Cada pantalla muestra el icono de su tipo, una marca si tiene interacción
            (⭐ si es evaluable) y un aviso rojo/ámbar si la validación detecta
            problemas.
          </li>
        </ul>
        <p>
          Al final del árbol hay dos secciones fijas: <strong>Evaluación</strong> (el
          test final del curso) y <strong>Materiales</strong> (glosario,
          bibliografía y documentos PDF), que se editan como cualquier otra pantalla al seleccionarlas.
        </p>
        <p>
          El separador entre el árbol y el editor se <strong>arrastra</strong> para
          cambiar el ancho; con doble clic el árbol se pliega o despliega.
        </p>
        <h4>Recetas de pantalla</h4>
        <Shot id="recetas" caption="El selector de recetas agrupa las pantallas por lo que hace el alumno: Estructura, Contenido, Práctica, Evaluación y Otros." />
        <p>
          «+ Añadir pantalla…» no te pregunta por tipos técnicos: ofrece{' '}
          <strong>tarjetas agrupadas por lo que hace el alumno</strong> — Estructura
          (portada, objetivos, resumen…), Contenido (leer, ver, explorar), Práctica
          (hacer con corrección) y Evaluación (test de unidad). Cada tarjeta
          preconfigura el tipo de pantalla, el recurso y la interacción de golpe;
          después todo sigue siendo editable, incluido el tipo de pantalla en
          «Avanzado». Por defecto, las de Práctica <em>no puntúan</em> y las de
          Evaluación <em>sí</em> — es solo el punto de partida, la decisión real de qué
          cuenta para la nota vive en la propia interacción y en Ajustes.
        </p>
        <p>
          Los once tipos de pantalla del editor son: <strong>Portada</strong>,{' '}
          <strong>Objetivos</strong>, <strong>Itinerario</strong>,{' '}
          <strong>Instrucciones de uso</strong> y <strong>Resumen</strong> (estructura, sin
          interacción); <strong>Contenido</strong>{' '}
          (el tipo más habitual: texto con o sin interacción) y <strong>Vídeo</strong>{' '}
          (contenido); <strong>Reflexión</strong> y <strong>Debate (foro)</strong>{' '}
          (práctica sin corrección automática: la respuesta se da en papel o en el foro
          del campus); <strong>Test de unidad</strong> (evaluación, se coloca al final
          de la unidad); y <strong>Pendiente de desarrollo</strong>, un marcador para
          contenido que aún no se ha escrito (avisa en Validación a propósito, para que
          no se olvide).
        </p>
      </>
    ),
  },
  {
    id: 'pantalla',
    title: 'Editar una pantalla',
    body: (
      <>
        <p>
          Al seleccionar una pantalla en el árbol, el panel central muestra su
          formulario. Lo primero es el <strong>título</strong> (se edita directamente
          en la cabecera) y el <strong>objetivo de aprendizaje</strong>: qué debería
          saber hacer el alumno tras esta pantalla. Los objetivos alimentan la matriz
          de trazabilidad del Informe y el gestor de objetivos (ver más abajo), así que
          merece la pena rellenarlos.
        </p>
        <Shot id="editor" caption="Editor de pantalla: título en la cabecera, objetivo, texto principal y las secciones plegables de recurso visual, audio e interacción." />
        <h4>Recurso visual</h4>
        <p>
          Cada pantalla puede llevar una <strong>imagen, vídeo (archivo o YouTube) o
          audio</strong> como recurso principal. Eliges la disposición respecto al
          texto (izquierda, derecha, arriba, abajo), la proporción y, en YouTube, el
          formato del marco (16:9, 4:3, 1:1, 9:16); ves una vista previa debajo. Los
          archivos se suben con su botón y quedan dentro del proyecto (se optimizan
          automáticamente al subir).
        </p>
        <h4>Marco de color</h4>
        <p>
          Envuelve todo el contenido de la pantalla (título, texto, imagen e interacción) en
          una caja de color con un rótulo opcional, dentro de los márgenes de la diapositiva
          y debajo de la miga de pan. Tiene marcos predefinidos de un clic (<strong>🧪 Caso
          práctico</strong>, <strong>📝 Síntesis</strong>, <strong>💭 Reflexiona</strong>),
          la paleta corporativa o un color libre, y un icono y un rótulo propios. Si varias
          pantallas seguidas llevan el mismo marco, el alumno las ve como una sola unidad;
          en el árbol se marcan con un punto de su color.
        </p>
        <h4>Avanzado</h4>
        <p>
          Plegado al final: el tipo de pantalla (por si quieres cambiarlo a mano), el{' '}
          <strong>tiempo mínimo</strong> en segundos antes de poder avanzar y si la
          pantalla es <strong>obligatoria</strong> para completar el curso. El tiempo
          mínimo también se puede aplicar a todas las pantallas de golpe desde{' '}
          <strong>Ajustes → Curso</strong>.
        </p>
        <p>
          El texto principal y su formato tienen su propia sección más abajo («Texto
          enriquecido y bloques destacados»), y el audio de locución en «Narración y
          audio».
        </p>
      </>
    ),
  },
  {
    id: 'texto',
    title: 'Texto enriquecido y bloques destacados',
    body: (
      <>
        <p>
          La caja «Texto para el estudiante» es el contenido principal de la pantalla.
          Escribes texto normal y aplicas formato con la barra: encabezados de sección,{' '}
          <strong>negrita</strong>, <em>cursiva</em>, listas con o sin numerar, enlaces
          e imágenes en línea. Verás el resultado en vivo mientras escribes (los
          códigos de formato quedan ocultos); para tocar un enlace, una imagen o un
          bloque, usa la barra contextual que aparece al situar el cursor encima.
        </p>
        <Shot id="texto" caption="El editor de texto muestra el resultado en vivo: callouts con su color real, negritas, listas… sin códigos visibles." />
        <h4>Bloques destacados (callouts)</h4>
        <p>
          Tras el separador de la barra hay un botón por cada bloque estándar —{' '}
          <strong>💡 Consejo</strong>, <strong>⚠️ Atención</strong>,{' '}
          <strong>📌 Importante</strong>, <strong>🧠 ¿Sabías que…?</strong>,{' '}
          <strong>💭 Reflexiona</strong>, <strong>📝 Síntesis</strong> y{' '}
          <strong>🧪 Caso práctico</strong> — que
          inserta el bloque con su color e icono de la paleta del curso. Cada bloque
          insertado tiene un desplegable en su cabecera para cambiar de tipo (incluye
          también «ℹ️ Información») y un botón para «quitar formato» conservando el
          texto.
        </p>
        <p>
          <strong>«＋ Personalizado»</strong> crea un bloque a tu medida: icono (de una
          paleta curada), color y título libres. Puedes guardarlo como{' '}
          <strong>preset</strong> — aparece como un chip junto a los botones estándar,
          con una ✕ para borrarlo cuando ya no lo necesites; los presets son atajos
          personales y no viajan dentro del curso.
        </p>
        <h4>Bloques con estructura</h4>
        <p>
          Tres botones más de la barra insertan bloques que el alumno ve como tarjetas o
          columnas. Dentro se escribe con la lista y los encabezados de siempre; cada
          bloque recuerda en su cabecera cómo rellenarlo:
        </p>
        <ul>
          <li>
            <strong>📊 Cifras destacadas</strong>: cada punto de la lista es una tarjeta, y
            la parte en negrita del principio sale como cifra grande («**80 %** de los
            casos…»).
          </li>
          <li>
            <strong>⚖️ Comparativa</strong>: cada encabezado H3 abre una columna con lo que
            tenga debajo; con dos columnas aparece un «vs» entre ellas.
          </li>
          <li>
            <strong>✅ Qué hacer y qué evitar</strong>: dos encabezados H3; la lista del
            primero sale con ✓ en verde y la del segundo con ✗ en rojo.
          </li>
        </ul>
        <p>
          Si a un bloque le falta su estructura (una comparativa con un solo encabezado,
          por ejemplo), el alumno lo ve como un bloque destacado normal: nunca se pierde
          el texto. En el móvil, las columnas se apilan. También hay recetas de pantalla
          con cada bloque ya puesto, en el grupo Contenido de «Añadir pantalla».
        </p>
        <h4>Imágenes en el texto</h4>
        <p>
          El botón <strong>🖼 Imagen</strong> de la barra sube una imagen y la inserta
          en la posición del cursor, como bloque propio (con su alt obligatorio). Al
          seleccionarla, su barra integrada permite cambiar el texto alternativo, el
          ancho (de un 25% a a tamaño completo) o sustituirla por otra.
        </p>
        <p>
          Todo lo que escribes aquí se guarda como <strong>texto plano con un formato
          ligero</strong> (nunca HTML): es lo que hace que el proyecto sea portable y
          legible fuera del editor, y lo que impide que se cuele código no controlado
          en el SCORM exportado.
        </p>
      </>
    ),
  },
  {
    id: 'interacciones',
    title: 'Interacciones: catálogo completo',
    body: (
      <>
        <p>
          Una interacción es la actividad de la pantalla: desde un acordeón informativo
          hasta una pregunta evaluable. Se añade desde la sección{' '}
          <strong>Interacción</strong> del editor de pantalla; el selector muestra
          tarjetas agrupadas por lo que hace el alumno, con una marca ⭐ en las que
          pueden puntuar.
        </p>
        <Shot id="tipos-interaccion" caption="Selector de tipo de interacción: tarjetas con descripción, agrupadas por familia didáctica." />
        <p>El bloque de interacción del editor cuenta siempre la misma historia en cuatro partes:</p>
        <ul>
          <li><strong>Actividad</strong>: enunciado, instrucciones y la configuración propia del tipo (opciones, parejas, tarjetas, huecos, zonas de la imagen…). Las listas se reordenan, duplican y pliegan desde el propio editor.</li>
          <li><strong>Evaluación</strong> (solo en los tipos con corrección real): márcala como evaluable, dale puntos e intentos permitidos.</li>
          <li><strong>Feedback</strong>: mensajes de acierto/error y una explicación pedagógica opcional; varios tipos admiten además feedback por opción.</li>
          <li><strong>Cambiar tipo…</strong>: convierte la interacción en otra conservando lo que sea compatible (por ejemplo, una pregunta de opción única en verdadero/falso); si algo se fuera a perder, te avisa antes de aplicarlo.</li>
        </ul>
        <p>
          A continuación, las {INTERACTION_RECIPES.length} interacciones disponibles,
          agrupadas por lo que hace el alumno — la misma agrupación que verás en el
          selector:
        </p>
        {INTERACTION_GROUPS.map((g) => (
          <div key={g} className="ed-help-intgroup">
            <h4>{INTERACTION_GROUP_LABELS[g]}</h4>
            <p className="ed-hint">{INTERACTION_GROUP_HINTS[g]}</p>
            <ul>
              {INTERACTION_RECIPES.filter((r) => r.group === g).map((r) => (
                <li key={r.type}>
                  <strong>{interactionTypeLabel(r.type)}</strong>
                  {r.gradable ? ' ⭐' : ''} — {r.description}
                  {r.supportsAttempts ? ' Admite límite de intentos.' : ''}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <p>
          Algunas piezas merecen una mención aparte:
        </p>
        <ul>
          <li>
            <strong>Zonas interactivas (imagen)</strong> se definen con un editor visual
            en modal: arrastra sobre la imagen para dibujar cada zona, arrastra una zona
            para moverla y usa su tirador para redimensionarla.
          </li>
          <li>
            <strong>HTML a medida (código)</strong> es la única pieza que admite código
            pegado por el autor (HTML, CSS y JavaScript en tres cajas); corre siempre
            aislado en un sandbox sin acceso a la nota ni al resto de la página, así que
            nunca puede puntuar ni leer datos del curso.
          </li>
          <li>
            Cuatro de los <strong>juegos didácticos</strong> (sopa de letras, rosco A-Z,
            imagen oculta y puzle de imagen) se autoevalúan sin botón «Comprobar»: el
            propio juego marca el acierto al resolverse, con puntuación proporcional a lo
            acertado. El crucigrama, en cambio, sí lleva «Comprobar» e intentos, como una
            pregunta más.
          </li>
          <li>
            <strong>Rellenar huecos</strong> tiene dos modos: elegir cada palabra en un
            desplegable (con distractores) o <strong>escribirla</strong>. Al escribir, un
            hueco puede admitir varias respuestas separadas por barras, como{' '}
            <code>[[Moodle|campus]]</code>, y no cuentan mayúsculas, tildes ni espacios de
            más; al agotar los intentos, el alumno ve la respuesta esperada.
          </li>
          <li>
            En <strong>Ordenar pasos</strong> cada paso admite una explicación opcional.
            Cuando la actividad queda resuelta, cada paso se marca como bien o mal colocado,
            con la posición en que lo puso el alumno, la correcta y esa explicación.
          </li>
          <li>
            <strong>Caso por decisiones</strong> encadena varias decisiones sobre la misma
            situación: el alumno ve una cada vez, responde una sola vez y lee el comentario
            de su opción antes de seguir. Al final ve un resumen de aciertos; si puntúa, la
            nota es proporcional a las decisiones acertadas.
          </li>
          <li>
            <strong>Conversación ramificada</strong> se escribe como una lista de
            «momentos»: lo que dice un personaje y las respuestas posibles, cada una con el
            momento al que lleva (en el desplegable «Lleva a…», la opción «＋ Un momento
            nuevo» lo crea y lo enlaza de una vez). Un momento sin respuestas es un final:
            bueno, mejorable o neutro, con su comentario. El alumno puede deshacer su última
            respuesta antes de llegar a un final; después puede volver a empezar para
            explorar otros caminos, pero la nota la fija el primer final al que llegó. La
            conversación empieza siempre en el primer momento y no admite bucles. El alumno
            la ve como un chat de una app de mensajería: burbujas, avatar del personaje,
            «escribiendo…» antes de cada réplica y sus respuestas como sugerencias abajo
            (con varios personajes, como un grupo).
          </li>
          <li>
            <strong>Reto numérico</strong> pide calcular resultados a partir de unos datos.
            Cada dato lleva un nombre corto (por ejemplo, <code>peso</code>) que se usa en
            las fórmulas (<code>peso * 0.5</code>; admite + − * / ^, paréntesis y round,
            min, max, abs, sqrt, floor y ceil), y el editor muestra al momento el resultado
            de cada fórmula. El alumno puede responder con coma decimal y se acepta un
            pequeño margen de redondeo; al agotar los intentos ve la solución. En modo
            «Calculadora» no hay nada que corregir: el alumno escribe sus propios datos y
            ve los resultados, útil como herramienta de consulta.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'narracion',
    title: 'Narración y audio',
    body: (
      <>
        <p>
          Cada pantalla admite dos piezas de audio independientes: el{' '}
          <strong>recurso visual de tipo audio/vídeo</strong> (el contenido en sí) y el{' '}
          <strong>audio de locución</strong> — la voz que narra la pantalla, con su
          propio reproductor en la barra inferior de la Vista estudiante (play/pausa,
          progreso, volumen y velocidad).
        </p>
        <h4>Transcripción y audio de pantalla</h4>
        <p>
          La sección «Audio de locución y transcripción» del editor de pantalla tiene un
          botón <strong>«↻ Regenerar transcripción desde el contenido»</strong> que
          construye un guion a partir del texto y, si la interacción es informativa, de
          su enunciado — así no hay que redactarlo dos veces. La transcripción es
          también la <strong>alternativa textual</strong> obligatoria de cualquier vídeo
          o audio con voz (el alumno la abre con un botón, sin que aparezca duplicada en
          el cuerpo).
        </p>
        <p>
          Con la transcripción lista, <strong>«Generar audio»</strong> sintetiza la voz
          y la adjunta a la pantalla — o hazlo para todo el curso de una vez desde{' '}
          <strong>Ajustes → Narración</strong>.
        </p>
        <h4>Narración por ítem</h4>
        <p>
          En las interacciones que ocultan contenido hasta un gesto de revelado
          (acordeón, pestañas, tarjetas giratorias, línea de tiempo, tarjetas de imagen
          y fichas de repaso), cada ítem puede llevar su <strong>propio audio</strong>{' '}
          — sonará cada vez que el alumno lo abra o lo gire, no solo la primera vez. Se
          genera con el botón junto a cada ítem en el editor de la interacción, o todos
          de golpe con «🔊 Generar audios de ítem pendientes».
        </p>
        <h4>Narración por IA (Ajustes → Narración)</h4>
        <Shot id="narracion" caption="Ajustes → Narración: proveedor, voz, clave de API y generación masiva de audio para todo el curso." />
        <p>
          Elige el proveedor de síntesis de voz — <strong>Google Gemini</strong> (con
          nivel gratuito), <strong>OpenAI</strong> (pago por uso, de céntimos) o{' '}
          <strong>ElevenLabs</strong> (las voces más naturales; la voz se elige por su ID,
          con «Escuchar muestra» para oírla) —, la voz y pega tu{' '}
          <strong>clave de API</strong>: se guarda solo en tu navegador, nunca
          en el proyecto ni en ningún servidor de SCORMEditor. Desde aquí,{' '}
          <strong>«Generar N audios»</strong> encadena en una sola pasada las
          transcripciones que falten, el audio de cada pantalla narrable y el de cada
          ítem revelable, con una barra de progreso.
        </p>
        <p>
          El ajuste <strong>«Curso narrado»</strong> (auto/sí/no, en la misma ventana)
          decide si Validación avisa de las pantallas «pendientes de narrar»: en{' '}
          <em>auto</em> (por defecto) se activa solo si ya hay algún audio en el curso,
          para no generar ruido en cursos que no llevan voz.
        </p>
      </>
    ),
  },
  {
    id: 'evaluacion-materiales',
    title: 'Test final, glosario y bibliografía',
    body: (
      <>
        <p>
          El <strong>test final</strong> se edita desde el nodo «Evaluación → Test
          final» del árbol: preguntas con sus opciones (marca la correcta con el
          círculo), feedback y objetivo vinculado por pregunta. Puedes elegir que se
          muestre <strong>una pregunta por pantalla</strong> — con un navegador de
          preguntas numerado y sin perder la posibilidad de repetir solo las falladas —
          y ver el recuento vivo de preguntas y puntos.
        </p>
        <Shot id="test-final" caption="Editor del test final: preguntas plegables con opciones, correcta y feedback." />
        <p>
          En <strong>Materiales</strong> viven el <strong>glosario</strong>{' '}
          (término + definición, con ordenación alfabética A→Z) y la{' '}
          <strong>bibliografía</strong> (cita + enlace opcional) y los{' '}
          <strong>documentos</strong>: PDF que el alumno puede abrir o descargar (solo PDF,
          hasta 10 documentos de 10 MB como máximo cada uno). El alumno los abre en
          cualquier momento desde el menú lateral del curso; sus títulos («Glosario»,
          «Recursos», «Documentos») se pueden personalizar en la cabecera del editor.
        </p>
      </>
    ),
  },
  {
    id: 'objetivos',
    title: 'Objetivos de aprendizaje',
    body: (
      <>
        <p>
          Los objetivos no son una lista separada que rellenas aparte: nacen al escribir
          el campo «Objetivo de aprendizaje» de cada pantalla (con autocompletado de los
          ya usados) y se vinculan también desde cada pregunta del test final. El
          gestor <strong>Ajustes → Objetivos de aprendizaje</strong> los reúne a todos en
          un solo sitio: qué pantallas declaran cada objetivo y qué evaluaciones lo
          cubren, con chips que te llevan directamente allí.
        </p>
        <p>
          Desde ahí puedes <strong>renombrar</strong> un objetivo (se actualiza en todos
          sus usos a la vez — renombrarlo a un texto ya existente los fusiona, así que
          hazlo con cuidado) o <strong>quitarlo</strong> por completo. Un objetivo
          declarado en alguna pantalla pero que ninguna evaluación cubre aparece como
          aviso en Validación: es la señal de que ese contenido se explica pero no se
          comprueba que se haya aprendido.
        </p>
      </>
    ),
  },
  {
    id: 'ajustes',
    title: 'Ajustes del curso',
    body: (
      <>
        <p>El menú <strong>⚙ Ajustes</strong> agrupa varias ventanas independientes:</p>
        <ul>
          <li>
            <strong>Curso (Finalización)</strong>: las reglas SCORM — nota mínima para
            aprobar, <strong>origen de la nota</strong> (solo el test final, solo las
            actividades evaluables, o mixto con el peso que decidas), porcentaje de
            pantallas que hay que ver, si las interacciones obligatorias bloquean el
            avance, número de intentos del curso y tipo de navegación (libre, secuencial
            o mixta). Incluye una herramienta para aplicar un tiempo mínimo a todas las
            pantallas de golpe.
          </li>
          <li>
            <strong>Objetivos de aprendizaje</strong>: ver la sección anterior.
          </li>
          <li>
            <strong>Interfaz (Apariencia)</strong>: la marca y el color principal del
            curso que verá el alumno, y el nivel e intensidad de las animaciones de la
            carcasa.
          </li>
          <li>
            <strong>Narración (Audio IA)</strong>: ver «Narración y audio» más arriba.
          </li>
        </ul>
        <Shot id="ajustes" caption="Ajustes del curso: nota mínima, origen de la nota, navegación y reglas de finalización." />
        <p>
          Cuando el origen de la nota es <strong>mixto</strong>, el peso del test final
          se reparte por porcentaje entre los dos bloques (test final y actividades
          evaluables), no por suma de puntos: así unas pocas preguntas del test final no
          quedan diluidas frente a muchas actividades de práctica.
        </p>
      </>
    ),
  },
  {
    id: 'vista',
    title: 'Vista estudiante',
    body: (
      <>
        <p>
          La pestaña <strong>Vista estudiante</strong> muestra el curso{' '}
          <strong>exactamente como se exportará</strong>: es la misma carcasa que va
          dentro del ZIP, no una simulación. Se abre en la pantalla que tuvieras
          seleccionada en el editor, y al navegar por ella el editor te sigue (al
          volver a la pestaña Editor estarás en la pantalla donde te quedaste).
        </p>
        <Shot id="vista" caption="Vista estudiante: la carcasa real del SCORM, con la píldora de modo autor en la esquina." />
        <p>
          La píldora <strong>«Modo autor»</strong> de la esquina superior derecha te
          deja alternar entre navegar sin restricciones (modo autor activado) y probar
          el comportamiento real que tendrá el alumno: navegación bloqueada, tiempo
          mínimo por pantalla e interacciones obligatorias. El SCORM exportado nunca
          incluye este conmutador.
        </p>
      </>
    ),
  },
  {
    id: 'validacion',
    title: 'Validación e informe',
    body: (
      <>
        <p>
          La pestaña <strong>Validación</strong> revisa el curso entero:{' '}
          <strong>errores</strong> (cosas que romperían la experiencia, como una
          pregunta sin opción correcta o dos pantallas con el mismo identificador) y{' '}
          <strong>avisos</strong> (mejorables, como un objetivo sin evaluar o una
          pantalla pendiente de narrar). Cada aviso enlaza con la pantalla o el ajuste
          correspondiente. El recuento aparece también como badge en la propia pestaña,
          y el árbol marca las pantallas afectadas.
        </p>
        <Shot id="validacion" caption="Panel de validación: errores y avisos con enlace directo a la pantalla afectada." />
        <p>
          La pestaña <strong>Informe</strong> genera un resumen del curso: recuentos de
          pantallas e interacciones, reglas de evaluación y la{' '}
          <strong>matriz de trazabilidad</strong> objetivos ↔ evaluaciones (qué
          objetivo se evalúa dónde, y cuáles quedan sin evaluar). Se puede exportar
          para revisión.
        </p>
      </>
    ),
  },
  {
    id: 'exportar',
    title: 'Exportar: SCORM ZIP y eXeLearning',
    body: (
      <>
        <p>
          Cuando el curso esté listo (idealmente sin errores de validación):{' '}
          <strong>Archivo → Exportar SCORM ZIP</strong>. El ZIP resultante es el
          paquete completo, con solo los recursos que realmente usa el curso.
        </p>
        <p>En Moodle:</p>
        <ol>
          <li>Activa la edición del curso y añade una actividad <strong>«Paquete SCORM»</strong>.</li>
          <li>Sube el ZIP exportado (no hace falta descomprimirlo).</li>
          <li>
            En los ajustes de la actividad, la calificación y los intentos ya vienen
            definidos por el paquete (nota de superación incluida); revisa que el
            método de calificación sea por puntuación.
          </li>
        </ol>
        <p>
          Si más adelante cambias algo, edita el <strong>proyecto</strong> y vuelve a
          exportar y subir el ZIP: el ZIP no se edita nunca directamente.
        </p>
        <h4>Exportar a eXeLearning (.elpx)</h4>
        <p>
          <strong>Archivo → Exportar a eXeLearning (.elpx)</strong> convierte el curso a
          un paquete que se abre con «Importar» en eXeLearning 4.0.1 o posterior, para
          seguir editándolo allí (por ejemplo, si otra persona del equipo trabaja con esa
          herramienta). La mayoría de interacciones se convierten a su equivalente nativo
          de eXe (opción única, verdadero/falso, emparejar, sopa de letras, crucigrama,
          rellenar huecos, tarjetas giratorias, comparador antes/después…); las que no
          tienen equivalente se vuelcan como contenido HTML legible y editable, sin
          perder la información.
        </p>
        <p>
          Al terminar, un resumen indica cuántas páginas y actividades se generaron y
          qué se reconvirtió. Ten en cuenta que <strong>no viajan</strong> la nota SCORM,
          el bloqueo de navegación ni los intentos: eXeLearning no tiene ese concepto —
          gestiona su propio paquete de forma independiente al SCORM que exportas desde
          aquí.
        </p>
      </>
    ),
  },
  {
    id: 'atajos',
    title: 'Atajos y trucos',
    body: (
      <>
        <ul>
          <li><Kbd k="Ctrl + S" /> guardar · <Kbd k="Ctrl + Z" /> deshacer · <Kbd k="Ctrl + Y" /> rehacer</li>
          <li><Kbd k="Alt + ↓" /> / <Kbd k="Alt + ↑" /> pantalla siguiente / anterior</li>
          <li><Kbd k="F1" /> o <Kbd k="Ctrl + /" /> ventana de atajos de teclado</li>
          <li><Kbd k="Esc" /> cierra la ventana o el menú abiertos</li>
        </ul>
        <p>
          La lista completa está en <strong>Ayuda → Atajos de teclado</strong>. Y si es
          tu primera vez, el <strong>tour guiado</strong> (Ayuda → Tour guiado) te
          enseña la interfaz en un minuto.
        </p>
      </>
    ),
  },
]

/** Ventana «Manual de usuario» (menú Ayuda). */
export function HelpModal({ onClose }: { onClose: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const setSettingsModal = useCourseStore((s) => s.setSettingsModal)

  function goTo(id: string) {
    bodyRef.current?.querySelector(`#help-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <SettingsWindow title="Manual de usuario" onClose={onClose} wide>
      <div className="ed-help">
        <nav className="ed-help-nav" aria-label="Índice del manual">
          {SECTIONS.map((s, i) => (
            <button key={s.id} onClick={() => goTo(s.id)}>
              <span className="ed-help-num">{i + 1}</span> {s.title}
            </button>
          ))}
          <button
            className="ed-help-tourbtn"
            onClick={() => { setSettingsModal(null); startTour() }}
            title="Recorrido interactivo por la interfaz"
          >
            ▸ Tour guiado
          </button>
        </nav>
        <div className="ed-help-body" ref={bodyRef}>
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={`help-${s.id}`} className="ed-help-section">
              <h3>{i + 1}. {s.title}</h3>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </SettingsWindow>
  )
}
