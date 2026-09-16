import React from 'react';
import { 
  Clock, 
  Users, 
  Share2, 
  Copy, 
  Cloud, 
  ChevronRight,
  Flame,
  Info
} from 'lucide-react';
import { Recipe } from '../types';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onShare: (recipe: Recipe, e: React.MouseEvent) => void;
  onFork: (recipe: Recipe, e: React.MouseEvent) => void;
  currentUserId?: string;
  isFavorited?: boolean;
  onToggleFavorite?: (recipeId: string, e: React.MouseEvent) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onSelect,
  onShare,
  onFork,
  currentUserId,
}) => {
  const isAuthor = currentUserId && recipe.authorId === currentUserId;
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <div
      onClick={() => onSelect(recipe)}
      className="group flex flex-col bg-white rounded-2xl border border-neutral-200 hover:border-neutral-900 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer"
    >
      {/* Recipe Cover Image */}
      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-neutral-100">
        <img
          src={recipe.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'}
          alt={recipe.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent" />
        
        {/* Category & Regional tag */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center">
          <span className="px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-full text-xs font-medium text-neutral-800 shadow-2xs">
            {recipe.category}
          </span>
          {recipe.kannadaTitle && (
            <span className="px-2 py-0.5 bg-neutral-900/80 text-white backdrop-blur-xs rounded-full text-[11px] font-medium border border-neutral-700">
              {recipe.kannadaTitle.split(' ')[0]}
            </span>
          )}
        </div>

        {/* Google Drive Synced Indicator */}
        {recipe.driveFileId && (
          <div 
            title="Archived in Google Drive"
            className="absolute top-3 right-3 p-1.5 bg-white/95 backdrop-blur-xs rounded-full shadow-2xs text-neutral-800 flex items-center justify-center"
          >
            <Cloud className="w-3.5 h-3.5 text-neutral-700" />
          </div>
        )}

        {/* Bottom Card Title Overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <p className="text-[11px] font-medium text-neutral-300 tracking-wide uppercase">
            {recipe.cuisine || 'Traditional'}
          </p>
          <h3 className="text-base sm:text-lg font-semibold leading-tight line-clamp-1 text-white group-hover:text-neutral-200 transition-colors">
            {recipe.title}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm text-neutral-600 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>

          {/* Kitchen Tip Note */}
          {recipe.grandmasSecrets && recipe.grandmasSecrets.length > 0 && recipe.grandmasSecrets[0] && (
            <div className="mt-2.5 p-2 rounded-xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-neutral-700 line-clamp-1">
                <span className="font-medium text-neutral-900">Note:</span> {recipe.grandmasSecrets[0]}
              </p>
            </div>
          )}
        </div>

        {/* Cooking Metadata & Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              <span>{totalTime}m</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              <span>{recipe.servings} srv</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-neutral-500" />
              <span>{recipe.difficulty}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Share Recipe */}
            <button
              onClick={(e) => onShare(recipe, e)}
              title="Share or invite"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Copy / Fork Recipe into own list */}
            {!isAuthor && (
              <button
                onClick={(e) => onFork(recipe, e)}
                title="Copy into my recipes"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors flex items-center gap-1 text-xs cursor-pointer"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onSelect(recipe)}
              aria-label="View Recipe"
              className="p-1.5 rounded-lg text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
