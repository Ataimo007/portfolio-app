# Ataimo Edem — Personal Portfolio Website Master Plan

**Project working name:** `ataimoedem.com`  
**Owner:** Ataimo Edem  
**Primary implementation agent:** Codex  
**Target deployment:** Vercel  
**Source repository suggestion:** `Ataimo007/ataimoedem.com`

---

## 1. Product vision

Build a premium, production-quality personal technical brand site for Ataimo Edem.

The website must **not** feel like a CV converted to HTML or a generic developer portfolio template. It should present Ataimo as a customer-facing technical engineer and solutions architect who specialises in:

- API Management
- Solutions Architecture
- Customer Engineering / Customer Success Engineering
- Kubernetes and cloud-native platforms
- Enterprise integrations
- API security and identity
- Complex production troubleshooting
- Migration, upgrade and platform-evolution work
- Building practical engineering tools to solve recurring customer/platform problems

The experience should combine:

**enterprise technology + cloud infrastructure + interactive architecture + premium personal brand + useful 3D visualisation**

The site must remain fast, accessible and understandable even when all animation/WebGL is disabled.

---

## 2. Primary objectives

The site should help a recruiter, hiring manager, technical leader or potential collaborator answer these questions quickly:

1. Who is Ataimo and what does he specialise in?
2. What kinds of enterprise technical problems does he solve?
3. How deep is his hands-on engineering experience?
4. What progression has he made from software engineering → Azure support → architecture → customer engineering?
5. What has he actually built?
6. Can I inspect technical evidence of his work?
7. Can I download his resume and contact him easily?

The site must materially strengthen applications for roles such as:

- Customer Success Engineer
- Senior Customer Success Engineer
- Solutions Engineer
- Senior Solutions Engineer
- Solutions Architect
- Customer Engineer
- Technical Account Manager
- Professional Services / Technical Consultant
- API / Integration Architect

---

## 3. Personal identity and contact information

### Name
**Ataimo Edem**

### Professional headline
**Customer Success Engineer | API Management & Solutions Architecture | Kubernetes & Cloud | Enterprise SaaS | Azure • AWS • GCP**

### Hero positioning
**I design, troubleshoot and evolve enterprise API platforms.**

### Supporting hero copy
**Customer Success Engineer specialising in API Management, Solutions Architecture, Kubernetes, Cloud and enterprise integrations.**

### Public profile links

- LinkedIn: https://www.linkedin.com/in/ataimo-edem-4780b8160/
- GitHub: https://github.com/Ataimo007
- Email: edemataimo@gmail.com
- Email URI: mailto:edemataimo@gmail.com

### Phone

- Display: +234 816 0594 893
- Tel URI: tel:+2348160594893

**Privacy rule:** keep the phone available in source content and downloadable resume, but do **not** publish it on the website by default. Public contact should use email, LinkedIn, GitHub and the contact form unless Ataimo explicitly changes this rule.

### Location
**Lagos, Nigeria**

---

## 4. Brand and visual direction

The existing LinkedIn banner in `assets/branding/linkedin-banner.png` is a visual reference, not a layout template.

### Design character

- Premium enterprise technology
- Technical, architectural and precise
- Dark, polished and cinematic
- Modern without looking like a gaming site
- High visual depth without compromising readability
- 3D used to explain technical systems, not as decoration for its own sake

### Colour system

Suggested tokens:

- `#07111F` — primary background
- `#0D1B2A` — elevated surface
- `#EAF4FF` — primary text
- `#45C6FF` — cyan accent
- `#FF9A4D` — warm accent
- `#8CA3B8` — muted text

Use semantic design tokens rather than scattering raw colours through components.

### Typography

- Primary: Geist Sans
- Technical/code: Geist Mono

### Logo/mark

Use a minimal **AE** monogram if a mark is needed. Keep it geometric and architectural. Do not delay the first build on custom logo design.

---

## 5. Core navigation

Primary navigation:

- Home
- About
- Experience
- Projects
- Expertise
- Resume
- Contact

Persistent CTA:

**Download Resume**

Do not launch an empty blog. Add a **Writing** section later only when there is real content to publish.

---

## 6. Home page

### 6.1 Hero

Display:

**ATAIMO EDEM**

**I design, troubleshoot and evolve enterprise API platforms.**

Supporting copy:

**Customer Success Engineer specialising in API Management, Solutions Architecture, Kubernetes, Cloud and enterprise integrations.**

Primary CTAs:

- Explore My Work
- View Resume
- Contact Me

Capability labels:

- API Management
- Solutions Architecture
- Cloud & Kubernetes
- Customer Engineering

Important text must remain semantic HTML outside the WebGL canvas.

---

## 7. Signature 3D hero concept

The hero should visualise an abstract but technically meaningful API/cloud architecture.

### Core topology

At the centre:

**API Gateway**

Surrounding infrastructure domains:

- Cloud
- Kubernetes
- Services
- Identity & Security
- Data
- Observability

Animated request/data flows should travel through the gateway and activate related nodes.

Examples:
- request enters API Gateway;
- identity/security flow validates/authenticates;
- traffic reaches services/containers;
- service accesses data/cache/message system;
- observability signals branch to telemetry nodes.

### Interaction

- subtle pointer-based camera/parallax movement;
- no aggressive rotation;
- no scroll hijacking;
- animation should never prevent reading;
- scroll progression may reveal architecture layers, but normal page scrolling remains intact.

### Scroll narrative

Suggested progression:

1. API Gateway
2. Architecture
3. Cloud Native
4. Security & Identity
5. Customer Engineering

As the last state completes, visually transition into normal page content.

### Fallback

Provide:
- reduced-complexity mobile WebGL;
- low-power fallback;
- static/SVG fallback when WebGL is unavailable;
- `prefers-reduced-motion` support.

The site must remain fully functional without WebGL.

---

## 8. Home — professional introduction

Section headline:

**Engineering depth. Architecture perspective. Customer ownership.**

Body copy:

> I work at the intersection of enterprise customers, complex infrastructure and API platforms. My work combines hands-on engineering, architecture guidance, production troubleshooting and customer advocacy across cloud, Kubernetes and hybrid environments.
>
> At Tyk, I support enterprise customers across EMEA throughout the post-sales lifecycle — from architecture and implementation through production troubleshooting, upgrades, migrations, observability and long-term platform evolution.

CTA:

**About Me →**

---

## 9. About page

Use `assets/portrait/ataimo-portrait-4x5.webp` as the primary portrait.

Opening copy:

> **I started as a software engineer. I learned cloud by troubleshooting production systems. I moved into architecture by helping customers design them. Today, I bring those disciplines together in Customer Engineering.**

Represent career evolution visually:

**Software Development**  
↓  
**Azure Support Engineering**  
↓  
**API & Cloud Architecture**  
↓  
**Customer Solutions Architecture**  
↓  
**Customer Success Engineering**

### Education

**Federal University of Technology Minna**  
Bachelor's degree, Computer Engineering  
2012–2018

### Portrait behaviour

Use tasteful depth/parallax or subtle mask/reveal animation. Do not distort the portrait or create novelty 3D effects around the person.

---

## 10. Experience page

Use a premium animated timeline with expandable role detail.

Each role should contain:

- role title
- company
- dates
- location/work mode when useful
- concise one-line purpose
- 3–6 major impact/ownership themes
- technologies / technical domains

Do not copy every CV bullet verbatim.

### Verified chronology

#### Tyk — Customer Success Engineer
**July 2025 – Present**

Purpose:

> Own the technical success of enterprise customers across EMEA, acting as a trusted post-sales technical advisor for the architecture, deployment, operation and evolution of API Management platforms.

Highlight modules:

**Architecture & Scale**  
High availability, hybrid and multi-data-centre API architectures.

**Production Engineering**  
Complex L2/L3 troubleshooting spanning APIs, Kubernetes, networking, databases, caching, messaging and distributed systems.

**Security & Identity**  
OAuth 2.0, OIDC, JWT, mTLS and enterprise identity/security patterns.

**Platform Evolution**  
Upgrade planning, migration strategy, compatibility analysis and production risk assessment.

**Product Collaboration**  
Root-cause analysis, defect validation, feature requirements and customer feedback with Product and Engineering.

**Customer Enablement**  
Technical workshops, architecture reviews, implementation guidance and long-term adoption.

---

#### Tyk — Customer Solutions Architect
**December 2021 – July 2025**

Purpose:

> Worked directly with enterprise engineering teams to translate API, infrastructure and security requirements into deployable API Management architectures.

Highlight modules:

**Technical Discovery**  
Requirements across APIs, identity, networking, infrastructure and integrations.

**Solution Design**  
API Management architecture across Kubernetes, cloud and hybrid environments.

**Implementation**  
Onboarding, deployment patterns, authentication, platform integration and troubleshooting.

**Customer Workshops**  
Architecture reviews, technical enablement and implementation guidance.

**Cross-functional Delivery**  
Customer Success, Support, Product and Engineering collaboration.

---

#### Tek Experts — Azure Developer Support Engineer Stage 3
**October 2021 – January 2022**

Show explicit progression from Stage 2.

Position the role around:
- escalation ownership;
- Azure API Management;
- Azure Resource Manager;
- Azure Policy / Blueprint;
- Azure Lighthouse;
- Managed Applications;
- Cloud Services / Batch;
- APIM VNet and identity integrations;
- certificate authentication and APIM policy development;
- ARM templates, Blueprints and PowerShell;
- training/enabling Stage 2 engineers.

---

#### Tek Experts — Azure Developer Support Engineer Stage 2
**September 2019 – October 2021**

Position around:
- Azure customer troubleshooting;
- root-cause analysis;
- cloud/network/application dependencies;
- incident ownership;
- escalation collaboration;
- customer communication.

Use a visual progression such as:

**Stage 2 — Cloud troubleshooting & customer support**  
↓ promotion  
**Stage 3 — Escalation ownership & engineer enablement**

---

#### Klex Global Resources — Mobile and Web Developer
**October 2018 – October 2019**

Keep concise.

Focus on:
- Flutter and native Android/Java;
- REST APIs;
- JSON client/server communication;
- web development;
- application publication.

---

#### Logic Gate Ventures — Application and Software Developer
**March 2016 – December 2016**

Keep concise.

Focus on:
- HTML/CSS/JavaScript;
- PHP/MySQL;
- JavaFX/FXML;
- desktop application development;
- AnyLogic simulation/model work.

---

## 11. Projects

Projects are central to the website and should provide evidence that Ataimo does more than advise customers — he identifies technical problems and builds practical solutions.

Main project index should feature five projects.

### Portfolio order

1. Enterprise Developer Portal Migration Automation
2. Kubernetes CRD Migration Automation
3. API Route Collision Analyzer
4. Hybrid API Gateway Development Environment
5. API Key Hashing & Diagnostic Utility

Use links and descriptions from `content/PROJECTS.md`.

---

## 12. Flagship case study — EDP Migration

Route suggestion:

`/projects/edp-migration`

Title:

**Enterprise Developer Portal Migration Automation**

Opening copy:

> An end-to-end migration platform for moving Tyk Classic Developer Portal environments to Enterprise Developer Portal while preserving existing API keys and developer login credentials.

### Problem framing

Classic Portal and EDP use different data models and Tyk does not ship a built-in migration path that preserves existing developer access.

The project should communicate the operational consequence of a naive migration:

- key rotation;
- credential redistribution;
- developer account recreation;
- integration breakage;
- poor rollback/recovery options.

### Migration visual

Create an animated architecture/process visual:

**Classic Portal**  
→ Discovery  
→ Backup  
→ Dry-run Plan  
→ Migration  
→ Reconciliation  
→ Cutover  
→ **EDP**

### Differentiators

- API key preservation/adoption
- Developer login credential continuity
- Dry-run planning
- Idempotency
- Append-only migration ledger/auditability
- Rollback
- Controlled cutover
- Delayed/safe decommissioning
- Web wizard + CLI using the same underlying Go logic

### Source visibility

Label clearly:

**Private source · Public PoC available**

Public PoC:
https://github.com/Ataimo007/edp-migration-poc

Never imply that the private source repository is public.

---

## 13. CRD Migration case study

Route suggestion:

`/projects/crd-migration`

Title:

**Kubernetes CRD Migration Automation**

Visual:

**Kubernetes Cluster A**  
→ Discovery / Backup / Transform / Restore  
→ **Kubernetes Cluster B**

Example resource labels:

- ApiDefinition
- SecurityPolicy
- OperatorContext
- PortalConfig
- other supported Tyk CRDs

Repository:
https://github.com/Ataimo007/tyk-crd-migration

Technologies:
Kubernetes • kubectl • Bash • Tyk Operator • CRDs • Automation

---

## 14. API Route Collision Analyzer case study

Route suggestion:

`/projects/route-collision-analyzer`

Title:

**API Route Collision Analyzer**

Core story:

**Recurring troubleshooting problem → repeatable diagnostic tool**

Use a terminal-style interactive presentation showing:

- duplicate route groups;
- domain + listen path;
- API name / ID;
- strict vs broad match modes;
- output options: table / JSON / CSV;
- CI-oriented execution.

Repository:
https://github.com/Ataimo007/tyk-dup-listen-path-checker

---

## 15. Hybrid API Gateway case study

Route suggestion:

`/projects/hybrid-api-gateway`

Title:

**Hybrid API Gateway Development Environment**

Architecture visual:

**Remote Control Plane / MDCB**  
↓  
**Gateway** ↔ **Redis**  
**Pump** → analytics

Repository:
https://github.com/Ataimo007/tyk-hybrid-docker

Positioning:

> A lightweight and repeatable Docker environment for developing, testing and troubleshooting Tyk Hybrid deployments.

---

## 16. Hashing utility case study

Route suggestion:

`/projects/api-key-hashing`

Title:

**API Key Hashing & Diagnostic Utility**

Visual flow:

`API Key / Token`  
→ Hash Algorithm  
→ SHA-256 / Murmur32 / Murmur64 / Murmur128  
→ Hashed representation

Repository:
https://github.com/Ataimo007/tyk-hashing

Keep this case study smaller than the EDP and Kubernetes projects.

---

## 17. Expertise page / section

Do not use skill-percentage bars.

Build an interactive **technical constellation** with four meaningful clusters.

### API & Integration

- Tyk
- REST
- GraphQL
- OpenAPI
- API Gateway
- Developer Portals

### Cloud & Platform

- Kubernetes
- Helm
- Docker
- OpenShift
- Azure
- AWS
- GCP

### Identity & Security

- OAuth 2.0
- OIDC
- JWT
- mTLS
- SAML
- Certificate Authentication

### Data & Observability

- Redis
- PostgreSQL
- MongoDB
- Kafka
- OpenTelemetry
- Prometheus

Interaction should answer:

**Where / how does Ataimo use this?**

rather than showing arbitrary proficiency percentages.

---

## 18. Resume page

Route:

`/resume`

Do not simply embed the PDF.

Create a semantic web resume containing:

- professional summary;
- experience;
- projects;
- technical expertise;
- certifications;
- education.

Primary CTA:

**Download PDF**

Production path:

`/resume/ataimo-edem-resume.pdf`

Source file:

`assets/resume/Ataimo_Edem_Professional_Resume.pdf`

---

## 19. Contact page

Headline:

**Let’s build something that solves a difficult problem.**

Public channels:

- Email: edemataimo@gmail.com
- LinkedIn: https://www.linkedin.com/in/ataimo-edem-4780b8160/
- GitHub: https://github.com/Ataimo007

Contact form fields:

- Name
- Email
- Company
- Message

Phone exists in source content but should not be displayed publicly by default.

### Contact-form implementation

Use a server-side route or server action suitable for Vercel. Keep provider-specific logic abstracted so an email provider such as Resend can be connected later without changing the form UI.

Until a provider/key is configured, development mode may use a safe stub that clearly reports that sending is not configured. Never ship a fake-success form to production.

---

## 20. Footer

Keep minimal:

**Ataimo Edem**  
API Management · Solutions Architecture · Customer Engineering

Links:

GitHub · LinkedIn · Email

Copyright:

`© Ataimo Edem`

---

## 21. Animation strategy

### Heavy 3D / interactive visualisation

Use only where it adds meaning:

- home hero architecture;
- technical constellation;
- project architecture visualisations.

### Light motion

Use throughout for:

- navigation;
- card transitions;
- role timeline;
- text/section reveals;
- project cards;
- terminal simulations;
- hover/focus/tap micro-interactions.

### Rules

Do not use:

- scroll hijacking;
- 10-second cinematic introductions;
- constant spinning objects;
- huge looping video backgrounds;
- perpetual particle noise;
- animation that delays access to content.

Every page must make sense in a static state.

---

## 22. Higgsfield role

Treat Higgsfield as an **asset/concept studio**, not as the website runtime.

Potential uses:

- concept frames for the hero topology;
- motion references;
- short ambient loops when genuinely valuable;
- Open Graph/social visual concepts;
- 3D asset experimentation.

Final interactive website should remain implemented in code with Three.js / React Three Fiber.

Do not block implementation waiting for Higgsfield assets.

---

## 23. Technical stack

Use current stable versions when implementation begins.

### Core

- Next.js App Router
- TypeScript
- Tailwind CSS

### 3D

- Three.js
- React Three Fiber
- Drei

### Motion

- Motion for component-level UI transitions
- GSAP + ScrollTrigger for carefully controlled scroll choreography

### Icons

- Lucide

### Content

- typed TypeScript content objects for structured data;
- MDX for detailed project case studies.

### Hosting

- Vercel

### Source control

- GitHub

### Observability

- Vercel Web Analytics
- Vercel Speed Insights

### Testing

- Playwright for critical browser journeys;
- suitable unit/component tests for content helpers, validation and interaction logic.

---

## 24. Recommended repository/content structure

```text
app/
  page.tsx
  about/
  experience/
  projects/
    page.tsx
    [slug]/page.tsx
  expertise/
  resume/
  contact/
components/
  layout/
  navigation/
  sections/
  three/
  motion/
  projects/
content/
  experience.ts
  projects.ts
  skills.ts
  certifications.ts
  projects/
    edp-migration.mdx
    crd-migration.mdx
    route-collision-analyzer.mdx
    hybrid-api-gateway.mdx
    api-key-hashing.mdx
lib/
public/
  images/
  branding/
  projects/
  resume/
styles/
tests/
```

Do not duplicate career/project data across components. Components should render structured content.

---

## 25. Responsive strategy

### Desktop

- full 3D experience;
- highest scene detail;
- richer pointer/camera interactions.

### Tablet

- reduced geometry and effects;
- preserve the core architecture story.

### Mobile

- lightweight WebGL or animated SVG fallback;
- no interaction dependent on hover;
- preserve performance and readability;
- project case studies remain fully usable without 3D.

### Reduced motion

Respect `prefers-reduced-motion`:

- remove camera movement;
- minimise transitions;
- disable nonessential animated data flows;
- retain all content and controls.

---

## 26. Performance requirements

Core content must render before 3D.

### Requirements

- dynamically import heavy WebGL code;
- lazy-load 3D scenes and noncritical project media;
- constrain device pixel ratio;
- pause/reduce render loops when scene is off-screen;
- compress/optimise GLTF assets if any are used;
- use Meshopt/Draco when justified;
- avoid huge textures;
- use modern WebP/AVIF images where appropriate;
- use Next Image for standard images;
- avoid shipping both GSAP and Motion for the exact same type of transition;
- monitor JS bundle size;
- avoid layout shift.

A recruiter must not wait for WebGL before understanding who Ataimo is.

---

## 27. Accessibility requirements

- semantic headings and landmarks;
- keyboard navigation for all controls;
- visible focus states;
- sufficient contrast;
- descriptive image alt text;
- accessible HTML alternative for every 3D/diagrammatic concept;
- tap/click equivalent for hover interactions;
- reduced-motion support;
- no essential information only inside canvas/WebGL;
- contact form labels, error messages and success/failure states must be accessible.

---

## 28. SEO / metadata

### Default title

**Ataimo Edem | API Management, Solutions Architecture & Customer Engineering**

### Default meta description

**Customer Success Engineer specialising in API Management, Solutions Architecture, Kubernetes, cloud platforms and enterprise integrations.**

### Implement

- Next metadata API;
- canonical URLs;
- sitemap;
- robots.txt;
- Open Graph metadata;
- social preview image;
- Person JSON-LD;
- project `CreativeWork` / appropriate structured data;
- `sameAs` for LinkedIn and GitHub;
- descriptive page titles for project case studies.

---

## 29. Privacy / confidentiality requirements

Never expose:

- customer logs;
- private customer names unless explicitly public/approved;
- private customer architecture;
- internal Tyk Jira IDs;
- production URLs;
- API keys / credentials;
- private repositories;
- confidential customer incidents;
- home address.

The EDP migration project must be labelled as private source with public PoC only.

Use sanitised project examples and diagrams.

---

## 30. Source-of-truth assets

This source pack contains:

### Portrait

- `assets/portrait/ataimo-portrait-4x5.webp` — primary website portrait
- `assets/portrait/ataimo-profile-square.webp` — square avatar
- `assets/portrait/ataimo-portrait-source.jpg` — high-quality source

### Brand reference

- `assets/branding/linkedin-banner.png`

### Resume

- `assets/resume/Ataimo_Edem_Professional_Resume.pdf`
- `assets/resume/Ataimo_Edem_Professional_Resume.docx`

### Career source reference

- `assets/reference/LinkedIn_Profile_Export.pdf`

### Structured content

- `content/CONTACT.md`
- `content/EXPERIENCE.md`
- `content/PROJECTS.md`

---

## 31. Delivery plan

### Phase 1 — Foundation

- initialise Next.js/TypeScript/Tailwind;
- configure Geist;
- define design tokens;
- define site shell and responsive navigation;
- define content data structures;
- copy/optimise source assets into `public`;
- build footer and metadata foundations.

### Phase 2 — Complete static site

Build all routes and real content without depending on advanced motion/3D:

- Home
- About
- Experience
- Projects index
- Project case studies
- Expertise
- Resume
- Contact

This phase must already be production-usable.

### Phase 3 — Motion system

- section reveals;
- timeline motion;
- project-card interactions;
- navigation state;
- terminal micro-interactions;
- restrained page transitions.

### Phase 4 — 3D hero

- implement R3F topology;
- request/data flow animation;
- pointer-based camera motion;
- scroll state transitions;
- low-power/mobile/reduced-motion fallbacks.

### Phase 5 — Project visualisations

- EDP migration flow;
- CRD cluster migration;
- route analyzer terminal experience;
- hybrid gateway architecture;
- hashing flow.

Use CSS/SVG when 3D is not meaningfully better.

### Phase 6 — Quality

- responsive review;
- accessibility review;
- SEO/structured data;
- image optimisation;
- bundle/performance review;
- tests;
- error states;
- reduced-motion review.

### Phase 7 — Deployment

- Vercel configuration;
- preview deployments;
- production build verification;
- custom domain later when selected/purchased.

---

## 32. CI / quality gates

For each pull request run at least:

- lint
- typecheck
- tests
- production build

Critical Playwright journeys should cover:

- top navigation;
- project index/case study navigation;
- resume download;
- external GitHub/LinkedIn links;
- contact-form validation;
- mobile layout;
- WebGL fallback;
- reduced-motion behaviour.

---

## 33. Acceptance criteria

The first production-ready release is complete when:

1. Every main page contains final copy and real assets.
2. The site works with JavaScript/WebGL degradation and remains understandable without 3D.
3. Desktop 3D hero is smooth and purposeful.
4. Mobile experience is fast and does not depend on hover.
5. Resume downloads successfully.
6. LinkedIn, GitHub and email links are correct.
7. Contact form has honest configured/unconfigured behaviour.
8. No private customer/internal Tyk data is exposed.
9. The EDP private-source status is represented accurately.
10. Keyboard navigation and reduced-motion modes work.
11. Production build, lint, typecheck and tests pass.
12. Site is deployable to Vercel without manual code edits.
13. README documents local development, build and deployment.

---

## 34. Anti-patterns to avoid

Do not build:

- generic SaaS gradient landing page;
- template-like portfolio card wall;
- excessive glassmorphism;
- giant skill-logo cloud without context;
- arbitrary skill percentages;
- scroll hijacking;
- long loading/splash introduction;
- giant autoplay video background;
- constant particle effects;
- 3D objects with no relationship to Ataimo's work;
- inaccessible canvas-only navigation;
- fake contact-form success;
- invented customer metrics or achievements.

---

## 35. Implementation principle

**Build the complete usable website first, then progressively add spectacle.**

The final experience should feel bespoke, technically sophisticated and memorable, while remaining credible to enterprise recruiters and technical hiring managers.

The 3D and animation system should reinforce the story:

**API platforms → cloud architecture → security → distributed systems → customer engineering.**

It should never become the story itself.
