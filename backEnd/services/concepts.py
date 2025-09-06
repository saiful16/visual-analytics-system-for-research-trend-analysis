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

    # 1) Read file
    try:
        with open(topic_file, "r") as f:
            concept_data = json.load(f)
    except FileNotFoundError:
        return {"error": f"No concept data found for topic '{name}'"}

    # 2) Parse params
    try:
        level_key = str(level)
        n_top = int(top) if top is not None else 10
        if n_top <= 0:
            return {"error": "'top' must be a positive integer"}
    except Exception:
        return {"error": "Invalid 'level' or 'top' parameter"}

    # 3) Validate level
    levels_data = concept_data.get("levels", {})
    if level_key not in levels_data:
        return {"error": f"Level {level_key} not found for topic '{name}'"}

    year_dict = levels_data[level_key]

    # 4) Only consider years 2024..2020 (desc)
    target_years = [str(y) for y in range(2024, 2019, -1)]

    # 5) Build the union (ordered) of "first n" concepts taken per year
    #    We’ll keep insertion order using a list + set pair
    concept_order = []
    concept_seen = set()

    # Pre-extract the "first n" per year (for later lookup as well)
    first_n_per_year = {}  # year_str -> list[{"concept":..., "count":...}]
    for y in target_years:
        concepts = year_dict.get(y)
        if not isinstance(concepts, list) or not concepts:
            continue
        first_n = concepts[:n_top]
        first_n_per_year[y] = first_n
        for item in first_n:
            c = item.get("concept")
            if c is not None and c not in concept_seen:
                concept_seen.add(c)
                concept_order.append(c)

    # If we found nothing across the years, return empty data with the same shape
    response = {
        "topicName": name,
        "level": level_key,
        "data": []
    }

    if not concept_order:
        # Still list the (available) years in range, but with empty "value"
        for y in target_years:
            if y in year_dict:
                response["data"].append({"year": int(y), "value": []})
        return response

    # 6) For each selected year, look up counts for every concept in the union
    for y in target_years:
        concepts = year_dict.get(y)
        if not isinstance(concepts, list) or not concepts:
            # year exists but no list/empty → still include with zeros
            if y in year_dict:
                response["data"].append({
                    "year": int(y),
                    "value": [{"concept": c, "count": 0} for c in concept_order]
                })
            continue

        # Build quick lookup for this year
        lookup = {item.get("concept"): int(item.get("count", 0)) for item in concepts if "concept" in item}

        # Compose values in the union order
        year_values = [{"concept": c, "count": lookup.get(c, 0)} for c in concept_order]

        response["data"].append({
            "year": int(y),
            "value": year_values
        })

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
