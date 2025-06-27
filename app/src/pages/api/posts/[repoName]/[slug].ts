import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { getBlogPost, saveBlogPost } from '@/utils/mdxOperations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { repoName, slug } = req.query;
  
  if (!repoName || !slug || Array.isArray(repoName) || Array.isArray(slug)) {
    return res.status(400).json({ error: 'Invalid repository name or slug' });
  }

  // Determine the repository path
  const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
  const repoPath = path.join(reposDir, repoName);

  try {
    // Handle GET request (fetch post)
    if (req.method === 'GET') {
      const post = await getBlogPost(repoPath, slug);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      return res.status(200).json({ post });
    }
    
    // Handle PUT request (update post)
    if (req.method === 'PUT') {
      const { post } = req.body;
      
      if (!post) {
        return res.status(400).json({ error: 'Missing post data' });
      }
      
      const result = await saveBlogPost(repoPath, post);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }
      
      return res.status(200).json({ success: true });
    }
    
    // Handle DELETE request (delete post and associated images)
    if (req.method === 'DELETE') {
      try {
        // Check if post exists
        const post = await getBlogPost(repoPath, slug);
        
        if (!post) {
          return res.status(404).json({ error: 'Post not found' });
        }
        
        // 1. Delete MDX file
        const postFilePath = path.join(repoPath, 'posts', `${slug}.mdx`);
        if (existsSync(postFilePath)) {
          await fs.unlink(postFilePath);
        }
        
        // 2. Delete associated images folder
        const uploadsPath = path.join(repoPath, 'uploads', slug);
        if (existsSync(uploadsPath)) {
          // Recursively delete the folder and its contents
          await fs.rm(uploadsPath, { recursive: true, force: true });
        }
        
        return res.status(200).json({ success: true });
      } catch (error: any) {
        console.error('Error deleting post:', error);
        return res.status(500).json({ error: error.message || 'Failed to delete post' });
      }
    }
    
    // Handle unsupported methods
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Error handling post:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
