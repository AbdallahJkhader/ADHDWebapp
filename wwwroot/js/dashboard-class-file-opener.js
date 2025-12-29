// Open class file in the app's viewer or new tab
window.openClassFile = async function (fileId, fileName, openInViewer = false) {
    try {
        // Fallback: fetch file info from server
        const response = await fetch(`/Classes/GetClassFile?fileId=${fileId}`, {
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success && data.filePath) {
            // Reset AI tools content for new file
            if (window.clearAIContent) window.clearAIContent();

            if (openInViewer) {
                // Open in internal viewer (left panel)
                window.setLeftView('viewer');

                const contentDisplay = document.getElementById('content-display');
                const filenameDisplay = document.querySelectorAll('.filename-display');

                filenameDisplay.forEach(el => el.textContent = fileName || 'File');

                if (contentDisplay) {
                    contentDisplay.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">Loading file...</div></div>';

                    const ext = fileName.split('.').pop().toLowerCase();
                    let type = 'unknown';
                    if (/^(png|jpg|jpeg|gif|webp)$/.test(ext)) type = 'image';
                    else if (/^(mp4|webm|ogg|mov|avi|mkv)$/.test(ext)) type = 'video';
                    else if (ext === 'pdf') type = 'pdf';
                    else if (/^(txt|md|js|css|html|xml|json|cs)$/.test(ext)) type = 'text';

                    if (type === 'video') {
                        if (window.openVideoRight && window.playVideo) {
                            window.openVideoRight();
                            // Pass 'saved' type to treat URL as direct source
                            window.playVideo('saved', data.filePath, fileName);
                        } else {
                            alert("Video player not available.");
                        }
                        // Clear loading spinner in left pane
                        if (contentDisplay) contentDisplay.innerHTML = '';
                        return;
                    }

                    if (type === 'image') {
                        contentDisplay.innerHTML = `<div class="text-center h-100 d-flex align-items-center justify-content-center" style="background:#f8f9fa;"><img src="${data.filePath}" style="max-width:100%; max-height:100%; object-fit:contain; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" /></div>`;
                        contentDisplay.contentEditable = "false";
                    } else if (type === 'pdf') {
                        // Use object with iframe fallback for better PDF display
                        contentDisplay.innerHTML = `<object data="${data.filePath}" type="application/pdf" style="width:100%; height:100%; min-height:600px;"><iframe src="${data.filePath}" style="width:100%; height:100%; min-height:600px; border:none;"></iframe></object>`;
                        contentDisplay.contentEditable = "false";
                        contentDisplay.style.height = '100%';
                        contentDisplay.style.minHeight = '600px';
                    } else {
                        // Default to iframe for other types
                        contentDisplay.innerHTML = `<iframe src="${data.filePath}" style="width:100%; height:100%; border:none;"></iframe>`;
                        contentDisplay.contentEditable = "false";
                    }
                }
            } else {
                // Open file in new tab (default behavior)
                window.open(data.filePath, '_blank');
            }
        } else {
            throw new Error(data.error || 'File not found');
        }
    } catch (error) {
        console.error('Error opening class file:', error);
        alert('Error opening file: ' + error.message);
    }
};

