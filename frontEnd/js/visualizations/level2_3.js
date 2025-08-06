/**
 * level2_3.js
 *
 * Displays a filterable, paginated grid of topic charts for a selected subfield.
 * Offers controls for year range, number of topics shown, and interactive selection
 * of individual charts. Emphasizes deeper exploration of topic-level patterns.
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js
 */


import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';


export function renderLevel2_3({subField, onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML =
        `
    <div id="controls" class="mb-4 flex gap-4 items-center flex-wrap font-sans">
      <label>From: <input type="number" id="fromYear" min="1970" max="2024" value="2005" class="border px-2 py-1 w-20" /></label>
      <label>To: <input type="number" id="toYear" min="1970" max="2024" value="2024" class="border px-2 py-1 w-20" /></label>
      <label>Topics: <input type="number" id="rows" min="1" value="10" class="border px-2 py-1 w-16" /></label>
      <button id="prevPage" class="bg-gray-300 px-2 py-1 rounded">Prev</button>
      <span id="pageIndicator" class="text-sm font-semibold">Page 1</span>
      <button id="nextPage" class="bg-gray-300 px-2 py-1 rounded">Next</button>
      <button id="applyFilter" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>
    </div>
    <div id="chartContainer" class="overflow-auto"></div>
    <div id="selectedTopicLabel" class="mt-4 text-lg font-semibold text-blue-600 text-center"></div>
  `;
//   Inject modal for encoding info.
    injectInfoAndModal({
        container,
        infoHTML: `
<p class="mb-2 text-3xl"> Stacked Area Chart of Topic Trends in Selected Subfield</p>
      <p class="mb-2">
        <strong>Overview:</strong> This chart displays the yearly publication volume of top research topics within a selected subfield using an interactive stacked area layout.
      </p>
      <p class="mb-2">
        <strong>Visual Encoding:</strong> Each colored stream in the stacked area chart represents a topic’s publication count over time, stacked to show cumulative volume.
      </p>
      <p class="mb-2">Click on a Topic from the visualization to view details in next level.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
         <strong class="text-black">Aim:</strong>
         To present the yearly publication distribution of top research topics within a selected subfield, based on their publication count. This view supports comparison of topic prominence over time and helps analyze how the subfield’s focus areas have changed.
        </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
        <li><strong>Stacked Area:</strong> The area chart is stacked vertically, with each layer representing a single topic’s yearly publication count.</li>
        <li><strong>X-axis:</strong> Encodes <strong>years</strong>, showing the temporal progression of publication activity.</li>
        <li><strong>Y-axis:</strong> Represents the <strong>cumulative number of publications</strong> across all displayed topics in a given year.</li>
        <li><strong>Color:</strong> Each topic is assigned a unique, consistent color to differentiate it from others in the stacked area layers.</li>
        <li><strong>Tooltip:</strong> Hovering over the chart reveals topic names and exact publication counts for each year via dynamic tooltips.</li>
        <li><strong>Legend:</strong> A fixed legend maps colors to topic names and highlights the currently hovered topic.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
        <li><strong>Year Range Filter:</strong> Users can filter the visualization by selecting a custom start and end year.</li>
        <li><strong>Topic Count Filter:</strong> The <code>Top</code> input lets users control how many top topics to display (e.g., top 5, top 10).</li>
        <li><strong>Subfield Context:</strong> The selected subfield name is clearly displayed above the chart for context.</li>
        <li><strong>Responsive Design:</strong> The area chart adjusts to screen size and data density for clear readability.</li>
        <li><strong>Interactive Highlighting:</strong> The legend highlights the hovered topic and dims the others for better focus.</li>
      </ul>
    `
    });
    const fromInput = document.getElementById('fromYear');
    const toInput = document.getElementById('toYear');
    const rowInput = document.getElementById('rows');
    const chartContainer = document.getElementById('chartContainer');
    const pageIndicator = document.getElementById('pageIndicator');
    const labelContainer = document.getElementById('selectedTopicLabel');

    let pageIndex = 0;
    let dataByYear = [];
    let sortedTopics = [];
    let currentHighlighted = null;

    function draw(highlightTopic = currentHighlighted) {
        currentHighlighted = highlightTopic;

        let from = Math.max(1970, Math.min(2024, parseInt(fromInput.value)));
        let to = Math.max(1970, Math.min(2024, parseInt(toInput.value)));
        if (from > to) [from, to] = [to, from];
        fromInput.value = from;
        toInput.value = to;

        const topicsPerPage = parseInt(rowInput.value) || 10;
        const years = dataByYear.map(d => d.year).filter(y => y >= from && y <= to);

        let topicCounts = {};
        dataByYear.forEach(entry => {
            if (entry.year >= from && entry.year <= to) {
                entry.topicStats.forEach(stat => {
                    topicCounts[stat.topicName] = (topicCounts[stat.topicName] || 0) + stat.publicationCount;
                });
            }
        });

        sortedTopics = Object.entries(topicCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        const start = pageIndex * topicsPerPage;
        const selectedTopics = sortedTopics.slice(start, start + topicsPerPage);
        const reversedTopics = [...selectedTopics].reverse();
        pageIndicator.textContent = `Page ${pageIndex + 1} of ${Math.ceil(sortedTopics.length / topicsPerPage)}`;

        const stackedData = years.map(year => {
            const entry = dataByYear.find(d => d.year === year);
            const base = {year};
            selectedTopics.forEach(topic => {
                const stat = entry?.topicStats.find(s => s.topicName === topic);
                base[topic] = stat ? stat.publicationCount : 0;
            });
            return base;
        });

        const stack = d3.stack()
            .keys(selectedTopics)
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(stackedData);

        const width = Math.max(1000, years.length * 60);
        const heightPerTopic = 40;
        const minHeight = 250;
        const chartHeight = Math.max(selectedTopics.length * heightPerTopic, minHeight);

        const isShortChart = selectedTopics.length < 11;
        chartContainer.innerHTML = `
      <div style="display: flex; justify-content: center; ${isShortChart ? 'align-items: center; height: 500px;' : ''}">
        <div style="display: flex; flex-direction: row;">
          <div id="streamChart"></div>
          <div id="legendContainer" style="height: ${chartHeight}px; overflow-y: auto; margin-left: 20px; width: 220px;"></div>
        </div>
      </div>
    `;

        const svg = d3.select('#streamChart')
            .append('svg')
            .attr('width', width + 100)
            .attr('height', chartHeight + 50);

        const x = d3.scalePoint()
            .domain(years)
            .range([80, width]);

        const y = d3.scaleLinear()
            .domain([0, d3.max(series[series.length - 1], d => d[1])])
            .range([chartHeight, 0]);

        const color = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(selectedTopics);

        const area = d3.area()
            .x((d, i) => x(years[i]))
            .y0(d => y(d[0]))
            .y1(d => y(d[1]))
            .curve(d3.curveCatmullRom.alpha(0.5));

        svg.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d3.format('d')));

        svg.append('g')
            .attr('transform', `translate(80,0)`)
            .call(d3.axisLeft(y));

        svg.selectAll('.stream')
            .data(series)
            .enter()
            .append('path')
            .attr('class', 'stream')
            .attr('d', area)
            .attr('fill', d => color(d.key))
            .attr('stroke', d => d.key === highlightTopic ? '#000' : 'none')
            .attr('stroke-width', d => d.key === highlightTopic ? 2 : 0)
            .style('filter', d => d.key === highlightTopic ? 'drop-shadow(2px 2px 2px rgba(0,0,0,0.4))' : null)
            .style('cursor', 'pointer')
            .on('click', function (event, d) {
                if (typeof onSelect === 'function') onSelect(d.key);
                labelContainer.textContent = `Selected Topic: ${d.key}`;
                draw(d.key);
            });

        const legendContainer = d3.select('#legendContainer');
        legendContainer.selectAll('*').remove();

        const legend = legendContainer
            .selectAll('.legend-item')
            .data(reversedTopics)
            .enter()
            .append('div')
            .attr('class', 'legend-item')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('margin-bottom', '10px')
            .style('cursor', 'pointer')
            .on('click', function (event, d) {
                if (typeof onSelect === 'function') onSelect(d);
                labelContainer.textContent = `Selected Topic: ${d}`;
                draw(d);
            });

        legend.append('div')
            .style('width', '14px')
            .style('height', '14px')
            .style('margin-right', '8px')
            .style('background-color', d => color(d));

        legend.append('div')
            .style('font-size', '12px')
            .style('font-family', 'sans-serif')
            .style('word-wrap', 'break-word')
            .style('white-space', 'normal')
            .text(d => d);
    }

    apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=size`)
        .then(res => {
            dataByYear = res.data.map(d => {
                const sub = d.subFields?.[0] || {subFieldPublicationCount: 0, topicData: []};
                return {
                    year: d.year,
                    totalPublicationCount: sub.subFieldPublicationCount,
                    topicStats: sub.topicData
                };
            });

            if (!dataByYear || dataByYear.length === 0) {
                chartContainer.innerHTML = '<p>No data available.</p>';
                return;
            }

            draw();

            document.getElementById('applyFilter').addEventListener('click', () => {
                pageIndex = 0;
                draw();
            });

            document.getElementById('prevPage').addEventListener('click', () => {
                if (pageIndex > 0) {
                    pageIndex--;
                    draw();
                }
            });

            document.getElementById('nextPage').addEventListener('click', () => {
                const rows = parseInt(rowInput.value) || 10;
                if ((pageIndex + 1) * rows < sortedTopics.length) {
                    pageIndex++;
                    draw();
                }
            });
        })
        .catch(err => {
            chartContainer.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
            console.error(err);
        });
}

