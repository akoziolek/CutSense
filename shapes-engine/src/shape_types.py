from typing import List, Optional, TypedDict


class PointPCT(TypedDict):
    pctX: float
    pctY: float


class ShapeAnalysisResult(TypedDict):
    status: str
    imageWidth: int
    imageHeight: int
    points: List[PointPCT]
