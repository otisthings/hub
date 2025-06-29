import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Clock, 
  CheckCircle, 
  User,
  Calendar,
  Tag,
  MessageSquare,
  MoreHorizontal,
  ArrowRight,
  UserPlus,
  UserCheck,
  UserX,
  RotateCcw,
  X
} from 'lucide-react';
import { ticketsAPI, categoriesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface TicketMessage {
  id: number;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  username: string;
  avatar: string;
  discriminator: string;
  discord_id: string;
}

interface TicketLog {
  id: number;
  action: string;
  details: string;
  created_at: string;
  username: string;
}

interface TicketParticipant {
  id: number;
  user_id: number;
  username: string;
  avatar: string;
  discriminator: string;
  discord_id: string;
  added_by_name: string;
  added_at: string;
}

interface TicketDetail {
  id: number;
  title: string;
  description: string;
  status: string;
  category_id: number;
  category_name: string;
  category_color: string;
  user_id: number;
  user_name: string;
  user_avatar: string;
  user_discriminator: string;
  user_discord_id: string;
  assigned_to?: number;
  assigned_to_name?: string;
  claimed_by?: number;
  claimed_by_name?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
  required_role_id?: string;
}

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [participants, setParticipants] = useState<TicketParticipant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [discordIdToAdd, setDiscordIdToAdd] = useState('');
  const [addingUser, setAddingUser] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      
      try {
        const [ticketData, categoriesData] = await Promise.all([
          ticketsAPI.getById(id),
          categoriesAPI.getAll()
        ]);
        
        setTicket(ticketData.ticket);
        setMessages(ticketData.messages);
        setLogs(ticketData.logs);
        setParticipants(ticketData.participants || []);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Failed to fetch ticket:', error);
        navigate('/tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;

    setSubmitting(true);
    try {
      await ticketsAPI.addMessage(id, newMessage);
      setNewMessage('');
      
      // Refresh ticket data
      const data = await ticketsAPI.getById(id);
      setMessages(data.messages);
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;

    try {
      await ticketsAPI.updateStatus(id, newStatus);
      
      // Refresh ticket data
      const data = await ticketsAPI.getById(id);
      setTicket(data.ticket);
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleClaim = async (claim: boolean) => {
    if (!id) return;

    try {
      const response = await fetch(`/api/tickets/${id}/claim`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ claim })
      });

      if (response.ok) {
        // Refresh ticket data
        const data = await ticketsAPI.getById(id);
        setTicket(data.ticket);
        setLogs(data.logs);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to claim/unclaim ticket');
      }
    } catch (error) {
      console.error('Failed to claim/unclaim ticket:', error);
    }
  };

  const handleAddUser = async () => {
    if (!id || !discordIdToAdd.trim()) return;

    setAddingUser(true);
    try {
      const response = await fetch(`/api/tickets/${id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ discord_id: discordIdToAdd.trim() })
      });

      if (response.ok) {
        setShowAddUserModal(false);
        setDiscordIdToAdd('');
        
        // Refresh ticket data
        const data = await ticketsAPI.getById(id);
        setParticipants(data.participants || []);
        setLogs(data.logs);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Failed to add user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    if (!id || !confirm('Are you sure you want to remove this participant?')) return;

    try {
      const response = await fetch(`/api/tickets/${id}/participants/${participantId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        // Refresh ticket data
        const data = await ticketsAPI.getById(id);
        setParticipants(data.participants || []);
        setLogs(data.logs);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to remove participant');
      }
    } catch (error) {
      console.error('Failed to remove participant:', error);
      alert('Failed to remove participant');
    }
  };

  const handleTransfer = async () => {
    if (!id || !selectedCategory) return;

    try {
      await ticketsAPI.transfer(id, selectedCategory);
      setShowTransferModal(false);
      
      // Refresh ticket data
      const data = await ticketsAPI.getById(id);
      setTicket(data.ticket);
      setLogs(data.logs);
    } catch (error) {
      console.error('Failed to transfer ticket:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'closed': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      default: return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  // Enhanced permission checking for support staff and participants
  const checkTicketPermissions = () => {
    if (!ticket || !user) return { 
      canManage: false, 
      canView: false, 
      canClaim: false, 
      canAddUsers: false, 
      canReopen: false,
      canRemoveParticipants: false,
      isOwner: false,
      isSupportMember: false
    };

    // Admin always has full access
    if (user.is_admin) {
      return { 
        canManage: true, 
        canView: true, 
        canClaim: true, 
        canAddUsers: true, 
        canReopen: true,
        canRemoveParticipants: true,
        isOwner: false,
        isSupportMember: true
      };
    }

    // Check if user is ticket owner
    const isOwner = ticket.user_id === user.id;

    // Check if user is a participant
    const isParticipant = participants.some(p => p.user_id === user.id);

    // Check if user has the required role for this ticket's category (support member)
    const ticketCategory = categories.find(c => c.id === ticket.category_id);
    let isSupportMember = false;
    if (ticketCategory?.required_role_id) {
      const userRoles = user.roles || [];
      const userRoleIds = userRoles.map(role => role.id);
      isSupportMember = userRoleIds.includes(ticketCategory.required_role_id);
    }

    // Check if user is assigned to or claimed this ticket
    const isAssigned = ticket.assigned_to === user.id;
    const isClaimed = ticket.claimed_by === user.id;

    // Determine permissions based on role
    if (isSupportMember || isAssigned || isClaimed) {
      return {
        canManage: true,
        canView: true,
        canClaim: true,
        canAddUsers: true,
        canReopen: true,
        canRemoveParticipants: true,
        isOwner,
        isSupportMember: true
      };
    }

    // Ticket owner and participants can view and close but not manage
    if (isOwner || isParticipant) {
      return {
        canManage: true, // Can close their own ticket
        canView: true,
        canClaim: false,
        canAddUsers: false,
        canReopen: false,
        canRemoveParticipants: false,
        isOwner,
        isSupportMember: false
      };
    }

    // No access
    return { 
      canManage: false, 
      canView: false, 
      canClaim: false, 
      canAddUsers: false, 
      canReopen: false,
      canRemoveParticipants: false,
      isOwner: false,
      isSupportMember: false
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket not found</h2>
        <button
          onClick={() => navigate('/tickets')}
          className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Return to tickets
        </button>
      </div>
    );
  }

  const permissions = checkTicketPermissions();

  // If user can't view the ticket, show access denied
  if (!permissions.canView) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          You don't have permission to view this ticket.
        </p>
        <button
          onClick={() => navigate('/tickets')}
          className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Return to tickets
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/tickets')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {ticket.title}
          </h1>
          <div className="flex items-center space-x-4 mt-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(ticket.status)}`}
            >
              {ticket.status === 'open' ? <Clock className="h-4 w-4 mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              {ticket.status.replace('_', ' ')}
            </span>
            {ticket.claimed_by_name && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                <UserCheck className="h-4 w-4 mr-1" />
                Claimed by {ticket.claimed_by_name}
              </span>
            )}
          </div>
        </div>
        
        {/* Management buttons - ONLY ONE CLOSE BUTTON */}
        <div className="flex space-x-2">
          {/* Support member actions */}
          {permissions.isSupportMember && (
            <>
              {/* Claim/Unclaim button */}
              {permissions.canClaim && (
                <button
                  onClick={() => handleClaim(!ticket.claimed_by)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl ${
                    ticket.claimed_by === user?.id
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {ticket.claimed_by === user?.id ? 'Unclaim' : 'Claim'}
                </button>
              )}
              
              {/* Add User button */}
              {permissions.canAddUsers && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="h-4 w-4 mr-2 inline" />
                  Add User
                </button>
              )}
              
              {/* Transfer button */}
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
              >
                Transfer
              </button>
              
              {/* In Progress button */}
              {ticket.status === 'open' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  Mark In Progress
                </button>
              )}
              
              {/* Reopen button - ONLY for support members */}
              {permissions.canReopen && ticket.status === 'closed' && (
                <button
                  onClick={() => handleStatusChange('open')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <RotateCcw className="h-4 w-4 mr-2 inline" />
                  Re-Open
                </button>
              )}
            </>
          )}
          
          {/* Close button - SINGLE BUTTON for all users who can manage */}
          {permissions.canManage && ticket.status !== 'closed' && (
            <button
              onClick={() => handleStatusChange('closed')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              Close Ticket
            </button>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-dark-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Add User to Ticket
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discord ID
                </label>
                <input
                  type="text"
                  value={discordIdToAdd}
                  onChange={(e) => setDiscordIdToAdd(e.target.value)}
                  placeholder="Enter Discord ID (e.g., 123456789012345678)"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  The user will gain access to this ticket and see it on their dashboard.
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setDiscordIdToAdd('');
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !discordIdToAdd.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {addingUser ? <LoadingSpinner /> : 'Add User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-dark-lg max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Transfer Ticket
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Category
                </label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.filter(c => c.id !== ticket.category_id).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransfer}
                  disabled={!selectedCategory}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Ticket */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-dark border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <img
                    src={getAvatarUrl(ticket.user_avatar, ticket.user_discord_id)}
                    alt={ticket.user_name}
                    className="h-10 w-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {ticket.user_name}#{ticket.user_discriminator}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(ticket.created_at)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-6 rounded-xl shadow-dark border transition-all duration-200 hover:shadow-dark-lg ${
                  message.is_staff_reply
                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800 ml-8'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex-shrink-0">
                    <img
                      src={getAvatarUrl(message.avatar, message.discord_id)}
                      alt={message.username}
                      className="h-8 w-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {message.username}#{message.discriminator}
                      </h4>
                      {message.is_staff_reply && (
                        <span className="px-2 py-1 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 text-indigo-800 dark:text-indigo-200 text-xs font-medium rounded-full">
                          Staff
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(message.created_at)}
                    </p>
                  </div>
                </div>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                  {message.message}
                </p>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {ticket.status !== 'closed' && (
            <form onSubmit={handleSendMessage} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-dark border border-gray-200 dark:border-gray-700">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <img
                    src={getAvatarUrl(user?.avatar || '', user?.discord_id || '')}
                    alt={user?.username}
                    className="h-10 w-10 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                  />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  />
                  <div className="flex justify-end mt-4">
                    <button
                      type="submit"
                      disabled={submitting || !newMessage.trim()}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl glow-indigo"
                    >
                      {submitting ? (
                        <LoadingSpinner />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-dark border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ticket Information
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Tag className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Category</p>
                  <div className="flex items-center space-x-2">
                    <span
                      className="inline-block w-3 h-3 rounded-full"
                      style={{ backgroundColor: ticket.category_color }}
                    ></span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {ticket.category_name}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(ticket.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(ticket.updated_at)}
                  </p>
                </div>
              </div>
              
              {ticket.assigned_to_name && (
                <div className="flex items-center space-x-3">
                  <UserCheck className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Assigned To</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.assigned_to_name}
                    </p>
                  </div>
                </div>
              )}
              
              {ticket.claimed_by_name && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Claimed By</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {ticket.claimed_by_name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          {participants.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-dark border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Additional Participants
              </h3>
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center space-x-3">
                      <img
                        src={getAvatarUrl(participant.avatar, participant.discord_id)}
                        alt={participant.username}
                        className="h-8 w-8 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {participant.username}#{participant.discriminator}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Added by {participant.added_by_name} on {formatDate(participant.added_at)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Remove participant button - ONLY for support members */}
                    {permissions.canRemoveParticipants && (
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors duration-200"
                        title="Remove participant"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-dark border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity Log
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <MessageSquare className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{log.username}</span> {log.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(log.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};