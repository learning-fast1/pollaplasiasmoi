// Δεδομένα Επιπέδων (Stages)
const LEVELS = [
    { id: 1, title: "Προπαίδεια του 0", type: "single", table: 0 },
    { id: 2, title: "Προπαίδεια του 1", type: "single", table: 1 },
    { id: 3, title: "Προπαίδεια του 2", type: "single", table: 2 },
    { id: 4, title: "Προπαίδεια του 3", type: "single", table: 3 },
    { id: 5, title: "Προπαίδεια του 4", type: "single", table: 4 },
    { id: 6, title: "Προπαίδεια του 5", type: "single", table: 5 },
    { id: 7, title: "Προπαίδεια του 6", type: "single", table: 6 },
    { id: 8, title: "Προπαίδεια του 7", type: "single", table: 7 },
    { id: 9, title: "Προπαίδεια του 8", type: "single", table: 8 },
    { id: 10, title: "Προπαίδεια του 9", type: "single", table: 9 },
    { id: 11, title: "Προπαίδεια του 10", type: "single", table: 10 },
    { id: 12, title: "Προπαίδεια του 11", type: "single", table: 11 },
    { id: 13, title: "Προπαίδειες από το 0 - 5", type: "distributed", isBoss: true, questions: 20,
      distribution: [
          { table: 0, count: 1 },
          { table: 1, count: 1 },
          { table: 2, count: 2 },
          { table: 3, count: 5 },
          { table: 4, count: 6 },
          { table: 5, count: 6 }
      ]
    },
    { id: 14, title: "Τερματισμός", type: "distributed", isBoss: true, questions: 30,
      distribution: [
          { table: 0,  count: 1 },
          { table: 1,  count: 1 },
          { table: 2,  count: 2 },
          { table: 3,  count: 2 },
          { table: 4,  count: 2 },
          { table: 5,  count: 2 },
          { table: 10, count: 2 },
          { table: 11, count: 2 },
          { table: 6,  count: 4, minB: 6 },
          { table: 7,  count: 4, minB: 6 },
          { table: 8,  count: 4, minB: 6 },
          { table: 9,  count: 4, minB: 6 }
      ]
    }
];

const DEFAULT_QUESTIONS = 10;
let levelQuestions = DEFAULT_QUESTIONS;
let currentLevel = null;
let currentQuestionIndex = 0;
let currentCorrectAnswers = 0;
let questionData = {};
let questionQueue = []; // ουρά μοναδικών πράξεων για το τρέχον επίπεδο
let tableErrors = {};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildQuestionQueue(level) {
    const questions = [];

    if (level.type === 'single') {
        const t = level.table;
        const pool = shuffle(Array.from({ length: 12 }, (_, i) => i));
        const count = Math.min(levelQuestions, pool.length);
        for (let i = 0; i < count; i++) {
            questions.push({ tableVal: t, otherVal: pool[i], table: t });
        }
    } else if (level.type === 'distributed') {
        level.distribution.forEach(({ table, count, minB }) => {
            const min = minB || 0;
            const pool = shuffle(Array.from({ length: 12 - min }, (_, i) => i + min));
            const take = Math.min(count, pool.length);
            for (let i = 0; i < take; i++) {
                questions.push({ tableVal: table, otherVal: pool[i], table });
            }
        });
        shuffle(questions);
    }

    return questions;
}

let userProgress = JSON.parse(localStorage.getItem('mathAdventureProgress')) || {};

// Στοιχεία DOM
const mapScreen = document.getElementById('map-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const levelsWrapper = document.getElementById('levels-wrapper');
const totalStarsDisplay = document.getElementById('total-stars');

const levelTitleText = document.getElementById('level-title');
const progressBar = document.getElementById('progress-bar');
const scoreText = document.getElementById('score');
const questionText = document.getElementById('question-text');
const answersGrid = document.getElementById('answers-grid');

const starsEarned = document.getElementById('stars-earned');
const resultMessage = document.getElementById('result-message');
const correctCountText = document.getElementById('correct-count');
const totalCountText = document.getElementById('total-count');

// Events
document.getElementById('btn-back').addEventListener('click', showMapScreen);
document.getElementById('btn-continue').addEventListener('click', showMapScreen);

function init() {
    renderMap();
    updateTotalStars();
}

function renderMap() {
    levelsWrapper.innerHTML = '';

    LEVELS.forEach(level => {
        const node = document.createElement('div');
        node.className = `level-node ${level.isBoss ? 'boss' : ''}`;
        node.textContent = level.id;

        // Stars display
        const earnedStars = userProgress[level.id] || 0;
        let starsHtml = '';
        for(let i=1; i<=3; i++) {
            starsHtml += `<span class="star ${i <= earnedStars ? 'earned' : ''}">⭐</span>`;
        }

        const label = document.createElement('div');
        label.className = 'node-label';
        label.textContent = level.title;

        node.innerHTML += `<div class="node-stars">${starsHtml}</div>`;
        node.appendChild(label);

        node.addEventListener('click', () => startGame(level));

        levelsWrapper.appendChild(node);
    });

    requestAnimationFrame(() => { drawPath(); addForestDecoration(); });
}

function drawPath() {
    const container = document.querySelector('.map-container');
    const svg = document.getElementById('map-path-svg');
    const pathEl = document.getElementById('map-path-line');
    const innerEl = document.getElementById('map-path-inner');
    const nodes = document.querySelectorAll('.level-node');

    if (nodes.length === 0) return;

    const containerRect = container.getBoundingClientRect();
    const scrollTop = container.scrollTop;

    const points = Array.from(nodes).map(node => {
        const rect = node.getBoundingClientRect();
        return {
            x: rect.left - containerRect.left + rect.width / 2,
            y: rect.top - containerRect.top + rect.height / 2 + scrollTop
        };
    });

    const totalHeight = container.scrollHeight;
    svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${totalHeight}`);
    svg.style.height = totalHeight + 'px';

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const midY = (prev.y + curr.y) / 2;
        d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }

    pathEl.setAttribute('d', d);
    if (innerEl) innerEl.setAttribute('d', d);
}

function addForestDecoration() {
    // Η εικόνα forest.jpg καλύπτει το φόντο — δεν χρειάζονται JS διακοσμήσεις
    document.querySelectorAll('.bg-tree, .forest-river-svg').forEach(el => el.remove());
}

function updateTotalStars() {
    let total = 0;
    for(const key in userProgress) {
        total += userProgress[key];
    }
    totalStarsDisplay.textContent = total;
}

function showMapScreen() {
    gameScreen.classList.remove('active');
    resultScreen.classList.remove('active');
    mapScreen.classList.add('active');
    renderMap(); // re-render for progress changes
    updateTotalStars();
}

function startGame(level) {
    currentLevel = level;
    currentQuestionIndex = 0;
    currentCorrectAnswers = 0;
    levelQuestions = level.questions || DEFAULT_QUESTIONS;
    tableErrors = {};
    questionQueue = buildQuestionQueue(level);

    levelTitleText.textContent = level.title;
    scoreText.textContent = "0";

    mapScreen.classList.remove('active');
    gameScreen.classList.add('active');

    generateQuestion();
}

function generateQuestion() {
    // Progress
    progressBar.style.width = `${(currentQuestionIndex / levelQuestions) * 100}%`;
    
    if (currentQuestionIndex >= levelQuestions) {
        endGame();
        return;
    }

    const q = questionQueue[currentQuestionIndex];
    questionData.table = q.table;

    // Τυχαία εναλλαγή για ποικιλία (π.χ. 5×3 ή 3×5)
    if (Math.random() > 0.5) {
        questionData.a = q.tableVal;
        questionData.b = q.otherVal;
    } else {
        questionData.a = q.otherVal;
        questionData.b = q.tableVal;
    }
    
    questionData.correctAnswer = questionData.a * questionData.b;
    questionText.textContent = `${questionData.a} × ${questionData.b} = ?`;
    
    generateAnswers();
}

function generateAnswers() {
    answersGrid.innerHTML = '';

    let answers = [questionData.correctAnswer];
    let safetyCounter = 0;

    while (answers.length < 4) {
        safetyCounter++;
        if (safetyCounter > 200) break; // αποφυγή infinite loop

        let fakeOffset = Math.floor(Math.random() * 5) + 1;
        let fakeAns = Math.random() > 0.5
            ? questionData.correctAnswer + fakeOffset
            : questionData.correctAnswer - fakeOffset;

        if (Math.random() > 0.7) {
            fakeAns = Math.floor(Math.random() * 120) + 1;
        }

        // Τυπικό λάθος: a*(b+1) — μόνο αν δεν υπάρχει ήδη
        if (answers.length === 2 && questionData.a !== 0 && questionData.b !== 0) {
            const commonMistake = questionData.a * (questionData.b + 1);
            if (!answers.includes(commonMistake)) {
                fakeAns = commonMistake;
            }
        }

        if (fakeAns < 0) fakeAns = 0;

        if (!answers.includes(fakeAns)) {
            answers.push(fakeAns);
        }
    }
    
    // Shuffle
    answers.sort(() => Math.random() - 0.5);
    
    answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = ans;
        btn.addEventListener('click', () => handleAnswer(ans, btn));
        answersGrid.appendChild(btn);
    });
}

function handleAnswer(selectedAnswer, btnElement) {
    // Disable all buttons to prevent double-clicks
    const allBtns = document.querySelectorAll('.answer-btn');
    allBtns.forEach(b => b.style.pointerEvents = 'none');
    
    if (selectedAnswer === questionData.correctAnswer) {
        btnElement.classList.add('correct');
        currentCorrectAnswers++;
        scoreText.textContent = currentCorrectAnswers * 10;
        // Play success sound (conceptually)
    } else {
        btnElement.classList.add('wrong');
        allBtns.forEach(b => {
            if (parseInt(b.textContent) === questionData.correctAnswer) {
                b.classList.add('correct');
            }
        });
        // Καταγραφή λάθους ανά πίνακα (για boss report)
        if (currentLevel.isBoss) {
            const t = questionData.table;
            tableErrors[t] = (tableErrors[t] || 0) + 1;
        }
    }
    
    setTimeout(() => {
        currentQuestionIndex++;
        generateQuestion();
    }, 1200); // Wait bit to let user see response
}

function endGame() {
    progressBar.style.width = '100%';
    
    setTimeout(() => {
        // Calculate Stars
        let stars = 0;
        if (currentCorrectAnswers === levelQuestions) stars = 3;
        else if (currentCorrectAnswers >= 7) stars = 2;
        else if (currentCorrectAnswers >= 4) stars = 1;

        // Save progress if better
        if (!userProgress[currentLevel.id] || stars > userProgress[currentLevel.id]) {
            userProgress[currentLevel.id] = stars;
            localStorage.setItem('mathAdventureProgress', JSON.stringify(userProgress));
        }
        
        // Set UI
        correctCountText.textContent = currentCorrectAnswers;
        totalCountText.textContent = levelQuestions;
        
        const starIcons = starsEarned.querySelectorAll('.star');
        starIcons.forEach(s => s.classList.remove('active'));
        
        starIcons.forEach((s, idx) => {
            if (idx < stars) {
                setTimeout(() => s.classList.add('active'), 300 * (idx + 1));
            }
        });
        
        if (stars === 3) {
            resultMessage.textContent = "Άριστα! Είσαι ξεφτέρι!";
        } else if (stars === 2) {
            resultMessage.textContent = "Πολύ καλά! Λίγο ακόμα!";
        } else if (stars === 1) {
            resultMessage.textContent = "Μπράβο! Συνέχισε την εξάσκηση!";
        } else {
            resultMessage.textContent = "Μην απογοητεύεσαι! Μπορείς να τα πας καλύτερα!";
        }
        
        // Boss report
        const reportEl = document.getElementById('boss-report');
        if (currentLevel.isBoss) {
            reportEl.style.display = 'block';
            renderBossReport();
        } else {
            reportEl.style.display = 'none';
        }

        resultScreen.classList.add('active');
    }, 500);
}

function renderBossReport() {
    const contentEl = document.getElementById('report-content');

    // Μαζεύουμε όλους τους πίνακες που εξετάστηκαν
    const allTables = currentLevel.type === 'distributed'
        ? currentLevel.distribution.map(d => d.table)
        : currentLevel.tables;

    const errorEntries = allTables
        .map(t => ({ table: t, errors: tableErrors[t] || 0 }))
        .sort((a, b) => b.errors - a.errors);

    const hasErrors = errorEntries.some(e => e.errors > 0);

    if (!hasErrors) {
        contentEl.innerHTML = '<p class="report-perfect">🏆 Τέλεια! Καμία αδυναμία!</p>';
        return;
    }

    const needPractice = errorEntries.filter(e => e.errors > 0);
    const allGood     = errorEntries.filter(e => e.errors === 0);
    const maxErrors   = needPractice[0].errors;

    let html = '<p class="report-subtitle">Χρειάζεται περισσότερη εξάσκηση:</p><div class="report-bars">';
    needPractice.forEach(({ table, errors }) => {
        const pct = Math.round((errors / maxErrors) * 100);
        const label = errors === 1 ? '1 λάθος' : `${errors} λάθη`;
        html += `
            <div class="report-row">
                <span class="report-label">×${table}</span>
                <div class="report-bar-bg">
                    <div class="report-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="report-count">${label}</span>
            </div>`;
    });
    html += '</div>';

    if (allGood.length > 0) {
        html += '<p class="report-subtitle" style="margin-top:12px">Καλή επίδοση:</p><div class="report-bars">';
        allGood.forEach(({ table }) => {
            html += `
                <div class="report-ok-row">
                    <span class="report-ok-label">×${table}</span>
                    <span class="report-ok-text">✔ Χωρίς λάθη!</span>
                </div>`;
        });
        html += '</div>';
    }

    contentEl.innerHTML = html;
}

// Ξεκινάμε το αρχικό render
init();
