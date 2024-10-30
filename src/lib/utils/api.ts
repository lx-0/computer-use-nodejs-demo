export function getApiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NEXT_PUBLIC_API_KEY || '',
  };
}

// Add a new function for Ollama-specific headers
export function getOllamaHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}
