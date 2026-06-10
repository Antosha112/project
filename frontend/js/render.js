// render.js - отображение задач на странице

let toastTimeout = null;
// отвечает за то что бы брал базу данных и разбивал их по статусам
function render(tasks) {
    const newTasks = tasks.filter(t => t.status === 'Новая');
    const inProgressTasks = tasks.filter(t => t.status === 'В работе');
    const doneTasks = tasks.filter(t => t.status === 'Завершена');

    renderList('newTasksList', newTasks, 'Новая');
    renderList('inprogressTasksList', inProgressTasks, 'В работе');
    renderList('doneTasksList', doneTasks, 'Завершена');
}
//рисует задачи в контейнеры, если задач нет – показывает сообщение «Нет задач».
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

        const safeTitle = escapeAttr(task.title);
        const safeDesc = escapeHtml(task.description || '—');

        return `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-description">${safeDesc}</div>
                <div class="task-footer">
                    <span class="task-date">${formatDate(task.created_at)}</span>
                    <span class="status-tag">${escapeHtml(task.status)}</span>
                </div>
                <div class="task-actions">
                    ${leftBtn}
                    ${rightBtn}
                    <button class="delete-btn" data-id="${task.id}" data-title="${safeTitle}" title="Удалить">✕</button>
                </div>
            </div>
        `;
    }).join('');

    attachMoveHandlers(cont, tasksList);
    attachDeleteHandlers(cont);
}
//обработчики на все кнопки находит задачу по id
function attachMoveHandlers(container, tasksList) {
    container.querySelectorAll('.move-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); //не нужно, чтобы сработал клик по самой карточке
            
            if (btn.disabled) return;
            btn.disabled = true;
            
            const taskId = btn.dataset.id;
            const newStatus = btn.dataset.newStatus;
            const task = tasksList.find(t => String(t.id) === String(taskId));
            
            if (task && newStatus) {
                try {
                    await updateTask(taskId, {
                        title: task.title,
                        description: task.description,
                        status: newStatus
                    });
                } catch (error) {
                    showToast(`❌ Ошибка перемещения: ${error.message}`, true);
                } finally {
                    btn.disabled = false;
                }
            } else {
                btn.disabled = false;
            }
        });
    });
}
// обработчики на кнопки удаления
function attachDeleteHandlers(container) {
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            if (btn.disabled) return;
            btn.disabled = true;
            
            const taskId = btn.dataset.id;
            const taskTitle = btn.dataset.title;
            
            try {
                await deleteTask(taskId, taskTitle);//требует потверждения
            } catch (error) {
                showToast(`❌ Ошибка удаления: ${error.message}`, true);
            } finally {
                btn.disabled = false;
            }
        });
    });
}
// даты 
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffTime = today - taskDate;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'сегодня';
    if (diffDays === 1) return 'вчера';
    if (diffDays < 7) {
        if (diffDays % 10 === 1 && diffDays % 100 !== 11) return `${diffDays} день назад`;
        if ([2,3,4].includes(diffDays % 10) && ![12,13,14].includes(diffDays % 100)) return `${diffDays} дня назад`;
        return `${diffDays} дней назад`;
    }
    
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
}
// спец символы переводит html
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
// символы переводит в html более строго
function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
    });
}
//анимация загрузки
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
// уведомления
function showToast(msg, isErr = false) {
    if (toastTimeout) clearTimeout(toastTimeout);
    
    let t = document.querySelector('.toast');
    if (!t) {
        t = document.createElement('div');
        t.className = 'toast';
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = isErr ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #1e293b, #0f172a)';
    t.classList.add('show');
    
    toastTimeout = setTimeout(() => {
        if (t) t.classList.remove('show');
        toastTimeout = null;
    }, 2500);
}
