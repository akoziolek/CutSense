import cv2
import numpy as np
from typing import Tuple, List
import math
from shape_types import PointPCT

MAX_POINTS = 24


def _clean_mask_morphology(bin_mask: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    # create shape that will be used to fill picture
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    # Closing (CLOSE) fills small holes inside the object
    closed = cv2.morphologyEx(bin_mask, cv2.MORPH_CLOSE, kernel)
    # Opening (OPEN) removes small spots outside the object
    opened = cv2.morphologyEx(closed, cv2.MORPH_OPEN, kernel)
    return opened


def _extract_largest_contour(bin_mask: np.ndarray) -> np.ndarray:
    # scan the binary (black/white) mask to find the biggest contour, RETR_EXTERNAL = get only the outer edges
    contours, _ = cv2.findContours(bin_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise ValueError("Failed to determine fabric outline.")

    # return contour with the biggest area
    return max(contours, key=cv2.contourArea)


def _simplify_contour(contour: np.ndarray, frame_size: Tuple[int, int], max_points: int = MAX_POINTS, epsilon_ratio: float = 0.008) -> np.ndarray:
    height, width = frame_size
    perimeter = cv2.arcLength(contour, True)  # obwód of the contour
    epsilon = epsilon_ratio * perimeter  # acceptance level for connecting two lines
    approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)

    # Adaptively increase epsilon if there are too many points > MAX_POINTS
    while len(approx) > max_points and epsilon < 0.05 * math.hypot(width, height):
        epsilon *= 1.25
        approx = cv2.approxPolyDP(contour, epsilon, True).reshape(-1, 2)

    if len(approx) < 3:
        raise ValueError("Not enough points to create a shape")

    return approx


def _normalize_points_to_pct(points: np.ndarray, width: int, height: int) -> List[PointPCT]:
    max_w = max(1, width - 1)
    max_h = max(1, height - 1)

    return [
        {
            "pctX": round(float(pt[0]) / max_w * 100, 2),
            "pctY": round(float(pt[1]) / max_h * 100, 2),
        }
        for pt in points
    ]
