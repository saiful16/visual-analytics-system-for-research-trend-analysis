/**
 * level1_3.js
 *
 * Renders a grid-based dot matrix plot where each dot encodes publication count
 * and growth rate across topics and years. Includes a modal for encoding info.
 *
 * Used by: main.js
 * Dependencies: infoModal.js
 */

import { injectInfoAndModal } from '../util/infoModal.js';

// ---------------------------------------------------------------------------
// In-memory cache to preserve UI state across navigations (per page session).
// Resides on window; cleared on full page reload.
const L13_DEFAULTS = {
  yearStart: 2001,
  yearEnd: 2024,
  yearInterval: 1,
  focusMode: false,
  selectedSubfields: ['Artificial Intelligence'], // original default
};
const L13_CACHE = (() => {
  const key = '__L13_CACHE__';
  if (!window[key]) window[key] = { ...L13_DEFAULTS };
  return window[key];
})();

export function renderLevel1_3({ onSelect, onSelectTopic }) {
  // Restore from cache (will be refined after data load)
  let selectedSubfields = new Set(L13_CACHE.selectedSubfields || []);
  let selectedYearRange = [
    Number.isFinite(L13_CACHE.yearStart) ? L13_CACHE.yearStart : L13_DEFAULTS.yearStart,
    Number.isFinite(L13_CACHE.yearEnd) ? L13_CACHE.yearEnd : L13_DEFAULTS.yearEnd,
  ];
  let focusMode = !!L13_CACHE.focusMode;

  // Helpers to persist to cache
  const persistSelections = () => {
    L13_CACHE.selectedSubfields = Array.from(selectedSubfields);
  };
  const persistYearsAndInterval = () => {
    const start = +document.getElementById('yearStart').value;
    const end = +document.getElementById('yearEnd').value;
    const interval = parseInt(document.getElementById('yearInterval').value) || 0;
    L13_CACHE.yearStart = start;
    L13_CACHE.yearEnd = end;
    L13_CACHE.yearInterval = interval;
  };
  const persistFocus = () => {
    L13_CACHE.focusMode = focusMode;
  };

  // Encoding info (text describes dynamic diverging scale)
  injectInfoAndModal({
    container: document.getElementById('plot'),
    levelId: 'l1-3',
    infoHTML: `
      <p class="mb-2 text-3xl">Dot Matrix of Topic-Level Publication Volume and Growth Across Computer Science Subfields.</p>

       <p class="mb-2"><strong>What’s the purpose:</strong> Show the overview of internal status of a subfield and comparison of the size among subfields. </p>
       <p class="mb-2"><strong>What’s being shown: </strong> Overview of publication count and growth rate in all topics of subfield(s) over the year.</p>
       <p class="mb-2"><strong>How is it shown: </strong> Each column represents a topic. Dot cluster shows publication count in that topic. Color of the cluster represents the growth rate.</p>

       <p class="mb-2">Click on a Sub field from the visualization to view details in next level.</p>
    `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
      <p class="text-base text-gray-700">
        <strong class="text-black">Aim:</strong> To explore the internal composition of computer science subfields by examining the publication volume and growth rate of individual topics from 1970 to 2024.
      </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Position (X):</strong> Research topics grouped by their subfield.</li>
        <li><strong>Position (Y):</strong> Publication year.</li>
        <li><strong>Dot Size:</strong> Each dot represents <strong>250 publications</strong>. More dots indicate higher publication volume for a topic in that year.</li>
        <li><strong>Dot Color (Growth Rate):</strong> A diverging color scale indicates growth trend:
          <ul class="list-disc pl-5">
            <li><span style="color:red;">Red</span>: Negative growth.</li>
            <li><span style="color:gray;">Gray</span>: Neutral growth (~0%).</li>
            <li><span style="color:blue;">Blue</span>: Positive growth.</li>
          </ul>
        </li>
        <li><strong>Dot Arrangement:</strong> Dots are arranged in clusters (max 3 per row) within each grid cell to reflect counts up to a cap (18 dots).</li>
        <li><strong>Tooltip:</strong> On hover, displays Topic, Year, Publication Count, and Growth Rate.</li>
        <li><strong>Subfield Labels:</strong> Positioned above columns, rotated and aligned with topic groups.</li>
      </ul>


      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Subfield Filtering:</strong> Users can toggle which subfields are shown using checkboxes.</li>
        <li><strong>Year Range Selection:</strong> Users can select a start and end year, and optionally define an interval.</li>
        <li><strong>Focus Mode:</strong> When enabled, hovering over a topic column dims all other topics for focused exploration.</li>
        <li><strong>Dynamic Color Scaling:</strong> Growth rate color scale auto-adjusts based on the selected year range, ensuring meaningful color interpretation.</li>
        <li><strong>Topic Drill-down:</strong> Clicking a subfield (or topic if focus mode is on) allows user to move to the next level of detail.</li>
        <li><strong>Legend:</strong> Displayed below the controls, showing growth color scale and dot size encoding.</li>
        <li><strong>Responsive Layout:</strong> The visualization adjusts to the container width for flexible display.</li>
        <li><strong>Dot Cap:</strong> Performance is maintained by limiting the dot count per cell to a maximum of 20.</li>
      </ul>

    `
  });

  const toolbar = document.createElement('div');
  toolbar.innerHTML = `
    <div class="mt-2 border-none rounded-sm flex gap-3 items-center">
      <label class="flex items-center gap-1">
        From:
        <input class="w-16 bg-white text-sm px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearStart" value="${selectedYearRange[0]}" />
        <span>To:</span>
        <input class="w-16 text-sm bg-white px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearEnd" value="${selectedYearRange[1]}" />
      </label>

      <label class="flex items-center gap-1">
        Sampling Interval:
        <input class="w-16 bg-white text-sm px-2 py-2 border border-gray-300 rounded-sm" type="number" id="yearInterval" value="${Number.isFinite(L13_CACHE.yearInterval) ? L13_CACHE.yearInterval : 1}" min="1" />
      </label>

      <button id="applyFilterBtn" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm">
        Apply Filter
      </button>

      <!-- Focus toggle -->
      <button id="focusToggleBtn" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-sm">
        Focus: ${focusMode ? 'On' : 'Off'}
      </button>
    </div>

    <div id="subfieldFilters" class="mt-2 grid grid-cols-3 gap-x-3"></div>

    <div id="legend" class="text-xs mt-2 space-y-1">
      <div>1 dot = 250 publications</div>
      <div class="flex items-center flex-wrap gap-1">
        <span class="mr-1">Growth Rate:</span>
            <div class="w-5 h-2 bg-[red]"></div><span class="mx-1">Decline</span>
            <div class="w-5 h-2 bg-[gray]"></div><span class="mx-1">~0%</span>
            <div class="w-5 h-2 bg-[blue]"></div><span class="ml-1">Growth</span>
      </div>
    </div>
  `;
  document.getElementById('plot').before(toolbar);

  fetch('data/combinedCountAndGrowthRateOfTopic.json')
    .then(res => res.json())
    .then(json => {
      // Build compact index: year -> subField -> topic -> {publicationCount, growthRate}
      const raw = json.data;
      const yearsAvailable = new Set();
      const subFieldSet = new Set();
      const index = new Map();

      raw.forEach(yearEntry => {
        const y = yearEntry.year;
        yearsAvailable.add(y);
        const yearMap = new Map();
        yearEntry.value.forEach(sf => {
          const sfName = sf.subField;
          subFieldSet.add(sfName);
          const topicMap = new Map();
          sf.value.forEach(t => {
            topicMap.set(t.topicName, {
              publicationCount: +t.publicationCount,
              growthRate: +t.growthRate
            });
          });
          yearMap.set(sfName, topicMap);
        });
        index.set(y, yearMap);
      });

      // Subfield filters
      const subfieldDiv = document.getElementById('subfieldFilters');

      // If cache has no valid selections (or all selections are unknown), fall back to original default.
      const validCachedSelections = (L13_CACHE.selectedSubfields || []).filter(s => subFieldSet.has(s));
      if (validCachedSelections.length > 0) {
        selectedSubfields = new Set(validCachedSelections);
      } else {
        selectedSubfields = new Set(L13_DEFAULTS.selectedSubfields.filter(s => subFieldSet.has(s)));
      }

      subFieldSet.forEach(sub => {
        const id = `sf-${sub.replace(/\W+/g, '_')}`;
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 text-sm';
        const checked = selectedSubfields.has(sub);
        label.innerHTML = `<input id="${id}" type="checkbox" value="${sub}" ${checked ? 'checked' : ''}> ${sub}`;
        subfieldDiv.appendChild(label);
      });

      // Toggle logic (unchanged behavior; persist to cache)
      document.querySelectorAll('#subfieldFilters input').forEach(cb => {
        cb.addEventListener('click', () => {
          if (selectedSubfields.size === subFieldSet.size) {
            selectedSubfields.clear();
            document.querySelectorAll('#subfieldFilters input').forEach(el => (el.checked = false));
          }
          if (cb.checked) selectedSubfields.add(cb.value);
          else selectedSubfields.delete(cb.value);
          persistSelections();
        });
      });

      // Buttons
      document.getElementById('applyFilterBtn').addEventListener('click', () => {
        selectedYearRange[0] = +document.getElementById('yearStart').value;
        selectedYearRange[1] = +document.getElementById('yearEnd').value;
        persistYearsAndInterval();
        render();
      });

      const focusBtn = document.getElementById('focusToggleBtn');
      focusBtn.addEventListener('click', () => {
        focusMode = !focusMode;
        focusBtn.textContent = `Focus: ${focusMode ? 'On' : 'Off'}`;
        persistFocus();
      });

      // Column highlight helpers
      let colHighlightRect = null;
      function clearColumnHighlight(g) {
        if (colHighlightRect) {
          colHighlightRect.remove();
          colHighlightRect = null;
        }
        g.selectAll('.cell circle').attr('opacity', 1);
      }
      function showColumnHighlight(g, xScale, topic, height) {
        clearColumnHighlight(g);
        const xPos = xScale(topic);
        if (xPos == null) return;

        colHighlightRect = g
          .insert('rect', ':first-child') // behind dots/lines
          .attr('class', 'column-highlight')
          .attr('x', xPos)
          .attr('y', 0)
          .attr('width', xScale.bandwidth())
          .attr('height', height)
          .attr('fill', '#ddd')
          .attr('opacity', 0.35);

        // Only dim other columns in FOCUS mode
        if (focusMode) {
          g.selectAll('.cell').each(function (d) {
            const isCol = d.topic === topic;
            d3.select(this).selectAll('circle').attr('opacity', isCol ? 1 : 0.25);
          });
        } else {
          // Keep all dots fully opaque when focus is OFF
          g.selectAll('.cell circle').attr('opacity', 1);
        }
      }

      // RENDER (years first, then subfields, per-subfield topic ranking by highest year)
      function render() {
        const container = document.getElementById('plot');
        container.innerHTML = '';

        const interval = parseInt(document.getElementById('yearInterval').value) || 0;
        const [startYear, endYear] = selectedYearRange;

        // YEARS FIRST
        const includedYears = [];
        for (let y = startYear; y <= endYear; y++) {
          if (!yearsAvailable.has(y)) continue;
          if (interval === 0 || (y - startYear) % interval === 0) includedYears.push(y);
        }
        if (includedYears.length === 0) {
          container.innerHTML = `<div class="text-sm text-gray-600">No data available for the selected year range.</div>`;
          return;
        }

        const highestYear = Math.max(...includedYears);

        // SUBFIELDS
        const chosenSubfields = [...selectedSubfields];
        if (chosenSubfields.length === 0) {
          container.innerHTML = `<div class="text-sm text-gray-600">Select at least one subfield to render.</div>`;
          return;
        }

        // Per-subfield topic order by publicationCount at highestYear
        const perSubfieldTopicOrder = new Map();
        chosenSubfields.forEach(sf => {
          const allTopicsInRange = new Set();
          includedYears.forEach(y => {
            const yearMap = index.get(y);
            if (!yearMap) return;
            const topicMap = yearMap.get(sf);
            if (!topicMap) return;
            topicMap.forEach((_, topic) => allTopicsInRange.add(topic));
          });

          const highestYearMap = index.get(highestYear);
          const highestTopicMap = highestYearMap ? highestYearMap.get(sf) : null;

          const ranked = [...allTopicsInRange].map(topic => {
            const rec = highestTopicMap ? highestTopicMap.get(topic) : null;
            return { topic, count: rec ? rec.publicationCount : 0 };
          });
          ranked.sort((a, b) => d3.descending(a.count, b.count));
          perSubfieldTopicOrder.set(sf, ranked.map(d => d.topic));
        });

        // Final X order: concat per-subfield blocks
        const xTopics = [];
        chosenSubfields.forEach(sf => {
          const ordered = perSubfieldTopicOrder.get(sf) || [];
          xTopics.push(...ordered);
        });

        // Cells
        const cells = [];
        includedYears.forEach(y => {
          const yearMap = index.get(y);
          if (!yearMap) return;
          chosenSubfields.forEach(sf => {
            const topicMap = yearMap.get(sf);
            if (!topicMap) return;
            const topicsForSf = perSubfieldTopicOrder.get(sf) || [];
            topicsForSf.forEach(topic => {
              const rec = topicMap.get(topic);
              if (!rec) return; // only required data
              cells.push({
                year: y,
                subField: sf,
                topic,
                publicationCount: rec.publicationCount,
                growthRate: rec.growthRate
              });
            });
          });
        });

        const years = includedYears.slice();

        const margin = { top: 120, right: 20, bottom: 30, left: 120 },
          width = (container.clientWidth || 900) - margin.left - margin.right,
          height = 800 - margin.top - margin.bottom;

        const svg = d3
          .select(container)
          .append('svg')
          .attr('width', width + margin.left + margin.right)
          .attr('height', height + margin.top + margin.bottom);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(xTopics).range([0, width]).padding(0.05);

        // Highest year on TOP, lowest on BOTTOM
        const y = d3
          .scaleBand()
          .domain(years.slice().sort((a, b) => d3.descending(a, b)))
          .range([0, height])
          .padding(0.05);

        // Column separators
        xTopics.forEach(topic => {
          const xPos = x(topic);
          if (xPos !== undefined) {
            g.append('line')
              .attr('x1', xPos)
              .attr('x2', xPos)
              .attr('y1', 0)
              .attr('y2', height)
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 0.1);
          }
        });

        //  Dynamic diverging color scale (symmetric around 0, robust to outliers)
        //  Dynamic diverging color scale (symmetric, robust to outliers)
        const growthRates = cells.map(d => d.growthRate).filter(Number.isFinite).sort(d3.ascending);

        // defaults
        let color = () => '#808080'; // fallback = neutral gray
        if (growthRates.length > 0) {
          const p10 = d3.quantileSorted(growthRates, 0.10);
          const p90 = d3.quantileSorted(growthRates, 0.90);
          const M = Math.max(Math.abs(p10 ?? 0), Math.abs(p90 ?? 0)) || 1;

          const ZERO_BAND = 5;              // ±5% treated as neutral
          const NEUTRAL_COLOR = '#808080';  // match legend
          const MIN_T = 0.18;               // minimum chroma jump just outside the neutral band

          // Base diverging interpolator that passes exactly through NEUTRAL_COLOR at 0.5
          const base = (t) => {
            if (t < 0.5) {
              return d3.interpolateRgb("red", NEUTRAL_COLOR)(t * 2);             // red → neutral
            } else {
              return d3.interpolateRgb(NEUTRAL_COLOR, "blue")((t - 0.5) * 2);    // neutral → blue
            }
          };

          // Map negative and positive ranges to keep a visible gap around 0.5
          const negT = d3.scaleLinear()     // [-M, -ZERO_BAND] → [0, 0.5 - MIN_T]
            .domain([-M, -ZERO_BAND])
            .range([0, 0.5 - MIN_T])
            .clamp(true);

          const posT = d3.scaleLinear()     // [ZERO_BAND, M] → [0.5 + MIN_T, 1]
            .domain([ZERO_BAND, M])
            .range([0.5 + MIN_T, 1])
            .clamp(true);

          // Final color function with a neutral “dead zone” and a chroma jump outside it
          color = (g) => {
            if (!Number.isFinite(g)) return NEUTRAL_COLOR;
            if (Math.abs(g) <= ZERO_BAND) return NEUTRAL_COLOR;   // neutral band ⇒ exact gray
            const t = g < 0 ? negT(g) : posT(g);
            return base(t);
          };
        }


        // Draw cells
        const cellG = g
          .selectAll('g.cell')
          .data(cells, d => `${d.subField}||${d.topic}||${d.year}`)
          .enter()
          .append('g')
          .attr('class', 'cell')
          .attr('data-topic', d => d.topic)
          .attr('transform', d => `translate(${x(d.topic)}, ${y(d.year)})`)
          .on('mouseenter', function (event, d) {
            // Always show hover column band (both focus OFF and ON)
            showColumnHighlight(g, x, d.topic, height);
          })
          .on('mouseleave', function () {
            clearColumnHighlight(g);
          })
          .on('click', function (event, d) {
            // Click behavior depends on focus mode
            if (typeof onSelect === 'function') onSelect(d.subField);
            if (focusMode && typeof onSelectTopic === 'function') {
              onSelectTopic(d.topic);
            }
          });

        // Dots
        cellG.each(function (d) {
          const cell = d3.select(this);

          // full-cell hitbox so hover works on whole cell
          cell
            .append('rect')
            .attr('class', 'cell-hit')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', x.bandwidth())
            .attr('height', y.bandwidth())
            .attr('fill', 'transparent')
            .style('pointer-events', 'all')
            .append('title')
            .text(`${d.topic} (${d.year})\n${d.publicationCount} pubs\nGrowth: ${d.growthRate}%`);

          const maxDotsPerRow = 3;
          const spacing = 4;
          let dotCount = Math.floor(d.publicationCount / 250);

          if (dotCount === 0 && d.publicationCount > 0) {
            cell
              .append('circle')
              .attr('cx', 2)
              .attr('cy', 2)
              .attr('r', 0.5)
              .attr('fill', color(d.growthRate))
              .attr('stroke', 'rgba(255,255,255,0.6)')  // subtle stroke for contrast
              .attr('stroke-width', 0.4)
              .style('cursor', 'pointer')
              .append('title')
              .text(`${d.topic} (${d.year})\n${d.publicationCount} pubs\nGrowth: ${d.growthRate}%`);
            return;
          }

          dotCount = Math.min(18, dotCount);
          for (let i = 0; i < dotCount; i++) {
            const row = Math.floor(i / maxDotsPerRow);
            const col = i % maxDotsPerRow;
            cell
              .append('circle')
              .attr('cx', 2 + col * spacing)
              .attr('cy', 2 + row * spacing)
              .attr('r', 2)
              .attr('fill', color(d.growthRate))
              .attr('stroke', 'rgba(255,255,255,0.6)')  // subtle stroke for contrast
              .attr('stroke-width', 0.4)
              .style('cursor', 'pointer')
              .append('title')
              .text(`${d.topic} (${d.year})\n${d.publicationCount} pubs\nGrowth: ${d.growthRate}%`);
          }
        });

        // Y-axis (descending)
        g.append('g')
          .call(d3.axisLeft(y).tickFormat(d => d.toString()))
          .selectAll('text')
          .style('font-size', '10px');

        // Subfield labels & dividers
        let runningIndex = 0;
        chosenSubfields.forEach(sf => {
          const topics = perSubfieldTopicOrder.get(sf) || [];
          if (topics.length === 0) return;

          const firstX = x(topics[0]);
          const lastX = x(topics[topics.length - 1]) + x.bandwidth();
          const centerX = (firstX + lastX) / 2;

          g.append('text')
            .attr('x', centerX)
            .attr('y', -10)
            .attr('text-anchor', 'end')
            .attr('transform', `rotate(30, ${centerX}, -10)`)
            .style('font-size', '9px')
            .text(sf);

          if (runningIndex > 0 && firstX !== undefined) {
            g.append('line')
              .attr('x1', firstX - x.step() * 0.25)
              .attr('x2', firstX - x.step() * 0.25)
              .attr('y1', 0)
              .attr('y2', height)
              .attr('stroke', '#aaa')
              .attr('stroke-width', 0.5);
          }

          runningIndex += topics.length;
        });
      }

      // Initial render using restored cache values
      render();
    });
}
