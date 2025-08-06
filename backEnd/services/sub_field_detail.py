"""
sub_field_detail.py

Provides functions to retrieve statistical data about research subfields,
including publication count trends, topic growth rates, and size comparisons.

Used by: main.py (via /sub-field-detail route)
Dependencies: pandas, json, local CSV and JSON files in /data
"""

import pandas as pd
import os
import json

DATA_DIR = "data"
COUNT_FILE = os.path.join(DATA_DIR, "datasetPublicationCount.csv")
GROWTH_FILE = os.path.join(DATA_DIR, "growthRateOfTopic.csv")
SIZE_FILE = os.path.join(DATA_DIR, "topicSizeAndComparison.json")


# Entry point for loading subfield details based on the requested type
# type_ can be: "count", "growth", or "size"
def get_sub_field_detail(name, type_):
    sub_field_name = name

    if type_ == "count":
        return _load_csv_data(COUNT_FILE, sub_field_name)

    elif type_ == "growth":
        return _load_csv_data(GROWTH_FILE, sub_field_name)

    elif type_ == "size":
        return _load_size_data(sub_field_name)

    else:
        return {"error": f"Unsupported type: '{type_}'"}


# Load and filter CSV data by subfield name
# Used for count and growth types
def _load_csv_data(file_path, sub_field_name):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return {"error": f"Failed to load dataset: {str(e)}"}

    filtered_df = df[df['sub_field_name'] == sub_field_name]
    if filtered_df.empty:
        return {"error": f"No data found for sub-field '{sub_field_name}'"}

    sub_field_id = filtered_df.iloc[0]['sub_field_id']
    year_cols = [col for col in df.columns if col.isdigit()]

    topics_data = []
    for _, row in filtered_df.iterrows():
        topic_data = {
            "topicName": row['topic_name'],
            "topicId": row['topic_id'],
            "values": [
                {"year": int(year), "value": float(row[year])}
                for year in year_cols
                if not pd.isna(row[year])
            ]
        }
        topics_data.append(topic_data)

    return {
        "subFieldName": sub_field_name,
        "subFieldId": sub_field_id,
        "data": topics_data
    }


# Load topic size and comparison data from JSON
# Used when type_ == "size"
def _load_size_data(sub_field_name):
    try:
        with open(SIZE_FILE, "r") as f:
            json_data = json.load(f)
    except Exception as e:
        return {"error": f"Failed to read size JSON: {str(e)}"}

    filtered_years = []

    for year_entry in json_data.get("data", []):
        year = year_entry.get("year")
        subfields = year_entry.get("subFields", [])

        for subfield in subfields:
            if subfield.get("subFieldName") == sub_field_name:
                filtered_years.append({
                    "year": year,
                    "subFields": [
                        {
                            "subFieldPublicationCount": subfield.get("subFieldPublicationCount"),
                            "topicData": subfield.get("topicData", [])
                        }
                    ]
                })

    if not filtered_years:
        return {"error": f"No data found for sub-field '{sub_field_name}'"}

    return {
        "subFieldName": sub_field_name,
        "data": filtered_years
    }
