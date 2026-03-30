import urllib.request
import json
from datetime import datetime

# City coordinates for India (no API key needed)
CITY_COORDS = {
    'bhubaneswar': (20.2961, 85.8245),
    'berhampur':   (19.3149, 84.7941),
    'cuttack':     (20.4625, 85.8830),
    'puri':        (19.8135, 85.8312),
    'rourkela':    (22.2604, 84.8536),
    'sambalpur':   (21.4669, 83.9756),
    'mumbai':      (19.0760, 72.8777),
    'delhi':       (28.6139, 77.2090),
    'bangalore':   (12.9716, 77.5946),
    'hyderabad':   (17.3850, 78.4867),
    'chennai':     (13.0827, 80.2707),
    'kolkata':     (22.5726, 88.3639),
    'pune':        (18.5204, 73.8567),
    'ahmedabad':   (23.0225, 72.5714),
    'jaipur':      (26.9124, 75.7873),
}

WMO_CODES = {
    0:  ('Clear Sky', '☀️'),
    1:  ('Mainly Clear', '🌤️'),
    2:  ('Partly Cloudy', '⛅'),
    3:  ('Overcast', '☁️'),
    45: ('Foggy', '🌫️'),
    48: ('Icy Fog', '🌫️'),
    51: ('Light Drizzle', '🌦️'),
    53: ('Drizzle', '🌦️'),
    55: ('Heavy Drizzle', '🌧️'),
    61: ('Light Rain', '🌧️'),
    63: ('Rain', '🌧️'),
    65: ('Heavy Rain', '🌧️'),
    71: ('Light Snow', '🌨️'),
    73: ('Snow', '❄️'),
    75: ('Heavy Snow', '❄️'),
    80: ('Rain Showers', '🌦️'),
    81: ('Heavy Showers', '🌧️'),
    95: ('Thunderstorm', '⛈️'),
    99: ('Heavy Thunderstorm', '⛈️'),
}

def get_event_advice(weather_code, temp):
    if weather_code in [95, 99]:
        return "⚠️ Thunderstorm expected. Consider rescheduling outdoor events."
    elif weather_code in [61, 63, 65, 80, 81]:
        return "🌧️ Rain expected. Carry an umbrella or prefer indoor venues."
    elif weather_code in [51, 53, 55]:
        return "🌦️ Light drizzle possible. Keep a raincoat handy."
    elif temp > 38:
        return "🥵 Very hot day. Stay hydrated and prefer evening meetups."
    elif temp > 32:
        return "☀️ Hot day. Morning or evening meetups are ideal."
    elif temp < 15:
        return "🧥 Cool weather. Perfect for outdoor activities!"
    else:
        return "✅ Great weather for your event! Enjoy!"

def get_weather(city: str, date: str = ''):
    city_key = city.lower().strip()
    coords = CITY_COORDS.get(city_key)

    if not coords:
        return {
            "success": False,
            "message": f"City '{city}' not found. Supported cities: Bhubaneswar, Mumbai, Delhi, etc.",
            "city": city
        }

    lat, lng = coords

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m"
            f"&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum"
            f"&timezone=Asia/Kolkata&forecast_days=7"
        )

        with urllib.request.urlopen(url, timeout=5) as response:
            data = json.loads(response.read())

        current = data.get('current', {})
        daily   = data.get('daily', {})

        temp        = current.get('temperature_2m', 0)
        wind        = current.get('windspeed_10m', 0)
        humidity    = current.get('relative_humidity_2m', 0)
        wcode       = current.get('weathercode', 0)
        condition, emoji = WMO_CODES.get(wcode, ('Unknown', '🌡️'))

        # Build 7-day forecast
        forecast = []
        dates     = daily.get('time', [])
        max_temps = daily.get('temperature_2m_max', [])
        min_temps = daily.get('temperature_2m_min', [])
        wcodes    = daily.get('weathercode', [])
        precip    = daily.get('precipitation_sum', [])

        for i in range(min(7, len(dates))):
            day_condition, day_emoji = WMO_CODES.get(wcodes[i], ('Unknown', '🌡️'))
            forecast.append({
                "date":      dates[i],
                "day":       datetime.strptime(dates[i], '%Y-%m-%d').strftime('%a'),
                "maxTemp":   max_temps[i],
                "minTemp":   min_temps[i],
                "condition": day_condition,
                "emoji":     day_emoji,
                "rain":      precip[i],
            })

        return {
            "success":    True,
            "city":       city.title(),
            "current": {
                "temperature": temp,
                "condition":   condition,
                "emoji":       emoji,
                "windSpeed":   wind,
                "humidity":    humidity,
            },
            "forecast":   forecast,
            "eventAdvice": get_event_advice(wcode, temp),
            "source":     "Open-Meteo (free, no API key)"
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Weather service error: {str(e)}",
            "city": city
        }
