import React, { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { MessageCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export const LoginPage: React.FC = () => {
  const { user, loading, refreshUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [communityName, setCommunityName] = useState('');

  useEffect(() => {
    const authSuccess = searchParams.get('auth');
    if (authSuccess === 'success') {
      refreshUser();
    }
  }, [searchParams, refreshUser]);

  // Fetch custom branding
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/settings/branding');
        if (response.ok) {
          const data = await response.json();
          setCustomLogo(data.custom_logo_url);
          setCommunityName(data.community_name);
          // Update document title
          document.title = data.community_name;
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      } finally {
        setBrandingLoaded(true);
      }
    };

    fetchBranding();
  }, []);

  if (loading || !brandingLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleDiscordLogin = () => {
    window.location.href = authAPI.getDiscordAuthUrl();
  };

  const errorType = searchParams.get('error');
  const banReason = searchParams.get('reason');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-6 lg:space-y-8 p-6 lg:p-8">
        <div className="text-center">
          {/* Logo Section */}
          <div className="flex justify-center mb-6 lg:mb-8">
            {customLogo ? (
              <img 
                src={customLogo} 
                alt="Logo" 
                className="h-16 lg:h-24 w-auto max-w-full object-contain"
                onError={() => setCustomLogo(null)}
              />
            ) : (
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 lg:p-4 rounded-2xl shadow-lg">
                <MessageCircle className="h-8 lg:h-12 w-8 lg:w-12 text-white" />
              </div>
            )}
          </div>
          
          {/* Welcome Message */}
          <div className="mb-6 lg:mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3 lg:mb-4">
              Welcome to {communityName}
            </h2>
            <p className="text-gray-300 text-base lg:text-lg">
              Please log in with Discord to continue.
            </p>
          </div>
        </div>

        {/* Error Messages */}
        {errorType === 'hub_banned' && (
          <div className="mb-6 p-4 lg:p-6 bg-red-900/50 border border-red-700/50 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-300 font-semibold mb-2">Access Denied</h3>
                <p className="text-red-200 text-sm">
                  {banReason ? decodeURIComponent(banReason) : 'You have been banned from the hub.'}
                </p>
                <p className="text-red-300 text-xs mt-2">
                  If you believe this is an error, please contact an administrator.
                </p>
              </div>
            </div>
          </div>
        )}

        {errorType === 'auth_failed' && (
          <div className="mb-6 p-3 lg:p-4 bg-red-900/50 border border-red-700/50 rounded-xl">
            <p className="text-red-300 text-sm text-center">
              Authentication failed. Please try again or contact support.
            </p>
          </div>
        )}

        {/* Login Button - Only show if not banned */}
        {errorType !== 'hub_banned' && (
          <div>
            <button
              onClick={handleDiscordLogin}
              className="group relative w-full flex justify-center py-3 lg:py-4 px-4 border border-transparent text-base lg:text-lg font-medium rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <svg
                className="w-5 lg:w-6 h-5 lg:h-6 mr-3"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.196.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Login with Discord
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Secure authentication powered by Discord
          </p>
        </div>
      </div>
    </div>
  );
};