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

    # we need to get the users ip address rather than the proxy ip address
    headers_list = request.headers.getlist("X-Forwarded-For")
    user_ip = headers_list[0] if headers_list else request.remote_addr
    api = "http://ip-api.com/json/"
    ip = str(user_ip)
    test = api + ip

    response = requests.get(test)
    js = response.json()
    country = js['countryCode']
    return country


# Send 404 errors to index and let front end handle routing
@app.errorhandler(404)   
def not_found(e):  
    return send_from_directory('../frontend/public', 'index.html')

if __name__ == "__main__":
    app.run(debug=True)
