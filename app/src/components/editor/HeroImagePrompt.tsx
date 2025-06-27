import React, { useEffect, useState } from 'react';
import fs from 'fs/promises';
import path from 'path';

interface HeroImagePromptProps {
  content: string;
}

const HeroImagePrompt: React.FC<HeroImagePromptProps> = ({
  content,
}) => {
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [fullPrompt, setFullPrompt] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Fetch system prompt from file
  useEffect(() => {
    const fetchSystemPrompt = async () => {
      try {
        // Fetch the system prompt using API
        const response = await fetch('/api/system-prompt');
        const data = await response.json();
        
        if (data.prompt) {
          setSystemPrompt(data.prompt);
          // Combine system prompt with blog content
          setFullPrompt(`${data.prompt}\n\n${content}`);
        }
      } catch (err) {
        console.error('Failed to load system prompt:', err);
        // Use content only if system prompt fails to load
        setFullPrompt(content);
      }
    };

    fetchSystemPrompt();
  }, [content]);

  // Handle copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    
    // Reset copied state after 2 seconds
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Hero Image Prompt
        </h2>
        <button
          onClick={handleCopy}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            copied
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-primary-50 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-800/40'
          }`}
        >
          {copied ? (
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </span>
          ) : (
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy to Clipboard
            </span>
          )}
        </button>
      </div>
      
      <div className="border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <textarea
          value={fullPrompt}
          readOnly
          className="font-mono text-sm p-4 w-full h-[600px] focus:outline-none border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-lg transition-all duration-200"
          placeholder="Loading prompt..."
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-300 flex items-center p-2 bg-gray-50 dark:bg-gray-800 border dark:border-gray-700 rounded-md shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>
          <span className="font-medium">Note:</span> This combined prompt can be used with AI image generation tools to create a hero image for your post.
        </p>
      </div>
    </div>
  );
};

export default HeroImagePrompt;
