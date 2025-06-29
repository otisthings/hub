import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Ticket, 
  Plus, 
  Settings, 
  Shield,
  MessageCircle,
  HeadphonesIcon,
  FileText,
  ClipboardList,
  UserCheck,
  LogOut,
  User,
  ChevronUp,
  Menu,
  X,
  Users,
  ShoppingBag,
  Building,
  Building2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { categoriesAPI, departmentsAPI } from '../services/api';
import type { LucideIcon } from 'lucide-react';
import { getFeatureFlags } from '../services/features';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasSupportAccess, setHasSupportAccess] = useState(false);
  const [supportLoading, setSupportLoading] = useState(true);
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [brandingLoaded, setBrandingLoaded] = useState(false);
  const [communityName, setCommunityName] = useState('');
  const [hasDepartmentAccess, setHasDepartmentAccess] = useState(false);
  const [hasOrganizationAccess, setHasOrganizationAccess] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const [features, setFeatures] = useState({
    enableDepartments: true,
    enableOrganizations: true,
    enablePlayerRecord: true,
    enableTimeclock: true
  });
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileAreaRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Load feature flags
  useEffect(() => {
    const loadFeatures = async () => {
      const flags = await getFeatureFlags();
      setFeatures(flags);
    };
    loadFeatures();
  }, []);

  // Check if user has access to support page (UPDATED: Based on required roles)
  useEffect(() => {
    const checkSupportAccess = async () => {
      if (!user) {
        setSupportLoading(false);
        return;
      }

      try {
        // Admin always has access
        if (user.is_admin) {
          setHasSupportAccess(true);
          setSupportLoading(false);
          return;
        }

        // Check support categories (categories where user has required role)
        const supportCategories = await categoriesAPI.getSupportCategories();
        setHasSupportAccess(supportCategories.length > 0);
      } catch (error) {
        console.error('Failed to check support access:', error);
        setHasSupportAccess(false);
      } finally {
        setSupportLoading(false);
      }
    };

    checkSupportAccess();
  }, [user]);

  // Check if user has access to departments/organizations
  useEffect(() => {
    const checkDepartmentAccess = async () => {
      if (!user || !features.enableDepartments) {
        setDepartmentLoading(false);
        return;
      }

      try {
        // Admin always has access
        if (user.is_admin) {
          setHasDepartmentAccess(true);
          setHasOrganizationAccess(features.enableOrganizations);
          setDepartmentLoading(false);
          return;
        }

        // Check departments and organizations based on user roles
        const [departments, organizations] = await Promise.all([
          features.enableDepartments ? departmentsAPI.getByClassification('department') : [],
          features.enableOrganizations ? departmentsAPI.getByClassification('organization') : []
        ]);

        setHasDepartmentAccess(departments.length > 0);
        setHasOrganizationAccess(organizations.length > 0);
      } catch (error) {
        console.error('Failed to check department access:', error);
        setHasDepartmentAccess(false);
        setHasOrganizationAccess(false);
      } finally {
        setDepartmentLoading(false);
      }
    };

    checkDepartmentAccess();
  }, [user, features]);

  // Fetch custom branding - optimized to prevent flicker
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch('/api/settings/branding', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCustomLogo(data.custom_logo_url);
          setCommunityName(data.community_name);
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error);
      } finally {
        // Always set loaded to true, regardless of success/failure
        setBrandingLoaded(true);
      }
    };

    fetchBranding();
  }, []);

  // Check if user has management access
  const hasManagementAccess = () => {
    if (!user) return false;
    if (user.is_admin) return true;
    
    const userRoles = user.roles || [];
    return userRoles.some(role => role.id === import.meta.env.VITE_MANAGEMENT_ROLE_ID);
  };

  const navigation: NavigationItem[] = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Tickets', href: '/tickets', icon: Ticket },
  ];

  // Add applications section
  navigation.push({ name: 'Applications', href: '/applications', icon: FileText });

  // Add Store button
  navigation.push({ 
    name: 'Store', 
    href: 'https://store.lynus.gg/', 
    icon: ShoppingBag,
    external: true 
  });

  // Add visual separator before Applications
  const separatorIndex = navigation.length;

  // Add departments and organizations based on access
  if (features.enableDepartments && hasDepartmentAccess) {
    navigation.push({ name: 'Departments', href: '/departments', icon: Building });
  }
  
  if (features.enableOrganizations && hasOrganizationAccess) {
    navigation.push({ name: 'Organizations', href: '/organizations', icon: Building2 });
  }

  // Add support page for users with support access OR admins
  if (user && (user.is_admin || (!supportLoading && hasSupportAccess))) {
    navigation.push({ name: 'Support', href: '/support', icon: HeadphonesIcon });
  }
  
  // Add management panel for users with management access
  if (user && hasManagementAccess()) {
    navigation.push({ name: 'Management', href: '/management', icon: Users });
  }

  if (user?.is_admin) {
    navigation.push({ name: 'Admin Panel', href: '/admin', icon: Shield });
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const getAvatarUrl = (avatar: string, userId: string) => {
    if (!avatar) return null;
    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.png`;
  };

  // Handle clicks outside the profile area and dropdown to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        profileAreaRef.current &&
        !profileMenuRef.current.contains(event.target as Node) &&
        !profileAreaRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    // Only add the event listener if the menu is open
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProfileMenu]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle mobile menu outside clicks
  useEffect(() => {
    const handleMobileClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !(event.target as Element).closest('[data-mobile-menu-trigger]')
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleMobileClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleMobileClickOutside);
      };
    }
  }, [isMobileMenuOpen]);

  // Calculate header height and spacing based on logo presence and loading state
  const hasLogo = brandingLoaded && customLogo;
  const headerHeight = hasLogo ? 'h-20' : 'h-16';
  const navPadding = hasLogo ? 'py-4' : 'py-6';

  return (
    <>
      {/* Mobile Menu Button - Fixed position */}
      <button
        data-mobile-menu-trigger
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" />
      )}

      {/* Sidebar */}
      <div
        ref={mobileMenuRef}
        className={`
          fixed lg:relative inset-y-0 left-0 z-40 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col h-full
        `}
      >
        {/* Header/Logo Section - Only render content when branding is loaded */}
        <div className={`flex items-center justify-center flex-shrink-0 ${headerHeight} px-4 mt-12 lg:mt-0`}>
          {brandingLoaded && (
            <div className="flex flex-col items-center justify-center w-full">
              {customLogo ? (
                <img 
                  src={customLogo} 
                  alt="Logo" 
                  className="h-12 lg:h-16 w-full max-w-[240px] object-contain"
                  onError={() => setCustomLogo(null)}
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-6 lg:h-8 w-6 lg:w-8 text-indigo-400" />
                  <span className="text-lg lg:text-xl font-bold text-white">
                    {communityName}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Divider - Only show when branding is loaded */}
        {brandingLoaded && (
          <div className="px-4">
            <hr className="border-gray-600" />
          </div>
        )}
        
        {/* Navigation Section - Only show when branding is loaded */}
        {brandingLoaded && (
          <nav className={`flex-1 px-4 space-y-2 overflow-y-auto ${navPadding}`}>
            {navigation.map((item, index) => {
              const Icon = item.icon;
              const showSeparator = index === separatorIndex && separatorIndex > 0;
              
              return (
                <div key={item.name}>
                  {/* Add visual separator before Applications */}
                  {showSeparator && (
                    <div className="py-2">
                      <hr className="border-gray-700" />
                    </div>
                  )}
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 lg:px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </a>
                  ) : (
                    <Link
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 lg:px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                        isActive(item.href)
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* User Info Section - Fixed to Bottom - Only show when branding is loaded */}
        {user && brandingLoaded && (
          <div className="flex-shrink-0 relative">
            <div 
              ref={profileAreaRef}
              className="flex items-center justify-between p-3 lg:p-4 cursor-pointer hover:bg-gray-800 transition-colors duration-200"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  {getAvatarUrl(user.avatar, user.discord_id) ? (
                    <img
                      src={getAvatarUrl(user.avatar, user.discord_id)!}
                      alt={user.username}
                      className="h-8 lg:h-10 w-8 lg:w-10 rounded-full ring-2 ring-gray-600 hover:ring-indigo-500 transition-all duration-200"
                    />
                  ) : (
                    <div className="h-8 lg:h-10 w-8 lg:w-10 bg-indigo-500 rounded-full flex items-center justify-center ring-2 ring-gray-600 hover:ring-indigo-500 transition-all duration-200">
                      <User className="h-4 lg:h-5 w-4 lg:w-5 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {user.username}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 flex-shrink-0">
                <ChevronUp 
                  className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                    showProfileMenu ? 'rotate-180' : ''
                  }`} 
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    logout();
                  }}
                  title="Logout"
                  className="flex items-center justify-center p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  <LogOut className="h-4 lg:h-5 w-4 lg:w-5" />
                </button>
              </div>
            </div>

            {/* Profile Dropdown - Shows on click */}
            {showProfileMenu && (
              <div 
                ref={profileMenuRef}
                className="absolute bottom-full left-3 lg:left-4 right-3 lg:right-4 mb-2 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50 backdrop-blur-sm"
              >
                <Link
                  to="/my-profile"
                  className="flex items-center px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
                  onClick={() => {
                    setShowProfileMenu(false);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <User className="h-4 w-4 mr-3" />
                  My Profile
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};