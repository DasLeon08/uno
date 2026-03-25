const fs = require('fs');
let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

const oldUnoLogic = `
        // UNO logic: Check if player forgot to call UNO
        if (player.hand.length === 1 && !player.calledUno) {
            io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} forgot to call UNO and draws 2 cards!\` });
            for(let i=0; i<2; i++){
                if (room.deck.length === 0) {
                    room.deck = room.discardPile.splice(0, room.discardPile.length - 1);
                    shuffleDeck(room);
                }
                if (room.deck.length > 0) player.hand.push(room.deck.pop());
            }
        }
`;

const newUnoLogic = `
        // UNO logic: Give a 3-second grace period to call UNO
        if (player.hand.length === 1 && !player.calledUno) {
            player.unoPenaltyPending = true;
            player.unoTimeout = setTimeout(() => {
                if (room && room.players[socket.id] && player.unoPenaltyPending && !player.calledUno) {
                    io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} forgot to call UNO in time and draws 2 cards!\` });
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
`;

serverJs = serverJs.replace(oldUnoLogic, newUnoLogic);

const oldCallUnoLogic = `
        if (player.hand.length === 1 || player.hand.length === 2) {
            player.calledUno = true;
            io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} called UNO!\` });
`;

const newCallUnoLogic = `
        if (player.hand.length === 1 || player.hand.length === 2) {
            player.calledUno = true;

            // Clear pending penalty if called in time
            if (player.unoPenaltyPending) {
                player.unoPenaltyPending = false;
                if (player.unoTimeout) clearTimeout(player.unoTimeout);
            }

            io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} called UNO!\` });
`;

serverJs = serverJs.replace(oldCallUnoLogic, newCallUnoLogic);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
