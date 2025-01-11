from fastapi import HTTPException
from fastapi import status as http_status
from typing import Optional, Dict, Any
from pydantic import BaseModel

class ErrorResponse(BaseModel):
    detail: str
    error_type: str
    context: Optional[Dict[str, Any]] = None

class DatabaseError(HTTPException):
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                detail=detail,
                error_type="database_error",
                context=context
            ).dict()
        )

class AIServiceError(HTTPException):
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                detail=detail,
                error_type="ai_service_error",
                context=context
            ).dict()
        )

class QueryError(HTTPException):
    def __init__(self, detail: str, context: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                detail=detail,
                error_type="query_error",
                context=context
            ).dict()
        )