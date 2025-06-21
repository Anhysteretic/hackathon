// /api/replicate.js

export default async function handler(request, response) {
  // Get the path from the incoming request, removing the /replicate-api prefix
  const path = request.url.replace('/replicate-api', '');

  try {
    // Forward the request to the target API
    const apiResponse = await fetch(`https://api.replicate.com${path}`, {
      method: request.method,
      headers: {
        // Pass along the content-type from the original request
        'Content-Type': request.headers['content-type'] || 'application/json',
        // Add the secret Authorization token
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      },
      // Pass the body along if it exists
      body: request.body ? JSON.stringify(request.body) : null,
    });

    // --- THIS IS THE CRITICAL FIX ---
    // 1. Get the JSON data from the API's response
    const data = await apiResponse.json();

    // 2. Send the actual JSON data back to your browser
    // Use the status from the API response
    return response.status(apiResponse.status).json(data);

  } catch (error) {
    console.error('Error in Replicate proxy function:', error);
    return response.status(500).json({ message: 'Internal Server Error in proxy function.' });
  }
}