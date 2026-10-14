"""Verify endpoint migration and HTTP date handling without calling the service."""
import importlib.util
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('speech_compat', Path(__file__).with_name('edge-speech-compat.py'))
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)


class SpeechCompatibility(unittest.TestCase):
    def test_http_dates_and_invalid_headers(self):
        expected = datetime(2026, 10, 12, 3, 16, 9, tzinfo=timezone.utc).timestamp()
        for date in ['Mon, 12 Oct 2026 03:16:09 GMT', 'Mon, 12 Oct 2026 03:16:09 +0000', 'Mon, 12 Oct 2026 03:16:09']:
            self.assertEqual(compat.parse_http_date(date), expected)
        for date in ['', 'not a date', None]:
            self.assertIsNone(compat.parse_http_date(date))

    def test_synthesis_migration_preserves_voice_listing(self):
        edge = types.ModuleType('edge_tts')
        client = types.ModuleType('edge_tts.communicate')
        constants = types.ModuleType('edge_tts.constants')
        drm = types.ModuleType('edge_tts.drm')
        client.WSS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=test-token'
        constants.WSS_URL = client.WSS_URL
        constants.TRUSTED_CLIENT_TOKEN = 'test-token'
        constants.VOICE_LIST = 'https://speech.platform.bing.com/voices/list'
        drm.DRM = type('DRM', (), {})
        edge.communicate = client
        edge.constants = constants
        edge.drm = drm
        with patch.dict(sys.modules, {'edge_tts': edge, 'edge_tts.communicate': client, 'edge_tts.constants': constants, 'edge_tts.drm': drm}):
            compat.configure_edge_speech()
            self.assertEqual(client.WSS_URL, 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1?Ocp-Apim-Subscription-Key=test-token')
            self.assertEqual(constants.WSS_URL, client.WSS_URL)
            self.assertEqual(constants.VOICE_LIST, 'https://speech.platform.bing.com/voices/list')
            self.assertEqual(drm.DRM.parse_rfc2616_date('Mon, 12 Oct 2026 03:16:09 GMT'), compat.parse_http_date('Mon, 12 Oct 2026 03:16:09 GMT'))
            future_endpoint = 'wss://future-supported.example/speech'
            client.WSS_URL = future_endpoint
            compat.configure_edge_speech()
            self.assertEqual(client.WSS_URL, future_endpoint, 'Do not replace a newer native endpoint')


if __name__ == '__main__':
    unittest.main()
