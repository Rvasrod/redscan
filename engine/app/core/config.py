import os
from dataclasses import dataclass


@dataclass
class Settings:
    host: str = "127.0.0.1"
    port: int = 8765
    reload: bool = False
    log_level: str = "INFO"

    @property
    def allowed_origins(self) -> list[str]:
        return [
            "http://localhost:4200",
            "http://127.0.0.1:4200",
            "file://",
        ]

    @property
    def database_path(self) -> str:
        return os.environ.get("DATABASE_PATH", "netsentinel.db")


settings = Settings()
