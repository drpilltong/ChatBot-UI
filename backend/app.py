import os
from typing import Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai

# 초기 설정
load_dotenv()                                 # .env 읽기
openai.api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI(title="Pi-Chatbot Backend")

origins = [
    "http://localhost:8080",      # python -m http.server
    "http://127.0.0.1:8080",
    "http://localhost:5500",      # VS Code Live Server
    "http://127.0.0.1:5500",
]

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = (
    "You are '닥터필', a friendly Korean health-assistant chatbot. "
    "Answer briefly, clearly, and in Korean unless asked otherwise."
)

# 자료구조: 대화별 메모리 (RAM 보관)
conversations: Dict[str, List[dict]] = {}

# Pydantic 모델
class ChatRequest(BaseModel):
    chat_id: str | None = None
    message: str

class ChatResponse(BaseModel):
    reply: str

# 유틸: GPT 호출
def generate_reply(chat_id: str, user_msg: str) -> str:
    history = conversations.setdefault(chat_id, [])
    messages = (
        [{"role": "system", "content": SYSTEM_PROMPT}]
        + history
        + [{"role": "user", "content": user_msg}]
    )

    resp = openai.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0.7,
    )
    assistant_msg = resp.choices[0].message.content.strip()

    # 메모리에 대화 저장(최근 20개만 보존)
    history.extend(
        [{"role": "user", "content": user_msg},
         {"role": "assistant", "content": assistant_msg}]
    )
    conversations[chat_id] = history[-20:]
    return assistant_msg

# 엔드포인트
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest):
    if not payload.message.strip():
        raise HTTPException(400, detail="Empty message.")
    chat_id = payload.chat_id or "default"
    try:
        reply = generate_reply(chat_id, payload.message)
        return ChatResponse(reply=reply)
    except Exception as e:
        raise HTTPException(500, detail=str(e))
