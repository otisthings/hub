import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Filter,
  Ticket,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ticketsAPI, categoriesAPI, dashboardAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface TicketData {
  id: number;
  title: string;
  status: string;
  category_name: string;
  category_color: string;
  user_name: string;
  user_avatar: string;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: number;
  name: string;
  color: string;
}

interface TicketStats {
  total: number;
  open: number;
  closed: number;
}

export const TicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // UPDATED: Don't pass support=true for tickets page (user's own tickets only)
        const [ticketsData, categoriesData, statsData] = await Promise.all([
          ticketsAPI.getAll(),
          categoriesAPI.getAll(),
          dashboardAPI.getStats()
        ]);
        setTickets(ticketsData);
        setCategories(categoriesData);
        setStats({
          total: statsData.total || 0,
          open: statsData.open || 0,
          closed: statsData.closed || 0
        });
      } catch (error) {
        console.error('Failed to fetch tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesCategory = !categoryFilter || ticket.category_name === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'closed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'closed': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'cancelled': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
            My Tickets
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm lg:text-base">
            View and manage your support requests
          </p>
        </div>
        
        <Link
          to="/tickets/new"
          className="inline-flex items-center px-3 lg:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm lg:text-base"
        >
          <Plus className="h-4 lg:h-5 w-4 lg:w-5 mr-2" />
          New Ticket
        </Link>
      </div>

      {/* Ticket Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                <Ticket className="h-5 lg:h-6 w-5 lg:w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  My Tickets
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                <Clock className="h-5 lg:h-6 w-5 lg:w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Open
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.open}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center">
              <div className="p-2 lg:p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                <CheckCircle className="h-5 lg:h-6 w-5 lg:w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-3 lg:ml-4">
                <p className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  Closed
                </p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.closed}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 lg:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 lg:h-5 w-4 lg:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 lg:pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm lg:text-base"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 lg:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm lg:text-base"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 lg:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm lg:text-base"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {filteredTickets.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block p-4 lg:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
                      <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-white">
                        {ticket.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                      >
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1">{ticket.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-xs lg:text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <span
                          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ticket.category_color }}
                        ></span>
                        <span>{ticket.category_name}</span>
                      </div>
                      <span>�</span>
                      <span>Created {formatDate(ticket.created_at)}</span>
                      {ticket.updated_at !== ticket.created_at && (
                        <>
                          <span>�</span>
                          <span>Updated {formatDate(ticket.updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-400 flex-shrink-0 self-end lg:self-center">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 lg:p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No tickets found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter || categoryFilter
                ? 'Try adjusting your filters'
                : 'Create your first support ticket'}
            </p>
            <Link
              to="/tickets/new"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Ticket
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};