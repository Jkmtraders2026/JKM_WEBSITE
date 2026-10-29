# Website form → JKM staff app

The website and app share the `website_requests` table in one Supabase project.
Deploy the versioned backend and `submit-request` function from
[Jkmtraders2026/jkm_webapp](https://github.com/Jkmtraders2026/jkm_webapp).
Follow its [backend setup guide](https://github.com/Jkmtraders2026/jkm_webapp/blob/main/BACKEND_SETUP.md).
Do not deploy the old function before the new shared migrations have run.
The website's function copy remains here for the website handler tests.

For website hosting set the following environment variables and redeploy:

- `JKM_SUPABASE_URL`: actual project HTTPS origin.
- `JKM_SUPABASE_PUBLISHABLE_KEY`: public publishable or legacy anon key.
- `JKM_TURNSTILE_SITE_KEY`: public key for the website Turnstile widget.
- `JKM_REQUIRE_BACKEND=1`: fail a production build if backend settings are absent.

Use `npm run build` with output `dist`. The builder retains social settings and
writes public configuration to the output only. Never use a secret or service-role
key in public configuration. Turnstile server secrets belong in the backend
GitHub environment, not here.

A successful submission returns a reference; unchanged retries in the same page
reuse a submission key. Editing or reloading the form starts a new submission.
The staff app checks its inbox every 30 seconds while visible and not editing.
The default preview remains unconfigured and explicitly directs visitors to
WhatsApp; it never claims an unsaved form has been received.

After deployment, test submission, attachment access, staff status updates and
anonymous/non-staff rejection against the real project.
