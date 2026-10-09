"""Render the styled DOCX through LibreOffice, preserving its document layout."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import pymupdf

root = Path(__file__).resolve().parents[2]
source = root / 'content/resume/ataimo-edem-resume.docx'
renderer = shutil.which('libreoffice') or shutil.which('soffice')
if not renderer:
    raise SystemExit('Install LibreOffice Writer and Calibri-compatible Carlito fonts before generating the resume.')
with tempfile.TemporaryDirectory(prefix='ataimo-resume-') as directory:
    output = Path(directory)
    subprocess.run([renderer, '-env:UserInstallation=' + (output / 'profile').as_uri(), '--headless', '--convert-to', 'pdf:writer_pdf_Export', '--outdir', directory, str(source)], check=True, timeout=120)
    pdf = output / (source.stem + '.pdf')
    if not pdf.exists():
        raise SystemExit('Resume conversion produced no PDF')
    links = {
        'ataimo.com': 'https://ataimo.com',
        'LinkedIn': 'https://www.linkedin.com/in/ataimo-edem-4780b8160/',
        'GitHub': 'https://github.com/Ataimo007',
        'contact@ataimo.com': 'mailto:contact@ataimo.com',
        'edemataimo@gmail.com': 'mailto:edemataimo@gmail.com',
    }
    with pymupdf.open(pdf) as document:
        for page in document:
            existing = {link.get('uri') for link in page.get_links()}
            for word in page.get_text('words'):
                label = word[4]
                if label in links and links[label] not in existing:
                    page.insert_link({'kind': pymupdf.LINK_URI, 'from': pymupdf.Rect(word[:4]), 'uri': links[label]})
        document.save(root / 'public/resume/ataimo-edem-resume.pdf', garbage=4, deflate=True)
