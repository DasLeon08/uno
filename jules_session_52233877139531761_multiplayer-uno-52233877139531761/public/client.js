const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const serverBrowserScreen = document.getElementById('server-browser-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const mainMenu = document.getElementById('main-menu');
const displayUsername = document.getElementById('display-username');
const displayCoins = document.getElementById('display-coins');
const playerNameInput = document.getElementById('player-name');

const singleplayerBtn = document.getElementById('singleplayer-btn');
const multiplayerBtn = document.getElementById('multiplayer-btn');
const shopBtn = document.getElementById('shop-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');

const shopModal = document.getElementById('shop-modal');
const shopCoins = document.getElementById('shop-coins');
const shopItemsContainer = document.getElementById('shop-items');
const closeShopBtn = document.getElementById('close-shop-btn');

const leaderboardModal = document.getElementById('leaderboard-modal');
const leaderboardTableBody = document.querySelector('#leaderboard-table tbody');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

const publicRoomsList = document.getElementById('public-rooms-list');
const showCreateRoomBtn = document.getElementById('show-create-room-btn');
const backToLoginBtn = document.getElementById('back-to-login-btn');
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

const opponentsDiv = document.getElementById('opponents');
const discardPileDiv = document.getElementById('discard-pile');
const myHandDiv = document.getElementById('my-hand');
const deckDiv = document.getElementById('deck');
const myNameEl = document.getElementById('my-name');

const colorPicker = document.getElementById('color-picker');
const winnerMessage = document.getElementById('winner-message');
const playAgainBtn = document.getElementById('play-again-btn');
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
loginBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    socket.emit('login', name);
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

backToLoginBtn.addEventListener('click', () => {
    serverBrowserScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
});

showCreateRoomBtn.addEventListener('click', () => {
    createRoomModal.classList.remove('hidden');
});

createRoomCancelBtn.addEventListener('click', () => {
    createRoomModal.classList.add('hidden');
});

createRoomConfirmBtn.addEventListener('click', () => {
    const roomName = document.getElementById('room-name-input').value.trim();
    const maxPlayers = parseInt(document.getElementById('room-max-players').value);
    const isPrivate = document.getElementById('room-private-checkbox').checked;
    const name = playerNameInput.value.trim() || 'Player';

    isHost = true;
    socket.emit('createRoom', { name: roomName, maxPlayers, isPrivate, playerName: name });
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
    if (isMyTurn && currentRoomId) {
        socket.emit('drawCard', currentRoomId);
    }
});

playAgainBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    window.location.reload(); // Quick reset for simplicity
});

themeSelector.addEventListener('change', (e) => {
    document.body.className = e.target.value;
});

// Setup color picker logic
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const selectedColor = e.target.dataset.color;
        colorPicker.classList.add('hidden');
        if (pendingWildCardIndex !== null && currentRoomId) {
            socket.emit('playCard', currentRoomId, pendingWildCardIndex, selectedColor);
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
            info.textContent = `${room.name} (${room.players}/${room.maxPlayers})`;

            const joinBtn = document.createElement('button');
            joinBtn.textContent = 'Join';
            joinBtn.style.padding = '5px 10px';
            joinBtn.addEventListener('click', () => {
                const name = myProfile ? myProfile.username : 'Player';
                isHost = false;
                currentRoomId = room.id;
                lobbyIdDisplay.textContent = `(ID: ${room.id})`;
                socket.emit('joinRoom', room.id, name);
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
    shopCoins.textContent = myProfile.coins;

    loginForm.classList.add('hidden');
    mainMenu.classList.remove('hidden');
});

socket.on('profileUpdate', (profile) => {
    myProfile = { ...myProfile, ...profile };
    displayCoins.textContent = myProfile.coins;
    shopCoins.textContent = myProfile.coins;
    renderShop();
});

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

        const tdWins = document.createElement('td');
        tdWins.textContent = entry.wins;

        const tdCoins = document.createElement('td');
        tdCoins.textContent = entry.coins;

        tr.appendChild(tdRank);
        tr.appendChild(tdUsername);
        tr.appendChild(tdWins);
        tr.appendChild(tdCoins);

        leaderboardTableBody.appendChild(tr);
    });
});

socket.on('playerJoined', (players) => {
    serverBrowserScreen.classList.add('hidden');
    loginScreen.classList.add('hidden');
    lobbyScreen.classList.remove('hidden');

    playersList.innerHTML = '';
    players.forEach(p => {
        const li = document.createElement('li');
        // Include skin in display if available
        const skinText = p.equippedSkin && p.equippedSkin !== 'default' ? ` [${p.equippedSkin}]` : '';
        li.textContent = `${p.name}${skinText}`;
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

socket.on('gameState', (state) => {
    if (state.gameStarted) {
        lobbyScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
    }

    renderOpponents(state.players);
    renderHand(state.hand);
    renderDiscardPile(state.topCard, state.activeColor);
    
    // Check if it's my turn
    const me = state.players.find(p => p.id === myId);
    if (me) {
        isMyTurn = me.isCurrentTurn;
        myNameEl.textContent = `My Hand (${me.name}) ${isMyTurn ? " - MY TURN!" : ""}`;
        if (isMyTurn) {
            myNameEl.classList.add('my-turn');
        } else {
            myNameEl.classList.remove('my-turn');
        }
    }
});

socket.on('gameOver', (data) => {
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    if (data.winnerName) {
        winnerMessage.textContent = `${data.winnerName} won the game!`;
    } else {
        winnerMessage.textContent = data.reason || 'Game Over';
    }
});

// Render Functions
function createCardElement(card, index = null) {
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.color || 'wild'}`;
    
    let displayValue = card.value;
    if (displayValue === 'wild') displayValue = 'WILD';
    if (displayValue === 'wild4') displayValue = '+4';
    if (displayValue === 'draw2') displayValue = '+2';
    if (displayValue === 'skip') displayValue = 'SKIP';
    if (displayValue === 'reverse') displayValue = 'REV';

    cardEl.textContent = displayValue;

    if (index !== null) {
        cardEl.addEventListener('click', () => handleCardPlay(card, index));
    }

    return cardEl;
}

function handleCardPlay(card, index) {
    if (!isMyTurn || !currentRoomId) return;

    if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
        pendingWildCardIndex = index;
        colorPicker.classList.remove('hidden');
    } else {
        socket.emit('playCard', currentRoomId, index);
    }
}

function renderHand(hand) {
    myHandDiv.innerHTML = '';
    hand.forEach((card, index) => {
        myHandDiv.appendChild(createCardElement(card, index));
    });
}

function renderDiscardPile(topCard, activeColor) {
    discardPileDiv.innerHTML = '';
    if (topCard) {
        const cardEl = createCardElement(topCard);
        if (topCard.color === 'wild' && activeColor) {
            // Visualize the chosen color for wild cards
            cardEl.style.boxShadow = `0 0 15px ${activeColor}`;
            cardEl.style.borderColor = activeColor;
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
            
            const nameEl = document.createElement('strong');
            const skinText = p.equippedSkin && p.equippedSkin !== 'default' ? ` [${p.equippedSkin}]` : '';
            nameEl.textContent = `${p.name}${skinText}`;
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
    for (const [id, item] of Object.entries(shopData)) {
        const div = document.createElement('div');
        div.className = 'shop-item';

        const title = document.createElement('h4');
        title.style.margin = '0';
        title.textContent = item.name;

        const price = document.createElement('p');
        price.textContent = id === 'default' ? 'Free' : `${item.price} Coins`;

        const actionBtn = document.createElement('button');

        if (myProfile.skins.includes(id)) {
            if (myProfile.equippedSkin === id) {
                actionBtn.textContent = 'Equipped';
                actionBtn.disabled = true;
            } else {
                actionBtn.textContent = 'Equip';
                actionBtn.addEventListener('click', () => socket.emit('equipSkin', id));
            }
        } else {
            actionBtn.textContent = 'Buy';
            actionBtn.addEventListener('click', () => socket.emit('buySkin', id));
            if (myProfile.coins < item.price) {
                actionBtn.disabled = true;
            }
        }

        div.appendChild(title);
        div.appendChild(price);
        div.appendChild(actionBtn);
        shopItemsContainer.appendChild(div);
    }
}
