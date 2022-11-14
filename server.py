from flask import Flask, render_template
from flask_cors import CORS

app = Flask(__name__, static_url_path='/', template_folder='static')
CORS(app)

@app.route("/")
def index():
    return render_template("index.html")
