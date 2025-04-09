// Константы
const THEMES = {
    dark: {
        name: 'theme-dark',
        icon: 'fas fa-sun'
    },
    light: {
        name: 'theme-light',
        icon: 'fas fa-moon'
    }
};

const EMOJI_CATEGORIES = {
    smileys: ["😀", "😁", "😂", "🤣", "😃", "😄", "😅", "😆", "😉", "😊", "😋", "😎", "😍", "🥰", "😘"],
    people: ["👋", "👌", "👍", "👎", "👏", "🙌", "🙏", "🤝", "💪", "🧠", "👨", "👩", "👶", "👦", "👧"],
    animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"],
    food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝"],
    travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🚲", "🛴"]
};

// Глобальные переменные
let currentTheme = 'dark';
let chatHistory = [];
let currentChatId = null;
let savedChats = [];
let activeContextMenu = null;
let activeDropdown = null;
let isListening = false;
let recognition = null;
let synth = window.speechSynthesis;

// Инициализация распознавания речи
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = false;
}

// DOM элементы
const elements = {
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    voiceBtn: document.getElementById('voice-btn'),
    chatMessages: document.getElementById('chat-messages'),
    newChatBtn: document.getElementById('new-chat-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    settingsBtn: document.getElementById('settings-btn'),
    emojiBtn: document.getElementById('emoji-btn'),
    attachBtn: document.getElementById('attach-btn'),
    chatList: document.getElementById('chat-list'),
    
    // Модальные окна
    settingsModal: document.getElementById('settings-modal'),
    saveDialog: document.getElementById('save-dialog'),
    emojiPicker: document.getElementById('emoji-picker'),
    fileMenu: document.getElementById('file-menu'),
    contextMenu: document.getElementById('context-menu'),
    
    // Кнопки в модальных окнах
    saveSettingsBtn: document.getElementById('save-settings'),
    resetSettingsBtn: document.getElementById('reset-settings'),
    confirmSaveBtn: document.getElementById('confirm-save'),
    cancelSaveBtn: document.getElementById('cancel-save'),
    chatNameInput: document.getElementById('chat-name-input'),
    fileInput: document.getElementById('file-input')
};

// Инициализация приложения
function initApp() {
    // Загрузка настроек
    loadSettings();
    
    // Загрузка сохраненных чатов
    loadSavedChats();
    
    // Приветственное сообщение
    addBotMessage(`👋 Добро пожаловать! Я ваш AI ассистент. Чем я могу помочь сегодня?

Я умею:
• Отвечать на вопросы
• Открывать сайты (браузер, YouTube)
• Показывать время и дату
• Рассказывать анекдоты
• Искать информацию в Википедии
• Устанавливать таймеры
• Проверять погоду
• Выполнять простые вычисления
• Искать информацию в интернете
• Показывать последние новости`);
    
    // Инициализация обработчиков событий
    setupEventListeners();
    
    // Инициализация эмодзи пикера
    initEmojiPicker();
}

// Обработчики событий
function setupEventListeners() {
    // Отправка сообщения
    elements.sendBtn.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Голосовой ввод
    elements.voiceBtn.addEventListener('click', toggleVoiceInput);
    
    // Новый чат
    elements.newChatBtn.addEventListener('click', createNewChat);
    
    // Смена темы
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Настройки
    elements.settingsBtn.addEventListener('click', () => toggleModal(elements.settingsModal));
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
    elements.resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Сохранение чата
    elements.confirmSaveBtn.addEventListener('click', saveChat);
    elements.cancelSaveBtn.addEventListener('click', () => toggleModal(elements.saveDialog));
    
    // Эмодзи
    elements.emojiBtn.addEventListener('click', () => toggleDropdown(elements.emojiPicker));
    
    // Прикрепление файлов
    elements.attachBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(elements.fileMenu, e.target);
    });
    
    // Загрузка файлов
    document.querySelectorAll('#file-menu .menu-item').forEach(item => {
        item.addEventListener('click', handleFileAction);
    });
    
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // Закрытие модальных окон
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            toggleModal(modal, false);
        });
    });
    
    // Закрытие выпадающих меню при клике вне них
    document.addEventListener('click', (e) => {
        if (activeDropdown && !activeDropdown.contains(e.target) && 
            !e.target.closest('.action-btn')) {
            toggleDropdown(activeDropdown, null, false);
        }
        
        if (activeContextMenu) {
            toggleDropdown(activeContextMenu, null, false);
        }
    });
    
    // Обработка распознавания речи
    if (recognition) {
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.messageInput.value = transcript;
            sendMessage();
        };
        
        recognition.onend = () => {
            isListening = false;
            elements.voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            elements.voiceBtn.classList.remove('listening');
        };
    }
}

// Функции для работы с сообщениями
function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message) return;
    
    // Добавляем сообщение пользователя
    addUserMessage(message);
    
    // Очищаем поле ввода
    elements.messageInput.value = '';
    
    // Обрабатываем сообщение
    processMessage(message);
}

function addUserMessage(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageHtml = `
        <div class="message user">
            <img src="user-avatar.png" alt="User" class="message-avatar">
            <div class="message-content">
                <div class="message-sender">Пользователь</div>
                <div class="message-text">${text}</div>
                <div class="message-time">${time}</div>
            </div>
        </div>
    `;
    
    elements.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
    scrollToBottom();
    
    // Добавляем в историю
    chatHistory.push({
        sender: 'user',
        text: text,
        time: time
    });
}

function addBotMessage(text) {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Создаем контейнер для сообщения
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant';
    
    // Добавляем временное сообщение о загрузке
    messageDiv.innerHTML = `
        <img src="bot-avatar.png" alt="Assistant" class="message-avatar">
        <div class="message-content">
            <div class="message-sender">Ассистент</div>
            <div class="message-text">⏳ Генерирую ответ...</div>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    // Имитируем задержку для эффекта печатания
    setTimeout(() => {
        // Форматируем текст с помощью marked.js для поддержки markdown
        const formattedText = marked.parse(text);
        
        // Обновляем содержимое сообщения
        messageDiv.innerHTML = `
            <img src="bot-avatar.png" alt="Assistant" class="message-avatar">
            <div class="message-content">
                <div class="message-sender">Ассистент</div>
                <div class="message-text">${formattedText}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        scrollToBottom();
        
        // Озвучиваем сообщение, если включено
        if (getSetting('voiceEnabled')) {
            speakText(text);
        }
    }, 500);
    
    // Добавляем в историю
    chatHistory.push({
        sender: 'assistant',
        text: text,
        time: time
    });
}

function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Обработка сообщений
function processMessage(text) {
    const textLower = text.toLowerCase();
    
    // Проверяем простые команды
    if (containsAny(textLower, ["привет", "здравствуй", "добрый день", "здорова"])) {
        const responses = [
            "Привет! 👋 Чем могу помочь сегодня?",
            "Здравствуйте! 😊 Рад вас видеть снова!",
            "Приветствую! 🌟 Как я могу быть полезен?"
        ];
        addBotMessage(randomChoice(responses));
    }
    else if (containsAny(textLower, ["как дела", "как ты", "как твои дела"])) {
        const responses = [
            "У меня всё отлично, спасибо! 💯 А у вас?",
            "Работаю без сбоев! 🤖 Готов помогать вам!",
            "Прекрасно! 🌈 Всегда рад общению с вами!"
        ];
        addBotMessage(randomChoice(responses));
    }
    else if (containsAny(textLower, ["открой браузер", "запусти браузер"])) {
        window.open("https://www.google.com", "_blank");
        addBotMessage("Открываю браузер. 🌐");
    }
    else if (containsAny(textLower, ["открой youtube", "запусти youtube"])) {
        window.open("https://www.youtube.com", "_blank");
        addBotMessage("Открываю YouTube. 📺");
    }
    else if (containsAny(textLower, ["открой вк", "открой вконтакте"])) {
        window.open("https://vk.com", "_blank");
        addBotMessage("Открываю ВКонтакте. 💬");
    }
    else if (textLower.includes("спасибо")) {
        const responses = [
            "Всегда пожалуйста! 😊",
            "Рад быть полезным! 🙏",
            "Не за что! 👍 Обращайтесь еще!"
        ];
        addBotMessage(randomChoice(responses));
    }
    else if (textLower.includes("погода")) {
        getWeather(text).then(response => {
            addBotMessage(response);
        });
    }
    else if (textLower.includes("время") || textLower.includes("который час")) {
        const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        addBotMessage(`Сейчас ${currentTime}. ⏰`);
    }
    else if (textLower.includes("дата") || textLower.includes("какой сегодня день") || textLower.includes("число")) {
        const currentDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
        addBotMessage(`Сегодня ${currentDate}. 📅`);
    }
    else if (textLower.includes("анекдот") || textLower.includes("шутка") || textLower.includes("шутку")) {
        addBotMessage(`Вот анекдот: ${tellJoke()} 😄`);
    }
    else if (textLower.includes("поиск") || textLower.includes("найди") || textLower.includes("загугли")) {
        const query = text.replace(/поиск|найди|загугли/i, '').trim();
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
        addBotMessage(`Ищу в интернете: ${query} 🔍`);
    }
    else if (textLower.includes("новости") || textLower.includes("что нового")) {
        getNews().then(response => {
            addBotMessage(response);
        });
    }
    else if (containsAny(textLower, ["пока", "до свидания", "до встречи"])) {
        const responses = [
            "До свидания! 👋 Буду ждать нашей следующей беседы!",
            "Пока-пока! 😊 Хорошего дня!",
            "До встречи! 🌟 Обращайтесь, если понадобится помощь!"
        ];
        addBotMessage(randomChoice(responses));
    }
    else {
        // Для более сложных запросов используем API Gemini
        if (containsAny(textLower, ["напиши код", "написать программу", "код для", "скрипт для", "функция для", "класс для", "исправь ошибку в коде", "объясни", "расскажи", "что такое", "как работает", "почему", "зачем", "каким образом", "сделай анализ", "сравни", "нарисуй таблицу", "расскажи подробно", "объясни", "в чем заключалась", "суть", "намалюй таблицю", "кто ты", "зачем ты создан", "что ты умеешь", "помощник ты тут", "сделай анализ моей системы", "вруби телеграмм", "що таке", "у якому", "як", "коли", "який", "хто", "які", "що", "для якого", "яких", "чим", "чого"])) {
            askGemini(text).then(response => {
                addBotMessage(response);
            });
        } else {
            const responses = [
                "Я вас понял, но пока не знаю, как ответить на это. 🤔 Попробуйте уточнить запрос.",
                "Интересно! 🧐 Но мне нужно больше информации. Можете переформулировать?",
                "Хмм, давайте обсудим это подробнее. 💭 Что именно вы хотите узнать?",
                "Я постоянно учусь! 📚 Пока не могу ответить на этот запрос, но скоро научусь."
            ];
            addBotMessage(randomChoice(responses));
        }
    }
}

// Вспомогательные функции
function containsAny(str, items) {
    return items.some(item => str.includes(item));
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// API функции
async function getWeather(text) {
    try {
        // Извлекаем город из запроса
        let city = "Москва";  // город по умолчанию
        const words = text.toLowerCase().split(' ');
        const inIndex = words.indexOf('в');
        if (inIndex !== -1 && inIndex + 1 < words.length) {
            city = words[inIndex + 1];
            city = city.charAt(0).toUpperCase() + city.slice(1);
        }
        
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=YOUR_API_KEY&units=metric&lang=ru`);
        
        if (!response.ok) {
            return `Не удалось получить данные о погоде для ${city}.`;
        }
        
        const data = await response.json();
        const temp = Math.round(data.main.temp);
        const description = data.weather[0].description;
        
        return `Погода в ${city}: ${description}, ${temp}°C`;
    } catch (error) {
        return "Извините, не удалось получить информацию о погоде.";
    }
}

async function getNews() {
    try {
        const newsApiKey = getSetting('newsApiKey') || '975d803806a4439b948a5a2d81ac6086';
        const response = await fetch(`https://newsapi.org/v2/top-headlines?country=ru&apiKey=${newsApiKey}`);
        
        if (!response.ok) {
            return "Сервис новостей временно недоступен. Попробуйте позже.";
        }
        
        const data = await response.json();
        if (data.status === "ok" && data.articles && data.articles.length > 0) {
            const articles = data.articles.slice(0, 5);
            
            let newsText = "Вот последние новости:\n\n";
            articles.forEach((article, i) => {
                newsText += `${i+1}. ${article.title}\n`;
            });
            
            return newsText;
        } else {
            return "Не удалось получить новости. Попробуйте позже.";
        }
    } catch (error) {
        return "Для получения новостей требуется API ключ от newsapi.org";
    }
}

async function askGemini(query) {
    try {
        const geminiApiKey = getSetting('geminiApiKey') || 'AIzaSyD6OqXPs1Iclo1iX9aTW8fgmfkBP85lj_c';
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: query
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            return "Не удалось получить ответ. Попробуйте переформулировать вопрос.";
        }
        
        const data = await response.json();
        
        if (data.candidates && data.candidates.length > 0 && 
            data.candidates[0].content && data.candidates[0].content.parts && 
            data.candidates[0].content.parts.length > 0) {
            
            let answer = data.candidates[0].content.parts[0].text;
            
            // Убираем упоминания о Gemini
            answer = answer.replace(/Gemini/g, "Помощник");
            answer = answer.replace(/gemini/g, "помощник");
            answer = answer.replace(/Google/g, "ебланов");
            answer = answer.replace(/As an AI/g, "Как помощник");
            answer = answer.replace(/as an AI/g, "как помощник");
            answer = answer.replace(/AI assistant/g, "помощник");
            answer = answer.replace(/AI language model/g, "помощник");
            
            return answer;
        } else {
            return "Не удалось получить ответ. Попробуйте переформулировать вопрос.";
        }
    } catch (error) {
        return `Ошибка при обращении к расширенным возможностям: ${error.message}`;
    }
}

function tellJoke() {
    const jokes = [
        "Программист звонит в библиотеку: — Здравствуйте, скажите, у вас есть книги по Паскалю? — Нет, у нас только техническая литература.",
        "Почему программисты путают Хэллоуин и Рождество? Потому что 31 OCT = 25 DEC.",
        "Заходят как-то 0 и 1 в бар. Бармен говорит: «Извините, мы не обслуживаем двоичных.»",
        "Что сказал один программист другому? — У тебя рубашка с багом.",
        "Как программисты развлекаются на вечеринках? — Байтами.",
        "Почему у программистов все хорошо получается? — Потому что они следуют инструкциям.",
        "Я бы рассказал шутку про рекурсию, но сначала я бы рассказал шутку про рекурсию.",
        "Жена программиста отправила его в магазин: — Купи буханку хлеба, а если будут яйца, возьми десяток. Программист вернулся с 10 буханками хлеба: — Яйца были."
    ];
    return randomChoice(jokes);
}

// Функции для работы с голосом
function toggleVoiceInput() {
    if (!recognition) {
        addBotMessage("К сожалению, ваш браузер не поддерживает распознавание речи.");
        return;
    }
    
    if (isListening) {
        recognition.stop();
    } else {
        isListening = true;
        elements.voiceBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
        elements.voiceBtn.classList.add('listening');
        
        addBotMessage("Слушаю вас...");
        recognition.start();
    }
}

function speakText(text) {
    // Очищаем текст от markdown и эмодзи для лучшего озвучивания
    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1')
                         .replace(/\*(.*?)\*/g, '$1')
                         .replace(/```.*?```/gs, '')
                         .replace(/$.*?$$.*?$/g, '')
                         .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    // Создаем и настраиваем объект для озвучивания
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'ru-RU';
    utterance.volume = parseFloat(getSetting('voiceVolume') || 1);
    
    // Находим русский голос, если доступен
    const voices = synth.getVoices();
    const russianVoice = voices.find(voice => voice.lang.includes('ru'));
    if (russianVoice) {
        utterance.voice = russianVoice;
    }
    
    // Озвучиваем
    synth.speak(utterance);
}

// Функции для работы с UI
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Обновляем класс темы на body
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(THEMES[currentTheme].name);
    
    // Обновляем иконку кнопки
    elements.themeToggle.innerHTML = `<i class="${THEMES[currentTheme].icon}"></i> Сменить тему`;
    
    // Сохраняем настройку
    saveSetting('theme', currentTheme);
}

function toggleModal(modal, show = true) {
    if (show) {
        modal.classList.add('active');
    } else {
        modal.classList.remove('active');
    }
}

function toggleDropdown(dropdown, target = null, show = true) {
    // Закрываем предыдущий активный dropdown
    if (activeDropdown && activeDropdown !== dropdown) {
        activeDropdown.classList.remove('active');
    }
    
    if (show) {
        dropdown.classList.add('active');
        activeDropdown = dropdown;
        
        // Позиционируем dropdown относительно target
        if (target) {
            const rect = target.getBoundingClientRect();
            
            if (dropdown === elements.fileMenu) {
                dropdown.style.top = `${rect.bottom + 10}px`;
                dropdown.style.left = `${rect.left}px`;
            } else if (dropdown === elements.contextMenu) {
                dropdown.style.top = `${rect.top}px`;
                dropdown.style.left = `${rect.right + 5}px`;
            }
        }
    } else {
        dropdown.classList.remove('active');
        if (activeDropdown === dropdown) {
            activeDropdown = null;
        }
    }
}

// Функции для работы с эмодзи
function initEmojiPicker() {
    // Заполняем эмодзи пикер
    const emojiContent = elements.emojiPicker.querySelector('.emoji-content');
    const emojiTabs = elements.emojiPicker.querySelectorAll('.emoji-tab');
    
    // Обработчик для табов
    emojiTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const category = tab.dataset.category;
            
            // Активируем таб
            emojiTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Заполняем эмодзи
            emojiContent.innerHTML = '';
            
            EMOJI_CATEGORIES[category].forEach(emoji => {
                const emojiSpan = document.createElement('div');
                emojiSpan.className = 'emoji';
                emojiSpan.textContent = emoji;
                emojiSpan.addEventListener('click', () => {
                    insertEmoji(emoji);
                });
                emojiContent.appendChild(emojiSpan);
            });
        });
    });
    
    // Активируем первый таб по умолчанию
    emojiTabs[0].click();
}

function insertEmoji(emoji) {
    const input = elements.messageInput;
    const cursorPos = input.selectionStart;
    
    // Вставляем эмодзи в позицию курсора
    const textBefore = input.value.substring(0, cursorPos);
    const textAfter = input.value.substring(cursorPos);
    input.value = textBefore + emoji + textAfter;
    
    // Устанавливаем курсор после вставленного эмодзи
    input.selectionStart = input.selectionEnd = cursorPos + emoji.length;
    
    // Закрываем эмодзи пикер
    toggleDropdown(elements.emojiPicker, null, false);
    
    // Фокус на поле ввода
    input.focus();
}

// Функции для работы с файлами
function handleFileAction(e) {
    const action = e.target.closest('.menu-item').dataset.action;
    
    // Закрываем меню
    toggleDropdown(elements.fileMenu, null, false);
    
    switch (action) {
        case 'upload-image':
            elements.fileInput.accept = 'image/*';
            elements.fileInput.click();
            break;
        case 'upload-file':
            elements.fileInput.accept = '*/*';
            elements.fileInput.click();
            break;
        case 'analyze-image':
            elements.fileInput.accept = 'image/*';
            elements.fileInput.dataset.action = 'analyze';
            elements.fileInput.click();
            break;
    }
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const action = elements.fileInput.dataset.action || 'upload';
    
    if (file.type.startsWith('image/')) {
        // Для изображений
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = document.createElement('img');
            img.src = event.target.result;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.borderRadius = '8px';
            
            // Добавляем сообщение с изображением
            addUserMessage(`<div class="uploaded-image-container">
                <img src="${event.target.result}" alt="Uploaded image" class="uploaded-image">
                <div class="image-caption">${file.name} (${formatFileSize(file.size)})</div>
            </div>`);
            
            if (action === 'analyze') {
                // Имитация анализа изображения
                setTimeout(() => {
                    addBotMessage(`Анализ изображения '${file.name}':\n\n• Размер файла: ${formatFileSize(file.size)}\n• Тип файла: ${file.type}\n\nДля полного анализа изображения требуется подключение к API компьютерного зрения.`);
                }, 1000);
            }
        };
        reader.readAsDataURL(file);
    } else {
        // Для других файлов
        addUserMessage(`📎 Файл: ${file.name} (${formatFileSize(file.size)})`);
        addBotMessage(`Получен файл: ${file.name}\nРазмер: ${formatFileSize(file.size)}\nТип: ${file.type || 'Неизвестный'}`);
    }
    
    // Сбрасываем input и action
    elements.fileInput.value = '';
    elements.fileInput.dataset.action = '';
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
}

// Функции для работы с чатами
function createNewChat() {
    // Очищаем историю чата
    chatHistory = [];
    currentChatId = null;
    
    // Очищаем сообщения
    elements.chatMessages.innerHTML = '';
    
    // Добавляем приветственное сообщение
    addBotMessage("Создан новый чат ✨");
    
    // Обновляем список чатов
    updateChatList();
}

function saveChat() {
    if (chatHistory.length === 0) {
        addBotMessage("Нет сообщений для сохранения. 📝");
        toggleModal(elements.saveDialog, false);
        return;
    }
    
    const chatName = elements.chatNameInput.value.trim() || `Чат от ${new Date().toLocaleString('ru-RU')}`;
    
    // Создаем уникальный ID для чата
    const chatId = currentChatId || `chat_${Date.now()}`;
    
    // Сохраняем чат
    const chatData = {
        id: chatId,
        name: chatName,
        date: new Date().toISOString(),
        messages: chatHistory
    };
    
    // Обновляем текущий чат или добавляем новый
    const existingIndex = savedChats.findIndex(chat => chat.id === chatId);
    if (existingIndex !== -1) {
        savedChats[existingIndex] = chatData;
    } else {
        savedChats.push(chatData);
    }
    
    // Устанавливаем текущий чат
    currentChatId = chatId;
    
    // Сохраняем в localStorage
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
    
    // Обновляем список чатов
    updateChatList();
    
    // Закрываем диалог
    toggleModal(elements.saveDialog, false);
    
    // Очищаем поле ввода
    elements.chatNameInput.value = '';
    
    // Показываем сообщение
    addBotMessage(`Чат сохранён как '${chatName}' ✅`);
}

function loadChat(chatId) {
    const chat = savedChats.find(c => c.id === chatId);
    if (!chat) return;
    
    // Устанавливаем текущий чат
    currentChatId = chatId;
    
    // Очищаем сообщения
    elements.chatMessages.innerHTML = '';
    
    // Загружаем историю
    chatHistory = [...chat.messages];
    
    // Отображаем сообщения
    chatHistory.forEach(msg => {
        if (msg.sender === 'user') {
            const messageHtml = `
                <div class="message user">
                    <img src="user-avatar.png" alt="User" class="message-avatar">
                    <div class="message-content">
                        <div class="message-sender">Пользователь</div>
                        <div class="message-text">${msg.text}</div>
                        <div class="message-time">${msg.time}</div>
                    </div>
                </div>
            `;
            elements.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        } else {
            const messageHtml = `
                <div class="message assistant">
                    <img src="bot-avatar.png" alt="Assistant" class="message-avatar">
                    <div class="message-content">
                        <div class="message-sender">Ассистент</div>
                        <div class="message-text">${marked.parse(msg.text)}</div>
                        <div class="message-time">${msg.time}</div>
                    </div>
                </div>
            `;
            elements.chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        }
    });
    
    // Прокручиваем к последнему сообщению
    scrollToBottom();
    
    // Обновляем список чатов
    updateChatList();
}

function deleteChat(chatId) {
    // Находим индекс чата
    const chatIndex = savedChats.findIndex(chat => chat.id === chatId);
    if (chatIndex === -1) return;
    
    // Получаем имя чата для сообщения
    const chatName = savedChats[chatIndex].name;
    
    // Удаляем чат
    savedChats.splice(chatIndex, 1);
    
    // Сохраняем в localStorage
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
    
    // Если удалили текущий чат, создаем новый
    if (currentChatId === chatId) {
        createNewChat();
    } else {
        // Просто обновляем список
        updateChatList();
    }
    
    // Показываем сообщение
    addBotMessage(`Чат '${chatName}' удален. 🗑️`);
}

function renameChat(chatId, newName) {
    // Находим чат
    const chat = savedChats.find(c => c.id === chatId);
    if (!chat) return;
    
    // Сохраняем старое имя для сообщения
    const oldName = chat.name;
    
    // Обновляем имя
    chat.name = newName;
    
    // Сохраняем в localStorage
    localStorage.setItem('savedChats', JSON.stringify(savedChats));
    
    // Обновляем список чатов
    updateChatList();
    
    // Показываем сообщение
    addBotMessage(`Чат переименован с '${oldName}' на '${newName}' ✅`);
}

function updateChatList() {
    // Очищаем список
    elements.chatList.innerHTML = '';
    
    if (savedChats.length === 0) {
        const noChats = document.createElement('div');
        noChats.className = 'no-chats';
        noChats.textContent = 'Нет сохраненных чатов';
        elements.chatList.appendChild(noChats);
        return;
    }
    
    // Сортируем чаты по дате (новые сверху)
    const sortedChats = [...savedChats].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Добавляем чаты в список
    sortedChats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        
        chatItem.innerHTML = `
            <div class="chat-item-icon">💬</div>
            <div class="chat-item-text">${chat.name}</div>
            <button class="chat-item-menu">⋮</button>
        `;
        
        // Обработчик клика по чату
        chatItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('chat-item-menu')) {
                loadChat(chat.id);
            }
        });
        
        // Обработчик клика по меню
        const menuBtn = chatItem.querySelector('.chat-item-menu');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showContextMenu(e, chat.id);
        });
        
        elements.chatList.appendChild(chatItem);
    });
}

function showContextMenu(e, chatId) {
    // Позиционируем контекстное меню
    elements.contextMenu.style.top = `${e.clientY}px`;
    elements.contextMenu.style.left = `${e.clientX}px`;
    
    // Сохраняем ID чата в data-атрибуте
    elements.contextMenu.dataset.chatId = chatId;
    
    // Показываем меню
    toggleDropdown(elements.contextMenu, e.target, true);
    
    // Обработчики действий
    const renameBtn = elements.contextMenu.querySelector('[data-action="rename"]');
    const deleteBtn = elements.contextMenu.querySelector('[data-action="delete"]');
    
    // Удаляем предыдущие обработчики
    const newRenameBtn = renameBtn.cloneNode(true);
    const newDeleteBtn = deleteBtn.cloneNode(true);
    renameBtn.parentNode.replaceChild(newRenameBtn, renameBtn);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
    
    // Добавляем новые обработчики
    newRenameBtn.addEventListener('click', () => {
        const chat = savedChats.find(c => c.id === chatId);
        if (!chat) return;
        
        // Запрашиваем новое имя
        const newName = prompt('Введите новое название чата:', chat.name);
        if (newName && newName.trim()) {
            renameChat(chatId, newName.trim());
        }
        
        // Закрываем меню
        toggleDropdown(elements.contextMenu, null, false);
    });
    
    newDeleteBtn.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите удалить этот чат?')) {
            deleteChat(chatId);
        }
        
        // Закрываем меню
        toggleDropdown(elements.contextMenu, null, false);
    });
}

// Функции для работы с настройками
function loadSettings() {
    // Загружаем настройки из localStorage
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    
    // Применяем тему
    if (settings.theme) {
        currentTheme = settings.theme;
        document.body.classList.add(THEMES[currentTheme].name);
        elements.themeToggle.innerHTML = `<i class="${THEMES[currentTheme].icon}"></i> Сменить тему`;
    } else {
        // Тема по умолчанию
        document.body.classList.add(THEMES.dark.name);
    }
    
    // Загружаем другие настройки в форму
    if (settings.voiceEnabled !== undefined) {
        document.getElementById('voice-enabled').checked = settings.voiceEnabled;
    }
    
    if (settings.voiceVolume !== undefined) {
        document.getElementById('voice-volume').value = settings.voiceVolume;
    }
    
    if (settings.geminiApiKey) {
        document.getElementById('gemini-api').value = settings.geminiApiKey;
    }
    
    if (settings.wolframApiKey) {
        document.getElementById('wolfram-api').value = settings.wolframApiKey;
    }
}

function loadSavedChats() {
    // Загружаем чаты из localStorage
    const chats = JSON.parse(localStorage.getItem('savedChats') || '[]');
    savedChats = chats;
    
    // Обновляем список чатов
    updateChatList();
}

function saveSettings() {
    // Собираем настройки из формы
    const settings = {
        theme: currentTheme,
        voiceEnabled: document.getElementById('voice-enabled').checked,
        voiceVolume: document.getElementById('voice-volume').value,
        geminiApiKey: document.getElementById('gemini-api').value,
        wolframApiKey: document.getElementById('wolfram-api').value
    };
    
    // Сохраняем в localStorage
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Закрываем модальное окно
    toggleModal(elements.settingsModal, false);
    
    // Показываем сообщение
    addBotMessage("Настройки успешно сохранены. ✅");
}

function resetSettings() {
    // Сбрасываем настройки на значения по умолчанию
    document.getElementById('voice-enabled').checked = true;
    document.getElementById('voice-volume').value = 1;
    document.getElementById('gemini-api').value = 'AIzaSyD6OqXPs1Iclo1iX9aTW8fgmfkBP85lj_c';
    document.getElementById('wolfram-api').value = '6YEYVK-6RLA8L2ATR';
    
    // Применяем темную тему
    if (currentTheme !== 'dark') {
        currentTheme = 'dark';
        document.body.classList.remove('theme-light');
        document.body.classList.add('theme-dark');
        elements.themeToggle.innerHTML = `<i class="${THEMES.dark.icon}"></i> Сменить тему`;
    }
    
    // Показываем сообщение
    addBotMessage("Настройки сброшены до значений по умолчанию. ✅");
}

function getSetting(key) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    return settings[key];
}

function saveSetting(key, value) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    settings[key] = value;
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', initApp);