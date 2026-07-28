const socket=io();
const chat=document.getElementById('chat');
socket.on('msg',m=>{
 const d=document.createElement('div');
 d.className='msg';
 d.innerHTML=`<span class="platform">[${m.platform}]</span> <b>${m.user}</b>: ${m.text}`;
 chat.appendChild(d);
 window.scrollTo(0,document.body.scrollHeight);
});
function connect(){
 socket.emit('fake',{platform:'SYSTEM',user:'Demo',text:'Interfaz lista. Aquí se integrarán TikTok y Twitch.'});
}

