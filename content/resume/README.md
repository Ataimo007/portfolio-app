# Maintained résumé

`ataimo-edem-resume.docx` is the editable résumé source. The website serves
`public/resume/ataimo-edem-resume.pdf`. Update the source, then regenerate with LibreOffice Writer and Carlito fonts
(included in the dev container):

```sh
python3 -m venv /tmp/ataimo-resume-tools
/tmp/ataimo-resume-tools/bin/pip install -r scripts/resume/requirements.txt
/tmp/ataimo-resume-tools/bin/python scripts/resume/build.py
```

The generator preserves the source's employment and project text and produces
a styled three-page PDF retaining the original navy/teal panels and typography.
Public web contact uses contact@ataimo.com; the PDF retains Gmail as secondary.
Check pagination and visual rendering after substantive content edits. The
web résumé at `app/resume/page.tsx` also references this platform project.

The exporter adds verified PDF URI annotations for website, email and social
labels after conversion, so links remain clickable across LibreOffice versions.
