/**
 * level2_1.js
 *
 * Visualizes topic-level publication trends within a selected subfield
 * using a grid of small multiple line charts. Allows users to filter
 * by year range and customize the layout (rows/columns).
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js
 */


import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel2_1({subField, onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = '';
    injectInfoAndModal({
        container: container,
        levelId: 'l2-1',
        infoHTML: `
<p class="mb-2 text-3xl">Small Multiple Line Charts of Topic-wise Publication Trends within a Selected Subfield.</p>
    <p class="mb-2"><strong>Overview:</strong> Displays the publication trends over time for the top research topics within a selected subfield using individual line charts.</p>
    <p class="mb-2"><strong>Encoding:</strong> Each small line chart represents a topic’s publication count across years, enabling comparison of temporal trends within a subfield.</p>
    <p class="mb-2">Click on a Topic from the visualization to view details in next level.</p>

  `,
        modalContentHTML: `
    <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
    <p class="text-base text-gray-700">
      <strong class="text-black">Aim:</strong>
        To analyze how individual research topics within a selected subfield have evolved over time in terms of publication count. This view helps identify trending, declining, or stable topics, supporting comparison of temporal patterns and deeper exploration within active subfields.
    </p>

    <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
    <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
      <li><strong>Small Multiples:</strong> Each chart represents a distinct research topic within the selected subfield.</li>
      <li><strong>X-axis:</strong> Encodes time (years), adjustable via filter inputs.</li>
      <li><strong>Y-axis:</strong> Shows the publication count for each topic per year, scaled independently per chart.</li>
      <li><strong>Line:</strong> A blue line connects yearly publication values for a topic, showing its temporal trend.</li>
      <li><strong>Grid Layout:</strong> Charts are arranged in a configurable grid (user-defined rows and columns).</li>
      <li><strong>Topic Labels:</strong> Displayed above each chart; long names are truncated for compact layout.</li>
    </ul>
    
    <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
    <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
      <li><strong>Year Filter:</strong> Users can select a custom year range (From/To) to restrict the visible timeline.</li>
      <li><strong>Grid Control:</strong> Users can configure the number of rows and columns to adjust how many charts are shown per page.</li>
      <li><strong>Compare Charts Mode:</strong> Clicking the <em>Compare Charts</em> button activates comparison mode, allowing users to pin multiple topic charts to the top for side-by-side visual comparison. Pinned charts remain visible when navigating pages, and clicking a pinned chart opens its detailed view.</li>
      <li><strong>Pagination:</strong> 'Next' and 'Previous' buttons allow navigation through multiple pages of topic charts.</li>
      <li><strong>Topic Selection:</strong> Clicking on a topic chart invokes the <code>onSelect</code> callback, which can trigger drill-down views or deeper exploration.</li>
      <li><strong>Responsive Rendering:</strong> Charts auto-scale based on selected year range and available data per topic.</li>
    </ul>
  `
    });
    // interactivity layout area.
    const layout = document.createElement('div');
    layout.innerHTML = `
    <div><h3 class="text-lg font-semibold mb-2">Subfield Name: ${subField}</h3></div>
    <div id="controls" class="mb-4 flex gap-4 items-center flex-wrap font-sans">
      <label>From: <input type="number" id="fromYear" min="1970" max="2024" value="2001" class="border px-2 py-1 w-20" /></label>
      <label>To: <input type="number" id="toYear" min="1970" max="2024" value="2024" class="border px-2 py-1 w-20" /></label>
      <label>Rows: <input type="number" id="rows" min="1" value="3" class="border px-2 py-1 w-16" /></label>
      <label>Columns: <input type="number" id="columns" min="1" value="4" class="border px-2 py-1 w-16" /></label>
      <button id="applyFilter" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm">Apply Filter</button>
      <button title="Turn the mode on and click on visualiyations to compare" id="toggleCompare" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm">Compare Charts</button>
    </div>

    <div id="pinnedCharts" class="flex gap-4 mb-4 hidden border-t pt-4 flex-wrap"></div>

    <div class="flex justify-left items-center mb-2 gap-6">
      <button id="prevPage" class="bg-gray-300 hover:bg-gray-600 px-3 py-1 rounded">Previous</button>
      <div id="pageIndicator" class="text-sm font-medium"></div>
      <button id="nextPage" class="bg-gray-300 hover:bg-gray-600 px-3 py-1 rounded">Next</button>
    </div>
    
    <div id="chartGrid" class="grid gap-4"></div>
  `;
    container.appendChild(layout);

    const pinnedDiv = document.getElementById('pinnedCharts');
    const toggleCompareBtn = document.getElementById('toggleCompare');
    const chartGrid = document.getElementById('chartGrid');
    let compareMode = false;
    let pinnedCharts = [];

    toggleCompareBtn.addEventListener('click', () => {
        compareMode = !compareMode;
        toggleCompareBtn.classList.toggle('bg-green-600', compareMode);
        pinnedDiv.classList.toggle('hidden', !compareMode);
        if (!compareMode) {
            pinnedCharts = [];
            pinnedDiv.innerHTML = '';
        }
    });

    function renderChart(wrapper, topic, filtered, from, to) {
        wrapper.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'text-sm font-semibold mb-1 truncate px-1';
        title.textContent = topic.topicName;
        wrapper.appendChild(title);

        const margin = {top: 20, right: 10, bottom: 35, left: 40};
        const width = 220 - margin.left - margin.right;
        const height = 140 - margin.top - margin.bottom;

        const svg = d3.select(wrapper)
            .append('svg')
            .attr('width', 220)
            .attr('height', 140)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([from, to]).range([0, width]);
        const y = d3.scaleLinear().domain([0, d3.max(filtered, d => d.value) || 1]).nice().range([height, 0]);
        const line = d3.line().x(d => x(d.year)).y(d => y(d.value));

        svg.append('g')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format("d")))
            .attr('font-size', '8px');

        svg.append('g')
            .call(d3.axisLeft(y).ticks(3))
            .attr('font-size', '8px');

        svg.append('text')
            .attr('x', width / 2)
            .attr('y', height + 25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .text('Year');

        svg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -height / 2)
            .attr('y', -35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '8px')
            .text('Count');

        svg.append('path')
            .datum(filtered)
            .attr('fill', 'none')
            .attr('stroke', '#1f77b4')
            .attr('stroke-width', 1.5)
            .attr('d', line);
    }

    function renderPage(topicData) {
        const from = Math.max(1970, Math.min(2024, parseInt(document.getElementById('fromYear').value)));
        const to = Math.max(1970, Math.min(2024, parseInt(document.getElementById('toYear').value)));
        const rows = parseInt(document.getElementById('rows').value) || 3;
        const cols = parseInt(document.getElementById('columns').value) || 4;
        const perPage = rows * cols;
        const totalPages = Math.ceil(topicData.length / perPage);
        let currentPage = Math.max(1, Math.min(totalPages, window.currentPage || 1));
        window.currentPage = currentPage;

        const startIdx = (currentPage - 1) * perPage;
        const pageData = topicData.slice(startIdx, startIdx + perPage);
        chartGrid.innerHTML = '';
        chartGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        document.getElementById('pageIndicator').textContent = `Page ${currentPage} of ${totalPages}`;

        pageData.forEach(topic => {
            const filtered = topic.values.filter(v => v.year >= from && v.year <= to);
            if (filtered.length === 0) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'border rounded shadow p-2 hover:bg-gray-50 cursor-pointer flex flex-col';
            renderChart(wrapper, topic, filtered, from, to);

            wrapper.addEventListener('click', () => {
                if (compareMode) {
                    if (!pinnedCharts.includes(topic.topicName)) {
                        const pinned = document.createElement('div');
                        pinned.className = 'border rounded shadow p-2 bg-yellow-50';
                        renderChart(pinned, topic, filtered, from, to);
                        pinnedDiv.appendChild(pinned);
                        pinnedCharts.push(topic.topicName);
                    }
                }
                if (typeof onSelect === 'function') onSelect(topic.topicName);
            });

            chartGrid.appendChild(wrapper);
        });

        document.getElementById('prevPage').onclick = () => {
            if (window.currentPage > 1) {
                window.currentPage--;
                renderPage(topicData);
            }
        };
        document.getElementById('nextPage').onclick = () => {
            if (window.currentPage < totalPages) {
                window.currentPage++;
                renderPage(topicData);
            }
        };
    }

    apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=count`)
        .then(res => {
            const topicData = res.data || [];
            if (topicData.length === 0) {
                chartGrid.innerHTML = '<p>No data available.</p>';
                return;
            }
            document.getElementById('applyFilter').onclick = () => {
                window.currentPage = 1;
                renderPage(topicData);
            };
            renderPage(topicData);
        })
        .catch(err => {
            chartGrid.innerHTML = '<p class="text-red-500">Failed to load data.</p>';
            console.error(err);
        });
}
