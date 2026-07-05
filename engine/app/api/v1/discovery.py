import asyncio
import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.models.discovery import NetworkInfo, DiscoveryResult
from app.services.discovery import DiscoveryService

router = APIRouter()
discovery_service = DiscoveryService()


@router.get("/network", response_model=NetworkInfo)
async def get_network_info():
    try:
        return await discovery_service.get_network_info()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan", response_model=DiscoveryResult)
async def scan_network():
    try:
        return await discovery_service.scan_devices()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/ws/scan")
async def websocket_scan(websocket: WebSocket):
    await websocket.accept()
    try:
        async def send_progress(message: str):
            await websocket.send_text(json.dumps({"type": "progress", "message": message}))

        await send_progress("Starting discovery scan...")
        result = await discovery_service.scan_devices(progress_callback=send_progress)

        await websocket.send_text(json.dumps({
            "type": "complete",
            "data": result.model_dump(),
        }))
        await websocket.close()
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e),
            }))
            await websocket.close()
        except WebSocketDisconnect:
            pass
