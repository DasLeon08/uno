const fs = require('fs');

let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');

indexHtml = indexHtml.replace(
    'Lvl: <span id="display-level">1</span> (XP: <span id="display-xp">0</span>) | Coins: <span id="display-coins">0</span> 🪙',
    'Lvl: <span id="display-level">1</span> (XP: <span id="display-xp">0</span>) | Coins: <span id="display-coins">0</span> 🪙\n                <div style="width: 100%; max-width: 300px; background: #333; height: 10px; border-radius: 5px; margin: 10px auto; overflow: hidden; border: 1px solid #555;">\n                    <div id="xp-bar-fill" style="width: 0%; height: 100%; background: #2ecc71; transition: width 0.5s;"></div>\n                </div>'
);

indexHtml = indexHtml.replace(
    '<button id="shop-btn">Item Shop</button>',
    '<button id="profile-btn" style="background-color: #9b59b6;">Profile / Pass</button>\n                <button id="shop-btn">Item Shop</button>'
);

indexHtml = indexHtml.replace(
    '<!-- Shop Modal -->',
    `<!-- Profile / Battle Pass Modal -->
    <div id="profile-modal" class="modal hidden">
        <div class="modal-content" style="max-width: 600px; color: black; max-height: 80vh; overflow-y: auto;">
            <h2 style="color: white;">Profile & Battle Pass 🌟</h2>
            <div id="battle-pass-container" style="text-align: left; margin-top: 20px;">
                <!-- BP items injected here -->
            </div>
            <button id="close-profile-btn" style="margin-top: 20px;">Close</button>
        </div>
    </div>

    <!-- Shop Modal -->`
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');

clientJs = clientJs.replace(
    'const shopBtn = document.getElementById(\'shop-btn\');',
    'const profileBtn = document.getElementById(\'profile-btn\');\nconst shopBtn = document.getElementById(\'shop-btn\');'
);

clientJs = clientJs.replace(
    'const shopModal = document.getElementById(\'shop-modal\');',
    'const profileModal = document.getElementById(\'profile-modal\');\nconst closeProfileBtn = document.getElementById(\'close-profile-btn\');\nconst battlePassContainer = document.getElementById(\'battle-pass-container\');\n\nif (profileBtn) {\n    profileBtn.addEventListener(\'click\', () => {\n        profileModal.classList.remove(\'hidden\');\n        renderBattlePass();\n    });\n}\nif (closeProfileBtn) {\n    closeProfileBtn.addEventListener(\'click\', () => {\n        profileModal.classList.add(\'hidden\');\n    });\n}\n\nconst shopModal = document.getElementById(\'shop-modal\');'
);

clientJs = clientJs.replace(
    'displayTitle.textContent = myProfile.title || \'Novice\';',
    'displayTitle.textContent = myProfile.title || \'Novice\';\n    const xpProgress = myProfile.xp % 100;\n    document.getElementById(\'xp-bar-fill\').style.width = xpProgress + \'%\';'
);

clientJs = clientJs.replace(
    'renderQuests();',
    'const xpProgress2 = myProfile.xp % 100;\n    document.getElementById(\'xp-bar-fill\').style.width = xpProgress2 + \'%\';\n\n    renderQuests();'
);

clientJs += `
function renderBattlePass() {
    if (!shopData || !myProfile) return;
    battlePassContainer.innerHTML = '<h3 style="color: #f1c40f; text-align: center;">Level Rewards</h3>';

    // Sort items by minLevel
    let passItems = Object.entries(shopData)
        .filter(([id, item]) => item.minLevel)
        .sort((a, b) => a[1].minLevel - b[1].minLevel);

    if (passItems.length === 0) {
        battlePassContainer.innerHTML += '<p style="color: white; text-align: center;">More rewards coming soon!</p>';
        return;
    }

    passItems.forEach(([id, item]) => {
        const div = document.createElement('div');
        div.style.background = myProfile.level >= item.minLevel ? 'rgba(46, 204, 113, 0.2)' : 'rgba(255,255,255,0.1)';
        div.style.border = '1px solid ' + (myProfile.level >= item.minLevel ? '#2ecc71' : '#555');
        div.style.padding = '10px';
        div.style.margin = '10px 0';
        div.style.borderRadius = '8px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.style.alignItems = 'center';

        const info = document.createElement('div');
        info.innerHTML = \`<strong style="color: white;">Level \${item.minLevel}</strong><br><span style="color: #ccc;">Unlock: \${item.name} (\${item.type})</span>\`;

        const status = document.createElement('span');
        status.style.fontWeight = 'bold';
        if (myProfile.level >= item.minLevel) {
            status.textContent = '✅ Unlocked';
            status.style.color = '#2ecc71';
        } else {
            status.textContent = '🔒 Locked';
            status.style.color = '#e74c3c';
        }

        div.appendChild(info);
        div.appendChild(status);
        battlePassContainer.appendChild(div);
    });
}
`;

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);


let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

serverJs = serverJs.replace(
    "'alien': { name: 'Alien', icon: '👽', price: 1000, type: 'avatar' },",
    "'alien': { name: 'Alien', icon: '👽', price: 1000, type: 'avatar' },\n    'robot': { name: 'Robot', icon: '🤖', price: 0, type: 'avatar', minLevel: 5 },\n    'ninja': { name: 'Ninja', icon: '🥷', price: 0, type: 'avatar', minLevel: 15 },\n    'king': { name: 'King', icon: '👑', price: 0, type: 'avatar', minLevel: 30 },"
);

serverJs = serverJs.replace(
    "'goldChat': { name: 'Gold Text', color: '#f1c40f', price: 500, type: 'chatColor' },",
    "'goldChat': { name: 'Gold Text', color: '#f1c40f', price: 500, type: 'chatColor' },\n    'rainbowChat': { name: 'Rainbow Text', color: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', price: 0, type: 'chatColor', minLevel: 10 },"
);

serverJs = serverJs.replace(
    "'matrixRain': { name: 'Matrix Rain', icon: '🌧️', price: 1500, type: 'victory' }",
    "'matrixRain': { name: 'Matrix Rain', icon: '🌧️', price: 1500, type: 'victory' },\n    'lightning': { name: 'Lightning Strike', icon: '⚡', price: 0, type: 'victory', minLevel: 20 }"
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
