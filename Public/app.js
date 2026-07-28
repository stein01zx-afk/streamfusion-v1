const socket = io();

const status = document.getElementById("status");
const chat = document.getElementById("chat");

const tiktokUser = document.getElementById("tiktokUser");
const twitchUser = document.getElementById("twitchUser");

const connectTikTok = document.getElementById("connectTikTok");
const connectTwitch = document.getElementById("connectTwitch");

const configWindow = document.getElementById("configWindow");
const configButton = document.getElementById("configButton");
const closeConfig = document.getElementById("closeConfig");
const saveConfig = document.getElementById("saveConfig");

configButton.onclick = () => {

    configWindow.style.display = "flex";

};

closeConfig.onclick = () => {

    configWindow.style.display = "none";

};

connectTikTok.onclick = () => {

    if (tiktokUser.value.trim() === "") return;

    socket.emit(
        "connectTikTok",
        tiktokUser.value.trim()
    );

};

connectTwitch.onclick = () => {

    if (twitchUser.value.trim() === "") return;

    socket.emit(
        "connectTwitch",
        twitchUser.value.trim()
    );

};

saveConfig.onclick = () => {

    const config = {

        tiktok:{

            chat:
            document.getElementById("showTikTokChat").checked,

            gifts:
            document.getElementById("showTikTokGifts").checked,

            likes:
            document.getElementById("showTikTokLikes").checked

        },

        twitch:{

            chat:
            document.getElementById("showTwitchChat").checked

        }

    };

    socket.emit(
        "saveSettings",
        config
    );

    configWindow.style.display="none";

};

socket.emit("loadSettings");

socket.on("settings",(config)=>{

    if(!config) return;

    document.getElementById("showTikTokChat").checked=config.tiktok.chat;
    document.getElementById("showTikTokGifts").checked=config.tiktok.gifts;
    document.getElementById("showTikTokLikes").checked=config.tiktok.likes;

    document.getElementById("showTwitchChat").checked=config.twitch.chat;

});

socket.on("system",(data)=>{

    status.innerHTML=data.message;

});

socket.on("chat",(data)=>{

    const div=document.createElement("div");

    div.className="message "+data.platform;

    let html="";

    if(data.type==="chat"){

        html=`
        <div class="user">${data.user}</div>
        <div>${data.message}</div>
        `;

    }

    if(data.type==="gift"){

        html=`
        <div class="user">
        🎁 ${data.user}
        </div>

        <div>

        ${data.gift} x${data.amount}

        </div>
        `;

    }

    if(data.type==="like"){

        html=`
        <div class="user">

        ❤️ ${data.user}

        </div>

        <div>

        ${data.likes} Likes

        </div>
        `;

    }

    if(data.type==="follow"){

        html=`
        <div>

        ➕ ${data.user}
        comenzó a seguir

        </div>
        `;

    }

    if(data.type==="share"){

        html=`
        <div>

        📤 ${data.user}
        compartió el LIVE

        </div>
        `;

    }

    div.innerHTML=html;

    chat.appendChild(div);

    chat.scrollTop=chat.scrollHeight;

});
