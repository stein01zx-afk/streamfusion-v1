(() => {
  const root = document.getElementById("voiceListOverlay");
  if (!root) return;
  const socket = typeof io === "function" ? io() : null;
  const DEFAULTS = { enabled:true, transparent:true, backgroundOpacity:0, fontFamily:"Inter, Arial, sans-serif", fontSize:28, fontWeight:700, fontStyle:"normal", textColor:"#000000", textShadow:"none", textTransform:"none", letterSpacing:0, lineHeight:1.2, itemGap:10, align:"left", showIndex:false, showId:false, overrides:{} };
  let catalog=[]; let settings={...DEFAULTS};
  const shadow=v=>v==="soft"?"0 1px 3px rgba(255,255,255,.55)":v==="strong"?"1px 2px 4px rgba(255,255,255,.85)":"none";
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render(){
    if(settings.enabled===false){root.innerHTML="";return;}
    root.style.setProperty("--vl-font",settings.fontFamily); root.style.setProperty("--vl-size",`${settings.fontSize}px`); root.style.setProperty("--vl-weight",settings.fontWeight); root.style.setProperty("--vl-style",settings.fontStyle); root.style.setProperty("--vl-color",settings.textColor); root.style.setProperty("--vl-shadow",shadow(settings.textShadow)); root.style.setProperty("--vl-transform",settings.textTransform); root.style.setProperty("--vl-spacing",`${settings.letterSpacing}px`); root.style.setProperty("--vl-line",settings.lineHeight); root.style.setProperty("--vl-gap",`${settings.itemGap}px`); root.style.setProperty("--vl-align",settings.align); root.style.setProperty("--vl-bg",settings.transparent?`rgba(255,255,255,${settings.backgroundOpacity})`:`rgba(255,255,255,${Math.max(.05,settings.backgroundOpacity)})`);
    root.innerHTML=catalog.map((v,i)=>{const o=settings.overrides?.[v.key]||{};return `<div class="voiceListOverlayItem" style="font-family:${esc(o.fontFamily||settings.fontFamily)};font-size:${Number(o.fontSize??settings.fontSize)}px;font-weight:${Number(o.fontWeight??settings.fontWeight)};font-style:${esc(o.fontStyle||settings.fontStyle)};color:${esc(o.color||settings.textColor)};text-shadow:${shadow(o.textShadow||settings.textShadow)};text-transform:${esc(o.textTransform||settings.textTransform)}"><span>${settings.showIndex?`${i+1}. `:""}</span>${esc(v.label)}${settings.showId?`<small>${esc(v.id)}</small>`:""}</div>`}).join("");
  }
  Promise.all([fetch("/data/voice-catalog.json").then(r=>r.json()),fetch("/api/voice-list/settings").then(r=>r.json())]).then(([cat,s])=>{catalog=cat.voices||[];settings={...DEFAULTS,...(s.voiceList||s||{})};render();}).catch(()=>{});
  socket?.on("voiceListSettings",s=>{settings={...DEFAULTS,...(s||{})};render();});
})();
