import json

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from app.models.port_scan import PortScanRequest, PortScanResult, SCAN_TYPES
from app.services.port_scanner import PortScannerService

router = APIRouter()


@router.post("/ports", response_model=PortScanResult)
async def scan_ports(request: PortScanRequest):
    try:
        scanner = PortScannerService()
        return await scanner.scan(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types", response_model=list[str])
async def get_scan_types():
    return SCAN_TYPES


@router.websocket("/ws/ports")
async def websocket_port_scan(websocket: WebSocket):
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        data = json.loads(raw)
        request = PortScanRequest(**data)

        async def send_progress(message: str):
            await websocket.send_text(json.dumps({"type": "progress", "message": message}))

        await send_progress("Starting port scan...")
        scanner = PortScannerService()
        result = await scanner.scan(request, progress_callback=send_progress)

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
