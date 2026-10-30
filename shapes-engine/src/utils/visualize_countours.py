import cv2
import numpy as np
from shape_types import ShapeAnalysisResult


def visualize_and_save(image_bytes: bytes, result: ShapeAnalysisResult, output_path: str) -> None:
    img = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image bytes: Image is corrupted or invalid.")

    height, width = img.shape[:2]
    px = [
        [
            int(round(pt["pctX"] / 100.0 * max(1, width - 1))),
            int(round(pt["pctY"] / 100.0 * max(1, height - 1))),
        ]
        for shape in result["shapes"]
        for pt in shape
    ]

    pts_arr = np.array(px, dtype=np.int32).reshape((-1, 1, 2))
    cv2.polylines(img, [pts_arr], isClosed=True, color=(0, 255, 0), thickness=3)

    for x, y in px:
        cv2.circle(img, (x, y), radius=6, color=(0, 0, 255), thickness=-1)

    cv2.imwrite(output_path, img)
