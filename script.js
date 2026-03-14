// ===== Global State =====
let staffList = [];
let prizesList = [];
let winners = [];
let isDrawing = false;
let isPaused = false;
let autoDrawInterval = null;
let countdownInterval = null;
let drawIntervalTime = 3000;
let countdownTime = 0;
let raffleStarted = false;
let shuffleDuration = 2000;
let settingsPin = '';
let exportFileName = 'Raffle_Winners_Auto';
let showPrizePlaceholderWhenMissing = true;
const DEFAULT_EVENT_YEAR = 2026;
let eventYear = DEFAULT_EVENT_YEAR;
const POST_DRAW_DELAY_MS = 3000;

const STAFF_PHOTO_DIR = 'staff/staff_photos';
const PRIZE_PHOTO_DIR = 'prizes/prizes_photos';
const STAFF_DEFAULT_PHOTO = `${STAFF_PHOTO_DIR}/default.svg`;
const PRIZE_DEFAULT_PHOTO = `${PRIZE_PHOTO_DIR}/default.svg`;

const STAFF_HEADER_ALIASES = {
    id: ['id', 'staffid', 'employeeid', 'empid', 'number', 'no'],
    name: ['name', 'staffname', 'employee', 'employeename'],
    department: ['department', 'dept'],
    position: ['position', 'title', 'jobtitle', 'designation'],
    photo: ['photo', 'image', 'picture', 'filename']
};

const PRIZE_HEADER_ALIASES = {
    name: ['prize', 'prizename', 'name', 'item'],
    photo: ['photo', 'image', 'picture', 'filename'],
    category: ['category', 'round', 'group']
};

const WINNERS_VIRTUALIZATION_THRESHOLD = 150;
const WINNER_ITEM_ESTIMATED_HEIGHT = 84;
const WINNER_VIRTUAL_BUFFER = 8;

function normalizePhotoFileName(fileName) {
    if (!fileName) return '';
    return fileName.toString().split(/[\\/]/).pop().trim();
}

function getStaffPhotoPath(fileName) {
    const normalized = normalizePhotoFileName(fileName);
    return normalized ? `${STAFF_PHOTO_DIR}/${normalized}` : STAFF_DEFAULT_PHOTO;
}

function getPrizePhotoPath(fileName) {
    const normalized = normalizePhotoFileName(fileName);
    return normalized ? `${PRIZE_PHOTO_DIR}/${normalized}` : PRIZE_DEFAULT_PHOTO;
}

function normalizeHeaderName(value) {
    return (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function buildHeaderIndexMap(headerRow, aliases) {
    const indexMap = {};
    if (!headerRow || !Array.isArray(headerRow)) return indexMap;

    const normalizedToIndex = {};
    headerRow.forEach((cell, index) => {
        const normalized = normalizeHeaderName(cell);
        if (normalized && normalizedToIndex[normalized] === undefined) {
            normalizedToIndex[normalized] = index;
        }
    });

    Object.entries(aliases).forEach(([key, candidates]) => {
        const found = candidates.find((candidate) => normalizedToIndex[candidate] !== undefined);
        if (found !== undefined) {
            indexMap[key] = normalizedToIndex[found];
        }
    });

    return indexMap;
}

function toCellText(row, index) {
    if (!row || index === undefined || index === null) return '';
    const value = row[index];
    return value === undefined || value === null ? '' : value.toString().trim();
}

function createWinnerItemElement(winner, number, isLatest) {
    const item = document.createElement('div');
    item.className = `winner-item${isLatest ? ' latest' : ''}`;
    if (isLatest) {
        item.style.animationDelay = '0.1s';
    }

    const staffPhotoPath = getStaffPhotoPath(winner.photo);
    const prizePhotoName = normalizePhotoFileName(winner.prize && winner.prize.photo);
    const prizePhotoPath = getPrizePhotoPath(prizePhotoName);
    const prizeNameText = winner.prize && winner.prize.name ? winner.prize.name : (winner.prize || '');
    const shouldShowPrizeImage = showPrizePlaceholderWhenMissing || !!prizePhotoName;
    const prizeImageOnError = showPrizePlaceholderWhenMissing
        ? `this.src='${PRIZE_DEFAULT_PHOTO}'`
        : `this.style.display='none'`;
    const prizeImageHtml = shouldShowPrizeImage
        ? `<img src="${prizePhotoPath}" alt="prize" class="winner-item-prize-photo" onerror="${prizeImageOnError}">`
        : '';

    item.innerHTML = `
        <div class="winner-item-number">${number}</div>
        <img src="${staffPhotoPath}" alt="${winner.name}" class="winner-item-photo" 
             onerror="this.src='${STAFF_DEFAULT_PHOTO}'">
        <div class="winner-item-info">
            <div class="winner-item-name">${winner.name}</div>
            <div class="winner-item-dept">${winner.department} - ${winner.position}</div>
        </div>
        <div class="winner-item-prize"> ${prizeNameText}${prizeImageHtml}</div>
    `;

    return item;
}

function sanitizeEventYear(value) {
    const parsed = parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) {
        return DEFAULT_EVENT_YEAR;
    }
    return parsed;
}

function syncPrizePlaceholderToggleUI() {
    const uploadToggle = document.getElementById('show-prize-placeholder');
    const settingsToggle = document.getElementById('settings-show-prize-placeholder');
    if (uploadToggle) {
        uploadToggle.checked = showPrizePlaceholderWhenMissing;
    }
    if (settingsToggle) {
        settingsToggle.checked = showPrizePlaceholderWhenMissing;
    }
}

function popRandomItem(list) {
    if (!Array.isArray(list) || list.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * list.length);
    const lastIndex = list.length - 1;
    const selected = list[randomIndex];
    list[randomIndex] = list[lastIndex];
    list.pop();
    return selected;
}

const preloadedAssetUrls = new Set();

function preloadImage(src) {
    if (!src || preloadedAssetUrls.has(src)) return;
    const img = new Image();
    img.src = src;
    preloadedAssetUrls.add(src);
}

function preloadAudioById(audioId) {
    const audioEl = document.getElementById(audioId);
    if (audioEl) {
        audioEl.load();
    }
}

function preloadLikelyNextAssets() {
    const previewStaff = staffList.slice(0, 4);
    const previewPrizes = prizesList.slice(0, 4);

    previewStaff.forEach((staff) => {
        preloadImage(getStaffPhotoPath(staff.photo));
    });

    previewPrizes.forEach((prize) => {
        preloadImage(getPrizePhotoPath(prize.photo));
    });

    Object.values(PRIZE_SOUNDS).forEach(preloadAudioById);
    preloadAudioById('sound-default');
}

function updateEventYearUI() {
    const yearText = eventYear.toString();
    const titleEl = document.getElementById('event-title-text');
    if (titleEl) {
        titleEl.textContent = `🎉 Annual Staff Party ${yearText} 🎉`;
    }
    document.title = `Hyatt Annual Staff Party Raffle ${yearText} - Auto Draw`;

    const uploadYearInput = document.getElementById('event-year');
    if (uploadYearInput) {
        uploadYearInput.value = yearText;
    }

    const settingsYearInput = document.getElementById('settings-event-year');
    if (settingsYearInput) {
        settingsYearInput.value = yearText;
    }
}

// ===== Constant-time PIN comparison =====
function pinsMatch(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

// ===== Audio Configuration =====
// Prize amounts that trigger special sounds
const PRIZE_SOUNDS = {
    5000: 'sound-5000',
    10000: 'sound-10000',
    20000: 'sound-20000'
};

let soundEnabled = true;

// ===== Play Prize Sound =====
function playPrizeSound(prizeValue) {
    if (!soundEnabled) return;
    
    // Extract numeric value from prize string (handles formats like "5000", "$5,000", "5000 AED", etc.)
    const numericValue = parseInt(prizeValue.toString().replace(/[^0-9]/g, ''));
    
    let audioElement = null;
    
    // Check if this prize amount has a specific sound
    if (PRIZE_SOUNDS[numericValue]) {
        audioElement = document.getElementById(PRIZE_SOUNDS[numericValue]);
    }
    
    // Fallback to default sound if available
    if (!audioElement) {
        audioElement = document.getElementById('sound-default');
    }
    
    if (audioElement) {
        // Reset audio to beginning if already playing
        audioElement.currentTime = 0;
        
        // Play the sound
        audioElement.play().catch(error => {
            console.warn('Could not play prize sound:', error);
        });
    }
}

// ===== Stop All Prize Sounds =====
function stopAllSounds() {
    Object.values(PRIZE_SOUNDS).forEach(soundId => {
        const audio = document.getElementById(soundId);
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    const defaultSound = document.getElementById('sound-default');
    if (defaultSound) {
        defaultSound.pause();
        defaultSound.currentTime = 0;
    }
}

// ===== Toggle Sound =====
function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundBtn = document.getElementById('sound-toggle-btn');
    if (soundBtn) {
        soundBtn.textContent = soundEnabled ? '🔊 Sound On' : '🔇 Sound Off';
        soundBtn.classList.toggle('muted', !soundEnabled);
    }
    if (!soundEnabled) {
        stopAllSounds();
    }
}

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
        shuffleDuration,
        exportFileName,
        showPrizePlaceholderWhenMissing,
        eventYear,
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

function restoreRaffle(state) {
    staffList = state.staffList || [];
    prizesList = state.prizesList || [];
    winners = state.winners || [];
    drawIntervalTime = state.drawIntervalTime || 3000;
    shuffleDuration = state.shuffleDuration || 2000;
    exportFileName = state.exportFileName || 'Raffle_Winners_Auto';
    showPrizePlaceholderWhenMissing = state.showPrizePlaceholderWhenMissing !== false;
    eventYear = sanitizeEventYear(state.eventYear || DEFAULT_EVENT_YEAR);
    isPaused = true; // Always restore paused so user can review
    raffleStarted = true;

    updateEventYearUI();
    syncPrizePlaceholderToggleUI();
    
    // Hide upload, show raffle section
    uploadSection.classList.add('hidden');
    raffleSection.classList.remove('hidden');
    
    // Update stats
    updateStats();
    
    renderWinnersGrid();
    
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
const staffLoading = document.getElementById('staff-loading');
const prizesLoading = document.getElementById('prizes-loading');
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
const validationSummary = document.getElementById('validation-summary');
const validationSummaryBody = document.getElementById('validation-summary-body');
const recoveryBanner = document.getElementById('recovery-banner');
const recoveryBannerText = document.getElementById('recovery-banner-text');
const resumeSessionBtn = document.getElementById('resume-session-btn');
const startFreshBtn = document.getElementById('start-fresh-btn');
const statusChipsUpload = document.getElementById('status-chips-upload');
const statusChipsLive = document.getElementById('status-chips-live');
const appDialog = document.getElementById('app-dialog');
const appDialogOverlay = document.getElementById('app-dialog-overlay');
const appDialogTitle = document.getElementById('app-dialog-title');
const appDialogMessage = document.getElementById('app-dialog-message');
const appDialogCancelBtn = document.getElementById('app-dialog-cancel');
const appDialogOkBtn = document.getElementById('app-dialog-ok');
const winnerPhotoFallbackBadge = document.getElementById('winner-photo-fallback-badge');

let appDialogResolver = null;
let appDialogMode = 'alert';
let pendingRecoveredState = null;
let isRenderingWinnersGrid = false;
let winnersRenderScheduled = false;
let statusChipState = {
    parsing: false,
    pausedBySettings: false,
    recoveredSessionActive: false
};
let validationState = {
    staff: { uploaded: false, errors: [], warnings: [], loadedCount: 0 },
    prizes: { uploaded: false, errors: [], warnings: [], loadedCount: 0 }
};

function closeAppDialog(result) {
    if (!appDialog) return;
    appDialog.classList.add('hidden');
    if (appDialogResolver) {
        const resolve = appDialogResolver;
        appDialogResolver = null;
        resolve(result);
    }
}

function openAppDialog({ title, message, mode }) {
    if (!appDialog || !appDialogTitle || !appDialogMessage) {
        return Promise.resolve(mode === 'confirm' ? false : true);
    }

    appDialogMode = mode;
    appDialogTitle.textContent = title || 'Notice';
    appDialogMessage.textContent = message || '';
    appDialogCancelBtn.classList.toggle('hidden', mode !== 'confirm');
    appDialogOkBtn.textContent = mode === 'confirm' ? 'Confirm' : 'OK';
    appDialog.classList.remove('hidden');
    appDialogOkBtn.focus();

    return new Promise((resolve) => {
        appDialogResolver = resolve;
    });
}

function showStyledAlert(message, title = 'Notice') {
    return openAppDialog({ title, message, mode: 'alert' });
}

function showStyledConfirm(message, title = 'Please Confirm') {
    return openAppDialog({ title, message, mode: 'confirm' });
}

function renderStatusChips() {
    const chips = [];
    if (statusChipState.parsing) {
        chips.push({ text: 'Parsing file...', variant: 'info' });
    }
    if (statusChipState.pausedBySettings) {
        chips.push({ text: 'Paused by settings', variant: 'warning' });
    }
    if (statusChipState.recoveredSessionActive) {
        chips.push({ text: 'Recovered session active', variant: 'success' });
    }

    const html = chips.map((chip) => `<span class="status-chip ${chip.variant}">${chip.text}</span>`).join('');
    if (statusChipsUpload) {
        statusChipsUpload.innerHTML = html;
    }
    if (statusChipsLive) {
        statusChipsLive.innerHTML = html;
    }
}

function getValidationErrorCount() {
    return validationState.staff.errors.length + validationState.prizes.errors.length;
}

function renderValidationSummary() {
    if (!validationSummary || !validationSummaryBody) return;

    const staff = validationState.staff;
    const prizes = validationState.prizes;

    const lines = [];

    if (!staff.uploaded || !prizes.uploaded) {
        lines.push('Upload both staff and prizes files to validate data before starting.');
    }

    if (staff.uploaded) {
        lines.push(`Staff: ${staff.loadedCount} valid rows`);
        staff.errors.forEach((msg) => lines.push(`- ${msg}`));
    }

    if (prizes.uploaded) {
        lines.push(`Prizes: ${prizes.loadedCount} valid rows`);
        prizes.errors.forEach((msg) => lines.push(`- ${msg}`));
    }

    validationSummary.classList.toggle('has-errors', getValidationErrorCount() > 0);
    validationSummary.classList.toggle('valid', staff.uploaded && prizes.uploaded && getValidationErrorCount() === 0);
    validationSummaryBody.textContent = lines.join('\n');
}

function hideRecoveryBanner() {
    if (recoveryBanner) {
        recoveryBanner.classList.add('hidden');
    }
}

function showRecoveryBanner(state) {
    if (!recoveryBanner || !recoveryBannerText) return;
    const timeSaved = new Date(state.timestamp).toLocaleString();
    const winnersCount = state.winners?.length || 0;
    const prizesLeft = state.prizesList?.length || 0;
    recoveryBannerText.textContent = `Recovered saved raffle from ${timeSaved}.\nWinners drawn: ${winnersCount} | Prizes remaining: ${prizesLeft}`;
    recoveryBanner.classList.remove('hidden');
}

if (appDialogOverlay) {
    appDialogOverlay.addEventListener('click', () => {
        closeAppDialog(appDialogMode === 'confirm' ? false : true);
    });
}

if (appDialogCancelBtn) {
    appDialogCancelBtn.addEventListener('click', () => closeAppDialog(false));
}

if (appDialogOkBtn) {
    appDialogOkBtn.addEventListener('click', () => closeAppDialog(true));
}

// ===== File Upload Handlers =====
staffFileInput.addEventListener('change', (e) => handleFileUpload(e, 'staff'));
prizesFileInput.addEventListener('change', (e) => handleFileUpload(e, 'prizes'));

// ===== Check for Saved State on Page Load =====
document.addEventListener('DOMContentLoaded', async () => {
    const pinInput = document.getElementById('setup-pin');
    if (pinInput && !pinInput.value) {
        pinInput.value = '1111';
    }

    const uploadYearInput = document.getElementById('event-year');
    const settingsYearInput = document.getElementById('settings-event-year');
    const uploadPlaceholderToggle = document.getElementById('show-prize-placeholder');
    const settingsPlaceholderToggle = document.getElementById('settings-show-prize-placeholder');
    updateEventYearUI();
    syncPrizePlaceholderToggleUI();

    if (uploadPlaceholderToggle) {
        uploadPlaceholderToggle.addEventListener('change', () => {
            showPrizePlaceholderWhenMissing = !!uploadPlaceholderToggle.checked;
            if (settingsPlaceholderToggle) {
                settingsPlaceholderToggle.checked = showPrizePlaceholderWhenMissing;
            }
        });
    }

    if (settingsPlaceholderToggle) {
        settingsPlaceholderToggle.addEventListener('change', () => {
            showPrizePlaceholderWhenMissing = !!settingsPlaceholderToggle.checked;
            if (uploadPlaceholderToggle) {
                uploadPlaceholderToggle.checked = showPrizePlaceholderWhenMissing;
            }
        });
    }

    if (uploadYearInput) {
        uploadYearInput.addEventListener('change', () => {
            eventYear = sanitizeEventYear(uploadYearInput.value);
            updateEventYearUI();
        });
    }

    if (settingsYearInput) {
        settingsYearInput.addEventListener('change', () => {
            eventYear = sanitizeEventYear(settingsYearInput.value);
            updateEventYearUI();
        });
    }

    const savedState = loadState();
    if (savedState && savedState.raffleStarted && (savedState.prizesList?.length > 0 || savedState.winners?.length > 0)) {
        pendingRecoveredState = savedState;
        showRecoveryBanner(savedState);
    }

    renderValidationSummary();
    renderStatusChips();

    if (winnersGrid) {
        winnersGrid.addEventListener('scroll', () => {
            if (winners.length > WINNERS_VIRTUALIZATION_THRESHOLD) {
                scheduleWinnersGridRender();
            }
        });
    }
});

if (resumeSessionBtn) {
    resumeSessionBtn.addEventListener('click', () => {
        if (!pendingRecoveredState) return;
        const stateToRestore = pendingRecoveredState;
        pendingRecoveredState = null;
        statusChipState.recoveredSessionActive = true;
        renderStatusChips();
        hideRecoveryBanner();
        restoreRaffle(stateToRestore);
    });
}

if (startFreshBtn) {
    startFreshBtn.addEventListener('click', () => {
        pendingRecoveredState = null;
        statusChipState.recoveredSessionActive = false;
        renderStatusChips();
        clearState();
        hideRecoveryBanner();
    });
}

function setUploadLoading(type, isLoading) {
    const loadingEl = type === 'staff' ? staffLoading : prizesLoading;
    const countEl = type === 'staff' ? staffCount : prizesCount;
    const uploadBox = document.getElementById(type === 'staff' ? 'staff-upload' : 'prizes-upload');
    if (!loadingEl || !countEl || !uploadBox) return;

    loadingEl.classList.toggle('hidden', !isLoading);
    statusChipState.parsing = isLoading;
    renderStatusChips();
    if (isLoading) {
        countEl.textContent = '';
        uploadBox.classList.remove('loaded');
        if (type === 'staff') {
            validationState.staff = { uploaded: false, errors: [], warnings: [], loadedCount: 0 };
        } else {
            validationState.prizes = { uploaded: false, errors: [], warnings: [], loadedCount: 0 };
        }
        renderValidationSummary();
        checkReadyToStart();
    }
}

function handleFileUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    const allowedExtensions = ['csv', 'xlsx', 'xls'];
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(extension)) {
        showStyledAlert('Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls).', 'Invalid File Type');
        event.target.value = '';
        return;
    }

    setUploadLoading(type, true);

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const isCsv = extension === 'csv';
            const workbook = isCsv
                ? XLSX.read(e.target.result, { type: 'string' })
                : XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
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
            showStyledAlert('Error reading file. Please make sure it is a valid CSV or Excel file.', 'File Read Error');
            console.error(error);
        } finally {
            setUploadLoading(type, false);
        }
    };
    reader.onerror = () => {
        setUploadLoading(type, false);
        showStyledAlert('Error reading file. Please try again.', 'File Read Error');
    };
    if (extension === 'csv') {
        reader.readAsText(file);
    } else {
        reader.readAsArrayBuffer(file);
    }
}

function parseStaffData(data) {
    staffList = [];
    validationState.staff = { uploaded: true, errors: [], warnings: [], loadedCount: 0 };

    if (!data || data.length === 0 || !Array.isArray(data[0])) {
        validationState.staff.errors.push('Staff file is empty or missing a header row.');
        return;
    }

    const headerMap = buildHeaderIndexMap(data[0], STAFF_HEADER_ALIASES);
    if (headerMap.id === undefined || headerMap.name === undefined) {
        validationState.staff.errors.push('Staff headers must include ID and Name (flexible aliases are supported).');
        return;
    }

    const seenIds = new Set();
    const duplicateIds = new Set();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const id = toCellText(row, headerMap.id);
        const name = toCellText(row, headerMap.name);
        const department = toCellText(row, headerMap.department);
        const position = toCellText(row, headerMap.position);
        const photo = toCellText(row, headerMap.photo) || 'default.svg';

        if (!id && !name && !department && !position) {
            continue;
        }

        if (!id || !name) {
            validationState.staff.errors.push(`Staff row ${i + 1} is missing required ID or Name.`);
            continue;
        }

        if (seenIds.has(id)) {
            duplicateIds.add(id);
            continue;
        }

        seenIds.add(id);
        staffList.push({ id, name, department, position, photo });
    }

    if (duplicateIds.size > 0) {
        validationState.staff.errors.push(`Duplicate staff IDs found: ${Array.from(duplicateIds).join(', ')}`);
    }

    if (staffList.length === 0) {
        validationState.staff.errors.push('No valid staff rows were found.');
    }

    validationState.staff.loadedCount = staffList.length;
}

function parsePrizesData(data) {
    prizesList = [];
    validationState.prizes = { uploaded: true, errors: [], warnings: [], loadedCount: 0 };

    if (!data || data.length === 0 || !Array.isArray(data[0])) {
        validationState.prizes.errors.push('Prizes file is empty or missing a header row.');
        return;
    }

    const headerMap = buildHeaderIndexMap(data[0], PRIZE_HEADER_ALIASES);
    if (headerMap.name === undefined) {
        validationState.prizes.errors.push('Prizes headers must include Prize/Name (flexible aliases are supported).');
        return;
    }

    let emptyPrizeRows = 0;

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const name = toCellText(row, headerMap.name);
        const photo = toCellText(row, headerMap.photo);
        const category = toCellText(row, headerMap.category);

        if (!name && !photo && !category) {
            continue;
        }

        if (!name) {
            emptyPrizeRows++;
            continue;
        }

        prizesList.push({ name, photo, category });
    }

    if (emptyPrizeRows > 0) {
        validationState.prizes.errors.push(`${emptyPrizeRows} prize row(s) are empty or missing prize name.`);
    }

    if (prizesList.length === 0) {
        validationState.prizes.errors.push('No valid prize rows were found.');
    }

    validationState.prizes.loadedCount = prizesList.length;
}

function checkReadyToStart() {
    renderValidationSummary();
    const hasErrors = getValidationErrorCount() > 0;
    startBtn.disabled = !(staffList.length > 0 && prizesList.length > 0 && !hasErrors);
}

// ===== Start Raffle =====
function startRaffle() {
    const yearInput = document.getElementById('event-year');
    eventYear = sanitizeEventYear(yearInput ? yearInput.value : DEFAULT_EVENT_YEAR);
    updateEventYearUI();

    // Get interval and shuffle duration from inputs
    const intervalVal = parseFloat(document.getElementById('draw-interval').value);
    if (!isNaN(intervalVal) && intervalVal > 0 && intervalVal <= 300) drawIntervalTime = Math.round(intervalVal * 1000);
    const shuffleVal = parseFloat(document.getElementById('shuffle-duration').value);
    if (!isNaN(shuffleVal) && shuffleVal > 0 && shuffleVal <= 30) shuffleDuration = Math.round(shuffleVal * 1000);
    const pin = document.getElementById('setup-pin');
    settingsPin = (pin && pin.value.trim()) ? pin.value.trim() : '1111';
    const placeholderToggle = document.getElementById('show-prize-placeholder');
    showPrizePlaceholderWhenMissing = placeholderToggle ? !!placeholderToggle.checked : true;
    syncPrizePlaceholderToggleUI();
    raffleStarted = true;
    
    uploadSection.classList.add('hidden');
    raffleSection.classList.remove('hidden');
    updateStats();
    
    // Save initial state
    saveState();

    // Warm up likely assets to reduce reveal flicker
    preloadLikelyNextAssets();
    
    // Start auto draw after a short delay
    setTimeout(() => {
        startAutoDraw();
    }, 1000);
}

function startAutoDraw() {
    if (prizesList.length === 0) return;
    
    // Perform first draw immediately
    draw().then(() => {
        // Set up interval for subsequent draws after winner reveal delay (if any)
        setTimeout(() => {
            scheduleNextDraw();
        }, POST_DRAW_DELAY_MS);
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
                setTimeout(() => {
                    scheduleNextDraw();
                }, POST_DRAW_DELAY_MS);
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
        statusChipState.pausedBySettings = false;
        renderStatusChips();
        pauseText.textContent = '⏸️ Pause';
        pauseBtn.classList.remove('paused');
        autoStatus.classList.remove('paused');
        autoStatus.querySelector('.status-text').textContent = 'Auto Draw Active';
        scheduleNextDraw();
    }
}

// ===== Reset Raffle (Start Fresh) - now opens settings modal =====
function resetRaffle() {
    openSettings();
}

// ===== Skip to Next Draw =====
function skipToNext() {
    if (isDrawing || prizesList.length === 0) return;
    
    clearInterval(countdownInterval);
    clearTimeout(autoDrawInterval);
    
    draw().then(() => {
        if (prizesList.length > 0 && !isPaused) {
            setTimeout(() => {
                scheduleNextDraw();
            }, POST_DRAW_DELAY_MS);
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
    const duration = shuffleDuration;
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

    // Select and remove in O(1) average-time by swap-and-pop
    const winner = popRandomItem(staffList);
    const prize = popRandomItem(prizesList);
    if (!winner || !prize) {
        isDrawing = false;
        pauseBtn.disabled = false;
        skipBtn.disabled = false;
        return Promise.resolve();
    }

    // Add to winners
    winners.push({ ...winner, prize });
    
    // Save state after each winner
    saveState();

    // Show winner
    slotMachine.classList.add('hidden');
    displayWinner(winner, prize);

    // Preload upcoming likely assets for smoother next draw
    preloadLikelyNextAssets();
    
    // Play prize sound based on prize value
    playPrizeSound(prize.name);
    
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
            
            // Auto-export winners after completion
            setTimeout(() => {
                exportWinners();
            }, 2000);
        }, 2000);
    }
    
    isDrawing = false;
    pauseBtn.disabled = false;
    skipBtn.disabled = false;
}

function displayWinner(winner, prize) {
    const photoPath = getStaffPhotoPath(winner.photo);
    const isStaffDefaultFromData = photoPath === STAFF_DEFAULT_PHOTO;
    if (winnerPhotoFallbackBadge) {
        winnerPhotoFallbackBadge.classList.toggle('hidden', !isStaffDefaultFromData);
    }
    winnerPhoto.src = photoPath;
    winnerPhoto.onload = () => {
        if (winnerPhotoFallbackBadge && photoPath !== STAFF_DEFAULT_PHOTO) {
            winnerPhotoFallbackBadge.classList.add('hidden');
        }
    };
    winnerPhoto.onerror = () => {
        winnerPhoto.src = STAFF_DEFAULT_PHOTO;
        if (winnerPhotoFallbackBadge) {
            winnerPhotoFallbackBadge.classList.remove('hidden');
        }
    };
    
    winnerName.textContent = winner.name;
    winnerPosition.textContent = winner.position;
    winnerDepartment.textContent = winner.department;
    prizeName.textContent = prize.name;
    
    // Show prize photo if exists
    const prizePhotoEl = document.getElementById('prize-photo');
    if (prizePhotoEl) {
        const prizePhotoName = normalizePhotoFileName(prize.photo);
        const shouldShowPrizeImage = showPrizePlaceholderWhenMissing || !!prizePhotoName;
        winnerCard.classList.toggle('no-prize-image', !shouldShowPrizeImage);
        if (!shouldShowPrizeImage) {
            prizePhotoEl.src = '';
            prizePhotoEl.style.display = 'none';
            winnerCard.classList.remove('hidden');
            return;
        }

        const prizePhotoPath = getPrizePhotoPath(prizePhotoName);
        prizePhotoEl.src = prizePhotoPath;
        prizePhotoEl.style.display = 'block';
        prizePhotoEl.onload = null;
        prizePhotoEl.onerror = () => {
            if (showPrizePlaceholderWhenMissing) {
                prizePhotoEl.src = PRIZE_DEFAULT_PHOTO;
                winnerCard.classList.remove('no-prize-image');
            } else {
                prizePhotoEl.style.display = 'none';
                winnerCard.classList.add('no-prize-image');
            }
        };
    }
    
    winnerCard.classList.remove('hidden');
}

function renderWinnersGrid() {
    if (!winnersGrid) return;
    if (isRenderingWinnersGrid) return;

    isRenderingWinnersGrid = true;

    try {
        const emptyState = document.getElementById('empty-state');
        if (winners.length === 0) {
            winnersGrid.innerHTML = '';
            if (emptyState) {
                emptyState.style.display = 'flex';
                winnersGrid.appendChild(emptyState);
            }
            return;
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        const total = winners.length;
        const useVirtualization = total > WINNERS_VIRTUALIZATION_THRESHOLD;

        winnersGrid.innerHTML = '';

        if (!useVirtualization) {
            for (let displayIndex = 0; displayIndex < total; displayIndex++) {
                const realIndex = total - 1 - displayIndex;
                const winner = winners[realIndex];
                const number = realIndex + 1;
                winnersGrid.appendChild(createWinnerItemElement(winner, number, displayIndex === 0));
            }
            return;
        }

        const viewportHeight = winnersGrid.clientHeight || 400;
        const scrollTop = winnersGrid.scrollTop;
        const startIndex = Math.max(0, Math.floor(scrollTop / WINNER_ITEM_ESTIMATED_HEIGHT) - WINNER_VIRTUAL_BUFFER);
        const visibleCount = Math.ceil(viewportHeight / WINNER_ITEM_ESTIMATED_HEIGHT) + WINNER_VIRTUAL_BUFFER * 2;
        const endIndex = Math.min(total, startIndex + visibleCount);

        const topSpacer = document.createElement('div');
        topSpacer.style.height = `${startIndex * WINNER_ITEM_ESTIMATED_HEIGHT}px`;
        winnersGrid.appendChild(topSpacer);

        for (let displayIndex = startIndex; displayIndex < endIndex; displayIndex++) {
            const realIndex = total - 1 - displayIndex;
            const winner = winners[realIndex];
            const number = realIndex + 1;
            winnersGrid.appendChild(createWinnerItemElement(winner, number, displayIndex === 0));
        }

        const bottomSpacer = document.createElement('div');
        bottomSpacer.style.height = `${Math.max(0, (total - endIndex) * WINNER_ITEM_ESTIMATED_HEIGHT)}px`;
        winnersGrid.appendChild(bottomSpacer);
    } finally {
        isRenderingWinnersGrid = false;
    }
}

function scheduleWinnersGridRender() {
    if (winnersRenderScheduled) return;
    winnersRenderScheduled = true;
    requestAnimationFrame(() => {
        winnersRenderScheduled = false;
        renderWinnersGrid();
    });
}

function addToWinnersGrid() {
    if (winnersGrid) {
        winnersGrid.scrollTop = 0;
    }
    renderWinnersGrid();
}

// ===== Export Winners =====
function exportWinners() {
    const data = winners.map((w, i) => ({
        '#': i + 1,
        'ID': w.id,
        'Name': w.name,
        'Department': w.department,
        'Position': w.position,
        'Prize': w.prize.name,
        'Category': w.prize.category || ''
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
        { wch: 30 },  // Prize
        { wch: 20 }   // Category
    ];
    
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
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

// ===== Settings Modal =====
function openSettings() {
    if (!raffleSection.classList.contains('hidden') && raffleStarted && !isPaused) {
        statusChipState.pausedBySettings = true;
        renderStatusChips();
        togglePause();
    }
    document.getElementById('settings-modal').classList.remove('hidden');
    document.getElementById('settings-event-year').value = eventYear;
    document.getElementById('settings-draw-interval').value = drawIntervalTime / 1000;
    document.getElementById('settings-shuffle-duration').value = shuffleDuration / 1000;
    document.getElementById('settings-export-filename').value = exportFileName;
    syncPrizePlaceholderToggleUI();
}

function closeSettings() {
    document.getElementById('settings-modal').classList.add('hidden');
}

function saveSettings() {
    const newEventYear = sanitizeEventYear(document.getElementById('settings-event-year').value);
    eventYear = newEventYear;

    const newInterval = parseFloat(document.getElementById('settings-draw-interval').value);
    if (!isNaN(newInterval) && newInterval > 0 && newInterval <= 300) {
        drawIntervalTime = Math.round(newInterval * 1000);
    }
    const newShuffle = parseFloat(document.getElementById('settings-shuffle-duration').value);
    if (!isNaN(newShuffle) && newShuffle > 0 && newShuffle <= 30) {
        shuffleDuration = Math.round(newShuffle * 1000);
    }
    const newExport = document.getElementById('settings-export-filename').value.trim();
    if (newExport) exportFileName = newExport;
    const settingsPlaceholderToggle = document.getElementById('settings-show-prize-placeholder');
    showPrizePlaceholderWhenMissing = settingsPlaceholderToggle ? !!settingsPlaceholderToggle.checked : true;
    syncPrizePlaceholderToggleUI();

    const latestWinner = winners[winners.length - 1];
    if (latestWinner && winnerCard && !winnerCard.classList.contains('hidden')) {
        displayWinner(latestWinner, latestWinner.prize);
    }
    renderWinnersGrid();
    updateEventYearUI();
    saveState();
    closeSettings();
}

async function resetRaffleWithPin() {
    const pin = document.getElementById('reset-pin-input').value;
    if (pinsMatch(pin, settingsPin)) {
        const confirmed = await showStyledConfirm(
            'Are you sure you want to reset? All progress will be lost.',
            'Confirm Reset'
        );
        if (confirmed) {
            clearState();
            closeSettings();
            location.reload();
        }
    } else {
        await showStyledAlert('Incorrect PIN. Reset cancelled.', 'Incorrect PIN');
    }
    document.getElementById('reset-pin-input').value = '';
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (appDialog && !appDialog.classList.contains('hidden')) {
        if (e.code === 'Escape') {
            e.preventDefault();
            closeAppDialog(appDialogMode === 'confirm' ? false : true);
            return;
        }
        if (e.code === 'Enter') {
            e.preventDefault();
            closeAppDialog(true);
            return;
        }
    }

    if (e.code === 'Escape') {
        closeSettings();
        return;
    }
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
