# Cinematic portfolio direction

## Reference review

Reference: https://www.tiktok.com/@codevibes_1/video/7685707192191749398

Reviewed the recovered nine-minute transcript, cover image and sampled frames across the downloaded video. The examples include a metallic sculptural environment, an animated character/sportswear scene and a bright fashion scene. Their shared direction is dominant cinematic imagery, generous text space and restrained interface elements. Exact transition easing has not been assessed through real-time playback.

The tutorial describes this workflow:

1. Find a visual reference and create a clean background without baked-in interface text.
2. Generate a short cinematic clip from an image or transfer motion from a reference video.
3. Build the website around that clip, tying its playback position to scrolling.
4. Overlay real HTML typography, navigation and calls to action; extend the visual language into subsequent sections.

Official tools relevant to the workflow:
- Higgsfield motion references: https://higgsfield.ai/ai/video/motion
- MotionSites scroll-driven example: https://motionsites.ai/lesson/build-scroll-animated-website-with-ai

These demonstrate the approach; their artwork and prompts are not dependencies of our site. The tutorial's speed and quality claims are not estimates for this project.

## Recommended concept: Inside the platform

An original architectural world connected to Ataimo's API, cloud and customer engineering work. Use graphite, brushed metal, cyan signal paths and restrained warm light. Keep the scene spacious and realistic enough to feel cinematic. Place key subjects to the right and reserve dark negative space for readable copy on the left.

One continuous camera move is preferable to unrelated clips: it preserves visual continuity and makes forward and backward scrolling coherent.

| Scroll beat | Visual | Portfolio message |
| --- | --- | --- |
| Arrival | A sculptural gateway suspended in a dark architectural environment; a cyan signal approaches | Ataimo Edem and enterprise API platforms; projects and resume immediately accessible |
| Inside | Camera approaches the gateway; signal crosses layered security and routing elements | Engineering depth and solutions architecture |
| Scale | Camera pulls back to reveal connected cloud infrastructure and warm telemetry | Cloud, Kubernetes and customer ownership |
| Evidence | Scene settles into a quiet composition and releases into normal page scrolling | Selected migration, diagnostics and gateway projects |

Actual diagram labels remain HTML or belong in the case studies. The cinematic world communicates a theme; it should not imply it is a precise technical diagram.

## Collaborative checkpoints

### 1. Choose the visual direction

Selected: dark architectural platform. Create a hero frame and a three-frame storyboard in graphite, brushed titanium and cyan. Review materials, camera movement and text readability before investing in video generation.

### 2. Make the cinematic asset

Generate one silent 7–10 second continuous shot from the selected artwork. Keep the opening frame composed as a usable static hero. Avoid fast cuts, unstable geometry, tiny text and constantly changing objects. Review beginning, middle and end before integrating.

Deliverables: source clip, web-optimised desktop clip, mobile crop or still, and poster image. Aim initially for a desktop clip under 8 MB, then adjust quality based on measured results. Use original or licensed assets.

Image concepts can be generated in this workspace. Video generation requires a suitable generation service and access to it; no video-generation connection is currently configured here. External asset generation is the dependency for this phase, not additional frontend scaffolding.

### 3. Build one working scroll scene

Replace the current homepage topology presentation with a full-width cinematic section. Reuse the existing Next.js app, content, styling and Dev Container. Use CSS sticky positioning, native scrolling and a small client component that maps section progress to video time. Encode for seeking and test actual forward/reverse scroll behaviour before deciding whether a frame sequence is necessary.

Keep copy, links and navigation semantic HTML. Make project access available immediately. Release the pinned section after roughly two viewport heights of scrolling; tune this in the browser rather than forcing a long animation before the visitor can reach the work.

Deliverable: a local prototype with real media, three narrative beats and working links. Review this before expanding the motion to other sections. Remove the old scene and unused dependencies only after the replacement is accepted and remaining usage is checked.

### 4. Refine and verify

Use restrained text reveals and project hover treatments where they help. Preserve the existing case studies, resume and contact flow. Verify:

- Forward/reverse scroll, resizing and navigation away/back.
- Readable text, keyboard operation and immediately available actions.
- Static poster with reduced motion, unavailable video or disabled JavaScript.
- Mobile composition, touch scrolling, Safari and Chrome behaviour.
- No layout overflow, console errors or animation work after leaving the scene.
- Measured loading and media size on a throttled connection.
- Existing lint, typecheck, build and browser journeys in the Dev Container.

Deployment follows local review. No framework migration, animation-library addition or mandatory preloader is needed for the first prototype.

## Next decision

Architectural direction selected by Ataimo. Next: review the generated hero and storyboard, then generate the continuous cinematic shot from the selected artwork.
