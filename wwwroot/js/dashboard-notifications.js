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

// Load and display notifications
window.loadNotifications = async function () {
    try {
        const response = await fetch('/Dashboard/GetNotifications', {
            method: 'GET',
            credentials: 'same-origin'
        });

        const data = await response.json();

        if (!data.success) {
            console.error('Failed to load notifications:', data.error);
            return;
        }

        const notifications = data.notifications || [];
        const notificationContainer = document.getElementById('notification-dropdown-menu') || document.getElementById('notifications-list');

        if (!notificationContainer) {
            console.warn('Notification container not found');
            return;
        }

        // Clear existing notifications
        notificationContainer.innerHTML = '';

        if (notifications.length === 0) {
            notificationContainer.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <i class="bi bi-bell-slash fs-4 mb-2 d-block"></i>
                    <p class="mb-0">No notifications</p>
                </div>
            `;
            updateNotificationBadge(0);
            return;
        }

        // Filter unread notifications for badge
        const unreadCount = notifications.filter(n => !n.isRead).length;
        updateNotificationBadge(unreadCount);

        // Display notifications
        notifications.forEach(notification => {
            const notifElement = createNotificationElement(notification);
            if (notifElement) {
                notificationContainer.appendChild(notifElement);
            }
        });
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
};

// Create notification element
function createNotificationElement(notification) {
    const div = document.createElement('div');
    div.className = `list-group-item list-group-item-action ${!notification.isRead ? 'bg-light' : ''}`;
    div.style.cursor = 'pointer';

    // Handle different notification types
    let handledNotif = null;
    if (window.notificationHandlers && window.notificationHandlers[notification.type]) {
        handledNotif = window.notificationHandlers[notification.type](notification);
    }

    if (handledNotif) {
        div.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">
                    <i class="bi ${handledNotif.icon} ${handledNotif.iconColor} me-2"></i>
                    ${handledNotif.title}
                </h6>
                <small class="text-muted">${formatNotificationTime(notification.createdAt)}</small>
            </div>
            <p class="mb-2 small">${handledNotif.message}</p>
            ${handledNotif.actions && handledNotif.actions.length > 0 ? `
                <div class="d-flex gap-2">
                    ${handledNotif.actions.map(action => `
                        <button class="btn btn-sm ${action.class}" data-action="${action.label}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            ` : ''}
        `;

        // Attach action handlers
        if (handledNotif.actions) {
            handledNotif.actions.forEach(action => {
                const btn = div.querySelector(`button[data-action="${action.label}"]`);
                if (btn && action.action) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        action.action();
                    });
                }
            });
        }
    } else {
        // Default notification display
        div.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">
                    <i class="bi bi-info-circle text-primary me-2"></i>
                    ${notification.title}
                </h6>
                <small class="text-muted">${formatNotificationTime(notification.createdAt)}</small>
            </div>
            <p class="mb-1 small">${notification.message}</p>
        `;
    }

    // Mark as read on click
    div.addEventListener('click', () => {
        if (!notification.isRead) {
            markNotificationAsRead(notification.id);
            div.classList.remove('bg-light');
            updateNotificationBadge(Math.max(0, (parseInt(document.getElementById('notification-badge')?.textContent || '0')) - 1));
        }
    });

    return div;
}

// Update badge count
function updateNotificationBadge(count) {
    console.log('🔔 Updating Notification Badge. Count:', count);

    const badge = document.getElementById('notification-badge');
    const dropdownBadge = document.getElementById('dropdown-notification-badge');

    // Update main badge
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    } else {
        console.warn('⚠️ Main notification badge element #notification-badge not found!');
    }

    // Update inner dropdown badge
    if (dropdownBadge) {
        console.log('✅ Found dropdown badge element #dropdown-notification-badge');
        if (count > 0) {
            dropdownBadge.textContent = count > 99 ? '99+' : count;
            dropdownBadge.style.display = 'inline-block';
            console.log('   -> Set dropdown badge text to:', dropdownBadge.textContent);
        } else {
            dropdownBadge.style.display = 'none';
            console.log('   -> Hiding dropdown badge (count is 0)');
        }
    } else {
        console.error('❌ Dropdown badge element #dropdown-notification-badge NOT FOUND in DOM.');
    }
}
// Format notification time
function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

// Load notifications on page load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.loadNotifications === 'function') {
        window.loadNotifications();
        // Refresh notifications every 30 seconds
        setInterval(window.loadNotifications, 30000);
    }
});

// Register the handler if notification system exists
if (window.notificationHandlers) {
    window.notificationHandlers['class_invite'] = handleClassInviteNotification;
} else {
    window.notificationHandlers = {
        'class_invite': handleClassInviteNotification
    };
}
