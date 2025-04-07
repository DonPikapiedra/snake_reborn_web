const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const grid = 20;
const rows = canvas.height / grid;
const cols = canvas.width / grid;

// Variables del juego
let snake, fruit, score, highScore = 0, gameInterval, isPaused = false, gameStarted = false;
const initialSpeed = 150;
let currentSpeed = initialSpeed;

// Elementos del DOM
const overlay = document.getElementById("gameOverlay");
const overlayText = document.getElementById("overlayText");
const pauseBtn = document.getElementById("pauseBtn");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("highScore");

// Paleta de Colores
const colors = {
    bg1: "#FFFFFF",
    bg2: "#E8E8E8",
    head: "#76FF03",
    body: "#558B2F",
    eye: "#FFFFFF",
    pupil: "#000000",
    fruitBody: "#FF6347",
    fruitStem: "#8B4513",
    fruitLeaf: "#228B22",
    fruitShine: "rgba(255, 255, 255, 0.7)"
};

// Elementos de audio
const eatSound = document.getElementById("eatSound");
const loseSound = document.getElementById("loseSound");
const startSound = document.getElementById("startSound");
const achievementSound = document.getElementById("achievementSound");
const backgroundMusic = document.getElementById("backgroundMusic");

// --- Clase Snake ---
class Snake {
    constructor() {
        this.body = [ { x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 } ];
        this.dx = 1;
        this.dy = 0;
        this.nextDx = 1;
        this.nextDy = 0;
    }

    changeDirection(newDx, newDy) {
        if ((this.dx === 1 && newDx === -1) || (this.dx === -1 && newDx === 1) ||
            (this.dy === 1 && newDy === -1) || (this.dy === -1 && newDy === 1)) {
            return;
        }
        this.nextDx = newDx;
        this.nextDy = newDy;
    }

    move() {
        this.dx = this.nextDx;
        this.dy = this.nextDy;
        const head = { x: this.body[0].x + this.dx, y: this.body[0].y + this.dy };
        this.body.unshift(head);
    }

    incrementScore() {
        score++;
        scoreDisplay.innerText = "Puntos: " + score;
        if (score % 5 === 0 && currentSpeed > 50) {
            currentSpeed -= 10;
            resetInterval();
        }
    }

    grow() {
        // No necesita hacer nada aquí, move() ya añade la cabeza
    }

    shrink() {
        this.body.pop();
    }

    draw() {
        this.body.forEach((part, i) => {
            const partX = part.x * grid;
            const partY = part.y * grid;
            ctx.fillStyle = (i === 0) ? colors.head : colors.body;
            ctx.fillRect(partX, partY, grid, grid);

            if (i === 0) {
                const eyeRadius = grid * 0.18;
                const pupilRadius = grid * 0.09;
                const eye1CenterX = partX + grid * 0.3;
                const eye1CenterY = partY + grid * 0.3;
                const eye2CenterX = partX + grid * 0.7;
                const eye2CenterY = partY + grid * 0.3;

                ctx.fillStyle = colors.eye;
                ctx.beginPath(); ctx.arc(eye1CenterX, eye1CenterY, eyeRadius, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(eye2CenterX, eye2CenterY, eyeRadius, 0, Math.PI * 2); ctx.fill();

                const headCenterX = partX + grid / 2;
                const headCenterY = partY + grid / 2;
                const fruitCenterX = fruit ? fruit.x * grid + grid / 2 : headCenterX;
                const fruitCenterY = fruit ? fruit.y * grid + grid / 2 : headCenterY;

                let vectorX = fruitCenterX - headCenterX;
                let vectorY = fruitCenterY - headCenterY;
                const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);

                let pupilOffsetX = 0;
                let pupilOffsetY = 0;
                const maxPupilShift = eyeRadius - pupilRadius;

                if (distance > 0) {
                    const normalizedX = vectorX / distance;
                    const normalizedY = vectorY / distance;
                    pupilOffsetX = normalizedX * maxPupilShift;
                    pupilOffsetY = normalizedY * maxPupilShift;
                }

                const pupil1X = eye1CenterX + pupilOffsetX;
                const pupil1Y = eye1CenterY + pupilOffsetY;
                const pupil2X = eye2CenterX + pupilOffsetX;
                const pupil2Y = eye2CenterY + pupilOffsetY;

                ctx.fillStyle = colors.pupil;
                ctx.beginPath(); ctx.arc(pupil1X, pupil1Y, pupilRadius, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(pupil2X, pupil2Y, pupilRadius, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    collideSelf() {
        const [head, ...body] = this.body;
        return body.some(p => p.x === head.x && p.y === head.y);
    }

    collideWall() {
        const head = this.body[0];
        return head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    }

    eat(f) {
        const head = this.body[0];
        return f && head.x === f.x && head.y === f.y;
    }
}

// --- Clase Fruit ---
class Fruit {
    constructor() {
        this.randomize();
    }

    randomize(snakeBody = []) {
        let validPosition = false;
        while (!validPosition) {
            this.x = Math.floor(Math.random() * cols);
            this.y = Math.floor(Math.random() * rows);
            if (!snakeBody.some(part => part.x === this.x && part.y === this.y)) {
                validPosition = true;
            }
        }
    }

    draw() {
        const fruitX = this.x * grid;
        const fruitY = this.y * grid;
        const centerX = fruitX + grid / 2;
        const centerY = fruitY + grid / 2;
        const radius = grid * 0.45;

        ctx.fillStyle = colors.fruitBody;
        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = colors.fruitStem;
        ctx.lineWidth = grid * 0.12;
        ctx.beginPath(); ctx.moveTo(centerX, centerY - radius * 0.6); ctx.lineTo(centerX + grid * 0.05, fruitY + grid * 0.1); ctx.stroke();
        ctx.lineWidth = 1;

        ctx.fillStyle = colors.fruitLeaf;
        ctx.beginPath();
        const leafStartX = centerX + grid * 0.05; const leafStartY = fruitY + grid * 0.2;
        ctx.moveTo(leafStartX, leafStartY);
        ctx.quadraticCurveTo(leafStartX + grid * 0.3, leafStartY - grid * 0.2, leafStartX + grid * 0.15, leafStartY + grid * 0.3);
        ctx.quadraticCurveTo(leafStartX - grid * 0.2, leafStartY + grid * 0.35, leafStartX, leafStartY);
        ctx.fill();

        ctx.fillStyle = colors.shine;
        ctx.beginPath(); ctx.arc(centerX - radius * 0.4, centerY - radius * 0.4, radius * 0.5, Math.PI * 1.4, Math.PI * 1.9); ctx.fill();
    }
}

// --- Funciones del Juego ---
function drawBoard() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? colors.bg1 : colors.bg2;
            ctx.fillRect(c * grid, r * grid, grid, grid);
        }
    }
}

function loadHighScore() {
    const storedScore = localStorage.getItem('snakeHighScore');
    highScore = parseInt(storedScore, 10) || 0;
    highScoreDisplay.innerText = `Record: ${highScore}`;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore.toString());
        highScoreDisplay.innerText = `Record: ${highScore}`;
    }
}

function initGame() {
    snake = new Snake();
    fruit = new Fruit();
    fruit.randomize(snake.body);
    score = 0;
    currentSpeed = initialSpeed;
    scoreDisplay.innerText = "Puntos: 0";
    highScoreDisplay.innerText = `Record: ${highScore}`;
    isPaused = false;
    gameStarted = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = "Pausa";
    overlay.style.display = "none";

    if (startSound) {
        startSound.currentTime = 0;
        startSound.play();
    }
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(error => {
        console.warn("Reproducción de música necesita interacción del usuario.", error);
    });

    resetInterval();
}

function resetInterval() {
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, currentSpeed);
}

function showOverlay(htmlContent) {
    overlayText.innerHTML = htmlContent;
    const restartBtn = overlayText.querySelector("button");
    if (restartBtn) {
        restartBtn.onclick = initGame;
    }
    overlay.style.display = "flex";
    clearInterval(gameInterval);
    backgroundMusic.pause();
    pauseBtn.disabled = true;
}

function detenerSonidoFondo() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
    }
}

function gameOver() {
    gameStarted = false;
    if (loseSound) {
        loseSound.currentTime = 0;
        loseSound.play();
    }
    detenerSonidoFondo();
    if (startSound) {
        startSound.currentTime = 0;
        startSound.play();
    }
    saveHighScore();
    showOverlay(`¡Perdiste!<br>Puntos: ${score}<br>Record: ${highScore}<br><button>Reiniciar</button>`);
    return;
}

function gameLoop() {
    if (!gameStarted || isPaused) return;

    snake.move();

    if (snake.collideWall() || snake.collideSelf()) {
        gameOver();
        return;
    }

    if (snake.eat(fruit)) {
        snake.grow();
        snake.incrementScore();
        fruit.randomize(snake.body);

        if (eatSound) {
            eatSound.currentTime = 0;
            eatSound.play();
        }

        if (score > 0 && score % 10 === 0) {
            if (achievementSound) {
                achievementSound.currentTime = 0;
                achievementSound.play();
            }
        }
    } else {
        snake.shrink();
    }

    drawBoard();
    fruit.draw();
    snake.draw();
}

function togglePause() {
    if (!gameStarted) return;

    isPaused = !isPaused;
    if (isPaused) {
        pauseBtn.textContent = "Reanudar";
        clearInterval(gameInterval);
        backgroundMusic.pause();
    } else {
        pauseBtn.textContent = "Pausa";
        backgroundMusic.play().catch(error => console.warn("Error al reanudar música:", error));
        resetInterval();
    }
}

document.addEventListener("keydown", (e) => {
    if (overlay.style.display !== 'none') {
        if (e.key === "Enter") {
            initGame();
        }
        return;
    }

    if (isPaused) {
        if (e.key === " " || e.key.toLowerCase() === "p") {
            togglePause();
        }
        return;
    }

    if (typeof gameStarted !== 'undefined' && gameStarted && !isPaused) {
        let newDx = snake.dx;
        let newDy = snake.dy;

        switch (e.key.toLowerCase()) {
            case "arrowup": case "w":
                newDx = 0;
                newDy = -1;
                break;
            case "arrowdown": case "s":
                newDx = 0;
                newDy = 1;
                break;
            case "arrowleft": case "a":
                newDx = -1;
                newDy = 0;
                break;
            case "arrowright": case "d":
                newDx = 1;
                newDy = 0;
                break;
            case " ": case "p":
                togglePause();
                return;
        }

        if ((snake.dx === 1 && newDx === -1) || (snake.dx === -1 && newDx === 1) ||
            (snake.dy === 1 && newDy === -1) || (snake.dy === -1 && newDy === 1)) {
            return;
        }

        snake.changeDirection(newDx, newDy);
    }
});

pauseBtn.onclick = togglePause;

window.onload = () => {
    loadHighScore();
    showOverlay("¡Bienvenido a Snake Reborn!<br>Usa las flechas (o WASD) para moverte.<br><button>Empezar</button>");
    pauseBtn.disabled = true;
};
