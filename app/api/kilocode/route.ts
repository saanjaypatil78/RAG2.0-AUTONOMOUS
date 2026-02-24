import { NextResponse } from 'next/server';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const KILO_GATEWAY_URL = 'https://gateway.kilocode.ai/v1';

const FREE_MODELS = {
  'kimi-k2.5': {
    provider: 'nvidia',
    name: 'Kimi K2.5',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'moonshotai/kimi-k2-instruct',
    description: 'Top-tier coding model from Moonshot AI - FREE via NVIDIA'
  },
  'deepseek-r1': {
    provider: 'openrouter',
    name: 'DeepSeek R1',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1',
    description: 'Open-source reasoning model - FREE'
  },
  'qwen3-coder': {
    provider: 'openrouter',
    name: 'Qwen3 Coder',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'qwen/qwen3-coder-32b',
    description: 'Optimized for coding - FREE'
  },
  'claude-3-haiku': {
    provider: 'openrouter',
    name: 'Claude 3 Haiku',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'anthropic/claude-3-haiku',
    description: 'Fast & capable - FREE tier'
  },
  'gpt-4o-mini': {
    provider: 'openrouter',
    name: 'GPT-4o Mini',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
    description: 'Fast OpenAI model - FREE tier'
  }
};

export async function POST(request: Request) {
  const body = await request.json();
  const { prompt, model = 'kimi-k2.5', systemPrompt, enableThinking = true } = body;

  const modelConfig = FREE_MODELS[model as keyof typeof FREE_MODELS];
  if (!modelConfig) {
    return NextResponse.json(
      { error: 'Invalid model. Available: ' + Object.keys(FREE_MODELS).join(', ') },
      { status: 400 }
    );
  }

  let apiKey = '';
  if (modelConfig.provider === 'nvidia') {
    apiKey = NVIDIA_API_KEY || '';
  } else {
    apiKey = OPENROUTER_API_KEY || '';
  }

  if (!apiKey) {
    return NextResponse.json(
      { 
        error: 'API key not configured',
        model: model,
        setup: modelConfig.provider === 'nvidia' 
          ? 'Add NVIDIA_API_KEY to Vercel env vars'
          : 'Add OPENROUTER_API_KEY to Vercel env vars'
      },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(modelConfig.provider === 'nvidia' ? { 'ngrok-skip-browser-warning': 'true' } : {})
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { 
            role: 'user', 
            content: enableThinking 
              ? `Think step by step about this problem:\n\n${prompt}`
              : prompt
          }
        ],
        max_tokens: 8192,
        temperature: 0.7,
        ...(enableThinking && model === 'deepseek-r1' ? { reasoning_effort: 'high' } : {})
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'API error', details: error, status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const content = data.choices?.[0]?.message?.content || '';
    const reasoning = data.choices?.[0]?.message?.reasoning_content || '';
    
    return NextResponse.json({
      success: true,
      response: content,
      reasoning: reasoning,
      model: modelConfig.name,
      provider: modelConfig.provider,
      description: modelConfig.description
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'RAG2.0 AGI - KiloCode Power',
    version: '2.0.0',
    status: 'running',
    freeModels: Object.entries(FREE_MODELS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      provider: config.provider
    })),
    usage: {
      POST: {
        prompt: 'Your question or code request',
        model: 'kimi-k2.5 | deepseek-r1 | qwen3-coder | claude-3-haiku | gpt-4o-mini',
        systemPrompt: 'Optional custom system prompt',
        enableThinking: true
      }
    }
  });
}
