const fs = require('fs');

let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

const oldReflectorLogic = `
             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🛡️ \${player.name} played a Reflektor!\` });
                 room.direction *= -1; // Reverse direction
                 // Note: for 2 players, reversing direction doesn't change turn order effectively if we want the OTHER player to draw next.
                 // Since we don't have a stacked penalty system natively, we just act as a standard reverse.
                 if (playerIds.length === 2) nextTurn(room);
`;

const newReflectorLogic = `
             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🛡️ \${player.name} played a Reflektor!\` });
                 room.direction *= -1; // Reverse direction
                 // Note: for 2 players, reversing direction doesn't change turn order effectively.
                 // Unlike a standard Reverse (which acts as a Skip in 1v1), a Reflector SHOULD pass the turn
                 // back to the attacker so they suffer the penalty. So we DO NOT call nextTurn(room) here in 1v1.
`;

serverJs = serverJs.replace(oldReflectorLogic, newReflectorLogic);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
