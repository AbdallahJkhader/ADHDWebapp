
// ==========================================
// INLINE RECENT & MY FILES PANEL IMPLEMENTATION
// ==========================================
window.renderMyFilesPanel = function () {
    const list = document.getElementById('my-files-list-inline');
    if (!list) return;

    list.innerHTML = '<div class="text-center text-muted py-2 small"><span class="spinner-border spinner-border-sm"></span> Loading...</div>';

    // Source data from the hidden main files grid
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) {
        list.innerHTML = '<div class="text-center text-muted small py-4">No files found.</div>';
        return;
    }

    const cards = Array.from(grid.children);
    if (cards.length === 0) {
        // Retry a bit later if loading (DOM might not be ready if files loaded async)
        // But usually server renders them.
        list.innerHTML = '<div class="text-center text-muted small py-4">No files available.</div>';
        return;
    }

    list.innerHTML = '';

    // Process Folders first
    cards.forEach(card => {
        if (!card.classList.contains('folder-card')) return;
        // Parse folder data
        const nameEl = card.querySelector('.file-name-card');
        const name = nameEl ? nameEl.textContent.trim() : 'Folder';

        const div = document.createElement('div');
        div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light';
        div.style.cursor = 'pointer';
        div.onclick = () => {
            toggleInlinePanel('my-files-panel'); // Close panel
            window.showMyFiles(); // Switch to main view
            window.openGroup(name); // Open folder
        };

        div.innerHTML = `
            <div class="me-3 text-warning">
                <i class="bi bi-folder-fill fs-5"></i>
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-medium text-truncate" title="${name}">${window.escapeHtml(name)}</div>
                <div class="small text-muted">Folder</div>
            </div>
            <div class="text-muted small">
                <i class="bi bi-chevron-right"></i>
            </div>
        `;
        list.appendChild(div);
    });

    // Process Files
    cards.forEach(card => {
        if (card.classList.contains('folder-card')) return;
        if (card.style.display === 'none') {
            // If filter is active or inside group, this might hide files. 
            // We want "My Files" panel to likely show ROOT files or ALL files?
            // Usually "My Files" implies root.
            // If we are mimicking the grid, we use only visible ones? 
            // Let's show ALL files for quick access if they are not in a folder?
            // Actually, sticking to the DOM state is safest to avoid confusion.
            // If DOM hides them, maybe we shouldn't show them.
            // But if specific View is active...
        }

        const fid = card.getAttribute('data-file-id');
        const fname = card.getAttribute('data-file-name');

        const iconContainer = card.querySelector('.file-icon-large');
        const iconHtml = iconContainer ? iconContainer.innerHTML : '<i class="bi bi-file-earmark"></i>';

        const div = document.createElement('div');
        div.className = 'd-flex align-items-center p-2 border-bottom hover-bg-light';
        div.style.cursor = 'pointer';
        div.onclick = () => {
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
        `;
        list.appendChild(div);
    });
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
    const files = Array.from(grid.children).filter(c => !c.classList.contains('folder-card'));

    // Limit to 10
    const recent = files.slice(0, 10);

    if (recent.length === 0) {
        list.innerHTML = '<div class="text-center text-muted small py-4">No recent files.</div>';
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
        };

        div.innerHTML = `
            <div class="me-3" style="width:32px; text-align:center;">
                ${iconHtml.replace('width: 36px', 'width: 24px').replace('height: 36px', 'height: 24px').replace('fs-1', 'fs-5')}
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-medium text-truncate" title="${fname}">${window.escapeHtml(fname)}</div>
                <div class="small text-muted">Recent</div>
            </div>
        `;
        list.appendChild(div);
    });
};
