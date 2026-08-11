(() => {
  const STORAGE_KEY = "streamfusion.voice.overlay.rebuilt.v1";

  const VOICE_LIBRARY_STREAMFUSION = "streamfusion";
  const VOICE_LIBRARY_FISH = "fishaudio";

  const FALLBACK_VOICES = [
    { id: "5e503fc64ded446a9f8636b6009db547", label: "Verity", source: "StreamFusion", tags: ["base", "limpia", "neutra"], description: "Voz base balanceada para lectura general." },
    { id: "3c7dc89e37cc4907a7262df3cda01686", label: "Barney", source: "StreamFusion", tags: ["comica", "humor", "parodia"], aliases: ["barney", "barnei", "barni", "barney voz", "barney voice", "barneyy"], description: "Voz añadida al catálogo para uso general." },
    { id: "f3617f37b9e4453d84d6da6324ab3510", label: "Loquendo", source: "StreamFusion", tags: ["clasica", "retro", "narrador"], description: "Estilo clásico de narrador." },
    { id: "9f850ee9ada24b20a6866825eaefd3f8", label: "Goku", source: "StreamFusion", tags: ["anime", "energica", "heroe"], description: "Intensa, rápida y expresiva." },
    { id: "b7bf6ab569ee48b4ba9d1e98c3767ab9", label: "Stitch", source: "StreamFusion", tags: ["comic", "traveso", "alien"], description: "Caótico y divertido." },
    { id: "61e917a26d48444da6a0f07f80f4873e", label: "Elmo", source: "StreamFusion", tags: ["infantil", "calido", "divertido"], description: "Amable y expresivo." },
    { id: "8bc1a2123c2c4b68bff426440871eff4", label: "Minion", source: "StreamFusion", tags: ["cartoon", "comica", "popular"], description: "Voz añadida al catálogo." },
    { id: "4831978dcd9943a2b14aeb77a4785d8f", label: "Mordecai", source: "StreamFusion", tags: ["cartoon", "comica", "popular"], description: "Voz añadida al catálogo." },
    { id: "0296bc28309643809cd51c443407c7b5", label: "Rigby", source: "StreamFusion", tags: ["cartoon", "comica", "popular"], description: "Voz añadida al catálogo." },
    { id: "829e7aa69293458ab5d1a3058f0d71b4", label: "Akaza DS", source: "StreamFusion", tags: ["anime", "oscura", "firme"], description: "Tono agresivo y marcado." },
    { id: "926ab32e533748d4b85965464c9a9526", label: "Tanjiro DS", source: "StreamFusion", tags: ["anime", "suave", "heroica"], description: "Cálida y heroica." },
    { id: "7e7b8f4c600847dd99f6aead1d292503", label: "Shinobu DS", source: "StreamFusion", tags: ["anime", "suave", "ligera"], description: "Ligera y delicada." },
    { id: "dfa4fac5833241d38750c3f14a54e043", label: "Nagi Seishiro", source: "StreamFusion", tags: ["anime", "fria", "moderna"], aliases: ["nagi", "nagi seishiro", "seishiro"], description: "Fría, suave y muy controlada." },
    { id: "f9201e13d2d3460db84bed048cb58377", label: "Eren Yeager", source: "StreamFusion", tags: ["anime", "intensa", "dramatico"], aliases: ["eren", "eren yeager", "eren jaeger", "yeager", "jaeger"], description: "Intensa y dramática." },
    { id: "a0ea40b0b20a48d0b53e60b56cf819b6", label: "Thanos", source: "StreamFusion", tags: ["villano", "grave", "epico"], aliases: ["thanos"], description: "Grave y dominante." },
    { id: "b145f4f38b3444f7a9a0bc146d317a9c", label: "Mikasa", source: "StreamFusion", tags: ["anime", "firme", "seria"], aliases: ["mikasa", "mikasa ackerman", "ackerman"], description: "Seria, firme y precisa." },
    { id: "f9954dea4bdb4150bd0fd5d844d0175b", label: "Inosuke DS", source: "StreamFusion", tags: ["anime", "salvaje", "energica"], aliases: ["inosuke", "inosuke ds", "inozu", "inosuke demon slayer", "inosuke kimetsu"], description: "Salvaje, rápida y muy expresiva." },
    { id: "3b39044ce45f4224ba709c53bf78b992", label: "Tom Spiderman", source: "StreamFusion", tags: ["heroe", "ligera", "comic"], aliases: ["tom spiderman", "tomspiderman"], description: "Ligera, ágil y heroica." },
    { id: "4c2aa36dd60540e9b63717a9b0cfcdcd", label: "Meliodas", source: "StreamFusion", tags: ["anime", "juguetona", "poderosa"], aliases: ["meliodas"], description: "Juguetona pero poderosa." },
    { id: "1aeabed4707d4287b1853b314e5bd1a8", label: "Escanor", source: "StreamFusion", tags: ["anime", "grave", "orgullosa"], aliases: ["escanor"], description: "Grave, orgullosa y potente." },
    { id: "98ed67ff6c0844a7b6576a28d94eabec", label: "Zenitsu DS", source: "StreamFusion", tags: ["anime", "aguda", "nerviosa"], aliases: ["zenitsu", "zenitsu ds"], description: "Aguda, nerviosa y rápida." },
    { id: "e0229f9c45e543219c4a10d9f3803337", label: "Mitsuri DS", source: "StreamFusion", tags: ["anime", "suave", "dulce"], aliases: ["mitsuri", "mitsuri ds"], description: "Suave y dulce." },
    { id: "d5e4bb63c8354d3797e56216b11b67ea", label: "Giyuu Tomioka DS", source: "StreamFusion", tags: ["anime", "seria", "fria"], aliases: ["giyuu", "giyu", "giyuu tomioka", "giyuu tomioka ds", "tomioka"], description: "Seria, fría y contenida." },
    { id: "bcacb61350ae4f2d9764fa5071917e83", label: "Sanemi DS", source: "StreamFusion", tags: ["anime", "agresiva", "firme"], aliases: ["sanemi", "sanemi ds"], description: "Agresiva y firme." },
    { id: "5df366e422dc4d04ab376f5282f99050", label: "Muichiro Tokito", source: "StreamFusion", tags: ["anime", "suave", "etereo"], aliases: ["muichiro", "muichiro tokito", "tokito"], description: "Suave, etérea y calmada." },
    { id: "771c52fee794444288e1bcb8566040e3", label: "Kyojuro Rengoku", source: "StreamFusion", tags: ["anime", "epica", "ardiente"], aliases: ["kyojuro", "kyojuro rengoku", "rengoku"], description: "Épica, ardiente y heroica." },
    { id: "507148d3f1c140278af140fa398a2e0f", label: "Megumi Fushiguro", source: "StreamFusion", tags: ["anime", "seria", "tactica"], aliases: ["megumi", "megumi fushiguro", "fushiguro", "megumi jjk", "megumi jujutsu"], description: "Seria, controlada y táctica." },
    { id: "7b009076e19e42b6b831dc2d86989c50", label: "Nobara Kugisaki", source: "StreamFusion", tags: ["anime", "firme", "energica"], aliases: ["nobara", "nobara kugisaki", "kugisaki", "nobara jjk", "nobara jujutsu"], description: "Firme, segura y expresiva." },
    { id: "cd61a08989864c3a9f08e9f092f28553", label: "Venom", source: "StreamFusion", tags: ["villano", "grave", "oscura"], aliases: ["venom", "symbiote", "el simbionte"], description: "Grave y amenazante." },
    { id: "beef6767e20e452fa870a50593642d14", label: "Anuel", source: "StreamFusion", tags: ["urbana", "firme", "latina"], aliases: ["anuel", "anuel aa", "anuelaa"], description: "Urbana y marcada." },
    { id: "9b30f7190dbe49acb731345e70366cf7", label: "Bad Bunny", source: "StreamFusion", tags: ["urbana", "moderna", "latina"], aliases: ["bad bunny", "badbunny", "bunny"], description: "Moderna y popular." },
    { id: "7fd83623b13642b1a5dafad16724dd45", label: "Marge Simpson", source: "StreamFusion", tags: ["cartoon", "grave", "comica"], aliases: ["marge", "marge simpson", "simpson"], description: "Grave y reconocible." },
    { id: "f2204c7e198f4630af485ff5edc90778", label: "Gru", source: "StreamFusion", tags: ["comic", "grave", "rara"], description: "Grave y cómica." },
    { id: "4819291078264dc69ff151f7680baeb0", label: "Don Cangrejo", source: "StreamFusion", tags: ["cartoon", "grave", "comic"], description: "Cómica y avara." },
    { id: "304d8f104908477abbe917e8bd31df1b", label: "Plankton", source: "StreamFusion", tags: ["cartoon", "aguda", "villano"], description: "Aguda y tramposa." },
    { id: "28aa07e96d644564ace67493f2b4aa4a", label: "Ken Kaneki", source: "StreamFusion", tags: ["anime", "oscura", "dramatico"], description: "Oscura y dramática." },
    { id: "04d112410e054f0297205933c2f9ee57", label: "Chavo Real", source: "StreamFusion", tags: ["latin", "comica", "clasica"], description: "Clásica y reconocible." },
    { id: "f198eb4ad6e8426dacedb631952a88ef", label: "Chavo Animado", source: "StreamFusion", tags: ["latin", "comica", "animada"], description: "Animada y ligera." },
    { id: "b6c810ebace844ada275e90cf1aab35c", label: "Kiko Real", source: "StreamFusion", tags: ["latin", "comica", "clasica"], description: "Clásica y divertida." },
    { id: "663a9f98d080422e9796e4764b6adb62", label: "Kiko Animado", source: "StreamFusion", tags: ["latin", "comica", "animada"], description: "Animada y ligera." },
    { id: "f9fc215d37f541118aed10bac769f4b6", label: "Don Ramon R", source: "StreamFusion", tags: ["latin", "grave", "clasica"], description: "Grave y clásica." },
    { id: "587c8b89da81478486699e4ae6ec3ad0", label: "Don Ramon A", source: "StreamFusion", tags: ["latin", "grave", "animada"], description: "Animada y reconocible." },
    { id: "409e62fda4644ccabbb15275de9095e4", label: "Michael Jackson", source: "StreamFusion", tags: ["musical", "suave", "pop"], description: "Suave y musical." },
    { id: "f9fec2b8ca2640e8a0383c073ab033ec", label: "Milk DBZ", source: "StreamFusion", tags: ["anime", "firme", "femenina"], description: "Firme y expresiva." },
    { id: "09507d76d37c4fdf8f0cc81fee1f6218", label: "Bulma Joven", source: "StreamFusion", tags: ["anime", "suave", "femenina"], description: "Suave y juvenil." },
    { id: "bf3b5b6ef4254521a6afb6040a463cde", label: "Ragatha DC", source: "StreamFusion", tags: ["cartoon", "dulce", "ligera"], description: "Dulce y ligera." },
    { id: "3d74c56e741f434dbe7644c99959f1e1", label: "Kinger Cuerdo DC", source: "StreamFusion", tags: ["cartoon", "rara", "comica"], description: "Rara y divertida." },
    { id: "a7caf4b47a24432e946f28e24eba6ea9", label: "Kinger DC", source: "StreamFusion", tags: ["cartoon", "rara", "comica"], description: "Rara y divertida." },
    { id: "35c7c46f9a4f48f390e44ae4bae9c5e0", label: "Pinki Pie", source: "StreamFusion", tags: ["cartoon", "aguda", "alegre"], description: "Alegre y aguda." },
    { id: "057ca32a305141cca13ca6d0cbf757e8", label: "Sonic", source: "StreamFusion", tags: ["videojuego", "energica", "rapida"], description: "Rápida y energética." },
    { id: "40321316304645ee95180d1f9d9f4406", label: "Yuji Itadori", source: "StreamFusion", tags: ["anime", "heroica", "firme"], description: "Heroica y firme." },
    { id: "e49f1fb63ab843e8b1d85a2e760b1f09", label: "Gojo Satoru", source: "StreamFusion", tags: ["anime", "firme", "carismatica"], description: "Carismática y segura." },
    { id: "66f98764678e46219d0891f3758493e2", label: "Makanaki", source: "StreamFusion", tags: ["latin", "comica", "rica"], description: "Divertida y expresiva." },
    { id: "351a1cd287584e9d8d4b2e2709fa0303", label: "Gaspi", source: "StreamFusion", tags: ["latin", "comica", "creador"], description: "Ligera y casual." },
    { id: "eaa8da48663b4d04a78d7309305b26f1", label: "Duki", source: "StreamFusion", tags: ["musical", "moderna", "urbana"], description: "Moderna y urbana." },
    { id: "eab5106dfb044221b17b115c8ef9b408", label: "Lit Killah", source: "StreamFusion", tags: ["musical", "urbana", "moderna"], description: "Urbana y moderna." },
    { id: "7d529b5bf7c84401b96cd7d818478806", label: "Scooby Doo", source: "StreamFusion", tags: ["cartoon", "divertida", "grave"], description: "Divertida y grave." },
    { id: "23d22379ce5449e19ab044780472c3ec", label: "Shaggy", source: "StreamFusion", tags: ["cartoon", "relajada", "comica"], description: "Relajada y cómica." },
    { id: "ec71733475c649389f7e3e0922d3c5c7", label: "PO", source: "StreamFusion", tags: ["cartoon", "suave", "amistosa"], description: "Suave y amistosa." },
    { id: "86bc0bf60af340a887cfb9629bd7047a", label: "Vegeta", source: "StreamFusion", tags: ["anime", "seria", "firme"], description: "Tono fuerte, directo y con presencia." },
    { id: "2358f01cb5b940008c7449c81fff95ad", label: "Bob Esponja", source: "StreamFusion", tags: ["cartoon", "divertida", "aguda"], description: "Cómica y ligera." },
    { id: "dac19523253641b49b61b3d1d244172d", label: "Calamardo", source: "StreamFusion", tags: ["cartoon", "seco", "sarcastico"], description: "Seca y con personalidad." },
    { id: "0bf1d759a4d342548d108fb2513413cc", label: "Shrek", source: "StreamFusion", tags: ["comic", "grave", "raro"], description: "Grave, rara y muy reconocible." },
    { id: "c1569d1992204996802bb99a026bf64c", label: "Rick Sanchez", source: "StreamFusion", tags: ["caotica", "comic", "narrador"], description: "Caótica y rápida." },
    { id: "379d2b2fd78943bc86b94a5aca6ff35b", label: "Auronplay", source: "StreamFusion", tags: ["streamer", "ironica", "humor"], description: "Estilo streamer con humor seco." },
    { id: "39382efbc7584d428f0f789d882cd3b8", label: "ElRubius", source: "StreamFusion", tags: ["streamer", "juvenil", "energia"], description: "Ágil y expresiva." },
    { id: "dada7de849e641b79911c9c553c122b3", label: "Ibai", source: "StreamFusion", tags: ["streamer", "amable", "conversacional"], description: "Conversacional y cercana." },
    { id: "18d5dcc7904945569b728b88ddf0a1a1", label: "Messi", source: "StreamFusion", tags: ["suave", "deportiva", "calma"], description: "Suave y limpia." },
    { id: "251a9aeff7eb4e789917131416ce1a0b", label: "CR7", source: "StreamFusion", tags: ["firme", "deportiva", "potente"], description: "Fuerte y marcada." },
    { id: "a73c21076a8b47b7a17883ccb8a3e3a4", label: "Mickey Mouse", source: "StreamFusion", tags: ["cartoon", "aguda", "divertida"], description: "Muy aguda y caricaturesca." },
    { id: "f7dbe26038174d828b15a64f4da65486", label: "Homero Simpson", source: "StreamFusion", tags: ["cartoon", "comico", "grave"], description: "Cómico y relajado." },
    { id: "654b0dfed3f441e7836d09359cef0b44", label: "Milo J", source: "StreamFusion", tags: ["moderna", "suave", "juvenil"], description: "Moderna y suave." },
    { id: "b94a93bc73ee4ddc93652e3a54f2a22d", label: "Alastor", source: "StreamFusion", tags: ["teatral", "oscura", "firme"], description: "Teatral y con mucha presencia." },
    { id: "0118a35dcb604837abe7961a43e13ba8", label: "Kasane Teto", source: "StreamFusion", tags: ["anime", "musical", "aguda"], description: "Aguda y musical." },
    { id: "ef1d3957caf2433db755f6cd9990e778", label: "Miku Hatsune", source: "StreamFusion", tags: ["anime", "musical", "limpia"], description: "Limpia y brillante." },
    { id: "c84062f178574341ba5fd2cf9c17c75b", label: "Jake el perro", source: "StreamFusion", tags: ["cartoon", "divertida", "relajada"], description: "Divertida y relajada." },
    { id: "79364023db4647b393510a815dc3545b", label: "Roro", source: "StreamFusion", tags: ["humor", "juvenil", "streamer"], description: "Voz ligera y reconocible." },
    { id: "211ff667f4c04daf9d6ab0eea75ab18b", label: "Lamine Yamal", source: "StreamFusion", tags: ["deporte", "juvenil", "rapida"], description: "Tono juvenil y dinámico." },
    { id: "eebb1c8f7fcd4fa38e492bb313749b8c", label: "Homero Chino", source: "StreamFusion", tags: ["comic", "parodia", "clasica"], description: "Estilo cómico y reconocible." },
    { id: "edac49eb81b04825a6392bea3d437dd1", label: "Chilindrina", source: "StreamFusion", tags: ["comic", "clasica", "latina"], description: "Tono clásico y juguetón." },
    { id: "371183b4494d472ab0db172130692eaf", label: "JH de la cruz", source: "StreamFusion", tags: ["urbana", "streamer", "rap"], description: "Tono de creador de contenido." },
    { id: "7b642ed31beb4984803824480b5c6c94", label: "Pitbull", source: "StreamFusion", tags: ["musical", "fuerte", "energica"], description: "Firme y potente." },
    { id: "8a7196cd1adf4bf0b97bb9239d9e5fb1", label: "Dra Polo", source: "StreamFusion", tags: ["latina", "firme", "tv"], description: "Firme y televisiva." },
    { id: "6db58c8873c041ecb043fe18c6bb65c2", label: "Burro", source: "StreamFusion", tags: ["comic", "grave", "animada"], description: "Grave y cómica." },
    { id: "693009f7d6e0455e82aa89c071fed46a", label: "Bowser", source: "StreamFusion", tags: ["videojuego", "grave", "villano"], description: "Grave y dominante." },
    { id: "be48ea4eead9495daaf66e61a7f1517c", label: "MonoOaxaco", source: "StreamFusion", tags: ["comic", "regional", "streamer"], description: "Tono cómico y regional." },
    { id: "e68a19e9644d47eb80c9e0b0b96fac8a", label: "Holman", source: "StreamFusion", tags: ["streamer", "natural", "actual"], description: "Natural y reconocible." },
    { id: "a7a8e99837144ffbb78a4f5072199426", label: "Arigameplays", source: "StreamFusion", tags: ["streamer", "juvenil", "energica"], description: "Voz dinámica y clara." },
  ];

  const CATEGORY_LABELS = {
    all: "Todas",
    base: "Base",
    anime: "Anime",
    cartoon: "Cartoon",
    streamer: "Streamer",
    comic: "Cómicas",
    musical: "Musical",
    narrador: "Narrador",
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    apiPill: $("apiPill"),
    micPill: $("micPill"),
    voicePill: $("voicePill"),
    outputPill: $("outputPill"),
    enginePill: $("enginePill"),
    liveBanner: $("liveBanner"),
    bannerDot: $("bannerDot"),
    bannerTitle: $("bannerTitle"),
    bannerSubtitle: $("bannerSubtitle"),
    connectBtn: $("connectBtn"),
    disconnectBtn: $("disconnectBtn"),
    refreshVoicesBtn: $("refreshVoicesBtn"),
    modeWebBtn: $("modeWebBtn"),
    modeCustomBtn: $("modeCustomBtn"),
    modeNote: $("modeNote"),
    advancedDevices: $("advancedDevices"),
    micSelect: $("micSelect"),
    outputSelect: $("outputSelect"),
    langSelect: $("langSelect"),
    deviceHint: $("deviceHint"),
    selectedVoiceName: $("selectedVoiceName"),
    selectedVoiceMeta: $("selectedVoiceMeta"),
    selectedVoiceChips: $("selectedVoiceChips"),
    connectionChip: $("connectionChip"),
    recognitionChip: $("recognitionChip"),
    ttsChip: $("ttsChip"),
    queueChip: $("queueChip"),
    micLevelText: $("micLevelText"),
    outLevelText: $("outLevelText"),
    micFill: $("micFill"),
    outFill: $("outFill"),
    statusLine: $("statusLine"),
    liveText: $("liveText"),
    historyCount: $("historyCount"),
    historyList: $("historyList"),
    activityList: $("activityList"),
    voiceSearch: $("voiceSearch"),
    voiceCountPill: $("voiceCountPill"),
    categoryRow: $("categoryRow"),
    voiceGrid: $("voiceGrid"),
    voiceSourceLabel: $("voiceSourceLabel"),
    modularBtn: $("modularBtn"),
    activeVoiceLabel: $("activeVoiceLabel"),
    pendingVoiceLabel: $("pendingVoiceLabel"),
    libraryRow: $("libraryRow"),
    libraryStreamBtn: $("libraryStreamBtn"),
    libraryFishBtn: $("libraryFishBtn"),
  };

  const state = {
    ready: false,
    connected: false,
    mode: "web",
    api: {
      online: false,
      apiKeyConfigured: false,
      apiReachable: false,
      voiceCount: 0,
      model: "",
      ttsEndpoint: "/api/voicebot/tts",
      recognition: "web",
    },
    recognitionSupported: false,
    sinkSupported: false,
    loadingVoices: false,
    voices: [],
    voiceFilter: "all",
    voiceSearch: "",
    selectedVoiceId: "",
    selectedVoice: null,
    micId: "",
    outputId: "",
    language: "es-PE",
    micStream: null,
    micAnalyser: null,
    micAudioContext: null,
    recognition: null,
    recognitionRunning: false,
    pausedForPlayback: false,
    playing: false,
    playAudio: null,
    playObjectUrl: "",
    pendingSegments: [],
    pendingFlushTimer: 0,
    restartTimer: 0,
    meterRaf: 0,
    activity: [],
    history: [],
    queue: [],
    processingQueue: false,
    sessionId: 0,
    ttsInFlight: false,
    interimText: "",
    liveEmotion: { emotion: "neutral", marker: "", label: "Neutral" },
    fastInterimText: "",
    fastInterimNorm: "",
    fastInterimAt: 0,
    fastInterimTimer: 0,
    fastInterimCommittedNorm: "",
    fastInterimCommittedAt: 0,
    lastFinalNorm: "",
    lastFinalAt: 0,
    lastStatusTone: "warn",
    voiceLibrary: VOICE_LIBRARY_STREAMFUSION,
    pendingVoiceId: "",
    confirmedVoiceId: "",
    awaitingModule: false,
    hasAudioUnlock: false,
    fallbackMode: false,
    fallbackRecorder: null,
    fallbackChunks: [],
    fallbackCycleTimer: 0,
    toastCooldownAt: 0,
  };

  const timeFmt = new Intl.DateTimeFormat("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nowLabel(ts = Date.now()) {
    return timeFmt.format(new Date(ts));
  }

  function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function normalizeText(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const VOICE_EXPRESSION_CATALOG = {
    s: { emotion: "singing", marker: "[singing]", label: "Cantando" },
    a: { emotion: "angry", marker: "[angry]", label: "Enojo" },
    w: { emotion: "whispering", marker: "[whispering]", label: "Susurrando" },
    g: { emotion: "laughing", marker: "[laughing]", label: "Risa" },
    l: { emotion: "laughing", marker: "[laughing]", label: "Risa" },
    e: { emotion: "excited", marker: "[excited]", label: "Entusiasta" },
    c: { emotion: "crying", marker: "[crying]", label: "Llorando" },
    p: { emotion: "pause", marker: "[pause]", label: "Pausa" },
    b: { emotion: "break", marker: "[break]", label: "Pausa larga" },
  };

  function parseVoiceExpressionPrefix(text) {
    const raw = String(text || "").replace(/\s+/g, " ").trim();
    if (!raw) return { text: "", emotion: "", markers: [], used: false };

    const tokens = raw.split(" ").filter(Boolean);
    const markers = [];
    const remaining = [];
    let emotion = "";

    const commandSpecForToken = (token) => {
      const tokenText = String(token || "").trim();
      if (!tokenText) return null;
      const trimmed = tokenText.replace(/[.,;:!?]+$/g, "");
      const match = trimmed.match(/^([!/])([sawglecpb])$/i);
      if (match) return VOICE_EXPRESSION_CATALOG[match[2].toLowerCase()] || null;
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


  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: state.mode,
        micId: state.micId,
        outputId: state.outputId,
        language: state.language,
        selectedVoiceId: state.selectedVoiceId,
        confirmedVoiceId: state.confirmedVoiceId,
        pendingVoiceId: state.pendingVoiceId,
        voiceFilter: state.voiceFilter,
        voiceSearch: state.voiceSearch,
        voiceLibrary: state.voiceLibrary,
      }));
    } catch {}
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (!saved || typeof saved !== "object") return;
      state.mode = saved.mode === "custom" ? "custom" : "web";
      state.micId = String(saved.micId || "");
      state.outputId = String(saved.outputId || "");
      state.language = String(saved.language || "es-PE");
      state.selectedVoiceId = String(saved.selectedVoiceId || "");
      state.confirmedVoiceId = String(saved.confirmedVoiceId || saved.selectedVoiceId || "");
      state.pendingVoiceId = String(saved.pendingVoiceId || saved.selectedVoiceId || saved.confirmedVoiceId || "");
      state.voiceFilter = String(saved.voiceFilter || "all");
      state.voiceSearch = String(saved.voiceSearch || "");
      state.voiceLibrary = saved.voiceLibrary === VOICE_LIBRARY_FISH ? VOICE_LIBRARY_FISH : VOICE_LIBRARY_STREAMFUSION;
    } catch {}
  }

  function setPill(el, text, tone = "warn") {
    if (!el) return;
    el.textContent = text;
    el.dataset.state = tone;
  }

  function pushActivity(title, message, tone = "warn") {
    state.activity.unshift({ title, message, tone, ts: Date.now() });
    state.activity = state.activity.slice(0, 12);
    renderActivity();
  }

  function pushHistory(text) {
    state.history.unshift({ text, ts: Date.now() });
    state.history = state.history.slice(0, 10);
    renderHistory();
  }

  function setBanner(tone, title, subtitle) {
    state.lastStatusTone = tone;
    if (els.liveBanner) els.liveBanner.dataset.state = tone;
    if (els.bannerDot) {
      els.bannerDot.classList.remove("ok", "warn", "err");
      els.bannerDot.classList.add(tone === "ok" ? "ok" : tone === "err" ? "err" : "warn");
    }
    if (els.bannerTitle) els.bannerTitle.textContent = title;
    if (els.bannerSubtitle) els.bannerSubtitle.textContent = subtitle;
  }

  function setVoice(voice) {
    if (!voice) return;
    state.pendingVoiceId = voice.id;
    state.selectedVoice = voice;
    state.selectedVoiceId = voice.id;
    state.confirmedVoiceId = voice.id;
    state.awaitingModule = false;
    if (els.selectedVoiceName) els.selectedVoiceName.textContent = voice.label;
    if (els.selectedVoiceMeta) {
      const source = voice.source || "StreamFusion";
      const desc = voice.description || "Lista de voz lista para usar en tiempo real.";
      els.selectedVoiceMeta.textContent = `${source} • ${desc}`;
    }
    renderSelectedVoiceChips(voice.tags || []);
    updateVoiceModState();
    saveState();
    renderVoiceGrid();
    pushActivity("Voz cambiada", `La voz ${voice.label} quedó activa automáticamente.`, "ok");
    showBannerNotice("ok", "Voz cambiada correctamente", `La sesión ahora usa ${voice.label}.`);
    notifyUser("Voz cambiada", `La voz ${voice.label} quedó activa.`);
  }

  function renderSelectedVoiceChips(tags) {
    if (!els.selectedVoiceChips) return;
    els.selectedVoiceChips.innerHTML = (Array.isArray(tags) ? tags : []).slice(0, 4).map((tag) => `<span class="chip active">${escapeHtml(tag)}</span>`).join("");
  }

  function getVoiceById(id) {
    return state.voices.find((voice) => voice.id === id) || null;
  }

  function getActiveVoice() {
    return getVoiceById(state.confirmedVoiceId || state.selectedVoiceId || state.pendingVoiceId) || state.voices[0] || null;
  }

  function updateVoiceModState() {
    const confirmed = getVoiceById(state.confirmedVoiceId) || getActiveVoice();
    if (els.activeVoiceLabel) els.activeVoiceLabel.textContent = `Voz activa: ${confirmed?.label || "Sin voz"}`;
    if (els.pendingVoiceLabel) {
      els.pendingVoiceLabel.textContent = `Cambio automático activo`;
      els.pendingVoiceLabel.dataset.state = "ok";
    }
    if (els.modularBtn) {
      els.modularBtn.disabled = true;
      els.modularBtn.textContent = "AUTO";
      els.modularBtn.classList.add("hidden");
    }
    setPill(els.voicePill, confirmed ? `Voz: ${confirmed.label}` : "Voz: sin seleccionar", confirmed ? "ok" : "warn");
  }

  function confirmVoiceSelection(silent = false) {
    const voice = getVoiceById(state.pendingVoiceId || state.selectedVoiceId || state.confirmedVoiceId);
    if (!voice) return null;
    state.selectedVoice = voice;
    state.selectedVoiceId = voice.id;
    state.confirmedVoiceId = voice.id;
    state.pendingVoiceId = voice.id;
    state.awaitingModule = false;
    if (els.selectedVoiceName) els.selectedVoiceName.textContent = voice.label;
    if (els.selectedVoiceMeta) {
      const source = voice.source || "StreamFusion";
      const desc = voice.description || "Lista de voz lista para usar en tiempo real.";
      els.selectedVoiceMeta.textContent = `${source} • ${desc}`;
    }
    renderSelectedVoiceChips(voice.tags || []);
    updateVoiceModState();
    saveState();
    renderVoiceGrid();
    if (!silent) {
      pushActivity("Voz cambiada", `La voz ${voice.label} quedó activa automáticamente.`, "ok");
      showBannerNotice("ok", "Voz cambiada correctamente", `La sesión ahora usa ${voice.label}.`);
      notifyUser("Voz cambiada", `La voz ${voice.label} quedó activa.`);
    }
    return voice;
  }

  function showBannerNotice(tone, title, subtitle) {
    setBanner(tone, title, subtitle);
  }

  function notifyUser(title, body) {
    const now = Date.now();
    if (now - state.toastCooldownAt < 1200) return;
    state.toastCooldownAt = now;
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification(title, { body }); } catch {}
    }
    pushActivity(title, body, "ok");
  }

  function updateLibraryButtons() {
    if (els.libraryStreamBtn) els.libraryStreamBtn.dataset.active = state.voiceLibrary === VOICE_LIBRARY_STREAMFUSION ? "true" : "false";
    if (els.libraryFishBtn) els.libraryFishBtn.dataset.active = state.voiceLibrary === VOICE_LIBRARY_FISH ? "true" : "false";
  }

  function detectEmotion(text) {
    const raw = cleanText(text);
    const norm = normalizeText(raw);
    if (!norm) return { emotion: "neutral", marker: "", label: "Neutral" };
    const exclaim = (raw.match(/!/g) || []).length;
    const question = (raw.match(/\?/g) || []).length;
    const upper = raw.length >= 4 && raw === raw.toUpperCase();
    const laughter = /(jaja|haha|lol|xd|xD)/i.test(raw);
    const sadWords = /(triste|sad|lloro|llorando|deprim|mal|pena|adios|adiós|perdi|perdí)/i.test(raw);
    const angryWords = /(enoj|rabia|furia|molest|od[ií]o|ira|nooooo|noooo|maldit)/i.test(raw);
    const excitedWords = /(wow|incre[ií]ble|buen[ií]simo|genial|emocion|emoción|vamos|siii|yess|brutal)/i.test(raw);
    const singingWords = /(cantando|canta|cantandoo|la la|lalala|♪|♫|melod[ií]a|song|singing)/i.test(raw)
      || /([aeiouáéíóú])\1{2,}/i.test(raw)
      || /(?:\b\w{1,3}\b\s*){4,}/i.test(raw) && /(yeah|oh|ah|la|na)/i.test(raw);
    if (singingWords) return { emotion: "singing", marker: "[singing]", label: "Cantando" };
    if (laughter || exclaim >= 2) return { emotion: "happy", marker: "[happy]", label: "Feliz" };
    if (angryWords || (upper && exclaim >= 1)) return { emotion: "angry", marker: "[angry]", label: "Enojo" };
    if (sadWords) return { emotion: "sad", marker: "[sad]", label: "Triste" };
    if (excitedWords || exclaim >= 1 || question >= 2) return { emotion: "excited", marker: "[excited]", label: "Entusiasta" };
    return { emotion: "neutral", marker: "", label: "Neutral" };
  }

  function decorateTextForTts(text) {
    const parsed = parseVoiceExpressionPrefix(cleanText(text));
    const cleaned = cleanText(parsed.text);
    const detected = detectEmotion(cleaned);
    const emotion = parsed.emotion
      ? (VOICE_EXPRESSION_CATALOG[parsed.emotion[0]] || detected)
      : detected;
    const payload = emotion.marker ? `${emotion.marker} ${cleaned}` : cleaned;
    return { payload, emotion };
  }


  function emotionDisplayMarker(emotion) {
    switch (emotion?.emotion) {
      case "happy": return "[feliz]";
      case "angry": return "[enojo]";
      case "sad": return "[triste]";
      case "excited": return "[emocion]";
      case "singing": return "[cantando]";
      default: return "";
    }
  }

  function formatLiveTranscript(text, emotion = detectEmotion(text)) {
    const cleaned = cleanText(text);
    const marker = emotionDisplayMarker(emotion);
    return marker ? `${marker} ${cleaned}` : cleaned;
  }

  function looksStableForFastFlush(text) {
    const cleaned = cleanText(text);
    if (!cleaned) return false;
    if (/[.!?…]$/.test(cleaned)) return true;
    if (cleaned.length >= 8 && /\s/.test(cleaned)) return true;
    return cleaned.length >= 3;
  }

  function scheduleFastInterimFlush(text) {
    const cleaned = cleanText(text);
    if (!cleaned) return;
    const normalized = normalizeText(cleaned);
    if (!normalized) return;

    state.fastInterimText = cleaned;
    state.fastInterimNorm = normalized;
    state.fastInterimAt = Date.now();

    clearTimeout(state.fastInterimTimer);
    const delay = looksStableForFastFlush(cleaned) ? 90 : 150;
    state.fastInterimTimer = setTimeout(() => {
      flushFastInterim(false);
    }, delay);
  }

  function flushFastInterim(force = false) {
    clearTimeout(state.fastInterimTimer);
    state.fastInterimTimer = 0;

    const cleaned = cleanText(state.fastInterimText);
    if (!cleaned) return;

    const normalized = normalizeText(cleaned);
    if (!normalized) return;

    if (!force) {
      if (normalized === state.lastFinalNorm) return;
      if (normalized === state.lastSpokenNorm && Date.now() - (state.lastSpokenAt || 0) < 2500) return;
      if (normalized === state.fastInterimCommittedNorm && Date.now() - (state.fastInterimCommittedAt || 0) < 500) return;
    }

    state.fastInterimCommittedNorm = normalized;
    state.fastInterimCommittedAt = Date.now();
    commitFinalSegment(cleaned, "interim");
  }

  function createSilentAudioUrl() {
    const sampleRate = 8000;
    const duration = 0.15;
    const numSamples = Math.floor(sampleRate * duration);
    const bytesPerSample = 2;
    const dataSize = numSamples * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i += 1) view.setUint8(offset + i, str.charCodeAt(i));
    };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true);
    view.setUint16(32, bytesPerSample, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);
    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }

  async function unlockAudioPlayback() {
    if (state.hasAudioUnlock) return true;
    const audio = new Audio();
    audio.muted = true;
    audio.playsInline = true;
    const url = createSilentAudioUrl();
    audio.src = url;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      state.hasAudioUnlock = true;
      return true;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        try { URL.revokeObjectURL(url); } catch {}
      }, 1000);
    }
  }

  async function playBlobWithAudioContext(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error("AudioContext no soportado.");
    const context = new AC();
    try {
      if (context.state === "suspended") {
        try { await context.resume(); } catch {}
      }
      const buffer = await blob.arrayBuffer();
      const audioBuffer = await context.decodeAudioData(buffer.slice(0));
      return await new Promise((resolve, reject) => {
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.onended = () => {
          try { context.close(); } catch {}
          resolve();
        };
        source.onerror = () => {
          try { context.close(); } catch {}
          reject(new Error("No se pudo reproducir con AudioContext."));
        };
        source.start(0);
      });
    } catch (err) {
      try { context.close(); } catch {}
      throw err;
    }
  }

  function setLiveText(text, empty = false) {
    if (!els.liveText) return;
    const value = cleanText(text);
    els.liveText.textContent = value || (empty ? "Habla para empezar. Aquí aparecerá la última frase reconocida." : "");
    els.liveText.classList.toggle("empty", !value);
  }

  function updateUIState() {
    setPill(els.connectionChip, state.connected ? "Conectado" : "Desconectado", state.connected ? "ok" : "warn");
    setPill(els.recognitionChip, state.recognitionRunning ? "Escucha activa" : (state.connected ? "Esperando…" : "Escucha apagada"), state.recognitionRunning ? "ok" : "warn");
    setPill(els.ttsChip, state.playing ? "TTS reproduciendo" : (state.queue.length ? "TTS en cola" : "TTS inactivo"), state.playing ? "ok" : (state.queue.length ? "warn" : "warn"));
    setPill(els.queueChip, `${state.queue.length} en cola`, state.queue.length ? "warn" : "ok");
    setPill(els.micPill, state.micStream ? "Micrófono: listo" : "Micrófono: pendiente", state.micStream ? "ok" : "warn");
    setPill(els.outputPill, state.outputId ? "Salida: personalizada" : "Salida: navegador", state.outputId ? "ok" : "warn");
    setPill(els.enginePill, state.recognitionSupported ? "Motor: Web Speech API" : "Motor: no compatible", state.recognitionSupported ? "ok" : "err");
    if (els.statusLine) {
      const voice = getActiveVoice();
      els.statusLine.textContent = state.connected
        ? (state.playing ? `Hablando con ${voice?.label || "la voz elegida"}` : (state.recognitionRunning ? "Escuchando el micrófono" : "Reiniciando escucha"))
        : "Esperando conexión";
    }
    if (els.historyCount) els.historyCount.textContent = `${state.history.length} frase${state.history.length === 1 ? "" : "s"}`;
    if (els.voiceCountPill) els.voiceCountPill.textContent = `${state.voices.length} voz${state.voices.length === 1 ? "" : "es"}`;
    if (els.voiceSourceLabel) {
      els.voiceSourceLabel.textContent = state.loadingVoices
        ? "Fuente: cargando…"
        : (state.voiceLibrary === VOICE_LIBRARY_FISH ? "Fuente: Fish Audio" : "Fuente: StreamFusion");
    }
    updateVoiceModState();
  }

  function renderHistory() {
    if (!els.historyList) return;
    if (!state.history.length) {
      els.historyList.innerHTML = '<div class="empty">Todavía no hay texto final.</div>';
      return;
    }
    els.historyList.innerHTML = state.history.map((item) => `
      <div class="history-item">
        <div class="history-item-head">
          <span class="kind">Final</span>
          <span class="time">${nowLabel(item.ts)}</span>
        </div>
        <p>${escapeHtml(item.text)}</p>
      </div>
    `).join("");
  }

  function renderActivity() {
    if (!els.activityList) return;
    if (!state.activity.length) {
      els.activityList.innerHTML = '<div class="empty">Aquí aparecerán los eventos importantes.</div>';
      return;
    }
    els.activityList.innerHTML = state.activity.map((item) => `
      <div class="activity-item">
        <div class="activity-item-head">
          <span class="kind" style="color:${item.tone === "ok" ? "var(--good)" : item.tone === "err" ? "var(--bad)" : "var(--warn)"}">${escapeHtml(item.title)}</span>
          <span class="time">${nowLabel(item.ts)}</span>
        </div>
        <p>${escapeHtml(item.message)}</p>
      </div>
    `).join("");
  }

  function voiceTagsFor(voice) {
    const tags = Array.isArray(voice.tags) ? voice.tags.slice(0, 4) : [];
    const normalized = normalizeText(`${voice.label || ""} ${voice.source || ""} ${voice.description || ""}`);
    if (!tags.length) {
      if (normalized.includes("anime")) tags.push("anime");
      if (normalized.includes("streamer")) tags.push("streamer");
      if (normalized.includes("cartoon")) tags.push("cartoon");
      if (normalized.includes("musical")) tags.push("musical");
      if (normalized.includes("narrador")) tags.push("narrador");
      if (normalized.includes("comic")) tags.push("comic");
      if (normalized.includes("clasica")) tags.push("base");
    }
    return tags;
  }

  function matchesCategory(voice, filter) {
    if (!filter || filter === "all") return true;
    const tags = voiceTagsFor(voice).map(normalizeText);
    return tags.includes(filter) || normalizeText(voice.label).includes(filter) || normalizeText(voice.description).includes(filter);
  }

  function matchesSearch(voice, query) {
    if (!query) return true;
    const haystack = normalizeText([voice.label, voice.source, voice.description, ...(voice.tags || [])].join(" "));
    return haystack.includes(normalizeText(query));
  }

  function renderCategoryRow() {
    if (!els.categoryRow) return;
    const buttons = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
      const active = key === state.voiceFilter;
      return `<button class="chip ${active ? "active" : ""}" data-filter="${escapeHtml(key)}" type="button">${escapeHtml(label)}</button>`;
    });
    els.categoryRow.innerHTML = buttons.join("");
    els.categoryRow.querySelectorAll("button[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.voiceFilter = btn.dataset.filter || "all";
        saveState();
        renderCategoryRow();
        renderVoiceGrid();
      });
    });
  }

  function renderVoiceGrid() {
    if (!els.voiceGrid) return;
    const query = cleanText(state.voiceSearch);
    const filtered = state.voices
      .filter((voice) => (state.voiceLibrary === VOICE_LIBRARY_FISH ? voice.library === VOICE_LIBRARY_FISH : voice.library !== VOICE_LIBRARY_FISH))
      .filter((voice) => matchesCategory(voice, state.voiceFilter))
      .filter((voice) => matchesSearch(voice, query));

    if (!filtered.length) {
      els.voiceGrid.innerHTML = '<div class="voice-empty">No hay voces con ese filtro.</div>';
      updateUIState();
      return;
    }

    els.voiceGrid.innerHTML = filtered.map((voice) => {
      const selected = voice.id === state.pendingVoiceId;
      const confirmed = voice.id === state.confirmedVoiceId;
      const tags = voiceTagsFor(voice).slice(0, 4);
      const badge = voice.library === VOICE_LIBRARY_FISH ? `<span class="chip warn">Fish</span>` : `<span class="chip good">StreamFusion</span>`;
      const stateChip = confirmed
        ? `<span class="chip good">Activa</span>`
        : selected
          ? `<span class="chip warn">Pendiente</span>`
          : `<span class="chip">Lista</span>`;
      return `
        <button class="voice-card" type="button" data-voice-id="${escapeHtml(voice.id)}" data-selected="${selected ? "true" : "false"}">
          <strong>${escapeHtml(voice.label)}</strong>
          <small>${escapeHtml(voice.description || "Voz lista para usar en tiempo real.")}</small>
          <div class="footer">
            ${badge}
            ${stateChip}
            ${tags.map((tag) => `<span class="chip">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </button>
      `;
    }).join("");

    els.voiceGrid.querySelectorAll("button[data-voice-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const voice = state.voices.find((item) => item.id === btn.dataset.voiceId);
        if (voice) setVoice(voice);
      });
    });

    updateUIState();
  }

  function normalizeRemoteVoice(voice) {
    const id = String(voice?._id || voice?.id || "").trim();
    const label = String(voice?.title || voice?.name || voice?.display_name || id || "Voz remota").trim();
    const tags = Array.isArray(voice?.tags) ? voice.tags.map((t) => String(t).trim()).filter(Boolean) : [];
    const author = String(voice?.author?.nickname || voice?.author?.name || voice?.author || "Fish Audio").trim();
    const description = String(voice?.description || voice?.desc || "Voz remota disponible desde el servidor.").trim();
    return { id, label, tags, source: author || "Fish Audio", description, library: VOICE_LIBRARY_FISH };
  }

  function mergeVoiceLists(baseList, incomingList) {
    const seen = new Set();
    const merged = [];
    for (const item of [...(Array.isArray(baseList) ? baseList : []), ...(Array.isArray(incomingList) ? incomingList : [])]) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      merged.push(item);
    }
    return merged;
  }

  async function loadVoices() {
    state.loadingVoices = true;
    updateUIState();
    renderVoiceGrid();

    let nextVoices = [...FALLBACK_VOICES];
    try {
      const res = await fetch("/api/realtime-voice/voices?all=1&page_size=100");
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const remote = Array.isArray(data?.items) ? data.items.map(normalizeRemoteVoice).filter((item) => item.id && item.label) : [];
        if (remote.length) {
          nextVoices = mergeVoiceLists(FALLBACK_VOICES, remote);
          pushActivity("Voces cargadas", `El servidor devolvió ${remote.length} voces remotas y se conservaron las locales.`, "ok");
        } else {
          nextVoices = mergeVoiceLists(FALLBACK_VOICES, []);
          pushActivity("Voces", "La respuesta remota llegó vacía. Se usan voces locales.", "warn");
        }
      } else {
        nextVoices = mergeVoiceLists(FALLBACK_VOICES, []);
        pushActivity("Voces", "El servidor no respondió con el catálogo remoto. Se usan voces locales.", "warn");
      }
    } catch {
      nextVoices = mergeVoiceLists(FALLBACK_VOICES, []);
      pushActivity("Voces", "No se pudo cargar el catálogo remoto. Se usan voces locales.", "warn");
    }

    state.voices = nextVoices;

    const current = state.voices.find((voice) => voice.id === state.confirmedVoiceId)
      || state.voices.find((voice) => voice.id === state.selectedVoiceId)
      || state.voices[0]
      || null;
    if (current) {
      if (!state.confirmedVoiceId) {
        setVoice(current);
        confirmVoiceSelection(true);
      } else {
        state.pendingVoiceId = current.id;
        state.selectedVoice = current;
        state.selectedVoiceId = current.id;
        updateVoiceModState();
        renderSelectedVoiceChips(current.tags || []);
        if (els.selectedVoiceName) els.selectedVoiceName.textContent = current.label;
        if (els.selectedVoiceMeta) {
          const source = current.source || "StreamFusion";
          const desc = current.description || "Lista de voz lista para usar en tiempo real.";
          els.selectedVoiceMeta.textContent = `${source} • ${desc}`;
        }
      }
    }

    state.loadingVoices = false;
    renderCategoryRow();
    renderVoiceGrid();
    updateUIState();
  }

  async function loadStatus() {
    try {
      const res = await fetch("/api/realtime-voice/status");
      const data = await res.json().catch(() => ({}));
      state.api = {
        online: Boolean(data.online),
        apiKeyConfigured: Boolean(data.apiKeyConfigured),
        apiReachable: Boolean(data.apiReachable),
        voiceCount: Number(data.voiceCount || 0),
        model: String(data.model || ""),
        ttsEndpoint: String(data.ttsEndpoint || "/api/voicebot/tts"),
        recognition: "web",
      };

      if (state.api.apiKeyConfigured && state.api.apiReachable) {
        setPill(els.apiPill, `API: ${state.api.voiceCount || "ok"} voces`, "ok");
      } else if (!state.api.apiKeyConfigured) {
        setPill(els.apiPill, "API: sin clave Fish", "warn");
      } else {
        setPill(els.apiPill, "API: Fish no responde", "warn");
      }
    } catch {
      state.api = { online: false, apiKeyConfigured: false, apiReachable: false, voiceCount: 0, model: "", ttsEndpoint: "/api/voicebot/tts", recognition: "web" };
      setPill(els.apiPill, "API: fuera de línea", "err");
    }
    updateUIState();
  }

  function fillSelect(select, items, selectedValue, placeholder) {
    if (!select) return;
    const options = [];
    if (placeholder) options.push(`<option value="">${escapeHtml(placeholder)}</option>`);
    options.push(...items.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`));
    select.innerHTML = options.join("");
    if (selectedValue) select.value = selectedValue;
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      fillSelect(els.micSelect, [], "", "No compatible");
      fillSelect(els.outputSelect, [], "", "No compatible");
      return;
    }

    let devices = [];
    try {
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch {
      devices = [];
    }

    const mics = devices.filter((d) => d.kind === "audioinput");
    const outs = devices.filter((d) => d.kind === "audiooutput");

    fillSelect(
      els.micSelect,
      mics.map((d, idx) => ({ value: d.deviceId, label: d.label || `Micrófono ${idx + 1}` })),
      state.micId,
      "Micrófono del navegador"
    );
    fillSelect(
      els.outputSelect,
      outs.map((d, idx) => ({ value: d.deviceId, label: d.label || `Salida ${idx + 1}` })),
      state.outputId,
      "Salida predeterminada"
    );

    if (!state.micId && mics[0]) {
      state.micId = mics[0].deviceId;
      if (els.micSelect) els.micSelect.value = state.micId;
    }
    if (!state.outputId && outs[0]) {
      state.outputId = outs[0].deviceId;
      if (els.outputSelect) els.outputSelect.value = state.outputId;
    }
    updateUIState();
    saveState();
  }

  function createAudioMeter(stream) {
    cleanupAudioContext();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !stream) return;
    try {
      state.micAudioContext = new AC();
      state.micAnalyser = state.micAudioContext.createAnalyser();
      state.micAnalyser.fftSize = 512;
      const source = state.micAudioContext.createMediaStreamSource(stream);
      source.connect(state.micAnalyser);
      const data = new Uint8Array(state.micAnalyser.frequencyBinCount);
      const tick = () => {
        if (!state.micAnalyser) return;
        state.micAnalyser.getByteFrequencyData(data);
        let sum = 0;
        for (const value of data) sum += value;
        const avg = data.length ? sum / data.length : 0;
        const pct = Math.max(0, Math.min(100, Math.round((avg / 255) * 100)));
        if (els.micFill) els.micFill.style.width = `${pct}%`;
        if (els.micLevelText) els.micLevelText.textContent = `${pct}%`;
        if (state.playing) {
          const pulse = 50 + ((Math.sin(Date.now() / 120) + 1) / 2) * 50;
          if (els.outFill) els.outFill.style.width = `${Math.round(pulse)}%`;
          if (els.outLevelText) els.outLevelText.textContent = `${Math.round(pulse)}%`;
        } else {
          if (els.outFill) els.outFill.style.width = "0%";
          if (els.outLevelText) els.outLevelText.textContent = "0%";
        }
        state.meterRaf = requestAnimationFrame(tick);
      };
      state.meterRaf = requestAnimationFrame(tick);
    } catch {
      pushActivity("Micrófono", "No se pudo crear el medidor de entrada.", "warn");
    }
  }

  function cleanupAudioContext() {
    if (state.meterRaf) cancelAnimationFrame(state.meterRaf);
    state.meterRaf = 0;
    try { state.micAnalyser?.disconnect?.(); } catch {}
    try { state.micAudioContext?.close?.(); } catch {}
    state.micAnalyser = null;
    state.micAudioContext = null;
  }

  function stopMicStream() {
    if (state.micStream) {
      for (const track of state.micStream.getTracks()) {
        try { track.stop(); } catch {}
      }
    }
    state.micStream = null;
    cleanupAudioContext();
    if (els.micFill) els.micFill.style.width = "0%";
    if (els.micLevelText) els.micLevelText.textContent = "0%";
  }

  function setMode(mode) {
    state.mode = mode === "custom" ? "custom" : "web";
    els.modeWebBtn?.setAttribute("data-active", state.mode === "web" ? "true" : "false");
    els.modeCustomBtn?.setAttribute("data-active", state.mode === "custom" ? "true" : "false");
    if (els.advancedDevices) {
      els.advancedDevices.classList.toggle("hidden", state.mode !== "custom");
    }
    if (els.modeNote) {
      els.modeNote.innerHTML = state.mode === "web"
        ? 'En modo <strong>Solo web</strong> la página usa el micrófono activo del navegador y saca el audio por la salida predeterminada.'
        : 'En modo <strong>Personalizada</strong> puedes fijar la salida del audio y elegir una voz específica para cada sesión.';
    }
    saveState();
    pushActivity("Modo", state.mode === "web" ? "Solo web activado." : "Modo personalizada activado.", "ok");
  }

  function ensureRecognition() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    state.recognitionSupported = Boolean(Recognition);
    if (!Recognition) return null;
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = state.language || "es-PE";

    recognition.onstart = () => {
      state.recognitionRunning = true;
      updateUIState();
      setBanner("ok", "Escuchando y transcribiendo", "El navegador está reconociendo tu voz en tiempo real.");
    };

    recognition.onresult = (event) => {
      let interim = "";
      const finals = [];
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = cleanText(result[0]?.transcript || "");
        if (!text) continue;
        if (result.isFinal) finals.push(text);
        else interim += `${text} `;
      }

      state.interimText = cleanText(interim);
      if (state.interimText) {
        const liveEmotion = detectEmotion(state.interimText);
        state.liveEmotion = liveEmotion;
        setLiveText(formatLiveTranscript(state.interimText, liveEmotion), false);
        scheduleFastInterimFlush(state.interimText);
        setBanner("ok", "Reconociendo", `${liveEmotion.label} • fragmento vivo en tiempo real.`);
      }

      for (const fragment of finals) {
        commitFinalSegment(fragment);
      }

      if (!state.interimText && !finals.length && !state.history.length) {
        setLiveText("Habla para empezar. Aquí aparecerá la última frase reconocida.", true);
      }
    };

    recognition.onerror = (event) => {
      const err = String(event?.error || "error");
      const message = err === "no-speech"
        ? "No se detectó voz. El navegador seguirá intentando escuchar."
        : err === "not-allowed"
          ? "Permiso de micrófono denegado."
          : err === "network"
            ? "Error de red del reconocimiento."
            : err === "audio-capture"
              ? "No se pudo capturar el micrófono."
              : err === "service-not-allowed"
                ? "El navegador bloqueó el servicio de reconocimiento."
                : `SpeechRecognition: ${err}`;
      pushActivity("Reconocimiento", message, err === "not-allowed" || err === "service-not-allowed" ? "err" : "warn");

      if (err === "not-allowed" || err === "service-not-allowed") {
        setBanner("err", "Permiso requerido", "Activa el micrófono para que la transcripción funcione.");
        stopSession(false);
        return;
      }

      if (state.connected && !state.pausedForPlayback) {
        scheduleRecognitionRestart(err === "network" ? 120 : 70);
      }
    };

    recognition.onend = () => {
      state.recognitionRunning = false;
      updateUIState();
      if (state.connected && !state.pausedForPlayback) {
        scheduleRecognitionRestart(35);
      }
    };

    return recognition;
  }

  function scheduleRecognitionRestart(delay = 250) {
    clearTimeout(state.restartTimer);
    state.restartTimer = setTimeout(() => {
      if (!state.connected || state.pausedForPlayback || state.playing || !state.recognition) return;
      try {
        state.recognition.lang = state.language || "es-PE";
        state.recognition.start();
      } catch {
        scheduleRecognitionRestart(Math.min(delay + 250, 1500));
      }
    }, delay);
  }

  function startRecognition() {
    if (!state.recognition) state.recognition = ensureRecognition();
    if (!state.recognition) {
      setBanner("err", "Web Speech no disponible", "Usa Chrome o Edge para reconocer voz en tiempo real.");
      pushActivity("Motor", "SpeechRecognition no está disponible en este navegador.", "err");
      return;
    }
    try {
      state.recognition.lang = state.language || "es-PE";
      state.recognition.start();
    } catch {
      if (!startFallbackAsr()) {
        scheduleRecognitionRestart(90);
      }
    }
  }

  function stopRecognition() {
    clearTimeout(state.restartTimer);
    state.restartTimer = 0;
    clearTimeout(state.fastInterimTimer);
    state.fastInterimTimer = 0;
    if (state.recognition) {
      try { state.recognition.onend = null; } catch {}
      try { state.recognition.onresult = null; } catch {}
      try { state.recognition.onerror = null; } catch {}
      try { state.recognition.onstart = null; } catch {}
      try { state.recognition.stop(); } catch {}
    }
    state.recognition = null;
    state.recognitionRunning = false;
  }

  function pauseRecognitionForPlayback() {
    state.pausedForPlayback = false;
  }

  function resumeRecognitionAfterPlayback() {
    state.pausedForPlayback = false;
    if (state.connected && !state.recognitionRunning && !state.playing) scheduleRecognitionRestart(120);
  }

  async function sendAudioToAsr(blob) {
    if (!blob || !blob.size) return null;
    const form = new FormData();
    const mime = blob.type || "audio/webm";
    form.append("audio", blob, `chunk.${mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "m4a" : mime.includes("wav") ? "wav" : "webm"}`);
    form.append("language", state.language || "es-PE");
    form.append("ignore_timestamps", "true");

    const response = await fetch("/api/voicebot/asr", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(data.error || data.message || `ASR HTTP ${response.status}`));
    }
    const text = cleanText(data.text || data.transcript || data.result || data?.segments?.map((seg) => seg.text).filter(Boolean).join(" ") || data?.alternatives?.[0]?.transcript || "");
    return { text, raw: data };
  }

  function stopFallbackAsr() {
    clearTimeout(state.fallbackCycleTimer);
    state.fallbackCycleTimer = 0;
    state.fallbackMode = false;
    updateUIState();
    state.fallbackRecorder = null;
    state.fallbackChunks = [];
  }

  function startFallbackAsr() {
    state.fallbackMode = false;
    updateUIState();
    pushActivity("Reconocimiento", "ASR de respaldo desactivado; se usará solo Web Speech API.", "warn");
    return false;
  }

  function commitFinalSegment(text, source = "final") {
    const cleaned = cleanText(text);
    if (!cleaned) return;

    const normalized = normalizeText(cleaned);
    if (!normalized) return;

    const isDuplicate = normalized === state.lastFinalNorm && Date.now() - state.lastFinalAt < 1200;
    if (isDuplicate) return;

    const recentSpoken = state.lastSpokenNorm && normalized === state.lastSpokenNorm && Date.now() - (state.lastSpokenAt || 0) < 5000;
    if (recentSpoken) return;

    state.lastFinalNorm = normalized;
    state.lastFinalAt = Date.now();
    state.pendingSegments.push(cleaned);
    pushHistory(cleaned);
    const liveEmotion = detectEmotion(cleaned);
    state.liveEmotion = liveEmotion;
    setLiveText(formatLiveTranscript(cleaned, liveEmotion), false);
    setBanner("ok", source === "interim" ? "Fragmento rápido" : "Fragmento reconocido", `Se capturó: ${cleaned}`);

    clearTimeout(state.pendingFlushTimer);
    state.pendingFlushTimer = setTimeout(() => {
      flushPendingSegments();
    }, 60);
  }

  function flushPendingSegments() {
    clearTimeout(state.pendingFlushTimer);
    state.pendingFlushTimer = 0;
    const text = cleanText(state.pendingSegments.join(" "));
    state.pendingSegments = [];
    if (!text) return;
    enqueueTts(text);
  }

  function enqueueTts(text) {
    const cleaned = cleanText(text);
    if (!cleaned) return;
    state.queue.push(cleaned);
    updateUIState();
    if (!state.processingQueue) processQueue();
  }

  async function processQueue() {
    if (state.processingQueue) return;
    state.processingQueue = true;

    while (state.queue.length && state.connected) {
      const text = state.queue.shift();
      updateUIState();
      try {
        await speakText(text);
      } catch (err) {
        const message = String(err?.message || err || "Error TTS");
        pushActivity("TTS", message, "err");
        setBanner("err", "Error TTS", message);
      }
      updateUIState();
    }

    state.processingQueue = false;
    updateUIState();
  }

  async function speakText(text) {
    const voice = getActiveVoice();
    if (!voice) throw new Error("No hay voz seleccionada.");
    clearTimeout(state.fastInterimTimer);
    state.fastInterimTimer = 0;

    if (!state.api.apiKeyConfigured) {
      throw new Error("El servidor no tiene FISH_AUDIO_API_KEY configurada.");
    }

    const decorated = decorateTextForTts(text);
    state.lastSpokenNorm = normalizeText(text);
    state.lastSpokenAt = Date.now();
    state.ttsInFlight = true;
    state.playing = true;
    updateUIState();
    setBanner("ok", "Generando voz", `La frase se enviará con la voz ${voice.label}. Emoción: ${decorated.emotion.label}.`);

    let audio = null;
    let objectUrl = "";
    try {
      await unlockAudioPlayback();
      const response = await fetch(state.api.ttsEndpoint || "/api/voicebot/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: decorated.payload,
          voiceId: voice.id,
          emotion: decorated.emotion.emotion,
          emotionLabel: decorated.emotion.label,
          profanityFilter: true,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        let detail = "";
        if (contentType.includes("application/json")) {
          const data = await response.json().catch(() => ({}));
          detail = String(data.error || data.message || `HTTP ${response.status}`);
        } else {
          detail = String(await response.text().catch(() => "") || `HTTP ${response.status}`);
        }
        throw new Error(detail || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.size) {
        throw new Error("El servidor devolvió audio vacío.");
      }

      audio = new Audio();
      audio.preload = "auto";
      audio.playsInline = true;
      if (state.outputId && typeof audio.setSinkId === "function") {
        try {
          await audio.setSinkId(state.outputId);
        } catch {
          pushActivity("Salida", "No se pudo fijar la salida seleccionada. Se usará la predeterminada.", "warn");
        }
      }
      objectUrl = URL.createObjectURL(blob);
      state.playObjectUrl = objectUrl;
      audio.src = objectUrl;
      state.playAudio = audio;

      pushActivity("TTS", `Reproduciendo "${text.slice(0, 80)}${text.length > 80 ? "…" : ""}" con ${voice.label} (${decorated.emotion.label}).`, "ok");
      setPill(els.outputPill, state.outputId ? "Salida: personalizada" : "Salida: navegador", state.outputId ? "ok" : "warn");
      updateOutMeter(true);

      const endedPromise = new Promise((resolve, reject) => {
        audio.addEventListener("ended", resolve, { once: true });
        audio.addEventListener("error", () => reject(new Error("Error de reproducción.")), { once: true });
      });
      audio.onended = () => {
        try { URL.revokeObjectURL(objectUrl); } catch {}
        if (state.playObjectUrl === objectUrl) state.playObjectUrl = "";
        setBanner("ok", "Reproducción lista", `La voz ${voice.label} terminó de hablar.`);
      };
      audio.onerror = () => {
        try { URL.revokeObjectURL(objectUrl); } catch {}
        if (state.playObjectUrl === objectUrl) state.playObjectUrl = "";
        pushActivity("TTS", "Se produjo un error al reproducir el audio.", "err");
      };

      const startPromise = audio.play();
      if (startPromise && typeof startPromise.then === "function") {
        try {
          await startPromise;
        } catch (playErr) {
          pushActivity("TTS", `Reproducción HTML falló; usando AudioContext. ${String(playErr?.message || playErr || "")}`.trim(), "warn");
          await playBlobWithAudioContext(blob);
          return;
        }
      }
      await endedPromise;
    } finally {
      state.playing = false;
      state.ttsInFlight = false;
      state.pausedForPlayback = false;
      updateUIState();
      updateOutMeter(false);
      if (state.playObjectUrl && state.playObjectUrl === objectUrl) {
        try { URL.revokeObjectURL(state.playObjectUrl); } catch {}
        state.playObjectUrl = "";
      }
      state.playAudio = null;
    }
  }

  function updateOutMeter(active) {
    if (!els.outFill || !els.outLevelText) return;
    if (!active) {
      els.outFill.style.width = "0%";
      els.outLevelText.textContent = "0%";
      return;
    }
    const animate = () => {
      if (!state.playing) {
        els.outFill.style.width = "0%";
        els.outLevelText.textContent = "0%";
        return;
      }
      const pct = 55 + Math.round((Math.sin(Date.now() / 100) + 1) * 22);
      els.outFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      els.outLevelText.textContent = `${Math.max(0, Math.min(100, pct))}%`;
      if (state.playing) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  async function acquireMicPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Este navegador no soporta captura de audio.");
    }

    const makeConstraints = (withDevice) => ({
      audio: withDevice && state.micId
        ? {
            deviceId: { exact: state.micId },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
    });

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(makeConstraints(true));
    } catch (err) {
      if (state.micId) {
        pushActivity("Micrófono", "No se pudo forzar ese dispositivo; se usa el micrófono predeterminado.", "warn");
        stream = await navigator.mediaDevices.getUserMedia(makeConstraints(false));
      } else {
        throw err;
      }
    }

    stopMicStream();
    state.micStream = stream;
    createAudioMeter(stream);
    return stream;
  }

  async function connect() {
    if (state.connected) return;
    state.sessionId += 1;
    const session = state.sessionId;
    if (els.connectBtn) els.connectBtn.disabled = true;
    try {
      setBanner("warn", "Conectando", "Solicitando permisos de micrófono y desbloqueando el audio...");
      pushActivity("Conexión", "Solicitando acceso al micrófono y preparando la reproducción.", "warn");
      await loadStatus();
      await refreshDevices();
      await acquireMicPermission();
      await unlockAudioPlayback();
      if (!state.recognitionSupported) {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        state.recognitionSupported = Boolean(Recognition);
      }

      state.connected = true;
      state.pausedForPlayback = false;
      state.queue = [];
      state.pendingSegments = [];
      state.interimText = "";
      state.fastInterimText = "";
      state.fastInterimNorm = "";
      clearTimeout(state.fastInterimTimer);
      state.fastInterimTimer = 0;
      updateUIState();
      setBanner("ok", "Conectado", "La página está lista para reconocer tu voz y convertirla en otra voz en tiempo real.");
      pushActivity("Conexión", "Sesión iniciada correctamente.", "ok");
      updateLibraryButtons();
      startRecognition();
      saveState();
      if (session !== state.sessionId) return;
    } catch (err) {
      const msg = String(err?.message || err || "No se pudo conectar");
      setBanner("err", "No se pudo conectar", msg);
      pushActivity("Conexión", msg, "err");
      stopSession(false);
    } finally {
      if (els.connectBtn) els.connectBtn.disabled = state.connected;
    }
  }

  function stopSession(showBanner = true) {
    state.sessionId += 1;
    state.connected = false;
    state.pausedForPlayback = false;
    state.playing = false;
    state.ttsInFlight = false;
    clearTimeout(state.pendingFlushTimer);
    clearTimeout(state.restartTimer);
    state.pendingFlushTimer = 0;
    state.restartTimer = 0;
    state.queue = [];
    state.pendingSegments = [];
    state.interimText = "";
    state.fastInterimText = "";
    state.fastInterimNorm = "";
    clearTimeout(state.fastInterimTimer);
    state.fastInterimTimer = 0;
    stopRecognition();
    stopFallbackAsr();
    stopMicStream();
    if (state.playAudio) {
      try { state.playAudio.pause(); } catch {}
      state.playAudio = null;
    }
    if (state.playObjectUrl) {
      try { URL.revokeObjectURL(state.playObjectUrl); } catch {}
      state.playObjectUrl = "";
    }
    if (showBanner) {
      setBanner("warn", "Desconectado", "Pulsa Conectar para volver a escuchar y hablar con la voz elegida.");
    }
    updateUIState();
    saveState();
  }

  function bindUI() {
    els.connectBtn?.addEventListener("click", connect);
    els.disconnectBtn?.addEventListener("click", () => stopSession(true));
    els.refreshVoicesBtn?.addEventListener("click", async () => {
      pushActivity("Voces", "Recargando catálogo y dispositivos.", "ok");
      await loadVoices();
      await refreshDevices();
    });

    els.libraryStreamBtn?.addEventListener("click", () => {
      state.voiceLibrary = VOICE_LIBRARY_STREAMFUSION;
      saveState();
      renderVoiceGrid();
      updateLibraryButtons();
      pushActivity("Biblioteca", "Se muestran las voces de StreamFusion.", "ok");
    });

    els.libraryFishBtn?.addEventListener("click", () => {
      state.voiceLibrary = VOICE_LIBRARY_FISH;
      saveState();
      renderVoiceGrid();
      updateLibraryButtons();
      pushActivity("Biblioteca", "Se muestran las voces de Fish Audio.", "ok");
    });

    els.modeWebBtn?.addEventListener("click", () => setMode("web"));
    els.modeCustomBtn?.addEventListener("click", () => setMode("custom"));

    els.micSelect?.addEventListener("change", async () => {
      state.micId = String(els.micSelect.value || "");
      saveState();
      pushActivity("Micrófono", state.micId ? "Micrófono preferido actualizado." : "Micrófono en automático.", "ok");
      if (state.connected) {
        try {
          await acquireMicPermission();
        } catch (err) {
          pushActivity("Micrófono", String(err?.message || err || "No se pudo usar el micrófono."), "warn");
        }
      }
    });

    els.outputSelect?.addEventListener("change", () => {
      state.outputId = String(els.outputSelect.value || "");
      saveState();
      updateUIState();
      pushActivity("Salida", state.outputId ? "Salida personalizada activada." : "Salida del navegador restaurada.", "ok");
    });

    els.langSelect?.addEventListener("change", () => {
      state.language = String(els.langSelect.value || "es-PE");
      saveState();
      if (state.recognition) state.recognition.lang = state.language;
      pushActivity("Idioma", `Reconocimiento ajustado a ${state.language}.`, "ok");
    });

    els.voiceSearch?.addEventListener("input", () => {
      state.voiceSearch = cleanText(els.voiceSearch.value);
      saveState();
      renderVoiceGrid();
    });

    updateLibraryButtons();
  }

  function initVoiceSelection() {
    const voice = state.voices.find((item) => item.id === state.confirmedVoiceId)
      || state.voices.find((item) => item.id === state.selectedVoiceId)
      || state.voices[0];
    if (!voice) return;
    state.selectedVoice = voice;
    state.selectedVoiceId = voice.id;
    state.confirmedVoiceId = voice.id;
    state.pendingVoiceId = voice.id;
    state.awaitingModule = false;
    if (els.selectedVoiceName) els.selectedVoiceName.textContent = voice.label;
    if (els.selectedVoiceMeta) {
      const source = voice.source || "StreamFusion";
      const desc = voice.description || "Lista de voz lista para usar en tiempo real.";
      els.selectedVoiceMeta.textContent = `${source} • ${desc}`;
    }
    renderSelectedVoiceChips(voice.tags || []);
    updateVoiceModState();
    saveState();
  }

  async function init() {
    loadState();
    bindUI();
    state.recognitionSupported = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    state.sinkSupported = typeof HTMLMediaElement !== "undefined" && typeof HTMLMediaElement.prototype.setSinkId === "function";

    if (!state.sinkSupported) {
      setPill(els.outputPill, "Salida: navegador", "warn");
      if (els.deviceHint) {
        els.deviceHint.textContent = "Tu navegador no permite fijar la salida de audio por código. La reproducción se hará por la salida predeterminada.";
      }
    }

    if (els.voiceSearch) els.voiceSearch.value = state.voiceSearch || "";
    if (els.langSelect) els.langSelect.value = state.language || "es-PE";
    setMode(state.mode);
    updateLibraryButtons();
    renderCategoryRow();
    renderHistory();
    renderActivity();
    updateUIState();
    setLiveText("Habla para empezar. Aquí aparecerá la última frase reconocida.", true);

    if (!state.recognitionSupported) {
      setBanner("err", "Web Speech API no compatible", "Usa Chrome o Edge para obtener reconocimiento de voz en tiempo real.");
      setPill(els.enginePill, "Motor: no compatible", "err");
    } else {
      setBanner("warn", "Listo para escuchar", "Pulsa Conectar para activar el micrófono y empezar la sesión.");
    }

    await loadStatus();
    await loadVoices();
    await refreshDevices();
    initVoiceSelection();

    navigator.mediaDevices?.addEventListener?.("devicechange", async () => {
      await refreshDevices();
    });

    if ("permissions" in navigator && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({ name: "microphone" });
        if (status.state === "denied") {
          pushActivity("Permisos", "El navegador tiene el micrófono bloqueado.", "warn");
          setBanner("warn", "Permiso pendiente", "Necesitas aceptar el micrófono cuando pulses Conectar.");
        }
        status.onchange = () => {
          pushActivity("Permisos", `Estado del micrófono: ${status.state}.`, status.state === "granted" ? "ok" : "warn");
        };
      } catch {}
    }

    updateUIState();
    state.ready = true;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (state.playing && state.playAudio) {
        try { state.playAudio.pause(); } catch {}
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSession(false);
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = String(event?.reason?.message || event?.reason || "Promesa rechazada");
    pushActivity("Error", msg, "err");
  });

  init();
})();
