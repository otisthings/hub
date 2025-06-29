import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { featureFlags } from './features.js';

dotenv.config();

let timeclockPool = null;

export async function initializeTimeclockDatabase() {
  // Skip if all timeclock-related features are disabled
  if (!featureFlags.enableDepartments && !featureFlags.enableOrganizations && !featureFlags.enableTimeclock) {
    console.log('ℹ️ Timeclock database initialization skipped - all timeclock-related features are disabled');
    return null;
  }

  try {
    timeclockPool = mysql.createPool({
      host: '129.80.58.72',
      user: 'tb_demohub',
      password: ')U2n[aS!TfC[)BJo',
      database: 'tb_demohub',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    
    // Verify connection
    const connection = await timeclockPool.getConnection();
    await connection.release();
    console.log('✅ Connected to timeclock database');
    return timeclockPool;
  } catch (error) {
    console.error('❌ Failed to connect to timeclock database:', error);
    throw error;
  }
}

export function getTimeclockDatabase() {
  if (!timeclockPool) {
    throw new Error('Timeclock database not initialized');
  }
  return timeclockPool;
}

export async function getTimeclockDataByDiscordId(discordId) {
  try {
    const connection = getTimeclockDatabase();
    const [rows] = await connection.execute(
      'SELECT * FROM timeclock_i WHERE identifier = ? ORDER BY timestamp DESC LIMIT 100',
      [discordId]
    );
    return rows;
  } catch (error) {
    console.error('Error getting timeclock data:', error);
    throw error;
  }
}

// Graceful shutdown
export async function closeTimeclockDatabase() {
  if (timeclockPool) {
    await timeclockPool.end();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  await closeTimeclockDatabase();
});

process.on('SIGTERM', async () => {
  await closeTimeclockDatabase();
});

// Helper function to check if timeclock database is available
export function isTimeclockDatabaseAvailable() {
  return timeclockPool !== null;
}

// Helper function to check if any timeclock features are enabled
export function isAnyTimeclockFeatureEnabled() {
  return featureFlags.enableDepartments || featureFlags.enableOrganizations || featureFlags.enableTimeclock;
}