import { Recipe } from '../types';
import { getStoredDriveAccessToken } from './firebase';

const DRIVE_FOLDER_NAME = 'Heritage & Heart Recipes';

/**
 * Ensures the dedicated "Heritage & Heart Recipes" folder exists in the user's Google Drive.
 */
export async function getOrCreateCookbookFolder(accessToken: string): Promise<string> {
  // 1. Search for existing folder
  // Note: with drive.file scope, searching by name or querying files created by this app
  const query = encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and name = '${DRIVE_FOLDER_NAME}' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id, name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    if (searchRes.status === 401 || searchRes.status === 403) {
      localStorage.removeItem('google_drive_access_token');
      localStorage.removeItem('google_drive_token_timestamp');
    }
    throw new Error(`Failed to query Google Drive folder: ${errText}`);
  }

  const data = await searchRes.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
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

/**
 * Loads all recipe JSON files stored in the user's Google Drive folder.
 */
export async function loadRecipesFromGoogleDrive(): Promise<Recipe[]> {
  const token = getStoredDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateCookbookFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false and name contains '.recipe.json'`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id, name, modifiedTime, webViewLink)`;

    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('google_drive_access_token');
        localStorage.removeItem('google_drive_token_timestamp');
      }
      console.warn('Drive list files error:', await res.text());
      return [];
    }

    const { files } = await res.json();
    if (!files || files.length === 0) return [];

    const recipes: Recipe[] = [];
    for (const file of files) {
      try {
        const fileContentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        const contentRes = await fetch(fileContentUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (contentRes.ok) {
          const raw = await contentRes.json();
          recipes.push({
            ...raw,
            driveFileId: file.id,
            driveWebLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          });
        }
      } catch (err) {
        console.error(`Failed to read Drive recipe ${file.id}:`, err);
      }
    }
    return recipes;
  } catch (error) {
    console.error('Error fetching recipes from Google Drive:', error);
    return [];
  }
}
