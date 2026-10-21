from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from src.boundary_detection import analyze_fabric_shape

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
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller.")

    try:
        return analyze_fabric_shape(image_bytes)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
