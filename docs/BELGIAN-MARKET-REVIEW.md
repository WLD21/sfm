# Belgian wellness website improvement review

Review date: 18 October 2026 (Europe/Brussels).

This is a project audit and a proposed research plan, not a completed current competitor benchmark. Public website requests were blocked by this environment's network proxy before any page content could be read. No competitor features, rankings, prices or market-share claims below are presented as observed facts.

## Primary sources attempted

The following are relevant candidates for a future browser review. The categories describe the research question, not a verified observation of their current pages.

| Primary source | What to examine when access is available | Result on review date |
| --- | --- | --- |
| [Waer Waters](https://www.waerwaters.com/en/) | Treatment discovery, venue information, booking and visit preparation | HTTPS tunnel rejected with `403 Forbidden`; root domain also blocked |
| [Thermae](https://www.thermae.com/en) | Wellness packages, practical visit guidance and reservation details | HTTPS tunnel rejected with `403 Forbidden`; root domain also blocked |
| [Botanic Antwerp](https://www.botanicantwerp.be/) | Local premium presentation, therapist/treatment detail and spa contact path | HTTPS tunnel rejected with `403 Forbidden`; `/en/spa` attempt also blocked and that path could not be verified |
| [Treatwell Belgium](https://www.treatwell.be/en/) | Service selection, price/duration visibility, genuine review information and availability | HTTPS tunnel rejected with `403 Forbidden`; root domain also blocked |
| [Bancontact](https://www.bancontact.com/en) | Provider documentation before considering a Belgian payment-method integration | HTTPS tunnel rejected with `403 Forbidden`; root domain also blocked |

There is no accessible browser/search connector in this task. Requests used public HTTPS pages without authentication. The proxy errors do not establish whether the websites themselves are available to ordinary visitors. Revisit these sources before making statements about the current Belgian market. This review does not substantiate a claim that Bancontact is required, dominant or currently supported by any proposed processor.

## Project baseline and unchanged limits

The following observations come from `index.html`, `README.md`, `src/site.config.js`, `src/services.js`, `src/translations.js` and `docs/CONFIGURATION.md` at the start of this improvement pass:

- The design already has a coherent beige/gold identity, readable bundled fonts, six original photographs, reduced-motion support and a skippable introduction.
- English, French and Dutch are bundled locally, including form validation, prices and private exports. A URL language preference is supported on hosted versions.
- The treatment menu preserves the supplied prices and distinguishes duo totals. Mobile visits show an Antwerp travel estimate of €9.99–€14.99 per visit; outside Antwerp requires an agreed distance-based quote.
- The booking flow prepares a request. It has no live availability, verified submission destination or actual booking confirmation.
- Reviews support a voluntary 1–5 rating and a separate private email or phone field. There is no review database, verified identity, public rating aggregate or configured sending recipient.
- The only supplied contact destination is the original website. Verified business phone/email, legal identity, regular opening hours, cancellation terms and a final travel policy have not been supplied.
- The source includes a photograph of a certificate recording 30 hours of massage instruction. That supports describing the document accurately; it does not establish a medical qualification.
- Subscription prices and terms are unconfigured. Publication and a live URL remain unverified. The site deliberately retains `noindex,nofollow` until launch details are ready.

## Priorities for a more complete customer experience

These priorities are practical design and implementation recommendations, not findings about competitor prevalence. A credible site for this business should make choosing a treatment and arranging a real visit easy. Additional animation is a lower priority than these basics.

| Priority | Improvement | Why it matters here | Information or integration needed |
| --- | --- | --- | --- |
| 1 | A working, clearly labelled contact/request handoff | A visitor currently has to copy or download a draft and find contact details elsewhere. This is the largest gap between the polished interface and the actual service journey. | Verified business email/phone or a hosted booking provider. Test real delivery before displaying a received/confirmed state. |
| 1 | More specific treatment guidance | A compact occasion-based finder now guides visitors through existing menu choices. More detailed service explanations still need the owner's input. | Owner-approved descriptions of pressure/style and practical restrictions. Avoid diagnosing conditions or promising treatment outcomes. |
| 1 | Confirmed mobile visit arrangements | A collapsed preparation guide now covers space, access, comfort and details to agree. It intentionally leaves unknown arrangements open. | Confirm equipment supplied, suitable space, access/stairs, parking, hotel permission, therapist arrival arrangements and whether setup time is additional. Publish only confirmed promises. |
| 1 | A final, agreed total price | The finder now brings treatment prices and optional travel estimates together before the request; an estimate still cannot establish the final charge. | Exact Antwerp boundary, fee decision rule, parking/venue charges, duo travel arrangements and tax treatment if applicable. Do not silently invent a per-kilometre tariff or tax-inclusion statement. |
| 1 | An authentic therapist/business introduction | Trust is especially important when inviting a therapist to a private location. | Approved therapist name, portrait and biography; precise qualifications; business identity and contact details. Do not label the business a medical clinic or imply a regulated healthcare profession without evidence. |
| 2 | Additional first-visit answers | The new collapsed preparation guide answers practical questions without permanently expanding the page. Detailed business policies remain to be supplied. | Confirm what clients should wear/prepare, late arrivals and rescheduling before adding exact promises or deadlines. |
| 2 | Business privacy and review policies | A factual privacy dialog now explains local data handling, and a notice above the review form states its draft/sending availability before personal details are entered. | Business controller/contact details, approved retention/moderation policy and a real backend before storing or publishing reviews. Keep private contact fields out of public review content. |
| 2 | Genuine review channels | An actual externally hosted business review profile can be more useful than an unconnected local form. | An owner-verified Google/other review-profile URL or a moderated first-party system. Ask for an honest review, accept the full rating range and do not preselect five stars. |
| 2 | Cancellation, payment and confirmation details | These answer practical purchase questions before customers commit. | Owner-approved notice periods, deposits, accepted methods, refunds and confirmation process. Add Bancontact only after a real payment provider/account supports it and its flow has been tested. |
| 3 | Search visibility for the actual service area | Customers should be able to find the real mobile service and an accurate contact destination. | Confirm public domain, business identity, service area and any real visit address. Configure canonical URLs and language alternatives only for deployed URLs; avoid fake locations, review markup or medical schema. |
| 3 | Recurring visits and gift options | These can help returning customers, but unsupported checkout controls create uncertainty. | Approved prices, inclusions, validity, cancellation/redemption terms and a connected payment workflow before enabling purchases. |

## Improvements implemented in this pass

These changes use existing menu information and factual application behavior. They do not depend on a claimed competitor benchmark.

1. **Compact treatment finder.** A collapsed “Help me choose” panel suggests existing services by occasion and duration, with an optional Antwerp/outside-Antwerp travel choice. Real menu prices and existing travel rules are reused, and the chosen service, duration and travel area carry into the request. Suggestions describe preferences rather than a clinical assessment; the full menu remains available.
2. **Collapsed visit preparation.** Practical guidance covers space/access, comfort and the arrangements to confirm. A link opens the supplied 30-hour massage training record in the existing image viewer. No equipment guarantee, cancellation policy or medical qualification has been invented.
3. **Factual privacy information.** A footer dialog explains page-memory form details, user-controlled copies/downloads and email handoffs, the saved language choice, the session intro flag and external links. It describes the current static app, without claiming that future delivery/storage policies are already configured.
4. **Earlier review expectations and unobscured mobile inputs.** Draft/sending availability appears above the review form. The fixed mobile booking bar is hidden on Reviews so visitors can use the form without it covering the inputs. The existing unselected 1–5 rating and separation of private contact details remain.
5. **Browser-language fallback.** A supported explicit URL language wins, followed by a saved choice; otherwise the first supported French, Dutch or English browser preference is used, including regional variants. English is the final fallback. New guidance is translated, and language is not inferred from a visitor's name or address.

The beige/gold design, compact navigation, original photos, existing prices, reduced-motion support and short skippable intro remain in place. The new guidance panels start collapsed to preserve the limited-scrolling layout. These changes improve the browsing/request experience; they do not connect a live calendar, deliver requests or reviews, activate payments, or establish a public deployment.

## Principles for further work

- Continue to distinguish the next real action from a completed transaction. Once a verified contact method is configured, enable a truthful handoff without implying receipt or reservation.
- Keep estimates, agreed prices and payments separate. Never turn the supplied travel range into a fixed fee without an approved rule.
- Translate added labels, guidance, errors and confirmation states, preserving customer-entered details when switching language.
- Preserve readable contrast, clear focus, sufficiently sized touch controls, reduced motion and usable fallbacks. Keep animation secondary to treatments and contact.

## Owner information that would unlock the largest gains

- Preferred public business email and phone; optional verified messaging/review-profile links.
- Therapist's approved introduction, services offered and accurately described qualifications.
- Business identity/address or mobile-only status, public service area and confirmed opening hours.
- Live calendar/booking provider and how travel buffers, duo appointments and final quotes should work.
- Exact travel, access/parking, cancellation and payment rules; what equipment is brought and what clients should prepare.
- Privacy/review moderation arrangements and any recurring-plan or gift-voucher terms.

Do not block reversible design or guidance improvements while those details are pending. Keep unknown facts out of customer-facing claims and document integration requirements in `docs/CONFIGURATION.md`.

## Validation for any resulting implementation

Check the full customer journey in English, French and Dutch at mobile and desktop widths. Confirm that added guidance does not alter the supplied treatment prices, turn a travel estimate into a fixed charge, reset entered data on language changes, collect unnecessary health details or fabricate a booking/review/payment success. Run the existing relevant tests and verify any new download from a freshly extracted archive.
