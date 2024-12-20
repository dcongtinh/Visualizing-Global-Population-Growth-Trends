const margin = { top: 20, right: 120, bottom: 40, left: 60 }; // Adjust margins for a smaller chart

const svg = d3.select("#chart")
    .attr("viewBox", `0 0 700 450`) // Preserve aspect ratio with reduced height
    .attr("preserveAspectRatio", "xMidYMid meet"); // Maintain responsiveness

const width = 700 - margin.left - margin.right; // Keep chart width consistent
const height = 450 - margin.top - margin.bottom; // Reduce chart height proportionally

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// Function to update the chart based on year
function updateChart(data, year, regions) {
    const filteredData = data.filter(d => d.Year === year);

    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.deathRate)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.birthRate)])
        .range([height, 0]);

    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(filteredData, d => d.population))
        .range([3, 30]); // Slightly larger range for better visibility


    const color = d3.scaleOrdinal()
        .domain(["Africa", "Asia", "Europe", "North America", "Oceania", "South America"])
        .range(["#8E44AD", "#3498DB", "#2ECC71", "#F39C12", "#E74C3C", "#16A085"]);


    // Add Legend
    g.selectAll(".legend").remove(); // Remove existing legend to avoid duplication

    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 40}, 20)`); // Shift the legend closer


    const legendData = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];

    legend.selectAll("legend-dot")
        .data(legendData)
        .enter()
        .append("circle")
        .attr("class", "legend-dot")
        .attr("cx", 0)
        .attr("cy", (d, i) => i * 25) // Space out legend items
        .attr("r", 8)
        .style("fill", d => color(d))
        .style("opacity", 0.7)
        .on("mouseover", (event, d) => {
            // Highlight only the bubbles that match the region
            g.selectAll(".bubbles")
                .style("opacity", b => regions[b["Code"]] === d ? 1 : 0.1);
            g.selectAll(".country-label")
                .style("opacity", b => regions[b["Code"]] === d ? 1 : 0); // Show only matching
        })
        .on("mouseout", () => {
            // Reset bubble opacity
            g.selectAll(".bubbles")
                .style("opacity", 0.7);
            g.selectAll(".country-label")
                .style("opacity", 1); // Reset all labels to visible
        });

    legend.selectAll("legend-label")
        .data(legendData)
        .enter()
        .append("text")
        .attr("class", "legend-label")
        .attr("x", 15)
        .attr("y", (d, i) => i * 25 + 5)
        .style("fill", "black")
        .style("font-size", "12px")
        .text(d => d)
        .on("mouseover", (event, d) => {
            // Highlight only the bubbles that match the region
            g.selectAll(".bubbles")
                .style("opacity", b => regions[b["Code"]] === d ? 1 : 0.1);
            g.selectAll(".country-label")
                .style("opacity", b => regions[b["Code"]] === d ? 1 : 0); // Show only matching
        })
        .on("mouseout", () => {
            // Reset bubble opacity
            g.selectAll(".bubbles")
                .style("opacity", 0.7);
            g.selectAll(".country-label")
                .style("opacity", 1); // Reset all labels to visible
        });


    // Update axes
    g.selectAll(".x-axis").remove();
    g.selectAll(".y-axis").remove();

    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(5));

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).ticks(5));

    // Add X-axis Label
    g.selectAll(".x-axis-label").remove(); // Remove previous labels
    g.append("text")
        .attr("class", "x-axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom) // Position below the X-axis
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "black")
        .text("Deaths per 1,000");

    // Add Y-axis Label
    g.selectAll(".y-axis-label").remove(); // Remove previous labels
    g.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)") // Rotate for vertical orientation
        .attr("x", -height / 2)
        .attr("y", -margin.left + 20) // Position to the left of the Y-axis
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("fill", "black")
        .text("Births per 1,000");


    // Add the gray diagonal line (Birth Rate = Death Rate)
    g.selectAll(".gray-line").remove(); // Remove existing line to prevent duplication

    g.append("line")
        .attr("class", "gray-line")
        .attr("x1", 0)
        .attr("y1", height)
        .attr("x2", width)
        .attr("y2", 0)
        .style("stroke", "gray")
        .style("stroke-width", 2)
        .style("stroke-dasharray", "5,5"); // Dashed line for better clarity


    // Add gridlines for X-axis
    g.selectAll(".grid-x").remove(); // Remove existing gridlines to prevent duplication
    g.append("g")
        .attr("class", "grid-x")
        .attr("transform", `translate(0, ${height})`)
        .call(
            d3.axisBottom(x)
                .tickSize(-height) // Extend gridlines to chart height
                .tickFormat("") // Remove tick labels for the gridlines
        )
        .selectAll("line")
        .style("stroke", "#ddd") // Light gray color
        .style("stroke-width", 1)
        .style("opacity", 0.7); // Faint appearance

    // Add gridlines for Y-axis
    g.selectAll(".grid-y").remove(); // Remove existing gridlines to prevent duplication
    g.append("g")
        .attr("class", "grid-y")
        .call(
            d3.axisLeft(y)
                .tickSize(-width) // Extend gridlines to chart width
                .tickFormat("") // Remove tick labels for the gridlines
        )
        .selectAll("line")
        .style("stroke", "#ddd") // Light gray color
        .style("stroke-width", 1)
        .style("opacity", 0.7); // Faint appearance


    // Bind data and update bubbles
    const bubbles = g.selectAll(".bubbles")
        .data(filteredData, d => d.Entity); // Use key function for unique countries

    // ENTER new bubbles
    const bubblesEnter = bubbles.enter()
        .append("circle")
        .attr("class", "bubbles")
        .attr("cx", d => x(d.deathRate))
        .attr("cy", d => y(d.birthRate))
        .attr("r", 0) // Start with 0 radius for transition
        .style("fill", d => color(regions[d["Code"]]))
        .style("opacity", 0.7);

    // MERGE (ENTER + UPDATE)
    bubblesEnter.merge(bubbles)
        .transition()
        .duration(500)
        .attr("cx", d => x(d.deathRate))
        .attr("cy", d => y(d.birthRate))
        .attr("r", d => sizeScale(d.population));

    // EXIT old bubbles
    bubbles.exit()
        .transition()
        .duration(500)
        .attr("r", 0) // Shrink radius to 0
        .remove();

    // Add tooltip functionality
    g.selectAll(".bubbles")
        .on("mouseover", (event, d) => {
            tooltip.style("opacity", 1)
                .html(`
                    <strong>Country:</strong> ${d.Entity}<br>
                    <strong>Birth Rate:</strong> ${d.birthRate} per 1,000<br>
                    <strong>Death Rate:</strong> ${d.deathRate} per 1,000<br>
                    <strong>Population:</strong> ${d.population.toLocaleString()}
                `)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mousemove", event => {
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 20}px`);
        })
        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });


    // Add country names for bubbles with the largest populations
    g.selectAll(".country-label").remove(); // Remove old labels

    g.selectAll(".country-label")
        .data(filteredData
            .sort((a, b) => b.population - a.population) // Sort by population (descending)
            .slice(0, 10) // Show only top 15 countries
        )
        .enter()
        .append("text")
        .attr("class", "country-label")
        .attr("x", d => x(d.deathRate) + 8) // Offset to the right of the bubble
        .attr("y", d => {
            // Adjust Y-position to avoid overlap
            const baseY = y(d.birthRate) + 4;
            const offset = Math.random() * 20 - 10; // Random small offset to spread labels
            return baseY + offset;
        })
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .style("fill", d => d3.color(color(regions[d["Code"]])).darker(1)) // Match bubble color, darker
        .style("stroke", "white") // Add border for better readability
        .style("stroke-width", "0.3px")
        .style("pointer-events", "none")
        .text(d => d.Entity);

}

// Load data and initialize slider
d3.csv("../dataset/birth-rate-vs-death-rate.csv").then(data => {
    // Filter out group entities and keep only individual countries
    const filteredData = data.filter(d => !d.Entity.includes("countries")
        && !d.Entity.includes("regions")
        && !d.Entity.includes("income")
        && !d.Entity.includes("developed")
        && !d.Entity.includes("UN") // Exclude group names
        && !d.Entity.includes("World")); // Exclude group names

    // Create a mapping for regions using the 2023 data
    const regionMapping = {};
    filteredData
        .filter(d => d.Year === "2023") // Filter for the year 2023
        .forEach(d => {
            regionMapping[d.Code] = d["World regions according to OWID"];
        });

    // Convert necessary fields to numeric values
    filteredData.forEach(d => {
        d.birthRate = +d["Birth rate - Sex: all - Age: all - Variant: estimates"];
        d.deathRate = +d["Death rate - Sex: all - Age: all - Variant: estimates"];
        d.population = +d["Population - Sex: all - Age: all - Variant: estimates"];
        d.Year = d.Year; // Ensure Year is a string for matching slider input
    });

    const yearSlider = d3.select("#year-slider");
    const yearDisplay = d3.select("#year-display");

    // Initialize chart with default year (slider's initial value)
    let currentYear = yearSlider.property("value");
    updateChart(filteredData, currentYear, regionMapping);

    // Update chart when slider value changes
    yearSlider.on("input", function () {
        currentYear = this.value;
        yearDisplay.text(currentYear);
        updateChart(filteredData, currentYear, regionMapping);
    });
});

