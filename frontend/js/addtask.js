// addtask.js - логика добавления новых задач

// Модальное окно
const modal = document.getElementById('taskModal');

function openAddTaskModal() {
    document.getElementById('modalTitle').value = '';
    document.getElementById('modalDesc').value = '';
    document.getElementById('modalStatus').value = 'Новая';
    modal.style.display = 'flex';
}

function closeModal() {
    modal.style.display = 'none';
}

async function handleSaveTask() {
    const title = document.getElementById('modalTitle').value.trim();
    if (!title) {
        showToast('❌ Введите название задачи', true);
        return;
    }
    
    await createTask({
        title: title,
        description: document.getElementById('modalDesc').value.trim() || '',
        status: document.getElementById('modalStatus').value
    });
    
    closeModal();
}

// Инициализация обработчиков модального окна
function initAddTaskModal() {
    document.getElementById('globalAddBtn').onclick = openAddTaskModal;
    document.getElementById('saveTaskBtn').onclick = handleSaveTask;
    document.getElementById('cancelModalBtn').onclick = closeModal;
    
    window.onclick = e => {
        if (e.target === modal) closeModal();
    };
}

// Запускаем инициализацию после загрузки страницы
document.addEventListener('DOMContentLoaded', initAddTaskModal);