/**
 * level2_2.js
 *
 * Heatmap of topic growth by year with:
 * - Sort (Name / Growth)
 * - Search filter
 * - Pagination polish
 * - Compare/Pin with click-to-unpin (single combined pinned heatmap)
 * - Synced hover tooltips + vertical year guide
 * - Separate tooltips for main & pinned areas (both follow cursor)
 *
 * Used by: main.js
 * Dependencies: apiFetch.js, infoModal.js, D3 (global)
 */

import { apiFetch } from '../util/apiFetch.js';
import { injectInfoAndModal } from '../util/infoModal.js';

// Per-session cache to preserve UI state across navigations (scoped by subField)
const L22_DEFAULTS = {
  from: 2005,
  to: 2024,
  rows: 10,
  sortBy: 'Name',     // (hidden control in UI, but we still persist it)
  search: '',
  compareMode: false,
  pinned: [],         // topic names
  pageIndex: 0
};
const L22_CACHE_ROOT_KEY = '__L22_CACHE__';
function getSubfieldCache(subField) {
  if (!window[L22_CACHE_ROOT_KEY]) window[L22_CACHE_ROOT_KEY] = {};
  const root = window[L22_CACHE_ROOT_KEY];
  if (!root[subField]) root[subField] = { ...L22_DEFAULTS };
  return root[subField];
}
const escAttr = (s) => String(s ?? '').replace(/"/g, '&quot;');

export function renderLevel2_2({ subField, onSelect }) {
  const cache = getSubfieldCache(subField);
  const container = document.getElementById('plot');

  const wrapper = document.createElement('div');
  wrapper.id = 'level2-2-wrapper';

  wrapper.innerHTML = `
    <div><h3 class="text-lg font-semibold mb-2">Subfield Name: ${subField}</h3></div>

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

      <label>
        <select id="sortBy" class="border px-2 py-1 hidden">
          <option value="Name" ${cache.sortBy === 'Name' ? 'selected' : ''}>Name</option>
          <option value="Growth" ${cache.sortBy === 'Growth' ? 'selected' : ''}>Growth</option>
        </select>
      </label>

      <label>Search:
        <input type="text" id="searchBox" value="${escAttr(cache.search)}" placeholder="Filter topics..." class="border px-2 py-1 w-48" />
      </label>

      <button id="applyFilter" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>

      <button title="Turn on and click rows to pin; click pinned rows to unpin"
              id="toggleCompare" class="bg-blue-600 text-white px-4 py-2 rounded ${cache.compareMode ? 'bg-green-600' : ''}">
        ${cache.compareMode ? 'Exit Compare' : 'Compare Charts'}
      </button>

      <button id="prevPage" class="bg-gray-300 px-2 py-1 rounded disabled:opacity-50">Prev</button>
      <span id="pageIndicator" class="text-sm font-semibold">Page 1 of 1</span>
      <button id="nextPage" class="bg-gray-300 px-2 py-1 rounded disabled:opacity-50">Next</button>
    </div>

    <div class="mb-4 font-sans text-sm" id="color-legend">
      <div class="mb-1 font-medium">Color Scale: Growth Value</div>
      <div class="flex gap-3 items-center flex-wrap">
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#b53027"></div><span>&le; 0</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#a8ddb5"></div><span>0–10</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#7bccc4"></div><span>10–20</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#4eb3d3"></div><span>20–30</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#2b8cbe"></div><span>30–40</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#08589e"></div><span>40–60</span></div>
        <div class="flex items-center gap-1"><div class="w-5 h-5" style="background:#084081"></div><span>&gt; 60</span></div>
      </div>
    </div>

    <div id="pinnedAreaWrap" class="mb-4 ${cache.compareMode && (cache.pinned?.length || 0) > 0 ? '' : 'hidden'} border-t pt-4">
      <div class="font-semibold mb-2">Pinned charts</div>
      <!-- Single combined pinned heatmap -->
      <div id="pinnedCharts"></div>
    </div>

    <div id="chartContainer" class="relative"></div>
  `;

  container.innerHTML = '';
  container.appendChild(wrapper);

  injectInfoAndModal({
    container: wrapper,
    infoHTML: `
      <p class="mb-2 text-3xl"> Topic Growth Heatmap by Year in Selected Subfield</p>
       <p class="mb-2"><strong>What’s the purpose:</strong> Show the growth in publication count of topics over time and compare topics.</p>
       <p class="mb-2"><strong>What’s being shown: </strong> Growth rate of topics in the selected subfield.</p>
       <p class="mb-2"><strong>How is it shown: </strong> Each row represents a topic and the cell color shows growth rate over time. Interactive options are used for comparison.</p>

    `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>

      <p class="text-sm text-gray-700 mb-4">
        <strong>Aim:</strong> Help identify trending topics inside a selected Computer Science subfield by showing, at a glance, when and where topic growth intensifies or declines across years, so promising topics can be sent to deeper analysis.
      </p>
      <h3 class="text-base font-semibold mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Grid Structure:</strong> Each <em>row</em> represents a research topic in the selected subfield; each <em>column</em> represents a year in the selected range.</li>
        <li><strong>Cell Color:</strong> Encodes <em>growth value</em> of publications per year for each topic using a diverging color scale:
          <ul class="list-disc pl-5">
            <li><span style="background:#b53027;padding:2px 5px;border:1px solid #ccc;"></span>  ≤ 0 (Negative/Declining growth)</li>
            <li><span style="background:#a8ddb5;padding:2px 5px;border:1px solid #ccc;"></span>  0–10</li>
            <li><span style="background:#7bccc4;padding:2px 5px;border:1px solid #ccc;"></span>  10–20</li>
            <li><span style="background:#4eb3d3;padding:2px 5px;border:1px solid #ccc;"></span>  20–30</li>
            <li><span style="background:#2b8cbe;padding:2px 5px;border:1px solid #ccc;"></span>  30–40</li>
            <li><span style="background:#08589e;padding:2px 5px;border:1px solid #ccc;"></span>  40–60</li>
            <li><span style="background:#084081;padding:2px 5px;border:1px solid #ccc;"></span>  > 60 (High growth)</li>
          </ul>
        </li>
        <li><strong>Axes Labels:</strong> 
          <ul>
            <li><em>Left side (Y-axis):</em> Topic names (wrapped if long, with tooltip on hover).</li>
            <li><em>Top (X-axis):</em> Years (from user-selected range).</li>
          </ul>
        </li>
        <li><strong>Tooltip:</strong> On hover, shows topic name, year, and growth value (formatted).</li>
        <li><strong>Synced Hover Guide:</strong> When hovering over a cell, a vertical guide appears across rows to align the same year for comparison.</li>
        <li><strong>Pinned Area (if Compare Mode):</strong> Visual encodings repeated in a combined pinned heatmap (persistent layout and interaction).</li>
      </ul>

      <h3 class="text-base font-semibold mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Year Range Filter:</strong> Users can filter the view by selecting custom <em>From</em> and <em>To</em> years (default: 2005–2024).</li>
        <li><strong>Topic Row Control:</strong> Choose number of topic rows shown per page (pagination enabled).</li>
        <li><strong>Pagination:</strong> Navigate pages using <em>Prev</em> and <em>Next</em> buttons. Page indicator shows current page.</li>
        <li><strong>Search:</strong> Real-time case-insensitive filtering of topic names via search box.</li>
        <li><strong>Sort (Hidden):</strong> Topics are sorted alphabetically by name.</li>
        <li><strong>Compare Mode:</strong>
          <ul class="list-disc pl-5">
            <li>Activate with "Compare Charts" button (turns green when active).</li>
            <li>Clicking a topic row pins it to a combined comparison heatmap.</li>
            <li>Click again on pinned chart to remove it.</li>
          </ul>
        </li>
        <li><strong>Drill-Down Navigation:</strong> Clicking on a topic (when not in compare mode) leads to a more detailed view (Level 3).</li>
        <li><strong>Tooltip Sync:</strong> Mouse movement over any cell updates the synced hover guide line and shared tooltip.</li>
        <li><strong>Responsive Tooltip Placement:</strong> Tooltips are adjusted to stay within container bounds for both main and pinned sections.</li>
      </ul>
    `
  });

  // Shared layout (consistent main & pinned)
  const CELL_W = 60;
  const CELL_H = 50;
  const LEFT_GUTTER = 200;
  const TOP_PAD = 70;
  const BOTTOM_PAD = 30;

  // Elements
  const fromInput = document.getElementById('fromYear');
  const toInput = document.getElementById('toYear');
  const rowInput = document.getElementById('rows');
  const sortBySel = document.getElementById('sortBy');
  const searchBox = document.getElementById('searchBox');

  const chartContainer = document.getElementById('chartContainer');
  chartContainer.style.position = 'relative'; // <-- ensure absolute tooltip positions correctly
  const pageIndicator = document.getElementById('pageIndicator');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');

  const pinnedWrap = document.getElementById('pinnedAreaWrap');
  const pinnedDiv = document.getElementById('pinnedCharts');
  pinnedWrap.style.position = 'relative'; // for pinned tooltip positioning
  const toggleCompareBtn = document.getElementById('toggleCompare');

  // State (restored from cache)
  let topicData = [];
  let filteredData = [];
  let pageIndex = Number.isFinite(cache.pageIndex) ? cache.pageIndex : 0;
  let compareMode = !!cache.compareMode;
  let pinned = Array.isArray(cache.pinned) ? [...cache.pinned] : [];

  // Hover bus (sync across main + pinned) — kept as in original
  let hoverYearShared = null;
  const HOVER_EVT = 'l22-hover-year';
  const fmt = d3.format('.2f');

  function broadcastHover(year) {
    hoverYearShared = year;
    window.dispatchEvent(new CustomEvent(HOVER_EVT, { detail: { year } }));
  }

  // Colors
  function getColor(value) {
    if (value <= 0) return '#b53027';
    if (value <= 10) return '#a8ddb5';
    if (value <= 20) return '#7bccc4';
    if (value <= 30) return '#4eb3d3';
    if (value <= 40) return '#2b8cbe';
    if (value <= 60) return '#08589e';
    if (value > 60) return '#084081';
    return '#ffffff';
  }

  function wrapText(text, maxCharsPerLine) {
    const words = (text || '').split(' ');
    let lines = [], current = '';
    words.forEach(word => {
      const test = (current + ' ' + word).trim();
      if (test.length > maxCharsPerLine) {
        if (current) lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  // Cache persist helpers
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function persistUI() {
    // sanitize + store
    let from = clamp(parseInt(fromInput.value) || L22_DEFAULTS.from, 1970, 2024);
    let to   = clamp(parseInt(toInput.value)   || L22_DEFAULTS.to,   1970, 2024);
    if (from > to) [from, to] = [to, from];
    fromInput.value = from; toInput.value = to;

    cache.from = from;
    cache.to = to;
    cache.rows = Math.max(1, parseInt(rowInput.value) || L22_DEFAULTS.rows);
    cache.sortBy = sortBySel.value || 'Name';
    cache.search = (searchBox.value || '').trim();
  }
  function persistCompare() { cache.compareMode = compareMode; }
  function persistPinned() { cache.pinned = [...pinned]; }
  function persistPage() { cache.pageIndex = pageIndex; }

  // UI helpers
  function getUI() {
    let from = clamp(parseInt(fromInput.value) || L22_DEFAULTS.from, 1970, 2024);
    let to   = clamp(parseInt(toInput.value)   || L22_DEFAULTS.to,   1970, 2024);
    if (from > to) [from, to] = [to, from];
    fromInput.value = from;
    toInput.value = to;

    const rows = Math.max(1, parseInt(rowInput.value) || L22_DEFAULTS.rows);
    const sortBy = sortBySel.value || 'Name';
    const search = (searchBox.value || '').trim().toLowerCase();

    return { from, to, rows, sortBy, search, years: Array.from({ length: to - from + 1 }, (_, i) => from + i) };
  }

  function computeGrowthScore(topic, from, to) {
    const vals = topic.values
      .filter(v => v.year >= from && v.year <= to && v.value != null)
      .map(v => +v.value);
    if (!vals.length) return -Infinity;
    return d3.mean(vals);
  }

  function sortTopics(data, ui) {
    if (ui.sortBy === 'Name') return [...data].sort((a, b) => a.topicName.localeCompare(b.topicName));
    if (ui.sortBy === 'Growth') {
      return [...data].sort((a, b) =>
        computeGrowthScore(b, ui.from, ui.to) - computeGrowthScore(a, ui.from, ui.to)
      );
    }
    return data;
  }

  function filterTopics(data, ui) {
    if (!ui.search) return data;
    return data.filter(t => (t.topicName || '').toLowerCase().includes(ui.search));
  }

  function setPaginationState(totalPages) {
    pageIndicator.textContent = `Page ${Math.min(pageIndex + 1, totalPages)} of ${Math.max(totalPages, 1)}`;
    prevBtn.disabled = pageIndex <= 0;
    nextBtn.disabled = pageIndex >= totalPages - 1;
    prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
    nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
  }

  // Tooltips (main & pinned; both follow cursor)
  let mainTooltip = null;
  function ensureMainTooltip() {
    mainTooltip = chartContainer.querySelector('.l22-main-tooltip');
    if (!mainTooltip) {
      mainTooltip = document.createElement('div');
      mainTooltip.className = 'l22-main-tooltip absolute text-xs bg-white border rounded px-1 py-0.5 shadow pointer-events-none hidden';
      mainTooltip.style.zIndex = 50;
      chartContainer.appendChild(mainTooltip);
    }
  }

  function showMainTooltip(evt, html) {
    ensureMainTooltip();
    const pad = 10;
    const rect = chartContainer.getBoundingClientRect();
    let x = evt.clientX - rect.left + chartContainer.scrollLeft + pad;
    let y = evt.clientY - rect.top  + chartContainer.scrollTop  + pad;

    mainTooltip.innerHTML = html;
    mainTooltip.classList.remove('hidden');

    const maxX = chartContainer.scrollLeft + chartContainer.clientWidth  - mainTooltip.offsetWidth  - 6;
    const maxY = chartContainer.scrollTop  + chartContainer.clientHeight - mainTooltip.offsetHeight - 6;
    x = Math.max(chartContainer.scrollLeft + 6, Math.min(x, maxX));
    y = Math.max(chartContainer.scrollTop  + 6, Math.min(y, maxY));

    mainTooltip.style.left = `${x}px`;
    mainTooltip.style.top  = `${y}px`;
  }
  function hideMainTooltip() {
    if (mainTooltip) mainTooltip.classList.add('hidden');
  }

  // Pinned tooltip inside pinned wrap (so it stays within that region)
  const pinnedTooltip = document.createElement('div');
  pinnedTooltip.className = 'absolute text-xs bg-white border rounded px-1 py-0.5 shadow pointer-events-none hidden';
  pinnedTooltip.style.zIndex = 60;
  pinnedWrap.appendChild(pinnedTooltip);

  function showPinnedTooltip(evt, html) {
    const pad = 10;
    const rect = pinnedWrap.getBoundingClientRect();
    let x = evt.clientX - rect.left + pinnedWrap.scrollLeft + pad;
    let y = evt.clientY - rect.top  + pinnedWrap.scrollTop  + pad;

    pinnedTooltip.innerHTML = html;
    pinnedTooltip.classList.remove('hidden');

    const maxX = pinnedWrap.scrollLeft + pinnedWrap.clientWidth  - pinnedTooltip.offsetWidth  - 6;
    const maxY = pinnedWrap.scrollTop  + pinnedWrap.clientHeight - pinnedTooltip.offsetHeight - 6;
    x = Math.max(pinnedWrap.scrollLeft + 6, Math.min(x, maxX));
    y = Math.max(pinnedWrap.scrollTop  + 6, Math.min(y, maxY));

    pinnedTooltip.style.left = `${x}px`;
    pinnedTooltip.style.top  = `${y}px`;
  }
  function hidePinnedTooltip() {
    pinnedTooltip.classList.add('hidden');
  }

  // Track and clean hover listeners to avoid stacking (kept for parity)
  let mainHoverHandler = null;
  let pinnedHoverHandler = null;

  //  MAIN PAGE RENDER
  function drawPage(ui, pageItems) {
    const svgWidth  = ui.years.length * CELL_W + LEFT_GUTTER;
    const svgHeight = pageItems.length   * CELL_H + TOP_PAD + BOTTOM_PAD;

    // Clear chart area & reattach tooltip holder
    chartContainer.innerHTML = '';
    ensureMainTooltip();

    const svg = d3.select(chartContainer)
      .append('svg')
      .attr('width', svgWidth)
      .attr('height', svgHeight);

    // Year labels
    svg.selectAll('.x-label')
      .data(ui.years)
      .enter()
      .append('text')
      .attr('x', (d, i) => LEFT_GUTTER + i * CELL_W + CELL_W / 2)
      .attr('y', TOP_PAD - 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => d);

    // Topic labels (left)
    const topicGroup = svg.selectAll('.y-label')
      .data(pageItems)
      .enter()
      .append('g')
      .attr('transform', (d, i) => `translate(${LEFT_GUTTER - 10}, ${TOP_PAD + i * CELL_H + CELL_H / 2})`)
      .style('cursor', 'pointer')
      .on('click', (_, d) => {
        if (compareMode) {
          if (!pinned.includes(d.topicName)) { pinned.push(d.topicName); persistPinned(); renderPinned(ui); }
        } else if (typeof onSelect === 'function') {
          onSelect(d.topicName);
        }
      });

    topicGroup.each(function (d) {
      const lines = wrapText(d.topicName, 20);
      const text = d3.select(this).append('text')
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('font-size', '10px');
      lines.forEach((line, i) => {
        text.append('tspan').text(line).attr('x', 0).attr('dy', i === 0 ? '0' : '1em');
      });
      text.append('title').text(d.topicName);
    });

    // Cells (color only) + click to drill/pin + hover tooltips
    pageItems.forEach((topic, row) => {
      ui.years.forEach((year, col) => {
        const value = topic.values.find(v => v.year === year)?.value ?? null;
        const x = LEFT_GUTTER + col * CELL_W;
        const y = TOP_PAD + row * CELL_H;

        svg.append('rect')
          .attr('x', x).attr('y', y)
          .attr('width', CELL_W - 1).attr('height', CELL_H - 1)
          .attr('fill', value == null ? '#f5f5f5' : getColor(value));

        svg.append('rect')
          .attr('x', x).attr('y', y)
          .attr('width', CELL_W - 1).attr('height', CELL_H - 1)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', () => {
            if (compareMode) {
              if (!pinned.includes(topic.topicName)) { pinned.push(topic.topicName); persistPinned(); renderPinned(ui); }
            } else if (typeof onSelect === 'function') {
              onSelect(topic.topicName);
            }
          })
          .on('mousemove', (evt) => {
            const html = `<b>${topic.topicName}</b><br/>Year: ${year}<br/>Growth: ${value == null ? '—' : fmt(value)}`;
            showMainTooltip(evt, html);
          })
          .on('mouseleave', () => hideMainTooltip());
      });
    });
  }

  // PINNED COMBINED HEATMAP
  function renderPinned(ui) {
    pinnedDiv.innerHTML = '';
    pinnedWrap.classList.toggle('hidden', !compareMode || !pinned.length);
    if (!pinned.length) return;

    const allSorted = sortTopics([...topicData], ui);
    const topics = allSorted.filter(t => pinned.includes(t.topicName));

    const width  = ui.years.length * CELL_W + LEFT_GUTTER;
    const height = topics.length   * CELL_H + TOP_PAD + BOTTOM_PAD;

    const svg = d3.select(pinnedDiv)
      .append('svg')
      .attr('width',  width)
      .attr('height', height);

    // Year axis
    svg.selectAll('.x-label')
      .data(ui.years)
      .enter()
      .append('text')
      .attr('x', (d, i) => LEFT_GUTTER + i * CELL_W + CELL_W / 2)
      .attr('y', TOP_PAD - 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .text(d => d);

    topics.forEach((topic, r) => {
      const y0 = TOP_PAD + r * CELL_H;

      const unpin = () => {
        pinned = pinned.filter(n => n !== topic.topicName);
        persistPinned();
        renderPinned(ui);
      };

      // row-wide click target to unpin
      svg.append('rect')
        .attr('x', 0).attr('y', y0)
        .attr('width', width).attr('height', CELL_H)
        .attr('fill', 'transparent')
        .on('click', unpin);

      // label
      const g = svg.append('g')
        .attr('transform', `translate(${LEFT_GUTTER - 10}, ${y0 + CELL_H / 2})`)
        .style('cursor', 'pointer')
        .on('click', unpin);

      const lines = wrapText(topic.topicName, 20);
      const text = g.append('text')
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('font-size', '10px');
      lines.forEach((line, i) => {
        text.append('tspan').text(line).attr('x', 0).attr('dy', i === 0 ? '0' : '1em');
      });
      text.append('title').text(topic.topicName);

      // cells (color only) + click to unpin + pinned tooltip
      ui.years.forEach((year, c) => {
        const val = topic.values.find(v => v.year === year)?.value ?? null;
        const x0  = LEFT_GUTTER + c * CELL_W;

        svg.append('rect')
          .attr('x', x0).attr('y', y0)
          .attr('width', CELL_W - 1).attr('height', CELL_H - 1)
          .attr('fill', val == null ? '#f5f5f5' : getColor(val));

        svg.append('rect')
          .attr('x', x0).attr('y', y0)
          .attr('width', CELL_W - 1).attr('height', CELL_H - 1)
          .attr('fill', 'transparent')
          .style('cursor', 'pointer')
          .on('click', unpin)
          .on('mousemove', (evt) => {
            const html = `<b>${topic.topicName}</b><br/>Year: ${year}<br/>Growth: ${val == null ? '—' : fmt(val)}`;
            showPinnedTooltip(evt, html);
          })
          .on('mouseleave', () => hidePinnedTooltip());
      });
    });
  }

  // REFRESH (filter + sort + paginate)
  function refreshAll() {
    const ui = getUI();

    filteredData = sortTopics(filterTopics(topicData, ui), ui);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / ui.rows));
    pageIndex = Math.min(pageIndex, totalPages - 1);
    persistPage();

    const start = pageIndex * ui.rows;
    const pageItems = filteredData.slice(start, start + ui.rows);

    setPaginationState(totalPages);
    drawPage(ui, pageItems);
    renderPinned(ui); // keep pinned synchronized with year range & sort
  }

  // Wiring
  document.getElementById('applyFilter').addEventListener('click', () => {
    pageIndex = 0;
    persistUI();
    persistPage();
    refreshAll();
  });

  prevBtn.addEventListener('click', () => {
    if (pageIndex > 0) {
      pageIndex--;
      persistPage();
      refreshAll();
    }
  });
  nextBtn.addEventListener('click', () => {
    const ui = getUI();
    const totalPages = Math.max(1, Math.ceil(filteredData.length / ui.rows));
    if (pageIndex < totalPages - 1) {
      pageIndex++;
      persistPage();
      refreshAll();
    }
  });

  // Debounced search
  let searchTimer = null;
  searchBox.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      pageIndex = 0;
      persistUI();
      persistPage();
      refreshAll();
    }, 200);
  });

  // Sort change (hidden, but persisted)
  sortBySel.addEventListener('change', () => {
    pageIndex = 0;
    persistUI();
    persistPage();
    refreshAll();
  });

  // Compare toggle
  toggleCompareBtn.addEventListener('click', () => {
    compareMode = !compareMode;
    toggleCompareBtn.classList.toggle('bg-green-600', compareMode);
    toggleCompareBtn.textContent = compareMode ? 'Exit Compare' : 'Compare Charts';
    pinnedWrap.classList.toggle('hidden', !compareMode || !pinned.length);
    persistCompare();
    if (compareMode) renderPinned(getUI());
  });

  // Fetch + init
  chartContainer.innerHTML = '<div class="text-sm text-gray-600">Loading…</div>';
  apiFetch(`/sub-field-detail?name=${encodeURIComponent(subField)}&type=growth`)
    .then(res => {
      topicData = (res.data || []).map(t => ({
        ...t,
        values: (t.values || []).map(v => ({ year: +v.year, value: v.value == null ? null : +v.value }))
      }));
      if (!topicData.length) {
        chartContainer.innerHTML = '<p>No data available.</p>';
        return;
      }

      // Validate pinned list against available topics
      const available = new Set(topicData.map(t => t.topicName));
      pinned = pinned.filter(name => available.has(name));
      persistPinned();

      refreshAll();
    })
    .catch(err => {
      chartContainer.innerHTML = '<p class="text-red-500">Failed to load data.</p>';
      console.error(err);
    });
}
