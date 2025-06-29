export function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

export function requireAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.is_admin) {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

export function requireStaffOrAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Admin always has access
  if (req.user.is_admin) {
    return next();
  }
  
  // Check if user has any staff roles based on categories
  req.isStaff = true; // Will be determined by category access
  return next();
}

export function requireApplicationAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // System admin always has access
  if (req.user.is_admin) {
    return next();
  }

  // Check if user has application admin role
  const userRoles = JSON.parse(req.user.roles || '[]');
  const hasApplicationAdminRole = userRoles.some(role => 
    role.id === process.env.DISCORD_APPLICATION_ADMIN_ROLE_ID
  );

  if (!hasApplicationAdminRole) {
    return res.status(403).json({ error: 'Application admin access required' });
  }

  next();
}

export async function requireApplicationModerator(req, res, next) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // System admin always has access
    if (req.user.is_admin) {
      return next();
    }

    // Get the application ID from the URL parameters
    const appId = req.params.appId || req.params.id;
    if (!appId) {
      return res.status(400).json({ error: 'Application ID is required' });
    }

    // Get application details
    const { getQuery } = await import('../config/database.js');
    const application = await getQuery('SELECT * FROM application_forms WHERE id = ?', [appId]);
    
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if user has the application-specific admin or moderator role
    const userRoles = JSON.parse(req.user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    const hasApplicationRole = userRoleIds.includes(application.admin_role_id) || 
                             userRoleIds.includes(application.moderator_role_id);

    if (!hasApplicationRole) {
      return res.status(403).json({ error: 'Application moderator access required' });
    }

    // Store application info for later use
    req.application = application;
    next();
  } catch (error) {
    console.error('Application moderator check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// NEW: Management role middleware
export function requireManagement(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // System admin always has access
  if (req.user.is_admin) {
    return next();
  }

  // Check if user has management role
  const userRoles = JSON.parse(req.user.roles || '[]');
  const hasManagementRole = userRoles.some(role => 
    role.id === process.env.MANAGEMENT_ROLE_ID
  );

  if (!hasManagementRole) {
    return res.status(403).json({ error: 'Management access required' });
  }

  next();
}

// NEW: Support role middleware for strict support permissions
export function requireSupportRole(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admin always has access
  if (req.user.is_admin) {
    return next();
  }

  // Check if user has support role for any category
  const userRoles = JSON.parse(req.user.roles || '[]');
  const userRoleIds = userRoles.map(role => role.id);
  
  // This will be validated against specific categories in the route handlers
  req.userRoleIds = userRoleIds;
  req.isSupportMember = false; // Will be set to true if they have access to the specific ticket's category
  
  next();
}

export async function checkCategoryAccess(req, res, next) {
  try {
    const { categoryId } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin always has access
    if (user.is_admin) {
      req.isSupportMember = true;
      return next();
    }
    
    // Get category requirements
    const { getQuery } = await import('../config/database.js');
    const category = await getQuery(
      'SELECT required_role_id FROM categories WHERE id = ?',
      [categoryId]
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // If no role required, allow access
    if (!category.required_role_id) {
      return next();
    }
    
    // Check if user has required role
    const userRoles = JSON.parse(user.roles || '[]');
    const hasRequiredRole = userRoles.some(role => role.id === category.required_role_id);
    
    if (!hasRequiredRole) {
      return res.status(403).json({ error: 'Insufficient permissions for this category' });
    }
    
    req.isSupportMember = true;
    next();
  } catch (error) {
    console.error('Category access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// NEW: Check if user has support access to a specific ticket
export async function checkTicketSupportAccess(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Admin always has access
    if (user.is_admin) {
      req.isSupportMember = true;
      return next();
    }
    
    // Get ticket and its category
    const { getQuery } = await import('../config/database.js');
    const ticket = await getQuery(`
      SELECT t.*, c.required_role_id 
      FROM tickets t 
      LEFT JOIN categories c ON t.category_id = c.id 
      WHERE t.id = ?
    `, [id]);
    
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check if user has required role for this ticket's category
    if (ticket.required_role_id) {
      const userRoles = JSON.parse(user.roles || '[]');
      const hasRequiredRole = userRoles.some(role => role.id === ticket.required_role_id);
      
      if (hasRequiredRole) {
        req.isSupportMember = true;
      }
    }
    
    // Store ticket info for later use
    req.ticketInfo = ticket;
    next();
  } catch (error) {
    console.error('Ticket support access check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getUserAccessibleCategories(user) {
  try {
    const { allQuery } = await import('../config/database.js');
    
    if (user.is_admin) {
      // Admin can access all categories
      return await allQuery('SELECT * FROM categories ORDER BY name');
    }
    
    const userRoles = JSON.parse(user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    if (userRoleIds.length === 0) {
      // Get categories where no role is required
      return await allQuery(`
        SELECT * FROM categories 
        WHERE required_role_id IS NULL 
        ORDER BY name
      `);
    }
    
    // Get categories where user has required role or no role required
    const placeholders = userRoleIds.map(() => '?').join(',');
    const categories = await allQuery(`
      SELECT * FROM categories 
      WHERE required_role_id IS NULL 
      OR required_role_id IN (${placeholders})
      ORDER BY name
    `, userRoleIds);
    
    return categories;
  } catch (error) {
    console.error('Error getting accessible categories:', error);
    return [];
  }
}

export async function getUserAccessibleApplications(user) {
  try {
    const { allQuery } = await import('../config/database.js');
    
    if (user.is_admin) {
      // Admin can access all applications
      return await allQuery('SELECT * FROM application_forms WHERE is_active = 1 ORDER BY name');
    }
    
    const userRoles = JSON.parse(user.roles || '[]');
    const userRoleIds = userRoles.map(role => role.id);
    
    if (userRoleIds.length === 0) {
      // Get applications where no role is required
      return await allQuery(`
        SELECT * FROM application_forms 
        WHERE is_active = 1 AND (admin_role_id IS NULL AND moderator_role_id IS NULL)
        ORDER BY name
      `);
    }
    
    // Get applications where user has admin or moderator role
    const placeholders = userRoleIds.map(() => '?').join(',');
    const applications = await allQuery(`
      SELECT * FROM application_forms 
      WHERE is_active = 1 AND (
        admin_role_id IN (${placeholders}) OR 
        moderator_role_id IN (${placeholders})
      )
      ORDER BY name
    `, [...userRoleIds, ...userRoleIds]);
    
    return applications;
  } catch (error) {
    console.error('Error getting accessible applications:', error);
    return [];
  }
}