// render.js - отображение задач на странице

function render(tasks) {
    const newTasks = tasks.filter(t => t.status === 'Новая');
    const inProgressTasks = tasks.filter(t => t.status === 'В работе');
    const doneTasks = tasks.filter(t => t.status === 'Завершена');

    renderList('newTasksList', newTasks, 'Новая');
    renderList('inprogressTasksList', inProgressTasks, 'В работе');
    renderList('doneTasksList', doneTasks, 'Завершена');
}

function renderList(contId, tasksList, currentStatus) {
    const cont = document.getElementById(contId);
    if (!cont) return;

    if (tasksList.length === 0) {
        cont.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8;background:rgba(0,0,0,0.02);border-radius:20px;">✨ Нет задач</div>';
        return;
    }

    cont.innerHTML = tasksList.map(task => {
        let leftBtn = '', rightBtn = '';
        
        if (currentStatus === 'Новая') {
            rightBtn = `<button class="move-btn" data-id="${task.id}" data-new-status="В работе" title="Переместить в работу">→</button>`;
        } else if (currentStatus === 'В работе') {
            leftBtn = `<button class="move-btn" data-id="${task.id}" data-new-status="Новая" title="Вернуть в новые">←</button>`;
            rightBtn = `<button class="move-btn" data-id="${task.id}" data-new-status="Завершена" title="Завершить">→</button>`;
        } else if (currentStatus === 'Завершена') {
            leftBtn = `<button class="move-btn" data-id="${task.id}" data-new-status="В работе" title="Вернуть в работу">←</button>`;
        }

        return `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-description">${escapeHtml(task.description || '—')}</div>
                <div class="task-footer">
                    <span class="task-date">${formatDate(task.created_at)}</span>
                    <span class="status-tag">${task.status}</span>
                </div>
                <div class="task-actions">
                    ${leftBtn}
                    ${rightBtn}
                    <button class="delete-btn" data-id="${task.id}" data-title="${escapeHtml(task.title)}" title="Удалить">✕</button>
                </div>
            </div>
        `;
    }).join('');

    // Привязываем обработчики перемещения
    attachMoveHandlers(cont, tasksList);
    
    // Привязываем обработчики удаления
    attachDeleteHandlers(cont);
}

function attachMoveHandlers(container, tasksList) {
    container.querySelectorAll('.move-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.id;
            const newStatus = btn.dataset.newStatus;
            const task = tasksList.find(t => t.id == taskId);
            if (task && newStatus) {
                await updateTask(taskId, {
                    title: task.title,
                    description: task.description,
                    status: newStatus
                });
            }
        });
    });
}

function attachDeleteHandlers(container) {
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const taskId = btn.dataset.id;
            const taskTitle = btn.dataset.title;
            await deleteTask(taskId, taskTitle);
        });
    });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) return 'сегодня';
    if (diff === 1) return 'вчера';
    if (diff < 7) return `${diff} дня(ей) назад`;
    
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function showLoading(show) {
    let overlay = document.getElementById('loadingOverlay');
    if (show) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    } else {
        if (overlay) overlay.style.display = 'none';
    }
}

function showToast(msg, isErr = false) {
    let t = document.querySelector('.toast');
    if (!t) {
        t = document.createElement('div');
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = isErr ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #1e293b, #0f172a)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}