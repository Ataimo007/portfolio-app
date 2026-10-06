# Ataimo app identity

The AE monogram extends the existing portfolio header identity. Its geometric letterforms use the current brand tokens: cobalt `--color-accent-primary` (#2447b9) and ivory `--color-bg-base` (#f5f3ed). The export embeds those palette values so it works independently of site CSS.

- `ataimo-app-logo.svg`: editable vector master, 512×512.
- `ataimo-app-logo.png`: 512×512 PNG for app branding.
- `ataimo-google-logo.png`: 120×120 PNG for Google Auth Platform upload.

PNG assets were rendered deterministically from the vector master using Sharp. These are original project assets, not third-party provider marks. Preserve proportions and use the existing approved palette. Both sizes are comfortably below Google's 1 MB upload limit.

Google configuration: app name **Ataimo Edem**, homepage `https://ataimo.com`, privacy `https://ataimo.com/privacy`, terms `https://ataimo.com/terms`, authorized domain `ataimo.com`. This logo matches the portfolio's AE identity.
