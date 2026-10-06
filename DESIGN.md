---
name: Ataimo Edem — Engineering & Architecture
description: Warm editorial portfolio with a live architectural field.
colors:
  primary: "#2447b9"
  secondary: "#2f6b60"
  warm: "#a84d30"
  canvas: "#f5f3ed"
  surface: "#fffef9"
  ink: "#252a30"
  muted: "#5b626d"
  border: "#dcdcd2"
typography:
  display:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "clamp(3.5rem, 8.3vw, 8rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.055em"
  emphasis:
    fontFamily: "Instrument Serif, serif"
    fontWeight: 400
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Sans, sans-serif"
    fontSize: "1.0625rem"
    lineHeight: 1.7
rounded:
  panel: "1rem"
  control: "0.5rem"
spacing:
  small: "0.5rem"
  medium: "1rem"
  large: "2rem"
  gutter: "clamp(1.5rem, 6vw, 6rem)"
  scene: "clamp(5rem, 10vw, 10rem)"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.75rem 1.5rem"
---

## Overview
A light editorial identity for an engineer who connects architecture, hands-on technical work and customer ownership. DisciteX informed the craft bar and scene progression; this site uses its own light palette, serif emphasis and real portfolio content. The signature is a persistent architecture field that moves with pointer and scroll while content remains ordinary, readable HTML.

## Colors
Cobalt owns primary actions and display emphasis. Evergreen supports architecture, and clay distinguishes diagnostics. Warm paper, cream panels and ink unify every route. Tokens are implemented in app/brand.css and map into the shared Tailwind 4 theme; use semantic variables rather than isolated color overrides.

## Typography
Geist Sans carries headings and body. Self-hosted Instrument Serif supplies display emphasis. JetBrains Mono is reserved for project language, technical captions and metadata. Preserve factual copy and project disclosures.

## Layout
A compact inset header and generous fluid gutters frame the site. The homepage progresses through introduction, selected work, method, person and contact scenes. Desktop has a wide lead project and two supporting projects; mobile stacks content and retains the static architecture fallback. Other pages inherit the same type, navigation, palette and panel language.

## Elevation & Depth
Thin borders and tonal surfaces separate content. The background architecture and moving field create atmospheric depth; decorative card shadows are unnecessary.

## Shapes
Panels have 16px corners; controls have 8px corners. Diagrams retain crisp vector geometry. Portraits keep their natural aspect ratio.

## Components
Buttons have clear primary and secondary roles, visible focus and subtle press compression. Scene links indicate the current visible section via native IntersectionObserver. Entry reveals use native observation and CSS transitions. Live particles reuse the single R3F canvas; camera damping uses frame delta. Reduced-motion disables the continuous canvas and CSS texture drift. Mobile has no continuous WebGL render.

## Do's and Don'ts
Use real case studies, clear action labels and the shared token palette. Keep motion interruptible and preserve scrolling, keyboard access and no-JavaScript reading. Do not invent metrics, logos or customer proof; do not add Framer Motion or GSAP. Residual metadata labels from the original content are preserved content, not a rule for adding decorative labels everywhere.
