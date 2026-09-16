import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  ChefHat
} from 'lucide-react';
import { Recipe, RecipeIngredient, RecipeStep } from '../types';
import { User } from 'firebase/auth';

interface RecipeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
  currentUser: User | null;
  hasDriveAccess: boolean;
  initialRecipe?: Recipe | null;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  initialRecipe,
}) => {
  // Form states
  const [title, setTitle] = useState('');
  const [kannadaTitle, setKannadaTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Recipe['category']>('Heirloom Classics');
  const [cuisine, setCuisine] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>('');
  const [cookTimeMinutes, setCookTimeMinutes] = useState<string>('');
  const [servings, setServings] = useState<string>('');
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>('Intermediate');
  const [storyOrOrigin, setStoryOrOrigin] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [grandmaSecrets, setGrandmaSecrets] = useState<string[]>(['']);

  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { id: '1', name: '', amount: '', unit: '', notes: '' },
  ]);

  const [steps, setSteps] = useState<RecipeStep[]>([
    { id: '1', stepNumber: 1, instruction: '', tip: '' },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (initialRecipe) {
      setTitle(initialRecipe.title || '');
      setKannadaTitle(initialRecipe.kannadaTitle || '');
      setDescription(initialRecipe.description || '');
      setCategory(initialRecipe.category || 'Heirloom Classics');
      setCuisine(initialRecipe.cuisine || '');
      setPrepTimeMinutes(initialRecipe.prepTimeMinutes ? String(initialRecipe.prepTimeMinutes) : '');
      setCookTimeMinutes(initialRecipe.cookTimeMinutes ? String(initialRecipe.cookTimeMinutes) : '');
      setServings(initialRecipe.servings ? String(initialRecipe.servings) : '');
      setDifficulty(initialRecipe.difficulty || 'Intermediate');
      setStoryOrOrigin(initialRecipe.storyOrOrigin || '');
      setImageUrl(initialRecipe.imageUrl || '');
      setGrandmaSecrets(initialRecipe.grandmasSecrets?.length ? initialRecipe.grandmasSecrets : ['']);
      setIngredients(
        initialRecipe.ingredients?.length
          ? initialRecipe.ingredients
          : [{ id: '1', name: '', amount: '', unit: '', notes: '' }]
      );
      setSteps(
        initialRecipe.steps?.length
          ? initialRecipe.steps
          : [{ id: '1', stepNumber: 1, instruction: '', tip: '' }]
      );
    } else {
      setTitle('');
      setKannadaTitle('');
      setDescription('');
      setCategory('Heirloom Classics');
      setCuisine('');
      setPrepTimeMinutes('');
      setCookTimeMinutes('');
      setServings('');
      setDifficulty('Intermediate');
      setStoryOrOrigin('');
      setImageUrl('');
      setGrandmaSecrets(['']);
      setIngredients([{ id: '1', name: '', amount: '', unit: '', notes: '' }]);
      setSteps([{ id: '1', stepNumber: 1, instruction: '', tip: '' }]);
    }
  }, [isOpen, initialRecipe]);

  if (!isOpen) return null;

  // Ingredient Helpers
  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '', unit: '', notes: '' }
    ]);
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: string) => {
    setIngredients(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ id: '1', name: '', amount: '', unit: '', notes: '' }]));
  };

  // Step Helpers
  const addStep = () => {
    setSteps(prev => [
      ...prev,
      { id: Date.now().toString(), stepNumber: prev.length + 1, instruction: '', tip: '' }
    ]);
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: any) => {
    setSteps(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const removeStep = (index: number) => {
    setSteps(prev => {
      if (prev.length <= 1) {
        return [{ id: '1', stepNumber: 1, instruction: '', tip: '' }];
      }
      const copy = prev.filter((_, i) => i !== index);
      return copy.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    });
  };

  // Grandma Secret Helpers
  const addSecret = () => setGrandmaSecrets(prev => [...prev, '']);
  const updateSecret = (index: number, val: string) => {
    setGrandmaSecrets(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };
  const removeSecret = (index: number) => {
    setGrandmaSecrets(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validIngredients = ingredients.filter(i => i.name.trim().length > 0);
    const validSteps = steps.filter(s => s.instruction.trim().length > 0);
    const validSecrets = grandmaSecrets.filter(s => s.trim().length > 0);

    const recipeToSave: Recipe = {
      ...(initialRecipe || {}),
      id: initialRecipe ? initialRecipe.id : `recipe-${Date.now()}`,
      title: title.trim(),
      kannadaTitle: kannadaTitle.trim() || undefined,
      description: description.trim() || 'A cherished family recipe.',
      category,
      cuisine: cuisine.trim() || 'Traditional',
      prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : 15,
      cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : 25,
      servings: servings ? Number(servings) : 4,
      difficulty,
      ingredients: validIngredients.length > 0 ? validIngredients : [{ id: '1', name: 'Ingredients as needed', amount: '', unit: '', notes: '' }],
      steps: validSteps.length > 0 ? validSteps : [{ id: '1', stepNumber: 1, instruction: 'Prepare according to tradition.' }],
      storyOrOrigin: storyOrOrigin.trim() || undefined,
      grandmasSecrets: validSecrets,
      tags: initialRecipe?.tags || ['Heirloom', 'Family'],
      imageUrl: imageUrl.trim() || initialRecipe?.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80',
      authorId: initialRecipe ? initialRecipe.authorId : (currentUser?.uid || 'guest-author'),
      authorName: initialRecipe ? initialRecipe.authorName : (currentUser?.displayName || 'Family Chef'),
      authorEmail: initialRecipe ? initialRecipe.authorEmail : (currentUser?.email || 'chef@recipevault.internal'),
      authorPhoto: initialRecipe ? initialRecipe.authorPhoto : (currentUser?.photoURL || undefined),
      createdAt: initialRecipe ? initialRecipe.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: initialRecipe ? initialRecipe.isPublic : true,
      sharedWithEmails: initialRecipe?.sharedWithEmails || [],
      forkCount: initialRecipe?.forkCount || 0,
      driveFileId: initialRecipe?.driveFileId,
      driveWebLink: initialRecipe?.driveWebLink,
      driveSyncedAt: initialRecipe?.driveSyncedAt,
    };

    onSave(recipeToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-neutral-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {initialRecipe ? 'Edit Recipe' : 'New Recipe'}
            </h2>
            <p className="text-xs text-neutral-500">
              {initialRecipe ? 'Update ingredients, methods, and notes' : 'Record ingredients, methods, and family notes'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-neutral-800">
          
          {/* Names & Overview */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Recipe Title <span className="text-neutral-900 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Udupi Rasam"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-hidden font-medium placeholder:text-neutral-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Regional / Traditional Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ಉಡುಪಿ ರಸಂ"
                  value={kannadaTitle}
                  onChange={(e) => setKannadaTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe the flavor profile, aroma, or heritage..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Category, Cuisine, Times */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-100">
            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900"
              >
                <option value="Heirloom Classics">Heirloom Classics</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Dessert">Dessert</option>
                <option value="Snacks">Snacks</option>
                <option value="Festive">Festive</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Cuisine / Region</label>
              <input
                type="text"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. South Indian"
                className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900 placeholder:text-neutral-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Prep Time (mins)</label>
              <input
                type="number"
                min="0"
                placeholder="20"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900 placeholder:text-neutral-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-600 mb-1">Cook Time (mins)</label>
              <input
                type="number"
                min="0"
                placeholder="30"
                value={cookTimeMinutes}
                onChange={(e) => setCookTimeMinutes(e.target.value)}
                className="w-full px-2 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-hidden focus:border-neutral-900 placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Heirloom Story / Memory */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Origin &amp; Family Notes
            </label>
            <textarea
              rows={2}
              placeholder="Who handed down this recipe? Any special occasions it was made for?..."
              value={storyOrOrigin}
              onChange={(e) => setStoryOrOrigin(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
            />
          </div>

          {/* Secrets & Hacks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700">
                Special Tips &amp; Secrets
              </label>
              <button
                type="button"
                onClick={addSecret}
                className="text-xs text-neutral-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Tip
              </button>
            </div>
            {grandmaSecrets.map((secret, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Toast spices on a dry skillet before grinding..."
                  value={secret}
                  onChange={(e) => updateSecret(idx, e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                />
                {grandmaSecrets.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSecret(idx)}
                    className="p-1.5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700">
                Ingredients
              </label>
              <button
                type="button"
                onClick={addIngredient}
                className="text-xs text-neutral-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Ingredient
              </button>
            </div>

            <div className="space-y-2">
              {ingredients.map((ing, idx) => (
                <div key={ing.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ingredient name (e.g. Basmati Rice)"
                    value={ing.name}
                    onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                    className="flex-3 px-3 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Amt (e.g. 1)"
                    value={ing.amount}
                    onChange={(e) => updateIngredient(idx, 'amount', e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g. cup)"
                    value={ing.unit}
                    onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                    className="flex-1 px-2 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                  />
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700">
                Instructions
              </label>
              <button
                type="button"
                onClick={addStep}
                className="text-xs text-neutral-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, idx) => (
                <div key={step.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-700">Step {step.stepNumber}</span>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="text-neutral-400 hover:text-neutral-700 text-xs cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Describe this step in detail..."
                    value={step.instruction}
                    onChange={(e) => updateStep(idx, 'instruction', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
                  />
                  <input
                    type="text"
                    placeholder="Optional tip for this step..."
                    value={step.tip || ''}
                    onChange={(e) => updateStep(idx, 'tip', e.target.value)}
                    className="w-full px-3 py-1 bg-white border border-neutral-200 rounded-lg text-[11px] text-neutral-700 placeholder:text-neutral-400 outline-hidden"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:bg-white focus:border-neutral-900 outline-hidden placeholder:text-neutral-400"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <ChefHat className="w-4 h-4" />
              <span>Save Recipe</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
