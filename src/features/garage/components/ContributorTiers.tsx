import React, { useState, useEffect } from 'react';
import { Award, DollarSign, Calendar, Star } from 'lucide-react';
import { garageAPI } from '../services/garageAPI';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

interface Tier {
  id: number;
  name: string;
  description: string;
  price_usd: number;
  monthly_vouchers: number;
  stackable: boolean;
}

export const ContributorTiers: React.FC = () => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const tiersData = await garageAPI.getTiers();
        setTiers(tiersData);
      } catch (error) {
        console.error('Failed to fetch tiers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTiers();
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
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Contributor Tiers
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Choose a subscription tier that fits your contribution needs. 
          Each tier provides monthly vouchers for vehicle submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-200"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mb-4">
                <Award className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {tier.name}
              </h3>
              <div className="flex items-center justify-center space-x-1 mb-4">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tier.price_usd}
                </span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-gray-700 dark:text-gray-300">
                  {tier.monthly_vouchers} monthly vouchers
                </span>
              </div>
              
              {tier.stackable && (
                <div className="flex items-center space-x-3">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-gray-700 dark:text-gray-300">
                    Stackable vouchers
                  </span>
                </div>
              )}
              
              {tier.description && (
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {tier.description}
                </p>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Contact an administrator to purchase this tier
              </p>
            </div>
          </div>
        ))}
      </div>

      {tiers.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No tiers available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Contributor tiers have not been configured yet.
          </p>
        </div>
      )}
    </div>
  );
};