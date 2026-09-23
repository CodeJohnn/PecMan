const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const livesElement = document.getElementById("lives");
const messageElement = document.getElementById("message");


// =====================================================
// CONFIGURAÇÃO
// =====================================================

const TILE = 24;

const baseMap = [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#.#.....#...#.....#.#",
    "#.#.###.#####.###.#.#",
    "#...................#",
    "#.###.#.#######.#.###",
    "#.....#...#...#.....#",
    "#####.### # ###.#####",
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


// Corrige espaços do mapa
const map = baseMap.map(row =>
    row.replaceAll(" ", "#")
);

const ROWS = map.length;
const COLS = map[0].length;

canvas.width = COLS * TILE;
canvas.height = ROWS * TILE;


// =====================================================
// ESTADO DO JOGO
// =====================================================

let score = 0;
let lives = 3;
let level = 1;

let running = false;
let gameOver = false;

let pellets = [];

let pacman = {
    x: 1,
    y: 1,
    direction: "right",
    nextDirection: "right"
};

let ghosts = [];


// =====================================================
// MAPA
// =====================================================

function isWall(x, y) {

    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
        return true;
    }

    return map[y][x] === "#";
}


function createPellets() {

    pellets = [];

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (
                map[y][x] !== "#" &&
                !(x === pacman.x && y === pacman.y)
            ) {

                pellets.push({
                    x,
                    y
                });
            }
        }
    }
}


// =====================================================
// PAC-MAN
// =====================================================

function resetPacman() {

    pacman = {
        x: 1,
        y: 1,
        direction: "right",
        nextDirection: "right"
    };
}


function canMove(x, y, direction) {

    let newX = x;
    let newY = y;

    if (direction === "up") newY--;
    if (direction === "down") newY++;
    if (direction === "left") newX--;
    if (direction === "right") newX++;

    return !isWall(newX, newY);
}


function movePacman() {

    if (
        canMove(
            pacman.x,
            pacman.y,
            pacman.nextDirection
        )
    ) {
        pacman.direction = pacman.nextDirection;
    }

    if (
        canMove(
            pacman.x,
            pacman.y,
            pacman.direction
        )
    ) {

        if (pacman.direction === "up") pacman.y--;
        if (pacman.direction === "down") pacman.y++;
        if (pacman.direction === "left") pacman.x--;
        if (pacman.direction === "right") pacman.x++;
    }

    eatPellet();
}


// =====================================================
// COMER BOLINHAS
// =====================================================

function eatPellet() {

    const index = pellets.findIndex(
        pellet =>
            pellet.x === pacman.x &&
            pellet.y === pacman.y
    );

    if (index !== -1) {

        pellets.splice(index, 1);

        score += 10;

        updateUI();

        if (pellets.length === 0) {
            nextLevel();
        }
    }
}


// =====================================================
// FANTASMAS
// =====================================================

function createGhosts() {

    ghosts = [

        {
            x: 9,
            y: 9,
            color: "#ff0000",
            direction: "left"
        },

        {
            x: 11,
            y: 9,
            color: "#00ffff",
            direction: "right"
        },

        {
            x: 10,
            y: 10,
            color: "#ff69b4",
            direction: "up"
        }

    ];
}


function getPossibleDirections(ghost) {

    const directions = [
        "up",
        "down",
        "left",
        "right"
    ];

    return directions.filter(direction =>
        canMove(
            ghost.x,
            ghost.y,
            direction
        )
    );
}


function moveGhost(ghost) {

    const possible = getPossibleDirections(ghost);

    if (possible.length === 0) {
        return;
    }

    // Evita ficar voltando imediatamente
    const opposite = {
        up: "down",
        down: "up",
        left: "right",
        right: "left"
    };

    let choices = possible.filter(
        direction =>
            direction !== opposite[ghost.direction]
    );

    if (choices.length === 0) {
        choices = possible;
    }

    // Às vezes tenta perseguir Pac-Man
    if (Math.random() < 0.65) {

        choices.sort((a, b) => {

            const distanceA =
                getDistanceAfterMove(ghost, a);

            const distanceB =
                getDistanceAfterMove(ghost, b);

            return distanceA - distanceB;
        });
    }

    ghost.direction = choices[0];

    if (ghost.direction === "up") ghost.y--;
    if (ghost.direction === "down") ghost.y++;
    if (ghost.direction === "left") ghost.x--;
    if (ghost.direction === "right") ghost.x++;
}


function getDistanceAfterMove(ghost, direction) {

    let x = ghost.x;
    let y = ghost.y;

    if (direction === "up") y--;
    if (direction === "down") y++;
    if (direction === "left") x--;
    if (direction === "right") x++;

    return Math.abs(x - pacman.x) +
           Math.abs(y - pacman.y);
}


// =====================================================
// COLISÃO
// =====================================================

function checkGhostCollision() {

    for (const ghost of ghosts) {

        if (
            ghost.x === pacman.x &&
            ghost.y === pacman.y
        ) {

            loseLife();

            return;
        }
    }
}


function loseLife() {

    lives--;

    updateUI();

    if (lives <= 0) {

        running = false;
        gameOver = true;

        messageElement.textContent =
            "GAME OVER — pressione ENTER";

        return;
    }

    resetPacman();
    createGhosts();

    messageElement.textContent =
        `Você perdeu uma vida! ${lives} restantes`;

    setTimeout(() => {

        if (!gameOver) {
            messageElement.textContent = "";
        }

    }, 1000);
}


// =====================================================
// FASES
// =====================================================

function nextLevel() {

    level++;

    resetPacman();
    createGhosts();
    createPellets();

    messageElement.textContent =
        `FASE ${level}!`;

    updateUI();

    setTimeout(() => {

        if (!gameOver) {
            messageElement.textContent = "";
        }

    }, 1500);
}


// =====================================================
// DESENHO
// =====================================================

function drawMap() {

    for (let y = 0; y < ROWS; y++) {

        for (let x = 0; x < COLS; x++) {

            if (map[y][x] === "#") {

                ctx.fillStyle = "#1515aa";

                ctx.fillRect(
                    x * TILE,
                    y * TILE,
                    TILE,
                    TILE
                );

                ctx.strokeStyle = "#3333ff";

                ctx.strokeRect(
                    x * TILE + 2,
                    y * TILE + 2,
                    TILE - 4,
                    TILE - 4
                );
            }
        }
    }
}


function drawPellets() {

    ctx.fillStyle = "#fff";

    for (const pellet of pellets) {

        ctx.beginPath();

        ctx.arc(
            pellet.x * TILE + TILE / 2,
            pellet.y * TILE + TILE / 2,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


function drawPacman() {

    const centerX =
        pacman.x * TILE + TILE / 2;

    const centerY =
        pacman.y * TILE + TILE / 2;

    let rotation = 0;

    if (pacman.direction === "right") rotation = 0;
    if (pacman.direction === "down") rotation = Math.PI / 2;
    if (pacman.direction === "left") rotation = Math.PI;
    if (pacman.direction === "up") rotation = -Math.PI / 2;

    ctx.save();

    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    ctx.fillStyle = "#ffff00";

    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.arc(
        0,
        0,
        TILE / 2 - 2,
        0.25,
        Math.PI * 2 - 0.25
    );

    ctx.closePath();

    ctx.fill();

    ctx.restore();
}


function drawGhosts() {

    for (const ghost of ghosts) {

        const x = ghost.x * TILE;
        const y = ghost.y * TILE;

        ctx.fillStyle = ghost.color;

        ctx.beginPath();

        ctx.arc(
            x + TILE / 2,
            y + TILE / 2,
            TILE / 2 - 2,
            Math.PI,
            0
        );

        ctx.lineTo(
            x + TILE - 3,
            y + TILE
        );

        ctx.lineTo(
            x + TILE - 8,
            y + TILE - 5
        );

        ctx.lineTo(
            x + TILE / 2,
            y + TILE
        );

        ctx.lineTo(
            x + 8,
            y + TILE - 5
        );

        ctx.lineTo(
            x + 3,
            y + TILE
        );

        ctx.closePath();

        ctx.fill();

        // olhos

        ctx.fillStyle = "white";

        ctx.beginPath();

        ctx.arc(
            x + 9,
            y + 10,
            4,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x + 15,
            y + 10,
            4,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.fillStyle = "#000";

        ctx.beginPath();

        ctx.arc(
            x + 9,
            y + 10,
            2,
            0,
            Math.PI * 2
        );

        ctx.arc(
            x + 15,
            y + 10,
            2,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }
}


function draw() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawMap();
    drawPellets();
    drawPacman();
    drawGhosts();
}


// =====================================================
// LOOP DO JOGO
// =====================================================

let lastTime = 0;
let accumulator = 0;

function gameLoop(time) {

    const delta = time - lastTime;

    lastTime = time;

    if (running) {

        accumulator += delta;

        // Fases ficam progressivamente mais rápidas
        const speed =
            Math.max(
                80,
                170 - (level - 1) * 10
            );

        if (accumulator >= speed) {

            accumulator = 0;

            movePacman();

            // Fantasmas ficam mais rápidos
            if (
                Math.random() <
                0.75 + Math.min(level * 0.03, 0.2)
            ) {

                ghosts.forEach(moveGhost);
            }

            checkGhostCollision();
        }
    }

    draw();

    requestAnimationFrame(gameLoop);
}


// =====================================================
// CONTROLES
// =====================================================

document.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    if (
        key === "arrowup" ||
        key === "w"
    ) {
        pacman.nextDirection = "up";
    }

    if (
        key === "arrowdown" ||
        key === "s"
    ) {
        pacman.nextDirection = "down";
    }

    if (
        key === "arrowleft" ||
        key === "a"
    ) {
        pacman.nextDirection = "left";
    }

    if (
        key === "arrowright" ||
        key === "d"
    ) {
        pacman.nextDirection = "right";
    }

    if (event.key === "Enter") {

        if (!running) {

            if (gameOver) {
                restartGame();
            } else {
                startGame();
            }
        }
    }
});


// Botões para celular

document.querySelectorAll("[data-key]")
    .forEach(button => {

        button.addEventListener("click", () => {

            const key = button.dataset.key;

            if (key === "ArrowUp") {
                pacman.nextDirection = "up";
            }

            if (key === "ArrowDown") {
                pacman.nextDirection = "down";
            }

            if (key === "ArrowLeft") {
                pacman.nextDirection = "left";
            }

            if (key === "ArrowRight") {
                pacman.nextDirection = "right";
            }
        });
    });


// =====================================================
// INICIALIZAÇÃO
// =====================================================

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

    running = true;

    messageElement.textContent = "";
}


function updateUI() {

    scoreElement.textContent = score;
    levelElement.textContent = level;
    livesElement.textContent = lives;
}


resetPacman();
createGhosts();
createPellets();

updateUI();

requestAnimationFrame(gameLoop);