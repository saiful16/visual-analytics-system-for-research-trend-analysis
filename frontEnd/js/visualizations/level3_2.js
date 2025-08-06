/**
 * level3_2.js
 *
 * Renders a multi-line comparison chart for a selected topic, showing its
 * publication trend over time against the averages of its subfield and the
 * global research landscape. Includes interactive year filtering and tooltips.
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js
 */


import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel3_2({topicName, onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'level3-2-wrapper';
    wrapper.innerHTML = `
    <div class="mb-2 text-lg">
    <strong>Topic Name:</strong> <span id="topicTitle" class="font-semibold text-blue-800"></span>
  </div>
    <div id="controls" class="mb-4 flex flex-col gap-2 font-sans">
      <div class="flex gap-4 items-center flex-wrap justify-start">
        <label>From Year:
          <input type="number" id="fromYear" min="1970" max="2024" value="2001" class="border px-2 py-1 w-24">
        </label>
        <label>To Year:
          <input type="number" id="toYear" min="1970" max="2024" value="2024" class="border px-2 py-1 w-24">
        </label>
        <button id="applyRange" class="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
      </div>
      <div id="legend" class="flex gap-8 items-center flex-wrap text-sm pl-1 pt-1"></div>
    </div>
    <div id="chartArea"></div>
  `;
    container.appendChild(wrapper);

    // Inject modal for encoding info.
    injectInfoAndModal({
        container: wrapper,
        infoHTML: `
<p class="mb-2 text-3xl"> Trend Comparison Line Chart: Topic vs Subfield vs Global</p>
      <p class="mb-2">
        <strong>Overview:</strong> This chart compares the publication trend of a selected topic with its subfield and global research averages over time.
      </p>
      <p class="mb-2">
        <strong>Visual Encoding:</strong> Three colored lines represent yearly publication trends for the topic, its subfield average, and the global average.
      </p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
            <strong class="text-black">Aim:</strong>
            To compare the publication trend of a selected topic with the overall trend of its parent subfield and global computer science research. This allows users to understand the topic’s relative activity over time based on publication count.
        </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Line (Blue):</strong> Represents the smoothed yearly publication count for the selected topic.</li>
        <li><strong>Line (Orange):</strong> Indicates the average publication count across all topics within the same subfield.</li>
        <li><strong>Line (Green):</strong> Shows the average publication count across all topics in the entire research field.</li>
        <li><strong>X-axis:</strong> Encodes the <strong>year</strong>.</li>
        <li><strong>Y-axis:</strong> Encodes the <strong>publication count</strong>.</li>
        <li><strong>Dots on Lines:</strong> Highlight the actual data points used for each smoothed line.</li>
        <li><strong>Color Legend:</strong> A legend identifies each line color and its corresponding trend category.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Year Range Filter:</strong> Users can define the time window using the <code>From Year</code> and <code>To Year</code> inputs.</li>
        <li><strong>Tooltip on Hover:</strong> Hovering over data points reveals exact publication values for the selected year and trend line.</li>
        <li><strong>Smoothed Lines:</strong> Trend lines are generated using Gaussian smoothing for better visual analysis.</li>
        <li><strong>Dynamic Width:</strong> The chart adjusts its width based on the number of years selected.</li>
        <li><strong>Error Handling:</strong> Displays a fallback message if data is unavailable or improperly loaded.</li>
      </ul>

    `
    });

    const chartArea = document.getElementById('chartArea');
    const fromInput = document.getElementById('fromYear');
    const toInput = document.getElementById('toYear');
    const topicTitle = document.getElementById('topicTitle');
    const legendContainer = document.getElementById('legend');

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    // Gaussian smoothing
    function gaussianSmooth(data, key, windowSize = 5, sigma = 1.0) {
        const kernel = [];
        const half = Math.floor(windowSize / 2);
        const gaussian = x => Math.exp(-(x ** 2) / (2 * sigma ** 2));
        let sum = 0;
        for (let i = -half; i <= half; i++) {
            const val = gaussian(i);
            kernel.push(val);
            sum += val;
        }
        kernel.forEach((_, i) => kernel[i] /= sum);

        const smoothed = [];
        for (let i = 0; i < data.length; i++) {
            let acc = 0;
            for (let j = -half; j <= half; j++) {
                const idx = clamp(i + j, 0, data.length - 1);
                acc += data[idx][key] * kernel[j + half];
            }
            smoothed.push({year: data[i].year, value: acc});
        }
        return smoothed;
    }

    apiFetch(`/topic-detail?name=${encodeURIComponent(topicName)}&type=size`)
        .then(res => {
            const rawData = res.averageAndSizeCount;
            const topicLabel = res.topicName || topicName;
            topicTitle.textContent = topicLabel;

            if (!rawData || rawData.length === 0) {
                chartArea.innerHTML = '<p>No data available.</p>';
                return;
            }

            function draw() {
                chartArea.innerHTML = '';
                legendContainer.innerHTML = '';

                let fromYear = clamp(parseInt(fromInput.value), 1970, 2024);
                let toYear = clamp(parseInt(toInput.value), 1970, 2024);
                if (fromYear > toYear) [fromYear, toYear] = [toYear, fromYear];

                fromInput.value = fromYear;
                toInput.value = toYear;

                const filtered = rawData.filter(d => d.year >= fromYear && d.year <= toYear);

                const topicLine = gaussianSmooth(filtered, 'value');
                const subfieldLine = gaussianSmooth(filtered, 'subFieldAvg');
                const globalLine = gaussianSmooth(filtered, 'allTopicAvg');

                const margin = {top: 40, right: 20, bottom: 50, left: 60};
                const width = Math.max(800, filtered.length * 20);
                const height = 400;

                const svg = d3.select('#chartArea')
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x = d3.scaleLinear()
                    .domain([fromYear, toYear])
                    .range([0, width]);

                const y = d3.scaleLinear()
                    .domain([
                        0,
                        d3.max([...topicLine, ...subfieldLine, ...globalLine], d => d.value)
                    ])
                    .nice()
                    .range([height, 0]);

                const line = d3.line()
                    .x(d => x(d.year))
                    .y(d => y(d.value))
                    .curve(d3.curveCatmullRom.alpha(0.5));

                svg.append('g')
                    .attr('transform', `translate(0, ${height})`)
                    .call(d3.axisBottom(x).tickFormat(d3.format('d')));

                svg.append('g')
                    .call(d3.axisLeft(y));

                const tooltip = d3.select('#chartArea')
                    .append('div')
                    .style('position', 'absolute')
                    .style('visibility', 'hidden')
                    .style('background', '#fff')
                    .style('border', '1px solid #ccc')
                    .style('padding', '6px 10px')
                    .style('font-size', '13px')
                    .style('border-radius', '4px')
                    .style('box-shadow', '0 2px 4px rgba(0,0,0,0.2)');

                const linesData = [
                    {name: 'Topic Count', data: topicLine, color: '#1f77b4'},
                    {name: 'Subfield Avg', data: subfieldLine, color: '#ff7f0e'},
                    {name: 'All Topics Avg', data: globalLine, color: '#2ca02c'}
                ];

                linesData.forEach(lineItem => {
                    svg.append('path')
                        .datum(lineItem.data)
                        .attr('fill', 'none')
                        .attr('stroke', lineItem.color)
                        .attr('stroke-width', 2)
                        .attr('d', line);

                    svg.selectAll(`.dot-${lineItem.name.replace(/\s/g, '')}`)
                        .data(lineItem.data)
                        .enter()
                        .append('circle')
                        .attr('cx', d => x(d.year))
                        .attr('cy', d => y(d.value))
                        .attr('r', 4)
                        .attr('fill', lineItem.color)
                        .on('mouseover', (event, d) => {
                            const raw = filtered.find(r => r.year === d.year);
                            let rawValue = 0;
                            if (lineItem.name === 'Topic Count') rawValue = raw?.value ?? 0;
                            if (lineItem.name === 'Subfield Avg') rawValue = raw?.subFieldAvg ?? 0;
                            if (lineItem.name === 'All Topics Avg') rawValue = raw?.allTopicAvg ?? 0;

                            tooltip
                                .style('visibility', 'visible')
                                .html(`
                  <strong>${lineItem.name}</strong><br/>
                  Year: ${d.year}<br/>
                  Value: ${rawValue.toFixed(2)}
                `);
                        })
                        .on('mousemove', event => {
                            tooltip
                                .style('top', `${event.pageY - 40}px`)
                                .style('left', `${event.pageX + 15}px`);
                        })
                        .on('mouseout', () => {
                            tooltip.style('visibility', 'hidden');
                        });

                    const item = document.createElement('div');
                    item.className = 'flex items-center gap-2';
                    item.innerHTML = `
            <div style="width:14px;height:14px;background-color:${lineItem.color};border-radius:2px;"></div>
            <span>${lineItem.name}</span>
          `;
                    legendContainer.appendChild(item);
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
