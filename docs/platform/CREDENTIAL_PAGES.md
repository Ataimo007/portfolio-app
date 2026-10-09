# Credential presentation — 2026-10-09

The owner-supplied Ataimo_Edem_Resume_2026_Updated.pdf is the approved two-page
resume. Both content/resume/ataimo-edem-resume-approved.pdf and the public PDF
are byte-identical to the supplied file. Default resume publishing copies the
approved PDF; regenerating the legacy DOCX requires explicit --from-docx.

/resume cards link to /certifications/{slug} for four Microsoft credentials.
Cards use month/year issue labels. Detail pages use exact earned dates,
credential IDs and certification numbers transcribed from the supplied text
and image.png through image4.png. Skills measured also come from those images.

The layout is an original portfolio credential record, not a fabricated issuer
certificate. It uses Microsoft-published credential-level badges, factual award
information, holder name, issuer and a public certification description link.
It does not publish the screenshots, expiry fields or active-validity labels.
No current validity or independent live verification is asserted.

The warm-paper/cobalt theme, semantic description lists, wrapping identifiers,
responsive badge/detail layout and internal back/related links support desktop,
mobile and keyboard navigation. The local Impeccable, Taste and Brand Guideline
profiles informed the layout. Shared theme tokens supply styling.

Deployment verification: commit 7c36257 was deployed by successful GitHub Actions
run 37920903934, with 78 tests passing. Application and worker pods were Ready
and migrations completed. The live downloadable PDF has SHA-256
02c6d44d99d4a44a3855c78246d3ab8baf0ed48549d8c152ffbdcd4b7f515f05,
matching the owner-supplied file. Live Chromium captures at 1440px and 390px
showed no horizontal overflow; desktop and mobile credential layouts were
visually reviewed. These checks verify presentation and deployment, not current
certification validity.
