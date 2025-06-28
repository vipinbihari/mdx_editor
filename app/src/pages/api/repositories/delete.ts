import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { rm } from 'fs/promises';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { repoName } = req.body;

    if (!repoName) {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const reposPath = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposPath, repoName);

    // Check if the repository exists
    if (!fs.existsSync(repoPath)) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Delete the repository directory recursively
    await rm(repoPath, { recursive: true, force: true });

    // Return success
    return res.status(200).json({ success: true, message: `Repository '${repoName}' deleted successfully` });
  } catch (error) {
    console.error('Error deleting repository:', error);
    return res.status(500).json({ error: `Failed to delete repository: ${(error as Error).message}` });
  }
}
