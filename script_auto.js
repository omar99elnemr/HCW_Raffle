// ===== Global State =====
let staffList = [];
let prizesList = [];
let winners = [];
let isDrawing = false;
let isPaused = false;
let autoDrawInterval = null;
let countdownInterval = null;
let drawIntervalTime = 8000;
let countdownTime = 0;
let raffleStarted = false;

// ===== Persistence Keys =====
const STORAGE_KEY = 'hcw_raffle_state';

// ===== Save State to LocalStorage =====
function saveState() {
    const state = {
        staffList,
        prizesList,
        winners,
        isPaused,
        drawIntervalTime,
        raffleStarted,
        timestamp: Date.now()
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Could not save state to localStorage:', e);
    }
}

// ===== Load State from LocalStorage =====
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Could not load state from localStorage:', e);
    }
    return null;
}

// ===== Clear Saved State =====
function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Could not clear state from localStorage:', e);
    }
}

// ===== Restore Raffle from Saved State =====
function restoreRaffle(state) {
    staffList = state.staffList || [];
    prizesList = state.prizesList || [];
    winners = state.winners || [];
    drawIntervalTime = state.drawIntervalTime || 8000;
    isPaused = true; // Always restore paused so user can review
    raffleStarted = true;
    
    // Hide upload, show raffle section
    uploadSection.classList.add('hidden');
    raffleSection.classList.remove('hidden');
    
    // Update stats
    updateStats();
    
    // Restore winners grid
    const emptyState = document.getElementById('empty-state');
    if (emptyState && winners.length > 0) {
        emptyState.style.display = 'none';
    }
    
    // Add all winners to grid (in reverse order so latest is on top)
    winners.forEach((winner, index) => {
        const item = document.createElement('div');
        item.className = 'winner-item';
        const photoPath = `photos/${winner.photo}`;
        item.innerHTML = `
            <div class="winner-item-number">${index + 1}</div>
            <img src="${photoPath}" alt="${winner.name}" class="winner-item-photo" 
                 onerror="this.src='photos/default.svg'">
            <div class="winner-item-info">
                <div class="winner-item-name">${winner.name}</div>
                <div class="winner-item-dept">${winner.department} - ${winner.position}</div>
            </div>
            <div class="winner-item-prize">🎁 ${winner.prize}</div>
        `;
        winnersGrid.appendChild(item);
    });
    
    // Show export button if there are winners
    if (winners.length > 0) {
        exportBtn.classList.remove('hidden');
    }
    
    // Hide waiting message
    waitingMessage.classList.add('hidden');
    
    // Set pause state
    pauseText.textContent = '▶️ Resume';
    pauseBtn.classList.add('paused');
    autoStatus.classList.add('paused');
    autoStatus.querySelector('.status-text').textContent = 'Paused (Restored)';
    
    // Check if raffle is complete
    if (prizesList.length === 0) {
        autoStatus.classList.add('hidden');
        document.querySelector('.control-buttons').classList.add('hidden');
        completionMessage.classList.remove('hidden');
    }
}

// ===== DOM Elements =====
const staffFileInput = document.getElementById('staff-file');
const prizesFileInput = document.getElementById('prizes-file');
const staffFileName = document.getElementById('staff-file-name');
const prizesFileName = document.getElementById('prizes-file-name');
const staffCount = document.getElementById('staff-count');
const prizesCount = document.getElementById('prizes-count');
const startBtn = document.getElementById('start-btn');
const uploadSection = document.getElementById('upload-section');
const raffleSection = document.getElementById('raffle-section');
const winnersSection = document.getElementById('winners-section');
const remainingStaff = document.getElementById('remaining-staff');
const remainingPrizes = document.getElementById('remaining-prizes');
const winnerCountEl = document.getElementById('winner-count');
const winnerCard = document.getElementById('winner-card');
const slotMachine = document.getElementById('slot-machine');
const slotNames = document.getElementById('slot-names');
const winnerPhoto = document.getElementById('winner-photo');
const winnerName = document.getElementById('winner-name');
const winnerPosition = document.getElementById('winner-position');
const winnerDepartment = document.getElementById('winner-department');
const prizeName = document.getElementById('prize-name');
const winnersGrid = document.getElementById('winners-grid');
const exportBtn = document.getElementById('export-btn');
const completionMessage = document.getElementById('completion-message');
const confettiCanvas = document.getElementById('confetti-canvas');
const ctx = confettiCanvas.getContext('2d');
const autoStatus = document.getElementById('auto-status');
const countdownEl = document.getElementById('countdown');
const progressFill = document.getElementById('progress-fill');
const pauseBtn = document.getElementById('pause-btn');
const pauseText = document.getElementById('pause-text');
const skipBtn = document.getElementById('skip-btn');
const waitingMessage = document.getElementById('waiting-message');

// ===== File Upload Handlers =====
staffFileInput.addEventListener('change', (e) => handleFileUpload(e, 'staff'));
prizesFileInput.addEventListener('change', (e) => handleFileUpload(e, 'prizes'));

// ===== Check for Saved State on Page Load =====
document.addEventListener('DOMContentLoaded', () => {
    const savedState = loadState();
    if (savedState && savedState.raffleStarted && (savedState.prizesList?.length > 0 || savedState.winners?.length > 0)) {
        // Show confirmation dialog
        const timeSaved = new Date(savedState.timestamp).toLocaleString();
        const winnersCount = savedState.winners?.length || 0;
        const prizesLeft = savedState.prizesList?.length || 0;
        
        if (confirm(`Found saved raffle session from ${timeSaved}.\n\nWinners drawn: ${winnersCount}\nPrizes remaining: ${prizesLeft}\n\nWould you like to resume?`)) {
            restoreRaffle(savedState);
        } else {
            clearState();
        }
    }
});

function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

            if (type === 'staff') {
                parseStaffData(jsonData);
                staffFileName.textContent = file.name;
                staffCount.textContent = `✓ ${staffList.length} staff members loaded`;
                document.getElementById('staff-upload').classList.add('loaded');
            } else {
                parsePrizesData(jsonData);
                prizesFileName.textContent = file.name;
                prizesCount.textContent = `✓ ${prizesList.length} prizes loaded`;
                document.getElementById('prizes-upload').classList.add('loaded');
            }

            checkReadyToStart();
        } catch (error) {
            alert('Error reading file. Please make sure it\'s a valid Excel file.');
            console.error(error);
        }
    };
    reader.readAsArrayBuffer(file);
}

function parseStaffData(data) {
    // Always skip first row (header)
    staffList = [];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row.length >= 2 && row[1]) {  // At least id and name
            staffList.push({
                id: row[0] || '',
                name: row[1] || '',
                department: row[2] || '',
                position: row[3] || '',
                photo: row[4] || 'default.svg'
            });
        }
    }
}

function parsePrizesData(data) {
    // Always skip first row (header)
    prizesList = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (row && row[0] !== undefined && row[0] !== null && row[0] !== '') {
            prizesList.push(row[0].toString().trim());
        }
    }
}

function checkReadyToStart() {
    startBtn.disabled = !(staffList.length > 0 && prizesList.length > 0);
}

// ===== Start Raffle =====
function startRaffle() {
    // Get selected interval
    drawIntervalTime = parseInt(document.getElementById('draw-interval').value);
    raffleStarted = true;
    
    uploadSection.classList.add('hidden');
    raffleSection.classList.remove('hidden');
    updateStats();
    
    // Save initial state
    saveState();
    
    // Start auto draw after a short delay
    setTimeout(() => {
        startAutoDraw();
    }, 1000);
}

function startAutoDraw() {
    if (prizesList.length === 0) return;
    
    // Perform first draw immediately
    draw().then(() => {
        // Set up interval for subsequent draws after winner is shown
        setTimeout(() => {
            scheduleNextDraw();
        }, 3000); // Wait 3 seconds to show winner before starting countdown
    });
}

function scheduleNextDraw() {
    if (prizesList.length === 0 || isPaused) return;
    
    countdownTime = drawIntervalTime / 1000;
    updateCountdown();
    
    // Clear any existing intervals
    clearInterval(countdownInterval);
    clearTimeout(autoDrawInterval);
    
    // Start countdown
    countdownInterval = setInterval(() => {
        if (!isPaused) {
            countdownTime--;
            updateCountdown();
            
            if (countdownTime <= 0) {
                clearInterval(countdownInterval);
            }
        }
    }, 1000);
    
    // Schedule next draw
    autoDrawInterval = setTimeout(() => {
        if (!isPaused && prizesList.length > 0) {
            draw().then(() => {
                // Wait 3 seconds to show winner before starting next countdown
                setTimeout(() => {
                    scheduleNextDraw();
                }, 3000);
            });
        }
    }, drawIntervalTime);
}

function updateCountdown() {
    countdownEl.textContent = Math.max(0, countdownTime);
    const progress = ((drawIntervalTime / 1000 - countdownTime) / (drawIntervalTime / 1000)) * 100;
    progressFill.style.width = `${progress}%`;
}

function updateStats() {
    remainingStaff.textContent = staffList.length;
    remainingPrizes.textContent = prizesList.length;
    winnerCountEl.textContent = winners.length;
}

// ===== Toggle Pause =====
function togglePause() {
    isPaused = !isPaused;
    
    if (isPaused) {
        pauseText.textContent = '▶️ Resume';
        pauseBtn.classList.add('paused');
        autoStatus.classList.add('paused');
        autoStatus.querySelector('.status-text').textContent = 'Paused';
        clearInterval(countdownInterval);
        clearTimeout(autoDrawInterval);
        // Save state when paused
        saveState();
    } else {
        pauseText.textContent = '⏸️ Pause';
        pauseBtn.classList.remove('paused');
        autoStatus.classList.remove('paused');
        autoStatus.querySelector('.status-text').textContent = 'Auto Draw Active';
        scheduleNextDraw();
    }
}

// ===== Reset Raffle (Start Fresh) =====
function resetRaffle() {
    if (confirm('Are you sure you want to reset and start a new raffle? All progress will be lost.')) {
        clearState();
        location.reload();
    }
}

// ===== Skip to Next Draw =====
function skipToNext() {
    if (isDrawing || prizesList.length === 0) return;
    
    clearInterval(countdownInterval);
    clearTimeout(autoDrawInterval);
    
    draw().then(() => {
        // Wait 3 seconds to show winner before starting next countdown
        if (prizesList.length > 0 && !isPaused) {
            setTimeout(() => {
                scheduleNextDraw();
            }, 3000);
        }
    });
}

// ===== Draw Function =====
async function draw() {
    if (isDrawing || staffList.length === 0 || prizesList.length === 0) return Promise.resolve();
    
    isDrawing = true;
    pauseBtn.disabled = true;
    skipBtn.disabled = true;
    
    // Hide waiting message
    waitingMessage.classList.add('hidden');
    
    winnerCard.classList.add('hidden');
    slotMachine.classList.remove('hidden');

    // Slot machine animation
    const duration = 3000;
    const interval = 50;
    const iterations = duration / interval;
    
    for (let i = 0; i < iterations; i++) {
        const randomIndex = Math.floor(Math.random() * staffList.length);
        slotNames.textContent = staffList[randomIndex].name;
        await sleep(interval);
        
        // Slow down towards the end
        if (i > iterations * 0.7) {
            await sleep(interval * (1 + (i - iterations * 0.7) / 10));
        }
    }

    // Select winner
    const winnerIndex = Math.floor(Math.random() * staffList.length);
    const prizeIndex = Math.floor(Math.random() * prizesList.length);
    
    const winner = staffList[winnerIndex];
    const prize = prizesList[prizeIndex];

    // Remove from lists
    staffList.splice(winnerIndex, 1);
    prizesList.splice(prizeIndex, 1);

    // Add to winners
    winners.push({ ...winner, prize });
    
    // Save state after each winner
    saveState();

    // Show winner
    slotMachine.classList.add('hidden');
    displayWinner(winner, prize);
    
    // Update stats
    updateStats();
    
    // Add to winners grid
    addToWinnersGrid(winner, prize, winners.length);
    
    // Show export button
    exportBtn.classList.remove('hidden');
    
    // Trigger confetti
    launchConfetti();
    
    // Check if all prizes are awarded
    if (prizesList.length === 0) {
        clearInterval(countdownInterval);
        clearTimeout(autoDrawInterval);
        
        // Clear saved state when raffle is complete
        clearState();
        
        setTimeout(() => {
            autoStatus.classList.add('hidden');
            document.querySelector('.control-buttons').classList.add('hidden');
            completionMessage.classList.remove('hidden');
            launchConfetti();
            setTimeout(launchConfetti, 500);
            setTimeout(launchConfetti, 1000);
        }, 2000);
    }
    
    isDrawing = false;
    pauseBtn.disabled = false;
    skipBtn.disabled = false;
}

function displayWinner(winner, prize) {
    // Set photo path - photos are in a subfolder
    const photoPath = `photos/${winner.photo}`;
    winnerPhoto.src = photoPath;
    winnerPhoto.onerror = () => {
        winnerPhoto.src = 'photos/default.svg';
    };
    
    winnerName.textContent = winner.name;
    winnerPosition.textContent = winner.position;
    winnerDepartment.textContent = winner.department;
    prizeName.textContent = prize;
    
    winnerCard.classList.remove('hidden');
}

function addToWinnersGrid(winner, prize, number) {
    // Hide empty state on first winner
    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }
    
    // Remove latest class from previous items
    const previousLatest = winnersGrid.querySelector('.winner-item.latest');
    if (previousLatest) {
        previousLatest.classList.remove('latest');
    }
    
    const item = document.createElement('div');
    item.className = 'winner-item latest';
    item.style.animationDelay = '0.1s';
    
    const photoPath = `photos/${winner.photo}`;
    
    item.innerHTML = `
        <div class="winner-item-number">${number}</div>
        <img src="${photoPath}" alt="${winner.name}" class="winner-item-photo" 
             onerror="this.src='photos/default.svg'">
        <div class="winner-item-info">
            <div class="winner-item-name">${winner.name}</div>
            <div class="winner-item-dept">${winner.department} - ${winner.position}</div>
        </div>
        <div class="winner-item-prize">🎁 ${prize}</div>
    `;
    
    winnersGrid.insertBefore(item, winnersGrid.firstChild);
    
    // Auto-scroll to show latest winner (at top)
    winnersGrid.scrollTop = 0;
}

// ===== Export Winners =====
function exportWinners() {
    const data = winners.map((w, i) => ({
        '#': i + 1,
        'ID': w.id,
        'Name': w.name,
        'Department': w.department,
        'Position': w.position,
        'Prize': w.prize
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Winners');
    
    // Set column widths
    ws['!cols'] = [
        { wch: 5 },   // #
        { wch: 10 },  // ID
        { wch: 25 },  // Name
        { wch: 20 },  // Department
        { wch: 25 },  // Position
        { wch: 30 }   // Prize
    ];
    
    XLSX.writeFile(wb, `Raffle_Winners_Auto_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===== Utility Functions =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Confetti Animation =====
let confettiParticles = [];
let animationId = null;
let pendingParticles = 0;

function resizeCanvas() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class ConfettiParticle {
    constructor() {
        this.x = Math.random() * confettiCanvas.width;
        this.y = -20;
        this.size = Math.random() * 10 + 5;
        this.speedY = Math.random() * 3 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 10 - 5;
        this.color = this.getRandomColor();
        this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
    }

    getRandomColor() {
        const colors = ['#D4AF37', '#6c5ce7', '#fd79a8', '#00b894', '#e17055', '#0984e3', '#ffeaa7'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.y += this.speedY;
        this.x += this.speedX;
        this.rotation += this.rotationSpeed;
        this.speedY += 0.05; // Gravity
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        
        if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size / 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function launchConfetti() {
    const particleCount = 100;
    pendingParticles += particleCount;
    
    // Add new particles with staggered timing
    for (let i = 0; i < particleCount; i++) {
        setTimeout(() => {
            confettiParticles.push(new ConfettiParticle());
            pendingParticles--;
        }, i * 20);
    }
    
    // Start animation if not already running
    if (!animationId) {
        animateConfetti();
    }
}

function animateConfetti() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    // Update and draw all particles
    for (let i = 0; i < confettiParticles.length; i++) {
        confettiParticles[i].update();
        confettiParticles[i].draw();
    }
    
    // Remove particles that have fallen off screen
    confettiParticles = confettiParticles.filter(particle => particle.y <= confettiCanvas.height + 20);
    
    // Keep animating if there are particles OR more are pending
    if (confettiParticles.length > 0 || pendingParticles > 0) {
        animationId = requestAnimationFrame(animateConfetti);
    } else {
        animationId = null;
    }
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (raffleSection.classList.contains('hidden')) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
    } else if (e.code === 'Enter') {
        e.preventDefault();
        skipToNext();
    }
});

// ===== Initialize =====
console.log('🎰 Hyatt Staff Party Raffle App - AUTO MODE Loaded!');
console.log('📋 Upload staff list and prizes to begin.');
console.log('⌨️ Keyboard shortcuts: SPACE = Pause/Resume, ENTER = Draw Now');
