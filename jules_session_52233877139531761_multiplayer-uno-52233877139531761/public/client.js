const socket = io();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const gameOverScreen = document.getElementById('game-over-screen');

const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const playersList = document.getElementById('players-list');
const startBtn = document.getElementById('start-btn');

const opponentsDiv = document.getElementById('opponents');
const discardPileDiv = document.getElementById('discard-pile');
const myHandDiv = document.getElementById('my-hand');
const deckDiv = document.getElementById('deck');
const myNameEl = document.getElementById('my-name');

const colorPicker = document.getElementById('color-picker');
const winnerMessage = document.getElementById('winner-message');
const playAgainBtn = document.getElementById('play-again-btn');

// State
let myId = null;
let isMyTurn = false;
let pendingWildCardIndex = null;

// Event Listeners
joinBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        socket.emit('joinGame', name);
        loginScreen.classList.add('hidden');
        lobbyScreen.classList.remove('hidden');
    }
});

startBtn.addEventListener('click', () => {
    socket.emit('startGame');
});

deckDiv.addEventListener('click', () => {
    if (isMyTurn) {
        socket.emit('drawCard');
    }
});

playAgainBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    window.location.reload(); // Quick reset for simplicity
});

// Setup color picker logic
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const selectedColor = e.target.dataset.color;
        colorPicker.classList.add('hidden');
        if (pendingWildCardIndex !== null) {
            socket.emit('playCard', pendingWildCardIndex, selectedColor);
            pendingWildCardIndex = null;
        }
    });
});

// Socket Events
socket.on('connect', () => {
    myId = socket.id;
});

socket.on('playerJoined', (playerNames) => {
    playersList.innerHTML = '';
    playerNames.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        playersList.appendChild(li);
    });

    if (playerNames.length >= 2) {
        startBtn.classList.remove('hidden');
    }
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
    if (!isMyTurn) return;

    if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
        pendingWildCardIndex = index;
        colorPicker.classList.remove('hidden');
    } else {
        socket.emit('playCard', index);
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
            nameEl.textContent = p.name;
            oppDiv.appendChild(nameEl);
            
            oppDiv.appendChild(document.createElement('br'));
            
            const cardsEl = document.createTextNode(`Cards: ${p.cardCount}`);
            oppDiv.appendChild(cardsEl);
            
            opponentsDiv.appendChild(oppDiv);
        }
    });
}
