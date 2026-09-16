import React, { useState } from 'react';
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
  Download
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
                <Cloud className="w-3.5 h-3.5 text-neutral-600" />
                <span>{isSyncingDrive ? 'Syncing...' : 'Sync now'}</span>
                {isSyncingDrive && <RefreshCw className="w-3 h-3 animate-spin ml-1 text-neutral-600" />}
              </button>
            )}

            {/* Authentication Avatar / Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-1 border-l border-neutral-200">
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
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
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
                Sync now
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
