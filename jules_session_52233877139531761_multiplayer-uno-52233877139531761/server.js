const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Game State
let players = {};
let deck = [];
let discardPile = [];
let currentPlayerIndex = 0;
let direction = 1;
let gameStarted = false;
let activeColor = null;
let colors = ['red', 'blue', 'green', 'yellow'];
let values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

function createDeck() {
    deck = [];
    for (let color of colors) {
        deck.push({ color, value: '0' });
        for (let value of values.slice(1)) {
            deck.push({ color, value });
            deck.push({ color, value });
        }
    }
    for (let i = 0; i < 4; i++) {
        deck.push({ color: 'wild', value: 'wild' });
        deck.push({ color: 'wild', value: 'wild4' });
    }
}

function shuffleDeck() {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function dealCards() {
    for (let playerId in players) {
        players[playerId].hand = [];
        for (let i = 0; i < 7; i++) {
            players[playerId].hand.push(deck.pop());
        }
    }
}

function getNextPlayerIndex() {
    const playerIds = Object.keys(players);
    let nextIndex = currentPlayerIndex + direction;
    if (nextIndex >= playerIds.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = playerIds.length - 1;
    }
    return nextIndex;
}

function broadcastGameState() {
    const playerIds = Object.keys(players);
    const currentPlayerId = playerIds[currentPlayerIndex];

    for (let id in players) {
        const publicPlayers = playerIds.map(pid => ({
            id: pid,
            name: players[pid].name,
            cardCount: players[pid].hand.length,
            isCurrentTurn: pid === currentPlayerId
        }));

        io.to(id).emit('gameState', {
            players: publicPlayers,
            hand: players[id].hand,
            discardPile: discardPile,
            topCard: discardPile[discardPile.length - 1] || null,
            activeColor: activeColor,
            currentPlayerId: currentPlayerId,
            gameStarted: gameStarted
        });
    }
}

function nextTurn() {
    currentPlayerIndex = getNextPlayerIndex();
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinGame', (playerName) => {
        if (!gameStarted) {
            players[socket.id] = { name: playerName || `Player ${Object.keys(players).length + 1}`, hand: [] };
            io.emit('playerJoined', Object.values(players).map(p => p.name));
            broadcastGameState();
        }
    });

    socket.on('startGame', () => {
        if (Object.keys(players).length >= 2 && !gameStarted) {
            gameStarted = true;
            createDeck();
            shuffleDeck();
            dealCards();

            // Set first card (non-wild, non-action if possible)
            let firstCard;
            do {
               firstCard = deck.pop();
               if (['wild', 'skip', 'reverse', 'draw2'].includes(firstCard.value) || firstCard.color === 'wild') {
                   deck.unshift(firstCard);
               } else {
                   discardPile.push(firstCard);
                   break;
               }
            } while (true);

            activeColor = discardPile[discardPile.length - 1].color;
            currentPlayerIndex = 0;
            direction = 1;
            broadcastGameState();
        }
    });

    socket.on('playCard', (cardIndex, selectedColor) => {
        if (!gameStarted) return;
        
        const playerIds = Object.keys(players);
        if (socket.id !== playerIds[currentPlayerIndex]) return;

        const player = players[socket.id];
        const cardToPlay = player.hand[cardIndex];
        const topCard = discardPile[discardPile.length - 1];

        // Validation logic
        const isValid = cardToPlay.color === 'wild' || 
                        cardToPlay.color === activeColor || 
                        cardToPlay.value === topCard.value;

        if (isValid) {
            player.hand.splice(cardIndex, 1);
            
            if (cardToPlay.color === 'wild') {
                activeColor = selectedColor || 'red'; // Default to red if not provided, though client should provide it
            } else {
                activeColor = cardToPlay.color;
            }
            discardPile.push(cardToPlay);

            // Action cards logic
            if (cardToPlay.value === 'reverse') {
                direction *= -1;
                if (playerIds.length === 2) {
                     nextTurn(); // Works as a skip in 2-player
                }
            } else if (cardToPlay.value === 'skip') {
                nextTurn();
            } else if (cardToPlay.value === 'draw2') {
                nextTurn();
                const nextPlayerId = playerIds[currentPlayerIndex];
                for(let i=0; i<2; i++) {
                    if (deck.length === 0) {
                        deck = discardPile.splice(0, discardPile.length - 1);
                        shuffleDeck();
                    }
                    if (deck.length > 0) {
                        players[nextPlayerId].hand.push(deck.pop());
                    }
                }
            } else if (cardToPlay.value === 'wild4') {
                nextTurn();
                const nextPlayerId = playerIds[currentPlayerIndex];
                for(let i=0; i<4; i++) {
                     if (deck.length === 0) {
                        deck = discardPile.splice(0, discardPile.length - 1);
                        shuffleDeck();
                    }
                    if (deck.length > 0) {
                        players[nextPlayerId].hand.push(deck.pop());
                    }
                }
            }

            // Check win
            if (player.hand.length === 0) {
                io.emit('gameOver', { winnerName: player.name });
                gameStarted = false;
                players = {};
                deck = [];
                discardPile = [];
                return;
            }

            nextTurn();
            broadcastGameState();
        }
    });

    socket.on('drawCard', () => {
         if (!gameStarted) return;
         
         const playerIds = Object.keys(players);
         if (socket.id !== playerIds[currentPlayerIndex]) return;

         if (deck.length === 0) {
            deck = discardPile.splice(0, discardPile.length - 1);
            shuffleDeck();
         }
         
         if (deck.length > 0) {
             players[socket.id].hand.push(deck.pop());
             nextTurn();
             broadcastGameState();
         }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (gameStarted) {
            const playerIds = Object.keys(players);
            const disconnectingPlayerIndex = playerIds.indexOf(socket.id);
            
            // Adjust current player index if the disconnecting player was before the current player
            if (disconnectingPlayerIndex !== -1 && disconnectingPlayerIndex < currentPlayerIndex) {
                currentPlayerIndex--;
            }
            // If the disconnecting player is the current player, and they were the last in the array, wrap around
            if (disconnectingPlayerIndex === currentPlayerIndex && currentPlayerIndex === playerIds.length - 1) {
                currentPlayerIndex = 0;
            }
        }

        delete players[socket.id];
        
        if (Object.keys(players).length < 2) {
            gameStarted = false;
            io.emit('gameOver', { winnerName: null, reason: 'Not enough players' });
            players = {}; // Reset for simple lobby
        } else if (gameStarted) {
             // Ensure index is within bounds if the array shrank
             if (currentPlayerIndex >= Object.keys(players).length) {
                 currentPlayerIndex = 0;
             }
             broadcastGameState();
        } else {
            // Update lobby if game hasn't started
            io.emit('playerJoined', Object.values(players).map(p => p.name));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
