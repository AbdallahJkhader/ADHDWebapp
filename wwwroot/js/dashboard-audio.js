// Global variables for audio/video recording
let mediaRecorder = null;
let audioChunks = [];
let audioRecordings = [];
let audioStartTime = 0;
let audioTimerInterval = null;


function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateAudioTimer() {
    const now = Date.now();
    const diff = (now - audioStartTime) / 1000;
    const timerEl = document.getElementById('audio-timer');
    if (timerEl) timerEl.textContent = formatTime(diff);

    // Show timer display when recording
    const timerDisplay = document.getElementById('audio-timer-display');
    if (timerDisplay && mediaRecorder && mediaRecorder.state === 'recording') {
        timerDisplay.style.display = 'block';
    }
}

function renderAudioList() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    // Load saved audios from server
    loadSavedAudios();
}

// Load saved audios from server
async function loadSavedAudios() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    console.log('Loading saved audios...');

    try {
        const res = await fetch('/Dashboard/GetAudioFiles', {
            method: 'GET',
            credentials: 'same-origin'
        });

        console.log('GetAudioFiles response status:', res.status);

        const data = await res.json().catch(() => null);
        console.log('GetAudioFiles response data:', data);

        if (!res.ok || !data || data.success !== true) {
            console.log('Server failed, showing session audios only');
            // If server fails, show current session audios only
            renderSessionAudios();
            return;
        }

        const savedAudios = data.audios || [];
        console.log('Saved audios loaded:', savedAudios.length);

        if (savedAudios.length === 0 && audioRecordings.length === 0) {
            console.log('No audios to display');
            container.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <i class="bi bi-mic-mute fs-4 d-block mb-2"></i>
                    No recordings yet
                </div>`;
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Render saved audios first
        savedAudios.forEach(audio => {
            console.log('Adding saved audio:', audio.fileName);
            addSavedAudioToList(audio);
        });

        // Render session audios (recorded audios)
        audioRecordings.forEach(rec => {
            console.log('Adding session audio:', rec.duration);
            addSessionAudioToList(rec);
        });

    } catch (error) {
        console.error('Failed to load saved audios:', error);
        renderSessionAudios();
    }
}

// Render session audios only (fallback)
function renderSessionAudios() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    if (audioRecordings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <i class="bi bi-mic-mute fs-4 d-block mb-2"></i>
                No recordings yet
            </div>`;
        return;
    }

    container.innerHTML = '';
    audioRecordings.forEach(rec => {
        addSessionAudioToList(rec);
    });
}

window.deleteAudio = async function (type, id, element) {
    console.log('🗑️ DELETE AUDIO CALLED:', { type, id });
    if (!confirm('Are you sure you want to delete this audio?')) return;

    if (type === 'saved') {
        try {
            console.log('📡 Sending DELETE request to /Dashboard/DeleteFiles with:', [id]);
            const res = await fetch('/Dashboard/DeleteFiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify([id])
            });
            console.log('📥 Response status:', res.status, res.statusText);
            const data = await res.json();
            console.log('📦 Response data:', data);
            if (data.success) {
                console.log('✅ Delete successful, removing element');
                element.remove();

                // Update empty state if needed
                const container = document.getElementById('audio-list-container');
                if (container && container.children.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-5 text-muted small">
                            <i class="bi bi-mic p-3 rounded-circle bg-light fs-1 mb-2 d-inline-block text-danger opacity-50"></i>
                            <p class="mb-0">No recordings yet</p>
                        </div>`;
                }
            } else {
                console.error('❌ Delete failed:', data.error);
                alert('Failed to delete: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('💥 Exception during delete:', err);
            alert('Error deleting file');
        }
    } else {
        // Session recording
        const index = audioRecordings.findIndex(r => r.id === id);
        if (index > -1) {
            audioRecordings.splice(index, 1);
            element.remove();
            // Update empty state if needed
            const container = document.getElementById('audio-list-container');
            if (container && container.children.length === 0) {
                container.innerHTML = `
                     <div class="text-center py-5 text-muted small">
                         <i class="bi bi-mic p-3 rounded-circle bg-light fs-1 mb-2 d-inline-block text-danger opacity-50"></i>
                         <p class="mb-0">No recordings yet</p>
                     </div>`;
            }
        }
    }
};

// Add saved audio to list
function addSavedAudioToList(audio) {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center bg-transparent border-danger-subtle';
    listItem.style.cursor = 'pointer';

    // Store audio data
    listItem.dataset.audioType = 'saved';
    listItem.dataset.audioSource = audio.filePath;
    listItem.dataset.audioFileName = audio.fileName;

    const fileSize = (audio.fileSize / 1024 / 1024).toFixed(2) + ' MB';

    listItem.innerHTML = `
        <div class="bg-danger rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; opacity: 0.1;">
            <i class="bi bi-music-note-beamed text-danger"></i>
        </div>
        <div class="flex-grow-1">
            <div class="fw-medium text-dark">${audio.fileName}</div>
            <small class="text-muted"><span class="badge bg-light text-secondary border">Saved</span> • ${fileSize}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-circle p-0 ms-2" style="width: 32px; height: 32px;" onclick="event.stopPropagation(); deleteAudio('saved', ${audio.id}, this.closest('.list-group-item'))">
            <i class="bi bi-trash"></i>
        </button>
    `;

    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playAudio('saved', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(listItem);
}

// Add session audio (recorded) to list
function addSessionAudioToList(rec) {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center bg-transparent border-danger-subtle';
    item.style.cursor = 'pointer';

    item.dataset.audioType = 'recorded';
    item.dataset.audioSource = rec.url;
    item.dataset.audioFileName = `Recording ${rec.duration}`;

    item.innerHTML = `
        <div class="bg-danger rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; opacity: 0.1;">
            <i class="bi bi-mic-fill text-danger"></i>
        </div>
        <div class="flex-grow-1">
            <div class="fw-medium text-dark">Recording ${rec.duration}</div>
            <small class="text-muted"><span class="badge bg-danger-subtle text-danger border border-danger-subtle">New</span></small>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-circle p-0 ms-2" style="width: 32px; height: 32px;" onclick="event.stopPropagation(); deleteAudio('session', ${rec.id}, this.closest('.list-group-item'))">
            <i class="bi bi-trash"></i>
        </button>
    `;

    item.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playAudio('recorded', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(item);
}

// Open and close audio panel functions
window.openAudioRight = function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    // Hide other containers
    if (typeof window.hideAllRightContainers === 'function') {
        window.hideAllRightContainers();
    } else {
        const ids = ['summary-display-container', 'flashcards-display-container', 'whiteboard-display-container', 'audio-display-container', 'video-display-container'];
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
    }

    const audioContainer = document.getElementById('audio-display-container');
    if (!audioContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';

    audioContainer.style.display = 'block';

    const rightPane = audioContainer.closest('.right-side');
    if (rightPane) rightPane.scrollTop = 0;

    renderAudioList();
    initAudioRecording();
};

window.backFromAudioRight = function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const audioContainer = document.getElementById('audio-display-container');

    if (audioContainer) audioContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';
};

// Initialize audio recording button
function initAudioRecording() {
    const recordBtn = document.getElementById('audio-record-btn');
    if (!recordBtn || recordBtn.dataset.bound === '1') return;

    recordBtn.dataset.bound = '1';
    recordBtn.addEventListener('click', toggleAudioRecording);
}

async function toggleAudioRecording() {
    const recordBtn = document.getElementById('audio-record-btn');
    const visualCircle = document.getElementById('audio-visual-circle');
    const recordIcon = document.getElementById('audio-record-icon');
    const timerDisplay = document.getElementById('audio-timer-display');
    const timerEl = document.getElementById('audio-timer');
    const statusEl = document.getElementById('audio-status');
    const textContainer = document.getElementById('audio-texts');

    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        // Start recording
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const duration = formatTime((Date.now() - audioStartTime) / 1000);

                audioRecordings.push({
                    id: Date.now(),
                    url: audioUrl,
                    blob: audioBlob,
                    duration: duration
                });

                renderAudioList();

                // UI Reset on Stop
                if (timerDisplay) timerDisplay.style.display = 'none';
                if (textContainer) textContainer.style.display = 'block';

                if (visualCircle) {
                    visualCircle.classList.remove('bg-danger', 'shadow-lg');
                    visualCircle.classList.add('bg-danger-subtle');
                }
                if (recordIcon) {
                    recordIcon.className = 'bi bi-mic-fill fs-1 text-danger';
                }

                if (timerEl) timerEl.textContent = '00:00';
            };

            mediaRecorder.start();
            audioStartTime = Date.now();
            audioTimerInterval = setInterval(updateAudioTimer, 1000);

            // UI Update for Recording
            if (textContainer) textContainer.style.display = 'none';
            if (timerDisplay) timerDisplay.style.display = 'block';

            if (visualCircle) {
                visualCircle.classList.remove('bg-danger-subtle');
                visualCircle.classList.add('bg-danger', 'shadow-lg'); // Solid red
            }
            if (recordIcon) {
                recordIcon.className = 'bi bi-stop-fill fs-1 text-white'; // White stop icon
            }
            if (statusEl) statusEl.textContent = 'Recording...';

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone. Please check permissions.');
        }
    } else {
        // Stop recording
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        clearInterval(audioTimerInterval);
        // UI reset happens in onstop event logic above
    }
}

window.playAudio = function (type, source, fileName) {
    const playerContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');

    if (!playerContainer || !audioPlayer) return;

    playerContainer.style.display = 'block';
    audioPlayer.src = source;
    audioPlayer.load();
    audioPlayer.play().catch(e => {
        console.log('Auto-play failed:', e);
    });
};

window.handleAudioUpload = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file.');
        return;
    }

    const audio = document.createElement('audio');
    audio.src = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', function () {
        const duration = formatTime(audio.duration);
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

        // Add to session recordings
        audioRecordings.push({
            id: Date.now(),
            url: audio.src,
            blob: file,
            duration: duration,
            fileName: fileName,
            fileSize: fileSize
        });

        renderAudioList();
        event.target.value = '';
    });
};

// Add event listener for Audio Card
document.addEventListener('DOMContentLoaded', () => {
    const audioCard = document.getElementById('gen-opt-audio');
    if (audioCard) {
        audioCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openAudioRight) {
                window.openAudioRight();
            }
        });
    }
});

// End of Audio Module
