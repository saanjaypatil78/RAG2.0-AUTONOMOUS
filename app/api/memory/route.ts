import { NextRequest, NextResponse } from 'next/server';
import { saveMemory, getMemories, deleteMemory } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = 'anonymous', content, memoryType = 'semantic', importance = 0.5 } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const memory = await saveMemory(userId, content, memoryType, importance);

    if (memory) {
      return NextResponse.json({
        success: true,
        message: 'Memory saved successfully',
        memory
      });
    } else {
      return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId') || 'anonymous';
  const query = searchParams.get('query') || '';
  const action = searchParams.get('action');

  if (action === 'search') {
    const memories = await getMemories(userId, query);
    return NextResponse.json({ memories });
  }

  const memories = await getMemories(userId);
  return NextResponse.json({ 
    memories,
    count: memories.length,
    message: 'Use ?action=search&query=term to search memories'
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    const success = await deleteMemory(id);

    return NextResponse.json({
      success,
      message: success ? 'Memory deleted' : 'Failed to delete memory'
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
