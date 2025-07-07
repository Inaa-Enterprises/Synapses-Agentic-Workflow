// Operator's Rig: advanced terminal, prompt, and file upload logic

document.addEventListener('DOMContentLoaded', () => {
  const terminal = document.getElementById('operator-terminal');
  const inputForm = document.getElementById('ali-input-form');
  const outputArea = document.getElementById('ali-output-area');

  // Command history and navigation
  let commandHistory = [];
  let historyIndex = -1;
  const inputBox = document.getElementById('ali-input-box');

  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (historyIndex > 0) {
        historyIndex--;
        inputBox.value = commandHistory[historyIndex];
        e.preventDefault();
      }
    } else if (e.key === 'ArrowDown') {
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        inputBox.value = commandHistory[historyIndex];
        e.preventDefault();
      } else {
        inputBox.value = '';
        historyIndex = commandHistory.length;
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (inputBox.value.trim()) {
        commandHistory.push(inputBox.value);
        historyIndex = commandHistory.length;
      }
    }
  });

  // Output streaming (simulate real-time response)
  function streamOutput(text) {
    outputArea.textContent = '';
    let idx = 0;
    function typeChar() {
      if (idx < text.length) {
        outputArea.textContent += text[idx++];
        setTimeout(typeChar, 12);
      }
    }
    typeChar();
  }

  // Enhance file upload: show file names
  const fileInput = document.getElementById('ali-file-input');
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files).map(f => f.name).join(', ');
    terminal.setAttribute('data-files', files);
  });

  // Listen for backend response and stream output
  inputForm.addEventListener('submit', async (e) => {
    // Wait for dashboard.js to update outputArea
    setTimeout(() => {
      try {
        const data = JSON.parse(outputArea.textContent);
        if (data && data.data && typeof data.data === 'string') {
          streamOutput(data.data);
        }
      } catch (err) {
        // Not JSON or not a string response
      }
    }, 200);
  });
});
