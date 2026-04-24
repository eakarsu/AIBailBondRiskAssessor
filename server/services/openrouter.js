const https = require('https');

async function queryOpenRouter(prompt, systemPrompt = 'You are an AI bail bond risk assessment expert. Provide detailed, professional analysis.') {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    return {
      analysis: 'OpenRouter API key not configured. Please add your OPENROUTER_API_KEY to the .env file.',
      confidence: 0,
      recommendations: ['Configure OpenRouter API key in .env file']
    };
  }

  const body = JSON.stringify({
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2000
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Bail Bond Risk Assessor'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            resolve({ analysis: `API Error: ${parsed.error.message}`, confidence: 0, recommendations: [] });
            return;
          }
          const content = parsed.choices?.[0]?.message?.content || 'No response';
          // Try to parse as JSON first, otherwise return as structured text
          try {
            resolve(JSON.parse(content));
          } catch {
            resolve({
              analysis: content,
              model: parsed.model,
              usage: parsed.usage
            });
          }
        } catch (e) {
          resolve({ analysis: 'Failed to parse AI response', confidence: 0, recommendations: [] });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ analysis: `Request failed: ${e.message}`, confidence: 0, recommendations: [] });
    });

    req.write(body);
    req.end();
  });
}

module.exports = { queryOpenRouter };
