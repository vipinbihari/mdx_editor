import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface ResponseData {
  prompt?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Path to the system prompt file
    const promptPath = path.join(process.cwd(), 'sys_prompt', 'prompt.txt');
    
    // Read the file
    const prompt = fs.readFileSync(promptPath, 'utf8');
    
    if (!prompt) {
      return res.status(404).json({ error: 'System prompt not found' });
    }
    
    return res.status(200).json({ prompt });
  } catch (error) {
    console.error('Error reading system prompt file:', error);
    return res.status(500).json({ error: 'Failed to load system prompt' });
  }
}
