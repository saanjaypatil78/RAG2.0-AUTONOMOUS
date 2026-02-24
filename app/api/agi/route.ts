import { NextResponse } from 'next/server';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MODEL_RANKINGS = {
  tier1: {
    name: 'Kimi K2.5',
    provider: 'nvidia',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'moonshotai/kimi-k2-instruct',
    description: '#1 Model - Best Overall',
    tokens: 913
  },
  tier2: {
    name: 'Trinity Large',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'arcee-ai/trinity-large',
    description: '#2 Model - Great Reasoning',
    tokens: 534
  },
  tier3: {
    name: 'Gemini 3 Flash',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemini-3-flash-preview',
    description: '#3 Model - Fast & Smart',
    tokens: 470
  },
  tier4: {
    name: 'Step 3.5 Flash',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'stepfun/Step-3.5-Flash',
    description: '#4 Model - Free Tier',
    tokens: 443
  },
  tier5: {
    name: 'MiniMax M2.5',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'minimax/M2.5',
    description: '#5 Model - Versatile',
    tokens: 414
  },
  fallback: {
    name: 'DeepSeek R1',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1',
    description: 'Reasoning Model',
    tokens: 100
  }
};

function selectBestModel(task: string): typeof MODEL_RANKINGS.tier1 {
  const taskLower = task.toLowerCase();
  
  if (taskLower.includes('code') || taskLower.includes('programming') || taskLower.includes('function')) {
    return MODEL_RANKINGS.tier4;
  }
  
  if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('logic')) {
    return MODEL_RANKINGS.fallback;
  }
  
  if (taskLower.includes('fast') || taskLower.includes('quick') || taskLower.includes('simple')) {
    return MODEL_RANKINGS.tier3;
  }
  
  return MODEL_RANKINGS.tier1;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { prompt, model: userModel, autoSelect = true } = body;

  const selectedModel = userModel && MODEL_RANKINGS[userModel as keyof typeof MODEL_RANKINGS]
    ? MODEL_RANKINGS[userModel as keyof typeof MODEL_RANKINGS]
    : selectBestModel(prompt);

  let apiKey = '';
  if (selectedModel.provider === 'nvidia') {
    apiKey = NVIDIA_API_KEY || '';
  } else {
    apiKey = OPENROUTER_API_KEY || '';
  }

  if (!apiKey) {
    return NextResponse.json({
      error: 'API key not configured',
      setup: selectedModel.provider === 'nvidia' 
        ? 'Add NVIDIA_API_KEY' 
        : 'Add OPENROUTER_API_KEY',
      availableModels: Object.keys(MODEL_RANKINGS)
    }, { status: 500 });
  }

  try {
    const response = await fetch(selectedModel.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(selectedModel.provider === 'nvidia' ? { 'ngrok-skip-browser-warning': 'true' } : {})
      },
      body: JSON.stringify({
        model: selectedModel.model,
        messages: [
          { role: 'system', content: 'You are RAG2.0 AGI - an advanced AI assistant with comprehensive knowledge.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (error.includes(' quota') || error.includes('insufficient')) {
        const fallbackModel = MODEL_RANKINGS.fallback;
        const fallbackKey = fallbackModel.provider === 'nvidia' ? NVIDIA_API_KEY : OPENROUTER_API_KEY;
        
        const retryResponse = await fetch(fallbackModel.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fallbackKey}`
          },
          body: JSON.stringify({
            model: fallbackModel.model,
            messages: [
              { role: 'system', content: 'You are RAG2.0 AGI.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 8000,
          }),
        });
        
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          return NextResponse.json({
            success: true,
            response: data.choices?.[0]?.message?.content || '',
            model: fallbackModel.name,
            provider: 'fallback (quota switched)',
            rank: '#fallback'
          });
        }
      }
      return NextResponse.json({ error: 'API Error', details: error }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      response: data.choices?.[0]?.message?.content || '',
      model: selectedModel.name,
      provider: selectedModel.provider,
      rank: `#${selectedModel.tokens}B tokens`
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Generation failed',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'RAG2.0 AGI - Smart Routing',
    version: '3.0.0',
    smartRouting: true,
    leaderboard: Object.entries(MODEL_RANKINGS).map(([id, config]) => ({
      id,
      name: config.name,
      provider: config.provider,
      rank: `#${config.tokens}B`,
      description: config.description
    })),
    usage: {
      POST: {
        prompt: 'Your question',
        model: 'tier1 | tier2 | tier3 | tier4 | tier5 | fallback',
        autoSelect: true
      }
    }
  });
}
