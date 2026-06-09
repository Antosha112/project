// websocket.js - реальное WebSocket подключение

let socket = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const wsUrl = 'ws://localhost:8000/ws';

function connectWebSocket() {
    try {
        socket = new WebSocket(wsUrl);
        
        socket.onopen = () => {
            console.log('✅ WebSocket подключен');
            reconnectAttempts = 0;
            
            // Отправляем приветственное сообщение
            socket.send(JSON.stringify({ type: 'ping', message: 'Привет от клиента!' }));
        };
        
        socket.onmessage = (event) => {
            console.log('📨 Получено сообщение:', event.data);
            
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (e) {
                console.error('Ошибка парсинга:', e);
            }
        };
        
        socket.onerror = (error) => {
            console.error('❌ WebSocket ошибка:', error);
        };
        
        socket.onclose = () => {
            console.log('🔌 WebSocket отключен');
            
            // Пытаемся переподключиться
            if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = 3000 * reconnectAttempts;
                console.log(`🔄 Переподключение через ${delay / 1000} сек... (${reconnectAttempts}/${maxReconnectAttempts})`);
                setTimeout(connectWebSocket, delay);
            } else {
                console.log('❌ Не удалось переподключиться. Используем polling...');
                startPolling();
            }
        };
        
    } catch (error) {
        console.error('Ошибка создания WebSocket:', error);
        startPolling(); // Фолбэк на polling
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'task_created':
            console.log(`✨ Новая задача: ${data.task.title}`);
            showToast(`✨ Новая задача: ${data.task.title}`);
            loadTasks(); // Обновляем список
            break;
            
        case 'task_updated':
            console.log(`🔄 Обновлена задача: ${data.task.title}`);
            showToast(`🔄 Задача "${data.task.title}" обновлена`);
            loadTasks();
            break;
            
        case 'task_deleted':
            console.log(`🗑️ Удалена задача #${data.task_id}`);
            showToast(`🗑️ Задача удалена`);
            loadTasks();
            break;
            
        case 'user_left':
            console.log('👋 Пользователь отключился');
            break;
            
        default:
            console.log('Неизвестный тип сообщения:', data);
    }
}

// Polling (фолбэк, если WebSocket не работает)
let pollInterval = null;

function startPolling(intervalMs = 5000) {
    if (pollInterval) clearInterval(pollInterval);
    
    console.log(`🔄 Polling запущен (интервал ${intervalMs}ms)`);
    pollInterval = setInterval(() => {
        if (typeof loadTasks === 'function') {
            loadTasks();
        }
    }, intervalMs);
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('⏹️ Polling остановлен');
    }
}

// Инициализация
function initRealtime() {
    connectWebSocket();
}

// Экспортируем функции
window.initRealtime = initRealtime;
window.startPolling = startPolling;
window.stopPolling = stopPolling;

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', () => {
    initRealtime();
});