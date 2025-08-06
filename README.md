
# Visual Analytics System for Research Trend Analysis

This project is a visual analytics tool that explores research trends using scholarly data (e.g., OpenAlex). It includes a **Python backend** and a **static HTML/JavaScript frontend**.

---

## Getting Started

Follow the steps below to set up and run both the backend and frontend of the system.

---

## Backend (Python API)

### 1. Navigate to the backend folder
```bash
cd backEnd
````

### 2. Configure Python environment

Make sure to select or creat a virtual environment in **IDE** setup or via terminal for the backend to run.

### 3. Install required packages

```bash
pip install -r requirements.txt
```

### 4. Run the backend

```bash
python main.py
```

By default, this will run on `http://localhost:5000`.

> If the port is changed, make sure to update it in the frontend:
> Edit `frontEnd/js/util/config.js` → set `API_BASE_URL` to match the backend URL.

---

## Frontend

### 1. Navigate to the frontend folder

```bash
cd frontEnd
```

### 2. Start a simple HTTP server (on port 5001)

```bash
python -m http.server 5001
```

### 3. Open the application in your browser

Go to:

```
http://localhost:5001/home.html
```

---

## Project Structure

```
visual-analytics-system-for-research-trend-analysis/
├── backEnd/           # Python backend (API)
│   ├── services/      # Concept/subfield/topic logic
│   ├── data/          # Raw or processed OpenAlex data
│   ├── main.py        # API entry point
│   └── requirements.txt
│
├── frontEnd/          # Static frontend (HTML + JS)
│   ├── js/            # JavaScript modules and visualizations
│   ├── css/, icons/   # Styling and UI assets
│   └── home.html      # Main web page
│
└── README.md          # Project instructions
```

---

## Notes

* The system is **lightweight** and does **not require any JavaScript package manager** (e.g., npm, yarn).
* The frontend uses **vanilla JS** and serves static files via Python’s built-in HTTP server.

---
