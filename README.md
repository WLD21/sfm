# Supreme Fitness & Massage

## Gym and spa experience

The homepage now leads with **personal training and gym coaching**. The persistent Training & gym / Spa & recovery switch fades the header, main content and footer together, changing the whole site's palette. The gym uses an animated dumbbell illustration; the spa keeps the original photography and adds swaying palms, rising steam and a warm sauna illustration. The illustration is decorative and does not assert that Supreme owns a sauna facility.

React components are added to the existing Vite application, preserving its massage menu, original photos, reviews, translations and request-only booking behavior. GSAP handles theme transitions and scene motion. Animations stop off-screen, when the browser tab is hidden or the pause control is enabled, and respect reduced-motion preferences. Failed animation imports restore the visible page automatically.

The new Training page describes three coaching goals without inventing prices or credentials. Training enquiries validate contact fields, show an explicit unsent review, and can be copied or downloaded before contacting Supreme. Closing the enquiry clears entered details. No booking, payment, subscription or delivery backend is simulated.

English, French and Dutch are included for all new interface text. The selected experience is remembered only for the current browser session. The motion pause preference stays in page memory.

Use `npm install` once after adding React, then the existing development commands. The verification workflow resolves the dependency lock, runs the existing massage regressions in spa mode plus the new gym tests, regenerates the build and standalone HTML, verifies the standalone offline, and saves generated output to the same feature branch only when its source head has not changed. A passing workflow also creates a tested source ZIP.


A Vite / JavaScript website with a warm beige, cream and gold design, restrained green accents, geometric contour backgrounds and readable typography. Includes the six original photographs, the twelve original EUR service prices, locally bundled bold Lora titles, Outfit action labels and Manrope body fonts, compact mobile navigation, a skippable GSAP intro, an editorial gallery animated with ScrollTrigger, a treatment finder, a four-step appointment-request flow with mobile visits and travel estimates, visit preparation guidance, and a five-star review form with private email or phone contact.

The approved standalone HTML was recovered directly from its recorded file identity. The broken Windows workspace and earlier unverified ZIP were not used. Image bytes and dimensions were checked against the original embedded JPEGs; see `docs/ASSET-PROVENANCE.json`.

## Run locally

**To view the design immediately, double-click `OPEN-WEBSITE.html`.** That standalone file embeds the CSS, JavaScript, GSAP, fonts and all six photos. It needs no server or installation to display. Use a normal browser, rather than an attachment's text/code viewer.

The instructions below are for editing the source. The developer `index.html` is different from the standalone file and needs Vite to load its CSS/JavaScript correctly.

Requires Node.js 22.12 or later. Open the extracted `Supreme-Fitness-Massage` directory in your terminal:

```sh
npm install
npm run dev
```

Use the local address printed by Vite while that terminal remains running. Do not open `index.html` directly as a file. If Windows PowerShell blocks the npm wrapper, use `npm.cmd install` and `npm.cmd run dev`. The project-local `.cache/npm` setting allows installation without relying on a writable home directory.

```sh
npm run build
npm run preview
```

The `dist` directory is the built static site. A copy is included in the delivery ZIP. It can be served by an ordinary static web host, using hash navigation without server routing rules. The original Sites association is preserved in `.openai/hosting.json`; its presence does not publish the site.

`npm run build` also regenerates `OPEN-WEBSITE.html`. Use `npm run build:standalone` to regenerate only the single-file version. The editable CSS and JavaScript remain in `src/`; the standalone file is generated output.

## English, French and Dutch

Use the language selector above the header or inside the booking dialog. Language changes update the pages, accessible labels, service menu, booking and review forms, validation messages, travel quotes and private TXT/email drafts without reloading or losing entered details. Original image artwork and customer-written names, addresses and reviews are never machine-translated or changed.

The selection is stored as `sfm-language` in local storage when available. On an HTTP web host it also appears as `?lang=en`, `?lang=fr` or `?lang=nl`, so links can open in a selected language. A supported URL choice takes priority over a saved choice; without either, the first supported language in the browser's preferences is used, including regional variants such as `nl-BE` and `fr-BE`. English is the fallback if none match. The app also works when storage is blocked. French and Dutch use Belgian date and euro formatting. Language copy, including the treatment finder, preparation guide and privacy dialog, is bundled locally; no translation API is called. The JavaScript-disabled fallback remains the original English content.

## Choosing a treatment and preparing a visit

The collapsed **Help me choose** section on Treatments suggests existing menu choices by occasion, with 60- or 90-minute duration and an optional Antwerp/outside-Antwerp travel area. It reuses the supplied menu prices, labels duo prices as totals for two people, and displays the existing estimated travel range or pending quote. Choosing a treatment carries the treatment, duration and selected travel area into the request flow. The full menu remains available. This is preference guidance, not a clinical assessment or a promise of a health outcome.

The collapsed **Before your visit** guide covers a suitable space, access and equipment questions, personal comfort, and the date/location/final-price arrangements to confirm with Supreme. It does not invent equipment guarantees, cancellation deadlines or a confirmed appointment. A link opens the original record of 30 hours of massage instruction in the photo viewer; the record is not described as a medical qualification.

## Intro and gallery motion

The welcome draws the lotus, reveals the Supreme lettering and opens the site within 2.5 seconds. It plays once per session; visitors can skip it, press Escape or replay it from the footer. The showcase uses native scrolling, staggered card reveals and gentle photo parallax. Original documents remain uncropped, and selecting any image opens its full-size viewer.

Reduced-motion preferences disable these animations, including when changed while the page is open. Keyboard focus reveals a card immediately. Missing animation scripts leave the content visible and usable. GSAP and ScrollTrigger are included locally in the build and embedded in the standalone HTML; no CDN connection is required.

## Verification

```sh
npm test
npx playwright install chromium
npm run test:browser
```

On this cloud machine the installed browser can be used without downloading another browser:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
CHROMIUM_PATH=/usr/bin/chromium npm run test:standalone
```

Browser tests manage their own server on port 4173; keep that port free. Tests cover 320/375/390/768/1440-pixel layouts, navigation/focus/history, all twelve prices, intro/replay/reduced-motion/failure fallback, actual scroll-driven image movement, keyboard gallery access, booking validation, Antwerp travel estimates and outside-area quotes, review/contact validation, safe text rendering, request downloads, clipboard fallback, personal-data reset, subscription safeguards and the six original photos/gallery controls.

## What booking means here

Visitors prepare a request, then copy or download it and contact Supreme through the original website. **The form does not send, reserve, charge or activate anything.** It says so before the visitor shares the request. The live calendar, submission destination, payment account, subscription prices and terms were never supplied. Their required configuration is documented in `docs/CONFIGURATION.md`.

Subscription components support validated hosted-checkout handoffs after real plans are configured. With the current empty plan list, no checkout is offered. No paid subscription or real reservation is simulated.

## Mobile visits and reviews

The therapist can visit the client’s home, hotel or another requested location. Visitors explicitly select Antwerp or outside Antwerp; a postcode is never silently classified. Antwerp travel is estimated at €9.99–€14.99 in addition to the treatment, with an estimated total range. Outside Antwerp, the final travel fee is agreed with the client based on total travel distance; no final total is invented. Gym/spa access and arrangements for two therapists remain subject to confirmation.

Reviews offer an unselected 1–5 star rating, experience text and an email-or-phone contact choice. Previewed review text excludes the contact; the private review export includes it so the business can follow up. Contact details are supplied by the visitor, not verified by email or SMS. No aggregate rating or testimonial is fabricated.

The default build has no review recipient configured. A notice above the form explains that reviews can be prepared, copied or downloaded, but are not sent or published automatically. The fixed mobile booking bar is hidden on Reviews so it does not cover review inputs. Set the verified business email in `siteConfig.reviews.recipientEmail` to enable a mail-app handoff; the visitor must send the email themselves. This is not a public review database. Public posting, moderation and email/SMS verification require a configured backend. See `docs/CONFIGURATION.md`.

## Privacy and remaining launch information

The footer Privacy dialog describes what this build actually does: appointment/review details remain in page memory until their respective close, leave, clear or reload action; copies and downloads remain on the visitor's device; email handoffs use the visitor's own mail app. Only the selected language and session intro preference use browser storage. The app has no analytics or advertising trackers, and external websites/providers have their own privacy practices. This factual explanation is not a substitute for the business identity, contact details and policies needed when a real submission or review service is connected.

The largest remaining improvements depend on owner information: a verified business contact and working booking delivery/calendar, an approved therapist introduction, exact travel/access and cancellation rules, confirmed payment methods and any subscription terms. See `docs/CONFIGURATION.md` for integration requirements and `docs/BELGIAN-MARKET-REVIEW.md` for the improvement review. Current competitor research was blocked by the cloud network; that document makes no claims about observed competitor features or a Belgian market ranking.

## Structure

- `index.html` — Home, Treatments, Showcase, Your visit and Reviews views.
- `src/i18n.js` / `src/translations.js` — language switching and English/French/Dutch copy.
- `src/main.js` — view navigation, filters, gallery and subscription UI.
- `src/motion.js` / `src/motion.css` — GSAP welcome, view entrances and ScrollTrigger lifecycle.
- `src/showcase.css` — responsive editorial gallery layout.
- `src/services.js` — exact menu prices and date validation.
- `src/treatment-finder.js` / `src/treatment-finder.css` / `src/treatment-finder-copy.js` — compact menu guidance, travel estimates and translated finder copy.
- `src/visitor-guide.css` / `src/visitor-copy.js` — preparation/privacy presentation and translated guidance.
- `src/booking.js` / `src/booking.css` — appointment-request dialog.
- `src/travel.js` — Antwerp travel estimates and outside-area quote rules.
- `src/reviews.js` / `src/reviews.css` — private review preparation and optional mail-app handoff.
- `src/commerce.js` — safe public plan/provider configuration validation.
- `src/site.config.js` — project identity, photo mapping and plan configuration.
- `src/style.css` / `src/tokens.css` — high-contrast palette, responsive layout and readable text sizes.
- `public/images` — all six untouched originals.
- `docs` — business configuration, image provenance and third-party notices.
- `tests` — unit and browser checks.

There are no credentials in the project. Personal details are not sent to a server or persisted by the app. Fonts and JavaScript are bundled locally, the intro-seen flag uses session storage, and the selected language uses local storage when available.

## Publication status

The rebuild and local tests do not establish a deployment. The existing Sites project is `appgprj_6ad270cdc964819194480bb559a38ade`. No source version, successful publication or live URL has been created by this cloud task because Sites upload/deploy tools are unavailable here. Keep the existing project; publish using the supported Sites workflow when access is restored.

For Vercel, the included `vercel.json` selects Vite, `npm ci`, `npm run build` and the `dist` output directory. `.vercelignore` excludes caches, local credentials and the standalone download from source upload. Run `npx --yes vercel@64.5.0 login`, then `npx --yes vercel@64.5.0 --prod` from this folder. See `DEPLOY-TO-VERCEL.txt` for project selection instructions. Vercel prints the live URL only after a successful deployment. This cloud session could not create one: its network proxy blocks Vercel's API and no Vercel account is connected; the CLI's temporary-deployment fallback was also unavailable.
