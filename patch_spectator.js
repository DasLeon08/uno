const fs = require('fs');

let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');
indexHtml = indexHtml.replace(
    '<div id="game-screen" class="screen hidden">',
    '<div id="game-screen" class="screen hidden">\n        <div id="spectators-display" class="hidden" style="position: absolute; top: 10px; right: 50px; background: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 5px; color: white; z-index: 1000;">👀 <span id="spectator-count">0</span></div>'
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

let serverJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', 'utf8');
serverJs = serverJs.replace(
    'hasDrawn: room.players[id].hasDrawn',
    'hasDrawn: room.players[id].hasDrawn,\n                spectatorCount: room.spectators ? room.spectators.length : 0'
);
serverJs = serverJs.replace(
    'hasDrawn: false,',
    'hasDrawn: false,\n                spectatorCount: room.spectators ? room.spectators.length : 0,'
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/server.js', serverJs);

let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');
clientJs = clientJs.replace(
    'renderDiscardPile(state.topCard, state.activeColor);',
    'renderDiscardPile(state.topCard, state.activeColor);\n\n    const specDisplay = document.getElementById("spectators-display");\n    const specCount = document.getElementById("spectator-count");\n    if (state.spectatorCount > 0) {\n        specDisplay.classList.remove("hidden");\n        specCount.textContent = state.spectatorCount;\n    } else {\n        specDisplay.classList.add("hidden");\n    }'
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);
