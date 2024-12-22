const margin = { top: 50, right: 80, bottom: 50, left: 60 };
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

// Define the updateChart function
function updateChart(data, startYear, endYear) {
    // Filter data for the selected range
    const filteredData = data.filter(d => d.Year >= startYear && d.Year <= endYear);

    // Clear previous elements
    svg.selectAll("*").remove();

    // Update X and Y scales based on the filtered data
    const x = d3.scaleLinear()
        .domain([startYear, endYear])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 7]) // Assuming the Y range remains fixed
        .range([height, 0]);

    // Add X-axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Add Y-axis gridlines
    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .ticks(7))
        .selectAll("line")
        .attr("stroke", "#ddd");

    svg.selectAll(".grid .domain").remove();

    // Re-draw lines for each region
    const regions = d3.group(filteredData, d => d.Entity);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    regions.forEach((values, key) => {
        const pastData = values.filter(d => d.Year <= 2023);
        const futureData = values.filter(d => d.Year > 2023);

        // Draw past data
        svg.append("path")
            .datum(pastData)
            .attr("fill", "none")
            .attr("stroke", color(key))
            .attr("stroke-width", 1.5)
            .attr("id", `line-${key.replace(/[^\w-]/g, "")}`)
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.FertilityEstimate)));

        // Draw future projections
        svg.append("path")
            .datum(futureData)
            .attr("fill", "none")
            .attr("stroke", color(key))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .attr("id", `line-${key.replace(/[^\w-]/g, "")}`)
            .attr("class", "line")
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.FertilityEstimate)));
    });

    // Add legend dynamically
    const legend = svg.append("g")
        .attr("transform", `translate(${width}, 0)`);
    let legendYOffset = 0;
    const simplifyKey = (key) => {
        const keyMap = {
            "Latin America and the Caribbean (UN)": "Latin America",
            "Northern America (UN)": "N. America"
        };
        return keyMap[key] || key.replace(/\s*\(.*?\)/g, "").trim();
    };
    regions.forEach((_, key) => {
        const simplifiedKey = simplifyKey(key);

        legend.append("rect")
            .attr("x", 0)
            .attr("y", legendYOffset)
            .attr("width", 12)
            .attr("height", 12)
            .style("fill", color(key))
            .on("mouseenter", () => highlightLine(key))
            .on("mouseleave", resetLines);

        legend.append("text")
            .attr("x", 20)
            .attr("y", legendYOffset + 10)
            .style("font-size", "10px")
            .style("text-anchor", "start")
            .text(simplifiedKey)
            .on("mouseenter", () => highlightLine(key))
            .on("mouseleave", resetLines);

        legendYOffset += 25;
    });
    function resetLines() {
        svg.selectAll(".line").style("opacity", 1).style("stroke-width", 1.5);
    }
    function highlightLine(key) {
        svg.selectAll(".line").style("opacity", 0.2);
        svg.selectAll(`#line-${key.replace(/[^\w-]/g, "")}`).style("opacity", 1).style("stroke-width", 2.5);
    }
    // Re-create the vertical line for interactivity
    const verticalLine = svg.append("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("y1", 0)
        .attr("y2", height)
        .style("display", "none");

    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("mousemove", mousemove)
        .on("mouseout", () => {
            tooltip.style("display", "none");
            verticalLine.style("display", "none");
            pointsGroup.selectAll("circle").remove();
        });

    function mousemove(event) {
        const [mouseX] = d3.pointer(event);
        const year = Math.round(x.invert(mouseX));

        verticalLine.style("display", "block")
            .attr("x1", x(year))
            .attr("x2", x(year));

        tooltip.style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`);

        pointsGroup.selectAll("circle").remove();

        const tooltipValues = [];
        regions.forEach((values, key) => {
            const closest = values.find(d => d.Year === year);
            
            if (closest) {
                tooltipValues.push({ key, value: closest.FertilityEstimate });
                pointsGroup.append("circle")
                    .attr("cx", x(year))
                    .attr("cy", y(closest.FertilityEstimate))
                    .attr("r", 4)
                    .attr("fill", color(key));
            }
        });

        tooltip.html(`
            <div style="
                text-align: left;
                font-family: 'Poppins', Arial, sans-serif;
                color: #333;
                background: #ffffff;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 12px 16px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                line-height: 1.5;
                min-width: 140px;
            ">
                <div style="
                    font-size: 24px;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 8px;
                    border-bottom: 1px solid #ddd;
                ">
                    <strong>${year}</strong>
                </div>
                ${tooltipValues.map(d => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 5px;">
                        <span style="color:${color(d.key)}; font-weight: 500;">
                            ${simplifyKey(d.key)}
                        </span>
                        <span style="font-weight: 700; color: #333;">
                            ${d.value.toFixed(2)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `);
    }
}


d3.csv("../dataset/fertility-rate-with-projections.csv").then(data => {
    data.forEach(d => {
        d.Year = +d.Year;
        d.FertilityEstimate = d["Fertility rate - Sex: all - Age: all - Variant: estimates"]
            ? +d["Fertility rate - Sex: all - Age: all - Variant: estimates"]
            : +d["Fertility rate - Sex: all - Age: all - Variant: medium"];
    });

    // Set default range
    const startYear = 1950;
    const endYear = 2100;

    // Call updateChart for the initial render
    updateChart(data, startYear, endYear);

    const timeSlider = document.getElementById("timeSlider");
    const startYearLabel = document.getElementById("startYearLabel");
    const endYearLabel = document.getElementById("endYearLabel");

    // Set the range for the slider
    let minYear = 1950;
    let maxYear = 2100;

    // Initialize the noUiSlider
    noUiSlider.create(timeSlider, {
        start: [minYear, maxYear], // Initial range
        connect: true,
        range: {
            min: minYear,
            max: maxYear,
        },
        step: 1, // Increment by 1 year
        tooltips: [true, true], // Show tooltips for both handles
        format: {
            to: value => Math.round(value),
            from: value => Number(value),
        },
    });

    // Update chart and labels when slider values change
    timeSlider.noUiSlider.on("update", (values) => {
        const [startYear, endYear] = values.map(v => Math.round(v));

        // Update labels dynamically
        startYearLabel.textContent = startYear;
        endYearLabel.textContent = endYear;

        // Validate and update chart
        if (endYear - startYear >= 10) { // Minimum range validation
            updateChart(data, startYear, endYear);
        } else {
            startYearLabel.textContent = "Invalid";
            endYearLabel.textContent = "Range";
        }
    });

});