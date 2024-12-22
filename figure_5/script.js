const margin = { top: 10, right: 80, bottom: 50, left: 60 };
const width = 700 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("display", "none");

const pointsGroup = svg.append("g").attr("class", "points");

const countrySelect = d3.select("#country-select");
const slider = d3.select("#timeRange");
const timeLabel = d3.select("#timeLabel");

d3.csv("../dataset/population-growth-rates.csv").then(data => {
    // Data Parsing
    data.forEach(d => {
        d.Year = +d.Year;
        d.Estimate = +d["Population growth rate - Sex: all - Age: all - Variant: estimates"] || null;
        d.Medium = +d["Population growth rate - Sex: all - Age: all - Variant: medium"] || null;
    });

    const countries = Array.from(new Set(data.map(d => d.Entity))).sort();
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Populate dropdown with countries
    countrySelect.selectAll("option")
        .data(countries)
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d);

    // Initial settings
    const minYear = 1950;
    const maxYearFull = 2100; // Extend max year to 2100
    let maxYear = maxYearFull;

    slider.attr("max", maxYearFull); // Set slider max to 2100

    // Initial rendering
    let selectedCountry = countries[0];
    let filteredData = data.filter(d => d.Entity === selectedCountry);

    updateChart(filteredData, minYear, maxYear);

    // Update chart when a country is selected
    countrySelect.on("change", () => {
        selectedCountry = countrySelect.node().value;
        filteredData = data.filter(d => d.Entity === selectedCountry);
        updateChart(filteredData, minYear, maxYear);
    });

    const timeSlider = document.getElementById("timeSlider");
    const timeLabel = d3.select("#timeLabel");

    // Initialize noUiSlider
    noUiSlider.create(timeSlider, {
        start: [1950, 2100], // Initial range
        connect: true, // Show connection between handles
        range: {
            min: 1950,
            max: 2100,
        },
        step: 1, // Increment by 1 year
        tooltips: [true, true], // Show tooltips on both handles
        format: {
            to: value => Math.round(value), // Ensure integer values
            from: value => Number(value),
        },
    });

    // Update chart and labels dynamically
    timeSlider.noUiSlider.on("update", values => {
        const [startYear, endYear] = values.map(v => Math.round(v)); // Parse values as integers

        // Update the year range label
        timeLabel.text(`Year: ${startYear} - ${endYear}`);

        // Validate and update the chart
        if (endYear - startYear >= 10) { // Enforce a minimum range of 10 years
            updateChart(filteredData, startYear, endYear); // Use the same `updateChart` function
        } else {
            // timeLabel.text("Invalid Range: Select a range of at least 10 years");
        }
    });


    function updateChart(countryData, minYear, maxYear) {
        // Filter data by the selected year range
        const yearFilteredData = countryData.filter(d => d.Year >= minYear && d.Year <= maxYear);
        const pastData = yearFilteredData.filter(d => d.Estimate !== null);
        const futureData = yearFilteredData.filter(d => d.Medium !== null);

        // Update axes scaling
        const x = d3.scaleLinear()
            .domain([minYear, maxYear]) // Dynamically adjust x-axis to selected year range
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(yearFilteredData, d => Math.min(d.Estimate || 0, d.Medium || 0)),
                d3.max(yearFilteredData, d => Math.max(d.Estimate || 0, d.Medium || 0)) * 1.1
            ])
            .range([height, 0]);

        svg.selectAll("*").remove(); // Clear previous chart

        // X Axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));

        // Y Axis with Grid
        svg.append("g")
            .attr("class", "grid")
            .call(d3.axisLeft(y)
                .tickFormat(d => `${d.toFixed(1)}%`)
                .tickSize(-width)
                .ticks(7))
            .selectAll("line")
            .attr("stroke", "#ddd");

        svg.selectAll(".grid .domain").remove();

        // Solid Line for Past Data
        svg.append("path")
            .datum(pastData)
            .attr("fill", "none")
            .attr("stroke", color(selectedCountry))
            .attr("stroke-width", 1.5)
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.Estimate)));

        // Dashed Line for Future Data
        svg.append("path")
            .datum(futureData)
            .attr("fill", "none")
            .attr("stroke", color(selectedCountry))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.Medium)));

        // Solid Line for Past Data
        const solidLine = svg.append("path")
            .datum(pastData)
            .attr("fill", "none")
            .attr("stroke", color(selectedCountry))
            .attr("stroke-width", 1.5)
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.Estimate)));

        // Dashed Line for Future Data
        const dashedLine = svg.append("path")
            .datum(futureData)
            .attr("fill", "none")
            .attr("stroke", color(selectedCountry))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.Medium)));

        // Add legend label dynamically based on the visible range
        const lastSolidPoint = pastData[pastData.length - 1]; // Get the last point in the solid line
        const lastFuturePoint = futureData.length > 0 ? futureData[futureData.length - 1] : null; // Get the last point in the dashed line

        let labelX, labelY;

        // Check if the range includes future values
        if (maxYear >= 2023 && lastFuturePoint) {
            // Position the label on the dashed line (future data)
            const maxX = width - 50; // Ensure the label stays within chart bounds
            labelX = Math.min(x(lastFuturePoint.Year) + 5, maxX); // Adjust x position if near the edge
            labelY = y(lastFuturePoint.Medium) - 20; // Slightly above the dashed line
        } else {
            // Position the label on the solid line (past data)
            const maxX = width - 50; // Ensure the label stays within chart bounds
            labelX = Math.min(x(lastSolidPoint.Year) + 5, maxX); // Adjust x position if near the edge
            labelY = y(lastSolidPoint.Estimate) - 5; // Slightly above the solid line
        }

        // Add the label to the chart
        svg.append("text")
            .attr("x", labelX) // Dynamically adjust X position
            .attr("y", labelY) // Dynamically adjust Y position
            .attr("fill", color(selectedCountry)) // Match the line color
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text(selectedCountry) // Display the country name
            .attr("text-anchor", "end") // Align text to the end for better appearance
            .attr("dx", -5) // Add some padding to the right
            .style("pointer-events", "none"); // Ensure the text is non-interactive


        // Tooltip
        const verticalLine = svg.append("line")
            .attr("stroke", "#aaa")
            .attr("stroke-width", 1)
            .attr("y1", 0).attr("y2", height)
            .style("display", "none");

        svg.append("rect")
            .attr("width", width).attr("height", height)
            .style("fill", "none")
            .style("pointer-events", "all")
            .on("mousemove", event => mousemove(event, x, y, pastData, futureData))
            .on("mouseout", () => {
                tooltip.style("display", "none");
                verticalLine.style("display", "none");
                pointsGroup.selectAll("circle").remove();
            });

        function mousemove(event, x, y, pastData, futureData) {
            const [mouseX] = d3.pointer(event);
            const year = Math.round(x.invert(mouseX));

            verticalLine.style("display", "block")
                .attr("x1", x(year)).attr("x2", x(year));

            tooltip.style("display", "block")
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);

            pointsGroup.selectAll("circle").remove();

            const closestPast = pastData.find(d => d.Year === year);
            const closestFuture = futureData.find(d => d.Year === year);

            const tooltipValues = [];
            if (closestPast) tooltipValues.push({ key: selectedCountry, value: closestPast.Estimate });
            if (closestFuture) tooltipValues.push({ key: selectedCountry, value: closestFuture.Medium });

            tooltip.html(`
                <div>
                    <strong>${year}</strong> <!-- Year -->
                    <div class="tooltip-row">
                        <span class="tooltip-key">
                            <span class="tooltip-color-box" style="background: ${color(selectedCountry)};"></span>
                            ${selectedCountry}
                        </span>
                        <span class="tooltip-value">${(closestPast?.Estimate || closestFuture?.Medium).toFixed(1)}%</span>
                    </div>
                </div>
            `)
                .style("opacity", 1) /* Make it visible */
                .style("left", `${event.pageX + 10}px`) /* Position relative to cursor */
                .style("top", `${event.pageY - 10}px`);

        }
    }
});
