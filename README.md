# Svelte.js + Flask

A super simple example of using Flask to serve a Svelte app and use it as a backend server.

To build the svelte app

- `cd frontend` to change to frontend
- `npm install` to install dependencies
- `npm run build` to build app

To start up the python server:

- `python3 -m venv venv` to create a venv
- `source venv/bin/activate` to start venv
- `pip install flask` to install flask
- `python server.py` to start the Flask server.

This example just queries the Flask server for a random number.
