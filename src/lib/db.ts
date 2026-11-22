import mysql from 'mysql2/promise';

// Prevent multiple connection pools during hot-reloads in development
const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

export const pool =
  globalForDb.pool ||
  mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hidev_db',
    waitForConnections: true,
    connectionLimit: 20,
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    charset: 'utf8mb4',
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000,
    // Return DECIMAL/BIGINT as JS numbers so COUNT(*) etc. behave predictably
    // across the app (values here are always well within Number.MAX_SAFE_INTEGER).
    decimalNumbers: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

// Transient MySQL/network errors that are safe to retry.
const RETRYABLE_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'EPIPE',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
  'ER_CON_COUNT_ERROR',
  'ER_TOO_MANY_USER_CONNECTIONS',
]);

interface DbError {
  code?: string;
  message?: string;
}

/**
 * Central SQL access point for the whole application.
 *
 * Uses pool.query() (the text protocol with client-side parameter escaping)
 * rather than pool.execute() (server-side prepared statements) on purpose:
 *
 *  - The app issues many *dynamically shaped* statements (variable search
 *    tokens, dynamic `IN (...)` lists, optional filters). Prepared statements
 *    are cached per unique SQL string on the MySQL server and accumulate until
 *    `max_prepared_stmt_count` is exhausted — which manifests as a system that
 *    works initially then starts erroring/lagging under sustained load.
 *  - pool.query() also binds `LIMIT ?`/`OFFSET ?` and array-expanded `IN (?)`
 *    correctly, which the prepared-statement protocol does not.
 *
 * Parameters are still escaped by mysql2, so this remains injection-safe.
 * Includes bounded retry with exponential backoff for transient failures.
 */
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T> {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const [results] = await pool.query(sql, params);
      return results as T;
    } catch (error) {
      lastError = error;
      const code = (error as DbError)?.code;
      const isRetryable = code !== undefined && RETRYABLE_CODES.has(code);

      if (isRetryable && attempt < MAX_RETRIES) {
        const backoff = RETRY_DELAY_MS * attempt;
        console.warn(
          `DB query attempt ${attempt}/${MAX_RETRIES} failed (${code}), retrying in ${backoff}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      const message = (error as DbError)?.message ?? String(error);
      console.error(`Database query error: ${message}. SQL: ${sql}`);
      throw error;
    }
  }

  throw lastError || new Error('Query failed after max retries');
}

/**
 * Run a set of writes inside a single transaction on one pooled connection.
 * The connection is always released back to the pool. Use this for multi-step
 * writes that must be atomic (e.g. inserting a document plus its tags/images).
 */
export async function transaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback failures; original error is more relevant
    }
    throw error;
  } finally {
    conn.release();
  }
}

// Auto-run schema migrations (skip in tests to avoid open handles)
if (pool && process.env.NODE_ENV !== 'test') {
  // 1. Check & Alter users table
  pool.query(`
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'users' 
      AND COLUMN_NAME = 'session_version'
  `).then(async ([rows]: any) => {
    if (Array.isArray(rows) && rows.length === 0) {
      console.log('[DB] Session version column not found. Running migration...');
      try {
        await pool.query('ALTER TABLE users ADD COLUMN session_version INT DEFAULT 1');
        console.log('[DB] Migration successfully completed (added session_version to users).');
      } catch (err: any) {
        if (err.code !== 'ER_DUP_FIELDNAME') {
          console.error('[DB] Migration failed:', err);
        }
      }
    }
  }).catch((err) => {
    console.warn('[DB] Skip session_version migration:', err?.message || err);
  });

  // 2. Create LeetCode tables if not exists
  (async () => {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leetcode_solved (
          user_id INT NOT NULL,
          problem_slug VARCHAR(255) NOT NULL,
          solved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, problem_slug),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS leetcode_code_drafts (
          user_id INT NOT NULL,
          problem_slug VARCHAR(255) NOT NULL,
          lang VARCHAR(50) NOT NULL,
          code LONGTEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, problem_slug, lang),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS leetcode_submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          problem_slug VARCHAR(255) NOT NULL,
          lang VARCHAR(50) NOT NULL,
          status VARCHAR(100) NOT NULL,
          execution_time_ms INT DEFAULT NULL,
          code LONGTEXT DEFAULT NULL,
          submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      
      // Auto migrate: check and add code column if not exists in leetcode_submissions
      try {
        const [columns]: any = await pool.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'leetcode_submissions' 
            AND COLUMN_NAME = 'code'
        `);
        if (Array.isArray(columns) && columns.length === 0) {
          console.log('[DB] Code column in leetcode_submissions not found. Running migration...');
          await pool.query('ALTER TABLE leetcode_submissions ADD COLUMN code LONGTEXT DEFAULT NULL');
          console.log('[DB] Migration successfully completed (added code to leetcode_submissions).');
        }
      } catch (err: any) {
        console.warn('[DB] Skip leetcode_submissions code migration:', err?.message || err);
      }

      console.log('[DB] LeetCode OJ tables verification/migration successful.');
    } catch (err: any) {
      console.warn('[DB] LeetCode tables auto-migration failed:', err?.message || err);
    }
  })();
}

export default pool;
