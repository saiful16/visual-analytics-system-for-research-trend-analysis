/**
 * level4_2.js
 *
 * Renders an interactive word cloud that shows the most frequent concept co-occurrences
 * for a selected topic, filtered by hierarchy level and year. Users can customize
 * the view using dropdowns and filters for topic, level, year, and top-N terms.
 *
 * Used by: main.js
 * Dependencies: topicList.js, apiFetch.js, infoModal.js
 */


import {topicList} from '../util/topicList.js';
import {apiFetch} from '../util/apiFetch.js';
import {injectInfoAndModal} from '../util/infoModal.js';

export function renderLevel4_2({onSelect}) {
    const container = document.getElementById('plot');
    container.innerHTML = `
    <div class="mb-4 font-sans space-y-2">
      <div class="flex gap-4 flex-wrap items-center">
        <label>
          Topic:
          <select id="topicSelect" class="border px-2 py-1">
            ${topicList.map(t => `<option value="${t}">${t}</option>`).join('')}
          </select>
        </label>
        <label>
          Level:
          <select id="levelSelect" class="border px-2 py-1">
            ${[0, 1, 2, 3, 4, 5].map(l => `<option value="${l}" ${l === 3 ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </label>
        <label>
          Year:
          <select id="yearSelect" class="border px-2 py-1">
            ${[2020, 2021, 2022, 2023, 2024].map(y => `<option value="${y}" ${y === 2024 ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </label>
        <label>
          Top N:
          <input type="number" id="topInput" class="border px-2 py-1 w-20" value="30" min="1">
        </label>
        <button id="applyBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Apply</button>
      </div>
    </div>
    <h3 id="wordCloudTitle" class="text-lg font-semibold mb-3 text-left"></h3>
    <div id="wordCloudArea" class="w-full h-[700px]"></div>
  `;

    //  Inject modal for encoding info.
    injectInfoAndModal({
        container,
        levelId: 'l4-2',
        infoHTML: `
      <p class="mb-2 text-3xl"> Top Concepts frequency Word Cloud by Topic and Year</p>
      <p class="mb-2"><strong>What’s the purpose:</strong> To give users a quick overview of the dominant related concepts, helping identify key themes or associations at a glance.</p>
      <p class="mb-2"><strong>What’s being shown: </strong> A word cloud showing the most frequent concepts occurring with a selected research topic in a given year and concept hierarchy level.</p>
      <p class="mb-2"><strong>How is it shown: </strong> Uses font size to encode frequency, random colors for visual distinction, and randomized rotation and position for compact and engaging layout.</p>
    `,
        modalContentHTML: `
      <h2 class="text-lg font-semibold mb-4">Detailed Visual Encoding and Functionality</h2>
      <p class="text-base text-gray-700">
            <strong class="text-black">Aim:</strong>
            To show the most frequently co-occurring concepts with a selected topic in a given year using word size as an indicator of frequency. This provides a quick, high-level view of the most prominent related concepts based on publication count.
      </p>

      <h3 class="font-semibold mt-4 mb-2">Visual Encodings:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Font Size:</strong> The size of each word represents its <strong>co-occurrence frequency</strong> with the selected topic in the given year and level.</li>
        <li><strong>Color:</strong> Colors are randomly assigned to improve visual separation between words but do not encode data.</li>
        <li><strong>Rotation:</strong> Words are randomly rotated (0° or 90°) to create a denser and more dynamic layout.</li>
        <li><strong>Position:</strong> Word placement is handled by a force-based layout to avoid overlaps while maximizing space usage.</li>
      </ul>
      
      <h3 class="font-semibold mt-4 mb-2">Functionalities:</h3>
      <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
        <li><strong>Topic Selection:</strong> The chart displays co-occurring concepts for the currently selected research topic.</li>
        <li><strong>Year Filter:</strong> Users can specify a <code>From</code> and <code>To</code> year range to filter the co-occurrence data temporally.</li>
        <li><strong>Level Selection:</strong> A dropdown allows switching between different concept hierarchy levels (e.g., Level 1, 2, 3).</li>
        <li><strong>Responsive Redrawing:</strong> The word cloud regenerates on every parameter change (topic, year range, or level), updating the layout accordingly.</li>
        <li><strong>Tooltip:</strong> Hovering over a word shows its exact co-occurrence count (frequency) for clarity.</li>
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

    const area = document.getElementById('wordCloudArea');
    const title = document.getElementById('wordCloudTitle');

    document.getElementById('applyBtn').addEventListener('click', async () => {
        area.innerHTML = '';
        const topic = document.getElementById('topicSelect').value;
        const level = document.getElementById('levelSelect').value;
        const year = document.getElementById('yearSelect').value;
        const top = document.getElementById('topInput').value;

        const url = `/concepts?name=${encodeURIComponent(topic)}&type=wordCloud&level=${level}&year=${year}&top=${top}`;

        try {
            const res = await apiFetch(url);
            const words = res.data || [];
            const topicName = res.topicName || topic;
            title.textContent = topicName;

            const width = 1000;
            const height = 700;

            const svg = d3.select('#wordCloudArea')
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            const color = d3.scaleOrdinal(d3.schemeCategory10);

            const layout = d3.layout.cloud()
                .size([width, height])
                .words(words.map(d => ({
                    text: d.concept,
                    size: d.count,
                    count: d.count
                })))
                .padding(5)
                .rotate(() => (Math.random() > 0.7 ? 90 : 0))
                .fontSize(d => 10 + Math.sqrt(d.size) * 2)
                .on('end', draw);

            layout.start();

            function draw(words) {
                svg.append('g')
                    .attr('transform', `translate(${width / 2},${height / 2})`)
                    .selectAll('text')
                    .data(words)
                    .enter()
                    .append('text')
                    .style('font-size', d => `${d.size}px`)
                    .style('fill', d => color(d.text))
                    .attr('text-anchor', 'middle')
                    .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
                    .text(d => d.text)
                    .append('title')
                    .text(d => `${d.text}: ${d.count}`);
            }

        } catch (err) {
            area.innerHTML = `<p class="text-red-500">Failed to load word cloud data.</p>`;
            console.error(err);
        }
    });

    document.getElementById('applyBtn').click();
}
