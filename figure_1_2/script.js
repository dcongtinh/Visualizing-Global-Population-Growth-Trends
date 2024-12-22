// Set dimensions for the responsive chart
const margin = { top: 30, right: 100, bottom: 50, left: 70 };
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

// Load the CSV data
d3.csv("../dataset/population-regions-with-projections.csv").then(data => {
    // Parse numeric columns
    data.forEach(d => {
        d.Year = +d.Year;
        d.population = +d.population;
    });

    // Extract unique years and regions (entities)
    const years = [...new Set(data.map(d => d.Year))].sort();
    const regions = [...new Set(data.map(d => d.Entity))].sort();

    // Restructure data for stacking by region
    const groupedData = years.map(year => {
        const yearData = { Year: year };
        regions.forEach(region => {
            const regionData = data.find(d => d.Year === year && d.Entity === region);
            yearData[region] = regionData ? regionData.population : 0; // Fill missing data with 0
        });
        return yearData;
    });

    const slider = document.getElementById("timeRange");
    const timeLabel = document.getElementById("timeLabel");

    // Define the desired order of regions
    const desiredOrder = ["Oceania", "Africa", "Asia", "South America", "North America", "Europe"];

    // Function to update chart
    const updateChart = (filteredData, regions) => {
        // Sort the regions based on the desired order
        const orderedRegions = desiredOrder.filter(region => regions.includes(region));

        // Filter data for the selected max year
        const selectedData = filteredData.find(d => d["Year"] === maxYear);

        const stackedData = d3.stack().keys(orderedRegions)(filteredData);

        const x = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([0, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(stackedData[stackedData.length - 1], d => d[1])])
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain(orderedRegions)
            .range(d3.schemeCategory10);

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

        // Add legends dynamically based on the `selectedData` y position
        orderedRegions.forEach((region, i) => {
            // Calculate cumulative height to position the legend dynamically
            const cumulativeHeight = orderedRegions
                .slice(0, i + 1) // Sum up to the current region
                .reduce((sum, currentRegion) => sum + (selectedData[currentRegion] || 0), 0);

            svg.append("text")
                .attr("x", width + margin.right / 2 - 45) // Position the legend to the right of the chart
                .attr("y", y(cumulativeHeight)) // Dynamically set the y position based on cumulative height
                .attr("fill", color(region))
                .style("font-size", "12px")
                .style("font-weight", "bold")
                .style("text-anchor", "start") // Align text to the left
                .text(region);
        });

        // Recreate the vertical line every time chart is updated
        const verticalLine = svg.append("line")
            .attr("stroke", "grey")
            .attr("stroke-width", 1)
            .attr("y1", 0)
            .attr("y2", height)
            .style("opacity", 0);

        // Add circles for points belonging to each area
        const circles = orderedRegions.map(region =>
            svg.append("circle")
                .attr("r", 5)
                .attr("fill", color(region))
                .attr("stroke", "white")
                .style("opacity", 0)
        );

        // Mousemove handler for tooltip and interactivity
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
                    let cumulative = 0;

                    // Update circles for each region
                    circles.forEach((circle, i) => {
                        const region = orderedRegions[i];
                        cumulative += yearData[region] || 0;
                        circle
                            .style("opacity", 1)
                            .attr("cx", x(hoveredYear))
                            .attr("cy", y(cumulative));
                    });

                    // Update tooltip content
                    let tooltipContent = `<strong>Year: ${hoveredYear}</strong><br>`;
                    orderedRegions.forEach(region => {
                        if (yearData[region]) {
                            tooltipContent += `
                            <span style="color:${color(region)}">${region}: ${yearData[region].toLocaleString()}</span><br>`;
                        }
                    });

                    tooltip.style("opacity", 1)
                        .html(tooltipContent)
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY - 10}px`);

                    // Update vertical line position
                    verticalLine.style("opacity", 1)
                        .attr("x1", x(hoveredYear))
                        .attr("x2", x(hoveredYear));
                }
            })
            .on("mouseleave", () => {
                // Hide tooltip, circles, and vertical line
                tooltip.style("opacity", 0);
                verticalLine.style("opacity", 0);
                circles.forEach(circle => circle.style("opacity", 0));
            });
    };

    // Update chart when sliders change
    const updateSliders = () => {
        const newMinYear = +startSlider.value;
        const newMaxYear = +endSlider.value;

        if (newMaxYear - newMinYear >= 10) { // Ensure at least a 10-year range
            minYear = newMinYear;
            maxYear = newMaxYear;

            startLabel.textContent = `Start Year: ${minYear}`;
            endLabel.textContent = `End Year: ${maxYear}`;

            const filteredData = groupedData.filter(d => d.Year >= minYear && d.Year <= maxYear);
            updateChart(filteredData, regions);
        } else {
            alert("Please select a range of at least 10 years.");
        }
    };

    const rangeSlider = document.getElementById("yearRangeSlider");
    const rangeStartLabel = document.getElementById("rangeStart");
    const rangeEndLabel = document.getElementById("rangeEnd");

    // Initialize the dual-handle slider
    noUiSlider.create(rangeSlider, {
        start: [1950, 2023], // Initial range
        connect: true,
        range: {
            min: 1950,
            max: 2023,
        },
        step: 1,
        tooltips: [true, true], // Show tooltips on both handles
        format: {
            to: value => Math.round(value), // Ensure integer values
            from: value => Number(value),
        },
    });


    // Listen for slider value changes
    rangeSlider.noUiSlider.on("update", (values) => {
        const [startYear, endYear] = values.map(v => parseInt(v, 10));


        rangeStartLabel.textContent = startYear;
        rangeEndLabel.textContent = endYear;

        if (endYear - startYear >= 10) { // Ensure at least a 10-year range
            minYear = startYear;
            maxYear = endYear;

            // Filter and update the chart
            const filteredData = groupedData.filter(d => d.Year >= minYear && d.Year <= maxYear);
            updateChart(filteredData, regions);
        } else {
            // alert("Please select a range of at least 10 years.");
        }
    });
});
