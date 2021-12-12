from flask import Flask, send_from_directory
from flask import request
import requests
import datetime
import json

app = Flask(__name__)

# Path for our main Svelte page
@app.route("/")
def base():
    return send_from_directory('../frontend/public', 'index.html')

# Path for all the static files (compiled JS/CSS, etc.)
@app.route("/<path:path>")
def home(path):
    return send_from_directory('../frontend/public', path)

# we need to get someones location and the timeframe in order to filter 
# down to the produce that is in season for them.
@app.route("/location")
def get_country():

    # we need to get the users ip address rather than the proxy ip address
    headers_list = request.headers.getlist("X-Forwarded-For")
    user_ip = headers_list[0] if headers_list else request.remote_addr

    # we then query this api to get their state
    try:
        # here is how we get the state
        response = requests.get("http://ip-api.com/json/{}".format(user_ip))
        js = response.json()
        state = js['regionName']

        # next we get the time of year
        dt = datetime.datetime.today()
        if dt.day > 15:
            period = "late"
        else:
            period = "early"

        # finally we are going to create a dictionary
        diction = {
            "state": state,
            "month": dt.month,
            "period": period
        }

        # and return it as a json
        return json.dumps(diction)

    except Exception as e:
        return str(e)

# Send 404 errors to index and let front end handle routing
@app.errorhandler(404)   
def not_found(e):  
    return send_from_directory('../frontend/public', 'index.html')

if __name__ == "__main__":
    app.run(debug=True)
