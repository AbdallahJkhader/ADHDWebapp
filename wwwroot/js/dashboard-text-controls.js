// Text Controls Functions

// Word count functionality
window.updateWordCount = function () {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    const text = contentDisplay.innerText || contentDisplay.textContent || '';
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    // Update word count display in footer
    const wordCountEl = document.getElementById('word-count');
    if (wordCountEl) {
        wordCountEl.innerHTML = `<i class="bi bi-hash me-1"></i>${wordCount} words`;
    }

    // Calculate and update read time
    const readTimeEl = document.getElementById('read-time');
    if (readTimeEl) {
        const readTime = Math.ceil(wordCount / 200); // Average reading speed: 200 words/min
        readTimeEl.innerHTML = `<i class="bi bi-clock me-1"></i>${readTime} min read`;
    }
};

// Hide/Show text functionality
window.toggleTextVisibility = function () {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    const isHidden = contentDisplay.style.color === 'transparent';

    if (isHidden) {
        // Show text
        contentDisplay.style.color = '';
        contentDisplay.style.userSelect = '';

        // Update button icon
        const btn = document.querySelector('[onclick="toggleTextVisibility()"]');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) {
                icon.className = 'bi bi-eye-slash';
            }
            btn.setAttribute('title', 'Hide Text');
        }
    } else {
        // Hide text
        contentDisplay.style.color = 'transparent';
        contentDisplay.style.userSelect = 'none';

        // Update button icon
        const btn = document.querySelector('[onclick="toggleTextVisibility()"]');
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
        const contentDisplay = document.getElementById('content-display');
        if (contentDisplay) {
            // Update word count on input
            contentDisplay.addEventListener('input', () => {
                if (typeof window.updateWordCount === 'function') {
                    window.updateWordCount();
                }
            });

            // Initial count
            if (typeof window.updateWordCount === 'function') {
                window.updateWordCount();
            }
        }
    });
}
