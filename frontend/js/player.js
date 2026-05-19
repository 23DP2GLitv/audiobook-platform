// frontend/js/player.js
// ── Global Audio Player ───────────────────────────────────

const Player = (() => {
  let audio        = new Audio();
  let currentBook  = null;
  let currentParts = [];
  let currentPart  = 0;
  let saveInterval = null;
  let isDragging   = false;

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  let speedIdx = 2; // default 1x

  // ── DOM references ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);

  const el = {
    player:     () => $('#player'),
    cover:      () => $('#player-cover'),
    title:      () => $('#player-title'),
    author:     () => $('#player-author'),
    partLabel:  () => $('#player-part-label'),
    btnPlay:    () => $('#btn-play-pause'),
    btnPrev:    () => $('#btn-prev-part'),
    btnNext:    () => $('#btn-next-part'),
    btnBack:    () => $('#btn-skip-back'),
    btnFwd:     () => $('#btn-skip-fwd'),
    seek:       () => $('#player-seek'),
    seekFill:   () => $('#player-seek-fill'),
    timeNow:    () => $('#player-time-now'),
    timeDur:    () => $('#player-time-dur'),
    speedBtn:   () => $('#player-speed-btn'),
    speedMenu:  () => $('#player-speed-menu'),
    volSlider:  () => $('#player-vol-slider'),
    volBtn:     () => $('#player-vol-btn'),
    fsBtn:      () => $('#player-fs-btn'),
    fsClose:    () => $('#player-fs-close'),
    fsPanel:    () => $('#player-fullscreen'),
    fsCover:    () => $('#player-fs-cover'),
    fsTitle:    () => $('#player-fs-title'),
    fsAuthor:   () => $('#player-fs-author'),
  };

  // ── Utilities ────────────────────────────────────────────
  function formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      : `${m}:${String(s).padStart(2,'0')}`;
  }

  function updateUI() {
    if (!currentBook) return;

    // Book info
    const cover = el.cover();
    if (cover) {
      cover.src = currentBook.cover_url
        ? `window.location.origin +currentBook.cover_url}`
        : '';
      if (!currentBook.cover_url) cover.style.display = 'none';
    }
    if (el.title()) el.title().textContent = currentBook.title;
    if (el.author()) el.author().textContent = currentBook.author_name || '';

    const part = currentParts[currentPart];
    if (el.partLabel() && part) {
      el.partLabel().textContent = `${t('player_part')} ${part.part_number}${part.part_title ? ' · ' + part.part_title : ''}`;
    }

    // Fullscreen
    if (el.fsCover()) el.fsCover().src = cover?.src || '';
    if (el.fsTitle()) el.fsTitle().textContent = currentBook.title;
    if (el.fsAuthor()) el.fsAuthor().textContent = currentBook.author_name || '';

    // Show player
    const p = el.player();
    if (p) p.classList.add('visible');
  }

  function updateProgress() {
    const now = audio.currentTime;
    const dur = audio.duration || 0;

    if (el.timeNow()) el.timeNow().textContent = formatTime(now);
    if (el.timeDur()) el.timeDur().textContent = formatTime(dur);

    if (!isDragging && dur > 0) {
      const pct = (now / dur) * 100;
      if (el.seekFill()) el.seekFill().style.width = pct + '%';
    }
  }

  function updatePlayBtn() {
    const btn = el.btnPlay();
    if (!btn) return;
    btn.innerHTML = audio.paused ? '▶' : '⏸';
  }

  // ── Audio events ─────────────────────────────────────────
  let _playStart = null;

  function _sendListenTime() {
    if (!api.isLoggedIn() || !_playStart) return;
    const elapsed = (Date.now() - _playStart) / 1000;
    _playStart = null;
    if (elapsed > 1) api.users.addListenTime(elapsed).catch(() => {});
  }

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('play', () => {
    updatePlayBtn();
    _playStart = Date.now();
  });
  audio.addEventListener('pause', () => {
    updatePlayBtn();
    _sendListenTime();
    saveProgress(false);
  });
  audio.addEventListener('ended', () => {
    _sendListenTime();
    if (currentPart < currentParts.length - 1) {
      currentPart++;
      loadPart(currentPart);
      audio.play();
    } else {
      saveProgress(true);
    }
  });

  // Fallback — если прогресс >= 98% от общей длины книги — считаем завершённой
  let _completedSent = false;
  audio.addEventListener('timeupdate', () => {
    if (_completedSent || !currentBook) return;
    const totalDur = currentBook.duration_sec || 0;
    if (totalDur <= 0) return;
    let elapsed = 0;
    for (let i = 0; i < currentPart; i++) elapsed += (currentParts[i]?.duration_sec || 0);
    elapsed += audio.currentTime;
    if (elapsed >= totalDur * 0.98) {
      _completedSent = true;
      saveProgress(true);
    }
  });
  audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    showToast('Audio playback error', 'error');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && currentBook) {
      _sendListenTime();
      saveProgress(false);
    } else if (document.visibilityState === 'visible' && !audio.paused) {
      _playStart = Date.now();
    }
  });
  window.addEventListener('beforeunload', () => {
    if (currentBook) _sendListenTime();
  });

  // ── Load / Play ──────────────────────────────────────────
  function loadPart(partIdx) {
    currentPart = partIdx;
    const part  = currentParts[partIdx];
    if (!part) return;

    const url = api.books.streamUrl(currentBook.id, part.id);
    audio.src = url;
    audio.load();
    updateUI();
  }

  function play(book, parts, startPartIdx = 0, startSec = 0) {
    currentBook  = book;
    currentParts = parts;
    currentPart  = startPartIdx;
    _completedSent = false;

    loadPart(startPartIdx);
    audio.currentTime = startSec || 0;
    audio.play().catch(err => console.error('Play failed:', err));

    // Auto-save progress every 5s
    if (saveInterval) clearInterval(saveInterval);
    if (api.isLoggedIn()) {
      saveInterval = setInterval(() => saveProgress(false), 5000);
    }

    updateUI();
  }

  // ── Save progress to server ──────────────────────────────
  async function saveProgress(completed = false) {
    if (!api.isLoggedIn() || !currentBook) return;
    try {
      // Суммарное время = все предыдущие части + текущая позиция
      let totalElapsed = 0;
      for (let i = 0; i < currentPart; i++) {
        totalElapsed += (currentParts[i]?.duration_sec || 0);
      }
      totalElapsed += Math.floor(audio.currentTime);

      await api.users.saveProgress({
        audiobook_id: currentBook.id,
        file_id:      currentParts[currentPart]?.id || null,
        progress_sec: totalElapsed,
        completed,
      });
    } catch {}
  }

  // ── Controls ─────────────────────────────────────────────
  function bindControls() {
    // Play/Pause
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-play-pause')) {
        audio.paused ? audio.play() : audio.pause();
      }

      // Skip ±15s
      if (e.target.closest('#btn-skip-back')) { audio.currentTime = Math.max(0, audio.currentTime - 15); }
      if (e.target.closest('#btn-skip-fwd'))  { audio.currentTime = audio.currentTime + 15; }

      // Prev / Next part
      if (e.target.closest('#btn-prev-part') && currentPart > 0) {
        currentPart--; loadPart(currentPart); audio.play();
      }
      if (e.target.closest('#btn-next-part') && currentPart < currentParts.length - 1) {
        currentPart++; loadPart(currentPart); audio.play();
      }

      // Speed menu toggle
      if (e.target.closest('#player-speed-btn')) {
        el.speedMenu()?.classList.toggle('open');
        el.speedBtn()?.classList.toggle('open');
      }

      // Speed option
      if (e.target.closest('.player-speed-option')) {
        speedIdx = parseInt(e.target.dataset.idx);
        audio.playbackRate = SPEEDS[speedIdx];
        if (el.speedBtn()) el.speedBtn().textContent = SPEEDS[speedIdx] + 'x';
        document.querySelectorAll('.player-speed-option').forEach((o, i) => {
          o.classList.toggle('active', i === speedIdx);
        });
        el.speedMenu()?.classList.remove('open');
        el.speedBtn()?.classList.remove('open');
      }

      // Volume mute
      if (e.target.closest('#player-vol-btn')) {
        audio.muted = !audio.muted;
        if (el.volBtn()) el.volBtn().textContent = audio.muted ? '🔇' : '🔊';
      }

      // Fullscreen
      if (e.target.closest('#player-fs-btn')) {
        el.fsPanel()?.classList.add('open');
      }
      if (e.target.closest('#player-fs-close')) {
        el.fsPanel()?.classList.remove('open');
      }

      // Close speed menu on outside click
      if (!e.target.closest('.player-speed')) {
        el.speedMenu()?.classList.remove('open');
        el.speedBtn()?.classList.remove('open');
      }
    });

    // Seek bar
    const seekBar = document.getElementById('player-seek');
    if (seekBar) {
      seekBar.addEventListener('mousedown', startDrag);
      seekBar.addEventListener('touchstart', startDrag, { passive: true });
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('touchmove', onDrag, { passive: true });
      document.addEventListener('mouseup',  endDrag);
      document.addEventListener('touchend', endDrag);
    }

    // Volume slider
    document.addEventListener('input', (e) => {
      if (e.target.id === 'player-vol-slider') {
        audio.volume = e.target.value / 100;
      }
    });
  }

  function seekToPercent(pct) {
    const dur = audio.duration;
    if (dur) {
      audio.currentTime = (pct / 100) * dur;
      if (el.seekFill()) el.seekFill().style.width = pct + '%';
    }
  }

  function getSeekPct(e, bar) {
    const rect = bar.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    return pct;
  }

  function startDrag(e) {
    isDragging = true;
    seekToPercent(getSeekPct(e, e.currentTarget));
  }
  function onDrag(e) {
    if (!isDragging) return;
    const bar = document.getElementById('player-seek');
    if (bar) seekToPercent(getSeekPct(e, bar));
  }
  function endDrag() { isDragging = false; }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    bindControls();
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
      if (e.code === 'ArrowLeft')  { audio.currentTime = Math.max(0, audio.currentTime - 15); }
      if (e.code === 'ArrowRight') { audio.currentTime += 15; }
    });
  }

  return {
    play, init, audio,
    getState: () => ({
      book:  currentBook,
      parts: currentParts,
      part:  currentPart,
      time:  audio.currentTime,
      paused: audio.paused,
    })
  };
})();

// ── Toast utility ─────────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.Player    = Player;
window.showToast = showToast;
