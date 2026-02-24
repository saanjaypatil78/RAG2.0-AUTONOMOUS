import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; 
const ALLOWED_TYPES = ['text/markdown', 'application/json', 'text/plain'];
const ALLOWED_EXTENSIONS = ['.md', '.markdown', '.skill', '.json', '.txt'];

interface ParsedFile {
  name: string;
  type: string;
  content: string;
  tokens: number;
  sections: string[];
}

function extractSections(content: string): string[] {
  const sections: string[] = [];
  const lines = content.split('\n');
  
  let currentSection = '';
  let inCodeBlock = false;
  
  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
    }
    
    if (!inCodeBlock && (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### '))) {
      if (currentSection.trim()) {
        sections.push(currentSection.trim());
      }
      currentSection = line + '\n';
    } else {
      currentSection += line + '\n';
    }
  }
  
  if (currentSection.trim()) {
    sections.push(currentSection.trim());
  }
  
  return sections.slice(0, 10);
}

function parseMarkdown(content: string): ParsedFile {
  const sections = extractSections(content);
  const tokens = Math.ceil(content.split(/\s+/).length * 1.3);
  
  return {
    name: '',
    type: 'markdown',
    content: content.substring(0, 50000),
    tokens,
    sections
  };
}

function parseSkillFile(content: string): ParsedFile {
  try {
    const skillData = JSON.parse(content);
    const tokens = Math.ceil(content.split(/\s+/).length * 1.3);
    
    return {
      name: skillData.name || skillData.skill?.name || 'Unnamed Skill',
      type: 'skill',
      content: JSON.stringify(skillData, null, 2).substring(0, 50000),
      tokens,
      sections: [
        `Skill: ${skillData.name || 'Unknown'}`,
        `Description: ${skillData.description || skillData.skill?.description || 'N/A'}`,
        `Commands: ${JSON.stringify(skillData.commands || skillData.skill?.commands || [])}`
      ]
    };
  } catch {
    return {
      name: 'Unknown Skill',
      type: 'skill',
      content: content.substring(0, 50000),
      tokens: Math.ceil(content.split(/\s+/).length * 1.3),
      sections: ['Invalid JSON - treating as text']
    };
  }
}

function parseJson(content: string): ParsedFile {
  try {
    const jsonData = JSON.parse(content);
    const tokens = Math.ceil(content.split(/\s+/).length * 1.3);
    
    return {
      name: jsonData.name || jsonData.title || 'JSON Document',
      type: 'json',
      content: JSON.stringify(jsonData, null, 2).substring(0, 50000),
      tokens,
      sections: Object.keys(jsonData).slice(0, 20).map(key => `${key}: ${typeof jsonData[key] === 'object' ? 'Object' : jsonData[key]}`)
    };
  } catch {
    return {
      name: 'Invalid JSON',
      type: 'json',
      content: content.substring(0, 50000),
      tokens: 0,
      sections: ['Invalid JSON format']
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const content = formData.get('content') as string | null;
    const userId = formData.get('userId') as string || 'anonymous';

    let fileContent = '';
    let fileName = 'untitled';

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          error: 'File too large. Maximum size is 5MB'
        }, { status: 400 });
      }

      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json({
          error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
        }, { status: 400 });
      }

      fileContent = await file.text();
      fileName = file.name;
    } else if (content) {
      fileContent = content;
      const typeMatch = content.match(/"type"\s*:\s*"(\w+)"/);
      if (typeMatch) {
        fileName = `input.${typeMatch[1]}`;
      }
    } else {
      return NextResponse.json({
        error: 'No file or content provided'
      }, { status: 400 });
    }

    const extension = fileName.split('.').pop()?.toLowerCase();
    let parsed: ParsedFile;

    switch (extension) {
      case 'md':
      case 'markdown':
        parsed = parseMarkdown(fileContent);
        break;
      case 'skill':
        parsed = parseSkillFile(fileContent);
        break;
      case 'json':
        parsed = parseJson(fileContent);
        break;
      default:
        parsed = {
          name: fileName,
          type: 'text',
          content: fileContent.substring(0, 50000),
          tokens: Math.ceil(fileContent.split(/\s+/).length * 1.3),
          sections: []
        };
    }

    parsed.name = fileName;

    return NextResponse.json({
      success: true,
      file: parsed,
      summary: {
        name: parsed.name,
        type: parsed.type,
        tokens: parsed.tokens,
        sectionsCount: parsed.sections.length,
        contentLength: parsed.content.length
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to process file',
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    usage: {
      POST: {
        file: 'Upload file (form-data)',
        content: 'Raw content string',
        userId: 'User identifier'
      },
      allowedExtensions: ALLOWED_EXTENSIONS,
      maxSize: '5MB'
    }
  });
}
