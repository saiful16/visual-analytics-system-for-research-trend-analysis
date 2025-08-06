/**
 * level2_2.js
 *
 * Displays a paginated, filterable grid of topic-level visualizations
 * for a selected subfield. Each topic is encoded with a growth-based
 * color scale. Allows users to navigate pages, filter years, and customize layout.
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js
 */


import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel2_2({subField, onSelect}) {
    const container = document.getElementById('plot');

    const wrapper = document.createElement('div');
    wrapper.id = 'level2-2-wrapper';

    wrapper.innerHTML = `
    <div><h3 class="text-lg font-semibold mb-2">Subfield Name: ${subField}</h3></div>
    <div id="controls" class="mb-4 flex gap-4 items-center flex-wrap font-sans">
      <label>From: <input type="number" id="fromYear" min="1970" max="2024" value="2005" class="border px-2 py-1 w-20" /></label>
      <label>To: <input type="number" id="toYear" min="1970" max="2024" value="2024" class="border px-2 py-1 w-20" /></label>
      <label>Rows: <input type="number" id="rows" min="1" value="10" class="border px-2 py-1 w-16" /></label>
      <button id="prevPage" class="bg-gray-300 px-2 py-1 rounded">Prev</button>
      <span id="pageIndicator" class="text-sm font-semibold">Page 1 of 1</span>
      <button id="nextPage" class="bg-gray-300 px-2 py-1 rounded">Next</button>
      <button id="applyFilter" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>
    </div>
    <div class="mb-4 font-sans text-sm" id="color-legend">
      <div class="mb-1 font-medium">Color Scale: Growth Value</div>
      <div class="flex gap-3 items-center flex-wrap">
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#d73027"></div><span>< 0</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#fc8d59"></div><span>0–50.99</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#fee08b"></div><span>51–100.99</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#d9ef8b"></div><span>101–150.99</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#91cf60"></div><span>151–200.99</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#1a9850"></div><span>> 200</span></div>
      </div>
    </div>
    <div id="chartContainer" class="overflow-auto"></div>
  `;

    container.innerHTML = '';
    container.appendChild(wrapper);

    // Inject modal for encoding info.
    injectInfoAndModal({
        container: wrapper,
        infoHTML: `
      <p class="mb-2 text-3xl"> Topic Growth Heatmap by Year in Selected Subfield</p>
      <p class="mb-2"><strong>Overview:</strong> This chart displays how each research topic in a selected subfield grew in publication count over time using a heatmap layout.</p>
      <p class="mb-2"><strong>Visual Encoding:</strong> Each cell represents the growth of a topic in a specific year, with color indicating the magnitude of growth.</p>
      <p class="mb-2">Click on a Topic from the visualization to view details in next level.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
       <p class="text-base text-gray-700">
        <strong class="text-black">Aim:</strong>
        To assess the annual growth rate of research topics within a selected subfield, revealing how rapidly each topic is expanding or contracting over time. This enables users to identify emerging or declining topics and monitor temporal shifts in research momentum.
       </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
        <li><strong>Color (Heatmap):</strong> Each cell's background color encodes the <strong>growth rate</strong> of a research topic in a given year, compared to the previous year.</li>
        <li><strong>Color Scale:</strong> Growth values are divided into fixed buckets (e.g., &lt;0, 0–50.99, ..., &gt;200) and mapped to a red-to-green color palette, where red represents negative or low growth and green indicates high growth.</li>
        <li><strong>X-axis:</strong> Represents <strong>years</strong> (horizontal timeline).</li>
        <li><strong>Y-axis:</strong> Lists <strong>research topics</strong> within the selected subfield.</li>
        <li><strong>Grid Cell:</strong> Each cell corresponds to one topic in one year and is colored based on its publication growth value.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="text-sm list-disc pl-5 space-y-2 text-gray-700">
        <li><strong>Year Filter:</strong> Users can set a custom <code>From</code> and <code>To</code> year range to explore different time intervals.</li>
        <li><strong>Row Control:</strong> A <code>Rows</code> input allows users to control how many topic rows are displayed per page.</li>
        <li><strong>Pagination:</strong> Users can navigate through multiple topic pages using the <code>Next</code> and <code>Prev</code> buttons.</li>
        <li><strong>Interactive Subfield Display:</strong> The name of the currently selected subfield is shown prominently to orient the user.</li>
        <li><strong>Color Legend:</strong> A visual legend explains the meaning of each growth color bucket for intuitive interpretation.</li>
      </ul>

    `
    });

    const fromInput = document.getElementById('fromYear');
    const toInput = document.getElementById('toYear');
    const rowInput = document.getElementById('rows');
    const chartContainer = document.getElementById('chartContainer');
    const pageIndicator = document.getElementById('pageIndicator');
    let pageIndex = 0;
    let topicData = [];

    function getColor(value) {
        if (value < 0) return '#d73027';
        if (value <= 50.99) return '#fc8d59';
        if (value <= 100.99) return '#fee08b';
        if (value <= 150.99) return '#d9ef8b';
        if (value <= 200.99) return '#91cf60';
        return '#1a9850';
    }

    function wrapText(text, maxWidth) {
        const words = text.split(' ');
        let lines = [], currentLine = '';
        words.forEach(word => {
            const testLine = currentLine + ' ' + word;
            if (testLine.length > maxWidth) {
                lines.push(currentLine.trim());
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        });
        lines.push(currentLine.trim());
        return lines;
    }

    function draw() {
        let from = parseInt(fromInput.value);
        let to = parseInt(toInput.value);
        from = Math.max(1970, Math.min(2024, from));
        to = Math.max(1970, Math.min(2024, to));
        if (from > to) [from, to] = [to, from];
        fromInput.value = from;
        toInput.value = to;

        const rows = parseInt(rowInput.value) || 10;
        const years = Array.from({length: to - from + 1}, (_, i) => from + i);
        const start = pageIndex * rows;
        const visibleTopics = topicData.slice(start, start + rows);
        const totalPages = Math.ceil(topicData.length / rows);
        pageIndicator.textContent = `Page ${pageIndex + 1} of ${totalPages}`;

        const cellWidth = 60;
        const cellHeight = 50;

        const svgWidth = years.length * cellWidth + 200;
        const svgHeight = visibleTopics.length * cellHeight + 100;

        chartContainer.innerHTML = '';
        const svg = d3.select(chartContainer)
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        svg.selectAll('.x-label')
            .data(years)
            .enter()
            .append('text')
            .attr('x', (d, i) => i * cellWidth + 200 + cellWidth / 2)
            .attr('y', 50)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .text(d => d);

        const topicGroup = svg.selectAll('.y-label')
            .data(visibleTopics)
            .enter()
            .append('g')
            .attr('transform', (d, i) => `translate(190, ${i * cellHeight + 80 + cellHeight / 2})`);

        topicGroup.each(function (d) {
            const lines = wrapText(d.topicName, 20);
            const text = d3.select(this).append('text')
                .attr('text-anchor', 'end')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '10px');

            lines.forEach((line, i) => {
                text.append('tspan')
                    .text(line)
                    .attr('x', 0)
                    .attr('dy', i === 0 ? '0' : '1em');
            });
        });

        visibleTopics.forEach((topic, row) => {
            years.forEach((year, col) => {
                const value = topic.values.find(v => v.year === year)?.value ?? null;
                if (value === null) return;

                svg.append('rect')
                    .attr('x', col * cellWidth + 200)
                    .attr('y', row * cellHeight + 80)
                    .attr('width', cellWidth - 1)
                    .attr('height', cellHeight - 1)
                    .attr('fill', getColor(value))
                    .style('cursor', 'pointer')
                    .on('click', () => {
                        if (typeof onSelect === 'function') onSelect(topic.topicName);
                    });
            });
        });
    }

    apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=growth`)
        .then(res => {
            topicData = res.data;
            if (!topicData || topicData.length === 0) {
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
                if ((pageIndex + 1) * rows < topicData.length) {
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
