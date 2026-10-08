const Category = require('../models/Category');
const Task = require('../models/Task');

// @desc    Get all categories for the user (with task counts)
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ user: req.user.id }).sort({ name: 1 });

    // Aggregate task counts per category
    const categoryStats = await Promise.all(
      categories.map(async (cat) => {
        const total = await Task.countDocuments({ user: req.user.id, category: cat._id });
        const pending = await Task.countDocuments({
          user: req.user.id,
          category: cat._id,
          status: { $in: ['To Do', 'In Progress'] },
        });
        const completed = await Task.countDocuments({
          user: req.user.id,
          category: cat._id,
          status: 'Completed',
        });

        return {
          ...cat.toObject(),
          taskCounts: { total, pending, completed },
        };
      })
    );

    res.status(200).json({
      success: true,
      count: categoryStats.length,
      data: categoryStats,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, color, description, icon } = req.body;

    const existing = await Category.findOne({ user: req.user.id, name: name.trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || '#6366f1',
      description: description || '',
      icon: icon || '📁',
      user: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, color, description, icon } = req.body;

    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this category' });
    }

    // Check name collision if renaming
    if (name && name.trim() !== category.name) {
      const existing = await Category.findOne({
        user: req.user.id,
        name: name.trim(),
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another category with this name already exists',
        });
      }
      category.name = name.trim();
    }

    if (color) category.color = color;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;

    await category.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (category.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this category' });
    }

    // Unassign tasks belonging to this category
    await Task.updateMany(
      { user: req.user.id, category: category._id },
      { $set: { category: null } }
    );

    await category.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully and associated tasks unlinked',
    });
  } catch (err) {
    next(err);
  }
};
