const Task = require('../models/Task');
const Category = require('../models/Category');

// @desc    Get all tasks with filtering, search, sorting & pagination
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      tag,
      search,
      dueFilter, // 'today', 'overdue', 'upcoming', 'nodate'
      isFavorite,
      archived, // 'true', 'false', or 'all'
      sort, // 'newest', 'oldest', 'dueDate', 'priority', 'updated'
      page = 1,
      limit = 10,
    } = req.query;

    // Base query scoped to the logged-in user
    const query = { user: req.user.id };

    // Archive filter handling (by default don't show Archived unless explicitly asked)
    if (archived === 'true') {
      query.status = 'Archived';
    } else if (archived === 'all') {
      // Show all including archived
    } else if (status) {
      query.status = status;
    } else {
      query.status = { $ne: 'Archived' };
    }

    // Priority filter
    if (priority) {
      query.priority = priority;
    }

    // Category filter
    if (category) {
      if (category === 'uncategorized') {
        query.category = null;
      } else {
        query.category = category;
      }
    }

    // Tag filter
    if (tag) {
      query.tags = { $in: [tag] };
    }

    // Favorite filter
    if (isFavorite === 'true') {
      query.isFavorite = true;
    }

    // Due date filter
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dueFilter === 'today') {
      query.dueDate = { $gte: startOfToday, $lte: endOfToday };
    } else if (dueFilter === 'overdue') {
      query.dueDate = { $lt: startOfToday };
      query.status = { $nin: ['Completed', 'Archived'] };
    } else if (dueFilter === 'upcoming') {
      query.dueDate = { $gt: endOfToday };
    } else if (dueFilter === 'nodate') {
      query.dueDate = null;
    }

    // Search query in title, description, or tags
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // default newest
    if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    } else if (sort === 'dueDate') {
      sortOptions = { dueDate: 1, createdAt: -1 };
    } else if (sort === 'priority') {
      // We will sort priority in code or by created
      sortOptions = { createdAt: -1 };
    } else if (sort === 'updated') {
      sortOptions = { updatedAt: -1 };
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10);
    const skip = limitNum > 0 ? (pageNum - 1) * limitNum : 0;

    const totalTasks = await Task.countDocuments(query);

    let tasksQuery = Task.find(query)
      .populate('category', 'name color icon')
      .sort(sortOptions);

    if (limitNum > 0) {
      tasksQuery = tasksQuery.skip(skip).limit(limitNum);
    }

    let tasks = await tasksQuery;

    // Custom in-memory sort for priority if requested
    if (sort === 'priority') {
      const priorityWeights = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
      tasks = tasks.sort(
        (a, b) => (priorityWeights[b.priority] || 0) - (priorityWeights[a.priority] || 0)
      );
    }

    const totalPages = limitNum > 0 ? Math.ceil(totalTasks / limitNum) : 1;

    res.status(200).json({
      success: true,
      count: tasks.length,
      totalTasks,
      currentPage: pageNum,
      totalPages: totalPages === 0 ? 1 : totalPages,
      data: tasks,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id).populate('category', 'name color icon');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      category,
      tags,
      subtasks,
      notes,
      isFavorite,
    } = req.body;

    // Validate category ownership if provided
    let categoryId = null;
    if (category) {
      const catExists = await Category.findOne({ _id: category, user: req.user.id });
      if (catExists) {
        categoryId = catExists._id;
      }
    }

    // Format tags if array or string
    let parsedTags = [];
    if (Array.isArray(tags)) {
      parsedTags = tags.map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
    } else if (typeof tags === 'string') {
      parsedTags = tags
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      status: status || 'To Do',
      priority: priority || 'Medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      category: categoryId,
      tags: parsedTags,
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      notes: notes || '',
      isFavorite: Boolean(isFavorite),
      user: req.user.id,
      completedAt: status === 'Completed' ? new Date() : null,
    });

    const populatedTask = await Task.findById(task._id).populate('category', 'name color icon');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: populatedTask,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this task' });
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      category,
      tags,
      subtasks,
      notes,
      isFavorite,
    } = req.body;

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (notes !== undefined) task.notes = notes;
    if (isFavorite !== undefined) task.isFavorite = Boolean(isFavorite);
    if (subtasks !== undefined && Array.isArray(subtasks)) task.subtasks = subtasks;

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        task.tags = tags.map((t) => t.trim().replace(/^#/, '')).filter(Boolean);
      } else if (typeof tags === 'string') {
        task.tags = tags
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean);
      }
    }

    if (category !== undefined) {
      if (!category) {
        task.category = null;
      } else {
        const catExists = await Category.findOne({ _id: category, user: req.user.id });
        if (catExists) {
          task.category = catExists._id;
        }
      }
    }

    await task.save();

    const updatedTask = await Task.findById(task._id).populate('category', 'name color icon');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Patch task status (e.g. for drag and drop Kanban or quick toggle)
// @route   PATCH /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['To Do', 'In Progress', 'Completed', 'Archived'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();

    const updated = await Task.findById(task._id).populate('category', 'name color icon');

    res.status(200).json({
      success: true,
      message: `Task marked as ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Patch task archive / restore
// @route   PATCH /api/tasks/:id/archive
// @access  Private
exports.toggleTaskArchive = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this task' });
    }

    if (task.status === 'Archived') {
      task.status = 'To Do';
    } else {
      task.status = 'Archived';
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: task.status === 'Archived' ? 'Task archived' : 'Task restored from archive',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Duplicate task
// @route   POST /api/tasks/:id/duplicate
// @access  Private
exports.duplicateTask = async (req, res, next) => {
  try {
    const original = await Task.findById(req.params.id);
    if (!original) {
      return res.status(404).json({ success: false, message: 'Original task not found' });
    }

    if (original.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to duplicate this task' });
    }

    const duplicate = await Task.create({
      title: `${original.title} (Copy)`,
      description: original.description,
      status: 'To Do',
      priority: original.priority,
      dueDate: original.dueDate,
      category: original.category,
      tags: [...original.tags],
      subtasks: original.subtasks.map((st) => ({ title: st.title, completed: false })),
      notes: original.notes,
      user: req.user.id,
    });

    const populated = await Task.findById(duplicate._id).populate('category', 'name color icon');

    res.status(201).json({
      success: true,
      message: 'Task duplicated successfully',
      data: populated,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle task favorite
// @route   PATCH /api/tasks/:id/favorite
// @access  Private
exports.toggleFavorite = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    task.isFavorite = !task.isFavorite;
    await task.save();

    res.status(200).json({
      success: true,
      message: task.isFavorite ? 'Added to favorites' : 'Removed from favorites',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update subtasks
// @route   PATCH /api/tasks/:id/subtasks
// @access  Private
exports.updateSubtasks = async (req, res, next) => {
  try {
    const { subtasks } = req.body;
    if (!Array.isArray(subtasks)) {
      return res.status(400).json({ success: false, message: 'Subtasks must be an array' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    task.subtasks = subtasks;
    await task.save();

    res.status(200).json({
      success: true,
      message: 'Subtasks updated',
      data: task,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/tasks/stats/summary
// @access  Private
exports.getTaskStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const totalTasks = await Task.countDocuments({ user: userId });
    const pendingTasks = await Task.countDocuments({ user: userId, status: 'To Do' });
    const inProgressTasks = await Task.countDocuments({ user: userId, status: 'In Progress' });
    const completedTasks = await Task.countDocuments({ user: userId, status: 'Completed' });
    const archivedTasks = await Task.countDocuments({ user: userId, status: 'Archived' });

    // Active tasks (excluding archived)
    const activeTasks = totalTasks - archivedTasks;
    const completionPercentage = activeTasks > 0 ? Math.round((completedTasks / activeTasks) * 100) : 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const overdueTasks = await Task.countDocuments({
      user: userId,
      dueDate: { $lt: startOfToday },
      status: { $nin: ['Completed', 'Archived'] },
    });

    const highPriorityTasks = await Task.countDocuments({
      user: userId,
      priority: { $in: ['High', 'Urgent'] },
      status: { $ne: 'Archived' },
    });

    const dueTodayCount = await Task.countDocuments({
      user: userId,
      dueDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'Archived' },
    });

    const upcomingCount = await Task.countDocuments({
      user: userId,
      dueDate: { $gt: endOfToday },
      status: { $ne: 'Archived' },
    });

    // Tasks by status breakdown
    const tasksByStatus = {
      'To Do': pendingTasks,
      'In Progress': inProgressTasks,
      Completed: completedTasks,
      Archived: archivedTasks,
    };

    // Tasks by priority breakdown
    const priorityCounts = await Task.aggregate([
      { $match: { user: req.user._id, status: { $ne: 'Archived' } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    const tasksByPriority = { Low: 0, Medium: 0, High: 0, Urgent: 0 };
    priorityCounts.forEach((p) => {
      if (tasksByPriority[p._id] !== undefined) {
        tasksByPriority[p._id] = p.count;
      }
    });

    // Weekly productivity (last 7 days completed tasks)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weeklyCompleted = await Task.aggregate([
      {
        $match: {
          user: req.user._id,
          status: 'Completed',
          completedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    // Build 7-day array
    const weeklyProductivity = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const found = weeklyCompleted.find((item) => item._id === dateStr);
      weeklyProductivity.push({
        date: dateStr,
        day: dayName,
        completed: found ? found.count : 0,
      });
    }

    // Recently created & Recently completed
    const recentlyCreated = await Task.find({ user: userId, status: { $ne: 'Archived' } })
      .populate('category', 'name color icon')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentlyCompleted = await Task.find({ user: userId, status: 'Completed' })
      .populate('category', 'name color icon')
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(5);

    // Tasks due today list
    const tasksDueToday = await Task.find({
      user: userId,
      dueDate: { $gte: startOfToday, $lte: endOfToday },
      status: { $ne: 'Archived' },
    })
      .populate('category', 'name color icon')
      .sort({ priority: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        archivedTasks,
        overdueTasks,
        highPriorityTasks,
        completionPercentage,
        dueTodayCount,
        upcomingCount,
        tasksByStatus,
        tasksByPriority,
        weeklyProductivity,
        recentlyCreated,
        recentlyCompleted,
        tasksDueToday,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export tasks to CSV
// @route   GET /api/tasks/export/csv
// @access  Private
exports.exportTasksCSV = async (req, res, next) => {
  try {
    const tasks = await Task.find({ user: req.user.id })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Category',
      'Tags',
      'Subtasks Count',
      'Subtasks Completed',
      'Due Date',
      'Created At',
      'Completed At',
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = tasks.map((task) => {
      const subtasksTotal = task.subtasks ? task.subtasks.length : 0;
      const subtasksDone = task.subtasks ? task.subtasks.filter((st) => st.completed).length : 0;
      const catName = task.category ? task.category.name : 'Uncategorized';
      const tagsStr = (task.tags || []).join(';');
      const dueDateStr = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';
      const createdStr = new Date(task.createdAt).toISOString().split('T')[0];
      const completedStr = task.completedAt ? new Date(task.completedAt).toISOString().split('T')[0] : '';

      return [
        escapeCsv(task._id),
        escapeCsv(task.title),
        escapeCsv(task.description),
        escapeCsv(task.status),
        escapeCsv(task.priority),
        escapeCsv(catName),
        escapeCsv(tagsStr),
        escapeCsv(subtasksTotal),
        escapeCsv(subtasksDone),
        escapeCsv(dueDateStr),
        escapeCsv(createdStr),
        escapeCsv(completedStr),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
