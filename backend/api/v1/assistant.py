from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from groq import AsyncGroq

from core.database import get_supabase
from api.v1.auth import get_current_user
from api.v1.weather import get_weather_forecast
from models.schemas import ChatRequest
from core.config import GROQ_API_KEY

router = APIRouter(prefix="/assistant", tags=["AI Fashion Assistant"])


@router.post("/chat")
async def chat_with_assistant(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    user_name = current_user.get("name", "User")

    db = get_supabase()
    items_res = db.table("clothing_items").select("name,category,color,season").eq("user_id", user_id).execute()
    items = items_res.data or []

    if items:
        wardrobe_summary = "\n".join([
            f"- {item['name']} ({item['category']}, {item['color']}, {item.get('season','All')} season)"
            for item in items
        ])
    else:
        wardrobe_summary = "The user has not added any items to their wardrobe yet."

    location = current_user.get("location", "Cairo, Egypt")
    forecasts = []
    try:
        weather_data = await get_weather_forecast(current_user)
        forecasts = weather_data.get("forecast", [])
    except Exception:
        pass

    from datetime import datetime
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    cal_res = db.table("calendar_entries").select("date,outfit_name").eq("user_id", user_id).gte("date", today_str).execute()
    event_map = {e["date"]: e.get("outfit_name", "Unknown Outfit") for e in (cal_res.data or [])}

    context_lines = []
    if forecasts:
        context_lines.append(f"**Location:** {location}")
        context_lines.append(f"**Forecast & Schedule (Starting {today_str}):**")
        for f in forecasts[:7]:
            date_str = f["date"]
            cond = f["description"]
            event = event_map.get(date_str)
            line = f"- {date_str}: {cond}."
            if event:
                line += f" User will wear: '{event}'."
            else:
                line += " No outfit scheduled yet."
            context_lines.append(line)

    schedule_context = "\n".join(context_lines)

    system_prompt = f"""You are Dollaby, an expert AI fashion stylist and personal shopping assistant with deep knowledge of fashion trends, color theory, and style principles.

The user's name is {user_name}. You have access to their personal wardrobe:

**{user_name}'s Wardrobe:**
{wardrobe_summary}

{schedule_context}

Your role is to:
1. Offer personalized styling advice based on what they actually own
2. Suggest outfit combinations from their wardrobe
3. Help them choose what to wear for specific occasions or events
4. Provide fashion tips and style education
5. Be friendly, confident, and encouraging like a high-end personal stylist

Always be concise, friendly, and specific. When suggesting outfit combinations, reference items from their actual wardrobe by name."""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not set in the backend .env file.")

    client = AsyncGroq(api_key=GROQ_API_KEY)

    async def stream_response():
        stream = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            stream=True,
            temperature=0.8,
            max_tokens=600,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    return StreamingResponse(stream_response(), media_type="text/plain")
