from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Iterable

from PIL import Image

from app.core.settings import settings


@dataclass(frozen=True)
class Ratio:
    width: int
    height: int

    @property
    def value(self) -> float:
        return self.width / self.height

    @property
    def label(self) -> str:
        return f"{self.width}:{self.height}"


def parse_ratio(ratio: str) -> Ratio:
    parts = ratio.split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid ratio: {ratio}")
    width, height = (int(part.strip()) for part in parts)
    if width <= 0 or height <= 0:
        raise ValueError(f"Invalid ratio: {ratio}")
    return Ratio(width=width, height=height)


def ensure_dir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def compute_crop_box(
    image_width: int, image_height: int, ratio: Ratio, focal_x: float, focal_y: float
) -> tuple[int, int, int, int]:
    target_ratio = ratio.value
    original_ratio = image_width / image_height

    if original_ratio > target_ratio:
        crop_height = image_height
        crop_width = int(round(crop_height * target_ratio))
    else:
        crop_width = image_width
        crop_height = int(round(crop_width / target_ratio))

    center_x = focal_x * image_width
    center_y = focal_y * image_height

    left = int(round(center_x - crop_width / 2))
    top = int(round(center_y - crop_height / 2))

    left = max(0, min(left, image_width - crop_width))
    top = max(0, min(top, image_height - crop_height))

    right = left + crop_width
    bottom = top + crop_height

    return left, top, right, bottom


def build_variant_path(asset_id: str, ratio: str, width: int, fmt: str) -> str:
    ratio_slug = ratio.replace(":", "x")
    filename = f"{width}.{fmt}"
    return os.path.join(settings.assets_derived_dir, asset_id, ratio_slug, filename)


def generate_variants(
    source_path: str,
    asset_id: str,
    focal_x: float,
    focal_y: float,
    ratios: Iterable[str],
    widths: Iterable[int],
) -> list[dict]:
    variants: list[dict] = []
    with Image.open(source_path) as image:
        image = image.convert("RGB")
        for ratio in ratios:
            ratio_obj = parse_ratio(ratio)
            crop_box = compute_crop_box(
                image_width=image.width,
                image_height=image.height,
                ratio=ratio_obj,
                focal_x=focal_x,
                focal_y=focal_y,
            )
            cropped = image.crop(crop_box)

            for width in widths:
                height = int(round(width / ratio_obj.value))
                resized = cropped.resize((width, height), Image.LANCZOS)

                for fmt in ("webp", "jpg"):
                    output_path = build_variant_path(asset_id, ratio, width, fmt)
                    ensure_dir(os.path.dirname(output_path))

                    if fmt == "webp":
                        resized.save(output_path, format="WEBP", quality=82, method=6)
                    else:
                        resized.save(output_path, format="JPEG", quality=85, optimize=True)

                    variants.append(
                        {
                            "ratio": ratio,
                            "width": width,
                            "height": height,
                            "format": fmt,
                            "path": output_path,
                        }
                    )

    return variants
