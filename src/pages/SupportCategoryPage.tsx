import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft,
  Ticket, 
  Clock, 
  CheckCircle, 
  Search,
  User,
  UserCheck,
  Calendar,
  Filter
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

export const SupportCategoryPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category | null>(null);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [claimedFilter, setClaimedFilter] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId) return;
      
      try {
        // Check if user has access to this category
        const supportCategories = await categoriesAPI.getSupportCategories();
        const categoryAccess = supportCategories.find((c: Category) => c.id.toString() === categoryId);
        
        if (!categoryAccess && !user?.is_admin) {
          navigate('/support');
          return;
        }
        
        // Fetch category details and tickets
        const [categoriesData, ticketsData] = await Promise.all([
          categoriesAPI.getAll(),
          ticketsAPI.getAll({ support: 'true', category: categoryId })
        ]);
        
        const categoryData = categoriesData.find((c: Category) => c.id.toString() === categoryId);
        if (!categoryData) {
          navigate('/support');
          return;
        }
        
        setCategory(categoryData);
        setTickets(ticketsData || []);
      } catch (error) {
        console.error('Failed to fetch category data:', error);
        navigate('/support');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categoryId, user, navigate]);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = !searchTerm || 
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesClaimed = !claimedFilter || 
      (claimedFilter === 'claimed' && ticket.claimed_by_name) ||
      (claimedFilter === 'unclaimed' && !ticket.claimed_by_name);
    
    return matchesSearch && matchesStatus && matchesClaimed;
  });

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

  if (!category) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Category not found</h2>
        <button
          onClick={() => navigate('/support')}
          className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Return to support dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/support')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: category.color }}
            ></div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {category.name}
            </h1>
          </div>
          {category.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {category.description}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
          
          <select
            value={claimedFilter}
            onChange={(e) => setClaimedFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Tickets</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed</option>
          </select>

          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
            <span className="font-medium">{filteredTickets.length}</span>
            <span className="ml-1">tickets found</span>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Category Tickets
          </h2>
        </div>
        
        {filteredTickets.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {ticket.title}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                      >
                        {ticket.status.replace('_', ' ')}
                      </span>
                      {ticket.claimed_by_name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          <User className="h-3 w-3 mr-1" />
                          Claimed by {ticket.claimed_by_name}
                        </span>
                      )}
                      {ticket.assigned_to_name && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Assigned to {ticket.assigned_to_name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4" />
                        <span>{ticket.user_name}</span>
                      </div>
                      <span>�</span>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Created {formatDate(ticket.created_at)}</span>
                      </div>
                      {ticket.updated_at !== ticket.created_at && (
                        <>
                          <span>�</span>
                          <span>Updated {formatDate(ticket.updated_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-gray-400">
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No tickets found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter || claimedFilter
                ? 'Try adjusting your filters'
                : 'No tickets in this category'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};