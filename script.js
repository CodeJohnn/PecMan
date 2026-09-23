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
// DIREÇÕES
// ============================================================

const DIRECTIONS = {
    up: {
        x: 0,
        y: -1
    },

    down: {
        x: 0,
        y: 1
    },

    left: {
        x: -1,
        y: 0
    },

    right: {
        x: 1,
        y: 0
    }
};

const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left"
};


// ============================================================
// ESTADO DO JOGO
// ============================================================

let score = 0;
let lives = 3;
let level = 1;

let running = false;
let gameOver = false;

let pellets = [];
let ghosts = [];

let lastTime = 0;


// ============================================================
// PAC-MAN
// ============================================================

const pacman = {

    x: 1.5 * TILE,
    y: 1.5 * TILE,

    direction: "right",
    nextDirection: "right",

    speed: 95,

    radius: TILE * 0.40,

    mouth: 0,
    mouthDirection: 1
};


// ============================================================
// FUNÇÕES DO MAPA
// ============================================================

function isWallTile(x, y) {

    if (
        x < 0 ||
        x >= COLS ||
        y < 0 ||
        y >= ROWS
    ) {
        return true;
    }

    return MAP[y][x] === "#";
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

    pacman.speed =
        Math.min(
            145,
            95 + (level - 1) * 7
        );
}


// ============================================================
// FANTASMAS
// ============================================================

function createGhosts() {

    const speed =
        Math.min(
            210,
            95 + level * 18
        );

    ghosts = [

        {
            x: 9.5 * TILE,
            y: 9.5 * TILE,

            direction: "left",

            color: "#ff3030",

            speed: speed
        },

        {
            x: 11.5 * TILE,
            y: 9.5 * TILE,

            direction: "right",

            color: "#00ffff",

            speed: speed * 1.02
        },

        {
            x: 10.5 * TILE,
            y: 10.5 * TILE,

            direction: "up",

            color: "#ff69b4",

            speed: speed * 1.05
        }
    ];
}


// ============================================================
// MOVIMENTO DO PAC-MAN
// ============================================================

function canPacmanMove(direction, distance) {

    const dir =
        DIRECTIONS[direction];

    const nextX =
        pacman.x +
        dir.x * distance;

    const nextY =
        pacman.y +
        dir.y * distance;

    const radius =
        pacman.radius;


    const left =
        Math.floor(
            (nextX - radius) / TILE
        );

    const right =
        Math.floor(
            (nextX + radius) / TILE
        );

    const top =
        Math.floor(
            (nextY - radius) / TILE
        );

    const bottom =
        Math.floor(
            (nextY + radius) / TILE
        );


    return !(
        isWallTile(left, top) ||
        isWallTile(right, top) ||
        isWallTile(left, bottom) ||
        isWallTile(right, bottom)
    );
}


function updatePacman(delta) {

    const movement =
        pacman.speed * delta;


    // Tenta mudar de direção

    if (
        canPacmanMove(
            pacman.nextDirection,
            2
        )
    ) {

        pacman.direction =
            pacman.nextDirection;
    }


    // Movimento atual

    if (
        canPacmanMove(
            pacman.direction,
            movement
        )
    ) {

        const dir =
            DIRECTIONS[pacman.direction];

        pacman.x +=
            dir.x * movement;

        pacman.y +=
            dir.y * movement;
    }


    // Animação da boca

    pacman.mouth +=
        pacman.mouthDirection *
        delta *
        9;

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
// POSIÇÃO DOS FANTASMAS
// ============================================================

function getGhostTile(ghost) {

    return {

        x: Math.round(
            (ghost.x - TILE / 2) / TILE
        ),

        y: Math.round(
            (ghost.y - TILE / 2) / TILE
        )
    };
}


function getPacmanTile() {

    return {

        x: Math.round(
            (pacman.x - TILE / 2) / TILE
        ),

        y: Math.round(
            (pacman.y - TILE / 2) / TILE
        )
    };
}


// ============================================================
// DISTÂNCIA
// ============================================================

function getDistance(
    x1,
    y1,
    x2,
    y2
) {

    return Math.abs(x1 - x2) +
           Math.abs(y1 - y2);
}


// ============================================================
// DIREÇÕES POSSÍVEIS DO FANTASMA
// ============================================================

function isValidGhostDirection(
    ghost,
    direction
) {

    const tile =
        getGhostTile(ghost);

    const dir =
        DIRECTIONS[direction];


    const newX =
        tile.x + dir.x;

    const newY =
        tile.y + dir.y;


    return !isWallTile(
        newX,
        newY
    );
}


// ============================================================
// IA DOS FANTASMAS
// ============================================================

function chooseGhostDirection(ghost) {

    const ghostTile =
        getGhostTile(ghost);

    const pacmanTile =
        getPacmanTile();

    const directions = [
        "up",
        "down",
        "left",
        "right"
    ];

    const possible =
        directions.filter(
            direction =>
                !isWallTile(
                    ghostTile.x +
                    DIRECTIONS[direction].x,
                    ghostTile.y +
                    DIRECTIONS[direction].y
                )
        );

    if (possible.length === 0) {
        return;
    }

    const currentDirection =
        ghost.direction;

    const reverseDirection =
        OPPOSITE[currentDirection];

    const noReverse =
        possible.filter(
            direction =>
                direction !==
                reverseDirection
        );

    const choices =
        (noReverse.length > 0
            ? noReverse
            : possible
        )
            .map(direction => {

                const dir =
                    DIRECTIONS[direction];

                const nextX =
                    ghostTile.x + dir.x;

                const nextY =
                    ghostTile.y + dir.y;

                const distance =
                    getDistance(
                        nextX,
                        nextY,
                        pacmanTile.x,
                        pacmanTile.y
                    );

                const straightBias =
                    direction ===
                    currentDirection
                        ? -0.8
                        : 0;

                return {
                    direction,
                    distance:
                        distance +
                        straightBias
                };
            })
            .sort(
                (a, b) =>
                    a.distance -
                    b.distance
            );

    if (
        currentDirection &&
        possible.includes(
            currentDirection
        ) &&
        choices.length > 1 &&
        currentDirection !==
        reverseDirection &&
        choices[0].distance -
        choices.find(
            choice =>
                choice.direction ===
                currentDirection
        )?.distance <= 1
    ) {
        ghost.direction =
            currentDirection;
        return;
    }

    ghost.direction =
        choices[0].direction;
}


// ============================================================
// MOVIMENTO DOS FANTASMAS
// ============================================================

function updateGhost(
    ghost,
    delta
) {

    const tile =
        getGhostTile(ghost);


    const centerX =
        tile.x * TILE +
        TILE / 2;

    const centerY =
        tile.y * TILE +
        TILE / 2;


    // Quando chega no centro
    // de uma célula, recalcula a IA.

    const distanceToCenter =
        Math.hypot(
            ghost.x - centerX,
            ghost.y - centerY
        );


    if (distanceToCenter < 2) {

        ghost.x = centerX;
        ghost.y = centerY;

        const currentDirection =
            ghost.direction;

        const dir =
            DIRECTIONS[currentDirection];

        const forwardTile = {
            x: tile.x + dir.x,
            y: tile.y + dir.y
        };

        const canKeepGoing =
            !isWallTile(
                forwardTile.x,
                forwardTile.y
            );

        const possibleTurns =
            ["up", "down", "left", "right"]
                .filter(direction =>
                    direction !==
                    OPPOSITE[currentDirection]
                )
                .filter(direction =>
                    !isWallTile(
                        tile.x + DIRECTIONS[direction].x,
                        tile.y + DIRECTIONS[direction].y
                    )
                );

        if (
            !canKeepGoing ||
            possibleTurns.length > 1
        ) {
            chooseGhostDirection(
                ghost
            );
        }
    }


    const direction =
        DIRECTIONS[
            ghost.direction
        ];


    const movement =
        ghost.speed * delta;


    const nextX =
        ghost.x +
        direction.x *
        movement;

    const nextY =
        ghost.y +
        direction.y *
        movement;


    const radius = 7;


    const left =
        Math.floor(
            (nextX - radius) /
            TILE
        );

    const right =
        Math.floor(
            (nextX + radius) /
            TILE
        );

    const top =
        Math.floor(
            (nextY - radius) /
            TILE
        );

    const bottom =
        Math.floor(
            (nextY + radius) /
            TILE
        );


    const blocked =

        isWallTile(
            left,
            top
        ) ||

        isWallTile(
            right,
            top
        ) ||

        isWallTile(
            left,
            bottom
        ) ||

        isWallTile(
            right,
            bottom
        );


    if (!blocked) {

        ghost.x =
            nextX;

        ghost.y =
            nextY;

    } else {

        // Se bater na parede,
        // procura outra direção.

        chooseGhostDirection(
            ghost
        );
    }
}


function updateGhosts(delta) {

    for (
        const ghost of ghosts
    ) {

        updateGhost(
            ghost,
            delta
        );
    }
}


// ============================================================
// COMER PONTOS
// ============================================================

function eatPellet() {

    for (
        let i = pellets.length - 1;
        i >= 0;
        i--
    ) {

        const pellet =
            pellets[i];


        const dx =
            pacman.x -
            pellet.x;

        const dy =
            pacman.y -
            pellet.y;


        const distance =
            Math.hypot(
                dx,
                dy
            );


        if (distance < 9) {

            pellets.splice(
                i,
                1
            );

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

    for (
        const ghost of ghosts
    ) {

        const dx =
            pacman.x -
            ghost.x;

        const dy =
            pacman.y -
            ghost.y;


        const distance =
            Math.hypot(
                dx,
                dy
            );


        if (
            distance <
            TILE * 0.58
        ) {

            loseLife();

            return;
        }
    }
}


// ============================================================
// PERDEU VIDA
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
        "Você perdeu uma vida!";


    setTimeout(() => {

        resetPacman();

        createGhosts();

        messageElement.textContent =
            "";

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


    messageElement.textContent =
        `FASE ${level}!`;


    updateUI();


    setTimeout(() => {

        if (!gameOver) {

            messageElement.textContent =
                "";
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


    for (
        let y = 0;
        y < ROWS;
        y++
    ) {

        for (
            let x = 0;
            x < COLS;
            x++
        ) {

            if (
                MAP[y][x] === "#"
            ) {

                const px =
                    x * TILE;

                const py =
                    y * TILE;


                ctx.fillStyle =
                    "#1111aa";


                ctx.fillRect(
                    px,
                    py,
                    TILE,
                    TILE
                );


                ctx.strokeStyle =
                    "#3434ff";


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


    for (
        const pellet of pellets
    ) {

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


    if (
        pacman.direction ===
        "right"
    ) {
        rotation = 0;
    }


    if (
        pacman.direction ===
        "down"
    ) {
        rotation =
            Math.PI / 2;
    }


    if (
        pacman.direction ===
        "left"
    ) {
        rotation =
            Math.PI;
    }


    if (
        pacman.direction ===
        "up"
    ) {
        rotation =
            -Math.PI / 2;
    }


    const mouthAngle =
        0.15 +
        pacman.mouth * 0.30;


    ctx.save();


    ctx.translate(
        pacman.x,
        pacman.y
    );


    ctx.rotate(
        rotation
    );


    ctx.fillStyle =
        "#ffff00";


    ctx.beginPath();


    ctx.moveTo(
        0,
        0
    );


    ctx.arc(
        0,
        0,
        pacman.radius,
        mouthAngle,
        Math.PI * 2 -
        mouthAngle
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

    const radius =
        TILE * 0.42;


    ctx.fillStyle =
        ghost.color;


    ctx.beginPath();


    ctx.arc(
        x,
        y - 1,
        radius,
        Math.PI,
        0
    );


    ctx.lineTo(
        x + radius,
        y + radius
    );


    ctx.lineTo(
        x + radius * 0.5,
        y + radius * 0.65
    );


    ctx.lineTo(
        x,
        y + radius
    );


    ctx.lineTo(
        x - radius * 0.5,
        y + radius * 0.65
    );


    ctx.lineTo(
        x - radius,
        y + radius
    );


    ctx.closePath();

    ctx.fill();


    // Olhos

    ctx.fillStyle =
        "#fff";


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


    ctx.fillStyle =
        "#111";


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

    for (
        const ghost of ghosts
    ) {

        drawGhost(
            ghost
        );
    }
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

        lastTime =
            timestamp;
    }


    let delta =
        (timestamp - lastTime) /
        1000;


    lastTime =
        timestamp;


    // Evita saltos se a aba
    // ficar congelada.

    delta =
        Math.min(
            delta,
            0.05
        );


    if (running) {

        updatePacman(
            delta
        );

        updateGhosts(
            delta
        );

        checkGhostCollision();
    }


    render();


    requestAnimationFrame(
        gameLoop
    );
}


// ============================================================
// CONTROLES
// ============================================================

function setDirection(
    direction
) {

    pacman.nextDirection =
        direction;


    if (
        !running &&
        !gameOver
    ) {

        startGame();
    }
}


document.addEventListener(
    "keydown",
    event => {

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


        if (
            event.key ===
            "Enter"
        ) {

            if (gameOver) {

                restartGame();

            } else if (!running) {

                startGame();
            }
        }
    }
);


// ============================================================
// CONTROLES MOBILE
// ============================================================

document
    .querySelectorAll(
        "[data-key]"
    )
    .forEach(button => {

        button.addEventListener(
            "pointerdown",
            event => {

                event.preventDefault();


                const key =
                    button.dataset.key;


                if (
                    key ===
                    "ArrowUp"
                ) {

                    setDirection(
                        "up"
                    );
                }


                if (
                    key ===
                    "ArrowDown"
                ) {

                    setDirection(
                        "down"
                    );
                }


                if (
                    key ===
                    "ArrowLeft"
                ) {

                    setDirection(
                        "left"
                    );
                }


                if (
                    key ===
                    "ArrowRight"
                ) {

                    setDirection(
                        "right"
                    );
                }
            }
        );
    });


// ============================================================
// CONTROLE DO JOGO
// ============================================================

function startGame() {

    running = true;

    messageElement.textContent =
        "";
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


    messageElement.textContent =
        "";


    running = true;
}


function updateUI() {

    scoreElement.textContent =
        score;

    levelElement.textContent =
        level;

    livesElement.textContent =
        lives;
}


// ============================================================
// INICIALIZAÇÃO
// ============================================================

resetPacman();

createGhosts();

createPellets();

updateUI();

requestAnimationFrame(
    gameLoop
);
