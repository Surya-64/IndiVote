/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

describe('Frontend DOM Tests', () => {
  beforeAll(() => {
    // Load the HTML file into JSDOM
    const html = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf8');
    document.body.innerHTML = html;
  });

  test('should render the interactive map container', () => {
    const mapContainer = document.getElementById('regions_div');
    expect(mapContainer).not.toBeNull();
  });

  test('should render the language switcher for i18n', () => {
    const langSwitcher = document.getElementById('langSwitcher');
    expect(langSwitcher).not.toBeNull();
    expect(langSwitcher.options.length).toBeGreaterThan(0);
  });

  test('should render the AI Chat widget components', () => {
    const chatFab = document.getElementById('chatFab');
    const chatPanel = document.getElementById('chatPanel');
    const chatInput = document.getElementById('chatInput');
    
    expect(chatFab).not.toBeNull();
    expect(chatPanel).not.toBeNull();
    expect(chatInput).not.toBeNull();
  });

  test('should render the live news container', () => {
    const newsContainer = document.getElementById('newsContainer');
    expect(newsContainer).not.toBeNull();
  });

  test('should have data-i18n attributes on elements', () => {
    const i18nElements = document.querySelectorAll('[data-i18n]');
    expect(i18nElements.length).toBeGreaterThan(0);
  });
});
