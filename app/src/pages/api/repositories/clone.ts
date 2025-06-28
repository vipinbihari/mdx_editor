import { NextApiRequest, NextApiResponse } from 'next';
import { cloneRepository } from '@/utils/gitOperations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { url, name } = req.body;
      
      if (!url || !name) {
        return res.status(400).json({ error: 'Repository URL and name are required' });
      }
      
      const result = await cloneRepository(url, name);
      
      if (result) {
        return res.status(200).json({ 
          message: 'Repository cloned successfully',
          repository: result
        });
      } else {
        return res.status(500).json({ error: 'Failed to clone repository' });
      }
    } catch (error) {
      console.error('Error cloning repository:', error);
      return res.status(500).json({ error: (error as Error).message || 'Failed to clone repository' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
