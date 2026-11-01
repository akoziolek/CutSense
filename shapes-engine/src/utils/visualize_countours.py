import cv2
import numpy as np
from shape_types import ShapeAnalysisResult
import cv2
import numpy as np
from shape_types import ShapeAnalysisResult


def visualize_and_save(image_bytes: bytes, result: ShapeAnalysisResult, output_path: str) -> None:
    img = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image bytes: Image is corrupted or invalid.")

    height, width = img.shape[:2]
    shapes_list = result["shapes"]

    for shape_idx, shape in enumerate(shapes_list):
        if not shape:
            continue

        px_points = [
            [
                int(round(pt["pctX"] / 100.0 * max(1, width - 1))),
                int(round(pt["pctY"] / 100.0 * max(1, height - 1))),
            ]
            for pt in shape
        ]

        if len(px_points) < 3:
            continue

        pts_arr = np.array(px_points, dtype=np.int32).reshape((-1, 1, 2))

        cv2.polylines(img, [pts_arr], isClosed=True, color=(0, 255, 0), thickness=3)

        for x, y in px_points:
            cv2.circle(img, (x, y), radius=6, color=(0, 0, 255), thickness=-1)

        if len(shapes_list) > 1:
            label = f"#{shape_idx + 1}"
            label_pos = (px_points[0][0], max(20, px_points[0][1] - 8))
            cv2.putText(
                img,
                label,
                label_pos,
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 0, 0),
                2,
            )

    cv2.imwrite(output_path, img)
