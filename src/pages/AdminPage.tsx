import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Shield, 
  Users,
  Settings,
  Tag,
  Upload,
  X,
  Image as ImageIcon,
  Lock,
  Crown,
  Star,
  Save,
  ToggleLeft,
  ToggleRight,
  Building,
  Building2
} from 'lucide-react';
import { categoriesAPI, dashboardAPI, rolesAPI, departmentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getFeatureFlags } from '../services/features';

interface Category {
  id: number;
  name: string;
  description: string;
  required_role_id: string | null;
  color: string;
  is_restricted: boolean;
  created_by_name: string;
  created_at: string;
}

interface BrandingSettings {
  custom_logo_url: string | null;
  community_name: string;
}

interface AdminStats {
  users?: number;
  total?: number;
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
  created_by_name: string;
  created_at: string;
}

interface Department {
  id: number;
  name: string;
  db_name: string;
  callsign_prefix: string;
  roster_view_id: string;
  classification: string;
  roster_count: number;
  created_by_name: string;
  created_at: string;
}

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'categories' | 'branding' | 'roles' | 'departments'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<SelfAssignableRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<AdminStats>({});
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingRole, setEditingRole] = useState<SelfAssignableRole | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    required_role_id: '',
    color: '#5865F2',
    is_restricted: false
  });
  const [roleFormData, setRoleFormData] = useState({
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
  const [departmentFormData, setDepartmentFormData] = useState({
    name: '',
    db_name: '',
    callsign_prefix: '',
    roster_view_id: '',
    classification: 'department'
  });
  
  // Branding state
  const [brandingSettings, setBrandingSettings] = useState<BrandingSettings>({
    custom_logo_url: null,
    community_name: ''
  });
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [communityName, setCommunityName] = useState('');

  const [features, setFeatures] = useState({
    enableDepartments: true,
    enableOrganizations: true,
    enablePlayerRecord: true,
    enableTimeclock: true
  });

  useEffect(() => {
    if (!user?.is_admin) {
      return;
    }
    
    fetchCategories();
    fetchBrandingSettings();
    fetchAdminStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'roles' && user?.is_admin) {
      fetchSelfAssignableRoles();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'departments' && user?.is_admin) {
      fetchDepartments();
    }
  }, [activeTab, user]);

  useEffect(() => {
    const loadFeatures = async () => {
      const flags = await getFeatureFlags();
      setFeatures(flags);
    };
    loadFeatures();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoriesAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSelfAssignableRoles = async () => {
    setRolesLoading(true);
    try {
      const data = await rolesAPI.getAdminSelfAssignable();
      setSelfAssignableRoles(data);
    } catch (error) {
      console.error('Failed to fetch self-assignable roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchDepartments = async () => {
    setDepartmentsLoading(true);
    try {
      const data = await departmentsAPI.getAllAdmin();
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const statsData = await dashboardAPI.getStats();
      setStats({
        users: statsData.users || 0,
        total: statsData.total || 0
      });
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    }
  };

  const fetchBrandingSettings = async () => {
    try {
      const response = await fetch('/api/settings/branding', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setBrandingSettings(data);
        setLogoUrl(data.custom_logo_url || '');
        setCommunityName(data.community_name);
      }
    } catch (error) {
      console.error('Failed to fetch branding settings:', error);
    }
  };

  const updateBrandingSettings = async () => {
    setBrandingLoading(true);
    try {
      const response = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          custom_logo_url: logoUrl.trim() || null,
          community_name: communityName.trim()
        })
      });

      if (response.ok) {
        setBrandingSettings({ 
          custom_logo_url: logoUrl.trim() || null,
          community_name: communityName.trim()
        });
        // Refresh the page to update the sidebar
        window.location.reload();
      } else {
        console.error('Failed to update branding settings');
      }
    } catch (error) {
      console.error('Failed to update branding settings:', error);
    } finally {
      setBrandingLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required role ID
    if (!formData.required_role_id.trim()) {
      alert('Required role ID must be specified for all categories');
      return;
    }
    
    try {
      if (editingCategory) {
        await categoriesAPI.update(editingCategory.id.toString(), formData);
      } else {
        await categoriesAPI.create(formData);
      }
      
      await fetchCategories();
      setShowCategoryForm(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        required_role_id: '',
        color: '#5865F2',
        is_restricted: false
      });
    } catch (error) {
      console.error('Failed to save category:', error);
      alert('Failed to save category. Please check that the required role ID is provided.');
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roleFormData.role_id.trim() || !roleFormData.name.trim()) {
      alert('Role ID and name are required');
      return;
    }
    
    try {
      if (editingRole) {
        await rolesAPI.updateSelfAssignable(editingRole.id.toString(), roleFormData);
      } else {
        await rolesAPI.createSelfAssignable(roleFormData);
      }
      
      await fetchSelfAssignableRoles();
      setShowRoleForm(false);
      setEditingRole(null);
      setRoleFormData({
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
      alert('Failed to save role. Please check that the role ID is unique.');
    }
  };

  const handleDepartmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!departmentFormData.name.trim() || !departmentFormData.db_name.trim() || !departmentFormData.callsign_prefix.trim() || !departmentFormData.roster_view_id.trim()) {
      alert('All fields are required');
      return;
    }
    
    try {
      if (editingDepartment) {
        await departmentsAPI.update(editingDepartment.id.toString(), departmentFormData);
      } else {
        await departmentsAPI.create(departmentFormData);
      }
      
      await fetchDepartments();
      setShowDepartmentForm(false);
      setEditingDepartment(null);
      setDepartmentFormData({
        name: '',
        db_name: '',
        callsign_prefix: '',
        roster_view_id: '',
        classification: 'department'
      });
    } catch (error: any) {
      console.error('Failed to save department:', error);
      alert(error.response?.data?.error || 'Failed to save department.');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      required_role_id: category.required_role_id || '',
      color: category.color,
      is_restricted: category.is_restricted || false
    });
    setShowCategoryForm(true);
  };

  const handleEditRole = (role: SelfAssignableRole) => {
    setEditingRole(role);
    setRoleFormData({
      role_id: role.role_id,
      name: role.name,
      description: role.description || '',
      icon_url: role.icon_url || '',
      emoji: role.emoji || '',
      can_add: role.can_add,
      can_remove: role.can_remove,
      is_active: role.is_active,
      display_order: role.display_order
    });
    setShowRoleForm(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentFormData({
      name: department.name,
      db_name: department.db_name,
      callsign_prefix: department.callsign_prefix,
      roster_view_id: department.roster_view_id,
      classification: department.classification
    });
    setShowDepartmentForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await categoriesAPI.delete(id.toString());
      await fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category. It may have existing tickets.');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }

    try {
      await rolesAPI.deleteSelfAssignable(id.toString());
      await fetchSelfAssignableRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      alert('Failed to delete role.');
    }
  };

  const handleDeleteDepartment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department? This will also remove all roster members.')) {
      return;
    }

    try {
      await departmentsAPI.delete(id.toString());
      await fetchDepartments();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      alert(error.response?.data?.error || 'Failed to delete department.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleRoleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setRoleFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDepartmentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!user?.is_admin) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          You need administrator privileges to access this page.
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage categories, branding, roles, departments, and system settings
          </p>
        </div>
        
        {activeTab === 'categories' && (
          <button
            onClick={() => {
              setShowCategoryForm(true);
              setEditingCategory(null);
              setFormData({
                name: '',
                description: '',
                required_role_id: '',
                color: '#5865F2',
                is_restricted: false
              });
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Category
          </button>
        )}

        {activeTab === 'roles' && (
          <button
            onClick={() => {
              setShowRoleForm(true);
              setEditingRole(null);
              setRoleFormData({
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
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Role
          </button>
        )}

        {activeTab === 'departments' && (
          <button
            onClick={() => {
              setShowDepartmentForm(true);
              setEditingDepartment(null);
              setDepartmentFormData({
                name: '',
                db_name: '',
                callsign_prefix: '',
                roster_view_id: '',
                classification: 'department'
              });
            }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Department
          </button>
        )}
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Tag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Categories
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {categories.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Users
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.users || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Building className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Departments
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {departments.filter(d => d.classification === 'department').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Settings className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                System Status
              </p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                Operational
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'categories'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'branding'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Branding
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'roles'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Self-Assignable Roles
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Departments
          </button>
        </nav>
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <>
          {/* Category Form Modal */}
          {showCategoryForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingCategory ? 'Edit Category' : 'Create Category'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        id="color"
                        name="color"
                        value={formData.color}
                        onChange={handleChange}
                        className="w-12 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={handleChange}
                        name="color"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Required Role ID - ALWAYS REQUIRED */}
                  <div>
                    <label htmlFor="required_role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Required Role ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="required_role_id"
                      name="required_role_id"
                      value={formData.required_role_id}
                      onChange={handleChange}
                      required
                      placeholder="Discord role ID (required for all categories)"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      All categories must have a required role ID for support access
                    </p>
                  </div>

                  {/* Restriction Settings */}
                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="is_restricted"
                        name="is_restricted"
                        checked={formData.is_restricted}
                        onChange={handleChange}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label htmlFor="is_restricted" className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                        <Lock className="h-4 w-4 mr-2" />
                        Restricted for Ticket Creation
                      </label>
                    </div>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      When enabled, only users with the required role can <strong>create tickets</strong> in this category. 
                      When disabled, anyone can create tickets here. The required role is always needed for support access.
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCategoryForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Ticket Categories
              </h2>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <div key={category.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {category.name}
                          </h3>
                          {category.is_restricted && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                              <Lock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                                Restricted Creation
                              </span>
                            </div>
                          )}
                        </div>
                        {category.description && (
                          <p className="text-gray-600 dark:text-gray-400 mt-1">
                            {category.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                          <span>Created by {category.created_by_name}</span>
                          <span> </span>
                          <span>{new Date(category.created_at).toLocaleDateString()}</span>
                          {category.required_role_id && (
                            <>
                              <span> </span>
                              <div className="flex items-center space-x-1">
                                <Shield className="h-4 w-4" />
                                <span>Role: {category.required_role_id}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <ImageIcon className="h-6 w-6 mr-2" />
              Branding Settings
            </h2>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="communityName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Community Name
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    id="communityName"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    placeholder="Enter community name"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  The name that appears in the sidebar and browser title.
                </p>
              </div>

              <div>
                <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Logo URL
                </label>
                <div className="flex space-x-3">
                  <input
                    type="url"
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Enter a URL to an image that will replace the default logo. Leave empty to use default branding.
                </p>
                
                {/* Logo Preview */}
                {logoUrl && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                    <div className="flex items-center space-x-2">
                      <img 
                        src={logoUrl} 
                        alt="Logo Preview" 
                        className="h-8 w-8 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        This will appear in the sidebar
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Current Setting */}
                {brandingSettings.custom_logo_url && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <img 
                          src={brandingSettings.custom_logo_url} 
                          alt="Current Logo" 
                          className="h-6 w-6 object-contain"
                        />
                        <span className="text-sm text-green-800 dark:text-green-200">
                          Custom logo is currently active
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setLogoUrl('');
                          updateBrandingSettings();
                        }}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={updateBrandingSettings}
                  disabled={brandingLoading}
                  className="inline-flex items-center px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {brandingLoading ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Self-Assignable Roles Tab */}
      {activeTab === 'roles' && (
        <>
          {/* Role Form Modal */}
          {showRoleForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingRole ? 'Edit Self-Assignable Role' : 'Create Self-Assignable Role'}
                </h2>
                
                <form onSubmit={handleRoleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Discord Role ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="role_id"
                        name="role_id"
                        value={roleFormData.role_id}
                        onChange={handleRoleChange}
                        required
                        placeholder="123456789012345678"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Role Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={roleFormData.name}
                        onChange={handleRoleChange}
                        required
                        placeholder="VIP Member"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={roleFormData.description}
                      onChange={handleRoleChange}
                      rows={3}
                      placeholder="Optional description of what this role provides"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="icon_url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Icon URL
                      </label>
                      <input
                        type="url"
                        id="icon_url"
                        name="icon_url"
                        value={roleFormData.icon_url}
                        onChange={handleRoleChange}
                        placeholder="https://example.com/icon.png"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="emoji" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Emoji
                      </label>
                      <input
                        type="text"
                        id="emoji"
                        name="emoji"
                        value={roleFormData.emoji}
                        onChange={handleRoleChange}
                        placeholder="?"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="display_order" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Display Order
                    </label>
                    <input
                      type="number"
                      id="display_order"
                      name="display_order"
                      value={roleFormData.display_order}
                      onChange={handleRoleChange}
                      min="0"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Lower numbers appear first. Use 0 for default ordering.
                    </p>
                  </div>

                  <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="can_add"
                          name="can_add"
                          checked={roleFormData.can_add}
                          onChange={handleRoleChange}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="can_add" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Can Add
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="can_remove"
                          name="can_remove"
                          checked={roleFormData.can_remove}
                          onChange={handleRoleChange}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="can_remove" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Can Remove
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id="is_active"
                          name="is_active"
                          checked={roleFormData.is_active}
                          onChange={handleRoleChange}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Active
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowRoleForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      {editingRole ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Roles List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Self-Assignable Roles
              </h2>
            </div>
            
            {rolesLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {selfAssignableRoles.length > 0 ? (
                  selfAssignableRoles.map((role) => (
                    <div key={role.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {role.emoji ? (
                              <span className="text-2xl">{role.emoji}</span>
                            ) : role.icon_url ? (
                              <img src={role.icon_url} alt={role.name} className="w-8 h-8 object-contain" />
                            ) : (
                              <Crown className="h-8 w-8 text-indigo-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {role.name}
                              </h3>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                ({role.role_id})
                              </span>
                              {!role.is_active && (
                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 text-xs font-medium rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {role.description && (
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {role.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>Created by {role.created_by_name}</span>
                              <span> </span>
                              <span>{new Date(role.created_at).toLocaleDateString()}</span>
                              <span> </span>
                              <span>Order: {role.display_order}</span>
                              <span> </span>
                              <div className="flex items-center space-x-2">
                                <span className={role.can_add ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {role.can_add ? '?' : '?'} Add
                                </span>
                                <span className={role.can_remove ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {role.can_remove ? '?' : '?'} Remove
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      No self-assignable roles
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Create your first self-assignable role to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Departments Tab */}
      {activeTab === 'departments' && (
        <>
          {/* Department Form Modal */}
          {showDepartmentForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  {editingDepartment ? 'Edit Department/Organization' : 'Create Department/Organization'}
                </h2>
                
                <form onSubmit={handleDepartmentSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="dept_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Department Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="dept_name"
                        name="name"
                        value={departmentFormData.name}
                        onChange={handleDepartmentChange}
                        required
                        placeholder="Los Santos Police Department"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="classification" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Classification <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="classification"
                        name="classification"
                        value={departmentFormData.classification}
                        onChange={handleDepartmentChange}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="department">Department</option>
                        <option value="organization">Organization</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="db_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Database Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="db_name"
                        name="db_name"
                        value={departmentFormData.db_name}
                        onChange={handleDepartmentChange}
                        required
                        placeholder="lspd"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Used to access timeclock_i table data
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="callsign_prefix" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Callsign Prefix <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="callsign_prefix"
                        name="callsign_prefix"
                        value={departmentFormData.callsign_prefix}
                        onChange={handleDepartmentChange}
                        required
                        placeholder="S-"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Example: S-01, P-15, etc.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="roster_view_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Roster View Role ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="roster_view_id"
                      name="roster_view_id"
                      value={departmentFormData.roster_view_id}
                      onChange={handleDepartmentChange}
                      required
                      placeholder="Discord Role ID (123456789012345678)"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Discord Role ID - users with this role can manage and view this roster
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowDepartmentForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    >
                      {editingDepartment ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Departments List */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Departments & Organizations
              </h2>
            </div>
            
            {departmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {departments.length > 0 ? (
                  departments.map((department) => (
                    <div
                      key={department.id}
                      className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                    >
                      {/* Only show if the respective feature is enabled */}
                      {((department.classification === 'department' && features.enableDepartments) ||
                        (department.classification === 'organization' && features.enableOrganizations)) && (
                        <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {department.classification === 'organization' ? (
                              <Building2 className="h-8 w-8 text-purple-500" />
                            ) : (
                              <Building className="h-8 w-8 text-blue-500" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {department.name}
                              </h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                department.classification === 'organization'
                                  ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
                                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                              }`}>
                                {department.classification}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                              <span>DB: {department.db_name}</span>
                                  <span></span>
                              <span>Prefix: {department.callsign_prefix}</span>
                                  <span></span>
                              <span>{department.roster_count || 0} members</span>
                                  <span></span>
                              <span>Created by {department.created_by_name}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Roster Role ID: {department.roster_view_id}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditDepartment(department)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDepartment(department.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                        </>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      No departments or organizations
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Create your first department or organization to get started
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};