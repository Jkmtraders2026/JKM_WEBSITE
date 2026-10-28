import base64
import json
import tempfile
import unittest
from pathlib import Path
from build_config import public_config, append_public_config


class ConfigurationTests(unittest.TestCase):
    def values(self, key='sb_publishable_test_key'):
        return {'JKM_SUPABASE_URL': 'https://example.supabase.co/',
                'JKM_SUPABASE_PUBLISHABLE_KEY': key,
                'JKM_TURNSTILE_SITE_KEY': 'site-key-for-test'}

    def test_unconfigured_local_preview_is_explicit(self):
        self.assertIsNone(public_config({}))
        with self.assertRaises(ValueError):
            public_config({'JKM_REQUIRE_BACKEND': '1'})

    def test_partial_configuration_is_rejected(self):
        with self.assertRaises(ValueError):
            public_config({'JKM_SUPABASE_URL': 'https://example.supabase.co'})

    def test_secret_and_service_role_keys_are_rejected(self):
        service = base64.urlsafe_b64encode(json.dumps({'role': 'service_role'}).encode()).decode().rstrip('=')
        for key in ['sb_secret_do_not_publish', 'header.' + service + '.signature']:
            with self.assertRaises(ValueError):
                public_config(self.values(key))

    def test_public_config_is_normalised_and_preserves_social_settings(self):
        config = public_config(self.values())
        self.assertEqual(config['supabaseUrl'], 'https://example.supabase.co')
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'config.js'
            target.write_text('window.JKM_CONFIG = {social: {instagram: "https://example.com"}};')
            append_public_config(target, config)
            self.assertIn('...window.JKM_CONFIG', target.read_text())
            self.assertIn('https://example.com', target.read_text())

    def test_credentials_and_insecure_urls_are_rejected(self):
        for url in ['http://example.com', 'https://user:password@example.com', 'https://example.com/other']:
            values = self.values(); values['JKM_SUPABASE_URL'] = url
            with self.assertRaises(ValueError): public_config(values)


if __name__ == '__main__':
    unittest.main()
