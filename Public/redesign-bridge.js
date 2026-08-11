
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const auth = $('#sfAuthScreen');
  const app = $('#sfApp');
  let registerMode = false;
  let activePage = 'dashboard';

  const pageMeta = {
    dashboard:['TU ESTUDIO','Dashboard'],
    chat:['MENSAJES','Chat'],
    events:['ACTIVIDAD','Eventos'],
    gifts:['APOYO','Regalos'],
    roulette:['DINÁMICA','Ruleta'],
    customize:['DISEÑO','Personalización'],
    overlays:['EN ESCENA','Overlays'],
    widgets:['HERRAMIENTAS','Widgets'],
    connections:['CANALES','Conexiones'],
    settings:['PREFERENCIAS','Ajustes']
  };

  function authSetRegister(on){
    registerMode=!!on;
    $('#sfAuthTitle').textContent=on?'Crea tu cuenta':'Bienvenido';
    $('#sfAuthDescription').textContent=on?'Tu estudio será privado y se sincronizará con tu cuenta.':'Inicia sesión para entrar a tu StreamFusion.';
    $('#sfDisplayWrap').classList.toggle('hidden',!on);
    $('#sfAuthSubmit').innerHTML=on?'Crear mi cuenta <span>→</span>':'Entrar al estudio <span>→</span>';
    $('#sfAuthToggle').textContent=on?'Ya tengo una cuenta':'¿No tienes cuenta? Crear una';
    $('#sfAuthError').textContent='';
  }

  async function authSubmit(e){
    e.preventDefault();
    const btn=$('#sfAuthSubmit');
    btn.disabled=true;
    $('#sfAuthError').textContent='';
    try{
      const body={
        email:$('#sfEmail').value.trim(),
        password:$('#sfPassword').value,
        displayName:$('#sfDisplayName').value.trim()
      };
      const endpoint=registerMode?'/api/auth/register':'/api/auth/login';
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const data=await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(data.error||'No se pudo completar la operación.');
      localStorage.setItem('sf_auth_token',data.token);
      window.__SF_AUTH_REQUIRED__=false;
      await startStudio(data.user);
    }catch(err){ $('#sfAuthError').textContent=err.message||'Error de autenticación.'; }
    finally{ btn.disabled=false; }
  }

  async function startStudio(user){
    if(user) window.__SF_CURRENT_USER__=user;
    const u=window.__SF_CURRENT_USER__||user;
    if(!u) return;
    auth.classList.add('hidden');
    app.classList.remove('hidden');
    $('#sfUserName').textContent=u.displayName||'Creador';
    $('#sfUserEmail').textContent=u.email||'Cuenta StreamFusion';
    $('#sfUserAvatar').textContent=(u.displayName||'S').slice(0,1).toUpperCase();
    try{ localStorage.setItem('sf_user_cache',JSON.stringify(u)); }catch{}
    if(!window.__SF_SOCKET__ && window.__SF_BOOTSTRAP__) await window.__SF_BOOTSTRAP__();
    setTimeout(()=>go(activePage),50);
  }

  function updateAccountStatus(){
    const t=$('#tiktokState')?.textContent||'';
    const tw=$('#twitchState')?.textContent||'';
    const live=(t.includes('En directo')||tw.includes('En directo'));
    $('#sfLiveDot')?.classList.toggle('live',live);
    $('#sfTopStatus').textContent=live?'En directo':(t!=='Listo para agregar cuenta'||tw!=='Listo para agregar cuenta'?'Canal conectado':'Sin canal activo');
  }

  function showModalEmbedded(id, parent){
    const el=document.getElementById(id); if(!el||!parent) return;
    if(!parent.contains(el)) parent.appendChild(el);
    el.classList.remove('modal');
    el.classList.add('sf-embedded-panel');
    el.style.display='block';
    el.setAttribute('aria-hidden','false');
    $$('.iconBtn',el).forEach(b=>b.classList.add('sf-hide-close'));
  }

  function buildOverlayCards(){
    const grid=$('#sfOverlayGrid'); if(!grid) return;
    const owner=encodeURIComponent(window.__SF_CURRENT_USER__?.id||'public');
    const base=location.origin;
    const items=[
      ['chat','💬','Chat','overlay.html?view=chat&owner='+owner,'Chat limpio y completo.'],
      ['events','✨','Eventos','overlay.html?view=events&owner='+owner,'Likes, follows, joins y avisos.'],
      ['gifts','🎁','Regalos','overlay.html?view=gifts&owner='+owner,'Gifts, subs, bits y raids.'],
      ['roulette','🎡','Ruleta','roulette-overlay.html?owner='+owner,'La misma ruleta de cartas.'],
      ['voices','💡','Voces','voice-list-overlay.html?owner='+owner,'Lista animada del bot de voz.']
    ];
    grid.innerHTML=items.map(([id,icon,name,url,desc])=>`<article class="sf-overlay-card"><div class="sf-overlay-icon">${icon}</div><div><span>OVERLAY</span><h3>${name}</h3><p>${desc}</p></div><code>${base}/${url}</code><div class="sf-overlay-actions"><a class="ghostBtn" target="_blank" rel="noopener" href="/${url}">Vista previa</a><button class="primaryBtn" data-copy-overlay="${url}">Copiar enlace</button></div></article>`).join('');
    $$('[data-copy-overlay]',grid).forEach(b=>b.onclick=()=>navigator.clipboard?.writeText(base+'/'+b.dataset.copyOverlay).then(()=>toastMsg('Enlace copiado')).catch(()=>{}));
  }
  function toastMsg(m){
    const fn=window.toast; if(typeof fn==='function'){ fn('StreamFusion',m); return; }
    const n=document.createElement('div'); n.className='sf-toast'; n.textContent=m; document.body.appendChild(n); setTimeout(()=>n.remove(),2200);
  }

  function go(page){
    if(!pageMeta[page]) page='dashboard';
    activePage=page;
    const meta=pageMeta[page];
    $('#sfPageKicker').textContent=meta[0]; $('#sfPageTitle').textContent=meta[1];
    $$('.sf-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.sfPage===page));
    document.body.dataset.sfPage=page;
    const dash=$('#dashboard');
    const extra=$('#sfExtraPages');
    dash.classList.toggle('sf-page-hidden',!['dashboard','chat','events','gifts'].includes(page));
    dash.dataset.sfSection=page;
    $$('.sf-page',extra).forEach(p=>p.classList.remove('active'));
    const target=extra.querySelector('#sf'+page.charAt(0).toUpperCase()+page.slice(1)+'Page');
    if(target) target.classList.add('active');

    if(page==='connections') showModalEmbedded('connectModal',$('#sfConnectionsPage'));
    if(page==='customize'){
      showModalEmbedded('personalizeModal',$('#sfCustomizePage'));
      showModalEmbedded('eventsPersonalizeModal',$('#sfCustomizePage'));
      const chat=$('#personalizeModal'), act=$('#eventsPersonalizeModal');
      const tab=(which)=>{ chat.classList.toggle('sf-custom-active',which==='chat'); act.classList.toggle('sf-custom-active',which!=='chat'); $$('.sf-custom-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.customTab===which)); };
      $$('.sf-custom-tabs button').forEach(b=>{ if(!b.dataset.bound){b.dataset.bound='1';b.onclick=()=>tab(b.dataset.customTab);} });
      tab('chat');
    }
    if(page==='widgets') showModalEmbedded('voiceListModal',$('#sfWidgetsPage'));
    if(page==='settings') showModalEmbedded('settingsModal',$('#sfSettingsPage'));
    if(page==='overlays') buildOverlayCards();
    if(page==='roulette'){
      const frame=$('#sfRouletteFrame');
      if(frame && !frame.src) frame.src='/roulette-overlay.html?embedded=1&owner='+encodeURIComponent(window.__SF_CURRENT_USER__?.id||'public');
      const open=$('#sfRouletteOpenOverlay'); if(open) open.href='/roulette-overlay.html?owner='+encodeURIComponent(window.__SF_CURRENT_USER__?.id||'public');
    }
    if(window.renderAll) window.renderAll();
    updateAccountStatus();
    if(location.hash!=='#'+page) history.replaceState(null,'','#'+page);
  }

  function setup(){
    $('#sfAuthForm').addEventListener('submit',authSubmit);
    $('#sfAuthToggle').addEventListener('click',()=>authSetRegister(!registerMode));
    $('#sfCollapse').onclick=()=>$('#sfSidebar').classList.toggle('closed');
    $('#sfLogout').onclick=$('#sfLogoutTop').onclick=logout;
    $$('.sf-nav-item').forEach(b=>b.addEventListener('click',()=>go(b.dataset.sfPage)));
    $('#sfRouletteStart').onclick=()=>window.__SF_SOCKET__?.emit('roulette:start');
    $('#sfRouletteStop').onclick=()=>window.__SF_SOCKET__?.emit('roulette:stop');
    window.addEventListener('hashchange',()=>go(location.hash.slice(1)));
    window.addEventListener('sf-app-ready',()=>startStudio());
    window.addEventListener('sf-auth-ready',()=>{ auth.classList.remove('hidden'); app.classList.add('hidden'); authSetRegister(false); });
    if(localStorage.getItem('sf_auth_token')){
      auth.classList.add('hidden');
      app.classList.remove('hidden');
      waitForUser();
    }else{
      auth.classList.remove('hidden'); app.classList.add('hidden'); authSetRegister(false);
    }
  }
  function waitForUser(){
    let tries=0;
    const t=setInterval(()=>{
      if(window.__SF_CURRENT_USER__){clearInterval(t);startStudio(window.__SF_CURRENT_USER__);}
      else if(++tries>160){clearInterval(t);auth.classList.remove('hidden');app.classList.add('hidden');}
    },100);
  }
  async function logout(){
    try{await fetch('/api/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('sf_auth_token')||''}`}})}catch{}
    localStorage.removeItem('sf_auth_token'); localStorage.removeItem('sf_user_cache'); location.reload();
  }
  window.goStreamFusionPage=go;
  setup();
})();
