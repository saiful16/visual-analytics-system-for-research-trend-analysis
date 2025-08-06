/**
 * level1_3.js
 *
 * Renders a grid-based dot matrix plot where each dot encodes publication count
 * and growth rate across topics and years. Includes a modal for encoding info
 * and a custom zoom feature for detailed inspection.
 *
 * Used by: main.js
 * Dependencies: infoModal.js
 */


import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel1_3({onSelect}) {
    let zoomEnabled = false;
    let selectedSubfields = new Set();
    let selectedYearRange = [2001, 2024];

    // Injecting encoding information modal.
    injectInfoAndModal({
        container: document.getElementById('plot'),
        levelId: 'l1-3',
        infoHTML: `
      <p class="mb-2 text-3xl">Dot Matrix of Topic-Level Publication Volume and Growth Across Computer Science Subfields.</p>
      <p class="mb-2"><strong>Overview:</strong> This chart shows how publication volume and growth vary across computer science topics and years.</p>
      <p class="mb-2"><strong>Visual Encoding:</strong> Each dot’s size and dot's count reflects publication volume and color indicates growth rate over time.</p>
      <p class="mb-2">Click on a Sub field from the visualization to view details in next level.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
    <p class="text-base text-gray-700">
     <strong class="text-black">Aim:</strong> To explore the internal composition of computer science subfields by examining the publication volume and growth rate of individual topics from 1970 to 2024. This view enables users to identify which research topics are most active, how rapidly they are evolving, and how their prominence changes over time within each subfield.
    </p>

    <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
    <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
      <li><strong>Dot Size:</strong> Each dot represents <strong>250 publications</strong>. The number of dots in a cell reflects the publication volume for that topic in a given year.</li>
      <li><strong>Dot Color (Growth Rate):</strong> Color encodes growth rate:
        <ul class="list-disc pl-5">
          <li><span style="color:#8b0000;">Dark Red</span> – Growth &lt; -50% (sharp decline)</li>
          <li><span style="color:#f08080;">Light Red</span> – 0% (no growth)</li>
          <li><span style="color:#90ee90;">Light Green</span> – +100% growth</li>
          <li><span style="color:#32cd32;">Medium Green</span> – +200% growth</li>
          <li><span style="color:#006400;">Dark Green</span> – 200% or more (strong growth)</li>
        </ul>
      </li>
      <li><strong>X-axis:</strong> Shows <strong>research topics</strong> grouped by selected computer science subfields.</li>
      <li><strong>Y-axis:</strong> Represents <strong>years</strong> from 2001 to 2024.</li>
      <li><strong>Dot Position:</strong> Each cell corresponds to a <strong>(topic, year)</strong> pair. Dots are arranged in rows inside the cell.</li>
      <li><strong>Tooltips:</strong> Hovering over a dot displays a tooltip with the topic name, year, publication count, and growth rate.</li>
    </ul>

    <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
    <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
      <li><strong>Subfield Filters:</strong> Users can toggle which computer science subfields are shown using checkboxes.</li>
      <li><strong>Year Range and Interval:</strong> Users can filter by <strong>start year</strong>, <strong>end year</strong>, and <strong>interval</strong> (e.g., every 2 years).</li>
      <li><strong>Zoom Mode:</strong> When enabled, clicking a dot opens a modal showing a <strong>bar chart</strong> of yearly publication volume for that topic, colored by growth rate.</li>
      <li><strong>Topic Labels & Grouping:</strong> Topics are labeled and grouped by subfield with divider lines for clarity.</li>
      <li><strong>Legend:</strong> Explains dot size (1 dot = 250 publications) and color encoding for growth rate values.</li>
      <li><strong>Column Separators:</strong> Light vertical lines visually separate topics in the grid layout.</li>
      <li><strong>Performance:</strong> Each cell displays a maximum of 20 dots to ensure readability and responsiveness.</li>
    </ul>
        `
    });

    // Zoom modal (custom-managed).
    const zoomModalHTML = `
    <div id="zoomModal" class="fixed inset-0 z-50 hidden flex items-center justify-center bg-white/10 backdrop-blur-md">
      <div
        id="zoomContentBox"
        class="bg-white/90 backdrop-blur-md border border-cyan-500 p-6 rounded-xl shadow-xl w-[50%] h-[60%] max-w-full relative
               transform scale-95 opacity-0 transition-all duration-300 ease-out overflow-auto"
      >
        <button
          id="closeZoomBtn"
          class="absolute top-2 right-2 px-3 py-1 bg-gray-200 text-black hover:bg-red-600 hover:text-white rounded"
        >
          Close
        </button>
        <div id="zoomContent" class="flex justify-center items-center pt-10 h-full w-full"></div>
      </div>
    </div>
  `;
    document.body.insertAdjacentHTML('beforeend', zoomModalHTML);
    document.getElementById('closeZoomBtn').addEventListener('click', () => {
        const modal = document.getElementById('zoomModal');
        const box = document.getElementById('zoomContentBox');
        box.classList.remove('scale-100', 'opacity-100');
        box.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    });

    // Toolbar UI
    const toolbar = document.createElement('div');
    toolbar.innerHTML = `
    <div class="mt-2 border-none rounded-sm flex gap-3">
      <button id="enableZoomBtn" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm">
        Enable Zoom
      </button>

      <label class="flex items-center gap-1">
        From:
        <input class="w-16 bg-white text-sm px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearStart" value="2001" />
        <span>To:</span>
        <input class="w-16 text-sm bg-white px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearEnd" value="2024" />
      </label>

      <label class="flex items-center gap-1">
        Interval:
        <input class="w-16 bg-white text-sm px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearInterval" value="2" min="1" />
      </label>

      <button id="applyFilterBtn" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm">
        Apply Filter
      </button>
    </div>

    <div id="subfieldFilters" class="mt-2 grid grid-cols-3 gap-x-3"></div>

    <div id="legend" class="text-xs mt-2 space-y-1">
      <div>1 dot = 250 publications</div>
      <div class="flex items-center flex-wrap gap-1">
        <span class="mr-1">Growth Rate:</span>
        <div class="w-5 h-2 bg-[#8b0000]"></div><span class="mx-1">&lt; -50%</span>
        <div class="w-5 h-2 bg-[#f08080]"></div><span class="mx-1">0%</span>
        <div class="w-5 h-2 bg-[#90ee90]"></div><span class="mx-1">100%</span>
        <div class="w-5 h-2 bg-[#32cd32]"></div><span class="mx-1">200%</span>
        <div class="w-5 h-2 bg-[#006400]"></div><span class="ml-1">200%+</span>
      </div>
    </div>
  `;
    document.getElementById('plot').before(toolbar);

    document.addEventListener('click', function (e) {
        if (e.target && e.target.id === 'enableZoomBtn') {
            zoomEnabled = !zoomEnabled;
            e.target.innerText = zoomEnabled ? 'Zoom Mode: ON (Click a Point)' : 'Enable Zoom';
        }
    });


    fetch('data/combinedCountAndGrowthRateOfTopic.json')
        .then(res => res.json())
        .then(json => {
            const data = json.data;
            const allCells = [];
            const subFieldTopicMap = {};
            const topicsBySubfield = [];
            const subFieldSet = new Set();

            data.forEach(yearEntry => {
                const year = yearEntry.year;
                yearEntry.value.forEach(subFieldEntry => {
                    const subField = subFieldEntry.subField;
                    subFieldSet.add(subField);
                    if (!subFieldTopicMap[subField]) {
                        subFieldTopicMap[subField] = new Set();
                        topicsBySubfield.push(subField);
                    }
                    subFieldEntry.value.forEach(topicEntry => {
                        subFieldTopicMap[subField].add(topicEntry.topicName);
                        allCells.push({
                            year,
                            subField,
                            topic: topicEntry.topicName,
                            growthRate: +topicEntry.growthRate,
                            publicationCount: +topicEntry.publicationCount
                        });
                    });
                });
            });

            const subfieldDiv = document.getElementById('subfieldFilters');
            subFieldSet.forEach(sub => {
                const label = document.createElement('label');
                label.innerHTML = `<input type="checkbox"  value="${sub}" checked> ${sub}`;
                subfieldDiv.appendChild(label);
                selectedSubfields.add(sub);
            });

            const defaultSubfield = "Artificial Intelligence";
            selectedSubfields.clear();
            document.querySelectorAll('#subfieldFilters input').forEach(cb => {
                if (cb.value === defaultSubfield) {
                    cb.checked = true;
                    selectedSubfields.add(cb.value);
                } else {
                    cb.checked = false;
                }
            });


            document.querySelectorAll('#subfieldFilters input').forEach(cb => {
                cb.addEventListener('click', (e) => {
                    if (selectedSubfields.size === subFieldSet.size) {
                        selectedSubfields.clear();
                        document.querySelectorAll('#subfieldFilters input').forEach(el => el.checked = false);
                    }
                    if (cb.checked) {
                        selectedSubfields.add(cb.value);
                    } else {
                        selectedSubfields.delete(cb.value);
                    }
                });
            });

            document.getElementById('applyFilterBtn').addEventListener('click', () => {
                selectedYearRange[0] = +document.getElementById('yearStart').value;
                selectedYearRange[1] = +document.getElementById('yearEnd').value;
                render();
            });

            const color = d3.scaleThreshold()
                .domain([-50, 0, 100, 200])
                .range(['#8b0000', '#f08080', '#90ee90', '#32cd32', '#006400']);

            const groupedByTopic = d3.group(allCells, d => d.topic);

            const handleClick = (d) => {
                if (zoomEnabled) {
                    const modal = document.getElementById('zoomModal');
                    const content = document.getElementById('zoomContent');
                    const box = document.getElementById('zoomContentBox');
                    modal.classList.remove('hidden');
                    content.innerHTML = '';
                    requestAnimationFrame(() => {
                        box.classList.remove('scale-95', 'opacity-0');
                        box.classList.add('scale-100', 'opacity-100');
                    });


                    const topicCells = groupedByTopic.get(d.topic);

                    const zoomSvg = d3.select(content)
                        .append('svg')
                        .attr('width', 800)
                        .attr('height', 400)
                        .append('g')
                        .attr('transform', 'translate(50,50)');

                    const zoomX = d3.scaleBand()
                        .domain(topicCells.map(c => c.year))
                        .range([0, 700])
                        .padding(0.1);

                    const zoomY = d3.scaleLinear()
                        .domain([0, d3.max(topicCells, c => c.publicationCount)])
                        .range([300, 0]);

                    zoomSvg.selectAll('rect')
                        .data(topicCells)
                        .enter()
                        .append('rect')
                        .attr('x', c => zoomX(c.year))
                        .attr('y', c => zoomY(c.publicationCount))
                        .attr('width', zoomX.bandwidth())
                        .attr('height', c => 300 - zoomY(c.publicationCount))
                        .attr('fill', c => color(c.growthRate));

                    zoomSvg.append('g')
                        .attr('transform', 'translate(0,300)')
                        .call(d3.axisBottom(zoomX).tickValues(zoomX.domain().filter((_, i) => i % 5 === 0)));

                    zoomSvg.append('g')
                        .call(d3.axisLeft(zoomY));
                } else {
                    if (typeof onSelect === 'function') onSelect(d.subField);
                }
            };

            function render() {
                document.getElementById('plot').innerHTML = '';
                const container = document.getElementById('plot');

                const interval = parseInt(document.getElementById('yearInterval').value) || 0;
                const [startYear, endYear] = selectedYearRange;

                const includedYears = [];
                for (let y = startYear; y <= endYear; y++) {
                    if (interval === 0 || (y - startYear) % interval === 0) {
                        includedYears.push(y);
                    }
                }

                const filtered = allCells.filter(d =>
                    selectedSubfields.has(d.subField) &&
                    includedYears.includes(d.year)
                );

                const topicOrder = [...new Set(filtered.map(d => d.topic))];
                const years = [...new Set(filtered.map(d => d.year))];

                const margin = {top: 120, right: 20, bottom: 30, left: 120},
                    width = container.clientWidth - margin.left - margin.right,
                    height = 800 - margin.top - margin.bottom;

                const svg = d3.select(container)
                    .append('svg')
                    .attr('width', width + margin.left + margin.right)
                    .attr('height', height + margin.top + margin.bottom)
                    .append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                const x = d3.scaleBand()
                    .domain(topicOrder)
                    .range([0, width])
                    .padding(0.05);

                const y = d3.scaleBand()
                    .domain(years)
                    .range([0, height])
                    .padding(0.05);

                svg.selectAll('g.cell')
                    .data(filtered)
                    .enter()
                    .append('g')
                    .attr('class', 'cell')
                    .attr('transform', d => `translate(${x(d.topic)}, ${y(d.year)})`)
                    .each(function (d) {
                        const cell = d3.select(this);
                        const maxDotsPerRow = 3;
                        const spacing = 4;
                        let dotCount = Math.floor(d.publicationCount / 250);

                        if (dotCount === 0 && d.publicationCount > 0) {
                            cell.append('circle')
                                .attr('cx', 2)
                                .attr('cy', 2)
                                .attr('r', .5)
                                .attr('fill', color(d.growthRate))
                                .style('cursor', 'pointer')
                                .on('click', () => handleClick(d))
                                .append('title')
                                .text(`${d.topic} (${d.year})\n${d.publicationCount} pubs\nGrowth: ${d.growthRate}%`);
                            return;
                        }

                        dotCount = Math.min(20, dotCount);
                        for (let i = 0; i < dotCount; i++) {
                            const row = Math.floor(i / maxDotsPerRow);
                            const col = i % maxDotsPerRow;
                            cell.append('circle')
                                .attr('cx', 2 + col * spacing)
                                .attr('cy', 2 + row * spacing)
                                .attr('r', 2)
                                .attr('fill', color(d.growthRate))
                                .style('cursor', 'pointer')
                                .on('click', () => handleClick(d))
                                .append('title')
                                .text(`${d.topic} (${d.year})\n${d.publicationCount} pubs\nGrowth: ${d.growthRate}%`);
                        }

                        //  vertical lines between each topic to separate columns
                        topicOrder.forEach(topic => {
                            const xPos = x(topic);
                            if (xPos !== undefined) {
                                svg.append('line')
                                    .attr('x1', xPos)
                                    .attr('x2', xPos)
                                    .attr('y1', 0)
                                    .attr('y2', height)
                                    .attr('stroke', '#ffffff')
                                    .attr('stroke-width', 0.1);
                            }
                        });

                    });

                svg.append('g')
                    .call(d3.axisLeft(y).tickFormat(d => d.toString()));

                // Add subfield labels and dividers
                let currentX = 0;
                selectedSubfields.forEach(subField => {
                    const topics = [...subFieldTopicMap[subField]].filter(t => topicOrder.includes(t));
                    if (topics.length === 0) return;

                    const firstX = x(topics[0]);
                    const lastX = x(topics[topics.length - 1]) + x.bandwidth();
                    const centerX = (firstX + lastX) / 2;

                    svg.append('text')
                        .attr('x', centerX)
                        .attr('y', -10)
                        .attr('text-anchor', 'end')
                        .attr('transform', `rotate(30, ${centerX}, -10)`)
                        .style('font-size', '9px')
                        .text(subField);

                    if (currentX !== firstX) {
                        svg.append('line')
                            .attr('x1', firstX - x.step() * 0.25)
                            .attr('x2', firstX - x.step() * 0.25)
                            .attr('y1', 0)
                            .attr('y2', height)
                            .attr('stroke', '#aaa')
                            .attr('stroke-width', 0.5);
                    }
                    currentX = lastX;
                });
            }

            render();
        });
}

