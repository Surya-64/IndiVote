import {
  initCountdown,
  initNavbar,
  initFAQ,
  initScrollAnimations,
  checkElectionStatus,
} from './ui.js';
import { fetchElectionNews } from './news.js';
import { fetchStateElectionData, initInteractiveMap } from './map.js';
import { initChat } from './chat.js';
import { initAuth } from './auth.js';
import { initI18n } from './i18n.js';

document.addEventListener('DOMContentLoaded', async () => {
  initCountdown();
  initNavbar();
  initFAQ();
  initScrollAnimations();
  checkElectionStatus();

  await fetchStateElectionData();
  initInteractiveMap();
  initChat();
  initAuth();
  initI18n();

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
  setInterval(
    async () => {
      await fetchStateElectionData();
      if (typeof google !== 'undefined' && typeof google.visualization !== 'undefined') {
        // Re-initialize map with new data
        initInteractiveMap();
      }
    },
    15 * 60 * 1000,
  );
});
