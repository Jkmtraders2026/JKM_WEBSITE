"""Create browser-safe configuration from hosting environment variables."""
import base64
import json
import os
import re
from urllib.parse import urlsplit

VARIABLES = {
    'supabaseUrl': 'JKM_SUPABASE_URL',
    'supabasePublishableKey': 'JKM_SUPABASE_PUBLISHABLE_KEY',
    'turnstileSiteKey': 'JKM_TURNSTILE_SITE_KEY',
}


def public_config(env=None):
    env = os.environ if env is None else env
    values = {key: env.get(name, '').strip() for key, name in VARIABLES.items()}
    if not any(values.values()):
        if env.get('JKM_REQUIRE_BACKEND') == '1':
            raise ValueError('Set all three JKM public backend variables before production deployment.')
        return None
    if not all(values.values()):
        raise ValueError('Set JKM_SUPABASE_URL, JKM_SUPABASE_PUBLISHABLE_KEY and JKM_TURNSTILE_SITE_KEY together.')
    url = urlsplit(values['supabaseUrl'])
    if url.scheme != 'https' or not url.hostname or url.username or url.password or url.path not in ('', '/') or url.query or url.fragment:
        raise ValueError('JKM_SUPABASE_URL must be an HTTPS origin without credentials or a path.')
    values['supabaseUrl'] = values['supabaseUrl'].rstrip('/')
    key = values['supabasePublishableKey']
    if key.startswith('sb_secret_'):
        raise ValueError('A secret key cannot be included in the public website.')
    if not key.startswith('sb_publishable_'):
        try:
            payload = key.split('.')[1]
            claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        except (ValueError, IndexError, UnicodeError):
            raise ValueError('Use a Supabase publishable key or legacy anon key.') from None
        if claims.get('role') != 'anon':
            raise ValueError('Only the legacy anon role is permitted in browser configuration.')
    if not re.fullmatch(r'[A-Za-z0-9_-]{10,200}', values['turnstileSiteKey']):
        raise ValueError('Invalid Turnstile site key.')
    return values


def append_public_config(path, values):
    if values is not None:
        encoded = json.dumps(values, ensure_ascii=True).replace('<', '\\u003c')
        with path.open('a') as file:
            file.write('\nwindow.JKM_CONFIG = Object.freeze({ ...window.JKM_CONFIG, ...' + encoded + ' });\n')
