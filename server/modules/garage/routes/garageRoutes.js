import express from 'express';
import { requireAuth, requireAdmin } from '../../../middleware/auth.js';
import { GarageController } from '../controllers/GarageController.js';
import { GarageModels } from '../models/GarageModels.js';

const router = express.Router();

// Middleware to check garage permissions
const requireGaragePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admin always has access
      if (req.user.is_admin) {
        return next();
      }

      const userRoles = JSON.parse(req.user.roles || '[]');
      const permissions = await GarageModels.getUserGaragePermissions(userRoles);

      if (!permissions[permission]) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

const requireActiveSubscription = async (req, res, next) => {
  try {
    const subscriptions = await GarageModels.getUserActiveSubscriptions(req.user.id);
    if (subscriptions.length === 0) {
      return res.status(403).json({ error: 'Active subscription required' });
    }
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ error: 'Subscription check failed' });
  }
};

// Public routes
router.get('/tiers', GarageController.getTiers);
router.post('/redeem', requireAuth, GarageController.redeemCode);

// User routes (require active subscription)
router.get('/dashboard', requireAuth, GarageController.getUserDashboard);
router.post('/vehicles', requireAuth, requireActiveSubscription, GarageController.submitVehicle);
router.get('/my-vehicles', requireAuth, GarageController.getUserVehicles);

// Admin routes
router.get('/config', requireAuth, requireGaragePermission('can_view_manager'), GarageController.getConfig);
router.put('/config', requireAuth, requireGaragePermission('can_view_manager'), GarageController.updateConfig);

router.get('/permissions', requireAuth, requireGaragePermission('can_view_manager'), GarageController.getRolePermissions);
router.put('/permissions', requireAuth, requireGaragePermission('can_view_manager'), GarageController.updateRolePermissions);

router.post('/tiers', requireAuth, requireGaragePermission('can_view_manager'), GarageController.createTier);
router.put('/tiers/:id', requireAuth, requireGaragePermission('can_view_manager'), GarageController.updateTier);
router.delete('/tiers/:id', requireAuth, requireGaragePermission('can_view_manager'), GarageController.deleteTier);

router.post('/generate-codes', requireAuth, requireGaragePermission('can_generate_codes'), GarageController.generateCodes);

export default router;