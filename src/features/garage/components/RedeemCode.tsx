import React, { useState } from 'react';
import { Key, CheckCircle, CreditCard, Award } from 'lucide-react';
import { garageAPI } from '../services/garageAPI';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

export const RedeemCode: React.FC = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await garageAPI.redeemCode(code.trim());
      setResult(response);
      setCode('');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to redeem code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full mb-4">
          <Key className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Redeem Code
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your subscription or credit code to activate benefits
        </p>
      </div>

      {result && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
              Code Redeemed Successfully!
            </h3>
          </div>
          
          <p className="text-green-700 dark:text-green-300 mb-4">
            {result.message}
          </p>
          
          {result.type === 'subscription' && (
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <Award className="h-5 w-5" />
              <span>Subscription: {result.tier}</span>
            </div>
          )}
          
          {result.type === 'credit' && (
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300">
              <CreditCard className="h-5 w-5" />
              <span>Credits Added: {result.amount}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Redemption Code
            </label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter your code here"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-center tracking-wider"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                <Key className="h-5 w-5 mr-2" />
                Redeem Code
              </>
            )}
          </button>
        </div>
      </form>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Don't have a code? Contact an administrator to purchase a subscription.</p>
      </div>
    </div>
  );
};