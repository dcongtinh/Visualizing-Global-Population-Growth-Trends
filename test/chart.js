// Select the container for the chart
const svg = d3.select("svg")
    .attr("viewBox", "0 0 800 400") // Set the viewBox for scaling
    .attr("preserveAspectRatio", "xMidYMid meet"); // Maintain aspect ratio

const margin = { top: 20, right: 30, bottom: 30, left: 40 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

// Create the main chart group
const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Dummy data for the bar chart
const data = [
    { name: "A", value: 30 },
    { name: "B", value: 80 },
    { name: "C", value: 45 },
    { name: "D", value: 60 },
    { name: "E", value: 20 },
    { name: "F", value: 90 },
    { name: "G", value: 50 }
];

// Define the scales
const x = d3.scaleBand()
    .domain(data.map(d => d.name))
    .range([0, width])
    .padding(0.1);

const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)])
    .nice()
    .range([height, 0]);

// Add the x-axis
chart.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

// Add the y-axis
chart.append("g")
    .call(d3.axisLeft(y));

// Add the bars
chart.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.name))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.value));
