
const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express();
const server=http.createServer(app);
const io=new Server(server);
app.use(express.static('Public'));
io.on('connection',s=>{
  s.emit('msg',{platform:'SYSTEM',user:'Servidor',text:'Conectado'});
  s.on('fake',m=>io.emit('msg',m));
});
server.listen(3000,()=>console.log('http://localhost:3000'));
