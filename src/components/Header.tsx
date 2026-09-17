import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Sparkles, 
  BookOpen, 
  Cloud, 
  Share2, 
  LogIn, 
  LogOut, 
  Heart,
  ChefHat,
  Menu,
  X,
  RefreshCw,
  FolderOpen,
  Download,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ActiveTab } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenCreate: () => void;
  isSyncingDrive: boolean;
  onSyncDrive: () => void;
  hasDriveAccess: boolean;
  onOpenDownloadModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  currentUser,
  onSignIn,
  onSignOut,
  onOpenCreate,
  isSyncingDrive,
  onSyncDrive,
  hasDriveAccess,
  onOpenDownloadModal
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          
          {/* Brand Identity */}
          <div 
            onClick={() => setActiveTab('cookbook')}
            className="flex items-center gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white shadow-xs group-hover:bg-neutral-800 transition-colors duration-200">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-semibold tracking-tight text-neutral-900 group-hover:text-neutral-700 transition-colors">
                Heritage &amp; Heart
              </span>
            </div>
          </div>

          {/* Quick Search Field */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes, ingredients..."
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white rounded-full text-sm border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all outline-hidden text-neutral-900 placeholder:text-neutral-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('cookbook')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cookbook'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              My Recipes
            </button>
            <button
              onClick={() => setActiveTab('shared-with-me')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'shared-with-me'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              Shared Recipes
            </button>
          </nav>

          {/* Action Buttons: Drive Sync, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* In-App PWA Install Prompt */}
            <PWAInstallButton />

            {/* Download Recipe JSONs Modal Trigger */}
            {onOpenDownloadModal && (
              <button
                onClick={onOpenDownloadModal}
                title="Download Heirloom Recipe JSON files"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-neutral-600" />
                <span>Recipe JSONs</span>
              </button>
            )}

            {/* Drive Status / Sync Indicator */}
            {currentUser && (
              <button
                onClick={onSyncDrive}
                disabled={isSyncingDrive}
                title="Sync recipes with Google Drive"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer"
              >
                <Cloud className={`w-3.5 h-3.5 ${hasDriveAccess ? 'text-neutral-600' : 'text-amber-500'}`} />
                <span>{isSyncingDrive ? 'Syncing...' : (hasDriveAccess ? 'Sync now' : 'Sync Drive')}</span>
                {isSyncingDrive && <RefreshCw className="w-3 h-3 animate-spin ml-1 text-neutral-600" />}
              </button>
            )}

            {/* Authentication Profile / Button */}
            {currentUser ? (
              <div className="relative pl-1 border-l border-neutral-200" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen}
                  aria-label="User profile and session settings"
                  className="flex items-center gap-1.5 p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer border border-transparent hover:border-neutral-200"
                  title="View Account & Session Status"
                >
                  <div className="relative">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                        className="w-8 h-8 rounded-full border border-neutral-200 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-xs">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    {/* Active Session Indicator */}
                    <span 
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                        hasDriveAccess ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} 
                      title={hasDriveAccess ? 'Signed In & Google Drive Connected' : 'Signed In • Click to reconnect Drive'}
                    />
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 hidden sm:inline" />
                </button>

                {/* User Profile Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-neutral-200 py-3 z-50 text-left animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* User Info Header */}
                    <div className="px-4 pb-3 border-b border-neutral-100 flex items-center gap-3">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-10 h-10 rounded-full border border-neutral-200 object-cover shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-sm shrink-0">
                          {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {currentUser.displayName || 'Family Chef'}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">
                          {currentUser.email}
                        </p>
                      </div>
                    </div>

                    {/* Session Security & Longevity Status */}
                    <div className="px-4 py-2.5 bg-neutral-50/70 border-b border-neutral-100 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Signed In Continuously</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-0.5 pl-5 leading-tight">
                        Your session stays signed in for 30 days. Recipes remain saved locally and in your cookbook.
                      </p>
                    </div>

                    {/* Google Drive Status Section */}
                    <div className="px-4 py-3 border-b border-neutral-100 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-neutral-800">Google Drive Cloud Sync</span>
                        {hasDriveAccess ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Connected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Token Expired
                          </span>
                        )}
                      </div>

                      {hasDriveAccess ? (
                        <p className="text-[11px] text-neutral-500 leading-normal mb-2.5">
                          Recipes automatically sync with your Google Drive cookbook folder.
                        </p>
                      ) : (
                        <p className="text-[11px] text-neutral-500 leading-normal mb-2.5">
                          Drive token expired, but all recipes remain safely loaded in your app. Reconnect Drive anytime to sync files.
                        </p>
                      )}

                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSyncDrive();
                        }}
                        disabled={isSyncingDrive}
                        className={`w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          hasDriveAccess 
                            ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800' 
                            : 'bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs'
                        }`}
                      >
                        <Cloud className="w-3.5 h-3.5" />
                        <span>{hasDriveAccess ? (isSyncingDrive ? 'Syncing...' : 'Sync Recipes Now') : 'Reconnect Google Drive'}</span>
                        {isSyncingDrive && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
                      </button>
                    </div>

                    {/* Sign Out Action */}
                    <div className="px-2 pt-2">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>Sign Out of Heritage &amp; Heart</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-neutral-300 hover:border-neutral-900 bg-white rounded-lg text-xs sm:text-sm font-medium text-neutral-800 hover:text-neutral-950 transition-colors shadow-2xs cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-neutral-700" />
                <span>Signin</span>
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden pb-3">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-full text-xs border border-neutral-200 text-neutral-800 placeholder:text-neutral-400 outline-hidden focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Mobile Expanded Drawer Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-neutral-100 flex flex-col gap-1.5">
            <button
              onClick={() => { setActiveTab('cookbook'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'cookbook' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              My Recipes
            </button>
            <button
              onClick={() => { setActiveTab('shared-with-me'); setMobileMenuOpen(false); }}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium ${
                activeTab === 'shared-with-me' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              Shared Recipes
            </button>
            {onOpenDownloadModal && (
              <button
                onClick={() => { onOpenDownloadModal(); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm text-neutral-800 font-medium flex items-center gap-2 bg-white border border-neutral-200"
              >
                <Download className="w-4 h-4 text-neutral-600" />
                Download Recipe JSONs
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => { onSyncDrive(); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm text-neutral-800 font-medium flex items-center gap-2 bg-neutral-50 hover:bg-neutral-100"
              >
                <Cloud className="w-4 h-4" />
                <span>{isSyncingDrive ? 'Syncing...' : (hasDriveAccess ? 'Sync with Drive' : 'Reconnect Google Drive')}</span>
              </button>
            )}
            {currentUser && (
              <button
                onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                className="text-left px-3 py-2 rounded-lg text-sm text-red-600 font-medium flex items-center gap-2 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
