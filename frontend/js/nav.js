// frontend/js/nav.js
// Renders the navbar and player HTML, then initialises everything

(function () {
  const NAV_HTML = `
<nav class="navbar" id="navbar">
  <a href="/pages/index.html" class="nav-logo">
    <span>📚</span> AudioBooks
  </a>

  <div class="nav-links" id="nav-links">
    <a href="/pages/index.html"   class="nav-link" data-i18n="nav_home"></a>
    <a href="/pages/catalog.html" class="nav-link" data-i18n="nav_catalog"></a>
    <a href="/pages/upload.html"  class="nav-link nav-auth-only hidden" data-i18n="nav_upload"></a>
    <a href="/pages/admin.html"   class="nav-link nav-mod-only hidden"  data-i18n="nav_admin"></a>
  </div>

  <div class="nav-right">
    <!-- Language switcher -->
    <div class="lang-switcher">
      <button class="lang-btn" data-lang="lv">LV</button>
      <button class="lang-btn" data-lang="ru">RU</button>
      <button class="lang-btn" data-lang="en">EN</button>
    </div>

    <!-- Guest buttons -->
    <div id="nav-guest" class="flex gap-8">
      <a href="/pages/login.html"    class="btn btn-ghost btn-sm" data-i18n="nav_login"></a>
      <a href="/pages/register.html" class="btn btn-primary btn-sm" data-i18n="nav_register"></a>
    </div>

    <!-- User dropdown -->
    <div id="nav-user" class="hidden dropdown">
      <button id="nav-user-btn" class="flex items-center gap-8">
        <div id="nav-avatar-placeholder" class="avatar-placeholder" style="width:36px;height:36px;font-size:0.85rem;"></div>
        <img id="nav-avatar" class="nav-avatar hidden" src="" alt="">
      </button>
      <div class="dropdown-menu" id="nav-dropdown" style="display:none">
        <a href="/pages/profile.html" class="dropdown-item">👤 <span data-i18n="nav_profile"></span></a>
        <a href="/pages/my-books.html" class="dropdown-item">🎙️ <span data-i18n="nav_my_books"></span></a>
        <a href="/pages/history.html"  class="dropdown-item">🕐 <span data-i18n="nav_history"></span></a>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item danger" id="nav-logout-btn">🚪 <span data-i18n="nav_logout"></span></button>
      </div>
    </div>

    <!-- Mobile hamburger -->
    <button id="nav-hamburger" style="display:none;font-size:1.3rem;color:var(--text-secondary);padding:4px 8px;">☰</button>
  </div>
</nav>`;

  const PLAYER_HTML = `
<!-- Fixed Audio Player -->
<div id="player">
  <!-- Book info -->
  <div class="player-book">
    <img id="player-cover" class="player-cover" src="" alt="" onerror="this.style.display='none'">
    <div class="player-info">
      <div id="player-title"      class="player-title"></div>
      <div id="player-author"     class="player-author"></div>
      <div id="player-part-label" class="player-part-label"></div>
    </div>
  </div>

  <!-- Controls -->
  <div class="player-controls">
    <div class="player-buttons">
      <button id="btn-prev-part" class="player-btn" title="Previous part">⏮</button>
      <button id="btn-skip-back" class="player-btn player-btn-skip" title="-15s">
        ↺<span>15</span>
      </button>
      <button id="btn-play-pause" class="player-btn player-btn-main">▶</button>
      <button id="btn-skip-fwd" class="player-btn player-btn-skip" title="+15s">
        ↻<span>15</span>
      </button>
      <button id="btn-next-part" class="player-btn" title="Next part">⏭</button>
    </div>
    <div class="player-progress">
      <span id="player-time-now" class="player-time">0:00</span>
      <div id="player-seek" class="player-seek">
        <div id="player-seek-fill" class="player-seek-fill" style="width:0%"></div>
      </div>
      <span id="player-time-dur" class="player-time">0:00</span>
    </div>
  </div>

  <!-- Right side -->
  <div class="player-right">
    <!-- Speed -->
    <div class="player-speed">
      <button id="player-speed-btn" class="player-speed-btn">1x</button>
      <div id="player-speed-menu" class="player-speed-menu">
        <div class="player-speed-option" data-idx="0">0.5x</div>
        <div class="player-speed-option" data-idx="1">0.75x</div>
        <div class="player-speed-option active" data-idx="2">1x</div>
        <div class="player-speed-option" data-idx="3">1.25x</div>
        <div class="player-speed-option" data-idx="4">1.5x</div>
        <div class="player-speed-option" data-idx="5">1.75x</div>
        <div class="player-speed-option" data-idx="6">2x</div>
      </div>
    </div>

    <!-- Volume -->
    <div class="player-volume">
      <button id="player-vol-btn" class="player-volume-btn">🔊</button>
      <input type="range" id="player-vol-slider" class="player-volume-slider" min="0" max="100" value="80">
    </div>

    <!-- Fullscreen -->
    <button id="player-fs-btn" class="player-btn" title="Fullscreen">⤢</button>
  </div>
</div>

<!-- Fullscreen Player -->
<div id="player-fullscreen">
  <button id="player-fs-close" class="player-fs-close">✕</button>
  <img id="player-fs-cover" class="player-fs-cover" src="" alt="">
  <div id="player-fs-title"  class="player-fs-title"></div>
  <div id="player-fs-author" class="player-fs-author"></div>
</div>

<!-- Toast container -->
<div id="toast-container"></div>`;

  // ── Inject HTML ─────────────────────────────────────────
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  document.body.insertAdjacentHTML('beforeend',  PLAYER_HTML);

  // ── Add footer on pages that don't have one ──────────────
  if (!document.querySelector('footer.footer')) {
    const FOOTER_HTML = `
    <footer class="footer" style="background:var(--bg-surface);border-top:1px solid var(--border);padding:40px 0 24px;padding-bottom:calc(24px + var(--player-h))">
      <div style="max-width:1280px;margin:0 auto;padding:0 24px">
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:48px;margin-bottom:32px">
          <div>
            <div style="font-family:var(--font-display);font-size:1.4rem;color:var(--amber);margin-bottom:12px">📚 AudioBooks</div>
            <p style="font-size:0.875rem;color:var(--text-muted);line-height:1.7" data-i18n="hero_subtitle"></p>
          </div>
          <div>
            <div style="font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-bottom:16px" id="footer-about-title"></div>
            <div style="display:flex;gap:16px;margin-top:4px">
              <a href="#" onclick="return false" style="color:var(--text-muted);font-size:1.4rem;transition:color .2s;text-decoration:none" onmouseover="this.style.color='var(--amber)'" onmouseout="this.style.color='var(--text-muted)'">𝕏</a>
              <a href="#" onclick="return false" style="color:var(--text-muted);font-size:1.4rem;transition:color .2s;text-decoration:none" onmouseover="this.style.color='var(--amber)'" onmouseout="this.style.color='var(--text-muted)'">in</a>
              <a href="#" onclick="return false" style="color:var(--text-muted);font-size:1.4rem;transition:color .2s;text-decoration:none" onmouseover="this.style.color='var(--amber)'" onmouseout="this.style.color='var(--text-muted)'">▶</a>
              <a href="#" onclick="return false" style="color:var(--text-muted);font-size:1.4rem;transition:color .2s;text-decoration:none" onmouseover="this.style.color='var(--amber)'" onmouseout="this.style.color='var(--text-muted)'">f</a>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
          <div style="font-size:.8rem;color:var(--text-muted)">© 2026 AudioBooks · Rīgas Valsts Tehnikums</div>
        </div>
      </div>
    </footer>`;
    document.querySelector('.main-content')?.insertAdjacentHTML('afterend', FOOTER_HTML);
    updateFooterI18n();
  }

  function updateFooterI18n() {
    const lang = i18n.current;
    const title = lang==='ru'?'О НАС':lang==='en'?'ABOUT US':'PAR MUMS';
    const t = document.getElementById('footer-about-title');
    if (t) t.textContent = title;
  }

  // Update footer on language change
  const _navOrigSet = i18n.set.bind(i18n);
  i18n.set = function(lang) {
    _navOrigSet(lang);
    updateFooterI18n();
  };

  // ── Highlight active nav link ────────────────────────────
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href')?.endsWith(currentPage)) {
      link.classList.add('active');
    }
  });

  // ── Auth state ───────────────────────────────────────────
  function updateNavAuth() {
    const user = api.getUser();
    const guest = document.getElementById('nav-guest');
    const userEl = document.getElementById('nav-user');

    if (user) {
      guest?.classList.add('hidden');
      userEl?.classList.remove('hidden');

      // Avatar or placeholder
      const avatar = document.getElementById('nav-avatar');
      const placeholder = document.getElementById('nav-avatar-placeholder');
      if (user.avatar_url && avatar) {
        avatar.src = user.avatar_url;
        avatar.classList.remove('hidden');
        placeholder?.classList.add('hidden');
      } else if (placeholder) {
        placeholder.textContent = (user.username?.[0] || '?').toUpperCase();
      }

      // Show auth-only links
      document.querySelectorAll('.nav-auth-only').forEach(el => el.classList.remove('hidden'));

      // Mod links
      if (['moderator','admin'].includes(user.role)) {
        document.querySelectorAll('.nav-mod-only').forEach(el => el.classList.remove('hidden'));
      }
    } else {
      guest?.classList.remove('hidden');
      userEl?.classList.add('hidden');
      document.querySelectorAll('.nav-auth-only, .nav-mod-only').forEach(el => el.classList.add('hidden'));
    }
  }

  // ── Dropdown toggle ──────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#nav-user-btn');
    const dropdown = document.getElementById('nav-dropdown');
    if (btn) {
      const isOpen = dropdown?.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
    } else if (!e.target.closest('#nav-user')) {
      if (dropdown) dropdown.style.display = 'none';
    }

    // Logout
    if (e.target.closest('#nav-logout-btn')) {
      api.clearAuth();
      window.location.href = '/pages/index.html';
    }

    // Mobile menu
    if (e.target.closest('#nav-hamburger')) {
      document.getElementById('nav-links')?.classList.toggle('open');
    }
  });

  // ── Language switcher ────────────────────────────────────
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.lang-btn');
    if (btn) {
      i18n.set(btn.dataset.lang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b === btn));
    }
  });

  // ── Show hamburger on mobile ─────────────────────────────
  function handleResize() {
    const ham = document.getElementById('nav-hamburger');
    if (ham) ham.style.display = window.innerWidth < 768 ? 'block' : 'none';
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  // ── Init everything ──────────────────────────────────────
  updateNavAuth();
  i18n.init();
  Player.init();
})();

// ── Confirm Modal (replaces native confirm()) ─────────────
window.showConfirm = function(message, onConfirm, onCancel) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:400px;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:16px">⚠️</div>
      <h3 class="modal-title" style="margin-bottom:12px">${window.t ? t('confirm_delete') : 'Vai tiešām dzēst?'}</h3>
      <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:28px">${message}</p>
      <div style="display:flex;gap:12px;justify-content:center">
        <button id="confirm-cancel" class="btn btn-secondary">${window.t ? t('cancel') : 'Atcelt'}</button>
        <button id="confirm-ok" class="btn btn-danger">${window.t ? t('delete') : 'Dzēst'}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-ok').addEventListener('click', () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  });
  overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
    overlay.remove();
    if (onCancel) onCancel();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); if (onCancel) onCancel(); }
  });
};
