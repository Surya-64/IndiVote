/* =============================================
   IndiVote — Indian Election Assistant
   app.js — All interactivity & dynamic logic
   ============================================= */

document.addEventListener('DOMContentLoaded', async () => {
  initCountdown();
  initNavbar();
  initFAQ();
  initScrollAnimations();
  checkElectionStatus();
  
  await fetchStateElectionData();
  initInteractiveMap();
  initChat();
  
  // Google Translate fallback
  if (typeof google === 'undefined' || !google.translate) {
    console.warn('Google Translate not loaded yet, retrying...');
  }

  // Fetch news immediately and then every 15 minutes
  fetchElectionNews();
  setInterval(fetchElectionNews, 15 * 60 * 1000);

  // Continuously check election status (every minute)
  setInterval(checkElectionStatus, 60 * 1000);

  // Continuously fetch state data and redraw map (every 15 minutes)
  setInterval(async () => {
    await fetchStateElectionData();
    if (typeof google !== 'undefined' && typeof google.visualization !== 'undefined') {
      // Re-initialize map with new data
      initInteractiveMap();
    }
  }, 15 * 60 * 1000);
});

/* ===== LIVE ELECTION NEWS ===== */
/**
 * Fetches the latest election news from Google News RSS via a JSON proxy.
 * Renders news cards into the newsContainer.
 * @async
 */
async function fetchElectionNews() {
  const container = document.getElementById('newsContainer');
  const loading = document.getElementById('newsLoading');
  
  // Google News RSS feed for "India Elections" converted to JSON via rss2json
  const rssUrl = encodeURIComponent('https://news.google.com/rss/search?q=India+Elections&hl=en-IN&gl=IN&ceid=IN:en');
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;
 
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
 
    if (data.status === 'ok' && data.items.length > 0) {
      loading.style.display = 'none';
      container.style.display = 'grid';
      renderNews(data.items.slice(0, 6)); // Show top 6 news items
    } else {
      throw new Error("No news items found or API limit reached.");
    }
  } catch (error) {
    console.error("Error fetching election news:", error);
    loading.innerHTML = `<p style="color: #ff6b6b;">Unable to load live news at the moment. Please try again later.</p>`;
  }
}

/** Safely set text to avoid XSS when using innerHTML */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Renders news articles as cards in the news container.
 * @param {Array} articles - List of news articles from the RSS feed.
 */
function renderNews(articles) {
  const container = document.getElementById('newsContainer');
  container.innerHTML = '';

  articles.forEach(article => {
    // Google News titles often include the source at the end separated by ' - '
    const titleParts = article.title.split(' - ');
    const source = titleParts.length > 1 ? titleParts.pop() : 'News Source';
    const cleanTitle = titleParts.join(' - ');

    // Calculate relative time (e.g., "2 hours ago")
    const pubDate = new Date(article.pubDate);
    const diffMs = new Date() - pubDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const timeString = diffHours > 24 ? `${Math.floor(diffHours / 24)} days ago` : diffHours > 0 ? `${diffHours} hours ago` : 'Just now';

    const card = document.createElement('a');
    card.href = article.link;  // href from trusted RSS, not user input
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'news-card glass';
    card.setAttribute('aria-label', `Read article: ${cleanTitle}`);

    // Use sanitize() to prevent XSS from untrusted RSS content
    card.innerHTML = `
      <div class="news-meta">
        <span class="news-source">${sanitize(source)}</span>
        <span>${sanitize(timeString)}</span>
      </div>
      <h3 class="news-title">${sanitize(cleanTitle)}</h3>
      <div class="news-read-more">Read Full Article →</div>
    `;

    container.appendChild(card);
  });
}

/* ===== INTERACTIVE MAP & STATE DATA ===== */
let STATE_ELECTION_DATA = {};

/**
 * Fetches state-wise election data from the backend API.
 * @async
 */
async function fetchStateElectionData() {
  try {
    // Use relative URL — works because Express serves static files on the same port
    const response = await fetch('/api/election-data');
    if (response.ok) {
      STATE_ELECTION_DATA = await response.json();
    }
  } catch (err) {
    console.error('Failed to load state election data from backend', err);
  }
}

/**
 * Initializes the Google GeoChart for India.
 * Loads the visualization package and sets the draw callback.
 */
function initInteractiveMap() {
  if (typeof google === 'undefined' || typeof google.charts === 'undefined') {
    // If google script hasn't loaded yet, retry in 100ms
    setTimeout(initInteractiveMap, 100);
    return;
  }

  google.charts.load('current', {
    'packages':['geochart'],
  });
  google.charts.setOnLoadCallback(drawRegionsMap);

  /**
   * Internal function to draw the regions map using Google Visualization API.
   */
  function drawRegionsMap() {
    const mapData = [['State', 'Status']];
    
    // Default list of all Indian states/UTs to ensure full coverage
    const allStates = [
      'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 
      'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli', 'Daman and Diu', 
      'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 
      'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 
      'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 
      'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
    ];

    allStates.forEach(state => {
      const data = STATE_ELECTION_DATA[state];
      const status = (data && data.current && data.current.active) ? 1 : 0;
      
      // Push both friendly name and ISO code for maximum compatibility
      if (state === 'Odisha') {
        mapData.push(['IN-OR', status]);
        mapData.push(['Odisha', status]);
      } else if (state === 'Telangana') {
        mapData.push(['IN-TG', status]);
        mapData.push(['Telangana', status]);
      } else if (state === 'Uttarakhand') {
        mapData.push(['IN-UT', status]);
        mapData.push(['Uttarakhand', status]);
      } else {
        mapData.push([state, status]);
      }
    });

    var data = google.visualization.arrayToDataTable(mapData);

    var options = {
      region: 'IN',
      resolution: 'provinces',
      backgroundColor: 'transparent',
      datalessRegionColor: '#1a1f2e',
      defaultColor: '#138808',
      colorAxis: {colors: ['#2a324a', '#FF9933']},
      tooltip: { textStyle: { color: '#ffffff' }, showColorCode: false },
      keepAspectRatio: true
    };

    var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));
    
    // Add event listener for click
    google.visualization.events.addListener(chart, 'select', function() {
      var selection = chart.getSelection();
      if (selection.length > 0) {
        var stateName = data.getValue(selection[0].row, 0);
        updateStatePanel(stateName);
      }
    });

    chart.draw(data, options);

    // Make responsive with debounce to avoid excess redraws
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => chart.draw(data, options), 150);
    });
  }
}

/**
 * Updates the side panel with details for the selected state.
 * @param {string} stateName - The name of the selected state.
 */
function updateStatePanel(stateName) {
  // Handle ISO codes if they come from the map selection
  let friendlyName = stateName;
  if (stateName === 'IN-OR') friendlyName = 'Odisha';
  if (stateName === 'IN-TG') friendlyName = 'Telangana';
  if (stateName === 'IN-UT') friendlyName = 'Uttarakhand';

  document.getElementById('panel_empty_state').style.display = 'none';
  document.getElementById('panel_state_name').textContent = friendlyName;
  
  const stateData = STATE_ELECTION_DATA[friendlyName];
  const currentDiv = document.getElementById('panel_current_elections');
  const currentContent = document.getElementById('panel_current_content');
  const prevDiv = document.getElementById('panel_previous_elections');
  const prevContent = document.getElementById('panel_previous_content');

  if (!stateData) {
    currentDiv.style.display = 'none';
    prevDiv.style.display = 'block';
    prevContent.innerHTML = `<strong>Data Unavailable</strong><br/>Historical election data for ${stateName} is currently being updated in our system.`;
    return;
  }

  // Current Elections
  if (stateData.current && stateData.current.active) {
    currentDiv.style.display = 'block';
    currentContent.innerHTML = `
      <strong>${stateData.current.title}</strong><br/>
      <span style="color: #ff6b6b; font-weight:600;">Status:</span> ${stateData.current.phase}<br/>
      <span style="color: #4ade80; font-weight:600;">Next:</span> ${stateData.current.next_date}
    `;
  } else {
    currentDiv.style.display = 'none';
  }

  // Previous Elections
  if (stateData.previous) {
    prevDiv.style.display = 'block';
    prevContent.innerHTML = `
      <strong>${stateData.previous.year}</strong><br/>
      <span style="color: #a0a8c0;">Ruling Party/Alliance:</span> <strong>${stateData.previous.ruling}</strong><br/>
      <span style="color: #a0a8c0;">Seats Won:</span> ${stateData.previous.seats}<br/>
      <span style="color: #a0a8c0;">Voter Turnout:</span> ${stateData.previous.turnout}
    `;
  } else {
    prevDiv.style.display = 'none';
  }
}

/* ===== COUNTDOWN TIMER ===== */
/**
 * Initializes the results day countdown timer.
 */
function initCountdown() {
  // Results Day: May 4, 2026, 8:00 AM IST (UTC+5:30 → UTC 2:30 AM)
  const resultsDay = new Date('2026-05-04T02:30:00Z');

  function update() {
    const now = new Date();
    const diff = resultsDay - now;

    if (diff <= 0) {
      document.getElementById('countdownCard').innerHTML = `
        <div class="countdown-label">🎉 Results Are Out!</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--saffron);margin:0.5rem 0;">
          Check results at results.eci.gov.in
        </div>
        <a href="https://results.eci.gov.in/" target="_blank" rel="noopener" class="btn btn-primary" style="display:inline-block;margin-top:0.5rem;">
          View Live Results →
        </a>`;
      return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    setVal('cdDays', pad(days));
    setVal('cdHours', pad(hours));
    setVal('cdMins', pad(minutes));
    setVal('cdSecs', pad(seconds));
  }

  /**
   * Helper to set value and trigger flip animation.
   * @param {string} id - Element ID.
   * @param {string} val - Value to set.
   */
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && el.textContent !== val) {
      el.textContent = val;
      el.classList.add('flip');
      el.addEventListener('animationend', () => el.classList.remove('flip'), { once: true });
    }
  }

  update();
  setInterval(update, 1000);
}

/* ===== LIVE BADGE STATUS ===== */
/**
 * Checks if polls are currently open and updates the live badge.
 */
function checkElectionStatus() {
  // West Bengal Phase II: April 29, 2026, 7 AM to 6 PM IST
  const pollStart = new Date('2026-04-29T01:30:00Z'); // 7 AM IST
  const pollEnd   = new Date('2026-04-29T12:30:00Z'); // 6 PM IST
  const now = new Date();

  const badge = document.getElementById('liveBadge');
  if (!badge) return;

  if (now >= pollStart && now <= pollEnd) {
    // Voting is live right now
    badge.style.display = 'inline-flex';
  } else if (now > pollEnd) {
    // Voting has ended today
    badge.innerHTML = `
      <span class="live-dot" style="background: var(--saffron);"></span>
      <span class="live-text" style="color: var(--saffron);">VOTING CONCLUDED — Awaiting Results on May 4</span>`;
    badge.style.background = 'rgba(255, 153, 51, 0.1)';
    badge.style.borderColor = 'rgba(255, 153, 51, 0.6)';
  } else {
    // Before polls open
    badge.innerHTML = `
      <span style="font-size:0.9rem;">🗳️</span>
      <span class="live-text">West Bengal Phase II — Polling Today</span>`;
  }
}

/* ===== NAVBAR ===== */
/**
 * Initializes the navigation bar with mobile toggle and scroll effects.
 */
function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');
  const navbar    = document.getElementById('navbar');

  // Toggle mobile menu
  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });

  // Close menu on link click
  navLinks?.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });

  // Navbar background on scroll
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.style.background = 'rgba(5,6,15,0.98)';
    } else {
      navbar.style.background = 'rgba(5,6,15,0.85)';
    }

    // Highlight active nav section
    highlightActiveSection();
  }, { passive: true });
}

/**
 * Highlights the active section in the navigation bar based on scroll position.
 */
function highlightActiveSection() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  let currentId = '';

  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      currentId = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentId}`) {
      link.classList.add('active');
    }
  });
}

/* ===== FAQ ACCORDION ===== */
/**
 * Initializes the FAQ accordion functionality.
 */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      // Open clicked (unless it was already open)
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ===== SCROLL ANIMATIONS ===== */
/**
 * Initializes IntersectionObserver for scroll-triggered animations.
 */
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const targets = document.querySelectorAll(
    '.service-card, .etype-card, .info-card, .contact-card, .timeline-item, .faq-item, .stats-bar, .countdown-card'
  );

  targets.forEach((el, i) => {
    el.classList.add('animate-in');
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    observer.observe(el);
  });
}

/* ===== AI CHAT ASSISTANT ===== */
let isChatOpen = false;

/**
 * Initializes the AI Chat assistant widget and its handlers.
 */
function initChat() {
  const fab        = document.getElementById('chatFab');
  const panel      = document.getElementById('chatPanel');
  const closeBtn   = document.getElementById('chatClose');
  const clearBtn   = document.getElementById('chatClear');
  const sendBtn    = document.getElementById('chatSend');
  const input      = document.getElementById('chatInput');
  const messages   = document.getElementById('chatMessages');
  const setup      = document.getElementById('chatSetup');
  const apiKeyInp  = document.getElementById('apiKeyInput');
  const apiKeySave = document.getElementById('apiKeySave');
  const apiKeyErr  = document.getElementById('apiKeyError');
  const badge      = document.getElementById('chatFabBadge');
  
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
  setTimeout(() => { if (badge) badge.style.display = 'flex'; }, 3000);

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
  fab.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fab.click(); }
  });

  // Save API key securely to backend
  apiKeySave.addEventListener('click', async () => {
    const key = apiKeyInp.value.trim();
    if (!key.startsWith('AIza') || key.length < 20) {
      apiKeyErr.textContent = '⚠️ That doesn\'t look like a valid Gemini API key.';
      return;
    }
    
    try {
      const res = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      if (res.ok) {
        setup.classList.add('hidden');
        apiKeyErr.textContent = '';
        appendMessage('ai', '✅ API key saved securely to the backend! Ask me anything about Indian elections.');
        input.focus();
      } else {
        throw new Error('Failed to save API key');
      }
    } catch (err) {
      apiKeyErr.textContent = '⚠️ Error saving key to server.';
    }
  });
  apiKeyInp.addEventListener('keydown', e => { if (e.key === 'Enter') apiKeySave.click(); });

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
  input?.addEventListener('keydown', e => {
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
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();

      if (res.status === 401) {
        setup.classList.remove('hidden');
        throw new Error(data.error || 'Please set your Gemini API Key above.');
      }
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
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      .replace(/^\* (.+)$/gm, '• $1')
      .replace(/^\d+\. (.+)$/gm, (_, p) => `• ${p}`)
      .replace(/\n/g, '<br/>');
  }
}
