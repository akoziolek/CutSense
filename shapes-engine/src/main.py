import os
import secrets
from fastapi import Depends, FastAPI, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader

from segmentation.boundary_detection_fabric import analyze_fabric_shape
from segmentation.boundary_detection_pattern import analyze_pattern_shape

MAX_IMAGE_SIZE = 5 * 1024 * 1024
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)
EXPECTED_API_KEY = os.environ["INTERNAL_API_KEY"]

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


async def verify_api_key(api_key: str | None = Security(api_key_header)) -> None:
    if not api_key or not secrets.compare_digest(api_key, EXPECTED_API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )


async def get_validated_image(request: Request) -> bytes:
    content_length = request.headers.get("content-length")
    if content_length is not None:
        if not content_length.isdigit():
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.")
        if int(content_length) > MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")

    image_bytes = await request.body()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="An image is required.")
    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")

    return image_bytes


@app.get("/")
def read_root():
    return {"status": "ok", "message": "Python API works!!!"}


@app.post("/analyze-fabric-boundary", dependencies=[Depends(verify_api_key)])
async def analyze_fabric_boundary(image_bytes: bytes = Depends(get_validated_image)):
    try:
        return analyze_fabric_shape(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.post("/analyze-pattern-boundary", dependencies=[Depends(verify_api_key)])
async def analyze_pattern_boundary(image_bytes: bytes = Depends(get_validated_image)):
    try:
        return analyze_pattern_shape(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
