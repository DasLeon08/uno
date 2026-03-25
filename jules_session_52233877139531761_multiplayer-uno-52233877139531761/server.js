const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game State
const rooms = {};
const onlineUsers = {}; // Key: username, Value: socket.id

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
    'defaultAvatar': { name: 'Default', icon: '👤', price: 0, type: 'avatar' },
    'dog': { name: 'Dog', icon: '🐶', price: 100, type: 'avatar' },
    'cat': { name: 'Cat', icon: '🐱', price: 100, type: 'avatar' },
    'fox': { name: 'Fox', icon: '🦊', price: 200, type: 'avatar' },
    'panda': { name: 'Panda', icon: '🐼', price: 200, type: 'avatar' },
    'unicorn': { name: 'Unicorn', icon: '🦄', price: 500, type: 'avatar' },
    'dragon': { name: 'Dragon', icon: '🐉', price: 500, type: 'avatar' },
    'alien': { name: 'Alien', icon: '👽', price: 1000, type: 'avatar' },
    'robot': { name: 'Robot', icon: '🤖', price: 0, type: 'avatar', minLevel: 5 },
    'ninja': { name: 'Ninja', icon: '🥷', price: 0, type: 'avatar', minLevel: 15 },
    'king': { name: 'King', icon: '👑', price: 0, type: 'avatar', minLevel: 30 },

    'defaultChatColor': { name: 'Default Black', color: '#333333', price: 0, type: 'chatColor' },
    'redChat': { name: 'Red Text', color: '#e74c3c', price: 150, type: 'chatColor' },
    'blueChat': { name: 'Blue Text', color: '#3498db', price: 150, type: 'chatColor' },
    'goldChat': { name: 'Gold Text', color: '#f1c40f', price: 500, type: 'chatColor' },
    'rainbowChat': { name: 'Rainbow Text', color: 'linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)', price: 0, type: 'chatColor', minLevel: 10 },

    'defaultCardBack': { name: 'Default Red', icon: '🃏', price: 0, type: 'cardBack' },
    'blackCardBack': { name: 'Dark Mode Cards', icon: '🃏', price: 300, type: 'cardBack' },
    'goldCardBack': { name: 'Golden Cards', icon: '🃏', price: 1000, type: 'cardBack' },
    'legendaryFire': { name: 'Legendary Fire', icon: '🔥', price: 2000, type: 'cardBack', minLevel: 10 },
    'legendaryMatrix': { name: 'Matrix Code', icon: '💻', price: 2000, type: 'cardBack', minLevel: 10 },

    'defaultVictory': { name: 'Confetti', icon: '🎉', price: 0, type: 'victory' },
    'fireworks': { name: 'Fireworks', icon: '🎆', price: 1000, type: 'victory' },
    'matrixRain': { name: 'Matrix Rain', icon: '🌧️', price: 1500, type: 'victory' },
    'lightning': { name: 'Lightning Strike', icon: '⚡', price: 0, type: 'victory', minLevel: 20 }
};

let colors = ['red', 'blue', 'green', 'yellow'];
let values = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2'];

function createRoomState(roomId, data, hostId) {
    return {
        id: roomId,
        name: data.name || `Room ${roomId}`,
        password: data.password || '',
        maxPlayers: data.maxPlayers || 4,
        isPrivate: data.isPrivate || false,
        speedMode: data.speedMode || false,
        noMercyMode: data.noMercyMode || false,
        rankedMode: data.rankedMode || false,
        zeroSevenMode: data.zeroSevenMode || false,
        jumpInMode: data.jumpInMode || false,
        drawUntilPlayMode: data.drawUntilPlayMode || false,
        wildRouletteMode: data.wildRouletteMode || false,
        teamMode: data.teamMode || false,
        combinationsMode: data.combinationsMode || false,
        specialCardsMode: data.specialCardsMode || false,
        hostId: hostId,
        players: {},
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        direction: 1,
        gameStarted: false,
        activeColor: null,
        activePenalty: 0,
        penaltyType: null,
        turnTimerTimeout: null,
        turnStartTime: null
    };
}

function checkLevelUp(profile) {
    if (profile.xp === undefined) return;
    const newLevel = Math.floor(Math.sqrt(profile.xp / 100)) + 1;
    if (newLevel > profile.level) {
        profile.level = newLevel;
    }
    // Check title unlocks
    if (profile.wins >= 10 && profile.unlockedTitles && !profile.unlockedTitles.includes('UNO-Meister')) {
        profile.unlockedTitles.push('UNO-Meister');
        profile.title = 'UNO-Meister'; // Auto-equip the new title
    }
}

function handleWin(room, roomId, winningPlayer, winningPlayerId) {
    const playerIds = Object.keys(room.players);

    let teammateId = null;
    let teammate = null;

    if (room.teamMode) {
        const winnerIndex = playerIds.indexOf(winningPlayerId);
        const teammateIndex = (winnerIndex + 2) % playerIds.length;
        if (teammateIndex < playerIds.length) {
            teammateId = playerIds[teammateIndex];
            teammate = room.players[teammateId];
        }
    }

    // Update games played for everyone
    playerIds.forEach(pId => {
        const p = room.players[pId];
        if (!p.isBot && usersDb[p.name]) {
            if (usersDb[p.name].gamesPlayed === undefined) usersDb[p.name].gamesPlayed = 0;
            usersDb[p.name].gamesPlayed += 1;
            usersDb[p.name].xp += 20; // 20 XP for playing
            checkLevelUp(usersDb[p.name]);
        }
    });

    // Award coins and update leaderboard for winner
    if (!winningPlayer.isBot && usersDb[winningPlayer.name]) {
        usersDb[winningPlayer.name].wins += 1;
        usersDb[winningPlayer.name].coins += 50; // Winner gets 50 coins
        usersDb[winningPlayer.name].xp += 80; // Additional 80 XP for winning (Total 100)

        if (room.zeroSevenMode) {
            usersDb[winningPlayer.name].quests.win_07 += 1;
            if (usersDb[winningPlayer.name].quests.win_07 === 2) { // Goal: 2 wins
                usersDb[winningPlayer.name].coins += 50;
            }
        }

        checkLevelUp(usersDb[winningPlayer.name]);

        const winnerSocket = io.sockets.sockets.get(winningPlayerId);
        if (winnerSocket) {
            winnerSocket.emit('profileUpdate', usersDb[winningPlayer.name]);
        }
    }

    // Award coins and update leaderboard for teammate (if applicable)
    if (teammate && !teammate.isBot && usersDb[teammate.name]) {
        usersDb[teammate.name].wins += 1;
        usersDb[teammate.name].coins += 50; // Teammate also gets full 50 coins
        usersDb[teammate.name].xp += 80; // Full win XP

        if (room.zeroSevenMode) {
            usersDb[teammate.name].quests.win_07 += 1;
            if (usersDb[teammate.name].quests.win_07 === 2) {
                usersDb[teammate.name].coins += 50;
            }
        }

        checkLevelUp(usersDb[teammate.name]);

        const teammateSocket = io.sockets.sockets.get(teammateId);
        if (teammateSocket) {
            teammateSocket.emit('profileUpdate', usersDb[teammate.name]);
        }
    }

    // Award participation coins to other humans (losers)
    playerIds.forEach(id => {
        const p = room.players[id];
        if (!p.isBot && id !== winningPlayerId && id !== teammateId && usersDb[p.name]) {
            usersDb[p.name].coins += 10;
            const loserSocket = io.sockets.sockets.get(id);
            if (loserSocket) {
                loserSocket.emit('profileUpdate', usersDb[p.name]);
            }
        }
    });

    saveUsers();

    io.emit('leaderboardUpdate', getLeaderboard());

    const victorySkin = usersDb[winningPlayer.name] ? usersDb[winningPlayer.name].equippedVictory : 'defaultVictory';
    io.to(roomId).emit('gameOver', { winnerName: winningPlayer.name, winnerId: winningPlayerId, victorySkin: victorySkin });
    room.gameStarted = false;
    room.deck = [];
    room.discardPile = [];
    io.emit('publicRooms', getPublicRooms());
}

function getPublicRooms() {
    return Object.values(rooms)
        .filter(r => !r.isPrivate && Object.keys(r.players).length < r.maxPlayers)
        .map(r => ({
            id: r.id,
            name: r.name,
            hasPassword: !!r.password,
            players: Object.keys(r.players).length,
            maxPlayers: r.maxPlayers,
            gameStarted: r.gameStarted
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

    if (room.specialCardsMode) {
        for (let i = 0; i < 4; i++) {
            room.deck.push({ color: 'special', value: 'reflector' });
            room.deck.push({ color: 'special', value: 'roulette' });
        }
        for (let i = 0; i < 2; i++) {
            room.deck.push({ color: 'special', value: 'equalize' });
        }
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

    const publicPlayers = playerIds.map(pid => ({
        id: pid,
        name: room.players[pid].name,
        cardCount: room.players[pid].hand.length,
        isCurrentTurn: pid === currentPlayerId,
        isBot: room.players[pid].isBot
    }));

    for (let id in room.players) {
        if (!room.players[id].isBot) {
            io.to(id).emit('gameState', {
                players: publicPlayers,
                hand: room.players[id].hand,
                discardPile: room.discardPile,
                topCard: room.discardPile[room.discardPile.length - 1] || null,
                activeColor: room.activeColor,
                currentPlayerId: currentPlayerId,
                gameStarted: room.gameStarted,
                activePenalty: room.activePenalty,
                penaltyType: room.penaltyType,
                hasDrawn: room.players[id].hasDrawn,
                spectatorCount: room.spectators ? room.spectators.length : 0
            });
        }
    }

    // Broadcast to spectators
    if (room.spectators) {
        room.spectators.forEach(spec => {
            io.to(spec.id).emit('gameState', {
                players: publicPlayers,
                hand: [], // Spectators have no hand
                discardPile: room.discardPile,
                topCard: room.discardPile[room.discardPile.length - 1] || null,
                activeColor: room.activeColor,
                currentPlayerId: currentPlayerId,
                gameStarted: room.gameStarted,
                activePenalty: room.activePenalty,
                penaltyType: room.penaltyType,
                hasDrawn: false,
                spectatorCount: room.spectators ? room.spectators.length : 0,
                isSpectator: true
            });
        });
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

            let isValid = card.color === 'wild' || card.color === 'special' ||
                          card.color === room.activeColor ||
                          card.value === topCard.value;

            if (isValid) validCards.push({ card, index });
        });

        if (validCards.length > 0) {
            // Select card based on difficulty
            let cardToPlay;
            // Prevent immediate identical card match (unless it's the only option)
            let preferredCards = validCards.filter(c => !(c.card.color === topCard.color && c.card.value === topCard.value && c.card.color !== 'wild'));
            let cardsPool = preferredCards.length > 0 ? preferredCards : validCards;

            if (bot.difficulty === 'easy') {
                cardToPlay = cardsPool[0];
            } else if (bot.difficulty === 'hard') {
                const nonWilds = cardsPool.filter(c => c.card.color !== 'wild');
                if (nonWilds.length > 0) {
                    cardToPlay = nonWilds[Math.floor(Math.random() * nonWilds.length)];
                } else {
                    cardToPlay = cardsPool[0];
                }
            } else {
                cardToPlay = cardsPool[Math.floor(Math.random() * cardsPool.length)];
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
            } else if (room.zeroSevenMode && cardToPlay.card.value === '0') {
                // 0: Rotate hands
                io.to(room.id).emit('chatMessage', { sender: "System", text: `${bot.name} played a 0. All hands are rotated!` });
                let hands = playerIds.map(id => room.players[id].hand);
                if (room.direction === 1) {
                    // Rotate right
                    let lastHand = hands.pop();
                    hands.unshift(lastHand);
                } else {
                    // Rotate left
                    let firstHand = hands.shift();
                    hands.push(firstHand);
                }
                playerIds.forEach((id, idx) => {
                    room.players[id].hand = hands[idx];
                });
            } else if (room.zeroSevenMode && cardToPlay.card.value === '7') {
                // 7: Swap hands with random player
                const otherPlayerIds = playerIds.filter(id => id !== currentPlayerId);
                if (otherPlayerIds.length > 0) {
                    const targetId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
                    const targetPlayer = room.players[targetId];
                    io.to(room.id).emit('chatMessage', { sender: "System", text: `${bot.name} played a 7 and swapped hands with ${targetPlayer.name}!` });

                    const tempHand = bot.hand;
                    bot.hand = targetPlayer.hand;
                    targetPlayer.hand = tempHand;
                }
            }

            // Check win conditions for all players after potential hand swaps
            for (let pid of playerIds) {
                if (room.players[pid].hand.length === 0) {
                    handleWin(room, room.id, room.players[pid], pid);
                    return;
                }
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

    }, Math.floor(Math.random() * 1500) + 1500); // Randomized Thinking delay
}

function nextTurn(room) {
    room.currentPlayerIndex = getNextPlayerIndex(room);

    // Reset hasDrawn and calledUno for the new player
    const playerIds = Object.keys(room.players);
    if (playerIds.length > 0) {
        const nextPlayer = room.players[playerIds[room.currentPlayerIndex]];
        if (nextPlayer) {
            nextPlayer.hasDrawn = false;
            if (nextPlayer.hand.length > 2) { // Reset calledUno if they have > 2 cards
                nextPlayer.calledUno = false;
            }
        }
    }

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
                equippedVictory: 'defaultVictory'
            };
            saveUsers();
        } else {
            // Migrate old profiles
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

            // Check password
            if (usersDb[username].password !== password) {
                socket.emit('loginError', 'Incorrect password for this username.');
                return;
            }
        }

        socket.username = username; // Attach to socket for easy access
        onlineUsers[username] = socket.id;

        // Daily Login Bonus
        const today = new Date().toISOString().split('T')[0];
        let dailyBonusAwarded = false;

        if (usersDb[username].lastLoginDate !== today) {
            usersDb[username].lastLoginDate = today;
            usersDb[username].coins += 20; // 20 coins daily bonus
            dailyBonusAwarded = true;
            saveUsers();
        }

        // Don't send password to client
        const safeProfile = { ...usersDb[username] };
        delete safeProfile.password;

        socket.emit('loginSuccess', {
            username: username,
            profile: safeProfile,
            shopItems: SKINS,
            dailyBonusAwarded: dailyBonusAwarded
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
        const skin = SKINS[skinId];

        if (skin && profile.skins.includes(skinId)) {
            if (skin.type === 'avatar') {
                profile.equippedAvatar = skinId;
            } else if (skin.type === 'chatColor') {
                profile.equippedChatColor = skinId;
            } else if (skin.type === 'cardBack') {
                profile.equippedCardBack = skinId;
            } else if (skin.type === 'victory') {
                profile.equippedVictory = skinId;
            }

            saveUsers();
            socket.emit('profileUpdate', profile);
        }
    });

    socket.on('createRoom', (data) => {
        const roomId = Math.random().toString(36).substring(2, 8);
        rooms[roomId] = createRoomState(roomId, data, socket.id);

        socket.join(roomId);

        const hostName = socket.username || data.playerName || 'Host';
        const hostAvatar = usersDb[hostName] ? usersDb[hostName].equippedAvatar : 'defaultAvatar';

        rooms[roomId].players[socket.id] = {
            name: hostName,
            hand: [],
            isBot: false,
            equippedAvatar: hostAvatar
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
        if (room && Object.keys(room.players).length < room.maxPlayers) {
            if (room.password && room.password !== password) {
                socket.emit('joinError', 'Incorrect room password.');
                return;
            }

            socket.join(roomId);

            const pName = socket.username || playerName || `Player ${Object.keys(room.players).length + 1}`;
            const equippedSkin = usersDb[pName] ? usersDb[pName].equippedSkin : 'default';

            if (room.gameStarted) {
                // Join as spectator
                room.spectators = room.spectators || [];
                room.spectators.push({ id: socket.id, name: pName });
                socket.emit('chatMessage', { sender: 'System', text: 'You joined as a spectator.' });

                // Manually trigger game state for this one spectator
                const publicPlayers = Object.values(room.players).map(p => ({
                    id: Object.keys(room.players).find(key => room.players[key] === p),
                    name: p.name,
                    cardCount: p.hand.length,
                    isCurrentTurn: Object.keys(room.players)[room.currentPlayerIndex] === Object.keys(room.players).find(key => room.players[key] === p),
                    isBot: p.isBot,
                    equippedSkin: p.equippedSkin
                }));

                socket.emit('gameState', {
                    players: publicPlayers,
                    hand: [], // Spectators have no hand
                    discardPile: room.discardPile,
                    topCard: room.discardPile[room.discardPile.length - 1] || null,
                    activeColor: room.activeColor,
                    currentPlayerId: Object.keys(room.players)[room.currentPlayerIndex],
                    gameStarted: room.gameStarted,
                    activePenalty: room.activePenalty,
                    penaltyType: room.penaltyType,
                    hasDrawn: false,
                    isSpectator: true
                });

            } else {
                room.players[socket.id] = {
                    name: pName,
                    hand: [],
                    isBot: false,
                    equippedSkin: equippedSkin
                };
                io.to(roomId).emit('playerJoined', Object.values(room.players));
                broadcastGameState(roomId);
            }

            // Update public lobby list for others
            if (!room.isPrivate) {
                io.emit('publicRooms', getPublicRooms());
            }
        } else {
            socket.emit('joinError', 'Room not found or full.');
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
        const player = room.players[socket.id];

        // Support array of indices for combinations mode or a single index
        let indicesToPlay = Array.isArray(cardIndex) ? cardIndex : [cardIndex];

        // Remove duplicates, sort descending so splicing doesn't mess up indices
        indicesToPlay = [...new Set(indicesToPlay)].sort((a,b) => b-a);

        // Basic check if all requested indices exist
        for (let idx of indicesToPlay) {
            if (typeof idx !== 'number' || idx < 0 || idx >= player.hand.length) return;
        }

        const cardsToPlay = indicesToPlay.map(idx => player.hand[idx]);
        const topCard = room.discardPile[room.discardPile.length - 1];

        let isValid = false;
        const isCurrentTurn = socket.id === playerIds[room.currentPlayerIndex];

        if (cardsToPlay.length > 1) {
            // Validate combinations (only allowed if room flag set, must be same value, must be current turn for simplicity)
            if (!room.combinationsMode || !isCurrentTurn) return;
            
            const firstCard = cardsToPlay[0];
            const allSameValue = cardsToPlay.every(c => c.value === firstCard.value);
            if (!allSameValue) return; // Cannot combine different values

            // To start a combo, at least one card must be playable on the top card
            const anyPlayable = cardsToPlay.some(c => c.color === 'wild' || c.color === room.activeColor || c.value === topCard.value);
            if (anyPlayable) isValid = true;

        } else if (cardsToPlay.length === 1) {
            const cardToPlay = cardsToPlay[0];
            if (isCurrentTurn) {
                isValid = cardToPlay.color === 'wild' ||
                          cardToPlay.color === room.activeColor ||
                          cardToPlay.value === topCard.value;

            } else if (room.jumpInMode) {
                // Jump-in validation
                if (cardToPlay.color === topCard.color && cardToPlay.value === topCard.value && cardToPlay.color !== 'wild' && cardToPlay.color !== 'special') {
                    isValid = true;
                    // Shift turn to the jumping player
                    room.currentPlayerIndex = playerIds.indexOf(socket.id);
                    io.to(roomId).emit('chatMessage', { sender: "System", text: `${player.name} jumped in!` });
                }
            }

            // Special Cards Validation
            if (isCurrentTurn && cardToPlay.color === 'special') {
                if (cardToPlay.value === 'reflector') {
                     // Reflektor can be played anytime, acts as a wild for matching but has unique effects
                     isValid = true;
                } else if (cardToPlay.value === 'roulette') {
                     isValid = true;
                } else if (cardToPlay.value === 'equalize') {
                     isValid = true;
                }
            }

        }

        if (!isValid) return;

        // Player successfully played cards
        player.hasDrawn = false;

        // Remove cards from hand (indices are sorted desc)
        for (let idx of indicesToPlay) {
            player.hand.splice(idx, 1);
        }

        let totalDrawAmount = 0;
        let lastPlayedCard = cardsToPlay[0];

        // Process all played cards
        for (let i = cardsToPlay.length - 1; i >= 0; i--) {
             let cardToPlay = cardsToPlay[i];
             lastPlayedCard = cardToPlay;


             if (cardToPlay.color === 'wild' || cardToPlay.color === 'special') {
                // Only honor selected color if it's the only/last card, else default to red in a combo
                if (cardToPlay.color === 'special') {
                    // special cards don't change the active color to 'special', they keep the previous color or default to red if played first
                    room.activeColor = selectedColor || room.activeColor || 'red';
                } else {
                    room.activeColor = selectedColor || 'red';
                }


                if (room.wildRouletteMode) {
                    const events = [
                        () => {
                            io.to(roomId).emit('chatMessage', { sender: "System", text: `Wild Roulette: Everyone draws 1 card!` });
                            playerIds.forEach(pid => {
                                if (room.deck.length === 0) {
                                    room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                                    shuffleDeck(room);
                                }
                                if (room.deck.length > 0) room.players[pid].hand.push(room.deck.pop());
                            });
                        },
                        () => {
                            io.to(roomId).emit('chatMessage', { sender: "System", text: `Wild Roulette: Next player is skipped!` });
                            room.currentPlayerIndex = getNextPlayerIndex(room);
                        },
                        () => {
                            io.to(roomId).emit('chatMessage', { sender: "System", text: `Wild Roulette: Direction reversed!` });
                            room.direction *= -1;
                        }
                    ];
                    events[Math.floor(Math.random() * events.length)]();
                }
             } else {
                 room.activeColor = cardToPlay.color;
             }
             room.discardPile.push(cardToPlay);

             if (cardToPlay.value === 'reverse') {
                 room.direction *= -1;
                 if (playerIds.length === 2) nextTurn(room);
             } else if (cardToPlay.value === 'skip') {
                 nextTurn(room);
             } else if (cardToPlay.value === 'draw2' || cardToPlay.value === 'wild4') {
                 totalDrawAmount += (cardToPlay.value === 'draw2' ? 2 : 4);
                 if (cardToPlay.value === 'wild4' && !player.isBot && usersDb[player.name]) {
                     usersDb[player.name].quests.play_plus4 += 1;
                     if (usersDb[player.name].quests.play_plus4 === 5) { // Goal 5
                         usersDb[player.name].coins += 50;
                     }
                     if (usersDb[player.name].quests.play_plus4 >= 10 && !usersDb[player.name].unlockedTitles.includes('Der gnadenlose +4 Werfer')) {
                         usersDb[player.name].unlockedTitles.push('Der gnadenlose +4 Werfer');
                         usersDb[player.name].title = 'Der gnadenlose +4 Werfer'; // Auto-equip title
                     }
                     saveUsers();
                 }

             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: `🛡️ ${player.name} played a Reflektor!` });
                 room.direction *= -1; // Reverse direction
                 // Note: for 2 players, reversing direction doesn't change turn order effectively if we want the OTHER player to draw next.
                 // Since we don't have a stacked penalty system natively, we just act as a standard reverse.
                 if (playerIds.length === 2) nextTurn(room);
             } else if (cardToPlay.value === 'roulette') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: `🎲 ${player.name} played Roulette!` });
                 const events = [
                     () => {
                         io.to(roomId).emit('chatMessage', { sender: "System", text: "Roulette Event: Everyone draws 2 cards!" });
                         playerIds.forEach(pid => {
                             for(let n=0;n<2;n++){
                                 if (room.deck.length === 0) { room.deck = room.discardPile.splice(0, room.discardPile.length - 1); shuffleDeck(room); }
                                 if (room.deck.length > 0) room.players[pid].hand.push(room.deck.pop());
                             }
                         });
                     },
                     () => {
                         io.to(roomId).emit('chatMessage', { sender: "System", text: "Roulette Event: All colors become RED!" });
                         room.activeColor = 'red';
                     },
                     () => {
                         io.to(roomId).emit('chatMessage', { sender: "System", text: "Roulette Event: Player with fewest cards draws 3!" });
                         let minCards = 999;
                         let targetId = null;
                         playerIds.forEach(pid => {
                             if(room.players[pid].hand.length < minCards) { minCards = room.players[pid].hand.length; targetId = pid; }
                         });
                         if (targetId) {
                             io.to(roomId).emit('chatMessage', { sender: "System", text: `${room.players[targetId].name} draws 3!` });
                             for(let n=0;n<3;n++){
                                 if (room.deck.length === 0) { room.deck = room.discardPile.splice(0, room.discardPile.length - 1); shuffleDeck(room); }
                                 if (room.deck.length > 0) room.players[targetId].hand.push(room.deck.pop());
                             }
                         }
                     }
                 ];
                 events[Math.floor(Math.random() * events.length)]();
             } else if (cardToPlay.value === 'equalize') {
                 // Find opponent with fewest cards
                 let minCards = 999;
                 let targetId = null;
                 playerIds.forEach(pid => {
                     if(pid !== socket.id && room.players[pid].hand.length < minCards) {
                         minCards = room.players[pid].hand.length;
                         targetId = pid;
                     }
                 });
                 if (targetId) {
                     const targetPlayer = room.players[targetId];
                     io.to(roomId).emit('chatMessage', { sender: "System", text: `⚖️ ${player.name} Equalized with ${targetPlayer.name}!` });

                     // Combine, shuffle, split
                     let combinedHand = player.hand.concat(targetPlayer.hand);
                     for (let j = combinedHand.length - 1; j > 0; j--) {
                         const k = Math.floor(Math.random() * (j + 1));
                         [combinedHand[j], combinedHand[k]] = [combinedHand[k], combinedHand[j]];
                     }

                     let half = Math.ceil(combinedHand.length / 2);
                     player.hand = combinedHand.slice(0, half);
                     targetPlayer.hand = combinedHand.slice(half);
                 }

             } else if (room.zeroSevenMode && cardToPlay.value === '0') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: `${player.name} played a 0. All hands are rotated!` });
                 let hands = playerIds.map(id => room.players[id].hand);
                 if (room.direction === 1) {
                     let lastHand = hands.pop();
                     hands.unshift(lastHand);
                 } else {
                     let firstHand = hands.shift();
                     hands.push(firstHand);
                 }
                 playerIds.forEach((id, idx) => {
                     room.players[id].hand = hands[idx];
                 });
             } else if (room.zeroSevenMode && cardToPlay.value === '7') {
                 const otherPlayerIds = playerIds.filter(id => id !== socket.id);
                 if (otherPlayerIds.length > 0) {
                     const targetId = otherPlayerIds[Math.floor(Math.random() * otherPlayerIds.length)];
                     const targetPlayer = room.players[targetId];
                     io.to(roomId).emit('chatMessage', { sender: "System", text: `${player.name} played a 7 and swapped hands with ${targetPlayer.name}!` });
                     const tempHand = player.hand;
                     player.hand = targetPlayer.hand;
                     targetPlayer.hand = tempHand;
                 }
             }
        }

        // Apply stacked draw penalties
        if (totalDrawAmount > 0) {
            nextTurn(room);
            const victimId = playerIds[room.currentPlayerIndex];
            const victim = room.players[victimId];
            for(let i=0; i<totalDrawAmount; i++) {
                 if (room.deck.length === 0) {
                     room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                     shuffleDeck(room);
                 }
                 if (room.deck.length > 0) victim.hand.push(room.deck.pop());
            }
        }

        // UNO logic: Give a 3-second grace period to call UNO
        if (player.hand.length === 1 && !player.calledUno) {
            player.unoPenaltyPending = true;
            player.unoTimeout = setTimeout(() => {
                if (room && room.players[socket.id] && player.unoPenaltyPending && !player.calledUno) {
                    io.to(roomId).emit('chatMessage', { sender: "System", text: `${player.name} forgot to call UNO in time and draws 2 cards!` });
                    for(let i=0; i<2; i++){
                        if (room.deck.length === 0) {
                            room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                            shuffleDeck(room);
                        }
                        if (room.deck.length > 0) player.hand.push(room.deck.pop());
                    }
                    player.unoPenaltyPending = false;
                    broadcastGameState(roomId);
                }
            }, 3000);
        }

        // Check win conditions for all players after potential hand swaps
        for (let pid of playerIds) {
            if (room.players[pid].hand.length === 0) {
                if (room.teamMode) {
                    const winnerIndex = playerIds.indexOf(pid);
                    const teammateIndex = (winnerIndex + 2) % playerIds.length;
                    if (teammateIndex < playerIds.length) {
                        const teammateId = playerIds[teammateIndex];
                        io.to(roomId).emit('chatMessage', { sender: "System", text: `${room.players[pid].name} and ${room.players[teammateId].name} win the game!` });
                    }
                }
                handleWin(room, roomId, room.players[pid], pid);
                return;
            }
        }

        nextTurn(room);
        broadcastGameState(roomId);
    });

    socket.on('drawCard', (roomId) => {
         const room = rooms[roomId];
         if (!room || !room.gameStarted) return;
         
         const playerIds = Object.keys(room.players);
         if (socket.id !== playerIds[room.currentPlayerIndex]) return;

         const currentPlayer = room.players[socket.id];

         if (room.drawUntilPlayMode) {
            // Draw until a playable card is found
            let playableFound = false;
            while (!playableFound) {
                if (room.deck.length === 0) {
                    room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                    shuffleDeck(room);
                    if (room.deck.length === 0) break; // Deck and discard both empty (rare)
                }
                const drawnCard = room.deck.pop();
                currentPlayer.hand.push(drawnCard);

                const topCard = room.discardPile[room.discardPile.length - 1];
                if (drawnCard.color === 'wild' || drawnCard.color === room.activeColor || drawnCard.value === topCard.value) {
                    playableFound = true;
                }
            }
            broadcastGameState(roomId);
         } else {
             // Draw single card
             if (room.deck.length === 0) {
                room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                shuffleDeck(room);
             }

             // Only allow drawing if they haven't already drawn this turn
             if (!currentPlayer.hasDrawn) {
                 if (room.deck.length > 0) {
                     currentPlayer.hand.push(room.deck.pop());
                     currentPlayer.hasDrawn = true;
                 }
                 // Do NOT automatically call nextTurn(). Wait for player to play or pass.
                 broadcastGameState(roomId);
             }
         }
    });

    socket.on('passTurn', (roomId) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const playerIds = Object.keys(room.players);
        if (socket.id !== playerIds[room.currentPlayerIndex]) return;

        const currentPlayer = room.players[socket.id];
        if (currentPlayer.hasDrawn) {
            // Player already drew a card and chose not to play it, end their turn.
            currentPlayer.hasDrawn = false; // Reset for their next turn
            nextTurn(room);
            broadcastGameState(roomId);
        }
    });

    socket.on('callUno', (roomId) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted) return;

        const player = room.players[socket.id];
        if (!player) return;

        if (player.hand.length === 1 || player.hand.length === 2) {
            player.calledUno = true;

            // Clear pending penalty if called in time
            if (player.unoPenaltyPending) {
                player.unoPenaltyPending = false;
                if (player.unoTimeout) clearTimeout(player.unoTimeout);
            }

            io.to(roomId).emit('chatMessage', { sender: "System", text: `${player.name} called UNO!` });

            if (!player.isBot && usersDb[player.name]) {
                usersDb[player.name].quests.call_uno += 1;
                if (usersDb[player.name].quests.call_uno === 3) { // Goal 3
                    usersDb[player.name].coins += 50;
                    socket.emit('profileUpdate', usersDb[player.name]);
                    saveUsers();
                }
            }
        }
    });

    socket.on('chatMessage', (roomId, msg) => {
        const username = socket.username || 'Player';
        let chatColor = '#333333';
        if (usersDb[username] && usersDb[username].equippedChatColor) {
            const skinId = usersDb[username].equippedChatColor;
            if (SKINS[skinId] && SKINS[skinId].color) {
                chatColor = SKINS[skinId].color;
            }
        }
        // Send chat to everyone in the room
        io.to(roomId).emit('chatMessage', { sender: username, text: msg, color: chatColor });
    });

    socket.on('sendEmote', (roomId, emote) => {
        const username = socket.username || 'Player';
        // Broadcast emote so it shows over the player's avatar
        io.to(roomId).emit('playerEmote', { playerId: socket.id, emote: emote });
    });


    socket.on('sortHand', (roomId, method) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted || !room.players[socket.id]) return;

        const player = room.players[socket.id];

        const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'wild': 5, 'special': 6 };
        const valueOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'skip':10, 'reverse':11, 'draw2':12, 'wild':13, 'wild4':14, 'reflector':15, 'roulette':16, 'equalize':17 };

        if (method === 'color') {
            player.hand.sort((a, b) => {
                if (colorOrder[a.color] !== colorOrder[b.color]) return colorOrder[a.color] - colorOrder[b.color];
                return valueOrder[a.value] - valueOrder[b.value];
            });
        } else if (method === 'number') {
            player.hand.sort((a, b) => {
                if (valueOrder[a.value] !== valueOrder[b.value]) return valueOrder[a.value] - valueOrder[b.value];
                return colorOrder[a.color] - colorOrder[b.color];
            });
        }

        broadcastGameState(roomId);
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

    socket.on('addFriend', (friendName) => {
        const username = socket.username;
        if (!username || !usersDb[username]) return;

        if (usersDb[friendName] && friendName !== username && !usersDb[username].friends.includes(friendName)) {
            usersDb[username].friends.push(friendName);
            saveUsers();
            socket.emit('profileUpdate', usersDb[username]);
            socket.emit('chatMessage', 'System', `Added ${friendName} to your friends list.`);
        } else {
            socket.emit('chatMessage', 'System', `Could not add ${friendName}. Check spelling or already added.`);
        }
    });

    socket.on('inviteFriend', (friendName, roomId) => {
        const friendSocketId = onlineUsers[friendName];
        if (friendSocketId) {
            io.to(friendSocketId).emit('friendInvite', { sender: socket.username, roomId: roomId });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        if (socket.username) {
            delete onlineUsers[socket.username];
        }

        // Find room user was in
        let userRoomId = null;
        for (const roomId in rooms) {
            if (rooms[roomId].players[socket.id] || (rooms[roomId].spectators && rooms[roomId].spectators.some(s => s.id === socket.id))) {
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

        // Handle Spectator leaving
        if (room.spectators && room.spectators.some(s => s.id === playerId)) {
            room.spectators = room.spectators.filter(s => s.id !== playerId);
            return;
        }

        const playerIds = Object.keys(room.players);

            if (room.gameStarted) {
                const disconnectingPlayerIndex = playerIds.indexOf(playerId);

                if (disconnectingPlayerIndex !== -1 && disconnectingPlayerIndex < room.currentPlayerIndex) {
                    room.currentPlayerIndex--;
                }
                if (disconnectingPlayerIndex === room.currentPlayerIndex && room.currentPlayerIndex === playerIds.length - 1) {
                    room.currentPlayerIndex = 0;
                }
            }

            delete room.players[playerId];

            // Handle Host Leaving
            if (room.hostId === playerId) {
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
        .map(([username, data]) => ({
            username,
            title: data.title || 'Novice',
            level: data.level || 1,
            wins: data.wins,
            coins: data.coins,
            gamesPlayed: data.gamesPlayed || 0
        }))
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
