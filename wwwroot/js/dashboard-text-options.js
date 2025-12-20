// Text Options Functions (Font Size, Alignment, etc.)

window.adjustFontSize = function (action) {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    const currentSize = parseFloat(window.getComputedStyle(contentDisplay).fontSize);

    if (action === 'increase') {
        contentDisplay.style.fontSize = (currentSize + 2) + 'px';
    } else if (action === 'decrease') {
        contentDisplay.style.fontSize = Math.max(12, currentSize - 2) + 'px';
    }
};

window.setTextAlign = function (alignment) {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    contentDisplay.style.textAlign = alignment;
};

window.setLineHeight = function (height) {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    contentDisplay.style.lineHeight = height;
};

window.setFontFamily = function (font) {
    const contentDisplay = document.getElementById('content-display');
    if (!contentDisplay) return;

    contentDisplay.style.fontFamily = font;
};
