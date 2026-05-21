"""Ingest Sentinel-2 optical imagery for floating plastic detection (Biermann et al. 2020).

This is a stub illustrating the workflow. Full implementation requires
`sentinelhub-py` and credentials.
"""

from __future__ import annotations

import argparse


def search_sentinel_scenes(
    bbox: tuple[float, float, float, float],
    start: str,
    end: str,
    max_cloud_cover: float = 20.0,
) -> list[dict]:
    """Search for Sentinel-2 L2A scenes over the bbox with low cloud cover."""
    # In production: use sentinelhub-py SentinelHubCatalog
    print(f"[stub] searching Sentinel-2 scenes: bbox={bbox}, {start}..{end}, max_cloud={max_cloud_cover}")
    return []


def detect_floating_plastic(scene_id: str) -> dict:
    """Apply Floating Debris Index (FDI) + NDVI to detect plastic patches.

    Based on Biermann et al. 2020 (Scientific Reports).
    Returns a dict with detected pixel locations and confidence.
    """
    print(f"[stub] FDI/NDVI detection on scene {scene_id}")
    return {"scene_id": scene_id, "detections": []}


def main() -> None:
    parser = argparse.ArgumentParser(description="Search Sentinel-2 scenes")
    parser.add_argument("--bbox", required=True)
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    args = parser.parse_args()

    bbox = tuple(map(float, args.bbox.split(",")))
    scenes = search_sentinel_scenes(bbox, args.start, args.end)
    print(f"Found {len(scenes)} scenes (stub)")


if __name__ == "__main__":
    main()
