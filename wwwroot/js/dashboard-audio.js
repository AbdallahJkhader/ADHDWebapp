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

// Add saved audio to list
function addSavedAudioToList(audio) {
    const container = document.getElementById('audio-list-container');
    if (!container) {
        console.log('Audio list container not found!');
        return;
    }

    console.log('Adding saved audio to list:', audio);

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    // Store audio data for playback
    listItem.dataset.audioType = 'saved';
    listItem.dataset.audioSource = audio.filePath;
    listItem.dataset.audioFileName = audio.fileName;

    const fileSize = (audio.fileSize / 1024 / 1024).toFixed(2) + ' MB';

    listItem.innerHTML = `
        <img src="/images/audio icon.png" alt="Audio" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${audio.fileName}</div>
            <small class="text-muted">Saved Audio • ${fileSize}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play audio
    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        console.log('Playing saved audio:', audio.fileName);
        playAudio('saved', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(listItem);
    console.log('Saved audio item added to container');
}

// Add session audio (recorded) to list
function addSessionAudioToList(rec) {
    const container = document.getElementById('audio-list-container');
    if (!container) {
        console.log('Audio list container not found!');
        return;
    }

    console.log('Adding session audio to list:', rec);

    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center';
    item.style.cursor = 'pointer';

    // Store audio data for playback
    item.dataset.audioType = 'recorded';
    item.dataset.audioSource = rec.url;
    item.dataset.audioFileName = `Recording ${rec.duration}`;

    item.innerHTML = `
        <img src="/images/audio icon.png" alt="Audio" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">Recording ${rec.duration}</div>
            <small class="text-muted">Session Recording</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play audio
    item.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        console.log('Playing session audio:', rec.duration);
        playAudio('recorded', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(item);
    console.log('Session audio item added to container');
}

// Play audio function
window.playAudio = window.playAudio || function (type, source, fileName) {
    console.log('=== PLAY AUDIO START ===');
    console.log('Playing audio:', { type, source, fileName });

    const audioContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');
    const audioTitle = document.getElementById('audio-title');
    const audioList = document.getElementById('audio-list-container');
    const saveBtn = document.getElementById('save-audio-btn');

    console.log('Audio elements found:', {
        audioContainer: !!audioContainer,
        audioPlayer: !!audioPlayer,
        audioTitle: !!audioTitle,
        audioList: !!audioList,
        saveBtn: !!saveBtn
    });

    if (!audioContainer || !audioPlayer) {
        console.log('❌ Missing required audio elements');
        console.log('audioContainer:', audioContainer);
        console.log('audioPlayer:', audioPlayer);
        return;
    }

    console.log('✅ All elements found');

    // Hide audio list and show player
    console.log('Before: audioList.style.display =', audioList ? audioList.style.display : 'not found');
    console.log('Before: audioContainer.style.display =', audioContainer.style.display);

    if (audioList) {
        audioList.style.display = 'none';
        console.log('After: audioList.style.display =', audioList.style.display);
    }

    audioContainer.style.display = 'block';
    console.log('After: audioContainer.style.display =', audioContainer.style.display);

    // Set audio title
    if (audioTitle) {
        audioTitle.textContent = fileName;
        console.log('Set audio title to:', fileName);
    }

    // Show save button only for recorded audios (not saved)
    if (saveBtn) {
        if (type === 'saved') {
            saveBtn.style.display = 'none';
            console.log('Hide save button (saved audio)');
        } else {
            saveBtn.style.display = 'inline-block';
            console.log('Show save button (recorded audio)');
        }
    }

    // Load audio based on type
    if (type === 'saved') {
        // For saved audios, use the file path
        console.log('Loading saved audio from:', source);
        audioPlayer.src = source;
    } else {
        // For recorded audios (current session)
        console.log('Loading recorded audio from:', source);
        audioPlayer.src = source;
    }

    console.log('Audio player src set to:', audioPlayer.src);

    // Load and play audio
    console.log('Loading and playing audio...');

    audioPlayer.addEventListener('loadeddata', function () {
        console.log('✅ Audio data loaded successfully');
    });

    audioPlayer.addEventListener('error', function (e) {
        console.log('❌ Audio player error:', e);
        console.log('Audio player error code:', audioPlayer.error);
    });

    audioPlayer.load();
    audioPlayer.play().then(() => {
        console.log('✅ Audio playing successfully');
    }).catch(e => {
        console.log('❌ Auto-play failed:', e);
    });

    console.log('=== PLAY AUDIO END ===');
};

// Close audio player function
window.closeAudioPlayer = window.closeAudioPlayer || function () {
    const audioContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');
    const audioList = document.getElementById('audio-list-container');
    const audioTitle = document.getElementById('audio-title');
    const saveBtn = document.getElementById('save-audio-btn');

    if (!audioContainer || !audioPlayer) return;

    // Stop audio and clear source
    audioPlayer.pause();
    audioPlayer.src = '';

    // Hide audio player
    audioContainer.style.display = 'none';

    // Show audio list
    if (audioList) audioList.style.display = 'block';

    // Reset audio title
    if (audioTitle) audioTitle.textContent = 'Audio Notes';

    // Hide save button
    if (saveBtn) saveBtn.style.display = 'none';
};

function initAudioRecorder() {
    const btn = document.getElementById('audio-record-btn');
    const status = document.getElementById('audio-status');
    const timer = document.getElementById('audio-timer');

    console.log('Initializing audio recorder...');
    console.log('Record button found:', !!btn);
    console.log('Status element found:', !!status);
    console.log('Timer element found:', !!timer);

    if (!btn) {
        console.error('Record button not found!');
        return;
    }
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.onclick = async () => {
        console.log('Record button clicked');
        console.log('Current mediaRecorder state:', mediaRecorder ? mediaRecorder.state : 'null');

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('Stopping recording...');
            // Stop recording
            mediaRecorder.stop();
            clearInterval(audioTimerInterval);
            btn.classList.remove('btn-danger', 'recording-pulse');
            btn.classList.add('btn-outline-danger');
            btn.innerHTML = '<i class="bi bi-mic-fill fs-2"></i>';
            if (status) status.textContent = 'Click to Record';
            if (timer) timer.textContent = '00:00';
        } else {
            console.log('Starting recording...');
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone access granted');
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    console.log('Audio data available:', e.data.size, 'bytes');
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    console.log('Recording stopped, processing data...');
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    const duration = timer.textContent; // Capture final time
                    console.log('Creating recording with duration:', duration);
                    audioRecordings.unshift({
                        id: Date.now(),
                        blob: blob,
                        url: url,
                        date: new Date(),
                        duration: duration
                    });
                    console.log('Recording added, total recordings:', audioRecordings.length);
                    renderAudioList();

                    // Stop all tracks to release mic
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                audioStartTime = Date.now();
                audioTimerInterval = setInterval(updateAudioTimer, 1000);

                btn.classList.remove('btn-outline-danger');
                btn.classList.add('btn-danger', 'recording-pulse'); // Add pulse animation class if needed
                btn.innerHTML = '<i class="bi bi-stop-fill fs-2"></i>';
                if (status) status.textContent = 'Recording...';

            } catch (err) {
                console.error('Mic error:', err);
                alert('Could not access microphone. Please allow permissions.');
            }
        }
    };
}

window.openAudioRight = window.openAudioRight || function () {
    console.log('=== OPEN AUDIO RIGHT START ===');
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');
    const audioContainer = document.getElementById('audio-display-container');

    console.log('Elements found:', {
        generateWrapper: !!generateWrapper,
        generateOptions: !!generateOptions,
        summaryContainer: !!summaryContainer,
        flashcardsContainer: !!flashcardsContainer,
        whiteboardContainer: !!whiteboardContainer,
        audioContainer: !!audioContainer
    });

    if (!audioContainer) {
        console.error('Audio container not found!');
        return;
    }

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (whiteboardContainer) whiteboardContainer.style.display = 'none';

    audioContainer.style.display = 'flex';
    console.log('Audio container display set to flex');

    // Scroll handling
    const rightPane = audioContainer.closest('.right-side');
    if (rightPane) rightPane.scrollTop = 0;

    console.log('Calling initAudioRecorder...');
    initAudioRecorder();
    console.log('Calling renderAudioList...');
    renderAudioList();
    console.log('=== OPEN AUDIO RIGHT END ===');
};

window.backFromAudioRight = window.backFromAudioRight || function () {
    // Close any playing audio first
    if (typeof closeAudioPlayer === 'function') {
        closeAudioPlayer();
    }

    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const audioContainer = document.getElementById('audio-display-container');

    if (audioContainer) audioContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(audioTimerInterval);
        const btn = document.getElementById('audio-record-btn');
        if (btn) {
            btn.innerHTML = '<i class="bi bi-mic-fill fs-2"></i>';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-outline-danger');
        }
    }
};

// Add direct click listener for gen-opt-audio (Audio Card)
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
