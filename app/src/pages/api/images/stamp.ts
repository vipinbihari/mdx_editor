import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';

// Configure Next.js to handle file uploads
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoName, selectedImagePath, selectedLogoRepo } = req.body;

    // Validate required fields
    if (!repoName || !selectedImagePath || !selectedLogoRepo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine repositories path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    
    // Validate the repository exists
    const repoPath = path.join(reposDir, repoName);
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }
    
    // Get the logo from the selected repository
    const logoPath = path.join(reposDir, selectedLogoRepo, 'logo.png');
    if (!fs.existsSync(logoPath)) {
      return res.status(404).json({ error: 'Logo not found for the selected repository' });
    }

    // Extract the slug and filename from the image path
    // The selectedImagePath is expected to be in format "/images/uploads/[slug]/[filename]"
    const pathParts = selectedImagePath.split('/');
    if (pathParts.length < 4) {
      return res.status(400).json({ error: 'Invalid image path format' });
    }
    
    const slug = pathParts[pathParts.length - 2];
    const filename = pathParts[pathParts.length - 1];
    
    // Get the actual file path in the repository
    const imagePath = path.join(repoPath, 'uploads', slug, filename);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Create a temporary directory for processing
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tempDir);
    const tempOutputPath = path.join(tempDir, `stamped-${filename}`);

    // Resize the logo to 128x128 with transparent background preserved
    const resizedLogoPath = path.join(tempDir, 'resized-logo.png');
    await sharp(logoPath)
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
      })
      .png({ quality: 100, compressionLevel: 3, adaptiveFiltering: true })
      .toFile(resizedLogoPath);

    // Get the original image dimensions and format
    const imageMetadata = await sharp(imagePath).metadata();
    const { width, height, format } = imageMetadata;
    
    if (!width || !height) {
      return res.status(500).json({ error: 'Could not determine image dimensions' });
    }

    // Calculate the position for the logo (bottom right with padding)
    const bottomOffset = 20; // Increased padding for better edge spacing
    const rightOffset = 20;   // Increased padding for better edge spacing
    
    // Create Sharp pipeline with transparency support and quality preservation
    let pipeline = sharp(imagePath, {
      sequentialRead: true,
      limitInputPixels: false
    });
    
    // Configure output format to balance quality and file size
    if (format === 'png') {
      pipeline = pipeline.png({ quality: 100, compressionLevel: 3, adaptiveFiltering: true, palette: false });
    } else if (format === 'webp') {
      pipeline = pipeline.webp({ quality: 95, lossless: false, nearLossless: true });
    } else if (format === 'jpeg' || format === 'jpg') {
      pipeline = pipeline.jpeg({ quality: 95, progressive: false, mozjpeg: true });
    } else {
      // For other formats, convert to PNG with balanced settings
      pipeline = pipeline.png({ quality: 100, compressionLevel: 3, adaptiveFiltering: true, palette: false });
    }
    
    // Overlay the logo on the image while preserving transparency
    await pipeline
      .composite([{
        input: resizedLogoPath,
        top: height - 128 - bottomOffset,  // Place at bottom with padding (logo height is 128)
        left: width - 128 - rightOffset,    // Place on the right with padding (logo width is 128)
        blend: 'over' // Ensures proper alpha blending
      }])
      .toFile(tempOutputPath);

    // Replace the original image with the stamped one
    await fs.copy(tempOutputPath, imagePath, { overwrite: true });
    
    // Clean up temporary files
    await fs.remove(resizedLogoPath).catch(err => console.error('Temp logo cleanup error:', err));
    await fs.remove(tempOutputPath).catch(err => console.error('Temp output cleanup error:', err));

    // Return success response
    return res.status(200).json({ 
      success: true, 
      stamped: true,
      imagePath: selectedImagePath,
      timestamp: Date.now() // For cache busting
    });
  } catch (error) {
    console.error('Error stamping image:', error);
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
}
