from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.models.latency import LatencyMeasurement
from app.services.latency import LatencyService

router = APIRouter()
latency_service = LatencyService()


@router.post("/measure", response_model=LatencyMeasurement)
async def measure_latency(target: str = "gateway"):
    try:
        return await latency_service.measure(target)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws")
async def latency_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            target = data.get("target", "gateway")
            measurement = await latency_service.measure(target)
            await websocket.send_json(measurement.model_dump())
    except WebSocketDisconnect:
        pass
