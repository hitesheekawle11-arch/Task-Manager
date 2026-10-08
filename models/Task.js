const { supabase } = require('../config/supabase');

class TaskInstance {
  constructor(data) {
    Object.assign(this, data);
    this._id = this.id;
    this.user = this.user_id || this.user;
    this.dueDate = this.due_date !== undefined ? this.due_date : this.dueDate;
    this.isFavorite = this.is_favorite !== undefined ? Boolean(this.is_favorite) : Boolean(this.isFavorite);
    this.completedAt = this.completed_at !== undefined ? this.completed_at : this.completedAt;
    this.createdAt = this.created_at || this.createdAt || new Date().toISOString();
    this.updatedAt = this.updated_at || this.updatedAt || new Date().toISOString();
    this.order = this.order_index !== undefined ? this.order_index : (this.order || 0);
    this.tags = Array.isArray(this.tags) ? this.tags : [];
    this.subtasks = Array.isArray(this.subtasks) ? this.subtasks : [];

    // Format populated category if present
    if (this.category && typeof this.category === 'object') {
      this.category = {
        ...this.category,
        _id: this.category.id || this.category._id,
      };
    }
  }

  toObject() {
    return {
      _id: this.id,
      id: this.id,
      title: this.title,
      description: this.description || '',
      status: this.status,
      priority: this.priority,
      dueDate: this.dueDate,
      category: this.category,
      tags: this.tags,
      subtasks: this.subtasks,
      notes: this.notes || '',
      isFavorite: this.isFavorite,
      order: this.order,
      user: this.user,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    const now = new Date().toISOString();
    const updates = {};
    if (this.title !== undefined) updates.title = this.title.trim();
    if (this.description !== undefined) updates.description = this.description;
    if (this.status !== undefined) updates.status = this.status;
    if (this.priority !== undefined) updates.priority = this.priority;
    if (this.dueDate !== undefined) updates.due_date = this.dueDate ? new Date(this.dueDate).toISOString() : null;
    if (this.notes !== undefined) updates.notes = this.notes;
    if (this.isFavorite !== undefined) updates.is_favorite = Boolean(this.isFavorite);
    if (this.subtasks !== undefined) updates.subtasks = Array.isArray(this.subtasks) ? this.subtasks : [];
    if (this.tags !== undefined) updates.tags = Array.isArray(this.tags) ? this.tags : [];
    if (this.order !== undefined) updates.order_index = this.order;

    if (this.category !== undefined) {
      if (!this.category) {
        updates.category_id = null;
      } else if (typeof this.category === 'object') {
        updates.category_id = this.category.id || this.category._id;
      } else {
        updates.category_id = this.category;
      }
    }

    // Auto update completed_at
    if (this.status === 'Completed') {
      updates.completed_at = this.completedAt || now;
    } else if (this.status && this.status !== 'Completed') {
      updates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', this.id)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, TaskModel.formatRow(data));
    return this;
  }

  async deleteOne() {
    const { error } = await supabase.from('tasks').delete().eq('id', this.id);
    if (error) throw new Error(error.message);
    return true;
  }
}

class TaskQueryBuilder {
  constructor(initialQuery = {}) {
    this.filter = initialQuery;
    this.populateCategory = false;
    this.sortFields = [];
    this.skipCount = 0;
    this.limitCount = null;
    this.isSingle = false;
  }

  populate(field, selectFields) {
    if (field === 'category') {
      this.populateCategory = true;
    }
    return this;
  }

  sort(sortOptions) {
    if (sortOptions) {
      if (sortOptions.createdAt === 1) {
        this.sortFields.push({ column: 'created_at', ascending: true });
      } else if (sortOptions.createdAt === -1) {
        this.sortFields.push({ column: 'created_at', ascending: false });
      }

      if (sortOptions.dueDate === 1) {
        this.sortFields.unshift({ column: 'due_date', ascending: true, nullsFirst: false });
      } else if (sortOptions.dueDate === -1) {
        this.sortFields.unshift({ column: 'due_date', ascending: false, nullsFirst: false });
      }

      if (sortOptions.updatedAt === -1) {
        this.sortFields.push({ column: 'updated_at', ascending: false });
      }
    }
    return this;
  }

  skip(count) {
    this.skipCount = count || 0;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  buildSupabaseQuery() {
    const selectCols = this.populateCategory
      ? '*, category:categories(id, name, color, icon)'
      : '*, category:categories(id, name, color, icon)';

    let req = supabase.from('tasks').select(selectCols);

    // Apply user filter
    const userId = this.filter.user || this.filter.user_id;
    if (userId) {
      req = req.eq('user_id', userId);
    }

    // Apply status filter
    if (this.filter.status) {
      if (typeof this.filter.status === 'string') {
        req = req.eq('status', this.filter.status);
      } else if (this.filter.status.$ne) {
        req = req.neq('status', this.filter.status.$ne);
      } else if (this.filter.status.$nin) {
        req = req.not('status', 'in', `(${this.filter.status.$nin.map((s) => `"${s}"`).join(',')})`);
      }
    }

    // Priority
    if (this.filter.priority) {
      if (typeof this.filter.priority === 'string') {
        req = req.eq('priority', this.filter.priority);
      } else if (this.filter.priority.$in) {
        req = req.in('priority', this.filter.priority.$in);
      }
    }

    // Category
    if (this.filter.category !== undefined) {
      if (this.filter.category === null) {
        req = req.is('category_id', null);
      } else {
        req = req.eq('category_id', this.filter.category);
      }
    }

    // Favorite
    if (this.filter.isFavorite !== undefined) {
      req = req.eq('is_favorite', this.filter.isFavorite);
    }

    // Due date
    if (this.filter.dueDate !== undefined) {
      if (this.filter.dueDate === null) {
        req = req.is('due_date', null);
      } else if (this.filter.dueDate.$gte && this.filter.dueDate.$lte) {
        req = req
          .gte('due_date', new Date(this.filter.dueDate.$gte).toISOString())
          .lte('due_date', new Date(this.filter.dueDate.$lte).toISOString());
      } else if (this.filter.dueDate.$lt) {
        req = req.lt('due_date', new Date(this.filter.dueDate.$lt).toISOString());
      } else if (this.filter.dueDate.$gt) {
        req = req.gt('due_date', new Date(this.filter.dueDate.$gt).toISOString());
      }
    }

    // Tags ($in: [tag])
    if (this.filter.tags && this.filter.tags.$in && this.filter.tags.$in.length > 0) {
      const tag = this.filter.tags.$in[0];
      req = req.contains('tags', JSON.stringify([tag]));
    }

    // $or search
    if (this.filter.$or && Array.isArray(this.filter.$or)) {
      // Extract search string from regex if present
      let searchTerm = '';
      for (const cond of this.filter.$or) {
        if (cond.title && cond.title.source) {
          searchTerm = cond.title.source;
          break;
        } else if (typeof cond.title === 'string') {
          searchTerm = cond.title;
          break;
        }
      }
      if (searchTerm) {
        const clean = searchTerm.replace(/\\/g, '');
        req = req.or(`title.ilike.%${clean}%,description.ilike.%${clean}%`);
      }
    }

    // Sorting
    if (this.sortFields.length > 0) {
      for (const s of this.sortFields) {
        req = req.order(s.column, { ascending: s.ascending, nullsFirst: s.nullsFirst });
      }
    } else {
      req = req.order('created_at', { ascending: false });
    }

    // Pagination
    if (this.skipCount > 0 || this.limitCount !== null) {
      const from = this.skipCount || 0;
      const to = this.limitCount ? from + this.limitCount - 1 : from + 999;
      req = req.range(from, to);
    }

    return req;
  }

  async then(resolve, reject) {
    try {
      if (this.isSingle) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, category:categories(id, name, color, icon)')
          .eq('id', this.filter.id || this.filter._id)
          .maybeSingle();

        if (error) return reject(new Error(error.message));
        return resolve(TaskModel.formatRow(data));
      }

      const req = this.buildSupabaseQuery();
      const { data, error } = await req;
      if (error) return reject(new Error(error.message));

      const instances = (data || []).map((row) => TaskModel.formatRow(row));
      resolve(instances);
    } catch (err) {
      reject(err);
    }
  }
}

class TaskModel {
  static formatRow(row) {
    if (!row) return null;
    return new TaskInstance(row);
  }

  static find(query = {}) {
    return new TaskQueryBuilder(query);
  }

  static findById(id) {
    const builder = new TaskQueryBuilder({ id });
    builder.isSingle = true;
    return builder;
  }

  static async create(taskData) {
    const now = new Date().toISOString();
    let categoryId = null;
    if (taskData.category) {
      categoryId = typeof taskData.category === 'object'
        ? (taskData.category.id || taskData.category._id)
        : taskData.category;
    }

    const row = {
      title: taskData.title.trim(),
      description: taskData.description || '',
      status: taskData.status || 'To Do',
      priority: taskData.priority || 'Medium',
      due_date: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
      category_id: categoryId,
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      notes: taskData.notes || '',
      is_favorite: Boolean(taskData.isFavorite),
      order_index: taskData.order || 0,
      user_id: taskData.user || taskData.user_id,
      completed_at: taskData.status === 'Completed' ? (taskData.completedAt || now) : null,
    };

    const { data, error } = await supabase.from('tasks').insert(row).select().single();
    if (error) throw new Error(error.message);
    return TaskModel.formatRow(data);
  }

  static async insertMany(tasksArray) {
    const now = new Date().toISOString();
    const rows = tasksArray.map((t) => ({
      title: t.title.trim(),
      description: t.description || '',
      status: t.status || 'To Do',
      priority: t.priority || 'Medium',
      due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      category_id: t.category ? (t.category.id || t.category._id || t.category) : null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      notes: t.notes || '',
      is_favorite: Boolean(t.isFavorite),
      order_index: t.order || 0,
      user_id: t.user || t.user_id,
      completed_at: t.status === 'Completed' ? (t.completedAt ? new Date(t.completedAt).toISOString() : now) : null,
    }));

    const { data, error } = await supabase.from('tasks').insert(rows).select();
    if (error) throw new Error(error.message);
    return (data || []).map((r) => TaskModel.formatRow(r));
  }

  static async countDocuments(filter = {}) {
    let req = supabase.from('tasks').select('id', { count: 'exact', head: true });

    const userId = filter.user || filter.user_id;
    if (userId) {
      req = req.eq('user_id', userId);
    }

    if (filter.status) {
      if (typeof filter.status === 'string') {
        req = req.eq('status', filter.status);
      } else if (filter.status.$ne) {
        req = req.neq('status', filter.status.$ne);
      } else if (filter.status.$in) {
        req = req.in('status', filter.status.$in);
      } else if (filter.status.$nin) {
        req = req.not('status', 'in', `(${filter.status.$nin.map((s) => `"${s}"`).join(',')})`);
      }
    }

    if (filter.priority) {
      if (typeof filter.priority === 'string') {
        req = req.eq('priority', filter.priority);
      } else if (filter.priority.$in) {
        req = req.in('priority', filter.priority.$in);
      }
    }

    if (filter.category !== undefined) {
      if (filter.category === null) {
        req = req.is('category_id', null);
      } else {
        req = req.eq('category_id', filter.category);
      }
    }

    if (filter.isFavorite !== undefined) {
      req = req.eq('is_favorite', filter.isFavorite);
    }

    if (filter.dueDate !== undefined) {
      if (filter.dueDate === null) {
        req = req.is('due_date', null);
      } else if (filter.dueDate.$gte && filter.dueDate.$lte) {
        req = req
          .gte('due_date', new Date(filter.dueDate.$gte).toISOString())
          .lte('due_date', new Date(filter.dueDate.$lte).toISOString());
      } else if (filter.dueDate.$lt) {
        req = req.lt('due_date', new Date(filter.dueDate.$lt).toISOString());
      } else if (filter.dueDate.$gt) {
        req = req.gt('due_date', new Date(filter.dueDate.$gt).toISOString());
      }
    }

    const { count, error } = await req;
    if (error) throw new Error(error.message);
    return count || 0;
  }

  static async updateMany(filter = {}, update = {}) {
    const updates = {};
    if (update.$set) {
      if (update.$set.category !== undefined) {
        updates.category_id = update.$set.category;
      }
    }

    let req = supabase.from('tasks').update(updates);
    const userId = filter.user || filter.user_id;
    if (userId) req = req.eq('user_id', userId);
    if (filter.category) req = req.eq('category_id', filter.category);

    const { data, error } = await req;
    if (error) throw new Error(error.message);
    return data;
  }

  static async deleteMany(filter = {}) {
    let req = supabase.from('tasks').delete();
    const userId = filter.user || filter.user_id;
    if (userId) req = req.eq('user_id', userId);
    if (filter.category) req = req.eq('category_id', filter.category);
    if (!userId && !filter.category) {
      req = req.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await req;
    if (error) throw new Error(error.message);
    return data;
  }

  static async aggregate(pipeline = []) {
    // Determine the aggregation goal from pipeline stages
    const matchStage = pipeline.find((p) => p.$match);
    const groupStage = pipeline.find((p) => p.$group);

    if (!matchStage || !groupStage) return [];

    const userId = matchStage.$match.user;

    // Check if priority breakdown
    if (groupStage.$group._id === '$priority') {
      const { data, error } = await supabase
        .from('tasks')
        .select('priority')
        .eq('user_id', userId)
        .neq('status', 'Archived');

      if (error) throw new Error(error.message);

      const counts = {};
      (data || []).forEach((row) => {
        counts[row.priority] = (counts[row.priority] || 0) + 1;
      });

      return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
    }

    // Check if weekly productivity ($completedAt date grouping)
    if (groupStage.$group._id && groupStage.$group._id.$dateToString) {
      const dateGte = matchStage.$match.completedAt ? matchStage.$match.completedAt.$gte : null;
      let req = supabase
        .from('tasks')
        .select('completed_at')
        .eq('user_id', userId)
        .eq('status', 'Completed');

      if (dateGte) {
        req = req.gte('completed_at', new Date(dateGte).toISOString());
      }

      const { data, error } = await req;
      if (error) throw new Error(error.message);

      const dayCounts = {};
      (data || []).forEach((row) => {
        if (row.completed_at) {
          const dateStr = new Date(row.completed_at).toISOString().split('T')[0];
          dayCounts[dateStr] = (dayCounts[dateStr] || 0) + 1;
        }
      });

      return Object.entries(dayCounts).map(([_id, count]) => ({ _id, count }));
    }

    return [];
  }
}

module.exports = TaskModel;
