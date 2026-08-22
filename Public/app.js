(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const TOKEN_KEY = 'sf.token.v3';
  const SESSION_KEY = 'sf.session.v3';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const token = () => localStorage.getItem(TOKEN_KEY) || '';
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  const api = async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token()) headers.set('Authorization', `Bearer ${token()}`);
    const res = await fetch(url, { ...options, headers });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const defaultSettings = {
    panels:{chat:true,events:true,gifts:true}, order:'events-gifts', filters:{chat:'all',event:'all',gift:'all'},
    voiceList:{enabled:true,transparent:true,backgroundOpacity:0,fontFamily:'Inter, Arial, sans-serif',fontSize:28,fontWeight:700,fontStyle:'normal',textColor:'#000000',textShadow:'none',shadowColor:'#000000',outlineWidth:0,outlineColor:'#000000',textTransform:'none',letterSpacing:0,lineHeight:1.2,itemGap:10,align:'left',listPosition:'left',axis:'vertical',movementDirection:'forward',autoShowEnabled:false,autoShowEvery:30,autoShowFor:6,direction:'vertical',motion:'static',motionSpeed:24,showIndex:false,showId:false,selectedVoice:'',overrides:{},roulette:{enabled:false}},
    tiktokModerators:[],
    personalization:{theme:'dark',font:'inter',animation:'slide',chatLayout:'vertical',chatDirection:'down',chatTheme:'cloud',chatAdjustMessages:false,avatarFrame:'platform',bubbleFrame:'platform',avatarSize:'md',nameSize:'md',nameWeight:'800',showPlatformPill:true,showTimestamps:true,showActivity:true,bubbleRadius:12,avatarBorderWidth:2,messagePadding:7,rowGap:5,tiktokNameColor:'white',twitchNameColor:'real',chatOverlayCardSide:'center',badgeStyle:'emoji',tiktokNameColor:'white',twitchNameColor:'real',messageEffect:'shadow',nameEffect:'shadow',textColor:'auto',showBadges:true,showEmotes:true,highlightSupporters:true,supporterHighlightStyle:'gold',highlightEventUsername:true,highlightLikes:true,highlightFollows:true,highlightJoins:true,highlightShares:true,highlightSystem:true,highlightFanclub:true,highlightSuperfan:true,highlightGifts:true,highlightSubs:true,highlightBits:true,highlightRaids:true,autoClearChat:false,clearChatSeconds:30,eventsLayout:'vertical',eventsDirection:'down',eventsMode:'slide',eventsPanelSize:'normal',eventsOverlayShape:'normal',eventsOverlayCardSide:'center',eventsCardFrame:true,giftsLayout:'vertical',giftsDirection:'down',giftsMode:'slide',giftsPanelSize:'normal',giftsOverlayShape:'normal',giftsOverlayCardSide:'center',giftsCardFrame:true,giftHighlightStyle:'gold',overlayEventHighlightStyle:'platform',overlayGiftImageSize:'md',overlayGiftComposition:'normal',overlayNameColorMode:'platform',overlayNameColor:'#ffffff',overlayEventFont:'inherit',overlayGiftDisplayMode:'full',overlayGiftCompositionMode:'vertical-centered',eventVisibility:{likes:true,follows:true,joins:true,shares:true,system:true,gifts:true,subscriptions:true,bits:true,raids:true,hosts:true}},
    appearance:{theme:'dark',accent:'#7c5cff'}
  };

  const merge = (base, incoming) => {
    if (Array.isArray(base) || Array.isArray(incoming)) return incoming ?? base;
    if (!base || typeof base !== 'object') return incoming ?? base;
    if (!incoming || typeof incoming !== 'object') return base;
    const out = { ...base };
    for (const key of Object.keys(incoming)) out[key] = key in base ? merge(base[key], incoming[key]) : incoming[key];
    return out;
  };

  let user = null;
  let settings = structuredClone(defaultSettings);
  let socket = null;
  let page = 'dashboard';
  let authMode = 'login';
  let activeCustomizeTab = 'chat';
  let voiceCatalogRequest = 0;
  let popupWindows = new Set();
  let dashboardClearTimer = null;

  const state = {
    chat:[], events:[], gifts:[],
    accounts:{tiktok:{}, twitch:{}},
    voices:[], catalog:[],
    activity:{tiktok:{},twitch:{}},
    supporters:{tiktok:{},twitch:{}},
    avatarCache:new Map(), avatarPending:new Map(),
    historyLoaded:false,
    connection:'offline',
    previewChat:[],
    previewEventIndex:0,
    previewGiftIndex:0
  };

  const pageMeta = {
    dashboard:['TU ESTUDIO','Dashboard'], connections:['CANALES','Conexiones'], customize:['DISEÑO','Personalización'],
    overlays:['EN ESCENA','Overlays'], roulette:['DINÁMICA','Ruleta'], voices:['VOZ','Voces'], widgets:['WIDGETS','Widgets'], settings:['PREFERENCIAS','Ajustes']
  };

  function toast(title, message='', type='ok') {
    const stack = $('toastStack'); if (!stack) return;
    const n = document.createElement('div'); n.className = `toast ${type === 'err' ? 'error' : ''}`;
    n.innerHTML = `<strong>${esc(title)}</strong><span>${esc(message)}</span>`;
    stack.appendChild(n); setTimeout(() => n.remove(), 4200);
  }

  function applyAppearance() {
    const a = settings.appearance || {};
    document.body.dataset.theme = a.theme || 'dark';
    document.documentElement.style.setProperty('--accent', a.accent || '#7c5cff');
  }

  function isConnected(platform) { return Boolean(state.accounts[platform]?.connected); }

  function renderTop() {
    const fallbackName = user?.displayName || 'Creador';
    $('userName').textContent = fallbackName;
    $('userEmail').textContent = user?.email || 'Plan Studio';
    const firstConnected = ['tiktok','twitch'].map(p => state.accounts[p]).find(a => a?.connected && a.avatarUrl);
    const img = $('userInitial');
    if (img) {
      if (img.tagName === 'IMG') {
        img.src = firstConnected?.avatarUrl || '/coin-logo.png';
      } else {
        img.innerHTML = firstConnected?.avatarUrl ? `<img src="${esc(firstConnected.avatarUrl)}" alt="">` : esc(fallbackName.charAt(0).toUpperCase());
      }
    }
    $('topAccounts').innerHTML = ['tiktok','twitch'].map(platform => {
      const a = state.accounts[platform] || {};
      const name = a.username || 'Sin conectar';
      return `<div class="top-account ${a.connected ? 'on' : ''}">
        <span class="top-account-avatar">${a.connected ? `<img src="${esc(a.avatarUrl || '/coin-logo.png')}" alt="" onerror="this.src='/coin-logo.png'">` : `<span class="account-avatar-initial">${platform==='tiktok'?'TT':'TW'}</span>`}</span>
        <span class="dot"></span><b>${platform === 'tiktok' ? 'TikTok' : 'Twitch'}</b><span>${esc(name)}</span>
      </div>`;
    }).join('');
  }

  function activateNav() {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
    $('pageKicker').textContent = pageMeta[page]?.[0] || 'STREAMFUSION';
    $('pageTitle').textContent = pageMeta[page]?.[1] || page;
  }

  function normalizeUsername(value) {
    return String(value || '').trim().replace(/^@+/, '').replace(/^#+/, '').split(/[/?#]/)[0];
  }

  function avatarIdentity(item = {}) {
    return normalizeUsername(item.uniqueId || item.username || item.user || item.displayName || 'user');
  }

  function avatarKey(platform, username) { return `${String(platform||'').toLowerCase()}:${normalizeUsername(username).toLowerCase()}`; }

  function generatedAvatar(platform='user', username='Usuario') {
    const label = normalizeUsername(username) || 'U';
    const initial = (label.match(/[A-Za-z0-9ÁÉÍÓÚÑ]/)?.[0] || 'U').toUpperCase();
    const accent = String(platform).toLowerCase() === 'twitch' ? '#9146ff' : '#fe2c55';
    const bg = String(platform).toLowerCase() === 'twitch' ? '#111827' : '#17202d';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${accent}"/><stop offset="100%" stop-color="${bg}"/></linearGradient></defs><rect width="128" height="128" rx="64" fill="url(#g)"/><text x="50%" y="57%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="58" font-weight="800" fill="#fff">${initial}</text></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function isUsableViewerAvatar(value) {
    const src = String(value || '').trim();
    if (!src) return false;
    if (/coin-logo\.png/i.test(src)) return false;
    return /^(https?:|data:image\/|blob:)/i.test(src);
  }

  async function resolveAvatar(platform, username) {
    const clean = normalizeUsername(username);
    if (!clean) return generatedAvatar(platform, 'user');
    const key = avatarKey(platform, clean);
    if (state.avatarCache.has(key)) return state.avatarCache.get(key);
    if (state.avatarPending.has(key)) return state.avatarPending.get(key);
    const fallback = generatedAvatar(platform, clean);
    const promise = api(`/api/avatar?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(clean)}`)
      .then(d => isUsableViewerAvatar(d.avatarUrl) ? d.avatarUrl : fallback)
      .catch(() => fallback)
      .then(url => { state.avatarCache.set(key, url); return url; })
      .finally(() => state.avatarPending.delete(key));
    state.avatarPending.set(key, promise);
    return promise;
  }

  function queueAvatarImages(root = document) {
    root.querySelectorAll('img[data-avatar-platform][data-avatar-user]').forEach(img => {
      const platform = img.dataset.avatarPlatform;
      const username = img.dataset.avatarUser;
      resolveAvatar(platform, username).then(url => {
        if (img.isConnected) img.src = url;
      });
    });
  }

  const roleBadgeMap = {
    verified:'✓', moderator:'🛡️', mod:'🛡️', vip:'💎', subscriber:'🎟️', subscriber_badge:'🎟️', sub:'🎟️',
    founder:'🏆', premium:'✨', staff:'⚙️', broadcaster:'📣', member:'👤', fanclub:'👻', superfan:'👤'
  };

  function badgeMarkup(raw) {
    if (settings.personalization.showBadges === false) return '';
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[ ,|]+/).filter(Boolean) : [];
    return list.slice(0,5).map(b => `<span class="badge-pill" title="${esc(b)}">${esc(roleBadgeMap[String(b).toLowerCase()] || '•')}</span>`).join('');
  }

  function activityStore(platform, key) {
    const p = String(platform || 'tiktok').toLowerCase() === 'twitch' ? 'twitch' : 'tiktok';
    if (!state.activity[p][key]) state.activity[p][key] = { joined:false, like:false, gift:false, giftImage:'', giftName:'' };
    return state.activity[p][key];
  }
  function profileKey(item) { return normalizeUsername(item.username || item.uniqueId || item.displayName || item.user || 'user').toLowerCase(); }
  function recordActivity(item) {
    const p = String(item.platform || 'tiktok').toLowerCase(); const key = profileKey(item); const type = String(item.type || item.event || '').toLowerCase();
    const a = activityStore(p, key);
    if (type.includes('join') || type === 'member') a.joined = true;
    if (type.includes('like') || type === 'heartme') a.like = true;
    if (type.includes('gift') || type === 'sub' || type === 'bits' || type === 'raid' || item.gift || item.giftName) {
      a.gift = true;
      if (item.giftImage) a.giftImage = item.giftImage;
      if (item.gift || item.giftName) a.giftName = item.gift || item.giftName;
      state.supporters[p][key] = { displayName:item.displayName || item.username || key, at:Date.now() };
    }
  }
  function activityBadgeMarkup(item) {
    const a = activityStore(item.platform, profileKey(item)); const badges=[];
    if (a.joined && settings.personalization.highlightJoins !== false) badges.push('<span class="activity-badge" title="Se unió">👻</span>');
    if (a.like && settings.personalization.highlightLikes !== false) badges.push('<span class="activity-badge" title="Dio like">❤️</span>');
    if (a.gift && settings.personalization.highlightGifts !== false) {
      badges.push(`<span class="activity-badge gift-activity" title="${esc(a.giftName || 'Regalo')}">${a.giftImage ? `<img src="${esc(a.giftImage)}" alt="">` : '🎁'}</span>`);
    }
    return badges.join('');
  }
  function isSupporter(item) { return Boolean(state.supporters[String(item.platform||'tiktok').toLowerCase()]?.[profileKey(item)]); }

  function frameClass(item) {
    const p = settings.personalization;
    if (isSupporter(item) && p.highlightSupporters !== false) return 'avatar-frame-gold';
    if (p.avatarFrame === 'none') return 'avatar-frame-none';
    if (p.avatarFrame === 'ring') return 'avatar-frame-ring';
    if (p.avatarFrame === 'role') return 'avatar-frame-role';
    return 'avatar-frame-platform';
  }

  function bubbleClass(item) {
    const p = settings.personalization;
    if (p.bubbleFrame === 'none') return 'bubble-frame-none';
    if (p.bubbleFrame === 'role') return 'bubble-frame-role';
    return 'bubble-frame-platform';
  }

  function nameColor(item) {
    const p = settings.personalization || {};
    const platform = String(item.platform || 'tiktok').toLowerCase();
    if (p.nameColorMode === 'custom' && /^#[0-9a-f]{6}$/i.test(p.nameCustomColor || '')) return p.nameCustomColor;
    if (platform === 'twitch') {
      if (p.twitchNameColor === 'white') return '#ffffff';
      if (p.twitchNameColor === 'custom' && /^#[0-9a-f]{6}$/i.test(p.nameCustomColor || '')) return p.nameCustomColor;
      return '#c7a2ff';
    }
    if (p.tiktokNameColor === 'real') return '#fe6f92';
    if (p.tiktokNameColor === 'custom' && /^#[0-9a-f]{6}$/i.test(p.nameCustomColor || '')) return p.nameCustomColor;
    return '#ffffff';
  }

  function fontFamilyName() {
    const value = String(settings.personalization?.font || 'inter');
    return ({inter:'Inter, Manrope, sans-serif',poppins:'Poppins, sans-serif',montserrat:'Montserrat, sans-serif',oswald:'Oswald, sans-serif',system:'system-ui, sans-serif'})[value] || 'Inter, Manrope, sans-serif';
  }

  function styleVars(item) {
    const p = settings.personalization || {};
    const platform = String(item.platform || 'tiktok').toLowerCase();
    const accent = platform === 'twitch' ? '#9146ff' : '#fe2c55';
    const textColor = p.textColor === 'auto' || !p.textColor ? '#e8ecf4' : p.textColor;
    return `--row-accent:${accent};--name-color:${nameColor(item)};--message-color:${textColor};--bubble-radius:${Number(p.bubbleRadius ?? 12)}px;--avatar-border-width:${Number(p.avatarBorderWidth ?? 2)}px;--row-gap:${Number(p.rowGap ?? 5)}px;--message-padding:${Number(p.messagePadding ?? 7)}px 9px;--chat-font:${fontFamilyName()}`;
  }

  function giftMedia(item) {
    const image = item.giftImage || item.gift?.image || '';
    if (!image && !item.gift && !item.giftName) return '';
    const name = item.gift || item.giftName || 'Regalo';
    return `<div class="gift-media">${image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none'">` : '<span class="gift-fallback">🎁</span>'}<span>${esc(name)}</span>${item.amount ? `<small>×${esc(item.amount)}</small>` : ''}</div>`;
  }

  function stripEmojis(value) {
    return String(value || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s{2,}/g,' ').trim();
  }

  function messageRow(item, kind='chat') {
    const p = settings.personalization || {};
    const platform = String(item.platform || 'tiktok').toLowerCase();
    const userName = item.displayName || item.username || item.uniqueId || item.user || 'Usuario';
    const identity = avatarIdentity(item);
    const rawBody = item.message || item.action || '';
    const body = p.showEmotes === false ? stripEmojis(rawBody) : rawBody;
    const time = new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    const avatar = isUsableViewerAvatar(item.avatar) ? item.avatar : generatedAvatar(platform, identity);
    const showTime = p.showTimestamps !== false;
    const showPlatform = p.showPlatformPill !== false;
    const theme = p.chatTheme || 'cloud';
    const animation = p.animation || 'slide';
    return `<article class="stream-row ${kind} ${platform} chat-theme-${theme} chat-anim-${animation} ${isSupporter(item) ? 'supporter-gold' : ''} ${p.chatAdjustMessages !== false ? 'chat-adjust' : 'chat-no-adjust'}" style="${styleVars(item)}">
      <div class="chat-avatar ${frameClass(item)} size-${p.avatarSize || 'md'}">
        <img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(identity)}" src="${esc(avatar)}" alt="${esc(userName)}" loading="lazy" onerror="this.onerror=null;this.src='${esc(generatedAvatar(platform, identity))}'">
      </div>
      <div class="row-body">
        <div class="row-top">
          <strong class="name-size-${p.nameSize || 'md'} weight-${p.nameWeight || '800'}">${esc(userName)}</strong>
          ${badgeMarkup(item)}${p.showActivity !== false && p.highlightLikes !== false ? activityBadgeMarkup(item) : ''}
          ${showPlatform ? `<span class="platform-pill ${platform}">${platform === 'twitch' ? 'TW' : 'TT'}</span>` : ''}
          ${showTime ? `<time>${time}</time>` : ''}
        </div>
        ${body ? `<div class="row-message ${bubbleClass(item)}">${esc(body)}</div>` : ''}
        ${kind === 'gift' ? giftMedia(item) : ''}
      </div>
    </article>`;
  }

  function renderDashboard() {
    if (dashboardClearTimer) { clearInterval(dashboardClearTimer); dashboardClearTimer = null; }
    if (settings.personalization?.autoClearChat === true) dashboardClearTimer = setInterval(() => { if (page === 'dashboard') renderDashboard(); }, 1000);
    const selectedFilter = settings.filters.chat || 'all';
    const autoClear = settings.personalization?.autoClearChat === true;
    const clearMs = Math.max(5, Number(settings.personalization?.clearChatSeconds || 30)) * 1000;
    const cutoff = Date.now() - clearMs;
    const allChat = state.chat.slice(-300).filter(item => !autoClear || !item.timestamp || Number(item.timestamp) >= cutoff);
    const chat = allChat.filter(item => selectedFilter === 'all' || String(item.platform || '').toLowerCase() === selectedFilter);
    const ev = state.events.slice(-100); const gifts = state.gifts.slice(-100);
    $('view').innerHTML = `<div class="hero"><div><span class="live-dot"></span> ${state.connection === 'online' ? 'CONEXIÓN ACTIVA' : 'ESPERANDO CONEXIÓN'}<h2>Todo lo que pasa en tu live,<br><em>en un solo lugar.</em></h2><p>Este diseño del dashboard es independiente de los overlays. La conexión de tus canales alimenta ambos, pero cada vista mantiene su propio estilo.</p></div><div class="hero-stat"><strong>${allChat.length}</strong><span>mensajes retenidos</span></div></div>
      <div class="metric-grid"><article><span>◌</span><small>Mensajes</small><strong>${allChat.length}</strong><em>${selectedFilter === 'all' ? 'en memoria' : `filtro ${selectedFilter}`}</em></article><article><span>♡</span><small>Eventos</small><strong>${ev.length}</strong><em>actividad</em></article><article><span>◈</span><small>Regalos</small><strong>${gifts.length}</strong><em>supporters</em></article></div>
      <div class="dashboard-grid"><section class="card feed"><header><div><p class="eyebrow">EN VIVO</p><h3>Chat unificado</h3></div><div class="header-actions"><select id="dashChatFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></div></header><div id="dashChat" class="chat-feed">${chat.length ? chat.map(x=>messageRow(x)).join('') : '<div class="empty">No hay comentarios para este filtro todavía.</div>'}</div></section>
      <section class="card activity"><header><div><p class="eyebrow">ACTIVIDAD</p><h3>Eventos & regalos</h3></div></header><div id="dashActivity" class="event-feed">${[...ev.map(x=>messageRow(x,'event')),...gifts.map(x=>messageRow(x,'gift'))].reverse().join('') || '<div class="empty">Aún no hay actividad.</div>'}</div></section></div>`;
    const filter = $('dashChatFilter'); filter.value = selectedFilter; filter.onchange = () => { settings.filters.chat = filter.value; renderDashboard(); };
    queueAvatarImages(); requestAnimationFrame(() => { const f=$('dashChat'); if(f) f.scrollTop=f.scrollHeight; });
  }

  function renderConnections() {
    const card = (platform, label, placeholder) => { const a=state.accounts[platform]||{}; const accountAvatar = a.connected ? (a.avatarUrl || '/coin-logo.png') : ''; return `<article class="card connection-card"><div class="connection-top"><span class="connection-avatar">${a.connected ? `<img src="${esc(accountAvatar)}" alt="" onerror="this.src='/coin-logo.png'">` : `<span class="account-avatar-initial large">${platform==='tiktok'?'TT':'TW'}</span>`}</span><div><p class="eyebrow">${label.toUpperCase()}</p><h3>${esc(a.username || 'Sin conectar')}</h3><span class="status ${a.connected?'on':''}"><i></i>${a.connected?'Conectado':'Desconectado'}</span></div></div><label>Cuenta<input id="${platform}Input" value="${esc(a.username||'')}" placeholder="${placeholder}"></label><div class="row"><button class="btn primary" id="${platform}Connect">Conectar</button><button class="btn secondary" id="${platform}Disconnect">Desconectar</button></div><p class="muted">Esta conexión alimenta el chat y los overlays. Su estilo no se copia a la interfaz principal.</p></article>`; };
    $('view').innerHTML=`<div class="intro"><h2>Conecta tus canales</h2><p>La conexión es compartida por el sistema; el chat, eventos y overlays utilizan la misma fuente de eventos, pero conservan diseños independientes.</p></div><div class="connection-grid">${card('tiktok','TikTok','@usuario')}${card('twitch','Twitch','canal')}</div><div class="notice">El avatar mostrado aquí se resuelve desde la plataforma cuando está disponible. La foto también se reutiliza en la barra superior y en los mensajes del dashboard.</div>`;
    $('tiktokConnect').onclick=()=>socket?.emit('connectTikTok',$('tiktokInput').value);
    $('tiktokDisconnect').onclick=()=>socket?.emit('disconnectTikTok');
    $('twitchConnect').onclick=()=>socket?.emit('connectTwitch',$('twitchInput').value);
    $('twitchDisconnect').onclick=()=>socket?.emit('disconnectTwitch');
  }

  const ctl = (label,id,type,value,opts='') => type==='check'
    ? `<label class="toggle"><input id="${id}" type="checkbox" ${value?'checked':''}><span>${label}</span></label>`
    : `<label>${label}<${type==='select'?'select':'input'} id="${id}" class="select" ${type==='input' ? `type="${typeof value === 'number' ? 'number' : /^#[0-9a-f]{6}$/i.test(String(value)) ? 'color' : 'text'}" value="${esc(value ?? '')}"` : ''}>${type==='select'?opts:''}</${type==='select'?'select':'input'}></label>`;
  const setSelect = (id, value) => { const el=$(id); if(el && el.tagName==='SELECT') el.value=String(value ?? ''); };
  const setCheck = (id, value) => { const el=$(id); if(el && el.type==='checkbox') el.checked=Boolean(value); };


  function previewSeed() {
    if (!state.previewChat.length) {
      state.previewChat = [
        {platform:'tiktok',displayName:'LunaByte',username:'lunabyte',uniqueId:'lunabyte',badges:['verified'],message:'¡Se ve genial este diseño!'},
        {platform:'twitch',displayName:'MauroLive',username:'maurolive',uniqueId:'maurolive',badges:['subscriber'],message:'Saludos desde Twitch 👋'},
        {platform:'tiktok',displayName:'Sofi_gg',username:'sofi_gg',uniqueId:'sofi_gg',message:'¿Podemos probar otra fuente?'}
      ];
    }
    return state.previewChat;
  }

  function chatPreviewHtml() {
    return previewSeed().map(x=>messageRow(x)).join('');
  }

  function renderCustomizePreviewOnly() {
    const box=$('liveCustomizePreview'); if(!box) return;
    if (activeCustomizeTab==='chat') {
      box.innerHTML=chatPreviewHtml();
      box.className=`live-custom-preview chat-preview-stage layout-${settings.personalization.chatLayout || 'vertical'} direction-${settings.personalization.chatDirection || 'down'}`;
      box.dataset.theme = settings.personalization.chatTheme || 'cloud';
      queueAvatarImages(box);
      requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});
      return;
    }
    box.className='live-custom-preview activity-preview-stage';
    box.innerHTML=previewActivityCard(activeCustomizeTab);
  }

  function simulatePreviewMessage() {
    const examples = [
      {platform:'tiktok',displayName:'NubeStudio',username:'nubestudio',uniqueId:'nubestudio',message:'¡Llegué al live! 🔥'},
      {platform:'twitch',displayName:'PixelMajo',username:'pixelmajo',uniqueId:'pixelmajo',badges:['vip'],message:'Ese overlay quedó buenísimo.'},
      {platform:'tiktok',displayName:'RafaFPS',username:'rafafps',message:'Jajaja ese comentario 😂'},
      {platform:'twitch',displayName:'KiraLive',username:'kiralive',message:'Se lee muy limpio así.'},
      {platform:'tiktok',displayName:'DaniGG',username:'danigg',message:'Probando mensaje simulado ✨'}
    ];
    const next = examples[state.previewChat.length % examples.length];
    state.previewChat.push({...next,timestamp:Date.now()});
    if (state.previewChat.length > 24) state.previewChat.shift();
    renderCustomizePreviewOnly();
  }

  let activeCustomizeSection = 'appearance';

  const customizeFields = {
    // Chat
    cTheme:['personalization','chatTheme'], cFont:['personalization','font'], cAvatar:['personalization','avatarFrame'],
    cBubble:['personalization','bubbleFrame'], cAvatarSize:['personalization','avatarSize'], cNameSize:['personalization','nameSize'],
    cNameWeight:['personalization','nameWeight'], cTextColor:['personalization','textColor'], cAnim:['personalization','animation'],
    cDirection:['personalization','chatDirection'], cLayout:['personalization','chatLayout'], cAdjust:['personalization','chatAdjustMessages'],
    cBadges:['personalization','showBadges'], cActivity:['personalization','showActivity'], cAutoClear:['personalization','autoClearChat'],
    cClearSeconds:['personalization','clearChatSeconds'], cPlatformPill:['personalization','showPlatformPill'], cTimestamp:['personalization','showTimestamps'],
    cShowEmotes:['personalization','showEmotes'], cBubbleRadius:['personalization','bubbleRadius'], cAvatarBorder:['personalization','avatarBorderWidth'],
    cMessagePadding:['personalization','messagePadding'], cRowGap:['personalization','rowGap'], cTikName:['personalization','tiktokNameColor'], cTwitchName:['personalization','twitchNameColor'],
    // Eventos
    eLayout:['personalization','eventsLayout'], eDirection:['personalization','eventsDirection'], eMode:['personalization','eventsMode'],
    eSize:['personalization','eventsPanelSize'], eShape:['personalization','eventsOverlayShape'], eSide:['personalization','eventsOverlayCardSide'], eFrame:['personalization','eventsCardFrame'],
    eLikes:['personalization','eventVisibility','likes'], eFollows:['personalization','eventVisibility','follows'], eJoins:['personalization','eventVisibility','joins'],
    eShares:['personalization','eventVisibility','shares'], eSystem:['personalization','eventVisibility','system'], eGifts:['personalization','eventVisibility','gifts'],
    eSubs:['personalization','eventVisibility','subscriptions'], eBits:['personalization','eventVisibility','bits'], eRaids:['personalization','eventVisibility','raids'], eHosts:['personalization','eventVisibility','hosts'],
    eHighlight:['personalization','overlayEventHighlightStyle'], eFont:['personalization','overlayEventFont'], eUser:['personalization','highlightEventUsername'], eGiftHi:['personalization','highlightGifts'],
    // Regalos
    gLayout:['personalization','giftsLayout'], gDirection:['personalization','giftsDirection'], gMode:['personalization','giftsMode'], gSize:['personalization','giftsPanelSize'],
    gShape:['personalization','giftsOverlayShape'], gSide:['personalization','giftsOverlayCardSide'], gFrame:['personalization','giftsCardFrame'], gImage:['personalization','overlayGiftImageSize'],
    gDisplay:['personalization','overlayGiftDisplayMode'], gComposition:['personalization','overlayGiftCompositionMode'], gNameMode:['personalization','overlayNameColorMode'],
    gNameColor:['personalization','overlayNameColor'], gHighlight:['personalization','giftHighlightStyle'], gShowActivity:['personalization','showGifts'], gAmount:['personalization','giftAmountStyle']
  };

  function setPathValue(target, path, value) {
    let cursor = target;
    for (let i=0;i<path.length-1;i++) cursor = cursor[path[i]] ||= {};
    cursor[path[path.length-1]] = value;
  }

  function getPathValue(target, path) {
    return path.reduce((acc, key) => acc == null ? undefined : acc[key], target);
  }

  function customizeControlValue(id, el) {
    let value = el.type === 'checkbox' ? el.checked : el.value;
    if (['cClearSeconds','cBubbleRadius','cAvatarBorder','cMessagePadding','cRowGap'].includes(id)) value = Math.max(0, Number(value || 0));
    if (['eLikes','eFollows','eJoins','eShares','eSystem','eGifts','eSubs','eBits','eRaids','eHosts','eUser','eGiftHi','gShowActivity'].includes(id)) value = Boolean(value);
    return value;
  }

  function bindCustomizeInputs() {
    document.querySelectorAll('#customControls select,#customControls input').forEach(el => el.addEventListener('change', async () => {
      const path = customizeFields[el.id]; if (!path) return;
      const value = customizeControlValue(el.id, el);
      const patch = { personalization:{} };
      setPathValue(patch.personalization, path.slice(1), value);
      settings = merge(settings, patch); applyAppearance();
      renderCustomizePreviewOnly();
      await persistSettingsPatch(patch, false);
      if (page === 'dashboard') renderDashboard();
    }));
  }

  function customizeSubNav(category) {
    const sections = category === 'chat'
      ? [['appearance','Apariencia'],['identity','Avatares y nombres'],['message','Mensajes'],['info','Información']]
      : category === 'events'
        ? [['appearance','Apariencia'],['layout','Orden y posición'],['content','Contenido'],['highlight','Resaltado']]
        : [['appearance','Apariencia'],['gift','Regalo'],['text','Texto'],['highlight','Resaltado']];
    if (!sections.some(([key]) => key === activeCustomizeSection)) activeCustomizeSection = sections[0][0];
    return `<div class="custom-subnav">${sections.map(([key,label])=>`<button type="button" class="custom-subtab ${activeCustomizeSection===key?'active':''}" data-custom-section="${key}">${label}</button>`).join('')}</div>`;
  }

  function chatControls(p) {
    if (activeCustomizeSection==='identity') return `<div class="custom-control-grid">
      ${ctl('Marco avatar','cAvatar','select',p.avatarFrame,'<option value="platform">Plataforma</option><option value="ring">Anillo</option><option value="role">Rol</option><option value="none">Sin marco</option>')}
      ${ctl('Tamaño avatar','cAvatarSize','select',p.avatarSize,'<option value="sm">Pequeño</option><option value="md">Medio</option><option value="lg">Grande</option>')}
      ${ctl('Grosor del marco','cAvatarBorder','input',p.avatarBorderWidth ?? 2)}
      ${ctl('Tamaño del nombre','cNameSize','select',p.nameSize,'<option value="sm">Pequeño</option><option value="md">Medio</option><option value="lg">Grande</option>')}
      ${ctl('Peso del nombre','cNameWeight','select',p.nameWeight,'<option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra Bold</option><option value="900">Black</option>')}
      ${ctl('Color nombre TikTok','cTikName','select',p.tiktokNameColor||'white','<option value="white">Blanco</option><option value="real">Rosa TikTok</option>')}
      ${ctl('Color nombre Twitch','cTwitchName','select',p.twitchNameColor||'real','<option value="real">Morado Twitch</option><option value="white">Blanco</option>')}
    </div>`;
    if (activeCustomizeSection==='message') return `<div class="custom-control-grid">
      ${ctl('Marco comentario','cBubble','select',p.bubbleFrame,'<option value="platform">Plataforma</option><option value="role">Rol</option><option value="none">Sin marco</option>')}
      ${ctl('Radio de burbuja','cBubbleRadius','input',p.bubbleRadius ?? 12)}
      ${ctl('Color del mensaje','cTextColor','select',p.textColor||'auto','<option value="auto">Automático</option><option value="#ffffff">Blanco</option><option value="#d9d9e4">Gris claro</option><option value="#ffd76e">Dorado</option><option value="#9fe8ff">Celeste</option>')}
      ${ctl('Espaciado interno','cMessagePadding','input',p.messagePadding ?? 7)}
      ${ctl('Ajustar mensajes largos','cAdjust','check',p.chatAdjustMessages !== false)}
      ${ctl('Mostrar insignias','cBadges','check',p.showBadges !== false)}
      ${ctl('Mostrar emotes','cShowEmotes','check',p.showEmotes !== false)}
    </div>`;
    if (activeCustomizeSection==='info') return `<div class="custom-control-grid">
      ${ctl('Mostrar plataforma TT / TW','cPlatformPill','check',p.showPlatformPill !== false)}
      ${ctl('Mostrar hora','cTimestamp','check',p.showTimestamps !== false)}
      ${ctl('Mostrar actividad','cActivity','check',p.showActivity !== false)}
      ${ctl('Auto limpiar chat','cAutoClear','check',p.autoClearChat)}
      ${ctl('Segundos para limpiar','cClearSeconds','input',p.clearChatSeconds || 30)}
    </div>`;
    return `<div class="custom-control-grid">
      ${ctl('Tema','cTheme','select',p.chatTheme,'<option value="cloud">Cloud</option><option value="minimal">Minimal</option><option value="neon">Neon</option><option value="aurora">Aurora</option>')}
      ${ctl('Tipo de letra','cFont','select',p.font||'inter','<option value="inter">Inter / Manrope</option><option value="poppins">Poppins</option><option value="montserrat">Montserrat</option><option value="oswald">Oswald</option><option value="system">Sistema</option>')}
      ${ctl('Dirección','cDirection','select',p.chatDirection,'<option value="down">Más reciente abajo</option><option value="up">Más reciente arriba</option>')}
      ${ctl('Distribución','cLayout','select',p.chatLayout,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}
      ${ctl('Animación','cAnim','select',p.animation,'<option value="slide">Slide</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="none">Sin animación</option>')}
      ${ctl('Separación entre mensajes','cRowGap','input',p.rowGap ?? 5)}
    </div>`;
  }

  function eventControls(p) {
    const v=p.eventVisibility||{};
    if (activeCustomizeSection==='layout') return `<div class="custom-control-grid">
      ${ctl('Distribución','eLayout','select',p.eventsLayout,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}
      ${ctl('Dirección','eDirection','select',p.eventsDirection,'<option value="down">Más reciente abajo</option><option value="up">Más reciente arriba</option>')}
      ${ctl('Animación','eMode','select',p.eventsMode,'<option value="slide">Slide</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="static">Estática</option>')}
      ${ctl('Tamaño del panel','eSize','select',p.eventsPanelSize,'<option value="compact">Compacto</option><option value="normal">Normal</option><option value="large">Grande</option>')}
      ${ctl('Forma','eShape','select',p.eventsOverlayShape,'<option value="normal">Normal</option><option value="rounded">Redondeada</option><option value="pill">Píldora</option>')}
      ${ctl('Posición del contenido','eSide','select',p.eventsOverlayCardSide,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}
      ${ctl('Marco','eFrame','check',p.eventsCardFrame !== false)}
    </div>`;
    if (activeCustomizeSection==='content') return `<div class="custom-control-grid">
      ${ctl('Likes','eLikes','check',v.likes !== false)} ${ctl('Seguidores','eFollows','check',v.follows !== false)} ${ctl('Entradas','eJoins','check',v.joins !== false)}
      ${ctl('Compartidos','eShares','check',v.shares !== false)} ${ctl('Sistema','eSystem','check',v.system !== false)} ${ctl('Regalos','eGifts','check',v.gifts !== false)}
      ${ctl('Suscripciones','eSubs','check',v.subscriptions !== false)} ${ctl('Bits','eBits','check',v.bits !== false)} ${ctl('Raids','eRaids','check',v.raids !== false)} ${ctl('Hosts','eHosts','check',v.hosts !== false)}
    </div>`;
    if (activeCustomizeSection==='highlight') return `<div class="custom-control-grid">
      ${ctl('Estilo de resaltado','eHighlight','select',p.overlayEventHighlightStyle,'<option value="platform">Plataforma</option><option value="accent">Acento</option><option value="gold">Dorado</option><option value="none">Ninguno</option>')}
      ${ctl('Fuente del evento','eFont','select',p.overlayEventFont,'<option value="inherit">Heredada</option><option value="inter">Inter</option><option value="poppins">Poppins</option><option value="oswald">Oswald</option>')}
      ${ctl('Resaltar usuario','eUser','check',p.highlightEventUsername !== false)}
      ${ctl('Resaltar regalos en eventos','eGiftHi','check',p.highlightGifts !== false)}
    </div>`;
    return `<div class="custom-control-grid"><div class="custom-hint"><strong>Vista de eventos</strong><span>Configura cómo se sienten visualmente los avisos de actividad del Dashboard.</span></div></div>`;
  }

  function giftControls(p) {
    if (activeCustomizeSection==='gift') return `<div class="custom-control-grid">
      ${ctl('Tamaño de imagen','gImage','select',p.overlayGiftImageSize,'<option value="sm">Pequeña</option><option value="md">Media</option><option value="lg">Grande</option>')}
      ${ctl('Mostrar regalo','gDisplay','select',p.overlayGiftDisplayMode,'<option value="full">Imagen + nombre + cantidad</option><option value="image">Solo imagen</option><option value="text">Solo texto</option>')}
      ${ctl('Composición','gComposition','select',p.overlayGiftCompositionMode,'<option value="vertical-centered">Vertical centrada</option><option value="horizontal">Horizontal</option><option value="image-left">Imagen a la izquierda</option>')}
    </div>`;
    if (activeCustomizeSection==='text') return `<div class="custom-control-grid">
      ${ctl('Color del nombre','gNameMode','select',p.overlayNameColorMode,'<option value="platform">Según plataforma</option><option value="custom">Personalizado</option>')}
      ${ctl('Color personalizado','gNameColor','input',p.overlayNameColor||'#ffffff')}
      ${ctl('Estilo de cantidad','gAmount','select',p.giftAmountStyle||'accent','<option value="accent">Acento</option><option value="muted">Suave</option><option value="bold">Negrita</option>')}
      ${ctl('Mostrar actividad asociada','gShowActivity','check',p.showGifts !== false)}
    </div>`;
    if (activeCustomizeSection==='highlight') return `<div class="custom-control-grid">
      ${ctl('Resaltado','gHighlight','select',p.giftHighlightStyle,'<option value="gold">Dorado</option><option value="platform">Plataforma</option><option value="accent">Acento</option><option value="none">Ninguno</option>')}
    </div>`;
    return `<div class="custom-control-grid">
      ${ctl('Distribución','gLayout','select',p.giftsLayout,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}
      ${ctl('Dirección','gDirection','select',p.giftsDirection,'<option value="down">Más reciente abajo</option><option value="up">Más reciente arriba</option>')}
      ${ctl('Animación','gMode','select',p.giftsMode,'<option value="slide">Slide</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="static">Estática</option>')}
      ${ctl('Tamaño del panel','gSize','select',p.giftsPanelSize,'<option value="compact">Compacto</option><option value="normal">Normal</option><option value="large">Grande</option>')}
      ${ctl('Forma','gShape','select',p.giftsOverlayShape,'<option value="normal">Normal</option><option value="rounded">Redondeada</option><option value="pill">Píldora</option>')}
      ${ctl('Posición','gSide','select',p.giftsOverlayCardSide,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}
      ${ctl('Marco','gFrame','check',p.giftsCardFrame !== false)}
    </div>`;
  }

  function previewActivityCard(kind) {
    const p=settings.personalization||{};
    if (kind==='events') {
      const samples=[
        {key:'follows',platform:'tiktok',user:'LunaByte',icon:'♡',type:'follow',text:'comenzó a seguirte'},
        {key:'likes',platform:'twitch',user:'MauroLive',icon:'♥',type:'like',text:'dio 1.2K likes'},
        {key:'shares',platform:'tiktok',user:'SofiGG',icon:'↗',type:'share',text:'compartió tu directo'},
        {key:'joins',platform:'twitch',user:'PixelMajo',icon:'＋',type:'join',text:'se unió al directo'}
      ];
      const visibility=p.eventVisibility||{};
      const available=samples.filter(x=>visibility[x.key]!==false);
      if (!available.length) return `<div class="activity-preview activity-empty-preview"><div class="activity-icon">◌</div><div class="activity-copy"><strong>No hay eventos visibles</strong><span>Activa al menos un tipo en «Contenido».</span></div></div>`;
      const sample=available[state.previewEventIndex%available.length];
      const mode=p.eventsMode||'slide'; const size=p.eventsPanelSize||'normal'; const shape=p.eventsOverlayShape||'normal';
      const highlight=p.overlayEventHighlightStyle||'platform';
      const accent=highlight==='gold'?'#f5d063':highlight==='accent'?'#9d7dff':sample.platform==='twitch'?'#9146ff':'#fe2c55';
      const userName=p.highlightEventUsername===false?'Usuario':sample.user;
      return `<div class="activity-preview stage-events event-highlight-${esc(highlight)} event-layout-${p.eventsLayout||'vertical'} event-direction-${p.eventsDirection||'down'} event-mode-${mode} event-size-${size} event-shape-${shape} event-side-${p.eventsOverlayCardSide||'center'} ${p.eventsCardFrame===false?'no-frame':''}" style="--activity-accent:${accent};font-family:${p.overlayEventFont==='poppins'?'Poppins,sans-serif':p.overlayEventFont==='oswald'?'Oswald,sans-serif':'Inter,Manrope,sans-serif'}"><div class="activity-icon">${sample.icon}</div><div class="activity-copy"><small>${esc(sample.type.toUpperCase())}</small><strong>${esc(userName)}</strong><span>${esc(sample.text)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
    }
    const samples=[
      {platform:'twitch',user:'MauroLive',gift:'Rosa',amount:5},
      {platform:'tiktok',user:'LunaByte',gift:'Perfume',amount:2},
      {platform:'twitch',user:'PixelMajo',gift:'Corazón',amount:12}
    ];
    const sample=samples[state.previewGiftIndex%samples.length];
    const size=p.overlayGiftImageSize||'md';
    const display=p.overlayGiftDisplayMode||'full';
    const nameColor=p.overlayNameColorMode==='custom'?(p.overlayNameColor||'#ffffff'):(sample.platform==='twitch'?'#c7a2ff':'#fe6f92');
    const title=display==='image'?sample.gift:display==='text'?sample.gift:`${sample.gift}${p.giftAmountStyle==='muted'?'':` ×${sample.amount}`}`;
    const frame=p.giftsCardFrame===false?'no-frame':'';
    const highlight=p.giftHighlightStyle||'gold';
    const accent=highlight==='gold'?'#f5d063':highlight==='platform'?(sample.platform==='twitch'?'#9146ff':'#fe2c55'):highlight==='accent'?'#9d7dff':'transparent';
    const showActivity=p.showGifts!==false;
    return `<div class="activity-preview stage-gifts gift-highlight-${esc(highlight)} gift-layout-${p.giftsLayout||'vertical'} gift-direction-${p.giftsDirection||'down'} gift-mode-${p.giftsMode||'slide'} gift-size-${p.giftsPanelSize||'normal'} gift-shape-${p.giftsOverlayShape||'normal'} gift-side-${p.giftsOverlayCardSide||'center'} ${frame}" style="--activity-accent:${accent};"><div class="gift-preview-media size-${size} ${display==='text'?'hide-image':''} ${display==='image'?'only-image':''}"><span>🎁</span></div><div class="activity-copy"><small>REGALO</small>${showActivity?`<strong style="color:${esc(nameColor)}">${esc(sample.user)}</strong>`:'<strong>Regalo recibido</strong>'}<span class="gift-title">${esc(title)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
  }

  function customizeControlPanel() {
    const p=settings.personalization||{};
    const category=activeCustomizeTab;
    let controls = category==='chat' ? chatControls(p) : category==='events' ? eventControls(p) : giftControls(p);
    return `<section class="custom-controls-panel"><div class="custom-section-head"><div><p class="eyebrow">${category==='chat'?'CHAT DEL DASHBOARD':category==='events'?'EVENTOS':'REGALOS'}</p><h3>${category==='chat'?'Personaliza cómo se ve cada mensaje':category==='events'?'Personaliza las alertas de actividad':'Personaliza cómo aparecen los regalos'}</h3></div></div>${customizeSubNav(category)}<div id="customControls">${controls}</div></section>`;
  }

  function renderCustomize() {
    const p=settings.personalization || {};
    const categories=[['chat','💬','Chat'],['events','✨','Eventos'],['gifts','🎁','Regalos']];
    $('view').innerHTML=`<div class="intro"><h2>Personalización</h2><p>Elige qué quieres diseñar. Dentro de cada opción encontrarás categorías más específicas mientras la vista previa se mantiene fija a la derecha.</p></div>
      <div class="custom-category-tabs">${categories.map(([key,icon,label])=>`<button type="button" class="custom-category ${activeCustomizeTab===key?'active':''}" data-custom-category="${key}"><span>${icon}</span>${label}</button>`).join('')}</div>
      <div class="customizer-layout"><div id="customControlWrap">${customizeControlPanel()}</div>
        <article class="card preview-card custom-preview-panel custom-preview-sticky"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA</p><h3>${activeCustomizeTab==='chat'?'Chat del Dashboard':activeCustomizeTab==='events'?'Eventos':'Regalos'}</h3></div><span class="preview-live"><i></i> SIMULACIÓN</span></div><div id="liveCustomizePreview" class="live-custom-preview">${activeCustomizeTab==='chat'?chatPreviewHtml():previewActivityCard(activeCustomizeTab)}</div>${activeCustomizeTab==='chat'?'<div class="preview-actions"><button class="btn primary" type="button" id="simulateChatMessage">＋ Simular mensaje</button><span class="muted">Añade un comentario ficticio para probar el diseño.</span></div>':'<div class="preview-actions"><button class="btn primary" type="button" id="simulateActivity">＋ Simular '+(activeCustomizeTab==='events'?'evento':'regalo')+'</button><span class="muted">La vista previa es independiente del directo.</span></div>'}<div class="preview-note">La vista previa no escucha eventos reales. Solo cambia al cambiar entre Chat, Eventos o Regalos.</div></article>
      </div>`;
    bindCustomizeInputs();
    document.querySelectorAll('[data-custom-category]').forEach(b=>b.onclick=()=>{activeCustomizeTab=b.dataset.customCategory;activeCustomizeSection='appearance';renderCustomize();});
    document.querySelectorAll('[data-custom-section]').forEach(b=>b.onclick=()=>{activeCustomizeSection=b.dataset.customSection;renderCustomizeControlsOnly();});
    if (activeCustomizeTab==='chat' && $('simulateChatMessage')) $('simulateChatMessage').onclick=simulatePreviewMessage;
    if (activeCustomizeTab!=='chat' && $('simulateActivity')) $('simulateActivity').onclick=simulatePreviewActivity;
    renderCustomizePreviewOnly();
  }

  function renderCustomizeControlsOnly(){
    const wrap=$('customControlWrap'); if(!wrap) return;
    wrap.innerHTML=customizeControlPanel();
    bindCustomizeInputs();
    document.querySelectorAll('[data-custom-section]').forEach(b=>b.onclick=()=>{activeCustomizeSection=b.dataset.customSection;renderCustomizeControlsOnly();});
  }

  function simulatePreviewActivity(){
    if (activeCustomizeTab==='events') state.previewEventIndex=(state.previewEventIndex+1)%3;
    if (activeCustomizeTab==='gifts') state.previewGiftIndex=(state.previewGiftIndex+1)%3;
    renderCustomizePreviewOnly();
  }

  async function persistSettingsPatch(patch, redraw=true) {
    try { const result = await api('/api/user/settings',{method:'PUT',body:JSON.stringify(patch)}); settings=merge(settings,result); applyAppearance(); if(redraw) render(); }
    catch(e){ toast('No se guardó',e.message,'err'); }
  }

  let overlayKeyCache = '';
  async function getOverlayKey() {
    if (overlayKeyCache) return overlayKeyCache;
    const data = await api('/api/overlay/key');
    overlayKeyCache = String(data?.key || '');
    if (!overlayKeyCache) throw new Error('No se pudo preparar la conexión del overlay.');
    return overlayKeyCache;
  }
  async function buildOverlayUrl(path) {
    const key = await getOverlayKey();
    const join = path.includes('?') ? '&' : '?';
    return `${location.origin}/${path}${join}owner=${encodeURIComponent(user.id)}&overlayKey=${encodeURIComponent(key)}`;
  }
  async function openOverlay(path, name) {
    try {
      const url = await buildOverlayUrl(path);
      const popup = window.open(url, name || 'streamfusionOverlay', 'popup=yes,width=1280,height=760,resizable=yes,scrollbars=yes');
      if (!popup) { toast('Ventana bloqueada','Permite ventanas emergentes para abrir el overlay.','err'); return; }
      popupWindows.add(popup); try { popup.focus(); } catch {}
    } catch (e) { toast('Overlay', e.message || 'No se pudo abrir el overlay.', 'err'); }
  }

  function overlayCard(name, path, description) {
    return `<article class="card overlay-card"><div class="mini-preview">${name==='Ruleta'?'🎡':name==='Lista de voces'?'🎙️':name==='Chat'?'💬':'✨'}</div><p class="eyebrow">SALIDA OBS</p><h3>${esc(name)}</h3><p class="muted">${esc(description)}</p><code>${esc(path)}</code><div class="row"><button class="btn primary openPopup" data-path="${esc(path)}">Abrir ventana</button><button class="btn secondary newTab" data-path="${esc(path)}">Pestaña</button><button class="btn secondary copyLink" data-path="${esc(path)}">Copiar enlace OBS</button></div></article>`;
  }

  function renderOverlays() {
    $('view').innerHTML=`<div class="intro"><h2>Overlays</h2><p>Son salidas independientes para OBS. Solo comparten la conexión del usuario y la fuente de eventos; su diseño no se copia del dashboard.</p></div><div class="overlay-status"><span class="status-pill ${state.connection==='online'?'on':''}"><i></i>${state.connection==='online'?'Conectado al stream':'Sin conexión'}</span>${['tiktok','twitch'].map(p=>`<span class="channel-state ${isConnected(p)?'on':''}">${p==='tiktok'?'TikTok':'Twitch'} · ${isConnected(p)?'ON':'OFF'}</span>`).join('')}</div><div class="overlay-grid">${overlayCard('Chat','overlay.html','Chat overlay independiente; usa la conexión real.')}${overlayCard('Eventos','overlay.html?view=events','Eventos overlay independiente.')}${overlayCard('Regalos','overlay.html?view=gifts','Regalos overlay independiente, con imagen del regalo.')}${overlayCard('Ruleta','roulette-overlay.html','Ruleta overlay original.')}</div>`;
    document.querySelectorAll('.openPopup').forEach(b=>b.onclick=()=>openOverlay(b.dataset.path,`sf_${b.dataset.path.split('/').pop()}`));
    document.querySelectorAll('.newTab').forEach(b=>b.onclick=async()=>{ try { const url=await buildOverlayUrl(b.dataset.path); window.open(url,'_blank','noopener'); } catch(e){ toast('Overlay',e.message,'err'); } });
    document.querySelectorAll('.copyLink').forEach(b=>b.onclick=async()=>{ try { const url=await buildOverlayUrl(b.dataset.path); await navigator.clipboard?.writeText(url); toast('Enlace copiado','La URL ya incluye la conexión de tu cuenta.'); } catch(e){ toast('Copiar enlace',e.message,'err'); } });
  }

  let rouletteState={participants:[],spinning:false};
  function renderRoulette(){
    const url=`${location.origin}/roulette-overlay.html?embed=1`;
    const note='La ruleta que se abre aquí es la misma ventana overlay original.';
    $('view').innerHTML=`<div class="intro split"><div><h2>Ruleta</h2><p>Esta pestaña muestra la misma ruleta de cartas que utiliza el overlay. No se crea una segunda ruleta ni se altera el motor que ya funciona.</p></div><div class="row"><button class="btn secondary" id="openRoulettePopup">Abrir overlay</button><a class="btn secondary" id="rouletteTabLink" href="#" target="_blank" rel="noopener">Abrir pestaña</a></div></div><section class="card roulette-overlay-host"><iframe id="rouletteFrame" src="${esc(url)}" title="Ruleta StreamFusion"></iframe></section>`;
    $('openRoulettePopup').onclick=()=>openOverlay('roulette-overlay.html?embed=1','streamfusionRoulette');
    buildOverlayUrl('roulette-overlay.html?embed=1').then(u=>{ const f=$('rouletteFrame'); const a=$('rouletteTabLink'); if(f) f.src=u; if(a) a.href=u; }).catch(()=>{});
  }

  async function loadVoices(){
    const request=++voiceCatalogRequest;
    const [catalog,userVoices]=await Promise.all([api(`/api/voices/catalog?owner=${encodeURIComponent(user.id)}`),api('/api/user/voices')]);
    if(request!==voiceCatalogRequest) return;
    state.catalog=catalog.voices||[]; state.voices=userVoices.voices||[];
  }

  function voiceRow(v){ return `<div class="voice-card ${v.library==='fish'?'custom':''}"><div class="voice-card-main"><div class="voice-icon">${v.library==='fish'?'🐟':'🎙️'}</div><div><strong>${esc(v.label||v.name||v.key)}</strong><small>${esc(v.fishId||v.id||v.key)}${v.author?` · ${esc(v.author)}`:''}</small>${Array.isArray(v.tags)&&v.tags.length?`<div class="voice-tags">${v.tags.slice(0,5).map(tag=>`<span>#${esc(tag)}</span>`).join('')}</div>`:''}</div></div><div class="voice-actions">${v.library==='fish'?`<button class="miniBtn" data-edit-voice="${esc(v.fishId)}">Editar</button><button class="miniBtn danger" data-delete-voice="${esc(v.fishId)}">Eliminar</button>`:''}</div></div>`; }
  function voicePreview(settingsVoice){ const sample=(state.voices.length?state.voices:state.catalog.slice(0,6)).slice(0,8); const rows=sample.map((v,i)=>`<div class="voice-preview-row" style="font-family:${esc(settingsVoice.fontFamily)};font-size:${Number(settingsVoice.fontSize)||28}px;font-weight:${Number(settingsVoice.fontWeight)||700};color:${esc(settingsVoice.textColor||'#000')};text-align:${esc(settingsVoice.align||'left')}">${settingsVoice.showIndex?`${i+1}. `:''}${esc(v.label||v.name||v.key||v.fishId)}${settingsVoice.showId?` <small>${esc(v.fishId||v.id||'')}</small>`:''}</div>`).join(''); return rows || '<div class="empty">Agrega una voz o usa la biblioteca global para verla aquí.</div>'; }

  async function saveVoice(v){
    const fishId=$('fishIdInput')?.value.trim(); const label=$('fishLabelInput')?.value.trim(); const tags=($('fishTagsInput')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(!fishId){ toast('Falta el ID','Escribe el ID de Fish Audio.','err'); return; }
    try { const data=await api('/api/user/voices',{method:'POST',body:JSON.stringify({fishId,label:label||fishId,tags})}); toast('Voz guardada',`${data.voice?.label||label||fishId} quedó en tu biblioteca.`); await renderWidgets(); }
    catch(e){ toast('No se pudo guardar',e.message,'err'); }
  }

  function renderVoiceLibraryCard(){
    return `<section class="card voice-library-panel"><div class="section-head"><div><p class="eyebrow">BIBLIOTECA GLOBAL + PERSONAL</p><h3>Voces disponibles</h3></div><span class="count-pill">${state.catalog.length}</span></div>
      <div class="voice-add voice-add-main"><input id="fishLabelInput" placeholder="Nombre de la voz"><input id="fishIdInput" placeholder="ID de Fish Audio"><input id="fishTagsInput" placeholder="Tags: anime, robot, etc."><button class="btn primary" id="addVoice">＋ Guardar</button></div>
      <div id="voiceSearchResults" class="voice-search-results hidden"></div><p class="muted">Las voces personales se guardan en tu cuenta. Los tags también sirven para que la ruleta de voces reconozca nombres y alias.</p>
      <div class="voice-library">${state.catalog.map(voiceRow).join('')}</div></section>`;
  }

  async function renderVoices(){
    await loadVoices();
    $('view').innerHTML=`<div class="intro"><h2>Voces</h2><p>Administra la biblioteca que utiliza el bot de voz. Esta sección no mezcla la configuración visual del widget.</p></div><div class="voice-page-single">${renderVoiceLibraryCard()}<section class="card"><div class="section-head"><div><p class="eyebrow">BOT DE VOZ</p><h3>Biblioteca personal</h3></div><span class="count-pill">${state.voices.length} personalizadas</span></div><p class="muted">Las voces añadidas desde Fish Audio quedan disponibles para reglas de voz, selección manual y asignación automática.</p><div class="voice-library voice-library-short">${state.voices.length ? state.voices.map(voiceRow).join('') : '<div class="empty">Todavía no tienes voces personalizadas.</div>'}</div></section></div>`;
    bindVoiceLibraryActions();
  }

  function bindVoiceLibraryActions(){
    document.querySelectorAll('[data-delete-voice]').forEach(btn=>btn.onclick=async()=>{try{await api(`/api/user/voices/${encodeURIComponent(btn.dataset.deleteVoice)}`,{method:'DELETE'});toast('Voz eliminada');await renderVoices();}catch(e){toast('No se pudo eliminar',e.message,'err')}});
    document.querySelectorAll('[data-edit-voice]').forEach(btn=>btn.onclick=()=>{const v=state.voices.find(x=>x.fishId===btn.dataset.editVoice);if(v){ $('fishLabelInput').value=v.label||''; $('fishIdInput').value=v.fishId||''; $('fishTagsInput').value=Array.isArray(v.tags)?v.tags.join(', '):String(v.tags||''); $('fishLabelInput').focus(); }});
    const searchInput=$('fishLabelInput'), searchBox=$('voiceSearchResults'); let searchTimer=0;
    const runVoiceSearch=async()=>{const q=searchInput?.value.trim()||''; if(q.length<2){searchBox?.classList.add('hidden');return;} const id=++searchTimer; try{const data=await api(`/api/voices/search?q=${encodeURIComponent(q)}`); if(id!==searchTimer)return; const items=(data.voices||[]).slice(0,8); searchBox.innerHTML=items.length?items.map(v=>`<button type="button" class="voice-search-item" data-id="${esc(v.id)}" data-label="${esc(v.label)}"><strong>${esc(v.label)}</strong><small>${esc(v.id)}${v.author?` · ${esc(v.author)}`:''}</small></button>`).join(''):'<div class="muted">Sin coincidencias.</div>'; searchBox.classList.remove('hidden'); searchBox.querySelectorAll('.voice-search-item').forEach(b=>b.onclick=()=>{searchInput.value=b.dataset.label;$('fishIdInput').value=b.dataset.id;searchBox.classList.add('hidden');});}catch{searchBox?.classList.add('hidden');}};
    searchInput?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(runVoiceSearch,350);});
    $('addVoice').onclick=async()=>{const fishId=$('fishIdInput')?.value.trim(), label=$('fishLabelInput')?.value.trim(), tags=($('fishTagsInput')?.value||'').split(',').map(x=>x.trim()).filter(Boolean); if(!fishId){toast('Falta el ID','Escribe el ID de Fish Audio.','err');return;} try{const data=await api('/api/user/voices',{method:'POST',body:JSON.stringify({fishId,label:label||fishId,tags})});toast('Voz guardada',`${data.voice?.label||label||fishId} quedó en tu biblioteca.`);await renderVoices();}catch(e){toast('No se pudo guardar',e.message,'err')}};
  }

  const VOICE_FONTS=[['Inter, Arial, sans-serif','Inter'],['Arial, sans-serif','Arial'],['Trebuchet MS, sans-serif','Trebuchet MS'],['Verdana, sans-serif','Verdana'],['Tahoma, sans-serif','Tahoma'],['Segoe UI, sans-serif','Segoe UI'],['system-ui, sans-serif','System UI'],['Georgia, serif','Georgia'],['Times New Roman, serif','Times New Roman'],['Impact, sans-serif','Impact'],['Oswald, sans-serif','Oswald'],['Montserrat, sans-serif','Montserrat'],['Poppins, sans-serif','Poppins'],['Bebas Neue, sans-serif','Bebas Neue'],['Comic Sans MS, cursive','Comic Sans'],['Courier New, monospace','Courier New'],['Anton, sans-serif','Anton'],['Roboto Condensed, sans-serif','Roboto Condensed'],['Playfair Display, serif','Playfair Display'],['Merriweather, serif','Merriweather'],['Noto Sans, sans-serif','Noto Sans'],['Lobster, cursive','Lobster'],['Raleway, sans-serif','Raleway'],['Space Grotesk, sans-serif','Space Grotesk'],['Orbitron, sans-serif','Orbitron'],['Kanit, sans-serif','Kanit']];
  const voiceShadow=(v,c)=>v==='soft'?`0 2px 8px ${c||'#000'}`:v==='strong'?`0 4px 16px ${c||'#000'}`:'none';
  const voicePreviewItems=()=>{const base=(state.voices.length?state.voices:state.catalog).slice(0,18);return base.length?base:[{key:'preview',label:'Fede Vigevani'},{key:'deadpool',label:'Deadpool'},{key:'El Mariana',label:'El Mariana'}];};
  function buildVoicePreviewHtml(s){
    const list=voicePreviewItems(); const motion=s.motion||'static'; const vertical=(s.axis||s.direction||'vertical')==='vertical';
    const items=list.map((v,i)=>{const o=s.overrides?.[v.key]||{}; const st=`font-family:${esc(o.fontFamily||s.fontFamily)};font-size:${Number(o.fontSize ?? s.fontSize ?? 28)}px;font-weight:${Number(o.fontWeight ?? s.fontWeight ?? 700)};font-style:${esc(o.fontStyle||s.fontStyle||'normal')};color:${esc(o.color||s.textColor||'#000')};text-shadow:${voiceShadow(o.textShadow||s.textShadow,o.shadowColor||s.shadowColor)};-webkit-text-stroke:${Number(o.outlineWidth ?? s.outlineWidth ?? 0)}px ${esc(o.outlineColor||s.outlineColor||'#000')};text-transform:${esc(o.textTransform||s.textTransform||'none')};letter-spacing:${Number(o.letterSpacing ?? s.letterSpacing ?? 0)}px;line-height:${Number(o.lineHeight ?? s.lineHeight ?? 1.2)};`; return `<div class="voice-live-item" style="${st}">${s.showIndex?`<span class="voice-live-index">${i+1}. </span>`:''}${esc(v.label||v.name||v.key||v.fishId)}${s.showId?`<small>${esc(v.id||v.fishId||'')}</small>`:''}</div>`}).join('');
    const dup=motion==='static'?items:items+items;
    return `<div class="voice-live-stage ${vertical?'is-vertical':'is-horizontal'} motion-${esc(motion)} travel-${esc(s.movementDirection||'forward')}" style="--vl-preview-speed:${Math.max(4,Number(s.motionSpeed||24))}s;--vl-preview-gap:${Math.max(0,Number(s.itemGap||10))}px;--vl-preview-align:${esc(s.align||'left')};--vl-preview-bg:rgba(255,255,255,${s.transparent?Number(s.backgroundOpacity||0):Math.max(.06,Number(s.backgroundOpacity||.08))})"><div class="voice-live-track">${dup}</div></div>`;
  }
  function voiceCtl(label,id,type,value,opts=''){return ctl(label,id,type,value,opts)}
  function voiceRouletteMarkup(r){return `<div class="widget-subsection"><div class="section-head"><div><p class="eyebrow">INTRO DEL WIDGET</p><h3>Secuencia previa</h3></div><span class="muted">opcional</span></div><div class="settings-grid two compact-grid">${voiceCtl('Activar','vlRouletteEnabled','check',r.enabled)}${voiceCtl('Mostrar lista al terminar','vlShowListAfter','check',r.showListAfterIntro!==false)}${voiceCtl('Texto 1','vlRText1','input',r.title)}${voiceCtl('Segundos 1','vlRTime1','input',r.titleSeconds)}${voiceCtl('Texto 2','vlRText2','input',r.subtitle)}${voiceCtl('Segundos 2','vlRTime2','input',r.subtitleSeconds)}${voiceCtl('Texto 3','vlRText3','input',r.winnerText)}${voiceCtl('Segundos 3','vlRTime3','input',r.winnerSeconds)}${voiceCtl('Animación','vlRMotion','select',r.introMotion||'fade','<option value="fade">Fade</option><option value="slide-up">Slide up</option><option value="slide-down">Slide down</option><option value="zoom">Zoom</option><option value="type">Type</option><option value="star-wars">Star Wars</option>')}${voiceCtl('Opacidad tarjeta','vlRCard','input',r.cardOpacity)}</div><p class="muted">La escena de ruleta del widget sigue siendo independiente de la ruleta principal de StreamFusion.</p></div>`}

  function renderWidgets(){
    window.__sfVoiceWidgetEditorOpen = Boolean(window.__sfVoiceWidgetEditorOpen);
    if(!window.__sfVoiceWidgetEditorOpen){
      $('view').innerHTML=`<div class="intro"><h2>Widgets</h2><p>Selecciona el widget que quieres personalizar.</p></div><div class="widget-launch-grid"><button type="button" class="card widget-launch-card" id="openVoiceWidgetEditor"><span class="widget-launch-icon">🗣️</span><span><strong>Lista de voces</strong><small>Personaliza la lista, dirección, desplazamiento, efectos y overlay.</small></span><span class="widget-launch-arrow">→</span></button></div>`;
      $('openVoiceWidgetEditor').onclick=()=>{window.__sfVoiceWidgetEditorOpen=true;renderWidgets();};
      return;
    }
    const s=structuredClone(settings.voiceList||{});
    s.axis=s.axis||s.direction||'vertical'; s.direction=s.axis; s.movementDirection=s.movementDirection||'forward'; s.roulette={enabled:false,title:'¿Quieres una voz?',subtitle:'Para participar, comenta lo que se indique en el sorteo!',winnerText:'Si ganas, solo comenta una de las siguientes voces:',titleSeconds:3,subtitleSeconds:3,winnerSeconds:3,introMotion:'fade',cardOpacity:.12,showListAfterIntro:true,...(s.roulette||{})};
    const fontOpts=VOICE_FONTS.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');
    $('view').innerHTML=`<div class="intro"><h2>Widgets</h2><p>Solo herramientas visuales externas. Por ahora está disponible la Lista de Voces, con el mismo concepto de edición que tenía la versión original.</p></div><div class="widget-editor-tabs"><button class="tab active">Lista de voces</button></div><div class="widget-editor-layout"><section class="card widget-controls"><div class="section-head"><div><p class="eyebrow">EDITOR</p><h3>Lista de Voces</h3></div><div class="row"><button class="btn secondary" id="openVoiceWidget">Abrir overlay</button><button class="btn primary" id="saveVoiceWidget">Guardar</button></div></div><div class="settings-grid two compact-grid">
      <article class="widget-subsection"><p class="eyebrow">GENERAL</p>${voiceCtl('Activar','vEnabled','check',s.enabled)}${voiceCtl('Fondo transparente','vTransparent','check',s.transparent)}${voiceCtl('Opacidad de fondo','vBgOpacity','input',s.backgroundOpacity)}${voiceCtl('Fuente','vFont','select',s.fontFamily,fontOpts)}${voiceCtl('Tamaño','vSize','input',s.fontSize)}${voiceCtl('Peso','vWeight','input',s.fontWeight)}${voiceCtl('Estilo','vStyle','select',s.fontStyle,'<option value="normal">Normal</option><option value="italic">Cursiva</option>')}${voiceCtl('Color','vColor','input',s.textColor)}</article>
      <article class="widget-subsection"><p class="eyebrow">EFECTOS</p>${voiceCtl('Sombra','vShadow','select',s.textShadow,'<option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>')}${voiceCtl('Color sombra','vShadowColor','input',s.shadowColor)}${voiceCtl('Contorno (px)','vOutline','input',s.outlineWidth)}${voiceCtl('Color contorno','vOutlineColor','input',s.outlineColor)}${voiceCtl('Transformación','vTransform','select',s.textTransform,'<option value="none">Normal</option><option value="uppercase">MAYÚSCULAS</option><option value="lowercase">minúsculas</option><option value="capitalize">Capitalizar</option>')}${voiceCtl('Espaciado','vLetter','input',s.letterSpacing)}${voiceCtl('Altura línea','vLine','input',s.lineHeight)}</article>
      <article class="widget-subsection"><p class="eyebrow">COMPOSICIÓN</p>${voiceCtl('Separación','vGap','input',s.itemGap)}${voiceCtl('Alineación','vAlign','select',s.align,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}${voiceCtl('Posición','vPosition','select',s.listPosition,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}${voiceCtl('Desplazamiento','vAxis','select',s.axis,'<option value="vertical">Vertical · arriba → abajo</option><option value="horizontal">Horizontal · izquierda → derecha</option>')}${voiceCtl('Dirección','vMoveDir','select',s.movementDirection,'<option value="forward">Normal</option><option value="reverse">Invertida</option>')}${voiceCtl('Movimiento','vMotion','select',s.motion,'<option value="static">Estático</option><option value="scroll">Scroll</option><option value="slide">Slide</option><option value="marquee">Marquee</option>')}${voiceCtl('Velocidad','vMotionSpeed','input',s.motionSpeed)}</article>
      <article class="widget-subsection"><p class="eyebrow">VISIBILIDAD</p>${voiceCtl('Mostrar índice','vShowIndex','check',s.showIndex)}${voiceCtl('Mostrar ID','vShowId','check',s.showId)}${voiceCtl('Mostrar automáticamente','vAutoShow','check',s.autoShowEnabled)}${voiceCtl('Cada (segundos)','vAutoEvery','input',s.autoShowEvery)}${voiceCtl('Visible durante','vAutoFor','input',s.autoShowFor)}${voiceCtl('Voz seleccionada','vSelected','select',s.selectedVoice,'<option value="">Ninguna</option>'+voicePreviewItems().map(v=>`<option value="${esc(v.key||v.id||v.fishId||'')}">${esc(v.label||v.name||v.key||v.id||v.fishId)}</option>`).join(''))}</article>
    </div>${voiceRouletteMarkup(s.roulette)}<div class="widget-subsection"><div class="section-head"><div><p class="eyebrow">ESTILO INDIVIDUAL</p><h3>Personaliza una voz sin afectar las demás</h3></div></div><div class="settings-grid three compact-grid"><article>${voiceCtl('Voz','ovVoice','select',s.selectedVoice||'','<option value="">Selecciona una voz</option>'+voicePreviewItems().map(v=>`<option value="${esc(v.key||v.id||v.fishId||'')}">${esc(v.label||v.name||v.key||v.id||v.fishId)}</option>`).join(''))}${voiceCtl('Fuente','ovFont','select','',fontOpts)}${voiceCtl('Tamaño','ovSize','input','')}${voiceCtl('Peso','ovWeight','input','')}</article><article>${voiceCtl('Estilo','ovStyle','select','normal','<option value="normal">Normal</option><option value="italic">Cursiva</option>')}${voiceCtl('Color','ovColor','input','#000000')}${voiceCtl('Sombra','ovShadow','select','none','<option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>')}${voiceCtl('Color sombra','ovShadowColor','input','#000000')}</article><article>${voiceCtl('Contorno','ovOutline','input',0)}${voiceCtl('Color contorno','ovOutlineColor','input','#000000')}${voiceCtl('Transformación','ovTransform','select','none','<option value="none">Normal</option><option value="uppercase">MAYÚSCULAS</option><option value="lowercase">minúsculas</option><option value="capitalize">Capitalizar</option>')}${voiceCtl('Acciones','ovApply','check',false)}<button class="btn secondary" id="resetVoiceOverride" type="button">Restaurar esta voz</button></article></div></div></section>
    <section class="card widget-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA EN TIEMPO REAL</p><h3>Lista de Voces</h3></div><span class="preview-live"><i></i> LIVE</span></div><div id="voiceWidgetPreview" class="voice-widget-preview">${buildVoicePreviewHtml(s)}</div><div class="widget-preview-footer"><span class="muted">La preview usa la configuración del widget y la biblioteca actual.</span><code>/voice-list-overlay.html?owner=${esc(user.id)}</code></div></section></div>`;
    const map={vEnabled:['enabled','check'],vTransparent:['transparent','check'],vBgOpacity:['backgroundOpacity','num'],vFont:['fontFamily'],vSize:['fontSize','num'],vWeight:['fontWeight','num'],vStyle:['fontStyle'],vColor:['textColor'],vShadow:['textShadow'],vShadowColor:['shadowColor'],vOutline:['outlineWidth','num'],vOutlineColor:['outlineColor'],vTransform:['textTransform'],vLetter:['letterSpacing','num'],vLine:['lineHeight','num'],vGap:['itemGap','num'],vAlign:['align'],vPosition:['listPosition'],vAxis:['axis'],vMoveDir:['movementDirection'],vMotion:['motion'],vMotionSpeed:['motionSpeed','num'],vShowIndex:['showIndex','check'],vShowId:['showId','check'],vAutoShow:['autoShowEnabled','check'],vAutoEvery:['autoShowEvery','num'],vAutoFor:['autoShowFor','num'],vSelected:['selectedVoice']};
    let voiceWidgetSaveTimer=0;
    const scheduleVoiceWidgetSave=()=>{clearTimeout(voiceWidgetSaveTimer);voiceWidgetSaveTimer=setTimeout(async()=>{try{const result=await api('/api/voice-list/settings',{method:'PUT',body:JSON.stringify(s)});settings.voiceList=merge(settings.voiceList,result.voiceList||s);}catch(e){console.warn('voice widget autosave',e);}},300);};
    const updatePreview=()=>{$('voiceWidgetPreview').innerHTML=buildVoicePreviewHtml(s);scheduleVoiceWidgetSave();};
    for(const [id,[key,type]] of Object.entries(map)){const el=$(id);if(!el)continue;if(type==='check')el.checked=!!s[key];else el.value=String(s[key]??'');el.addEventListener('input',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});el.addEventListener('change',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});}
    setSelect('vFont',s.fontFamily); setSelect('vPosition',s.listPosition); setSelect('vAxis',s.axis); setSelect('vMoveDir',s.movementDirection); setSelect('vSelected',s.selectedVoice); if($('vColor'))$('vColor').value=s.textColor; if($('vShadowColor'))$('vShadowColor').value=s.shadowColor; if($('vOutlineColor'))$('vOutlineColor').value=s.outlineColor;
    const rr={vlRouletteEnabled:['enabled','check'],vlShowListAfter:['showListAfterIntro','check'],vlRText1:['title'],vlRTime1:['titleSeconds','num'],vlRText2:['subtitle'],vlRTime2:['subtitleSeconds','num'],vlRText3:['winnerText'],vlRTime3:['winnerSeconds','num'],vlRMotion:['introMotion'],vlRCard:['cardOpacity','num']};
    for(const [id,[key,type]] of Object.entries(rr)){const el=$(id);if(!el)continue;el.addEventListener('input',()=>{s.roulette[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value; if(key==='enabled'||key.startsWith('title')||key.startsWith('subtitle')||key.startsWith('winner')||key==='introMotion')updatePreview();});}
    $('openVoiceWidget').onclick=()=>openOverlay('voice-list-overlay.html','streamfusionVoiceList');
    $('saveVoiceWidget').onclick=async()=>{clearTimeout(voiceWidgetSaveTimer);try{const result=await api('/api/voice-list/settings',{method:'PUT',body:JSON.stringify(s)});settings.voiceList=merge(settings.voiceList,result.voiceList||s);toast('Widget guardado','Los cambios se aplicaron al overlay y a tu cuenta.');updatePreview();}catch(e){toast('No se guardó',e.message,'err')}};
    $('ovVoice')?.addEventListener('change',()=>{const key=$('ovVoice').value;if(!key)return;const o=s.overrides?.[key]||{};if($('ovFont'))$('ovFont').value=o.fontFamily||s.fontFamily;if($('ovSize'))$('ovSize').value=o.fontSize??s.fontSize;if($('ovWeight'))$('ovWeight').value=o.fontWeight??s.fontWeight;if($('ovStyle'))$('ovStyle').value=o.fontStyle||s.fontStyle;if($('ovColor'))$('ovColor').value=o.color||s.textColor;if($('ovShadow'))$('ovShadow').value=o.textShadow||s.textShadow;if($('ovShadowColor'))$('ovShadowColor').value=o.shadowColor||s.shadowColor;if($('ovOutline'))$('ovOutline').value=o.outlineWidth??s.outlineWidth;if($('ovOutlineColor'))$('ovOutlineColor').value=o.outlineColor||s.outlineColor;if($('ovTransform'))$('ovTransform').value=o.textTransform||s.textTransform;});
    $('resetVoiceOverride').onclick=()=>{const key=$('ovVoice')?.value;if(!key)return;s.overrides={...(s.overrides||{})};delete s.overrides[key];updatePreview();toast('Restaurado','La voz volvió al estilo general.');};
    document.querySelectorAll('#ovApply').forEach(el=>el.onclick=()=>{const key=$('ovVoice')?.value;if(!key){toast('Selecciona una voz','Elige una voz para personalizarla.','err');return;}s.overrides={...(s.overrides||{})};s.overrides[key]={fontFamily:$('ovFont').value,fontSize:Number($('ovSize').value||s.fontSize),fontWeight:Number($('ovWeight').value||s.fontWeight),fontStyle:$('ovStyle').value,color:$('ovColor').value,textShadow:$('ovShadow').value,shadowColor:$('ovShadowColor').value,outlineWidth:Number($('ovOutline').value||0),outlineColor:$('ovOutlineColor').value,textTransform:$('ovTransform').value};el.checked=false;updatePreview();});
  }

  function renderSettings(){
    const a=settings.appearance||{};
    const moderators=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[];
    $('view').innerHTML=`<div class="intro"><h2>Ajustes</h2><p>Todo lo que se guarda aquí pertenece a tu cuenta.</p></div><div class="settings-grid two"><article class="card"><p class="eyebrow">APARIENCIA DEL DASHBOARD</p><h3>Tema</h3>${ctl('Tema','sTheme','select',a.theme||'dark','<option value="dark">Noche profunda</option><option value="midnight">Medianoche</option><option value="light">Claro</option>')}<label>Color de acento<input id="sAccent" type="color" value="${esc(a.accent||'#7c5cff')}"></label><button class="btn primary" id="saveAppearance">Guardar</button></article><article class="card"><p class="eyebrow">CUENTA</p><h3>${esc(user?.displayName||'Creador')}</h3><p>${esc(user?.email||'')}</p><p class="muted">ID: ${esc(user?.id||'')}</p><button class="btn secondary" id="logout2">Cerrar sesión</button></article></div>
      <div class="settings-grid two"><article class="card moderator-settings"><div class="section-head"><div><p class="eyebrow">MODERACIÓN TIKTOK</p><h3>Añadir moderadores TikTok</h3></div><span class="badge-pill">🛡️</span></div><p class="muted">Agrega el <strong>uniqueId</strong> exacto de cada moderador del canal. Esos usuarios recibirán la insignia 🛡️ y entrarán en el filtro de Bot de voz “Solo moderadores”.</p><div class="row moderator-add-row"><label class="grow">Unique ID<input id="tiktokModeratorInput" placeholder="ej. usuario_tiktok_123" autocomplete="off"></label><button class="btn primary" id="addTiktokModerator">Añadir</button></div><div id="tiktokModeratorList" class="moderator-list">${moderators.length?moderators.map((id)=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-moderator="${esc(id)}" aria-label="Eliminar moderador">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>'}</div></article><article class="card"><p class="eyebrow">CÓMO FUNCIONA</p><h3>Filtro del Bot de voz</h3><p class="muted">Cuando el filtro global está en “Solo moderadores”, StreamFusion comprueba la insignia del mensaje. Los IDs configurados aquí se marcan automáticamente como moderadores en TikTok.</p><div class="notice">La insignia se muestra como <strong>🛡️</strong> y no cambia los permisos reales de TikTok.</div></article></div>`;
    $('saveAppearance').onclick=()=>persistSettingsPatch({appearance:{theme:$('sTheme').value,accent:$('sAccent').value}});
    $('logout2').onclick=logout;
    const renderModeratorList=()=>{ const wrap=$('tiktokModeratorList'); if(!wrap)return; const ids=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[]; wrap.innerHTML=ids.length?ids.map(id=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-moderator="${esc(id)}" aria-label="Eliminar moderador">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>'; wrap.querySelectorAll('[data-remove-moderator]').forEach(btn=>btn.onclick=async()=>{ const id=btn.dataset.removeModerator; settings.tiktokModerators=(settings.tiktokModerators||[]).filter(x=>String(x).toLowerCase()!==String(id).toLowerCase()); await persistSettingsPatch({tiktokModerators:settings.tiktokModerators},false); renderModeratorList(); }); };
    $('addTiktokModerator').onclick=async()=>{ const input=$('tiktokModeratorInput'); const id=normalizeUsername(input?.value||''); if(!id){toast('ID inválido','Escribe el uniqueId de TikTok.','err');return;} settings.tiktokModerators=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[]; if(settings.tiktokModerators.some(x=>String(x).toLowerCase()===id.toLowerCase())){toast('Ya existe','Ese uniqueId ya está en la lista.','err');return;} settings.tiktokModerators=[...settings.tiktokModerators,id]; await persistSettingsPatch({tiktokModerators:settings.tiktokModerators},false); input.value=''; renderModeratorList(); toast('Moderador añadido','🛡️ se aplicará a sus mensajes.'); };
    renderModeratorList();
  }

  function render(){ applyAppearance(); activateNav(); renderTop(); if(page==='dashboard')renderDashboard(); else if(page==='connections')renderConnections(); else if(page==='customize')renderCustomize(); else if(page==='overlays')renderOverlays(); else if(page==='roulette')renderRoulette(); else if(page==='voices')renderVoices(); else if(page==='widgets')renderWidgets(); else renderSettings(); }

  function classifyEvent(item){ const type=String(item.type||'').toLowerCase(); return ['gift','sub','bits','raid','host'].includes(type) || item.gift || item.giftName ? 'gift' : 'event'; }

  function acceptChat(item){ const entry={...item,timestamp:item.timestamp||Date.now()}; state.chat.push(entry); if(state.chat.length>500)state.chat.shift(); if(page==='dashboard')renderDashboard(); }
  function acceptEvent(item){ const entry={...item,timestamp:item.timestamp||Date.now()}; recordActivity(entry); const kind=classifyEvent(entry); (kind==='gift'?state.gifts:state.events).push(entry); if(state.events.length>300)state.events.shift(); if(state.gifts.length>300)state.gifts.shift(); if(page==='dashboard')renderDashboard(); if(page==='customize'&&activeCustomizeTab!=='chat')renderCustomize(); }

  async function hydrateHistory(){
    try { const data=await api('/api/live-history'); (data.chat||[]).forEach(x=>{state.chat.push(x);}); (data.events||[]).forEach(x=>acceptEvent(x)); state.chat=state.chat.slice(-500); state.historyLoaded=true; if(page==='dashboard')renderDashboard(); if(page==='customize'&&activeCustomizeTab==='chat')renderCustomizePreviewOnly(); }
    catch(e){ console.warn('live history',e); }
  }

  function setupSocket(){
    if(socket) socket.disconnect();
    socket=io({auth:{token:token()},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:800,reconnectionDelayMax:5000});
    socket.on('connect',()=>{state.connection='online'; renderTop(); if(page==='connections'||page==='overlays')render();});
    socket.on('disconnect',()=>{state.connection='offline'; renderTop(); if(page==='overlays')renderOverlays();});
    socket.on('connect_error',err=>toast('Conexión',err.message||'No se pudo conectar al stream.','err'));
    socket.on('settings', s=>{settings=merge(defaultSettings,s||{});applyAppearance();});
    socket.on('voiceListSettings', v=>{settings.voiceList=merge(settings.voiceList,v||{});if(page==='widgets'&&!window.__sfVoiceWidgetEditorOpen){renderWidgets();}});
    socket.on('accountState', d=>{if(!d?.platform)return;state.accounts[d.platform]=d;renderTop();if(page==='connections'||page==='overlays')render();});
    socket.on('liveHistory', data=>{state.chat=[];state.events=[];state.gifts=[];(data?.chat||[]).forEach(acceptChat);(data?.events||[]).forEach(acceptEvent);state.historyLoaded=true;});
    socket.on('chat',d=>acceptChat(d||{}));
    socket.on('event',d=>acceptEvent(d||{}));
    socket.on('roulette:sync',s=>{rouletteState=s||rouletteState;if(page==='roulette')renderRoulette();});
    socket.on('roulette:result',s=>{rouletteState=s||rouletteState;toast('Ganador',s?.winner?.displayName||s?.winner?.username||'Listo');if(page==='roulette')renderRoulette();});
    socket.on('roulette:error',e=>toast('Ruleta',e.message||'No se pudo iniciar','err'));
    socket.on('system',d=>d?.message&&toast('Sistema',d.message));
  }

  async function startApp(){
    if(!token()){showAuth();return;}
    try{ const me=await api('/api/me'); user=me.user; $('authScreen').classList.add('hidden');$('app').classList.remove('hidden');settings=merge(defaultSettings,await api('/api/user/settings'));render();setupSocket(); }
    catch(e){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);showAuth();}
  }
  function showAuth(){ $('authScreen').classList.remove('hidden');$('app').classList.add('hidden');$('authTitle').textContent=authMode==='login'?'Bienvenido de vuelta':'Crear cuenta';$('authText').textContent=authMode==='login'?'Inicia sesión para abrir tu estudio.':'Crea tu cuenta para guardar voces y configuraciones.';$('authNameWrap').classList.toggle('hidden',authMode==='login');$('authSubmit').innerHTML=authMode==='login'?'Entrar al estudio <span>→</span>':'Crear cuenta <span>→</span>';$('authToggle').textContent=authMode==='login'?'¿No tienes cuenta? Crear cuenta':'¿Ya tienes cuenta? Iniciar sesión';}
  async function authSubmit(e){e.preventDefault();$('authError').textContent='';try{const d=await api(authMode==='login'?'/api/auth/login':'/api/auth/register',{method:'POST',body:JSON.stringify({email:$('authEmail').value,password:$('authPassword').value,displayName:$('authName').value})});localStorage.setItem(TOKEN_KEY,d.token);localStorage.setItem(SESSION_KEY,JSON.stringify(d.user));await startApp();}catch(err){$('authError').textContent=err.message;}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'});}catch{}try{socket?.disconnect();}catch{}localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);user=null;state.chat=[];state.events=[];state.gifts=[];showAuth();}

  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{page=btn.dataset.page;render();}));
  $('collapse').onclick=()=>document.body.classList.toggle('sidebar-collapsed');
  $('logout').onclick=logout;
  $('authForm').addEventListener('submit',authSubmit);
  $('authToggle').onclick=()=>{authMode=authMode==='login'?'register':'login';showAuth();};
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(pageMeta[next]){page=next;render();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(!socket||!socket.connected)setupSocket();else hydrateHistory();if(page==='customize'&&activeCustomizeTab==='chat')renderCustomizePreviewOnly();}});
  window.addEventListener('pageshow',()=>{if(!socket||!socket.connected)setupSocket();});

  window.streamFusionStudio = { state, getSettings:()=>structuredClone(settings), openOverlay };
  showAuth(); startApp();
})();
