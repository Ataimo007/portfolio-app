# Portfolio design system

The portfolio uses a light editorial theme with a warm off-white canvas, white panels, deep green ink, and a subtle architectural grid. It keeps the existing content, native scroll reveals, and interactive architecture scene.

Teal is the primary action and migration color; blue supports architecture and contact; clay distinguishes diagnostics. Text uses Geist Sans and JetBrains Mono. Colors are defined once in the Tailwind 4 theme in app/globals.css; compatibility aliases map existing components to the same semantic tokens. Diagrams and the R3F scene read those tokens.

Spacing follows the existing 4px/8px scale. Panels use thin borders, sharp corners, and no decorative shadows. Micro-interactions use explicit properties, durations below 300ms, and cubic-bezier(0.16, 1, 0.3, 1). Reduced-motion, visible focus, and readable text contrast are required.
