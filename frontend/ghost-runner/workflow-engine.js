/**
 * Workflow Engine - 3D Workflow Visualization for Ghost-Runner's Deck
 */

class WorkflowEngine {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Workflow data
        this.nodes = new Map();
        this.connections = new Map();
        this.selectedNode = null;
        
        // Three.js objects
        this.nodeObjects = new Map();
        this.connectionObjects = new Map();
        
        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDragging = false;
        this.dragStartPosition = new THREE.Vector3();
        
        this.init();
    }
    
    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.setupControls();
        this.setupEventListeners();
        this.createInitialNodes();
        this.startRenderLoop();
        
        console.log('Workflow Engine initialized');
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Add subtle fog for depth
        this.scene.fog = new THREE.Fog(0x000000, 50, 200);
        
        // Add grid
        this.createGrid();
    }
    
    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 20, 30);
        this.camera.lookAt(0, 0, 0);
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);
        
        // Main directional light
        const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Accent lights
        const accentLight1 = new THREE.PointLight(0xff6b35, 0.5, 50);
        accentLight1.position.set(-20, 10, -20);
        this.scene.add(accentLight1);
        
        const accentLight2 = new THREE.PointLight(0x00ff41, 0.3, 30);
        accentLight2.position.set(20, 5, 20);
        this.scene.add(accentLight2);
    }
    
    setupControls() {
        // Simple orbital controls implementation
        this.controls = {
            enabled: true,
            rotateSpeed: 0.005,
            zoomSpeed: 0.1,
            panSpeed: 0.01,
            
            isRotating: false,
            isPanning: false,
            isZooming: false,
            
            lastMouse: { x: 0, y: 0 },
            target: new THREE.Vector3(0, 0, 0),
            spherical: new THREE.Spherical(),
            
            update: () => {
                this.camera.lookAt(this.controls.target);
            }
        };
        
        // Initialize spherical coordinates
        const offset = new THREE.Vector3();
        offset.copy(this.camera.position).sub(this.controls.target);
        this.controls.spherical.setFromVector3(offset);
    }
    
    setupEventListeners() {
        const canvas = this.renderer.domElement;
        
        // Mouse events
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onWheel.bind(this));
        canvas.addEventListener('click', this.onClick.bind(this));
        
        // Resize handler
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Context menu prevention
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    createGrid() {
        // Create holographic grid
        const gridSize = 100;
        const gridDivisions = 20;
        
        const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x003333);
        grid.material.opacity = 0.3;
        grid.material.transparent = true;
        this.scene.add(grid);
        
        // Add vertical grid
        const verticalGrid = new THREE.GridHelper(gridSize, gridDivisions, 0x00ffff, 0x003333);
        verticalGrid.rotateX(Math.PI / 2);
        verticalGrid.material.opacity = 0.1;
        verticalGrid.material.transparent = true;
        this.scene.add(verticalGrid);
    }
    
    createInitialNodes() {
        // Create sample workflow nodes
        const sampleNodes = [
            {
                id: 'input-01',
                type: 'input',
                position: { x: -15, y: 2, z: 0 },
                label: 'Data Input',
                status: 'active'
            },
            {
                id: 'process-01',
                type: 'process',
                position: { x: -5, y: 2, z: 0 },
                label: 'Analysis',
                status: 'active'
            },
            {
                id: 'decision-01',
                type: 'decision',
                position: { x: 5, y: 2, z: 0 },
                label: 'Validate',
                status: 'processing'
            },
            {
                id: 'output-01',
                type: 'output',
                position: { x: 15, y: 2, z: 5 },
                label: 'Result',
                status: 'idle'
            },
            {
                id: 'daemon-01',
                type: 'daemon',
                position: { x: 0, y: 8, z: -10 },
                label: 'BUG-EATER',
                status: 'active'
            }
        ];
        
        sampleNodes.forEach(nodeData => {
            this.createNode(nodeData);
        });
        
        // Create connections
        this.createConnection('input-01', 'process-01');
        this.createConnection('process-01', 'decision-01');
        this.createConnection('decision-01', 'output-01');
        this.createConnection('daemon-01', 'process-01');
        
        this.updateNodeCount();
    }
    
    createNode(nodeData) {
        const node = {
            id: nodeData.id,
            type: nodeData.type,
            position: nodeData.position,
            label: nodeData.label,
            status: nodeData.status || 'idle',
            properties: nodeData.properties || {}
        };
        
        this.nodes.set(node.id, node);
        
        // Create 3D object
        const nodeObject = this.createNodeObject(node);
        this.nodeObjects.set(node.id, nodeObject);
        this.scene.add(nodeObject);
    }
    
    createNodeObject(node) {
        const group = new THREE.Group();
        group.userData = { nodeId: node.id };
        
        // Node geometry based on type
        let geometry, material;
        
        switch (node.type) {
            case 'input':
                geometry = new THREE.CylinderGeometry(1, 1.5, 2, 8);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x00ff41,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'process':
                geometry = new THREE.BoxGeometry(2.5, 2, 2.5);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x00ffff,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'decision':
                geometry = new THREE.OctahedronGeometry(1.5);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xffaa00,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'output':
                geometry = new THREE.ConeGeometry(1.5, 3, 6);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0xff6b35,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'daemon':
                geometry = new THREE.SphereGeometry(2, 16, 16);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x9966ff,
                    transparent: true,
                    opacity: 0.7
                });
                break;
                
            default:
                geometry = new THREE.BoxGeometry(2, 2, 2);
                material = new THREE.MeshPhongMaterial({ 
                    color: 0x666666,
                    transparent: true,
                    opacity: 0.8
                });
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        
        // Add wireframe
        const wireframe = new THREE.WireframeGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({ 
            color: material.color,
            transparent: true,
            opacity: 0.3
        });
        const wireframeMesh = new THREE.LineSegments(wireframe, wireframeMaterial);
        group.add(wireframeMesh);
        
        // Add status indicator
        const statusGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const statusColor = this.getStatusColor(node.status);
        const statusMaterial = new THREE.MeshBasicMaterial({ 
            color: statusColor,
            transparent: true,
            opacity: 0.9
        });
        const statusMesh = new THREE.Mesh(statusGeometry, statusMaterial);
        statusMesh.position.set(0, 2, 0);
        group.add(statusMesh);
        
        // Add glow effect for active nodes
        if (node.status === 'active' || node.status === 'processing') {
            const glowGeometry = geometry.clone();
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: material.color,
                transparent: true,
                opacity: 0.1,
                side: THREE.BackSide
            });
            const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
            glowMesh.scale.multiplyScalar(1.2);
            group.add(glowMesh);
        }
        
        // Position the node
        group.position.set(node.position.x, node.position.y, node.position.z);
        
        // Add floating animation for active nodes
        if (node.status === 'active') {
            this.addFloatingAnimation(group);
        }
        
        return group;
    }
    
    createConnection(fromNodeId, toNodeId) {
        const fromNode = this.nodes.get(fromNodeId);
        const toNode = this.nodes.get(toNodeId);
        
        if (!fromNode || !toNode) return;
        
        const connectionId = `${fromNodeId}-${toNodeId}`;
        const connection = {
            id: connectionId,
            from: fromNodeId,
            to: toNodeId,
            active: true
        };
        
        this.connections.set(connectionId, connection);
        
        // Create 3D connection line
        const connectionObject = this.createConnectionObject(fromNode, toNode);
        this.connectionObjects.set(connectionId, connectionObject);
        this.scene.add(connectionObject);
    }
    
    createConnectionObject(fromNode, toNode) {
        const points = [];
        points.push(new THREE.Vector3(fromNode.position.x, fromNode.position.y, fromNode.position.z));
        points.push(new THREE.Vector3(toNode.position.x, toNode.position.y, toNode.position.z));
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00ffff,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        
        // Add data flow animation
        this.addDataFlowAnimation(line);
        
        return line;
    }
    
    addFloatingAnimation(nodeObject) {
        const originalY = nodeObject.position.y;
        let time = Math.random() * Math.PI * 2;
        
        const animate = () => {
            time += 0.02;
            nodeObject.position.y = originalY + Math.sin(time) * 0.3;
            nodeObject.rotation.y += 0.01;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    addDataFlowAnimation(connectionLine) {
        // Create flowing particles along the connection
        const particleCount = 5;
        const particles = new THREE.Group();
        
        for (let i = 0; i < particleCount; i++) {
            const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const particleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x00ffff,
                transparent: true,
                opacity: 0.8
            });
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);
            particles.add(particle);
        }
        
        connectionLine.add(particles);
        
        // Animate particles
        let time = 0;
        const animate = () => {
            time += 0.02;
            
            particles.children.forEach((particle, index) => {
                const progress = (time + index * 0.2) % 1;
                const points = connectionLine.geometry.attributes.position.array;
                
                const startX = points[0];
                const startY = points[1];
                const startZ = points[2];
                const endX = points[3];
                const endY = points[4];
                const endZ = points[5];
                
                particle.position.x = startX + (endX - startX) * progress;
                particle.position.y = startY + (endY - startY) * progress;
                particle.position.z = startZ + (endZ - startZ) * progress;
                
                particle.material.opacity = Math.sin(progress * Math.PI) * 0.8;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    getStatusColor(status) {
        const colors = {
            'active': 0x00ff41,
            'processing': 0xffaa00,
            'idle': 0x666666,
            'error': 0xff3333,
            'completed': 0x00ffff
        };
        
        return colors[status] || colors.idle;
    }
    
    // Event Handlers
    
    onMouseDown(event) {
        event.preventDefault();
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.controls.lastMouse.x = event.clientX;
        this.controls.lastMouse.y = event.clientY;
        
        if (event.button === 0) { // Left mouse button
            this.controls.isRotating = true;
        } else if (event.button === 2) { // Right mouse button
            this.controls.isPanning = true;
        }
    }
    
    onMouseMove(event) {
        if (!this.controls.enabled) return;
        
        const deltaX = event.clientX - this.controls.lastMouse.x;
        const deltaY = event.clientY - this.controls.lastMouse.y;
        
        if (this.controls.isRotating) {
            // Orbital rotation
            this.controls.spherical.theta -= deltaX * this.controls.rotateSpeed;
            this.controls.spherical.phi += deltaY * this.controls.rotateSpeed;
            
            // Constrain phi
            this.controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.controls.spherical.phi));
            
            // Update camera position
            const offset = new THREE.Vector3();
            offset.setFromSpherical(this.controls.spherical);
            this.camera.position.copy(this.controls.target).add(offset);
            this.camera.lookAt(this.controls.target);
        }
        
        if (this.controls.isPanning) {
            // Pan the target
            const panX = -deltaX * this.controls.panSpeed;
            const panY = deltaY * this.controls.panSpeed;
            
            const cameraRight = new THREE.Vector3();
            const cameraUp = new THREE.Vector3();
            
            cameraRight.setFromMatrixColumn(this.camera.matrix, 0);
            cameraUp.setFromMatrixColumn(this.camera.matrix, 1);
            
            this.controls.target.addScaledVector(cameraRight, panX);
            this.controls.target.addScaledVector(cameraUp, panY);
            
            this.camera.position.addScaledVector(cameraRight, panX);
            this.camera.position.addScaledVector(cameraUp, panY);
        }
        
        this.controls.lastMouse.x = event.clientX;
        this.controls.lastMouse.y = event.clientY;
    }
    
    onMouseUp(event) {
        this.controls.isRotating = false;
        this.controls.isPanning = false;
    }
    
    onWheel(event) {
        event.preventDefault();
        
        const scale = event.deltaY > 0 ? 1.1 : 0.9;
        this.controls.spherical.radius *= scale;
        this.controls.spherical.radius = Math.max(5, Math.min(100, this.controls.spherical.radius));
        
        // Update camera position
        const offset = new THREE.Vector3();
        offset.setFromSpherical(this.controls.spherical);
        this.camera.position.copy(this.controls.target).add(offset);
    }
    
    onClick(event) {
        event.preventDefault();
        
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Raycast for node selection
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const nodeObjects = Array.from(this.nodeObjects.values());
        const intersects = this.raycaster.intersectObjects(nodeObjects, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object.parent;
            const nodeId = clickedObject.userData.nodeId;
            this.selectNode(nodeId);
        } else {
            this.deselectNode();
        }
    }
    
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    // Node Management
    
    selectNode(nodeId) {
        // Deselect previous node
        if (this.selectedNode) {
            const prevNodeObject = this.nodeObjects.get(this.selectedNode);
            if (prevNodeObject) {
                this.setNodeSelected(prevNodeObject, false);
            }
        }
        
        // Select new node
        this.selectedNode = nodeId;
        const nodeObject = this.nodeObjects.get(nodeId);
        if (nodeObject) {
            this.setNodeSelected(nodeObject, true);
        }
        
        // Update inspector
        this.updateInspector(nodeId);
        
        // Dispatch event
        this.dispatchEvent('nodeSelected', { nodeId, node: this.nodes.get(nodeId) });
    }
    
    deselectNode() {
        if (this.selectedNode) {
            const nodeObject = this.nodeObjects.get(this.selectedNode);
            if (nodeObject) {
                this.setNodeSelected(nodeObject, false);
            }
            this.selectedNode = null;
        }
        
        // Clear inspector
        this.clearInspector();
        
        // Dispatch event
        this.dispatchEvent('nodeDeselected', {});
    }
    
    setNodeSelected(nodeObject, selected) {
        const mesh = nodeObject.children[0]; // Main mesh
        
        if (selected) {
            mesh.material.emissive.setHex(0x333333);
            nodeObject.scale.setScalar(1.1);
        } else {
            mesh.material.emissive.setHex(0x000000);
            nodeObject.scale.setScalar(1.0);
        }
    }
    
    updateInspector(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // This will be called by the main Ghost Runner application
        this.dispatchEvent('updateInspector', { node });
    }
    
    clearInspector() {
        this.dispatchEvent('clearInspector', {});
    }
    
    updateNodeCount() {
        const nodeCountElement = document.getElementById('nodeCount');
        if (nodeCountElement) {
            nodeCountElement.textContent = this.nodes.size;
        }
    }
    
    // Public Methods
    
    addNode(nodeData) {
        this.createNode(nodeData);
        this.updateNodeCount();
    }
    
    removeNode(nodeId) {
        // Remove connections
        const connectionsToRemove = [];
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                connectionsToRemove.push(id);
            }
        });
        
        connectionsToRemove.forEach(id => {
            const connectionObject = this.connectionObjects.get(id);
            if (connectionObject) {
                this.scene.remove(connectionObject);
                this.connectionObjects.delete(id);
            }
            this.connections.delete(id);
        });
        
        // Remove node
        const nodeObject = this.nodeObjects.get(nodeId);
        if (nodeObject) {
            this.scene.remove(nodeObject);
            this.nodeObjects.delete(nodeId);
        }
        this.nodes.delete(nodeId);
        
        // Deselect if selected
        if (this.selectedNode === nodeId) {
            this.deselectNode();
        }
        
        this.updateNodeCount();
    }
    
    resetView() {
        this.camera.position.set(0, 20, 30);
        this.controls.target.set(0, 0, 0);
        this.controls.spherical.setFromVector3(new THREE.Vector3(0, 20, 30));
        this.camera.lookAt(this.controls.target);
    }
    
    // Event System
    
    dispatchEvent(type, data) {
        const event = new CustomEvent(type, { detail: data });
        document.dispatchEvent(event);
    }
    
    // Render Loop
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        animate();
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    // Cleanup
    
    destroy() {
        if (this.renderer) {
            this.renderer.dispose();
            this.container.removeChild(this.renderer.domElement);
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}

// Export for use in other modules
window.WorkflowEngine = WorkflowEngine;
