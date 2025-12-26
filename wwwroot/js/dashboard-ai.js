// AI Tools: Summary, Flashcards, Quizzes, Notes/Whiteboard, Translation
console.log('dashboard-ai.js loaded v2');

// ==========================================
// AI SUMMARY
// ==========================================
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
        if (!text) {
            Swal.fire({ icon: 'warning', title: 'No Text', text: 'No text content found to summarize.', confirmButtonColor: '#0d6efd' });
            return;
        }
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
        try { if (typeof updateWordCount === 'function') updateWordCount(); } catch (_) { }
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

window.openSummaryRight = window.openSummaryRight || function () {
    const generateWrapper = document.getElementById('generate-wrapper');
    const generateOptions = document.getElementById('generate-options');
    const summaryContainer = document.getElementById('summary-display-container');
    const flashcardsContainer = document.getElementById('flashcards-display-container');
    const whiteboardContainer = document.getElementById('whiteboard-display-container');
    const quizzesContainer = document.getElementById('quizzes-display-container');
    const notesContainer = document.getElementById('notes-display-container');

    if (!summaryContainer) return;

    if (generateWrapper) generateWrapper.style.display = 'none';
    if (generateOptions) generateOptions.style.display = 'none';
    if (flashcardsContainer) flashcardsContainer.style.display = 'none';
    if (whiteboardContainer) whiteboardContainer.style.display = 'none';
    if (quizzesContainer) quizzesContainer.style.display = 'none';
    if (notesContainer) notesContainer.style.display = 'none';

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


// ==========================================
// FLASHCARDS
// ==========================================
let flashcardsData = [];
let currentFlashcardIndex = 0;
let flashcardsLoadedOnce = false;
let generatedFlashcardsForCurrentFile = false;

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



window.toggleFlashcardAnswer = function () {
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
};

window.nextFlashcard = function () {
    if (!flashcardsData || flashcardsData.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex + 1) % flashcardsData.length;
    initFlashcardsUI();
};

window.prevFlashcard = function () {
    if (!flashcardsData || flashcardsData.length === 0) return;
    currentFlashcardIndex = (currentFlashcardIndex - 1 + flashcardsData.length) % flashcardsData.length;
    initFlashcardsUI();
};

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

    // Auto-generate if empty and not yet generated for this file
    const contentDisplay = document.getElementById('content-display');
    const text = contentDisplay ? (contentDisplay.textContent || '').trim() : '';
    if ((!flashcardsData || flashcardsData.length === 0) && !generatedFlashcardsForCurrentFile && text) {
        generatedFlashcardsForCurrentFile = true;
        generateFlashcardsRight();
    }

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

window.generateFlashcardsRight = async function () {
    const btn = document.getElementById('flashcards-generate-btn');
    const contentDisplay = document.getElementById('content-display');
    const text = contentDisplay ? (contentDisplay.textContent || '').trim() : '';

    if (!text) { alert('No text to generate flashcards from.'); return; }

    if (btn) btn.disabled = true;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating...';

    const card = document.getElementById('flashcard-card');
    const emptyState = document.getElementById('flashcards-empty-state');
    const questionEl = document.getElementById('flashcard-question');

    if (emptyState) emptyState.classList.add('d-none');
    if (card) {
        card.classList.remove('d-none');
        if (questionEl) questionEl.innerHTML = '<div class="text-center p-3"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Generating flashcards...</p></div>';
        document.getElementById('flashcard-answer').classList.add('d-none');
    }

    try {
        const res = await fetch('/Dashboard/GenerateFlashcards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ text })
        });
        const data = await res.json();

        if (data && data.success && data.flashcardsJson) {
            let cards = [];
            try {
                cards = JSON.parse(data.flashcardsJson);
            } catch (e) { console.error('JSON parse error', e); }

            if (Array.isArray(cards) && cards.length > 0) {
                if (!flashcardsData) flashcardsData = [];
                flashcardsData = flashcardsData.concat(cards);

                currentFlashcardIndex = flashcardsData.length - cards.length;
                if (currentFlashcardIndex < 0) currentFlashcardIndex = 0;

                initFlashcardsUI();
                updateFlashcardsCount();
            } else {
                alert('AI generated invalid format.');
                initFlashcardsUI();
            }
        } else {
            alert(data.error || 'Failed to generate.');
            initFlashcardsUI();
        }
    } catch (e) {
        alert('Error: ' + e.message);
        initFlashcardsUI();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};


// ==========================================
// QUIZZES
// ==========================================
let quizzesData = [];
let currentQuizIndex = 0;
let selectedQuizAnswer = null;
let quizAnswered = false;
let quizScore = 0; // Track score
let generatedQuizzesForCurrentFile = false;

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

    initQuizzesUI();

    // Auto-generate if empty and not yet generated for this file
    const contentDisplay = document.getElementById('content-display');
    const text = contentDisplay ? (contentDisplay.textContent || '').trim() : '';
    if ((!quizzesData || quizzesData.length === 0) && !generatedQuizzesForCurrentFile && text) {
        generatedQuizzesForCurrentFile = true;
        generateQuizzesRight();
    }
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

window.generateQuizzesRight = async function () {
    const btn = document.getElementById('quizzes-generate-btn');
    const contentDisplay = document.getElementById('content-display');
    const text = contentDisplay ? (contentDisplay.textContent || '').trim() : '';

    if (!text) { alert('No text to generate quiz from.'); return; }

    if (btn) btn.disabled = true;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Generating...';

    const quizDisplay = document.getElementById('quiz-display');
    const emptyState = document.getElementById('quizzes-empty-state');
    const questionEl = document.getElementById('quiz-display-question');
    const optionsEl = document.querySelector('.quiz-options');

    if (emptyState) emptyState.classList.add('d-none');
    if (quizDisplay) {
        quizDisplay.classList.remove('d-none');
        if (questionEl) questionEl.innerHTML = '<div class="text-center p-3"><span class="spinner-border text-primary"></span><p class="mt-2 text-muted">Generating quiz...</p></div>';
        document.getElementById('quiz-current-number').textContent = '-';
        document.getElementById('quiz-total-count').textContent = '-';
        if (optionsEl) optionsEl.classList.add('d-none');
    }

    try {
        const res = await fetch('/Dashboard/GenerateQuiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ text })
        });
        const data = await res.json();

        if (data && data.success && data.quizJson) {
            let newQuizzes = [];
            try {
                newQuizzes = JSON.parse(data.quizJson);
            } catch (e) { console.error(e); }

            if (Array.isArray(newQuizzes) && newQuizzes.length > 0) {
                newQuizzes = newQuizzes.map(q => ({ ...q, id: Date.now() + Math.random() }));

                quizzesData = quizzesData.concat(newQuizzes);
                localStorage.setItem('quizzesData', JSON.stringify(quizzesData));

                currentQuizIndex = quizzesData.length - newQuizzes.length;
                quizScore = 0; // Reset score for new batch if needed, or keep cumulative? Usually reset for new session.
                // But if adding to existing, maybe we just set index. 
                // Let's reset score for the "session" implies we might want a "start quiz" flow, but for now, 
                // let's just ensure we track correct answers from this point.

                if (currentQuizIndex < 0) currentQuizIndex = 0;

                if (optionsEl) optionsEl.classList.remove('d-none');
                displayCurrentQuiz();
            } else {
                alert('AI generated invalid format.');
                if (optionsEl) optionsEl.classList.remove('d-none');
                displayCurrentQuiz();
            }
        } else {
            alert(data.error || 'Failed to generate.');
            if (optionsEl) optionsEl.classList.remove('d-none');
            displayCurrentQuiz();
        }
    } catch (e) {
        alert('Error: ' + e.message);
        if (optionsEl) optionsEl.classList.remove('d-none');
        displayCurrentQuiz();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};

function initQuizzesUI() {
    const savedQuizzes = localStorage.getItem('quizzesData');
    if (savedQuizzes) {
        quizzesData = JSON.parse(savedQuizzes);
    }



    if (quizzesData.length === 0) {
        showQuizzesEmptyState();
    } else {
        displayCurrentQuiz();
    }
}



function displayCurrentQuiz() {
    if (quizzesData.length === 0) {
        showQuizzesEmptyState();
        return;
    }

    // Hide completion view if valid quiz
    document.getElementById('quiz-completion-view').classList.add('d-none');
    document.getElementById('quiz-display').classList.remove('d-none');

    const quiz = quizzesData[currentQuizIndex];

    document.getElementById('quiz-current-number').textContent = currentQuizIndex + 1;
    document.getElementById('quiz-total-count').textContent = quizzesData.length;
    document.getElementById('quiz-display-question').textContent = quiz.question;
    document.getElementById('quiz-option-a-text').textContent = quiz.options.A;
    document.getElementById('quiz-option-b-text').textContent = quiz.options.B;
    document.getElementById('quiz-option-c-text').textContent = quiz.options.C;
    document.getElementById('quiz-option-d-text').textContent = quiz.options.D;

    selectedQuizAnswer = null;
    quizAnswered = false;

    resetQuizOptionsUI();
    hideQuizResult();

    // Update button states
    const submitBtn = document.getElementById('quiz-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = (currentQuizIndex === quizzesData.length - 1) ? 'Submit & Finish' : 'Submit Answer';
    }

    document.getElementById('quizzes-empty-state').classList.add('d-none');
}

function resetQuizOptionsUI() {
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(option => {
        option.classList.remove('active', 'correct', 'incorrect');
        option.disabled = false;
        option.style.pointerEvents = 'auto';
    });
}

window.selectQuizAnswer = function (option) {
    if (quizAnswered) return;
    selectedQuizAnswer = option;
    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.option === option) {
            opt.classList.add('active');
        }
    });
};

window.submitQuizAnswer = function () {
    if (!selectedQuizAnswer || quizAnswered) return;

    const quiz = quizzesData[currentQuizIndex];
    const isCorrect = selectedQuizAnswer === quiz.correctAnswer;

    quizAnswered = true;
    if (isCorrect) quizScore++;

    showQuizResult(isCorrect, quiz.correctAnswer);

    const options = document.querySelectorAll('.quiz-option');
    options.forEach(opt => {
        opt.disabled = true;
        // Remove hover effects
        opt.style.pointerEvents = 'none';

        if (opt.dataset.option === quiz.correctAnswer) {
            opt.classList.add('correct');
        } else if (opt.dataset.option === selectedQuizAnswer && !isCorrect) {
            opt.classList.add('incorrect');
        }
    });

    // Disable submit button
    document.getElementById('quiz-submit-btn').disabled = true;

    // If it's the last question, show completion after a short delay or let user click next? 
    // Usually user clicks next, but "Next" button might need to change to "Finish"
    // We already updated the button text in displayCurrentQuiz
};

window.clearAIContent = function () {
    // Clear Data
    quizzesData = [];
    currentQuizIndex = 0;
    quizScore = 0;
    generatedQuizzesForCurrentFile = false;
    flashcardsData = [];
    currentFlashcardIndex = 0;
    flashcardsLoadedOnce = false; // Allow re-fetching of user flashcards
    generatedFlashcardsForCurrentFile = false;

    // Clear Storage
    localStorage.removeItem('quizzesData');
    localStorage.removeItem('flashcardsData');

    // Reset UI - Quizzes
    const quizDisplay = document.getElementById('quiz-display');
    const quizEmpty = document.getElementById('quizzes-empty-state');
    const quizCompletion = document.getElementById('quiz-completion-view');

    if (quizDisplay) quizDisplay.classList.add('d-none');
    if (quizCompletion) quizCompletion.classList.add('d-none');
    if (quizEmpty) quizEmpty.classList.remove('d-none');

    // Reset UI - Flashcards
    const flashcardCard = document.getElementById('flashcard-card');
    const flashcardEmpty = document.getElementById('flashcards-empty-state');

    if (flashcardCard) flashcardCard.classList.add('d-none'); // Or verify how flashcards UI handles empty
    // Actually initFlashcardsUI handles visibility based on data length

    // Re-init UI to reflect empty state
    if (typeof initFlashcardsUI === 'function') initFlashcardsUI();
    // For quizzes, we manually toggled above, but let's be safe
    if (typeof displayCurrentQuiz === 'function') {
        // displayCurrentQuiz handles empty state check
        displayCurrentQuiz();
    }
};

function showQuizCompletion() {
    document.getElementById('quiz-display').classList.add('d-none');
    const completionView = document.getElementById('quiz-completion-view');
    completionView.classList.remove('d-none');

    // Calculate score percentage
    const total = quizzesData.length;
    const percent = Math.round((quizScore / total) * 100);
    document.getElementById('quiz-final-score').textContent = percent;

    // Confetti effect could be triggered here if we had a library
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

window.previousQuiz = function () {
    if (quizzesData.length === 0) return;
    currentQuizIndex = (currentQuizIndex - 1 + quizzesData.length) % quizzesData.length;
    displayCurrentQuiz();
};

window.nextQuiz = function () {
    if (quizzesData.length === 0) return;

    if (currentQuizIndex >= quizzesData.length - 1) {
        showQuizCompletion();
        return;
    }

    currentQuizIndex++;
    displayCurrentQuiz();
};

function showQuizzesEmptyState() {
    document.getElementById('quizzes-empty-state').classList.remove('d-none');
    document.getElementById('quiz-display').classList.add('d-none');
}


// ==========================================
// NOTES & WHITEBOARD
// ==========================================
let whiteboardCanvas = null;
let whiteboardCtx = null;
let whiteboardColor = '#111827';
let whiteboardLineWidth = 2;
let eraserMode = false;

let notesCanvas = null;
let notesCtx = null;
let isDrawing = false;
let drawingOpacity = 1.0;
let textOpacity = 1.0;
let textSize = 16;

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

window.toggleEraser = function () {
    const eraserBtn = document.getElementById('eraser-toggle');
    if (!eraserBtn) return;
    eraserMode = !eraserMode;

    if (eraserMode) {
        eraserBtn.classList.remove('btn-outline-secondary');
        eraserBtn.classList.add('btn-secondary');
        eraserBtn.innerHTML = '<i class="bi bi-eraser-fill me-1"></i>Erasing';
        const canvas = document.getElementById('whiteboard-canvas');
        if (canvas) canvas.style.cursor = 'crosshair';
    } else {
        eraserBtn.classList.remove('btn-secondary');
        eraserBtn.classList.add('btn-outline-secondary');
        eraserBtn.innerHTML = '<i class="bi bi-eraser-fill me-1"></i>Eraser';
        const canvas = document.getElementById('whiteboard-canvas');
        if (canvas) canvas.style.cursor = 'default';
    }
};

window.handleClearAll = function () {
    if (whiteboardCanvas && whiteboardCtx) {
        whiteboardCtx.clearRect(0, 0, whiteboardCanvas.width, whiteboardCanvas.height);
    }
    const textarea = document.getElementById('notes-textarea');
    if (textarea) textarea.value = '';
};

function bindWhiteboardControls() {
    const eraserBtn = document.getElementById('eraser-toggle');
    const colorInput = document.getElementById('whiteboard-color');
    const widthInput = document.getElementById('whiteboard-line-width');
    const opacityInput = document.getElementById('drawing-opacity');
    const textOpacityInput = document.getElementById('text-opacity');
    const textSizeInput = document.getElementById('text-size');

    if (eraserBtn) {
        eraserBtn.removeEventListener('click', window.toggleEraser);
        eraserBtn.addEventListener('click', window.toggleEraser);
    }

    if (opacityInput && !opacityInput.dataset.bound) {
        opacityInput.dataset.bound = '1';
        opacityInput.value = (drawingOpacity * 100).toString();
        opacityInput.addEventListener('input', () => {
            const opacity = opacityInput.value / 100;
            drawingOpacity = opacity;
            const canvas = document.getElementById('whiteboard-canvas');
            if (canvas && canvas.style.pointerEvents === 'auto') {
                canvas.style.opacity = opacity;
            }
        });
    }

    if (textOpacityInput && !textOpacityInput.dataset.bound) {
        textOpacityInput.dataset.bound = '1';
        textOpacityInput.value = (textOpacity * 100).toString();
        textOpacityInput.addEventListener('input', () => {
            const opacity = textOpacityInput.value / 100;
            textOpacity = opacity;
            const textarea = document.getElementById('notes-textarea');
            if (textarea && textarea.style.pointerEvents === 'auto') {
                textarea.style.opacity = opacity;
            }
        });
    }

    if (textSizeInput && !textSizeInput.dataset.bound) {
        textSizeInput.dataset.bound = '1';
        textSizeInput.value = textSize.toString();
        textSizeInput.addEventListener('input', () => {
            const size = parseInt(textSizeInput.value);
            textSize = size;
            const textarea = document.getElementById('notes-textarea');
            if (textarea) textarea.style.fontSize = size + 'px';
        });
    }

    if (colorInput && !colorInput.dataset.bound) {
        colorInput.dataset.bound = '1';
        colorInput.value = whiteboardColor || '#111827';
        colorInput.addEventListener('input', () => {
            whiteboardColor = colorInput.value || '#111827';
            if (whiteboardCtx) whiteboardCtx.strokeStyle = whiteboardColor;
        });
    }

    if (widthInput && !widthInput.dataset.bound) {
        widthInput.dataset.bound = '1';
        widthInput.value = whiteboardLineWidth || 2;
        widthInput.addEventListener('input', () => {
            const val = parseInt(widthInput.value, 10);
            if (!Number.isNaN(val) && val > 0) {
                whiteboardLineWidth = val;
                if (whiteboardCtx) whiteboardCtx.lineWidth = whiteboardLineWidth;
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
    if (rightPane) rightPane.scrollTop = 0;
    whiteboardContainer.scrollTop = 0;

    try { whiteboardContainer.scrollIntoView({ behavior: 'auto', block: 'start' }); } catch (_) { }

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
    }

    initWhiteboardCanvas();
    bindWhiteboardControls();

    const clearBtn = document.getElementById('whiteboard-clear-canvas');
    if (clearBtn) clearBtn.onclick = window.handleClearAll;
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

    const isWritingMode = textarea.style.pointerEvents === 'auto';

    if (isWritingMode) {
        // Switch to drawing
        textarea.style.pointerEvents = 'none';
        textarea.style.opacity = '0.3';
        canvas.style.pointerEvents = 'auto';
        canvas.style.opacity = drawingOpacity.toString();
        toggleBtn.innerHTML = '<i class="bi bi-type me-1"></i>Write';

        if (!canvas.dataset.initialized) {
            initNotesCanvas();
            canvas.dataset.initialized = 'true';
        }
    } else {
        // Switch to writing
        textarea.style.pointerEvents = 'auto';
        textarea.style.opacity = textOpacity.toString();
        textarea.style.fontSize = textSize + 'px';
        canvas.style.pointerEvents = 'none';
        canvas.style.opacity = '0.3';
        toggleBtn.innerHTML = '<i class="bi bi-pencil me-1"></i>Draw';
    }
};

window.toggleTextOpacityControl = window.toggleTextOpacityControl || function () {
    const slider = document.getElementById('text-opacity');
    if (slider) {
        const isVisible = slider.style.display !== 'none';
        slider.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const sizeSlider = document.getElementById('text-size');
            if (sizeSlider) sizeSlider.style.display = 'none';
        }
    }
};

window.toggleTextSizeControl = window.toggleTextSizeControl || function () {
    const slider = document.getElementById('text-size');
    if (slider) {
        const isVisible = slider.style.display !== 'none';
        slider.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) {
            const opacitySlider = document.getElementById('text-opacity');
            if (opacitySlider) opacitySlider.style.display = 'none';
        }
    }
};

function initNotesCanvas() {
    const canvas = document.getElementById('whiteboard-canvas');
    if (!canvas) return;

    let imageData = null;
    if (notesCtx && canvas.width && canvas.height) {
        imageData = notesCtx.getImageData(0, 0, canvas.width, canvas.height);
    }

    notesCanvas = canvas;
    notesCtx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    if (imageData) notesCtx.putImageData(imageData, 0, 0);

    if (!canvas.dataset.eventsBound) {
        canvas.dataset.eventsBound = 'true';
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        canvas.addEventListener('touchstart', handleTouch);
        canvas.addEventListener('touchmove', handleTouch);
        canvas.addEventListener('touchend', stopDrawing);
    }
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
        const lineWidth = document.getElementById('whiteboard-line-width').value;
        const eraserSize = parseInt(lineWidth) * 3;
        notesCtx.globalCompositeOperation = 'destination-out';
        notesCtx.beginPath();
        notesCtx.arc(x, y, eraserSize, 0, Math.PI * 2);
        notesCtx.fill();
        notesCtx.globalCompositeOperation = 'source-over';
    } else {
        const color = document.getElementById('whiteboard-color').value;
        const lineWidth = document.getElementById('whiteboard-line-width').value;
        const opacityInput = document.getElementById('drawing-opacity');
        const opacity = opacityInput ? (opacityInput.value / 100) : drawingOpacity;
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

function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

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

// ==========================================
// TRANSLATION TOOL
// ==========================================
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
                if (!response.ok) throw new Error('Translation service unavailable');
                const data = await response.json();
                let translatedText = '';
                if (data && data[0]) {
                    for (let i = 0; i < data[0].length; i++) {
                        if (data[0][i][0]) translatedText += data[0][i][0];
                    }
                }
                if (!translatedText) throw new Error('Translation failed');
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

// ==========================================
// GENERATION OPTIONS LISTENERS
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Helper Tools Toggle
    const aiHelperBtn = document.getElementById('btn-generate-ai-helper');
    if (aiHelperBtn) {
        aiHelperBtn.addEventListener('click', (e) => {
            e.preventDefault();
            aiHelperBtn.style.display = 'none';
            const options = document.getElementById('generate-options');
            if (options) options.style.display = 'block';
        });
    }

    // Helper to check if file is open
    const isFileOpen = () => {
        const content = document.getElementById('content-display')?.innerText?.trim();
        if (!content || content.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Open a File First',
                text: 'Please open a document to use this study tool.',
                confirmButtonColor: '#0d6efd'
            });
            return false;
        }
        return true;
    };

    const summaryCard = document.getElementById('gen-opt-summary');
    if (summaryCard) {
        summaryCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (isFileOpen()) {
                if (window.summarizeLeftToRight) window.summarizeLeftToRight();
            }
        });
    }

    const workbookCard = document.getElementById('gen-opt-workbook'); // Flashcards
    if (workbookCard) {
        workbookCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (isFileOpen()) {
                if (window.openFlashcardsRight) window.openFlashcardsRight();
            }
        });
    }

    const whiteboardCard = document.getElementById('gen-opt-whiteboard');
    if (whiteboardCard) {
        whiteboardCard.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.openWhiteboardRight) window.openWhiteboardRight();
        });
    }

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
            if (isFileOpen()) {
                if (window.openQuizzesRight) window.openQuizzesRight();
            }
        });
    }
});
