// editdelete.js - функции для редактирования и удаления задач

// Функция для редактирования задачи (будущее расширение)
async function editTask(taskId, currentTask) {
    // Открываем модальное окно с текущими данными
    document.getElementById('modalTitle').value = currentTask.title;
    document.getElementById('modalDesc').value = currentTask.description || '';
    document.getElementById('modalStatus').value = currentTask.status;
    
    // Меняем заголовок и кнопку модального окна
    const modalTitle = document.querySelector('#taskModal h3');
    const saveBtn = document.getElementById('saveTaskBtn');
    const originalTitle = modalTitle.innerHTML;
    const originalBtnText = saveBtn.innerHTML;
    
    modalTitle.innerHTML = '✏️ Редактировать задачу';
    saveBtn.innerHTML = 'Сохранить';
    
    modal.style.display = 'flex';
    
    // Временный обработчик для редактирования
    const tempSaveHandler = async () => {
        const title = document.getElementById('modalTitle').value.trim();
        if (!title) {
            showToast('❌ Введите название задачи', true);
            return;
        }
        
        await updateTask(taskId, {
            title: title,
            description: document.getElementById('modalDesc').value.trim() || '',
            status: document.getElementById('modalStatus').value
        });
        
        // Возвращаем всё как было
        modalTitle.innerHTML = originalTitle;
        saveBtn.innerHTML = originalBtnText;
        saveBtn.onclick = originalSaveHandler;
        closeModal();
    };
    
    const originalSaveHandler = saveBtn.onclick;
    saveBtn.onclick = tempSaveHandler;
    
    // Восстанавливаем при закрытии
    const closeHandler = () => {
        modalTitle.innerHTML = originalTitle;
        saveBtn.innerHTML = originalBtnText;
        saveBtn.onclick = originalSaveHandler;
        closeModal();
        window.onclick = e => {
            if (e.target === modal) closeModal();
        };
    };
    
    const tempCancelHandler = () => {
        closeHandler();
    };
    
    document.getElementById('cancelModalBtn').onclick = tempCancelHandler;
    window.onclick = e => {
        if (e.target === modal) closeHandler();
    };
}

// Функция для массового удаления завершенных задач
async function clearCompletedTasks() {
    const completedTasks = currentTasks.filter(t => t.status === 'Завершена');
    if (completedTasks.length === 0) {
        showToast('Нет завершенных задач для удаления', true);
        return;
    }
    
    if (confirm(`Удалить все ${completedTasks.length} завершенные задачи?`)) {
        showLoading(true);
        try {
            for (const task of completedTasks) {
                await fetch(`${API_URL}/task/${task.id}`, { method: 'DELETE' });
            }
            await loadTasks();
            showToast(`🗑️ Удалено ${completedTasks.length} завершенных задач`);
        } catch (error) {
            showToast('❌ Ошибка при массовом удалении', true);
        } finally {
            showLoading(false);
        }
    }
}

// Экспортируем функции (глобально)
window.clearCompletedTasks = clearCompletedTasks;
window.editTask = editTask;