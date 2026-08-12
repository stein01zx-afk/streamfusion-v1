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
    voiceList:{enabled:true,transparent:true,backgroundOpacity:0,fontFamily:'Inter, Arial, sans-serif',fontSize:28,fontWeight:700,fontStyle:'normal',textColor:'#000000',textShadow:'none',shadowColor:'#000000',outlineWidth:0,outlineColor:'#000000',textTransform:'none',letterSpacing:0,lineHeight:1.2,itemGap:10,align:'left',listPosition:'left',autoShowEnabled:false,autoShowEvery:30,autoShowFor:6,direction:'vertical',motion:'static',motionSpeed:24,showIndex:false,showId:false,selectedVoice:'',overrides:{},roulette:{enabled:false}},
    personalization:{theme:'dark',font:'inter',animation:'slide',chatLayout:'vertical',chatDirection:'down',chatTheme:'cloud',chatAdjustMessages:false,avatarFrame:'platform',bubbleFrame:'platform',avatarSize:'md',nameSize:'md',nameWeight:'800',chatHorizontalMode:'normal',chatOverlayShape:'normal',badgeStyle:'emoji',tiktokNameColor:'white',twitchNameColor:'real',messageEffect:'shadow',nameEffect:'shadow',textColor:'auto',showBadges:true,showEmotes:true,highlightSupporters:true,supporterHighlightStyle:'gold',highlightEventUsername:true,highlightLikes:true,highlightFollows:true,highlightJoins:true,highlightShares:true,highlightSystem:true,highlightFanclub:true,highlightSuperfan:true,highlightGifts:true,highlightSubs:true,highlightBits:true,highlightRaids:true,autoClearChat:false,clearChatSeconds:30,eventsLayout:'vertical',eventsDirection:'down',eventsMode:'slide',eventsPanelSize:'normal',eventsOverlayShape:'normal',eventsCardFrame:true,giftsLayout:'vertical',giftsDirection:'down',giftsMode:'slide',giftsPanelSize:'normal',giftsOverlayShape:'normal',giftsCardFrame:true,giftHighlightStyle:'gold',overlayEventHighlightStyle:'platform',overlayGiftImageSize:'md',overlayGiftComposition:'normal'},
    appearance:{theme:'dark',accent:'#7c5cff',uiScale:1},
    tiktokModerators:[]
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
  let activeWidget = null;

  const state = {
    chat:[], events:[], gifts:[],
    accounts:{tiktok:{}, twitch:{}},
    voices:[], catalog:[],
    activity:{tiktok:{},twitch:{}},
    supporters:{tiktok:{},twitch:{}},
    avatarCache:new Map(), avatarPending:new Map(),
    historyLoaded:false,
    connection:'offline'
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
    document.documentElement.style.setProperty('--sf-ui-scale', String(a.uiScale || 1));
  }

  function isConnected(platform) { return Boolean(state.accounts[platform]?.connected); }
  function isConfiguredTikTokModerator(item) {
    if (String(item?.platform || '').toLowerCase() !== 'tiktok') return false;
    const candidates = [item?.uniqueId, item?.username, item?.user, item?.displayName].map(normalizeUsername).filter(Boolean).map(v=>v.toLowerCase());
    const configured = (settings.tiktokModerators || []).map(normalizeUsername).filter(Boolean).map(v=>v.toLowerCase());
    return candidates.some(v=>configured.includes(v));
  }

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
        <span class="top-account-avatar"><img src="${esc(a.avatarUrl || '/coin-logo.png')}" alt="" onerror="this.src='/coin-logo.png'"></span>
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

  function avatarKey(platform, username) { return `${String(platform||'').toLowerCase()}:${normalizeUsername(username).toLowerCase()}`; }

  async function resolveAvatar(platform, username) {
    const clean = normalizeUsername(username);
    if (!clean) return '/coin-logo.png';
    const key = avatarKey(platform, clean);
    if (state.avatarCache.has(key)) return state.avatarCache.get(key);
    if (state.avatarPending.has(key)) return state.avatarPending.get(key);
    const promise = api(`/api/avatar?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(clean)}`)
      .then(d => d.avatarUrl || '/coin-logo.png')
      .catch(() => '/coin-logo.png')
      .then(url => { state.avatarCache.set(key, url); return url; })
      .finally(() => state.avatarPending.delete(key));
    state.avatarPending.set(key, promise);
    return promise;
  }

  function queueAvatarImages(root = document) {
    root.querySelectorAll('img[data-avatar-platform][data-avatar-user]').forEach(img => {
      const platform = img.dataset.avatarPlatform; const username = img.dataset.avatarUser;
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

  function styleVars(item) {
    const p = settings.personalization; const accent = item.platform === 'twitch' ? '#9146ff' : '#fe2c55';
    let textColor = p.textColor === 'auto' ? '#e8ecf4' : (p.textColor || '#e8ecf4');
    if (p.tiktokNameColor === 'white' && item.platform === 'tiktok') textColor = '#fff';
    if (p.twitchNameColor === 'real' && item.platform === 'twitch') textColor = '#c7a2ff';
    return `--row-accent:${accent};--name-color:${textColor}`;
  }

  function giftMedia(item) {
    const image = item.giftImage || item.gift?.image || '';
    if (!image && !item.gift && !item.giftName) return '';
    const name = item.gift || item.giftName || 'Regalo';
    return `<div class="gift-media">${image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none'">` : '<span class="gift-fallback">🎁</span>'}<span>${esc(name)}</span>${item.amount ? `<small>×${esc(item.amount)}</small>` : ''}</div>`;
  }

  function messageRow(item, kind='chat') {
    const platform = String(item.platform || 'tiktok').toLowerCase();
    const userName = item.displayName || item.username || item.uniqueId || item.user || 'Usuario';
    const body = item.message || item.action || '';
    const time = new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    return `<article class="stream-row ${kind} ${platform} ${isSupporter(item) ? 'supporter-gold' : ''}" style="${styleVars(item)}">
      <div class="chat-avatar ${frameClass(item)} size-${settings.personalization.avatarSize || 'md'}">
        <img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(userName)}" src="${esc(item.avatar || '/coin-logo.png')}" alt="${esc(userName)}" loading="lazy" onerror="this.onerror=null;this.src='/coin-logo.png'">
      </div>
      <div class="row-body">
        <div class="row-top">
          <strong class="name-size-${settings.personalization.nameSize || 'md'} weight-${settings.personalization.nameWeight || '800'}">${esc(userName)}</strong>
          ${badgeMarkup(item.badges)}${activityBadgeMarkup(item)}${isConfiguredTikTokModerator(item) ? '<span class="badge mod-badge" title="Moderador de TikTok">🛡️</span>' : ''}
          <span class="platform-pill ${platform}">${platform === 'twitch' ? 'TW' : 'TT'}</span><time>${time}</time>
        </div>
        ${body ? `<div class="row-message ${bubbleClass(item)}">${esc(body)}</div>` : ''}
        ${kind === 'gift' ? giftMedia(item) : ''}
      </div>
    </article>`;
  }

  function renderDashboard() {
    const chat = state.chat.slice(-300); const ev = state.events.slice(-100); const gifts = state.gifts.slice(-100);
    $('view').innerHTML = `<div class="hero"><div><span class="live-dot"></span> ${state.connection === 'online' ? 'CONEXIÓN ACTIVA' : 'ESPERANDO CONEXIÓN'}<h2>Todo lo que pasa en tu live,<br><em>en un solo lugar.</em></h2><p>Este diseño del dashboard es independiente de los overlays. La conexión de tus canales alimenta ambos, pero cada vista mantiene su propio estilo.</p></div><div class="hero-stat"><strong>${chat.length}</strong><span>mensajes retenidos</span></div></div>
      <div class="metric-grid"><article><span>◌</span><small>Mensajes</small><strong>${chat.length}</strong><em>en memoria</em></article><article><span>♡</span><small>Eventos</small><strong>${ev.length}</strong><em>actividad</em></article><article><span>◈</span><small>Regalos</small><strong>${gifts.length}</strong><em>supporters</em></article></div>
      <div class="dashboard-grid"><section class="card feed"><header><div><p class="eyebrow">EN VIVO</p><h3>Chat unificado</h3></div><div class="header-actions"><select id="dashChatFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></div></header><div id="dashChat" class="chat-feed">${chat.length ? chat.map(x=>messageRow(x)).join('') : '<div class="empty">Conecta TikTok o Twitch para recibir comentarios.</div>'}</div></section>
      <section class="card activity"><header><div><p class="eyebrow">ACTIVIDAD</p><h3>Eventos & regalos</h3></div></header><div id="dashActivity" class="event-feed">${[...ev.map(x=>messageRow(x,'event')),...gifts.map(x=>messageRow(x,'gift'))].reverse().join('') || '<div class="empty">Aún no hay actividad.</div>'}</div></section></div>`;
    const filter = $('dashChatFilter'); filter.value = settings.filters.chat || 'all'; filter.onchange = () => { settings.filters.chat = filter.value; renderDashboard(); };
    queueAvatarImages(); requestAnimationFrame(() => { const f=$('dashChat'); if(f) f.scrollTop=f.scrollHeight; });
  }

  function renderConnections() {
    const card = (platform, label, placeholder) => { const a=state.accounts[platform]||{}; return `<article class="card connection-card"><div class="connection-top"><span class="connection-avatar"><img src="${esc(a.avatarUrl || '/coin-logo.png')}" alt=""></span><div><p class="eyebrow">${label.toUpperCase()}</p><h3>${esc(a.username || 'Sin conectar')}</h3><span class="status ${a.connected?'on':''}"><i></i>${a.connected?'Conectado':'Desconectado'}</span></div></div><label>Cuenta<input id="${platform}Input" value="${esc(a.username||'')}" placeholder="${placeholder}"></label><div class="row"><button class="btn primary" id="${platform}Connect">Conectar</button><button class="btn secondary" id="${platform}Disconnect">Desconectar</button></div><p class="muted">Esta conexión alimenta el chat y los overlays. Su estilo no se copia a la interfaz principal.</p></article>`; };
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


  function chatPreviewHtml() {
    const recent = state.chat.length ? state.chat.slice(-18) : [{ platform:'tiktok', displayName:'Vista previa', username:'preview', badges:['verified'], message:'Escribe o recibe un comentario para verlo aquí en tiempo real.' }];
    return recent.map(x=>messageRow(x)).join('');
  }

  function renderCustomizePreviewOnly() {
    const box=$('liveChatPreview'); if(!box) return;
    box.innerHTML=chatPreviewHtml();
    box.className=`live-chat-preview layout-${settings.personalization.chatLayout || 'vertical'} direction-${settings.personalization.chatDirection || 'down'}`;
    queueAvatarImages(box); requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});
  }

  function bindCustomizeInputs() {
    const pairs = {
      cTheme:['personalization','chatTheme'], cFont:['personalization','font'], cAvatar:['personalization','avatarFrame'], cBubble:['personalization','bubbleFrame'], cAvatarSize:['personalization','avatarSize'], cNameSize:['personalization','nameSize'], cNameWeight:['personalization','nameWeight'], cTextColor:['personalization','textColor'], cAnim:['personalization','animation'], cDirection:['personalization','chatDirection'], cLayout:['personalization','chatLayout'], cAdjust:['personalization','chatAdjustMessages'], cBadges:['personalization','showBadges'], cActivity:['personalization','highlightLikes'], cAutoClear:['personalization','autoClearChat'], cClearSeconds:['personalization','clearChatSeconds'],
      eLayout:['personalization','eventsLayout'], eDirection:['personalization','eventsDirection'], eMode:['personalization','eventsMode'], eSize:['personalization','eventsPanelSize'], gLayout:['personalization','giftsLayout'], gDirection:['personalization','giftsDirection'], gMode:['personalization','giftsMode'], gSize:['personalization','giftsPanelSize'], eFrame:['personalization','eventsCardFrame'], gFrame:['personalization','giftsCardFrame'], giftImg:['personalization','overlayGiftImageSize']
    };
    document.querySelectorAll('#customArea select,#customArea input').forEach(el => el.addEventListener('change', async () => {
      const key = pairs[el.id] || (el.id.startsWith('x_') ? ['personalization',el.id.slice(2)] : null); if(!key) return;
      let value = el.type === 'checkbox' ? el.checked : el.value;
      if(el.id === 'cClearSeconds') value = Number(value || 30);
      const patch = { [key[0]]:{ [key[1]]:value } };
      settings = merge(settings, patch); applyAppearance();
      if(activeCustomizeTab === 'chat') renderCustomizePreviewOnly();
      await persistSettingsPatch(patch, false);
    }));
  }

  function renderCustomize() {
    const p=settings.personalization;
    $('view').innerHTML=`<div class="intro"><h2>Personalización</h2><p>Estos controles modifican exclusivamente el aspecto del dashboard, su vista previa y los componentes internos. El overlay mantiene su propio diseño.</p></div><div class="tabs"><button class="tab ${activeCustomizeTab==='chat'?'active':''}" data-tab="chat">Chat</button><button class="tab ${activeCustomizeTab==='events'?'active':''}" data-tab="events">Eventos</button><button class="tab ${activeCustomizeTab==='gifts'?'active':''}" data-tab="gifts">Regalos</button></div><div id="customArea"></div>`;

    const draw = tab => {
      activeCustomizeTab=tab;
      if(tab==='chat') {
        $('customArea').innerHTML=`<div class="settings-grid three custom-layout"><article class="card"><p class="eyebrow">CHAT DEL DASHBOARD</p><h3>Diseño real</h3>${ctl('Tema','cTheme','select',p.chatTheme,'<option value="cloud">Cloud</option><option value="minimal">Minimal</option><option value="neon">Neon</option><option value="aurora">Aurora</option>')}${ctl('Tipo de letra','cFont','select',p.font||'inter','<option value="inter">Inter / Manrope</option><option value="poppins">Poppins</option><option value="montserrat">Montserrat</option><option value="oswald">Oswald</option><option value="system">Sistema</option>')}${ctl('Marco avatar','cAvatar','select',p.avatarFrame,'<option value="platform">Plataforma</option><option value="ring">Anillo</option><option value="role">Rol</option><option value="none">Sin marco</option>')}${ctl('Marco comentario','cBubble','select',p.bubbleFrame,'<option value="platform">Plataforma</option><option value="role">Rol</option><option value="none">Sin marco</option>')}${ctl('Tamaño avatar','cAvatarSize','select',p.avatarSize,'<option value="sm">Pequeño</option><option value="md">Medio</option><option value="lg">Grande</option>')}${ctl('Tamaño nombre','cNameSize','select',p.nameSize,'<option value="sm">Pequeño</option><option value="md">Medio</option><option value="lg">Grande</option>')}${ctl('Peso nombre','cNameWeight','select',p.nameWeight,'<option value="600">Semibold</option><option value="700">Bold</option><option value="800">Extra Bold</option><option value="900">Black</option>')}</article><article class="card"><p class="eyebrow">TEXTO</p><h3>Legibilidad</h3>${ctl('Color del mensaje','cTextColor','select',p.textColor,'<option value="auto">Automático</option><option value="#ffffff">Blanco</option><option value="#d9d9e4">Gris claro</option><option value="#ffd76e">Dorado</option><option value="#9fe8ff">Celeste</option>')}${ctl('Animación','cAnim','select',p.animation,'<option value="slide">Slide</option><option value="fade">Fade</option><option value="pop">Pop</option><option value="none">Sin animación</option>')}${ctl('Dirección','cDirection','select',p.chatDirection,'<option value="down">Más reciente abajo</option><option value="up">Más reciente arriba</option>')}${ctl('Distribución','cLayout','select',p.chatLayout,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}${ctl('Ajustar mensajes largos','cAdjust','check',p.chatAdjustMessages)}${ctl('Mostrar insignias','cBadges','check',p.showBadges!==false)}${ctl('Mostrar actividad','cActivity','check',p.highlightLikes!==false)}${ctl('Auto limpiar','cAutoClear','check',p.autoClearChat)}${ctl('Segundos','cClearSeconds','input',p.clearChatSeconds||30)}</article><article class="card preview-card real-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA EN TIEMPO REAL</p><h3>Chat del dashboard</h3></div><span class="preview-live"><i></i> LIVE</span></div><div id="liveChatPreview" class="live-chat-preview">${chatPreviewHtml()}</div><div class="preview-note">Este preview usa los mismos mensajes que llegan al dashboard. Cambiar de pestaña no detiene el socket.</div></article></div>`;
      } else {
        const events=tab==='events'; const x=events?p.eventsLayout:p.giftsLayout; const d=events?p.eventsDirection:p.giftsDirection; const mode=events?p.eventsMode:p.giftsMode;
        $('customArea').innerHTML=`<div class="settings-grid three"><article class="card"><p class="eyebrow">${events?'EVENTOS':'REGALOS'}</p><h3>Diseño interno</h3>${ctl('Distribución',events?'eLayout':'gLayout','select',x,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}${ctl('Dirección',events?'eDirection':'gDirection','select',d,'<option value="down">Abajo</option><option value="up">Arriba</option><option value="left">Izquierda</option><option value="right">Derecha</option>')}${ctl('Modo',events?'eMode':'gMode','select',mode,'<option value="slide">Slide</option><option value="fade">Fade</option><option value="stack">Stack</option>')}${ctl('Tamaño',events?'eSize':'gSize','select',events?p.eventsPanelSize:p.giftsPanelSize,'<option value="compact">Compacto</option><option value="normal">Normal</option><option value="large">Grande</option><option value="xl">XL</option>')}</article><article class="card"><p class="eyebrow">REGLAS</p><h3>Destacados</h3>${(events?['highlightLikes','highlightFollows','highlightJoins','highlightShares','highlightSystem']:['highlightGifts','highlightSubs','highlightBits','highlightRaids']).map(k=>ctl(k.replace('highlight','Mostrar '),'x_'+k,'check',p[k]!==false)).join('')}${ctl('Marco de tarjeta',events?'eFrame':'gFrame','check',events?p.eventsCardFrame!==false:p.giftsCardFrame!==false)}${!events?ctl('Tamaño imagen regalo','giftImg','select',p.overlayGiftImageSize,'<option value="sm">Pequeña</option><option value="md">Mediana</option><option value="lg">Grande</option>'):''}</article><article class="card preview-card"><p class="eyebrow">VISTA PREVIA</p><div class="preview-stack">${messageRow(events?{platform:'twitch',displayName:'Nuevo seguidor',username:'seguidor',type:'follow',message:'Empezó a seguirte'}:{platform:'tiktok',displayName:'Supporter',username:'supporter',type:'gift',gift:'Rose',amount:1},events?'event':'gift')}</div><p class="preview-note">Este diseño es exclusivo de la interfaz principal. El overlay conserva su propio estilo.</p></article></div>`;
      }
      if(tab==='chat'){
        setSelect('cTheme',p.chatTheme);setSelect('cFont',p.font||'inter');setSelect('cAvatar',p.avatarFrame);setSelect('cBubble',p.bubbleFrame);setSelect('cAvatarSize',p.avatarSize);setSelect('cNameSize',p.nameSize);setSelect('cNameWeight',p.nameWeight);setSelect('cTextColor',p.textColor);setSelect('cAnim',p.animation);setSelect('cDirection',p.chatDirection);setSelect('cLayout',p.chatLayout);setCheck('cAdjust',p.chatAdjustMessages);setCheck('cBadges',p.showBadges!==false);setCheck('cActivity',p.highlightLikes!==false);setCheck('cAutoClear',p.autoClearChat);
        const cs=$('cClearSeconds');if(cs)cs.value=String(p.clearChatSeconds||30);
      }else{const ev=tab==='events';setSelect(ev?'eLayout':'gLayout',ev?p.eventsLayout:p.giftsLayout);setSelect(ev?'eDirection':'gDirection',ev?p.eventsDirection:p.giftsDirection);setSelect(ev?'eMode':'gMode',ev?p.eventsMode:p.giftsMode);setSelect(ev?'eSize':'gSize',ev?p.eventsPanelSize:p.giftsPanelSize);setCheck(ev?'eFrame':'gFrame',ev?p.eventsCardFrame!==false:p.giftsCardFrame!==false);if(!ev)setSelect('giftImg',p.overlayGiftImageSize);}
      bindCustomizeInputs();
      if(tab==='chat') renderCustomizePreviewOnly(); else queueAvatarImages();
    };
    document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{draw(btn.dataset.tab);document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.tab===btn.dataset.tab));});
    draw(activeCustomizeTab);
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
    const list=voicePreviewItems(); const motion=s.motion||'static'; const displacement=s.displacement||s.direction||'vertical'; const vertical=displacement==='vertical'; const reverse=(s.listDirection||'forward')==='reverse';
    const items=list.map((v,i)=>{const o=s.overrides?.[v.key]||{}; const st=`font-family:${esc(o.fontFamily||s.fontFamily)};font-size:${Number(o.fontSize ?? s.fontSize ?? 28)}px;font-weight:${Number(o.fontWeight ?? s.fontWeight ?? 700)};font-style:${esc(o.fontStyle||s.fontStyle||'normal')};color:${esc(o.color||s.textColor||'#000')};text-shadow:${voiceShadow(o.textShadow||s.textShadow,o.shadowColor||s.shadowColor)};-webkit-text-stroke:${Number(o.outlineWidth ?? s.outlineWidth ?? 0)}px ${esc(o.outlineColor||s.outlineColor||'#000')};text-transform:${esc(o.textTransform||s.textTransform||'none')};letter-spacing:${Number(o.letterSpacing ?? s.letterSpacing ?? 0)}px;line-height:${Number(o.lineHeight ?? s.lineHeight ?? 1.2)};`; return `<div class="voice-live-item" style="${st}">${s.showIndex?`<span class="voice-live-index">${i+1}. </span>`:''}${esc(v.label||v.name||v.key||v.fishId)}${s.showId?`<small>${esc(v.id||v.fishId||'')}</small>`:''}</div>`}).join('');
    const dup=motion==='static'?items:items+items;
    return `<div class="voice-live-stage ${vertical?'is-vertical':'is-horizontal'} ${reverse?'is-reverse':''} motion-${esc(motion)}" style="--vl-preview-speed:${Math.max(4,Number(s.motionSpeed||24))}s;--vl-preview-gap:${Math.max(0,Number(s.itemGap||10))}px;--vl-preview-align:${esc(s.align||'left')};--vl-preview-bg:rgba(255,255,255,${s.transparent?Number(s.backgroundOpacity||0):Math.max(.06,Number(s.backgroundOpacity||.08))})"><div class="voice-live-track">${dup}</div></div>`;
  }
  function voiceCtl(label,id,type,value,opts=''){return ctl(label,id,type,value,opts)}
  function voiceRouletteMarkup(r){return `<div class="widget-subsection"><div class="section-head"><div><p class="eyebrow">INTRO DEL WIDGET</p><h3>Secuencia previa</h3></div><span class="muted">opcional</span></div><div class="settings-grid two compact-grid">${voiceCtl('Activar','vlRouletteEnabled','check',r.enabled)}${voiceCtl('Mostrar lista al terminar','vlShowListAfter','check',r.showListAfterIntro!==false)}${voiceCtl('Texto 1','vlRText1','input',r.title)}${voiceCtl('Segundos 1','vlRTime1','input',r.titleSeconds)}${voiceCtl('Texto 2','vlRText2','input',r.subtitle)}${voiceCtl('Segundos 2','vlRTime2','input',r.subtitleSeconds)}${voiceCtl('Texto 3','vlRText3','input',r.winnerText)}${voiceCtl('Segundos 3','vlRTime3','input',r.winnerSeconds)}${voiceCtl('Animación','vlRMotion','select',r.introMotion||'fade','<option value="fade">Fade</option><option value="slide-up">Slide up</option><option value="slide-down">Slide down</option><option value="zoom">Zoom</option><option value="type">Type</option><option value="star-wars">Star Wars</option>')}${voiceCtl('Opacidad tarjeta','vlRCard','input',r.cardOpacity)}</div><p class="muted">La escena de ruleta del widget sigue siendo independiente de la ruleta principal de StreamFusion.</p></div>`}

  function renderWidgets(){
    if(activeWidget !== 'voice-list') {
      $('view').innerHTML=`<div class="intro"><h2>Widgets</h2><p>Activa primero el widget que quieres editar. Cada widget mantiene su propia configuración y preview en tiempo real.</p></div><div class="overlay-grid"><article class="card overlay-card widget-launch-card"><div class="mini-preview">🎙️</div><p class="eyebrow">WIDGET</p><h3>Lista de voces</h3><p class="muted">Personaliza tipografía, color, movimiento, desplazamiento, estilos individuales y la secuencia de ruleta.</p><button class="btn primary" id="openVoiceListEditor">Abrir Lista de voces</button></article></div>`;
      $('openVoiceListEditor').onclick=()=>{activeWidget='voice-list';renderWidgets();};
      return;
    }
    const s=structuredClone(settings.voiceList||{}); s.roulette={enabled:false,title:'¿Quieres una voz?',subtitle:'Para participar, comenta lo que se indique en el sorteo!',winnerText:'Si ganas, solo comenta una de las siguientes voces:',titleSeconds:3,subtitleSeconds:3,winnerSeconds:3,introMotion:'fade',cardOpacity:.12,showListAfterIntro:true,...(s.roulette||{})};
    const fontOpts='<option value="Inter, Arial, sans-serif">Inter</option><option value="Poppins, Arial, sans-serif">Poppins</option><option value="Montserrat, Arial, sans-serif">Montserrat</option><option value="system-ui, sans-serif">Sistema</option><option value="ui-monospace, monospace">Monospace</option>';
    const voicePreviewItems=()=> (state.voices.length?state.voices:state.catalog.slice(0,8));
    const voiceCtl=(label,id,type,value,opts='')=>ctl(label,id,type==='num'?'input':type,value,opts);
    const buildVoicePreviewHtml=(cfg)=>{ const rows=voicePreviewItems().slice(0,8); const dir=cfg.displacement||cfg.direction||'vertical'; return `<div class="voice-live-stage is-${esc(dir)}"><div class="voice-live-track" style="--vl-preview-gap:${Number(cfg.itemGap)||10}px;--vl-preview-speed:${Math.max(6,Number(cfg.motionSpeed)||24)}s">${rows.map((v,i)=>`<div class="voice-live-item" style="font-family:${esc(cfg.fontFamily||'Inter, Arial, sans-serif')};font-size:${Number(cfg.fontSize)||28}px;font-weight:${Number(cfg.fontWeight)||700};font-style:${esc(cfg.fontStyle||'normal')};color:${esc(cfg.textColor||'#000')};text-shadow:${cfg.textShadow==='soft'?'0 2px 8px rgba(0,0,0,.35)':cfg.textShadow==='strong'?'0 4px 14px rgba(0,0,0,.5)':'none'};text-transform:${esc(cfg.textTransform||'none')};letter-spacing:${Number(cfg.letterSpacing)||0}px;line-height:${Number(cfg.lineHeight)||1.2};text-align:${esc(cfg.align||'left')}">${cfg.showIndex?`${i+1}. `:''}${esc(v.label||v.name||v.key||v.fishId)}${cfg.showId?`<small>${esc(v.fishId||v.id||'')}</small>`:''}</div>`).join('')||'<div class="empty">Agrega una voz para verla aquí.</div>'}</div></div>`; };
    const backBtn=`<button class="btn secondary" id="backToWidgets">← Widgets</button>`;
    $('view').innerHTML=`<div class="intro split"><div><h2>Lista de voces</h2><p>La configuración de este widget se aplica al overlay inmediatamente después de guardar.</p></div><div class="row">${backBtn}<button class="btn secondary" id="openVoiceWidget">Abrir overlay</button><button class="btn primary" id="saveVoiceWidget">Guardar cambios</button></div></div><div class="widget-editor-layout"><section class="card widget-controls"><div class="settings-grid two compact-grid">
      <article class="widget-subsection"><p class="eyebrow">GENERAL</p>${voiceCtl('Activar','vEnabled','check',s.enabled)}${voiceCtl('Fondo transparente','vTransparent','check',s.transparent)}${voiceCtl('Opacidad de fondo','vBgOpacity','num',s.backgroundOpacity)}${voiceCtl('Fuente','vFont','select',s.fontFamily,fontOpts)}${voiceCtl('Tamaño','vSize','num',s.fontSize)}${voiceCtl('Peso','vWeight','num',s.fontWeight)}${voiceCtl('Estilo','vStyle','select',s.fontStyle,'<option value="normal">Normal</option><option value="italic">Cursiva</option>')}${voiceCtl('Color','vColor','input',s.textColor)}</article>
      <article class="widget-subsection"><p class="eyebrow">EFECTOS</p>${voiceCtl('Sombra','vShadow','select',s.textShadow,'<option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>')}${voiceCtl('Color sombra','vShadowColor','input',s.shadowColor)}${voiceCtl('Contorno (px)','vOutline','num',s.outlineWidth)}${voiceCtl('Color contorno','vOutlineColor','input',s.outlineColor)}${voiceCtl('Transformación','vTransform','select',s.textTransform,'<option value="none">Normal</option><option value="uppercase">MAYÚSCULAS</option><option value="lowercase">minúsculas</option><option value="capitalize">Capitalizar</option>')}${voiceCtl('Espaciado','vLetter','num',s.letterSpacing)}${voiceCtl('Altura línea','vLine','num',s.lineHeight)}</article>
      <article class="widget-subsection"><p class="eyebrow">COMPOSICIÓN</p>${voiceCtl('Separación','vGap','num',s.itemGap)}${voiceCtl('Alineación','vAlign','select',s.align,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}${voiceCtl('Desplazamiento','vDisplacement','select',s.displacement||s.direction||'vertical','<option value="horizontal">Horizontal — izquierda a derecha</option><option value="vertical">Vertical — arriba a abajo</option>')}${voiceCtl('Dirección','vListDirection','select',s.listDirection||'forward','<option value="forward">Normal</option><option value="reverse">Invertida</option>')}${voiceCtl('Movimiento','vMotion','select',s.motion,'<option value="static">Estático</option><option value="scroll">Scroll</option><option value="slide">Slide</option><option value="marquee">Marquee</option><option value="float">Float</option><option value="crawl">Crawl</option><option value="starwars">Star Wars</option>')}${voiceCtl('Velocidad','vMotionSpeed','num',s.motionSpeed)}</article>
      <article class="widget-subsection"><p class="eyebrow">VISIBILIDAD</p>${voiceCtl('Mostrar índice','vShowIndex','check',s.showIndex)}${voiceCtl('Mostrar ID','vShowId','check',s.showId)}${voiceCtl('Mostrar automáticamente','vAutoShow','check',s.autoShowEnabled)}${voiceCtl('Cada (segundos)','vAutoEvery','num',s.autoShowEvery)}${voiceCtl('Visible durante','vAutoFor','num',s.autoShowFor)}${voiceCtl('Voz seleccionada','vSelected','select',s.selectedVoice,'<option value="">Ninguna</option>'+voicePreviewItems().map(v=>`<option value="${esc(v.key||v.id||v.fishId||'')}">${esc(v.label||v.name||v.key||v.id||v.fishId)}</option>`).join(''))}</article>
    </div>${voiceRouletteMarkup(s.roulette)}</section><section class="card widget-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA</p><h3>Lista de voces</h3></div><span class="preview-live"><i></i> LIVE</span></div><div id="voiceWidgetPreview" class="voice-widget-preview">${buildVoicePreviewHtml(s)}</div><div class="widget-preview-footer"><span class="muted">Los cambios visuales se prueban aquí antes de guardarlos.</span><code>/voice-list-overlay.html?owner=${esc(user.id)}</code></div></section></div>`;
    const map={vEnabled:['enabled','check'],vTransparent:['transparent','check'],vBgOpacity:['backgroundOpacity','num'],vFont:['fontFamily'],vSize:['fontSize','num'],vWeight:['fontWeight','num'],vStyle:['fontStyle'],vColor:['textColor'],vShadow:['textShadow'],vShadowColor:['shadowColor'],vOutline:['outlineWidth','num'],vOutlineColor:['outlineColor'],vTransform:['textTransform'],vLetter:['letterSpacing','num'],vLine:['lineHeight','num'],vGap:['itemGap','num'],vAlign:['align'],vDisplacement:['displacement'],vListDirection:['listDirection'],vMotion:['motion'],vMotionSpeed:['motionSpeed','num'],vShowIndex:['showIndex','check'],vShowId:['showId','check'],vAutoShow:['autoShowEnabled','check'],vAutoEvery:['autoShowEvery','num'],vAutoFor:['autoShowFor','num'],vSelected:['selectedVoice']};
    const updatePreview=()=>{$('voiceWidgetPreview').innerHTML=buildVoicePreviewHtml(s);};
    for(const [id,[key,type]] of Object.entries(map)){const el=$(id);if(!el)continue;if(type==='check')el.checked=!!s[key];else el.value=String(s[key]??'');el.addEventListener('input',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});el.addEventListener('change',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});}
    setSelect('vFont',s.fontFamily); setSelect('vSelected',s.selectedVoice); if($('vColor'))$('vColor').value=s.textColor; if($('vShadowColor'))$('vShadowColor').value=s.shadowColor; if($('vOutlineColor'))$('vOutlineColor').value=s.outlineColor;
    const rr={vlRouletteEnabled:['enabled','check'],vlShowListAfter:['showListAfterIntro','check'],vlRText1:['title'],vlRTime1:['titleSeconds','num'],vlRText2:['subtitle'],vlRTime2:['subtitleSeconds','num'],vlRText3:['winnerText'],vlRTime3:['winnerSeconds','num'],vlRMotion:['introMotion'],vlRCard:['cardOpacity','num']};
    for(const [id,[key,type]] of Object.entries(rr)){const el=$(id);if(!el)continue;el.addEventListener('input',()=>{s.roulette[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});}
    $('backToWidgets').onclick=()=>{activeWidget=null;renderWidgets();};
    $('openVoiceWidget').onclick=()=>openOverlay('voice-list-overlay.html','streamfusionVoiceList');
    $('saveVoiceWidget').onclick=async()=>{try{const result=await api('/api/voice-list/settings',{method:'PUT',body:JSON.stringify(s)});settings.voiceList=merge(settings.voiceList,result.voiceList||s);toast('Widget guardado','Los cambios se aplicaron al overlay y a tu cuenta.');updatePreview();}catch(e){toast('No se guardó',e.message,'err')}};
  }

  function renderSettings(){
    const a=settings.appearance||{}; const mods=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[];
    $('view').innerHTML=`<div class="intro"><h2>Ajustes</h2><p>Conexión, apariencia, moderadores y controles que afectan al sistema completo.</p></div><div class="settings-grid two"><article class="card"><p class="eyebrow">APARIENCIA DEL DASHBOARD</p><h3>Tema y escala</h3>${ctl('Tema','sTheme','select',a.theme||'dark','<option value="dark">Noche profunda</option><option value="midnight">Medianoche</option><option value="light">Claro</option>')}<label>Color de acento<input id="sAccent" type="color" value="${esc(a.accent||'#7c5cff')}"></label>${ctl('Escala de interfaz','sUiScale','select',String(a.uiScale||1),'<option value="0.9">90%</option><option value="1">100%</option><option value="1.1">110%</option><option value="1.2">120%</option>')}<button class="btn primary" id="saveAppearance">Guardar</button></article><article class="card"><p class="eyebrow">MODERADORES TIKTOK</p><h3>Añadir moderadores</h3><p class="muted">Guarda el <strong>uniqueId</strong> de cada moderador. Aparecerá 🛡️ en el chat y el filtro «Solo moderadores» del Bot de Voz lo reconocerá automáticamente.</p><div class="row"><input id="moderatorInput" placeholder="uniqueId de TikTok"/><button class="btn secondary" id="addModerator">＋ Añadir</button></div><div id="moderatorList" class="moderator-list">${mods.length?mods.map(m=>`<span class="moderator-chip"><b>🛡️</b>${esc(m)}<button type="button" data-remove-moderator="${esc(m)}" aria-label="Eliminar">×</button></span>`).join(''):'<div class="empty">No hay moderadores configurados.</div>'}</div></article><article class="card"><p class="eyebrow">CUENTA</p><h3>${esc(user?.displayName||'Creador')}</h3><p>${esc(user?.email||'')}</p><p class="muted">ID: ${esc(user?.id||'')}</p><button class="btn secondary" id="logout2">Cerrar sesión</button></article></div>`;
    setSelect('sTheme',a.theme||'dark');setSelect('sUiScale',String(a.uiScale||1));
    $('saveAppearance').onclick=()=>persistSettingsPatch({appearance:{theme:$('sTheme').value,accent:$('sAccent').value,uiScale:Number($('sUiScale').value||1)}});
    $('addModerator').onclick=async()=>{const value=normalizeUsername($('moderatorInput').value);if(!value)return;const next=[...new Set([...mods,value])];settings.tiktokModerators=next;await persistSettingsPatch({tiktokModerators:next},false);renderSettings();};
    document.querySelectorAll('[data-remove-moderator]').forEach(btn=>btn.onclick=async()=>{const next=mods.filter(x=>normalizeUsername(x).toLowerCase()!==normalizeUsername(btn.dataset.removeModerator).toLowerCase());settings.tiktokModerators=next;await persistSettingsPatch({tiktokModerators:next},false);renderSettings();});
    $('logout2').onclick=logout;
  }

  function render(){ applyAppearance(); activateNav(); renderTop(); if(page==='dashboard')renderDashboard(); else if(page==='connections')renderConnections(); else if(page==='customize')renderCustomize(); else if(page==='overlays')renderOverlays(); else if(page==='roulette')renderRoulette(); else if(page==='voices')renderVoices(); else if(page==='widgets')renderWidgets(); else renderSettings(); }

  function classifyEvent(item){ const type=String(item.type||'').toLowerCase(); return ['gift','sub','bits','raid','host'].includes(type) || item.gift || item.giftName ? 'gift' : 'event'; }

  function acceptChat(item){ const entry={...item,timestamp:item.timestamp||Date.now()}; state.chat.push(entry); if(state.chat.length>500)state.chat.shift(); if(page==='dashboard')renderDashboard(); if(page==='customize'&&activeCustomizeTab==='chat')renderCustomizePreviewOnly(); }
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
    socket.on('voiceListSettings', v=>{settings.voiceList=merge(settings.voiceList,v||{});if(page==='widgets')renderWidgets();});
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
