from fastapi import APIRouter, Depends, HTTPException
import httpx
from datetime import datetime
from auth import get_current_user

router = APIRouter(prefix="/weather", tags=["Weather"])

# Mapping WMO Weather codes to readable conditions and icons
def get_weather_info(code: int):
    # WMO code map
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
    # Geocode using OpenStreetMap Nominatim
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
    # 1. Get user location
    location = current_user.get("location", "Cairo, Egypt")
    
    # 2. Get Coordinates
    coords = await get_coordinates(location)
    if not coords:
        # Fallback to Cairo if geocoding fails
        lat, lon = 30.0444, 31.2357
    else:
        lat, lon = coords

    # 3. Get Weather from Open-Meteo
    async with httpx.AsyncClient() as client:
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "timezone": "auto",
            "forecast_days": 14
        }
        res = await client.get(url, params=params)
        if res.status_code != 200:
            raise HTTPException(status_code=503, detail="Weather service unavailable")
        data = res.json()

    # 4. Format Daily Forecast
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])
    codes = daily.get("weather_code", [])

    forecasts = []
    for i in range(len(dates)):
        condition, icon = get_weather_info(codes[i])
        forecasts.append({
            "date": dates[i],
            "maxText": f"{round(max_temps[i])}°",
            "minText": f"{round(min_temps[i])}°",
            "condition": condition,
            "icon": icon,
            "description": f"{condition}, High {round(max_temps[i])}°C, Low {round(min_temps[i])}°C"
        })

    return {
        "location": location,
        "forecast": forecasts
    }
