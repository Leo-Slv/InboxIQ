from __future__ import annotations

from typing import Generic, Optional, TypeVar, Any, List
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiError(BaseModel):
    code: str = Field(default="ERROR")
    message: str
    field: Optional[str] = None


class ApiResponse(BaseModel, Generic[T]):
    message: str
    success: bool
    data: Optional[T] = None
    errors: Optional[List[ApiError]] = None
