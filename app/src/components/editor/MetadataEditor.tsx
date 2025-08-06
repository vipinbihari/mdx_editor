import React, { useState, useEffect } from 'react';
import { BlogPostFrontmatter } from '@/types';
import { formatDateForDisplay, parseDateFromDisplay, isValidDateFormat } from '@/utils/dateUtils';

interface MetadataEditorProps {
  frontmatter: BlogPostFrontmatter;
  onChange: (frontmatter: Partial<BlogPostFrontmatter>) => void;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({
  frontmatter,
  onChange,
}) => {
  const [newTag, setNewTag] = useState('');
  const [dateInput, setDateInput] = useState(formatDateForDisplay(frontmatter.date));
  const [dateError, setDateError] = useState<string | null>(null);
  
  // Update date input when frontmatter changes (e.g., when loading a different post)
  useEffect(() => {
    setDateInput(formatDateForDisplay(frontmatter.date));
    setDateError(null);
  }, [frontmatter.date]);
  
  // Handle basic input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ [name]: value });
  };
  
  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setDateInput(value);
    setDateError(null);
    
    // Only update the frontmatter if the date is complete and valid
    if (value.length === 10 && isValidDateFormat(value)) {
      try {
        const isoDate = parseDateFromDisplay(value);
        onChange({ date: isoDate });
      } catch {
        setDateError('Invalid date format');
      }
    }
  };
  
  // Handle date input blur (when user finishes editing)
  const handleDateBlur = () => {
    if (dateInput && !isValidDateFormat(dateInput)) {
      setDateError('Please use DD/MM/YYYY format');
      // Reset to the original valid date
      setDateInput(formatDateForDisplay(frontmatter.date));
    }
  };
  
  // Add a new tag
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTag.trim()) return;
    
    // Don't add duplicate tags
    if (frontmatter.tags.includes(newTag.trim())) {
      setNewTag('');
      return;
    }
    
    onChange({
      tags: [...frontmatter.tags, newTag.trim()],
    });
    
    setNewTag('');
  };
  
  // Remove a tag
  const handleRemoveTag = (tag: string) => {
    onChange({
      tags: frontmatter.tags.filter((t) => t !== tag),
    });
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Metadata
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title with Featured Checkbox */}
        <div className="md:col-span-2">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="featured"
                checked={frontmatter.featured || false}
                onChange={(e) => onChange({ featured: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-primary-500"
              />
              <label htmlFor="featured" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Featured Post
              </label>
            </div>
          </div>
          <input
            type="text"
            id="title"
            name="title"
            value={frontmatter.title}
            onChange={handleInputChange}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
          />
        </div>
        
        {/* Slug */}
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug
          </label>
          <input
            type="text"
            id="slug"
            name="slug"
            value={frontmatter.slug}
            onChange={handleInputChange}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Used for URL and file naming
          </p>
        </div>
        
        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Publication Date (DD/MM/YYYY)
          </label>
          <input
            type="text"
            id="date"
            name="date"
            value={dateInput}
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            placeholder="DD/MM/YYYY"
            className={`input w-full border rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:outline-none ${
              dateError 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20' 
                : 'border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20'
            }`}
          />
          {dateError ? (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              {dateError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
              Format: DD/MM/YYYY (e.g., 25/12/2023)
            </p>
          )}
        </div>
        
        {/* Author */}
        <div>
          <label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Author
          </label>
          <input
            type="text"
            id="author"
            name="author"
            value={frontmatter.author}
            onChange={handleInputChange}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
          />
        </div>
        
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <input
            type="text"
            id="category"
            name="category"
            value={frontmatter.category}
            onChange={handleInputChange}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
          />
        </div>
        
        {/* Tags */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tags
          </label>
          
          <div className="flex flex-wrap gap-2 mb-3 max-h-36 overflow-y-auto py-2">
            {frontmatter.tags.map((tag) => (
              <div
                key={tag}
                className="bg-primary-100 text-primary-800 dark:bg-primary-900/70 dark:text-primary-300 rounded-full px-3 py-1 text-sm flex items-center shadow-sm transition-all duration-200 hover:shadow"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="input flex-1 border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
              placeholder="Add a new tag"
            />
            <button
              type="submit"
              className="w-full sm:w-auto btn btn-outline dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 rounded-md px-4 py-2 transition-all duration-200 hover:shadow flex items-center justify-center"
              disabled={!newTag.trim()}
            >
              Add
            </button>
          </form>
        </div>
        
        {/* Excerpt */}
        <div className="md:col-span-2">
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            value={frontmatter.excerpt}
            onChange={handleInputChange}
            rows={3}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
          />
        </div>
        
        {/* Hero Image Path */}
        <div className="md:col-span-2">
          <label htmlFor="heroImage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hero Image Path
          </label>
          <input
            type="text"
            id="heroImage"
            name="heroImage"
            value={frontmatter.heroImage}
            onChange={handleInputChange}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
            readOnly
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            To change the hero image, use the Images tab
          </p>
        </div>
        
        {/* Hero Image Prompt */}
        <div className="md:col-span-2">
          <label htmlFor="heroImagePrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hero Image Generation Prompt (optional)
          </label>
          <textarea
            id="heroImagePrompt"
            name="heroImagePrompt"
            value={frontmatter.heroImagePrompt || ''}
            onChange={handleInputChange}
            rows={3}
            className="input w-full border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md px-4 py-2 transition-all duration-200 shadow-sm focus:shadow-md focus:border-primary-500 focus:dark:border-primary-400 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:outline-none"
            placeholder="AI prompt used to generate this image"
          />
        </div>
      </div>
    </div>
  );
};

export default MetadataEditor;
