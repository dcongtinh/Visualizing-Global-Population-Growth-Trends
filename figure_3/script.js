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

d3.csv("../dataset/fertility-rate-with-projections.csv").then(data => {
    data.forEach(d => {
        d.Year = +d.Year;
        d.FertilityEstimate = d["Fertility rate - Sex: all - Age: all - Variant: estimates"]
            ? +d["Fertility rate - Sex: all - Age: all - Variant: estimates"]
            : +d["Fertility rate - Sex: all - Age: all - Variant: medium"];
    });

    const regions = d3.group(data, d => d.Entity);
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.Year))
        .range([0, width]);

    const yTicks = 7;
    const y = d3.scaleLinear()
        .domain([0, 7])
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y)
            .tickSize(-width)
            .ticks(yTicks))
        .selectAll("line")
        .attr("stroke", "#ddd");

    svg.selectAll(".grid .domain").remove();

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

    const lines = {};
    regions.forEach((values, key) => {
        const pastData = values.filter(d => d.Year <= 2023);
        const futureData = values.filter(d => d.Year > 2023);

        const line = svg.append("path")
            .datum(pastData)
            .attr("fill", "none")
            .attr("stroke", color(key))
            .attr("stroke-width", 1.5)
            .attr("class", "line")
            .attr("id", `line-${key.replace(/[^\w-]/g, "")}`)
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.FertilityEstimate)));

        svg.append("path")
            .datum(futureData)
            .attr("fill", "none")
            .attr("stroke", color(key))
            .attr("stroke-width", 1.5)
            .attr("stroke-dasharray", "4 4")
            .attr("class", "line")
            .attr("id", `line-${key.replace(/[^\w-]/g, "")}`)
            .attr("d", d3.line()
                .x(d => x(d.Year))
                .y(d => y(d.FertilityEstimate)));

        lines[key] = line;
    });

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

    function highlightLine(key) {
        svg.selectAll(".line").style("opacity", 0.2);
        svg.selectAll(`#line-${key.replace(/[^\w-]/g, "")}`).style("opacity", 1).style("stroke-width", 2.5);
    }

    function resetLines() {
        svg.selectAll(".line").style("opacity", 1).style("stroke-width", 1.5);
    }

    const verticalLine = svg.append("line")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("y1", 0).attr("y2", height)
        .style("display", "none");

    svg.append("rect")
        .attr("width", width).attr("height", height)
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
            .attr("x1", x(year)).attr("x2", x(year));

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
});