import React from 'react';

interface MdxPreviewProps {
  content: string;
  repoName: string;
}

const MdxPreview: React.FC<MdxPreviewProps> = ({ content, repoName }) => {
  // In a real implementation, you'd use something like @mdx-js/react to render the MDX
  // For now, we're just using a simple markdown-like preview

  // Convert the markdown to HTML (very simplified version)
  const renderMarkdown = (markdown: string) => {
    // This is a very basic implementation
    // In a production app, you'd use a proper MDX renderer
    let html = markdown
      // Handle headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Handle bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Handle italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Handle links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 dark:text-primary-400 hover:underline">$1</a>')
      // Handle images - replace image paths to use the API route
      .replace(/!\[(.*?)\]\((\/images\/uploads\/[^\)]+)\)/gim, `<img src="/api/image?repoName=${repoName}&imagePath=$2" alt="$1" class="max-w-full h-auto rounded-lg my-4" />`)
      // Handle any other images that don't match the pattern above
      .replace(/!\[(.*?)\]\(((?!\/api\/image)[^\)]+)\)/gim, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4" />')
      // Handle code blocks
      .replace(/```([\s\S]*?)```/gi, '<pre class="bg-gray-100 dark:bg-gray-700 rounded-md p-4 my-4 overflow-x-auto"><code class="dark:text-gray-200">$1</code></pre>')
      // Handle inline code
      .replace(/`(.*?)`/gim, '<code class="bg-gray-100 dark:bg-gray-700 rounded px-1 dark:text-gray-200">$1</code>')
      // Handle blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 my-4 text-gray-700 dark:text-gray-200">$1</blockquote>')
      // Handle unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Handle paragraphs
      .split(/\n\n/).join('</p><p>');

    // Wrap in paragraph tags
    html = '<p>' + html + '</p>';
    
    // Fix lists
    html = html.replace(/<li>(.*?)<\/li>/gi, '<ul class="list-disc pl-5 my-4"><li>$1</li></ul>');

    return html;
  };

  return (
    <div className="p-6 dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-6 dark:text-white flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Preview
      </h2>
      <div className="border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600 flex items-center">
          <h3 className="font-medium text-gray-700 dark:text-gray-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Live Preview
          </h3>
        </div>
        
        <div 
          className="prose max-w-none p-6 mdx-content dark:prose-invert dark:text-gray-200 min-h-[300px] max-h-[600px] overflow-y-auto custom-scrollbar"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-300">
        <p>
          This is a simplified preview. Some MDX components may not render correctly.
        </p>
      </div>
    </div>
  );
};

export default MdxPreview;
