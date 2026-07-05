from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.services.latency import LatencyService

router = APIRouter()
latency_service = LatencyService()


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
