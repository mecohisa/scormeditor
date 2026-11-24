# Genera course.json con una pantalla por marca de la guía (para capturas).
import json, sys, os

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join('site', 'data', 'course.json')
os.makedirs(os.path.dirname(OUT), exist_ok=True)

FB = {"correct": "¡Correcto!", "incorrect": "Revisa el contenido e inténtalo de nuevo.", "explanation": ""}
NOFB = {"correct": "", "incorrect": "", "explanation": ""}

def inter(sid, typ, prompt, instr, config=None, options=None, scored=True, fb=None):
    return {"id": sid + "_i", "type": typ, "prompt": prompt, "instructions": instr,
            "options": options or [], "config": config or {},
            "feedback": fb or (FB if scored else NOFB), "scored": scored,
            "points": 1 if scored else 0, "retries": 2 if scored else 0}

def scr(sid, title, text="", interaction=None, typ="content"):
    s = {"id": sid, "type": typ, "title": title, "student_text": text,
         "required": True, "status": "ok"}
    if interaction: s["interaction"] = interaction
    return s

S = []
S.append(scr("diapositiva", "Comprobación previa del extintor",
  "Antes de manipular cualquier extintor, comprueba **siempre** que el precinto está intacto y que la aguja del manómetro está en la zona verde.\n\nUn extintor fuera de rango de presión, aunque parezca íntegro, puede no funcionar cuando se necesite."))
S.append(scr("acordeon", "Tipos de extintor", "Despliega cada tipo para ver en qué fuegos se usa.",
  inter("acordeon", "accordion", "Tipos de extintor", "Despliega cada apartado.", {"items": [
    {"title": "Extintor de agua", "body": "Fuegos de materiales sólidos (clase A): madera, papel, tejidos. **Nunca** sobre equipos eléctricos."},
    {"title": "Extintor de CO2", "body": "Fuegos eléctricos y de líquidos inflamables sin dejar residuo."},
    {"title": "Extintor de polvo ABC", "body": "Fuegos de las clases A, B y C; es el más polivalente."}]}, scored=False)))
S.append(scr("pestanas", "Clases de fuego", "",
  inter("pestanas", "tabs", "Clases de fuego", "Pulsa cada pestaña.", {"items": [
    {"title": "Clase A", "body": "Combustibles sólidos que forman brasas: madera, papel, cartón, tejidos."},
    {"title": "Clase B", "body": "Líquidos inflamables o sólidos que se licúan: gasolina, aceites, ceras."},
    {"title": "Clase C", "body": "Gases inflamables: butano, propano, gas natural."}]}, scored=False)))
S.append(scr("volteables", "Conceptos clave", "",
  inter("volteables", "flip_cards", "Conceptos clave", "Pulsa cada tarjeta para girarla.", {"cards": [
    {"front": "Conato de incendio", "back": "Fuego pequeño que puede controlarse con los medios disponibles en el lugar."},
    {"front": "Plan de autoprotección", "back": "Documento que organiza la respuesta del centro ante una emergencia."}]}, scored=False)))
S.append(scr("linea", "Fases de una evacuación", "",
  inter("linea", "timeline", "Fases de una evacuación", "Despliega cada fase.", {"milestones": [
    {"label": "Fase 1", "title": "Detección y alarma", "body": "Quien detecta el fuego avisa y se activa la alarma."},
    {"label": "Fase 2", "title": "Primera intervención", "body": "El equipo de primera intervención valora si puede controlar el conato."},
    {"label": "Fase 3", "title": "Evacuación", "body": "Se evacúa por zonas, empezando por las personas con más dependencia."},
    {"label": "Fase 4", "title": "Recuento", "body": "En el punto de encuentro se comprueba que no falta nadie."}]}, scored=False)))
S.append(scr("calculadora", "Calcula tu consumo de agua", "Prueba con tus propios datos.",
  inter("calculadora", "calculator", "Consumo de una ducha", "Cambia los datos y mira el resultado.", {"mode": "tool",
    "variables": [{"id": "minutos", "label": "Minutos de ducha", "unit": "min", "value": 8},
                  {"id": "caudal", "label": "Caudal del grifo", "unit": "l/min", "value": 10}],
    "results": [{"id": "litros", "label": "Litros por ducha", "formula": "minutos * caudal", "unit": "l", "decimals": 0},
                {"id": "mes", "label": "Litros al mes (una ducha al día)", "formula": "litros * 30", "unit": "l", "decimals": 0}]}, scored=False)))
S.append(scr("opcion", "Comprueba lo aprendido", "",
  inter("opcion", "single_choice", "¿Qué extintor se usa en un incendio eléctrico?", "Elige la opción correcta.", options=[
    {"id": "a", "text": "Extintor de agua", "correct": False, "feedback": "El agua conduce la electricidad."},
    {"id": "b", "text": "Extintor de CO2", "correct": True, "feedback": "Correcto."},
    {"id": "c", "text": "Manguera de riego", "correct": False, "feedback": "Es agua: conduce la electricidad."}])))
S.append(scr("vf", "Comprueba lo aprendido", "",
  inter("vf", "true_false", "El extintor de CO2 no deja residuo tras su uso.", "Indica si es verdadero o falso.", options=[
    {"id": "v", "text": "Verdadero", "correct": True, "feedback": ""}, {"id": "f", "text": "Falso", "correct": False, "feedback": ""}])))
S.append(scr("huecos", "Completa la frase", "",
  inter("huecos", "fill_blanks", "Completa la frase", "Elige la palabra que falta en cada hueco.",
    {"text": "Ante un fuego eléctrico se usa el extintor de [[CO2]], porque el [[agua]] conduce la electricidad.", "distractors": ["espuma", "arena"]})))
S.append(scr("huecos2", "Completa la frase", "",
  inter("huecos2", "fill_blanks", "Completa la frase", "Escribe la palabra que falta en cada hueco.",
    {"mode": "type", "text": "Antes de mover a la persona, comprueba los [[frenos]] de la [[silla|silla de ruedas]]."})))
S.append(scr("parejas", "Relaciona cada extintor", "",
  inter("parejas", "match_pairs", "Relaciona cada extintor con su uso", "Arrastra cada elemento a su pareja.",
    {"groups": [{"id": "g1", "label": "Fuegos de madera y papel"}, {"id": "g2", "label": "Fuegos eléctricos"}, {"id": "g3", "label": "Fuegos de clases A, B y C"}]},
    options=[{"id": "o1", "text": "Extintor de agua", "group": "g1"}, {"id": "o2", "text": "Extintor de CO2", "group": "g2"}, {"id": "o3", "text": "Extintor de polvo ABC", "group": "g3"}])))
S.append(scr("clasificar", "Clasifica los combustibles", "",
  inter("clasificar", "classification", "¿De qué clase es cada fuego?", "Arrastra cada combustible a su clase.",
    {"groups": [{"id": "a", "label": "Clase A"}, {"id": "b", "label": "Clase B"}]},
    options=[{"id": "o1", "text": "Madera", "group": "a"}, {"id": "o2", "text": "Gasolina", "group": "b"}, {"id": "o3", "text": "Papel", "group": "a"}, {"id": "o4", "text": "Aceite", "group": "b"}])))
S.append(scr("ordenar", "Cómo usar un extintor", "",
  inter("ordenar", "sort_steps", "Ordena los pasos", "Arrastra los pasos al orden correcto.", {"steps": [
    {"id": "p1", "text": "Retira el pasador de seguridad", "order": 1},
    {"id": "p2", "text": "Apunta a la base del fuego", "order": 2},
    {"id": "p3", "text": "Aprieta la palanca", "order": 3},
    {"id": "p4", "text": "Muévete en abanico", "order": 4}]})))
S.append(scr("decision", "Qué harías tú", "",
  inter("decision", "scenario_decision", "¿Qué haces primero?", "Elige la opción más adecuada.",
    {"scenario": "Durante el turno de noche notas olor a quemado en el office y ves humo saliendo de un enchufe."},
    options=[{"id": "a", "text": "Echar agua sobre el enchufe.", "correct": False, "feedback": "El agua conduce la electricidad."},
             {"id": "b", "text": "Dar la alarma y cortar la corriente si es seguro.", "correct": True, "feedback": "Correcto."},
             {"id": "c", "text": "Esperar a ver si se apaga solo.", "correct": False, "feedback": "Cada minuto cuenta."}])))
S.append(scr("practico", "Caso práctico", "",
  inter("practico", "case_practice", "Revisa el extintor de tu planta", "Piensa tu respuesta y compárala con los criterios.",
    {"rubric": [{"label": "Compruebas el precinto y el manómetro"}, {"label": "Miras la fecha de la última revisión"}, {"label": "Verificas que el acceso está despejado"}]}, scored=False)))
S.append(scr("pasos", "Caso: la ducha de la mañana", "",
  inter("pasos", "scenario_steps", "Caso: la ducha de la mañana", "Toma cada decisión; verás el comentario de tu elección.",
    {"scenario": "Una persona usuaria se niega a ducharse esta mañana.", "steps": [
      {"id": "st1", "text": "Te dice que hoy no quiere. ¿Qué haces primero?", "options": [
        {"id": "st1a", "text": "Preguntarle con calma qué le ocurre.", "correct": True, "feedback": "Bien: entender el motivo abre opciones."},
        {"id": "st1b", "text": "Insistir en que es la hora de la ducha.", "correct": False, "feedback": "Insistir suele aumentar la resistencia."}]},
      {"id": "st2", "text": "Prefiere hacerlo por la tarde. ¿Cómo sigues?", "options": [
        {"id": "st2a", "text": "Ajustar el horario y anotarlo en su plan.", "correct": True, "feedback": "Respetas su preferencia y lo dejas registrado."},
        {"id": "st2b", "text": "Dejarlo para mañana sin decir nada.", "correct": False, "feedback": "Sin registro, el equipo no sabrá del cambio."}]}]})))
S.append(scr("conversacion", "Una familia preocupada", "",
  inter("conversacion", "decision_tree", "Una familia preocupada", "Elige qué respondes en cada momento.",
    {"characters": [{"id": "p1", "name": "Carmen", "role": "hija de una persona usuaria"}], "nodes": [
      {"id": "n1", "speaker": "p1", "text": "Mi madre lleva dos días sin querer comer. ¿Qué le estáis haciendo?", "choices": [
        {"id": "c1", "text": "Entiendo su preocupación. Cuénteme qué ha notado.", "to": "n2"},
        {"id": "c2", "text": "Aquí hacemos las cosas bien, no se preocupe.", "to": "n4"}]},
      {"id": "n2", "speaker": "p1", "text": "Que deja el plato entero y está más callada de lo normal.", "choices": [
        {"id": "c3", "text": "Gracias por contármelo. Hoy lo vemos con la enfermera y la llamo.", "to": "n3"},
        {"id": "c4", "text": "Será una racha, ya comerá.", "to": "n4"}]},
      {"id": "n3", "speaker": "p1", "text": "Gracias por escucharme. Me quedo más tranquila.", "choices": [],
       "outcome": "good", "feedback": "Validar la emoción y comprometerse con un paso concreto baja la tensión."},
      {"id": "n4", "speaker": "p1", "text": "Pues quiero hablar con la dirección.", "choices": [],
       "outcome": "bad", "feedback": "Restar importancia a la queja la escala."}]})))
S.append(scr("reto", "Calcula la dosis", "",
  inter("reto", "calculator", "Calcula la dosis", "Escribe el resultado y pulsa Comprobar.", {"mode": "challenge",
    "variables": [{"id": "peso", "label": "Peso de la persona", "unit": "kg", "value": 70},
                  {"id": "dosis_kg", "label": "Dosis prescrita", "unit": "mg/kg", "value": 15}],
    "results": [{"id": "dosis", "label": "Dosis total", "formula": "peso * dosis_kg", "unit": "mg", "decimals": 0}]})))
S.append(scr("reflexion", "Para pensar",
  "Piensa en la última vez que pasaste junto a un extintor de tu centro. ¿Sabrías decir qué tipo era y si su acceso estaba despejado?", typ="reflection"))
S.append(scr("repaso", "Repaso rápido", "",
  inter("repaso", "flashcards", "Repaso rápido", "Intenta recordar la respuesta antes de darle la vuelta.", {"cards": [
    {"front": "¿Qué extintor usas en un fuego eléctrico?", "back": "El de CO2."},
    {"front": "¿Qué indica la zona verde del manómetro?", "back": "Que el extintor tiene la presión correcta."}]}, scored=False)))
S.append(scr("sopa", "Sopa de letras", "",
  inter("sopa", "word_search", "Encuentra los términos clave", "Toca la primera y la última letra de cada palabra.",
    {"words": ["EXTINTOR", "ALARMA", "HUMO", "EVACUAR", "PRECINTO"]}, scored=False)))
S.append(scr("cruci", "Crucigrama", "",
  inter("cruci", "crossword", "Crucigrama", "Escribe cada palabra a partir de su pista.", {"entries": [
    {"word": "EXTINTOR", "clue": "Equipo para sofocar un conato de incendio"},
    {"word": "ALARMA", "clue": "Aviso que pone en marcha la evacuación"},
    {"word": "HUMO", "clue": "Principal causa de intoxicación en un incendio"},
    {"word": "CONATO", "clue": "Fuego pequeño que aún se puede controlar"},
    {"word": "EVACUAR", "clue": "Desalojar el edificio de forma ordenada"},
    {"word": "PRECINTO", "clue": "Sello que garantiza que el extintor no se ha usado"}]})))
S.append(scr("rosco", "Rosco", "",
  inter("rosco", "az_quiz", "Rosco", "Escribe la respuesta o pasa palabra.", {"items": [
    {"clue": "Aviso que pone en marcha la evacuación", "answer": "Alarma"},
    {"clue": "Fuego pequeño que aún se puede controlar", "answer": "Conato"},
    {"clue": "Equipo para sofocar un conato", "answer": "Extintor"},
    {"clue": "Principal causa de intoxicación en un incendio", "answer": "Humo"},
    {"clue": "Lugar de reunión tras evacuar: punto de…", "answer": "Encuentro"},
    {"clue": "Aparato que indica la presión del extintor", "answer": "Manómetro"},
    {"clue": "Sello que garantiza que el extintor no se ha usado", "answer": "Precinto"}]})))
S.append(scr("destacados", "Antes de usar un extintor",
  "Un extintor portátil se descarga en pocos segundos: hay que saber usarlo antes de necesitarlo.\n\n::: tip\nColócate siempre con el viento a tu espalda y una salida detrás de ti.\n:::\n\n::: warn\nNunca uses agua sobre un fuego eléctrico.\n:::\n\n::: fact\nUn extintor de 6 kg se vacía en unos 15 segundos.\n:::"))
S.append(scr("cifras", "El fuego en cifras",
  "::: stats\n- **15 s** dura la descarga de un extintor de 6 kg\n- **3 min** es lo que tarda un conato en volverse incontrolable\n- **1 de cada 2** víctimas lo es por el humo, no por las llamas\n:::"))
S.append(scr("comparativa", "Agua frente a CO2",
  "::: compare\n### Extintor de agua\n- Para sólidos: madera, papel, tejidos\n- Barato y fácil de recargar\n- Nunca sobre electricidad\n### Extintor de CO2\n- Para fuegos eléctricos\n- No deja residuo\n- Poco eficaz al aire libre\n:::"))
S.append(scr("quehacer", "Ante el humo",
  "::: dodont\n### Qué hacer\n- Avanzar agachado, cerca del suelo\n- Tocar las puertas antes de abrirlas\n- Cerrar las puertas al salir\n### Qué evitar\n- Usar el ascensor\n- Volver a por objetos personales\n- Abrir una puerta caliente\n:::"))
_m = scr("marco", "Actividad: Carmen y la ropa", "Carmen vive en un centro y necesita ayuda para vestirse. Puede elegir su ropa y colaborar si dispone de tiempo.\n\n**¿Qué cambiarías en la forma de atenderla?**")
_m["frame"] = {"color": "#F4C910", "label": "Caso práctico", "icon": "🧪"}
S.append(_m)
S.append(scr("combinado", "Tipos de extintor", "Los extintores se clasifican según el tipo de fuego para el que están indicados.",
  inter("combinado", "accordion", "Tipos de extintor", "Despliega cada apartado.", {"items": [
    {"title": "Extintor de agua", "body": "Fuegos de materiales sólidos (clase A): madera, papel, tejidos."},
    {"title": "Extintor de CO2", "body": "Fuegos eléctricos y de líquidos inflamables (clase B/C) sin dejar residuo."},
    {"title": "Extintor de polvo ABC", "body": "Fuegos de las clases A, B y C; es el más polivalente."}]}, scored=False)))

course = {
  "schema_version": "1.1.0",
  "course": {"id": "guia-marcas", "title": "Guía de marcas", "language": "es"},
  "scorm": {"version": "1.2", "identifier": "GUIA_MARCAS", "title": "Guía de marcas", "mastery_score": 50,
            "rules": {"min_required_screens_pct": 0, "require_interactions": False, "min_score": 50,
                      "attempts_allowed": 0, "score_source": "unit_tests", "navigation": "free", "allow_resume": False}},
  "shell": {"brand": "SCORMEditor", "show_sidebar": True, "show_progress": True, "language": "es"},
  "intro_screens": [],
  "modules": [{"id": "m1", "title": "Marcas", "units": [{"id": "u1", "title": "Ejemplos de marcas", "status": "ok", "screens": S}]}],
}
json.dump(course, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(len(S), 'pantallas ->', OUT)
print(json.dumps([s["id"] for s in S]))
