// ============================================
// НАСТРОЙКИ ИГРЫ BLOCK BLAST
// ============================================
const CONFIG = {
    BOARD_SIZE: 9,
    CELL_SIZE: 50,
    BLOCK_TYPES: [
        [[1]], [[1,1]], [[1],[1]], [[1,1,1]], 
        [[1],[1],[1]], [[1,1],[1,1]], [[1,1,1,1]], 
        [[1],[1],[1],[1]], [[1,1,1],[1,0,0]], 
        [[1,1,1],[0,0,1]], [[1,1,0],[0,1,1]], 
        [[0,1,1],[1,1,0]], [[0,1,0],[1,1,1]]
    ],
    COLORS: [
        '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0',
        '#118AB2', '#EF476F', '#FF9A76', '#7B68EE'
    ],
    SCORE_PER_LINE: 100,
    INITIAL_BLOCKS: 3
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
    availableBlocks: [],
    selectedBlock: null,
    isDragging: false,
    dragGhost: null,
    dragStartX: 0,
    dragStartY: 0,
    currentHint: null
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
    
    // Генерируем блоки
    generateNewBlocks();
    
    // Обновляем интерфейс
    updateUI();
    drawBoard();
    
    // Скрываем экран Game Over
    document.getElementById('gameOverScreen').style.display = 'none';
}

// ============================================
// ГЕНЕРАЦИЯ БЛОКОВ
// ============================================
function generateNewBlocks() {
    gameState.availableBlocks = [];
    
    for (let i = 0; i < CONFIG.INITIAL_BLOCKS; i++) {
        gameState.availableBlocks.push(createRandomBlock());
    }
    
    renderAvailableBlocks();
}

function createRandomBlock() {
    const typeIndex = Math.floor(Math.random() * CONFIG.BLOCK_TYPES.length);
    const colorIndex = Math.floor(Math.random() * CONFIG.COLORS.length);
    
    const shape = CONFIG.BLOCK_TYPES[typeIndex];
    const height = shape.length;
    const width = shape[0].length;
    
    return {
        id: 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        shape: JSON.parse(JSON.stringify(shape)),
        color: CONFIG.COLORS[colorIndex],
        width: width,
        height: height,
        element: null
    };
}

// ============================================
// ОТОБРАЖЕНИЕ БЛОКОВ
// ============================================
function renderAvailableBlocks() {
    const container = document.getElementById('currentBlocksContainer');
    container.innerHTML = '';
    
    gameState.availableBlocks.forEach((block, index) => {
        const blockElement = createBlockElement(block);
        block.element = blockElement;
        container.appendChild(blockElement);
    });
}

function createBlockElement(block) {
    const element = document.createElement('div');
    element.className = 'draggable-block';
    element.dataset.blockId = block.id;
    
    // Размеры блока
    const blockSize = 35;
    const width = block.width * blockSize;
    const height = block.height * blockSize;
    
    element.innerHTML = `
        <div class="block-preview" style="width:${width}px; height:${height}px; position:relative;">
            ${createBlockSVG(block, blockSize)}
        </div>
    `;
    
    // Настройка перетаскивания
    setupDragAndDrop(element, block);
    
    return element;
}

function createBlockSVG(block, cellSize) {
    let svg = `<svg width="${block.width * cellSize}" height="${block.height * cellSize}" viewBox="0 0 ${block.width * cellSize} ${block.height * cellSize}">`;
    
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x]) {
                const xPos = x * cellSize;
                const yPos = y * cellSize;
                
                // Основной квадрат
                svg += `<rect x="${xPos}" y="${yPos}" width="${cellSize}" height="${cellSize}" 
                        fill="${block.color}" rx="5" ry="5" 
                        stroke="${darkenColor(block.color, 20)}" stroke-width="2"/>`;
                
                // Эффект объема
                svg += `<rect x="${xPos + 2}" y="${yPos + 2}" width="${cellSize - 4}" height="8" 
                        fill="rgba(255,255,255,0.4)" rx="2" ry="2"/>`;
            }
        }
    }
    
    svg += '</svg>';
    return svg;
}

function darkenColor(color, percent) {
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);

    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ============================================
// ПЕРЕТАСКИВАНИЕ (УЛУЧШЕННАЯ ВЕРСИЯ)
// ============================================
function setupDragAndDrop(element, block) {
    let isDragging = false;
    let ghost = null;
    
    // События для мыши
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDragTouch, { passive: false });
    
    function startDrag(e) {
        if (gameState.gameOver || gameState.paused) return;
        e.preventDefault();
        
        gameState.selectedBlock = block;
        gameState.isDragging = true;
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        
        createDragGhost(element, clientX, clientY);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    }
    
    function startDragTouch(e) {
        if (gameState.gameOver || gameState.paused) return;
        e.preventDefault();
        
        gameState.selectedBlock = block;
        gameState.isDragging = true;
        
        const touch = e.touches[0];
        createDragGhost(element, touch.clientX, touch.clientY);
        document.addEventListener('touchmove', onDragTouch, { passive: false });
        document.addEventListener('touchend', stopDragTouch);
    }
    
    function createDragGhost(sourceElement, clientX, clientY) {
        // Создаем клон для перетаскивания
        ghost = sourceElement.cloneNode(true);
        ghost.className = 'drag-ghost';
        
        // Устанавливаем начальную позицию ПРЯМО ПОД ПАЛЬЦЕМ
        ghost.style.left = clientX + 'px';
        ghost.style.top = clientY + 'px';
        ghost.style.width = sourceElement.offsetWidth + 'px';
        ghost.style.height = sourceElement.offsetHeight + 'px';
        
        document.body.appendChild(ghost);
        
        // Сразу показываем подсказку
        showPlacementHint(clientX, clientY);
    }
    
    function onDrag(e) {
        if (!gameState.isDragging || !ghost) return;
        
        const clientX = e.clientX;
        const clientY = e.clientY;
        
        // Обновляем позицию призрака
        ghost.style.left = clientX + 'px';
        ghost.style.top = clientY + 'px';
        
        // Показываем подсказку
        showPlacementHint(clientX, clientY);
    }
    
    function onDragTouch(e) {
        if (!gameState.isDragging || !ghost || e.touches.length === 0) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        
        // Обновляем позицию призрака
        ghost.style.left = clientX + 'px';
        ghost.style.top = clientY + 'px';
        
        // Показываем подсказку
        showPlacementHint(clientX, clientY);
    }
    
    function stopDrag(e) {
        if (!gameState.isDragging) return;
        
        const clientX = e.clientX;
        const clientY = e.clientY;
        
        finishDrag(clientX, clientY);
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
    }
    
    function stopDragTouch(e) {
        if (!gameState.isDragging) return;
        
        const touch = e.changedTouches[0];
        const clientX = touch.clientX;
        const clientY = touch.clientY;
        
        finishDrag(clientX, clientY);
        document.removeEventListener('touchmove', onDragTouch);
        document.removeEventListener('touchend', stopDragTouch);
    }
    
    function finishDrag(clientX, clientY) {
        gameState.isDragging = false;
        
        // Удаляем призрак
        if (ghost) {
            ghost.remove();
            ghost = null;
        }
        
        // Скрываем подсказку
        hidePlacementHint();
        
        // Определяем позицию на поле
        const canvas = document.getElementById('gameBoard');
        const rect = canvas.getBoundingClientRect();
        
        // Если курсор/палец находится над полем
        if (clientX >= rect.left && clientX <= rect.right &&
            clientY >= rect.top && clientY <= rect.bottom) {
            
            // Вычисляем клетку ПОД ПАЛЬЦЕМ
            const cellSize = CONFIG.CELL_SIZE;
            const boardX = Math.floor((clientX - rect.left) / cellSize);
            const boardY = Math.floor((clientY - rect.top) / cellSize);
            
            // Пытаемся разместить блок в этой позиции
            if (placeBlock(gameState.selectedBlock, boardX, boardY)) {
                // Удаляем использованный блок
                const index = gameState.availableBlocks.findIndex(b => b.id === gameState.selectedBlock.id);
                if (index !== -1) {
                    gameState.availableBlocks.splice(index, 1);
                    renderAvailableBlocks();
                    
                    if (gameState.availableBlocks.length === 0) {
                        generateNewBlocks();
                    }
                }
            }
        }
        
        gameState.selectedBlock = null;
        gameState.currentHint = null;
        drawBoard();
    }
}

// ============================================
// ПОДСКАЗКА РАЗМЕЩЕНИЯ (ИСПРАВЛЕННАЯ)
// ============================================
function showPlacementHint(clientX, clientY) {
    if (!gameState.selectedBlock || !gameState.isDragging) return;
    
    const canvas = document.getElementById('gameBoard');
    const rect = canvas.getBoundingClientRect();
    
    // Если курсор вне поля - скрываем подсказку
    if (clientX < rect.left || clientX > rect.right || 
        clientY < rect.top || clientY > rect.bottom) {
        hidePlacementHint();
        return;
    }
    
    // Вычисляем позицию клетки ПОД КУРСОРОМ
    const cellSize = CONFIG.CELL_SIZE;
    let boardX = Math.floor((clientX - rect.left) / cellSize);
    let boardY = Math.floor((clientY - rect.top) / cellSize);
    
    // Автоматически корректируем позицию, чтобы блок не выходил за границы
    boardX = Math.max(0, Math.min(boardX, CONFIG.BOARD_SIZE - gameState.selectedBlock.width));
    boardY = Math.max(0, Math.min(boardY, CONFIG.BOARD_SIZE - gameState.selectedBlock.height));
    
    // Проверяем возможность размещения
    const canPlace = canPlaceBlock(gameState.selectedBlock, boardX, boardY);
    
    // Сохраняем текущую подсказку
    gameState.currentHint = { x: boardX, y: boardY, canPlace: canPlace };
    
    // Перерисовываем поле с подсказкой
    drawBoardWithHint(boardX, boardY, canPlace);
}

function drawBoardWithHint(hintX, hintY, canPlace) {
    const canvas = document.getElementById('gameBoard');
    const ctx = canvas.getContext('2d');
    
    // Рисуем обычное поле
    drawBoard();
    
    if (!gameState.selectedBlock) return;
    
    const block = gameState.selectedBlock;
    
    // Рисуем подсказку размещения
    ctx.fillStyle = canPlace ? block.color + '80' : 'rgba(255, 0, 0, 0.3)';
    
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x]) {
                const cellX = (hintX + x) * CONFIG.CELL_SIZE;
                const cellY = (hintY + y) * CONFIG.CELL_SIZE;
                
                // Рисуем полупрозрачную фигуру
                ctx.fillRect(cellX + 2, cellY + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
                
                // Рамка
                ctx.strokeStyle = canPlace ? '#4CAF50' : '#F44336';
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX + 2, cellY + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
                
                // Если нельзя разместить - рисуем крестик
                if (!canPlace) {
                    ctx.strokeStyle = '#F44336';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(cellX + 5, cellY + 5);
                    ctx.lineTo(cellX + CONFIG.CELL_SIZE - 5, cellY + CONFIG.CELL_SIZE - 5);
                    ctx.moveTo(cellX + CONFIG.CELL_SIZE - 5, cellY + 5);
                    ctx.lineTo(cellX + 5, cellY + CONFIG.CELL_SIZE - 5);
                    ctx.stroke();
                }
            }
        }
    }
}

function hidePlacementHint() {
    gameState.currentHint = null;
    drawBoard();
}

// ============================================
// ОТРИСОВКА ПОЛЯ
// ============================================
function drawBoard() {
    const canvas = document.getElementById('gameBoard');
    const ctx = canvas.getContext('2d');
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем фон
    ctx.fillStyle = '#f1f3f4';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Рисуем сетку (более светлую)
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= CONFIG.BOARD_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * CONFIG.CELL_SIZE, 0);
        ctx.lineTo(i * CONFIG.CELL_SIZE, canvas.height);
        ctx.stroke();
        
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
    
    // Если есть активная подсказка - рисуем ее
    if (gameState.currentHint && gameState.selectedBlock) {
        drawBoardWithHint(
            gameState.currentHint.x, 
            gameState.currentHint.y, 
            gameState.currentHint.canPlace
        );
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
    gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.2)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
        cellX + padding, 
        cellY + padding, 
        CONFIG.CELL_SIZE - padding * 2, 
        CONFIG.CELL_SIZE - padding * 2
    );
    
    // Тонкая обводка
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
        cellX + padding, 
        cellY + padding, 
        CONFIG.CELL_SIZE - padding * 2, 
        CONFIG.CELL_SIZE - padding * 2
    );
}

// ============================================
// ЛОГИКА ИГРЫ
// ============================================
function canPlaceBlock(block, boardX, boardY) {
    // Проверяем, не выходит ли блок за границы
    if (boardX < 0 || boardY < 0 || 
        boardX + block.width > CONFIG.BOARD_SIZE || 
        boardY + block.height > CONFIG.BOARD_SIZE) {
        return false;
    }
    
    // Проверяем пересечение с существующими блоками
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
    // Проверяем корректность координат
    if (boardX === undefined || boardY === undefined) {
        return false;
    }
    
    if (!canPlaceBlock(block, boardX, boardY)) {
        return false;
    }
    
    // Размещаем блок
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x]) {
                gameState.board[boardY + y][boardX + x] = block.color;
            }
        }
    }
    
    // Проверяем линии
    checkLines();
    
    // Проверяем конец игры
    if (isGameOver()) {
        setTimeout(() => endGame(), 1000);
    }
    
    return true;
}

function rotateCurrentBlock() {
    if (!gameState.selectedBlock && gameState.availableBlocks.length > 0) {
        gameState.selectedBlock = gameState.availableBlocks[0];
    }
    
    if (!gameState.selectedBlock) return;
    
    const block = gameState.selectedBlock;
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
    
    // Обновляем отображение
    renderAvailableBlocks();
    
    // Обновляем подсказку, если она активна
    if (gameState.currentHint) {
        showPlacementHint(
            gameState.dragStartX, 
            gameState.dragStartY
        );
    }
}

function checkLines() {
    let linesToClear = [];
    let cellsCleared = 0;
    
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
            cellsCleared += CONFIG.BOARD_SIZE;
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
            cellsCleared += CONFIG.BOARD_SIZE;
        }
    }
    
    // Очищаем линии (если есть)
    if (linesToClear.length > 0) {
        // Сначала анимируем очистку
        animateClear(linesToClear, () => {
            // Затем очищаем линии
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
            
            // Обновляем очки
            const linesScore = linesToClear.length * CONFIG.SCORE_PER_LINE * gameState.level;
            gameState.score += linesScore;
            gameState.linesCleared += linesToClear.length;
            
            // Обновляем уровень (каждые 5 линий)
            gameState.level = Math.floor(gameState.linesCleared / 5) + 1;
            
            updateUI();
            drawBoard();
        });
    }
}

function animateClear(linesToClear, callback) {
    const canvas = document.getElementById('gameBoard');
    const ctx = canvas.getContext('2d');
    
    let opacity = 1;
    let animationFrame;
    
    function animate() {
        // Рисуем поле
        drawBoard();
        
        // Рисуем мигающие линии
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
        
        linesToClear.forEach(line => {
            if (line.type === 'row') {
                for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
                    const cellX = x * CONFIG.CELL_SIZE;
                    const cellY = line.index * CONFIG.CELL_SIZE;
                    ctx.fillRect(cellX + 2, cellY + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
                }
            } else {
                for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
                    const cellX = line.index * CONFIG.CELL_SIZE;
                    const cellY = y * CONFIG.CELL_SIZE;
                    ctx.fillRect(cellX + 2, cellY + 2, CONFIG.CELL_SIZE - 4, CONFIG.CELL_SIZE - 4);
                }
            }
        });
        
        opacity -= 0.1;
        
        if (opacity > 0) {
            animationFrame = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrame);
            callback();
        }
    }
    
    animate();
}

function isGameOver() {
    // Проверяем все доступные блоки
    for (const block of gameState.availableBlocks) {
        // Проверяем все 4 возможных вращения
        for (let rotation = 0; rotation < 4; rotation++) {
            let testBlock = { ...block };
            
            // Вращаем блок нужное количество раз
            for (let r = 0; r < rotation; r++) {
                const newHeight = testBlock.shape[0].length;
                const newWidth = testBlock.shape.length;
                const newShape = [];
                
                for (let y = 0; y < newHeight; y++) {
                    newShape[y] = [];
                    for (let x = 0; x < newWidth; x++) {
                        newShape[y][x] = testBlock.shape[newWidth - 1 - x][y];
                    }
                }
                testBlock.shape = newShape;
                testBlock.width = newWidth;
                testBlock.height = newHeight;
            }
            
            // Проверяем все возможные позиции на поле
            for (let y = 0; y <= CONFIG.BOARD_SIZE - testBlock.height; y++) {
                for (let x = 0; x <= CONFIG.BOARD_SIZE - testBlock.width; x++) {
                    if (canPlaceBlock(testBlock, x, y)) {
                        return false; // Есть куда поставить
                    }
                }
            }
        }
    }
    
    return true; // Нельзя поставить ни один блок
}

function endGame() {
    gameState.gameOver = true;
    
    // Обновляем статистику
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('finalCleared').textContent = gameState.linesCleared;
    document.getElementById('finalLevel').textContent = gameState.level;
    document.getElementById('finalMaxCombo').textContent = Math.floor(gameState.score / 1000);
    
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
// ИНИЦИАЛИЗАЦИЯ
// ============================================
window.onload = function() {
    initGame();
    
    // Кнопки управления
    document.getElementById('rotateBtn').addEventListener('click', rotateCurrentBlock);
    document.getElementById('hintBtn').addEventListener('click', () => {
        // Подсказка: подсвечивает доступные позиции
        if (gameState.availableBlocks.length > 0 && !gameState.isDragging) {
            gameState.selectedBlock = gameState.availableBlocks[0];
            
            // Находим первую доступную позицию
            for (let y = 0; y <= CONFIG.BOARD_SIZE - gameState.selectedBlock.height; y++) {
                for (let x = 0; x <= CONFIG.BOARD_SIZE - gameState.selectedBlock.width; x++) {
                    if (canPlaceBlock(gameState.selectedBlock, x, y)) {
                        // Подсвечиваем эту позицию
                        gameState.currentHint = { x: x, y: y, canPlace: true };
                        drawBoardWithHint(x, y, true);
                        
                        // Сбрасываем через 2 секунды
                        setTimeout(() => {
                            gameState.currentHint = null;
                            gameState.selectedBlock = null;
                            drawBoard();
                        }, 2000);
                        return;
                    }
                }
            }
        }
    });
    
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', initGame);
    document.getElementById('playAgainBtn').addEventListener('click', initGame);
    
    // Добавляем обработчик для клика по полю (для тестирования)
    document.getElementById('gameBoard').addEventListener('click', (e) => {
        if (gameState.selectedBlock && !gameState.isDragging) {
            const rect = e.target.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / CONFIG.CELL_SIZE);
            const y = Math.floor((e.clientY - rect.top) / CONFIG.CELL_SIZE);
            
            placeBlock(gameState.selectedBlock, x, y);
        }
    });
};
