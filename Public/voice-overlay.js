
const STORAGE_KEY = "streamfusion.voice.overlay.v2";
const state = {
  mode: "web",
  micId: "",
  outputId: "",
  voiceId: "",
  connected: false,
  apiOk: false,
  apiReachable: false,
  singing: false,
  autoEmotion: true,
  transcript: "",
  latencyMs: 0,
  voiceSearch: "",
  busy: false,
};

const FALLBACK_VOICES = [
  { _id: "5e503fc64ded446a9f8636b6009db547", title: "Verity", tags: ["clean", "default"], author: { nickname: "StreamFusion" }, description: "Voz base" },
  { _id: "f3617f37b9e4453d84d6da6324ab3510", title: "Loquendo", tags: ["classic", "male"], author: { nickname: "StreamFusion" }, description: "Estilo clásico" },
  { _id: "9f850ee9ada24b20a6866825eaefd3f8", title: "Goku", tags: ["anime", "hero"], author: { nickname: "StreamFusion" }, description: "Energía alta" },
  { _id: "86bc0bf60af340a887cfb9629bd7047a", title: "Vegeta", tags: ["anime", "serious"], author: { nickname: "StreamFusion" }, description: "Tono fuerte" },
  { _id: "2358f01cb5b940008c7449c81fff95ad", title: "Bob Esponja", tags: ["funny", "cartoon"], author: { nickname: "StreamFusion" }, description: "Cómico" },
  { _id: "0bf1d759a4d342548d108fb2513413cc", title: "Shrek", tags: ["funny", "deep"], author: { nickname: "StreamFusion" }, description: "Grave y raro" },
  { _id: "c1569d1992204996802bb99a026bf64c", title: "Rick Sanchez", tags: ["nerdy", "chaotic"], author: { nickname: "StreamFusion" }, description: "Caótico" },
  { _id: "39382efbc7584d428f0f789d882cd3b8", title: "ElRubius", tags: ["streamer", "male"], author: { nickname: "StreamFusion" }, description: "Streamer" },
  { _id: "379d2b2fd78943bc86b94a5aca6ff35b", title: "Auronplay", tags: ["streamer", "male"], author: { nickname: "StreamFusion" }, description: "Streamer" },
  { _id: "dada7de849e641b79911c9c553c122b3", title: "Ibai", tags: ["streamer", "male"], author: { nickname: "StreamFusion" }, description: "Streamer" },
  { _id: "18d5dcc7904945569b728b88ddf0a1a1", title: "Messi", tags: ["sports", "soft"], author: { nickname: "StreamFusion" }, description: "Fino" },
  { _id: "251a9aeff7eb4e789917131416ce1a0b", title: "CR7", tags: ["sports", "strong"], author: { nickname: "StreamFusion" }, description: "Fuerte" },
];

const $ = (id) => document.getElementById(id);
const els = {
  apiBadge: $("apiBadge"),
  micBadge: $("micBadge"),
  voiceBadge: $("voiceBadge"),
  sinkBadge: $("sinkBadge"),
  micSelect: $("micSelect"),
  outputSelect: $("outputSelect"),
  activeVoice: $("activeVoice"),
  searchInput: $("searchInput"),
  voiceList: $("voiceList"),
  tagRow: $("tagRow"),
  voiceCountPill: $("voiceCountPill"),
  connectedPill: $("connectedPill"),
  singingPill: $("singingPill"),
  latencyPill: $("latencyPill"),
  styleBadge: $("styleBadge"),
  autoEmotionToggle: $("autoEmotionToggle"),
  transcript: $("transcript"),
  activityFeed: $("activityFeed"),
  inputFill: $("inputFill"),
  outputFill: $("outputFill"),
  inputLabel: $("inputLabel"),
  outputLabel: $("outputLabel"),
  voiceInfo: $("voiceInfo"),
  reloadBtn: $("reloadBtn"),
  startBtn: $("startBtn"),
  stopBtn: $("stopBtn"),
};

let micStream = null;
let recorder = null;
let micCtx = null;
let micAnalyser = null;
let outputAudio = null;
let outputCtx = null;
let outputAnalyser = null;
let meterFrame = 0;
let pitchFrame = 0;
let audioQueue = [];
let playing = false;
let flushTimer = 0;
let bufferText = "";
let transcriptFeed = [];
let activityFeed = [];
let voices = [];
let voiceTags = [];
let statusTimer = 0;
let selectedTag = "all";
let recognition = null;
let recognitionBuffer = "";
let recognitionTimer = 0;
let speechProfile = {
  rms: 0,
  pitch: 0,
  pitchAvg: 0,
  pitchSpread: 0,
  pitchHistory: [],
  singing: false,
  offKey: false,
  whisper: false,
  excited: false,
  angry: false,
  laughing: false,
  speaking: false,
  lastText: "",
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved && typeof saved === "object") Object.assign(state, saved);
  } catch {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    mode: state.mode,
    micId: state.micId,
    outputId: state.outputId,
    voiceId: state.voiceId,
    voiceSearch: state.voiceSearch,
    autoEmotion: state.autoEmotion,
  }));
}

function setBadge(el, text, stateName) {
  if (!el) return;
  el.textContent = text;
  el.dataset.state = stateName;
}

function setConnected(on) {
  state.connected = on;
  setBadge(els.connectedPill, on ? "Conectado" : "Desconectado", on ? "ok" : "warn");
  els.startBtn.disabled = on;
  els.stopBtn.disabled = !on;
  renderTranscriptPanel();
  renderActivityFeed();
}

function formatPct(value) {
  return `${Math.max(0, Math.min(100, Math.round(value || 0)))}%`;
}

function setTranscript(text, meta = {}) {
  const raw = cleanText(meta.raw ?? text ?? "");
  const styled = cleanText(meta.styled ?? "");
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
  const status = cleanText(meta.status ?? currentLiveModeLabel());
  state.transcript = raw || text || "";
  state.transcriptRaw = raw;
  state.transcriptStyled = styled;
  state.transcriptTags = tags;
  state.transcriptStatus = status;
  state.transcriptTone = meta.tone || (!state.connected ? "warn" : (state.busy ? "warn" : "ok"));
  renderTranscriptPanel(raw || text || "", { raw, styled, tags, status, tone: state.transcriptTone });
}

function setLatency(ms) {
  state.latencyMs = Math.max(0, Math.round(ms || 0));
  if (els.latencyPill) els.latencyPill.textContent = `${state.latencyMs} ms`;
  if (state.connected && Number.isFinite(state.latencyMs) && state.latencyMs > 0) {
    renderActivityFeed();
  }
}

function setSinging(on) {
  state.singing = Boolean(on);
  refreshSpeechBadges();
  renderTranscriptPanel();
}

function selectedMic() {
  return String(els.micSelect?.value || state.micId || "");
}

function selectedOutput() {
  return String(els.outputSelect?.value || state.outputId || "");
}

function selectedVoice() {
  return String(els.activeVoice?.value || state.voiceId || "");
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function normalizeSpeechText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function refreshSpeechBadges() {
  const autoOn = Boolean(state.autoEmotion);
  if (els.autoEmotionToggle) els.autoEmotionToggle.checked = autoOn;

  if (els.styleBadge) {
    let label = autoOn ? "Auto: emoción" : "Auto: manual";
    let tone = autoOn ? "ok" : "warn";
    if (autoOn) {
      if (speechProfile.laughing) label = "Auto: risa";
      else if (speechProfile.singing) label = speechProfile.offKey ? "Auto: canto / desafino" : "Auto: canto";
      else if (speechProfile.whisper) label = "Auto: susurro";
      else if (speechProfile.excited) label = "Auto: emocionado";
      else if (speechProfile.angry) label = "Auto: fuerte";
      else if (speechProfile.pitch > 0) label = "Auto: hablando";
    }
    setBadge(els.styleBadge, label, tone);
  }

  if (els.singingPill) {
    const label = state.singing
      ? (speechProfile.offKey ? "Canto / desafino" : "Canto")
      : (speechProfile.whisper ? "Susurro" : "Habla");
    els.singingPill.textContent = label;
    els.singingPill.className = `pill ${state.singing ? "warn" : "good"}`;
  }

  renderTranscriptPanel();
}

function updateSpeechProfile(rms, pitch, transcript = "") {
  const normText = normalizeSpeechText(transcript || speechProfile.lastText || "");
  const prevHistory = speechProfile.pitchHistory || [];
  const history = prevHistory.slice();
  const voiced = Number.isFinite(pitch) && pitch > 0;

  speechProfile.rms = Number.isFinite(rms) ? rms : 0;
  speechProfile.pitch = voiced ? pitch : 0;
  if (transcript) speechProfile.lastText = String(transcript);

  if (speechProfile.rms < 0.012) {
    history.length = 0;
  } else if (voiced) {
    history.push(pitch);
    while (history.length > 16) history.shift();
  } else if (history.length > 12) {
    history.splice(0, history.length - 12);
  }

  speechProfile.pitchHistory = history;
  const avg = history.length ? history.reduce((acc, value) => acc + value, 0) / history.length : 0;
  const spread = history.length > 1 ? Math.max(...history) - Math.min(...history) : 0;
  const strongVoice = speechProfile.rms > 0.018 && voiced;
  const melodic = history.length >= 5 && avg > 70 && avg < 1100;
  const singing = strongVoice && melodic && spread <= 34;
  const offKey = singing && spread > 18;
  const whisper = speechProfile.rms > 0.004 && speechProfile.rms < 0.018 && !voiced;
  const excited = speechProfile.rms > 0.055 || ((/!|¡/.test(normText)) && speechProfile.rms > 0.03) || (avg > 220 && speechProfile.rms > 0.03);
  const angry = speechProfile.rms > 0.045 && /!|¡/.test(normText) && avg > 90 && avg < 260;
  const laughing = /(?:j[aá]{2,}|j[eé]{2,}|j[ií]{2,}|lol|xd|lmao|rofl)/i.test(normText) || /(?:ha){3,}/i.test(normText);

  speechProfile.pitchAvg = avg;
  speechProfile.pitchSpread = spread;
  speechProfile.singing = singing;
  speechProfile.offKey = offKey;
  speechProfile.whisper = whisper;
  speechProfile.excited = excited;
  speechProfile.angry = angry;
  speechProfile.laughing = laughing;
  speechProfile.speaking = speechProfile.rms > 0.014 || voiced;
  state.singing = singing;
  refreshSpeechBadges();
  return speechProfile;
}

function inferEmotionTags(text) {
  if (!state.autoEmotion) return [];
  const norm = normalizeSpeechText(text);
  const tags = [];

  if (speechProfile.laughing || /(?:j[aá]{2,}|j[eé]{2,}|j[ií]{2,}|lol|xd|lmao|rofl)/i.test(norm)) tags.push("laughing");
  if (speechProfile.whisper || /(?:susurro|susurrando|whisper)/i.test(norm)) tags.push("whisper");
  if (speechProfile.singing || /(?:♪|♬|♫)/.test(text) || /(?:na){2,}|(?:la){2,}|(?:lo){2,}|(?:da){2,}/i.test(norm)) {
    tags.push("singing");
    if (speechProfile.offKey) tags.push("slightly off-key");
  }
  if (speechProfile.excited || /[!¡]{2,}/.test(text) || /(?:wow|genial|vamos|awesome|yes)/i.test(norm)) tags.push("excited");
  if (speechProfile.angry || /(?:enojado|furioso|rage|mad)/i.test(norm)) tags.push("angry");
  return [...new Set(tags)].slice(0, 2);
}

function buildSpeechPrompt(text) {
  const base = cleanText(text).slice(0, 220);
  if (!base) return "";
  const tags = inferEmotionTags(base);
  if (!tags.length) return base;
  const prefix = tags.map((tag) => `[${tag}]`).join(" ");
  return `${prefix} ${base}`.trim().slice(0, 260);
}

function buildVoiceTags(voice) {
  const base = [
    ...(voice?.tags || []),
    voice?.author?.nickname ? String(voice.author.nickname) : "",
  ].filter(Boolean);
  return [...new Set(base)].slice(0, 4);
}

function filterVoices() {
  const q = cleanText(state.voiceSearch).toLowerCase();
  const tag = selectedTag;
  return voices.filter((voice) => {
    const title = String(voice.title || "").toLowerCase();
    const desc = String(voice.description || "").toLowerCase();
    const author = String(voice.author?.nickname || "").toLowerCase();
    const tags = buildVoiceTags(voice).map((t) => String(t).toLowerCase());
    const matchesQuery = !q || title.includes(q) || desc.includes(q) || author.includes(q) || tags.some((t) => t.includes(q));
    const matchesTag = tag === "all" || tags.some((t) => t.includes(tag));
    return matchesQuery && matchesTag;
  });
}

function renderTagRow() {
  const pool = new Map();
  for (const voice of voices) {
    for (const tag of buildVoiceTags(voice)) {
      const normalized = String(tag).trim().toLowerCase();
      if (!normalized) continue;
      pool.set(normalized, (pool.get(normalized) || 0) + 1);
    }
  }
  const tags = ["all", ...[...pool.keys()].sort((a, b) => pool.get(b) - pool.get(a)).slice(0, 12)];
  voiceTags = tags;
  els.tagRow.innerHTML = tags.map((tag) => `
    <button class="pill ${selectedTag === tag ? "good" : ""}" type="button" data-tag="${tag}">${tag === "all" ? "Todas" : tag} ${tag === "all" ? "" : `(${pool.get(tag) || 0})`}</button>
  `).join("");
}

function renderVoiceCards() {
  const filtered = filterVoices();
  els.voiceCountPill.textContent = `${filtered.length} voces`;
  if (!filtered.length) {
    els.voiceList.innerHTML = `<div class="note">No hubo coincidencias. Prueba otro término.</div>`;
    return;
  }
  els.voiceList.innerHTML = filtered.map((voice) => {
    const tags = buildVoiceTags(voice);
    const selected = String(voice._id) === String(state.voiceId);
    return `
      <article class="voice-card" data-selected="${selected}" data-voice-id="${voice._id}">
        <strong>${escapeHtml(voice.title || "Sin nombre")}</strong>
        <small>${escapeHtml(voice.author?.nickname || "Fish Audio")}</small>
        <small>${escapeHtml(voice.description || "Voz disponible para usar en el overlay.")}</small>
        <div class="voice-tags">${tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
      </article>
    `;
  }).join("");
}

function renderVoiceSelect() {
  const list = voices.length ? voices : FALLBACK_VOICES;
  if (els.activeVoice) {
    const current = selectedVoice();
    els.activeVoice.innerHTML = list.map((v) => `<option value="${v._id}">${escapeHtml(v.title || v._id)}</option>`).join("");
    if (list.some((v) => String(v._id) === String(current))) {
      els.activeVoice.value = current;
    } else if (list.length) {
      els.activeVoice.value = list[0]._id;
      state.voiceId = list[0]._id;
      saveState();
    }
  }
  syncVoiceStatus();
}

function syncVoiceStatus() {
  const selected = voices.find((v) => String(v._id) === String(state.voiceId)) || FALLBACK_VOICES.find((v) => String(v._id) === String(state.voiceId));
  if (selected) {
    setBadge(els.voiceBadge, `Voz: ${selected.title}`, "ok");
    if (els.voiceInfo) els.voiceInfo.textContent = `${selected.title} — ${selected.description || "Lista para usar"}`;
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function currentLiveModeLabel() {
  if (!state.connected) return "Esperando conexión";
  if (state.busy) return "Procesando voz";
  if (speechProfile.laughing) return "Riendo";
  if (speechProfile.singing) return speechProfile.offKey ? "Cantando / desafino" : "Cantando";
  if (speechProfile.whisper) return "Susurrando";
  if (speechProfile.excited) return "Emocionado";
  if (speechProfile.angry) return "Intenso";
  if (speechProfile.pitch > 0) return "Hablando";
  return "Escuchando";
}

function chipClassForTag(tag) {
  const t = String(tag || "").toLowerCase();
  if (t.includes("sing")) return "warn";
  if (t.includes("whisper")) return "alt";
  if (t.includes("laugh") || t.includes("excited") || t.includes("happy")) return "alt";
  if (t.includes("angry") || t.includes("off-key") || t.includes("off key")) return "bad";
  return "";
}

function decorateTranscriptText(value) {
  const text = escapeHtml(value || "");
  return text
    .replace(/\[(.*?)\]/g, '<span class="transcript-emotion">[$1]</span>')
    .replace(/(♪|♬|♫)/g, '<span class="transcript-emotion">$1</span>');
}

function transcriptTimeStamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderTranscriptPanel(rawText = "", meta = {}) {
  if (!els.transcript) return;

  const raw = cleanText(meta.raw ?? rawText ?? state.transcript ?? "");
  const styled = cleanText(meta.styled ?? state.transcriptStyled ?? "");
  const tags = [...new Set((meta.tags ?? state.transcriptTags ?? []).map((tag) => cleanText(tag)).filter(Boolean))].slice(0, 4);
  const status = cleanText(meta.status ?? state.transcriptStatus ?? currentLiveModeLabel());
  const statusTone = meta.tone || (!state.connected ? "warn" : (state.busy ? "warn" : "ok"));

  const currentText = styled || raw || "";
  const rawBox = raw ? decorateTranscriptText(raw) : '<span class="transcript-empty">Aún no hay texto detectado.</span>';
  const styledBox = currentText ? decorateTranscriptText(currentText) : '<span class="transcript-empty">Aquí aparecerá la versión enriquecida con emociones.</span>';
  const chips = tags.length
    ? tags.map((tag) => `<span class="transcript-chip ${chipClassForTag(tag)}">${escapeHtml(tag)}</span>`).join("")
    : '<span class="transcript-chip">neutral</span>';

  const feedHtml = transcriptFeed.length
    ? transcriptFeed.map((entry) => {
        const entryTags = entry.tags && entry.tags.length
          ? entry.tags.map((tag) => `<span class="transcript-chip ${chipClassForTag(tag)}">${escapeHtml(tag)}</span>`).join("")
          : '<span class="transcript-chip">neutral</span>';
        return `
          <div class="transcript-item">
            <div class="transcript-item-head">
              <div class="transcript-chips">${entryTags}</div>
              <span class="transcript-item-time">${escapeHtml(entry.time || "")}</span>
            </div>
            <div class="transcript-text">${decorateTranscriptText(entry.raw || "")}</div>
            ${entry.styled && entry.styled !== entry.raw ? `<div class="transcript-text transcript-note">→ ${decorateTranscriptText(entry.styled)}</div>` : ""}
          </div>`;
      }).join("")
    : '<div class="transcript-empty">Las frases capturadas aparecerán aquí.</div>';

  els.transcript.innerHTML = `
    <div class="transcript-head">
      <span class="transcript-status ${statusTone}">${escapeHtml(status)}</span>
      <span class="transcript-chip ${state.autoEmotion ? 'alt' : ''}">${state.autoEmotion ? 'Auto emotion' : 'Manual'}</span>
    </div>
    <div class="transcript-live">${decorateTranscriptText(currentText || raw)}</div>
    <div class="transcript-grid">
      <div class="transcript-box">
        <div class="transcript-label">Lo que detectó</div>
        <div class="transcript-text">${rawBox}</div>
      </div>
      <div class="transcript-box">
        <div class="transcript-label">Cómo se enviará</div>
        <div class="transcript-text">${styledBox}</div>
      </div>
    </div>
    <div class="transcript-chips">${chips}</div>
    <div class="transcript-feed">${feedHtml}</div>
  `;
}

function pushTranscriptFeed(raw, styled, tags, status) {
  transcriptFeed.unshift({
    raw: cleanText(raw),
    styled: cleanText(styled),
    tags: Array.isArray(tags) ? tags.slice(0, 4) : [],
    status: cleanText(status),
    time: transcriptTimeStamp(),
  });
  transcriptFeed = transcriptFeed.slice(0, 5);
}

function pushActivity(title, message, tone = "ok") {
  activityFeed.unshift({
    title: cleanText(title) || "Actividad",
    message: cleanText(message),
    tone,
    time: transcriptTimeStamp(),
  });
  activityFeed = activityFeed.slice(0, 8);
  renderActivityFeed();
}

function renderActivityFeed() {
  if (!els.activityFeed) return;
  if (!activityFeed.length) {
    els.activityFeed.innerHTML = '<div class="realtimeActivityEmpty">Aquí aparecerán los cambios importantes.</div>';
    return;
  }
  els.activityFeed.innerHTML = activityFeed.map((entry) => `
    <div class="realtimeActivityItem" data-tone="${escapeHtml(entry.tone || 'ok')}">
      <div class="realtimeActivityItemHead">
        <span class="realtimeActivityItemTitle">${escapeHtml(entry.title)}</span>
        <span class="realtimeActivityItemMeta">${escapeHtml(entry.time || '')}</span>
      </div>
      <div class="realtimeActivityItemBody">${escapeHtml(entry.message || '')}</div>
    </div>
  `).join('');
}

function supportsSpeechRecognition() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function stopSpeechRecognition() {
  if (recognition) {
    try { recognition.onend = null; recognition.stop(); } catch {}
    recognition = null;
  }
  clearTimeout(recognitionTimer);
  recognitionTimer = 0;
  recognitionBuffer = "";
}

function scheduleRecognitionFlush() {
  clearTimeout(recognitionTimer);
  recognitionTimer = window.setTimeout(() => flushRecognitionBuffer(true), 420);
}

function appendRecognitionText(text) {
  const cleaned = cleanText(text);
  if (!cleaned) return;
  recognitionBuffer = [recognitionBuffer, cleaned].filter(Boolean).join(" ").trim();
  speechProfile.lastText = recognitionBuffer;
  const tags = inferEmotionTags(recognitionBuffer);
  const styled = buildSpeechPrompt(recognitionBuffer) || recognitionBuffer;
  setTranscript(recognitionBuffer, {
    raw: recognitionBuffer,
    styled,
    tags,
    status: currentLiveModeLabel(),
    tone: state.connected ? "ok" : "warn",
  });
  scheduleRecognitionFlush();
}

async function flushRecognitionBuffer(force = false) {
  const text = cleanText(recognitionBuffer);
  if (!text) return;
  if (!force && text.length < 7) return;
  recognitionBuffer = "";
  bufferText = text;
  await flushTranscript(true);
}

function startSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return false;
  stopSpeechRecognition();
  recognition = new SR();
  recognition.lang = "es-ES";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event) => {
    let finalChunk = "";
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      const transcript = result[0]?.transcript || "";
      if (result.isFinal) finalChunk += `${transcript} `;
      else interim += `${transcript} `;
    }
    const preview = cleanText([recognitionBuffer, interim, finalChunk].join(" "));
    if (preview) {
      speechProfile.lastText = preview;
      setTranscript(preview, {
        raw: preview,
        styled: buildSpeechPrompt(preview) || preview,
        tags: inferEmotionTags(preview),
        status: currentLiveModeLabel(),
        tone: state.connected ? "ok" : "warn",
      });
    }
    if (finalChunk.trim()) appendRecognitionText(finalChunk);
  };
  recognition.onerror = (event) => {
    console.warn("SpeechRecognition error", event?.error || event);
    if (state.connected) setTranscript(`Reconocimiento: ${event?.error || "error"}`);
  };
  recognition.onend = () => {
    if (!state.connected) return;
    try {
      recognition?.start();
    } catch {}
  };
  try {
    recognition.start();
    return true;
  } catch (err) {
    console.warn("No se pudo iniciar SpeechRecognition.", err);
    stopSpeechRecognition();
    return false;
  }
}

async function fetchStatus() {
  try {
    const res = await fetch("/api/realtime-voice/status");
    const data = await res.json();
    state.apiOk = Boolean(data.apiKeyConfigured);
    state.apiReachable = Boolean(data.apiReachable);
    setBadge(els.apiBadge, state.apiOk ? `API: lista · ${data.voiceCount || 0} voces` : "API: falta FISH_AUDIO_API_KEY", state.apiOk ? "ok" : "err");
    setBadge(els.sinkBadge, typeof HTMLMediaElement.prototype.setSinkId === "function" ? "Salida: personalizable" : "Salida: limitada por navegador", typeof HTMLMediaElement.prototype.setSinkId === "function" ? "ok" : "warn");
  } catch {
    state.apiOk = false;
    state.apiReachable = false;
    setBadge(els.apiBadge, "API: sin conexión", "err");
  }
}

async function fetchVoices() {
  try {
    setBadge(els.voiceBadge, "Voces: cargando…", "warn");
    const url = new URL("/api/realtime-voice/voices", window.location.origin);
    url.searchParams.set("all", "1");
    url.searchParams.set("page_size", "100");
    url.searchParams.set("sort_by", "score");
    const res = await fetch(url);
    const data = await res.json();
    voices = Array.isArray(data.items) && data.items.length ? data.items : FALLBACK_VOICES;
    setBadge(els.voiceBadge, `Voz: ${voices.length} disponibles`, voices.length ? "ok" : "warn");
  } catch {
    voices = FALLBACK_VOICES;
    setBadge(els.voiceBadge, `Voz: fallback (${voices.length})`, "warn");
  }
  renderVoiceSelect();
  renderTagRow();
  renderVoiceCards();
}

async function refreshDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics = devices.filter((d) => d.kind === "audioinput");
  const outs = devices.filter((d) => d.kind === "audiooutput");

  els.micSelect.innerHTML = [`<option value="">Micrófono predeterminado</option>`, ...mics.map((d, i) => `<option value="${d.deviceId}">${escapeHtml(d.label || `Micrófono ${i + 1}`)}</option>`)].join("");
  els.outputSelect.innerHTML = [`<option value="">Salida predeterminada</option>`, ...outs.map((d, i) => `<option value="${d.deviceId}">${escapeHtml(d.label || `Salida ${i + 1}`)}</option>`)].join("");
  if ([...els.micSelect.options].some((opt) => opt.value === state.micId)) els.micSelect.value = state.micId;
  if ([...els.outputSelect.options].some((opt) => opt.value === state.outputId)) els.outputSelect.value = state.outputId;
  setBadge(els.micBadge, mics.length ? `Micrófono: ${mics.length} detectados` : "Micrófono: no detectado", mics.length ? "ok" : "warn");
}

async function ensureMicPermission() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Tu navegador no permite capturar audio.");
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: state.mode === "custom" && selectedMic() ? { deviceId: { exact: selectedMic() } } : true,
  });
  stream.getTracks().forEach((track) => track.stop());
}

async function startSession() {
  if (state.busy) return;
  state.busy = true;
  try {
    await fetchStatus();
    await ensureMicPermission();
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: state.mode === "custom" && selectedMic() ? { deviceId: { exact: selectedMic() } } : true,
    });
    await refreshDevices();
    setupAudioGraph();
    const usedSpeechRecognition = startSpeechRecognition();
    if (!usedSpeechRecognition) {
      await startRecorder();
    }
    setConnected(true);
    setTranscript(state.autoEmotion ? "Escuchando… habla y el sistema añadirá emoción automáticamente." : "Escuchando… habla y la voz cambiará en tiempo real.");
    pushActivity("Conectado", state.autoEmotion ? "Transcripción activa con emoción automática." : "Transcripción activa en modo manual.", "ok");
    setLatency(0);
    setSinging(false);
    setBadge(els.apiBadge, state.apiReachable ? "API: lista" : "API: lista", state.apiReachable ? "ok" : "warn");
    updateModeUI();
    pushActivity("Estado", "Micrófono listo y escuchando.", "ok");
  } catch (err) {
    console.error(err);
    stopSession(true);
    setConnected(false);
    setTranscript(err?.message || "No se pudo conectar.");
    setBadge(els.apiBadge, err?.message || "Error", "err");
    pushActivity("Error", err?.message || "No se pudo conectar.", "bad");
  } finally {
    state.busy = false;
  }
}

async function startRecorder() {
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
  recorder = mimeType ? new MediaRecorder(micStream, { mimeType }) : new MediaRecorder(micStream);
  recorder.ondataavailable = async (event) => {
    if (!event.data || !event.data.size || !state.connected) return;
    const started = performance.now();
    try {
      const transcript = await transcribeChunk(event.data);
      setLatency(performance.now() - started);
      if (transcript) pushTranscript(transcript);
    } catch (err) {
      console.warn("ASR falló", err);
      const msg = String(err?.message || err || "");
      if (/402|Payment Required|credits|crédit|plan/i.test(msg)) {
        setTranscript("Transcripción ASR no disponible en tu cuenta. Se seguirá usando reconocimiento del navegador si está disponible.");
      }
    }
  };
  recorder.start(650);
}

async function transcribeChunk(blob) {
  const base64 = await blobToBase64(blob);
  const res = await fetch("/api/voicebot/asr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64: base64, mimeType: blob.type || "audio/webm", language: "es", ignore_timestamps: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 402) throw new Error(data?.error || "Fish Audio ASR requiere plan/créditos activos.");
    throw new Error(data?.error || "ASR falló");
  }
  return cleanText(data?.text || "");
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el audio."));
    reader.readAsDataURL(blob);
  });
}

function pushTranscript(text) {
  const cleaned = cleanText(text);
  if (!cleaned) return;
  bufferText = [bufferText, cleaned].filter(Boolean).join(" ").trim();
  speechProfile.lastText = bufferText;
  const tags = inferEmotionTags(bufferText);
  const styled = buildSpeechPrompt(bufferText) || bufferText;
  setTranscript(bufferText, {
    raw: bufferText,
    styled,
    tags,
    status: currentLiveModeLabel(),
    tone: state.connected ? "ok" : "warn",
  });
  clearTimeout(flushTimer);
  const forceFlush = /[.!?¿¡]$/.test(bufferText) || state.singing || speechProfile.excited || speechProfile.laughing;
  flushTimer = window.setTimeout(() => flushTranscript(true), forceFlush ? 150 : 260);
}

async function flushTranscript(force = false) {
  const text = cleanText(bufferText);
  if (!text) return;
  if (!force && text.length < 7) return;
  const styled = buildSpeechPrompt(text) || text;
  const tags = inferEmotionTags(text);
  pushTranscriptFeed(text, styled, tags, currentLiveModeLabel());
  bufferText = "";
  state.busy = true;
  setTranscript(text, {
    raw: text,
    styled,
    tags,
    status: "Procesando voz",
    tone: "warn",
  });
  await speakText(styled || text);
}

async function speakText(text) {
  const voiceId = selectedVoice();
  const t0 = performance.now();
  const alreadyStyled = /^\s*\[[^\]]+\]/.test(String(text || ""));
  const prepared = alreadyStyled ? cleanText(text).slice(0, 260) : (buildSpeechPrompt(text) || cleanText(text));
  state.busy = true;
  renderTranscriptPanel();
  try {
    const res = await fetch("/api/voicebot/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: prepared, voiceId, profanityFilter: true }),
    });
    const blob = await res.blob();
    if (!res.ok) {
      const errText = await blob.text().catch(() => "Error TTS");
      throw new Error(errText || "Error TTS");
    }
    setLatency(performance.now() - t0);
    queueAudio(blob);
    setTranscript(prepared, {
      raw: cleanText(bufferText) || state.transcriptRaw || prepared,
      styled: prepared,
      tags: inferEmotionTags(prepared),
      status: "Voz en curso",
      tone: "ok",
    });
  } finally {
    state.busy = false;
    renderTranscriptPanel();
  }
}

function queueAudio(blob) {
  audioQueue.push(blob);
  if (!playing) playNextAudio();
}

async function playNextAudio() {
  if (!audioQueue.length) {
    playing = false;
    updateOutputMeter(false);
    return;
  }
  playing = true;
  const blob = audioQueue.shift();
  if (!blob) return playNextAudio();

  const url = URL.createObjectURL(blob);

  if (!outputAudio) {
    outputAudio = new Audio();
    outputAudio.autoplay = false;
    outputAudio.preload = "auto";
    outputAudio.volume = 1;
    outputAudio.playsInline = true;
    outputAudio.muted = false;
    try {
      outputCtx = new AudioContext();
      outputAnalyser = outputCtx.createAnalyser();
      outputAnalyser.fftSize = 256;
      const source = outputCtx.createMediaElementSource(outputAudio);
      source.connect(outputAnalyser);
      outputAnalyser.connect(outputCtx.destination);
    } catch (err) {
      console.warn("No se pudo crear el grafo de salida", err);
    }
  }

  if (outputCtx && outputCtx.state === "suspended") {
    try { await outputCtx.resume(); } catch {}
  }

  if (selectedOutput() && typeof outputAudio.setSinkId === "function") {
    try { await outputAudio.setSinkId(selectedOutput()); } catch {}
  }

  outputAudio.src = url;
  outputAudio.onloadeddata = async () => {
    try {
      if (outputCtx && outputCtx.state === "suspended") await outputCtx.resume();
    } catch {}
  };
  outputAudio.onended = () => {
    URL.revokeObjectURL(url);
    playNextAudio();
  };

  try {
    await outputAudio.play();
  } catch (err) {
    console.warn("No se pudo reproducir el audio", err);
    URL.revokeObjectURL(url);
    playNextAudio();
  }
}

function setupAudioGraph() {
  if (!micStream) return;
  if (!micCtx) {
    micCtx = new AudioContext();
    const src = micCtx.createMediaStreamSource(micStream);
    micAnalyser = micCtx.createAnalyser();
    micAnalyser.fftSize = 2048;
    src.connect(micAnalyser);
  }
  if (outputCtx && outputCtx.state === "suspended") outputCtx.resume().catch(() => {});
  if (micCtx && micCtx.state === "suspended") micCtx.resume().catch(() => {});
  startMeters();
  startPitchDetector();
}

function startMeters() {
  cancelAnimationFrame(meterFrame);
  const micData = new Uint8Array(micAnalyser?.frequencyBinCount || 128);
  const outData = new Uint8Array(outputAnalyser?.frequencyBinCount || 128);
  const tick = () => {
    if (micAnalyser) {
      micAnalyser.getByteFrequencyData(micData);
      const level = micData.reduce((sum, val) => sum + val, 0) / (micData.length * 255) * 100;
      els.inputFill.style.width = `${Math.max(2, level)}%`;
      els.inputLabel.textContent = formatPct(level);
    }
    if (outputAnalyser) {
      outputAnalyser.getByteFrequencyData(outData);
      const level = outData.reduce((sum, val) => sum + val, 0) / (outData.length * 255) * 100;
      els.outputFill.style.width = `${Math.max(2, level)}%`;
      els.outputLabel.textContent = formatPct(level);
    } else if (outputAudio) {
      const pulse = outputAudio.paused ? 6 : 48;
      els.outputFill.style.width = `${pulse}%`;
      els.outputLabel.textContent = formatPct(pulse);
    }
    meterFrame = requestAnimationFrame(tick);
  };
  tick();
}

function startPitchDetector() {
  cancelAnimationFrame(pitchFrame);
  const analyser = micAnalyser;
  if (!analyser) return;
  const buffer = new Float32Array(analyser.fftSize);
  const tick = () => {
    analyser.getFloatTimeDomainData(buffer);
    const rms = Math.sqrt(buffer.reduce((sum, val) => sum + val * val, 0) / buffer.length);
    const pitch = autoCorrelate(buffer, micCtx.sampleRate);
    updateSpeechProfile(rms, pitch, bufferText || speechProfile.lastText || "");
    pitchFrame = requestAnimationFrame(tick);
  };
  tick();
}

function autoCorrelate(buffer, sampleRate) {
  let size = buffer.length;
  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.02) return -1;
  let r1 = 0, r2 = size - 1;
  const threshold = 0.2;
  for (let i = 0; i < size / 2; i++) { if (Math.abs(buffer[i]) < threshold) { r1 = i; break; } }
  for (let i = 1; i < size / 2; i++) { if (Math.abs(buffer[size - i]) < threshold) { r2 = size - i; break; } }
  buffer = buffer.slice(r1, r2);
  size = buffer.length;
  const c = new Array(size).fill(0);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size - i; j++) c[i] += buffer[j] * buffer[j + i];
  }
  let d = 0;
  while (d < size - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < size; i++) {
    if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  }
  if (maxpos <= 0) return -1;
  return sampleRate / maxpos;
}

function updateModeUI() {
  document.querySelectorAll(".mode-switch button[data-mode]").forEach((btn) => {
    const active = btn.dataset.mode === state.mode;
    btn.dataset.active = String(active);
  });
  const custom = state.mode === "custom";
  els.outputSelect.disabled = !custom;
  els.micSelect.disabled = false;
  setBadge(els.sinkBadge, custom ? "Salida: personalizada" : "Salida: web (altavoces)", custom ? "ok" : "warn");
  refreshSpeechBadges();
}

async function stopSession(silent = false) {
  clearTimeout(flushTimer);
  flushTimer = 0;
  bufferText = "";
  stopSpeechRecognition();
  if (recorder && recorder.state !== "inactive") {
    try { recorder.stop(); } catch {}
  }
  recorder = null;
  if (micStream) {
    micStream.getTracks().forEach((track) => track.stop());
    micStream = null;
  }
  cancelAnimationFrame(meterFrame);
  cancelAnimationFrame(pitchFrame);
  meterFrame = 0;
  pitchFrame = 0;
  if (micAnalyser) {
    try { micAnalyser.disconnect(); } catch {}
    micAnalyser = null;
  }
  if (micCtx) {
    try { await micCtx.close(); } catch {}
    micCtx = null;
  }
  if (outputAudio) {
    try { outputAudio.pause(); } catch {}
  }
  audioQueue = [];
  playing = false;
  speechProfile = {
    rms: 0,
    pitch: 0,
    pitchAvg: 0,
    pitchSpread: 0,
    pitchHistory: [],
    singing: false,
    offKey: false,
    whisper: false,
    excited: false,
    angry: false,
    laughing: false,
    speaking: false,
    lastText: "",
  };
  setConnected(false);
  setSinging(false);
  setLatency(0);
  els.inputFill.style.width = "0%";
  els.outputFill.style.width = "0%";
  els.inputLabel.textContent = "0%";
  els.outputLabel.textContent = "0%";
  pushActivity("Desconectado", "La sesión de voz terminó.", "warn");
  if (!silent) setTranscript("Desconectado.");
}

function bindEvents() {
  els.reloadBtn.addEventListener("click", async () => {
    await fetchStatus();
    await fetchVoices();
    await refreshDevices();
  });
  els.startBtn.addEventListener("click", startSession);
  els.stopBtn.addEventListener("click", () => stopSession());
  els.searchInput.addEventListener("input", () => {
    state.voiceSearch = els.searchInput.value || "";
    saveState();
    renderTagRow();
    renderVoiceCards();
  });
  els.activeVoice.addEventListener("change", () => {
    state.voiceId = els.activeVoice.value;
    saveState();
    renderVoiceCards();
    const selected = voices.find((v) => String(v._id) === String(state.voiceId)) || FALLBACK_VOICES.find((v) => String(v._id) === String(state.voiceId));
    if (selected) {
      els.voiceInfo.textContent = `${selected.title} — ${selected.description || "Lista para usar"}`;
      pushActivity("Voz seleccionada", selected.title, "ok");
    }
  });
  els.micSelect.addEventListener("change", () => {
    state.micId = els.micSelect.value;
    saveState();
    pushActivity("Micrófono", els.micSelect.options[els.micSelect.selectedIndex]?.textContent || "Actualizado", "ok");
  });
  els.outputSelect.addEventListener("change", () => {
    state.outputId = els.outputSelect.value;
    saveState();
    pushActivity("Salida", els.outputSelect.options[els.outputSelect.selectedIndex]?.textContent || "Actualizada", "ok");
  });
  els.autoEmotionToggle?.addEventListener("change", () => {
    state.autoEmotion = Boolean(els.autoEmotionToggle.checked);
    saveState();
    refreshSpeechBadges();
  });
  document.querySelectorAll(".mode-switch button[data-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      saveState();
      updateModeUI();
      setBadge(els.sinkBadge, state.mode === "custom" ? "Salida: personalizada" : "Salida: web (altavoces)", state.mode === "custom" ? "ok" : "warn");
      pushActivity("Modo", state.mode === "custom" ? "Salida personalizada" : "Salida web", "ok");
    });
  });
  els.voiceList.addEventListener("click", (ev) => {
    const card = ev.target.closest(".voice-card");
    if (!card) return;
    const id = card.dataset.voiceId;
    state.voiceId = id;
    saveState();
    renderVoiceSelect();
    renderVoiceCards();
    const selected = voices.find((v) => String(v._id) === String(id));
    if (selected) {
      els.voiceInfo.textContent = `${selected.title} — ${selected.description || "Voz disponible."}`;
      setBadge(els.voiceBadge, `Voz: ${selected.title}`, "ok");
      pushActivity("Voz seleccionada", selected.title, "ok");
    }
  });
  window.addEventListener("beforeunload", () => stopSession(true));
}

async function init() {
  loadState();
  if (typeof state.autoEmotion !== "boolean") state.autoEmotion = true;
  bindEvents();
  updateModeUI();
  els.searchInput.value = state.voiceSearch || "";
  setConnected(false);
  setSinging(false);
  await Promise.allSettled([fetchStatus(), fetchVoices(), refreshDevices()]);
  renderTagRow();
  renderVoiceCards();
  renderVoiceSelect();
  syncVoiceStatus();
  setTranscript("Listo. Elige una voz y pulsa Conectar.", { status: "Listo", tone: "ok" });
  pushActivity("Listo", "Elige una voz y pulsa Conectar.", "ok");
}

init();
