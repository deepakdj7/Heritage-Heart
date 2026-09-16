import React, { useState } from 'react';
import { X, Download, FileJson, Check, Copy } from 'lucide-react';

interface RecipeFileItem {
  filename: string;
  title: string;
  category: string;
  url: string;
}

const RECIPE_FILES: RecipeFileItem[] = [
  { filename: 'Kajjayya.recipe.json', title: 'Kajjayya', category: 'Dessert', url: './recipes/kajjayya.recipe.json' },
  { filename: 'Masala-Puri.recipe.json', title: 'Masala Puri', category: 'Snacks', url: './recipes/masala-puri.recipe.json' },
  { filename: '7-Cup-Burfi.recipe.json', title: 'Burfi - 7 cups', category: 'Dessert', url: './recipes/7-cup-burfi.recipe.json' },
  { filename: 'Chammanthi.recipe.json', title: 'Chammanthi', category: 'Breakfast', url: './recipes/chammanthi.recipe.json' },
  { filename: 'Akki-Rotti.recipe.json', title: 'Akki Rotti - Thottaratti', category: 'Breakfast', url: './recipes/akki-rotti.recipe.json' },
  { filename: 'Kempu-Chutney.recipe.json', title: 'Kempu Chutney', category: 'Breakfast', url: './recipes/kempu-chutney.recipe.json' },
  { filename: 'Maavinkai-Appe-Huli.recipe.json', title: 'Maavinkai Appe Huli', category: 'Heirloom Classics', url: './recipes/maavinkai-appe-huli.recipe.json' },
  { filename: 'Kodbale.recipe.json', title: 'Kodbale', category: 'Snacks', url: './recipes/kodbale.recipe.json' },
  { filename: 'Shankarapali.recipe.json', title: 'Shankarapali', category: 'Snacks', url: './recipes/shankarapali.recipe.json' },
  { filename: 'Lemon-Pickle.recipe.json', title: 'Lemon Pickle', category: 'Heirloom Classics', url: './recipes/lemon-pickle.recipe.json' },
];

interface DownloadRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloadRecipesModal: React.FC<DownloadRecipesModalProps> = ({ isOpen, onClose }) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadFile = async (item: RecipeFileItem) => {
    try {
      setDownloading(item.filename);
      const res = await fetch(item.url);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setTimeout(() => setDownloading(null), 600);
    }
  };

  const copyJson = async (item: RecipeFileItem) => {
    try {
      const res = await fetch(item.url);
      const data = await res.text();
      await navigator.clipboard.writeText(data);
      setCopiedId(item.filename);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Copy error:', e);
    }
  };

  const downloadAll = async () => {
    for (const item of RECIPE_FILES) {
      await downloadFile(item);
      // Small pause between downloads to avoid browser block
      await new Promise(r => setTimeout(r, 200));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-neutral-200">
        
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">Download Recipe JSONs</h2>
              <p className="text-xs text-neutral-500">Save to your Google Drive "Heritage &amp; Heart Recipes" folder</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="px-5 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-3 text-xs text-neutral-600">
          <span>10 heirloom recipes formatted for Heritage &amp; Heart</span>
          <button
            onClick={downloadAll}
            className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            Download All (10)
          </button>
        </div>

        {/* Recipe List */}
        <div className="p-5 overflow-y-auto divide-y divide-neutral-100 space-y-2">
          {RECIPE_FILES.map((file) => (
            <div
              key={file.filename}
              className="pt-2 pb-2 flex items-center justify-between gap-3 hover:bg-neutral-50 px-2 rounded-xl transition-colors"
            >
              <div className="min-w-0 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-medium text-neutral-900 truncate">{file.title}</p>
                  <p className="text-[11px] text-neutral-400 font-mono">{file.filename}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyJson(file)}
                  className="px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy JSON to clipboard"
                >
                  {copiedId === file.filename ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => downloadFile(file)}
                  disabled={downloading === file.filename}
                  className="px-3 py-1.5 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloading === file.filename ? 'Saving...' : 'Download'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
          <p>
            Drop these files into your <strong>Heritage &amp; Heart Recipes</strong> folder in Google Drive, then hit <strong>Sync now</strong>.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100 rounded-lg text-xs font-medium cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
