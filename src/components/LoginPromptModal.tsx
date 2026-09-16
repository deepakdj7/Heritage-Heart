import React, { useState } from 'react';
import { ChefHat, Cloud, FolderHeart, ShieldCheck, ArrowRight } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onSignIn: () => Promise<void>;
}

export function LoginPromptModal({ isOpen, onSignIn }: LoginPromptModalProps) {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignInClick = async () => {
    try {
      setIsSigningIn(true);
      setErrorMessage(null);
      await onSignIn();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || 'Sign in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div 
      id="login-prompt-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-neutral-900/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
    >
      <div 
        id="login-prompt-modal-container"
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-neutral-200 overflow-hidden relative"
      >
        {/* Minimal Clean Header */}
        <div className="px-6 pt-7 pb-5 border-b border-neutral-100 bg-neutral-50/70">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-white mb-3">
            <ChefHat className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            Welcome to Heritage &amp; Heart
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 leading-relaxed">
            Please sign in to access your heirloom recipes, kitchen notes, and Google Drive vault.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="space-y-2.5 text-xs sm:text-sm text-neutral-600">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-neutral-200/80 text-neutral-800 flex items-center justify-center shrink-0">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 text-xs sm:text-sm">Google Drive Vault</p>
                <p className="text-[12px] text-neutral-500">Back up recipes directly as JSON files in your private Google Drive.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-neutral-200/80 text-neutral-800 flex items-center justify-center shrink-0">
                <FolderHeart className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 text-xs sm:text-sm">Family Recipes &amp; Notes</p>
                <p className="text-[12px] text-neutral-500">Document tips, regional variants, and step-by-step traditions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-neutral-200/80 text-neutral-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-neutral-900 text-xs sm:text-sm">Real-time Cloud Sync</p>
                <p className="text-[12px] text-neutral-500">Seamlessly edit across devices and securely share with family.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <button
              id="google-signin-prompt-btn"
              type="button"
              disabled={isSigningIn}
              onClick={handleSignInClick}
              className="w-full py-3 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white font-medium text-sm flex items-center justify-center gap-3 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSigningIn ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isSigningIn ? 'Signing in...' : 'Sign in with Google'}</span>
              {!isSigningIn && <ArrowRight className="w-4 h-4 ml-auto opacity-60" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
