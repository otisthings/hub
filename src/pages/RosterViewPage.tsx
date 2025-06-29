import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Clock, 
  User,
  Save,
  X,
  Building,
  Building2
} from 'lucide-react';
import { departmentsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface RosterMember {
  id: number;
  discord_id: string;
  callsign_number: string;
  full_callsign: string;
  username: string;
  avatar: string;
  discriminator: string;
  added_by_name: string;
  added_at: string;
  weekly_timeclock_minutes: number;
  weekly_timeclock_formatted: string;
}

interface Department {
  id: number;
  name: string;
  db_name: string;
  callsign_prefix: string;
  roster_view_id: string[];
  classification: string;
  disable_callsigns: boolean;
}

export const RosterViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [department, setDepartment] = useState<Department | null>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    discord_id: '',
    callsign_number: ''
  });

  useEffect(() => {
    const fetchRoster = async () => {
      if (!id) return;
      
      try {
        const data = await departmentsAPI.getRoster(id);
        setDepartment(data.department);
        setRoster(data.roster);
      } catch (error) {
        console.error('Failed to fetch roster:', error);
        navigate('/departments');
      } finally {
        setLoading(false);
      }
    };

    fetchRoster();
  }, [id, navigate]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.discord_id.trim()) return;

    // Check if callsign is required
    if (!department?.disable_callsigns && !formData.callsign_number.trim()) {
      alert('Callsign number is required for this department');
      return;
    }

    setSubmitting(true);
    try {
      await departmentsAPI.addToRoster(
        id, 
        formData.discord_id.trim(), 
        department?.disable_callsigns ? '' : formData.callsign_number.trim()
      );
      
      // Refresh roster
      const data = await departmentsAPI.getRoster(id);
      setRoster(data.roster);
      
      setShowAddModal(false);
      setFormData({ discord_id: '', callsign_number: '' });
    } catch (error: any) {
      console.error('Failed to add user:', error);
      alert(error.response?.data?.error || 'Failed to add user to roster');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingMember || !formData.callsign_number.trim()) return;

    setSubmitting(true);
    try {
      await departmentsAPI.updateRosterMember(id, editingMember.id.toString(), formData.callsign_number.trim());
      
      // Refresh roster
      const data = await departmentsAPI.getRoster(id);
      setRoster(data.roster);
      
      setShowEditModal(false);
      setEditingMember(null);
      setFormData({ discord_id: '', callsign_number: '' });
    } catch (error: any) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Failed to update roster member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveUser = async (memberId: number) => {
    if (!id || !confirm('Are you sure you want to remove this member from the roster?')) return;

    try {
      await departmentsAPI.removeFromRoster(id, memberId.toString());
      
      // Refresh roster
      const data = await departmentsAPI.getRoster(id);
      setRoster(data.roster);
    } catch (error: any) {
      console.error('Failed to remove user:', error);
      alert(error.response?.data?.error || 'Failed to remove user from roster');
    }
  };

  const openEditModal = (member: RosterMember) => {
    setEditingMember(member);
    setFormData({
      discord_id: member.discord_id,
      callsign_number: member.callsign_number || ''
    });
    setShowEditModal(true);
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Department not found</h2>
        <button
          onClick={() => navigate('/departments')}
          className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Return to departments
        </button>
      </div>
    );
  }

  const DepartmentIcon = department.classification === 'organization' ? Building2 : Building;
  const backPath = department.classification === 'organization' ? '/organizations' : '/departments';

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(backPath)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <DepartmentIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {department.name}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Roster management and weekly timeclock overview
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Member
        </button>
      </div>

      {/* Department Info */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {!department.disable_callsigns && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Callsign Prefix</h3>
              <p className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                {department.callsign_prefix}
              </p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Members</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {roster.length}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Classification</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {department.classification}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Callsigns</h3>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {department.disable_callsigns ? 'Disabled' : 'Enabled'}
            </p>
          </div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Roster ({roster.length} members)
          </h2>
        </div>
        
        {roster.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Member
                  </th>
                  {!department.disable_callsigns && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Callsign
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Discord ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Weekly Timeclock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Added
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {roster.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img
                          src={getAvatarUrl(member.avatar, member.discord_id)}
                          alt={member.username}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {member.username}#{member.discriminator}
                          </div>
                        </div>
                      </div>
                    </td>
                    {!department.disable_callsigns && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {member.full_callsign ? (
                          <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-400 text-sm font-medium rounded-full font-mono">
                            {member.full_callsign}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No callsign</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-mono">
                      {member.discord_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.weekly_timeclock_formatted}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>
                        <div>{formatDate(member.added_at)}</div>
                        <div className="text-xs">by {member.added_by_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        {!department.disable_callsigns && (
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-lg transition-colors duration-200"
                            title="Edit callsign"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveUser(member.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors duration-200"
                          title="Remove from roster"
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
        ) : (
          <div className="p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No roster members
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Add your first member to get started
            </p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Member to {department.name}
              </h2>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord ID
                </label>
                <input
                  type="text"
                  value={formData.discord_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, discord_id: e.target.value }))}
                  placeholder="123456789012345678"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              {!department.disable_callsigns && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Callsign Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="px-3 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono">
                      {department.callsign_prefix}
                    </span>
                    <input
                      type="text"
                      value={formData.callsign_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, callsign_number: e.target.value }))}
                      placeholder="01"
                      required={!department.disable_callsigns}
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Full callsign will be: {department.callsign_prefix}{formData.callsign_number}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ discord_id: '', callsign_number: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.discord_id.trim() || (!department.disable_callsigns && !formData.callsign_number.trim())}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Add Member
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal - Only show if callsigns are enabled */}
      {showEditModal && editingMember && !department.disable_callsigns && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Member Callsign
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {editingMember.username}#{editingMember.discriminator}
              </p>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Callsign Number
                </label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-3 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono">
                    {department.callsign_prefix}
                  </span>
                  <input
                    type="text"
                    value={formData.callsign_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, callsign_number: e.target.value }))}
                    placeholder="01"
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Full callsign will be: {department.callsign_prefix}{formData.callsign_number}
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    setFormData({ discord_id: '', callsign_number: '' });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !formData.callsign_number.trim()}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {submitting ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Callsign
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};