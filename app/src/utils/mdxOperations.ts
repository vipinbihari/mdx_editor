import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { BlogPost, BlogPostFrontmatter, BlogImage, ImageReplaceParams } from '@/types';

/**
 * Extracts all image references from MDX content
 */
export const extractImageReferences = (content: string, slug: string): BlogImage[] => {
  // Regular expression to match Markdown image syntax: ![alt text](/images/uploads/slug/image.jpg)
  const imageRegex = /!\[(.*?)\]\((\/images\/uploads\/[^)]+)\)/g;
  const images: BlogImage[] = [];
  let match;

  while ((match = imageRegex.exec(content)) !== null) {
    const altText = match[1];
    const imagePath = match[2]; // e.g. /images/uploads/slug-name/image.jpg
    
    // Convert path from /images/uploads/... to /uploads/...
    const fullPath = imagePath.replace('/images', '');
    
    images.push({
      altText,
      path: imagePath,
      fullPath,
      inHero: false // Will be updated later if this is a hero image
    });
  }

  return images;
};

/**
 * Reads and parses an MDX file
 */
export const readMdxFile = async (filePath: string): Promise<BlogPost | null> => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    
    // Parse frontmatter and content using gray-matter
    const { data, content } = matter(fileContent);
    const frontmatter = data as BlogPostFrontmatter;
    
    // Extract image references from content
    const images = extractImageReferences(content, frontmatter.slug);
    
    // Add hero image to images array if it exists
    if (frontmatter.heroImage) {
      const heroPath = frontmatter.heroImage; // e.g. /images/uploads/slug-name/hero-image.jpg
      const heroFullPath = heroPath.replace('/images', ''); // Convert to /uploads/...
      
      // Check if the hero image is already included in the extracted images
      const heroExists = images.some(img => img.path === heroPath);
      
      if (!heroExists) {
        images.push({
          altText: `Hero image for ${frontmatter.title}`,
          path: heroPath,
          fullPath: heroFullPath,
          inHero: true
        });
      } else {
        // Mark the existing image as hero image
        const heroImage = images.find(img => img.path === heroPath);
        if (heroImage) {
          heroImage.inHero = true;
        }
      }
    }
    
    return {
      frontmatter,
      content,
      images
    };
  } catch (error) {
    console.error(`Failed to read MDX file ${filePath}:`, error);
    return null;
  }
};

/**
 * Finds all MDX files in the posts directory
 */
export const findMdxFiles = async (repoPath: string): Promise<string[]> => {
  try {
    const postsDir = path.join(repoPath, 'posts');
    
    // Check if posts directory exists
    if (!await fs.pathExists(postsDir)) {
      console.error(`Posts directory not found at ${postsDir}`);
      return [];
    }
    
    // Read all files in the posts directory
    const files = await fs.readdir(postsDir);
    
    // Filter for .mdx files
    return files
      .filter(file => file.endsWith('.mdx'))
      .map(file => path.join(postsDir, file));
  } catch (error) {
    console.error(`Failed to find MDX files in ${repoPath}:`, error);
    return [];
  }
};

/**
 * Gets all blog posts from the repository
 */
export const getAllPosts = async (repoPath: string): Promise<BlogPost[]> => {
  try {
    const mdxFiles = await findMdxFiles(repoPath);
    const posts: BlogPost[] = [];
    
    for (const file of mdxFiles) {
      const post = await readMdxFile(file);
      if (post) {
        posts.push(post);
      }
    }
    
    // Sort posts by date (newest first)
    return posts.sort((a, b) => {
      const dateA = new Date(a.frontmatter.date).getTime();
      const dateB = new Date(b.frontmatter.date).getTime();
      return dateB - dateA;
    });
  } catch (error) {
    console.error(`Failed to get all posts from ${repoPath}:`, error);
    return [];
  }
};

/**
 * Gets a single blog post by slug
 */
export const getBlogPost = async (repoPath: string, slug: string): Promise<BlogPost | null> => {
  try {
    const filePath = path.join(repoPath, 'posts', `${slug}.mdx`);
    
    // Check if file exists
    if (!await fs.pathExists(filePath)) {
      console.error(`Post file not found: ${filePath}`);
      return null;
    }
    
    // Read and parse the MDX file
    return await readMdxFile(filePath);
  } catch (error) {
    console.error(`Failed to get blog post ${slug} from ${repoPath}:`, error);
    return null;
  }
};

/**
 * Saves an updated blog post while preserving original frontmatter formatting
 */
export const saveBlogPost = async (
  repoPath: string, 
  post: BlogPost
): Promise<{success: boolean, error?: string}> => {
  try {
    const { frontmatter, content } = post;
    const filePath = path.join(repoPath, 'posts', `${frontmatter.slug}.mdx`);
    
    // First, check if the file exists to get its original content
    const originalFilePath = path.join(repoPath, 'posts', `${frontmatter.slug}.mdx`);
    if (await fs.pathExists(originalFilePath)) {
      // Read the original file to preserve its formatting
      const originalContent = await fs.readFile(originalFilePath, 'utf8');
      
      // Find the frontmatter section
      const frontmatterMatch = originalContent.match(/^---(\r?\n|.)*?---/m);
      if (frontmatterMatch) {
        // Parse the original frontmatter to understand its structure
        const originalMatter = matter(originalContent);
        const originalFormat = frontmatterMatch[0];
        
        // Create a new version of the frontmatter with the same formatting style as the original
        let newFrontmatter = '---\n';
        
        // Process each frontmatter field
        for (const [key, value] of Object.entries(frontmatter)) {
          // Special handling for date - check if the original had quotes
          if (key === 'date') {
            if (originalFormat.includes(`date: "${originalMatter.data.date}"`)) {
              // Original had double quotes
              newFrontmatter += `date: "${value}"\n`;
            } else if (originalFormat.includes(`date: '${originalMatter.data.date}'`)) {
              // Original had single quotes
              newFrontmatter += `date: '${value}'\n`;
            } else {
              // No quotes
              newFrontmatter += `date: ${value}\n`;
            }
            continue;
          }
          
          // Special handling for quiz array
          if (key === 'quiz' && Array.isArray(value)) {
            // Check if the original quiz format used inline arrays
            const inlineQuizRegex = /options: \[[^\]]+\]/;
            const usesInlineArrays = inlineQuizRegex.test(originalFormat);
            
            newFrontmatter += 'quiz:\n';
            
            for (const quizItem of value) {
              // Handle 'q' key with its original quote style
              if (originalFormat.includes(`q: "${quizItem.q}"`)) {
                newFrontmatter += `  - q: "${quizItem.q}"\n`;
              } else if (originalFormat.includes(`q: '${quizItem.q}'`)) {
                newFrontmatter += `  - q: '${quizItem.q}'\n`;
              } else {
                newFrontmatter += `  - q: ${quizItem.q}\n`;
              }
              
              // Handle options array
              if (quizItem.options && Array.isArray(quizItem.options)) {
                if (usesInlineArrays) {
                  // Format as inline array with original quote style
                  const formattedOptions = quizItem.options.map((opt: string) => {
                    if (originalFormat.includes(`"${opt}"`)) {
                      return `"${opt}"`;
                    } else if (originalFormat.includes(`'${opt}'`)) {
                      return `'${opt}'`;
                    } else {
                      return `"${opt}"`; // Default to double quotes
                    }
                  }).join(', ');
                  
                  newFrontmatter += `    options: [${formattedOptions}]\n`;
                } else {
                  // Format as multi-line
                  newFrontmatter += '    options:\n';
                  for (const option of quizItem.options) {
                    newFrontmatter += '      - ' + JSON.stringify(option).replace(/^"(.*)"$/, '$1') + '\n';
                  }
                }
              }
              
              // Handle answer
              if (quizItem.answer !== undefined) {
                newFrontmatter += '    answer: ' + quizItem.answer + '\n';
              }
            }
            continue;
          }
          
          // Special handling for tags array
          if (key === 'tags' && Array.isArray(value)) {
            newFrontmatter += 'tags:\n';
            for (const tag of value) {
              // Check if the original had quotes for tags
              const tagWithDoubleQuotes = originalFormat.includes(`  - "${tag}"`);
              const tagWithSingleQuotes = originalFormat.includes(`  - '${tag}'`);
              
              if (tagWithDoubleQuotes) {
                newFrontmatter += `  - "${tag}"\n`;
              } else if (tagWithSingleQuotes) {
                newFrontmatter += `  - '${tag}'\n`;
              } else {
                newFrontmatter += `  - ${tag}\n`;
              }
            }
            continue;
          }
          
          // Handle regular string values
          if (typeof value === 'string') {
            // Check if the original had quotes for this field
            const doubleQuoteRegex = new RegExp(`${key}: "([^"]*)"`); 
            const singleQuoteRegex = new RegExp(`${key}: '([^']*)'`);
            
            if (doubleQuoteRegex.test(originalFormat)) {
              // Original had double quotes
              newFrontmatter += `${key}: "${value}"\n`;
            } else if (singleQuoteRegex.test(originalFormat)) {
              // Original had single quotes
              newFrontmatter += `${key}: '${value}'\n`;
            } else {
              // No quotes or multi-line format
              if (value.includes('\n')) {
                // Multi-line string
                newFrontmatter += `${key}: >-\n  ${value.replace(/\n/g, '\n  ')}\n`;
              } else {
                newFrontmatter += `${key}: ${value}\n`;
              }
            }
            continue;
          }
          
          // Default handling for other types
          newFrontmatter += `${key}: ${JSON.stringify(value)}\n`;
        }
        
        newFrontmatter += '---\n';
        
        // Create a new file content with the updated frontmatter AND the updated content
        const newFileContent = newFrontmatter + content;
        
        // Write the file with updated frontmatter but preserved formatting
        await fs.writeFile(filePath, newFileContent);
        console.log(`Blog post saved to ${filePath} with preserved formatting`);
      } else {
        // Frontmatter section not found, treat as a new file
        const newFileContent = matter.stringify(content, frontmatter);
        await fs.writeFile(filePath, newFileContent);
        console.log(`Blog post created with default formatting at ${filePath}`);
      }
    } else {
      // If file doesn't exist, create new file with default formatting
      const newFileContent = matter.stringify(content, frontmatter);
      await fs.writeFile(filePath, newFileContent);
      console.log(`New blog post created at ${filePath}`);
    }
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to save blog post:`, error);
    return { success: false, error: error.message || 'Unknown error saving blog post' };
  }
};

/**
 * Replace an image in a blog post
 */
export const replaceImage = async (
  repoPath: string,
  params: ImageReplaceParams
): Promise<string | null> => {
  try {
    const { postSlug, oldImagePath, newImage, isHeroImage } = params;
    
    // Extract the image file name from the old path
    const oldImageFileName = path.basename(oldImagePath);
    
    // Create the uploads directory path for this post
    const uploadsDir = path.join(repoPath, 'uploads', postSlug);
    await fs.ensureDir(uploadsDir);
    
    // Path for the new image (same name as the old one to maintain references)
    const newImagePath = path.join(uploadsDir, oldImageFileName);
    
    // Create a buffer from the new image file
    const buffer = Buffer.from(await newImage.arrayBuffer());
    
    // Save the new image to disk
    await fs.writeFile(newImagePath, buffer);
    
    console.log(`Image replaced: ${oldImagePath} -> ${newImagePath}`);
    
    // Return the new image path as it should appear in the MDX
    const mdxImagePath = `/images/uploads/${postSlug}/${oldImageFileName}`;
    return mdxImagePath;
  } catch (error) {
    console.error(`Failed to replace image:`, error);
    return null;
  }
};

/**
 * Delete an image that's no longer used
 */
export const deleteImage = async (
  repoPath: string,
  imagePath: string
): Promise<boolean> => {
  try {
    // Convert from MDX path to filesystem path
    const fullPath = path.join(repoPath, imagePath.replace('/images', ''));
    
    // Check if image exists
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
      console.log(`Image deleted: ${fullPath}`);
      return true;
    } else {
      console.warn(`Image not found for deletion: ${fullPath}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to delete image ${imagePath}:`, error);
    return false;
  }
};
