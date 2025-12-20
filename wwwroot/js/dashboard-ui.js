// UI Utilities, Timer, File Management, Calculator, Notifications

// ==========================================
// UTILITIES
// ==========================================
window.safeExecute = function (fn) {
    try {
        fn();
    } catch (e) {
        console.error('Safe execution error:', e);
    }
};

window.safeStorage = {
    get: function (key, defaultVal) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : defaultVal;
        } catch (e) {
            console.warn('Storage read error:', e);
            return defaultVal;
        }
    },
    set: function (key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.warn('Storage write error:', e);
        }
    }
};

window.escapeHtml = function (text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

window.formatFileSize = function (bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

window.formatTimeAgo = function (dateString) {
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
};


// ==========================================
// UI INTERACTION (Dropdowns & Panels)
// ==========================================
const DROPDOWN_ANCHORS = {};

window.toggleDropdown = function (id, evt) {
    if (evt) evt.stopPropagation();
    const dropdown = document.getElementById(`${id}-dropdown`);
    if (!dropdown) return;

    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu.id !== `${id}-dropdown`) {
            menu.classList.remove('show');
        }
    });

    dropdown.classList.toggle('show');

    // Smart positioning
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
                dropdown.style.left = 'auto';
                dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
                dropdown.style.transform = 'none';
                dropdown.style.zIndex = 1200;
                dropdown.style.maxHeight = '70vh';
                dropdown.style.overflow = 'visible';
            } else {
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
};

window.toggleInlinePanel = function (panelId, event, ownerHint) {
    if (event) event.stopPropagation();

    if (panelId === 'tools-calculator-panel') {
        const focusDd0 = document.getElementById('focus-dropdown');
        if (focusDd0) focusDd0.classList.remove('show');
        document.querySelectorAll('.dropdown-menu.inline-left-from-focus.show').forEach(p => p.classList.remove('show'));
    }
    const panel = document.getElementById(panelId);
    if (!panel) return;

    document.querySelectorAll('.dropdown-menu.inline-left.show, .dropdown-menu.inline-left-from-focus.show, .dropdown-menu.inline-left-from-tools.show, .dropdown-menu.inline-left-from-network.show, .dropdown-menu.inline-left-from-user.show')
        .forEach(p => { if (p.id !== panelId) p.classList.remove('show'); });

    const willShow = !panel.classList.contains('show');

    if (willShow && panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }

    panel.classList.toggle('show');

    if (willShow && panel.classList.contains('show')) {
        let ownerId = ownerHint || null;
        if (!ownerId && (panelId === 'tools-calculator-panel' || panelId.startsWith('tools-') || panel.classList.contains('inline-left-from-tools'))) {
            ownerId = 'tools-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-user') || panelId.startsWith('profile') || panelId.startsWith('classes') || panelId.startsWith('messages') || panelId.startsWith('notifications'))) {
            ownerId = 'user-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-network') || panelId.startsWith('network-'))) {
            ownerId = 'network-notifications-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-focus') || panelId.startsWith('focus-'))) {
            ownerId = 'focus-dropdown';
        }

        const owner = ownerId ? document.getElementById(ownerId) : null;
        if (owner) {
            document.querySelectorAll('.dropdown-menu.show').forEach(dd => {
                const isClassDetails = dd.id === 'class-details-panel';
                const isOpeningChild = (panelId === 'cls-members-panel' || panelId === 'cls-files-panel');
                if (dd.id !== ownerId && dd !== panel && !(isClassDetails && isOpeningChild)) dd.classList.remove('show');
            });
            if (!owner.classList.contains('show')) owner.classList.add('show');

            if (panelId === 'tools-calculator-panel') {
                const focusDd = document.getElementById('focus-dropdown');
                if (focusDd) focusDd.classList.remove('show');
            }

            const anchorRect = owner.getBoundingClientRect();
            panel.style.position = 'fixed';
            const panelWidth = parseInt(panel.getAttribute('data-width') || '300', 10);

            let referenceRect = anchorRect;

            if (panelId === 'class-details-panel') {
                const classesPanel = document.getElementById('classes-panel');
                if (classesPanel && classesPanel.classList.contains('show')) {
                    referenceRect = classesPanel.getBoundingClientRect();
                }
            }
            else if ((panelId === 'cls-members-panel' || panelId === 'cls-files-panel')) {
                const classDetailsPanel = document.getElementById('class-details-panel');
                if (classDetailsPanel && classDetailsPanel.classList.contains('show')) {
                    referenceRect = classDetailsPanel.getBoundingClientRect();
                }
            }

            const GAP_X = 20;
            const GAP_Y = 12;
            const SCREEN_MARGIN = 8;
            panel.style.top = `${Math.max(SCREEN_MARGIN, referenceRect.top + GAP_Y)}px`;

            const desiredLeft = referenceRect.left - panelWidth - GAP_X;
            const left = Math.max(SCREEN_MARGIN, Math.min(desiredLeft, window.innerWidth - panelWidth - SCREEN_MARGIN));
            panel.style.left = `${left}px`;
            panel.style.right = 'auto';

            panel.style.width = `${panelWidth}px`;
            panel.style.transform = 'none';
            panel.style.zIndex = 2000;
            panel.style.maxHeight = '85vh';
            panel.style.overflow = 'auto';
            panel.style.maxWidth = `${Math.min(520, window.innerWidth - 16)}px`;
            panel.style.minWidth = '';
        }
    } else {
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
};

['resize', 'scroll'].forEach(evtName => {
    window.addEventListener(evtName, () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
            // Basic repositioning logic if needed, but 'toggleDropdown' handles most
        });
    });
});

window.onclick = function (event) {
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
};

window.hideAllRightContainers = function () {
    const containers = [
        'summary-display-container',
        'flashcards-display-container',
        'whiteboard-display-container',
        'notes-display-container',
        'quizzes-display-container',
        'video-player-container',
        'audio-player-container'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const genWrapper = document.getElementById('generate-wrapper');
    const genOptions = document.getElementById('generate-options');
    if (genWrapper) genWrapper.style.display = 'flex';
    if (genOptions) genOptions.style.display = '';
};


// ==========================================
// CENTRAL LEFT VIEW MANAGER (Files)
// ==========================================
// ==========================================
// CENTRAL LEFT VIEW MANAGER (Files)
// ==========================================

// --- State for Groups ---
window.FILE_GROUPS = {};
window.CURRENT_GROUP_VIEW = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Load groups from SERVER
    if (window.fetchGroupsFromServer) {
        window.fetchGroupsFromServer();
    }
    // Initial render call (will be empty until fetch completes, or shows cached)
    if (window.renderGroupsUI) window.renderGroupsUI();
});

window.fetchGroupsFromServer = async function () {
    try {
        const res = await fetch('/Dashboard/GetGroups', { credentials: 'same-origin' });
        const data = await res.json();
        if (data.success) {
            window.FILE_GROUPS = data.groups || {};
            if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);
            window.renderGroupsUI();
        }
    } catch (e) { console.error("Failed to fetch groups", e); }
};

window.saveGroupToServer = async function (name, fileIds) {
    try {
        await fetch('/Dashboard/SaveGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name, fileIds })
        });
    } catch (e) { console.error("Failed to save group", e); }
};

window.deleteGroupFromServer = async function (name) {
    try {
        await fetch('/Dashboard/DeleteGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name })
        });
    } catch (e) { console.error("Failed to delete group", e); }
};

window.showRecentFiles = function () {
    window.showMyFiles();
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl) titleEl.textContent = 'Recent Files';
};

window.setLeftView = function (mode) {
    const uploadContainer = document.getElementById('upload-container');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const manualText = document.getElementById('manual-text');
    const uploadedSection = document.getElementById('uploaded-files-section');
    const leftTopActions = document.getElementById('left-top-actions');

    if (uploadContainer) uploadContainer.style.display = (mode === 'upload') ? 'flex' : 'none';
    if (fileDisplayContainer) fileDisplayContainer.style.display = (mode === 'viewer' || mode === 'write') ? 'flex' : 'none';
    if (manualText) manualText.style.display = (mode === 'manual') ? 'block' : 'none';
    if (uploadedSection) uploadedSection.style.display = (mode === 'files') ? 'block' : 'none';

    // Hide top actions (upload buttons) in viewer/write mode so it takes full height
    if (leftTopActions) {
        if (mode === 'viewer' || mode === 'write') {
            leftTopActions.style.display = 'none';
        } else {
            // Show only if not explicitly hidden by other logic? 
            // Ideally we want it shown in 'files' mode or 'upload' mode.
            // The original code implies it's always there unless hidden.
            leftTopActions.style.display = '';
        }
    }

    const body = document.body;
    if (body) {
        body.classList.remove('mode-upload', 'mode-viewer', 'mode-manual', 'mode-files', 'mode-manage-files', 'mode-write');
        body.classList.add(`mode-${mode}`);
    }
    const manageBar = document.getElementById('files-manage-bar');
    if (manageBar) {
        if (mode === 'files' || mode === 'manage-files') {
            manageBar.style.display = 'flex';
        } else {
            manageBar.style.display = 'none';
        }
    }
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl && mode === 'files') titleEl.textContent = 'Your Recent Files';
};

window.resetUpload = function () {
    // Clear content first
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) {
        contentDisplay.innerHTML = '';
        contentDisplay.contentEditable = "false";
    }
    const fnDisplay = document.querySelector('.filename-display');
    if (fnDisplay) fnDisplay.textContent = "";

    // Ensure manual text input is reset if we used it
    const txt = document.getElementById('manual-text')?.querySelector('textarea');
    if (txt) txt.value = '';

    // Check where we came from
    if (window.__viewerSource === 'main') {
        // Go back to files list view
        window.setLeftView('files');

        // Show left-top-actions and uploaded-files-section
        const leftTopActions = document.getElementById('left-top-actions');
        if (leftTopActions) leftTopActions.style.display = '';

        const uploadedSection = document.getElementById('uploaded-files-section');
        if (uploadedSection) uploadedSection.style.display = 'block';

        return;
    }

    // Coming from file list - use setLeftView for consistency
    window.setLeftView('files');
    window.renderGroupsUI();
};

window.showMyFiles = function () {
    try {
        const body = document.body;
        if (body) {
            body.classList.remove('mode-upload', 'mode-viewer', 'mode-manual', 'mode-files');
            body.classList.add('mode-manage-files');
        }
        const viewer = document.getElementById('file-display-container');
        const uploadedSection = document.getElementById('uploaded-files-section');
        const topActions = document.getElementById('left-top-actions');
        const manageBar = document.getElementById('files-manage-bar');
        const titleEl = document.getElementById('uploaded-files-title-text');

        if (viewer) viewer.style.display = 'none';
        if (uploadedSection) uploadedSection.style.display = 'block';
        if (topActions) topActions.style.display = 'none';

        if (manageBar) manageBar.style.display = 'flex';

        // Reset view to root
        window.CURRENT_GROUP_VIEW = null;
        window.renderGroupsUI();

    } catch (e) { console.error(e); }
};

window.renderGroupsUI = function () {
    const titleEl = document.getElementById('uploaded-files-title-text');
    const btnBack = document.querySelector('#files-manage-bar .btn-back');
    const btnGroup = document.getElementById('btn-group-files');
    const btnDeleteGroup = document.getElementById('btn-delete-group');
    const btnDeleteFiles = document.getElementById('btn-delete-files');
    const grid = document.querySelector('#uploaded-files-section .files-grid');

    if (!grid) return;

    // Clear current visual state
    Array.from(grid.children).forEach(child => {
        if (child.classList.contains('folder-card')) {
            child.remove(); // Remove old folders to re-render
        } else {
            child.style.display = 'none'; // Hide all files initially
        }
    });

    if (!window.CURRENT_GROUP_VIEW) {
        // --- ROOT VIEW ---
        if (titleEl) titleEl.textContent = 'Your Files';
        if (btnBack) btnBack.style.display = 'none';
        if (btnDeleteGroup) btnDeleteGroup.style.display = 'none';

        // Show grouping buttons
        if (btnGroup) btnGroup.style.display = '';
        if (btnDeleteFiles) btnDeleteFiles.style.display = '';

        // 1. Render Folders
        Object.keys(window.FILE_GROUPS).forEach(groupName => {
            const folderDiv = document.createElement('div');
            folderDiv.className = 'file-card folder-card';
            folderDiv.onclick = () => openGroup(groupName);
            folderDiv.innerHTML = `
                <div class="file-icon-large d-flex align-items-center justify-content-center text-warning">
                    <img src="/images/folder icon.png" alt="Folder" style="width: 36px; height: 36px; object-fit: contain;">
                </div>
                <div class="file-name-card">${escapeHtml(groupName)}</div>
                <div class="file-meta-card">
                    <small class="text-muted">${window.FILE_GROUPS[groupName].length} items</small>
                </div>
            `;
            grid.insertBefore(folderDiv, grid.firstChild);
        });

        // 2. Show files NOT in any group
        const allGroupedFiles = new Set();
        Object.values(window.FILE_GROUPS).forEach(ids => ids.forEach(id => allGroupedFiles.add(parseInt(id))));

        Array.from(grid.children).forEach(child => {
            if (child.classList.contains('folder-card')) return;
            const fid = parseInt(child.getAttribute('data-file-id'));
            if (!allGroupedFiles.has(fid)) {
                child.style.display = '';
            }
        });

    } else {
        // --- INSIDE FOLDER VIEW ---
        const groupName = window.CURRENT_GROUP_VIEW;
        if (titleEl) titleEl.textContent = `Folder: ${groupName}`;
        if (btnBack) btnBack.style.display = '';
        if (btnDeleteGroup) btnDeleteGroup.style.display = '';

        // Hide grouping buttons inside a folder (no nested folders for now)
        if (btnGroup) btnGroup.style.display = 'none';

        // Show delete file button
        if (btnDeleteFiles) btnDeleteFiles.style.display = '';

        const groupFiles = new Set((window.FILE_GROUPS[groupName] || []).map(id => parseInt(id)));

        Array.from(grid.children).forEach(child => {
            if (child.classList.contains('folder-card')) return;
            const fid = parseInt(child.getAttribute('data-file-id'));
            if (groupFiles.has(fid)) {
                child.style.display = '';
            }
        });
    }

    // Uncheck all checkboxes
    document.querySelectorAll('.file-select-checkbox').forEach(cb => cb.checked = false);
};

window.openGroup = function (groupName) {
    window.CURRENT_GROUP_VIEW = groupName;
    window.renderGroupsUI();
};

window.exitGroupView = function () {
    window.CURRENT_GROUP_VIEW = null;
    window.renderGroupsUI();
};

window.groupSelectedFiles = function () {
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) return;

    // Find selected IDs
    const selectedIds = [];
    grid.querySelectorAll('.file-select-checkbox:checked').forEach(cb => {
        const fid = cb.getAttribute('data-file-id');
        if (fid) selectedIds.push(parseInt(fid));
    });

    if (selectedIds.length === 0) {
        alert("Please select files to group.");
        return;
    }

    const groupName = prompt("Enter folder name:");
    if (!groupName) return;

    if (window.FILE_GROUPS[groupName]) {
        alert("Folder already exists. Merging files.");
        // Merge logic if desired, or error
    } else {
        window.FILE_GROUPS[groupName] = [];
    }

    // Add files to group
    const currentSet = new Set(window.FILE_GROUPS[groupName].map(x => parseInt(x)));
    selectedIds.forEach(id => currentSet.add(id));
    window.FILE_GROUPS[groupName] = Array.from(currentSet);

    // Save
    window.safeStorage.set('file_groups', window.FILE_GROUPS);
    if (window.saveGroupToServer) window.saveGroupToServer(groupName, window.FILE_GROUPS[groupName]);

    // Refresh
    window.renderGroupsUI();
};

window.deleteCurrentGroup = function () {
    if (!window.CURRENT_GROUP_VIEW) return;
    if (!confirm(`Delete folder "${window.CURRENT_GROUP_VIEW}"? Files inside will return to the main list.`)) return;

    // Sync deletion
    if (window.deleteGroupFromServer) window.deleteGroupFromServer(window.CURRENT_GROUP_VIEW);

    delete window.FILE_GROUPS[window.CURRENT_GROUP_VIEW];
    window.safeStorage.set('file_groups', window.FILE_GROUPS);

    window.exitGroupView();
};

window.toggleSelectAllFiles = function (master) {
    try {
        const grid = document.querySelector('#uploaded-files-section .files-grid');
        if (!grid) return;
        // Only select visible files (respects group view)
        const boxes = Array.from(grid.querySelectorAll('.file-select-checkbox')).filter(cb => {
            return cb.closest('.file-card').style.display !== 'none';
        });
        boxes.forEach(cb => { cb.checked = master.checked; if (window.onFileCheckboxChange) window.onFileCheckboxChange(cb); });
    } catch { }
};




window.onFileCheckboxChange = function (cb) {
    // Placeholder to prevent ReferenceError
    // In future, we can use this to toggle button states
};

window.deleteFile = async function (fileId, event) {
    if (event) event.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
        const res = await fetch('/Dashboard/DeleteFiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify([parseInt(fileId)])
        });
        const data = await res.json();
        if (data.success) {
            // Remove from UI
            const card = document.querySelector(`.file-card[data-file-id="${fileId}"]`);
            if (card) {
                card.remove();
            }

            // Check if grid is empty
            const grid = document.querySelector('#uploaded-files-section .files-grid');
            if (grid) {
                const visibleFiles = Array.from(grid.children).filter(c => c.style.display !== 'none' && !c.classList.contains('folder-card'));
                // Also check if there are any files at all (excluding folders if we want strictly empty state)
                // or if we just removed the last one.
                if (grid.children.length === 0) {
                    // Reload to show empty state or manually adding empty state HTML
                    // Simpler to just reload or re-render if we had a render function for this state
                    // For now, let's just leave it empty or reload the page if it's the last one
                    location.reload();
                }
            } else {
                location.reload();
            }
        } else {
            alert('Failed to delete file: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error('Delete error:', e);
        alert('An error occurred while deleting the file.');
    }
};


window.deleteSelectedFiles = async function () {
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) return;

    const selectedIds = [];
    grid.querySelectorAll('.file-select-checkbox:checked').forEach(cb => {
        const fid = cb.getAttribute('data-file-id');
        if (fid) selectedIds.push(parseInt(fid));
    });

    if (selectedIds.length === 0) {
        alert("Please select files to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedIds.length} file(s)?`)) return;

    try {
        const res = await fetch('/Dashboard/DeleteFiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(selectedIds)
        });
        const data = await res.json();
        if (data.success) {
            location.reload();
        } else {
            alert('Failed to delete files: ' + (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error('Batch delete error:', e);
        alert('An error occurred while deleting files.');
    }
};


// ==========================================
// UPLOAD / MANUAL INPUT LOGIC
// ==========================================

window.startEmptyDocument = function () {
    console.log('startEmptyDocument called');
    window.__viewerSource = 'main'; // Track source

    // Switch to viewer mode but prepare for editing
    window.setLeftView('write');

    // Explicitly hide uploaded files section and top actions
    const uploadedSection = document.getElementById('uploaded-files-section');
    if (uploadedSection) {
        uploadedSection.style.setProperty('display', 'none', 'important');
        console.log('uploaded-files-section hidden');
    }

    const leftTopActions = document.getElementById('left-top-actions');
    if (leftTopActions) {
        leftTopActions.style.setProperty('display', 'none', 'important');
        console.log('left-top-actions hidden');
    }

    const contentDisplay = document.getElementById('content-display');
    const filenameDisplay = document.querySelector('.filename-display');

    if (contentDisplay) {
        contentDisplay.contentEditable = "true";
        contentDisplay.focus();
        contentDisplay.innerHTML = ''; // Start empty
        contentDisplay.style.outline = "none";
        contentDisplay.setAttribute("placeholder", "Start typing...");
    }

    if (filenameDisplay) filenameDisplay.textContent = "Untitled Document";
};

window.saveManualDocument = function () { // Optional: function to save content if we add a save button
    const contentDisplay = document.getElementById('content-display');
    const content = contentDisplay ? contentDisplay.innerText : '';
    console.log("Saving:", content);
    // Implement save logic here if needed
};

// ... existing toggleTextInput ...

window.submitManualText = function () {
    // Legacy function, keeping if called by old buttons, but redirecting logic
    const txt = document.getElementById('manual-text')?.querySelector('textarea');
    if (txt) {
        const content = txt.value.trim();
        window.startEmptyDocument();
        const display = document.getElementById('content-display');
        if (display) display.innerText = content;
    }
};

window.handleFileSelection = function (input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // 20MB limit example
        if (file.size > 20 * 1024 * 1024) {
            alert('File is too large (max 20MB).');
            input.value = '';
            return false;
        }

        // Show loading info
        const info = document.getElementById('file-info');
        if (info) info.textContent = `Selected: ${file.name}`;

        return true; // allow submit
    }
    return false;
};

// ==========================================
// FOCUS TIMER
// ==========================================
// Make TIMER global so other modules can access/modify if needed, though mostly internal
window.TIMER = {
    durationMs: 25 * 60 * 1000,
    remainingMs: 25 * 60 * 1000,
    running: false,
    intervalId: null,
    endTs: null
};

window.formatMMSS = function (ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

function getRemainingTimeEl() {
    try {
        const panel = document.getElementById('focus-timer-panel');
        if (!panel) return null;
        const titles = panel.querySelectorAll('.activity-title');
        for (const t of titles) {
            if ((t.textContent || '').trim().toLowerCase() === 'remaining time') {
                const desc = t.parentElement?.querySelector('.activity-desc');
                if (desc) return desc;
            }
        }
        return panel.querySelector('.activity-desc');
    } catch { return null; }
}

window.updateTimerDisplay = function () {
    const el = getRemainingTimeEl();
    if (el) el.textContent = formatMMSS(TIMER.remainingMs);
};

window.stopTimerInterval = function () {
    if (TIMER.intervalId) {
        clearInterval(TIMER.intervalId);
        TIMER.intervalId = null;
    }
};

window.startTimer = function () {
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

            const durationMinutes = Math.round(TIMER.durationMs / 60000);
            if (durationMinutes > 0) {
                fetch('/Dashboard/RecordFocusSession', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        duration: durationMinutes,
                        subjectName: 'Focus Session',
                        activityType: 'focus_session'
                    })
                }).then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            if (typeof loadProgressData === 'function') loadProgressData();
                        }
                    })
                    .catch(e => console.error(e));
            }
            try {
                const audio = new Audio('/sounds/alarm.mp3');
                audio.play().catch(() => { });
            } catch { }
            alert("Time's up! Great focus session.");
        }
    }, 250);
};

window.pauseTimer = function () {
    if (!TIMER.running) return;
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = Math.max(0, TIMER.endTs - Date.now());
    updateTimerDisplay();
};

window.resetTimer = function () {
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = TIMER.durationMs;
    updateTimerDisplay();
};


// ==========================================
// CALCULATOR
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('tools-calculator-panel');
    const display = document.getElementById('calc-display');
    const errEl = document.getElementById('calc-error');
    if (!panel || !display) return;

    let expr = '';

    function setError(msg) {
        if (!errEl) return;
        if (msg) { errEl.style.display = ''; errEl.textContent = msg; }
        else { errEl.style.display = 'none'; errEl.textContent = ''; }
    }

    function updateDisplay() { display.value = expr || '0'; }

    function appendInput(ch) {
        setError('');
        if (typeof ch !== 'string') return;
        if (!/^[0-9+\-*/().]$/.test(ch)) return;
        const last = expr.slice(-1);
        const isOp = /[+\-*/]/.test(ch);
        const lastIsOp = /[+\-*/]/.test(last);
        if (isOp && (expr.length === 0 && ch !== '-' || (lastIsOp && !(ch === '-' && (last === '(' || lastIsOp))))) {
            if (lastIsOp && ch !== '-') expr = expr.slice(0, -1) + ch; else return;
        } else {
            expr += ch;
        }
        updateDisplay();
    }

    function clearAll() { expr = ''; updateDisplay(); setError(''); }
    function backspace() { expr = expr.slice(0, -1); updateDisplay(); }

    function tokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (c === ' ') { i++; continue; }
            if (/[0-9.]/.test(c)) {
                let num = c; i++;
                while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i++]; }
                if (/^\d*\.\d*\.$/.test(num) || (num.split('.').length - 1) > 1) throw new Error('Invalid number');
                if (num === '.') throw new Error('Invalid number');
                tokens.push({ t: 'num', v: parseFloat(num) });
                continue;
            }
            if (/[+\-*/()]/.test(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
            throw new Error('Invalid character');
        }
        return tokens;
    }

    function toRPN(tokens) {
        const out = [], ops = [];
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
        for (let i = 0; i < tokens.length; i++) {
            const tk = tokens[i];
            if (tk.t === 'num') out.push(tk);
            else {
                const v = tk.v;
                if (v === '(') ops.push(tk);
                else if (v === ')') {
                    while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop());
                    if (!ops.length) throw new Error('Mismatched parentheses');
                    ops.pop();
                } else {
                    while (ops.length && ops[ops.length - 1].v in prec && prec[ops[ops.length - 1].v] >= prec[v]) {
                        out.push(ops.pop());
                    }
                    ops.push(tk);
                }
            }
        }
        while (ops.length) {
            const o = ops.pop();
            if (o.v === '(' || o.v === ')') throw new Error('Mismatched parentheses');
            out.push(o);
        }
        return out;
    }

    function evalRPN(rpn) {
        const st = [];
        for (const tk of rpn) {
            if (tk.t === 'num') st.push(tk.v);
            else {
                const b = st.pop(); const a = st.pop();
                if (a === undefined || b === undefined) throw new Error('Syntax error');
                switch (tk.v) {
                    case '+': st.push(a + b); break;
                    case '-': st.push(a - b); break;
                    case '*': st.push(a * b); break;
                    case '/': if (b === 0) throw new Error('Division by zero'); st.push(a / b); break;
                    default: throw new Error('Invalid operator');
                }
            }
        }
        if (st.length !== 1) throw new Error('Syntax error');
        return st[0];
    }

    function evaluate() {
        try {
            setError('');
            if (!expr) return;
            const tokens = tokenize(expr);
            const rpn = toRPN(tokens);
            const result = evalRPN(rpn);
            expr = (Number.isFinite(result) ? result : 0).toString();
            updateDisplay();
        } catch (e) {
            setError(e?.message || 'Invalid expression');
        }
    }

    panel.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const input = btn.getAttribute('data-calc-input');
        const action = btn.getAttribute('data-calc-action');
        if (input) appendInput(input);
        else if (action === 'clear') clearAll();
        else if (action === 'back') backspace();
        else if (action === 'equals') evaluate();
    });
});


// ==========================================
// NOTIFICATIONS
// ==========================================
let notifications = [];

window.toggleNotificationsPanel = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    toggleInlinePanel('notifications-panel', event);
    renderNotifications();
};

window.updateNotificationBadge = function () {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.user-dropdown.me-3.combined-icon .notification-badge');
    if (badge) {
        badge.textContent = unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : '';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    return unreadCount;
};

window.renderNotifications = function () {
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
    updateNotificationBadge();
};

window.markAsRead = function (id) {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
        safeStorage.set('notifications', notifications);
    }
};

window.addNotification = function (title, message, type = 'info') {
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

    // Toast notification can be added here if needed, or emitted as event
    // window.showNotificationToast(title, message, type);
    safeStorage.set('notifications', notifications);
};

document.addEventListener('DOMContentLoaded', function () {
    notifications = safeStorage.get('notifications', []);
    updateNotificationBadge();
    renderNotifications();
    window.addEventListener('beforeunload', () => {
        safeStorage.set('notifications', notifications);
    });
});
window.openFile = async function (fileId) {
    try {
        window.__viewerSource = 'list'; // Track source

        // Switch to viewer mode using setLeftView for proper state management
        window.setLeftView('viewer');

        const contentDisplay = document.getElementById('content-display');
        const filenameDisplay = document.querySelectorAll('.filename-display');

        // Fetch file content
        const res = await fetch(`/Dashboard/GetFileContent?fileId=${fileId}`, { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.success) {
            alert(data.error || 'Failed to load file');
            return;
        }

        // Update display
        filenameDisplay.forEach(el => el.textContent = data.fileName);

        if (data.displayType === 'image') {
            contentDisplay.innerHTML = `<div class="text-center"><img src="${data.content}" class="img-fluid" style="max-height:80vh;" /></div>`;
            contentDisplay.contentEditable = "false";
        } else if (data.displayType === 'pdf') {
            contentDisplay.innerHTML = `<div class="h-100 w-100"><iframe src="${data.content}" style="width:100%; height:100%; min-height:600px; border:none;" title="PDF Viewer"></iframe></div>`;
            contentDisplay.contentEditable = "false";
        } else {
            const safeText = window.escapeHtml(data.content || '').replace(/\n/g, '<br>');
            contentDisplay.innerHTML = safeText || '<div class="text-center text-muted py-5"><i>No content to display</i></div>';
            contentDisplay.contentEditable = "false";
        }

        // Initialize word count and other controls
        if (typeof window.updateWordCount === 'function') {
            window.updateWordCount();
        }

    } catch (e) {
        console.error("Open file error:", e);
        alert('Error opening file.');
    }
};
