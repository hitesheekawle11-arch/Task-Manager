const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/supabase');

class UserInstance {
  constructor(data) {
    Object.assign(this, data);
    this._id = this.id;
    this.themePreference = this.theme_preference || this.themePreference || 'dark';
    this.isActive = this.is_active !== undefined ? this.is_active : (this.isActive !== false);
    this.createdAt = this.created_at || this.createdAt || new Date().toISOString();
    this.updatedAt = this.updated_at || this.updatedAt || new Date().toISOString();
  }

  async matchPassword(enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
  }

  getSignedJwtToken() {
    return jwt.sign(
      { id: this.id || this._id, role: this.role },
      process.env.JWT_SECRET || 'fallback_secret_task_manager_2026',
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  toObject() {
    return {
      _id: this.id,
      id: this.id,
      name: this.name,
      email: this.email,
      role: this.role,
      avatar: this.avatar || '',
      bio: this.bio || '',
      themePreference: this.themePreference,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  async save() {
    const updates = {};
    if (this.name !== undefined) updates.name = this.name;
    if (this.email !== undefined) updates.email = this.email.toLowerCase();
    if (this.role !== undefined) updates.role = this.role;
    if (this.avatar !== undefined) updates.avatar = this.avatar;
    if (this.bio !== undefined) updates.bio = this.bio;
    if (this.themePreference !== undefined) updates.theme_preference = this.themePreference;
    if (this.isActive !== undefined) updates.is_active = this.isActive;

    // If password was updated with a plain text password, hash it
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(this.password, salt);
    } else if (this.password) {
      updates.password = this.password;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', this.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    Object.assign(this, data);
    this._id = this.id;
    return this;
  }

  async deleteOne() {
    const { error } = await supabase.from('users').delete().eq('id', this.id);
    if (error) throw new Error(error.message);
    return true;
  }
}

class UserModel {
  static formatRow(row) {
    if (!row) return null;
    return new UserInstance(row);
  }

  static findById(id) {
    const query = {
      selectCalled: false,
      select: function () {
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();

          if (error) return reject(new Error(error.message));
          resolve(UserModel.formatRow(data));
        } catch (err) {
          reject(err);
        }
      },
    };
    return query;
  }

  static findOne(filter = {}) {
    let email = filter.email;
    if (typeof email === 'string') {
      email = email.toLowerCase().trim();
    }

    const query = {
      selectFields: null,
      select: function (fields) {
        this.selectFields = fields;
        return this;
      },
      then: async (resolve, reject) => {
        try {
          let req = supabase.from('users').select('*');
          if (email) {
            req = req.ilike('email', email);
          }
          if (filter.id || filter._id) {
            req = req.eq('id', filter.id || filter._id);
          }

          const { data, error } = await req.maybeSingle();
          if (error) return reject(new Error(error.message));
          if (!data) return resolve(null);

          const instance = UserModel.formatRow(data);
          resolve(instance);
        } catch (err) {
          reject(err);
        }
      },
    };
    return query;
  }

  static async create(userData) {
    let hashedPassword = userData.password;
    if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(userData.password, salt);
    }

    const row = {
      name: userData.name ? userData.name.trim() : '',
      email: userData.email ? userData.email.toLowerCase().trim() : '',
      password: hashedPassword,
      role: userData.role || 'user',
      avatar: userData.avatar || '',
      bio: userData.bio || '',
      theme_preference: userData.themePreference || 'dark',
      is_active: userData.isActive !== undefined ? userData.isActive : true,
    };

    const { data, error } = await supabase.from('users').insert(row).select().single();
    if (error) throw new Error(error.message);
    return UserModel.formatRow(data);
  }

  static async findByIdAndUpdate(id, fieldsToUpdate, options = {}) {
    const updates = {};
    if (fieldsToUpdate.name !== undefined) updates.name = fieldsToUpdate.name;
    if (fieldsToUpdate.bio !== undefined) updates.bio = fieldsToUpdate.bio;
    if (fieldsToUpdate.avatar !== undefined) updates.avatar = fieldsToUpdate.avatar;
    if (fieldsToUpdate.themePreference !== undefined) updates.theme_preference = fieldsToUpdate.themePreference;
    if (fieldsToUpdate.role !== undefined) updates.role = fieldsToUpdate.role;
    if (fieldsToUpdate.isActive !== undefined) updates.is_active = fieldsToUpdate.isActive;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return UserModel.formatRow(data);
  }

  static async countDocuments(filter = {}) {
    let req = supabase.from('users').select('id', { count: 'exact', head: true });
    if (filter.isActive !== undefined) {
      req = req.eq('is_active', filter.isActive);
    }
    const { count, error } = await req;
    if (error) throw new Error(error.message);
    return count || 0;
  }

  static find(filter = {}) {
    const query = {
      sortOptions: { column: 'created_at', ascending: false },
      select: function () {
        return this;
      },
      sort: function (s) {
        if (s && s.createdAt === 1) {
          this.sortOptions = { column: 'created_at', ascending: true };
        } else {
          this.sortOptions = { column: 'created_at', ascending: false };
        }
        return this;
      },
      then: async (resolve, reject) => {
        try {
          const sortOpt = query.sortOptions || { column: 'created_at', ascending: false };
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .order(sortOpt.column, { ascending: sortOpt.ascending });

          if (error) return reject(new Error(error.message));
          const instances = (data || []).map((u) => UserModel.formatRow(u));
          resolve(instances);
        } catch (err) {
          reject(err);
        }
      },
    };
    return query;
  }

  static async deleteMany(filter = {}) {
    let req = supabase.from('users').delete();
    if (filter.user) {
      req = req.eq('id', filter.user);
    } else {
      req = req.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { data, error } = await req;
    if (error) throw new Error(error.message);
    return data;
  }
}

module.exports = UserModel;
