import dotenv from 'dotenv';

dotenv.config();

// Feature flags configuration
export const featureFlags = {
  // Departments/Organizations module
  enableDepartments: process.env.ENABLE_DEPARTMENTS !== 'false',
  enableOrganizations: process.env.ENABLE_ORGANIZATIONS !== 'false',
  
  // Profile features
  enablePlayerRecord: process.env.ENABLE_PLAYER_RECORD !== 'false',
  enableTimeclock: process.env.ENABLE_TIMECLOCK !== 'false'
};

// Middleware to check if a feature is enabled
export function requireFeature(featureName) {
  return (req, res, next) => {
    if (featureFlags[featureName]) {
      next();
    } else {
      res.status(404).json({ error: 'Feature not available' });
    }
  };
} 