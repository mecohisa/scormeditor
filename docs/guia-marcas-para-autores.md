# Guía de marcas para autores

Cuando escribes el documento (Word, Google Docs o PDF editable) que luego se convierte en
curso SCORM, el sistema decide solo cómo trocearlo en diapositivas y qué partes conviene
convertir en acordeones, preguntas, conversaciones, juegos, etc. **No hace falta que
marques nada**: si no pones ninguna marca, todo funciona igual.

Pero si ya sabes lo que quieres, puedes pedirlo tú en el propio texto con una marca muy
sencilla que el sistema respeta tal cual. Hay tres familias:

- **Marca de corte** `{{diapositiva}}`: «esto de aquí es una diapositiva completa; no la
  partas ni la mezcles con lo de al lado».
- **Marcas de interactividad** (`{{acordeon}}`, `{{opcion_unica}}`, `{{conversacion}}`…):
  «esto de aquí quiero que salga como un acordeón / una pregunta / una conversación…».
- **Marcas de destacado** (`{{consejo}}`, `{{cifras}}`, `{{que_hacer}}`…): «este trozo
  quiero verlo en una caja de color, en tarjetas de cifras o en dos columnas».

Esta guía repasa todas: para qué sirve cada una, cómo se escribe y qué aspecto tiene el
resultado en la Vista estudiante. Sirve igual si el documento lo convierte el GPT
generador de cursos o si se lo pasas a Claude.

> Documento de referencia para quien redacta el contenido del curso; no requiere
> conocimientos técnicos.

## 1. Cómo se escribe una marca

Todas las marcas se escriben igual: el nombre entre llaves dobles al principio del trozo
de texto y el mismo nombre con una barra al final.

```
{{acordeon}}
... el texto que quieres que forme el acordeón ...
{{/acordeon}}
```

- Son solo caracteres: no necesitan color, negrita ni ningún formato especial. Ponlas
  cada una en su propia línea.
- **Nota libre opcional**: después de dos puntos puedes añadir una indicación breve,
  `{{acordeon: agrupar por región}}`. La nota orienta al sistema, pero no cambia el tipo.
- **No hace falta marcar todo el documento.** Puedes no poner ninguna marca, poner una
  suelta o varias. Lo que quede fuera de las marcas se sigue resolviendo de forma
  automática, como siempre.
- Si te olvidas de cerrar una marca o escribes mal su nombre, no pasa nada grave: el
  sistema hace lo razonable y lo deja anotado en las notas del curso para que lo revises.
- Los nombres no llevan tildes salvo `pestañas`: `acordeon`, `linea_tiempo`,
  `opcion_unica`, `conversacion`, `atencion`…

## 2. Marca de corte: fija una diapositiva completa

<!-- tipo: CORTE | no genera interacción: fija el texto de la pantalla -->

A veces el sistema, con buen criterio, parte un contenido en dos pantallas o une dos
párrafos en una sola, y tú sabes que ese contenido tiene que leerse **de una sola vez**
(una instrucción legal, una lista que pierde sentido partida, un texto con un formato
delicado). Para eso está la marca de corte:

```
{{diapositiva}}
Antes de manipular cualquier extintor, comprueba **siempre** que el precinto está
intacto y que la aguja del manómetro está en la zona verde.

Un extintor fuera de rango de presión, aunque parezca íntegro, puede no funcionar
cuando se necesite.
{{/diapositiva}}
```

<!-- captura: diapositiva | El texto marcado, íntegro, en una sola pantalla -->

Todo lo que quede entre `{{diapositiva}}` y `{{/diapositiva}}` es el contenido íntegro
de **una única** diapositiva: nada se le quita, nada se le añade y no se mezcla con el
texto de antes ni de después. El sistema le sigue poniendo un título corto.

**El corte manda siempre.** Si dentro mezclas, por ejemplo, bastante teoría con una
pregunta (algo que el sistema normalmente separaría en dos pantallas), se genera tal
cual lo has delimitado: se entiende que es una decisión tuya. Queda anotado en las notas
internas del curso para que se pueda revisar.

## 3. Marcas de interactividad

Están agrupadas por para qué sirven. En casi todas puedes **dejar que el sistema redacte**
el contenido a partir del texto marcado o **escribirlo tú ya hecho** con el formato que
se indica en cada una; si no sigues ese formato, no pasa nada: el sistema lo redacta.

### 3.1 Para presentar contenido (no se puntúan)

#### {{acordeon}}

<!-- tipo: INFORMATIVA | accordion -->

Lista de apartados que se despliegan uno a uno. Úsala con 5 o más puntos, o con textos
largos que conviene leer por partes. Cada apartado empieza con `###` y su título.

```
{{acordeon}}
### Extintor de agua
Fuegos de materiales sólidos (clase A): madera, papel, tejidos.
**Nunca** sobre equipos eléctricos.

### Extintor de CO2
Fuegos eléctricos y de líquidos inflamables sin dejar residuo.

### Extintor de polvo ABC
Fuegos de las clases A, B y C; es el más polivalente.
{{/acordeon}}
```

<!-- captura: acordeon | Acordeón con el primer apartado desplegado -->

#### {{pestañas}}

<!-- tipo: INFORMATIVA | tabs -->

Varios bloques cortos y paralelos, uno junto a otro (de 2 a 4). Mismo formato que el
acordeón.

```
{{pestañas}}
### Clase A
Combustibles sólidos que forman brasas: madera, papel, cartón, tejidos.

### Clase B
Líquidos inflamables o sólidos que se licúan: gasolina, aceites, ceras.

### Clase C
Gases inflamables: butano, propano, gas natural.
{{/pestañas}}
```

<!-- captura: pestanas | Tres bloques cortos en pestañas -->

#### {{tarjetas_volteables}}

<!-- tipo: INFORMATIVA | flip_cards -->

Tarjetas que se giran para mostrar el reverso: parejas concepto ↔ definición o
dato ↔ ejemplo (máximo 4). El `###` es la cara delantera; el texto de debajo, el reverso.

```
{{tarjetas_volteables}}
### Conato de incendio
Fuego pequeño que puede controlarse con los medios disponibles en el lugar.

### Plan de autoprotección
Documento que organiza la respuesta del centro ante una emergencia.
{{/tarjetas_volteables}}
```

<!-- captura: volteables | La primera tarjeta, girada, muestra su reverso -->

#### {{linea_tiempo}}

<!-- tipo: INFORMATIVA | timeline -->

Cronología con hitos en orden: evolución histórica o fases de un proceso. Si quieres una
etiqueta (fecha, fase…), ponla delante del título separada por `·`.

```
{{linea_tiempo}}
### Fase 1 · Detección y alarma
Quien detecta el fuego avisa y se activa la alarma.

### Fase 2 · Primera intervención
El equipo de primera intervención valora si puede controlar el conato.

### Fase 3 · Evacuación
Se evacúa por zonas, empezando por las personas con más dependencia.

### Fase 4 · Recuento
En el punto de encuentro se comprueba que no falta nadie.
{{/linea_tiempo}}
```

<!-- captura: linea | Línea de tiempo con cuatro fases -->

#### {{tarjetas_imagen}}

<!-- tipo: INFORMATIVA | image_cards -->

Rejilla de tarjetas con imagen y título que, al pulsarlas, abren un texto. Para series de
elementos que tienen imagen propia. Mismo formato que el acordeón; **las imágenes se
añaden después en SCORMEditor** (el sistema deja anotado qué imagen va en cada tarjeta).

<!-- captura: imagen | Rejilla de tarjetas con imagen -->

#### {{calculadora}}

<!-- tipo: INFORMATIVA | calculator (modo herramienta) -->

Calculadora en la que el alumno mete **sus propios datos** y ve el resultado al momento.
Úsala cuando el procedimiento incluye un cálculo que conviene practicar. Escribe cada
dato como `Dato = valor unidad` (el valor es el que aparece de inicio) y cada resultado
como `¿Resultado? = operación`, con `×` y `/`. Si no das la operación, el sistema la
plantea a partir del texto.

```
{{calculadora}}
Minutos de ducha = 8 min
Caudal del grifo = 10 l/min
¿Litros por ducha? = Minutos de ducha × Caudal del grifo
¿Litros al mes (una ducha al día)? = Litros por ducha × 30
{{/calculadora}}
```

<!-- captura: calculadora | El alumno cambia los datos y los resultados se recalculan -->

### 3.2 Para preguntar o poner a prueba (se puntúan)

Generan una actividad corregible con nota. Si no escribes la pregunta ya hecha, el
sistema la redacta a partir del texto marcado.

#### {{opcion_unica}}

<!-- tipo: EVALUABLE | single_choice -->

Pregunta de elegir una opción entre varias. Una línea de enunciado y las opciones en
líneas que empiezan por `- `; la correcta lleva un asterisco `*` delante. Si quieres dar
el comentario de cada opción, escríbelo detrás de una raya ` — `.

```
{{opcion_unica}}
¿Qué extintor se usa en un incendio eléctrico?
- Extintor de agua — El agua conduce la electricidad.
- *Extintor de CO2
- Manguera de riego
{{/opcion_unica}}
```

<!-- captura: opcion | Pregunta de opción única (el orden de las opciones se baraja solo) -->

#### {{verdadero_falso}}

<!-- tipo: EVALUABLE | true_false -->

Pregunta de verdadero o falso. Indica la respuesta al final con `(V)` o `(F)`; si no, el
sistema la decide por el contenido.

```
{{verdadero_falso}}
El extintor de CO2 no deja residuo tras su uso. (V)
{{/verdadero_falso}}
```

<!-- captura: vf | Pregunta de verdadero o falso -->

#### {{huecos}}

<!-- tipo: EVALUABLE | fill_blanks -->

Frase con palabras que faltan. Marca cada palabra a ocultar entre corchetes dobles
`[[ ]]`. Por defecto el alumno **elige** la palabra en un desplegable:

```
{{huecos}}
Ante un fuego eléctrico se usa el extintor de [[CO2]], porque el
[[agua]] conduce la electricidad.
{{/huecos}}
```

<!-- captura: huecos | Huecos con desplegable -->

Con la nota `escribir`, el alumno **escribe** la palabra sin pista (no cuentan mayúsculas,
tildes ni espacios de más). Si valen varias respuestas, sepáralas con `|`:

```
{{huecos: escribir}}
Antes de mover a la persona, comprueba los [[frenos]] de la
[[silla|silla de ruedas]].
{{/huecos}}
```

<!-- captura: huecos2 | Huecos de respuesta escrita -->

#### {{parejas}}

<!-- tipo: EVALUABLE | match_pairs -->

Emparejar elementos de dos columnas. Una pareja por línea, separada por una flecha `→`
(también vale `->`).

```
{{parejas}}
Extintor de agua → Fuegos de madera y papel
Extintor de CO2 → Fuegos eléctricos
Extintor de polvo ABC → Fuegos de clases A, B y C
{{/parejas}}
```

<!-- captura: parejas | Emparejar arrastrando (o tocando) cada elemento -->

#### {{clasificar}}

<!-- tipo: EVALUABLE | classification -->

Llevar cada elemento a su categoría. Mismo formato de flecha: `elemento → categoría`.

```
{{clasificar}}
Madera → Clase A
Gasolina → Clase B
Papel → Clase A
Aceite → Clase B
{{/clasificar}}
```

<!-- captura: clasificar | Clasificar elementos en categorías -->

#### {{ordenar}}

<!-- tipo: EVALUABLE | sort_steps -->

Ordenar los pasos de un proceso. Escríbelos **ya en el orden correcto** en líneas `- `:
el orden en que los escribes es la respuesta (el sistema los desordena al mostrarlos).
Si quieres explicar por qué un paso va en su sitio, añádelo tras ` — `; se verá al
corregir.

```
{{ordenar}}
- Retira el pasador de seguridad
- Apunta a la base del fuego — Así se ataca el combustible, no las llamas.
- Aprieta la palanca
- Muévete en abanico
{{/ordenar}}
```

<!-- captura: ordenar | Ordenar pasos arrastrando o con las flechas -->

#### {{decision}}

<!-- tipo: EVALUABLE | scenario_decision -->

Una situación en la que el alumno decide qué hacer. Primero describe la situación;
después, igual que en `{{opcion_unica}}`: la pregunta y las opciones, con `*` en la
correcta y el comentario tras ` — `.

```
{{decision}}
Durante el turno de noche notas olor a quemado en el office y ves humo
saliendo de un enchufe.
¿Qué haces primero?
- Echar agua sobre el enchufe. — El agua conduce la electricidad.
- *Dar la alarma y cortar la corriente si es seguro.
- Esperar a ver si se apaga solo. — Cada minuto cuenta.
{{/decision}}
```

<!-- captura: decision | Situación con una decisión -->

#### {{caso_decisiones}}

<!-- tipo: EVALUABLE | scenario_steps -->

**Nuevo.** Un mismo caso con **varias decisiones seguidas**: el alumno elige, ve al
momento el comentario de su elección y pasa a la siguiente decisión; al final ve
cuántas ha acertado. Empieza con una línea `Caso:` que presenta la situación y escribe
cada decisión como una pregunta de `{{opcion_unica}}`, separadas por una línea en blanco.
Aquí **conviene escribir el comentario de cada opción** (es lo que da sentido a la
actividad).

```
{{caso_decisiones}}
Caso: Una persona usuaria se niega a ducharse esta mañana.

Te dice que hoy no quiere. ¿Qué haces primero?
- *Preguntarle con calma qué le ocurre. — Bien: entender el motivo abre opciones.
- Insistir en que es la hora de la ducha. — Insistir suele aumentar la resistencia.

Prefiere hacerlo por la tarde. ¿Cómo sigues?
- *Ajustar el horario y anotarlo en su plan. — Respetas su preferencia y lo dejas registrado.
- Dejarlo para mañana sin decir nada. — Sin registro, el equipo no sabrá del cambio.
{{/caso_decisiones}}
```

<!-- captura: pasos | Primera decisión ya respondida, con su comentario y «Siguiente decisión» -->

#### {{conversacion}}

<!-- tipo: EVALUABLE | decision_tree -->

**Nuevo.** Una conversación con aspecto de **chat de móvil** (cabecera con el nombre del
personaje, burbujas, «escribiendo…») en la que el alumno elige qué responder y **cada
respuesta lleva a un momento distinto**, hasta un final bueno o malo. Ideal para
practicar el trato con familias, personas usuarias o compañeros. Si hay varios
personajes, se ve como un chat de grupo.

Puedes marcar simplemente un diálogo o una situación y el sistema monta la conversación.
Si prefieres escribirla tú, usa este guion:

- `Personajes:` con cada nombre y, entre paréntesis, quién es.
- Cada momento numerado entre corchetes, `[1]`, `[2]`…, con quién habla y qué dice. El
  `[1]` es el comienzo. Un momento sin nombre es una narración («Pasan diez minutos…»).
- Debajo, las respuestas posibles en líneas `- `, cada una con `→` y el número del
  momento al que lleva.
- Un momento que termina la conversación lleva, en vez de respuestas, `FINAL BUENO:`,
  `FINAL MALO:` o `FINAL NEUTRO:` y el comentario que verá el alumno.
- Las respuestas siempre avanzan: ninguna vuelve a un momento anterior. Lo manejable son
  4 a 8 momentos con 2 o 3 respuestas cada uno.

```
{{conversacion}}
Personajes: Carmen (hija de una persona usuaria)

[1] Carmen: Mi madre lleva dos días sin querer comer. ¿Qué le estáis haciendo?
- Entiendo su preocupación. Cuénteme qué ha notado. → 2
- Aquí hacemos las cosas bien, no se preocupe. → 4

[2] Carmen: Que deja el plato entero y está más callada de lo normal.
- Gracias por contármelo. Hoy lo vemos con la enfermera y la llamo. → 3
- Será una racha, ya comerá. → 4

[3] Carmen: Gracias por escucharme. Me quedo más tranquila.
FINAL BUENO: Validar la emoción y comprometerse con un paso concreto baja la tensión.

[4] Carmen: Pues quiero hablar con la dirección.
FINAL MALO: Restar importancia a la queja la escala.
{{/conversacion}}
```

<!-- captura: conversacion | La conversación como chat de móvil, tras la primera respuesta -->

El alumno puede deshacer su última respuesta y, al llegar a un final, volver a empezar
para explorar otros caminos; la nota la fija el **primer** final al que llega.

#### {{reto_numerico}}

<!-- tipo: EVALUABLE | calculator (modo reto) -->

**Nuevo.** Un cálculo con datos (dosis, costes, tiempos, consumos…) que el alumno debe
resolver y escribir. Mismo formato que `{{calculadora}}`, pero aquí los datos son fijos y
el resultado se corrige (admite coma decimal y un pequeño margen de redondeo). Pon la
unidad del resultado entre paréntesis.

```
{{reto_numerico}}
Peso de la persona = 70 kg
Dosis prescrita = 15 mg/kg
¿Dosis total (mg)? = Peso de la persona × Dosis prescrita
{{/reto_numerico}}
```

<!-- captura: reto | Reto numérico con el resultado escrito, listo para comprobar -->

#### {{caso_practico}}

<!-- tipo: SIN NOTA | case_practice -->

Un ejercicio práctico que el alumno resuelve por su cuenta y después compara con unos
criterios (rúbrica) o con la solución explicada. No se corrige automáticamente. Si
quieres dar tú los criterios, escríbelos en líneas `- ` tras la palabra `Criterios:`.

```
{{caso_practico}}
Revisa el extintor de tu planta y anota qué compruebas.
Criterios:
- Compruebas el precinto y el manómetro
- Miras la fecha de la última revisión
- Verificas que el acceso está despejado
{{/caso_practico}}
```

<!-- captura: practico | Caso práctico con la rúbrica de autoevaluación plegada -->

Si tu actividad ocupa **varias diapositivas** (el caso, las preguntas, la resolución…),
márcalas como diapositivas normales y envuélvelas en un `{{marco}}` (§4.3) para que se
vean como una sola actividad.

### 3.3 Para reflexionar (abierta, sin nota)

#### {{reflexion}}

<!-- tipo: SIN NOTA | pantalla reflection -->

Una pregunta abierta para pensar, sin respuesta única. Si el texto admite una respuesta
defendible, el sistema puede convertirla en un caso práctico con rúbrica. No la
confundas con la caja `{{reflexiona}}` (§4.1), que solo destaca unas preguntas dentro
del texto, sin pantalla propia ni respuesta escrita.

```
{{reflexion}}
Piensa en la última vez que pasaste junto a un extintor de tu centro.
¿Sabrías decir qué tipo era y si su acceso estaba despejado?
{{/reflexion}}
```

<!-- captura: reflexion | Pantalla de reflexión -->

### 3.4 Para cerrar un tema (repaso)

Actividades de repaso final con los términos clave del tema. Puedes dar tú la lista o
dejar que el sistema la saque del contenido.

#### {{tarjetas_repaso}}

<!-- tipo: REPASO | flashcards -->

Tarjetas de repaso de una en una: el alumno intenta recordar, da la vuelta y dice si la
sabía. Mismo formato que las tarjetas volteables (`###` pregunta y, debajo, respuesta).

<!-- captura: repaso | Tarjetas de repaso rápido -->

#### {{sopa_letras}}

<!-- tipo: REPASO | word_search -->

Sopa de letras con los términos clave (de 3 a 12 letras). Basta con una palabra por
línea.

```
{{sopa_letras}}
Extintor
Alarma
Humo
Evacuar
Precinto
{{/sopa_letras}}
```

<!-- captura: sopa | Sopa de letras -->

#### {{crucigrama}}

<!-- tipo: REPASO | crossword -->

Crucigrama con los términos clave y su pista. Una línea por palabra:
`PALABRA → pista`. Elige palabras que compartan letras para que se puedan cruzar.

```
{{crucigrama}}
EXTINTOR → Equipo para sofocar un conato de incendio
ALARMA → Aviso que pone en marcha la evacuación
HUMO → Principal causa de intoxicación en un incendio
CONATO → Fuego pequeño que aún se puede controlar
EVACUAR → Desalojar el edificio de forma ordenada
PRECINTO → Sello que garantiza que el extintor no se ha usado
{{/crucigrama}}
```

<!-- captura: cruci | Crucigrama montado automáticamente con las palabras que se cruzan -->

#### {{rosco}}

<!-- tipo: REPASO | az_quiz -->

Rosco tipo «Pasapalabra»: una definición por letra; el alumno escribe la respuesta o pasa
palabra. Mismo formato que el crucigrama (`Respuesta → pista`); la letra del rosco es la
inicial de la respuesta.

<!-- captura: rosco | Rosco con una letra por respuesta -->

### 3.5 Si no tienes claro el tipo exacto

Con estas tres marcas tú decides **dónde** quieres una actividad y el sistema elige el
tipo que mejor encaje con el texto marcado:

| Escribe esto | Qué hace |
|---|---|
| `{{interactividad}}` | Elige la mejor forma de **presentar** ese contenido (acordeón, pestañas, tarjetas, línea de tiempo…) |
| `{{evaluacion}}` | Elige el mejor tipo de **pregunta** (opción única, huecos, ordenar, conversación…) |
| `{{cierre}}` | Elige la mejor actividad de **repaso final** (tarjetas, sopa de letras, crucigrama, rosco) |

## 4. Marcas de destacado

**Nuevo.** No crean una actividad: dan forma a un trozo de texto **dentro** de la
diapositiva. El texto se respeta tal cual; solo cambia cómo se ve. Puedes poner varias en
la misma diapositiva (mejor de tipos distintos) y también dentro de un
`{{diapositiva}}`.

### 4.1 Cajas de color

| Escribe esto | Se ve como |
|---|---|
| `{{consejo}}` | 💡 Consejo |
| `{{atencion}}` | ⚠️ Atención |
| `{{importante}}` | 📌 Importante |
| `{{sabias_que}}` | 🧠 ¿Sabías que…? |
| `{{informacion}}` | ℹ️ Información |
| `{{reflexiona}}` | 💭 Reflexiona |
| `{{sintesis}}` | 📝 Síntesis |

No hace falta escribir dentro el título de la caja («⚠️ Importante», «💭 Reflexiona»…):
la caja ya lo pone. Para un caso práctico con tarea no hay caja: usa
`{{caso_practico}}` (§3.2).

```
Un extintor portátil se descarga en pocos segundos: hay que saber usarlo
antes de necesitarlo.

{{consejo}}
Colócate siempre con el viento a tu espalda y una salida detrás de ti.
{{/consejo}}

{{atencion}}
Nunca uses agua sobre un fuego eléctrico.
{{/atencion}}

{{sabias_que}}
Un extintor de 6 kg se vacía en unos 15 segundos.
{{/sabias_que}}
```

<!-- captura: destacados | Texto normal con tres cajas de color -->

### 4.2 Bloques con estructura

#### {{cifras}}

<!-- tipo: DESTACADO | bloque stats -->

Cifras destacadas, una tarjeta por dato. Una lista `- ` en la que cada punto **empieza
por la cifra en negrita**.

```
{{cifras}}
- **15 s** dura la descarga de un extintor de 6 kg
- **3 min** es lo que tarda un conato en volverse incontrolable
- **1 de cada 2** víctimas lo es por el humo, no por las llamas
{{/cifras}}
```

<!-- captura: cifras | Tres cifras destacadas -->

#### {{comparativa}}

<!-- tipo: DESTACADO | bloque compare -->

Dos o tres enfoques en columnas (con «vs» entre ellas si son dos). Cada `###` abre una
columna con lo que tenga debajo.

```
{{comparativa}}
### Extintor de agua
- Para sólidos: madera, papel, tejidos
- Barato y fácil de recargar
- Nunca sobre electricidad
### Extintor de CO2
- Para fuegos eléctricos
- No deja residuo
- Poco eficaz al aire libre
{{/comparativa}}
```

<!-- captura: comparativa | Comparativa en dos columnas -->

#### {{que_hacer}}

<!-- tipo: DESTACADO | bloque dodont -->

Qué hacer y qué evitar, en dos columnas verde ✓ y roja ✗. Dos `###`: el primero, lo que
hay que hacer; el segundo, lo que hay que evitar.

```
{{que_hacer}}
### Qué hacer
- Avanzar agachado, cerca del suelo
- Tocar las puertas antes de abrirlas
- Cerrar las puertas al salir
### Qué evitar
- Usar el ascensor
- Volver a por objetos personales
- Abrir una puerta caliente
{{/que_hacer}}
```

<!-- captura: quehacer | Qué hacer / qué evitar -->

### 4.3 Marco de color: una o varias diapositivas como una unidad

#### {{marco}}

<!-- tipo: DESTACADO | marco de pantalla -->

**Nuevo.** Envuelve **diapositivas enteras** en una caja de color, con un rótulo arriba.
Si pones el mismo marco a varias diapositivas seguidas, el alumno las ve como una sola
unidad: por ejemplo, una actividad práctica con el caso, las preguntas y la resolución.
No cambia el texto ni cómo se cortan las diapositivas. Es la única marca que puede
abarcar varias diapositivas: ábrela antes de la primera y ciérrala después de la última.

Tras los dos puntos van el **rótulo**, el **color** y el **icono**, separados por `|`.
Los tres son opcionales: sin color sale amarillo.

```
{{marco: Actividad práctica | #F4C910 | 🧪}}
{{diapositiva}}
Carmen vive en un centro y necesita ayuda para vestirse…
{{/diapositiva}}
{{diapositiva}}
¿Qué cambiarías en la forma de atenderla?
{{/diapositiva}}
{{/marco}}
```

<!-- captura: marco | Diapositiva dentro de un marco «Actividad práctica» -->

El marco también se puede poner, quitar o cambiar después en SCORMEditor, en la sección
«Marco de color» de cada pantalla.

## 5. Combinar marcas

Puedes meter **una** marca de interactividad dentro de un corte para fijar a la vez el
contenido exacto de la diapositiva y la actividad que lleva:

```
{{diapositiva}}
Los extintores se clasifican según el tipo de fuego para el que están indicados.

{{acordeon}}
### Extintor de agua
Fuegos de materiales sólidos (clase A): madera, papel, tejidos.

### Extintor de CO2
Fuegos eléctricos y de líquidos inflamables (clase B/C) sin dejar residuo.

### Extintor de polvo ABC
Fuegos de las clases A, B y C; es el más polivalente.
{{/acordeon}}
{{/diapositiva}}
```

<!-- captura: combinado | Una sola diapositiva con el párrafo de introducción y el acordeón -->

Reglas de combinación:

- Dentro de un `{{diapositiva}}` cabe **como mucho una** marca de interactividad (cada
  diapositiva lleva una sola actividad). Si pones dos, la segunda sale en la diapositiva
  siguiente.
- Dentro de un `{{diapositiva}}` sí caben **varias marcas de destacado**.
- No metas un `{{diapositiva}}` dentro de una interactividad, ni una interactividad
  dentro de otra, ni un destacado dentro de una interactividad.

## 6. Lo que no puedes pedir así

Algunos tipos necesitan que alguien elija y ajuste a mano una imagen, un vídeo o un
fragmento de código. Se añaden **después, en SCORMEditor**. Si los marcas en el
documento, el sistema deja el texto como diapositiva normal y anota que hay que añadirlos
a mano.

#### {{puntos_calientes}}

<!-- tipo: SOLO EN EL EDITOR | hotspots -->

Zonas interactivas sobre una imagen: el alumno debe encontrar todas las correctas.

<!-- captura: hotspots | Zonas dibujadas a mano sobre una imagen -->

#### {{antes_despues}}

<!-- tipo: SOLO EN EL EDITOR | before_after -->

Dos imágenes superpuestas con un deslizador para comparar.

<!-- captura: antesdespues | Comparador antes/después -->

#### {{imagen_oculta}}

<!-- tipo: SOLO EN EL EDITOR | hidden_image -->

Una imagen que se destapa por partes con cada respuesta correcta.

<!-- captura: oculta | Imagen que se revela por partes -->

#### {{rompecabezas}}

<!-- tipo: SOLO EN EL EDITOR | puzzle -->

Puzle con las piezas de una imagen.

<!-- captura: puzzle | Puzle de piezas -->

#### {{video_interactivo}}

<!-- tipo: SOLO EN EL EDITOR | video -->

Vídeo que se detiene en momentos concretos para hacer una pregunta. (Un vídeo de YouTube
**sin** preguntas sí puede ir en el documento: basta con pegar el enlace.)

<!-- captura: video | Vídeo con una pregunta durante la reproducción -->

#### {{codigo_incrustado}}

<!-- tipo: SOLO EN EL EDITOR | html_embed -->

Animación o interactivo a medida programado en HTML.

<!-- captura: html | Interactivo a medida -->

## 7. Preguntas frecuentes

**¿Tengo que marcar todo el documento?** No. El sistema sigue troceando y añadiendo
actividades por su cuenta donde no hay marca, con el criterio de siempre: un tema no se
queda sin actividades por poner solo dos o tres marcas.

**¿Puedo poner tantas marcas como quiera?** Sí. Si marcas muchas actividades, se
respetan todas, aunque salgan más de las que el sistema pondría por su cuenta.

**Si marco un corte y dentro mezclo demasiadas cosas, ¿el sistema me lo corrige?** No:
el corte manda, es tu decisión. Lo deja anotado para que puedas revisarlo antes de
publicar.

**¿Qué pasa si me equivoco al escribir el nombre de la marca?** El sistema intenta
adivinar a qué te referías; si no lo tiene claro, pone una actividad genérica en ese
punto y lo deja anotado.

**¿Tengo que escribir yo las preguntas y respuestas?** No. Basta con marcar el texto: el
sistema redacta la pregunta, las opciones y los comentarios. Escríbelas tú solo cuando
quieras controlar el resultado exacto.

**¿Se pueden poner negritas o enlaces dentro de una marca?** Sí: dentro de las marcas
vale el mismo formato que en el resto del documento (negrita, cursiva, enlaces, listas).
