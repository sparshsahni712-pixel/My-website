const promptBox = document.getElementById('prompt');
const generateButton = document.getElementById('generate');
const message = document.getElementById('message');
const preview = document.getElementById('preview');
const emptyState = document.getElementById('empty-state');
const downloadButton = document.getElementById('download');
const openButton = document.getElementById('open-tab');
let currentHtml = '';

document.querySelectorAll('.example').forEach(button => {
  button.addEventListener('click', () => {
    promptBox.value = button.dataset.prompt;
    promptBox.focus();
  });
});

function setMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? 'message error' : 'message';
}

generateButton.addEventListener('click', async () => {
  const prompt = promptBox.value.trim();
  if (prompt.length < 5) {
    setMessage('Please describe the website you want to create.', true);
    return;
  }

  generateButton.disabled = true;
  generateButton.innerHTML = '<span>✦</span> Generating your website...';
  setMessage('Connecting to your AI provider. This can take a moment.');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const data = await response.json().catch(() => ({ error: 'Server returned an unexpected response. Please try again.' }));
    if (!response.ok) throw new Error(data.error || 'Website generation failed.');
    currentHtml = data.html;
    preview.srcdoc = currentHtml;
    preview.hidden = false;
    emptyState.hidden = true;
    downloadButton.disabled = false;
    openButton.disabled = false;
    setMessage(data.message || 'Website generated successfully.');
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', true);
  } finally {
    generateButton.disabled = false;
    generateButton.innerHTML = '<span>✦</span> Generate website <span class="arrow">→</span>';
  }
});

downloadButton.addEventListener('click', () => {
  if (!currentHtml) return;
  const blob = new Blob([currentHtml], { type: 'text/html' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'generated-website.html';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 10000);
});

openButton.addEventListener('click', () => {
  if (!currentHtml) return;
  const blob = new Blob([currentHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});
