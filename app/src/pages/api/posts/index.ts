import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import { getAllPosts } from '@/utils/mdxOperations';
import { BlogPost } from '@/types';

// Define interface for the lightweight post data needed for listing
interface PostCardData {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  category: string;
  author: string;
  featured: boolean;
  heroImage: string | null;
}

/**
 * Extract only the data needed for post cards from full blog posts
 */
function extractPostCardData(posts: BlogPost[]): PostCardData[] {
  return posts.map(post => {
    // Extract only the necessary fields from frontmatter
    const {
      slug,
      title,
      date,
      excerpt,
      tags,
      category,
      author,
      featured = false,
      heroImage
    } = post.frontmatter;
    
    // Return the lightweight version
    return {
      slug,
      title,
      date,
      excerpt,
      tags,
      category,
      author,
      featured,
      heroImage: heroImage || null
    };
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoName, page = '1', limit = '10' } = req.query;

    if (!repoName || typeof repoName !== 'string') {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    // Use the same repository directory as in other handlers
    const REPOS_DIR = path.join(process.cwd(), 'repositories');
    const repoPath = path.join(REPOS_DIR, repoName);

    // Check if the repository exists
    if (!await fs.pathExists(repoPath)) {
      return res.status(404).json({ error: `Repository ${repoName} not found` });
    }

    // Check if it's a git repository
    if (!await fs.pathExists(path.join(repoPath, '.git'))) {
      return res.status(400).json({ error: `${repoName} is not a valid git repository` });
    }
    
    // Get all posts from the repository
    const allPosts = await getAllPosts(repoPath);
    
    // Parse pagination parameters
    const currentPage = parseInt(page as string, 10);
    const postsPerPage = parseInt(limit as string, 10);
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    
    // Get posts for current page and convert to lightweight format
    const paginatedPosts = allPosts.slice(startIndex, endIndex);
    const postCardData = extractPostCardData(paginatedPosts);
    
    return res.status(200).json({
      posts: postCardData,
      pagination: {
        currentPage,
        totalPages: Math.ceil(allPosts.length / postsPerPage),
        totalPosts: allPosts.length,
        postsPerPage
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return res.status(500).json({ error: (error as Error).message || 'Failed to fetch posts' });
  }
}
