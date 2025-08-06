/**
 * level1_1.js
 *
 * Renders a line chart using Plotly to show publication trends across subfields
 * in computer science from 1970 to 2024. Includes interactivity, smoothing,
 * and a modal explanation of the visual encoding.
 *
 * Used by: main.js
 * Dependencies: Plotly, colors.js, loadCss.js, infoModal.js
 */


import {subfieldColors} from '../util/colors.js';
import {loadCss} from '../util/loadCss.js';
import {injectInfoAndModal} from '../util/infoModal.js';

loadCss('css/level1_1.css');

export function renderLevel1_1({onSelect}) {
    // === Clean up any existing modal or info block ===
    document.getElementById('encoding-modal')?.remove();
    document.querySelector('#encoding-info-btn')?.remove();
    document.querySelector('.text-base.font-medium.mb-4')?.remove();

    const Plotly = window.PlotlyGlobal;
    const container = document.getElementById('plot');
    container.innerHTML = '';
    container.style.minHeight = '800px';

    injectInfoAndModal({
        container,
        infoHTML: `
       <p class="mb-2 text-3xl">
        Multi-Line Chart of Computer Science Subfield Publication Volumes Over Time.
      </p>
      <p class="mb-2">
        <strong>Overview:</strong> This chart shows how publication volumes in computer science subfields have changed from 1970 to 2024.
      </p>
      <p class="mb-2">
        <strong>Visual Encoding:</strong> Each colored line represents a subfield; height indicates volume (log scale), and slope shows growth trends.
      </p>
      <p class="mb-2">
       Click on a Sub field from the visualization to view details in next level.
      </p>
    `,
        modalContentHTML: `
      
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
        <p class="text-base text-gray-700">
            <strong class="text-black">Aim:</strong> To uncover long-term publication trends across major subfields of Computer Science, highlighting which areas have experienced growth, decline, or stability over time. The insights gained at this level serve as a foundation for further validation and exploration in subsequent levels.
        </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Color:</strong> Each line uses a unique color to represent a different computer science subfield.</li>
        <li><strong>X-axis:</strong> Represents the publication year, ranging from 1970 to 2024.</li>
        <li><strong>Y-axis (Log Scale):</strong> Represents the number of publications using a logarithmic scale to capture exponential growth.</li>
        <li><strong>Line Height:</strong> Indicates the number of publications (volume) for a subfield in a given year.</li>
        <li><strong>Slope of Line:</strong> Steep upward slopes represent rapid growth in publications; flat or downward slopes suggest stagnation or decline.</li>
        <li><strong>Line Thickness:</strong> Selected subfields are shown with thicker lines (width = 3); unselected fields have thinner lines (width = 1).</li>
        <li><strong>Opacity:</strong> Unselected subfields appear faded to visually de-emphasize them.</li>
        <li><strong>Smoothing:</strong> By default, a Gaussian moving average (σ = 2, size = 9) smooths line trends to reduce noise.</li>
        <li><strong>Hover Info:</strong> Hovering over a line shows the subfield name, year, and publication count.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Interactive Legend:</strong> Click on subfields in the legend to highlight them in the chart. Multiple selections are supported.</li>
        <li><strong>Toggle View Button:</strong> Allows users to switch between raw data and smoothed trends.</li>
        <li><strong>Dynamic Styling:</strong> Selected subfields are highlighted with bold lines and color; others are faded.</li>
        <li><strong>Responsive Plot:</strong> The chart adapts to the container size and supports Plotly's built-in zoom and pan.</li>
        <li><strong>Click Callback:</strong> Clicking on a data point in the chart invokes the <code>onSelect</code> function with the corresponding subfield name.</li>
      </ul>
    `
    });


    // Gaussian smoothing logic
    function gaussianKernel(size, sigma = 1.0) {
        const kernel = [];
        const center = Math.floor(size / 2);
        let sum = 0;
        for (let i = 0; i < size; i++) {
            const x = i - center;
            const value = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel.push(value);
            sum += value;
        }
        return kernel.map(v => v / sum);
    }

    function gaussianMovingAverage(data, size = 9, sigma = 2) {
        const kernel = gaussianKernel(size, sigma);
        const half = Math.floor(size / 2);
        const result = [];

        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let weightSum = 0;
            for (let j = -half; j <= half; j++) {
                const k = i + j;
                if (k >= 0 && k < data.length) {
                    const weight = kernel[j + half];
                    sum += data[k] * weight;
                    weightSum += weight;
                }
            }
            result.push(sum / weightSum);
        }

        return result;
    }

    // Fetching and rendering chart
    fetch('data/l1LineChart.json')
        .then(res => res.json())
        .then(json => {
            const subfields = json.data.map(d => d.subFieldName);
            const selectedSubfields = new Set();

            const tracesRaw = json.data.map(field => ({
                x: field.values.map(v => v.year),
                y: field.values.map(v => v.value),
                mode: 'lines',
                name: field.subFieldName,
                line: {color: subfieldColors[field.subFieldName] || '#ccc', width: 2},
                customdata: Array(field.values.length).fill(field.subFieldName),
                hoverinfo: 'name+x+y'
            }));

            const tracesSmooth = json.data.map(field => {
                const years = field.values.map(v => v.year);
                const values = field.values.map(v => v.value);
                const smoothed = gaussianMovingAverage(values, 9, 2);
                return {
                    x: years,
                    y: smoothed,
                    mode: 'lines',
                    name: field.subFieldName,
                    line: {color: subfieldColors[field.subFieldName] || '#ccc', width: 2},
                    customdata: Array(values.length).fill(field.subFieldName),
                    hoverinfo: 'name+x+y'
                };
            });

            const layout = {
                title: {text: 'Subfield Trends Over Time', y: 0, yanchor: 'bottom', x: 0.5, xanchor: 'center'},
                xaxis: {title: 'Year'},
                yaxis: {
                    title: 'Publication Count',
                    type: 'log',
                    tickvals: [1000, 2000, 4000, 8000, 16000, 32000, 64000],
                    ticktext: ['1k', '2k', '4k', '8k', '16k', '32k', '64k']
                },
                margin: {t: 100, b: 80, l: 60, r: 30},
                hovermode: 'closest',
                height: 650,
                showlegend: false
            };

            let showingSmoothed = true;
            Plotly.newPlot('plot', tracesSmooth, layout);

            const toggleBtn = document.createElement('button');
            toggleBtn.textContent = 'Show Raw Data';
            toggleBtn.className = 'bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm mb-2 text-sm cursor-pointer';

            const legendDiv = document.createElement('div');
            legendDiv.className = 'legend-grid';
            const legendItems = {};

            subfields.forEach((subfield) => {
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `
          <div class="legend-line" style="background:${subfieldColors[subfield]};"></div>
          <span style="flex-grow: 1;">${subfield}</span>
        `;

                legendItem.addEventListener('click', () => {
                    selectedSubfields.has(subfield) ? selectedSubfields.delete(subfield) : selectedSubfields.add(subfield);
                    updateStyling();
                });

                legendItems[subfield] = legendItem;
                legendDiv.appendChild(legendItem);
            });

            function updateStyling() {
                Object.entries(legendItems).forEach(([key, el]) => {
                    if (selectedSubfields.has(key)) {
                        el.classList.add('active');
                        el.style.border = `1px solid ${subfieldColors[key]}`;
                    } else {
                        el.classList.remove('active');
                        el.style.border = '1px solid transparent';
                    }
                });

                const updateColor = [], updateWidth = [];
                const activeTraces = showingSmoothed ? tracesSmooth : tracesRaw;
                activeTraces.forEach((trace, i) => {
                    const isSelected = selectedSubfields.size === 0 || selectedSubfields.has(trace.name);
                    updateColor[i] = isSelected ? subfieldColors[trace.name] || '#ccc' : 'rgba(200, 200, 200, 0.3)';
                    updateWidth[i] = isSelected ? 3 : 1;
                });

                Plotly.restyle('plot', {'line.color': updateColor, 'line.width': updateWidth});
            }

            toggleBtn.addEventListener('click', () => {
                showingSmoothed = !showingSmoothed;
                toggleBtn.textContent = showingSmoothed ? 'Show Raw Data' : 'Show Smoothed Data';
                const newTraces = showingSmoothed ? tracesSmooth : tracesRaw;

                Plotly.react('plot', newTraces, layout).then(() => {
                    updateStyling();
                });
            });

            container.parentNode.insertBefore(toggleBtn, container);
            container.parentNode.insertBefore(legendDiv, container);

            container.on('plotly_click', function (event) {
                const selectedName = event.points[0].customdata;
                if (typeof onSelect === 'function') {
                    onSelect(selectedName);
                }
            });
        });
}