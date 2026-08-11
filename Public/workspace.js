
(function(){
  const $ = (id)=>document.getElementById(id);
  const root = document.documentElement;
  const body = document.body;
  const appShell = $("appShell");
  const authScreen = $("authScreen");
  const pageHost = $("pageHost");
  const sidebar = $("sidebar");
  const pageMeta = {
    dashboard:["CONTROL CENTER","Dashboard"],
    chat:["LIVE FEED","Chat"],
    events:["ACTIVIDAD","Eventos"],
    gifts:["SUPPORT","Regalos"],
    roulette:["INTERACCIÓN","Ruleta"],
    connections:["CONEXIONES","Conexiones"],
    customize:["DISEÑO","Personalización"],
    overlays:["PUBLICACIÓN","Overlays"],
    widgets:["EXTENSIONES","Widgets"],
    settings:["PREFERENCIAS","Ajustes"]
  };

  function setStatus(message="", ok=false){
    const el=$("authStatus");
    if(!el)return;
    el.textContent=message;
    el.classList.toggle("ok",!!ok);
  }

  function switchAuthTab(mode){
    document.querySelectorAll("[data-auth-tab]").forEach(b=>b.classList.toggle("active", b.dataset.authTab===mode));
    $("loginForm")?.classList.toggle("hidden", mode!=="login");
    $("registerForm")?.classList.toggle("hidden", mode!=="register");
    setStatus("");
  }

  async function authRequest(url, payload){
    const res=await fetch(url,{
      method:"POST",credentials:"include",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data?.error||"No se pudo completar la operación.");
    return data;
  }

  document.querySelectorAll("[data-auth-tab]").forEach(btn=>btn.addEventListener("click",()=>switchAuthTab(btn.dataset.authTab)));
  $("loginForm")?.addEventListener("submit",async(ev)=>{
    ev.preventDefault(); setStatus("Comprobando tus datos…");
    try{
      await authRequest("/api/auth/login",{email:$("loginEmail").value,password:$("loginPassword").value});
      setStatus("Sesión iniciada. Cargando StreamFusion…",true);
      location.reload();
    }catch(err){setStatus(err.message,false);}
  });
  $("registerForm")?.addEventListener("submit",async(ev)=>{
    ev.preventDefault(); setStatus("Creando tu espacio…");
    try{
      await authRequest("/api/auth/register",{username:$("registerUsername").value,email:$("registerEmail").value,password:$("registerPassword").value});
      setStatus("Cuenta creada. Cargando tu panel…",true);
      location.reload();
    }catch(err){setStatus(err.message,false);}
  });

  window.addEventListener("streamfusion:auth-required",()=>{
    root.classList.add("auth-required");
    appShell?.setAttribute("aria-hidden","true");
    authScreen?.setAttribute("aria-hidden","false");
  });
  window.addEventListener("streamfusion:ready",(ev)=>{
    root.classList.remove("auth-required");
    const user=ev.detail?.user || window.__STREAMFUSION_USER__ || {};
    setAccountUI(user);
    applyGlobalUI(ev.detail?.settings || {});
    refreshConnectionCards();
    setInterval(refreshConnectionCards,1200);
    updateCounters();
    setInterval(updateCounters,1000);
  });

  async function logout(){
    try{
      await fetch("/api/auth/logout",{method:"POST",credentials:"include"});
    }catch{}
    location.reload();
  }
  $("logoutBtn")?.addEventListener("click",logout);
  $("accountTopBtn")?.addEventListener("click",()=>navigate("settings"));

  function setAccountUI(user){
    const name=String(user?.username||"Mi cuenta");
    const email=String(user?.email||"—");
    const initial=(name.match(/[A-Za-z0-9]/)?.[0]||"S").toUpperCase();
    $("accountMiniName").textContent=name;
    $("accountMiniEmail").textContent=email;
    $("accountAvatarInitial").textContent=initial;
    $("accountTopInitial").textContent=initial;
  }

  $("sidebarToggle")?.addEventListener("click",()=>sidebar.classList.toggle("collapsed"));
  $("mobileMenuBtn")?.addEventListener("click",()=>sidebar.classList.toggle("collapsed"));

  function navigate(page){
    page=pageMeta[page]?page:"dashboard";
    document.querySelectorAll(".navItem").forEach(btn=>btn.classList.toggle("active",btn.dataset.page===page));
    document.querySelectorAll(".pageView").forEach(view=>view.classList.toggle("active",view.id===`page-${page}`));
    const meta=pageMeta[page];
    $("pageEyebrow").textContent=meta[0];
    $("pageTitle").textContent=meta[1];
    closeInlineEditors();
    if(page==="connections") showInline("connectModal");
    if(page==="customize") openCustomizeTab("chat");
    if(page==="widgets") showInline("voiceListModal");
    if(page==="settings") showInline("settingsModal");
    if(page==="roulette") setupRouletteFrame();
    if(page==="overlays") loadOverlayManager();
    if(window.matchMedia("(max-width:860px)").matches) sidebar.classList.add("collapsed");
    history.replaceState({page},"",`#${page}`);
  }

  document.querySelectorAll(".navItem").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.page)));
  document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.go)));

  window.addEventListener("popstate",()=>navigate(location.hash.slice(1)||"dashboard"));
  window.addEventListener("hashchange",()=>navigate(location.hash.slice(1)||"dashboard"));

  function closeInlineEditors(){
    document.querySelectorAll(".modal.inline-mode").forEach(m=>{m.classList.remove("inline-mode","show");m.setAttribute("aria-hidden","true");});
  }
  function showInline(id){
    const modal=$(id); if(!modal)return;
    closeInlineEditors();
    modal.classList.add("inline-mode","show");
    modal.setAttribute("aria-hidden","false");
    window.scrollTo({top:0,behavior:"auto"});
  }

  // Keep modal-only controls on the page instead of opening a floating dialog.
  document.addEventListener("click",(ev)=>{
    const target=ev.target.closest?.("#openConnectBtn,#manageTikTokBtn,#manageTwitchBtn,#openOverlayBtn,#openRouletteBtn,#openVoiceListBtn,#openSettingsBtn,#openPersonalizeBtn,#openEventsPersonalizeBtn");
    if(!target)return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    if(target.id==="openConnectBtn"||target.id==="manageTikTokBtn"||target.id==="manageTwitchBtn") navigate("connections");
    else if(target.id==="openOverlayBtn") navigate("overlays");
    else if(target.id==="openRouletteBtn") navigate("roulette");
    else if(target.id==="openVoiceListBtn") navigate("widgets");
    else if(target.id==="openSettingsBtn") navigate("settings");
    else if(target.id==="openPersonalizeBtn"||target.id==="openEventsPersonalizeBtn") navigate("customize");
  },true);

  document.querySelectorAll("[data-design-tab]").forEach(btn=>btn.addEventListener("click",()=>openCustomizeTab(btn.dataset.designTab)));
  function openCustomizeTab(tab){
    document.querySelectorAll("[data-design-tab]").forEach(b=>b.classList.toggle("active",b.dataset.designTab===tab));
    if(tab==="chat"){showInline("personalizeModal");return;}
    if(tab==="events"||tab==="gifts"){showInline("eventsPersonalizeModal");return;}
    // Overlay: use the already-existing overlay controls, not a second editor.
    showInline("overlayModal");
  }

  // close buttons inside inline editors return to the page instead of leaving the app in an overlay state.
  document.addEventListener("click",(ev)=>{
    const btn=ev.target.closest?.("#closeConnectBtn,#closePersonalizeBtn,#closeEventsPersonalizeBtn,#closeSettingsBtn,#closeOverlayBtn,#closeVoiceListBtn,#closeVoiceListBtnBottom");
    if(!btn)return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const page=location.hash.slice(1)||"dashboard";
    closeInlineEditors();
    if(page==="widgets"){} else if(page==="customize") openCustomizeTab("chat");
  },true);

  // Additional settings for the overall StreamFusion UI.
  function injectAppearanceControls(){
    const modal=$("settingsModal");
    const card=modal?.querySelector(".modalCard");
    if(!card || card.querySelector("#uiThemeChoice"))return;
    const wrap=document.createElement("div");
    wrap.className="uiAppearanceBlock";
    wrap.innerHTML=`
      <div class="uiAppearanceHead"><div><span class="smallTitle">Tema de la aplicación</span><strong>Haz tu panel tuyo</strong><small>Esto afecta la interfaz de StreamFusion, no el fondo local del overlay.</small></div></div>
      <div class="uiAppearanceGrid">
        <label class="fieldRow"><span>Tema</span><select id="uiThemeChoice" class="select fullWidth"><option value="midnight">Midnight</option><option value="neon">Neon</option><option value="sunset">Sunset</option><option value="aurora">Aurora</option></select></label>
        <label class="fieldRow"><span>Color de acento</span><input id="uiAccentColor" type="color" value="#7c5cff"></label>
        <label class="fieldRow"><span>Opacidad de paneles</span><input id="uiPanelOpacity" type="range" min="0.72" max="1" step="0.01" value="0.92"></label>
        <label class="fieldRow fullWidth"><span>Fondo personalizado (URL)</span><input id="uiBackgroundUrl" class="select fullWidth" placeholder="https://…"></label>
      </div>`;
    const actions=card.querySelector(".modalActions");
    card.insertBefore(wrap,actions||null);
    ["uiThemeChoice","uiAccentColor","uiPanelOpacity","uiBackgroundUrl"].forEach(id=>$(id)?.addEventListener("change",saveGlobalUI));
    $("uiBackgroundUrl")?.addEventListener("input",()=>{applyGlobalUI({ui:readGlobalUI()});});
  }

  function readGlobalUI(){
    return {
      theme:$("uiThemeChoice")?.value||"midnight",
      accent:$("uiAccentColor")?.value||"#7c5cff",
      panelOpacity:Number($("uiPanelOpacity")?.value||0.92),
      backgroundImage:$("uiBackgroundUrl")?.value?.trim()||"",
      backgroundMode:"cover"
    };
  }

  async function saveGlobalUI(){
    const ui=readGlobalUI();
    applyGlobalUI({ui});
    try{
      const res=await fetch("/api/settings",{method:"PUT",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({ui})});
      if(!res.ok) throw new Error();
      toastLocal("Tema guardado","La interfaz se sincronizó con tu cuenta.");
    }catch{toastLocal("No se pudo guardar","Revisa tu conexión.",true);}
  }

  function applyGlobalUI(settings){
    injectAppearanceControls();
    const ui=settings?.ui||settings?.settings?.ui||{};
    const theme=String(ui.theme||"midnight");
    root.classList.remove("ui-theme-midnight","ui-theme-neon","ui-theme-sunset","ui-theme-aurora");
    root.classList.add(`ui-theme-${theme}`);
    const accent=String(ui.accent||"#7c5cff");
    root.style.setProperty("--ui-accent",accent);
    root.style.setProperty("--ui-accent-2",theme==="sunset"?"#ffd166":theme==="aurora"?"#68a7ff":"#32d7ff");
    root.style.setProperty("--ui-bg-opacity",ui.backgroundImage?String(Math.max(.18,Math.min(.65,1-(Number(ui.panelOpacity)||.92)*.5))):"0");
    if(ui.backgroundImage) root.style.setProperty("--ui-bg-image",`url("${String(ui.backgroundImage).replace(/"/g,'%22')}")`);
    else root.style.setProperty("--ui-bg-image","none");
    root.style.setProperty("--ui-panel-opacity",String(ui.panelOpacity||.92));
    if($("uiThemeChoice"))$("uiThemeChoice").value=theme;
    if($("uiAccentColor"))$("uiAccentColor").value=accent;
    if($("uiPanelOpacity"))$("uiPanelOpacity").value=String(ui.panelOpacity||.92);
    if($("uiBackgroundUrl"))$("uiBackgroundUrl").value=ui.backgroundImage||"";
  }

  async function loadGlobalUI(){
    injectAppearanceControls();
    try{const r=await fetch("/api/settings",{credentials:"include"});if(r.ok)applyGlobalUI(await r.json());}catch{}
  }

  // Overlay link management
  const overlayViews=[
    ["chat","💬 Chat","Mensajes limpios y stickers/emotes."],
    ["events","✨ Eventos","Likes, follows, joins y actividad."],
    ["gifts","🎁 Regalos","Gifts, subs, bits y raids."],
    ["roulette","🎡 Ruleta","Escena de ruleta para OBS."]
  ];
  async function loadOverlayManager(){
    const grid=$("overlayManagerGrid"); if(!grid)return;
    grid.innerHTML="";
    let list=[];
    try{const r=await fetch("/api/overlays",{credentials:"include"});if(r.ok)list=(await r.json()).overlays||[];}catch{}
    for(const [view,icon,title] of overlayViews){
      const existing=list.find(x=>x.config?.view===view);
      const card=document.createElement("article");card.className="overlayManagerCard";
      const url=existing?new URL(existing.id?`/overlay.html?view=${view}&overlay=${existing.id}`:location.href).href:"";
      card.innerHTML=`<div class="overlayManagerCardHead"><div><h3>${icon} ${title}</h3><p>${view==="roulette"?"Mantén el fondo transparente en OBS y ajusta el fondo solo localmente.":"Configuración sincronizada con tu cuenta."}</p></div><span class="statusPill">${existing?"ENLACE LISTO":"SIN ENLACE"}</span></div><div class="overlayUrl">${url||"Pulsa Generar para crear tu link único."}</div><div class="overlayManagerActions"><button class="primaryBtn" data-create-overlay="${view}">${existing?"Regenerar link":"Generar link"}</button>${existing?`<button class="ghostBtn" data-open-overlay="${view}" data-overlay-id="${existing.id}">Abrir</button><button class="ghostBtn" data-copy-overlay="${url}">Copiar</button>`:""}</div>`;
      grid.appendChild(card);
    }
  }

  async function createOverlay(view){
    try{
      const r=await fetch("/api/overlays",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:`Overlay ${view}`,config:{view}})});
      if(!r.ok)throw new Error();
      await loadOverlayManager();toastLocal("Overlay creado","Ya tienes un enlace único para este usuario.");
    }catch{toastLocal("No se pudo crear","Inténtalo de nuevo.",true);}
  }

  $("createOverlayLinkBtn")?.addEventListener("click",()=>createOverlay("chat"));
  $("overlayManagerGrid")?.addEventListener("click",(ev)=>{
    const c=ev.target.closest?.("[data-create-overlay]");if(c){createOverlay(c.dataset.createOverlay);return;}
    const open=ev.target.closest?.("[data-open-overlay]");if(open){const view=open.dataset.openOverlay,id=open.dataset.overlayId;window.open(`${view==="roulette"?"roulette-overlay.html":"overlay.html"}?view=${view}&overlay=${encodeURIComponent(id)}`,"StreamFusionOverlay-"+view,"width=1280,height=720,resizable=yes");return;}
    const copy=ev.target.closest?.("[data-copy-overlay]");if(copy){navigator.clipboard?.writeText(copy.dataset.copyOverlay||"").then(()=>toastLocal("Enlace copiado","Listo para OBS o cualquier página."));}
  });

  async function setupRouletteFrame(){
    const frame=$("rouletteFrame");if(!frame)return;
    try{
      const key="streamfusion.user."+String(window.__STREAMFUSION_USER__?.id||"guest")+".roulette-overlay-token";
      let token=localStorage.getItem(key)||"";
      if(!token){
        const r=await fetch("/api/overlays",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"Overlay roulette",config:{view:"roulette"}})});
        if(r.ok){const d=await r.json();token=String(d?.overlay?.id||"");if(token)localStorage.setItem(key,token);}
      }
      frame.src=token?`roulette-overlay.html?view=roulette&overlay=${encodeURIComponent(token)}`:"about:blank";
    }catch{frame.src="about:blank";}
  }

  $("rouletteOpenExternal")?.addEventListener("click",()=>{document.getElementById("openRouletteBtn")?.click();});
  $("rouletteResetInline")?.addEventListener("click",()=>window.__STREAMFUSION_SOCKET__?.emit("roulette:reset"));
  $("rouletteStartInline")?.addEventListener("click",()=>window.__STREAMFUSION_SOCKET__?.emit("roulette:start"));

  function updateCounters(){
    const chat=$("chatList")?.children?.length||0,events=$("eventList")?.children?.length||0,gifts=$("giftList")?.children?.length||0;
    $("statChat").textContent=chat;$("statEvents").textContent=events;$("statGifts").textContent=gifts;
    $("navChatCount").textContent=chat;$("navEventsCount").textContent=events;$("navGiftsCount").textContent=gifts;
    const con=[ $("tiktokDot")?.classList.contains("online"),$("twitchDot")?.classList.contains("online")].filter(Boolean).length;
    $("statConnections").textContent=`${con}/2`;
  }

  function refreshConnectionCards(){
    for(const p of ["tiktok","twitch"]){
      const suffix=p==="tiktok"?"TikTok":"Twitch";
      const topName=$(p+"Name")?.textContent||"Sin conectar";
      const topState=$(p+"State")?.textContent||"Sin conectar";
      const targetName=$("connection"+suffix+"Name"),targetState=$("connection"+suffix+"State");
      const dash=$("dash"+suffix+"Status");
      if(targetName)targetName.textContent=topName;
      if(targetState)targetState.textContent=topState;
      if(dash)dash.textContent=topState;
    }
    const live=Boolean($("tiktokDot")?.classList.contains("online")||$("twitchDot")?.classList.contains("online"));
    const pill=$("liveStatusPill");if(pill){pill.textContent=live?"● Conexión activa":"● Esperando conexión";pill.style.color=live?"#86efac":"#aab6ca";}
  }

  function toastLocal(title,body="",error=false){
    const wrap=$("toastWrap");if(!wrap)return;
    const el=document.createElement("div");el.className=`toast ${error?"err":"ok"}`;el.innerHTML=`<div class="t">${escapeHtml(title)}</div>${body?`<div class="b">${escapeHtml(body)}</div>`:""}`;wrap.appendChild(el);setTimeout(()=>el.remove(),3200);
  }
  function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}

  window.addEventListener("streamfusion:ready",()=>{loadGlobalUI();navigate(location.hash.slice(1)||"dashboard");});

  // The user asked for the overall interface background to be local only on overlays; never copy these values into overlay config.
  // The public overlays still receive account-scoped settings from the server and use transparent backgrounds.
})();
