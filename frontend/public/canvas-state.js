// State manager for workflow canvas (Ghost-Runner's Deck)

class CanvasStateManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.edges = [];
    this.selectedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this._shiftDrag = null;
    this._initListeners();
    this._resizeCanvas();
    window.addEventListener('resize', () => this._resizeCanvas());
    this.render();
  }

  async saveWorkflow() {
    try {
      const res = await fetch('/api/workflow/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: this.nodes, edges: this.edges }),
      });
      if (!res.ok) throw new Error('Failed to save workflow');
    } catch (err) {
      console.error('Workflow save error:', err);
    }
  }

  async loadWorkflow() {
    try {
      const res = await fetch('/api/workflow/load');
      if (!res.ok) throw new Error('Failed to load workflow');
      const data = await res.json();
      if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        this.nodes = data.nodes;
        this.edges = data.edges;
        this.render();
      }
    } catch (err) {
      console.warn('No workflow loaded or error:', err);
    }
  }

  _resizeCanvas() {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.render();
  }

  _initListeners() {
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('contextmenu', (e) => this._onContextMenu(e));
    this.canvas.addEventListener('dblclick', (e) => this._onDoubleClick(e));
    this.canvas.addEventListener('mousedown', (e) => this._onShiftDragStart(e));
    this.canvas.addEventListener('mouseup', (e) => this._onShiftDragEnd(e));
  }

  addNode(node) {
    this.nodes.push(node);
    this.render();
  }

  addEdge(edge) {
    this.edges.push(edge);
    this.render();
  }

  _getNodeAt(x, y) {
    return this.nodes.find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });
  }

  _onMouseDown(e) {
    if (e.button === 2) return; // handled by contextmenu
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this._getNodeAt(x, y);
    if (node) {
      this.selectedNode = node;
      this.dragOffset.x = x - node.x;
      this.dragOffset.y = y - node.y;
    }
  }

  _onContextMenu(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Add a new node at this position
    const nodeId = 'agent' + (Date.now() % 100000);
    this.addNode({ id: nodeId, label: 'Agent', x, y, radius: 38 });
    this.saveWorkflow();
  }

  _onDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this._getNodeAt(x, y);
    if (node) {
      this.nodes = this.nodes.filter(n => n !== node);
      this.edges = this.edges.filter(edge => edge.from !== node.id && edge.to !== node.id);
      this.render();
      this.saveWorkflow();
    }
  }

  _onShiftDragStart(e) {
    if (e.shiftKey && e.button === 0) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const node = this._getNodeAt(x, y);
      if (node) {
        this._shiftDrag = { fromNode: node, currentX: x, currentY: y };
      }
    }
  }

  _onShiftDragEnd(e) {
    if (this._shiftDrag && e.button === 0) {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const toNode = this._getNodeAt(x, y);
      if (toNode && toNode !== this._shiftDrag.fromNode) {
        this.addEdge({ from: this._shiftDrag.fromNode.id, to: toNode.id });
        this.saveWorkflow();
      }
      this._shiftDrag = null;
      this.render();
    }
  }

  _onMouseMove(e) {
    if (this._shiftDrag) {
      const rect = this.canvas.getBoundingClientRect();
      this._shiftDrag.currentX = e.clientX - rect.left;
      this._shiftDrag.currentY = e.clientY - rect.top;
      this.render();
      return;
    }
    if (!this.selectedNode) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.selectedNode.x = x - this.dragOffset.x;
    this.selectedNode.y = y - this.dragOffset.y;
    this.render();
  }

  _onMouseUp(e) {
    if (this.selectedNode) {
      this.selectedNode = null;
      this.saveWorkflow();
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Draw edges
    ctx.save();
    ctx.strokeStyle = '#48f8e7';
    ctx.shadowColor = '#a020f0';
    ctx.shadowBlur = 8;
    this.edges.forEach(edge => {
      const from = this.nodes.find(n => n.id === edge.from);
      const to = this.nodes.find(n => n.id === edge.to);
      if (from && to) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      }
    });
    ctx.restore();
    // Draw nodes
    this.nodes.forEach(node => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = node.selected ? '#a020f0' : '#181923';
      ctx.shadowColor = '#a020f0';
      ctx.shadowBlur = node.selected ? 24 : 12;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#48f8e7';
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.font = 'bold 1.1rem Orbitron, Arial, sans-serif';
      ctx.fillStyle = '#48f8e7';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 5);
      ctx.restore();
    });
    if (this._shiftDrag && this._shiftDrag.fromNode) {
      ctx.save();
      ctx.strokeStyle = '#a020f0';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(this._shiftDrag.fromNode.x, this._shiftDrag.fromNode.y);
      ctx.lineTo(this._shiftDrag.currentX, this._shiftDrag.currentY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

// Example usage on DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
  const manager = new CanvasStateManager('workflow-canvas');
  window.workflowManager = manager;
  manager.loadWorkflow(); // Load from backend if available
});
