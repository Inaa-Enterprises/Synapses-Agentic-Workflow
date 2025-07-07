/**
 * ALI Core - Autonomous Intelligence Loop Core System
 * Manages the unified interface and coordinates between Operator's Rig and Ghost-Runner's Deck
 */

class ALICore {
    constructor() {
        this.currentMode = 'OPERATOR_RIG';
        this.flowiseEndpoint = 'http://localhost:3001/api/v1/prediction';
        this.chatflowId = null;
        this.sessionId = this.generateSessionId();
        this.isProcessing = false;
        this.conversationHistory = [];
        this.systemStatus = {
            core: 'STABLE',
            flowise: 'CONNECTING',
            memory: 74,
            temperature: 98.6,
            neuralLink: 'STABLE'
        };
        
        // Canvas and rendering
        this.canvas = null;
        this.ctx = null;
        this.renderLoop = null;
        
        // Multi-agent tracking
        this.agentStates = {
            analyzer: 'idle',
            creative: 'idle', 
            critic: 'idle',
            synthesizer: 'idle'
        };
        
        // Emotional memory system
        this.emotionalMemory = [];
        this.contextWindow = [];
        
        console.log('🧠 ALI Core initialized');
    }
    
    async initialize() {
        console.log('🚀 Initializing ALI systems...');
        
        // Initialize UI elements
        this.initializeElements();
        this.initializeCanvas();
        this.setupEventListeners();
        
        // Start system processes
        this.startSystemClock();
        this.startSystemMonitoring();
        this.startRenderLoop();
        
        // Connect to Flowise backend
        await this.connectToFlowise();
        
        // Initialize sub-modules
        this.operatorRig = new OperatorRig(this);
        this.ghostDeck = new GhostDeck(this);
        
        console.log('✅ ALI systems online');
        this.updateSystemStatus('core', 'ONLINE');
    }
    
    initializeElements() {
        // Get all UI elements
        this.elements = {
            // Vitals
            coreTemp: document.getElementById('core-temp'),
            memoryUsage: document.getElementById('memory-usage'),
            neuralStatus: document.getElementById('neural-status'),
            systemTime: document.getElementById('system-time'),
            
            // Mode controls
            operatorBtn: document.getElementById('operator-rig-btn'),
            ghostBtn: document.getElementById('ghost-deck-btn'),
            
            // Input panels
            operatorPanel: document.getElementById('operator-input-panel'),
            ghostControls: document.getElementById('ghost-deck-controls'),
            
            // Modals and overlays
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingStatus: document.getElementById('loading-status'),
            errorModal: document.getElementById('error-modal'),
            errorMessage: document.getElementById('error-message'),
            
            // Agent indicators
            analyzerStatus: document.getElementById('analyzer-status'),
            creativeStatus: document.getElementById('creative-status'),
            criticStatus: document.getElementById('critic-status'),
            synthesizerStatus: document.getElementById('synthesizer-status')
        };
    }
    
    initializeCanvas() {
        this.canvas = document.getElementById('ali-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set canvas size
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Initialize canvas style
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        console.log('🎨 Canvas initialized');
    }
    
    setupEventListeners() {
        // Mode switching
        this.elements.operatorBtn.addEventListener('click', () => this.switchMode('OPERATOR_RIG'));
        this.elements.ghostBtn.addEventListener('click', () => this.switchMode('GHOST_DECK'));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Error modal close
        document.getElementById('error-close-btn').addEventListener('click', () => {
            this.elements.errorModal.classList.add('hidden');
        });
        
        console.log('🎛️ Event listeners configured');
    }
    
    switchMode(mode) {
        if (this.currentMode === mode) return;
        
        console.log(`🔄 Switching to ${mode} mode`);
        this.currentMode = mode;
        
        // Update UI
        this.elements.operatorBtn.classList.toggle('active', mode === 'OPERATOR_RIG');
        this.elements.ghostBtn.classList.toggle('active', mode === 'GHOST_DECK');
        
        if (mode === 'OPERATOR_RIG') {
            this.elements.operatorPanel.classList.remove('hidden');
            this.elements.ghostControls.classList.add('hidden');
            this.operatorRig?.activate();
            this.ghostDeck?.deactivate();
        } else {
            this.elements.operatorPanel.classList.add('hidden');
            this.elements.ghostControls.classList.remove('hidden');
            this.operatorRig?.deactivate();
            this.ghostDeck?.activate();
        }
        
        // Trigger canvas re-render
        this.renderCurrentMode();
    }
    
    async connectToFlowise() {
        console.log('🔗 Connecting to Flowise backend...');
        this.updateSystemStatus('flowise', 'CONNECTING');
        
        try {
            // First, get available chatflows
            const response = await fetch('http://localhost:3001/api/v1/chatflows');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const chatflows = await response.json();
            
            // Find ALI main chatflow
            const aliChatflow = chatflows.find(flow => 
                flow.name && flow.name.includes('ALI Main Reasoning Engine')
            );
            
            if (aliChatflow) {
                this.chatflowId = aliChatflow.id;
                this.flowiseEndpoint = `http://localhost:3001/api/v1/prediction/${this.chatflowId}`;
                console.log(`✅ Connected to ALI chatflow: ${this.chatflowId}`);
                this.updateSystemStatus('flowise', 'SECURE');
            } else {
                throw new Error('ALI chatflow not found. Please run backend setup.');
            }
            
        } catch (error) {
            console.error('❌ Flowise connection failed:', error);
            this.updateSystemStatus('flowise', 'ERROR');
            this.showError(`Flowise connection failed: ${error.message}`);
            
            // Use fallback mode
            this.chatflowId = 'fallback';
            this.flowiseEndpoint = 'fallback';
        }
    }
    
    async sendToALI(userInput, attachments = []) {
        if (this.isProcessing) {
            console.log('⚠️ ALI is already processing');
            return;
        }
        
        this.isProcessing = true;
        this.showLoading('Initializing multi-agent reasoning...');
        
        try {
            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userInput,
                timestamp: new Date().toISOString(),
                attachments: attachments
            });
            
            // Update emotional memory and context
            this.updateEmotionalMemory(userInput);
            this.updateContextWindow(userInput);
            
            let response;
            
            if (this.flowiseEndpoint === 'fallback') {
                response = await this.fallbackProcessing(userInput);
            } else {
                response = await this.sendToFlowise(userInput, attachments);
            }
            
            // Add response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response.text || response,
                timestamp: new Date().toISOString(),
                metadata: response.metadata || {}
            });
            
            return response;
            
        } catch (error) {
            console.error('❌ ALI processing error:', error);
            this.showError(`Processing error: ${error.message}`);
            return { text: 'I apologize, but I encountered an error processing your request.' };
        } finally {
            this.isProcessing = false;
            this.hideLoading();
        }
    }
    
    async sendToFlowise(userInput, attachments) {
        console.log('📡 Sending to Flowise multi-agent system...');
        
        // Simulate multi-agent processing stages
        const stages = [
            { agent: 'analyzer', message: 'Breaking down problem components...' },
            { agent: 'creative', message: 'Generating innovative solutions...' },
            { agent: 'critic', message: 'Evaluating proposed approaches...' },
            { agent: 'synthesizer', message: 'Synthesizing final response...' }
        ];
        
        // Process through each agent
        for (const stage of stages) {
            this.updateAgentStatus(stage.agent, 'processing');
            this.updateLoadingStatus(stage.message);
            await this.delay(1000);
        }
        
        try {
            const payload = {
                question: userInput,
                history: this.conversationHistory.slice(-10), // Last 10 messages
                sessionId: this.sessionId,
                attachments: attachments
            };
            
            const response = await fetch(this.flowiseEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                throw new Error(`Flowise API error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            // Reset agent states
            Object.keys(this.agentStates).forEach(agent => {
                this.updateAgentStatus(agent, 'idle');
            });
            
            return {
                text: result.text || result.answer || result.response,
                metadata: {
                    chatflowId: this.chatflowId,
                    sessionId: this.sessionId,
                    agents: this.agentStates,
                    timestamp: new Date().toISOString()
                }
            };
            
        } catch (error) {
            console.error('❌ Flowise API error:', error);
            
            // Reset agent states
            Object.keys(this.agentStates).forEach(agent => {
                this.updateAgentStatus(agent, 'idle');
            });
            
            // Fall back to local processing
            return await this.fallbackProcessing(userInput);
        }
    }
    
    async fallbackProcessing(userInput) {
        console.log('🔄 Using fallback processing mode...');
        
        // Simulate multi-agent processing
        const stages = [
            'Analyzing request components...',
            'Generating response strategies...',
            'Evaluating best approach...',
            'Finalizing response...'
        ];
        
        for (let i = 0; i < stages.length; i++) {
            this.updateLoadingStatus(stages[i]);
            const agent = Object.keys(this.agentStates)[i];
            this.updateAgentStatus(agent, 'processing');
            await this.delay(800);
            this.updateAgentStatus(agent, 'idle');
        }
        
        // Generate contextual response
        const responses = {
            'describe your architecture': 'I am ALI - an Autonomous Intelligence Loop with a multi-agent reasoning system. My architecture consists of: 1) Analyzer Agent for problem decomposition, 2) Creative Agent for solution generation, 3) Critic Agent for evaluation, and 4) Synthesizer Agent for final response creation. I utilize adaptive context windows, emotional memory, and self-evolving prompts.',
            'build': 'Initiating construction protocols. I can create websites, applications, scripts, and various digital assets using my integrated toolset.',
            'analyze': 'Beginning analysis sequence. I will examine the provided data or request using my multi-agent reasoning system.',
            'create': 'Activating creation matrix. I can generate code, designs, documents, and other digital artifacts.',
            'help': 'ALI assistance available. I can help with coding, analysis, creation, problem-solving, and various computational tasks.'
        };
        
        // Find best match
        const lowerInput = userInput.toLowerCase();
        const matchedKey = Object.keys(responses).find(key => lowerInput.includes(key));
        
        let responseText = matchedKey ? responses[matchedKey] : 
            `I understand you want me to process: "${userInput}". I'm ready to assist with this request using my multi-agent reasoning system.`;
        
        return {
            text: responseText,
            metadata: {
                mode: 'fallback',
                timestamp: new Date().toISOString()
            }
        };
    }
    
    // UI Update Methods
    
    updateSystemStatus(system, status) {
        this.systemStatus[system] = status;
        
        switch (system) {
            case 'flowise':
                // Update connection indicator
                const statusElements = document.querySelectorAll('.status-value');
                statusElements.forEach(el => {
                    if (el.textContent.includes('CONN')) {
                        el.textContent = status;
                        el.className = 'status-value ' + (status === 'SECURE' ? 'secure' : 'error');
                    }
                });
                break;
        }
    }
    
    updateAgentStatus(agent, status) {
        this.agentStates[agent] = status;
        const element = this.elements[`${agent}Status`];
        if (element) {
            element.className = 'agent-indicator ' + status;
        }
    }
    
    showLoading(message = 'Processing...') {
        this.elements.loadingOverlay.classList.remove('hidden');
        this.updateLoadingStatus(message);
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }
    
    updateLoadingStatus(message) {
        this.elements.loadingStatus.textContent = message;
    }
    
    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorModal.classList.remove('hidden');
    }
    
    // System Monitoring
    
    startSystemClock() {
        const updateClock = () => {
            const now = new Date();
            this.elements.systemTime.textContent = now.toLocaleTimeString('en-US', {
                hour12: true,
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }
    
    startSystemMonitoring() {
        setInterval(() => {
            // Simulate system vitals
            this.systemStatus.memory = Math.max(60, Math.min(90, this.systemStatus.memory + (Math.random() - 0.5) * 2));
            this.systemStatus.temperature = Math.max(95, Math.min(102, this.systemStatus.temperature + (Math.random() - 0.5) * 0.5));
            
            this.elements.memoryUsage.textContent = Math.round(this.systemStatus.memory) + '%';
            this.elements.coreTemp.textContent = this.systemStatus.temperature.toFixed(1) + '°';
        }, 2000);
    }
    
    // Canvas Rendering
    
    startRenderLoop() {
        const render = () => {
            this.renderCurrentMode();
            this.renderLoop = requestAnimationFrame(render);
        };
        render();
    }
    
    renderCurrentMode() {
        if (!this.ctx) return;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width / window.devicePixelRatio, this.canvas.height / window.devicePixelRatio);
        
        if (this.currentMode === 'OPERATOR_RIG') {
            this.renderOperatorRig();
        } else {
            this.renderGhostDeck();
        }
    }
    
    renderOperatorRig() {
        const ctx = this.ctx;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        // Terminal background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, width, height);
        
        // CRT scanlines effect
        ctx.strokeStyle = 'rgba(0, 255, 65, 0.1)';
        ctx.lineWidth = 1;
        for (let y = 0; y < height; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Render conversation history
        this.renderConversationHistory(ctx, width, height);
    }
    
    renderGhostDeck() {
        const ctx = this.ctx;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;
        
        // Workflow canvas background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, width, height);
        
        // Grid pattern
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Render workflow nodes
        this.renderWorkflowNodes(ctx, width, height);
    }
    
    renderConversationHistory(ctx, width, height) {
        if (this.conversationHistory.length === 0) {
            // Show welcome message
            ctx.fillStyle = '#00ff41';
            ctx.font = '16px JetBrains Mono';
            ctx.fillText('<< KERNEL_LOG // ALI_MAIN >>', 20, 40);
            
            ctx.fillStyle = '#00ffff';
            ctx.font = '14px JetBrains Mono';
            ctx.fillText('ALI ready for commands. Type your request below.', 20, 80);
            
            return;
        }
        
        // Render recent messages
        let y = 40;
        const lineHeight = 25;
        const maxLines = Math.floor((height - 100) / lineHeight);
        const recentMessages = this.conversationHistory.slice(-maxLines);
        
        ctx.font = '14px JetBrains Mono';
        
        recentMessages.forEach(message => {
            const prefix = message.role === 'user' ? '[ 👤 OPERATOR ] >' : '[ 🤖 A L I ] >';
            const color = message.role === 'user' ? '#00ffff' : '#00ff41';
            
            ctx.fillStyle = color;
            ctx.fillText(prefix, 20, y);
            
            // Wrap text
            const maxWidth = width - 200;
            const words = message.content.split(' ');
            let line = '';
            let lineY = y + lineHeight;
            
            for (const word of words) {
                const testLine = line + word + ' ';
                const metrics = ctx.measureText(testLine);
                
                if (metrics.width > maxWidth && line !== '') {
                    ctx.fillText(line, 200, lineY);
                    line = word + ' ';
                    lineY += lineHeight;
                } else {
                    line = testLine;
                }
            }
            
            if (line) {
                ctx.fillText(line, 200, lineY);
            }
            
            y = lineY + lineHeight;
        });
    }
    
    renderWorkflowNodes(ctx, width, height) {
        // Agent nodes
        const agents = [
            { name: 'ANALYZER', x: width * 0.2, y: height * 0.3, state: this.agentStates.analyzer },
            { name: 'CREATIVE', x: width * 0.4, y: height * 0.5, state: this.agentStates.creative },
            { name: 'CRITIC', x: width * 0.6, y: height * 0.3, state: this.agentStates.critic },
            { name: 'SYNTHESIZER', x: width * 0.8, y: height * 0.4, state: this.agentStates.synthesizer }
        ];
        
        // Draw connections
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        
        // Analyzer -> Synthesizer
        this.drawConnection(ctx, agents[0], agents[3]);
        // Creative -> Synthesizer  
        this.drawConnection(ctx, agents[1], agents[3]);
        // Critic -> Synthesizer
        this.drawConnection(ctx, agents[2], agents[3]);
        
        // Draw agent nodes
        agents.forEach(agent => {
            this.drawAgentNode(ctx, agent);
        });
    }
    
    drawConnection(ctx, from, to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }
    
    drawAgentNode(ctx, agent) {
        const radius = 40;
        
        // Node circle
        ctx.strokeStyle = agent.state === 'processing' ? '#00ff41' : '#00ffff';
        ctx.fillStyle = agent.state === 'processing' ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Node label
        ctx.fillStyle = agent.state === 'processing' ? '#00ff41' : '#00ffff';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(agent.name, agent.x, agent.y + 5);
        
        // Processing animation
        if (agent.state === 'processing') {
            const time = Date.now() / 1000;
            const pulseRadius = radius + Math.sin(time * 4) * 10;
            
            ctx.strokeStyle = 'rgba(0, 255, 65, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(agent.x, agent.y, pulseRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Memory and Context Management
    
    updateEmotionalMemory(input) {
        // Simple emotional analysis
        const emotional_markers = {
            positive: ['great', 'awesome', 'excellent', 'love', 'amazing'],
            negative: ['bad', 'awful', 'hate', 'terrible', 'horrible'],
            urgent: ['urgent', 'asap', 'immediately', 'emergency', 'critical'],
            creative: ['create', 'build', 'design', 'innovative', 'new']
        };
        
        const emotions = {};
        Object.keys(emotional_markers).forEach(emotion => {
            emotions[emotion] = emotional_markers[emotion].some(marker => 
                input.toLowerCase().includes(marker)
            );
        });
        
        this.emotionalMemory.push({
            input: input,
            emotions: emotions,
            timestamp: new Date().toISOString()
        });
        
        // Keep only recent emotional memories
        if (this.emotionalMemory.length > 100) {
            this.emotionalMemory = this.emotionalMemory.slice(-100);
        }
    }
    
    updateContextWindow(input) {
        this.contextWindow.push({
            content: input,
            timestamp: new Date().toISOString(),
            type: 'user_input'
        });
        
        // Adaptive context window size
        const baseSize = 20;
        const emotionalWeight = this.getEmotionalWeight(input);
        const adaptiveSize = Math.round(baseSize * (1 + emotionalWeight));
        
        if (this.contextWindow.length > adaptiveSize) {
            this.contextWindow = this.contextWindow.slice(-adaptiveSize);
        }
    }
    
    getEmotionalWeight(input) {
        // Calculate emotional intensity for adaptive context
        const recentEmotions = this.emotionalMemory.slice(-10);
        let weight = 0;
        
        recentEmotions.forEach(memory => {
            Object.values(memory.emotions).forEach(hasEmotion => {
                if (hasEmotion) weight += 0.1;
            });
        });
        
        return Math.min(weight, 1.0);
    }
    
    // Utility Methods
    
    generateSessionId() {
        return 'ali_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    handleResize() {
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
        }
    }
    
    // Prime Directive Method
    async executePrimeDirective() {
        console.log('🎯 Executing Prime Directive...');
        
        const primeDirectiveQuery = "Describe your own architecture and the steps you took to build yourself, using the very interface you have created.";
        
        return await this.sendToALI(primeDirectiveQuery);
    }
}

// Export for use in other modules
window.ALICore = ALICore;
