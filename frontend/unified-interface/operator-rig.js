/**
 * Operator's Rig - CRT Terminal Interface
 * Handles direct command input and terminal-style interactions
 */

class OperatorRig {
    constructor(aliCore) {
        this.ali = aliCore;
        this.isActive = true;
        this.commandHistory = [];
        this.historyIndex = -1;
        this.uploadedFiles = [];
        
        this.initializeElements();
        this.setupEventListeners();
        
        console.log('🖥️ Operator Rig initialized');
    }
    
    initializeElements() {
        this.elements = {
            commandInput: document.getElementById('command-input'),
            executeBtn: document.getElementById('execute-btn'),
            clearBtn: document.getElementById('clear-btn'),
            fileAttachBtn: document.getElementById('file-attach-btn'),
            fileInput: document.getElementById('file-input'),
            modelSelect: document.getElementById('model-select'),
            fileModal: document.getElementById('file-modal'),
            fileList: document.getElementById('file-list'),
            uploadConfirmBtn: document.getElementById('upload-confirm-btn'),
            uploadCancelBtn: document.getElementById('upload-cancel-btn')
        };
    }
    
    setupEventListeners() {
        // Command execution
        this.elements.executeBtn.addEventListener('click', () => this.executeCommand());
        this.elements.clearBtn.addEventListener('click', () => this.clearTerminal());
        
        // Keyboard shortcuts
        this.elements.commandInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.executeCommand();
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigateHistory('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigateHistory('down');
                    break;
                case 'Tab':
                    e.preventDefault();
                    this.autoComplete();
                    break;
            }
        });
        
        // File attachment
        this.elements.fileAttachBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });
        
        this.elements.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        // File modal
        this.elements.uploadConfirmBtn.addEventListener('click', () => this.confirmFileUpload());
        this.elements.uploadCancelBtn.addEventListener('click', () => this.cancelFileUpload());
        
        // Model selection
        this.elements.modelSelect.addEventListener('change', (e) => {
            this.handleModelChange(e.target.value);
        });
        
        // Focus management
        this.elements.commandInput.addEventListener('focus', () => {
            this.startCursorBlink();
        });
        
        this.elements.commandInput.addEventListener('blur', () => {
            this.stopCursorBlink();
        });
    }
    
    activate() {
        this.isActive = true;
        this.elements.commandInput.focus();
        console.log('🖥️ Operator Rig activated');
    }
    
    deactivate() {
        this.isActive = false;
        console.log('🖥️ Operator Rig deactivated');
    }
    
    async executeCommand() {
        if (this.ali.isProcessing || !this.isActive) return;
        
        const command = this.elements.commandInput.value.trim();
        if (!command) return;
        
        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Clear input
        this.elements.commandInput.value = '';
        
        // Get selected model
        const selectedModel = this.elements.modelSelect.value;
        
        // Process special commands
        if (this.handleSpecialCommands(command)) {
            return;
        }
        
        // Send to ALI
        try {
            const response = await this.ali.sendToALI(command, this.uploadedFiles);
            this.displayResponse(response);
            
            // Clear uploaded files after processing
            this.uploadedFiles = [];
            this.updateFileAttachButton();
            
        } catch (error) {
            console.error('❌ Command execution error:', error);
            this.displayError(`Command execution failed: ${error.message}`);
        }
    }
    
    handleSpecialCommands(command) {
        const lowerCommand = command.toLowerCase();
        
        // Terminal commands
        if (lowerCommand === 'clear' || lowerCommand === 'cls') {
            this.clearTerminal();
            return true;
        }
        
        if (lowerCommand === 'help') {
            this.showHelp();
            return true;
        }
        
        if (lowerCommand === 'status') {
            this.showSystemStatus();
            return true;
        }
        
        if (lowerCommand === 'history') {
            this.showCommandHistory();
            return true;
        }
        
        if (lowerCommand.startsWith('ghost') || lowerCommand.includes('deck')) {
            this.ali.switchMode('GHOST_DECK');
            return true;
        }
        
        if (lowerCommand === 'prime directive' || lowerCommand === 'describe yourself') {
            this.executePrimeDirective();
            return true;
        }
        
        return false;
    }
    
    async executePrimeDirective() {
        console.log('🎯 Executing Prime Directive from Operator Rig...');
        
        const primeCommand = "Describe your own architecture and the steps you took to build yourself, using the very interface you have created.";
        
        // Add prime directive indicator
        this.addTerminalOutput('SYSTEM', 'PRIME DIRECTIVE INITIATED', '#ffff00');
        this.addTerminalOutput('SYSTEM', 'Executing self-analysis protocol...', '#ffff00');
        
        try {
            const response = await this.ali.executePrimeDirective();
            this.displayResponse(response, true); // Mark as prime directive response
        } catch (error) {
            console.error('❌ Prime Directive execution error:', error);
            this.displayError(`Prime Directive failed: ${error.message}`);
        }
    }
    
    displayResponse(response, isPrimeDirective = false) {
        const responseText = response.text || response;
        const timestamp = new Date().toLocaleTimeString();
        
        if (isPrimeDirective) {
            this.addTerminalOutput('PRIME_RESPONSE', responseText, '#ffff00');
            this.addTerminalOutput('SYSTEM', 'PRIME DIRECTIVE COMPLETED', '#ffff00');
        } else {
            this.addTerminalOutput('ALI', responseText, '#00ff41');
        }
        
        // Show metadata if available
        if (response.metadata) {
            this.addTerminalOutput('METADATA', JSON.stringify(response.metadata, null, 2), '#00ffff');
        }
    }
    
    displayError(errorMessage) {
        this.addTerminalOutput('ERROR', errorMessage, '#ff0040');
    }
    
    addTerminalOutput(type, content, color = '#00ff41') {
        // This will be rendered by the canvas in ALI Core
        // Add to conversation history for canvas rendering
        this.ali.conversationHistory.push({
            role: 'assistant',
            content: `[${type}] ${content}`,
            timestamp: new Date().toISOString(),
            metadata: { type: type, color: color }
        });
        
        // Update canvas
        this.ali.renderCurrentMode();
    }
    
    clearTerminal() {
        this.ali.conversationHistory = [];
        this.addTerminalOutput('SYSTEM', 'Terminal cleared. ALI ready for commands.', '#00ffff');
    }
    
    showHelp() {
        const helpText = `
ALI OPERATOR RIG - COMMAND REFERENCE

SYSTEM COMMANDS:
  help           - Show this help message
  clear/cls      - Clear terminal output
  status         - Show system status
  history        - Show command history
  ghost          - Switch to Ghost-Runner's Deck

ALI COMMANDS:
  Use natural language for any request:
  • "Create a website for my portfolio"
  • "Analyze this data file"
  • "Build a Python script for automation"
  • "Describe your architecture" (Prime Directive)

KEYBOARD SHORTCUTS:
  Ctrl+Enter     - Execute command
  ↑/↓            - Navigate command history
  Tab            - Auto-complete (if available)

FILE ATTACHMENTS:
  Click 📎 to attach files to your commands
  Supported: .txt, .py, .js, .html, .css, .json, .md

MODEL SELECTION:
  Choose between Gemini, Grok, DeepSeek, or Local models
        `;
        
        this.addTerminalOutput('HELP', helpText, '#00ffff');
    }
    
    showSystemStatus() {
        const status = `
ALI SYSTEM STATUS:

Core Systems:      ${this.ali.systemStatus.core}
Flowise Backend:   ${this.ali.systemStatus.flowise}
Memory Usage:      ${this.ali.systemStatus.memory}%
Core Temperature:  ${this.ali.systemStatus.temperature}°
Neural Link:       ${this.ali.systemStatus.neuralLink}

Multi-Agent Status:
  Analyzer:        ${this.ali.agentStates.analyzer}
  Creative:        ${this.ali.agentStates.creative}
  Critic:          ${this.ali.agentStates.critic}
  Synthesizer:     ${this.ali.agentStates.synthesizer}

Session ID:        ${this.ali.sessionId}
Chatflow ID:       ${this.ali.chatflowId}
Current Mode:      ${this.ali.currentMode}
        `;
        
        this.addTerminalOutput('STATUS', status, '#00ffff');
    }
    
    showCommandHistory() {
        if (this.commandHistory.length === 0) {
            this.addTerminalOutput('HISTORY', 'No commands in history.', '#00ffff');
            return;
        }
        
        let historyText = 'COMMAND HISTORY:\\n\\n';
        this.commandHistory.forEach((cmd, index) => {
            historyText += `${index + 1}. ${cmd}\\n`;
        });
        
        this.addTerminalOutput('HISTORY', historyText, '#00ffff');
    }
    
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.elements.commandInput.value = this.commandHistory[this.historyIndex];
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.elements.commandInput.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.elements.commandInput.value = '';
            }
        }
    }
    
    autoComplete() {
        const input = this.elements.commandInput.value.toLowerCase();
        const commands = [
            'help', 'clear', 'status', 'history', 'ghost',
            'create', 'build', 'analyze', 'describe', 'execute',
            'generate', 'explain', 'debug', 'optimize'
        ];
        
        const matches = commands.filter(cmd => cmd.startsWith(input));
        
        if (matches.length === 1) {
            this.elements.commandInput.value = matches[0];
        } else if (matches.length > 1) {
            this.addTerminalOutput('AUTOCOMPLETE', `Suggestions: ${matches.join(', ')}`, '#888888');
        }
    }
    
    handleFileSelection(files) {
        if (files.length === 0) return;
        
        // Clear previous files
        this.uploadedFiles = [];
        
        // Process files
        Array.from(files).forEach(file => {
            if (this.isValidFileType(file)) {
                this.uploadedFiles.push(file);
            }
        });
        
        if (this.uploadedFiles.length > 0) {
            this.showFileModal();
        } else {
            this.ali.showError('No valid files selected. Supported types: .txt, .py, .js, .html, .css, .json, .md');
        }
    }
    
    isValidFileType(file) {
        const validExtensions = ['.txt', '.py', '.js', '.html', '.css', '.json', '.md', '.yml', '.yaml', '.xml'];
        const extension = '.' + file.name.split('.').pop().toLowerCase();
        return validExtensions.includes(extension);
    }
    
    showFileModal() {
        // Populate file list
        this.elements.fileList.innerHTML = '';
        
        this.uploadedFiles.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${this.formatFileSize(file.size)})</span>
                <span class="file-type">${file.type || 'text/plain'}</span>
            `;
            this.elements.fileList.appendChild(fileItem);
        });
        
        this.elements.fileModal.classList.remove('hidden');
    }
    
    confirmFileUpload() {
        this.elements.fileModal.classList.add('hidden');
        this.updateFileAttachButton();
        this.addTerminalOutput('SYSTEM', `${this.uploadedFiles.length} file(s) attached and ready for processing.`, '#00ffff');
    }
    
    cancelFileUpload() {
        this.uploadedFiles = [];
        this.elements.fileModal.classList.add('hidden');
        this.updateFileAttachButton();
    }
    
    updateFileAttachButton() {
        const btn = this.elements.fileAttachBtn;
        if (this.uploadedFiles.length > 0) {
            btn.style.background = 'rgba(0, 255, 65, 0.3)';
            btn.style.borderColor = '#00ff41';
            btn.title = `${this.uploadedFiles.length} file(s) attached`;
        } else {
            btn.style.background = 'rgba(0, 255, 255, 0.2)';
            btn.style.borderColor = '#00ffff';
            btn.title = 'Attach Files';
        }
    }
    
    handleModelChange(model) {
        this.addTerminalOutput('SYSTEM', `Model switched to: ${model.toUpperCase()}`, '#00ffff');
        
        // Update ALI configuration if needed
        if (this.ali.currentModel !== model) {
            this.ali.currentModel = model;
        }
    }
    
    startCursorBlink() {
        // Add blinking cursor effect to input
        this.elements.commandInput.style.borderRight = '2px solid #00ff41';
        this.cursorInterval = setInterval(() => {
            const current = this.elements.commandInput.style.borderRight;
            this.elements.commandInput.style.borderRight = 
                current === 'none' ? '2px solid #00ff41' : 'none';
        }, 500);
    }
    
    stopCursorBlink() {
        if (this.cursorInterval) {
            clearInterval(this.cursorInterval);
            this.elements.commandInput.style.borderRight = 'none';
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Terminal effects
    addTerminalGlitch() {
        // Simulate terminal glitch effect
        this.elements.commandInput.style.animation = 'glitch 0.3s ease-in-out';
        setTimeout(() => {
            this.elements.commandInput.style.animation = '';
        }, 300);
    }
    
    // Advanced features
    
    enableVoiceInput() {
        if ('webkitSpeechRecognition' in window) {
            const recognition = new webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.elements.commandInput.value = transcript;
                this.addTerminalOutput('VOICE', `Voice input: "${transcript}"`, '#ff8000');
            };
            
            recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
            };
            
            recognition.start();
        }
    }
    
    saveSession() {
        const sessionData = {
            conversationHistory: this.ali.conversationHistory,
            commandHistory: this.commandHistory,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ali-session-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.addTerminalOutput('SYSTEM', 'Session saved successfully.', '#00ffff');
    }
}

// Export for use in other modules
window.OperatorRig = OperatorRig;
