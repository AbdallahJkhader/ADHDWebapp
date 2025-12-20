// Timer Control Event Listeners

document.addEventListener('DOMContentLoaded', () => {
    // Timer Preset Buttons
    const presets = document.querySelectorAll('.timer-preset');
    presets.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            presets.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            // Get duration in minutes
            const minutes = parseInt(btn.dataset.minutes || '25');

            // Update TIMER object
            if (window.TIMER) {
                window.TIMER.durationMs = minutes * 60 * 1000;
                window.TIMER.remainingMs = minutes * 60 * 1000;
                window.TIMER.running = false;
                window.stopTimerInterval();
                window.updateTimerDisplay();
            }
        });
    });

    // Start/Pause/Reset buttons
    const timerPanel = document.getElementById('focus-timer-panel');
    if (timerPanel) {
        // Add control buttons if they don't exist
        addTimerControlsIfNeeded();
    }
});

function addTimerControlsIfNeeded() {
    const timerPanel = document.getElementById('focus-timer-panel');
    if (!timerPanel) return;

    // Check if controls already exist
    if (timerPanel.querySelector('.timer-controls')) return;

    // Find the activity item with "Remaining Time"
    const activityItems = timerPanel.querySelectorAll('.activity-item');
    let targetItem = null;

    activityItems.forEach(item => {
        const title = item.querySelector('.activity-title');
        if (title && title.textContent.trim() === 'Remaining Time') {
            targetItem = item;
        }
    });

    if (!targetItem) return;

    // Create controls container
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'timer-controls mt-3 d-flex gap-2 justify-content-center';
    controlsDiv.innerHTML = `
        <button class="btn btn-sm btn-success" onclick="window.startTimer()" title="Start">
            <i class="bi bi-play-fill"></i>
        </button>
        <button class="btn btn-sm btn-warning" onclick="window.pauseTimer()" title="Pause">
            <i class="bi bi-pause-fill"></i>
        </button>
        <button class="btn btn-sm btn-secondary" onclick="window.resetTimer()" title="Reset">
            <i class="bi bi-arrow-counterclockwise"></i>
        </button>
    `;

    // Insert after the activity item
    targetItem.parentNode.insertBefore(controlsDiv, targetItem.nextSibling);
}
