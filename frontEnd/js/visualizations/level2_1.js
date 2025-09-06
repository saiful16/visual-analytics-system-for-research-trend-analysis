/**
 * level2_1.js — responsive small-multiples
 * - Shared vs Per-chart Y-scale
 * - Sort (Growth / Name)
 * - Search filter
 * - Synced hover cursor + tooltips (cursor-locked)
 * - Compare pin-board (with remove & click-to-unpin)
 * - Responsive chart sizing via ResizeObserver
 */

import { apiFetch } from '../util/apiFetch.js';
import { injectInfoAndModal } from '../util/infoModal.js';

// ---------------------------------------------------------------------------
// Per-session in-memory cache (persists while the page is open).
// Cache is partitioned by subField so each subfield remembers its own UI state.
const L21_DEFAULTS = {
  from: 2001,
  to: 2024,
  rows: 3,
  cols: 4,
  sharedY: false,
  sortBy: 'Name',     // 'Name' | 'Growth'
  search: '',
  compareMode: false,
  pinned: [],         // topic names
  currentPage: 1
};
const L21_CACHE_ROOT_KEY = '__L21_CACHE__';
function getSubfieldCache(subField) {
  if (!window[L21_CACHE_ROOT_KEY]) window[L21_CACHE_ROOT_KEY] = {};
  const root = window[L21_CACHE_ROOT_KEY];
  if (!root[subField]) root[subField] = { ...L21_DEFAULTS };
  return root[subField];
}
const escAttr = (s) => String(s ?? '').replace(/"/g, '&quot;');

export function renderLevel2_1({ subField, onSelect }) {
  const cache = getSubfieldCache(subField);

  const container = document.getElementById('plot');
  container.innerHTML = '';

  injectInfoAndModal({
    container,
    levelId: 'l2-1',
    infoHTML: `
      <p class="mb-2 text-3xl">Small Multiples Line Chart: Topic-wise Publication Trends</p>
       <p class="mb-2"><strong>What’s the purpose:</strong> Show the trend of publication in topics of a subfield and compare among the topics.  </p>
       <p class="mb-2"><strong>What’s being shown: </strong> Publication count of topics in the selected subfield.</p>
       <p class="mb-2"><strong>How is it shown: </strong> Each chart represents a topic and the line shows the publication count over time. Interactive options are used for comparison.</p>
      `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>

      <p class="text-sm text-gray-700 mb-4">
        <strong>Aim:</strong> Compare topic-wise publication trajectories within a selected computer science subfield to reveal dominant, emerging, stable, and declining topics,supporting overview-to-detail reasoning before drilling down to topic-level analysis.
      </p>

      <h3 class="text-base font-semibold mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Small Multiples:</strong> Grid of individual line charts, one for each topic in the selected subfield.</li>
        <li><strong>X-axis:</strong> Represents time.</li>
        <li><strong>Y-axis:</strong> Represent Publication count. Can be shared or per-chart scale.</li>
        <li><strong>Line Chart:</strong> Line represents the publication trend of a topic over time.</li>
        <li><strong>Peak Marker:</strong> A small circle marks the year with the highest publication count for that topic.</li>
        <li><strong>Tooltip:</strong> On hover, shows year and publication count.</li>
        <li><strong>Synced Vertical Guide:</strong> Vertical guide line appears across all charts when hovering—helps compare publication counts at the same year across topics.</li>
        <li><strong>Title Label:</strong> Each card shows the topic name at the top, with full name on tooltip.</li>
      </ul>


      <h3 class="text-base font-semibold mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Year Range Filter:</strong> Choose "From" and "To" years to focus on a specific time window.</li>
        <li><strong>Grid Control:</strong> Define number of rows and columns (e.g., 3 × 4) to adjust how many charts are shown per page.</li>
        <li><strong>Pagination:</strong> Automatically paginates charts, navigate using "Previous" and "Next" buttons.</li>
        <li><strong>Shared Y-scale:</strong> Toggle between individual Y-axes or one shared Y-axis for comparing absolute magnitudes.</li>
        <li><strong>Sort Options:</strong>
          <ul class="list-disc pl-5">
            <li><strong>Name:</strong> Sort topics alphabetically (A–Z).</li>
            <li><strong>Growth:</strong> Sort by relative growth rate between start and end year.</li>
          </ul>
        </li>
        <li><strong>Search:</strong> Filter charts by topic name using case-insensitive substring match.</li>
        <li><strong>Compare Mode:</strong> Pin multiple charts to a comparison area. Supports:
          <ul class="list-disc pl-5">
            <li>Clicking to pin/unpin charts.</li>
            <li>Dedicated pinned chart section with remove button (✕).</li>
          </ul>
        </li>
        <li><strong>Drill-Down:</strong> Clicking on a card (when not in compare mode) triggers further exploration of that topic (e.g., leads to Level 3).</li>
        <li><strong>Responsive Design:</strong> Chart size auto-adjusts based on the container and grid layout.</li>
        <li><strong>Tooltip Sync:</strong> Hovering over any chart sends a broadcast to all charts to show the guide line at that year.</li>
      </ul>
    `
  });

  // Controls + layout
  const layout = document.createElement('div');
  layout.innerHTML = `
    <div><h3 class="text-lg font-semibold mb-2">Subfield: ${subField}</h3></div>

    <div id="controls" class="mb-4 flex gap-4 items-center flex-wrap font-sans">
      <label>From:
        <input type="number" id="fromYear" min="1970" max="2024" value="${escAttr(cache.from)}" class="border px-2 py-1 w-20" />
      </label>
      <label>To:
        <input type="number" id="toYear" min="1970" max="2024" value="${escAttr(cache.to)}" class="border px-2 py-1 w-20" />
      </label>

      <label>Rows:
        <input type="number" id="rows" min="1" value="${escAttr(cache.rows)}" class="border px-2 py-1 w-16" />
      </label>
      <label>Columns:
        <input type="number" id="columns" min="1" value="${escAttr(cache.cols)}" class="border px-2 py-1 w-16" />
      </label>

      <label class="inline-flex items-center gap-2">
        <input type="checkbox" id="sharedY" ${cache.sharedY ? 'checked' : ''} />
        Shared Y-scale
      </label>

      <label>Sort by:
        <select id="sortBy" class="border px-2 py-1">
          <option value="Name" ${cache.sortBy === 'Name' ? 'selected' : ''}>Name</option>
          <option value="Growth" ${cache.sortBy === 'Growth' ? 'selected' : ''}>Growth</option>
        </select>
      </label>

      <label>Search:
        <input type="text" id="searchBox" value="${escAttr(cache.search)}" placeholder="Filter topics..." class="border px-2 py-1 w-48" />
      </label>

      <button id="applyFilter" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm">Apply Filter</button>
      <button title="Turn the mode on and click visualizations to compare"
              id="toggleCompare" class="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm text-sm">
        ${cache.compareMode ? 'Exit Compare' : 'Compare Charts'}
      </button>
    </div>

    <div id="pinnedAreaWrap" class="mb-4 ${cache.compareMode && (cache.pinned?.length || 0) > 0 ? '' : 'hidden'} border-t pt-4">
      <div class="font-semibold mb-2">Pinned charts</div>
      <div id="pinnedCharts" class="flex gap-4 flex-wrap"></div>
    </div>

    <div class="flex justify-left items-center mb-2 gap-6">
      <button id="prevPage" class="bg-gray-300 hover:bg-gray-600 text-white px-3 py-1 rounded">Previous</button>
      <div id="pageIndicator" class="text-sm font-medium"></div>
      <button id="nextPage" class="bg-gray-300 hover:bg-gray-600 text-white px-3 py-1 rounded">Next</button>
    </div>

    <div id="chartGrid" class="grid gap-4"></div>
  `;
  container.appendChild(layout);

  // Elements
  const chartGrid = document.getElementById('chartGrid');
  const pinnedWrap = document.getElementById('pinnedAreaWrap');
  const pinnedDiv = document.getElementById('pinnedCharts');
  const toggleCompareBtn = document.getElementById('toggleCompare');
  const searchBox = document.getElementById('searchBox');
  const sortBySel = document.getElementById('sortBy');
  const sharedYChk = document.getElementById('sharedY');

  // State (restore from cache)
  let compareMode = !!cache.compareMode;
  if (compareMode) toggleCompareBtn.classList.add('bg-green-600');
  let pinned = Array.isArray(cache.pinned) ? [...cache.pinned] : [];
  let topicData = [];
  let globalMaxCache = 1;
  window.currentPage = Number.isFinite(cache.currentPage) ? cache.currentPage : 1;

  const fmtCount = d3.format(',');

  // Shared hover bus
  let hoverActiveCount = 0;
  let hoverYearShared = null;
  const HOVER_EVT = 'l21-hover-year';
  function broadcastHover(year) {
    hoverYearShared = year;
    window.dispatchEvent(new CustomEvent(HOVER_EVT, { detail: { year } }));
  }

  // Persist helpers
  function persistUI() {
    cache.from = clamp(parseInt(document.getElementById('fromYear').value, 10) || 1970, 1970, 2024);
    cache.to = clamp(parseInt(document.getElementById('toYear').value, 10) || 2024, 1970, 2024);
    cache.rows = Math.max(1, parseInt(document.getElementById('rows').value, 10) || 3);
    cache.cols = Math.max(1, parseInt(document.getElementById('columns').value, 10) || 4);
    cache.sharedY = document.getElementById('sharedY').checked;
    cache.sortBy = document.getElementById('sortBy').value || 'Name';
    cache.search = (searchBox.value || '').trim();
  }
  function persistCompare() {
    cache.compareMode = compareMode;
  }
  function persistPinned() {
    cache.pinned = [...pinned];
  }
  function persistPage() {
    cache.currentPage = window.currentPage || 1;
  }

  toggleCompareBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    toggleCompareBtn.classList.toggle('bg-green-600', compareMode);
    toggleCompareBtn.textContent = compareMode ? 'Exit Compare' : 'Compare Charts';
    pinnedWrap.classList.toggle('hidden', !compareMode || pinned.length === 0);
    persistCompare();
  });

  // Utils
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function getUI() {
    const from = clamp(parseInt(document.getElementById('fromYear').value, 10) || 1970, 1970, 2024);
    const to = clamp(parseInt(document.getElementById('toYear').value, 10) || 2024, 1970, 2024);
    const rows = Math.max(1, parseInt(document.getElementById('rows').value, 10) || 3);
    const cols = Math.max(1, parseInt(document.getElementById('columns').value, 10) || 4);
    const sharedY = document.getElementById('sharedY').checked;
    const sortBy = document.getElementById('sortBy').value || 'Name';
    const search = (searchBox.value || '').trim().toLowerCase();
    return { from, to, rows, cols, perPage: rows * cols, sharedY, sortBy, search };
  }

  const valueAt = (topic, year) =>
    topic.values.find(v => v.year === year)?.value ?? 0;

  function computeGrowth(topic, from, to) {
    const a = valueAt(topic, from);
    const b = valueAt(topic, to);
    if (a <= 0 && b <= 0) return 0;
    if (a <= 0) return Infinity;
    return (b - a) / a;
  }

  function sortTopics(data, { from, to, sortBy }) {
    if (sortBy === 'Name') return [...data].sort((a, b) => a.topicName.localeCompare(b.topicName));
    if (sortBy === 'Growth') return [...data].sort((a, b) => computeGrowth(b, from, to) - computeGrowth(a, from, to));
    return [...data].sort((a, b) => valueAt(b, to) - valueAt(a, to)); // fallback: latest size
  }

  const filterTopics = (data, { search }) =>
    !search ? data : data.filter(t => t.topicName.toLowerCase().includes(search));

  const seriesForRange = (topic, from, to) =>
    topic.values.filter(v => v.year >= from && v.year <= to).sort((a, b) => a.year - b.year);

  function computeGlobalMax(data, { from, to }) {
    let maxVal = 1;
    data.forEach(t => {
      const s = seriesForRange(t, from, to);
      const localMax = d3.max(s, d => d.value) || 1;
      if (localMax > maxVal) maxVal = localMax;
    });
    return maxVal;
  }

  // Responsive chart renderer
  function renderChart(wrapper, topic, series, ui, { interactive = true } = {}) {
    // Clean any previous observers/listeners tied to this wrapper
    if (typeof wrapper._cleanup === 'function') wrapper._cleanup();

    wrapper.classList.add('relative'); // tooltip positioning context

    // Static title (kept between resizes)
    let title = wrapper.querySelector('.sm-title');
    if (!title) {
      title = document.createElement('div');
      title.className = 'sm-title text-sm font-semibold mb-1 truncate px-1';
      wrapper.appendChild(title);
    }
    title.title = topic.topicName;
    title.textContent = topic.topicName;

    // Create tooltip node once
    let tooltip = wrapper.querySelector('.sm-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'sm-tooltip absolute text-xs bg-white border rounded px-1 py-0.5 shadow pointer-events-none';
      tooltip.style.display = 'none';
      wrapper.appendChild(tooltip);
    }

    const margin = { top: 16, right: 10, bottom: 28, left: 40 };

    const drawOne = () => {
      const old = wrapper.querySelector('svg');
      if (old) old.remove();

      // compute available width from wrapper (including padding)
      const cs = getComputedStyle(wrapper);
      const padL = parseFloat(cs.paddingLeft) || 0;
      const padR = parseFloat(cs.paddingRight) || 0;
      const avail = Math.max(160, wrapper.clientWidth - padL - padR);
      const width = Math.max(160, avail - margin.left - margin.right);
      const height = 140 - margin.top - margin.bottom;

      const svg = d3.select(wrapper)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // scales
      const x = d3.scaleLinear().domain([ui.from, ui.to]).range([0, width]);
      const yMax = ui.sharedY ? globalMaxCache : (d3.max(series, d => d.value) || 1);
      const y = d3.scaleLinear().domain([0, yMax]).nice().range([height, 0]);

      // axes
      svg.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(width / 60))).tickFormat(d3.format('d')))
        .attr('font-size', '8px');

      svg.append('g')
        .call(d3.axisLeft(y).ticks(3))
        .attr('font-size', '8px');

      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 22)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .text('Year');

      svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -34)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .text('Publication Count');

      // line
      const line = d3.line().x(d => x(d.year)).y(d => y(d.value));
      svg.append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', '#1f77b4')
        .attr('stroke-width', 1.5)
        .attr('d', line);

      // peak marker
      const maxPt = series.reduce((m, d) => (d.value > m.value ? d : m), { value: -Infinity, year: ui.from });
      svg.append('circle')
        .attr('cx', x(maxPt.year))
        .attr('cy', y(maxPt.value))
        .attr('r', 2.5)
        .attr('fill', '#1f77b4')
        .append('title')
        .text(`Peak ${maxPt.year}: ${fmtCount(maxPt.value)}`);

      // synced guide line
      const guide = svg.append('line')
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', '#999')
        .attr('opacity', 0);

      function onHover(e) {
        const yr = e.detail.year;
        if (yr == null) { guide.attr('opacity', 0); return; }
        const cx = x(clamp(yr, ui.from, ui.to));
        guide.attr('x1', cx).attr('x2', cx).attr('opacity', 0.5);
      }

      window.addEventListener(HOVER_EVT, onHover);
      wrapper._cleanupHover = () => window.removeEventListener(HOVER_EVT, onHover);

      // overlay for tooltip + broadcast
      svg.append('rect')
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .on('mouseenter', () => { hoverActiveCount++; })
        .on('mousemove', function (e) {
          const [mx] = d3.pointer(e, this);
          const yr = Math.round(x.invert(mx));
          const clampedY = clamp(yr, ui.from, ui.to);

          if (hoverYearShared !== clampedY) broadcastHover(clampedY);

          const nearest = series.reduce((a, b) =>
            Math.abs(b.year - clampedY) < Math.abs(a.year - clampedY) ? b : a, series[0]);

          // position tooltip at the cursor (relative to the card)
          const rect = wrapper.getBoundingClientRect();
          let tx = e.clientX - rect.left + 8;
          let ty = e.clientY - rect.top  + 8;

          tooltip.style.display = 'block';
          tooltip.innerHTML = `${nearest.year}: <b>${fmtCount(nearest.value)}</b>`;
          const maxX = wrapper.clientWidth  - tooltip.offsetWidth  - 6;
          const maxY = wrapper.clientHeight - tooltip.offsetHeight - 6;
          tx = Math.max(6, Math.min(tx, maxX));
          ty = Math.max(6, Math.min(ty, maxY));
          tooltip.style.left = `${tx}px`;
          tooltip.style.top  = `${ty}px`;
        })
        .on('mouseleave', () => {
          hoverActiveCount = Math.max(0, hoverActiveCount - 1);
          tooltip.style.display = 'none';
          if (hoverActiveCount === 0 && hoverYearShared !== null) broadcastHover(null);
        });
    };

    // initial draw
    drawOne();

    // observe wrapper size and redraw on width changes
    const ro = new ResizeObserver(() => drawOne());
    ro.observe(wrapper);

    // interactivity on wrapper (pin/drill)
    wrapper.setAttribute('role', 'button');
    wrapper.setAttribute('tabindex', '0');
    wrapper.setAttribute('aria-label', `Open details for ${topic.topicName}`);

    const clickHandler = () => {
      if (!interactive) return;
      if (compareMode) {
        if (!pinned.includes(topic.topicName)) addPinnedChart(topic, ui);
      } else {
        if (typeof onSelect === 'function') onSelect(topic.topicName);
      }
    };

    const keyHandler = (e) => {
      if (!interactive) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clickHandler();
      }
    };

    wrapper.addEventListener('click', clickHandler);
    wrapper.addEventListener('keydown', keyHandler);

    // cleanup hooks
    wrapper._cleanup = () => {
      ro.disconnect();
      if (typeof wrapper._cleanupHover === 'function') wrapper._cleanupHover();
      wrapper.removeEventListener('click', clickHandler);
      wrapper.removeEventListener('keydown', keyHandler);
    };
  }

  //  Pinned charts (also responsive)
  function clearPinnedListeners() {
    pinnedDiv.querySelectorAll('.sm-card').forEach(el => {
      if (typeof el._cleanup === 'function') el._cleanup();
    });
  }

  function rerenderPinnedCharts(ui) {
    clearPinnedListeners();
    pinnedDiv.innerHTML = '';

    if (!pinned.length) {
      pinnedWrap.classList.add('hidden');
      return;
    }

    const subset = topicData.filter(t => pinned.includes(t.topicName));
    const ordered = sortTopics(subset, ui);

    ordered.forEach(topic => {
      const series = seriesForRange(topic, ui.from, ui.to);
      const card = document.createElement('div');
      card.className = 'sm-card relative border rounded shadow p-2 bg-yellow-50 cursor-pointer';

      const btn = document.createElement('button');
      btn.className = 'absolute top-1 right-1 text-xs px-2 py-0.5 bg-gray-200 rounded hover:bg-gray-300';
      btn.textContent = '✕';
      btn.title = 'Remove';
      btn.onclick = (e) => {
        e.stopPropagation();
        pinned = pinned.filter(n => n !== topic.topicName);
        persistPinned();
        rerenderPinnedCharts(ui);
        pinnedWrap.classList.toggle('hidden', pinned.length === 0 || !compareMode);
      };
      card.appendChild(btn);

      // append first so width is measurable, then render
      pinnedDiv.appendChild(card);
      renderChart(card, topic, series, ui, { interactive: false });

      // clicking the pinned card removes it
      card.addEventListener('click', () => {
        pinned = pinned.filter(n => n !== topic.topicName);
        persistPinned();
        rerenderPinnedCharts(ui);
        pinnedWrap.classList.toggle('hidden', pinned.length === 0 || !compareMode);
      });
    });

    pinnedWrap.classList.toggle('hidden', !compareMode || pinned.length === 0);
  }

  function addPinnedChart(topic, ui) {
    if (!pinned.includes(topic.topicName)) {
      pinned.push(topic.topicName);
      persistPinned();
      rerenderPinnedCharts(ui);
    }
  }

  // Grid rendering
  function clearGrid() {
    chartGrid.querySelectorAll('.sm-card').forEach(el => {
      if (typeof el._cleanup === 'function') el._cleanup();
    });
    chartGrid.innerHTML = '';
  }

  function renderPage(data, ui) {
    const totalPages = Math.max(1, Math.ceil(data.length / ui.perPage));
    window.currentPage = clamp(window.currentPage || 1, 1, totalPages);
    persistPage();

    const startIdx = (window.currentPage - 1) * ui.perPage;
    const pageData = data.slice(startIdx, startIdx + ui.perPage);

    chartGrid.style.gridTemplateColumns = `repeat(${ui.cols}, minmax(0, 1fr))`;
    document.getElementById('pageIndicator').textContent = `Page ${window.currentPage} of ${totalPages}`;

    clearGrid();

    if (pageData.length === 0) {
      chartGrid.innerHTML = `<div class="text-sm text-gray-600">No topics match the current filters.</div>`;
      return;
    }

    pageData.forEach(topic => {
      const series = seriesForRange(topic, ui.from, ui.to);
      if (!series.length) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'sm-card border rounded shadow p-2 hover:bg-gray-50 cursor-pointer flex flex-col relative';

      // Append before rendering so width is measurable
      chartGrid.appendChild(wrapper);
      renderChart(wrapper, topic, series, ui);
    });

    document.getElementById('prevPage').onclick = () => {
      if (window.currentPage > 1) { window.currentPage--; persistPage(); renderPage(data, ui); }
    };
    document.getElementById('nextPage').onclick = () => {
      if (window.currentPage < totalPages) { window.currentPage++; persistPage(); renderPage(data, ui); }
    };
  }

  function refreshAll(topicDataRaw) {
    const ui = getUI();
    const filtered = filterTopics(topicDataRaw, ui);
    const sorted = sortTopics(filtered, ui);

    globalMaxCache = ui.sharedY ? computeGlobalMax(sorted, ui) : 1;

    renderPage(sorted, ui);
    rerenderPinnedCharts(ui);
  }

  // Wiring
  document.getElementById('applyFilter').onclick = () => {
    window.currentPage = 1;
    persistUI();
    persistPage();
    refreshAll(topicData);
  };
  sortBySel.addEventListener('change', () => {
    persistUI();
    window.currentPage = 1; persistPage();
    refreshAll(topicData);
  });
  sharedYChk.addEventListener('change', () => {
    persistUI();
    refreshAll(topicData);
  });
  let searchTimer = null;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      persistUI();
      window.currentPage = 1; persistPage();
      refreshAll(topicData);
    }, 200);
  });

  // Fetch
  chartGrid.innerHTML = '<div class="text-sm text-gray-600">Loading…</div>';
  apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=count`)
    .then(res => {
      topicData = res.data || [];
      if (!topicData.length) {
        chartGrid.innerHTML = '<p class="text-gray-600">No data available.</p>';
        return;
      }
      topicData.forEach(t => t.values.forEach(v => { v.year = +v.year; v.value = +v.value; }));

      // Validate pinned list against available topics
      const available = new Set(topicData.map(t => t.topicName));
      pinned = pinned.filter(name => available.has(name));
      persistPinned();

      // Ensure initial UI refresh uses the cached state
      refreshAll(topicData);
    })
    .catch(err => {
      chartGrid.innerHTML = '<p class="text-red-500">Failed to load data.</p>';
      console.error(err);
    });
}
