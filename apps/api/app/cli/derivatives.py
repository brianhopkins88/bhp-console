from __future__ import annotations

import argparse
import sys

from sqlalchemy import delete, select

from app.core.settings import settings
from app.db.session import SessionLocal
from packages.domain.models.assets import Asset, AssetVariant
from app.services.assets import generate_variants


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate asset derivatives.")
    parser.add_argument("--asset-id", help="Only process a single asset ID.")
    parser.add_argument(
        "--ratios",
        help="Comma-separated ratios (e.g. 3:2,5:7,1:1). Defaults to settings.",
    )
    parser.add_argument(
        "--widths",
        help="Comma-separated widths (e.g. 800,1200,2000). Defaults to settings.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ratios = (
        [ratio.strip() for ratio in args.ratios.split(",") if ratio.strip()]
        if args.ratios
        else settings.assets_derivative_ratios
    )
    widths = (
        [int(width.strip()) for width in args.widths.split(",") if width.strip()]
        if args.widths
        else settings.assets_derivative_widths
    )

    db = SessionLocal()
    try:
        query = select(Asset)
        if args.asset_id:
            query = query.where(Asset.id == args.asset_id)

        assets = db.execute(query).scalars().all()
        if not assets:
            print("No assets found.")
            return 0

        for asset in assets:
            db.execute(
                delete(AssetVariant).where(
                    AssetVariant.asset_id == asset.id,
                    AssetVariant.version == settings.assets_derivatives_version,
                )
            )
            db.commit()

            variants = generate_variants(
                source_path=asset.original_path,
                asset_id=asset.id,
                focal_x=asset.focal_x,
                focal_y=asset.focal_y,
                ratios=ratios,
                widths=widths,
            )

            for variant in variants:
                db.add(
                    AssetVariant(
                        asset_id=asset.id,
                        ratio=variant["ratio"],
                        width=variant["width"],
                        height=variant["height"],
                        format=variant["format"],
                        path=variant["path"],
                        version=settings.assets_derivatives_version,
                    )
                )
            db.commit()
            print(f"Generated {len(variants)} variants for asset {asset.id}")
    finally:
        db.close()

    return 0


if __name__ == "__main__":
    sys.exit(main())
