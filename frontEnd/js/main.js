/**
 * main.js
 *
 * Central controller for coordinating all visualization levels.
 * Manages global state, user progress, selection memory, and delegates rendering
 * to specific visualization modules (level1 to level4).
 *
 * Used by: index.html
 * Dependencies: Visualization modules under ./visualizations/
 */

// ---- Imports ---------------------------------------------------------------
import { renderLevel1_1 } from './visualizations/level1_1.js';
import { renderLevel1_2 } from './visualizations/level1_2.js';
import { renderLevel1_3 } from './visualizations/level1_3.js';
import { renderLevel1_4 } from './visualizations/level1_4.js';
import { renderLevel2_1 } from './visualizations/level2_1.js';
import { renderLevel2_2 } from './visualizations/level2_2.js';
import { renderLevel2_3 } from './visualizations/level2_3.js';
import { renderLevel3_1 } from './visualizations/level3_1.js';
import { renderLevel3_2 } from './visualizations/level3_2.js';
import { renderLevel4_1 } from './visualizations/level4_1.js';
import { renderLevel4_2 } from './visualizations/level4_2.js';
import { renderLevel4_3 } from './visualizations/level4_3.js';

// ---- Global state ----------------------------------------------------------
let levelCompletion = { level1: false, level2: false, level3: false, level4: false };

let level1Selections = { subField: null, paramA: null, paramB: null };
let level2Selections = { topicName: null, paramC: null };
let level3Selections = { contextId: null, paramD: null };

let currentLevel = 0;
let userPath = [];
let cachedData = {}; // reserved for any data memoization if needed

// Expose for debugging (optional)
window.state = { level1Selections, level2Selections, level3Selections, levelCompletion };

// ---- Renderer registry -----------------------------------------------------
const chartRenderers = {};

// Level 1
chartRenderers.level1_1 = () => {
  renderLevel1_1({
    onSelect: (name) => {
      level1Selections.subField = name;
      console.log('Selected Subfield:', name);
      checkLevelProgress();
    }
  });
};
chartRenderers.level1_2 = () => {
  renderLevel1_2({
    onSelect: (name) => {
      level1Selections.subField = name;
      console.log('Selected Subfield:', name);
      checkLevelProgress();
    }
  });
};
chartRenderers.level1_3 = () => {
  renderLevel1_3({
    onSelect: (name) => {
      level1Selections.subField = name;
      console.log('Selected Subfield:', name);
      checkLevelProgress();
    },
    onSelectTopic: (value) => {
      level2Selections.topicName = value;
      console.log('Selected Topic:', value);
      checkLevelProgress();
    }
  });
};

chartRenderers.level1_4 = () => {
  renderLevel1_4({
    onSelect: (name) => {
      level1Selections.subField = name;
      console.log('Selected Subfield:', name);
      checkLevelProgress();
    }
  });
};

// Level 2 (require subField)
function requireSubfieldOrExplain() {
  if (level1Selections.subField) return true;
  const plot = document.getElementById('plot');
  if (plot) {
    plot.innerHTML = `<div class="text-gray-700 text-sm">
      Please select a <b>subfield</b> in Level 1 first.
    </div>`;
  }
  return false;
}

chartRenderers.level2_1 = () => {
  if (!requireSubfieldOrExplain()) return;
  renderLevel2_1({
    subField: level1Selections.subField,
    onSelect: (topic) => {
      level2Selections.topicName = topic;
      console.log('Selected Topic:', topic);
      checkLevelProgress();
    }
  });
};

chartRenderers.level2_2 = () => {
  if (!requireSubfieldOrExplain()) return;
  renderLevel2_2({
    subField: level1Selections.subField,
    onSelect: (topic) => {
      level2Selections.topicName = topic;
      console.log('Selected Topic:', topic);
      checkLevelProgress();
    }
  });
};

chartRenderers.level2_3 = () => {
  if (!requireSubfieldOrExplain()) return;
  renderLevel2_3({
    subField: level1Selections.subField,
    onSelect: (topic) => {
      level2Selections.topicName = topic;
      console.log('Selected Topic:', topic);
      checkLevelProgress();
    }
  });
};



// Level 3 (require topicName)
function requireTopicOrExplain() {
  if (level2Selections.topicName) return true;
  const plot = document.getElementById('plot');
  if (plot) {
    plot.innerHTML = `<div class="text-gray-700 text-sm">
      Please select a <b>topic</b> in Level 2 first.
    </div>`;
  }
  return false;
}

chartRenderers.level3_1 = () => {
  if (!requireTopicOrExplain()) return;
  renderLevel3_1({
    topicName: level2Selections.topicName,
    onSelect: () => checkLevelProgress()
  });
};
chartRenderers.level3_2 = () => {
  if (!requireTopicOrExplain()) return;
  renderLevel3_2({
    topicName: level2Selections.topicName,
    onSelect: () => checkLevelProgress()
  });
};

// Level 4 (no prerequisites enforced here by default)
chartRenderers.level4_1 = () => {
  renderLevel4_1({ onSelect: () => checkLevelProgress() });
};
chartRenderers.level4_2 = () => {
  renderLevel4_2({ onSelect: () => checkLevelProgress() });
};
chartRenderers.level4_3 = () => {
  renderLevel4_3({ onSelect: () => checkLevelProgress() });
};

// ---- UI wiring -------------------------------------------------------------
function renderView(level, id) {
  const area = document.getElementById('vizArea');
  if (!area) {
    console.warn('#vizArea not found');
    return;
  }
  area.innerHTML = `<div id="plot"></div>`;

  const key = `level${level}_${id}`;
  const renderer = chartRenderers[key];
  if (typeof renderer === 'function') {
    renderer();
  } else {
    document.getElementById('plot').innerHTML = `<p>No renderer registered for <code>${key}</code>.</p>`;
  }
}

document.querySelectorAll('#sidebar button[data-level][data-id]').forEach(btn => {
  btn.addEventListener('click', () => {
    const level = Number(btn.getAttribute('data-level'));
    const id = Number(btn.getAttribute('data-id'));

    currentLevel = level;
    userPath.push({ level, id });

    document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    renderView(level, id);
  });
});

// ---- Progress / gating -----------------------------------------------------
function enableLevelButtons(level) {
  // Enable buttons whose data-level equals the level number
  document
    .querySelectorAll(`#sidebar button[data-level="${level}"]`)
    .forEach(btn => (btn.disabled = false));
}

function checkLevelProgress() {
  if (level1Selections.subField) {
    levelCompletion.level1 = true;
    enableLevelButtons(2);
  }
  if (level2Selections.topicName) {
    levelCompletion.level2 = true;
    enableLevelButtons(3);
  }
  updateSelectionsDisplay();
}

function updateSelectionsDisplay() {
  const subfieldEl = document.getElementById('selectedSubfield');
  if (subfieldEl) {
    subfieldEl.textContent = level1Selections.subField
      ? `Selected: ${level1Selections.subField}`
      : 'Nothing selected';
  }

  const topicEl = document.getElementById('selectedTopic');
  if (topicEl) {
    topicEl.textContent = level2Selections.topicName
      ? `Selected: ${level2Selections.topicName}`
      : 'Nothing selected';
  }
}

const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    window.location.href = window.location.pathname + '?forceReload=' + Date.now();
  });
}

// Initial UI state
updateSelectionsDisplay();
