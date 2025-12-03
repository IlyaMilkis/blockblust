// ============================================
// НАСТРОЙКИ ИГРЫ
// ============================================
const CONFIG = {
    BOARD_SIZE: 9,               // Размер поля 9x9
    CELL_SIZE: 50,               // Размер клетки в пикселях
    BLOCK_TYPES: [
        // Все возможные фигуры Block Blast
        [[1]],                              // 1x1
        [[1,1]],                            // 1x2
        [[1],[1]],                          // 2x1
        [[1,1,1]],                          // 1x3
        [[1],[1],[1]],                      // 3x1
        [[1,1],[1,1]],                      // 2x2
        [[1,1,1,1]],                        // 1x4
        [[1],[1],[1],[1]],                  // 4x1
        [[1,1,1],[1,0,0]],                  // L-маленькая
        [[1,1,1],[0,0,1]],                  // J-маленькая
        [[1,1,0],[0,1,1]],                  // Z-маленькая
        [[0,1,1],[1,1,0]],                  // S-маленькая
        [[0,1,0],[1,1,1]],                  // T-маленькая
        [[1,1,1,1,1]],                      // 1x5
        [[1],[1],[1],[1],[1]],              // 5x1
        [[1,1,1,1],[1,0,0,0]],              // L-большая
        [[1,1,1,1],[0,0,0,1]],              // J-большая
    ],
    COLORS: [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
        '#118AB2', '#EF476F', '#FF9A76', '#7B68EE',
        '#20B2AA', '#FF6347', '#9370DB', '#3CB371',
        '#FFA500', '#40E0D0', '#DA70D6', '#6495ED'
    ],
    SCORE_PER_LINE: 100,
    COMBO_MULTIPLIER: [1, 1.5, 2, 2.5, 3, 4, 5],
    INITIAL_TIME: 180000, // 3 минуты на игру
    LEVEL_UP_LINES: 10    // Каждые 10 линий - новый уровень
};

// ============================================
// ИГРОВЫЕ ПЕРЕМЕННЫЕ
// ============================================
let gameState = {
    board: [],
    score: 0,
    level: 1,
    linesCleared: 0,
    gameOver: false,
    paused: false,
    currentBlocks: [],
    nextBlocks: [],
    selectedBlock: null,
    dragOffset: { x: 0, y: 0 },
    isDragging: false,
    combo: 0,
    maxCombo: 0,
    startTime: null,
    elapsedTime: 0
};

// ============================================
// ИНИЦИАЛИЗАЦИЯ ИГРЫ
// ============================================
function initGame() {
    // Создаем пустое поле
    gameState.board = Array(CONFIG.BOARD_SIZE).fill().map(() => 
        Array(CONFIG.BOARD_SIZE).fill(0)
    );
    
    // Сбрасываем статистику
    gameState.score = 0;
    gameState.level = 1;
    gameState.linesCleared = 0;
    gameState.gameOver = false;
    gameState.paused = false;
    gameState.combo = 0;
    gameState.maxCombo = 0;
    gameState.startTime = Date.now();
    
    // Генерируем начальные блоки
    generateNewBlocks();
    
    // Обновляем интерфейс
    updateUI();
    drawBoard();
    drawNextBlocks();
    
    // Скрываем экран Game Over
    document.getElementById('gameOverScreen').style.display = 'none';
}

// ============================================
// ГЕНЕРАЦИЯ БЛОКОВ
// ============================================
function generateNewBlocks() {
    gameState.currentBlocks = [];
    gameState.nextBlocks = [];
    
    // Создаем 3 текущих блока
    for (let i = 0; i < 3; i++) {
        gameState.currentBlocks.push(createRandomBlock());
    }
    
    // Создаем 3 следующих блока
    for (let i = 0; i < 3; i++) {
        gameState.nextBlocks.push(createRandomBlock());
    }
}

function createRandomBlock() {
    const typeIndex = Math.floor(Math.random() * CONFIG.BLOCK_TYPES.length);
    const colorIndex = Math.floor(Math.random() * CONFIG.COLORS.length);
    
    return {
        shape: CONFIG.BLOCK_TYPES[typeIndex],
        color: CONFIG.COLORS[colorIndex],
        width: CONFIG.BLOCK_TYPES[typeIndex][0].length,
        height: CONFIG.BLOCK_TYPES[typeIndex].length,
        x: 0,
        y: 0,
        dragging: false
    };
}

// ============================================
// ОТРИСОВКА
// ============================================
function drawBoard() {
    const canvas = document.getElementById('gameBoard');
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем фон сетки
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку
    ctx.strokeStyle = '#dfe1e5';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
        // Вертикальные линии
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
        
        // Горизонтальные линии
        ctx.beginPath();
        ctx.moveTo(0, i * CONFIG.CELL_SIZE);
        ctx.lineTo(canvas.width, i * CONFIG.CELL_SIZE);
        ctx.stroke();
    }
    
    // Рисуем заполненные клетки
    for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
        for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
            if (gameState.board[y][x] !== 0) {
                drawCell(ctx, x, y, gameState.board[y][x]);
            }
        }
    }
    
    // Рисуем текущие блоки внизу
    drawCurrentBlocks(ctx);
    
    // Рисуем подсказку, если блок выбран
    if (gameState.selectedBlock && !gameState.isDragging) {
        drawPlacementHint(ctx);
    }
}

function drawCell(ctx, x, y, color) {
    const cellX = x * CONFIG.CELL_SIZE;
    const cellY = y * CONFIG.CELL_SIZE;
    const padding = 2;
    
    // Основной цвет
    ctx.fillStyle = color;
    ctx.fillRect(
        cellX + padding,
        cellY + padding,
        CONFIG.CELL_SIZE - padding * 2,
        CONFIG.CELL_SIZE - padding * 2
    );
    
    // Градиент для объема
    const gradient = ctx.createLinearGradient(
        cellX, cellY,
        cellX + CONFIG.CELL_SIZE, cellY + CONFIG.CELL_SIZE
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
        cellX + padding,
        cellY + padding,
        CONFIG.CELL_SIZE - padding * 2,
        CONFIG.CELL_SIZE - padding * 2
    );
    
    // Обводка
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        cellX + padding,
        cellY + padding,
        CONFIG.CELL_SIZE - padding * 2,
        CONFIG.CELL_SIZE - padding * 2
    );
}

function drawCurrentBlocks(ctx) {
    const startY = CONFIG.BOARD_SIZE * CONFIG.CELL_SIZE + 20;
    const blockSpacing = 160;
    
    gameState.currentBlocks.forEach((block, index) => {
        const startX = 20 + index * blockSpacing;
        
        // Фон для блока
        ctx.fillStyle = 'white';
        ctx.fillRect(startX - 10, startY - 10, 
                    block.width * CONFIG.CELL_SIZE + 20, 
                    block.height * CONFIG.CELL_SIZE + 20);
        
        ctx.strokeStyle = '#dfe1e5';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX - 10, startY - 10, 
                      block.width * CONFIG.CELL_SIZE + 20, 
                      block.height * CONFIG.CELL_SIZE + 20);
        
        // Сохраняем позицию для перетаскивания
        block.x = startX;
        block.y = startY;
        
        // Рисуем клетки блока
        for (let y = 0; y < block.height; y++) {
            for (let x = 0; x < block.width; x++) {
                if (block.shape[y][x]) {
                    const cellX = startX + x * CONFIG.CELL_SIZE;
                    const cellY = startY + y * CONFIG.CELL_SIZE;
                    
                    ctx.fillStyle = block.color;
                    ctx.fillRect(cellX + 2, cellY + 2, 
                                CONFIG.CELL_SIZE - 4, 
                                CONFIG.CELL_SIZE - 4);
                    
                    // Объем
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.fillRect(cellX + 2, cellY + 2, 
                                CONFIG.CELL_SIZE - 4, 10);
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.1)';
                    ctx.fillRect(cellX + 2, cellY + CONFIG.CELL_SIZE - 12, 
                                CONFIG.CELL_SIZE - 4, 10);
                }
            }
        }
        
        // Подпись "Перетащи на поле"
        if (!gameState.isDragging) {
            ctx.fillStyle = '#636e72';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Перетащи на поле', 
                        startX + (block.width * CONFIG.CELL_SIZE) / 2, 
                        startY + block.height * CONFIG.CELL_SIZE + 25);
        }
    });
}

function drawNextBlocks() {
    const canvases = [
        document.getElementById('nextBlock1'),
        document.getElementById('nextBlock2'),
        document.getElementById('nextBlock3')
    ];
    
    gameState.nextBlocks.forEach((block, index) => {
        const canvas = canvases[index];
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Центрируем блок
        const blockWidth = block.width * 30;
        const blockHeight = block.height * 30;
        const startX = (canvas.width - blockWidth) / 2;
        const startY = (canvas.height - blockHeight) / 2;
        
        // Рисуем клетки
        for (let y = 0; y < block.height; y++) {
            for (let x = 0; x < block.width; x++) {
                if (block.shape[y][x]) {
                    const cellX = startX + x * 30;
                    const cellY = startY + y * 30;
                    
                    ctx.fillStyle = block.color;
                    ctx.fillRect(cellX + 1, cellY + 1, 28, 28);
                    
                    // Объем
                    ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    ctx.fillRect(cellX + 1, cellY + 1, 28, 8);
                    
                    ctx.fillStyle = 'rgba(0,0,0,0.2)';
                    ctx.fillRect(cellX + 1, cellY + 21, 28, 8);
                }
            }
        }
    });
}

function drawPlacementHint(ctx) {
    const block = gameState.selectedBlock;
    const boardX = Math.floor((block.x - block.dragOffset.x) / CONFIG.CELL_SIZE);
    const boardY = Math.floor((block.y - block.dragOffset.y) / CONFIG.CELL_SIZE);
    
    if (canPlaceBlock(block, boardX, boardY)) {
        for (let y = 0; y < block.height; y++) {
            for (let x = 0; x < block.width; x++) {
                if (block.shape[y][x]) {
                    const cellX = (boardX + x) * CONFIG.CELL_SIZE;
                    const cellY = (boardY + y) * CONFIG.CELL_SIZE;
                    
                    ctx.fillStyle = block.color + '40'; // Полупрозрачный
                    ctx.fillRect(cellX + 2, cellY + 2, 
                                CONFIG.CELL_SIZE - 4, 
                                CONFIG.CELL_SIZE - 4);
                    
                    ctx.strokeStyle = block.color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cellX + 2, cellY + 2, 
                                 CONFIG.CELL_SIZE - 4, 
                                 CONFIG.CELL_SIZE - 4);
                }
            }
        }
    }
}

// ============================================
// ЛОГИКА ИГРЫ
// ============================================
function canPlaceBlock(block, boardX, boardY) {
    // Проверяем границы
    if (boardX < 0 || boardY < 0 || 
        boardX + block.width > CONFIG.BOARD_SIZE || 
        boardY + block.height > CONFIG.BOARD_SIZE) {
        return false;
    }
    
    // Проверяем пересечение с другими блоками
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x] && gameState.board[boardY + y][boardX + x] !== 0) {
                return false;
            }
        }
    }
    
    return true;
}

function placeBlock(block, boardX, boardY) {
    if (!canPlaceBlock(block, boardX, boardY)) {
        return false;
    }
    
    // Размещаем блок на поле
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x]) {
                gameState.board[boardY + y][boardX + x] = block.color;
            }
        }
    }
    
    // Удаляем использованный блок
    const blockIndex = gameState.currentBlocks.indexOf(block);
    if (blockIndex !== -1) {
        gameState.currentBlocks.splice(blockIndex, 1);
        
        // Добавляем новый блок из очереди
        if (gameState.nextBlocks.length > 0) {
            gameState.currentBlocks.push(gameState.nextBlocks.shift());
            gameState.nextBlocks.push(createRandomBlock());
        }
    }
    
    // Проверяем линии
    checkLines();
    
    // Проверяем Game Over
    if (isGameOver()) {
        endGame();
    }
    
    return true;
}

function checkLines() {
    let linesToClear = [];
    let cellsToClear = [];
    
    // Проверяем строки
    for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
        let full = true;
        for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
            if (gameState.board[y][x] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            linesToClear.push({ type: 'row', index: y });
            for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
                cellsToClear.push({ x, y });
            }
        }
    }
    
    // Проверяем столбцы
    for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
        let full = true;
        for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
            if (gameState.board[y][x] === 0) {
                full = false;
                break;
            }
        }
        if (full) {
            linesToClear.push({ type: 'col', index: x });
            for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
                cellsToClear.push({ x, y });
            }
        }
    }
    
    // Если есть линии для очистки
    if (linesToClear.length > 0) {
        // Увеличиваем комбо
        gameState.combo++;
        if (gameState.combo > gameState.maxCombo) {
            gameState.maxCombo = gameState.combo;
        }
        
        // Рассчитываем очки
        const multiplier = CONFIG.COMBO_MULTIPLIER[
            Math.min(gameState.combo - 1, CONFIG.COMBO_MULTIPLIER.length - 1)
        ];
        const linesScore = linesToClear.length * CONFIG.SCORE_PER_LINE * multiplier * gameState.level;
        gameState.score += Math.round(linesScore);
        
        // Увеличиваем счетчик линий
        gameState.linesCleared += linesToClear.length;
        
        // Проверяем уровень
        const newLevel = Math.floor(gameState.linesCleared / CONFIG.LEVEL_UP_LINES) + 1;
        if (newLevel > gameState.level) {
            gameState.level = newLevel;
        }
        
        // Анимация очистки
        animateClear(cellsToClear, () => {
            // Очищаем линии
            linesToClear.forEach(line => {
                if (line.type === 'row') {
                    for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
                        gameState.board[line.index][x] = 0;
                    }
                } else {
                    for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
                        gameState.board[y][line.index] = 0;
                    }
                }
            });
            
            // Обновляем интерфейс
            updateUI();
            drawBoard();
            drawNextBlocks();
        });
    } else {
        // Сбрасываем комбо, если нет линий
        gameState.combo = 0;
    }
}

function animateClear(cells, callback) {
    cells.forEach(cell => {
        const element = document.createElement('div');
        element.style.position = 'absolute';
        element.style.left = (cell.x * CONFIG.CELL_SIZE + 15) + 'px';
        element.style.top = (cell.y * CONFIG.CELL_SIZE + 15) + 'px';
        element.style.width = '20px';
        element.style.height = '20px';
        element.style.background = '#FFD700';
        element.style.borderRadius = '50%';
        element.style.animation = 'pop 0.5s forwards';
        element.style.zIndex = '1000';
        
        document.getElementById('gameBoard').parentElement.appendChild(element);
        
        setTimeout(() => {
            element.remove();
        }, 500);
    });
    
    setTimeout(callback, 500);
}

function isGameOver() {
    // Проверяем, можно ли разместить хоть один блок
    for (const block of gameState.currentBlocks) {
        for (let y = 0; y <= CONFIG.BOARD_SIZE - block.height; y++) {
            for (let x = 0; x <= CONFIG.BOARD_SIZE - block.width; x++) {
                if (canPlaceBlock(block, x, y)) {
                    return false;
                }
            }
        }
    }
    return true;
}

function rotateBlock(block) {
    const newHeight = block.shape[0].length;
    const newWidth = block.shape.length;
    const newShape = [];
    
    for (let y = 0; y < newHeight; y++) {
        newShape[y] = [];
        for (let x = 0; x < newWidth; x++) {
            newShape[y][x] = block.shape[newWidth - 1 - x][y];
        }
    }
    
    block.shape = newShape;
    block.width = newWidth;
    block.height = newHeight;
}

function showHint() {
    // Находим лучшую позицию для текущих блоков
    let bestBlock = null;
    let bestX = 0;
    let bestY = 0;
    
    for (const block of gameState.currentBlocks) {
        for (let y = 0; y <= CONFIG.BOARD_SIZE - block.height; y++) {
            for (let x = 0; x <= CONFIG.BOARD_SIZE - block.width; x++) {
                if (canPlaceBlock(block, x, y)) {
                    bestBlock = block;
                    bestX = x;
                    bestY = y;
                    break;
                }
            }
            if (bestBlock) break;
        }
        if (bestBlock) break;
    }
    
    if (bestBlock) {
        gameState.selectedBlock = bestBlock;
        gameState.selectedBlock.x = bestX * CONFIG.CELL_SIZE;
        gameState.selectedBlock.y = bestY * CONFIG.CELL_SIZE;
        drawBoard();
        
        // Снимаем выделение через 2 секунды
        setTimeout(() => {
            gameState.selectedBlock = null;
            drawBoard();
        }, 2000);
    }
}

// ============================================
// УПРАВЛЕНИЕ ИГРОЙ
// ============================================
function endGame() {
    gameState.gameOver = true;
    gameState.elapsedTime = Date.now() - gameState.startTime;
    
    // Обновляем финальные статистики
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalCleared').textContent = gameState.linesCleared;
    document.getElementById('finalMaxCombo').textContent = gameState.maxCombo;
    document.getElementById('finalLevel').textContent = gameState.level;
    
    // Показываем экран Game Over
    document.getElementById('gameOverScreen').style.display = 'flex';
}

function togglePause() {
    gameState.paused = !gameState.paused;
    document.getElementById('pauseBtn').textContent = 
        gameState.paused ? '▶ Продолжить' : '⏸ Пауза';
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('cleared').textContent = gameState.linesCleared;
}

// ============================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================
function setupEventListeners() {
    const canvas = document.getElementById('gameBoard');
    
    // Нажатие мыши
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    // Для сенсорных устройств
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    // Кнопки управления
    document.getElementById('rotateBtn').addEventListener('click', () => {
        if (gameState.selectedBlock) {
            rotateBlock(gameState.selectedBlock);
            drawBoard();
        }
    });
    
    document.getElementById('hintBtn').addEventListener('click', showHint);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', initGame);
    document.getElementById('playAgainBtn').addEventListener('click', initGame);
    
    // Запрещаем контекстное меню на canvas
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleMouseDown(e) {
    if (gameState.gameOver || gameState.paused) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Проверяем, нажали ли на блок
    for (const block of gameState.currentBlocks) {
        if (x >= block.x && x <= block.x + block.width * CONFIG.CELL_SIZE &&
            y >= block.y && y <= block.y + block.height * CONFIG.CELL_SIZE) {
            
            gameState.selectedBlock = block;
            gameState.isDragging = true;
            gameState.dragOffset.x = x - block.x;
            gameState.dragOffset.y = y - block.y;
            drawBoard();
            break;
        }
    }
}

function handleMouseMove(e) {
    if (!gameState.isDragging || !gameState.selectedBlock) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    gameState.selectedBlock.x = x - gameState.dragOffset.x;
    gameState.selectedBlock.y = y - gameState.dragOffset.y;
    drawBoard();
}

function handleMouseUp() {
    if (!gameState.isDragging || !gameState.selectedBlock) return;
    
    // Преобразуем координаты в клетки поля
    const boardX = Math.floor(gameState.selectedBlock.x / CONFIG.CELL_SIZE);
    const boardY = Math.floor(gameState.selectedBlock.y / CONFIG.CELL_SIZE);
    
    // Пытаемся разместить блок
    if (placeBlock(gameState.selectedBlock, boardX, boardY)) {
        // Успешно разместили
        gameState.selectedBlock = null;
    } else {
        // Не удалось разместить - возвращаем блок на место
        gameState.selectedBlock.x = 0;
        gameState.selectedBlock.y = CONFIG.BOARD_SIZE * CONFIG.CELL_SIZE + 20;
    }
    
    gameState.isDragging = false;
    drawBoard();
}

// Аналогичные обработчики для touch событий
function handleTouchStart(e) {
    e.preventDefault();
    handleMouseDown(e.touches[0]);
}

function handleTouchMove(e) {
    e.preventDefault();
    handleMouseMove(e.touches[0]);
}

function handleTouchEnd(e) {
    e.preventDefault();
    handleMouseUp();
}

// ============================================
// ЗАПУСК ИГРЫ
// ============================================
window.onload = function() {
    initGame();
    setupEventListeners();
    
    // Добавляем CSS для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pop {
            0% { transform: scale(0); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(0); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
};
