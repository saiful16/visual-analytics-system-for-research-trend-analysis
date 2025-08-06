/**
 * loadCss.js
 *
 * Dynamically loads a CSS stylesheet into the document head if it hasn't been loaded yet.
 * Prevents duplicate stylesheet insertion by checking existing link elements.
 *
 * Used by: Any module needing conditional CSS injection
 * Dependencies: None
 */


export function loadCss(path) {
    if (!document.querySelector(`link[href="${path}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        document.head.appendChild(link);
    }
}
