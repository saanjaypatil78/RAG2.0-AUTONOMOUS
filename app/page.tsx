'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  images?: string[];
  file?: { name: string; type: string };
  timestamp: Date;
  memorySaved?: boolean;
}

interface FileData {
  name: string;
  type: string;
  content: string;
}

const MODELS = [
  { id: 'tier1', name: '🔥 Kimi K2.5', desc: '#1 Best - 913B tokens', provider: 'NVIDIA' },
  { id: 'tier2', name: '⚡ Trinity Large', desc: '#2 Great - 534B tokens', provider: 'OpenRouter' },
  { id: 'tier3', name: '🚀 Gemini 3 Flash', desc: '#3 Fast - 470B tokens', provider: 'OpenRouter' },
  { id: 'fallback', name: '🧠 DeepSeek R1', desc: 'Reasoning - 100B tokens', provider: 'OpenRouter' },
  { id: 'auto', name: '🤖 Auto Select', desc: 'Smart routing based on task', provider: 'AI' },
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [enableMemory, setEnableMemory] = useState(true);
  const [showMemory, setShowMemory] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<FileData | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, []);

  const loadMemories = async () => {
    try {
      const response = await fetch(`/api/memory?userId=${userId}`);
      const data = await response.json();
      setMemories(data.memories || []);
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  useEffect(() => {
    if (showMemory) {
      loadMemories();
    }
  }, [showMemory, userId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId);

    setLoading(true);
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.success) {
        setUploadedFile(data.file);
      } else {
        alert(data.error || 'Failed to process file');
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    let processed = 0;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`Image ${file.name} is too large. Max 5MB.`);
        processed++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        newImages.push(result);
        processed++;
        
        if (processed === files.length) {
          setUploadedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && uploadedImages.length === 0) || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      images: uploadedImages.length > 0 ? uploadedImages : undefined,
      file: uploadedFile ? { name: uploadedFile.name, type: uploadedFile.type } : undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedImages([]);
    setUploadedFile(null);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage.content || 'Describe these images',
          userId,
          model: model === 'auto' ? null : model,
          images: uploadedImages,
          enableMemory,
          fileContent: uploadedFile?.content,
          fileName: uploadedFile?.name
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          model: data.model,
          timestamp: new Date(),
          memorySaved: data.memorySaved
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error: ${data.error}\n\n${data.details || ''}`,
          model: 'Error',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Failed to connect. Please try again.',
        model: 'Error',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const currentModel = MODELS.find(m => m.id === model);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        background: '#111',
        borderRight: '1px solid #222',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <h1 style={{ 
          fontSize: '1.3rem', 
          background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '20px'
        }}>
          🤖 RAG2.0 AGI
        </h1>

        {/* Memory Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '15px',
          padding: '10px',
          background: enableMemory ? 'rgba(0,212,255,0.1)' : '#1a1a1a',
          borderRadius: '8px',
          border: enableMemory ? '1px solid #00d4ff' : '1px solid #333'
        }}>
          <span style={{ fontSize: '0.85rem' }}>🧠 Memory</span>
          <button
            onClick={() => setEnableMemory(!enableMemory)}
            style={{
              background: enableMemory ? '#00d4ff' : '#333',
              border: 'none',
              borderRadius: '12px',
              width: '40px',
              height: '22px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <span style={{
              position: 'absolute',
              left: enableMemory ? '22px' : '2px',
              top: '2px',
              width: '18px',
              height: '18px',
              background: '#fff',
              borderRadius: '50%',
              transition: 'left 0.2s'
            }} />
          </button>
        </div>

        {/* View Memories Button */}
        <button
          onClick={() => setShowMemory(!showMemory)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#1a1a1a',
            border: '1px solid #333',
            borderRadius: '8px',
            color: '#fff',
            cursor: 'pointer',
            marginBottom: '15px',
            fontSize: '0.85rem'
          }}
        >
          📚 View Memories ({memories.length})
        </button>

        {/* Model Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#888', fontSize: '0.75rem', marginBottom: '8px', display: 'block' }}>
            Model
          </label>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowModels(!showModels)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.85rem'
              }}
            >
              {currentModel?.name} ▼
            </button>
            
            {showModels && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                marginTop: '4px',
                zIndex: 10,
                maxHeight: '250px',
                overflow: 'auto'
              }}>
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setModel(m.id);
                      setShowModels(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: model === m.id ? '#2a2a2a' : 'transparent',
                      border: 'none',
                      color: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderBottom: '1px solid #222',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: '#888' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          background: '#1a1a1a', 
          padding: '15px', 
          borderRadius: '8px',
          fontSize: '0.75rem',
          color: '#888'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={{ color: '#00d4ff' }}>●</span> Memory: {enableMemory ? 'ON' : 'OFF'}
          </div>
          <div>
            <span style={{ color: '#7c3aed' }}>●</span> Session: {messages.length} messages
          </div>
        </div>

        <div style={{ marginTop: 'auto', fontSize: '0.7rem', color: '#555' }}>
          Powered by NVIDIA + OpenRouter
        </div>
      </aside>

      {/* Main Chat Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Chat Messages */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: '#555',
              marginTop: '80px'
            }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Welcome to RAG2.0 AGI</h2>
              <p style={{ marginBottom: '20px' }}>ChatGPT-level chatbot with persistent memory</p>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                justifyContent: 'center', 
                gap: '10px',
                fontSize: '0.8rem'
              }}>
                <span style={{ background: '#222', padding: '5px 12px', borderRadius: '15px' }}>📷 Image Analysis</span>
                <span style={{ background: '#222', padding: '5px 12px', borderRadius: '15px' }}>🧠 Memory</span>
                <span style={{ background: '#222', padding: '5px 12px', borderRadius: '15px' }}>📄 File Upload</span>
                <span style={{ background: '#222', padding: '5px 12px', borderRadius: '15px' }}>⚡ Smart Routing</span>
              </div>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '15px',
                borderRadius: '12px',
                background: msg.role === 'user' ? '#0070f3' : '#1a1a1a',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {msg.images && msg.images.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '5px', 
                    marginBottom: '10px' 
                  }}>
                    {msg.images.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt="Uploaded" 
                        style={{ 
                          maxWidth: '150px', 
                          maxHeight: '150px', 
                          borderRadius: '8px' 
                        }} 
                      />
                    ))}
                  </div>
                )}
                
                {msg.file && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#ffd700', 
                    marginBottom: '8px',
                    padding: '5px 10px',
                    background: 'rgba(255,215,0,0.1)',
                    borderRadius: '4px'
                  }}>
                    📄 {msg.file.name}
                  </div>
                )}
                
                {msg.content}
                
                <div style={{ 
                  fontSize: '0.65rem', 
                  color: '#888', 
                  marginTop: '8px',
                  borderTop: '1px solid #333',
                  paddingTop: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{msg.model}</span>
                  <span>
                    {msg.memorySaved && '💾 Memory saved'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '15px', borderRadius: '12px', background: '#1a1a1a' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={dotStyle}>●</span>
                  <span style={{ ...dotStyle, animationDelay: '0.2s' }}>●</span>
                  <span style={{ ...dotStyle, animationDelay: '0.4s' }}>●</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Uploaded Images Preview */}
        {uploadedImages.length > 0 && (
          <div style={{
            padding: '10px 20px',
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            borderTop: '1px solid #222'
          }}>
            {uploadedImages.map((img, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={img} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    background: '#f00',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded File Preview */}
        {uploadedFile && (
          <div style={{
            padding: '10px 20px',
            borderTop: '1px solid #222',
            fontSize: '0.8rem'
          }}>
            📄 {uploadedFile.name} (processed)
          </div>
        )}

        {/* Input Area */}
        <form 
          onSubmit={handleSubmit}
          style={{
            padding: '20px',
            borderTop: '1px solid #222',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            {/* Image Upload Button */}
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              style={{
                padding: '10px 15px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
              title="Upload images"
            >
              🖼️
            </button>

            {/* File Upload Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".md,.markdown,.skill,.json,.txt"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{
                padding: '10px 15px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '1.2rem'
              }}
              title="Upload .md, .skill, .json files"
            >
              📄
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message RAG2.0 AGI..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '15px',
                borderRadius: '12px',
                border: '1px solid #333',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                resize: 'none',
                minHeight: '50px',
                maxHeight: '200px'
              }}
            />
            <button
              type="submit"
              disabled={loading || (!input.trim() && uploadedImages.length === 0)}
              style={{
                padding: '15px 25px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? '#333' : 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              {loading ? '...' : '➤'}
            </button>
          </div>
        </form>
      </main>

      {/* Memory Panel */}
      {showMemory && (
        <div style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 0,
          width: '350px',
          background: '#111',
          borderLeft: '1px solid #333',
          padding: '20px',
          overflow: 'auto',
          zIndex: 100
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>🧠 Memories</h2>
            <button onClick={() => setShowMemory(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
          </div>
          
          {memories.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center' }}>No memories yet. Tell me to remember something!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memories.map((mem, i) => (
                <div key={i} style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  {mem.content}
                  <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
                    Type: {mem.memory_type} | Importance: {mem.importance}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const dotStyle: React.CSSProperties = {
  color: '#888',
  animation: 'bounce 1.4s infinite ease-in-out',
  fontSize: '0.8rem'
};
