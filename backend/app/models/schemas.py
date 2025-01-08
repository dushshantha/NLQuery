# app/models/schemas.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    sql: Optional[str] = None
    results: Optional[List[Dict[str, Any]]] = None
    error: Optional[str] = None

class DatabaseConfig(BaseModel):
    type: str
    host: str
    port: int
    user: str
    password: str
    database: str
    ssl: bool = False

class AIConfig(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None
    temperature: float = 0
    max_tokens: int = 1000