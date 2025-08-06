"""
main.py

Flask application entry point. Defines API routes for serving subfield details,
topic details, and concept-related visual data (heatmaps, word clouds, timelines).

Used by: frontend (via HTTP requests)
Dependencies: Flask, Flask-CORS, services/*.py modules
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from services.sub_field_detail import get_sub_field_detail
from services.topic_detail import get_topic_detail
from services.concepts import get_heatmap_data, get_wordcloud_data, get_timeline_data

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5001",
    "http://127.0.0.1:5001"
])


@app.route("/sub-field-detail", methods=["GET"])
def sub_field_detail():
    name = request.args.get("name")
    type_ = request.args.get("type")
    if not name or not type_:
        return jsonify({"error": "Missing 'name' or 'type' parameter"}), 400
    result = get_sub_field_detail(name, type_)
    return jsonify(result)


@app.route("/topic-detail", methods=["GET"])
def topic_detail():
    name = request.args.get("name")
    type_ = request.args.get("type")
    if not name or not type_:
        return jsonify({"error": "Missing 'name' or 'type' parameter"}), 400
    result = get_topic_detail(name, type_)
    return jsonify(result)


@app.route("/concepts", methods=["GET"])
def concepts():
    name = request.args.get("name")
    type_ = request.args.get("type")
    level = request.args.get("level")
    year = request.args.get("year")
    top = request.args.get("top")

    if not name or not type_ or not level:
        return jsonify({"error": "Missing one or more required parameters: 'name', 'type', 'level'"}), 400

    if type_ in ["wordCloud", "timeLine"] and not year:
        return jsonify({"error": f"'year' is required for type '{type_}'"}), 400

    if type_ == "heatMap":
        result = get_heatmap_data(name, level, top)
    elif type_ == "wordCloud":
        result = get_wordcloud_data(name, level, year, top)
    elif type_ == "timeLine":
        result = get_timeline_data(name, level, year, top)
    else:
        return jsonify({"error": f"Unsupported type: '{type_}'"}), 400

    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
