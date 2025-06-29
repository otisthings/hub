import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageCircle,
  FileText,
  Shield,
  Settings,
  ArrowRight,
  Clock,
  Calendar,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ticketsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface RecentTicket {
  id: number;
  title: string;
  status: string;
  category_name: string;
  category_color: string;
  created_at: string;
  user_name: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentTickets = async () => {
      try {
        const ticketsData = await ticketsAPI.getAll({ limit: 5, status: 'open' });
        setRecentTickets(ticketsData || []);
      } catch (error) {
        console.error('Failed to fetch recent tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTickets();
  }, []);

  const getTicketStatusColor = (status: string) => {
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

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Welcome */}
      <div className="text-center py-6 lg:py-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.username}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
          What would you like to do today?
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <div className="xl:col-span-2">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white mb-4 lg:mb-6">
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/tickets/new"
              className="group p-4 lg:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors flex-shrink-0">
                  <MessageCircle className="h-5 lg:h-6 w-5 lg:w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">Create Ticket</h3>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Get help from support</p>
                </div>
              </div>
              <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-3 lg:mt-4 ml-auto" />
            </Link>

            <Link
              to="/applications"
              className="group p-4 lg:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors flex-shrink-0">
                  <FileText className="h-5 lg:h-6 w-5 lg:w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">Applications</h3>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Apply for roles</p>
                </div>
              </div>
              <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors mt-3 lg:mt-4 ml-auto" />
            </Link>

            <Link
              to="/my-profile"
              className="group p-4 lg:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors flex-shrink-0">
                  <User className="h-5 lg:h-6 w-5 lg:w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">My Profile</h3>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">View your record</p>
                </div>
              </div>
              <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors mt-3 lg:mt-4 ml-auto" />
            </Link>

            <Link
              to="/tickets"
              className="group p-4 lg:p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center space-x-3 lg:space-x-4">
                <div className="p-2 lg:p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/30 transition-colors flex-shrink-0">
                  <MessageCircle className="h-5 lg:h-6 w-5 lg:w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">My Tickets</h3>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">View all tickets</p>
                </div>
              </div>
              <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors mt-3 lg:mt-4 ml-auto" />
            </Link>
          </div>

          {/* Admin Quick Action */}
          {user?.is_admin && (
            <div className="mt-6">
              <Link
                to="/admin"
                className="group flex items-center justify-between p-3 lg:p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-3 lg:space-x-4">
                  <div className="p-2 lg:p-3 bg-red-100 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                    <Settings className="h-5 lg:h-6 w-5 lg:w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm lg:text-base">Admin Panel</h3>
                    <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Manage the hub</p>
                  </div>
                </div>
                <ArrowRight className="h-4 lg:h-5 w-4 lg:w-5 text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors flex-shrink-0" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg lg:text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </h2>
                <Link
                  to="/tickets"
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm"
                >
                  View all
                </Link>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTickets.length > 0 ? (
                recentTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="block p-3 lg:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ticket.category_color }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {ticket.title}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1 space-y-1 sm:space-y-0">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTicketStatusColor(ticket.status)} w-fit`}
                          >
                            {ticket.status.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(ticket.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-6 text-center">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No recent activity
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 lg:p-6">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Getting Started
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">Check Your Profile</h4>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">View your community record and applications</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">Browse Applications</h4>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Apply for available roles and positions</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm lg:text-base">Need Help?</h4>
                  <p className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Create a support ticket for assistance</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};