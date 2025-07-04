import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';

// Configure Next.js to handle request body
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
    const { repoName, selectedImagePath, dateText } = req.body;

    // Validate required fields
    if (!repoName || !selectedImagePath || !dateText) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine repositories path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    
    // Validate the repository exists
    const repoPath = path.join(reposDir, repoName);
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
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
    const tempOutputPath = path.join(tempDir, `date-stamped-${filename}`);

    // Get the original image dimensions and format
    const imageMetadata = await sharp(imagePath).metadata();
    const { width, height, format } = imageMetadata;
    
    if (!width || !height) {
      return res.status(500).json({ error: 'Could not determine image dimensions' });
    }

    // Split the date text into components (DD/MM/YYYY)
    const [day, month, year] = dateText.split('/');
    
    // Calculate responsive text size based on image dimensions
    const fontSize = Math.max(32, Math.min(48, width * 0.04)); // Responsive font size between 32-48px
    
    // Estimate text width for "DD / MM / YYYY" with proper spacing
    const estimatedWidth = fontSize * 8.5; // Reduced width for more compact layout
    const paddingX = fontSize * 0.6; // Responsive padding
    const rectWidth = estimatedWidth + (paddingX * 2);
    const rectHeight = fontSize * 1.5; // Height proportional to font size
    const rightMargin = Math.max(20, width * 0.02); // Responsive margin
    
    // Calculate positioning
    const rectX = width - rectWidth - rightMargin;
    const centerX = rectX + (rectWidth / 2); // Center of the rectangle
    const baseY = fontSize + 15; // Vertical position based on font size
    
    // Calculate positions for each component with proper spacing
    const componentSpacing = fontSize * 0.8; // Reduced spacing for more compact layout
    
    // Create SVG with date text and background
    const dateTextSvg = Buffer.from(`
      <svg width="${width}" height="${height}">
        <style>
          .text-base {
            font-size: ${fontSize}px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            paint-order: stroke;
            stroke: rgba(0, 0, 0, 0.7);
            stroke-width: ${Math.max(2, fontSize * 0.05)}px;
            stroke-linecap: round;
            stroke-linejoin: round;
          }
          .day {
            fill: rgba(255, 223, 137, 0.95); /* Gold/amber color */
          }
          .month {
            fill: rgba(137, 207, 255, 0.95); /* Light blue */
          }
          .year {
            fill: rgba(183, 255, 166, 0.95); /* Light green */
          }
          .separator {
            fill: rgba(255, 255, 255, 0.9);
          }
          .bg-rect {
            fill: rgba(80, 80, 80, 0.4);
            rx: 4px;
            ry: 4px;
          }
        </style>
        <rect 
          x="${rectX}" 
          y="${fontSize * 0.3}" 
          width="${rectWidth}" 
          height="${rectHeight}" 
          class="bg-rect" 
        />
        <!-- Day -->
        <text 
          x="${centerX - componentSpacing * 2.5}" 
          y="${baseY}" 
          text-anchor="middle" 
          class="text-base day">${day}</text>
        <!-- First slash separator -->
        <text 
          x="${centerX - componentSpacing * 1.5}" 
          y="${baseY}" 
          text-anchor="middle" 
          class="text-base separator"> / </text>
        <!-- Month -->
        <text 
          x="${centerX - componentSpacing * 0.5}" 
          y="${baseY}" 
          text-anchor="middle" 
          class="text-base month">${month}</text>
        <!-- Second slash separator -->
        <text 
          x="${centerX + componentSpacing * 0.5}" 
          y="${baseY}" 
          text-anchor="middle" 
          class="text-base separator"> / </text>
        <!-- Year -->
        <text 
          x="${centerX + componentSpacing * 2.2}" 
          y="${baseY}" 
          text-anchor="middle" 
          class="text-base year">${year}</text>
      </svg>
    `);

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
    
    // Overlay the date text on the image while preserving transparency
    await pipeline
      .composite([{
        input: dateTextSvg,
        top: 0,
        left: 0,
        blend: 'over' // Ensures proper alpha blending
      }])
      .toFile(tempOutputPath);

    // Replace the original image with the stamped one
    await fs.copy(tempOutputPath, imagePath, { overwrite: true });
    
    // Clean up temporary files
    await fs.remove(tempOutputPath).catch(err => console.error('Temp output cleanup error:', err));

    // Return success response
    return res.status(200).json({ 
      success: true, 
      stamped: true,
      imagePath: selectedImagePath,
      timestamp: Date.now() // For cache busting
    });
  } catch (error) {
    console.error('Error stamping image with date:', error);
    return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
  }
}
