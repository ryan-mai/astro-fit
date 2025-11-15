from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
WEATHER_KEY = os.getenv('WEATHER_API_KEY')
WEATHER_URL = 'https://api.weatherapi.com/v1/current.json'

@app.route('/api/weather', methods=['GET'])
def weather():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    if not lat or not lng:
        return jsonify({'error': 'missing lat/lng'}), 400
    if not WEATHER_KEY:
        return jsonify({'error': 'missing api key'}), 400

    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except ValueError:
        return jsonify({'error': 'invalid lat/lng'}), 400

    params = {
        'key': WEATHER_KEY,
        'q': f"{lat_f},{lng_f}",
        'aqi': 'no',
    }
    res = requests.get(WEATHER_URL, params=params, timeout=8)
    content_type = res.headers.get('Content-Type', 'application/json')
    return Response(res.content, status=res.status_code, content_type=content_type)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)