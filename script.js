const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const livesElement = document.getElementById("lives");
const messageElement = document.getElementById("message");


// ============================================================
// CONFIGURAÇÃO
// ============================================================

const TILE = 24;

const MAP = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#.....#...#.....#.#",
    "#.#.###.#####.###.#.#",
    "#...................#",
    "#.###.#.#######.#.###",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "#.........#.........#",
    "#.###.###...###.###.#",
    "#...#.....P.....#...#",
    "###.#.###...###.#.###",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#.....#...#.....#.#",
    "#.#.###.#####.###.#.#",
    "#...................#",
    "#.###.#.#######.#.###",
    "#.........#.........#",
    "#####################"
];

const ROWS = MAP.length;
const COLS = MAP[0].length;

canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;


// ============================================================
// ESTADO
// ============================================================

let score = 0;
let lives = 3;
let level = 1;

let running = false;
let gameOver = false;

let pellets = [];

let lastTime = 0;


// ============================================================
// DIREÇÕES
// ============================================================

const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
};


// ============================================================
// PAC-MAN
// ============================================================

const pacman = {
    x: 1.5 * TILE,
    y: 1.5 * TILE,

    direction: "right",
    nextDirection: "right",

    speed: 90,

    radius: TILE * 0.42,

    mouth: 0,

    mouthDirection: 1
};


// ============================================================
// FANTASMAS
// ============================================================

let ghosts = [];


// ============================================================
// FUNÇÕES DO MAPA
// ============================================================

function isWallTile(x, y) {

    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
        return true;
    }

    return MAP[y][x] === "#";
}


function isWallAtPixel(x, y) {

    const left = Math.floor((x - pacman.radius) / TILE);
    const right = Math.floor((x + pacman.radius) / TILE);

    const top = Math.floor((y - pacman.radius) / TILE);
    const bottom = Math.floor((y + pacman.radius) / TILE);

    return (
        isWallTile(left, top) ||
        isWallTile(right, top) ||
        isWallTile(left, bottom) ||
        isWallTile(right, bottom)
    );
}


function canMove(entity, direction, distance = 2) {

    const dir = DIRECTIONS[direction];

    const nextX = entity.x + dir.x * distance;
    const nextY = entity.y + dir.y * distance;

    const radius = entity.radius || 8;

    const left = Math.floor((nextX - radius) / TILE);
    const right = Math.floor((nextX + radius) / TILE);

    const top = Math.floor((nextY - radius) / TILE);
    const bottom = Math.floor((nextY + radius) / TILE);

    return !(
        isWallTile(left, top) ||
        isWallTile(right, top) ||
        isWallTile(left, bottom) ||
        isWallTile(right, bottom)
    );
}


// ============================================================
// PONTOS
// ============================================================

function createPellets() {

    pellets = [];

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (MAP[y][x] === ".") {

                pellets.push({
                    x: x * TILE + TILE / 2,
                    y: y * TILE + TILE / 2
                });
            }
        }
    }
}


// ============================================================
// RESET PAC-MAN
// ============================================================

function resetPacman() {

    pacman.x = 1.5 * TILE;
    pacman.y = 1.5 * TILE;

    pacman.direction = "right";
    pacman.nextDirection = "right";

    pacman.speed = 90;
}


// ============================================================
// FANTASMAS
// ============================================================

function createGhosts() {

    const speed = 60 + level * 4;

    ghosts = [

        {
            x: 9.5 * TILE,
            y: 9.5 * TILE,
            direction: "left",
            color: "#ff3030",
            speed
        },

        {
            x: 11.5 * TILE,
            y: 9.5 * TILE,
            direction: "right",
            color: "#00ffff",
            speed: speed * 0.95
        },

        {
            x: 10.5 * TILE,
            y: 10.5 * TILE,
            direction: "up",
            color: "#ff69b4",
            speed: speed * 0.9
        }
    ];
}


// ============================================================
// MOVIMENTO SUAVE
// ============================================================

function updatePacman(delta) {

    const distance = pacman.speed * delta;

    // Tenta mudar de direção
    if (canMove(pacman, pacman.nextDirection, 2)) {
        pacman.direction = pacman.nextDirection;
    }

    // Anda
    if (canMove(pacman, pacman.direction, distance)) {

        const dir = DIRECTIONS[pacman.direction];

        pacman.x += dir.x * distance;
        pacman.y += dir.y * distance;
    }

    // Pequena animação da boca
    pacman.mouth +=
        pacman.mouthDirection * delta * 10;

    if (pacman.mouth >= 1) {
        pacman.mouth = 1;
        pacman.mouthDirection = -1;
    }

    if (pacman.mouth <= 0) {
        pacman.mouth = 0;
        pacman.mouthDirection = 1;
    }

    eatPellet();
}


// ============================================================
// MOVIMENTO DOS FANTASMAS
// ============================================================

function getGhostTile(ghost) {

    return {
        x: Math.floor(ghost.x / TILE),
        y: Math.floor(ghost.y / TILE)
    };
}


function chooseGhostDirection(ghost) {

    const tile = getGhostTile(ghost);

    const directions = [
        "up",
        "down",
        "left",
        "right"
    ];

    const valid = directions.filter(direction => {

        const d = DIRECTIONS[direction];

        return !isWallTile(
            tile.x + d.x,
            tile.y + d.y
        );
    });

    if (valid.length === 0) {
        return;
    }

    const opposite = {
        up: "down",
        down: "up",
        left: "right",
        right: "left"
    };

    let choices = valid.filter(
        direction =>
            direction !== opposite[ghost.direction]
    );

    if (choices.length === 0) {
        choices = valid;
    }

    // IA simples de perseguição
    choices.sort((a, b) => {

        const da = getDistanceToPacman(
            ghost,
            a
        );

        const db = getDistanceToPacman(
            ghost,
            b
        );

        return da - db;
    });

    // Nem sempre escolhe a melhor direção.
    // Isso deixa o fantasma menos previsível.
    if (Math.random() < 0.2 && choices.length > 1) {
        ghost.direction =
            choices[
                Math.floor(Math.random() * choices.length)
            ];
    } else {
        ghost.direction = choices[0];
    }
}


function getDistanceToPacman(ghost, direction) {

    const tile = getGhostTile(ghost);

    const d = DIRECTIONS[direction];

    const targetX =
        tile.x + d.x;

    const targetY =
        tile.y + d.y;

    const pacX =
        Math.floor(pacman.x / TILE);

    const pacY =
        Math.floor(pacman.y / TILE);

    return Math.abs(targetX - pacX) +
           Math.abs(targetY - pacY);
}


function updateGhost(ghost, delta) {

    const tileX =
        Math.floor(ghost.x / TILE);

    const tileY =
        Math.floor(ghost.y / TILE);

    const centerX =
        tileX * TILE + TILE / 2;

    const centerY =
        tileY * TILE + TILE / 2;

    // Quando chega perto do centro de uma célula,
    // decide a próxima direção.
    const nearCenter =
        Math.abs(ghost.x - centerX) < 2 &&
        Math.abs(ghost.y - centerY) < 2;

    if (nearCenter) {

        ghost.x = centerX;
        ghost.y = centerY;

        chooseGhostDirection(ghost);
    }

    const d =
        DIRECTIONS[ghost.direction];

    const distance =
        ghost.speed * delta;

    const nextX =
        ghost.x + d.x * distance;

    const nextY =
        ghost.y + d.y * distance;

    const radius = 7;

    const left =
        Math.floor((nextX - radius) / TILE);

    const right =
        Math.floor((nextX + radius) / TILE);

    const top =
        Math.floor((nextY - radius) / TILE);

    const bottom =
        Math.floor((nextY + radius) / TILE);

    if (
        !isWallTile(left, top) &&
        !isWallTile(right, top) &&
        !isWallTile(left, bottom) &&
        !isWallTile(right, bottom)
    ) {

        ghost.x = nextX;
        ghost.y = nextY;
    }
}


function updateGhosts(delta) {

    ghosts.forEach(ghost => {
        updateGhost(ghost, delta);
    });
}


// ============================================================
// COMER PONTOS
// ============================================================

function eatPellet() {

    for (let i = pellets.length - 1; i >= 0; i--) {

        const pellet = pellets[i];

        const dx =
            pacman.x - pellet.x;

        const dy =
            pacman.y - pellet.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance < 9) {

            pellets.splice(i, 1);

            score += 10;

            updateUI();

            break;
        }
    }

    if (pellets.length === 0) {
        nextLevel();
    }
}


// ============================================================
// COLISÃO COM FANTASMAS
// ============================================================

function checkGhostCollision() {

    for (const ghost of ghosts) {

        const dx =
            pacman.x - ghost.x;

        const dy =
            pacman.y - ghost.y;

        const distance =
            Math.sqrt(dx * dx + dy * dy);

        if (distance < TILE * 0.65) {

            loseLife();

            return;
        }
    }
}


// ============================================================
// VIDA
// ============================================================

function loseLife() {

    lives--;

    updateUI();

    running = false;

    if (lives <= 0) {

        gameOver = true;

        messageElement.textContent =
            "GAME OVER — pressione ENTER";

        return;
    }

    messageElement.textContent =
        `Você perdeu uma vida!`;

    setTimeout(() => {

        resetPacman();
        createGhosts();

        messageElement.textContent = "";

        running = true;

    }, 800);
}


// ============================================================
// PRÓXIMA FASE
// ============================================================

function nextLevel() {

    level++;

    resetPacman();
    createGhosts();
    createPellets();

    // Pac-Man fica um pouco mais rápido
    pacman.speed =
        Math.min(
            150,
            90 + (level - 1) * 8
        );

    messageElement.textContent =
        `FASE ${level}!`;

    updateUI();

    setTimeout(() => {

        if (!gameOver) {
            messageElement.textContent = "";
        }

    }, 1200);
}


// ============================================================
// DESENHO DO MAPA
// ============================================================

function drawMap() {

    ctx.fillStyle = "#000";
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (MAP[y][x] === "#") {

                const px = x * TILE;
                const py = y * TILE;

                ctx.fillStyle = "#1111aa";

                ctx.fillRect(
                    px,
                    py,
                    TILE,
                    TILE
                );

                ctx.strokeStyle = "#3434ff";

                ctx.lineWidth = 1;

                ctx.strokeRect(
                    px + 2,
                    py + 2,
                    TILE - 4,
                    TILE - 4
                );
            }
        }
    }
}


// ============================================================
// DESENHO DOS PONTOS
// ============================================================

function drawPellets() {

    ctx.fillStyle = "#fff";

    for (const pellet of pellets) {

        ctx.beginPath();

        ctx.arc(
            pellet.x,
            pellet.y,
            2.5,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


// ============================================================
// DESENHO DO PAC-MAN
// ============================================================

function drawPacman() {

    let rotation = 0;

    if (pacman.direction === "right") {
        rotation = 0;
    }

    if (pacman.direction === "down") {
        rotation = Math.PI / 2;
    }

    if (pacman.direction === "left") {
        rotation = Math.PI;
    }

    if (pacman.direction === "up") {
        rotation = -Math.PI / 2;
    }

    const mouthAngle =
        0.15 + pacman.mouth * 0.3;

    ctx.save();

    ctx.translate(
        pacman.x,
        pacman.y
    );

    ctx.rotate(rotation);

    ctx.fillStyle = "#ffff00";

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.arc(
        0,
        0,
        pacman.radius,
        mouthAngle,
        Math.PI * 2 - mouthAngle
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();
}


// ============================================================
// DESENHO DOS FANTASMAS
// ============================================================

function drawGhost(ghost) {

    const x = ghost.x;
    const y = ghost.y;

    const r = TILE * 0.42;

    ctx.fillStyle = ghost.color;

    ctx.beginPath();

    ctx.arc(
        x,
        y - 1,
        r,
        Math.PI,
        0
    );

    ctx.lineTo(
        x + r,
        y + r
    );

    ctx.lineTo(
        x + r * 0.5,
        y + r * 0.65
    );

    ctx.lineTo(
        x,
        y + r
    );

    ctx.lineTo(
        x - r * 0.5,
        y + r * 0.65
    );

    ctx.lineTo(
        x - r,
        y + r
    );

    ctx.closePath();

    ctx.fill();


    // Olhos

    ctx.fillStyle = "#fff";

    ctx.beginPath();

    ctx.arc(
        x - 6,
        y - 3,
        4,
        0,
        Math.PI * 2
    );

    ctx.arc(
        x + 6,
        y - 3,
        4,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        x - 6,
        y - 3,
        2,
        0,
        Math.PI * 2
    );

    ctx.arc(
        x + 6,
        y - 3,
        2,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


function drawGhosts() {

    ghosts.forEach(drawGhost);
}


// ============================================================
// RENDERIZAÇÃO
// ============================================================

function render() {

    drawMap();

    drawPellets();

    drawPacman();

    drawGhosts();
}


// ============================================================
// LOOP PRINCIPAL
// ============================================================

function gameLoop(timestamp) {

    if (!lastTime) {
        lastTime = timestamp;
    }

    // Delta em segundos
    let delta =
        (timestamp - lastTime) / 1000;

    lastTime = timestamp;

    // Evita um salto gigante se a aba ficar parada
    delta = Math.min(delta, 0.05);

    if (running) {

        updatePacman(delta);

        updateGhosts(delta);

        checkGhostCollision();
    }

    render();

    requestAnimationFrame(gameLoop);
}


// ============================================================
// CONTROLES
// ============================================================

function setDirection(direction) {

    pacman.nextDirection = direction;

    if (!running && !gameOver) {
        startGame();
    }
}


document.addEventListener("keydown", event => {

    const key =
        event.key.toLowerCase();

    if (
        key === "arrowup" ||
        key === "w"
    ) {

        event.preventDefault();

        setDirection("up");
    }

    if (
        key === "arrowdown" ||
        key === "s"
    ) {

        event.preventDefault();

        setDirection("down");
    }

    if (
        key === "arrowleft" ||
        key === "a"
    ) {

        event.preventDefault();

        setDirection("left");
    }

    if (
        key === "arrowright" ||
        key === "d"
    ) {

        event.preventDefault();

        setDirection("right");
    }

    if (event.key === "Enter") {

        if (gameOver) {
            restartGame();
        }
        else if (!running) {
            startGame();
        }
    }
});


// ============================================================
// CONTROLES MOBILE
// ============================================================

document
    .querySelectorAll("[data-key]")
    .forEach(button => {

        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();

                const key =
                    button.dataset.key;

                if (key === "ArrowUp") {
                    setDirection("up");
                }

                if (key === "ArrowDown") {
                    setDirection("down");
                }

                if (key === "ArrowLeft") {
                    setDirection("left");
                }

                if (key === "ArrowRight") {
                    setDirection("right");
                }
            }
        );
    });


// ============================================================
// JOGO
// ============================================================

function startGame() {

    running = true;

    messageElement.textContent = "";
}


function restartGame() {

    score = 0;
    lives = 3;
    level = 1;

    gameOver = false;

    resetPacman();
    createGhosts();
    createPellets();

    updateUI();

    messageElement.textContent = "";

    running = true;
}


function updateUI() {

    scoreElement.textContent = score;
    levelElement.textContent = level;
    livesElement.textContent = lives;
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

resetPacman();
createGhosts();
createPellets();

updateUI();

requestAnimationFrame(gameLoop);
