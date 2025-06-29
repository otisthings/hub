import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { runQuery, getQuery, allQuery } from '../config/database.js';
import { getTimeclockDataByDiscordId } from '../config/timeclockDatabase.js';
import { isTimeclockDatabaseAvailable } from '../config/timeclockDatabase.js';
import { featureFlags } from '../config/features.js';

const router = express.Router();

// Middleware to check if department features are available
const requireDepartmentFeatures = (req, res, next) => {
  if (!featureFlags.enableDepartments && !featureFlags.enableOrganizations) {
    return res.status(404).json({ error: 'Department features are disabled' });
  }
  if (!isTimeclockDatabaseAvailable()) {
    return res.status(503).json({ error: 'Department features are not available - database connection failed' });
  }
  next();
};

// Helper function to check if user has access to department based on role
async function checkDepartmentAccess(user, departmentId) {
  if (user.is_admin) return true;
  
  const department = await getQuery(
    'SELECT roster_view_id FROM departments WHERE id = ?',
    [departmentId]
  );
  
  if (!department) return false;
  
  // roster_view_id is now a single Discord Role ID
  const requiredRoleId = department.roster_view_id;
  const userRoles = JSON.parse(user.roles || '[]');
  const userRoleIds = userRoles.map(role => role.id);
  
  return userRoleIds.includes(requiredRoleId);
}

// Helper function to get weekly timeclock data
async function getWeeklyTimeclock(discordId, dbName) {
  try {
    // Get start and end of current week (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Get timeclock data for this week
    const timeclockData = await getTimeclockDataByDiscordId(discordId);
    
    // Filter for current week and sum minutes
    let totalMinutes = 0;
    timeclockData.forEach(entry => {
      const entryDate = new Date(entry.timestamp || entry.created_at || Date.now());
      if (entryDate >= startOfWeek && entryDate <= endOfWeek && entry.department === dbName) {
        totalMinutes += parseInt(entry.minutes) || 0;
      }
    });
    
    return totalMinutes;
  } catch (error) {
    console.error('Error getting weekly timeclock:', error);
    return 0;
  }
}

// Helper function to format time
function formatTime(totalMinutes) {
  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  let result = `${days}d`;
  if (remainingHours > 0) {
    result += ` ${remainingHours}h`;
  }
  if (minutes > 0) {
    result += ` ${minutes}m`;
  }
  
  return result;
}

// Get all departments user has access to
router.get('/', requireAuth, async (req, res) => {
  try {
    let departments;
    
    if (req.user.is_admin) {
      // Admin can see all departments
      departments = await allQuery(`
        SELECT d.*, u.username as created_by_name,
               (SELECT COUNT(*) FROM department_roster dr WHERE dr.department_id = d.id) as roster_count
        FROM departments d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.is_active = TRUE
        ORDER BY d.classification, d.name
      `);
    } else {
      // Regular users can only see departments they have role access to
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      
      if (userRoleIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = userRoleIds.map(() => '?').join(',');
      departments = await allQuery(`
        SELECT d.*, u.username as created_by_name,
               (SELECT COUNT(*) FROM department_roster dr WHERE dr.department_id = d.id) as roster_count
        FROM departments d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.is_active = TRUE AND d.roster_view_id IN (${placeholders})
        ORDER BY d.classification, d.name
      `, userRoleIds);
    }
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get departments by classification
router.get('/classification/:type', requireAuth, requireDepartmentFeatures, async (req, res) => {
  try {
    const { type } = req.params;
    
    // Check if the requested type is enabled
    if ((type === 'department' && !featureFlags.enableDepartments) ||
        (type === 'organization' && !featureFlags.enableOrganizations)) {
      return res.status(404).json({ error: `${type} features are disabled` });
    }
    
    let departments;
    
    if (req.user.is_admin) {
      departments = await allQuery(`
        SELECT d.*, u.username as created_by_name,
               (SELECT COUNT(*) FROM department_roster dr WHERE dr.department_id = d.id) as roster_count
        FROM departments d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.is_active = TRUE AND d.classification = ?
        ORDER BY d.name
      `, [type]);
    } else {
      // Filter by user's roles
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      
      if (userRoleIds.length === 0) {
        return res.json([]);
      }
      
      const placeholders = userRoleIds.map(() => '?').join(',');
      departments = await allQuery(`
        SELECT d.*, u.username as created_by_name,
               (SELECT COUNT(*) FROM department_roster dr WHERE dr.department_id = d.id) as roster_count
        FROM departments d
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.is_active = TRUE AND d.classification = ? AND d.roster_view_id IN (${placeholders})
        ORDER BY d.name
      `, [type, ...userRoleIds]);
    }
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments by classification:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get department roster
router.get('/:id/roster', requireAuth, requireDepartmentFeatures, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check access
    const hasAccess = await checkDepartmentAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get department info
    const department = await getQuery(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if the department type is enabled
    if ((department.classification === 'department' && !featureFlags.enableDepartments) ||
        (department.classification === 'organization' && !featureFlags.enableOrganizations)) {
      return res.status(404).json({ error: `${department.classification} features are disabled` });
    }
    
    // Get roster
    const roster = await allQuery(`
      SELECT dr.*, u.username, u.avatar, u.discriminator,
             added_by_user.username as added_by_name
      FROM department_roster dr
      LEFT JOIN users u ON dr.discord_id = u.discord_id
      LEFT JOIN users added_by_user ON dr.added_by = added_by_user.id
      WHERE dr.department_id = ?
      ORDER BY ${department.disable_callsigns ? 'u.username ASC' : 'dr.full_callsign ASC'}
    `, [id]);
    
    // Add weekly timeclock data
    const rosterWithTimeclock = await Promise.all(
      roster.map(async (member) => {
        const weeklyMinutes = await getWeeklyTimeclock(member.discord_id, department.db_name);
        return {
          ...member,
          weekly_timeclock_minutes: weeklyMinutes,
          weekly_timeclock_formatted: formatTime(weeklyMinutes)
        };
      })
    );
    
    res.json({
      department,
      roster: rosterWithTimeclock
    });
  } catch (error) {
    console.error('Error fetching department roster:', error);
    res.status(500).json({ error: 'Failed to fetch roster' });
  }
});

// Add user to roster
router.post('/:id/roster', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { discord_id, callsign_number } = req.body;
    
    if (!discord_id) {
      return res.status(400).json({ error: 'Discord ID is required' });
    }
    
    // Check access
    const hasAccess = await checkDepartmentAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get department
    const department = await getQuery(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // Check if Discord ID already exists in this department
    const existingMember = await getQuery(
      'SELECT id FROM department_roster WHERE department_id = ? AND discord_id = ?',
      [id, discord_id]
    );
    
    if (existingMember) {
      return res.status(400).json({ error: 'User is already in this department roster' });
    }
    
    let fullCallsign = null;
    
    // Handle callsigns only if not disabled
    if (!department.disable_callsigns) {
      if (!callsign_number) {
        return res.status(400).json({ error: 'Callsign number is required for this department' });
      }
      
      // Create full callsign
      fullCallsign = `${department.callsign_prefix}${callsign_number}`;
      
      // Check if callsign already exists in this department
      const existingCallsign = await getQuery(
        'SELECT id FROM department_roster WHERE department_id = ? AND full_callsign = ?',
        [id, fullCallsign]
      );
      
      if (existingCallsign) {
        return res.status(400).json({ error: 'Callsign already exists in this department' });
      }
    }
    
    // Add to roster
    await runQuery(`
      INSERT INTO department_roster (department_id, discord_id, callsign_number, full_callsign, added_by)
      VALUES (?, ?, ?, ?, ?)
    `, [id, discord_id, callsign_number, fullCallsign, req.user.id]);
    
    res.json({ success: true, message: 'User added to roster successfully' });
  } catch (error) {
    console.error('Error adding user to roster:', error);
    res.status(500).json({ error: 'Failed to add user to roster' });
  }
});

// Update roster member
router.put('/:id/roster/:memberId', requireAuth, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { callsign_number } = req.body;
    
    // Check access
    const hasAccess = await checkDepartmentAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get department
    const department = await getQuery(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    // If callsigns are disabled, don't allow updates
    if (department.disable_callsigns) {
      return res.status(400).json({ error: 'Callsigns are disabled for this department' });
    }
    
    if (!callsign_number) {
      return res.status(400).json({ error: 'Callsign number is required' });
    }
    
    // Create full callsign
    const fullCallsign = `${department.callsign_prefix}${callsign_number}`;
    
    // Check if callsign already exists (excluding current member)
    const existingCallsign = await getQuery(
      'SELECT id FROM department_roster WHERE department_id = ? AND full_callsign = ? AND id != ?',
      [id, fullCallsign, memberId]
    );
    
    if (existingCallsign) {
      return res.status(400).json({ error: 'Callsign already exists in this department' });
    }
    
    // Update roster member
    await runQuery(`
      UPDATE department_roster 
      SET callsign_number = ?, full_callsign = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND department_id = ?
    `, [callsign_number, fullCallsign, memberId, id]);
    
    res.json({ success: true, message: 'Roster member updated successfully' });
  } catch (error) {
    console.error('Error updating roster member:', error);
    res.status(500).json({ error: 'Failed to update roster member' });
  }
});

// Remove user from roster
router.delete('/:id/roster/:memberId', requireAuth, async (req, res) => {
  try {
    const { id, memberId } = req.params;
    
    // Check access
    const hasAccess = await checkDepartmentAccess(req.user, id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Remove from roster
    await runQuery(
      'DELETE FROM department_roster WHERE id = ? AND department_id = ?',
      [memberId, id]
    );
    
    res.json({ success: true, message: 'User removed from roster successfully' });
  } catch (error) {
    console.error('Error removing user from roster:', error);
    res.status(500).json({ error: 'Failed to remove user from roster' });
  }
});

// Admin routes for managing departments
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, db_name, callsign_prefix, roster_view_id, classification, disable_callsigns } = req.body;
    
    if (!name || !db_name || !roster_view_id || !classification) {
      return res.status(400).json({ error: 'Name, DB name, roster view ID, and classification are required' });
    }
    
    // If callsigns are not disabled, require callsign prefix
    if (!disable_callsigns && !callsign_prefix) {
      return res.status(400).json({ error: 'Callsign prefix is required when callsigns are enabled' });
    }
    
    if (!['department', 'organization'].includes(classification)) {
      return res.status(400).json({ error: 'Invalid classification' });
    }
    
    // Check if db_name already exists
    const existingDept = await getQuery(
      'SELECT id FROM departments WHERE db_name = ?',
      [db_name]
    );
    
    if (existingDept) {
      return res.status(400).json({ error: 'Database name already exists' });
    }
    
    // Create department - roster_view_id is now a single role ID
    const result = await runQuery(`
      INSERT INTO departments (name, db_name, callsign_prefix, roster_view_id, classification, disable_callsigns, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, db_name, callsign_prefix || '', roster_view_id, classification, disable_callsigns || false, req.user.id]);
    
    res.json({ success: true, id: result.insertId, message: 'Department created successfully' });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, db_name, callsign_prefix, roster_view_id, classification, disable_callsigns } = req.body;
    
    if (!name || !db_name || !roster_view_id || !classification) {
      return res.status(400).json({ error: 'Name, DB name, roster view ID, and classification are required' });
    }
    
    // If callsigns are not disabled, require callsign prefix
    if (!disable_callsigns && !callsign_prefix) {
      return res.status(400).json({ error: 'Callsign prefix is required when callsigns are enabled' });
    }
    
    if (!['department', 'organization'].includes(classification)) {
      return res.status(400).json({ error: 'Invalid classification' });
    }
    
    // Check if db_name already exists (excluding current department)
    const existingDept = await getQuery(
      'SELECT id FROM departments WHERE db_name = ? AND id != ?',
      [db_name, id]
    );
    
    if (existingDept) {
      return res.status(400).json({ error: 'Database name already exists' });
    }
    
    // Update department - roster_view_id is now a single role ID
    await runQuery(`
      UPDATE departments 
      SET name = ?, db_name = ?, callsign_prefix = ?, roster_view_id = ?, classification = ?, disable_callsigns = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, db_name, callsign_prefix || '', roster_view_id, classification, disable_callsigns || false, id]);
    
    res.json({ success: true, message: 'Department updated successfully' });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if department has roster members
    const rosterCount = await getQuery(
      'SELECT COUNT(*) as count FROM department_roster WHERE department_id = ?',
      [id]
    );
    
    if (rosterCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete department with existing roster members' });
    }
    
    // Delete department
    await runQuery('DELETE FROM departments WHERE id = ?', [id]);
    
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// Get all departments for admin
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const departments = await allQuery(`
      SELECT d.*, u.username as created_by_name,
             (SELECT COUNT(*) FROM department_roster dr WHERE dr.department_id = d.id) as roster_count
      FROM departments d
      LEFT JOIN users u ON d.created_by = u.id
      ORDER BY d.classification, d.name
    `);
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching all departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

export default router;