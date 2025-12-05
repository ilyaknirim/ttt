document.addEventListener('DOMContentLoaded', () => {
    // Получаем все необходимые DOM элементы
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

    // Инициализация переменных состояния игры
    let board = [];
    let currentPlayer = 'X';
    let myPlayer = 'X'; // По умолчанию X, будет установлен на основе URL
    let gameActive = true;
    let stats = JSON.parse(localStorage.getItem('ticTacToeStats')) || { wins: 0, losses: 0, draws: 0 };

    // Генерируем цвета для игроков
    let player1Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    let player2Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    // Убедимся, что цвета не совпадают
    while (player1Color === player2Color) {
        player2Color = '#' + Math.floor(Math.random()*16777215).toString(16);
    }

    let myPlayerNumber = 1;
    let boardWidth = 3;
    let boardHeight = 3;
    let gameId = null;
    let gameRef = null;

    // Функция для отображения ошибок
    function showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        errorElement.style.position = 'fixed';
        errorElement.style.top = '20px';
        errorElement.style.left = '50%';
        errorElement.style.transform = 'translateX(-50%)';
        errorElement.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        errorElement.style.color = 'white';
        errorElement.style.padding = '10px 20px';
        errorElement.style.borderRadius = '5px';
        errorElement.style.zIndex = '1000';

        document.body.appendChild(errorElement);

        // Автоматически удаляем сообщение через 3 секунды
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.parentNode.removeChild(errorElement);
            }
        }, 3000);
    }

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

        try {
            gameRef = window.firebaseRef(window.firebaseDatabase, 'games/' + gameId);
            window.firebaseOnValue(gameRef, (snapshot) => {
                try {
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
                } catch (error) {
                    console.error('Ошибка при обработке данных из Firebase:', error);
                    showError('Не удалось загрузить состояние игры. Пожалуйста, обновите страницу.');
                }
            }, (error) => {
                console.error('Ошибка Firebase:', error);
                showError('Ошибка подключения к серверу. Проверьте подключение к интернету.');
            });
        } catch (error) {
            console.error('Ошибка при настройке Firebase:', error);
            showError('Не удалось настроить синхронизацию игры.');
        }
    }

    // Функция для отправки состояния игры в Firebase
    function pushGameState() {
        if (!gameRef) return;

        try {
            window.firebaseSet(gameRef, {
                board: board.join(''),
                currentPlayer: currentPlayer,
                gameActive: gameActive,
                boardWidth: boardWidth,
                boardHeight: boardHeight
            }).catch(error => {
                console.error('Ошибка при сохранении состояния игры:', error);
                showError('Не удалось сохранить ход. Попробуйте еще раз.');
            });
        } catch (error) {
            console.error('Ошибка при отправке данных в Firebase:', error);
            showError('Ошибка при отправке данных. Проверьте подключение к интернету.');
        }
    }

    // Начало игры с улучшенной обработкой
    startGameBtn.addEventListener('click', () => {
        try {
            // Показываем игровое поле
            sizeSelector.classList.add('hidden');
            gameContainer.classList.remove('hidden');

            // Показываем индикатор загрузки
            statusElement.innerHTML = '<div class="status-content"><div class="status-icon">⏳</div><div class="status-text">Создание игры...</div></div>';

            // Если это не присоединение к существующей игре
            if (!gameId) {
                // Инициализируем игровое поле
                initBoard();

                // Создаем уникальный ID игры
                gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                myPlayer = 'X';

                // Настраиваем Firebase
                setupFirebaseListener();

                // Отправляем начальное состояние
                pushGameState();

                // Обновляем статус
                updateStatus();

                // Сохраняем состояние в URL
                saveGameToURL();
            }
            // Для существующей игры слушатель Firebase обработает загрузку и рендеринг
        } catch (error) {
            console.error('Ошибка при начале игры:', error);
            showError('Не удалось начать игру. Попробуйте еще раз.');

            // Возвращаемся к выбору размера поля
            sizeSelector.classList.remove('hidden');
            gameContainer.classList.add('hidden');
        }
    });

    // Загрузка состояния из URL с улучшенной обработкой ошибок
    function loadGameFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const gameIdParam = urlParams.get('gameId');
            const playerParam = urlParams.get('player');
            const boardParam = urlParams.get('board'); // Для поддержки старых ссылок

            // Проверяем, есть ли параметр gameId (новый формат)
            if (gameIdParam) {
                gameId = gameIdParam;
                myPlayer = playerParam || 'O'; // По умолчанию второй игрок, если явно не указано

                // Показываем индикатор загрузки
                statusElement.innerHTML = '<div class="status-content"><div class="status-icon">⏳</div><div class="status-text">Загрузка игры...</div></div>';

                // Настраиваем слушатель Firebase
                setupFirebaseListener();

                // Показываем игровое поле
                sizeSelector.classList.add('hidden');
                gameContainer.classList.remove('hidden');
            } 
            // Поддержка старого формата (только состояние доски)
            else if (boardParam) {
                // Конвертируем строку состояния доски в массив
                board = boardParam.split('');

                // Определяем размеры доски на основе длины массива
                const boardSize = Math.sqrt(board.length);
                if (boardSize === Math.floor(boardSize)) {
                    boardWidth = boardHeight = boardSize;
                } else {
                    // Если не квадратное поле, пробуем определить размеры
                    for (let h = 3; h <= 10; h++) {
                        if (board.length % h === 0) {
                            boardHeight = h;
                            boardWidth = board.length / h;
                            break;
                        }
                    }
                }

                // Устанавливаем текущего игрока из URL
                currentPlayer = playerParam || 'X';
                myPlayer = currentPlayer;

                // Показываем игровое поле
                sizeSelector.classList.add('hidden');
                gameContainer.classList.remove('hidden');

                // Рендерим доску и обновляем статус
                initBoard();
                updateStatus();
            } 
            // Если нет параметров, начинаем новую игру
            else {
                myPlayer = 'X';
            }

            updateStatsDisplay();
        } catch (error) {
            console.error('Ошибка при загрузке игры из URL:', error);
            showError('Не удалось загрузить игру. Начинается новая игра.');

            // Начинаем новую игру в случае ошибки
            myPlayer = 'X';
            updateStatsDisplay();
        }
    }

    // Сохранение состояния игры (в URL или Firebase)
    function saveGameToURL() {
        // Если игра синхронизируется через Firebase, не используем URL для состояния доски
        if (gameId) {
            const url = new URL(window.location);
            // Очищаем параметры состояния доски, так как они хранятся в Firebase
            url.searchParams.delete('board');
            // Сохраняем только ID игры и игрока
            url.searchParams.set('gameId', gameId);
            url.searchParams.set('player', myPlayer);
            window.history.replaceState(null, null, url);
        } else {
            // Для локальной игры сохраняем состояние в URL
            const url = new URL(window.location);
            url.searchParams.set('board', board.join(''));
            url.searchParams.set('player', currentPlayer);
            url.searchParams.set('width', boardWidth);
            url.searchParams.set('height', boardHeight);
            window.history.replaceState(null, null, url);
        }
    }

    // Инициализация доски
    function initBoard() {
        board = new Array(boardWidth * boardHeight).fill('');
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
        renderBoard();
    }

    // Рендер доски с анимацией
    function renderBoard() {
        boardElement.style.gridTemplateColumns = `repeat(${boardWidth}, 1fr)`;
        boardElement.style.gridTemplateRows = `repeat(${boardHeight}, 1fr)`;
        boardElement.innerHTML = '';

        board.forEach((cell, index) => {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');

            // Добавляем цвет фона в зависимости от игрока
            if (cell === 'X') {
                cellElement.style.backgroundColor = player1Color;
                // Добавляем контент X с анимацией
                cellElement.innerHTML = '<span class="cell-content">X</span>';
            } else if (cell === 'O') {
                cellElement.style.backgroundColor = player2Color;
                // Добавляем контент O с анимацией
                cellElement.innerHTML = '<span class="cell-content">O</span>';
            }

            // Добавляем индекс для обработки кликов
            cellElement.dataset.index = index;

            // Добавляем обработчик клика
            cellElement.addEventListener('click', handleCellClick);

            // Добавляем анимацию появления
            setTimeout(() => {
                cellElement.classList.add('cell-visible');
            }, index * 30);

            boardElement.appendChild(cellElement);
        });
    }

    // Обновление статуса с улучшенным оформлением и анимациями
    function updateStatus() {
        // Добавляем анимацию обновления статуса
        statusElement.classList.add('status-updating');
        setTimeout(() => {
            statusElement.classList.remove('status-updating');
        }, 300);

        if (!gameActive) {
            const winner = checkWinner();
            if (winner === 'Ничья!') {
                statusElement.innerHTML = `<div class="status-content">
                    <div class="status-icon">🤝</div>
                    <div class="status-text">Игра окончена. Ничья!</div>
                </div>`;
            } else {
                const winnerSymbol = winner.split(' ')[0];
                const color = winnerSymbol === 'X' ? player1Color : player2Color;
                const isMyWin = winnerSymbol === myPlayer;

                statusElement.innerHTML = `<div class="status-content">
                    <div class="status-icon">${isMyWin ? '🎉' : '😔'}</div>
                    <div class="status-text">Игра окончена. <span class="player-indicator" style="background-color:${color};">${winnerSymbol}</span> ${isMyWin ? 'победили!' : 'победил!'}</div>
                </div>`;

                // Добавляем класс для анимации победы/поражения
                statusElement.classList.add(isMyWin ? 'status-win' : 'status-lose');
            }
        } else if (currentPlayer === myPlayer) {
            const color = currentPlayer === 'X' ? player1Color : player2Color;
            statusElement.innerHTML = `<div class="status-content">
                <div class="status-icon">👆</div>
                <div class="status-text">Ваш ход: <span class="player-indicator" style="background-color:${color};">${currentPlayer}</span></div>
            </div>`;

            statusElement.classList.add('status-my-turn');
        } else {
            const color = currentPlayer === 'X' ? player1Color : player2Color;
            statusElement.innerHTML = `<div class="status-content">
                <div class="status-icon">⏳</div>
                <div class="status-text">Ожидание хода противника: <span class="player-indicator" style="background-color:${color};">${currentPlayer}</span></div>
            </div>`;

            statusElement.classList.add('status-waiting');
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

    // Обработка клика по клетке с визуальной обратной связью
    function handleCellClick(event) {
        const index = event.target.dataset.index;
        const cellElement = event.target.closest('.cell');

        // Проверяем, можно ли сделать ход
        if (board[index] !== '' || !gameActive || currentPlayer !== myPlayer) {
            // Если ход невозможен, добавляем эффект "вибрации"
            if (cellElement) {
                cellElement.classList.add('cell-shake');
                setTimeout(() => {
                    cellElement.classList.remove('cell-shake');
                }, 500);
            }
            return;
        }

        // Делаем ход
        board[index] = currentPlayer;

        // Добавляем анимацию хода
        if (cellElement) {
            cellElement.classList.add('cell-move');
            setTimeout(() => {
                cellElement.classList.remove('cell-move');
            }, 500);
        }

        // Проверяем результат хода
        let winner = checkWinner();
        if (winner) {
            gameActive = false;
            updateStats(winner.split(' ')[0]); // 'X' or 'O' or 'Ничья!'

            // Добавляем анимацию победы
            if (winner !== 'Ничья!') {
                highlightWinningCells(winner.split(' ')[0]);
            }
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

    // Функция для подсветки выигрышных клеток
    function highlightWinningCells(winner) {
        // Здесь можно добавить логику для определения выигрышных комбинаций
        // и подсветки соответствующих клеток
        boardElement.classList.add('win-animation');
        setTimeout(() => {
            boardElement.classList.remove('win-animation');
        }, 2000);
    }

    // Проверка победителя - оптимизированная версия
    function checkWinner() {
        // Быстрая проверка для стандартного поля 3x3
        if (boardWidth === 3 && boardHeight === 3) {
            // Проверка строк
            for (let i = 0; i < 3; i++) {
                if (board[i * 3] && board[i * 3] === board[i * 3 + 1] && board[i * 3] === board[i * 3 + 2]) {
                    return `${board[i * 3]} победил!`;
                }
            }

            // Проверка столбцов
            for (let i = 0; i < 3; i++) {
                if (board[i] && board[i] === board[i + 3] && board[i] === board[i + 6]) {
                    return `${board[i]} победил!`;
                }
            }

            // Проверка диагоналей
            if (board[0] && board[0] === board[4] && board[0] === board[8]) {
                return `${board[0]} победил!`;
            }
            if (board[2] && board[2] === board[4] && board[2] === board[6]) {
                return `${board[2]} победил!`;
            }
        } else {
            // Общая проверка для полей любого размера
            // Проверка строк
            for (let i = 0; i < boardHeight; i++) {
                for (let j = 0; j <= boardWidth - 3; j++) {
                    const index = i * boardWidth + j;
                    if (board[index] && board[index] === board[index + 1] && board[index] === board[index + 2]) {
                        return `${board[index]} победил!`;
                    }
                }
            }

            // Проверка столбцов
            for (let j = 0; j < boardWidth; j++) {
                for (let i = 0; i <= boardHeight - 3; i++) {
                    const index = i * boardWidth + j;
                    if (board[index] && board[index] === board[index + boardWidth] && board[index] === board[index + boardWidth * 2]) {
                        return `${board[index]} победил!`;
                    }
                }
            }

            // Проверка диагоналей (слева-направо)
            for (let i = 0; i <= boardHeight - 3; i++) {
                for (let j = 0; j <= boardWidth - 3; j++) {
                    const index = i * boardWidth + j;
                    if (board[index] && board[index] === board[index + boardWidth + 1] && board[index] === board[index + boardWidth * 2 + 2]) {
                        return `${board[index]} победил!`;
                    }
                }
            }

            // Проверка диагоналей (справа-налево)
            for (let i = 0; i <= boardHeight - 3; i++) {
                for (let j = 2; j < boardWidth; j++) {
                    const index = i * boardWidth + j;
                    if (board[index] && board[index] === board[index + boardWidth - 1] && board[index] === board[index + boardWidth * 2 - 2]) {
                        return `${board[index]} победил!`;
                    }
                }
            }
        }

        // Проверка на ничью
        if (board.every(cell => cell !== '')) {
            return 'Ничья!';
        }

        return null;
    }

    // Поделиться игрой с улучшенной обработкой
    shareBtn.addEventListener('click', () => {
        try {
            // Показываем индикатор загрузки
            statusElement.innerHTML = '<div class="status-content"><div class="status-icon">⏳</div><div class="status-text">Создание ссылки...</div></div>';

            // Создаем URL для обмена
            const shareUrl = new URL(window.location);

            // Если игра синхронизируется через Firebase
            if (gameId) {
                shareUrl.searchParams.set('gameId', gameId);
                shareUrl.searchParams.set('player', myPlayer === 'X' ? 'O' : 'X');
            } 
            // Для локальной игры
            else {
                shareUrl.searchParams.set('board', board.join(''));
                shareUrl.searchParams.set('player', currentPlayer);
                shareUrl.searchParams.set('width', boardWidth);
                shareUrl.searchParams.set('height', boardHeight);
            }

            const url = shareUrl.href;

            // Пытаемся использовать Web Share API
            if (navigator.share) {
                navigator.share({
                    title: 'Крестики-Нолики',
                    text: 'Давай сыграем в крестики-нолики!',
                    url: url
                }).catch(error => {
                    console.error('Ошибка при попытке поделиться:', error);
                    // Если Web Share API не сработал, пробуем скопировать в буфер обмена
                    fallbackCopy(url);
                });
            } else {
                // Запасной вариант - копирование в буфер обмена
                fallbackCopy(url);
            }

            // Функция для копирования в буфер обмена
            function fallbackCopy(url) {
                navigator.clipboard.writeText(url).then(() => {
                    statusElement.innerHTML = '<div class="status-content"><div class="status-icon">✅</div><div class="status-text">Ссылка скопирована в буфер обмена!</div></div>';

                    // Возвращаем обычный статус через 2 секунды
                    setTimeout(() => {
                        updateStatus();
                    }, 2000);
                }).catch(error => {
                    console.error('Ошибка при копировании в буфер обмена:', error);
                    showError('Не удалось скопировать ссылку. Пожалуйста, скопируйте ее вручную: ' + url);
                });
            }
        } catch (error) {
            console.error('Ошибка при создании ссылки для обмена:', error);
            showError('Не удалось создать ссылку для обмена. Попробуйте еще раз.');
            updateStatus();
        }
    });

    // Новая игра с улучшенной обработкой
    newGameBtn.addEventListener('click', () => {
        try {
            // Показываем индикатор загрузки
            statusElement.innerHTML = '<div class="status-content"><div class="status-icon">⏳</div><div class="status-text">Сброс игры...</div></div>';

            // Сбрасываем состояние игры
            board = new Array(boardWidth * boardHeight).fill('');
            currentPlayer = 'X';
            gameActive = true;

            // Если игра была синхронизирована через Firebase, создаем новую игру
            if (gameId) {
                // Создаем новый ID игры
                gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                myPlayer = 'X';

                // Настраиваем новый слушатель Firebase
                setupFirebaseListener();

                // Отправляем начальное состояние
                pushGameState();

                // Обновляем URL
                saveGameToURL();
            }

            // Рендерим доску и обновляем статус
            renderBoard();
            updateStatus();
        } catch (error) {
            console.error('Ошибка при сбросе игры:', error);
            showError('Не удалось начать новую игру. Попробуйте обновить страницу.');
        }
    });

    loadGameFromURL();
});
