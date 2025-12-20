document.addEventListener('DOMContentLoaded', () => {
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
                piano: {
                    name: 'Piano',
                    candidates: [
                        '/sounds/piano.mp3', '/sounds/piano.m4a', '/sounds/piano.wav',
                        '/audio/piano.mp3', '/audio/piano.m4a', '/audio/piano.wav'
                    ]
                }
            };

            let current = PRESETS.quran;
            const audio = window.__focusMusicAudio;
            const btnQuran = document.getElementById('music-preset-quran');
            const btnRain = document.getElementById('music-preset-rain');
            const btnEarth = document.getElementById('music-preset-earth');
            const btnPiano = document.getElementById('music-preset-piano');
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
                    toggleBtn.innerHTML = '<i class="bi bi-pause-fill fs-4"></i>';
                } else {
                    toggleBtn.classList.remove('btn-danger');
                    toggleBtn.classList.add('btn-success');
                    toggleBtn.innerHTML = '<i class="bi bi-play-fill fs-4"></i>';
                }
            }

            function setActivePreset(btn) {
                [btnQuran, btnRain, btnEarth, btnPiano].forEach(b => b && b.classList.remove('active'));
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
            if (btnPiano) btnPiano.addEventListener('click', () => loadPreset(PRESETS.piano, btnPiano, true));

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

            if (volumeInput) {
                volumeInput.addEventListener('input', (e) => {
                    audio.volume = parseFloat(e.target.value);
                    // Update volume display percentage
                    const volumeDisplay = document.getElementById('volume-display');
                    if (volumeDisplay) {
                        const percent = Math.round(e.target.value * 100);
                        volumeDisplay.textContent = `${percent}%`;
                    }
                });

                // Set initial volume display
                const volumeDisplay = document.getElementById('volume-display');
                if (volumeDisplay) {
                    const percent = Math.round(volumeInput.value * 100);
                    volumeDisplay.textContent = `${percent}%`;
                }
            }
        }

        // Ensure try block is balanced so the script parses correctly
    } catch (e) { }

});
