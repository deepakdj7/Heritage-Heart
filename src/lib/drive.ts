import { Recipe } from '../types';
import { getStoredDriveAccessToken } from './firebase';

const DRIVE_FOLDER_NAME = 'Heritage & Heart Recipes';

/**
 * Ensures the dedicated "Heritage & Heart Recipes" folder exists in the user's Google Drive.
 * Searches flexibly for any existing folder named "Heritage & Heart", "Heritage and Heart", etc.
 */
export async function getOrCreateCookbookFolder(accessToken: string): Promise<string> {
  // 1. Search for existing folder with flexible search
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name = '${DRIVE_FOLDER_NAME}' or name contains 'Heritage & Heart' or name contains 'Heritage and Heart')`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id, name, createdTime)&orderBy=createdTime`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // 2. Create the folder if not found
  const createFolderUrl = 'https://www.googleapis.com/drive/v3/files';
  const meta = {
    name: DRIVE_FOLDER_NAME,
    mimeType: 'application/vnd.google-apps.folder',
    description: 'Heritage & Heart Heirloom recipes and cookbook vault with kitchen secrets.',
  };

  const createRes = await fetch(createFolderUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meta),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (createRes.status === 401 || createRes.status === 403) {
      localStorage.removeItem('google_drive_access_token');
      localStorage.removeItem('google_drive_token_timestamp');
    }
    throw new Error(`Failed to create Google Drive cookbook folder: ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Saves or updates a recipe as a structured JSON file inside the user's Google Drive folder.
 */
export async function saveRecipeToGoogleDrive(recipe: Recipe): Promise<{ fileId: string; webViewLink?: string }> {
  const token = getStoredDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive access token missing. Please sign in with Google to enable Drive backup.');
  }

  const folderId = await getOrCreateCookbookFolder(token);

  const fileMetadata = {
    name: `${recipe.title.replace(/[/\\?%*:|"<>]/g, '-')}.recipe.json`,
    mimeType: 'application/json',
    parents: [folderId],
    description: `Recipe: ${recipe.title} (${recipe.category}) - Saved from Heritage & Heart`,
  };

  const recipePayload = JSON.stringify(recipe, null, 2);

  // If already has driveFileId, update existing file contents
  if (recipe.driveFileId) {
    try {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${recipe.driveFileId}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: recipePayload,
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        return {
          fileId: recipe.driveFileId,
          webViewLink: `https://drive.google.com/file/d/${recipe.driveFileId}/view`,
        };
      }
      // If 404/not found in drive, proceed below to recreate
    } catch (e) {
      console.warn('Existing Drive file update failed, creating anew:', e);
    }
  }

  // Use multipart upload to create file with metadata and contents
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(fileMetadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    recipePayload +
    closeDelimiter;

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errorMsg = await res.text();
    throw new Error(`Failed to upload recipe to Google Drive: ${errorMsg}`);
  }

  const result = await res.json();
  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
  };
}

// Helper to safely normalize recipes loaded from Drive
function normalizeDriveRecipe(
  raw: any, 
  fileId: string, 
  webViewLink: string, 
  currentUserUid?: string, 
  currentUserEmail?: string
): Recipe | null {
  if (!raw || typeof raw !== 'object') return null;

  const title = raw.title || raw.recipeTitle || raw.name || '';
  if (!title) return null;

  // Normalize ingredients: supports string[], RecipeIngredient[], or { item, quantity }
  let ingredients: any[] = [];
  const rawIngs = raw.ingredients || raw.ingredientList || [];
  if (Array.isArray(rawIngs)) {
    ingredients = rawIngs.map((item: any, idx: number) => {
      if (typeof item === 'string') {
        return {
          id: `ing-${idx + 1}`,
          name: item,
          amount: '',
          unit: '',
        };
      }
      return {
        id: item.id || `ing-${idx + 1}`,
        name: item.name || item.item || '',
        amount: item.amount || item.quantity || '',
        unit: item.unit || '',
        notes: item.notes,
      };
    });
  }

  // Normalize steps: supports string[] or RecipeStep[]
  let steps: any[] = [];
  const rawSteps = raw.steps || raw.instructions || raw.method || [];
  if (Array.isArray(rawSteps)) {
    steps = rawSteps.map((step: any, idx: number) => {
      if (typeof step === 'string') {
        return {
          id: `step-${idx + 1}`,
          stepNumber: idx + 1,
          instruction: step,
        };
      }
      return {
        id: step.id || `step-${idx + 1}`,
        stepNumber: step.stepNumber || idx + 1,
        instruction: step.instruction || step.step || step.text || '',
        durationMinutes: step.durationMinutes,
        tip: step.tip,
      };
    });
  }

  // Normalize grandmasSecrets: supports array or string
  let grandmasSecrets: string[] = [];
  if (Array.isArray(raw.grandmasSecrets)) {
    grandmasSecrets = raw.grandmasSecrets;
  } else if (Array.isArray(raw.tips)) {
    grandmasSecrets = raw.tips;
  } else if (typeof raw.tips === 'string') {
    grandmasSecrets = raw.tips.split('\n').map((t: string) => t.trim()).filter(Boolean);
  } else if (typeof raw.grandmasSecrets === 'string') {
    grandmasSecrets = (raw.grandmasSecrets as string).split('\n').map((t: string) => t.trim()).filter(Boolean);
  }

  // Category normalization
  const validCategories = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Snacks', 'Beverages', 'Heirloom Classics', 'Festive'];
  let category = raw.category;
  if (!validCategories.includes(category)) {
    category = 'Heirloom Classics';
  }

  let servings = 4;
  if (typeof raw.servings === 'number') {
    servings = raw.servings;
  } else if (typeof raw.servings === 'string') {
    const matched = raw.servings.match(/\d+/);
    if (matched) servings = parseInt(matched[0], 10);
  } else if (typeof raw.yieldText === 'string') {
    const matched = raw.yieldText.match(/\d+/);
    if (matched) servings = parseInt(matched[0], 10);
  }

  // Tags
  let tags: string[] = ['Heirloom'];
  if (Array.isArray(raw.tags) && raw.tags.length > 0) {
    tags = raw.tags;
  } else if (typeof raw.tags === 'string') {
    tags = raw.tags.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  return {
    id: raw.id || `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title,
    kannadaTitle: raw.kannadaTitle || raw.kannada_title || raw.regionalTitle,
    description: raw.description || 'A cherished family recipe.',
    category: category as any,
    cuisine: raw.cuisine || 'Traditional Indian',
    prepTimeMinutes: typeof raw.prepTimeMinutes === 'number' ? raw.prepTimeMinutes : (typeof raw.prepTime === 'number' ? raw.prepTime : 15),
    cookTimeMinutes: typeof raw.cookTimeMinutes === 'number' ? raw.cookTimeMinutes : (typeof raw.cookTime === 'number' ? raw.cookTime : 30),
    servings,
    difficulty: raw.difficulty || 'Intermediate',
    ingredients: ingredients.length > 0 ? ingredients : [{ id: '1', name: 'Traditional ingredients', amount: '', unit: '' }],
    steps: steps.length > 0 ? steps : [{ id: '1', stepNumber: 1, instruction: 'Prepare according to tradition.' }],
    storyOrOrigin: raw.storyOrOrigin || raw.origin || raw.story,
    grandmasSecrets,
    tags,
    imageUrl: raw.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
    authorId: currentUserUid || raw.authorId || 'family-vault',
    authorName: raw.authorName || 'Family Chef',
    authorEmail: raw.authorEmail || currentUserEmail,
    authorPhoto: raw.authorPhoto,
    createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    isPublic: raw.isPublic ?? true,
    sharedWithEmails: Array.isArray(raw.sharedWithEmails) ? raw.sharedWithEmails : [],
    forkCount: raw.forkCount || 0,
    driveFileId: fileId,
    driveWebLink: webViewLink,
    driveSyncedAt: new Date().toISOString(),
  };
}

/**
 * Loads all recipe JSON files stored in the user's Google Drive.
 * Automatically discovers recipes inside dedicated folders or anywhere in Drive.
 */
export async function loadRecipesFromGoogleDrive(currentUserUid?: string, currentUserEmail?: string): Promise<Recipe[]> {
  const token = getStoredDriveAccessToken();
  if (!token) return [];

  try {
    const filesToFetch = new Map<string, { id: string; name: string; webViewLink?: string }>();

    // 1. Check for any folders named "Heritage", "Recipes", or "Cookbook"
    try {
      const folderQuery = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and trashed = false and (name contains 'Heritage' or name contains 'Recipes' or name contains 'Cookbook' or name contains 'recipe')`);
      const folderUrl = `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&spaces=drive&fields=files(id, name)`;
      const folderRes = await fetch(folderUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (folderRes.ok) {
        const folderData = await folderRes.json();
        const folders = folderData.files || [];
        for (const f of folders) {
          try {
            // Find all json files inside each matching folder
            const inFolderQuery = encodeURIComponent(`'${f.id}' in parents and trashed = false and (name contains '.json' or mimeType = 'application/json' or mimeType = 'text/plain')`);
            const inFolderUrl = `https://www.googleapis.com/drive/v3/files?q=${inFolderQuery}&spaces=drive&fields=files(id, name, webViewLink)`;
            const inFolderRes = await fetch(inFolderUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (inFolderRes.ok) {
              const inFolderData = await inFolderRes.json();
              (inFolderData.files || []).forEach((file: any) => {
                filesToFetch.set(file.id, file);
              });
            }
          } catch (e) {
            console.warn(`Error listing files in folder ${f.name}:`, e);
          }
        }
      }
    } catch (e) {
      console.warn('Folder scanning warning:', e);
    }

    // 2. Also search Drive directly for any recipe JSON files
    try {
      const directQuery = encodeURIComponent(`trashed = false and (name contains '.recipe.json' or name contains '.recipe' or (name contains '.json' and (name contains 'kajjayya' or name contains 'puri' or name contains 'burfi' or name contains 'chammanthi' or name contains 'rotti' or name contains 'chutney' or name contains 'appe' or name contains 'kodbale' or name contains 'shankarapali' or name contains 'pickle' or name contains 'recipe' or name contains 'heritage')))` );
      const directUrl = `https://www.googleapis.com/drive/v3/files?q=${directQuery}&spaces=drive&fields=files(id, name, webViewLink)`;
      const directRes = await fetch(directUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (directRes.ok) {
        const directData = await directRes.json();
        (directData.files || []).forEach((file: any) => {
          filesToFetch.set(file.id, file);
        });
      }
    } catch (e) {
      console.warn('Direct file scan warning:', e);
    }

    if (filesToFetch.size === 0) {
      console.log('No recipe files discovered in Google Drive.');
      return [];
    }

    const recipes: Recipe[] = [];
    for (const [fileId, file] of filesToFetch.entries()) {
      try {
        const fileContentUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const contentRes = await fetch(fileContentUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (contentRes.ok) {
          const rawText = await contentRes.text();
          // Clean possible BOM or leading/trailing whitespace
          const cleanText = rawText.replace(/^\uFEFF/, '').trim();
          if (!cleanText) continue;

          const parsed = JSON.parse(cleanText);
          const link = file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              const normalized = normalizeDriveRecipe(item, fileId, link, currentUserUid, currentUserEmail);
              if (normalized) recipes.push(normalized);
            }
          } else {
            const normalized = normalizeDriveRecipe(parsed, fileId, link, currentUserUid, currentUserEmail);
            if (normalized) recipes.push(normalized);
          }
        }
      } catch (err) {
        console.error(`Failed to read/parse Drive recipe ${file.name} (${fileId}):`, err);
      }
    }

    return recipes;
  } catch (error) {
    console.error('Error fetching recipes from Google Drive:', error);
    return [];
  }
}
