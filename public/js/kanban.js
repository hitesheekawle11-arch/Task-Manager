/**
 * Kanban Drag and Drop Task Board Controller
 * Native HTML5 Drag-and-Drop with real-time MongoDB status synchronization
 */

const Kanban = {
  columns: ['To Do', 'In Progress', 'Completed'],
  draggedTaskId: null,

  async loadBoard() {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    try {
      // Fetch all active tasks (limit 0 or 100 for board)
      const res = await API.get('/tasks', { limit: 100, archived: 'false' });
      if (res.success) {
        this.renderBoard(res.data);
      }
    } catch (err) {
      console.error('Failed to load Kanban board:', err);
    }
  },

  renderBoard(tasks) {
    const board = document.getElementById('kanban-board');
    if (!board) return;

    const tasksByCol = {
      'To Do': [],
      'In Progress': [],
      'Completed': [],
    };

    tasks.forEach((task) => {
      if (tasksByCol[task.status]) {
        tasksByCol[task.status].push(task);
      }
    });

    board.innerHTML = this.columns
      .map((col) => {
        const colTasks = tasksByCol[col] || [];
        return `
          <div class="kanban-column" data-status="${col}">
            <div class="kanban-column-header">
              <div class="kanban-column-title-group">
                <span class="kanban-column-title">
                  ${col === 'To Do' ? '📌' : col === 'In Progress' ? '⚡' : '✅'} ${col}
                </span>
                <span class="kanban-column-badge">${colTasks.length}</span>
              </div>
              <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openCreateModal()" title="Add Task to ${col}">+</button>
            </div>

            <div 
              class="kanban-cards-list" 
              id="kanban-dropzone-${col.replace(/\s+/g, '-').toLowerCase()}" 
              data-status="${col}"
              ondragover="Kanban.handleDragOver(event)"
              ondragleave="Kanban.handleDragLeave(event)"
              ondrop="Kanban.handleDrop(event)"
            >
              ${
                colTasks.length === 0
                  ? `<div class="kanban-empty-placeholder">No tasks in ${col}.<br>Drag tasks here or click +</div>`
                  : colTasks.map((t) => this.renderCard(t)).join('')
              }
            </div>
          </div>
        `;
      })
      .join('');
  },

  renderCard(task) {
    const prioClasses = { Low: 'badge-low', Medium: 'badge-med', High: 'badge-high', Urgent: 'badge-urgent' };
    const prioClass = prioClasses[task.priority] || 'badge-med';

    const subtasksCount = task.subtasks ? task.subtasks.length : 0;
    const completedCount = task.subtasks ? task.subtasks.filter((s) => s.completed).length : 0;
    const subtaskPct = subtasksCount > 0 ? Math.round((completedCount / subtasksCount) * 100) : 0;

    let dueTag = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const isOverdue = d < new Date() && task.status !== 'Completed';
      dueTag = `<span class="task-due-tag ${isOverdue ? 'overdue' : 'upcoming'}" style="font-size:0.7rem;">
        📅 ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </span>`;
    }

    return `
      <div 
        class="kanban-card" 
        id="kanban-card-${task._id}" 
        draggable="true" 
        ondragstart="Kanban.handleDragStart(event, '${task._id}')"
        ondragend="Kanban.handleDragEnd(event)"
      >
        <div class="kanban-card-header">
          <span class="badge ${prioClass}" style="font-size:0.65rem;">${task.priority}</span>
          ${task.category ? `<span style="font-size:0.75rem;font-weight:600;color:${task.category.color};">${task.category.icon || '📁'} ${task.category.name}</span>` : ''}
        </div>

        <div class="kanban-card-title" onclick="Tasks.openDetailModal('${task._id}')">${task.title}</div>

        ${task.description ? `<div class="kanban-card-desc">${task.description}</div>` : ''}

        ${
          subtasksCount > 0
            ? `
          <div class="kanban-card-subtasks">
            <span>☑️ ${completedCount}/${subtasksCount}</span>
            <div class="kanban-subtask-bar">
              <div class="kanban-subtask-bar-fill" style="width: ${subtaskPct}%;"></div>
            </div>
          </div>
        `
            : ''
        }

        <div class="kanban-card-footer">
          <div class="kanban-card-footer-left">
            ${dueTag}
          </div>
          <div style="display:flex;gap:0.35rem;">
            <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openDetailModal('${task._id}')" title="Details">👁️</button>
            <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openEditModal('${task._id}')" title="Edit">✏️</button>
          </div>
        </div>
      </div>
    `;
  },

  handleDragStart(e, taskId) {
    this.draggedTaskId = taskId;
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const card = document.getElementById(`kanban-card-${taskId}`);
      if (card) card.classList.add('dragging');
    }, 0);
  },

  handleDragEnd(e) {
    const card = document.getElementById(`kanban-card-${this.draggedTaskId}`);
    if (card) card.classList.remove('dragging');
    document.querySelectorAll('.kanban-cards-list').forEach((zone) => {
      zone.classList.remove('dragover');
    });
  },

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const zone = e.currentTarget;
    if (!zone.classList.contains('dragover')) {
      zone.classList.add('dragover');
    }
  },

  handleDragLeave(e) {
    const zone = e.currentTarget;
    zone.classList.remove('dragover');
  },

  async handleDrop(e) {
    e.preventDefault();
    const zone = e.currentTarget;
    zone.classList.remove('dragover');

    const newStatus = zone.getAttribute('data-status');
    const taskId = this.draggedTaskId || e.dataTransfer.getData('text/plain');

    if (!taskId || !newStatus) return;

    try {
      const res = await API.patch(`/tasks/${taskId}/status`, { status: newStatus });
      Toast.success(`Moved to ${newStatus}`);
      this.loadBoard();
      if (window.Dashboard) Dashboard.fetchAndRender();
      if (window.Tasks) Tasks.fetchAndRender();
    } catch (err) {
      Toast.error(err.message, 'Move Failed');
    } finally {
      this.draggedTaskId = null;
    }
  },
};

window.Kanban = Kanban;
