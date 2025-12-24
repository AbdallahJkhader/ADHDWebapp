// Text Options Functions (Font Size, Alignment, etc.)

// Helper to get target element, defaulting to 'content-display'
function getTarget(targetId) {
    return document.getElementById(targetId || 'content-display');
}

window.adjustFontSize = function (action, targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    const currentSize = parseFloat(window.getComputedStyle(contentDisplay).fontSize);

    if (action === 'increase') {
        contentDisplay.style.fontSize = (currentSize + 2) + 'px';
    } else if (action === 'decrease') {
        contentDisplay.style.fontSize = Math.max(12, currentSize - 2) + 'px';
    }
};

window.setTextAlign = function (alignment, targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    contentDisplay.style.textAlign = alignment;
};

window.setLineHeight = function (height, targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    contentDisplay.style.lineHeight = height;
};

window.setFontFamily = function (font, targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    contentDisplay.style.fontFamily = font;
};

window.toggleLineHeight = function (targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    const currentHeight = window.getComputedStyle(contentDisplay).lineHeight;
    // Check if it's 'normal' or a specific value roughly equal to normal (approx 1.2-1.5em) 
    // vs wide spacing (e.g. 2.0)

    // Toggle state: simple boolean check via data attribute or class might be cleaner, 
    // but checking style helps if inline styles are used.

    if (contentDisplay.style.lineHeight === '2') {
        contentDisplay.style.lineHeight = '1.6'; // Default comfortable reading
    } else {
        contentDisplay.style.lineHeight = '2'; // Wide spacing
    }
};

window.toggleReadingMode = function (targetId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    contentDisplay.classList.toggle('reading-mode');
};

window.downloadContent = function (targetId, filenameId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    const text = contentDisplay.innerText;
    if (!text.trim()) {
        alert("No content to download.");
        return;
    }

    // Attempt to find filename
    let filename = "document.txt";
    const fnDisplay = document.getElementById(filenameId) || document.querySelector('.filename-display');
    if (fnDisplay && fnDisplay.textContent.trim()) {
        filename = fnDisplay.textContent.trim();
        if (!filename.includes('.')) filename += '.txt';
    }

    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

window.shareContent = async function (targetId, filenameId) {
    const contentDisplay = getTarget(targetId);
    if (!contentDisplay) return;

    const text = contentDisplay.innerText;
    if (!text.trim()) {
        alert("No content to share.");
        return;
    }

    let title = "Shared Document";
    const fnDisplay = document.getElementById(filenameId) || document.querySelector('.filename-display');
    if (fnDisplay && fnDisplay.textContent.trim()) {
        title = fnDisplay.textContent.trim();
    }

    if (navigator.share) {
        try {
            await navigator.share({
                title: title,
                text: text,
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        // Fallback: copy to clipboard
        try {
            await navigator.clipboard.writeText(text);
            alert("Content copied to clipboard!");
        } catch (err) {
            alert("Unable to share or copy to clipboard.");
        }
    }
};
