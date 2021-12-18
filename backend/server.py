from flask import Flask, send_from_directory
from flask import request
import requests
import datetime
import json
import pandas as pd

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
def get_produce():

    #################################################
    #### Getting parameters for filtering out df ####
    #################################################

    # Querying this api to get state based on their ip address
    try:
        # we need to get the users ip address rather than the proxy ip address
        headers_list = request.headers.getlist("X-Forwarded-For")
        user_ip = headers_list[0] if headers_list else request.remote_addr

        # here is how we get the state
        response = requests.get("http://ip-api.com/json/{}".format(user_ip))
        js = response.json()
        state = js['regionName']

    except Exception as e:

        # when we are running locally, we wont have a valid ip address
        # so we will say that our state is Virginia for now
        state = "Virginia"

    # next we get the time of year
    dt = datetime.datetime.today()

    # then if its the early or late part of the year
    if dt.day > 15:
        period = "Late"
    else:
        period = "Early"

    #############################
    #### Creating the payload ###
    #############################

    # filtering down our csv to the right state, period and month
    df = pd.read_csv("seasons.csv")
    df = df[df.month == dt.month]
    df = df[df.period == period]
    df = df[df.state == state]

    # finally we are going to create a dictionary
    payload = {
        "state": state,
        "period": period,
        "month": df["month_name"].tolist()[0],
        "produce": df["produce"].tolist()
    }

    # and return it as a json
    return json.dumps(payload)

# Send 404 errors to index and let front end handle routing
@app.errorhandler(404)   
def not_found(e):  
    return send_from_directory('../frontend/public', 'index.html')

if __name__ == "__main__":
    app.run(debug=True)
