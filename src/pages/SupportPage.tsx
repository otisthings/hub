import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HeadphonesIcon, 
  Ticket, 
  Clock, 
  CheckCircle, 
  Users,
  ArrowRight,
  Filter,
  Search,
  User,
  UserCheck,
  Tag,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { categoriesAPI, ticketsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Category {
  id: number;
  name: string;
  description: string;
  color: string;
  required_role_id: string | null;
}

interface TicketData {
  id: number;
  title: string;
  status: string;
  category_name: string;
  category_color: string;
  user_name: string;
  assigned_to_name?: string;
  claimed_by_name?: string;
  created_at: string;
  updated_at: string;
}

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [supportCategories, setSupportCategories] = useState<Category[]>([]);
  const [assignedTickets, setAssignedTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesData, assignedData] = await Promise.all([
          categoriesAPI.getSupportCategories(),
          ticketsAPI.getAll({ assigned: 'true', status: 'open' })
        ]);
        
        setSupportCategories(categoriesData || []);
        setAssignedTickets(assignedData || []);
        
        // If user has no support categories and is not admin, they shouldn't see this page
        if ((categoriesData?.length === 0 || !categoriesData) && !user?.is_admin) {
          // This will be handled by the UI
        }
      } catch (error) {
        console.error('Failed to fetch support data:', error);
        // Set empty arrays on error to prevent undefined access
        setSupportCategories([]);
        setAssignedTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if ((supportCategories?.length === 0 || !supportCategories) && !user?.is_admin) {
    return (
      <div className="text-center py-12">
        <HeadphonesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">No Support Access</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          You don't have access to any support categories. Contact an administrator if you need support permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Support Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage tickets in your assigned categories
          </p>
        </div>
      </div>

      {/* Assigned/Claimed Tickets Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  My Assigned Tickets
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tickets assigned to or claimed by you
                </p>
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {assignedTickets?.length || 0}
            </div>
          </div>
        </div>

        {assignedTickets && assignedTickets.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {assignedTickets.slice(0, 10).map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {ticket.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      {ticket.claimed_by_name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Claimed
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full"
                          style={{ backgroundColor: ticket.category_color }}
                        ></span>
                        <span>{ticket.category_name}</span>
                      </div>
                      <span>�</span>
                      <span>{ticket.user_name}</span>
                      <span>�</span>
                      <span>{formatDate(ticket.created_at)}</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-400">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <UserCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              No tickets assigned to you
            </p>
          </div>
        )}
      </div>

      {/* Category Navigation - NEW: Navigate to separate pages */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Browse by Category
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {supportCategories && supportCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(`/support/category/${category.id}`)}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 text-left hover:shadow-lg group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {category.name}
                  </h3>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" />
              </div>
              
              {category.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {category.description}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Ticket className="h-4 w-4" />
                  <span>View Tickets</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};