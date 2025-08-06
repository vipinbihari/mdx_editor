import React from 'react';

interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  content,
  onChange,
}) => {
  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // No rich editor mode needed

  return (
    <div className="p-1 sm:p-6 dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Content Editor
      </h2>
      <div className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="font-mono text-sm p-4 w-full h-[600px] focus:outline-none border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-primary-500/20 focus:dark:ring-primary-400/20 focus:border-primary-500 focus:dark:border-primary-400"
          placeholder="Write your MDX content here..."
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-300 flex items-center p-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <p>
          <span className="font-medium">Tip:</span> Use standard Markdown syntax plus JSX components.
        </p>
      </div>
    </div>
  );
};

export default ContentEditor;
