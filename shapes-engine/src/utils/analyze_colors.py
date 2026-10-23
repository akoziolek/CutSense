import numpy as np
import cv2

from utils.prepare_pixels import _get_border, _get_center_coord, _get_center


def _calc_weighted_lab_distance(lab_img: np.ndarray, target_color: np.ndarray, l_weight: float = 0.2) -> np.ndarray:
    distance_L = lab_img[..., 0].astype(np.float32) - target_color[0]
    distance_A = lab_img[..., 1].astype(np.float32) - target_color[1]
    distance_B = lab_img[..., 2].astype(np.float32) - target_color[2]

    # distance partially ignoring the influence of L value
    weighted_distance = np.sqrt(l_weight * (distance_L**2) + (distance_A**2) + (distance_B**2))

    return weighted_distance


def _extract_color_stats(
    small_image: np.ndarray,
    center_box_ratio: float = 0.20,
    border_box_ratio: float = 0.03,
):
    height, width = small_image.shape[:2]
    # convert to LAB - L (white-black lightness), A (green-red axis), B (blue-yellow axis)
    lab = cv2.cvtColor(small_image, cv2.COLOR_BGR2LAB).astype(np.float32)

    border_pixels = _get_border(lab, width, height, border_box_ratio)
    x_min, x_max, y_min, y_max = _get_center_coord(width, height, center_box_ratio)
    center_pixels = _get_center(lab, width, height, center_box_ratio)

    bg_median = np.median(border_pixels, axis=0)
    fg_median = np.median(center_pixels, axis=0)

    center_bgr = small_image[y_min:y_max, x_min:x_max]
    color_std = float(np.std(center_bgr, axis=(0, 1)).mean())

    return lab, bg_median, fg_median, color_std
