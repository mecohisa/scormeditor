"""Genera docs/guia-marcas-para-autores.docx a partir del .md (fuente única).

    python scripts/guia-marcas/build_docx.py <carpeta_capturas> [salida.docx]

El .md admite, además de markdown básico (#..####, párrafos, listas «- », tablas,
bloques ``` y **negrita**/`código` en línea), dos comentarios propios que no se ven
al leerlo en texto:
    <!-- tipo: ETIQUETA | tipo interno -->   banda de color bajo el título de la marca
    <!-- captura: nombre | pie -->            imagen <carpeta_capturas>/<nombre>.png
Las capturas se generan con make_course.py + shoot.mjs (ver README.md de esta carpeta).
Para el PDF: docx2pdf (usa Word).
"""
import re, sys, os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'docs', 'guia-marcas-para-autores.md')
SHOTS = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'docs', 'guia-marcas-para-autores.docx')

TEAL = RGBColor(0x1F, 0x8A, 0x84)
INK = RGBColor(0x1F, 0x29, 0x37)
GREY = RGBColor(0x6B, 0x72, 0x80)
BANDS = {  # etiqueta -> color de la banda
    'CORTE': '8A94A6', 'INFORMATIVA': '6DC3C0', 'EVALUABLE': 'E9A93B', 'SIN NOTA': '9C8FD0',
    'REPASO': '6F9FD8', 'DESTACADO': 'D9849C', 'SOLO EN EL EDITOR': 'C96B6B',
}
FONT = 'Segoe UI'
MONO = 'Consolas'

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.2)
sec.top_margin, sec.bottom_margin = Cm(2), Cm(2)
WIDTH = Cm(21 - 4.4)

st = doc.styles['Normal']
st.font.name = FONT; st.font.size = Pt(10.5); st.font.color.rgb = INK
st.element.rPr.rFonts.set(qn('w:eastAsia'), FONT)
st.paragraph_format.space_after = Pt(6); st.paragraph_format.line_spacing = 1.15
for name, size, color in (('Heading 1', 17, INK), ('Heading 2', 13, TEAL), ('Heading 3', 12.5, INK)):
    h = doc.styles[name]; h.font.name = FONT; h.font.size = Pt(size); h.font.bold = True
    h.font.color.rgb = color; h.element.rPr.rFonts.set(qn('w:asciiTheme'), '') if False else None
    rf = h.element.rPr.rFonts; rf.set(qn('w:ascii'), FONT); rf.set(qn('w:hAnsi'), FONT)
    for a in ('w:asciiTheme', 'w:hAnsiTheme'):
        if rf.get(qn(a)) is not None: del rf.attrib[qn(a)]
    h.paragraph_format.space_before = Pt(18 if name == 'Heading 1' else 14)
    h.paragraph_format.space_after = Pt(6); h.paragraph_format.keep_with_next = True

# Pie de página
fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run('SCORMEditor · Guía de marcas para autores · '); r.font.size = Pt(8); r.font.color.rgb = GREY
def field(par, instr):
    run = par.add_run(); run.font.size = Pt(8); run.font.color.rgb = GREY
    for t, v in (('begin', None), ('instr', instr), ('end', None)):
        if t == 'instr':
            e = OxmlElement('w:instrText'); e.set(qn('xml:space'), 'preserve'); e.text = v
        else:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), t)
        run._r.append(e)
field(fp, 'PAGE')

def shade(el, hex_):
    pr = el.get_or_add_pPr() if hasattr(el, 'get_or_add_pPr') else el.get_or_add_tcPr()
    shd = OxmlElement('w:shd'); shd.set(qn('w:val'), 'clear'); shd.set(qn('w:color'), 'auto'); shd.set(qn('w:fill'), hex_)
    pr.append(shd)

def inline(par, text, size=None, color=None):
    # **negrita**, `código`, *cursiva*
    for tok in re.split(r'(\*\*[^*]+\*\*|`[^`]+`)', text):
        if not tok: continue
        if tok.startswith('**'):
            r = par.add_run(tok[2:-2]); r.bold = True
        elif tok.startswith('`'):
            r = par.add_run(tok[1:-1]); r.font.name = MONO; r.font.color.rgb = RGBColor(0x9A, 0x34, 0x12)
            r.font.size = Pt((size or 10.5) - 0.5)
        else:
            r = par.add_run(tok)
        if size and not tok.startswith('`'): r.font.size = Pt(size)
        if color is not None: r.font.color.rgb = color

def keep_rows(t):
    for row in t.rows:
        trPr = row._tr.get_or_add_trPr(); e = OxmlElement('w:cantSplit'); trPr.append(e)
        for c in row.cells:
            for p in c.paragraphs: p.paragraph_format.keep_with_next = True

def code_block(lines):
    sp = doc.add_paragraph(); sp.paragraph_format.space_after = Pt(0); sp.paragraph_format.keep_with_next = True
    sp.paragraph_format.line_spacing = Pt(4)
    t = doc.add_table(rows=1, cols=1); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = t.cell(0, 0); shade(c._tc, 'F3F4F6')
    c.paragraphs[0].text = ''
    for i, ln in enumerate(lines):
        p = c.paragraphs[0] if i == 0 else c.add_paragraph()
        p.paragraph_format.space_after = Pt(0); p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.keep_with_next = True
        r = p.add_run(ln if ln else ' '); r.font.name = MONO; r.font.size = Pt(9)
        r._element.rPr.rFonts.set(qn('w:hAnsi'), MONO)
        if re.match(r'^\{\{/?[^}]+\}\}$', ln.strip()):
            r.font.color.rgb = TEAL; r.bold = True
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

def band(label, internal):
    t = doc.add_table(rows=1, cols=1); c = t.cell(0, 0)
    shade(c._tc, BANDS.get(label, '8A94A6'))
    p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after = Pt(0)
    r = p.add_run(label); r.bold = True; r.font.size = Pt(8.5); r.font.color.rgb = RGBColor(255, 255, 255)
    p2 = doc.add_paragraph(); p2.paragraph_format.space_before = Pt(3); p2.paragraph_format.keep_with_next = True
    inline(p2, 'Tipo interno en el curso: `' + internal + '`' if not internal.startswith(('no ', 'pantalla', 'bloque')) else 'Tipo interno en el curso: ' + internal, size=8.5, color=GREY)

def image(name, caption):
    path = os.path.join(SHOTS, name + '.png')
    if not os.path.exists(path):
        print('FALTA captura', name); return
    from PIL import Image
    w, h = Image.open(path).size
    width = Cm(14.5)
    if h / w * 14.5 > 9.5: width = Cm(9.5 * w / h)  # limitar la altura
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True; p.paragraph_format.space_before = Pt(4)
    p.add_run().add_picture(path, width=width)
    cp = doc.add_paragraph(); cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = cp.add_run('Vista estudiante — ' + caption); r.italic = True; r.font.size = Pt(8.5); r.font.color.rgb = GREY

def table(rows):
    # Sin emojis: Word incrusta la fuente Segoe UI Emoji entera (~4 MB) en el PDF.
    rows = [re.sub('[🀀-🿿☀-⛿️ℹ]', '', r) for r in rows]
    rows = [[c.strip() for c in r.strip().strip('|').split('|')] for r in rows if not re.match(r'^\|[-|\s]+\|$', r.strip())]
    t = doc.add_table(rows=len(rows), cols=len(rows[0])); t.style = 'Table Grid'
    for i, row in enumerate(rows):
        for j, txt in enumerate(row):
            c = t.cell(i, j); c.paragraphs[0].text = ''
            if i == 0: shade(c._tc, 'E6F4F3')
            inline(c.paragraphs[0], ('**' + txt + '**') if i == 0 else txt, size=9.5)
    keep_rows(t)
    for c in t.rows[-1].cells:
        for p in c.paragraphs: p.paragraph_format.keep_with_next = False
    doc.add_paragraph().paragraph_format.space_after = Pt(2)

# ---------- Portada ----------
lines = open(SRC, encoding='utf8').read().split('\n')
title = lines[0].lstrip('# ').strip()
p = doc.add_paragraph(); p.paragraph_format.space_before = Cm(5)
r = p.add_run('SCORMEditor'); r.bold = True; r.font.size = Pt(14); r.font.color.rgb = TEAL
p = doc.add_paragraph(); r = p.add_run(title); r.bold = True; r.font.size = Pt(30)
p = doc.add_paragraph(); r = p.add_run('Cómo pedir, directamente desde tu documento, una diapositiva exacta, '
    'el tipo concreto de interactividad o un bloque destacado en cada punto del curso.')
r.font.size = Pt(13); r.font.color.rgb = GREY
p.paragraph_format.space_after = Pt(24)

i = 1; first_h2 = True
para = []
def flush():
    global para
    if para:
        text = ' '.join(s.strip() for s in para)
        if text.startswith('> '):
            p = doc.add_paragraph(); inline(p, text.replace('> ', ''), size=9, color=GREY); p.runs and None
            for r in p.runs: r.italic = True
        else:
            p = doc.add_paragraph(); inline(p, text)
    para = []

while i < len(lines):
    ln = lines[i]
    m = re.match(r'^<!-- (tipo|captura): (.*?) \| (.*?) -->$', ln.strip())
    if m:
        flush()
        (band if m.group(1) == 'tipo' else image)(m.group(2).strip(), m.group(3).strip())
        i += 1; continue
    if ln.startswith('```'):
        flush(); j = i + 1; block = []
        while not lines[j].startswith('```'): block.append(lines[j]); j += 1
        code_block(block); i = j + 1; continue
    if ln.startswith('|'):
        flush(); block = []
        while i < len(lines) and lines[i].startswith('|'): block.append(lines[i]); i += 1
        table(block); continue
    hm = re.match(r'^(#{2,4}) (.*)$', ln)
    if hm:
        flush(); lvl = len(hm.group(1)) - 1
        if lvl == 1:
            doc.add_page_break()
        h = doc.add_heading(level=lvl); inline(h, hm.group(2))
        if lvl == 3:
            for r in h.runs: r.font.name = MONO; r.font.color.rgb = TEAL
        i += 1; continue
    if ln.startswith('- '):
        flush(); item = [ln[2:]]; i += 1
        while i < len(lines) and lines[i].startswith('  ') and lines[i].strip(): item.append(lines[i].strip()); i += 1
        p = doc.add_paragraph(style='List Bullet'); inline(p, ' '.join(item)); p.paragraph_format.space_after = Pt(3)
        continue
    if not ln.strip():
        flush(); i += 1; continue
    para.append(ln); i += 1
flush()

# ---------- Paginación: cada apartado entero en una página ----------
# Cada encabezado abre un grupo (título, banda, texto, código, captura y pie). Todos sus
# párrafos (también los de dentro de las tablas) llevan «conservar con el siguiente»
# salvo el último, así Word salta de página antes que partir el apartado. Un encabezado
# de sección (##/###) se pega además al primer apartado que le sigue. Si un grupo no
# cabe en una página, Word lo parte igualmente (no hay alternativa).
from docx.text.paragraph import Paragraph
def _heading_level(p):
    ps = p.find(qn('w:pPr') + '/' + qn('w:pStyle'))
    v = ps.get(qn('w:val')) if ps is not None else ''
    m = re.match(r'Heading(\d)', v or '')
    return int(m.group(1)) if m else 0
def _is_break(p):
    return any(br.get(qn('w:type')) == 'page' for br in p.iter(qn('w:br')))
groups = [[]]
for el in doc.element.body.iterchildren():
    if el.tag == qn('w:p'):
        if _is_break(el): groups.append([]); continue
        if _heading_level(el): groups.append([])
        groups[-1].append(el)
    elif el.tag == qn('w:tbl'):
        for tr in el.iter(qn('w:tr')):
            trPr = tr.find(qn('w:trPr'))
            if trPr is None: trPr = OxmlElement('w:trPr'); tr.insert(0, trPr)
            if trPr.find(qn('w:cantSplit')) is None: trPr.append(OxmlElement('w:cantSplit'))
        groups[-1].append(el)
groups = [g for g in groups if g]
for gi, g in enumerate(groups):
    paras = []
    for el in g:
        paras.extend([el] if el.tag == qn('w:p') else list(el.iter(qn('w:p'))))
    lvl = _heading_level(g[0]) if g[0].tag == qn('w:p') else 0
    nxt = groups[gi + 1][0] if gi + 1 < len(groups) else None
    glue_last = lvl in (1, 2) and nxt is not None and nxt.tag == qn('w:p') and _heading_level(nxt) > lvl
    for k, p in enumerate(paras):
        pf = Paragraph(p, doc).paragraph_format
        pf.keep_together = True
        pf.keep_with_next = glue_last or k < len(paras) - 1

doc.core_properties.title = title
doc.core_properties.author = 'SCORMEditor'
doc.save(OUT)
print('OK ->', OUT)
