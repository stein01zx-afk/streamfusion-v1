(() => {
  const root = document.getElementById("voiceListOverlay");
  if (!root) return;
  const widgetParams = new URLSearchParams(location.search);
  const widgetOverlayKey = widgetParams.get("overlayKey") || "";
  const socket = typeof io === "function" ? io({ auth: { overlayKey: widgetOverlayKey }, transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity }) : null;

  const DEFAULT_ROULETTE = {
    enabled: false,
    title: "¿Quieres una voz?",
    subtitle: "Para participar, comenta lo que se indique en el sorteo!",
    winnerText: "Si ganas, solo comenta una de las siguientes voces:",
    imageUrl: "",
    imageAlt: "",
    titleImageUrl: "",
    titleImageAlt: "",
    titleImagePosition: "top",
    titleImageFit: "contain",
    titleImageWidth: 260,
    titleImageHeight: 260,
    titleImageOpacity: 1,
    subtitleImageUrl: "",
    subtitleImageAlt: "",
    subtitleImagePosition: "top",
    subtitleImageFit: "contain",
    subtitleImageWidth: 260,
    subtitleImageHeight: 260,
    subtitleImageOpacity: 1,
    winnerImageUrl: "",
    winnerImageAlt: "",
    winnerImagePosition: "top",
    winnerImageFit: "contain",
    winnerImageWidth: 260,
    winnerImageHeight: 260,
    winnerImageOpacity: 1,
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
    listPosition: "left",
    autoShowEnabled: false,
    autoShowEvery: 30,
    autoShowFor: 6,
    direction: "vertical",
    axis: "vertical",
    movementDirection: "forward",
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
  let renderRevision = 0;
  let lastRenderKey = "";

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
    const axis = s.axis || s.direction || "vertical";
    const ordered = s.movementDirection === "reverse" ? [...list].reverse() : list;
    const items = ordered.map((v, i) => renderItem(v, i, s)).join("");
    const content = s.motion === "static" ? items : `${items}${items}`;
    return `<div class="voiceListStage"><div class="voiceListViewport"><div class="voiceListTrack">${content}</div></div></div>`;
  }

  function isListVisible(s, now = Date.now()) {
    if (s.autoShowEnabled !== true) return true;
    const every = clamp(Number(s.autoShowEvery || 30), 5, 3600);
    const visibleFor = clamp(Number(s.autoShowFor || 6), 1, Math.min(120, every));
    const elapsed = ((now - sceneStartAt) / 1000) % every;
    return elapsed < visibleFor;
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

  function imageConfigForStep(r, step) {
    const idx = Math.max(0, Math.min(2, Number(step || 0)));
    const base = [
      { url: r.titleImageUrl || r.imageUrl, alt: r.titleImageAlt || r.imageAlt || "Imagen de ruleta", position: r.titleImagePosition || r.imagePosition || "top", fit: r.titleImageFit || r.imageFit || "contain", width: r.titleImageWidth ?? r.imageWidth ?? 260, height: r.titleImageHeight ?? r.imageHeight ?? 260, opacity: r.titleImageOpacity ?? r.imageOpacity ?? 1 },
      { url: r.subtitleImageUrl || r.imageUrl, alt: r.subtitleImageAlt || r.imageAlt || "Imagen de ruleta", position: r.subtitleImagePosition || r.imagePosition || "top", fit: r.subtitleImageFit || r.imageFit || "contain", width: r.subtitleImageWidth ?? r.imageWidth ?? 260, height: r.subtitleImageHeight ?? r.imageHeight ?? 260, opacity: r.subtitleImageOpacity ?? r.imageOpacity ?? 1 },
      { url: r.winnerImageUrl || r.imageUrl, alt: r.winnerImageAlt || r.imageAlt || "Imagen de ruleta", position: r.winnerImagePosition || r.imagePosition || "top", fit: r.winnerImageFit || r.imageFit || "contain", width: r.winnerImageWidth ?? r.imageWidth ?? 260, height: r.winnerImageHeight ?? r.imageHeight ?? 260, opacity: r.winnerImageOpacity ?? r.imageOpacity ?? 1 },
    ];
    return base[idx] || base[0];
  }

  function renderRoulette(s, list, scene) {
    const r = normRoulette(s.roulette);
    const motionClass = `motion-${r.introMotion || "fade"}`;
    const imageCfg = imageConfigForStep(r, scene.step);
    const imagePos = `image-${imageCfg.position || "top"}`;
    const image = imageCfg?.url ? `<div class="voiceListRouletteImageWrap"><img src="${esc(imageCfg.url)}" alt="${esc(imageCfg.alt)}" style="width:${clamp(imageCfg.width, 80, 1200)}px;height:${clamp(imageCfg.height, 80, 1200)}px;object-fit:${esc(imageCfg.fit || "contain")};opacity:${clamp(imageCfg.opacity ?? 1, 0, 1)}" /></div>` : "";
    const intro = `<div class="voiceListRouletteShell ${motionClass} ${imagePos}"><div class="voiceListRouletteCard" style="--vl-roulette-card-bg:rgba(255,255,255,${clamp(r.cardOpacity ?? 0.12, 0, 1)});">${image}<div class="voiceListRouletteCopy"><div class="voiceListRouletteText">${esc(scene.text || r.title)}</div></div></div></div>`;
    const listBlock = `<div class="voiceListRouletteListWrap">${renderList(s, list)}</div>`;
    return scene.mode === "intro" ? intro : (isListVisible(s) ? listBlock : "");
  }

  function render() {
    if (settings.enabled === false) { root.innerHTML = ""; return; }
    const s = settings;
    const list = Array.isArray(catalog) ? catalog : [];
    const motion = s.motion || "static";
    const axis = s.axis || s.direction || "vertical";
    const moveDir = s.movementDirection || "forward";
    root.className = `voiceListShell direction-${axis} travel-${moveDir} motion-${motion} align-${s.align || "left"} list-position-${s.listPosition || "left"}`;
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
    root.style.setProperty("--vl-align", s.align);

    const scene = currentScene(s);
    const stepImage = scene.mode === "intro" ? [s.roulette?.titleImageUrl || s.roulette?.imageUrl || "", s.roulette?.subtitleImageUrl || s.roulette?.imageUrl || "", s.roulette?.winnerImageUrl || s.roulette?.imageUrl || ""][Math.max(0, Math.min(2, Number(scene.step ?? 0)))] || "" : "";
    const renderKey = `${renderRevision}|${scene.mode}|${scene.step}|${scene.text}|${stepImage}|${s.enabled}|${s.motion}|${axis}|${moveDir}|${s.direction}|${s.listPosition}|${s.autoShowEnabled}|${s.autoShowEvery}|${s.autoShowFor}|${list.length}`;
    if (renderKey === lastRenderKey) return;
    lastRenderKey = renderKey;
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
    ticker = setInterval(render, 200);
  }

  const owner = new URLSearchParams(location.search).get("owner") || "";
  Promise.all([
    fetch(`/api/voices/catalog?owner=${encodeURIComponent(owner)}`).then((r) => r.json()),
    fetch(`/api/voice-list/settings?owner=${encodeURIComponent(owner)}`).then((r) => r.json()),
  ]).then(([cat, s]) => {
    catalog = Array.isArray(cat?.voices) ? cat.voices : [];
    settings = { ...DEFAULTS, ...(s.voiceList || s || {}), roulette: { ...DEFAULT_ROULETTE, ...((s.voiceList || s || {}).roulette || {}) } };
    sceneStartAt = Date.now();
    renderRevision += 1;
    lastRenderKey = "";
    render();
    scheduleTick();
  }).catch(() => {});

  socket?.on("voiceListSettings", (s) => {
    const incoming = s || {};
    settings = { ...DEFAULTS, ...incoming, roulette: { ...DEFAULT_ROULETTE, ...(incoming.roulette || {}) } };
    sceneStartAt = Date.now();
    renderRevision += 1;
    lastRenderKey = "";
    render();
  });

  socket?.on("connect", () => {
    socket.emit?.("voiceList:getState");
  });
})();
