# Svelte.js + Flask

A super simple example of using Flask to serve a Svelte app and use it as a backend server.

## Running the App Locally

To build the svelte app

- `cd frontend` to change to frontend
- `npm install` to install dependencies
- `npm run build` to build app

To start up the python server:

- `python3 -m venv venv` to create a venv
- `source venv/bin/activate` to start venv
- `pip install flask` to install flask
- `python server.py` to start the Flask server.

## To Serve the App

To set up git on a remote server

- `cd /var/www/` to go to our folder
- `sudo chown pi .` to change ownership of the file
- `git clone repo` to clone the repo

To set up the ngnix server:

- `sudo apt-get install nginx` to get ngnix
- `sudo rm /etc/nginx/sites-enabled/default` to remove default site
- `sudo chown pi /etc/nginx/sites-available/` so you can add files
- `nano /etc/nginx/sites-available/easy.nginx` to create a nginx file with the below config
- `sudo ln -s /etc/nginx/sites-available/easy.nginx /etc/nginx/sites-enabled/easy.nginx` to symlink them
- `sudo systemctl reload nginx` to restart the server

**easy.nginx**

```
server {
    listen 80;
    root /var/wwww/easy/frontend/public/;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

This example just queries the Flask server for a random number.
