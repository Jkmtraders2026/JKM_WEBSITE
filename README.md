# JKM Global Traders

A responsive, buildless HTML5, modern CSS and vanilla JavaScript website using navy `#10243A` and orange `#FF7E00`. Each page is a real HTML file with its own content and URL; no JavaScript router is needed. There is no CSS5 specification; the site uses current responsive CSS.

## Pages

Home, About, Services, Products & Industries, Our Process, Order Support, Contact / Request a Quote, six service-detail pages, Staff Portal, Privacy and Terms: **16 pages**.

Contact numbers: +255766109131 and +255699830601. WhatsApp uses **+255699830601**. Social buttons announce that links are pending; set real URLs in `assets/js/config.js` when supplied.

## Local use and checks

Serve this folder with `python3 -m http.server 4173`. Open `http://localhost:4173`. No package install is needed. `npm run check` checks JavaScript syntax, every internal page/asset link, image decoding and contact destinations (Python Pillow required for the image check). `npm run build` regenerates the HTML from `scripts/build_site.py`; edit that source when changing page content. CSS and JS are directly editable in `assets/`.

Run `npm run build`, then deploy `dist/` as a static website to your chosen host (GitHub Pages, Netlify or Vercel). Publish only the intended website files; do not publish local secrets. No production host or custom domain has been configured by this implementation. After the final domain is known, add canonical metadata, sitemap.xml and robots.txt using that actual domain.

## Supabase setup — required before online forms work

The integration code is included, but no live Supabase project has been supplied. Forms never pretend a request was saved: until configured, they direct visitors to WhatsApp. Order support sends a user-confirmed WhatsApp message; it is not live public shipment tracking.

1. Select the intended Supabase project and apply `supabase/migrations/202610220001_website_requests.sql` through the SQL editor or CLI. Review existing schema before applying it to a shared project; do not overwrite existing production tables.
2. Create a Cloudflare Turnstile widget for the actual website hostname(s).
3. Set Edge Function secrets: `ALLOWED_ORIGINS` (comma-separated exact HTTPS origins, e.g. `https://your-actual-domain`), `TURNSTILE_SECRET_KEY`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions. Never copy the service-role key to the browser or GitHub.
4. Deploy `submit-request`: `supabase functions deploy submit-request --no-verify-jwt`. This endpoint is intentionally public for prospective clients, with exact-origin checks, server-validated Turnstile, request/file size limits, file signature checks and server-side field validation. It is not an authenticated staff endpoint. Turnstile is mandatory, not a bypassable client toggle. Additional server-side rate limiting can be added if required by traffic.
5. In `assets/js/config.js`, set `supabaseUrl`, `supabasePublishableKey` (the public publishable or legacy anon key) and `turnstileSiteKey`. Set no secret keys here.
6. Create/invite staff users through Supabase Auth. In the SQL editor, add each authorised Auth UUID: `insert into public.staff_members(user_id) values ('ACTUAL_AUTH_USER_UUID');`. Public signup cannot grant staff membership.
7. Staff sign in on `portal.html`. They can see the latest 100 requests, filter by status, read details, open short-lived private attachment links and change statuses.
8. Before launch, run a live smoke test: submit a real test request, verify its reference and files as staff, update its status, confirm anonymous and non-staff users cannot select or insert table rows or access files. Test invalid/expired CAPTCHA, disallowed origins and oversized/disguised files. Delete test records through the administrator after review.

### Data and access

`website_requests` holds enquiry fields, a generated reference and attachment metadata. `staff_members` grants authorised access. Files use the private `request-files` bucket. No public table INSERT, SELECT or storage policy exists. The Edge Function alone writes new requests; staff may SELECT requests and UPDATE only the status column. Membership is checked in RLS, not just in the interface. Files uploaded before a failed database insert are removed on the handled error path. A network failure can leave submission outcome uncertain; the website tells the customer to check with staff before resending. Consider an orphan-file cleanup task and retention rules before operating at scale.

This is a foundation for the planned web app, **not** a full order/accounting platform. Quotations, purchases, invoices, client accounts and shipment milestones can be linked to each request in the next phase, with separate customer ownership policies. Do not expose enquiries using only their reference number.

## Content and imagery

No client testimonials, trade volumes, company history, physical office address, licences or performance statistics are invented. Product categories are illustrative sourcing categories, not claims of stock. Review service scope and privacy/terms with the company before public launch.

Four illustrative photos are downloaded into `assets/images/`, so images do not depend on external hotlinks. See `assets/images/CREDITS.md`. The logo derives from the approved JKM brand artwork. Google Fonts supplies DM Sans and Manrope; system fonts provide an offline fallback. The staff page loads pinned Supabase JS 2.49.8 from jsDelivr. Turnstile is loaded only when configured.

## Automated intake tests

Run `npm test` on Node 24+. Seven mocked Edge Function tests cover origin restrictions, required fields, CAPTCHA rejection, disguised files, successful submissions, upload cleanup after database failure and preflight CORS. These validate handler logic without contacting production; they do not replace live Supabase/RLS tests.

## Validation limits

Static checks and browser inspection can run without Supabase. Database policies, storage, login and end-to-end submission must be tested against the actual Supabase project after configuration; no live backend verification is claimed.
