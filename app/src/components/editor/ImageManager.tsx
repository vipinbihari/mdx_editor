import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { BlogImage, BlogPost } from '@/types';
import ImageZoomModal from './ImageZoomModal';
import { formatDateForDisplay } from '@/utils/dateUtils';

// API Configuration
const API_BASE_URL = 'https://cms.apanaresult.com/oai_reverse';

// API Response interfaces
interface ApiImageResponse {
  alt_text?: string;
  download_url?: string;
}

interface ImageManagerProps {
  images: BlogImage[];
  repoName: string;
  onImageReplace: (oldImage: BlogImage, newImageFile: File) => void;
  post?: BlogPost | null;
}

interface Repository {
  name: string;
  path: string;
  url?: string;
  isCloned?: boolean;
  isCurrent?: boolean;
}

const ImageManager: React.FC<ImageManagerProps> = ({
  images,
  repoName,
  onImageReplace,
  post,
}) => {
  const [activeImage, setActiveImage] = useState<BlogImage | null>(null);
  const [stampImage, setStampImage] = useState<BlogImage | null>(null);
  const [stampDateImage, setStampDateImage] = useState<BlogImage | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [zoomModalOpen, setZoomModalOpen] = useState<boolean>(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string>('');
  const [zoomedImageAlt, setZoomedImageAlt] = useState<string>('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedLogoRepo, setSelectedLogoRepo] = useState<string>('');
  const [isStamping, setIsStamping] = useState<boolean>(false);
  const [isDateStamping, setIsDateStamping] = useState<boolean>(false);
  const [dateToStamp, setDateToStamp] = useState<string>('');
  const imageUrlInputRef = useRef<HTMLInputElement>(null);
  
  // Generate Image feature state
  const [generateImage, setGenerateImage] = useState<BlogImage | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedImages, setExtractedImages] = useState<Array<{altText: string, downloadUrl: string}>>([]);
  const [authToken, setAuthToken] = useState<string>('XYZ');
  const [copiedText, setCopiedText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Session storage helper functions
  const getStorageKey = (image: BlogImage) => {
    const imageName = image.path.split('/').pop() || 'unknown.png';
    return `conversation_${repoName}_${post?.frontmatter?.slug || 'unknown'}_${imageName}`;
  };
  
  const saveConversationId = (image: BlogImage, convId: string) => {
    const key = getStorageKey(image);
    const data = {
      conversationId: convId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour from now
    };
    sessionStorage.setItem(key, JSON.stringify(data));
  };
  
  const loadConversationId = (image: BlogImage): string => {
    const key = getStorageKey(image);
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if data has expired (1 hour)
        if (Date.now() < data.expiresAt) {
          return data.conversationId || '';
        } else {
          // Clean up expired data
          sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error loading conversation ID from storage:', error);
    }
    return '';
  };
  
  const removeConversationId = (image: BlogImage) => {
    const key = getStorageKey(image);
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing conversation ID from storage:', error);
    }
  };
  
  // Use a consistent timestamp for the entire component lifecycle to avoid unnecessary refetching
  const cacheBuster = useRef(Date.now()).current;
  
  // Fetch repositories for logo selection
  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await fetch('/api/repositories');
        const data = await response.json();
        if (data.repositories) {
          setRepositories(data.repositories);
          // Set the selected repository to match the current repository
          setSelectedLogoRepo(repoName); 
        }
      } catch (error) {
        console.error('Error fetching repositories:', error);
        setUploadError('Failed to load repositories for logo selection');
      }
    };
    
    fetchRepositories();
    
    // Set default date from post frontmatter if available
    if (post?.frontmatter?.date) {
      // Use the shared utility function for consistent date formatting
      setDateToStamp(formatDateForDisplay(post.frontmatter.date));
    }
  }, [repoName, post]);

  // Filter images into hero and content images
  const heroImage = images.find((img) => img.inHero);
  const contentImages = images.filter((img) => !img.inHero);

  // Setup dropzone for image replacement
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (activeImage && acceptedFiles.length > 0) {
        // Pass the new image file to the parent component for handling
        onImageReplace(activeImage, acceptedFiles[0]);
        setActiveImage(null);
        setUploadError(null);
      }
    },
    onDropRejected: () => {
      setUploadError('Please upload a valid image file (PNG, JPEG, GIF)');
    }
  });

  // Handle image stamping with logo
  const handleStampImage = async () => {
    if (!stampImage || !selectedLogoRepo) {
      setUploadError('Please select an image and a logo repository');
      return;
    }
    
    setIsStamping(true);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/images/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          selectedImagePath: stampImage.path,
          selectedLogoRepo,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to stamp image');
      }
      
      // Reset UI state
      setStampImage(null);
      
      // Create a new cache buster to force reload only this specific image
      const newCacheBuster = Date.now();
      
      // Find and update the image element to refresh it
      const imageElement = document.querySelector(`img[src^="/api/image?repoName=${repoName}&imagePath=${stampImage.path}"]`);
      if (imageElement) {
        // Update the src with a new timestamp to force reload
        const currentSrc = imageElement.getAttribute('src');
        const newSrc = currentSrc?.split('&t=')[0] + `&t=${newCacheBuster}`;
        imageElement.setAttribute('src', newSrc);
      }
      
    } catch (error) {
      console.error('Error stamping image:', error);
      setUploadError(`Failed to stamp image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStamping(false);
    }
  };
  
  // Generate prompt for image generation
  const generatePrompt = async (image: BlogImage): Promise<string> => {
    const isHero = image.inHero;
    const content = post?.content || '';
    
    try {
      if (isHero) {
        // Generate hero image prompt
        const response = await fetch('/api/system-prompt');
        const data = await response.json();
        if (data.prompt) {
          return `${data.prompt}\n\n${content}`;
        }
        return content;
      } else {
        // Generate in-blog image prompt
        const response = await fetch('/api/inblog-system-prompt');
        const data = await response.json();
        if (data.prompt) {
          // Transform content like InBlogImagePrompt does
          let transformedContent = content;
          let inBlogImageCounter = 1;
          transformedContent = transformedContent.replace(
            /!\[[^\]]*\]\(\/images\/uploads\/[^)]+\)/g,
            () => `{INSERT IN BLOG IMAGE ${inBlogImageCounter++}}`
          );
          return `${data.prompt}\n\n${transformedContent}`;
        }
        return content;
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      return content;
    }
  };
  
  // Handle image generation
  const handleGenerateImage = async () => {
    if (!generateImage) return;
    
    setIsGenerating(true);
    setUploadError(null);
    
    try {
      const prompt = await generatePrompt(generateImage);
      
      const response = await fetch(`${API_BASE_URL}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.conversation_id) {
          const newConvId = data.conversation_id;
          setConversationId(newConvId);
          // Save to session storage
          saveConversationId(generateImage, newConvId);
        } else {
          setUploadError('Failed to generate image: Invalid response');
        }
      } else {
        setUploadError('Failed to generate image: API error');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setUploadError('Failed to generate image: Network error');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Handle manual conversation ID changes
  const handleConversationIdChange = (value: string, image: BlogImage) => {
    setConversationId(value);
    // Save to session storage when user manually enters a conversation ID
    if (value.trim()) {
      saveConversationId(image, value.trim());
    }
  };
  
  // Handle image extraction
  const handleExtractImage = async () => {
    if (!conversationId) return;
    
    setIsExtracting(true);
    setUploadError(null);
    
    try {
      const url = `${API_BASE_URL}/conversation/${conversationId}/images${authToken ? `?auth_token=${authToken}` : ''}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.images && data.images.length > 0) {
          const images = data.images.map((img: ApiImageResponse) => ({
            altText: img.alt_text || '',
            downloadUrl: img.download_url || ''
          }));
          setExtractedImages(images);
        } else {
          setUploadError('No images found in conversation');
        }
      } else {
        setUploadError('Failed to extract images: API error');
      }
    } catch (error) {
      console.error('Error extracting images:', error);
      setUploadError('Failed to extract images: Network error');
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Handle conversation deletion
  const handleDeleteConversation = async () => {
    if (!conversationId || !generateImage) return;
    
    setIsDeleting(true);
    setUploadError(null);
    
    try {
      const url = `${API_BASE_URL}/conversation/${conversationId}${authToken ? `?auth_token=${authToken}` : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from session storage
        removeConversationId(generateImage);
        
        // Reset UI state
        setConversationId('');
        setExtractedImages([]);
        
        // Show success (could add a success message if needed)
        console.log('Conversation deleted successfully');
      } else {
        setUploadError('Failed to delete conversation: API error');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setUploadError('Failed to delete conversation: Network error');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Handle direct image replacement from extracted URL
  const handleExtractedImageReplace = async (downloadUrl: string) => {
    if (!generateImage || !downloadUrl) return;
    
    setIsExtracting(true);
    setUploadError(null);
    
    try {
      // Use backend proxy to fetch the image (bypasses CORS)
      const response = await fetch('/api/images/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: downloadUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Convert the response to a blob and then to a file
      const blob = await response.blob();
      
      // Create a file name from the URL or use a default
      let fileName = 'generated-image.jpg';
      try {
        const urlParts = new URL(downloadUrl);
        const pathParts = urlParts.pathname.split('/');
        fileName = pathParts[pathParts.length - 1] || 'generated-image.jpg';
        
        // Make sure the file has an extension
        if (!fileName.includes('.')) {
          fileName += '.jpg';  // Default extension if none is provided
        }
      } catch {
        // If URL parsing fails, use default name
        fileName = 'generated-image.jpg';
      }
      
      // Create a File object from the blob
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      
      // Use the same replacement function as for drag-and-drop
      onImageReplace(generateImage, file);
      
      // Reset UI state - close the generate image panel
      setGenerateImage(null);
      setConversationId('');
      setExtractedImages([]);
      setAuthToken('');
      
    } catch (error) {
      console.error('Error replacing image from extracted URL:', error);
      setUploadError(`Failed to replace image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async (text: string, type: string) => {
    try {
      // Check if the modern Clipboard API is available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback method for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        return new Promise<void>((resolve, reject) => {
          if (document.execCommand('copy')) {
            document.body.removeChild(textArea);
            resolve();
          } else {
            document.body.removeChild(textArea);
            reject(new Error('Copy command failed'));
          }
        });
      }
      
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy text to clipboard:', error);
      setUploadError('Failed to copy to clipboard. Please copy manually.');
      // Still show the copied state briefly to indicate the attempt
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 1000);
    }
  };

  // Handle image stamping with date
  const handleStampDate = async () => {
    if (!stampDateImage || !dateToStamp) {
      setUploadError('Please select an image and provide a date');
      return;
    }
    
    setIsDateStamping(true);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/images/stampDate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          selectedImagePath: stampDateImage.path,
          dateText: dateToStamp,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to stamp date on image');
      }
      
      // Reset UI state
      setStampDateImage(null);
      
      // Create a new cache buster to force reload only this specific image
      const newCacheBuster = Date.now();
      
      // Find and update the image element to refresh it
      const imageElement = document.querySelector(`img[src^="/api/image?repoName=${repoName}&imagePath=${stampDateImage.path}"]`);
      if (imageElement) {
        // Update the src with a new timestamp to force reload
        const currentSrc = imageElement.getAttribute('src');
        const newSrc = currentSrc?.split('&t=')[0] + `&t=${newCacheBuster}`;
        imageElement.setAttribute('src', newSrc);
      }
      
    } catch (error) {
      console.error('Error stamping date on image:', error);
      setUploadError(`Failed to stamp date on image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDateStamping(false);
    }
  };
  
  // Handle URL image replacement
  const handleUrlImageReplace = async () => {
    if (!activeImage || !imageUrl) return;
    
    setIsLoadingUrl(true);
    setUploadError(null);
    
    try {
      // Use backend proxy to fetch the image (bypasses CORS)
      const response = await fetch('/api/images/fetch-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Convert the response to a blob and then to a file
      const blob = await response.blob();
      
      // Create a file name from the URL
      const urlParts = new URL(imageUrl);
      const pathParts = urlParts.pathname.split('/');
      let fileName = pathParts[pathParts.length - 1] || 'image.jpg';
      
      // Make sure the file has an extension
      if (!fileName.includes('.')) {
        fileName += '.jpg';  // Default extension if none is provided
      }
      
      // Create a File object from the blob
      const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
      
      // Use the same replacement function as for drag-and-drop
      onImageReplace(activeImage, file);
      
      // Reset UI state
      setImageUrl('');
      setActiveImage(null);
    } catch (error) {
      console.error('Error fetching image from URL:', error);
      setUploadError(`Failed to fetch image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoadingUrl(false);
    }
  };
  
  // Helper to render image stamping UI
  const renderStampingInterface = (image: BlogImage) => {
    return (
      <div className="mt-2 mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-3">
          Stamp Image with Logo: {image.path.split('/').pop()}
        </h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Logo from Repository:
          </label>
          <select
            value={selectedLogoRepo}
            onChange={(e) => setSelectedLogoRepo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-600"
          >
            {repositories.map((repo) => (
              <option key={repo.name} value={repo.name}>
                {repo.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Each repository should have a logo.png at its root
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleStampImage}
            disabled={isStamping || !selectedLogoRepo}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStamping ? 'Stamping...' : 'Stamp Now'}
          </button>
        </div>
      </div>
    );
  };
  
  // Helper to render date stamping UI
  const renderDateStampingInterface = (image: BlogImage) => {
    return (
      <div className="mt-2 mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-3">
          Stamp Date on Image: {image.path.split('/').pop()}
        </h3>
        
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date to Stamp (DD/MM/YYYY):
          </label>
          <input
            type="text"
            value={dateToStamp}
            onChange={(e) => setDateToStamp(e.target.value)}
            placeholder="DD/MM/YYYY"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-600"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Date will be stamped in the top right corner of the image
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleStampDate}
            disabled={isDateStamping || !dateToStamp}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDateStamping ? 'Stamping...' : 'Stamp Now'}
          </button>
        </div>
      </div>
    );
  };
  
  // Helper to render image generation UI
  const renderImageGeneration = (image: BlogImage) => {
    const isSelected = generateImage?.path === image.path;
    
    if (!isSelected) return null;
    
    return (
      <div className="mt-4 p-4 border border-purple-200 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-900/20">
        <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-3">
          Generate Image ({image.inHero ? 'Hero' : 'In-blog'} Image)
        </h4>
        
        <div className="space-y-4">
          {/* Step 1: Generate Image */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Step 1: Generate AI prompt and send to image generation service
            </p>
            <button
              onClick={handleGenerateImage}
              disabled={isGenerating}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
          </div>
          
          {/* Step 2: Conversation ID and Auth Token (Always visible) */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Step 2: Enter or edit conversation ID, add auth token (optional), and extract images
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Conversation ID:
                </label>
                <input
                  type="text"
                  value={conversationId}
                  onChange={(e) => handleConversationIdChange(e.target.value, image)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="Enter conversation ID (from API response or manually)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Auth Token (optional):
                </label>
                <input
                  type="text"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="Auth Token (optional)"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleExtractImage}
                  disabled={isExtracting || !conversationId.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isExtracting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Extracting...
                    </>
                  ) : (
                    'Extract Images'
                  )}
                </button>
                
                <button
                  onClick={handleDeleteConversation}
                  disabled={isDeleting || !conversationId.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Delete this conversation and remove from storage"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Conversation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Step 3: Extracted Images Results */}
          {extractedImages.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                Step 3: Extracted images ({extractedImages.length} found)
              </p>
              <div className="space-y-3">
                {extractedImages.map((img, index) => (
                  <div key={index} className="p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Alt Text:
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            value={img.altText}
                            readOnly
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          />
                          <button
                            onClick={() => handleCopyToClipboard(img.altText, `alt-${index}`)}
                            className={`px-2 py-1 text-xs border-t border-r border-b border-gray-300 dark:border-gray-600 rounded-r-md ${
                              copiedText === `alt-${index}` 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                            }`}
                          >
                            {copiedText === `alt-${index}` ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Download URL:
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            value={img.downloadUrl}
                            readOnly
                            className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          />
                          <button
                            onClick={() => handleExtractedImageReplace(img.downloadUrl)}
                            disabled={isExtracting}
                            className={`px-3 py-1 text-xs font-semibold border-t border-r border-b border-blue-300 dark:border-blue-500 text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isExtracting 
                                ? 'bg-blue-400 dark:bg-blue-600 animate-pulse' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 transform hover:scale-105'
                            }`}
                            title="Replace the current image with this generated image"
                          >
                            {isExtracting ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-1 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Replacing
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Replace
                              </span>
                            )}
                          </button>
                          <button
                            onClick={() => handleCopyToClipboard(img.downloadUrl, `url-${index}`)}
                            className={`px-2 py-1 text-xs border-t border-r border-b border-gray-300 dark:border-gray-600 rounded-r-md ${
                              copiedText === `url-${index}` 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                                : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                            }`}
                          >
                            {copiedText === `url-${index}` ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Helper to render image replacement UI for a specific image
  const renderImageReplacement = (image: BlogImage) => {
    return (
      <div className="mt-2 mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-3">
          Replace Image: {image.path.split('/').pop()}
        </h3>
        
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Option 1: Upload from computer</h4>
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-700'
            }`}
          >
            <input {...getInputProps()} />
            
            <div>
              <svg 
                className="mx-auto h-8 w-8 text-gray-400" 
                stroke="currentColor" 
                fill="none" 
                viewBox="0 0 48 48" 
                aria-hidden="true"
              >
                <path 
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
                  strokeWidth={2} 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              </svg>
              
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {isDragActive ? 'Drop the image here...' : 'Drag and drop an image here, or click to select an image'}
              </p>
              
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                PNG, JPG, GIF up to 10MB
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Option 2: Import from URL</h4>
          <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
            <input
              ref={imageUrlInputRef}
              type="text"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-600 w-full min-w-0"
            />
            <button
              onClick={handleUrlImageReplace}
              disabled={!imageUrl || isLoadingUrl}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:bg-primary-700 dark:hover:bg-primary-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex-shrink-0"
            >
              {isLoadingUrl ? 'Loading...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper to render a single image card
  const renderImageCard = (image: BlogImage) => {
    // Extract just the filename from the path
    const filename = image.path.split('/').pop() || image.path;
    
    const isSelected = activeImage?.path === image.path;
    
    return (
      <div 
        key={image.path}
        className={`border dark:border-gray-700 rounded-lg overflow-hidden transition-shadow hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary-500 dark:ring-primary-600' : ''
        }`}
      >
        <div 
          className="relative w-full h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden"
          style={{ cursor: 'zoom-in' }}
          onClick={() => {
            // Open zoom modal
            setZoomedImageSrc(`/api/image?repoName=${repoName}&imagePath=${image.path}&t=${cacheBuster}`);
            setZoomedImageAlt(image.altText || filename);
            setZoomModalOpen(true);
          }}
        >
          <Image 
            src={`/api/image?repoName=${repoName}&imagePath=${image.path}&t=${cacheBuster}`} 
            alt={image.altText || filename} 
            width={300}
            height={200}
            priority={image.inHero} // Prioritize loading hero images
            style={{ objectFit: 'cover', width: '100%', height: '100%', cursor: 'zoom-in' }}
            onError={() => {
              console.error(`Failed to load image: ${image.path}`);
            }}
          />
        </div>
        
        <div className="p-3 dark:bg-gray-800">
          <h4 className="font-medium text-sm truncate dark:text-gray-200" title={filename}>
            {filename}
          </h4>
          
          <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
            {image.inHero ? 'Hero Image' : 'Content Image'}
          </p>
          
          <div className="mt-3 flex justify-between">
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Toggle replacement state for this image
                  const isSelected = activeImage?.path === image.path;
                  setActiveImage(isSelected ? null : image);
                  setStampImage(null);
                  setStampDateImage(null);
                  setGenerateImage(null);
                  setUploadError(null);
                  setImageUrl('');
                }}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {isSelected ? 'Cancel' : 'Replace Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle generate image state for this image
                  const isSelected = generateImage?.path === image.path;
                  setGenerateImage(isSelected ? null : image);
                  setActiveImage(null);
                  setStampImage(null);
                  setStampDateImage(null);
                  setUploadError(null);
                  // Load conversation ID from storage or reset when switching images
                  if (!isSelected) {
                    const storedConvId = loadConversationId(image);
                    setConversationId(storedConvId);
                    setExtractedImages([]);
                    setAuthToken('XYZ'); // Always default to XYZ
                  }
                }}
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                {generateImage?.path === image.path ? 'Cancel' : 'Generate Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle stamp state for this image
                  setStampImage(stampImage?.path === image.path ? null : image);
                  setStampDateImage(null);
                  setActiveImage(null);
                  setGenerateImage(null);
                  setUploadError(null);
                }}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {stampImage?.path === image.path ? 'Cancel' : 'Stamp Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle date stamp state for this image
                  setStampDateImage(stampDateImage?.path === image.path ? null : image);
                  setStampImage(null);
                  setActiveImage(null);
                  setGenerateImage(null);
                  setUploadError(null);
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {stampDateImage?.path === image.path ? 'Cancel' : 'Stamp Date'}
              </button>
            </div>
            
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {/* We could add image size info here if available */}
            </span>
          </div>
        </div>
        
        {/* Render replacement UI directly below this image if it's selected */}
        {isSelected && renderImageReplacement(image)}
        
        {/* Render generate image UI directly below this image if it's selected */}
        {generateImage?.path === image.path && renderImageGeneration(image)}
        
        {/* Render stamping UI directly below this image if it's selected for stamping */}
        {stampImage?.path === image.path && renderStampingInterface(image)}
        
        {/* Render date stamping UI if this image is selected for date stamping */}
        {stampDateImage?.path === image.path && renderDateStampingInterface(image)}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Image Zoom Modal */}
      <ImageZoomModal
        isOpen={zoomModalOpen}
        onClose={() => setZoomModalOpen(false)}
        imageSrc={zoomedImageSrc}
        altText={zoomedImageAlt}
      />
      <h2 className="text-xl font-bold mb-6 dark:text-white">Manage Images</h2>
      
      {uploadError && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md flex justify-between items-start">
          <p>{uploadError}</p>
          <button 
            onClick={() => setUploadError(null)}
            className="ml-2 text-xs underline"
            aria-label="Dismiss error message"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Hero Image Section */}
      <div className="mb-8">
        <h3 className="font-medium text-lg mb-3 dark:text-white">Hero Image</h3>
        
        {heroImage ? (
          <div className="w-full max-w-md">
            <div className="mb-4">{renderImageCard(heroImage)}</div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No hero image found for this post.</p>
        )}
      </div>
      
      {/* Content Images Section */}
      <div>
        <h3 className="font-medium text-lg mb-3 dark:text-white">Content Images</h3>
        
        {contentImages.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentImages.map(image => (
              <div key={image.path}>{renderImageCard(image)}</div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No content images found in this post.</p>
        )}
      </div>
    </div>
  );
};

export default ImageManager;
