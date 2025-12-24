#!/usr/bin/env python3
import argparse
import mimetypes
import os
from pathlib import Path
from typing import Iterable

import httpx


DEFAULT_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def iter_assets(root: Path, extensions: set[str]) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in extensions:
            yield path


def upload_file(
    client: httpx.Client,
    api_base_url: str,
    file_path: Path,
    generate_derivatives: bool,
    tags: str | None,
    dry_run: bool,
) -> bool:
    if dry_run:
        print(f"[dry-run] {file_path}")
        return True

    url = f"{api_base_url.rstrip('/')}/api/v1/assets/upload"
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    data: dict[str, str] = {
        "generate_derivatives": "true" if generate_derivatives else "false"
    }
    if tags:
        data["tags"] = tags

    with file_path.open("rb") as handle:
        files = {"file": (file_path.name, handle, mime_type)}
        response = client.post(url, data=data, files=files)

    if response.status_code >= 400:
        print(f"[error] {file_path} -> {response.status_code}: {response.text}")
        return False

    print(f"[ok] {file_path}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Seed a staging API by uploading local image assets."
    )
    parser.add_argument(
        "--api-base-url",
        default=None,
        help="API base URL (e.g. https://bhp-console.onrender.com)",
    )
    parser.add_argument("--dir", required=True, help="Directory of images to upload.")
    parser.add_argument(
        "--tags",
        default=None,
        help="Comma-separated tags to apply to all uploads.",
    )
    parser.add_argument(
        "--extensions",
        default=",".join(sorted(DEFAULT_EXTENSIONS)),
        help="Comma-separated extensions to include (default: jpg,jpeg,png,webp).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional max number of files to upload.",
    )
    parser.add_argument(
        "--no-derivatives",
        action="store_true",
        help="Disable derivative generation during upload.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be uploaded without calling the API.",
    )

    args = parser.parse_args()
    api_base_url = args.api_base_url or os.getenv("BHP_SEED_API_BASE_URL")
    ca_bundle = (
        os.getenv("BHP_CA_BUNDLE")
        or os.getenv("SSL_CERT_FILE")
        or os.getenv("REQUESTS_CA_BUNDLE")
    )
    verify: bool | str = ca_bundle if ca_bundle else True

    if not api_base_url:
        print("Missing --api-base-url. Example: https://bhp-console.onrender.com")
        return 2

    root = Path(args.dir).expanduser().resolve()
    if not root.exists():
        print(f"Directory not found: {root}")
        return 2

    extensions = {ext.strip().lower() for ext in args.extensions.split(",") if ext.strip()}
    if not extensions:
        print("No extensions provided.")
        return 2

    files = list(iter_assets(root, extensions))
    if args.limit is not None:
        files = files[: args.limit]

    if not files:
        print("No matching files found.")
        return 0

    failures = 0
    with httpx.Client(timeout=60, verify=verify) as client:
        for file_path in files:
            ok = upload_file(
                client,
                api_base_url,
                file_path,
                generate_derivatives=not args.no_derivatives,
                tags=args.tags,
                dry_run=args.dry_run,
            )
            if not ok:
                failures += 1

    if failures:
        print(f"{failures} uploads failed.")
        return 1

    print(f"Uploaded {len(files)} assets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
