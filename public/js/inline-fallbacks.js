"use strict";
/* global MutationObserver */
// Synchronous Login window popup at dashboard
window.openLogin = function() {
  const m = document.getElementById('authModalOverlay');
  if (m) {
    m.style.display = 'flex';
    m.setAttribute('aria-hidden', 'false');
    // Scroll smoothly to dashboard / top of page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Synchronous AI chat assistant send message
window.sendMessageDirect = async function() {
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  if (!input || !messages) return;
  const text = input.value.trim();
  if (!text) return;

  // Append user msg
  const uDiv = document.createElement('div');
  uDiv.className = 'chat-msg user';
  uDiv.innerHTML = `<div class="chat-bubble">${text}</div>`;
  messages.appendChild(uDiv);
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  // Append typing indicator
  const tDiv = document.createElement('div');
  tDiv.className = 'chat-msg ai';
  tDiv.id = 'chatTypingIndicator';
  tDiv.innerHTML = `<div class="chat-bubble">Thinking...</div>`;
  messages.appendChild(tDiv);
  messages.scrollTop = messages.scrollHeight;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) indicator.remove();

    const aiDiv = document.createElement('div');
    aiDiv.className = 'chat-msg ai';
    aiDiv.innerHTML = `<div class="chat-bubble">${data.reply || "No response received."}</div>`;
    messages.appendChild(aiDiv);
    messages.scrollTop = messages.scrollHeight;
  } catch (err) {
    const indicator = document.getElementById('chatTypingIndicator');
    if (indicator) indicator.remove();
    const aiDiv = document.createElement('div');
    aiDiv.className = 'chat-msg ai';
    aiDiv.innerHTML = `<div class="chat-bubble">⚠️ ${err.message}</div>`;
    messages.appendChild(aiDiv);
    messages.scrollTop = messages.scrollHeight;
  }
};

// Synchronous click listeners to quick chips
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.getAttribute('data-q');
      const input = document.getElementById('chatInput');
      if (input && q) {
        input.value = q;
        window.sendMessageDirect();
      }
    });
  });

  // Force Google Translate text color to white after it loads
  const observer = new MutationObserver(() => {
    const translateElement = document.querySelector('.goog-te-gadget-simple');
    if (translateElement) {
      const spans = translateElement.querySelectorAll('span');
      spans.forEach(span => span.style.color = '#ffffff');
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});
