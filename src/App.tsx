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
import { 
  auth, 
  signInWithGoogleOAuth, 
  logOut, 
  getStoredDriveAccessToken,
  isDriveTokenFresh,
  checkAndEnforceSessionExpiry,
  getCachedUser
} from './lib/firebase';
import { 
  subscribeToRealtimeRecipes, 
  saveRecipeRealtime, 
  deleteRecipeRealtime, 
  forkRecipeToUser,
  getCachedRecipes
} from './lib/recipeStore';
import { saveRecipeToGoogleDrive, loadRecipesFromGoogleDrive } from './lib/drive';
import { Recipe, ActiveTab } from './types';
import { Header } from './components/Header';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { ShareModal } from './components/ShareModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { LoginPromptModal } from './components/LoginPromptModal';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any | null>(() => getCachedUser());
  const [hasDriveToken, setHasDriveToken] = useState<boolean>(
    () => !!localStorage.getItem('google_drive_access_token') || !!localStorage.getItem('google_drive_connected')
  );
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(
    () => localStorage.getItem('heritage_heart_guest_mode') === 'true'
  );
  const [recipes, setRecipes] = useState<Recipe[]>(() => getCachedRecipes());
  const [activeTab, setActiveTab] = useState<ActiveTab>('cookbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Modals & Selected Recipe States
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [sharingRecipe, setSharingRecipe] = useState<Recipe | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  
  // Status feedback
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Synchronous ref to prevent stale closures during async sync operations
  const recipesRef = React.useRef<Recipe[]>(recipes);
  useEffect(() => {
    recipesRef.current = recipes;
  }, [recipes]);

  const autoSyncedRef = React.useRef(false);

  const showNotice = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setStatusNotification({ message, type });
    setTimeout(() => setStatusNotification(null), 4500);
  };

  // 1. Auth Listener: 4-month continuous login session & quiet background Drive sync
  useEffect(() => {
    // Enforce 4-month (120-day) session window
    const sessionActive = checkAndEnforceSessionExpiry();
    if (!sessionActive) {
      setCurrentUser(null);
      setHasDriveToken(false);
      setIsAuthLoading(false);
      showNotice('Your 4-month session has concluded. Please sign in to reconnect.', 'info');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsAuthLoading(false);

      if (user) {
        setCurrentUser(user);
        setHasDriveToken(true);
        setIsGuestMode(false);
        localStorage.removeItem('heritage_heart_guest_mode');

        // Record session start timestamp if not already tracked
        if (!localStorage.getItem('auth_session_started_at')) {
          localStorage.setItem('auth_session_started_at', Date.now().toString());
        }

        // Auto-sync in background on open once silently
        if (!autoSyncedRef.current) {
          autoSyncedRef.current = true;
          handleFullDriveSync(user, false /* isManual = false: silent on load */);
        }
      } else {
        // If not in Firebase memory, check cached local session before clearing
        const cached = getCachedUser();
        if (cached) {
          setCurrentUser(cached);
          setHasDriveToken(true);
        } else {
          setCurrentUser(null);
          setHasDriveToken(false);
        }
      }
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

  // Handler: Google Sign-in with Drive Scope & Immediate Auto-Sync
  const handleSignIn = async () => {
    try {
      setIsSyncingDrive(true);
      const res = await signInWithGoogleOAuth();
      setCurrentUser(res.user);
      setHasDriveToken(true);
      setIsGuestMode(false);
      localStorage.removeItem('heritage_heart_guest_mode');
      showNotice(`Signed in as ${res.user.displayName || res.user.email}. Remembered for 4 months!`, 'success');
      // Quiet background Drive sync on login
      await handleFullDriveSync(res.user, false);
    } catch (err: any) {
      console.error(err);
      showNotice(err.message || 'Authentication failed', 'error');
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleSignOut = async () => {
    await logOut();
    setCurrentUser(null);
    setHasDriveToken(false);
    autoSyncedRef.current = false;
    setIsGuestMode(true);
    localStorage.setItem('heritage_heart_guest_mode', 'true');
    showNotice('Signed out successfully. Recipes remain preserved on this device.', 'info');
  };

  // Handler: Save / Create / Edit Recipe
  const handleSaveRecipe = async (recipe: Recipe) => {
    const isEdit = !!editingRecipe;
    await saveRecipeRealtime(recipe);
    showNotice(isEdit ? `"${recipe.title}" updated!` : `"${recipe.title}" added to your heirloom cookbook!`, 'success');

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
    setEditingRecipe(null);
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
  const handleFullDriveSync = async (providedUser?: User | null, isManual: boolean = true) => {
    const activeUser = providedUser !== undefined ? providedUser : currentUser;
    const token = getStoredDriveAccessToken();
    const isFresh = isDriveTokenFresh();

    // If manual sync requested and token is missing or expired, prompt re-authentication
    if (!token || !isFresh) {
      if (isManual) {
        showNotice('Reconnecting with Google Drive to refresh session...', 'info');
        await handleSignIn();
        return;
      } else {
        // Automatic background sync should gracefully degrade if Drive token expired
        setHasDriveToken(false);
        return;
      }
    }

    try {
      setIsSyncingDrive(true);
      if (isManual) {
        showNotice('Syncing recipes with your Google Drive folder...', 'info');
      }

      // 1. Fetch any recipes existing in Google Drive FIRST
      const driveFiles = await loadRecipesFromGoogleDrive(
        activeUser?.uid,
        activeUser?.email || undefined
      );

      if (driveFiles.length > 0) {
        // Instantly update state so user sees all recipes without delay
        setRecipes((prev) => {
          const map = new Map<string, Recipe>();
          prev.forEach((r) => map.set(r.id, r));
          driveFiles.forEach((r) => map.set(r.id, r));
          return Array.from(map.values());
        });

        // Persist all loaded recipes to Firestore and local backup
        for (const dRecipe of driveFiles) {
          await saveRecipeRealtime(dRecipe);
        }
      }

      // 2. Upload un-synced user recipes to Google Drive
      const currentRecipes = recipesRef.current;
      const userRecipes = currentRecipes.filter(
        (r) => !activeUser || r.authorId === activeUser.uid || r.authorId === 'family-vault'
      );
      for (const recipe of userRecipes) {
        if (!recipe.driveFileId) {
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
      }

      setHasDriveToken(true);
      if (isManual) {
        if (driveFiles.length > 0) {
          showNotice(`Google Drive synced: loaded ${driveFiles.length} recipes from your Drive!`, 'success');
        } else {
          showNotice('Google Drive synced. All recipes are up to date.', 'success');
        }
      }
    } catch (err: any) {
      console.error('Full drive sync failure:', err);
      if (
        err.message && 
        (err.message.includes('AUTH_TOKEN_EXPIRED') || 
         err.message.includes('403') || 
         err.message.includes('insufficient') || 
         err.message.includes('PERMISSION_DENIED') || 
         err.message.includes('401'))
      ) {
        setHasDriveToken(false);
        if (isManual) {
          showNotice('Google Drive connection expired. Click Reconnect Drive in your profile to renew.', 'info');
        }
      } else {
        if (isManual) {
          showNotice(`Drive Sync: ${err.message}`, 'error');
        }
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
      // If user is logged in, show their recipes, curated heirloom recipes, and any recipes from Google Drive
      if (currentUser) {
        return (
          recipe.authorId === currentUser.uid ||
          recipe.authorEmail === currentUser.email ||
          recipe.authorId === 'family-vault' ||
          recipe.authorId === 'heirloom-vault' ||
          !!recipe.driveFileId
        );
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
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
              <span>Heirloom Recipes</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-neutral-900">
              Heritage &amp; Heart
            </h1>
            <p className="mt-1 text-xs text-neutral-500 max-w-xl leading-relaxed">
              Preserve heirloom family recipes, handwritten memories, and culinary wisdom. Backed up in your personal Google Drive.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-7 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
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
        
        {/* Drive Syncing Live Indicator */}
        {isSyncingDrive && (
          <div className="mb-5 bg-amber-50/90 border border-amber-200/80 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="font-semibold">Syncing recipes with Google Drive...</span>
              <span className="hidden sm:inline text-amber-700">Checking your cookbook folder and Drive files</span>
            </div>
            <span className="text-[11px] font-medium text-amber-600 bg-amber-100/60 px-2 py-0.5 rounded-md">Live Sync</span>
          </div>
        )}

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
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 sm:p-10 text-center max-w-md mx-auto my-12 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-800 mx-auto flex items-center justify-center mb-4">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900">
              No recipes found
            </h3>
            <p className="text-xs text-neutral-500 mt-1 mb-5 leading-relaxed">
              {activeTab === 'shared-with-me'
                ? 'No recipes have been directly shared with your email yet. Ask friends or family to share a link with you!'
                : searchQuery || selectedCategory !== 'All'
                ? 'No recipes matched your search or category filter. Try clearing filters or syncing with Google Drive.'
                : 'Your collection is ready for recipes. Sync with Google Drive to pull your recipe files or add your first heirloom recipe.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => handleFullDriveSync()}
                disabled={isSyncingDrive}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDrive ? 'animate-spin' : ''}`} />
                <span>{isSyncingDrive ? 'Syncing Drive...' : 'Sync with Google Drive'}</span>
              </button>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  <span>Clear Filters</span>
                </button>
              )}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Recipe</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Floating Action Button (FAB) for Adding Recipe */}
      <button
        id="fab-add-recipe"
        onClick={() => {
          setEditingRecipe(null);
          setIsCreateModalOpen(true);
        }}
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
            <span className="text-neutral-500 font-normal">Created with ❤️ by Deepak DJ</span>
          </div>
          <p className="text-[11px] text-neutral-400">
            GDrive Storage &amp; Sync
          </p>
        </div>
      </footer>

      {/* Modals */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        onClose={() => setSelectedRecipe(null)}
        onEdit={(r) => {
          setEditingRecipe(r);
          setSelectedRecipe(null);
          setIsCreateModalOpen(true);
        }}
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
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingRecipe(null);
        }}
        onSave={handleSaveRecipe}
        currentUser={currentUser}
        hasDriveAccess={hasDriveToken}
        initialRecipe={editingRecipe}
      />

      {/* Sign in / sign up modal (remembers login for 4 months, with guest browsing option) */}
      <LoginPromptModal
        isOpen={!isAuthLoading && !currentUser && !isGuestMode}
        onSignIn={handleSignIn}
        onClose={() => {
          setIsGuestMode(true);
          localStorage.setItem('heritage_heart_guest_mode', 'true');
        }}
      />

      {/* Offline Status Toast Indicator */}
      <OfflineIndicator />

    </div>
  );
}
