import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sos import handle_sos
from icebreaker import generate_icebreaker
from weather import get_weather

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "sidekick-safety-services"})

# ── SOS SAFETY ALERT ─────────────────────────────────────
@app.route('/sos', methods=['POST'])
def sos():
    data = request.get_json() or {}
    return jsonify(handle_sos(data))

# ── ICEBREAKER GENERATOR ──────────────────────────────────
@app.route('/icebreaker', methods=['POST'])
def icebreaker():
    data = request.get_json() or {}
    interests_a = data.get('interests_a', [])
    interests_b = data.get('interests_b', [])
    if not interests_a or not interests_b:
        return jsonify({"error": "interests_a and interests_b are required"}), 400
    return jsonify(generate_icebreaker(interests_a, interests_b))

# ── WEATHER CHECKER ───────────────────────────────────────
@app.route('/weather', methods=['POST'])
def weather():
    data = request.get_json() or {}
    city = data.get('city', '')
    date = data.get('date', '')
    if not city:
        return jsonify({"error": "city is required"}), 400
    return jsonify(get_weather(city, date))

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8003))
    app.run(host='0.0.0.0', port=port)
