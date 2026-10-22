import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import test from 'node:test';
const origin = 'https://jkm.example';
function setup({ captcha = true, dbError = false, uploadError = false } = {}) {
  let handler;
  const stored = [];
  const deleted = [];
  let uploads = 0;
  const source = readFileSync(
    new URL('../supabase/functions/submit-request/index.ts', import.meta.url),
    'utf8',
  )
    .replace(/^import .*;\n/, '')
    .replace('export function', 'function');
  const db = {
    storage: {
      from: () => ({
        upload: async (path) => {
          uploads++;
          return { error: uploadError ? new Error('upload') : null };
        },
        remove: async (paths) => {
          deleted.push(...paths);
          return { error: null };
        },
      }),
    },
    from: () => ({
      insert: async (row) => {
        stored.push(row);
        return { error: dbError ? new Error('db') : null };
      },
    }),
  };
  const env = {
    ALLOWED_ORIGINS: origin,
    TURNSTILE_SECRET_KEY: 'test-only',
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
  };
  const sandbox = {
    Deno: {
      env: { get: (key) => env[key] },
      serve: (fn) => {
        handler = fn;
      },
    },
    createClient: () => db,
    Response,
    Request,
    FormData,
    Blob,
    File,
    URL,
    TextDecoder,
    Uint8Array,
    crypto,
    AbortSignal,
    fetch: async () =>
      new Response(JSON.stringify({ success: captcha, hostname: 'jkm.example' }), {
        headers: { 'content-type': 'application/json' },
      }),
  };
  vm.runInNewContext(stripTypeScriptTypes(source), sandbox);
  return {
    handler,
    stored,
    deleted,
    get uploads() {
      return uploads;
    },
  };
}
function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    full_name: 'Test Buyer',
    email: 'buyer@example.com',
    phone: '+255700000000',
    service: 'sourcing',
    destination: 'Dar es Salaam',
    message: 'Please source 500 sample packaging boxes.',
    consent: 'on',
    captcha_token: 'test-token',
    ...overrides,
  }))
    data.set(key, value);
  return data;
}
function request(data = form(), override = {}) {
  return new Request('https://example.supabase.co/functions/v1/submit-request', {
    method: 'POST',
    headers: { origin },
    body: data,
    ...override,
  });
}
test('rejects an unapproved origin before processing', async () => {
  const ctx = setup();
  assert.equal(
    (await ctx.handler(request(form(), { headers: { origin: 'https://untrusted.example' } })))
      .status,
    403,
  );
  assert.equal(ctx.stored.length, 0);
});
test('rejects missing consent and invalid fields', async () => {
  const ctx = setup();
  assert.equal((await ctx.handler(request(form({ consent: '', email: 'invalid' })))).status, 400);
  assert.equal(ctx.stored.length, 0);
});
test('rejects failed CAPTCHA without uploads or writes', async () => {
  const ctx = setup({ captcha: false });
  assert.equal((await ctx.handler(request())).status, 400);
  assert.equal(ctx.stored.length, 0);
  assert.equal(ctx.uploads, 0);
});
test('rejects disguised image attachment', async () => {
  const ctx = setup();
  const data = form();
  data.append('attachments', new File(['not a PNG'], 'fake.png', { type: 'image/png' }));
  assert.equal((await ctx.handler(request(data))).status, 400);
  assert.equal(ctx.stored.length, 0);
});
test('valid enquiry saves and returns only a reference', async () => {
  const ctx = setup();
  const response = await ctx.handler(request());
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.match(result.reference, /^JKM-\d{8}-[A-F0-9]{12}$/);
  assert.deepEqual(Object.keys(result), ['reference']);
  assert.equal(ctx.stored[0].email, 'buyer@example.com');
});
test('cleans up uploaded attachments after database failure', async () => {
  const ctx = setup({ dbError: true });
  const data = form();
  data.append(
    'attachments',
    new File(['%PDF-1.4\nTest'], 'example.pdf', { type: 'application/pdf' }),
  );
  assert.equal((await ctx.handler(request(data))).status, 500);
  assert.equal(ctx.uploads, 1);
  assert.equal(ctx.deleted.length, 1);
});
test('preflight allows only configured origins and methods', async () => {
  const ctx = setup();
  const response = await ctx.handler(
    new Request('https://example.supabase.co/functions/v1/submit-request', {
      method: 'OPTIONS',
      headers: { origin },
    }),
  );
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
});
