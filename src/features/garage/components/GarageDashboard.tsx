import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  CreditCard, 
  Calendar, 
  Plus, 
  Settings,
  Users,
  Key,
  Award
} from 'lucide-react';
import { garageAPI } from '../services/garageAPI';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

interface Subscription {
  id: number;
  tier_name: string;
  expires_at: string;
  vouchers_remaining: number;
  monthly_vouchers: number;
}

interface DashboardData {
  subscriptions: Subscription[];
  credits: number;
  hasAccess: boolean;
}

export const GarageDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashboardData = await garageAPI.getDashboard();
        setData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch garage dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
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

  if (!data?.hasAccess) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to the Garage
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            The Garage is your hub for vehicle contributions and management. 
            To get started, you'll need an active subscription.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/garage/tiers"
              className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Award className="h-5 w-5 mr-2" />
              View Subscription Tiers
            </Link>
            
            <Link
              to="/garage/redeem"
              className="inline-flex items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <Key className="h-5 w-5 mr-2" />
              Redeem Code
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Garage Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your vehicle contributions and subscriptions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <CreditCard className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Available Credits
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.credits}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Subscriptions
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.subscriptions.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Car className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Vouchers
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data.subscriptions.reduce((sum, sub) => sum + sub.vouchers_remaining, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/garage/submit"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors duration-200 group"
          >
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/30 transition-colors">
              <Plus className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Submit Vehicle</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add new vehicle</p>
            </div>
          </Link>

          <Link
            to="/garage/my"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-green-300 dark:hover:border-green-600 transition-colors duration-200 group"
          >
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
              <Car className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900 dark:text-white">My Vehicles</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage vehicles</p>
            </div>
          </Link>

          <Link
            to="/garage/redeem"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 transition-colors duration-200 group"
          >
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
              <Key className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Redeem Code</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Activate subscription</p>
            </div>
          </Link>

          <Link
            to="/garage/tiers"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-orange-300 dark:hover:border-orange-600 transition-colors duration-200 group"
          >
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/30 transition-colors">
              <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-gray-900 dark:text-white">View Tiers</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscription info</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Active Subscriptions */}
      {data.subscriptions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Active Subscriptions
          </h2>
          
          <div className="space-y-4">
            {data.subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    {subscription.tier_name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Expires: {formatDate(subscription.expires_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {subscription.vouchers_remaining} / {subscription.monthly_vouchers}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Vouchers remaining
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};