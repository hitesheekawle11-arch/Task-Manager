const { supabase } = require('../config/supabase');

class CategoryInstance {
  constructor(data) {
    Object.assign(this, data);
    this._id = this.id;
    this.user = this.user_id || this.user;
    this.createdAt = this.created_at || this.createdAt || new Date().toISOString();
    this.updatedAt = this.updated_at || this.updatedAt || new Date().toISOString();
  }

  toObject() {
    return {
      _id: this.id,
      id: this.id,
      name: this.name,
      color: this.color,
      description: this.description,
      icon: this.icon,
      user: this.user_id || this.user,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    const updates = {};
    if (this.name !== undefined) updates.name = this.name.trim();
    if (this.color !== undefined) updates.color = this.color;
    if (this.description !== undefined) updates.description = this.description;
    if (this.icon !== undefined) updates.icon = this.icon;

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, data);
    this._id = this.id;
    this.user = this.user_id;
    return this;
  }

  async deleteOne() {
    const { error } = await supabase.from('categories').delete().eq('id', this.id);
    if (error) throw new Error(error.message);
    return true;
  }
}

class CategoryModel {
  static formatRow(row) {
    if (!row) return null;
    return new CategoryInstance(row);
  }

  static find(filter = {}) {
    const query = {
      userId: filter.user || filter.user_id,
      sortColumn: 'name',
      sortAsc: true,
      sort: function (options) {
        if (options && options.name !== undefined) {
          this.sortColumn = 'name';
          this.sortAsc = options.name === 1;
        }
        return this;
      },
      then: async (resolve, reject) => {
        try {
          let req = supabase.from('categories').select('*');
          if (query.userId) {
            req = req.eq('user_id', query.userId);
          }
          req = req.order(query.sortColumn || 'name', { ascending: query.sortAsc !== false });

          const { data, error } = await req;
          if (error) return reject(new Error(error.message));
          const instances = (data || []).map((c) => CategoryModel.formatRow(c));
          resolve(instances);
        } catch (err) {
          reject(err);
        }
      },
    };
    return query;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return CategoryModel.formatRow(data);
  }

  static async findOne(filter = {}) {
    let req = supabase.from('categories').select('*');

    const userId = filter.user || filter.user_id;
    if (userId) {
      req = req.eq('user_id', userId);
    }

    if (filter.name) {
      req = req.ilike('name', filter.name.trim());
    }

    if (filter._id && filter._id.$ne) {
      req = req.neq('id', filter._id.$ne);
    } else if (filter.id && filter.id.$ne) {
      req = req.neq('id', filter.id.$ne);
    } else if (filter._id) {
      req = req.eq('id', filter._id);
    } else if (filter.id) {
      req = req.eq('id', filter.id);
    }

    const { data, error } = await req.maybeSingle();
    if (error) throw new Error(error.message);
    return CategoryModel.formatRow(data);
  }

  static async create(catData) {
    const row = {
      name: catData.name.trim(),
      color: catData.color || '#6366f1',
      description: catData.description || '',
      icon: catData.icon || '📁',
      user_id: catData.user || catData.user_id,
    };

    const { data, error } = await supabase.from('categories').insert(row).select().single();
    if (error) throw new Error(error.message);
    return CategoryModel.formatRow(data);
  }

  static async insertMany(categoriesArray) {
    const rows = categoriesArray.map((c) => ({
      name: c.name.trim(),
      color: c.color || '#6366f1',
      description: c.description || '',
      icon: c.icon || '📁',
      user_id: c.user || c.user_id,
    }));

    const { data, error } = await supabase.from('categories').insert(rows).select();
    if (error) throw new Error(error.message);
    return (data || []).map((r) => CategoryModel.formatRow(r));
  }

  static async deleteMany(filter = {}) {
    let req = supabase.from('categories').delete();
    const userId = filter.user || filter.user_id;
    if (userId) {
      req = req.eq('user_id', userId);
    } else {
      req = req.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await req;
    if (error) throw new Error(error.message);
    return data;
  }
}

module.exports = CategoryModel;
