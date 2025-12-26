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

    document.querySelectorAll('.dropdown-menu.inline-left.show, .dropdown-menu.inline-left-from-focus.show, .dropdown-menu.inline-left-from-tools.show, .dropdown-menu.inline-left-from-network.show, .dropdown-menu.inline-left-from-user.show, .dropdown-menu.inline-left-from-files.show')
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
        } else if (!ownerId && (panel.classList.contains('inline-left-from-files') || panelId.startsWith('files-') || panelId === 'shared-files-panel')) {
            ownerId = 'files-dropdown';
        }

        const owner = ownerId ? document.getElementById(ownerId) : null;
        if (owner) {
            document.querySelectorAll('.dropdown-menu.show').forEach(dd => {
                const isClassDetails = dd.id === 'class-details-panel';
                const isInvitePanel = dd.id === 'cls-invite-panel';
                const isOpeningChild = (panelId === 'cls-members-panel' || panelId === 'cls-files-panel' || panelId === 'cls-files-panel-advanced' || panelId === 'cls-invite-panel');
                if (dd.id !== ownerId && dd !== panel && !(isClassDetails && isOpeningChild) && !isInvitePanel) dd.classList.remove('show');
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
            else if ((panelId === 'cls-members-panel' || panelId === 'cls-files-panel' || panelId === 'cls-files-panel-advanced')) {
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

window.closeFloatingPanels = function () {
    // Close all floating panels except class details (where chat resides)
    document.querySelectorAll('.dropdown-menu.show').forEach(p => {
        if (p.id !== 'class-details-panel') {
            p.classList.remove('show');
        }
    });
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
        const res = await fetch('/Dashboard/GetGroups?t=' + new Date().getTime(), { credentials: 'same-origin' });
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
    console.log('🗑️ DELETE FOLDER CALLED:', { name });
    try {
        console.log('📡 Sending DELETE request to /Dashboard/DeleteGroup with:', { name });
        const response = await fetch('/Dashboard/DeleteGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name })
        });
        console.log('📥 Response status:', response.status, response.statusText);
        const data = await response.json();
        console.log('📦 Response data:', data);
        if (!data.success) {
            console.error('❌ Delete folder failed:', data.error);
            alert("Error deleting folder from server: " + (data.error || "Unknown error"));
            return false;
        }
        console.log('✅ Folder deleted successfully');
        return true;
    } catch (e) {
        console.error("💥 Failed to delete group", e);
        alert("Connection failed: " + e.message);
        return false;
    }
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
        // Check if leaving viewer mode
        if (body.classList.contains('mode-viewer') && mode !== 'viewer') {
            if (window.recordBrowsingDuration) window.recordBrowsingDuration();
        }

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
        if (window.clearAIContent) window.clearAIContent();
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
    const initialNoFilesMsg = document.getElementById('initial-no-files-msg');

    if (!grid) return;

    // Clear current visual state
    Array.from(grid.children).forEach(child => {
        if (child.classList.contains('folder-card')) {
            child.remove(); // Remove old folders to re-render
        } else {
            child.style.display = 'none'; // Hide all files initially
        }
    });

    let visibleItemsCount = 0;

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
            folderDiv.onclick = (e) => { e.stopPropagation(); openGroup(groupName); };
            folderDiv.innerHTML = `
                <div class="file-icon-large d-flex align-items-center justify-content-center text-warning">
                    <img src="/images/folder icon.png" alt="Folder" style="width: 36px; height: 36px; object-fit: contain;">
                </div>
                <div class="file-name-card">${escapeHtml(groupName)}</div>
                <div class="file-meta-card">
                    <small class="text-muted">${window.FILE_GROUPS[groupName].length} items</small>
                </div>
            `;
            grid.insertBefore(folderDiv, grid.firstChild); // Insert before files
            visibleItemsCount++;
        });

        // 2. Show files NOT in any group
        const allGroupedFiles = new Set();
        Object.values(window.FILE_GROUPS).forEach(ids => ids.forEach(id => allGroupedFiles.add(parseInt(id))));

        Array.from(grid.children).forEach(child => {
            if (child.classList.contains('folder-card')) return;
            const fid = parseInt(child.getAttribute('data-file-id'));
            if (!allGroupedFiles.has(fid)) {
                child.style.display = '';
                visibleItemsCount++;
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
                visibleItemsCount++;
            }
        });
    }

    // Handle empty state message
    if (initialNoFilesMsg) {
        if (visibleItemsCount === 0) {
            initialNoFilesMsg.style.display = '';
        } else {
            initialNoFilesMsg.style.display = 'none';
        }
    } else if (visibleItemsCount === 0) {
        // If message element doesn't exist (because we moved it out or it was removed), 
        // we might want to inject a temporary one, or just assume the simplified HTML handles it.
        // For now, since we modified HTML to have it separate if valid, we assume it works.
        // Or if we want to be safe, we can manually show/hide a created message.
    }

    // Uncheck all checkboxes
    document.querySelectorAll('.file-select-checkbox').forEach(cb => cb.checked = false);
};

window.openGroup = function (groupName) {
    window.CURRENT_GROUP_VIEW = groupName;
    window.renderGroupsUI();
};

window.exitGroupView = function (event) {
    if (event) event.stopPropagation();
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
    if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);
    if (window.saveGroupToServer) window.saveGroupToServer(groupName, window.FILE_GROUPS[groupName]);

    // Refresh
    window.renderGroupsUI();
};

window.deleteCurrentGroup = async function (event) {
    if (event) event.stopPropagation();
    if (!window.CURRENT_GROUP_VIEW) return;
    if (!confirm(`Delete folder "${window.CURRENT_GROUP_VIEW}"? Files inside will return to the main list.`)) return;

    // Sync deletion
    const currentGroup = window.CURRENT_GROUP_VIEW;
    if (window.deleteGroupFromServer) {
        const success = await window.deleteGroupFromServer(currentGroup);
        if (!success) return; // Stop if server deletion failed
    }

    delete window.FILE_GROUPS[currentGroup];
    if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);

    // Force exit view BEFORE rendering
    window.CURRENT_GROUP_VIEW = null;

    // Render with local state immediately
    window.renderGroupsUI();
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

// --- SEARCH & CREATE FOLDER LOGIC ---

window.toggleFileSearch = function () {
    const searchContainer = document.getElementById('file-search-container');
    const folderContainer = document.getElementById('create-folder-container');
    const searchInput = document.getElementById('file-search-input');

    // Close folder container if open
    if (folderContainer) folderContainer.style.display = 'none';

    if (searchContainer) {
        if (searchContainer.style.display === 'none') {
            searchContainer.style.display = 'block';
            if (searchInput) {
                searchInput.value = ''; // Reset on open
                searchInput.focus();
            }
            window.filterUserFiles('');
        } else {
            searchContainer.style.display = 'none';
            if (searchInput) searchInput.value = '';
            window.filterUserFiles(''); // Reset filter
        }
    }
};

window.toggleCreateFolderInput = function () {
    const folderContainer = document.getElementById('create-folder-container');
    const searchContainer = document.getElementById('file-search-container');
    const folderInput = document.getElementById('new-folder-name-input');

    // Close search container if open // REMOVED to keep search persistent
    // if (searchContainer) {
    //    searchContainer.style.display = 'none';
    // }
    // window.filterUserFiles(''); // Reset filter too
    // }

    if (folderContainer) {
        if (folderContainer.style.display === 'none') {
            folderContainer.style.display = 'block';
            if (folderInput) {
                folderInput.value = '';
                folderInput.focus();
            }
        } else {
            folderContainer.style.display = 'none';
        }
    }
};

window.createNewFolder = function (folderName) {
    if (!folderName || !folderName.trim()) {
        alert('Please enter a folder name');
        return;
    }

    // Use existing prompt logic but bypassed prompt dialog
    // We reuse groupSelectedFiles logic partially or just call saveGroupToServer directly for empty group?
    // User probably wants to create a folder and then drag files or just existence.
    // Current group logic relies on having files. Let's see if we can create empty group.

    // Check duplication
    if (window.FILE_GROUPS[folderName]) {
        alert('Folder already exists');
        return;
    }

    // For now, create empty group locally
    window.FILE_GROUPS[folderName] = [];

    // Save to server (empty array)
    if (window.saveGroupToServer) window.saveGroupToServer(folderName, []);

    // Refresh UI
    window.renderGroupsUI();

    // Close input
    const folderContainer = document.getElementById('create-folder-container');
    if (folderContainer) folderContainer.style.display = 'none';

    // Optional: Switch to that folder view immediately?
    // window.openGroup(folderName);
};

window.filterUserFiles = function (query) {
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) return;

    const lowerQuery = query.toLowerCase();

    Array.from(grid.children).forEach(child => {
        // Skip folder cards, only filter files? Or filter both?
        // Usually search searches everything.

        let name = '';
        if (child.classList.contains('folder-card')) {
            name = child.querySelector('.file-name-card')?.textContent || '';
        } else {
            name = child.querySelector('.file-name-card')?.textContent || '';
        }

        if (name.toLowerCase().includes(lowerQuery)) {
            child.style.display = '';
        } else {
            child.style.display = 'none';
        }
    });
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

    // Clear AI context
    if (window.clearAIContent) window.clearAIContent();

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

    // Live update of Focus Mins
    if (TIMER.running) {
        const focusEl = document.getElementById('progress-focus');
        if (focusEl) {
            const elapsedMs = TIMER.durationMs - TIMER.remainingMs;
            const elapsedMins = Math.floor(elapsedMs / 60000);
            const totalDisplay = (TIMER.baseFocusMinutes || 0) + elapsedMins;
            focusEl.textContent = `${totalDisplay}m`;
        }
    }
};

window.stopTimerInterval = function () {
    if (TIMER.intervalId) {
        clearInterval(TIMER.intervalId);
        TIMER.intervalId = null;
    }
};


function updateTimerButton(state) {
    const btn = document.getElementById('timer-toggle-btn');
    if (!btn) return;

    if (state === 'running') {
        btn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
        btn.className = 'btn btn-warning flex-fill shadow-sm text-white';
    } else {
        // Paused or stopped
        btn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
        btn.className = 'btn btn-success flex-fill shadow-sm';
    }
}

window.toggleTimer = function () {
    if (TIMER.running) {
        window.pauseTimer();
    } else {
        window.startTimer();
    }
};

window.startTimer = function () {
    if (TIMER.running) return;
    if (TIMER.remainingMs <= 0) TIMER.remainingMs = TIMER.durationMs;
    TIMER.running = true;

    // Capture baseline focus minutes from UI
    try {
        const focusEl = document.getElementById('progress-focus');
        if (focusEl) {
            const currentText = focusEl.textContent || '0';
            TIMER.baseFocusMinutes = parseInt(currentText.replace(/[^0-9]/g, '')) || 0;
        } else {
            TIMER.baseFocusMinutes = 0;
        }
    } catch { TIMER.baseFocusMinutes = 0; }

    TIMER.endTs = Date.now() + TIMER.remainingMs;
    stopTimerInterval();
    updateTimerButton('running'); // Update button
    TIMER.intervalId = setInterval(() => {
        const now = Date.now();
        TIMER.remainingMs = Math.max(0, TIMER.endTs - now);
        updateTimerDisplay();
        if (TIMER.remainingMs <= 0) {
            stopTimerInterval();
            TIMER.running = false;
            updateTimerButton('stopped'); // Reset button

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
    updateTimerButton('paused'); // Update button
};

window.resetTimer = function () {
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = TIMER.durationMs;
    updateTimerDisplay();
    updateTimerButton('stopped'); // Update button
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
    if (window.loadNotifications) {
        window.loadNotifications();
    }
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
                    <div class="me-3 flex-grow-1">
                        <h6 class="mb-1">${escapeHtml(notification.title)}</h6>
                        <p class="mb-1 small text-muted">${escapeHtml(notification.message)}</p>
                        <small class="text-muted">${formatTimeAgo(notification.date)}</small>
                    </div>
                <div class="d-flex align-items-center">
                    ${!notification.read ? '<span class="badge bg-primary me-2">New</span>' : ''}
                     <button class="btn btn-sm btn-link text-muted p-0 ms-1" style="line-height:1;" title="Dismiss" onclick="deleteNotification(${notification.id}, event)">
                         <i class="bi bi-x-lg"></i>
                     </button>
                    </div>
                </div>
            </div>
        `).join('');

        if (notifications.length > 10) {
            container.innerHTML += `
            < div class="text-center mt-2" >
                <a href="#" class="small" onclick="event.preventDefault();return false;">
                    View all ${notifications.length} notifications
                </a>
                </div >
            `;
        }
    }
    updateNotificationBadge();
};

window.deleteNotification = async function (id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    // Optimistic UI update
    notifications = notifications.filter(n => n.id != id);
    safeStorage.set('notifications', notifications);
    updateNotificationBadge();
    renderNotifications();

    // Call server to persist delete (assuming numeric IDs from server, but local ones might be 'notif-' strings)
    // If it's a server notification (integer ID), call backend
    if (typeof id === 'number' || !isNaN(id)) {
        try {
            const res = await fetch('/Dashboard/DeleteNotification?id=' + id, {
                method: 'POST'
            });
            const data = await res.json();
            if (!data.success) {
                console.warn('Failed to delete notification on server:', data.error);
                // Optionally revert if critical, but for notifications usually fine
            }
        } catch (e) {
            console.error('Delete notification error:', e);
        }
    }
};

window.markAsRead = function (id) {
    const notification = notifications.find(n => n.id == id);
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
        if (window.recordBrowsingDuration) window.recordBrowsingDuration();
    });
});
window.openFile = async function (fileId, fileNameOpt, fileUrlOpt) {
    try {
        window.__viewerSource = 'list'; // Track source

        // Track file access for recent files if ID is present
        if (fileId && window.trackFileOpen) window.trackFileOpen(fileId);

        // Switch to viewer mode using setLeftView for proper state management
        window.setLeftView('viewer');

        const contentDisplay = document.getElementById('content-display');
        const filenameDisplay = document.querySelectorAll('.filename-display');

        // Create recordBrowsingDuration if not exists
        if (!window.recordBrowsingDuration) {
            window.recordBrowsingDuration = function () {
                if (!window.browsingStartTime) return;
                const durationMs = Date.now() - window.browsingStartTime;
                window.browsingStartTime = null; // Reset
                if (durationMs < 5000) return;
                const durationMins = Math.ceil(durationMs / 60000);
                const subject = document.querySelector('.filename-display')?.textContent || 'File View';
                try {
                    navigator.sendBeacon('/Dashboard/RecordBrowsingSession', JSON.stringify({ duration: durationMins, subjectName: subject }));
                } catch (e) { }
            };
        }

        window.browsingStartTime = Date.now();

        if (contentDisplay) {
            contentDisplay.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">Loading file...</div></div>';
        }

        let fname = fileNameOpt || 'File';
        filenameDisplay.forEach(el => el.textContent = fname);

        // DIRECT URL MODE (For class files)
        if (fileUrlOpt) {
            if (contentDisplay) {
                const ext = fname.split('.').pop().toLowerCase();
                let type = 'unknown';
                if (/^(png|jpg|jpeg|gif|webp)$/.test(ext)) type = 'image';
                else if (ext === 'pdf') type = 'pdf';
                else if (/^(txt|md|js|css|html|xml|json|cs)$/.test(ext)) type = 'text';

                if (type === 'image') {
                    contentDisplay.innerHTML = `<div class="text-center h-100 d-flex align-items-center justify-content-center" style="background:#f8f9fa;"><img src="${fileUrlOpt}" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>`;
                } else if (type === 'pdf') {
                    // Use object with iframe fallback for better PDF display
                    contentDisplay.innerHTML = `<object data="${fileUrlOpt}" type="application/pdf" style="width:100%; height:100%; min-height:600px;"><iframe src="${fileUrlOpt}" style="width:100%; height:100%; min-height:600px; border:none;"></iframe></object>`;
                    contentDisplay.style.height = '100%';
                    contentDisplay.style.minHeight = '600px';
                } else {
                    // Default to iframe for others
                    contentDisplay.innerHTML = `<iframe src="${fileUrlOpt}" style="width:100%; height:100%; border:none;"></iframe>`;
                }
                contentDisplay.contentEditable = "false";
            }
            return;
        }

        // ID MODE (For my files)
        const res = await fetch(`/Dashboard/GetFileContent?fileId=${fileId}`, { credentials: 'same-origin' });
        const data = await res.json();

        if (!data.success) {
            alert(data.error || 'Failed to load file');
            return;
        }

        filenameDisplay.forEach(el => el.textContent = data.fileName);

        if (contentDisplay) {
            if (data.displayType === 'image') {
                contentDisplay.innerHTML = `<div class="text-center h-100 d-flex align-items-center justify-content-center" style="background:#f8f9fa;"><img src="${data.content}" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>`;
                contentDisplay.contentEditable = "false";
            } else if (data.displayType === 'pdf') {
                // Use object with iframe fallback for better PDF display
                contentDisplay.innerHTML = `<object data="${data.content}" type="application/pdf" style="width:100%; height:100%; min-height:600px;"><iframe src="${data.content}" style="width:100%; height:100%; min-height:600px; border:none;"></iframe></object>`;
                contentDisplay.contentEditable = "false";
                contentDisplay.style.height = '100%';
                contentDisplay.style.minHeight = '600px';
            } else {
                const safeText = window.escapeHtml(data.content || '').replace(/\n/g, '<br>');
                contentDisplay.innerHTML = safeText || '<div class="text-center text-muted py-5"><i>No content to display</i></div>';
                contentDisplay.contentEditable = "false";
            }
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

// ==========================================
// INLINE RECENT & MY FILES PANEL IMPLEMENTATION
// ==========================================
window.__inlineFolderView = null; // Track current folder in inline panel

window.renderMyFilesPanel = function (folderName) {
    const list = document.getElementById('my-files-list-inline');
    if (!list) return;

    // Update state if folder specified
    if (folderName !== undefined) {
        window.__inlineFolderView = folderName;
    }

    list.innerHTML = '<div class="text-center text-muted py-2 small"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';

    // Source data from the hidden main files grid
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) {
        list.innerHTML = '';
        if (!window.__inlineFolderView) {
            renderAddFolderButton(list);
        }
        const div = document.createElement('div');
        div.className = 'text-center text-muted small py-4';
        div.textContent = 'No files found.';
        list.appendChild(div);
        return;
    }

    const cards = Array.from(grid.children);

    list.innerHTML = '';

    // If viewing a folder, show back button
    if (window.__inlineFolderView) {
        const backDiv = document.createElement('div');
        backDiv.className = 'p-2 pb-3 border-bottom';
        backDiv.innerHTML = `
            <button class="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2" onclick="event.stopPropagation(); renderMyFilesPanel(null)">
                <i class="bi bi-arrow-left"></i> Back to My Files
            </button>
        `;
        list.appendChild(backDiv);

        // Show folder name header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'px-3 py-2 bg-light border-bottom';
        headerDiv.innerHTML = `<small class="fw-bold text-muted"><i class="bi bi-folder-fill me-1"></i>${window.escapeHtml(window.__inlineFolderView)}</small>`;
        list.appendChild(headerDiv);

        // Get files in this folder
        const folderFileIds = new Set((window.FILE_GROUPS[window.__inlineFolderView] || []).map(id => parseInt(id)));

        // Show files in folder
        cards.forEach(card => {
            if (card.classList.contains('folder-card')) return;

            const fid = parseInt(card.getAttribute('data-file-id'));
            if (!folderFileIds.has(fid)) return;

            const fname = card.getAttribute('data-file-name') || card.querySelector('.file-name-card')?.textContent.trim() || 'Untitled';
            const iconContainer = card.querySelector('.file-icon-large');
            const iconHtml = iconContainer ? iconContainer.innerHTML : '<i class="bi bi-file-earmark"></i>';

            const div = document.createElement('div');
            div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light position-relative file-item-row';
            div.style.cursor = 'pointer';

            div.onclick = (e) => {
                if (e.target.closest('.btn-delete-inline')) return;
                if (window.openFile) window.openFile(fid, fname);
            };

            div.innerHTML = `
            <div class="me-3" style="width:32px; text-align:center;">
                ${iconHtml.replace('width: 36px', 'width: 24px').replace('height: 36px', 'height: 24px').replace('fs-1', 'fs-5')}
            </div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="fw-medium text-truncate" title="${fname}">${window.escapeHtml(fname)}</div>
                    <div class="small text-muted">File</div>
                </div>
                <div class="ms-2">
                     <button class="btn btn-sm btn-outline-danger btn-delete-inline border-0 p-1" title="Delete" onclick="deleteFileInline(${fid}, event)">
                        <i class="bi bi-trash"></i>
                     </button>
                </div>
        `;
            list.appendChild(div);
        });

        if (folderFileIds.size === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'text-center text-muted small py-4';
            emptyDiv.textContent = 'No files in this folder.';
            list.appendChild(emptyDiv);
        }

        return;
    }

    // Root view - show folders and ungrouped files

    // Add Search Bar
    const searchDiv = document.createElement('div');
    searchDiv.className = 'px-2 pb-2';
    searchDiv.innerHTML = `
        <div class="input-group input-group-sm">
            <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control border-start-0 ps-0" placeholder="Search files & folders..." value="${window.escapeHtml(window.__myFilesSearchTerm || '')}" oninput="window.filterMyFiles(this.value)">
        </div>
    `;
    list.appendChild(searchDiv);

    renderAddFolderButton(list);

    // Process Folders from FILE_GROUPS directly
    if (window.FILE_GROUPS) {
        Object.keys(window.FILE_GROUPS).forEach(groupName => {
            const div = document.createElement('div');
            div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light position-relative searchable-item';
            if (window.__myFilesSearchTerm && !groupName.toLowerCase().includes(window.__myFilesSearchTerm)) {
                div.style.display = 'none';
            }
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                // Prevent panel from closing
                if (e) e.stopPropagation();
                // Stay in panel and show folder contents
                window.renderMyFilesPanel(groupName);
            };

            const fileCount = window.FILE_GROUPS[groupName] ? window.FILE_GROUPS[groupName].length : 0;

            div.innerHTML = `
            <div class="me-3 text-warning">
                <i class="bi bi-folder-fill fs-5"></i>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                    <div class="fw-medium text-truncate" title="${groupName}">${window.escapeHtml(groupName)}</div>
                    <div class="small text-muted">${fileCount} items</div>
                </div>
                <button class="btn btn-sm btn-outline-danger me-2" onclick="event.stopPropagation(); window.deleteFolderInline('${groupName.replace(/'/g, "\\'")}')" title="Delete folder">
            <i class="bi bi-trash"></i>
                </button>
            <div class="text-muted small">
                <i class="bi bi-chevron-right"></i>
            </div>
        `;
            list.appendChild(div);
        });
    }

    // Process ungrouped Files
    const allGroupedFiles = new Set();
    Object.values(window.FILE_GROUPS || {}).forEach(ids => ids.forEach(id => allGroupedFiles.add(parseInt(id))));

    cards.forEach(card => {
        if (card.classList.contains('folder-card')) return;

        const fid = parseInt(card.getAttribute('data-file-id'));
        if (allGroupedFiles.has(fid)) return; // Skip grouped files

        const fname = card.getAttribute('data-file-name') || card.querySelector('.file-name-card')?.textContent.trim() || 'Untitled';

        const iconContainer = card.querySelector('.file-icon-large');
        const iconHtml = iconContainer ? iconContainer.innerHTML : '<i class="bi bi-file-earmark"></i>';

        const div = document.createElement('div');
        div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light position-relative file-item-row searchable-item';
        if (window.__myFilesSearchTerm && !fname.toLowerCase().includes(window.__myFilesSearchTerm)) {
            div.style.display = 'none';
        }
        div.style.cursor = 'pointer';

        div.onclick = (e) => {
            if (e.target.closest('.btn-delete-inline')) return;
            if (window.openFile) window.openFile(fid, fname);
        };

        div.innerHTML = `
            <div class="me-3" style="width:32px; text-align:center;">
                ${iconHtml.replace('width: 36px', 'width: 24px').replace('height: 36px', 'height: 24px').replace('fs-1', 'fs-5')}
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-medium text-truncate" title="${fname}">${window.escapeHtml(fname)}</div>
                <div class="small text-muted">File</div>
            </div>
            <div class="ms-2">
                 <button class="btn btn-sm btn-outline-danger btn-delete-inline border-0 p-1" title="Delete" onclick="deleteFileInline(${fid}, event)">
                    <i class="bi bi-trash"></i>
                 </button>
            </div>
        `;
        list.appendChild(div);
    });
};

function renderAddFolderButton(list) {
    const container = document.createElement('div');
    container.className = 'p-2 pb-3';
    container.id = 'folder-creation-container';

    // Step 1: Initial Button
    const initialView = document.createElement('div');
    initialView.className = 'd-grid';
    initialView.innerHTML = `
        <button class="btn btn-outline-primary btn-sm dashed-border" onclick="document.getElementById('folder-name-section').classList.remove('d-none'); this.parentElement.classList.add('d-none');">
            <i class="bi bi-folder-plus me-2"></i>Create New Folder
        </button>
    `;
    container.appendChild(initialView);

    // Step 2: Name input (initially hidden)
    const nameSection = document.createElement('div');
    nameSection.id = 'folder-name-section';
    nameSection.className = 'd-none'; // Hidden by default
    nameSection.innerHTML = `
        <div class="d-flex gap-2 align-items-center">
            <input type="text" 
                   id="inline-folder-name-input" 
                   class="form-control form-control-sm" 
                   placeholder="Folder Name"
                   style="flex: 1;"
                   onclick="event.stopPropagation()"
            />
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.showFileSelection()" title="Next">
                <i class="bi bi-arrow-right"></i>
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="event.stopPropagation(); window.cancelFolderCreation()" title="Cancel">
                <i class="bi bi-x"></i>
            </button>
        </div>
    `;

    // Step 3: File selection (initially hidden)
    const fileSection = document.createElement('div');
    fileSection.id = 'folder-file-selection';
    fileSection.style.display = 'none';
    fileSection.className = 'mt-2';
    fileSection.innerHTML = `
        <div class="bg-light p-2 rounded-3 border">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <small class="fw-bold text-muted">Select Files:</small>
                <button class="btn btn-sm btn-outline-secondary py-0 px-2" onclick="event.stopPropagation(); window.cancelFolderCreation()">
                    <i class="bi bi-x"></i>
                </button>
            </div>
            <div id="file-selection-list" style="max-height: 200px; overflow-y: auto;" class="mb-2">
                <!-- Files will be populated here -->
            </div>
            <button class="btn btn-sm btn-success w-100" onclick="window.createFolderWithFiles()">
                <i class="bi bi-check-lg"></i> Create Folder
            </button>
        </div >
            `;

    container.appendChild(nameSection);
    container.appendChild(fileSection);
    list.appendChild(container);

    // Add Enter key support for name input
    setTimeout(() => {
        const input = document.getElementById('inline-folder-name-input');
        if (input) {
            input.onkeypress = (e) => {
                if (e.key === 'Enter') window.showFileSelection();
            };
        }
    }, 100);
}

window.showFileSelection = function () {
    const input = document.getElementById('inline-folder-name-input');
    if (!input) return;

    const name = input.value.trim();
    if (!name) {
        input.focus();
        return;
    }

    if (window.FILE_GROUPS && window.FILE_GROUPS[name]) {
        alert("Folder already exists.");
        input.value = '';
        input.focus();
        return;
    }

    // Hide name section, show file selection
    const nameSection = document.getElementById('folder-name-section');
    const fileSection = document.getElementById('folder-file-selection');
    const fileList = document.getElementById('file-selection-list');

    if (nameSection) nameSection.style.display = 'none';
    if (fileSection) fileSection.style.display = 'block';

    // Get available files (ungrouped files)
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) {
        fileList.innerHTML = '<small class="text-muted">No files available</small>';
        return;
    }

    const allGroupedFiles = new Set();
    Object.values(window.FILE_GROUPS || {}).forEach(ids => ids.forEach(id => allGroupedFiles.add(parseInt(id))));

    const availableFiles = Array.from(grid.children).filter(card => {
        if (card.classList.contains('folder-card')) return false;
        const fid = parseInt(card.getAttribute('data-file-id'));
        return !allGroupedFiles.has(fid);
    });

    if (availableFiles.length === 0) {
        fileList.innerHTML = '<small class="text-muted">No ungrouped files available</small>';
        return;
    }

    // Render file checkboxes
    fileList.innerHTML = '';
    availableFiles.forEach(card => {
        const fid = card.getAttribute('data-file-id');
        const fname = card.getAttribute('data-file-name') || 'Untitled';

        const div = document.createElement('div');
        div.className = 'form-check py-1';
        div.innerHTML = `
            <div class="form-check">
                <input class="form-check-input file-selection-checkbox" type="checkbox" value="${fid}" id="file-check-${fid}">
                <label class="form-check-label small" for="file-check-${fid}">
                    ${window.escapeHtml(fname)}
                </label>
            </div>
        `;
        fileList.appendChild(div);
    });
};

window.cancelFolderCreation = function () {
    // Simply re-render to reset state is easiest and safest
    window.renderMyFilesPanel();
};

window.createFolderWithFiles = function () {
    const input = document.getElementById('inline-folder-name-input');
    if (!input) return;

    const name = input.value.trim();
    const selectedCheckboxes = document.querySelectorAll('.file-selection-checkbox:checked');
    const selectedFiles = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));

    // Create folder
    if (!window.FILE_GROUPS) window.FILE_GROUPS = {};
    window.FILE_GROUPS[name] = selectedFiles;

    if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);
    if (window.saveGroupToServer) window.saveGroupToServer(name, selectedFiles);

    // Reset and refresh
    window.cancelFolderCreation();
    if (input) input.value = '';
    window.renderGroupsUI();
    window.renderMyFilesPanel();
};

// Track file access for recent files
window.trackFileOpen = function (fileId) {
    try {
        const key = 'recentFileAccess';
        let recentAccess = {};

        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                recentAccess = JSON.parse(stored);
            } catch (e) {
                recentAccess = {};
            }
        }

        recentAccess[fileId] = Date.now();
        localStorage.setItem(key, JSON.stringify(recentAccess));
    } catch (e) {
        console.error('Failed to track file access:', e);
    }
};

window.deleteFileInline = async function (fid, event) {
    if (event) event.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
        const response = await fetch('/Dashboard/DeleteFiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([parseInt(fid)])
        });
        const data = await response.json();
        if (data.success) {
            // Remove from main grid
            const grid = document.querySelector('#uploaded-files-section .files-grid');
            if (grid) {
                const card = grid.querySelector(`.file - card[data - file - id="${fid}"]`);
                if (card) card.remove();
            }
            // Remove from groups if presnet
            if (window.FILE_GROUPS) {
                Object.keys(window.FILE_GROUPS).forEach(g => {
                    window.FILE_GROUPS[g] = window.FILE_GROUPS[g].filter(id => id != fid);
                });
                if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);
            }

            window.renderGroupsUI();
            window.renderMyFilesPanel();
        } else {
            alert("Failed to delete: " + (data.error || 'Unknown error'));
        }
    } catch (e) {
        console.error(e);
        alert("Error deleting file.");
    }
};

window.deleteFolderInline = function (folderName) {
    if (!confirm(`Are you sure you want to delete the folder "${folderName}" ? The files inside will be ungrouped.`)) return;

    try {
        // Remove folder from FILE_GROUPS
        if (window.FILE_GROUPS && window.FILE_GROUPS[folderName]) {
            delete window.FILE_GROUPS[folderName];

            // Save to storage
            if (window.safeStorage) window.safeStorage.set('fileGroups', window.FILE_GROUPS);

            // Save to server if function exists
            if (window.deleteGroupFromServer) {
                window.deleteGroupFromServer(folderName);
            }

            // Refresh UI
            window.renderGroupsUI();
            window.renderMyFilesPanel();
        }
    } catch (e) {
        console.error('Failed to delete folder:', e);
        alert('Error deleting folder.');
    }
};

window.renderRecentFilesPanel = function () {
    const list = document.getElementById('recent-files-list-inline');
    if (!list) return;

    list.innerHTML = '<div class="text-center text-muted py-2 small"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';

    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) {
        list.innerHTML = '<div class="text-center text-muted small py-4">No recent files.</div>';
        return;
    }

    // Get only files (not folders)
    let files = Array.from(grid.children).filter(c => !c.classList.contains('folder-card'));

    // Get recent access times from localStorage
    let recentAccess = {};
    try {
        const stored = localStorage.getItem('recentFileAccess');
        if (stored) {
            recentAccess = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Failed to load recent access:', e);
    }

    // Sort files by last access time (most recent first)
    files.sort((a, b) => {
        const aId = a.getAttribute('data-file-id');
        const bId = b.getAttribute('data-file-id');
        const aTime = recentAccess[aId] || 0;
        const bTime = recentAccess[bId] || 0;
        return bTime - aTime; // Descending order
    });

    // Filter to only files that have been accessed (time > 0)
    files = files.filter(card => {
        const fid = card.getAttribute('data-file-id');
        return recentAccess[fid] && recentAccess[fid] > 0;
    });

    // Limit to 10
    const recent = files.slice(0, 10);

    if (recent.length === 0) {
        list.innerHTML = '<div class="text-center text-muted small py-4">No recently accessed files.<br><small class="text-muted">Open a file to see it here.</small></div>';
        return;
    }

    list.innerHTML = '';

    recent.forEach(card => {
        const fid = card.getAttribute('data-file-id');
        const fname = card.getAttribute('data-file-name');

        const iconContainer = card.querySelector('.file-icon-large');
        const iconHtml = iconContainer ? iconContainer.innerHTML : '<i class="bi bi-file-earmark"></i>';

        const div = document.createElement('div');
        div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light';
        div.style.cursor = 'pointer';
        div.onclick = () => {
            if (window.openFile) window.openFile(fid, fname);
            // Refresh panel after short delay to show updated order
            setTimeout(() => {
                const panelVisible = document.getElementById('recent-files-panel')?.classList.contains('show');
                if (panelVisible) window.renderRecentFilesPanel();
            }, 100);
        };

        div.innerHTML = `
            < div class="me-3" style = "width:32px; text-align:center;" >
                ${iconHtml.replace('width: 36px', 'width: 24px').replace('height: 36px', 'height: 24px').replace('fs-1', 'fs-5')}
            </div >
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-medium text-truncate" title="${fname}">${window.escapeHtml(fname)}</div>
                <div class="small text-muted">Recent</div>
            </div>
        `;
        list.appendChild(div);
    });
};

window.__myFilesSearchTerm = '';

window.filterMyFiles = function (term) {
    window.__myFilesSearchTerm = term.toLowerCase();
    const list = document.getElementById('my-files-list-inline');
    if (!list) return;

    const items = list.querySelectorAll('.searchable-item');
    let hasVisible = false;

    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        // If it's a folder or file, check the title/name
        // We can be more specific if we want, but textContent usually works fine for simple lists
        if (text.includes(window.__myFilesSearchTerm)) {
            item.style.display = '';
            hasVisible = true;
        } else {
            item.style.display = 'none';
        }
    });

    // Handle "No results" message if needed, though not strictly required by plan
};
