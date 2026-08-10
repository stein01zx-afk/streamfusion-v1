
    const socket = io();
    const list = document.getElementById('list');
    const SETTINGS_KEY = "streamfusion.ui.settings.v2";
    const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
    const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
    const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";
    const OVERLAY_UI_KEY = "streamfusion.overlay.ui.v1";
    const VOICEBOT_KEY = "streamfusion.voicebot.v1";
    const voiceBotDefaults = { enabled: false, filter: "all", voiceKey: "verity", fixedVoiceKey: "verity", sayDice: false, ignoreEmojis: true, ignoreSpecialChars: true, ignoreStickers: true, ignoreEmotes: true, onlySpanish: true, profanityFilter: true, antiSpamFilter: true, activeTab: "recipients", activeFixedPlatform: "tiktok", pendingByUser: {}, unlockedByUser: {}, fixedByUser: {}, seenEvents: {}, lastMessageByUser: {}, rules: [] };
    const voiceRuleDraftDefaults = { platform: "tiktok", kind: "gift", targetKey: "", targetLabel: "", targetImage: "", mode: "unlock", voiceKey: "verity", active: true };
    const voiceRuleKinds = {
      tiktok: [
        { value: "gift", label: "Regalo" },
        { value: "event", label: "Evento" },
        { value: "role", label: "Rol" },
      ],
      twitch: [
        { value: "bits", label: "Bits" },
        { value: "event", label: "Evento" },
        { value: "role", label: "Rol" },
      ],
    };
    const voiceRulePresetMap = {
      event: ["follow", "like", "share", "join", "raid", "sub", "system"],
      role: ["broadcaster", "moderator", "vip", "subscriber", "founder", "verified", "staff", "premium"],
      bits: ["1", "10", "50", "100", "500", "1000"],
    };
    const voiceRuleLabels = {
      follow: "Siguió",
      like: "Like",
      share: "Compartió",
      join: "Primera unión",
      raid: "Raid",
      sub: "Suscripción",
      system: "Sistema",
      broadcaster: "Streamer",
      moderator: "Moderador",
      vip: "VIP",
      subscriber: "Suscriptor",
      founder: "Founder",
      verified: "Verificado",
      staff: "Staff",
      premium: "Premium",
    };
    const voiceCatalog = {
      verity: { label: "Verity", id: "5e503fc64ded446a9f8636b6009db547" },
      naruto: { label: "Naruto Shippuden", id: "96d74deaad0e4fd2b38308e012bcc554" },
      goku: { label: "Goku", id: "9f850ee9ada24b20a6866825eaefd3f8" },
      vegeta: { label: "Vegeta", id: "86bc0bf60af340a887cfb9629bd7047a" },
      bob_esponja: { label: "Bob Esponja", id: "2358f01cb5b940008c7449c81fff95ad" },
      calamardo: { label: "Calamardo", id: "dac19523253641b49b61b3d1d244172d" },
      patricio_estrella: { label: "Patricio Estrella", id: "d0ef732d99b1469bad26e7cc4d4f0795" },
      narrador_esqueleto: { label: "Narrador Esqueleto", id: "bdd40ec2edde4942936f9462b650cc32" },
      l_death_note: { label: "L (Death Note)", id: "c5afca9b5d034454a96e5423bb26596f" },
      light_death_note: { label: "Light (Death Note)", id: "a3469e5cae5b446ab6a85915ee14c2f8" },
      ryuk_death_note: { label: "Ryuk (Death Note)", id: "53ff84820342480786e31f1001e298e7" },
      darwin_gumball: { label: "Darwin de Gumball", id: "70dc5a496c4347bd8cd0ea1f03a40333" },
      caine_circo_digital: { label: "Caine (Circo Digital)", id: "b38d657d5c254c5a903ff38db82624f7" },
      jax_circo_digital: { label: "Jax (Circo Digital)", id: "2efc3874f31547a1adaa340f6a0f5789" },
      kratos_gow3: { label: "Kratos (GOW 3)", id: "00e9d7ee37ff43d28486b7b42cbffbe9" },
      spiderman_ultimate: { label: "Spiderman Ultimate", id: "a90258f4e6344e8fb890356a9a85a205" },
      capitan_america: { label: "Capitán América", id: "57105c5b8a0b4d16853f6e08916b746d" },
      loquendo: { label: "Loquendo", id: "f3617f37b9e4453d84d6da6324ab3510" },
      locutor: { label: "Locutor", id: "3f45a7fd7a614655a61eb7027b955783" },
      el_dui_malcolm: { label: "El Dui de Malcolm", id: "37d28ffbfe0b483da35fef6c72ad70a6" },
      ponmi_dc: { label: "Ponmi DC", id: "4d344f4a9b704b4bafa8cde7652577a3" },
      falsity: { label: "Falsity", id: "6ff20006e383497fba3aa52719c9a729" },
      alastor: { label: "Alastor", id: "b94a93bc73ee4ddc93652e3a54f2a22d" },
      denji: { label: "Denji", id: "075f4afe629b49ecabed6debd3be1190" },
      reze: { label: "Reze", id: "514d8e8fbcbf460d9cc5cf8e7655643e" },
      morty_smith: { label: "Morty Smith", id: "172802891fb24f50a4558325e48dc48d" },
      rick_sanchez: { label: "Rick Sanchez", id: "c1569d1992204996802bb99a026bf64c" },
      shrek: { label: "Shrek", id: "0bf1d759a4d342548d108fb2513413cc" },
      mario_bros: { label: "Mario Bros", id: "89b244992a804bdd99ada9ee9a8d10bb" },
      gato_con_botas: { label: "Gato con botas", id: "464ca191f6db4af6951037893e640ee4" },
      jake_el_perro: { label: "Jake el perro", id: "c84062f178574341ba5fd2cf9c17c75b" },
      fin_el_humano: { label: "Fin el humano", id: "1b668294dbaf4c31984decbabcd9bcb6" },
      rey_helado: { label: "Rey Helado", id: "ec2a5e444c88404abfbbcd9520557301" },
      mickey_mouse: { label: "Mickey Mouse", id: "a73c21076a8b47b7a17883ccb8a3e3a4" },
      kasane_teto: { label: "Kasane Teto", id: "0118a35dcb604837abe7961a43e13ba8" },
      miku_hatsune: { label: "Miku Hatsune", id: "ef1d3957caf2433db755f6cd9990e778" },
      phineas: { label: "Phineas", id: "2c595c27e6464ad3aec645ea129e6064" },
      dr_doofenshmirtz: { label: "Dr Doofenshmirtz", id: "ec480d6a1edd449f857b209c6a388e50" },
      krilin_dbz: { label: "Krilin DBZ", id: "af9e344349214d4e9b18ec760ba2f992" },
      piccoro_dbz: { label: "Piccoro DBZ", id: "bd6408c1d0b8469ea89b83c5a5b15abd" },
      missa_death_note: { label: "Missa Death Note", id: "c6aad54044814847aa2e9c272a2b4815c" },
      missasinfonia_yt: { label: "Missasinfonia YT", id: "a41ea09d4e214ef8841e47057b43f622" },
      tony_stark: { label: "Tony Stark", id: "cc5584d3bd7645b68615df1aa401f364" },
      adam_sandler: { label: "Adam Sandler", id: "61edac17635d47b3adaed31570be4902" },
      abrahaham_yt: { label: "Abrahaham YT", id: "62e4c757e0024cdba0b3f0bae795818b" },
      farid_dieck_yt: { label: "Farid Dieck YT", id: "dfa5b230c8054f429e434f4a6e9bbdec" },
      german_garmendia: { label: "German Garmendia", id: "e3dc6e29fcc94fbbb523cb2b3d7b4c62" },
      auronplay: { label: "Auronplay", id: "379d2b2fd78943bc86b94a5aca6ff35b" },
      elrubius: { label: "ElRubius", id: "39382efbc7584d428f0f789d882cd3b8" },
      fernanfloo: { label: "Fernanfloo", id: "5549e2e3308845f084af794ce31d5770" },
      ibai: { label: "Ibai", id: "dada7de849e641b79911c9c553c122b3" },
      messi: { label: "Messi", id: "18d5dcc7904945569b728b88ddf0a1a1" },
      cr7: { label: "CR7", id: "251a9aeff7eb4e789917131416ce1a0b" },
      paisana_jacinta: { label: "Paisana Jacinta", id: "61e907797ce848be99652566fe145125" },
    };
    function voiceOptionsHtml(){
      return Object.entries(voiceCatalog).map(([key, voice]) => `<option value="${esc(key)}">${esc(voice.label)}</option>`).join("");
    }
    const overlayUiDefaults = { zoom: 1, backgroundMode: "transparent", backgroundColor: "#111827" };

    const defaults = { personal: { theme:"dark", overlayTheme:"neon", font:"inter", animation:"slide", chatLayout:"vertical", chatDirection:"down", chatTheme:"cloud", avatarFrame:"platform", bubbleFrame:"platform", avatarSize:"md", nameSize:"md", nameWeight:"800", chatHorizontalMode:"normal", chatOverlayShape:"normal", chatOverlayCardSide:"left", chatAdjustMessages:false, badgeStyle:"emoji", twitchNameColor:"real", tiktokNameColor:"white", messageEffect:"shadow", nameEffect:"shadow", textColor:"auto", showBadges:true, showEmotes:true, highlightSupporters:true, highlightSupportersTikTok:true, highlightSupportersTwitch:true, supporterHighlightStyle:"gold", eventsLayout:"vertical", eventsDirection:"down", eventsMode:"slide", eventsPanelSize:"normal", eventsOverlayShape:"normal", eventsOverlayCardSide:"left", eventsCardFrame:true, eventsAutoClear:false, eventsClearSeconds:30, giftsLayout:"vertical", giftsDirection:"down", giftsMode:"slide", giftsPanelSize:"normal", giftsOverlayShape:"normal", giftsOverlayCardSide:"left", giftsCardFrame:true, giftsAutoClear:false, giftsClearSeconds:30, highlightStyle:"platform", giftHighlightStyle:"gold", overlayEventHighlightStyle:"platform", overlayGiftImageSize:"md", overlayGiftComposition:"normal", highlightEventUsername:true, highlightLikes:true, highlightFollows:true, highlightJoins:true, highlightShares:true, highlightSystem:true, highlightFanclub:true, highlightSuperfan:true, highlightGifts:true, highlightSubs:true, highlightBits:true, highlightRaids:true, autoClearChat:false, clearChatSeconds:30, tiktokAvatarUrl:"" } };
    let settings = loadSettings();
    let state = { chat:[], events:[], gifts:[], supporters: loadJSON(SUPPORTERS_KEY, { tiktok:{}, twitch:{} }), activityBadges: loadJSON(ACTIVITY_BADGES_KEY, { tiktok:{}, twitch:{} }) };
    let followState = { chat:true, events:true, gifts:true };
    let voiceBot = loadStoredJSON(VOICEBOT_KEY, voiceBotDefaults);
    let voiceBotQueue = [];
    let voiceBotSpeaking = false;
    let voiceBotAudio = null;
    let voiceRuleDraft = structuredClone(voiceRuleDraftDefaults);
    const view = new URLSearchParams(location.search).get("view") || "chat";
    const platformColors = { tiktok: "#fe2c55", twitch: "#9146ff" };
    const roleBadges = {
      broadcaster: { emoji: "👑", color: "#f5d063" },
      moderator: { emoji: "🛡️", color: "#60a5fa" },
      vip: { emoji: "💎", color: "#22c55e" },
      subscriber: { emoji: "⭐", color: "#a78bfa" },
      staff: { emoji: "🧰", color: "#f97316" },
      verified: { emoji: "✅", color: "#22c55e" },
      founder: { emoji: "🏁", color: "#f5d063" },
      premium: { emoji: "✨", color: "#fb7185" },
      tiktok: { emoji: "🎵", color: "#fe2c55" },
      twitch: { emoji: "🟣", color: "#9146ff" },
    };
    const ACTIVITY_BADGE_RULES = [
      { emoji:'🎁',label:'Envió regalo' },
      { emoji:'⭐',label:'Suscripción' },
      { emoji:'💎',label:'Bits' },
      { emoji:'⚡',label:'Raid' },
      { emoji:'🗣',label:'Compartió' },
      { emoji:'👻',label:'Se unió' },
      { emoji:'👤',label:'Siguió' },
      { emoji:'❤️',label:'Dio like' }
    ];

    const PRESENCE_KEY = "streamfusion.ui.presence.v1";
    const SESSION_KEY = "streamfusion.ui.session.v2";

    function loadStoredJSON(key, fallback){ try { const raw = localStorage.getItem(key); if(!raw) return structuredClone(fallback); return mergeDeep(structuredClone(fallback), JSON.parse(raw)); } catch { return structuredClone(fallback); } }
    function loadOverlayPresence(){ return loadStoredJSON(PRESENCE_KEY, { tiktok:{ connected:false, live:false, lastSignal:0, mode:"saved" }, twitch:{ connected:false, live:false, lastSignal:0, mode:"saved" } }); }
    function loadOverlaySession(){ return loadStoredJSON(SESSION_KEY, { tiktok:{ username:"", connected:false, avatarUrl:"" }, twitch:{ username:"", connected:false, avatarUrl:"" } }); }
    function overlayConnectionState(){
      const presence = loadOverlayPresence();
      const session = loadOverlaySession();
      const platforms = ["tiktok", "twitch"];
      const anyConnected = platforms.some((platform) => Boolean(session?.[platform]?.connected || presence?.[platform]?.connected));
      const anyLive = platforms.some((platform) => Boolean(session?.[platform]?.connected && presence?.[platform]?.live));
      if (anyLive) return { state:"live", label:"Conectado en directo" };
      if (anyConnected) return { state:"waiting", label:"Conectado, esperando... directo" };
      return { state:"offline", label:"Desconectado" };
    }
    function updateOverlayStatus(){
      const el = document.getElementById("overlayStatus");
      const text = document.getElementById("overlayStatusText");
      if (!el || !text) return;
      const info = overlayConnectionState();
      el.dataset.state = info.state;
      text.textContent = info.label;
    }

    function esc(v){return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
    function mergeDeep(base, incoming){ if(Array.isArray(base)||Array.isArray(incoming)) return incoming ?? base; if(typeof base !== 'object' || base===null) return incoming ?? base; if(typeof incoming !== 'object' || incoming===null) return base; const out={...base}; for(const k of Object.keys(incoming)) out[k] = k in base ? mergeDeep(base[k], incoming[k]) : incoming[k]; return out; }
    function loadJSON(key,fallback){ try{ const raw=localStorage.getItem(key); if(!raw) return structuredClone(fallback); return mergeDeep(structuredClone(fallback), JSON.parse(raw)); } catch { return structuredClone(fallback); } }
    function normalizeImageSource(value){ const src = String(value ?? "").trim(); if(!src) return ""; if(/^https?:\/\//i.test(src)) return src; if(/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(src)) return src; return ""; }
    function normalizeUsername(value){ return String(value||'').trim().replace(/^https?:\/\/(www\.)?tiktok\.com\/@/i,'').replace(/^https?:\/\/(www\.)?twitch\.tv\//i,'').replace(/^@+/, '').replace(/^#+/, '').split(/[/?#]/)[0].trim(); }
    function normalizeVoicePlatform(value){ return String(value || "tiktok").toLowerCase() === "twitch" ? "twitch" : "tiktok"; }
    function normalizeVoiceUserName(value){ return normalizeUsername(value).toLowerCase(); }
    function voiceUserStorageKey(platform, username){
      const user = normalizeVoiceUserName(username);
      if (!user) return "";
      return `${normalizeVoicePlatform(platform)}:${user}`;
    }
    function parseVoiceUserStorageKey(key, fallbackPlatform = "tiktok"){
      const raw = String(key || "").trim().toLowerCase();
      if (!raw) return { platform: normalizeVoicePlatform(fallbackPlatform), username: "" };
      const idx = raw.indexOf(":");
      if (idx > 0) {
        const platform = normalizeVoicePlatform(raw.slice(0, idx));
        const username = normalizeVoiceUserName(raw.slice(idx + 1));
        return { platform, username };
      }
      return { platform: normalizeVoicePlatform(fallbackPlatform), username: normalizeVoiceUserName(raw) };
    }
    function voiceUserIdentity(item){
      const platform = normalizeVoicePlatform(item?.platform);
      const username = normalizeVoiceUserName(item?.uniqueId || item?.user || item?.displayName || item?.username || "");
      return { platform, username, key: voiceUserStorageKey(platform, username) };
    }
    function voiceUserLookupKeys(item){
      const identity = voiceUserIdentity(item);
      return [...new Set([identity.key, identity.username].filter(Boolean))];
    }
    function normalizeVoiceAssignmentEntry(entry, fallbackKey = ""){
      if (!entry || typeof entry !== "object") return null;
      const parsed = parseVoiceUserStorageKey(fallbackKey, entry.platform || "tiktok");
      const platform = normalizeVoicePlatform(entry.platform || parsed.platform);
      const username = normalizeVoiceUserName(entry.username || parsed.username || entry.displayName || entry.label || "");
      const key = voiceUserStorageKey(platform, username);
      if (!key) return null;
      const voiceKey = entry?.voiceKey in voiceCatalog ? entry.voiceKey : "verity";
      return {
        ...entry,
        key,
        platform,
        username,
        displayName: String(entry?.displayName || entry?.label || entry?.username || username).trim() || username,
        voiceKey,
        createdAt: Number(entry?.createdAt || Date.now()),
        updatedAt: Number(entry?.updatedAt || Date.now()),
      };
    }
    function normalizeVoiceFixedEntry(entry, fallbackKey = ""){
      const normalized = normalizeVoiceAssignmentEntry(entry, fallbackKey);
      if (!normalized) return null;
      return {
        ...normalized,
        key: normalized.key,
      };
    }
    function normalizeVoiceAssignmentStore(store){
      const next = {};
      const source = store && typeof store === "object" ? store : {};
      for (const [key, entry] of Object.entries(source)) {
        const normalized = normalizeVoiceAssignmentEntry(entry, key);
        if (!normalized) continue;
        next[normalized.key] = normalized;
      }
      return next;
    }
    function normalizeTypeName(value){ return String(value || '').trim().toLowerCase(); }
    function migrateSettings(settingsObj){ const s=settingsObj||{}; if(!s.personal) s.personal={}; const p=s.personal; if(p.highlightSupportersTikTok===undefined) p.highlightSupportersTikTok = p.highlightSupporters !== false; if(p.highlightSupportersTwitch===undefined) p.highlightSupportersTwitch = p.highlightSupporters !== false; if(p.chatAdjustMessages===undefined) p.chatAdjustMessages = false; p.chatOverlayShape = normalizeOverlayShape(p.chatOverlayShape); p.chatOverlayCardSide = normalizeOverlayCardSide(p.chatOverlayCardSide); if(p.eventsCardFrame===undefined) p.eventsCardFrame = true; p.eventsOverlayShape = normalizeOverlayShape(p.eventsOverlayShape); p.eventsOverlayCardSide = normalizeOverlayCardSide(p.eventsOverlayCardSide); if(p.eventsMode===undefined) p.eventsMode = "slide"; if(p.eventsAutoClear===undefined) p.eventsAutoClear = false; if(p.eventsClearSeconds===undefined) p.eventsClearSeconds = 30; if(p.giftsCardFrame===undefined) p.giftsCardFrame = true; p.giftsOverlayShape = normalizeOverlayShape(p.giftsOverlayShape); p.giftsOverlayCardSide = normalizeOverlayCardSide(p.giftsOverlayCardSide); if(p.giftsMode===undefined) p.giftsMode = "slide"; if(p.giftsAutoClear===undefined) p.giftsAutoClear = false; if(p.giftsClearSeconds===undefined) p.giftsClearSeconds = 30; return s; }
    function normalizeVoiceBotRule(rule){
      const item = rule || {};
      return {
        id: String(item.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2,8)}`),
        platform: item.platform === "twitch" ? "twitch" : "tiktok",
        kind: ["gift", "event", "role", "bits"].includes(String(item.kind || "").toLowerCase()) ? String(item.kind).toLowerCase() : "gift",
        targetKey: String(item.targetKey || "").trim(),
        targetLabel: String(item.targetLabel || item.label || item.targetKey || "").trim(),
        targetImage: String(item.targetImage || "").trim(),
        mode: String(item.mode || "unlock").toLowerCase() === "unlock" ? "unlock" : "once",
        voiceKey: item.voiceKey in voiceCatalog ? item.voiceKey : "verity",
        active: item.active !== false,
        createdAt: Number(item.createdAt || Date.now()),
        updatedAt: Number(item.updatedAt || Date.now()),
      };
    }
    function normalizeVoiceBotState(bot){
      const source = bot || {};
      const normalizedRules = Array.isArray(source.rules) ? source.rules.map(normalizeVoiceBotRule) : [];
      const activeRuleIds = new Set(normalizedRules.filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
      const pruneAssignments = (store) => {
        const next = {};
        for (const [key, assignment] of Object.entries(store && typeof store === "object" ? store : {})) {
          const normalized = normalizeVoiceAssignmentEntry(assignment, key);
          const ruleId = String(normalized?.ruleId || "");
          if (!normalized) continue;
          if (!ruleId || activeRuleIds.has(ruleId)) next[normalized.key] = normalized;
        }
        return next;
      };
      return {
        enabled: Boolean(source.enabled),
        filter: source.filter === "supporters" ? "supporters" : source.filter === "followers" ? "followers" : source.filter === "moderators" ? "moderators" : source.filter === "custom" ? "custom" : "all",
        voiceKey: source.voiceKey in voiceCatalog ? source.voiceKey : "verity",
        fixedVoiceKey: source.fixedVoiceKey in voiceCatalog ? source.fixedVoiceKey : (source.voiceKey in voiceCatalog ? source.voiceKey : "verity"),
        sayDice: Boolean(source.sayDice),
        ignoreEmojis: source.ignoreEmojis !== false,
        ignoreSpecialChars: source.ignoreSpecialChars !== false,
        ignoreStickers: source.ignoreStickers !== false,
        ignoreEmotes: source.ignoreEmotes !== false,
        onlySpanish: source.onlySpanish !== false,
        profanityFilter: source.profanityFilter !== false,
        antiSpamFilter: source.antiSpamFilter !== false,
        activeTab: ["recipients", "rules", "users", "settings"].includes(String(source.activeTab || "")) ? String(source.activeTab) : "recipients",
        activeFixedPlatform: normalizeVoicePlatform(source.activeFixedPlatform || "tiktok"),
        pendingByUser: normalizeVoiceAssignmentStore(pruneAssignments(source.pendingByUser)),
        unlockedByUser: normalizeVoiceAssignmentStore(pruneAssignments(source.unlockedByUser)),
        fixedByUser: (() => {
          const next = {};
          const store = source.fixedByUser && typeof source.fixedByUser === "object" ? source.fixedByUser : {};
          for (const [key, entry] of Object.entries(store)) {
            const normalized = normalizeVoiceFixedEntry(entry, key);
            if (!normalized) continue;
            next[normalized.key] = normalized;
          }
          return next;
        })(),
        seenEvents: source.seenEvents && typeof source.seenEvents === "object" ? source.seenEvents : {},
        lastMessageByUser: (() => {
          const next = {};
          const store = source.lastMessageByUser && typeof source.lastMessageByUser === "object" ? source.lastMessageByUser : {};
          for (const [key, value] of Object.entries(store)) {
            const parsed = parseVoiceUserStorageKey(key);
            const normalizedKey = voiceUserStorageKey(parsed.platform, parsed.username);
            if (normalizedKey) next[normalizedKey] = value;
          }
          return next;
        })(),
        rules: normalizedRules,
      };
    }
    function loadSettings(){ const saved=localStorage.getItem(SETTINGS_KEY); if(saved) return migrateSettings(loadJSON(SETTINGS_KEY, defaults)); const legacy=localStorage.getItem(LEGACY_SETTINGS_KEY); if(legacy){ try{return migrateSettings(mergeDeep(structuredClone(defaults), JSON.parse(legacy)));}catch{return structuredClone(defaults);} } return migrateSettings(structuredClone(defaults)); }
    function loadOverlayUi(){ return loadStoredJSON(OVERLAY_UI_KEY, overlayUiDefaults); }
    function saveOverlayUi(){ try { localStorage.setItem(OVERLAY_UI_KEY, JSON.stringify(overlayUi)); } catch {} }
    function loadVoiceBot(){ voiceBot = normalizeVoiceBotState(loadStoredJSON(VOICEBOT_KEY, voiceBotDefaults)); return voiceBot; }
    function saveVoiceBot(){ try { localStorage.setItem(VOICEBOT_KEY, JSON.stringify(voiceBot)); } catch {} }
    let overlayUi = loadOverlayUi();
    function clampZoom(value){ return Math.max(0.75, Math.min(1.55, Number(value) || 1)); }
    function syncBackgroundButtonState(){
      const input = document.getElementById("overlayBgColorInput");
      const choiceButtons = document.querySelectorAll(".overlayBackgroundChoice");
      if (input) input.value = String(overlayUi.backgroundColor || overlayUiDefaults.backgroundColor);
      choiceButtons.forEach((btn) => {
        const mode = String(btn.dataset.overlayBgMode || "");
        const color = String(btn.dataset.overlayBgColor || "");
        const active = (overlayUi.backgroundMode === mode) && (mode !== "color" || String(overlayUi.backgroundColor || "").toLowerCase() === color.toLowerCase());
        btn.classList.toggle("is-active", active);
      });
    }
    function applyOverlayUi(){
      overlayUi.zoom = clampZoom(overlayUi.zoom);
      if (!overlayUi.backgroundMode) overlayUi.backgroundMode = "transparent";
      if (!overlayUi.backgroundColor) overlayUi.backgroundColor = overlayUiDefaults.backgroundColor;
      document.documentElement.style.setProperty("--overlay-zoom", String(overlayUi.zoom));
      document.body.style.setProperty("--overlay-zoom", String(overlayUi.zoom));
      const modes = ["overlay-bg-transparent","overlay-bg-greenscreen","overlay-bg-color"];
      document.documentElement.classList.remove(...modes);
      document.body.classList.remove(...modes);
      const mode = overlayUi.backgroundMode;
      const bgColor = mode === "greenscreen" ? "#00ff00" : mode === "color" ? String(overlayUi.backgroundColor || overlayUiDefaults.backgroundColor) : "transparent";
      const solid = mode === "transparent" ? "transparent" : bgColor;
      document.documentElement.classList.add(mode === "greenscreen" ? "overlay-bg-greenscreen" : mode === "color" ? "overlay-bg-color" : "overlay-bg-transparent");
      document.body.classList.add(mode === "greenscreen" ? "overlay-bg-greenscreen" : mode === "color" ? "overlay-bg-color" : "overlay-bg-transparent");
      document.documentElement.style.background = solid;
      document.body.style.background = solid;
      document.documentElement.style.backgroundColor = solid;
      document.body.style.backgroundColor = solid;
      document.documentElement.style.setProperty("--overlay-bg-solid", solid);
      document.body.style.setProperty("--overlay-bg-solid", solid);
      saveOverlayUi();
      syncBackgroundButtonState();
      syncVoiceBotUI();
    }
    function openBackgroundModal(){
      const modal = document.getElementById("overlayBackgroundModal");
      if (!modal) return;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      syncBackgroundButtonState();
    }
    function closeBackgroundModal(){
      const modal = document.getElementById("overlayBackgroundModal");
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
    function setOverlayBackground(mode, color){
      overlayUi.backgroundMode = mode;
      if (color) overlayUi.backgroundColor = color;
      applyOverlayUi();
      render();
    }

function adjustOverlayZoom(delta){
  overlayUi.zoom = clampZoom((Number(overlayUi.zoom) || 1) + delta);
  applyOverlayUi();
  render();
}

    function selectedVoice(){
      return voiceCatalog[voiceBot.voiceKey] || voiceCatalog.verity;
    }
    function voiceBotSummaryText(){
  const voice = selectedVoice();
  const filterLabel = voiceFilterLabel(voiceBot.filter);
  const stateLabel = voiceBot.enabled ? "Encendido" : "Apagado";
  const flags = [
    voiceBot.sayDice ? "dice" : null,
    voiceBot.ignoreEmojis ? "sin emojis" : null,
    voiceBot.ignoreSpecialChars ? "sin símbolos" : null,
    voiceBot.ignoreStickers ? "sin stickers" : null,
    voiceBot.ignoreEmotes ? "sin emotes" : null,
    voiceBot.onlySpanish ? "solo español" : null,
    voiceBot.antiSpamFilter ? "sin spam" : null,
    voiceBot.profanityFilter ? "sin groserías" : null,
  ].filter(Boolean).join(" · ");
  const fixedCount = Object.keys(voiceBot.fixedByUser || {}).length;
  return `${stateLabel} · ${filterLabel} · Voz: ${voice.label}${fixedCount ? ` · ${fixedCount} voz${fixedCount === 1 ? "" : "es"} fijada${fixedCount === 1 ? "" : "s"}` : ""}${flags ? ` · ${flags}` : ""}`;
}

function voiceBotSummaryHtml(){
  const voice = selectedVoice();
  const chips = [
    { label: voiceBot.enabled ? "Bot encendido" : "Bot apagado", active: true, state: voiceBot.enabled ? "on" : "off" },
    { label: `Voz: ${voice.label}`, active: true, state: "info" },
    { label: `Filtro global: ${voiceFilterLabel(voiceBot.filter)}`, active: true, state: "info" },
    { label: "Decir “dice”", active: voiceBot.sayDice, state: "on" },
    { label: "Sin emojis", active: voiceBot.ignoreEmojis, state: "on" },
    { label: "Sin símbolos", active: voiceBot.ignoreSpecialChars, state: "on" },
    { label: "Sin stickers", active: voiceBot.ignoreStickers, state: "on" },
    { label: "Sin emotes", active: voiceBot.ignoreEmotes, state: "on" },
    { label: "Solo español", active: voiceBot.onlySpanish, state: "on" },
    { label: "Sin spam", active: voiceBot.antiSpamFilter, state: "on" },
    { label: "Sin groserías", active: voiceBot.profanityFilter, state: "on" },
  ];
  return chips
    .filter((chip) => chip.active)
    .map((chip) => `<span class="overlayVoiceSummaryChip overlayVoiceSummaryChip--${chip.state}">${esc(chip.label)}</span>`)
    .join("");
}
    function voiceFixedStore(){
      const store = voiceBot.fixedByUser && typeof voiceBot.fixedByUser === "object" ? voiceBot.fixedByUser : {};
      const next = {};
      for (const [key, entry] of Object.entries(store)) {
        const normalized = normalizeVoiceFixedEntry(entry, key);
        if (!normalized) continue;
        next[normalized.key] = normalized;
      }
      voiceBot.fixedByUser = next;
      return next;
    }
    function hasFixedVoiceAssignment(item){
      const keys = voiceUserLookupKeys(item);
      return keys.some((key) => Boolean(voiceBot.fixedByUser?.[key]));
    }
    function setVoiceFixedAssignment(platform, username, voiceKey){
      const normalizedPlatform = normalizeVoicePlatform(platform);
      const rawUsername = String(username || "").trim();
      const normalizedUsername = normalizeVoiceUserName(rawUsername);
      const normalizedVoice = voiceKey in voiceCatalog ? voiceKey : "verity";
      const key = voiceUserStorageKey(normalizedPlatform, normalizedUsername);
      if (!key) return null;
      voiceBot.fixedByUser = voiceBot.fixedByUser && typeof voiceBot.fixedByUser === "object" ? voiceBot.fixedByUser : {};
      const previous = voiceBot.fixedByUser[key];
      voiceBot.fixedByUser[key] = {
        key,
        platform: normalizedPlatform,
        username: normalizedUsername,
        displayName: previous?.displayName || rawUsername || normalizedUsername,
        voiceKey: normalizedVoice,
        createdAt: Number(previous?.createdAt || Date.now()),
        updatedAt: Date.now(),
      };
      saveVoiceBot();
      syncVoiceBotUI();
      return voiceBot.fixedByUser[key];
    }
    function removeVoiceFixedAssignment(platformOrKey, username = ""){
      const key = String(username ? voiceUserStorageKey(platformOrKey, username) : platformOrKey || "").trim().toLowerCase();
      if (!key) return;
      if (voiceBot.fixedByUser?.[key]) {
        delete voiceBot.fixedByUser[key];
        saveVoiceBot();
        syncVoiceBotUI();
      }
    }
    function voiceKnownUserCandidates(query = "", platform = "tiktok"){
      const q = normalizeMatchKey(query);
      const selectedPlatform = normalizeVoicePlatform(platform);
      const seen = new Map();
      const add = (value, label = "", platformName = "", source = "") => {
        const username = normalizeVoiceUserName(value);
        if (!username) return;
        const p = normalizeVoicePlatform(platformName);
        const key = voiceUserStorageKey(p, username);
        const existing = seen.get(key) || { key, username, label: label || username, platform: p, sources: new Set() };
        if (label && (!existing.label || String(label).length < String(existing.label).length)) existing.label = label;
        if (source) existing.sources.add(source);
        seen.set(key, existing);
      };
      for (const item of [...(state.chat || []), ...(state.events || []), ...(state.gifts || [])]) {
        add(item?.user || item?.displayName || item?.username || item?.uniqueId, item?.displayName || item?.user || item?.username || "", item?.platform || "tiktok", "feed");
      }
      for (const [platformName, entries] of Object.entries(state.supporters || {})) {
        for (const [username] of Object.entries(entries || {})) add(username, username, platformName, "supporter");
      }
      for (const [platformName, entries] of Object.entries(state.activityBadges || {})) {
        for (const [username] of Object.entries(entries || {})) {
          const entry = entries?.[username] || {};
          add(username, entry?.displayName || username, platformName, "activity");
        }
      }
      for (const [key, entry] of Object.entries(voiceBot.fixedByUser || {})) {
        const normalized = normalizeVoiceFixedEntry(entry, key);
        if (normalized) add(normalized.username, normalized.displayName || normalized.username, normalized.platform, "fixed");
      }
      const list = [...seen.values()]
        .filter((item) => item.platform === selectedPlatform)
        .map((item) => ({
          username: item.username,
          label: item.label || item.username,
          platform: item.platform || "tiktok",
          score: (() => {
            const n = normalizeMatchKey(item.username);
            const l = normalizeMatchKey(item.label);
            if (!q) return 0;
            if (n === q || l === q) return 0;
            if (n.startsWith(q) || l.startsWith(q)) return 1;
            if (n.includes(q) || l.includes(q)) return 2;
            return 3;
          })(),
        }))
        .filter((item) => !q || normalizeMatchKey(item.username).includes(q) || normalizeMatchKey(item.label).includes(q))
        .sort((a, b) => a.score - b.score || a.username.localeCompare(b.username, "es"));
      return list.slice(0, 30);
    }
    function renderVoiceFixedSuggestions(){
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const platformSelect = document.getElementById("overlayVoicePinnedPlatformSelect");
      const list = document.getElementById("overlayVoicePinnedSuggestions");
      const helper = document.getElementById("overlayVoicePinnedSummary");
      if (!list) return;
      const platform = String(platformSelect?.value || "tiktok");
      const candidates = voiceKnownUserCandidates(input?.value || "", platform);
      list.innerHTML = candidates.map((item) => `<option value="@${esc(item.username)}">${esc(item.label)} · @${esc(item.username)}</option>`).join("");
      if (helper) {
        helper.innerHTML = candidates.length
          ? candidates.slice(0, 8).map((item) => `<button type="button" class="overlayVoicePinnedSuggestion ${voiceBot.fixedByUser?.[voiceUserStorageKey(item.platform, item.username)] ? 'is-muted' : ''}" data-voice-user-fill="@${esc(item.username)}" data-voice-user-platform="${esc(item.platform)}"><span>${esc(item.label)}</span><small>@${esc(item.username)} · ${esc(item.platform === 'twitch' ? 'Twitch' : 'TikTok')}</small></button>`).join("")
          : `<div class="overlayVoiceHelp">Empieza a escribir y aparecerán usuarios conocidos del canal elegido.</div>`;
      }
    }
    function renderVoiceFixedUsers(){
      const rail = document.getElementById("overlayVoicePinnedList");
      if (!rail) return;
      const entries = Object.values(voiceFixedStore()).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      if (!entries.length) {
        rail.innerHTML = `<div class="overlayVoiceHelp">Todavía no hay usuarios fijados.</div>`;
        return;
      }
      const grouped = entries.reduce((acc, entry) => {
        const platform = normalizeVoicePlatform(entry.platform);
        if (!acc[platform]) acc[platform] = [];
        acc[platform].push(entry);
        return acc;
      }, { tiktok: [], twitch: [] });
      rail.innerHTML = ["tiktok", "twitch"].map((platform) => {
        const items = grouped[platform] || [];
        if (!items.length) return "";
        const title = platform === "twitch" ? "Twitch" : "TikTok";
        return `<div class="overlayVoicePinnedGroup"><div class="overlayVoicePinnedGroupTitle">${title}</div>${items.map((entry) => {
          const voice = voiceCatalog[entry.voiceKey] || voiceCatalog.verity;
          return `<article class="overlayVoicePinnedCard"><div class="overlayVoicePinnedCardMain"><strong>${esc(entry.displayName || entry.username)}</strong><span>@${esc(entry.username)} · ${title} · Voz: ${esc(voice.label)}</span><span class="overlayVoicePinnedCardMeta">Prioridad fija hasta que la borres o la cambies.</span></div><div class="overlayVoicePinnedCardActions"><button type="button" class="overlayVoicePinnedIconBtn" data-voice-fixed-delete="${esc(entry.key)}" aria-label="Eliminar voz fija">🗑️</button></div></article>`;
        }).join("")}</div>`;
      }).filter(Boolean).join("");
    }
    function normalizeVoiceRuleDraft(){
      voiceRuleDraft.platform = voiceRuleDraft.platform === "twitch" ? "twitch" : "tiktok";
      voiceRuleDraft.kind = ["gift", "event", "role", "bits"].includes(voiceRuleDraft.kind) ? voiceRuleDraft.kind : (voiceRuleDraft.platform === "twitch" ? "bits" : "gift");
      voiceRuleDraft.mode = voiceRuleDraft.mode === "unlock" ? "unlock" : "once";
      voiceRuleDraft.voiceKey = voiceRuleDraft.voiceKey in voiceCatalog ? voiceRuleDraft.voiceKey : "verity";
      voiceRuleDraft.active = voiceRuleDraft.active !== false;
      if (!voiceRuleDraft.targetKey) voiceRuleDraft.targetLabel = "";
      return voiceRuleDraft;
    }
    function voiceUserKey(item){ return normalizeVoiceUserName(item?.uniqueId || item?.user || item?.displayName || item?.username || ""); }
    function voiceFilterLabel(value){
      const filter = String(value || "all").toLowerCase();
      if (filter === "supporters") return "Solo donadores";
      if (filter === "followers") return "Solo seguidores";
      if (filter === "moderators") return "Solo moderadores";
      if (filter === "custom") return "Personalizado";
      return "Todo el chat";
    }
    function voiceActivityEntry(item){
      const platform = String(item?.platform || "tiktok").toLowerCase();
      const keys = [voiceUserKey(item), normalizeUsername(item?.displayName || ""), normalizeUsername(item?.user || ""), normalizeUsername(item?.username || "")].filter(Boolean);
      for (const key of [...new Set(keys)]) {
        const entry = state.activityBadges?.[platform]?.[key];
        if (entry?.badges || entry?.lastGift) return entry;
      }
      return null;
    }
    function voiceHasActivityBadge(item, emoji){
      const entry = voiceActivityEntry(item);
      return Boolean(entry?.badges?.[emoji]);
    }
    function isVoiceFollower(item){
      const type = normalizeTypeName(item?.type);
      const group = normalizeTypeName(item?.group);
      return type.includes("follow") || group.includes("follow") || voiceHasActivityBadge(item, "👤") || Boolean(item?.isFollower || item?.follower);
    }
    function isVoiceModerator(item){
      const type = normalizeTypeName(item?.type);
      const group = normalizeTypeName(item?.group);
      const badges = normalizeBadgeKeys(item?.badges);
      return type.includes("moderator") || group.includes("moderator") || badges.some((badge) => String(badge || "").toLowerCase().includes("mod")) || Boolean(item?.isModerator || item?.moderator);
    }
    function voiceFilterAllows(item){
      if (resolveVoiceAssignment(item)) return true;
      const filter = String(voiceBot.filter || "all").toLowerCase();
      if (filter === "supporters") return isSupporterProfile(item);
      if (filter === "followers") return isVoiceFollower(item);
      if (filter === "moderators") return isVoiceModerator(item);
      if (filter === "custom") return false;
      return true;
    }
    function voiceRuleBadgeForPreset(kind, key){
      const map = {
        follow: "👤",
        like: "❤️",
        share: "🗣",
        join: "👻",
        raid: "⚡",
        sub: "⭐",
        system: "🛠️",
        broadcaster: "🎙️",
        moderator: "🛡️",
        vip: "💠",
        subscriber: "⭐",
        founder: "🏁",
        verified: "✅",
        staff: "🧰",
        premium: "✨",
      };
      if (kind === "event" || kind === "role" || kind === "bits") {
        return map[String(key || "").toLowerCase()] || "";
      }
      return "";
    }
    function voiceActivityUserKeys(item){
      return [...new Set([voiceUserKey(item), normalizeUsername(item?.displayName || ""), normalizeUsername(item?.user || ""), normalizeUsername(item?.username || "")].filter(Boolean))];
    }
    function voiceEventBadgeEmoji(item){
      const key = voiceEventKey(item);
      const map = { follow: "👤", like: "❤️", share: "🗣", join: "👻", raid: "⚡", sub: "⭐", system: "🛠️" };
      return map[key] || "";
    }
    function saveActivityBadges(){
      try { localStorage.setItem(ACTIVITY_BADGES_KEY, JSON.stringify(state.activityBadges || { tiktok: {}, twitch: {} })); } catch {}
    }
    function ensureActivityBucket(platform, key){
      const p = String(platform || "tiktok").toLowerCase();
      if (!state.activityBadges[p] || typeof state.activityBadges[p] !== "object") state.activityBadges[p] = {};
      if (!state.activityBadges[p][key] || typeof state.activityBadges[p][key] !== "object") state.activityBadges[p][key] = { badges: {} };
      if (!state.activityBadges[p][key].badges || typeof state.activityBadges[p][key].badges !== "object") state.activityBadges[p][key].badges = {};
      return state.activityBadges[p][key];
    }
    function trackVoiceActivity(item, assignment = null){
      const platform = String(item?.platform || assignment?.platform || "tiktok").toLowerCase();
      const keys = voiceActivityUserKeys(item);
      if (!keys.length) return;
      const now = Date.now();
      const gift = lookupGiftCatalog(item?.gift || item?.giftName || item?.giftAlt || item?.giftId || assignment?.targetLabel || assignment?.ruleLabel || "");
      const giftImage = normalizeImageSource(item?.giftImage || item?.gift?.image || item?.gift?.url || assignment?.targetImage || gift?.image || "");
      const giftName = String(item?.gift || item?.giftName || item?.giftAlt || gift?.name || assignment?.ruleLabel || assignment?.targetLabel || "").trim() || "Regalo";
      const eventEmoji = voiceEventBadgeEmoji(item);
      for (const key of keys) {
        const bucket = ensureActivityBucket(platform, key);
        if (eventEmoji) bucket.badges[eventEmoji] = true;
        if (giftImage || String(item?.type || "").toLowerCase() === "gift" || String(assignment?.kind || "") === "gift") {
          bucket.lastGift = { image: giftImage, name: giftName, updatedAt: now, ruleId: assignment?.ruleId || "" };
        }
        if (assignment) {
          bucket.voice = {
            voiceKey: assignment.voiceKey in voiceCatalog ? assignment.voiceKey : "verity",
            mode: assignment.mode || "unlock",
            kind: assignment.kind || "gift",
            label: assignment.ruleLabel || assignment.targetLabel || "Regla",
            targetImage: assignment.targetImage || giftImage || "",
            updatedAt: now,
          };
        }
      }
      saveActivityBadges();
    }
    function stripTwitchEmotes(text, emoteString){
      let out = String(text || "");
      const ranges = [];
      String(emoteString || "").split("/").forEach((chunk) => {
        const [id, positions] = String(chunk || "").split(":");
        String(positions || "").split(",").forEach((range) => {
          const [start, end] = String(range || "").split("-").map((n) => Number(n));
          if (Number.isFinite(start) && Number.isFinite(end)) ranges.push([start, end]);
        });
      });
      if (!ranges.length) return out;
      ranges.sort((a,b) => b[0] - a[0]);
      for (const [start, end] of ranges) out = `${out.slice(0, start)} ${out.slice(end + 1)}`;
      return out;
    }
    function stripEmojiText(text){
  try {
    return String(text || "").replace(/[\p{Extended_Pictographic}\p{Emoji_Component}\p{Emoji_Presentation}]/gu, " ");
  } catch {
    return String(text || "").replace(/[\u2600-\u27BF\u{1F300}-\u{1FAFF}]/gu, " ");
  }
}

function normalizeVoiceSpoofText(text){
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[ñ]/g, "n")
    .replace(/[0]/g, "o")
    .replace(/[1!|]/g, "i")
    .replace(/[2]/g, "z")
    .replace(/[3]/g, "e")
    .replace(/[4@]/g, "a")
    .replace(/[5$]/g, "s")
    .replace(/[6]/g, "g")
    .replace(/[7]/g, "t")
    .replace(/[8]/g, "b")
    .replace(/[9]/g, "g")
    .replace(/[^\p{L}\p{N}\s]/gu, " ");
}
function buildProfanityFilterRegex(){
  const badWords = [
    "mierda", "mierdas", "mierdero", "mierderos", "mierdoso", "mierdosa", "mierd", "mrd", "mierda seca",
    "puta", "puta madre", "puto", "putos", "putas", "putísima", "putisima",
    "cabron", "cabrona", "cabrones", "cabronazo", "cabroncete",
    "coño", "cojon", "cojones", "coñazo", "coñito",
    "joder", "jodido", "jodida", "jodón", "jodona",
    "chingar", "chingada", "chingado", "chingón", "chingona",
    "pendejo", "pendeja", "pendejazo", "pendejita",
    "verga", "vergon", "vergón", "culo", "culero", "culera",
    "cagar", "cagada", "cagon", "cagón",
    "imbecil", "imbécil", "idiota", "gilipollas", "hijo de puta", "hijodeputa", "hijoputa",
    "hdp", "hp", "mrd", "pn", "phenhe", "violar", "zhemen", "cmen",
    "maricon", "maricón", "marica", "putero", "mamon", "mamón",
    "estupido", "estúpido", "tarado", "subnormal", "mongol", "boludo", "boluda", "pelotudo", "pelotuda",
    "zorra", "perra", "bitch", "fuck", "shit", "asshole",
  ];
  const makePattern = (word) => {
    const normalized = normalizeVoiceSpoofText(word).trim().replace(/\s+/g, " ");
    if (!normalized) return "";
    const collapsed = normalized.replace(/\s+/g, "");
    const core = normalized
      .split(" ")
      .filter(Boolean)
      .map((piece) => piece
        .split("")
        .map((ch) => `${ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s._-]*`)
        .join(""))
      .join("[\\s._-]+");
    return collapsed.length <= 4
      ? `(^|[^\\p{L}\\p{N}])(?:${core})(?=$|[^\\p{L}\\p{N}])`
      : `(?:${core})`;
  };
  const parts = [...new Set(badWords.map(makePattern).filter(Boolean))];
  return parts.length ? new RegExp(parts.join("|"), "giu") : null;
}
const VOICE_PROFANITY_RE = buildProfanityFilterRegex();

function censorVoiceProfanity(text){
  const source = String(text || "");
  if (!source || !VOICE_PROFANITY_RE) return source;
  let out = source.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  out = out.replace(VOICE_PROFANITY_RE, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}
function voiceTokenLooksGibberish(token){
  const raw = normalizeVoiceSpoofText(token).replace(/\s+/g, "").trim();
  if (!raw) return true;
  if (/^\d+$/.test(raw)) return false;
  const letters = raw.replace(/[^\p{L}]/gu, "");
  if (!letters) return true;
  const len = letters.length;
  const vowels = (letters.match(/[aeiou]/g) || []).length;
  if (len <= 2) return vowels === 0;
  const vowelRatio = vowels / len;
  const rareRatio = (letters.match(/[jkqwxy]/g) || []).length / len;
  const hasCommonPattern = /(ch|ll|rr|qu|gue|gui|que|qui|cia|cio|cion|sio|sion|bra|bre|cri|tra|pro|pre|con|com|des|del|mar|per|tor|tar|mon|bol|pen|jod|mier|put|ver|cul)/i.test(letters);
  if (len >= 12 && vowelRatio < 0.4 && rareRatio >= 0.12 && !hasCommonPattern) return true;
  if (len >= 10 && vowelRatio < 0.28 && !hasCommonPattern && /[jkqwxy]/i.test(letters)) return true;
  if (len >= 8 && vowelRatio < 0.22) return true;
  if (/(.)\1{3,}/.test(letters)) return true;
  if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(letters)) return true;
  return false;
}
function removeVoiceGibberish(text){
  const pieces = String(text || "")
    .split(/\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .map((piece) => piece.replace(/\d{6,}/g, (match) => match.slice(0, 3)));
  const kept = pieces.filter((piece) => !voiceTokenLooksGibberish(piece));
  return kept.join(" ").replace(/\s+/g, " ").trim();
}
function cleanVoiceText(text, { isName = false } = {}){
  let out = String(text || "");
  if (!out) return "";
  out = out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  out = out.replace(/https?:\/\/\S+/gi, " ");
  out = out.replace(/[\u200B-\u200D\uFEFF]/g, " ");
  if (voiceBot.ignoreStickers) out = out.replace(/\b(sticker|stickers|stkr|gift sticker)\b/gi, " ");
  if (voiceBot.ignoreEmojis) out = stripEmojiText(out);
  if (isName) {
    out = out.replace(/[^\p{L}\p{N}\s]/gu, " ");
  } else {
    if (voiceBot.ignoreSpecialChars) out = out.replace(/[\p{S}\p{P}]/gu, " ");
    if (voiceBot.onlySpanish) out = out.replace(/[^\p{Script=Latin}\p{N}\sÁÉÍÓÚÜÑáéíóúüñ]/gu, " ");
  }
  out = out.replace(/\b\d{6,}\b/g, (match) => match.slice(0, 3));
  if (voiceBot.profanityFilter) out = censorVoiceProfanity(out);
  out = removeVoiceGibberish(out);
  out = out.replace(/\s+/g, " ").trim();
  if (!out) return "";
  return out;
}
function cleanVoiceName(name){
  const cleaned = cleanVoiceText(name, { isName: true });
  return cleaned && /\p{L}/u.test(cleaned) ? cleaned : "Usuario";
}
function voiceDuplicateSignature(text){
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}
    function extractVoiceRawText(item){
      const platform = String(item?.platform || "tiktok").toLowerCase();
      const stickerLabel = extractTextFromFragments(item?.sticker?.name || item?.sticker?.title || item?.stickerName || item?.stickerText || item?.sticker || item?.stickerAlt);
      const rawFields = [
        item?.message,
        item?.comment,
        item?.text,
        item?.messageText,
        item?.content,
        extractTextFromFragments(item?.fragments),
        extractTextFromFragments(item?.messageFragments),
        extractTextFromFragments(item?.textFragments),
        extractTextFromFragments(item?.commentFragments),
      ];
      if (!voiceBot.ignoreStickers) rawFields.push(stickerLabel);
      let raw = rawFields.map((v) => String(v || "").trim()).find(Boolean) || "";
      if (platform === "twitch" && voiceBot.ignoreEmotes) raw = stripTwitchEmotes(raw, item?.emotes);
      if (voiceBot.ignoreStickers && (normalizeTypeName(item?.type).includes("sticker") || Boolean(item?.sticker) || Boolean(item?.stickerImage) || Boolean(stickerLabel))) {
        if (!raw) return "";
      }
      return raw;
    }
    function hasPendingVoiceAssignment(item){
      const keys = voiceUserLookupKeys(item);
      return Boolean(keys.length && keys.some((key) => Boolean(voiceBot.fixedByUser?.[key] || voiceBot.unlockedByUser?.[key] || voiceBot.pendingByUser?.[key])));
    }
    function resolveVoiceAssignment(item){
      const identity = voiceUserIdentity(item);
      const keys = voiceUserLookupKeys(item);
      if (!identity.key) return null;
      const fixed = keys.map((key) => voiceBot.fixedByUser?.[key]).find(Boolean);
      if (fixed) {
        return {
          voiceKey: fixed.voiceKey in voiceCatalog ? fixed.voiceKey : "verity",
          mode: "fixed",
          ruleId: `manual:${identity.key}`,
          ruleLabel: fixed.displayName || identity.username,
          targetKey: identity.username,
          targetLabel: fixed.displayName || identity.username,
          targetImage: "",
          platform: identity.platform,
          kind: "user",
          triggerAt: Number(fixed.updatedAt || fixed.createdAt || Date.now()),
          manual: true,
        };
      }
      const now = Date.now();
      const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
      const isValidAssignment = (assignment) => {
        if (!assignment) return false;
        const ruleId = String(assignment.ruleId || "");
        return Boolean(ruleId && activeRuleIds.has(ruleId));
      };
      const unlocked = keys.map((lookupKey) => voiceBot.unlockedByUser?.[lookupKey]).find(Boolean);
      const pending = keys.map((lookupKey) => voiceBot.pendingByUser?.[lookupKey]).find(Boolean);
      if (unlocked && (!isValidAssignment(unlocked) || (Number(unlocked.expiresAt || 0) > 0 && Number(unlocked.expiresAt) < now))) {
        for (const lookupKey of keys) delete voiceBot.unlockedByUser[lookupKey];
        saveVoiceBot();
      }
      if (pending && (!isValidAssignment(pending) || (Number(pending.expiresAt || 0) > 0 && Number(pending.expiresAt) < now))) {
        for (const lookupKey of keys) delete voiceBot.pendingByUser[lookupKey];
        saveVoiceBot();
      }
      const a = keys.map((lookupKey) => isValidAssignment(voiceBot.unlockedByUser?.[lookupKey]) ? voiceBot.unlockedByUser[lookupKey] : null).find(Boolean);
      const b = keys.map((lookupKey) => isValidAssignment(voiceBot.pendingByUser?.[lookupKey]) ? voiceBot.pendingByUser[lookupKey] : null).find(Boolean);
      if (!a && !b) return null;
      if (a && b) return Number(a.triggerAt || 0) >= Number(b.triggerAt || 0) ? a : b;
      return a || b;
    }
    function resolveVoiceRuleList(){
      return Array.isArray(voiceBot.rules) ? [...voiceBot.rules].map(normalizeVoiceBotRule).sort((a,b) => Number(a.createdAt || 0) - Number(b.createdAt || 0)) : [];
    }
    function normalizeMatchKey(value){ return normalizeUsername(value).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""); }
    function voiceEventKey(item){
      const type = normalizeTypeName(item?.type || item?.action || item?.group || item?.event || "");
      if (!type) return "";
      if (type.includes("follow")) return "follow";
      if (type.includes("like")) return "like";
      if (type.includes("share") || type.includes("share")) return "share";
      if (type.includes("join") || type.includes("member")) return "join";
      if (type.includes("raid") || type.includes("host")) return "raid";
      if (type.includes("sub") || type.includes("subscription") || type.includes("resub")) return "sub";
      if (type.includes("system")) return "system";
      return type;
    }
    function voiceRoleKeys(item){
      const keys = new Set();
      normalizeBadgeKeys(item?.badges).forEach((key) => keys.add(normalizeMatchKey(key)));
      String(item?.role || item?.rank || "").split(/[\s,|/]+/).forEach((part) => { const key = normalizeMatchKey(part); if (key) keys.add(key); });
      return [...keys].filter(Boolean);
    }
    function voiceGiftKeys(item){
      const keys = new Set();
      const gift = lookupGiftCatalog(item?.gift || item?.giftName || item?.giftAlt || item?.giftId || "");
      [item?.giftId, item?.gift, item?.giftName, item?.giftAlt, gift?.id, gift?.name, gift?.alt].forEach((value) => { const key = normalizeMatchKey(value); if (key) keys.add(key); });
      return [...keys].filter(Boolean);
    }
    function voiceBitsKey(item){
      const raw = Number(item?.amount ?? item?.bits ?? item?.giftCoins ?? item?.coins ?? 0) || 0;
      return raw ? String(raw) : "";
    }
    function ruleMatchesItem(rule, item){
      if (!rule?.active) return false;
      if (String(rule.platform || "tiktok").toLowerCase() !== String(item?.platform || "tiktok").toLowerCase()) return false;
      const kind = String(rule.kind || "gift");
      if (kind === "gift") {
        const keys = voiceGiftKeys(item);
        const target = normalizeMatchKey(rule.targetKey || rule.targetLabel);
        return Boolean(target && keys.some((key) => key === target || key.includes(target) || target.includes(key)));
      }
      if (kind === "event") {
        const key = normalizeMatchKey(voiceEventKey(item));
        const target = normalizeMatchKey(rule.targetKey || rule.targetLabel);
        return Boolean(key && target && (key === target || key.includes(target) || target.includes(key)));
      }
      if (kind === "role") {
        const keys = voiceRoleKeys(item);
        const target = normalizeMatchKey(rule.targetKey || rule.targetLabel);
        return Boolean(target && keys.some((key) => key === target || key.includes(target) || target.includes(key)));
      }
      if (kind === "bits") {
        const key = voiceBitsKey(item);
        const target = String(rule.targetKey || rule.targetLabel || "").trim();
        return Boolean(key && target && key === target);
      }
      return false;
    }
    function findMatchingVoiceRule(item){
      const rules = resolveVoiceRuleList().filter((rule) => ruleMatchesItem(rule, item));
      if (!rules.length) return null;
      return rules[rules.length - 1];
    }
    function registerVoiceTriggerForItem(item){
      trackVoiceActivity(item, null);
      if (!voiceBot.enabled) return null;
      const rule = findMatchingVoiceRule(item);
      if (!rule) {
        return null;
      }
      const identity = voiceUserIdentity(item);
      if (!identity.key) return null;
      const assignment = {
        voiceKey: rule.voiceKey in voiceCatalog ? rule.voiceKey : "verity",
        mode: rule.mode,
        ruleId: rule.id,
        ruleLabel: rule.targetLabel || rule.targetKey || "Regla",
        targetKey: rule.targetKey || rule.targetLabel || "",
        targetLabel: rule.targetLabel || rule.targetKey || "Regla",
        targetImage: rule.targetImage || "",
        platform: identity.platform,
        username: identity.username,
        kind: rule.kind,
        triggerAt: Date.now(),
      };
      if (rule.mode === "unlock") {
        voiceBot.unlockedByUser[identity.key] = assignment;
        delete voiceBot.pendingByUser[identity.key];
      } else {
        voiceBot.pendingByUser[identity.key] = assignment;
      }
      trackVoiceActivity(item, assignment);
      saveVoiceBot();
      syncVoiceBotUI();
      return assignment;
    }
    function voiceBotActiveTabButtons(){
      return ["recipients", "rules", "users", "settings"];
    }
    function setVoiceBotTab(tab){
      voiceBot.activeTab = voiceBotActiveTabButtons().includes(tab) ? tab : "recipients";
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function isVoiceModalOpen(){
      const modal = document.getElementById("overlayVoiceModal");
      return Boolean(modal?.classList.contains("is-open"));
    }
    function openVoiceBotModal(tab = voiceBot.activeTab || "recipients"){
      voiceBot.activeTab = voiceBotActiveTabButtons().includes(tab) ? tab : "recipients";
      saveVoiceBot();
      const modal = document.getElementById("overlayVoiceModal");
      if (!modal) return;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      syncVoiceBotUI();
    }
    function closeVoiceBotModal(){
      const modal = document.getElementById("overlayVoiceModal");
      if (!modal) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
    function setVoiceBotEnabled(enabled){
      voiceBot.enabled = Boolean(enabled);
      if (!voiceBot.enabled) {
        voiceBotQueue = [];
        if (voiceBotAudio) {
          try { voiceBotAudio.pause(); } catch {}
          try { voiceBotAudio.src = ""; } catch {}
          voiceBotAudio = null;
        }
        voiceBotSpeaking = false;
      }
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function toggleVoiceBotEnabled(){
      setVoiceBotEnabled(!voiceBot.enabled);
      if (isVoiceModalOpen()) syncVoiceBotUI();
    }
    function setVoiceBotVoice(key){
      voiceBot.voiceKey = key in voiceCatalog ? key : "verity";
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function setVoiceBotFixedDraftVoice(key){
      voiceBot.fixedVoiceKey = key in voiceCatalog ? key : "verity";
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function setVoiceBotFilter(value){
      const normalized = String(value || "").toLowerCase();
      voiceBot.filter = normalized === "supporters" ? "supporters" : normalized === "followers" ? "followers" : normalized === "moderators" ? "moderators" : normalized === "custom" ? "custom" : "all";
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function setVoiceBotFlag(flag, value){
      if (!["sayDice", "ignoreEmojis", "ignoreSpecialChars", "ignoreStickers", "ignoreEmotes", "onlySpanish"].includes(flag)) return;
      voiceBot[flag] = Boolean(value);
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function syncVoiceBotUI(){
      voiceBot = normalizeVoiceBotState(voiceBot);
      const dock = document.getElementById("overlayVoiceDock");
      const btn = document.getElementById("overlayVoiceBtn");
      const modal = document.getElementById("overlayVoiceModal");
      const voiceSelect = document.getElementById("overlayVoiceSelect");
      const statusText = document.getElementById("overlayVoiceStatusText");
      const summary = document.getElementById("overlayVoiceSummary");
      const recipientsSummary = document.getElementById("overlayVoiceRecipientsSummary");
      const filterButtons = document.querySelectorAll("[data-voice-filter]");
      const flagButtons = document.querySelectorAll("[data-voice-flag]");
      const tabs = document.querySelectorAll("[data-voice-tab]");
      const sections = document.querySelectorAll("[data-voice-section]");
      const ruleKind = document.getElementById("overlayVoiceRuleKind");
      const ruleVoice = document.getElementById("overlayVoiceRuleVoice");
      const rulePlatform = document.getElementById("overlayVoiceRulePlatform");
      const ruleMode = document.getElementById("overlayVoiceRuleMode");
      const ruleLabel = document.getElementById("overlayVoiceRuleLabel");
      const ruleActiveBtn = document.getElementById("overlayVoiceRuleActiveBtn");
      const ruleInactiveBtn = document.getElementById("overlayVoiceRuleInactiveBtn");
      const targetSearch = document.getElementById("overlayVoiceTargetSearch");
      const targetCounter = document.getElementById("overlayVoiceTargetCounter");
      const targetGrid = document.getElementById("overlayVoiceTargetGrid");
      const presetGrid = document.getElementById("overlayVoicePresetGrid");
      const ruleRail = document.getElementById("overlayVoiceRuleRail");
      const addBtn = document.getElementById("overlayVoiceRuleAddBtn");
      const resetBtn = document.getElementById("overlayVoiceRuleResetBtn");
      const targetWrap = document.getElementById("overlayVoiceTargetSearchWrap");
      const presetWrap = document.getElementById("overlayVoicePresetWrap");
      const fixedUserPlatform = document.getElementById("overlayVoicePinnedPlatformSelect");
      const fixedUserInput = document.getElementById("overlayVoicePinnedUserInput");
      const fixedUserSelect = document.getElementById("overlayVoicePinnedVoiceSelect");
      const fixedUserApplyBtn = document.getElementById("overlayVoicePinnedApplyBtn");
      const fixedUserClearBtn = document.getElementById("overlayVoicePinnedClearBtn");
      const fixedUserList = document.getElementById("overlayVoicePinnedList");
      const fixedUserSummary = document.getElementById("overlayVoicePinnedSummary");
      const fixedUserSuggestions = document.getElementById("overlayVoicePinnedSuggestions");
      const voiceRuleKindList = voiceRuleKinds[voiceRuleDraft.platform] || voiceRuleKinds.tiktok;
      if (dock) dock.style.display = view === "chat" ? "flex" : "none";
      if (btn) btn.classList.toggle("is-active", Boolean(voiceBot.enabled));
      if (voiceSelect) {
        voiceSelect.innerHTML = voiceOptionsHtml();
        voiceSelect.value = voiceBot.voiceKey;
      }
      if (statusText) statusText.textContent = voiceBot.enabled ? "Bot encendido." : "Bot apagado.";
      if (summary) { summary.innerHTML = voiceBotSummaryHtml(); summary.title = voiceBotSummaryText(); }
      if (recipientsSummary) recipientsSummary.textContent = `Filtro global: ${voiceFilterLabel(voiceBot.filter)}. El selector por regalo o evento manda sobre la voz global cuando hay coincidencia.`;
      if (fixedUserPlatform) fixedUserPlatform.value = String(voiceBot.activeFixedPlatform || "tiktok");
      if (fixedUserSelect) {
        fixedUserSelect.innerHTML = voiceOptionsHtml();
        fixedUserSelect.value = voiceBot.fixedVoiceKey;
      }
      if (fixedUserInput || fixedUserSuggestions || fixedUserSummary || fixedUserList) {
        renderVoiceFixedSuggestions();
        renderVoiceFixedUsers();
      }
      filterButtons.forEach((el) => {
        const active = String(el.dataset.voiceFilter || "all") === voiceBot.filter;
        el.classList.toggle("is-active", active);
      });
      flagButtons.forEach((el) => {
        const flag = String(el.dataset.voiceFlag || "");
        const active = Boolean(voiceBot[flag]);
        el.classList.toggle("is-active", active);
      });
      tabs.forEach((el) => {
        const active = String(el.dataset.voiceTab || "") === voiceBot.activeTab;
        el.classList.toggle("is-active", active);
      });
      sections.forEach((el) => {
        const active = String(el.dataset.voiceSection || "") === voiceBot.activeTab;
        el.classList.toggle("is-active", active);
      });
      if (ruleVoice) {
        ruleVoice.innerHTML = voiceOptionsHtml();
        ruleVoice.value = voiceRuleDraft.voiceKey;
      }
      if (rulePlatform) rulePlatform.value = voiceRuleDraft.platform;
      if (ruleKind) {
        ruleKind.innerHTML = voiceRuleKindList.map((opt) => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join("");
        ruleKind.value = voiceRuleDraft.kind;
      }
      if (ruleMode) ruleMode.value = voiceRuleDraft.mode;
      if (ruleLabel) ruleLabel.value = voiceRuleDraft.targetLabel;
      if (ruleActiveBtn && ruleInactiveBtn) {
        ruleActiveBtn.classList.toggle("is-active", Boolean(voiceRuleDraft.active));
        ruleInactiveBtn.classList.toggle("is-active", !voiceRuleDraft.active);
      }
      if (targetWrap && presetWrap) {
        const showTarget = voiceRuleDraft.kind === "gift" || voiceRuleDraft.kind === "bits";
        targetWrap.style.display = showTarget ? "flex" : "none";
        presetWrap.style.display = voiceRuleDraft.kind === "gift" ? "none" : "flex";
      }
      renderVoiceRuleTargets();
      renderVoiceRulePresets();
      renderVoiceRuleRail();
      if (modal) modal.setAttribute("aria-hidden", modal.classList.contains("is-open") ? "false" : "true");
    }
    function normalizeDraftSelection(item){
      voiceRuleDraft.targetKey = String(item?.key || item?.value || item?.id || item?.label || item?.name || "").trim();
      voiceRuleDraft.targetLabel = String(item?.label || item?.name || item?.value || item?.key || "").trim();
      voiceRuleDraft.targetImage = String(item?.image || item?.icon || item?.thumb || "").trim();
      if (!voiceRuleDraft.targetLabel) voiceRuleDraft.targetLabel = voiceRuleDraft.targetKey;
      if (document.getElementById("overlayVoiceRuleLabel")) document.getElementById("overlayVoiceRuleLabel").value = voiceRuleDraft.targetLabel;
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function giftSearchQuery(){ return String(document.getElementById("overlayVoiceTargetSearch")?.value || "").trim().toLowerCase(); }
    function renderVoiceRuleTargets(){
      const grid = document.getElementById("overlayVoiceTargetGrid");
      const counter = document.getElementById("overlayVoiceTargetCounter");
      if (!grid || !counter) return;
      const query = giftSearchQuery();
      let items = [];
      if (voiceRuleDraft.kind === "gift") {
        items = giftCatalogItems.slice();
        if (query) items = items.filter((item) => normalizeMatchKey([item?.name, item?.alt, item?.id, item?.key].filter(Boolean).join(" ")).includes(normalizeMatchKey(query)));
        counter.textContent = `${items.length} resultados`;
        grid.innerHTML = items.slice(0, 120).map((item) => {
          const name = String(item?.name || item?.alt || item?.id || "Regalo");
          const image = normalizeImageSource(item?.image || item?.icon || item?.thumb || item?.url || item?.imageUrl || "");
          const active = normalizeMatchKey(voiceRuleDraft.targetKey) === normalizeMatchKey(item?.id || item?.name || item?.alt || item?.key || "");
          return `<button type="button" class="overlayVoiceTargetCard ${active ? 'is-active' : ''}" data-voice-target='${esc(JSON.stringify({ key: item?.id || item?.key || item?.name || item?.alt || "", label: name, image }))}'>${image ? `<img class="overlayVoiceTargetThumb" src="${esc(image)}" alt="">` : `<div class="overlayVoiceTargetThumb" aria-hidden="true"></div>`}<span class="overlayVoiceTargetText"><strong>${esc(name)}</strong><span>${esc(item?.id || item?.coins || item?.coinsName || '')}</span></span></button>`;
        }).join("");
        if (!items.length) grid.innerHTML = `<div class="overlayVoiceHelp">No se encontró ningún regalo.</div>`;
        return;
      }
      if (voiceRuleDraft.kind === "bits") {
        const presets = voiceRulePresetMap.bits.map((v) => ({ key: String(v), label: `${v} bits`, image: "" }));
        counter.textContent = `${presets.length} opciones`;
        grid.innerHTML = presets.map((item) => {
          const active = String(voiceRuleDraft.targetKey || "") === String(item.key);
          return `<button type="button" class="overlayVoiceTargetCard ${active ? 'is-active' : ''}" data-voice-target='${esc(JSON.stringify(item))}'>${item.image ? `<img class="overlayVoiceTargetThumb" src="${esc(item.image)}" alt="">` : `<div class="overlayVoiceTargetThumb" aria-hidden="true">💎</div>`}<span class="overlayVoiceTargetText"><strong>${esc(item.label)}</strong><span>${esc(item.key)}</span></span></button>`;
        }).join("");
        return;
      }
      grid.innerHTML = "";
      counter.textContent = "";
    }
    function renderVoiceRulePresets(){
      const grid = document.getElementById("overlayVoicePresetGrid");
      if (!grid) return;
      const kind = voiceRuleDraft.kind;
      if (kind === "gift" || kind === "bits") {
        grid.innerHTML = `<div class="overlayVoiceHelp">Esta sección se usa para regalos o bits. Usa la búsqueda de arriba.</div>`;
        return;
      }
      const options = voiceRulePresetMap[kind] || [];
      grid.innerHTML = options.map((key) => {
        const label = voiceRuleLabels[key] || key;
        const badge = voiceRuleBadgeForPreset(kind, key);
        const active = normalizeMatchKey(voiceRuleDraft.targetKey) === normalizeMatchKey(key);
        return `<button type="button" class="overlayVoicePresetChip ${active ? 'is-active' : ''}" data-voice-preset="${esc(key)}">${badge ? `<span class="overlayVoicePresetBadge">${badge}</span>` : ""}<span class="overlayVoicePresetLabel">${esc(label)}</span></button>`;
      }).join("");
      if (!options.length) grid.innerHTML = `<div class="overlayVoiceHelp">No hay opciones rápidas para este tipo.</div>`;
    }
    function renderVoiceRuleRail(){
      const rail = document.getElementById("overlayVoiceRuleRail");
      if (!rail) return;
      const rules = resolveVoiceRuleList();
      if (!rules.length) {
        rail.innerHTML = `<div class="overlayVoiceHelp">Todavía no hay reglas activas.</div>`;
        return;
      }
      rail.innerHTML = rules.map((rule) => {
        const voice = voiceCatalog[rule.voiceKey] || voiceCatalog.verity;
        const modeLabel = "Desbloquea usuario";
        const status = rule.active ? "Activa" : "Pausada";
        const badge = rule.kind === "gift" ? "🎁" : rule.kind === "event" ? "💬" : rule.kind === "role" ? "🧩" : "💎";
        const detail = [rule.platform === "twitch" ? "Twitch" : "TikTok", modeLabel, voice.label].join(" · ");
        return `<article class="overlayVoiceRuleCard" data-rule-id="${esc(rule.id)}"><div class="overlayVoiceRuleCardHeader"><div class="overlayVoiceRuleCardTitle"><strong>${badge} ${esc(rule.targetLabel || rule.targetKey || 'Regla')}</strong><span>${esc(detail)}</span></div><span class="overlayVoiceRuleBadge">${esc(status)}</span></div><div class="overlayVoiceRuleCardActions"><button type="button" data-rule-toggle="${esc(rule.id)}">${rule.active ? 'Pausar' : 'Activar'}</button><button type="button" data-rule-delete="${esc(rule.id)}">Eliminar</button></div></article>`;
      }).join("");
    }
    function voiceRuleFormSnapshot(){
      return {
        platform: String(document.getElementById("overlayVoiceRulePlatform")?.value || voiceRuleDraft.platform || "tiktok"),
        kind: String(document.getElementById("overlayVoiceRuleKind")?.value || voiceRuleDraft.kind || "gift"),
        mode: String(document.getElementById("overlayVoiceRuleMode")?.value || voiceRuleDraft.mode || "once"),
        voiceKey: String(document.getElementById("overlayVoiceRuleVoice")?.value || voiceRuleDraft.voiceKey || "verity"),
        label: String(document.getElementById("overlayVoiceRuleLabel")?.value || voiceRuleDraft.targetLabel || "").trim(),
      };
    }
    function syncVoiceRuleDraftFromUI(){
      const snap = voiceRuleFormSnapshot();
      voiceRuleDraft.platform = snap.platform === "twitch" ? "twitch" : "tiktok";
      voiceRuleDraft.kind = ["gift","event","role","bits"].includes(snap.kind) ? snap.kind : (voiceRuleDraft.platform === "twitch" ? "bits" : "gift");
      voiceRuleDraft.mode = snap.mode === "unlock" ? "unlock" : "once";
      voiceRuleDraft.voiceKey = snap.voiceKey in voiceCatalog ? snap.voiceKey : "verity";
      voiceRuleDraft.targetLabel = snap.label;
      if (!voiceRuleDraft.targetKey && voiceRuleDraft.kind !== "gift" && voiceRuleDraft.kind !== "bits") {
        const preset = (voiceRulePresetMap[voiceRuleDraft.kind] || [])[0];
        if (preset) {
          voiceRuleDraft.targetKey = preset;
          voiceRuleDraft.targetLabel = voiceRuleLabels[preset] || preset;
        }
      }
      if (!voiceRuleDraft.targetLabel) voiceRuleDraft.targetLabel = voiceRuleDraft.targetKey || "";
      normalizeVoiceRuleDraft();
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function addVoiceRule(){
      normalizeVoiceRuleDraft();
      if (!voiceRuleDraft.targetKey) return;
      voiceBot.rules = Array.isArray(voiceBot.rules) ? voiceBot.rules : [];
      const rule = normalizeVoiceBotRule({
        ...voiceRuleDraft,
        targetKey: voiceRuleDraft.targetKey,
        targetLabel: voiceRuleDraft.targetLabel || voiceRuleDraft.targetKey,
        targetImage: voiceRuleDraft.targetImage || "",
      });
      voiceBot.rules = [...voiceBot.rules.filter((item) => item.id !== rule.id), rule];
      voiceBot.rules.sort((a,b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function resetVoiceRuleDraft(){
      voiceRuleDraft = structuredClone(voiceRuleDraftDefaults);
      const search = document.getElementById("overlayVoiceTargetSearch");
      if (search) search.value = "";
      syncVoiceBotUI();
    }
    function removeVoiceRule(id){
      voiceBot.rules = (voiceBot.rules || []).filter((rule) => rule.id !== id);
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function toggleVoiceRule(id){
      const rule = (voiceBot.rules || []).find((item) => item.id === id);
      if (!rule) return;
      rule.active = !rule.active;
      rule.updatedAt = Date.now();
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function shouldVoiceRead(item){
      if (!voiceBot.enabled || view !== "chat") return false;
      if (!item) return false;
      const cleanName = cleanVoiceName(item.displayName || item.user || item.username || "");
      const cleanMessage = cleanVoiceText(extractVoiceRawText(item));
      if (!cleanMessage) return false;
      const assignment = resolveVoiceAssignment(item);
      if (voiceBot.filter !== "custom" && !voiceFilterAllows(item) && !assignment) return false;
      return Boolean(cleanName && cleanMessage);
    }
    function buildVoiceText(item, cleanedName = "", cleanedMessage = ""){
      const name = cleanedName || cleanVoiceName(item.displayName || item.user || item.username || "Usuario");
      const message = cleanedMessage || cleanVoiceText(extractVoiceRawText(item));
      if (!message) return "";
      const prefix = voiceBot.sayDice ? `${name} dice ${message}` : `${name} ${message}`;
      return prefix.slice(0, 220);
    }
    function fetchVoiceAudio(text, voiceId){
      return fetch("/api/voicebot/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId, profanityFilter: Boolean(voiceBot.profanityFilter) }),
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `TTS error ${res.status}`);
        }
        return await res.blob();
      });
    }
    async function playVoiceBlob(blob){
      const objectUrl = URL.createObjectURL(blob);
      return await new Promise((resolve, reject) => {
        const audio = new Audio(objectUrl);
        voiceBotAudio = audio;
        audio.preload = "auto";
        audio.volume = 1;
        audio.onended = () => {
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("No se pudo reproducir el audio."));
        };
        audio.addEventListener("canplaythrough", () => {
          audio.play().catch((err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
          });
        }, { once: true });
        try { audio.load(); } catch {}
      });
    }
    async function drainVoiceQueue(){
      if (voiceBotSpeaking || !voiceBot.enabled) return;
      const next = voiceBotQueue.shift();
      if (!next) return;
      voiceBotSpeaking = true;
      try {
        const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
        const queuedRuleId = String(next.ruleId || "");
        const ruleStillValid = !queuedRuleId || activeRuleIds.has(queuedRuleId);
        const voice = ruleStillValid && voiceCatalog[next.voiceKey] ? voiceCatalog[next.voiceKey] : selectedVoice();
        const blob = await fetchVoiceAudio(next.text, voice.id);
        await playVoiceBlob(blob);
      } catch (err) {
        console.error("[VoiceBot]", err);
      } finally {
        voiceBotSpeaking = false;
        if (voiceBot.enabled && voiceBotQueue.length) {
          drainVoiceQueue();
        }
      }
    }
    function consumePendingOnce(item){
      const keys = voiceUserLookupKeys(item);
      const key = keys[0];
      if (!key) return null;
      const pending = keys.map((lookupKey) => voiceBot.pendingByUser?.[lookupKey]).find(Boolean);
      if (!pending) return null;
      const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
      if (!pending.ruleId || !activeRuleIds.has(String(pending.ruleId))) {
        for (const lookupKey of keys) delete voiceBot.pendingByUser[lookupKey];
        saveVoiceBot();
        return null;
      }
      for (const lookupKey of keys) delete voiceBot.pendingByUser[lookupKey];
      saveVoiceBot();
      return pending;
    }
    function queueVoiceMessage(item){
      if (!shouldVoiceRead(item)) return;
      const cleanName = cleanVoiceName(item.displayName || item.user || item.username || "Usuario");
      const cleanMessage = cleanVoiceText(extractVoiceRawText(item));
      if (!cleanMessage) return;
      if (voiceBot.antiSpamFilter) {
        const key = voiceUserIdentity(item).key;
        const signature = voiceDuplicateSignature(cleanMessage);
        voiceBot.lastMessageByUser = voiceBot.lastMessageByUser && typeof voiceBot.lastMessageByUser === "object" ? voiceBot.lastMessageByUser : {};
        if (key && signature && voiceBot.lastMessageByUser[key] === signature) return;
        if (key && signature) {
          voiceBot.lastMessageByUser[key] = signature;
          saveVoiceBot();
        }
      }
      const assignment = resolveVoiceAssignment(item) || consumePendingOnce(item);
      const text = buildVoiceText(item, cleanName, cleanMessage);
      if (!text) return;
      if (assignment?.mode === "once") consumePendingOnce(item);
      if (voiceBotQueue.length >= 8) voiceBotQueue.shift();
      voiceBotQueue.push({ text, timestamp: Date.now(), voiceKey: assignment?.voiceKey || voiceBot.voiceKey || "verity", ruleId: assignment?.ruleId || "" });
      drainVoiceQueue();
      syncVoiceBotUI();
    }
function currentViewSettingsKey(){
      return view === "chat" ? "chatDirection" : view === "events" ? "eventsDirection" : "giftsDirection";
    }
    function currentViewLayout(){
      return view === "chat" ? (settings.personal.chatLayout || "vertical") : view === "events" ? (settings.personal.eventsLayout || "vertical") : (settings.personal.giftsLayout || "vertical");
    }
    function currentViewDirection(){
      return view === "chat" ? (settings.personal.chatDirection || "down") : view === "events" ? (settings.personal.eventsDirection || "down") : (settings.personal.giftsDirection || "down");
    }
    function saveSettingsToStorage(){
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
    }
    function syncDirectionButtons(){
      const layout = currentViewLayout();
      const shape = overlayShapeForView();
      const cardMode = layout === "vertical" && shape === "card";
      const horizontal = layout === "horizontal";
      const leftBtn = document.getElementById("overlayDirectionLeftBtn");
      const rightBtn = document.getElementById("overlayDirectionRightBtn");
      const leftLabel = horizontal ? "Mover a la izquierda" : (cardMode ? "Mover a la izquierda" : "Mover arriba");
      const rightLabel = horizontal ? "Mover a la derecha" : (cardMode ? "Mover a la derecha" : "Mover abajo");
      if (leftBtn) {
        leftBtn.title = leftLabel;
        leftBtn.setAttribute("aria-label", leftLabel);
      }
      if (rightBtn) {
        rightBtn.title = rightLabel;
        rightBtn.setAttribute("aria-label", rightLabel);
      }
      const cardBtn = document.getElementById("overlayCardBtn");
      if (cardBtn) {
        const active = cardMode;
        cardBtn.classList.toggle("is-active", active);
        cardBtn.title = active ? "Desactivar modo tarjeta" : "Activar modo tarjeta";
        cardBtn.setAttribute("aria-label", active ? "Desactivar modo tarjeta" : "Activar modo tarjeta");
      }
    }
    function setCurrentViewDirection(side){
      const layout = currentViewLayout();
      const shape = overlayShapeForView();
      const key = currentViewSettingsKey();
      const cardMode = layout === "vertical" && shape === "card";
      if (cardMode) {
        const cardKey = view === "chat" ? "chatOverlayCardSide" : view === "events" ? "eventsOverlayCardSide" : "giftsOverlayCardSide";
        settings.personal[cardKey] = normalizeOverlayCardSide(side === "right" ? "right" : "left");
      } else {
        settings.personal[key] = layout === "horizontal"
          ? (side === "left" ? "left" : "right")
          : (side === "left" ? "up" : "down");
      }
      saveSettingsToStorage();
      render();
    }
    function toggleCurrentViewShape(){
      const key = view === "chat" ? "chatOverlayShape" : view === "events" ? "eventsOverlayShape" : "giftsOverlayShape";
      const next = overlayShapeForView() === "card" ? "normal" : "card";
      settings.personal[key] = next;
      saveSettingsToStorage();
      render();
    }
    function fontFamily(font){ const map = { inter: 'Inter, Segoe UI, Arial, sans-serif', system: 'Segoe UI, Arial, sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', serif: 'Georgia, "Times New Roman", serif', emoji: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", Segoe UI, Arial, sans-serif' }; return map[String(font || 'inter')] || map.inter; }
    function resolveTextColor(value){ const map = { auto: "", white: "#eef2ff", black: "#09090b", blue: "#60a5fa", pink: "#f472b6", green: "#4ade80", yellow: "#facc15", cyan: "#67e8f9", orange: "#fb923c" }; return map[String(value || "auto")] ?? ""; }
    function effectContrastColor(textColor){ return String(textColor || "").toLowerCase() === "black" ? "rgba(255,255,255,.92)" : "rgba(0,0,0,.72)"; }
    function effectShadow(effect, contrastColor){ const shadow = String(effect || "none"); if(shadow === "shadow") return `0 2px 10px ${contrastColor}`; if(shadow === "outline") return [`-1px -1px 0 ${contrastColor}`, `1px -1px 0 ${contrastColor}`, `-1px 1px 0 ${contrastColor}`, `1px 1px 0 ${contrastColor}`].join(", "); return "none"; }
    function effectStroke(effect, contrastColor){ return String(effect || "none") === "outline" ? `1px ${contrastColor}` : "0 transparent"; }
    function resolveChatTextColor(value) { return resolveTextColor(value); }
    function twitchEmoteUrl(id, scale = 2) {
      const safeId = encodeURIComponent(String(id || ""));
      const safeScale = [1, 2, 3].includes(Number(scale)) ? Number(scale) : 2;
      return `https://static-cdn.jtvnw.net/emoticons/v2/${safeId}/default/dark/${safeScale}.0`;
    }
    function parseTwitchEmotes(message, emoteString) {
      const text = String(message ?? "");
      if (!text) return "";
      const escapedText = esc(text).replace(/\n/g, "<br>");
      if (!settings.personal.showEmotes || String(emoteString || "").trim() === "") return escapedText;
      const ranges = [];
      String(emoteString).split("/").forEach((chunk) => {
        const [id, positions] = chunk.split(":");
        if (!id || !positions) return;
        positions.split(",").forEach((pair) => {
          const [start, end] = pair.split("-").map((v) => Number(v));
          if (Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end >= start) ranges.push({ start, end, id });
        });
      });
      if (!ranges.length) return escapedText;
      ranges.sort((a, b) => a.start - b.start || a.end - b.end);
      let out = "";
      let cursor = 0;
      for (const range of ranges) {
        if (range.start < cursor) continue;
        out += esc(text.slice(cursor, range.start));
        const token = text.slice(range.start, range.end + 1);
        const emoteUrl = twitchEmoteUrl(range.id, 2);
        out += `<img class="twitchEmote" src="${esc(emoteUrl)}" alt="${esc(token)}" title="${esc(token)}" loading="lazy" decoding="async" draggable="false" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode(this.alt))">`;
        cursor = range.end + 1;
      }
      out += esc(text.slice(cursor));
      return out.replace(/\n/g, "<br>");
    }

    function extractTextFromFragments(value) {
      if (!value) return "";
      if (Array.isArray(value)) {
        return value.map((part) => {
          if (typeof part === "string") return part;
          if (part && typeof part === "object") return part.text || part.value || part.content || part.name || part.label || "";
          return "";
        }).filter(Boolean).join("");
      }
      if (typeof value === "object") return value.text || value.value || value.content || value.message || value.name || value.label || "";
      return String(value || "");
    }
    function renderMessageText(item) {
      const platform = String(item?.platform || "").toLowerCase();
      const stickerLabel = extractTextFromFragments(item?.sticker?.name || item?.sticker?.title || item?.stickerName || item?.stickerText || item?.sticker || item?.stickerAlt);
      const stickerImage = normalizeImageSource(
        item?.stickerImage ||
        item?.emoteImage ||
        item?.sticker?.image ||
        item?.sticker?.imageUrl ||
        item?.sticker?.url ||
        item?.sticker?.uri ||
        item?.sticker?.urlList?.[0] ||
        item?.sticker?.url_list?.[0] ||
        item?.sticker?.image?.url ||
        item?.sticker?.image?.uri ||
        item?.sticker?.image?.src ||
        item?.sticker?.image?.urlList?.[0] ||
        item?.sticker?.image?.url_list?.[0] ||
        item?.emoteList?.[0]?.image?.urlList?.[0] ||
        item?.emoteList?.[0]?.image?.url_list?.[0] ||
        item?.emoteList?.[0]?.image?.url ||
        item?.emoteList?.[0]?.url ||
        item?.emoteList?.[0]?.uri ||
        item?.emoteList?.[0]?.imageUrl ||
        item?.emoteList?.[0]?.imageURL ||
        ""
      );
      const raw = [ item?.message, item?.comment, item?.text, item?.messageText, item?.content, extractTextFromFragments(item?.fragments), extractTextFromFragments(item?.messageFragments), extractTextFromFragments(item?.textFragments), extractTextFromFragments(item?.commentFragments), stickerLabel ].map((v) => String(v || "").trim()).find(Boolean) || "";
      if (platform === "twitch") return parseTwitchEmotes(raw, item?.emotes);
      const isSticker = normalizeTypeName(item?.type).includes("sticker") || Boolean(stickerLabel) || Boolean(stickerImage);
      if (isSticker) {
        const sticker = stickerLabel || item?.sticker || item?.stickerAlt || "Sticker";
        return stickerImage
          ? `<span class="stickerInline"><img class="chatSticker" src="${esc(stickerImage)}" alt="${esc(sticker)}" loading="lazy"><span class="stickerFallback">${esc(sticker)}</span></span>`
          : `🧩 ${esc(sticker)}`;
      }
      const fallback = item?.action ? String(item.action) : "Mensaje";
      return esc(raw || fallback).replace(/\n/g, "<br>");
    }
    function getRenderedMessage(item){ return renderMessageText(item); }
    function normalizeBadgeKeys(raw){ if(!raw) return []; const items=[]; const push=(k)=>{ const c=String(k||'').trim(); if(c) items.push(c); }; if(Array.isArray(raw)) raw.forEach((item)=>{ if(typeof item==='string') push(item); else if(item && typeof item==='object') push(item.name || item.type || item.label || item.id); }); else if(typeof raw==='object') Object.entries(raw).forEach(([k,v])=>{ if(v===false || v==null) return; push(k); }); else if(typeof raw==='string') raw.split(/[\,\s|]+/).forEach(push); return items; }
    function badgeEmoji(key, platform){ const lower=String(key||'').toLowerCase(); if(roleBadges[lower]) return roleBadges[lower].emoji; if(lower === 'mod') return roleBadges.moderator.emoji; if(lower === 'broadcaster') return roleBadges.broadcaster.emoji; if(lower === 'sub' || lower === 'subscriber') return roleBadges.subscriber.emoji; if(lower === 'vip') return roleBadges.vip.emoji; if(lower === 'verified') return roleBadges.verified.emoji; if(lower === 'staff') return roleBadges.staff.emoji; if(lower === 'founder') return roleBadges.founder.emoji; if(lower === 'premium') return roleBadges.premium.emoji; if(lower === 'member' || lower.includes('fanclub') || lower.includes('superfan')) return '👤'; if(lower === 'tiktok') return roleBadges.tiktok.emoji; if(lower === 'twitch') return roleBadges.twitch.emoji; if(lower.includes('mod')) return roleBadges.moderator.emoji; if(lower.includes('vip')) return roleBadges.vip.emoji; if(lower.includes('sub')) return roleBadges.subscriber.emoji; if(lower.includes('member') || lower.includes('fanclub') || lower.includes('superfan')) return '👤'; return platform === 'tiktok' ? '🎵' : '🟣'; }
    function badgeText(key){ const lower=String(key||'').toLowerCase(); if(lower.includes('broadcaster')) return 'Broadcaster'; if(lower.includes('mod')) return 'Mod'; if(lower.includes('vip')) return 'VIP'; if(lower.includes('sub')) return 'Sub'; if(lower.includes('staff')) return 'Staff'; if(lower.includes('verified')) return 'Verified'; if(lower.includes('founder')) return 'Founder'; if(lower.includes('premium')) return 'Premium'; if(lower.includes('tiktok')) return 'TikTok'; if(lower.includes('twitch')) return 'Twitch'; return lower.replace(/[_-]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()); }
    function badgeChips(raw, platform){ const keys = normalizeBadgeKeys(raw); if(!settings.personal.showBadges) return ''; const style = settings.personal.badgeStyle || 'emoji'; return keys.map((key) => `<span class="badge">${esc(style === 'compact' ? badgeText(key) : badgeEmoji(key, platform))}</span>`).join(''); }
    function activityBadgeKeys(item){ return [...new Set([normalizeUsername(item?.user||''), normalizeUsername(item?.displayName||''), normalizeUsername(item?.uniqueId||''), normalizeUsername(item?.username||'')].filter(Boolean))]; }
    function activityBadgeMarkup(item){
      if(!settings.personal.showBadges) return '';
      const platform=String(item?.platform||'tiktok').toLowerCase();
      const keys=activityBadgeKeys(item);
      const entry=keys.map((key)=>state.activityBadges?.[platform]?.[key]).find((value)=>value?.badges || value?.lastGift || value?.voice);
      if(!entry) return '';
      const badges = [];
      if (entry.lastGift?.image) {
        const giftLabel = entry.lastGift.name || "Regalo";
        badges.push(`<span class="badge activityBadge activityGiftBadge" title="${esc(giftLabel)}"><img class="activityGiftBadgeImg" src="${esc(entry.lastGift.image)}" alt="${esc(giftLabel)}" loading="lazy"><span>${esc(giftLabel)}</span></span>`);
      }
      for (const rule of ACTIVITY_BADGE_RULES) {
        if (entry.badges?.[rule.emoji]) badges.push(`<span class="badge activityBadge" title="${esc(rule.label)}">${esc(rule.emoji)}</span>`);
      }
      return badges.join('');
    }
    function supporterKey(item){ return normalizeUsername(item?.user || item?.displayName || item?.username || item?.uniqueId || ''); }
    function supporterHighlightEnabled(platform){ const key = String(platform || 'tiktok').toLowerCase(); if (key === 'twitch') return settings.personal.highlightSupportersTwitch !== false; return settings.personal.highlightSupportersTikTok !== false; }
    function isSupporterProfile(item){ if (!item) return false; const platform = String(item?.platform || 'tiktok').toLowerCase(); const key = supporterKey(item); return Boolean(key && state.supporters?.[platform]?.[key]); }
    const GIFT_KEY_RE = /[^a-z0-9]+/g;
    function normalizeGiftKey(value) { return String(value || "").trim().toLowerCase().replace(GIFT_KEY_RE, ""); }
    let giftCatalogPromise = null;
    let giftCatalogIndex = new Map();
    let giftCatalogItems = [];
    async function ensureGiftCatalog() {
      if (giftCatalogPromise) return giftCatalogPromise;
      giftCatalogPromise = fetch("/data/tiktok-gifts.json")
        .then(async (res) => { if (!res.ok) throw new Error("gift catalog load failed"); return res.json(); })
        .then((data) => {
          const items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
          giftCatalogItems = items;
          giftCatalogIndex = new Map();
          for (const item of items) {
            const keys = [item?.id, item?.key, item?.name, item?.alt].map(normalizeGiftKey).filter(Boolean);
            for (const key of keys) if (!giftCatalogIndex.has(key)) giftCatalogIndex.set(key, item);
          }
          return items;
        })
        .catch(() => { giftCatalogIndex = new Map(); return []; });
      return giftCatalogPromise;
    }
    function lookupGiftCatalog(name) { const key = normalizeGiftKey(name); return key ? (giftCatalogIndex.get(key) || null) : null; }
    function avatarForItem(item){ return normalizeImageSource(item?.avatar || item?.avatarUrl || ""); }
    function timeLabel(ts){ return new Date(ts || Date.now()).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }); }
    function platformTag(platform){ return `<span class="platformTag ${platform}">${platform === 'twitch' ? 'Twitch' : 'TikTok'}</span>`; }
    function getRoleAccent(item){ const badges = normalizeBadgeKeys(item.badges); const rawKeys = Array.isArray(item.badges) ? item.badges.map((b) => String(b || "").toLowerCase()) : item.badges && typeof item.badges === "object" ? Object.keys(item.badges).map((k) => String(k || "").toLowerCase()) : []; if (rawKeys.some((k) => k.includes("broadcaster"))) return roleBadges.broadcaster.color; if (rawKeys.some((k) => k.includes("mod"))) return roleBadges.moderator.color; if (rawKeys.some((k) => k.includes("vip"))) return roleBadges.vip.color; if (rawKeys.some((k) => k.includes("staff"))) return roleBadges.staff.color; if (rawKeys.some((k) => k.includes("sub"))) return roleBadges.subscriber.color; if (rawKeys.some((k) => k.includes("verified"))) return roleBadges.verified.color; return badges.length ? platformColors[item.platform] : platformColors[item.platform]; }
    function itemAccent(item){ const frameMode = settings.personal.avatarFrame || "platform"; if (frameMode === "none") return "transparent"; if (frameMode === "role") return getRoleAccent(item); return platformColors[item.platform] || "var(--accent)"; }
    function giftAccent(item){ const mode = String(settings.personal.giftHighlightStyle || "gold"); if (mode === "platform") return platformColors[item.platform] || platformColors.tiktok || "#f5d063"; return "#f5d063"; }
    function frameClass(){ return `frame-${settings.personal.avatarFrame || "platform"}`; }
    function animationClass(){ return `anim-${settings.personal.animation || "slide"}`; }
    function themeClass(){ return `theme-${settings.personal.theme || "dark"}`; }
    function overlayThemeClass(){ return `overlay-theme-${settings.personal.overlayTheme || "neon"}`; }
    function normalizeOverlayShape(value){ return String(value || "normal").toLowerCase() === "card" ? "card" : "normal"; }
    function normalizeOverlayCardSide(value){ return String(value || "left").toLowerCase() === "right" ? "right" : "left"; }
    function overlayShapeForView(){ return normalizeOverlayShape(view === "chat" ? settings.personal.chatOverlayShape : (view === "events" ? settings.personal.eventsOverlayShape : settings.personal.giftsOverlayShape)); }
    function overlayCardSideForView(){ return normalizeOverlayCardSide(view === "chat" ? settings.personal.chatOverlayCardSide : (view === "events" ? settings.personal.eventsOverlayCardSide : settings.personal.giftsOverlayCardSide)); }
    function overlayShapeClass(){ return `shape-${overlayShapeForView()}`; }
    function overlayShapeWidthValue(shape){ const map = { normal: 980, card: 520 }; return map[normalizeOverlayShape(shape)] || map.normal; }
    function autoMessageScale(text) { const len = String(text || "").length; return Math.max(0.74, Math.min(1, 1 - Math.max(0, len - 80) / 720)); }
    function overlayItemHeightCap(shape){ return normalizeOverlayShape(shape) === "card" ? Math.min(window.innerHeight * 0.68, 620) : Math.min(window.innerHeight * 0.88, 980); }
    function fitOverlayItems(){
      const currentShape = overlayShapeForView();
      const maxHeight = overlayItemHeightCap(currentShape);
      const items = Array.from(list?.querySelectorAll('.overlayItem') || []);
      for (const item of items) {
        const baseScale = Number.parseFloat(item.style.getPropertyValue('--entry-text-scale') || '1') || 1;
        let scale = currentShape === 'card' ? Math.min(baseScale, 0.98) : baseScale;
        item.style.setProperty('--entry-text-scale', String(scale));
        let tries = 0;
        while (item.scrollHeight > maxHeight && scale > 0.72 && tries < 16) {
          scale = Math.max(0.72, scale - (currentShape === 'card' ? 0.04 : 0.03));
          item.style.setProperty('--entry-text-scale', String(scale));
          tries++;
        }
      }
    }
    function itemEmoji(item, kind){ const type = String(item?.type || kind || "").toLowerCase(); const group = String(item?.group || "").toLowerCase(); if (item?.emoji) return String(item.emoji); if (group === "gift" || type === "gift") return "🎁"; if (type === "sub" || type === "subscription" || type === "resub" || type === "fanclub" || type === "superfan" || type === "super_fan") return "⭐"; if (type === "bits" || type === "superchat") return "💎"; if (type === "raid" || type === "host") return "⚡"; if (type === "follow") return "👤"; if (type === "share") return "🗣"; if (type === "join" || type === "member") return "👻"; if (type === "system") return "📣"; if (type === "like") return "❤️"; if (type === "heartme") return "❤️‍🔥"; if (type === "question") return "❓"; if (type === "emote") return "😄"; if (kind === "chat") return "💬"; return String(item?.platform || "") === "twitch" ? "🟣" : "🎵"; }
    function overlayEventAccent(item) { const mode = String(settings.personal.overlayEventHighlightStyle || "platform"); const platform = String(item?.platform || "tiktok").toLowerCase(); if (mode === "platform") return platformColors[platform] || platformColors.tiktok; const type = normalizeTypeName(item?.type); const group = normalizeTypeName(item?.group); const hit = (value) => type.includes(value) || group.includes(value); if (hit("like")) return "#ef4444"; if (hit("follow")) return "#3b82f6"; if (hit("share")) return "#22c55e"; if (hit("join") || hit("member") || hit("heartme") || hit("fanclub") || hit("superfan")) return "#b45309"; if (hit("gift")) return "#fb923c"; if (hit("sub") || hit("subscription") || hit("resub") || hit("superfanjoin")) return "#a78bfa"; if (hit("bits") || hit("superchat")) return "#22d3ee"; if (hit("raid") || hit("host")) return "#facc15"; if (hit("system")) return "#8b5e34"; return platformColors[platform] || "#f5d063"; }
    function highlightColorFor(item, kind) { const mode = String(settings.personal.highlightStyle || "platform"); const platform = String(item?.platform || "tiktok").toLowerCase(); if (mode === "platform") return platformColors[platform] || platformColors.tiktok; if (mode === "gold") return "#f5d063"; if (kind !== "event") return platformColors[platform] || platformColors.tiktok; const type = normalizeTypeName(item?.type); const group = normalizeTypeName(item?.group); const hit = (value) => type.includes(value) || group.includes(value); if (hit("like")) return "#ef4444"; if (hit("follow")) return "#3b82f6"; if (hit("share")) return "#22c55e"; if (hit("join") || hit("member") || hit("heartme") || hit("fanclub") || hit("superfan")) return "#f97316"; if (hit("gift")) return "#fb923c"; if (hit("sub") || hit("subscription") || hit("resub") || hit("superfanjoin")) return "#a78bfa"; if (hit("bits") || hit("superchat")) return "#22d3ee"; if (hit("raid") || hit("host")) return "#facc15"; if (hit("system")) return "#94a3b8"; return platformColors[platform] || "#f5d063"; }
    function isHighlightedEntry(item, kind) { const type = normalizeTypeName(item?.type); const group = normalizeTypeName(item?.group); const hasSupport = isSupporterProfile(item); const supporterOn = settings.personal.highlightSupporters !== false; if (kind === "chat" && hasSupport && supporterOn) return "supporter-highlight support-gold"; if (kind === "event" && (settings.personal.overlayEventHighlightStyle || "platform")) return "overlay-event-highlight"; if (kind !== "event" && kind !== "gift") return ""; const generic = { like: settings.personal.highlightLikes !== false, follow: settings.personal.highlightFollows !== false, join: settings.personal.highlightJoins !== false, share: settings.personal.highlightShares !== false, system: settings.personal.highlightSystem !== false, gift: settings.personal.highlightGifts !== false, sub: settings.personal.highlightSubs !== false, subscription: settings.personal.highlightSubs !== false, resub: settings.personal.highlightSubs !== false, bits: settings.personal.highlightBits !== false, raid: settings.personal.highlightRaids !== false, host: settings.personal.highlightRaids !== false, superchat: settings.personal.highlightBits !== false, }; const hit = Object.entries(generic).some(([needle, enabled]) => enabled && (type.includes(needle) || group.includes(needle))); if (!hit) return ""; return kind === "gift" ? "support-gold" : `highlight-${String(settings.personal.highlightStyle || "platform")}`; }

    function itemHtml(item, kind){
      const name = item.displayName || item.user || 'Usuario';
      const platform = String(item.platform || 'tiktok').toLowerCase();
      const isGift = kind === 'gift';
      const isChat = kind === 'chat';
      const isSupporter = isChat && isSupporterProfile(item) && settings.personal.highlightSupporters !== false && supporterHighlightEnabled(platform);
      const highlightClass = isHighlightedEntry(item, kind);
      const rawText = isChat ? getRenderedMessage(item) : isGift ? esc(item.message || `${name} envió un regalo`).replace(/\n/g,'<br>') : esc(item.message || '').replace(/\n/g,'<br>');
      const textScale = isChat && settings.personal.chatAdjustMessages === true ? autoMessageScale(rawText) : 1;
      const textColor = resolveChatTextColor(isGift || isSupporter ? 'yellow' : (platform === 'twitch' ? settings.personal.twitchNameColor : settings.personal.textColor));
      const nameTextColor = platform === 'twitch' ? settings.personal.twitchNameColor : settings.personal.textColor;
      const textContrast = effectContrastColor(nameTextColor);
      const textShadow = effectShadow(settings.personal.messageEffect, textContrast);
      const nameShadow = effectShadow(settings.personal.nameEffect, textContrast);
      const nameStroke = effectStroke(settings.personal.nameEffect, textContrast);
      const color = isGift || isSupporter ? '#f5d063' : (platform === 'twitch' ? (settings.personal.twitchNameColor === 'white' ? '#f4f7ff' : platformColors.twitch) : '#f4f7ff');
      const accent = isChat ? (platformColors[platform] || platformColors.tiktok) : (isGift ? '#f5d063' : (view === 'events' ? overlayEventAccent(item) : (platformColors[platform] || platformColors.tiktok)));
      const bubbleFrame = isChat
        ? (settings.personal.bubbleFrame === 'role' ? 'frame-role' : 'frame-platform')
        : 'frame-platform';
      const action = isChat ? (item.action || 'Comentario') : (item.action || kind);
      const topBadges = isChat ? activityBadgeMarkup(item) : badgeChips(item.badges, platform);
      const metaBadges = isChat ? badgeChips(item.badges, platform) : "";
      const avatar = avatarForItem(item);
      const hasAvatar = Boolean(avatar);
      const shape = overlayShapeForView();
      const gift = lookupGiftCatalog(item.gift || item.giftName || item.giftAlt || "");
      const giftName = item.gift || item.giftName || gift?.name || gift?.alt || "Regalo";
      const giftImage = normalizeImageSource(item.giftImage || gift?.image || "");
      const giftCoins = Number(item.giftCoins ?? gift?.coins ?? 0) || 0;
      const giftSize = String(settings.personal.overlayGiftImageSize || 'md');
      const giftSizeMap = { sm: '42px', md: '48px', lg: '64px', xl: '220px' };
      const giftCenter = view === 'events' && shape === 'card';
      const giftInlineSizeMap = { sm: '18px', md: '20px', lg: '24px', xl: '28px' };
      const giftInlineSize = giftInlineSizeMap[giftSize] || '20px';
      const giftInline = (isGift && (giftName || giftCoins || item.amount))
        ? `<span class="giftInline ${giftCenter ? 'centered' : ''} gift-${String(settings.personal.overlayGiftComposition || 'normal')}" style="--gift-inline-size:${giftInlineSize}">${item.amount ? `<span class="giftInlineAmount">x${esc(item.amount)}</span> ` : ''}<span class="giftInlineName">${esc(giftName)}</span>${giftImage ? `<img class="giftInlineImg" src="${esc(giftImage)}" alt="${esc(item.giftAlt || giftName)}" loading="lazy" onerror="this.style.display='none'">` : ""}${giftCoins ? `<span class="giftCoinBadge giftInlineCoin"><img src="/coin-logo.png" alt="" aria-hidden="true"> ${esc(giftCoins)}</span>` : ""}</span>`
        : "";
      const entryTextHtml = isGift
        ? `<div class="entryText">${giftInline || esc(rawText).replace(/\n/g, '<br>')}</div>`
        : `<div class="entryText">${esc(rawText).replace(/\n/g, '<br>')}</div>`;
      return `<article class="overlayItem ${highlightClass}" style="--item-accent:${accent};--name-color:${color};--entry-text-scale:${textScale};--entry-text-color:${textColor || 'var(--text, #eaf1ff)'};--entry-text-shadow:${textShadow};--name-text-shadow:${nameShadow};--name-stroke:${nameStroke};">${hasAvatar ? `<div class="entryAvatarWrap ${frameClass()}"><img class="entryAvatar" src="${esc(avatar)}" alt="avatar" loading="lazy"></div>` : `<div class="entryAvatarWrap ${frameClass()} no-avatar"><img class="entryAvatar" src="" alt="avatar" loading="lazy" style="display:none"></div>`}<div class="entryBody"><div class="entryBubble ${bubbleFrame}"><div class="entryTop"><span class="user">${esc(name)}</span>${isChat && isSupporter ? `<span class="badge supportBadge support-gold">💖 ${esc(settings.personal.supporterHighlightStyle === 'marker' ? 'Corazón brillante' : 'Heart Me')}</span>` : ''}${topBadges ? `<span class="entryActivityBadges">${topBadges}</span>` : ''}<span class="itemEmoji">${esc(itemEmoji(item, kind))}</span>${platformTag(platform)}<span class="actionTag">${esc(action)}</span><span class="timeTag">${timeLabel(item.timestamp)}</span></div>${entryTextHtml}${isChat && metaBadges ? `<div class="overlayMeta">${metaBadges}</div>` : ''}</div></div></article>`;    }

    function isAtEdge(el, layout, direction){ if(!el) return true; if(layout === 'horizontal'){ if(direction === 'left') return el.scrollLeft <= 24; return el.scrollLeft + el.clientWidth >= el.scrollWidth - 24; } if(direction === 'up') return el.scrollTop <= 24; return el.scrollTop + el.clientHeight >= el.scrollHeight - 24; }
    function scrollToEdge(el, layout, direction, smooth=true){ if(!el) return; const behavior = smooth ? 'smooth' : 'auto'; if(layout === 'horizontal'){ const left = direction === 'left' ? 0 : Math.max(0, el.scrollWidth - el.clientWidth); el.scrollTo({ left, behavior }); return; } const top = direction === 'up' ? 0 : Math.max(0, el.scrollHeight - el.clientHeight); el.scrollTo({ top, behavior }); }

    function render(){
      const items = view === 'chat' ? state.chat : view === 'events' ? state.events : state.gifts;
      const layout = view === 'chat' ? (settings.personal.chatLayout || 'vertical') : (view === 'events' ? (settings.personal.eventsLayout || 'vertical') : (settings.personal.giftsLayout || 'vertical'));
      const direction = view === 'chat' ? (settings.personal.chatDirection || 'down') : (view === 'events' ? (settings.personal.eventsDirection || 'down') : (settings.personal.giftsDirection || 'down'));
      const size = view === 'chat' ? (settings.personal.chatHorizontalMode || 'normal') : (view === 'events' ? (settings.personal.eventsPanelSize || 'normal') : (settings.personal.giftsPanelSize || 'normal'));
      const mode = view === 'chat' ? 'slide' : (view === 'events' ? (settings.personal.eventsMode || 'slide') : (settings.personal.giftsMode || 'slide'));
      const shape = overlayShapeForView();
      const reverse = layout === 'horizontal' ? direction === 'left' : direction === 'up';
      const filtered = items.slice().sort((a,b)=> reverse ? (b.timestamp || 0) - (a.timestamp || 0) : (a.timestamp || 0) - (b.timestamp || 0));
      const shapeClass = overlayShapeClass();
      const cardSideClass = layout === 'vertical' && shape === 'card' ? `card-side-${overlayCardSideForView()}` : '';
      document.body.style.setProperty('--app-font', fontFamily(settings.personal.font || 'inter'));
      document.body.classList.remove('theme-dark','theme-matrix','theme-neon','theme-sunset','theme-aurora','overlay-theme-neon','overlay-theme-vampire','overlay-theme-abyss','overlay-theme-midnight','overlay-theme-graphite','overlay-theme-cobalt','overlay-theme-emerald','overlay-theme-crimson','overlay-theme-amethyst','overlay-theme-slate','chat-theme-glass','chat-theme-cloud','chat-theme-bubble','chat-theme-neon','chat-theme-minimal','chat-theme-aurora','chat-theme-comic','chat-theme-holo','chat-theme-ribbon');
      document.body.classList.add(overlayThemeClass());
      document.body.classList.toggle('overlay-view-chat', view === 'chat');
      document.body.classList.toggle('chat-horizontal', view === 'chat' && layout === 'horizontal');
      document.body.classList.toggle('chat-vertical', view === 'chat' && layout !== 'horizontal');
      document.body.classList.toggle('overlay-vertical', layout === 'vertical');
      document.body.classList.toggle('overlay-card-mode', layout === 'vertical' && shape === 'card');
      document.body.classList.toggle(`chat-horizontal-${settings.personal.chatHorizontalMode || 'normal'}`, view === 'chat' && layout === 'horizontal');
      list.className = `overlayList layout-${layout} mode-${mode} direction-${direction} size-${size} ${shapeClass} ${cardSideClass}`.trim();
      list.style.setProperty("--panel-card-width", `${overlayShapeWidthValue(shape)}px`);
      list.style.setProperty("--overlay-item-max-width", `${overlayShapeWidthValue(shape)}px`);
      list.style.setProperty("--overlay-item-max-height", `${overlayItemHeightCap(shape)}px`);
      document.body.style.setProperty("--overlay-zoom", String(overlayUi.zoom || 1));
      syncDirectionButtons();
      syncVoiceBotUI();
      list.innerHTML = filtered.length ? filtered.map((item)=>itemHtml(item, view === 'chat' ? 'chat' : (item.group === 'gift' || item.type === 'gift' || view === 'gifts' ? 'gift' : 'event'))).join('') : `<div class="overlayEmpty"><strong>Sin contenido</strong><span>Cuando haya actividad, aparecerá aquí.</span></div>`;
      updateOverlayStatus();
      requestAnimationFrame(() => requestAnimationFrame(fitOverlayItems));
      const key = view === 'chat' ? 'chat' : view === 'events' ? 'events' : 'gifts';
      if(filtered.length && (followState[key] || isAtEdge(list, layout, direction))) scrollToEdge(list, layout, direction, false);
    }
    function applySettings(nextSettings){ settings = migrateSettings(mergeDeep(structuredClone(defaults), nextSettings || {})); render(); }
    function updateActivityBadgesFromStorage(){ state.activityBadges = loadJSON(ACTIVITY_BADGES_KEY, { tiktok:{}, twitch:{} }); state.supporters = loadJSON(SUPPORTERS_KEY, { tiktok:{}, twitch:{} }); render(); }
    function clearByAge(list, enabled, seconds){ if(!enabled) return list; const cutoff = Date.now() - Math.max(10, Number(seconds || 30)) * 1000; return list.filter((item)=> (item.timestamp || 0) >= cutoff); }
    function pushChat(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Comentario', timestamp: data?.timestamp || Date.now() }; state.chat.push(item); if(state.chat.length > 240) state.chat.splice(0, state.chat.length - 240); state.chat = clearByAge(state.chat, settings.personal.autoClearChat, settings.personal.clearChatSeconds); followState.chat = true; render(); }
    function pushEvent(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Evento', type: data?.type || 'event', group: data?.group || 'event', timestamp: data?.timestamp || Date.now() }; if(String(item.type).toLowerCase() === 'gift' || String(item.group).toLowerCase() === 'gift'){ pushGift(item); return; } registerVoiceTriggerForItem(item); state.events.unshift(item); if(state.events.length > 240) state.events.length = 240; state.events = clearByAge(state.events, settings.personal.eventsAutoClear, settings.personal.eventsClearSeconds); followState.events = true; render(); }
    function pushGift(data){ const item = { platform: data?.platform || 'tiktok', user: data?.user || data?.displayName || 'Usuario', displayName: data?.displayName || data?.user || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Regalo', type: data?.type || 'gift', group: 'gift', gift: data?.gift || '', amount: data?.amount || '', timestamp: data?.timestamp || Date.now() }; registerVoiceTriggerForItem(item); state.gifts.push(item); if(state.gifts.length > 240) state.gifts.length = 240; state.gifts = clearByAge(state.gifts, settings.personal.giftsAutoClear, settings.personal.giftsClearSeconds); followState.gifts = true; render(); }

    socket.on('settings', (serverSettings) => { settings = migrateSettings(mergeDeep(structuredClone(defaults), serverSettings || {})); ensureGiftCatalog().then(() => render()); });
    socket.on('chat', (data) => { if(view === 'chat') { const item = data || {}; pushChat(item); queueVoiceMessage(item); } updateOverlayStatus(); });
    socket.on('event', (data) => { const raw = data || {}; const type = String(raw?.type || '').toLowerCase(); const normalizedEvent = { ...raw, platform: String(raw?.platform || 'tiktok').toLowerCase(), type, action: raw?.action || (type === 'gift' ? 'Regalo' : type === 'sub' ? 'Suscripción' : type === 'bits' ? 'Bits' : type === 'raid' ? 'Raid' : type === 'host' ? 'Host' : 'Evento') }; registerVoiceTriggerForItem(normalizedEvent); if(type === 'gift' || type === 'sub' || type === 'bits' || type === 'raid' || type === 'host'){ if(view === 'gifts') pushGift(normalizedEvent || {}); else if(view === 'events') pushEvent({ ...(normalizedEvent || {}), group: 'gift' }); updateOverlayStatus(); return; } if(view === 'events') pushEvent(normalizedEvent || {}); updateOverlayStatus(); });
    window.addEventListener('storage', (ev) => {
      if(ev.key === SETTINGS_KEY || ev.key === LEGACY_SETTINGS_KEY) {
        settings = loadSettings();
        ensureGiftCatalog().then(() => { syncDirectionButtons(); render(); });
      }
      if(ev.key === ACTIVITY_BADGES_KEY || ev.key === SUPPORTERS_KEY) updateActivityBadgesFromStorage();
      if(ev.key === VOICEBOT_KEY) { voiceBot = loadVoiceBot(); syncVoiceBotUI(); }
      if(ev.key === PRESENCE_KEY || ev.key === SESSION_KEY) updateOverlayStatus();
      if(ev.key === OVERLAY_UI_KEY) {
        overlayUi = loadOverlayUi();
        applyOverlayUi();
        render();
      }
    });
    window.addEventListener('resize', () => render());
    window.setInterval(updateOverlayStatus, 2000);
    document.getElementById("overlayZoomOutBtn")?.addEventListener("click", () => adjustOverlayZoom(-0.1));
    document.getElementById("overlayDirectionLeftBtn")?.addEventListener("click", () => setCurrentViewDirection("left"));
    document.getElementById("overlayDirectionRightBtn")?.addEventListener("click", () => setCurrentViewDirection("right"));
    document.getElementById("overlayCardBtn")?.addEventListener("click", toggleCurrentViewShape);
    document.getElementById("overlayZoomInBtn")?.addEventListener("click", () => adjustOverlayZoom(0.1));
    document.getElementById("overlayPaletteBtn")?.addEventListener("click", openBackgroundModal);
    document.getElementById("overlayVoiceBtn")?.addEventListener("click", () => toggleVoiceBotEnabled());
    document.getElementById("overlayVoiceRecipientsBtn")?.addEventListener("click", () => openVoiceBotModal("recipients"));
    document.getElementById("overlayVoiceUsersBtn")?.addEventListener("click", () => openVoiceBotModal("users"));
    document.getElementById("overlayVoiceRulesBtn")?.addEventListener("click", () => openVoiceBotModal("rules"));
    document.getElementById("overlayVoiceSettingsBtn")?.addEventListener("click", () => openVoiceBotModal("settings"));
    document.getElementById("overlayVoiceCloseBtn")?.addEventListener("click", closeVoiceBotModal);
    document.getElementById("overlayVoiceSelect")?.addEventListener("change", (ev) => setVoiceBotVoice(String(ev.target?.value || "verity")));
    document.getElementById("overlayVoicePinnedPlatformSelect")?.addEventListener("change", (ev) => {
      voiceBot.activeFixedPlatform = String(ev.target?.value || "tiktok");
      saveVoiceBot();
      renderVoiceFixedSuggestions();
      renderVoiceFixedUsers();
    });
    document.getElementById("overlayVoicePinnedUserInput")?.addEventListener("input", renderVoiceFixedSuggestions);
    document.getElementById("overlayVoicePinnedUserInput")?.addEventListener("change", renderVoiceFixedSuggestions);
    document.getElementById("overlayVoicePinnedVoiceSelect")?.addEventListener("change", (ev) => setVoiceBotFixedDraftVoice(String(ev.target?.value || "verity")));
    document.getElementById("overlayVoicePinnedApplyBtn")?.addEventListener("click", () => {
      const platform = document.getElementById("overlayVoicePinnedPlatformSelect");
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const select = document.getElementById("overlayVoicePinnedVoiceSelect");
      const username = String(input?.value || "").trim();
      const voiceKey = String(select?.value || voiceBot.fixedVoiceKey || "verity");
      if (!username) return;
      const selectedPlatform = String(platform?.value || voiceBot.activeFixedPlatform || "tiktok");
      voiceBot.activeFixedPlatform = selectedPlatform === "twitch" ? "twitch" : "tiktok";
      voiceBot.fixedVoiceKey = voiceKey in voiceCatalog ? voiceKey : "verity";
      saveVoiceBot();
      setVoiceFixedAssignment(selectedPlatform, username, voiceKey);
      if (input) input.value = "";
      renderVoiceFixedSuggestions();
      renderVoiceFixedUsers();
    });
    document.getElementById("overlayVoicePinnedClearBtn")?.addEventListener("click", () => {
      const input = document.getElementById("overlayVoicePinnedUserInput");
      if (input) input.value = "";
      renderVoiceFixedSuggestions();
    });
    document.getElementById("overlayVoicePinnedList")?.addEventListener("click", (ev) => {
      const deleteBtn = ev.target.closest("[data-voice-fixed-delete]");
      if (!deleteBtn) return;
      removeVoiceFixedAssignment(String(deleteBtn.getAttribute("data-voice-fixed-delete") || ""));
    });
    document.getElementById("overlayVoicePinnedSummary")?.addEventListener("click", (ev) => {
      const fillBtn = ev.target.closest("[data-voice-user-fill]");
      if (!fillBtn) return;
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const platform = document.getElementById("overlayVoicePinnedPlatformSelect");
      if (input) {
        input.value = String(fillBtn.getAttribute("data-voice-user-fill") || "");
        input.focus();
      }
      if (platform && fillBtn.getAttribute("data-voice-user-platform")) {
        platform.value = String(fillBtn.getAttribute("data-voice-user-platform") || "tiktok");
        voiceBot.activeFixedPlatform = platform.value;
        saveVoiceBot();
      }
      renderVoiceFixedSuggestions();
    });
    document.querySelectorAll("[data-voice-tab]").forEach((btn) => btn.addEventListener("click", () => setVoiceBotTab(String(btn.dataset.voiceTab || "recipients"))));
    document.querySelectorAll("[data-voice-filter]").forEach((btn) => btn.addEventListener("click", () => setVoiceBotFilter(String(btn.dataset.voiceFilter || "all"))));
    document.querySelectorAll("[data-voice-flag]").forEach((btn) => btn.addEventListener("click", () => setVoiceBotFlag(String(btn.dataset.voiceFlag || ""), !btn.classList.contains("is-active"))));
    document.getElementById("overlayVoiceRulePlatform")?.addEventListener("change", (ev) => {
      voiceRuleDraft.platform = String(ev.target?.value || "tiktok") === "twitch" ? "twitch" : "tiktok";
      if (voiceRuleDraft.platform === "twitch" && voiceRuleDraft.kind === "gift") voiceRuleDraft.kind = "bits";
      if (voiceRuleDraft.platform === "tiktok" && voiceRuleDraft.kind === "bits") voiceRuleDraft.kind = "gift";
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleKind")?.addEventListener("change", (ev) => {
      voiceRuleDraft.kind = String(ev.target?.value || "gift");
      voiceRuleDraft.targetKey = "";
      voiceRuleDraft.targetLabel = "";
      voiceRuleDraft.targetImage = "";
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleMode")?.addEventListener("change", (ev) => {
      voiceRuleDraft.mode = String(ev.target?.value || "once") === "unlock" ? "unlock" : "once";
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleVoice")?.addEventListener("change", (ev) => {
      voiceRuleDraft.voiceKey = String(ev.target?.value || "verity");
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleLabel")?.addEventListener("input", (ev) => {
      voiceRuleDraft.targetLabel = String(ev.target?.value || "").trim();
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleActiveBtn")?.addEventListener("click", () => {
      voiceRuleDraft.active = true;
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleInactiveBtn")?.addEventListener("click", () => {
      voiceRuleDraft.active = false;
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleAddBtn")?.addEventListener("click", addVoiceRule);
    document.getElementById("overlayVoiceRuleResetBtn")?.addEventListener("click", resetVoiceRuleDraft);
    document.getElementById("overlayVoiceTargetSearch")?.addEventListener("input", renderVoiceRuleTargets);
    document.getElementById("overlayVoiceTargetGrid")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-voice-target]");
      if (!btn) return;
      try {
        const data = JSON.parse(btn.getAttribute("data-voice-target") || "{}");
        normalizeDraftSelection(data);
      } catch {}
    });
    document.getElementById("overlayVoicePresetGrid")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-voice-preset]");
      if (!btn) return;
      const key = String(btn.getAttribute("data-voice-preset") || "");
      voiceRuleDraft.targetKey = key;
      voiceRuleDraft.targetLabel = voiceRuleLabels[key] || key;
      saveVoiceBot();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoiceRuleRail")?.addEventListener("click", (ev) => {
      const toggleBtn = ev.target.closest("[data-rule-toggle]");
      const deleteBtn = ev.target.closest("[data-rule-delete]");
      if (toggleBtn) {
        toggleVoiceRule(String(toggleBtn.getAttribute("data-rule-toggle") || ""));
        return;
      }
      if (deleteBtn) {
        removeVoiceRule(String(deleteBtn.getAttribute("data-rule-delete") || ""));
      }
    });
    document.getElementById("overlayBackgroundCloseBtn")?.addEventListener("click", closeBackgroundModal);
    document.getElementById("overlayBackgroundModal")?.addEventListener("click", (ev) => { if (ev.target?.id === "overlayBackgroundModal") closeBackgroundModal(); });
    document.getElementById("overlayVoiceModal")?.addEventListener("click", (ev) => { if (ev.target?.id === "overlayVoiceModal") closeVoiceBotModal(); });
    document.querySelectorAll("[data-overlay-bg-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = String(btn.dataset.overlayBgMode || "transparent");
        const color = String(btn.dataset.overlayBgColor || "");
        setOverlayBackground(mode, color);
      });
    });
    document.getElementById("overlayApplyColorBtn")?.addEventListener("click", () => {
      const input = document.getElementById("overlayBgColorInput");
      setOverlayBackground("color", String(input?.value || overlayUiDefaults.backgroundColor));
    });
    document.getElementById("overlayBgColorInput")?.addEventListener("input", (ev) => {
      const value = String(ev.target?.value || overlayUiDefaults.backgroundColor);
      overlayUi.backgroundColor = value;
      overlayUi.backgroundMode = "color";
      applyOverlayUi();
      render();
    });
    window.addEventListener("keydown", (ev) => { if (ev.key === "Escape") { closeBackgroundModal(); closeVoiceBotModal(); } });

    ensureGiftCatalog().finally(() => { settings = loadSettings(); overlayUi = loadOverlayUi(); voiceBot = loadVoiceBot(); voiceRuleDraft = structuredClone(voiceRuleDraftDefaults); applyOverlayUi(); updateActivityBadgesFromStorage(); updateOverlayStatus(); syncDirectionButtons(); syncVoiceBotUI(); render(); });
  