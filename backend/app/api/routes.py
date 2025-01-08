from fastapi import APIRouter, Depends, HTTPException
from ..core.security import get_api_key
from ..models.schemas import ChatRequest, ChatResponse
from ..core.config import settings
from ..core.query_executor import AIQueryExecutor, AIConfig, DatabaseConfig
from typing import Dict
import uuid

router = APIRouter()

# Store chat histories (in-memory for now, could be moved to Redis/DB)
chat_histories: Dict[str, list] = {}


@router.post("/chat", response_model=ChatResponse)
async def chat(
        request: ChatRequest,
        api_key: str = Depends(get_api_key)
):
    try:
        # Initialize AI query executor with current settings
        ai_config = AIConfig(
            provider=settings.AI_PROVIDER,
            api_key=settings.AI_API_KEY,
            model=settings.AI_MODEL,
            temperature=settings.AI_TEMPERATURE,
            max_tokens=settings.AI_MAX_TOKENS
        )

        db_config = DatabaseConfig(
            type=settings.DB_TYPE,
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            user=settings.DB_USER,
            password=settings.DB_PASSWORD,
            database=settings.DB_NAME,
            ssl=settings.DB_SSL
        )

        executor = AIQueryExecutor(ai_config, db_config)

        # Generate and execute query
        result = await executor.execute_query(request.message)

        # Store in chat history
        if request.conversation_id:
            if request.conversation_id not in chat_histories:
                chat_histories[request.conversation_id] = []
            chat_histories[request.conversation_id].append({
                "role": "user",
                "content": request.message
            })

        # Prepare response
        if result["success"]:
            response_message = f"I've executed your query. Here are the results:\n\nSQL Query:\n```sql\n{result['sql']}\n```\n\n"
            if result.get("results"):
                response_message += f"\nFound {result['row_count']} results."

            # Store assistant's response in chat history
            if request.conversation_id:
                chat_histories[request.conversation_id].append({
                    "role": "assistant",
                    "content": response_message
                })

            return ChatResponse(
                message=response_message,
                sql=result["sql"],
                results=result.get("results"),
            )
        else:
            error_message = result.get("error", "Unknown error occurred")
            raise HTTPException(status_code=400, detail=error_message)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'executor' in locals():
            executor.disconnect()


@router.post("/conversations")
async def create_conversation():
    conversation_id = str(uuid.uuid4())
    chat_histories[conversation_id] = []
    return {"conversation_id": conversation_id}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    if conversation_id not in chat_histories:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"messages": chat_histories[conversation_id]}