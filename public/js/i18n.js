/* ===== NATIVE i18n TRANSLATION ENGINE ===== */
/**
 * Loads translations from lang.json and applies them to all elements
 * with a data-i18n attribute. Persists the user's language choice
 * in localStorage so it survives page reloads.
 */
export function initI18n() {
  const switcher = document.getElementById('langSwitcher');
  if (!switcher) return;

  let translations = {};

  // Restore saved language preference
  const saved = localStorage.getItem('indivote_lang') || 'en';
  switcher.value = saved;

  // Fetch translations then apply
  fetch('/lang.json')
    .then((res) => res.json())
    .then((data) => {
      translations = data;
      applyLanguage(saved);
    })
    .catch((err) => console.warn('i18n: Could not load lang.json', err));

  switcher.addEventListener('change', () => {
    const lang = switcher.value;
    localStorage.setItem('indivote_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    applyLanguage(lang);
  });

  function applyLanguage(lang) {
    const strings = translations[lang];
    if (!strings) return;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (strings[key]) {
        el.textContent = strings[key];
      }
    });
  }
}
