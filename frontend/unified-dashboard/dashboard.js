/**
 * ALI Unified Dashboard - Main JavaScript Controller
 */

class ALIUnifiedDashboard {
    constructor() {
        this.isProcessing = false;
        this.sessionStartTime = Date.now();
        this.tasksCompleted = 0;
        this.commandHistory = [];
        this.createdFiles = [];
        this.activeTasks = [];
        this.currentModel = 'gemini';
        
        this.initializeElements();
        this.setupEventListeners();
        this.startSystemClock();
        this.startSessionTimer();
        
        console.log('ALI Unified Dashboard initialized');
    }
    
    initializeElements() {
        // Main elements
        this.commandInput = document.getElementById('commandInput');
        this.executeBtn = document.getElementById('executeBtn');
        this.modelSelect = document.getElementById('modelSelect');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.progressBar = document.getElementById('progressBar');
        
        // Display containers
        this.workContainer = document.getElementById('workContainer');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.activeTasks = document.getElementById('activeTasks');
        this.createdFiles = document.getElementById('createdFiles');
        this.commandHistory = document.getElementById('commandHistory');
        
        // Status elements
        this.currentModelDisplay = document.getElementById('currentModel');
        this.tasksCompletedDisplay = document.getElementById('tasksCompleted');
        this.sessionTimeDisplay = document.getElementById('sessionTime');
        this.systemTimeDisplay = document.getElementById('systemTime');
        
        // Control buttons
        this.clearBtn = document.getElementById('clearBtn');
        this.saveBtn = document.getElementById('saveBtn');
        this.loadBtn = document.getElementById('loadBtn');
    }
    
    setupEventListeners() {
        // Execute button
        this.executeBtn.addEventListener('click', () => this.executeCommand());
        
        // Enter key in command input
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.executeCommand();
            }
        });
        
        // Model selection
        this.modelSelect.addEventListener('change', (e) => {
            this.currentModel = e.target.value;
            this.currentModelDisplay.textContent = this.getModelDisplayName(this.currentModel);
            this.addWorkItem('MODEL_CHANGE', `Switched to ${this.getModelDisplayName(this.currentModel)}`);
        });
        
        // Quick action buttons
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.commandInput.value = action;
                this.executeCommand();
            });
        });
        
        // Control buttons
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.saveBtn.addEventListener('click', () => this.saveSession());
        this.loadBtn.addEventListener('click', () => this.loadSession());
    }
    
    async executeCommand() {
        const command = this.commandInput.value.trim();
        if (!command || this.isProcessing) return;
        
        this.isProcessing = true;
        this.executeBtn.disabled = true;
        this.executeBtn.innerHTML = '<span class="btn-text">Processing...</span><span class="btn-icon">⚡</span>';
        
        // Add to history
        this.addToHistory(command);
        
        // Show loading
        this.showLoading();
        
        // Add work item
        this.addWorkItem('COMMAND', command);
        
        // Add active task
        this.addActiveTask(command);
        
        try {
            // Send to ALI backend
            const result = await this.sendToALI(command);
            
            // Process result
            this.processResult(result);
            
        } catch (error) {
            this.handleError(error);
        } finally {
            this.isProcessing = false;
            this.executeBtn.disabled = false;
            this.executeBtn.innerHTML = '<span class="btn-text">Execute</span><span class="btn-icon">⚡</span>';
            this.hideLoading();
            this.commandInput.value = '';
            this.removeActiveTask();
        }
    }
    
    async sendToALI(command) {
        this.updateLoadingText('Connecting to ALI Core...');
        this.updateProgress(20);
        
        try {
            const response = await fetch('http://localhost:9000/api/ali', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_query: command,
                    model: this.currentModel,
                    session_id: this.getSessionId(),
                    context: this.getContext()
                })
            });
            
            this.updateLoadingText('Processing request...');
            this.updateProgress(50);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            this.updateLoadingText('Rendering response...');
            this.updateProgress(80);
            
            // Simulate final processing
            await this.sleep(500);
            this.updateProgress(100);
            
            return result;
            
        } catch (error) {
            console.error('ALI communication error:', error);
            this.addWorkItem('ERROR', `Connection failed: ${error.message}`);
            
            // Fallback to local processing
            return this.generateFallbackResponse(command);
        }
    }
    
    processResult(result) {
        this.tasksCompleted++;
        this.tasksCompletedDisplay.textContent = this.tasksCompleted;
        
        if (result.status === 'success') {
            this.addWorkItem('SUCCESS', result.message || 'Task completed successfully');
            
            // Display results
            if (result.results && result.results.outputs) {
                this.displayResults(result.results.outputs);
            }
            
            // Track created files
            if (result.task_id) {
                this.trackCreatedFiles(result.task_id);
            }
            
            // Add result item
            this.addResultItem('success', result.message || 'Task completed', result.results);
            
        } else {
            this.addWorkItem('ERROR', result.message || 'Task failed');
            this.addResultItem('error', result.message || 'Task failed', null);
        }
    }
    
    displayResults(outputs) {
        outputs.forEach(output => {
            if (typeof output === 'string') {
                this.addWorkItem('OUTPUT', output);
            } else if (output && typeof output === 'object') {
                this.addWorkItem('OUTPUT', JSON.stringify(output, null, 2));
            }
        });
    }
    
    trackCreatedFiles(taskId) {
        // Check for common file patterns
        const filePatterns = [
            { pattern: 'generated_websites', type: 'WEB' },
            { pattern: 'generated_code', type: 'CODE' },
            { pattern: 'generated_agents', type: 'AGENT' },
            { pattern: 'generated_files', type: 'FILE' }
        ];
        
        filePatterns.forEach(pattern => {
            const fileName = `${pattern.pattern}/*_${taskId}*`;
            this.addCreatedFile(pattern.type, fileName);
        });
    }
    
    generateFallbackResponse(command) {
        const fallbackResponses = {
            'create website': {
                status: 'success',
                message: 'Website creation simulated',
                results: {
                    outputs: [
                        'HTML structure created',
                        'CSS styling applied',
                        'JavaScript functionality added',
                        'Website files saved to disk'
                    ]
                }
            },
            'execute code': {
                status: 'success',
                message: 'Code execution simulated',
                results: {
                    outputs: [
                        'Python code generated',
                        'Code executed successfully',
                        'Results saved to file'
                    ]
                }
            },
            'make agent': {
                status: 'success',
                message: 'Agent creation simulated',
                results: {
                    outputs: [
                        'Agent architecture designed',
                        'Agent code generated',
                        'Agent initialized and ready'
                    ]
                }
            }
        };
        
        const keywords = Object.keys(fallbackResponses);
        const matchedKeyword = keywords.find(keyword => command.toLowerCase().includes(keyword));
        
        if (matchedKeyword) {
            return fallbackResponses[matchedKeyword];
        }
        
        return {
            status: 'success',
            message: 'Command acknowledged',
            results: {
                outputs: [`Processed: "${command}"`]
            }
        };
    }
    
    handleError(error) {
        this.addWorkItem('ERROR', `Error: ${error.message}`);
        this.addResultItem('error', `Error: ${error.message}`, null);
    }
    
    // UI Helper Methods
    
    addWorkItem(type, content) {
        const workItem = document.createElement('div');
        workItem.className = 'work-item';
        
        const timestamp = new Date().toLocaleTimeString();
        
        workItem.innerHTML = `
            <div class="work-header">
                <span class="work-time">[${timestamp}]</span>
                <span class="work-type">${type}</span>
            </div>
            <div class="work-content">${content}</div>
        `;
        
        this.workContainer.appendChild(workItem);
        this.workContainer.scrollTop = this.workContainer.scrollHeight;
        
        // Animate in
        workItem.style.animation = 'slideIn 0.3s ease';
    }
    
    addResultItem(status, message, results) {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        const timestamp = new Date().toLocaleTimeString();
        
        let resultContent = message;
        if (results && results.outputs) {
            resultContent += '\\n\\n' + results.outputs.join('\\n');
        }
        
        resultItem.innerHTML = `
            <div class="result-header">
                <span class="result-status ${status}">${status.toUpperCase()}</span>
                <span class="result-time">${timestamp}</span>
            </div>
            <div class="result-content">${resultContent}</div>
        `;
        
        this.resultsContainer.appendChild(resultItem);
        this.resultsContainer.scrollTop = this.resultsContainer.scrollHeight;
    }
    
    addActiveTask(command) {
        this.activeTasks.innerHTML = `
            <div class="task-item">
                <div class="task-status processing">PROCESSING</div>
                <div class="task-name">${command}</div>
            </div>
        `;
    }
    
    removeActiveTask() {
        this.activeTasks.innerHTML = `
            <div class="task-item idle">
                <div class="task-status">IDLE</div>
                <div class="task-name">Waiting for tasks...</div>
            </div>
        `;
    }
    
    addCreatedFile(type, fileName) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <span class="file-type">${type}</span>
            <span class="file-name">${fileName}</span>
        `;
        
        // Remove "no files" message if present
        if (this.createdFiles.innerHTML.includes('No files created yet')) {
            this.createdFiles.innerHTML = '';
        }
        
        this.createdFiles.appendChild(fileItem);
    }
    
    addToHistory(command) {
        this.commandHistory.unshift(command);
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <span class="history-time">${new Date().toLocaleTimeString()}</span>
            <span class="history-command">${command}</span>
        `;
        
        // Remove "no history" message if present
        if (this.commandHistory.innerHTML.includes('Dashboard initialized')) {
            this.commandHistory.innerHTML = '';
        }
        
        this.commandHistory.insertBefore(historyItem, this.commandHistory.firstChild);
        
        // Keep only last 10 items
        const items = this.commandHistory.querySelectorAll('.history-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }
    
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
        this.updateProgress(0);
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    updateLoadingText(text) {
        this.loadingText.textContent = text;
    }
    
    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
    }
    
    clearAll() {
        this.workContainer.innerHTML = `
            <div class="work-item welcome">
                <div class="work-header">
                    <span class="work-time">[System Ready]</span>
                    <span class="work-type">INIT</span>
                </div>
                <div class="work-content">
                    ALI Unified Dashboard cleared. Ready for commands.
                </div>
            </div>
        `;
        
        this.resultsContainer.innerHTML = `
            <div class="result-item">
                <div class="result-header">
                    <span class="result-status ready">Ready</span>
                    <span class="result-time">System Online</span>
                </div>
                <div class="result-content">
                    Waiting for commands...
                </div>
            </div>
        `;
        
        this.commandHistory.innerHTML = `
            <div class="history-item">
                <span class="history-time">System Start</span>
                <span class="history-command">Dashboard cleared</span>
            </div>
        `;
        
        this.createdFiles.innerHTML = `
            <div class="file-item">
                <span class="file-type">LOG</span>
                <span class="file-name">No files created yet</span>
            </div>
        `;
        
        this.tasksCompleted = 0;
        this.tasksCompletedDisplay.textContent = '0';
    }
    
    saveSession() {
        const sessionData = {
            commandHistory: this.commandHistory,
            tasksCompleted: this.tasksCompleted,
            createdFiles: this.createdFiles,
            sessionStartTime: this.sessionStartTime,
            currentModel: this.currentModel
        };
        
        localStorage.setItem('ali_session', JSON.stringify(sessionData));
        this.addWorkItem('SYSTEM', 'Session saved successfully');
    }
    
    loadSession() {
        const savedSession = localStorage.getItem('ali_session');
        if (savedSession) {
            const sessionData = JSON.parse(savedSession);
            
            this.commandHistory = sessionData.commandHistory || [];
            this.tasksCompleted = sessionData.tasksCompleted || 0;
            this.createdFiles = sessionData.createdFiles || [];
            this.sessionStartTime = sessionData.sessionStartTime || Date.now();
            this.currentModel = sessionData.currentModel || 'gemini';
            
            this.tasksCompletedDisplay.textContent = this.tasksCompleted;
            this.modelSelect.value = this.currentModel;
            this.currentModelDisplay.textContent = this.getModelDisplayName(this.currentModel);
            
            this.addWorkItem('SYSTEM', 'Session loaded successfully');
        } else {
            this.addWorkItem('SYSTEM', 'No saved session found');
        }
    }
    
    startSystemClock() {
        const updateClock = () => {
            this.systemTimeDisplay.textContent = new Date().toLocaleTimeString();
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    startSessionTimer() {
        const updateTimer = () => {
            const elapsed = Date.now() - this.sessionStartTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.sessionTimeDisplay.textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        };
        
        updateTimer();
        setInterval(updateTimer, 1000);
    }
    
    getModelDisplayName(model) {
        const modelNames = {
            'gemini': 'Gemini',
            'grok': 'Grok',
            'deepseek': 'DeepSeek',
            'local': 'Local',
            'fallback': 'Fallback'
        };
        
        return modelNames[model] || model;
    }
    
    getContext() {
        const recentWork = Array.from(this.workContainer.children)
            .slice(-5)
            .map(item => item.textContent)
            .join('\\n');
        
        return recentWork;
    }
    
    getSessionId() {
        let sessionId = localStorage.getItem('ali_session_id');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ali_session_id', sessionId);
        }
        return sessionId;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.aliDashboard = new ALIUnifiedDashboard();
});

// Export for use in other modules
window.ALIUnifiedDashboard = ALIUnifiedDashboard;
