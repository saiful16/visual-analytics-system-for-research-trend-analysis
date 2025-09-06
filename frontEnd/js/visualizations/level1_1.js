/**
 * level1_1.js
 *
 * Plotly multi-line chart of subfield publications (1970–2024) with:
 * - Legend click-to-select (calls onSelect just like line click)
 * - Clear selection button
 * - Smoothing toggle (raw vs. smoothed)
 * - Highlight/dim sync
 *
 * Used by: main.js
 * Dependencies: Plotly (window.PlotlyGlobal), colors.js, loadCss.js, infoModal.js
 */

import { subfieldColors } from '../util/colors.js';
import { loadCss } from '../util/loadCss.js';
import { injectInfoAndModal } from '../util/infoModal.js';

loadCss('css/level1_1.css');

// ---------------------------------------------------------------------------
// Simple in-memory cache to persist UI state across re-renders in one session.
// Lives on window so it survives DOM swaps but resets on full page reload.
const L11_DEFAULTS = {
  showingSmoothed: true,
  // Use an array for portability; we'll wrap/unwrap into a Set as needed.
  selectedSubfields: [], // e.g., ["Machine Learning", "Databases"]
};
const L11_CACHE = (() => {
  const key = '__L11_CACHE__';
  if (!window[key]) window[key] = { ...L11_DEFAULTS };
  return window[key];
})();

export function renderLevel1_1({ onSelect } = {}) {
  const DEFAULT_COLOR = '#9ca3af';
  const SMOOTH_WINDOW = 9;
  const SMOOTH_SIGMA = 2;
  const EPS = 0.1;

  const getColor = (name) => subfieldColors[name] || DEFAULT_COLOR;
  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

  const hoverTemplate =
  '<b>%{customdata[0]}</b><br>' +
  'Year: %{x}<br>' +
  'Publications: %{customdata[1]:,}<extra></extra>';


  // Clean up any leftover encoding UI
  document.getElementById('encoding-modal')?.remove();
  document.querySelector('#encoding-info-btn')?.remove();
  document.querySelector('.text-base.font-medium.mb-4')?.remove();

  const Plotly = window.PlotlyGlobal;
  const container = document.getElementById('plot');
  if (!container || !Plotly) return;

  try { Plotly.purge(container); } catch {}
  container.innerHTML = '';
  container.style.minHeight = '800px';

  // Info / modal
  injectInfoAndModal({
    container,
    infoHTML: `
      <p class="mb-2 text-3xl">Multi-Line Chart of Computer Science Subfield Publication Volumes Over Time</p>
      <p class="mb-2"><strong>What’s the purpose:</strong> Show how the number of research publication has changed over the years in different computer science subfields. </p>
      <p class="mb-2"><strong>What’s being shown: </strong> The number of publications per subfield each year from 1970 to 2024..</p>
      <p class="mb-2"><strong>How is it shown: </strong> A line chart where each colored line represents one subfield’s publication trend over time.</p>
    `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>

      <p class="text-sm text-gray-700 mb-4">
        <strong>Aim:</strong> Reveal long-term publication trends for all Computer Science subfields (1970–2024) to spot dominant, emerging, and declining areas before drilling down.
      </p>

      <h3 class="text-base font-semibold mb-2">Visual Encodings:</h3>
        <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
          <li><strong>Position (X):</strong> Encodes <em>Year</em> (1970–2024).</li>
          <li><strong>Position (Y):</strong> Encodes <em>Publication Count</em> on a logarithmic scale.</li>
          <li><strong>Line Color:</strong> Distinguishes each <em>Subfield</em> using a unique color.</li>
          <li><strong>Line Shape:</strong> Encodes <em>publication trends</em> over time.</li>
          <li><strong>Line Width:</strong> Highlights selected subfields by increasing thickness.</li>
          <li><strong>Opacity:</strong> Dims unselected lines to emphasize active selections.</li>
          <li><strong>Tooltip:</strong> On hover, shows <em>Subfield</em>, <em>Year</em>, and <em>Publication Count</em>.</li>
          <li><strong>Legend Color Blocks:</strong> Match the subfield’s line color in the chart.</li>
          <li><strong>Legend Interaction:</strong> Supports <em>click-to-highlight</em> and drill-down actions.</li>
          <li><strong>Smoothing Toggle:</strong> Switches between <em>raw</em> and <em>smoothed</em> data (Gaussian average).</li>
          <li><strong>Y-Axis Log Scale:</strong> Handles wide value ranges effectively.</li>
          <li><strong>Selection State:</strong> Indicated through <em>opacity</em> and <em>line width</em>.</li>
          <li><strong>Layering Order:</strong> Affects visibility when lines overlap—highlighted ones stay on top.</li>
        </ul>


      <h3 class="text-base font-semibold mb-2">Functionalities:</h3>
        <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
          <li><strong>Drill-down via Click:</strong> Clicking on a line or legend item allows users to select a subfield and proceed to a more detailed view in the next level.</li>
          <li><strong>Legend Interaction:</strong> Clicking on legend items toggles highlight and selection for subfields, mimicking the same behavior as clicking on a line.</li>
          <li><strong>Multi-Select Highlighting:</strong> Users can select multiple subfields; non-selected ones are dimmed for comparison.</li>
          <li><strong>Clear Selection:</strong> A clear button resets all selections and restores full opacity for all lines.</li>
          <li><strong>Smoothing Toggle:</strong> A button allows users to switch between raw data and smoothed trends using Gaussian moving average.</li>
          <li><strong>Tooltip on Hover:</strong> Displays dynamic information including subfield name, year, and publication count when hovering over a line.</li>
          <li><strong>Responsive Design:</strong> The chart automatically resizes based on screen size or container dimensions.</li>
          <li><strong>Zoom & Pan:</strong> Scroll to zoom and drag to pan along the timeline for closer inspection of time ranges.</li>
          <li><strong>Legend Color Indicator:</strong> Provides quick visual reference to match lines with their corresponding subfields.</li>
        </ul>

    `
  });

  // Gaussian smoothing
  function gaussianKernel(size, sigma = 1.0) {
    const k = []; const c = Math.floor(size / 2); let s = 0;
    for (let i = 0; i < size; i++) {
      const x = i - c; const v = Math.exp(-(x * x) / (2 * sigma * sigma));
      k.push(v); s += v;
    }
    return k.map(v => v / s);
  }
  function gaussianMovingAverage(arr, size = 9, sigma = 2) {
    const ker = gaussianKernel(size, sigma), half = Math.floor(size / 2), out = [];
    for (let i = 0; i < arr.length; i++) {
      let sum = 0, wsum = 0;
      for (let j = -half; j <= half; j++) {
        const k = i + j;
        if (k >= 0 && k < arr.length) {
          const w = ker[j + half];
          sum += arr[k] * w; wsum += w;
        }
      }
      out.push(sum / wsum);
    }
    return out;
  }

  // UI pieces: toggle + legend toolbar + legend grid
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = L11_CACHE.showingSmoothed ? 'Show Raw Data' : 'Show Smoothed Data';
  toggleBtn.className = 'bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded-sm mb-2 text-sm cursor-pointer';
  toggleBtn.setAttribute('aria-pressed', String(L11_CACHE.showingSmoothed));
  toggleBtn.setAttribute('aria-label', 'Toggle smoothed vs raw series');

  const legendToolbar = document.createElement('div');
  legendToolbar.className = 'legend-toolbar';
  legendToolbar.innerHTML = `
<!--    <div class="legend-toolbar__title">Legend</div>-->
    <button id="l11-clear" class="legend-toolbar__clear" disabled>Clear</button>
  `;

  const legendDiv = document.createElement('div');
  legendDiv.className = 'legend-grid';

  // Insert UI above the plot
  container.parentNode.insertBefore(toggleBtn, container);
  container.parentNode.insertBefore(legendToolbar, container);
  container.parentNode.insertBefore(legendDiv, container);

  const clearBtn = legendToolbar.querySelector('#l11-clear');

  // Fetch & render
  fetch('data/l1LineChart.json')
    .then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
    .then((json) => {
      const subfields = json.data.map(d => d.subFieldName);

      // Restore selected set from cache (ignore any stale names)
      const selected = new Set(
        (L11_CACHE.selectedSubfields || []).filter(name => subfields.includes(name))
      );

      // Build traces
      const tracesRaw = json.data.map((field) => {
        const years = field.values.map(v => v.year);
        const vals  = field.values.map(v => Math.max(v.value, EPS));
        return {
          x: years, y: vals, mode: 'lines', name: field.subFieldName,
          line: { color: getColor(field.subFieldName), width: 2 },
          customdata: field.values.map(v => [field.subFieldName, v.value]),
          hovertemplate: hoverTemplate
        };
      });
      const tracesSmooth = json.data.map((field) => {
        const years = field.values.map(v => v.year);
        const vals  = field.values.map(v => Math.max(v.value, EPS));
        const smooth = gaussianMovingAverage(vals, SMOOTH_WINDOW, SMOOTH_SIGMA);
        return {
          x: years, y: smooth, mode: 'lines', name: field.subFieldName,
          line: { color: getColor(field.subFieldName), width: 2 },
          customdata: field.values.map(v => [field.subFieldName, v.value]),
          hovertemplate: hoverTemplate
        };
      });

      // Log ticks
      const allY = json.data.flatMap(f => f.values.map(v => Math.max(v.value, EPS)));
      const yMax = Math.max(...allY);
      const tickvals = [];
      let t = 10; // start low to avoid empty chart when values are small
      while (t <= yMax * 1.5) { tickvals.push(t); t *= 2; }

      const layout = {
        title: { text: 'Subfield Trends Over Time', y: 0, yanchor: 'bottom', x: 0.5, xanchor: 'center' },
        xaxis: { title: 'Year' },
        yaxis: {
          title: 'Publication Count',
          type: 'log',
          tickvals,
          ticktext: tickvals.map(v => (v >= 1000 ? `${Math.round(v/1000)}k` : String(v)))
        },
        dragmode: 'pan',
        margin: { t: 80, b: 70, l: 60, r: 30 },
        hovermode: 'closest',
        height: 650,
        showlegend: false
      };
      const config = { responsive: true,
                       displaylogo: false,
                       scrollZoom: true,
                       displayModeBar: false,
                       doubleClick: 'reset'
                       };

      let showingSmoothed = Boolean(L11_CACHE.showingSmoothed);
      const initialTraces = showingSmoothed ? tracesSmooth : tracesRaw;

      // Build legend
      const legendItems = {};
      subfields.forEach((sf) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');
        item.setAttribute('title', 'Click to select / highlight');

        item.innerHTML = `
          <div class="legend-line" style="background:${getColor(sf)}"></div>
          <span class="legend-label">${escapeHtml(sf)}</span>
        `;

        const handleActivate = () => {
          if (selected.has(sf)) {
            selected.delete(sf);
          } else {
            selected.add(sf);
            if (typeof onSelect === 'function') onSelect(sf); // drilldown same as line click
          }
          persistSelection();
          updateStyling();
        };

        item.addEventListener('click', handleActivate);
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleActivate(); }
        });

        legendItems[sf] = item;
        legendDiv.appendChild(item);
      });

      // Clear selection
      clearBtn.addEventListener('click', () => {
        selected.clear();
        persistSelection();
        updateStyling();
      });

      // Initial plot & styling
      Plotly.newPlot(container, initialTraces, layout, config).then(() => updateStyling());

      function persistSelection() {
        L11_CACHE.selectedSubfields = Array.from(selected);
      }
      function persistSmoothing() {
        L11_CACHE.showingSmoothed = showingSmoothed;
      }

      function updateStyling() {
        // Legend visuals (apply "active" to cached selections on load too)
        Object.entries(legendItems).forEach(([name, el]) => {
          if (selected.has(name)) {
            el.classList.add('active');
          } else {
            el.classList.remove('active');
          }
        });
        clearBtn.disabled = selected.size === 0;

        // Chart visuals
        const activeTraces = showingSmoothed ? tracesSmooth : tracesRaw;
        const opacities = [];
        const widths = [];

        activeTraces.forEach((tr, i) => {
          const isOn = selected.size === 0 || selected.has(tr.name);
          opacities[i] = isOn ? 1 : 0.25;
          widths[i] = isOn ? 3 : 1;
        });
        Plotly.restyle(container, { opacity: opacities, 'line.width': widths });
      }

      // Toggle smoothing (restore initial button state from cache already)
      toggleBtn.addEventListener('click', () => {
        showingSmoothed = !showingSmoothed;
        persistSmoothing();
        toggleBtn.textContent = showingSmoothed ? 'Show Raw Data' : 'Show Smoothed Data';
        toggleBtn.setAttribute('aria-pressed', String(showingSmoothed));
        const nextTraces = showingSmoothed ? tracesSmooth : tracesRaw;
        Plotly.react(container, nextTraces, layout, config).then(updateStyling);
      });

      // Click on plot → drilldown (does not alter highlight selection, preserving original behavior)
      container.on('plotly_click', (ev) => {
        const sf = ev?.points?.[0]?.customdata;
        if (sf && typeof onSelect === 'function') onSelect(sf);
      });

      // Responsive
      window.addEventListener('resize', () => Plotly.Plots.resize(container), { passive: true });
    })
    .catch((err) => {
      container.innerHTML = `<div class="text-red-600">Failed to load data: ${escapeHtml(err.message)}</div>`;
      console.error(err);
    });
}
