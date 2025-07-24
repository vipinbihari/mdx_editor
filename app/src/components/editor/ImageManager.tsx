import React, { useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { BlogImage, BlogPost } from '@/types';
import ImageZoomModal from './ImageZoomModal';
import { formatDateForDisplay } from '@/utils/dateUtils';

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
                  // Toggle active state for this image
                  setActiveImage(isSelected ? null : image);
                  setStampImage(null);
                  setUploadError(null);
                  setImageUrl('');
                }}
                className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {isSelected ? 'Cancel' : 'Replace Image'}
              </button>
              
              <button
                onClick={() => {
                  // Toggle stamp state for this image
                  setStampImage(stampImage?.path === image.path ? null : image);
                  setStampDateImage(null);
                  setActiveImage(null);
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
