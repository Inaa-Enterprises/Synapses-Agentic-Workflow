/**
 * The Ghost-Runner's Deck - Main Application Logic
 */

class GhostRunnerDeck {
    constructor() {
        this.workflowEngine = null;
        this.selectedDaemon = null;
        this.logPaused = false;
        this.daemonStats = new Map();
        
        this.init();
    }
    
    async init() {
        // Show loading
        this.showLoading();
        
        try {
            // Initialize workflow engine
            await this.initWorkflowEngine();
            
            // Setup UI components
            this.setupDaemonRoster();
            this.setupSystemLog();
            this.setupControls();
            this.setupInspector();
            
            // Start monitoring
            this.startDaemonMonitoring();
            this.startSystemMonitoring();
            
            // Hide loading
            this.hideLoading();
            
            console.log('Ghost-Runner\'s Deck initialized');
            
        } catch (error) {
            console.error('Failed to initialize Ghost-Runner\'s Deck:', error);
            this.showError('Failed to initialize interface');
        }
    }
    
    async initWorkflowEngine() {
        const canvasContainer = document.getElementById('workflowCanvas');
        
        // Initialize Three.js workflow engine
        this.workflowEngine = new WorkflowEngine(canvasContainer);
        
        // Setup event listeners for workflow events
        document.addEventListener('nodeSelected', this.onNodeSelected.bind(this));
        document.addEventListener('nodeDeselected', this.onNodeDeselected.bind(this));
        document.addEventListener('updateInspector', this.onUpdateInspector.bind(this));
        document.addEventListener('clearInspector', this.onClearInspector.bind(this));
        
        await this.sleep(1000); // Simulate initialization time
    }
    
    setupDaemonRoster() {
        const daemonItems = document.querySelectorAll('.daemon-item');
        
        daemonItems.forEach(item => {
            item.addEventListener('click', () => {
                this.selectDaemon(item.dataset.daemonId);
            });
        });
        
        // Initialize daemon stats
        this.daemonStats.set('bug-eater', {
            cpu: 35,
            memory: 4.1,
            status: 'active',
            tasks: 0,
            uptime: Date.now() - 3600000 // 1 hour ago
        });
        
        this.daemonStats.set('data-thief', {
            cpu: 12,
            memory: 2.3,
            status: 'idle',
            tasks: 0,
            uptime: Date.now() - 7200000 // 2 hours ago
        });
        
        this.daemonStats.set('net-spider', {
            cpu: 67,
            memory: 1.8,
            status: 'active',
            tasks: 0,
            uptime: Date.now() - 1800000 // 30 minutes ago
        });
    }
    
    setupSystemLog() {
        const logContent = document.getElementById('logContent');
        const clearLogBtn = document.getElementById('clearLogBtn');
        const pauseLogBtn = document.getElementById('pauseLogBtn');
        
        clearLogBtn.addEventListener('click', () => {
            this.clearLog();
        });
        
        pauseLogBtn.addEventListener('click', () => {
            this.toggleLogPause();
        });
        
        // Start log simulation
        this.startLogSimulation();
    }
    
    setupControls() {
        // Node creation
        const createDaemonBtn = document.getElementById('createDaemonBtn');
        const deployBtn = document.getElementById('deployBtn');
        const resetViewBtn = document.getElementById('resetViewBtn');
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        const returnToRigBtn = document.getElementById('returnToRigBtn');
        
        createDaemonBtn.addEventListener('click', () => {
            this.showNodeCreationModal();
        });
        
        deployBtn.addEventListener('click', () => {
            this.deployWorkflow();
        });
        
        resetViewBtn.addEventListener('click', () => {
            this.workflowEngine.resetView();
        });
        
        fullscreenBtn.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        returnToRigBtn.addEventListener('click', () => {
            this.returnToOperatorRig();
        });
        
        // Modal controls
        this.setupModalControls();
    }
    
    setupModalControls() {
        const modal = document.getElementById('nodeCreationModal');
        const closeModalBtn = document.getElementById('closeModalBtn');
        const cancelNodeBtn = document.getElementById('cancelNodeBtn');
        const confirmCreateBtn = document.getElementById('confirmCreateBtn');
        
        closeModalBtn.addEventListener('click', () => {
            this.hideNodeCreationModal();
        });
        
        cancelNodeBtn.addEventListener('click', () => {
            this.hideNodeCreationModal();
        });
        
        confirmCreateBtn.addEventListener('click', () => {
            this.createNewNode();
        });
        
        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideNodeCreationModal();
            }
        });
    }
    
    setupInspector() {
        // Inspector will be updated by workflow engine events
        this.clearInspector();
    }
    
    // Daemon Management
    
    selectDaemon(daemonId) {
        // Deselect previous daemon
        if (this.selectedDaemon) {
            const prevItem = document.querySelector(`[data-daemon-id="${this.selectedDaemon}"]`);
            if (prevItem) {
                prevItem.classList.remove('selected');
            }
        }
        
        // Select new daemon
        this.selectedDaemon = daemonId;
        const daemonItem = document.querySelector(`[data-daemon-id="${daemonId}"]`);
        if (daemonItem) {
            daemonItem.classList.add('selected');
        }
        
        // Update current target display
        const currentTarget = document.getElementById('currentTarget');
        if (currentTarget) {
            currentTarget.textContent = `${daemonId.toUpperCase()}.EXE`;
        }
        
        // Focus on daemon node in workflow
        this.focusOnDaemonNode(daemonId);
        
        // Log selection
        this.addLogEntry('info', `Daemon '${daemonId.toUpperCase()}' selected for monitoring.`);
    }
    
    focusOnDaemonNode(daemonId) {
        // Find the daemon node in the workflow
        const daemonNodeMap = {
            'bug-eater': 'daemon-01',
            'data-thief': 'data-thief-01',
            'net-spider': 'net-spider-01'
        };
        
        const nodeId = daemonNodeMap[daemonId];
        if (nodeId && this.workflowEngine) {
            this.workflowEngine.selectNode(nodeId);
        }
    }
    
    startDaemonMonitoring() {
        setInterval(() => {
            this.updateDaemonStats();
        }, 2000);
    }
    
    updateDaemonStats() {
        this.daemonStats.forEach((stats, daemonId) => {
            // Simulate CPU fluctuation
            if (stats.status === 'active') {
                stats.cpu += (Math.random() - 0.5) * 10;
                stats.cpu = Math.max(10, Math.min(90, stats.cpu));
            } else {
                stats.cpu += (Math.random() - 0.5) * 5;
                stats.cpu = Math.max(5, Math.min(25, stats.cpu));
            }
            
            // Simulate memory fluctuation
            stats.memory += (Math.random() - 0.5) * 0.2;
            stats.memory = Math.max(0.5, Math.min(8, stats.memory));
            
            // Update UI
            this.updateDaemonUI(daemonId, stats);
        });
        
        // Update active daemon count
        const activeDaemons = Array.from(this.daemonStats.values())
            .filter(stats => stats.status === 'active').length;
        
        const activeDaemonsElement = document.getElementById('activeDaemons');
        if (activeDaemonsElement) {
            activeDaemonsElement.textContent = activeDaemons;
        }
    }
    
    updateDaemonUI(daemonId, stats) {
        const daemonItem = document.querySelector(`[data-daemon-id="${daemonId}"]`);
        if (!daemonItem) return;
        
        const cpuValue = daemonItem.querySelector('.stat-value');
        const memoryValue = daemonItem.querySelectorAll('.stat-value')[1];
        
        if (cpuValue) cpuValue.textContent = `${Math.round(stats.cpu)}%`;
        if (memoryValue) memoryValue.textContent = `${stats.memory.toFixed(1)}GB`;
        
        // Update status indicator
        const statusIndicator = daemonItem.querySelector('.daemon-status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `daemon-status-indicator ${stats.status}`;
        }
    }
    
    // System Monitoring
    
    startSystemMonitoring() {
        // Simulate intrusion detection
        setInterval(() => {
            if (Math.random() < 0.02) { // 2% chance
                this.simulateIntrusionAttempt();
            }
        }, 5000);
        
        // Update system stats
        setInterval(() => {
            this.updateSystemStats();
        }, 3000);
    }
    
    simulateIntrusionAttempt() {
        const intrusionCount = document.getElementById('intrusionCount');
        if (intrusionCount) {
            const currentCount = parseInt(intrusionCount.textContent) || 0;
            intrusionCount.textContent = currentCount + 1;
            
            // Flash effect
            const header = document.querySelector('.intrusion-status');
            header.style.animation = 'pulse 0.5s ease-in-out 3';
            
            setTimeout(() => {
                header.style.animation = '';
            }, 1500);
            
            // Log intrusion attempt
            this.addLogEntry('warning', `Intrusion attempt detected from IP 192.168.1.${Math.floor(Math.random() * 255)}`);
            this.addLogEntry('info', 'Countermeasures activated. Connection terminated.');
        }
    }
    
    updateSystemStats() {
        // This would update various system statistics
        // For now, just simulate some activity
        
        if (Math.random() < 0.3) { // 30% chance
            const activities = [
                'Memory optimization completed.',
                'Garbage collection cycle finished.',
                'Network buffer flushed.',
                'Cache coherency maintained.',
                'Process scheduling optimized.'
            ];
            
            const activity = activities[Math.floor(Math.random() * activities.length)];
            this.addLogEntry('info', activity);
        }
    }
    
    // System Log
    
    startLogSimulation() {
        if (this.logPaused) return;
        
        setTimeout(() => {
            if (!this.logPaused) {
                this.simulateLogEntry();
                this.startLogSimulation();
            }
        }, Math.random() * 3000 + 2000); // 2-5 seconds
    }
    
    simulateLogEntry() {
        const logTypes = [
            { type: 'info', messages: [
                'Daemon heartbeat received.',
                'Process execution completed successfully.',
                'Cache hit ratio: 94.7%',
                'Memory allocation optimized.',
                'Network latency: 12ms'
            ]},
            { type: 'warning', messages: [
                'High CPU usage detected on core 3.',
                'Memory usage approaching threshold.',
                'Network timeout on connection.',
                'Unusual pattern in data stream.'
            ]},
            { type: 'error', messages: [
                'Failed to establish connection to remote host.',
                'Process terminated unexpectedly.',
                'Authentication failure for user.',
                'Database query timeout.'
            ]}
        ];
        
        const typeData = logTypes[Math.floor(Math.random() * logTypes.length)];
        const message = typeData.messages[Math.floor(Math.random() * typeData.messages.length)];
        
        this.addLogEntry(typeData.type, message);
    }
    
    addLogEntry(type, message) {
        if (this.logPaused) return;
        
        const logContent = document.getElementById('logContent');
        if (!logContent) return;
        
        const logLine = document.createElement('div');
        logLine.className = `log-line ${type}`;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        logLine.innerHTML = `
            <span class="log-timestamp">${timestamp}:</span>
            <span class="log-message">${message}</span>
        `;
        
        logContent.appendChild(logLine);
        
        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
        
        // Limit log entries
        const logLines = logContent.querySelectorAll('.log-line');
        if (logLines.length > 100) {
            logLines[0].remove();
        }
    }
    
    clearLog() {
        const logContent = document.getElementById('logContent');
        if (logContent) {
            logContent.innerHTML = '';
        }
        
        this.addLogEntry('info', 'Log cleared by operator.');
    }
    
    toggleLogPause() {
        this.logPaused = !this.logPaused;
        
        const pauseBtn = document.getElementById('pauseLogBtn');
        if (pauseBtn) {
            pauseBtn.textContent = this.logPaused ? 'RESUME' : 'PAUSE';
        }
        
        if (!this.logPaused) {
            this.startLogSimulation();
            this.addLogEntry('info', 'Log monitoring resumed.');
        } else {
            this.addLogEntry('info', 'Log monitoring paused.');
        }
    }
    
    // Node Creation Modal
    
    showNodeCreationModal() {
        const modal = document.getElementById('nodeCreationModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Reset form
            document.getElementById('nodeTypeSelect').value = 'process';
            document.getElementById('nodeNameInput').value = '';
            document.getElementById('nodeDescInput').value = '';
            
            // Focus on name input
            setTimeout(() => {
                document.getElementById('nodeNameInput').focus();
            }, 100);
        }
    }
    
    hideNodeCreationModal() {
        const modal = document.getElementById('nodeCreationModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    createNewNode() {
        const nodeType = document.getElementById('nodeTypeSelect').value;
        const nodeName = document.getElementById('nodeNameInput').value.trim();
        const nodeDesc = document.getElementById('nodeDescInput').value.trim();
        
        if (!nodeName) {
            alert('Node name is required');
            return;
        }
        
        // Generate unique ID
        const nodeId = `${nodeType}-${Date.now()}`;
        
        // Create node data
        const nodeData = {
            id: nodeId,
            type: nodeType,
            label: nodeName,
            description: nodeDesc,
            position: {
                x: (Math.random() - 0.5) * 20,
                y: 2,
                z: (Math.random() - 0.5) * 20
            },
            status: 'idle',
            properties: {
                description: nodeDesc,
                created: new Date().toISOString(),
                creator: 'Ghost-Runner Interface'
            }
        };
        
        // Add to workflow
        this.workflowEngine.addNode(nodeData);
        
        // Hide modal
        this.hideNodeCreationModal();
        
        // Log creation
        this.addLogEntry('info', `Node '${nodeName}' created successfully.`);
        
        // Select the new node
        setTimeout(() => {
            this.workflowEngine.selectNode(nodeId);
        }, 500);
    }
    
    // Inspector Management
    
    onNodeSelected(event) {
        const { nodeId, node } = event.detail;
        this.updateInspector(node);
        this.addLogEntry('info', `Node '${node.label}' selected for inspection.`);
    }
    
    onNodeDeselected(event) {
        this.clearInspector();
    }
    
    onUpdateInspector(event) {
        const { node } = event.detail;
        this.updateInspector(node);
    }
    
    onClearInspector(event) {
        this.clearInspector();
    }
    
    updateInspector(node) {
        const inspectorContent = document.getElementById('inspectorContent');
        if (!inspectorContent) return;
        
        // Hide no-selection message
        const noSelection = inspectorContent.querySelector('.no-selection');
        if (noSelection) {
            noSelection.style.display = 'none';
        }
        
        // Create or update node details
        let nodeDetails = inspectorContent.querySelector('.node-details');
        if (!nodeDetails) {
            nodeDetails = document.createElement('div');
            nodeDetails.className = 'node-details';
            inspectorContent.appendChild(nodeDetails);
        }
        
        nodeDetails.style.display = 'block';
        nodeDetails.innerHTML = `
            <div class="node-property">
                <label class="property-label">Node ID:</label>
                <input type="text" class="property-value" value="${node.id}" readonly>
            </div>
            <div class="node-property">
                <label class="property-label">Node Type:</label>
                <input type="text" class="property-value" value="${node.type}" readonly>
            </div>
            <div class="node-property">
                <label class="property-label">Label:</label>
                <input type="text" class="property-value" value="${node.label}" onchange="window.ghostRunner.updateNodeProperty('${node.id}', 'label', this.value)">
            </div>
            <div class="node-property">
                <label class="property-label">Status:</label>
                <select class="property-value" onchange="window.ghostRunner.updateNodeProperty('${node.id}', 'status', this.value)">
                    <option value="idle" ${node.status === 'idle' ? 'selected' : ''}>Idle</option>
                    <option value="active" ${node.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="processing" ${node.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="error" ${node.status === 'error' ? 'selected' : ''}>Error</option>
                    <option value="completed" ${node.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            <div class="node-property">
                <label class="property-label">Position:</label>
                <input type="text" class="property-value" value="X: ${node.position.x.toFixed(1)}, Y: ${node.position.y.toFixed(1)}, Z: ${node.position.z.toFixed(1)}" readonly>
            </div>
            <div class="node-property">
                <label class="property-label">Description:</label>
                <textarea class="property-value" onchange="window.ghostRunner.updateNodeProperty('${node.id}', 'description', this.value)">${node.properties?.description || ''}</textarea>
            </div>
        `;
    }
    
    clearInspector() {
        const inspectorContent = document.getElementById('inspectorContent');
        if (!inspectorContent) return;
        
        // Show no-selection message
        const noSelection = inspectorContent.querySelector('.no-selection');
        if (noSelection) {
            noSelection.style.display = 'flex';
        }
        
        // Hide node details
        const nodeDetails = inspectorContent.querySelector('.node-details');
        if (nodeDetails) {
            nodeDetails.style.display = 'none';
        }
    }
    
    updateNodeProperty(nodeId, property, value) {
        const node = this.workflowEngine.nodes.get(nodeId);
        if (!node) return;
        
        if (property === 'label') {
            node.label = value;
        } else if (property === 'status') {
            node.status = value;
            // Update the 3D representation
            // This would require updating the node object in the scene
        } else if (property === 'description') {
            if (!node.properties) node.properties = {};
            node.properties.description = value;
        }
        
        this.addLogEntry('info', `Node '${node.label}' property '${property}' updated.`);
    }
    
    // Workflow Management
    
    deployWorkflow() {
        this.addLogEntry('info', 'Initiating workflow deployment...');
        
        // Simulate deployment process
        let progress = 0;
        const deploymentSteps = [
            'Validating workflow structure...',
            'Compiling execution graph...',
            'Allocating system resources...',
            'Initializing daemon processes...',
            'Establishing data connections...',
            'Deployment complete.'
        ];
        
        const deployStep = () => {
            if (progress < deploymentSteps.length) {
                this.addLogEntry('info', deploymentSteps[progress]);
                progress++;
                setTimeout(deployStep, 1000);
            }
        };
        
        deployStep();
    }
    
    // UI Controls
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    
    async returnToOperatorRig() {
        this.addLogEntry('info', 'Returning to Operator Rig interface...');
        
        // Add transition effect
        const interface = document.querySelector('.ghost-runner-interface');
        interface.style.filter = 'hue-rotate(-90deg) saturate(2)';
        
        await this.sleep(500);
        
        // Navigate back
        window.location.href = '../operator-rig/index.html';
    }
    
    // Utility Methods
    
    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }
    
    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    showError(message) {
        console.error('Ghost-Runner Error:', message);
        // In a real implementation, this would show a proper error UI
        alert(`Error: ${message}`);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.ghostRunner = new GhostRunnerDeck();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Ghost-Runner Error:', event.error);
    
    if (window.ghostRunner) {
        window.ghostRunner.addLogEntry('error', `System Error: ${event.error.message}`);
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause some animations when tab is not visible
        console.log('Ghost-Runner paused (tab hidden)');
    } else {
        // Resume animations when tab becomes visible
        console.log('Ghost-Runner resumed (tab visible)');
    }
});
