import React from 'react';

interface EditorToolbarProps {
  activeTab: 'metadata' | 'content' | 'images' | 'heroImagePrompt' | 'inBlogImagePrompt';
  onTabChange: (tab: 'metadata' | 'content' | 'images' | 'heroImagePrompt' | 'inBlogImagePrompt') => void;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTab,
  onTabChange,
  isPreviewMode,
  onTogglePreview,
}) => {
  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col md:flex-row md:justify-between">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => onTabChange('content')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'content'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => onTabChange('metadata')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'metadata'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Metadata
          </button>
          <button
            onClick={() => onTabChange('images')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'images'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Images
          </button>
          <button
            onClick={() => onTabChange('heroImagePrompt')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'heroImagePrompt'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            HeroImagePrompt
          </button>
          <button
            onClick={() => onTabChange('inBlogImagePrompt')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px ${
              activeTab === 'inBlogImagePrompt'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 dark:border-primary-500'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            InBlogImagePrompt
          </button>
        </div>
        
        {activeTab === 'content' && (
          <div className="flex border-t md:border-t-0 dark:border-gray-700 pt-2 md:pt-0">
            <button
              onClick={onTogglePreview}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                isPreviewMode
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isPreviewMode ? 'Editing' : 'Preview'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorToolbar;
