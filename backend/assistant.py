from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from groq import AsyncGroq
import os
from database import get_database
from auth import get_current_user
from models import ChatRequest

router = APIRouter(prefix="/assistant", tags=["AI Fashion Assistant"])


@router.post("/chat")
async def chat_with_assistant(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """
    AI Fashion Assistant: interprets styling questions using GPT-4o
    with the user's personal wardrobe as context.
    """
    user_id = str(current_user["_id"])
    user_name = current_user.get("name", "User")

    # Fetch user's wardrobe to use as personal context
    items = await db["clothing_items"].find({"user_id": user_id}).to_list(length=500)

    if items:
        wardrobe_summary = "\n".join([
            f"- {item['name']} ({item['category']}, {item['color']}, {item.get('season','All')} season)"
            for item in items
        ])
    else:
        wardrobe_summary = "The user has not added any items to their wardrobe yet."

    # Fetch weather & upcoming calendar
    location = current_user.get("location", "Cairo, Egypt")
    from weather import get_weather_forecast
    try:
        weather_data = await get_weather_forecast(current_user)
        forecasts = weather_data.get("forecast", [])
    except Exception:
        forecasts = []

    from datetime import datetime
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    upcoming_events = await db["calendar"].find({"user_id": user_id, "date": {"$gte": today_str}}).to_list(length=14)
    event_map = {e["date"]: e.get("outfit_name", "Unknown Outfit") for e in upcoming_events}

    context_lines = []
    if forecasts:
        context_lines.append(f"**Location:** {location}")
        context_lines.append(f"**Forecast & Schedule (Starting {today_str}):**")
        for f in forecasts[:7]:  # Provide 7 days of context
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

    # Build message history
    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not set in the backend .env file.")
    client = AsyncGroq(api_key=api_key)

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
