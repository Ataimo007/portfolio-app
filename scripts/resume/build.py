"""Render the styled DOCX through LibreOffice, preserving its document layout."""
from pathlib import Path
import shutil
import subprocess
import tempfile

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
    shutil.copyfile(pdf, root / 'public/resume/ataimo-edem-resume.pdf')
