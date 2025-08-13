import os, json, re
from typing import Any, Dict, Optional, Tuple
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

# Load env BEFORE creating client
load_dotenv()
if not os.getenv("OPENAI_API_KEY"):
    # Do not crash on import; throw on first request instead
    pass

router = APIRouter()
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

class AskRequest(BaseModel):
    user_prompt: str
    fix_version: Optional[str] = "4.4"
    draft_fix: Optional[str] = None

class AskResponse(BaseModel):
    answer: str
    action: Dict[str, Any]

SYSTEM_TEMPLATE = """You are a FIX Protocol assistant for traders and developers.
- Be concise and practical.
- Default to FIX {fix_version}.
- Return BOTH: (1) a short plain-English answer; (2) a JSON action following the schema.
- action.type ∈ ["answer_only","build_fix","validate_fix","explain_tag"].
- For 'build_fix', include payload: version, msgType, fields[], rendered.
- For 'validate_fix', include payload: issues[], suggestedFix{} (optional).
- For 'explain_tag', include payload: tag, name, versionNotes.
- If OrdType=2 (Limit), Price(44) is required. If OrdType=1 (Market), omit Price.
"""

def _parse_answer_and_action(content: str) -> Tuple[str, Dict[str, Any]]:
    m = re.search(r"```(?:json)?\s*(\{[\s\S]*?\})\s*```", content)
    if not m:
        return content.strip(), {"type": "answer_only", "payload": {}}
    answer = content[:m.start()].strip()
    try:
        action = json.loads(m.group(1))
        if not isinstance(action, dict):
            action = {"type":"answer_only","payload":{}}
    except Exception:
        action = {"type":"answer_only","payload":{}}
    return answer, action

@router.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set on the server.")
    client = OpenAI(api_key=api_key)

    system = SYSTEM_TEMPLATE.replace("{fix_version}", req.fix_version or "4.4")
    user = f"User prompt: {req.user_prompt}\nFIX version: {req.fix_version}\nCurrent draft (if any): {req.draft_fix or 'None'}"

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            temperature=0.2,
            max_tokens=700,
            messages=[
                {"role":"system","content":system},
                {"role":"user","content":user},
            ],
        )
        content = completion.choices[0].message.content or ""
        answer, action = _parse_answer_and_action(content)
        return AskResponse(answer=answer, action=action)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI call failed: {e}")
