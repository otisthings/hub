import express from 'express';
import { getQuery, allQuery } from '../../../config/database.js';
import { GarageModels } from '../models/GarageModels.js';

const router = express.Router();

// API v1 routes for external integration
router.get('/v1/vehicles/:vehicle_uuid', async (req, res) => {
  try {
    const { vehicle_uuid } = req.params;

    const vehicle = await getQuery(`
      SELECT gv.vehicle_uuid, gv.name, gv.year, gv.make, gv.model, 
             gv.is_shared, gv.spawn_code, gv.created_at,
             u.discord_id as owner_discord_id, u.username as owner_name,
             gvs.name as status_name
      FROM garage_vehicles gv
      JOIN users u ON gv.owner_id = u.id
      LEFT JOIN garage_vehicle_statuses gvs ON gv.status_id = gvs.id
      WHERE gv.vehicle_uuid = ?
    `, [vehicle_uuid]);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    res.status(500).json({ error: 'Failed to fetch vehicle' });
  }
});

router.get('/v1/users/:discord_id/vehicles', async (req, res) => {
  try {
    const { discord_id } = req.params;

    // Get user
    const user = await getQuery('SELECT id FROM users WHERE discord_id = ?', [discord_id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get owned vehicles
    const ownedVehicles = await allQuery(`
      SELECT vehicle_uuid FROM garage_vehicles WHERE owner_id = ?
    `, [user.id]);

    // Get vehicles with granted access
    const accessVehicles = await allQuery(`
      SELECT gv.vehicle_uuid 
      FROM garage_vehicles gv
      JOIN garage_vehicle_access gva ON gv.id = gva.vehicle_id
      WHERE gva.user_id = ?
    `, [user.id]);

    // Get shared vehicles from active subscriptions
    const subscriptions = await GarageModels.getUserActiveSubscriptions(user.id);
    let sharedVehicles = [];
    
    if (subscriptions.length > 0) {
      sharedVehicles = await allQuery(`
        SELECT vehicle_uuid 
        FROM garage_vehicles 
        WHERE is_shared = TRUE AND owner_id != ?
      `, [user.id]);
    }

    const allVehicleUuids = [
      ...ownedVehicles.map(v => v.vehicle_uuid),
      ...accessVehicles.map(v => v.vehicle_uuid),
      ...sharedVehicles.map(v => v.vehicle_uuid)
    ];

    res.json({
      discord_id,
      vehicle_uuids: [...new Set(allVehicleUuids)] // Remove duplicates
    });
  } catch (error) {
    console.error('Error fetching user vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch user vehicles' });
  }
});

router.get('/v1/vehicles/:vehicle_uuid/access/:discord_id', async (req, res) => {
  try {
    const { vehicle_uuid, discord_id } = req.params;

    // Get user
    const user = await getQuery('SELECT id FROM users WHERE discord_id = ?', [discord_id]);
    if (!user) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get vehicle
    const vehicle = await getQuery(`
      SELECT id, owner_id, is_shared 
      FROM garage_vehicles 
      WHERE vehicle_uuid = ?
    `, [vehicle_uuid]);

    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Check if user owns the vehicle
    if (vehicle.owner_id === user.id) {
      return res.json({ access: true, reason: 'owner' });
    }

    // Check if user has explicit access
    const explicitAccess = await getQuery(`
      SELECT id FROM garage_vehicle_access 
      WHERE vehicle_id = ? AND user_id = ?
    `, [vehicle.id, user.id]);

    if (explicitAccess) {
      return res.json({ access: true, reason: 'granted' });
    }

    // Check if it's a shared vehicle and user has active subscription
    if (vehicle.is_shared) {
      const subscriptions = await GarageModels.getUserActiveSubscriptions(user.id);
      if (subscriptions.length > 0) {
        return res.json({ access: true, reason: 'subscription' });
      }
    }

    res.status(403).json({ access: false, error: 'Access denied' });
  } catch (error) {
    console.error('Error checking vehicle access:', error);
    res.status(500).json({ error: 'Failed to check access' });
  }
});

export default router;