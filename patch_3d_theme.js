const fs = require('fs');

// Update index.html
let indexHtml = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', 'utf8');
indexHtml = indexHtml.replace(
    '<option value="theme-sunset">Sunset</option>',
    '<option value="theme-sunset">Sunset</option>\n                    <option value="theme-3d">3D Space</option>'
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/index.html', indexHtml);

// Update style.css
let styleCss = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/style.css', 'utf8');
styleCss += `

/* 3D Theme */
body.theme-3d {
    background-color: #000;
    background-image: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
    perspective: 1000px;
}
body.theme-3d .center-board {
    transform: rotateX(20deg) translateZ(50px);
    transform-style: preserve-3d;
}
body.theme-3d .card {
    box-shadow: 0 10px 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(255,255,255,0.2);
}
body.theme-3d .deck-card {
    transform: translateZ(10px);
}
body.theme-3d .opponent {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.2);
    box-shadow: 0 5px 15px rgba(0,0,0,0.5);
    transform: rotateX(-10deg);
}
body.theme-3d button {
    background-color: #34495e;
    box-shadow: 0 4px 0 #2c3e50;
}
body.theme-3d button:hover {
    background-color: #415b76;
}
`;
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/style.css', styleCss);

// Update client.js
let clientJs = fs.readFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', 'utf8');
clientJs = clientJs.replace(
    "if (theme === 'theme-ocean') {",
    "if (theme === 'theme-3d') {\n        // Stars\n        weatherInterval = setInterval(() => {\n            const star = document.createElement('div');\n            star.className = 'weather-particle';\n            star.textContent = '✨';\n            star.style.left = Math.random() * 100 + 'vw';\n            star.style.fontSize = (Math.random() * 5 + 10) + 'px';\n            star.style.opacity = '0.8';\n            star.style.animation = \`fallSnow \${Math.random() * 5 + 5}s linear forwards\`;\n            document.body.appendChild(star);\n            setTimeout(() => star.remove(), 10000);\n        }, 400);\n    } else if (theme === 'theme-ocean') {"
);
fs.writeFileSync('jules_session_52233877139531761_multiplayer-uno-52233877139531761/public/client.js', clientJs);
