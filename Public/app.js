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
    panels:{chat:true,events:true,gifts:true}, order:'events-gifts', filters:{chat:'all',event:'all',gift:'all',activity:'all'},
    voiceList:{enabled:true,transparent:true,backgroundOpacity:0,fontFamily:'Inter, Arial, sans-serif',fontSize:28,fontWeight:700,fontStyle:'normal',textColor:'#000000',textShadow:'none',shadowColor:'#000000',outlineWidth:0,outlineColor:'#000000',textTransform:'none',letterSpacing:0,lineHeight:1.2,itemGap:10,align:'left',listPosition:'left',axis:'vertical',movementDirection:'forward',autoShowEnabled:false,autoShowEvery:30,autoShowFor:6,direction:'vertical',motion:'static',motionSpeed:24,showIndex:false,showId:false,selectedVoice:'',overrides:{},roulette:{enabled:false}},
    tiktokModerators:[],
    personalization:{theme:'dark',font:'inter',animation:'slide',chatLayout:'vertical',chatDirection:'down',chatTheme:'cloud',chatAdjustMessages:false,avatarFrame:'platform',bubbleFrame:'platform',avatarSize:'md',nameSize:'md',nameWeight:'800',showPlatformPill:true,showTimestamps:true,showActivity:true,bubbleRadius:12,avatarBorderWidth:2,messagePadding:7,rowGap:5,tiktokNameColor:'white',twitchNameColor:'real',chatOverlayCardSide:'center',badgeStyle:'emoji',tiktokNameColor:'white',twitchNameColor:'real',messageEffect:'shadow',nameEffect:'shadow',textColor:'auto',showBadges:true,showEmotes:true,highlightSupporters:true,supporterHighlightStyle:'gold',eventStyle:'chat',eventSimulationMode:'single',giftStyle:'chat',giftSimulationMode:'single',highlightEventUsername:true,highlightLikes:true,highlightFollows:true,highlightJoins:true,highlightShares:true,highlightSystem:true,highlightFanclub:true,highlightSuperfan:true,highlightGifts:true,highlightSubs:true,highlightBits:true,highlightRaids:true,autoClearChat:false,clearChatSeconds:30,eventsLayout:'vertical',eventsDirection:'down',eventsMode:'slide',eventsPanelSize:'normal',eventsOverlayShape:'normal',eventsOverlayCardSide:'center',eventsCardFrame:true,giftsLayout:'vertical',giftsDirection:'down',giftsMode:'slide',giftsPanelSize:'normal',giftsOverlayShape:'normal',giftsOverlayCardSide:'center',giftsCardFrame:true,giftHighlightStyle:'gold',overlayEventHighlightStyle:'platform',overlayGiftImageSize:'md',overlayGiftComposition:'normal',overlayNameColorMode:'platform',overlayNameColor:'#ffffff',overlayEventFont:'inherit',overlayGiftDisplayMode:'full',overlayGiftCompositionMode:'vertical-centered',eventVisibility:{likes:true,follows:true,joins:true,shares:true,system:true,gifts:true,subscriptions:true,bits:true,raids:true,hosts:true}},
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
  let voiceWidgetSaveTimer = 0;
  let voiceWidgetPreviewTimer = 0;
  let voiceWidgetPreviewStartAt = 0;
  let voiceWidgetPreviewSignature = '';
  let voiceWidgetDraft = null;
  let roulettePreviewTab = 'appearance';
  let roulettePreviewConfig = null;
  let roulettePreviewState = { history: [], participants: [] };
  let roulettePreviewReady = false;
  let roulettePreviewPending = [];
  const recentEventKeys = new Map();

  const state = {
    chat:[], events:[], gifts:[],
    accounts:{tiktok:{connectionId:'',connected:false}, twitch:{connectionId:'',connected:false}},
    voices:[], catalog:[],
    activity:{tiktok:{},twitch:{}},
    supporters:{tiktok:{},twitch:{}},
    avatarCache:new Map(), avatarPending:new Map(),
    historyLoaded:false,
    connection:'offline',
    previewChat:[],
    previewEvents:[],
    previewGifts:[],
    previewEventIndex:0,
    previewGiftIndex:0,
    voiceListPresence:{online:false,connections:0}
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
  function hasConfiguredChannel() { return ['tiktok','twitch'].some(p => Boolean(String(state.accounts[p]?.username || '').trim())); }
  function channelConnectionSummary() {
    const accounts = ['tiktok','twitch'].map(p => state.accounts[p] || {});
    if (accounts.some(a => a.live === true)) return { key:'live', label:'En Directo!', dot:'live' };
    if (accounts.some(a => a.connected === true)) return { key:'waiting', label:'Conectado, esperando directo', dot:'connected' };
    return { key: hasConfiguredChannel() ? 'offline' : 'none', label:'Desconectado, esperando conexión...', dot:'offline' };
  }

  function renderTop() {
    const fallbackName = user?.displayName || 'Creador';
    $('userName').textContent = fallbackName;
    $('userEmail').textContent = user?.email || 'Plan Studio';
    const firstConnected = ['tiktok','twitch'].map(p => state.accounts[p]).find(a => a?.connected);
    const img = $('userInitial');
    if (img) {
      const avatar = firstConnected ? connectedAccountAvatarUrl(firstConnected.platform || (state.accounts.tiktok?.connected ? 'tiktok' : 'twitch'), firstConnected) : '';
      if (img.tagName === 'IMG') {
        img.src = avatar || '';
        img.style.visibility = avatar ? 'visible' : 'hidden';
      } else {
        img.innerHTML = avatar ? `<img src="${esc(avatar)}" alt="">` : esc(fallbackName.charAt(0).toUpperCase());
      }
    }
    $('topAccounts').innerHTML = ['tiktok','twitch'].map(platform => {
      const a = state.accounts[platform] || {};
      const name = a.username || 'Sin conectar';
      const avatar = a.connected ? connectedAccountAvatarUrl(platform, a) : '';
      return `<div class="top-account ${a.connected ? 'on' : ''}">
        <span class="top-account-avatar">${avatar ? `<img src="${esc(avatar)}" alt="">` : `<span class="account-avatar-initial">${platform==='tiktok'?'TT':'TW'}</span>`}</span>
        <span class="dot"></span><b>${platform === 'twitch' ? 'Twitch' : 'TikTok'}</b><span>${esc(name)}</span>
      </div>`;
    }).join('');
  }

  function activateNav() {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.page === page));
    $('pageKicker').textContent = pageMeta[page]?.[0] || 'STREAMFUSION';
    $('pageTitle').textContent = pageMeta[page]?.[1] || page;
  }

  function connectedAccountAvatarUrl(platform, account = {}) {
    return isUsableViewerAvatar(account.avatarUrl) ? account.avatarUrl : '';
  }

  function previewAvatarUrl(item = {}) {
    const seed = normalizeUsername(item.uniqueId || item.username || item.displayName || 'preview-user') || 'preview-user';
    return `https://api.dicebear.com/10.x/notionists/svg?seed=${encodeURIComponent(seed)}`;
  }

  function normalizeUsername(value) {
    return String(value || '').trim().replace(/^@+/, '').replace(/^#+/, '').split(/[/?#]/)[0];
  }

  function avatarIdentity(item = {}) {
    return normalizeUsername(item.uniqueId || item.username || item.user || item.displayName || 'user');
  }

  function avatarKey(platform, username) { return `${String(platform||'').toLowerCase()}:${normalizeUsername(username).toLowerCase()}`; }


  function isUsableViewerAvatar(value) {
    const src = String(value || '').trim();
    if (!src) return false;
    if (/coin-logo\.png/i.test(src)) return false;
    return /^https?:\/\//i.test(src);
  }

  async function resolveAvatar(platform, username) {
    const clean = normalizeUsername(username);
    if (!clean) return '';
    const key = avatarKey(platform, clean);
    if (state.avatarCache.has(key)) return state.avatarCache.get(key);
    if (state.avatarPending.has(key)) return state.avatarPending.get(key);
    const promise = api(`/api/avatar?platform=${encodeURIComponent(platform)}&username=${encodeURIComponent(clean)}`)
      .then(d => isUsableViewerAvatar(d.avatarUrl) ? d.avatarUrl : '')
      .catch(() => '')
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
        if (img.isConnected && url) img.src = url;
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
    if (!state.activity[p][key]) state.activity[p][key] = { joined:false, like:false, shared:false, gift:false, giftImage:'', giftName:'' };
    return state.activity[p][key];
  }
  function profileKey(item) { return normalizeUsername(item.username || item.uniqueId || item.displayName || item.user || 'user').toLowerCase(); }
  function recordActivity(item) {
    const p = String(item.platform || 'tiktok').toLowerCase(); const key = profileKey(item); const type = String(item.type || item.event || '').toLowerCase();
    const a = activityStore(p, key);
    if (type.includes('join') || type === 'member') a.joined = true;
    if (type.includes('like') || type === 'heartme') a.like = true;
    if (type.includes('share')) a.shared = true;
    if (type.includes('gift') || Boolean(item.gift || item.giftName)) {
      const giftObj = item.gift && typeof item.gift === 'object' ? item.gift : null;
      a.gift = true;
      const nextGiftImage = item.giftImage || giftObj?.image || giftObj?.url || giftObj?.imageUrl || '';
      const nextGiftName = (typeof item.gift === 'string' ? item.gift : '') || item.giftName || giftObj?.name || giftObj?.title || '';
      if (nextGiftImage) a.giftImage = nextGiftImage;
      if (nextGiftName) a.giftName = nextGiftName;
      state.supporters[p][key] = { displayName:item.displayName || item.username || key, at:Date.now() };
    }
  }
  function giftBadgeMarkup(item) {
    const giftName = item.gift || item.giftName || 'Regalo';
    const giftImage = item.giftImage || item.gift?.image || '';
    const emoji = item.giftEmoji || item.emoji || '🎁';
    return `<span class="activity-badge gift-user-badge" title="${esc(giftName)}">${giftImage ? `<img src="${esc(giftImage)}" alt="">` : esc(emoji)}</span>`;
  }

  function activityBadgeMarkup(item) {
    const a = activityStore(item.platform, profileKey(item)); const badges=[];
    if (a.like && settings.personalization.highlightLikes !== false) badges.push('<span class="activity-badge" title="Like">❤️</span>');
    if (a.joined && settings.personalization.highlightJoins !== false) badges.push('<span class="activity-badge" title="Se unió al directo">👻</span>');
    if (a.shared && settings.personalization.highlightShares !== false) badges.push('<span class="activity-badge" title="Compartió">🗣️</span>');
    if (a.gift && settings.personalization.highlightGifts !== false) {
      badges.push('<span class="activity-badge gift-activity gift-base-badge" title="Envió regalo">🎁</span>');
      if (a.giftImage) badges.push(`<span class="activity-badge gift-activity gift-last-badge" title="${esc(a.giftName || 'Último regalo')}"><img src="${esc(a.giftImage)}" alt=""></span>`);
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
    const giftObj = item.gift && typeof item.gift === 'object' ? item.gift : null;
    const image = item.giftImage || giftObj?.image || giftObj?.url || giftObj?.imageUrl || '';
    const name = (typeof item.gift === 'string' ? item.gift : '') || item.giftName || giftObj?.name || giftObj?.title || 'Regalo';
    if (!image && !name) return '';
    const amount = item.amount == null || item.amount === '' ? 1 : item.amount;
    return `<div class="gift-media gift-media-real">${image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(name)}</span><strong>×${esc(amount)}</strong></div>`;
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
    const avatar = item.preview === true ? previewAvatarUrl(item) : (isUsableViewerAvatar(item.avatar) ? item.avatar : '');
    const isGift = kind === 'gift' || eventVisibilityKey(item) === 'gifts' || Boolean(item.gift || item.giftName);
    const showTime = p.showTimestamps !== false;
    const showPlatform = p.showPlatformPill !== false;
    const theme = p.chatTheme || 'cloud';
    const animation = p.animation || 'slide';
    const avatarHtml = avatar
      ? `<img src="${esc(avatar)}" alt="${esc(userName)}" loading="lazy">`
      : (item.preview === true
        ? `<img src="${esc(previewAvatarUrl(item))}" alt="${esc(userName)}" loading="lazy">`
        : `<img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(identity)}" src="" alt="${esc(userName)}" loading="lazy">`);
    const messageHtml = isGift ? giftMedia(item) : (body ? esc(body) : '');
    return `<article class="stream-row ${kind} ${platform} ${isGift ? 'gift-row' : ''} chat-theme-${theme} chat-anim-${animation} ${isSupporter(item) ? 'supporter-gold' : ''} ${p.chatAdjustMessages !== false ? 'chat-adjust' : 'chat-no-adjust'}" style="${styleVars(item)}">
      <div class="chat-avatar ${frameClass(item)} size-${p.avatarSize || 'md'}">${avatarHtml}</div>
      <div class="row-body">
        <div class="row-top">
          <strong class="name-size-${p.nameSize || 'md'} weight-${p.nameWeight || '800'}">${esc(userName)}</strong>
          ${badgeMarkup(item)}${p.showActivity !== false ? activityBadgeMarkup(item) : ''}
          ${showPlatform ? `<span class="platform-pill ${platform}">${platform === 'twitch' ? 'TW' : 'TT'}</span>` : ''}
          ${showTime ? `<time>${time}</time>` : ''}
        </div>
        ${messageHtml ? `<div class="row-message ${bubbleClass(item)} ${isGift ? 'gift-message-bubble' : ''}">${messageHtml}</div>` : ''}
      </div>
    </article>`;
  }

  function activityKind(item) {
    const type = String(item?.type || item?.event || '').toLowerCase();
    return (type.includes('gift') || Boolean(item?.gift || item?.giftName)) ? 'gift' : 'event';
  }
  function streamActivityRow(item, kind='event') {
    const p=settings.personalization||{};
    const platform=String(item.platform||'tiktok').toLowerCase();
    const userName=item.displayName||item.username||item.uniqueId||item.user||'Usuario';
    const identity=avatarIdentity(item);
    const avatar=isUsableViewerAvatar(item.avatar)?item.avatar:'';
    const avatarHtml=avatar ? `<img src="${esc(avatar)}" alt="${esc(userName)}" loading="lazy">` : `<img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(identity)}" src="" alt="${esc(userName)}" loading="lazy">`;
    const isGift=kind==='gift';
    const typeLabel=String(item.action||item.type|| (isGift?'Regalo':'Evento')).toUpperCase();
    const rawText=item.message||item.action||'';
    const cleanText=stripEmojis(rawText)||rawText;
    const highlight=isGift?(p.giftHighlightStyle||'gold'):(p.overlayEventHighlightStyle||'platform');
    const accent=highlight==='gold'?'#f5d063':highlight==='accent'?'#9d7dff':highlight==='platform'?(platform==='twitch'?'#9146ff':'#fe2c55'):'transparent';
    const font=p.overlayEventFont==='poppins'?'Poppins,sans-serif':p.overlayEventFont==='oswald'?'Oswald,sans-serif':'Inter,Manrope,sans-serif';
    const side=isGift?(p.giftsOverlayCardSide||'center'):(p.eventsOverlayCardSide||'center');
    const layout=isGift?(p.giftsLayout||'vertical'):(p.eventsLayout||'vertical');
    const direction=isGift?(p.giftsDirection||'down'):(p.eventsDirection||'down');
    const mode=isGift?(p.giftsMode||'slide'):(p.eventsMode||'slide');
    const size=isGift?(p.giftsPanelSize||'normal'):(p.eventsPanelSize||'normal');
    const shape=isGift?(p.giftsOverlayShape||'normal'):(p.eventsOverlayShape||'normal');
    const frame=isGift?(p.giftsCardFrame!==false):(p.eventsCardFrame!==false);
    let icon='';
    let body='';
    if(isGift){
      const giftObj=item.gift&&typeof item.gift==='object'?item.gift:null;
      const giftImage=item.giftImage||giftObj?.image||giftObj?.url||giftObj?.imageUrl||'';
      const giftName=(typeof item.gift==='string'?item.gift:'')||item.giftName||giftObj?.name||giftObj?.title||'Regalo';
      const amount=item.amount==null||item.amount===''?1:item.amount;
      const display=p.overlayGiftDisplayMode||'full';
      const imageSize=p.overlayGiftImageSize||'md';
      const nameColor=p.overlayNameColorMode==='custom'?(p.overlayNameColor||'#fff'):(platform==='twitch'?'#c7a2ff':'#ff7396');
      const amountStyle=p.giftAmountStyle==='muted'?'muted':p.giftAmountStyle==='bold'?'bold':'accent';
      const imageHtml=giftImage?`<img class="gift-real-image size-${esc(imageSize)}" src="${esc(giftImage)}" alt="${esc(giftName)}" loading="lazy" onerror="this.remove()">`:'<span class="gift-real-fallback">🎁</span>';
      const giftText=`<strong class="gift-real-name" style="color:${esc(nameColor)}">${esc(giftName)}</strong><b class="gift-real-amount ${amountStyle}">×${esc(amount)}</b>`;
      if(display==='image') body=`<div class="gift-stream-content composition-${esc(p.overlayGiftCompositionMode||'vertical-centered')}">${imageHtml}</div>`;
      else if(display==='text') body=`<div class="gift-stream-content composition-${esc(p.overlayGiftCompositionMode||'vertical-centered')}">${giftText}</div>`;
      else body=`<div class="gift-stream-content composition-${esc(p.overlayGiftCompositionMode||'vertical-centered')}">${imageHtml}${giftText}</div>`;
      icon='🎁';
    } else {
      icon=esc(item.emoji||typeEmojiForDashboard(item));
      body=`<span>${esc(cleanText)}</span>`;
    }
    const showUser=isGift ? true : p.highlightEventUsername!==false;
    return `<article class="activity-preview activity-real ${isGift?'stage-gifts':'stage-events'} ${isGift?'gift':'event'}-${esc(highlight)} ${isGift?'gift':'event'}-layout-${esc(layout)} ${isGift?'gift':'event'}-direction-${esc(direction)} ${isGift?'gift':'event'}-mode-${esc(mode)} ${isGift?'gift':'event'}-size-${esc(size)} ${isGift?'gift':'event'}-shape-${esc(shape)} ${isGift?'gift':'event'}-side-${esc(side)} ${frame?'':'no-frame'}" style="--activity-accent:${accent};font-family:${font}">
      <div class="activity-user-avatar ${frameClass(item)} size-${p.avatarSize||'md'}">${avatarHtml}</div>
      <div class="activity-icon">${isGift?'<span>🎁</span>':icon}</div>
      <div class="activity-copy"><small>${esc(typeLabel)}</small>${showUser?`<strong>${esc(userName)}</strong>`:''}${body}</div>
      <span class="activity-platform ${platform}">${platform==='twitch'?'TW':'TT'}</span>
    </article>`;
  }
  function typeEmojiForDashboard(item){
    const key=eventVisibilityKey(item);
    return ({likes:'❤️',follows:'➕',joins:'👻',shares:'🗣️',subscriptions:'⭐',bits:'💎',raids:'🚀',hosts:'📣',gifts:'🎁',system:'•'})[key]||'•';
  }
  function renderActivityItem(item){
    const kind=activityKind(item);
    const style=kind==='gift' ? (settings.personalization?.giftStyle||'chat') : (settings.personalization?.eventStyle||'chat');
    return style==='stream' ? streamActivityRow(item,kind) : messageRow(item,kind);
  }
  function eventVisibilityKey(item) {
    const type = String(item?.type || item?.event || '').toLowerCase();
    if (type.includes('like') || type === 'heartme') return 'likes';
    if (type.includes('follow') || type === 'follow') return 'follows';
    if (type.includes('join') || type === 'member') return 'joins';
    if (type.includes('share')) return 'shares';
    if (type === 'sub' || type.includes('subscription')) return 'subscriptions';
    if (type === 'bits' || item?.bits) return 'bits';
    if (type === 'raid' || type.includes('raid')) return 'raids';
    if (type === 'host' || type.includes('host')) return 'hosts';
    if (type.includes('gift') || item?.gift || item?.giftName) return 'gifts';
    return 'system';
  }
  function visibleActivity(item) {
    return (settings.personalization?.eventVisibility?.[eventVisibilityKey(item)] ?? true) !== false;
  }
  function activityFilterPass(item) {
    const selected = settings.filters.activity || 'all';
    return selected === 'all' || String(item.platform || '').toLowerCase() === selected;
  }
  function unifiedActivityItems() {
    return [...state.events, ...state.gifts]
      .filter(visibleActivity).filter(activityFilterPass)
      .sort((a,b)=>Number(a.timestamp||0)-Number(b.timestamp||0)).slice(-200);
  }
  function visibleChatItems() {
    const selectedFilter=settings.filters.chat||'all';
    const autoClear=settings.personalization?.autoClearChat===true;
    const cutoff=Date.now()-Math.max(5,Number(settings.personalization?.clearChatSeconds||30))*1000;
    return state.chat.slice(-300).filter(item=>(!autoClear||!item.timestamp||Number(item.timestamp)>=cutoff) && (selectedFilter==='all'||String(item.platform||'').toLowerCase()===selectedFilter));
  }
  function eventFingerprint(item, kind='event') {
    const platform=String(item?.platform||'').toLowerCase();
    const user=normalizeUsername(item?.uniqueId||item?.username||item?.user||item?.displayName||'user').toLowerCase();
    const type=String(item?.type||item?.event||kind).toLowerCase();
    const text=String(item?.message||item?.action||item?.giftName||item?.gift||'').trim().toLowerCase();
    const gift=String(item?.giftId||item?.gift?.id||item?.stickerId||'').toLowerCase();
    const sourceId=String(item?.messageId||item?.commentId||item?.eventId||item?.msgId||'').trim().toLowerCase();
    const ts=Number(item?.timestamp||0); const bucket=ts?Math.floor(ts/1200):0;
    return sourceId?`${kind}|${platform}|${sourceId}`:`${kind}|${platform}|${user}|${type}|${text}|${gift}|${bucket}`;
  }
  function updateDashboardFeeds() {
    if(page!=='dashboard') return;
    const chatBox=$('dashChat'), activityBox=$('dashActivity');
    if(!chatBox||!activityBox){ renderDashboard(true); return; }
    const chat=visibleChatItems(), activity=unifiedActivityItems();
    const chatSignature=chat.map(x=>eventFingerprint(x,'chat')).join('|');
    const activitySignature=activity.map(x=>eventFingerprint(x,'activity')).join('|');
    if(chatBox.dataset.signature!==chatSignature){
      const atBottom=chatBox.scrollHeight-chatBox.scrollTop-chatBox.clientHeight<48;
      chatBox.innerHTML=chat.length?chat.map(x=>messageRow(x)).join(''):'<div class="empty">No hay comentarios para este filtro todavía.</div>';
      chatBox.dataset.signature=chatSignature; queueAvatarImages(chatBox);
      if(atBottom) requestAnimationFrame(()=>chatBox.scrollTop=chatBox.scrollHeight);
    }
    if(activityBox.dataset.signature!==activitySignature){
      const atBottom=activityBox.scrollHeight-activityBox.scrollTop-activityBox.clientHeight<48;
      activityBox.innerHTML=activity.length?activity.slice().reverse().map(renderActivityItem).join(''):'<div class="empty">Aún no hay actividad.</div>';
      activityBox.dataset.signature=activitySignature; queueAvatarImages(activityBox);
      if(atBottom) requestAnimationFrame(()=>activityBox.scrollTop=activityBox.scrollHeight);
    }
  }
  function updateDashboardConnectionStatus() {
    if (page !== 'dashboard') return;
    const status = channelConnectionSummary();
    const root = document.querySelector('.dashboard-connection-status');
    if (!root) return;
    root.className = `dashboard-connection-status ${status.dot}`;
    const strong = root.querySelector('strong');
    if (strong) strong.textContent = status.label;
  }

  function renderDashboard(force=false) {
    if(dashboardClearTimer){clearInterval(dashboardClearTimer);dashboardClearTimer=null;}
    if(!force && $('dashChat') && $('dashActivity')){updateDashboardFeeds();return;}
    const chat=visibleChatItems(), activity=unifiedActivityItems();
    const status=channelConnectionSummary();
    $('view').innerHTML=`<div class="hero"><div><div class="dashboard-connection-status ${status.dot}"><span class="status-dot"></span><strong>${esc(status.label)}</strong><span class="status-glitch" aria-hidden="true"></span></div><h2>Todo lo que pasa en tu live,<br><em>en un solo lugar.</em></h2><p>Tu conexión permanece activa aunque cambies de sección o abras otras pestañas. El chat, eventos y regalos siguen entrando en segundo plano.</p></div></div>
      <div class="dashboard-grid"><section class="card feed"><header><div><p class="eyebrow">EN VIVO</p><h3>Chat unificado</h3></div><div class="header-actions"><select id="dashChatFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></div></header><div id="dashChat" class="chat-feed">${chat.length?chat.map(x=>messageRow(x)).join(''):'<div class="empty">No hay comentarios para este filtro todavía.</div>'}</div></section>
      <section class="card activity activity-panel"><header><div><p class="eyebrow">ACTIVIDAD</p><h3>Eventos & regalos</h3></div><div class="activity-toolbar"><select id="dashActivityFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select><button id="dashActivitySettings" class="icon-btn" type="button" title="Ajustes de actividad">⚙</button></div></header><div id="dashActivity" class="event-feed">${activity.length?activity.slice().reverse().map(renderActivityItem).join(''):'<div class="empty">Aún no hay actividad.</div>'}</div><div id="dashActivityPopup" class="activity-settings-layer" hidden><div class="activity-settings-backdrop" data-close-activity-settings></div><div class="activity-settings-popover" role="dialog" aria-modal="true"><div class="popover-head"><div><p class="eyebrow">AJUSTES DE ACTIVIDAD</p><strong>Qué se mostrará</strong></div><button id="closeActivitySettings" class="mini-close" type="button" aria-label="Cerrar">×</button></div><p class="muted popover-description">Activa o desactiva cada tipo de actividad.</p><div class="activity-settings-grid">${['likes','bits','follows','joins','shares','subscriptions','raids','hosts','gifts','system'].map(k=>`<label><input type="checkbox" data-activity-visibility="${k}" ${(settings.personalization?.eventVisibility?.[k]??true)!==false?'checked':''}><span>${({likes:'Like',bits:'Bits',follows:'Seguidores',joins:'Se unió al directo',shares:'Compartió',subscriptions:'Suscripciones',raids:'Raids',hosts:'Hosts',gifts:'Envió regalo',system:'Otros eventos'})[k]}</span><em>${({likes:'❤️',bits:'💎',follows:'➕',joins:'👻',shares:'🗣️',subscriptions:'⭐',raids:'🚀',hosts:'📣',gifts:'🎁',system:'•'})[k]}</em></label>`).join('')}</div></div></div></section></div>`;
    const cf=$('dashChatFilter');cf.value=settings.filters.chat||'all';cf.onchange=()=>{settings.filters.chat=cf.value;renderDashboard(true);};
    const af=$('dashActivityFilter');af.value=settings.filters.activity||'all';af.onchange=()=>{settings.filters.activity=af.value;updateDashboardFeeds();};
    const popup=$('dashActivityPopup'); const toggleActivitySettings=(open)=>{if(!popup)return;popup.hidden=!open;document.body.classList.toggle('activity-settings-open',open);};
    $('dashActivitySettings')?.addEventListener('click',()=>toggleActivitySettings(popup.hidden)); $('closeActivitySettings')?.addEventListener('click',()=>toggleActivitySettings(false)); popup?.querySelector('[data-close-activity-settings]')?.addEventListener('click',()=>toggleActivitySettings(false));
    popup?.querySelectorAll('[data-activity-visibility]').forEach(input=>input.addEventListener('change',async()=>{const key=input.dataset.activityVisibility;settings.personalization.eventVisibility=settings.personalization.eventVisibility||{};settings.personalization.eventVisibility[key]=input.checked;try{await persistSettingsPatch({personalization:settings.personalization},false);}catch(e){toast('No se guardó',e.message,'err');}updateDashboardFeeds();}));
    const chatBox=$('dashChat'), activityBox=$('dashActivity'); chatBox.dataset.signature=chat.map(x=>eventFingerprint(x,'chat')).join('|'); activityBox.dataset.signature=activity.map(x=>eventFingerprint(x,'activity')).join('|'); queueAvatarImages(); requestAnimationFrame(()=>{chatBox.scrollTop=chatBox.scrollHeight;});
    if(settings.personalization?.autoClearChat===true) dashboardClearTimer=setInterval(updateDashboardFeeds,1000);
  }

  function invalidatePlatformSession(platform){
    const key=String(platform||'').toLowerCase();
    if(!state.accounts[key]) state.accounts[key]={};
    state.accounts[key]={...state.accounts[key],connected:false,live:false,mode:'saved',connectionId:''};
    renderTop();
    updateDashboardConnectionStatus();
  }

  function renderConnections() {
    const card = (platform, label, placeholder) => {
      const a=state.accounts[platform]||{};
      const accountAvatar = platform === 'tiktok' && a.connected ? previewAvatarUrl({uniqueId:a.username||'tiktok-account'}) : (platform === 'twitch' && a.connected ? connectedAccountAvatarUrl(platform, a) : '');
      return `<article class="card connection-card"><div class="connection-top"><span class="connection-avatar">${a.connected && accountAvatar ? `<img src="${esc(accountAvatar)}" alt="">` : `<span class="account-avatar-initial large">${platform==='tiktok'?'TT':'TW'}</span>`}</span><div><p class="eyebrow">${label.toUpperCase()}</p><h3>${esc(a.username || 'Sin conectar')}</h3><span class="status ${a.connected?'on':''}"><i></i>${a.connected?(a.live?'En directo':'Conectado'):'Desconectado'}</span></div></div><label>Cuenta<input id="${platform}Input" value="${esc(a.username||'')}" placeholder="${placeholder}"></label><div class="row"><button class="btn primary" id="${platform}Connect">Conectar</button><button class="btn secondary" id="${platform}Disconnect">Desconectar</button></div><p class="muted">La foto de TikTok aquí es solo decorativa. El chat, eventos y regalos reales usan exclusivamente el avatar real entregado por la plataforma.</p></article>`;
    };
    $('view').innerHTML=`<div class="intro"><h2>Conecta tus canales</h2><p>La conexión es compartida por el sistema; el chat, eventos y overlays utilizan la misma fuente de eventos, pero conservan diseños independientes.</p></div><div class="connection-grid">${card('tiktok','TikTok','@usuario')}${card('twitch','Twitch','canal')}</div><div class="notice">El avatar mostrado aquí se resuelve desde la plataforma cuando está disponible. La foto también se reutiliza en la barra superior y en los mensajes del dashboard.</div>`;
    $('tiktokConnect').onclick=()=>{invalidatePlatformSession('tiktok');socket?.emit('connectTikTok',$('tiktokInput').value);};
    $('tiktokDisconnect').onclick=()=>{invalidatePlatformSession('tiktok');socket?.emit('disconnectTikTok');};
    $('twitchConnect').onclick=()=>{invalidatePlatformSession('twitch');socket?.emit('connectTwitch',$('twitchInput').value);};
    $('twitchDisconnect').onclick=()=>{invalidatePlatformSession('twitch');socket?.emit('disconnectTwitch');};
  }

  const ctl = (label,id,type,value,opts='') => type==='check'
    ? `<label class="toggle"><input id="${id}" type="checkbox" ${value?'checked':''}><span>${label}</span></label>`
    : `<label>${label}<${type==='select'?'select':'input'} id="${id}" class="select" ${type==='input' ? `type="${typeof value === 'number' ? 'number' : /^#[0-9a-f]{6}$/i.test(String(value)) ? 'color' : 'text'}" value="${esc(value ?? '')}"` : ''}>${type==='select'?opts:''}</${type==='select'?'select':'input'}></label>`;
  const setSelect = (id, value) => { const el=$(id); if(el && el.tagName==='SELECT') el.value=String(value ?? ''); };
  const setCheck = (id, value) => { const el=$(id); if(el && el.type==='checkbox') el.checked=Boolean(value); };


  function previewSeed() {
    if (!state.previewChat.length) {
      state.previewChat = [
        {preview:true,platform:'tiktok',displayName:'LunaByte',username:'lunabyte',uniqueId:'lunabyte',badges:['verified'],message:'¡Se ve genial este diseño!'},
        {preview:true,platform:'twitch',displayName:'MauroLive',username:'maurolive',uniqueId:'maurolive',badges:['subscriber'],message:'Saludos desde Twitch 👋'},
        {preview:true,platform:'tiktok',displayName:'Sofi_gg',username:'sofi_gg',uniqueId:'sofi_gg',message:'¿Podemos probar otra fuente?'}
      ];
    }
    return state.previewChat;
  }

  function chatPreviewHtml() {
    return previewSeed().map(x=>messageRow(x)).join('');
  }

  let customizePreviewSignature = '';
  function renderCustomizePreviewOnly({force=false}={}) {
    const box=$('liveCustomizePreview'); if(!box) return;
    const p=settings.personalization||{};
    let html='';
    let className='live-custom-preview activity-preview-stage';
    if (activeCustomizeTab==='chat') {
      html=chatPreviewHtml();
      className=`live-custom-preview chat-preview-stage layout-${p.chatLayout || 'vertical'} direction-${p.chatDirection || 'down'}`;
    } else {
      html=previewActivityCard(activeCustomizeTab);
    }
    const signature=[activeCustomizeTab,JSON.stringify(p),state.previewEventIndex,state.previewGiftIndex,state.previewChat.length,state.previewEvents.length,state.previewGifts.length].join('|');
    if(!force && signature===customizePreviewSignature) return;
    const scrollTop=box.scrollTop;
    box.className=className+' preview-no-flash';
    box.dataset.theme=p.chatTheme||'cloud';
    const frag=document.createRange().createContextualFragment(html);
    box.replaceChildren(frag);
    customizePreviewSignature=signature;
    queueAvatarImages(box);
    requestAnimationFrame(()=>{box.scrollTop=scrollTop;box.classList.remove('preview-no-flash');});
  }

  function simulatePreviewMessage() {
    const examples = [
      {preview:true,platform:'tiktok',displayName:'NubeStudio',username:'nubestudio',uniqueId:'nubestudio',message:'¡Llegué al live! 🔥'},
      {preview:true,platform:'twitch',displayName:'PixelMajo',username:'pixelmajo',uniqueId:'pixelmajo',badges:['vip'],message:'Ese overlay quedó buenísimo.'},
      {preview:true,platform:'tiktok',displayName:'RafaFPS',username:'rafafps',message:'Jajaja ese comentario 😂'},
      {preview:true,platform:'twitch',displayName:'KiraLive',username:'kiralive',message:'Se lee muy limpio así.'},
      {preview:true,platform:'tiktok',displayName:'DaniGG',username:'danigg',message:'Probando mensaje simulado ✨'}
    ];
    const next = examples[state.previewChat.length % examples.length];
    state.previewChat.push({...next,timestamp:Date.now()});
    if (state.previewChat.length > 24) state.previewChat.shift();
    renderCustomizePreviewOnly();
  }

  let activeCustomizeSection = 'appearance';

  const customizeFields = {
    eStyle:['personalization','eventStyle'], eSimulation:['personalization','eventSimulationMode'], gStyle:['personalization','giftStyle'], gSimulation:['personalization','giftSimulationMode'],
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
      if(path[1]==='eventStyle' || path[1]==='giftStyle' || path[1]==='eventSimulationMode' || path[1]==='giftSimulationMode'){
        try { localStorage.setItem('sf.customize.modes.v1', JSON.stringify({eventStyle:settings.personalization.eventStyle,giftStyle:settings.personalization.giftStyle,eventSimulationMode:settings.personalization.eventSimulationMode||'single',giftSimulationMode:settings.personalization.giftSimulationMode||'single'})); } catch {}
      }
      renderCustomizePreviewOnly({force:true});
      await persistSettingsPatch(patch, false);
      if (page === 'dashboard') renderDashboard();
    }));
  }

  function customizeSubNav(category) {
    const sections = category === 'chat'
      ? [['appearance','Apariencia'],['identity','Avatares y nombres'],['message','Mensajes'],['info','Información']]
      : category === 'events'
        ? [['appearance','Apariencia'],['layout','Orden y posición'],['content','Contenido'],['highlight','Resaltado']]
        : [['appearance','Apariencia'],['layout','Orden y posición'],['gift','Regalo'],['text','Texto'],['highlight','Resaltado']];
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
    if (activeCustomizeSection==='appearance') return `<div class="custom-control-grid">
      ${ctl('Estilo','eStyle','select',p.eventStyle||'chat','<option value="chat">Chat</option><option value="stream">Stream</option>')}
      ${ctl('Simulación','eSimulation','select',p.eventSimulationMode||'single','<option value="single">1 evento por usuario</option><option value="all">Todos los eventos</option>')}
    </div>`;
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
    if (activeCustomizeSection==='appearance') return `<div class="custom-control-grid">
      ${ctl('Estilo','gStyle','select',p.giftStyle||'chat','<option value="chat">Chat</option><option value="stream">Stream</option>')}
      ${ctl('Simulación','gSimulation','select',p.giftSimulationMode||'single','<option value="single">1 regalo por usuario</option><option value="all">Todos los regalos</option>')}
    </div>`;
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
      const simulationMode=p.eventSimulationMode||'single';
      const selected=state.previewEvents.length ? state.previewEvents : [available[state.previewEventIndex%available.length]];
      const list=simulationMode==='all' ? selected.filter(x=>visibility[x.key]!==false) : [selected[selected.length-1] || available[0]];
      if ((p.eventStyle||'chat')==='chat') {
        const cards=list.map(sample=>{
          const row=messageRow({preview:true,platform:sample.platform,displayName:sample.user,username:sample.user,uniqueId:sample.user,message:sample.text,action:sample.type,emoji:sample.icon,timestamp:Date.now()},'event');
          return `<div class="preview-activity-chat-item event-layout-${esc(p.eventsLayout||'vertical')} event-direction-${esc(p.eventsDirection||'down')} event-mode-${esc(p.eventsMode||'slide')} event-size-${esc(p.eventsPanelSize||'normal')} event-shape-${esc(p.eventsOverlayShape||'normal')} event-side-${esc(p.eventsOverlayCardSide||'center')} ${p.eventsCardFrame===false?'no-frame':''}">${row}</div>`;
        }).join('');
        return `<div class="preview-chat-stack ${simulationMode==='all'?'simulation-all':''}">${cards}</div>`;
      }
      return list.map(sample=>{
        const mode=p.eventsMode||'slide'; const size=p.eventsPanelSize||'normal'; const shape=p.eventsOverlayShape||'normal';
        const highlight=p.overlayEventHighlightStyle||'platform';
        const accent=highlight==='gold'?'#f5d063':highlight==='accent'?'#9d7dff':sample.platform==='twitch'?'#9146ff':'#fe2c55';
        const userName=p.highlightEventUsername===false?'Usuario':sample.user;
        return `<div class="activity-preview stage-events event-highlight-${esc(highlight)} event-layout-${esc(p.eventsLayout||'vertical')} event-direction-${esc(p.eventsDirection||'down')} event-mode-${esc(mode)} event-size-${esc(size)} event-shape-${esc(shape)} event-side-${esc(p.eventsOverlayCardSide||'center')} ${p.eventsCardFrame===false?'no-frame':''}" style="--activity-accent:${accent};font-family:${p.overlayEventFont==='poppins'?'Poppins,sans-serif':p.overlayEventFont==='oswald'?'Oswald,sans-serif':'Inter,Manrope,sans-serif'}"><div class="activity-icon">${sample.icon}</div><div class="activity-copy"><small>${esc(sample.type.toUpperCase())}</small><strong>${esc(userName)}</strong><span>${esc(sample.text)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
      }).join('');
    }
    const samples=[
      {platform:'twitch',user:'MauroLive',gift:'Rosa',amount:5},
      {platform:'tiktok',user:'LunaByte',gift:'Perfume',amount:2},
      {platform:'twitch',user:'PixelMajo',gift:'Corazón',amount:12}
    ];
    const simulationMode=p.giftSimulationMode||'single';
    const selected=state.previewGifts.length ? state.previewGifts : [samples[state.previewGiftIndex%samples.length]];
    const list=simulationMode==='all' ? selected : [selected[selected.length-1] || samples[0]];
    if((p.giftStyle||'chat')==='chat'){
      return `<div class="preview-chat-stack ${simulationMode==='all'?'simulation-all':''}">${list.map(sample=>`<div class="preview-activity-chat-item gift-layout-${esc(p.giftsLayout||'vertical')} gift-direction-${esc(p.giftsDirection||'down')} gift-mode-${esc(p.giftsMode||'slide')} gift-size-${esc(p.giftsPanelSize||'normal')} gift-shape-${esc(p.giftsOverlayShape||'normal')} gift-side-${esc(p.giftsOverlayCardSide||'center')} ${p.giftsCardFrame===false?'no-frame':''}">${messageRow({preview:true,platform:sample.platform,displayName:sample.user,username:sample.user,uniqueId:sample.user,gift:sample.gift,giftName:sample.gift,amount:sample.amount,message:`${sample.gift} ×${sample.amount}`,timestamp:Date.now()},'gift')}</div>`).join('')}</div>`;
    }
    return list.map(sample=>{
      const size=p.overlayGiftImageSize||'md';
      const display=p.overlayGiftDisplayMode||'full';
      const nameColor=p.overlayNameColorMode==='custom'?(p.overlayNameColor||'#ffffff'):(sample.platform==='twitch'?'#c7a2ff':'#fe6f92');
      const title=display==='image'?sample.gift:display==='text'?sample.gift:`${sample.gift}${p.giftAmountStyle==='muted'?'':` ×${sample.amount}`}`;
      const frame=p.giftsCardFrame===false?'no-frame':'';
      const highlight=p.giftHighlightStyle||'gold';
      const accent=highlight==='gold'?'#f5d063':highlight==='platform'?(sample.platform==='twitch'?'#9146ff':'#fe2c55'):highlight==='accent'?'#9d7dff':'transparent';
      const showActivity=p.showGifts!==false;
      return `<div class="activity-preview stage-gifts gift-highlight-${esc(highlight)} gift-layout-${p.giftsLayout||'vertical'} gift-direction-${p.giftsDirection||'down'} gift-mode-${p.giftsMode||'slide'} gift-size-${p.giftsPanelSize||'normal'} gift-shape-${p.giftsOverlayShape||'normal'} gift-side-${p.giftsOverlayCardSide||'center'} ${frame}" style="--activity-accent:${accent};"><div class="gift-preview-media size-${size} ${display==='text'?'hide-image':''} ${display==='image'?'only-image':''}"><span>🎁</span></div><div class="activity-copy"><small>REGALO</small>${showActivity?`<strong style="color:${esc(nameColor)}">${esc(sample.user)}</strong>`:'<strong>Regalo recibido</strong>'}<span class="gift-title">${esc(title)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
    }).join('');
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
    const p=settings.personalization||{};
    if (activeCustomizeTab==='events') {
      const samples=[
        {key:'follows',platform:'tiktok',user:'LunaByte',icon:'♡',type:'follow',text:'comenzó a seguirte'},
        {key:'likes',platform:'twitch',user:'MauroLive',icon:'♥',type:'like',text:'dio 1.2K likes'},
        {key:'shares',platform:'tiktok',user:'SofiGG',icon:'↗',type:'share',text:'compartió tu directo'},
        {key:'joins',platform:'twitch',user:'PixelMajo',icon:'＋',type:'join',text:'se unió al directo'}
      ];
      const available=samples.filter(x=>(p.eventVisibility?.[x.key]??true)!==false);
      if(!available.length)return;
      const next=available[state.previewEventIndex%available.length];
      state.previewEventIndex=(state.previewEventIndex+1)%available.length;
      if((p.eventSimulationMode||'single')==='all'){state.previewEvents.push(next);if(state.previewEvents.length>8)state.previewEvents.shift();}
      else state.previewEvents=[next];
    }
    if (activeCustomizeTab==='gifts') {
      const samples=[
        {platform:'twitch',user:'MauroLive',gift:'Rosa',amount:5},
        {platform:'tiktok',user:'LunaByte',gift:'Perfume',amount:2},
        {platform:'twitch',user:'PixelMajo',gift:'Corazón',amount:12}
      ];
      const next=samples[state.previewGiftIndex%samples.length];
      state.previewGiftIndex=(state.previewGiftIndex+1)%samples.length;
      if((p.giftSimulationMode||'single')==='all'){state.previewGifts.push(next);if(state.previewGifts.length>8)state.previewGifts.shift();}
      else state.previewGifts=[next];
    }
    renderCustomizePreviewOnly({force:true});
  }

  async function persistSettingsPatch(patch, redraw=true) {
    try {
      const result = await api('/api/user/settings',{method:'PUT',body:JSON.stringify(patch)});
      settings=merge(settings,result);
      if (patch?.personalization?.eventStyle || patch?.personalization?.giftStyle || patch?.personalization?.eventSimulationMode || patch?.personalization?.giftSimulationMode) {
        try { localStorage.setItem('sf.customize.modes.v1', JSON.stringify({eventStyle:settings.personalization.eventStyle,giftStyle:settings.personalization.giftStyle,eventSimulationMode:settings.personalization.eventSimulationMode||'single',giftSimulationMode:settings.personalization.giftSimulationMode||'single'})); } catch {}
      }
      applyAppearance(); if(redraw) render();
    } catch(e){ toast('No se guardó',e.message,'err'); }
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
    return `${location.origin}/${path}${join}owner=${encodeURIComponent(user.id)}&overlayKey=${encodeURIComponent(key)}&_v=${Date.now()}`;
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
  const ROULETTE_THEME_PRESETS=[
    {id:'crystal',name:'Crystal',desc:'Hielo brillante',accent:'#74c0fc',accent2:'#e7f5ff',accent3:'#c5f6fa',cardTheme:'ocean'},
    {id:'neon',name:'Neon',desc:'Glow moderno',accent:'#9b5cff',accent2:'#22d3ee',accent3:'#f472b6',cardTheme:'neon'},
    {id:'gold',name:'Gold',desc:'Sorteo premium',accent:'#d8b35a',accent2:'#f8e3a1',accent3:'#fff4c7',cardTheme:'gold'},
    {id:'galaxy',name:'Galaxy',desc:'Cósmico y oscuro',accent:'#8b5cf6',accent2:'#38bdf8',accent3:'#ec4899',cardTheme:'midnight'},
    {id:'fire',name:'Fire',desc:'Energía intensa',accent:'#ef4444',accent2:'#f97316',accent3:'#facc15',cardTheme:'sunset'},
    {id:'ocean',name:'Ocean',desc:'Azul limpio',accent:'#38bdf8',accent2:'#22d3ee',accent3:'#60a5fa',cardTheme:'ocean'},
    {id:'emerald',name:'Emerald',desc:'Verde vibrante',accent:'#10b981',accent2:'#34d399',accent3:'#a7f3d0',cardTheme:'emerald'},
    {id:'candy',name:'Candy',desc:'Colorido suave',accent:'#f472b6',accent2:'#a78bfa',accent3:'#67e8f9',cardTheme:'candy'},
    {id:'midnight',name:'Midnight',desc:'Oscuro profesional',accent:'#64748b',accent2:'#22d3ee',accent3:'#9b5cff',cardTheme:'midnight'}
  ];
  const ROULETTE_CARD_PRESETS=[
    {id:'midnight',name:'Midnight',desc:'Negro elegante',bg1:'#111827',bg2:'#0b1020',bg3:'#1f2937'},
    {id:'royal',name:'Royal',desc:'Azul premium',bg1:'#1d4ed8',bg2:'#0f172a',bg3:'#312e81'},
    {id:'sunset',name:'Sunset',desc:'Rojo y dorado',bg1:'#ef4444',bg2:'#f97316',bg3:'#7c2d12'},
    {id:'ocean',name:'Ocean',desc:'Azul marino',bg1:'#0ea5e9',bg2:'#075985',bg3:'#0f172a'},
    {id:'emerald',name:'Emerald',desc:'Verde intenso',bg1:'#10b981',bg2:'#064e3b',bg3:'#052e16'},
    {id:'candy',name:'Candy',desc:'Rosa y violeta',bg1:'#ec4899',bg2:'#8b5cf6',bg3:'#312e81'},
    {id:'gold',name:'Gold',desc:'Premium brillante',bg1:'#d8b35a',bg2:'#8a6a2f',bg3:'#3f2d14'},
    {id:'neon',name:'Neon',desc:'Fuerte y moderno',bg1:'#9b5cff',bg2:'#22d3ee',bg3:'#0f172a'}
  ];
  function defaultRoulettePreviewConfig(){return {mode:'baraja',enabled:true,audience:'all',platforms:{tiktok:true,twitch:true},participation:{entryMode:'comment',commentMode:'custom',commentText:'1',allowMultiple:false,maxEntriesPerUser:1,spamCooldownMs:2400},winnerComment:{enabled:true,waitSeconds:30},auto:{enabled:false,startWaitSeconds:60,restartWaitSeconds:180},theme:{preset:'midnight',accent:'#64748b',accent2:'#22d3ee',accent3:'#9b5cff',frame:'glass',background:'transparent',showGrid:false,cardTheme:'midnight'}};}
  function getRoulettePreviewConfig(){if(!roulettePreviewConfig){try{const raw=localStorage.getItem('sf.roulette.preview.v1');roulettePreviewConfig=merge(defaultRoulettePreviewConfig(),raw?JSON.parse(raw):{});}catch{roulettePreviewConfig=defaultRoulettePreviewConfig();}}return roulettePreviewConfig;}
  function saveRoulettePreviewConfig(){try{localStorage.setItem('sf.roulette.preview.v1',JSON.stringify(roulettePreviewConfig));}catch{}}
  function roulettePreviewPost(message){const payload={source:'streamfusion-roulette-preview',...message};const f=$('roulettePreviewFrame');if(!f?.contentWindow){roulettePreviewPending.push(payload);return;}if(!roulettePreviewReady){roulettePreviewPending.push(payload);return;}f.contentWindow.postMessage(payload,'*');}
  function flushRoulettePreviewQueue(){const f=$('roulettePreviewFrame');if(!f?.contentWindow)return;roulettePreviewReady=true;const q=roulettePreviewPending.splice(0);q.forEach(m=>{try{f.contentWindow.postMessage(m,'*');}catch{}});}
  function roulettePreviewThemeCard(p,c,active){return `<button type="button" class="roulette-theme-choice ${active?'active':''}" data-rpreview-theme="${esc(p.id)}" style="--theme-a:${esc(p.accent)};--theme-b:${esc(p.accent2)};--theme-c:${esc(p.accent3)}"><div><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div><div class="roulette-theme-swatches"><i></i><i></i><i></i></div></button>`;}
  function roulettePreviewDeckCard(p,c,active){return `<button type="button" class="roulette-deck-choice ${active?'active':''}" data-rpreview-deck="${esc(p.id)}" style="--deck-a:${esc(p.bg1)};--deck-b:${esc(p.bg2)};--deck-c:${esc(p.bg3)}"><div><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div><div class="roulette-deck-swatch"></div></button>`;}
  function roulettePreviewConfigControls(){
    const c=getRoulettePreviewConfig(),box=$('roulettePreviewControls');if(!box)return;let h='';
    if(roulettePreviewTab==='appearance'){
      const activePreset=String(c.theme?.preset||'midnight');
      const activeDeck=String(c.theme?.cardTheme||'midnight');
      h=`<div class="custom-hint"><strong>Apariencia de la ruleta</strong><span>Todos los cambios se aplican inmediatamente al mismo motor que usa el overlay.</span></div>
        <div class="roulette-preview-subtitle">Temas predeterminados</div><div class="roulette-theme-grid">${ROULETTE_THEME_PRESETS.map(p=>roulettePreviewThemeCard(p,c,p.id===activePreset)).join('')}</div>
        <div class="roulette-preview-subtitle">Temas de baraja</div><div class="roulette-deck-grid">${ROULETTE_CARD_PRESETS.map(p=>roulettePreviewDeckCard(p,c,p.id===activeDeck)).join('')}</div>
        <div class="custom-control-grid">${ctl('Marco','rFrame','select',c.theme.frame||'glass','<option value="glass">Cristal</option><option value="solid">Sólido</option>')}
        ${ctl('Fondo','rBg','select',c.theme.background||'transparent','<option value="transparent">Transparente</option><option value="dark">Oscuro</option><option value="midnight">Midnight</option><option value="green">Green screen</option><option value="soft-dark">Dark soft</option><option value="light">Blanco</option>')}
        ${ctl('Mostrar rejilla','rGrid','check',c.theme.showGrid!==false)}${ctl('Color principal','rAccent','input',c.theme.accent||'#64748b')}${ctl('Color secundario','rAccent2','input',c.theme.accent2||'#22d3ee')}${ctl('Color terciario','rAccent3','input',c.theme.accent3||'#9b5cff')}</div>`;
    } else if(roulettePreviewTab==='config'){
      h=`<div class="custom-control-grid">${ctl('Ruleta activa','rEnabled','check',c.enabled!==false)}${ctl('Modo de ruleta','rMode','select',c.mode||'baraja','<option value="baraja">Baraja de cartas</option><option value="roulette">Ruleta circular</option>')}
      ${ctl('Público','rAudience','select',c.audience||'all','<option value="all">Todos</option><option value="followers">Seguidores</option><option value="donors">Donadores</option><option value="likers">Likers</option>')}
      ${ctl('Modo de comentario','rCommentMode','select',c.participation?.commentMode||'custom','<option value="any">Cualquier comentario</option><option value="custom">Comentario personalizado</option>')}
      ${ctl('Texto de participación','rCommentText','input',c.participation?.commentText||'1')}
      ${ctl('Permitir múltiples','rAllowMultiple','check',c.participation?.allowMultiple===true)}
      ${ctl('Máximo por usuario','rMaxEntries','input',Number(c.participation?.maxEntriesPerUser||1))}
      ${ctl('Antispam (ms)','rSpamCooldown','input',Number(c.participation?.spamCooldownMs||2400))}</div>
      <div class="roulette-platform-pills"><span class="muted">Plataformas</span><button type="button" class="roulette-pill ${c.platforms?.tiktok!==false?'active':''}" data-rpreview-platform="tiktok">TikTok</button><button type="button" class="roulette-pill ${c.platforms?.twitch!==false?'active':''}" data-rpreview-platform="twitch">Twitch</button></div>
      <div class="custom-hint"><strong>Participación simulada</strong><span>“＋ Agregar participante” crea una entrada real dentro de esta preview y además la envía a la preview de Chat.</span></div>`;
    } else if(roulettePreviewTab==='behaviour'){
      h=`<div class="custom-control-grid">${ctl('Esperar comentario del ganador','rWinnerCommentEnabled','check',c.winnerComment?.enabled!==false)}${ctl('Tiempo de espera (segundos)','rWinnerCommentSeconds','input',Number(c.winnerComment?.waitSeconds||30))}${ctl('Participación automática','rAutoEnabled','check',c.auto?.enabled===true)}${ctl('Iniciar automáticamente tras (s)','rAutoStart','input',Number(c.auto?.startWaitSeconds||60))}${ctl('Reiniciar después de un ganador (s)','rAutoRestart','input',Number(c.auto?.restartWaitSeconds||180))}</div>
      <div class="custom-hint"><strong>Comportamiento</strong><span>Estas opciones usan la misma estructura de configuración del overlay. La vista previa también muestra el prompt del ganador cuando corresponde.</span></div>`;
    } else if(roulettePreviewTab==='winners'){
      const a=roulettePreviewState.history||[];h=`<div class="roulette-stat-strip"><span><strong>${a.length}</strong> ganadores simulados</span><span><strong>${roulettePreviewState.participants?.length||0}</strong> participantes</span></div><div class="roulette-mini-list">${a.length?a.map(w=>`<div class="roulette-mini-row"><span>🏆</span><strong>${esc(w.displayName||'Ganador')}</strong><small>${esc(w.platform||'')} ${w.voiceLabel?`· 🤖 ${esc(w.voiceLabel)}`:''}</small></div>`).join(''):'<div class="empty">Todavía no hay ganadores simulados. Agrega participantes y gira la ruleta.</div>'}</div>`;
    } else {
      const a=roulettePreviewState.history||[];h=`<div class="roulette-stat-strip"><span><strong>${a.length}</strong> giros registrados</span><span><strong>${roulettePreviewState.participants?.length||0}</strong> participantes actuales</span></div><div class="roulette-mini-list">${a.length?a.slice().reverse().map((w,i)=>`<div class="roulette-mini-row"><span>#${i+1}</span><strong>${esc(w.displayName||'Ganador')}</strong><small>${new Date(w.createdAt||Date.now()).toLocaleTimeString()} · ${esc(w.platform||'')}</small></div>`).join(''):'<div class="empty">El historial aparecerá al girar la ruleta en esta vista previa.</div>'}</div>`;
    }
    box.innerHTML=h;
    bindRoulettePreviewControls();
  }
  function bindRoulettePreviewControls(){
    const map={rEnabled:['enabled'],rMode:['mode'],rFrame:['theme','frame'],rBg:['theme','background'],rGrid:['theme','showGrid'],rAccent:['theme','accent'],rAccent2:['theme','accent2'],rAccent3:['theme','accent3'],rAudience:['audience'],rCommentMode:['participation','commentMode'],rCommentText:['participation','commentText'],rAllowMultiple:['participation','allowMultiple'],rMaxEntries:['participation','maxEntriesPerUser'],rSpamCooldown:['participation','spamCooldownMs'],rWinnerCommentEnabled:['winnerComment','enabled'],rWinnerCommentSeconds:['winnerComment','waitSeconds'],rAutoEnabled:['auto','enabled'],rAutoStart:['auto','startWaitSeconds'],rAutoRestart:['auto','restartWaitSeconds']};
    const apply=(id)=>{const path=map[id];if(!path)return;const el=$(id);if(!el)return;const value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;let cur=roulettePreviewConfig;for(let i=0;i<path.length-1;i++)cur=cur[path[i]] ||= {};cur[path[path.length-1]]=value;saveRoulettePreviewConfig();roulettePreviewPost({type:'config',config:roulettePreviewConfig});renderRoulettePreviewCardsOnly();};
    document.querySelectorAll('#roulettePreviewControls select,#roulettePreviewControls input').forEach(el=>{el.addEventListener('change',()=>apply(el.id));el.addEventListener('input',()=>{if(el.type==='color')apply(el.id);});});
    document.querySelectorAll('[data-rpreview-theme]').forEach(btn=>btn.onclick=()=>{const preset=ROULETTE_THEME_PRESETS.find(x=>x.id===btn.dataset.rpreviewTheme);if(!preset)return;roulettePreviewConfig.theme={...roulettePreviewConfig.theme,preset:preset.id,accent:preset.accent,accent2:preset.accent2,accent3:preset.accent3,cardTheme:preset.cardTheme};saveRoulettePreviewConfig();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
    document.querySelectorAll('[data-rpreview-deck]').forEach(btn=>btn.onclick=()=>{roulettePreviewConfig.theme={...roulettePreviewConfig.theme,cardTheme:String(btn.dataset.rpreviewDeck||'midnight')};saveRoulettePreviewConfig();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
    document.querySelectorAll('[data-rpreview-platform]').forEach(btn=>btn.onclick=()=>{const platform=String(btn.dataset.rpreviewPlatform||'');roulettePreviewConfig.platforms=roulettePreviewConfig.platforms||{tiktok:true,twitch:true};roulettePreviewConfig.platforms[platform]=!roulettePreviewConfig.platforms[platform];saveRoulettePreviewConfig();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
  }
  function renderRoulettePreviewCardsOnly(){
    if(roulettePreviewTab==='appearance') buildRouletteEditorDecorations();
  }
  function buildRouletteEditorDecorations(){
    document.querySelectorAll('[data-rpreview-theme]').forEach(btn=>btn.classList.toggle('active',btn.dataset.rpreviewTheme===String(getRoulettePreviewConfig().theme?.preset||'midnight')));
    document.querySelectorAll('[data-rpreview-deck]').forEach(btn=>btn.classList.toggle('active',btn.dataset.rpreviewDeck===String(getRoulettePreviewConfig().theme?.cardTheme||'midnight')));
  }
  function renderRoulette(){
    if(window.__sfRoulettePreviewMessageHandler) window.removeEventListener('message',window.__sfRoulettePreviewMessageHandler);
    window.__sfRoulettePreviewMessageHandler=(ev)=>{
      const d=ev?.data;
      if(d?.source!=='streamfusion-roulette-preview') return;
      if(d.type==='ready'){ flushRoulettePreviewQueue(); return; }
      if(d.type==='result'){
        const winner=d.winner||null;
        if(winner){
          roulettePreviewState.history=[...(roulettePreviewState.history||[]),winner].slice(-30);
          roulettePreviewState.participants=roulettePreviewState.participants||[];
        }
        // Never rebuild the iframe just because a tab/result changed.
        // The preview is one persistent scene; only the editor panel changes.
        if(roulettePreviewTab==='winners'||roulettePreviewTab==='history') roulettePreviewConfigControls();
        const count=$('roulettePreviewParticipantCount');
        if(count) count.textContent=`${roulettePreviewState.participants?.length||0} participante${(roulettePreviewState.participants?.length||0)===1?'':'s'}`;
        return;
      }
      if(d.type==='participantComment'){
        const participant=d.participant||{};
        const message=String(d.comment||participant.comment||getRoulettePreviewConfig().participation?.commentText||'1').trim()||'1';
        const entry={...participant,comment:message};
        const key=String(entry.key||`${entry.platform||'tiktok'}:${entry.uniqueId||entry.username||entry.displayName||''}`);
        const current=roulettePreviewState.participants||[];
        if(!current.some(p=>String(p.key)===key)) roulettePreviewState.participants=[...current,entry].slice(-100);
        const chatEntry={preview:true,platform:participant.platform||'tiktok',displayName:participant.displayName||participant.username||'Participante',username:participant.username||participant.uniqueId||'participante',uniqueId:participant.uniqueId||participant.username||'participante',message,timestamp:Date.now(),rouletteParticipant:true};
        state.previewChat=[...(state.previewChat||[]),chatEntry].slice(-24);
        if(page==='customize' && activeCustomizeTab==='chat') renderCustomizePreviewOnly({force:true});
        if(roulettePreviewTab==='config'||roulettePreviewTab==='winners'||roulettePreviewTab==='history') roulettePreviewConfigControls();
        const count=$('roulettePreviewParticipantCount');
        if(count) count.textContent=`${roulettePreviewState.participants?.length||0} participante${(roulettePreviewState.participants?.length||0)===1?'':'s'}`;
      }
    };
    window.addEventListener('message',window.__sfRoulettePreviewMessageHandler);
    roulettePreviewReady=false;
    roulettePreviewPending=[];
    const c=getRoulettePreviewConfig();
    const tabs=[['appearance','Apariencia'],['config','Configuración'],['behaviour','Comportamiento'],['winners','Ganadores'],['history','Historial']];
    const names=['LunaByte','MauroLive','SofiGG','PixelMajo','RafaFPS','NubeStudio','KiraLive'];
    $('view').innerHTML=`<div class="intro split"><div><p class="eyebrow">DINÁMICA</p><h2>Ruleta</h2><p>Configura la ruleta desde aquí y comprueba cada cambio en tiempo real antes de abrirla para OBS.</p></div><div class="row"><button class="btn secondary" id="rouletteResetPreview">Reiniciar prueba</button><button class="btn primary" id="rouletteGenerateOverlay">Generar Overlay</button></div></div><div class="roulette-editor-layout"><section class="card roulette-editor-card"><div class="roulette-editor-tabs">${tabs.map(([k,l])=>`<button type="button" class="roulette-editor-tab ${roulettePreviewTab===k?'active':''}" data-rpreview-tab="${k}">${l}</button>`).join('')}</div><div class="roulette-editor-body" id="roulettePreviewControls"></div></section><section class="card roulette-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA EN TIEMPO REAL</p><h3>Ruleta</h3></div><span class="preview-live"><i></i> SIMULACIÓN</span></div><div class="roulette-preview-stage"><iframe id="roulettePreviewFrame" title="Vista previa Ruleta" src="about:blank"></iframe></div><div class="roulette-preview-actions"><button class="btn secondary" id="rouletteSimAdd">＋ Agregar participante</button><button class="btn primary" id="rouletteSimSpin">🎲 Girar</button></div><div class="roulette-preview-footer"><span class="muted">Los participantes son ficticios y la simulación también alimenta el Chat de Personalización.</span><span id="roulettePreviewParticipantCount" class="preview-count">0 participantes</span></div></section></div>`;
    roulettePreviewConfigControls();
    buildRouletteEditorDecorations();
    document.querySelectorAll('[data-rpreview-tab]').forEach(b=>b.onclick=()=>{
      roulettePreviewTab=b.dataset.rpreviewTab;
      // Tabs are editor views, not different previews. Keep the same iframe
      // mounted so participants, animations and current state never reset.
      document.querySelectorAll('[data-rpreview-tab]').forEach(tab=>tab.classList.toggle('active',tab===b));
      roulettePreviewConfigControls();
      buildRouletteEditorDecorations();
    });
    $('rouletteSimAdd').onclick=()=>{
      const c=getRoulettePreviewConfig();
      const existing=new Set((roulettePreviewState.participants||[]).map(p=>String(p.displayName||'').toLowerCase()));
      const available=names.filter(n=>!existing.has(n.toLowerCase()));
      const name=(available.length?available:names)[Math.floor(Math.random()*(available.length?available:names).length)];
      const customText=String(c.participation?.commentMode||'custom')==='any'?'¡Hola!':(String(c.participation?.commentText||'1').trim()||'1');
      const enabledPlatforms=['twitch','tiktok'].filter(p=>c.platforms?.[p]!==false);
      const platform=enabledPlatforms.length?enabledPlatforms[Math.floor(Math.random()*enabledPlatforms.length)]:'twitch';
      const participant={displayName:name,username:name.toLowerCase(),uniqueId:name.toLowerCase(),platform,comment:customText,key:`preview-${Date.now()}-${Math.random()}`};
      roulettePreviewState.participants=[...(roulettePreviewState.participants||[]),participant].slice(-100);
      roulettePreviewPost({type:'addParticipant',participant});
      const count=$('roulettePreviewParticipantCount');if(count)count.textContent=`${roulettePreviewState.participants.length} participante${roulettePreviewState.participants.length===1?'':'s'}`;
    };
    $('rouletteSimSpin').onclick=()=>roulettePreviewPost({type:'spin'});
    $('rouletteResetPreview').onclick=()=>{
      roulettePreviewState={history:[],participants:[]};
      roulettePreviewPost({type:'reset'});
      roulettePreviewConfigControls();
      const count=$('roulettePreviewParticipantCount');if(count)count.textContent='0 participantes';
    };
    $('rouletteGenerateOverlay').onclick=async()=>{try{if(socket)socket.emit('roulette:update',getRoulettePreviewConfig());await new Promise(r=>setTimeout(r,120));await openOverlay('roulette-overlay.html','streamfusionRoulette');}catch(e){toast('Ruleta',e.message||'No se pudo abrir el overlay.','err');}};
    buildOverlayUrl('roulette-overlay.html?embed=1&previewBuild=19').then(url=>{const f=$('roulettePreviewFrame');if(!f)return;f.onload=()=>{roulettePreviewReady=true;f.contentWindow?.postMessage({source:'streamfusion-roulette-preview',type:'config',config:c},'*');flushRoulettePreviewQueue();};f.src=url;}).catch(()=>{});
  }


  async function loadVoices(){
    const request=++voiceCatalogRequest;
    const [catalog,userVoices]=await Promise.all([api(`/api/voices/catalog?owner=${encodeURIComponent(user.id)}`),api('/api/user/voices')]);
    if(request!==voiceCatalogRequest) return;
    state.catalog=catalog.voices||[]; state.voices=userVoices.voices||[];
  }

  function openVoiceTestModal(voice){
    const existing = document.getElementById('voiceTestModal');
    if(existing) existing.remove();
    const label = voice?.label || voice?.name || voice?.key || 'Voz';
    const voiceId = voice?.library === 'fish' || String(voice?.key||'').startsWith('fish:') ? `fish:${voice?.fishId || String(voice.key).replace(/^fish:/,'')}` : String(voice?.id || voice?.fishId || voice?.key || '');
    const modal=document.createElement('div');
    modal.id='voiceTestModal';
    modal.className='voice-test-modal';
    modal.innerHTML=`<div class="voice-test-backdrop" data-close-voice-test></div><section class="voice-test-dialog" role="dialog" aria-modal="true" aria-labelledby="voiceTestTitle"><div class="voice-test-head"><div><p class="eyebrow">PRUEBA TEMPORAL</p><h3 id="voiceTestTitle">${esc(label)}</h3><small>${esc(voiceId)}</small></div><button class="miniBtn" data-close-voice-test aria-label="Cerrar">✕</button></div><label class="voice-test-label">Texto de prueba<textarea id="voiceTestText" rows=9 placeholder="Escribe cualquier texto para probar esta voz..."></textarea></label><div class="voice-test-meta"><span>La prueba no se guarda.</span><span id="voiceTestStatus"></span></div><div class="voice-test-actions"><button class="btn secondary" data-close-voice-test>Cerrar</button><button class="btn secondary" id="voiceTestDownload" disabled>⬇ Descargar audio</button><button class="btn primary" id="voiceTestPlay">▶ Probar voz</button></div><audio id="voiceTestAudio" controls preload="none" class="voice-test-audio hidden"></audio></section>`;
    document.body.appendChild(modal);
    const close=()=>{ const a=document.getElementById('voiceTestAudio'); if(a){a.pause(); a.removeAttribute('src'); a.load();} modal.remove(); };
    modal.querySelectorAll('[data-close-voice-test]').forEach(el=>el.addEventListener('click',close));
    const input=modal.querySelector('#voiceTestText');
    const play=modal.querySelector('#voiceTestPlay');
    const download=modal.querySelector('#voiceTestDownload');
    const audio=modal.querySelector('#voiceTestAudio');
    const status=modal.querySelector('#voiceTestStatus');
    let objectUrl='';
    const run=async()=>{
      const text=String(input?.value||'');
      if(!text.trim()){ status.textContent='Escribe un texto primero.'; status.className='err'; input?.focus(); return; }
      play.disabled=true; download.disabled=true; status.textContent='Generando audio…'; status.className='';
      try{
        const response=await fetch('/api/user/voice-test',{method:'POST',headers:{'Content-Type':'application/json',...(token()?{Authorization:`Bearer ${token()}`}:{})},body:JSON.stringify({voiceId,text})});
        if(!response.ok){ let msg='No se pudo generar el audio.'; try{const data=await response.json(); msg=data.error||msg;}catch{} throw new Error(msg); }
        const blob=await response.blob();
        if(objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl=URL.createObjectURL(blob);
        audio.src=objectUrl; audio.classList.remove('hidden'); audio.play().catch(()=>{});
        download.disabled=false;
        download.onclick=()=>{ const a=document.createElement('a'); a.href=objectUrl; a.download=`${(label||'voz').replace(/[^a-z0-9áéíóúüñ _-]/gi,'').trim()||'voz'}-prueba.wav`; document.body.appendChild(a); a.click(); a.remove(); };
        status.textContent='Audio listo.';
      }catch(e){ status.textContent=e.message||'Error generando audio.'; status.className='err'; }
      finally{ play.disabled=false; }
    };
    play.addEventListener('click',run);
    input.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run();} });
    modal.addEventListener('keydown',e=>{ if(e.key==='Escape') close(); });
    setTimeout(()=>input?.focus(),20);
  }

  function voiceRow(v, options={}){ const id=v.fishId||v.id||v.key||''; const isPersonal=options.personal===true || v.library==='fish'; const library=isPersonal?'fish':'streamfusion'; return `<div class="voice-card ${isPersonal?'custom':''}"><div class="voice-card-main"><div class="voice-icon">${isPersonal?'🐟':'🎙️'}</div><div><strong>${esc(v.label||v.name||v.key)}</strong><small>${esc(id)}${v.author?` · ${esc(v.author)}`:''}</small>${Array.isArray(v.tags)&&v.tags.length?`<div class="voice-tags">${v.tags.slice(0,5).map(tag=>`<span>#${esc(tag)}</span>`).join('')}</div>`:''}</div></div><div class="voice-actions"><button class="miniBtn" data-test-voice="${esc(id)}" data-test-voice-key="${esc(v.key||id)}" data-test-voice-label="${esc(v.label||v.name||v.key||'Voz')}" data-test-voice-library="${esc(library)}">▶ Probar</button>${isPersonal?`<button class="miniBtn" data-edit-voice="${esc(v.fishId)}">Editar</button><button class="miniBtn danger" data-delete-voice="${esc(v.fishId)}">Eliminar</button>`:''}</div></div>`; }

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

  function renderVoices(){
    const draw = (loading=false) => {
      $('view').innerHTML=`<div class="intro split"><div><h2>Voces</h2><p>Administra la biblioteca que utiliza el bot de voz sin bloquear la navegación.</p></div><div class="widget-live-mini"><i class="${state.voiceListPresence.online?'on':''}"></i>${state.voiceListPresence.online?'LIVE':'OFF'}</div></div><div class="voice-page-single">${renderVoiceLibraryCard()}<section class="card"><div class="section-head"><div><p class="eyebrow">BOT DE VOZ</p><h3>Biblioteca personal</h3></div><span class="count-pill">${loading?'Cargando…':state.voices.length+' personalizadas'}</span></div><p class="muted">Las voces añadidas desde Fish Audio quedan disponibles para reglas de voz, selección manual y asignación automática.</p><div class="voice-library voice-library-short">${state.voices.length ? state.voices.map(v=>voiceRow(v,{personal:true})).join('') : '<div class="empty">Todavía no tienes voces personalizadas.</div>'}</div></section></div>`;
      bindVoiceLibraryActions();
    };
    draw(state.catalog.length===0 && state.voices.length===0);
    loadVoices().then(()=>{if(page==='voices') draw(false);}).catch(()=>draw(false));
  }

  function bindVoiceLibraryActions(){
    document.querySelectorAll('[data-test-voice]').forEach(btn=>btn.onclick=()=>openVoiceTestModal({id:btn.dataset.testVoice,key:btn.dataset.testVoiceKey,label:btn.dataset.testVoiceLabel,library:btn.dataset.testVoiceLibrary,fishId:btn.dataset.testVoiceLibrary==='fish'?btn.dataset.testVoice:''}));
    document.querySelectorAll('[data-delete-voice]').forEach(btn=>btn.onclick=async()=>{try{await api(`/api/user/voices/${encodeURIComponent(btn.dataset.deleteVoice)}`,{method:'DELETE'});toast('Voz eliminada');await renderVoices();}catch(e){toast('No se pudo eliminar',e.message,'err')}});
    document.querySelectorAll('[data-edit-voice]').forEach(btn=>btn.onclick=()=>{const v=state.voices.find(x=>x.fishId===btn.dataset.editVoice);if(v){ $('fishLabelInput').value=v.label||''; $('fishIdInput').value=v.fishId||''; $('fishTagsInput').value=Array.isArray(v.tags)?v.tags.join(', '):String(v.tags||''); $('fishLabelInput').focus(); }});
    const searchInput=$('fishLabelInput'), searchBox=$('voiceSearchResults'); let searchTimer=0;
    const runVoiceSearch=async()=>{const q=searchInput?.value.trim()||''; if(q.length<2){searchBox?.classList.add('hidden');return;} const id=++searchTimer; try{const data=await api(`/api/voices/search?q=${encodeURIComponent(q)}`); if(id!==searchTimer)return; const items=(data.voices||[]).slice(0,8); searchBox.innerHTML=items.length?items.map(v=>`<button type="button" class="voice-search-item" data-id="${esc(v.id)}" data-label="${esc(v.label)}" data-author="${esc(v.author||'')}" data-description="${esc(v.description||'')}"><strong>${esc(v.label)}</strong><small>${esc(v.id)}${v.author?` · ${esc(v.author)}`:''}</small></button>`).join(''):'<div class="muted">Sin coincidencias.</div>'; searchBox.classList.remove('hidden'); searchBox.querySelectorAll('.voice-search-item').forEach(b=>b.onclick=()=>{const suggested=window.__sfSuggestVoiceTags?window.__sfSuggestVoiceTags(b.dataset.label,b.dataset.author):[];searchInput.value=b.dataset.label;$('fishIdInput').value=b.dataset.id;$('fishTagsInput').value=suggested.join(', ');searchBox.classList.add('hidden');});}catch{searchBox?.classList.add('hidden');}};
    searchInput?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(runVoiceSearch,350);});
    function suggestVoiceTags(label, extra=''){
      const source=String(label||'').trim();
      const normalized=source.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[()\[\]{}"'`]/g,' ').replace(/[_/\\-]+/g,' ').replace(/[^\p{L}\p{N}\s]+/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
      if(!normalized) return [];
      const tags=[];
      const add=(value)=>{const v=String(value||'').trim().toLowerCase();if(v && !tags.includes(v)) tags.push(v);};
      add(normalized);
      normalized.split(' ').forEach(part=>{ if(part.length>=3) add(part); });
      const compact=normalized.replace(/\s+/g,'');
      if(compact!==normalized) add(compact);
      if(extra) String(extra).split(/[,|]/).map(s=>s.trim()).filter(Boolean).slice(0,3).forEach(add);
      return tags.slice(0,10);
    }
    window.__sfSuggestVoiceTags=suggestVoiceTags;
    $('addVoice').onclick=async()=>{const fishId=$('fishIdInput')?.value.trim(), label=$('fishLabelInput')?.value.trim(), tags=($('fishTagsInput')?.value||'').split(',').map(x=>x.trim()).filter(Boolean); if(!fishId){toast('Falta el ID','Escribe el ID de Fish Audio.','err');return;} const effectiveTags=tags.length?tags:suggestVoiceTags(label||fishId); try{const data=await api('/api/user/voices',{method:'POST',body:JSON.stringify({fishId,label:label||fishId,tags:effectiveTags})});toast('Voz guardada',`${data.voice?.label||label||fishId} quedó en tu biblioteca.`);await renderVoices();}catch(e){toast('No se pudo guardar',e.message,'err')}};
  }

  const VOICE_FONTS=[['Inter, Arial, sans-serif','Inter'],['Arial, sans-serif','Arial'],['Trebuchet MS, sans-serif','Trebuchet MS'],['Verdana, sans-serif','Verdana'],['Tahoma, sans-serif','Tahoma'],['Segoe UI, sans-serif','Segoe UI'],['system-ui, sans-serif','System UI'],['Georgia, serif','Georgia'],['Times New Roman, serif','Times New Roman'],['Impact, sans-serif','Impact'],['Oswald, sans-serif','Oswald'],['Montserrat, sans-serif','Montserrat'],['Poppins, sans-serif','Poppins'],['Bebas Neue, sans-serif','Bebas Neue'],['Comic Sans MS, cursive','Comic Sans'],['Courier New, monospace','Courier New'],['Anton, sans-serif','Anton'],['Roboto Condensed, sans-serif','Roboto Condensed'],['Playfair Display, serif','Playfair Display'],['Merriweather, serif','Merriweather'],['Noto Sans, sans-serif','Noto Sans'],['Lobster, cursive','Lobster'],['Raleway, sans-serif','Raleway'],['Space Grotesk, sans-serif','Space Grotesk'],['Orbitron, sans-serif','Orbitron'],['Kanit, sans-serif','Kanit']];
  const voiceShadow=(v,c)=>v==='soft'?`0 2px 8px ${c||'#000'}`:v==='strong'?`0 4px 16px ${c||'#000'}`:'none';
  const voiceLibraryItems=()=>{
    const merged=[]; const seen=new Set();
    for(const v of [...(state.catalog||[]),...(state.voices||[])]){
      const key=String(v.key||v.id||v.fishId||v.name||v.label||'').trim();
      if(!key || seen.has(key)) continue; seen.add(key); merged.push(v);
    }
    return merged;
  };
  const voicePreviewItems=()=>voiceLibraryItems().length?voiceLibraryItems():[{key:'preview-1',label:'Fede Vigevani'},{key:'preview-2',label:'Deadpool'},{key:'preview-3',label:'El Mariana'}];
  function buildVoicePreviewHtml(s){
    if (s.enabled === false) return `<div class="voice-preview-off"><span class="off-dot"></span><strong>Widget desactivado</strong><small>Actívalo para generar contenido en el overlay.</small></div>`;
    const now=Date.now();
    if(!voiceWidgetPreviewStartAt) voiceWidgetPreviewStartAt=now;
    const r={title:'¿Quieres una voz?',subtitle:'Para participar, comenta lo que se indique en el sorteo!',winnerText:'Si ganas, solo comenta una de las siguientes voces:',titleSeconds:3,subtitleSeconds:3,winnerSeconds:3,introMotion:'fade',showListAfterIntro:true,...(s.roulette||{})};
    if(r.enabled){
      const elapsed=(now-voiceWidgetPreviewStartAt)/1000;
      const d1=Math.max(.5,Number(r.titleSeconds||3)), d2=Math.max(.5,Number(r.subtitleSeconds||3)), d3=Math.max(.5,Number(r.winnerSeconds||3));
      let introText='',step=-1;
      if(elapsed<d1){introText=r.title;step=0;} else if(elapsed<d1+d2){introText=r.subtitle;step=1;} else if(elapsed<d1+d2+d3){introText=r.winnerText;step=2;}
      if(step>=0 || r.showListAfterIntro===false){
        const imgs=[r.titleImageUrl||r.imageUrl||'',r.subtitleImageUrl||r.imageUrl||'',r.winnerImageUrl||r.imageUrl||'']; const img=step>=0?imgs[Math.min(step,2)]:'';
        return `<div class="voice-preview-roulette motion-${esc(r.introMotion||'fade')}">${img?`<img src="${esc(img)}" alt="" onerror="this.remove()">`:''}<strong>${esc(introText||r.winnerText)}</strong><small>INTRO DEL WIDGET · paso ${Math.max(1,step+1)}/3</small></div>`;
      }
    }
    const list=voicePreviewItems(); const motion=s.motion||'static'; const isHorizontal=s.axis==='horizontal' || s.direction==='horizontal'; const vertical=!isHorizontal; const ordered=s.movementDirection==='reverse'?[...list].reverse():list;
    const items=ordered.map((v,i)=>{const st=`font-family:${esc(s.fontFamily)};font-size:${Number(s.fontSize ?? 28)}px;font-weight:${Number(s.fontWeight ?? 700)};font-style:${esc(s.fontStyle||'normal')};color:${esc(s.textColor||'#000')};text-shadow:${voiceShadow(s.textShadow,s.shadowColor)};-webkit-text-stroke:${Number(s.outlineWidth ?? 0)}px ${esc(s.outlineColor||'#000')};text-transform:${esc(s.textTransform||'none')};letter-spacing:${Number(s.letterSpacing ?? 0)}px;line-height:${Number(s.lineHeight ?? 1.2)};`; return `<div class="voice-live-item" style="${st}">${s.showIndex?`<span class="voice-live-index">${i+1}. </span>`:''}${esc(v.label||v.name||v.key||v.fishId)}${s.showId?`<small>${esc(v.id||v.fishId||'')}</small>`:''}</div>`}).join('');
    const dup=motion==='static'?items:items+items; const bgAlpha=s.transparent?Number(s.backgroundOpacity||0):Math.max(.06,Number(s.backgroundOpacity||.08)); const listPos=esc(s.listPosition||'left');
    const autoLabel=s.autoShowEnabled===true?`<span class="preview-auto-state">Auto · cada ${Number(s.autoShowEvery||30)}s / ${Number(s.autoShowFor||6)}s</span>`:'';
    return `<div class="voice-live-stage ${vertical?'is-vertical':'is-horizontal'} motion-${esc(motion)} travel-${esc(s.movementDirection||'forward')} position-${listPos}" style="--vl-preview-speed:${Math.max(4,Number(s.motionSpeed||24))}s;--vl-preview-gap:${Math.max(0,Number(s.itemGap||10))}px;--vl-preview-align:${esc(s.align||'left')};--vl-preview-bg:rgba(255,255,255,${bgAlpha});--vl-preview-font:${esc(s.fontFamily||'Inter, Arial, sans-serif')};--vl-preview-weight:${Number(s.fontWeight||700)};--vl-preview-size:${Number(s.fontSize||28)}px;--vl-preview-color:${esc(s.textColor||'#000')};--vl-preview-line:${Number(s.lineHeight||1.2)};--vl-preview-letter:${Number(s.letterSpacing||0)}px">${autoLabel?`<div class="voice-live-toolbar">${autoLabel}</div>`:''}<div class="voice-live-track">${dup}</div></div>`;
  }
  function voiceStatusMarkup(){const online=['tiktok','twitch'].some(p=>isConnected(p)); return `<span class="widget-status ${online?'online':'offline'}"><i></i>${online?'ON':'OFF'}</span>`;}
  function voiceCtl(label,id,type,value,opts=''){return ctl(label,id,type,value,opts)}
  function voiceRouletteMarkup(r){return `<div class="widget-subsection"><div class="section-head"><div><p class="eyebrow">INTRO DEL WIDGET</p><h3>Secuencia previa</h3></div><span class="muted">opcional</span></div><div class="settings-grid two compact-grid">${voiceCtl('Activar','vlRouletteEnabled','check',r.enabled)}${voiceCtl('Mostrar lista al terminar','vlShowListAfter','check',r.showListAfterIntro!==false)}${voiceCtl('Texto 1','vlRText1','input',r.title)}${voiceCtl('Segundos 1','vlRTime1','input',r.titleSeconds)}${voiceCtl('Texto 2','vlRText2','input',r.subtitle)}${voiceCtl('Segundos 2','vlRTime2','input',r.subtitleSeconds)}${voiceCtl('Texto 3','vlRText3','input',r.winnerText)}${voiceCtl('Segundos 3','vlRTime3','input',r.winnerSeconds)}${voiceCtl('Animación','vlRMotion','select',r.introMotion||'fade','<option value="fade">Fade</option><option value="slide-up">Slide up</option><option value="slide-down">Slide down</option><option value="zoom">Zoom</option><option value="type">Type</option><option value="star-wars">Star Wars</option>')}${voiceCtl('Opacidad tarjeta','vlRCard','input',r.cardOpacity)}</div><p class="muted">La escena de ruleta del widget sigue siendo independiente de la ruleta principal de StreamFusion.</p></div>`}

  function renderWidgets(){
    window.__sfVoiceWidgetEditorOpen = Boolean(window.__sfVoiceWidgetEditorOpen);
    if(!window.__sfVoiceWidgetEditorOpen){
      if(voiceWidgetPreviewTimer){clearInterval(voiceWidgetPreviewTimer);voiceWidgetPreviewTimer=0;}
      voiceWidgetDraft=null;
      const total=voiceLibraryItems().length;
      $('view').innerHTML=`<div class="intro"><h2>Widgets</h2><p>Selecciona un widget para abrir su editor sin perder la conexión del estudio.</p></div><div class="widget-launch-grid"><button type="button" class="card widget-launch-card widget-launch-card-premium" id="openVoiceWidgetEditor"><span class="widget-launch-icon">🎙️</span><span><strong>Lista de voces</strong><small>Configura la vista, animaciones e intro. La lista completa se muestra únicamente en la vista previa.</small></span><span class="widget-launch-arrow">→</span></button></div>`;
      $('openVoiceWidgetEditor').onclick=()=>{window.__sfVoiceWidgetEditorOpen=true;voiceWidgetPreviewStartAt=Date.now();renderWidgets();};
      if(total===0) loadVoices().then(()=>{if(page==='widgets'&&!window.__sfVoiceWidgetEditorOpen)renderWidgets();}).catch(()=>{});
      return;
    }
    const s=structuredClone(settings.voiceList||{});
    voiceWidgetDraft=s;
    if(!voiceWidgetPreviewTimer){ voiceWidgetPreviewTimer=setInterval(()=>{ if(page!=='widgets'||!window.__sfVoiceWidgetEditorOpen||!voiceWidgetDraft)return; const el=$('voiceWidgetPreview'); if(!el)return; const html=buildVoicePreviewHtml(voiceWidgetDraft); const sig=html; if(sig!==voiceWidgetPreviewSignature){el.innerHTML=html;voiceWidgetPreviewSignature=sig;} },200); }
    s.axis=s.axis||s.direction||'vertical'; s.direction=s.axis; s.movementDirection=s.movementDirection||'forward'; s.roulette={enabled:false,title:'¿Quieres una voz?',subtitle:'Para participar, comenta lo que se indique en el sorteo!',winnerText:'Si ganas, solo comenta una de las siguientes voces:',titleSeconds:3,subtitleSeconds:3,winnerSeconds:3,introMotion:'fade',cardOpacity:.12,showListAfterIntro:true,...(s.roulette||{})};
    const fontOpts=VOICE_FONTS.map(x=>`<option value="${esc(x[0])}">${esc(x[1])}</option>`).join('');
    const library=voiceLibraryItems();
    $('view').innerHTML=`<div class="intro widget-editor-intro"><div><p class="eyebrow">WIDGET / LISTA DE VOCES</p><h2>Lista de Voces</h2><p>Edita la lista y comprueba los cambios en tiempo real.</p></div><button class="btn secondary widget-back-btn" id="backToWidgets">← Volver a Widgets</button></div>
      <div class="widget-editor-layout"><section class="card widget-controls"><div class="widget-editor-topbar"><div><p class="eyebrow">EDITOR</p><h3>Configuración del widget</h3></div><div class="widget-header-actions"><button class="btn secondary" id="saveVoiceWidget">Guardar</button><button class="btn primary" id="openVoiceWidget">Generar Overlay</button></div></div>
      <div class="settings-grid two compact-grid">
      <article class="widget-subsection"><p class="eyebrow">GENERAL</p>${voiceCtl('Activar','vEnabled','check',s.enabled)}${voiceCtl('Fondo transparente','vTransparent','check',s.transparent)}${voiceCtl('Opacidad de fondo','vBgOpacity','input',s.backgroundOpacity)}${voiceCtl('Fuente','vFont','select',s.fontFamily,fontOpts)}${voiceCtl('Tamaño','vSize','input',s.fontSize)}${voiceCtl('Peso','vWeight','input',s.fontWeight)}${voiceCtl('Estilo','vStyle','select',s.fontStyle,'<option value="normal">Normal</option><option value="italic">Cursiva</option>')}${voiceCtl('Color','vColor','input',s.textColor)}</article>
      <article class="widget-subsection"><p class="eyebrow">EFECTOS</p>${voiceCtl('Sombra','vShadow','select',s.textShadow,'<option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>')}${voiceCtl('Color sombra','vShadowColor','input',s.shadowColor)}${voiceCtl('Contorno (px)','vOutline','input',s.outlineWidth)}${voiceCtl('Color contorno','vOutlineColor','input',s.outlineColor)}${voiceCtl('Transformación','vTransform','select',s.textTransform,'<option value="none">Normal</option><option value="uppercase">MAYÚSCULAS</option><option value="lowercase">minúsculas</option><option value="capitalize">Capitalizar</option>')}${voiceCtl('Espaciado','vLetter','input',s.letterSpacing)}${voiceCtl('Altura línea','vLine','input',s.lineHeight)}</article>
      <article class="widget-subsection"><p class="eyebrow">COMPOSICIÓN</p>${voiceCtl('Separación','vGap','input',s.itemGap)}${voiceCtl('Alineación','vAlign','select',s.align,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}${voiceCtl('Posición','vPosition','select',s.listPosition,'<option value="left">Izquierda</option><option value="center">Centro</option><option value="right">Derecha</option>')}${voiceCtl('Desplazamiento','vAxis','select',s.axis,'<option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>')}${voiceCtl('Dirección','vMoveDir','select',s.movementDirection,'<option value="forward">Normal</option><option value="reverse">Invertida</option>')}${voiceCtl('Movimiento','vMotion','select',s.motion,'<option value="static">Estático</option><option value="scroll">Scroll</option><option value="slide">Slide</option><option value="marquee">Marquee</option>')}${voiceCtl('Velocidad','vMotionSpeed','input',s.motionSpeed)}</article>
      <article class="widget-subsection"><p class="eyebrow">VISIBILIDAD</p>${voiceCtl('Mostrar índice','vShowIndex','check',s.showIndex)}${voiceCtl('Mostrar ID','vShowId','check',s.showId)}${voiceCtl('Mostrar automáticamente','vAutoShow','check',s.autoShowEnabled)}${voiceCtl('Cada (segundos)','vAutoEvery','input',s.autoShowEvery)}${voiceCtl('Visible durante','vAutoFor','input',s.autoShowFor)}</article></div>
      ${voiceRouletteMarkup(s.roulette)}
      </section>
      <section class="card widget-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA EN TIEMPO REAL</p><h3>Lista de Voces</h3></div><span id="voicePreviewStatus">${voiceStatusMarkup()}</span></div><div id="voiceWidgetPreview" class="voice-widget-preview">${buildVoicePreviewHtml(s)}</div><div class="widget-preview-footer"><span class="muted">La lista visible arriba es la que recibirá el overlay generado.</span><code>/voice-list-overlay.html</code></div></section></div>`;
    const map={vEnabled:['enabled','check'],vTransparent:['transparent','check'],vBgOpacity:['backgroundOpacity','num'],vFont:['fontFamily'],vSize:['fontSize','num'],vWeight:['fontWeight','num'],vStyle:['fontStyle'],vColor:['textColor'],vShadow:['textShadow'],vShadowColor:['shadowColor'],vOutline:['outlineWidth','num'],vOutlineColor:['outlineColor'],vTransform:['textTransform'],vLetter:['letterSpacing','num'],vLine:['lineHeight','num'],vGap:['itemGap','num'],vAlign:['align'],vPosition:['listPosition'],vAxis:['axis'],vMoveDir:['movementDirection'],vMotion:['motion'],vMotionSpeed:['motionSpeed','num'],vShowIndex:['showIndex','check'],vShowId:['showId','check'],vAutoShow:['autoShowEnabled','check'],vAutoEvery:['autoShowEvery','num'],vAutoFor:['autoShowFor','num']};
    const scheduleVoiceWidgetSave=()=>{clearTimeout(voiceWidgetSaveTimer);voiceWidgetSaveTimer=setTimeout(async()=>{try{const result=await api('/api/voice-list/settings',{method:'PUT',body:JSON.stringify(s)});settings.voiceList=merge(settings.voiceList,result.voiceList||s);}catch(e){console.warn('voice widget autosave',e);}},300);};
    const updatePreview=()=>{$('voiceWidgetPreview').innerHTML=buildVoicePreviewHtml(s);scheduleVoiceWidgetSave();};
    for(const [id,[key,type]] of Object.entries(map)){const el=$(id);if(!el)continue;if(type==='check')el.checked=!!s[key];else el.value=String(s[key]??'');el.addEventListener('input',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});el.addEventListener('change',()=>{s[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;updatePreview();});}
    const rouletteFields={vlRouletteEnabled:['enabled','check'],vlShowListAfter:['showListAfterIntro','check'],vlRText1:['title'],vlRTime1:['titleSeconds','num'],vlRText2:['subtitle'],vlRTime2:['subtitleSeconds','num'],vlRText3:['winnerText'],vlRTime3:['winnerSeconds','num'],vlRMotion:['introMotion'],vlRCard:['cardOpacity','num']};
    for(const [id,[key,type]] of Object.entries(rouletteFields)){const el=$(id);if(!el)continue;const value=s.roulette?.[key];if(type==='check')el.checked=value!==false;else el.value=String(value??'');el.addEventListener('input',()=>{s.roulette=s.roulette||{};s.roulette[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;voiceWidgetPreviewStartAt=Date.now();voiceWidgetPreviewSignature='';updatePreview();});el.addEventListener('change',()=>{s.roulette=s.roulette||{};s.roulette[key]=type==='check'?el.checked:type==='num'?Number(el.value):el.value;voiceWidgetPreviewStartAt=Date.now();voiceWidgetPreviewSignature='';updatePreview();});}
    setSelect('vFont',s.fontFamily); setSelect('vPosition',s.listPosition); setSelect('vAxis',s.axis); setSelect('vMoveDir',s.movementDirection); if($('vColor'))$('vColor').value=s.textColor; if($('vShadowColor'))$('vShadowColor').value=s.shadowColor; if($('vOutlineColor'))$('vOutlineColor').value=s.outlineColor;
    const persistVoiceWidget = async () => {
      const result=await api('/api/voice-list/settings',{method:'PUT',body:JSON.stringify(s)});
      settings.voiceList=merge(settings.voiceList,result.voiceList||s);
      voiceWidgetDraft=s;
      return result.voiceList||s;
    };
    $('backToWidgets').onclick=()=>{ window.__sfVoiceWidgetEditorOpen=false; voiceWidgetDraft=null; voiceWidgetPreviewSignature=''; if(voiceWidgetPreviewTimer){clearInterval(voiceWidgetPreviewTimer);voiceWidgetPreviewTimer=0;} renderWidgets(); };
    $('saveVoiceWidget').onclick=async()=>{ try{ await persistVoiceWidget(); toast('Widget guardado','Todos los cambios de Lista de Voces quedaron guardados.'); }catch(e){ toast('No se pudo guardar',e.message,'err'); } };
    $('openVoiceWidget').onclick=async()=>{ try{ await persistVoiceWidget(); await openOverlay('voice-list-overlay.html','streamfusionVoiceList'); }catch(e){ toast('Overlay',e.message||'No se pudo generar el overlay.','err'); } };
    loadVoices().then(()=>{if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen&&voiceLibraryItems().length!==library.length)renderWidgets();}).catch(()=>{});
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

  function classifyEvent(item){ return activityKind(item); }
  function isCurrentConnectionEvent(item){
    const platform=String(item?.platform||'').toLowerCase();
    if(platform!=='tiktok' && platform!=='twitch') return true;
    const eventConnectionId=String(item?.connectionId||'').trim();
    if(!eventConnectionId) return true; // history/legacy entries without a session id
    const current=String(state.accounts[platform]?.connectionId||'').trim();
    return Boolean(current) && eventConnectionId===current;
  }
  function acceptChat(item){
    if(!isCurrentConnectionEvent(item)) return;
    const entry={...item,timestamp:item.timestamp||Date.now()}; const key=eventFingerprint(entry,'chat'); const now=Date.now();
    for(const [k,t] of recentEventKeys) if(now-t>15000) recentEventKeys.delete(k);
    if(recentEventKeys.has(key)) return; recentEventKeys.set(key,now);
    state.chat.push(entry); if(state.chat.length>500)state.chat.splice(0,state.chat.length-500);
    if(page==='dashboard') updateDashboardFeeds();
  }
  function acceptEvent(item){
    if(!isCurrentConnectionEvent(item)) return;
    const entry={...item,timestamp:item.timestamp||Date.now()}; const key=eventFingerprint(entry,'activity'); const now=Date.now();
    for(const [k,t] of recentEventKeys) if(now-t>15000) recentEventKeys.delete(k);
    if(recentEventKeys.has(key)) return; recentEventKeys.set(key,now);
    recordActivity(entry); const kind=classifyEvent(entry); (kind==='gift'?state.gifts:state.events).push(entry);
    if(state.events.length>300)state.events.shift(); if(state.gifts.length>300)state.gifts.shift();
    if(page==='dashboard') updateDashboardFeeds();
  }
  async function hydrateHistory(){
    try { const data=await api('/api/live-history'); (data.chat||[]).forEach(x=>{state.chat.push(x);}); (data.events||[]).forEach(x=>acceptEvent({...x, connectionId:''})); state.chat=state.chat.slice(-500); state.historyLoaded=true; if(page==='dashboard')renderDashboard(); if(page==='customize'&&activeCustomizeTab==='chat')renderCustomizePreviewOnly(); }
    catch(e){ console.warn('live history',e); }
  }

  function setupSocket(){
    if(socket) socket.disconnect();
    socket=io({auth:{token:token()},transports:['websocket','polling'],reconnection:true,reconnectionAttempts:Infinity,reconnectionDelay:800,reconnectionDelayMax:5000});
    socket.on('connect',()=>{state.connection='online'; renderTop(); if(page==='connections'||page==='overlays')render();});
    socket.on('disconnect',()=>{state.connection='offline'; renderTop(); if(page==='overlays')renderOverlays();});
    socket.on('connect_error',err=>toast('Conexión',err.message||'No se pudo conectar al stream.','err'));
    socket.on('settings', s=>{
      const incoming=merge(defaultSettings,s||{});
      try { const saved=JSON.parse(localStorage.getItem('sf.customize.modes.v1')||'null'); if(saved){ incoming.personalization.eventStyle=saved.eventStyle||incoming.personalization.eventStyle; incoming.personalization.giftStyle=saved.giftStyle||incoming.personalization.giftStyle; incoming.personalization.eventSimulationMode=saved.eventSimulationMode||incoming.personalization.eventSimulationMode||'single'; incoming.personalization.giftSimulationMode=saved.giftSimulationMode||incoming.personalization.giftSimulationMode||'single'; } } catch {}
      settings=incoming;
      applyAppearance();
      if(page==='dashboard') updateDashboardFeeds();
      if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen){$('voiceWidgetPreview')?.replaceChildren(document.createRange().createContextualFragment(buildVoicePreviewHtml(settings.voiceList||{})));}
      if(page==='customize') renderCustomizePreviewOnly();
    });
    socket.on('voiceListSettings', v=>{settings.voiceList=merge(settings.voiceList,v||{});if(page==='widgets'&&!window.__sfVoiceWidgetEditorOpen){renderWidgets();}else if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen){voiceWidgetDraft=merge(voiceWidgetDraft||settings.voiceList,v||{});voiceWidgetPreviewSignature='';}});
    socket.on('voiceListPresence', d=>{state.voiceListPresence={online:Boolean(d?.online),connections:Number(d?.connections||0)};if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen){const frag=document.createRange();$('voiceWidgetStatus')?.replaceChildren(frag.createContextualFragment(voiceStatusMarkup()));$('voicePreviewStatus')?.replaceChildren(frag.createContextualFragment(voiceStatusMarkup()));}});
    socket.on('accountState', d=>{if(!d?.platform)return;const platform=String(d.platform).toLowerCase();const next={...(state.accounts[platform]||{}), ...d};if(next.connected===false) next.connectionId='';state.accounts[platform]=next;renderTop();updateDashboardConnectionStatus();if(page==='connections'||page==='overlays')render();if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen){$('voicePreviewStatus')?.replaceChildren(document.createRange().createContextualFragment(voiceStatusMarkup()));}});
    socket.on('liveHistory', data=>{state.chat=[];state.events=[];state.gifts=[];(data?.chat||[]).forEach(x=>acceptChat({...x,connectionId:''}));(data?.events||[]).forEach(x=>acceptEvent({...x,connectionId:''}));state.historyLoaded=true;});
    socket.on('chat',d=>acceptChat(d||{}));
    socket.on('event',d=>acceptEvent(d||{}));
    socket.on('roulette:sync',s=>{
      rouletteState=s||rouletteState;
      if(page==='roulette'){
        const frame=$('roulettePreviewFrame');
        if(frame?.contentWindow){
          roulettePreviewPost({type:'config',config:getRoulettePreviewConfig()});
          roulettePreviewConfigControls();
        }else renderRoulette();
      }
    });
    socket.on('roulette:result',s=>{
      rouletteState=s||rouletteState;
      toast('Ganador',s?.winner?.displayName||s?.winner?.username||'Listo');
      if(page==='roulette'){
        const frame=$('roulettePreviewFrame');
        if(frame?.contentWindow){
          roulettePreviewConfigControls();
        }else renderRoulette();
      }
    });
    socket.on('roulette:error',e=>toast('Ruleta',e.message||'No se pudo iniciar','err'));
    socket.on('system',d=>d?.message&&toast('Sistema',d.message));
  }

  async function startApp(){
    if(!token()){showAuth();return;}
    try{ const me=await api('/api/me'); user=me.user; $('authScreen').classList.add('hidden');$('app').classList.remove('hidden');settings=merge(defaultSettings,await api('/api/user/settings')); try { const saved=JSON.parse(localStorage.getItem('sf.customize.modes.v1')||'null'); if(saved){ settings.personalization.eventStyle=saved.eventStyle||settings.personalization.eventStyle; settings.personalization.giftStyle=saved.giftStyle||settings.personalization.giftStyle; settings.personalization.eventSimulationMode=saved.eventSimulationMode||settings.personalization.eventSimulationMode||'single'; settings.personalization.giftSimulationMode=saved.giftSimulationMode||settings.personalization.giftSimulationMode||'single'; } } catch {} render();setupSocket(); }
    catch(e){localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);showAuth();}
  }
  function showAuth(){ $('authScreen').classList.remove('hidden');$('app').classList.add('hidden');$('authTitle').textContent=authMode==='login'?'Bienvenido de vuelta':'Crear cuenta';$('authText').textContent=authMode==='login'?'Inicia sesión para abrir tu estudio.':'Crea tu cuenta para guardar voces y configuraciones.';$('authNameWrap').classList.toggle('hidden',authMode==='login');$('authSubmit').innerHTML=authMode==='login'?'Entrar al estudio <span>→</span>':'Crear cuenta <span>→</span>';$('authToggle').textContent=authMode==='login'?'¿No tienes cuenta? Crear cuenta':'¿Ya tienes cuenta? Iniciar sesión';}
  async function authSubmit(e){e.preventDefault();$('authError').textContent='';try{const d=await api(authMode==='login'?'/api/auth/login':'/api/auth/register',{method:'POST',body:JSON.stringify({email:$('authEmail').value,password:$('authPassword').value,displayName:$('authName').value})});localStorage.setItem(TOKEN_KEY,d.token);localStorage.setItem(SESSION_KEY,JSON.stringify(d.user));await startApp();}catch(err){$('authError').textContent=err.message;}}
  async function logout(){try{await api('/api/auth/logout',{method:'POST'});}catch{}try{socket?.disconnect();}catch{}localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);user=null;state.chat=[];state.events=[];state.gifts=[];showAuth();}

  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.page===page)return;page=btn.dataset.page;render();}));
  $('collapse').onclick=()=>document.body.classList.toggle('sidebar-collapsed');
  $('logout').onclick=logout;
  $('authForm').addEventListener('submit',authSubmit);
  $('authToggle').onclick=()=>{authMode=authMode==='login'?'register':'login';showAuth();};
  window.addEventListener('hashchange',()=>{const next=location.hash.slice(1);if(pageMeta[next]){page=next;render();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden && (!socket||!socket.connected)) setupSocket();});
  window.addEventListener('pageshow',()=>{if(!socket||!socket.connected)setupSocket();});

  window.streamFusionStudio = { state, getSettings:()=>structuredClone(settings), openOverlay };
  showAuth(); startApp();
})();
