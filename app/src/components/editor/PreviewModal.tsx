import React from 'react';
import Image from 'next/image';
import { BlogPost } from '@/types';
import { formatDateForDisplay } from '@/utils/dateUtils';

interface PreviewModalProps {
  post: BlogPost;
  repoName: string;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ post, repoName, onClose }) => {
  // Function to render markdown content (simplified version)
  const renderContent = (content: string) => {
    // Convert markdown to HTML (very simplified)
    let html = content
      // Handle headers
      .replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-6 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-semibold mt-8 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4">$1</h1>')
      // Handle bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Handle italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Handle links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline">$1</a>')
      // Handle images - replace image paths to use the API route
      .replace(/!\[(.*?)\]\((\/images\/uploads\/[^\)]+)\)/gim, `<img src="/api/image?repoName=${repoName}&imagePath=$2" alt="$1" class="max-w-full h-auto rounded-lg my-6" />`)
      // Handle code blocks
      .replace(/```([\s\S]*?)```/gi, '<pre class="bg-gray-100 rounded-md p-4 my-4 overflow-x-auto"><code>$1</code></pre>')
      // Handle inline code
      .replace(/`(.*?)`/gim, '<code class="bg-gray-100 rounded px-1">$1</code>')
      // Handle blockquotes
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 py-2 my-4 text-gray-700">$1</blockquote>')
      // Handle unordered lists
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      // Handle paragraphs
      .split(/\n\n/).join('</p><p class="my-4">');

    // Wrap in paragraph tags
    html = '<p class="my-4">' + html + '</p>';
    
    // Fix lists
    html = html.replace(/<li>(.*?)<\/li>/gi, '<ul class="list-disc pl-5 my-4"><li>$1</li></ul>');
    
    // Using 'gi' flags instead of 'gim' for better compatibility

    return html;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center overflow-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b z-10 flex justify-between items-center px-6 py-3">
          <h2 className="text-xl font-semibold text-gray-800">Post Preview</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Post Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {post.frontmatter.title}
            </h1>
            <div className="flex items-center text-gray-600 text-sm mb-4">
              <span className="mr-4">
                By <span className="font-medium">{post.frontmatter.author}</span>
              </span>
              <span className="mr-4">
                {formatDateForDisplay(post.frontmatter.date)}
              </span>
              <span>
                In <span className="font-medium">{post.frontmatter.category}</span>
              </span>
            </div>
            {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.frontmatter.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-primary-100 text-primary-800 text-xs font-medium px-2.5 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {post.frontmatter.heroImage && (
              <div className="mt-6">
                <Image
                  src={`/api/image?repoName=${repoName}&imagePath=${post.frontmatter.heroImage}`}
                  alt={post.frontmatter.title}
                  width={800} 
                  height={400}
                  className="w-full h-auto object-cover rounded-lg"
                  onError={(e) => {
                    // If image fails to load, show fallback
                    (e.target as HTMLImageElement).src = '/placeholders/image-placeholder.svg';
                  }}
                />
              </div>
            )}
          </div>

          {/* Post Content */}
          <div 
            className="prose max-w-none mdx-content"
            dangerouslySetInnerHTML={{ __html: renderContent(post.content) }}
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
