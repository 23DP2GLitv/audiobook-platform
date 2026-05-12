// frontend/js/confirm-modal.js
// Глобальное модальное окно подтверждения

(function() {
  const style = document.createElement('style');
  style.textContent = `
    #confirm-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 9000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
      animation: fadeIn 0.2s ease;
    }
    #confirm-modal {
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 32px;
      max-width: 420px;
      width: 100%;
      animation: slideUp 0.25s ease;
    }
    #confirm-modal-icon { font-size: 2.5rem; text-align: center; margin-bottom: 16px; }
    #confirm-modal-title {
      font-family: var(--font-display);
      font-size: 1.3rem;
      text-align: center;
      margin-bottom: 8px;
    }
    #confirm-modal-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
      text-align: center;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    #confirm-modal-btns {
      display: flex; gap: 12px;
    }
    #confirm-modal-btns button { flex: 1; }
  `;
  document.head.appendChild(style);

  window.confirmModal = function({ title, text, icon = '🗑️', confirmText, confirmClass = 'btn-danger' } = {}) {
    return new Promise((resolve) => {
      // Remove existing
      document.getElementById('confirm-modal-overlay')?.remove();

      const cancelLabel  = (window.t && t('cancel'))  || 'Atcelt';
      const deleteLabel  = (window.t && t('delete'))  || 'Dzēst';
      const defaultTitle = (window.t && t('confirm_delete')) || 'Vai tiešām?';
      const defaultText  = i18n?.current === 'ru' ? 'Это действие нельзя отменить.'
                         : i18n?.current === 'en' ? 'This action cannot be undone.'
                         : 'Šo darbību nevar atcelt.';

      const overlay = document.createElement('div');
      overlay.id = 'confirm-modal-overlay';
      overlay.innerHTML = `
        <div id="confirm-modal">
          <div id="confirm-modal-icon">${icon}</div>
          <div id="confirm-modal-title">${title || defaultTitle}</div>
          <div id="confirm-modal-text">${text || defaultText}</div>
          <div id="confirm-modal-btns">
            <button class="btn btn-secondary" id="confirm-cancel">${cancelLabel}</button>
            <button class="btn ${confirmClass}" id="confirm-ok">${confirmText || deleteLabel}</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);

      overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
        overlay.remove(); resolve(false);
      });
      overlay.querySelector('#confirm-ok').addEventListener('click', () => {
        overlay.remove(); resolve(true);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); resolve(false); }
      });
    });
  };
})();
