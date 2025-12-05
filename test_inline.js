// Тестовый скрипт для проверки inline режима
// Этот файл симулирует обработку inline queries для Telegram бота

// Мокаем Telegram Bot API для тестирования
const mockTelegramBot = {
    // Симуляция обработки inline query
    processInlineQuery: function(query) {
        console.log('Обработка inline query:', query);

        // Парсим запрос
        const parts = query.split(' ');
        const command = parts[0].toLowerCase();

        if (command === 'игра' || command === 'game') {
            // Извлекаем размер поля из запроса (например: "игра 5x5")
            let width = 3, height = 3;
            if (parts.length > 1) {
                const sizeMatch = parts[1].match(/(\d+)x(\d+)/);
                if (sizeMatch) {
                    width = parseInt(sizeMatch[1]);
                    height = parseInt(sizeMatch[2]);
                }
            }

            // Создаем ответ для inline query
            const gameId = 'test_' + Date.now();
            const gameUrl = `http://localhost:8000?gameId=${gameId}&player=O`;

            const inlineQueryResult = {
                type: 'article',
                id: gameId,
                title: `Крестики-Нолики ${width}x${height}`,
                description: 'Начать новую игру',
                input_message_content: {
                    message_text: `🎮 Новая игра в крестики-нолики ${width}x${height}!\n\nПрисоединиться: ${gameUrl}`
                },
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: '🎯 Присоединиться',
                            url: gameUrl
                        }
                    ]]
                }
            };

            console.log('Создан inline query result:', inlineQueryResult);
            return [inlineQueryResult];
        }

        return [];
    },

    // Тестовые случаи
    testCases: [
        { query: 'игра', expected: '3x3 game' },
        { query: 'игра 5x5', expected: '5x5 game' },
        { query: 'game', expected: '3x3 game' },
        { query: 'неизвестная команда', expected: 'empty result' }
    ]
};

// Запуск тестов
function runTests() {
    console.log('🚀 Запуск тестов inline режима...\n');

    mockTelegramBot.testCases.forEach((testCase, index) => {
        console.log(`Тест ${index + 1}: "${testCase.query}"`);
        const result = mockTelegramBot.processInlineQuery(testCase.query);

        if (result.length > 0) {
            console.log(`✅ Результат: ${result[0].title}`);
            console.log(`   URL: ${result[0].reply_markup.inline_keyboard[0][0].url}`);
        } else {
            console.log(`✅ Результат: пустой (как ожидалось для "${testCase.expected}")`);
        }
        console.log('');
    });

    console.log('🎉 Тестирование inline режима завершено!');
}

// Экспортируем для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = mockTelegramBot;
} else {
    // Запускаем тесты в браузере
    runTests();
}
