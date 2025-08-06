/**
 * level4_1.js
 *
 * Renders a heatmap that displays concept frequency over time based on
 * co-occurrence with a selected topic and concept hierarchy level.
 * Users can filter by topic, concept level, and top N concepts.
 *
 * Used by: main.js
 * Dependencies: topicList.js, apiFetch.js, infoModal.js
 */


import {topicList} from '../util/topicList.js';
import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel4_1({onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = `
    <div class="mb-4 font-sans space-y-2">
      <div class="flex gap-4 flex-wrap items-center">
        <label>
          Topic:
          <select id="topicSelect" class="border px-2 py-1">
            ${topicList.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label>
          Level:
          <select id="levelSelect" class="border px-2 py-1">
            ${[0, 1, 2, 3, 4, 5].map(l => `<option value="${l}" ${l === 3 ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label>
          Top N:
          <input type="number" id="topInput" class="border px-2 py-1 w-20" value="20" min="1">
        </label>
        <button id="applyBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
      </div>
      <h3 id="heatmapTitle" class="text-lg font-semibold mb-3 text-left"></h3>
      <div id="legend" class="legend-container flex gap-2 items-center text-sm font-medium mt-2"></div>
    </div>
    <div id="chartArea"></div>
    <div id="tooltip" style="position: absolute; background: white; border: 1px solid #ccc; padding: 4px 8px; font-size: 12px; pointer-events: none; opacity: 0;"></div>
  `;

    //  Inject modal for encoding info.
    injectInfoAndModal({
        container,
        levelId: 'l4-1',
        infoHTML: `
      <p class="mb-2 text-3xl"> Concept Ranking Heatmap Across Time</p>
      <p class="mb-2"><strong>Overview:</strong> This heatmap shows how frequently concepts occurred with a selected topic over recent years, based on concept-level analysis.</p>
      <p class="mb-2"><strong>Interaction:</strong> Each cell represents occurrence count for a concept in a given year, with darker blue indicating higher frequency.

</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
            <strong class="text-black">Aim:</strong>
            To visualize the annual co-occurrence frequency of concepts associated with a selected topic using a heatmap. This helps users detect patterns and shifts in related concepts over time based on concept count per year.
        </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>X-axis:</strong> Displays the top N co-occurring concepts with the selected topic, sorted alphabetically.</li>
        <li><strong>Y-axis:</strong> Represents the publication year (2020–2024).</li>
        <li><strong>Cell Color:</strong> Encodes concept frequency (co-occurrence count) with darker blues indicating higher values. Zero values use a light gray.</li>
        <li><strong>Color Scale Legend:</strong> Dynamically generated scale maps count ranges to color intensity using a custom threshold-based palette.</li>
        <li><strong>Tooltip:</strong> Hovering over a cell displays the concept, year, and exact frequency value.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Topic Selector:</strong> Choose a topic of interest from the dropdown list.</li>
        <li><strong>Level Selector:</strong> Adjusts the hierarchy depth of concept relationships (e.g., general to specific).</li>
        <li><strong>Top-N Filter:</strong> Defines how many top-ranking concepts to show along the x-axis.</li>
        <li><strong>Interactive Cells:</strong> Hover interaction reveals concept name, year, and exact co-occurrence count via tooltip.</li>
        <li><strong>Responsive Legend:</strong> Automatically updates thresholds and color bins based on data range.</li>
      </ul>

    `
    });

    const chartArea = document.getElementById('chartArea');
    const legendContainer = document.getElementById('legend');
    const heatmapTitle = document.getElementById('heatmapTitle');
    const tooltip = document.getElementById('tooltip');

    document.getElementById('applyBtn').addEventListener('click', async () => {
        chartArea.innerHTML = '';
        legendContainer.innerHTML = '';

        const topic = document.getElementById('topicSelect').value;
        const level = document.getElementById('levelSelect').value;
        const top = document.getElementById('topInput').value;

        const url = `/concepts?name=${encodeURIComponent(topic)}&type=heatMap&level=${level}&year=2020&top=${top}`;
        try {
            const res = await apiFetch(url);
            const data = res.data || [];
            const topicName = res.topicName || topic;
            heatmapTitle.textContent = topicName;

            const years = [2020, 2021, 2022, 2023, 2024];
            const conceptSet = new Set();
            const countMap = {};

            data.forEach(entry => {
                const year = entry.year;
                countMap[year] = {};
                entry.value.forEach(item => {
                    conceptSet.add(item.concept);
                    countMap[year][item.concept] = item.count;
                });
            });

            const concepts = Array.from(conceptSet);
            const gridData = [];

            years.forEach(y => {
                concepts.forEach(c => {
                    gridData.push({
                        year: y,
                        concept: c,
                        count: countMap[y]?.[c] ?? 0
                    });
                });
            });

            const margin = {top: 40, right: 20, bottom: 160, left: 80};
            const cellSize = 40;
            const width = concepts.length * cellSize;
            const height = years.length * cellSize;

            const svg = d3.select('#chartArea')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand().domain(concepts).range([0, width]);
            const y = d3.scaleBand().domain(years).range([0, height]);

            const counts = gridData.map(d => d.count);
            const nonZeroCounts = counts.filter(c => c > 0);
            const minCount = Math.min(...nonZeroCounts);
            const maxCount = Math.max(...nonZeroCounts);
            const steps = 6;
            const stepSize = Math.ceil((maxCount - minCount + 1) / steps);
            const thresholds = Array.from({length: steps}, (_, i) => minCount + i * stepSize);

            const colorPalette = ['#f0f0f0', ...d3.schemeBlues[6]];

            const colorScale = d3.scaleThreshold()
                .domain([0, ...thresholds])
                .range(colorPalette);

            svg.selectAll('rect')
                .data(gridData)
                .enter()
                .append('rect')
                .attr('x', d => x(d.concept))
                .attr('y', d => y(d.year))
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('fill', d => colorScale(d.count))
                .attr('stroke', '#ccc')
                .on('mouseover', function (event, d) {
                    tooltip.style.opacity = 1;
                    tooltip.innerHTML = `${d.concept} (${d.year}): ${d.count}`;
                })
                .on('mousemove', function (event) {
                    tooltip.style.left = event.pageX + 10 + 'px';
                    tooltip.style.top = event.pageY + 10 + 'px';
                })
                .on('mouseout', function () {
                    tooltip.style.opacity = 0;
                });

            svg.append('g')
                .selectAll('text')
                .data(concepts)
                .enter()
                .append('text')
                .attr('x', d => x(d) + cellSize / 2)
                .attr('y', height + 40)
                .attr('text-anchor', 'end')
                .attr('font-size', '11px')
                .attr('transform', d => `rotate(-45, ${x(d) + cellSize / 2}, ${height + 40})`)
                .text(d => d);

            svg.append('g')
                .selectAll('text')
                .data(years)
                .enter()
                .append('text')
                .attr('x', -8)
                .attr('y', d => y(d) + cellSize / 2)
                .attr('text-anchor', 'end')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(d => d);

            // Legend
            legendContainer.innerHTML = `
        <span class="mr-2 whitespace-nowrap">Legend (count scale):</span>
        <svg class="heatmap-legend" width="700" height="40"></svg>
      `;

            const legendSvg = d3.select(legendContainer.querySelector('svg'));
            const legendGroup = legendSvg.append('g').attr('transform', 'translate(10, 10)');
            const legendWidth = 90;

            const legendLabels = ['0', ...thresholds.map((t, i) => {
                const from = t;
                const to = thresholds[i + 1] ?? maxCount;
                return `${from}-${to}`;
            })];

            colorPalette.forEach((color, i) => {
                const xPos = i * legendWidth;

                legendGroup.append('rect')
                    .attr('x', xPos)
                    .attr('width', legendWidth)
                    .attr('height', 10)
                    .attr('fill', color);

                legendGroup.append('text')
                    .attr('x', xPos + legendWidth / 2)
                    .attr('y', 25)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '10px')
                    .text(legendLabels[i]);
            });

        } catch (err) {
            chartArea.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
            console.error(err);
        }
    });

    document.getElementById('applyBtn').click();
}
