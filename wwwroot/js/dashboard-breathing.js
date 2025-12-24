// Breathing Exercises Controller

let breathingInterval = null; // for countdown
let breathingTimeout = null;  // for next step
let currentTechnique = {
    name: '4-7-8',
    pattern: [
        { instruction: 'Inhale', duration: 4, scale: 1.3 },
        { instruction: 'Hold', duration: 7, scale: 1.3 },
        { instruction: 'Exhale', duration: 8, scale: 0.8 }
    ]
};

const breathingTechniques = {
    '478': {
        name: '4-7-8',
        pattern: [
            { instruction: 'Inhale', duration: 4, scale: 1.5 },
            { instruction: 'Hold', duration: 7, scale: 1.5 },
            { instruction: 'Exhale', duration: 8, scale: 0.8 }
        ]
    },
    'box': {
        name: 'Box Breathing',
        pattern: [
            { instruction: 'Inhale', duration: 4, scale: 1.5 },
            { instruction: 'Hold', duration: 4, scale: 1.5 },
            { instruction: 'Exhale', duration: 4, scale: 0.8 },
            { instruction: 'Hold', duration: 4, scale: 0.8 }
        ]
    },
    'calm': {
        name: 'Calm Breathing',
        pattern: [
            { instruction: 'Inhale', duration: 4, scale: 1.4 },
            { instruction: 'Exhale', duration: 6, scale: 0.8 }
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Technique selection
    document.querySelectorAll('.breathing-technique').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.breathing-technique').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const technique = this.dataset.technique;
            if (breathingTechniques[technique]) {
                currentTechnique = breathingTechniques[technique];
                stopBreathing();
            }
        });
    });

    // Toggle button
    const toggleBtn = document.getElementById('breathing-toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleBreathing);
    }
});

let isBreathing = false;

function toggleBreathing() {
    if (isBreathing) {
        stopBreathing();
    } else {
        startBreathing();
    }
}

function updateBreathingButton(state) {
    const btn = document.getElementById('breathing-toggle-btn');
    if (!btn) return;

    if (state === 'running') {
        btn.innerHTML = '<i class="bi bi-stop-fill"></i> Stop';
        btn.className = 'btn btn-sm btn-secondary flex-fill';
        isBreathing = true;
    } else {
        btn.innerHTML = '<i class="bi bi-play-fill"></i> Start';
        btn.className = 'btn btn-sm btn-info text-white flex-fill';
        isBreathing = false;
    }
}

function startBreathing() {
    stopBreathing(); // Clear any existing interval
    updateBreathingButton('running');

    const circle = document.getElementById('breathing-circle-anim');
    const instruction = document.getElementById('breathing-instruction');
    const count = document.getElementById('breathing-count');

    if (!circle || !instruction || !count) return;

    let stepIndex = 0;

    function runStep() {
        const step = currentTechnique.pattern[stepIndex];
        instruction.textContent = step.instruction;

        // Animate circle (adjusted for smaller base radius)
        const radius = 35 * step.scale; // Base radius 35
        circle.style.transition = `r ${step.duration}s ease-in-out`;
        circle.setAttribute('r', radius);

        // Countdown
        let remaining = step.duration;
        count.textContent = remaining;

        // Clear previous interval if any (safety)
        if (breathingInterval) clearInterval(breathingInterval);

        breathingInterval = setInterval(() => {
            remaining--;
            if (remaining > 0) {
                count.textContent = remaining;
            } else {
                count.textContent = '';
                clearInterval(breathingInterval);
                breathingInterval = null;
            }
        }, 1000);

        // Move to next step
        breathingTimeout = setTimeout(() => {
            stepIndex = (stepIndex + 1) % currentTechnique.pattern.length;
            runStep();
        }, step.duration * 1000);
    }

    runStep();
}

function stopBreathing() {
    updateBreathingButton('stopped');

    if (breathingInterval) {
        clearInterval(breathingInterval);
        breathingInterval = null;
    }
    if (breathingTimeout) {
        clearTimeout(breathingTimeout);
        breathingTimeout = null;
    }

    const circle = document.getElementById('breathing-circle-anim');
    const instruction = document.getElementById('breathing-instruction');
    const count = document.getElementById('breathing-count');

    if (circle) {
        circle.style.transition = 'r 0.5s ease-out';
        circle.setAttribute('r', '35'); // Updated for smaller circle
    }
    if (instruction) instruction.textContent = 'Ready';
    if (count) count.textContent = '';
}

// Mind Games - Number Memory
let gameScore = 0;
let currentNumber = 0;
let gameLevel = 1;

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('game-start-btn');
    const submitBtn = document.getElementById('game-submit-btn');
    const answerInput = document.getElementById('game-answer-input');

    if (startBtn) {
        startBtn.addEventListener('click', startGame);
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', checkAnswer);
    }

    if (answerInput) {
        answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
    }
});

function startGame() {
    gameLevel = Math.min(gameLevel, 6); // Max 6 digits
    const digits = gameLevel + 2; // Start with 3 digits
    currentNumber = Math.floor(Math.random() * Math.pow(10, digits));

    const display = document.getElementById('game-number-display');
    const status = document.getElementById('game-status');
    const inputArea = document.getElementById('game-input-area');
    const startBtn = document.getElementById('game-start-btn');
    const submitBtn = document.getElementById('game-submit-btn');
    const answerInput = document.getElementById('game-answer-input');

    if (display) display.textContent = currentNumber;
    if (status) status.textContent = 'Memorize this number...';
    if (startBtn) startBtn.style.display = 'none';
    if (inputArea) inputArea.style.display = 'none';
    if (answerInput) answerInput.value = '';

    // Hide number after 3 seconds
    setTimeout(() => {
        if (display) display.textContent = '?';
        if (status) status.textContent = 'What was the number?';
        if (inputArea) inputArea.style.display = 'block';
        if (submitBtn) submitBtn.style.display = 'block';
        if (answerInput) answerInput.focus();
    }, 3000);
}

function checkAnswer() {
    const answerInput = document.getElementById('game-answer-input');
    const status = document.getElementById('game-status');
    const scoreEl = document.getElementById('game-score');
    const startBtn = document.getElementById('game-start-btn');
    const submitBtn = document.getElementById('game-submit-btn');
    const inputArea = document.getElementById('game-input-area');

    if (!answerInput) return;

    const userAnswer = parseInt(answerInput.value);

    if (userAnswer === currentNumber) {
        gameScore += 10;
        gameLevel++;
        if (status) status.textContent = '✓ Correct! Next level...';
        if (scoreEl) scoreEl.textContent = gameScore;

        setTimeout(() => {
            if (submitBtn) submitBtn.style.display = 'none';
            if (inputArea) inputArea.style.display = 'none';
            if (startBtn) startBtn.style.display = 'block';
            startGame();
        }, 1000);
    } else {
        if (gameScore > 0) gameScore -= 5;
        gameLevel = Math.max(1, gameLevel - 1);
        if (status) status.textContent = `✗ Wrong! It was ${currentNumber}`;
        if (scoreEl) scoreEl.textContent = Math.max(0, gameScore);

        setTimeout(() => {
            if (submitBtn) submitBtn.style.display = 'none';
            if (inputArea) inputArea.style.display = 'none';
            if (startBtn) startBtn.style.display = 'block';
            if (status) status.textContent = 'Try again!';
        }, 2000);
    }
}
