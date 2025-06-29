import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  User, 
  Shield, 
  AlertTriangle, 
  Ban, 
  Heart,
  Calendar,
  Award,
  TrendingUp,
  Search,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Server,
  MessageSquare,
  Settings,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Crown,
  Star,
  Zap
} from 'lucide-react';
import { profileAPI, applicationsAPI, rolesAPI, timeclockAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { getFeatureFlags } from '../services/features';

interface ProfileData {
  trustScore: number;
  kicks: PunitiveRecord[];
  warnings: PunitiveRecord[];
  bans: PunitiveRecord[];
  commends: PunitiveRecord[];
}

interface PunitiveRecord {
  id: number;
  stamp: string;
  reason: string;
}

interface MyApplication {
  id: number;
  form_id: number;
  status: string;
  responses: string;
  admin_notes: string;
  submitted_at: string;
  reviewed_at: string;
  app_name: string;
  app_description: string;
  reviewed_by_name: string;
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
  hasRole: boolean;
}

interface TimeclockDepartment {
  department: string;
  totalMinutes: number;
  formattedTime: string;
}

interface TimeclockData {
  departments: TimeclockDepartment[];
  totalEntries: number;
}

type RecordType = 'warnings' | 'kicks' | 'bans' | 'commends';
type MainTab = 'record' | 'applications' | 'timeclock' | 'roles';

export const MyProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [selfAssignableRoles, setSelfAssignableRoles] = useState<SelfAssignableRole[]>([]);
  const [timeclockData, setTimeclockData] = useState<TimeclockData | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [timeclockLoading, setTimeclockLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [timeclockError, setTimeclockError] = useState<string | null>(null);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);
  const [features, setFeatures] = useState({
    enableDepartments: true,
    enableOrganizations: true,
    enablePlayerRecord: true,
    enableTimeclock: true
  });
  
  // Load feature flags
  useEffect(() => {
    const loadFeatures = async () => {
      const flags = await getFeatureFlags();
      setFeatures(flags);
    };
    loadFeatures();
  }, []);
  
  // Get initial tab from URL params, respecting feature flags
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'applications') return 'applications';
    if (tabParam === 'timeclock' && features.enableTimeclock) return 'timeclock';
    if (tabParam === 'roles') return 'roles';
    if (tabParam === 'record' && features.enablePlayerRecord) return 'record';
    // Default to applications if preferred tab is disabled
    return 'applications';
  };

  const [mainTab, setMainTab] = useState<MainTab>(getInitialTab());

  // Update mainTab when features change
  useEffect(() => {
    setMainTab(getInitialTab());
  }, [features]);

  const [activeRecordTab, setActiveRecordTab] = useState<RecordType>('warnings');
  const [searchTerm, setSearchTerm] = useState('');
  const [appSearchTerm, setAppSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [timeclockSearchTerm, setTimeclockSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [appRowsPerPage, setAppRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [appCurrentPage, setAppCurrentPage] = useState(1);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.discord_id) return;
      
      try {
        const data = await profileAPI.getProfile(user.discord_id);
        setProfileData(data);
        setProfileError(null);
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
        // Set specific error for profile data only
        setProfileError('not_found');
        // Still set empty profile data structure so other parts work
        setProfileData({
          trustScore: 0,
          kicks: [],
          warnings: [],
          bans: [],
          commends: []
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  useEffect(() => {
    const fetchApplications = async () => {
      if (mainTab !== 'applications') return;
      
      setApplicationsLoading(true);
      try {
        const data = await applicationsAPI.getMyApplications();
        setApplications(data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setApplicationsLoading(false);
      }
    };

    fetchApplications();
  }, [mainTab]);

  useEffect(() => {
    const fetchTimeclockData = async () => {
      if (mainTab !== 'timeclock') return;
      
      setTimeclockLoading(true);
      setTimeclockError(null);
      try {
        const data = await timeclockAPI.getTimeclockData();
        setTimeclockData(data);
      } catch (error) {
        console.error('Failed to fetch timeclock data:', error);
        setTimeclockError('Failed to load timeclock data');
      } finally {
        setTimeclockLoading(false);
      }
    };

    fetchTimeclockData();
  }, [mainTab]);

  useEffect(() => {
    const fetchSelfAssignableRoles = async () => {
      if (mainTab !== 'roles') return;
      
      setRolesLoading(true);
      try {
        const data = await rolesAPI.getSelfAssignable();
        setSelfAssignableRoles(data);
      } catch (error) {
        console.error('Failed to fetch self-assignable roles:', error);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchSelfAssignableRoles();
  }, [mainTab]);

  // Update URL when tab changes
  const handleTabChange = (tab: MainTab) => {
    setMainTab(tab);
    if (tab === 'applications') {
      setSearchParams({ tab: 'applications' });
    } else if (tab === 'timeclock') {
      setSearchParams({ tab: 'timeclock' });
    } else if (tab === 'roles') {
      setSearchParams({ tab: 'roles' });
    } else {
      setSearchParams({});
    }
  };

  const handleRoleToggle = async (roleId: number, currentHasRole: boolean) => {
    const action = currentHasRole ? 'remove' : 'add';
    setRoleActionLoading(roleId.toString());
    
    try {
      await rolesAPI.toggleRole(roleId.toString(), action);
      
      // Update the role status locally
      setSelfAssignableRoles(prev => 
        prev.map(role => 
          role.id === roleId 
            ? { ...role, hasRole: !currentHasRole }
            : role
        )
      );
    } catch (error) {
      console.error('Failed to toggle role:', error);
      alert('Failed to update role. Please try again.');
    } finally {
      setRoleActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    if (score >= 40) return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
    return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
  };

  const getTabIcon = (type: RecordType) => {
    switch (type) {
      case 'warnings': return <Shield className="h-4 w-4" />;
      case 'kicks': return <AlertTriangle className="h-4 w-4" />;
      case 'bans': return <Ban className="h-4 w-4" />;
      case 'commends': return <Heart className="h-4 w-4" />;
    }
  };

  const getTabColor = (type: RecordType) => {
    switch (type) {
      case 'warnings': return 'text-yellow-600 dark:text-yellow-400';
      case 'kicks': return 'text-red-600 dark:text-red-400';
      case 'bans': return 'text-red-700 dark:text-red-500';
      case 'commends': return 'text-green-600 dark:text-green-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'denied': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default: return <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'denied': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
    }
  };

  const getCurrentRecords = () => {
    if (!profileData) return [];
    return profileData[activeRecordTab] || [];
  };

  const getFilteredRecords = () => {
    const records = getCurrentRecords();
    if (!searchTerm) return records;
    
    return records.filter(record => 
      record.reason.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredApplications = () => {
    if (!appSearchTerm) return applications;
    
    return applications.filter(app => 
      app.app_name.toLowerCase().includes(appSearchTerm.toLowerCase()) ||
      app.status.toLowerCase().includes(appSearchTerm.toLowerCase())
    );
  };

  const getFilteredRoles = () => {
    if (!roleSearchTerm) return selfAssignableRoles;
    
    return selfAssignableRoles.filter(role => 
      role.name.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(roleSearchTerm.toLowerCase()))
    );
  };

  const getFilteredTimeclockDepartments = () => {
    if (!timeclockData || !timeclockSearchTerm) return timeclockData?.departments || [];
    
    return timeclockData.departments.filter(dept => 
      dept.department.toLowerCase().includes(timeclockSearchTerm.toLowerCase())
    );
  };

  const getPaginatedRecords = () => {
    const filtered = getFilteredRecords();
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getPaginatedApplications = () => {
    const filtered = getFilteredApplications();
    const startIndex = (appCurrentPage - 1) * appRowsPerPage;
    const endIndex = startIndex + appRowsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    const filtered = getFilteredRecords();
    return Math.ceil(filtered.length / rowsPerPage);
  };

  const getAppTotalPages = () => {
    const filtered = getFilteredApplications();
    return Math.ceil(filtered.length / appRowsPerPage);
  };

  const getRecordCount = (type: RecordType) => {
    if (!profileData) return 0;
    return profileData[type]?.length || 0;
  };

  const getRoleIcon = (role: SelfAssignableRole) => {
    if (role.emoji) {
      return <span className="text-lg">{role.emoji}</span>;
    }
    if (role.icon_url) {
      return <img src={role.icon_url} alt={role.name} className="w-5 h-5 object-contain" />;
    }
    return <Crown className="h-5 w-5 text-indigo-500" />;
  };

  // Reset pagination when changing tabs or search
  useEffect(() => {
    setCurrentPage(1);
  }, [activeRecordTab, searchTerm, rowsPerPage]);

  useEffect(() => {
    setAppCurrentPage(1);
  }, [appSearchTerm, appRowsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const filteredRecords = getFilteredRecords();
  const paginatedRecords = getPaginatedRecords();
  const totalPages = getTotalPages();

  const filteredApplications = getFilteredApplications();
  const paginatedApplications = getPaginatedApplications();
  const appTotalPages = getAppTotalPages();

  const filteredRoles = getFilteredRoles();
  const filteredTimeclockDepartments = getFilteredTimeclockDepartments();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Your staff record, application history, timeclock data, and role management
          </p>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <img
              src={getAvatarUrl(user?.avatar || '', user?.discord_id || '')}
              alt={user?.username}
              className="h-20 w-20 rounded-full ring-4 ring-indigo-500/20"
            />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.username}#{user?.discriminator}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Discord ID: {user?.discord_id}
            </p>
          </div>
          
          {/* Trust Score - Only show if profile data exists and no error */}
          {profileData && !profileError && (
            <div className={`px-6 py-4 rounded-xl ${getTrustScoreColor(profileData.trustScore)}`}>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 mr-2" />
                  <span className="text-sm font-medium">Trust Score</span>
                </div>
                <span className="text-3xl font-bold">
                  {profileData.trustScore}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {features.enablePlayerRecord && (
            <button
              onClick={() => handleTabChange('record')}
              className={`${
                mainTab === 'record'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              🧾 Player Record
            </button>
          )}

          <button
            onClick={() => handleTabChange('applications')}
            className={`${
              mainTab === 'applications'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            📋 Application Submissions
          </button>

          <button
            onClick={() => handleTabChange('roles')}
            className={`${
              mainTab === 'roles'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
          >
            👑 Roles
          </button>

          {features.enableTimeclock && (
            <button
              onClick={() => handleTabChange('timeclock')}
              className={`${
                mainTab === 'timeclock'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
            >
              ⏰ Timeclock
            </button>
          )}
        </nav>
      </div>

      {/* Player Records Tab */}
      {mainTab === 'record' && features.enablePlayerRecord && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Browse Player Record
              </h2>
              
              {/* Record Tabs - Only show if no profile error */}
              {!profileError && (
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {(['warnings', 'kicks', 'bans', 'commends'] as RecordType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setActiveRecordTab(type)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        activeRecordTab === type
                          ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span className={activeRecordTab === type ? getTabColor(type) : ''}>
                        {getTabIcon(type)}
                      </span>
                      <span className="capitalize">{type}</span>
                      <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                        {getRecordCount(type)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Profile Error State - Show friendly message for missing profile data */}
          {profileError === 'not_found' ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                  <Server className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No profile data available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    It looks like you haven't joined the server yet. Your player record will appear here once you join and interact with the server.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search and Controls */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reasons..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-64"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                      <select
                        value={rowsPerPage}
                        onChange={(e) => setRowsPerPage(Number(e.target.value))}
                        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                      <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Records Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Occurred At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedRecords.length > 0 ? (
                      paginatedRecords.map((record, index) => (
                        <tr 
                          key={record.id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 ${
                            index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/25'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(record.stamp)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="max-w-md">
                              {record.reason}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <div className={`p-3 rounded-full bg-gray-100 dark:bg-gray-700 ${getTabColor(activeRecordTab)}`}>
                              {getTabIcon(activeRecordTab)}
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                No {activeRecordTab} found
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {searchTerm ? 'Try adjusting your search terms' : `No ${activeRecordTab} on record`}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Records Footer */}
              {paginatedRecords.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} results
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  currentPage === pageNum
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Application Submissions Tab */}
      {mainTab === 'applications' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Application Submissions
              </h2>
            </div>
          </div>

          {/* Search and Controls */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={appSearchTerm}
                  onChange={(e) => setAppSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-64"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                  <select
                    value={appRowsPerPage}
                    onChange={(e) => setAppRowsPerPage(Number(e.target.value))}
                    className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                </div>
              </div>
            </div>
          </div>

          {/* Applications Table */}
          {applicationsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Application Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Submission Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedApplications.length > 0 ? (
                      paginatedApplications.map((app, index) => (
                        <tr 
                          key={app.id} 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 cursor-pointer ${
                            index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-700/25'
                          }`}
                          onClick={() => window.open(`/applications/${app.form_id}`, '_blank')}
                        >
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                                <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              </div>
                              <div>
                                <div className="font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                  {app.app_name}
                                </div>
                                {app.app_description && (
                                  <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                                    {app.app_description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{formatDate(app.submitted_at)}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="space-y-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                {getStatusIcon(app.status)}
                                <span className="ml-1">{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                              </span>
                              
                              {/* Review Notes */}
                              {app.admin_notes && (app.status === 'accepted' || app.status === 'denied') && (
                                <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <div className="flex items-center space-x-1 mb-1">
                                    <MessageSquare className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                      Review Notes:
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {app.admin_notes}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center">
                          <div className="flex flex-col items-center space-y-3">
                            <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                              <FileText className="h-8 w-8 text-gray-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                No applications found
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 mt-1">
                                {appSearchTerm ? 'Try adjusting your search terms' : 'You haven\'t submitted any applications yet'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Applications Footer */}
              {paginatedApplications.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing {((appCurrentPage - 1) * appRowsPerPage) + 1} to {Math.min(appCurrentPage * appRowsPerPage, filteredApplications.length)} of {filteredApplications.length} results
                    </div>
                    
                    {appTotalPages > 1 && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setAppCurrentPage(Math.max(1, appCurrentPage - 1))}
                          disabled={appCurrentPage === 1}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, appTotalPages) }, (_, i) => {
                            let pageNum;
                            if (appTotalPages <= 5) {
                              pageNum = i + 1;
                            } else if (appCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (appCurrentPage >= appTotalPages - 2) {
                              pageNum = appTotalPages - 4 + i;
                            } else {
                              pageNum = appCurrentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setAppCurrentPage(pageNum)}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  appCurrentPage === pageNum
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setAppCurrentPage(Math.min(appTotalPages, appCurrentPage + 1))}
                          disabled={appCurrentPage === appTotalPages}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Timeclock Tab */}
      {mainTab === 'timeclock' && features.enableTimeclock && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Department Hours
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Your accumulated time across all departments
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search departments..."
                value={timeclockSearchTerm}
                onChange={(e) => setTimeclockSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
              />
            </div>
          </div>

          {/* Timeclock Content */}
          {timeclockLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : timeclockError ? (
            <div className="p-12 text-center">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Clock className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Unable to load timeclock data
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    {timeclockError}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {filteredTimeclockDepartments.length > 0 ? (
                <div className="space-y-4">
                  {filteredTimeclockDepartments.map((dept, index) => (
                    <div
                      key={index}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                            <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {dept.department}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Total accumulated time
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {dept.formattedTime}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {dept.totalMinutes.toLocaleString()} minutes
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Summary */}
                  {timeclockData && timeclockData.departments.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Award className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Summary
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {timeclockData.departments.length} department{timeclockData.departments.length !== 1 ? 's' : ''} • {timeclockData.totalEntries} total entries
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        No timeclock data found
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {timeclockSearchTerm ? 'Try adjusting your search terms' : 'No department hours have been recorded yet'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {mainTab === 'roles' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Self-Assignable Roles
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your Discord roles directly from the hub
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search roles..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm w-full"
              />
            </div>
          </div>

          {/* Roles Content */}
          {rolesLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="p-6">
              {filteredRoles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getRoleIcon(role)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {role.name}
                            </h3>
                            {role.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                {role.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Role Status Indicator */}
                        <div className="flex-shrink-0">
                          {role.hasRole ? (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 rounded-full">
                              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                              <span className="text-xs font-medium text-green-600 dark:text-green-400">
                                Active
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                              <XCircle className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Inactive
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                          {role.can_add && (
                            <span className="flex items-center space-x-1">
                              <Plus className="h-3 w-3" />
                              <span>Add</span>
                            </span>
                          )}
                          {role.can_remove && (
                            <span className="flex items-center space-x-1">
                              <Trash2 className="h-3 w-3" />
                              <span>Remove</span>
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleRoleToggle(role.id, role.hasRole)}
                          disabled={
                            roleActionLoading === role.id.toString() ||
                            (role.hasRole && !role.can_remove) ||
                            (!role.hasRole && !role.can_add)
                          }
                          className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            role.hasRole
                              ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400'
                          } disabled:cursor-not-allowed`}
                        >
                          {roleActionLoading === role.id.toString() ? (
                            <LoadingSpinner />
                          ) : (
                            <>
                              {role.hasRole ? (
                                <>
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </>
                              )}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                      <Crown className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        No roles available
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mt-1">
                        {roleSearchTerm ? 'Try adjusting your search terms' : 'No self-assignable roles have been configured yet'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};