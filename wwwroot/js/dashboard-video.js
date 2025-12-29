// Video Management Module
let videoRecordings = [];

// Handle video file upload
window.handleVideoUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
        alert('Please select a video file.');
        return;
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    video.addEventListener('loadedmetadata', function () {
        const duration = video.duration;
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

        addUploadedVideoToList(fileName, duration, fileSize, 'upload', file);
        event.target.value = '';
    });
};

function formatVideoDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

window.showYouTubeInput = function () {
    const container = document.getElementById('youtube-input-container');
    if (container) {
        container.style.display = 'block';
        document.getElementById('youtube-url-input').focus();
    }
};

window.hideYouTubeInput = function () {
    const container = document.getElementById('youtube-input-container');
    const input = document.getElementById('youtube-url-input');
    if (container) {
        container.style.display = 'none';
        if (input) input.value = '';
    }
};

window.addYouTubeVideo = function () {
    const input = document.getElementById('youtube-url-input');
    const url = input.value.trim();

    if (!url) {
        alert('Please enter a YouTube URL.');
        return;
    }

    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        alert('Please enter a valid YouTube URL.');
        return;
    }

    let videoId = '';
    let title = 'YouTube Video';

    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (videoId) {
        title = `YouTube Video (${videoId})`;
    }

    addUploadedVideoToList(title, 'Unknown', 'Stream', 'youtube', url);
    hideYouTubeInput();
};

function addUploadedVideoToList(fileName, duration, fileSize, type, source) {
    const videoList = document.getElementById('video-list-container');
    if (!videoList) return;

    const noVideos = videoList.querySelector('.text-center.py-4');
    if (noVideos) {
        noVideos.remove();
    }

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    // Store video data for playback
    listItem.dataset.videoType = type;
    listItem.dataset.videoSource = type === 'youtube' ? source : URL.createObjectURL(source);
    listItem.dataset.videoFileName = fileName;

    const icon = type === 'youtube' ? 'youtube' : 'file'; // Ensure correct icon name usage

    listItem.innerHTML = `
        <img src="/images/${icon}.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${fileName}</div>
            <small class="text-muted">${type === 'youtube' ? 'YouTube Stream' : `${formatVideoDuration(duration)} • ${fileSize}`}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playVideo(this.dataset.videoType, this.dataset.videoSource, this.dataset.videoFileName);
    });

    videoList.appendChild(listItem);
}




window.deleteVideo = async function (id, element) {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
        const res = await fetch('/Dashboard/DeleteFiles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([id])
        });
        const data = await res.json();
        if (data.success) {
            element.remove();
            Swal.fire(
                'Deleted!',
                'Your file has been deleted.',
                'success'
            );
        } else {
            Swal.fire('Error', 'Failed to delete: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Error: ' + e.message, 'error');
    }
};

window.playVideo = function (type, source, fileName) {
    const playerContainer = document.getElementById('video-player-container');
    const videoPlayer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');
    const videoTitle = document.getElementById('video-title');
    const uploadArea = document.getElementById('video-upload-area');
    const youtubeInput = document.getElementById('youtube-input-container');
    const saveBtn = document.getElementById('save-video-btn');

    if (!playerContainer || !videoPlayer) return;

    if (uploadArea) uploadArea.style.display = 'none';
    if (youtubeInput) youtubeInput.style.display = 'none';

    playerContainer.style.display = 'block';

    if (videoTitle) videoTitle.textContent = fileName;

    // Show save button for both types now
    if (saveBtn) {
        saveBtn.style.display = 'inline-block';
        // Removed logic that hid save button for saved videos
    }

    videoPlayer.pause();
    videoPlayer.src = '';
    videoPlayer.style.display = 'none';

    if (youtubePlayer) {
        youtubePlayer.src = '';
        youtubePlayer.style.display = 'none';
        delete youtubePlayer.dataset.originalUrl;
    }

    if (type === 'youtube' || (type === 'saved' && source.includes('http'))) { // Handle saved youtube links
        // For saved links, source IS the url
        // Check if it's a youtube link
        if (source.includes('youtube.com') || source.includes('youtu.be')) {
            let videoId = '';
            if (source.includes('youtube.com/watch?v=')) {
                videoId = source.split('v=')[1]?.split('&')[0];
            } else if (source.includes('youtu.be/')) {
                videoId = source.split('youtu.be/')[1]?.split('?')[0];
            } else if (source.includes('embed/')) {
                videoId = source.split('embed/')[1]?.split('?')[0];
            }

            if (videoId && youtubePlayer) {
                youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                youtubePlayer.style.display = 'block';
                youtubePlayer.dataset.originalUrl = source;
            } else {
                alert('Invalid YouTube URL');
                closeVideoPlayer();
                return;
            }
        } else {
            // It might be a regular video file served via URL? 
            // Existing logic assumed only 'youtube' type or file blob/path.
            // If it's a saved file, source is filePath (e.g. /uploads/video.mp4)
            videoPlayer.style.display = 'block';
            videoPlayer.src = source;
            videoPlayer.load();
            videoPlayer.play().catch(e => console.log(e));
        }
    } else {
        videoPlayer.style.display = 'block';
        videoPlayer.src = source;
        videoPlayer.load();
        videoPlayer.play().catch(e => {
            console.log('Auto-play failed:', e);
        });
    }
};

window.closeVideoPlayer = function () {
    const playerContainer = document.getElementById('video-player-container');
    const videoPlayer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');
    const uploadArea = document.getElementById('video-upload-area');
    const saveBtn = document.getElementById('save-video-btn');
    const videoTitle = document.getElementById('video-title');

    if (videoPlayer) {
        videoPlayer.pause();
        videoPlayer.src = '';
    }
    if (youtubePlayer) {
        youtubePlayer.src = '';
        delete youtubePlayer.dataset.originalUrl;
    }

    if (playerContainer) playerContainer.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'none'; // Hide save button when returning to list
    if (videoTitle) videoTitle.textContent = 'Video Notes';

    if (uploadArea) {
        uploadArea.style.display = 'block';
        // Refresh list just in case
        renderVideoList();
    }
};

window.saveCurrentVideo = async function () {
    const videoPlayer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');
    const videoTitle = document.getElementById('video-title');

    let fileName = videoTitle ? videoTitle.textContent.replace('Video Notes', '').trim() : '';
    if (!fileName) fileName = 'video';

    // Check if YouTube is active
    if (youtubePlayer && youtubePlayer.style.display !== 'none' && youtubePlayer.dataset.originalUrl) {
        try {
            const res = await fetch('/Dashboard/SaveVideoLink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    title: fileName,
                    url: youtubePlayer.dataset.originalUrl
                })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data || data.success !== true) {
                alert('Save failed: ' + (data?.error || 'Unknown error'));
                return;
            }

            // Success UI feedback
            const saveBtn = document.getElementById('save-video-btn');
            if (saveBtn) {
                const originalText = saveBtn.innerHTML;
                saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Saved!';
                saveBtn.classList.remove('btn-success');
                saveBtn.classList.add('btn-outline-success');
                saveBtn.disabled = true;
                setTimeout(() => {
                    saveBtn.innerHTML = originalText;
                    saveBtn.classList.remove('btn-outline-success');
                    saveBtn.classList.add('btn-success');
                    saveBtn.disabled = false;
                }, 2000);
            }

            // Add to list? reload logic handles it usually on next open, but could add manually.
            loadSavedVideos();

        } catch (e) {
            alert('Failed to save YouTube link: ' + e.message);
        }
        return;
    }

    if (!videoPlayer || !videoPlayer.src) {
        alert('No video to save');
        return;
    }

    try {
        if (videoPlayer.src.includes('youtube.com')) {
            // Should have been handled above, but just in case
            alert('YouTube videos cannot be saved. Please download them directly from YouTube.');
            return;
        }

        const response = await fetch(videoPlayer.src);
        const blob = await response.blob();

        const reader = new FileReader();
        reader.onloadend = async function () {
            const base64data = reader.result;

            try {
                const res = await fetch('/Dashboard/SaveVideo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        fileName: fileName,
                        videoData: base64data,
                        contentType: blob.type
                    })
                });

                const data = await res.json().catch(() => null);
                if (!res.ok || !data || data.success !== true) {
                    const msg = (data && data.error) ? data.error : `Save failed (HTTP ${res.status})`;
                    alert(msg);
                    return;
                }

                const saveBtn = document.getElementById('save-video-btn');
                if (saveBtn) {
                    const originalText = saveBtn.innerHTML;
                    saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Saved!';
                    saveBtn.classList.remove('btn-success');
                    saveBtn.classList.add('btn-outline-success');
                    saveBtn.disabled = true;

                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.classList.remove('btn-outline-success');
                        saveBtn.classList.add('btn-success');
                        saveBtn.disabled = false;
                    }, 2000);
                }

                loadSavedVideos();

            } catch (saveError) {
                alert('Failed to save video: ' + saveError.message);
            }
        };

        reader.readAsDataURL(blob);

    } catch (error) {
        alert('Failed to process video: ' + error.message);
    }
};

window.openVideoRight = function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    // Hide other containers
    if (typeof window.hideAllRightContainers === 'function') {
        window.hideAllRightContainers();
    } else {
        // Fallback if UI not loaded yet?
        const ids = ['summary-display-container', 'flashcards-display-container', 'whiteboard-display-container', 'audio-display-container', 'video-display-container'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    }

    const videoContainer = document.getElementById('video-display-container');
    if (!videoContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';

    videoContainer.style.display = 'flex';

    const rightPane = videoContainer.closest('.right-side');
    if (rightPane) rightPane.scrollTop = 0;

    renderVideoList();
};

window.backFromVideoRight = function () {
    const playerContainer = document.getElementById('video-player-container');

    // If player is visible, just close it and return to list
    if (playerContainer && playerContainer.style.display !== 'none' && playerContainer.style.display !== '') {
        closeVideoPlayer();
        return;
    }

    // Otherwise, exit the entire video view
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const videoContainer = document.getElementById('video-display-container');

    if (videoContainer) videoContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';
};

window.renderVideoList = function () {
    loadSavedVideos();
};

async function loadSavedVideos() {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    try {
        const res = await fetch('/Dashboard/GetVideoFiles', {
            method: 'GET',
            credentials: 'same-origin'
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.success !== true) {
            renderSessionVideos();
            return;
        }

        const savedVideos = data.videos || [];

        if (savedVideos.length === 0 && videoRecordings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <img src="/images/youtube.png" alt="No videos" style="width: 32px; height: 32px; opacity: 0.5;" class="d-block mb-2">
                    No videos yet
                </div>`;
            return;
        }

        container.innerHTML = '';
        savedVideos.forEach(video => {
            addSavedVideoToList(video);
        });
        videoRecordings.forEach(rec => {
            addSessionVideoToList(rec);
        });

    } catch (error) {
        console.error('Failed to load saved videos:', error);
        renderSessionVideos();
    }
}

function renderSessionVideos() {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    if (videoRecordings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <img src="/images/youtube.png" alt="No videos" style="width: 32px; height: 32px; opacity: 0.5;" class="d-block mb-2">
                No videos yet
            </div>`;
        return;
    }

    container.innerHTML = '';
    videoRecordings.forEach(rec => {
        addSessionVideoToList(rec);
    });
}

function addSavedVideoToList(video) {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    listItem.dataset.videoType = 'saved';
    listItem.dataset.videoSource = video.filePath;
    listItem.dataset.videoFileName = video.fileName;

    // Detect if it's a YouTube link stored as a "file"
    const isYoutube = video.contentType === 'video/youtube' || video.filePath.includes('youtube.com') || video.filePath.includes('youtu.be');
    const icon = isYoutube ? 'youtube' : 'file';
    const subText = isYoutube ? 'YouTube Stream' : 'Saved Video';

    // File size only if not youtube
    const fileSizeText = isYoutube ? '' : ` • ${(video.fileSize / 1024 / 1024).toFixed(2) + ' MB'}`;

    listItem.innerHTML = `
        <img src="/images/${icon}.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${video.fileName}</div>
            <small class="text-muted">${subText}${fileSizeText}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteVideo(${video.id}, this.parentElement)">
            <i class="bi bi-trash"></i>
        </button>
    `;

    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playVideo('saved', this.dataset.videoSource, this.dataset.videoFileName);
    });

    container.appendChild(listItem);
}

function addSessionVideoToList(rec) {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center';
    item.style.cursor = 'pointer';

    item.dataset.videoType = 'youtube';
    item.dataset.videoSource = rec.url;
    item.dataset.videoFileName = rec.title;

    item.innerHTML = `
        <img src="/images/youtube.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${rec.title}</div>
            <small class="text-muted">YouTube Stream</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    item.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playVideo('youtube', this.dataset.videoSource, this.dataset.videoFileName);
    });

    container.appendChild(item);
}

// Add event listener for Video Card
document.addEventListener('DOMContentLoaded', () => {
    const videoCard = document.getElementById('gen-opt-ai');
    if (videoCard) {
        videoCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openVideoRight) {
                window.openVideoRight();
            }
        });
    }
});
