import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import { readMdxFile } from '@/utils/mdxOperations';
import { BlogImage } from '@/types';

// API Configuration
const API_BASE_URL = 'https://cms.apanaresult.com/oai_reverse';
//const API_BASE_URL = 'http://localhost:5000';
const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes maximum

interface ApiImageResponse {
  alt_text?: string;
  download_url?: string;
  status?: string;
  image_id?: string;
  dimensions?: { width: number; height: number };
  size_bytes?: number;
  message_id?: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

interface GenerateAndReplaceRequest {
  repoName: string;
  slug: string;
  authToken?: string;
}

interface GenerateAndReplaceResponse {
  success?: boolean;
  message?: string;
  error?: string;
  type?: string;
  placeholder_number?: number;
  availableImages?: {
    heroCount: number;
    inBlogCount: number;
  };
  targetImage?: {
    path: string;
    type: string;
  };
  result?: {
    success: boolean;
    conversationId?: string;
    replacedImagePath?: string;
    error?: string;
  };
  processedImages?: {
    heroImage?: {
      success: boolean;
      conversationId?: string;
      replacedImagePath?: string;
      error?: string;
    };
    inBlogImages?: Array<{
      imagePath: string;
      success: boolean;
      conversationId?: string;
      replacedImagePath?: string;
      error?: string;
    }>;
  };
}

// Helper function to wait for specified time (currently unused but may be needed for future rate limiting)
// const wait = (ms: number): Promise<void> => {
//   return new Promise(resolve => setTimeout(resolve, ms));
// };

// Helper function to get system prompts - reuses existing API logic but avoids HTTP overhead
const getSystemPrompt = async (isHero: boolean): Promise<string> => {
  try {
    // Directly read files like the existing API endpoints do (more efficient than HTTP calls)
    const promptPath = isHero 
      ? path.join(process.cwd(), 'sys_prompt', 'prompt.txt')
      : path.join(process.cwd(), 'sys_prompt', 'inblogimageprompt.txt');
    
    const prompt = await fs.readFile(promptPath, 'utf8');
    
    if (!prompt) {
      throw new Error(isHero ? 'System prompt not found' : 'In-blog image system prompt not found');
    }
    
    return prompt;
  } catch (error) {
    console.error(`Error reading system prompt file (hero: ${isHero}):`, error);
    return '';
  }
};

// Helper function to generate prompt for specific image (matches ImageManager.tsx logic exactly)
const generatePrompt = async (content: string, isHero: boolean, images: BlogImage[], currentImageIndex?: number): Promise<string> => {
  try {
    if (isHero) {
      // Generate hero image prompt - matches ImageManager.tsx lines 268-274
      const systemPrompt = await getSystemPrompt(true);
      if (systemPrompt) {
        return `${systemPrompt}\n\n${content}`;
      }
      return content;
    } else {
      // Generate in-blog image prompt - matches ImageManager.tsx lines 276-298
      const systemPrompt = await getSystemPrompt(false);
      if (systemPrompt) {
        // Transform content like InBlogImagePrompt does
        let transformedContent = content;
        let inBlogImageCounter = 1;
        transformedContent = transformedContent.replace(
          /!\[[^\]]*\]\(\/images\/uploads\/[^)]+\)/g,
          () => `{INSERT IN BLOG IMAGE ${inBlogImageCounter++}}`
        );
        
        // Determine which placeholder number this image corresponds to
        const placeholderNumber = (currentImageIndex || 0) + 1; // 1-based indexing
        
        // Append the specific placeholder instruction for this image
        const placeholderInstruction = `\n\nCREATE IMAGE FOR PLACEHOLDER ${placeholderNumber} NOW`;
        
        return `${systemPrompt}\n\n${transformedContent}${placeholderInstruction}`;
      }
      return content;
    }
  } catch (error) {
    console.error('Error generating prompt:', error);
    return content;
  }
};

// Step 1: Generate image and get conversation ID
const generateImage = async (prompt: string): Promise<{ success: boolean; conversationId?: string; error?: string }> => {
  try {
    console.log('Step 1: Generating image with AI service...');
    
    const response = await fetch(`${API_BASE_URL}/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('vipin:vipin').toString('base64')
      },
      body: JSON.stringify({
        message: prompt
      })
    });
    
    if (!response.ok) {
      return { success: false, error: `AI service error: ${response.status} ${response.statusText}` };
    }
    
    const data = await response.json();
    
    if (data.success && data.conversation_id) {
      console.log(`✅ Image generation initiated. Conversation ID: ${data.conversation_id}`);
      return { success: true, conversationId: data.conversation_id };
    } else {
      return { success: false, error: 'Invalid response from AI service' };
    }
  } catch (error) {
    console.error('Error in generateImage:', error);
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Step 2: Extract images from conversation (single attempt)
const extractImagesOnce = async (conversationId: string, authToken: string = 'XYZ'): Promise<{ success: boolean; images?: ApiImageResponse[]; error?: string; pending?: boolean }> => {
  try {
    const url = `${API_BASE_URL}/conversation/${conversationId}/images${authToken ? `?auth_token=${authToken}` : ''}`;
    console.log('📝 Extract request details:', {
      url,
      method: 'GET',
      conversationId,
      authToken
    });
    
    const response = await fetch(url, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('vipin:vipin').toString('base64')
      }
    });
    
    console.log('📨 Extract response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error response');
      console.error('❌ Extract API error response:', errorText);
      return { success: false, error: `Extract API error: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}` };
    }
    
    const data = await response.json();
    console.log('📄 Extract response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.images && data.images.length > 0) {
      // Check if images have valid download URLs (not null/undefined)
      const readyImages = data.images.filter((img: ApiImageResponse) => img.download_url && img.download_url !== null);
      const inProgressImages = data.images.filter((img: ApiImageResponse) => !img.download_url || img.download_url === null);
      
      console.log(`📊 Image Status Summary:`, {
        total: data.images.length,
        ready: readyImages.length,
        inProgress: inProgressImages.length,
        completed: data.images_completed || 0,
        processing: data.images_in_progress || 0
      });
      
      data.images.forEach((img: ApiImageResponse, i: number) => {
        console.log(`  📷 Image ${i + 1}:`, {
          alt_text: img.alt_text,
          download_url: img.download_url ? img.download_url.substring(0, 100) + '...' : 'NULL (still processing)',
          status: img.status || 'unknown'
        });
      });
      
      if (readyImages.length > 0) {
        console.log(`✅ EXTRACTION SUCCESS: Found ${readyImages.length} ready images (${inProgressImages.length} still processing)`);
        return { success: true, images: readyImages };
      } else {
        console.log(`⏳ EXTRACTION PENDING: Found ${data.images.length} images but all have NULL download_url (still processing)...`);
        return { success: false, pending: true, error: `${data.images.length} images found but still processing (no download URLs yet)` };
      }
    } else {
      console.log('⏳ EXTRACTION PENDING: No images found yet, still processing...');
      return { success: false, pending: true, error: 'Images still being generated' };
    }
  } catch (error) {
    console.error('💥 EXTRACTION EXCEPTION:', error);
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Step 2: Poll for images with intelligent retry mechanism
const extractImagesWithPolling = async (conversationId: string, authToken: string = 'XYZ'): Promise<{ success: boolean; images?: ApiImageResponse[]; error?: string }> => {
  console.log(`📥 STEP 2: Starting intelligent polling for conversation ${conversationId}...`);
  console.log(`⚙️ Polling configuration: ${POLL_INTERVAL_MS/1000}s intervals, ${MAX_POLL_TIME_MS/1000}s maximum`);
  
  const startTime = Date.now();
  let attemptCount = 0;
  
  while (Date.now() - startTime < MAX_POLL_TIME_MS) {
    attemptCount++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`🔄 Polling attempt ${attemptCount} (${elapsed}s elapsed)...`);
    
    const result = await extractImagesOnce(conversationId, authToken);
    
    if (result.success) {
      console.log(`✅ STEP 2 SUCCESS: Images extracted after ${attemptCount} attempts (${elapsed}s)`);
      return { success: true, images: result.images };
    }
    
    if (result.pending) {
      const remainingTime = Math.round((MAX_POLL_TIME_MS - (Date.now() - startTime)) / 1000);
      if (remainingTime <= 0) {
        console.error(`⏰ STEP 2 TIMEOUT: Maximum polling time (${MAX_POLL_TIME_MS/1000}s) reached`);
        return { success: false, error: `Timeout: Images not ready after ${MAX_POLL_TIME_MS/1000} seconds` };
      }
      
      console.log(`⏳ Waiting ${POLL_INTERVAL_MS/1000}s before next attempt (${remainingTime}s remaining)...`);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    } else {
      console.error(`❌ STEP 2 FAILED: Non-recoverable error: ${result.error}`);
      return { success: false, error: result.error };
    }
  }
  
  console.error(`⏰ STEP 2 TIMEOUT: Maximum polling time reached without success`);
  return { success: false, error: `Timeout: Images not ready after ${MAX_POLL_TIME_MS/1000} seconds and ${attemptCount} attempts` };
};

// Step 3: Replace image from URL by reusing existing API endpoint
const replaceImageFromUrl = async (
  imageUrl: string,
  repoName: string,
  slug: string,
  oldImagePath: string
): Promise<{ success: boolean; newImagePath?: string; error?: string }> => {
  try {
    console.log(`Step 3: Replacing image ${oldImagePath} with ${imageUrl}...`);
    
    // Reuse the existing replace-from-url endpoint logic
    // Use internal handler directly to avoid HTTP overhead for internal calls
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/images/replace-from-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        repoName,
        slug,
        oldImagePath,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: errorData.error || `API error: ${response.status} ${response.statusText}` };
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Image successfully replaced via API: ${result.message}`);
      return { success: true, newImagePath: result.newImagePath };
    } else {
      return { success: false, error: result.error || 'Unexpected response format' };
    }

  } catch (error) {
    console.error('Error in replaceImageFromUrl:', error);
    return { success: false, error: `Failed to replace image: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Step 4: Delete conversation
const deleteConversation = async (conversationId: string, authToken: string = 'XYZ'): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log(`Step 4: Deleting conversation ${conversationId}...`);
    
    const url = `${API_BASE_URL}/conversation/${conversationId}${authToken ? `?auth_token=${authToken}` : ''}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('vipin:vipin').toString('base64')
      }
    });
    
    if (!response.ok) {
      return { success: false, error: `Failed to delete conversation: ${response.status} ${response.statusText}` };
    }
    
    console.log(`✅ Conversation ${conversationId} deleted successfully`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    return { success: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

// Main process function for a single image
const processImage = async (
  content: string,
  image: BlogImage,
  repoName: string,
  slug: string,
  authToken: string,
  isHero: boolean,
  imageIndex?: number
): Promise<{ success: boolean; conversationId?: string; replacedImagePath?: string; error?: string }> => {
  console.log('🚀 =================================');
  console.log(`🚀 STARTING PROCESSING: ${isHero ? 'HERO' : 'IN-BLOG'} IMAGE`);
  console.log('🚀 =================================');
  console.log('📋 Process parameters:', {
    imagePath: image.path,
    imageType: isHero ? 'hero' : 'in-blog',
    imageIndex,
    repoName,
    slug,
    authToken,
    contentLength: content.length
  });
  
  try {
    // Step 1: Generate prompt and send to AI service
    console.log('📝 Generating prompt for image...');
    const prompt = await generatePrompt(content, isHero, [image], imageIndex);
    console.log('✅ Prompt generated successfully');
    
    const generateResult = await generateImage(prompt);
    
    if (!generateResult.success) {
      console.error('❌ PROCESS FAILED: Image generation failed');
      return { success: false, error: generateResult.error };
    }
    
    const conversationId = generateResult.conversationId!;
    console.log(`🔑 Conversation ID obtained: ${conversationId}`);
    
    // Step 2: Intelligent polling for image extraction
    const extractResult = await extractImagesWithPolling(conversationId, authToken);
    
    if (!extractResult.success) {
      console.error('❌ EXTRACTION FAILED: Starting cleanup...');
      await deleteConversation(conversationId, authToken);
      return { success: false, error: extractResult.error, conversationId };
    }
    
    const extractedImages = extractResult.images!;
    console.log(`📷 Extracted ${extractedImages.length} images for processing`);
    
    // Step 4: Replace image using first extracted image
    if (extractedImages.length > 0) {
      const downloadUrl = extractedImages[0].download_url;
      if (!downloadUrl) {
        console.error('❌ NO DOWNLOAD URL: Starting cleanup...');
        await deleteConversation(conversationId, authToken);
        return { success: false, error: 'No download URL found in extracted image', conversationId };
      }
      
      console.log(`🔗 Using download URL: ${downloadUrl.substring(0, 100)}...`);
      
      const replaceResult = await replaceImageFromUrl(downloadUrl, repoName, slug, image.path);
      
      if (!replaceResult.success) {
        console.error('❌ REPLACEMENT FAILED: Starting cleanup...');
        await deleteConversation(conversationId, authToken);
        return { success: false, error: replaceResult.error, conversationId };
      }
      
      console.log(`✅ Image replacement successful: ${replaceResult.newImagePath}`);
      
      // Step 5: Delete conversation (cleanup)
      const deleteResult = await deleteConversation(conversationId, authToken);
      
      if (!deleteResult.success) {
        console.log(`⚠️ CLEANUP WARNING: Failed to delete conversation: ${deleteResult.error}`);
      }
      
      console.log('🎉 =================================');
      console.log('🎉 PROCESS COMPLETED SUCCESSFULLY!');
      console.log('🎉 =================================');
      
      return {
        success: true,
        conversationId,
        replacedImagePath: replaceResult.newImagePath
      };
    } else {
      console.error('❌ NO IMAGES FOUND: Starting cleanup...');
      await deleteConversation(conversationId, authToken);
      return { success: false, error: 'No images found in extracted results', conversationId };
    }
    
  } catch (error) {
    console.error('💥 PROCESS EXCEPTION:', error);
    return { success: false, error: `Process failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<GenerateAndReplaceResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoName, slug, authToken = 'XYZ', type, placeholder_number } = req.body as GenerateAndReplaceRequest & { type: string; placeholder_number?: number };

  console.log('📥 Received request:', JSON.stringify({ repoName, slug, authToken, type, placeholder_number }, null, 2));

  if (!repoName || !slug) {
    console.error('❌ Missing required parameters');
    return res.status(400).json({ 
      error: 'Missing required parameters: repoName and slug are required' 
    });
  }

  if (!type || !['hero', 'inblog'].includes(type)) {
    console.error('❌ Invalid or missing type parameter');
    return res.status(400).json({ 
      error: 'Missing or invalid type parameter: must be "hero" or "inblog"' 
    });
  }

  if (type === 'inblog' && (placeholder_number === undefined || placeholder_number < 0)) {
    console.error('❌ Invalid placeholder_number for inblog type');
    return res.status(400).json({ 
      error: 'placeholder_number is required and must be >= 0 for inblog type' 
    });
  }

  console.log(`🚀 Starting ${type} image generation for ${repoName}/${slug}${type === 'inblog' ? ` (placeholder ${placeholder_number})` : ''}`);

  try { 
    // Determine repository path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposDir, repoName);

    // Validate the repository exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Read the MDX file
    const mdxFilePath = path.join(repoPath, 'posts', `${slug}.mdx`);
    const post = await readMdxFile(mdxFilePath);
    
    if (!post) {
      return res.status(404).json({ error: 'MDX file not found or could not be parsed' });
    }

    // Extract hero and in-blog images
    const heroImage = post.images.find(img => img.inHero);
    const inBlogImages = post.images.filter(img => !img.inHero);
    
    console.log(`📊 Found ${heroImage ? 1 : 0} hero image and ${inBlogImages.length} in-blog images`);
    console.log('📋 Available images:', post.images.map(img => ({ path: img.path, inHero: img.inHero })));

    // Find the specific image to process based on type and placeholder_number
    let targetImage: BlogImage | undefined;
    let imageIndex: number = 0;

    if (type === 'hero') {
      console.log('🎯 Target: Hero image');
      if (!heroImage) {
        console.error('❌ No hero image found in this post');
        return res.status(404).json({ 
          error: 'No hero image found in this post',
          availableImages: { heroCount: 0, inBlogCount: inBlogImages.length }
        });
      }
      targetImage = heroImage;
      console.log(`✅ Found hero image: ${targetImage.path}`);
    } else if (type === 'inblog') {
      console.log(`🎯 Target: In-blog image at placeholder ${placeholder_number}`);
      if (inBlogImages.length === 0) {
        console.error('❌ No in-blog images found in this post');
        return res.status(404).json({ 
          error: 'No in-blog images found in this post',
          availableImages: { heroCount: heroImage ? 1 : 0, inBlogCount: 0 }
        });
      }
      
      if (placeholder_number === undefined || placeholder_number < 0 || placeholder_number >= inBlogImages.length) {
        console.error(`❌ Invalid placeholder_number: ${placeholder_number}. Only ${inBlogImages.length} in-blog images available (0-${inBlogImages.length - 1})`);
        return res.status(400).json({ 
          error: `Invalid placeholder_number: ${placeholder_number}. Only ${inBlogImages.length} in-blog images available (0-${inBlogImages.length - 1})`,
          availableImages: { heroCount: heroImage ? 1 : 0, inBlogCount: inBlogImages.length }
        });
      }
      
      targetImage = inBlogImages[placeholder_number];
      imageIndex = placeholder_number;
      console.log(`✅ Found in-blog image at placeholder ${placeholder_number}: ${targetImage.path}`);
    }

    if (!targetImage) {
      console.error('❌ No target image identified');
      return res.status(500).json({ error: 'Failed to identify target image' });
    }

    // Process the specific target image
    console.log(`🎨 Processing ${type} image: ${targetImage.path}`);
    const result = await processImage(
      post.content,
      targetImage,
      repoName,
      slug,
      authToken,
      type === 'hero',
      type === 'inblog' ? imageIndex : undefined
    );

    console.log(`🎉 Process completed for ${type} image. Success: ${result.success}`);
    if (result.success) {
      console.log(`✅ Image successfully processed:`, {
        conversationId: result.conversationId,
        replacedImagePath: result.replacedImagePath
      });
    } else {
      console.error(`❌ Image processing failed:`, result.error);
    }

    return res.status(200).json({
      success: result.success,
      message: result.success 
        ? `${type} image processed successfully` 
        : `Failed to process ${type} image`,
      type,
      placeholder_number: type === 'inblog' ? placeholder_number : undefined,
      targetImage: {
        path: targetImage.path,
        type: type
      },
      result: {
        success: result.success,
        conversationId: result.conversationId,
        replacedImagePath: result.replacedImagePath,
        error: result.error
      }
    });

  } catch (error) {
    console.error('Error in generate-and-replace-all:', error);
    return res.status(500).json({
      error: `Failed to process images: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}
