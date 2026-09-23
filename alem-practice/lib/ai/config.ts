// Server configuration only. Never return credentials to the client.
export function aiConfig() {
  const openai = process.env.AI_PROVIDER === 'openai' || (!process.env.AI_PROVIDER && Boolean(process.env.OPENAI_API_KEY));
  return {
    enabled: process.env.AI_MODE === 'live',
    provider: openai ? 'openai' as const : 'compatible' as const,
    key: openai ? process.env.OPENAI_API_KEY : process.env.AI_API_KEY,
    model: openai ? process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4.1-mini' : process.env.AI_MODEL,
    base: openai ? 'https://api.openai.com/v1' : process.env.AI_BASE_URL,
  };
}

export function aiConfigurationStatus() {
  const c = aiConfig();
  return {configured: Boolean(c.enabled && c.key && c.model && c.base), provider: c.provider, model: c.model || null};
}
