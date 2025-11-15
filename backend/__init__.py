from flask import Flask
app = Flask(__name__)

from .strava_api import *

if __name__ == '__main__':
    app.run(debug=True, port=3000)