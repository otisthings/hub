import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Plus, 
  Users, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  Settings,
  Shield,
  Heart,
  Users2,
  Lock
} from 'lucide-react';
import { applicationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Application {
  id: number;
  name: string;
  description: string;
  questions: any[];
  admin_role_id: string;
  moderator_role_id: string;
  accepted_roles: string[];
  is_active: boolean;
  created_at: string;
  created_by_name: string;
  category: string;
}

interface PublicApplication {
  id: number;
  name: string;
  description: string;
  questions: any[];
  category: string;
  is_active: boolean;
}

const categoryIcons = {
  'Emergency Services': Shield,
  'Civilian Services': Heart,
  'Teams': Users2,
  'General': FileText
};

const categoryColors = {
  'Emergency Services': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  'Civilian Services': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  'Teams': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  'General': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
};

export const ApplicationsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [publicApplications, setPublicApplications] = useState<PublicApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'public' | 'manage'>('public');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [publicData, manageData] = await Promise.all([
          applicationsAPI.getPublic(),
          applicationsAPI.getAll().catch(() => []) // Catch errors for non-admin users
        ]);
        
        setPublicApplications(publicData);
        setApplications(manageData);
        
        // FIXED: Always show public tab by default, regardless of management access
        setActiveTab('public');
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleEyeClick = (appId: number) => {
    // Check if user has management access to this application
    const app = applications.find(a => a.id === appId);
    if (!app) {
      // No management access, redirect to apply view
      navigate(`/applications/${appId}`);
      return;
    }

    // Check user permissions for this specific application
    const userRoles = user?.roles || [];
    const userRoleIds = userRoles.map(role => role.id);
    const hasManagementAccess = user?.is_admin || 
      (app.admin_role_id && userRoleIds.includes(app.admin_role_id)) || 
      (app.moderator_role_id && userRoleIds.includes(app.moderator_role_id));
    
    if (hasManagementAccess) {
      // Redirect to management view
      navigate(`/applications/${appId}?mode=manage`);
    } else {
      // Redirect to apply view
      navigate(`/applications/${appId}`);
    }
  };

  const handleSettingsClick = (appId: number) => {
    // Check if user can edit this application
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    
    // Check user permissions for editing this specific application
    const userRoles = user?.roles || [];
    const userRoleIds = userRoles.map(role => role.id);
    const canEdit = user?.is_admin || (app.admin_role_id && userRoleIds.includes(app.admin_role_id));
    
    if (canEdit) {
      navigate(`/applications/${appId}?mode=edit`);
    }
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || FileText;
    return IconComponent;
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category as keyof typeof categoryColors] || categoryColors['General'];
  };

  // FIXED: Safe questions array normalization function
  const normalizeQuestions = (questions: any): any[] => {
    if (Array.isArray(questions)) {
      return questions;
    }
    if (typeof questions === 'string') {
      try {
        const parsed = JSON.parse(questions);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Group applications by category
  const groupedPublicApplications = publicApplications.reduce((groups, app) => {
    const category = app.category || 'General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(app);
    return groups;
  }, {} as Record<string, PublicApplication[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const hasManagementAccess = applications.length > 0;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            Applications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
            Apply for roles and manage application forms
          </p>
        </div>
        
        {user?.is_admin && (
          <Link
            to="/applications/new"
            className="inline-flex items-center px-3 lg:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm lg:text-base"
          >
            <Plus className="h-4 lg:h-5 w-4 lg:w-5 mr-2" />
            Create Application
          </Link>
        )}
      </div>

      {/* Tabs - Only show if user has management access */}
      {hasManagementAccess && (
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-4 lg:space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('public')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'public'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Available Applications
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'manage'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Manage Applications
            </button>
          </nav>
        </div>
      )}

      {/* Public Applications Tab */}
      {activeTab === 'public' && (
        <div className="space-y-6 lg:space-y-8">
          {Object.keys(groupedPublicApplications).length > 0 ? (
            Object.entries(groupedPublicApplications).map(([category, apps]) => {
              const IconComponent = getCategoryIcon(category);
              return (
                <div key={category} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex-shrink-0">
                      <IconComponent className="h-5 lg:h-6 w-5 lg:w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                        {category}
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {apps.length} application{apps.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>

                  {/* Applications Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
                    {apps.map((app) => {
                      // FIXED: Safely normalize questions to ensure it's always an array
                      const questions = normalizeQuestions(app.questions);
                      
                      const isInactive = !app.is_active;
                      
                      return (
                        <div
                          key={app.id}
                          className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200 overflow-hidden ${
                            isInactive ? 'opacity-60' : ''
                          }`}
                        >
                          <div className="p-4 lg:p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className={`p-2 lg:p-3 rounded-lg flex-shrink-0 ${
                                isInactive 
                                  ? 'bg-gray-100 dark:bg-gray-700' 
                                  : 'bg-indigo-100 dark:bg-indigo-900/20'
                              }`}>
                                {isInactive ? (
                                  <Lock className="h-5 lg:h-6 w-5 lg:w-6 text-gray-400" />
                                ) : (
                                  <FileText className="h-5 lg:h-6 w-5 lg:w-6 text-indigo-600 dark:text-indigo-400" />
                                )}
                              </div>
                              <div className="flex flex-col items-end space-y-2 ml-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                                  {category}
                                </span>
                                {isInactive && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    Closed
                                  </span>
                                )}
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {questions.length} questions
                                </span>
                              </div>
                            </div>
                            
                            <h3 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                              {app.name}
                            </h3>
                            
                            {app.description && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                                {app.description}
                              </p>
                            )}
                            
                            {isInactive ? (
                              <div className="inline-flex items-center w-full justify-center px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed text-sm lg:text-base">
                                <Lock className="h-4 w-4 mr-2" />
                                Application Closed
                              </div>
                            ) : (
                              <Link
                                to={`/applications/${app.id}`}
                                className="inline-flex items-center w-full justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm lg:text-base"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Apply Now
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No applications available
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Check back later for new application opportunities
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manage Applications Tab */}
      {activeTab === 'manage' && hasManagementAccess && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {applications.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {applications.map((app) => {
                // FIXED: Safely normalize questions to ensure it's always an array
                const questions = normalizeQuestions(app.questions);
                
                // Check user permissions for this app with proper role comparison
                const userRoles = user?.roles || [];
                const userRoleIds = userRoles.map(role => role.id);
                const canEdit = user?.is_admin || (app.admin_role_id && userRoleIds.includes(app.admin_role_id));
                const canManage = user?.is_admin || 
                  (app.admin_role_id && userRoleIds.includes(app.admin_role_id)) || 
                  (app.moderator_role_id && userRoleIds.includes(app.moderator_role_id));
                
                return (
                  <div key={app.id} className="p-4 lg:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
                          <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                            {app.name}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(app.category || 'General')}`}>
                            {app.category || 'General'}
                          </span>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              app.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}
                          >
                            {app.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        
                        {app.description && (
                          <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm lg:text-base">
                            {app.description}
                          </p>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                          <span>{questions.length} questions</span>
                          <span>•</span>
                          <span>Created by {app.created_by_name}</span>
                          <span>•</span>
                          <span>{formatDate(app.created_at)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {canManage && (
                          <button
                            onClick={() => handleEyeClick(app.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                            title="View submissions"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleSettingsClick(app.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                            title="Edit application"
                          >
                            <Settings className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 lg:p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No applications to manage
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You don't have management access to any applications
              </p>
              {user?.is_admin && (
                <Link
                  to="/applications/new"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Application
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};