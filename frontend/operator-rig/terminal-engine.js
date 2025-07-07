/**
 * Terminal Engine - Core terminal functionality for The Operator's Rig
 */

class TerminalEngine {
    constructor() {
        this.terminalContent = document.getElementById('terminalContent');
        this.commandInput = document.getElementById('commandInput');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loadingSubtext = document.getElementById('loadingSubtext');
        
        this.commandHistory = [];
        this.historyIndex = -1;
        this.isProcessing = false;
        
        this.setupEventListeners();
        this.setupAutoComplete();
        
        // Built-in commands
        this.commands = {
            'help': this.showHelp.bind(this),
            'clear': this.clearTerminal.bind(this),
            'status': this.showStatus.bind(this),
            'vitals': this.showVitals.bind(this),
            'history': this.showHistory.bind(this),
            'whoami': this.showWhoami.bind(this),
            'time': this.showTime.bind(this),
            'echo': this.echoCommand.bind(this),
            'ghost': this.accessGhostRunner.bind(this),
            'exit': this.exitCommand.bind(this)
        };
        
        console.log('Terminal Engine initialized');
    }
    
    setupEventListeners() {
        // Command input handler
        this.commandInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                this.processCommand();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory('up');
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory('down');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                this.autoComplete();
            }
        });
        
        // Focus management
        document.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.commandInput.focus();
            }
        });
        
        // Prevent default behaviors
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        document.addEventListener('selectstart', (e) => e.preventDefault());
    }
    
    setupAutoComplete() {
        this.autoCompleteOptions = [
            'help', 'clear', 'status', 'vitals', 'history', 'whoami', 'time', 'echo', 'ghost', 'exit',
            'analyze', 'execute', 'monitor', 'debug', 'search', 'create', 'deploy', 'scan'
        ];
    }
    
    async processCommand() {
        const command = this.commandInput.value.trim();
        
        if (!command) return;
        
        // Add to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Display user input
        this.addTerminalLine('user', command);
        
        // Clear input
        this.commandInput.value = '';
        
        // Process command
        this.isProcessing = true;
        this.showLoading();
        
        try {
            await this.executeCommand(command);
        } catch (error) {
            this.addTerminalLine('error', `Error: ${error.message}`);
        } finally {
            this.isProcessing = false;
            this.hideLoading();
            this.commandInput.focus();
        }
    }
    
    async executeCommand(commandLine) {
        const [command, ...args] = commandLine.toLowerCase().split(' ');
        
        // Check built-in commands first
        if (this.commands[command]) {
            await this.commands[command](args);
            return;
        }
        
        // Send to ALI backend
        await this.sendToALI(commandLine);
    }
    
    async sendToALI(command) {
        this.updateLoadingText('Connecting to ALI Core...');
        
        try {
            const response = await fetch('http://localhost:9000/api/ali', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_query: command,
                    user_context: this.getContext(),
                    current_mode: 'operator',
                    session_id: this.getSessionId()
                })
            });
            
            this.updateLoadingText('Processing request...');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            this.updateLoadingText('Rendering response...');
            
            // Simulate processing delay for dramatic effect
            await this.sleep(500);
            
            if (result.status === 'success') {
                this.displayALIResponse(result);
            } else {
                this.addTerminalLine('error', `ALI Error: ${result.message || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('ALI communication error:', error);
            this.addTerminalLine('error', `Connection Error: ${error.message}`);
            this.addTerminalLine('system', 'Falling back to local command processing...');
            
            // Fallback to simulated response
            await this.simulateALIResponse(command);
        }
    }
    
    async simulateALIResponse(command) {
        // Simulate ALI processing for demo purposes
        const responses = {
            'analyze': 'Analysis complete. Found 3 potential optimization points.',
            'execute': 'Execution initiated. Process ID: ALI-7723. Monitoring for anomalies.',
            'monitor': 'Monitoring systems online. All parameters within normal range.',
            'debug': 'Debug mode activated. Tracing execution path...',
            'search': 'Search protocols engaged. Scanning available databases...',
            'create': 'Creation matrix initialized. Ready for deployment parameters.',
            'deploy': 'Deployment sequence started. ETA: 2.3 minutes.',
            'scan': 'Comprehensive scan initiated. Analyzing 47,329 data points...'
        };
        
        const keywords = Object.keys(responses);
        const matchedKeyword = keywords.find(keyword => command.includes(keyword));
        
        if (matchedKeyword) {
            this.addTerminalLine('ali', responses[matchedKeyword]);
        } else {
            this.addTerminalLine('ali', `Acknowledged. Processing: "${command}"`);
            await this.sleep(1000);
            this.addTerminalLine('ali', 'Task completed. Awaiting further instructions.');
        }
    }
    
    displayALIResponse(result) {
        // Display main response
        if (result.message) {
            this.addTerminalLine('ali', result.message);
        }
        
        // Display results if available
        if (result.results && result.results.outputs) {
            const outputs = result.results.outputs || [];
            outputs.forEach(output => {
                if (typeof output === 'string') {
                    this.addTerminalLine('ali', output);
                } else if (output && typeof output === 'object') {
                    this.addTerminalLine('ali', JSON.stringify(output, null, 2));
                }
            });
        }
        
        // Display execution summary
        if (result.execution_time) {
            this.addTerminalLine('system', `Execution time: ${result.execution_time.toFixed(2)}s`);
        }
    }
    
    // Built-in Commands
    
    async showHelp() {
        const helpText = [
            'ALI OPERATOR INTERFACE - COMMAND REFERENCE',
            '',
            'SYSTEM COMMANDS:',
            '  help      - Show this help message',
            '  clear     - Clear terminal output',
            '  status    - Show system status',
            '  vitals    - Display system vitals',
            '  history   - Show command history',
            '  whoami    - Display operator identity',
            '  time      - Show current system time',
            '  echo      - Echo text to terminal',
            '  ghost     - Access Ghost-Runner interface',
            '  exit      - Logout from system',
            '',
            'ALI COMMANDS:',
            '  analyze   - Perform data analysis',
            '  execute   - Execute code or commands',
            '  monitor   - Monitor system processes',
            '  debug     - Debug and troubleshoot',
            '  search    - Search databases',
            '  create    - Create new resources',
            '  deploy    - Deploy applications',
            '  scan      - Scan and audit systems',
            '',
            'Use natural language for complex tasks.',
            'Example: "analyze the log files for errors"'
        ];
        
        for (const line of helpText) {
            this.addTerminalLine('system', line);
            await this.sleep(50);
        }
    }
    
    async clearTerminal() {
        this.terminalContent.innerHTML = '';
        this.addTerminalLine('system', 'Terminal cleared.');
    }
    
    async showStatus() {
        const status = [
            'ALI SYSTEM STATUS:',
            '',
            'Core Systems:     ONLINE',
            'Neural Networks:  ACTIVE',
            'Security Layer:   ENABLED',
            'Sandbox:          SECURE',
            'API Gateway:      RESPONSIVE',
            'Agent Foundry:    OPERATIONAL',
            '',
            'Active Sessions:  1',
            'Queue Depth:      0',
            'Uptime:          47h 23m 15s'
        ];
        
        for (const line of status) {
            this.addTerminalLine('system', line);
            await this.sleep(100);
        }
    }
    
    async showVitals() {
        const vitals = [
            'SYSTEM VITALS:',
            '',
            `Core Temperature: ${document.getElementById('coreTemp').textContent}`,
            `Memory Usage:     ${document.getElementById('memUsage').textContent}`,
            `Neural Link:      ${document.querySelector('.status-stable').textContent}`,
            `Network Status:   ${document.getElementById('networkStatus').textContent}`,
            '',
            'CPU Cores:        8/8 Active',
            'Load Average:     0.73, 0.82, 0.91',
            'Disk I/O:         Normal',
            'Network I/O:      Optimal'
        ];
        
        for (const line of vitals) {
            this.addTerminalLine('system', line);
            await this.sleep(80);
        }
    }
    
    async showHistory() {
        this.addTerminalLine('system', 'COMMAND HISTORY:');
        this.addTerminalLine('system', '');
        
        if (this.commandHistory.length === 0) {
            this.addTerminalLine('system', 'No commands in history.');
            return;
        }
        
        this.commandHistory.forEach((cmd, index) => {
            this.addTerminalLine('system', `${index + 1}. ${cmd}`);
        });
    }
    
    async showWhoami() {
        const identity = [
            'OPERATOR IDENTITY:',
            '',
            'Designation:      OPERATOR-7723',
            'Clearance Level:  ALPHA',
            'Access Rights:    FULL_SYSTEM',
            'Session ID:       ' + this.getSessionId(),
            'Location:         CLASSIFIED',
            'Status:           AUTHENTICATED'
        ];
        
        for (const line of identity) {
            this.addTerminalLine('system', line);
            await this.sleep(100);
        }
    }
    
    async showTime() {
        const now = new Date();
        const timeInfo = [
            'SYSTEM TIME:',
            '',
            `Local Time:       ${now.toLocaleTimeString()}`,
            `UTC Time:         ${now.toUTCString()}`,
            `Uptime:           47h 23m 15s`,
            `System Clock:     SYNCHRONIZED`
        ];
        
        for (const line of timeInfo) {
            this.addTerminalLine('system', line);
            await this.sleep(80);
        }
    }
    
    async echoCommand(args) {
        const text = args.join(' ');
        this.addTerminalLine('system', text || 'Echo: (empty)');
    }
    
    async accessGhostRunner() {
        this.addTerminalLine('system', 'Initiating Ghost-Runner interface...');
        await this.sleep(1000);
        this.addTerminalLine('system', 'Switching to advanced command center...');
        await this.sleep(500);
        
        // Trigger transition to Ghost-Runner interface
        window.location.href = '../ghost-runner/index.html';
    }
    
    async exitCommand() {
        this.addTerminalLine('system', 'Logging out...');
        await this.sleep(500);
        this.addTerminalLine('system', 'Session terminated.');
        await this.sleep(1000);
        
        // Fade out interface
        document.querySelector('.main-interface').style.opacity = '0';
        
        setTimeout(() => {
            document.body.innerHTML = '<div style="color: #00ff41; font-family: monospace; text-align: center; margin-top: 50vh; transform: translateY(-50%);">CONNECTION TERMINATED</div>';
        }, 1000);
    }
    
    // Utility Methods
    
    addTerminalLine(type, text) {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}-message`;
        
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
        
        const prefix = document.createElement('span');
        prefix.className = 'prefix';
        
        switch (type) {
            case 'user':
                prefix.textContent = '👤';
                break;
            case 'ali':
                prefix.textContent = '🤖';
                break;
            case 'system':
                prefix.textContent = '>';
                break;
            case 'error':
                prefix.textContent = '!';
                break;
            default:
                prefix.textContent = '>';
        }
        
        const message = document.createElement('span');
        message.className = 'message';
        message.textContent = text;
        
        line.appendChild(timestamp);
        line.appendChild(prefix);
        line.appendChild(message);
        
        this.terminalContent.appendChild(line);
        
        // Auto-scroll to bottom
        this.terminalContent.scrollTop = this.terminalContent.scrollHeight;
        
        // Add typing animation
        line.style.animation = 'fadeInLine 0.3s ease-in forwards';
    }
    
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;
        
        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            }
        } else if (direction === 'down') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
                this.commandInput.value = this.commandHistory[this.historyIndex];
            } else {
                this.historyIndex = this.commandHistory.length;
                this.commandInput.value = '';
            }
        }
    }
    
    autoComplete() {
        const currentInput = this.commandInput.value.toLowerCase();
        const matches = this.autoCompleteOptions.filter(option => 
            option.startsWith(currentInput)
        );
        
        if (matches.length === 1) {
            this.commandInput.value = matches[0];
        } else if (matches.length > 1) {
            this.addTerminalLine('system', 'Suggestions: ' + matches.join(', '));
        }
    }
    
    showLoading() {
        this.loadingOverlay.style.display = 'flex';
        this.updateLoadingText('Initializing...');
    }
    
    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }
    
    updateLoadingText(text) {
        this.loadingSubtext.textContent = text;
    }
    
    getContext() {
        // Get recent terminal history as context
        const recentLines = Array.from(this.terminalContent.children)
            .slice(-10)
            .map(line => line.textContent)
            .join('\n');
        
        return recentLines;
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

// Export for use in other modules
window.TerminalEngine = TerminalEngine;
