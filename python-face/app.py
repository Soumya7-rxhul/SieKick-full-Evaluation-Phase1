import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from face_verify import simulate_face_verify

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "sidekick-face-verify"})

@app.route('/face-verify', methods=['POST'])
def face_verify():
    data = request.get_json() or {}
    result = simulate_face_verify(data.get('descriptor', ''))
    return jsonify(result)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8001))
    app.run(host='0.0.0.0', port=port)
