(() => {
  const socket = typeof io === "function" ? io() : null;
  const $ = (id) => document.getElementById(id);
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
    textTransform: "none",
    letterSpacing: 0,
    lineHeight: 1.2,
    itemGap: 10,
    align: "left",
    showIndex: false,
    showId: false,
    selectedVoice: "",
    overrides: {},
  };
  let catalog = [];
  let settings = structuredClone(DEFAULTS);
  let draft = structuredClone(DEFAULTS);
  let filter = "";

  const modal = $("voiceListModal");
  if (!modal) return;

  const els = {
    open: $("openVoiceListBtn"), close: $("closeVoiceListBtn"), closeBottom: $("closeVoiceListBtnBottom"),
    search: $("voiceListSearch"), count: $("voiceListCount"), preview: $("voiceListPreview"),
    enabled: $("voiceListEnabled"), transparent: $("voiceListTransparent"), bgOpacity: $("voiceListBgOpacity"),
    fontFamily: $("voiceListFontFamily"), fontSize: $("voiceListFontSize"), fontWeight: $("voiceListFontWeight"),
    fontStyle: $("voiceListFontStyle"), color: $("voiceListColor"), shadow: $("voiceListShadow"),
    transform: $("voiceListTransform"), letterSpacing: $("voiceListLetterSpacing"), lineHeight: $("voiceListLineHeight"),
    itemGap: $("voiceListItemGap"), align: $("voiceListAlign"), showIndex: $("voiceListShowIndex"), showId: $("voiceListShowId"),
    selected: $("voiceListSelectedVoice"), overrideFont: $("voiceListOverrideFont"), overrideSize: $("voiceListOverrideSize"),
    overrideWeight: $("voiceListOverrideWeight"), overrideStyle: $("voiceListOverrideStyle"), overrideColor: $("voiceListOverrideColor"),
    overrideShadow: $("voiceListOverrideShadow"), overrideTransform: $("voiceListOverrideTransform"),
    applyOverride: $("voiceListApplyOverride"), resetOverride: $("voiceListResetOverride"),
    save: $("saveVoiceListBtn"), reset: $("resetVoiceListBtn"),
  };

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const merge = (base, incoming) => {
    const out = { ...base, ...(incoming || {}) };
    out.overrides = { ...(base.overrides || {}), ...(incoming?.overrides || {}) };
    return out;
  };

  function open() { modal.classList.add("show"); modal.setAttribute("aria-hidden", "false"); renderAll(); }
  function close() { modal.classList.remove("show"); modal.setAttribute("aria-hidden", "true"); }

  function setInputs() {
    const s = draft;
    els.enabled.checked = s.enabled !== false;
    els.transparent.checked = s.transparent !== false;
    els.bgOpacity.value = String(Math.round(Number(s.backgroundOpacity || 0) * 100));
    els.fontFamily.value = s.fontFamily || DEFAULTS.fontFamily;
    els.fontSize.value = String(s.fontSize ?? DEFAULTS.fontSize);
    els.fontWeight.value = String(s.fontWeight ?? DEFAULTS.fontWeight);
    els.fontStyle.value = s.fontStyle || "normal";
    els.color.value = s.textColor || "#000000";
    els.shadow.value = s.textShadow || "none";
    els.transform.value = s.textTransform || "none";
    els.letterSpacing.value = String(s.letterSpacing ?? 0);
    els.lineHeight.value = String(s.lineHeight ?? 1.2);
    els.itemGap.value = String(s.itemGap ?? 10);
    els.align.value = s.align || "left";
    els.showIndex.checked = s.showIndex === true;
    els.showId.checked = s.showId === true;
    els.transparent.disabled = false;
    updateOverrideInputs();
  }

  function readInputs() {
    draft.enabled = els.enabled.checked;
    draft.transparent = els.transparent.checked;
    draft.backgroundOpacity = Math.max(0, Math.min(1, Number(els.bgOpacity.value || 0) / 100));
    draft.fontFamily = els.fontFamily.value;
    draft.fontSize = Math.max(8, Math.min(120, Number(els.fontSize.value || 28)));
    draft.fontWeight = Number(els.fontWeight.value || 700);
    draft.fontStyle = els.fontStyle.value;
    draft.textColor = els.color.value || "#000000";
    draft.textShadow = els.shadow.value;
    draft.textTransform = els.transform.value;
    draft.letterSpacing = Number(els.letterSpacing.value || 0);
    draft.lineHeight = Math.max(.8, Math.min(3, Number(els.lineHeight.value || 1.2)));
    draft.itemGap = Math.max(0, Math.min(80, Number(els.itemGap.value || 10)));
    draft.align = els.align.value;
    draft.showIndex = els.showIndex.checked;
    draft.showId = els.showId.checked;
  }

  function filteredCatalog() {
    const q = filter.trim().toLowerCase();
    return catalog.filter(v => !q || `${v.label} ${v.key} ${(v.aliases || []).join(" ")}`.toLowerCase().includes(q));
  }

  function populateSelected() {
    const current = draft.selectedVoice || "";
    els.selected.innerHTML = `<option value="">— Sin estilo individual —</option>` + filteredCatalog().map(v => `<option value="${esc(v.key)}">${esc(v.label)}</option>`).join("");
    els.selected.value = current && filteredCatalog().some(v => v.key === current) ? current : "";
    updateOverrideInputs();
  }

  function overrideFor(key) { return key && draft.overrides?.[key] ? draft.overrides[key] : {}; }
  function updateOverrideInputs() {
    const key = els.selected.value;
    const o = overrideFor(key);
    els.overrideFont.value = o.fontFamily || draft.fontFamily;
    els.overrideSize.value = String(o.fontSize ?? draft.fontSize);
    els.overrideWeight.value = String(o.fontWeight ?? draft.fontWeight);
    els.overrideStyle.value = o.fontStyle || draft.fontStyle;
    els.overrideColor.value = o.color || draft.textColor;
    els.overrideShadow.value = o.textShadow || draft.textShadow;
    els.overrideTransform.value = o.textTransform || draft.textTransform;
  }

  function renderPreview() {
    readInputs();
    const list = filteredCatalog();
    els.count.textContent = `${list.length} de ${catalog.length} voces`;
    if (!list.length) { els.preview.innerHTML = '<div class="voiceListEmpty">No se encontraron voces.</div>'; return; }
    const s = draft;
    els.preview.style.setProperty("--vl-font", s.fontFamily);
    els.preview.style.setProperty("--vl-size", `${s.fontSize}px`);
    els.preview.style.setProperty("--vl-weight", s.fontWeight);
    els.preview.style.setProperty("--vl-style", s.fontStyle);
    els.preview.style.setProperty("--vl-color", s.textColor);
    els.preview.style.setProperty("--vl-shadow", shadowValue(s.textShadow));
    els.preview.style.setProperty("--vl-transform", s.textTransform);
    els.preview.style.setProperty("--vl-spacing", `${s.letterSpacing}px`);
    els.preview.style.setProperty("--vl-line", s.lineHeight);
    els.preview.style.setProperty("--vl-gap", `${s.itemGap}px`);
    els.preview.style.setProperty("--vl-bg", s.transparent ? `rgba(255,255,255,${s.backgroundOpacity})` : `rgba(255,255,255,${Math.max(.05,s.backgroundOpacity)})`);
    els.preview.style.setProperty("--vl-align", s.align);
    els.preview.innerHTML = list.map((v, i) => {
      const o = overrideFor(v.key);
      const style = `font-family:${esc(o.fontFamily || s.fontFamily)};font-size:${Number(o.fontSize ?? s.fontSize)}px;font-weight:${Number(o.fontWeight ?? s.fontWeight)};font-style:${esc(o.fontStyle || s.fontStyle)};color:${esc(o.color || s.textColor)};text-shadow:${shadowValue(o.textShadow || s.textShadow)};text-transform:${esc(o.textTransform || s.textTransform)};`;
      return `<div class="voiceListPreviewItem" style="${style}"><span class="voiceListIndex">${s.showIndex ? `${i + 1}. ` : ""}</span>${esc(v.label)}${s.showId ? `<small>${esc(v.id)}</small>` : ""}</div>`;
    }).join("");
  }
  function shadowValue(v) { return v === "soft" ? "0 1px 3px rgba(255,255,255,.55)" : v === "strong" ? "1px 2px 4px rgba(255,255,255,.85)" : "none"; }
  function renderAll() { populateSelected(); setInputs(); renderPreview(); }

  async function load() {
    try {
      const [catalogRes, settingsRes] = await Promise.all([fetch("/data/voice-catalog.json"), fetch("/api/voice-list/settings")]);
      const cat = await catalogRes.json();
      catalog = Array.isArray(cat?.voices) ? cat.voices : [];
      const remote = await settingsRes.json();
      settings = merge(DEFAULTS, remote?.voiceList || remote || {});
      draft = structuredClone(settings);
      renderAll();
    } catch (err) {
      console.error("No se pudo cargar la lista de voces", err);
    }
  }

  async function save() {
    readInputs();
    draft.overrides = draft.overrides || {};
    try {
      const res = await fetch("/api/voice-list/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (!res.ok) throw new Error("No se pudo guardar");
      const data = await res.json();
      settings = merge(DEFAULTS, data.voiceList || draft);
      draft = structuredClone(settings);
      renderAll();
      close();
    } catch (err) { console.error(err); alert("No se pudo guardar la configuración de la lista de voces."); }
  }

  function applyOverride() {
    readInputs();
    const key = els.selected.value;
    if (!key) return;
    draft.overrides[key] = {
      fontFamily: els.overrideFont.value,
      fontSize: Number(els.overrideSize.value || draft.fontSize),
      fontWeight: Number(els.overrideWeight.value || draft.fontWeight),
      fontStyle: els.overrideStyle.value,
      color: els.overrideColor.value,
      textShadow: els.overrideShadow.value,
      textTransform: els.overrideTransform.value,
    };
    renderPreview();
  }
  function resetOverride() {
    const key = els.selected.value;
    if (!key) return;
    delete draft.overrides[key];
    updateOverrideInputs();
    renderPreview();
  }

  els.open.addEventListener("click", open);
  els.close.addEventListener("click", close);
  els.closeBottom.addEventListener("click", close);
  els.search.addEventListener("input", () => { filter = els.search.value; populateSelected(); renderPreview(); });
  els.selected.addEventListener("change", () => { draft.selectedVoice = els.selected.value; updateOverrideInputs(); renderPreview(); });
  els.applyOverride.addEventListener("click", applyOverride);
  els.resetOverride.addEventListener("click", resetOverride);
  [els.enabled,els.transparent,els.bgOpacity,els.fontFamily,els.fontSize,els.fontWeight,els.fontStyle,els.color,els.shadow,els.transform,els.letterSpacing,els.lineHeight,els.itemGap,els.align,els.showIndex,els.showId].forEach(el => el?.addEventListener("input", renderPreview));
  els.save.addEventListener("click", save);
  els.reset.addEventListener("click", () => { draft = structuredClone(DEFAULTS); renderAll(); });
  modal.addEventListener("click", e => { if (e.target === modal) close(); });

  socket?.on("voiceListSettings", (remote) => {
    settings = merge(DEFAULTS, remote || {});
    if (!modal.classList.contains("show")) draft = structuredClone(settings);
    renderAll();
  });

  load();
})();
