import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoName } = req.body;

  if (!repoName || typeof repoName !== 'string') {
    return res.status(400).json({ error: 'Repository name is required' });
  }

  try {
    // Determine the repository path
    const reposDir = process.env.REPOS_DIR || path.join(process.cwd(), 'repositories');
    const repoPath = path.join(reposDir, repoName);

    // Execute git pull
    const { stdout, stderr } = await execAsync('git pull', {
      cwd: repoPath,
    });

    if (stderr && !stderr.includes('Already up to date')) {
      console.warn('Warning during git pull:', stderr);
    }

    return res.status(200).json({
      success: true,
      message: stdout.trim() || 'Repository updated successfully',
    });
  } catch (error) {
    console.error('Error pulling repository:', error);
    return res.status(500).json({
      error: `Failed to pull repository: ${(error as Error).message}`,
    });
  }
}
