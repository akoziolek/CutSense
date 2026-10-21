import math
from pathlib import Path
from typing import List, Optional, Tuple, TypedDict

import cv2
import numpy as np

MAX_IMAGE_PIXELS = 40_000_000
ANALYSIS_SIZE = 512
MAX_POINTS = 24


class PointPCT(TypedDict):
    pctX: float
    pctY: float


class ShapeAnalysisResult(TypedDict):
    status: str
    method_used: str
    score: float
    imageWidth: int
    imageHeight: int
    points: List[PointPCT]


def _decode_and_validate_image(image_bytes: bytes) -> np.ndarray:
    # 3-dimensional RGB matrix
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("Can't read from file.")

    img_h, img_w = image.shape[:2]
    if img_w * img_h > MAX_IMAGE_PIXELS:
        raise ValueError("The image resolution is too high.")

    return image


def _resize_image_for_analysis(image: np.ndarray, max_size: int = ANALYSIS_SIZE) -> np.ndarray:
    """Resizes the image preserving aspect ratio (faster computing)"""
    img_h, img_w = image.shape[:2]
    scale = min(1.0, max_size / max(img_h, img_w))

    if scale >= 1.0:
        return image.copy()

    new_w = max(1, round(img_w * scale))
    new_h = max(1, round(img_h * scale))
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def _segment_fabric_grabcut(small_image: np.ndarray, margin_pct: float = 0.03) -> np.ndarray:
    """Segments the object using the GrabCut algorithm based on a rectangular bounding frame."""
    sh, sw = small_image.shape[:2]
    # 0 matrix of the photo size
    mask = np.zeros((sh, sw), np.uint8)
    bgd_model = np.zeros((1, 65), np.float64)
    fgd_model = np.zeros((1, 65), np.float64)

    # margin 3% of the photo
    m_x = max(1, int(sw * margin_pct))
    m_y = max(1, int(sh * margin_pct))
    # rectangle where the fabric would be (x, y, width, height)
    rect = (m_x, m_y, sw - 2 * m_x, sh - 2 * m_y)

    # 5 iterations, space outside the rect is for sure background
    # rectangle is a possible_object, grabCut classifies if pixels are possible object/background
    cv2.grabCut(small_image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)

    # Creates a binary mask: 255 BL for definite/probable fabric pixels (GC_FGD/GC_PR_FGD), 0 WH for background
    bin_mask = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    return bin_mask


def _clean_mask_morphology(bin_mask: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """Removes noise and fills small holes in the binary mask using morphological operations."""
    # create shape 5/5 that will be used to fill picture
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    # Closing (CLOSE) fills small holes inside the object
    closed = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel)
    # Opening (OPEN) removes small spots outside the object
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
    return opened


def _extract_largest_contour(bin_mask: np.ndarray) -> np.ndarray:
    """Finds and returns the largest contour on the binary mask."""
    # scan the binary (black/white) mask to find the biggest contour, RETR_EXTERNAL = get only the outer edges
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("Failed to determine fabric outline.")

    # return the biggest
    return max(contours, key=cv2.contourArea)


def _simplify_contour(contour: np.ndarray, frame_size: Tuple[int, int], max_points: int = MAX_POINTS) -> np.ndarray:
    """Simplifies the polygon contour using the Douglas-Peucker algorithm up to max_points limit."""
    sh, sw = frame_size
    perimeter = cv2.arcLength(contour, True)  # obwód of the contour
    epsilon = 0.008 * perimeter # acceptance level for connecting two lines
    approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)

    # Adaptively increase epsilon if there are too many points > MAX_POINTS
    while len(approx) > max_points and epsilon < 0.05 * math.hypot(sw, sh):
        epsilon *= 1.25
        approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)

    if len(approx) < 3:
        raise ValueError("Not enough points to create a shape")

    return approx


def _normalize_points_to_pct(points: np.ndarray, width: int, height: int) -> List[PointPCT]:
    """Converts points from analytical image pixels to percentage values (0-100%)."""
    max_w = max(1, width - 1)
    max_h = max(1, height - 1)

    return [
        {
            "pctX": round(float(pt[0]) / max_w * 100, 2),
            "pctY": round(float(pt[1]) / max_h * 100, 2),
        }
        for pt in points
    ]


def analyze_fabric_shape(image_bytes: bytes, debug_prefix: Optional[Path] = None) -> ShapeAnalysisResult:
    image = _decode_and_validate_image(image_bytes)
    img_h, img_w = image.shape[:2]

    small = _resize_image_for_analysis(image, max_size=ANALYSIS_SIZE)
    sh, sw = small.shape[:2]

    bin_mask = _segment_fabric_grabcut(small, margin_pct=0.03)

    cleaned_mask = _clean_mask_morphology(bin_mask, kernel_size=5)

    largest_cnt = _extract_largest_contour(cleaned_mask)

    simplified_pts = _simplify_contour(largest_cnt, frame_size=(sh, sw), max_points=MAX_POINTS)

    points_pct = _normalize_points_to_pct(simplified_pts, width=sw, height=sh)

    return {
        "status": "success",
        "method_used": "grabcut_rect_simple",
        "score": 1.0,
        "imageWidth": img_w,
        "imageHeight": img_h,
        "points": points_pct,
    }


def visualize_and_save(image_bytes: bytes, result: ShapeAnalysisResult, output_path: str) -> None:
    img = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    height, width = img.shape[:2]
    px = [
        [
            int(round(pt["pctX"] / 100.0 * max(1, width - 1))),
            int(round(pt["pctY"] / 100.0 * max(1, height - 1))),
        ]
        for pt in result["points"]
    ]
    cv2.polylines(img, [np.array(px, dtype=np.int32).reshape((-1, 1, 2))], True, (0, 255, 0), 3)
    for x, y in px:
        cv2.circle(img, (x, y), 6, (0, 0, 255), -1)
    cv2.imwrite(output_path, img)


if __name__ == "__main__":
    CURRENT_FILE = Path(__file__).resolve()
    FOLDER_PATH = CURRENT_FILE.parent.parent / "sample-images" / "fabrics"
    RESULTS_DIR = FOLDER_PATH.parent / "results"
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    EXTENSIONS = ("*.jpg", "*.jpeg", "*.png", "*.webp")
    IMAGE_PATHS = sorted(
        [f for ext in EXTENSIONS for f in FOLDER_PATH.glob(ext)],
        key=lambda x: x.name.lower(),
    )
    SELECTED_INDEX = None

    if not IMAGE_PATHS:
        print(f"ERROR - no images: {FOLDER_PATH}")
    else:
        todo = (
            list(enumerate(IMAGE_PATHS)) if SELECTED_INDEX is None else [(SELECTED_INDEX, IMAGE_PATHS[SELECTED_INDEX])]
        )
        for idx, path in todo:
            try:
                data = path.read_bytes()
                print(f"File [{idx}]: {path.name}")
                res = analyze_fabric_shape(data)

                target = RESULTS_DIR / res["method_used"]
                target.mkdir(parents=True, exist_ok=True)
                out = target / f"result_{path.stem}.jpg"
                visualize_and_save(data, res, str(out))
                print(f"SUCESS {res['method_used']} score={res['score']} points={len(res['points'])} -> {out}\n")
            except Exception as err:
                print(f"ERROR file [{idx}] {path.name}: {err}\n")
