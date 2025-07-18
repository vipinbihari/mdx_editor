import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl } = req.body;

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  try {
    // Validate URL format
    const url = new URL(imageUrl);
    
    // Only allow HTTP and HTTPS protocols for security
    if (!['http:', 'https:'].includes(url.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are allowed' });
    }

    // Fetch the image from the external URL
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'MDX-Editor/1.0 (Image Fetcher)',
        'Accept': 'image/*',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.status} ${response.statusText}` 
      });
    }

    // Check if the response is actually an image
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ 
        error: 'URL does not point to a valid image file' 
      });
    }

    // Check file size (limit to 10MB to prevent abuse)
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return res.status(400).json({ 
        error: 'Image file is too large (maximum 10MB allowed)' 
      });
    }

    // Get the image data as buffer
    const imageBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(imageBuffer);

    // Set appropriate headers for the image response
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Send the image data
    res.status(200).send(buffer);

  } catch (error) {
    console.error('Error fetching image from URL:', error);
    
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    return res.status(500).json({ 
      error: `Failed to fetch image: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
  }
}
