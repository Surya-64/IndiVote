/* ===== LIVE ELECTION NEWS ===== */
/**
 * Fetches the latest election news from Google News RSS via a JSON proxy.
 * Renders news cards into the newsContainer.
 * @async
 */
export async function fetchElectionNews() {
  const container = document.getElementById('newsContainer');
  const loading = document.getElementById('newsLoading');

  // Google News RSS feed for "India Elections" converted to JSON via rss2json
  const rssUrl = encodeURIComponent(
    'https://news.google.com/rss/search?q=India+Elections&hl=en-IN&gl=IN&ceid=IN:en',
  );
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.status === 'ok' && data.items.length > 0) {
      loading.style.display = 'none';
      container.style.display = 'grid';
      renderNews(data.items.slice(0, 6)); // Show top 6 news items
    } else {
      throw new Error('No news items found or API limit reached.');
    }
  } catch (error) {
    console.error('Error fetching election news:', error);
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

  articles.forEach((article) => {
    // Google News titles often include the source at the end separated by ' - '
    const titleParts = article.title.split(' - ');
    const source = titleParts.length > 1 ? titleParts.pop() : 'News Source';
    const cleanTitle = titleParts.join(' - ');

    // Calculate relative time (e.g., "2 hours ago")
    const pubDate = new Date(article.pubDate);
    const diffMs = new Date() - pubDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const timeString =
      diffHours > 24
        ? `${Math.floor(diffHours / 24)} days ago`
        : diffHours > 0
          ? `${diffHours} hours ago`
          : 'Just now';

    const card = document.createElement('a');
    card.href = article.link; // href from trusted RSS, not user input
    card.target = '_blank';
    card.rel = 'noopener noreferrer';
    card.className = 'news-card glass';
    card.setAttribute('aria-label', `Read article: ${cleanTitle}`);

    // Use sanitize() to prevent XSS from untrusted RSS content
    // prettier-ignore
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
