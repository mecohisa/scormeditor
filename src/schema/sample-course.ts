import type { Course } from './course.schema'

/**
 * Curso de ejemplo usado al arrancar sin importar nada («Nuevo (demo)» y el
 * arranque en frío). Autorreferencial a propósito: no trata de ningún tema
 * ajeno, sino del propio editor — cada pantalla demuestra en vivo el tipo de
 * pantalla o de interacción del que habla. Cubre los 10 tipos de pantalla y
 * las 26 interacciones. Generado con un script de validación (parseCourse +
 * validateCourse reales) para garantizar que respeta el esquema; al editarlo
 * a mano, mantener esa cobertura completa.
 */
export const sampleCourse: Course = {
  "schema_version": "1.1.0",
  "course": {
    "id": "demo-scormeditor",
    "title": "Descubre SCORMEditor",
    "subtitle": "Curso de demostración: todos los tipos de pantalla y de interacción",
    "description": "Un recorrido guiado por el editor: cada pantalla demuestra en vivo el tipo de contenido o la interacción de la que habla. Úsalo para curiosear cómo se ve y se comporta cada pieza antes de crear tu propio curso.",
    "authoring_entity": "",
    "source_document": "",
    "estimated_hours": 1,
    "language": "es"
  },
  "scorm": {
    "version": "1.2",
    "identifier": "SCORMEDITOR-DEMO",
    "title": "Demostración SCORMEditor",
    "mastery_score": 60,
    "rules": {
      "completion_mode": "evaluation",
      "min_required_screens_pct": 100,
      "require_interactions": true,
      "min_score": 60,
      "attempts_allowed": 0,
      "score_source": "mixed",
      "mixed_final_weight": 60,
      "navigation": "free",
      "allow_resume": true,
      "auto_return": false
    },
    "layouts": []
  },
  "shell": {
    "brand": "",
    "primary_color": "#5265c4",
    "accent_color": "#6DC3C0",
    "show_sidebar": true,
    "show_progress": true,
    "language": "es",
    "motion": "rich",
    "motion_speed": "normal"
  },
  "narration": {
    "mode": "auto",
    "tts": {
      "provider": "openai",
      "baseUrl": "https://api.openai.com/v1",
      "model": "gpt-4o-mini-tts",
      "voice": "marin",
      "format": "mp3",
      "speed": 1,
      "instructions": "Voice Affect: Educative, clear, engaging. Articulate and structured, instilling focus and curiosity.\n\nTone: Pedagogical, friendly, and professional. Conversational and approachable, avoiding monotonous delivery.\n\nPacing: Moderate to measured. Balanced rhythm for taking notes and processing complex concepts. Slower for new definitions; normal for everyday examples.\n\nEmotions: Enthusiasm for learning, patience, and encouraging clarity.\n\nPronunciation: Flawless, precise, neutral Spanish accent. Perfect articulation of consonants so diverse audiences understand. Emphasis on key technical words.\n\nPauses: Short, natural pauses at sentences and commas. Longer, deliberate pauses after a question or definition, giving the student a moment to process the information."
    },
    "compressAudio": {
      "enabled": true,
      "kbps": 64
    }
  },
  "intro_screens": [
    {
      "id": "s000",
      "type": "cover",
      "title": "Descubre SCORMEditor",
      "objective": "",
      "student_text": "Esta es la **portada del paquete SCORM**: la primera pantalla de todas, con el mismo peso visual que una portada de módulo (banda sólida a toda anchura). Sin rótulo de nivel a propósito — un paquete SCORM puede representar un curso completo, un módulo, una unidad o un tema suelto según el contenido, así que esta portada no lo presupone.",
      "source_refs": [],
      "visual_resource": {
        "kind": "none",
        "src": "",
        "alt": "",
        "tracks": [],
        "has_voice": false,
        "layout": "top",
        "media_width": "50",
        "media_align": "left",
        "media_full": false,
        "media_ratio": "16x9"
      },
      "interaction": null,
      "interaction_layout": "bottom",
      "required": true,
      "min_time_seconds": 0,
      "audio_src": "",
      "transcript": "",
      "transcript_hidden": false,
      "accessibility": {
        "alt_text_ok": true,
        "keyboard_ok": true,
        "contrast_ok": true
      },
      "scorm": {
        "counts_for_completion": true
      },
      "editor_notes": [],
      "status": "ok",
      "review": {
        "flagged": false,
        "note": ""
      }
    },
    {
      "id": "s000g",
      "type": "guide",
      "title": "Cómo moverte por esta unidad",
      "objective": "",
      "student_text": "Esta es la pantalla opcional de **Instrucciones de uso** (receta «Instrucciones de uso» de la introducción). Al añadirla desde el editor trae arriba un **vídeo demo de un minuto**; aquí no aparece porque este curso de ejemplo no lleva archivos adjuntos. El resumen de controles de abajo lo genera sola la carcasa y solo muestra lo que existe en el paquete: si el curso no tiene locución, no explica el reproductor; si no hay glosario, no lo menciona. Este párrafo es la entradilla opcional del autor.",
      "source_refs": [],
      "visual_resource": {
        "kind": "none",
        "src": "",
        "alt": "",
        "tracks": [],
        "has_voice": false,
        "layout": "top",
        "media_width": "50",
        "media_align": "left",
        "media_full": false,
        "media_ratio": "16x9"
      },
      "interaction": null,
      "interaction_layout": "bottom",
      "required": true,
      "min_time_seconds": 0,
      "audio_src": "",
      "transcript": "",
      "transcript_hidden": true,
      "accessibility": {
        "alt_text_ok": true,
        "keyboard_ok": true,
        "contrast_ok": true
      },
      "scorm": {
        "counts_for_completion": true
      },
      "editor_notes": [],
      "status": "ok",
      "review": {
        "flagged": false,
        "note": ""
      }
    },
    {
      "id": "s001",
      "type": "content",
      "title": "Antes de empezar",
      "objective": "Presentar el curso antes de entrar en su contenido.",
      "student_text": "Esta es una **pantalla de introducción del paquete SCORM**: vive antes de cualquier módulo, sin pertenecer a ninguno. Sirven para una portada, una bienvenida o unos objetivos generales — lo que el profesor quiera poner antes de entrar en el contenido.\n\nA diferencia de las pantallas propias de un módulo (como la siguiente, «Cómo se organiza un curso»), estas **no aparecen en el menú lateral** del alumno: se recorren solo con **Anterior**/**Siguiente**, como un preámbulo.",
      "source_refs": [],
      "visual_resource": {
        "kind": "none",
        "src": "",
        "alt": "",
        "tracks": [],
        "has_voice": false,
        "layout": "top",
        "media_width": "50",
        "media_align": "left",
        "media_full": false,
        "media_ratio": "16x9"
      },
      "interaction": null,
      "interaction_layout": "bottom",
      "required": true,
      "min_time_seconds": 0,
      "audio_src": "",
      "transcript": "",
      "transcript_hidden": false,
      "accessibility": {
        "alt_text_ok": true,
        "keyboard_ok": true,
        "contrast_ok": true
      },
      "scorm": {
        "counts_for_completion": true
      },
      "editor_notes": [],
      "status": "ok",
      "review": {
        "flagged": false,
        "note": ""
      }
    }
  ],
  "closing_screens": [],
  "module_label": "Módulo",
  "unit_label": "Unidad",
  "modules": [
    {
      "id": "m1",
      "title": "Cómo se organiza un curso",
      "closing_screens": [],
      "screens": [
        {
          "id": "s100",
          "type": "cover",
          "title": "Cómo se organiza un curso",
          "objective": "",
          "student_text": "Esta es la **portada de módulo**: presenta todo el módulo antes de entrar en su primera unidad. Tiene más peso visual que la portada de unidad que verás a continuación (banda sólida a toda anchura, en vez del degradado contenido en la tarjeta) y solo puede añadirse entre las pantallas propias del módulo, no dentro de una unidad.",
          "source_refs": [],
          "visual_resource": {
            "kind": "none",
            "src": "",
            "alt": "",
            "tracks": [],
            "has_voice": false,
            "layout": "top",
            "media_width": "50",
            "media_align": "left",
            "media_full": false,
            "media_ratio": "16x9"
          },
          "interaction": null,
          "interaction_layout": "bottom",
          "required": false,
          "min_time_seconds": 0,
          "audio_src": "",
          "transcript": "",
          "transcript_hidden": false,
          "accessibility": {
            "alt_text_ok": true,
            "keyboard_ok": true,
            "contrast_ok": true
          },
          "scorm": {
            "counts_for_completion": false
          },
          "editor_notes": [],
          "status": "ok",
          "review": {
            "flagged": false,
            "note": ""
          }
        }
      ],
      "units": [
        {
          "id": "u1",
          "loose": false,
          "hide_menu_title": false,
          "title": "Estructura y navegación",
          "summary": "",
          "screens": [
            {
              "id": "s101",
              "type": "cover",
              "title": "Descubre SCORMEditor",
              "objective": "",
              "student_text": "Bienvenido/a. Este es un curso de **demostración**: no trata de ningún tema en concreto, sino del propio editor. Cada pantalla que verás a continuación es, a la vez, contenido y ejemplo en vivo de cómo se comporta ese tipo de pantalla o de actividad.\n\nPulsa **Siguiente** para empezar el recorrido.",
              "source_refs": [],
              "visual_resource": {
                "kind": "image",
                "src": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDEyMDAgNDAwIj4KICA8cmVjdCB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmN2Y4ZmEiLz4KICA8Y2lyY2xlIGN4PSIxODAiIGN5PSIxMjAiIHI9IjE3MCIgZmlsbD0iIzZkYzNjMCIgb3BhY2l0eT0iMC41NSIvPgogIDxjaXJjbGUgY3g9IjUyMCIgY3k9IjMwMCIgcj0iMTUwIiBmaWxsPSIjZjRjOTEwIiBvcGFjaXR5PSIwLjUiLz4KICA8Y2lyY2xlIGN4PSI4ODAiIGN5PSIxMzAiIHI9IjE5MCIgZmlsbD0iIzc3ODdiZiIgb3BhY2l0eT0iMC40NSIvPgogIDxjaXJjbGUgY3g9IjEwNDAiIGN5PSIzMzAiIHI9IjExMCIgZmlsbD0iI2Y0ZDZkMiIgb3BhY2l0eT0iMC43Ii8+CiAgPHJlY3QgeD0iMzYwIiB5PSIxNDAiIHdpZHRoPSI0ODAiIGhlaWdodD0iMjAwIiByeD0iMjAiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzIwMzAzYyIgc3Ryb2tlLXdpZHRoPSI0IiBvcGFjaXR5PSIwLjkyIi8+CiAgPHJlY3QgeD0iMzkyIiB5PSIxNzIiIHdpZHRoPSIxODAiIGhlaWdodD0iMTgiIHJ4PSI5IiBmaWxsPSIjNTI2NWM0Ii8+CiAgPHJlY3QgeD0iMzkyIiB5PSIyMTAiIHdpZHRoPSI0MTYiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjYzdjY2Q2Ii8+CiAgPHJlY3QgeD0iMzkyIiB5PSIyMzQiIHdpZHRoPSIzODAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjYzdjY2Q2Ii8+CiAgPHJlY3QgeD0iMzkyIiB5PSIyNTgiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTIiIHJ4PSI2IiBmaWxsPSIjYzdjY2Q2Ii8+CiAgPHJlY3QgeD0iMzkyIiB5PSIyOTIiIHdpZHRoPSIxNDAiIGhlaWdodD0iMjYiIHJ4PSIxMyIgZmlsbD0iIzBmOTQ5MCIvPgo8L3N2Zz4=",
                "alt": "Ilustración abstracta de bienvenida con las formas y colores del editor",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": false,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": false
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s102",
              "type": "objectives",
              "title": "Qué vas a repasar",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Al terminar este recorrido habrás visto, en la práctica:\n- Los **diez tipos de pantalla** del editor y para qué sirve cada uno.\n- Las **23 interacciones** disponibles, agrupadas por lo que hace el alumno.\n- Cómo se editan el **test final**, el **glosario** y la **bibliografía**.\n\nNo hace falta leer nada en otro sitio: cada pantalla explica su propio tipo mientras la recorres.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s103",
              "type": "route",
              "title": "El mapa de este curso",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Este itinerario resume las paradas del recorrido:\n1. **Cómo se organiza un curso** — los diez tipos de pantalla (donde estás ahora).\n2. **Presentar contenido** — interacciones que se exploran, sin corrección.\n3. **Preguntar y corregir** — interacciones que responden y puntúan.\n4. **Manipular elementos** — ordenar, emparejar, clasificar.\n5. **Juegos didácticos y piezas avanzadas** — autoevaluación lúdica, vídeo interactivo y HTML a medida.\n\nAl final: el **test final**, el **glosario** y la **bibliografía** de ejemplo.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s104",
              "type": "content",
              "title": "Texto con formato: negrita, listas, enlaces y bloques",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Esta es una pantalla de tipo **Contenido**, la más habitual del editor. El texto admite formato ligero, sin HTML:\n\n- **Negrita** con doble asterisco y *cursiva* con uno solo.\n- Listas con guiones, como esta.\n1. También listas numeradas.\n2. Conservan el número que escribas.\n\nPuedes enlazar a un recurso externo, como la [especificación SCORM](https://scorm.com/scorm-explained/technical-scorm/run-time/), y también insertar una imagen en línea con `![alt](assets/imagen.png)` (aquí no se usa ninguna porque este curso de fábrica no lleva imágenes propias en el proyecto, solo recursos visuales).\n\n::: tip\n💡 Este es un bloque **Consejo**. Hay seis bloques destacados con icono y color fijos (Consejo, Atención, Importante, ¿Sabías que…?, Reflexiona, Caso práctico) más uno **Personalizado**, como el de abajo.\n:::\n\n::: custom | #7787bf | 🧩 | Bloque personalizado\nIcono, color y título libres — y se puede guardar como preset para reutilizarlo en otras pantallas.\n:::",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s104b",
              "type": "content",
              "title": "Cifras, comparativas y qué hacer y qué evitar",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Además de los bloques destacados, la caja de texto tiene tres **bloques con estructura**: escribes una lista o unos encabezados normales dentro del bloque y la carcasa los presenta como tarjetas o columnas.\n\n::: stats\n- **3** bloques con estructura nuevos\n- **0** líneas de HTML: todo es texto con formato ligero\n- **1** clic para insertarlos desde la barra\n:::\n\n::: compare\n### Bloque destacado\n- Un recuadro de color con icono\n- Para un consejo, un aviso o un dato curioso\n### Bloque con estructura\n- Tarjetas o columnas a partir de una lista\n- Para cifras, comparativas o buenas prácticas\n:::\n\n::: dodont\n### Qué hacer\n- Una idea corta por punto de la lista\n- Encabezados breves en cada columna\n### Qué evitar\n- Párrafos largos dentro de una tarjeta\n- Más de tres columnas en una comparativa\n:::",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s105",
              "type": "video",
              "title": "Vídeo interactivo: pausa y pregunta",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Este es un ejemplo de pantalla de tipo **Vídeo**. Puede llevar un archivo propio o, como aquí, un vídeo de YouTube. Si añades preguntas con marca de tiempo, el vídeo se **pausa solo** al llegar a cada una y no continúa hasta responder.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s105_i",
                "type": "video",
                "prompt": "Preguntas de comprobación durante el vídeo",
                "instructions": "Responde cuando el vídeo se detenga.",
                "options": [],
                "config": {
                  "youtube": "aqz-KE-bpKQ",
                  "questions": [
                    {
                      "time": 10,
                      "prompt": "¿Qué tipo de pantalla estás viendo ahora mismo?",
                      "options": [
                        {
                          "text": "Vídeo",
                          "correct": true
                        },
                        {
                          "text": "Contenido",
                          "correct": false
                        },
                        {
                          "text": "Resumen",
                          "correct": false
                        }
                      ]
                    },
                    {
                      "time": 30,
                      "prompt": "¿Qué le pasa al vídeo cuando llega a una pregunta con marca de tiempo?",
                      "options": [
                        {
                          "text": "Se pausa solo y espera respuesta",
                          "correct": true
                        },
                        {
                          "text": "Se para el curso entero",
                          "correct": false
                        },
                        {
                          "text": "Nada, sigue reproduciéndose",
                          "correct": false
                        }
                      ]
                    }
                  ]
                },
                "feedback": {
                  "correct": "Correcto.",
                  "incorrect": "Repasa la explicación de esta pantalla.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "Cortometraje de animación «Big Buck Bunny» (Blender Foundation, licencia Creative Commons): un gran conejo se despierta en el bosque y, tras ser molestado por tres roedores, acaba gastándoles una broma. Sin diálogos.",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s106",
              "type": "reflection",
              "title": "Reflexiona: ¿qué tipo usarías tú?",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Esta es una pantalla de tipo **Reflexión**: no se corrige automáticamente, es para pensar (o responder en papel o en el foro del campus).",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s106_i",
                "type": "case_practice",
                "prompt": "Piensa en un curso que quieras crear. ¿Qué tres pantallas de las vistas hasta ahora usarías primero y por qué?",
                "instructions": "No hay respuesta correcta: autoevalúate con la rúbrica cuando termines.",
                "options": [],
                "config": {
                  "rubric": [
                    {
                      "label": "He elegido al menos tres tipos de pantalla distintos."
                    },
                    {
                      "label": "Sé justificar por qué cada uno encaja en mi curso."
                    },
                    {
                      "label": "Tengo claro en qué orden aparecerían."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s107",
              "type": "forum_prompt",
              "title": "Debate: compártelo con tu equipo",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Esta es una pantalla de tipo **Debate (foro)**: plantea una pregunta para comentar fuera del curso, en el foro del campus o con tu equipo. No lleva actividad dentro del SCORM — la respuesta vive en el foro.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s108",
              "type": "content_placeholder",
              "title": "Pendiente de desarrollo",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Esta es una pantalla de tipo **Pendiente de desarrollo**: un marcador para contenido que todavía no se ha escrito. Aparece a propósito en Validación (aviso «pantalla esqueleto») para que no se olvide completarla antes de exportar.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s109",
              "type": "unit_quiz",
              "title": "Comprueba lo aprendido: tipos de pantalla",
              "objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
              "student_text": "Cada unidad puede cerrar con un **Test de unidad**: una actividad evaluable con corrección automática.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s109_i",
                "type": "true_false",
                "prompt": "Portada y Resumen son los dos únicos tipos de pantalla que no piden un objetivo de aprendizaje.",
                "instructions": "",
                "options": [
                  {
                    "id": "opt-0",
                    "text": "Verdadero",
                    "correct": true
                  },
                  {
                    "id": "opt-1",
                    "text": "Falso",
                    "correct": false
                  }
                ],
                "config": {},
                "feedback": {
                  "correct": "Correcto: son las dos excepciones.",
                  "incorrect": "Repasa las pantallas anteriores: Portada y Resumen quedan exentas.",
                  "explanation": "El resto de tipos sí piden objetivo, porque alimentan la matriz de trazabilidad."
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s110",
              "type": "summary",
              "title": "Resumen: estructura del curso",
              "objective": "",
              "student_text": "Has visto los diez tipos de pantalla: Portada, Objetivos, Itinerario, Contenido, Vídeo, Reflexión, Debate (foro), Pendiente de desarrollo, Test de unidad y este mismo Resumen. A partir de aquí, cada módulo se centra en una familia de interacciones.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": null,
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            }
          ],
          "status": "ok"
        }
      ]
    },
    {
      "id": "m2",
      "title": "Presentar contenido",
      "closing_screens": [],
      "screens": [],
      "units": [
        {
          "id": "u2",
          "loose": false,
          "hide_menu_title": false,
          "title": "Interacciones exploratorias",
          "summary": "Interacciones informativas: el alumno explora, abre o compara, sin preguntas que corregir.",
          "screens": [
            {
              "id": "s201",
              "type": "content",
              "title": "Desplegables (acordeón)",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Un **acordeón** despliega apartados uno a uno. Útil para agrupar puntos relacionados sin saturar la pantalla.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s201_i",
                "type": "accordion",
                "prompt": "Los seis bloques destacados de color fijo",
                "instructions": "Despliega cada uno para ver a qué bloques corresponde.",
                "options": [],
                "config": {
                  "items": [
                    {
                      "title": "💡 Consejo · 🧠 ¿Sabías que…? · 📌 Importante",
                      "body": "Comparten el turquesa corporativo (#6DC3C0)."
                    },
                    {
                      "title": "⚠️ Atención · 💭 Reflexiona · 🧪 Caso práctico",
                      "body": "Comparten el naranja corporativo (#F4C910)."
                    },
                    {
                      "title": "ℹ️ Información",
                      "body": "Usa el violeta corporativo (#7787BF), en solitario."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s202",
              "type": "content",
              "title": "Pestañas",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Las **pestañas** muestran el mismo tipo de contenido que un acordeón, pero de una en una y sin scroll largo.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s202_i",
                "type": "tabs",
                "prompt": "Tres formas de guardar un proyecto",
                "instructions": "",
                "options": [],
                "config": {
                  "items": [
                    {
                      "title": ".scormproj",
                      "body": "Tu documento de trabajo: se abre, se edita y se reguarda."
                    },
                    {
                      "title": "SCORM ZIP",
                      "body": "El paquete final para el LMS. No se reedita nunca; para cambios, se edita el proyecto y se vuelve a exportar."
                    },
                    {
                      "title": ".elpx",
                      "body": "Exportación opcional a eXeLearning, para seguir editando allí."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s203",
              "type": "content",
              "title": "Tarjetas giratorias",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Una **tarjeta giratoria** oculta el reverso hasta que el alumno la gira. Va bien para parejas breves de pregunta y respuesta.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s203_i",
                "type": "flip_cards",
                "prompt": "Dos términos rápidos",
                "instructions": "",
                "options": [],
                "config": {
                  "cards": [
                    {
                      "front": "¿Qué es el «Modo autor»?",
                      "back": "La píldora de Vista estudiante que desactiva las restricciones reales para poder navegar libremente mientras editas."
                    },
                    {
                      "front": "¿Qué es un objetivo de aprendizaje?",
                      "back": "Lo que el alumno debería saber hacer tras una pantalla; se reutiliza en varias pantallas y en el test."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s204",
              "type": "content",
              "title": "Línea de tiempo",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Una **línea de tiempo** presenta hitos en orden. Se da por completada cuando se han abierto todos.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s204_i",
                "type": "timeline",
                "prompt": "El ciclo de vida de un proyecto",
                "instructions": "",
                "options": [],
                "config": {
                  "milestones": [
                    {
                      "label": "1",
                      "title": "Crear",
                      "body": "«Nuevo (vacío)» o «Nuevo (demo)», desde el menú Archivo."
                    },
                    {
                      "label": "2",
                      "title": "Editar",
                      "body": "Añadir módulos, unidades y pantallas desde el árbol."
                    },
                    {
                      "label": "3",
                      "title": "Validar",
                      "body": "Revisar errores y avisos antes de exportar."
                    },
                    {
                      "label": "4",
                      "title": "Exportar",
                      "body": "«Exportar SCORM ZIP» genera el paquete para el LMS."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s205",
              "type": "content",
              "title": "Tarjetas de imagen",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Cada **tarjeta de imagen** abre una ventana con el texto y la imagen ampliada al pulsarla.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s205_i",
                "type": "image_cards",
                "prompt": "Tres familias de interacción",
                "instructions": "",
                "options": [],
                "config": {
                  "cards": [
                    {
                      "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiB2aWV3Qm94PSIwIDAgMzIwIDMyMCI+CiAgICA8cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgcng9IjM2IiBmaWxsPSIjNTI2NWM0Ii8+CiAgICAKICA8cmVjdCB4PSI5MCIgeT0iMTEwIiB3aWR0aD0iMTQwIiBoZWlnaHQ9IjE4IiByeD0iOSIgZmlsbD0iI2ZmZmZmZiIvPgogIDxyZWN0IHg9IjkwIiB5PSIxNTEiIHdpZHRoPSIxNDAiIGhlaWdodD0iMTgiIHJ4PSI5IiBmaWxsPSIjZmZmZmZmIi8+CiAgPHJlY3QgeD0iOTAiIHk9IjE5MiIgd2lkdGg9IjkwIiBoZWlnaHQ9IjE4IiByeD0iOSIgZmlsbD0iI2ZmZmZmZiIvPgoKICA8L3N2Zz4=",
                      "alt": "Icono de líneas apiladas",
                      "title": "Presentar",
                      "text": "El alumno explora: abre, gira o compara. No hay respuestas que corregir."
                    },
                    {
                      "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiB2aWV3Qm94PSIwIDAgMzIwIDMyMCI+CiAgICA8cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgcng9IjM2IiBmaWxsPSIjYzI3YjA2Ii8+CiAgICAKICA8Y2lyY2xlIGN4PSIxNjAiIGN5PSIxNjAiIHI9Ijc4IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMTQiLz4KICA8cGF0aCBkPSJNMTIwIDE2MiBsMzAgMzAgbDUyIC02MiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjE2IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KCiAgPC9zdmc+",
                      "alt": "Icono de marca de verificación",
                      "title": "Preguntar y manipular",
                      "text": "El alumno responde, ordena o clasifica, y recibe corrección automática."
                    },
                    {
                      "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMjAiIGhlaWdodD0iMzIwIiB2aWV3Qm94PSIwIDAgMzIwIDMyMCI+CiAgICA8cmVjdCB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgcng9IjM2IiBmaWxsPSIjYzI0MTdlIi8+CiAgICAKICA8cGF0aCBkPSJNMTYwIDc4IEwxODIgMTM4IEwyNDYgMTM4IEwxOTUgMTc1IEwyMTQgMjM2IEwxNjAgMTk5IEwxMDYgMjM2IEwxMjUgMTc1IEw3NCAxMzggTDEzOCAxMzggWiIgZmlsbD0iI2ZmZmZmZiIvPgoKICA8L3N2Zz4=",
                      "alt": "Icono de estrella",
                      "title": "Juegos y evaluación",
                      "text": "Dinámicas lúdicas y piezas avanzadas, cada una con su propia forma de puntuar."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s206",
              "type": "content",
              "title": "Antes / después",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "El **comparador antes/después** superpone dos imágenes con un divisor deslizante. Aquí compara texto sin formato con el mismo contenido usando el editor enriquecido.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s206_i",
                "type": "before_after",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "before_image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0ODAiIGhlaWdodD0iMzIwIiB2aWV3Qm94PSIwIDAgNDgwIDMyMCI+CiAgPHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNmZmZmZmYiLz4KICA8cmVjdCB4PSIzMCIgeT0iNDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTQiIHJ4PSI0IiBmaWxsPSIjOWFhMmFkIi8+CiAgPHJlY3QgeD0iMzAiIHk9IjcwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjEwIiByeD0iNCIgZmlsbD0iI2M3Y2NkNiIvPgogIDxyZWN0IHg9IjMwIiB5PSI5MiIgd2lkdGg9IjQwMCIgaGVpZ2h0PSIxMCIgcng9IjQiIGZpbGw9IiNjN2NjZDYiLz4KICA8cmVjdCB4PSIzMCIgeT0iMTE0IiB3aWR0aD0iMzgwIiBoZWlnaHQ9IjEwIiByeD0iNCIgZmlsbD0iI2M3Y2NkNiIvPgogIDxyZWN0IHg9IjMwIiB5PSIxMzYiIHdpZHRoPSI0MTAiIGhlaWdodD0iMTAiIHJ4PSI0IiBmaWxsPSIjYzdjY2Q2Ii8+CiAgPHJlY3QgeD0iMzAiIHk9IjE1OCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSIxMCIgcng9IjQiIGZpbGw9IiNjN2NjZDYiLz4KICA8cmVjdCB4PSIzMCIgeT0iMTkwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjEwIiByeD0iNCIgZmlsbD0iI2M3Y2NkNiIvPgogIDxyZWN0IHg9IjMwIiB5PSIyMTIiIHdpZHRoPSIzNjAiIGhlaWdodD0iMTAiIHJ4PSI0IiBmaWxsPSIjYzdjY2Q2Ii8+Cjwvc3ZnPg==",
                  "before_alt": "Párrafo de texto plano sin ningún formato",
                  "after_image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0ODAiIGhlaWdodD0iMzIwIiB2aWV3Qm94PSIwIDAgNDgwIDMyMCI+CiAgPHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSIzMjAiIGZpbGw9IiNmZmZmZmYiLz4KICA8cmVjdCB4PSIzMCIgeT0iMzQiIHdpZHRoPSIyMjAiIGhlaWdodD0iMjAiIHJ4PSI2IiBmaWxsPSIjMjAzMDNjIi8+CiAgPHJlY3QgeD0iMzAiIHk9IjcwIiB3aWR0aD0iNDIwIiBoZWlnaHQ9IjUyIiByeD0iMTAiIGZpbGw9IiM2ZGMzYzAiIG9wYWNpdHk9IjAuMzUiLz4KICA8Y2lyY2xlIGN4PSI1MiIgY3k9Ijk2IiByPSIxMCIgZmlsbD0iIzBmOTQ5MCIvPgogIDxyZWN0IHg9Ijc0IiB5PSI4OCIgd2lkdGg9IjM0MCIgaGVpZ2h0PSIxMCIgcng9IjQiIGZpbGw9IiMyMDMwM2MiIG9wYWNpdHk9IjAuNiIvPgogIDxyZWN0IHg9Ijc0IiB5PSIxMDQiIHdpZHRoPSIyODAiIGhlaWdodD0iMTAiIHJ4PSI0IiBmaWxsPSIjMjAzMDNjIiBvcGFjaXR5PSIwLjQiLz4KICA8Y2lyY2xlIGN4PSI0MCIgY3k9IjE1MCIgcj0iNCIgZmlsbD0iI2MyN2IwNiIvPgogIDxyZWN0IHg9IjU0IiB5PSIxNDQiIHdpZHRoPSIzNjAiIGhlaWdodD0iMTIiIHJ4PSI0IiBmaWxsPSIjNGI1NjYzIi8+CiAgPGNpcmNsZSBjeD0iNDAiIGN5PSIxNzYiIHI9IjQiIGZpbGw9IiNjMjdiMDYiLz4KICA8cmVjdCB4PSI1NCIgeT0iMTcwIiB3aWR0aD0iMzMwIiBoZWlnaHQ9IjEyIiByeD0iNCIgZmlsbD0iIzRiNTY2MyIvPgogIDxjaXJjbGUgY3g9IjQwIiBjeT0iMjAyIiByPSI0IiBmaWxsPSIjYzI3YjA2Ii8+CiAgPHJlY3QgeD0iNTQiIHk9IjE5NiIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxMiIgcng9IjQiIGZpbGw9IiM0YjU2NjMiLz4KICA8cmVjdCB4PSIzMCIgeT0iMjM2IiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE0IiByeD0iNCIgZmlsbD0iIzc3ODdiZiIvPgogIDxyZWN0IHg9IjMwIiB5PSIyNTIiIHdpZHRoPSIxNjAiIGhlaWdodD0iMiIgZmlsbD0iIzc3ODdiZiIvPgo8L3N2Zz4=",
                  "after_alt": "El mismo contenido con título, callout, lista y enlace",
                  "before_label": "Antes",
                  "after_label": "Después"
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s207",
              "type": "content",
              "title": "Zonas interactivas (imagen)",
              "objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
              "student_text": "Las **zonas interactivas** convierten partes de una imagen en botones. Pulsa la zona que corresponde al paso que genera el paquete final.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s207_i",
                "type": "hotspots",
                "prompt": "¿Qué paso genera el paquete que se sube al LMS?",
                "instructions": "",
                "options": [],
                "config": {
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MjAiIGhlaWdodD0iMjIwIiB2aWV3Qm94PSIwIDAgNjIwIDIyMCI+CiAgPGRlZnM+PG1hcmtlciBpZD0iYXJyb3ciIG1hcmtlcldpZHRoPSIxMCIgbWFya2VySGVpZ2h0PSIxMCIgcmVmWD0iOCIgcmVmWT0iNSIgb3JpZW50PSJhdXRvIj48cGF0aCBkPSJNMCAwIEwxMCA1IEwwIDEwIHoiIGZpbGw9IiMyMDMwM2MiLz48L21hcmtlcj48L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjYyMCIgaGVpZ2h0PSIyMjAiIGZpbGw9IiNmN2Y4ZmEiLz4KICAKICA8cGF0aCBkPSJNMTc4IDExMCBMMjMxIDExMCIgc3Ryb2tlPSIjMjAzMDNjIiBzdHJva2Utd2lkdGg9IjQiIG1hcmtlci1lbmQ9InVybCgjYXJyb3cpIi8+CiAgPHBhdGggZD0iTTM4OSAxMTAgTDQ0MiAxMTAiIHN0cm9rZT0iIzIwMzAzYyIgc3Ryb2tlLXdpZHRoPSI0IiBtYXJrZXItZW5kPSJ1cmwoI2Fycm93KSIvPgoKICAKICA8cmVjdCB4PSIyNCIgeT0iNjAiIHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiByeD0iMTQiIGZpbGw9IiM1MjY1YzQiLz4KICA8dGV4dCB4PSI5OSIgeT0iMTE4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyMiIgZmlsbD0iI2ZmZmZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+RXNjcmliaXI8L3RleHQ+CgogIDxyZWN0IHg9IjIzNSIgeT0iNjAiIHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiByeD0iMTQiIGZpbGw9IiNjMjdiMDYiLz4KICA8dGV4dCB4PSIzMTAiIHk9IjExOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjIiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlZhbGlkYXI8L3RleHQ+CgogIDxyZWN0IHg9IjQ0NiIgeT0iNjAiIHdpZHRoPSIxNTAiIGhlaWdodD0iMTAwIiByeD0iMTQiIGZpbGw9IiNjMjQxN2UiLz4KICA8dGV4dCB4PSI1MjEiIHk9IjExOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjIiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkV4cG9ydGFyPC90ZXh0PgoKPC9zdmc+",
                  "alt": "Diagrama con tres pasos: Escribir, Validar y Exportar",
                  "spots": [
                    {
                      "id": "z1",
                      "x": 3.9,
                      "y": 27.3,
                      "w": 24.2,
                      "h": 45.5,
                      "label": "Escribir",
                      "correct": false,
                      "feedback": "Escribir es un paso del flujo, pero no es el que genera el paquete."
                    },
                    {
                      "id": "z2",
                      "x": 37.9,
                      "y": 27.3,
                      "w": 24.2,
                      "h": 45.5,
                      "label": "Validar",
                      "correct": false,
                      "feedback": "Validar es un paso del flujo, pero no es el que genera el paquete."
                    },
                    {
                      "id": "z3",
                      "x": 71.9,
                      "y": 27.3,
                      "w": 24.2,
                      "h": 45.5,
                      "label": "Exportar",
                      "correct": true,
                      "feedback": "Exportar SCORM ZIP genera el paquete final para el LMS."
                    }
                  ]
                },
                "feedback": {
                  "correct": "¡Correcto!",
                  "incorrect": "Esa zona no es la que genera el paquete.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            }
          ],
          "status": "ok"
        }
      ]
    },
    {
      "id": "m3",
      "title": "Preguntar y corregir",
      "closing_screens": [],
      "screens": [],
      "units": [
        {
          "id": "u3",
          "loose": false,
          "hide_menu_title": false,
          "title": "Interacciones que corrigen",
          "summary": "Interacciones evaluables: el alumno responde y recibe corrección automática, con intentos configurables.",
          "screens": [
            {
              "id": "s301",
              "type": "content",
              "title": "Opción única",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "**Opción única**: el alumno elige una respuesta entre varias.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s301_i",
                "type": "single_choice",
                "prompt": "¿Cuántas interacciones tiene el editor en total?",
                "instructions": "",
                "options": [
                  {
                    "id": "opt-2",
                    "text": "23",
                    "correct": true
                  },
                  {
                    "id": "opt-3",
                    "text": "17",
                    "correct": false
                  },
                  {
                    "id": "opt-4",
                    "text": "10",
                    "correct": false
                  }
                ],
                "config": {},
                "feedback": {
                  "correct": "Correcto: 23 interacciones, agrupadas en 6 familias.",
                  "incorrect": "Repasa el recorrido: llevas varias interacciones vistas ya.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s302",
              "type": "content",
              "title": "Escenario con decisión",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "Un **escenario con decisión** plantea una situación; cada opción tiene su propio feedback.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s302_i",
                "type": "scenario_decision",
                "prompt": "",
                "instructions": "",
                "options": [
                  {
                    "id": "opt-5",
                    "text": "Exporto igual: los avisos no bloquean nada.",
                    "correct": true,
                    "feedback": "Los avisos (ámbar) son mejorables, no bloqueantes; solo los errores (rojo) conviene resolverlos antes de exportar."
                  },
                  {
                    "id": "opt-6",
                    "text": "No exporto hasta dejar la Validación en cero.",
                    "correct": false,
                    "feedback": "Es una opción válida si quieres pulir el curso, pero no es obligatoria: los avisos no impiden exportar."
                  }
                ],
                "config": {
                  "scenario": "Vas a subir el curso a Moodle: el SCORM ZIP está listo, pero Validación aún muestra dos avisos ámbar (ningún error rojo). ¿Qué haces?"
                },
                "feedback": {
                  "correct": "Buena decisión.",
                  "incorrect": "Revisa la explicación de la opción elegida.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s302a",
              "type": "content",
              "title": "Caso por decisiones",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "Un **caso por decisiones** encadena varias decisiones sobre la misma situación. Cada respuesta tiene su comentario y, al final, un resumen con los aciertos. Si puntúa, la nota es proporcional.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s302a_i",
                "type": "scenario_steps",
                "prompt": "Te toca publicar un curso nuevo en el campus.",
                "instructions": "Elige una opción en cada paso; verás el comentario antes de seguir.",
                "options": [],
                "config": {
                  "scenario": "Has terminado un curso en SCORMEditor y hay que subirlo hoy al campus Moodle.",
                  "steps": [
                    {
                      "id": "st-1",
                      "text": "Antes de exportar, abres **Validación** y ves un error rojo: una pregunta sin respuesta correcta. ¿Qué haces?",
                      "options": [
                        {
                          "id": "st1-a",
                          "text": "Lo corrijo antes de exportar.",
                          "correct": true,
                          "feedback": "Bien: los errores rojos son fallos reales que el alumno notaría."
                        },
                        {
                          "id": "st1-b",
                          "text": "Exporto igual, ya lo arreglaré.",
                          "correct": false,
                          "feedback": "Un error rojo llega al alumno tal cual: esa pregunta no se podría acertar."
                        }
                      ]
                    },
                    {
                      "id": "st-2",
                      "text": "Ya sin errores, ¿qué botón usas para el campus?",
                      "options": [
                        {
                          "id": "st2-a",
                          "text": "Exportar SCORM ZIP.",
                          "correct": true,
                          "feedback": "Exacto: es el paquete que entiende Moodle."
                        },
                        {
                          "id": "st2-b",
                          "text": "Guardar el proyecto .scormproj.",
                          "correct": false,
                          "feedback": "El .scormproj es tu archivo de trabajo, no un paquete para el campus."
                        }
                      ]
                    },
                    {
                      "id": "st-3",
                      "text": "En Moodle, ¿cómo lo añades al curso?",
                      "options": [
                        {
                          "id": "st3-a",
                          "text": "Como actividad «Paquete SCORM».",
                          "correct": true,
                          "feedback": "Correcto: así Moodle registra el progreso y la nota."
                        },
                        {
                          "id": "st3-b",
                          "text": "Como recurso «Archivo».",
                          "correct": false,
                          "feedback": "Como archivo se descargaría, pero no se registraría ni el progreso ni la nota."
                        }
                      ]
                    }
                  ]
                },
                "feedback": {
                  "correct": "Correcto.",
                  "incorrect": "Revisa el comentario de esta decisión.",
                  "explanation": ""
                },
                "scored": true,
                "points": 3,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s302b",
              "type": "content",
              "title": "Conversación ramificada",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "Una **conversación ramificada** simula un diálogo: cada respuesta lleva a una situación distinta y a un final bueno, mejorable o neutro. Cuenta el primer final al que llega el alumno.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s302b_i",
                "type": "decision_tree",
                "prompt": "Una compañera te pide ayuda con su primer curso.",
                "instructions": "Elige qué responder en cada momento. Puedes deshacer la última respuesta antes de llegar al final.",
                "options": [],
                "config": {
                  "characters": [
                    {
                      "id": "p-lucia",
                      "name": "Lucía",
                      "role": "coordinadora de formación"
                    }
                  ],
                  "nodes": [
                    {
                      "id": "n1",
                      "speaker": "p-lucia",
                      "text": "Tengo el temario en un PDF y quiero convertirlo en un curso para el campus. ¿Por dónde empiezo?",
                      "choices": [
                        {
                          "id": "c1",
                          "text": "Créalo desde cero en el editor, pantalla a pantalla.",
                          "to": "n2"
                        },
                        {
                          "id": "c2",
                          "text": "Pásaselo al GPT generador y luego revisa el borrador en el editor.",
                          "to": "n3"
                        }
                      ]
                    },
                    {
                      "id": "n2",
                      "speaker": "p-lucia",
                      "text": "Son 80 páginas… ¿no hay una forma más rápida?",
                      "choices": [
                        {
                          "id": "c3",
                          "text": "Sí: el GPT genera un borrador que luego importas y revisas.",
                          "to": "n3"
                        },
                        {
                          "id": "c4",
                          "text": "No, toca hacerlo a mano.",
                          "to": "n4"
                        }
                      ]
                    },
                    {
                      "id": "n3",
                      "speaker": "p-lucia",
                      "text": "¡Perfecto! Y al importarlo, ¿lo subo ya al campus?",
                      "choices": [
                        {
                          "id": "c5",
                          "text": "Primero repasa la Validación y la Vista estudiante.",
                          "to": "n5"
                        },
                        {
                          "id": "c6",
                          "text": "Sí, el GPT ya lo deja listo.",
                          "to": "n6"
                        }
                      ]
                    },
                    {
                      "id": "n4",
                      "speaker": "p-lucia",
                      "text": "Vaya, entonces no llegaré a tiempo.",
                      "choices": [],
                      "outcome": "bad",
                      "feedback": "El GPT generador existe justo para esto: convierte el documento fuente en un borrador de curso."
                    },
                    {
                      "id": "n5",
                      "speaker": "p-lucia",
                      "text": "Entendido, lo reviso y te aviso.",
                      "choices": [],
                      "outcome": "good",
                      "feedback": "El borrador del GPT ahorra horas, pero la revisión humana sigue siendo imprescindible."
                    },
                    {
                      "id": "n6",
                      "speaker": "p-lucia",
                      "text": "Lo subo ya, ¡gracias!",
                      "choices": [],
                      "outcome": "bad",
                      "feedback": "El borrador puede traer erratas o pantallas pendientes de revisión: hay que repasarlo antes de publicar."
                    }
                  ]
                },
                "feedback": {
                  "correct": "Correcto.",
                  "incorrect": "Revisa el comentario del final.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s302c",
              "type": "content",
              "title": "Reto numérico",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "Un **reto numérico** da unos datos y pide calcular uno o varios resultados. Se corrige con un pequeño margen de redondeo y admite coma decimal. También existe un modo de calculadora libre, sin nota.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s302c_i",
                "type": "calculator",
                "prompt": "Calcula cuánto dura el curso a partir de estos datos.",
                "instructions": "Escribe el resultado (puedes usar coma decimal) y pulsa Comprobar.",
                "options": [],
                "config": {
                  "mode": "challenge",
                  "variables": [
                    {
                      "id": "pantallas",
                      "label": "Pantallas de contenido",
                      "unit": "",
                      "value": 24
                    },
                    {
                      "id": "min_pantalla",
                      "label": "Minutos por pantalla",
                      "unit": "min",
                      "value": 3
                    },
                    {
                      "id": "test",
                      "label": "Duración del test final",
                      "unit": "min",
                      "value": 15
                    }
                  ],
                  "results": [
                    {
                      "id": "total",
                      "label": "Duración total",
                      "formula": "pantallas * min_pantalla + test",
                      "unit": "min",
                      "decimals": 0
                    },
                    {
                      "id": "horas",
                      "label": "En horas",
                      "formula": "total / 60",
                      "unit": "h",
                      "decimals": 2
                    }
                  ]
                },
                "feedback": {
                  "correct": "¡Cuentas exactas!",
                  "incorrect": "Revisa la operación: pantallas × minutos, más el test.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s303",
              "type": "content",
              "title": "Rellenar huecos",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "**Rellenar huecos**: cada hueco se resuelve eligiendo entre las respuestas correctas y distractores mezclados.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s303_i",
                "type": "fill_blanks",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "text": "El curso se guarda como un archivo [[.scormproj]], y se exporta como un [[SCORM ZIP]] para subirlo al LMS.",
                  "distractors": [
                    ".docx",
                    ".elpx"
                  ]
                },
                "feedback": {
                  "correct": "Todos los huecos correctos.",
                  "incorrect": "Repasa la sección «Primeros pasos» del manual.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s303b",
              "type": "content",
              "title": "Rellenar huecos escribiendo",
              "objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
              "student_text": "**Rellenar huecos** también puede pedir que el alumno **escriba** la respuesta. Se admiten alternativas, y al corregir no cuentan mayúsculas, tildes ni espacios de más.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s303b_i",
                "type": "fill_blanks",
                "prompt": "",
                "instructions": "Escribe la palabra que falta en cada hueco y pulsa Comprobar.",
                "options": [],
                "config": {
                  "mode": "type",
                  "text": "Para subir el curso al campus se exporta un paquete [[SCORM|SCORM ZIP]]; el archivo de trabajo, en cambio, es el [[.scormproj|scormproj]]."
                },
                "feedback": {
                  "correct": "Todos los huecos correctos.",
                  "incorrect": "Repasa la sección «Primeros pasos» del manual.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            }
          ],
          "status": "ok"
        }
      ]
    },
    {
      "id": "m4",
      "title": "Manipular elementos",
      "closing_screens": [],
      "screens": [],
      "units": [
        {
          "id": "u4",
          "loose": false,
          "hide_menu_title": false,
          "title": "Ordenar, emparejar, clasificar",
          "summary": "El alumno ordena o coloca elementos: con ratón puede arrastrarlos; en móvil y con teclado, tocando y colocando.",
          "screens": [
            {
              "id": "s401",
              "type": "content",
              "title": "Ordenar pasos",
              "objective": "Reconocer las interacciones de manipulación: ordenar, emparejar y clasificar.",
              "student_text": "**Ordenar pasos**: sube o baja cada paso con ▲ ▼ (con ratón también puedes arrastrarlo) hasta dejar la secuencia correcta; cada paso muestra su posición.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s401_i",
                "type": "sort_steps",
                "prompt": "Ordena el ciclo de guardado",
                "instructions": "",
                "options": [],
                "config": {
                  "steps": [
                    {
                      "id": "p1",
                      "text": "Editas el curso en el árbol y el formulario",
                      "explanation": "Todo empieza por el contenido: sin pantallas no hay nada que guardar ni revisar.",
                      "order": 1
                    },
                    {
                      "id": "p2",
                      "text": "Guardas con Ctrl+S (o el indicador de estado)",
                      "explanation": "Guardar antes de revisar evita perder cambios si algo falla.",
                      "order": 2
                    },
                    {
                      "id": "p3",
                      "text": "Validación revisa errores y avisos",
                      "explanation": "La Validación va antes de exportar: así el paquete no sale con errores.",
                      "order": 3
                    },
                    {
                      "id": "p4",
                      "text": "Exportas el SCORM ZIP y lo subes al LMS",
                      "explanation": "Exportar es lo último: el ZIP es lo que recibe el campus.",
                      "order": 4
                    }
                  ]
                },
                "feedback": {
                  "correct": "Orden correcto.",
                  "incorrect": "Vuelve a intentarlo: piensa en qué depende de qué.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s402",
              "type": "content",
              "title": "Emparejar",
              "objective": "Reconocer las interacciones de manipulación: ordenar, emparejar y clasificar.",
              "student_text": "**Emparejar**: toca un elemento y después la casilla con la que se relaciona (con ratón también puedes arrastrarlo). Mientras hay uno seleccionado, los destinos se resaltan y puedes cancelar.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s402_i",
                "type": "match_pairs",
                "prompt": "",
                "instructions": "",
                "options": [
                  {
                    "id": "o1",
                    "text": "Tu documento de trabajo, se reedita",
                    "group": "g1"
                  },
                  {
                    "id": "o2",
                    "text": "El paquete final para el LMS",
                    "group": "g2"
                  },
                  {
                    "id": "o3",
                    "text": "Exportación para seguir en eXeLearning",
                    "group": "g3"
                  }
                ],
                "config": {
                  "groups": [
                    {
                      "id": "g1",
                      "label": ".scormproj"
                    },
                    {
                      "id": "g2",
                      "label": "SCORM ZIP"
                    },
                    {
                      "id": "g3",
                      "label": ".elpx"
                    }
                  ]
                },
                "feedback": {
                  "correct": "Emparejado correctamente.",
                  "incorrect": "Alguna pareja no es correcta: revísalo.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s403",
              "type": "content",
              "title": "Clasificar en categorías",
              "objective": "Reconocer las interacciones de manipulación: ordenar, emparejar y clasificar.",
              "student_text": "**Clasificar**: mismo gesto que emparejar, pero varios elementos pueden ir a la misma categoría.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s403_i",
                "type": "classification",
                "prompt": "",
                "instructions": "",
                "options": [
                  {
                    "id": "x1",
                    "text": "Opción única",
                    "group": "c1"
                  },
                  {
                    "id": "x2",
                    "text": "Acordeón",
                    "group": "c2"
                  },
                  {
                    "id": "x3",
                    "text": "HTML a medida",
                    "group": "c2"
                  },
                  {
                    "id": "x4",
                    "text": "Zonas interactivas",
                    "group": "c1"
                  }
                ],
                "config": {
                  "groups": [
                    {
                      "id": "c1",
                      "label": "Puede puntuar"
                    },
                    {
                      "id": "c2",
                      "label": "Nunca puntúa"
                    }
                  ]
                },
                "feedback": {
                  "correct": "Clasificación correcta.",
                  "incorrect": "Revisa qué interacciones tienen corrección real.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            }
          ],
          "status": "ok"
        }
      ]
    },
    {
      "id": "m5",
      "title": "Juegos didácticos y piezas avanzadas",
      "closing_screens": [],
      "screens": [],
      "units": [
        {
          "id": "u5",
          "loose": false,
          "hide_menu_title": false,
          "title": "Juegos y piezas especiales",
          "summary": "Dinámicas lúdicas que se autocorrigen sin botón «Comprobar», más una pieza especial: HTML a medida (el vídeo interactivo ya se vio en el módulo 1).",
          "screens": [
            {
              "id": "s501",
              "type": "content",
              "title": "Sopa de letras",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Sopa de letras**: se autoevalúa sola, sin botón Comprobar — toca la primera y la última letra de cada palabra.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s501_i",
                "type": "word_search",
                "prompt": "Encuentra estas palabras del editor",
                "instructions": "Toca la primera letra de una palabra de la lista y luego su última letra. Pueden estar en horizontal, vertical o diagonal, y leerse del derecho o del revés.",
                "options": [],
                "config": {
                  "words": [
                    "PANTALLA",
                    "MODULO",
                    "UNIDAD",
                    "CURSO"
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s502",
              "type": "content",
              "title": "Crucigrama",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Crucigrama**: como Rellenar huecos, con botón Comprobar e intentos limitados.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s502_i",
                "type": "crossword",
                "prompt": "",
                "instructions": "Cada casilla numerada es el inicio de una palabra: busca su número en las pistas (Horizontales o Verticales) y escribe la palabra letra a letra — al escribir, el cursor avanza solo a la siguiente casilla. Cuando hayas rellenado todo el crucigrama, pulsa Comprobar.",
                "options": [],
                "config": {
                  "entries": [
                    {
                      "word": "CURSO",
                      "clue": "Lo que edita SCORMEditor de principio a fin."
                    },
                    {
                      "word": "MODULO",
                      "clue": "Agrupa unidades (y puede tener pantallas propias)."
                    },
                    {
                      "word": "ASSETS",
                      "clue": "Carpeta del proyecto donde viven las imágenes y audios."
                    }
                  ]
                },
                "feedback": {
                  "correct": "Crucigrama correcto.",
                  "incorrect": "Quedan palabras por corregir.",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 2,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s503",
              "type": "content",
              "title": "Rosco A-Z",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Rosco (pasapalabra)**: una definición por letra; puedes pasar palabra y vuelve más tarde. Una sola oportunidad por letra.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s503_i",
                "type": "az_quiz",
                "prompt": "",
                "instructions": "Vas a responder una pregunta por cada letra, en orden: la pista indica por qué letra debe empezar tu respuesta. Escribe tu respuesta y pulsa Enter (o «Responder»); si no la sabes, pulsa «Pasapalabra» y volverá a preguntarse al final.",
                "options": [],
                "config": {
                  "items": [
                    {
                      "clue": "Tipo de pantalla que se ve la primera vez, al abrir el curso.",
                      "answer": "Portada"
                    },
                    {
                      "clue": "Herramienta que revisa errores y avisos antes de exportar.",
                      "answer": "Validación"
                    },
                    {
                      "clue": "Extensión del proyecto de trabajo del editor.",
                      "answer": "Scormproj"
                    },
                    {
                      "clue": "Formato de exportación alternativo, para eXeLearning.",
                      "answer": "Elpx"
                    },
                    {
                      "clue": "Grupo de interacciones que se ordenan, emparejan o clasifican.",
                      "answer": "Manipular"
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s504",
              "type": "content",
              "title": "Imagen oculta",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Imagen oculta**: cada acierto destapa una parte de la imagen; si aciertas todas, queda descubierta por completo.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s504_i",
                "type": "hidden_image",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NDAiIGhlaWdodD0iNDgwIiB2aWV3Qm94PSIwIDAgNjQwIDQ4MCI+CiAgPHJlY3Qgd2lkdGg9IjY0MCIgaGVpZ2h0PSI0ODAiIGZpbGw9IiNmN2Y4ZmEiLz4KICA8Y2lyY2xlIGN4PSIzMjAiIGN5PSIyNDAiIHI9IjIwMCIgZmlsbD0iIzUyNjVjNCIvPgogIDxjaXJjbGUgY3g9IjMyMCIgY3k9IjI0MCIgcj0iMTU1IiBmaWxsPSIjZmZmZmZmIi8+CiAgPGNpcmNsZSBjeD0iMzIwIiBjeT0iMjQwIiByPSIxMTAiIGZpbGw9IiMwZjk0OTAiLz4KICA8Y2lyY2xlIGN4PSIzMjAiIGN5PSIyNDAiIHI9IjY2IiBmaWxsPSIjZmZmZmZmIi8+CiAgPGNpcmNsZSBjeD0iMzIwIiBjeT0iMjQwIiByPSIyNiIgZmlsbD0iI2MyNDE3ZSIvPgo8L3N2Zz4=",
                  "alt": "Diana de círculos concéntricos en los colores del editor",
                  "questions": [
                    {
                      "prompt": "¿Cuántos módulos tiene este curso de demostración?",
                      "options": [
                        {
                          "text": "5",
                          "correct": true
                        },
                        {
                          "text": "3",
                          "correct": false
                        },
                        {
                          "text": "10",
                          "correct": false
                        }
                      ]
                    },
                    {
                      "prompt": "¿Qué agrupa el editor en «módulos → unidades → pantallas»?",
                      "options": [
                        {
                          "text": "La estructura del curso",
                          "correct": true
                        },
                        {
                          "text": "Las interacciones",
                          "correct": false
                        }
                      ]
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s505",
              "type": "content",
              "title": "Puzzle de imagen",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Puzzle**: recompón la imagen tocando dos piezas para intercambiarlas entre sí.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s505_i",
                "type": "puzzle",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "image": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0ODAiIGhlaWdodD0iNDgwIiB2aWV3Qm94PSIwIDAgNDgwIDQ4MCI+CiAgPHJlY3Qgd2lkdGg9IjQ4MCIgaGVpZ2h0PSI0ODAiIGZpbGw9IiM3Nzg3YmYiLz4KICA8cmVjdCB5PSIzMjAiIHdpZHRoPSI0ODAiIGhlaWdodD0iMTYwIiBmaWxsPSIjMGY5NDkwIi8+CiAgPHJlY3QgeT0iMTYwIiB3aWR0aD0iNDgwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2Y0YzkxMCIgb3BhY2l0eT0iMC44NSIvPgogIDxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iOTAiIGZpbGw9IiNmZmZmZmYiIG9wYWNpdHk9IjAuOSIvPgogIDxyZWN0IHg9IjMwMCIgeT0iNjAiIHdpZHRoPSIxNDAiIGhlaWdodD0iMTQwIiBmaWxsPSIjYzI0MTdlIiBvcGFjaXR5PSIwLjkiLz4KICA8cG9seWdvbiBwb2ludHM9IjYwLDQyMCAxNjAsMzAwIDI2MCw0MjAiIGZpbGw9IiM1MjY1YzQiLz4KICA8Y2lyY2xlIGN4PSIzODAiIGN5PSI0MTAiIHI9IjYwIiBmaWxsPSIjZjRkNmQyIi8+Cjwvc3ZnPg==",
                  "alt": "Composición geométrica de colores",
                  "cols": 3,
                  "rows": 3
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": true,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s506",
              "type": "content",
              "title": "Tarjetas de repaso",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**Tarjetas de repaso**: se autoevalúan — intenta responder, gira la tarjeta y marca si la sabías. No puntúan: son para repasar, no para examinar.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s506_i",
                "type": "flashcards",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "cards": [
                    {
                      "front": "¿Qué hace el botón «Cambiar tipo…» de una interacción?",
                      "back": "Convierte la interacción en otra conservando lo compatible; avisa si algo se va a perder."
                    },
                    {
                      "front": "¿Qué es un preset de bloque personalizado?",
                      "back": "Un atajo con icono, color y título guardados en tu navegador, no dentro del curso."
                    }
                  ]
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            },
            {
              "id": "s507",
              "type": "content",
              "title": "HTML a medida",
              "objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
              "student_text": "**HTML a medida**: la única pieza que admite código del autor. Corre aislado en un sandbox, sin acceso a la nota ni al resto de la página.",
              "source_refs": [],
              "visual_resource": {
                "kind": "none",
                "src": "",
                "alt": "",
                "tracks": [],
                "has_voice": false,
                "layout": "top",
                "media_width": "50",
                "media_align": "left",
                "media_full": false,
                "media_ratio": "16x9"
              },
              "interaction": {
                "id": "s507_i",
                "type": "html_embed",
                "prompt": "",
                "instructions": "",
                "options": [],
                "config": {
                  "html": "<div class=\"box\"><p>¡Hola! Este bloque es HTML, CSS y JavaScript propios, aislados en un sandbox.</p><button id=\"b\" type=\"button\">Pulsa</button><p id=\"o\"></p></div>",
                  "css": ".box{font-family:sans-serif;text-align:center;padding:1em}button{background:#5265c4;color:#fff;border:0;border-radius:6px;padding:.5em 1em;cursor:pointer;font-size:1em}",
                  "js": "document.getElementById(\"b\").onclick=function(){document.getElementById(\"o\").textContent=\"\\ud83e\\udde9 Código ejecutado dentro del sandbox.\";};"
                },
                "feedback": {
                  "correct": "",
                  "incorrect": "",
                  "explanation": ""
                },
                "scored": false,
                "points": 1,
                "attempts": 1,
                "retries": 0,
                "source_refs": []
              },
              "interaction_layout": "bottom",
              "required": true,
              "min_time_seconds": 0,
              "audio_src": "",
              "transcript": "",
              "transcript_hidden": false,
              "accessibility": {
                "alt_text_ok": true,
                "keyboard_ok": true,
                "contrast_ok": true
              },
              "scorm": {
                "counts_for_completion": true
              },
              "editor_notes": [],
              "status": "ok",
              "review": {
                "flagged": false,
                "note": ""
              }
            }
          ],
          "status": "ok"
        }
      ]
    }
  ],
  "assessments": {
    "unit_tests": [],
    "final_test": {
      "id": "final",
      "unit_id": "",
      "title": "Test final: repaso de todo el recorrido",
      "instructions": "Una pregunta por cada bloque del curso.",
      "questions": [
        {
          "id": "q1",
          "prompt": "Un curso se organiza en módulos, que contienen unidades, que contienen pantallas.",
          "type": "true_false",
          "options": [
            {
              "id": "opt-7",
              "text": "Verdadero",
              "correct": true
            },
            {
              "id": "opt-8",
              "text": "Falso",
              "correct": false
            }
          ],
          "feedback": {
            "correct": "Correcto.",
            "incorrect": "Repasa el módulo «Cómo se organiza un curso».",
            "explanation": ""
          },
          "points": 1,
          "learning_objective": "Reconocer los tipos de pantalla del editor y cuándo usar cada uno.",
          "source_refs": []
        },
        {
          "id": "q2",
          "prompt": "¿Cuál de estas interacciones NO se corrige automáticamente (es solo informativa)?",
          "type": "single_choice",
          "options": [
            {
              "id": "opt-9",
              "text": "Acordeón",
              "correct": true
            },
            {
              "id": "opt-a",
              "text": "Rellenar huecos",
              "correct": false
            },
            {
              "id": "opt-b",
              "text": "Ordenar pasos",
              "correct": false
            }
          ],
          "feedback": {
            "correct": "Correcto: el acordeón es del grupo «presentar».",
            "incorrect": "Repasa el módulo «Presentar contenido».",
            "explanation": ""
          },
          "points": 1,
          "learning_objective": "Reconocer las interacciones que presentan contenido sin evaluarlo.",
          "source_refs": []
        },
        {
          "id": "q3",
          "prompt": "¿Qué necesita como mínimo una pregunta de opción única para no dar error en Validación?",
          "type": "single_choice",
          "options": [
            {
              "id": "opt-c",
              "text": "Una opción marcada como correcta y algún feedback",
              "correct": true
            },
            {
              "id": "opt-d",
              "text": "Nada: se puede dejar vacía",
              "correct": false
            },
            {
              "id": "opt-e",
              "text": "Una imagen obligatoria",
              "correct": false
            }
          ],
          "feedback": {
            "correct": "Correcto.",
            "incorrect": "Repasa el módulo «Preguntar y corregir».",
            "explanation": ""
          },
          "points": 1,
          "learning_objective": "Reconocer las interacciones que preguntan y corrigen automáticamente.",
          "source_refs": []
        },
        {
          "id": "q4",
          "prompt": "En «Clasificar en categorías», dos elementos distintos pueden compartir la misma categoría.",
          "type": "true_false",
          "options": [
            {
              "id": "opt-f",
              "text": "Verdadero",
              "correct": true
            },
            {
              "id": "opt-g",
              "text": "Falso",
              "correct": false
            }
          ],
          "feedback": {
            "correct": "Correcto: a diferencia de Emparejar, varias fichas pueden ir a la misma categoría.",
            "incorrect": "Repasa el módulo «Manipular elementos».",
            "explanation": ""
          },
          "points": 1,
          "learning_objective": "Reconocer las interacciones de manipulación: ordenar, emparejar y clasificar.",
          "source_refs": []
        },
        {
          "id": "q5",
          "prompt": "¿Qué interacción NO tiene botón «Comprobar» porque se autoevalúa al instante?",
          "type": "single_choice",
          "options": [
            {
              "id": "opt-h",
              "text": "Sopa de letras",
              "correct": true
            },
            {
              "id": "opt-i",
              "text": "Crucigrama",
              "correct": false
            },
            {
              "id": "opt-j",
              "text": "Rellenar huecos",
              "correct": false
            }
          ],
          "feedback": {
            "correct": "Correcto: se valida al tocar la primera y la última letra.",
            "incorrect": "Repasa el módulo «Juegos didácticos y piezas avanzadas».",
            "explanation": ""
          },
          "points": 1,
          "learning_objective": "Reconocer los juegos didácticos autoevaluables y las piezas avanzadas.",
          "source_refs": []
        }
      ],
      "pass_score": 60,
      "one_question_per_screen": true
    }
  },
  "glossary": [
    {
      "term": "SCORM",
      "definition": "Estándar de empaquetado e-learning (Sharable Content Object Reference Model) que permite subir un curso a un LMS como Moodle y que este registre el progreso y la nota.",
      "source_refs": []
    },
    {
      "term": "Interacción",
      "definition": "La actividad de una pantalla: desde un acordeón informativo hasta una pregunta evaluable. Hay 23 tipos, agrupados por lo que hace el alumno.",
      "source_refs": []
    },
    {
      "term": "Objetivo de aprendizaje",
      "definition": "Lo que el alumno debería saber hacer tras una pantalla. Se reutiliza igual en varias pantallas y se vincula a las preguntas que lo evalúan.",
      "source_refs": []
    },
    {
      "term": "Callout",
      "definition": "Bloque de texto destacado con icono y color (Consejo, Atención, Importante…), o uno personalizado con icono y color libres.",
      "source_refs": []
    },
    {
      "term": "LMS",
      "definition": "Learning Management System: la plataforma (por ejemplo Moodle) donde se aloja el curso exportado y se registran las calificaciones.",
      "source_refs": []
    },
    {
      "term": "Vista estudiante",
      "definition": "La pestaña del editor que muestra el curso exactamente como se exportará: la misma carcasa que va dentro del ZIP.",
      "source_refs": []
    }
  ],
  "glossary_title": "Glosario",
  "bibliography": [
    {
      "ref": "ADL Initiative — especificación SCORM 1.2, «Run-Time Environment».",
      "url": "https://scorm.com/scorm-explained/technical-scorm/run-time/"
    },
    {
      "ref": "W3C — Web Content Accessibility Guidelines (WCAG) 2.1.",
      "url": "https://www.w3.org/TR/WCAG21/"
    }
  ],
  "bibliography_title": "Recursos y bibliografía",
  "attachments": [],
  "attachments_title": "Documentos",
  "quality_checklist": {}
}
