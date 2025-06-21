export default async function handler(request, response) {
  // Extract the path from the request URL
  const path = request.url.replace('/replicate-api', '');

  // Forward the request to the target API
  const apiResponse = await fetch(`https://api.replicate.com${path}`, {
    method: request.method,
    headers: {
      ...request.headers,
      'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
    },
    body: request.method !== 'GET' && request.method !== 'HEAD' ? JSON.stringify(request.body) : null,
  });

  // Send the response from the target API back to the client
  return response.status(apiResponse.status).send(apiResponse.body);
}