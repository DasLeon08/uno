const fs = require('fs');

// 1. Update index.html
let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');
indexHtml = indexHtml.replace(
    '<label style="color: white;"><input type="checkbox" id="room-combinations-checkbox" /> Card Combinations (Play multiple matching numbers)</label><br><br>',
    '<label style="color: white;"><input type="checkbox" id="room-combinations-checkbox" /> Card Combinations (Play multiple matching numbers)</label><br>\n            <label style="color: white;"><input type="checkbox" id="room-special-checkbox" /> Special Cards (Reflektor, Roulette, Equalize)</label><br><br>'
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

// 2. Update style.css
let styleCss = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/style.css', 'utf8');
styleCss += `
.card.special { background: linear-gradient(135deg, #9b59b6, #8e44ad); color: white; text-shadow: 1px 1px 3px black; border-color: #f1c40f; }
`;
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/style.css', styleCss);

// 3. Update client.js (for creating special cards UI and getting checkbox value)
let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');

clientJs = clientJs.replace(
    'const combinationsMode = document.getElementById(\'room-combinations-checkbox\').checked;',
    'const combinationsMode = document.getElementById(\'room-combinations-checkbox\').checked;\n    const specialCardsMode = document.getElementById(\'room-special-checkbox\').checked;'
);
clientJs = clientJs.replace(
    'combinationsMode,',
    'combinationsMode,\n        specialCardsMode,'
);

clientJs = clientJs.replace(
    'if (displayValue === \'wild4\') displayValue = \'+4\';',
    'if (displayValue === \'wild4\') displayValue = \'+4\';\n    if (displayValue === \'reflector\') displayValue = \'🛡️\';\n    if (displayValue === \'roulette\') displayValue = \'🎲\';\n    if (displayValue === \'equalize\') displayValue = \'⚖️\';'
);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);

// 4. Update server.js
let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

serverJs = serverJs.replace(
    'combinationsMode: data.combinationsMode || false,',
    'combinationsMode: data.combinationsMode || false,\n        specialCardsMode: data.specialCardsMode || false,'
);

const deckInjection = `
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
`;

serverJs = serverJs.replace(
    "for (let i = 0; i < 4; i++) {\n        room.deck.push({ color: 'wild', value: 'wild' });\n        room.deck.push({ color: 'wild', value: 'wild4' });\n    }",
    deckInjection
);

const playCardInjection = `
            } else if (room.jumpInMode) {
                // Jump-in validation
                if (cardToPlay.color === topCard.color && cardToPlay.value === topCard.value && cardToPlay.color !== 'wild' && cardToPlay.color !== 'special') {
                    isValid = true;
                    // Shift turn to the jumping player
                    room.currentPlayerIndex = playerIds.indexOf(socket.id);
                    io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} jumped in!\` });
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
`;

serverJs = serverJs.replace(
    `} else if (room.jumpInMode) {
                // Jump-in validation
                if (cardToPlay.color === topCard.color && cardToPlay.value === topCard.value && cardToPlay.color !== 'wild') {
                    isValid = true;
                    // Shift turn to the jumping player
                    room.currentPlayerIndex = playerIds.indexOf(socket.id);
                    io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${player.name} jumped in!\` });
                }
            }`,
    playCardInjection
);

const specialActionLogic = `
             if (cardToPlay.color === 'wild' || cardToPlay.color === 'special') {
                // Only honor selected color if it's the only/last card, else default to red in a combo
                if (cardToPlay.color === 'special') {
                    // special cards don't change the active color to 'special', they keep the previous color or default to red if played first
                    room.activeColor = selectedColor || room.activeColor || 'red';
                } else {
                    room.activeColor = selectedColor || 'red';
                }
`;

serverJs = serverJs.replace(
    `if (cardToPlay.color === 'wild') {
                // Only honor selected color if it's the only/last card, else default to red in a combo
                room.activeColor = selectedColor || 'red';`,
    specialActionLogic
);


const specialCardEffects = `
             } else if (cardToPlay.value === 'reflector') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🛡️ \${player.name} played a Reflektor!\` });
                 room.direction *= -1; // Reverse direction
                 if (playerIds.length === 2) nextTurn(room);
                 // In a complete implementation, this would bounce active penalties.
                 // For now, it reverses direction to "bounce" gameplay back to the attacker.
             } else if (cardToPlay.value === 'roulette') {
                 io.to(roomId).emit('chatMessage', { sender: "System", text: \`🎲 \${player.name} played Roulette!\` });
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
                             io.to(roomId).emit('chatMessage', { sender: "System", text: \`\${room.players[targetId].name} draws 3!\` });
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
                     io.to(roomId).emit('chatMessage', { sender: "System", text: \`⚖️ \${player.name} Equalized with \${targetPlayer.name}!\` });

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
`;

serverJs = serverJs.replace(
    "} else if (room.zeroSevenMode && cardToPlay.value === '0') {",
    specialCardEffects + '\n             } else if (room.zeroSevenMode && cardToPlay.value === \'0\') {'
);

// Prevent bots from playing special cards instantly without selected color (requires color picker fix for special cards)
// Let's ensure bots can play them. Since special doesn't require color picking strictly for its effect, we can let them play it.
let botValidLogic = `
            let isValid = card.color === 'wild' || card.color === 'special' ||
                          card.color === room.activeColor ||
                          card.value === topCard.value;
`;
serverJs = serverJs.replace(
    "let isValid = card.color === 'wild' ||\n                          card.color === room.activeColor ||\n                          card.value === topCard.value;",
    botValidLogic
);

// We need special cards to prompt the color picker to pick the active color going forward (so the game doesn't get stuck)
let colorPickerClientLogic = `
        if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4' || card.color === 'special') {
            pendingWildCardIndex = index;
            colorPicker.classList.remove('hidden');
        } else {
`;
clientJs = clientJs.replace(
    "if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {\n            pendingWildCardIndex = index;\n            colorPicker.classList.remove('hidden');\n        } else {",
    colorPickerClientLogic
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
