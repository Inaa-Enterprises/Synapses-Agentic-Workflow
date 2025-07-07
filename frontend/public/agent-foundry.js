// Agent Foundry UI and logic for agent cloning/configuration

document.addEventListener('DOMContentLoaded', () => {
  const deck = document.getElementById('ghost-runner-deck');
  if (!deck) return;

  // Agent config modal
  let modal = document.createElement('div');
  modal.id = 'agent-config-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Edit Agent</h2>
      <label>Name:<input type="text" id="agent-name-input" /></label>
      <label>Role:<input type="text" id="agent-role-input" /></label>
      <label>Personality:<input type="text" id="agent-personality-input" /></label>
      <button id="save-agent-btn">Save</button>
      <button id="close-agent-btn">Cancel</button>
    </div>
  `;
  modal.className = 'cyberpunk-modal';
  document.body.appendChild(modal);

  // Listen for node double-clicks in workflowManager
  const manager = window.workflowManager;
  if (!manager) return;

  manager._onDoubleClick = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this._getNodeAt(x, y);
    if (node) {
      openAgentConfig(node);
    }
  };

  function openAgentConfig(node) {
    modal.style.display = 'block';
    document.getElementById('agent-name-input').value = node.label || '';
    document.getElementById('agent-role-input').value = node.role || '';
    document.getElementById('agent-personality-input').value = node.personality || '';
    modal.currentNode = node;
  }

  document.getElementById('save-agent-btn').onclick = () => {
    if (!modal.currentNode) return;
    modal.currentNode.label = document.getElementById('agent-name-input').value;
    modal.currentNode.role = document.getElementById('agent-role-input').value;
    modal.currentNode.personality = document.getElementById('agent-personality-input').value;
    manager.saveWorkflow();
    modal.style.display = 'none';
    manager.render();
  };

  document.getElementById('close-agent-btn').onclick = () => {
    modal.style.display = 'none';
  };
});
