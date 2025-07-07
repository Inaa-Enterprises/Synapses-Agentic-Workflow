// Unified Dashboard Input Method for ALI

document.addEventListener('DOMContentLoaded', () => {
  const inputForm = document.getElementById('ali-input-form');
  const inputBox = document.getElementById('ali-input-box');
  const fileInput = document.getElementById('ali-file-input');
  const submitBtn = document.getElementById('ali-submit-btn');
  const outputArea = document.getElementById('ali-output-area');

  inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    const formData = new FormData();
    formData.append('message', inputBox.value);
    if (fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        formData.append('attachments', fileInput.files[i]);
      }
    }
    try {
      // Send to ALI backend via API Gateway (update endpoint as needed)
      const res = await fetch('/api/agent/default/run', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      outputArea.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      outputArea.textContent = 'Error: ' + err.message;
    } finally {
      submitBtn.disabled = false;
      inputBox.value = '';
      fileInput.value = '';
    }
  });
});
