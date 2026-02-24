import { NextRequest, NextResponse } from 'next/server';
import { getMemories, saveMemory, getChatHistory } from '@/app/lib/supabase';

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
  fallback: {
    name: 'DeepSeek R1',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'deepseek/deepseek-r1',
    description: 'Reasoning Model',
    tokens: 100
  },
  vision: {
    name: 'Molmo 7B',
    provider: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'allenai/molmo-7b-d:free',
    description: 'Image Analysis',
    tokens: 50
  }
};

function selectBestModel(task: string, hasImage: boolean = false): any {
  if (hasImage) return MODEL_RANKINGS.vision;
  
  const taskLower = task.toLowerCase();
  
  if (taskLower.includes('code') || taskLower.includes('programming') || taskLower.includes('function') || taskLower.includes('debug')) {
    return MODEL_RANKINGS.tier3;
  }
  
  if (taskLower.includes('reason') || taskLower.includes('think') || taskLower.includes('logic') || taskLower.includes('explain')) {
    return MODEL_RANKINGS.fallback;
  }
  
  if (taskLower.includes('fast') || taskLower.includes('quick') || taskLower.includes('simple')) {
    return MODEL_RANKINGS.tier3;
  }
  
  return MODEL_RANKINGS.tier1;
}

function extractRememberCommands(text: string): { shouldRemember: boolean; cleanedText: string } {
  const rememberPatterns = [
    /remember that (.+)/i,
    /remember (.+)/i,
    /don't forget (.+)/i,
    /keep in mind (.+)/i,
    /note that (.+)/i,
    /save this: (.+)/i
  ];
  
  for (const pattern of rememberPatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        shouldRemember: true,
        cleanedText: text.replace(pattern, '').trim()
      };
    }
  }
  
  return { shouldRemember: false, cleanedText: text };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      prompt, 
      userId = 'anonymous',
      model: userModel, 
      images = [],
      enableMemory = true,
      fileContent = null,
      fileName = null
    } = body;

    const hasImage = images && images.length > 0;
    const hasFile = fileContent && fileName;
    
    const selectedModel = userModel && MODEL_RANKINGS[userModel as keyof typeof MODEL_RANKINGS]
      ? MODEL_RANKINGS[userModel as keyof typeof MODEL_RANKINGS]
      : selectBestModel(prompt, hasImage);

    let apiKey = '';
    if (selectedModel.provider === 'nvidia') {
      apiKey = NVIDIA_API_KEY || '';
    } else {
      apiKey = OPENROUTER_API_KEY || '';
    }

    if (!apiKey) {
      return NextResponse.json({
        error: 'API key not configured',
        setup: 'Add NVIDIA_API_KEY or OPENROUTER_API_KEY'
      }, { status: 500 });
    }

    const memories = enableMemory ? await getMemories(userId, prompt) : [];
    const contextFromMemory = memories.length > 0 
      ? `\n\nRelevant memories from previous conversations:\n${memories.map(m => `- ${m.content}`).join('\n')}`
      : '';

    const systemPrompt = `You are RAG2.0 AGI - an advanced AI assistant with comprehensive knowledge.
${contextFromMemory}
${hasFile ? `\n\nAdditional context from uploaded file (${fileName}):\n${fileContent}` : ''}

You have access to the user's memories. Use them to provide personalized responses.
If the user asks about something they've told you before, reference their stored memories.`;

    let messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (hasImage) {
      const content: { type: string; text?: string; image_url?: { url: string } }[] = [
        { type: 'text', text: prompt }
      ];
      
      for (const img of images) {
        content.push({
          type: 'image_url',
          image_url: { url: img }
        });
      }
      
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: prompt });
    }

    const response = await fetch(selectedModel.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(selectedModel.provider === 'nvidia' ? { 'ngrok-skip-browser-warning': 'true' } : {})
      },
      body: JSON.stringify({
        model: selectedModel.model,
        messages,
        max_tokens: 10000,
        temperature: 0.7,
        stream: false
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: 'API Error', 
        details: error, 
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    const { shouldRemember, cleanedText } = extractRememberCommands(prompt);
    let memorySaved = false;
    
    if (shouldRemember && enableMemory) {
      await saveMemory(userId, cleanedText, 'semantic', 0.8);
      memorySaved = true;
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      model: selectedModel.name,
      provider: selectedModel.provider,
      rank: `#${selectedModel.tokens}B`,
      memorySaved,
      hasImage,
      hasFile,
      memoriesUsed: memories.length
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Generation failed',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'anonymous';
  const action = searchParams.get('action');

  if (action === 'memories') {
    const memories = await getMemories(userId);
    return NextResponse.json({ memories });
  }

  return NextResponse.json({
    name: 'RAG2.0 AGI Chat API',
    version: '3.0.0',
    features: [
      'Smart Model Routing',
      'Image Analysis (Molmo)',
      'Persistent Memory (Supabase)',
      'File Upload & Processing',
      'Streaming Responses'
    ],
    models: Object.keys(MODEL_RANKINGS),
    usage: {
      POST: {
        prompt: 'Your question',
        userId: 'user identifier',
        images: ['base64 or URL for images'],
        enableMemory: true,
        fileContent: 'content from uploaded file',
        fileName: 'filename.md or .skill'
      }
    }
  });
}
