# Downloadable resume

`ataimo-edem-resume-approved.pdf` is the authoritative owner-supplied PDF,
originally named Ataimo_Edem_Resume_2026_Updated.pdf. The public download is an
exact copy at public/resume/ataimo-edem-resume.pdf; it is not reformatted. The owner-requested October 2026 edit removes Gmail
from the contact headline and keeps the remaining contacts centered. All
other rendered pixels, typography, page structure and content are preserved.
The October 12 update changes only the headline email to `admin@ataimo.com`
and its mailto hyperlink. Pixel comparison at twice the original resolution
confirms that everything outside that headline row and the entire second page
remain unchanged.

The October 13 correction sets the headline LinkedIn hyperlink to
`https://linkedin.com/in/ataimo-edem-4780b8160` and GitHub to
`https://github.com/Ataimo007`. The education location is
`Minna, Niger State, Nigeria`. The original fonts, sizing, colours and grid
are preserved; all page-one pixels and page-two pixels outside that location
were verified unchanged at twice the original resolution.

Run `python3 scripts/resume/verify.py` with the resume Python requirements
installed to check the exact link destinations and their clickable headline
rectangles, PDF parity, contact privacy and education grid fit. CI runs this
verification before publishing images or deploying changes.

Run `python3 scripts/resume/build.py` to republish the approved PDF.

The DOCX is retained as the previous editable version, not the source of the
approved PDF. `--from-docx` explicitly renders that legacy document using
LibreOffice/Carlito and the Python requirements. It can overwrite the public
PDF, so use only when deliberately replacing the approved version.
