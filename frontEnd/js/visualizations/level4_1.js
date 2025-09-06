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
      <p class="mb-2"><strong>What’s the purpose:</strong> Helps identify consistent, emerging, or declining concepts in relation to a research topic. </p>
      <p class="mb-2"><strong>What’s being shown: </strong> Occurrence frequency of top-ranked concepts with a selected topic over time</p>
      <p class="mb-2"><strong>How is it shown: </strong> Encodes frequency as cell color in a heatmap: concept on X-axis, year on Y-axis, and intensity by color.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
            <strong class="text-black">Aim:</strong>
            To visualize the annual co-occurrence frequency of concepts associated with a selected topic using a heatmap. This helps users detect patterns and shifts in related concepts over time based on concept count per year.
        </p>

        <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
        <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
          <li><strong>X-Axis:</strong> Top <code>N</code> concepts (e.g., 20) most frequently co-occurring with the selected topic.</li>
          <li><strong>Y-Axis:</strong> Publication years.</li>
          <li><strong>Cell (Color):</strong> The intensity of blue in each cell encodes the frequency of that concept in that year:
            <ul class="list-disc pl-5">
              <li><code>Darker Blue</code>: Higher co-occurrence frequency</li>
              <li><code>Lighter Blue</code>: Lower frequency</li>
              <li><code>Gray</code>: Zero occurrence</li>
            </ul>
          </li>
          <li><strong>Legend (Color Scale):</strong> Dynamic range quantized into buckets (0, 5–22, 22–29, … up to 326), with one swatch for zero.</li>
          <li><strong>Tooltip:</strong> On hover, shows exact <em>concept name</em>, <em>year</em>, and <em>occurrence count</em>.</li>
          <li><strong>Text Labels:</strong> X-axis labels are rotated concept names. Y-axis labels are year values aligned left.</li>
        </ul>

        <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
        <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
          <li><strong>Topic Dropdown:</strong> Selects the main topic for which concept-level heatmap is to be shown.</li>
          <li><strong>Top-N Input:</strong> User-defined number of concepts to visualize (e.g., Top 20).</li>
          <li><strong>Apply Button:</strong> Triggers chart rendering using the current selections.</li>
          <li><strong>Interactive Tooltip:</strong> Hovering over any cell shows detailed info: concept, year, and count.</li>
          <li><strong>Responsive Legend:</strong> Color bins and range dynamically adapt to actual data distribution, including:
            <ul class="list-disc pl-5">
              <li>Separate bin for 0 values (gray)</li>
              <li>Threshold-based quantile bins for all non-zero values</li>
            </ul>
          </li>
          <li><strong>Auto-Trigger:</strong> Chart renders once automatically when the page is loaded.</li>
        </ul>


      <h2 class="text-lg font-semibold mb-4 mt-2">Concept Levels</h2>
      <p class="text-base text-gray-700">
          In <strong class="text-black">OpenAlex</strong>, concepts are organized hierarchically.
          The <code>level</code> value indicates how broad or specific a concept is:
      </p>

      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mt-3">
           <li><strong>Level 0:</strong> The broadest categories
            <em>(e.g., Biology, Computer Science, Economics)</em>.
          </li>
          <li><strong>Level 1:</strong> Major subfields within those categories
            <em>(e.g., Neuroscience under Biology, Artificial Intelligence under Computer Science)</em>.
          </li>
          <li><strong>Level 2:</strong> Narrower areas inside subfields
            <em>(e.g., Deep Learning under AI, Cognitive Neuroscience under Neuroscience)</em>.
          </li>
          <li><strong>Level 3+:</strong> Highly specific topics and niches
            <em>(e.g., Convolutional Neural Networks under Deep Learning)</em>.
          </li>
      </ul>

      <p class="text-sm text-gray-600 mt-3">
          <strong class="text-black">Rule of Thumb:</strong> A lower
          <code>level</code> means the concept is broader, while a higher
          <code>level</code> indicates a more specialized topic.
      </p>
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

            const years = [2024, 2023, 2022, 2021, 2020];
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

            // ==== CHANGED: Color scale (quantiles for >0, separate zero bucket) ====
            const counts = gridData.map(d => d.count);
            const nonZeroCounts = counts.filter(c => c > 0);
            const zeroColor = '#f0f0f0';
            const blues = d3.schemeBlues[6];

            const quant = d3.scaleQuantile()
                .domain(nonZeroCounts)
                .range(blues);

            const colorFor = (c) => (c === 0 ? zeroColor : quant(c));

            svg.selectAll('rect')
                .data(gridData)
                .enter()
                .append('rect')
                .attr('x', d => x(d.concept))
                .attr('y', d => y(d.year))
                .attr('width', cellSize)
                .attr('height', cellSize)
                .attr('fill', d => colorFor(d.count)) // <— CHANGED: use colorFor
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

            // CHANGED: Legend for quantiles (+ zero bucket)
            legendContainer.innerHTML = `
              <span class="mr-2 whitespace-nowrap">Legend (count scale):</span>
              <svg class="heatmap-legend" width="700" height="40"></svg>
            `;

            const legendSvg = d3.select(legendContainer.querySelector('svg'));
            const legendGroup = legendSvg.append('g').attr('transform', 'translate(10, 10)');
            const swatchW = 90;
            const swatchH = 10;
            const fmt = d3.format('~s');

            // If no non-zero counts, just show the zero swatch.
            if (nonZeroCounts.length === 0) {
                legendGroup.append('rect')
                    .attr('x', 0).attr('width', swatchW).attr('height', swatchH)
                    .attr('fill', zeroColor);
                legendGroup.append('text')
                    .attr('x', swatchW / 2).attr('y', 25).attr('text-anchor', 'middle')
                    .attr('font-size', '10px').text('0');
            } else {
                const qThresholds = quant.quantiles(); // cut points used by the quantile scale
                const [minNZ, maxNZ] = d3.extent(nonZeroCounts);
                const edges = [minNZ, ...qThresholds, maxNZ]; // bin edges

                // Zero bucket
                legendGroup.append('rect')
                    .attr('x', 0).attr('width', swatchW).attr('height', swatchH)
                    .attr('fill', zeroColor);
                legendGroup.append('text')
                    .attr('x', swatchW / 2).attr('y', 25).attr('text-anchor', 'middle')
                    .attr('font-size', '10px').text('0');

                // Quantile buckets
                blues.forEach((color, i) => {
                    const xPos = (i + 1) * swatchW; // +1 to account for zero bucket at index 0
                    legendGroup.append('rect')
                        .attr('x', xPos).attr('width', swatchW).attr('height', swatchH)
                        .attr('fill', color);

                    const from = Math.floor(edges[i]);
                    const to = Math.ceil(edges[i + 1]);
                    legendGroup.append('text')
                      .attr('x', xPos + swatchW / 2).attr('y', 25)
                      .attr('text-anchor', 'middle')
                      .attr('font-size', '10px')
                      .text(`${from}–${to}`);

                });
            }

        } catch (err) {
            chartArea.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
            console.error(err);
        }
    });

    document.getElementById('applyBtn').click();
}
