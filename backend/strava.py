from flask import Flask, redirect, request, jsonify, url_for
import requests
from dotenv import load_dotenv
import os
import time
import urllib3

app = Flask(__name__)
load_dotenv()
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

CLIENT_ID = os.getenv('CLIENT_ID')
CLIENT_SECRET = os.getenv('CLIENT_SECRET')
STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize'
STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token'

REDIRECT_URI = 'http://127.0.0.1:3000/exchange_token' 
SCOPE = 'read_all,activity:read_all'

AUTH_URL = 'https://www.strava.com/oauth/token'
REFRESH_TOKEN = os.getenv('REFRESH_TOKEN')

payload = {
    'client_id':CLIENT_ID,
    'client_secret':CLIENT_SECRET,
    'refresh_token':REFRESH_TOKEN,
    'grant_type':'refresh_token',
    'f':'json'
}



if __name__ == '__main__':
    res = requests.post(AUTH_URL, data=payload, verify=False)
    print(res)