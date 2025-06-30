// Garage Database Models and Migrations
import { runQuery, getQuery, allQuery } from '../../../config/database.js';

export class GarageModels {
  // Create all garage tables
  static async createTables() {
    // Garage role permissions table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id VARCHAR(255) NOT NULL,
        can_view_manager BOOLEAN DEFAULT FALSE,
        can_generate_codes BOOLEAN DEFAULT FALSE,
        can_delete_vehicles BOOLEAN DEFAULT FALSE,
        can_edit_vehicles BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role (role_id),
        INDEX idx_role_id (role_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage configuration table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_team_role_id VARCHAR(255),
        general_contributor_role_id VARCHAR(255),
        shared_vehicle_credits INT DEFAULT 1,
        personal_vehicle_credits INT DEFAULT 2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage contributor tiers table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_tiers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price_usd DECIMAL(10,2) NOT NULL,
        monthly_vouchers INT NOT NULL,
        tier_role_id VARCHAR(255),
        stackable BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_display_order (display_order),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage codes table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code_string VARCHAR(255) UNIQUE NOT NULL,
        type ENUM('subscription', 'credit') NOT NULL,
        tier_id INT NULL,
        credit_amount INT NULL,
        expires_at TIMESTAMP NULL,
        used_at TIMESTAMP NULL,
        used_by INT NULL,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_code_string (code_string),
        INDEX idx_type (type),
        INDEX idx_expires_at (expires_at),
        FOREIGN KEY (tier_id) REFERENCES garage_tiers (id) ON DELETE SET NULL,
        FOREIGN KEY (used_by) REFERENCES users (id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage subscriptions table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_subscriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tier_id INT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        vouchers_remaining INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_tier_id (tier_id),
        INDEX idx_expires_at (expires_at),
        INDEX idx_is_active (is_active),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (tier_id) REFERENCES garage_tiers (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage credits table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_credits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        credits INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage vehicle statuses table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_vehicle_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        color VARCHAR(7) DEFAULT '#6B7280',
        display_order INT DEFAULT 0,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_display_order (display_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage vehicles table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_uuid VARCHAR(36) UNIQUE NOT NULL,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        year INT,
        make VARCHAR(255),
        model VARCHAR(255),
        is_shared BOOLEAN DEFAULT FALSE,
        is_paid BOOLEAN DEFAULT FALSE,
        purchase_proof_url TEXT,
        spawn_code VARCHAR(255),
        status_id INT,
        admin_notes TEXT,
        for_sale BOOLEAN DEFAULT FALSE,
        sale_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_vehicle_uuid (vehicle_uuid),
        INDEX idx_owner_id (owner_id),
        INDEX idx_is_shared (is_shared),
        INDEX idx_status_id (status_id),
        INDEX idx_for_sale (for_sale),
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (status_id) REFERENCES garage_vehicle_statuses (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage vehicle images table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_vehicle_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        image_url TEXT NOT NULL,
        is_admin_only BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_display_order (display_order),
        FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Garage vehicle access table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS garage_vehicle_access (
        id INT AUTO_INCREMENT PRIMARY KEY,
        vehicle_id INT NOT NULL,
        user_id INT NOT NULL,
        granted_by INT NOT NULL,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_vehicle_user (vehicle_id, user_id),
        INDEX idx_vehicle_id (vehicle_id),
        INDEX idx_user_id (user_id),
        FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Insert default vehicle statuses
    const existingStatuses = await allQuery('SELECT COUNT(*) as count FROM garage_vehicle_statuses');
    if (existingStatuses[0].count === 0) {
      await runQuery(`
        INSERT INTO garage_vehicle_statuses (name, color, display_order, is_default) VALUES
        ('Pending Review', '#F59E0B', 1, TRUE),
        ('Under Review', '#3B82F6', 2, FALSE),
        ('Approved', '#10B981', 3, FALSE),
        ('Rejected', '#EF4444', 4, FALSE),
        ('Needs Changes', '#F97316', 5, FALSE)
      `);
    }

    // Insert default config if none exists
    const existingConfig = await allQuery('SELECT COUNT(*) as count FROM garage_config');
    if (existingConfig[0].count === 0) {
      await runQuery(`
        INSERT INTO garage_config (shared_vehicle_credits, personal_vehicle_credits) 
        VALUES (1, 2)
      `);
    }
  }

  // Permission methods
  static async getUserGaragePermissions(userRoles) {
    if (!userRoles || userRoles.length === 0) {
      return {
        can_view_manager: false,
        can_generate_codes: false,
        can_delete_vehicles: false,
        can_edit_vehicles: false
      };
    }

    const roleIds = userRoles.map(role => role.id);
    const placeholders = roleIds.map(() => '?').join(',');
    
    const permissions = await allQuery(`
      SELECT * FROM garage_role_permissions 
      WHERE role_id IN (${placeholders})
    `, roleIds);

    return {
      can_view_manager: permissions.some(p => p.can_view_manager),
      can_generate_codes: permissions.some(p => p.can_generate_codes),
      can_delete_vehicles: permissions.some(p => p.can_delete_vehicles),
      can_edit_vehicles: permissions.some(p => p.can_edit_vehicles)
    };
  }

  static async hasAnyGarageAccess(userRoles) {
    const permissions = await this.getUserGaragePermissions(userRoles);
    return Object.values(permissions).some(permission => permission === true);
  }

  // Subscription methods
  static async getUserActiveSubscriptions(userId) {
    return await allQuery(`
      SELECT gs.*, gt.name as tier_name, gt.monthly_vouchers
      FROM garage_subscriptions gs
      JOIN garage_tiers gt ON gs.tier_id = gt.id
      WHERE gs.user_id = ? AND gs.is_active = TRUE AND gs.expires_at > NOW()
      ORDER BY gs.expires_at DESC
    `, [userId]);
  }

  static async getUserCredits(userId) {
    const result = await getQuery(
      'SELECT credits FROM garage_credits WHERE user_id = ?',
      [userId]
    );
    return result ? result.credits : 0;
  }

  static async addUserCredits(userId, amount) {
    await runQuery(`
      INSERT INTO garage_credits (user_id, credits) 
      VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE credits = credits + ?
    `, [userId, amount, amount]);
  }

  static async deductUserCredits(userId, amount) {
    const result = await runQuery(`
      UPDATE garage_credits 
      SET credits = credits - ? 
      WHERE user_id = ? AND credits >= ?
    `, [amount, userId, amount]);
    
    return result.affectedRows > 0;
  }
}