export interface RecipeIngredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  notes?: string;
}

export interface RecipeStep {
  id: string;
  stepNumber: number;
  instruction: string;
  durationMinutes?: number;
  tip?: string;
}

export interface RecipeNutritionalEstimate {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
}

export interface Recipe {
  id: string;
  title: string;
  kannadaTitle?: string; // Regional heritage touch (traditional regional naming)
  description: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Dessert' | 'Snacks' | 'Beverages' | 'Heirloom Classics' | 'Festive';
  cuisine: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: 'Easy' | 'Intermediate' | 'Traditional Expert';
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  storyOrOrigin?: string; // The "Heart" of the heirloom heritage recipe
  grandmasSecrets?: string[]; // Heirloom cooking tips & hacks passed down
  tags: string[];
  imageUrl?: string;
  
  // Storage & Author Details
  authorId: string;
  authorName: string;
  authorEmail?: string;
  authorPhoto?: string;
  createdAt: string;
  updatedAt: string;

  // Google Drive & Sync Metadata
  driveFileId?: string;
  driveSyncedAt?: string;
  driveWebLink?: string;
  
  // Sharing & Collaboration
  isPublic: boolean;
  sharedWithEmails: string[];
  forkedFromId?: string;
  forkedFromAuthor?: string;
  forkCount?: number;
}

export interface DriveSyncStatus {
  isConfigured: boolean;
  isSignedIn: boolean;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  syncInProgress: boolean;
  lastSynced?: string;
  error?: string | null;
}

export type ActiveTab = 'cookbook' | 'explore' | 'favorites' | 'shared-with-me' | 'create-recipe' | 'drive-status';
