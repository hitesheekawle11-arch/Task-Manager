const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

let supabaseInstance = null;

function getIsConfigured() {
  // Always re-read from env (not cached) so dotenv can load first
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-project') &&
    !key.includes('your-supabase')
  );
}

// ==============================================================================
// EMBEDDED IN-MEMORY POSTGREST EMULATOR
// Provides seamless zero-config fallback if external Supabase is not yet linked
// ==============================================================================
class MemoryStorage {
  constructor() {
    this.tables = {
      users: [],
      categories: [],
      tasks: [],
    };
  }

  getTable(name) {
    if (!this.tables[name]) {
      this.tables[name] = [];
    }
    return this.tables[name];
  }
}

const memoryStore = new MemoryStorage();

class MemoryQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
    this.selectedColumns = '*';
    this.countOption = null;
    this.isHead = false;
    this.filters = [];
    this.orFilters = [];
    this.sortFields = [];
    this.rangeLimit = null;
    this.rangeOffset = 0;
    this.joins = [];
    this.isSingle = false;
    this.isMaybeSingle = false;
    this.action = 'select'; // select, insert, update, delete
    this.payload = null;
  }

  select(columns = '*', options = {}) {
    this.selectedColumns = columns;
    if (options.count) {
      this.countOption = options.count;
    }
    if (options.head) {
      this.isHead = true;
    }
    // Parse joins like "*, category:categories(id, name, color, icon)"
    if (typeof columns === 'string' && columns.includes(':')) {
      const joinMatches = columns.match(/([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\(([^)]+)\)/g);
      if (joinMatches) {
        for (const jm of joinMatches) {
          const parts = jm.match(/([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)\(([^)]+)\)/);
          if (parts) {
            this.joins.push({
              alias: parts[1],
              table: parts[2],
              fields: parts[3].split(',').map((f) => f.trim()),
            });
          }
        }
      }
    }
    return this;
  }

  insert(data) {
    this.action = 'insert';
    this.payload = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this.action = 'update';
    this.payload = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column, value) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column, value) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  gt(column, value) {
    this.filters.push((row) => {
      if (row[column] === null || row[column] === undefined) return false;
      return new Date(row[column]) > new Date(value);
    });
    return this;
  }

  gte(column, value) {
    this.filters.push((row) => {
      if (row[column] === null || row[column] === undefined) return false;
      return new Date(row[column]) >= new Date(value);
    });
    return this;
  }

  lt(column, value) {
    this.filters.push((row) => {
      if (row[column] === null || row[column] === undefined) return false;
      return new Date(row[column]) < new Date(value);
    });
    return this;
  }

  lte(column, value) {
    this.filters.push((row) => {
      if (row[column] === null || row[column] === undefined) return false;
      return new Date(row[column]) <= new Date(value);
    });
    return this;
  }

  ilike(column, pattern) {
    const regexStr = pattern.replace(/%/g, '.*');
    const regex = new RegExp(`^${regexStr}$`, 'i');
    this.filters.push((row) => regex.test(String(row[column] || '')));
    return this;
  }

  is(column, value) {
    this.filters.push((row) => (value === null ? row[column] === null || row[column] === undefined : row[column] === value));
    return this;
  }

  in(column, values) {
    const set = new Set(values);
    this.filters.push((row) => set.has(row[column]));
    return this;
  }

  not(column, operator, value) {
    if (operator === 'in') {
      let parsedValues = [];
      if (typeof value === 'string') {
        parsedValues = value.replace(/^\(|\)$/g, '').split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      } else if (Array.isArray(value)) {
        parsedValues = value;
      }
      const set = new Set(parsedValues);
      this.filters.push((row) => !set.has(row[column]));
    }
    return this;
  }

  contains(column, value) {
    this.filters.push((row) => {
      const rowVal = row[column];
      if (!rowVal) return false;
      const target = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(rowVal) && Array.isArray(target)) {
        return target.every((t) => rowVal.includes(t));
      }
      return false;
    });
    return this;
  }

  or(filterString) {
    // Example: "title.ilike.%test%,description.ilike.%test%"
    const conditions = filterString.split(',').map((c) => c.trim());
    this.filters.push((row) => {
      return conditions.some((cond) => {
        const [col, op, val] = cond.split('.');
        if (op === 'ilike') {
          const regexStr = (val || '').replace(/%/g, '.*');
          const regex = new RegExp(regexStr, 'i');
          return regex.test(String(row[col] || ''));
        }
        if (op === 'eq') return row[col] === val;
        return false;
      });
    });
    return this;
  }

  order(column, options = {}) {
    this.sortFields.push({
      column,
      ascending: options.ascending !== false,
      nullsFirst: options.nullsFirst || false,
    });
    return this;
  }

  limit(count) {
    this.rangeLimit = count;
    return this;
  }

  range(from, to) {
    this.rangeOffset = from;
    this.rangeLimit = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(resolve, reject) {
    try {
      const res = await this.execute();
      resolve(res);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err, count: 0 });
    }
  }

  async execute() {
    const table = memoryStore.getTable(this.tableName);

    if (this.action === 'insert') {
      const insertedRows = [];
      const now = new Date().toISOString();
      for (const item of this.payload) {
        const row = {
          id: item.id || crypto.randomUUID(),
          ...item,
          created_at: item.created_at || now,
          updated_at: item.updated_at || now,
        };
        // Auto set completed_at
        if (this.tableName === 'tasks') {
          if (row.status === 'Completed' && !row.completed_at) {
            row.completed_at = now;
          }
        }
        table.push(row);
        insertedRows.push({ ...row });
      }

      if (this.isSingle || this.isMaybeSingle) {
        return { data: insertedRows[0] || null, error: null };
      }
      return { data: insertedRows, error: null };
    }

    if (this.action === 'update') {
      const now = new Date().toISOString();
      let updatedRows = [];
      for (let i = 0; i < table.length; i++) {
        let match = true;
        for (const filter of this.filters) {
          if (!filter(table[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          const oldStatus = table[i].status;
          table[i] = {
            ...table[i],
            ...this.payload,
            updated_at: now,
          };
          if (this.tableName === 'tasks') {
            if (table[i].status === 'Completed' && oldStatus !== 'Completed') {
              table[i].completed_at = now;
            } else if (table[i].status !== 'Completed') {
              table[i].completed_at = null;
            }
          }
          updatedRows.push({ ...table[i] });
        }
      }

      if (this.isSingle || this.isMaybeSingle) {
        return { data: updatedRows[0] || null, error: null };
      }
      return { data: updatedRows, error: null };
    }

    if (this.action === 'delete') {
      const deletedRows = [];
      for (let i = table.length - 1; i >= 0; i--) {
        let match = true;
        for (const filter of this.filters) {
          if (!filter(table[i])) {
            match = false;
            break;
          }
        }
        if (match) {
          deletedRows.push(table[i]);
          table.splice(i, 1);
        }
      }
      return { data: deletedRows, error: null };
    }

    // Default: SELECT
    let result = table.filter((row) => {
      for (const filter of this.filters) {
        if (!filter(row)) return false;
      }
      return true;
    });

    const totalCount = result.length;

    // Sorting
    if (this.sortFields.length > 0) {
      result.sort((a, b) => {
        for (const sort of this.sortFields) {
          const valA = a[sort.column];
          const valB = b[sort.column];
          if (valA === valB) continue;
          if (valA === null || valA === undefined) return sort.nullsFirst ? -1 : 1;
          if (valB === null || valB === undefined) return sort.nullsFirst ? 1 : -1;
          if (valA < valB) return sort.ascending ? -1 : 1;
          if (valA > valB) return sort.ascending ? 1 : -1;
        }
        return 0;
      });
    }

    // Pagination
    if (this.rangeOffset > 0 || this.rangeLimit !== null) {
      const start = this.rangeOffset || 0;
      const end = this.rangeLimit !== null ? start + this.rangeLimit : undefined;
      result = result.slice(start, end);
    }

    // Embed joins if needed
    if (this.joins.length > 0) {
      result = result.map((row) => {
        const copy = { ...row };
        for (const join of this.joins) {
          if (join.table === 'categories') {
            const catTable = memoryStore.getTable('categories');
            const cat = catTable.find((c) => c.id === row.category_id);
            if (cat) {
              const joinedCat = {};
              for (const f of join.fields) {
                joinedCat[f] = cat[f];
              }
              copy[join.alias] = joinedCat;
            } else {
              copy[join.alias] = null;
            }
          }
        }
        return copy;
      });
    }

    if (this.isSingle) {
      if (result.length === 0) {
        return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, count: 0 };
      }
      return { data: { ...result[0] }, error: null, count: 1 };
    }

    if (this.isMaybeSingle) {
      return { data: result.length > 0 ? { ...result[0] } : null, error: null, count: result.length };
    }

    return {
      data: result.map((r) => ({ ...r })),
      error: null,
      count: this.countOption ? totalCount : null,
    };
  }
}

class MemorySupabaseClient {
  from(tableName) {
    return new MemoryQueryBuilder(tableName);
  }

  async rpc(fnName, params) {
    return { data: null, error: null };
  }
}

// Lazy client factory — deferred until first use so dotenv has time to load
function getClient() {
  if (supabaseInstance) return supabaseInstance;

  const configured = getIsConfigured();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (configured) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      console.log(`🔌 Initialized Supabase client for remote target: ${url}`);
    } catch (err) {
      console.warn(`⚠️ Failed to instantiate Supabase client: ${err.message}`);
      supabaseInstance = new MemorySupabaseClient();
    }
  } else {
    console.log('ℹ️ Supabase environment variables not configured with active project URL.');
    console.log('⚡ Initialized embedded high-performance memory adapter for seamless local development.');
    supabaseInstance = new MemorySupabaseClient();
  }
  return supabaseInstance;
}

/**
 * Validates connection with Supabase
 */
async function checkConnection() {
  const client = getClient();
  const configured = getIsConfigured();
  const url = process.env.SUPABASE_URL;

  if (configured) {
    try {
      const { error } = await client.from('users').select('id', { head: true, count: 'exact' });
      if (error && error.code !== 'PGRST116') {
        console.warn(`⚠️ Supabase connection check warning: ${error.message}`);
        return { connected: false, mode: 'remote-warning', error: error.message };
      }
      return { connected: true, mode: 'remote-postgres', url };
    } catch (err) {
      console.warn(`⚠️ Could not reach remote Supabase: ${err.message}`);
      return { connected: false, mode: 'remote-unreachable', error: err.message };
    }
  }
  return { connected: true, mode: 'in-memory-adapter', message: 'Local zero-config development mode active' };
}

// Proxy object: transparently delegates all supabase calls to the lazy client
const supabaseProxy = new Proxy({}, {
  get(target, prop) {
    const client = getClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

module.exports = {
  get supabase() { return getClient(); },
  get isConfigured() { return getIsConfigured(); },
  checkConnection,
  memoryStore,
};
