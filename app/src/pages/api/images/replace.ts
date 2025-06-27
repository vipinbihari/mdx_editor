import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { IncomingForm } from 'formidable';
import fs from 'fs-extra';
import { replaceImage } from '@/utils/mdxOperations';

// Configure Next.js to handle file uploads
export const config = {
  api: {
    bodyParser: false,
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
    // Parse form data with files
    const form = new IncomingForm({
      keepExtensions: true,
      maxFiles: 1,
      multiples: false,
    });

    // Process the form data using a promisified version of form.parse
    const [fields, files] = await new Promise<[any, any]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve([fields, files]);
      });
    });
    
    // Extract data from the form
    const repoName = Array.isArray(fields.repoName) ? fields.repoName[0] : fields.repoName;
    const slug = Array.isArray(fields.slug) ? fields.slug[0] : fields.slug;
    const oldImagePath = Array.isArray(fields.oldImagePath) ? fields.oldImagePath[0] : fields.oldImagePath;
    const isHero = (Array.isArray(fields.isHero) ? fields.isHero[0] : fields.isHero) === 'true';
    
    // Validate required fields
    if (!repoName || !slug || !oldImagePath || !files.file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Determine repository path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposDir, repoName);

    // Validate the file exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Get the uploaded file
    const uploadedFile = files.file;
    
    if (!uploadedFile) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file was uploaded' });
    }
    
    // Handle file whether it's an array or single object
    const fileInfo = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    
    if (!fileInfo || !fileInfo.filepath) {
      console.error('File info not available', fileInfo);
      return res.status(400).json({ error: 'Invalid file upload' });
    }
    
    console.log('File upload received:', {
      path: fileInfo.filepath,
      name: fileInfo.originalFilename,
      type: fileInfo.mimetype
    });
    
    // Read the file content from disk
    const fileContent = await fs.readFile(fileInfo.filepath);
    
    // For debugging
    console.log(`Read ${fileContent.length} bytes from uploaded file`);
    
    // Create a temporary file path for the uploaded image in the repository
    const tempDir = path.join(process.cwd(), 'tmp');
    await fs.ensureDir(tempDir);
    
    const tempFilePath = path.join(tempDir, fileInfo.originalFilename || 'upload.jpg');
    await fs.writeFile(tempFilePath, fileContent);

    // We need to modify the replaceImage function call because Node.js doesn't 
    // have the File/Blob API that's available in browsers
    
    // Extract the filename and extension from the original file path
    const oldFilename = path.basename(oldImagePath);
    const fileExt = path.extname(fileInfo.originalFilename || '') || path.extname(oldImagePath);
    
    // Create the uploads directory path for this post
    const uploadsDir = path.join(repoPath, 'uploads', slug);
    await fs.ensureDir(uploadsDir);
    
    // Path for the new image (same name as the old one to maintain references)
    const imagePathInRepo = path.join(uploadsDir, oldFilename);
    
    // Copy the uploaded file to the repository
    await fs.copy(tempFilePath, imagePathInRepo, { overwrite: true });
    console.log(`Copied uploaded image to ${imagePathInRepo}`);
    
    // Return the MDX image path (the format that will be used in content)
    const mdxImagePath = `/images/uploads/${slug}/${oldFilename}`;
    
    // Cleanup the temp file
    await fs.remove(tempFilePath).catch(err => console.error('Temp file cleanup error:', err));

    // Return the new image path
    return res.status(200).json({ 
      success: true, 
      newImagePath: mdxImagePath 
    });
  } catch (error: any) {
    console.error('Error replacing image:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
