from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    python_version: str
