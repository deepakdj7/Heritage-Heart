import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from './firebase';
import { Recipe } from '../types';
import { INITIAL_HEIRLOOM_RECIPES } from '../data/initialRecipes';

const RECIPES_COLLECTION = 'heritage_recipes';

/**
 * Subscribes in real-time to the entire cookbook collection.
 * Falls back safely to local storage or heirloom defaults if Firestore is not provisioned or offline.
 */
export function subscribeToRealtimeRecipes(
  onUpdate: (recipes: Recipe[]) => void,
  onError?: (err: any) => void
): () => void {
  try {
    const recipesRef = collection(db, RECIPES_COLLECTION);
    const q = query(recipesRef, orderBy('createdAt', 'desc'));

    // Clean up starter and seed recipes from Firestore if present
    const seedIds = [
      'bisi-bele-bath-traditional', 'akki-roti-davangere', 'mysore-pak-soft-melt', 'maddur-vada-crisp',
      'seed-kajjayya-001', 'seed-masala-puri-002', 'seed-7-cup-burfi-003', 'seed-chammanthi-004',
      'seed-akki-rotti-005', 'seed-kempu-chutney-006', 'seed-maavinkai-appe-huli-007', 'seed-kodbale-008',
      'seed-shankarapali-009', 'seed-lemon-pickle-010'
    ];
    seedIds.forEach((id) => {
      deleteDoc(doc(db, RECIPES_COLLECTION, id)).catch(() => {});
    });

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          localStorage.removeItem('heritage_recipes_backup');
          onUpdate([]);
        } else {
          const list: Recipe[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Recipe;
            if (!seedIds.includes(docSnap.id) && !docSnap.id.startsWith('seed-')) {
              list.push({ id: docSnap.id, ...data });
            }
          });
          localStorage.setItem('heritage_recipes_backup', JSON.stringify(list));
          onUpdate(list);
        }
      },
      (error) => {
        console.warn('Firestore subscription fallback:', error);
        if (onError) onError(error);
        const localStored = localStorage.getItem('heritage_recipes_backup');
        if (localStored) {
          try {
            const parsed = JSON.parse(localStored);
            const userRecipes = parsed.filter(
              (r: Recipe) => !seedIds.includes(r.id) && !r.id.startsWith('seed-')
            );
            onUpdate(userRecipes);
            return;
          } catch (e) {}
        }
        onUpdate([]);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.error('Real-time setup error:', err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Saves or updates a recipe in Firestore real-time collection.
 */
export async function saveRecipeRealtime(recipe: Recipe): Promise<void> {
  try {
    const docRef = doc(db, RECIPES_COLLECTION, recipe.id);
    await setDoc(docRef, recipe, { merge: true });
  } catch (e) {
    console.warn('Firestore write warning, persisting locally:', e);
    // Local persistence fallback
    const current = JSON.parse(localStorage.getItem('heritage_recipes_backup') || '[]');
    const index = current.findIndex((r: Recipe) => r.id === recipe.id);
    if (index >= 0) {
      current[index] = recipe;
    } else {
      current.unshift(recipe);
    }
    localStorage.setItem('heritage_recipes_backup', JSON.stringify(current));
  }
}

/**
 * Deletes a recipe from Firestore real-time collection.
 */
export async function deleteRecipeRealtime(recipeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, RECIPES_COLLECTION, recipeId));
  } catch (e) {
    console.warn('Firestore delete error, removing from local backup:', e);
  }
  const current = JSON.parse(localStorage.getItem('heritage_recipes_backup') || '[]');
  const filtered = current.filter((r: Recipe) => r.id !== recipeId);
  localStorage.setItem('heritage_recipes_backup', JSON.stringify(filtered));
}

/**
 * Clones / Forks an existing shared recipe into the active user's personal collection.
 */
export async function forkRecipeToUser(
  sourceRecipe: Recipe,
  newUser: { uid: string; displayName: string; email?: string; photoURL?: string }
): Promise<Recipe> {
  const newId = `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const clonedRecipe: Recipe = {
    ...sourceRecipe,
    id: newId,
    title: `${sourceRecipe.title} (My Family Edition)`,
    authorId: newUser.uid,
    authorName: newUser.displayName || 'Home Chef',
    authorEmail: newUser.email || '',
    authorPhoto: newUser.photoURL || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    forkedFromId: sourceRecipe.id,
    forkedFromAuthor: sourceRecipe.authorName,
    driveFileId: undefined, // Fresh copy to be saved to user's own Drive
    driveSyncedAt: undefined,
    driveWebLink: undefined,
    forkCount: 0,
    isPublic: false,
    sharedWithEmails: [],
  };

  await saveRecipeRealtime(clonedRecipe);

  // Increment fork counter on original recipe
  try {
    const originalRef = doc(db, RECIPES_COLLECTION, sourceRecipe.id);
    await updateDoc(originalRef, { forkCount: increment(1) });
  } catch (e) {
    console.warn('Could not increment fork count:', e);
  }

  return clonedRecipe;
}
