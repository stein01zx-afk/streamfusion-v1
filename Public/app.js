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
    tiktokModerators:[], twitchModerators:[],
    personalization:{theme:'dark',font:'inter',animation:'slide',chatLayout:'vertical',chatDirection:'down',chatTheme:'cloud',chatAdjustMessages:false,avatarFrame:'platform',bubbleFrame:'platform',avatarSize:'md',nameSize:'md',nameWeight:'800',showPlatformPill:true,showTimestamps:true,showActivity:true,bubbleRadius:12,avatarBorderWidth:2,messagePadding:7,rowGap:5,tiktokNameColor:'white',twitchNameColor:'real',chatOverlayCardSide:'center',badgeStyle:'emoji',tiktokNameColor:'white',twitchNameColor:'real',messageEffect:'shadow',nameEffect:'shadow',textColor:'auto',showBadges:true,showEmotes:true,highlightSupporters:true,supporterHighlightStyle:'gold',eventStyle:'chat',eventSimulationMode:'single',giftStyle:'chat',giftSimulationMode:'single',highlightEventUsername:true,highlightLikes:true,highlightFollows:true,highlightJoins:true,highlightShares:true,highlightSystem:true,highlightFanclub:true,highlightSuperfan:true,highlightGifts:true,highlightSubs:true,highlightBits:true,highlightRaids:true,autoClearChat:false,clearChatSeconds:30,eventsLayout:'vertical',eventsDirection:'down',eventsMode:'slide',eventsPanelSize:'normal',eventsOverlayShape:'normal',eventsOverlayCardSide:'center',eventsCardFrame:true,giftsLayout:'vertical',giftsDirection:'down',giftsMode:'slide',giftsPanelSize:'normal',giftsOverlayShape:'normal',giftsOverlayCardSide:'center',giftsCardFrame:true,giftHighlightStyle:'gold',overlayEventHighlightStyle:'platform',overlayGiftImageSize:'md',overlayGiftComposition:'normal',overlayNameColorMode:'platform',overlayNameColor:'#ffffff',overlayEventFont:'inherit',overlayGiftFont:'inherit',overlayGiftDisplayMode:'full',overlayGiftCompositionMode:'vertical-centered',eventVisibility:{likes:true,follows:true,joins:true,shares:true,system:true,gifts:true,subscriptions:true,bits:true,raids:true,hosts:true,superfan:true}},
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

  function customizationStorageKey() {
    return `sf.customization.preferences.v3.${user?.id || 'guest'}`;
  }
  function saveCustomizationSnapshot() {
    try {
      localStorage.setItem(customizationStorageKey(), JSON.stringify({
        updatedAt: Date.now(),
        personalization: structuredClone(settings.personalization || {})
      }));
    } catch {}
  }
  function loadCustomizationSnapshot() {
    try {
      const raw = localStorage.getItem(customizationStorageKey());
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch { return null; }
  }
  function rehydrateCustomizationFromStorage() {
    let snapshot = loadCustomizationSnapshot();
    if (!snapshot) {
      try {
        const legacy = JSON.parse(localStorage.getItem(`sf.customization.preferences.v2.${user?.id || 'guest'}`) || 'null');
        if (legacy && typeof legacy === 'object') snapshot = legacy;
      } catch {}
    }
    if (!snapshot?.personalization || typeof snapshot.personalization !== 'object') return;
    settings.personalization = merge(settings.personalization || {}, snapshot.personalization);
  }

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
  let roulettePreviewState = { history: [], participants: [], activeWinner: null };
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
    previewEventSeeds:[],
    previewGiftSeeds:[],
    previewEventIndex:0,
    previewGiftIndex:0,
    voiceListPresence:{online:false,connections:0},
    tiktokGiftCatalog:[],
    tiktokGiftIndex:new Map(),
    tiktokGiftCatalogLoaded:false
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
    const p = String(platform || '').toLowerCase();
    if (p === 'tiktok') {
      return isUsableViewerAvatar(account.avatarUrl) ? account.avatarUrl : previewAvatarUrl({ uniqueId: account.username || account.uniqueId || 'tiktok-account' });
    }
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
    verified:'✓', 'voice-power':'🔥', voicepower:'🔥', moderator:'🛡️', mod:'🛡️', vip:'💎', subscriber:'🎟️', subscriber_badge:'🎟️', sub:'🎟️',
    founder:'🏆', premium:'✨', staff:'⚙️', broadcaster:'📣', member:'👤', fanclub:'👻', superfan:'🌟', donor:'🎁', supporter:'🎁'
  };

  function badgeMarkup(raw) {
    if (settings.personalization.showBadges === false) return '';
    const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[ ,|]+/).filter(Boolean) : [];
    const activityKeys = new Set(['like','liked','❤️','follow','followed','follower','👤','join','joined','member-join','👻','share','shared','🗣','🗣️','donor','supporter','🎁','gift','gift-image']);
    const seen = new Set();
    return list.filter(Boolean).filter((b) => {
      const key = String(b).trim().toLowerCase();
      if (activityKeys.has(key)) return false;
      const rendered = String(roleBadgeMap[key] || '•');
      if (seen.has(rendered)) return false;
      seen.add(rendered);
      return true;
    }).slice(0,5).map(b => `<span class="badge-pill" title="${esc(b)}">${esc(roleBadgeMap[String(b).toLowerCase()] || '•')}</span>`).join('');
  }

  function activityStore(platform, key) {
    const p = String(platform || 'tiktok').toLowerCase() === 'twitch' ? 'twitch' : 'tiktok';
    if (!state.activity[p][key]) state.activity[p][key] = { joined:false, like:false, followed:false, shared:false, gift:false, giftImage:'', giftName:'' };
    return state.activity[p][key];
  }
  function profileKey(item) { return normalizeUsername(item.identityKey || item.uniqueId || item.username || item.user || item.displayName || 'user').toLowerCase(); }
  function recordActivity(item) {
    const p = String(item.platform || 'tiktok').toLowerCase(); const key = profileKey(item); const type = String(item.type || item.event || '').toLowerCase();
    const a = activityStore(p, key);
    if (type.includes('join') || type === 'member') a.joined = true;
    if (type === 'like') a.like = true;
    if (type === 'share') a.shared = true;
    if (type === 'follow') a.followed = true;
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
    const badges=[];
    const previewType = String(item?.previewActivityType || '').toLowerCase();
    const previewGiftEmoji = item?.giftEmoji || '';
    if (previewType === 'like' && settings.personalization.highlightLikes !== false) badges.push('<span class="activity-badge" title="Like">❤️</span>');
    if ((previewType === 'join' || previewType === 'member') && settings.personalization.highlightJoins !== false) badges.push('<span class="activity-badge" title="Se unió al directo">👻</span>');
    if (previewType === 'share' && settings.personalization.highlightShares !== false) badges.push('<span class="activity-badge" title="Compartió">🗣️</span>');
    if (previewType === 'follow' && settings.personalization.highlightFollows !== false) badges.push('<span class="activity-badge" title="Seguidor">👤</span>');
    if (previewType === 'bits') badges.push('<span class="activity-badge gift-activity" title="Bits">💎</span>');
    if (previewType === 'sub' || previewType === 'subscription' || previewType === 'subscription-gift') badges.push('<span class="activity-badge gift-activity" title="Suscripción">⭐</span>');
    if (item?.preview === true && previewGiftEmoji) badges.push(`<span class="activity-badge gift-activity" title="${esc(item.giftName || item.gift || 'Regalo')}">${esc(previewGiftEmoji)}</span>`);
    if (item?.preview === true && (item?.gift || item?.giftName) && settings.personalization.highlightGifts !== false) {
      const giftImage = item.giftImage || '';
      if (giftImage) badges.push(`<span class="activity-badge gift-activity gift-last-badge" title="${esc(item.giftName || item.gift || 'Regalo')}"><img src="${esc(giftImage)}" alt=""></span>`);
    }
    if (badges.length) return badges.join('');
    const a = activityStore(item.platform, profileKey(item));
    const itemType = String(item?.type || item?.event || '').toLowerCase();
    if (a.like && settings.personalization.highlightLikes !== false) badges.push('<span class="activity-badge" title="Like">❤️</span>');
    if (a.followed && settings.personalization.highlightFollows !== false) badges.push('<span class="activity-badge" title="Siguió">👤</span>');
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

  const GIFT_ES_MAP = {
    'heartme':'Quiéreme','rose':'Rosa','gg':'GG','tiktok':'TikTok','communityheart':'Corazón de la comunidad','ashardofhope':'Un rayo de esperanza','loveyousomuch':'Te quiero mucho','icecreamcone':'Cono de helado','winkwink':'Guiño','pop':'Pop','freestyle':'Freestyle','fingerheart':'Corazón con los dedos','loveletter':'Carta de amor','icecream':'Helado','cap':'Gorra','moneygun':'Pistola de dinero','flowers':'Flores','fireworks':'Fuegos artificiales','perfume':'Perfume','crown':'Corona','corgi':'Corgi','lovechat':'Chat de amor','doughnut':'Dona','papercrane':'Grulla de papel','confetti':'Confeti','firecracker':'Petardo','panda':'Panda','sportscar':'Auto deportivo','lion':'León','unicorn':'Unicornio','galaxy':'Galaxia','castle':'Castillo','diamond':'Diamante','star':'Estrella','heart':'Corazón','gift':'Regalo','balloon':'Globo','cake':'Pastel','coffee':'Café','beer':'Cerveza','cheers':'Salud','rosebouquet':'Ramo de rosas','bouquet':'Ramo','sunflower':'Girasol','tiktokuniverse':'Universo de TikTok'
  };
  const GIFT_WORD_ES = [
    [/\bheart(s)?\b/gi,'corazón'],[/\blove\b/gi,'amor'],[/\byou\b/gi,'tú'],[/\bme\b/gi,'mí'],[/\bsomuch\b/gi,'muchísimo'],[/\brose(s)?\b/gi,'rosa'],[/\bflower(s)?\b/gi,'flor'],[/\bflower\b/gi,'flor'],[/\bice cream\b/gi,'helado'],[/\bcone\b/gi,'cono'],[/\bcommunity\b/gi,'comunidad'],[/\bhope\b/gi,'esperanza'],[/\bshard\b/gi,'fragmento'],[/\bice\b/gi,'hielo'],[/\bcream\b/gi,'crema'],[/\bwink\b/gi,'guiño'],[/\bgift\b/gi,'regalo'],[/\bfireworks?\b/gi,'fuegos artificiales'],[/\bcake\b/gi,'pastel'],[/\bballoon\b/gi,'globo'],[/\bcrown\b/gi,'corona'],[/\bperfume\b/gi,'perfume'],[/\bdiamond\b/gi,'diamante'],[/\bstar\b/gi,'estrella'],[/\bcoffee\b/gi,'café'],[/\bcar\b/gi,'auto'],[/\bsports?\b/gi,'deporte'],[/\bunicorn\b/gi,'unicornio'],[/\blion\b/gi,'león'],[/\bking\b/gi,'rey'],[/\bqueen\b/gi,'reina'],[/\bdragon\b/gi,'dragón'],[/\bcastle\b/gi,'castillo'],[/\bworld\b/gi,'mundo'],[/\buniverse\b/gi,'universo'],[/\bparty\b/gi,'fiesta'],[/\bpop\b/gi,'pop'],[/\bgg\b/gi,'GG'],[/\btiktok\b/gi,'TikTok']
  ];
  function normalizeGiftKey(value) { return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'').trim(); }
  function giftDisplayName(itemOrName) {
    const obj = itemOrName && typeof itemOrName === 'object' ? itemOrName : {name:itemOrName};
    const raw = String(obj.displayNameEs || obj.giftName || obj.gift || obj.name || obj.title || obj.key || 'Regalo').trim();
    const key = normalizeGiftKey(obj.key || raw);
    if (GIFT_ES_MAP[key]) return GIFT_ES_MAP[key];
    let translated = raw;
    for (const [re, repl] of GIFT_WORD_ES) translated = translated.replace(re, repl);
    return translated || 'Regalo';
  }
  async function loadTikTokGiftCatalog() {
    if (state.tiktokGiftCatalogLoaded) return state.tiktokGiftCatalog;
    try {
      const res = await fetch('/data/tiktok-gifts.json',{cache:'no-store'});
      if (!res.ok) throw new Error('gift catalog');
      const data = await res.json();
      const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
      state.tiktokGiftCatalog = items;
      state.tiktokGiftIndex = new Map();
      for (const item of items) {
        for (const candidate of [item.key,item.name,item.alt,item.id]) {
          const k=normalizeGiftKey(candidate); if(k && !state.tiktokGiftIndex.has(k)) state.tiktokGiftIndex.set(k,item);
        }
      }
      state.tiktokGiftCatalogLoaded = true;
      if (page==='customize' && activeCustomizeTab==='gifts') renderCustomizePreviewOnly({force:true});
    } catch { state.tiktokGiftCatalogLoaded=true; state.tiktokGiftCatalog=[]; state.tiktokGiftIndex=new Map(); }
    return state.tiktokGiftCatalog;
  }
  function lookupTikTokGift(value) { const key=normalizeGiftKey(value); return key ? (state.tiktokGiftIndex.get(key)||null) : null; }

  function fontFamilyName(value) {
    const v = String(value || settings.personalization?.font || 'inter').toLowerCase();
    return ({
      inherit:'Inter, Manrope, sans-serif', inter:'Inter, Manrope, sans-serif', poppins:'Poppins, sans-serif',
      montserrat:'Montserrat, sans-serif', oswald:'Oswald, sans-serif', system:'system-ui, sans-serif',
      roboto:'Roboto, Arial, sans-serif', nunito:'Nunito, Arial, sans-serif', lato:'Lato, Arial, sans-serif', opensans:'Open Sans, Arial, sans-serif'
    })[v] || 'Inter, Manrope, sans-serif';
  }

  function styleVars(item, kind='chat') {
    const p = settings.personalization || {};
    const platform = String(item.platform || 'tiktok').toLowerCase();
    const accent = platform === 'twitch' ? '#9146ff' : '#fe2c55';
    const textColor = p.textColor === 'auto' || !p.textColor ? '#e8ecf4' : p.textColor;
    const font = kind === 'event' ? fontFamilyName(p.overlayEventFont || p.font) : kind === 'gift' ? fontFamilyName(p.overlayGiftFont || p.font) : fontFamilyName(p.font);
    return `--row-accent:${accent};--name-color:${nameColor(item)};--message-color:${textColor};--bubble-radius:${Number(p.bubbleRadius ?? 12)}px;--avatar-border-width:${Number(p.avatarBorderWidth ?? 2)}px;--row-gap:${Number(p.rowGap ?? 5)}px;--message-padding:${Number(p.messagePadding ?? 7)}px 9px;--chat-font:${font}`;
  }

  function giftMedia(item) {
    const giftObj = item.gift && typeof item.gift === 'object' ? item.gift : null;
    const image = item.giftImage || giftObj?.image || giftObj?.url || giftObj?.imageUrl || '';
    const rawName = (typeof item.gift === 'string' ? item.gift : '') || item.giftName || giftObj?.name || giftObj?.title || 'Regalo';
    const name = giftDisplayName({...(giftObj||{}), giftName:rawName, key:giftObj?.key || item.giftKey});
    if (!image && !name) return '';
    const amount = item.amount == null || item.amount === '' ? 1 : item.amount;
    return `<div class="gift-media gift-media-real">${image ? `<img src="${esc(image)}" alt="${esc(name)}" loading="lazy" onerror="this.remove()">` : ''}<span>${esc(name)}</span><strong>×${esc(amount)}</strong></div>`;
  }

  function stripEmojis(value) {
    return String(value || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').replace(/\s{2,}/g,' ').trim();
  }

  function displayNameForActivity(item) {
    const placeholders = new Set(['usuario','user','evento','accion social','acción social','unknown','desconocido','event','undefined','null','n/a','na']);
    const values = [
      item?.displayName,
      item?.nickname,
      item?.user,
      item?.username,
      item?.uniqueId
    ];
    for (const value of values) {
      const text = String(value || '').trim();
      if (text && !placeholders.has(text.toLowerCase())) return text;
    }
    return 'Usuario';
  }

  function normalizeIncomingActivity(item) {
    const entry = { ...(item || {}) };
    const type = String(entry.type || '').trim().toLowerCase();
    const allowed = new Set(['like','follow','share','join','gift','sub','subscription','resub','bits','raid','host','superfan','fanclub','question','system']);
    if (!allowed.has(type)) return entry;
    entry.type = type;
    entry.group = entry.group || (['gift','sub','subscription','resub','bits','raid','host'].includes(type) ? 'gift' : ['like','follow','share','join'].includes(type) ? 'event' : 'system');
    if (type === 'share') { entry.action = 'Compartió'; entry.emoji = '🗣️'; }
    if (type === 'follow') { entry.action = 'Follow'; entry.emoji = '👤'; }
    if (type === 'like') { entry.action = 'Like'; entry.emoji = '❤️'; }
    if (type === 'join') { entry.action = 'Entrada'; entry.emoji = '👻'; }
    if (!entry.identityKey) entry.identityKey = normalizeUsername(entry.uniqueId || entry.username || entry.user || entry.displayName || '').toLowerCase();
    if (!entry.username) entry.username = entry.uniqueId || '';
    if (!entry.displayName) entry.displayName = entry.user || entry.nickname || entry.uniqueId || '';
    return entry;
  }

  function messageRow(item, kind='chat') {
    const p = settings.personalization || {};
    const platform = String(item.platform || 'tiktok').toLowerCase();
    const userName = displayNameForActivity(item);
    const identity = avatarIdentity(item);
    const rawBody = item.message || item.action || '';
    const body = p.showEmotes === false ? stripEmojis(rawBody) : rawBody;
    const time = new Date(item.timestamp || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false });
    const avatar = item.preview === true ? previewAvatarUrl(item) : (isUsableViewerAvatar(item.avatar) ? item.avatar : '');
    const isGift = kind === 'gift' || eventVisibilityKey(item) === 'gifts' || Boolean(item.gift || item.giftName);
    const showTime = p.showTimestamps !== false;
    const showPlatform = p.showPlatformPill !== false;
    const theme = p.chatTheme || 'cloud';
    const animation = kind==='event' ? (p.eventsMode || 'slide') : kind==='gift' ? (p.giftsMode || 'slide') : (p.animation || 'slide');
    const avatarHtml = avatar
      ? `<img src="${esc(avatar)}" alt="${esc(userName)}" loading="lazy">`
      : (item.preview === true
        ? `<img src="${esc(previewAvatarUrl(item))}" alt="${esc(userName)}" loading="lazy">`
        : `<img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(identity)}" src="" alt="${esc(userName)}" loading="lazy">`);
    const messageHtml = isGift ? giftMedia(item) : (body ? esc(body) : '');
    const rowKey = eventFingerprint(item, kind);
    return `<article class="stream-row ${kind} ${platform} ${isGift ? 'gift-row' : ''} chat-theme-${theme} chat-anim-${animation} ${isSupporter(item) ? 'supporter-gold' : ''} ${p.chatAdjustMessages !== false ? 'chat-adjust' : 'chat-no-adjust'}" data-stream-key="${esc(rowKey)}" style="${styleVars(item, kind)}">
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
    if (String(item?.activityKind||'').toLowerCase()==='gift') return 'gift';
    const type = String(item?.type || item?.event || '').toLowerCase();
    return (type.includes('gift') || Boolean(item?.gift || item?.giftName)) ? 'gift' : 'event';
  }
  function streamActivityRow(item, kind='event') {
    const p=settings.personalization||{};
    const platform=String(item.platform||'tiktok').toLowerCase();
    const userName=displayNameForActivity(item);
    const identity=avatarIdentity(item);
    const avatar=isUsableViewerAvatar(item.avatar)?item.avatar:'';
    const avatarHtml=avatar ? `<img src="${esc(avatar)}" alt="${esc(userName)}" loading="lazy">` : `<img data-avatar-platform="${esc(platform)}" data-avatar-user="${esc(identity)}" src="" alt="${esc(userName)}" loading="lazy">`;
    const isGift=kind==='gift';
    const itemType=String(item?.type||'').toLowerCase();
    const typeLabel=String(item.action||item.type|| (isGift?'Regalo':'Evento')).toUpperCase();
    const rawText=item.message||item.action||'';
    const cleanText=stripEmojis(rawText)||rawText;
    const highlight=isGift?(p.giftHighlightStyle||'gold'):(p.overlayEventHighlightStyle||'platform');
    const accent=highlight==='gold'?'#f5d063':highlight==='accent'?'#9d7dff':highlight==='platform'?(platform==='twitch'?'#9146ff':'#fe2c55'):'transparent';
    const font=fontFamilyName(isGift ? (p.overlayGiftFont||p.font) : (p.overlayEventFont||p.font));
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
      const rawGiftName=(typeof item.gift==='string'?item.gift:'')||item.giftName||giftObj?.name||giftObj?.title||'Regalo';
      const giftName=giftDisplayName({...(giftObj||{}),giftName:rawGiftName,key:giftObj?.key||item.giftKey});
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
    return ({likes:'❤️',follows:'👤',joins:'👻',shares:'🗣️',subscriptions:'⭐',bits:'💎',raids:'🚀',hosts:'📣',gifts:'🎁',superfan:'🌟',system:'•'})[key]||'•';
  }
  function activityItemKey(item, kind){
    const id=String(item?.id||item?.messageId||item?.eventId||item?.activityId||item?.giftId||'').trim();
    if(id) return `activity:${kind}:${String(item?.platform||'').toLowerCase()}:${id}`;
    const platform=String(item?.platform||'tiktok').toLowerCase();
    const user=String(item?.uniqueId||item?.username||item?.user||item?.displayName||'').trim().toLowerCase();
    const ts=Number(item?.timestamp||0);
    const type=String(item?.type||item?.event||item?.group||kind).toLowerCase();
    const gift=String(item?.giftKey||item?.giftId||item?.giftName||item?.gift||'').trim().toLowerCase();
    const amount=String(item?.amount??item?.bits??'').trim();
    return `activity:${kind}:${platform}:${user}:${ts}:${type}:${gift}:${amount}`;
  }
  function renderActivityItem(item){
    const kind=activityKind(item);
    const style=kind==='gift' ? (settings.personalization?.giftStyle||'chat') : (settings.personalization?.eventStyle||'chat');
    const html=style==='stream' ? streamActivityRow(item,kind) : messageRow(item,kind);
    const key=activityItemKey(item,kind);
    return html.replace(/^<article\b/, `<article data-activity-key=\"${esc(key)}\"`);
  }
  function eventVisibilityKey(item) {
    const type = String(item?.type || item?.event || '').toLowerCase();
    // Monetary/support actions belong to Regalos, never to Eventos.
    if (item?.activityKind === 'gift' || item?.gift || item?.giftName || type.includes('gift')) return 'gifts';
    if (type === 'bits' || item?.bits) return 'gifts';
    if (type === 'sub' || type.includes('subscription')) return 'gifts';
    if (type === 'like') return 'likes';
    if (type.includes('follow') || type === 'follow') return 'follows';
    if (type.includes('join') || type === 'member') return 'joins';
    if (type.includes('share')) return 'shares';
    if (type.includes('superfan') || type.includes('super fan')) return 'superfan';
    if (type === 'raid' || type.includes('raid')) return 'raids';
    if (type === 'host' || type.includes('host')) return 'hosts';
    if (type.includes('stream_start') || type.includes('live_start') || type.includes('live started') || type.includes('began')) return 'system';
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
    const filtered=state.chat.slice(-300).filter(item=>(!autoClear||!item.timestamp||Number(item.timestamp)>=cutoff) && (selectedFilter==='all'||String(item.platform||'').toLowerCase()===selectedFilter));
    return orderedItems(filtered, settings.personalization?.chatDirection || 'down');
  }
  function eventFingerprint(item, kind='event') {
    const platform=String(item?.platform||'').toLowerCase();
    const user=normalizeUsername(item?.identityKey||item?.uniqueId||item?.username||item?.user||item?.displayName||'user').toLowerCase();
    const type=String(item?.type||item?.event||kind).toLowerCase();
    const text=String(item?.message||item?.action||item?.giftName||item?.gift||'').trim().toLowerCase();
    const gift=String(item?.giftId||item?.gift?.id||item?.stickerId||'').toLowerCase();
    const sourceId=String(item?.messageId||item?.commentId||item?.eventId||item?.msgId||'').trim().toLowerCase();
    const avatar=String(item?.avatar||item?.avatarUrl||item?.profilePictureUrl||'').trim().toLowerCase();
    const ts=Number(item?.timestamp||0); const bucket=ts?Math.floor(ts/1200):0;
    return sourceId?`${kind}|${platform}|${sourceId}|${user}`:`${kind}|${platform}|${user}|${type}|${text}|${gift}|${avatar}|${bucket}`;
  }
  const SMART_SCROLL_IDLE_MS = 5000;
  const dashboardChatScrollState = {pinned:true,top:0,initialized:false,direction:'down',manual:false,manualAt:0,programmatic:false,pendingNewest:false};
  const dashboardActivityScrollState = new WeakMap();
  function dashboardPinned(box, direction) {
    const threshold=40;
    return direction==='up' ? box.scrollTop<=threshold : box.scrollHeight-box.scrollTop-box.clientHeight<=threshold;
  }
  function markDashboardManualScroll(state, box) {
    state.manual=true; state.manualAt=Date.now(); state.top=box.scrollTop;
  }
  function bindDashboardChatScroll(box, direction) {
    if (!box) return;
    box.dataset.scrollDirection=direction;
    if (box.dataset.scrollTracking==='1') return;
    box.dataset.scrollTracking='1';
    box.addEventListener('scroll',()=>{
      const d=box.dataset.scrollDirection||'down';
      const pinned=dashboardPinned(box,d);
      const state=dashboardChatScrollState;
      if (!state.programmatic) markDashboardManualScroll(state,box);
      state.pinned=pinned;
      state.initialized=true;
      state.direction=d;
      if (pinned) { state.manual=false; state.pendingNewest=false; }
    },{passive:true});
  }
  function dashboardProgrammaticScroll(box, fn){
    const state=dashboardChatScrollState;
    state.programmatic=true;
    try{fn();}finally{requestAnimationFrame(()=>{state.programmatic=false;});}
  }
  function dashboardShouldFollowNew(state){
    return !state.manual || (state.manualAt && Date.now()-state.manualAt>=SMART_SCROLL_IDLE_MS);
  }
  function placeDashboardChat(box,direction,force=false,newestChanged=false) {
    if (!box) return;
    bindDashboardChatScroll(box,direction);
    const state=dashboardChatScrollState;
    const shouldFollow = force || !state.initialized || state.pinned || (newestChanged && dashboardShouldFollowNew(state));
    const rows = box.querySelectorAll('.stream-row.chat');
    const target = rows.length ? (direction === 'up' ? rows[0] : rows[rows.length - 1]) : null;
    const follow = () => {
      dashboardProgrammaticScroll(box,()=>{
        if (shouldFollow) {
          if (target) target.scrollIntoView({block:'nearest', inline:'nearest', behavior:'auto'});
          else box.scrollTop = direction==='up' ? 0 : box.scrollHeight;
        } else {
          box.scrollTop=Math.min(state.top,Math.max(0,box.scrollHeight-box.clientHeight));
        }
      });
      state.initialized=true; state.direction=direction;
      if(shouldFollow){state.pinned=true;state.manual=false;state.pendingNewest=false;}
    };
    requestAnimationFrame(()=>{ follow(); requestAnimationFrame(()=>{ if(shouldFollow) follow(); }); });
  }
  function bindDashboardActivityScroll(box,key,direction='down'){
    if(!box) return;
    let state=dashboardActivityScrollState.get(box);
    if(!state){ state={pinned:true,initialized:false,manual:false,manualAt:0,programmatic:false,top:0,direction}; dashboardActivityScrollState.set(box,state); }
    box.dataset.scrollDirection=direction;
    if(box.dataset.smartScrollTracking==='1') return;
    box.dataset.smartScrollTracking='1';
    box.addEventListener('scroll',()=>{
      const d=box.dataset.scrollDirection||'down';
      if(!state.programmatic){ state.manual=true; state.manualAt=Date.now(); state.top=box.scrollTop; }
      state.pinned=dashboardPinned(box,d); state.initialized=true; state.direction=d;
      if(state.pinned){state.manual=false;state.pendingNewest=false;}
    },{passive:true});
  }
  function placeDashboardActivity(box,key,direction='down',force=false,newestChanged=false){
    if(!box) return;
    const state=dashboardActivityScrollState.get(box)||{pinned:true,initialized:false,manual:false,manualAt:0,programmatic:false,top:0,direction:'down'};
    dashboardActivityScrollState.set(box,state);
    if(state.direction !== direction){
      state.direction=direction;
      state.initialized=false;
      state.pinned=true;
      state.manual=false;
      state.manualAt=0;
      state.top=0;
    }
    bindDashboardActivityScroll(box,key,direction);
    const shouldFollow=force||!state.initialized||state.pinned||(newestChanged&&(!state.manual||Date.now()-state.manualAt>=SMART_SCROLL_IDLE_MS));
    state.programmatic=true;
    requestAnimationFrame(()=>{
      if(shouldFollow) box.scrollTop=direction==='up'?0:box.scrollHeight;
      else box.scrollTop=Math.min(state.top,Math.max(0,box.scrollHeight-box.clientHeight));
      requestAnimationFrame(()=>{state.programmatic=false;state.initialized=true;state.direction=direction;if(shouldFollow){state.pinned=true;state.manual=false;state.pendingNewest=false;}});
    });
  }
  function dashboardActivityHorizontalClass(){
    const p=settings.personalization||{};
    const eventsHorizontal=(p.eventStyle||'chat')==='chat' && (p.eventsLayout||'vertical')==='horizontal';
    const giftsHorizontal=(p.giftStyle||'chat')==='chat' && (p.giftsLayout||'vertical')==='horizontal';
    return (eventsHorizontal || giftsHorizontal) ? 'activity-layout-horizontal' : '';
  }
  function updateDashboardFeeds() {
    if(page!=='dashboard') return;
    const chatBox=$('dashChat'), activityBox=$('dashActivity');
    if(!chatBox||!activityBox){ renderDashboard(true); return; }
    const chat=visibleChatItems(), activity=unifiedActivityItems();
    const chatSignature=chat.map(x=>eventFingerprint(x,'chat')).join('|');
    const activitySignature=activity.map(x=>eventFingerprint(x,'activity')).join('|');
    const chatDirection=settings.personalization?.chatDirection || 'down';
    const chatLayout=settings.personalization?.chatLayout || 'vertical';
    chatBox.classList.toggle('direction-up', chatDirection==='up');
    chatBox.classList.toggle('layout-horizontal', chatLayout==='horizontal');
    bindDashboardChatScroll(chatBox, chatDirection);
    const prevChatSig=chatBox.dataset.signature||'';
    const chatNewestKey=chat.length?eventFingerprint(chat[chat.length-1],'chat'):'';
    const chatNewestChanged=chatNewestKey!==String(chatBox.dataset.newestKey||'');
    if(chatBox.dataset.signature!==chatSignature){
      bindDashboardChatScroll(chatBox, chatDirection);
      chatBox.innerHTML=chat.length?chat.map(x=>messageRow(x)).join(''):'<div class="empty">No hay comentarios para este filtro todavía.</div>';
      chatBox.dataset.signature=chatSignature; chatBox.dataset.newestKey=chatNewestKey; queueAvatarImages(chatBox);
      requestAnimationFrame(()=>placeDashboardChat(chatBox,chatDirection,false,chatNewestChanged||!prevChatSig));
    }
    const activityDirection=settings.personalization?.eventsDirection || 'down';
    activityBox.classList.toggle('direction-up', activityDirection==='up');
    activityBox.classList.toggle('activity-layout-horizontal', dashboardActivityHorizontalClass() === 'activity-layout-horizontal');
    bindDashboardActivityScroll(activityBox,'activity',activityDirection);
    const orderedActivity=orderedItems(activity, activityDirection);
    const prevActivitySig=activityBox.dataset.signature||'';
    const newestActivityItem=activity.length ? activity[activity.length-1] : null;
    const activityNewestKey=newestActivityItem ? eventFingerprint(newestActivityItem,'activity') : '';
    const activityNewestChanged=activityNewestKey!==String(activityBox.dataset.newestKey||'');
    if(activityBox.dataset.signature!==activitySignature || activityBox.dataset.direction!==activityDirection){
      activityBox.dataset.direction=activityDirection;
      bindDashboardActivityScroll(activityBox,'activity',activityDirection);
      const ordered=orderedActivity;
      const existing=new Map(Array.from(activityBox.querySelectorAll('[data-activity-key]')).map(node=>[node.dataset.activityKey,node]));
      const wanted=new Set();
      const fragment=document.createDocumentFragment();
      for(const item of ordered){
        const kind=activityKind(item);
        const key=activityItemKey(item,kind);
        wanted.add(key);
        const oldNode=existing.get(key);
        if(oldNode) fragment.appendChild(oldNode);
        else{
          const holder=document.createElement('div');
          holder.innerHTML=renderActivityItem(item).trim();
          const node=holder.firstElementChild;
          if(node) fragment.appendChild(node);
        }
      }
      for(const node of Array.from(activityBox.querySelectorAll('[data-activity-key]'))){
        if(!wanted.has(node.dataset.activityKey)) node.remove();
      }
      const empty=activityBox.querySelector('.empty');
      if(ordered.length){ if(empty) empty.remove(); activityBox.appendChild(fragment); }
      else if(!empty) activityBox.innerHTML='<div class="empty">Aún no hay actividad.</div>';
      activityBox.dataset.signature=activitySignature; activityBox.dataset.newestKey=activityNewestKey; queueAvatarImages(activityBox);
      requestAnimationFrame(()=>placeDashboardActivity(activityBox,'activity',activityDirection,!prevActivitySig,activityNewestChanged||!prevActivitySig));
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
    const chatDirection=settings.personalization?.chatDirection || 'down';
    const chatLayout=settings.personalization?.chatLayout || 'vertical';
    const activityDirection=settings.personalization?.eventsDirection || 'down';
    const initialActivity=orderedItems(activity,activityDirection);
    $('view').innerHTML=`<div class="hero"><div><div class="dashboard-connection-status ${status.dot}"><span class="status-dot"></span><strong>${esc(status.label)}</strong><span class="status-glitch" aria-hidden="true"></span></div><h2>Todo lo que pasa en tu live,<br><em>en un solo lugar.</em></h2><p>Tu conexión permanece activa aunque cambies de sección o abras otras pestañas. El chat, eventos y regalos siguen entrando en segundo plano.</p></div></div>
      <div class="dashboard-grid"><section class="card feed"><header><div><p class="eyebrow">EN VIVO</p><h3>Chat unificado</h3></div><div class="header-actions"><select id="dashChatFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></div></header><div id="dashChat" class="chat-feed ${chatDirection==='up'?'direction-up ':''}${chatLayout==='horizontal'?'layout-horizontal':''}">${chat.length?chat.map(x=>messageRow(x)).join(''):'<div class="empty">No hay comentarios para este filtro todavía.</div>'}</div></section>
      <section class="card activity activity-panel"><header><div><p class="eyebrow">ACTIVIDAD</p><h3>Eventos & regalos</h3></div><div class="activity-toolbar"><select id="dashActivityFilter"><option value="all">Todos</option><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select><button id="dashActivitySettings" class="icon-btn" type="button" title="Ajustes de actividad">⚙</button></div></header><div id="dashActivity" class="event-feed ${activityDirection==='up'?'direction-up ':''}${dashboardActivityHorizontalClass()}" data-direction="${activityDirection}">${initialActivity.length?initialActivity.map(renderActivityItem).join(''):'<div class="empty">Aún no hay actividad.</div>'}</div><div id="dashActivityPopup" class="activity-settings-layer" hidden><div class="activity-settings-backdrop" data-close-activity-settings></div><div class="activity-settings-popover" role="dialog" aria-modal="true"><div class="popover-head"><div><p class="eyebrow">AJUSTES DE ACTIVIDAD</p><strong>Qué se mostrará</strong></div><button id="closeActivitySettings" class="mini-close" type="button" aria-label="Cerrar">×</button></div><p class="muted popover-description">Activa o desactiva cada tipo de actividad.</p><div class="activity-settings-grid">${['likes','bits','follows','joins','shares','subscriptions','raids','hosts','gifts','superfan','system'].map(k=>`<label><input type="checkbox" data-activity-visibility="${k}" ${(settings.personalization?.eventVisibility?.[k]??true)!==false?'checked':''}><span>${({likes:'Like',bits:'💎',follows:'Seguidores',joins:'Se unió al directo',shares:'Compartió',subscriptions:'Suscripciones',raids:'Raids',hosts:'Hosts',gifts:'Envió regalo',superfan:'Superfan',system:'Otros eventos'})[k]}</span><em>${({likes:'❤️',bits:'💎',follows:'👤',joins:'👻',shares:'🗣️',subscriptions:'⭐',raids:'🚀',hosts:'📣',gifts:'🎁',superfan:'🌟',system:'•'})[k]}</em></label>`).join('')}</div></div></div></section></div>`;
    const cf=$('dashChatFilter');cf.value=settings.filters.chat||'all';cf.onchange=()=>{settings.filters.chat=cf.value;renderDashboard(true);};
    const af=$('dashActivityFilter');af.value=settings.filters.activity||'all';af.onchange=()=>{settings.filters.activity=af.value;updateDashboardFeeds();};
    const popup=$('dashActivityPopup'); const toggleActivitySettings=(open)=>{if(!popup)return;popup.hidden=!open;document.body.classList.toggle('activity-settings-open',open);};
    $('dashActivitySettings')?.addEventListener('click',()=>toggleActivitySettings(popup.hidden)); $('closeActivitySettings')?.addEventListener('click',()=>toggleActivitySettings(false)); popup?.querySelector('[data-close-activity-settings]')?.addEventListener('click',()=>toggleActivitySettings(false));
    popup?.querySelectorAll('[data-activity-visibility]').forEach(input=>input.addEventListener('change',async()=>{const key=input.dataset.activityVisibility;settings.personalization.eventVisibility=settings.personalization.eventVisibility||{};settings.personalization.eventVisibility[key]=input.checked;try{await persistSettingsPatch({personalization:settings.personalization},false);}catch(e){toast('No se guardó',e.message,'err');}updateDashboardFeeds();}));
    const chatBox=$('dashChat'), activityBox=$('dashActivity'); const activityDirectionNow=settings.personalization?.eventsDirection || 'down'; chatBox.dataset.signature=chat.map(x=>eventFingerprint(x,'chat')).join('|'); activityBox.dataset.signature=activity.map(x=>eventFingerprint(x,'activity')).join('|'); activityBox.dataset.direction=activityDirectionNow; bindDashboardChatScroll(chatBox,chatDirection); bindDashboardActivityScroll(activityBox,'activity',activityDirectionNow); queueAvatarImages(); requestAnimationFrame(()=>{placeDashboardChat(chatBox,chatDirection,true);placeDashboardActivity(activityBox,'activity',activityDirectionNow,true,true);});
    if(settings.personalization?.autoClearChat===true) dashboardClearTimer=setInterval(updateDashboardFeeds,1000);
  }

  function invalidatePlatformSession(platform){
    const key=String(platform||'').toLowerCase();
    if(!state.accounts[key]) state.accounts[key]={};
    state.accounts[key]={...state.accounts[key],connected:false,live:false,mode:'saved',connectionId:''};
    renderTop();
    updateDashboardConnectionStatus();
  }

  function waitForSocketReady(timeoutMs=9000){
    if(socket?.connected) return Promise.resolve(socket);
    if(!socket) setupSocket();
    return new Promise((resolve, reject) => {
      const current = socket;
      if(current?.connected) return resolve(current);
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('No se pudo establecer la conexión con StreamFusion.'));
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        current?.off('connect', onConnect);
        current?.off('connect_error', onError);
      };
      const onConnect = () => { cleanup(); resolve(current); };
      const onError = (err) => { cleanup(); reject(err instanceof Error ? err : new Error(err?.message || 'No se pudo conectar.')); };
      current?.once('connect', onConnect);
      current?.once('connect_error', onError);
    });
  }

  async function connectPlatform(platform, inputId, emitEvent, buttonId){
    const input=$(inputId);
    const button=$(buttonId);
    const value=String(input?.value || '').trim();
    if(!value){ toast(platform==='tiktok'?'TikTok':'Twitch', `Escribe ${platform==='tiktok'?'@usuario':'el canal'} antes de conectar.`, 'err'); input?.focus(); return; }
    const original=button?.textContent || 'Conectar';
    if(button){ button.disabled=true; button.dataset.connecting='true'; button.textContent='Conectando…'; }
    try{
      invalidatePlatformSession(platform);
      const ready=await waitForSocketReady();
      ready.emit(emitEvent, value, (ack) => {
        if(ack?.ok){ toast(platform==='tiktok'?'TikTok':'Twitch', ack.message || 'Conexión iniciada.'); }
        else if(ack?.error){ toast('Conexión', ack.error, 'err'); }
      });
    }catch(err){
      toast('Conexión', err?.message || 'No se pudo iniciar la conexión.', 'err');
      if(button){ button.disabled=false; button.removeAttribute('data-connecting'); button.textContent=original; }
      return;
    }
    setTimeout(()=>{ if(button){ button.disabled=false; button.removeAttribute('data-connecting'); button.textContent=original; } }, 12000);
  }

  function renderConnections() {
    const card = (platform, label, placeholder) => {
      const a=state.accounts[platform]||{};
      const accountAvatar = platform === 'tiktok' && a.connected ? previewAvatarUrl({uniqueId:a.username||'tiktok-account'}) : (platform === 'twitch' && a.connected ? connectedAccountAvatarUrl(platform, a) : '');
      return `<article class="card connection-card"><div class="connection-top"><span class="connection-avatar">${a.connected && accountAvatar ? `<img src="${esc(accountAvatar)}" alt="">` : `<span class="account-avatar-initial large">${platform==='tiktok'?'TT':'TW'}</span>`}</span><div><p class="eyebrow">${label.toUpperCase()}</p><h3>${esc(a.username || 'Sin conectar')}</h3><span class="status ${a.connected?'on':''}"><i></i>${a.connected?(a.live?'En directo':'Conectado'):'Desconectado'}</span></div></div><label>Cuenta<input id="${platform}Input" value="${esc(a.username||'')}" placeholder="${placeholder}"></label><div class="row"><button class="btn primary" id="${platform}Connect">Conectar</button><button class="btn secondary" id="${platform}Disconnect">Desconectar</button></div><p class="muted">La foto de TikTok aquí es solo decorativa. El chat, eventos y regalos reales usan exclusivamente el avatar real entregado por la plataforma.</p></article>`;
    };
    $('view').innerHTML=`<div class="intro"><h2>Conecta tus canales</h2><p>La conexión es compartida por el sistema; el chat, eventos y overlays utilizan la misma fuente de eventos, pero conservan diseños independientes.</p></div><div class="connection-grid">${card('tiktok','TikTok','@usuario')}${card('twitch','Twitch','canal')}</div><div class="notice">El avatar mostrado aquí se resuelve desde la plataforma cuando está disponible. La foto también se reutiliza en la barra superior y en los mensajes del dashboard.</div>`;
    $('tiktokConnect').onclick=()=>connectPlatform('tiktok','tiktokInput','connectTikTok','tiktokConnect');
    $('tiktokDisconnect').onclick=async()=>{try{const ready=await waitForSocketReady();ready.emit('disconnectTikTok');}catch(err){toast('TikTok',err?.message||'No se pudo desconectar.','err');}};
    $('twitchConnect').onclick=()=>connectPlatform('twitch','twitchInput','connectTwitch','twitchConnect');
    $('twitchDisconnect').onclick=async()=>{try{const ready=await waitForSocketReady();ready.emit('disconnectTwitch');}catch(err){toast('Twitch',err?.message||'No se pudo desconectar.','err');}};
  }

  const markSelectedOption = (opts, value) => {
    const wanted = String(value ?? '');
    return String(opts || '').replace(/<option\b([^>]*)value=(\"|')([^\"']*)(\"|')([^>]*)>/gi, (full, before, q1, optionValue, q2, after) => {
      const clean = String(optionValue);
      const withoutSelected = `${before} ${after}`.replace(/\sselected(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s>]+))?/gi, '');
      return `<option${withoutSelected} value=\"${esc(clean)}\"${clean === wanted ? ' selected' : ''}>`;
    });
  };
  const ctl = (label,id,type,value,opts='') => type==='check'
    ? `<label class="toggle"><input id="${id}" type="checkbox" ${value?'checked':''}><span>${label}</span></label>`
    : `<label>${label}<${type==='select'?'select':'input'} id="${id}" class="select" ${type==='input' ? `type="${typeof value === 'number' ? 'number' : /^#[0-9a-f]{6}$/i.test(String(value)) ? 'color' : 'text'}" value="${esc(value ?? '')}"` : ''}>${type==='select'?markSelectedOption(opts,value):''}</${type==='select'?'select':'input'}></label>`;
  const setSelect = (id, value) => { const el=$(id); if(el && el.tagName==='SELECT') el.value=String(value ?? ''); };
  const setCheck = (id, value) => { const el=$(id); if(el && el.type==='checkbox') el.checked=Boolean(value); };


  function previewSeed() {
    if (!state.previewChat.length) {
      const base = Date.now() - 3000;
      state.previewChat = [
        {preview:true,platform:'tiktok',displayName:'LunaByte',username:'lunabyte',uniqueId:'lunabyte',badges:['verified'],message:'¡Se ve genial este diseño!',timestamp:base},
        {preview:true,platform:'twitch',displayName:'MauroLive',username:'maurolive',uniqueId:'maurolive',badges:['subscriber'],message:'Saludos desde Twitch 👋',timestamp:base + 1000},
        {preview:true,platform:'tiktok',displayName:'Sofi_gg',username:'sofi_gg',uniqueId:'sofi_gg',message:'¿Podemos probar otra fuente?',timestamp:base + 2000}
      ];
    }
    return state.previewChat;
  }


  function orderedItems(items, direction='down') {
    const ordered = items.map((item,index)=>({item,index})).sort((a,b)=>{
      const ta=Number(a.item?.timestamp||0), tb=Number(b.item?.timestamp||0);
      return ta === tb ? a.index - b.index : ta - tb;
    }).map(x=>x.item);
    return direction === 'up' ? ordered.reverse() : ordered;
  }

  function chatPreviewHtml() {
    const direction = settings.personalization?.chatDirection || 'down';
    const list=previewSeed().slice();
    if(settings.voiceBot?.power?.enabled){ const base=Number(list[list.length-1]?.timestamp||Date.now())+1000; list.push({preview:true,platform:'tiktok',displayName:'FuegoUser',username:'fuegouser',uniqueId:'fuegouser',badges:['voice-power'],message:`${settings.voiceBot?.power?.commandPrefix||'.'}Goku ¡Hola chat!`,timestamp:base}); }
    return orderedItems(list, direction).map(x=>messageRow(x)).join('');
  }

  let customizePreviewSignature = '';
  const previewScrollState = new WeakMap();
  function previewScrollIsPinned(box, direction) { const threshold=32; return direction==='up' ? box.scrollTop<=threshold : box.scrollHeight-box.scrollTop-box.clientHeight<=threshold; }
  function previewScrollStateFor(box,direction){ let state=previewScrollState.get(box); if(!state){state={pinned:true,initialized:false,manual:false,manualAt:0,programmatic:false,top:0,direction};previewScrollState.set(box,state);} state.direction=direction; return state; }
  function applyPreviewScroll(box,direction,mode='auto',newestChanged=false){
    const state=previewScrollStateFor(box,direction);
    if(mode==='capture'){ state.pinned=previewScrollIsPinned(box,direction); state.top=box.scrollTop; previewScrollState.set(box,state); return state; }
    const shouldFollow=mode==='force'||!state.initialized||state.pinned||(newestChanged&&(!state.manual||Date.now()-state.manualAt>=SMART_SCROLL_IDLE_MS));
    state.programmatic=true;
    requestAnimationFrame(()=>{
      if(shouldFollow) box.scrollTop=direction==='up'?0:box.scrollHeight; else box.scrollTop=Math.min(state.top,Math.max(0,box.scrollHeight-box.clientHeight));
      requestAnimationFrame(()=>{state.programmatic=false;state.initialized=true;if(shouldFollow){state.pinned=true;state.manual=false;state.pendingNewest=false;}previewScrollState.set(box,state);});
    });
    return state;
  }
  function bindPreviewScrollTracking(box, direction) {
    if (!box) return;
    box.dataset.scrollDirection = direction;
    if (box.dataset.scrollTracking === '1') return;
    box.dataset.scrollTracking = '1';
    box.addEventListener('scroll', () => {
      const currentDirection=box.dataset.scrollDirection||'down';
      const state=previewScrollStateFor(box,currentDirection);
      if(!state.programmatic){state.manual=true;state.manualAt=Date.now();state.top=box.scrollTop;}
      state.pinned=previewScrollIsPinned(box,currentDirection); state.initialized=true; state.direction=currentDirection;
      if(state.pinned){state.manual=false;state.pendingNewest=false;}
      previewScrollState.set(box,state);
    }, {passive:true});
  }
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
    const newestPreviewKey=activeCustomizeTab==='chat'?(state.previewChat.length?eventFingerprint(state.previewChat[state.previewChat.length-1],'chat'):''):(activeCustomizeTab==='events'?(state.previewEvents.length?eventFingerprint(state.previewEvents[state.previewEvents.length-1],'activity'):''):(state.previewGifts.length?eventFingerprint(state.previewGifts[state.previewGifts.length-1],'activity'):''));
    const newestPreviewChanged=newestPreviewKey!==String(box.dataset.newestKey||'');
    if(!force && signature===customizePreviewSignature) return;
    const direction = activeCustomizeTab==='chat' ? (p.chatDirection || 'down') : activeCustomizeTab==='events' ? (p.eventsDirection || 'down') : (p.giftsDirection || 'down');
    const previousState = previewScrollStateFor(box,direction);
    const previousScrollBox = box.querySelector('.activity-preview-stack') || box;
    bindPreviewScrollTracking(previousScrollBox, direction);
    if (previousState.direction && previousState.direction !== direction) {
      previousState.initialized=false; previousState.pinned=true; previousState.manual=false; previousState.manualAt=0; previousState.top=0;
    } else if (previousState.initialized) {
      applyPreviewScroll(previousScrollBox, direction, 'capture');
    }
    previousState.direction=direction;
    previewScrollState.set(box,previousState);
    box.className=className+' preview-no-flash';
    box.dataset.theme=p.chatTheme||'cloud';
    const frag=document.createRange().createContextualFragment(html);
    box.replaceChildren(frag);
    const scrollBox = box.querySelector('.activity-preview-stack') || box;
    bindPreviewScrollTracking(scrollBox, direction);
    customizePreviewSignature=signature;
    queueAvatarImages(box);
    requestAnimationFrame(()=>{
      applyPreviewScroll(scrollBox, direction, force && !previousState.initialized ? 'force' : 'auto', newestPreviewChanged);
      box.dataset.newestKey=newestPreviewKey;
      box.classList.remove('preview-no-flash');
    });
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
    eShares:['personalization','eventVisibility','shares'], eSuperfan:['personalization','eventVisibility','superfan'], eSystem:['personalization','eventVisibility','system'], eGifts:['personalization','eventVisibility','gifts'],
    eSubs:['personalization','eventVisibility','subscriptions'], eBits:['personalization','eventVisibility','bits'], eRaids:['personalization','eventVisibility','raids'], eHosts:['personalization','eventVisibility','hosts'],
    eHighlight:['personalization','overlayEventHighlightStyle'], eFont:['personalization','overlayEventFont'], eUser:['personalization','highlightEventUsername'], eGiftHi:['personalization','highlightGifts'],
    // Regalos
    gLayout:['personalization','giftsLayout'], gDirection:['personalization','giftsDirection'], gMode:['personalization','giftsMode'], gSize:['personalization','giftsPanelSize'],
    gShape:['personalization','giftsOverlayShape'], gSide:['personalization','giftsOverlayCardSide'], gFrame:['personalization','giftsCardFrame'], gImage:['personalization','overlayGiftImageSize'],
    gDisplay:['personalization','overlayGiftDisplayMode'], gComposition:['personalization','overlayGiftCompositionMode'], gNameMode:['personalization','overlayNameColorMode'],
    gNameColor:['personalization','overlayNameColor'], gHighlight:['personalization','giftHighlightStyle'], gFont:['personalization','overlayGiftFont'], gShowActivity:['personalization','showGifts'], gAmount:['personalization','giftAmountStyle']
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
      settings = merge(settings, patch);
      saveCustomizationSnapshot();
      applyAppearance();
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
      ${ctl('Compartidos','eShares','check',v.shares !== false)} ${ctl('Superfan','eSuperfan','check',v.superfan !== false)} ${ctl('Sistema','eSystem','check',v.system !== false)} ${ctl('Raids','eRaids','check',v.raids !== false)} ${ctl('Hosts','eHosts','check',v.hosts !== false)}
      <div class="custom-hint"><strong>Bits y suscripciones</strong><span>En Twitch se muestran exclusivamente en Regalos porque representan apoyo económico.</span></div>
    </div>`;
    if (activeCustomizeSection==='highlight') return `<div class="custom-control-grid">
      ${ctl('Estilo de resaltado','eHighlight','select',p.overlayEventHighlightStyle,'<option value="platform">Plataforma</option><option value="accent">Acento</option><option value="gold">Dorado</option><option value="none">Ninguno</option>')}
      ${ctl('Fuente del evento','eFont','select',p.overlayEventFont||'inherit','<option value="inherit">Heredada</option><option value="inter">Inter</option><option value="poppins">Poppins</option><option value="montserrat">Montserrat</option><option value="oswald">Oswald</option><option value="roboto">Roboto</option><option value="nunito">Nunito</option><option value="lato">Lato</option><option value="opensans">Open Sans</option><option value="system">Sistema</option>')}
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
      ${ctl('Fuente del regalo','gFont','select',p.overlayGiftFont||'inherit','<option value="inherit">Heredada</option><option value="inter">Inter</option><option value="poppins">Poppins</option><option value="montserrat">Montserrat</option><option value="oswald">Oswald</option><option value="roboto">Roboto</option><option value="nunito">Nunito</option><option value="lato">Lato</option><option value="opensans">Open Sans</option><option value="system">Sistema</option>')}
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

  function previewEventSamples() {
    if (!state.previewEventSeeds.length) {
      const base = Date.now() - 70000;
      state.previewEventSeeds = [
        {key:'follows',platform:'tiktok',user:'LunaByte',icon:'👤',type:'follow',text:'comenzó a seguirte',timestamp:base},
        {key:'likes',platform:'tiktok',user:'SofiGG',icon:'❤️',type:'like',text:'envió 1.2K likes',timestamp:base+7000},
        {key:'shares',platform:'tiktok',user:'PixelMajo',icon:'🗣️',type:'share',text:'compartió tu directo',timestamp:base+14000},
        {key:'joins',platform:'tiktok',user:'Maybe♡',icon:'👻',type:'join',text:'se unió al directo',timestamp:base+21000},
        {key:'follows',platform:'twitch',user:'JosueLopez',icon:'👤',type:'follow',text:'comenzó a seguirte en Twitch',timestamp:base+28000},
        {key:'raids',platform:'twitch',user:'RaidLeader',icon:'🚀',type:'raid',text:'hizo raid con 37 espectadores',timestamp:base+49000},
        {key:'hosts',platform:'twitch',user:'HostMaster',icon:'📣',type:'host',text:'hosteó el canal',timestamp:base+56000},
        {key:'system',platform:'twitch',user:'Nocturno',icon:'⛔',type:'ban',text:'fue baneado del canal',timestamp:base+63000},
        {key:'system',platform:'twitch',user:'Nocturno',icon:'✅',type:'unban',text:'fue desbaneado del canal',timestamp:base+70000}
      ];
    }
    return state.previewEventSeeds;
  }
  function previewGiftSamples() {
    if (!state.previewGiftSeeds.length) {
      const base = Date.now() - 50000;
      const catalog = state.tiktokGiftCatalog;
      const pick = (key, fallback) => {
        const item = lookupTikTokGift(key) || catalog.find(x=>normalizeGiftKey(x?.name)===normalizeGiftKey(key)) || fallback;
        return item;
      };
      const heart = pick('heartme', {key:'heartme',name:'Heart Me',image:'',coins:1});
      const rose = pick('rose', {key:'rose',name:'Rose',image:'',coins:1});
      state.previewGiftSeeds = [
        {platform:'tiktok',user:'LunaByte',gift:heart.name,displayNameEs:giftDisplayName(heart),giftKey:heart.key,giftImage:heart.image,amount:1,coins:heart.coins,timestamp:base},
        {platform:'tiktok',user:'SofiGG',gift:rose.name,displayNameEs:giftDisplayName(rose),giftKey:rose.key,giftImage:rose.image,amount:5,coins:rose.coins,timestamp:base+10000},
        {platform:'twitch',user:'BitMaster',gift:'Bits',giftName:'Bits',giftKey:'bits',giftEmoji:'💎',amount:100,bits:100,message:'envió 100 Bits',timestamp:base+20000,twitchGiftType:'bits'},
        {platform:'twitch',user:'SubQueen',gift:'Suscripción de regalo',giftName:'Suscripción de regalo',giftKey:'subscriptiongift',giftEmoji:'⭐',amount:5,message:'regaló 5 suscripciones',timestamp:base+30000,twitchGiftType:'subscription-gift'}
      ];
    }
    return state.previewGiftSeeds;
  }
  function previewActivityCard(kind) {
    const p=settings.personalization||{};
    const isEvents = kind === 'events';
    const direction = isEvents ? (p.eventsDirection || 'down') : (p.giftsDirection || 'down');
    const layout = isEvents ? (p.eventsLayout || 'vertical') : (p.giftsLayout || 'vertical');
    const simulationMode = isEvents ? (p.eventSimulationMode || 'single') : (p.giftSimulationMode || 'single');

    if (isEvents) {
      const samples=previewEventSamples();
      const visibility=p.eventVisibility||{};
      const available=samples.filter(x=>visibility[x.key]!==false);
      if (!available.length) return `<div class="activity-preview activity-empty-preview"><div class="activity-icon">◌</div><div class="activity-copy"><strong>No hay eventos visibles</strong><span>Activa al menos un tipo en «Contenido».</span></div></div>`;

      const selected=state.previewEvents.length ? state.previewEvents : [available[state.previewEventIndex%available.length]];
      const source = simulationMode==='all' ? selected.filter(x=>visibility[x.key]!==false) : [selected[selected.length-1] || available[0]];
      const list = orderedItems(source, direction);
      const stackClass=`activity-preview-stack activity-preview-stack-${direction} activity-preview-stack-${layout} ${simulationMode==='all'?'simulation-all':''}`;

      if ((p.eventStyle||'chat')==='chat') {
        const cards=list.map((sample,index)=>{
          const row=messageRow({preview:true,previewActivityType:sample.type,platform:sample.platform,displayName:sample.user,username:sample.user,uniqueId:sample.user,message:sample.text,action:sample.type,emoji:sample.icon,timestamp:sample.timestamp},'event');
          return `<div class="preview-activity-chat-item event-layout-${esc(layout)} event-direction-${esc(direction)} event-mode-${esc(p.eventsMode||'slide')} event-size-${esc(p.eventsPanelSize||'normal')} event-shape-${esc(p.eventsOverlayShape||'normal')} event-side-${esc(p.eventsOverlayCardSide||'center')} ${p.eventsCardFrame===false?'no-frame':''}">${row}</div>`;
        }).join('');
        return `<div class="${stackClass}">${cards}</div>`;
      }

      const cards=list.map((sample,index)=>{
        const mode=p.eventsMode||'slide'; const size=p.eventsPanelSize||'normal'; const shape=p.eventsOverlayShape||'normal';
        const highlight=p.overlayEventHighlightStyle||'platform';
        const accent=highlight==='gold'?'#f5d063':highlight==='accent'?'#9d7dff':sample.platform==='twitch'?'#9146ff':'#fe2c55';
        const userName=p.highlightEventUsername===false?'Usuario':sample.user;
        const badge = sample.type==='like'?'❤️':sample.type==='follow'?'👤':sample.type==='join'?'👻':sample.type==='share'?'🗣️':sample.type==='raid'?'🚀':sample.type==='host'?'📣':sample.type==='ban'?'⛔':sample.type==='unban'?'✅':'';
        return `<div class="activity-preview stage-events event-highlight-${esc(highlight)} event-layout-${esc(layout)} event-direction-${esc(direction)} event-mode-${esc(mode)} event-size-${esc(size)} event-shape-${esc(shape)} event-side-${esc(p.eventsOverlayCardSide||'center')} ${p.eventsCardFrame===false?'no-frame':''}" style="--activity-accent:${accent};font-family:${esc(fontFamilyName(p.overlayEventFont||p.font))}"><div class="activity-icon">${sample.icon}</div><div class="activity-copy"><small>${esc(sample.type.toUpperCase())}</small><strong>${esc(userName)}</strong>${badge?`<span class="activity-sim-badge" aria-label="Actividad">${badge}</span>`:''}<span>${esc(sample.text)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
      }).join('');
      return `<div class="${stackClass}">${cards}</div>`;
    }

    const samples=previewGiftSamples();
    const selected=state.previewGifts.length ? state.previewGifts : [samples[state.previewGiftIndex%samples.length]];
    const source=simulationMode==='all' ? selected : [selected[selected.length-1] || samples[0]];
    const list=orderedItems(source,direction);
    const stackClass=`activity-preview-stack activity-preview-stack-${direction} activity-preview-stack-${layout} ${simulationMode==='all'?'simulation-all':''}`;

    if((p.giftStyle||'chat')==='chat'){
      const cards=list.map((sample,index)=>`<div class="preview-activity-chat-item gift-layout-${esc(layout)} gift-direction-${esc(direction)} gift-mode-${esc(p.giftsMode||'slide')} gift-size-${esc(p.giftsPanelSize||'normal')} gift-shape-${esc(p.giftsOverlayShape||'normal')} gift-side-${esc(p.giftsOverlayCardSide||'center')} ${p.giftsCardFrame===false?'no-frame':''}">${messageRow({preview:true,previewActivityType:sample.giftKey==='bits'?'bits':sample.giftKey==='subscriptiongift'?'subscription-gift':'gift',platform:sample.platform,displayName:sample.user,username:sample.user,uniqueId:sample.user,gift:sample.gift,giftName:sample.displayNameEs||giftDisplayName(sample),giftKey:sample.giftKey,giftImage:sample.giftImage,giftEmoji:sample.giftEmoji,amount:sample.amount,message:`${sample.displayNameEs||giftDisplayName(sample)} ×${sample.amount}`,timestamp:sample.timestamp},'gift')}</div>`).join('');
      return `<div class="${stackClass}">${cards}</div>`;
    }

    const cards=list.map(sample=>{
      const size=p.overlayGiftImageSize||'md';
      const display=p.overlayGiftDisplayMode||'full';
      const nameColor=p.overlayNameColorMode==='custom'?(p.overlayNameColor||'#ffffff'):(sample.platform==='twitch'?'#c7a2ff':'#fe6f92');
      const displayGift=sample.displayNameEs||giftDisplayName(sample);
      const title=display==='image'?displayGift:display==='text'?displayGift:`${displayGift}${p.giftAmountStyle==='muted'?'':` ×${sample.amount}`}`;
      const frame=p.giftsCardFrame===false?'no-frame':'';
      const highlight=p.giftHighlightStyle||'gold';
      const accent=highlight==='gold'?'#f5d063':highlight==='platform'?(sample.platform==='twitch'?'#9146ff':'#fe2c55'):highlight==='accent'?'#9d7dff':'transparent';
      const showActivity=p.showGifts!==false;
      return `<div class="activity-preview stage-gifts gift-highlight-${esc(highlight)} gift-layout-${esc(layout)} gift-direction-${esc(direction)} gift-mode-${esc(p.giftsMode||'slide')} gift-size-${esc(p.giftsPanelSize||'normal')} gift-shape-${esc(p.giftsOverlayShape||'normal')} gift-side-${esc(p.giftsOverlayCardSide||'center')} ${frame}" style="--activity-accent:${accent};font-family:${esc(fontFamilyName(p.overlayGiftFont||p.font))};"><div class="gift-preview-media size-${size} ${display==='text'?'hide-image':''} ${display==='image'?'only-image':''}"><span>🎁</span></div><div class="activity-copy"><small>REGALO</small>${showActivity?`<strong style="color:${esc(nameColor)}">${esc(sample.user)}</strong>`:'<strong>Regalo recibido</strong>'}<span class="gift-title">${esc(title)}</span></div><span class="activity-platform ${sample.platform}">${sample.platform==='twitch'?'TW':'TT'}</span></div>`;
    }).join('');
    return `<div class="${stackClass}">${cards}</div>`;
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

  async function simulatePreviewActivity(){
    const p=settings.personalization||{};
    if (activeCustomizeTab==='gifts') await loadTikTokGiftCatalog();
    if (activeCustomizeTab==='events') {
      const samples=previewEventSamples();
      const available=samples.filter(x=>(p.eventVisibility?.[x.key]??true)!==false);
      if(!available.length)return;
      const next={...available[state.previewEventIndex%available.length],timestamp:Date.now()};
      state.previewEventIndex=(state.previewEventIndex+1)%available.length;
      if((p.eventSimulationMode||'single')==='all'){state.previewEvents.push(next);if(state.previewEvents.length>8)state.previewEvents.shift();}
      else state.previewEvents=[next];
    }
    if (activeCustomizeTab==='gifts') {
      const samples=previewGiftSamples();
      const next={...samples[state.previewGiftIndex%samples.length],timestamp:Date.now()};
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
      saveCustomizationSnapshot();
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
  function defaultRoulettePreviewConfig(){return {mode:'baraja',enabled:true,audience:'all',platforms:{tiktok:true,twitch:true},participation:{entryMode:'comment',commentMode:'custom',commentText:'1',allowMultiple:false,maxEntriesPerUser:1,spamCooldownMs:2400},winnerComment:{enabled:true,voiceBotLinked:false,waitSeconds:30},auto:{enabled:false,startWaitSeconds:60,restartWaitSeconds:180},theme:{preset:'midnight',accent:'#64748b',accent2:'#22d3ee',accent3:'#9b5cff',frame:'glass',frameColor1:'#9b5cff',frameColor2:'#22d3ee',frameColor3:'#f472b6',background:'transparent',showGrid:false,cardTheme:'midnight'}};}
  function getRoulettePreviewConfig(){
    if(!roulettePreviewConfig){
      try{
        const raw=localStorage.getItem('sf.roulette.preview.v1');
        roulettePreviewConfig=merge(defaultRoulettePreviewConfig(),raw?JSON.parse(raw):{}); roulettePreviewConfig.mode='baraja';
      }catch{roulettePreviewConfig=defaultRoulettePreviewConfig();}
    }
    return roulettePreviewConfig;
  }
  function saveRoulettePreviewConfig(){
    try{
      const savedAt=Date.now();
      roulettePreviewConfig=merge(defaultRoulettePreviewConfig(),roulettePreviewConfig||{}); roulettePreviewConfig.mode='baraja';
      roulettePreviewConfig._updatedAt=savedAt;
      localStorage.setItem('sf.roulette.preview.v1',JSON.stringify(roulettePreviewConfig));
      localStorage.setItem('sf.roulette.preview.v1.savedAt',String(savedAt));
    }catch{}
  }
  function localRoulettePreviewSavedAt(){try{return Number(localStorage.getItem('sf.roulette.preview.v1.savedAt')||roulettePreviewConfig?._updatedAt||0)||0;}catch{return 0;}}
  function serverRouletteUpdatedAt(cfg){return Number(cfg?._updatedAt||0)||0;}
  function rouletteConfigEqual(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch{return false;}}
  function persistRoulettePreviewConfig(){
    const cfg=getRoulettePreviewConfig();
    if(!socket?.connected) return Promise.resolve(false);
    return new Promise(resolve=>{let settled=false;const done=(payload)=>{if(settled)return;settled=true;resolve(Boolean(payload?.ok));};try{socket.timeout(5000).emit('roulette:update',cfg,done);}catch{resolve(false);}});
  }
  function syncRoulettePreviewConfigToServer(){
    const cfg=getRoulettePreviewConfig();
    if(!socket?.connected) return;
    try{ socket.emit('roulette:update',cfg); }catch{}
  }
  function roulettePreviewPost(message){const payload={source:'streamfusion-roulette-preview',...message};const f=$('roulettePreviewFrame');if(!f?.contentWindow){roulettePreviewPending.push(payload);return;}if(!roulettePreviewReady){roulettePreviewPending.push(payload);return;}f.contentWindow.postMessage(payload,'*');}
  function flushRoulettePreviewQueue(){const f=$('roulettePreviewFrame');if(!f?.contentWindow)return;roulettePreviewReady=true;const q=roulettePreviewPending.splice(0);q.forEach(m=>{try{f.contentWindow.postMessage(m,'*');}catch{}});}
  function roulettePreviewThemeCard(p,c,active){return `<button type="button" class="roulette-theme-choice ${active?'active':''}" data-rpreview-theme="${esc(p.id)}" style="--theme-a:${esc(p.accent)};--theme-b:${esc(p.accent2)};--theme-c:${esc(p.accent3)}"><div><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div><div class="roulette-theme-swatches"><i></i><i></i><i></i></div></button>`;}
  function roulettePreviewDeckCard(p,c,active){return `<button type="button" class="roulette-deck-choice ${active?'active':''}" data-rpreview-deck="${esc(p.id)}" style="--deck-a:${esc(p.bg1)};--deck-b:${esc(p.bg2)};--deck-c:${esc(p.bg3)}"><div><strong>${esc(p.name)}</strong><span>${esc(p.desc)}</span></div><div class="roulette-deck-swatch"></div></button>`;}
  function syncRoulettePreviewHistoryFromServer(){
    const serverHistory=Array.isArray(rouletteState?.state?.history)?rouletteState.state.history:[];
    if(serverHistory.length || roulettePreviewState.history?.length===0) roulettePreviewState.history=serverHistory.slice(0,30);
    const serverWinner=rouletteState?.state?.winner||null;
    if(serverWinner) roulettePreviewState.activeWinner=serverWinner;
  }
  function roulettePreviewConfigControls(){
    const c=getRoulettePreviewConfig(); c.mode='baraja'; const box=$('roulettePreviewControls');if(!box)return;let h='';
    if(roulettePreviewTab==='appearance'){       c.mode='baraja'; const activeDeck=String(c.theme?.cardTheme||'midnight');
       const visualChoices=`<div class="roulette-preview-subtitle">Temas de baraja</div><div class="roulette-deck-grid">${ROULETTE_CARD_PRESETS.map(p=>roulettePreviewDeckCard(p,c,p.id===activeDeck)).join('')}</div>`;
      h=`<div class="custom-hint"><strong>Apariencia de la ruleta</strong><span>Las opciones mostradas dependen del tipo seleccionado y se mantienen al cambiar de pestaña o volver a esta interfaz.</span></div>
        ${visualChoices}
        <div class="custom-control-grid">${ctl('Marco','rFrame','select',c.theme.frame||'glass','<option value="glass">Cristal</option><option value="solid">Sólido</option><option value="minimal">Minimal</option>')}
        ${ctl('Fondo','rBg','select',c.theme.background||'transparent','<option value="transparent">Transparente</option><option value="dark">Oscuro</option><option value="midnight">Midnight</option><option value="green">Green screen</option><option value="soft-dark">Dark soft</option><option value="light">Blanco</option>')}
        ${ctl('Mostrar rejilla','rGrid','check',c.theme.showGrid===true)}${ctl('Color principal','rAccent','input',c.theme.accent||'#64748b')}${ctl('Color secundario','rAccent2','input',c.theme.accent2||'#22d3ee')}${ctl('Color terciario','rAccent3','input',c.theme.accent3||'#9b5cff')}</div>`;
    } else if(roulettePreviewTab==='config'){
      h=`<div class="custom-control-grid">${ctl('Ruleta activa','rEnabled','check',c.enabled!==false)}
      ${ctl('Público','rAudience','select',c.audience||'all','<option value="all">Todos</option><option value="followers">Seguidores</option><option value="donors">Donadores</option><option value="likers">Likers</option>')}
      ${ctl('Modo de comentario','rCommentMode','select',c.participation?.commentMode||'custom','<option value="any">Cualquier comentario</option><option value="custom">Comentario personalizado</option>')}
      ${ctl('Texto de participación','rCommentText','input',c.participation?.commentText||'1')}
      ${ctl('Permitir múltiples','rAllowMultiple','check',c.participation?.allowMultiple===true)}
      ${ctl('Máximo por usuario','rMaxEntries','input',Number(c.participation?.maxEntriesPerUser||1))}
      ${ctl('Antispam (ms)','rSpamCooldown','input',Number(c.participation?.spamCooldownMs||2400))}</div>
      <div class="roulette-platform-pills"><span class="muted">Plataformas</span><button type="button" class="roulette-pill ${c.platforms?.tiktok!==false?'active':''}" data-rpreview-platform="tiktok">TikTok</button><button type="button" class="roulette-pill ${c.platforms?.twitch!==false?'active':''}" data-rpreview-platform="twitch">Twitch</button></div>
      <div class="custom-hint"><strong>Participación simulada</strong><span>“＋ Agregar participante” crea una entrada real dentro de esta preview y además la envía a la preview de Chat.</span></div>`;
    } else if(roulettePreviewTab==='behaviour'){
      h=`<div class="custom-control-grid">${ctl('Vincular bot de voz','rVoiceBotLinked','check',c.winnerComment?.voiceBotLinked===true)}${ctl('Esperar comentario del ganador','rWinnerCommentEnabled','check',c.winnerComment?.enabled!==false)}${ctl('Tiempo de espera (segundos)','rWinnerCommentSeconds','input',Number(c.winnerComment?.waitSeconds||30))}${ctl('Participación automática','rAutoEnabled','check',c.auto?.enabled===true)}${ctl('Iniciar automáticamente tras (s)','rAutoStart','input',Number(c.auto?.startWaitSeconds||60))}${ctl('Reiniciar después de un ganador (s)','rAutoRestart','input',Number(c.auto?.restartWaitSeconds||180))}</div>
      <div class="custom-hint"><strong>Bot de voz vinculado</strong><span>Cuando está activo, el ganador espera 30 segundos (o el tiempo elegido) y solo recibe la voz/premio cuando comenta un nombre de voz válido. Un comentario normal no completa la elección.</span></div>`;
    } else if(roulettePreviewTab==='winners'){
      const a=roulettePreviewState.history||[];
      h=`<div class="roulette-winners-head"><strong>Ganadores</strong><button type="button" class="btn secondary btn-sm" id="rouletteClearWinnerHistory" ${a.length?'':'disabled'}>Borrar historial</button></div><div class="roulette-mini-list">${a.length?a.map((w)=>`<div class="roulette-mini-row"><span>🏆</span><div><strong>${esc(w.displayName||'Ganador')}</strong><small>${esc(w.platform||'')} ${w.voiceLabel?`· 🤖 ${esc(w.voiceLabel)}`:''}</small></div><button type="button" class="roulette-delete-winner" data-delete-preview-winner="${esc(w.key||w.createdAt||'')}" title="Borrar ganador" aria-label="Borrar ganador">🗑️</button></div>`).join(''):'<div class="empty">Todavía no hay ganadores. Agrega participantes y gira la ruleta.</div>'}</div>`;
    }
    box.innerHTML=h;
    bindRoulettePreviewControls();
  }
  function bindRoulettePreviewControls(){
    const map={rEnabled:['enabled'],rFrame:['theme','frame'],rBg:['theme','background'],rGrid:['theme','showGrid'],rAccent:['theme','accent'],rAccent2:['theme','accent2'],rAccent3:['theme','accent3'],rAudience:['audience'],rCommentMode:['participation','commentMode'],rCommentText:['participation','commentText'],rAllowMultiple:['participation','allowMultiple'],rMaxEntries:['participation','maxEntriesPerUser'],rSpamCooldown:['participation','spamCooldownMs'],rVoiceBotLinked:['winnerComment','voiceBotLinked'],rWinnerCommentEnabled:['winnerComment','enabled'],rWinnerCommentSeconds:['winnerComment','waitSeconds'],rAutoEnabled:['auto','enabled'],rAutoStart:['auto','startWaitSeconds'],rAutoRestart:['auto','restartWaitSeconds']};
    const readPath=(path)=>path.reduce((obj,key)=>obj?.[key],roulettePreviewConfig);
    document.querySelectorAll('#roulettePreviewControls select').forEach(el=>{const path=map[el.id];if(path)el.value=String(readPath(path) ?? '');});
    document.querySelectorAll('#roulettePreviewControls input').forEach(el=>{const path=map[el.id];if(!path)return;const value=readPath(path);if(el.type==='checkbox')el.checked=Boolean(value);else if(el.type==='number')el.value=String(Number(value ?? 0));else if(el.type==='color')el.value=String(value || '#000000');});
    const apply=(id,{rerender=false}={})=>{if(id==='rMode') return; const path=map[id];if(!path)return;const el=$(id);if(!el)return;const value=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;let cur=roulettePreviewConfig;for(let i=0;i<path.length-1;i++)cur=cur[path[i]] ||= {};cur[path[path.length-1]]=value;saveRoulettePreviewConfig();syncRoulettePreviewConfigToServer();roulettePreviewPost({type:'config',config:roulettePreviewConfig});renderRoulettePreviewCardsOnly();if(rerender)roulettePreviewConfigControls();};
    document.querySelectorAll('#roulettePreviewControls select,#roulettePreviewControls input').forEach(el=>{el.addEventListener('change',()=>apply(el.id,{rerender:el.id==='rMode'}));el.addEventListener('input',()=>{if(el.type==='color')apply(el.id);});});
    document.querySelectorAll('[data-rpreview-theme]').forEach(btn=>btn.onclick=()=>{const preset=ROULETTE_THEME_PRESETS.find(x=>x.id===btn.dataset.rpreviewTheme);if(!preset)return;roulettePreviewConfig.theme={...roulettePreviewConfig.theme,preset:preset.id,accent:preset.accent,accent2:preset.accent2,accent3:preset.accent3};roulettePreviewConfig.mode='baraja';saveRoulettePreviewConfig();syncRoulettePreviewConfigToServer();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
    document.querySelectorAll('[data-rpreview-deck]').forEach(btn=>btn.onclick=()=>{roulettePreviewConfig.mode='baraja';roulettePreviewConfig.theme={...roulettePreviewConfig.theme,cardTheme:String(btn.dataset.rpreviewDeck||'midnight')};saveRoulettePreviewConfig();syncRoulettePreviewConfigToServer();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
    document.querySelectorAll('[data-rpreview-platform]').forEach(btn=>btn.onclick=()=>{const platform=String(btn.dataset.rpreviewPlatform||'');roulettePreviewConfig.platforms=roulettePreviewConfig.platforms||{tiktok:true,twitch:true};roulettePreviewConfig.platforms[platform]=!roulettePreviewConfig.platforms[platform];saveRoulettePreviewConfig();syncRoulettePreviewConfigToServer();roulettePreviewPost({type:'config',config:roulettePreviewConfig});roulettePreviewConfigControls();});
    const clearWinnerHistory=$('rouletteClearWinnerHistory'); if(clearWinnerHistory) clearWinnerHistory.onclick=()=>{roulettePreviewState.history=[];roulettePreviewState.activeWinner=null;roulettePreviewConfigControls();roulettePreviewPost({type:'historyChanged',history:[]});if(socket?.connected) socket.emit('roulette:clearWinnerHistory');};
    document.querySelectorAll('[data-delete-preview-winner]').forEach(btn=>btn.onclick=()=>{const key=String(btn.dataset.deletePreviewWinner||'');roulettePreviewState.history=(roulettePreviewState.history||[]).filter(w=>String(w.key||w.createdAt||'')!==key);if(roulettePreviewState.activeWinner && String(roulettePreviewState.activeWinner.key||roulettePreviewState.activeWinner.createdAt||'')===key) roulettePreviewState.activeWinner=null;roulettePreviewConfigControls();roulettePreviewPost({type:'historyChanged',history:roulettePreviewState.history});if(socket?.connected) socket.emit('roulette:deleteWinner',key);});
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
          roulettePreviewState.activeWinner=winner;
        }
        // Never rebuild the iframe just because a tab/result changed.
        // The preview is one persistent scene; only the editor panel changes.
        if(roulettePreviewTab==='winners') roulettePreviewConfigControls();
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
        if(roulettePreviewTab==='config'||roulettePreviewTab==='winners') roulettePreviewConfigControls();
        const count=$('roulettePreviewParticipantCount');
        if(count) count.textContent=`${roulettePreviewState.participants?.length||0} participante${(roulettePreviewState.participants?.length||0)===1?'':'s'}`;
      }
    };
    window.addEventListener('message',window.__sfRoulettePreviewMessageHandler);
    roulettePreviewReady=false;
    roulettePreviewPending=[];
    const c=getRoulettePreviewConfig();
    const tabs=[['appearance','Apariencia'],['config','Configuración'],['behaviour','Comportamiento'],['winners','Ganadores']];
    if(socket?.connected) socket.emit('roulette:getState');
    const names=['LunaByte','MauroLive','SofiGG','PixelMajo','RafaFPS','NubeStudio','KiraLive'];
    $('view').innerHTML=`<div class="intro split"><div><p class="eyebrow">DINÁMICA</p><h2>Ruleta</h2><p>Configura la ruleta desde aquí y comprueba cada cambio en tiempo real antes de abrirla para OBS.</p></div><div class="row"><button class="btn secondary" id="rouletteResetPreview">Reiniciar prueba</button><button class="btn primary" id="rouletteGenerateOverlay">Generar Overlay</button></div></div><div class="roulette-editor-layout"><section class="card roulette-editor-card"><div class="roulette-editor-tabs">${tabs.map(([k,l])=>`<button type="button" class="roulette-editor-tab ${roulettePreviewTab===k?'active':''}" data-rpreview-tab="${k}">${l}</button>`).join('')}</div><div class="roulette-editor-body" id="roulettePreviewControls"></div></section><section class="card roulette-preview-card"><div class="preview-header"><div><p class="eyebrow">VISTA PREVIA EN TIEMPO REAL</p><h3>Ruleta</h3></div><span class="preview-live"><i></i> SIMULACIÓN</span></div><div class="roulette-preview-stage"><iframe id="roulettePreviewFrame" title="Vista previa Ruleta" src="about:blank"></iframe></div><div class="roulette-preview-actions"><button class="btn secondary" id="rouletteSimAdd">＋ Agregar participante</button><button class="btn primary" id="rouletteSimSpin">🎲 Girar</button></div><div class="roulette-preview-footer"><span class="muted">Los participantes son ficticios y la simulación también alimenta el Chat de Personalización.</span><span id="roulettePreviewParticipantCount" class="preview-count">0 participantes</span></div></section></div>`;
    syncRoulettePreviewHistoryFromServer();
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
      const hadWinner=Boolean(roulettePreviewState.activeWinner);
      if(hadWinner){
        // A winner closes the current round. Reset both the embedded preview and the live overlay state.
        roulettePreviewState.participants=[];
        roulettePreviewState.activeWinner=null;
        roulettePreviewPost({type:'newRound'});
        if(socket?.connected) { try { socket.emit('roulette:clearParticipants'); } catch {} }
      }
      const existing=new Set((roulettePreviewState.participants||[]).map(p=>String(p.displayName||'').toLowerCase()));
      const available=names.filter(n=>!existing.has(n.toLowerCase()));
      const pool=available.length?available:names;
      const name=pool[Math.floor(Math.random()*pool.length)];
      const customText=String(c.participation?.commentMode||'custom')==='any'?'¡Hola!':(String(c.participation?.commentText||'1').trim()||'1');
      const enabledPlatforms=['twitch','tiktok'].filter(p=>c.platforms?.[p]!==false);
      const platform=enabledPlatforms.length?enabledPlatforms[Math.floor(Math.random()*enabledPlatforms.length)]:'twitch';
      const participant={displayName:name,username:name.toLowerCase(),uniqueId:name.toLowerCase(),platform,comment:customText,key:`preview-${Date.now()}-${Math.random()}`};
      roulettePreviewState.participants=[...(roulettePreviewState.participants||[]),participant].slice(-100);
      roulettePreviewPost({type:'addParticipant',participant});
      if(socket?.connected) { try { socket.emit('roulette:simulateParticipant',participant); } catch {} }
      const count=$('roulettePreviewParticipantCount');if(count)count.textContent=`${roulettePreviewState.participants.length} participante${roulettePreviewState.participants.length===1?'':'s'}`;
      if(hadWinner && (roulettePreviewTab==='config'||roulettePreviewTab==='winners'||roulettePreviewTab==='history')) roulettePreviewConfigControls();
    };
    $('rouletteSimSpin').onclick=()=>{
      if(roulettePreviewState.activeWinner) return;
      roulettePreviewPost({type:'spin'});
    };
    $('rouletteResetPreview').onclick=()=>{
      roulettePreviewState={history:[],participants:[],activeWinner:null};
      roulettePreviewPost({type:'reset'});
      if(socket?.connected) { try { socket.emit('roulette:clearParticipants'); } catch {} }
      roulettePreviewConfigControls();
      const count=$('roulettePreviewParticipantCount');if(count)count.textContent='0 participantes';
    };
    $('rouletteGenerateOverlay').onclick=async()=>{try{await persistRoulettePreviewConfig();await openOverlay('roulette-overlay.html','streamfusionRoulette');}catch(e){toast('Ruleta',e.message||'No se pudo generar el overlay.','err');}};
    buildOverlayUrl('roulette-overlay.html?embed=1&previewBuild=33').then(url=>{const f=$('roulettePreviewFrame');if(!f)return;f.onload=()=>{roulettePreviewReady=true;f.contentWindow?.postMessage({source:'streamfusion-roulette-preview',type:'config',config:c},'*');flushRoulettePreviewQueue();};f.src=url;}).catch(()=>{});
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

  let pointsDraft = null;
  async function renderPoints(){
    try {
      const cfgData=await api('/api/points/settings');
      const cfg=cfgData.points||{};
      pointsDraft=structuredClone(cfg);
      $('view').innerHTML=`
        <div class="intro split"><div><h2>Sistema de puntos</h2><p>Configura la economía de tu canal y administra puntos por usuario sin cargar una lista completa en memoria.</p></div><div class="widget-live-mini"><i class="on"></i> ACTIVO</div></div>
        <div class="settings-grid two points-grid">
          <section class="card"><div class="section-head"><div><p class="eyebrow">PUNTOS</p><h3>Configuración por plataforma</h3></div><span class="badge-pill">✦</span></div>
            <label class="toggle"><input id="pointsEnabled" type="checkbox" ${cfg.enabled!==false?'checked':''}><span>Activar sistema de puntos</span></label>
            <div class="points-platform-tabs"><button class="btn secondary" data-points-platform="tiktok">TikTok</button><button class="btn secondary" data-points-platform="twitch">Twitch</button></div>
            <div id="pointsPlatformForm"></div>
            <div class="row points-actions"><button class="btn primary" id="savePoints">Guardar puntos</button><button class="btn secondary" id="openPointsUsers">Ver usuarios</button></div>
          </section>
          <section class="card points-management-card"><div class="section-head"><div><p class="eyebrow">GESTIÓN DE USUARIOS</p><h3>Dar puntos</h3></div><span class="badge-pill">✦</span></div>
            <p class="muted">Busca un usuario registrado en tus actividades y consulta su saldo actual antes de otorgar puntos.</p>
            <div class="points-manage-toolbar">
              <label>Plataforma<select id="pointManagePlatform"><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></label>
              <label class="grow" id="pointManageUserLabel">Unique ID TikTok<input id="pointManageUser" placeholder="@unique_id" autocomplete="off"></label>
              <button class="btn secondary" id="findPointUser">Buscar usuario</button>
            </div>
            <div id="pointManageResult" class="point-user-result" hidden></div>
            <div class="points-award-row" id="pointAwardRow" hidden>
              <label>Puntos a otorgar<input id="pointAwardAmount" type="number" min="1" step="1" value="100" inputmode="numeric"></label>
              <button class="btn primary" id="grantPointUser">Otorgar puntos</button>
            </div>
            <div id="pointManageStatus" class="status" aria-live="polite"></div>
          </section>
        </div>`;
      bindPointsPage();
    } catch(e) { $('view').innerHTML=`<div class="empty">No se pudo cargar el sistema de puntos: ${esc(e.message||e)}</div>`; }
  }
  function pointsField(label,id,value){return `<label>${esc(label)}<input id="${esc(id)}" type="number" min="0" step="1" value="${esc(value??0)}"></label>`;}
  function renderPointsPlatformForm(platform){
    const cfg=pointsDraft?.[platform]||{}; const twitch=platform==='twitch';
    $('pointsPlatformForm').innerHTML=`<div class="custom-control-grid points-award-grid">
      ${pointsField('Seguidor · puntos','ptFollow',cfg.follow??100)}
      ${pointsField('Comentario · puntos','ptComment',cfg.comment??2)}
      ${!twitch?pointsField('Like · puntos por like','ptLike',cfg.like??1):''}
      ${!twitch?pointsField('Compartir · puntos','ptShare',cfg.share??1):''}
      ${twitch?pointsField('Bits · puntos por cada 10 Bits','ptBitsPer10',cfg.bitsPer10??1):pointsField('Regalo · puntos por cada 10 monedas','ptGiftPer10',cfg.giftPer10Coins??1)}
      ${pointsField('Suscripción · puntos','ptSub',cfg.subscription??250)}
    </div>
    <p class="muted">${twitch?'En Twitch se utilizan seguidores, comentarios, Bits y suscripciones. Likes y compartidos no existen aquí.':'En TikTok se utilizan seguidores, comentarios, likes, compartidos, regalos y suscripciones.'}</p>`;
    const ids=twitch?{follow:'ptFollow',comment:'ptComment',bitsPer10:'ptBitsPer10',subscription:'ptSub'}:{follow:'ptFollow',comment:'ptComment',like:'ptLike',share:'ptShare',giftPer10Coins:'ptGiftPer10',subscription:'ptSub'};
    Object.entries(ids).forEach(([k,id])=>{const el=$(id);if(el){el.oninput=()=>{pointsDraft[platform][k]=Math.max(0,Number(el.value)||0);};}});
    document.querySelectorAll('[data-points-platform]').forEach(b=>b.classList.toggle('primary',b.dataset.pointsPlatform===platform));
  }
  function bindPointsPage(){
    let platform='tiktok';
    renderPointsPlatformForm(platform);
    document.querySelectorAll('[data-points-platform]').forEach(b=>b.onclick=()=>{platform=b.dataset.pointsPlatform;renderPointsPlatformForm(platform);});
    $('pointsEnabled')?.addEventListener('change',e=>pointsDraft.enabled=e.target.checked);
    $('savePoints')?.addEventListener('click',async()=>{try{await api('/api/points/settings',{method:'PUT',body:JSON.stringify({points:pointsDraft})});toast('Sistema de puntos','Configuración guardada.');}catch(e){toast('No se pudo guardar',e.message,'err');}});
    $('openPointsUsers')?.addEventListener('click',()=>window.open('/points-users.html','streamfusionPointsUsers','width=960,height=800,noopener'));

    const updateManageLabels=()=>{const p=$('pointManagePlatform')?.value||'tiktok'; const label=$('pointManageUserLabel'); if(label){label.firstChild.textContent=p==='twitch'?'Nombre de canal':'Unique ID TikTok'; const input=$('pointManageUser'); if(input){input.placeholder=p==='twitch'?'canal_twitch':'@unique_id'; input.value='';}} const status=$('pointManageStatus'); if(status){status.className='status';status.textContent=p==='tiktok'?'Solo se pueden buscar usuarios que ya hayan comentado o generado actividad en este directo.':'Twitch permite buscar el canal directamente.';} $('pointManageResult')?.setAttribute('hidden',''); $('pointAwardRow')?.setAttribute('hidden','');};
    $('pointManagePlatform')?.addEventListener('change',updateManageLabels);

    let selectedUser=null, pollTimer=0;
    const paintUser=(u)=>{selectedUser=u; const result=$('pointManageResult'); const award=$('pointAwardRow'); if(!result||!award)return; result.hidden=false; award.hidden=false; result.innerHTML=`<div class="point-user-avatar ${u.avatarUrl?'has-avatar':'fallback-avatar'}">${u.avatarUrl?`<img src="${esc(u.avatarUrl)}" alt="Foto de perfil de ${esc(u.displayName||u.username)}">`:`<span>${u.platform==='twitch'?'TW':'TT'}</span>`}</div><div class="point-user-meta"><strong>${esc(u.displayName||u.username)}</strong><small>${u.platform==='twitch'?'Twitch':'TikTok'} · @${esc(u.username)}</small></div><div class="point-user-balance"><span>Saldo actual</span><strong>${Number(u.points||0).toLocaleString('es-PE')} pts</strong></div>`;};
    const lookup=async()=>{const p=$('pointManagePlatform')?.value||'tiktok'; const q=String($('pointManageUser')?.value||'').trim(); const status=$('pointManageStatus'); if(!q){if(status){status.className='status err';status.textContent=p==='twitch'?'Escribe el nombre de canal.':'Escribe el uniqueId de TikTok.';}return;} try{const d=await api('/api/points/user?platform='+encodeURIComponent(p)+'&username='+encodeURIComponent(q)); paintUser(d.user); if(status){status.className='status';status.textContent='Usuario encontrado.';} clearInterval(pollTimer); pollTimer=setInterval(async()=>{try{const cur=await api('/api/points/user?platform='+encodeURIComponent(p)+'&username='+encodeURIComponent(q)); paintUser(cur.user);}catch{}},5000);}catch(e){selectedUser=null; $('pointManageResult')?.setAttribute('hidden',''); $('pointAwardRow')?.setAttribute('hidden',''); if(status){status.className='status err';status.textContent=e.message||'No se encontró el usuario.';}}};
    $('findPointUser')?.addEventListener('click',lookup); $('pointManageUser')?.addEventListener('keydown',e=>{if(e.key==='Enter')lookup();});
    $('grantPointUser')?.addEventListener('click',async()=>{if(!selectedUser)return; const amount=Math.max(1,Math.floor(Number($('pointAwardAmount')?.value)||0)); const status=$('pointManageStatus'); try{const d=await api('/api/points/user',{method:'POST',body:JSON.stringify({platform:selectedUser.platform,username:selectedUser.username,displayName:selectedUser.displayName,amount})}); const before=Number(selectedUser.points||0), after=Number(d.account?.points ?? before+amount); selectedUser={...selectedUser,points:after}; paintUser(selectedUser); if(status){status.className='status ok';status.innerHTML=`<strong>✓ Puntos añadidos correctamente</strong> · +${amount.toLocaleString('es-PE')} pts · nuevo saldo ${after.toLocaleString('es-PE')} pts`; } const balance=document.querySelector('.point-user-balance strong'); if(balance){balance.animate([{transform:'scale(1)',color:'inherit'},{transform:'scale(1.16)',color:'#56e39f'},{transform:'scale(1)',color:'inherit'}],{duration:550,easing:'ease-out'});} }catch(e){if(status){status.className='status err';status.textContent=e.message||'No se pudieron añadir los puntos.';}}});
    window.addEventListener('beforeunload',()=>clearInterval(pollTimer),{once:true});
    updateManageLabels();
  }
  function openGivePointsModal(){
    const modal=document.createElement('div');
    modal.className='points-modal';
    modal.innerHTML=`<div class="points-modal-backdrop"></div><section class="points-modal-dialog points-give-dialog">
      <header><div><p class="eyebrow">GESTIÓN DE USUARIOS</p><h3>Dar puntos</h3><p class="muted">El saldo se guarda para tu cuenta StreamFusion y no depende del directo actual.</p></div><button class="miniBtn" data-close-points>×</button></header>
      <div class="points-give-grid">
        <label>Plataforma<select id="givePointsPlatform"><option value="tiktok">TikTok</option><option value="twitch">Twitch</option></select></label>
        <label>Usuario / uniqueId<input id="givePointsUsername" placeholder="@unique_id" autocomplete="off"></label>
        <label>Nombre visible (opcional)<input id="givePointsDisplay" placeholder="Nombre del usuario" autocomplete="off"></label>
        <label>Puntos<input id="givePointsAmount" type="number" min="1" step="1" value="100" inputmode="numeric"></label>
      </div>
      <div id="givePointsStatus" class="status"></div>
      <div class="row"><button class="btn secondary" data-close-points>Cancelar</button><button class="btn primary" id="confirmGivePoints">Añadir puntos</button></div>
    </section>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove(); modal.querySelectorAll('[data-close-points]').forEach(b=>b.onclick=close);
    modal.querySelector('.points-modal-backdrop').onclick=close;
    const status=modal.querySelector('#givePointsStatus');
    modal.querySelector('#confirmGivePoints').onclick=async()=>{
      const platform=modal.querySelector('#givePointsPlatform').value;
      const username=modal.querySelector('#givePointsUsername').value.trim();
      const displayName=modal.querySelector('#givePointsDisplay').value.trim()||username;
      const amount=Math.max(1,Math.floor(Number(modal.querySelector('#givePointsAmount').value)||0));
      if(!username||!amount){status.className='status err';status.textContent='Completa usuario y cantidad de puntos.';return;}
      try{
        const result=await api('/api/points/user',{method:'POST',body:JSON.stringify({platform,username,displayName,amount})});
        status.className='status ok'; status.textContent=result.message||(`Puntos añadidos: +${amount}`);
        setTimeout(close,650);
      }catch(e){status.className='status err';status.textContent=e.message||'No se pudieron añadir los puntos.';}
    };
  }

  function renderPowerTarget(){
    const wrap=$('pvGiftTargetWrap'); if(!wrap) return;
    const p=pointsDraft?.voicePower||{};
    if(p.source==='gift'){
      if(p.platform==='twitch') wrap.innerHTML=`<label>Activación Twitch<select id="pvGiftTarget"><option value="bits" ${p.targetKey==='bits'?'selected':''}>💎 Bits</option><option value="subscription" ${p.targetKey==='subscription'?'selected':''}>⭐ Suscripción</option><option value="subscriptiongift" ${p.targetKey==='subscriptiongift'?'selected':''}>🎁 Suscripción regalada</option></select></label>`;
      else { const gifts=(state.tiktokGiftCatalog||[]).slice(0,150); wrap.innerHTML=`<label>Regalo TikTok<select id="pvGiftTarget"><option value="">Selecciona un regalo</option>${gifts.map(g=>`<option value="${esc(g.key||g.id||g.name)}" ${String(p.targetKey||'')===String(g.key||g.id||g.name)?'selected':''}>${esc(g.displayNameEs||g.name||g.key)}</option>`).join('')}</select></label>`; }
      $('pvGiftTarget').onchange=e=>{pointsDraft.voicePower.targetKey=e.target.value;pointsDraft.voicePower.targetLabel=e.target.options[e.target.selectedIndex]?.textContent||e.target.value;};
    } else wrap.innerHTML='<div class="notice">Esta fuente no requiere seleccionar un regalo.</div>';
  }
  function openPointsUsersModal(powerOnly=false){
    const modal=document.createElement('div');modal.className='points-modal';
    if(!powerOnly){ window.open('/points-manager.html','streamfusionPointsManager','width=1040,height=760,noopener'); return; }
    const source=(settings.voiceBot?.powerUsers)||[];
    modal.innerHTML=`<div class="points-modal-backdrop"></div><section class="points-modal-dialog"><header><div><p class="eyebrow">${powerOnly?'ACCESO 🔥':'SISTEMA DE PUNTOS'}</p><h3>${powerOnly?'Usuarios con poder de voz':'Usuarios y puntos'}</h3></div><button class="miniBtn" data-close-points>×</button></header><div class="points-modal-list">${source.length?source.map((u,i)=> powerOnly?`<div class="points-user-row"><span>🔥</span><div class="grow"><strong>${esc(u.displayName||u.username)}</strong><small>${u.platform==='twitch'?'Twitch':'TikTok'} · @${esc(u.username)}</small></div><button class="miniBtn danger" data-remove-power="${esc(u.platform)}:${esc(u.username)}">Eliminar</button></div>`:`<div class="points-user-row"><span>${i+1}</span><div class="grow"><strong>${esc(u.displayName||u.username)}</strong><small>${u.platform==='twitch'?'Twitch':'TikTok'} · @${esc(u.username)}</small></div><b>${Number(u.points||0).toLocaleString('es-PE')} pts</b></div>`).join(''):'<div class="empty">No hay usuarios todavía.</div>'}</div></section>`;
    document.body.appendChild(modal);const close=()=>modal.remove();modal.querySelector('[data-close-points]').onclick=close;modal.querySelector('.points-modal-backdrop').onclick=close;
    modal.querySelectorAll('[data-remove-power]').forEach(btn=>btn.onclick=async()=>{const [platform,...rest]=btn.dataset.removePower.split(':');const username=rest.join(':');try{settings.voiceBot=settings.voiceBot||{};settings.voiceBot.powerUsers=(settings.voiceBot.powerUsers||[]).filter(v=>!(String(v.platform)===platform && String(v.username).toLowerCase()===username.toLowerCase()));await persistSettingsPatch({voiceBot:{powerUsers:settings.voiceBot.powerUsers}},false);toast('Acceso eliminado','La insignia 🔥 ya no está disponible para esa persona.');close();openPointsUsersModal(true);}catch(e){toast('No se pudo eliminar',e.message,'err')}});
  }
  function renderSettings(){
    const a=settings.appearance||{};
    const moderators=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[];
    const twitchModerators=Array.isArray(settings.twitchModerators)?settings.twitchModerators:[];
    $('view').innerHTML=`<div class="intro"><h2>Ajustes</h2><p>Todo lo que se guarda aquí pertenece a tu cuenta.</p></div><div class="settings-grid two"><article class="card"><p class="eyebrow">APARIENCIA DEL DASHBOARD</p><h3>Tema</h3>${ctl('Tema','sTheme','select',a.theme||'dark','<option value="dark">Noche profunda</option><option value="midnight">Medianoche</option><option value="light">Claro</option>')}<label>Color de acento<input id="sAccent" type="color" value="${esc(a.accent||'#7c5cff')}"></label><button class="btn primary" id="saveAppearance">Guardar</button></article><article class="card"><p class="eyebrow">CUENTA</p><h3>${esc(user?.displayName||'Creador')}</h3><p>${esc(user?.email||'')}</p><p class="muted">ID: ${esc(user?.id||'')}</p><button class="btn secondary" id="logout2">Cerrar sesión</button></article></div>
      <div class="settings-grid two"><article class="card moderator-settings"><div class="section-head"><div><p class="eyebrow">MODERACIÓN TIKTOK</p><h3>Añadir moderadores TikTok</h3></div><span class="badge-pill">🛡️</span></div><p class="muted">Agrega el <strong>uniqueId</strong> exacto de cada moderador del canal. Esos usuarios recibirán la insignia 🛡️ y entrarán en el filtro de Bot de voz “Solo moderadores”.</p><div class="row moderator-add-row"><label class="grow">Unique ID<input id="tiktokModeratorInput" placeholder="ej. usuario_tiktok_123" autocomplete="off"></label><button class="btn primary" id="addTiktokModerator">Añadir</button></div><div id="tiktokModeratorList" class="moderator-list">${moderators.length?moderators.map((id)=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-moderator="${esc(id)}" aria-label="Eliminar moderador">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>'}</div></article><article class="card moderator-settings"><div class="section-head"><div><p class="eyebrow">MODERACIÓN TWITCH</p><h3>Añadir moderadores Twitch</h3></div><span class="badge-pill">🛡️</span></div><p class="muted">Agrega el nombre de usuario del moderador de Twitch. Se usará para la condición de actividad «Moderador» y para la insignia de la experiencia de StreamFusion.</p><div class="row moderator-add-row"><label class="grow">Usuario<input id="twitchModeratorInput" placeholder="ej. moderador_twitch" autocomplete="off"></label><button class="btn primary" id="addTwitchModerator">Añadir</button></div><div id="twitchModeratorList" class="moderator-list">${twitchModerators.length?twitchModerators.map((id)=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-twitch-moderator="${esc(id)}">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>'}</div></article><article class="card"><p class="eyebrow">CÓMO FUNCIONA</p><h3>Filtro del Bot de voz</h3><p class="muted">Cuando el filtro global está en “Solo moderadores”, StreamFusion comprueba la insignia del mensaje. Los IDs configurados aquí se marcan automáticamente como moderadores en TikTok.</p><div class="notice">La insignia se muestra como <strong>🛡️</strong> y no cambia los permisos reales de TikTok.</div></article></div>`;
    $('saveAppearance').onclick=()=>persistSettingsPatch({appearance:{theme:$('sTheme').value,accent:$('sAccent').value}});
    $('logout2').onclick=logout;
    const renderModeratorList=()=>{ const wrap=$('tiktokModeratorList'); if(!wrap)return; const ids=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[]; wrap.innerHTML=ids.length?ids.map(id=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-moderator="${esc(id)}" aria-label="Eliminar moderador">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>'; wrap.querySelectorAll('[data-remove-moderator]').forEach(btn=>btn.onclick=async()=>{ const id=btn.dataset.removeModerator; settings.tiktokModerators=(settings.tiktokModerators||[]).filter(x=>String(x).toLowerCase()!==String(id).toLowerCase()); await persistSettingsPatch({tiktokModerators:settings.tiktokModerators},false); renderModeratorList(); }); };
    $('addTiktokModerator').onclick=async()=>{ const input=$('tiktokModeratorInput'); const id=normalizeUsername(input?.value||''); if(!id){toast('ID inválido','Escribe el uniqueId de TikTok.','err');return;} settings.tiktokModerators=Array.isArray(settings.tiktokModerators)?settings.tiktokModerators:[]; if(settings.tiktokModerators.some(x=>String(x).toLowerCase()===id.toLowerCase())){toast('Ya existe','Ese uniqueId ya está en la lista.','err');return;} settings.tiktokModerators=[...settings.tiktokModerators,id]; await persistSettingsPatch({tiktokModerators:settings.tiktokModerators},false); input.value=''; renderModeratorList(); toast('Moderador añadido','🛡️ se aplicará a sus mensajes.'); };
    renderModeratorList();
    const renderTwitchModeratorList=()=>{const wrap=$('twitchModeratorList');if(!wrap)return;const ids=Array.isArray(settings.twitchModerators)?settings.twitchModerators:[];wrap.innerHTML=ids.length?ids.map(id=>`<div class="moderator-chip"><span>🛡️</span><code>${esc(id)}</code><button type="button" class="miniBtn danger" data-remove-twitch-moderator="${esc(id)}">×</button></div>`).join(''):'<div class="empty">No hay moderadores configurados todavía.</div>';wrap.querySelectorAll('[data-remove-twitch-moderator]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.removeTwitchModerator;settings.twitchModerators=(settings.twitchModerators||[]).filter(x=>String(x).toLowerCase()!==String(id).toLowerCase());await persistSettingsPatch({twitchModerators:settings.twitchModerators},false);renderTwitchModeratorList();});};
    $('addTwitchModerator').onclick=async()=>{const input=$('twitchModeratorInput');const id=normalizeUsername(input?.value||'');if(!id){toast('ID inválido','Escribe el usuario de Twitch.','err');return;}settings.twitchModerators=Array.isArray(settings.twitchModerators)?settings.twitchModerators:[];if(settings.twitchModerators.some(x=>String(x).toLowerCase()===id.toLowerCase())){toast('Ya existe','Ese usuario ya está configurado.','err');return;}settings.twitchModerators=[...settings.twitchModerators,id];await persistSettingsPatch({twitchModerators:settings.twitchModerators},false);input.value='';renderTwitchModeratorList();toast('Moderador Twitch añadido','🛡️ se aplicará a su actividad.');};
    renderTwitchModeratorList();
  }

  function render(){ applyAppearance(); activateNav(); renderTop(); if(page==='dashboard')renderDashboard(); else if(page==='connections')renderConnections(); else if(page==='customize')renderCustomize(); else if(page==='overlays')renderOverlays(); else if(page==='roulette')renderRoulette(); else if(page==='voices')renderVoices(); else if(page==='points')renderPoints(); else if(page==='widgets')renderWidgets(); else renderSettings(); }

  function classifyEvent(item){ return activityKind(item); }
  function isCurrentConnectionEvent(item){
    const platform=String(item?.platform||'').toLowerCase();
    if(platform!=='tiktok' && platform!=='twitch') return true;
    const eventConnectionId=String(item?.connectionId||'').trim();
    if(!eventConnectionId) return true; // history/legacy entries without a session id
    const account=state.accounts[platform]||{};
    const current=String(account.connectionId||'').trim();
    // During the connection handshake the first chat/event can arrive before
    // accountState reaches the browser. Do not drop those legitimate events.
    if(!current && account.connected) return true;
    if(!current) return true;
    return eventConnectionId===current;
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
    const entry=normalizeIncomingActivity({...item,timestamp:item.timestamp||Date.now()});
    const key=eventFingerprint(entry,'activity'); const now=Date.now();
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
    socket.on('connect',async()=>{
      state.connection='online'; renderTop();
      // Always rehydrate the account's recent Dashboard data after every socket
      // connection/reconnection so the first frame cannot miss chat/events.
      await hydrateHistory();
      if(page==='dashboard') renderDashboard(true);
      if(page==='connections'||page==='overlays')render();
    });
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
    socket.on('liveEnded', info=>{const p=String(info?.platform||'tiktok').toLowerCase();if(state.activityBadges?.[p])state.activityBadges[p]={};if(state.supporters?.[p])state.supporters[p]={};});
    socket.on('accountState', d=>{if(!d?.platform)return;const platform=String(d.platform).toLowerCase();const previous=state.accounts[platform]||{};const next={...previous, ...d};if(next.connected===false || (previous.live===true && next.live===false)){ next.connectionId=''; state.chat=state.chat.filter(x=>String(x?.platform||'').toLowerCase()!==platform); state.events=state.events.filter(x=>String(x?.platform||'').toLowerCase()!==platform); state.gifts=state.gifts.filter(x=>String(x?.platform||'').toLowerCase()!==platform); if(state.activity?.[platform]) state.activity[platform]={}; if(state.supporters?.[platform]) state.supporters[platform]={}; } state.accounts[platform]=next;renderTop();updateDashboardConnectionStatus();if(page==='connections'||page==='overlays')render();if(page==='widgets'&&window.__sfVoiceWidgetEditorOpen){$('voicePreviewStatus')?.replaceChildren(document.createRange().createContextualFragment(voiceStatusMarkup()));}});
    socket.on('liveHistory', data=>{
      // Rehydrate without wiping items that arrived during the connection handshake.
      // This is important for the start-live/system card and for chat/events that
      // can arrive in the same moment the platform becomes available.
      const mergeUnique=(target, items, acceptFn)=>{
        (Array.isArray(items)?items:[]).forEach(raw=>{
          const item={...raw, connectionId:raw?.connectionId||''};
          const key=eventFingerprint(item, item?.source==='chat'?'chat':'activity');
          const exists=target.some(existing=>eventFingerprint(existing, item?.source==='chat'?'chat':'activity')===key);
          if(!exists) acceptFn(item);
        });
      };
      mergeUnique(state.chat, data?.chat, acceptChat);
      mergeUnique([...state.events,...state.gifts], data?.events, acceptEvent);
      state.historyLoaded=true;
      if(page==='dashboard') updateDashboardFeeds();
      if(page==='customize' && activeCustomizeTab==='chat') renderCustomizePreviewOnly();
    });
    setInterval(()=>{
      const cutoff=Date.now()-5*60*1000;
      const keepSystemStart=(x)=>{ const t=String(x?.type||x?.event||x?.action||'').toLowerCase(); return t==='stream_start'||t==='live_start'||t.includes('stream_start')||t.includes('live started')||t.includes('began'); };
      state.chat=state.chat.filter(x=>Number(x?.timestamp||0)>=cutoff);
      state.events=state.events.filter(x=>keepSystemStart(x)||Number(x?.timestamp||0)>=cutoff);
      state.gifts=state.gifts.filter(x=>Number(x?.timestamp||0)>=cutoff);
    },30000);
    socket.on('chat',d=>acceptChat(d||{}));
    socket.on('event',d=>acceptEvent(d||{}));
    socket.on('roulette:sync',s=>{
      rouletteState=s||rouletteState;
      if(s?.config){
        const serverConfig=merge(defaultRoulettePreviewConfig(),s.config);
        const localConfig=getRoulettePreviewConfig();
        const localSavedAt=localRoulettePreviewSavedAt();
        const serverUpdatedAt=serverRouletteUpdatedAt(serverConfig);
        // The newest revision wins. This prevents an older socket snapshot from
        // visually reverting a freshly selected option after changing pages.
        if(localSavedAt && !rouletteConfigEqual(localConfig,serverConfig) && localSavedAt > serverUpdatedAt) {
          roulettePreviewConfig=localConfig;
          if(socket?.connected) { try{socket.emit('roulette:update',localConfig);}catch{} }
        } else {
          roulettePreviewConfig=serverConfig;
          try{ localStorage.setItem('sf.roulette.preview.v1',JSON.stringify(roulettePreviewConfig)); localStorage.setItem('sf.roulette.preview.v1.savedAt',String(serverUpdatedAt||Date.now())); }catch{}
        }
      }
      syncRoulettePreviewHistoryFromServer();
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
      syncRoulettePreviewHistoryFromServer();
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
    try{ const me=await api('/api/me'); user=me.user; $('authScreen').classList.add('hidden');$('app').classList.remove('hidden');settings=merge(defaultSettings,await api('/api/user/settings')); rehydrateCustomizationFromStorage(); loadTikTokGiftCatalog().catch(()=>{}); saveCustomizationSnapshot(); try { const saved=JSON.parse(localStorage.getItem('sf.customize.modes.v1')||'null'); if(saved){ settings.personalization.eventStyle=saved.eventStyle||settings.personalization.eventStyle; settings.personalization.giftStyle=saved.giftStyle||settings.personalization.giftStyle; settings.personalization.eventSimulationMode=saved.eventSimulationMode||settings.personalization.eventSimulationMode||'single'; settings.personalization.giftSimulationMode=saved.giftSimulationMode||settings.personalization.giftSimulationMode||'single'; } } catch {} render();setupSocket(); }
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
