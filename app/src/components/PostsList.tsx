import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/types';
import ConfirmDialog from './ConfirmDialog';

interface PostsListProps {
  repoName: string;
  currentPage: number;
  postsPerPage: number;
  onPageChange: (page: number) => void;
}

const PostsList: React.FC<PostsListProps> = ({
  repoName,
  currentPage,
  postsPerPage,
  onPageChange,
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Handle post deletion
  const handleDeletePost = async () => {
    if (!postToDelete) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/posts/${repoName}/${postToDelete.frontmatter.slug}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Remove the deleted post from the list
        setPosts(posts.filter(post => post.frontmatter.slug !== postToDelete.frontmatter.slug));
        setTotalPosts(totalPosts - 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete post');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setPostToDelete(null);
    }
  };
  
  // Show delete confirmation
  const confirmDeletePost = (e: React.MouseEvent, post: BlogPost) => {
    e.preventDefault();
    e.stopPropagation();
    setPostToDelete(post);
    setShowDeleteConfirm(true);
  };
  
  // Load posts when component mounts or when repo/page changes
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/posts?repoName=${repoName}&page=${currentPage}&limit=${postsPerPage}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setPosts(data.posts || []);
          setTotalPosts(data.pagination?.totalPosts || 0);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };
    
    if (repoName) {
      loadPosts();
    }
  }, [repoName, currentPage, postsPerPage]);

  // Format date for display - preserve the exact date as in the frontmatter
  const formatDate = (dateString: string) => {
    // Parse the ISO date string
    const date = new Date(dateString);
    
    // Extract year, month and day directly from the date string to avoid timezone issues
    // ISO format: YYYY-MM-DDTHH:mm:ss.sssZ
    const isoDate = date.toISOString();
    const [datePart] = isoDate.split('T');
    const [year, month, day] = datePart.split('-');
    
    // Format as DD/MM/YYYY (British format)
    return `${day}/${month}/${year}`;
  };
  
  // Generate pagination links
  const renderPagination = () => {
    const pages = [];
    
    // Always include first page
    pages.push(
      <button
        key="first"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className={`px-3 py-1 rounded ${
          currentPage === 1
            ? 'bg-gray-200 text-gray-600'
            : 'text-primary-600 hover:bg-primary-50'
        }`}
      >
        1
      </button>
    );
    
    // Add ellipsis if there are many pages and we're not near the start
    if (currentPage > 3) {
      pages.push(
        <span key="ellipsis-start" className="px-3 py-1">
          &hellip;
        </span>
      );
    }
    
    // Add pages around current page
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue; // Skip first and last as they're always shown
      
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 rounded ${
            currentPage === i
              ? 'bg-primary-600 text-white'
              : 'text-primary-600 hover:bg-primary-50'
          }`}
        >
          {i}
        </button>
      );
    }
    
    // Add ellipsis if there are many pages and we're not near the end
    if (currentPage < totalPages - 2) {
      pages.push(
        <span key="ellipsis-end" className="px-3 py-1">
          &hellip;
        </span>
      );
    }
    
    // Always include last page if there's more than one page
    if (totalPages > 1) {
      pages.push(
        <button
          key="last"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${
            currentPage === totalPages
              ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              : 'text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-gray-700'
          }`}
        >
          {totalPages}
        </button>
      );
    }
    
    return pages;
  };

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Blog Posts</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {loading ? (
        <div className="py-8 text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-200">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-8 text-center border border-dashed rounded-lg dark:border-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10m2 4h-8m0 0l3-3m-3 3l3 3" />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No posts found</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-300">This repository doesn't have any MDX posts yet</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.frontmatter.slug} className="relative">
                {/* Delete button */}
                <button 
                  onClick={(e) => confirmDeletePost(e, post)}
                  className="absolute top-2 right-2 z-10 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-full transition-colors duration-200"
                  aria-label="Delete post"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                  
                <Link
                  href={`/editor/${repoName}/${post.frontmatter.slug}?page=${currentPage}`}
                  className="block"
                >
                  <div className="flex-grow bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                  <div className="flex flex-col md:flex-row">
                    {/* Hero Image Thumbnail */}
                    <div className="md:w-1/4 relative h-48 md:h-auto">
                      {post.frontmatter.heroImage ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={`/api/image?repoName=${repoName}&imagePath=${post.frontmatter.heroImage}&t=${Date.now()}`}
                            alt={post.frontmatter.title}
                            fill
                            className="object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                            priority={currentPage === 1}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-t-lg md:rounded-l-lg md:rounded-t-none">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Post Info */}
                    <div className="p-4 md:p-6 flex-1">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {post.frontmatter.tags?.map((tag) => (
                          <span key={tag} className="inline-block px-2 py-1 text-xs font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400">
                        {post.frontmatter.title}
                      </h3>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-300 mb-2 flex items-center gap-2">
                        {post.frontmatter.excerpt}
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          <span className="font-medium">{post.frontmatter.author}</span>
                          <span className="mx-1">&middot;</span>
                          <span>{formatDate(post.frontmatter.date)}</span>
                        </div>
                        
                        <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                          Edit Post &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
          
          {/* Confirmation Dialog for Post Deletion */}
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            title="Delete Post"
            message={`Are you sure you want to delete "${postToDelete?.frontmatter.title}"? This will permanently remove the post and all its images. This action cannot be undone.`}
            confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
            cancelLabel="Cancel"
            confirmVariant="danger"
            onConfirm={handleDeletePost}
            onCancel={() => {
              setShowDeleteConfirm(false);
              setPostToDelete(null);
            }}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <div className="flex space-x-1">
                <button
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &larr;
                </button>
                
                {renderPagination()}
                
                <button
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &rarr;
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PostsList;
