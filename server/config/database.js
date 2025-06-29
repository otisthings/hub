import mysql from 'mysql2/promise';
import { promisify } from 'util';

let pool = null;

export async function initializeDatabase() {
  try {
    // Create MySQL connection pool
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'discord_ticketing',
      charset: 'utf8mb4',
      timezone: '+00:00',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });

    // Verify connection
    const connection = await pool.getConnection();
    await connection.release();
    console.log('? Connected to MySQL database');

    // Create tables
    await createTables();
    console.log('? Database tables initialized');
  } catch (error) {
    console.error('? Failed to connect to MySQL database:', error);
    throw error;
  }
}

async function createTables() {
  try {
    // Users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        discord_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) NOT NULL,
        discriminator VARCHAR(10) NOT NULL,
        avatar TEXT,
        roles JSON,
        is_admin BOOLEAN DEFAULT FALSE,
        is_hub_banned BOOLEAN DEFAULT FALSE,
        hub_ban_reason TEXT,
        hub_banned_by INT,
        hub_banned_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_discord_id (discord_id),
        INDEX idx_is_admin (is_admin),
        INDEX idx_is_hub_banned (is_hub_banned),
        FOREIGN KEY (hub_banned_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add hub ban columns if they don't exist
    try {
      await pool.execute(`
        ALTER TABLE users ADD COLUMN is_hub_banned BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE users ADD COLUMN hub_ban_reason TEXT
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE users ADD COLUMN hub_banned_by INT
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE users ADD COLUMN hub_banned_at TIMESTAMP NULL
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE users ADD INDEX idx_is_hub_banned (is_hub_banned)
      `);
    } catch (error) {
      // Index already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE users ADD FOREIGN KEY (hub_banned_by) REFERENCES users (id) ON DELETE SET NULL
      `);
    } catch (error) {
      // Foreign key already exists
    }

    // Categories table - Add is_restricted column
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        required_role_id VARCHAR(255),
        color VARCHAR(7) DEFAULT '#5865F2',
        is_restricted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        INDEX idx_required_role (required_role_id),
        INDEX idx_is_restricted (is_restricted),
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add is_restricted column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE categories ADD COLUMN is_restricted BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE categories ADD INDEX idx_is_restricted (is_restricted)
      `);
    } catch (error) {
      // Index already exists
    }

    // Tickets table - Add claimed_by column
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        status ENUM('open', 'in_progress', 'closed', 'cancelled') DEFAULT 'open',
        category_id INT,
        user_id INT NOT NULL,
        assigned_to INT,
        claimed_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        closed_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_category (category_id),
        INDEX idx_user (user_id),
        INDEX idx_assigned (assigned_to),
        INDEX idx_claimed (claimed_by),
        INDEX idx_created (created_at),
        FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (claimed_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add claimed_by column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE tickets ADD COLUMN claimed_by INT
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE tickets ADD INDEX idx_claimed (claimed_by)
      `);
    } catch (error) {
      // Index already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE tickets ADD FOREIGN KEY (claimed_by) REFERENCES users (id) ON DELETE SET NULL
      `);
    } catch (error) {
      // Foreign key already exists
    }

    // Remove priority column if it exists
    try {
      await pool.execute(`
        ALTER TABLE tickets DROP COLUMN priority
      `);
    } catch (error) {
      // Column doesn't exist, which is fine
    }

    // Ticket participants table - NEW for manual user addition
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        added_by INT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_ticket_user (ticket_id, user_id),
        INDEX idx_ticket (ticket_id),
        INDEX idx_user (user_id),
        INDEX idx_added_by (added_by),
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ticket messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        message TEXT NOT NULL,
        is_staff_reply BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket (ticket_id),
        INDEX idx_user (user_id),
        INDEX idx_created (created_at),
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Ticket logs table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ticket_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        user_id INT NOT NULL,
        action VARCHAR(255) NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_ticket (ticket_id),
        INDEX idx_user (user_id),
        INDEX idx_created (created_at),
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Application forms table - ADDED webhook fields
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS application_forms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        questions JSON NOT NULL,
        admin_role_id VARCHAR(255),
        moderator_role_id VARCHAR(255),
        viewer_role_id VARCHAR(255),
        accepted_roles JSON,
        category VARCHAR(255) DEFAULT 'General',
        webhook_url TEXT,
        webhook_role_id VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        INDEX idx_active (is_active),
        INDEX idx_admin_role (admin_role_id),
        INDEX idx_moderator_role (moderator_role_id),
        INDEX idx_viewer_role (viewer_role_id),
        INDEX idx_category (category),
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add viewer_role_id column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE application_forms ADD COLUMN viewer_role_id VARCHAR(255)
      `);
    } catch (error) {
      // Column already exists, which is fine
    }

    try {
      await pool.execute(`
        ALTER TABLE application_forms ADD INDEX idx_viewer_role (viewer_role_id)
      `);
    } catch (error) {
      // Index already exists, which is fine
    }

    // Add webhook columns if they don't exist
    try {
      await pool.execute(`
        ALTER TABLE application_forms ADD COLUMN webhook_url TEXT
      `);
    } catch (error) {
      // Column already exists, which is fine
    }

    try {
      await pool.execute(`
        ALTER TABLE application_forms ADD COLUMN webhook_role_id VARCHAR(255)
      `);
    } catch (error) {
      // Column already exists, which is fine
    }

    // Add category column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE application_forms ADD COLUMN category VARCHAR(255) DEFAULT 'General'
      `);
    } catch (error) {
      // Column already exists, which is fine
    }

    // Application submissions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS application_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        form_id INT NOT NULL,
        user_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'denied') DEFAULT 'pending',
        responses JSON NOT NULL,
        admin_notes TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP NULL,
        reviewed_by INT,
        INDEX idx_form (form_id),
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_submitted (submitted_at),
        FOREIGN KEY (form_id) REFERENCES application_forms (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Drop the unique constraint if it exists
    try {
      await pool.execute(`
        ALTER TABLE application_submissions DROP INDEX unique_user_form_pending
      `);
    } catch (error) {
      // Index doesn't exist, which is fine
    }

    // System settings table for branding
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_setting_key (setting_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Self-assignable roles table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS self_assignable_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon_url TEXT,
        emoji VARCHAR(255),
        can_add BOOLEAN DEFAULT TRUE,
        can_remove BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_role_id (role_id),
        INDEX idx_is_active (is_active),
        INDEX idx_display_order (display_order),
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // UPDATED: Departments table - Add disable_callsigns column
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        db_name VARCHAR(255) NOT NULL,
        callsign_prefix VARCHAR(10) NOT NULL,
        roster_view_id VARCHAR(255) NOT NULL,
        classification ENUM('department', 'organization') DEFAULT 'department',
        disable_callsigns BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_classification (classification),
        INDEX idx_is_active (is_active),
        INDEX idx_db_name (db_name),
        INDEX idx_roster_view_id (roster_view_id),
        INDEX idx_disable_callsigns (disable_callsigns),
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Add disable_callsigns column if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE departments ADD COLUMN disable_callsigns BOOLEAN DEFAULT FALSE
      `);
    } catch (error) {
      // Column already exists
    }

    try {
      await pool.execute(`
        ALTER TABLE departments ADD INDEX idx_disable_callsigns (disable_callsigns)
      `);
    } catch (error) {
      // Index already exists
    }

    // Update existing departments table if roster_view_id is still JSON
    try {
      await pool.execute(`
        ALTER TABLE departments MODIFY COLUMN roster_view_id VARCHAR(255) NOT NULL
      `);
    } catch (error) {
      // Column already correct type
    }

    try {
      await pool.execute(`
        ALTER TABLE departments ADD INDEX idx_roster_view_id (roster_view_id)
      `);
    } catch (error) {
      // Index already exists
    }

    // UPDATED: Department roster table - Make callsign fields nullable for departments with disabled callsigns
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS department_roster (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_id INT NOT NULL,
        discord_id VARCHAR(255) NOT NULL,
        callsign_number VARCHAR(10),
        full_callsign VARCHAR(20),
        added_by INT NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_dept_discord (department_id, discord_id),
        INDEX idx_department (department_id),
        INDEX idx_discord_id (discord_id),
        INDEX idx_callsign (full_callsign),
        FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
        FOREIGN KEY (added_by) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Update existing roster table to make callsign fields nullable
    try {
      await pool.execute(`
        ALTER TABLE department_roster MODIFY COLUMN callsign_number VARCHAR(10)
      `);
    } catch (error) {
      // Column already correct type
    }

    try {
      await pool.execute(`
        ALTER TABLE department_roster MODIFY COLUMN full_callsign VARCHAR(20)
      `);
    } catch (error) {
      // Column already correct type
    }

    // Drop unique constraint on callsign if it exists (since callsigns can be null now)
    try {
      await pool.execute(`
        ALTER TABLE department_roster DROP INDEX unique_dept_callsign
      `);
    } catch (error) {
      // Index doesn't exist, which is fine
    }

    // Create default category if none exist
    const [existingCategories] = await pool.execute('SELECT COUNT(*) as count FROM categories');
    if (existingCategories[0].count === 0) {
      await pool.execute(`
        INSERT INTO categories (name, description, color, is_restricted)
        VALUES ('General Support', 'General support and questions', '#5865F2', FALSE)
      `);
    }

    // Sessions table for storing session data
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        expires BIGINT,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expires (expires)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

export function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}

export async function runQuery(sql, params = []) {
  try {
    const [result] = await pool.execute(sql, params);
    return {
      affectedRows: result.affectedRows,
      changedRows: result.changedRows,
      insertId: result.insertId
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows[0] || null;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function allQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeDatabase() {
  if (pool) {
    await pool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabase();
  process.exit(0);
});