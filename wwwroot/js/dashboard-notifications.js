// Class Invite Notifications Handler

// Handle class invite notifications
window.handleClassInviteNotification = function (notification) {
    if (!notification || notification.type !== 'class_invite') return null;

    // Extract join code from message (format: "... Join code: XXXXX")
    const joinCodeMatch = notification.message.match(/Join code:\s*(\w+)/);
    const joinCode = joinCodeMatch ? joinCodeMatch[1] : null;

    return {
        icon: 'bi-person-plus-fill',
        iconColor: 'text-primary',
        title: notification.title,
        message: notification.message,
        actions: joinCode ? [
            {
                label: 'Join Class',
                class: 'btn-primary',
                action: () => joinClassFromInvite(joinCode, notification.id)
            },
            {
                label: 'Dismiss',
                class: 'btn-outline-secondary',
                action: () => dismissNotification(notification.id)
            }
        ] : []
    };
};

// Join class from invite notification
async function joinClassFromInvite(joinCode, notificationId) {
    try {
        const response = await fetch('/Classes/Join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ code: joinCode })
        });

        const data = await response.json();

        if (data.success) {
            // Mark notification as read
            await markNotificationAsRead(notificationId);

            // Show success message
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'success',
                    title: 'Joined',
                    text: 'You have successfully joined the class!',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                alert('You have successfully joined the class!');
            }

            // Reload classes if function exists
            if (typeof window.loadUserClasses === 'function') {
                window.loadUserClasses();
            }

            // Reload notifications
            if (typeof window.loadNotifications === 'function') {
                window.loadNotifications();
            }
        } else {
            throw new Error(data.error || 'Failed to join class');
        }
    } catch (error) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message
            });
        } else {
            alert('Error: ' + error.message);
        }
    }
}

// Dismiss notification
async function dismissNotification(notificationId) {
    try {
        const response = await fetch('/Dashboard/MarkNotificationAsRead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ notificationId })
        });

        const data = await response.json();

        if (data.success) {
            // Reload notifications
            if (typeof window.loadNotifications === 'function') {
                window.loadNotifications();
            }
        }
    } catch (error) {
        console.error('Failed to dismiss notification:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    try {
        await fetch('/Dashboard/MarkNotificationAsRead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ notificationId })
        });
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
    }
}

// Register the handler if notification system exists
if (window.notificationHandlers) {
    window.notificationHandlers['class_invite'] = handleClassInviteNotification;
} else {
    window.notificationHandlers = {
        'class_invite': handleClassInviteNotification
    };
}
