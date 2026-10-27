import cv2
import numpy as np
from typing import Tuple

MAX_IMAGE_PIXELS = 40_000_000
ANALYSIS_SIZE = 512


def _decode_and_validate_image(image_bytes: bytes) -> np.ndarray:
    # 3-dimensional RGB matrix
    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None or image.size == 0:
        raise ValueError("Can't read from file.")

    height, width = image.shape[:2]
    if width * height > MAX_IMAGE_PIXELS:
        raise ValueError("The image resolution is too high.")

    return image


def _resize_image_for_analysis(image: np.ndarray, max_size: int = ANALYSIS_SIZE) -> np.ndarray:
    height, width = image.shape[:2]
    scale = min(1.0, max_size / max(height, width))

    if scale >= 1.0:
        return image.copy()

    new_w = max(1, round(width * scale))
    new_h = max(1, round(height * scale))
    return cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


def _get_border_coord(width: int, height: int, margin_box_ratio: float) -> Tuple[int, int]:
    margin_x = max(1, int(width * margin_box_ratio))
    margin_y = max(1, int(height * margin_box_ratio))
    return (margin_x, margin_y)


def _get_border(array: np.ndarray, width: int, height: int, border_box_ratio: float):
    margin_x, margin_y = _get_border_coord(width, height, border_box_ratio)
    border_pixels = np.vstack(
        [
            array[:margin_y, :].reshape(-1, 3),
            array[-margin_y:, :].reshape(-1, 3),
            array[:, :margin_x].reshape(-1, 3),
            array[:, -margin_x:].reshape(-1, 3),
        ]
    )
    return border_pixels


def _get_center_size(width: int, height: int, margin_box_ratio: float) -> Tuple[int, int, int, int]:
    margin_x, margin_y = _get_border_coord(width, height, margin_box_ratio)
    return (margin_x, margin_y, width - 2 * margin_x, height - 2 * margin_y)


def _get_center_coord(width: int, height: int, center_box_ratio: float) -> Tuple[int, int, int, int]:
    x_min = int(width * (0.5 - center_box_ratio / 2))
    x_max = int(width * (0.5 + center_box_ratio / 2))
    y_min = int(height * (0.5 - center_box_ratio / 2))
    y_max = int(height * (0.5 + center_box_ratio / 2))
    return (x_min, x_max, y_min, y_max)


def _get_center(array: np.ndarray, width: int, height: int, center_box_ratio: float):
    (x_min, x_max, y_min, y_max) = _get_center_coord(width, height, center_box_ratio)
    return array[y_min:y_max, x_min:x_max].reshape(-1, 3)
