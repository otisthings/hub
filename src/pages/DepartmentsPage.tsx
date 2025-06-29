import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building, Users, Clock, ArrowRight } from 'lucide-react';
import { departmentsAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface Department {
  id: number;
  name: string;
  db_name: string;
  callsign_prefix: string;
  roster_view_id: string[];
  classification: string;
  roster_count: number;
  created_by_name: string;
  created_at: string;
}

export const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await departmentsAPI.getByClassification('department');
        setDepartments(data);
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

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
          Departments
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage department rosters and timeclock data
        </p>
      </div>

      {departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((department) => (
            <Link
              key={department.id}
              to={`/departments/${department.id}/roster`}
              className="group bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 hover:shadow-xl card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {department.name}
              </h3>
              
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">Callsign Prefix:</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">
                    {department.callsign_prefix}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>{department.roster_count || 0} members</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Created {new Date(department.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Click to view roster and timeclock data
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No departments available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You don't have access to any departments, or none have been created yet.
          </p>
        </div>
      )}
    </div>
  );
};