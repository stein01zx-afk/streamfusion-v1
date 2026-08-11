
    const socket = io();
    const list = document.getElementById('list');
    const SETTINGS_KEY = "streamfusion.ui.settings.v2";
    const LEGACY_SETTINGS_KEY = "streamfusion.ui.settings.v1";
    const SUPPORTERS_KEY = "streamfusion.ui.supporters.v1";
    const ACTIVITY_BADGES_KEY = "streamfusion.ui.activityBadges.v1";
    const OVERLAY_UI_KEY = "streamfusion.overlay.ui.v1";
    const VOICEBOT_KEY = "streamfusion.voicebot.v1";
    const voiceBotDefaults = { enabled: false, filter: "all", voiceKey: "verity", fixedDraftVoiceKey: "verity", sayDice: false, singSlashCommand: true, ignoreEmojis: true, ignoreSpecialChars: true, ignoreStickers: true, ignoreEmotes: true, onlySpanish: true, allowEnye: true, profanityFilter: true, noReadNames: false, antiSpamFilter: true, activeTab: "recipients", voiceVolumes: {}, pendingByUser: {}, unlockedByUser: {}, fixedByUser: {}, giftByUser: {}, seenEvents: {}, lastMessageByUser: {}, rules: [] };
    const voiceExpressionCatalog = {
      s: { marker: "[singing]", emotion: "singing", label: "Cantando" },
      a: { marker: "[angry]", emotion: "angry", label: "Enojo" },
      w: { marker: "[whispering]", emotion: "whispering", label: "Susurrando" },
      g: { marker: "[laughing]", emotion: "laughing", label: "Gracioso" },
      l: { marker: "[laughing]", emotion: "laughing", label: "Risa" },
      e: { marker: "[excited]", emotion: "excited", label: "Entusiasta" },
      c: { marker: "[crying]", emotion: "crying", label: "Llorando" },
      p: { marker: "[pause]", emotion: "pause", label: "Pausa" },
      b: { marker: "[break]", emotion: "break", label: "Pausa larga" },
    };
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
      barney: { label: "Barney", id: "3c7dc89e37cc4907a7262df3cda01686", aliases: ["barney", "barnei", "barni", "barney voz", "barney voice", "barneyy"] },
      naruto: { label: "Naruto Shippuden", id: "96d74deaad0e4fd2b38308e012bcc554" },
      goku: { label: "Goku", id: "9f850ee9ada24b20a6866825eaefd3f8" },
      stitch: { label: "Stitch", id: "b7bf6ab569ee48b4ba9d1e98c3767ab9" },
      elmo: { label: "Elmo", id: "61e917a26d48444da6a0f07f80f4873e" },
      minion: { label: "Minion", id: "8bc1a2123c2c4b68bff426440871eff4" },
      mordecai: { label: "Mordecai", id: "4831978dcd9943a2b14aeb77a4785d8f" },
      rigby: { label: "Rigby", id: "0296bc28309643809cd51c443407c7b5" },
      akaza_ds: { label: "Akaza DS", id: "829e7aa69293458ab5d1a3058f0d71b4" },
      tanjiro_ds: { label: "Tanjiro DS", id: "926ab32e533748d4b85965464c9a9526" },
      shinobu_ds: { label: "Shinobu DS", id: "7e7b8f4c600847dd99f6aead1d292503" },
      gru: { label: "Gru", id: "f2204c7e198f4630af485ff5edc90778" },
      don_cangrejo: { label: "Don Cangrejo", id: "4819291078264dc69ff151f7680baeb0" },
      plankton: { label: "Plankton", id: "304d8f104908477abbe917e8bd31df1b" },
      ken_kaneki: { label: "Ken Kaneki", id: "28aa07e96d644564ace67493f2b4aa4a" },
      chavo_real: { label: "Chavo Real", id: "04d112410e054f0297205933c2f9ee57" },
      chavo_animado: { label: "Chavo Animado", id: "f198eb4ad6e8426dacedb631952a88ef" },
      kiko_real: { label: "Kiko Real", id: "b6c810ebace844ada275e90cf1aab35c" },
      kiko_animado: { label: "Kiko Animado", id: "663a9f98d080422e9796e4764b6adb62" },
      don_ramon_r: { label: "Don Ramon R", id: "f9fc215d37f541118aed10bac769f4b6" },
      don_ramon_a: { label: "Don Ramon A", id: "587c8b89da81478486699e4ae6ec3ad0" },
      michael_jackson: { label: "Michael Jackson", id: "409e62fda4644ccabbb15275de9095e4" },
      milk_dbz: { label: "Milk DBZ", id: "f9fec2b8ca2640e8a0383c073ab033ec" },
      bulma_joven: { label: "Bulma Joven", id: "09507d76d37c4fdf8f0cc81fee1f6218" },
      ragatha_dc: { label: "Ragatha DC", id: "bf3b5b6ef4254521a6afb6040a463cde" },
      kinger_cuerdo_dc: { label: "Kinger Cuerdo DC", id: "3d74c56e741f434dbe7644c99959f1e1" },
      kinger_dc: { label: "Kinger DC", id: "a7caf4b47a24432e946f28e24eba6ea9" },
      pinkie_pie: { label: "Pinki Pie", id: "35c7c46f9a4f48f390e44ae4bae9c5e0" },
      sonic: { label: "Sonic", id: "057ca32a305141cca13ca6d0cbf757e8" },
      yuji_itadori: { label: "Yuji Itadori", id: "40321316304645ee95180d1f9d9f4406" },
      gojo_satoru: { label: "Gojo Satoru", id: "e49f1fb63ab843e8b1d85a2e760b1f09" },
      makanaki: { label: "Makanaki", id: "66f98764678e46219d0891f3758493e2" },
      gaspi: { label: "Gaspi", id: "351a1cd287584e9d8d4b2e2709fa0303" },
      duki: { label: "Duki", id: "eaa8da48663b4d04a78d7309305b26f1" },
      lit_killah: { label: "Lit Killah", id: "eab5106dfb044221b17b115c8ef9b408" },
      scooby_doo: { label: "Scooby Doo", id: "7d529b5bf7c84401b96cd7d818478806" },
      shaggy: { label: "Shaggy", id: "23d22379ce5449e19ab044780472c3ec" },
      po: { label: "PO", id: "ec71733475c649389f7e3e0922d3c5c7" },
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
      peppa_pig: { label: "Peppa Pig", id: "782eaf501f1c42ebb37b5182651eb0e1", aliases: ["peppa pig", "peppa", "peppapig"] },
      george_pig: { label: "George Pig", id: "c289294133d04460b431bc9a525e5fb5", aliases: ["george pig", "george", "georgepig"] },
      missa_death_note: { label: "Misa amane", id: "c6aad54044814847aa2e9c272a2b4815", aliases: ["misa amane", "misa", "amane", "missa death note", "death note", "missa"] },
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
      pible: { label: "Pible", id: "f828b14f6d2a4aa18ea77a3cfd1b9c85" },
      town: { label: "Town", id: "e8c7c137434b40adb559d6d4e96fe0bd" },
      aldeano_minecraft: { label: "Aldeano Minecraft", id: "7db6092cb252421ebd11f0f53e25d5d6" },
      woody: { label: "Woody", id: "7a7f36e4f1ae439ab6aee441b4243385" },
      buzz_lightyear: { label: "Buzz Lightyear", id: "fc156f0b530f4e759050f6ff62f61e79" },
      homero_simpson: { label: "Homero Simpson", id: "f7dbe26038174d828b15a64f4da65486" },
      bart_simpson: { label: "Bart Simpson", id: "8c367f956a4c426c8382cf1517d9dea4" },
      milo_j: { label: "Milo J", id: "654b0dfed3f441e7836d09359cef0b44" },
      roro: { label: "Roro", id: "79364023db4647b393510a815dc3545b" },
      lamine_yamal: { label: "Lamine Yamal", id: "211ff667f4c04daf9d6ab0eea75ab18b" },
      homero_chino: { label: "Homero Chino", id: "eebb1c8f7fcd4fa38e492bb313749b8c" },
      chilindrina: { label: "Chilindrina", id: "edac49eb81b04825a6392bea3d437dd1" },
      jh_de_la_cruz: { label: "JH de la cruz", id: "371183b4494d472ab0db172130692eaf" },
      pitbull: { label: "Pitbull", id: "7b642ed31beb4984803824480b5c6c94" },
      dra_polo: { label: "Dra Polo", id: "8a7196cd1adf4bf0b97bb9239d9e5fb1" },
      burro: { label: "Burro", id: "6db58c8873c041ecb043fe18c6bb65c2" },
      bowser: { label: "Bowser", id: "693009f7d6e0455e82aa89c071fed46a" },
      mono_oaxaco: { label: "MonoOaxaco", id: "be48ea4eead9495daaf66e61a7f1517c" },
      holman: { label: "Holman", id: "e68a19e9644d47eb80c9e0b0b96fac8a" },
      arigameplays: { label: "Arigameplays", id: "a7a8e99837144ffbb78a4f5072199426" },

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
    function normalizeVoicePlatform(value){ return String(value || "tiktok").trim().toLowerCase() === "twitch" ? "twitch" : "tiktok"; }
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
        targetImage: normalizeImageSource(item.targetImage || ""),
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
          const ruleId = String(assignment?.ruleId || "");
          if (!ruleId || activeRuleIds.has(ruleId)) next[key] = assignment;
        }
        return next;
      };
      return {
        enabled: Boolean(source.enabled),
        filter: source.filter === "supporters" ? "supporters" : source.filter === "followers" ? "followers" : source.filter === "moderators" ? "moderators" : source.filter === "custom" ? "custom" : "all",
        voiceKey: source.voiceKey in voiceCatalog ? source.voiceKey : "verity",
        fixedDraftVoiceKey: source.fixedDraftVoiceKey in voiceCatalog ? source.fixedDraftVoiceKey : (source.voiceKey in voiceCatalog ? source.voiceKey : "verity"),
        sayDice: Boolean(source.sayDice),
        ignoreEmojis: source.ignoreEmojis !== false,
        ignoreSpecialChars: source.ignoreSpecialChars !== false,
        ignoreStickers: source.ignoreStickers !== false,
        ignoreEmotes: source.ignoreEmotes !== false,
        onlySpanish: source.onlySpanish !== false,
        allowEnye: source.allowEnye !== false,
        singSlashCommand: source.singSlashCommand !== false,
        voiceVolumes: (() => {
          const next = {};
          const store = source.voiceVolumes && typeof source.voiceVolumes === "object" ? source.voiceVolumes : {};
          for (const key of Object.keys(voiceCatalog)) {
            const raw = Number(store?.[key]);
            next[key] = Number.isFinite(raw) ? Math.max(0, Math.min(500, Math.round(raw))) : 100;
          }
          return next;
        })(),
        noReadNames: Boolean(source.noReadNames),
        profanityFilter: source.profanityFilter !== false,
        antiSpamFilter: source.antiSpamFilter !== false,
        activeTab: ["recipients", "rules", "settings", "volumes", "users"].includes(String(source.activeTab || "")) ? String(source.activeTab) : "recipients",
        pendingByUser: pruneAssignments(source.pendingByUser),
        unlockedByUser: pruneAssignments(source.unlockedByUser),
        fixedByUser: (() => {
          const next = {};
          const store = source.fixedByUser && typeof source.fixedByUser === "object" ? source.fixedByUser : {};
          for (const [key, entry] of Object.entries(store)) {
            const platform = normalizeVoicePlatform(entry?.platform || String(key || "").split(":")[0] || "tiktok");
            const username = normalizeUsername(String(key || "").includes(":") ? String(key || "").split(":").slice(1).join(":") : (entry?.username || entry?.displayName || entry?.label || ""));
            const voiceKey = entry?.voiceKey in voiceCatalog ? entry.voiceKey : "verity";
            if (!platform || !username) continue;
            const fixedKey = `${platform}:${username}`;
            next[fixedKey] = {
              username,
              platform,
              displayName: String(entry?.displayName || entry?.username || entry?.label || username).trim() || username,
              voiceKey,
              createdAt: Number(entry?.createdAt || Date.now()),
              updatedAt: Number(entry?.updatedAt || Date.now()),
            };
          }
          return next;
        })(),
        giftByUser: (() => {
          const next = {};
          const store = source.giftByUser && typeof source.giftByUser === "object" ? source.giftByUser : {};
          const activeRuleIds = new Set(Array.isArray(source.rules) ? source.rules.map((rule) => String(rule?.id || "")) : []);
          for (const [key, entry] of Object.entries(store)) {
            const platform = normalizeVoicePlatform(entry?.platform || String(key || "").split(":")[0] || "tiktok");
            const username = normalizeUsername(String(key || "").includes(":") ? String(key || "").split(":").slice(1).join(":") : (entry?.username || entry?.displayName || entry?.label || ""));
            const voiceKey = entry?.voiceKey in voiceCatalog ? entry.voiceKey : "verity";
            const ruleId = String(entry?.ruleId || "").trim();
            if (!platform || !username || !ruleId || !activeRuleIds.has(ruleId)) continue;
            const giftKey = `${platform}:${username}`;
            next[giftKey] = {
              username,
              platform,
              displayName: String(entry?.displayName || entry?.username || entry?.label || username).trim() || username,
              voiceKey,
              kind: String(entry?.kind || "gift") || "gift",
              label: String(entry?.label || entry?.ruleLabel || entry?.targetLabel || "Regla").trim() || "Regla",
              targetKey: String(entry?.targetKey || "").trim(),
              targetLabel: String(entry?.targetLabel || entry?.label || entry?.ruleLabel || "Regla").trim() || "Regla",
              targetImage: normalizeImageSource(entry?.targetImage || ""),
              mode: String(entry?.mode || "unlock").toLowerCase() === "once" ? "once" : "unlock",
              ruleId,
              createdAt: Number(entry?.createdAt || Date.now()),
              updatedAt: Number(entry?.updatedAt || Date.now()),
            };
          }
          return next;
        })(),
        seenEvents: source.seenEvents && typeof source.seenEvents === "object" ? source.seenEvents : {},
        lastMessageByUser: source.lastMessageByUser && typeof source.lastMessageByUser === "object" ? source.lastMessageByUser : {},
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
    function normalizeVoiceVolumeValue(value){
      const n = Number(value);
      if (!Number.isFinite(n)) return 100;
      return Math.max(0, Math.min(500, Math.round(n)));
    }
    function getVoiceVolumePercent(voiceKey){
      const key = voiceKey in voiceCatalog ? voiceKey : "verity";
      return normalizeVoiceVolumeValue(voiceBot.voiceVolumes?.[key] ?? 100);
    }
    function setVoiceVolume(voiceKey, value){
      const key = voiceKey in voiceCatalog ? voiceKey : "verity";
      voiceBot.voiceVolumes = voiceBot.voiceVolumes && typeof voiceBot.voiceVolumes === "object" ? voiceBot.voiceVolumes : {};
      voiceBot.voiceVolumes[key] = normalizeVoiceVolumeValue(value);
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function resetVoiceVolumes(){
      const next = {};
      for (const key of Object.keys(voiceCatalog)) next[key] = 100;
      voiceBot.voiceVolumes = next;
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function voiceVolumeLabel(value){
      return `${normalizeVoiceVolumeValue(value)}%`;
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
    voiceBot.allowEnye ? "ñ activada" : null,
    voiceBot.singSlashCommand ? "usa !s" : null,
    voiceBot.antiSpamFilter ? "sin spam" : null,
    voiceBot.profanityFilter ? "sin groserías" : null,
    voiceBot.noReadNames ? "no decir nombre" : null,
  ].filter(Boolean).join(" · ");
  const fixedCount = Object.keys(voiceBot.fixedByUser || {}).length;
  const volume = getVoiceVolumePercent(voiceBot.voiceKey);
  return `${stateLabel} · ${filterLabel} · Voz: ${voice.label} · Volumen: ${volume}%${fixedCount ? ` · ${fixedCount} voz${fixedCount === 1 ? "" : "es"} fijada${fixedCount === 1 ? "" : "s"}` : ""}${flags ? ` · ${flags}` : ""}`;
}

function voiceBotSummaryHtml(){
  const voice = selectedVoice();
  const chips = [
    { label: voiceBot.enabled ? "Bot encendido" : "Bot apagado", active: true, state: voiceBot.enabled ? "on" : "off" },
    { label: `Voz: ${voice.label}`, active: true, state: "info" },
    { label: `Volumen: ${getVoiceVolumePercent(voiceBot.voiceKey)}%`, active: true, state: "info" },
    { label: `Filtro global: ${voiceFilterLabel(voiceBot.filter)}`, active: true, state: "info" },
    { label: "Decir “dice”", active: voiceBot.sayDice, state: "on" },
    { label: "Sin emojis", active: voiceBot.ignoreEmojis, state: "on" },
    { label: "Sin símbolos", active: voiceBot.ignoreSpecialChars, state: "on" },
    { label: "Sin stickers", active: voiceBot.ignoreStickers, state: "on" },
    { label: "Sin emotes", active: voiceBot.ignoreEmotes, state: "on" },
    { label: "Solo español", active: voiceBot.onlySpanish, state: "on" },
    { label: "Permitir ñ", active: voiceBot.allowEnye, state: "on" },
    { label: "Expresiones", active: voiceBot.singSlashCommand, state: "on" },
    { label: "Sin spam", active: voiceBot.antiSpamFilter, state: "on" },
    { label: "Sin groserías", active: voiceBot.profanityFilter, state: "on" },
    { label: "No decir nombre", active: voiceBot.noReadNames, state: "on" },
  ];
  return chips
    .filter((chip) => chip.active)
    .map((chip) => `<span class="overlayVoiceSummaryChip overlayVoiceSummaryChip--${chip.state}">${esc(chip.label)}</span>`)
    .join("");
}
    function normalizeVoiceFixedEntry(entry, fallbackUsername = ""){
      const platform = normalizeVoicePlatform(entry?.platform || String(fallbackUsername || "").split(":")[0] || "tiktok");
      const username = normalizeUsername(entry?.username || entry?.displayName || entry?.label || fallbackUsername || "");
      if (!username) return null;
      const voiceKey = entry?.voiceKey in voiceCatalog ? entry.voiceKey : "verity";
      const source = String(entry?.source || "manual").toLowerCase() === "roulette" ? "roulette" : "manual";
      return {
        platform,
        username,
        displayName: String(entry?.displayName || entry?.label || username).trim() || username,
        voiceKey,
        voiceLabel: String(entry?.voiceLabel || entry?.label || voiceCatalog[voiceKey]?.label || voiceKey).trim(),
        source,
        sourceLabel: source === "roulette" ? "Ruleta" : "Manual",
        comment: String(entry?.comment || "").trim(),
        winnerKey: String(entry?.winnerKey || "").trim(),
        createdAt: Number(entry?.createdAt || Date.now()),
        updatedAt: Number(entry?.updatedAt || Date.now()),
        commentAt: Number(entry?.commentAt || 0) || 0,
        autoAssigned: Boolean(entry?.autoAssigned),
      };
    }
    function voiceFixedItemKey(item){
      return `${normalizeVoicePlatform(item?.platform || "tiktok")}:${normalizeUsername(item?.uniqueId || item?.username || item?.user || "")}`;
    }
    function voiceFixedStore(){
      const store = voiceBot.fixedByUser && typeof voiceBot.fixedByUser === "object" ? voiceBot.fixedByUser : {};
      const next = {};
      for (const [key, entry] of Object.entries(store)) {
        const normalized = normalizeVoiceFixedEntry(entry, key);
        if (!normalized) continue;
        next[`${normalized.platform}:${normalized.username}`] = normalized;
      }
      voiceBot.fixedByUser = next;
      return next;
    }

    function syncVoiceFixedUsersFromServer(sharedUsers = []) {
      const current = voiceFixedStore();
      for (const [key, entry] of Object.entries(current)) {
        if (entry?.source === "roulette") delete current[key];
      }
      for (const entry of Array.isArray(sharedUsers) ? sharedUsers : []) {
        const normalized = normalizeVoiceFixedEntry({ ...entry, source: entry?.source || "roulette" }, `${entry?.platform || "tiktok"}:${entry?.username || entry?.displayName || entry?.label || ""}`);
        if (!normalized) continue;
        current[`${normalized.platform}:${normalized.username}`] = normalized;
      }
      voiceBot.fixedByUser = current;
      saveVoiceBot();
      return current;
    }
    function hasFixedVoiceAssignment(item){
      const key = voiceFixedItemKey(item);
      return Boolean(key && voiceBot.fixedByUser?.[key]);
    }
    function getFixedVoiceAssignment(item){
      const key = voiceFixedItemKey(item);
      if (!key) return null;
      const entry = voiceBot.fixedByUser?.[key];
      if (!entry) return null;
      const normalized = normalizeVoiceFixedEntry(entry, key);
      return normalized ? { ...normalized, key } : null;
    }
    function setVoiceFixedAssignment(platform, username, voiceKey, source = "manual"){
      const normalizedPlatform = normalizeVoicePlatform(platform);
      const normalizedUsername = normalizeUsername(username);
      const normalizedVoice = voiceKey in voiceCatalog ? voiceKey : "verity";
      if (!normalizedUsername) return null;
      voiceBot.fixedByUser = voiceBot.fixedByUser && typeof voiceBot.fixedByUser === "object" ? voiceBot.fixedByUser : {};
      const key = `${normalizedPlatform}:${normalizedUsername}`;
      const previous = voiceBot.fixedByUser[key];
      voiceBot.fixedByUser[key] = {
        username: normalizedUsername,
        platform: normalizedPlatform,
        displayName: previous?.displayName || normalizedUsername,
        voiceKey: normalizedVoice,
        voiceLabel: voiceCatalog[normalizedVoice]?.label || normalizedVoice,
        source: String(source || "manual").toLowerCase() === "roulette" ? "roulette" : "manual",
        sourceLabel: String(source || "manual").toLowerCase() === "roulette" ? "Ruleta" : "Manual",
        createdAt: Number(previous?.createdAt || Date.now()),
        updatedAt: Date.now(),
      };
      saveVoiceBot();
      try {
        socket.emit("voiceFixedUsers:upsert", voiceBot.fixedByUser[key]);
      } catch (err) {
        console.warn("No se pudo sincronizar la voz fija.", err);
      }
      return voiceBot.fixedByUser[key];
    }
    function removeVoiceFixedAssignment(platform, username){
      const key = `${normalizeVoicePlatform(platform)}:${normalizeUsername(username)}`;
      if (!key) return;
      const existing = voiceBot.fixedByUser?.[key];
      if (voiceBot.fixedByUser?.[key]) {
        delete voiceBot.fixedByUser[key];
        saveVoiceBot();
      }
      if (existing) {
        try {
          socket.emit("voiceFixedUsers:delete", existing);
        } catch (err) {
          console.warn("No se pudo eliminar la voz sincronizada.", err);
        }
      }
    }
    function normalizeVoiceGiftEntry(entry, fallbackUsername = ""){
      const platform = normalizeVoicePlatform(entry?.platform || String(fallbackUsername || "").split(":")[0] || "tiktok");
      const username = normalizeUsername(entry?.username || entry?.displayName || entry?.label || fallbackUsername || "");
      if (!username) return null;
      const voiceKey = entry?.voiceKey in voiceCatalog ? entry.voiceKey : "verity";
      const ruleId = String(entry?.ruleId || "").trim();
      if (!ruleId) return null;
      return {
        username,
        platform,
        displayName: String(entry?.displayName || entry?.label || username).trim() || username,
        voiceKey,
        kind: String(entry?.kind || "gift") || "gift",
        label: String(entry?.label || entry?.ruleLabel || entry?.targetLabel || "Regla").trim() || "Regla",
        targetKey: String(entry?.targetKey || entry?.giftKey || "").trim(),
        targetLabel: String(entry?.targetLabel || entry?.label || entry?.ruleLabel || "Regla").trim() || "Regla",
        targetImage: normalizeImageSource(entry?.targetImage || entry?.giftImage || ""),
        giftKey: String(entry?.giftKey || entry?.targetKey || "").trim(),
        giftId: String(entry?.giftId || "").trim(),
        giftName: String(entry?.giftName || entry?.label || entry?.ruleLabel || entry?.targetLabel || "Regalo").trim() || "Regalo",
        giftImage: normalizeImageSource(entry?.giftImage || ""),
        mode: String(entry?.mode || "unlock").toLowerCase() === "once" ? "once" : "unlock",
        ruleId,
        createdAt: Number(entry?.createdAt || Date.now()),
        updatedAt: Number(entry?.updatedAt || Date.now()),
      };
    }
    function giftVoiceItemKey(item){
      return `${normalizeVoicePlatform(item?.platform || "tiktok")}:${normalizeUsername(item?.uniqueId || item?.username || item?.user || item?.displayName || "")}`;
    }
    function giftVoiceStore(){
      const store = voiceBot.giftByUser && typeof voiceBot.giftByUser === "object" ? voiceBot.giftByUser : {};
      const next = {};
      for (const [key, entry] of Object.entries(store)) {
        const normalized = normalizeVoiceGiftEntry(entry, key);
        if (!normalized) continue;
        next[`${normalized.platform}:${normalized.username}`] = normalized;
      }
      voiceBot.giftByUser = next;
      return next;
    }
    function getGiftVoiceAssignment(item){
      const key = giftVoiceItemKey(item);
      if (!key) return null;
      if (voiceBot.fixedByUser?.[key]) return null;
      const entry = giftVoiceStore()[key];
      if (!entry) return null;
      const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
      if (!entry.ruleId || !activeRuleIds.has(String(entry.ruleId))) return null;
      return { ...entry, key };
    }
    function setGiftVoiceAssignment(item, assignment){
      const key = giftVoiceItemKey(item);
      if (!key || !assignment) return null;
      const normalized = normalizeVoiceGiftEntry({
        username: item?.uniqueId || item?.username || item?.user || item?.displayName || key,
        displayName: item?.displayName || item?.user || item?.username || item?.uniqueId || key,
        platform: item?.platform || assignment?.platform || "tiktok",
        voiceKey: assignment.voiceKey,
        kind: assignment.kind || "gift",
        label: assignment.ruleLabel || assignment.targetLabel || "Regla",
        targetKey: assignment.targetKey || assignment.targetLabel || "",
        targetLabel: assignment.targetLabel || assignment.ruleLabel || "Regla",
        targetImage: assignment.targetImage || "",
        giftKey: assignment.giftKey || assignment.targetKey || assignment.targetLabel || "",
        giftId: assignment.giftId || "",
        giftName: assignment.giftName || assignment.ruleLabel || assignment.targetLabel || "Regalo",
        giftImage: assignment.giftImage || "",
        mode: assignment.mode || "unlock",
        ruleId: assignment.ruleId || "",
        createdAt: assignment.createdAt || Date.now(),
        updatedAt: assignment.updatedAt || Date.now(),
      }, key);
      if (!normalized) return null;
      voiceBot.giftByUser = voiceBot.giftByUser && typeof voiceBot.giftByUser === "object" ? voiceBot.giftByUser : {};
      voiceBot.giftByUser[key] = normalized;
      saveVoiceBot();
      return normalized;
    }
    function voiceKnownUserCandidates(query = "", platform = "tiktok"){
      const q = normalizeMatchKey(query);
      const targetPlatform = normalizeVoicePlatform(platform);
      const seen = new Map();
      const add = (value, label = "", sourcePlatform = targetPlatform, source = "") => {
        const username = normalizeUsername(value);
        if (!username) return;
        const p = normalizeVoicePlatform(sourcePlatform);
        const key = `${p}:${username}`;
        const existing = seen.get(key) || { username, label: label || username, platform: p, sources: new Set() };
        if (label && (!existing.label || String(label).length < String(existing.label).length)) existing.label = label;
        if (sourcePlatform) existing.platform = p;
        if (source) existing.sources.add(source);
        seen.set(key, existing);
      };
      for (const item of [...(state.chat || []), ...(state.events || []), ...(state.gifts || [])]) {
        add(item?.uniqueId || item?.username || item?.user || item?.displayName, item?.displayName || item?.user || item?.username || "", item?.platform || targetPlatform, "feed");
      }
      for (const [platformKey, entries] of Object.entries(state.supporters || {})) {
        for (const [username] of Object.entries(entries || {})) add(username, username, platformKey, "supporter");
      }
      for (const [platformKey, entries] of Object.entries(state.activityBadges || {})) {
        for (const [username, entry] of Object.entries(entries || {})) add(username, entry?.displayName || username, platformKey, "activity");
      }
      for (const [key, entry] of Object.entries(voiceBot.fixedByUser || {})) {
        add(entry?.username || String(key || "").split(":").slice(1).join(":"), entry?.displayName || entry?.username || key, entry?.platform || String(key || "").split(":")[0] || targetPlatform, "fixed");
      }
      return [...seen.values()].map((item) => ({
        username: item.username,
        label: item.label || item.username,
        platform: item.platform || targetPlatform,
        score: (() => {
          const n = normalizeMatchKey(item.username);
          const l = normalizeMatchKey(item.label);
          if (!q) return 0;
          if (n === q || l === q) return 0;
          if (n.startsWith(q) || l.startsWith(q)) return 1;
          if (n.includes(q) || l.includes(q)) return 2;
          return 3;
        })(),
      })).filter((item) => !q || normalizeMatchKey(item.username).includes(q) || normalizeMatchKey(item.label).includes(q))
        .sort((a, b) => a.score - b.score || a.username.localeCompare(b.username, "es"))
        .slice(0, 30);
    }
    function renderVoiceFixedSuggestions(){
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const platformSelect = document.getElementById("overlayVoicePinnedPlatformSelect");
      const list = document.getElementById("overlayVoicePinnedSuggestions");
      const helper = document.getElementById("overlayVoicePinnedSummary");
      if (!list) return;
      const platform = normalizeVoicePlatform(platformSelect?.value || "tiktok");
      const candidates = voiceKnownUserCandidates(input?.value || "", platform);
      list.innerHTML = candidates.map((item) => `<option value="${esc(item.username)}">${esc(item.label)} · ${esc(item.platform === "twitch" ? "Twitch" : "TikTok")}</option>`).join("");
      if (helper) {
        helper.innerHTML = candidates.length
          ? candidates.slice(0, 8).map((item) => `<button type="button" class="overlayVoicePinnedSuggestion ${voiceBot.fixedByUser?.[`${item.platform}:${item.username}`] ? 'is-muted' : ''}" data-voice-user-fill="${esc(item.username)}" data-voice-user-platform="${esc(item.platform)}"><span>${esc(item.label)}</span><small>${esc(item.platform === "twitch" ? "Twitch" : "TikTok")} · @${esc(item.username)}</small></button>`).join("")
          : `<div class="overlayVoiceHelp">Empieza a escribir y aparecerán usuarios conocidos para autocompletar.</div>`;
      }
    }
    function renderVoiceFixedUsers(){
      const rail = document.getElementById("overlayVoicePinnedList");
      if (!rail) return;
      const entries = Object.values(voiceFixedStore()).sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
      if (!entries.length) {
        rail.innerHTML = `<div class="overlayVoiceHelp">Todavía no hay reglas aplicadas.</div>`;
        return;
      }
      rail.innerHTML = entries.map((entry) => {
        const voice = voiceCatalog[entry.voiceKey] || voiceCatalog.verity;
        const platformLabel = entry.platform === "twitch" ? "Twitch" : "TikTok";
        return `<article class="overlayVoicePinnedCard"><div class="overlayVoicePinnedCardMain"><strong>${esc(entry.displayName || entry.username)}</strong><span>${esc(platformLabel)} · @${esc(entry.username)}</span><span class="overlayVoicePinnedCardMeta">🤖 ${esc(voice.label)} · Activo</span><span class="overlayVoicePinnedCardMeta">La voz global no afecta a este usuario.</span></div><div class="overlayVoicePinnedCardActions"><button type="button" class="overlayVoicePinnedIconBtn" data-voice-fixed-delete="${esc(entry.platform)}" data-voice-fixed-user="${esc(entry.username)}" aria-label="Eliminar voz fija">🗑️</button></div></article>`;
      }).join("");
    }

    function renderVoiceVolumePanel(){
      const grid = document.getElementById("overlayVoiceVolumeGrid");
      if (!grid) return;
      const entries = Object.entries(voiceCatalog).sort((a, b) => a[1].label.localeCompare(b[1].label, "es"));
      if (!entries.length) {
        grid.innerHTML = `<div class="overlayVoiceHelp">No hay voces cargadas.</div>`;
        return;
      }
      grid.innerHTML = entries.map(([key, voice]) => {
        const volume = getVoiceVolumePercent(key);
        const hint = volume === 0 ? "Silenciada" : volume < 100 ? "Más baja" : volume > 100 ? "Amplificada" : "Normal";
        return `<article class="overlayVoiceVolumeCard" data-voice-volume-card="${esc(key)}"><div class="overlayVoiceVolumeHead"><div><strong>${esc(voice.label)}</strong><span>${esc(voice.id)}</span></div><strong>${esc(volume)}%</strong></div><input class="overlayVoiceVolumeRange" type="range" min="0" max="500" step="5" value="${esc(volume)}" data-voice-volume-slider="${esc(key)}" aria-label="Volumen de ${esc(voice.label)}" /><div class="overlayVoiceVolumeMeta"><span>${esc(hint)}</span><span>${esc(volume === 500 ? "Máximo" : volume === 0 ? "Mute" : `${volume}%`)}</span></div><div class="overlayVoiceVolumeActions"><button type="button" data-voice-volume-set="${esc(key)}" data-volume="80">80%</button><button type="button" data-voice-volume-set="${esc(key)}" data-volume="100">100%</button><button type="button" data-voice-volume-set="${esc(key)}" data-volume="120">120%</button><button type="button" data-voice-volume-set="${esc(key)}" data-volume="200">200%</button></div></article>`;
      }).join("");
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
    function voiceUserKey(item){ return normalizeUsername(item?.uniqueId || item?.user || item?.displayName || item?.username || ""); }
    function voiceRuleItemKey(item){ return `${normalizeVoicePlatform(item?.platform || "tiktok")}:${normalizeUsername(item?.uniqueId || item?.username || item?.user || item?.displayName || "")}`; }
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
    function voiceAssignmentPriority(kind){
      const normalized = String(kind || "").toLowerCase();
      if (normalized === "gift") return 3;
      if (normalized === "event") return 2;
      if (normalized === "role" || normalized === "bits") return 1;
      return 0;
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
      const gift = lookupGiftCatalog(item?.gift || item?.giftName || item?.giftAlt || item?.giftId || assignment?.giftName || assignment?.targetLabel || assignment?.ruleLabel || "");
      const giftImage = normalizeImageSource(item?.giftImage || item?.gift?.image || item?.gift?.url || gift?.image || assignment?.targetImage || "");
      const giftKey = normalizeMatchKey(gift?.key || item?.giftId || item?.gift || item?.giftName || item?.giftAlt || assignment?.giftKey || assignment?.targetKey || assignment?.targetLabel || assignment?.ruleLabel || "");
      const giftId = String(gift?.id || item?.giftId || assignment?.giftId || "").trim();
      const giftName = String(gift?.name || gift?.alt || item?.gift || item?.giftName || item?.giftAlt || assignment?.targetLabel || assignment?.ruleLabel || "").trim() || "Regalo";
      const eventEmoji = voiceEventBadgeEmoji(item);
      for (const key of keys) {
        const bucket = ensureActivityBucket(platform, key);
        if (eventEmoji) bucket.badges[eventEmoji] = true;
        if (giftImage || String(item?.type || "").toLowerCase() === "gift" || String(assignment?.kind || "") === "gift") {
          bucket.lastGift = { image: giftImage, name: giftName, key: giftKey, id: giftId, updatedAt: now, ruleId: assignment?.ruleId || "" };
        }
        if (assignment) {
          const nextVoice = {
            voiceKey: assignment.voiceKey in voiceCatalog ? assignment.voiceKey : "verity",
            mode: assignment.mode || "unlock",
            kind: assignment.kind || "gift",
            label: assignment.ruleLabel || assignment.targetLabel || "Regla",
            targetKey: normalizeMatchKey(assignment.targetKey || assignment.targetLabel || giftName || ""),
            targetLabel: assignment.targetLabel || assignment.ruleLabel || giftName || "Regla",
            targetImage: assignment.targetImage || giftImage || "",
            giftKey: assignment.giftKey || giftKey || normalizeMatchKey(assignment.targetKey || assignment.targetLabel || ""),
            giftId: assignment.giftId || giftId || "",
            giftName: assignment.giftName || giftName,
            giftImage: assignment.giftImage || giftImage || "",
            updatedAt: now,
            ruleId: assignment.ruleId || "",
          };
          const currentVoice = bucket.voice && typeof bucket.voice === "object" ? bucket.voice : null;
          const currentPriority = voiceAssignmentPriority(currentVoice?.kind);
          const nextPriority = voiceAssignmentPriority(nextVoice.kind);
          if (!currentVoice || nextPriority >= currentPriority) {
            bucket.voice = nextVoice;
          }
          if (String(nextVoice.kind || "").toLowerCase() === "gift") {
            setGiftVoiceAssignment(item, {
              ...nextVoice,
              platform,
              displayName: bucket.displayName || item?.displayName || item?.user || item?.username || item?.uniqueId || "Usuario",
            });
          }
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
  return stripDiacriticsPreservingEnye(text)
    .toLowerCase()
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

function stripDiacriticsPreservingEnye(value){
  const raw = String(value ?? "");
  if (!raw) return "";
  const lower = "__STREAMFUSION_ENYE_LOWER__";
  const upper = "__STREAMFUSION_ENYE_UPPER__";
  return raw
    .replace(/ñ/g, lower)
    .replace(/Ñ/g, upper)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(new RegExp(lower, "g"), "ñ")
    .replace(new RegExp(upper, "g"), "Ñ");
}
function buildProfanityFilterRegex(){
  const badWords = [
    "mierda",
    "mierdas",
    "mierdero",
    "mierderos",
    "mierdoso",
    "mierdosa",
    "mierd",
    "mrd",
    "mierda seca",
    "puta",
    "puta madre",
    "puto",
    "putos",
    "putas",
    "putísima",
    "putisima",
    "cabron",
    "cabrona",
    "cabrones",
    "cabronazo",
    "cabroncete",
    "coño",
    "cojon",
    "cojones",
    "coñazo",
    "coñito",
    "joder",
    "jodido",
    "jodida",
    "jodón",
    "jodona",
    "chingar",
    "chingada",
    "chingado",
    "chingón",
    "chingona",
    "pendejo",
    "pendeja",
    "pendejazo",
    "pendejita",
    "mariquita",
    "marikita",
    "mariqta",
    "marica",
    "mariko",
    "marico",
    "maricon",
    "maricón",
    "marikon",
    "marikón",
    "marik",
    "maric",
    "marikhon",
    "mari khon",
    "maric hon",
    "mari con",
    "gay",
    "gey",
    "gei",
    "gai",
    "ghey",
    "ghei",
    "cachar",
    "kachar",
    "ca char",
    "ka char",
    "ca-char",
    "ka-char",
    "cchar",
    "kchar",
    "ch char",
    "ch-char",
    "verga",
    "vergon",
    "vergón",
    "culo",
    "culero",
    "culera",
    "cagar",
    "cagada",
    "cagon",
    "cagón",
    "imbecil",
    "imbécil",
    "idiota",
    "gilipollas",
    "hijo de puta",
    "hijodeputa",
    "hijoputa",
    "hdp",
    "hp",
    "mrd",
    "pn",
    "phenhe",
    "violar",
    "zhemen",
    "cmen",
    "zemen",
    "semen",
    "maricon",
    "maricón",
    "marica",
    "putero",
    "mamon",
    "mamón",
    "estupido",
    "estúpido",
    "tarado",
    "subnormal",
    "mongol",
    "boludo",
    "boluda",
    "pelotudo",
    "pelotuda",
    "zorra",
    "perra",
    "bitch",
    "fuck",
    "shit",
    "asshole",
    "coji",
    "cojí",
    "cojer",
    "coger",
    "cogi",
    "cogí",
    "cogida",
    "cogido",
    "cogeme",
    "cógeme",
    "teta",
    "tetas",
    "vagina",
    "vaginas",
    "pene",
    "penetrar",
    "penetracion",
    "penetración",
    "sexo",
    "sexual"
,
    'byolar',
    'b.iolar',
    'b yolar',
    'bhyolar',
    'b-yolar',
    'b_yolar',
    'b y o l a r',
    'b.y.o.l.a.r',
    'violar',
    'biolar',
    'v i o l a r',
    'v.i.o.l.a.r',
    'v-yolar',
    'v_yolar',
    'vhyolar',
    'coji',
    'cojí',
    'cojer',
    'cojerse',
    'cojiendo',
    'cojido',
    'cojida',
    'cojan',
    'cojas',
    'cojo',
    'coja',
    'cogi',
    'cogí',
    'coger',
    'cogerse',
    'cogiendo',
    'cogido',
    'cogida',
    'cogeme',
    'cógeme',
    'kche',
    'kches',
    'kchar',
    'kchao',
    'kcharse',
    'kchando',
    'kchado',
    'kchada',
    'cchar',
    'cchao',
    'ccharse',
    'chchar',
      'carajo',
    'carajos',
    'carajito',
    'carajita',
    'carajazo',
    'carajear',
    'chingada madre',
    'chingadamadre',
    'chingadazo',
    'chingadera',
    'chingaderas',
    'chingón',
    'chingona',
    'chingon',
    'chingar',
    'chingue',
    'chingues',
    'chinga',
    'chingas',
    'chingado',
    'chingada',
    'chingados',
    'chingadas',
    'no mames',
    'nomames',
    'mames',
    'mamada',
    'mamadas',
    'mamon',
    'mamón',
    'mamona',
    'mamones',
    'pinche',
    'pinches',
    'pinchi',
    'pinchis',
    'pinche wey',
    'pinchewey',
    'pinche pendejo',
    'pinchependejo',
    'putamadre',
    'puta madre',
    'putazo',
    'putazos',
    'putiza',
    'putizas',
    'putear',
    'puteando',
    'puteo',
    'putero',
    'putera',
    'putón',
    'putona',
    'putones',
    'putonas',
    'putísimo',
    'putisima',
    'putisimo',
    'cabrón',
    'cabrona',
    'cabrones',
    'cabronazo',
    'cabronazos',
    'cabronería',
    'cabroneria',
    'cabronear',
    'cabrón de mierda',
    'cabron de mierda',
    'pendejo',
    'pendeja',
    'pendejos',
    'pendejas',
    'pendejez',
    'pendejada',
    'pendejadas',
    'pendejear',
    'pendejito',
    'pendejita',
    'pendejazo',
    'pendejazos',
    'culero',
    'culera',
    'culeros',
    'culeras',
    'culiado',
    'culiada',
    'culiaos',
    'culiadas',
    'culiao',
    'culiar',
    'culiando',
    'culiadito',
    'culiadita',
    'culo',
    'culos',
    'culote',
    'culotes',
    'culón',
    'culona',
    'verga',
    'vergas',
    'vergazo',
    'vergazos',
    'vergota',
    'vergotas',
    'vergudo',
    'verguero',
    'verguera',
    'vergüenza',
    'vale verga',
    'valeverga',
    'me vale verga',
    'mevaleverga',
    'a la verga',
    'alaverga',
    'pinga',
    'pingazo',
    'pingazos',
    'pingón',
    'pingona',
    'pito',
    'pitos',
    'pichula',
    'pichulazo',
    'pichulear',
    'pija',
    'pijas',
    'pijazo',
    'pijazos',
    'pijudo',
    'pijuda',
    'concha',
    'conchudo',
    'conchuda',
    'conchudos',
    'conchudas',
    'conchatumadre',
    'conchetumadre',
    'conchetumare',
    'conchesumadre',
    'conchasumadre',
    'concha de tu madre',
    'conchadetumadre',
    'chucha',
    'chuchamadre',
    'chucha madre',
    'chuchatumadre',
    'chuchetumadre',
    'chuchetu madre',
    'chucha tu madre',
    'gonorrea',
    'gonorreas',
    'gonorreo',
    'gonorrea hijueputa',
    'pirobo',
    'piroba',
    'pirobo hijueputa',
    'malparido',
    'malparida',
    'malparidos',
    'malparidas',
    'malparición',
    'malparicion',
    'hijueputa',
    'hijueputas',
    'hijueputada',
    'hijoputa',
    'hijos de puta',
    'hijodeputa',
    'hijo de puta',
    'hijuepucha',
    'maricón',
    'maricon',
    'marica',
    'marico',
    'maricas',
    'maricos',
    'maricona',
    'mariconazo',
    'mariconazos',
    'marikón',
    'marikon',
    'mariko',
    'marik',
    'mariquita',
    'marikita',
    'mariqta',
    'boludo',
    'boluda',
    'boludos',
    'boludas',
    'pelotudo',
    'pelotuda',
    'pelotudos',
    'pelotudas',
    'pelotudez',
    'pelotudear',
    'forro',
    'forra',
    'forros',
    'forras',
    'orto',
    'ortudo',
    'ortuda',
    'ortear',
    'la puta que te parió',
    'la puta que te pario',
    'weon',
    'weona',
    'weones',
    'weonas',
    'weón',
    'weónazo',
    'weonazo',
    'webon',
    'webona',
    'webones',
    'webonazo',
    'huevon',
    'huevón',
    'huevona',
    'huevones',
    'huevada',
    'huevadas',
    'huevonazo',
    'huevonazos',
    'huevear',
    'hueveando',
    'hueveo',
    'joder',
    'jodido',
    'jodida',
    'jodidos',
    'jodidas',
    'jodete',
    'jodanse',
    'jódete',
    'no jodas',
    'nojodas',
    'jodón',
    'jodona',
    'jodones',
    'mierda',
    'mierdas',
    'mierdero',
    'mierdera',
    'mierderos',
    'mierderas',
    'mierdoso',
    'mierdosa',
    'mierdón',
    'mierdon',
    'mierdazo',
    'mierdazos',
    'mierdada',
    'mierdadas',
    'mierd4',
    'mi3rda',
    'm1erda',
    'm13rda',
    'mierdha',
    'mrd',
    'mrdas',
    'mrdazo',
    'cagada',
    'cagadas',
    'cagado',
    'cagón',
    'cagona',
    'cagones',
    'cagonas',
    'cagar',
    'cagarse',
    'cagando',
    'cago',
    'cague',
    'cagues',
    'cagón de mierda',
    'cagon de mierda',
    'pajero',
    'pajera',
    'pajeros',
    'pajeras',
    'pajazo',
    'pajazos',
    'pajear',
    'pajeando',
    'pajeo',
    'pajas',
    'pajita',
    'pajitas',
    'idiota',
    'idiotas',
    'imbecil',
    'imbécil',
    'imbeciles',
    'imbéciles',
    'estupido',
    'estúpido',
    'estupida',
    'estúpida',
    'estupidos',
    'estúpidos',
    'tarado',
    'tarada',
    'tarados',
    'taradas',
    'baboso',
    'babosa',
    'babosos',
    'babosas',
            'bruto',
    'bruta',
    'brutos',
    'brutas',
    'zoquete',
    'zoquetes',
    'majadero',
    'majadera',
    'menso',
    'mensa',
    'mensos',
    'mensas',
    'sonso',
    'sonsa',
    'zorra',
    'zorras',
    'perra',
    'perras',
    'perra maldita',
    'perramaldita',
    'maldita',
    'maldito',
    'malditos',
    'malditas',
    'desgraciado',
    'desgraciada',
    'desgraciados',
    'desgraciadas',
    'bastardo',
    'bastarda',
    'bastardos',
    'bastardas',
    'ctm',
    'ctmr',
    'ctmre',
    'csm',
    'csmr',
    'csmre',
    'tmr',
    'ptm',
    'ptmr',
    'pta',
    'qlo',
    'qliao',
    'qlia',
    'hdp',
    'hp',
    'hpt',
    'hpta',
    'nmm',
    'nmms',
    'ntp'  ];
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
  let out = stripDiacriticsPreservingEnye(source);
  out = out.replace(VOICE_PROFANITY_RE, " ");
  out = out.replace(/\s+/g, " ").trim();
  return out;
}
function voiceTokenLooksGibberish(token){
  const rawToken = String(token || "").trim().toLowerCase();
  if (["y", "a", "o", "e", "u"].includes(rawToken)) return false;
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
  const preserveEnye = voiceBot.allowEnye !== false || voiceBot.onlySpanish !== false || /[ñÑ]/.test(out);
  out = preserveEnye ? stripDiacriticsPreservingEnye(out) : out.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  out = out.replace(/https?:\/\/\S+/gi, " ");
  out = out.replace(/[\u200B-\u200D\uFEFF]/g, " ");
  if (voiceBot.ignoreStickers) out = out.replace(/\b(sticker|stickers|stkr|gift sticker)\b/gi, " ");
  if (voiceBot.ignoreEmojis) out = stripEmojiText(out);
  if (isName) {
    out = out.replace(/[^\p{L}\p{N}\s]/gu, " ");
  } else {
    if (voiceBot.ignoreSpecialChars) out = out.replace(/[\p{S}\p{P}]/gu, " ");
    if (voiceBot.onlySpanish || voiceBot.allowEnye) out = out.replace(/[^\p{Script=Latin}\p{N}\sÁÉÍÓÚÜÑáéíóúüñ]/gu, " ");
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
function voiceDuplicateSignature(text, markers = []){
  const prefix = Array.isArray(markers) ? markers.filter(Boolean).join(" ") : "";
  return `${prefix} ${String(text || "")}`.toLowerCase().replace(/\s+/g, " ").trim();
}
function parseVoiceSlashCommand(text){
  const raw = String(text || "").trimStart();
  if (!voiceBot.singSlashCommand) return { text: raw, emotion: "", markers: [], used: false };
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return { text: "", emotion: "", markers: [], used: false };
  const markers = [];
  const remaining = [];
  let emotion = "";
  const commandSpecForToken = (token) => {
    const tokenText = String(token || "").trim();
    if (!tokenText) return null;
    const trimmed = tokenText.replace(/[.,;:!?]+$/g, "");
    let match = trimmed.match(/^([!/])([sawglecpb])$/i);
    if (match) return voiceExpressionCatalog[match[2].toLowerCase()] || null;
    match = trimmed.match(/^\[([a-z]+)\]$/i);
    if (match) {
      const legacyMap = {
        singing: "s",
        angry: "a",
        whispering: "w",
        laughing: "g",
        excited: "e",
        crying: "c",
        pause: "p",
        break: "b",
      };
      const key = legacyMap[match[1].toLowerCase()];
      return key ? (voiceExpressionCatalog[key] || null) : null;
    }
    return null;
  };
  let consuming = true;
  for (const token of tokens) {
    const spec = consuming ? commandSpecForToken(token) : null;
    if (spec) {
      if (!emotion && spec.emotion) emotion = spec.emotion;
      if (!markers.includes(spec.marker)) markers.push(spec.marker);
      continue;
    }
    consuming = false;
    remaining.push(token);
  }
  const cleanText = remaining.join(" ").replace(/\s+/g, " ").trim();
  return { text: cleanText, emotion, markers, used: markers.length > 0 };
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
  const key = voiceRuleItemKey(item);
  return Boolean(key && resolveVoiceAssignment(item));
}

function resolveGiftActivityVoiceAssignment(item){
  const key = voiceRuleItemKey(item);
  if (!key) return null;
  if (voiceBot.fixedByUser?.[key]) return null;
  const entry = voiceActivityEntry(item);
  const platform = String(item?.platform || "tiktok").toLowerCase();
  const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
  const isValidAssignment = (assignment) => {
    if (!assignment) return false;
    const ruleId = String(assignment.ruleId || "");
    return Boolean(ruleId && activeRuleIds.has(ruleId));
  };

  const storedVoice = isValidAssignment(entry?.voice) ? entry.voice : null;
  if (storedVoice && String(storedVoice.kind || "").toLowerCase() === "gift") {
    return {
      voiceKey: storedVoice.voiceKey in voiceCatalog ? storedVoice.voiceKey : "verity",
      mode: storedVoice.mode || "unlock",
      ruleId: storedVoice.ruleId || "",
      ruleLabel: storedVoice.label || storedVoice.ruleLabel || storedVoice.targetLabel || "Regla",
      targetKey: storedVoice.targetKey || "",
      targetLabel: storedVoice.targetLabel || storedVoice.label || storedVoice.ruleLabel || "Regla",
      targetImage: storedVoice.targetImage || "",
      platform: storedVoice.platform || platform,
      kind: storedVoice.kind || "gift",
      triggerAt: Number(storedVoice.updatedAt || entry?.lastGift?.updatedAt || Date.now()),
      manual: false,
      source: "activity",
    };
  }

  const lastGift = entry?.lastGift;
  if (!lastGift) return null;
  if (lastGift.ruleId && activeRuleIds.has(String(lastGift.ruleId || ""))) {
    const directRule = resolveVoiceRuleList().find((rule) => String(rule.id || "") === String(lastGift.ruleId || ""));
    if (directRule) {
      return {
        voiceKey: directRule.voiceKey in voiceCatalog ? directRule.voiceKey : "verity",
        mode: directRule.mode,
        ruleId: directRule.id,
        ruleLabel: directRule.targetLabel || directRule.targetKey || lastGift.name || "Regla",
        targetKey: directRule.targetKey || directRule.targetLabel || lastGift.name || "",
        targetLabel: directRule.targetLabel || directRule.targetKey || lastGift.name || "Regla",
        targetImage: directRule.targetImage || lastGift.image || "",
        platform: directRule.platform || platform,
        kind: directRule.kind || "gift",
        triggerAt: Number(lastGift.updatedAt || Date.now()),
        manual: false,
        source: "activity",
      };
    }
  }

  const syntheticGiftItem = {
    platform,
    type: "gift",
    group: "gift",
    gift: String(lastGift.name || "").trim(),
    giftName: String(lastGift.name || "").trim(),
    giftAlt: String(lastGift.name || "").trim(),
    giftId: String(lastGift.id || lastGift.giftId || "").trim(),
    giftImage: String(lastGift.image || "").trim(),
  };
  const rule = findMatchingVoiceRule(syntheticGiftItem);
  if (!rule) return null;
  if (!rule.id || !activeRuleIds.has(String(rule.id || ""))) return null;
  return {
    voiceKey: rule.voiceKey in voiceCatalog ? rule.voiceKey : "verity",
    mode: rule.mode,
    ruleId: rule.id,
    ruleLabel: rule.targetLabel || rule.targetKey || syntheticGiftItem.giftName || "Regla",
    targetKey: rule.targetKey || rule.targetLabel || syntheticGiftItem.giftName || "",
    targetLabel: rule.targetLabel || rule.targetKey || syntheticGiftItem.giftName || "Regla",
    targetImage: rule.targetImage || syntheticGiftItem.giftImage || "",
    platform: rule.platform || platform,
    kind: rule.kind || "gift",
    triggerAt: Number(lastGift.updatedAt || Date.now()),
    manual: false,
    source: "activity",
  };
}
function resolveEventActivityVoiceAssignment(item){
  const key = voiceRuleItemKey(item);
  if (!key) return null;
  if (voiceBot.fixedByUser?.[key]) return null;
  const entry = voiceActivityEntry(item);
  const platform = String(item?.platform || "tiktok").toLowerCase();
  const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
  const isValidAssignment = (assignment) => {
    if (!assignment) return false;
    const ruleId = String(assignment.ruleId || "");
    return Boolean(ruleId && activeRuleIds.has(ruleId));
  };
  const storedVoice = isValidAssignment(entry?.voice) ? entry.voice : null;
  if (!storedVoice) return null;
  const kind = String(storedVoice.kind || "").toLowerCase();
  if (kind === "gift") return null;
  return {
    voiceKey: storedVoice.voiceKey in voiceCatalog ? storedVoice.voiceKey : "verity",
    mode: storedVoice.mode || "unlock",
    ruleId: storedVoice.ruleId || "",
    ruleLabel: storedVoice.label || storedVoice.ruleLabel || "Regla",
    targetKey: storedVoice.targetKey || "",
    targetLabel: storedVoice.label || storedVoice.ruleLabel || "Regla",
    targetImage: storedVoice.targetImage || "",
    platform,
    kind: storedVoice.kind || "event",
    triggerAt: Number(storedVoice.updatedAt || Date.now()),
    manual: false,
    source: "activity",
  };
}


function resolveVoiceAssignment(item){
  const key = voiceRuleItemKey(item);
  if (!key) return null;
  const fixed = getFixedVoiceAssignment(item);
  if (fixed) {
    return {
      voiceKey: fixed.voiceKey in voiceCatalog ? fixed.voiceKey : "verity",
      mode: "fixed",
      ruleId: `manual:${key}`,
      ruleLabel: fixed.displayName || key,
      targetKey: key,
      targetLabel: fixed.displayName || key,
      targetImage: "",
      platform: String(item?.platform || "tiktok").toLowerCase(),
      kind: "user",
      triggerAt: Number(fixed.updatedAt || fixed.createdAt || Date.now()),
      manual: true,
      source: "manual",
    };
  }
  const giftOverride = getGiftVoiceAssignment(item) || resolveGiftActivityVoiceAssignment(item);
  if (giftOverride) return giftOverride;
  const eventAssignment = resolveEventActivityVoiceAssignment(item);
  if (eventAssignment) return eventAssignment;
  const directRule = findMatchingVoiceRule(item);
  if (directRule) {
    return {
      voiceKey: directRule.voiceKey in voiceCatalog ? directRule.voiceKey : "verity",
      mode: directRule.mode,
      ruleId: directRule.id,
      ruleLabel: directRule.targetLabel || directRule.targetKey || "Regla",
      targetKey: directRule.targetKey || directRule.targetLabel || "",
      targetLabel: directRule.targetLabel || directRule.targetKey || "Regla",
      targetImage: directRule.targetImage || "",
      platform: directRule.platform,
      kind: directRule.kind,
      triggerAt: Date.now(),
      source: "rule",
    };
  }
  const now = Date.now();
  const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
  const isValidAssignment = (assignment) => {
    if (!assignment) return false;
    const ruleId = String(assignment.ruleId || "");
    return Boolean(ruleId && activeRuleIds.has(ruleId));
  };
  const unlocked = voiceBot.unlockedByUser?.[key];
  const pending = voiceBot.pendingByUser?.[key];
  if (unlocked && (!isValidAssignment(unlocked) || (Number(unlocked.expiresAt || 0) > 0 && Number(unlocked.expiresAt) < now))) {
    delete voiceBot.unlockedByUser[key];
    saveVoiceBot();
  }
  if (pending && (!isValidAssignment(pending) || (Number(pending.expiresAt || 0) > 0 && Number(pending.expiresAt) < now))) {
    delete voiceBot.pendingByUser[key];
    saveVoiceBot();
  }
  const a = isValidAssignment(voiceBot.unlockedByUser?.[key]) ? voiceBot.unlockedByUser[key] : null;
  const b = isValidAssignment(voiceBot.pendingByUser?.[key]) ? voiceBot.pendingByUser[key] : null;
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
    function voiceGiftRuleScore(rule, item){
      if (!rule?.active) return -1;
      if (String(rule.platform || "tiktok").toLowerCase() !== String(item?.platform || "tiktok").toLowerCase()) return -1;
      const kind = String(rule.kind || "gift");
      if (kind !== "gift") return -1;

      const ruleGift = lookupGiftCatalog(rule.targetKey || rule.targetLabel || "");
      const itemGift = lookupGiftCatalog(item?.gift || item?.giftName || item?.giftAlt || item?.giftId || "");

      const ruleTargetImage = normalizeImageSource(rule.targetImage || "");
      const itemImage = normalizeImageSource(item?.giftImage || item?.gift?.image || item?.gift?.url || "");

      if (ruleGift?.id && itemGift?.id && String(ruleGift.id) === String(itemGift.id)) {
        return 1000;
      }
      if (ruleTargetImage && itemImage && ruleTargetImage === itemImage) {
        return 900;
      }

      const ruleKeys = new Set();
      const itemKeys = new Set();

      for (const value of [
        rule.targetKey,
        rule.targetLabel,
        ruleGift?.key,
        ruleGift?.name,
        ruleGift?.alt,
      ]) {
        const key = normalizeMatchKey(value);
        if (key) ruleKeys.add(key);
      }

      for (const value of [
        item?.giftId,
        item?.gift,
        item?.giftName,
        item?.giftAlt,
        itemGift?.key,
        itemGift?.name,
        itemGift?.alt,
      ]) {
        const key = normalizeMatchKey(value);
        if (key) itemKeys.add(key);
      }

      let best = -1;
      for (const target of ruleKeys) {
        for (const candidate of itemKeys) {
          if (!target || !candidate) continue;
          if (candidate === target) best = Math.max(best, 800);
          else if (candidate.includes(target) || target.includes(candidate)) best = Math.max(best, 500);
        }
      }

      return best;
    }
    function ruleMatchesItem(rule, item){
      if (!rule?.active) return false;
      if (String(rule.platform || "tiktok").toLowerCase() !== String(item?.platform || "tiktok").toLowerCase()) return false;
      const kind = String(rule.kind || "gift");
      if (kind === "gift") {
        return voiceGiftRuleScore(rule, item) >= 0;
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
      let bestRule = rules[0];
      let bestScore = -1;
      let bestCreatedAt = Number(bestRule?.createdAt || 0);
      for (const rule of rules) {
        const kind = String(rule.kind || "gift");
        const score = kind === "gift"
          ? voiceGiftRuleScore(rule, item)
          : kind === "event"
            ? 700 + (normalizeMatchKey(rule.targetKey || rule.targetLabel) === normalizeMatchKey(voiceEventKey(item)) ? 100 : 0)
            : kind === "role"
              ? 600
              : kind === "bits"
                ? 500
                : 0;
        const createdAt = Number(rule.createdAt || 0);
        if (score > bestScore || (score === bestScore && createdAt > bestCreatedAt)) {
          bestRule = rule;
          bestScore = score;
          bestCreatedAt = createdAt;
        }
      }
      return bestRule;
    }
    function registerVoiceTriggerForItem(item){
      trackVoiceActivity(item, null);
      if (!voiceBot.enabled) return null;
      const rule = findMatchingVoiceRule(item);
      if (!rule) {
        return null;
      }
      const key = voiceRuleItemKey(item);
      if (!key) return null;
      const assignment = {
        voiceKey: rule.voiceKey in voiceCatalog ? rule.voiceKey : "verity",
        mode: rule.mode,
        ruleId: rule.id,
        ruleLabel: rule.targetLabel || rule.targetKey || "Regla",
        targetKey: rule.targetKey || rule.targetLabel || "",
        targetLabel: rule.targetLabel || rule.targetKey || "Regla",
        targetImage: rule.targetImage || "",
        platform: rule.platform,
        kind: rule.kind,
        triggerAt: Date.now(),
      };
      if (rule.mode === "unlock") {
        voiceBot.unlockedByUser[key] = assignment;
        delete voiceBot.pendingByUser[key];
      } else {
        voiceBot.pendingByUser[key] = assignment;
      }
      trackVoiceActivity(item, assignment);
      saveVoiceBot();
      syncVoiceBotUI();
      return assignment;
    }
    function voiceBotActiveTabButtons(){
      return ["recipients", "rules", "settings", "volumes", "users"];
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
    function setVoiceBotFilter(value){
      const normalized = String(value || "").toLowerCase();
      voiceBot.filter = normalized === "supporters" ? "supporters" : normalized === "followers" ? "followers" : normalized === "moderators" ? "moderators" : normalized === "custom" ? "custom" : "all";
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function setVoiceBotFlag(flag, value){
      if (!["sayDice", "singSlashCommand", "ignoreEmojis", "ignoreSpecialChars", "ignoreStickers", "ignoreEmotes", "onlySpanish", "allowEnye", "antiSpamFilter", "profanityFilter", "noReadNames"].includes(flag)) return;
      voiceBot[flag] = Boolean(value);
      saveVoiceBot();
      syncVoiceBotUI();
    }
    function syncVoiceBotUI(){
      voiceBot = normalizeVoiceBotState(voiceBot);
      const dock = document.getElementById("overlayVoiceDock");
      const btn = document.getElementById("overlayVoiceBtn");
      const volumeBtn = document.getElementById("overlayVoiceVolumeBtn");
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
      const fixedUserInput = document.getElementById("overlayVoicePinnedUserInput");
      const fixedUserSelect = document.getElementById("overlayVoicePinnedVoiceSelect");
      voiceBot.fixedDraftVoiceKey = voiceBot.fixedDraftVoiceKey in voiceCatalog ? voiceBot.fixedDraftVoiceKey : voiceBot.voiceKey;
      const fixedUserApplyBtn = document.getElementById("overlayVoicePinnedApplyBtn");
      const fixedUserClearBtn = document.getElementById("overlayVoicePinnedClearBtn");
      const fixedUserList = document.getElementById("overlayVoicePinnedList");
      const fixedUserSummary = document.getElementById("overlayVoicePinnedSummary");
      const fixedUserSuggestions = document.getElementById("overlayVoicePinnedSuggestions");
      const volumeGrid = document.getElementById("overlayVoiceVolumeGrid");
      const volumeResetAllBtn = document.getElementById("overlayVoiceVolumeResetAllBtn");
      const voiceRuleKindList = voiceRuleKinds[voiceRuleDraft.platform] || voiceRuleKinds.tiktok;
      if (dock) dock.style.display = view === "chat" ? "flex" : "none";
      if (btn) btn.classList.toggle("is-active", Boolean(voiceBot.enabled));
      if (volumeBtn) volumeBtn.classList.toggle("is-active", voiceBot.activeTab === "volumes" && isVoiceModalOpen());
      if (voiceSelect) {
        voiceSelect.innerHTML = voiceOptionsHtml();
        voiceSelect.value = voiceBot.voiceKey;
      }
      if (statusText) statusText.textContent = voiceBot.enabled ? "Bot encendido." : "Bot apagado.";
      if (summary) { summary.innerHTML = voiceBotSummaryHtml(); summary.title = voiceBotSummaryText(); }
      if (recipientsSummary) recipientsSummary.textContent = `Filtro global: ${voiceFilterLabel(voiceBot.filter)}. El selector por regalo o evento manda sobre la voz global cuando hay coincidencia.`;
      if (fixedUserSelect) {
        fixedUserSelect.innerHTML = voiceOptionsHtml();
        fixedUserSelect.value = voiceBot.fixedDraftVoiceKey in voiceCatalog ? voiceBot.fixedDraftVoiceKey : voiceBot.voiceKey;
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
      renderVoiceVolumePanel();
      if (volumeResetAllBtn) volumeResetAllBtn.onclick = resetVoiceVolumes;
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
      const cleanName = voiceBot.noReadNames ? "" : cleanVoiceName(item.displayName || item.user || item.username || "");
      const cleanMessage = cleanVoiceText(extractVoiceRawText(item));
      if (!cleanMessage) return false;
      const assignment = resolveVoiceAssignment(item);
      if (voiceBot.filter !== "custom" && !voiceFilterAllows(item) && !assignment) return false;
      return Boolean(cleanMessage && (voiceBot.noReadNames || cleanName));
    }
    function buildVoiceText(item, cleanedName = "", cleanedMessage = ""){
  const fallbackName = voiceBot.noReadNames ? "" : cleanVoiceName(item.displayName || item.user || item.username || "Usuario");
  const name = cleanedName !== "" ? cleanedName : fallbackName;
  const message = cleanedMessage || cleanVoiceText(extractVoiceRawText(item));
  if (!message) return "";
  const spoken = name ? (voiceBot.sayDice ? `${name} dice ${message}` : `${name} ${message}`) : message;
  return spoken.slice(0, 220);
}

function fetchVoiceAudio(text, voiceId, emotion = ""){
      return fetch("/api/voicebot/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId, emotion: emotion || "", profanityFilter: Boolean(voiceBot.profanityFilter) }),
      }).then(async (res) => {
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `TTS error ${res.status}`);
        }
        return await res.blob();
      });
    }
    let voicePlaybackAudioContext = null;
    async function playVoiceBlob(blob, voiceKey = "verity"){
      const objectUrl = URL.createObjectURL(blob);
      return await new Promise((resolve, reject) => {
        const audio = new Audio(objectUrl);
        voiceBotAudio = audio;
        audio.preload = "auto";
        audio.volume = 1;
        const volume = getVoiceVolumePercent(voiceKey) / 100;
        audio.onended = () => {
          URL.revokeObjectURL(objectUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("No se pudo reproducir el audio."));
        };
        audio.addEventListener("canplaythrough", async () => {
          try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) {
              await audio.play();
              return;
            }
            voicePlaybackAudioContext = voicePlaybackAudioContext || new AudioCtx();
            if (voicePlaybackAudioContext.state === "suspended") {
              try { await voicePlaybackAudioContext.resume(); } catch {}
            }
            const source = voicePlaybackAudioContext.createMediaElementSource(audio);
            const gain = voicePlaybackAudioContext.createGain();
            gain.gain.value = Math.max(0, Math.min(2, volume));
            source.connect(gain);
            gain.connect(voicePlaybackAudioContext.destination);
            await audio.play();
          } catch (err) {
            audio.volume = Math.min(1, volume);
            audio.play().catch((playErr) => {
              URL.revokeObjectURL(objectUrl);
              reject(playErr || err);
            });
          }
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
        const isManualAssignment = queuedRuleId.startsWith("manual:");
        const ruleStillValid = !queuedRuleId || isManualAssignment || activeRuleIds.has(queuedRuleId);
        const pinnedVoice = next.voiceKey in voiceCatalog ? voiceCatalog[next.voiceKey] : null;
        const voice = ruleStillValid && pinnedVoice ? pinnedVoice : selectedVoice();
        const voiceKey = ruleStillValid && pinnedVoice ? next.voiceKey : voiceBot.voiceKey;
        const blob = await fetchVoiceAudio(next.text, voice.id, next.emotion || "");
        await playVoiceBlob(blob, voiceKey);
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
      const key = voiceRuleItemKey(item);
      if (!key) return null;
      const pending = voiceBot.pendingByUser?.[key];
      if (!pending) return null;
      const activeRuleIds = new Set(resolveVoiceRuleList().filter((rule) => rule?.active).map((rule) => String(rule.id || "")));
      if (!pending.ruleId || !activeRuleIds.has(String(pending.ruleId))) {
        delete voiceBot.pendingByUser[key];
        saveVoiceBot();
        return null;
      }
      delete voiceBot.pendingByUser[key];
      saveVoiceBot();
      return pending;
    }
    function queueVoiceMessage(item){
  if (!shouldVoiceRead(item)) return;
  const cleanName = voiceBot.noReadNames ? "" : cleanVoiceName(item.displayName || item.user || item.username || "Usuario");
  const rawMessage = extractVoiceRawText(item);
  const slashIntent = parseVoiceSlashCommand(rawMessage);
  const cleanMessage = cleanVoiceText(slashIntent.text);
  if (!cleanMessage) return;
  if (voiceBot.antiSpamFilter) {
    const key = voiceRuleItemKey(item);
    const signature = voiceDuplicateSignature(cleanMessage, slashIntent.emotion ? [slashIntent.emotion] : []);
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
  voiceBotQueue.push({ text, timestamp: Date.now(), voiceKey: assignment?.voiceKey || voiceBot.voiceKey || "verity", ruleId: assignment?.ruleId || "", emotion: slashIntent.emotion || "" });
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
      const name = item.displayName || item.user || item.username || item.uniqueId || 'Usuario';
      const fixedEntry = getFixedVoiceAssignment(item);
      const fixedBadge = fixedEntry ? `<span class="badge supportBadge support-gold">🤖 ${esc((voiceCatalog[fixedEntry.voiceKey] || voiceCatalog.verity).label)}</span>` : '';
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
      return `<article class="overlayItem ${highlightClass}" style="--item-accent:${accent};--name-color:${color};--entry-text-scale:${textScale};--entry-text-color:${textColor || 'var(--text, #eaf1ff)'};--entry-text-shadow:${textShadow};--name-text-shadow:${nameShadow};--name-stroke:${nameStroke};">${hasAvatar ? `<div class="entryAvatarWrap ${frameClass()}"><img class="entryAvatar" src="${esc(avatar)}" alt="avatar" loading="lazy"></div>` : `<div class="entryAvatarWrap ${frameClass()} no-avatar"><img class="entryAvatar" src="" alt="avatar" loading="lazy" style="display:none"></div>`}<div class="entryBody"><div class="entryBubble ${bubbleFrame}"><div class="entryTop"><span class="user">${esc(name)}</span>${fixedBadge}${isChat && isSupporter ? `<span class="badge supportBadge support-gold">💖 ${esc(settings.personal.supporterHighlightStyle === 'marker' ? 'Corazón brillante' : 'Heart Me')}</span>` : ''}${topBadges ? `<span class="entryActivityBadges">${topBadges}</span>` : ''}<span class="itemEmoji">${esc(itemEmoji(item, kind))}</span>${platformTag(platform)}<span class="actionTag">${esc(action)}</span><span class="timeTag">${timeLabel(item.timestamp)}</span></div>${entryTextHtml}${isChat && metaBadges ? `<div class="overlayMeta">${metaBadges}</div>` : ''}</div></div></article>`;    }

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
    const overlayRecentKeys = new Map();
    const OVERLAY_DUPLICATE_WINDOW_MS = 1800;
    function normalizeOverlayDedupPart(value){ return String(value ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}]+/gu, " "); }
    function buildOverlayDedupKey(kind, data){ const item = data || {}; const id = String(item?.id || item?.eventId || item?.messageId || item?.giftId || item?.uniqueId || "").trim(); const parts = [kind, item?.platform, item?.type, item?.group, item?.action, item?.username, item?.user, item?.displayName, item?.gift, item?.message, item?.amount, id]; return parts.map(normalizeOverlayDedupPart).filter(Boolean).join("|"); }
    function shouldSkipOverlayDuplicate(kind, data){ const now = Date.now(); for (const [key, seenAt] of overlayRecentKeys) { if (now - seenAt > OVERLAY_DUPLICATE_WINDOW_MS) overlayRecentKeys.delete(key); }
      const key = buildOverlayDedupKey(kind, data);
      if (!key) return false;
      const lastSeen = overlayRecentKeys.get(key);
      if (lastSeen && now - lastSeen < OVERLAY_DUPLICATE_WINDOW_MS) return true;
      overlayRecentKeys.set(key, now);
      return false;
    }
    function pushChat(data){ const item = { platform: data?.platform || 'tiktok', uniqueId: data?.uniqueId || data?.username || data?.user || '', username: data?.username || data?.uniqueId || data?.user || '', user: data?.user || data?.displayName || data?.uniqueId || data?.username || 'Usuario', displayName: data?.displayName || data?.nickname || data?.user || data?.uniqueId || data?.username || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Comentario', timestamp: data?.timestamp || Date.now() }; if(shouldSkipOverlayDuplicate('chat', item)) return; state.chat.push(item); if(state.chat.length > 240) state.chat.splice(0, state.chat.length - 240); state.chat = clearByAge(state.chat, settings.personal.autoClearChat, settings.personal.clearChatSeconds); followState.chat = true; render(); }
    function pushEvent(data){ const item = { platform: data?.platform || 'tiktok', uniqueId: data?.uniqueId || data?.username || data?.user || '', username: data?.username || data?.uniqueId || data?.user || '', user: data?.user || data?.displayName || data?.uniqueId || data?.username || 'Usuario', displayName: data?.displayName || data?.nickname || data?.user || data?.uniqueId || data?.username || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Evento', type: data?.type || 'event', group: data?.group || 'event', timestamp: data?.timestamp || Date.now() }; if(String(item.type).toLowerCase() === 'gift' || String(item.group).toLowerCase() === 'gift'){ pushGift(item); return; } if(shouldSkipOverlayDuplicate('event', item)) return; registerVoiceTriggerForItem(item); state.events.unshift(item); if(state.events.length > 240) state.events.length = 240; state.events = clearByAge(state.events, settings.personal.eventsAutoClear, settings.personal.eventsClearSeconds); followState.events = true; render(); }
    function pushGift(data){ const item = { platform: data?.platform || 'tiktok', uniqueId: data?.uniqueId || data?.username || data?.user || '', username: data?.username || data?.uniqueId || data?.user || '', user: data?.user || data?.displayName || data?.uniqueId || data?.username || 'Usuario', displayName: data?.displayName || data?.nickname || data?.user || data?.uniqueId || data?.username || 'Usuario', avatar: String(data?.avatar || ''), message: data?.message || '', badges: data?.badges || [], action: data?.action || 'Regalo', type: data?.type || 'gift', group: 'gift', gift: data?.gift || '', amount: data?.amount || '', timestamp: data?.timestamp || Date.now() }; if(shouldSkipOverlayDuplicate('gift', item)) return; registerVoiceTriggerForItem(item); state.gifts.push(item); if(state.gifts.length > 240) state.gifts.length = 240; state.gifts = clearByAge(state.gifts, settings.personal.giftsAutoClear, settings.personal.giftsClearSeconds); followState.gifts = true; render(); }

    socket.on('settings', (serverSettings) => { settings = migrateSettings(mergeDeep(structuredClone(defaults), serverSettings || {})); syncVoiceFixedUsersFromServer(serverSettings?.voiceFixedUsers || []); ensureGiftCatalog().then(() => render()); });
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
    document.getElementById("overlayVoiceVolumeBtn")?.addEventListener("click", () => openVoiceBotModal("volumes"));
    document.getElementById("overlayVoiceSettingsBtn")?.addEventListener("click", () => openVoiceBotModal("settings"));
    document.getElementById("overlayVoiceCloseBtn")?.addEventListener("click", closeVoiceBotModal);
    document.getElementById("overlayVoiceSelect")?.addEventListener("change", (ev) => setVoiceBotVoice(String(ev.target?.value || "verity")));
    document.getElementById("overlayVoicePinnedUserInput")?.addEventListener("input", renderVoiceFixedSuggestions);
    document.getElementById("overlayVoicePinnedPlatformSelect")?.addEventListener("change", () => renderVoiceFixedSuggestions());
    document.getElementById("overlayVoicePinnedUserInput")?.addEventListener("input", renderVoiceFixedSuggestions);
    document.getElementById("overlayVoicePinnedUserInput")?.addEventListener("change", renderVoiceFixedSuggestions);
    document.getElementById("overlayVoicePinnedVoiceSelect")?.addEventListener("change", (ev) => {
      const next = String(ev.target?.value || "verity");
      voiceBot.fixedDraftVoiceKey = next in voiceCatalog ? next : "verity";
      saveVoiceBot();
      renderVoiceFixedUsers();
    });
    document.getElementById("overlayVoicePinnedApplyBtn")?.addEventListener("click", () => {
      const platform = normalizeVoicePlatform(document.getElementById("overlayVoicePinnedPlatformSelect")?.value || "tiktok");
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const select = document.getElementById("overlayVoicePinnedVoiceSelect");
      const username = normalizeUsername(String(input?.value || ""));
      const voiceKey = String(select?.value || voiceBot.fixedDraftVoiceKey || "verity");
      if (!username) return;
      voiceBot.fixedDraftVoiceKey = voiceKey in voiceCatalog ? voiceKey : "verity";
      setVoiceFixedAssignment(platform, username, voiceBot.fixedDraftVoiceKey, "manual");
      if (input) input.value = "";
      renderVoiceFixedSuggestions();
      renderVoiceFixedUsers();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoicePinnedClearBtn")?.addEventListener("click", () => {
      const input = document.getElementById("overlayVoicePinnedUserInput");
      const platform = document.getElementById("overlayVoicePinnedPlatformSelect");
      if (input) input.value = "";
      if (platform) platform.value = "tiktok";
      renderVoiceFixedSuggestions();
      renderVoiceFixedUsers();
      syncVoiceBotUI();
    });
    document.getElementById("overlayVoicePinnedList")?.addEventListener("click", (ev) => {
      const deleteBtn = ev.target.closest("[data-voice-fixed-delete]");
      if (!deleteBtn) return;
      removeVoiceFixedAssignment(String(deleteBtn.getAttribute("data-voice-fixed-delete") || "tiktok"), String(deleteBtn.getAttribute("data-voice-fixed-user") || ""));
      renderVoiceFixedSuggestions();
      renderVoiceFixedUsers();
      syncVoiceBotUI();
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
      if (platform) platform.value = String(fillBtn.getAttribute("data-voice-user-platform") || "tiktok");
      renderVoiceFixedSuggestions();
    });
    document.getElementById("overlayVoiceVolumeGrid")?.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      const key = String(target.dataset.voiceVolumeSlider || "");
      if (!key) return;
      setVoiceVolume(key, target.value);
    });
    document.getElementById("overlayVoiceVolumeGrid")?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const key = String(target.dataset.voiceVolumeSet || "");
      const volume = target.dataset.volume;
      if (!key || volume == null) return;
      setVoiceVolume(key, volume);
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
  