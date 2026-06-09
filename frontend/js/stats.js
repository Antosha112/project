// stats.js - обновление статистики

function updateStats(tasks) {
    const newTasks = tasks.filter(t => t.status === 'Новая');
    const inProgressTasks = tasks.filter(t => t.status === 'В работе');
    const doneTasks = tasks.filter(t => t.status === 'Завершена');

    document.getElementById('totalTasks').innerText = tasks.length;
    document.getElementById('newTasksCount').innerText = newTasks.length;
    document.getElementById('inProgressCount').innerText = inProgressTasks.length;
    document.getElementById('doneCount').innerText = doneTasks.length;
    document.getElementById('newCountBadge').innerText = newTasks.length;
    document.getElementById('inprogressCountBadge').innerText = inProgressTasks.length;
    document.getElementById('doneCountBadge').innerText = doneTasks.length;
}

// Асинхронная загрузка статистики с сервера (для будущих расширений)
async function fetchServerStats() {
    try {
        const response = await fetch(`${API_URL}/tasks/stats`);
        if (!response.ok) throw new Error('Ошибка загрузки статистики');
        const stats = await response.json();
        return stats;
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
        return null;
    }
}