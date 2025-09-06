/**
 * level1_4.js
 *
 * Renders a grid visualization showing the percentage contribution of each
 * computer science subfield to total research output over time. Visual encoding
 * includes color intensity and overlaid dots for top topics.
 *
 * Used by: main.js
 * Dependencies: infoModal.js, l1Composite.json (data)
 */


import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel1_4({onSelect}) {
    fetch('data/l1Composite.json')
        .then(res => res.json())
        .then(json => {
            const originalData = json.data;

            const container = document.getElementById('plot');
            injectInfoAndModal({
                container,
                levelId: 'l1-4',
                infoHTML: `
          <p class="mb-2 text-3xl">Temporal Heatmap Scatter Plot of Subfield Contribution with Topic-Level Overlay.</p>
          <p class="mb-2"><strong>What’s the purpose:</strong> Show the overall publication contribution percentage of a subfield compare to all other subfields.  </p>
          <p class="mb-2"><strong>What’s being shown: </strong> Size of subfield compare to all publication of a year and distribution pattern of top publication topics of that subfield.</p>
          <p class="mb-2"><strong>How is it shown: </strong> Cell color shows the size of the subfield of that year and dots shows distribution pattern of the top publication topics of that subfield of that year.</p>

          <p class="mb-2">Click on a Sub field from the visualization to view details in next level.</p>

        `,
                modalContentHTML: `
          <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
          <p class="text-base text-gray-700">
          <strong class="text-black">Aim:</strong> To provide a comprehensive view of how each computer science subfield has contributed to total research output over time, while simultaneously revealing which topics dominated within each subfield. This helps users, after identifying active fields in the previous level, to explore subfield significance and recognize topic-wise leadership or shifts year by year.
          </p>

          <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
          <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li><strong>Color (Heatmap):</strong> Each cell's background color reflects the <strong>percentage contribution</strong> of a subfield to total research output for a given year. Darker shades indicate higher contributions.</li>
            <li><strong>Dots (Scatter Overlay):</strong> Dots represent the <strong>top N topics</strong> (by publication count) within a subfield and year. Their vertical position corresponds to relative publication volume.</li>
            <li><strong>X-axis:</strong> Encodes <strong>year</strong>.</li>
            <li><strong>Y-axis:</strong> Encodes <strong>computer science subfields</strong>.</li>
            <li><strong>Dot Size:</strong> Fixed small circles for consistency and density readability.</li>
            <li><strong>Color Scale Legend:</strong> A visible color key maps value ranges (e.g., 0–6%, 7–13%, ... >50%) to color intensity.</li>
          </ul>
          <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
          <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
            <li><strong>Year Range Filter:</strong> Specify a custom start and end year to filter the data.</li>
            <li><strong>Top-N Topic Filter:</strong> Control how many top topics appear per cell.</li>
            <li><strong>Interactive Cells:</strong> Clicking a cell invokes the <code>onSelect</code> callback with the subfield name.</li>
            <li><strong>Responsive Grid:</strong> Layout adjusts with year/subfield count.</li>
            <li><strong>Label Wrapping:</strong> Subfield names are wrapped to fit.</li>
            <li><strong>Color Scale Buckets:</strong> Uses a monochromatic blue scale from light to dark.</li>
          </ul>
        `
            });

            container.innerHTML = `
        <div id="year-range-controls" class="mb-3 font-sans flex items-center gap-4 flex-wrap">
          <label class="flex items-center gap-2">From:
            <input type="number" id="fromYear" class="border px-2 py-1 w-20 rounded-sm bg-white" />
          </label>
          <label class="flex items-center gap-2">To:
            <input type="number" id="toYear" class="border px-2 py-1 w-20 rounded-sm bg-white" />
          </label>
          <label class="flex items-center gap-2">Top:
            <input type="number" id="topCount" class="border px-2 py-1 w-20 rounded-sm bg-white" min="0" value="10" />
          </label>
          <button id="applyRange" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm">Apply Filter</button>
        </div>
        <div class="mb-4 text-sm" id="color-legend">
         <div class="mb-1 font-medium">Color Scale: Size Percentage (Blue-to-Deep Blue)</div>
            <div class="flex gap-3 items-center flex-wrap text-xs">
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#edf8fb"></div><span>0–1.3%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#ccebc5"></div><span>1.3–2.0%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#a8ddb5"></div><span>2.0–4.5%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#7bccc4"></div><span>4.5–14.1%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#4eb3d3"></div><span>14.1–23.8%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#2b8cbe"></div><span>23.8–29.7%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#08589e"></div><span>29.7–31.1%</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="w-5 h-5 rounded-sm" style="background:#084081"></div><span>&gt; 31.1%</span>
              </div>
        </div>
       </div>

        <div id="chartContainer"></div>
      `;

            const years = originalData.map(d => d.yearNumber);
            const subFields = originalData[0].value.subFieldAvg.map(d => d.subFieldName);
            const fromInput = document.getElementById('fromYear');
            const toInput = document.getElementById('toYear');
            fromInput.min = toInput.min = years[0];
            fromInput.max = toInput.max = years[years.length - 1];
            fromInput.value = 2001;
            toInput.value = 2024;

            document.getElementById('applyRange').addEventListener('click', () => {
                const fromYear = +fromInput.value;
                const toYear = +toInput.value;
                const topCount = +document.getElementById('topCount').value;

                if (isNaN(fromYear) || isNaN(toYear) || fromYear > toYear || isNaN(topCount) || topCount < 0) {
                    alert("Please enter a valid year range and non-negative top count.");
                    return;
                }

                const filtered = originalData.filter(d => d.yearNumber >= fromYear && d.yearNumber <= toYear);
                drawChart(filtered, topCount);
            });

            drawChart(originalData.filter(d => d.yearNumber >= 2001 && d.yearNumber <= 2024), 10);

            function drawChart(data, topDotCount) {
                const chartContainer = document.getElementById('chartContainer');
                chartContainer.innerHTML = '';

                const cellWidth = 60;
                const cellHeight = 60;
                const padding = 4;

                const displayYears = data.map(d => d.yearNumber);
                const width = displayYears.length * cellWidth + 100;
                const height = subFields.length * cellHeight + 60;

                const svg = d3.select(chartContainer)
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .style('font-family', 'sans-serif')
                    .append('g')
                    .attr('transform', 'translate(100, 20)');

                const colorScale = [
                    {range: [0, 1.3], color: '#edf8fb'},
                    {range: [1.3, 2.0], color: '#ccebc5'},
                    {range: [2.0, 4.5], color: '#a8ddb5'},
                    {range: [4.5, 14.1], color: '#7bccc4'},
                    {range: [14.1, 23.8], color: '#4eb3d3'},
                    {range: [23.8, 29.7], color: '#2b8cbe'},
                    {range: [29.7, 31.1], color: '#08589e'},
                    {range: [31.1, Infinity], color: '#084081'}
                ];


                function getColor(val) {
                    for (const {range, color} of colorScale) {
                        const [min, max] = range;
                        if (val >= min && val <= max) return color;
                    }
                    return '#ccc';
                }

                svg.selectAll('.year-label')
                    .data(displayYears)
                    .enter()
                    .append('text')
                    .attr('x', (d, i) => i * cellWidth + cellWidth / 2)
                    .attr('y', -5)
                    .attr('text-anchor', 'middle')
                    .text(d => d);

                svg.selectAll('.subfield-label')
                    .data(subFields)
                    .enter()
                    .append('text')
                    .attr('x', -5)
                    .attr('y', (d, i) => i * cellHeight + cellHeight / 2)
                    .attr('text-anchor', 'end')
                    .attr('alignment-baseline', 'middle')
                    .attr('font-size', '9px')
                    .each(function (d) {
                        const words = d.split(' ');
                        const lines = [];
                        let line = '';
                        for (const word of words) {
                            if ((line + ' ' + word).trim().length > 14) {
                                lines.push(line.trim());
                                line = word;
                            } else {
                                line += ' ' + word;
                            }
                        }
                        if (line) lines.push(line.trim());

                        const text = d3.select(this);
                        lines.forEach((line, i) => {
                            text.append('tspan').text(line).attr('x', -5).attr('dy', i === 0 ? '0' : '1em');
                        });
                    });

                data.forEach((yearData, col) => {
                    yearData.value.subFieldAvg.forEach((sf, row) => {
                        const subFieldName = sf.subFieldName;
                        const pubData = yearData.value.publicationCount.find(d => d.subFieldName === subFieldName);
                        const pubValues = pubData ? pubData.value : [];

                        const scatterX = d3.scaleLinear().domain([0, pubValues.length - 1]).range([padding, cellWidth - padding]);
                        const scatterY = d3.scaleLinear().domain([0, d3.max(pubValues) || 1]).range([cellHeight - padding, padding]);

                        const g = svg.append('g')
                            .attr('transform', `translate(${col * cellWidth}, ${row * cellHeight})`)
                            .style('cursor', 'pointer')
                            .on('click', () => typeof onSelect === 'function' && onSelect(subFieldName));

                        g.append('rect')
                            .attr('width', cellWidth)
                            .attr('height', cellHeight)
                            .attr('fill', getColor(sf.sizePercentage))
                            .attr('stroke', '#ccc')
                            .append('title')
                            .text(`${subFieldName} (${yearData.yearNumber}): ${sf.sizePercentage.toFixed(2)}%`);

                        const dots = topDotCount > 0
                            ? pubValues.slice().sort((a, b) => b - a).slice(0, topDotCount)
                            : pubValues;

                        g.selectAll('circle')
                            .data(dots)
                            .enter()
                            .append('circle')
                            .attr('cx', (d, i) => scatterX(i))
                            .attr('cy', d => scatterY(d))
                            .attr('r', 1.5)
                            .attr('fill', 'black')
                            .attr('vector-effect', 'non-scaling-stroke');
                    });
                });
            }
        });
}
