import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { findUserByDiscordId } from '../config/staffDatabase.js';
import { isStaffDatabaseAvailable } from '../config/staffDatabase.js';
import { featureFlags } from '../config/features.js';

const router = express.Router();

// Get user profile data
router.get('/', requireAuth, async (req, res) => {
  try {
    // Only attempt to fetch staff data if the feature is enabled and database is available
    if (featureFlags.enablePlayerRecord && isStaffDatabaseAvailable()) {
      try {
        const staffData = await findUserByDiscordId(req.user.discord_id);
        if (staffData) {
          return res.json(staffData);
        }
      } catch (error) {
        console.error('Error finding user by Discord ID:', error);
      }
    }
    
    // Return basic profile data if staff features are disabled or data not found
    res.json({
      discord_id: req.user.discord_id,
      username: req.user.username,
      avatar: req.user.avatar,
      discriminator: req.user.discriminator,
      roles: req.user.roles || [],
      is_admin: req.user.is_admin || false,
      // Return empty/default values for staff-specific fields
      trustScore: 0,
      kicks: [],
      warnings: [],
      bans: [],
      commends: []
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;