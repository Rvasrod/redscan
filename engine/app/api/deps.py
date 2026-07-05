from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status


async def verify_engine_ready() -> bool:
    return True
