# Business configuration still required

The website is a functioning static site with an appointment-request preparation flow. It has no server, database, live calendar, booking submission endpoint or payment processor. No action in this project confirms an appointment, sends a request to the business, takes payment or activates a subscription.

## Appointment requests

Visitors can select a treatment, duration, visit preference, travel area, date and time preference, town, optional requested address/location details, and contact details. The four-step dialog validates these fields, displays the exact menu price, and produces a copyable/downloadable request. The original contact destination is `https://supremefitnessmassage.com/home`; opening that link does not submit the request. This destination was supplied in the approved record; outbound reachability could not be verified from the cloud network because its proxy denied access.

Before enabling real submissions or confirmed bookings, supply:

- A verified business contact/submission endpoint and delivery mechanism.
- The calendar provider, business timezone, opening hours, service durations, travel buffers, booking lead time and actual availability.
- Cancellation, rescheduling, exact travel-fee and venue-access policies, including final price confirmation for gym/spa visits and two-therapist arrangements.
- A backend that validates requests, protects personal information and confirms provider responses. A pending request and a confirmed booking must remain distinct.

Prefer a hosted scheduling page or a server-mediated integration. Do not expose private credentials through a Vite environment variable or frontend source. Verify receipt on the actual provider before adding a successful-submission UI. Do not replace date preferences with invented available times.

## Mobile travel pricing

The owner supplied an estimated Antwerp travel fee of €9.99–€14.99 and an individually agreed quote outside Antwerp, based on total travel distance. `src/travel.js` keeps money in integer cents. The booking flow requests an explicit travel-area selection instead of guessing from an address. For Antwerp, the review shows the menu price, estimated travel range and estimated combined range. It never claims the exact fee is agreed. Outside Antwerp, the review retains the treatment price and labels travel and the final total as awaiting a quote.

Before confirming a booking, agree the exact Antwerp fee or outside-area quote, confirm the travel boundary, any parking/venue costs, and the fee for duo visits with two therapists. The displayed travel range is provisional per visit; the site does not silently charge it per person. No maps, calculated route distance or per-kilometre tariff is invented.

## Customer reviews

The Reviews view accepts a 1–5 star rating, display name, experience and either email or phone. Ratings begin unselected. The preview does not display the contact field; the private TXT/copy export does include it, with an explicit label. All customer text is rendered as text, never interpreted as HTML. Details stay only in page memory, and clear when the visitor clears the form, leaves the Reviews view or reloads. Changing an input invalidates the prepared preview so an old review cannot be exported accidentally.

The current `siteConfig.reviews.recipientEmail` is empty. No send control is offered until a valid, verified business recipient is supplied. Visitors can prepare, copy or download a private review; the page clearly says sending is not available. A configured recipient enables a properly encoded `mailto:` link that opens the visitor’s mail app. The visitor must send it, and the site cannot verify delivery. No successful sending, publication or verified identity is claimed.

For live public reviews, supply a backend with private contact storage, moderation, spam protection and a real persistence/delivery response. Email or phone ownership verification needs a real provider; filling a contact field does not verify ownership. Do not publish contact details or invent a review count, average rating, or testimonial. No review backend credentials belong in the frontend config.

## Subscriptions and payments

The subscription dialog truthfully shows that plans and billing are being prepared. No prices or entitlements have been fabricated.

`src/site.config.js` has an empty `subscriptions` array. Its renderer supports entries with `id`, `name`, integer `priceMinor`, `currency`, `interval` (`week`, `month`, or `year`) and an actual public HTTPS `checkoutUrl`. These are public plan details only. Invalid entries have no checkout action.

Before enabling this path, approve tier names, exact recurring prices and currency, included services, redemption rules, cancellation terms and the payment provider. Present the complete approved terms with each plan. A provider checkout link only initiates checkout; membership activation requires provider-confirmed server events. No such backend is included or claimed.

## Public launch

The original six treatment prices for each duration are in `src/services.js`; duo amounts are totals for two people and two therapists. Photos and the source menu are preserved without modification. Never treat the training certificate as a medical license or add unverified health guarantees.

`noindex,nofollow` remains intentionally present until business launch information is finalized. Review it before a public indexed launch. Fonts and GSAP are bundled locally; no font/CDN calls are required at runtime. Session storage contains only an intro-seen flag. Local storage contains only the selected language (`sfm-language`); no form content is saved there. French and Dutch translations are bundled with the app; no external translation service receives visitor text. Booking details stay in page memory and are cleared on dialog close/reload. Review details clear on form reset, leaving Reviews or reload. Copied/downloaded requests remain on the visitor's device.

## Existing Sites project

`.openai/hosting.json` records `appgprj_6ad270cdc964819194480bb559a38ade` with static output `dist`. This association does not upload, create a saved version or publish anything.

When authorized Sites tools are available: build, use the supported source upload/version/deploy workflow for that same project, verify a saved version, wait for deployment success, then inspect the returned live URL. Do not create a replacement project or invent a deployment URL. The current cloud chat has no callable Sites publishing tools.
