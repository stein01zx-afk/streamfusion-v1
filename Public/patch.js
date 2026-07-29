(() => {
  const WAIT_MS = 50;
  const PLATFORM_LABEL = {
    tiktok: 'TikTok',
    twitch: 'Twitch',
  };

  function sf() {
    return window.__streamfusion || {};
  }

  function getSocket() {
    return sf().socket || null;
  }

  function getToken() {
    return sf().sessionToken || localStorage.getItem('streamfusion.sessionToken') || '';
  }

  function esc(v) {
    return String(v ?? '').replace(/[&<>"]|'/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  function toast(message, variant = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `toast ${variant}`;
    div.innerHTML = `<div class="toastTitle">${variant === 'success' ? 'Realizado' : variant === 'error' ? 'Error' : 'Aviso'}</div><div class="toastBody">${esc(message)}</div>`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3000);
  }

  function ensureEditorModal() {
    if (document.getElementById('accountEditorModal')) return;
    const modal = document.createElement('div');
    modal.id = 'accountEditorModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="accountEditorCard">
        <div class="settingsTop">
          <h2 id="accountEditorTitle">Cambiar cuenta</h2>
          <button id="accountEditorClose" class="iconBtn closeBtn">✕</button>
        </div>
        <div class="field" style="margin-top:14px;">
          <label id="accountEditorLabel">Username</label>
          <input id="accountEditorInput" type="text" placeholder="@username" autocomplete="off" />
        </div>
        <div class="accountEditorHint" id="accountEditorHint">Se reemplazará la cuenta actual por esta nueva.</div>
        <div class="settingsActions" style="margin-top:16px;">
          <button id="accountEditorCancel" class="secondaryBtn" type="button">Cancelar</button>
          <button id="accountEditorSave" class="primaryBtn" type="button">Guardar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function openEditor(platform, initialValue = '') {
    ensureEditorModal();
    const modal = document.getElementById('accountEditorModal');
    const title = document.getElementById('accountEditorTitle');
    const label = document.getElementById('accountEditorLabel');
    const hint = document.getElementById('accountEditorHint');
    const input = document.getElementById('accountEditorInput');
    const save = document.getElementById('accountEditorSave');
    const close = document.getElementById('accountEditorClose');
    const cancel = document.getElementById('accountEditorCancel');

    const pretty = PLATFORM_LABEL[platform] || platform;
    title.textContent = initialValue ? `Cambiar ${pretty}` : `Conectar ${pretty}`;
    label.textContent = pretty === 'TikTok' ? 'TikTok username' : 'Twitch username';
    hint.textContent = initialValue ? `Se desconectará la cuenta actual y se conectará la nueva cuenta de ${pretty}.` : `Ingresa el username para conectar ${pretty}.`;
    input.value = initialValue;

    function cleanup() {
      modal.classList.remove('modal-open');
      save.onclick = null;
      close.onclick = null;
      cancel.onclick = null;
      modal.onclick = null;
    }

    function doSave() {
      const username = input.value.trim();
      if (!username) {
        toast('Escribe un username válido.', 'warning');
        return;
      }
      const socket = getSocket();
      if (!socket) {
        toast('Socket no disponible.', 'error');
        return;
      }
      const token = getToken();
      if (!token) {
        toast('Sesión no disponible.', 'error');
        return;
      }

      const shouldDisconnectFirst = Boolean(initialValue && initialValue.trim());
      if (shouldDisconnectFirst) {
        socket.emit(platform === 'tiktok' ? 'disconnectTikTok' : 'disconnectTwitch');
      }
      setTimeout(() => {
        socket.emit(platform === 'tiktok' ? 'connectTikTok' : 'connectTwitch', { token, username });
      }, shouldDisconnectFirst ? 120 : 0);
      cleanup();
      toast('Realizado.', 'success');
    }

    save.onclick = doSave;
    close.onclick = cleanup;
    cancel.onclick = cleanup;
    modal.onclick = (ev) => { if (ev.target === modal) cleanup(); };
    input.onkeydown = (ev) => { if (ev.key === 'Enter') doSave(); if (ev.key === 'Escape') cleanup(); };
    modal.classList.add('modal-open');
    setTimeout(() => input.focus(), 20);
  }

  function injectButtons() {
    const strip = document.getElementById('accountStrip');
    if (!strip) return;

    strip.querySelectorAll('.accountCard').forEach((card) => {
      if (card.querySelector('.accountActions')) return;

      const badge = card.querySelector('.accountBadge');
      const platform = card.dataset.platform || (badge?.classList.contains('twitch') ? 'twitch' : 'tiktok');
      const statusLabel = (card.querySelector('.accountStatus')?.textContent || '').toLowerCase();
      const nameLabel = (card.querySelector('.accountName')?.textContent || '').trim().toLowerCase();
      const isIdle = statusLabel.includes('desconect') || statusLabel.includes('idle') || !nameLabel || nameLabel === 'streamfusion';

      const actions = document.createElement('div');
      actions.className = 'accountActions';

      if (isIdle) {
        actions.innerHTML = `<button class="accountActionBtn connect">Conectar</button>`;
      } else {
        actions.innerHTML = `
          <button class="accountActionBtn change">Cambiar</button>
          <button class="accountActionBtn secondary disconnect">Desconectar</button>
        `;
      }

      card.appendChild(actions);

      const connectBtn = actions.querySelector('.connect');
      const changeBtn = actions.querySelector('.change');
      const disconnectBtn = actions.querySelector('.disconnect');
      const currentName = card.querySelector('.accountName')?.textContent?.trim() || '';
      const initialValue = currentName && currentName !== 'StreamFusion' ? currentName : '';

      if (connectBtn) {
        connectBtn.addEventListener('click', () => openEditor(platform));
      }

      if (changeBtn) {
        changeBtn.addEventListener('click', () => openEditor(platform, initialValue));
      }

      if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
          const socket = getSocket();
          if (!socket) return toast('Socket no disponible.', 'error');
          socket.emit(platform === 'tiktok' ? 'disconnectTikTok' : 'disconnectTwitch');
          toast(`Se desconectó ${PLATFORM_LABEL[platform]}.`, 'success');
        });
      }
    });
  }

  function observe() {
    const strip = document.getElementById('accountStrip');
    if (!strip) return false;
    injectButtons();
    const observer = new MutationObserver(() => injectButtons());
    observer.observe(strip, { childList: true, subtree: true });
    return true;
  }

  function boot() {
    ensureEditorModal();
    if (!observe()) {
      setTimeout(boot, WAIT_MS);
    }
  }

  boot();
})();

