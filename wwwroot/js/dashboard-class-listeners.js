
document.addEventListener('DOMContentLoaded', () => {
    // --- Class Options Event Listeners ---

    // Privacy
    const btnPrivacy = document.getElementById('btn-cls-privacy');
    if (btnPrivacy) {
        btnPrivacy.addEventListener('click', () => {
            const codeText = document.getElementById('cls-code')?.textContent || '';
            const code = codeText.replace('(Code: ', '').replace(')', '').trim();

            // Get class data from window.__currentClassPrivacy or fetch it
            const classId = window.__currentClassPrivacy?.classId || null;
            const allowJoin = window.__currentClassPrivacy?.allowJoin || false;

            if (typeof openPrivacyPanel === 'function') {
                openPrivacyPanel(classId, code, allowJoin);
            }
        });
    }

    // Invite
    const btnInvite = document.getElementById('btn-cls-invite');
    if (btnInvite) {
        btnInvite.addEventListener('click', () => {
            const codeText = document.getElementById('cls-code')?.textContent || '';
            const code = codeText.replace('(Code: ', '').replace(')', '').trim();
            if (window.showClassInvite) {
                console.log('Calling showClassInvite for code:', code);
                window.showClassInvite(code);
            } else {
                console.error('showClassInvite function not found');
            }
        });
    }

    // Contact Teacher
    const btnContact = document.getElementById('btn-cls-contact');
    if (btnContact) {
        btnContact.addEventListener('click', () => {
            const teacherText = document.getElementById('cls-teacher')?.textContent || '';
            const emailMatch = teacherText.match(/\(([^)]+)\)/);
            const email = emailMatch ? emailMatch[1] : '';
            if (typeof contactTeacher === 'function') contactTeacher(email);
        });
    }

    // Overall Analytics
    const btnAnalytics = document.getElementById('btn-cls-analytics');
    if (btnAnalytics) {
        btnAnalytics.addEventListener('click', () => {
            const classId = window.__currentClassPrivacy?.classId;
            if (window.showOverallAnalytics) {
                console.log('Calling showOverallAnalytics for class:', classId);
                window.showOverallAnalytics(classId);
            } else {
                console.error('showOverallAnalytics function not found');
            }
        });
    }

    // My Performance
    const btnPerformance = document.getElementById('btn-cls-performance');
    if (btnPerformance) {
        btnPerformance.addEventListener('click', () => {
            // Get current user ID from dropdown data attribute if needed, but the function handles it usually
            if (typeof showMyPerformance === 'function') {
                const userDropdown = document.getElementById('user-dropdown');
                const userId = userDropdown ? parseInt(userDropdown.getAttribute('data-user-id')) : null;
                showMyPerformance(userId);
            }
        });
    }
});
