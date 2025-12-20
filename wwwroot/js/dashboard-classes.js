// Classes, Assignments, and Teacher/Student Interaction logic

// Global state for classes
window.__currentClassPrivacy = null;
window.__currentClassId = null;

document.addEventListener('DOMContentLoaded', () => {
    const classesList = document.getElementById('classes-list');
    if (!classesList) return;

    classesList.addEventListener('click', async (e) => {
        const li = e.target.closest('[data-class-id], [data-id], li');
        if (!li) return;
        e.stopPropagation();
        const idStr = li.getAttribute('data-class-id') || li.getAttribute('data-id');
        const id = idStr ? parseInt(idStr) : NaN;
        if (!id || Number.isNaN(id)) return;

        const titleEl = document.getElementById('cls-title');
        const codeEl = document.getElementById('cls-code');
        const teacherEl = document.getElementById('cls-teacher');
        const studentsUl = document.getElementById('cls-students');

        if (teacherEl) teacherEl.textContent = 'Loading...';
        if (studentsUl) studentsUl.innerHTML = '';

        try {
            const res = await fetch(`/Classes/Details?id=${id}`, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load class');

            const klass = data.Class || data.class;
            const teacher = data.Teacher || data.teacher;
            const studentsArr = data.Students || data.students;

            // Store class privacy data for privacy panel
            window.__currentClassPrivacy = {
                classId: klass?.id || null,
                joinCode: klass?.code || null,
                allowJoin: klass?.allowJoin !== undefined ? klass.allowJoin : false
            };

            if (titleEl) titleEl.textContent = klass?.name || 'Class';
            if (codeEl) codeEl.textContent = klass?.code ? `(Code: ${klass.code})` : '';
            if (teacherEl) teacherEl.textContent = teacher ? `${teacher.name} (${teacher.email})` : '—';
            if (studentsUl) {
                studentsUl.innerHTML = '';
                const students = Array.isArray(studentsArr) ? studentsArr : [];
                const statStudents = document.getElementById('cls-stat-students');
                if (statStudents) statStudents.textContent = students.length;
                if (students.length === 0) {
                    const liEmpty = document.createElement('li');
                    liEmpty.className = 'list-group-item text-muted';
                    liEmpty.textContent = 'No students yet';
                    studentsUl.appendChild(liEmpty);
                } else {
                    const teacherData = teacher; // capture closure
                    students.forEach(s => {
                        // Enhanced Student Card
                        const liItem = document.createElement('div');
                        liItem.className = 'cls-student-card';

                        // Initials for avatar
                        const initials = (s.name || '?').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                        liItem.innerHTML = `
                            <div class="cls-student-info">
                                <div class="cls-student-icon">${initials}</div>
                                <div class="cls-student-details">
                                    <div class="cls-student-name">${window.escapeHtml(s.name)}</div>
                                    <div class="cls-student-email">${window.escapeHtml(s.email)}</div>
                                </div>
                            </div>
                        `;

                        // Actions (only for owner)
                        const userUserDropdown = document.getElementById('user-dropdown');
                        const currentLoggedInId = parseInt(userUserDropdown?.getAttribute('data-user-id') || '0', 10);
                        const iAmOwner = teacherData && (teacherData.id === currentLoggedInId);

                        if (iAmOwner) {
                            const divActions = document.createElement('div');
                            divActions.className = 'cls-student-actions';

                            // Progress Button
                            const btnProgress = document.createElement('button');
                            btnProgress.className = 'btn-icon-soft';
                            btnProgress.title = "View Progress";
                            btnProgress.innerHTML = '<i class="bi bi-graph-up"></i>';
                            btnProgress.onclick = (e) => {
                                e.stopPropagation();
                                if (typeof window.viewStudentProgress === 'function') {
                                    window.viewStudentProgress(s.id, s.name);
                                } else {
                                    alert('Progress function not ready');
                                }
                            };
                            divActions.appendChild(btnProgress);

                            // Remove Button
                            const btnRemove = document.createElement('button');
                            btnRemove.className = 'btn-icon-soft text-danger';
                            btnRemove.title = "Remove Student";
                            btnRemove.innerHTML = '<i class="bi bi-person-x"></i>';
                            btnRemove.onclick = async (e) => {
                                e.stopPropagation();
                                if (typeof window.removeStudent === 'function') {
                                    await window.removeStudent(id, s.id, s.name);
                                }
                            };
                            divActions.appendChild(btnRemove);

                            liItem.appendChild(divActions);
                        }

                        // Wrap in a list item container if needed, or just append the card div
                        // The container is ul#cls-students, so we can append div directly or wrap in li.
                        // Existing code expects ul, but div children are valid if we change parent to div, 
                        // BUT standard bootstrap list-group expects li.
                        // However, we are replacing the style entirely.
                        // Let's check the container in HTML. It is <ul id="cls-students">.
                        // We should probably keep it as li or change the HTML.
                        // Changing the container tag is harder. Let's make the li have the card style.
                        // Or just put the card div INSIDE the li and remove list-group-item class from li.

                        const liWrapper = document.createElement('li');
                        liWrapper.style.listStyle = 'none';
                        liWrapper.style.padding = '0';
                        liWrapper.style.margin = '0';
                        liWrapper.appendChild(liItem);

                        studentsUl.appendChild(liWrapper);
                    });
                }
            }

            // Show/Hide Leave and Delete buttons based on ownership
            try {
                const leaveBtn = document.getElementById('leave-class-btn');
                const deleteBtn = document.getElementById('delete-class-btn');

                const userDropdown = document.getElementById('user-dropdown');
                const currentUserId = parseInt(userDropdown?.getAttribute('data-user-id') || '', 10);
                const canCompare = !Number.isNaN(currentUserId) && currentUserId > 0;
                const isOwner = canCompare && teacher && (teacher.id === currentUserId);

                // Reset displays
                if (leaveBtn) leaveBtn.style.display = 'none';
                if (deleteBtn) deleteBtn.style.display = 'none';

                if (klass?.id) {
                    if (isOwner) {
                        // OWNER: Show Delete, Hide Leave
                        if (deleteBtn) {
                            deleteBtn.style.display = '';
                            deleteBtn.onclick = async (ev) => {
                                ev.preventDefault(); ev.stopPropagation();
                                if (!confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;
                                try {
                                    deleteBtn.disabled = true;
                                    const res = await fetch('/Classes/Delete', { // Assuming Delete endpoint exists or we use specific logic
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'same-origin',
                                        body: JSON.stringify({ id: klass.id }) // or classId: klass.id
                                    });
                                    const resp = await res.json();
                                    if (!resp.success) throw new Error(resp.error || 'Failed to delete class');

                                    // Success
                                    const detailsPanel = document.getElementById('class-details-panel');
                                    if (detailsPanel) detailsPanel.classList.remove('show');
                                    toggleInlinePanel('classes-panel');
                                    // Reload classes list if possible, or just let the toggle handle re-fetch if properly set up
                                    if (typeof window.openClassesInlinePanel === 'function') {
                                        // Force reload or simulate reopen
                                        // Ideally trigger a refresh on the list
                                    }
                                } catch (err) {
                                    alert(err?.message || 'Failed to delete class');
                                } finally {
                                    deleteBtn.disabled = false;
                                }
                            };
                        }
                    } else {
                        // STUDENT/MEMBER: Show Leave, Hide Delete
                        if (leaveBtn) {
                            leaveBtn.style.display = '';
                            leaveBtn.onclick = async (ev) => {
                                ev.preventDefault(); ev.stopPropagation();
                                if (!confirm('Leave this class?')) return;
                                try {
                                    leaveBtn.disabled = true;
                                    const res2 = await fetch('/Classes/Leave', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        credentials: 'same-origin',
                                        body: JSON.stringify({ id: klass.id })
                                    });
                                    const resp2 = await res2.json();
                                    if (!resp2.success) throw new Error(resp2.error || 'Failed to leave');
                                    const detailsPanel2 = document.getElementById('class-details-panel');
                                    if (detailsPanel2) detailsPanel2.classList.remove('show');
                                    toggleInlinePanel('classes-panel');
                                } catch (err2) {
                                    alert(err2?.message || 'Failed to leave class');
                                } finally {
                                    leaveBtn.disabled = false;
                                }
                            };
                        }
                    }
                }
            } catch (e) { console.error('Error setting class actions', e); }

            // Prepare Files tab (show upload for owner, load files list)
            try {
                const filesUl = document.getElementById('cls-files');
                if (filesUl) filesUl.innerHTML = '';
                window.__currentClassId = klass?.id || null;
                const userDropdown2 = document.getElementById('user-dropdown');
                const currentUserId2 = parseInt(userDropdown2?.getAttribute('data-user-id') || '', 10);
                const isOwner2 = !!klass?.id && !Number.isNaN(currentUserId2) && teacher && (teacher.id === currentUserId2);
                const uploadWrap = document.getElementById('cls-files-upload');
                if (uploadWrap) uploadWrap.style.display = isOwner2 ? '' : 'none';
                if (typeof setupClassUpload === 'function') setupClassUpload(isOwner2);
                if (klass?.id && typeof loadClassFiles === 'function') await loadClassFiles(klass.id);
            } catch { }

            // Hide the My Classes panel before opening the class details
            const myPanel = document.getElementById('classes-panel');
            if (myPanel) myPanel.classList.remove('show');

            // Ensure user dropdown stays open (owner for inline-left-from-user)
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown && !userDropdown.classList.contains('show')) userDropdown.classList.add('show');

            toggleInlinePanel('class-details-panel', e);
            if (window.__setClassDetailsActiveTab) window.__setClassDetailsActiveTab('info');
        } catch (err) {
            if (teacherEl) teacherEl.textContent = 'Error loading class';
        }
    });

    // Chat Logic initialization
    const chatInput = document.getElementById('class-chat-input');
    const chatSendBtn = document.getElementById('class-chat-send');
    const chatList = document.getElementById('class-chat-list');
    const chatRefreshBtn = document.getElementById('class-chat-refresh');
    const chatEmpty = document.getElementById('class-chat-empty');
    const classSelect = document.getElementById('class-chat-select');
    const chatErr = document.getElementById('class-chat-error');

    let currentClassId = 0;
    let lastMsgId = 0;

    async function loadMyClassesIntoSelect() {
        if (!classSelect) return;
        try {
            const res = await fetch('/Classes/My', { credentials: 'same-origin' });
            const data = await res.json();
            if (data.success && Array.isArray(data.classes)) {
                classSelect.innerHTML = '<option value="">Select a class...</option>';
                data.classes.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    classSelect.appendChild(opt);
                });
            }
        } catch { }
    }

    async function loadMessages(force = false) {
        if (!currentClassId) return;
        try {
            if (chatErr) chatErr.style.display = 'none';
            const url = `/Classes/Chat?classId=${currentClassId}&afterId=${force ? 0 : lastMsgId}`;
            const res = await fetch(url, { credentials: 'same-origin' });
            const data = await res.json();
            if (data.success && Array.isArray(data.messages)) {
                if (data.messages.length > 0) {
                    if (chatEmpty) chatEmpty.style.display = 'none';
                    if (chatList) chatList.style.display = 'block';
                    if (force) chatList.innerHTML = '';

                    data.messages.forEach(m => {
                        if (m.id > lastMsgId) lastMsgId = m.id;
                        const div = document.createElement('div');
                        const isMe = (m.isMe === true);
                        div.className = `d-flex mb-2 ${isMe ? 'justify-content-end' : 'justify-content-start'}`;
                        div.innerHTML = `
                            <div class="card ${isMe ? 'bg-primary text-white' : 'bg-light'} p-2" style="max-width: 80%; border-radius: 12px;">
                                <div class="small fw-bold ${isMe ? 'text-white-50' : 'text-muted'}">${isMe ? 'Me' : (m.senderName || 'User')}</div>
                                <div>${escapeHtml(m.content)}</div>
                                <div class="small ${isMe ? 'text-white-50' : 'text-muted'} text-end" style="font-size: 0.7rem;">${m.time || ''}</div>
                            </div>
                        `;
                        chatList.appendChild(div);
                    });
                    chatList.scrollTop = chatList.scrollHeight;
                } else if (force) {
                    if (chatList) chatList.style.display = 'none';
                    if (chatEmpty) chatEmpty.style.display = 'block';
                }
            }
        } catch (e) {
            console.error('Chat load error', e);
        }
    }

    async function sendMessage() {
        if (!currentClassId) return;
        const content = (chatInput.value || '').trim();
        if (!content) return;

        try {
            chatSendBtn.disabled = true;
            const res = await fetch('/Classes/SendChat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ classId: currentClassId, content })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Send failed');
            chatInput.value = '';
            // Force reload to get the new message
            await loadMessages(true);
        } catch (e) {
            if (chatErr) { chatErr.style.display = ''; chatErr.textContent = e?.message || 'Failed to send'; }
        } finally {
            chatSendBtn.disabled = false;
        }
    }

    if (classSelect) {
        classSelect.addEventListener('change', async () => {
            currentClassId = parseInt(classSelect.value || '0', 10) || 0;
            if (chatList) chatList.innerHTML = '';
            lastMsgId = 0;

            const chatArea = document.getElementById('chat-area');
            if (currentClassId) {
                if (chatEmpty) chatEmpty.style.display = 'none';
                if (chatArea) chatArea.style.display = 'block';
            } else {
                if (chatArea) chatArea.style.display = 'none';
                if (chatEmpty) chatEmpty.style.display = '';
                return;
            }

            if (chatArea) chatArea.style.display = '';
            await loadMessages(true);
        });
    }

    if (chatRefreshBtn) chatRefreshBtn.addEventListener('click', () => loadMessages(true));
    if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    loadMyClassesIntoSelect();
});


(function initClassDetailsTabs() {
    function setActiveTab(tab) {
        const panel = document.getElementById('class-details-panel');
        if (!panel) return;
        const btns = panel.querySelectorAll('.tab-btn');
        btns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === tab));
        const panes = {
            info: panel.querySelector('#cls-tab-info'),
            files: panel.querySelector('#cls-tab-files'),
            options: panel.querySelector('#cls-tab-options')
        };
        Object.entries(panes).forEach(([key, el]) => {
            if (!el) return;
            const isActive = (key === tab);
            el.classList.toggle('active', isActive);
            if (isActive) el.classList.remove('d-none'); else el.classList.add('d-none');
        });
    }

    // Expose globally immediately
    window.__setClassDetailsActiveTab = setActiveTab;

    // Delegate clicks from the panel if it exists at click time
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const panel = document.getElementById('class-details-panel');
        if (!panel || !panel.contains(btn)) return;
        const tab = btn.getAttribute('data-tab');
        if (tab) setActiveTab(tab);
    });
})();

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const panel = document.getElementById('class-details-panel');
    if (!panel || !panel.contains(btn)) return;
    const tab = btn.getAttribute('data-tab');
    if (tab && window.__setClassDetailsActiveTab) window.__setClassDetailsActiveTab(tab);
});

async function loadClassFiles(classId) {
    try {
        const filesUl = document.getElementById('cls-files');
        const filesGrid = document.getElementById('cls-files-grid');
        if (filesUl) filesUl.innerHTML = '';
        if (filesGrid) filesGrid.innerHTML = '';
        const res = await fetch(`/Classes/Files?classId=${encodeURIComponent(classId)}`, { credentials: 'same-origin' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load files');
        const files = Array.isArray(data.files) ? data.files : [];
        if (!filesUl) return;
        const statFiles = document.getElementById('cls-stat-files');
        if (statFiles) statFiles.textContent = files.length;

        if (files.length === 0) {
            filesGrid.style.display = 'none';
            filesUl.classList.remove('d-none');
            const li = document.createElement('li');
            li.className = 'list-group-item text-muted';
            li.textContent = 'No files yet';
            filesUl.appendChild(li);
            return;
        }

        // Show grid
        filesGrid.style.display = 'grid';
        filesUl.classList.add('d-none');

        files.forEach(f => {
            // Grid Card
            // Enhanced Grid Card
            const card = document.createElement('div');
            card.className = 'cls-file-card';
            card.style.cursor = 'pointer';
            card.title = f.name;

            // Icon logic
            const name = (f.name || '').toLowerCase();
            let iconSrc = '/images/file.png';
            let bgClass = 'cls-file-icon-default';

            if (/\.(pdf)$/i.test(name)) { bgClass = 'cls-file-icon-pdf'; }
            else if (/\.(docx|doc)$/i.test(name)) { bgClass = 'cls-file-icon-word'; }
            else if (/\.(png|jpg|jpeg|gif)$/i.test(name)) { bgClass = 'cls-file-icon-image'; }

            card.innerHTML = `
                <div class="cls-file-icon-wrapper ${bgClass}">
                    <img src="${iconSrc}" alt="file" style="width:32px; height:32px; object-fit:contain;" />
                </div>
                <div class="cls-file-name">${window.escapeHtml(f.name)}</div>
                <div class="cls-file-size">${window.formatFileSize ? window.formatFileSize(f.size || 0) : '0 B'}</div>
                
                <div class="cls-file-download-overlay">
                    <a href="${f.url}" target="_blank" class="btn-icon-soft" title="Download" onclick="event.stopPropagation();">
                        <i class="bi bi-download"></i>
                    </a>
                </div>
                
                <!-- Make whole card clickable usually, but we have a download button now. 
                     We can make the card open preview or just download. 
                     For now, let's keep simple: card click => download/open -->
                <a href="${f.url}" target="_blank" class="stretched-link" style="z-index:1;"></a>
            `;
            // Ensure the specific download button is above the stretched link
            // Actually stretched-link covers everything positioned relative.
            // We need to set z-index of download-overlay higher AND make it relative/absolute properly.
            // In CSS: .cls-file-download-overlay { z-index: 2; } 
            // We need to update CSS for z-index or handle click differently.
            // Adding onclick to card to open functionality is better if we want distinct actions.
            // But for now, let's just let the stretched link handle it and the download button is visual sugar or quick action.
            // If stretched-link is there, the download button inside might not be clickable separately unless z-indexed higher.

            // Let's just fix the z-index via inline style in the HTML string above if needed or rely on CSS.
            // The download button inside stretched-link container...
            // If we want separate actions, we shouldn't use stretched-link over everything.
            // But here, both actions are "Open/Download". So it's fine.

            filesGrid.appendChild(card);
        });
    } catch (e) {
        const errEl = document.getElementById('cls-files-error');
        if (errEl) {
            errEl.style.display = '';
            errEl.textContent = e?.message || 'Error loading files';
        } else {
            console.error(e);
        }
    }
}

function setupClassUpload(isOwner) {
    const uploadBtn = document.getElementById('cls-upload-btn');
    const fileInput = document.getElementById('cls-file-upload');
    const errEl = document.getElementById('cls-files-error');
    if (!uploadBtn || !fileInput) return;
    if (!isOwner) {
        uploadBtn.onclick = null;
        if (errEl) errEl.style.display = 'none';
        return;
    }
    uploadBtn.onclick = async (ev) => {
        ev.preventDefault();
        if (!window.__currentClassId) return;
        if (!fileInput.files || fileInput.files.length === 0) {
            if (errEl) { errEl.style.display = ''; errEl.textContent = 'Please choose a file first.'; }
            return;
        }
        const f = fileInput.files[0];
        const allowedRe = /(\.txt|\.docx|\.pdf|\.png|\.jpg|\.jpeg|\.gif)$/i;
        if (!allowedRe.test(f.name)) {
            if (errEl) { errEl.style.display = ''; errEl.textContent = 'Unsupported file type.'; }
            return;
        }
        const fd = new FormData();
        fd.append('file', f);
        fd.append('classId', String(window.__currentClassId));
        try {
            uploadBtn.disabled = true;
            const res = await fetch('/Classes/UploadFile', { method: 'POST', body: fd, credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload failed');
            fileInput.value = '';
            if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
            await loadClassFiles(window.__currentClassId);
        } catch (e) {
            if (errEl) { errEl.style.display = ''; errEl.textContent = e?.message || 'Upload failed'; }
        } finally {
            uploadBtn.disabled = false;
        }
    };
}

// Global function invoked by button onclick for Classes only
window.openClassesInlinePanel = function (event) {
    try {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        toggleInlinePanel('classes-panel', event);

        const panel = document.getElementById('classes-panel');
        if (!panel) return;

        // Local safe esc util in case global escapeHtml isn't available for any reason
        const esc = (window.escapeHtml) ? window.escapeHtml : (text => {
            const div = document.createElement('div');
            div.textContent = text == null ? '' : String(text);
            return div.innerHTML;
        });

        const classesList = document.getElementById('classes-list');
        const joinBtn = document.getElementById('classes-join-btn');
        const joinInput = document.getElementById('classes-join-code');
        const addClassBtn = document.getElementById('classes-add-btn');
        const addClassInput = document.getElementById('classes-add-name');

        const loadClasses = async () => {
            if (!classesList) return;
            classesList.innerHTML = '<li class="list-group-item small text-muted">Loading...</li>';
            try {
                const res = await fetch('/Classes/My', { credentials: 'same-origin' });
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                if (!ct.includes('application/json')) {
                    throw new Error('Unexpected response (not JSON). Please login and try again.');
                }
                const data = await res.json();
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                if (!data.success) throw new Error(data.error || 'Failed to load classes');
                if (!Array.isArray(data.classes) || data.classes.length === 0) {
                    classesList.innerHTML = '<li class="activity-item small text-muted"><i class="bi bi-collection me-2"></i> No classes yet.</li>';
                    return;
                }


                classesList.innerHTML = '';
                data.classes.forEach(c => {
                    const li = document.createElement('li');
                    li.className = 'activity-item d-flex justify-content-between align-items-center';
                    li.setAttribute('data-class-id', c.id);
                    li.style.cursor = 'pointer';
                    li.tabIndex = 0;
                    li.setAttribute('title', 'Open class details');
                    li.innerHTML = `<div class="d-inline-flex align-items-center gap-2 text-truncate">
                        <img src="/images/class icon.png" alt="Class" style="width: 28px; height: 28px; object-fit: contain;" />
                        <div class="text-truncate"><div><strong>${esc(c.name)}</strong></div>
                        <div class="small text-muted">Code: <span class="code-chip">${esc(c.code)}</span></div></div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-sm btn-outline-secondary" data-action="copy-code" data-code="${esc(c.code)}" title="Copy Code"><i class="bi bi-clipboard"></i></button>
                    </div>`;

                    // Since we have a global listener on classesList, bubbling works!

                    // Keyboard support: Enter opens details
                    li.addEventListener('keydown', (ev) => {
                        if (ev.key === 'Enter') li.click();
                    });
                    classesList.appendChild(li);
                });
                // bind copy buttons
                classesList.querySelectorAll('[data-action="copy-code"]').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        const code = btn.getAttribute('data-code');
                        try {
                            await navigator.clipboard.writeText(code);
                            btn.innerHTML = '<i class="bi bi-clipboard-check"></i>';
                            setTimeout(() => { btn.innerHTML = '<i class="bi bi-clipboard"></i>'; }, 1200);
                        } catch (_) {
                            alert('Failed to copy');
                        }
                    });
                });

            } catch (err) {
                console.error('Load classes error', err);
                const msg = (err && err.message) ? err.message : 'Failed to load classes';
                classesList.innerHTML = `<li class="list-group-item small text-danger">${msg}</li>`;
            }
        };

        // initial load
        loadClasses();

        if (joinBtn && joinInput && !joinBtn.dataset.bound) {
            joinBtn.dataset.bound = 'true';
            joinBtn.onclick = async (e) => {
                e.preventDefault();
                const code = (joinInput.value || '').trim();
                if (!code) { alert('Enter join code'); return; }
                try {
                    joinBtn.disabled = true;
                    const res = await fetch('/Classes/Join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ code }) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Failed to join');
                    joinInput.value = '';
                    await loadClasses();
                } catch (err) {
                    alert(err?.message || 'Failed to join class');
                } finally {
                    joinBtn.disabled = false;
                }
            };
        }

        if (addClassBtn && addClassInput && !addClassBtn.dataset.bound) {
            addClassBtn.dataset.bound = 'true';
            addClassBtn.onclick = async (e) => {
                e.preventDefault();
                const name = (addClassInput.value || '').trim();
                if (!name) { alert('Enter class name'); return; }
                try {
                    addClassBtn.disabled = true;
                    const res = await fetch('/Classes/Create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) });
                    const data = await res.json();
                    if (!data.success) throw new Error(data.error || 'Failed to create');
                    addClassInput.value = '';
                    await loadClasses();
                } catch (err) {
                    alert(err?.message || 'Failed to create class');
                } finally {
                    addClassBtn.disabled = false;
                }
            };
        }
    } catch (e) {
        console.error('openClassesInlinePanel error', e);
    }
};
