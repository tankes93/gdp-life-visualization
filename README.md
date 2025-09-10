# GDP per Capita vs Life Expectancy

An interactive dashboard exploring the relationship between countries' GDP per capita and life expectancy.

Each point represents a country (bubble size ≈ population). The dashboard supports bubble and bar chart views, filtering by life expectancy range, and selecting the top N countries.

![Dashboard screenshot](https://raw.githubusercontent.com/tankes93/gdp-life-visualization/main/screenshot.png)

Project overview

- Interactive visualization built with HTML, CSS and JavaScript (client-side).
- Data included: `gdp.xlsx` and `life.xlsx` (source data used by the visualization).
- Ideal for course review, demo, or portfolio showcase.

Dataset sources

- `gdp.xlsx` — GDP per capita values used for plotting.
- `life.xlsx` — Life expectancy values used for plotting.

Technologies used

- HTML5 & CSS3 — layout and styling
- JavaScript (ES6) — application logic and interactivity
- Plotting library (e.g. Plotly.js or D3.js) — interactive charts

Key features

- Bubble chart and Bar chart toggle
- Filters: life expectancy min/max and Top N countries selector
- Tooltips and details panel showing country GDP, life expectancy, and population
- Responsive layout and smooth hover/click animations

Quick start (view locally)

1. Clone the repo

```bash
git clone https://github.com/tankes93/gdp-life-visualization.git
cd gdp-life-visualization
```

2. Ensure the data files are present (`gdp.xlsx`, `life.xlsx`) — they are included in the repo.

3. Serve the folder locally (recommended) and open the demo in your browser:

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Note: Some browsers restrict file:// access for certain features. Serving the files prevents those issues.

Files in this repo

- `index.html` — main dashboard page
- `script.js` — visualization and UI logic
- `styles.css` — styling
- `gdp.xlsx`, `life.xlsx` — source data
- `screenshot.png` — demo screenshot used in this README

Future improvements

- Legends and advanced filters (continent, income group)  
- Export charts as PNG/SVG  
- Provide CSV alternatives and host large datasets as releases  
- Accessibility and mobile UI improvements

License

This project is licensed under the MIT License — see `LICENSE`.

