# Maintained résumé

`ataimo-edem-resume.docx` is the editable résumé source. The website serves
`public/resume/ataimo-edem-resume.pdf`. Update the source, then regenerate:

```sh
python3 -m venv /tmp/ataimo-resume-tools
/tmp/ataimo-resume-tools/bin/pip install -r scripts/resume/requirements.txt
/tmp/ataimo-resume-tools/bin/python scripts/resume/build.py
```

The generator preserves the source's employment and project text and produces
an ATS-readable three-page PDF with clickable website/email/social links.
Check pagination and visual rendering after substantive content edits. The
web résumé at `app/resume/page.tsx` also references this platform project.
