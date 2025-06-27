import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoName, imagePath } = req.query;

    if (!repoName || typeof repoName !== 'string') {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    if (!imagePath || typeof imagePath !== 'string') {
      return res.status(400).json({ error: 'Image path is required' });
    }

    // Use the same repository directory as in other handlers
    const REPOS_DIR = path.join(process.cwd(), 'repositories');
    const repoPath = path.join(REPOS_DIR, repoName);

    // Check if the repository exists
    if (!await fs.pathExists(repoPath)) {
      return res.status(404).json({ error: `Repository ${repoName} not found` });
    }

    // Convert image path from /images/uploads/... to /uploads/...
    // This is necessary because the MDX files reference images as /images/uploads/...
    // but they are actually stored in /uploads/...
    const actualImagePath = imagePath.replace('/images/uploads/', '/uploads/');
    
    // Construct the full path to the image file
    const fullImagePath = path.join(repoPath, actualImagePath);

    // Check if the image file exists
    if (!await fs.pathExists(fullImagePath)) {
      return res.status(404).json({ error: `Image not found: ${imagePath}` });
    }

    // Determine content type based on file extension
    const extension = path.extname(fullImagePath).toLowerCase();
    let contentType = 'image/jpeg'; // Default content type

    switch (extension) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
    }

    // Read the image file
    const imageBuffer = await fs.readFile(fullImagePath);

    // Get file modification time for cache busting
    const stats = await fs.stat(fullImagePath);
    const lastModified = stats.mtime.toISOString();

    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    
    // In development, we don't want to cache images to facilitate testing
    // In production, we use the file's last modified time as an ETag
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('Cache-Control', 'no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours in production
      res.setHeader('ETag', `"${lastModified}"`); // Use lastModified as ETag
    }

    // Send the image
    return res.send(imageBuffer);
  } catch (error: any) {
    console.error('Error serving image:', error);
    return res.status(500).json({ error: error.message || 'Failed to serve image' });
  }
}
