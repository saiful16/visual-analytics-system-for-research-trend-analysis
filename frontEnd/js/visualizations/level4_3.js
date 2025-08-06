/**
 * level4_3.js
 *
 * Displays a temporal chart showing co-occurrence frequency of concepts
 * over time with a selected topic and concept hierarchy level. Includes
 * filters for topic, level, year, and number of top concepts to display.
 *
 * Used by: main.js
 * Dependencies: topicList.js, apiFetch.js, infoModal.js
 */


import {topicList} from '../util/topicList.js';
import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel4_3() {
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
          Year:
          <select id="yearSelect" class="border px-2 py-1">
            ${[2020, 2021, 2022, 2023, 2024].map(y => `<option value="${y}" ${y === 2022 ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </label>
        <label>
          Top N:
          <input type="number" id="topInput" class="border px-2 py-1 w-20" value="15" min="1">
        </label>
        <button id="applyBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
      </div>
    </div>
    <h3 id="chartTitle" class="text-lg font-semibold mb-3 text-left"></h3>
    <div id="chartArea"></div>
  `;

    // Inject the info modal
    injectInfoAndModal({
        container,
        levelId: 'l4-3',
        infoHTML: `
<p class="mb-2 text-3xl"> Temporal Bubble Chart of Concept Frequency</p>
      <p class="mb-2"><strong>Overview:</strong> This chart visualizes the frequency of concept occurrences with a selected topic across multiple years using a timeline-based bubble grid.

</p>
      <p class="mb-2"><strong>Visual Encoding:</strong> Each bubble's size represents the count of occurrences for a concept in a specific year, and color uniquely identifies the concept across the timeline.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
      <p class="text-base text-gray-700">
        <strong class="text-black">Aim:</strong>
        To track the co-occurrence count of individual concepts with a selected topic across multiple years using a bubble timeline. This enables users to observe concept relevance and continuity over time through bubble size encoding.
      </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Bubble Size:</strong> The area of each circle encodes the <strong>co-occurrence count</strong> between a concept and the selected topic for a given year.</li>
        <li><strong>Color:</strong> Each concept is assigned a unique color, consistent across all years, to visually group related bubbles.</li>
        <li><strong>X-axis:</strong> Encodes <strong>year</strong>, representing the temporal progression from left to right.</li>
        <li><strong>Y-axis:</strong> Represents <strong>co-occurring concept names</strong>, one row per concept.</li>
        <li><strong>Grid Layout:</strong> Each cell in the concept-year grid contains a bubble if data exists; empty cells indicate no co-occurrence.</li>
        <li><strong>Tooltip:</strong> Hovering over a bubble reveals the exact concept, year, and co-occurrence count.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Topic Selection:</strong> The chart dynamically updates to reflect the selected research topic.</li>
        <li><strong>Top-N Concept Filter:</strong> A numeric input allows users to define how many top co-occurring concepts to display (based on total frequency).</li>
        <li><strong>Color Legend:</strong> A legend at the bottom maps each concept name to its assigned color for reference.</li>
        <li><strong>Interactive Tooltip:</strong> Hover interaction gives precise information about each concept's frequency in a specific year.</li>
        <li><strong>Responsive Layout:</strong> The SVG adjusts to the number of concepts and years, maintaining readability at different sizes.</li>
      </ul>

    `
    });

    const chartArea = document.getElementById('chartArea');
    const chartTitle = document.getElementById('chartTitle');

    document.getElementById('applyBtn').addEventListener('click', async () => {
        chartArea.innerHTML = '';
        const topic = document.getElementById('topicSelect').value;
        const level = document.getElementById('levelSelect').value;
        const year = parseInt(document.getElementById('yearSelect').value);
        const top = document.getElementById('topInput').value;

        const url = `/concepts?name=${encodeURIComponent(topic)}&type=timeLine&level=${level}&year=${year}&top=${top}`;

        try {
            const res = await apiFetch(url);
            const data = res.data || [];
            chartTitle.textContent = res.topicName || topic;

            const years = [2024, 2023, 2022, 2021, 2020];
            const concepts = data.map(d => d.concept);

            const flatData = [];
            data.forEach(conceptData => {
                conceptData.values.forEach(entry => {
                    flatData.push({
                        concept: conceptData.concept,
                        year: entry.year,
                        count: entry.count
                    });
                });
            });

            const margin = {top: 20, right: 40, bottom: 150, left: 80};
            const cellSize = 100;
            const width = concepts.length * cellSize;
            const height = years.length * cellSize;

            const svg = d3.select('#chartArea')
                .append('svg')
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            const x = d3.scaleBand().domain(concepts).range([0, width]).padding(0.2);
            const y = d3.scaleBand().domain(years).range([0, height]).padding(0.2);

            const sizeScale = d3.scaleSqrt()
                .domain([0, d3.max(flatData, d => d.count)])
                .range([0, cellSize / 2 - 10]);

            const colorScale = d3.scaleOrdinal()
                .domain(concepts)
                .range(d3.schemeCategory10);

            svg.selectAll('.concept-line')
                .data(concepts)
                .enter()
                .append('line')
                .attr('x1', d => x(d) + x.bandwidth() / 2)
                .attr('x2', d => x(d) + x.bandwidth() / 2)
                .attr('y1', 0)
                .attr('y2', height)
                .attr('stroke', '#ccc')
                .attr('stroke-width', 1)
                .attr('stroke-dasharray', '4,2');

            svg.selectAll('.year-label')
                .data(years)
                .enter()
                .append('text')
                .attr('x', -10)
                .attr('y', d => y(d) + y.bandwidth() / 2)
                .attr('text-anchor', 'end')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '12px')
                .text(d => d);

            svg.selectAll('.concept-label')
                .data(concepts)
                .enter()
                .append('text')
                .attr('x', d => x(d) + x.bandwidth() / 2)
                .attr('y', height + 40)
                .attr('text-anchor', 'end')
                .attr('transform', d => `rotate(-45, ${x(d) + x.bandwidth() / 2}, ${height + 40})`)
                .attr('font-size', '11px')
                .text(d => d);

            svg.selectAll('.bubble')
                .data(flatData)
                .enter()
                .append('circle')
                .attr('cx', d => x(d.concept) + x.bandwidth() / 2)
                .attr('cy', d => y(d.year) + y.bandwidth() / 2)
                .attr('r', d => sizeScale(d.count))
                .attr('fill', d => colorScale(d.concept))
                .attr('stroke', d => d.year === year ? 'black' : 'none')
                .attr('stroke-width', 2)
                .append('title')
                .text(d => `${d.concept} (${d.year}): ${d.count}`);

            svg.selectAll('text.bubble-count')
                .data(flatData)
                .enter()
                .append('text')
                .attr('class', 'bubble-count')
                .attr('x', d => x(d.concept) + x.bandwidth() / 2)
                .attr('y', d => y(d.year) + y.bandwidth() / 2 + 4)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .attr('font-size', '10px')
                .attr('fill', 'white')
                .text(d => d.count);

        } catch (err) {
            chartArea.innerHTML = `<p class="text-red-500">Failed to load timeline data.</p>`;
            console.error(err);
        }
    });

    document.getElementById('applyBtn').click();
}
