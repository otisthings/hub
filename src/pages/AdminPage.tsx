import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Shield, 
  FileText, 
  Tag, 
  UserCheck,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Car,
  Key,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { categoriesAPI, rolesAPI, garageAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  required_role_id: string;
  is_restricted: boolean;
}

interface SelfAssignableRole {
  id: number;
  role_id: string;
  name: string;
  description: string;
  icon_url: string;
  emoji: string;
  can_add: boolean;
  can_remove: boolean;
  is_active: boolean;
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

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('categories');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#5865F2',
    required_role_id: '',
    is_restricted: false
  });

  // Self-assignable roles state
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<SelfAssignableRole[]>([]);
  const [editingRole, setEditingRole] = useState<SelfAssignableRole | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [newRole, setNewRole] = useState({
    role_id: '',
    name: '',
    description: '',
    icon_url: '',
    emoji: '',
    can_add: true,
    can_remove: true,
    is_active: true,
    display_order: 0
  });

  // Garage permissions state
  const [garagePermissions, setGaragePermissions] = useState<RolePermission[]>([]);
  const [newGaragePermission, setNewGaragePermission] = useState<RolePermission>({
    role_id: '',
    can_view_manager: false,
    can_generate_codes: false,
    can_delete_vehicles: false,
    can_edit_vehicles: false
  });

  useEffect(() => {
    if (user?.is_admin) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [categoriesData, rolesData, garagePermissionsData] = await Promise.all([
        categoriesAPI.getAll(),
        rolesAPI.getAdminSelfAssignable(),
        garageAPI.getRolePermissions()
      ]);
      setCategories(categoriesData);
      setSelfAssignableRoles(rolesData);
      setGaragePermissions(garagePermissionsData || []);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Category functions
  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id.toString(), newCategory);
      } else {
        await categoriesAPI.create(newCategory);
      }
      await fetchData();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setNewCategory({
        name: '',
        description: '',
        color: '#5865F2',
        required_role_id: '',
        is_restricted: false
      });
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await categoriesAPI.delete(id.toString());
      await fetchData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // Self-assignable role functions
  const handleSaveRole = async () => {
    setSaving(true);
    try {
      if (editingRole) {
        await rolesAPI.updateSelfAssignable(editingRole.id.toString(), newRole);
      } else {
        await rolesAPI.createSelfAssignable(newRole);
      }
      await fetchData();
      setShowRoleModal(false);
      setEditingRole(null);
      setNewRole({
        role_id: '',
        name: '',
        description: '',
        icon_url: '',
        emoji: '',
        can_add: true,
        can_remove: true,
        is_active: true,
        display_order: 0
      });
    } catch (error) {
      console.error('Failed to save role:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await rolesAPI.deleteSelfAssignable(id.toString());
      await fetchData();
    } catch (error) {
      console.error('Failed to delete role:', error);
    }
  };

  // Garage permission functions
  const handleAddGaragePermission = async () => {
    if (!newGaragePermission.role_id) {
      alert('Please enter a Discord Role ID');
      return;
    }

    try {
      await garageAPI.updateRolePermissions(newGaragePermission.role_id, {
        can_view_manager: newGaragePermission.can_view_manager,
        can_generate_codes: newGaragePermission.can_generate_codes,
        can_delete_vehicles: newGaragePermission.can_delete_vehicles,
        can_edit_vehicles: newGaragePermission.can_edit_vehicles
      });
      
      setGaragePermissions([...garagePermissions, newGaragePermission]);
      setNewGaragePermission({
        role_id: '',
        can_view_manager: false,
        can_generate_codes: false,
        can_delete_vehicles: false,
        can_edit_vehicles: false
      });
      alert('Garage permissions added successfully!');
    } catch (error) {
      console.error('Failed to add garage permissions:', error);
      alert('Failed to add garage permissions');
    }
  };

  const handleUpdateGaragePermission = async (permission: RolePermission) => {
    try {
      await garageAPI.updateRolePermissions(permission.role_id, {
        can_view_manager: permission.can_view_manager,
        can_generate_codes: permission.can_generate_codes,
        can_delete_vehicles: permission.can_delete_vehicles,
        can_edit_vehicles: permission.can_edit_vehicles
      });
      alert('Garage permissions updated successfully!');
    } catch (error) {
      console.error('Failed to update garage permissions:', error);
      alert('Failed to update garage permissions');
    }
  };

  if (!user?.is_admin) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Only administrators can access this page.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const tabs = [
    { id: 'categories', name: 'Categories', icon: Tag },
    { id: 'roles', name: 'Self-Assignable Roles', icon: UserCheck },
    { id: 'garage', name: 'Garage Permissions', icon: Car },
    { id: 'settings', name: 'Settings', icon: Settings }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Panel
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage system configuration and permissions
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Ticket Categories
            </h2>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Required Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Restricted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          ></div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {category.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.required_role_id || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          category.is_restricted 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {category.is_restricted ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setNewCategory({
                                name: category.name,
                                description: category.description,
                                color: category.color,
                                required_role_id: category.required_role_id,
                                is_restricted: category.is_restricted
                              });
                              setShowCategoryModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
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

      {/* Self-Assignable Roles Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Self-Assignable Roles
            </h2>
            <button
              onClick={() => setShowRoleModal(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selfAssignableRoles.map((role) => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          {role.emoji && <span className="text-lg">{role.emoji}</span>}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {role.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {role.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                        {role.role_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex space-x-2">
                          {role.can_add && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              Add
                            </span>
                          )}
                          {role.can_remove && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              Remove
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          role.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                        }`}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingRole(role);
                              setNewRole({
                                role_id: role.role_id,
                                name: role.name,
                                description: role.description,
                                icon_url: role.icon_url,
                                emoji: role.emoji,
                                can_add: role.can_add,
                                can_remove: role.can_remove,
                                is_active: role.is_active,
                                display_order: role.display_order
                              });
                              setShowRoleModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
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

      {/* Garage Permissions Tab */}
      {activeTab === 'garage' && (
        <div className="space-y-6">
          {/* Add New Garage Permission */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Add Garage Role Permissions
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord Role ID
                </label>
                <input
                  type="text"
                  value={newGaragePermission.role_id}
                  onChange={(e) => setNewGaragePermission({...newGaragePermission, role_id: e.target.value})}
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
                      checked={newGaragePermission.can_view_manager}
                      onChange={(e) => setNewGaragePermission({...newGaragePermission, can_view_manager: e.target.checked})}
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
                      checked={newGaragePermission.can_generate_codes}
                      onChange={(e) => setNewGaragePermission({...newGaragePermission, can_generate_codes: e.target.checked})}
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
                      checked={newGaragePermission.can_delete_vehicles}
                      onChange={(e) => setNewGaragePermission({...newGaragePermission, can_delete_vehicles: e.target.checked})}
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
                      checked={newGaragePermission.can_edit_vehicles}
                      onChange={(e) => setNewGaragePermission({...newGaragePermission, can_edit_vehicles: e.target.checked})}
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
                  onClick={handleAddGaragePermission}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Role Permissions
                </button>
              </div>
            </div>
          </div>

          {/* Existing Garage Permissions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Current Garage Role Permissions
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
                  {garagePermissions.map((permission, index) => (
                    <tr key={permission.role_id || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                        {permission.role_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_view_manager}
                          onChange={(e) => {
                            const updated = [...garagePermissions];
                            updated[index].can_view_manager = e.target.checked;
                            setGaragePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_generate_codes}
                          onChange={(e) => {
                            const updated = [...garagePermissions];
                            updated[index].can_generate_codes = e.target.checked;
                            setGaragePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_delete_vehicles}
                          onChange={(e) => {
                            const updated = [...garagePermissions];
                            updated[index].can_delete_vehicles = e.target.checked;
                            setGaragePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <input
                          type="checkbox"
                          checked={permission.can_edit_vehicles}
                          onChange={(e) => {
                            const updated = [...garagePermissions];
                            updated[index].can_edit_vehicles = e.target.checked;
                            setGaragePermissions(updated);
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleUpdateGaragePermission(permission)}
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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Additional system settings will be available here.
          </p>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                  className="w-full h-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Required Role ID (Optional)
                </label>
                <input
                  type="text"
                  value={newCategory.required_role_id}
                  onChange={(e) => setNewCategory({...newCategory, required_role_id: e.target.value})}
                  placeholder="Discord Role ID"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newCategory.is_restricted}
                    onChange={(e) => setNewCategory({...newCategory, is_restricted: e.target.checked})}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Restricted Category
                  </span>
                </label>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowCategoryModal(false);
                    setEditingCategory(null);
                    setNewCategory({
                      name: '',
                      description: '',
                      color: '#5865F2',
                      required_role_id: '',
                      is_restricted: false
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  disabled={saving || !newCategory.name}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {saving ? <LoadingSpinner /> : (editingCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingRole ? 'Edit Role' : 'Add Self-Assignable Role'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord Role ID
                </label>
                <input
                  type="text"
                  value={newRole.role_id}
                  onChange={(e) => setNewRole({...newRole, role_id: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Emoji (Optional)
                </label>
                <input
                  type="text"
                  value={newRole.emoji}
                  onChange={(e) => setNewRole({...newRole, emoji: e.target.value})}
                  placeholder="🎯"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRole.can_add}
                    onChange={(e) => setNewRole({...newRole, can_add: e.target.checked})}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Users can add this role
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRole.can_remove}
                    onChange={(e) => setNewRole({...newRole, can_remove: e.target.checked})}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Users can remove this role
                  </span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newRole.is_active}
                    onChange={(e) => setNewRole({...newRole, is_active: e.target.checked})}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Role is active
                  </span>
                </label>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setEditingRole(null);
                    setNewRole({
                      role_id: '',
                      name: '',
                      description: '',
                      icon_url: '',
                      emoji: '',
                      can_add: true,
                      can_remove: true,
                      is_active: true,
                      display_order: 0
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={saving || !newRole.role_id || !newRole.name}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {saving ? <LoadingSpinner /> : (editingRole ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};