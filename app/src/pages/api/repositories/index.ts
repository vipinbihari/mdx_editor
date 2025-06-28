import { NextApiRequest, NextApiResponse } from 'next';
import { getClonedRepositories } from '@/utils/gitOperations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const repositories = await getClonedRepositories();
      return res.status(200).json({ repositories });
    } catch (error) {
      console.error('Error fetching repositories:', error);
      return res.status(500).json({ error: (error as Error).message || 'Failed to list repositories' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
