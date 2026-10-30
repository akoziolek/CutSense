from typing import List, Optional, TypedDict


class PointPCT(TypedDict):
    pctX: float
    pctY: float


class ShapeAnalysisResult(TypedDict):
    imageWidth: int
    imageHeight: int
    shapes: List[List[PointPCT]]
