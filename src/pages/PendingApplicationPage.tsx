import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';

export const PendingApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:scale-[1.02]">
        <div className="flex justify-center mb-8">
          <div className="p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <Clock className="h-12 w-12 text-yellow-500 dark:text-yellow-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Application Pending Review
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          You already have a pending application for this form. Our team will review your submission and get back to you soon. Please check back later for updates.
        </p>
        
        <button
          onClick={() => navigate('/applications')}
          className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          Return to Applications
        </button>
      </div>
    </div>
  );
}; 