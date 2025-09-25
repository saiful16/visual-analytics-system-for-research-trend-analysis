/**
 * infoModal.js
 *
 * Dynamically injects an informational text block and modal popup into a given container.
 * Adds a clickable "Details encoding" button to trigger the modal, which displays
 * supplementary HTML content for a specific visualization level.
 *
 * Used by: Visualization modules (e.g., level1_1.js, level2_1.js, etc.)
 * Dependencies: None
 */


export function injectInfoAndModal({container, infoHTML, modalContentHTML, levelId}) {
    const modalId = `encoding-modal-${levelId}`;
    const boxId = `modal-box-${levelId}`;
    const triggerBtnId = `encoding-info-btn-${levelId}`;
    const closeBtnId = `close-modal-${levelId}`;

    // Remove any existing modal
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    // Create info block element
    const infoDiv = document.createElement('div');
    infoDiv.className = 'text-base font-medium mb-4';

// Create a temporary wrapper
    const temp = document.createElement('div');
    temp.innerHTML = infoHTML;

// Find last paragraph and append the button inside it
    const paragraphs = temp.querySelectorAll('p');
    if (paragraphs.length > 0) {
        const lastP = paragraphs[paragraphs.length - 1];
        const btn = document.createElement('button');
        btn.id = triggerBtnId;
        btn.className = 'ml-2 text-blue-600 underline text-sm cursor-pointer';
        btn.textContent = 'Encoding Details';
        lastP.appendChild(btn);
    }

    infoDiv.innerHTML = temp.innerHTML;
    container.parentNode.insertBefore(infoDiv, container);

    // Modal
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = `fixed inset-0 z-50 hidden flex items-center justify-center bg-white/10 backdrop-blur-md`;
    modal.innerHTML = `
    <div id="${boxId}" class="overflow-y-auto max-h-[700px] bg-white/90 backdrop-blur-md p-6 rounded-xl shadow-xl w-2/4 max-w-full border border-cyan-500 transform scale-95 opacity-0 transition-all duration-300 ease-out">
      ${modalContentHTML}
      <div class="mt-4 text-right">
        <button id="${closeBtnId}" class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">Close</button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);

    // Events
    document.getElementById(triggerBtnId).addEventListener('click', () => {
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            const box = document.getElementById(boxId);
            box.classList.remove('scale-95', 'opacity-0');
            box.classList.add('scale-100', 'opacity-100');
        });
    });

    document.getElementById(closeBtnId).addEventListener('click', () => {
        const box = document.getElementById(boxId);
        box.classList.remove('scale-100', 'opacity-100');
        box.classList.add('scale-95', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    });
}
