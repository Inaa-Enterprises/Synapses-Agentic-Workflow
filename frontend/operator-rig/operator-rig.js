/**
 * The Operator's Rig - Main Application Logic
 */

class OperatorRig {
    constructor() {
        this.terminal = null;
        this.vitalsInterval = null;
        this.audioVisualizerInterval = null;
        
        this.init();
    }
    
    async init() {
        // Show boot sequence
        await this.showBootSequence();
        
        // Initialize main interface
        this.initMainInterface();
        
        // Initialize terminal
        this.terminal = new TerminalEngine();
        
        // Start system monitoring
        this.startVitalsMonitoring();
        this.startAudioVisualizer();
        
        // Setup Ghost Runner access
        this.setupGhostRunnerAccess();
        
        console.log('The Operator\'s Rig initialized');
    }
    
    async showBootSequence() {
        const bootSequence = document.getElementById('bootSequence');
        const bootLines = bootSequence.querySelectorAll('.boot-line');
        
        // Wait for boot animation to complete
        await this.sleep(5500);
        
        // Add glitch effect before transition
        bootSequence.classList.add('glitch');
        await this.sleep(200);
        
        // Fade out boot sequence
        bootSequence.style.opacity = '0';
        bootSequence.style.transition = 'opacity 0.5s ease-out';
        
        await this.sleep(500);
        
        // Show main interface
        document.getElementById('mainInterface').style.display = 'block';
        document.getElementById('mainInterface').style.opacity = '0';
        document.getElementById('mainInterface').style.transition = 'opacity 0.5s ease-in';
        
        await this.sleep(100);
        
        document.getElementById('mainInterface').style.opacity = '1';
        
        // Remove boot sequence from DOM
        setTimeout(() => {
            bootSequence.remove();
        }, 1000);
    }
    
    initMainInterface() {
        // Initialize time display
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
        
        // Initialize CRT effects
        this.initCRTEffects();
        
        // Initialize glitch effects
        this.initGlitchEffects();
        
        // Focus on command input
        setTimeout(() => {
            const commandInput = document.getElementById('commandInput');
            if (commandInput) {
                commandInput.focus();
            }
        }, 1000);
    }
    
    initCRTEffects() {
        // Add subtle flicker to the screen (reduced intensity)
        setInterval(() => {
            if (Math.random() < 0.005) { // 0.5% chance every interval
                const mainInterface = document.querySelector('.main-interface');
                mainInterface.style.filter = 'brightness(1.05) contrast(1.02)';
                
                setTimeout(() => {
                    mainInterface.style.filter = 'brightness(1) contrast(1)';
                }, 50);
            }
        }, 2000);
        
        // Add scan line effect
        const scanLine = document.createElement('div');
        scanLine.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff41, transparent);
            z-index: 1000;
            pointer-events: none;
            animation: scanLineMove 3s linear infinite;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scanLineMove {
                0% { top: -2px; opacity: 0; }
                5% { opacity: 1; }
                95% { opacity: 1; }
                100% { top: 100vh; opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(scanLine);
    }
    
    initGlitchEffects() {
        // Reduced text glitches
        setInterval(() => {
            if (Math.random() < 0.002) { // 0.2% chance
                const textElements = document.querySelectorAll('.terminal-line .message, .vitals-value, .status-value');
                if (textElements.length > 0) {
                    const randomElement = textElements[Math.floor(Math.random() * textElements.length)];
                    this.applyGlitchEffect(randomElement);
                }
            }
        }, 5000);
    }
    
    applyGlitchEffect(element) {
        const originalText = element.textContent;
        const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`';
        
        // Create glitched version
        let glitchedText = '';
        for (let i = 0; i < originalText.length; i++) {
            if (Math.random() < 0.3) {
                glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
            } else {
                glitchedText += originalText[i];
            }
        }
        
        // Apply glitch
        element.textContent = glitchedText;
        element.style.color = '#ff0000';
        element.style.textShadow = '0 0 10px #ff0000';
        
        // Restore original after short delay
        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = '';
            element.style.textShadow = '';
        }, 100);
    }
    
    startVitalsMonitoring() {
        this.vitalsInterval = setInterval(() => {
            this.updateVitals();
        }, 2000);
    }
    
    updateVitals() {
        // Update core temperature (fluctuate around 98.6)
        const coreTemp = document.getElementById('coreTemp');
        const baseTemp = 98.6;
        const variation = (Math.random() - 0.5) * 2; // ±1 degree
        const newTemp = (baseTemp + variation).toFixed(1);
        coreTemp.textContent = `${newTemp}°`;
        
        // Update memory usage (fluctuate around 74%)
        const memUsage = document.getElementById('memUsage');
        const baseMem = 74;
        const memVariation = Math.floor((Math.random() - 0.5) * 10); // ±5%
        const newMem = Math.max(60, Math.min(85, baseMem + memVariation));
        memUsage.textContent = `${newMem}%`;
        
        // Occasionally change network status
        const networkStatus = document.getElementById('networkStatus');
        if (Math.random() < 0.05) { // 5% chance
            networkStatus.textContent = '[SYNCING]';
            networkStatus.className = 'vitals-value status-warning';
            
            setTimeout(() => {
                networkStatus.textContent = '[ONLINE]';
                networkStatus.className = 'vitals-value status-online';
            }, 2000);
        }
    }
    
    startAudioVisualizer() {
        const audioBars = document.querySelectorAll('.audio-bar');
        
        this.audioVisualizerInterval = setInterval(() => {
            audioBars.forEach((bar, index) => {
                const height = Math.random() * 35 + 5; // 5-40px
                bar.style.height = `${height}px`;
                
                // Occasionally spike a bar for dramatic effect
                if (Math.random() < 0.1) {
                    bar.style.height = '40px';
                    bar.style.boxShadow = '0 0 15px #00ff41';
                    
                    setTimeout(() => {
                        bar.style.boxShadow = '0 0 5px #00ff41';
                    }, 200);
                }
            });
        }, 150);
    }
    
    setupGhostRunnerAccess() {
        const ghostRunnerBtn = document.getElementById('ghostRunnerBtn');
        
        ghostRunnerBtn.addEventListener('click', () => {
            this.accessGhostRunner();
        });
        
        // Add hover sound effect simulation
        ghostRunnerBtn.addEventListener('mouseenter', () => {
            // Simulate hover effect with visual feedback
            ghostRunnerBtn.style.animation = 'pulse 0.5s ease-in-out';
        });
        
        ghostRunnerBtn.addEventListener('mouseleave', () => {
            ghostRunnerBtn.style.animation = '';
        });
    }
    
    async accessGhostRunner() {
        const ghostRunnerBtn = document.getElementById('ghostRunnerBtn');
        
        // Disable button during transition
        ghostRunnerBtn.disabled = true;
        ghostRunnerBtn.style.opacity = '0.5';
        
        // Show transition effect
        const mainInterface = document.querySelector('.main-interface');
        
        // Add transition effects
        mainInterface.style.filter = 'hue-rotate(90deg) saturate(2)';
        
        await this.sleep(500);
        
        // Simulate interface switch
        if (this.terminal) {
            this.terminal.addTerminalLine('system', 'Switching to Ghost-Runner interface...');
            await this.sleep(1000);
            this.terminal.addTerminalLine('system', 'Interface transition initiated.');
        }
        
        await this.sleep(500);
        
        // Redirect to Ghost-Runner interface
        window.location.href = '../ghost-runner/index.html';
    }
    
    updateTime() {
        const timeElement = document.getElementById('currentTime');
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit'
        });
        timeElement.textContent = timeString;
    }
    
    // System control methods
    
    enterMaintenanceMode() {
        if (this.terminal) {
            this.terminal.addTerminalLine('system', 'Entering maintenance mode...');
        }
        
        // Stop monitoring
        if (this.vitalsInterval) {
            clearInterval(this.vitalsInterval);
        }
        
        if (this.audioVisualizerInterval) {
            clearInterval(this.audioVisualizerInterval);
        }
        
        // Dim interface
        const mainInterface = document.querySelector('.main-interface');
        mainInterface.style.opacity = '0.5';
        mainInterface.style.filter = 'grayscale(1)';
    }
    
    exitMaintenanceMode() {
        if (this.terminal) {
            this.terminal.addTerminalLine('system', 'Exiting maintenance mode...');
        }
        
        // Resume monitoring
        this.startVitalsMonitoring();
        this.startAudioVisualizer();
        
        // Restore interface
        const mainInterface = document.querySelector('.main-interface');
        mainInterface.style.opacity = '1';
        mainInterface.style.filter = '';
    }
    
    emergencyShutdown() {
        if (this.terminal) {
            this.terminal.addTerminalLine('error', 'EMERGENCY SHUTDOWN INITIATED');
        }
        
        // Stop all intervals
        if (this.vitalsInterval) clearInterval(this.vitalsInterval);
        if (this.audioVisualizerInterval) clearInterval(this.audioVisualizerInterval);
        
        // Red alert effect
        const mainInterface = document.querySelector('.main-interface');
        mainInterface.style.filter = 'hue-rotate(320deg) saturate(2) brightness(0.8)';
        
        // Flash effect
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            mainInterface.style.opacity = mainInterface.style.opacity === '0.3' ? '1' : '0.3';
            flashCount++;
            
            if (flashCount >= 10) {
                clearInterval(flashInterval);
                mainInterface.style.opacity = '0';
                
                setTimeout(() => {
                    document.body.innerHTML = `
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            font-family: 'Orbitron', monospace;
                            color: #ff3333;
                            font-size: 24px;
                            text-shadow: 0 0 20px #ff3333;
                            background: #000;
                        ">
                            SYSTEM OFFLINE
                        </div>
                    `;
                }, 1000);
            }
        }, 200);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.operatorRig = new OperatorRig();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Operator Rig Error:', event.error);
    
    if (window.operatorRig && window.operatorRig.terminal) {
        window.operatorRig.terminal.addTerminalLine('error', `System Error: ${event.error.message}`);
    }
});

// Prevent accidental navigation
window.addEventListener('beforeunload', (event) => {
    event.preventDefault();
    event.returnValue = 'Are you sure you want to disconnect from ALI?';
});
