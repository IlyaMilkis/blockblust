// ============================================
// НАСТРОЙКИ ИГРЫ BLOCK BLAST
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
    INITIAL_BLOCKS: 3,          // Сколько фигур показывать для выбора
    LEVEL_UP_LINES: 10          // Каждые 10 линий - новый уровень
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
    availableBlocks: [],         // Фигуры, которые можно перетаскивать
    selectedBlock: null,
    dragOffset: { x: 0, y: 0 },
    isDragging: false,
    combo: 0,
    maxCombo: 0,
    dragStartPos: { x: 0, y: 0 }
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
    
    // Генерируем начальные блоки
    generateNewBlocks();
    
    // Обновляем интерфейс
    updateUI();
    drawBoard();
    renderAvailableBlocks();
    
    // Скрываем экран Game Over
    document.getElementById('gameOverScreen').style.display = 'none';
}

// ============================================
// ГЕНЕРАЦИЯ БЛОКОВ
// ============================================
function generateNewBlocks() {
    gameState.availableBlocks = [];
    
    // Создаем N блоков для выбора
    for (let i = 0; i < CONFIG.INITIAL_BLOCKS; i++) {
        gameState.availableBlocks.push(createRandomBlock());
    }
}

function createRandomBlock() {
    const typeIndex = Math.floor(Math.random() * CONFIG.BLOCK_TYPES.length);
    const colorIndex = Math.floor(Math.random() * CONFIG.COLORS.length);
    
    const shape = CONFIG.BLOCK_TYPES[typeIndex];
    const height = shape.length;
    const width = shape[0].length;
    
    // Создаем уникальный ID для блока
    const id = 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    return {
        id: id,
        shape: JSON.parse(JSON.stringify(shape)), // Глубокая копия
        color: CONFIG.COLORS[colorIndex],
        width: width,
        height: height,
        originalShape: JSON.parse(JSON.stringify(shape)), // Для сброса
        rotations: 0
    };
}

// ============================================
// ОТРИСОВКА ИГРОВОГО ПОЛЯ
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

// ============================================
// ОТОБРАЖЕНИЕ БЛОКОВ ДЛЯ ПЕРЕТАСКИВАНИЯ
// ============================================
function renderAvailableBlocks() {
    const container = document.getElementById('currentBlocksContainer');
    container.innerHTML = '';
    
    gameState.availableBlocks.forEach((block, index) => {
        const blockElement = document.createElement('div');
        blockElement.className = 'draggable-block';
        blockElement.dataset.blockId = block.id;
        blockElement.innerHTML = createBlockHTML(block);
        
        // Добавляем обработчики для перетаскивания
        setupBlockDrag(blockElement, block);
        
        container.appendChild(blockElement);
    });
}

function createBlockHTML(block) {
    // Создаем визуальное представление блока
    const blockSize = 35;
    let html = `<div class="block-preview" style="width:${block.width * blockSize}px; height:${block.height * blockSize}px; position:relative;">`;
    
    for (let y = 0; y < block.height; y++) {
        for (let x = 0; x < block.width; x++) {
            if (block.shape[y][x]) {
                const left = x * blockSize;
                const top = y * blockSize;
                html += `
                    <div style="
                        position: absolute;
                        left: ${left}px;
                        top: ${top}px;
                        width: ${blockSize - 2}px;
                        height: ${blockSize - 2}px;
                        background: ${block.color};
                        border-radius: 4px;
                        box-shadow: inset 0 0 10px rgba(255,255,255,0.3);
                        border: 2px solid ${darkenColor(block.color, 30)};
                    "></div>
                `;
            }
        }
    }
    
    html += `</div>`;
    return html;
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
// ПЕРЕТАСКИВАНИЕ БЛОКОВ
// ============================================
function setupBlockDrag(element, block) {
    let isDragging = false;
    let offsetX, offsetY;
    let clone = null;
    
    element.addEventListener('mousedown', startDrag);
    element.addEventListener('touchstart', startDragTouch);
    
    function startDrag(e) {
        if (gameState.gameOver || gameState.paused) return;
        
        e.preventDefault();
        isDragging = true;
        
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        
        gameState.selectedBlock = block;
        gameState.dragStartPos = { x: e.clientX, y: e.clientY };
        
        // Создаем клон для перетаскивания
        clone = element.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.8';
        clone.style.transform = 'scale(1.05)';
        clone.className = 'draggable-block dragging';
        
        document.body.appendChild(clone);
        updateClonePosition(e);
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);
    }
    
    function startDragTouch(e) {
        if (gameState.gameOver || gameState.paused) return;
        
        e.preventDefault();
        isDragging = true;
        
        const touch = e.touches[0];
        const rect = element.getBoundingClientRect();
        offsetX = touch.clientX - rect.left;
        offsetY = touch.clientY - rect.top;
        
        gameState.selectedBlock = block;
        gameState.dragStartPos = { x: touch.clientX, y: touch.clientY };
        
        // Создаем клон для перетаскивания
        clone = element.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        clone.style.opacity = '0.8';
        clone.style.transform = 'scale(1.05)';
        clone.className = 'draggable-block dragging';
        
        document.body.appendChild(clone);
        updateClonePosition(touch);
        
        document.addEventListener('touchmove', onDragTouch);
        document.addEventListener('touchend', stopDragTouch);
    }
    
    function onDrag(e) {
        if (!isDragging) return;
        updateClonePosition(e);
    }
    
    function onDragTouch(e) {
        if (!isDragging) return;
        e.preventDefault();
        updateClonePosition(e.touches[0]);
    }
    
    function updateClonePosition(pos) {
        if (!clone) return;
        
        clone.style.left = (pos.clientX - offsetX) + 'px';
        clone.style.top = (pos.clientY - offsetY) + 'px';
        
        // Проверяем, над полем ли мы
        const canvas = document.getElementById('gameBoard');
        const canvasRect = canvas.getBoundingClientRect();
        
        if (pos.clientX >= canvasRect.left && pos.clientX <= canvasRect.right &&
            pos.clientY >= canvasRect.top && pos.clientY <= canvasRect.bottom) {
            
            // Показываем подсказку размещения
            showPlacementHint(pos.clientX, pos.clientY);
        } else {
            hidePlacementHint();
        }
    }
    
    function stopDrag(e) {
        if (!isDragging) return;
        
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        
        finishDrag(e.clientX, e.clientY);
    }
    
    function stopDragTouch(e) {
        if (!isDragging) return;
        
        isDragging = false;
        document.removeEventListener('touchmove', onDragTouch);
        document.removeEventListener('touchend', stopDragTouch);
        
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            finishDrag(touch.clientX, touch.clientY);
        }
    }
    
    function finishDrag(clientX, clientY) {
        // Удаляем клон
        if (clone) {
            clone.remove();
            clone = null;
        }
        
        hidePlacementHint();
        
        // Проверяем, куда бросили блок
        const canvas = document.getElementById('gameBoard');
        const canvasRect = canvas.getBoundingClientRect();
        
        if (clientX >= canvasRect.left && clientX <= canvasRect.right &&
            clientY >= canvasRect.top && clientY <= canvasRect.bottom) {
            
            // Преобразуем координаты в клетки поля
            const boardX = Math.floor((clientX - canvasRect.left) / CONFIG.CELL_SIZE);
            const boardY = Math.floor((clientY - canvasRect.top) / CONFIG.CELL_SIZE);
            
            // Пытаемся разместить блок
            if (placeBlock(gameState.selectedBlock, boardX, boardY)) {
                // Успешно разместили
                const blockIndex = gameState.availableBlocks.findIndex(b => b.id === gameState.selectedBlock.id);
                if (blockIndex !== -1) {
                    gameState.availableBlocks.splice(blockIndex, 1);
                    
                    // Если блоки закончились, генерируем новые
                    if (gameState.availableBlocks.length === 0) {
                        generateNewBlocks();
                    }
                    
                    renderAvailableBlocks();
                }
            }
        }
        
        gameState.selectedBlock = null;
        drawBoard();
    }
}

// ============================================
// ПОДСКАЗКА РАЗМЕЩЕНИЯ
// ============================================
function showPlacementHint(clientX, clientY) {
    if (!gameState.selectedBlock) return;
    
    const canvas = document.getElementById('gameBoard');
    const canvasRect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    // Преобразуем координаты в клетки поля
    const boardX = Math.floor((clientX - canvasRect.left) / CONFIG.CELL_SIZE);
    const boardY = Math.floor((clientY - canvasRect.top) / CONFIG.CELL_SIZE);
    
    // Проверяем, можно ли разместить здесь
    const canPlace = canPlaceBlock(gameState.selectedBlock, boardX, boardY);
    
    // Перерисовываем поле с подсказкой
    drawBoard();
    
    if (canPlace && boardX >= 0 && boardY >= 0 && 
        boardX + gameState.selectedBlock.width <= CONFIG.BOARD_SIZE &&
        boardY + gameState.selectedBlock.height <= CONFIG.BOARD_SIZE) {
        
        // Рисуем полупрозрачную подсказку
        ctx.fillStyle = gameState.selectedBlock.color + '60';
        
        for (let y = 0; y < gameState.selectedBlock.height; y++) {
            for (let x = 0; x < gameState.selectedBlock.width; x++) {
                if (gameState.selectedBlock.shape[y][x]) {
                    const cellX = (boardX + x) * CONFIG.CELL_SIZE;
                    const cellY = (boardY + y) * CONFIG.CELL_SIZE;
                    
                    ctx.fillRect(
                        cellX + 2,
                        cellY + 2,
                        CONFIG.CELL_SIZE - 4,
                        CONFIG.CELL_SIZE - 4
                    );
                    
                    // Обводка
                    ctx.strokeStyle = canPlace ? '#4CAF50' : '#F44336';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(
                        cellX + 2,
                        cellY + 2,
                        CONFIG.CELL_SIZE - 4,
                        CONFIG.CELL_SIZE - 4
                    );
                }
            }
        }
    }
}

function hidePlacementHint() {
    drawBoard();
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
    
    // Проверяем линии
    checkLines();
    
    // Проверяем Game Over
    if (isGameOver()) {
        setTimeout(() => endGame(), 500);
    }
    
    return true;
}

function rotateCurrentBlock() {
    if (!gameState.selectedBlock) {
        // Если блок не выбран, вращаем первый доступный
        if (gameState.availableBlocks.length > 0) {
            gameState.selectedBlock = gameState.availableBlocks[0];
        } else {
            return;
        }
    }
    
    const block = gameState.selectedBlock;
    
    // Вращаем матрицу на 90 градусов
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
    block.rotations = (block.rotations + 1) % 4;
    
    // Обновляем отображение
    renderAvailableBlocks();
    drawBoard();
}

function checkLines() {
    let linesToClear = [];
    
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
        animateClear(linesToClear, () => {
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
        });
    } else {
        // Сбрасываем комбо, если нет линий
        gameState.combo = 0;
    }
}

function animateClear(linesToClear, callback) {
    const canvas = document.getElementById('gameBoard');
    const ctx = canvas.getContext('2d');
    
    // Отмечаем клетки для очистки
    const cellsToClear = [];
    linesToClear.forEach(line => {
        if (line.type === 'row') {
            for (let x = 0; x < CONFIG.BOARD_SIZE; x++) {
                cellsToClear.push({ x, y: line.index });
            }
        } else {
            for (let y = 0; y < CONFIG.BOARD_SIZE; y++) {
                cellsToClear.push({ x: line.index, y });
            }
        }
    });
    
    // Анимация мигания
    let opacity = 1;
    let direction = -1;
    let frames = 0;
    
    function animate() {
        frames++;
        
        // Рисуем поле
        drawBoard();
        
        // Рисуем мигающие клетки
        ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
        cellsToClear.forEach(cell => {
            const cellX = cell.x * CONFIG.CELL_SIZE;
            const cellY = cell.y * CONFIG.CELL_SIZE;
            ctx.fillRect(
                cellX + 2,
                cellY + 2,
                CONFIG.CELL_SIZE - 4,
                CONFIG.CELL_SIZE - 4
            );
        });
        
        // Изменяем прозрачность
        opacity += direction * 0.1;
        if (opacity <= 0.3 || opacity >= 1) {
            direction *= -1;
        }
        
        if (frames < 20) { // 10 миганий (вперед-назад)
            requestAnimationFrame(animate);
        } else {
            callback();
        }
    }
    
    animate();
}

function isGameOver() {
    // Проверяем, можно ли разместить хоть один блок
    for (const block of gameState.availableBlocks) {
        // Проверяем все возможные положения блока
        for (let rotation = 0; rotation < 4; rotation++) {
            let testBlock = { ...block };
            
            // Вращаем блок до нужного положения
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
            
            // Проверяем все позиции на поле
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

function showHint() {
    // Находим первую доступную позицию для любого блока
    for (const block of gameState.availableBlocks) {
        // Проверяем все вращения
        for (let rotation = 0; rotation < 4; rotation++) {
            let testBlock = { ...block };
            
            // Вращаем блок
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
            
            // Ищем позицию
            for (let y = 0; y <= CONFIG.BOARD_SIZE - testBlock.height; y++) {
                for (let x = 0; x <= CONFIG.BOARD_SIZE - testBlock.width; x++) {
                    if (canPlaceBlock(testBlock, x, y)) {
                        // Подсвечиваем этот блок
                        const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
                        if (blockElement) {
                            blockElement.style.animation = 'pulse 1s infinite';
                            blockElement.style.borderColor = '#4CAF50';
                            
                            // Убираем анимацию через 3 секунды
                            setTimeout(() => {
                                blockElement.style.animation = '';
                                blockElement.style.borderColor = '';
                            }, 3000);
                        }
                        return;
                    }
                }
            }
        }
    }
}

function endGame() {
    gameState.gameOver = true;
    
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
    
    // Блокируем перетаскивание при паузе
    const blocks = document.querySelectorAll('.draggable-block');
    blocks.forEach(block => {
        block.style.pointerEvents = gameState.paused ? 'none' : 'auto';
        block.style.opacity = gameState.paused ? '0.5' : '1';
    });
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('level').textContent = gameState.level;
    document.getElementById('cleared').textContent = gameState.linesCleared;
}

// ============================================
// НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ============================================
function setupEventListeners() {
    // Кнопки управления
    document.getElementById('rotateBtn').addEventListener('click', rotateCurrentBlock);
    document.getElementById('hintBtn').addEventListener('click', showHint);
    document.getElementById('pauseBtn').addEventListener('click', togglePause);
    document.getElementById('restartBtn').addEventListener('click', initGame);
    document.getElementById('playAgainBtn').addEventListener('click', initGame);
    
    // Запрещаем перетаскивание изображений
    document.addEventListener('dragstart', (e) => {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
        }
    });
}

// ============================================
// ЗАПУСК ИГРЫ
// ============================================
window.onload = function() {
    initGame();
    setupEventListeners();
    
    // Добавляем CSS для анимации пульсации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
            100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
        }
        
        @keyframes pop {
            0% { transform: scale(0); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(0); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
};
