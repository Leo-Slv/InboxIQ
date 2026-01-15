from __future__ import annotations

from typing import Optional, TypeVar, List
from app.domain.models.api_response import ApiResponse, ApiError

T = TypeVar("T")


def ok(data: T, message: str = "OK") -> ApiResponse[T]:
    return ApiResponse[T](message=message, success=True, data=data, errors=None)


def fail(
    message: str,
    errors: Optional[List[ApiError]] = None,
) -> ApiResponse[None]:
    return ApiResponse[None](message=message, success=False, data=None, errors=errors or [])
