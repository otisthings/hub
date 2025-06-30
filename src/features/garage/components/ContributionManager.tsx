import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Key, 
  DollarSign, 
  Plus, 
  Trash2, 
  Save,
  Shield,
  Edit2,
  Car,
  UserCheck,
  Award
} from 'lucide-react';
import { garageAPI } from '../services/garageAPI';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

interface GarageConfig {
  vehicle_team_role_id: string;
  general_contributor_role_id: string;
  shared_vehicle_credits: number;
  personal_vehicle_credits: number;
}

interface Tier {
  id: number;
  name: string;
  description: string;
  price_usd: number;
  monthly_vouchers: number;
  tier_role_id: string;
  stackable: boolean;
  display_order: number;
}

interface RolePermission {
  id?: number;
  role_id: string;
  role_name?: string;
  can_view_manager: boolean;
  can_generate_codes: boolean;
  can_delete_vehicles: boolean;
  can_edit_vehicles: boolean;
}

interface VehicleStatus {
  id: number;
  name: string;
  color: string;
  display_order: number;
  is_default: boolean;
}

export const ContributionManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('config');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Configuration state
  const [config, setConfig] = useState<GarageConfig>({
    vehicle_team_role_id: '',
    general_contributor_role_id: '',
    shared_vehicle_credits: 1,
    personal_vehicle_credits: 2
  });
  
  // Tiers state
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [newTier, setNewTier] = useState<Partial<Tier>>({
    name: '',
    description: '',
    price_usd: 0,
    monthly_vouchers: 0,
    tier_role_id: '',
    stackable: false
  });
  
  // Permissions state
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [newRolePermission, setNewRolePermission] = useState<RolePermission>({
    role_id: '',
    can_view_manager: false,
    can_generate_codes: false,
    can_delete_vehicles: false,
    can_edit_vehicles: false
  });
  
  // Vehicle statuses state
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleStatus[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [configData, rolePermissionsData] = await Promise.all([
        garageAPI.getConfig(),
        garageAPI.getRolePermissions()
      ]);
      
      setConfig(configData.config || {});
      setTiers(configData.tiers || []);
      setVehicleStatuses(configData.statuses || []);
      setRolePermissions(rolePermissionsData || []);
    } catch (error) {
      console.error('Failed to fetch garage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await garageAPI.updateConfig(config);
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.name || !newTier.price_usd || !newTier.monthly_vouchers) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const result = await garageAPI.createTier(newTier);
      setTiers([...tiers, { ...newTier, id: result.id } as Tier]);
      setNewTier({
        name: '',
        description: '',
        price_usd: 0,
        monthly_vouchers: 0,
        tier_role_id: '',
        stackable: false
      });
      alert('Tier created successfully!');
    } catch (error) {
      console.error('Failed to create tier:', error);
      alert('Failed to create tier');
    }
  };

  const handleUpdateTier = async (tier: Tier) => {
    try {
      await garageAPI.updateTier(tier.id.toString(), tier);
      alert('Tier updated successfully!');
    } catch (error) {
      console.error('Failed to update tier:', error);
      alert('Failed to update tier');
    }
  };

  const handleDeleteTier = async (tierId: number) => {
    if (!confirm('Are you sure you want to delete this tier?')) return;

    try {
      await garageAPI.deleteTier(tierId.toString());
      setTiers(tiers.filter(t => t.id !== tierId));
      alert('Tier deleted successfully!');
    } catch (error) {
      console.error('Failed to delete tier:', error);
      alert('Failed to delete tier');
    }
  };

  const handleAddRolePermission = async () => {
    if (!newRolePermission.role_id) {
      alert('Please enter a Discord Role ID');
      return;
    }

    try {
      await garageAPI.updateRolePermissions(newRolePermission.role_id, {
        can_view_manager: newRolePermission.can_view_manager,
        can_generate_codes: newRolePermission.can_generate_codes,
        can_delete_vehicles: newRolePermission.can_delete_vehicles,
        can_edit_vehicles: newRolePermission.can_edit_vehicles
      });
      
      setRolePermissions([...rolePermissions, newRolePermission]);
      setNewRolePermission({
        role_id: '',
        can_view_manager: false,
        can_generate_codes: false,
        can_delete_vehicles: false,
        can_edit_vehicles: false
      });
      alert('Role permissions added successfully!');
    } catch (error) {
      console.error('Failed to add role permissions:', error);
      alert('Failed to add role permissions');
    }
  };

  const handleUpdateRolePermission = async (rolePermission: RolePermission) => {
    try {
      await garageAPI.updateRolePermissions(rolePermission.role_id, {
        can_view_manager: rolePermission.can_view_manager,
        can_generate_codes: rolePermission.can_generate_codes,
        can_delete_vehicles: rolePermission.can_delete_vehicles,
        can_edit_vehicles: rolePermission.can_edit_vehicles
      });
      alert('Role permissions updated successfully!');
    } catch (error) {
      console.error('Failed to update role permissions:', error);
      alert('Failed to update role permissions');
    }
  };

  const tabs = [
    { id: 'config', name: 'Configuration', icon: Settings },
    { id: 'tiers', name: 'Contributor Tiers', icon: Award },
    { id: 'permissions', name: 'Role Permissions', icon: Shield },
    { id: 'statuses', name: 'Vehicle Statuses', icon: Car }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Contribution Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure garage settings, contributor tiers, and permissions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Garage Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Vehicle Team Role ID
              </label>
              <input
                type="text"
                value={config.vehicle_team_role_id}
                onChange={(e) => setConfig({...config, vehicle_team_role_id: e.target.value})}
                placeholder="Discord Role ID for Vehicle Team"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                General Contributor Role ID
              </label>
              <input
                type="text"
                value={config.general_contributor_role_id}
                onChange={(e) => setConfig({...config, general_contributor_role_id: e.target.value})}
                placeholder="Discord Role ID for Contributors"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shared Vehicle Credits
              </label>
              <input
                type="number"
                value={config.shared_vehicle_credits}
                onChange={(e) => setConfig({...config, shared_vehicle_credits: parseInt(e.target.value)})}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Personal Vehicle Credits
              </label>
              <input
                type="number"
                value={config.personal_vehicle_credits}
                onChange={(e) => setConfig({...config, personal_vehicle_credits: parseInt(e.target.value)})}
                min="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {saving ? <LoadingSpinner /> : <Save className="h-5 w-5 mr-2" />}
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Contributor Tiers Tab */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          {/* Add New Tier */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Add New Contributor Tier
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tier Name
                </label>
                <input
                  type="text"
                  value={newTier.name}
                  onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                  placeholder="e.g., Bronze Contributor"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price (USD)
                </label>
                <input
                  type="number"
                  value={newTier.price_usd}
                  onChange={(e) => setNewTier({...newTier, price_usd: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monthly Vouchers
                </label>
                <input
                  type="number"
                  value={newTier.monthly_vouchers}
                  onChange={(e) => setNewTier({...newTier, monthly_vouchers: parseInt(e.target.value)})}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newTier.description}
                  onChange={(e) => setNewTier({...newTier, description: e.target.value})}
                  placeholder="Brief description of this tier"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tier Role ID (Optional)
                </label>
                <input
                  type="text"
                  value={newTier.tier_role_id}
                  onChange={(e) => setNewTier({...newTier, tier_role_id: e.target.value})}
                  placeholder="Discord Role ID"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={newTier.stackable}
                  onChange={(e) => setNewTier({...newTier, stackable: e.target.checked})}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Stackable vouchers (unused vouchers carry over to next month)
                </span>
              </label>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleAddTier}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add Tier
              </button>
            </div>
          </div>

          {/* Existing Tiers */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Existing Contributor Tiers
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Tier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vouchers
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tiers.map((tier) => (
                    <tr key={tier.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {tier.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {tier.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        ${tier.price_usd}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {tier.monthly_vouchers}
                        {tier.stackable && (
                          <span className="ml-1 text-xs text-green-600 dark:text-green-400">(Stackable)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {tier.tier_role_id || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleUpdateTier(tier)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTier(tier.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Role Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-6">
          {/* Add New Role Permission */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Add Role Permissions
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord Role ID
                </label>
                <input
                  type="text"
                  value={newRolePermission.role_id}
                  onChange={(e) => setNewRolePermission({...newRolePermission, role_id: e.target.value})}
                  placeholder="Enter Discord Role ID"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Garage Permissions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newRolePermission.can_view_manager}
                      onChange={(e) => setNewRolePermission({...newRolePermission, can_view_manager: e.target.checked})}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          View Contribution Manager
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Access to the contribution manager page
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newRolePermission.can_generate_codes}
                      onChange={(e) => setNewRolePermission({...newRolePermission, can_generate_codes: e.target.checked})}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Generate Codes
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Create subscription and credit codes
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newRolePermission.can_delete_vehicles}
                      onChange={(e) => setNewRolePermission({...newRolePermission, can_delete_vehicles: e.target.checked})}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Delete Vehicles
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Remove vehicles from the system
                      </p>
                    </div>
                  </label>
                  
                  <label className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={newRolePermission.can_edit_vehicles}
                      onChange={(e) => setNewRolePermission({...newRolePermission, can_edit_vehicles: e.target.checked})}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="ml-3">
                      <div className="flex items-center space-x-2">
                        <Edit2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Edit Vehicles
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Modify vehicle details and status
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div>
                <button
                  onClick={handleAddRolePermission}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Role Permissions
                </button>
              </div>
            </div>
          </div>

          {/* Existing Role Permissions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Current Role Permissions
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role ID
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      View Manager
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Generate Codes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Delete Vehicles
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Edit Vehicles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rolePermissions.map((permission, index) => (
                    <tr key={permission.role_id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {permission.role_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_view_manager}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[index].can_view_manager = e.target.checked;
                            setRolePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_generate_codes}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[index].can_generate_codes = e.target.checked;
                            setRolePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_delete_vehicles}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[index].can_delete_vehicles = e.target.checked;
                            setRolePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_edit_vehicles}
                          onChange={(e) => {
                            const updated = [...rolePermissions];
                            updated[index].can_edit_vehicles = e.target.checked;
                            setRolePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleUpdateRolePermission(permission)}
                          className="inline-flex items-center px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-xs"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Statuses Tab */}
      {activeTab === 'statuses' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Vehicle Status Management
          </h2>
          
          <div className="space-y-4">
            {vehicleStatuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color }}
                  ></div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {status.name}
                  </span>
                  {status.is_default && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 text-xs font-medium rounded-full">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Order: {status.display_order}
                </div>
              </div>
            ))}
          </div>
          
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            Vehicle statuses are automatically configured. Contact a developer to modify the status workflow.
          </p>
        </div>
      )}
    </div>
  );
};