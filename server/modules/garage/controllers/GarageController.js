import { GarageModels } from '../models/GarageModels.js';
import { runQuery, getQuery, allQuery } from '../../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class GarageController {
  // Get garage configuration
  static async getConfig(req, res) {
    try {
      const config = await getQuery('SELECT * FROM garage_config LIMIT 1');
      const tiers = await allQuery(`
        SELECT * FROM garage_tiers 
        WHERE is_active = TRUE 
        ORDER BY display_order ASC
      `);
      const statuses = await allQuery(`
        SELECT * FROM garage_vehicle_statuses 
        ORDER BY display_order ASC
      `);

      res.json({
        config: config || {},
        tiers,
        statuses
      });
    } catch (error) {
      console.error('Error fetching garage config:', error);
      res.status(500).json({ error: 'Failed to fetch garage configuration' });
    }
  }

  // Update garage configuration
  static async updateConfig(req, res) {
    try {
      const {
        vehicle_team_role_id,
        general_contributor_role_id,
        shared_vehicle_credits,
        personal_vehicle_credits
      } = req.body;

      await runQuery(`
        UPDATE garage_config SET
        vehicle_team_role_id = ?,
        general_contributor_role_id = ?,
        shared_vehicle_credits = ?,
        personal_vehicle_credits = ?
        WHERE id = 1
      `, [
        vehicle_team_role_id,
        general_contributor_role_id,
        shared_vehicle_credits,
        personal_vehicle_credits
      ]);

      res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
      console.error('Error updating garage config:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  }

  // Get role permissions
  static async getRolePermissions(req, res) {
    try {
      const permissions = await allQuery('SELECT * FROM garage_role_permissions');
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ error: 'Failed to fetch role permissions' });
    }
  }

  // Update role permissions
  static async updateRolePermissions(req, res) {
    try {
      const { role_id, permissions } = req.body;

      await runQuery(`
        INSERT INTO garage_role_permissions 
        (role_id, can_view_manager, can_generate_codes, can_delete_vehicles, can_edit_vehicles)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        can_view_manager = VALUES(can_view_manager),
        can_generate_codes = VALUES(can_generate_codes),
        can_delete_vehicles = VALUES(can_delete_vehicles),
        can_edit_vehicles = VALUES(can_edit_vehicles)
      `, [
        role_id,
        permissions.can_view_manager,
        permissions.can_generate_codes,
        permissions.can_delete_vehicles,
        permissions.can_edit_vehicles
      ]);

      res.json({ success: true, message: 'Permissions updated successfully' });
    } catch (error) {
      console.error('Error updating role permissions:', error);
      res.status(500).json({ error: 'Failed to update permissions' });
    }
  }

  // Tier management
  static async getTiers(req, res) {
    try {
      const tiers = await allQuery(`
        SELECT * FROM garage_tiers 
        WHERE is_active = TRUE 
        ORDER BY display_order ASC
      `);
      res.json(tiers);
    } catch (error) {
      console.error('Error fetching tiers:', error);
      res.status(500).json({ error: 'Failed to fetch tiers' });
    }
  }

  static async createTier(req, res) {
    try {
      const { name, description, price_usd, monthly_vouchers, tier_role_id, stackable } = req.body;

      const result = await runQuery(`
        INSERT INTO garage_tiers 
        (name, description, price_usd, monthly_vouchers, tier_role_id, stackable)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, description, price_usd, monthly_vouchers, tier_role_id, stackable]);

      res.json({ success: true, id: result.insertId, message: 'Tier created successfully' });
    } catch (error) {
      console.error('Error creating tier:', error);
      res.status(500).json({ error: 'Failed to create tier' });
    }
  }

  static async updateTier(req, res) {
    try {
      const { id } = req.params;
      const { name, description, price_usd, monthly_vouchers, tier_role_id, stackable } = req.body;

      await runQuery(`
        UPDATE garage_tiers SET
        name = ?, description = ?, price_usd = ?, monthly_vouchers = ?, 
        tier_role_id = ?, stackable = ?
        WHERE id = ?
      `, [name, description, price_usd, monthly_vouchers, tier_role_id, stackable, id]);

      res.json({ success: true, message: 'Tier updated successfully' });
    } catch (error) {
      console.error('Error updating tier:', error);
      res.status(500).json({ error: 'Failed to update tier' });
    }
  }

  static async deleteTier(req, res) {
    try {
      const { id } = req.params;

      await runQuery('UPDATE garage_tiers SET is_active = FALSE WHERE id = ?', [id]);

      res.json({ success: true, message: 'Tier deleted successfully' });
    } catch (error) {
      console.error('Error deleting tier:', error);
      res.status(500).json({ error: 'Failed to delete tier' });
    }
  }

  // Code generation
  static async generateCodes(req, res) {
    try {
      const { type, tier_id, credit_amount, count } = req.body;
      const codes = [];

      for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(16).toString('hex').toUpperCase();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

        await runQuery(`
          INSERT INTO garage_codes 
          (code_string, type, tier_id, credit_amount, expires_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [code, type, tier_id, credit_amount, expiresAt, req.user.id]);

        codes.push(code);
      }

      res.json({ success: true, codes, message: `Generated ${count} codes successfully` });
    } catch (error) {
      console.error('Error generating codes:', error);
      res.status(500).json({ error: 'Failed to generate codes' });
    }
  }

  // Code redemption
  static async redeemCode(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.id;

      // Find the code
      const codeData = await getQuery(`
        SELECT gc.*, gt.name as tier_name, gt.tier_role_id, gt.monthly_vouchers
        FROM garage_codes gc
        LEFT JOIN garage_tiers gt ON gc.tier_id = gt.id
        WHERE gc.code_string = ? AND gc.used_at IS NULL AND gc.expires_at > NOW()
      `, [code]);

      if (!codeData) {
        return res.status(400).json({ error: 'Invalid or expired code' });
      }

      // Mark code as used
      await runQuery(`
        UPDATE garage_codes 
        SET used_at = NOW(), used_by = ? 
        WHERE id = ?
      `, [userId, codeData.id]);

      if (codeData.type === 'subscription') {
        // Grant subscription
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

        await runQuery(`
          INSERT INTO garage_subscriptions 
          (user_id, tier_id, expires_at, vouchers_remaining)
          VALUES (?, ?, ?, ?)
        `, [userId, codeData.tier_id, expiresAt, codeData.monthly_vouchers]);

        // TODO: Grant Discord roles here
        res.json({ 
          success: true, 
          message: `Subscription activated: ${codeData.tier_name}`,
          type: 'subscription',
          tier: codeData.tier_name
        });
      } else {
        // Grant credits
        await GarageModels.addUserCredits(userId, codeData.credit_amount);

        res.json({ 
          success: true, 
          message: `${codeData.credit_amount} credits added to your account`,
          type: 'credit',
          amount: codeData.credit_amount
        });
      }
    } catch (error) {
      console.error('Error redeeming code:', error);
      res.status(500).json({ error: 'Failed to redeem code' });
    }
  }

  // Vehicle submission
  static async submitVehicle(req, res) {
    try {
      const {
        name,
        year,
        make,
        model,
        is_shared,
        is_paid,
        purchase_proof_url,
        images
      } = req.body;

      const userId = req.user.id;

      // Check if user has active subscription
      const subscriptions = await GarageModels.getUserActiveSubscriptions(userId);
      if (subscriptions.length === 0) {
        return res.status(403).json({ error: 'Active subscription required to submit vehicles' });
      }

      // Get config for credit costs
      const config = await getQuery('SELECT * FROM garage_config LIMIT 1');
      const creditCost = is_shared ? config.shared_vehicle_credits : config.personal_vehicle_credits;

      // Check and deduct credits
      const hasCredits = await GarageModels.deductUserCredits(userId, creditCost);
      if (!hasCredits) {
        return res.status(400).json({ error: 'Insufficient credits' });
      }

      // Get default status
      const defaultStatus = await getQuery(
        'SELECT id FROM garage_vehicle_statuses WHERE is_default = TRUE LIMIT 1'
      );

      // Create vehicle
      const vehicleUuid = uuidv4();
      const result = await runQuery(`
        INSERT INTO garage_vehicles 
        (vehicle_uuid, owner_id, name, year, make, model, is_shared, is_paid, purchase_proof_url, status_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vehicleUuid,
        userId,
        name,
        year,
        make,
        model,
        is_shared,
        is_paid,
        purchase_proof_url,
        defaultStatus?.id
      ]);

      // Add images if provided
      if (images && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          await runQuery(`
            INSERT INTO garage_vehicle_images (vehicle_id, image_url, display_order)
            VALUES (?, ?, ?)
          `, [result.insertId, images[i], i]);
        }
      }

      res.json({ 
        success: true, 
        vehicle_uuid: vehicleUuid,
        message: 'Vehicle submitted successfully' 
      });
    } catch (error) {
      console.error('Error submitting vehicle:', error);
      res.status(500).json({ error: 'Failed to submit vehicle' });
    }
  }

  // Get user's vehicles
  static async getUserVehicles(req, res) {
    try {
      const userId = req.user.id;

      // Get owned vehicles
      const ownedVehicles = await allQuery(`
        SELECT gv.*, gvs.name as status_name, gvs.color as status_color,
               GROUP_CONCAT(gvi.image_url ORDER BY gvi.display_order) as images
        FROM garage_vehicles gv
        LEFT JOIN garage_vehicle_statuses gvs ON gv.status_id = gvs.id
        LEFT JOIN garage_vehicle_images gvi ON gv.id = gvi.id AND gvi.is_admin_only = FALSE
        WHERE gv.owner_id = ?
        GROUP BY gv.id
        ORDER BY gv.created_at DESC
      `, [userId]);

      // Get shared vehicles user has access to
      const sharedVehicles = await allQuery(`
        SELECT gv.*, gvs.name as status_name, gvs.color as status_color,
               u.username as owner_name,
               GROUP_CONCAT(gvi.image_url ORDER BY gvi.display_order) as images
        FROM garage_vehicles gv
        JOIN garage_vehicle_access gva ON gv.id = gva.vehicle_id
        JOIN users u ON gv.owner_id = u.id
        LEFT JOIN garage_vehicle_statuses gvs ON gv.status_id = gvs.id
        LEFT JOIN garage_vehicle_images gvi ON gv.id = gvi.id AND gvi.is_admin_only = FALSE
        WHERE gva.user_id = ?
        GROUP BY gv.id
        ORDER BY gv.created_at DESC
      `, [userId]);

      // Get vehicles from active subscriptions (shared vehicles)
      const subscriptions = await GarageModels.getUserActiveSubscriptions(userId);
      let subscriptionVehicles = [];
      
      if (subscriptions.length > 0) {
        subscriptionVehicles = await allQuery(`
          SELECT gv.*, gvs.name as status_name, gvs.color as status_color,
                 u.username as owner_name,
                 GROUP_CONCAT(gvi.image_url ORDER BY gvi.display_order) as images
          FROM garage_vehicles gv
          JOIN users u ON gv.owner_id = u.id
          LEFT JOIN garage_vehicle_statuses gvs ON gv.status_id = gvs.id
          LEFT JOIN garage_vehicle_images gvi ON gv.id = gvi.id AND gvi.is_admin_only = FALSE
          WHERE gv.is_shared = TRUE AND gv.owner_id != ?
          GROUP BY gv.id
          ORDER BY gv.created_at DESC
        `, [userId]);
      }

      res.json({
        owned: ownedVehicles.map(v => ({ ...v, images: v.images ? v.images.split(',') : [] })),
        shared: sharedVehicles.map(v => ({ ...v, images: v.images ? v.images.split(',') : [] })),
        subscription: subscriptionVehicles.map(v => ({ ...v, images: v.images ? v.images.split(',') : [] }))
      });
    } catch (error) {
      console.error('Error fetching user vehicles:', error);
      res.status(500).json({ error: 'Failed to fetch vehicles' });
    }
  }

  // Get user dashboard data
  static async getUserDashboard(req, res) {
    try {
      const userId = req.user.id;

      const [subscriptions, credits] = await Promise.all([
        GarageModels.getUserActiveSubscriptions(userId),
        GarageModels.getUserCredits(userId)
      ]);

      res.json({
        subscriptions,
        credits,
        hasAccess: subscriptions.length > 0
      });
    } catch (error) {
      console.error('Error fetching user dashboard:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
  }
}