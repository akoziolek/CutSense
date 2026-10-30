from pathlib import Path
from typing import List, Optional, cast
import cv2
import numpy as np
from ultralytics import YOLO
from ultralytics.engine.results import Results

from shape_types import ShapeAnalysisResult, PointPCT
from utils.visualize_countours import visualize_and_save
from utils.prepare_pixels import _decode_and_validate_image
from utils.process_contours import _simplify_contour, _normalize_points_to_pct

# for now local placement of weights
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / "weights" / "best.pt"


def _load_model() -> YOLO:
    yolo_model: Optional[YOLO] = None
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}.")
    yolo_model = YOLO(str(MODEL_PATH))
    return yolo_model


def analyze_pattern_shape(image_bytes: bytes) -> ShapeAnalysisResult:
    image = _decode_and_validate_image(image_bytes)
    img_h, img_w = image.shape[:2]

    model = _load_model()
    # params = confidence threshold, Intersection over Union (iou) - when two intersecting shapes mean that they are one
    results = cast(List[Results], model.predict(source=image, conf=0.42, iou=0.45, verbose=False))
    result = results[0]

    shapes: List[List[PointPCT]] = []

    if result.masks is not None:
        for mask in result.masks.xy:
            pts_px = mask.astype(np.int32)
            if len(pts_px) < 3:
                continue

            approx_pts = _simplify_contour(pts_px, frame_size=(img_h, img_w), max_points=20, epsilon_ratio=0.004)
            pattern_points = _normalize_points_to_pct(approx_pts, img_w, img_h)

            if len(pattern_points) >= 3:
                shapes.append(pattern_points)

    return {
        "imageWidth": img_w,
        "imageHeight": img_h,
        "shapes": shapes,
    }


if __name__ == "__main__":
    CURRENT_FILE = Path(__file__).resolve()
    FOLDER_PATH = CURRENT_FILE.parent.parent.parent / "sample-images" / "patterns" / "test"
    RESULTS_DIR = FOLDER_PATH.parent / "results_patterns"
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    EXTENSIONS = ("*.jpg", "*.jpeg", "*.png", "*.webp")
    IMAGE_PATHS = sorted(
        [f for ext in EXTENSIONS for f in FOLDER_PATH.glob(ext)],
        key=lambda x: x.name.lower(),
    )
    SELECTED_INDEX = None

    if not IMAGE_PATHS:
        print(f"ERROR - no images found in: {FOLDER_PATH}")
    else:
        todo = (
            list(enumerate(IMAGE_PATHS)) if SELECTED_INDEX is None else [(SELECTED_INDEX, IMAGE_PATHS[SELECTED_INDEX])]
        )
        for idx, path in todo:
            try:
                data = path.read_bytes()
                print(f"File [{idx}]: {path.name}")
                res = analyze_pattern_shape(data)

                target = RESULTS_DIR
                target.mkdir(parents=True, exist_ok=True)
                out = target / f"result_{path.stem}.jpg"
                visualize_and_save(data, res, str(out))

                shapes_count = len(res.get("shapes", []))
                total_points = sum(len(s) for s in res.get("shapes", []))
                print(f"SUCCESS shapes={shapes_count} total_points={total_points} -> {out}\n")
            except Exception as err:
                print(f"ERROR file [{idx}] {path.name}: {err}\n")
