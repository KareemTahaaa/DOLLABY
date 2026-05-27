from fastapi import APIRouter, Depends, HTTPException
import httpx
from api.v1.auth import get_current_user

router = APIRouter(prefix="/weather", tags=["Weather"])


def get_weather_info(code: int):
    mapping = {
        0: ("Clear", "☀️"),
        1: ("Mostly Clear", "🌤️"),
        2: ("Partly Cloudy", "⛅"),
        3: ("Overcast", "☁️"),
        45: ("Fog", "🌫️"),
        48: ("Fog", "🌫️"),
        51: ("Drizzle", "💧"),
        53: ("Drizzle", "💧"),
        55: ("Drizzle", "💧"),
        56: ("Freezing Drizzle", "❄️💧"),
        57: ("Freezing Drizzle", "❄️💧"),
        61: ("Rain", "🌧️"),
        63: ("Rain", "🌧️"),
        65: ("Heavy Rain", "🌧️"),
        66: ("Freezing Rain", "🌧️❄️"),
        67: ("Freezing Rain", "🌧️❄️"),
        71: ("Snow", "❄️"),
        73: ("Snow", "❄️"),
        75: ("Heavy Snow", "❄️❄️"),
        77: ("Snow Grains", "❄️"),
        80: ("Showers", "🌦️"),
        81: ("Showers", "🌦️"),
        82: ("Heavy Showers", "🌧️"),
        85: ("Snow Showers", "❄️"),
        86: ("Snow Showers", "❄️"),
        95: ("Thunderstorm", "⛈️"),
        96: ("Thunderstorm", "⛈️"),
        99: ("Thunderstorm", "⛈️"),
    }
    return mapping.get(code, ("Unknown", "🌤️"))


async def get_coordinates(city: str):
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": city, "format": "json", "limit": 1},
                headers={"User-Agent": "DollabyApp/1.0"}
            )
            data = res.json()
            if data and len(data) > 0:
                return float(data[0]["lat"]), float(data[0]["lon"])
        except Exception:
            pass
    return None


@router.get("/forecast")
async def get_weather_forecast(current_user: dict = Depends(get_current_user)):
    location = current_user.get("location", "Cairo, Egypt")

    coords = await get_coordinates(location)
    if not coords:
        lat, lon = 30.0444, 31.2357
    else:
        lat, lon = coords

    # Try primary then fallback Open-Meteo endpoint
    weather_urls = [
        "https://api.open-meteo.com/v1/forecast",
        "https://historical-forecast-api.open-meteo.com/v1/forecast",
    ]
    params = {
        "latitude": lat,
        "longitude": lon,
        "daily": "weather_code,temperature_2m_max,temperature_2m_min",
        "timezone": "auto",
        "forecast_days": 14,
    }
    data = None
    async with httpx.AsyncClient(timeout=8.0) as client:
        for url in weather_urls:
            try:
                res = await client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    break
            except Exception:
                continue
    if data is None:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    daily = data.get("daily", {})
    dates = daily.get("time", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])
    codes = daily.get("weather_code", [])

    forecasts = []
    for i in range(len(dates)):
        max_t = max_temps[i] if i < len(max_temps) and max_temps[i] is not None else 0
        min_t = min_temps[i] if i < len(min_temps) and min_temps[i] is not None else 0
        code  = codes[i] if i < len(codes) and codes[i] is not None else 0
        condition, icon = get_weather_info(code)
        forecasts.append({
            "date": dates[i],
            "maxText": f"{round(max_t)}°",
            "minText": f"{round(min_t)}°",
            "condition": condition,
            "icon": icon,
            "description": f"{condition}, High {round(max_t)}°C, Low {round(min_t)}°C"
        })

    return {
        "location": location,
        "forecast": forecasts
    }
