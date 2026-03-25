const fs = require('fs');
let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');

const oldBotLogic = `
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
`;

const newBotLogic = `
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
`;

serverJs = serverJs.replace(oldBotLogic, newBotLogic);
serverJs = serverJs.replace('}, 1500); // Thinking delay', '}, Math.floor(Math.random() * 1500) + 1500); // Randomized Thinking delay');

fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);
