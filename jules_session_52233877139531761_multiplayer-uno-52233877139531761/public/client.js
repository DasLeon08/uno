const socket = io();

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

function playTone(frequency, type, duration, vol=0.1) {
    if (isMuted) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

function playCardSound() {
    // A quick 'swoosh' sound
    playTone(150, 'triangle', 0.1, 0.2);
    setTimeout(() => playTone(100, 'sine', 0.1, 0.1), 50);
}

function playTurnStartSound() {
    // A friendly 'ping'
    playTone(600, 'sine', 0.2, 0.1);
    setTimeout(() => playTone(800, 'sine', 0.3, 0.1), 100);
}

function playVictorySound() {
    // A little fanfare
    const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'square', 0.2, 0.1), i * 150);
    });
    setTimeout(() => playTone(880, 'square', 0.6, 0.1), notes.length * 150);
}

function playDrawSound() {
    // A soft paper slide sound
    playTone(200, 'noise', 0.1, 0.05);
}

function playVoiceLine(type) {
    if (type === 'Good Game!') {
        playTone(440, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(554, 'sine', 0.1, 0.1), 150);
        setTimeout(() => playTone(659, 'sine', 0.2, 0.1), 300);
    } else if (type === 'Draw 4!') {
        playTone(300, 'sawtooth', 0.2, 0.2);
        setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.2), 200);
    } else if (type === 'Oh no...') {
        playTone(300, 'triangle', 0.3, 0.1);
        setTimeout(() => playTone(250, 'triangle', 0.4, 0.1), 300);
    } else if (type === 'Well played!') {
        playTone(500, 'sine', 0.1, 0.1);
        setTimeout(() => playTone(600, 'sine', 0.2, 0.1), 150);
    }
}

// --- Visual Effects ---
function triggerConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 5000); // Cleanup
    }
}

function triggerFireworks() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const fw = document.createElement('div');
            fw.classList.add('firework');
            fw.style.left = Math.random() * 100 + 'vw';
            fw.style.top = Math.random() * 100 + 'vh';
            fw.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.appendChild(fw);
            setTimeout(() => fw.remove(), 1000);
        }, Math.random() * 2000);
    }
}

function triggerMatrixRain() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~";
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const drop = document.createElement('div');
            drop.classList.add('matrix-drop');
            drop.style.left = Math.random() * 100 + 'vw';
            drop.style.top = '-20px';
            drop.textContent = chars[Math.floor(Math.random() * chars.length)];
            document.body.appendChild(drop);
            setTimeout(() => drop.remove(), 3000); // fall animation duration
        }, Math.random() * 3000);
    }
}

function triggerShake() {
    document.body.classList.add('shake-animation');
    setTimeout(() => {
        document.body.classList.remove('shake-animation');
    }, 500);
}

// Ensure AudioContext starts after user interaction
document.body.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: true });
// --- End Audio System ---

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const serverBrowserScreen = document.getElementById('server-browser-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginErrorMsg = document.getElementById('login-error-msg');
const mainMenu = document.getElementById('main-menu');
const displayUsername = document.getElementById('display-username');
const displayCoins = document.getElementById('display-coins');
const displayLevel = document.getElementById('display-level');
const displayXp = document.getElementById('display-xp');
const displayTitle = document.getElementById('display-title');
const questList = document.getElementById('quest-list');
const friendsList = document.getElementById('friends-list');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendNameInput = document.getElementById('friend-name-input');
const playerNameInput = document.getElementById('player-name');
const playerPasswordInput = document.getElementById('player-password');

const singleplayerBtn = document.getElementById('singleplayer-btn');
const multiplayerBtn = document.getElementById('multiplayer-btn');
const profileBtn = document.getElementById('profile-btn');
const shopBtn = document.getElementById('shop-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const logoutBtn = document.getElementById('logout-btn');

const profileModal = document.getElementById('profile-modal');
const closeProfileBtn = document.getElementById('close-profile-btn');
const battlePassContainer = document.getElementById('battle-pass-container');

if (profileBtn) {
    profileBtn.addEventListener('click', () => {
        profileModal.classList.remove('hidden');
        renderBattlePass();
    });
}
if (closeProfileBtn) {
    closeProfileBtn.addEventListener('click', () => {
        profileModal.classList.add('hidden');
    });
}

const shopModal = document.getElementById('shop-modal');
const shopCoins = document.getElementById('shop-coins');
const shopItemsContainer = document.getElementById('shop-items');
const closeShopBtn = document.getElementById('close-shop-btn');

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

const chatContainer = document.getElementById('chat-container');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const emojiBtns = document.querySelectorAll('.emoji-btn');
const quickChatBtns = document.querySelectorAll('.quick-chat-btn');

const publicRoomsList = document.getElementById('public-rooms-list');
const showCreateRoomBtn = document.getElementById('show-create-room-btn');
const backToMenuFromBrowserBtn = document.getElementById('back-to-menu-from-browser-btn');
const createRoomModal = document.getElementById('create-room-modal');
const createRoomConfirmBtn = document.getElementById('create-room-confirm-btn');
const createRoomCancelBtn = document.getElementById('create-room-cancel-btn');

const lobbyIdDisplay = document.getElementById('lobby-id-display');
const playersList = document.getElementById('players-list');
const hostControls = document.getElementById('host-controls');
const waitingMsg = document.getElementById('waiting-msg');
const startBtn = document.getElementById('start-btn');
const addBotBtn = document.getElementById('add-bot-btn');
const botDifficultySelect = document.getElementById('bot-difficulty');
const leaveLobbyBtn = document.getElementById('leave-lobby-btn');

const leaveGameBtn = document.getElementById('leave-game-btn');
const opponentsDiv = document.getElementById('opponents');
const discardPileDiv = document.getElementById('discard-pile');
const myHandDiv = document.getElementById('my-hand');
const deckDiv = document.getElementById('deck');
const myNameEl = document.getElementById('my-name');

const colorPicker = document.getElementById('color-picker');
const winnerMessage = document.getElementById('winner-message');
const playAgainBtn = document.getElementById('play-again-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const themeSelector = document.getElementById('theme-selector');

// State
let myId = null;
let currentRoomId = null;
let isHost = false;
let isMyTurn = false;
let pendingWildCardIndex = null;
let myProfile = null;
let shopData = null;

// Event Listeners
chatSendBtn.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if (msg && currentRoomId) {
        socket.emit('chatMessage', currentRoomId, msg);
        chatInput.value = '';
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') chatSendBtn.click();
});

emojiBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const emote = e.target.textContent;
        // If in game, send as floating emote too
        if (currentRoomId && !gameScreen.classList.contains('hidden')) {
            socket.emit('sendEmote', currentRoomId, emote);
        }
        // Also add to chat input just in case
        chatInput.value += emote;
    });
});

quickChatBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const text = e.target.textContent;
        if (currentRoomId) {
            socket.emit('chatMessage', currentRoomId, text);
        }
    });
});


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
    loginErrorMsg.innerHTML = '⚠️ ' + msg;
    loginErrorMsg.classList.remove('hidden');
    // Add a little shake animation class if we wanted, but simple inline is fine.
});


shopBtn.addEventListener('click', () => {
    shopModal.classList.remove('hidden');
    renderShop();
});

closeShopBtn.addEventListener('click', () => {
    shopModal.classList.add('hidden');
});

leaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.remove('hidden');
});

closeLeaderboardBtn.addEventListener('click', () => {
    leaderboardModal.classList.add('hidden');
});

singleplayerBtn.addEventListener('click', () => {
    const name = myProfile ? myProfile.username : 'Player';
    isHost = true;
    socket.emit('createRoom', { name: `${name}'s Game`, maxPlayers: 4, isPrivate: true, playerName: name });
    loginScreen.classList.add('hidden');
});

multiplayerBtn.addEventListener('click', () => {
    loginScreen.classList.add('hidden');
    serverBrowserScreen.classList.remove('hidden');
});

logoutBtn.addEventListener('click', () => {
    window.location.reload(); // Simplest way to cleanly reset all state
});

backToMenuFromBrowserBtn.addEventListener('click', () => {
    serverBrowserScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    mainMenu.classList.remove('hidden');
    loginForm.classList.add('hidden');
});

leaveLobbyBtn.addEventListener('click', () => {
    socket.emit('leaveRoom', currentRoomId);
    currentRoomId = null;
    isHost = false;
    lobbyScreen.classList.add('hidden');
    document.getElementById('chat-container').classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

leaveGameBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to leave the game?")) {
        socket.emit('leaveRoom', currentRoomId);
        currentRoomId = null;
        isHost = false;
        gameScreen.classList.add('hidden');
        document.getElementById('chat-container').classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

showCreateRoomBtn.addEventListener('click', () => {
    createRoomModal.classList.remove('hidden');
});

createRoomCancelBtn.addEventListener('click', () => {
    createRoomModal.classList.add('hidden');
});

createRoomConfirmBtn.addEventListener('click', () => {
    const roomName = document.getElementById('room-name-input').value.trim();
    const roomPassword = document.getElementById('room-password-input').value;
    const maxPlayers = parseInt(document.getElementById('room-max-players').value);
    const isPrivate = document.getElementById('room-private-checkbox').checked;
    const speedMode = document.getElementById('room-speed-checkbox').checked;
    const noMercyMode = document.getElementById('room-nomercy-checkbox').checked;
    const rankedMode = document.getElementById('room-ranked-checkbox').checked;
    const zeroSevenMode = document.getElementById('room-zero-seven-checkbox').checked;
    const jumpInMode = document.getElementById('room-jumpin-checkbox').checked;
    const drawUntilPlayMode = document.getElementById('room-drawuntilplay-checkbox').checked;
    const wildRouletteMode = document.getElementById('room-wildroulette-checkbox').checked;
    const teamMode = document.getElementById('room-team-checkbox').checked;
    const combinationsMode = document.getElementById('room-combinations-checkbox').checked;
    const specialCardsMode = document.getElementById('room-special-checkbox').checked;
    const name = playerNameInput.value.trim() || 'Player';

    isHost = true;
    socket.emit('createRoom', {
        name: roomName,
        password: roomPassword,
        maxPlayers,
        isPrivate,
        speedMode,
        noMercyMode,
        rankedMode,
        zeroSevenMode,
        jumpInMode,
        drawUntilPlayMode,
        wildRouletteMode,
        teamMode,
        combinationsMode,
        specialCardsMode,
        playerName: name
    });
    createRoomModal.classList.add('hidden');
    serverBrowserScreen.classList.add('hidden');
});

startBtn.addEventListener('click', () => {
    if (currentRoomId) {
        socket.emit('startGame', currentRoomId);
    }
});

addBotBtn.addEventListener('click', () => {
    if (currentRoomId && isHost) {
        const difficulty = botDifficultySelect.value;
        socket.emit('addBot', currentRoomId, difficulty);
    }
});

deckDiv.addEventListener('click', () => {
    if (isMyTurn && currentRoomId && !hasDrawnThisTurn) {
        socket.emit('drawCard', currentRoomId);
        playDrawSound();
    }
});


const sortColorBtn = document.getElementById('sort-color-btn');
const sortNumberBtn = document.getElementById('sort-number-btn');

if (sortColorBtn) {
    sortColorBtn.addEventListener('click', () => {
        if (currentRoomId) socket.emit('sortHand', currentRoomId, 'color');
    });
}
if (sortNumberBtn) {
    sortNumberBtn.addEventListener('click', () => {
        if (currentRoomId) socket.emit('sortHand', currentRoomId, 'number');
    });
}

const passTurnBtn = document.getElementById('pass-turn-btn');
if (passTurnBtn) {
    passTurnBtn.addEventListener('click', () => {
        if (isMyTurn && currentRoomId && hasDrawnThisTurn) {
            socket.emit('passTurn', currentRoomId);
        }
    });
}

const soundToggleBtn = document.getElementById('sound-toggle-btn');
if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        soundToggleBtn.textContent = isMuted ? '🔇' : '🔊';
    });
}

const playComboBtn = document.getElementById('play-combo-btn');
let selectedCards = [];

if (playComboBtn) {
    playComboBtn.addEventListener('click', () => {
        if (currentRoomId && isMyTurn && selectedCards.length > 0) {
            socket.emit('playCard', currentRoomId, selectedCards);
            playCardSound();
            selectedCards = [];
            playComboBtn.classList.add('hidden');
        }
    });
}

const callUnoBtn = document.getElementById('call-uno-btn');
if (callUnoBtn) {
    callUnoBtn.addEventListener('click', () => {
        if (currentRoomId) {
            socket.emit('callUno', currentRoomId);
            callUnoBtn.classList.add('hidden'); // Hide after clicking to prevent spam
        }
    });
}

let hasDrawnThisTurn = false;

playAgainBtn.addEventListener('click', () => {
    if (currentRoomId) {
        socket.emit('playAgain', currentRoomId);
    }
});

backToMenuBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    window.location.reload(); // Quick reset for simplicity
});

let weatherInterval = null;

function applyThemeEffects(theme) {
    // Clear old particles
    document.querySelectorAll('.weather-particle').forEach(el => el.remove());
    if (weatherInterval) clearInterval(weatherInterval);

    if (theme === 'theme-3d') {
        // Stars
        weatherInterval = setInterval(() => {
            const star = document.createElement('div');
            star.className = 'weather-particle';
            star.textContent = '✨';
            star.style.left = Math.random() * 100 + 'vw';
            star.style.fontSize = (Math.random() * 5 + 10) + 'px';
            star.style.opacity = '0.8';
            star.style.animation = `fallSnow ${Math.random() * 5 + 5}s linear forwards`;
            document.body.appendChild(star);
            setTimeout(() => star.remove(), 10000);
        }, 400);
    } else if (theme === 'theme-ocean') {
        // Bubbles
        weatherInterval = setInterval(() => {
            const bubble = document.createElement('div');
            bubble.className = 'weather-particle';
            bubble.textContent = '⚪'; // simple bubble
            bubble.style.left = Math.random() * 100 + 'vw';
            bubble.style.fontSize = (Math.random() * 10 + 10) + 'px';
            bubble.style.opacity = '0.5';
            bubble.style.animation = `floatBubble ${Math.random() * 3 + 3}s linear forwards`;
            document.body.appendChild(bubble);
            setTimeout(() => bubble.remove(), 6000);
        }, 500);
    } else if (theme === 'theme-forest') {
        // Leaves
        weatherInterval = setInterval(() => {
            const leaf = document.createElement('div');
            leaf.className = 'weather-particle';
            leaf.textContent = '🍃';
            leaf.style.left = Math.random() * 100 + 'vw';
            leaf.style.fontSize = '20px';
            leaf.style.animation = `fallSnow ${Math.random() * 4 + 4}s linear forwards`;
            document.body.appendChild(leaf);
            setTimeout(() => leaf.remove(), 8000);
        }, 800);
    } else if (theme === 'theme-dark' || theme === 'theme-classic') {
        // Snow for classic or dark could be nice (or just empty)
        // Let's do simple snow for classic
        if (theme === 'theme-classic') {
            weatherInterval = setInterval(() => {
                const snow = document.createElement('div');
                snow.className = 'weather-particle';
                snow.textContent = '❄️';
                snow.style.left = Math.random() * 100 + 'vw';
                snow.style.fontSize = '12px';
                snow.style.opacity = '0.6';
                snow.style.animation = `fallSnow ${Math.random() * 3 + 3}s linear forwards`;
                document.body.appendChild(snow);
                setTimeout(() => snow.remove(), 6000);
            }, 300);
        }
    }
}

themeSelector.addEventListener('change', (e) => {
    const theme = e.target.value;
    document.body.className = theme;
    applyThemeEffects(theme);
});

// Setup color picker logic
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const selectedColor = e.target.dataset.color;
        colorPicker.classList.add('hidden');
        if (pendingWildCardIndex !== null && currentRoomId) {
            socket.emit('playCard', currentRoomId, pendingWildCardIndex, selectedColor);
            playCardSound();
            pendingWildCardIndex = null;
        }
    });
});

// Socket Events
socket.on('connect', () => {
    myId = socket.id;
});

socket.on('publicRooms', (rooms) => {
    publicRoomsList.innerHTML = '';
    if (rooms.length === 0) {
        publicRoomsList.innerHTML = '<li>No public rooms available.</li>';
    } else {
        rooms.forEach(room => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.marginBottom = '5px';
            li.style.padding = '5px';
            li.style.background = 'rgba(255,255,255,0.1)';
            li.style.borderRadius = '3px';

            const info = document.createElement('span');
            let statusText = room.gameStarted ? " (In Progress - Spectate)" : ` (${room.players}/${room.maxPlayers})`;
            info.textContent = `${room.hasPassword ? '🔒 ' : ''}${room.name}${statusText}`;

            const joinBtn = document.createElement('button');
            joinBtn.textContent = room.gameStarted ? 'Spectate' : 'Join';
            joinBtn.style.padding = '5px 10px';
            joinBtn.addEventListener('click', () => {
                let password = '';
                if (room.hasPassword) {
                    password = prompt("Enter room password:");
                    if (password === null) return; // User cancelled
                }

                const name = myProfile ? myProfile.username : 'Player';
                isHost = false;
                currentRoomId = room.id;
                lobbyIdDisplay.textContent = `(ID: ${room.id})`;
                socket.emit('joinRoom', room.id, name, password);
            });

            li.appendChild(info);
            li.appendChild(joinBtn);
            publicRoomsList.appendChild(li);
        });
    }
});

socket.on('roomCreated', (roomId) => {
    currentRoomId = roomId;
    lobbyIdDisplay.textContent = `(ID: ${roomId})`;
    lobbyScreen.classList.remove('hidden');

    if (isHost) {
        hostControls.classList.remove('hidden');
        waitingMsg.classList.add('hidden');
    } else {
        hostControls.classList.add('hidden');
        waitingMsg.classList.remove('hidden');
    }
});

socket.on('joinError', (msg) => {
    alert(msg);
});

socket.on('loginSuccess', (data) => {
    myProfile = { username: data.username, ...data.profile };
    shopData = data.shopItems;

    displayUsername.textContent = myProfile.username;
    displayCoins.textContent = myProfile.coins;
    displayLevel.textContent = myProfile.level || 1;
    displayXp.textContent = myProfile.xp || 0;
    displayTitle.textContent = myProfile.title || 'Novice';
    const xpProgress = myProfile.xp % 100;
    document.getElementById('xp-bar-fill').style.width = xpProgress + '%';
    shopCoins.textContent = myProfile.coins;

    renderQuests();
    renderFriends();

    loginForm.classList.add('hidden');
    mainMenu.classList.remove('hidden');

    renderShop();

    if (data.dailyBonusAwarded) {
        alert("🎉 Daily Login Bonus! You received 20 Coins! 🎉");
    }
});

socket.on('profileUpdate', (profile) => {
    myProfile = { ...myProfile, ...profile };
    displayCoins.textContent = myProfile.coins;
    displayLevel.textContent = myProfile.level || 1;
    displayXp.textContent = myProfile.xp || 0;
    displayTitle.textContent = myProfile.title || 'Novice';
    shopCoins.textContent = myProfile.coins;

    renderQuests();
    renderFriends();
    renderShop();
});

function renderFriends() {
    if (!myProfile || !myProfile.friends) return;
    friendsList.innerHTML = '';
    myProfile.friends.forEach(f => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '5px';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = f;

        const inviteBtn = document.createElement('button');
        inviteBtn.textContent = 'Invite';
        inviteBtn.style.padding = '2px 5px';
        inviteBtn.style.fontSize = '12px';
        inviteBtn.onclick = () => {
            if (currentRoomId) {
                socket.emit('inviteFriend', f, currentRoomId);
                alert(`Invited ${f} to the room.`);
            } else {
                alert('You must be in a room to invite friends.');
            }
        };

        li.appendChild(nameSpan);
        li.appendChild(inviteBtn);
        friendsList.appendChild(li);
    });
}

if (addFriendBtn) {
    addFriendBtn.addEventListener('click', () => {
        const name = friendNameInput.value.trim();
        if (name) {
            socket.emit('addFriend', name);
            friendNameInput.value = '';
        }
    });
}

socket.on('friendInvite', (data) => {
    if (confirm(`${data.sender} invited you to play UNO! Join room?`)) {
        const name = myProfile ? myProfile.username : 'Player';
        isHost = false;
        currentRoomId = data.roomId;
        lobbyIdDisplay.textContent = `(ID: ${data.roomId})`;
        socket.emit('joinRoom', data.roomId, name, '');
    }
});

function renderQuests() {
    if (!myProfile || !myProfile.quests) return;
    questList.innerHTML = '';

    const quests = [
        { name: 'Play 5 +4 Cards', progress: myProfile.quests.play_plus4, goal: 5 },
        { name: 'Call UNO 3 times', progress: myProfile.quests.call_uno, goal: 3 },
        { name: 'Win 2 Games (0-7 Mode)', progress: myProfile.quests.win_07, goal: 2 }
    ];

    quests.forEach(q => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';

        const isComplete = q.progress >= q.goal;
        const color = isComplete ? '#2ecc71' : 'white';

        div.innerHTML = `<span style="color: ${color}">${isComplete ? '✅' : '⏳'} ${q.name}</span> <span style="color: ${color}">${Math.min(q.progress, q.goal)}/${q.goal}</span>`;
        questList.appendChild(div);
    });
}

socket.on('shopError', (msg) => {
    alert(msg);
});

socket.on('leaderboardUpdate', (entries) => {
    leaderboardTableBody.innerHTML = '';
    entries.forEach((entry, index) => {
        const tr = document.createElement('tr');

        const tdRank = document.createElement('td');
        tdRank.textContent = index + 1;

        const tdUsername = document.createElement('td');
        tdUsername.textContent = entry.username;

        const tdLevel = document.createElement('td');
        tdLevel.textContent = entry.level;

        const tdTitle = document.createElement('td');
        tdTitle.textContent = entry.title;

        const tdWins = document.createElement('td');
        tdWins.textContent = entry.wins;

        const tdGamesPlayed = document.createElement('td');
        tdGamesPlayed.textContent = entry.gamesPlayed || 0;

        const tdWinRate = document.createElement('td');
        const winRate = entry.gamesPlayed > 0 ? Math.round((entry.wins / entry.gamesPlayed) * 100) : 0;
        tdWinRate.textContent = `${winRate}%`;

        const tdCoins = document.createElement('td');
        tdCoins.textContent = entry.coins;

        tr.appendChild(tdRank);
        tr.appendChild(tdUsername);
        tr.appendChild(tdLevel);
        tr.appendChild(tdTitle);
        tr.appendChild(tdWins);
        tr.appendChild(tdGamesPlayed);
        tr.appendChild(tdWinRate);
        tr.appendChild(tdCoins);

        leaderboardTableBody.appendChild(tr);
    });
});

socket.on('playerJoined', (players) => {
    serverBrowserScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');

    // Show chat when joining lobby
    document.getElementById('chat-container').classList.remove('hidden');

    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        const icon = (shopData && p.equippedSkin && shopData[p.equippedSkin]) ? shopData[p.equippedSkin].icon : '👤';
        li.textContent = `${icon} ${p.name}`;
        playersList.appendChild(li);
    });

    if (players.length >= 2 && isHost) {
        startBtn.classList.remove('hidden');
    } else if (isHost) {
        startBtn.classList.add('hidden');
    }
});

socket.on('hostTransferred', () => {
    isHost = true;
    hostControls.classList.remove('hidden');
    waitingMsg.classList.add('hidden');
    if (playersList.children.length >= 2) {
        startBtn.classList.remove('hidden');
    }
    alert("The previous host left. You are now the host!");
});

let currentRoomState = null;

socket.on('gameState', (state) => {
    currentRoomState = state;
    if (state.gameStarted) {
        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }

    // Clear selections on new turn/state
    selectedCards = [];
    if (playComboBtn) playComboBtn.classList.add('hidden');

    renderOpponents(state.players);
    renderHand(state.hand);
    renderDiscardPile(state.topCard, state.activeColor);

    const specDisplay = document.getElementById("spectators-display");
    const specCount = document.getElementById("spectator-count");
    if (state.spectatorCount > 0) {
        specDisplay.classList.remove("hidden");
        specCount.textContent = state.spectatorCount;
    } else {
        specDisplay.classList.add("hidden");
    }
    
    // Check if it's my turn
    const me = state.players.find(p => p.id === myId);
    if (state.isSpectator) {
        isMyTurn = false;
        myNameEl.textContent = "Spectating...";
        myNameEl.classList.remove('my-turn');
        if (callUnoBtn) callUnoBtn.classList.add('hidden');
        if (passTurnBtn) passTurnBtn.classList.add('hidden');
    } else if (me) {
        const becameMyTurn = me.isCurrentTurn && !isMyTurn; // Just became my turn
        isMyTurn = me.isCurrentTurn;
        hasDrawnThisTurn = state.hasDrawn; // Update local state

        myNameEl.textContent = `My Hand (${me.name}) ${isMyTurn ? " - MY TURN!" : ""}`;
        if (isMyTurn) {
            myNameEl.classList.add('my-turn');
            if (becameMyTurn) playTurnStartSound();
        } else {
            myNameEl.classList.remove('my-turn');
        }

        // Handle UNO button visibility (only show when 1 or 2 cards left)
        if (callUnoBtn) {
            if (me.cardCount <= 2 && me.cardCount > 0 && !me.calledUno) {
                callUnoBtn.classList.remove('hidden');
            } else {
                callUnoBtn.classList.add('hidden');
            }
        }

        // Handle Pass Turn button visibility
        if (passTurnBtn) {
            if (isMyTurn && hasDrawnThisTurn) {
                passTurnBtn.classList.remove('hidden');
            } else {
                passTurnBtn.classList.add('hidden');
            }
        }
    }
});

socket.on('chatMessage', (data) => {
    const p = document.createElement('p');
    const senderStrong = document.createElement('strong');
    senderStrong.textContent = `${data.sender}: `;

    // Apply chat color if provided
    if (data.color) {
        senderStrong.style.color = data.color;
    }

    const textNode = document.createTextNode(data.text);

    p.appendChild(senderStrong);
    p.appendChild(textNode);

    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Shake effect for penalty cards
    if (data.sender === "System" && data.text.includes("draws")) {
        triggerShake();

        // Find avatar and make it cry
        const match = data.text.match(/^(.*?) draws/);
        if (match) {
            const victimName = match[1];
            // Since we don't have direct mapping of names to DOM elements easily, we find by content
            document.querySelectorAll('.opponent').forEach(opp => {
                if (opp.textContent.includes(victimName)) {
                    const avatar = opp.querySelector('.player-avatar');
                    if (avatar) {
                        const original = avatar.textContent;
                        avatar.textContent = '😭';
                        setTimeout(() => avatar.textContent = original, 2000);
                    }
                }
            });
        }
    }

    // Avatar Reaction for calling UNO
    if (data.sender === "System" && data.text.includes("called UNO")) {
        const match = data.text.match(/^(.*?) called/);
        if (match) {
            const callerName = match[1];
            document.querySelectorAll('.opponent').forEach(opp => {
                if (opp.textContent.includes(callerName)) {
                    const avatar = opp.querySelector('.player-avatar');
                    if (avatar) {
                        const original = avatar.textContent;
                        avatar.textContent = '😂';
                        setTimeout(() => avatar.textContent = original, 2000);
                    }
                }
            });
        }
    }

    // Play sound if it's a quick chat message
    const presetMessages = ['Good Game!', 'Draw 4!', 'Oh no...', 'Well played!'];
    if (presetMessages.includes(data.text)) {
        playVoiceLine(data.text);
    }
});

socket.on('playerEmote', (data) => {
    // Show floating emote over player
    let targetEl = document.getElementById(`player-container-${data.playerId}`);

    // If it's me, target my-hand area
    if (data.playerId === myId) {
        targetEl = document.querySelector('.player-area');
    }

    if (targetEl) {
        const popup = document.createElement('div');
        popup.className = 'emote-popup';
        popup.textContent = data.emote;

        // Random slight offsets so multiple emotes don't overlap perfectly
        const randomOffsetX = (Math.random() - 0.5) * 40;
        popup.style.left = `calc(50% + ${randomOffsetX}px)`;
        popup.style.top = '10px';

        targetEl.style.position = 'relative'; // ensure absolute positioning works
        targetEl.appendChild(popup);

        setTimeout(() => popup.remove(), 2000);
    }
});

socket.on('gameOver', (data) => {
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    // Hide game specific buttons
    if (callUnoBtn) callUnoBtn.classList.add('hidden');
    if (passTurnBtn) passTurnBtn.classList.add('hidden');

    if (data.winnerName) {
        winnerMessage.textContent = `${data.winnerName} won the game!`;

        // Trigger specific victory animation based on winner's equipped skin
        if (data.victorySkin === 'fireworks') {
            triggerFireworks();
        } else if (data.victorySkin === 'matrixRain') {
            triggerMatrixRain();
        } else {
            triggerConfetti();
        }

        if (data.winnerId === myId) {
            playVictorySound();
        }
    } else {
        winnerMessage.textContent = data.reason || 'Game Over';
    }
});

socket.on('returnToLobby', () => {
    gameOverScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');

    // Clear game UI
    myHandDiv.innerHTML = '';
    discardPileDiv.innerHTML = '';
    opponentsDiv.innerHTML = '';
    myNameEl.textContent = 'My Hand';
});

// Render Functions
function createCardElement(card, index = null, equippedCardBack = null) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.color || 'wild'}`;
    
    // Apply legendary effects if the user has them equipped and we're drawing their hand
    if (equippedCardBack === 'legendaryFire') {
        cardEl.classList.add('legendary-fire');
    } else if (equippedCardBack === 'legendaryMatrix') {
        cardEl.classList.add('legendary-matrix');
    }

    let displayValue = card.value;
    if (displayValue === 'wild') displayValue = 'WILD';
    if (displayValue === 'wild4') displayValue = '+4';
    if (displayValue === 'reflector') displayValue = '🛡️';
    if (displayValue === 'roulette') displayValue = '🎲';
    if (displayValue === 'equalize') displayValue = '⚖️';
    if (displayValue === 'draw2') displayValue = '+2';
    if (displayValue === 'skip') displayValue = 'SKIP';
    if (displayValue === 'reverse') displayValue = 'REV';

    cardEl.textContent = displayValue;

    if (index !== null) {
        cardEl.addEventListener('click', (e) => handleCardPlay(card, index, e.target));
    }

    return cardEl;
}

function handleCardPlay(card, index, cardEl) {
    if (!isMyTurn || !currentRoomId) return;

    if (currentRoomState && currentRoomState.combinationsMode) {
        // Toggle selection
        const selIdx = selectedCards.indexOf(index);
        if (selIdx > -1) {
            selectedCards.splice(selIdx, 1);
            cardEl.style.transform = 'none';
            cardEl.style.boxShadow = '2px 2px 5px rgba(0,0,0,0.5)';
        } else {
            selectedCards.push(index);
            cardEl.style.transform = 'translateY(-15px)';
            cardEl.style.boxShadow = '0 0 15px white';
        }

        if (selectedCards.length > 0) {
            playComboBtn.classList.remove('hidden');
            playComboBtn.textContent = `Play Selected (${selectedCards.length})`;
        } else {
            playComboBtn.classList.add('hidden');
        }
    } else {

        if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4' || card.color === 'special') {
            pendingWildCardIndex = index;
            colorPicker.classList.remove('hidden');
        } else {

            socket.emit('playCard', currentRoomId, index);
            playCardSound();
        }
    }
}

let previousHandSize = 0;

function renderHand(hand) {
    myHandDiv.innerHTML = '';
    const isDrawing = hand.length > previousHandSize;

    // Check equipped card back for legendary effects
    const equippedCardBack = myProfile ? myProfile.equippedCardBack : null;

    hand.forEach((card, index) => {
        const cardEl = createCardElement(card, index, equippedCardBack);
        // Only animate the newly drawn card (assuming it's at the end of the hand)
        if (isDrawing && index === hand.length - 1) {
            cardEl.classList.add('drawn');
        }
        myHandDiv.appendChild(cardEl);
    });

    previousHandSize = hand.length;
}

function renderDiscardPile(topCard, activeColor) {
    discardPileDiv.innerHTML = '';
    if (topCard) {
        const cardEl = createCardElement(topCard);
        // Animate the card being played
        cardEl.classList.add('played');

        if (topCard.color === 'wild' && activeColor) {
            // Visualize the chosen color for wild cards
            cardEl.classList.remove('wild');
            cardEl.classList.add(activeColor);
        }
        discardPileDiv.appendChild(cardEl);
    }
}

function renderOpponents(players) {
    opponentsDiv.innerHTML = '';
    players.forEach(p => {
        if (p.id !== myId) {
            const oppDiv = document.createElement('div');
            oppDiv.className = `opponent ${p.isCurrentTurn ? 'active-turn' : ''}`;
            oppDiv.id = `player-container-${p.id}`;

            const icon = (shopData && p.equippedSkin && shopData[p.equippedSkin]) ? shopData[p.equippedSkin].icon : '👤';
            
            const avatarEl = document.createElement('span');
            avatarEl.className = 'player-avatar';
            avatarEl.textContent = icon;
            oppDiv.appendChild(avatarEl);

            const nameEl = document.createElement('strong');
            nameEl.textContent = p.name;
            oppDiv.appendChild(nameEl);
            
            oppDiv.appendChild(document.createElement('br'));
            
            const cardsEl = document.createTextNode(`Cards: ${p.cardCount}`);
            oppDiv.appendChild(cardsEl);
            
            opponentsDiv.appendChild(oppDiv);
        }
    });
}

function renderShop() {
    if (!shopData || !myProfile) return;

    shopItemsContainer.innerHTML = '';

    // Group items by type
    const categories = {
        'avatar': 'Avatars',
        'chatColor': 'Chat Colors',
        'cardBack': 'Card Backs',
        'victory': 'Victory Animations'
    };

    for (const [type, typeName] of Object.entries(categories)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.gridColumn = '1 / -1';
        categoryDiv.innerHTML = `<h3 style="margin-top: 20px; border-bottom: 1px solid #555; padding-bottom: 5px;">${typeName}</h3>`;
        shopItemsContainer.appendChild(categoryDiv);

        for (const [id, item] of Object.entries(shopData)) {
            if (item.type !== type) continue;

            const div = document.createElement('div');
            div.className = 'shop-item';

            const icon = document.createElement('span');
            icon.className = 'avatar-icon';
            if (item.type === 'avatar') {
                icon.textContent = item.icon || '👤';
            } else if (item.type === 'chatColor') {
                icon.style.display = 'inline-block';
                icon.style.width = '40px';
                icon.style.height = '40px';
                icon.style.backgroundColor = item.color;
                icon.style.borderRadius = '50%';
                icon.textContent = '';
            } else if (item.type === 'cardBack') {
                icon.textContent = item.icon || '🃏';
            } else if (item.type === 'victory') {
                icon.textContent = item.icon || '🏆';
            }

            const title = document.createElement('h4');
            title.style.margin = '0';
            title.textContent = item.name;

            const price = document.createElement('p');
            price.innerHTML = item.price === 0 ? 'Free' : `${item.price} Coins`;
            if (item.minLevel) {
                price.innerHTML += `<br><span style="font-size: 0.8em; color: ${myProfile.level >= item.minLevel ? '#2ecc71' : '#e74c3c'}">Requires Lvl ${item.minLevel}</span>`;
            }

            div.appendChild(icon);

            const actionBtn = document.createElement('button');

            if (myProfile.skins.includes(id)) {
                if (myProfile.equippedAvatar === id || myProfile.equippedChatColor === id || myProfile.equippedCardBack === id || myProfile.equippedVictory === id) {
                    actionBtn.textContent = 'Equipped';
                    actionBtn.disabled = true;
                } else {
                    actionBtn.textContent = 'Equip';
                    actionBtn.addEventListener('click', () => socket.emit('equipSkin', id));
                }
            } else {
                actionBtn.textContent = 'Buy';
                actionBtn.addEventListener('click', () => socket.emit('buySkin', id));
                if (myProfile.coins < item.price || (item.minLevel && myProfile.level < item.minLevel)) {
                    actionBtn.disabled = true;
                }
            }

            div.appendChild(title);
            div.appendChild(price);
            div.appendChild(actionBtn);
            shopItemsContainer.appendChild(div);
        }
    }
}

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
        info.innerHTML = `<strong style="color: white;">Level ${item.minLevel}</strong><br><span style="color: #ccc;">Unlock: ${item.name} (${item.type})</span>`;

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
