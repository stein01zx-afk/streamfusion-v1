(() => {
  const STORAGE_KEY = "streamfusion.voice.overlay.rebuilt.v1";

  const FALLBACK_VOICES = [
    { id: "5e503fc64ded446a9f8636b6009db547", label: "Verity", source: "StreamFusion", tags: ["base", "limpia", "neutra"], description: "Voz base balanceada para lectura general." },
    { id: "f3617f37b9e4453d84d6da6324ab3510", label: "Loquendo", source: "StreamFusion", tags: ["clasica", "retro", "narrador"], description: "Estilo clásico de narrador." },
    { id: "9f850ee9ada24b20a6866825eaefd3f8", label: "Goku", source: "StreamFusion", tags: ["anime", "energica", "heroe"], description: "Intensa, rápida y expresiva." },
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
    state.awaitingModule = true;
    if (!state.confirmedVoiceId) {
      state.confirmedVoiceId = voice.id;
      state.selectedVoice = voice;
      state.selectedVoiceId = voice.id;
      state.awaitingModule = false;
    }
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
    pushActivity("Voz preparada", `Se eligió ${voice.label}. Falta confirmar con MODULAR.`, "warn");
    showBannerNotice("warn", "Esperando confirmación de modulación", `Pulsa MODULAR para dejar activa la voz ${voice.label}.`);
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
    const pending = getVoiceById(state.pendingVoiceId) || confirmed;
    if (els.activeVoiceLabel) els.activeVoiceLabel.textContent = `Voz activa: ${confirmed?.label || "Sin voz"}`;
    if (els.pendingVoiceLabel) {
      els.pendingVoiceLabel.textContent = state.awaitingModule
        ? `Pendiente: ${pending?.label || "Sin voz"}`
        : `Modulación terminada, esperando nueva confirmación...`;
      els.pendingVoiceLabel.dataset.state = state.awaitingModule ? "warn" : "ok";
    }
    if (els.modularBtn) {
      els.modularBtn.disabled = !pending || pending.id === confirmed?.id && !state.awaitingModule;
      els.modularBtn.textContent = state.awaitingModule ? "MODULAR" : "REMODULAR";
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
      pushActivity("Modulación aplicada", `La voz ${voice.label} quedó activa.`, "ok");
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
    if (laughter || exclaim >= 2) return { emotion: "happy", marker: "[happy]", label: "Feliz" };
    if (angryWords || (upper && exclaim >= 1)) return { emotion: "angry", marker: "[angry]", label: "Enojo" };
    if (sadWords) return { emotion: "sad", marker: "[sad]", label: "Triste" };
    if (excitedWords || exclaim >= 1 || question >= 2) return { emotion: "excited", marker: "[excited]", label: "Entusiasta" };
    return { emotion: "neutral", marker: "", label: "Neutral" };
  }

  function decorateTextForTts(text) {
    const cleaned = cleanText(text);
    const emotion = detectEmotion(cleaned);
    const payload = emotion.marker ? `${emotion.marker} ${cleaned}` : cleaned;
    return { payload, emotion };
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
    setPill(els.enginePill, state.fallbackMode ? "Motor: ASR respaldo" : (state.recognitionSupported ? "Motor: Web Speech API" : "Motor: no compatible"), state.fallbackMode ? "warn" : (state.recognitionSupported ? "ok" : "err"));
    if (els.statusLine) {
      const voice = getActiveVoice();
      els.statusLine.textContent = state.connected
        ? (state.playing ? `Hablando con ${voice?.label || "la voz elegida"}` : (state.recognitionRunning ? "Escuchando el micrófono" : (state.awaitingModule ? "Esperando confirmación de modulación" : "Reiniciando escucha")))
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
          nextVoices = remote;
          pushActivity("Voces cargadas", `El servidor devolvió ${remote.length} voces remotas.`, "ok");
        } else {
          pushActivity("Voces", "La respuesta remota llegó vacía. Se usan voces locales.", "warn");
        }
      } else {
        pushActivity("Voces", "El servidor no respondió con el catálogo remoto. Se usan voces locales.", "warn");
      }
    } catch {
      pushActivity("Voces", "No se pudo cargar el catálogo remoto. Se usan voces locales.", "warn");
    }

    const seen = new Set();
    state.voices = nextVoices.filter((voice) => {
      if (!voice?.id || seen.has(voice.id)) return false;
      seen.add(voice.id);
      return true;
    });

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
        setLiveText(state.interimText, false);
        setBanner("ok", "Reconociendo", "El navegador sigue transcribiendo la frase actual.");
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
            : `SpeechRecognition: ${err}`;
      pushActivity("Reconocimiento", message, err === "not-allowed" ? "err" : "warn");
      if (err === "not-allowed" || err === "service-not-allowed") {
        setBanner("err", "Permiso requerido", "Activa el micrófono para que la transcripción funcione.");
        stopSession(false);
        return;
      }
      if (err === "network" || err === "language-not-supported" || err === "audio-capture") {
        if (state.connected && !state.pausedForPlayback) {
          stopRecognition();
          startFallbackAsr();
        }
        return;
      }
      if (state.connected && !state.pausedForPlayback) {
        scheduleRecognitionRestart(450);
      }
    };

    recognition.onend = () => {
      state.recognitionRunning = false;
      updateUIState();
      if (state.connected && !state.pausedForPlayback) {
        scheduleRecognitionRestart(250);
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
      setBanner("warn", "ASR de respaldo", "Web Speech no está disponible; se usará Fish Audio ASR.");
      pushActivity("Motor", "SpeechRecognition no está disponible. Se activa el respaldo.", "warn");
      startFallbackAsr();
      return;
    }
    try {
      state.recognition.lang = state.language || "es-PE";
      state.recognition.start();
    } catch {
      if (!startFallbackAsr()) {
        scheduleRecognitionRestart(300);
      }
    }
  }

  function stopRecognition() {
    clearTimeout(state.restartTimer);
    state.restartTimer = 0;
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
    state.pausedForPlayback = true;
    stopRecognition();
  }

  function resumeRecognitionAfterPlayback() {
    state.pausedForPlayback = false;
    if (state.connected) scheduleRecognitionRestart(300);
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
    if (state.fallbackRecorder) {
      try { state.fallbackRecorder.ondataavailable = null; } catch {}
      try { state.fallbackRecorder.onerror = null; } catch {}
      try { state.fallbackRecorder.onstop = null; } catch {}
      try { state.fallbackRecorder.stop(); } catch {}
    }
    state.fallbackRecorder = null;
    state.fallbackChunks = [];
  }

  function startFallbackAsr() {
    if (!state.micStream || !window.MediaRecorder) return false;
    if (state.fallbackMode) return true;
    state.fallbackMode = true;
    state.recognitionRunning = false;
    updateUIState();
    pushActivity("Reconocimiento", "Web Speech falló; se activa ASR de respaldo con Fish Audio.", "warn");
    showBannerNotice("warn", "ASR de respaldo activo", "Se transcribirá con Fish Audio mientras Web Speech no responda.");
    const startCycle = () => {
      if (!state.connected || !state.fallbackMode || !state.micStream) return;
      try {
        const recorder = new MediaRecorder(state.micStream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
        state.fallbackRecorder = recorder;
        state.fallbackChunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size) state.fallbackChunks.push(event.data);
        };
        recorder.onerror = (event) => {
          pushActivity("ASR", String(event?.error?.message || event?.error || "Error del grabador"), "err");
        };
        recorder.onstop = async () => {
          if (!state.connected || !state.fallbackMode) return;
          const blob = new Blob(state.fallbackChunks, { type: recorder.mimeType || "audio/webm" });
          state.fallbackChunks = [];
          if (blob.size) {
            try {
              const result = await sendAudioToAsr(blob);
              const text = cleanText(result?.text || "");
              if (text) {
                pushActivity("ASR", `Texto recuperado: ${text}`, "ok");
                state.interimText = "";
                commitFinalSegment(text);
              } else {
                pushActivity("ASR", "El respaldo no detectó texto útil.", "warn");
              }
            } catch (err) {
              pushActivity("ASR", String(err?.message || err || "No se pudo transcribir el audio."), "err");
            }
          }
          if (state.connected && state.fallbackMode) {
            state.fallbackCycleTimer = setTimeout(startCycle, 240);
          }
        };
        recorder.start();
        state.fallbackCycleTimer = setTimeout(() => {
          try { recorder.stop(); } catch {}
        }, 3200);
      } catch (err) {
        pushActivity("ASR", String(err?.message || err || "No se pudo iniciar el respaldo."), "err");
      }
    };
    startCycle();
    return true;
  }

  function commitFinalSegment(text) {
    const cleaned = cleanText(text);
    if (!cleaned) return;

    const normalized = normalizeText(cleaned);
    if (!normalized) return;

    const isDuplicate = normalized === state.lastFinalNorm && Date.now() - state.lastFinalAt < 1200;
    if (isDuplicate) return;

    state.lastFinalNorm = normalized;
    state.lastFinalAt = Date.now();
    state.pendingSegments.push(cleaned);
    pushHistory(cleaned);
    setLiveText(cleaned, false);
    setBanner("ok", "Fragmento reconocido", `Se capturó: ${cleaned}`);

    clearTimeout(state.pendingFlushTimer);
    state.pendingFlushTimer = setTimeout(() => {
      flushPendingSegments();
    }, 420);
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
    if (state.connected && !state.pausedForPlayback) {
      resumeRecognitionAfterPlayback();
    }
    updateUIState();
  }

  async function speakText(text) {
    const voice = getActiveVoice();
    if (!voice) throw new Error("No hay voz seleccionada.");

    if (!state.api.apiKeyConfigured) {
      throw new Error("El servidor no tiene FISH_AUDIO_API_KEY configurada.");
    }

    const decorated = decorateTextForTts(text);
    state.ttsInFlight = true;
    state.playing = true;
    updateUIState();
    pauseRecognitionForPlayback();
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
        resumeRecognitionAfterPlayback();
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
    const constraints = {
      audio: state.micId
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
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stopMicStream();
    state.micStream = stream;
    createAudioMeter(stream);
    return stream;
  }

  async function connect() {
    if (state.connected) return;
    state.sessionId += 1;
    const session = state.sessionId;
    try {
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

    els.modularBtn?.addEventListener("click", () => {
      const voice = confirmVoiceSelection(false);
      if (!voice) {
        pushActivity("Modulación", "No hay voz pendiente para confirmar.", "warn");
      }
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
