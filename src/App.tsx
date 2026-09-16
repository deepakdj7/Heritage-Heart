import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  BookOpen, 
  Cloud, 
  Share2, 
  FolderHeart, 
  Filter, 
  ChevronDown, 
  Info,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Flame,
  ChefHat
} from 'lucide-react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogleOAuth, logOut, getStoredDriveAccessToken } from './lib/firebase';
import { 
  subscribeToRealtimeRecipes, 
  saveRecipeRealtime, 
  deleteRecipeRealtime, 
  forkRecipeToUser 
} from './lib/recipeStore';
import { saveRecipeToGoogleDrive, loadRecipesFromGoogleDrive } from './lib/drive';
import { Recipe, ActiveTab } from './types';
import { Header } from './components/Header';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { ShareModal } from './components/ShareModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { LoginPromptModal } from './components/LoginPromptModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasDriveToken, setHasDriveToken] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('cookbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modals & Selected Recipe States
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sharingRecipe, setSharingRecipe] = useState<Recipe | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Status feedback
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotice = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setStatusNotification({ message, type });
    setTimeout(() => setStatusNotification(null), 4500);
  };

  // 1. Auth Listener: Sign-in is mandatory
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      const token = getStoredDriveAccessToken();
      setHasDriveToken(!!token);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Real-time Recipes Subscription
  useEffect(() => {
    const unsub = subscribeToRealtimeRecipes((updatedList) => {
      setRecipes(updatedList);
    });
    return () => unsub();
  }, []);

  // 3. Deep link handler (?recipe=id)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedRecipeId = params.get('recipe');
    if (sharedRecipeId && recipes.length > 0) {
      const match = recipes.find((r) => r.id === sharedRecipeId);
      if (match) {
        setSelectedRecipe(match);
      }
    }
  }, [recipes]);

  // Handler: Google Sign-in with Drive Scope
  const handleSignIn = async () => {
    try {
      const res = await signInWithGoogleOAuth();
      setHasDriveToken(!!res.accessToken);
      showNotice(`Signed in as ${res.user.displayName || res.user.email}. Google Drive connected!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Authentication failed', 'error');
    }
  };

  const handleSignOut = async () => {
    await logOut();
    setHasDriveToken(false);
    showNotice('Signed out successfully', 'info');
  };

  // Handler: Save / Create Recipe
  const handleSaveRecipe = async (recipe: Recipe) => {
    await saveRecipeRealtime(recipe);
    showNotice(`"${recipe.title}" added to your heirloom cookbook!`, 'success');

    // If user is connected to Google Drive, automatically back up to their Drive
    if (hasDriveToken && currentUser) {
      try {
        const driveResult = await saveRecipeToGoogleDrive(recipe);
        const updatedWithDrive: Recipe = {
          ...recipe,
          driveFileId: driveResult.fileId,
          driveWebLink: driveResult.webViewLink,
          driveSyncedAt: new Date().toISOString(),
        };
        await saveRecipeRealtime(updatedWithDrive);
        showNotice(`Backed up "${recipe.title}" directly to Google Drive!`, 'success');
      } catch (err: any) {
        console.warn('Drive auto-sync notice:', err);
      }
    }
  };

  // Handler: Manual Drive Sync for a specific recipe
  const handleSaveToDrive = async (recipe: Recipe) => {
    if (!hasDriveToken) {
      showNotice('Please sign in with Google to enable Google Drive storage.', 'info');
      handleSignIn();
      return;
    }

    try {
      setIsSyncingDrive(true);
      const driveResult = await saveRecipeToGoogleDrive(recipe);
      const updated: Recipe = {
        ...recipe,
        driveFileId: driveResult.fileId,
        driveWebLink: driveResult.webViewLink,
        driveSyncedAt: new Date().toISOString(),
      };
      await saveRecipeRealtime(updated);
      setSelectedRecipe(updated);
      showNotice(`Successfully stored "${recipe.title}" in your Google Drive!`, 'success');
    } catch (err: any) {
      console.error(err);
      showNotice(`Drive Sync Error: ${err.message}`, 'error');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Handler: Sync entire cookbook collection to Google Drive & Pull from Drive
  const handleFullDriveSync = async () => {
    if (!hasDriveToken) {
      handleSignIn();
      return;
    }

    try {
      setIsSyncingDrive(true);
      showNotice('Syncing recipes with Google Drive folder...', 'info');

      // 1. Upload un-synced user recipes
      const userRecipes = recipes.filter(r => !currentUser || r.authorId === currentUser.uid);
      for (const recipe of userRecipes) {
        try {
          const driveResult = await saveRecipeToGoogleDrive(recipe);
          await saveRecipeRealtime({
            ...recipe,
            driveFileId: driveResult.fileId,
            driveWebLink: driveResult.webViewLink,
            driveSyncedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Sync item failed:', e);
        }
      }

      // 2. Fetch any recipes existing in Google Drive
      const driveFiles = await loadRecipesFromGoogleDrive();
      for (const dRecipe of driveFiles) {
        await saveRecipeRealtime(dRecipe);
      }

      showNotice('Google Drive synchronization completed!', 'success');
    } catch (err: any) {
      console.error('Full drive sync failure:', err);
      if (err.message && (err.message.includes('403') || err.message.includes('insufficient') || err.message.includes('PERMISSION_DENIED'))) {
        setHasDriveToken(false);
        showNotice('Google Drive permission needed: please sign in again to grant Drive access.', 'error');
      } else {
        showNotice(`Drive Sync Error: ${err.message}`, 'error');
      }
    } finally {
      setIsSyncingDrive(false);
    }
  };

  // Handler: Fork / Clone recipe to user's list
  const handleForkRecipe = async (recipe: Recipe, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!currentUser) {
      showNotice('Please sign in with Google to copy this recipe to your own kitchen cookbook!', 'info');
      handleSignIn();
      return;
    }

    try {
      const cloned = await forkRecipeToUser(recipe, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Home Cook',
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || undefined,
      });

      showNotice(`Copied "${recipe.title}" into your kitchen! You can now customize and back it up.`, 'success');
      setActiveTab('cookbook');
      setSelectedRecipe(cloned);
    } catch (err: any) {
      showNotice('Failed to clone recipe', 'error');
    }
  };

  // Handler: Update sharing permissions
  const handleUpdateShare = async (recipe: Recipe, emails: string[], isPublic: boolean) => {
    const updated: Recipe = {
      ...recipe,
      sharedWithEmails: emails,
      isPublic,
      updatedAt: new Date().toISOString(),
    };
    await saveRecipeRealtime(updated);
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      setSelectedRecipe(updated);
    }
  };

  // Handler: Delete Recipe
  const handleDeleteRecipe = async (recipeId: string) => {
    await deleteRecipeRealtime(recipeId);
    showNotice('Recipe deleted from cookbook', 'info');
    if (selectedRecipe?.id === recipeId) {
      setSelectedRecipe(null);
    }
  };

  // Filtering Recipes based on Tab, Category & Search
  const filteredRecipes = recipes.filter((recipe) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = recipe.title.toLowerCase().includes(q);
      const matchDesc = recipe.description.toLowerCase().includes(q);
      const matchKannada = recipe.kannadaTitle?.toLowerCase().includes(q);
      const matchCuisine = recipe.cuisine.toLowerCase().includes(q);
      const matchIngredients = recipe.ingredients.some(i => i.name.toLowerCase().includes(q));
      const matchSecrets = recipe.grandmasSecrets?.some(s => s.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchKannada && !matchCuisine && !matchIngredients && !matchSecrets) {
        return false;
      }
    }

    // 2. Category Filter
    if (selectedCategory !== 'All' && recipe.category !== selectedCategory) {
      return false;
    }

    // 3. Tab Specific Scoping
    if (activeTab === 'cookbook') {
      // If user is logged in, show their recipes OR initial curated heirloom ones
      if (currentUser) {
        return recipe.authorId === currentUser.uid || recipe.authorEmail === currentUser.email;
      }
      return true; // Show all if guest
    }

    if (activeTab === 'shared-with-me') {
      if (!currentUser?.email) return false;
      return (recipe.sharedWithEmails || []).includes(currentUser.email.toLowerCase());
    }

    // explore tab shows all public recipes
    return recipe.isPublic;
  });

  const categories = ['All', 'Heirloom Classics', 'Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snacks', 'Festive'];

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col antialiased selection:bg-neutral-200">
      
      {/* Top Banner Notice */}
      {statusNotification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg border flex items-center gap-2 text-xs sm:text-sm font-medium transition-all ${
          statusNotification.type === 'success' 
            ? 'bg-neutral-900 text-white border-neutral-800' 
            : statusNotification.type === 'error'
            ? 'bg-red-900 text-white border-red-800'
            : 'bg-neutral-800 text-white border-neutral-700'
        }`}>
          {statusNotification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <Info className="w-4 h-4 text-neutral-300" />
          )}
          <span>{statusNotification.message}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenCreate={() => setIsCreateModalOpen(true)}
        isSyncingDrive={isSyncingDrive}
        onSyncDrive={handleFullDriveSync}
        hasDriveAccess={hasDriveToken}
      />

      {/* Hero Welcome Banner */}
      <section className="bg-white border-b border-neutral-200/70 pt-8 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
                <span>Heirloom Recipes</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900">
                Heritage &amp; Heart
              </h1>
              <p className="mt-2 text-sm sm:text-base text-neutral-600 max-w-2xl leading-relaxed">
                Preserve treasured family recipes, handwritten memories, and grandmother's culinary wisdom. 
                Seamlessly backed up in your personal Google Drive and updated live in real time.
              </p>
            </div>

            {/* Quick Summary Pill / Drive Callout */}
            <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 shadow-2xs flex items-center gap-3.5 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-neutral-200/70 text-neutral-800 flex items-center justify-center">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-900">
                  {currentUser ? (hasDriveToken ? 'Google Drive Connected' : 'Google Signed In') : 'Sync with Google Drive'}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {currentUser ? (hasDriveToken ? 'Recipes backed to Drive' : 'Click to enable Drive backup') : 'Sign in to save recipes to your Drive'}
                </p>
                {!currentUser ? (
                  <button
                    onClick={handleSignIn}
                    className="mt-1 text-xs text-neutral-900 font-semibold hover:underline"
                  >
                    Connect Account →
                  </button>
                ) : (
                  <button
                    onClick={handleFullDriveSync}
                    disabled={isSyncingDrive}
                    className="mt-1 text-xs text-neutral-900 font-semibold hover:underline flex items-center gap-1"
                  >
                    {isSyncingDrive ? 'Syncing...' : 'Sync Vault Now ↻'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-white border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full pb-24">
        
        {/* Tab Header & Count */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
              {activeTab === 'cookbook' && 'My Recipes'}
              {activeTab === 'explore' && 'Explore Recipes'}
              {activeTab === 'shared-with-me' && 'Recipes Shared with You'}
              <span className="text-xs font-normal text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                {filteredRecipes.length} recipes
              </span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {activeTab === 'cookbook' && 'Your personal collection'}
              {activeTab === 'explore' && 'Authentic traditional recipes shared by passionate home chefs'}
              {activeTab === 'shared-with-me' && 'Recipes family & friends directly invited you to view'}
            </p>
          </div>
        </div>

        {/* Recipe Cards Grid */}
        {filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                currentUserId={currentUser?.uid}
                onSelect={(r) => setSelectedRecipe(r)}
                onShare={(r, e) => {
                  e.stopPropagation();
                  setSharingRecipe(r);
                }}
                onFork={(r, e) => handleForkRecipe(r, e)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center max-w-md mx-auto my-12 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-800 mx-auto flex items-center justify-center mb-4">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">
              No recipes found
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5 leading-relaxed">
              {activeTab === 'shared-with-me'
                ? 'No recipes have been directly shared with your email yet. Ask friends or family to share a link with you!'
                : 'Start documenting your personal collection with family recipes, ingredients, and steps.'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recipe</span>
            </button>
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) for Adding Recipe */}
      <button
        id="fab-add-recipe"
        onClick={() => setIsCreateModalOpen(true)}
        aria-label="Add Recipe"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3.5 sm:px-5 sm:py-3.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 group"
      >
        <Plus className="w-5 h-5 transition-transform duration-200 group-hover:rotate-90" />
        <span className="text-xs sm:text-sm font-medium tracking-wide">Add Recipe</span>
      </button>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2 font-medium text-neutral-700">
            <span>Heritage &amp; Heart</span>
            <span>•</span>
            <span className="text-neutral-500 font-normal">Cookbook</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Google Drive Storage &amp; Cloud Synchronization.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onFork={(r) => handleForkRecipe(r)}
        onShare={(r) => setSharingRecipe(r)}
        onDelete={(id) => handleDeleteRecipe(id)}
        onSaveToDrive={(r) => handleSaveToDrive(r)}
        isSavingToDrive={isSyncingDrive}
        currentUserId={currentUser?.uid}
        hasDriveAccess={hasDriveToken}
      />

      <ShareModal
        recipe={sharingRecipe}
        onClose={() => setSharingRecipe(null)}
        onUpdateShare={handleUpdateShare}
      />

      <RecipeFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSaveRecipe}
        currentUser={currentUser}
        hasDriveAccess={hasDriveToken}
      />

      {/* Mandatory sign in / sign up modal */}
      <LoginPromptModal
        isOpen={!isAuthLoading && !currentUser}
        onSignIn={handleSignIn}
      />

    </div>
  );
}
