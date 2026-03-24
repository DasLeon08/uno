const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Game State
const rooms = {};

const DB_FILE = 'users.json';

// Simple in-memory database for users
let usersDb = {}; // Key: username, Value: { password: '', coins: 0, wins: 0, skins: ['default'], equippedSkin: 'default' }

if (fs.existsSync(DB_FILE)) {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        usersDb = JSON.parse(data);
    } catch (err) {
        console.error('Error reading users database:', err);
    }
}

function saveUsers() {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(usersDb, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving users database:', err);
    }
}

const SKINS = {
    'default': { name: 'Default', icon: '👤', price: 0 },
    'dog': { name: 'Dog', icon: '🐶', price: 100 },
    'cat': { name: 'Cat', icon: '🐱', price: 100 },
    'fox': { name: 'Fox', icon: '🦊', price: 200 },
    'panda': { name: 'Panda', icon: '🐼', price: 200 },
    'unicorn': { name: 'Unicorn', icon: '🦄', price: 500 },
    'dragon': { name: 'Dragon', icon: '🐉', price: 500 },
    'alien': { name: 'Alien', icon: '👽', price: 1000 }
};

let colors = ['red', 'blue', 'green', 'yellow'];
let values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

function createRoomState(roomId, name, password, maxPlayers, isPrivate, hostId) {
    return {
        id: roomId,
        name: name || `Room ${roomId}`,
        password: password || '',
        maxPlayers: maxPlayers || 4,
        isPrivate: isPrivate || false,
        hostId: hostId,
        players: {},
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        direction: 1,
        gameStarted: false,
        activeColor: null,
        activePenalty: 0,
        penaltyType: null
    };
}

function handleWin(room, roomId, winningPlayer, winningPlayerId) {
    const playerIds = Object.keys(room.players);

    // Award coins and update leaderboard
    if (!winningPlayer.isBot && usersDb[winningPlayer.name]) {
        usersDb[winningPlayer.name].wins += 1;
        usersDb[winningPlayer.name].coins += 50; // Winner gets 50 coins

        const winnerSocket = io.sockets.sockets.get(winningPlayerId);
        if (winnerSocket) {
            winnerSocket.emit('profileUpdate', usersDb[winningPlayer.name]);
        }
    }

    // Award participation coins to other humans
    playerIds.forEach(id => {
        const p = room.players[id];
        if (!p.isBot && id !== winningPlayerId && usersDb[p.name]) {
            usersDb[p.name].coins += 10;
            const loserSocket = io.sockets.sockets.get(id);
            if (loserSocket) {
                loserSocket.emit('profileUpdate', usersDb[p.name]);
            }
        }
    });

    saveUsers();

    io.emit('leaderboardUpdate', getLeaderboard());
    io.to(roomId).emit('gameOver', { winnerName: winningPlayer.name });
    room.gameStarted = false;
    room.deck = [];
    room.discardPile = [];
    io.emit('publicRooms', getPublicRooms());
}

function getPublicRooms() {
    return Object.values(rooms)
        .filter(r => !r.isPrivate && !r.gameStarted && Object.keys(r.players).length < r.maxPlayers)
        .map(r => ({
            id: r.id,
            name: r.name,
            hasPassword: !!r.password,
            players: Object.keys(r.players).length,
            maxPlayers: r.maxPlayers
        }));
}

function createDeck(room) {
    room.deck = [];
    for (let color of colors) {
        room.deck.push({ color, value: '0' });
        for (let value of values.slice(1)) {
            room.deck.push({ color, value });
            room.deck.push({ color, value });
        }
    }
    for (let i = 0; i < 4; i++) {
        room.deck.push({ color: 'wild', value: 'wild' });
        room.deck.push({ color: 'wild', value: 'wild4' });
    }
}

function shuffleDeck(room) {
    for (let i = room.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [room.deck[i], room.deck[j]] = [room.deck[j], room.deck[i]];
    }
}

function dealCards(room) {
    for (let playerId in room.players) {
        room.players[playerId].hand = [];
        for (let i = 0; i < 7; i++) {
            room.players[playerId].hand.push(room.deck.pop());
        }
    }
}

function getNextPlayerIndex(room) {
    const playerIds = Object.keys(room.players);
    let nextIndex = room.currentPlayerIndex + room.direction;
    if (nextIndex >= playerIds.length) {
        nextIndex = 0;
    } else if (nextIndex < 0) {
        nextIndex = playerIds.length - 1;
    }
    return nextIndex;
}

function broadcastGameState(roomId) {
    const room = rooms[roomId];
    if (!room) return;

    const playerIds = Object.keys(room.players);
    const currentPlayerId = playerIds[room.currentPlayerIndex];

    for (let id in room.players) {
        if (!room.players[id].isBot) {
            const publicPlayers = playerIds.map(pid => ({
                id: pid,
                name: room.players[pid].name,
                cardCount: room.players[pid].hand.length,
                isCurrentTurn: pid === currentPlayerId,
                isBot: room.players[pid].isBot
            }));

            io.to(id).emit('gameState', {
                players: publicPlayers,
                hand: room.players[id].hand,
                discardPile: room.discardPile,
                topCard: room.discardPile[room.discardPile.length - 1] || null,
                activeColor: room.activeColor,
                currentPlayerId: currentPlayerId,
                gameStarted: room.gameStarted,
                activePenalty: room.activePenalty,
                penaltyType: room.penaltyType
            });
        }
    }
}

function playBotTurn(room) {
    if (!room.gameStarted) return;

    const playerIds = Object.keys(room.players);
    const currentPlayerId = playerIds[room.currentPlayerIndex];
    const bot = room.players[currentPlayerId];

    if (!bot || !bot.isBot) return;

    setTimeout(() => {
        // Double check state hasn't changed
        if (!room.gameStarted || playerIds[room.currentPlayerIndex] !== currentPlayerId) return;

        const topCard = room.discardPile[room.discardPile.length - 1];
        let validCards = [];

        // Find valid cards
        bot.hand.forEach((card, index) => {
            let isValid = card.color === 'wild' ||
                          card.color === room.activeColor ||
                          card.value === topCard.value;
            if (isValid) validCards.push({ card, index });
        });

        if (validCards.length > 0) {
            // Select card based on difficulty
            let cardToPlay;
            if (bot.difficulty === 'easy') {
                // Easy: Play first valid card
                cardToPlay = validCards[0];
            } else if (bot.difficulty === 'hard') {
                // Hard: Try to play action cards or keep wilds
                const nonWilds = validCards.filter(c => c.card.color !== 'wild');
                if (nonWilds.length > 0) {
                    cardToPlay = nonWilds[Math.floor(Math.random() * nonWilds.length)];
                } else {
                    cardToPlay = validCards[0];
                }
            } else {
                // Medium: random valid card
                cardToPlay = validCards[Math.floor(Math.random() * validCards.length)];
            }

            // Play the card
            bot.hand.splice(cardToPlay.index, 1);

            let selectedColor = null;
            if (cardToPlay.card.color === 'wild') {
                // Pick a color randomly or most frequent color in hand
                const colors = ['red', 'blue', 'green', 'yellow'];
                selectedColor = colors[Math.floor(Math.random() * colors.length)];
                room.activeColor = selectedColor;
            } else {
                room.activeColor = cardToPlay.card.color;
            }
            room.discardPile.push(cardToPlay.card);

            // Action logic
            if (cardToPlay.card.value === 'reverse') {
                room.direction *= -1;
                if (playerIds.length === 2) nextTurn(room);
            } else if (cardToPlay.card.value === 'skip') {
                nextTurn(room);
            } else if (cardToPlay.card.value === 'draw2' || cardToPlay.card.value === 'wild4') {
                const drawAmount = cardToPlay.card.value === 'draw2' ? 2 : 4;
                nextTurn(room);
                const victimId = playerIds[room.currentPlayerIndex];
                const victim = room.players[victimId];
                for(let i=0; i<drawAmount; i++) {
                     if (room.deck.length === 0) {
                         room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                         shuffleDeck(room);
                     }
                     if (room.deck.length > 0) victim.hand.push(room.deck.pop());
                 }
            }

            // Check win
            if (bot.hand.length === 0) {
                handleWin(room, room.id, bot, currentPlayerId);
                return;
            }

            nextTurn(room);
            broadcastGameState(room.id);
        } else {
            // Must draw
             if (room.deck.length === 0) {
                room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                shuffleDeck(room);
             }
             if (room.deck.length > 0) bot.hand.push(room.deck.pop());

             nextTurn(room);
             broadcastGameState(room.id);
        }

    }, 1500); // Thinking delay
}

function nextTurn(room) {
    room.currentPlayerIndex = getNextPlayerIndex(room);
    playBotTurn(room);
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('login', (username, password) => {
        if (!username || !password) return;

        // Create user if not exists
        if (!usersDb[username]) {
            usersDb[username] = {
                password: password, // In a real app, hash this!
                coins: 0,
                wins: 0,
                skins: ['default'],
                equippedSkin: 'default'
            };
            saveUsers();
        } else {
            // Check password
            if (usersDb[username].password !== password) {
                socket.emit('loginError', 'Incorrect password for this username.');
                return;
            }
        }

        socket.username = username; // Attach to socket for easy access

        // Don't send password to client
        const safeProfile = { ...usersDb[username] };
        delete safeProfile.password;

        socket.emit('loginSuccess', {
            username: username,
            profile: safeProfile,
            shopItems: SKINS
        });

        // Send leaderboard on login
        socket.emit('leaderboardUpdate', getLeaderboard());

        // Send public rooms
        socket.emit('publicRooms', getPublicRooms());
    });

    socket.on('buySkin', (skinId) => {
        const username = socket.username;
        if (!username || !usersDb[username]) return;

        const profile = usersDb[username];
        const skin = SKINS[skinId];

        if (skin && profile.coins >= skin.price && !profile.skins.includes(skinId)) {
            profile.coins -= skin.price;
            profile.skins.push(skinId);
            saveUsers();
            socket.emit('profileUpdate', profile);
        } else {
            socket.emit('shopError', 'Not enough coins or already owned.');
        }
    });

    socket.on('equipSkin', (skinId) => {
        const username = socket.username;
        if (!username || !usersDb[username]) return;

        const profile = usersDb[username];
        if (profile.skins.includes(skinId)) {
            profile.equippedSkin = skinId;
            saveUsers();
            socket.emit('profileUpdate', profile);
        }
    });

    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = createRoomState(roomId, data.name, data.password, data.maxPlayers, data.isPrivate, socket.id);

        socket.join(roomId);

        const hostName = socket.username || data.playerName || 'Host';
        const hostSkin = usersDb[hostName] ? usersDb[hostName].equippedSkin : 'default';

        rooms[roomId].players[socket.id] = {
            name: hostName,
            hand: [],
            isBot: false,
            equippedSkin: hostSkin
        };

        socket.emit('roomCreated', roomId);
        io.to(roomId).emit('playerJoined', Object.values(rooms[roomId].players));

        // Update public lobby list for others
        if (!data.isPrivate) {
            io.emit('publicRooms', getPublicRooms());
        }
    });

    socket.on('joinRoom', (roomId, playerName, password) => {
        const room = rooms[roomId];
        if (room && !room.gameStarted && Object.keys(room.players).length < room.maxPlayers) {
            if (room.password && room.password !== password) {
                socket.emit('joinError', 'Incorrect room password.');
                return;
            }

            socket.join(roomId);

            const pName = socket.username || playerName || `Player ${Object.keys(room.players).length + 1}`;
            const equippedSkin = usersDb[pName] ? usersDb[pName].equippedSkin : 'default';

            room.players[socket.id] = {
                name: pName,
                hand: [],
                isBot: false,
                equippedSkin: equippedSkin
            };
            io.to(roomId).emit('playerJoined', Object.values(room.players));
            broadcastGameState(roomId);

            // Update public lobby list for others
            if (!room.isPrivate) {
                io.emit('publicRooms', getPublicRooms());
            }
        } else {
            socket.emit('joinError', 'Room not found, full, or game started.');
        }
    });

    socket.on('addBot', (roomId, difficulty) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id && !room.gameStarted && Object.keys(room.players).length < room.maxPlayers) {
            const botId = `bot_${Math.random().toString(36).substring(2, 8)}`;
            const botNum = Object.values(room.players).filter(p => p.isBot).length + 1;

            // Randomly assign a bot an avatar
            const botAvatars = ['dog', 'cat', 'fox', 'panda', 'alien'];
            const botSkin = botAvatars[Math.floor(Math.random() * botAvatars.length)];

            room.players[botId] = {
                name: `Bot ${botNum} (${difficulty})`,
                hand: [],
                isBot: true,
                difficulty: difficulty,
                equippedSkin: botSkin
            };
            io.to(roomId).emit('playerJoined', Object.values(room.players));
            if (!room.isPrivate) {
                io.emit('publicRooms', getPublicRooms());
            }
        }
    });

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id && Object.keys(room.players).length >= 2 && !room.gameStarted) {
            room.gameStarted = true;
            createDeck(room);
            shuffleDeck(room);
            dealCards(room);

            // Set first card (non-wild, non-action if possible)
            let firstCard;
            do {
               firstCard = room.deck.pop();
               if (['wild', 'skip', 'reverse', 'draw2'].includes(firstCard.value) || firstCard.color === 'wild') {
                   room.deck.unshift(firstCard);
               } else {
                   room.discardPile.push(firstCard);
                   break;
               }
            } while (true);

            room.activeColor = room.discardPile[room.discardPile.length - 1].color;
            room.currentPlayerIndex = 0;
            room.direction = 1;
            room.activePenalty = 0;
            room.penaltyType = null;

            // If private, update lists (already handled technically, but we re-broadcast to clear it)
            io.emit('publicRooms', getPublicRooms());

            broadcastGameState(roomId);

            // Kick off bot turn if bot is first
            const playerIds = Object.keys(room.players);
            if (room.players[playerIds[0]].isBot) {
                playBotTurn(room);
            }
        }
    });

    socket.on('playCard', (roomId, cardIndex, selectedColor) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const playerIds = Object.keys(room.players);
        if (socket.id !== playerIds[room.currentPlayerIndex]) return;

        const player = room.players[socket.id];

        // Validate cardIndex is within bounds
        if (typeof cardIndex !== 'number' || cardIndex < 0 || cardIndex >= player.hand.length) return;

        const cardToPlay = player.hand[cardIndex];
        const topCard = room.discardPile[room.discardPile.length - 1];

        // Basic Validation
        let isValid = cardToPlay.color === 'wild' ||
                      cardToPlay.color === room.activeColor ||
                      cardToPlay.value === topCard.value;

        if (isValid) {
            player.hand.splice(cardIndex, 1);
            
            if (cardToPlay.color === 'wild') {
                room.activeColor = selectedColor || 'red';
            } else {
                room.activeColor = cardToPlay.color;
            }
            room.discardPile.push(cardToPlay);

            // Action cards logic
            if (cardToPlay.value === 'reverse') {
                room.direction *= -1;
                if (playerIds.length === 2) {
                     nextTurn(room);
                }
            } else if (cardToPlay.value === 'skip') {
                nextTurn(room);
            } else if (cardToPlay.value === 'draw2' || cardToPlay.value === 'wild4') {
                const drawAmount = cardToPlay.value === 'draw2' ? 2 : 4;
                nextTurn(room);
                const victimId = playerIds[room.currentPlayerIndex];
                const victim = room.players[victimId];
                for(let i=0; i<drawAmount; i++) {
                     if (room.deck.length === 0) {
                         room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                         shuffleDeck(room);
                     }
                     if (room.deck.length > 0) {
                         victim.hand.push(room.deck.pop());
                     }
                }
            }

            // Check win
            if (player.hand.length === 0) {
                handleWin(room, roomId, player, socket.id);
                return;
            }

            nextTurn(room);
            broadcastGameState(roomId);
        }
    });

    socket.on('drawCard', (roomId) => {
         const room = rooms[roomId];
         if (!room || !room.gameStarted) return;
         
         const playerIds = Object.keys(room.players);
         if (socket.id !== playerIds[room.currentPlayerIndex]) return;

         // Draw single card
         if (room.deck.length === 0) {
            room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
            shuffleDeck(room);
         }
         if (room.deck.length > 0) {
             room.players[socket.id].hand.push(room.deck.pop());
         }

         nextTurn(room);
         broadcastGameState(roomId);
    });

    socket.on('chatMessage', (roomId, msg) => {
        const username = socket.username || 'Player';
        // Send chat to everyone in the room
        io.to(roomId).emit('chatMessage', { sender: username, text: msg });
    });

    socket.on('sendEmote', (roomId, emote) => {
        const username = socket.username || 'Player';
        // Broadcast emote so it shows over the player's avatar
        io.to(roomId).emit('playerEmote', { playerId: socket.id, emote: emote });
    });

    socket.on('playAgain', (roomId) => {
        const room = rooms[roomId];
        if (room && !room.gameStarted) {
            // Keep players in the room but clear their hands
            for (let playerId in room.players) {
                room.players[playerId].hand = [];
            }

            // Notify ALL clients in the room to go back to the lobby screen
            io.to(roomId).emit('returnToLobby');
            io.to(roomId).emit('playerJoined', Object.values(room.players));

            if (!room.isPrivate) {
                io.emit('publicRooms', getPublicRooms());
            }
        }
    });

    socket.on('leaveRoom', (roomId) => {
        handlePlayerLeave(roomId, socket.id);
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        // Find room user was in
        let userRoomId = null;
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id]) {
                userRoomId = roomId;
                break;
            }
        }

        if (userRoomId) {
            handlePlayerLeave(userRoomId, socket.id);
        }
    });

    function handlePlayerLeave(userRoomId, playerId) {
        const room = rooms[userRoomId];
        if (!room) return;
            const playerIds = Object.keys(room.players);

            if (room.gameStarted) {
                const disconnectingPlayerIndex = playerIds.indexOf(socket.id);

                if (disconnectingPlayerIndex !== -1 && disconnectingPlayerIndex < room.currentPlayerIndex) {
                    room.currentPlayerIndex--;
                }
                if (disconnectingPlayerIndex === room.currentPlayerIndex && room.currentPlayerIndex === playerIds.length - 1) {
                    room.currentPlayerIndex = 0;
                }
            }

            delete room.players[socket.id];

            // Handle Host Leaving
            if (room.hostId === socket.id) {
                const humanPlayers = Object.keys(room.players).filter(pid => !room.players[pid].isBot);
                if (humanPlayers.length === 0) {
                    delete rooms[userRoomId];
                } else if (!room.gameStarted) {
                    // Host left before game started: transfer host or close lobby
                    // Let's transfer host to the first human
                    room.hostId = humanPlayers[0];
                    io.to(room.hostId).emit('hostTransferred');
                    io.to(userRoomId).emit('playerJoined', Object.values(room.players));
                } else {
                    // Host left during game
                    room.hostId = humanPlayers[0];
                }
            } else {
                const humanPlayers = Object.values(room.players).filter(p => !p.isBot);
                if (humanPlayers.length === 0) {
                    delete rooms[userRoomId];
                }
            }

            if (rooms[userRoomId]) {
                if (Object.keys(room.players).length < 2) {
                    room.gameStarted = false;
                    io.to(userRoomId).emit('gameOver', { winnerName: null, reason: 'Not enough players' });
                } else if (room.gameStarted) {
                     if (room.currentPlayerIndex >= Object.keys(room.players).length) {
                         room.currentPlayerIndex = 0;
                     }
                     broadcastGameState(userRoomId);
                     // If the next player is a bot, ensure they take their turn
                     const currentPlayerId = Object.keys(room.players)[room.currentPlayerIndex];
                     if (room.players[currentPlayerId].isBot) {
                         playBotTurn(room);
                     }
                } else {
                    io.to(userRoomId).emit('playerJoined', Object.values(room.players));
                }
            }

            io.emit('publicRooms', getPublicRooms());
    }
});

function getLeaderboard() {
    return Object.entries(usersDb)
        .map(([username, data]) => ({ username, wins: data.wins, coins: data.coins }))
        .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.coins - a.coins;
        })
        .slice(0, 10);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
