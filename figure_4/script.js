// Set dimensions for the responsive chart
const margin = { top: 30, right: 50, bottom: 50, left: 70 };
const width = 700 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create SVG with responsive attributes
const svg = d3.select("#my_dataviz")
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Tooltip setup
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip") // Add the 'tooltip' class
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid grey")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("opacity", 0)
    .style("pointer-events", "none");

// Vertical line
const verticalLine = svg.append("line")
    .attr("stroke", "grey")
    .attr("stroke-width", 1)
    .attr("y1", 0)
    .attr("y2", height)
    .style("opacity", 0);

// Function to format Y-axis values
function formatYAxis(d) {
    if (d >= 1e9) return `${d / 1e9} billion`;
    if (d >= 1e6) return `${d / 1e6} million`;
    return d;
}

// Function to draw the chart based on filtered data
function updateChart(data, minYear, maxYear) {
    const filteredData = data.filter(d => d.Year >= minYear && d.Year <= maxYear);

    const groups = ["65+", "25-64", "15-24", "5-14", "0-4"];
    const stackedData = d3.stack().keys(groups)(filteredData);

    const x = d3.scaleLinear()
        .domain([minYear, maxYear])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
        .range([height, 0]);

    const color = d3.scaleOrdinal()
        .domain(groups)
        .range(["#a65628", "#377eb8", "#4daf4a", "#ff7f00", "#984ea3"]);

    svg.selectAll("*").remove(); // Clear the chart

    // Add Y-axis gridlines
    svg.append("g")
        .call(d3.axisLeft(y).ticks(10).tickSize(-width).tickFormat(formatYAxis))
        .selectAll(".tick line")
        .style("stroke", "grey")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0.3);

    svg.selectAll(".domain").remove();

    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")));

    // Add stacked areas
    svg.selectAll(".area")
        .data(stackedData)
        .enter()
        .append("path")
        .attr("class", "area")
        .style("fill", d => color(d.key))
        .attr("d", d3.area()
            .x(d => x(d.data.Year))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
        );

    // Add legends dynamically
    stackedData.forEach((layer, i) => {
        const lastDataPoint = layer[layer.length - 1]; // Get the last point of the layer
        const midValue = (lastDataPoint[0] + lastDataPoint[1]) / 2; // Calculate the middle Y-value for positioning
        const year = lastDataPoint.data.Year; // Year corresponding to the last point

        svg.append("text")
            .attr("x", x(year) + 10) // Slightly offset from the area
            .attr("y", y(midValue)) // Position based on the mid-value of the stacked layer
            .style("fill", color(groups[i]))
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text(groups[i]); // Use the group name as the legend label
    });

    // Recreate the vertical line every time chart is updated
    const verticalLine = svg.append("line")
        .attr("stroke", "grey")
        .attr("stroke-width", 1)
        .attr("y1", 0)
        .attr("y2", height)
        .style("opacity", 0);

    // Add circles for points belonging to each area
    const circles = groups.map((group, i) =>
        svg.append("circle")
            .attr("r", 5) // Circle radius
            .attr("fill", color(group)) // Match group color
            .attr("stroke", "#f4f4f4") // Add white border
            .attr("stroke-width", 1) // Set border thickness
            .style("opacity", 0) // Hidden initially
    );


    // Mousemove handler
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", function (event) {
            const [mouseX] = d3.pointer(event);
            const hoveredYear = Math.round(x.invert(mouseX));
            const yearData = filteredData.find(d => d.Year === hoveredYear);

            if (yearData) {
                // Calculate cumulative heights for each group
                let cumulative = 0;

                circles.forEach((circle, i) => {
                    const yValue = groups[i]; // Current group key
                    cumulative += yearData[yValue]; // Add group's value to cumulative height

                    circle
                        .style("opacity", 1)
                        .attr("cx", x(hoveredYear)) // Align with the vertical line
                        .attr("cy", y(cumulative)); // Use cumulative value for position
                });

                tooltip.style("opacity", 1)
                    .html(`
                    <div class="tooltip-row" style="border-bottom: 1px solid #ddd; margin-bottom: 8px; padding-top: 5px; display: flex; justify-content: space-between;">
                    <div class="tooltip-title" style="font-weight: bold; font-size: 16px; margin-bottom: 5px;"><strong>${hoveredYear}</strong></div>
                    <div class="tooltip-subtitle" style="color: #555; font-size: 12px; margin-bottom: 8px;">in people</div>
                    </div>
                    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="tooltip-label" style="color: #a65628;">&#9632; Ages 65+</span>
                        <span class="tooltip-value" style="text-align: right;">${yearData["65+"].toLocaleString()} </span>
                    </div>
                    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="tooltip-label" style="color: #377eb8; margin-right: 10px;">&#9632; Ages 25-64</span>
                        <span class="tooltip-value" style="text-align: right;">${yearData["25-64"].toLocaleString()}</span>
                    </div>
                    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="tooltip-label" style="color: #4daf4a;">&#9632; Ages 15-24</span>
                        <span class="tooltip-value" style="text-align: right;">${yearData["15-24"].toLocaleString()} </span>
                    </div>
                    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="tooltip-label" style="color: #ff7f00;">&#9632; Ages 5-14</span>
                        <span class="tooltip-value" style="text-align: right;">${yearData["5-14"].toLocaleString()} </span>
                    </div>
                    <div class="tooltip-row" style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span class="tooltip-label" style="color: #984ea3;">&#9632; Under-5s</span>
                        <span class="tooltip-value" style="text-align: right;">${yearData["0-4"].toLocaleString()} </span>
                    </div>
                    <div class="tooltip-row" style="border-top: 1px solid #ddd; margin-top: 8px; padding-top: 5px; display: flex; justify-content: space-between;">
                        <span class="tooltip-label" style="font-weight: bold;">Total</span>
                        <span class="tooltip-value" style="text-align: right; font-weight: bold; color: #333;">${(
                            yearData["65+"] +
                            yearData["25-64"] +
                            yearData["15-24"] +
                            yearData["5-14"] +
                            yearData["0-4"]
                        ).toLocaleString()} </span>
                    </div>
                `)
                    .style("left", `${event.pageX + 10}px`)
                    .style("top", `${event.pageY - 10}px`);



                // Update vertical line
                verticalLine
                    .style("opacity", 1)
                    .attr("x1", x(hoveredYear))
                    .attr("x2", x(hoveredYear));
            }
        })
        .on("mouseleave", () => {
            // Hide tooltip, circles, and line
            tooltip.style("opacity", 0);
            verticalLine.style("opacity", 0);
            circles.forEach(circle => circle.style("opacity", 0));
        });
}


// Load the CSV data
d3.csv("../dataset/population-by-age-group.csv").then(data => {
    data.forEach(d => {
        d.Year = +d.Year;
        d["65+"] = +d["Population - Sex: all - Age: 65+ - Variant: estimates"];
        d["25-64"] = +d["Population - Sex: all - Age: 25-64 - Variant: estimates"];
        d["15-24"] = +d["Population - Sex: all - Age: 15-24 - Variant: estimates"];
        d["5-14"] = +d["Population - Sex: all - Age: 5-14 - Variant: estimates"];
        d["0-4"] = +d["Population - Sex: all - Age: 0-4 - Variant: estimates"];
    });

    const slider = document.getElementById("timeRange");
    const timeLabel = document.getElementById("timeLabel");
    const countrySelect = document.getElementById("countrySelect");

    const countries = [...new Set(data.map(d => d.Entity))].sort();
    countries.forEach(country => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
    });

    let selectedCountry = "World";
    let minYear = 1950;
    let maxYear = +slider.value;

    let filteredData = data.filter(d => d.Entity === selectedCountry);
    updateChart(filteredData, minYear, maxYear);

    slider.addEventListener("input", (e) => {
        const newMaxYear = +e.target.value;
        if (newMaxYear - minYear >= 10) {
            maxYear = newMaxYear;
            timeLabel.textContent = `Year: ${minYear} - ${maxYear}`;
            updateChart(filteredData, minYear, maxYear);
        }
    });

    countrySelect.addEventListener("change", (e) => {
        selectedCountry = e.target.value;
        filteredData = data.filter(d => d.Entity === selectedCountry);
        updateChart(filteredData, minYear, maxYear);
    });
});
