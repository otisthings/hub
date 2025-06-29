import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Ban, 
  UserCheck, 
  Shield, 
  AlertTriangle,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface UserData {
  id: number;
  discord_id: string;
  username: string;
  discriminator: string;
  avatar: string;
  roles: string;
  is_admin: boolean;
  is_hub_banned: boolean;
  hub_ban_reason: string;
  hub_banned_at: string;
  banned_by_name: string;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const ManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if user has management access
  const hasManagementAccess = () => {
    if (!user) return false;
    if (user.is_admin) return true;
    
    const userRoles = user.roles || [];
    return userRoles.some(role => role.id === process.env.MANAGEMENT_ROLE_ID);
  };

  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await fetch(`/api/management/users?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        console.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasManagementAccess()) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
  };

  const handlePageChange = (newPage: number) => {
    fetchUsers(newPage, searchTerm);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/management/users/${selectedUser.id}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason: banReason.trim() })
      });
      
      if (response.ok) {
        setShowBanModal(false);
        setBanReason('');
        setSelectedUser(null);
        fetchUsers(pagination.page, searchTerm);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Failed to ban user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!confirm('Are you sure you want to unban this user?')) return;
    
    try {
      const response = await fetch(`/api/management/users/${userId}/unban`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchUsers(pagination.page, searchTerm);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
      alert('Failed to unban user');
    }
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!hasManagementAccess()) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          You need management privileges to access this page.
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
            Management Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage hub users and permissions
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSearch} className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by username or Discord ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Hub Users ({pagination.total})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Discord ID
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
              {users.map((userData) => (
                <tr key={userData.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <img
                        src={getAvatarUrl(userData.avatar, userData.discord_id)}
                        alt={userData.username}
                        className="h-10 w-10 rounded-full"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {userData.username}#{userData.discriminator}
                        </div>
                        {userData.is_admin && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Shield className="h-3 w-3 text-red-500" />
                            <span className="text-xs text-red-500 font-medium">Admin</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {userData.discord_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {userData.is_hub_banned ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          <Ban className="h-3 w-3 mr-1" />
                          Hub Banned
                        </span>
                        {userData.hub_ban_reason && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Reason: {userData.hub_ban_reason}
                          </div>
                        )}
                        {userData.hub_banned_at && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Banned: {formatDate(userData.hub_banned_at)}
                          </div>
                        )}
                        {userData.banned_by_name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            By: {userData.banned_by_name}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        <UserCheck className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center space-x-2">
                      {userData.is_hub_banned ? (
                        <button
                          onClick={() => handleUnbanUser(userData.id)}
                          className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-xs"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Unban
                        </button>
                      ) : (
                        !userData.is_admin && userData.id !== user?.id && (
                          <button
                            onClick={() => {
                              setSelectedUser(userData);
                              setShowBanModal(true);
                            }}
                            className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 text-xs"
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Ban
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    let pageNum;
                    if (pagination.pages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.pages - 2) {
                      pageNum = pagination.pages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          pagination.page === pageNum
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
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Ban User
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedUser.username}#{selectedUser.discriminator}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ban Reason
                </label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Enter the reason for banning this user..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowBanModal(false);
                    setBanReason('');
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  disabled={submitting || !banReason.trim()}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Ban User
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};