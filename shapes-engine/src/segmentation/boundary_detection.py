from pathlib import Path

import cv2
import numpy as np

from utils.prepare_pixels import _decode_and_validate_image, _resize_image_for_analysis, _get_center_size
from utils.process_contours import (
    _clean_mask_morphology,
    _extract_largest_contour,
    _simplify_contour,
    _normalize_points_to_pct,
)
from utils.analyze_colors import _calc_weighted_lab_distance, _extract_color_stats
from utils.visualize_countours import visualize_and_save
from shape_types import ShapeAnalysisResult


def _segment_fabric_grabcut(small_image: np.ndarray, border_box_ratio: float = 0.03) -> np.ndarray:
    height, width = small_image.shape[:2]
    rect = _get_center_size(width, height, border_box_ratio)

    # initialy 0, without user input
    mask = np.zeros((height, width), np.uint8)
    background_model = np.zeros((1, 65), np.float64)
    foreground_model = np.zeros((1, 65), np.float64)

    # 5 iterations, space outside the rect is for sure background
    #  grabCut classifies if pixels in rectangle are possible object/background
    cv2.grabCut(small_image, mask, rect, background_model, foreground_model, 5, cv2.GC_INIT_WITH_RECT)

    # Creates a binary mask: 255 BL for definite/probable fabric pixels (GC_FGD/GC_PR_FGD), 0 WH for background
    bin_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    return bin_mask


def _segment_fabric_LAB_comparison(
    small_image: np.ndarray,
    center_box_ratio: float = 0.20,
    border_box_ratio: float = 0.03,
    l_weight: float = 0.2,  # shadow
) -> np.ndarray:
    height, width = small_image.shape[:2]
    lab, background_median, foreground_median, _ = _extract_color_stats(
        small_image, center_box_ratio=center_box_ratio, border_box_ratio=border_box_ratio
    )

    distance_to_background = _calc_weighted_lab_distance(lab, background_median, l_weight)
    distance_to_foreground = _calc_weighted_lab_distance(lab, foreground_median, l_weight)

    # 255 white = foreground, 0 black - background
    bin_mask = np.where(distance_to_foreground < distance_to_background, 255, 0).astype(np.uint8)
    cleaned_mask = _clean_mask_morphology(bin_mask, 9)

    contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solid_mask = np.zeros((height, width), dtype=np.uint8)
    if contours:
        largest_cnt = max(contours, key=cv2.contourArea)
        cv2.drawContours(solid_mask, [largest_cnt], -1, 255, thickness=cv2.FILLED)

    return solid_mask


def _segment_fabric_hybrid(
    small_image: np.ndarray,
    center_box_ratio: float = 0.20,
    border_box_ratio: float = 0.03,
    l_weight: float = 0.2,
    variance_threshold: float = 53.0,  # pattern threshold
    min_contrast_threshold: float = 35.0,  # (fabric vs background)
) -> np.ndarray:
    _, background_median, foreground_median, color_std = _extract_color_stats(
        small_image, center_box_ratio=center_box_ratio, border_box_ratio=border_box_ratio
    )

    bg_fg_dist = float(_calc_weighted_lab_distance(foreground_median, background_median, l_weight))

    is_low_contrast = bg_fg_dist < min_contrast_threshold
    is_patterned = color_std > variance_threshold

    if is_patterned or is_low_contrast:
        return _segment_fabric_grabcut(small_image)
    else:
        return _segment_fabric_LAB_comparison(
            small_image,
            center_box_ratio=center_box_ratio,
            border_box_ratio=border_box_ratio,
            l_weight=l_weight,
        )


def analyze_fabric_shape(image_bytes: bytes) -> ShapeAnalysisResult:
    image = _decode_and_validate_image(image_bytes)
    img_h, img_w = image.shape[:2]

    small = _resize_image_for_analysis(image)
    sh, sw = small.shape[:2]

    raw_mask = _segment_fabric_hybrid(small)
    # clean_mask = _clean_mask_morphology(raw_mask)
    largest_cnt = _extract_largest_contour(raw_mask)
    simplified_pts = _simplify_contour(largest_cnt, frame_size=(sh, sw))
    normalized_points = _normalize_points_to_pct(simplified_pts, width=sw, height=sh)

    return {
        "status": "success",
        "imageWidth": img_w,
        "imageHeight": img_h,
        "points": normalized_points,
    }


if __name__ == "__main__":
    CURRENT_FILE = Path(__file__).resolve()
    FOLDER_PATH = CURRENT_FILE.parent.parent.parent / "sample-images" / "fabrics"
    RESULTS_DIR = FOLDER_PATH.parent / "results_9_HYBRID"
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    EXTENSIONS = ("*.jpg", "*.jpeg", "*.png", "*.webp")
    IMAGE_PATHS = sorted(
        [f for ext in EXTENSIONS for f in FOLDER_PATH.glob(ext)],
        key=lambda x: x.name.lower(),
    )
    SELECTED_INDEX = None

    if not IMAGE_PATHS:
        print(f"ERROR - no images: {IMAGE_PATHS}")
    else:
        todo = (
            list(enumerate(IMAGE_PATHS)) if SELECTED_INDEX is None else [(SELECTED_INDEX, IMAGE_PATHS[SELECTED_INDEX])]
        )
        for idx, path in todo:
            try:
                data = path.read_bytes()
                print(f"File [{idx}]: {path.name}")
                res = analyze_fabric_shape(data)

                target = RESULTS_DIR
                target.mkdir(parents=True, exist_ok=True)
                out = target / f"result_{path.stem}.jpg"
                visualize_and_save(data, res, str(out))
                print(f"SUCESS points={len(res['points'])} -> {out}\n")
            except Exception as err:
                print(f"ERROR file [{idx}] {path.name}: {err}\n")
