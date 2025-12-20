// File View Time Tracking
let fileViewStartTime = null;
let currentViewingFileId = null;

// Start tracking when file is opened
window.startFileViewTracking = function (fileId) {
    fileViewStartTime = Date.now();
    currentViewingFileId = fileId;
};

// Stop tracking and send duration when leaving file
window.stopFileViewTracking = async function () {
    if (!fileViewStartTime || !currentViewingFileId) return;

    const durationMs = Date.now() - fileViewStartTime;
    const durationMinutes = Math.round(durationMs / 60000); // Convert to minutes

    if (durationMinutes > 0) {
        try {
            await fetch('/Dashboard/RecordFileView', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    fileId: currentViewingFileId,
                    duration: durationMinutes
                })
            });
        } catch (e) {
            console.error('Failed to record file view:', e);
        }
    }

    fileViewStartTime = null;
    currentViewingFileId = null;
};

// Track when user leaves page
window.addEventListener('beforeunload', () => {
    if (window.stopFileViewTracking) {
        window.stopFileViewTracking();
    }
});
