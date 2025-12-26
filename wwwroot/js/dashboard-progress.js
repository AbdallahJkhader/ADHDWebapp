// Student Progress Viewer for Class Members

window.viewStudentProgress = function (userId, studentName) {
    if (!userId) return;

    // Show loading popup
    Swal.fire({
        title: `Loading ${studentName}'s Progress...`,
        didOpen: () => {
            Swal.showLoading();
            loadProgressPopup(userId, studentName);
        }
    });
};

async function loadProgressPopup(userId, studentName) {
    try {
        const response = await fetch(`/Dashboard/GetProgress?targetUserId=${userId}`, {
            credentials: 'same-origin'
        });
        const data = await response.json();
        if (!data.success && data.success !== undefined) throw new Error(data.error || 'Failed to load progress');

        // Prepare Data
        const streak = data.streak || 0;
        const weeklyMins = data.weeklyFocusMinutes || 0;
        const focusText = weeklyMins < 60 ? `${weeklyMins}m` : `${Math.floor(weeklyMins / 60)}h ${weeklyMins % 60}m`;
        const subjects = data.weeklySubjects || 0;

        // Create HTML Content
        const htmlContent = `
            <div class="row g-2 text-center mb-3">
                <div class="col-3">
                    <div class="p-2 bg-light rounded-3">
                        <div class="h5 text-primary mb-1">${streak}</div>
                        <div class="small text-muted" style="font-size:0.75rem">Streak</div>
                    </div>
                </div>
                <div class="col-3">
                    <div class="p-2 bg-light rounded-3">
                        <div class="h5 text-primary mb-1">${focusText}</div>
                        <div class="small text-muted" style="font-size:0.75rem">Focus</div>
                    </div>
                </div>
                <div class="col-3">
                    <div class="p-2 bg-light rounded-3">
                        <div class="h5 text-primary mb-1">${subjects}</div>
                        <div class="small text-muted" style="font-size:0.75rem">Subjects</div>
                    </div>
                </div>
                 <div class="col-3">
                    <div class="p-2 bg-light rounded-3">
                        <div class="h5 text-primary mb-1">${data.browsingTime || '0m'}</div>
                        <div class="small text-muted" style="font-size:0.75rem">Browsing</div>
                    </div>
                </div>
            </div>
            <div class="text-start">
             <small class="text-muted">Weekly activity summary for ${window.escapeHtml(studentName)}.</small>
            </div>
        `;

        Swal.fire({
            title: `${studentName}'s Analytics`,
            html: htmlContent,
            width: 600,
            showCloseButton: true,
            focusConfirm: false,
            confirmButtonText: 'Close'
        });

    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load progress: ' + error.message
        });
    }
}
