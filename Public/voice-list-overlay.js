(() => {
  const root = document.getElementById("voiceListOverlay");
  if (!root) return;
  const socket = typeof io === "function" ? io() : null;

  const DEFAULT_ROULETTE = {
    enabled: false,
    title: "¿Quieres una voz?",
    subtitle: "Para participar, comenta lo que se indique en el sorteo!",
    winnerText: "Si ganas, solo comenta una de las siguientes voces:",
    imageUrl: "",
    imageAlt: "",
    imagePosition: "top",
    imageFit: "contain",
    imageWidth: 260,
    imageHeight: 260,
    imageOpacity: 1,
    cardOpacity: 0.12,
    titleSeconds: 3,
    subtitleSeconds: 3,
    winnerSeconds: 3,
    introMotion: "fade",
    showListAfterIntro: true,
  };

  const DEFAULTS = {
    enabled: true,
    transparent: true,
    backgroundOpacity: 0,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 28,
    fontWeight: 700,
    fontStyle: "normal",
    textColor: "#000000",
    textShadow: "none",
    shadowColor: "#000000",
    outlineWidth: 0,
    outlineColor: "#000000",
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.2,
    itemGap: 10,
    align: "left",
    direction: "vertical",
    motion: "static",
    motionSpeed: 24,
    showIndex: false,
    showId: false,
    overrides: {},
    roulette: { ...DEFAULT_ROULETTE },
  };

  let catalog = [];
  let settings = { ...DEFAULTS };
  let sceneStartAt = Date.now();
  let ticker = null;

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(n)) ? Number(n) : min));
  const shadow = (v, color = "#000000") => {
    const c = String(color || "#000000");
    if (v === "soft") return `0 2px 8px ${c}`;
    if (v === "strong") return `0 4px 16px ${c}`;
    return "none";
  };
  const outline = (width = 0, color = "#000000") => `${Math.max(0, Number(width || 0))}px ${String(color || "#000000")}`;
  const normRoulette = (r = {}) => ({ ...DEFAULT_ROULETTE, ...(r || {}) });

  function renderItem(v, i, s) {
    const o = s.overrides?.[v.key] || {};
    const style = `font-family:${esc(o.fontFamily || s.fontFamily)};font-size:${Number(o.fontSize ?? s.fontSize)}px;font-weight:${Number(o.fontWeight ?? s.fontWeight)};font-style:${esc(o.fontStyle || s.fontStyle)};color:${esc(o.color || s.textColor)};text-shadow:${shadow(o.textShadow || s.textShadow, o.shadowColor || s.shadowColor)};-webkit-text-stroke:${outline(o.outlineWidth ?? s.outlineWidth ?? 0, o.outlineColor || s.outlineColor)};paint-order:stroke fill;text-transform:${esc(o.textTransform || s.textTransform)};`;
    return `<div class="voiceListItem" style="${style}"><span class="voiceListIndex">${s.showIndex ? `${i + 1}. ` : ""}</span>${esc(v.label)}${s.showId ? `<small>${esc(v.id)}</small>` : ""}</div>`;
  }

  function renderList(s, list) {
    if (!list.length) return '<div class="voiceListEmpty">No se encontraron voces.</div>';
    const items = list.map((v, i) => renderItem(v, i, s)).join("");
    const content = s.motion === "static" ? items : `${items}${items}`;
    return `<div class="voiceListStage"><div class="voiceListTrack">${content}</div></div>`;
  }

  function currentScene(s, now = Date.now()) {
    const r = normRoulette(s.roulette);
    if (!r.enabled) return { mode: "list", step: -1, text: "" };
    const elapsed = Math.max(0, (now - sceneStartAt) / 1000);
    const d1 = clamp(r.titleSeconds, 0.5, 30);
    const d2 = clamp(r.subtitleSeconds, 0.5, 30);
    const d3 = clamp(r.winnerSeconds, 0.5, 30);
    if (elapsed < d1) return { mode: "intro", step: 0, text: r.title };
    if (elapsed < d1 + d2) return { mode: "intro", step: 1, text: r.subtitle };
    if (elapsed < d1 + d2 + d3) return { mode: "intro", step: 2, text: r.winnerText };
    if (r.showListAfterIntro === false) return { mode: "intro", step: 2, text: r.winnerText };
    return { mode: "list", step: 3, text: "" };
  }

  function renderRoulette(s, list, scene) {
    const r = normRoulette(s.roulette);
    const motionClass = `motion-${r.introMotion || "fade"}`;
    const imagePos = `image-${r.imagePosition || "top"}`;
    const image = r.imageUrl ? `<div class="voiceListRouletteImageWrap"><img src="${esc(r.imageUrl)}" alt="${esc(r.imageAlt || "Imagen de ruleta")}" style="width:${clamp(r.imageWidth, 80, 1200)}px;height:${clamp(r.imageHeight, 80, 1200)}px;object-fit:${esc(r.imageFit || "contain")};opacity:${clamp(r.imageOpacity ?? 1, 0, 1)}" /></div>` : "";
    const intro = `<div class="voiceListRouletteShell ${motionClass} ${imagePos}"><div class="voiceListRouletteCard" style="--vl-roulette-card-bg:rgba(255,255,255,${clamp(r.cardOpacity ?? 0.12, 0, 1)});">${image}<div class="voiceListRouletteCopy"><div class="voiceListRouletteBadge">💡 Ruleta de voces</div><div class="voiceListRouletteText">${esc(scene.text || r.title)}</div><div class="voiceListRouletteHint">Se muestra por unos segundos y luego se borra</div></div></div></div>`;
    const listBlock = `<div class="voiceListRouletteListWrap"><div class="voiceListRouletteListTitle">Voces disponibles</div>${renderList(s, list)}</div>`;
    return scene.mode === "intro" ? intro : listBlock;
  }

  function render() {
    if (settings.enabled === false) { root.innerHTML = ""; return; }
    const s = settings;
    const list = Array.isArray(catalog) ? catalog : [];
    const motion = s.motion || "static";
    const direction = s.direction || "vertical";
    root.className = `voiceListShell direction-${direction} motion-${motion}`;
    root.style.setProperty("--vl-font", s.fontFamily);
    root.style.setProperty("--vl-size", `${s.fontSize}px`);
    root.style.setProperty("--vl-weight", s.fontWeight);
    root.style.setProperty("--vl-style", s.fontStyle);
    root.style.setProperty("--vl-color", s.textColor);
    root.style.setProperty("--vl-shadow", shadow(s.textShadow, s.shadowColor));
    root.style.setProperty("--vl-outline-width", `${Math.max(0, Number(s.outlineWidth ?? 0))}px`);
    root.style.setProperty("--vl-outline-color", s.outlineColor || "#000000");
    root.style.setProperty("--vl-transform", s.textTransform);
    root.style.setProperty("--vl-spacing", `${s.letterSpacing}px`);
    root.style.setProperty("--vl-line", s.lineHeight);
    root.style.setProperty("--vl-gap", `${s.itemGap}px`);
    root.style.setProperty("--vl-bg", s.transparent ? `rgba(255,255,255,${s.backgroundOpacity})` : `rgba(255,255,255,${Math.max(.05, s.backgroundOpacity)})`);
    root.style.setProperty("--vl-speed", `${s.motionSpeed || 24}s`);

    const scene = currentScene(s);
    if (s.roulette?.enabled) {
      root.innerHTML = renderRoulette(s, list, scene);
    } else if (!list.length) {
      root.innerHTML = '<div class="voiceListEmpty">No se encontraron voces.</div>';
    } else {
      root.innerHTML = renderList(s, list);
    }
  }

  function scheduleTick() {
    if (ticker) clearInterval(ticker);
    ticker = setInterval(render, 350);
  }

  Promise.all([
    fetch("/data/voice-catalog.json").then((r) => r.json()),
    fetch("/api/voice-list/settings").then((r) => r.json()),
  ]).then(([cat, s]) => {
    catalog = Array.isArray(cat?.voices) ? cat.voices : [];
    settings = { ...DEFAULTS, ...(s.voiceList || s || {}), roulette: { ...DEFAULT_ROULETTE, ...((s.voiceList || s || {}).roulette || {}) } };
    sceneStartAt = Date.now();
    render();
    scheduleTick();
  }).catch(() => {});

  socket?.on("voiceListSettings", (s) => {
    const incoming = s || {};
    settings = { ...DEFAULTS, ...incoming, roulette: { ...DEFAULT_ROULETTE, ...(incoming.roulette || {}) } };
    sceneStartAt = Date.now();
    render();
  });

  socket?.on("connect", () => {
    socket.emit?.("voiceList:getState");
  });
})();
