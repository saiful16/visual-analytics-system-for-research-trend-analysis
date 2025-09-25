/**
 * level4_3.js
 *
 * Temporal co-occurrence bubbles with a compact layout and clear step highlights.
 * - No big gap between story and chart (tight flex layout)
 * - Selected Year highlight: row stripe + bold year label + bubble stroke
 * - Story steps (e.g., Evergreen) can also highlight concept columns
 */

import { topicList } from '../util/topicList.js';
import { apiFetch } from '../util/apiFetch.js';
import { injectInfoAndModal } from '../util/infoModal.js';

export function renderLevel4_3() {
  const container = document.getElementById('plot');
  container.innerHTML = `
    <div class="mb-4 font-sans space-y-2">
      <div class="flex gap-3 flex-wrap items-center">
        <label>
          Topic:
          <select id="topicSelect" class="border px-2 py-1">
            ${topicList.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label>
          Level:
          <select id="levelSelect" class="border px-2 py-1">
            ${[0,1,2,3,4,5].map(l => `<option value="${l}" ${l===3?'selected':''}>${l}</option>`).join('')}
          </select>
        </label>
        <label>
          Year:
          <select id="yearSelect" class="border px-2 py-1">
            ${[2020,2021,2022,2023,2024].map(y => `<option value="${y}" ${y===2022?'selected':''}>${y}</option>`).join('')}
          </select>
        </label>
        <label>
          Top N:
          <input type="number" id="topInput" class="border px-2 py-1 w-20" value="15" min="1">
        </label>
        <button id="applyBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Apply Filter</button>
      </div>
    </div>

    <!-- Tight, gap-less layout: sidebar + chart -->
    <div class="flex items-start gap-4 mt-2">
      <aside class="shrink-0" style="width:340px;">
        <h3 class="text-lg font-semibold mb-3">Highlights</h3>
        <ol id="story" class="space-y-3" tabindex="0" aria-label="Story steps"></ol>
      </aside>

      <section class="grow min-w-0">
        <h3 id="chartTitle" class="text-lg font-semibold mb-3 text-left"></h3>
        <div id="chartArea"></div>
        <div id="legendArea" class="mt-3"></div>
        <div id="insights" class="mt-6 grid md:grid-cols-3 gap-4"></div>
      </section>
    </div>
  `;

  injectInfoAndModal({
    container,
    levelId: 'l4-3',
    infoHTML: `
      <p class="mb-2 text-3xl">Temporal Bubble Chart</p>
      <p class="mb-2"><strong>What’s the purpose:</strong> To detect dominant, emerging, fading, or steady concepts over time.</p>
      <p class="mb-2"><strong>What’s being shown: </strong> A year-wise grid of bubbles showing concept frequency with the selected topic</p>
      <p class="mb-2"><strong>How is it shown: </strong> Concept–year grid layout, size-encoded frequency, color-coded concepts, with dynamic highlights and story-driven annotations.</p>
   `,
    modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
      
      <p class="text-sm text-gray-700 mb-4">
        <strong>Aim:</strong> Show how concepts occurrence count with a chosen topic over recent years so user can spot
        <em>dominant</em>, <em>emerging</em>, <em>fading</em>, and <em>evergreen</em> concepts.
      </p>

      <h3 class="text-base font-semibold mb-2">Visual Encodings</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>X-axis:</strong> Top-N co-occurring concepts with the selected topic.</li>
        <li><strong>Y-axis:</strong> Years.</li>
        <li><strong>Bubble Size:</strong> √(co-occurrence count); radius increases with concept frequency for visual readability.</li>
        <li><strong>Bubble Color:</strong> Each concept is assigned a unique, consistent color across years.</li>
        <li><strong>Selected Year Highlight:</strong>
          <ul class="list-disc pl-5">
            <li>Full row highlighted with a yellow stripe.</li>
            <li>Bold font for year label.</li>
            <li>Darker stroke around bubbles from the selected year.</li>
          </ul>
        </li>
        <li><strong>Highlighted Concepts (Column):</strong> Optional light-blue background stripe for selected concept(s).</li>
        <li><strong>Concept Guide Lines:</strong> Dotted vertical lines for concept columns to align across years.</li>
        <li><strong>Text Labels:</strong> 
          <ul class="list-disc pl-5">
            <li><em>Bottom:</em> Rotated concept names.</li>
            <li><em>Left:</em> Year labels (selected year in bold).</li>
          </ul>
        </li>
        <li><strong>Value Labels:</strong> Bubbles show frequency values when radius is large enough (based on threshold).</li>
        <li><strong>Annotations:</strong> Optional annotations like “Recent peak?”, “Sharp rise”, etc. shown using circles and labels.</li>
      </ul>

      
      <h3 class="text-base font-semibold mb-2">Functionalities</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-4">
        <li><strong>Dropdowns and Input:</strong>
          <ul class="list-disc pl-5">
            <li><strong>Topic Selector:</strong> Select the target research topic.</li>
            <li><strong>Level Selector:</strong> Choose concept granularity (Level 0 to Level 5).</li>
            <li><strong>Year Selector:</strong> Highlights a specific year row in the chart.</li>
            <li><strong>Top-N Input:</strong> Define how many top concepts to include.</li>
          </ul>
        </li>
        <li><strong>Apply Button:</strong> Fetches new data and updates the visualization.</li>
        <li><strong>Story Panel:</strong> Interactive “Highlights” panel with clickable steps:
          <ul class="list-disc pl-5">
            <li><strong>Overview:</strong> Top 5 dominant concepts across all years.</li>
            <li><strong>Spotlight:</strong> Focus on top concept with trend annotation.</li>
            <li><strong>Emerging:</strong> Most increasing trend (slope).</li>
            <li><strong>Fading:</strong> Most decreasing trend.</li>
            <li><strong>Evergreen:</strong> Most stable concept (low variance).</li>
          </ul>
        </li>
        <li><strong>Dynamic Highlights States:</strong> Each step controls highlights, concept emphasis, tooltips, and annotations.</li>
        <li><strong>Insights Cards:</strong> Display the top 3 <code>risers</code>, <code>fallers</code>, and <code>steady</code> concepts based on linear trend stats (slope and variance).</li>
        <li><strong>Responsive Legend:</strong> Shows only highlighted concepts (if selected), or all concepts by default.</li>
        <li><strong>Keyboard Shortcuts:</strong> Navigate story steps with arrow keys.</li>
        <li><strong>Tooltips:</strong> Shown using native <code>&lt;title&gt;</code> tag on hover (e.g., “Transformer (2023): 128”).</li>
        <li><strong>Annotations:</strong> Bubble callouts for peak, rise, fade, etc., with animated stroke effect.</li>
      </ul>

      <h2 class="text-lg font-semibold mb-4 mt-2">Concept Levels</h2>
      <p class="text-base text-gray-700">
          In <strong class="text-black">OpenAlex</strong>, concepts are organized hierarchically.
          The <code>level</code> value indicates how broad or specific a concept is:
      </p>

      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700 mt-3">
           <li><strong>Level 0:</strong> The broadest categories
            <em>(e.g., Biology, Computer Science, Economics)</em>.
          </li>
          <li><strong>Level 1:</strong> Major subfields within those categories
            <em>(e.g., Neuroscience under Biology, Artificial Intelligence under Computer Science)</em>.
          </li>
          <li><strong>Level 2:</strong> Narrower areas inside subfields
            <em>(e.g., Deep Learning under AI, Cognitive Neuroscience under Neuroscience)</em>.
          </li>
          <li><strong>Level 3+:</strong> Highly specific topics and niches
            <em>(e.g., Convolutional Neural Networks under Deep Learning)</em>.
          </li>
      </ul>

      <p class="text-sm text-gray-600 mt-3">
          <strong class="text-black">Rule of Thumb:</strong> A lower
          <code>level</code> means the concept is broader, while a higher
          <code>level</code> indicates a more specialized topic.
      </p>

    `
  });

  const chartArea  = document.getElementById('chartArea');
  const legendArea = document.getElementById('legendArea');
  const chartTitle = document.getElementById('chartTitle');

  let storySteps = [];
  let currentStepIndex = 0;
  let autoplayTimer = null;

  function computeTrends(data) {
    const yearsSet = new Set();
    data.forEach(d => d.values.forEach(v => yearsSet.add(v.year)));
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    function slopeFor(values) {
      const y = years.map(Y => values.find(v => v.year === Y)?.count || 0);
      const n = y.length;
      if (!n) return 0;
      const x = Array.from({ length: n }, (_, i) => i);
      const xbar = x.reduce((a, b) => a + b, 0) / n;
      const ybar = y.reduce((a, b) => a + b, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (x[i] - xbar) * (y[i] - ybar);
        den += (x[i] - xbar) ** 2;
      }
      return den === 0 ? 0 : num / den;
    }

    const withStats = data.map(d => {
      const s = slopeFor(d.values);
      const mean = years.length ? d.values.reduce((a, b) => a + b.count, 0) / years.length : 0;
      const variance = years.length
        ? d.values.reduce((a, b) => a + (b.count - mean) ** 2, 0) / years.length
        : 0;
      const latestYear = years[years.length - 1];
      const latest = d.values.find(v => v.year === latestYear)?.count || 0;
      const total = d.values.reduce((a, b) => a + b.count, 0);
      return { concept: d.concept, slope: s, variance, latest, total };
    });

    const risers = [...withStats].sort((a, b) => b.slope - a.slope).slice(0, 3);
    const fallers = [...withStats].sort((a, b) => a.slope - b.slope).slice(0, 3);
    const steady  = [...withStats].sort((a, b) => a.variance - b.variance).slice(0, 3);

    return { years, risers, fallers, steady, withStats };
  }

  function renderInsights({ risers, fallers, steady }) {
    const wrap = document.getElementById('insights');
    const card = (title, items, fmt = x => x) => `
      <div class="border rounded-xl p-4">
        <div class="text-sm uppercase tracking-wide opacity-70 mb-2">${title}</div>
        <ul class="space-y-1 text-sm">
          ${items.map(i => `<li><span class="font-medium">${i.concept}</span> - ${fmt(i)}</li>`).join('')}
        </ul>
      </div>`;
    wrap.innerHTML = [
      card('Top risers', risers, i => `slope ${i.slope.toFixed(2)}`),
      card('Top fallers', fallers, i => `slope ${i.slope.toFixed(2)}`),
      card('Most steady', steady, i => `variance ${i.variance.toFixed(2)}`)
    ].join('');
  }

  function buildStorySteps(data, { topic, years, withStats }) {
    const totals = data
      .map(d => ({ concept: d.concept, total: d.values.reduce((a, b) => a + b.count, 0) }))
      .sort((a, b) => b.total - a.total);

    const topConcept   = totals[0]?.concept;
    const latestYear   = Math.max(...years);
    const earliestYear = Math.min(...years);

    const steps = [
      {
        id: 'overview',
        title: 'Overview: who dominates?',
        desc: `Top co-occurring concepts with “${topic}” across ${earliestYear}–${latestYear}.`,
        state: { highlightConcepts: totals.slice(0, Math.min(5, totals.length)).map(d => d.concept), focusYear: null, dimOthers: false, highlightColumn: false },
        annotations: []
      }
    ];

    if (topConcept) {
      steps.push({
        id: 'spotlight-top',
        title: `Spotlight: ${topConcept}`,
        desc: `How ${topConcept} evolved over time.`,
        state: { highlightConcepts: [topConcept], focusYear: null, dimOthers: true, highlightColumn: true },
        annotations: [{ concept: topConcept, year: latestYear, text: 'Recent peak?' }]
      });
    }

    const byConcept = Object.fromEntries(withStats.map(s => [s.concept, s]));
    const riser  = Object.values(byConcept).sort((a, b) => b.slope - a.slope)[0];
    const faller = Object.values(byConcept).sort((a, b) => a.slope - b.slope)[0];
    const steady = Object.values(byConcept).sort((a, b) => a.variance - b.variance)[0];

    if (riser) {
      steps.push({
        id: 'riser',
        title: `Emerging: ${riser.concept}`,
        desc: `${riser.concept} shows the strongest upward trend.`,
        state: { highlightConcepts: [riser.concept], dimOthers: true, highlightColumn: true },
        annotations: [{ concept: riser.concept, year: years[years.length - 1], text: 'Sharp rise' }]
      });
    }
    if (faller) {
      steps.push({
        id: 'faller',
        title: `Fading: ${faller.concept}`,
        desc: `${faller.concept} declined over time.`,
        state: { highlightConcepts: [faller.concept], dimOthers: true, highlightColumn: true },
        annotations: [{ concept: faller.concept, year: years[0], text: 'Earlier strength' }]
      });
    }
    if (steady) {
      steps.push({
        id: 'steady',
        title: `Evergreen: ${steady.concept}`,
        desc: `${steady.concept} remained consistently present.`,
        // Important: make this visibly highlighted (column stripe + emphasis)
        state: { highlightConcepts: [steady.concept], dimOthers: true, highlightColumn: true },
        annotations: []
      });
    }

    return steps;
  }

  function addAnnotation(svg, { x, y, text }) {
    const g = svg.append('g').attr('class', 'annotation');
    g.append('circle')
      .attr('cx', x).attr('cy', y).attr('r', 18)
      .attr('fill', 'none').attr('stroke', '#8b5cf6').attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,3');

    g.append('text')
      .attr('x', x + 22).attr('y', y)
      .attr('alignment-baseline', 'middle')
      .attr('class', 'text-xs')
      .text(text);

    g.append('circle')
      .attr('cx', x).attr('cy', y).attr('r', 18)
      .attr('fill', 'none').attr('stroke', '#8b5cf6').attr('opacity', 0.6)
      .transition().duration(1200).ease(d3.easeCubicOut)
      .attr('r', 36).attr('opacity', 0)
      .on('end', function () { d3.select(this).remove(); });
  }

  function renderLegend(concepts, colorScale, highlightedSet) {
    const onlyHighlighted = highlightedSet && highlightedSet.size > 0;
    const items = onlyHighlighted ? concepts.filter(c => highlightedSet.has(c)) : concepts;
    legendArea.innerHTML = `
      <div class="flex flex-wrap gap-2 text-sm">
        ${items.map(c => `
          <span class="inline-flex items-center gap-2 px-2 py-1 border rounded-full">
            <span class="inline-block w-3 h-3 rounded-full" style="background:${colorScale(c)}"></span>
            ${c}
          </span>
        `).join('')}
      </div>
    `;
  }

  async function drawTimeline({ topic, level, year, top, storyState }) {
    chartArea.innerHTML = '';
    legendArea.innerHTML = '';
    const url = `/concepts?name=${encodeURIComponent(topic)}&type=timeLine&level=${level}&year=${year}&top=${top}`;

    const res = await apiFetch(url);
    const data = res.data || [];
    chartTitle.textContent = res.topicName || topic;

    const years = [2024, 2023, 2022, 2021, 2020];
    const concepts = data.map(d => d.concept);

    const flatData = [];
    data.forEach(cd => cd.values.forEach(v => {
      flatData.push({ concept: cd.concept, year: v.year, count: v.count });
    }));

    const margin = { top: 20, right: 40, bottom: 150, left: 120 };
    const cellSize = 90;
    const width  = Math.max(concepts.length * cellSize, 300);
    const height = Math.max(years.length * cellSize, 260);

    const svg = d3.select('#chartArea')
      .append('svg')
      .attr('width',  width  + margin.left + margin.right)
      .attr('height', height + margin.top  + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(concepts).range([0, width]).padding(0.2);
    const y = d3.scaleBand().domain(years).range([0, height]).padding(0.2);

    const maxCount  = d3.max(flatData, d => d.count) || 1;
    const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([0, cellSize / 2 - 10]);
    const colorScale = d3.scaleOrdinal().domain(concepts).range(d3.schemeTableau10);

    const selectedYear = year;

    // Selected year row stripe
    if (years.includes(selectedYear)) {
      svg.append('rect')
        .attr('x', 0)
        .attr('y', y(selectedYear))
        .attr('width', width)
        .attr('height', y.bandwidth())
        .attr('fill', '#fff3cd')
        .attr('opacity', 0.6)
        .lower();
    }

    // Optional: highlighted concept column stripe(s)
    const highlightedSet = new Set(storyState?.highlightConcepts || []);
    if (storyState?.highlightColumn && highlightedSet.size) {
      concepts.forEach(c => {
        if (highlightedSet.has(c)) {
          svg.append('rect')
            .attr('x', x(c))
            .attr('y', 0)
            .attr('width', x.bandwidth())
            .attr('height', height)
            .attr('fill', '#e0f2fe')  // light blue
            .attr('opacity', 0.55)
            .lower();
        }
      });
    }

    // Concept guide (dotted) lines
    svg.selectAll('.concept-line')
      .data(concepts)
      .enter()
      .append('line')
      .attr('x1', d => x(d) + x.bandwidth() / 2)
      .attr('x2', d => x(d) + x.bandwidth() / 2)
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,2');

    // Year labels (selected year emphasized)
    svg.selectAll('.year-label')
      .data(years)
      .enter()
      .append('text')
      .attr('x', -10)
      .attr('y', d => y(d) + y.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('alignment-baseline', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', d => d === selectedYear ? 700 : 400)
      .attr('fill', d => d === selectedYear ? '#111' : '#374151')
      .text(d => d);

    // Concept labels (bottom)
    svg.selectAll('.concept-label')
      .data(concepts)
      .enter()
      .append('text')
      .attr('x', d => x(d) + x.bandwidth() / 2)
      .attr('y', height + 40)
      .attr('text-anchor', 'end')
      .attr('transform', d => `rotate(-45, ${x(d) + x.bandwidth() / 2}, ${height + 40})`)
      .attr('font-size', '11px')
      .text(d => d);

    // Bubbles
    const bubbles = svg.selectAll('.bubble')
      .data(flatData, d => `${d.concept}-${d.year}`)
      .enter()
      .append('circle')
      .attr('class', 'bubble')
      .attr('cx', d => x(d.concept) + x.bandwidth() / 2)
      .attr('cy', d => y(d.year) + y.bandwidth() / 2)
      .attr('r', 0)
      .attr('fill', d => colorScale(d.concept))
      .attr('opacity', d => {
        if (highlightedSet.size && storyState?.dimOthers && !highlightedSet.has(d.concept)) return 0.18;
        return 1;
      })
      .attr('stroke', d => (d.year === selectedYear ? '#111' : (highlightedSet.has(d.concept) ? '#0f766e' : 'none')))
      .attr('stroke-width', d => (d.year === selectedYear || highlightedSet.has(d.concept)) ? 2 : 0);

    bubbles.transition().duration(600).attr('r', d => sizeScale(d.count));

    // Counts on bubbles
    svg.selectAll('text.bubble-count')
      .data(flatData)
      .enter()
      .append('text')
      .attr('class', 'bubble-count')
      .attr('x', d => x(d.concept) + x.bandwidth() / 2)
      .attr('y', d => y(d.year) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('alignment-baseline', 'middle')
      .attr('font-size', '10px')
      .attr('fill', 'white')
      .text(d => d.count)
      .attr('opacity', d => sizeScale(d.count) >= 10 ? 0.9 : 0)
      .append('title')
      .text(d => `${d.concept} (${d.year}): ${d.count}`);

    // Tooltips (simple <title>)
    bubbles.append('title').text(d => `${d.concept} (${d.year}): ${d.count}`);

    // Annotations (if any)
    (storyState?.annotations || []).forEach(a => {
      if (concepts.includes(a.concept) && years.includes(a.year)) {
        addAnnotation(svg, {
          x: x(a.concept) + x.bandwidth() / 2,
          y: y(a.year) + y.bandwidth() / 2,
          text: a.text
        });
      }
    });

    renderLegend(concepts, colorScale, highlightedSet);
    return { data, years };
  }

  function renderStoryList(steps) {
    const list = document.getElementById('story');
    list.innerHTML = steps.map((s, i) => `
      <li data-step="${i}" class="p-3 border rounded-xl cursor-pointer hover:bg-gray-50 focus:bg-gray-50 focus:outline-none">
        <div class="font-medium">${(s.title || `Step ${i + 1}`)}</div>
        <div class="text-sm opacity-80">${s.desc || ''}</div>
      </li>
    `).join('');

    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => applyStoryStep(parseInt(li.dataset.step, 10)));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          applyStoryStep(parseInt(li.dataset.step, 10));
        }
      });
    });
  }

  async function applyStoryStep(index) {
    if (!storySteps.length) return;
    currentStepIndex = index % storySteps.length;

    const stepEls = document.querySelectorAll('#story li');
    stepEls.forEach((el, i) => el.classList.toggle('ring-2', i === currentStepIndex));

    const topic = document.getElementById('topicSelect').value;
    const level = document.getElementById('levelSelect').value;
    const year  = parseInt(document.getElementById('yearSelect').value, 10);
    const top   = parseInt(document.getElementById('topInput').value, 10);

    const state = storySteps[currentStepIndex]?.state || {};
    await drawTimeline({ topic, level, year, top, storyState: state });
  }

  async function refreshStoryAndChart() {
    const topic = document.getElementById('topicSelect').value;
    const level = document.getElementById('levelSelect').value;
    const year  = parseInt(document.getElementById('yearSelect').value, 10);
    const top   = parseInt(document.getElementById('topInput').value, 10);

    try {
      const { data } = await drawTimeline({ topic, level, year, top, storyState: {} });
      const trends = computeTrends(data);
      renderInsights(trends);
      storySteps = buildStorySteps(data, { topic, years: trends.years, withStats: trends.withStats });
      renderStoryList(storySteps);
      await applyStoryStep(0);
    } catch (err) {
      chartArea.innerHTML = `<p class="text-red-500">Failed to load timeline data.</p>`;
      console.error(err);
    }
  }

  document.getElementById('applyBtn').addEventListener('click', () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
      const btn = document.getElementById('playStoryBtn');
      if (btn) btn.textContent = 'Play';
    }
    refreshStoryAndChart();
  });

  window.addEventListener('keydown', (e) => {
    if (!storySteps.length) return;
    if (e.key === 'ArrowRight') applyStoryStep((currentStepIndex + 1) % storySteps.length);
    if (e.key === 'ArrowLeft')  applyStoryStep((currentStepIndex - 1 + storySteps.length) % storySteps.length);
  });

  // Initial render (no need to click Apply)
  refreshStoryAndChart();
}
