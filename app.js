document.addEventListener('DOMContentLoaded', () => {
    const boardElement = document.getElementById('board');
    const statusElement = document.getElementById('status');
    const shareBtn = document.getElementById('shareBtn');
    const newGameBtn = document.getElementById('newGameBtn');

    let board = ['', '', '', '', '', '', '', '', ''];
    let currentPlayer = 'X';
    let myPlayer = 'X'; // Default to X, will be set based on URL
    let gameActive = true;

    // Инициализация Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }

    // Загрузка состояния из URL
    function loadGameFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const boardParam = urlParams.get('board');
        const playerParam = urlParams.get('player');

        if (boardParam) {
            board = boardParam.split('');
        }
        if (playerParam) {
            currentPlayer = playerParam;
            myPlayer = playerParam; // Second player
        } else {
            myPlayer = 'X'; // First player
        }
        renderBoard();
        updateStatus();
    }

    // Сохранение состояния в URL
    function saveGameToURL() {
        const url = new URL(window.location);
        url.searchParams.set('board', board.join(''));
        url.searchParams.set('player', currentPlayer);
        window.history.replaceState(null, null, url);
    }

    // Рендер доски
    function renderBoard() {
        boardElement.innerHTML = '';
        board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.textContent = cell;
            cellElement.dataset.index = index;
            cellElement.addEventListener('click', handleCellClick);
            boardElement.appendChild(cellElement);
        });
    }

    // Обновление статуса
    function updateStatus() {
        if (!gameActive) {
            statusElement.textContent = `Игра окончена. ${checkWinner()}`;
        } else if (currentPlayer === myPlayer) {
            statusElement.textContent = `Ваш ход: ${currentPlayer}`;
        } else {
            statusElement.textContent = `Ожидание хода противника: ${currentPlayer}`;
        }
    }

    // Обработка клика по клетке
    function handleCellClick(event) {
        const index = event.target.dataset.index;
        if (board[index] !== '' || !gameActive || currentPlayer !== myPlayer) return;

        board[index] = currentPlayer;
        if (checkWinner()) {
            gameActive = false;
        } else if (board.every(cell => cell !== '')) {
            gameActive = false;
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        }
        renderBoard();
        updateStatus();
        saveGameToURL();
    }

    // Проверка победителя
    function checkWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

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
        if (!shareUrl.searchParams.has('player')) {
            shareUrl.searchParams.set('player', 'O');
        } else {
            shareUrl.searchParams.set('player', currentPlayer);
        }
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
        board = ['', '', '', '', '', '', '', '', ''];
        currentPlayer = 'X';
        gameActive = true;
        renderBoard();
        updateStatus();
        saveGameToURL();
    });

    loadGameFromURL();
});
