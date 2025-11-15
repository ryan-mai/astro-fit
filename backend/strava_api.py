from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import os
import time
from dotenv import load_dotenv
import urllib3

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
AUTH_URL = 'https://www.strava.com/oauth/token'
ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities'
REFRESH_TOKEN = os.getenv('REFRESH_TOKEN')

access_token = None
token_expiry = 0
activities_cache = {'data': None, 'ts': 0, 'ttl': 60}
def refresh_access_token(force=False):
    global access_token, token_expiry

    if not force and access_token and time.time() < token_expiry - 30:
        return
    
    if not CLIENT_ID or not CLIENT_SECRET or not REFRESH_TOKEN:
        app.logger.error("Missing ids")
        return
    
    payload = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': REFRESH_TOKEN,
        'grant_type': 'refresh_token',
        'f': 'json'
    }
    res = requests.post(AUTH_URL, data=payload, verify=False)

    if not res.ok:
        app.logger.error(f'Failed token refresh: {res.status_code} - {res.text}')
        return

    data = res.json()
    access_token = data.get('access_token')
    if not access_token:
        app.logger.error('Token refresh succeeded but no access_token returned')
        return

    expiry = int(data.get('expires_in', 21600))
    token_expiry = time.time() + expiry
    app.logger.info(f'Refreshed token, next expires in: {expiry} seconds')

def parse_rate_headers(headers):
    limit = headers.get('X-Ratelimit-Limit', '0,0').split(',')[0]
    usage = headers.get('X-Ratelimit-Usage', '0,0').split(',')[0]

    try:
        short_limit = int(limit[0])
        long_limit = int(limit[1]) if (len(limit)) > 1 else 0
        short_usage = int(usage[0])
        long_usage = int(usage[1]) if (len(usage)) > 1 else 0

        return (short_limit, long_limit, short_usage, long_usage)
    except ValueError:
        return 0, 0, 0, 0

@app.route('/activities', methods=['GET'])
def get_activities():
    force_refresh = request.args.get('force', 'false').lower() == 'true'
    
    if not force_refresh and activities_cache['data'] and time.time() - activities_cache['ts'] < activities_cache['ttl']:
        return jsonify(activities_cache['data'])
    
    refresh_access_token(force=force_refresh)

    if not access_token:
        return jsonify({'error': 'Access token invalid'}), 503

    header = {'Authorization': f'Bearer {access_token}'}
    param = {
        'per_page': request.args.get('per_page', 30),
        'page': request.args.get('page', 1),
        'before': request.args.get('before'),
        'after': request.args.get('after')
    }
    res = requests.get(ACTIVITIES_URL, headers=header, params=param, verify=False)
    
    short_limit, long_limit, short_usage, long_usage = parse_rate_headers(res.headers)

    if (short_limit and short_usage and (short_usage / short_limit) > 0.8):
        app.logger.warning(f'High api usage: {short_usage} (Rate Limit: {short_limit})')

    if res.status_code == 429:
        retry = int(res.headers.get('Retry-After', '60'))
        app.logger.warning(f'Strava rate limited, retrying after {retry}')
        return jsonify({'error': 'rate_limited', 'retry_after': retry}), 429

    if res.status_code == 200:
        data = res.json()
        activities_cache['data'] = data
        activities_cache['ts'] = time.time()
        return jsonify(data)
    else:
        app.logger.error(f'There was an error - {res.status_code}: {res.text}')
        return jsonify({'error': res.text}), res.status_code

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3000, debug=True)