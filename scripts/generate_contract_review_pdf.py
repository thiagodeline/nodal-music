from pathlib import Path
import re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, KeepTogether, PageBreak
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs/contratos/sintone-contrato-2026-11-r2.txt'
TARGET=ROOT/'docs/contratos/CONTRATO_SINTONE_2026-11_R2_MINUTA.pdf'
text=SOURCE.read_text(encoding='utf-8')
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DejaVu', font))
pdfmetrics.registerFont(TTFont('DejaVu-Bold',bold))
blue=colors.HexColor('#0646BD')
dark=colors.HexColor('#1E293B')
muted=colors.HexColor('#57677D')
warning=colors.HexColor('#A2482A')
styles={
  'title':ParagraphStyle('title',fontName='DejaVu-Bold',fontSize=17,leading=24,textColor=dark,spaceAfter=13,alignment=TA_LEFT),
  'lead':ParagraphStyle('lead',fontName='DejaVu-Bold',fontSize=9,leading=15,textColor=blue,spaceAfter=18),
  'section':ParagraphStyle('section',fontName='DejaVu-Bold',fontSize=10.4,leading=16,textColor=blue,spaceBefore=16,spaceAfter=9,keepWithNext=True),
  'para':ParagraphStyle('para',fontName='DejaVu',fontSize=8.7,leading=14.4,textColor=dark,spaceAfter=8,alignment=TA_LEFT),
  'caution':ParagraphStyle('caution',fontName='DejaVu-Bold',fontSize=9,leading=14,textColor=warning,spaceAfter=10),
}
sections=text.split('\n\n')
story=[]
for i,raw in enumerate(sections):
    v=' '.join(raw.strip().splitlines()).strip()
    if not v:continue
    v=escape(v)
    if i==0 or v.startswith('CONTRATO DE ADESÃO'):
        story.append(Paragraph(v,styles['title']))
    elif v.startswith('SINTONE — VERSÃO'):
        story.append(Paragraph(v,styles['lead']))
    elif v.startswith('CLÁUSULA ') or v=='QUALIFICAÇÃO DAS PARTES':
        story.append(Paragraph(v,styles['section']))
    elif v.startswith('STATUS DA VERSÃO:'):
        story.append(Paragraph(v,styles['caution']))
    else:
        story.append(Paragraph(v,styles['para']))
def page(canvas,doc):
    canvas.saveState()
    W,H=A4
    canvas.setStrokeColor(blue)
    canvas.setLineWidth(3)
    canvas.line(42,H-35,W-42,H-35)
    canvas.setFont('DejaVu-Bold',7.8);canvas.setFillColor(blue)
    canvas.drawString(43,H-51,'SINTONE  /  CONTRATO DE DISTRIBUIÇÃO')
    canvas.setFillColor(muted);canvas.setFont('DejaVu',7.4)
    canvas.drawRightString(W-44,28,f'Minuta R2  •  Página {doc.page}')
    canvas.setFillColor(colors.Color(.7,.2,.1,alpha=.1))
    canvas.setFont('DejaVu-Bold',38)
    canvas.translate(W/2,H/2)
    canvas.rotate(35)
    canvas.drawCentredString(0,0,'MINUTA PARA REVISÃO')
    canvas.restoreState()
doc=SimpleDocTemplate(str(TARGET),pagesize=A4,rightMargin=45,leftMargin=45,topMargin=70,bottomMargin=49,title='SINTONE - Contrato de Distribuição - Minuta 2026.11-R2',author='SINTONE - Minuta preliminar')
doc.build(story,onFirstPage=page,onLaterPages=page)
# Pré-voo: todas as páginas e cláusulas precisam estar presentes e extraíveis.
import pymupdf
pdf=pymupdf.open(str(TARGET))
extracted='\\n'.join(p.get_text() for p in pdf)
for mark in ('CLÁUSULA 1', 'CLÁUSULA 8', 'CLÁUSULA 14', '75%', '25%', 'FIM DO CONTRATO'):
    if mark not in extracted:
        raise RuntimeError('Texto ausente no PDF: '+mark)
if pdf.page_count<4 or TARGET.stat().st_size<10000:
    raise RuntimeError('PDF incompleto ou inesperadamente pequeno')
print('PDF_GERADO',TARGET,'PAGINAS',pdf.page_count,'BYTES',TARGET.stat().st_size,'SECOES',len(story))

