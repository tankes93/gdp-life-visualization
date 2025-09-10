/**************************************
 * 0) Helper Function for Contrast
 **************************************/
function getContrastYIQ(color) {
  let r, g, b;
  if (color.startsWith("rgb")) {
    const rgb = color.match(/\d+/g);
    r = parseInt(rgb[0]);
    g = parseInt(rgb[1]);
    b = parseInt(rgb[2]);
  } else if (color.startsWith("#")) {
    color = color.slice(1);
    r = parseInt(color.substr(0, 2), 16);
    g = parseInt(color.substr(2, 2), 16);
    b = parseInt(color.substr(4, 2), 16);
  }
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

/**************************************
 * 1) Utility Functions & Data Loading
 **************************************/

// Parse a number from a string (removes $ and commas)
function parseNumber(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    return parseFloat(val.replace(/\$/g, '').replace(/,/g, '').trim());
  }
  return NaN;
}

// Parse population (removes commas)
function parsePopulation(val) {
  if (val === null || val === undefined) return NaN;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    return parseInt(val.replace(/,/g, '').trim());
  }
  return NaN;
}

// Load an Excel file and return JSON from the first sheet
async function loadExcel(filePath) {
  const response = await fetch(filePath);
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(worksheet);
}

// Merge GDP and Life Expectancy datasets based on "Country"
function mergeDatasets(gdpData, lifeData) {
  const lifeMap = new Map();
  lifeData.forEach(d => {
    if (d.Country) {
      lifeMap.set(d.Country.trim().toLowerCase(), d);
    }
  });

  return gdpData.map(d => {
    const countryKey = d.Country.trim().toLowerCase();
    if (lifeMap.has(countryKey)) {
      const life = lifeMap.get(countryKey);
      return {
        Country: d.Country,
        GDPPerCapita: parseNumber(d["GDP per capita"]),
        Population: parsePopulation(d.Population),
        LifeExpectancy: parseFloat(life["Life Expectancy"])
      };
    }
    return null;
  }).filter(d => d !== null);
}

/**************************************
 * 2) Global Variables & Setup
 **************************************/

let allData = [];
let filteredData = [];

// Dimensions for the charts
const margin = { top: 20, right: 20, bottom: 70, left: 70 },
      width  = 800 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

// References to the fixed details box and tooltip
const detailsContent = document.getElementById("details-content");
const detailsBox = document.getElementById("details-box");
const tooltip = d3.select("#tooltip");

/**************************************
 * 3) Filtering & Update Function
 **************************************/

function applyFilters() {
  const topNValue = document.getElementById("topNSelect").value;
  const lifeMin   = +document.getElementById("lifeMin").value;
  const lifeMax   = +document.getElementById("lifeMax").value;

  // Filter by life expectancy range
  let data = allData.filter(d => d.LifeExpectancy >= lifeMin && d.LifeExpectancy <= lifeMax);

  // Sort by GDP descending and take top N if needed
  data.sort((a, b) => b.GDPPerCapita - a.GDPPerCapita);
  if (topNValue !== "all") {
    data = data.slice(0, +topNValue);
  }
  return data;
}

function updateCharts() {
  filteredData = applyFilters();

  // If no data matches, display a friendly message
  if (filteredData.length === 0) {
    d3.select("#bubble-chart").html("<p class='no-data'>No data matches the selected life expectancy range.</p>");
    d3.select("#bar-chart").html("<p class='no-data'>No data matches the selected life expectancy range.</p>");
  } else {
    drawBubbleChart(filteredData);
    drawBarChart(filteredData);
  }
}

/**************************************
 * 4) Bubble Chart with Zoom/Pan & Enhanced Tooltip
 **************************************/
function drawBubbleChart(data) {
  d3.select("#bubble-chart").selectAll("*").remove();

  const svg = d3.select("#bubble-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .call(
      d3.zoom()
        .scaleExtent([1, 5])
        .on("zoom", function(event) {
          chartGroup.attr("transform", event.transform);
        })
    );

  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Create scales
  const xScale = d3.scaleLog()
    .domain([d3.min(data, d => d.GDPPerCapita), d3.max(data, d => d.GDPPerCapita)])
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear()
    .domain([d3.min(data, d => d.LifeExpectancy) - 5, d3.max(data, d => d.LifeExpectancy) + 5])
    .range([height, 0])
    .nice();

  const rScale = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.Population)])
    .range([5, 30]);

  // Dynamic color scale based on GDP per Capita
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain([d3.min(data, d => d.GDPPerCapita), d3.max(data, d => d.GDPPerCapita)]);

  // X Axis
  chartGroup.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(10, "~s"));

  // Y Axis
  chartGroup.append("g")
    .call(d3.axisLeft(yScale));

  // Draw bubbles with animated transitions
  chartGroup.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => xScale(d.GDPPerCapita))
    .attr("cy", d => yScale(d.LifeExpectancy))
    .attr("r", 0)
    .attr("fill", d => colorScale(d.GDPPerCapita))
    .attr("opacity", 0.7)
    .transition()
    .duration(1000)
    .attr("r", d => rScale(d.Population));

  // Hover interactions to update details box and show dynamic tooltip
  chartGroup.selectAll("circle")
    .on("mouseover", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("r", rScale(d.Population) * 1.1);

      detailsContent.innerHTML = `<strong>${d.Country}</strong><br/>
                                  GDP per Capita: $${d3.format(",.0f")(d.GDPPerCapita)}<br/>
                                  Life Expectancy: ${d.LifeExpectancy} yrs<br/>
                                  Population: ${d3.format(",")(d.Population)}`;
      // Set details box background to match bubble color and update text color for contrast
      const fillColor = colorScale(d.GDPPerCapita);
      detailsBox.style.backgroundColor = fillColor;
      detailsBox.style.color = getContrastYIQ(fillColor);

      tooltip.style("opacity", 1)
             .html(`<strong>${d.Country}</strong><br/>
                    GDP: $${d3.format(",.0f")(d.GDPPerCapita)}<br/>
                    Life: ${d.LifeExpectancy} yrs<br/>
                    Pop: ${d3.format(",")(d.Population)}`);
    })
    .on("mousemove", function(event, d) {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this)
        .transition().duration(200)
        .attr("r", rScale(d.Population));
      tooltip.style("opacity", 0);
      // Reset details box to default message and styling
      detailsBox.style.backgroundColor = "rgba(255,255,255,0.95)";
      detailsBox.style.color = "#000";
      detailsContent.innerHTML = "Hover over the data for more details";
    });

  // Add a color legend for GDP per Capita
  const legendWidth = 200, legendHeight = 10;
  const legendGroup = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${margin.left}, ${height + margin.top + 40})`);

  const defs = legendGroup.append("defs");
  const linearGradient = defs.append("linearGradient")
    .attr("id", "linear-gradient");

  linearGradient.selectAll("stop")
    .data(colorScale.ticks().map((t, i, n) => ({ offset: `${100 * i / n.length}%`, color: colorScale(t) })))
    .enter().append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#linear-gradient)");

  legendGroup.append("text")
    .attr("x", 0)
    .attr("y", legendHeight + 15)
    .attr("fill", "#000")
    .attr("font-size", "12px")
    .text(d3.min(data, d => d.GDPPerCapita).toFixed(0));

  legendGroup.append("text")
    .attr("x", legendWidth)
    .attr("y", legendHeight + 15)
    .attr("fill", "#000")
    .attr("font-size", "12px")
    .attr("text-anchor", "end")
    .text(d3.max(data, d => d.GDPPerCapita).toFixed(0));
}

/**************************************
 * 5) Horizontal Bar Chart with Zoom/Pan & Enhanced Tooltip
 **************************************/
function drawBarChart(data) {
  d3.select("#bar-chart").selectAll("*").remove();

  const svg = d3.select("#bar-chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 100) // extra space for labels
    .attr("height", height + margin.top + margin.bottom)
    .call(
      d3.zoom()
        .scaleExtent([1, 3])
        .on("zoom", function(event) {
          chartGroup.attr("transform", event.transform);
        })
    );

  const chartGroup = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // X scale: GDP per Capita (linear)
  const xScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.GDPPerCapita)])
    .range([0, width])
    .nice();

  // Y scale: Countries (band)
  const yScale = d3.scaleBand()
    .domain(data.map(d => d.Country))
    .range([0, height])
    .padding(0.3);

  // X Axis at bottom
  chartGroup.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(xScale).ticks(10, "~s"));

  // Y Axis on the left with rotated labels if too many
  const domainCountries = yScale.domain();
  const tickValues = domainCountries.length > 20 ? domainCountries.filter((d, i) => !(i % 5)) : domainCountries;
  chartGroup.append("g")
    .call(d3.axisLeft(yScale).tickValues(tickValues))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

  // Draw horizontal bars with transition
  chartGroup.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("y", d => yScale(d.Country))
    .attr("x", 0)
    .attr("height", yScale.bandwidth())
    .attr("width", 0)
    .attr("fill", "#28A745")
    .transition()
    .duration(1000)
    .attr("width", d => xScale(d.GDPPerCapita));

  // Hover interactions for bars to update details box and show dynamic tooltip
  chartGroup.selectAll("rect")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "#218838");
      detailsContent.innerHTML = `<strong>${d.Country}</strong><br/>
                                  GDP per Capita: $${d3.format(",.0f")(d.GDPPerCapita)}<br/>
                                  Life Expectancy: ${d.LifeExpectancy} yrs<br/>
                                  Population: ${d3.format(",")(d.Population)}`;
      // Use the bar's fill color for the details box and update text color accordingly
      const barColor = d3.select(this).attr("fill");
      detailsBox.style.backgroundColor = barColor;
      detailsBox.style.color = getContrastYIQ(barColor);

      tooltip.style("opacity", 1)
             .html(`<strong>${d.Country}</strong><br/>
                    GDP: $${d3.format(",.0f")(d.GDPPerCapita)}<br/>
                    Life: ${d.LifeExpectancy} yrs<br/>
                    Pop: ${d3.format(",")(d.Population)}`);
    })
    .on("mousemove", function(event, d) {
      tooltip.style("left", (event.pageX + 10) + "px")
             .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", function(event, d) {
      d3.select(this).attr("fill", "#28A745");
      tooltip.style("opacity", 0);
      detailsBox.style.backgroundColor = "rgba(255,255,255,0.95)";
      detailsBox.style.color = "#000";
      detailsContent.innerHTML = "Hover over the data for more details";
    });
}

/**************************************
 * 6) Chart Toggle & Event Listeners
 **************************************/
document.getElementById("show-bubble").addEventListener("click", () => {
  document.getElementById("bubble-chart").style.display = "block";
  document.getElementById("bar-chart").style.display = "none";
});
document.getElementById("show-bar").addEventListener("click", () => {
  document.getElementById("bubble-chart").style.display = "none";
  document.getElementById("bar-chart").style.display = "block";
});

// Filter controls update charts on change
document.getElementById("topNSelect").addEventListener("change", updateCharts);
document.getElementById("lifeMin").addEventListener("input", function() {
  document.getElementById("lifeMinVal").textContent = this.value;
  if (+this.value > +document.getElementById("lifeMax").value) {
    document.getElementById("lifeMax").value = this.value;
    document.getElementById("lifeMaxVal").textContent = this.value;
  }
  updateCharts();
});
document.getElementById("lifeMax").addEventListener("input", function() {
  document.getElementById("lifeMaxVal").textContent = this.value;
  if (+this.value < +document.getElementById("lifeMin").value) {
    document.getElementById("lifeMin").value = this.value;
    document.getElementById("lifeMinVal").textContent = this.value;
  }
  updateCharts();
});

/**************************************
 * 7) Initialization
 **************************************/
async function init() {
  const [gdpData, lifeData] = await Promise.all([
    loadExcel("gdp.xlsx"),
    loadExcel("life.xlsx")
  ]);

  // Merge datasets and filter out any invalid entries
  allData = mergeDatasets(gdpData, lifeData).filter(d =>
    !isNaN(d.GDPPerCapita) && d.GDPPerCapita > 0 &&
    !isNaN(d.LifeExpectancy) &&
    !isNaN(d.Population)
  );

  updateCharts();
}

init();
