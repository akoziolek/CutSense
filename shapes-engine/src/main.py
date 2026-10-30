from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from segmentation.boundary_detection_fabric import analyze_fabric_shape
from segmentation.boundary_detection_pattern import analyze_pattern_shape

MAX_IMAGE_SIZE = 5 * 1024 * 1024

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Python API works!!!"}


@app.post("/analyze-fabric-boundary")
async def analyze_fabric_boundary(request: Request):
    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="An image is required.")
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")

    try:
        return analyze_fabric_shape(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/analyze-pattern-boundary")
async def analyze_pattern_boundary(request: Request):
    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="An image is required")
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be 5MB or smaller")
    try:
        return analyze_pattern_shape(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
