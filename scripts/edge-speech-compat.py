"""Compatibility for Microsoft's October 2026 Edge speech endpoint migration.

The voice list remains on Bing; synthesis now uses the Edge services host.
See https://github.com/rany2/edge-tts/pull/491. Remove once the pinned package
includes both this endpoint change and locale-independent HTTP date parsing.
"""
from datetime import timezone
from email.utils import parsedate_to_datetime


def parse_http_date(value):
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.timestamp()


def configure_edge_speech():
    import edge_tts.communicate as client
    from edge_tts import constants
    from edge_tts.drm import DRM

    if 'speech.platform.bing.com/consumer/speech/synthesize/readaloud' in client.WSS_URL:
        endpoint = (
            'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1'
            '?Ocp-Apim-Subscription-Key=' + constants.TRUSTED_CLIENT_TOKEN
        )
        # communicate imports the URL by value, so update both locations.
        client.WSS_URL = endpoint
        constants.WSS_URL = endpoint
    DRM.parse_rfc2616_date = staticmethod(parse_http_date)
