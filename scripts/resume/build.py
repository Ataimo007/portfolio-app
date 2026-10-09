"""Build the public PDF from the maintained DOCX source (python-docx, reportlab)."""
from pathlib import Path
from xml.sax.saxutils import escape
from docx import Document
from docx.text.paragraph import Paragraph as DocParagraph
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT

root = Path(__file__).resolve().parents[2]
doc = Document(root / 'content/resume/ataimo-edem-resume.docx')
texts = [DocParagraph(p, doc).text.strip() for p in doc.element.body.iter() if p.tag.endswith('}p')]
texts = [t for t in texts if t]
ink, accent = HexColor('#252a30'), HexColor('#2447b9')
body = ParagraphStyle('Body', fontName='Helvetica', fontSize=8, leading=10, textColor=ink, spaceAfter=2)
heading = ParagraphStyle('Section', parent=body, fontName='Helvetica-Bold', fontSize=10, leading=12, textColor=accent, spaceBefore=7, spaceAfter=4, keepWithNext=True)
sub = ParagraphStyle('Title', parent=body, fontName='Helvetica-Bold', fontSize=9, leading=11, spaceBefore=4, keepWithNext=True)
meta = ParagraphStyle('Meta', parent=body, fontSize=8, leading=10, textColor=HexColor('#5b626d'), keepWithNext=True)
name = ParagraphStyle('Name', parent=heading, fontSize=24, leading=27, textColor=ink)
sections = {'EXECUTIVE PROFILE','PROFESSIONAL EXPERIENCE','SELECTED TECHNICAL PROJECTS','TECHNICAL SKILLS','CERTIFICATIONS','EDUCATION'}
titles = {'Customer Success Engineer','Customer Solutions Architect','Azure Developer Support Engineer - Stage 3 (L3)','Azure Developer Support Engineer - Stage 2 (L2)','Mobile and Web Developer','Application and Software Developer','Enterprise Developer Portal Migration Automation','Kubernetes CRD Migration Automation','API Route Collision Analyzer','Tyk Hybrid Docker Environment','Tyk API Key Hashing Utility','Federal University of Technology Minna','API Platforms','Cloud & Containers','Data & Messaging','Security & Identity','Observability','Engineering'}
story=[]
for i,t in enumerate(texts):
 if t == 'ATAIMO EDEM' and i>0: continue
 if t == 'SELECTED PROJECTS & TECHNICAL DEPTH':
  story.append(PageBreak());continue
 if t == 'Azure Developer Support Engineer - Stage 3 (L3)': story.append(PageBreak())
 safe=escape(t)
 if t.startswith('Lagos, Nigeria |'):
  safe = safe.replace(' | LinkedIn | GitHub', '')
  safe += ' | <link href="https://www.linkedin.com/in/ataimo-edem-4780b8160/" color="#2447b9">LinkedIn</link> | <link href="https://github.com/Ataimo007" color="#2447b9">GitHub</link>'
 safe=safe.replace('https://ataimo.com','<link href="https://ataimo.com" color="#2447b9">ataimo.com</link>')
 for mail in ['edemataimo@gmail.com','contact@ataimo.com']:
  safe=safe.replace(mail,f'<link href="mailto:{mail}" color="#2447b9">{mail}</link>')
 if t=='ATAIMO EDEM': style=name
 elif t in sections: style=heading
 elif t in titles or t.startswith('Ataimo Portfolio &'): style=sub
 elif ' | ' in t or ' • ' in t: style=meta
 else: style=body
 if t.startswith('• '): safe=escape(t[2:]);story.append(Paragraph(safe,body,bulletText='•'))
 else: story.append(Paragraph(safe,style))

def footer(canvas, document):
 canvas.setStrokeColor(HexColor('#dcdcd2'));canvas.line(40,32,572,32)
 canvas.setFont('Helvetica',7);canvas.setFillColor(HexColor('#5b626d'))
 canvas.drawString(40,21,'ATAIMO EDEM · ataimo.com · contact@ataimo.com')
 canvas.drawRightString(572,21,str(document.page))

SimpleDocTemplate(str(root/'public/resume/ataimo-edem-resume.pdf'),pagesize=(612,792),leftMargin=40,rightMargin=40,topMargin=30,bottomMargin=44,title='Ataimo Edem — Professional Resume',author='Ataimo Edem').build(story,onFirstPage=footer,onLaterPages=footer)
