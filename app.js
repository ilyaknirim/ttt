document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    const statsElement = document.getElementById('stats');
    const shareBtn = document.getElementById('shareBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const widthSlider = document.getElementById('widthSlider');
    const heightSlider = document.getElementById('heightSlider');
    const widthValue = document.getElementById('widthValue');
    const heightValue = document.getElementById('heightValue');
    const startGameBtn = document.getElementById('startGameBtn');
    const sizeSelector = document.getElementById('sizeSelector');
    const gameContainer = document.getElementById('gameContainer');

    let board = [];
    let currentPlayer = 'X';
    let myPlayer = 'X'; // Default to X, will be set based on URL
    let gameActive = true;
    let stats = JSON.parse(localStorage.getItem('ticTacToeStats')) || { wins: 0, losses: 0, draws: 0 };
    let player1Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    let player2Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    while (player1Color === player2Color) {
        player2Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    }
    let myPlayerNumber = 1;
    let boardWidth = 3;
    let boardHeight = 3;
    let gameId = null;
    let gameRef = null;

    // Инициализация Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }

    // Обработчики для слайдеров
    widthSlider.addEventListener('input', () => {
        boardWidth = parseInt(widthSlider.value);
        widthValue.textContent = boardWidth;
    });

    heightSlider.addEventListener('input', () => {
        boardHeight = parseInt(heightSlider.value);
        heightValue.textContent = boardHeight;
    });

    // Функция для настройки слушателя Firebase
    function setupFirebaseListener() {
        if (!gameId) return;
        gameRef = window.firebaseRef(window.firebaseDatabase, 'games/' + gameId);
        window.firebaseOnValue(gameRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                board = data.board.split('');
                currentPlayer = data.currentPlayer;
                gameActive = data.gameActive;
                boardWidth = data.boardWidth || 3;
                boardHeight = data.boardHeight || 3;
                renderBoard();
                updateStatus();
            }
        });
    }

    // Функция для отправки состояния игры в Firebase
    function pushGameState() {
        if (!gameRef) return;
        window.firebaseSet(gameRef, {
            board: board.join(''),
            currentPlayer: currentPlayer,
            gameActive: gameActive,
            boardWidth: boardWidth,
            boardHeight: boardHeight
        });
    }

    // Начало игры
    startGameBtn.addEventListener('click', () => {
        sizeSelector.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        if (!gameId) {
            initBoard();
            updateStatus();
            gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            myPlayer = 'X';
            setupFirebaseListener();
            pushGameState();
        }
        // For existing game, Firebase listener will handle loading and rendering
    });

    // Загрузка состояния из URL
    function loadGameFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const gameIdParam = urlParams.get('gameId');
        const playerParam = urlParams.get('player');

        if (gameIdParam) {
            gameId = gameIdParam;
            myPlayer = playerParam || 'X';
            setupFirebaseListener();
        } else {
            myPlayer = 'X';
        }
        updateStatsDisplay();
    }

    // Сохранение состояния в URL
    function saveGameToURL() {
        const url = new URL(window.location);
        url.searchParams.set('board', board.join(''));
        url.searchParams.set('player', currentPlayer);
        window.history.replaceState(null, null, url);
    }

    // Инициализация доски
    function initBoard() {
        board = new Array(boardWidth * boardHeight).fill('');
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
        renderBoard();
    }

    // Рендер доски
    function renderBoard() {
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
        boardElement.innerHTML = '';
        board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            if (cell === 'X') {
                cellElement.style.backgroundColor = player1Color;
            } else if (cell === 'O') {
                cellElement.style.backgroundColor = player2Color;
            }
            cellElement.dataset.index = index;
            cellElement.addEventListener('click', handleCellClick);
            boardElement.appendChild(cellElement);
        });
    }

    // Обновление статуса
    function updateStatus() {
        if (!gameActive) {
            const winner = checkWinner();
            if (winner === 'Ничья!') {
                statusElement.innerHTML = `Игра окончена. Ничья!`;
            } else {
                const color = winner.split(' ')[0] === 'X' ? player1Color : player2Color;
                statusElement.innerHTML = `Игра окончена. <span style="display:inline-block;width:20px;height:20px;background-color:${color};border:1px solid #000;"></span> победил!`;
            }
        } else if (currentPlayer === myPlayer) {
            const color = currentPlayer === 'X' ? player1Color : player2Color;
            statusElement.innerHTML = `Ваш ход: <span style="display:inline-block;width:20px;height:20px;background-color:${color};border:1px solid #000;"></span>`;
        } else {
            const color = currentPlayer === 'X' ? player1Color : player2Color;
            statusElement.innerHTML = `Ожидание хода противника: <span style="display:inline-block;width:20px;height:20px;background-color:${color};border:1px solid #000;"></span>`;
        }
    }

    // Обновление отображения статистики
    function updateStatsDisplay() {
        statsElement.textContent = `Побед: ${stats.wins} | Поражений: ${stats.losses} | Ничьих: ${stats.draws}`;
    }

    // Обновление статистики
    function updateStats(winner) {
        if (winner === myPlayer) {
            stats.wins++;
        } else if (winner && winner !== myPlayer) {
            stats.losses++;
        } else if (winner === 'Ничья!') {
            stats.draws++;
        }
        localStorage.setItem('ticTacToeStats', JSON.stringify(stats));
        updateStatsDisplay();
    }

    // Обработка клика по клетке
    function handleCellClick(event) {
        const index = event.target.dataset.index;
        if (board[index] !== '' || !gameActive || currentPlayer !== myPlayer) return;

        board[index] = currentPlayer;
        let winner = checkWinner();
        if (winner) {
            gameActive = false;
            updateStats(winner.split(' ')[0]); // 'X' or 'O' or 'Ничья!'
        } else if (board.every(cell => cell !== '')) {
            gameActive = false;
            updateStats('Ничья!');
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        }
        renderBoard();
        updateStatus();
        pushGameState();
    }

    // Проверка победителя
    function checkWinner() {
        const winPatterns = [];

        // Rows
        for (let i = 0; i < boardHeight; i++) {
            for (let j = 0; j <= boardWidth - 3; j++) {
                winPatterns.push([i * boardWidth + j, i * boardWidth + j + 1, i * boardWidth + j + 2]);
            }
        }

        // Columns
        for (let j = 0; j < boardWidth; j++) {
            for (let i = 0; i <= boardHeight - 3; i++) {
                winPatterns.push([i * boardWidth + j, (i + 1) * boardWidth + j, (i + 2) * boardWidth + j]);
            }
        }

        // Main diagonals
        for (let i = 0; i <= boardHeight - 3; i++) {
            for (let j = 0; j <= boardWidth - 3; j++) {
                winPatterns.push([i * boardWidth + j, (i + 1) * boardWidth + j + 1, (i + 2) * boardWidth + j + 2]);
            }
        }

        // Anti-diagonals
        for (let i = 0; i <= boardHeight - 3; i++) {
            for (let j = 2; j < boardWidth; j++) {
                winPatterns.push([i * boardWidth + j, (i + 1) * boardWidth + j - 1, (i + 2) * boardWidth + j - 2]);
            }
        }

        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return `${board[a]} победил!`;
            }
        }

        if (board.every(cell => cell !== '')) {
            return 'Ничья!';
        }

        return null;
    }

    // Поделиться игрой
    shareBtn.addEventListener('click', () => {
        const shareUrl = new URL(window.location);
        shareUrl.searchParams.set('gameId', gameId);
        shareUrl.searchParams.set('player', myPlayer === 'X' ? 'O' : 'X');
        const url = shareUrl.href;
        if (navigator.share) {
            navigator.share({
                title: 'Крестики-Нолики',
                text: 'Давай сыграем в крестики-нолики!',
                url: url
            });
        } else {
            navigator.clipboard.writeText(url).then(() => {
                alert('Ссылка скопирована в буфер обмена!');
            });
        }
    });

    // Новая игра
    newGameBtn.addEventListener('click', () => {
        board = new Array(boardWidth * boardHeight).fill('');
        currentPlayer = 'X';
        gameActive = true;
        renderBoard();
        updateStatus();
        pushGameState();
    });

    loadGameFromURL();
});
