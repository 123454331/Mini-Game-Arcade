/**
 * MINI GAME ARCADE - PORTAL CLIENT SCRIPT
 * Renders game cards, handles real-time search, category filtering,
 * and mobile navigation.
 */

import { GAMES, CATEGORIES } from './games-data.js';

document.addEventListener('DOMContentLoaded', () => {
  const gamesGrid = document.getElementById('games-grid');
  const categoryTabs = document.getElementById('category-tabs');
  const searchInput = document.getElementById('search-input');
  const gamesCount = document.getElementById('games-count');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.getElementById('nav-links');

  let activeCategory = 'All Games';
  let searchQuery = '';

  // 1. Mobile Menu Toggle
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const isOpen = navLinks.classList.contains('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });
  }

  // 2. Render Category Filter Tabs
  if (categoryTabs) {
    categoryTabs.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const tab = document.createElement('button');
      tab.className = `cat-tab ${cat === activeCategory ? 'active' : ''}`;
      tab.textContent = cat;
      tab.setAttribute('type', 'button');
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', cat === activeCategory);

      tab.addEventListener('click', () => {
        activeCategory = cat;
        // Update active class
        categoryTabs.querySelectorAll('.cat-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        filterAndRenderGames();
      });

      categoryTabs.appendChild(tab);
    });
  }

  // 3. Search Input Listener (Debounced)
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterAndRenderGames();
    });
  }

  // 4. Filter and Render Games Grid
  function filterAndRenderGames() {
    if (!gamesGrid) return;

    const filtered = GAMES.filter((game) => {
      // Category filter
      const matchesCategory = (activeCategory === 'All Games') || (game.category === activeCategory);

      // Search filter
      const matchesSearch = !searchQuery || (
        game.title.toLowerCase().includes(searchQuery) ||
        game.description.toLowerCase().includes(searchQuery) ||
        game.category.toLowerCase().includes(searchQuery) ||
        (game.tags && game.tags.some(t => t.toLowerCase().includes(searchQuery)))
      );

      return matchesCategory && matchesSearch;
    });

    // Update Counter
    if (gamesCount) {
      gamesCount.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'game' : 'games'}`;
    }

    // Render Cards
    if (filtered.length === 0) {
      gamesGrid.innerHTML = `
        <div class="no-games-box">
          <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 18px; color: #fff; margin-bottom: 6px;">No games match your search</h3>
          <p style="font-size: 14px; color: #94a3b8;">Try clearing your search query or picking a different category tab.</p>
        </div>
      `;
      return;
    }

    gamesGrid.innerHTML = filtered.map((game) => `
      <article class="game-card" id="card-${game.id}">
        <div class="card-thumb-wrap">
          <img src="${game.thumbnail}" alt="${game.title} Thumbnail" class="card-thumb" loading="lazy" />
          <span class="card-badge">${game.badge || 'Playable'}</span>
        </div>
        <div class="card-body">
          <span class="card-category">${game.category}</span>
          <h3 class="card-title">${game.title}</h3>
          <p class="card-desc">${game.description}</p>
          
          <div class="card-tags">
            ${game.tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
          </div>

          <div class="card-footer">
            <span style="font-size: 12px; color: #94a3b8;">🎮 Free to Play</span>
            <a href="${game.path}" class="btn-play">
              <span>PLAY NOW</span>
              <span>➔</span>
            </a>
          </div>
        </div>
      </article>
    `).join('');
  }

  // Initial Render
  filterAndRenderGames();
});

