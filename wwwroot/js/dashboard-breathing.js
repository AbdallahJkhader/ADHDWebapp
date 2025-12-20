// Breathing Exercises Controller

let breathingInterval = null;
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
            { instruction: 'Inhale', duration: 4, scale: 1.3 },
            { instruction: 'Hold', duration: 7, scale: 1.3 },
            { instruction: 'Exhale', duration: 8, scale: 0.8 }
        ]
    },
    'box': {
        name: 'Box Breathing',
        pattern: [
            { instruction: 'Inhale', duration: 4, scale: 1.3 },
            { instruction: 'Hold', duration: 4, scale: 1.3 },
            { instruction: 'Exhale', duration: 4, scale: 0.8 },
            { instruction: 'Hold', duration: 4, scale: 0.8 }
        ]
    },
    'calm': {
        name: 'Calm Breathing',
        pattern: [
            { instruction: 'Inhale', duration: 4, scale: 1.2 },
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

    // Start button
    const startBtn = document.getElementById('breathing-start');
    if (startBtn) {
        startBtn.addEventListener('click', startBreathing);
    }

    // Stop button
    const stopBtn = document.getElementById('breathing-stop');
    if (stopBtn) {
        stopBtn.addEventListener('click', stopBreathing);
    }
});

function startBreathing() {
    stopBreathing(); // Clear any existing interval

    const circle = document.querySelector('#breathing-circle circle');
    const instruction = document.getElementById('breathing-instruction');
    const count = document.getElementById('breathing-count');

    if (!circle || !instruction || !count) return;

    let stepIndex = 0;

    function runStep() {
        const step = currentTechnique.pattern[stepIndex];
        instruction.textContent = step.instruction;

        // Animate circle
        const radius = 80 * step.scale;
        circle.setAttribute('r', radius);

        // Countdown
        let remaining = step.duration;
        count.textContent = remaining;

        const countdown = setInterval(() => {
            remaining--;
            count.textContent = remaining > 0 ? remaining : '';

            if (remaining <= 0) {
                clearInterval(countdown);
            }
        }, 1000);

        // Move to next step
        setTimeout(() => {
            stepIndex = (stepIndex + 1) % currentTechnique.pattern.length;
            runStep();
        }, step.duration * 1000);
    }

    runStep();
}

function stopBreathing() {
    if (breathingInterval) {
        clearInterval(breathingInterval);
        breathingInterval = null;
    }

    const circle = document.querySelector('#breathing-circle circle');
    const instruction = document.getElementById('breathing-instruction');
    const count = document.getElementById('breathing-count');

    if (circle) circle.setAttribute('r', '80');
    if (instruction) instruction.textContent = 'Ready';
    if (count) count.textContent = '';
}

// Mind Games - placeholder for future implementation
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function () {
            const game = this.dataset.game;
            alert(`${game} game coming soon! Stay tuned for brain training exercises.`);
        });
    });
});
