import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { commitAndPushChanges } from '@/utils/gitOperations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { repoName, message } = req.body;
      
      if (!repoName || !message) {
        return res.status(400).json({ error: 'Repository name and commit message are required' });
      }
      
      // Use the same repository directory as in gitOperations.ts
      const REPOS_DIR = path.join(process.cwd(), 'repositories');
      const repoPath = path.join(REPOS_DIR, repoName);
      
      const result = await commitAndPushChanges(repoPath, message);
      
      if (result) {
        return res.status(200).json({ message: 'Changes committed and pushed successfully' });
      } else {
        return res.status(500).json({ error: 'Failed to commit changes' });
      }
    } catch (error) {
      console.error('Error committing changes:', error);
      return res.status(500).json({ error: (error as Error).message || 'Failed to commit changes' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
