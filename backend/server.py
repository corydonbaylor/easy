from flask import Flask, send_from_directory
from flask import request
import random

app = Flask(__name__)

# Path for our main Svelte page
@app.route("/")
def base():
    return send_from_directory('../frontend/public', 'index.html')

# Path for all the static files (compiled JS/CSS, etc.)
@app.route("/<path:path>")
def home(path):
    return send_from_directory('../frontend/public', path)


@app.route("/rand")
def hello():
    return str(random.randint(0, 100))

@app.route("/location")
def get_country():

    headers_list = request.headers.getlist("X-Forwarded-For")
    user_ip = headers_list[0] if headers_list else request.remote_addr

    try:
        response = requests.get("http://ip-api.com/json/{}".format(user_ip))
        js = response.json()
        country = js['countryCode']
        return country
    except Exception as e:
        return str(user_ip)

# Send 404 errors to index and let front end handle routing
@app.errorhandler(404)   
def not_found(e):  
    return send_from_directory('../frontend/public', 'index.html')

if __name__ == "__main__":
    app.run(debug=True)
