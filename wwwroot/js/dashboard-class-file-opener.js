// Open class file in the app's viewer or new tab
window.openClassFile = async function (fileId, fileName) {
    try {
        // Try to get the file path from the file item in DOM
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`)?.closest('.cls-file-item');
        if (fileItem && fileItem.dataset.filePath) {
            // Open file directly in new tab
            window.open(fileItem.dataset.filePath, '_blank');
            return;
        }

        // Fallback: fetch file info from server
        const response = await fetch(`/Classes/GetClassFile?fileId=${fileId}`, {
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (data.success && data.filePath) {
            // Open file in new tab
            window.open(data.filePath, '_blank');
        } else {
            throw new Error(data.error || 'File not found');
        }
    } catch (error) {
        console.error('Error opening class file:', error);
        alert('Error opening file: ' + error.message);
    }
};

