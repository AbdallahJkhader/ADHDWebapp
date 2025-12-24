// Simplified toggle function that works with card design
async function toggleAudioRecording() {
    const recordBtn = document.getElementById('audio-record-btn');
    const timerEl = document.getElementById('audio-timer');
    const statusEl = document.getElementById('audio-status');
    const timerDisplay = document.getElementById('audio-timer-display');

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

                // Hide timer and reset
                if (timerDisplay) timerDisplay.style.display = 'none';
                if (timerEl) timerEl.textContent = '00:00';
                if (statusEl) statusEl.textContent = 'Ready to Record';
            };

            mediaRecorder.start();
            audioStartTime = Date.now();
            audioTimerInterval = setInterval(updateAudioTimer, 1000);

            // Show timer
            if (timerDisplay) timerDisplay.style.display = 'block';

            // Change to stop icon  
            if (recordBtn) {
                const icon = recordBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('bi-mic-fill');
                    icon.classList.add('bi-stop-fill');
                }
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

        // Hide timer immediately
        if (timerDisplay) timerDisplay.style.display = 'none';

        // Change back to mic icon
        if (recordBtn) {
            const icon = recordBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('bi-stop-fill');
                icon.classList.add('bi-mic-fill');
            }
        }
        if (timerEl) timerEl.textContent = '00:00';
        if (statusEl) statusEl.textContent = 'Ready to Record';
    }
}
