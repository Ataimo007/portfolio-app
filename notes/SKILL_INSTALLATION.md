# Design skill installation

Impeccable installed from `pbakaus/impeccable`, path `.agents/skills/impeccable`, using the Codex Skill Installer download method. This bypasses the failing Impeccable universal ZIP endpoint. The prior local profile is preserved in `.codex/skill-backups/impeccable-local`.

Taste installed from `Leonxlnx/taste-skill`, path `skills/taste-skill`, as `.agents/skills/design-taste-frontend`. The original `open-design/taste` repository returned HTTP 404. The local `taste` profile remains as project-specific guidance.

The original `brand-guidelines/core` repository returned HTTP 404. No upstream Brand-Guideline package was installed. The project-owned `.agents/skills/brand-guideline` remains the source of portfolio token rules. Anthropic’s public brand-guidelines skill concerns Anthropic branding and is not a substitute.

These installs add skill files only; they do not install Impeccable editor hooks. User requirements for native animation, monochrome styling, and Tailwind 4 tokens override upstream recommendations.
