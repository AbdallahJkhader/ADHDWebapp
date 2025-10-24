// Generate AI helper card -> show options, then drive right panel menu
document.addEventListener('DOMContentLoaded', () => {
    const generateCard = document.getElementById('btn-generate-ai-helper');
    const generateOptions = document.getElementById('generate-options');
    const rightPanelMenu = document.getElementById('rightPanelMenu');
    const sectionContent = document.getElementById('section-content');

    const showOptions = () => {
        if (generateCard) {
            // Hide only the card so options (siblings) appear in-place
            generateCard.style.display = 'none';
        }
        if (generateOptions) {
            generateOptions.style.display = '';
            generateOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (generateCard) {
        generateCard.addEventListener('click', (e) => {
            e.preventDefault();
            showOptions();
        });
    }

    const activateSection = (key) => {
        // Open right panel menu if it exists as collapse
        if (rightPanelMenu && !rightPanelMenu.classList.contains('show')) {
            rightPanelMenu.classList.add('show');
            rightPanelMenu.style.height = 'auto';
        }
        // Activate matching nav link
        const target = document.querySelector(`.main-nav .nav-link[data-section="${key}"]`);
        if (target) target.click();
        // Fallback: update content directly
        if (sectionContent && contentMap[key]) {
            sectionContent.innerHTML = contentMap[key];
        }
    };

    const optSummary = document.getElementById('gen-opt-summary');
    const optWorkbook = document.getElementById('gen-opt-workbook');
    const optQuizzes = document.getElementById('gen-opt-quizzes');
    const optAi = document.getElementById('gen-opt-ai');
    if (optSummary) optSummary.addEventListener('click', () => activateSection('summary'));
    if (optWorkbook) optWorkbook.addEventListener('click', () => activateSection('workbook'));
    if (optQuizzes) optQuizzes.addEventListener('click', () => activateSection('quizzes'));
    if (optAi) optAi.addEventListener('click', () => activateSection('ai'));
});
/**
 * Dashboard configuration and utility functions
 */

/**
 * Application configuration object
 * @type {Object}
 */
const DASHBOARD_CFG = window.DASHBOARD_CFG || {};

/**
 * Set of selected file IDs for batch operations
 * @type {Set<number>}
 */
const SELECTED_FILE_IDS = new Set();

/**
 * Dropdown positioning anchors for restoration when hiding
 * @type {Object}
 */
const DROPDOWN_ANCHORS = {}; // key: `${id}-dropdown` => parentElement

/**
 * Toggles dropdown visibility with smart positioning
 * @param {string} id - The dropdown ID to toggle
 * @param {Event} evt - The triggering event for positioning
 */
function toggleDropdown(id, evt) {
    if (evt) evt.stopPropagation();
    const dropdown = document.getElementById(`${id}-dropdown`);
    if (!dropdown) return;

    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu.id !== `${id}-dropdown`) {
            menu.classList.remove('show');
        }
    });

    const willShow = !dropdown.classList.contains('show');
    dropdown.classList.toggle('show');

    // Smart positioning for ANY topbar dropdown to keep within viewport
    try {
        const trigger = evt?.currentTarget || document.querySelector(`button.nav-btn[onclick*="toggleDropdown('${id}')"]`);
        if (trigger) {
            if (dropdown.classList.contains('show')) {
                const key = `${id}-dropdown`;
                if (!DROPDOWN_ANCHORS[key]) {
                    DROPDOWN_ANCHORS[key] = dropdown.parentElement;
                }
                if (dropdown.parentElement !== document.body) {
                    document.body.appendChild(dropdown);
                }
                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 8}px`;
                // Align right edge of dropdown with button right edge, clamped to viewport
                dropdown.style.left = 'auto';
                dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
                dropdown.style.transform = 'none';
                dropdown.style.zIndex = 1200;
                dropdown.style.maxHeight = '70vh';
                dropdown.style.overflow = 'visible';
            } else {
                // Clear inline styles when hiding and restore to original parent
                dropdown.style.position = '';
                dropdown.style.top = '';
                dropdown.style.left = '';
                dropdown.style.right = '';
                dropdown.style.transform = '';
                dropdown.style.zIndex = '';
                dropdown.style.maxHeight = '';
                dropdown.style.overflow = '';
                const key = `${id}-dropdown`;
                if (DROPDOWN_ANCHORS[key] && dropdown.parentElement === document.body) {
                    DROPDOWN_ANCHORS[key].appendChild(dropdown);
                }
            }
        }
    } catch (e) {
        console.warn('Dropdown positioning failed:', id, e);
    }
}

// Reposition any open dropdowns on resize/scroll
['resize', 'scroll'].forEach(evtName => {
    window.addEventListener(evtName, () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
            const id = dropdown.id.replace('-dropdown', '');
            const trigger = document.querySelector(`button.nav-btn[onclick*="toggleDropdown('${id}')"]`);
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 8}px`;
                dropdown.style.left = 'auto';
                dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
                dropdown.style.transform = 'none';
                dropdown.style.zIndex = 1200;
                dropdown.style.maxHeight = '70vh';
                dropdown.style.overflow = 'visible';
            }
        });
    });
});

// Toggle an inline panel inside a dropdown (e.g., Timer inside Focus)
function toggleInlinePanel(panelId, event) {
    if (event) event.stopPropagation();
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Close other inline panels (both focus and network types)
    document.querySelectorAll('.dropdown-menu.inline-left.show, .dropdown-menu.inline-left-from-focus.show, .dropdown-menu.inline-left-from-network.show, .dropdown-menu.inline-left-from-user.show')
        .forEach(p => { if (p.id !== panelId) p.classList.remove('show'); });

    const willShow = !panel.classList.contains('show');
    panel.classList.toggle('show');

    // If showing, position panel relative to its owning dropdown within viewport
    if (willShow && panel.classList.contains('show')) {
        // Determine owner dropdown by panel type
        let ownerId;
        if (panel.classList.contains('inline-left-from-network')) {
            ownerId = 'network-notifications-dropdown';
        } else if (panel.classList.contains('inline-left-from-user')) {
            ownerId = 'user-dropdown';
        } else {
            ownerId = 'focus-dropdown';
        }
        
        const owner = document.getElementById(ownerId);
        if (owner) {
            // Ensure the owner dropdown stays open
            if (!owner.classList.contains('show')) owner.classList.add('show');

            const rect = owner.getBoundingClientRect();
            panel.style.position = 'fixed';
            panel.style.top = `${Math.max(8, rect.top)}px`;
            const panelWidth = 360;
            
            // For user menu, align the panel to the left of the menu
            if (panel.classList.contains('inline-left-from-user')) {
                const left = Math.max(8, rect.left - 360 - 8); // Position to the left of the user menu
                panel.style.left = `${left}px`;
                panel.style.right = 'auto';
            } else {
                // For other panels, align to the left
                const desiredLeft = rect.left - panelWidth - 8; // to the left of dropdown
                const left = Math.max(8, Math.min(desiredLeft, window.innerWidth - panelWidth - 8));
                panel.style.left = `${left}px`;
                panel.style.right = 'auto';
            }
            
            panel.style.width = `${panelWidth}px`;
            panel.style.transform = 'none';
            panel.style.zIndex = 2000;
            panel.style.maxHeight = '70vh';
            panel.style.overflow = 'auto';
            panel.style.minWidth = '';
        }
    } else {
        // Clear inline styles when hiding
        panel.style.position = '';
        panel.style.top = '';
        panel.style.left = '';
        panel.style.right = '';
        panel.style.transform = '';
        panel.style.zIndex = '';
        panel.style.maxHeight = '';
        panel.style.overflow = '';
        panel.style.minWidth = '';
    }
}

// Centralized view manager for the left pane
function setLeftView(mode) {
    const uploadContainer = document.getElementById('upload-container');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const manualText = document.getElementById('manual-text');
    const uploadedSection = document.getElementById('uploaded-files-section');

    if (uploadContainer) uploadContainer.style.display = (mode === 'upload') ? 'flex' : 'none';
    if (fileDisplayContainer) fileDisplayContainer.style.display = (mode === 'viewer') ? 'flex' : 'none';
    if (manualText) manualText.style.display = (mode === 'manual') ? 'block' : 'none';
    if (uploadedSection) uploadedSection.style.display = (mode === 'files') ? 'block' : 'none';

    // Set a mode class on body to allow CSS to enforce visibility
    const body = document.body;
    if (body) {
        body.classList.remove('mode-upload', 'mode-viewer', 'mode-manual', 'mode-files');
        body.classList.add(`mode-${mode}`);
    }
}

// Show the files list as the main view in the left section
function showMyFiles() {
    setLeftView('files');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const uploadedSection = document.getElementById('uploaded-files-section');
    const uploadContainer = document.getElementById('upload-container');
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (fileDisplayContainer) fileDisplayContainer.style.display = 'none';
    if (uploadContainer) uploadContainer.style.display = 'none';
    if (uploadedSection) uploadedSection.style.display = 'block';
    // Reset any filtering
    const grid = uploadedSection ? uploadedSection.querySelector('.files-grid') : null;
    if (grid) Array.from(grid.children).forEach(card => card.style.display = '');
    if (titleEl) titleEl.textContent = 'Your Files';
}

// Close dropdowns when clicking elsewhere
window.onclick = function (event) {
    // Don't close if clicking inside a dropdown or on a dropdown toggle
    if (event.target.closest('.dropdown-menu') || event.target.closest('.dropdown-toggle') || event.target.closest('.nav-btn')) {
        return;
    }

    const dropdowns = document.getElementsByClassName("dropdown-menu");
    for (let i = 0; i < dropdowns.length; i++) {
        const openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
        }
    }
}

// ======= Focus Timer Logic =======
const TIMER = {
    durationMs: 25 * 60 * 1000,
    remainingMs: 25 * 60 * 1000,
    running: false,
    intervalId: null,
    endTs: null
};

function formatMMSS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getRemainingTimeEl() {
    try {
        const panel = document.getElementById('focus-timer-panel');
        if (!panel) return null;
        // Find the item whose title text is 'Remaining Time'
        const titles = panel.querySelectorAll('.activity-title');
        for (const t of titles) {
            if ((t.textContent || '').trim().toLowerCase() === 'remaining time') {
                const desc = t.parentElement?.querySelector('.activity-desc');
                if (desc) return desc;
            }
        }
        // Fallback: first .activity-desc inside panel
        return panel.querySelector('.activity-desc');
    } catch { return null; }
}

function updateTimerDisplay() {
    const el = getRemainingTimeEl();
    if (el) el.textContent = formatMMSS(TIMER.remainingMs);
}

function stopTimerInterval() {
    if (TIMER.intervalId) {
        clearInterval(TIMER.intervalId);
        TIMER.intervalId = null;
    }
}

function startTimer() {
    if (TIMER.running) return;
    if (TIMER.remainingMs <= 0) TIMER.remainingMs = TIMER.durationMs;
    TIMER.running = true;
    TIMER.endTs = Date.now() + TIMER.remainingMs;
    stopTimerInterval();
    TIMER.intervalId = setInterval(() => {
        const now = Date.now();
        TIMER.remainingMs = Math.max(0, TIMER.endTs - now);
        updateTimerDisplay();
        if (TIMER.remainingMs <= 0) {
            stopTimerInterval();
            TIMER.running = false;
        }
    }, 250);
}

function pauseTimer() {
    if (!TIMER.running) return;
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = Math.max(0, TIMER.endTs - Date.now());
    updateTimerDisplay();
}

function resetTimer() {
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = TIMER.durationMs;
    updateTimerDisplay();
}

// Presets
document.querySelectorAll('.timer-preset').forEach(preset => {
    preset.addEventListener('click', function () {
        document.querySelectorAll('.timer-preset').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const minutes = parseInt(this.getAttribute('data-minutes')) || 25;
        TIMER.durationMs = minutes * 60 * 1000;
        TIMER.remainingMs = TIMER.durationMs;
        stopTimerInterval();
        TIMER.running = false;
        updateTimerDisplay();
    });
});

// Bind Start/Pause/Reset buttons inside the timer panel
document.addEventListener('DOMContentLoaded', function () {
    // Initialize display
    updateTimerDisplay();
    const panel = document.getElementById('focus-timer-panel');
    if (!panel) return;
    const startBtn = panel.querySelector('button .bi-play')?.closest('button');
    const pauseBtn = panel.querySelector('button .bi-pause')?.closest('button');
    const resetBtn = panel.querySelector('button .bi-arrow-clockwise')?.closest('button');
    if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); startTimer(); });
    if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); pauseTimer(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetTimer(); });
});

// Navigation functionality
const navLinks = document.querySelectorAll('.main-nav .nav-link');
const sectionContent = document.getElementById('section-content');

const contentMap = {
    summary: '<h5><strong>Summary</strong></h5><p>This is where the summary will appear...</p>',
    flashcards: '<h5><strong>Flashcards</strong></h5><p>Generated flashcards go here.</p>',
    workbook: '<h5><strong>Workbook</strong></h5><p>Workbook content and exercises go here.</p>',
    quizzes: '<h5><strong>Quizzes</strong></h5><p>Questions here related to the document.</p>',
    ai: '<h5><strong>AI Assistant</strong></h5><p>Interact with the AI here.</p>'
};

navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        navLinks.forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        const section = this.getAttribute('data-section');
        sectionContent.innerHTML = contentMap[section] || '';
    });
});

function handleFileSelection(input) {
    const fileInfo = document.getElementById('file-info');
    if (input.files.length > 0) {
        const file = input.files[0];
        const name = file.name.toLowerCase();
        const isImage = (/\.(png|jpg|jpeg|gif)$/i).test(name) || (file.type && file.type.startsWith('image/'));
        const icon = isImage ? 'image' : 'file-text';
        const label = isImage ? 'Image' : 'Document';
        fileInfo.innerHTML = `
                    <div class="d-flex align-items-center justify-content-between">
                        <div>
                            <i class="bi bi-${icon} me-2"></i>
                            <strong>${file.name}</strong> (${formatFileSize(file.size)})
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm">
                            Process ${label}
                        </button>
                    </div>`;
        fileInfo.classList.add('show');
    } else {
        fileInfo.innerHTML = '';
        fileInfo.classList.remove('show');
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetUpload() {
    setLeftView('upload');

    // Reset form and info
    document.getElementById('file-info').innerHTML = '';
    document.getElementById('file-info').classList.remove('show');
    document.getElementById('file-upload').value = '';
    // No separate image input anymore
}

function toggleTextInput() {
    const manualText = document.getElementById('manual-text');
    const isHidden = manualText && manualText.style.display === 'none';
    setLeftView(isHidden ? 'manual' : 'upload');
}

function submitManualText() {
    const textArea = document.querySelector('#manual-text textarea');
    const contentDisplay = document.getElementById('content-display');
    const manualText = document.getElementById('manual-text');
    const fileDisplayContainer = document.getElementById('file-display-container');

    if (textArea.value.trim() !== '') {
        const fileNameDisplay = document.querySelector('.filename-display');
        if (fileNameDisplay) {
            fileNameDisplay.textContent = 'Manual Text';
        }
        contentDisplay.textContent = textArea.value;

        // Hide manual text input
        manualText.style.display = 'none';
        // Show file display container
        fileDisplayContainer.style.display = 'flex';

        // Update word count and format text
        updateWordCount();
        formatDisplayedText();
    } else {
        alert('Please enter some text before submitting.');
    }
}

function formatDisplayedText() {
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) {
        let text = contentDisplay.textContent || contentDisplay.innerText;
        if (text) {
            // Replace multiple newlines with paragraph breaks
            text = text.replace(/\n\s*\n/g, '</p><p>');
            // Replace single newlines with line breaks
            text = text.replace(/\n/g, '<br>');
            // Wrap in paragraphs if not already wrapped
            if (!text.startsWith('<p>')) {
                text = '<p>' + text + '</p>';
            }
            contentDisplay.innerHTML = text;
        }
    }
}

function formatTextWithLineBreaks(text) {
    return text.replace(/\n/g, '<br>');
}

function showUploadedFile(filename, content) {
    const fileDisplay = document.getElementById('file-display-container');
    const fileNameDisplay = document.querySelector('.filename-display');
    const contentDisplay = document.getElementById('content-display');

    if (fileNameDisplay) {
        fileNameDisplay.textContent = filename;
    }
    contentDisplay.innerHTML = formatTextWithLineBreaks(content);
    fileDisplay.style.display = 'flex';
    document.getElementById('upload-container').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const fileDisplayContainer = document.getElementById('file-display-container');
    const contentDisplay = document.getElementById('content-display');
    const uploadedSection = document.getElementById('uploaded-files-section');

    if (fileDisplayContainer.style.display === 'flex' && contentDisplay) {
        if (uploadedSection) uploadedSection.style.display = 'none';
        formatDisplayedText();
        updateWordCount();
    }
});

let currentFontSize = 1.1;
let currentLineHeight = 1.8;
let isDarkMode = false;
let isReadingMode = false;

function adjustFontSize(action) {
    const contentText = document.querySelector('.content-text');
    if (action === 'increase' && currentFontSize < 1.5) {
        currentFontSize += 0.1;
    } else if (action === 'decrease' && currentFontSize > 0.8) {
        currentFontSize -= 0.1;
    }
    contentText.style.fontSize = `${currentFontSize}rem`;
}

function toggleLineHeight() {
    const contentText = document.querySelector('.content-text');
    currentLineHeight = currentLineHeight === 1.8 ? 2.2 : 1.8;
    contentText.style.lineHeight = currentLineHeight;
}

function updateWordCount() {
    const contentDisplay = document.getElementById('content-display');
    const wordCountElement = document.getElementById('word-count');
    if (contentDisplay && wordCountElement) {
        const text = contentDisplay.textContent || '';
        const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

        // Animate the word count
        const currentCount = parseInt(wordCountElement.textContent.split(' ')[0]) || 0;
        animateNumber(currentCount, wordCount, (count) => {
            wordCountElement.innerHTML = `<i class="bi bi-hash me-1"></i>${count} words`;
        });
        updateReadTime(wordCount);
    }
}

function updateReadTime(wordCount) {
    const readTimeElement = document.getElementById('read-time');
    const minutes = Math.ceil(wordCount / 200);
    readTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${minutes} min read`;
}

function animateNumber(start, end, callback) {
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * progress);
        callback(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function downloadContent() {
    const content = document.getElementById('content-display').textContent;
    const fileNameDisplay = document.querySelector('.filename-display');
    const filename = fileNameDisplay ? fileNameDisplay.textContent : 'document.txt';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

function shareContent() {
    if (navigator.share) {
        const fileNameDisplay = document.querySelector('.filename-display');
        const filename = fileNameDisplay ? fileNameDisplay.textContent : 'Document';
        navigator.share({
            title: filename,
            text: document.getElementById('content-display').textContent,
        }).catch(console.error);
    }
}

function toggleDarkMode() {
    const contentWrapper = document.getElementById('content-wrapper');
    isDarkMode = !isDarkMode;
    contentWrapper.classList.toggle('dark-mode');
}

function toggleReadingMode() {
    const contentDisplay = document.getElementById('content-display');
    isReadingMode = !isReadingMode;
    contentDisplay.classList.toggle('reading-mode');
}

function setTextAlign(alignment) {
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) contentDisplay.style.textAlign = alignment;

    // Update active state of alignment buttons
    document.querySelectorAll('.controls-bar .btn-group:first-child .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Find the button by its onclick signature
    const selector = `.controls-bar .btn-group:first-child button[onclick="setTextAlign('${alignment}')"]`;
    const btn = document.querySelector(selector);
    if (btn) btn.classList.add('active');
}

// Function to open uploaded files
function openFile(fileId) {
    // Switch to viewer mode
    setLeftView('viewer');
    // Show loading state
    const fileDisplayContainer = document.getElementById('file-display-container');
    const contentDisplay = document.getElementById('content-display');
    const fileNameDisplay = document.querySelector('.filename-display');

    if (contentDisplay && fileNameDisplay) {
        fileNameDisplay.textContent = 'Loading...';
        contentDisplay.innerHTML = '<div class="text-center p-4"><i class="bi bi-hourglass-split text-primary" style="font-size: 2rem;"></i><p class="mt-2">Loading file content...</p></div>';
    }

    // Make AJAX call to get file content
    const url = `${(window.DASHBOARD_CFG && window.DASHBOARD_CFG.getFileContentUrl ? window.DASHBOARD_CFG.getFileContentUrl : '/Dashboard/GetFileContent')}?fileId=${fileId}`;
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin' // ensure cookies/session are sent
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to load file');
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to load file');
            }

            // Update the display
            if (contentDisplay && fileNameDisplay) {
                fileNameDisplay.textContent = data.fileName;

                if (data.displayType === 'image') {
                    contentDisplay.innerHTML = `<div class="text-center p-4"><img src="${data.content}" alt="${data.fileName}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>`;
                } else if (data.displayType === 'pdf') {
                    // Inline PDF using iframe
                    contentDisplay.innerHTML = `
                        <div class="p-2" style="height: calc(100vh - 260px);">
                            <iframe src="${data.content}#view=fitH" style="width:100%; height:100%; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"></iframe>
                        </div>`;
                } else if (data.displayType === 'text') {
                    contentDisplay.innerHTML = formatTextWithLineBreaks(data.content || '');
                    if (data.truncated) {
                        const notice = document.createElement('div');
                        notice.className = 'text-muted small mt-2';
                        notice.innerHTML = '<i class="bi bi-info-circle me-1"></i>Displayed content is truncated for performance.';
                        contentDisplay.parentElement.appendChild(notice);
                    }
                } else {
                    contentDisplay.innerHTML = `<div class="text-center p-4"><p class="text-muted">${data.content || 'Preview not available for this file type.'}</p></div>`;
                }

                // Update word count if function exists
                if (typeof updateWordCount === 'function') {
                    updateWordCount();
                }
                // Track as recent
                try { addRecentFile(fileId, data.fileName); } catch (_) { }
            }
        })
        .catch(error => {
            console.error('Error loading file:', error);
            if (contentDisplay && fileNameDisplay) {
                fileNameDisplay.textContent = 'Error Loading File';
                contentDisplay.innerHTML = `<div class="text-center p-4 text-danger"><i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i><p class="mt-2">${error.message || 'Failed to load file content'}</p></div>`;
            }
        });
}

// ===== Recent files (localStorage) =====
const RECENT_KEY = 'adhd_recent_files';
const RECENT_MAX = 10;

function getRecentFiles() {
    try {
        const raw = localStorage.getItem(RECENT_KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) return arr;
    } catch (_) { }
    return [];
}

function saveRecentFiles(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (_) { }
}

function addRecentFile(id, name) {
    const now = Date.now();
    let list = getRecentFiles().filter(x => x && typeof x.id === 'number');
    // Remove if exists
    list = list.filter(x => x.id !== id);
    // Add to front
    list.unshift({ id, name, ts: now });
    // Trim
    if (list.length > RECENT_MAX) list = list.slice(0, RECENT_MAX);
    saveRecentFiles(list);
}

// Show only recent files in the left list
function showRecentFiles() {
    setLeftView('files');
    const uploadedSection = document.getElementById('uploaded-files-section');
    const grid = uploadedSection ? uploadedSection.querySelector('.files-grid') : null;
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl) titleEl.textContent = 'Your Recent Files';
    if (!grid) return;
    const recent = getRecentFiles();
    // If no recent, show all (fallback)
    if (!Array.isArray(recent) || recent.length === 0) {
        Array.from(grid.children).forEach(card => card.style.display = '');
        return;
    }

    // Sort recent by timestamp desc just in case
    const sorted = [...recent]
        .filter(r => r && typeof r.id === 'number')
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // Build a map from file id to card element
    const cardMap = new Map();
    Array.from(grid.children).forEach(card => {
        const idAttr = card.getAttribute('data-file-id');
        const id = idAttr ? parseInt(idAttr) : NaN;
        if (!Number.isNaN(id)) {
            cardMap.set(id, card);
        }
    });

    // Reorder DOM: append recent cards in sorted order and show them
    sorted.forEach(item => {
        const card = cardMap.get(item.id);
        if (card) {
            card.style.display = '';
            // Append moves the node to the end, effectively reordering
            grid.appendChild(card);
        }
    });

    // Hide non-recent cards
    cardMap.forEach((card, id) => {
        if (!sorted.find(r => r.id === id)) {
            card.style.display = 'none';
        }
    });
}

// Global: handle selection checkbox on file cards
function onFileCheckboxChange(checkbox) {
    const idAttr = checkbox.getAttribute('data-file-id');
    const id = idAttr ? parseInt(idAttr) : NaN;
    if (Number.isNaN(id)) return;

    const card = checkbox.closest('.file-card');
    if (checkbox.checked) {
        SELECTED_FILE_IDS.add(id);
        if (card) card.classList.add('selected');
    } else {
        SELECTED_FILE_IDS.delete(id);
        if (card) card.classList.remove('selected');
    }
}

// Global: delete selected files
function deleteSelectedFiles() {
    if (SELECTED_FILE_IDS.size === 0) {
        alert('Please select at least one file to delete.');
        return;
    }
    if (!confirm('Delete selected file(s)? This action cannot be undone.')) {
        return;
    }

    const ids = Array.from(SELECTED_FILE_IDS);
    fetch('/Dashboard/DeleteFiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(ids)
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Delete failed');
            ids.forEach(id => {
                const card = document.querySelector(`.file-card[data-file-id="${id}"]`);
                if (card && card.parentElement) card.parentElement.removeChild(card);
            });
            SELECTED_FILE_IDS.clear();
            const grid = document.querySelector('.files-grid');
            if (!grid || grid.children.length === 0) {
                window.location.reload();
            }
        })
        .catch(err => {
            console.error('Delete error:', err);
            alert('Failed to delete files.');
        });
}

// Initialize tooltips
document.addEventListener('DOMContentLoaded', function () {
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const dm = document.getElementById('setting-darkmode');
    if (dm) {
        const wrapper = document.getElementById('content-wrapper');
        dm.checked = !!(wrapper && wrapper.classList.contains('dark-mode'));
        dm.addEventListener('change', function () { toggleDarkMode(); });
    }
});

// ===== Network/Friend Request Functions =====

/**
 * Unified friend request function that handles both modal and inline forms
 * @param {Object} config - Configuration object
 * @param {string} config.inputId - ID of the input element
 * @param {string} config.feedbackId - ID of the feedback element
 * @param {string} config.buttonId - ID of the submit button
 * @param {string} config.modalId - ID of the modal to close on success (optional)
 * @param {string} config.panelId - ID of the panel to toggle on success (optional)
 * @param {boolean} config.enableSearch - Whether to enable user search (default: false)
 */
function sendFriendRequest(config) {
    const input = document.getElementById(config.inputId);
    const feedback = document.getElementById(config.feedbackId);
    const button = document.getElementById(config.buttonId);

    if (!input) {
        console.error(`Friend request: input element '${config.inputId}' not found`);
        return;
    }

    const val = (input.value || '').trim();
    const id = parseInt(val, 10);

    if (!val || (Number.isNaN(id) && val.length < 2)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid User ID or start typing a name to search.';
            feedback.className = 'small text-danger';
        }
        return;
    }

    (async () => {
        try {
            if (button) {
                button.disabled = true;
                button.textContent = 'Sending...';
            }
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'small';
            }

            const response = await fetch('/Friends/Send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ addresseeId: id })
            });

            let data;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                const msg = data?.error || `Request failed with status ${response.status}`;
                throw new Error(msg);
            }

            if (!data || data.success !== true) {
                const msg = (data && data.error) ? data.error : 'Request failed';
                throw new Error(msg);
            }

            if (feedback) {
                feedback.textContent = 'Request sent successfully.';
                feedback.className = 'small text-success';
            }
            if (button) button.textContent = 'Sent';

            // Handle success callback
            if (config.modalId) {
                setTimeout(() => {
                    try {
                        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(config.modalId));
                        modal.hide();
                    } catch { }
                }, 700);
            } else if (config.panelId) {
                setTimeout(() => {
                    try {
                        toggleInlinePanel(config.panelId);
                    } catch { }
                }, 700);
            }

        } catch (err) {
            console.error('Friend request error:', err);
            if (feedback) {
                feedback.textContent = err?.message || 'Failed to send request';
                feedback.className = 'small text-danger';
            }
            if (button) {
                button.disabled = false;
                button.textContent = 'Send Request';
            }
        }
    })();
}

// Modal friend request handler
function sendFriendRequestModal() {
    sendFriendRequest({
        inputId: 'addresseeIdInput',
        feedbackId: 'add-network-feedback',
        buttonId: 'send-friend-request-btn',
        modalId: 'addNetworkModal',
        enableSearch: true
    });
}

// Inline friend request handler
function sendFriendRequestInline() {
    sendFriendRequest({
        inputId: 'addresseeIdInlineInput',
        feedbackId: 'add-network-inline-feedback',
        buttonId: 'send-friend-request-inline-btn',
        panelId: 'network-add-panel'
    });
}

/**
 * Initialize user search functionality for friend requests
 * @param {string} inputId - ID of the input element
 */
function initializeUserSearch(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    let searchTimeout;

    input.addEventListener('input', function (e) {
        const query = e.target.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 2) {
            hideSearchResults();
            return;
        }

        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/Friends/SearchUsers?query=${encodeURIComponent(query)}`, {
                    credentials: 'same-origin'
                });
                const data = await response.json();

                if (data.success && data.users.length > 0) {
                    showSearchResults(data.users, input);
                } else {
                    hideSearchResults();
                }
            } catch (err) {
                console.error('Search error:', err);
                hideSearchResults();
            }
        }, 300);
    });
}

/**
 * Display search results for user selection
 * @param {Array} users - Array of user objects
 * @param {HTMLElement} input - Input element to attach results to
 */
function showSearchResults(users, input) {
    hideSearchResults(); // Remove any existing results

    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'search-results-container';
    resultsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
    `;

    users.forEach(user => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        `;
        item.innerHTML = `
            <div><strong>${escapeHtml(user.fullName)}</strong></div>
            <div class="text-muted small">${escapeHtml(user.email)}</div>
        `;
        item.addEventListener('click', () => {
            input.value = user.id;
            hideSearchResults();
            input.focus();
        });
        resultsContainer.appendChild(item);
    });

    input.parentElement.appendChild(resultsContainer);
    input.parentElement.classList.add('has-search-results');
}

/**
 * Hide all search result containers
 */
function hideSearchResults() {
    document.querySelectorAll('.search-results-container').forEach(el => el.remove());
    document.querySelectorAll('.has-search-results').forEach(el => el.classList.remove('has-search-results'));
}

/**
 * HTML escape utility function
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Global function invoked by button onclick for Classes only
function openClassesInlinePanel(event) {
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        toggleInlinePanel('classes-panel', event);

        const panel = document.getElementById('classes-panel');
        if (!panel) return;

        const classesList = document.getElementById('classes-list');
        const joinBtn = document.getElementById('classes-join-btn');
        const joinInput = document.getElementById('classes-join-code');
        const addClassBtn = document.getElementById('classes-add-btn');
        const addClassInput = document.getElementById('classes-add-name');

        const loadClasses = async () => {
            if (!classesList) return;
            classesList.innerHTML = '<li class="list-group-item small text-muted">Loading...</li>';
            try {
                const res = await fetch('/Classes/My', { credentials: 'same-origin' });
                const data = await res.json();
                if (!data.success) throw new Error(data.error || 'Failed to load classes');
                if (!Array.isArray(data.classes) || data.classes.length === 0) {
                    classesList.innerHTML = '<li class="activity-item small text-muted"><i class="bi bi-collection me-2"></i> No classes yet.</li>';
                    return;
                }
                classesList.innerHTML = '';
                data.classes.forEach(c => {
                    const li = document.createElement('li');
                    li.className = 'activity-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `<div class="d-inline-flex align-items-center gap-2 text-truncate">
                        <div class="avatar-initial"><i class=\"bi bi-collection\"></i></div>
                        <div class="text-truncate"><div><strong>${escapeHtml(c.name)}</strong></div>
                        <div class="small text-muted">Code: <span class="code-chip">${escapeHtml(c.code)}</span></div></div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline-secondary" data-action="copy-code" data-code="${escapeHtml(c.code)}" title="Copy Code"><i class="bi bi-clipboard"></i></button>
                    </div>`;
                    classesList.appendChild(li);
                });
                // bind copy buttons
                classesList.querySelectorAll('[data-action="copy-code"]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const code = btn.getAttribute('data-code');
                        try {
                            await navigator.clipboard.writeText(code);
                            btn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
                            setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1200);
                        } catch (_) {
                            alert('Failed to copy');
                        }
                    });
                });
            } catch (err) {
                console.error('Load classes error', err);
                classesList.innerHTML = '<li class="list-group-item small text-danger">Failed to load classes.</li>';
            }
        };

        // initial load
        loadClasses();

        if (joinBtn && joinInput) {
            joinBtn.onclick = async (e) => {
                e.preventDefault();
                const code = (joinInput.value || '').trim();
                if (!code) { alert('Enter join code'); return; }
                try {
                    joinBtn.disabled = true;
                    const res = await fetch('/Classes/Join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ code }) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Failed to join');
                    joinInput.value = '';
                    await loadClasses();
                } catch (err) {
                    alert(err?.message || 'Failed to join class');
                } finally {
                    joinBtn.disabled = false;
                }
            };
        }

        if (addClassBtn && addClassInput) {
            addClassBtn.onclick = async (e) => {
                e.preventDefault();
                const name = (addClassInput.value || '').trim();
                if (!name) { alert('Enter class name'); return; }
                try {
                    addClassBtn.disabled = true;
                    const res = await fetch('/Classes/Create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Failed to create');
                    addClassInput.value = '';
                    await loadClasses();
                } catch (err) {
                    alert(err?.message || 'Failed to create class');
                } finally {
                    addClassBtn.disabled = false;
                }
            };
        }
    } catch (e) {
        console.error('openClassesInlinePanel error', e);
    }
}

// Global function invoked by button onclick
function openAddNetworkModal() {
    try {
        // Close any open dropdowns so modal isn't obscured by high z-index menus
        document.querySelectorAll('.dropdown-menu.show').forEach(openDropdown => {
            openDropdown.classList.remove('show');
            // Clear inline styles applied by toggleDropdown()
            openDropdown.style.position = '';
            openDropdown.style.top = '';
            openDropdown.style.left = '';
            openDropdown.style.right = '';
            openDropdown.style.transform = '';
            openDropdown.style.zIndex = '';
            openDropdown.style.maxHeight = '';
            openDropdown.style.overflow = '';
        });

        const modalEl = document.getElementById('addNetworkModal');
        if (!modalEl) return;
        const feedback = document.getElementById('add-network-feedback');
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'small';
        }
        const input = document.getElementById('addresseeIdInput');
        if (input) input.value = '';
        // Reset send button state
        const sendBtn = document.getElementById('send-friend-request-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Request';
        }
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } catch (e) { console.error('Failed to open Add Network modal', e); }
}

document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('send-friend-request-btn');
    const form = document.getElementById('add-network-form');
    const handler = async function (evt) {
        if (evt) evt.preventDefault();
        sendFriendRequestModal();
    };
    if (sendBtn) sendBtn.addEventListener('click', handler);
    if (form) form.addEventListener('submit', handler);
});

document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('send-friend-request-inline-btn');
    const handler = async function (evt) {
        if (evt) evt.preventDefault();
        const input = document.getElementById('addresseeIdInlineInput');
        const feedback = document.getElementById('add-network-inline-feedback');
        const sendBtnRef = document.getElementById('send-friend-request-inline-btn');
        if (!input) {
            console.error('Inline Add Network: input element missing');
            return;
        }
        const val = (input.value || '').trim();
        const id = parseInt(val, 10);

        if (!val || (Number.isNaN(id) && val.length < 2)) {
            if (feedback) {
                feedback.textContent = 'Please enter a valid User ID or start typing a name to search.';
                feedback.className = 'small text-danger';
            }
            return;
        }

        try {
            if (sendBtnRef) { sendBtnRef.disabled = true; sendBtnRef.textContent = 'Sending...'; }
            if (feedback) { feedback.textContent = ''; feedback.className = 'small'; }

            const res = await fetch('/Friends/Send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ addresseeId: id })
            });
            let data;
            try { data = await res.json(); } catch { data = null; }

            if (!res.ok) {
                const msg = data?.error || `Request failed with status ${res.status}`;
                throw new Error(msg);
            }

            if (!data || data.success !== true) {
                const msg = (data && data.error) ? data.error : 'Request failed';
                throw new Error(msg);
            }

            if (feedback) {
                feedback.textContent = 'Request sent successfully.';
                feedback.className = 'small text-success';
            }
            if (sendBtnRef) sendBtnRef.textContent = 'Sent';

            setTimeout(() => {
                try {
                    toggleInlinePanel('network-add-panel');
                } catch { }
            }, 700);
        } catch (err) {
            console.error('Inline friend request error:', err);
            if (feedback) {
                feedback.textContent = err?.message || 'Failed to send request';
                feedback.className = 'small text-danger';
            }
            if (sendBtnRef) { sendBtnRef.disabled = false; sendBtnRef.textContent = 'Send Request'; }
        }
    };
    if (sendBtn) sendBtn.addEventListener('click', handler);
});

// Initialize notifications
let notifications = [];

// Toggle notifications panel
function toggleNotificationsPanel(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    toggleInlinePanel('notifications-panel', event);
    renderNotifications();
}

// Update notification badge in the connections menu
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.user-dropdown.me-3.combined-icon .notification-badge');
    if (badge) {
        badge.textContent = unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : '';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    return unreadCount;
}

// Render notifications in the notifications panel
function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-bell-slash fs-1"></i>
                <p class="mt-2 mb-0">No notifications yet.</p>
            </div>
        `;
    } else {
        container.innerHTML = notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''} p-3 border-bottom" 
                 data-id="${notification.id}" 
                 onclick="markAsRead('${notification.id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="me-3">
                        <h6 class="mb-1">${escapeHtml(notification.title)}</h6>
                        <p class="mb-1 small text-muted">${escapeHtml(notification.message)}</p>
                        <small class="text-muted">${formatTimeAgo(notification.date)}</small>
                    </div>
                    ${!notification.read ? '<span class="badge bg-primary">New</span>' : ''}
                </div>
            </div>
        `).join('');

        // Add a view all link if there are more than 10 notifications
        if (notifications.length > 10) {
            container.innerHTML += `
                <div class="text-center mt-2">
                    <a href="#" class="small" onclick="event.preventDefault();return false;">
                        View all ${notifications.length} notifications
                    </a>
                </div>
            `;
        }
    }

    // Update the notification badge
    updateNotificationBadge();
}

// Mark notification as read
function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
    }
}

// Add a new notification
function addNotification(title, message, type = 'info') {
    const newNotification = {
        id: 'notif-' + Date.now(),
        title,
        message,
        type,
        read: false,
        date: new Date().toISOString()
    };

    notifications.unshift(newNotification);
    updateNotificationBadge();
    renderNotifications();

    // Show toast notification
    showNotificationToast(title, message, type);
}

// Format time as "X time ago"
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';

    return 'just now';
}

// Toggle Network panel
function toggleNetworkPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('network-panel');
    if (!panel) return;

    // Toggle the panel
    const isShowing = !panel.classList.contains('d-none');
    
    // Hide all other panels first
    document.querySelectorAll('.dropdown-menu.enhanced-dropdown').forEach(menu => {
        if (menu.id !== 'network-panel') {
            menu.classList.add('d-none');
        }
    });

    // Toggle current panel
    if (isShowing) {
        panel.classList.add('d-none');
    } else {
        panel.classList.remove('d-none');
        positionPanel(panel, event);
    }
}

// Position panel relative to the button
function positionPanel(panel, event) {
    if (!event) return;
    
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Position to the left of the button
    panel.style.left = 'auto';
    panel.style.right = (viewportWidth - buttonRect.left) + 'px';
    
    // Adjust vertical position to keep within viewport
    if (buttonRect.top + panel.offsetHeight > viewportHeight) {
        panel.style.top = 'auto';
        panel.style.bottom = '0px';
    } else {
        panel.style.top = buttonRect.top + 'px';
        panel.style.bottom = 'auto';
    }
}

// Close panel when clicking outside
document.addEventListener('click', function(event) {
    const panel = document.getElementById('network-panel');
    const button = document.querySelector('[onclick*="toggleNetworkPanel"]');
    
    if (panel && !panel.contains(event.target) && button && !button.contains(event.target)) {
        panel.classList.add('d-none');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Add click handler for Network button
    const networkBtn = document.querySelector('[onclick*="toggleNetworkPanel"]');
    if (networkBtn) {
        networkBtn.addEventListener('click', toggleNetworkPanel);
    }
    
    // Load any saved notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
        notifications = JSON.parse(savedNotifications);
    }

    updateNotificationBadge();
    renderNotifications();

    // Save notifications to localStorage when page unloads
    window.addEventListener('beforeunload', () => {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    });
});

// Example: Add a test notification
// addNotification('New Message', 'You have a new message from John', 'info');