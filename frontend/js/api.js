// API.js - все запросы к серверу

const API_URL = 'http://localhost:8000';

// Глобальные переменные
let currentTasks = [];

async function loadTasks() {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/tasks`);
        if (!response.ok) throw new Error('Ошибка загрузки');
        currentTasks = await response.json();
        render(currentTasks);
        updateStats(currentTasks);
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('❌ Не удалось загрузить задачи', true);
    } finally {
        showLoading(false);
    }
}

async function createTask(taskData) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/task`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Ошибка создания');
        await loadTasks();
        showToast(`✨ Задача "${taskData.title}" создана!`);
    } catch (error) {
        showToast('❌ Не удалось создать задачу', true);
    } finally {
        showLoading(false);
    }
}

async function updateTask(taskId, taskData) {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/task/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Ошибка обновления');
        await loadTasks();
        showToast(`✅ Задача обновлена!`);
        return true;
    } catch (error) {
        showToast('❌ Не удалось обновить задачу', true);
    } finally {
        showLoading(false);
    }
    return false;
}

async function deleteTask(taskId, taskTitle) {
    if (!confirm(`Удалить задачу "${taskTitle}"?`)) return;
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}/task/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Ошибка удаления');
        await loadTasks();
        showToast(`🗑️ Задача "${taskTitle}" удалена`);
    } catch (error) {
        showToast('❌ Не удалось удалить задачу', true);
    } finally {
        showLoading(false);
    }
}