/**
 * level2_3.js
 *
 * Displays a filterable, paginated grid of topic charts for a selected subfield.
 * Users can select topics and click "Compare Selected" to view only those topics.
 * In Compare mode, clicking a stream or legend highlights it and sets `topicName`;
 * removal is only possible from the top pills.
 * NEW: In Compare mode, the highlighted stream shows a dotted outline.
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js, d3
 */

import { apiFetch } from '../util/apiFetch.js';
import { injectInfoAndModal } from '../util/infoModal.js';

// Per-session cache (scoped by subField) to preserve UI state across navigations.
const L23_DEFAULTS = {
  from: 2005,
  to: 2024,
  rows: 10,
  pageIndex: 0,
  compareMode: false,
  selectedTopics: [],     // string[]
  highlighted: null       // string | null
};
const L23_CACHE_ROOT_KEY = '__L23_CACHE__';
function getSubfieldCache(subField) {
  if (!window[L23_CACHE_ROOT_KEY]) window[L23_CACHE_ROOT_KEY] = {};
  const root = window[L23_CACHE_ROOT_KEY];
  if (!root[subField]) root[subField] = { ...L23_DEFAULTS };
  return root[subField];
}
const escAttr = (s) => String(s ?? '').replace(/"/g, '&quot;');

export function renderLevel2_3({ subField, onSelect }) {
  const cache = getSubfieldCache(subField);

  const container = document.getElementById('plot');
  container.innerHTML = `
    <div><h3 class="text-lg font-semibold mb-2">Subfield Name: ${subField}</h3></div>
    <div id="controls" class="mb-4 flex gap-4 items-center flex-wrap font-sans">
      <label>From: <input type="number" id="fromYear" min="1970" max="2024" value="${escAttr(cache.from)}" class="border px-2 py-1 w-20" /></label>
      <label>To: <input type="number" id="toYear" min="1970" max="2024" value="${escAttr(cache.to)}" class="border px-2 py-1 w-20" /></label>
      <label>Topics: <input type="number" id="rows" min="1" value="${escAttr(cache.rows)}" class="border px-2 py-1 w-16" /></label>
      <button id="prevPage" class="bg-gray-300 px-2 py-1 rounded">Prev</button>
      <span id="pageIndicator" class="text-sm font-semibold">Page 1</span>
      <button id="nextPage" class="bg-gray-300 px-2 py-1 rounded">Next</button>
      <button id="applyFilter" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>
      <button id="compareBtn" class="bg-blue-600 text-white px-4 py-2 rounded" disabled>
          ${cache.compareMode ? 'Show All' : `Compare Selected (${(cache.selectedTopics || []).length})`}
      </button>
      <button id="clearSelection" class="bg-gray-200 px-3 py-1 rounded disabled:opacity-50" disabled>Clear</button>
    </div>

    <!-- Selection + Compare -->
    <div id="selectionBar" class="mb-3 flex items-start gap-3 flex-wrap font-sans">
      <div class="text-sm font-semibold mt-1">Selected Topics:</div>
      <div id="selectedChips" class="flex flex-wrap gap-2"></div>
      <div class="ml-auto flex gap-2">

      </div>
    </div>

    <div id="chartContainer" class="overflow-auto"></div>
    <div id="selectedTopicLabel" class="mt-4 text-lg font-semibold text-blue-600 text-center"></div>
  `;

  injectInfoAndModal({
    container,
    infoHTML: `
      <p class="mb-2 text-3xl"> Stacked Area Chart of Topic Trends in Selected Subfield</p>
       <p class="mb-2"><strong>What’s the purpose:</strong> To show how different research topics within a chosen subfield have grown or declined over time compare to other publications of that subfield.</p>
       <p class="mb-2"><strong>What’s being shown: </strong> Publication size of topics in the selected subfield.</p>
       <p class="mb-2"><strong>How is it shown: </strong> A stacked area chart where each colored band is a topic; the band’s height shows its volume and share, and together they add up to the total publications of the selection.</p>
    `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
      <p class="text-sm text-gray-700 mb-4">
        <strong>Aim:</strong> Show the subfield’s overall trajectory and each topic’s contribution over time, so user can identify
        <em>dominant</em>, <em>emerging</em>, and <em>declining</em> topics and explain composition shifts that drive the subfield’s trends.
      </p>
      <h3 class="text-base font-semibold mb-2">Visual Encodings</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>X-Axis:</strong> Represents time (year) from selected range (default: 2005–2024).</li>
        <li><strong>Y-Axis:</strong> Represents the publication count, cumulatively stacked by topic.</li>
        <li><strong>Colored Area (Stream Layers):</strong> Each layer (band) represents a research topic, and its height indicates the topic's publication volume for that year.</li>
        <li><strong>Stacked Composition:</strong> All topic bands are stacked vertically to show their proportion and contribution to the subfield’s total publications each year.</li>
        <li><strong>Color Encoding:</strong> Each topic has a distinct color to differentiate topics.</li>
        <li><strong>Dotted Highlight Fill:</strong> In Compare Mode, the currently selected topic is visually highlighted using a dotted pattern overlay.</li>
        <li><strong>Legend Panel:</strong> Color legend (scrollable) on the right maps colors to topic names; also acts as clickable controls.</li>
      </ul>
      
      <h3 class="text-base font-semibold mb-2">Functionalities</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Year Range Filter:</strong> Users can filter by selecting start and end years using number input fields.</li>
        <li><strong>Topic Count Filter:</strong> Users can specify how many topics to display per page.</li>
        <li><strong>Pagination:</strong> Navigate through multiple topic pages using <em>Prev</em> and <em>Next</em> buttons. Page indicator shows current page.</li>
        <li><strong>Interactive Topic Selection:</strong> Click on a topic band or legend item to select/deselect it. Selected topics are shown as pills above the chart.</li>
        <li><strong>Compare Mode:</strong>
          <ul class="list-disc pl-5">
            <li>Enabled via <em>Compare Selected</em> button once at least one topic is selected.</li>
            <li>Only the selected topics are shown.</li>
            <li>Clicking on a stream highlights that topic with a dotted fill pattern.</li>
            <li>Pills remain visible and removable for managing compared topics.</li>
          </ul>
        </li>
        <li><strong>Clear Selection:</strong> Button to remove all selected topics and exit Compare Mode.</li>
        <li><strong>Responsive Layout:</strong> Horizontal scroll bar added for wide year ranges. Vertical scroll bar appears for long legends.</li>
        <li><strong>Dynamic Redrawing:</strong> Chart updates in real-time upon filtering, selecting, paging, or toggling Compare Mode.</li>
        <li><strong>Highlight Feedback:</strong> Selected and highlighted topics are outlined with a border or pattern for clarity.</li>
        <li><strong>Legend as Control:</strong> Users can also interact with the topic legend to trigger selection/highlighting (like clicking the stream).</li>
        <li><strong>Drill-Down Hook:</strong> If needed, clicking a topic can invoke a deeper navigation into Level 3 visualization.</li>
      </ul>
    `
  });

  // DOM refs
  const fromInput = document.getElementById('fromYear');
  const toInput = document.getElementById('toYear');
  const rowInput = document.getElementById('rows');
  const chartContainer = document.getElementById('chartContainer');
  const pageIndicator = document.getElementById('pageIndicator');
  const labelContainer = document.getElementById('selectedTopicLabel');
  const chipsContainer = document.getElementById('selectedChips');
  const compareBtn = document.getElementById('compareBtn');
  const clearBtn = document.getElementById('clearSelection');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  // State (restored from cache)
  let pageIndex = Number.isFinite(cache.pageIndex) ? cache.pageIndex : 0;
  let dataByYear = [];
  let sortedTopics = [];
  let currentHighlighted = cache.highlighted || null;

  // Selection + Compare mode
  const selectedTopicsGlobal = new Set(Array.isArray(cache.selectedTopics) ? cache.selectedTopics : []);
  let compareMode = !!cache.compareMode;

  // Persistence helpers
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function persistUI() {
    let from = clamp(parseInt(fromInput.value) || L23_DEFAULTS.from, 1970, 2024);
    let to   = clamp(parseInt(toInput.value)   || L23_DEFAULTS.to,   1970, 2024);
    if (from > to) [from, to] = [to, from];
    fromInput.value = from; toInput.value = to;

    cache.from = from;
    cache.to = to;
    cache.rows = Math.max(1, parseInt(rowInput.value) || L23_DEFAULTS.rows);
  }
  function persistPage() { cache.pageIndex = pageIndex; }
  function persistCompare() { cache.compareMode = compareMode; }
  function persistSelection() { cache.selectedTopics = Array.from(selectedTopicsGlobal); }
  function persistHighlight() { cache.highlighted = currentHighlighted; }

  // Behavior helpers (unchanged functionality)
  function setTopicName(name) {
    if (typeof onSelect === 'function') onSelect(name);
  }

  function setCompareMode(enabled) {
    compareMode = enabled;
    compareBtn.textContent = enabled ? 'Show All' : `Compare Selected (${selectedTopicsGlobal.size})`;
    // Disable pagination and rows input in compare mode (visual affordance)
    prevBtn.disabled = enabled;
    nextBtn.disabled = enabled;
    rowInput.disabled = enabled;
    persistCompare();
    draw(currentHighlighted);
  }

  function updateSelectionUI() {
    chipsContainer.innerHTML = '';
    if (selectedTopicsGlobal.size === 0) {
      const empty = document.createElement('span');
      empty.className = 'text-sm text-gray-500';
      empty.textContent = 'None';
      chipsContainer.appendChild(empty);
    } else {
      Array.from(selectedTopicsGlobal).forEach(t => {
        const chip = document.createElement('span');
        chip.className =
          'text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1';
        chip.innerHTML = `<span>${t}</span>
          <button aria-label="Remove ${t}" class="font-bold leading-none">✕</button>`;
        chip.querySelector('button').addEventListener('click', () => {
          selectedTopicsGlobal.delete(t);
          persistSelection();
          compareBtn.disabled = selectedTopicsGlobal.size === 0 && !compareMode;
          clearBtn.disabled = selectedTopicsGlobal.size === 0;
          compareBtn.textContent = compareMode ? 'Show All' : `Compare Selected (${selectedTopicsGlobal.size})`;
          updateSelectionUI();
          draw(currentHighlighted);
        });
        chipsContainer.appendChild(chip);
      });
    }

    compareBtn.disabled = selectedTopicsGlobal.size === 0 && !compareMode;
    clearBtn.disabled = selectedTopicsGlobal.size === 0;

    if (compareMode) {
      pageIndicator.textContent = `Comparing ${selectedTopicsGlobal.size} topic${selectedTopicsGlobal.size > 1 ? 's' : ''}`;
    }
  }

  function toggleTopicSelection(topic) {
    if (selectedTopicsGlobal.has(topic)) {
      selectedTopicsGlobal.delete(topic);
    } else {
      selectedTopicsGlobal.add(topic);
    }
    persistSelection();
    compareBtn.textContent = compareMode ? 'Show All' : `Compare Selected (${selectedTopicsGlobal.size})`;
    compareBtn.disabled = selectedTopicsGlobal.size === 0 && !compareMode;
    clearBtn.disabled = selectedTopicsGlobal.size === 0;
    updateSelectionUI();
  }

  function draw(highlightTopic = currentHighlighted) {
    currentHighlighted = highlightTopic;
    persistHighlight();

    let from = clamp(parseInt(fromInput.value) || L23_DEFAULTS.from, 1970, 2024);
    let to   = clamp(parseInt(toInput.value)   || L23_DEFAULTS.to,   1970, 2024);
    if (from > to) [from, to] = [to, from];
    fromInput.value = from;
    toInput.value = to;

    const topicsPerPage = Math.max(1, parseInt(rowInput.value) || L23_DEFAULTS.rows);
    const years = dataByYear.map(d => d.year).filter(y => y >= from && y <= to);

    // Aggregate to get list of available topics in the filtered range
    const topicCounts = {};
    dataByYear.forEach(entry => {
      if (entry.year >= from && entry.year <= to) {
        entry.topicStats.forEach(stat => {
          topicCounts[stat.topicName] = (topicCounts[stat.topicName] || 0) + stat.publicationCount;
        });
      }
    });

    sortedTopics = Object.keys(topicCounts).sort((a, b) => a.localeCompare(b));

    // Validate cached selection against available topics (once per draw)
    for (const t of Array.from(selectedTopicsGlobal)) {
      if (!sortedTopics.includes(t)) {
        selectedTopicsGlobal.delete(t);
      }
    }
    persistSelection();

    // Decide topics to show
    let topicsToShow;
    if (compareMode) {
      topicsToShow = Array.from(selectedTopicsGlobal).filter(t => sortedTopics.includes(t));
    } else {
      const maxPages = Math.max(1, Math.ceil(sortedTopics.length / topicsPerPage));
      pageIndex = clamp(pageIndex, 0, maxPages - 1);
      persistPage();

      const start = pageIndex * topicsPerPage;
      topicsToShow = sortedTopics.slice(start, start + topicsPerPage);
    }
    const reversedTopics = [...topicsToShow].reverse();

    if (!compareMode) {
      pageIndicator.textContent = `Page ${pageIndex + 1} of ${Math.max(1, Math.ceil(sortedTopics.length / topicsPerPage))}`;
    }

    // Prepare stacked data
    const stackedData = years.map(year => {
      const entry = dataByYear.find(d => d.year === year);
      const base = { year };
      topicsToShow.forEach(topic => {
        const stat = entry?.topicStats.find(s => s.topicName === topic);
        base[topic] = stat ? stat.publicationCount : 0;
      });
      return base;
    });

    const stack = d3.stack().keys(topicsToShow).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
    const series = stack(stackedData);

    const width = Math.max(1000, years.length * 60);
    const heightPerTopic = 40;
    const minHeight = 250;
    const chartHeight = Math.max(topicsToShow.length * heightPerTopic, minHeight);

    const isShortChart = topicsToShow.length < 11;
    chartContainer.innerHTML = `
      <div style="display: flex; justify-content: left; ${isShortChart ? 'align-items: center; height: 500px;' : ''}">
        <div style="display: flex; flex-direction: row;">
          <div id="streamChart"></div>
          <div id="legendContainer" style="height: ${chartHeight}px; overflow-y: auto; margin-left: 20px; width: 240px;"></div>
        </div>
      </div>
    `;

    const svg = d3.select('#streamChart').append('svg').attr('width', width + 100).attr('height', chartHeight + 50);

    const x = d3.scalePoint().domain(years).range([80, width]);

    const y = d3
      .scaleLinear()
      .domain([0, series.length ? d3.max(series[series.length - 1], d => d[1]) : 0])
      .range([chartHeight, 0]);

    const color = d3.scaleOrdinal(d3.schemeTableau10).domain(topicsToShow);

    const area = d3
      .area()
      .x((d, i) => x(years[i]))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Axes
    svg.append('g').attr('transform', `translate(0,${chartHeight})`).call(d3.axisBottom(x).tickFormat(d3.format('d')));
    svg.append('g').attr('transform', `translate(80,0)`).call(d3.axisLeft(y));

    // Define dotted pattern once per draw
    const defs = svg.append('defs');
    defs.append('pattern')
      .attr('id', 'dottedPattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6)
      .append('circle')
      .attr('cx', 3)
      .attr('cy', 3)
      .attr('r', 1.5)
      .attr('fill', 'black');

    // Streams
    svg.selectAll('.stream')
      .data(series, d => d?.key ?? '')
      .enter()
      .append('path')
      .attr('class', 'stream')
      .attr('d', area)
      .attr('fill', d => {
        if (compareMode && d.key === currentHighlighted) {
          return 'url(#dottedPattern)';
        }
        return color(d.key);
      })
      .attr('stroke', d => (d.key === currentHighlighted || selectedTopicsGlobal.has(d.key) ? '#000' : 'none'))
      .attr('stroke-width', d => (d.key === currentHighlighted || selectedTopicsGlobal.has(d.key) ? 2 : 0))
      .style('cursor', 'pointer')
      .on('click', function (event, d) {
        if (compareMode) {
          // Compare mode: highlight + set topicName ONLY
          setTopicName(d.key);
          labelContainer.textContent = `Highlighted: ${d.key}`;
          draw(d.key);
        } else {
          if (typeof onSelect === 'function') onSelect(d.key);
          toggleTopicSelection(d.key);
          labelContainer.textContent = `Selected Topic: ${d.key}`;
          draw(d.key);
        }
      });

    // Legend
    const legendContainer = d3.select('#legendContainer');
    legendContainer.selectAll('*').remove();

    const legend = legendContainer
      .selectAll('.legend-item')
      .data(reversedTopics)
      .enter()
      .append('div')
      .attr('class', 'legend-item')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('margin-bottom', '10px')
      .style('cursor', 'pointer')
      .style('padding', '4px 6px')
      .style('border-radius', '6px')
      .style('border', d => (selectedTopicsGlobal.has(d) ? '2px solid #000' : '1px solid #e5e7eb'))
      .on('click', function (event, d) {
        if (compareMode) {
          // Compare mode: highlight + set topicName ONLY
          setTopicName(d);
          labelContainer.textContent = `Highlighted: ${d}`;
          draw(d);
        } else {
          // Normal mode: drilldown + toggle selection
          if (typeof onSelect === 'function') onSelect(d);
          toggleTopicSelection(d);
          labelContainer.textContent = `Selected Topic: ${d}`;
          draw(d);
        }
      });

    legend
      .append('div')
      .style('width', '14px')
      .style('height', '14px')
      .style('margin-right', '8px')
      .style('background-color', d => color(d));

    legend
      .append('div')
      .style('font-size', '12px')
      .style('font-family', 'sans-serif')
      .style('word-wrap', 'break-word')
      .style('white-space', 'normal')
      .text(d => d);

    // Ensure selection UI reflects current state
    updateSelectionUI();
  }

  // Fetch + init
  chartContainer.innerHTML = '<div class="text-sm text-gray-600">Loading…</div>';
  apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=size`)
    .then(res => {
      dataByYear = res.data.map(d => {
        const sub = d.subFields?.[0] || { subFieldPublicationCount: 0, topicData: [] };
        return {
          year: d.year,
          totalPublicationCount: sub.subFieldPublicationCount,
          topicStats: sub.topicData
        };
      });

      if (!dataByYear || dataByYear.length === 0) {
        chartContainer.innerHTML = '<p>No data available.</p>';
        return;
      }

      // Remove any cached selected topics that no longer exist in this subfield
      const allTopics = new Set(
        dataByYear.flatMap(y => (y.topicStats || []).map(t => t.topicName))
      );
      for (const t of Array.from(selectedTopicsGlobal)) {
        if (!allTopics.has(t)) selectedTopicsGlobal.delete(t);
      }
      persistSelection();

      // Apply initial UI state & button states from cache
      compareBtn.textContent = compareMode ? 'Show All' : `Compare Selected (${selectedTopicsGlobal.size})`;
      compareBtn.disabled = selectedTopicsGlobal.size === 0 && !compareMode;
      clearBtn.disabled = selectedTopicsGlobal.size === 0;
      prevBtn.disabled = compareMode;
      nextBtn.disabled = compareMode;
      rowInput.disabled = compareMode;

      // Initial draw
      draw(currentHighlighted);

      // Wiring (unchanged behavior + persistence)
      document.getElementById('applyFilter').addEventListener('click', () => {
        pageIndex = 0;
        persistUI();
        persistPage();
        draw(currentHighlighted);
      });

      prevBtn.addEventListener('click', () => {
        if (compareMode) return;
        if (pageIndex > 0) {
          pageIndex--;
          persistPage();
          draw(currentHighlighted);
        }
      });

      nextBtn.addEventListener('click', () => {
        if (compareMode) return;
        const rows = Math.max(1, parseInt(rowInput.value) || L23_DEFAULTS.rows);
        if ((pageIndex + 1) * rows < sortedTopics.length) {
          pageIndex++;
          persistPage();
          draw(currentHighlighted);
        }
      });

      compareBtn.addEventListener('click', () => {
        setCompareMode(!compareMode);
      });

      clearBtn.addEventListener('click', () => {
        selectedTopicsGlobal.clear();
        persistSelection();
        compareBtn.disabled = true;
        clearBtn.disabled = true;
        if (compareMode) setCompareMode(false);
        updateSelectionUI();
        draw(currentHighlighted);
      });
    })
    .catch(err => {
      chartContainer.innerHTML = `<p class="text-red-500">Failed to load data.</p>`;
      console.error(err);
    });
}
