const svg = d3.select("svg")
    .attr("viewBox", "0 0 800 400")
    .attr("preserveAspectRatio", "xMidYMid meet");

const width = 800;
const height = 400;

let filteredLineData = {};

function createFilteredLineData(rawData) {
    const filteredLineData = {};
    const relevantData = rawData.filter(d => {
        const year = +d["Year"];
        return year >= 1950 && year <= 2023;
    });

    relevantData.forEach(d => {
        const code = d["Code"];
        const year = +d["Year"];
        const density = +d["Population density"];
        if (!code || isNaN(year) || isNaN(density)) return;

        if (!filteredLineData[code]) {
            filteredLineData[code] = [];
        }
        filteredLineData[code].push({ year, density });
    });

    Object.keys(filteredLineData).forEach(code => {
        filteredLineData[code] = filteredLineData[code]
            .sort((a, b) => a.year - b.year)
            .map(d => d.density);
    });

    return filteredLineData;
}

const path = d3.geoPath(),
    data = new Map(),
    worldmap = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson",
    worldpopulation = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world_population.csv",
    worldpopulationdesity = "../dataset/population-density.csv";

let centered, world;
const projection = d3.geoRobinson()
    .scale(130)
    .translate([350, 200]);

const colorScale = d3.scaleThreshold()
    .domain([1, 10, 100, 1000, 5000])
    .range([
        "#a8ddb5",
        "#7bccc4",
        "#4eb3d3",
        "#2b8cbe",
        "#0868ac",
        "#084081"
    ]);

const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

year = 2023;

const slider = document.getElementById('year-slider');
const playButton = document.getElementById("play-button");
const currentYearDisplay = document.getElementById('current-year');

let interval; // To store the animation interval
let isPlaying = false; // To track the play/pause state


function updateMapForYear(selectedYear) {
    d3.csv(worldpopulationdesity).then(rawData => {
        data.clear();
        const filteredData = rawData.filter(d => d["Year"] === String(selectedYear));
        filteredData.forEach(d => {
            data.set(d["Code"], +d["Population density"]);
        });

        world.selectAll("path")
            .transition()
            .duration(500)
            .attr("fill", function (d) {
                d.total = data.get(d.id) || 0;
                return colorScale(d.total);
            });
    }).catch(error => {
        console.error("Error updating data for year:", error);
    });
}

slider.addEventListener('input', function () {
    year = +slider.value;
    currentYearDisplay.textContent = year;
    updateMapForYear(year);
});

// Function to play/pause the animation
function togglePlay() {
    if (isPlaying) {
        clearInterval(interval);
        playButton.textContent = "Play";
    } else {
        playButton.textContent = "Pause";
        slider.value = 1950
        interval = setInterval(() => {
            let currentYear = +slider.value;
            if (currentYear < +slider.max) {
                currentYear+=10;
                if (currentYear>2023){
                    currentYear = 2023
                }
            } else {
                clearInterval(interval); // Stop animation at max year
                playButton.textContent = "Play";
                isPlaying = false;
                return;
            }
            slider.value = currentYear;
            currentYearDisplay.textContent = currentYear;
            updateMapForYear(currentYear);
        }, 500); // Adjust the interval duration for speed
    }
    isPlaying = !isPlaying;
}

// Add event listener to play button
playButton.addEventListener("click", togglePlay);

svg.append("rect")
    .attr("class", "background")
    .on("click", click);

function renderLineChart(countryCode, filteredLineData) {
    const countryData = filteredLineData[countryCode];
    if (!countryData) {
        d3.select("#chart-container").html(`
            <span style="color: #999; font-size: 12px; font-style: italic;">
                No data available for this country.
            </span>
        `);
        return;
    }

    d3.select("#chart-container").selectAll("*").remove();

    const chartWidth = 200;
    const chartHeight = 100;
    const margin = { top: 10, right: 10, bottom: 20, left: 30 };

    const xScale = d3.scaleLinear()
        .domain([1950, 2023])
        .range([margin.left, chartWidth - margin.right]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(countryData)])
        .nice()
        .range([chartHeight - margin.bottom, margin.top]);

    const svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    const line = d3.line()
        .x((d, i) => xScale(1950 + i))
        .y((d) => yScale(d))
        .curve(d3.curveMonotoneX);

    svg.append("path")
        .datum(countryData)
        .attr("fill", "none")
        .attr("stroke", "#007BFF")
        .attr("stroke-width", 2)
        .attr("d", line);

    svg.append("g")
        .attr("transform", `translate(0,${chartHeight - margin.bottom})`)
        .call(d3.axisBottom(xScale).tickValues([1950, 2023]).tickFormat(d3.format("d")))
        .attr("font-size", "10px");

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(yScale).ticks(0))
        .selectAll("text")
        .remove();

    svg.selectAll(".point")
        .data([countryData[0], countryData[countryData.length - 1]])
        .enter()
        .append("circle")
        .attr("cx", (d, i) => xScale(i === 0 ? 1950 : 2023))
        .attr("cy", (d) => yScale(d))
        .attr("r", 4)
        .attr("fill", "#007BFF")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5);

    svg.selectAll(".point-label")
        .data([countryData[0], countryData[countryData.length - 1]])
        .enter()
        .append("text")
        .attr("x", (d, i) => xScale(i === 0 ? 1950 : 2023))
        .attr("y", (d, i) => yScale(d) + (i === 0 ? -10 : 15))
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text((d) => d.toFixed(1));
}

let tooltipcontent = (countryName, populationDensity, year, countryCode, filteredLineData) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px; color: #007BFF;">
                ${countryName}
            </div>
            <div style="font-size: 14px; margin-bottom: 6px;">
                <span style="font-weight: 600;">Population Density:</span> 
                <span>${populationDensity} people/km²</span>
            </div>
            <div id="chart-container" style="margin-top: 10px; width: 220px; height: 100px; background: #eef2f3; border: 1px dashed #ccc; border-radius: 4px; display: flex; justify-content: center; align-items: center;">
            </div>
        </div>
    `;
    tooltip.html(htmlContent);
    renderLineChart(countryCode, filteredLineData);
};

function ready(error, topo) {
    let mouseOver = function (d) {
        d3.select(this)
            .transition()
            .duration(200)
            .style("stroke", "black")
            .style("stroke-width", 2);

        country = d["toElement"]["__data__"];
        tooltip.style("left", event.pageX + 15 + "px")
            .style("top", event.pageY - 28 + "px")
            .transition()
            .duration(300)
            .style("opacity", 1);

        tooltipcontent(
            country.properties.name,
            Math.round(country.total * 100) / 100,
            year,
            country.id,
            filteredLineData
        );
    };

    let mouseLeave = function () {
        d3.select(this)
            .transition()
            .duration(200)
            .style("stroke", "transparent")
            .style("stroke-width", 1);

        tooltip.transition()
            .duration(300)
            .style("opacity", 0);
    };

    world = svg.append("g").attr("class", "world");

    world.selectAll("path")
        .data(topo.features)
        .enter()
        .append("path")
        .attr("d", d3.geoPath().projection(projection))
        .attr("data-name", (d) => d.properties.name)
        .attr("fill", (d) => {
            d.total = data.get(d.id) || 0;
            return colorScale(d.total);
        })
        .style("stroke", "transparent")
        .attr("class", "Country")
        .attr("id", (d) => d.id)
        .style("opacity", 1)
        .on("mouseover", mouseOver)
        .on("mouseleave", mouseLeave)
        .on("click", (event, d) => {
            click(d);
        })
        .transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .style("opacity", 1);
}

function click(d) {
    var x, y, k;

    if (d && centered !== d) {
        var centroid = path.centroid(d);
        x = -(centroid[0] * 6);
        y = centroid[1] * 6;
        k = 3;
        centered = d;
    } else {
        x = 0;
        y = 0;
        k = 1;
        centered = null;
    }

    if (!isNaN(x) && !isNaN(y)) {
        world.selectAll("path")
            .classed("active", centered && ((d) => d === centered));

        world.transition()
            .duration(300)
            .attr("transform", `translate(${x},${y}) scale(${k})`);
    }
}

function createLegendBar() {
    const legendData = [
        { color: "#a8ddb5", label: "1-10", range: [1, 10] },
        { color: "#7bccc4", label: "10-100", range: [10, 100] },
        { color: "#4eb3d3", label: "100-1k", range: [100, 1000] },
        { color: "#2b8cbe", label: "1k-5k", range: [1000, 5000] },
        { color: "#0868ac", label: ">5k", range: [5000, Infinity] },
    ];

    const container = d3.select(".color-bar-container");

    const legendWidth = 400;
    const legendHeight = 50;
    const blockWidth = legendWidth / legendData.length;

    const svg = container.append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight);

    const legend = svg.selectAll(".legend")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${i * blockWidth}, 0)`);

    legend.append("rect")
        .attr("width", blockWidth - 2)
        .attr("height", 10)
        .attr("fill", (d) => d.color);

    legend.append("text")
        .attr("x", blockWidth / 2)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text((d) => d.label);

    legend.on("mouseover", function (event, d) {
        d3.selectAll(".Country")
            .transition()
            .duration(200)
            .style("opacity", (country) => {
                const density = country.total || 0;
                return density >= d.range[0] && density < d.range[1] ? 1 : 0.3;
            });
    }).on("mouseout", function () {
        d3.selectAll(".Country")
            .transition()
            .duration(200)
            .style("opacity", 1);
    });
}

Promise.all([
    d3.json(worldmap),
    d3.csv(worldpopulationdesity).then((rawData) => {
        filteredData = rawData.filter((d) => d["Year"] === "2023");
        filteredData.forEach((d) => {
            data.set(d["Code"], +d["Population density"]);
        });
        filteredLineData = createFilteredLineData(rawData);
    }),
]).then(([geojson]) => {
    ready(null, geojson);
    createLegendBar();
}).catch((error) => {
    console.error("Error loading data:", error);
});
