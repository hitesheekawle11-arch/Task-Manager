/**
 * Tasks Management Controller
 * Handles CRUD, Multi-Filtering, Subtasks, Search, Pagination, Detail Modals & CSV Export
 */

const Tasks = {
  currentFilters: {
    search: '',
    status: '',
    priority: '',
    category: '',
    tag: '',
    dueFilter: '',
    isFavorite: '',
    archived: 'false',
    sort: 'newest',
    page: 1,
    limit: 8,
  },

  currentEditingSubtasks: [],
  activeTaskId: null,

  async fetchAndRender() {
    const listContainer = document.getElementById('tasks-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = `
      <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
        <div class="skeleton" style="height: 50px; margin-bottom: 1rem;"></div>
        <div class="skeleton" style="height: 50px; margin-bottom: 1rem;"></div>
        <div class="skeleton" style="height: 50px;"></div>
      </div>
    `;

    try {
      const res = await API.get('/tasks', this.currentFilters);

      if (res.success) {
        this.renderTaskList(res.data, res.totalTasks);
        this.renderPagination(res.currentPage, res.totalPages, res.totalTasks);
      }
    } catch (err) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Failed to load tasks</h3>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="Tasks.fetchAndRender()">Retry</button>
        </div>
      `;
    }
  },

  renderTaskList(tasks, totalCount) {
    const container = document.getElementById('tasks-list-container');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>No tasks found</h3>
          <p>No tasks match your current criteria. Create a new task or adjust your filters.</p>
          <button class="btn btn-primary" onclick="Tasks.openCreateModal()">+ Create New Task</button>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map((task) => this.renderTaskRow(task)).join('');
  },

  renderTaskRow(task) {
    const isCompleted = task.status === 'Completed';
    const isArchived = task.status === 'Archived';

    // Priority badge
    const prioClasses = {
      Low: 'badge-low',
      Medium: 'badge-med',
      High: 'badge-high',
      Urgent: 'badge-urgent',
    };
    const prioClass = prioClasses[task.priority] || 'badge-med';

    // Due date tag
    let dueTagHtml = '';
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const dateFormatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (dueDate < startOfToday && !isCompleted && !isArchived) {
        dueTagHtml = `<span class="task-due-tag overdue">⚠️ Overdue (${dateFormatted})</span>`;
      } else if (dueDate >= startOfToday && dueDate <= endOfToday) {
        dueTagHtml = `<span class="task-due-tag today">⏳ Due Today</span>`;
      } else {
        dueTagHtml = `<span class="task-due-tag upcoming">📅 ${dateFormatted}</span>`;
      }
    }

    // Subtasks progress
    let subtasksHtml = '';
    if (task.subtasks && task.subtasks.length > 0) {
      const total = task.subtasks.length;
      const completed = task.subtasks.filter((s) => s.completed).length;
      subtasksHtml = `
        <span class="task-meta-item" title="${completed} of ${total} subtasks completed">
          ☑️ ${completed}/${total}
        </span>
      `;
    }

    // Category tag
    let catHtml = '';
    if (task.category) {
      catHtml = `
        <span class="task-meta-item" style="color: ${task.category.color}; font-weight: 600;">
          ${task.category.icon || '📁'} ${task.category.name}
        </span>
      `;
    }

    // Tags list
    let tagsHtml = '';
    if (task.tags && task.tags.length > 0) {
      tagsHtml = task.tags
        .map((t) => `<span class="tag-pill" onclick="Tasks.filterByTag('${t}')">#${t}</span>`)
        .join(' ');
    }

    return `
      <div class="task-item" id="task-row-${task._id}">
        <div class="task-item-left">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${isCompleted ? 'checked' : ''} 
            title="${isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}"
            onchange="Tasks.toggleTaskComplete('${task._id}', this.checked)"
          />
          <div class="task-main-info">
            <div class="task-title-row">
              <span class="task-title ${isCompleted ? 'completed' : ''}" onclick="Tasks.openDetailModal('${task._id}')">${task.title}</span>
              <span class="badge ${prioClass}">${task.priority}</span>
              <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
            </div>
            ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
            <div class="task-meta-row">
              ${dueTagHtml}
              ${catHtml}
              ${subtasksHtml}
              ${tagsHtml}
            </div>
          </div>
        </div>

        <div class="task-item-right">
          <button 
            class="btn btn-icon btn-secondary btn-sm" 
            onclick="Tasks.toggleFavorite('${task._id}')" 
            title="${task.isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
          >
            ${task.isFavorite ? '⭐' : '☆'}
          </button>
          <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openDetailModal('${task._id}')" title="View Details">👁️</button>
          <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.openEditModal('${task._id}')" title="Edit Task">✏️</button>
          <button class="btn btn-icon btn-secondary btn-sm" onclick="Tasks.duplicateTask('${task._id}')" title="Duplicate Task">📋</button>
          <button class="btn btn-icon btn-danger btn-sm" onclick="Tasks.confirmDelete('${task._id}', '${task.title.replace(/'/g, "\\'")}')" title="Delete Task">🗑️</button>
        </div>
      </div>
    `;
  },

  renderPagination(current, total, totalCount) {
    const container = document.getElementById('task-pagination-container');
    if (!container) return;

    if (total <= 1) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
      <span>Showing page <strong>${current}</strong> of <strong>${total}</strong> (${totalCount} tasks total)</span>
      <div class="pagination-buttons">
        <button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="Tasks.goToPage(${current - 1})">← Previous</button>
        ${Array.from({ length: total }, (_, i) => i + 1)
          .map(
            (p) => `<button class="page-btn ${p === current ? 'active' : ''}" onclick="Tasks.goToPage(${p})">${p}</button>`
          )
          .join('')}
        <button class="page-btn" ${current === total ? 'disabled' : ''} onclick="Tasks.goToPage(${current + 1})">Next →</button>
      </div>
    `;
  },

  goToPage(page) {
    this.currentFilters.page = page;
    this.fetchAndRender();
  },

  applyFilter(key, value) {
    this.currentFilters[key] = value;
    this.currentFilters.page = 1;
    this.fetchAndRender();
  },

  filterByTag(tag) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = tag;
    this.applyFilter('search', tag);
  },

  applyQuickFilter(type) {
    // Switch to tasks view if not already there
    if (window.App) App.switchView('tasks');

    if (type === 'overdue') {
      this.currentFilters.dueFilter = 'overdue';
      this.currentFilters.status = '';
    } else if (type === 'today') {
      this.currentFilters.dueFilter = 'today';
      this.currentFilters.status = '';
    } else if (type === 'favorites') {
      this.currentFilters.isFavorite = 'true';
    } else if (type === 'archived') {
      this.currentFilters.archived = 'true';
    }

    this.fetchAndRender();
  },

  // Modal Handlers: Create / Edit
  openCreateModal() {
    this.activeTaskId = null;
    this.currentEditingSubtasks = [];

    document.getElementById('task-modal-title').textContent = 'Create New Task';
    document.getElementById('task-form-id').value = '';
    document.getElementById('task-title').value = '';
    document.getElementById('task-desc').value = '';
    document.getElementById('task-status').value = 'To Do';
    document.getElementById('task-priority').value = 'Medium';
    document.getElementById('task-due-date').value = '';
    document.getElementById('task-category').value = '';
    document.getElementById('task-tags').value = '';
    document.getElementById('task-notes').value = '';

    this.renderSubtasksEditor();

    const modal = document.getElementById('task-edit-modal');
    if (modal) modal.classList.add('active');
  },

  async openEditModal(id) {
    try {
      const res = await API.get(`/tasks/${id}`);
      if (!res.success) return;

      const task = res.data;
      this.activeTaskId = task._id;
      this.currentEditingSubtasks = task.subtasks ? [...task.subtasks] : [];

      document.getElementById('task-modal-title').textContent = 'Edit Task';
      document.getElementById('task-form-id').value = task._id;
      document.getElementById('task-title').value = task.title;
      document.getElementById('task-desc').value = task.description || '';
      document.getElementById('task-status').value = task.status;
      document.getElementById('task-priority').value = task.priority;

      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        document.getElementById('task-due-date').value = `${yyyy}-${mm}-${dd}`;
      } else {
        document.getElementById('task-due-date').value = '';
      }

      document.getElementById('task-category').value = task.category ? task.category._id : '';
      document.getElementById('task-tags').value = (task.tags || []).join(', ');
      document.getElementById('task-notes').value = task.notes || '';

      this.renderSubtasksEditor();

      // Close details modal if open
      this.closeDetailModal();

      const modal = document.getElementById('task-edit-modal');
      if (modal) modal.classList.add('active');
    } catch (err) {
      Toast.error(err.message, 'Load Error');
    }
  },

  closeModal() {
    const modal = document.getElementById('task-edit-modal');
    if (modal) modal.classList.remove('active');
  },

  // Subtasks in create/edit modal
  renderSubtasksEditor() {
    const list = document.getElementById('modal-subtasks-list');
    if (!list) return;

    list.innerHTML = this.currentEditingSubtasks
      .map(
        (st, idx) => `
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.4rem;">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${st.completed ? 'checked' : ''} 
            onchange="Tasks.toggleModalSubtask(${idx}, this.checked)"
          />
          <input 
            type="text" 
            class="form-input" 
            value="${st.title}" 
            placeholder="Subtask description..." 
            oninput="Tasks.updateModalSubtaskTitle(${idx}, this.value)"
            style="padding:0.4rem 0.65rem;"
          />
          <button type="button" class="btn btn-icon btn-danger btn-sm" onclick="Tasks.removeModalSubtask(${idx})">✕</button>
        </div>
      `
      )
      .join('');
  },

  addModalSubtask() {
    const input = document.getElementById('new-subtask-input');
    if (!input || !input.value.trim()) return;

    this.currentEditingSubtasks.push({
      title: input.value.trim(),
      completed: false,
    });
    input.value = '';
    this.renderSubtasksEditor();
  },

  toggleModalSubtask(index, completed) {
    if (this.currentEditingSubtasks[index]) {
      this.currentEditingSubtasks[index].completed = completed;
    }
  },

  updateModalSubtaskTitle(index, title) {
    if (this.currentEditingSubtasks[index]) {
      this.currentEditingSubtasks[index].title = title;
    }
  },

  removeModalSubtask(index) {
    this.currentEditingSubtasks.splice(index, 1);
    this.renderSubtasksEditor();
  },

  async handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('task-form-id').value;
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-desc').value.trim();
    const status = document.getElementById('task-status').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-due-date').value || null;
    const category = document.getElementById('task-category').value || null;
    const tagsInput = document.getElementById('task-tags').value.trim();
    const notes = document.getElementById('task-notes').value.trim();

    if (!title) {
      Toast.error('Please provide a task title');
      return;
    }

    const payload = {
      title,
      description,
      status,
      priority,
      dueDate,
      category,
      tags: tagsInput,
      notes,
      subtasks: this.currentEditingSubtasks,
    };

    try {
      if (id) {
        await API.put(`/tasks/${id}`, payload);
        Toast.success('Task updated successfully');
      } else {
        await API.post('/tasks', payload);
        Toast.success('Task created successfully');
      }

      this.closeModal();
      this.fetchAndRender();
      if (window.Dashboard) Dashboard.fetchAndRender();
      if (window.Kanban) Kanban.loadBoard();
    } catch (err) {
      Toast.error(err.message, 'Save Error');
    }
  },

  // Task Actions
  async toggleTaskComplete(id, completed) {
    const status = completed ? 'Completed' : 'To Do';
    try {
      await API.patch(`/tasks/${id}/status`, { status });
      Toast.success(completed ? 'Task marked as Completed! 🎯' : 'Task restored to To Do');
      this.fetchAndRender();
      if (window.Dashboard) Dashboard.fetchAndRender();
      if (window.Kanban) Kanban.loadBoard();
    } catch (err) {
      Toast.error(err.message, 'Status Error');
    }
  },

  async toggleFavorite(id) {
    try {
      const res = await API.patch(`/tasks/${id}/favorite`, {});
      Toast.info(res.message);
      this.fetchAndRender();
    } catch (err) {
      Toast.error(err.message, 'Favorite Error');
    }
  },

  async duplicateTask(id) {
    try {
      await API.post(`/tasks/${id}/duplicate`, {});
      Toast.success('Task duplicated');
      this.fetchAndRender();
      if (window.Dashboard) Dashboard.fetchAndRender();
    } catch (err) {
      Toast.error(err.message, 'Duplicate Error');
    }
  },

  async toggleArchive(id) {
    try {
      const res = await API.patch(`/tasks/${id}/archive`, {});
      Toast.info(res.message);
      this.closeDetailModal();
      this.fetchAndRender();
      if (window.Dashboard) Dashboard.fetchAndRender();
      if (window.Kanban) Kanban.loadBoard();
    } catch (err) {
      Toast.error(err.message, 'Archive Error');
    }
  },

  async confirmDelete(id, title) {
    if (!confirm(`Are you sure you want to permanently delete task "${title}"?`)) {
      return;
    }

    try {
      await API.delete(`/tasks/${id}`);
      Toast.success('Task deleted successfully');
      this.closeDetailModal();
      this.fetchAndRender();
      if (window.Dashboard) Dashboard.fetchAndRender();
      if (window.Kanban) Kanban.loadBoard();
    } catch (err) {
      Toast.error(err.message, 'Delete Error');
    }
  },

  // Detailed Task View Modal
  async openDetailModal(id) {
    try {
      const res = await API.get(`/tasks/${id}`);
      if (!res.success) return;

      const task = res.data;
      const modal = document.getElementById('task-detail-modal');
      const content = document.getElementById('task-detail-content');
      if (!modal || !content) return;

      const isCompleted = task.status === 'Completed';
      const createdFormatted = new Date(task.createdAt).toLocaleString();
      const updatedFormatted = new Date(task.updatedAt).toLocaleString();
      const dueFormatted = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None';

      const prioClasses = { Low: 'badge-low', Medium: 'badge-med', High: 'badge-high', Urgent: 'badge-urgent' };
      const prioClass = prioClasses[task.priority] || 'badge-med';

      const subtasksCount = task.subtasks ? task.subtasks.length : 0;
      const completedCount = task.subtasks ? task.subtasks.filter((s) => s.completed).length : 0;
      const subtaskPct = subtasksCount > 0 ? Math.round((completedCount / subtasksCount) * 100) : 0;

      content.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">
          <div style="display:flex;gap:0.5rem;align-items:center;">
            <span class="badge ${prioClass}">${task.priority} Priority</span>
            <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
            ${task.category ? `<span class="badge badge-med" style="color:${task.category.color};border-color:${task.category.color};">${task.category.icon || '📁'} ${task.category.name}</span>` : ''}
          </div>
          <button class="btn btn-sm ${task.isFavorite ? 'btn-primary' : 'btn-outline'}" onclick="Tasks.toggleFavorite('${task._id}')">
            ${task.isFavorite ? '⭐ Favorited' : '☆ Add Favorite'}
          </button>
        </div>

        <h2 style="font-size:1.4rem;margin-bottom:0.75rem;line-height:1.3;${isCompleted ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${task.title}</h2>

        ${task.description ? `<p style="font-size:0.9375rem;color:var(--text-secondary);margin-bottom:1.25rem;white-space:pre-wrap;line-height:1.6;">${task.description}</p>` : '<p style="color:var(--text-muted);font-style:italic;margin-bottom:1.25rem;">No description provided.</p>'}

        <!-- Subtasks Section -->
        <div style="margin-bottom:1.5rem;background:var(--bg-tertiary);padding:1rem;border-radius:var(--radius-md);border:1px solid var(--border-glass);">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
            <h4 style="font-size:0.875rem;font-weight:700;">Subtasks (${completedCount}/${subtasksCount})</h4>
            <span style="font-size:0.75rem;font-weight:700;color:var(--text-secondary);">${subtaskPct}% Done</span>
          </div>
          <div class="stat-progress-bar" style="margin-top:0;margin-bottom:0.75rem;">
            <div class="stat-progress-fill" style="width: ${subtaskPct}%;"></div>
          </div>
          <div id="detail-subtasks-list">
            ${subtasksCount === 0 ? '<span style="font-size:0.8125rem;color:var(--text-muted);">No subtasks attached</span>' : task.subtasks.map((st, i) => `
              <label style="display:flex;align-items:center;gap:0.6rem;padding:0.35rem 0;cursor:pointer;font-size:0.875rem;">
                <input type="checkbox" class="task-checkbox" ${st.completed ? 'checked' : ''} onchange="Tasks.toggleDetailSubtask('${task._id}', ${i}, this.checked)" />
                <span style="${st.completed ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${st.title}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Tags -->
        <div style="margin-bottom:1.25rem;">
          <h4 style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);margin-bottom:0.35rem;">TAGS</h4>
          <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
            ${task.tags && task.tags.length > 0 ? task.tags.map((t) => `<span class="tag-pill">#${t}</span>`).join('') : '<span style="color:var(--text-muted);font-size:0.8125rem;">None</span>'}
          </div>
        </div>

        <!-- Notes -->
        ${task.notes ? `
          <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.8125rem;font-weight:700;color:var(--text-muted);margin-bottom:0.35rem;">ADDITIONAL NOTES</h4>
            <div style="background:var(--bg-input);padding:0.75rem;border-radius:var(--radius-md);font-size:0.8125rem;color:var(--text-secondary);border:1px solid var(--border-subtle);">${task.notes}</div>
          </div>
        ` : ''}

        <!-- Timestamps -->
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;font-size:0.75rem;color:var(--text-muted);padding-top:1rem;border-top:1px solid var(--border-glass);">
          <div><strong>Due Date:</strong><br>${dueFormatted}</div>
          <div><strong>Created:</strong><br>${createdFormatted}</div>
          <div><strong>Last Modified:</strong><br>${updatedFormatted}</div>
        </div>

        <!-- Action Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-glass);">
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-sm ${isCompleted ? 'btn-secondary' : 'btn-success'}" onclick="Tasks.toggleTaskComplete('${task._id}', ${!isCompleted})">
              ${isCompleted ? '↺ Restore to To Do' : '✓ Complete Task'}
            </button>
            <button class="btn btn-sm btn-outline" onclick="Tasks.toggleArchive('${task._id}')">
              ${task.status === 'Archived' ? '📤 Unarchive' : '📦 Archive'}
            </button>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-sm btn-secondary" onclick="Tasks.openEditModal('${task._id}')">✏️ Edit</button>
            <button class="btn btn-sm btn-secondary" onclick="Tasks.duplicateTask('${task._id}')">📋 Duplicate</button>
            <button class="btn btn-sm btn-danger" onclick="Tasks.confirmDelete('${task._id}', '${task.title.replace(/'/g, "\\'")}')">🗑️ Delete</button>
          </div>
        </div>
      `;

      modal.classList.add('active');
    } catch (err) {
      Toast.error(err.message, 'Task Details Error');
    }
  },

  closeDetailModal() {
    const modal = document.getElementById('task-detail-modal');
    if (modal) modal.classList.remove('active');
  },

  async toggleDetailSubtask(taskId, subtaskIdx, completed) {
    try {
      const res = await API.get(`/tasks/${taskId}`);
      if (!res.success) return;
      const subtasks = res.data.subtasks;
      subtasks[subtaskIdx].completed = completed;
      await API.patch(`/tasks/${taskId}/subtasks`, { subtasks });
      Toast.info('Subtask progress updated');
      this.openDetailModal(taskId);
      this.fetchAndRender();
      if (window.Kanban) Kanban.loadBoard();
    } catch (err) {
      Toast.error(err.message);
    }
  },

  exportCSV() {
    const token = API.getToken();
    const downloadUrl = `/api/tasks/export/csv`;
    
    // Fetch with authorization header and download blob
    fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        Toast.success('Tasks exported to CSV successfully');
      })
      .catch((err) => Toast.error(err.message, 'Export Error'));
  },
};

window.Tasks = Tasks;
