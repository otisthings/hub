import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getTimeclockDataByDiscordId } from '../config/timeclockDatabase.js';
import { isTimeclockDatabaseAvailable, isAnyTimeclockFeatureEnabled } from '../config/timeclockDatabase.js';

const router = express.Router();

// Middleware to check if timeclock features are available
const requireTimeclockFeatures = (req, res, next) => {
  if (!isAnyTimeclockFeatureEnabled()) {
    return res.status(404).json({ error: 'Timeclock features are disabled' });
  }
  if (!isTimeclockDatabaseAvailable()) {
    return res.status(503).json({ error: 'Timeclock database is not available' });
  }
  next();
};

// Get timeclock data for current user
router.get('/', requireAuth, requireTimeclockFeatures, async (req, res) => {
  try {
    const discordId = req.user.discord_id;
    
    if (!discordId) {
      return res.status(400).json({ error: 'Discord ID not found' });
    }
    
    // Get raw timeclock data
    const timeclockData = await getTimeclockDataByDiscordId(discordId);
    
    // Group by department and sum minutes
    const departmentTotals = {};
    
    timeclockData.forEach(entry => {
      const department = entry.department || 'Unknown Department';
      const minutes = parseInt(entry.minutes) || 0;
      
      if (departmentTotals[department]) {
        departmentTotals[department] += minutes;
      } else {
        departmentTotals[department] = minutes;
      }
    });
    
    // Convert to array and format
    const formattedData = Object.entries(departmentTotals).map(([department, totalMinutes]) => ({
      department,
      totalMinutes,
      formattedTime: formatTime(totalMinutes)
    }));
    
    // Sort by total minutes descending
    formattedData.sort((a, b) => b.totalMinutes - a.totalMinutes);
    
    res.json({
      departments: formattedData,
      totalEntries: timeclockData.length
    });
  } catch (error) {
    console.error('Error fetching timeclock data:', error);
    res.status(500).json({ error: 'Failed to fetch timeclock data' });
  }
});

// Helper function to format time
function formatTime(totalMinutes) {
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  }
  
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  
  if (totalHours < 24) {
    if (remainingMinutes === 0) {
      return `${totalHours} hour${totalHours !== 1 ? 's' : ''}`;
    }
    return `${totalHours} hour${totalHours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  const totalDays = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  
  let result = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  
  if (remainingHours > 0) {
    result += ` ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  }
  
  if (remainingMinutes > 0) {
    result += ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  return result;
}

export default router;