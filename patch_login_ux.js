const fs = require('fs');

// Update index.html to separate the buttons and add an error message box
let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');

indexHtml = indexHtml.replace(
    '<button id="login-btn" style="margin-top: 10px;">Login / Register</button>',
    `<div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button id="login-btn">Anmelden</button>
                <button id="register-btn" style="background-color: #2ecc71;">Registrieren</button>
            </div>
            <p id="login-error-msg" style="color: #e74c3c; font-weight: bold; margin-top: 10px;" class="hidden"></p>`
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

// Update client.js
let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');

clientJs = clientJs.replace(
    "const loginBtn = document.getElementById('login-btn');",
    "const loginBtn = document.getElementById('login-btn');\nconst registerBtn = document.getElementById('register-btn');\nconst loginErrorMsg = document.getElementById('login-error-msg');"
);

const loginAction = `
function handleAuthAction(actionType) {
    const name = playerNameInput.value.trim();
    const pass = playerPasswordInput.value;

    if (!name || !pass) {
        loginErrorMsg.textContent = "Bitte fülle beide Felder aus!";
        loginErrorMsg.classList.remove('hidden');
        return;
    }

    loginErrorMsg.classList.add('hidden');
    socket.emit('authRequest', name, pass, actionType);
}

loginBtn.addEventListener('click', () => handleAuthAction('login'));
if(registerBtn) registerBtn.addEventListener('click', () => handleAuthAction('register'));

socket.on('loginError', (msg) => {
    loginErrorMsg.textContent = msg;
    loginErrorMsg.classList.remove('hidden');
});
`;

clientJs = clientJs.replace(
    `loginBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    const pass = playerPasswordInput.value;
    if (name && pass) {
        socket.emit('login', name, pass);
    } else {
        alert("Please enter both username and password.");
    }
});

socket.on('loginError', (msg) => {
    alert(msg);
});`,
    loginAction
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);

// Update server.js
let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

const authLogic = `
    socket.on('authRequest', (username, password, action) => {
        if (!username || !password) return;

        if (action === 'register') {
            if (usersDb[username]) {
                socket.emit('loginError', 'Benutzername existiert bereits. Bitte logge dich ein.');
                return;
            }
            // Create user
            usersDb[username] = {
                password: password,
                coins: 0,
                wins: 0,
                gamesPlayed: 0,
                xp: 0,
                level: 1,
                title: 'Novice',
                unlockedTitles: ['Novice'],
                quests: { play_plus4: 0, call_uno: 0, win_07: 0 },
                friends: [],
                skins: ['defaultAvatar', 'defaultChatColor', 'defaultCardBack', 'defaultVictory'],
                equippedAvatar: 'defaultAvatar',
                equippedChatColor: 'defaultChatColor',
                equippedCardBack: 'defaultCardBack',
                equippedVictory: 'defaultVictory',
                lastLoginDate: new Date().toISOString().split('T')[0]
            };
            saveUsers();
            finishLogin(socket, username);
        } else if (action === 'login') {
            if (!usersDb[username]) {
                socket.emit('loginError', 'Benutzerkonto nicht gefunden. Bitte registriere dich zuerst.');
                return;
            }
            if (usersDb[username].password !== password) {
                socket.emit('loginError', 'Falsches Passwort.');
                return;
            }

            // Migrate old profiles silently
            if (usersDb[username].gamesPlayed === undefined) usersDb[username].gamesPlayed = 0;
            if (usersDb[username].xp === undefined) usersDb[username].xp = 0;
            if (usersDb[username].level === undefined) usersDb[username].level = 1;
            if (usersDb[username].title === undefined) usersDb[username].title = 'Novice';
            if (usersDb[username].unlockedTitles === undefined) usersDb[username].unlockedTitles = ['Novice'];
            if (usersDb[username].quests === undefined) usersDb[username].quests = { play_plus4: 0, call_uno: 0, win_07: 0 };
            if (usersDb[username].friends === undefined) usersDb[username].friends = [];

            if (usersDb[username].equippedSkin || !usersDb[username].equippedAvatar) {
                 if (usersDb[username].equippedSkin) {
                     usersDb[username].equippedAvatar = usersDb[username].equippedSkin;
                     delete usersDb[username].equippedSkin;
                 }
                 let newSkins = usersDb[username].skins ? usersDb[username].skins.map(s => s === 'default' ? 'defaultAvatar' : s) : [];
                 if (usersDb[username].equippedAvatar === 'default') usersDb[username].equippedAvatar = 'defaultAvatar';
                 if (!usersDb[username].equippedAvatar) usersDb[username].equippedAvatar = 'defaultAvatar';
                 if (!newSkins.includes('defaultChatColor')) newSkins.push('defaultChatColor');
                 if (!newSkins.includes('defaultCardBack')) newSkins.push('defaultCardBack');
                 if (!newSkins.includes('defaultVictory')) newSkins.push('defaultVictory');
                 usersDb[username].skins = newSkins;
                 if (!usersDb[username].equippedChatColor) usersDb[username].equippedChatColor = 'defaultChatColor';
                 if (!usersDb[username].equippedCardBack) usersDb[username].equippedCardBack = 'defaultCardBack';
                 if (!usersDb[username].equippedVictory) usersDb[username].equippedVictory = 'defaultVictory';
                 saveUsers();
            }

            finishLogin(socket, username);
        }
    });

    function finishLogin(socket, username) {
        socket.username = username;
        onlineUsers[username] = socket.id;

        const today = new Date().toISOString().split('T')[0];
        let dailyBonusAwarded = false;

        if (usersDb[username].lastLoginDate !== today) {
            usersDb[username].lastLoginDate = today;
            usersDb[username].coins += 20;
            dailyBonusAwarded = true;
            saveUsers();
        }

        const safeProfile = { ...usersDb[username] };
        delete safeProfile.password;

        socket.emit('loginSuccess', {
            username: username,
            profile: safeProfile,
            shopItems: SKINS,
            dailyBonusAwarded: dailyBonusAwarded
        });

        socket.emit('leaderboardUpdate', getLeaderboard());
        socket.emit('publicRooms', getPublicRooms());
    }

    // Keep old login event mapped to new authRequest for backwards compatibility if any old client still uses it
    socket.on('login', (username, password) => {
        // Assume old clients using 'login' meant to try logging in, or registering if missing
        if (!usersDb[username]) {
             socket.emit('authRequest', username, password, 'register'); // Forward to new logic
        } else {
             socket.emit('authRequest', username, password, 'login'); // Forward to new logic
        }
    });
`;

serverJs = serverJs.replace(
    /socket\.on\('login', \(username, password\) => \{[\s\S]*?\/\/ Send public rooms\n        socket\.emit\('publicRooms', getPublicRooms\(\)\);\n    \}\);/,
    authLogic
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
