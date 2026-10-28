# Supreme Movement Studio

This update uses the complete MIT Scroll Craft skill at tools/scroll-craft, pinned to upstream 75d81f74e83692add18cd7a8a8e078b8a887a579. Its engine and verification harness are unchanged. The project imports the runtime through src/scroll-experience.js; this is direct project use, not a claimed installation in a personal Skills directory.

The design brief and authored interaction score are in scrollcraft/builds/supreme/BRIEF.md. Godly's health/fitness curation informed the light, material-led visual direction; Awwwards supplied a reference direction, although its directory timed out during this session. No competitor assets or layouts were copied.

## What changes

- Real Three.js weights with curved plates, metal grips, rubber surfaces, independent depth, a short scroll assembly movement and a bounded pointer response.
- A cedar sauna detail with a bench, heater stones, soft rising steam and moving palm leaves. This is an atmospheric illustration, not a photograph or claim about a facility Supreme operates.
- Strength / Fitness / Confidence controls change the composition and carry the selected goal into hero, header and mobile training enquiries.
- Two local font families, a brighter composition, compact coaching rows and an original client-photo reveal. Existing six photos, massage menu, languages and privacy safeguards remain.
- The existing GSAP full-site gym/spa fade remains; Scroll Craft handles scroll devices. No scroll hijacking or long pinned section.

## Resilience and performance

Three.js loads only for a visible scene when reduced motion is off. Only one context exists at a time. Intro, mode transitions and open forms suspend the 3D layer. Offscreen scenes, hidden tabs and inactive views dispose GPU resources. Pause stops rendering; animation is capped at 30 fps, touch density at 1.25 and desktop density at 1.5. Slow renderers reduce resolution and frame rate automatically. No pointer lock or capture, remote models or third-party media requests.

Four exact rest-frame posters are generated from the final models by scripts/capture-scenes.mjs. Reduced motion, unsupported WebGL and context loss use those posters. If a poster itself is unavailable, the original SVG illustration remains as a final fallback. All assets are embedded in OPEN-WEBSITE.html.

## Running and verification

Use Node 22.12 or newer:

    npm install
    npm run dev

Build with npm run build. The complete source archive contains the resolved lockfile, public assets, compiled dist and OPEN-WEBSITE.html. The latter opens without installing anything.

Checks: npm test; npm run test:browser; npm run test:standalone.
To regenerate scene posters: npm run capture:scenes (installed Chrome or CHROMIUM_PATH required).
To run upstream scroll contact sheets: npm run verify:scrollcraft (installed Chrome and full FFmpeg required).
The production contact sheets and their JSON observations are saved in docs/previews/scroll-*.

Automated browser tests cover real pixel change, pause, scroll, context loss, no-WebGL fallback, reduced motion, goal propagation, small layouts, original enquiry flows and offline assets. Desktop Chrome with mobile emulation is not physical iPhone/Android testing.

## Business integrations

Training and massage forms prepare private enquiries for the visitor to share with Supreme. They do not send, reserve or charge. Subscription plans and a live booking/payment provider have not been supplied; this update does not fabricate them. The code change is separate from restoring the unavailable Sites/Vercel publication.
