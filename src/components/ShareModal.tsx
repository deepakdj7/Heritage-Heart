import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Link, 
  Mail, 
  Copy, 
  Check, 
  Globe, 
  Lock,
  Send,
  Trash2
} from 'lucide-react';
import { Recipe } from '../types';

interface ShareModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onUpdateShare: (recipe: Recipe, emails: string[], isPublic: boolean) => void;
  currentAppUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  recipe,
  onClose,
  onUpdateShare,
}) => {
  if (!recipe) return null;

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedList, setInvitedList] = useState<string[]>(recipe.sharedWithEmails || []);
  const [isPublic, setIsPublic] = useState<boolean>(recipe.isPublic ?? true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Generate shareable link
  const shareableUrl = `${window.location.origin}/?recipe=${encodeURIComponent(recipe.id)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleAddInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    if (!invitedList.includes(cleanEmail)) {
      const updated = [...invitedList, cleanEmail];
      setInvitedList(updated);
      onUpdateShare(recipe, updated, isPublic);
      setSuccessNotice(`Invite saved for ${cleanEmail}. They can now view and copy this recipe.`);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
    setInviteEmail('');
  };

  const handleRemoveInvite = (emailToRemove: string) => {
    const updated = invitedList.filter(e => e !== emailToRemove);
    setInvitedList(updated);
    onUpdateShare(recipe, updated, isPublic);
  };

  const handleTogglePublic = () => {
    const nextPublic = !isPublic;
    setIsPublic(nextPublic);
    onUpdateShare(recipe, invitedList, nextPublic);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-neutral-200 p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-neutral-900">
                Share Recipe
              </h3>
              <p className="text-xs text-neutral-500 line-clamp-1">
                "{recipe.title}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-xs text-neutral-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Section 1: Generated Web Link */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <Link className="w-3.5 h-3.5 text-neutral-600" />
            <span>Shareable Link</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-600 select-all outline-hidden font-mono"
            />
            <button
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                copiedLink
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-[11px] text-neutral-500">
            Anyone with this link can view this recipe and copy it to their personal collection.
          </p>
        </div>

        {/* Section 2: Direct Email Invites */}
        <div className="space-y-3 pt-3 border-t border-neutral-100">
          <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-neutral-600" />
            <span>Direct Email Invite</span>
          </label>
          <form onSubmit={handleAddInvite} className="flex gap-2">
            <input
              type="email"
              placeholder="e.g. friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
            />
            <button
              type="submit"
              disabled={!inviteEmail.trim()}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3 h-3" />
              <span>Invite</span>
            </button>
          </form>

          {/* Invited Collaborators List */}
          {invitedList.length > 0 && (
            <div className="space-y-1.5 mt-2">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                Invited ({invitedList.length})
              </span>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {invitedList.map((email) => (
                  <div key={email} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 border border-neutral-100 text-xs text-neutral-700">
                    <span className="truncate">{email}</span>
                    <button
                      onClick={() => handleRemoveInvite(email)}
                      className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Privacy Mode Toggle */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
              {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-900">
                {isPublic ? 'Publicly Visible' : 'Private Recipe'}
              </p>
              <p className="text-[11px] text-neutral-500">
                {isPublic ? 'Anyone with the link can view' : 'Only you & invited emails can view'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTogglePublic}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              isPublic 
                ? 'bg-neutral-100 border-neutral-200 text-neutral-800 hover:bg-neutral-200' 
                : 'bg-neutral-900 border-neutral-900 text-white'
            }`}
          >
            {isPublic ? 'Make Private' : 'Make Public'}
          </button>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
