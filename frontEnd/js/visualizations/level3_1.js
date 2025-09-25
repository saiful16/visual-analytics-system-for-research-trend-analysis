/**
 * level3_1.js
 *
 * Renders a bar chart showing annual publication counts for a selected topic.
 * Includes user controls to filter by year range and a tooltip-enabled chart
 * for exploring publication trends in detail.
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js
 */


import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel3_1({topicName, onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = `
    <div class="mb-2 text-lg">
    <strong>Topic Name:</strong> <span id="topicTitle" class="font-semibold text-blue-800"></span>
  </div>
    <div class="mb-4 flex gap-4 items-center font-sans flex-wrap justify-start">
      <label>From Year:
        <input type="number" id="fromYear" min="1970" max="2024" value="2001" class="border px-2 py-1 w-24">
      </label>
      <label>To Year:
        <input type="number" id="toYear" min="1970" max="2024" value="2024" class="border px-2 py-1 w-24">
      </label>
      <button id="applyRange" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>
    </div>
    <div id="chartArea"></div>
  `;
// Inject modal for encoding info.
    injectInfoAndModal({
        container,
        levelId: 'l3-1',
        infoHTML: `
      <p class="mb-2 text-3xl"> Annual Bar Chart of Topic-Specific Publication Volume</p>
      <p class="mb-2"><strong>What’s the purpose:</strong> To help users examine the temporal trend of a research topic's popularity and activity. Whether it’s growing, stable, or declining based on annual publication volume</p>
      <p class="mb-2"><strong>What’s being shown: </strong> A bar chart displaying the number of publications per year for a selected research topic, with filterable year range.</p>
      <p class="mb-2"><strong>How is it shown: </strong> X-axis encodes the year, Y-axis encodes the publication count and Bar height represents volume of publications</p>
   `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
           <strong class="text-black">Aim:</strong>
            To show the annual publication count for a selected research topic, allowing users to observe its detailed trend over time. This view supports focused exploration of individual topic behavior identified from higher levels, using exact yearly publication volume.
        </p>

        <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
        <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Bar Height:</strong> Each bar’s height represents the number of publications for the selected topic in a given year.</li>
          <li><strong>X-axis:</strong> Encodes the <strong>publication year</strong>.</li>
          <li><strong>Y-axis:</strong> Shows the <strong>number of publications</strong>.</li>
          <li><strong>Color:</strong> All bars use a consistent blue color to indicate volume; no color encoding is applied to value or category.</li>
          <li><strong>Tooltip:</strong> Hovering over a bar displays the year and corresponding publication count.</li>
        </ul>
        
        <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
        <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
          <li><strong>Year Range Filter:</strong> Users can select a custom range of years (From–To) to focus the timeline view.</li>
          <li><strong>Topic Context:</strong> The chart updates based on the selected research topic passed from the previous level.</li>
          <li><strong>Responsive Layout:</strong> The chart dynamically adjusts based on available years and container width.</li>
        </ul>

    `
    });

    const chartArea = document.getElementById('chartArea');
    const fromInput = document.getElementById('fromYear');
    const toInput = document.getElementById('toYear');
    const topicTitle = document.getElementById('topicTitle');

    apiFetch(`/topic-detail?name=${encodeURIComponent(topicName)}&type=count`)
        .then(res => {
            const rawData = res.publicationCount;
            const topicLabel = res.topicName || topicName;
            topicTitle.textContent = topicLabel;

            if (!rawData || rawData.length === 0) {
                chartArea.innerHTML = '<p>No data available.</p>';
                return;
            }

            function clamp(value, min, max) {
                return Math.min(max, Math.max(min, value));
            }

            function draw() {
                chartArea.innerHTML = '';

                let fromYear = clamp(parseInt(fromInput.value), 1970, 2024);
                let toYear = clamp(parseInt(toInput.value), 1970, 2024);
                if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

                fromInput.value = fromYear;
                toInput.value = toYear;

                const filteredData = rawData.filter(d => d.year >= fromYear && d.year <= toYear);

                const margin = {top: 30, right: 20, bottom: 50, left: 60};
                const width = Math.max(800, filteredData.length * 20);
                const height = 400;

                const svg = d3.select('#chartArea')
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x = d3.scaleBand()
                    .domain(filteredData.map(d => d.year))
                    .range([0, width])
                    .padding(0.2);

                const y = d3.scaleLinear()
                    .domain([0, d3.max(filteredData, d => d.value)])
                    .nice()
                    .range([height, 0]);

                const tooltip = d3.select('#chartArea')
                    .append('div')
                    .style('position', 'absolute')
                    .style('visibility', 'hidden')
                    .style('background', '#fff')
                    .style('border', '1px solid #ccc')
                    .style('padding', '5px 10px')
                    .style('font-size', '13px')
                    .style('border-radius', '4px')
                    .style('box-shadow', '0 0 5px rgba(0,0,0,0.2)');

                svg.append('g')
                    .attr('transform', `translate(0, ${height})`)
                    .call(d3.axisBottom(x).tickFormat(d3.format('d')))
                    .selectAll('text')
                    .attr('transform', 'rotate(-45)')
                    .style('text-anchor', 'end');

                svg.append('g')
                    .call(d3.axisLeft(y));


                svg.selectAll('.bar')
                    .data(filteredData)
                    .enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', d => x(d.year))
                    .attr('y', d => y(d.value))
                    .attr('width', x.bandwidth())
                    .attr('height', d => height - y(d.value))
                    .attr('fill', '#3182bd')
                    .on('mouseover', function (event, d) {
                        tooltip.style('visibility', 'visible').text(`Year: ${d.year}, Count: ${d.value}`);
                    })
                    .on('mousemove', function (event) {
                        tooltip
                            .style('top', `${event.pageY - 30}px`)
                            .style('left', `${event.pageX + 10}px`);
                    })
                    .on('mouseout', function () {
                        tooltip.style('visibility', 'hidden');
                    });
            }

            draw();

            document.getElementById('applyRange').addEventListener('click', draw);
        })
        .catch(err => {
            chartArea.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
            console.error(err);
        });
}
