// Text Controls Functions

// Word count functionality
window.updateWordCount = function (targetId, countId, timeId) {
    const tId = targetId || 'content-display';
    const cId = countId || 'word-count';
    const tmId = timeId || 'read-time';

    const contentDisplay = document.getElementById(tId);
    if (!contentDisplay) return;

    const text = contentDisplay.innerText || contentDisplay.textContent || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Update word count display in footer
    const wordCountEl = document.getElementById(cId);
    if (wordCountEl) {
        wordCountEl.innerHTML = `<i class="bi bi-hash me-1"></i>${wordCount} words`;
    }

    // Calculate and update read time
    const readTimeEl = document.getElementById(tmId);
    if (readTimeEl) {
        const readTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min
        readTimeEl.innerHTML = `<i class="bi bi-clock me-1"></i>${readTime} min read`;
    }
};

// Hide/Show text functionality
window.toggleTextVisibility = function (targetId) {
    const tId = targetId || 'content-display';
    const contentDisplay = document.getElementById(tId);
    if (!contentDisplay) return;

    const isHidden = contentDisplay.style.color === 'transparent';

    // Find the button that triggered this, if possible, or query by attribute
    // We need to be careful if multiple buttons call this with different args.
    // Ideally pass 'this' as argument, but for now let's try to find the specific button 
    // based on the onclick attribute matching the call.
    let btn = null;
    try {
        // Attempt to find button by exact onclick match if possible
        // This is a bit hacky, but robust enough for this simple app
        const buttons = document.querySelectorAll(`button[onclick*="toggleTextVisibility('${tId}')"], button[onclick*='toggleTextVisibility("${tId}")']`);
        // If not found (legacy call), try default
        if (buttons.length === 0 && tId === 'content-display') {
            btn = document.querySelector('[onclick="toggleTextVisibility()"]');
        } else if (buttons.length > 0) {
            btn = buttons[0];
        }
    } catch (e) { }

    if (isHidden) {
        // Show text
        contentDisplay.style.color = '';
        contentDisplay.style.userSelect = '';

        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-eye-slash';
            }
            btn.setAttribute('title', 'Hide Text');
            // Check for bootstrap tooltip instance if needed
        }
    } else {
        // Hide text
        contentDisplay.style.color = 'transparent';
        contentDisplay.style.userSelect = 'none';

        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-eye';
            }
            btn.setAttribute('title', 'Show Text');
        }
    }
};

// Initialize word count when content changes
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Main Display Listener
        const contentDisplay = document.getElementById('content-display');
        if (contentDisplay) {
            const updateMain = () => window.updateWordCount('content-display', 'word-count', 'read-time');
            contentDisplay.addEventListener('input', updateMain);
            // Initial count
            updateMain();
        }

        // Summary Display Listener (if exists on load)
        const summaryDisplay = document.getElementById('summary-content-display');
        if (summaryDisplay) {
            const updateSummary = () => window.updateWordCount('summary-content-display', 'summary-word-count', 'summary-read-time');
            summaryDisplay.addEventListener('input', updateSummary);
            // Initial count (might be empty initially)
            updateSummary();
        }
    });
}
