document.addEventListener('DOMContentLoaded', function () {
    loadFileStats();
    loadRecentFilesPreview();
    loadSharedFilesStats();
});

async function loadFileStats() {
    try {
        const response = await fetch('/Dashboard/GetFileStats');
        const data = await response.json();

        if (data.success) {
            // Locate the "My Files" activity item using the title text or class
            const myFilesItem = Array.from(document.querySelectorAll('.activity-item')).find(el =>
                el.querySelector('.activity-title')?.textContent.trim() === 'My Files'
            );

            if (myFilesItem) {
                const descEl = myFilesItem.querySelector('.activity-desc');
                if (descEl) {
                    descEl.textContent = `${data.filesCount || 0} files, ${data.foldersCount || 0} folders`;
                }
            }
        }
    } catch (error) {
        console.error('Failed to load file stats:', error);
    }
}

async function loadRecentFilesPreview() {
    try {
        const response = await fetch('/Dashboard/GetRecentFiles');
        const data = await response.json();

        if (data.success) {
            // Locate the "Recent Files" activity item
            const recentFilesItem = Array.from(document.querySelectorAll('.activity-item')).find(el =>
                el.querySelector('.activity-title')?.textContent.trim() === 'Recent Files'
            );

            if (recentFilesItem) {
                const descEl = recentFilesItem.querySelector('.activity-desc');
                if (descEl) {
                    if (data.recentFiles && data.recentFiles.length > 0) {
                        descEl.textContent = data.recentFiles.map(f => f.fileName).join(', ');
                    } else {
                        descEl.textContent = 'No recent files';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to load recent files:', error);
    }
}

async function loadSharedFilesStats() {
    try {
        const response = await fetch('/Classes/GetSharedFiles');
        const data = await response.json();

        if (data.success) {
            const sharedItem = Array.from(document.querySelectorAll('.activity-item')).find(el =>
                el.querySelector('.activity-title')?.textContent.trim() === 'Shared With Me'
            );

            if (sharedItem) {
                const descEl = sharedItem.querySelector('.activity-desc');
                if (descEl) {
                    descEl.textContent = `${data.files ? data.files.length : 0} files from classes`;
                }
            }
        }
    } catch (error) {
        console.error('Failed to load shared files stats:', error);
    }
}

window.renderSharedFilesPanel = async function () {
    const listContainer = document.getElementById('shared-files-list');
    if (!listContainer) return;

    try {
        const response = await fetch('/Classes/GetSharedFiles');
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed');

        listContainer.innerHTML = '';
        if (data.files && data.files.length > 0) {
            data.files.forEach(file => {
                const div = document.createElement('div');
                div.className = 'activity-item border-bottom'; // Using activity-item style for list
                div.style.cursor = 'pointer';
                div.onclick = function () {
                    if (window.openFile) window.openFile(file.id, file.fileName);
                    // Close panel
                    const panel = document.getElementById('shared-files-panel');
                    if (panel) panel.classList.remove('show');
                };

                const ext = file.fileName.split('.').pop().toLowerCase();
                let iconClass = 'bi-file-earmark';
                let iconColor = 'text-muted';
                if (ext === 'pdf') { iconClass = 'bi-file-earmark-pdf'; iconColor = 'text-danger'; }
                else if (ext.includes('doc')) { iconClass = 'bi-file-earmark-word'; iconColor = 'text-primary'; }
                else if (['jpg', 'png'].includes(ext)) { iconClass = 'bi-file-earmark-image'; iconColor = 'text-success'; }

                div.innerHTML = `
                    <div class="activity-icon ${iconColor}">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div class="activity-info flex-grow-1">
                        <div class="activity-title text-truncate" style="max-width: 200px;">${file.fileName}</div>
                        <div class="activity-desc">
                            <span class="badge bg-light text-dark border me-1">${file.className}</span>
                            ${file.fileSize ? (file.fileSize / 1024).toFixed(0) + ' KB' : ''}
                        </div>
                    </div>
                    <div class="text-muted small">
                         ${new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                `;
                listContainer.appendChild(div);
            });
        } else {
            listContainer.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-folder2-open fs-1 display-block mb-2 opacity-50"></i>
                    <p class="mb-1">No shared files found.</p>
                </div>
             `;
        }

    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div class="text-center text-danger py-3">Failed to load files</div>';
    }
};
