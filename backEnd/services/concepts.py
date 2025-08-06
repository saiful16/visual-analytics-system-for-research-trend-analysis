"""
concepts.py

Provides backend logic for retrieving concept co-occurrence data used in heatmaps,
word clouds, and timelines. Reads structured JSON files organized by topic and concept level.

Used by: main.py (via /concepts route)
Dependencies: built-in os, json modules
"""

import os
import json

CONCEPTS_DIR = os.path.join("data", "concepts")


# Load and return top-N concept frequency data across years for a given topic and concept level
def get_heatmap_data(name, level, top=None):
    topic_file = os.path.join(CONCEPTS_DIR, f"{name}.json")

    try:
        with open(topic_file, "r") as f:
            concept_data = json.load(f)
    except FileNotFoundError:
        return {"error": f"No concept data found for topic '{name}'"}

    try:
        level_key = str(level)
        top = int(top) if top is not None else 10
    except:
        return {"error": "Invalid 'level' or 'top' parameter"}

    response = {
        "topicName": name,
        "level": level_key,
        "data": []
    }

    levels_data = concept_data.get("levels", {})
    if level_key not in levels_data:
        return {"error": f"Level {level_key} not found for topic '{name}'"}

    year_dict = levels_data[level_key]

    for year_str, concepts in year_dict.items():
        if not isinstance(concepts, list) or not concepts:
            continue

        selected = concepts[:abs(top)] if top > 0 else concepts[-abs(top):]

        year_data = {
            "year": int(year_str),
            "value": [
                {"concept": c["concept"], "count": c["count"]}
                for c in selected
            ]
        }

        response["data"].append(year_data)

    return response


# Load and return top-N concept data for a specific year for word cloud visualization
def get_wordcloud_data(name, level, year, top=None):
    topic_file = os.path.join(CONCEPTS_DIR, f"{name}.json")

    try:
        with open(topic_file, "r") as f:
            concept_data = json.load(f)
    except FileNotFoundError:
        return {"error": f"No concept data found for topic '{name}'"}

    try:
        level_key = str(level)
        year_key = str(year)
        top = int(top) if top is not None else 10
    except:
        return {"error": "Invalid 'level', 'year', or 'top' parameter"}

    response = {
        "topicName": name,
        "level": level_key,
        "year": int(year),
        "data": []
    }

    levels_data = concept_data.get("levels", {})
    if level_key not in levels_data:
        return {"error": f"Level {level_key} not found for topic '{name}'"}

    year_dict = levels_data[level_key]
    if year_key not in year_dict:
        return {"error": f"No data for year {year} at level {level_key} in topic '{name}'"}

    concepts = year_dict[year_key]

    if not isinstance(concepts, list) or not concepts:
        return response  # return empty data list if no concepts

    selected = concepts[:abs(top)] if top > 0 else concepts[-abs(top):]

    response["data"] = [
        {"concept": c["concept"], "count": c["count"]}
        for c in selected
    ]

    return response


def get_timeline_data(name, level, year, top=None):
    topic_file = os.path.join(CONCEPTS_DIR, f"{name}.json")

    try:
        with open(topic_file, "r") as f:
            concept_data = json.load(f)
    except FileNotFoundError:
        return {"error": f"No concept data found for topic '{name}'"}

    try:
        level_key = str(level)
        year_key = str(year)
        top = int(top) if top is not None else 10
    except:
        return {"error": "Invalid 'level', 'year', or 'top' parameter"}

    levels_data = concept_data.get("levels", {})
    if level_key not in levels_data:
        return {"error": f"Level {level_key} not found for topic '{name}'"}

    year_concepts = levels_data[level_key].get(year_key, [])
    if not year_concepts:
        return {"error": f"No concept data for year {year} at level {level_key}"}

    # Pick top/bottom N concepts by order
    selected_concepts = year_concepts[:abs(top)] if top > 0 else year_concepts[-abs(top):]
    concept_names = [c["concept"] for c in selected_concepts]

    # Create a lookup of all years
    timeline_data = []
    for concept in concept_names:
        concept_timeline = {"concept": concept, "values": []}
        for y, concepts in levels_data[level_key].items():
            # Find matching concept in that year
            count = next((c["count"] for c in concepts if c["concept"] == concept), 0)
            concept_timeline["values"].append({
                "year": int(y),
                "count": count
            })
        timeline_data.append(concept_timeline)

    return {
        "topicName": name,
        "level": level_key,
        "data": timeline_data
    }
