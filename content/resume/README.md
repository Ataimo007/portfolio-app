# Downloadable resume

`ataimo-edem-resume-approved.pdf` is the authoritative owner-supplied PDF,
originally named Ataimo_Edem_Resume_2026_Updated.pdf. The public download is an
exact copy at public/resume/ataimo-edem-resume.pdf; it is not reformatted. The owner-requested October 2026 edit removes Gmail
from the contact headline and keeps the remaining contacts centered. All
other rendered pixels, typography, page structure and content are preserved.

Run `python3 scripts/resume/build.py` to republish the approved PDF.

The DOCX is retained as the previous editable version, not the source of the
approved PDF. `--from-docx` explicitly renders that legacy document using
LibreOffice/Carlito and the Python requirements. It can overwrite the public
PDF, so use only when deliberately replacing the approved version.
