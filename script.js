/**
 * Ditch Speechify - Free TTS Reader
 * 
 * A completely free, open-source alternative to Speechify.
 * Why pay $139/year when you can run this locally for free?
 * 
 * Features:
 * - Natural text-to-speech using your browser's built-in voices
 * - Pause/Resume - remembers your position
 * - Double-click to start from any sentence
 * - PDF, Word, and TXT file support
 * - Speed and pitch controls
 * - Runs 100% locally - your data never leaves your computer
 * 
 * @author Nihal Veeramalla
 * @license MIT
 * @repository https://github.com/nihal-5/ditch-speechify
 */

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    fileUpload: document.getElementById('fileUpload'),
    fileInput: document.getElementById('fileInput'),
    textInput: document.getElementById('textInput'),
    voiceSelect: document.getElementById('voiceSelect'),
    speedSlider: document.getElementById('speedSlider'),
    pitchSlider: document.getElementById('pitchSlider'),
    playBtn: document.getElementById('playBtn'),
    stopBtn: document.getElementById('stopBtn'),
    statusMessage: document.getElementById('statusMessage'),
    speedValue: document.getElementById('speedValue'),
    pitchValue: document.getElementById('pitchValue'),
    clearBtn: document.getElementById('clearBtn')
};

// ============================================================================
// State Management
// ============================================================================

const state = {
    isPlaying: false,
    isPaused: false,
    sentences: [],
    currentIndex: 0,
    utterance: null
};

// ============================================================================
// Initialization
// ============================================================================

function init() {
    // Clear any stuck speech from previous sessions
    window.speechSynthesis.cancel();

    // Load voices when available
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Some browsers need a delay to load voices
    setTimeout(loadVoices, 100);

    // Set up all event listeners
    setupEventListeners();

    // Restore any saved text
    loadSavedText();
}

// ============================================================================
// Voice Management
// ============================================================================

/**
 * Load available voices and populate the dropdown.
 * Prioritizes high-quality voices (Siri, Samantha, etc.)
 */
function loadVoices() {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    elements.voiceSelect.innerHTML = '';

    // Priority order - best voices first
    const premiumVoices = [
        'Voice 4', 'Siri', 'System Voice', 'Samantha', 'Alex',
        'Ava', 'Allison', 'Tom', 'Susan', 'Karen', 'Daniel',
        'Google US English', 'Google UK English', 'Neural', 'Premium'
    ];

    // Sort voices by quality priority
    const sortedVoices = [...voices]
        .filter(v => v.lang.startsWith('en'))
        .sort((a, b) => {
            const aScore = premiumVoices.findIndex(p => a.name.includes(p));
            const bScore = premiumVoices.findIndex(p => b.name.includes(p));
            const aPriority = aScore === -1 ? 999 : aScore;
            const bPriority = bScore === -1 ? 999 : bScore;
            return aPriority - bPriority;
        });

    // Build dropdown options
    sortedVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;

        const isPremium = premiumVoices.some(p => voice.name.includes(p));
        option.textContent = isPremium
            ? `⭐ ${voice.name}`
            : voice.name;

        if (isPremium) {
            option.style.fontWeight = 'bold';
        }

        elements.voiceSelect.appendChild(option);
    });

    // Auto-select best available voice
    if (elements.voiceSelect.options.length > 0) {
        elements.voiceSelect.selectedIndex = 0;
    }
}

// ============================================================================
// Playback Controls
// ============================================================================

/**
 * Toggle between play/pause states
 */
function togglePlayback() {
    if (state.isPlaying) {
        pause();
    } else if (state.isPaused) {
        resume();
    } else {
        play();
    }
}

/**
 * Start reading from the beginning
 */
function play() {
    const text = elements.textInput.value.trim();
    if (!text) {
        showStatus('Please enter or paste some text first.', 'error');
        return;
    }

    // Split text into sentences
    state.sentences = splitIntoSentences(text);
    state.currentIndex = 0;

    state.isPlaying = true;
    state.isPaused = false;
    updateUI();

    showStatus(`Reading ${state.sentences.length} sentences...`);
    speakCurrentSentence();
}

/**
 * Resume from paused position
 */
function resume() {
    const text = elements.textInput.value.trim();
    if (!text) return;

    // Re-parse if sentences were lost
    if (state.sentences.length === 0) {
        state.sentences = splitIntoSentences(text);
    }

    state.isPlaying = true;
    state.isPaused = false;
    updateUI();

    showStatus(`Resuming from sentence ${state.currentIndex + 1}...`);
    speakCurrentSentence();
}

/**
 * Pause reading - remember position
 */
function pause() {
    state.isPlaying = false;
    state.isPaused = true;
    window.speechSynthesis.cancel();
    updateUI();
    showStatus(`Paused at sentence ${state.currentIndex + 1}. Click to resume.`);
}

/**
 * Stop reading - reset to beginning
 */
function stop() {
    state.isPlaying = false;
    state.isPaused = false;
    state.currentIndex = 0;
    window.speechSynthesis.cancel();
    updateUI();
    showStatus('Stopped. Click Play to start from beginning.');
}

/**
 * Start reading from the cursor position in text
 */
function startFromCursor() {
    const text = elements.textInput.value;
    const cursorPos = elements.textInput.selectionStart;

    if (!text.trim()) return;

    // Parse sentences
    state.sentences = splitIntoSentences(text);

    // Find which sentence contains the cursor
    let charCount = 0;
    state.currentIndex = 0;

    for (let i = 0; i < state.sentences.length; i++) {
        const sentenceStart = text.indexOf(state.sentences[i], charCount);
        const sentenceEnd = sentenceStart + state.sentences[i].length;

        if (cursorPos <= sentenceEnd) {
            state.currentIndex = i;
            break;
        }
        charCount = sentenceEnd;
    }

    state.isPlaying = true;
    state.isPaused = false;
    updateUI();
    showStatus(`Starting from sentence ${state.currentIndex + 1}...`);
    speakCurrentSentence();
}

// ============================================================================
// Speech Synthesis
// ============================================================================

/**
 * Speak the current sentence and queue the next one
 */
function speakCurrentSentence() {
    if (!state.isPlaying) return;

    // Check if we've finished all sentences
    if (state.currentIndex >= state.sentences.length) {
        state.isPlaying = false;
        state.isPaused = false;
        state.currentIndex = 0;
        updateUI();
        showStatus('✓ Finished reading!');
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const text = state.sentences[state.currentIndex];
    const utterance = new SpeechSynthesisUtterance(text);

    // Apply voice settings
    const voices = window.speechSynthesis.getVoices();
    const selectedVoice = voices.find(v => v.voiceURI === elements.voiceSelect.value);
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    // Apply speed and pitch
    utterance.rate = parseFloat(elements.speedSlider.value);
    utterance.pitch = 1.0 + (parseInt(elements.pitchSlider.value) / 10);

    // When sentence ends, move to next
    utterance.onend = () => {
        if (!state.isPlaying) return;
        state.currentIndex++;
        // Small pause between sentences for natural flow
        setTimeout(speakCurrentSentence, 350);
    };

    // Handle errors gracefully
    utterance.onerror = (event) => {
        // Ignore interruption errors (happens when we cancel manually)
        if (event.error === 'interrupted' || event.error === 'canceled') return;

        console.error('Speech error:', event.error);
        // Skip problematic sentence and continue
        if (state.isPlaying) {
            state.currentIndex++;
            setTimeout(speakCurrentSentence, 100);
        }
    };

    state.utterance = utterance;
    window.speechSynthesis.speak(utterance);
}

/**
 * Split text into readable sentences
 */
function splitIntoSentences(text) {
    // Match sentences ending with . ! ? or text without punctuation at end
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    return sentences
        .map(s => s.trim())
        .filter(s => s.length > 0);
}

// ============================================================================
// UI Updates
// ============================================================================

/**
 * Update button states and labels based on current state
 */
function updateUI() {
    const btnText = elements.playBtn.querySelector('.btn-text');
    const svg = elements.playBtn.querySelector('svg:not(.hidden)');

    if (state.isPlaying) {
        btnText.textContent = 'Pause';
        // Show pause icon
        elements.playBtn.querySelector('.play-icon')?.classList.add('hidden');
        elements.playBtn.querySelector('.pause-icon')?.classList.remove('hidden');
    } else {
        btnText.textContent = state.isPaused ? 'Resume' : 'Play';
        // Show play icon
        elements.playBtn.querySelector('.play-icon')?.classList.remove('hidden');
        elements.playBtn.querySelector('.pause-icon')?.classList.add('hidden');
    }
}

/**
 * Display a status message
 */
function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;

    // Auto-clear after 5 seconds
    setTimeout(() => {
        if (elements.statusMessage.textContent === message) {
            elements.statusMessage.textContent = '';
        }
    }, 5000);
}

// ============================================================================
// Event Listeners
// ============================================================================

function setupEventListeners() {
    // Playback controls
    elements.playBtn.addEventListener('click', togglePlayback);
    elements.stopBtn.addEventListener('click', stop);

    // Double-click to start from cursor position
    elements.textInput.addEventListener('dblclick', (e) => {
        e.preventDefault();
        startFromCursor();
    });

    // File upload - click
    elements.fileUpload.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // File upload - drag and drop
    elements.fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.fileUpload.style.borderColor = 'var(--primary)';
    });

    elements.fileUpload.addEventListener('dragleave', () => {
        elements.fileUpload.style.borderColor = '';
    });

    elements.fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.fileUpload.style.borderColor = '';
        if (e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // File input change
    elements.fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Slider updates with live preview
    elements.speedSlider.addEventListener('input', (e) => {
        elements.speedValue.textContent = `${e.target.value}x`;
        // If playing, restart current sentence with new speed
        if (state.isPlaying) {
            window.speechSynthesis.cancel();
            speakCurrentSentence();
        }
    });

    elements.pitchSlider.addEventListener('input', (e) => {
        elements.pitchValue.textContent = e.target.value;
        if (state.isPlaying) {
            window.speechSynthesis.cancel();
            speakCurrentSentence();
        }
    });

    // Text input changes
    elements.textInput.addEventListener('input', () => {
        saveText();
        elements.playBtn.disabled = elements.textInput.value.trim().length === 0;

        // Reset pause state if text changes
        if (state.isPaused) {
            state.isPaused = false;
            state.currentIndex = 0;
            state.sentences = [];
            updateUI();
        }
    });

    // Clear button
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', () => {
            elements.textInput.value = '';
            saveText();
            state.currentIndex = 0;
            state.sentences = [];
            state.isPaused = false;
            elements.playBtn.disabled = true;
            updateUI();
        });
    }
}

// ============================================================================
// File Handling
// ============================================================================

/**
 * Handle uploaded files (TXT, PDF, DOCX)
 */
async function handleFile(file) {
    showStatus(`Processing ${file.name}...`);

    try {
        const fileName = file.name.toLowerCase();

        // Plain text files - read directly
        if (fileName.endsWith('.txt')) {
            elements.textInput.value = await file.text();
            saveText();
            elements.playBtn.disabled = false;
            showStatus(`Loaded: ${file.name}`);
            return;
        }

        // PDF and Word files - use backend API
        const formData = new FormData();
        formData.append('file', file);

        const endpoint = fileName.endsWith('.docx') || fileName.endsWith('.doc')
            ? '/api/extract-docx'
            : '/api/extract-pdf';

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to extract text from file');
        }

        const data = await response.json();
        elements.textInput.value = data.text;
        saveText();
        elements.playBtn.disabled = false;
        showStatus(`Loaded: ${file.name}`);

    } catch (error) {
        console.error('File handling error:', error);
        showStatus('Error loading file. Try copy-pasting the text instead.', 'error');
    }
}

// ============================================================================
// Local Storage
// ============================================================================

/**
 * Save text to localStorage for persistence
 */
function saveText() {
    localStorage.setItem('ditch-speechify-text', elements.textInput.value);
}

/**
 * Load saved text from localStorage
 */
function loadSavedText() {
    const savedText = localStorage.getItem('ditch-speechify-text');
    if (savedText) {
        elements.textInput.value = savedText;
        elements.playBtn.disabled = savedText.trim().length === 0;
    }
}

// ============================================================================
// Start the app
// ============================================================================

init();
