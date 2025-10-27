import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, repoName, slug, oldImagePath } = req.body;

  // Load environment variables from hardcoded path
  const envPath = '/home/ubuntu/oai_reverse/.env';
  try {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`Loaded environment variables from: ${envPath}`);
    } else {
      console.warn(`Environment file not found at: ${envPath}`);
    }
  } catch (error) {
    console.error(`Error loading environment file from ${envPath}:`, error);
  }

  // Validate required fields
  if (!imageUrl || !repoName || !slug || !oldImagePath) {
    return res.status(400).json({ 
      error: 'Missing required fields: imageUrl, repoName, slug, oldImagePath' 
    });
  }

  try {
    // Step 1: Validate and fetch the image from URL
    console.log(`Fetching image from URL: ${imageUrl}`);
    
    // Validate URL format
    const url = new URL(imageUrl);
    
    // Only allow HTTP and HTTPS protocols for security
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // Fetch the image from the external URL
    const headers: Record<string, string> = {
      'User-Agent': 'MDX-Editor/1.0 (Image Fetcher)',
      'Accept': 'image/*',
    };

    // Add Authorization header for chatgpt.com URLs
    if (url.hostname === 'chatgpt.com' || url.hostname.endsWith('.chatgpt.com')) {
      const authToken = process.env.CHATGPT_AUTH_TOKEN;
      if (!authToken) {
        return res.status(400).json({ 
          error: 'CHATGPT_AUTH_TOKEN environment variable is required for chatgpt.com URLs' 
        });
      }
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      });
    }

    // Check if the response is actually an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'URL does not point to a valid image file' 
      });
    }

    // Check file size (limit to 10MB to prevent abuse)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Image file is too large (maximum 10MB allowed)' 
      });
    }

    // Get the image data as buffer
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    console.log(`Successfully fetched ${buffer.length} bytes from URL`);

    // Step 2: Save the image directly to the repository
    
    // Determine repository path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposDir, repoName);

    // Validate the repository exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Extract the filename from the old image path
    const oldFilename = path.basename(oldImagePath);
    
    // Create the uploads directory path for this post
    const uploadsDir = path.join(repoPath, 'uploads', slug);
    await fs.ensureDir(uploadsDir);
    
    // Path for the new image (same name as the old one to maintain references)
    const imagePathInRepo = path.join(uploadsDir, oldFilename);
    
    // Write the image buffer directly to the repository
    await fs.writeFile(imagePathInRepo, buffer);
    console.log(`Successfully saved image to ${imagePathInRepo}`);
    
    // Return the MDX image path (the format that will be used in content)
    const mdxImagePath = `/images/uploads/${slug}/${oldFilename}`;
    
    // Return success response
    return res.status(200).json({ 
      success: true, 
      newImagePath: mdxImagePath,
      message: `Image successfully replaced from URL: ${imageUrl}`
    });

  } catch (error) {
    console.error('Error in replace-from-url:', error);
    
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    return res.status(500).json({ 
      error: `Failed to replace image from URL: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
