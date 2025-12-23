/**
 * Ditch Speechify - Free TTS Reader
 * 
 * A completely free, open-source alternative to Speechify.
 * Why pay $139/year when you can run this locally for free?
 * 
 * Features:
 * - Natural text-to-speech using your browser's built-in voices
 * - Piper TTS integration for high-quality neural voices
 * - Voice training capabilities
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
    // Tab navigation
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    subTabBtns: document.querySelectorAll('.sub-tab-btn'),
    subTabContents: document.querySelectorAll('.sub-tab-content'),
    
    // Browser TTS elements
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
    clearBtn: document.getElementById('clearBtn'),
    
    // Piper TTS elements
    piperStatusBanner: document.getElementById('piperStatusBanner'),
    piperVoiceSelect: document.getElementById('piperVoiceSelect'),
    piperTextInput: document.getElementById('piperTextInput'),
    piperLengthScale: document.getElementById('piperLengthScale'),
    piperNoiseScale: document.getElementById('piperNoiseScale'),
    piperNoiseWScale: document.getElementById('piperNoiseWScale'),
    lengthScaleValue: document.getElementById('lengthScaleValue'),
    noiseScaleValue: document.getElementById('noiseScaleValue'),
    noiseWScaleValue: document.getElementById('noiseWScaleValue'),
    piperSynthesizeBtn: document.getElementById('piperSynthesizeBtn'),
    piperAudioOutput: document.getElementById('piperAudioOutput'),
    piperAudioPlayer: document.getElementById('piperAudioPlayer'),
    piperDownloadBtn: document.getElementById('piperDownloadBtn'),
    piperStatusMessage: document.getElementById('piperStatusMessage'),
    
    // Voice Library elements
    voiceLanguageFilter: document.getElementById('voiceLanguageFilter'),
    voiceQualityFilter: document.getElementById('voiceQualityFilter'),
    refreshVoicesBtn: document.getElementById('refreshVoicesBtn'),
    downloadedVoicesList: document.getElementById('downloadedVoicesList'),
    availableVoicesList: document.getElementById('availableVoicesList'),
    
    // Training elements
    trainingUploadZone: document.getElementById('trainingUploadZone'),
    trainingFileInput: document.getElementById('trainingFileInput'),
    uploadedFilesList: document.getElementById('uploadedFilesList'),
    transcriptEditor: document.getElementById('transcriptEditor'),
    trainingVoiceName: document.getElementById('trainingVoiceName'),
    trainingLanguage: document.getElementById('trainingLanguage'),
    trainingSampleRate: document.getElementById('trainingSampleRate'),
    trainingBatchSize: document.getElementById('trainingBatchSize'),
    trainingCheckpoint: document.getElementById('trainingCheckpoint'),
    uploadTrainingDataBtn: document.getElementById('uploadTrainingDataBtn'),
    startTrainingBtn: document.getElementById('startTrainingBtn'),
    trainingProgress: document.getElementById('trainingProgress'),
    trainingProgressFill: document.getElementById('trainingProgressFill'),
    trainingLogOutput: document.getElementById('trainingLogOutput'),
    stopTrainingBtn: document.getElementById('stopTrainingBtn'),
    exportModelName: document.getElementById('exportModelName'),
    exportSessionSelect: document.getElementById('exportSessionSelect'),
    exportModelBtn: document.getElementById('exportModelBtn')
};

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Escape string for use in JavaScript string literals
 */
function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/"/g, '\\"')
              .replace(/\n/g, '\\n')
              .replace(/\r/g, '\\r');
}

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

// Piper TTS state
const piperState = {
    available: false,
    localVoices: [],
    availableVoices: [],
    uploadedFiles: [],
    transcripts: {},
    currentSessionId: null,
    lastAudioBlob: null
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
    setupTabNavigation();
    setupPiperEventListeners();

    // Restore any saved text
    loadSavedText();
    
    // Check Piper TTS status
    checkPiperStatus();
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
// Tab Navigation
// ============================================================================

function setupTabNavigation() {
    // Main tab navigation
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update button states
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content visibility
            elements.tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
            
            // Load Piper data when switching to Piper tab
            if (tabId === 'piper-tts' && piperState.available) {
                loadPiperVoices();
                loadTrainingSessions();
            }
        });
    });
    
    // Sub-tab navigation (Piper)
    elements.subTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subTabId = btn.dataset.subtab;
            
            // Update button states
            elements.subTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content visibility
            elements.subTabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === subTabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// ============================================================================
// Piper TTS Functions
// ============================================================================

/**
 * Check if Piper TTS is available
 */
async function checkPiperStatus() {
    try {
        const response = await fetch('/api/piper/status');
        const data = await response.json();
        
        piperState.available = data.available;
        
        const banner = elements.piperStatusBanner;
        const statusText = banner.querySelector('.status-text');
        
        if (data.available) {
            banner.classList.add('online');
            banner.classList.remove('offline');
            statusText.textContent = 'Piper TTS is ready';
            loadPiperVoices();
        } else {
            banner.classList.add('offline');
            banner.classList.remove('online');
            statusText.textContent = 'Piper TTS not installed. Install with: pip install piper-tts';
        }
    } catch (error) {
        const banner = elements.piperStatusBanner;
        const statusText = banner.querySelector('.status-text');
        banner.classList.add('offline');
        statusText.textContent = 'Cannot connect to server. Make sure the server is running.';
    }
}

/**
 * Load Piper voices from server
 */
async function loadPiperVoices() {
    try {
        const response = await fetch('/api/piper/voices');
        const data = await response.json();
        
        piperState.localVoices = data.local_voices || [];
        piperState.availableVoices = data.available_voices || [];
        
        updatePiperVoiceSelect();
        renderVoiceLibrary();
    } catch (error) {
        showPiperStatus('Failed to load voices: ' + error.message, 'error');
    }
}

/**
 * Update the voice select dropdown for synthesis
 */
function updatePiperVoiceSelect() {
    const select = elements.piperVoiceSelect;
    select.innerHTML = '<option value="">-- Select a downloaded voice --</option>';
    
    piperState.localVoices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = voice.name;
        select.appendChild(option);
    });
}

/**
 * Render the voice library UI
 */
function renderVoiceLibrary() {
    const languageFilter = elements.voiceLanguageFilter.value;
    const qualityFilter = elements.voiceQualityFilter.value;
    
    // Render downloaded voices
    const downloadedContainer = elements.downloadedVoicesList;
    if (piperState.localVoices.length === 0) {
        downloadedContainer.innerHTML = '<p class="empty-message">No voices downloaded yet.</p>';
    } else {
        downloadedContainer.innerHTML = piperState.localVoices.map(voice => `
            <div class="voice-card downloaded">
                <div class="voice-card-header">
                    <span class="voice-card-name">${escapeHtml(voice.name)}</span>
                    <span class="voice-card-badge">Downloaded</span>
                </div>
                <div class="voice-card-actions">
                    <button class="btn-secondary" onclick="deleteVoice('${escapeJsString(voice.name)}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    
    // Filter and render available voices
    let filteredVoices = piperState.availableVoices.filter(v => !v.downloaded);
    
    if (languageFilter) {
        filteredVoices = filteredVoices.filter(v => v.name.startsWith(languageFilter));
    }
    
    if (qualityFilter) {
        filteredVoices = filteredVoices.filter(v => v.name.includes(qualityFilter));
    }
    
    const availableContainer = elements.availableVoicesList;
    if (filteredVoices.length === 0) {
        availableContainer.innerHTML = '<p class="empty-message">No matching voices found.</p>';
    } else {
        availableContainer.innerHTML = filteredVoices.slice(0, 50).map(voice => `
            <div class="voice-card">
                <div class="voice-card-header">
                    <span class="voice-card-name">${escapeHtml(voice.name)}</span>
                </div>
                <div class="voice-card-info">
                    ${escapeHtml(voice.language || 'Unknown language')} | ${escapeHtml(voice.quality || 'unknown')} quality
                </div>
                <div class="voice-card-actions">
                    <button class="btn-primary" onclick="downloadVoice('${escapeJsString(voice.name)}')">Download</button>
                </div>
            </div>
        `).join('');
        
        if (filteredVoices.length > 50) {
            availableContainer.innerHTML += `<p class="help-text">Showing 50 of ${filteredVoices.length} voices. Use filters to narrow down.</p>`;
        }
    }
}

/**
 * Download a voice from HuggingFace
 */
async function downloadVoice(voiceName) {
    showPiperStatus(`Downloading ${voiceName}...`);
    
    try {
        const formData = new FormData();
        formData.append('voice_name', voiceName);
        
        const response = await fetch('/api/piper/download-voice', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Download failed');
        }
        
        showPiperStatus(`Successfully downloaded ${voiceName}`, 'success');
        loadPiperVoices();
    } catch (error) {
        showPiperStatus('Download failed: ' + error.message, 'error');
    }
}

/**
 * Delete a downloaded voice
 */
async function deleteVoice(voiceName) {
    if (!confirm(`Are you sure you want to delete ${voiceName}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/piper/voice/${voiceName}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Delete failed');
        }
        
        showPiperStatus(`Deleted ${voiceName}`, 'success');
        loadPiperVoices();
    } catch (error) {
        showPiperStatus('Delete failed: ' + error.message, 'error');
    }
}

/**
 * Synthesize speech using Piper TTS
 */
async function synthesizePiperSpeech() {
    const voice = elements.piperVoiceSelect.value;
    const text = elements.piperTextInput.value.trim();
    
    if (!voice) {
        showPiperStatus('Please select a voice', 'error');
        return;
    }
    
    if (!text) {
        showPiperStatus('Please enter text to synthesize', 'error');
        return;
    }
    
    showPiperStatus('Synthesizing speech...');
    elements.piperSynthesizeBtn.disabled = true;
    
    try {
        const response = await fetch('/api/piper/synthesize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: voice,
                length_scale: parseFloat(elements.piperLengthScale.value),
                noise_scale: parseFloat(elements.piperNoiseScale.value),
                noise_w_scale: parseFloat(elements.piperNoiseWScale.value)
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Synthesis failed');
        }
        
        const blob = await response.blob();
        piperState.lastAudioBlob = blob;
        
        const audioUrl = URL.createObjectURL(blob);
        elements.piperAudioPlayer.src = audioUrl;
        elements.piperAudioOutput.classList.remove('hidden');
        elements.piperAudioPlayer.play();
        
        showPiperStatus('Synthesis complete!', 'success');
    } catch (error) {
        showPiperStatus('Synthesis failed: ' + error.message, 'error');
    } finally {
        elements.piperSynthesizeBtn.disabled = false;
    }
}

/**
 * Download the synthesized audio
 */
function downloadPiperAudio() {
    if (!piperState.lastAudioBlob) {
        return;
    }
    
    const url = URL.createObjectURL(piperState.lastAudioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'piper_output.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Show Piper status message
 */
function showPiperStatus(message, type = 'info') {
    elements.piperStatusMessage.textContent = message;
    elements.piperStatusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
        if (elements.piperStatusMessage.textContent === message) {
            elements.piperStatusMessage.textContent = '';
        }
    }, 5000);
}

// ============================================================================
// Training Functions
// ============================================================================

/**
 * Handle training file upload
 */
function handleTrainingFileUpload(files) {
    for (const file of files) {
        if (!file.name.match(/\.(mp3|wav)$/i)) {
            continue;
        }
        
        // Check if file already uploaded
        if (piperState.uploadedFiles.some(f => f.name === file.name)) {
            continue;
        }
        
        piperState.uploadedFiles.push(file);
        
        // Initialize transcript
        const baseName = file.name.replace(/\.(mp3|wav)$/i, '');
        piperState.transcripts[baseName] = '';
    }
    
    renderUploadedFiles();
    renderTranscriptEditor();
}

/**
 * Remove an uploaded file
 */
function removeUploadedFile(fileName) {
    piperState.uploadedFiles = piperState.uploadedFiles.filter(f => f.name !== fileName);
    const baseName = fileName.replace(/\.(mp3|wav)$/i, '');
    delete piperState.transcripts[baseName];
    
    renderUploadedFiles();
    renderTranscriptEditor();
}

/**
 * Render uploaded files list
 */
function renderUploadedFiles() {
    const container = elements.uploadedFilesList;
    
    if (piperState.uploadedFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = piperState.uploadedFiles.map(file => `
        <div class="uploaded-file-item">
            <span class="file-name">${escapeHtml(file.name)}</span>
            <span class="file-size">${formatFileSize(file.size)}</span>
            <button class="btn-secondary" onclick="removeUploadedFile('${escapeJsString(file.name)}')">Remove</button>
        </div>
    `).join('');
}

/**
 * Render transcript editor
 */
function renderTranscriptEditor() {
    const container = elements.transcriptEditor;
    
    if (piperState.uploadedFiles.length === 0) {
        container.innerHTML = '<p class="empty-message">Upload audio files first to add transcripts.</p>';
        return;
    }
    
    container.innerHTML = piperState.uploadedFiles.map(file => {
        const baseName = file.name.replace(/\.(mp3|wav)$/i, '');
        const transcript = piperState.transcripts[baseName] || '';
        return `
            <div class="transcript-item">
                <span class="file-name">${escapeHtml(file.name)}</span>
                <textarea 
                    placeholder="Enter transcript for this audio..."
                    onchange="updateTranscript('${escapeJsString(baseName)}', this.value)"
                >${escapeHtml(transcript)}</textarea>
            </div>
        `;
    }).join('');
}

/**
 * Update transcript for a file
 */
function updateTranscript(baseName, text) {
    piperState.transcripts[baseName] = text;
}

/**
 * Upload training data to server
 */
async function uploadTrainingData() {
    if (piperState.uploadedFiles.length === 0) {
        showPiperStatus('Please upload audio files first', 'error');
        return;
    }
    
    // Check if all files have transcripts
    const missingTranscripts = piperState.uploadedFiles.filter(file => {
        const baseName = file.name.replace(/\.(mp3|wav)$/i, '');
        return !piperState.transcripts[baseName] || !piperState.transcripts[baseName].trim();
    });
    
    if (missingTranscripts.length > 0) {
        showPiperStatus(`Missing transcripts for: ${missingTranscripts.map(f => f.name).join(', ')}`, 'error');
        return;
    }
    
    showPiperStatus('Uploading training data...');
    elements.uploadTrainingDataBtn.disabled = true;
    
    try {
        const formData = new FormData();
        
        // Add files
        piperState.uploadedFiles.forEach(file => {
            formData.append('files', file);
        });
        
        // Add transcripts as JSON
        formData.append('transcripts', JSON.stringify(piperState.transcripts));
        
        const response = await fetch('/api/piper/training/upload-audio', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Upload failed');
        }
        
        const data = await response.json();
        piperState.currentSessionId = data.session_id;
        
        showPiperStatus(`Training data uploaded! Session: ${data.session_id}`, 'success');
        elements.startTrainingBtn.disabled = false;
        
        loadTrainingSessions();
    } catch (error) {
        showPiperStatus('Upload failed: ' + error.message, 'error');
    } finally {
        elements.uploadTrainingDataBtn.disabled = false;
    }
}

/**
 * Start voice training
 */
async function startTraining() {
    const voiceName = elements.trainingVoiceName.value.trim();
    
    if (!voiceName) {
        showPiperStatus('Please enter a voice name', 'error');
        return;
    }
    
    if (!piperState.currentSessionId) {
        showPiperStatus('Please upload training data first', 'error');
        return;
    }
    
    showPiperStatus('Starting training...');
    elements.startTrainingBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('session_id', piperState.currentSessionId);
        formData.append('voice_name', voiceName);
        formData.append('language', elements.trainingLanguage.value);
        formData.append('sample_rate', elements.trainingSampleRate.value);
        formData.append('batch_size', elements.trainingBatchSize.value);
        
        if (elements.trainingCheckpoint.value.trim()) {
            formData.append('checkpoint_url', elements.trainingCheckpoint.value.trim());
        }
        
        const response = await fetch('/api/piper/training/start', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to start training');
        }
        
        showPiperStatus('Training started!', 'success');
        elements.trainingProgress.classList.remove('hidden');
        
        // Start polling for training status
        pollTrainingStatus();
    } catch (error) {
        showPiperStatus('Failed to start training: ' + error.message, 'error');
        elements.startTrainingBtn.disabled = false;
    }
}

/**
 * Poll training status
 */
async function pollTrainingStatus() {
    try {
        const response = await fetch('/api/piper/training/status');
        const data = await response.json();
        
        // Update progress UI
        const progressStatus = elements.trainingProgress.querySelector('.progress-status');
        const progressPercent = elements.trainingProgress.querySelector('.progress-percent');
        
        progressStatus.textContent = data.status;
        progressPercent.textContent = `${data.progress}%`;
        elements.trainingProgressFill.style.width = `${data.progress}%`;
        
        // Update log
        if (data.log && data.log.length > 0) {
            elements.trainingLogOutput.textContent = data.log.slice(-50).join('\n');
            elements.trainingLogOutput.scrollTop = elements.trainingLogOutput.scrollHeight;
        }
        
        // Continue polling if training is active
        if (data.active || data.status === 'training' || data.status === 'preparing') {
            setTimeout(pollTrainingStatus, 2000);
        } else {
            // Training finished
            elements.startTrainingBtn.disabled = false;
            
            if (data.status === 'completed') {
                showPiperStatus('Training completed successfully!', 'success');
                elements.exportModelBtn.disabled = false;
            } else if (data.status === 'failed' || data.status === 'error') {
                showPiperStatus('Training failed. Check the log for details.', 'error');
            }
            
            loadTrainingSessions();
        }
    } catch (error) {
        console.error('Failed to poll training status:', error);
        setTimeout(pollTrainingStatus, 5000);
    }
}

/**
 * Stop training
 */
async function stopTraining() {
    try {
        const response = await fetch('/api/piper/training/stop', {
            method: 'POST'
        });
        
        const data = await response.json();
        showPiperStatus(data.message);
    } catch (error) {
        showPiperStatus('Failed to stop training: ' + error.message, 'error');
    }
}

/**
 * Load training sessions
 */
async function loadTrainingSessions() {
    try {
        const response = await fetch('/api/piper/training/sessions');
        const data = await response.json();
        
        const select = elements.exportSessionSelect;
        select.innerHTML = '<option value="">-- Select a training session --</option>';
        
        data.sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.session_id;
            option.textContent = `${session.session_id}${session.has_checkpoints ? ' (has checkpoints)' : ''}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load training sessions:', error);
    }
}

/**
 * Export trained model
 */
async function exportModel() {
    const sessionId = elements.exportSessionSelect.value;
    const outputName = elements.exportModelName.value.trim();
    
    if (!sessionId) {
        showPiperStatus('Please select a training session', 'error');
        return;
    }
    
    if (!outputName) {
        showPiperStatus('Please enter an output model name', 'error');
        return;
    }
    
    showPiperStatus('Exporting model...');
    elements.exportModelBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('output_name', outputName);
        
        const response = await fetch('/api/piper/training/export', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Export failed');
        }
        
        const data = await response.json();
        showPiperStatus(`Model exported successfully to: ${data.output_path}`, 'success');
    } catch (error) {
        showPiperStatus('Export failed: ' + error.message, 'error');
    } finally {
        elements.exportModelBtn.disabled = false;
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Setup Piper event listeners
 */
function setupPiperEventListeners() {
    // Synthesis controls
    if (elements.piperLengthScale) {
        elements.piperLengthScale.addEventListener('input', (e) => {
            elements.lengthScaleValue.textContent = e.target.value;
        });
    }
    
    if (elements.piperNoiseScale) {
        elements.piperNoiseScale.addEventListener('input', (e) => {
            elements.noiseScaleValue.textContent = e.target.value;
        });
    }
    
    if (elements.piperNoiseWScale) {
        elements.piperNoiseWScale.addEventListener('input', (e) => {
            elements.noiseWScaleValue.textContent = e.target.value;
        });
    }
    
    if (elements.piperSynthesizeBtn) {
        elements.piperSynthesizeBtn.addEventListener('click', synthesizePiperSpeech);
    }
    
    if (elements.piperDownloadBtn) {
        elements.piperDownloadBtn.addEventListener('click', downloadPiperAudio);
    }
    
    // Voice library
    if (elements.refreshVoicesBtn) {
        elements.refreshVoicesBtn.addEventListener('click', loadPiperVoices);
    }
    
    if (elements.voiceLanguageFilter) {
        elements.voiceLanguageFilter.addEventListener('change', renderVoiceLibrary);
    }
    
    if (elements.voiceQualityFilter) {
        elements.voiceQualityFilter.addEventListener('change', renderVoiceLibrary);
    }
    
    // Training upload zone
    if (elements.trainingUploadZone) {
        elements.trainingUploadZone.addEventListener('click', () => {
            elements.trainingFileInput.click();
        });
        
        elements.trainingUploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.trainingUploadZone.style.borderColor = 'var(--primary)';
        });
        
        elements.trainingUploadZone.addEventListener('dragleave', () => {
            elements.trainingUploadZone.style.borderColor = '';
        });
        
        elements.trainingUploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.trainingUploadZone.style.borderColor = '';
            handleTrainingFileUpload(e.dataTransfer.files);
        });
    }
    
    if (elements.trainingFileInput) {
        elements.trainingFileInput.addEventListener('change', (e) => {
            handleTrainingFileUpload(e.target.files);
        });
    }
    
    // Training controls
    if (elements.uploadTrainingDataBtn) {
        elements.uploadTrainingDataBtn.addEventListener('click', uploadTrainingData);
    }
    
    if (elements.startTrainingBtn) {
        elements.startTrainingBtn.addEventListener('click', startTraining);
    }
    
    if (elements.stopTrainingBtn) {
        elements.stopTrainingBtn.addEventListener('click', stopTraining);
    }
    
    if (elements.exportModelBtn) {
        elements.exportModelBtn.addEventListener('click', exportModel);
    }
    
    // Export session select
    if (elements.exportSessionSelect) {
        elements.exportSessionSelect.addEventListener('change', () => {
            elements.exportModelBtn.disabled = !elements.exportSessionSelect.value;
        });
    }
}

// Make functions available globally for onclick handlers
window.downloadVoice = downloadVoice;
window.deleteVoice = deleteVoice;
window.removeUploadedFile = removeUploadedFile;
window.updateTranscript = updateTranscript;

// ============================================================================
// Start the app
// ============================================================================

init();
