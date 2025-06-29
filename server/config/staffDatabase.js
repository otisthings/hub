import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { featureFlags } from './features.js';

dotenv.config();

let staffPool = null;

export async function initializeStaffDatabase() {
  // Skip if player record feature is disabled
  if (!featureFlags.enablePlayerRecord) {
    console.log('ℹ️ Staff database initialization skipped - player record feature is disabled');
    return null;
  }

  try {
    staffPool = mysql.createPool({
      host: process.env.STAFF_DB_HOST,
      port: process.env.STAFF_DB_PORT || 3306,
      user: process.env.STAFF_DB_USER,
      password: process.env.STAFF_DB_PASSWORD,
      database: process.env.STAFF_DB_NAME,
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    
    // Verify connection
    const connection = await staffPool.getConnection();
    await connection.release();
    console.log('✅ Connected to staff database');
    return staffPool;
  } catch (error) {
    console.error('❌ Failed to connect to staff database:', error);
    throw error;
  }
}

export function getStaffDatabase() {
  if (!staffPool) {
    if (!featureFlags.enablePlayerRecord) {
      throw new Error('Staff database access attempted while player record feature is disabled');
    }
    throw new Error('Staff database not initialized');
  }
  return staffPool;
}

// Helper function to check if staff database is available
export function isStaffDatabaseAvailable() {
  return staffPool !== null;
}

// Helper function to safely execute staff database queries
export async function safeStaffQuery(queryFn) {
  if (!featureFlags.enablePlayerRecord) {
    return null;
  }
  if (!isStaffDatabaseAvailable()) {
    return null;
  }
  try {
    return await queryFn(getStaffDatabase());
  } catch (error) {
    console.error('Staff database query failed:', error);
    return null;
  }
}

// Update the findUserByDiscordId function to use safeStaffQuery
export async function findUserByDiscordId(discordId) {
  return safeStaffQuery(async (db) => {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE discord_id = ?',
      [discordId]
    );
    return rows[0] || null;
  });
}

// Update the getUserPunitiveRecords function to use safeStaffQuery
export async function getUserPunitiveRecords(discordId) {
  return safeStaffQuery(async (db) => {
    // Get all types of records
    const [kicks] = await db.query('SELECT * FROM kicks WHERE discord_id = ? ORDER BY created_at DESC', [discordId]);
    const [warnings] = await db.query('SELECT * FROM warnings WHERE discord_id = ? ORDER BY created_at DESC', [discordId]);
    const [bans] = await db.query('SELECT * FROM bans WHERE discord_id = ? ORDER BY created_at DESC', [discordId]);
    const [commends] = await db.query('SELECT * FROM commends WHERE discord_id = ? ORDER BY created_at DESC', [discordId]);

    return {
      kicks: kicks || [],
      warnings: warnings || [],
      bans: bans || [],
      commends: commends || []
    };
  }) || { kicks: [], warnings: [], bans: [], commends: [] }; // Return empty arrays if query fails
}

// Graceful shutdown
export async function closeStaffDatabase() {
  if (staffPool) {
    await staffPool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeStaffDatabase();
});

process.on('SIGTERM', async () => {
  await closeStaffDatabase();
});