import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { BlogPost, BlogImage } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MetadataEditor from '@/components/editor/MetadataEditor';
import ContentEditor from '@/components/editor/ContentEditor';
import ImageManager from '@/components/editor/ImageManager';
import EditorToolbar from '@/components/editor/EditorToolbar';
import MdxPreview from '@/components/editor/MdxPreview';
import HeroImagePrompt from '@/components/editor/HeroImagePrompt';
import InBlogImagePrompt from '@/components/editor/InBlogImagePrompt';
import Button from '@/components/ui/Button';

export default function PostEditor() {
  const router = useRouter();
  const { repoName, slug, page } = router.query;
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [originalPost, setOriginalPost] = useState<BlogPost | null>(null); // For comparison to see if changes were made
  const [activeTab, setActiveTab] = useState<'metadata' | 'content' | 'images' | 'heroImagePrompt' | 'inBlogImagePrompt'>('content');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      if (!repoName || !slug) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/posts/${repoName}/${slug}`);
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
        } else if (data.post) {
          setPost(data.post);
          setOriginalPost(JSON.parse(JSON.stringify(data.post))); // Deep copy for comparison
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to fetch post data');
      } finally {
        setLoading(false);
      }
    };
    
    if (repoName && slug) {
      fetchPost();
    }
  }, [repoName, slug]);
  
  // Check if the post has unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!post || !originalPost) return false;
    return JSON.stringify(post) !== JSON.stringify(originalPost);
  }, [post, originalPost]);
  
  // Save changes
  const handleSave = async () => {
    if (!post) return;
    
    try {
      setSaving(true);
      const response = await fetch(`/api/posts/${repoName}/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ post }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        // Update originalPost to reflect saved changes
        setOriginalPost(JSON.parse(JSON.stringify(post)));
        // Show success message or notification
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  
  // Update frontmatter
  const handleFrontmatterChange = (frontmatter: Partial<BlogPost['frontmatter']>) => {
    if (!post) return;
    setPost({
      ...post,
      frontmatter: {
        ...post.frontmatter,
        ...frontmatter,
      },
    });
  };
  
  // Update content
  const handleContentChange = (content: string) => {
    if (!post) return;
    setPost({
      ...post,
      content,
    });
  };
  
  // Replace an image
  const handleImageReplace = async (oldImage: BlogImage, newImageFile: File) => {
    if (!post || !repoName) return;
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', newImageFile);
      formData.append('repoName', String(repoName));
      formData.append('slug', post.frontmatter.slug);
      formData.append('oldImagePath', oldImage.path);
      formData.append('isHero', String(oldImage.inHero));
      
      const response = await fetch('/api/images/replace', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else if (data.newImagePath) {
        // Update the post with the new image path
        if (oldImage.inHero) {
          // Update hero image
          handleFrontmatterChange({ heroImage: data.newImagePath });
        } else {
          // Update in-content image
          const newContent = post.content.replace(
            new RegExp(`!\\[.*?\\]\\(${oldImage.path}\\)`, 'g'),
            `![${oldImage.altText}](${data.newImagePath})`
          );
          handleContentChange(newContent);
        }
        
        // Update the images array
        const updatedImages = post.images.map((img) => {
          if (img.path === oldImage.path) {
            return {
              ...img,
              path: data.newImagePath,
              fullPath: data.newImagePath.replace('/images', ''),
            };
          }
          return img;
        });
        
        setPost({
          ...post,
          images: updatedImages,
        });
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to replace image');
    }
  };
  
  // Set up a confirm dialogue for unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
  
  // Handle router changes
  useEffect(() => {
    const handleRouteChange = () => {
      if (hasUnsavedChanges()) {
        const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirm) {
          router.events.emit('routeChangeError');
          throw 'routeChange aborted';
        }
      }
    };
    
    router.events.on('routeChangeStart', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router, hasUnsavedChanges]);

  return (
    <>
      <Header
        onCommitClick={() => {}} // Will be implemented in the parent component
        showCommitButton={false} // Hide commit button on editor page
      />
      
      <main className="container mx-auto px-4 py-8 dark:bg-gray-900 dark:text-white">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="ml-2 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        ) : post ? (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
                  {post.frontmatter.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  Editing post in <span className="font-medium">{repoName}</span> repository
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => router.push(`/?repo=${repoName}${page ? `&page=${page}` : ''}`)}                  
                  variant="outline"
                  size="md"
                  leftIcon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  }
                >
                  Back to List
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges()}
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  className="shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
            
            <EditorToolbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              isPreviewMode={isPreviewMode}
              onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
            />
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900">
              {activeTab === 'metadata' && (
                <MetadataEditor
                  frontmatter={post.frontmatter}
                  onChange={handleFrontmatterChange}
                />
              )}
              
              {activeTab === 'content' && (
                isPreviewMode ? (
                  <MdxPreview content={post.content} repoName={String(repoName)} />
                ) : (
                  <ContentEditor
                    content={post.content}
                    onChange={handleContentChange}
                  />
                )
              )}
              
              {activeTab === 'images' && (
                <ImageManager
                  images={post.images}
                  repoName={String(repoName)}
                  onImageReplace={handleImageReplace}
                />
              )}
              
              {activeTab === 'heroImagePrompt' && (
                <HeroImagePrompt
                  content={post.content}
                />
              )}
              
              {activeTab === 'inBlogImagePrompt' && (
                <InBlogImagePrompt
                  content={post.content}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-800">Post not found</h2>
            <p className="text-gray-600 mt-2">
              The post you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
            </p>
            <button
              onClick={() => router.push('/')}
              className="btn btn-primary mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>
      
      <Footer />
    </>
  );
}
