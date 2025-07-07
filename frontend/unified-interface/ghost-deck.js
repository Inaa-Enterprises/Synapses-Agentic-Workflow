/**
 * Ghost-Runner's Deck - Advanced Agent Management Canvas
 * Handles workflow visualization and agent management
 */

class GhostDeck {
    constructor(aliCore) {
        this.ali = aliCore;
        this.isActive = false;
        this.workflowNodes = [];
        this.connections = [];
        this.selectedNode = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeWorkflow();
        
        console.log('🎮 Ghost-Runner\'s Deck initialized');
    }
    
    initializeElements() {
        this.elements = {
            createAgentBtn: document.getElementById('create-agent-btn'),
            cloneFlowBtn: document.getElementById('clone-flow-btn'),
            flowise DashboardBtn: document.getElementById('flowise-dashboard-btn'),
            vectorStoreBtn: document.getElementById('vector-store-btn'),
            workflowIndicators: document.querySelectorAll('.flow-indicator')
        };
    }
    
    setupEventListeners() {
        // Agent Foundry controls
        this.elements.createAgentBtn.addEventListener('click', () => this.createNewAgent());
        this.elements.cloneFlowBtn.addEventListener('click', () => this.cloneChatflow());
        
        // System override controls
        this.elements.flowiseDashboardBtn.addEventListener('click', () => this.openFlowiseDashboard());
        this.elements.vectorStoreBtn.addEventListener('click', () => this.openVectorStore());
        
        // Canvas interactions for workflow
        this.ali.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.ali.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.ali.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.ali.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.isActive) {
                this.handleKeyboard(e);
            }
        });
    }
    
    activate() {
        this.isActive = true;
        this.updateWorkflowStatus();
        console.log('🎮 Ghost-Runner\'s Deck activated');
    }
    
    deactivate() {
        this.isActive = false;
        console.log('🎮 Ghost-Runner\'s Deck deactivated');
    }
    
    initializeWorkflow() {
        // Initialize the ALI multi-agent workflow
        this.workflowNodes = [
            {
                id: 'input',
                type: 'input',
                name: 'USER_INPUT',
                x: 100,
                y: 200,
                width: 120,
                height: 60,
                status: 'idle',
                connections: ['router']
            },
            {
                id: 'router',
                type: 'router',
                name: 'MULTI_AGENT_ROUTER',
                x: 300,
                y: 200,
                width: 150,
                height: 60,
                status: 'idle',
                connections: ['analyzer', 'creative', 'critic']
            },
            {
                id: 'analyzer',
                type: 'agent',
                name: 'ANALYZER_AGENT',
                x: 500,
                y: 100,
                width: 140,
                height: 60,
                status: 'idle',
                connections: ['synthesizer'],
                agent: 'analyzer'
            },
            {
                id: 'creative',
                type: 'agent',
                name: 'CREATIVE_AGENT',
                x: 500,
                y: 200,
                width: 140,
                height: 60,
                status: 'idle',
                connections: ['synthesizer'],
                agent: 'creative'
            },
            {
                id: 'critic',
                type: 'agent',
                name: 'CRITIC_AGENT',
                x: 500,
                y: 300,
                width: 140,
                height: 60,
                status: 'idle',
                connections: ['synthesizer'],
                agent: 'critic'
            },
            {
                id: 'synthesizer',
                type: 'agent',
                name: 'SYNTHESIZER_AGENT',
                x: 750,
                y: 200,
                width: 150,
                height: 60,
                status: 'idle',
                connections: ['memory', 'output'],
                agent: 'synthesizer'
            },
            {
                id: 'memory',
                type: 'memory',
                name: 'EMOTIONAL_MEMORY',
                x: 300,
                y: 350,
                width: 140,
                height: 60,
                status: 'active',
                connections: []
            },
            {
                id: 'context',
                type: 'memory',
                name: 'ADAPTIVE_CONTEXT',
                x: 100,
                y: 350,
                width: 140,
                height: 60,
                status: 'active',
                connections: ['router']
            },
            {
                id: 'output',
                type: 'output',
                name: 'ALI_RESPONSE',
                x: 950,
                y: 200,
                width: 120,
                height: 60,
                status: 'idle',
                connections: []
            }
        ];
        
        this.generateConnections();
    }
    
    generateConnections() {
        this.connections = [];
        
        this.workflowNodes.forEach(node => {
            node.connections.forEach(targetId => {
                const target = this.workflowNodes.find(n => n.id === targetId);
                if (target) {
                    this.connections.push({
                        from: node,
                        to: target,
                        status: 'idle',
                        dataFlow: 0
                    });
                }
            });
        });
    }
    
    updateWorkflowStatus() {
        // Update workflow indicators based on system status
        this.elements.workflowIndicators.forEach((indicator, index) => {
            const flows = [
                'MULTI_AGENT_REASONING',
                'ADAPTIVE_CONTEXT', 
                'EMOTIONAL_MEMORY'
            ];
            
            if (index < flows.length) {
                const isActive = this.checkFlowStatus(flows[index]);
                indicator.classList.toggle('active', isActive);
            }
        });
        
        // Update node statuses based on agent states
        this.workflowNodes.forEach(node => {
            if (node.agent && this.ali.agentStates[node.agent]) {
                node.status = this.ali.agentStates[node.agent];
            }
        });
    }
    
    checkFlowStatus(flowName) {
        switch (flowName) {
            case 'MULTI_AGENT_REASONING':
                return this.ali.chatflowId !== null && this.ali.chatflowId !== 'fallback';
            case 'ADAPTIVE_CONTEXT':
                return this.ali.contextWindow.length > 0;
            case 'EMOTIONAL_MEMORY':
                return this.ali.emotionalMemory.length > 0;
            default:
                return false;
        }
    }
    
    // Canvas interaction handlers
    
    handleMouseDown(e) {
        if (!this.isActive || this.ali.currentMode !== 'GHOST_DECK') return;
        
        const rect = this.ali.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.getNodeAt(x, y);
        if (node) {
            this.selectedNode = node;
            this.isDragging = true;
            this.dragOffset = {
                x: x - node.x,
                y: y - node.y
            };
            
            // Highlight selected node
            this.ali.renderCurrentMode();
        }
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.isDragging || !this.selectedNode) return;
        
        const rect = this.ali.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Update node position
        this.selectedNode.x = x - this.dragOffset.x;
        this.selectedNode.y = y - this.dragOffset.y;
        
        // Redraw canvas
        this.ali.renderCurrentMode();
    }
    
    handleMouseUp(e) {
        if (!this.isActive) return;
        
        this.isDragging = false;
        this.selectedNode = null;
    }
    
    handleDoubleClick(e) {
        if (!this.isActive || this.ali.currentMode !== 'GHOST_DECK') return;
        
        const rect = this.ali.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.getNodeAt(x, y);
        if (node) {
            this.openNodeEditor(node);
        }
    }
    
    handleKeyboard(e) {
        switch (e.key) {
            case 'Delete':
                if (this.selectedNode && this.selectedNode.type !== 'input' && this.selectedNode.type !== 'output') {
                    this.deleteNode(this.selectedNode);
                }
                break;
            case 'n':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.createNewNode();
                }
                break;
            case 's':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.saveWorkflow();
                }
                break;
        }
    }
    
    getNodeAt(x, y) {
        return this.workflowNodes.find(node => 
            x >= node.x && x <= node.x + node.width &&
            y >= node.y && y <= node.y + node.height
        );
    }
    
    // Agent management methods
    
    async createNewAgent() {
        console.log('🏗️ Creating new agent...');
        
        const agentConfig = await this.showAgentCreationDialog();
        if (!agentConfig) return;
        
        // Create new workflow node for the agent
        const newNode = {
            id: `agent_${Date.now()}`,
            type: 'agent',
            name: agentConfig.name.toUpperCase(),
            x: 600,
            y: 400,
            width: 140,
            height: 60,
            status: 'idle',
            connections: ['synthesizer'],
            agent: agentConfig.name.toLowerCase(),
            config: agentConfig
        };
        
        this.workflowNodes.push(newNode);
        this.generateConnections();
        this.ali.renderCurrentMode();
        
        // Show success message
        this.showNotification(`Agent "${agentConfig.name}" created successfully`, 'success');
    }
    
    async cloneChatflow() {
        console.log('📋 Cloning chatflow...');
        
        if (this.ali.chatflowId === 'fallback') {
            this.showNotification('Cannot clone fallback mode. Please connect to Flowise first.', 'warning');
            return;
        }
        
        try {
            // Get current chatflow data
            const response = await fetch(`http://localhost:3001/api/v1/chatflows/${this.ali.chatflowId}`);
            const chatflowData = await response.json();
            
            // Create clone with new name
            const cloneName = `ALI Clone ${Date.now()}`;
            const clonePayload = {
                ...chatflowData,
                name: cloneName,
                id: undefined // Let server generate new ID
            };
            
            const cloneResponse = await fetch('http://localhost:3001/api/v1/chatflows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clonePayload)
            });
            
            if (cloneResponse.ok) {
                const cloneResult = await cloneResponse.json();
                this.showNotification(`Chatflow cloned as "${cloneName}" (ID: ${cloneResult.id})`, 'success');
            } else {
                throw new Error(`Clone failed: ${cloneResponse.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Chatflow clone error:', error);
            this.showNotification(`Clone failed: ${error.message}`, 'error');
        }
    }
    
    openFlowiseDashboard() {
        const url = 'http://localhost:3001';
        window.open(url, '_blank');
        this.showNotification('Opening Flowise Dashboard in new tab', 'info');
    }
    
    openVectorStore() {
        // Open vector store management interface
        this.showVectorStoreDialog();
    }
    
    openNodeEditor(node) {
        console.log(`🔧 Opening editor for node: ${node.name}`);
        
        const editorHTML = `
            <div class="node-editor">
                <h3>Node Editor: ${node.name}</h3>
                <div class="editor-field">
                    <label>Name:</label>
                    <input type="text" id="node-name" value="${node.name}">
                </div>
                <div class="editor-field">
                    <label>Type:</label>
                    <select id="node-type">
                        <option value="agent" ${node.type === 'agent' ? 'selected' : ''}>Agent</option>
                        <option value="router" ${node.type === 'router' ? 'selected' : ''}>Router</option>
                        <option value="memory" ${node.type === 'memory' ? 'selected' : ''}>Memory</option>
                        <option value="tool" ${node.type === 'tool' ? 'selected' : ''}>Tool</option>
                    </select>
                </div>
                <div class="editor-field">
                    <label>Status:</label>
                    <span>${node.status}</span>
                </div>
                <div class="editor-actions">
                    <button id="save-node">Save</button>
                    <button id="cancel-edit">Cancel</button>
                </div>
            </div>
        `;
        
        this.showModal('Node Editor', editorHTML);
    }
    
    deleteNode(node) {
        const index = this.workflowNodes.indexOf(node);
        if (index > -1) {
            this.workflowNodes.splice(index, 1);
            this.generateConnections();
            this.ali.renderCurrentMode();
            this.showNotification(`Node "${node.name}" deleted`, 'info');
        }
    }
    
    createNewNode() {
        const newNode = {
            id: `node_${Date.now()}`,
            type: 'agent',
            name: 'NEW_AGENT',
            x: 400,
            y: 300,
            width: 140,
            height: 60,
            status: 'idle',
            connections: []
        };
        
        this.workflowNodes.push(newNode);
        this.ali.renderCurrentMode();
        this.showNotification('New node created', 'success');
    }
    
    saveWorkflow() {
        const workflowData = {
            nodes: this.workflowNodes,
            connections: this.connections,
            metadata: {
                name: 'ALI Workflow',
                version: '1.0',
                created: new Date().toISOString(),
                creator: 'Ghost-Runner\'s Deck'
            }
        };
        
        const blob = new Blob([JSON.stringify(workflowData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ali-workflow-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Workflow saved successfully', 'success');
    }
    
    // Dialog and modal methods
    
    async showAgentCreationDialog() {
        return new Promise((resolve) => {
            const dialogHTML = `
                <div class="agent-creation-dialog">
                    <h3>Create New Agent</h3>
                    <div class="field-group">
                        <label>Agent Name:</label>
                        <input type="text" id="agent-name" placeholder="e.g., SecurityAgent">
                    </div>
                    <div class="field-group">
                        <label>Agent Type:</label>
                        <select id="agent-type">
                            <option value="analyzer">Analyzer</option>
                            <option value="creative">Creative</option>
                            <option value="critic">Critic</option>
                            <option value="specialist">Specialist</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label>System Prompt:</label>
                        <textarea id="system-prompt" rows="4" placeholder="Define the agent's role and behavior..."></textarea>
                    </div>
                    <div class="field-group">
                        <label>Temperature:</label>
                        <input type="range" id="temperature" min="0" max="1" step="0.1" value="0.5">
                        <span id="temp-value">0.5</span>
                    </div>
                    <div class="dialog-actions">
                        <button id="create-agent-confirm">Create Agent</button>
                        <button id="create-agent-cancel">Cancel</button>
                    </div>
                </div>
            `;
            
            this.showModal('Create New Agent', dialogHTML);
            
            document.getElementById('temperature').addEventListener('input', (e) => {
                document.getElementById('temp-value').textContent = e.target.value;
            });
            
            document.getElementById('create-agent-confirm').addEventListener('click', () => {
                const config = {
                    name: document.getElementById('agent-name').value || 'NewAgent',
                    type: document.getElementById('agent-type').value,
                    systemPrompt: document.getElementById('system-prompt').value,
                    temperature: parseFloat(document.getElementById('temperature').value)
                };
                
                this.hideModal();
                resolve(config);
            });
            
            document.getElementById('create-agent-cancel').addEventListener('click', () => {
                this.hideModal();
                resolve(null);
            });
        });
    }
    
    showVectorStoreDialog() {
        const dialogHTML = `
            <div class="vector-store-dialog">
                <h3>Emotional Memory Vector Store</h3>
                <div class="store-stats">
                    <div class="stat-item">
                        <label>Total Memories:</label>
                        <span>${this.ali.emotionalMemory.length}</span>
                    </div>
                    <div class="stat-item">
                        <label>Context Window:</label>
                        <span>${this.ali.contextWindow.length}</span>
                    </div>
                    <div class="stat-item">
                        <label>Session ID:</label>
                        <span>${this.ali.sessionId}</span>
                    </div>
                </div>
                <div class="memory-list">
                    ${this.ali.emotionalMemory.slice(-10).map(memory => `
                        <div class="memory-item">
                            <div class="memory-input">${memory.input}</div>
                            <div class="memory-emotions">${Object.keys(memory.emotions).filter(e => memory.emotions[e]).join(', ')}</div>
                            <div class="memory-time">${new Date(memory.timestamp).toLocaleString()}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="dialog-actions">
                    <button id="clear-memory">Clear Memory</button>
                    <button id="export-memory">Export</button>
                    <button id="close-vector">Close</button>
                </div>
            </div>
        `;
        
        this.showModal('Vector Store Management', dialogHTML);
        
        document.getElementById('clear-memory').addEventListener('click', () => {
            this.ali.emotionalMemory = [];
            this.ali.contextWindow = [];
            this.showNotification('Emotional memory cleared', 'info');
            this.hideModal();
        });
        
        document.getElementById('export-memory').addEventListener('click', () => {
            const data = {
                emotionalMemory: this.ali.emotionalMemory,
                contextWindow: this.ali.contextWindow,
                exported: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ali-memory-${Date.now()}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showNotification('Memory exported successfully', 'success');
        });
        
        document.getElementById('close-vector').addEventListener('click', () => {
            this.hideModal();
        });
    }
    
    showModal(title, content) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('ghost-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ghost-modal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <h3>${title}</h3>
                ${content}
            </div>
        `;
        
        modal.classList.remove('hidden');
    }
    
    hideModal() {
        const modal = document.getElementById('ghost-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-message">${message}</span>
            <button class="notification-close">×</button>
        `;
        
        // Style based on type
        const colors = {
            success: '#00ff41',
            error: '#ff0040',
            warning: '#ff8000',
            info: '#00ffff'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid ${colors[type] || colors.info};
            color: ${colors[type] || colors.info};
            padding: 1rem;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.9rem;
            z-index: 3000;
            max-width: 300px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
    
    // Workflow analysis and optimization
    
    analyzeWorkflow() {
        const analysis = {
            totalNodes: this.workflowNodes.length,
            activeNodes: this.workflowNodes.filter(n => n.status === 'processing').length,
            totalConnections: this.connections.length,
            criticalPath: this.findCriticalPath(),
            bottlenecks: this.identifyBottlenecks(),
            suggestions: this.generateOptimizations()
        };
        
        console.log('📊 Workflow Analysis:', analysis);
        return analysis;
    }
    
    findCriticalPath() {
        // Find the longest path from input to output
        const inputNode = this.workflowNodes.find(n => n.type === 'input');
        const outputNode = this.workflowNodes.find(n => n.type === 'output');
        
        if (!inputNode || !outputNode) return [];
        
        // Simple path finding (could be enhanced with proper algorithms)
        return ['input', 'router', 'synthesizer', 'output'];
    }
    
    identifyBottlenecks() {
        // Identify nodes with high connection count or processing delays
        return this.workflowNodes.filter(node => {
            const incomingConnections = this.connections.filter(c => c.to.id === node.id).length;
            const outgoingConnections = this.connections.filter(c => c.from.id === node.id).length;
            
            return incomingConnections > 2 || outgoingConnections > 3;
        }).map(node => node.name);
    }
    
    generateOptimizations() {
        const suggestions = [];
        
        // Check for isolated nodes
        const isolatedNodes = this.workflowNodes.filter(node => {
            const hasConnections = this.connections.some(c => c.from.id === node.id || c.to.id === node.id);
            return !hasConnections && node.type !== 'input' && node.type !== 'output';
        });
        
        if (isolatedNodes.length > 0) {
            suggestions.push('Consider connecting or removing isolated nodes');
        }
        
        // Check for redundant agents
        const agentTypes = this.workflowNodes.filter(n => n.type === 'agent').map(n => n.agent);
        const duplicateTypes = agentTypes.filter((type, index) => agentTypes.indexOf(type) !== index);
        
        if (duplicateTypes.length > 0) {
            suggestions.push('Consider consolidating duplicate agent types');
        }
        
        return suggestions;
    }
}

// Export for use in other modules
window.GhostDeck = GhostDeck;
