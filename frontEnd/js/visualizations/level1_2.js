/**
 * level1_2.js
 *
 * Renders an animated bar chart race using D3 to show how subfield rankings
 * (based on publication count) change over time. Includes a timeline slider,
 * playback controls, and scaling options (linear/log).
 *
 * Used by: main.js
 * Dependencies: D3.js, subfieldColors.js
 */


import {subfieldColors} from '../util/colors.js';

export function renderLevel1_2({onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = '';

    const width = 800;
    const height = 540;
    const margin = {top: 60, right: 30, bottom: 80, left: 150};

    const toolbar = document.createElement('div');
    toolbar.className = 'mb-2 flex gap-4 items-center text-sm';
    toolbar.innerHTML = `
    <label>
      Speed:
      <select id="speedSelect" class="border px-1 py-0.5 rounded-sm">
        <option value="1500">Slow</option>
        <option value="900" selected>Normal</option>
        <option value="400">Fast</option>
      </select>
    </label>

    <label>
      Scale:
      <select id="scaleSelect" class="border px-1 py-0.5 rounded-sm">
        <option value="linear" selected>Linear</option>
        <option value="log">Log</option>
      </select>
    </label>

    <button id="togglePlayBtn" class="ml-2 px-2 py-1 bg-blue-500 text-white rounded-sm">▶ Play</button>
  `;
    container.before(toolbar);

    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'mt-3 text-center';
    sliderWrapper.innerHTML = `
    <input type="range" id="yearSlider" min="1970" max="2024" step="1" value="1970" style="width: 80%;">
    <div id="sliderYearLabel" class="text-sm mt-1 text-gray-700">Year: 1970</div>
  `;
    container.parentNode.insertBefore(sliderWrapper, container.nextSibling);

    const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const chart = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    let x = d3.scaleLinear().range([0, innerWidth]);
    const y = d3.scaleBand().range([0, innerHeight]).padding(0.2);

    const yearLabel = svg.append('text')
        .attr('x', width - 20)
        .attr('y', height - 30)
        .attr('text-anchor', 'end')
        .attr('font-size', '32px')
        .attr('opacity', 0.6);

    d3.json('data/l1BoxPlot_avgPublicationCount.json').then(raw => {
        const nested = raw?.data;
        if (!Array.isArray(nested)) {
            container.textContent = 'Invalid data.';
            return;
        }

        const yearDataMap = new Map();
        const allYears = new Set();

        nested.forEach(subfield => {
            subfield.values.forEach(({year, value}) => {
                allYears.add(year);
                if (!yearDataMap.has(year)) yearDataMap.set(year, []);
                yearDataMap.get(year).push({subField: subfield.subFieldName, value});
            });
        });

        const sortedYears = Array.from(allYears).sort((a, b) => a - b);
        const yearSlider = document.getElementById('yearSlider');
        const sliderLabel = document.getElementById('sliderYearLabel');

        let currentScale = "linear";
        let speed = +document.getElementById('speedSelect').value;
        let interval = null;
        let currentYearIndex = 0;
        let isPlaying = false;

        const togglePlayBtn = document.getElementById('togglePlayBtn');

        function update(year) {
            yearSlider.value = year;
            sliderLabel.textContent = `Year: ${year}`;

            const data = yearDataMap.get(year) || [];
            const top = data.sort((a, b) => b.value - a.value).slice(0, 10);

            if (currentScale === 'log') {
                x = d3.scaleLog().base(10).domain([1, d3.max(top, d => d.value) || 10]).range([0, innerWidth]);
            } else {
                x = d3.scaleLinear().domain([0, d3.max(top, d => d.value) || 1]).range([0, innerWidth]);
            }

            y.domain(top.map(d => d.subField));

            const bars = chart.selectAll('rect').data(top, d => d.subField);

            bars.exit().transition().duration(300).attr('width', 0).remove();

            bars.transition().duration(300)
                .attr('y', d => y(d.subField))
                .attr('width', d => x(d.value))
                .attr('height', y.bandwidth());

            bars.enter().append('rect')
                .attr('x', 0)
                .attr('y', d => y(d.subField))
                .attr('height', y.bandwidth())
                .attr('width', 0)
                .attr('fill', d => subfieldColors[d.subField] || '#ccc')
                .on('click', (event, d) => {
                    if (typeof onSelect === 'function') onSelect(d.subField);
                })
                .transition().duration(300)
                .attr('width', d => x(d.value));

            const labels = chart.selectAll('text.label').data(top, d => d.subField);

            labels.exit().transition().duration(300).attr('opacity', 0).remove();

            labels.transition().duration(300)
                .attr('y', d => y(d.subField) + y.bandwidth() / 2 + 5)
                .text(d => `${d.subField} (${d.value.toFixed(1)})`);

            labels.enter().append('text')
                .attr('class', 'label')
                .attr('x', 5)
                .attr('y', d => y(d.subField) + y.bandwidth() / 2 + 5)
                .attr('fill', 'black')
                .attr('font-size', '13px')
                .text(d => `${d.subField} (${d.value.toFixed(1)})`)
                .attr('opacity', 0)
                .transition().duration(300)
                .attr('opacity', 1);

            yearLabel.text(year);
        }

        function startAnimation() {
            if (interval) interval.stop();
            interval = d3.interval(() => {
                if (currentYearIndex >= sortedYears.length) {
                    interval.stop();
                    isPlaying = false;
                    togglePlayBtn.innerText = '▶ Play';
                    return;
                }
                const year = sortedYears[currentYearIndex];
                update(year);
                currentYearIndex++;
            }, speed);
        }

        document.getElementById('speedSelect').addEventListener('change', e => {
            speed = +e.target.value;
            if (isPlaying) startAnimation();
        });

        document.getElementById('scaleSelect').addEventListener('change', e => {
            currentScale = e.target.value;
            const year = +yearSlider.value;
            update(year);
        });

        yearSlider.addEventListener('input', e => {
            const selectedYear = +e.target.value;
            sliderLabel.textContent = `Year: ${selectedYear}`;
            currentYearIndex = sortedYears.indexOf(selectedYear);
            update(selectedYear);
            if (interval) interval.stop();
            isPlaying = false;
            togglePlayBtn.innerText = '▶ Play';
        });

        // Play/Pause toggle
        togglePlayBtn.addEventListener('click', () => {
            isPlaying = !isPlaying;
            togglePlayBtn.innerText = isPlaying ? '⏸ Pause' : '▶ Play';
            if (isPlaying) {
                startAnimation();
            } else if (interval) {
                interval.stop();
            }
        });

        update(sortedYears[0]);
    });
}
