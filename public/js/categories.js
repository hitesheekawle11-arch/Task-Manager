/**
 * Categories Management Module
 */

const Categories = {
  list: [],

  async fetchAll() {
    try {
      const res = await API.get('/categories');
      if (res.success) {
        this.list = res.data;
        this.populateDropdowns();
        return this.list;
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
    return [];
  },

  populateDropdowns() {
    // Populate task modal category select
    const taskCatSelect = document.getElementById('task-category');
    if (taskCatSelect) {
      const currentValue = taskCatSelect.value;
      taskCatSelect.innerHTML = `<option value="">Select a Category</option>` +
        this.list
          .map(
            (c) => `<option value="${c._id}">${c.icon || '📁'} ${c.name}</option>`
          )
          .join('');
      if (currentValue) taskCatSelect.value = currentValue;
    }

    // Populate filter dropdown
    const filterCatSelect = document.getElementById('filter-category');
    if (filterCatSelect) {
      const currentFilter = filterCatSelect.value;
      filterCatSelect.innerHTML = `<option value="">All Categories</option>` +
        this.list
          .map(
            (c) => `<option value="${c._id}">${c.icon || '📁'} ${c.name} (${c.taskCounts ? c.taskCounts.total : 0})</option>`
          )
          .join('') +
        `<option value="uncategorized">📁 Uncategorized</option>`;
      if (currentFilter) filterCatSelect.value = currentFilter;
    }
  },

  renderCategoriesPage() {
    const container = document.getElementById('categories-list-container');
    if (!container) return;

    if (this.list.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <h3>No Categories Yet</h3>
          <p>Organize your tasks into projects and categories like Work, College, or Personal.</p>
          <button class="btn btn-primary" onclick="Categories.openCreateModal()">+ Create Category</button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="grid-3">
        ${this.list
          .map(
            (cat) => `
          <div class="stat-card" style="border-top: 4px solid ${cat.color};">
            <div class="stat-card-top">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <span style="font-size: 1.6rem;">${cat.icon || '📁'}</span>
                <div>
                  <h4 style="font-size:1.1rem;color:var(--text-primary);">${cat.name}</h4>
                  <p style="font-size:0.75rem;color:var(--text-muted);">${cat.description || 'No description'}</p>
                </div>
              </div>
              <div style="display:flex;gap:0.35rem;">
                <button class="btn btn-icon btn-secondary btn-sm" onclick="Categories.openEditModal('${cat._id}')" title="Edit Category">✏️</button>
                <button class="btn btn-icon btn-danger btn-sm" onclick="Categories.confirmDelete('${cat._id}', '${cat.name}')" title="Delete Category">🗑️</button>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:1.25rem;padding-top:0.75rem;border-top:1px solid var(--border-glass);">
              <span style="font-size:0.8125rem;color:var(--text-secondary);">
                <strong>${cat.taskCounts ? cat.taskCounts.total : 0}</strong> Tasks
              </span>
              <div style="display:flex;gap:0.5rem;font-size:0.75rem;">
                <span class="badge badge-med">${cat.taskCounts ? cat.taskCounts.pending : 0} Pending</span>
                <span class="badge badge-low">${cat.taskCounts ? cat.taskCounts.completed : 0} Done</span>
              </div>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  },

  openCreateModal() {
    const modal = document.getElementById('category-modal');
    if (!modal) return;

    document.getElementById('category-modal-title').textContent = 'Create New Category';
    document.getElementById('category-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-color').value = '#6366f1';
    document.getElementById('category-icon').value = '📁';
    document.getElementById('category-desc').value = '';

    modal.classList.add('active');
  },

  openEditModal(id) {
    const cat = this.list.find((c) => c._id === id);
    if (!cat) return;

    const modal = document.getElementById('category-modal');
    if (!modal) return;

    document.getElementById('category-modal-title').textContent = 'Edit Category';
    document.getElementById('category-id').value = cat._id;
    document.getElementById('category-name').value = cat.name;
    document.getElementById('category-color').value = cat.color || '#6366f1';
    document.getElementById('category-icon').value = cat.icon || '📁';
    document.getElementById('category-desc').value = cat.description || '';

    modal.classList.add('active');
  },

  closeModal() {
    const modal = document.getElementById('category-modal');
    if (modal) modal.classList.remove('active');
  },

  async handleFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value.trim();
    const color = document.getElementById('category-color').value;
    const icon = document.getElementById('category-icon').value.trim() || '📁';
    const description = document.getElementById('category-desc').value.trim();

    if (!name) {
      Toast.error('Please enter a category name');
      return;
    }

    try {
      if (id) {
        await API.put(`/categories/${id}`, { name, color, icon, description });
        Toast.success('Category updated successfully');
      } else {
        await API.post('/categories', { name, color, icon, description });
        Toast.success('Category created successfully');
      }

      this.closeModal();
      await this.fetchAll();
      this.renderCategoriesPage();
      if (window.Tasks) Tasks.fetchAndRender();
    } catch (err) {
      Toast.error(err.message, 'Category Error');
    }
  },

  async confirmDelete(id, name) {
    if (!confirm(`Are you sure you want to delete category "${name}"? Tasks in this category will become Uncategorized.`)) {
      return;
    }

    try {
      await API.delete(`/categories/${id}`);
      Toast.success(`Category "${name}" deleted`);
      await this.fetchAll();
      this.renderCategoriesPage();
      if (window.Tasks) Tasks.fetchAndRender();
    } catch (err) {
      Toast.error(err.message, 'Delete Error');
    }
  },
};

window.Categories = Categories;
