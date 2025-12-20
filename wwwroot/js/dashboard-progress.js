// Student Progress Viewer for Class Members

window.viewStudentProgress = function (userId, studentName) {
    if (!userId) {
        console.error('No user ID provided');
        return;
    }

    // Open progress tracker panel
    toggleInlinePanel('tools-progress-panel', event, 'tools-dropdown');

    // Load progress data for the specific user
    setTimeout(() => {
        loadProgressData(userId, studentName);
    }, 100);
};

async function loadProgressData(userId, studentName) {
    try {
        const response = await fetch(`/Dashboard/GetProgress?targetUserId=${userId}`, {
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!data.success && data.success !== undefined) {
            throw new Error(data.error || 'Failed to load progress');
        }

        // Update progress panel with student name
        const panelTitle = document.querySelector('#tools-progress-panel .dropdown-header span');
        if (panelTitle && studentName) {
            panelTitle.textContent = `${studentName}'s Progress`;
        }

        // Update streak
        const streakEl = document.getElementById('progress-streak');
        if (streakEl) {
            streakEl.textContent = data.streak || 0;
        }

        // Update browsing time
        const browsingEl = document.getElementById('progress-browsing');
        if (browsingEl) {
            browsingEl.textContent = data.browsingTime || '0m this week';
        }

        // Update subjects
        const subjectsEl = document.getElementById('progress-subjects');
        if (subjectsEl) {
            subjectsEl.textContent = data.weeklySubjects || 0;
        }

        // Update focus time
        const focusEl = document.getElementById('progress-focus');
        if (focusEl) {
            const focusTime = data.focusTime || data.weeklyFocusMinutes ?
                `${Math.floor(data.weeklyFocusMinutes / 60)}h ${data.weeklyFocusMinutes % 60}m` :
                '0m';
            focusEl.textContent = focusTime;
        }

    } catch (error) {
        console.error('Failed to load progress:', error);

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to load student progress: ' + error.message
            });
        } else {
            alert('Failed to load student progress: ' + error.message);
        }
    }
}
