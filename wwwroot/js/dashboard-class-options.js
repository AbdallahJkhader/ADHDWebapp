
// --- Class Privacy Panel Handlers ---

// Store current class privacy data
window.__currentClassPrivacy = {
    classId: null,
    joinCode: null,
    allowJoin: false
};

// Open privacy panel with current settings
function openPrivacyPanel(classId, joinCode, allowJoin) {
    window.__currentClassPrivacy = { classId, joinCode, allowJoin };

    // Update UI elements
    const toggle = document.getElementById('cls-privacy-toggle');
    const errorDiv = document.getElementById('cls-privacy-error');
    const successDiv = document.getElementById('cls-privacy-success');

    if (toggle) toggle.checked = allowJoin;
    if (errorDiv) errorDiv.style.display = 'none';
    if (successDiv) successDiv.style.display = 'none';

    // Do not hide class details panel here; toggleInlinePanel handles it and needs it for positioning
    // const detailsPanel = document.getElementById('class-details-panel');
    // if (detailsPanel) detailsPanel.classList.remove('show');

    toggleInlinePanel('cls-privacy-panel', event);
}

// Update status display and auto-save when toggle changes
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('cls-privacy-toggle');

    if (toggle) {
        toggle.addEventListener('change', async () => {
            const errorDiv = document.getElementById('cls-privacy-error');
            const successDiv = document.getElementById('cls-privacy-success');

            if (!window.__currentClassPrivacy.classId) {
                if (errorDiv) {
                    errorDiv.textContent = 'No class selected';
                    errorDiv.style.display = 'block';
                }
                // Revert toggle
                toggle.checked = !toggle.checked;
                return;
            }

            try {
                if (errorDiv) errorDiv.style.display = 'none';
                if (successDiv) successDiv.style.display = 'none';

                const response = await fetch('/Classes/UpdatePrivacy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        classId: window.__currentClassPrivacy.classId,
                        allowJoin: toggle.checked
                    })
                });

                const data = await response.json();

                if (data.success) {
                    window.__currentClassPrivacy.allowJoin = toggle.checked;
                    if (successDiv) {
                        successDiv.textContent = toggle.checked ? 'New members can now join' : 'Joining disabled';
                        successDiv.style.display = 'block';
                    }
                    setTimeout(() => {
                        if (successDiv) successDiv.style.display = 'none';
                    }, 2000);
                } else {
                    throw new Error(data.error || 'Failed to save privacy settings');
                }
            } catch (error) {
                // Revert toggle on error
                toggle.checked = !toggle.checked;
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Failed to save privacy settings';
                    errorDiv.style.display = 'block';
                }
            }
        });
    }
});

// Update the existing showClassPrivacy function to use the new panel
function showClassPrivacy(joinCode) {
    // Get current class data from window.__currentClassPrivacy or fetch it
    if (window.__currentClassPrivacy && window.__currentClassPrivacy.classId) {
        openPrivacyPanel(
            window.__currentClassPrivacy.classId,
            joinCode,
            window.__currentClassPrivacy.allowJoin
        );
    } else {
        // Fallback to old behavior if data not available
        Swal.fire({
            title: 'Class Privacy',
            html: `<strong>Current Join Code:</strong> ${joinCode}<br><br>Anyone with this code can join the class.<br><span class="text-muted small">Privacy settings coming soon.</span>`,
            icon: 'success',
            confirmButtonText: 'OK'
        });
    }
}


// Open analytics panel and load data
window.showOverallAnalytics = async function (classId) {
    if (!classId) classId = window.__currentClassPrivacy?.classId;
    if (!classId) return;

    try {
        // Hide class details and show analytics panel
        // const detailsPanel = document.getElementById('class-details-panel');
        // if (detailsPanel) detailsPanel.classList.remove('show');
        toggleInlinePanel('cls-analytics-panel', event);

        // Fetch analytics data
        const response = await fetch(`/Classes/GetClassAnalytics?classId=${classId}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();

        if (!data.success) throw new Error(data.error || 'Failed to load analytics');

        // Update stats cards
        document.getElementById('analytics-total-minutes').textContent = data.totalFocusMinutes || 0;

        // Populate Weekly Browsing Time
        document.getElementById('analytics-weekly-browsing').textContent = (data.totalBrowsingMinutes || 0) + ' min';

        document.getElementById('analytics-avg-streak').textContent = data.avgStreak || 0;
        document.getElementById('analytics-avg-subjects').textContent = data.avgSubjects || 0;

        // Render student list
        const studentsList = document.getElementById('analytics-students-list');
        studentsList.innerHTML = '';

        if (data.students && data.students.length > 0) {
            data.students.forEach(student => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <div class="fw-medium">${student.name}</div>
                        <small class="text-muted">${student.email}</small>
                    </div>
                    <div class="text-end">
                        <div class="badge bg-success" title="Focus Time">${student.focusMinutes}m</div>
                        <div class="badge bg-info" title="Browsing Time">${student.browsingMinutes}m 🌐</div>
                        <div class="badge bg-warning mt-1" title="Streak">${student.streak} 🔥</div>
                    </div>
                `;
                studentsList.appendChild(li);
            });
        } else {
            studentsList.innerHTML = '<li class="list-group-item text-muted text-center">No student data yet</li>';
        }

        document.getElementById('analytics-error').style.display = 'none';
    } catch (error) {
        const errorDiv = document.getElementById('analytics-error');
        if (errorDiv) {
            errorDiv.textContent = error.message || 'Failed to load analytics';
            errorDiv.style.display = 'block';
        }
    }
}


// Open invite panel and setup search
window.showClassInvite = function (joinCode) {
    const classId = window.__currentClassPrivacy?.classId;
    if (!classId) return;

    // Hide class details and show invite panel
    // const detailsPanel = document.getElementById('class-details-panel');
    // if (detailsPanel) detailsPanel.classList.remove('show');
    toggleInlinePanel('cls-invite-panel');

    // Clear previous state
    document.getElementById('invite-search-input').value = '';
    document.getElementById('invite-results-container').style.display = 'none';
    document.getElementById('invite-error').style.display = 'none';
    document.getElementById('invite-success').style.display = 'none';

    // Setup search button
    const searchBtn = document.getElementById('invite-search-btn');
    const searchInput = document.getElementById('invite-search-input');

    searchBtn.onclick = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const email = searchInput.value.trim();
        if (!email) return;

        try {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

            const response = await fetch(`/Classes/SearchUsers?email=${encodeURIComponent(email)}`, {
                credentials: 'same-origin'
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error || 'Search failed');

            // Display results
            const resultsList = document.getElementById('invite-results-list');
            resultsList.innerHTML = '';

            if (data.users && data.users.length > 0) {
                data.users.forEach(user => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center';
                    li.innerHTML = `
                        <div>
                            <div class="fw-medium">${user.name}</div>
                            <small class="text-muted">${user.email}</small>
                        </div>
                        <button type="button" class="btn btn-sm btn-primary" data-user-id="${user.id}">
                            <i class="bi bi-send"></i> Invite
                        </button>
                    `;

                    // Add invite button handler
                    const inviteBtn = li.querySelector('button');
                    inviteBtn.onclick = async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        try {
                            inviteBtn.disabled = true;
                            inviteBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

                            const inviteResponse = await fetch('/Classes/SendInvite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'same-origin',
                                body: JSON.stringify({ classId, userId: user.id })
                            });
                            const inviteData = await inviteResponse.json();

                            if (!inviteData.success) throw new Error(inviteData.error || 'Failed to send invite');

                            const successDiv = document.getElementById('invite-success');
                            successDiv.textContent = `Invitation sent to ${user.name}!`;
                            successDiv.style.display = 'block';
                            setTimeout(() => successDiv.style.display = 'none', 3000);

                            inviteBtn.innerHTML = '<i class="bi bi-check"></i> Sent';
                            inviteBtn.classList.replace('btn-primary', 'btn-success');
                        } catch (error) {
                            const errorDiv = document.getElementById('invite-error');
                            errorDiv.textContent = error.message;
                            errorDiv.style.display = 'block';
                            inviteBtn.disabled = false;
                            inviteBtn.innerHTML = '<i class="bi bi-send"></i> Invite';
                        }
                    };

                    resultsList.appendChild(li);
                });
                document.getElementById('invite-results-container').style.display = 'block';
            } else {
                resultsList.innerHTML = '<li class="list-group-item text-muted text-center">No users found</li>';
                document.getElementById('invite-results-container').style.display = 'block';
            }

            document.getElementById('invite-error').style.display = 'none';
        } catch (error) {
            const errorDiv = document.getElementById('invite-error');
            errorDiv.textContent = error.message || 'Search failed';
            errorDiv.style.display = 'block';
        } finally {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<i class="bi bi-search"></i>';
        }
    };

    // Allow Enter key to search
    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') searchBtn.click();
    };
}

function contactTeacher(email) {
    if (!email) return;
    window.location.href = `mailto:${email}`;
}

function showMyPerformance(userId) {
    if (typeof window.viewStudentProgress === 'function') {
        window.viewStudentProgress(userId, 'My Performance');
    } else {
        alert('Progress function not ready');
    }
}
