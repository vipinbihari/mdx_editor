import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs-extra';
import { getRepositoryStatus } from '@/utils/gitOperations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { repoName } = req.body;
      
      if (!repoName) {
        return res.status(400).json({ error: 'Repository name is required' });
      }
      
      // Use the same repository directory as in gitOperations.ts
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
      
      // Get repository status
      const status = await getRepositoryStatus(repoPath);
      
      return res.status(200).json({ 
        message: 'Repository selected successfully',
        status: status.status
      });
    } catch (error) {
      console.error('Error selecting repository:', error);
      return res.status(500).json({ error: (error as Error).message || 'Failed to select repository' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
