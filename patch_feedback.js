const fs = require('fs');

let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');
// Fix duplicate xpProgress
clientJs = clientJs.replace(
    "const xpProgress2 = myProfile.xp % 100;\n    document.getElementById('xp-bar-fill').style.width = xpProgress2 + '%';\n\n    renderQuests();",
    "renderQuests();"
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);

let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

// Fix sortOrder mapping
serverJs = serverJs.replace(
    "const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'wild': 5 };",
    "const colorOrder = { 'red': 1, 'blue': 2, 'green': 3, 'yellow': 4, 'wild': 5, 'special': 6 };"
);
serverJs = serverJs.replace(
    "const valueOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'skip':10, 'reverse':11, 'draw2':12, 'wild':13, 'wild4':14 };",
    "const valueOrder = { '0':0, '1':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'skip':10, 'reverse':11, 'draw2':12, 'wild':13, 'wild4':14, 'reflector':15, 'roulette':16, 'equalize':17 };"
);

// Fix reflector logic for 2 players
const oldReflectorLogic = `
             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🛡️ \${player.name} played a Reflektor!\` });
                 room.direction *= -1; // Reverse direction
                 if (playerIds.length === 2) nextTurn(room);
                 // In a complete implementation, this would bounce active penalties.
                 // For now, it reverses direction to "bounce" gameplay back to the attacker.
`;
const newReflectorLogic = `
             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🛡️ \${player.name} played a Reflektor!\` });
                 room.direction *= -1; // Reverse direction
                 // Note: for 2 players, reversing direction doesn't change turn order effectively if we want the OTHER player to draw next.
                 // Since we don't have a stacked penalty system natively, we just act as a standard reverse.
                 if (playerIds.length === 2) nextTurn(room);
`;
serverJs = serverJs.replace(oldReflectorLogic, newReflectorLogic);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
