from __future__ import annotations

import os
import sys
import tempfile

from PIL import Image

API_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, API_ROOT)

from app.core.settings import settings  # noqa: E402
from app.services import ai_tagging  # noqa: E402


def main() -> None:
    if not settings.openai_api_key:
        raise SystemExit("BHP_OPENAI_API_KEY is not set.")

    with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
        image = Image.new("RGB", (256, 256), color=(120, 180, 200))
        image.save(tmp.name, format="JPEG", quality=70)

        data_url = ai_tagging._build_image_data_url(
            tmp.name, max_width=settings.openai_tagging_image_max_width
        )

    response = ai_tagging._request_tagging(data_url, ai_tagging.SERVICE_TAGS)
    service_tags = response.get("service_tags", [])
    suggested_tags = response.get("suggested_tags", [])

    if not isinstance(service_tags, list) or not isinstance(suggested_tags, list):
        raise SystemExit("Unexpected response schema from OpenAI.")

    allowed = set(ai_tagging.SERVICE_TAGS)
    for item in service_tags:
        tag = item.get("tag")
        if tag not in allowed:
            raise SystemExit(f"Unexpected service tag: {tag}")

    print("Auto-tag smoke test passed.")
    print("Service tags:", service_tags)
    print("Suggested tags:", suggested_tags)


if __name__ == "__main__":
    main()
