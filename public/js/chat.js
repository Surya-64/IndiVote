/* ===== AI CHAT ASSISTANT ===== */
export let isChatOpen = false;

/**
 * Initializes the AI Chat assistant widget and its handlers.
 */
export function initChat() {
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatClose');
  const clearBtn = document.getElementById('chatClear');
  const sendBtn = document.getElementById('chatSend');
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  const setup = document.getElementById('chatSetup');
  const apiKeyInp = document.getElementById('apiKeyInput');
  const apiKeySave = document.getElementById('apiKeySave');
  const apiKeyErr = document.getElementById('apiKeyError');
  const badge = document.getElementById('chatFabBadge');

  /**
   * Checks if the Gemini API Key is already saved on the backend.
   * If configured, hides the setup UI panel.
   */
  async function checkAPIKeyConfig() {
    try {
      const res = await fetch('/api/settings/apikey/check');
      const data = await res.json();
      if (data.configured) {
        setup.classList.add('hidden');
      } else {
        setup.classList.remove('hidden');
      }
    } catch (err) {
      console.warn('Could not check API key status', err);
      setup.classList.remove('hidden');
    }
  }

  // Initial check on load
  checkAPIKeyConfig();

  // Show badge on first load to attract attention
  setTimeout(() => {
    if (badge) badge.style.display = 'flex';
  }, 3000);

  // Toggle panel
  fab.addEventListener('click', () => {
    isChatOpen = !isChatOpen;
    panel.classList.toggle('open', isChatOpen);
    panel.setAttribute('aria-hidden', String(!isChatOpen));
    if (isChatOpen) {
      badge.style.display = 'none';
      setTimeout(() => input.focus(), 350);
    }
  });

  closeBtn.addEventListener('click', () => {
    isChatOpen = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  });

  // Keyboard support for FAB: Space/Enter triggers click
  fab.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fab.click();
    }
  });

  // Save API key securely to backend
  apiKeySave.addEventListener('click', async () => {
    const key = apiKeyInp.value.trim();
    if (!key.startsWith('AIza') || key.length < 20) {
      apiKeyErr.textContent = "⚠️ That doesn't look like a valid Gemini API key.";
      return;
    }

    try {
      const res = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      if (res.ok) {
        setup.classList.add('hidden');
        apiKeyErr.textContent = '';
        appendMessage(
          'ai',
          '✅ API key saved securely to the backend! Ask me anything about Indian elections.',
        );
        input.focus();
      } else {
        throw new Error('Failed to save API key');
      }
    } catch (err) {
      apiKeyErr.textContent = '⚠️ Error saving key to server.';
    }
  });
  apiKeyInp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') apiKeySave.click();
  });

  // Clear chat (frontend clear)
  clearBtn.addEventListener('click', () => {
    messages.innerHTML = `
      <div class="chat-msg ai">
        <div class="chat-bubble">
          👋 Chat cleared! I'm ready to help with any questions about Indian elections, constitution, or voting rights.
        </div>
      </div>`;
  });

  // Send on button click or Enter (Shift+Enter = new line)
  sendBtn?.addEventListener('click', () => sendMessage(input.value));
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input.value);
    }
  });

  // Auto-resize textarea
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });

  /**
   * Sends a message to the backend and renders the reply.
   * @async
   * @param {string} text - Message text.
   */
  async function sendMessage(text) {
    text = text.trim();
    if (!text) return;

    // Render user message
    appendMessage('user', text);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    // Show typing indicator
    const typingEl = appendTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Server Error');
      }

      typingEl.remove();
      appendMessage('ai', formatReply(data.reply));
    } catch (err) {
      typingEl.remove();
      appendMessage('ai', `⚠️ ${err.message}`);
    }

    sendBtn.disabled = false;
    input.focus();
  }

  /**
   * Appends a message bubble to the chat container.
   * @param {string} role - 'user' or 'ai'.
   * @param {string} html - HTML content of the message.
   * @returns {HTMLElement} The created message element.
   */
  function appendMessage(role, html) {
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = `<div class="chat-bubble">${html}</div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  /**
   * Appends a typing indicator to the chat.
   * @returns {HTMLElement} The created typing indicator element.
   */
  function appendTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai';
    div.innerHTML = `<div class="chat-bubble typing-bubble">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>`;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  /**
   * Formats plain text AI replies into HTML with basic markdown-like support.
   * @param {string} text - Raw reply text.
   * @returns {string} Formatted HTML.
   */
  function formatReply(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '• $1')
      .replace(/^\d+\. (.+)$/gm, (_, p) => `• ${p}`)
      .replace(/\n/g, '<br/>');
  }
}
