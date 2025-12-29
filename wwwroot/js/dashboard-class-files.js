// Class Files Panel Handlers

// Load and display class files when panel opens
window.loadFullClassFiles = async function (classId) {
    if (!classId) return;

    const container = document.getElementById('cls-files-list');
    const emptyState = document.getElementById('cls-files-empty');
    const errorDiv = document.getElementById('cls-files-error');

    if (!container || !emptyState) return;

    try {
        if (errorDiv) errorDiv.style.display = 'none';

        const response = await fetch(`/Classes/Files?classId=${classId}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to load files');

        container.innerHTML = '';

        if (data.files && data.files.length > 0) {
            emptyState.style.display = 'none';
            container.style.display = 'block';

            // Calculate statistics
            const totalCount = data.files.length;
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentCount = data.files.filter(f => new Date(f.uploadedAt) >= weekAgo).length;

            // Update stats badges in search bar
            const totalBadge = document.getElementById('cls-files-total-badge');
            const weekBadge = document.getElementById('cls-files-week-badge');
            const outsideBadge = document.getElementById('cls-stat-files');

            if (totalBadge) totalBadge.textContent = totalCount;
            if (weekBadge) weekBadge.textContent = recentCount;
            if (outsideBadge) outsideBadge.textContent = totalCount;

            data.files.forEach(file => {
                // Filter out videos from this list
                const ext = file.fileName.split('.').pop().toLowerCase();
                if (/^(mp4|webm|ogg|mov|avi|mkv)$/.test(ext)) return;

                const fileItem = createFileItem(file);
                container.appendChild(fileItem);
            });
        } else {
            emptyState.style.display = 'block';
            container.style.display = 'none';
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    }
};

// ... (createFileItem and helpers remain same, skipped in replacement if possible, but I need to be contiguous)
// Actually I better only replace the start and end to avoid huge block.
// But AllowMultiple is true. I can do multiple chunks.

// Chunk 1: The function definition
// Chunk 2: The usage in uploadClassFile success callback
// Chunk 3: The usage in MutationObserver

// Create a file item element
function createFileItem(file) {
    if (!file || !file.fileName) {
        console.warn('Invalid file object:', file);
        return document.createElement('div');
    }

    const div = document.createElement('div');
    div.className = 'cls-file-item p-3 mb-2 border rounded-3 bg-white position-relative';
    div.style.transition = 'all 0.2s ease';

    const extension = file.fileName.split('.').pop().toLowerCase();
    const icon = getFileIcon(extension);
    const iconColor = getFileIconColor(extension);

    // Get uploader initials for avatar
    const uploaderInitials = (file.uploaderName || 'U').charAt(0).toUpperCase();

    div.innerHTML = `
        <div class="d-flex align-items-start gap-3">
            <div class="cls-file-icon d-flex align-items-center justify-content-center rounded-circle ${iconColor}" style="width: 48px; height: 48px; flex-shrink: 0;">
                <i class="${icon} fs-4"></i>
            </div>
            <div class="flex-grow-1 overflow-hidden">
                <div class="fw-medium text-truncate mb-1" title="${escapeHtml(file.fileName)}">${escapeHtml(file.fileName)}</div>
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <div class="d-flex align-items-center gap-1">
                        <div class="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style="width: 20px; height: 20px; font-size: 10px; font-weight: 600;">
                            ${uploaderInitials}
                        </div>
                        <small class="text-muted">${escapeHtml(file.uploaderName || 'Unknown')}</small>
                    </div>
                    <small class="text-muted">•</small>
                    <small class="text-muted">${formatFileSize(file.fileSize)}</small>
                    <small class="text-muted">•</small>
                    <small class="text-muted">${formatDate(file.uploadedAt)}</small>
                </div>
            </div>
            <div class="d-flex gap-2 flex-shrink-0">
                <button class="btn btn-sm btn-outline-primary rounded-circle" title="View" onclick="event.stopPropagation(); openClassFile(${file.id}, '${escapeHtml(file.fileName)}', true)">
                    <i class="bi bi-eye"></i>
                </button>
                <a href="${file.filePath}" download class="btn btn-sm btn-outline-secondary rounded-circle" title="Download" onclick="event.stopPropagation()">
                    <i class="bi bi-download"></i>
                </a>
                <button class="btn btn-sm btn-outline-danger rounded-circle" title="Delete" onclick="window.deleteClassFile(${file.id}, event)">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;

    // Make the whole card clickable to open file
    div.style.cursor = 'pointer';
    div.addEventListener('click', (e) => {
        // Don't trigger if clicking on buttons or links
        if (!e.target.closest('button') && !e.target.closest('a')) {
            openClassFile(file.id, file.fileName, true);
        }
    });

    div.addEventListener('mouseenter', () => {
        div.style.transform = 'translateY(-2px)';
        div.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    div.addEventListener('mouseleave', () => {
        div.style.transform = '';
        div.style.boxShadow = '';
    });

    return div;
}

// Delete class file
window.deleteClassFile = async function (fileId, event) {
    if (event) event.stopPropagation();

    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
        const response = await fetch('/Classes/DeleteClassFile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(fileId) // Controller expects int directly as body or object depending on binding
            // Changed controller to [FromBody] int fileId, so standard JSON integer is fine
        });

        const data = await response.json();

        if (data.success) {
            // Remove element or reload
            const classId = window.__currentClassPrivacy?.classId || window.__currentClassId;
            if (classId) window.loadFullClassFiles(classId);

            // Show toast
            const successDiv = document.getElementById('cls-files-success');
            if (successDiv) {
                successDiv.textContent = 'File deleted successfully';
                successDiv.style.display = 'block';
                setTimeout(() => successDiv.style.display = 'none', 3000);
            }
        } else {
            alert(data.error || 'Failed to delete file');
        }
    } catch (e) {
        alert('Error deleting file: ' + e.message);
    }
};

// Get file icon color based on extension
function getFileIconColor(extension) {
    const colors = {
        pdf: 'bg-danger-subtle text-danger',
        doc: 'bg-primary-subtle text-primary',
        docx: 'bg-primary-subtle text-primary',
        txt: 'bg-secondary-subtle text-secondary',
        jpg: 'bg-success-subtle text-success',
        jpeg: 'bg-success-subtle text-success',
        png: 'bg-success-subtle text-success',
        gif: 'bg-success-subtle text-success',
        ppt: 'bg-warning-subtle text-warning',
        pptx: 'bg-warning-subtle text-warning',
        xls: 'bg-info-subtle text-info',
        xlsx: 'bg-info-subtle text-info'
    };
    return colors[extension] || 'bg-light text-muted';
}

// Get file icon based on extension
function getFileIcon(extension) {
    const icons = {
        pdf: 'bi bi-file-earmark-pdf',
        doc: 'bi bi-file-earmark-word',
        docx: 'bi bi-file-earmark-word',
        txt: 'bi bi-file-earmark-text',
        jpg: 'bi bi-file-earmark-image',
        jpeg: 'bi bi-file-earmark-image',
        png: 'bi bi-file-earmark-image',
        gif: 'bi bi-file-earmark-image',
        ppt: 'bi bi-file-earmark-slides',
        pptx: 'bi bi-file-earmark-slides',
        xls: 'bi bi-file-earmark-excel',
        xlsx: 'bi bi-file-earmark-excel'
    };
    return icons[extension] || 'bi bi-file-earmark';
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Upload class file
window.uploadClassFile = async function (input) {
    const classId = window.__currentClassPrivacy?.classId || window.__currentClassId;
    if (!classId) {
        alert('No class selected');
        return;
    }

    const file = input.files[0];
    if (!file) return;

    const errorDiv = document.getElementById('cls-files-error');
    const successDiv = document.getElementById('cls-files-success');

    try {
        if (errorDiv) errorDiv.style.display = 'none';
        if (successDiv) successDiv.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('classId', classId);

        const response = await fetch('/Classes/UploadFile', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Upload failed');

        if (successDiv) {
            successDiv.textContent = 'File uploaded successfully!';
            successDiv.style.display = 'block';
            setTimeout(() => successDiv.style.display = 'none', 3000);
        }

        // Reload files list
        await window.loadFullClassFiles(classId);

        // Update file count in class details
        const fileCountEl = document.getElementById('cls-stat-files');
        if (fileCountEl) {
            const currentCount = parseInt(fileCountEl.textContent) || 0;
            fileCountEl.textContent = currentCount + 1;
        }
    } catch (error) {
        if (errorDiv) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
        }
    } finally {
        input.value = ''; // Reset input
    }
};

// Listen for files panel opening
document.addEventListener('DOMContentLoaded', () => {
    const filesPanel = document.getElementById('cls-files-panel-advanced');
    if (filesPanel) {
        // Use MutationObserver to detect when panel opens
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (filesPanel.classList.contains('show')) {
                        const classId = window.__currentClassPrivacy?.classId || window.__currentClassId; // Fallback
                        if (classId) {
                            window.loadFullClassFiles(classId);
                        }
                    }
                }
            });
        });

        observer.observe(filesPanel, { attributes: true });
    }
});

// Search files functionality
let allClassFiles = []; // Store all files for filtering

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('cls-files-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterFilesBySearch(query);
        });
    }
});

function filterFilesBySearch(query) {
    const fileItems = document.querySelectorAll('.cls-file-item');
    let visibleCount = 0;

    fileItems.forEach(item => {
        const fileName = item.querySelector('.fw-medium')?.textContent.toLowerCase() || '';
        if (fileName.includes(query)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    updateEmptyState(visibleCount);
}

// Filter files by type
window.filterClassFiles = function (type) {
    const fileItems = document.querySelectorAll('.cls-file-item');
    const filterButtons = document.querySelectorAll('[data-filter]');
    let visibleCount = 0;

    // Update active button
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === type) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (type === 'all') {
        fileItems.forEach(item => {
            item.style.display = '';
            visibleCount++;
        });
    } else {
        fileItems.forEach(item => {
            const fileName = item.querySelector('.fw-medium')?.textContent || '';
            const extension = fileName.split('.').pop().toLowerCase();
            let shouldShow = false;

            if (type === 'pdf' && extension === 'pdf') {
                shouldShow = true;
            } else if (type === 'doc' && (extension === 'doc' || extension === 'docx' || extension === 'txt')) {
                shouldShow = true;
            } else if (type === 'image' && ['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
                shouldShow = true;
            }

            item.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
    }

    updateEmptyState(visibleCount);
};

function updateEmptyState(visibleCount) {
    const emptyState = document.getElementById('cls-files-empty');
    const filesList = document.getElementById('cls-files-list');

    if (visibleCount === 0 && filesList && filesList.children.length > 0) {
        if (emptyState) {
            emptyState.style.display = 'block';
            emptyState.querySelector('p').textContent = 'No files match your search';
        }
        if (filesList) filesList.style.display = 'none';
    } else if (visibleCount > 0) {
        if (emptyState) emptyState.style.display = 'none';
        if (filesList) filesList.style.display = 'block';
    }
}
