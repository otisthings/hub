import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  MessageSquare
} from 'lucide-react';
import { applicationsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

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

export const MyApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const data = await applicationsAPI.getMyApplications();
        setApplications(data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'denied': return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default: return <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'denied': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      default: return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Applications
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track the status of your submitted applications
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        {applications.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {applications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {app.app_name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}
                      >
                        {getStatusIcon(app.status)}
                        <span className="ml-1">{app.status.charAt(0).toUpperCase() + app.status.slice(1)}</span>
                      </span>
                    </div>
                    
                    {app.app_description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {app.app_description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span>Submitted {formatDate(app.submitted_at)}</span>
                      {app.reviewed_at && (
                        <>
                          <span>•</span>
                          <span>Reviewed {formatDate(app.reviewed_at)}</span>
                        </>
                      )}
                      {app.reviewed_by_name && (
                        <>
                          <span>•</span>
                          <span>by {app.reviewed_by_name}</span>
                        </>
                      )}
                    </div>
                    
                    {app.admin_notes && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Review Notes
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {app.admin_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              No applications submitted
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              You haven't submitted any applications yet. Check the Applications page to see available opportunities.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};