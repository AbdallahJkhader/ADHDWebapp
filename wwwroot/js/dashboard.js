// Global variables for audio/video recording
let mediaRecorder = null;
let audioChunks = [];
let audioRecordings = [];
let audioStartTime = 0;
let audioTimerInterval = null;
let videoRecordings = [];

document.addEventListener('DOMContentLoaded', () => {
    const generateCard = document.getElementById('btn-generate-ai-helper');
    const generateOptions = document.getElementById('generate-options');
    // Ensure initial right-pane state: hide summary, show Add Helper card, hide options
    try {
        const summaryContainerInit = document.getElementById('summary-display-container');
        if (summaryContainerInit) summaryContainerInit.style.display = 'none';
        const generateWrapperInit = document.getElementById('generate-wrapper');
        if (generateWrapperInit) generateWrapperInit.style.display = 'flex';
        if (generateOptions) generateOptions.style.display = 'none';
    } catch { }

    // Add direct click listener for gen-opt-audio
    const audioCard = document.getElementById('gen-opt-audio');
    if (audioCard) {
        console.log('Audio card found, adding click listener');
        audioCard.addEventListener('click', (e) => {
            console.log('Audio card clicked!');
            e.preventDefault();
            if (window.openAudioRight) {
                console.log('Calling openAudioRight...');
                window.openAudioRight();
            } else {
                console.error('openAudioRight function not found');
            }
        });
    } else {
        console.error('Audio card gen-opt-audio not found');
    }

    // Audio recording variables moved to global scope

    // Summarize left content to right summary panel via server (OpenAI)
    window.summarizeLeftToRight = async function () {
        try {
            // Prevent rapid duplicate requests
            if (window._summarizeInFlight) return;
            // Respect client-side cooldown
            const nowMs = Date.now();
            const cooldownUntil = window._summarizeCooldownUntil || 0;
            const btn = document.getElementById('summary-reload-btn');
            const ensureCooldownTimer = () => {
                if (window._summarizeCooldownTimer) return;
                window._summarizeCooldownTimer = setInterval(() => {
                    const now = Date.now();
                    const until = window._summarizeCooldownUntil || 0;
                    const remaining = Math.max(0, Math.ceil((until - now) / 1000));
                    const b = document.getElementById('summary-reload-btn');
                    if (b) {
                        if (remaining > 0) {
                            b.disabled = true;
                            b.textContent = `Reload (${remaining})`;
                        } else {
                            b.disabled = false;
                            b.textContent = 'Reload';
                            clearInterval(window._summarizeCooldownTimer);
                            window._summarizeCooldownTimer = null;
                        }
                    }
                }, 1000);
            };
            if (nowMs < cooldownUntil) {
                const remaining = Math.max(0, Math.ceil((cooldownUntil - nowMs) / 1000));
                const targetEarly = document.getElementById('summary-content-display');
                if (targetEarly) targetEarly.innerHTML = `<div class="text-center p-4 text-muted"><i class="bi bi-hourglass-split text-primary" style="font-size: 2rem;"></i><p class="mt-2">Please wait ${remaining} seconds before trying again.</p></div>`;
                // Reflect remaining on the button immediately
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = `Reload (${remaining})`;
                }
                ensureCooldownTimer();
                return;
            }
            window._summarizeInFlight = true;
            const contentDisplay = document.getElementById('content-display');
            const text = contentDisplay ? (contentDisplay.textContent || '').trim() : '';
            if (!text) { alert('No text to summarize.'); return; }
            // Open summary UI and show loading (match file-loading style)
            if (typeof window.openSummaryRight === 'function') window.openSummaryRight();
            const target = document.getElementById('summary-content-display');
            if (target) {
                target.innerHTML = '<div class="text-center p-4"><i class="bi bi-hourglass-split text-primary" style="font-size: 2rem;"></i><p class="mt-2">Summarizing content...</p></div>';
            }
            // Set button to loading state
            if (btn) { btn.disabled = true; btn.textContent = 'Reload...'; }

            const res = await fetch('/Dashboard/Summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ text })
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data || data.success !== true) {
                let msg = (data && data.error) ? data.error : `Failed (HTTP ${res.status})`;
                if (res.status === 429) {
                    msg = (data && data.error) ? data.error : 'Rate limit exceeded. Please wait a few seconds and try again.';
                }
                if (target) target.innerHTML = `<div class="text-center p-4 text-danger"><i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i><p class="mt-2">${msg}</p></div>`;
                // Start cooldown after an attempt (5 seconds)
                const seconds = 5;
                window._summarizeCooldownUntil = Date.now() + seconds * 1000;
                ensureCooldownTimer();
                return;
            }
            const summary = data.summary || '';
            if (target) {
                // Render as plain text to avoid any HTML injection
                target.textContent = summary;
            }
            try { updateWordCount(); } catch (_) { }
            // Normal cooldown after success (5 seconds)
            window._summarizeCooldownUntil = Date.now() + 5 * 1000;
            ensureCooldownTimer();
        } catch (e) {
            const target = document.getElementById('summary-content-display');
            if (target) target.innerHTML = `<div class="text-center p-4 text-danger"><i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i><p class="mt-2">${e?.message || 'Summary failed'}</p></div>`;
        } finally {
            window._summarizeInFlight = false;
            // If no cooldown, re-enable button now; otherwise timer will handle it
            const btn = document.getElementById('summary-reload-btn');
            if (btn && !(window._summarizeCooldownUntil && Date.now() < window._summarizeCooldownUntil)) {
                btn.disabled = false;
                btn.textContent = 'Reload';
            }
        }
    };

    // Delete current group but keep files
    function deleteCurrentGroup() {
        if (!CURRENT_GROUP_VIEW) return;
        const name = CURRENT_GROUP_VIEW;
        if (!confirm(`Delete group '${name}'? Files will remain.`)) return;
        fetch('/Dashboard/DeleteGroup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ name })
        })
            .then(res => res.json())
            .then(data => {
                if (!data || data.success !== true) throw new Error(data && data.error ? data.error : 'Delete group failed');
                if (GROUPS && GROUPS[name]) delete GROUPS[name];
                exitGroupView();
            })
            .catch(err => {
                alert(err?.message || 'Failed to delete group');
            });
    }

    const showOptions = () => {
        if (generateCard) {
            generateCard.style.display = 'none';
        }
        if (generateOptions) {
            generateOptions.style.display = '';
            generateOptions.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    if (generateCard) {
        generateCard.addEventListener('click', (e) => {
            e.preventDefault();
            showOptions();
        });
    }

    const summaryCard = document.getElementById('gen-opt-summary');
    if (summaryCard) {
        summaryCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openSummaryRight) window.openSummaryRight();
        });
    }

    const flashcardsCard = document.getElementById('gen-opt-workbook');
    if (flashcardsCard) {
        flashcardsCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openFlashcardsRight) window.openFlashcardsRight();
        });
    }

    const whiteboardCard = document.getElementById('gen-opt-whiteboard');
    if (whiteboardCard) {
        whiteboardCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openWhiteboardRight) window.openWhiteboardRight();
        });
    }

    const audioCardOption = document.getElementById('gen-opt-audio');
    // Already handled above in DOMContentLoaded

    const notesCard = document.getElementById('gen-opt-notes');
    if (notesCard) {
        notesCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openNotesRight) window.openNotesRight();
        });
    }

    const quizzesCard = document.getElementById('gen-opt-quizzes');
    if (quizzesCard) {
        quizzesCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openQuizzesRight) window.openQuizzesRight();
        });
    }

    const aiCard = document.getElementById('gen-opt-ai');
    if (aiCard) {
        aiCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openVideoRight) window.openVideoRight();
        });
    }

    // Ensure left pane starts in files mode (hide viewer)
    try {
        setLeftView('files');
        const leftViewer = document.getElementById('file-display-container');
        const uploadedSectionInit = document.getElementById('uploaded-files-section');
        if (leftViewer) leftViewer.style.display = 'none';
        if (uploadedSectionInit) uploadedSectionInit.style.display = 'block';
    } catch { }

    try {
        const panel = document.getElementById('focus-music-panel');
        if (!panel) {
        } else {
            if (!window.__focusMusicAudio) {
                const audio = new Audio();
                audio.crossOrigin = 'anonymous';
                audio.loop = true;
                audio.preload = 'none';
                audio.volume = 0.6;
                window.__focusMusicAudio = audio;
            }

            const PRESETS = {
                quran: {
                    name: 'Quran',
                    candidates: [
                        '/sounds/quran.mp3', '/sounds/quran.m4a', '/sounds/quran.wav',
                        '/audio/quran.mp3', '/audio/quran.m4a', '/audio/quran.wav'
                    ]
                },
                rain: {
                    name: 'Rain',
                    candidates: [
                        '/sounds/rain.mp3', '/sounds/rain.m4a', '/sounds/rain.wav',
                        '/audio/rain.mp3', '/audio/rain.m4a', '/audio/rain.wav'
                    ]
                },
                earth: {
                    name: 'Earth',
                    candidates: [
                        '/sounds/earth.mp3', '/sounds/earth.m4a', '/sounds/earth.wav',
                        '/audio/earth.mp3', '/audio/earth.m4a', '/audio/earth.wav'
                    ]
                },
                topone: {
                    name: 'Top One',
                    candidates: [
                        '/sounds/topone.mp3', '/sounds/topone.m4a', '/sounds/topone.wav',
                        '/audio/topone.mp3', '/audio/topone.m4a', '/audio/topone.wav',
                        '/sounds/top%20one.mp3', '/sounds/top%20one.m4a', '/sounds/top%20one.wav',
                        '/audio/top%20one.mp3', '/audio/top%20one.m4a', '/audio/top%20one.wav',
                        '/sounds/Top%20One.mp3', '/audio/Top%20One.mp3'
                    ]
                }
            };

            let current = PRESETS.quran;
            const audio = window.__focusMusicAudio;
            const btnQuran = document.getElementById('music-preset-quran');
            const btnRain = document.getElementById('music-preset-rain');
            const btnEarth = document.getElementById('music-preset-earth');
            const btnTopOne = document.getElementById('music-preset-topone');
            const toggleBtn = document.getElementById('music-toggle');
            const volumeInput = document.getElementById('music-volume');
            const nowPlaying = document.getElementById('music-nowplaying');
            function setStatus(text, isError = false) {
                if (!nowPlaying) return;
                nowPlaying.textContent = text;
                const parent = nowPlaying.closest('.small');
                if (parent) parent.classList.toggle('text-danger', !!isError);
            }

            function updateNowPlaying() {
                if (audio.src) setStatus(current.name, false); else setStatus('None', false);
            }

            function setToggleState(isPlaying) {
                if (!toggleBtn) return;
                if (isPlaying) {
                    toggleBtn.classList.remove('btn-success');
                    toggleBtn.classList.add('btn-danger');
                    toggleBtn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
                } else {
                    toggleBtn.classList.remove('btn-danger');
                    toggleBtn.classList.add('btn-success');
                    toggleBtn.innerHTML = '<i class="bi bi-play-fill"></i> Play';
                }
            }

            function setActivePreset(btn) {
                [btnQuran, btnRain, btnEarth, btnTopOne].forEach(b => b && b.classList.remove('active'));
                if (btn) btn.classList.add('active');
            }

            async function tryPlayCandidates(candidates) {
                for (const url of (candidates || [])) {
                    try {
                        audio.src = url;
                        await audio.play();
                        return true;
                    } catch (e) {
                        // try next candidate
                    }
                }
                return false;
            }

            async function loadPreset(preset, btn, autoPlay = true) {
                current = preset;
                setActivePreset(btn);
                const wasPlaying = !audio.paused;
                setStatus('Loading...', false);
                if (autoPlay || wasPlaying) {
                    const ok = await tryPlayCandidates(current.candidates || []);
                    if (ok) {
                        setStatus(current.name, false);
                        setToggleState(true);
                    } else {
                        setStatus('Cannot play. Check sounds path/names.', true);
                    }
                } else {
                    // Not auto-playing: just set first candidate as src for later play
                    const first = (current.candidates || [])[0];
                    if (first) audio.src = first;
                    updateNowPlaying();
                }
            }

            if (btnQuran) btnQuran.addEventListener('click', () => loadPreset(PRESETS.quran, btnQuran, true));
            if (btnRain) btnRain.addEventListener('click', () => loadPreset(PRESETS.rain, btnRain, true));
            if (btnEarth) btnEarth.addEventListener('click', () => loadPreset(PRESETS.earth, btnEarth, true));
            if (btnTopOne) btnTopOne.addEventListener('click', () => loadPreset(PRESETS.topone, btnTopOne, true));

            if (toggleBtn) toggleBtn.addEventListener('click', async () => {
                if (audio.paused) {
                    const ok = audio.src ? await audio.play().then(() => true).catch(() => false) : await tryPlayCandidates(current.candidates || []);
                    if (ok) {
                        setToggleState(true);
                        updateNowPlaying();
                    } else {
                        setStatus('Cannot play. Check sounds path/names.', true);
                    }
                } else {
                    audio.pause();
                    setToggleState(false);
                    updateNowPlaying();
                }
            });
        }

        // Ensure try block is balanced so the script parses correctly
    } catch (e) { }

});

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
                        const liItem = document.createElement('li');
                        liItem.className = 'list-group-item d-flex justify-content-between align-items-center';

                        // Student Info
                        const divInfo = document.createElement('div');
                        divInfo.innerHTML = `${s.name} <small class="text-muted">(${s.email})</small>`;
                        liItem.appendChild(divInfo);

                        // Actions (only for owner)
                        const userUserDropdown = document.getElementById('user-dropdown');
                        const currentLoggedInId = parseInt(userUserDropdown?.getAttribute('data-user-id') || '0', 10);
                        const iAmOwner = teacherData && (teacherData.id === currentLoggedInId);

                        if (iAmOwner) {
                            const divActions = document.createElement('div');
                            divActions.className = 'd-flex gap-2';

                            // Progress Button
                            const btnProgress = document.createElement('button');
                            btnProgress.className = 'btn btn-sm btn-outline-info';
                            btnProgress.innerHTML = '<i class="bi bi-graph-up"></i>';
                            btnProgress.title = "View Progress";
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
                            btnRemove.className = 'btn btn-sm btn-outline-danger';
                            btnRemove.innerHTML = '<i class="bi bi-person-x"></i>';
                            btnRemove.title = "Remove Student";
                            btnRemove.onclick = async (e) => {
                                e.stopPropagation();
                                if (typeof window.removeStudent === 'function') {
                                    await window.removeStudent(id, s.id, s.name);
                                    // Refresh list? The handler usually handles UI update or reload
                                    // But we might need to reload class details here if removeStudent doesn't auto-reload
                                    // Re-trigger click to reload details is easiest or just expect removeStudent to handle it
                                    // Ideally removeStudent should return success/fail
                                }
                            };
                            divActions.appendChild(btnRemove);

                            liItem.appendChild(divActions);
                        }

                        studentsUl.appendChild(liItem);
                    });
                }
            }

            // Show/Hide Leave button based on ownership (delegated LI click path)
            try {
                const leaveBtn = document.getElementById('leave-class-btn');
                const userDropdown = document.getElementById('user-dropdown');
                const currentUserId = parseInt(userDropdown?.getAttribute('data-user-id') || '', 10);
                const canCompare = !Number.isNaN(currentUserId) && currentUserId > 0;
                const isOwner = canCompare && teacher && (teacher.id === currentUserId);
                if (leaveBtn) {
                    // Show by default, then hide if owner
                    leaveBtn.style.display = '';
                    const showLeave = !!klass?.id && (!isOwner);
                    if (!showLeave) leaveBtn.style.display = 'none';
                    leaveBtn.onclick = async (ev) => {
                        ev.preventDefault(); ev.stopPropagation();
                        if (!klass?.id) return;
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
            } catch { }

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

// Save current editable document to server and My Files
window.saveCurrentDocument = async function () {
    try {
        const contentDisplay = document.getElementById('content-display');
        const fileNameDisplay = document.querySelector('.filename-display');
        const content = contentDisplay ? (contentDisplay.textContent || '') : '';
        let fileName = fileNameDisplay ? (fileNameDisplay.textContent || '').trim() : 'Untitled.txt';
        if (!fileName) fileName = 'Untitled.txt';
        const res = await fetch('/Dashboard/SaveText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ fileName, content })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.success !== true) {
            const msg = (data && data.error) ? data.error : `Save failed (HTTP ${res.status})`;
            alert(msg);
            return false;
        }
        // Update UI
        if (fileNameDisplay) fileNameDisplay.textContent = data.fileName || fileName;
        try { if (typeof addRecentFile === 'function') addRecentFile(data.fileId, data.fileName || fileName); } catch (_) { }
        // Optional: small visual feedback
        try {
            const wc = document.getElementById('word-count');
            if (wc) {
                const orig = wc.innerHTML;
                wc.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Saved';
                setTimeout(() => { wc.innerHTML = orig; }, 1200);
            }
        } catch { }
        return true;
    } catch (e) {
        alert(e?.message || 'Failed to save');
        return false;
    }
}

// Bind Ctrl+S to save
document.addEventListener('keydown', function (e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const saveCombo = (isMac && e.metaKey && e.key.toLowerCase() === 's') || (!isMac && e.ctrlKey && e.key.toLowerCase() === 's');
    if (saveCombo) {
        e.preventDefault();
        if (typeof window.saveCurrentDocument === 'function') window.saveCurrentDocument();
    }
});

// Passive auto-save when navigating back or leaving the page
// Uses sendBeacon to avoid blocking navigation; falls back to fetch with keepalive
window.autoSaveIfEditable = function () {
    try {
        const contentDisplay = document.getElementById('content-display');
        if (!contentDisplay || contentDisplay.contentEditable !== 'true') return;
        const fileNameDisplay = document.querySelector('.filename-display');
        const content = contentDisplay.textContent || '';
        let fileName = fileNameDisplay ? (fileNameDisplay.textContent || '').trim() : 'Untitled.txt';
        if (!fileName) fileName = 'Untitled.txt';
        const payload = JSON.stringify({ fileName, content });
        const url = '/Dashboard/SaveText';
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(url, blob);
        } else {
            // Fire-and-forget; keepalive allows it during unload
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                keepalive: true,
                body: payload
            }).catch(() => { });
        }
    } catch { }
};

// Save on browser back/navigation and tab close
window.addEventListener('beforeunload', function () {
    try { if (typeof window.autoSaveIfEditable === 'function') window.autoSaveIfEditable(); } catch { }
});
window.addEventListener('pagehide', function () {
    try { if (typeof window.autoSaveIfEditable === 'function') window.autoSaveIfEditable(); } catch { }
});
window.addEventListener('popstate', function () {
    try { if (typeof window.autoSaveIfEditable === 'function') window.autoSaveIfEditable(); } catch { }
});

// Heuristic: save when clicking common back elements
document.addEventListener('click', function (e) {
    const backEl = e.target && (e.target.closest('[data-action="back"]') || e.target.closest('.btn-back') || e.target.closest('a[href="#back"]'));
    if (backEl && typeof window.autoSaveIfEditable === 'function') {
        try { window.autoSaveIfEditable(); } catch { }
    }
});

const DASHBOARD_CFG = window.DASHBOARD_CFG || {};
const SELECTED_FILE_IDS = new Set();
let CURRENT_GROUP_VIEW = null; // null or group name
let GROUPS = {}; // { name: [fileId, ...] }
const DROPDOWN_ANCHORS = {};

// ===== Global Groups helpers (ensure availability outside any closures) =====
async function loadGroups() {
    try {
        const res = await fetch('/Dashboard/GetGroups', { credentials: 'same-origin' });
        const data = await res.json();
        if (res.ok && data && data.success) {
            GROUPS = data.groups || {};
            renderGroupsUI();
        }
    } catch { }
}

function renderGroupsUI() {
    const grid = document.querySelector('#uploaded-files-section .files-grid');
    if (!grid) return;
    // Remove existing group cards
    Array.from(grid.querySelectorAll('.group-card')).forEach(el => el.remove());
    // Compute set of grouped IDs
    const groupedIds = new Set();
    Object.values(GROUPS || {}).forEach(arr => (Array.isArray(arr) ? arr : []).forEach(id => groupedIds.add(Number(id))));
    // Hide grouped file cards when not viewing a specific group
    const inGroupView = !!CURRENT_GROUP_VIEW;
    Array.from(grid.children).forEach(card => {
        const idAttr = card.getAttribute && card.getAttribute('data-file-id');
        if (!idAttr) return; // skip non-file cards
        const id = parseInt(idAttr, 10);
        if (Number.isNaN(id)) return;
        if (!inGroupView) {
            card.style.display = groupedIds.has(id) ? 'none' : '';
        }
    });
    if (inGroupView) return;
    // Insert group cards for each group
    Object.keys(GROUPS || {}).forEach(name => {
        const card = document.createElement('div');
        card.className = 'file-card group-card';
        card.setAttribute('data-group-name', name);
        card.onclick = (e) => { e.preventDefault(); openGroup(name); };
        card.innerHTML = `
            <div class="file-icon-large"><img src="/images/folder icon.png" alt="Group" style="width: 36px; height: 36px; object-fit: contain;" /></div>
            <div class="file-name-card">${name}</div>
            <div class="file-meta-card"><small class="text-muted">${(GROUPS[name] || []).length} items</small></div>
        `;
        grid.insertBefore(card, grid.firstChild);
    });
}

function openGroup(name) {
    CURRENT_GROUP_VIEW = name;
    const body = document.body;
    if (body) body.classList.add('mode-group-view');
    const uploadedSection = document.getElementById('uploaded-files-section');
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl) titleEl.textContent = name;
    const manageBar = document.getElementById('files-manage-bar');
    if (manageBar) manageBar.style.display = 'flex';
    const grid = uploadedSection ? uploadedSection.querySelector('.files-grid') : null;
    if (!grid) return;
    // Hide all
    Array.from(grid.children).forEach(el => el.style.display = 'none');
    // Show only group's files
    const ids = (GROUPS && GROUPS[name]) ? GROUPS[name] : [];
    ids.forEach(id => {
        const card = grid.querySelector(`.file-card[data-file-id="${id}"]`);
        if (card) card.style.display = '';
    });
}

function exitGroupView() {
    CURRENT_GROUP_VIEW = null;
    const body = document.body;
    if (body) body.classList.remove('mode-group-view');
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl) titleEl.textContent = 'Your Files';
    const delBtn = document.getElementById('btn-delete-group');
    if (delBtn) delBtn.style.display = 'none';
    renderGroupsUI();
}

function toggleDropdown(id, evt) {
    if (evt) evt.stopPropagation();
    const dropdown = document.getElementById(`${id}-dropdown`);
    if (!dropdown) return;

    document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu.id !== `${id}-dropdown`) {
            menu.classList.remove('show');
        }
    });

    const willShow = !dropdown.classList.contains('show');
    dropdown.classList.toggle('show');

    // Smart positioning for ANY topbar dropdown to keep within viewport
    try {
        const trigger = evt?.currentTarget || document.querySelector(`button.nav-btn[onclick*="toggleDropdown('${id}')"]`);
        if (trigger) {
            if (dropdown.classList.contains('show')) {
                const key = `${id}-dropdown`;
                if (!DROPDOWN_ANCHORS[key]) {
                    DROPDOWN_ANCHORS[key] = dropdown.parentElement;
                }
                if (dropdown.parentElement !== document.body) {
                    document.body.appendChild(dropdown);
                }
                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 8}px`;
                // Align right edge of dropdown with button right edge, clamped to viewport
                dropdown.style.left = 'auto';
                dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
                dropdown.style.transform = 'none';
                dropdown.style.zIndex = 1200;
                dropdown.style.maxHeight = '70vh';
                dropdown.style.overflow = 'visible';
            } else {
                // Clear inline styles when hiding and restore to original parent
                dropdown.style.position = '';
                dropdown.style.top = '';
                dropdown.style.left = '';
                dropdown.style.right = '';
                dropdown.style.transform = '';
                dropdown.style.zIndex = '';
                dropdown.style.maxHeight = '';
                dropdown.style.overflow = '';
                const key = `${id}-dropdown`;
                if (DROPDOWN_ANCHORS[key] && dropdown.parentElement === document.body) {
                    DROPDOWN_ANCHORS[key].appendChild(dropdown);
                }
            }
        }
    } catch (e) {
        console.warn('Dropdown positioning failed:', id, e);
    }
}

['resize', 'scroll'].forEach(evtName => {
    window.addEventListener(evtName, () => {
        document.querySelectorAll('.dropdown-menu.show').forEach(dropdown => {
            const id = dropdown.id.replace('-dropdown', '');
            const trigger = document.querySelector(`button.nav-btn[onclick*="toggleDropdown('${id}')"]`);
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = `${rect.bottom + 8}px`;
                dropdown.style.left = 'auto';
                dropdown.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
                dropdown.style.transform = 'none';
                dropdown.style.zIndex = 1200;
                dropdown.style.maxHeight = '70vh';
                dropdown.style.overflow = 'visible';
            }
        });
    });
});

// Toggle an inline panel inside a dropdown (e.g., Timer inside Focus)
function toggleInlinePanel(panelId, event, ownerHint) {
    if (event) event.stopPropagation();
    // Guard: when opening calculator, ensure Focus dropdown is closed before any positioning
    if (panelId === 'tools-calculator-panel') {
        const focusDd0 = document.getElementById('focus-dropdown');
        if (focusDd0) focusDd0.classList.remove('show');
        // Close any inline panels tied to Focus
        document.querySelectorAll('.dropdown-menu.inline-left-from-focus.show').forEach(p => p.classList.remove('show'));
    }
    const panel = document.getElementById(panelId);
    if (!panel) return;

    // Close other inline panels (focus, tools, network, user)
    document.querySelectorAll('.dropdown-menu.inline-left.show, .dropdown-menu.inline-left-from-focus.show, .dropdown-menu.inline-left-from-tools.show, .dropdown-menu.inline-left-from-network.show, .dropdown-menu.inline-left-from-user.show')
        .forEach(p => { if (p.id !== panelId) p.classList.remove('show'); });

    const willShow = !panel.classList.contains('show');

    // Move to body FIRST to ensure visibility (outside of hidden overflows)
    if (willShow && panel.parentElement !== document.body) {
        document.body.appendChild(panel);
    }

    panel.classList.toggle('show');

    // If showing, position panel relative to its owning dropdown within viewport
    if (willShow && panel.classList.contains('show')) {
        // Determine owner dropdown robustly (do NOT default to Focus)
        let ownerId = ownerHint || null;
        // Explicit bindings by ID prefix or class
        if (!ownerId && (panelId === 'tools-calculator-panel' || panelId.startsWith('tools-') || panel.classList.contains('inline-left-from-tools'))) {
            ownerId = 'tools-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-user') || panelId.startsWith('profile') || panelId.startsWith('classes') || panelId.startsWith('messages') || panelId.startsWith('notifications'))) {
            ownerId = 'user-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-network') || panelId.startsWith('network-'))) {
            ownerId = 'network-notifications-dropdown';
        } else if (!ownerId && (panel.classList.contains('inline-left-from-focus') || panelId.startsWith('focus-'))) {
            ownerId = 'focus-dropdown';
        }

        const owner = ownerId ? document.getElementById(ownerId) : null;
        if (owner) {
            // Close any other top-level dropdowns except the owner to avoid conflicts
            // Special exemption: Do not close 'class-details-panel' if we are opening a child panel
            document.querySelectorAll('.dropdown-menu.show').forEach(dd => {
                const isClassDetails = dd.id === 'class-details-panel';
                const isOpeningChild = (panelId === 'cls-members-panel' || panelId === 'cls-files-panel');
                if (dd.id !== ownerId && dd !== panel && !(isClassDetails && isOpeningChild)) dd.classList.remove('show');
            });
            // Ensure the owner dropdown stays open
            if (!owner.classList.contains('show')) owner.classList.add('show');

            // Explicitly ensure Focus is closed when opening calculator
            if (panelId === 'tools-calculator-panel') {
                const focusDd = document.getElementById('focus-dropdown');
                if (focusDd) focusDd.classList.remove('show');
            }

            // Anchor to the owner dropdown rectangle (same behavior as profile panel)
            const anchorRect = owner.getBoundingClientRect();
            panel.style.position = 'fixed';
            const panelWidth = parseInt(panel.getAttribute('data-width') || '300', 10);

            // Stacking logic: Determine which panel to position relative to
            let referenceRect = anchorRect;

            // Special case: class-details-panel should open next to classes-panel, not user-dropdown
            if (panelId === 'class-details-panel') {
                const classesPanel = document.getElementById('classes-panel');
                if (classesPanel && classesPanel.classList.contains('show')) {
                    referenceRect = classesPanel.getBoundingClientRect();
                }
            }
            // Child panels of Class Details should offset from Class Details itself
            else if ((panelId === 'cls-members-panel' || panelId === 'cls-files-panel')) {
                const classDetailsPanel = document.getElementById('class-details-panel');
                if (classDetailsPanel && classDetailsPanel.classList.contains('show')) {
                    referenceRect = classDetailsPanel.getBoundingClientRect();
                }
            }

            const GAP_X = 20; // horizontal gap
            const GAP_Y = 12; // vertical gap
            const SCREEN_MARGIN = 8; // min distance from viewport edges
            panel.style.top = `${Math.max(SCREEN_MARGIN, referenceRect.top + GAP_Y)}px`;

            const desiredLeft = referenceRect.left - panelWidth - GAP_X;
            const left = Math.max(SCREEN_MARGIN, Math.min(desiredLeft, window.innerWidth - panelWidth - SCREEN_MARGIN));
            panel.style.left = `${left}px`;
            panel.style.right = 'auto';

            panel.style.width = `${panelWidth}px`;
            panel.style.transform = 'none';
            panel.style.zIndex = 2000;
            panel.style.maxHeight = '85vh';
            panel.style.overflow = 'auto';
            panel.style.maxWidth = `${Math.min(520, window.innerWidth - 16)}px`;
            panel.style.minWidth = '';
        }
    } else {
        // Clear inline styles when hiding
        panel.style.position = '';
        panel.style.top = '';
        panel.style.left = '';
        panel.style.right = '';
        panel.style.transform = '';
        panel.style.zIndex = '';
        panel.style.maxHeight = '';
        panel.style.overflow = '';
        panel.style.minWidth = '';
    }
}

// Centralized view manager for the left pane
function setLeftView(mode) {
    const uploadContainer = document.getElementById('upload-container');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const manualText = document.getElementById('manual-text');
    const uploadedSection = document.getElementById('uploaded-files-section');

    if (uploadContainer) uploadContainer.style.display = (mode === 'upload') ? 'flex' : 'none';
    if (fileDisplayContainer) fileDisplayContainer.style.display = (mode === 'viewer') ? 'flex' : 'none';
    if (manualText) manualText.style.display = (mode === 'manual') ? 'block' : 'none';
    if (uploadedSection) uploadedSection.style.display = (mode === 'files') ? 'block' : 'none';

    // Set a mode class on body to allow CSS to enforce visibility
    const body = document.body;
    if (body) {
        body.classList.remove('mode-upload', 'mode-viewer', 'mode-manual', 'mode-files', 'mode-manage-files');
        body.classList.add(`mode-${mode}`);
    }
    // Hide manage toolbar only in non-files modes; keep it visible in files/manage-files modes
    const manageBar = document.getElementById('files-manage-bar');
    if (manageBar) {
        if (mode === 'files' || mode === 'manage-files') {
            manageBar.style.display = 'flex';
        } else {
            manageBar.style.display = 'none';
        }
    }
    // Restore left title when back to files mode
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl && mode === 'files') titleEl.textContent = 'Your Recent Files';
}

// Show the files list as the main view in the left section
function showMyFiles() {
    // Enter full-manage mode for files in the left pane
    try {
        const body = document.body;
        if (body) {
            body.classList.remove('mode-upload', 'mode-viewer', 'mode-manual', 'mode-files');
            body.classList.add('mode-manage-files');
        }
        const viewer = document.getElementById('file-display-container');
        const uploadedSection = document.getElementById('uploaded-files-section');
        const topActions = document.getElementById('left-top-actions');
        const manageBar = document.getElementById('files-manage-bar');
        const titleEl = document.getElementById('uploaded-files-title-text');
        if (viewer) viewer.style.display = 'none';
        if (uploadedSection) uploadedSection.style.display = 'block';
        if (topActions) topActions.style.display = 'none';
        if (manageBar) manageBar.style.display = 'flex';
        const groupBtn = document.getElementById('btn-group-files');
        if (groupBtn) groupBtn.style.display = '';
        const deleteBtn = document.getElementById('btn-delete-files');
        if (deleteBtn) deleteBtn.style.display = '';
        if (titleEl) titleEl.textContent = 'Your Files';
        // Show all cards
        const grid = uploadedSection ? uploadedSection.querySelector('.files-grid') : null;
        if (grid) Array.from(grid.children).forEach(card => card.style.display = '');
        CURRENT_GROUP_VIEW = null;
        try { renderGroupsUI(); } catch { }
    } catch { }
}

// Toggle select all checkboxes in file cards
function toggleSelectAllFiles(master) {
    try {
        const grid = document.querySelector('#uploaded-files-section .files-grid');
        if (!grid) return;
        const boxes = grid.querySelectorAll('.file-select-checkbox');
        boxes.forEach(cb => { cb.checked = master.checked; onFileCheckboxChange(cb); });
    } catch { }
}

// Group files by simple criteria: none, type, date (uploaded day)
function groupFiles(mode) {
    try {
        const grid = document.querySelector('#uploaded-files-section .files-grid');
        if (!grid) return;
        const cards = Array.from(grid.children);
        const getType = (card) => {
            const name = (card.querySelector('.file-name-card')?.textContent || '').toLowerCase();
            if (/\.(png|jpg|jpeg|gif)$/i.test(name)) return 'Image';
            if (/\.(pdf)$/i.test(name)) return 'PDF';
            if (/\.(docx)$/i.test(name)) return 'DOCX';
            if (/\.(txt)$/i.test(name)) return 'TXT';
            return 'Other';
        };
        const getDay = (card) => {
            const t = parseInt(card.getAttribute('data-uploaded-at') || '0', 10) || 0;
            return t ? new Date(t / 10000).toDateString() : 'Unknown';
        };
        const keyFn = mode === 'type' ? getType : mode === 'date' ? getDay : null;
        if (!keyFn) {
            cards.forEach(c => grid.appendChild(c));
            return;
        }
        const groups = new Map();
        cards.forEach(c => {
            const k = keyFn(c);
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(c);
        });
        // Clear DOM and append grouped
        const order = Array.from(groups.keys()).sort();
        order.forEach(k => groups.get(k).forEach(c => grid.appendChild(c)));
    } catch { }
}

// Close dropdowns when clicking elsewhere
window.onclick = function (event) {
    // Don't close if clicking inside a dropdown or on a dropdown toggle
    if (event.target.closest('.dropdown-menu') || event.target.closest('.dropdown-toggle') || event.target.closest('.nav-btn')) {
        return;
    }

    const dropdowns = document.getElementsByClassName("dropdown-menu");
    for (let i = 0; i < dropdowns.length; i++) {
        const openDropdown = dropdowns[i];
        if (openDropdown.classList.contains('show')) {
            openDropdown.classList.remove('show');
        }
    }
}

// ======= Focus Timer Logic =======
const TIMER = {
    durationMs: 25 * 60 * 1000,
    remainingMs: 25 * 60 * 1000,
    running: false,
    intervalId: null,
    endTs: null
};

function formatMMSS(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getRemainingTimeEl() {
    try {
        const panel = document.getElementById('focus-timer-panel');
        if (!panel) return null;
        // Find the item whose title text is 'Remaining Time'
        const titles = panel.querySelectorAll('.activity-title');
        for (const t of titles) {
            if ((t.textContent || '').trim().toLowerCase() === 'remaining time') {
                const desc = t.parentElement?.querySelector('.activity-desc');
                if (desc) return desc;
            }
        }
        // Fallback: first .activity-desc inside panel
        return panel.querySelector('.activity-desc');
    } catch { return null; }
}

function updateTimerDisplay() {
    const el = getRemainingTimeEl();
    if (el) el.textContent = formatMMSS(TIMER.remainingMs);
}

function stopTimerInterval() {
    if (TIMER.intervalId) {
        clearInterval(TIMER.intervalId);
        TIMER.intervalId = null;
    }
}

function startTimer() {
    if (TIMER.running) return;
    if (TIMER.remainingMs <= 0) TIMER.remainingMs = TIMER.durationMs;
    TIMER.running = true;
    TIMER.endTs = Date.now() + TIMER.remainingMs;
    stopTimerInterval();
    TIMER.intervalId = setInterval(() => {
        const now = Date.now();
        TIMER.remainingMs = Math.max(0, TIMER.endTs - now);
        updateTimerDisplay();
        if (TIMER.remainingMs <= 0) {
            stopTimerInterval();
            TIMER.running = false;

            // Record focus session
            const durationMinutes = Math.round(TIMER.durationMs / 60000);
            if (durationMinutes > 0) {
                fetch('/Dashboard/RecordFocusSession', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        duration: durationMinutes,
                        subjectName: 'Focus Session', // Could be dynamic if we add subject selection to timer
                        activityType: 'focus_session'
                    })
                }).then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            console.log('Focus session recorded:', durationMinutes + ' min');
                            // Reload progress if panel is open
                            if (typeof loadProgressData === 'function') loadProgressData();
                        }
                    })
                    .catch(err => console.error('Error recording focus session:', err));
            }

            // Play notification sound
            const audio = new Audio('/sounds/alarm.mp3'); // Ensure this file exists or use a default
            audio.play().catch(e => console.log('Audio play failed', e));
            alert("Time's up! Great focus session.");
        }
    }, 250);
}

function pauseTimer() {
    if (!TIMER.running) return;
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = Math.max(0, TIMER.endTs - Date.now());
    updateTimerDisplay();
}

function resetTimer() {
    stopTimerInterval();
    TIMER.running = false;
    TIMER.remainingMs = TIMER.durationMs;
    updateTimerDisplay();
}

// Presets
document.querySelectorAll('.timer-preset').forEach(preset => {
    preset.addEventListener('click', function () {
        document.querySelectorAll('.timer-preset').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        const minutes = parseInt(this.getAttribute('data-minutes')) || 25;
        TIMER.durationMs = minutes * 60 * 1000;
        TIMER.remainingMs = TIMER.durationMs;
        stopTimerInterval();
        TIMER.running = false;
        updateTimerDisplay();
    });
});

// Bind Start/Pause/Reset buttons inside the timer panel
document.addEventListener('DOMContentLoaded', function () {
    // Initialize display
    updateTimerDisplay();
    const panel = document.getElementById('focus-timer-panel');
    if (!panel) return;
    const startBtn = panel.querySelector('button .bi-play')?.closest('button');
    const pauseBtn = panel.querySelector('button .bi-pause')?.closest('button');
    const resetBtn = panel.querySelector('button .bi-arrow-clockwise')?.closest('button');
    if (startBtn) startBtn.addEventListener('click', (e) => { e.stopPropagation(); startTimer(); });
    if (pauseBtn) pauseBtn.addEventListener('click', (e) => { e.stopPropagation(); pauseTimer(); });
    if (resetBtn) resetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetTimer(); });
});

// Navigation/content mapping for right-side generator panel
const sectionContent = document.getElementById('section-content');

const contentMap = {
    summary: '<h5><strong>Summary</strong></h5><p>This is where the summary will appear...</p>',
    flashcards: '<h5><strong>Flashcards</strong></h5><p>Generated flashcards go here.</p>',
    workbook: '<h5><strong>Workbook</strong></h5><p>Workbook content and exercises go here.</p>',
    quizzes: '<h5><strong>Quizzes</strong></h5><p>Questions here related to the document.</p>',
    ai: '<h5><strong>AI Assistant</strong></h5><p>Interact with the AI here.</p>'
};

// No main-nav links in current view; right-panel cards call activateSection directly

// Allow right-panel buttons to switch section safely
function activateSection(section) {
    if (!sectionContent) return;
    sectionContent.innerHTML = contentMap[section] || '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
}
// Also expose globally in case of different scopes
window.escapeHtml = window.escapeHtml || escapeHtml;

// Load files for a class and render list
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

        // Show grid, hide fallback UL (unless we want list mode, but design called for improvement)
        filesGrid.style.display = 'grid';
        filesUl.classList.add('d-none');

        files.forEach(f => {
            // Grid Card
            const card = document.createElement('div');
            card.className = 'cls-file-card p-2 border rounded-3 bg-white shadow-sm d-flex flex-column align-items-center justify-content-center text-center position-relative';
            card.style.cursor = 'pointer';
            card.title = f.name;

            // Icon
            const name = (f.name || '').toLowerCase();
            let icon = 'bi-file-earmark';
            let colorClass = 'text-secondary';
            if (/\.(pdf)$/i.test(name)) { icon = 'bi-file-earmark-pdf'; colorClass = 'text-danger'; }
            else if (/\.(docx|doc)$/i.test(name)) { icon = 'bi-file-earmark-word'; colorClass = 'text-primary'; }
            else if (/\.(png|jpg|jpeg|gif)$/i.test(name)) { icon = 'bi-file-earmark-image'; colorClass = 'text-warning'; }
            else if (/\.(txt)$/i.test(name)) { icon = 'bi-file-earmark-text'; colorClass = 'text-muted'; }

            card.innerHTML = `
                <div class="fs-1 mb-2 ${colorClass}"><i class="bi ${icon}"></i></div>
                <div class="small fw-bold text-truncate w-100">${f.name}</div>
                <div class="small text-muted" style="font-size: 0.75rem;">${formatFileSize(f.size || 0)}</div>
                <a href="${f.url}" target="_blank" class="stretched-link"></a>
            `;
            filesGrid.appendChild(card);
        });
    } catch (e) {
        const errEl = document.getElementById('cls-files-error');
        if (errEl) {
            errEl.style.display = '';
            errEl.textContent = e?.message || 'Error loading files';
        } else {
            alert(e?.message || 'Error loading files');
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

function handleFileSelection(input) {
    const fileInfo = document.getElementById('file-info');
    const errorEl = document.getElementById('upload-inline-error');
    if (errorEl) errorEl.textContent = '';

    if (!input.files || input.files.length === 0) {
        if (fileInfo) {
            fileInfo.innerHTML = '';
            fileInfo.classList.remove('show');
        }
        return false;
    }

    const file = input.files[0];
    const name = (file.name || '').toLowerCase();
    const allowedRe = /\.(txt|docx|pdf|png|jpg|jpeg|gif)$/i;
    if (!allowedRe.test(name)) {
        if (fileInfo) {
            fileInfo.innerHTML = '';
            fileInfo.classList.remove('show');
        }
        if (errorEl) errorEl.textContent = 'Unsupported file type. Allowed: PDF, DOCX, TXT, PNG, JPG, JPEG, GIF.';
        return false;
    }

    const isImage = (/\.(png|jpg|jpeg|gif)$/i).test(name) || (file.type && file.type.startsWith('image/'));
    const icon = isImage ? 'image' : 'file-text';
    const label = isImage ? 'Image' : 'Document';
    if (fileInfo) {
        fileInfo.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="bi bi-${icon} me-2"></i>
                        <strong>${file.name}</strong>
                        <span class="text-muted ms-2">(${formatFileSize(file.size)})</span>
                    </div>`;
        fileInfo.classList.add('show');
    }
    return true;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetUpload() {
    // Return to files list view
    setLeftView('files');

    // Hide viewer, show files section
    const viewer = document.getElementById('file-display-container');
    const filesSection = document.getElementById('uploaded-files-section');
    if (viewer) viewer.style.display = 'none';
    if (filesSection) filesSection.style.display = 'block';

    // Clear filename/content safely
    const nameEl = document.querySelector('.filename-display');
    const contentEl = document.getElementById('content-display');
    if (nameEl) nameEl.textContent = '';
    if (contentEl) {
        contentEl.innerHTML = '';
        contentEl.contentEditable = 'false';
    }

    // Reset form and info (if present)
    const fileInfo = document.getElementById('file-info');
    const fileInput = document.getElementById('file-upload');
    if (fileInfo) { fileInfo.innerHTML = ''; fileInfo.classList.remove('show'); }
    if (fileInput) fileInput.value = '';
}

function toggleTextInput() {
    const manualText = document.getElementById('manual-text');
    const isHidden = manualText && manualText.style.display === 'none';
    setLeftView(isHidden ? 'manual' : 'upload');
}

window.startEmptyDocument = function () {
    try {
        // Switch to the standard viewer UI
        setLeftView('viewer');

        // Hide other sections
        const manualText = document.getElementById('manual-text');
        if (manualText) manualText.style.display = 'none';
        const uploadContainer = document.getElementById('upload-container');
        if (uploadContainer) uploadContainer.style.display = 'none';

        // Show the file display container
        const fileDisplayContainer = document.getElementById('file-display-container');
        if (fileDisplayContainer) fileDisplayContainer.style.display = 'flex';

        // Prepare editable content area
        const fileNameDisplay = document.querySelector('.filename-display');
        if (fileNameDisplay) fileNameDisplay.textContent = 'Untitled.txt';
        const contentDisplay = document.getElementById('content-display');
        const contentWrapper = document.getElementById('content-wrapper');
        // Ensure white background: clear dark/reading modes
        if (contentWrapper) contentWrapper.classList.remove('dark-mode');
        if (contentDisplay) contentDisplay.classList.remove('reading-mode');
        if (contentDisplay) {
            contentDisplay.innerHTML = '';
            contentDisplay.contentEditable = 'true';
            contentDisplay.focus();
        }
    } catch { }
}

function submitManualText() {
    const textArea = document.querySelector('#manual-text textarea');
    const manualText = document.getElementById('manual-text');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const contentDisplay = document.getElementById('content-display');
    const fileNameDisplay = document.querySelector('.filename-display');
    if (textArea.value.trim() !== '') {
        if (fileNameDisplay) fileNameDisplay.textContent = 'Manual Text';
        if (contentDisplay) contentDisplay.textContent = textArea.value;
        manualText.style.display = 'none';
        if (fileDisplayContainer) fileDisplayContainer.style.display = 'flex';
        setLeftView('viewer');
        updateWordCount();
        formatDisplayedText();
    } else {
        alert('Please enter some text before submitting.');
    }
}

function formatDisplayedText() {
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) {
        let text = contentDisplay.textContent || contentDisplay.innerText;
        if (text) {
            // Replace multiple newlines with paragraph breaks
            text = text.replace(/\n\s*\n/g, '</p><p>');
            // Replace single newlines with line breaks
            text = text.replace(/\n/g, '<br>');
            // Wrap in paragraphs if not already wrapped
            if (!text.startsWith('<p>')) {
                text = '<p>' + text + '</p>';
            }
            contentDisplay.innerHTML = text;
        }
    }
}

function formatTextWithLineBreaks(text) {
    return text.replace(/\n/g, '<br>');
}

function showUploadedFile(filename, content) {
    const fileDisplay = document.getElementById('file-display-container');
    const fileNameDisplay = document.querySelector('.filename-display');
    const contentDisplay = document.getElementById('content-display');

    if (fileNameDisplay) {
        fileNameDisplay.textContent = filename;
    }
    contentDisplay.innerHTML = formatTextWithLineBreaks(content);
    fileDisplay.style.display = 'flex';
    document.getElementById('upload-container').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
    const fileDisplayContainer = document.getElementById('file-display-container');
    const contentDisplay = document.getElementById('content-display');
    const uploadedSection = document.getElementById('uploaded-files-section');

    if (fileDisplayContainer.style.display === 'flex' && contentDisplay) {
        if (uploadedSection) uploadedSection.style.display = 'none';
        formatDisplayedText();
        updateWordCount();
    }
});

let currentFontSize = 1.1;
let currentLineHeight = 1.8;
let isDarkMode = false;
let isReadingMode = false;

function adjustFontSize(action) {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentText = isSummaryActive
        ? document.getElementById('summary-content-display')
        : document.querySelector('.content-text');

    if (contentText) {
        if (action === 'increase' && currentFontSize < 1.5) {
            currentFontSize += 0.1;
        } else if (action === 'decrease' && currentFontSize > 0.8) {
            currentFontSize -= 0.1;
        }
        contentText.style.fontSize = `${currentFontSize}rem`;
    }
}

function toggleLineHeight() {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentText = isSummaryActive
        ? document.getElementById('summary-content-display')
        : document.querySelector('.content-text');

    if (contentText) {
        currentLineHeight = currentLineHeight === 1.8 ? 2.2 : 1.8;
        contentText.style.lineHeight = currentLineHeight;
    }
}

function updateWordCount() {
    const contentDisplay = document.getElementById('content-display');
    const summaryContentDisplay = document.getElementById('summary-content-display');
    const wordCountElement = document.getElementById('word-count');
    const summaryWordCountElement = document.getElementById('summary-word-count');

    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';

    const activeContent = isSummaryActive ? summaryContentDisplay : contentDisplay;
    const activeWordCount = isSummaryActive ? summaryWordCountElement : wordCountElement;

    if (activeContent && activeWordCount) {
        const text = activeContent.textContent || '';
        const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;

        const currentCount = parseInt(activeWordCount.textContent.split(' ')[0]) || 0;
        animateNumber(currentCount, wordCount, (count) => {
            activeWordCount.innerHTML = `<i class="bi bi-hash me-1"></i>${count} words`;
        });

        const readTimeElement = isSummaryActive
            ? document.getElementById('summary-read-time')
            : document.getElementById('read-time');

        if (readTimeElement) {
            const minutes = Math.ceil(wordCount / 200);
            readTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${minutes} min read`;
        }
    }
}

function updateReadTime(wordCount) {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';

    const readTimeElement = isSummaryActive
        ? document.getElementById('summary-read-time')
        : document.getElementById('read-time');

    if (readTimeElement) {
        const minutes = Math.ceil(wordCount / 200);
        readTimeElement.innerHTML = `<i class="bi bi-clock me-1"></i>${minutes} min read`;
    }
}

function animateNumber(start, end, callback) {
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = Math.floor(start + (end - start) * progress);
        callback(current);

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function downloadContent() {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentDisplay = isSummaryActive
        ? document.getElementById('summary-content-display')
        : document.getElementById('content-display');
    const fileNameDisplay = isSummaryActive
        ? document.getElementById('summary-filename-display')
        : document.querySelector('.filename-display');

    if (contentDisplay) {
        const content = contentDisplay.textContent;
        const filename = fileNameDisplay ? fileNameDisplay.textContent : 'document.txt';
        const blob = new Blob([content], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
}

function shareContent() {
    if (navigator.share) {
        const summaryContainer = document.getElementById('summary-display-container');
        const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
        const contentDisplay = isSummaryActive
            ? document.getElementById('summary-content-display')
            : document.getElementById('content-display');
        const fileNameDisplay = isSummaryActive
            ? document.getElementById('summary-filename-display')
            : document.querySelector('.filename-display');

        if (contentDisplay) {
            const filename = fileNameDisplay ? fileNameDisplay.textContent : 'Document';
            navigator.share({
                title: filename,
                text: contentDisplay.textContent,
            }).catch(console.error);
        }
    }
}

function toggleDarkMode() {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentWrapper = isSummaryActive
        ? document.getElementById('summary-content-wrapper')
        : document.getElementById('content-wrapper');

    if (contentWrapper) {
        isDarkMode = !isDarkMode;
        contentWrapper.classList.toggle('dark-mode');
    }
}

function toggleReadingMode() {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentDisplay = isSummaryActive
        ? document.getElementById('summary-content-display')
        : document.getElementById('content-display');

    if (!contentDisplay) return;

    isReadingMode = !isReadingMode;
    contentDisplay.classList.toggle('reading-mode');
}

function setTextAlign(alignment) {
    const summaryContainer = document.getElementById('summary-display-container');
    const isSummaryActive = summaryContainer && summaryContainer.style.display !== 'none';
    const contentDisplay = isSummaryActive
        ? document.getElementById('summary-content-display')
        : document.getElementById('content-display');

    if (contentDisplay) {
        contentDisplay.style.textAlign = alignment;
    }

    // Update active state of alignment buttons
    document.querySelectorAll('.controls-bar .btn-group:first-child .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    // Find the button by its onclick signature
    const selector = `.controls-bar .btn-group:first-child button[onclick="setTextAlign('${alignment}')"]`;
    const btn = document.querySelector(selector);
    if (btn) btn.classList.add('active');
}

// Function to open uploaded files
function openFile(fileId) {
    // Switch to left viewer mode
    setLeftView('viewer');
    const fileDisplayContainer = document.getElementById('file-display-container');
    const contentDisplay = document.getElementById('content-display');
    const fileNameDisplay = document.querySelector('.filename-display');
    if (fileDisplayContainer) {
        fileDisplayContainer.style.display = 'flex';

        const leftPane = fileDisplayContainer.closest('.left-side');
        if (leftPane) {
            leftPane.scrollTop = 0;
            fileDisplayContainer.scrollTop = 0;
            requestAnimationFrame(() => {
                leftPane.scrollTop = 0;
                fileDisplayContainer.scrollTop = 0;
            });
        }
    }
    if (fileNameDisplay) fileNameDisplay.textContent = 'Loading...';
    if (contentDisplay) {
        contentDisplay.contentEditable = 'false';
        contentDisplay.innerHTML = '<div class="text-center p-4"><i class="bi bi-hourglass-split text-primary" style="font-size: 2rem;"></i><p class="mt-2">Loading file content...</p></div>';
    }

    // Make AJAX call to get file content
    const url = `${(window.DASHBOARD_CFG && window.DASHBOARD_CFG.getFileContentUrl ? window.DASHBOARD_CFG.getFileContentUrl : '/Dashboard/GetFileContent')}?fileId=${fileId}`;
    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin' // ensure cookies/session are sent
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to load file');
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to load file');
            }

            // Update the left viewer display
            if (contentDisplay && fileNameDisplay) {
                fileNameDisplay.textContent = data.fileName;
                if (data.displayType === 'image') {
                    contentDisplay.innerHTML = `<div class="text-center p-4"><img src="${data.content}" alt="${data.fileName}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"></div>`;
                } else if (data.displayType === 'pdf') {
                    contentDisplay.innerHTML = `
                        <div class="p-2" style="height: calc(100vh - 260px);">
                            <iframe src="${data.content}#view=fitH" style="width:100%; height:100%; border: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);"></iframe>
                        </div>`;
                } else if (data.displayType === 'text') {
                    contentDisplay.innerHTML = formatTextWithLineBreaks(data.content || '');
                    contentDisplay.contentEditable = 'false';
                } else {
                    contentDisplay.innerHTML = `<div class="text-center p-4"><p class="text-muted">${data.content || 'Preview not available for this file type.'}</p></div>`;
                }
                if (typeof updateWordCount === 'function') updateWordCount();
                try { addRecentFile(fileId, data.fileName); } catch (_) { }
            }
        })
        .catch(error => {
            console.error('Error loading file:', error);
            if (contentDisplay && fileNameDisplay) {
                fileNameDisplay.textContent = 'Error Loading File';
                contentDisplay.innerHTML = `<div class="text-center p-4 text-danger"><i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i><p class="mt-2">${error.message || 'Failed to load file content'}</p></div>`;
            }
        });
}

// ===== Recent files (localStorage) =====
const RECENT_KEY = 'adhd_recent_files';
const RECENT_MAX = 10;

function getRecentFiles() {
    return safeStorage.get(RECENT_KEY, []).filter(x => x && typeof x.id === 'number');
}

function saveRecentFiles(list) {
    safeStorage.set(RECENT_KEY, list);
}

function addRecentFile(id, name) {
    const now = Date.now();
    let list = getRecentFiles().filter(x => x && typeof x.id === 'number');
    // Remove if exists
    list = list.filter(x => x.id !== id);
    // Add to front
    list.unshift({ id, name, ts: now });
    // Trim
    if (list.length > RECENT_MAX) list = list.slice(0, RECENT_MAX);
    saveRecentFiles(list);
}

function showRecentFiles() {
    setLeftView('files');
    const uploadedSection = document.getElementById('uploaded-files-section');
    const grid = uploadedSection ? uploadedSection.querySelector('.files-grid') : null;
    const titleEl = document.getElementById('uploaded-files-title-text');
    if (titleEl) titleEl.textContent = 'Your Recent Files';
    if (!grid) return;
    const recent = getRecentFiles();
    // If no recent, show all (fallback)
    if (!Array.isArray(recent) || recent.length === 0) {
        Array.from(grid.children).forEach(card => card.style.display = '');
        return;
    }

    // Sort recent by timestamp desc just in case
    const sorted = [...recent]
        .filter(r => r && typeof r.id === 'number')
        .sort((a, b) => (b.ts || 0) - (a.ts || 0));

    // Build a map from file id to card element
    const cardMap = new Map();
    Array.from(grid.children).forEach(card => {
        const idAttr = card.getAttribute('data-file-id');
        const id = idAttr ? parseInt(idAttr) : NaN;
        if (!Number.isNaN(id)) {
            cardMap.set(id, card);
        }
    });

    // Reorder DOM: append recent cards in sorted order and show them
    sorted.forEach(item => {
        const card = cardMap.get(item.id);
        if (card) {
            card.style.display = '';
            // Append moves the node to the end, effectively reordering
            grid.appendChild(card);
        }
    });

    // Hide non-recent cards
    cardMap.forEach((card, id) => {
        if (!sorted.find(r => r.id === id)) {
            card.style.display = 'none';
        }
    });
}

// Reorder files by last opened (client-side) on initial load
function reorderFilesByRecent() {
    try {
        const uploadedSection = document.getElementById('uploaded-files-section');
        if (!uploadedSection) return;
        const grid = uploadedSection.querySelector('.files-grid');
        if (!grid) return;

        const recent = getRecentFiles();
        const cards = Array.from(grid.children);
        if (!cards || cards.length === 0) return;

        // Build maps
        const cardById = new Map();
        cards.forEach(card => {
            const idAttr = card.getAttribute('data-file-id');
            const id = idAttr ? parseInt(idAttr, 10) : NaN;
            if (!Number.isNaN(id)) cardById.set(id, card);
        });

        // Prepare recent ordered list of cards
        const recentOrderedCards = [];
        if (Array.isArray(recent) && recent.length > 0) {
            const sortedRecent = [...recent]
                .filter(r => r && typeof r.id === 'number')
                .sort((a, b) => (b.ts || 0) - (a.ts || 0));
            sortedRecent.forEach(r => {
                const card = cardById.get(r.id);
                if (card) recentOrderedCards.push(card);
            });
        }

        // Remaining cards sorted by uploaded-at desc (fallback)
        const remaining = cards.filter(c => !recentOrderedCards.includes(c));
        remaining.sort((a, b) => {
            const ta = parseInt(a.getAttribute('data-uploaded-at') || '0', 10) || 0;
            const tb = parseInt(b.getAttribute('data-uploaded-at') || '0', 10) || 0;
            return tb - ta;
        });

        const finalOrder = [...recentOrderedCards, ...remaining];
        finalOrder.forEach(card => grid.appendChild(card));

        const titleEl = document.getElementById('uploaded-files-title-text');
        if (titleEl) titleEl.textContent = 'Your Recent Files';
    } catch (_) { }
}

// Global: handle selection checkbox on file cards
function onFileCheckboxChange(checkbox) {
    const idAttr = checkbox.getAttribute('data-file-id');
    const id = idAttr ? parseInt(idAttr) : NaN;
    if (Number.isNaN(id)) return;

    const card = checkbox.closest('.file-card');
    if (checkbox.checked) {
        SELECTED_FILE_IDS.add(id);
        if (card) card.classList.add('selected');
    } else {
        SELECTED_FILE_IDS.delete(id);
        if (card) card.classList.remove('selected');
    }
}

// Global: delete selected files (first click enables selection, second confirms delete)
function deleteSelectedFiles() {
    if (SELECTED_FILE_IDS.size === 0) {
        enterManageSelectionMode('delete');
        return;
    }
    if (!confirm('Delete selected file(s)? This action cannot be undone.')) {
        return;
    }

    const ids = Array.from(SELECTED_FILE_IDS);
    fetch('/Dashboard/DeleteFiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(ids)
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Delete failed');
            ids.forEach(id => {
                const card = document.querySelector(`.file-card[data-file-id="${id}"]`);
                if (card && card.parentElement) card.parentElement.removeChild(card);
            });
            SELECTED_FILE_IDS.clear();
            const grid = document.querySelector('.files-grid');
            if (!grid || grid.children.length === 0) {
                window.location.reload();
            }
        })
        .catch(err => {
            console.error('Delete error:', err);
            alert('Failed to delete files.');
        });
}

// Global: delete single file (for Quick Actions)
function deleteFile(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('Are you sure you want to delete this file?')) return;

    fetch('/Dashboard/DeleteFiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify([id])
    })
        .then(res => res.json())
        .then(data => {
            if (!data.success) throw new Error(data.error || 'Delete failed');
            const card = document.querySelector(`.file-card[data-file-id="${id}"]`);
            if (card && card.parentElement) {
                card.parentElement.removeChild(card);
                // Check if grid is empty
                const grid = document.querySelector('.files-grid');
                if (!grid || grid.children.length === 0) {
                    window.location.reload();
                }
            }
        })
        .catch(err => {
            console.error('Delete error:', err);
            alert('Failed to delete file.');
        });
}

// Global: group selected files (first click enables selection, second groups)
function groupSelectedFiles() {
    if (SELECTED_FILE_IDS.size === 0) {
        enterManageSelectionMode('group');
        return;
    }
    const name = prompt('Group name:');
    if (!name) return;
    const ids = Array.from(SELECTED_FILE_IDS);
    // Persist group to backend, then update UI
    fetch('/Dashboard/SaveGroup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ name, fileIds: ids })
    })
        .then(res => res.json())
        .then(data => {
            if (!data || data.success !== true) throw new Error(data && data.error ? data.error : 'Save group failed');
            // Update in-memory groups and UI
            GROUPS = GROUPS || {};
            GROUPS[data.name || name] = Array.isArray(data.fileIds) ? data.fileIds : ids;
            SELECTED_FILE_IDS.clear();
            CURRENT_ACTION_MODE = null;
            openGroup(data.name || name);
            renderGroupsUI();
        })
        .catch(err => {
            alert(err?.message || 'Failed to save group');
        });
}

// Load groups on page ready
// Initialize components on page load
document.addEventListener('DOMContentLoaded', function () {
    try {
        loadGroups();
        reorderFilesByRecent();
    } catch (_) { }

    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Setup dark mode toggle
    const dm = document.getElementById('setting-darkmode');
    if (dm) {
        const wrapper = document.getElementById('content-wrapper');
        dm.checked = !!(wrapper && wrapper.classList.contains('dark-mode'));
        dm.addEventListener('change', function () { toggleDarkMode(); });
    }
});

// ===== ACCOUNT MANAGEMENT =====
document.addEventListener('DOMContentLoaded', function () {
    // Delete Account button handler
    const delBtn = document.getElementById('delete-account-btn');
    if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
            try {
                delBtn.disabled = true;
                delBtn.textContent = 'Deleting...';
                const res = await fetch('/Account/DeleteAccount', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin'
                });
                const ct = (res.headers.get('content-type') || '').toLowerCase();
                const data = ct.includes('application/json') ? await res.json() : null;
                if (!res.ok || !data || data.success !== true) {
                    const msg = (data && data.error) ? data.error : `Failed (HTTP ${res.status})`;
                    alert('Delete failed: ' + msg);
                    return;
                }
                window.location.href = '/Account/EnterEmail';
            } catch (err) {
                alert('Delete failed: ' + (err?.message || 'Unknown error'));
            } finally {
                delBtn.disabled = false;
                delBtn.textContent = 'Delete Account';
            }
        });
    }
});

// ===== Network/Friend Request Functions =====

/**
 * Unified friend request function that handles both modal and inline forms
 * @param {Object} config - Configuration object
 * @param {string} config.inputId - ID of the input element
 * @param {string} config.feedbackId - ID of the feedback element
 * @param {string} config.buttonId - ID of the submit button
 * @param {string} config.modalId - ID of the modal to close on success (optional)
 * @param {string} config.panelId - ID of the panel to toggle on success (optional)
 * @param {boolean} config.enableSearch - Whether to enable user search (default: false)
 */
function sendFriendRequest(config) {
    // Allow calling with no args (as used by the modal button in Index.cshtml)
    if (!config) { try { return sendFriendRequestModal(); } catch (_) { return; } }
    const input = document.getElementById(config.inputId);
    const feedback = document.getElementById(config.feedbackId);
    const button = document.getElementById(config.buttonId);

    if (!input) {
        console.error(`Friend request: input element '${config.inputId}' not found`);
        return;
    }

    const val = (input.value || '').trim();
    const id = parseInt(val, 10);

    if (!val || (Number.isNaN(id) && val.length < 2)) {
        if (feedback) {
            feedback.textContent = 'Please enter a valid User ID or start typing a name to search.';
            feedback.className = 'small text-danger';
        }
        return;
    }

    (async () => {
        try {
            if (button) {
                button.disabled = true;
                button.textContent = 'Sending...';
            }
            if (feedback) {
                feedback.textContent = '';
                feedback.className = 'small';
            }

            const response = await fetch('/Friends/Send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ addresseeId: id })
            });

            let data;
            try {
                data = await response.json();
            } catch {
                data = null;
            }

            if (!response.ok) {
                const msg = data?.error || `Request failed with status ${response.status}`;
                throw new Error(msg);
            }

            if (!data || data.success !== true) {
                const msg = (data && data.error) ? data.error : 'Request failed';
                throw new Error(msg);
            }

            if (feedback) {
                feedback.textContent = 'Request sent successfully.';
                feedback.className = 'small text-success';
            }
            if (button) button.textContent = 'Sent';

            // Handle success callback
            if (config.modalId) {
                setTimeout(() => {
                    try {
                        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById(config.modalId));
                        modal.hide();
                    } catch { }
                }, 700);
            } else if (config.panelId) {
                setTimeout(() => {
                    try {
                        toggleInlinePanel(config.panelId);
                    } catch { }
                }, 700);
            }

        } catch (err) {
            console.error('Friend request error:', err);
            if (feedback) {
                feedback.textContent = err?.message || 'Failed to send request';
                feedback.className = 'small text-danger';
            }
            if (button) {
                button.disabled = false;
                button.textContent = 'Send Request';
            }
        }
    })();
}

// Modal friend request handler
function sendFriendRequestModal() {
    sendFriendRequest({
        inputId: 'addresseeIdInput',
        feedbackId: 'add-network-feedback',
        buttonId: 'send-friend-request-btn',
        modalId: 'addNetworkModal',
        enableSearch: true
    });
}

// Inline friend request handler
function sendFriendRequestInline() {
    sendFriendRequest({
        inputId: 'addresseeIdInlineInput',
        feedbackId: 'add-network-inline-feedback',
        buttonId: 'send-friend-request-inline-btn',
        panelId: 'network-add-panel'
    });
}

// Global function invoked by button onclick for Classes only
function openClassesInlinePanel(event) {
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

                const openClassDetails = async (id) => {
                    if (!id) return;
                    const titleEl = document.getElementById('cls-title');
                    const codeEl = document.getElementById('cls-code');
                    const teacherEl = document.getElementById('cls-teacher');
                    const studentsUl = document.getElementById('cls-students');
                    if (teacherEl) teacherEl.textContent = 'Loading...';
                    if (titleEl) titleEl.textContent = 'Class';
                    if (codeEl) codeEl.textContent = '';
                    if (studentsUl) studentsUl.innerHTML = '';

                    const myPanel = document.getElementById('classes-panel');
                    const userDropdown = document.getElementById('user-dropdown');
                    if (userDropdown && !userDropdown.classList.contains('show')) userDropdown.classList.add('show');

                    // Open class-details-panel positioned relative to classes-panel (not user-dropdown)
                    // We need to ensure classes-panel is still visible when we calculate position
                    // So we call toggleInlinePanel BEFORE hiding classes-panel
                    toggleInlinePanel('class-details-panel', null, 'user-dropdown');

                    if (window.__setClassDetailsActiveTab) window.__setClassDetailsActiveTab('info');

                    // Now hide classes-panel after details panel is positioned
                    if (myPanel) myPanel.classList.remove('show');
                    try {
                        const res = await fetch(`/Classes/Details?id=${id}`, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' });
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || 'Failed to load class');
                        const klass = data.Class || data.class;
                        const teacher = data.Teacher || data.teacher;
                        const studentsArr = data.Students || data.students;

                        const currentUserId = parseInt(userDropdown?.getAttribute('data-user-id') || '', 10);
                        const canCompare = !Number.isNaN(currentUserId) && currentUserId > 0;
                        const isOwner = canCompare && teacher && (teacher.id === currentUserId);

                        if (titleEl) titleEl.textContent = klass?.name || 'Class';
                        if (codeEl) codeEl.textContent = klass?.code ? `(Code: ${klass.code})` : '';
                        if (teacherEl) teacherEl.textContent = teacher ? `${teacher.name} (${teacher.email})` : '—';

                        const membersPanelUl = document.getElementById('cls-members-list');
                        if (membersPanelUl) {
                            membersPanelUl.innerHTML = '';
                            const students = Array.isArray(studentsArr) ? studentsArr : [];
                            if (students.length === 0) {
                                membersPanelUl.innerHTML = '<li class="list-group-item text-muted small">No students in this class.</li>';
                            } else {
                                students.forEach(s => {
                                    const isMe = s.id === currentUserId;
                                    const showRemove = isOwner && !isMe;
                                    const li = document.createElement('li');
                                    li.className = 'list-group-item d-flex justify-content-between align-items-center py-2 px-3';
                                    li.innerHTML = `
                                        <div class="d-flex align-items-center gap-2">
                                            <div class="bg-light rounded-circle d-flex align-items-center justify-content-center text-primary" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                                <i class="bi bi-person-fill"></i>
                                            </div>
                                            <div>
                                                <div class="fw-bold text-dark" style="font-size: 0.9rem;">${esc(s.name)}</div>
                                                <div class="text-muted" style="font-size: 0.75rem;">ID: ${s.id}</div>
                                            </div>
                                        </div>
                                        <div class="dropdown">
                                            <button class="btn btn-sm btn-light rounded-circle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="bi bi-three-dots-vertical"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="font-size: 0.85rem;">
                                                <li><a class="dropdown-item" href="#" onclick="alert('Student analytics coming soon for ${esc(s.name)}'); return false;"><i class="bi bi-graph-up me-2 text-primary"></i>Analytics</a></li>
                                                ${showRemove ? `<li><hr class="dropdown-divider"></li>
                                                <li><a class="dropdown-item text-danger" href="#" onclick="removeStudent(${klass.id}, ${s.id}, '${esc(s.name)}'); return false;"><i class="bi bi-person-dash me-2"></i>Remove</a></li>` : ''}
                                            </ul>
                                        </div>
                                    `;
                                    membersPanelUl.appendChild(li);
                                });
                            }

                            // Update student count stat card
                            const studentCountEl = document.getElementById('cls-stat-students');
                            if (studentCountEl) {
                                studentCountEl.textContent = students.length;
                            }
                        }

                        try {
                            const filesUl = document.getElementById('cls-files');
                            if (filesUl) filesUl.innerHTML = '';
                            window.__currentClassId = klass?.id || null;
                            const uploadWrap = document.getElementById('cls-files-upload');
                            if (uploadWrap) uploadWrap.style.display = isOwner ? '' : 'none';
                            if (typeof setupClassUpload === 'function') setupClassUpload(isOwner);
                            if (klass?.id && typeof loadClassFiles === 'function') await loadClassFiles(klass.id);
                        } catch { }

                        const leaveBtn = document.getElementById('leave-class-btn');
                        const deleteBtn = document.getElementById('delete-class-btn');
                        try {
                            if (leaveBtn) {
                                leaveBtn.style.display = (!klass?.id || isOwner) ? 'none' : '';
                                leaveBtn.onclick = async (ev) => {
                                    ev.preventDefault(); ev.stopPropagation();
                                    if (!klass?.id) return;
                                    if (!confirm('Leave this class?')) return;
                                    try {
                                        leaveBtn.disabled = true;
                                        const res = await fetch('/Classes/Leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: klass.id }) });
                                        const resp = await res.json();
                                        if (!resp.success) throw new Error(resp.error || 'Failed to leave');
                                        const detailsPanel = document.getElementById('class-details-panel');
                                        if (detailsPanel) detailsPanel.classList.remove('show');
                                        toggleInlinePanel('classes-panel');
                                    } catch (er) { alert(er?.message || 'Failed to leave class'); } finally { leaveBtn.disabled = false; }
                                };
                            }
                            if (deleteBtn) {
                                deleteBtn.style.display = (klass?.id && isOwner) ? '' : 'none';
                                deleteBtn.onclick = async (ev) => {
                                    ev.preventDefault(); ev.stopPropagation();
                                    if (!klass?.id) return;
                                    if (!confirm('Delete this class? This will remove the class and all memberships.')) return;
                                    try {
                                        deleteBtn.disabled = true;
                                        const res = await fetch('/Classes/Delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id: klass.id }) });
                                        const resp = await res.json();
                                        if (!resp.success) throw new Error(resp.error || 'Failed to delete class');
                                        const detailsPanel = document.getElementById('class-details-panel');
                                        if (detailsPanel) detailsPanel.classList.remove('show');
                                        toggleInlinePanel('classes-panel');
                                    } catch (er) { alert(er?.message || 'Failed to delete class'); } finally { deleteBtn.disabled = false; }
                                };
                            }
                        } catch { }
                    } catch (err) {
                        if (teacherEl) teacherEl.textContent = 'Error loading class';
                    }
                };

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

                    li.onclick = (ev) => {
                        ev.stopPropagation();
                        if (ev.target.closest('button')) return;
                        openClassDetails(c.id);
                    };

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

        if (joinBtn && joinInput) {
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

        if (addClassBtn && addClassInput) {
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
}

// Global function invoked by button onclick
function openAddNetworkModal() {
    try {
        // Close any open dropdowns so modal isn't obscured by high z-index menus
        document.querySelectorAll('.dropdown-menu.show').forEach(openDropdown => {
            openDropdown.classList.remove('show');
            // Clear inline styles applied by toggleDropdown()
            openDropdown.style.position = '';
            openDropdown.style.top = '';
            openDropdown.style.left = '';
            openDropdown.style.right = '';
            openDropdown.style.transform = '';
            openDropdown.style.zIndex = '';
            openDropdown.style.maxHeight = '';
            openDropdown.style.overflow = '';
        });

        const modalEl = document.getElementById('addNetworkModal');
        if (!modalEl) return;
        const feedback = document.getElementById('add-network-feedback');
        if (feedback) {
            feedback.textContent = '';
            feedback.className = 'small';
        }
        const input = document.getElementById('addresseeIdInput');
        if (input) input.value = '';
        // Reset send button state
        const sendBtn = document.getElementById('send-friend-request-btn');
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send Request';
        }
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        modal.show();
    } catch (e) { console.error('Failed to open Add Network modal', e); }
}

// ===== ERROR HANDLING HELPERS =====

/**
 * Safe function execution helper
 */
function safeExecute(fn, ...args) {
    try {
        return fn(...args);
    } catch (_) {
        return null;
    }
}

/**
 * Safe localStorage operations
 */
const safeStorage = {
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (_) {
            return false;
        }
    },
    get: (key, defaultValue = null) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (_) {
            return defaultValue;
        }
    }
};

// ===== FRIEND REQUESTS =====
document.addEventListener('DOMContentLoaded', function () {
    // Modal friend request
    const sendBtn = document.getElementById('send-friend-request-btn');
    const form = document.getElementById('add-network-form');
    const handler = async function (evt) {
        if (evt) evt.preventDefault();
        sendFriendRequestModal();
    };
    if (sendBtn) sendBtn.addEventListener('click', handler);
    if (form) form.addEventListener('submit', handler);

    // Inline friend request
    const sendBtnInline = document.getElementById('send-friend-request-inline-btn');
    if (sendBtnInline) {
        sendBtnInline.addEventListener('click', async function (evt) {
            if (evt) evt.preventDefault();
            const input = document.getElementById('addresseeIdInlineInput');
            const feedback = document.getElementById('add-network-inline-feedback');
            if (!input) {
                console.error('Inline Add Network: input element missing');
                return;
            }
            const val = (input.value || '').trim();
            const id = parseInt(val, 10);

            if (!val || (Number.isNaN(id) && val.length < 2)) {
                if (feedback) {
                    feedback.textContent = 'Please enter a valid User ID or start typing a name to search.';
                    feedback.className = 'small text-danger';
                }
                return;
            }

            try {
                sendBtnInline.disabled = true;
                sendBtnInline.textContent = 'Sending...';
                if (feedback) { feedback.textContent = ''; feedback.className = 'small'; }

                const res = await fetch('/Friends/Send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ addresseeId: id })
                });
                let data;
                try { data = await res.json(); } catch { data = null; }

                if (!res.ok) {
                    const msg = data?.error || `Request failed with status ${res.status}`;
                    throw new Error(msg);
                }

                if (!data || data.success !== true) {
                    const msg = (data && data.error) ? data.error : 'Request failed';
                    throw new Error(msg);
                }

                if (feedback) {
                    feedback.textContent = 'Request sent successfully.';
                    feedback.className = 'small text-success';
                }
                sendBtnInline.textContent = 'Sent';

                setTimeout(() => {
                    try {
                        toggleInlinePanel('network-add-panel');
                    } catch { }
                }, 700);
            } catch (err) {
                console.error('Inline friend request error:', err);
                if (feedback) {
                    feedback.textContent = err?.message || 'Failed to send request';
                    feedback.className = 'small text-danger';
                }
                sendBtnInline.disabled = false;
                sendBtnInline.textContent = 'Send Request';
            }
        });
    }
});

// ===== AUDIO NOTES =====

function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updateAudioTimer() {
    const now = Date.now();
    const diff = (now - audioStartTime) / 1000;
    const timerEl = document.getElementById('audio-timer');
    if (timerEl) timerEl.textContent = formatTime(diff);
}

function renderAudioList() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    // Load saved audios from server
    loadSavedAudios();
}

// Load saved audios from server
async function loadSavedAudios() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    console.log('Loading saved audios...');

    try {
        const res = await fetch('/Dashboard/GetAudioFiles', {
            method: 'GET',
            credentials: 'same-origin'
        });

        console.log('GetAudioFiles response status:', res.status);

        const data = await res.json().catch(() => null);
        console.log('GetAudioFiles response data:', data);

        if (!res.ok || !data || data.success !== true) {
            console.log('Server failed, showing session audios only');
            // If server fails, show current session audios only
            renderSessionAudios();
            return;
        }

        const savedAudios = data.audios || [];
        console.log('Saved audios loaded:', savedAudios.length);

        if (savedAudios.length === 0 && audioRecordings.length === 0) {
            console.log('No audios to display');
            container.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <i class="bi bi-mic-mute fs-4 d-block mb-2"></i>
                    No recordings yet
                </div>`;
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Render saved audios first
        savedAudios.forEach(audio => {
            console.log('Adding saved audio:', audio.fileName);
            addSavedAudioToList(audio);
        });

        // Render session audios (recorded audios)
        audioRecordings.forEach(rec => {
            console.log('Adding session audio:', rec.duration);
            addSessionAudioToList(rec);
        });

    } catch (error) {
        console.error('Failed to load saved audios:', error);
        renderSessionAudios();
    }
}

// Render session audios only (fallback)
function renderSessionAudios() {
    const container = document.getElementById('audio-list-container');
    if (!container) return;

    if (audioRecordings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <i class="bi bi-mic-mute fs-4 d-block mb-2"></i>
                No recordings yet
            </div>`;
        return;
    }

    container.innerHTML = '';
    audioRecordings.forEach(rec => {
        addSessionAudioToList(rec);
    });
}

// Add saved audio to list
function addSavedAudioToList(audio) {
    const container = document.getElementById('audio-list-container');
    if (!container) {
        console.log('Audio list container not found!');
        return;
    }

    console.log('Adding saved audio to list:', audio);

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    // Store audio data for playback
    listItem.dataset.audioType = 'saved';
    listItem.dataset.audioSource = audio.filePath;
    listItem.dataset.audioFileName = audio.fileName;

    const fileSize = (audio.fileSize / 1024 / 1024).toFixed(2) + ' MB';

    listItem.innerHTML = `
        <img src="/images/audio icon.png" alt="Audio" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${audio.fileName}</div>
            <small class="text-muted">Saved Audio • ${fileSize}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play audio
    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        console.log('Playing saved audio:', audio.fileName);
        playAudio('saved', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(listItem);
    console.log('Saved audio item added to container');
}

// Add session audio (recorded) to list
function addSessionAudioToList(rec) {
    const container = document.getElementById('audio-list-container');
    if (!container) {
        console.log('Audio list container not found!');
        return;
    }

    console.log('Adding session audio to list:', rec);

    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center';
    item.style.cursor = 'pointer';

    // Store audio data for playback
    item.dataset.audioType = 'recorded';
    item.dataset.audioSource = rec.url;
    item.dataset.audioFileName = `Recording ${rec.duration}`;

    item.innerHTML = `
        <img src="/images/audio icon.png" alt="Audio" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">Recording ${rec.duration}</div>
            <small class="text-muted">Session Recording</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play audio
    item.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        console.log('Playing session audio:', rec.duration);
        playAudio('recorded', this.dataset.audioSource, this.dataset.audioFileName);
    });

    container.appendChild(item);
    console.log('Session audio item added to container');
}

// Play audio function
window.playAudio = window.playAudio || function (type, source, fileName) {
    console.log('=== PLAY AUDIO START ===');
    console.log('Playing audio:', { type, source, fileName });

    const audioContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');
    const audioTitle = document.getElementById('audio-title');
    const audioList = document.getElementById('audio-list-container');
    const saveBtn = document.getElementById('save-audio-btn');

    console.log('Audio elements found:', {
        audioContainer: !!audioContainer,
        audioPlayer: !!audioPlayer,
        audioTitle: !!audioTitle,
        audioList: !!audioList,
        saveBtn: !!saveBtn
    });

    if (!audioContainer || !audioPlayer) {
        console.log('❌ Missing required audio elements');
        console.log('audioContainer:', audioContainer);
        console.log('audioPlayer:', audioPlayer);
        return;
    }

    console.log('✅ All elements found');

    // Hide audio list and show player
    console.log('Before: audioList.style.display =', audioList ? audioList.style.display : 'not found');
    console.log('Before: audioContainer.style.display =', audioContainer.style.display);

    if (audioList) {
        audioList.style.display = 'none';
        console.log('After: audioList.style.display =', audioList.style.display);
    }

    audioContainer.style.display = 'block';
    console.log('After: audioContainer.style.display =', audioContainer.style.display);

    // Set audio title
    if (audioTitle) {
        audioTitle.textContent = fileName;
        console.log('Set audio title to:', fileName);
    }

    // Show save button only for recorded audios (not saved)
    if (saveBtn) {
        if (type === 'saved') {
            saveBtn.style.display = 'none';
            console.log('Hide save button (saved audio)');
        } else {
            saveBtn.style.display = 'inline-block';
            console.log('Show save button (recorded audio)');
        }
    }

    // Load audio based on type
    if (type === 'saved') {
        // For saved audios, use the file path
        console.log('Loading saved audio from:', source);
        audioPlayer.src = source;
    } else {
        // For recorded audios (current session)
        console.log('Loading recorded audio from:', source);
        audioPlayer.src = source;
    }

    console.log('Audio player src set to:', audioPlayer.src);

    // Load and play audio
    console.log('Loading and playing audio...');

    audioPlayer.addEventListener('loadeddata', function () {
        console.log('✅ Audio data loaded successfully');
    });

    audioPlayer.addEventListener('error', function (e) {
        console.log('❌ Audio player error:', e);
        console.log('Audio player error code:', audioPlayer.error);
    });

    audioPlayer.load();
    audioPlayer.play().then(() => {
        console.log('✅ Audio playing successfully');
    }).catch(e => {
        console.log('❌ Auto-play failed:', e);
    });

    console.log('=== PLAY AUDIO END ===');
};

// Close audio player function
window.closeAudioPlayer = window.closeAudioPlayer || function () {
    const audioContainer = document.getElementById('audio-player-container');
    const audioPlayer = document.getElementById('audio-player');
    const audioList = document.getElementById('audio-list-container');
    const audioTitle = document.getElementById('audio-title');
    const saveBtn = document.getElementById('save-audio-btn');

    if (!audioContainer || !audioPlayer) return;

    // Stop audio and clear source
    audioPlayer.pause();
    audioPlayer.src = '';

    // Hide audio player
    audioContainer.style.display = 'none';

    // Show audio list
    if (audioList) audioList.style.display = 'block';

    // Reset audio title
    if (audioTitle) audioTitle.textContent = 'Audio Notes';

    // Hide save button
    if (saveBtn) saveBtn.style.display = 'none';
};

function initAudioRecorder() {
    const btn = document.getElementById('audio-record-btn');
    const status = document.getElementById('audio-status');
    const timer = document.getElementById('audio-timer');

    console.log('Initializing audio recorder...');
    console.log('Record button found:', !!btn);
    console.log('Status element found:', !!status);
    console.log('Timer element found:', !!timer);

    if (!btn) {
        console.error('Record button not found!');
        return;
    }
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';

    btn.onclick = async () => {
        console.log('Record button clicked');
        console.log('Current mediaRecorder state:', mediaRecorder ? mediaRecorder.state : 'null');

        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log('Stopping recording...');
            // Stop recording
            mediaRecorder.stop();
            clearInterval(audioTimerInterval);
            btn.classList.remove('btn-danger', 'recording-pulse');
            btn.classList.add('btn-outline-danger');
            btn.innerHTML = '<i class="bi bi-mic-fill fs-2"></i>';
            if (status) status.textContent = 'Click to Record';
            if (timer) timer.textContent = '00:00';
        } else {
            console.log('Starting recording...');
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone access granted');
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (e) => {
                    console.log('Audio data available:', e.data.size, 'bytes');
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    console.log('Recording stopped, processing data...');
                    const blob = new Blob(audioChunks, { type: 'audio/webm' });
                    const url = URL.createObjectURL(blob);
                    const duration = timer.textContent; // Capture final time
                    console.log('Creating recording with duration:', duration);
                    audioRecordings.unshift({
                        id: Date.now(),
                        blob: blob,
                        url: url,
                        date: new Date(),
                        duration: duration
                    });
                    console.log('Recording added, total recordings:', audioRecordings.length);
                    renderAudioList();

                    // Stop all tracks to release mic
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorder.start();
                audioStartTime = Date.now();
                audioTimerInterval = setInterval(updateAudioTimer, 1000);

                btn.classList.remove('btn-outline-danger');
                btn.classList.add('btn-danger', 'recording-pulse'); // Add pulse animation class if needed
                btn.innerHTML = '<i class="bi bi-stop-fill fs-2"></i>';
                if (status) status.textContent = 'Recording...';

            } catch (err) {
                console.error('Mic error:', err);
                alert('Could not access microphone. Please allow permissions.');
            }
        }
    };
}

window.openAudioRight = window.openAudioRight || function () {
    console.log('=== OPEN AUDIO RIGHT START ===');
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');
    const audioContainer = document.getElementById('audio-display-container');

    console.log('Elements found:', {
        generateWrapper: !!generateWrapper,
        generateOptions: !!generateOptions,
        summaryContainer: !!summaryContainer,
        flashcardsContainer: !!flashcardsContainer,
        whiteboardContainer: !!whiteboardContainer,
        audioContainer: !!audioContainer
    });

    if (!audioContainer) {
        console.error('Audio container not found!');
        return;
    }

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (whiteboardContainer) whiteboardContainer.style.display = 'none';

    audioContainer.style.display = 'flex';
    console.log('Audio container display set to flex');

    // Scroll handling
    const rightPane = audioContainer.closest('.right-side');
    if (rightPane) rightPane.scrollTop = 0;

    console.log('Calling initAudioRecorder...');
    initAudioRecorder();
    console.log('Calling renderAudioList...');
    renderAudioList();
    console.log('=== OPEN AUDIO RIGHT END ===');
};

window.backFromAudioRight = window.backFromAudioRight || function () {
    // Close any playing audio first
    if (typeof closeAudioPlayer === 'function') {
        closeAudioPlayer();
    }

    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const audioContainer = document.getElementById('audio-display-container');

    if (audioContainer) audioContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(audioTimerInterval);
        const btn = document.getElementById('audio-record-btn');
        if (btn) {
            btn.innerHTML = '<i class="bi bi-mic-fill fs-2"></i>';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-outline-danger');
        }
    }
};

// ===== Class-based Chat (Messages panel) =====
document.addEventListener('DOMContentLoaded', function () {
    const classSelect = document.getElementById('chat-class-select');
    const chatList = document.getElementById('class-chat-list');
    const chatEmpty = document.getElementById('chat-empty');
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const chatErr = document.getElementById('chat-error');
    const chatRefreshBtn = document.getElementById('chat-refresh-btn');
    if (!classSelect || !chatList || !chatEmpty || !chatInput || !chatSendBtn) return;

    let lastMsgId = 0;
    let currentClassId = 0;

    async function loadMyClassesIntoSelect() {
        try {
            const res = await fetch('/Classes/My', { credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load classes');
            classSelect.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select class';
            classSelect.appendChild(placeholder);
            (data.classes || []).forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.name} (${c.code})`;
                classSelect.appendChild(opt);
            });
        } catch (e) {
            if (chatErr) { chatErr.style.display = ''; chatErr.textContent = e?.message || 'Failed to load classes'; }
        }
    }

    function renderMessages(msgs) {
        if (!Array.isArray(msgs) || msgs.length === 0) return;
        chatEmpty.style.display = 'none';
        chatList.style.display = '';
        msgs.forEach(m => {
            const li = document.createElement('li');
            li.className = 'list-group-item py-2';
            li.innerHTML = `<div class="d-flex justify-content-between">
                <div><strong>${escapeHtml(m.senderName || 'User')}:</strong> ${escapeHtml(m.content || '')}</div>
                <small class="text-muted">${new Date(m.sentAt).toLocaleTimeString()}</small>
            </div>`;
            chatList.appendChild(li);
            lastMsgId = Math.max(lastMsgId, m.id || 0);
        });
        // scroll to bottom
        const area = document.getElementById('chat-area');
        if (area) area.scrollTop = area.scrollHeight;
    }

    async function loadMessages(initial = false) {
        if (!currentClassId) return;
        try {
            const url = initial ? `/Classes/Chat?classId=${currentClassId}` : `/Classes/Chat?classId=${currentClassId}&afterId=${lastMsgId}`;
            const res = await fetch(url, { credentials: 'same-origin' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load chat');
            if (initial) {
                chatList.innerHTML = '';
                lastMsgId = 0;
            }
            renderMessages(data.messages || []);
            if (chatErr) { chatErr.style.display = 'none'; chatErr.textContent = ''; }
        } catch (e) {
            if (chatErr) { chatErr.style.display = ''; chatErr.textContent = e?.message || 'Failed to load chat'; }
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
            await loadMessages();
        } catch (e) {
            if (chatErr) { chatErr.style.display = ''; chatErr.textContent = e?.message || 'Failed to send'; }
        } finally {
            chatSendBtn.disabled = false;
        }
    }

    classSelect.addEventListener('change', async () => {
        currentClassId = parseInt(classSelect.value || '0', 10) || 0;
        chatList.innerHTML = '';
        lastMsgId = 0;

        const chatArea = document.getElementById('chat-area');
        if (!currentClassId) {
            chatEmpty.style.display = '';
            chatList.style.display = 'none';
            if (chatArea) chatArea.style.display = 'none'; // Hide chat area when no class selected
            return;
        }

        if (chatArea) chatArea.style.display = ''; // Show chat area when class is selected
        await loadMessages(true);
    });

    if (chatRefreshBtn) chatRefreshBtn.addEventListener('click', () => loadMessages(true));
    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });

    // Initialize classes list when messages panel can be used
    loadMyClassesIntoSelect();
});

// ===== Tools: Calculator =====
document.addEventListener('DOMContentLoaded', function () {
    const panel = document.getElementById('tools-calculator-panel');
    const display = document.getElementById('calc-display');
    const errEl = document.getElementById('calc-error');
    if (!panel || !display) return;

    let expr = '';

    function setError(msg) {
        if (!errEl) return;
        if (msg) { errEl.style.display = ''; errEl.textContent = msg; }
        else { errEl.style.display = 'none'; errEl.textContent = ''; }
    }

    function updateDisplay() { display.value = expr || '0'; }

    function appendInput(ch) {
        setError('');
        if (typeof ch !== 'string') return;
        // allow digits, operators, dot, parentheses
        if (!/^[0-9+\-*/().]$/.test(ch)) return;
        // avoid duplicate operators (except minus for negative numbers after '(' or start)
        const last = expr.slice(-1);
        const isOp = /[+\-*/]/.test(ch);
        const lastIsOp = /[+\-*/]/.test(last);
        if (isOp && (expr.length === 0 && ch !== '-' || (lastIsOp && !(ch === '-' && (last === '(' || lastIsOp))))) {
            // replace last operator with new (except allowing negative numbers)
            if (lastIsOp && ch !== '-') expr = expr.slice(0, -1) + ch; else return;
        } else {
            expr += ch;
        }
        updateDisplay();
    }

    function clearAll() { expr = ''; updateDisplay(); setError(''); }
    function backspace() { expr = expr.slice(0, -1); updateDisplay(); }

    function tokenize(s) {
        const tokens = [];
        let i = 0;
        while (i < s.length) {
            const c = s[i];
            if (c === ' ') { i++; continue; }
            if (/[0-9.]/.test(c)) {
                let num = c; i++;
                while (i < s.length && /[0-9.]/.test(s[i])) { num += s[i++]; }
                if (/^\d*\.\d*\.$/.test(num) || (num.split('.').length - 1) > 1) throw new Error('Invalid number');
                if (num === '.') throw new Error('Invalid number');
                tokens.push({ t: 'num', v: parseFloat(num) });
                continue;
            }
            if (/[+\-*/()]/.test(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
            throw new Error('Invalid character');
        }
        return tokens;
    }

    function toRPN(tokens) {
        const out = [], ops = [];
        const prec = { '+': 1, '-': 1, '*': 2, '/': 2 };
        for (let i = 0; i < tokens.length; i++) {
            const tk = tokens[i];
            if (tk.t === 'num') out.push(tk);
            else {
                const v = tk.v;
                if (v === '(') ops.push(tk);
                else if (v === ')') {
                    while (ops.length && ops[ops.length - 1].v !== '(') out.push(ops.pop());
                    if (!ops.length) throw new Error('Mismatched parentheses');
                    ops.pop();
                } else {
                    while (ops.length && ops[ops.length - 1].v in prec && prec[ops[ops.length - 1].v] >= prec[v]) {
                        out.push(ops.pop());
                    }
                    ops.push(tk);
                }
            }
        }
        while (ops.length) {
            const o = ops.pop();
            if (o.v === '(' || o.v === ')') throw new Error('Mismatched parentheses');
            out.push(o);
        }
        return out;
    }

    function evalRPN(rpn) {
        const st = [];
        for (const tk of rpn) {
            if (tk.t === 'num') st.push(tk.v);
            else {
                const b = st.pop(); const a = st.pop();
                if (a === undefined || b === undefined) throw new Error('Syntax error');
                switch (tk.v) {
                    case '+': st.push(a + b); break;
                    case '-': st.push(a - b); break;
                    case '*': st.push(a * b); break;
                    case '/': if (b === 0) throw new Error('Division by zero'); st.push(a / b); break;
                    default: throw new Error('Invalid operator');
                }
            }
        }
        if (st.length !== 1) throw new Error('Syntax error');
        return st[0];
    }

    function evaluate() {
        try {
            setError('');
            if (!expr) return;
            const tokens = tokenize(expr);
            const rpn = toRPN(tokens);
            const result = evalRPN(rpn);
            expr = (Number.isFinite(result) ? result : 0).toString();
            updateDisplay();
        } catch (e) {
            setError(e?.message || 'Invalid expression');
        }
    }

    panel.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const input = btn.getAttribute('data-calc-input');
        const action = btn.getAttribute('data-calc-action');
        if (input) appendInput(input);
        else if (action === 'clear') clearAll();
        else if (action === 'back') backspace();
        else if (action === 'equals') evaluate();
    });
});

// Initialize notifications
let notifications = [];

// Toggle notifications panel
function toggleNotificationsPanel(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    toggleInlinePanel('notifications-panel', event);
    renderNotifications();
}

// Update notification badge in the connections menu
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.querySelector('.user-dropdown.me-3.combined-icon .notification-badge');
    if (badge) {
        badge.textContent = unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : '';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    return unreadCount;
}

// Render notifications in the notifications panel
function renderNotifications() {
    const container = document.getElementById('notifications-list');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-bell-slash fs-1"></i>
                <p class="mt-2 mb-0">No notifications yet.</p>
            </div>
        `;
    } else {
        container.innerHTML = notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${!notification.read ? 'unread' : ''} p-3 border-bottom" 
                 data-id="${notification.id}" 
                 onclick="markAsRead('${notification.id}')">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="me-3">
                        <h6 class="mb-1">${escapeHtml(notification.title)}</h6>
                        <p class="mb-1 small text-muted">${escapeHtml(notification.message)}</p>
                        <small class="text-muted">${formatTimeAgo(notification.date)}</small>
                    </div>
                    ${!notification.read ? '<span class="badge bg-primary">New</span>' : ''}
                </div>
            </div>
        `).join('');

        // Add a view all link if there are more than 10 notifications
        if (notifications.length > 10) {
            container.innerHTML += `
                <div class="text-center mt-2">
                    <a href="#" class="small" onclick="event.preventDefault();return false;">
                        View all ${notifications.length} notifications
                    </a>
                </div>
            `;
        }
    }

    // Update the notification badge
    updateNotificationBadge();
}

// Mark notification as read
function markAsRead(id) {
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        updateNotificationBadge();
        renderNotifications();
    }
}

// Add a new notification
function addNotification(title, message, type = 'info') {
    const newNotification = {
        id: 'notif-' + Date.now(),
        title,
        message,
        type,
        read: false,
        date: new Date().toISOString()
    };

    notifications.unshift(newNotification);
    updateNotificationBadge();
    renderNotifications();

    // Show toast notification
    showNotificationToast(title, message, type);
}

// Format time as "X time ago"
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + ' year' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + ' month' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return interval + ' day' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return interval + ' hour' + (interval === 1 ? '' : 's') + ' ago';

    interval = Math.floor(seconds / 60);
    if (interval >= 1) return interval + ' minute' + (interval === 1 ? '' : 's') + ' ago';

    return 'just now';
}

// Initialize notifications state on page load
document.addEventListener('DOMContentLoaded', function () {
    notifications = safeStorage.get('notifications', []);
    updateNotificationBadge();
    renderNotifications();
    window.addEventListener('beforeunload', () => {
        safeStorage.set('notifications', notifications);
    });
});

window.openSummaryRight = window.openSummaryRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');

    if (!summaryContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';

    summaryContainer.style.display = 'flex';

    const rightPane = summaryContainer.closest('.right-side');
    if (rightPane) {
        rightPane.scrollTop = 0;
        summaryContainer.scrollTop = 0;
        requestAnimationFrame(() => {
            rightPane.scrollTop = 0;
            summaryContainer.scrollTop = 0;
        });
    }

    const summaryContent = document.getElementById('summary-content-display');
    if (summaryContent) {
        summaryContent.innerHTML = '';
    }

    if (typeof updateWordCount === 'function') {
        updateWordCount();
    }
};

window.backFromSummaryRight = window.backFromSummaryRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');

    if (summaryContainer) summaryContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    if (generateWrapper || generateOptions) {
        (generateWrapper || generateOptions).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

let whiteboardCanvas = null;
let whiteboardCtx = null;
let whiteboardColor = '#111827';
let whiteboardLineWidth = 2;

function initWhiteboardCanvas() {
    const canvas = document.getElementById('whiteboard-canvas');
    const wrapper = document.getElementById('whiteboard-canvas-wrapper');
    if (!canvas || !wrapper) return;

    const resizeCanvas = () => {
        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineWidth = whiteboardLineWidth || 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = whiteboardColor || '#111827';
        whiteboardCanvas = canvas;
        whiteboardCtx = ctx;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (canvas.dataset.bound === '1') return;
    canvas.dataset.bound = '1';

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDraw = (e) => {
        if (!whiteboardCtx) return;
        drawing = true;
        const pos = getPos(e);
        lastX = pos.x;
        lastY = pos.y;
    };

    const draw = (e) => {
        if (!drawing || !whiteboardCtx) return;
        e.preventDefault();
        const pos = getPos(e);
        whiteboardCtx.beginPath();
        whiteboardCtx.moveTo(lastX, lastY);
        whiteboardCtx.lineTo(pos.x, pos.y);
        whiteboardCtx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    };

    const endDraw = () => {
        drawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', endDraw);

    canvas.addEventListener('touchstart', (e) => { startDraw(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => { draw(e); }, { passive: false });
    canvas.addEventListener('touchend', endDraw);
}

function setWhiteboardMode(mode) {
    const canvasWrap = document.getElementById('whiteboard-canvas-wrapper');
    if (!canvasWrap) return;

    canvasWrap.style.display = 'flex';
    initWhiteboardCanvas();
}

// Eraser mode variables
let eraserMode = false;

function toggleEraser() {
    const eraserBtn = document.getElementById('eraser-toggle');

    if (!eraserBtn) return;

    eraserMode = !eraserMode;

    if (eraserMode) {
        // Enable eraser mode
        eraserBtn.classList.remove('btn-outline-secondary');
        eraserBtn.classList.add('btn-secondary');
        eraserBtn.innerHTML = '<i class="bi bi-eraser-fill me-1"></i>Erasing';

        // Change cursor to eraser
        const canvas = document.getElementById('whiteboard-canvas');
        if (canvas) {
            canvas.style.cursor = 'crosshair';
        }

        console.log('Eraser mode ENABLED');
    } else {
        // Disable eraser mode
        eraserBtn.classList.remove('btn-secondary');
        eraserBtn.classList.add('btn-outline-secondary');
        eraserBtn.innerHTML = '<i class="bi bi-eraser-fill me-1"></i>Eraser';

        // Restore cursor
        const canvas = document.getElementById('whiteboard-canvas');
        if (canvas) {
            canvas.style.cursor = 'default';
        }

        console.log('Eraser mode DISABLED');
    }
}

function handleClearAll() {
    console.log('Clear All button clicked'); // Debug log
    // Clear canvas
    if (whiteboardCanvas && whiteboardCtx) {
        whiteboardCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
        console.log('Canvas cleared');
    }
    // Clear textarea content
    const textarea = document.getElementById('notes-textarea');
    if (textarea) {
        textarea.value = '';
        console.log('Textarea cleared');
    }
}

function bindWhiteboardControls() {
    const eraserBtn = document.getElementById('eraser-toggle');
    const colorInput = document.getElementById('whiteboard-color');
    const widthInput = document.getElementById('whiteboard-line-width');
    const opacityInput = document.getElementById('drawing-opacity');
    const textOpacityInput = document.getElementById('text-opacity');
    const textSizeInput = document.getElementById('text-size');

    if (eraserBtn) {
        // Always bind the click event, remove any existing listener first
        eraserBtn.removeEventListener('click', toggleEraser);
        eraserBtn.addEventListener('click', toggleEraser);
        eraserBtn.dataset.bound = '1';
    }

    if (opacityInput && !opacityInput.dataset.bound) {
        opacityInput.dataset.bound = '1';
        opacityInput.value = (drawingOpacity * 100).toString(); // Set initial value
        opacityInput.addEventListener('input', () => {
            const opacity = opacityInput.value / 100; // Convert to 0-1 range
            drawingOpacity = opacity;

            // Apply opacity to canvas if drawing
            const canvas = document.getElementById('whiteboard-canvas');
            if (canvas && canvas.style.pointerEvents === 'auto') {
                canvas.style.opacity = opacity;
            }

            console.log('Drawing opacity set to:', opacity);
        });
    }

    if (textOpacityInput && !textOpacityInput.dataset.bound) {
        textOpacityInput.dataset.bound = '1';
        textOpacityInput.value = (textOpacity * 100).toString(); // Set initial value
        textOpacityInput.addEventListener('input', () => {
            const opacity = textOpacityInput.value / 100; // Convert to 0-1 range
            textOpacity = opacity;

            // Apply opacity to textarea
            const textarea = document.getElementById('notes-textarea');
            if (textarea && textarea.style.pointerEvents === 'auto') {
                textarea.style.opacity = opacity;
            }

            console.log('Text opacity set to:', opacity);
        });
    }

    if (textSizeInput && !textSizeInput.dataset.bound) {
        textSizeInput.dataset.bound = '1';
        textSizeInput.value = textSize.toString(); // Set initial value
        textSizeInput.addEventListener('input', () => {
            const size = parseInt(textSizeInput.value);
            textSize = size;

            // Apply size to textarea
            const textarea = document.getElementById('notes-textarea');
            if (textarea) {
                textarea.style.fontSize = size + 'px';
            }

            console.log('Text size set to:', size);
        });
    }

    if (colorInput && !colorInput.dataset.bound) {
        colorInput.dataset.bound = '1';
        colorInput.value = whiteboardColor || '#111827';
        colorInput.addEventListener('input', () => {
            const val = colorInput.value || '#111827';
            whiteboardColor = val;
            if (whiteboardCtx) {
                whiteboardCtx.strokeStyle = whiteboardColor;
            }
        });
    }

    if (widthInput && !widthInput.dataset.bound) {
        widthInput.dataset.bound = '1';
        widthInput.value = whiteboardLineWidth || 2;
        widthInput.addEventListener('input', () => {
            const val = parseInt(widthInput.value, 10);
            if (!Number.isNaN(val) && val > 0) {
                whiteboardLineWidth = val;
                if (whiteboardCtx) {
                    whiteboardCtx.lineWidth = whiteboardLineWidth;
                }
            }
        });
    }
}

window.openWhiteboardRight = window.openWhiteboardRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');

    if (!whiteboardContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';

    whiteboardContainer.style.display = 'flex';

    const rightPane = whiteboardContainer.closest('.right-side');
    const docBox = whiteboardContainer.closest('.doc-box');
    const leftContent = whiteboardContainer.closest('.left-content');
    if (rightPane) {
        rightPane.scrollTop = 0;
    }
    if (docBox) {
        docBox.scrollTop = 0;
    }
    if (leftContent) {
        leftContent.scrollTop = 0;
    }
    whiteboardContainer.scrollTop = 0;
    requestAnimationFrame(() => {
        if (rightPane) rightPane.scrollTop = 0;
        if (docBox) docBox.scrollTop = 0;
        if (leftContent) leftContent.scrollTop = 0;
        whiteboardContainer.scrollTop = 0;
    });

    // Make sure the whiteboard container is aligned to the top of the visible area
    try {
        whiteboardContainer.scrollIntoView({ behavior: 'auto', block: 'start' });
    } catch (_) { }

    // Always open in draw mode
    setWhiteboardMode('draw');
    bindWhiteboardControls();
};

window.backFromWhiteboardRight = window.backFromWhiteboardRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');

    if (whiteboardContainer) whiteboardContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    if (generateWrapper || generateOptions) {
        (generateWrapper || generateOptions).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

let flashcardsData = [];
let currentFlashcardIndex = 0;
let flashcardsLoadedOnce = false;

async function loadFlashcardsData() {
    if (flashcardsLoadedOnce && Array.isArray(flashcardsData) && flashcardsData.length >= 0) {
        updateFlashcardsCount();
        return;
    }
    try {
        const res = await fetch('/Flashcards/GetUserFlashcards', { credentials: 'same-origin' });
        const data = await res.json();
        if (Array.isArray(data)) {
            flashcardsData = data.map(x => ({
                question: x.question,
                answer: x.answer
            }));
        } else {
            flashcardsData = [];
        }
        flashcardsLoadedOnce = true;
    } catch (e) {
        flashcardsData = [];
    }
    updateFlashcardsCount();
}

function updateFlashcardsCount() {
    const countEl = document.getElementById('flashcards-count');
    if (!countEl) return;
    const count = Array.isArray(flashcardsData) ? flashcardsData.length : 0;
    countEl.innerHTML = `<i class="bi bi-collection me-1"></i>${count} cards`;
}

function initFlashcardsUI() {
    const card = document.getElementById('flashcard-card');
    const emptyState = document.getElementById('flashcards-empty-state');
    const indexEl = document.getElementById('flashcard-index');
    const totalEl = document.getElementById('flashcard-total');
    const questionEl = document.getElementById('flashcard-question');
    const answerEl = document.getElementById('flashcard-answer');
    const toggleBtn = document.getElementById('flashcard-toggle-btn');

    if (!card || !emptyState || !indexEl || !totalEl || !questionEl || !answerEl || !toggleBtn) return;

    if (!flashcardsData || flashcardsData.length === 0) {
        card.classList.add('d-none');
        emptyState.classList.remove('d-none');
        return;
    }

    card.classList.remove('d-none');
    emptyState.classList.add('d-none');
    totalEl.textContent = flashcardsData.length.toString();
    if (currentFlashcardIndex < 0 || currentFlashcardIndex >= flashcardsData.length) {
        currentFlashcardIndex = 0;
    }
    const item = flashcardsData[currentFlashcardIndex];
    indexEl.textContent = (currentFlashcardIndex + 1).toString();
    questionEl.textContent = item.question;
    answerEl.textContent = item.answer;
    answerEl.classList.add('d-none');
    toggleBtn.textContent = 'Show answer';
}

function bindFlashcardCreateForm() {
    const btn = document.getElementById('flashcard-add-btn');
    if (!btn) return;
    const questionEl = document.getElementById('flashcard-new-question');
    const answerEl = document.getElementById('flashcard-new-answer');
    const errorEl = document.getElementById('flashcard-create-error');

    if (!questionEl || !answerEl) return;

    // Prevent binding multiple times
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    const toggleBtn = document.getElementById('flashcards-add-toggle');
    const formContainer = document.getElementById('flashcard-create-container');
    if (toggleBtn && formContainer && !toggleBtn.dataset.bound) {
        toggleBtn.dataset.bound = '1';
        toggleBtn.addEventListener('click', () => {
            const isHidden = formContainer.style.display === 'none' || !formContainer.style.display;
            formContainer.style.display = isHidden ? 'block' : 'none';

            if (isHidden) {
                // When opening the add form, change button to "View"
                toggleBtn.innerHTML = '<i class="bi bi-eye me-1"></i>View';
            } else {
                // When hiding the add form, change button back to "Add"
                toggleBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i>Add';
            }
        });
    }

    btn.addEventListener('click', async () => {
        const question = (questionEl.value || '').trim();
        const answer = (answerEl.value || '').trim();
        if (!question || !answer) {
            if (errorEl) errorEl.textContent = 'Question and answer are required.';
            return;
        }

        if (errorEl) errorEl.textContent = '';
        btn.disabled = true;

        try {
            const res = await fetch('/Flashcards/CreateFromDashboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ question, answer })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok || !data || data.success !== true) {
                const msg = (data && data.error) ? data.error : 'Failed to create flashcard.';
                if (errorEl) errorEl.textContent = msg;
                return;
            }

            if (!Array.isArray(flashcardsData)) flashcardsData = [];
            flashcardsData.push({ question: data.question || question, answer: data.answer || answer });
            currentFlashcardIndex = flashcardsData.length - 1;
            updateFlashcardsCount();
            initFlashcardsUI();

            questionEl.value = '';
            answerEl.value = '';
        } catch (e) {
            if (errorEl) errorEl.textContent = e?.message || 'Error creating flashcard.';
        } finally {
            btn.disabled = false;
        }
    });
}

function toggleFlashcardAnswer() {
    const answerEl = document.getElementById('flashcard-answer');
    const toggleBtn = document.getElementById('flashcard-toggle-btn');
    if (!answerEl || !toggleBtn) return;
    const hidden = answerEl.classList.contains('d-none');
    if (hidden) {
        answerEl.classList.remove('d-none');
        toggleBtn.textContent = 'Hide answer';
    } else {
        answerEl.classList.add('d-none');
        toggleBtn.textContent = 'Show answer';
    }
}

function nextFlashcard() {
    if (!flashcardsData || flashcardsData.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex + 1) % flashcardsData.length;
    initFlashcardsUI();
}

function prevFlashcard() {
    if (!flashcardsData || flashcardsData.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex - 1 + flashcardsData.length) % flashcardsData.length;
    initFlashcardsUI();
}

// Quizzes functionality
let quizzesData = [];
let currentQuizIndex = 0;
let selectedQuizAnswer = null;
let quizAnswered = false;

// Quizzes right-pane helpers
window.openQuizzesRight = window.openQuizzesRight || async function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const quizzesContainer = document.getElementById('quizzes-display-container');
    const notesContainer = document.getElementById('notes-display-container');

    if (!quizzesContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (notesContainer) notesContainer.style.display = 'none';

    quizzesContainer.style.display = 'block';

    const rightPane = quizzesContainer.closest('.right-side');
    if (rightPane) {
        rightPane.scrollTop = 0;
        quizzesContainer.scrollTop = 0;
        requestAnimationFrame(() => {
            rightPane.scrollTop = 0;
            quizzesContainer.scrollTop = 0;
        });
    }

    // Initialize quizzes UI
    initQuizzesUI();
};

window.backFromQuizzesRight = window.backFromQuizzesRight || function () {
    const quizzesContainer = document.getElementById('quizzes-display-container');
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');

    if (quizzesContainer) quizzesContainer.style.display = 'none';

    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    if (generateWrapper || generateOptions) {
        (generateWrapper || generateOptions).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

function initQuizzesUI() {
    // Load saved quizzes from localStorage
    const savedQuizzes = localStorage.getItem('quizzesData');
    if (savedQuizzes) {
        quizzesData = JSON.parse(savedQuizzes);
    }

    // Bind Add button
    const addBtn = document.getElementById('quizzes-add-toggle');
    if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = '1';
        addBtn.addEventListener('click', toggleQuizCreationForm);
    }

    // Display current quiz or empty state
    if (quizzesData.length === 0) {
        showQuizzesEmptyState();
    } else {
        displayCurrentQuiz();
    }
}

function toggleQuizCreationForm() {
    const form = document.getElementById('quiz-creation-form');
    const display = document.getElementById('quiz-display');

    if (form.classList.contains('d-none')) {
        // Show form
        form.classList.remove('d-none');
        display.classList.add('d-none');
        clearQuizForm();
    } else {
        // Hide form
        form.classList.add('d-none');
        display.classList.remove('d-none');
    }
}

function clearQuizForm() {
    document.getElementById('quiz-question').value = '';
    document.getElementById('quiz-option-a').value = '';
    document.getElementById('quiz-option-b').value = '';
    document.getElementById('quiz-option-c').value = '';
    document.getElementById('quiz-option-d').value = '';
    document.getElementById('quiz-correct-answer').value = '';
}

function saveQuizQuestion() {
    const question = document.getElementById('quiz-question').value.trim();
    const optionA = document.getElementById('quiz-option-a').value.trim();
    const optionB = document.getElementById('quiz-option-b').value.trim();
    const optionC = document.getElementById('quiz-option-c').value.trim();
    const optionD = document.getElementById('quiz-option-d').value.trim();
    const correctAnswer = document.getElementById('quiz-correct-answer').value;

    // Validation
    if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        alert('Please fill in all fields and select the correct answer.');
        return;
    }

    // Create quiz object
    const newQuiz = {
        id: Date.now(),
        question: question,
        options: {
            A: optionA,
            B: optionB,
            C: optionC,
            D: optionD
        },
        correctAnswer: correctAnswer
    };

    // Add to quizzes data
    quizzesData.push(newQuiz);

    // Save to localStorage
    localStorage.setItem('quizzesData', JSON.stringify(quizzesData));

    // Hide form and display quiz
    toggleQuizCreationForm();

    // Display the new quiz (it will be the last one)
    currentQuizIndex = quizzesData.length - 1;
    displayCurrentQuiz();

    console.log('Quiz question saved:', newQuiz);
}

function cancelQuizCreation() {
    toggleQuizCreationForm();
}

function displayCurrentQuiz() {
    if (quizzesData.length === 0) {
        showQuizzesEmptyState();
        return;
    }

    const quiz = quizzesData[currentQuizIndex];

    // Update question number
    document.getElementById('quiz-current-number').textContent = currentQuizIndex + 1;
    document.getElementById('quiz-total-count').textContent = quizzesData.length;

    // Update question text
    document.getElementById('quiz-display-question').textContent = quiz.question;

    // Update options
    document.getElementById('quiz-option-a-text').textContent = quiz.options.A;
    document.getElementById('quiz-option-b-text').textContent = quiz.options.B;
    document.getElementById('quiz-option-c-text').textContent = quiz.options.C;
    document.getElementById('quiz-option-d-text').textContent = quiz.options.D;

    // Reset answer selection
    selectedQuizAnswer = null;
    quizAnswered = false;

    // Reset UI
    resetQuizOptionsUI();
    hideQuizResult();

    // Hide empty state
    document.getElementById('quizzes-empty-state').classList.add('d-none');
    document.getElementById('quiz-display').classList.remove('d-none');
}

function resetQuizOptionsUI() {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(option => {
        option.classList.remove('active', 'correct', 'incorrect');
        option.disabled = false;
    });
}

function selectQuizAnswer(option) {
    if (quizAnswered) return; // Prevent selection after answering

    selectedQuizAnswer = option;

    // Update UI
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.option === option) {
            opt.classList.add('active');
        }
    });
}

function submitQuizAnswer() {
    if (!selectedQuizAnswer || quizAnswered) return;

    const quiz = quizzesData[currentQuizIndex];
    const isCorrect = selectedQuizAnswer === quiz.correctAnswer;

    quizAnswered = true;

    // Show result
    showQuizResult(isCorrect, quiz.correctAnswer);

    // Update options UI
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.disabled = true;
        if (opt.dataset.option === quiz.correctAnswer) {
            opt.classList.add('correct');
        } else if (opt.dataset.option === selectedQuizAnswer && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });

    console.log('Quiz answer submitted:', { selected: selectedQuizAnswer, correct: quiz.correctAnswer, isCorrect });
}

function showQuizResult(isCorrect, correctAnswer) {
    const resultDiv = document.getElementById('quiz-result');
    const resultAlert = document.getElementById('quiz-result-alert');
    const resultText = document.getElementById('quiz-result-text');

    resultDiv.classList.remove('d-none');

    if (isCorrect) {
        resultAlert.className = 'alert alert-success';
        resultText.textContent = '✓ Correct! Well done!';
    } else {
        resultAlert.className = 'alert alert-danger';
        resultText.textContent = `✗ Incorrect. The correct answer is ${correctAnswer}.`;
    }
}

function hideQuizResult() {
    document.getElementById('quiz-result').classList.add('d-none');
}

function previousQuiz() {
    if (quizzesData.length === 0) return;

    currentQuizIndex = (currentQuizIndex - 1 + quizzesData.length) % quizzesData.length;
    displayCurrentQuiz();
}

function nextQuiz() {
    if (quizzesData.length === 0) return;

    currentQuizIndex = (currentQuizIndex + 1) % quizzesData.length;
    displayCurrentQuiz();
}

function showQuizzesEmptyState() {
    document.getElementById('quizzes-empty-state').classList.remove('d-none');
    document.getElementById('quiz-display').classList.add('d-none');
}

// Flashcards right-pane helpers
window.openFlashcardsRight = window.openFlashcardsRight || async function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');

    if (!flashcardsContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';

    flashcardsContainer.style.display = 'flex';

    await loadFlashcardsData();
    initFlashcardsUI();
    bindFlashcardCreateForm();

    const rightPane = flashcardsContainer.closest('.right-side');
    if (rightPane) {
        rightPane.scrollTop = 0;
        flashcardsContainer.scrollTop = 0;
        requestAnimationFrame(() => {
            rightPane.scrollTop = 0;
            flashcardsContainer.scrollTop = 0;
        });
    }
};

window.backFromFlashcardsRight = window.backFromFlashcardsRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const flashcardsContainer = document.getElementById('flashcards-display-container');

    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    if (generateWrapper || generateOptions) {
        (generateWrapper || generateOptions).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

window.openNotesRight = window.openNotesRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const notesContainer = document.getElementById('notes-display-container');

    if (!notesContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';

    notesContainer.style.display = 'block';

    const rightPane = notesContainer.closest('.right-side');
    if (rightPane) {
        rightPane.scrollTop = 0;
        notesContainer.scrollTop = 0;
        requestAnimationFrame(() => {
            rightPane.scrollTop = 0;
            notesContainer.scrollTop = 0;
        });
    }

    // Initialize canvas and bind controls for notes
    initWhiteboardCanvas();
    bindWhiteboardControls();

    // Add direct onclick handler as backup
    const clearBtn = document.getElementById('whiteboard-clear-canvas');
    if (clearBtn) {
        clearBtn.onclick = function () {
            console.log('Direct onclick: Clear All button clicked');
            // Clear canvas
            if (whiteboardCanvas && whiteboardCtx) {
                whiteboardCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
                console.log('Direct onclick: Canvas cleared');
            }
            // Clear textarea content
            const textarea = document.getElementById('notes-textarea');
            if (textarea) {
                textarea.value = '';
                console.log('Direct onclick: Textarea cleared');
            }
        };
    }
};

window.backFromNotesRight = window.backFromNotesRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const notesContainer = document.getElementById('notes-display-container');

    if (notesContainer) notesContainer.style.display = 'none';

    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';

    if (generateWrapper || generateOptions) {
        (generateWrapper || generateOptions).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

window.toggleNotesMode = window.toggleNotesMode || function () {
    const textarea = document.getElementById('notes-textarea');
    const canvas = document.getElementById('whiteboard-canvas');
    const toggleBtn = document.getElementById('toggle-notes-mode');

    if (!textarea || !canvas || !toggleBtn) return;

    // Check current mode by checking which element is active
    const isWritingMode = textarea.style.pointerEvents === 'auto';

    if (isWritingMode) {
        // Switch to drawing mode - disable textarea, enable canvas
        textarea.style.pointerEvents = 'none';
        textarea.style.opacity = '0.3'; // Make it semi-transparent
        canvas.style.pointerEvents = 'auto';
        canvas.style.opacity = drawingOpacity.toString(); // Use current drawing opacity
        toggleBtn.innerHTML = '<i class="bi bi-type me-1"></i>Write';

        // Initialize canvas for drawing if not already done
        if (!canvas.dataset.initialized) {
            initNotesCanvas();
            canvas.dataset.initialized = 'true';
        }
    } else {
        // Switch to writing mode - enable textarea, disable canvas
        textarea.style.pointerEvents = 'auto';
        textarea.style.opacity = textOpacity.toString(); // Use current text opacity
        textarea.style.fontSize = textSize + 'px'; // Use current text size
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0.3'; // Make it semi-transparent
        toggleBtn.innerHTML = '<i class="bi bi-pencil me-1"></i>Draw';
    }
};

// Toggle text opacity slider
window.toggleTextOpacityControl = window.toggleTextOpacityControl || function () {
    const slider = document.getElementById('text-opacity');
    if (slider) {
        const isVisible = slider.style.display !== 'none';
        slider.style.display = isVisible ? 'none' : 'block';

        // Hide other slider when showing this one
        if (!isVisible) {
            const sizeSlider = document.getElementById('text-size');
            if (sizeSlider) sizeSlider.style.display = 'none';
        }
    }
};

// Toggle text size slider
window.toggleTextSizeControl = window.toggleTextSizeControl || function () {
    const slider = document.getElementById('text-size');
    if (slider) {
        const isVisible = slider.style.display !== 'none';
        slider.style.display = isVisible ? 'none' : 'block';

        // Hide other slider when showing this one
        if (!isVisible) {
            const opacitySlider = document.getElementById('text-opacity');
            if (opacitySlider) opacitySlider.style.display = 'none';
        }
    }
};

// Notes drawing functionality
let notesCanvas = null;
let notesCtx = null;
let isDrawing = false;
let drawingOpacity = 1.0; // Default opacity
let textOpacity = 1.0; // Default text opacity
let textSize = 16; // Default text size in pixels

function initNotesCanvas() {
    const canvas = document.getElementById('whiteboard-canvas');
    if (!canvas) return;

    // Save current canvas content if it exists
    let imageData = null;
    if (notesCtx && canvas.width && canvas.height) {
        imageData = notesCtx.getImageData(0, 0, canvas.width, canvas.height);
    }

    notesCanvas = canvas;
    notesCtx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Restore canvas content if it existed
    if (imageData) {
        notesCtx.putImageData(imageData, 0, 0);
    }

    // Only add event listeners once
    if (!canvas.dataset.eventsBound) {
        canvas.dataset.eventsBound = 'true';

        // Drawing events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch events
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', stopDrawing);
    }

    // Setup opacity control
    const opacityInput = document.getElementById('whiteboard-opacity');
    if (opacityInput && !opacityInput.dataset.bound) {
        opacityInput.dataset.bound = 'true';
        opacityInput.value = drawingOpacity;
        opacityInput.addEventListener('input', () => {
            drawingOpacity = parseFloat(opacityInput.value) || 1.0;
        });
    }
}

function startDrawing(e) {
    isDrawing = true;
    const rect = notesCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    notesCtx.beginPath();
    notesCtx.moveTo(x, y);
}

function draw(e) {
    if (!isDrawing) return;

    const rect = notesCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (eraserMode) {
        // Eraser mode - clear the area where we're drawing
        const lineWidth = document.getElementById('whiteboard-line-width').value;
        const eraserSize = parseInt(lineWidth) * 3; // Make eraser bigger than brush

        notesCtx.globalCompositeOperation = 'destination-out';
        notesCtx.beginPath();
        notesCtx.arc(x, y, eraserSize, 0, Math.PI * 2);
        notesCtx.fill();
        notesCtx.globalCompositeOperation = 'source-over';

        console.log('Erasing at position:', x, y, 'with size:', eraserSize);
    } else {
        // Normal drawing mode
        const color = document.getElementById('whiteboard-color').value;
        const lineWidth = document.getElementById('whiteboard-line-width').value;
        const opacityInput = document.getElementById('drawing-opacity');
        const opacity = opacityInput ? (opacityInput.value / 100) : drawingOpacity;

        // Convert hex color to rgba with opacity
        const rgbaColor = hexToRgba(color, opacity);

        notesCtx.strokeStyle = rgbaColor;
        notesCtx.lineWidth = lineWidth;
        notesCtx.lineCap = 'round';
        notesCtx.lineJoin = 'round';
        notesCtx.globalAlpha = opacity;

        notesCtx.lineTo(x, y);
        notesCtx.stroke();
    }
}

function stopDrawing() {
    isDrawing = false;
}

/**
 * Convert hex color to rgba
 */
function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Update drawing opacity
 */
window.updateDrawingOpacity = window.updateDrawingOpacity || function (value) {
    drawingOpacity = parseFloat(value) || 1.0;
    const opacityInput = document.getElementById('whiteboard-opacity');
    if (opacityInput) opacityInput.value = drawingOpacity;
};

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    notesCanvas.dispatchEvent(mouseEvent);
}

// Handle audio file upload
window.handleAudioUpload = window.handleAudioUpload || function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's an audio file
    if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file.');
        return;
    }

    // Create audio element to get duration
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', function () {
        const duration = audio.duration;
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

        // Add to recordings list
        addUploadedAudioToList(fileName, duration, fileSize, file);

        // Reset file input
        event.target.value = '';
    });
};

function addUploadedAudioToList(fileName, duration, fileSize, file) {
    const audioList = document.getElementById('audio-list-container');
    if (!audioList) return;

    // Remove "No recordings" message if exists
    const noRecordings = audioList.querySelector('.text-center.py-4');
    if (noRecordings) {
        noRecordings.remove();
    }

    // Create list item
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';

    // Store audio data for playback (similar to addSessionAudioToList)
    const objectUrl = URL.createObjectURL(file);
    listItem.dataset.audioType = 'recorded';
    listItem.dataset.audioSource = objectUrl;
    listItem.dataset.audioFileName = fileName;

    listItem.innerHTML = `
        <img src="/images/audio icon.png" alt="Audio" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${fileName}</div>
            <small class="text-muted">${formatAudioDuration(duration)} • ${fileSize}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Clicking the item should open the audio player and play the uploaded audio
    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        if (typeof playAudio === 'function') {
            playAudio('recorded', this.dataset.audioSource, this.dataset.audioFileName);
        }
    });

    audioList.appendChild(listItem);
}

function formatAudioDuration(seconds) {
    return formatTime(seconds);
}

function formatVideoDuration(seconds) {
    return formatTime(seconds);
}

// Handle video file upload
window.handleVideoUpload = window.handleVideoUpload || function (event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
        alert('Please select a video file.');
        return;
    }

    // Create video element to get duration
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);

    video.addEventListener('loadedmetadata', function () {
        const duration = video.duration;
        const fileName = file.name;
        const fileSize = (file.size / 1024 / 1024).toFixed(2) + ' MB';

        // Add to videos list
        addUploadedVideoToList(fileName, duration, fileSize, 'upload', file);

        // Reset file input
        event.target.value = '';
    });
};

// Show YouTube input
window.showYouTubeInput = window.showYouTubeInput || function () {
    const container = document.getElementById('youtube-input-container');
    if (container) {
        container.style.display = 'block';
        document.getElementById('youtube-url-input').focus();
    }
};

// Hide YouTube input
window.hideYouTubeInput = window.hideYouTubeInput || function () {
    const container = document.getElementById('youtube-input-container');
    const input = document.getElementById('youtube-url-input');
    if (container) {
        container.style.display = 'none';
        if (input) input.value = '';
    }
};

// Add YouTube video
window.addYouTubeVideo = window.addYouTubeVideo || function () {
    const input = document.getElementById('youtube-url-input');
    const url = input.value.trim();

    if (!url) {
        alert('Please enter a YouTube URL.');
        return;
    }

    // Simple YouTube URL validation
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        alert('Please enter a valid YouTube URL.');
        return;
    }

    // Extract video ID and title (simplified)
    let videoId = '';
    let title = 'YouTube Video';

    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }

    if (videoId) {
        title = `YouTube Video (${videoId})`;
    }

    // Add to videos list
    addUploadedVideoToList(title, 'Unknown', 'Stream', 'youtube', url);

    // Hide input and clear
    hideYouTubeInput();
};

function addUploadedVideoToList(fileName, duration, fileSize, type, source) {
    const videoList = document.getElementById('video-list-container');
    if (!videoList) return;

    // Remove "No videos" message if exists
    const noVideos = videoList.querySelector('.text-center.py-4');
    if (noVideos) {
        noVideos.remove();
    }

    // Create list item
    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    const icon = type === 'youtube' ? 'youtube' : 'play-circle-fill';
    const iconColor = type === 'youtube' ? 'text-danger' : 'text-primary';

    // Store video data for playback
    listItem.dataset.videoType = type;
    listItem.dataset.videoSource = type === 'youtube' ? source : URL.createObjectURL(source);
    listItem.dataset.videoFileName = fileName;

    listItem.innerHTML = `
        <img src="/images/${type === 'youtube' ? 'youtube' : 'file'}.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${fileName}</div>
            <small class="text-muted">${type === 'youtube' ? 'YouTube Stream' : `${formatVideoDuration(duration)} • ${fileSize}`}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play video
    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return; // Don't play if delete button clicked
        playVideo(this.dataset.videoType, this.dataset.videoSource, this.dataset.videoFileName);
    });

    videoList.appendChild(listItem);
}

// Play video function
// Play video function
window.playVideo = window.playVideo || function (type, source, fileName) {
    const playerContainer = document.getElementById('video-player-container');
    const videoPlayer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');
    const videoTitle = document.getElementById('video-title');
    const uploadArea = document.getElementById('video-upload-area');
    const youtubeInput = document.getElementById('youtube-input-container');
    const saveBtn = document.getElementById('save-video-btn');

    if (!playerContainer || !videoPlayer) return;

    // Hide upload area and YouTube input
    if (uploadArea) uploadArea.style.display = 'none';
    if (youtubeInput) youtubeInput.style.display = 'none';

    // Show video player container
    playerContainer.style.display = 'block';

    // Set video title
    if (videoTitle) videoTitle.textContent = fileName;

    // Show save button only for uploaded videos (not YouTube)
    if (saveBtn) {
        if (type === 'youtube') {
            saveBtn.style.display = 'none';
        } else {
            saveBtn.style.display = 'inline-block';
        }
    }

    // Reset players
    videoPlayer.pause();
    videoPlayer.src = '';
    videoPlayer.style.display = 'none';

    if (youtubePlayer) {
        youtubePlayer.src = '';
        youtubePlayer.style.display = 'none';
    }

    // Load video based on type
    if (type === 'youtube') {
        // For YouTube, we need to extract video ID and create embed URL
        let videoId = '';
        if (source.includes('youtube.com/watch?v=')) {
            videoId = source.split('v=')[1]?.split('&')[0];
        } else if (source.includes('youtu.be/')) {
            videoId = source.split('youtu.be/')[1]?.split('?')[0];
        } else if (source.includes('embed/')) {
            videoId = source.split('embed/')[1]?.split('?')[0];
        }

        if (videoId && youtubePlayer) {
            youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
            youtubePlayer.style.display = 'block';
        } else {
            alert('Invalid YouTube URL');
            closeVideoPlayer();
            return;
        }
    } else {
        // For saved or uploaded videos
        videoPlayer.style.display = 'block';
        videoPlayer.src = source;
        videoPlayer.load();
        videoPlayer.play().catch(e => {
            console.log('Auto-play failed:', e);
        });
    }
};

// Close video player function
// Close video player function
window.closeVideoPlayer = window.closeVideoPlayer || function () {
    const playerContainer = document.getElementById('video-player-container');
    const videoPlayer = document.getElementById('video-player');
    const youtubePlayer = document.getElementById('youtube-player');
    const uploadArea = document.getElementById('video-upload-area');
    const videoTitle = document.getElementById('video-title');
    const saveBtn = document.getElementById('save-video-btn');

    if (!playerContainer || !videoPlayer) return;

    // Stop video and clear source
    videoPlayer.pause();
    videoPlayer.src = '';

    if (youtubePlayer) {
        youtubePlayer.src = '';
    }

    // Hide video player
    playerContainer.style.display = 'none';

    // Show upload area
    if (uploadArea) uploadArea.style.display = 'block';

    // Reset video title
    if (videoTitle) videoTitle.textContent = 'Video Notes';

    // Hide save button
    if (saveBtn) saveBtn.style.display = 'none';
};

// Save current video function
window.saveCurrentVideo = window.saveCurrentVideo || async function () {
    const videoPlayer = document.getElementById('video-player');
    const videoTitle = document.getElementById('video-title');

    if (!videoPlayer || !videoPlayer.src) {
        alert('No video to save');
        return;
    }

    try {
        // Get video file name from title or generate default
        let fileName = videoTitle ? videoTitle.textContent.replace('Video Notes', '').trim() : '';
        if (!fileName) {
            fileName = 'video';
        }

        // For YouTube videos, we can't save the video directly
        if (videoPlayer.src.includes('youtube.com')) {
            alert('YouTube videos cannot be saved. Please download them directly from YouTube.');
            return;
        }

        // For uploaded videos, we need to fetch the video data
        const response = await fetch(videoPlayer.src);
        const blob = await response.blob();

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async function () {
            const base64data = reader.result;

            try {
                const res = await fetch('/Dashboard/SaveVideo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        fileName: fileName,
                        videoData: base64data,
                        contentType: blob.type
                    })
                });

                const data = await res.json().catch(() => null);
                if (!res.ok || !data || data.success !== true) {
                    const msg = (data && data.error) ? data.error : `Save failed (HTTP ${res.status})`;
                    alert(msg);
                    return;
                }

                // Show success message
                const saveBtn = document.getElementById('save-video-btn');
                if (saveBtn) {
                    const originalText = saveBtn.innerHTML;
                    saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Saved!';
                    saveBtn.classList.remove('btn-success');
                    saveBtn.classList.add('btn-outline-success');
                    saveBtn.disabled = true;

                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.classList.remove('btn-outline-success');
                        saveBtn.classList.add('btn-success');
                        saveBtn.disabled = false;
                    }, 2000);
                }

                // Add to recent files if function exists
                try {
                    if (typeof addRecentFile === 'function') {
                        addRecentFile(data.fileId, data.fileName || fileName);
                    }
                } catch (_) { }

            } catch (saveError) {
                alert('Failed to save video: ' + saveError.message);
            }
        };

        reader.readAsDataURL(blob);

    } catch (error) {
        alert('Failed to process video: ' + error.message);
    }
};

// Save current audio function
window.saveCurrentAudio = window.saveCurrentAudio || async function () {
    const audioPlayer = document.getElementById('audio-player');
    const audioTitle = document.getElementById('audio-title');

    if (!audioPlayer || !audioPlayer.src) {
        alert('No audio to save');
        return;
    }

    try {
        // Get audio file name from title or generate default
        let fileName = audioTitle ? audioTitle.textContent.replace('Audio Notes', '').trim() : '';
        if (!fileName) {
            fileName = 'audio';
        }

        // For recorded audio, we need to fetch the audio data
        const response = await fetch(audioPlayer.src);
        const blob = await response.blob();

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async function () {
            const base64data = reader.result;

            try {
                const res = await fetch('/Dashboard/SaveAudio', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({
                        fileName: fileName,
                        audioData: base64data,
                        contentType: blob.type
                    })
                });

                const data = await res.json().catch(() => null);
                if (!res.ok || !data || data.success !== true) {
                    const msg = (data && data.error) ? data.error : `Save failed (HTTP ${res.status})`;
                    alert(msg);
                    return;
                }

                // Show success message
                const saveBtn = document.getElementById('save-audio-btn');
                if (saveBtn) {
                    const originalText = saveBtn.innerHTML;
                    saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Saved!';
                    saveBtn.classList.remove('btn-success');
                    saveBtn.classList.add('btn-outline-success');
                    saveBtn.disabled = true;

                    setTimeout(() => {
                        saveBtn.innerHTML = originalText;
                        saveBtn.classList.remove('btn-outline-success');
                        saveBtn.classList.add('btn-success');
                        saveBtn.disabled = false;
                    }, 2000);
                }

                // Add to recent files if function exists
                try {
                    if (typeof addRecentFile === 'function') {
                        addRecentFile(data.fileId, data.fileName || fileName);
                    }
                } catch (_) { }

            } catch (saveError) {
                alert('Failed to save audio: ' + saveError.message);
            }
        };

        reader.readAsDataURL(blob);

    } catch (error) {
        alert('Failed to process audio: ' + error.message);
    }
};

/**
 * Helper function to hide all right panel containers
 */
function hideAllRightContainers() {
    const containers = [
        'summary-display-container',
        'flashcards-display-container',
        'whiteboard-display-container',
        'audio-display-container',
        'notes-display-container',
        'video-display-container'
    ];

    containers.forEach(id => {
        const container = document.getElementById(id);
        if (container) container.style.display = 'none';
    });

    // Also hide generate options
    const generateOptions = document.getElementById('generate-options');
    if (generateOptions) generateOptions.style.display = 'none';
}

// Video back function
window.backFromVideoRight = window.backFromVideoRight || function () {
    // Close any playing video first
    if (typeof closeVideoPlayer === 'function') {
        closeVideoPlayer();
    }

    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const videoContainer = document.getElementById('video-display-container');

    if (videoContainer) videoContainer.style.display = 'none';
    if (generateWrapper) generateWrapper.style.display = 'flex';
    if (generateOptions) generateOptions.style.display = '';
};

window.openVideoRight = window.openVideoRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');
    const audioContainer = document.getElementById('audio-display-container');
    const videoContainer = document.getElementById('video-display-container');

    if (!videoContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (summaryContainer) summaryContainer.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (whiteboardContainer) whiteboardContainer.style.display = 'none';
    if (audioContainer) audioContainer.style.display = 'none';

    videoContainer.style.display = 'flex';

    // Scroll handling
    const rightPane = videoContainer.closest('.right-side');
    if (rightPane) rightPane.scrollTop = 0;

    renderVideoList();
};

function renderVideoList() {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    // Load saved videos from server
    loadSavedVideos();
}

// Load saved videos from server
async function loadSavedVideos() {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    try {
        const res = await fetch('/Dashboard/GetVideoFiles', {
            method: 'GET',
            credentials: 'same-origin'
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || !data || data.success !== true) {
            // If server fails, show current session videos only
            renderSessionVideos();
            return;
        }

        const savedVideos = data.videos || [];

        if (savedVideos.length === 0 && videoRecordings.length === 0) {
            container.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <img src="/images/youtube.png" alt="No videos" style="width: 32px; height: 32px; opacity: 0.5;" class="d-block mb-2">
                    No videos yet
                </div>`;
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Render saved videos first
        savedVideos.forEach(video => {
            addSavedVideoToList(video);
        });

        // Render session videos (YouTube videos)
        videoRecordings.forEach(rec => {
            addSessionVideoToList(rec);
        });

    } catch (error) {
        console.error('Failed to load saved videos:', error);
        renderSessionVideos();
    }
}

// Render session videos only (fallback)
function renderSessionVideos() {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    if (videoRecordings.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted small">
                <img src="/images/youtube.png" alt="No videos" style="width: 32px; height: 32px; opacity: 0.5;" class="d-block mb-2">
                No videos yet
            </div>`;
        return;
    }

    container.innerHTML = '';
    videoRecordings.forEach(rec => {
        addSessionVideoToList(rec);
    });
}

// Add saved video to list
function addSavedVideoToList(video) {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    const listItem = document.createElement('div');
    listItem.className = 'list-group-item d-flex align-items-center';
    listItem.style.cursor = 'pointer';

    // Store video data for playback
    listItem.dataset.videoType = 'saved';
    listItem.dataset.videoSource = video.filePath;
    listItem.dataset.videoFileName = video.fileName;

    const fileSize = (video.fileSize / 1024 / 1024).toFixed(2) + ' MB';

    listItem.innerHTML = `
        <img src="/images/file.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${video.fileName}</div>
            <small class="text-muted">Saved Video • ${fileSize}</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play video
    listItem.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playVideo('saved', this.dataset.videoSource, this.dataset.videoFileName);
    });

    container.appendChild(listItem);
}

// Add session video (YouTube) to list
function addSessionVideoToList(rec) {
    const container = document.getElementById('video-list-container');
    if (!container) return;

    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center';
    item.style.cursor = 'pointer';

    // Store video data for playback
    item.dataset.videoType = 'youtube';
    item.dataset.videoSource = rec.url;
    item.dataset.videoFileName = rec.title;

    item.innerHTML = `
        <img src="/images/youtube.png" alt="Video" style="width: 24px; height: 24px; margin-right: 10px;">
        <div class="flex-grow-1">
            <div class="fw-medium">${rec.title}</div>
            <small class="text-muted">YouTube Stream</small>
        </div>
        <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); this.parentElement.remove()">
            <i class="bi bi-trash"></i>
        </button>
    `;

    // Add click handler to play video
    item.addEventListener('click', function (e) {
        if (e.target.closest('button')) return;
        playVideo('youtube', this.dataset.videoSource, this.dataset.videoFileName);
    });

    container.appendChild(item);
}

// Expose tab switcher globally for Class Details
window.__setClassDetailsActiveTab = function (tabId) {
    // Buttons
    document.querySelectorAll('.cls-tabs .nav-link').forEach(b => {
        if (b.getAttribute('data-tab') === tabId) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Panes
    ['info', 'options'].forEach(t => {
        const pane = document.getElementById(`cls-tab-${t}`);
        if (pane) {
            if (t === tabId) {
                pane.classList.remove('d-none');
                pane.classList.add('active');
            } else {
                pane.classList.add('d-none');
                pane.classList.remove('active');
            }
        }
    });
};
// ===== Translation Tool =====
document.addEventListener('DOMContentLoaded', () => {
    const translateBtn = document.getElementById('translation-translate-btn');
    const inputTextarea = document.getElementById('translation-input');
    const targetLangSelect = document.getElementById('translation-target-lang');
    const resultContainer = document.getElementById('translation-result-container');
    const resultDiv = document.getElementById('translation-result');
    const errorDiv = document.getElementById('translation-error');

    if (translateBtn) {
        translateBtn.addEventListener('click', async () => {
            const text = inputTextarea?.value?.trim();
            const targetLang = targetLangSelect?.value || 'en';

            if (errorDiv) {
                errorDiv.style.display = 'none';
                errorDiv.textContent = '';
            }
            if (resultContainer) resultContainer.style.display = 'none';

            if (!text) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please enter text to translate';
                    errorDiv.style.display = '';
                }
                return;
            }

            translateBtn.disabled = true;
            const originalText = translateBtn.innerHTML;
            translateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Translating...';

            try {
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Translation service unavailable');
                }

                const data = await response.json();
                let translatedText = '';
                if (data && data[0]) {
                    for (let i = 0; i < data[0].length; i++) {
                        if (data[0][i][0]) {
                            translatedText += data[0][i][0];
                        }
                    }
                }

                if (!translatedText) {
                    throw new Error('Translation failed');
                }

                if (resultDiv) resultDiv.textContent = translatedText;
                if (resultContainer) resultContainer.style.display = '';

            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message || 'Translation failed. Please try again.';
                    errorDiv.style.display = '';
                }
            } finally {
                translateBtn.disabled = false;
                translateBtn.innerHTML = originalText;
            }
        });
    }
});

// ===== Student Management Functions for Teachers =====

window.removeStudent = async function (classId, studentId, studentName) {
    if (!confirm(`Are you sure you want to remove ${studentName} from this class?`)) return;

    try {
        const response = await fetch('/Classes/RemoveMember', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ classId: classId, userId: studentId })
        });

        const data = await response.json();

        if (data.success) {
            // Reload list using existing mechanism if possible
            const btn = document.querySelector('[onclick="openClassesInlinePanel(event)"]');
            if (btn) btn.click();

            // Also close details to refresh state if needed, or just let the reload handle it
            // Ideally we should reload the class details directly.
            // But triggering the main classes panel open will reload the list, 
            // verifying the student is gone from the count.
            // To be safe, let's also close the class details panel
            const details = document.getElementById('class-details-panel');
            if (details) details.classList.remove('show');
            const classesPanel = document.getElementById('classes-panel');
            if (classesPanel) classesPanel.classList.add('show');

        } else {
            alert(data.error || 'Failed to remove student');
        }
    } catch (error) {
        console.error('Error removing student:', error);
        alert('An error occurred while removing the student');
    }
};

window.viewStudentProgress = function (studentId, studentName) {
    const panel = document.getElementById('tools-progress-panel');
    if (panel) {
        // Ensure panel is visible
        if (!panel.classList.contains('show')) {
            panel.classList.add('show');
            // Also ensure it's positioned correctly if falling back to default styling
            // But usually styling handles it.
        }

        const headerSpan = panel.querySelector('.dropdown-header span');
        if (headerSpan) headerSpan.innerHTML = `Progress: <strong>${studentName}</strong>`;

        // Pass studentId to loadProgressData
        if (typeof loadProgressData === 'function') loadProgressData(studentId);
    }
};
