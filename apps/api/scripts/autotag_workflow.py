from __future__ import annotations

import os
import sys
import time

import httpx
from PIL import Image


def main() -> None:
    api_base = os.getenv("BHP_API_BASE_URL", "http://localhost:8001").rstrip("/")
    payload = _build_test_image()

    with httpx.Client(timeout=30.0) as client:
        upload = client.post(
            f"{api_base}/api/v1/assets/upload",
            files={"file": ("autotag-test.jpg", payload, "image/jpeg")},
            data={"generate_derivatives": "false"},
        )
        upload.raise_for_status()
        asset = upload.json()
        asset_id = asset.get("id")
        if not asset_id:
            raise SystemExit("Upload response missing asset id.")

        auto_tag = client.post(f"{api_base}/api/v1/assets/{asset_id}/auto-tag")
        auto_tag.raise_for_status()

        for _ in range(10):
            status = client.get(
                f"{api_base}/api/v1/assets/auto-tag/status",
                params={"asset_ids": [asset_id]},
            )
            status.raise_for_status()
            jobs = status.json()
            if jobs:
                job = jobs[0]
                if job.get("status") == "completed":
                    break
                if job.get("status") == "failed":
                    raise SystemExit(f"Auto-tag failed: {job.get('error_message')}")
            time.sleep(3)
        else:
            raise SystemExit("Auto-tag job did not complete in time.")

        asset_response = client.get(f"{api_base}/api/v1/assets/{asset_id}")
        asset_response.raise_for_status()
        refreshed = asset_response.json()
        tags = refreshed.get("tags", [])
        if not tags:
            raise SystemExit("No tags returned after auto-tagging.")

        delete = client.delete(f"{api_base}/api/v1/assets/{asset_id}")
        delete.raise_for_status()

        print("Auto-tag workflow passed.")
        print("Asset id:", asset_id)
        print("Tags:", tags)


def _build_test_image() -> bytes:
    image = Image.new("RGB", (256, 256), color=(120, 180, 200))
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=70)
    return output.getvalue()


if __name__ == "__main__":
    import io

    main()
