const fs = require('fs');

let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');

const sortButtons = `
            <button id="call-uno-btn" class="btn hidden" style="background-color: #f39c12; margin-top: 10px;">UNO!</button>
            <button id="pass-turn-btn" class="btn hidden" style="background-color: #7f8c8d; margin-top: 10px;">Pass Turn</button>
            <div id="sort-controls" style="margin-top: 10px;">
                <button id="sort-color-btn" class="btn" style="background-color: #9b59b6; font-size: 14px; padding: 8px 16px;">Sort Color</button>
                <button id="sort-number-btn" class="btn" style="background-color: #34495e; font-size: 14px; padding: 8px 16px;">Sort Number</button>
            </div>
`;

indexHtml = indexHtml.replace(
    '<button id="call-uno-btn" class="btn hidden" style="background-color: #f39c12; margin-top: 10px;">UNO!</button>\n            <button id="pass-turn-btn" class="btn hidden" style="background-color: #7f8c8d; margin-top: 10px;">Pass Turn</button>',
    sortButtons
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');

const sortJs = `
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
`;

clientJs = clientJs.replace(
    'const passTurnBtn = document.getElementById(\'pass-turn-btn\');',
    sortJs + '\nconst passTurnBtn = document.getElementById(\'pass-turn-btn\');'
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);

let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

const sortSocketLogic = `
    socket.on('sortHand', (roomId, method) => {
        const room = rooms[roomId];
        if (!room || !room.gameStarted || !room.players[socket.id]) return;

        const player = room.players[socket.id];

        const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'wild': 5 };
        const valueOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'skip':10, 'reverse':11, 'draw2':12, 'wild':13, 'wild4':14 };

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
`;

serverJs = serverJs.replace(
    'socket.on(\'playAgain\', (roomId) => {',
    sortSocketLogic + '\n    socket.on(\'playAgain\', (roomId) => {'
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
