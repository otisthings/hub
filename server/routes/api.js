import express from 'express';
import { 
  requireAuth, 
  requireAdmin, 
  requireStaffOrAdmin,
  requireApplicationAdmin,
  requireApplicationModerator,
  requireManagement,
  getUserAccessibleCategories,
  getUserAccessibleApplications,
  checkTicketSupportAccess,
  requireSupportRole
} from '../middleware/auth.js';
import { runQuery, getQuery, allQuery } from '../config/database.js';
import { sendDiscordWebhook, createTicketEmbed, createApplicationEmbed, assignDiscordRole, removeDiscordRole, getUserDiscordRoles } from '../services/discord.js';

const router = express.Router();

// Dashboard stats
router.get('/dashboard/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's ticket stats
    const [totalResult] = await allQuery(
      'SELECT COUNT(*) as count FROM tickets WHERE user_id = ?',
      [userId]
    );
    
    const [openResult] = await allQuery(
      'SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status IN ("open", "in_progress")',
      [userId]
    );
    
    const [closedResult] = await allQuery(
      'SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = "closed"',
      [userId]
    );

    // Admin gets additional stats
    let adminStats = {};
    if (req.user.is_admin) {
      const [usersResult] = await allQuery('SELECT COUNT(*) as count FROM users');
      adminStats.users = usersResult[0]?.count || 0;
    }

    res.json({
      total: totalResult[0]?.count || 0,
      open: openResult[0]?.count || 0,
      closed: closedResult[0]?.count || 0,
      ...adminStats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Categories
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await allQuery(`
      SELECT c.*, u.username as created_by_name 
      FROM categories c 
      LEFT JOIN users u ON c.created_by = u.id 
      ORDER BY c.name
    `);
    res.json(categories);
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get categories accessible to user for ticket creation
router.get('/categories/accessible', requireAuth, async (req, res) => {
  try {
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    let categories;
    
    if (req.user.is_admin) {
      // Admin can access all categories
      categories = await allQuery('SELECT * FROM categories ORDER BY name');
    } else {
      // All users can see all categories for ticket creation
      categories = await allQuery('SELECT * FROM categories ORDER BY name');
    }
    
    res.json(categories);
  } catch (error) {
    console.error('Accessible categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch accessible categories' });
  }
});

// Get categories where user has support access
router.get('/categories/support', requireAuth, async (req, res) => {
  try {
    if (req.user.is_admin) {
      // Admin has access to all categories
      const categories = await allQuery('SELECT * FROM categories ORDER BY name');
      return res.json(categories);
    }
    
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    if (userRoleIds.length === 0) {
      return res.json([]);
    }
    
    // Get categories where user has the required role
    const placeholders = userRoleIds.map(() => '?').join(',');
    const categories = await allQuery(`
      SELECT * FROM categories 
      WHERE required_role_id IN (${placeholders})
      ORDER BY name
    `, userRoleIds);
    
    res.json(categories);
  } catch (error) {
    console.error('Support categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch support categories' });
  }
});

router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description, required_role_id, color, is_restricted } = req.body;
    
    if (!name || !required_role_id) {
      return res.status(400).json({ error: 'Name and required role ID are required' });
    }
    
    const result = await runQuery(`
      INSERT INTO categories (name, description, required_role_id, color, is_restricted, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [name, description, required_role_id, color || '#5865F2', is_restricted || false, req.user.id]);
    
    res.json({ id: result.insertId, message: 'Category created successfully' });
  } catch (error) {
    console.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

router.put('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, required_role_id, color, is_restricted } = req.body;
    
    if (!name || !required_role_id) {
      return res.status(400).json({ error: 'Name and required role ID are required' });
    }
    
    await runQuery(`
      UPDATE categories 
      SET name = ?, description = ?, required_role_id = ?, color = ?, is_restricted = ?
      WHERE id = ?
    `, [name, description, required_role_id, color || '#5865F2', is_restricted || false, id]);
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

router.delete('/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has tickets
    const tickets = await allQuery('SELECT COUNT(*) as count FROM tickets WHERE category_id = ?', [id]);
    if (tickets[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with existing tickets' });
    }
    
    await runQuery('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Category deletion error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Self-Assignable Roles Routes
router.get('/roles/self-assignable', requireAuth, async (req, res) => {
  try {
    const roles = await allQuery(`
      SELECT * FROM self_assignable_roles 
      WHERE is_active = TRUE 
      ORDER BY display_order ASC, name ASC
    `);
    
    // Get user's current Discord roles
    const userDiscordRoles = await getUserDiscordRoles(
      req.user.discord_id,
      process.env.DISCORD_BOT_TOKEN,
      process.env.DISCORD_GUILD_ID
    );
    
    // Add hasRole property to each role
    const rolesWithStatus = roles.map(role => ({
      ...role,
      hasRole: userDiscordRoles.includes(role.role_id)
    }));
    
    res.json(rolesWithStatus);
  } catch (error) {
    console.error('Self-assignable roles fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch self-assignable roles' });
  }
});

router.post('/roles/self-assignable/:id/toggle', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'add' or 'remove'
    
    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "add" or "remove"' });
    }
    
    // Get role details
    const role = await getQuery(
      'SELECT * FROM self_assignable_roles WHERE id = ? AND is_active = TRUE',
      [id]
    );
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found or inactive' });
    }
    
    // Check permissions
    if (action === 'add' && !role.can_add) {
      return res.status(403).json({ error: 'This role cannot be self-assigned' });
    }
    
    if (action === 'remove' && !role.can_remove) {
      return res.status(403).json({ error: 'This role cannot be self-removed' });
    }
    
    // Perform Discord API action
    let success = false;
    if (action === 'add') {
      success = await assignDiscordRole(
        req.user.discord_id,
        role.role_id,
        process.env.DISCORD_BOT_TOKEN,
        process.env.DISCORD_GUILD_ID
      );
    } else {
      success = await removeDiscordRole(
        req.user.discord_id,
        role.role_id,
        process.env.DISCORD_BOT_TOKEN,
        process.env.DISCORD_GUILD_ID
      );
    }
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update role on Discord' });
    }
    
    res.json({ 
      message: `Role ${action === 'add' ? 'added' : 'removed'} successfully`,
      action,
      roleName: role.name
    });
  } catch (error) {
    console.error('Role toggle error:', error);
    res.status(500).json({ error: 'Failed to toggle role' });
  }
});

// Admin routes for managing self-assignable roles
router.get('/admin/roles/self-assignable', requireAdmin, async (req, res) => {
  try {
    const roles = await allQuery(`
      SELECT sar.*, u.username as created_by_name
      FROM self_assignable_roles sar
      LEFT JOIN users u ON sar.created_by = u.id
      ORDER BY sar.display_order ASC, sar.name ASC
    `);
    res.json(roles);
  } catch (error) {
    console.error('Admin self-assignable roles fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch self-assignable roles' });
  }
});

router.post('/admin/roles/self-assignable', requireAdmin, async (req, res) => {
  try {
    const { 
      role_id, 
      name, 
      description, 
      icon_url, 
      emoji, 
      can_add, 
      can_remove, 
      display_order 
    } = req.body;
    
    if (!role_id || !name) {
      return res.status(400).json({ error: 'Role ID and name are required' });
    }
    
    const result = await runQuery(`
      INSERT INTO self_assignable_roles 
      (role_id, name, description, icon_url, emoji, can_add, can_remove, display_order, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      role_id,
      name,
      description || null,
      icon_url || null,
      emoji || null,
      can_add !== false,
      can_remove !== false,
      display_order || 0,
      req.user.id
    ]);
    
    res.json({ id: result.insertId, message: 'Self-assignable role created successfully' });
  } catch (error) {
    console.error('Self-assignable role creation error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'A role with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create self-assignable role' });
    }
  }
});

router.put('/admin/roles/self-assignable/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      role_id, 
      name, 
      description, 
      icon_url, 
      emoji, 
      can_add, 
      can_remove, 
      is_active, 
      display_order 
    } = req.body;
    
    if (!role_id || !name) {
      return res.status(400).json({ error: 'Role ID and name are required' });
    }
    
    await runQuery(`
      UPDATE self_assignable_roles 
      SET role_id = ?, name = ?, description = ?, icon_url = ?, emoji = ?, 
          can_add = ?, can_remove = ?, is_active = ?, display_order = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      role_id,
      name,
      description || null,
      icon_url || null,
      emoji || null,
      can_add !== false,
      can_remove !== false,
      is_active !== false,
      display_order || 0,
      id
    ]);
    
    res.json({ message: 'Self-assignable role updated successfully' });
  } catch (error) {
    console.error('Self-assignable role update error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'A role with this ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update self-assignable role' });
    }
  }
});

router.delete('/admin/roles/self-assignable/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await runQuery('DELETE FROM self_assignable_roles WHERE id = ?', [id]);
    res.json({ message: 'Self-assignable role deleted successfully' });
  } catch (error) {
    console.error('Self-assignable role deletion error:', error);
    res.status(500).json({ error: 'Failed to delete self-assignable role' });
  }
});

// Tickets
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    const { support, assigned, category, limit, status } = req.query;
    const userId = req.user.id;
    
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color,
             u.username as user_name, u.avatar as user_avatar, u.discriminator as user_discriminator, u.discord_id as user_discord_id,
             assigned_user.username as assigned_to_name,
             claimed_user.username as claimed_by_name
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      LEFT JOIN users claimed_user ON t.claimed_by = claimed_user.id
    `;
    
    let conditions = [];
    let params = [];
    
    // Add status filter if provided
    if (status) {
      conditions.push('t.status = ?');
      params.push(status);
    }
    
    if (support === 'true') {
      // Support view - show tickets from categories user has support access to
      if (req.user.is_admin) {
        // Admin sees all tickets
      } else {
        const userRoles = JSON.parse(req.user.roles || '[]');
        const userRoleIds = userRoles.map(role => role.id);
        
        if (userRoleIds.length === 0) {
          return res.json([]); // No support access
        }
        
        const placeholders = userRoleIds.map(() => '?').join(',');
        conditions.push(`c.required_role_id IN (${placeholders})`);
        params.push(...userRoleIds);
      }
    } else if (assigned === 'true') {
      // Assigned tickets - tickets assigned to or claimed by the user
      conditions.push('(t.assigned_to = ? OR t.claimed_by = ?)');
      params.push(userId, userId);
    } else {
      // Default view - user's own tickets + tickets they're participants in
      conditions.push(`(t.user_id = ? OR EXISTS (
        SELECT 1 FROM ticket_participants tp WHERE tp.ticket_id = t.id AND tp.user_id = ?
      ))`);
      params.push(userId, userId);
    }
    
    // Add category filter if provided
    if (category) {
      conditions.push('t.category_id = ?');
      params.push(category);
    }
    
    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // Add ORDER BY and LIMIT
    query += ' ORDER BY t.created_at DESC';
    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    
    const tickets = await allQuery(query, params);
    res.json(tickets || []);
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/tickets/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get ticket details
    const ticket = await getQuery(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.required_role_id,
             u.username as user_name, u.avatar as user_avatar, u.discriminator as user_discriminator, u.discord_id as user_discord_id,
             assigned_user.username as assigned_to_name,
             claimed_user.username as claimed_by_name
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN users assigned_user ON t.assigned_to = assigned_user.id
      LEFT JOIN users claimed_user ON t.claimed_by = claimed_user.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check access permissions
    const isOwner = ticket.user_id === userId;
    const isAdmin = req.user.is_admin;
    
    // Check if user is a participant
    const isParticipant = await getQuery(
      'SELECT 1 FROM ticket_participants WHERE ticket_id = ? AND user_id = ?',
      [id, userId]
    );
    
    // Check if user has support access to this category
    let hasSupportAccess = false;
    if (isAdmin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    // Check if user is assigned to or claimed this ticket
    const isAssigned = ticket.assigned_to === userId;
    const isClaimed = ticket.claimed_by === userId;
    
    if (!isOwner && !isParticipant && !hasSupportAccess && !isAssigned && !isClaimed) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get messages
    const messages = await allQuery(`
      SELECT tm.*, u.username, u.avatar, u.discriminator, u.discord_id
      FROM ticket_messages tm
      LEFT JOIN users u ON tm.user_id = u.id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC
    `, [id]);
    
    // Get logs
    const logs = await allQuery(`
      SELECT tl.*, u.username
      FROM ticket_logs tl
      LEFT JOIN users u ON tl.user_id = u.id
      WHERE tl.ticket_id = ?
      ORDER BY tl.created_at DESC
    `, [id]);
    
    // Get participants
    const participants = await allQuery(`
      SELECT tp.*, u.username, u.avatar, u.discriminator, u.discord_id,
             added_by_user.username as added_by_name
      FROM ticket_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      LEFT JOIN users added_by_user ON tp.added_by = added_by_user.id
      WHERE tp.ticket_id = ?
      ORDER BY tp.added_at ASC
    `, [id]);
    
    res.json({
      ticket,
      messages,
      logs,
      participants
    });
  } catch (error) {
    console.error('Ticket fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const { title, description, category_id } = req.body;
    const userId = req.user.id;
    
    if (!title || !description || !category_id) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }
    
    // Get category details
    const category = await getQuery('SELECT * FROM categories WHERE id = ?', [category_id]);
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Check if user can create tickets in this category
    if (category.is_restricted) {
      if (!req.user.is_admin) {
        const userRoles = JSON.parse(req.user.roles || '[]');
        const userRoleIds = userRoles.map(role => role.id);
        
        if (!category.required_role_id || !userRoleIds.includes(category.required_role_id)) {
          return res.status(403).json({ error: 'You do not have permission to create tickets in this category' });
        }
      }
    }
    
    // Create ticket
    const result = await runQuery(`
      INSERT INTO tickets (title, description, category_id, user_id, status)
      VALUES (?, ?, ?, ?, 'open')
    `, [
      title || null,
      description || null,
      category_id || null,
      userId || null
    ]);
    
    if (!result || typeof result.insertId === 'undefined' || result.insertId === null) {
      throw new Error('Failed to create ticket - database did not return an insert ID');
    }

    const ticketId = result.insertId;
    
    // Log ticket creation
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'created ticket', ?)
    `, [
      ticketId,
      userId || null,
      JSON.stringify({ category: category.name || null })
    ]);
    
    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const embed = createTicketEmbed({
        id: ticketId,
        status: 'open',
        category_name: category.name || null
      }, 'created', req.user);
      
      // Always ping the original ticket creator in plain text
      const content = `<@${req.user.discord_id || ''}>` + ' created a new ticket';
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
    }
    
    res.json({ id: ticketId, message: 'Ticket created successfully' });
  } catch (error) {
    console.error('Ticket creation error:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

router.post('/tickets/:id/messages', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get ticket details for access check
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id, c.name as category_name, u.discord_id as creator_discord_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check access permissions (same logic as ticket view)
    const isOwner = ticket.user_id === userId;
    const isAdmin = req.user.is_admin;
    
    const isParticipant = await getQuery(
      'SELECT 1 FROM ticket_participants WHERE ticket_id = ? AND user_id = ?',
      [id, userId]
    );
    
    let hasSupportAccess = false;
    if (isAdmin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    const isAssigned = ticket.assigned_to === userId;
    const isClaimed = ticket.claimed_by === userId;
    
    if (!isOwner && !isParticipant && !hasSupportAccess && !isAssigned && !isClaimed) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Determine if this is a staff reply
    const isStaffReply = hasSupportAccess || isAssigned || isClaimed;
    
    // Add message
    await runQuery(`
      INSERT INTO ticket_messages (ticket_id, user_id, message, is_staff_reply)
      VALUES (?, ?, ?, ?)
    `, [id, userId, message.trim(), isStaffReply]);
    
    // Log message
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'added message', ?)
    `, [id, userId, JSON.stringify({ is_staff_reply: isStaffReply })]);
    
    // Update ticket timestamp
    await runQuery('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    
    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const embed = createTicketEmbed({
        id: ticket.id,
        status: ticket.status,
        category_name: ticket.category_name
      }, 'message_added', req.user);
      
      // Always ping the original ticket creator in plain text
      const content = `<@${ticket.creator_discord_id}> new message on your ticket`;
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
    }
    
    res.json({ message: 'Message added successfully' });
  } catch (error) {
    console.error('Message creation error:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

router.put('/tickets/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    if (!['open', 'in_progress', 'closed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get ticket details
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id, c.name as category_name, u.discord_id as creator_discord_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check permissions
    const isOwner = ticket.user_id === userId;
    const isAdmin = req.user.is_admin;
    
    let hasSupportAccess = false;
    if (isAdmin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    const isAssigned = ticket.assigned_to === userId;
    const isClaimed = ticket.claimed_by === userId;
    
    // Permission logic:
    // - Anyone with access can close tickets
    // - Only support members can reopen or change to in_progress
    if (status === 'closed') {
      // Anyone with access can close
      if (!isOwner && !hasSupportAccess && !isAssigned && !isClaimed) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      // Only support members can reopen or change status
      if (!hasSupportAccess && !isAssigned && !isClaimed) {
        return res.status(403).json({ error: 'Only support members can change ticket status' });
      }
    }
    
    // Update status
    const closedAt = status === 'closed' ? 'CURRENT_TIMESTAMP' : 'NULL';
    await runQuery(`
      UPDATE tickets 
      SET status = ?, closed_at = ${closedAt}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [status, id]);
    
    // Log status change
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'changed status', ?)
    `, [id, userId, JSON.stringify({ from: ticket.status, to: status })]);
    
    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const embed = createTicketEmbed({
        id: ticket.id,
        status: status,
        category_name: ticket.category_name
      }, 'status_changed', req.user);
      
      // Always ping the original ticket creator in plain text
      const content = `<@${ticket.creator_discord_id}> your ticket status changed to ${status}`;
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Claim/Unclaim ticket
router.put('/tickets/:id/claim', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { claim } = req.body;
    const userId = req.user.id;
    
    // Get ticket details
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id, c.name as category_name, u.discord_id as creator_discord_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has support access
    let hasSupportAccess = false;
    if (req.user.is_admin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    if (!hasSupportAccess) {
      return res.status(403).json({ error: 'Only support members can claim tickets' });
    }
    
    // Update claim status
    const claimedBy = claim ? userId : null;
    await runQuery(`
      UPDATE tickets 
      SET claimed_by = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [claimedBy, id]);
    
    // Log claim action
    const action = claim ? 'claimed ticket' : 'unclaimed ticket';
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, ?, ?)
    `, [id, userId, action, JSON.stringify({ claimed: claim })]);
    
    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const embed = createTicketEmbed({
        id: ticket.id,
        status: ticket.status,
        category_name: ticket.category_name
      }, claim ? 'claimed' : 'unclaimed', req.user);
      
      // Always ping the original ticket creator in plain text
      const content = `<@${ticket.creator_discord_id}> your ticket was ${claim ? 'claimed' : 'unclaimed'}`;
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
    }
    
    res.json({ message: claim ? 'Ticket claimed successfully' : 'Ticket unclaimed successfully' });
  } catch (error) {
    console.error('Claim/unclaim error:', error);
    res.status(500).json({ error: 'Failed to update claim status' });
  }
});

// Add participant to ticket
router.post('/tickets/:id/participants', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { discord_id } = req.body;
    const userId = req.user.id;
    
    if (!discord_id) {
      return res.status(400).json({ error: 'Discord ID is required' });
    }
    
    // Get ticket details
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id, c.name as category_name, u.discord_id as creator_discord_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has support access
    let hasSupportAccess = false;
    if (req.user.is_admin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    if (!hasSupportAccess) {
      return res.status(403).json({ error: 'Only support members can add participants' });
    }
    
    // Find user by Discord ID
    const targetUser = await getQuery('SELECT * FROM users WHERE discord_id = ?', [discord_id]);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is already a participant
    const existingParticipant = await getQuery(
      'SELECT 1 FROM ticket_participants WHERE ticket_id = ? AND user_id = ?',
      [id, targetUser.id]
    );
    
    if (existingParticipant) {
      return res.status(400).json({ error: 'User is already a participant' });
    }
    
    // Check if user is the ticket owner
    if (targetUser.id === ticket.user_id) {
      return res.status(400).json({ error: 'Cannot add ticket owner as participant' });
    }
    
    // Add participant
    await runQuery(`
      INSERT INTO ticket_participants (ticket_id, user_id, added_by)
      VALUES (?, ?, ?)
    `, [id, targetUser.id, userId]);
    
    // Log participant addition
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'added participant', ?)
    `, [id, userId, JSON.stringify({ participant: targetUser.username, discord_id })]);
    
    // Update ticket timestamp
    await runQuery('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    
    // Send Discord notifications
    if (process.env.DISCORD_WEBHOOK_URL) {
      // Notify original creator
      const embed = createTicketEmbed({
        id: ticket.id,
        status: ticket.status,
        category_name: ticket.category_name
      }, 'participant_added', req.user);
      const content = `<@${ticket.creator_discord_id}> ${targetUser.username} was added to your ticket`;
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
      
      // Send separate notification to the added user with ping inside embed
      const addedUserEmbed = {
        title: `Added to Ticket #${ticket.id}`,
        description: `<@${targetUser.discord_id}> you have been added to this ticket`,
        color: 0xb331ff,
        fields: [
          {
            name: 'Category',
            value: ticket.category_name,
            inline: true
          },
          {
            name: 'Ticket ID',
            value: `#${ticket.id}`,
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Lynus RP Hub'
        }
      };
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, addedUserEmbed);
    }
    
    res.json({ message: 'Participant added successfully' });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

// Remove participant from ticket
router.delete('/tickets/:id/participants/:participantId', requireAuth, async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const userId = req.user.id;
    
    // Get ticket details
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id, c.name as category_name, u.discord_id as creator_discord_id
      FROM tickets t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has support access
    let hasSupportAccess = false;
    if (req.user.is_admin) {
      hasSupportAccess = true;
    } else if (ticket.required_role_id) {
      const userRoles = JSON.parse(req.user.roles || '[]');
      const userRoleIds = userRoles.map(role => role.id);
      hasSupportAccess = userRoleIds.includes(ticket.required_role_id);
    }
    
    if (!hasSupportAccess) {
      return res.status(403).json({ error: 'Only support members can remove participants' });
    }
    
    // Get participant details
    const participant = await getQuery(`
      SELECT tp.*, u.username, u.discord_id
      FROM ticket_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.id = ? AND tp.ticket_id = ?
    `, [participantId, id]);
    
    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }
    
    // Remove participant
    await runQuery('DELETE FROM ticket_participants WHERE id = ?', [participantId]);
    
    // Log participant removal
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'removed participant', ?)
    `, [id, userId, JSON.stringify({ participant: participant.username, discord_id: participant.discord_id })]);
    
    // Update ticket timestamp
    await runQuery('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    
    // Send Discord notification
    if (process.env.DISCORD_WEBHOOK_URL) {
      const embed = createTicketEmbed({
        id: ticket.id,
        status: ticket.status,
        category_name: ticket.category_name
      }, 'participant_removed', req.user);
      
      // Always ping the original ticket creator in plain text
      const content = `<@${ticket.creator_discord_id}> ${participant.username} was removed from your ticket`;
      
      await sendDiscordWebhook(process.env.DISCORD_WEBHOOK_URL, embed, content);
    }
    
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

router.put('/tickets/:id/transfer', requireStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.body;
    const userId = req.user.id;
    
    if (!category_id) {
      return res.status(400).json({ error: 'Category ID is required' });
    }
    
    // Get current ticket and new category
    const [ticket, newCategory] = await Promise.all([
      getQuery('SELECT * FROM tickets WHERE id = ?', [id]),
      getQuery('SELECT * FROM categories WHERE id = ?', [category_id])
    ]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!newCategory) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    // Update ticket category
    await runQuery(`
      UPDATE tickets 
      SET category_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [category_id, id]);
    
    // Log transfer
    await runQuery(`
      INSERT INTO ticket_logs (ticket_id, user_id, action, details)
      VALUES (?, ?, 'transferred ticket', ?)
    `, [id, userId, JSON.stringify({ to_category: newCategory.name })]);
    
    res.json({ message: 'Ticket transferred successfully' });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer ticket' });
  }
});

// Applications
router.get('/applications', requireAuth, async (req, res) => {
  try {
    const applications = await getUserAccessibleApplications(req.user);
    res.json(applications);
  } catch (error) {
    console.error('Applications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.get('/applications/public', requireAuth, async (req, res) => {
  try {
    const applications = await allQuery(`
      SELECT id, name, description, questions, category, is_active
      FROM application_forms 
      WHERE is_active = 1 
      ORDER BY category, name
    `);
    res.json(applications);
  } catch (error) {
    console.error('Public applications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.post('/applications', requireAdmin, async (req, res) => {
  try {
    const { 
      name, 
      description, 
      questions, 
      admin_role_id, 
      moderator_role_id,
      viewer_role_id,
      accepted_roles,
      category,
      webhook_url,
      webhook_role_id
    } = req.body;
    
    if (!name || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Name and questions are required' });
    }
    
    const result = await runQuery(`
      INSERT INTO application_forms (
        name, description, questions, admin_role_id, moderator_role_id, viewer_role_id,
        accepted_roles, category, webhook_url, webhook_role_id, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, 
      description, 
      JSON.stringify(questions), 
      admin_role_id, 
      moderator_role_id,
      viewer_role_id,
      JSON.stringify(accepted_roles),
      category || 'General',
      webhook_url,
      webhook_role_id,
      req.user.id
    ]);
    
    res.json({ id: result.insertId, message: 'Application created successfully' });
  } catch (error) {
    console.error('Application creation error:', error);
    res.status(500).json({ error: 'Failed to create application' });
  }
});

router.get('/applications/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get application details
    const application = await getQuery('SELECT * FROM application_forms WHERE id = ?', [id]);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    // Check if user has management access
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    const hasAccess = req.user.is_admin || 
      (application.admin_role_id && userRoleIds.includes(application.admin_role_id)) || 
      (application.moderator_role_id && userRoleIds.includes(application.moderator_role_id));
    
    // If user doesn't have management access and application is inactive, deny access
    if (!hasAccess && !application.is_active) {
      return res.status(403).json({ error: 'Application is not active' });
    }
    
    res.json(application);
  } catch (error) {
    console.error('Application fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

router.put('/applications/:id', requireApplicationAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      questions, 
      admin_role_id, 
      moderator_role_id,
      viewer_role_id,
      accepted_roles,
      category,
      webhook_url,
      webhook_role_id,
      is_active
    } = req.body;
    
    if (!name || !questions || questions.length === 0) {
      return res.status(400).json({ error: 'Name and questions are required' });
    }
    
    await runQuery(`
      UPDATE application_forms 
      SET name = ?, description = ?, questions = ?, admin_role_id = ?, 
          moderator_role_id = ?, viewer_role_id = ?, accepted_roles = ?, category = ?,
          webhook_url = ?, webhook_role_id = ?, is_active = ?
      WHERE id = ?
    `, [
      name, 
      description, 
      JSON.stringify(questions), 
      admin_role_id, 
      moderator_role_id,
      viewer_role_id,
      JSON.stringify(accepted_roles),
      category || 'General',
      webhook_url,
      webhook_role_id,
      is_active !== undefined ? is_active : true,
      id
    ]);
    
    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    console.error('Application update error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

router.post('/applications/:id/submit', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { responses } = req.body;
    const userId = req.user.id;
    
    if (!responses) {
      return res.status(400).json({ error: 'Responses are required' });
    }
    
    // Get application details
    const application = await getQuery('SELECT * FROM application_forms WHERE id = ? AND is_active = 1', [id]);
    if (!application) {
      return res.status(404).json({ error: 'Application not found or inactive' });
    }

    // Check if user has the required role to submit this application
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    // User can submit if they have admin role, moderator role, or viewer role for this application
    const hasAccess = req.user.is_admin || 
      (application.admin_role_id && userRoleIds.includes(application.admin_role_id)) || 
      (application.moderator_role_id && userRoleIds.includes(application.moderator_role_id)) ||
      (application.viewer_role_id && userRoleIds.includes(application.viewer_role_id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'You do not have permission to submit this application' });
    }
    
    // Check if user already has a pending application
    const existingSubmission = await getQuery(
      'SELECT * FROM application_submissions WHERE form_id = ? AND user_id = ? AND status = "pending"',
      [id, userId]
    );
    
    if (existingSubmission) {
      return res.status(400).json({ error: 'You already have a pending application for this form' });
    }
    
    // Submit application
    const result = await runQuery(`
      INSERT INTO application_submissions (form_id, user_id, responses, status)
      VALUES (?, ?, ?, 'pending')
    `, [id, userId, JSON.stringify(responses)]);
    
    // Send Discord notification
    if (application.webhook_url) {
      const embed = createApplicationEmbed(application, {
        user_discord_id: req.user.discord_id,
        submitted_at: new Date().toISOString()
      }, 'submitted');
      
      let content = `<@${req.user.discord_id}> submitted an application`;
      if (application.webhook_role_id) {
        content += `\n<@&${application.webhook_role_id}> New application submitted`;
      }
      
      await sendDiscordWebhook(application.webhook_url, embed, content);
    }
    
    res.json({ id: result.insertId, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

router.get('/applications/:id/submissions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has access to this specific application
    const application = await getQuery('SELECT * FROM application_forms WHERE id = ?', [id]);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check user permissions for this specific application
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    const hasAccess = req.user.is_admin || 
      (application.admin_role_id && userRoleIds.includes(application.admin_role_id)) || 
      (application.moderator_role_id && userRoleIds.includes(application.moderator_role_id));

    if (!hasAccess) {
      return res.status(403).json({ error: 'Application moderator access required' });
    }
    
    const submissions = await allQuery(`
      SELECT s.*, u.username, u.discriminator, u.discord_id, u.avatar,
             reviewer.username as reviewed_by_name
      FROM application_submissions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN users reviewer ON s.reviewed_by = reviewer.id
      WHERE s.form_id = ?
      ORDER BY s.submitted_at DESC
    `, [id]);
    
    // Parse responses
    submissions.forEach(submission => {
      submission.responses = JSON.parse(submission.responses || '{}');
    });
    
    res.json(submissions);
  } catch (error) {
    console.error('Submissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.put('/applications/:appId/submissions/:subId', requireApplicationModerator, async (req, res) => {
  try {
    const { appId, subId } = req.params;
    const { status, admin_notes } = req.body;
    const userId = req.user.id;
    
    if (!['accepted', 'denied'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Get application and submission details
    const [application, submission] = await Promise.all([
      getQuery('SELECT * FROM application_forms WHERE id = ?', [appId]),
      getQuery(`
        SELECT s.*, u.discord_id, u.username
        FROM application_submissions s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.form_id = ?
      `, [subId, appId])
    ]);
    
    if (!application || !submission) {
      return res.status(404).json({ error: 'Application or submission not found' });
    }
    
    // Update submission
    await runQuery(`
      UPDATE application_submissions 
      SET status = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
      WHERE id = ?
    `, [status, admin_notes, userId, subId]);
    
    // If accepted, assign roles
    if (status === 'accepted' && application.accepted_roles) {
      const acceptedRoles = JSON.parse(application.accepted_roles || '[]');
      for (const roleId of acceptedRoles) {
        if (roleId) {
          await assignDiscordRole(
            submission.discord_id, 
            roleId, 
            process.env.DISCORD_BOT_TOKEN, 
            process.env.DISCORD_GUILD_ID
          );
        }
      }
    }
    
    // Send Discord notification
    if (application.webhook_url) {
      const embed = createApplicationEmbed(application, submission, status, admin_notes);
      const content = `<@${submission.discord_id}> your application has been ${status}`;
      await sendDiscordWebhook(application.webhook_url, embed, content);
    }
    
    res.json({ message: 'Submission reviewed successfully' });
  } catch (error) {
    console.error('Submission review error:', error);
    res.status(500).json({ error: 'Failed to review submission' });
  }
});

// My Applications
router.get('/my-applications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const applications = await allQuery(`
      SELECT s.*, af.name as app_name, af.description as app_description,
             reviewer.username as reviewed_by_name
      FROM application_submissions s
      LEFT JOIN application_forms af ON s.form_id = af.id
      LEFT JOIN users reviewer ON s.reviewed_by = reviewer.id
      WHERE s.user_id = ?
      ORDER BY s.submitted_at DESC
    `, [userId]);
    
    res.json(applications);
  } catch (error) {
    console.error('My applications fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// System Settings
router.get('/settings/branding', async (req, res) => {
  try {
    const [logoSetting, communitySetting] = await Promise.all([
      getQuery(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['custom_logo_url']
      ),
      getQuery(
        'SELECT setting_value FROM system_settings WHERE setting_key = ?',
        ['community_name']
      )
    ]);
    
    res.json({
      custom_logo_url: logoSetting?.setting_value || null,
      community_name: communitySetting?.setting_value
    });
  } catch (error) {
    console.error('Branding fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch branding settings' });
  }
});

router.put('/settings/branding', requireAdmin, async (req, res) => {
  try {
    const { custom_logo_url, community_name } = req.body;
    
    // Upsert the settings
    await Promise.all([
      runQuery(`
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES ('custom_logo_url', ?)
        ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP
      `, [custom_logo_url, custom_logo_url]),
      runQuery(`
        INSERT INTO system_settings (setting_key, setting_value) 
        VALUES ('community_name', ?)
        ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP
      `, [community_name, community_name])
    ]);
    
    res.json({ message: 'Branding updated successfully' });
  } catch (error) {
    console.error('Branding update error:', error);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

// Management routes
router.get('/management/users', requireManagement, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    
    if (search) {
      whereClause = 'WHERE u.username LIKE ? OR u.discord_id LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    
    // Get total count with better error handling
    const totalResult = await allQuery(`
      SELECT COUNT(*) as count FROM users u ${whereClause}
    `, params);
    
    // Debug logging
    console.log('Total result:', totalResult);
    
    // Check if result exists and has data
    if (!totalResult || totalResult.length === 0) {
      console.error('No results returned from count query');
      return res.status(500).json({ error: 'Failed to get user count' });
    }
    
    const total = totalResult[0]?.count || 0;
    const pages = Math.ceil(total / limit);
    
    // Get users
    const users = await allQuery(`
      SELECT u.*, banned_by.username as banned_by_name
      FROM users u
      LEFT JOIN users banned_by ON u.hub_banned_by = banned_by.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);
    
    res.json({
      users: users || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/management/users/:id/ban', requireManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const bannedBy = req.user.id;
    
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }
    
    // Check if user exists and is not already banned
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.is_hub_banned) {
      return res.status(400).json({ error: 'User is already banned' });
    }
    
    // Cannot ban admins or yourself
    if (user.is_admin || user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban this user' });
    }
    
    // Ban user
    await runQuery(`
      UPDATE users 
      SET is_hub_banned = TRUE, hub_ban_reason = ?, hub_banned_by = ?, hub_banned_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reason.trim(), bannedBy, id]);
    
    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('User ban error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.post('/management/users/:id/unban', requireManagement, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and is banned
    const user = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.is_hub_banned) {
      return res.status(400).json({ error: 'User is not banned' });
    }
    
    // Unban user
    await runQuery(`
      UPDATE users 
      SET is_hub_banned = FALSE, hub_ban_reason = NULL, hub_banned_by = NULL, hub_banned_at = NULL
      WHERE id = ?
    `, [id]);
    
    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('User unban error:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

// Get user's submissions for a specific application
router.get('/applications/:id/my-submissions', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const submissions = await allQuery(`
      SELECT * FROM application_submissions 
      WHERE form_id = ? AND user_id = ?
      ORDER BY submitted_at DESC
    `, [id, userId]);
    
    res.json(submissions);
  } catch (error) {
    console.error('My submissions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;