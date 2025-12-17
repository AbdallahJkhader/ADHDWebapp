// ===== Progress Tracker =====
async function loadProgressData(userId) {
    try {
        let url = '/Dashboard/GetProgress';
        if (userId) {
            url += `?targetUserId=${userId}`;
        }
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            document.getElementById('progress-streak').textContent = `${data.streak} days`;
            document.getElementById('progress-browsing').textContent = data.browsingTime;
            document.getElementById('progress-subjects').textContent = `${data.weeklySubjects} subjects`;
            document.getElementById('progress-focus').textContent = `${data.weeklyFocusMinutes} min`;
        }
    } catch (error) {
        console.error('Failed to load progress data:', error);
    }
}

// Load progress data when panel is opened
const originalTogglePanel = window.toggleInlinePanel;
if (typeof originalTogglePanel === 'function') {
    window.toggleInlinePanel = function (panelId, event, ownerHint) {
        originalTogglePanel(panelId, event, ownerHint);
        setTimeout(() => {
            if (panelId === 'tools-progress-panel') {
                loadProgressData();
            } else if (panelId === 'tools-planner-panel') {
                loadStudySessions();
            }
        }, 100);
    };
}

// ===== Study Planner =====
let studySessions = [];

async function loadStudySessions() {
    try {
        const response = await fetch('/StudyPlanner/GetSessions');
        const data = await response.json();

        if (data.success) {
            studySessions = data.sessions;
            renderStudySessions();
        }
    } catch (error) {
        console.error('Failed to load sessions:', error);
    }
}

function renderStudySessions() {
    const upcomingList = document.getElementById('planner-upcoming-list');
    const completedList = document.getElementById('planner-completed-list');

    if (!upcomingList || !completedList) return;

    const now = new Date();
    const upcoming = studySessions.filter(s => !s.isCompleted && new Date(s.endTime) > now);
    const completed = studySessions.filter(s => s.isCompleted);

    if (upcoming.length === 0) {
        upcomingList.innerHTML = '<div class="text-muted small text-center py-2">No upcoming sessions</div>';
    } else {
        upcomingList.innerHTML = upcoming.map(session => createSessionCard(session, false)).join('');
    }

    if (completed.length === 0) {
        completedList.innerHTML = '<div class="text-muted small text-center py-2">No completed sessions</div>';
    } else {
        completedList.innerHTML = completed.map(session => createSessionCard(session, true)).join('');
    }
}

function createSessionCard(session, isCompleted) {
    const startDate = new Date(session.startTime);
    const dateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const subjectHtml = session.subjectName ? `<div class="text-muted" style="font-size: 0.75rem;">${session.subjectName}</div>` : '';

    const completeButton = !isCompleted
        ? `<button class="btn btn-sm btn-success p-1" onclick="markSessionComplete(${session.id}, true)" title="Mark complete"><i class="bi bi-check-lg"></i></button>`
        : `<button class="btn btn-sm btn-secondary p-1" onclick="markSessionComplete(${session.id}, false)" title="Mark incomplete"><i class="bi bi-arrow-counterclockwise"></i></button>`;

    return `
        <div class="card card-sm p-2">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-fill">
                    <div class="fw-bold small">${session.title}</div>
                    ${subjectHtml}
                    <div class="text-muted" style="font-size: 0.7rem;">
                        <i class="bi bi-calendar3"></i> ${dateStr}
                    </div>
                </div>
                <div class="d-flex gap-1">
                    ${completeButton}
                    <button class="btn btn-sm btn-danger p-1" onclick="deleteSession(${session.id})" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

async function addStudySession() {
    const titleEl = document.getElementById('planner-title');
    const subjectEl = document.getElementById('planner-subject');
    const dateEl = document.getElementById('planner-date');
    const errorEl = document.getElementById('planner-error');

    const title = titleEl.value.trim();
    const subject = subjectEl.value.trim();
    const date = dateEl.value;

    if (!title || !date) {
        errorEl.textContent = 'Please fill in all required fields';
        errorEl.style.display = '';
        return;
    }

    errorEl.style.display = 'none';

    // Use the same date for both start and end time
    const startTime = date + 'T00:00';
    const endTime = date + 'T23:59';

    try {
        const response = await fetch('/StudyPlanner/AddSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                subjectName: subject,
                startTime,
                endTime,
                description: ''
            })
        });

        const data = await response.json();

        if (data.success) {
            titleEl.value = '';
            subjectEl.value = '';
            dateEl.value = '';
            document.getElementById('planner-form').classList.add('d-none');
            await loadStudySessions();
        } else {
            errorEl.textContent = data.error || 'Failed to add session';
            errorEl.style.display = '';
        }
    } catch (error) {
        errorEl.textContent = 'Error adding session';
        errorEl.style.display = '';
    }
}

async function deleteSession(sessionId) {
    if (!confirm('Delete this session?')) return;

    try {
        const response = await fetch('/StudyPlanner/DeleteSession', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sessionId })
        });

        const data = await response.json();

        if (data.success) {
            await loadStudySessions();
        }
    } catch (error) {
        console.error('Failed to delete session:', error);
    }
}

async function markSessionComplete(sessionId, isCompleted) {
    try {
        const response = await fetch('/StudyPlanner/MarkComplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sessionId, isCompleted })
        });

        const data = await response.json();

        if (data.success) {
            await loadStudySessions();
        }
    } catch (error) {
        console.error('Failed to update session:', error);
    }
}

// Event listeners for Study Planner
document.addEventListener('DOMContentLoaded', function () {
    const toggleFormBtn = document.getElementById('planner-toggle-form-btn');
    const form = document.getElementById('planner-form');
    const saveBtn = document.getElementById('planner-save-btn');
    const cancelBtn = document.getElementById('planner-cancel-btn');

    if (toggleFormBtn) {
        toggleFormBtn.addEventListener('click', () => {
            form.classList.toggle('d-none');
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', addStudySession);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            form.classList.add('d-none');
            document.getElementById('planner-title').value = '';
            document.getElementById('planner-subject').value = '';
            document.getElementById('planner-date').value = '';
            document.getElementById('planner-error').style.display = 'none';
        });
    }
});
