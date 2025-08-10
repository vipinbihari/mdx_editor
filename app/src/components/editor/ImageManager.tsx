import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { BlogImage, BlogPost } from '@/types';
import ImageZoomModal from './ImageZoomModal';
import { formatDateForDisplay } from '@/utils/dateUtils';

// API Configuration
//
const API_BASE_URL = 'https://cms.apanaresult.com/oai_reverse';
//const API_BASE_URL = 'http://localhost:5000';

// API Response interfaces
interface ApiImageResponse {
  image_id?: string;
  alt_text?: string;
  download_url?: string | null;
  status?: 'finished_successfully' | 'in_progress' | 'unknown';
  dimensions?: { width: number; height: number };
  size_bytes?: number;
  message_id?: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

interface ApiExtractResponse {
  success: boolean;
  conversation_id?: string;
  total_images?: number;
  images_completed?: number;
  images_in_progress?: number;
  images: ApiImageResponse[];
}

interface AutoImageRequest {
  repoName: string;
  slug: string;
  authToken: string;
  type: 'hero' | 'inblog';
  placeholder_number?: number;
}

interface ImageManagerProps {
  images: BlogImage[];
  repoName: string;
  onImageReplace: (oldImage: BlogImage, newImageFile: File) => void;
  post?: BlogPost | null;
}

const ImageManager: React.FC<ImageManagerProps> = ({
  images,
  repoName,
  onImageReplace,
  post,
}) => {
  // Per-image action container states - allows multiple images to have actions open simultaneously
  const [activeImages, setActiveImages] = useState<Record<string, boolean>>({});
  const [stampImages, setStampImages] = useState<Record<string, boolean>>({});
  const [stampDateImages, setStampDateImages] = useState<Record<string, boolean>>({});
  const [generateImages, setGenerateImages] = useState<Record<string, boolean>>({});
  
  // Per-image state data
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isLoadingUrls, setIsLoadingUrls] = useState<Record<string, boolean>>({});
  const [isStampingImages, setIsStampingImages] = useState<Record<string, boolean>>({});
  const [isDateStampingImages, setIsDateStampingImages] = useState<Record<string, boolean>>({});
  const [datesToStamp, setDatesToStamp] = useState<Record<string, string>>({});
  
  // Per-image Generate Image feature state
  const [isGeneratingImages, setIsGeneratingImages] = useState<Record<string, boolean>>({});
  const [conversationIds, setConversationIds] = useState<Record<string, string>>({});
  const [isExtractingImages, setIsExtractingImages] = useState<Record<string, boolean>>({});
  const [extractedImagesData, setExtractedImagesData] = useState<Record<string, Array<{
    altText: string;
    downloadUrl: string;
    status: 'finished_successfully' | 'in_progress' | 'unknown';
    imageId: string;
    dimensions?: { width: number; height: number };
    sizeBytes?: number;
  }>>>({});
  const [authTokens, setAuthTokens] = useState<Record<string, string>>({});
  const [isDeletingConversations, setIsDeletingConversations] = useState<Record<string, boolean>>({});
  const [isAutoGeneratingImages, setIsAutoGeneratingImages] = useState<Record<string, boolean>>({});
  
  // Global states that remain single-value
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [zoomModalOpen, setZoomModalOpen] = useState<boolean>(false);
  const [zoomedImageSrc, setZoomedImageSrc] = useState<string>('');
  const [zoomedImageAlt, setZoomedImageAlt] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string>('');
  // Use a stable timestamp for this component's lifecycle to avoid initial double-requests
  const initialCacheBusterRef = useRef<number>(Date.now());
  const [imageCacheBusters, setImageCacheBusters] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    images.forEach(img => {
      map[img.path] = initialCacheBusterRef.current;
    });
    return map;
  });
  const imageUrlInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Helper functions for per-image state management
  const setImageAction = (
    imagePath: string,
    value: boolean,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    setter(prev => ({
      ...prev,
      [imagePath]: value
    }));
  };

  const setImageData = <T,>(
    imagePath: string,
    value: T,
    setter: React.Dispatch<React.SetStateAction<Record<string, T>>>
  ) => {
    setter((prev) => ({
      ...prev,
      [imagePath]: value
    }));
  };

  const clearImageAction = (
    imagePath: string,
    setter: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) => {
    setter(prev => {
      const newState = { ...prev };
      delete newState[imagePath];
      return newState;
    });
  };

  // Helper function to refresh images after operations
  const refreshImage = (imagePath: string) => {
    setImageCacheBusters(prev => ({
      ...prev,
      [imagePath]: Date.now()
    }));
  };
  
  const getCacheBuster = (imagePath: string): number => {
    // Always use the stored cache buster if it exists
    // Fall back to the stable initial value to avoid a different first-render URL
    return imageCacheBusters[imagePath] ?? initialCacheBusterRef.current;
  };
  
  // Initialize cache busters for all images to prevent unnecessary reloads
  useEffect(() => {
    setImageCacheBusters(prev => {
      const newBusters = { ...prev };
      const timestamp = initialCacheBusterRef.current;
      images.forEach(image => {
        // Only set if not already set, to preserve existing cache busters
        if (!newBusters[image.path]) {
          newBusters[image.path] = timestamp;
        }
      });
      return newBusters;
    });
  }, [images]);

  // Initialize per-image defaults when inputs change
  useEffect(() => {
    // Initialize default dates for all images from post frontmatter if available
    if (post?.frontmatter?.date) {
      const formattedDate = formatDateForDisplay(post.frontmatter.date);
      images.forEach(image => {
        setImageData(image.path, formattedDate, setDatesToStamp);
      });
    }
  }, [post, images]);

  // Filter images into hero and content images
  const heroImage = images.find((img) => img.inHero);
  const contentImages = images.filter((img) => !img.inHero);

  // Setup dropzone for image replacement - now handles per-image state
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.gif', '.jpeg', '.jpg']
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      // Find which image is currently active for replacement
      const activeImagePath = Object.keys(activeImages).find(path => activeImages[path]);
      if (activeImagePath && acceptedFiles.length > 0) {
        const activeImage = images.find(img => img.path === activeImagePath);
        if (activeImage) {
          // Pass the new image file to the parent component for handling
          onImageReplace(activeImage, acceptedFiles[0]);
          clearImageAction(activeImagePath, setActiveImages);
          setUploadError(null);
          
          // Refresh image to show the updated image
          // Small delay to allow the parent component to process the replacement
          setTimeout(() => {
            refreshImage(activeImagePath);
          }, 500);
        }
      }
    },
    onDropRejected: () => {
      setUploadError('Please upload a valid image file (PNG, JPEG, GIF)');
    }
  });

  // Handle image stamping with logo - now accepts image parameter
  const handleStampImage = async (image: BlogImage) => {
    setImageAction(image.path, true, setIsStampingImages);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/images/stamp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          selectedImagePath: image.path,
          selectedLogoRepo: repoName, // Use current repository name directly
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to stamp image');
      }
      
      // Reset UI state for this image
      clearImageAction(image.path, setStampImages);
      
      // Refresh image to show the updated stamp
      refreshImage(image.path);
      
    } catch (error) {
      console.error('Error stamping image:', error);
      setUploadError(`Failed to stamp image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImageAction(image.path, false, setIsStampingImages);
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
          
          // Determine which placeholder number this image corresponds to
          const inBlogImages = images.filter(img => !img.inHero);
          const currentImageIndex = inBlogImages.findIndex(img => img.path === image.path);
          const placeholderNumber = currentImageIndex + 1; // 1-based indexing
          
          // Append the specific placeholder instruction for this image
          const placeholderInstruction = `\n\nCREATE IMAGE FOR PLACEHOLDER ${placeholderNumber} NOW`;
          
          return `${data.prompt}\n\n${transformedContent}${placeholderInstruction}`;
        }
        return content;
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      return content;
    }
  };
  
  // Handle image generation - now accepts image parameter
  const handleGenerateImage = async (image: BlogImage) => {
    setImageAction(image.path, true, setIsGeneratingImages);
    setUploadError(null);
    
    try {
      const prompt = await generatePrompt(image);
      
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
          setImageData(image.path, newConvId, setConversationIds);
          // Save to session storage
          saveConversationId(image, newConvId);
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
      setImageAction(image.path, false, setIsGeneratingImages);
    }
  };
  
  // Handle manual conversation ID changes - now uses per-image state
  const handleConversationIdChange = (value: string, image: BlogImage) => {
    setImageData(image.path, value, setConversationIds);
    // Save to session storage when user manually enters a conversation ID
    if (value.trim()) {
      saveConversationId(image, value.trim());
    }
  };
  
  // Handle image extraction - now accepts image parameter
  const handleExtractImage = async (image: BlogImage) => {
    const conversationId = conversationIds[image.path];
    const authToken = authTokens[image.path] || 'XYZ';
    if (!conversationId) return;
    
    setImageAction(image.path, true, setIsExtractingImages);
    setUploadError(null);
    
    try {
      const url = `${API_BASE_URL}/conversation/${conversationId}/images${authToken ? `?auth_token=${authToken}` : ''}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data: ApiExtractResponse = await response.json();
        if (data.success && data.images && data.images.length > 0) {
          const extractedImages: Array<{
          altText: string;
          downloadUrl: string;
          status: 'finished_successfully' | 'in_progress' | 'unknown';
          imageId: string;
          dimensions?: { width: number; height: number };
          sizeBytes?: number;
        }> = data.images.map((img: ApiImageResponse) => ({
          altText: img.alt_text || (img.status === 'in_progress' ? 'Image is still in progress' : ''),
          downloadUrl: img.download_url || '',
          status: (img.status || 'unknown') as 'finished_successfully' | 'in_progress' | 'unknown',
          imageId: img.image_id || '',
          dimensions: img.dimensions,
          sizeBytes: img.size_bytes
        }));
          setImageData(image.path, extractedImages, setExtractedImagesData);
          
          // Show status summary if there are images in progress
          if (data.images_in_progress && data.images_in_progress > 0) {
            const completedCount = data.images_completed || 0;
            const inProgressCount = data.images_in_progress || 0;
            const totalCount = data.total_images || data.images.length;
            setUploadError(`Images status: ${completedCount} completed, ${inProgressCount} in progress (${totalCount} total)`);
          }
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
      setImageAction(image.path, false, setIsExtractingImages);
    }
  };
  
  // Handle auto image generation
  const handleAutoImage = async (image: BlogImage) => {
    if (!post?.frontmatter?.slug) {
      alert('Post slug not available');
      return;
    }

    const authToken = authTokens[image.path] || 'xyz';
    
    // Determine type and placeholder_number
    const type = image.inHero ? 'hero' : 'inblog';
    let placeholder_number: number | undefined;
    
    if (type === 'inblog') {
      // Find the index of this image among in-blog images
      const contentImages = images.filter(img => !img.inHero);
      placeholder_number = contentImages.findIndex(img => img.path === image.path);
      if (placeholder_number === -1) placeholder_number = 0; // Fallback
    }

    setIsAutoGeneratingImages(prev => ({ ...prev, [image.path]: true }));
    
    try {
      const requestBody: AutoImageRequest = {
        repoName,
        slug: post.frontmatter.slug,
        authToken,
        type
      };
      
      // Only add placeholder_number for in-blog images
      if (type === 'inblog' && placeholder_number !== undefined) {
        requestBody.placeholder_number = placeholder_number;
      }

      // Make the API call - don't wait for response as it takes 5 minutes
      fetch('https://cms.apanaresult.com/api/images/generate-and-replace-all', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic dmlwaW46dmlwaW4=',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(requestBody)
      }).catch(error => {
        console.error('Auto image generation error:', error);
      });
      
      // Immediately show success message without waiting for response
      alert('Task sent! Auto image generation has been initiated.');
      
    } catch (error) {
      console.error('Error in auto image generation:', error);
      alert('Error initiating auto image generation');
    } finally {
      setIsAutoGeneratingImages(prev => ({ ...prev, [image.path]: false }));
    }
  };

  // Handle conversation deletion - now accepts image parameter
  const handleDeleteConversation = async (image: BlogImage) => {
    const conversationId = conversationIds[image.path];
    const authToken = authTokens[image.path] || 'XYZ';
    if (!conversationId) return;
    
    setImageAction(image.path, true, setIsDeletingConversations);
    setUploadError(null);
    
    try {
      const url = `${API_BASE_URL}/conversation/${conversationId}${authToken ? `?auth_token=${authToken}` : ''}`;
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Remove from session storage
        removeConversationId(image);
        
        // Reset UI state for this image
        setImageData(image.path, '' as string, setConversationIds);
        setImageData(image.path, [] as Array<{altText: string; downloadUrl: string; status: 'finished_successfully' | 'in_progress' | 'unknown'; imageId: string; dimensions?: {width: number; height: number}; sizeBytes?: number}>, setExtractedImagesData);
        
        // Show success (could add a success message if needed)
        console.log('Conversation deleted successfully');
      } else {
        setUploadError('Failed to delete conversation: API error');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setUploadError('Failed to delete conversation: Network error');
    } finally {
      setImageAction(image.path, false, setIsDeletingConversations);
    }
  };
  
  // Handle direct image replacement from extracted URL using optimized endpoint
  const handleExtractedImageReplace = async (image: BlogImage, downloadUrl: string) => {
    if (!downloadUrl) return;
    
    setImageAction(image.path, true, setIsExtractingImages);
    setUploadError(null);
    
    try {
      // Use the new optimized endpoint that handles fetch + save in one call
      const response = await fetch('/api/images/replace-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: downloadUrl,
          repoName,
          slug: post?.frontmatter?.slug || '',
          oldImagePath: image.path,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to replace image: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Generated image successfully replaced: ${result.message}`);
        
        // Reset UI state - close the generate image panel for this image
        clearImageAction(image.path, setGenerateImages);
        setImageData(image.path, '' as string, setConversationIds);
        setImageData(image.path, [] as Array<{altText: string; downloadUrl: string; status: 'finished_successfully' | 'in_progress' | 'unknown'; imageId: string; dimensions?: {width: number; height: number}; sizeBytes?: number}>, setExtractedImagesData);
        setImageData(image.path, 'XYZ' as string, setAuthTokens); // Reset to default
        
        // Refresh image to show the updated image
        refreshImage(image.path);
      } else {
        throw new Error(result.error || 'Unexpected response format');
      }
      
    } catch (error) {
      console.error('Error replacing image from extracted URL:', error);
      setUploadError(`Failed to replace image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImageAction(image.path, false, setIsExtractingImages);
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

  // Handle image stamping with date - now accepts image parameter
  const handleStampDate = async (image: BlogImage) => {
    const dateToStamp = datesToStamp[image.path];
    if (!dateToStamp) {
      setUploadError('Please provide a date');
      return;
    }
    
    setImageAction(image.path, true, setIsDateStampingImages);
    setUploadError(null);
    
    try {
      const response = await fetch('/api/images/stampDate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoName,
          selectedImagePath: image.path,
          dateText: dateToStamp,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to stamp date on image');
      }
      
      // Reset UI state for this image
      clearImageAction(image.path, setStampDateImages);
      
      // Refresh image to show the updated stamp date
      refreshImage(image.path);
      
    } catch (error) {
      console.error('Error stamping date on image:', error);
      setUploadError(`Failed to stamp date on image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImageAction(image.path, false, setIsDateStampingImages);
    }
  };
  
  // Handle URL image replacement using optimized single-call endpoint
  const handleUrlImageReplace = async (image: BlogImage) => {
    const imageUrl = imageUrls[image.path];
    if (!imageUrl) return;
    
    setImageAction(image.path, true, setIsLoadingUrls);
    setUploadError(null);
    
    try {
      // Use the new optimized endpoint that handles fetch + save in one call
      const response = await fetch('/api/images/replace-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          repoName,
          slug: post?.frontmatter?.slug || '',
          oldImagePath: image.path,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to replace image: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Image successfully replaced: ${result.message}`);
        
        // Reset UI state for this image
        setImageData(image.path, '' as string, setImageUrls);
        clearImageAction(image.path, setActiveImages);
        
        // Refresh image to show the updated image
        refreshImage(image.path);
      } else {
        throw new Error(result.error || 'Unexpected response format');
      }
    } catch (error) {
      console.error('Error replacing image from URL:', error);
      setUploadError(`Failed to replace image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setImageAction(image.path, false, setIsLoadingUrls);
    }
  };
  
  // Helper to render image stamping UI
  const renderStampingInterface = (image: BlogImage) => {
    const isStamping = isStampingImages[image.path] || false;
    
    return (
      <div className="mt-2 mb-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <h3 className="font-medium text-primary-800 dark:text-primary-300 mb-3">
          Stamp Image with Logo: {image.path.split('/').pop()}
        </h3>
        
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Using logo from repository:
            </span>
            <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
              {repoName}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Repository should have a logo.png at its root
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => handleStampImage(image)}
            disabled={isStamping}
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
    const dateToStamp = datesToStamp[image.path] || '';
    const isDateStamping = isDateStampingImages[image.path] || false;
    
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
            onChange={(e) => setImageData(image.path, e.target.value, setDatesToStamp)}
            placeholder="DD/MM/YYYY"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-600"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">
            Date will be stamped in the top right corner of the image
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={() => handleStampDate(image)}
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
    const isSelected = generateImages[image.path] || false;
    const conversationId = conversationIds[image.path] || '';
    const isGenerating = isGeneratingImages[image.path] || false;
    const isExtracting = isExtractingImages[image.path] || false;
    const isDeleting = isDeletingConversations[image.path] || false;
    const authToken = authTokens[image.path] || 'XYZ';
    const extractedImages = extractedImagesData[image.path] || [];
    
    if (!isSelected) return null;
    
    return (
      <div className="mt-4 p-4 border border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50 dark:bg-primary-900/20">
        <h4 className="font-medium text-primary-800 dark:text-primary-300 mb-3">
          Generate Image ({image.inHero ? 'Hero' : 'In-blog'} Image)
        </h4>
        
        <div className="space-y-4">
          {/* Step 1: Generate Image */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Step 1: Generate AI prompt and send to image generation service
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => handleGenerateImage(image)}
                disabled={isGenerating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                  'Generate Now'
                )}
              </button>
              
              <button
                onClick={() => handleAutoImage(image)}
                disabled={isAutoGeneratingImages[image.path] || false}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isAutoGeneratingImages[image.path] ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Auto Image'
                )}
              </button>
            </div>
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
                  onChange={(e) => setImageData(image.path, e.target.value, setAuthTokens)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  placeholder="Auth Token (optional)"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleExtractImage(image)}
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
                  onClick={() => handleDeleteConversation(image)}
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
                      {/* Status Badge and Image Info */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          img.status === 'finished_successfully' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : img.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {img.status === 'finished_successfully' && (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {img.status === 'in_progress' && (
                            <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          )}
                          {img.status === 'unknown' && (
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                            </svg>
                          )}
                          {img.status === 'finished_successfully' ? 'Ready' : 
                           img.status === 'in_progress' ? 'Generating...' : 'Unknown'}
                        </span>
                        
                        {/* Image metadata */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {img.dimensions && (
                            <span className="mr-2">{img.dimensions.width}×{img.dimensions.height}</span>
                          )}
                          {img.sizeBytes && (
                            <span>{(img.sizeBytes / 1024 / 1024).toFixed(1)}MB</span>
                          )}
                        </div>
                      </div>
                      
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
                            className={`px-2 py-1 text-xs font-semibold border border-purple-300 dark:border-purple-500 text-white shadow-sm transition-all duration-200 rounded-r-md flex items-center justify-center ${
                              copiedText === `alt-${index}` 
                                ? 'bg-green-500 dark:bg-green-600 border-green-400 dark:border-green-500' 
                                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 transform hover:scale-105'
                            }`}
                          >
                            {copiedText === `alt-${index}` ? (
                              <span className="flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span className="hidden sm:inline">Copied</span>
                              </span>
                            ) : (
                              <span className="flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="hidden sm:inline">Copy</span>
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Download URL:
                        </label>
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            value={img.downloadUrl}
                            readOnly
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 overflow-hidden text-ellipsis"
                          />
                          <div className="flex gap-1 flex-wrap">
                            <button
                              onClick={() => handleExtractedImageReplace(image, img.downloadUrl)}
                              disabled={isExtracting}
                              className={`flex-1 min-w-[80px] px-2 py-1 text-xs font-semibold border border-blue-300 dark:border-blue-500 text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-md ${
                                isExtracting 
                                  ? 'bg-blue-400 dark:bg-blue-600 animate-pulse' 
                                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 hover:scale-105'
                              }`}
                              title="Replace the current image with this generated image"
                            >
                              {isExtracting ? (
                                <span className="flex items-center justify-center">
                                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Replacing</span>
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  <span>Replace</span>
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => window.open(img.downloadUrl, '_blank', 'noopener,noreferrer')}
                              className="flex-1 min-w-[80px] px-2 py-1 text-xs font-semibold border border-teal-300 dark:border-teal-500 text-white shadow-sm transition-all duration-200 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800 hover:scale-105 flex items-center justify-center rounded-md"
                              title="Open image in new tab"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              <span>Open</span>
                            </button>
                            <button
                              onClick={() => handleCopyToClipboard(img.downloadUrl, `url-${index}`)}
                              className={`flex-1 min-w-[80px] px-2 py-1 text-xs font-semibold border border-purple-300 dark:border-purple-500 text-white shadow-sm transition-all duration-200 rounded-md flex items-center justify-center ${
                                copiedText === `url-${index}` 
                                  ? 'bg-green-500 dark:bg-green-600 border-green-400 dark:border-green-500' 
                                  : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 hover:scale-105'
                              }`}
                            >
                              {copiedText === `url-${index}` ? (
                                <span className="flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Copied</span>
                                </span>
                              ) : (
                                <span className="flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy</span>
                                </span>
                              )}
                            </button>
                          </div>
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
    const imageUrl = imageUrls[image.path] || '';
    const isLoadingUrl = isLoadingUrls[image.path] || false;
    
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
              onChange={(e) => setImageData(image.path, e.target.value, setImageUrls)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 dark:focus:ring-primary-600 w-full min-w-0"
            />
            <button
              onClick={() => handleUrlImageReplace(image)}
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
    
    const isSelected = activeImages[image.path] || false;
    
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
            setZoomedImageSrc(`/api/image?repoName=${repoName}&imagePath=${image.path}&t=${getCacheBuster(image.path)}`);
            setZoomedImageAlt(image.altText || filename);
            setZoomModalOpen(true);
          }}
        >
          <Image 
            src={`/api/image?repoName=${repoName}&imagePath=${image.path}&t=${getCacheBuster(image.path)}`} 
            alt={image.altText || filename} 
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            priority={image.inHero} // Prioritize loading hero images
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
                  const isCurrentlyActive = activeImages[image.path] || false;
                  setImageData(image.path, !isCurrentlyActive, setActiveImages);
                  // Clear other states for this image
                  setImageData(image.path, false as boolean, setStampImages);
                  setImageData(image.path, false as boolean, setStampDateImages);
                  setImageData(image.path, false as boolean, setGenerateImages);
                  setUploadError(null);
                  setImageData(image.path, '' as string, setImageUrls);
                }}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {isSelected ? 'Cancel' : 'Replace Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle generate image state for this image
                  const isCurrentlyGenerating = generateImages[image.path] || false;
                  setImageData(image.path, !isCurrentlyGenerating, setGenerateImages);
                  // Clear other states for this image
                  setImageData(image.path, false as boolean, setActiveImages);
                  setImageData(image.path, false as boolean, setStampImages);
                  setImageData(image.path, false as boolean, setStampDateImages);
                  setUploadError(null);
                  // Load conversation ID from storage or reset when switching images
                  if (!isCurrentlyGenerating) {
                    const storedConvId = loadConversationId(image);
                    setImageData(image.path, storedConvId, setConversationIds);
                    setImageData(image.path, [] as Array<{altText: string; downloadUrl: string; status: 'finished_successfully' | 'in_progress' | 'unknown'; imageId: string; dimensions?: {width: number; height: number}; sizeBytes?: number}>, setExtractedImagesData);
                    setImageData(image.path, 'XYZ' as string, setAuthTokens); // Always default to XYZ
                  }
                }}
                className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              >
                {generateImages[image.path] ? 'Cancel' : 'Generate Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle stamp state for this image
                  const isCurrentlyStamping = stampImages[image.path] || false;
                  setImageData(image.path, !isCurrentlyStamping, setStampImages);
                  // Clear other states for this image
                  setImageData(image.path, false as boolean, setStampDateImages);
                  setImageData(image.path, false as boolean, setActiveImages);
                  setImageData(image.path, false as boolean, setGenerateImages);
                  setUploadError(null);
                }}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
              >
                {stampImages[image.path] ? 'Cancel' : 'Stamp Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle date stamp state for this image
                  const isCurrentlyDateStamping = stampDateImages[image.path] || false;
                  setImageData(image.path, !isCurrentlyDateStamping, setStampDateImages);
                  // Clear other states for this image
                  setImageData(image.path, false as boolean, setStampImages);
                  setImageData(image.path, false as boolean, setActiveImages);
                  setImageData(image.path, false as boolean, setGenerateImages);
                  setUploadError(null);
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                {stampDateImages[image.path] ? 'Cancel' : 'Stamp Date'}
              </button>
            </div>
            
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {/* We could add image size info here if available */}
            </span>
          </div>
        </div>
        
        {/* Render replacement UI directly below this image if it's selected */}
        {activeImages[image.path] && renderImageReplacement(image)}
        
        {/* Render generate image UI directly below this image if it's selected */}
        {generateImages[image.path] && renderImageGeneration(image)}
        
        {/* Render stamping UI directly below this image if it's selected for stamping */}
        {stampImages[image.path] && renderStampingInterface(image)}
        
        {/* Render date stamping UI if this image is selected for date stamping */}
        {stampDateImages[image.path] && renderDateStampingInterface(image)}
      </div>
    );
  };

  return (
    <div className="p-1 sm:p-6">
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
