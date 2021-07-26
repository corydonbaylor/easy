from flask import Flask, send_from_directory
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

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory('../frontend/public', 'index.html')

# Send 404 errors to index and let front end handle routing
@app.errorhandler(404)   
def not_found(e):  
    return send_from_directory('../frontend/public', 'index.html')

if __name__ == "__main__":
    app.run(debug=True)
