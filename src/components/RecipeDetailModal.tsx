import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Users, 
  Share2, 
  Copy, 
  Cloud, 
  ChefHat, 
  Trash2, 
  ExternalLink,
  BookOpen,
  Info,
  Edit3
} from 'lucide-react';
import { Recipe } from '../types';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  onClose: () => void;
  onFork: (recipe: Recipe) => void;
  onShare: (recipe: Recipe) => void;
  onEdit?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
  onSaveToDrive?: (recipe: Recipe) => void;
  isSavingToDrive?: boolean;
  currentUserId?: string;
  hasDriveAccess?: boolean;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  onClose,
  onFork,
  onShare,
  onEdit,
  onDelete,
  onSaveToDrive,
  isSavingToDrive,
  currentUserId,
  hasDriveAccess,
}) => {
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});

  if (!recipe) return null;

  const isAuthor = currentUserId && recipe.authorId === currentUserId;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  const toggleIngredient = (id: string) => {
    setCheckedIngredients(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Action Bar */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          {/* Save / Sync with Google Drive */}
          {onSaveToDrive && hasDriveAccess && (
            <button
              onClick={() => onSaveToDrive(recipe)}
              disabled={isSavingToDrive}
              className="px-3 py-1.5 bg-white/95 hover:bg-white text-neutral-800 backdrop-blur-xs rounded-full text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors border border-neutral-200 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5 text-neutral-600" />
              <span>{isSavingToDrive ? 'Backing up...' : recipe.driveFileId ? 'Drive Backed' : 'Backup to Drive'}</span>
            </button>
          )}

          {/* Edit Button */}
          {isAuthor && onEdit && (
            <button
              onClick={() => onEdit(recipe)}
              className="px-3 py-1.5 bg-white/95 hover:bg-white text-neutral-800 backdrop-blur-xs rounded-full text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors border border-neutral-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-neutral-600" />
              <span>Edit</span>
            </button>
          )}

          {/* Copy / Fork Button */}
          {!isAuthor && (
            <button
              onClick={() => onFork(recipe)}
              className="px-3 py-1.5 bg-white/95 hover:bg-white text-neutral-800 backdrop-blur-xs rounded-full text-xs font-medium shadow-xs flex items-center gap-1.5 transition-colors border border-neutral-200 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-neutral-600" />
              <span>Copy to My Recipes</span>
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => onShare(recipe)}
            className="p-2 bg-white/95 hover:bg-white text-neutral-700 backdrop-blur-xs rounded-full shadow-xs border border-neutral-200 transition-colors cursor-pointer"
            title="Share or Invite"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 bg-neutral-900/80 hover:bg-neutral-900 text-white backdrop-blur-xs rounded-full shadow-xs transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Container */}
        <div className="overflow-y-auto overflow-x-hidden">
          {/* Header Image & Title */}
          <div className="relative h-60 sm:h-72 w-full bg-neutral-900">
            <img
              src={recipe.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80'}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-900/40 to-transparent" />

            {/* Bottom Title Details */}
            <div className="absolute bottom-5 left-6 right-6 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-neutral-900">
                  {recipe.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-xs text-white border border-white/20">
                  {recipe.cuisine || 'Traditional'}
                </span>
                {recipe.forkedFromAuthor && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-800/80 text-neutral-200 border border-neutral-700">
                    Adapted from {recipe.forkedFromAuthor}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-1">
                {recipe.title}
              </h1>

              {recipe.kannadaTitle && (
                <p className="text-sm text-neutral-300 font-normal mb-2.5">
                  {recipe.kannadaTitle}
                </p>
              )}

              {/* Cooking Stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-200 pt-2 border-t border-white/15">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-neutral-300" />
                  <span>Prep: {recipe.prepTimeMinutes}m • Cook: {recipe.cookTimeMinutes}m ({totalTime}m total)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-neutral-300" />
                  <span>Serves {recipe.servings}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ChefHat className="w-4 h-4 text-neutral-300" />
                  <span>Difficulty: {recipe.difficulty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Body */}
          <div className="p-6 sm:p-7 space-y-6">
            
            {/* Story & Origin */}
            {recipe.storyOrOrigin && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-1.5 text-neutral-900 font-semibold text-sm">
                  <BookOpen className="w-4 h-4 text-neutral-700" />
                  <span>Origin &amp; Notes</span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  "{recipe.storyOrOrigin}"
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-200">
                  <span>Preserved by {recipe.authorName}</span>
                  {recipe.driveWebLink && (
                    <a
                      href={recipe.driveWebLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-neutral-900 font-medium hover:underline"
                    >
                      <Cloud className="w-3.5 h-3.5" /> View in Google Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Special Tips */}
            {recipe.grandmasSecrets && recipe.grandmasSecrets.length > 0 && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2.5 text-neutral-900 font-semibold text-xs uppercase tracking-wider">
                  <Info className="w-4 h-4 text-neutral-700" />
                  <span>Tips &amp; Kitchen Secrets</span>
                </div>
                <ul className="space-y-2">
                  {recipe.grandmasSecrets.map((secret, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700">
                      <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-800 text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{secret}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ingredients & Steps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Ingredients */}
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Ingredients ({recipe.ingredients.length})
                  </h3>
                  <span className="text-xs text-neutral-400">Click to check</span>
                </div>

                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 divide-y divide-neutral-200/70">
                  {recipe.ingredients.map((ing) => {
                    const isChecked = checkedIngredients[ing.id];
                    return (
                      <div
                        key={ing.id}
                        onClick={() => toggleIngredient(ing.id)}
                        className={`py-2 px-1 flex items-center justify-between cursor-pointer rounded-lg transition-colors ${
                          isChecked ? 'opacity-40' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={!!isChecked}
                            onChange={() => toggleIngredient(ing.id)}
                            className="w-4 h-4 text-neutral-900 rounded border-neutral-300 focus:ring-neutral-900 cursor-pointer"
                          />
                          <div>
                            <span className={`text-xs sm:text-sm font-medium ${
                              isChecked ? 'line-through text-neutral-400' : 'text-neutral-800'
                            }`}>
                              {ing.name}
                            </span>
                            {ing.notes && (
                              <p className="text-[11px] text-neutral-500">{ing.notes}</p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-neutral-700 shrink-0">
                          {ing.amount} {ing.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Steps */}
              <div className="md:col-span-7 space-y-3">
                <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                  Instructions ({recipe.steps.length})
                </h3>

                <div className="space-y-3">
                  {recipe.steps.map((step) => (
                    <div
                      key={step.id}
                      className="p-4 rounded-xl border border-neutral-200 bg-white space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-neutral-900 text-white text-xs font-semibold flex items-center justify-center">
                          {step.stepNumber}
                        </span>
                        <span className="text-xs font-semibold text-neutral-700">Step {step.stepNumber}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed pl-7">
                        {step.instruction}
                      </p>
                      {step.tip && (
                        <div className="ml-7 mt-2 p-2 bg-neutral-50 rounded-lg text-[11px] text-neutral-600 border border-neutral-200/80">
                          <span className="font-semibold text-neutral-800">Tip:</span> {step.tip}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isAuthor && onEdit && (
                  <button
                    onClick={() => onEdit(recipe)}
                    className="px-3 py-2 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-neutral-600" />
                    <span>Edit Recipe</span>
                  </button>
                )}
                {isAuthor && onDelete && (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this recipe?')) {
                        onDelete(recipe.id);
                        onClose();
                      }
                    }}
                    className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Recipe</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
