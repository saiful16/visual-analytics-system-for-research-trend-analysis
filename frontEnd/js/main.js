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

// Import Visualization
import {renderLevel1_1} from './visualizations/level1_1.js';
import {renderLevel1_2} from './visualizations/level1_2.js';
import {renderLevel1_3} from './visualizations/level1_3.js';
import {renderLevel1_4} from './visualizations/level1_4.js';
import {renderLevel2_1} from './visualizations/level2_1.js';
import {renderLevel2_2} from './visualizations/level2_2.js';
import {renderLevel2_3} from './visualizations/level2_3.js';
import {renderLevel3_1} from './visualizations/level3_1.js';
import {renderLevel3_2} from './visualizations/level3_2.js';
import {renderLevel4_1} from './visualizations/level4_1.js';
import {renderLevel4_2} from './visualizations/level4_2.js';
import {renderLevel4_3} from './visualizations/level4_3.js';


// Global State
// Tracks user progress and selections across different visualization levels.
let levelCompletion = {
    level1: false,
    level2: false,
    level3: false,
    level4: false
};

let level1Selections = {
    subField: null,
    paramA: null,
    paramB: null
};

let level2Selections = {
    topicName: null,
    paramC: null
};

let level3Selections = {
    contextId: null,
    paramD: null
};

let currentLevel = 0;
let userPath = [];
let cachedData = {};
let chartRenderers = {}; // e.g. { level1_1: () => {} }


// Chart Renderers registration
// Maps level-specific identifiers to renderer functions that invoke
// the appropriate visualization with callback handlers.
chartRenderers.level1_1 = function () {
    renderLevel1_1({
        onSelect: (selectedName) => {
            level1Selections.subField = selectedName;
            console.log(`Selected Subfield: ${encodeURIComponent(selectedName)}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level1_2 = function () {
    renderLevel1_2({
        onSelect: (selectedName) => {
            level1Selections.subField = selectedName;
            console.log(`Selected Subfield: ${encodeURIComponent(selectedName)}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level1_3 = function () {
    renderLevel1_3({
        onSelect: (selectedName) => {
            level1Selections.subField = selectedName;
            console.log(`Selected Subfield: ${encodeURIComponent(selectedName)}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level1_4 = function () {
    renderLevel1_4({
        onSelect: (selectedName) => {
            level1Selections.subField = selectedName;
            console.log(`Selected Subfield: ${encodeURIComponent(selectedName)}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level2_1 = function () {
    renderLevel2_1({
        subField: level1Selections.subField,
        onSelect: (selectedTopic) => {
            level2Selections.topicName = selectedTopic;
            console.log(`Selected Topic: ${selectedTopic}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level2_2 = function () {
    renderLevel2_2({
        subField: level1Selections.subField,
        onSelect: (selectedTopic) => {
            level2Selections.topicName = selectedTopic;
            console.log(`Selected Topic: ${selectedTopic}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level2_3 = function () {
    renderLevel2_3({
        subField: level1Selections.subField,
        onSelect: (selectedTopic) => {
            level2Selections.topicName = selectedTopic;
            console.log(`Selected Topic: ${selectedTopic}`);
            checkLevelProgress();
        }
    });
};

chartRenderers.level3_1 = function () {
    renderLevel3_1({
        topicName: level2Selections.topicName,
        onSelect: (selectedTopic) => {
            checkLevelProgress();
        }
    });
};

chartRenderers.level3_2 = function () {
    renderLevel3_2({
        topicName: level2Selections.topicName,
        onSelect: (selectedTopic) => {
            checkLevelProgress();
        }
    });
};

chartRenderers.level4_1 = function () {
    renderLevel4_1({
        onSelect: (selectedTopic) => {
            checkLevelProgress();
        }
    });
};

chartRenderers.level4_2 = function () {
    renderLevel4_2({
        onSelect: (selectedTopic) => {
            checkLevelProgress();
        }
    });
};

chartRenderers.level4_3 = function () {
    renderLevel4_3({
        onSelect: (selectedTopic) => {
            checkLevelProgress();
        }
    });
};


//  Button Event Binding
// Only bind to buttons that have data-level and data-id attributes
document.querySelectorAll('#sidebar button[data-level][data-id]').forEach(btn => {
    btn.addEventListener('click', () => {
        const level = parseInt(btn.getAttribute('data-level'));
        const id = parseInt(btn.getAttribute('data-id'));

        currentLevel = level;
        userPath.push({level, id});

        document.querySelectorAll('#sidebar button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.getElementById('vizArea').innerHTML = `

      <div id="plot"></div>
    `;

        const renderer = chartRenderers[`level${level}_${id}`];

        if (typeof renderer === 'function') {
            renderer();
        } else {
            document.getElementById('plot').innerHTML = `
        <p>No renderer registered for this visualization.</p>
      `;
        }
    });
});


// Utility Functions
function enableLevelButtons(level) {
    const buttons = document.querySelectorAll(`#level${level} button`);
    buttons.forEach(btn => btn.disabled = false);
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
}

document.getElementById('refreshBtn').addEventListener('click', () => {
    window.location.href = window.location.pathname + '?forceReload=' + new Date().getTime();
});
