"""
topic_detail.py

Provides data retrieval functions for a specific topic, including its
yearly publication counts and size comparisons against subfield/global averages.

Used by: main.py (via /topic-detail route)
Dependencies: pandas, datasetPublicationCount.csv, avgPublicationCount.csv
"""

import pandas as pd
import os

COUNT_CSV = os.path.join("data", "datasetPublicationCount.csv")
AVG_CSV = os.path.join("data", "avgPublicationCount.csv")


# Load and return topic-level data based on the requested type
# types: "count" (trend line), "size" (comparative chart)
def get_topic_detail(name, type_):
    topic_name = name

    # Load main dataset
    try:
        df = pd.read_csv(COUNT_CSV)
    except Exception as e:
        return {"error": f"Failed to load count dataset: {str(e)}"}

    row = df[df['topic_name'] == topic_name]
    if row.empty:
        return {"error": f"No data found for topic '{topic_name}'"}
    row = row.iloc[0]

    # Extract topic and subfield info
    sub_field_name = row["sub_field_name"]
    sub_field_id = row["sub_field_id"]
    topic_id = row["topic_id"]
    topic_name = row["topic_name"]

    # Extract year-wise publication count for the selected topic
    if type_ == "count":
        year_cols = [col for col in df.columns if col.isdigit()]
        counts = [
            {"year": int(year), "value": int(row[year])}
            for year in year_cols
            if not pd.isna(row[year])
        ]
        return {
            "subFieldName": sub_field_name,
            "subFieldId": sub_field_id,
            "topicName": topic_name,
            "topicId": topic_id,
            "publicationCount": counts
        }
    # Load average comparison data and compute yearly size
    elif type_ == "size":
        # Load averages CSV
        try:
            avg_df = pd.read_csv(AVG_CSV)
        except Exception as e:
            return {"error": f"Failed to load average dataset: {str(e)}"}

        avg_row = avg_df[avg_df['sub_field_name'] == sub_field_name]
        if avg_row.empty:
            return {"error": f"No averages found for sub-field '{sub_field_name}'"}
        avg_row = avg_row.iloc[0]

        result = []
        for year in range(1970, 2025):
            year_str = str(year)
            topic_value = row.get(year_str)
            if pd.isna(topic_value):
                continue
            all_avg_col = f"{year_str}_all_avg"
            sub_avg_col = f"{year_str}_sub_field_avg"

            all_topic_avg = avg_row.get(all_avg_col)
            sub_field_avg = avg_row.get(sub_avg_col)

            if pd.isna(all_topic_avg) or pd.isna(sub_field_avg):
                continue

            result.append({
                "year": year,
                "value": int(topic_value),
                "allTopicAvg": float(all_topic_avg),
                "subFieldAvg": float(sub_field_avg)
            })

        return {
            "subFieldName": sub_field_name,
            "subFieldId": sub_field_id,
            "topicName": topic_name,
            "topicId": topic_id,
            "averageAndSizeCount": result
        }

    else:
        return {"error": f"Unsupported type: '{type_}'"}
