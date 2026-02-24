# RAG2.0 AGI - Ultimate Autonomous Intelligence System

<p align="center">
  <img src="https://img.shields.io/badge/Version-2.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Deploy-Vercel-000.svg" alt="Vercel">
  <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License">
</p>

> **AGI System** - Single API key via Vercel AI Gateway. No multiple keys needed. Beats benchmarks.

## Features

- **Single API Key** - Vercel AI Gateway provides unified access to ALL providers
- **Auto-Select Models** - Intelligent model selection based on task type
- **Sequential Thinking** - Deep reasoning engine built-in
- **Comprehensive Knowledge** - Science, History, Geography, Civics, Economics, Languages
- **AGI Architecture** - Multi-tier intelligence system
- **MCP Ready** - Sequential thinking MCP integration

## Architecture

```
RAG2.0-AGI/
├── core/
│   ├── agi/                 # AGI System
│   │   └── unified_agi.py   # Single key for ALL LLMs
│   ├── rag/                 # RAG System
│   ├── memory/              # Second Brain
│   └── knowledge/           # Domain Knowledge
├── tools/
│   └── adapters/            # Tool integrations
├── integrations/
│   └── opensource.py        # Open Source Tools
├── app/
│   └── api/agi/            # Vercel API Route
└── vercel.json             # Vercel Config
```

## Quick Start

```python
from core.agi.unified_agi import create_agi_system

# Single API key for ALL models!
agi = create_agi_system()

# Auto-select best model
model = agi.select_model("complex reasoning")
print(f"Selected: {model}")

# Generate with unified API
result = await agi.generate("Explain quantum entanglement", model=model)

# Sequential thinking
analysis = agi.think_sequentially("How to solve climate change?")

# Search knowledge
results = agi.search_knowledge("quantum physics")
```

## Single API Key - How It Works

Instead of managing multiple keys:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- etc.

**You only need ONE:**
```bash
VERCEL_AI_GATEWAY_KEY=your_gateway_key
```

This gives access to:
- OpenAI (GPT-4, o3)
- Anthropic (Claude)
- Google (Gemini)
- Meta (Llama)
- Qwen
- And many more...

## Model Selection

| Mode | Model | Best For |
|------|-------|----------|
| `fast` | GPT-4O Mini | Quick tasks |
| `reasoning` | Claude Opus | Deep analysis |
| `code` | o3 | Complex code |
| `research` | Gemini 2.0 | Web search |

## Knowledge Domains

| Domain | Coverage |
|--------|----------|
| **Science** | Physics, Chemistry, Biology, Astronomy |
| **History** | Ancient, Medieval, Modern, World |
| **Geography** | Physical, Human, Regional |
| **Civics** | Political Systems, Governance, Rights |
| **Economics** | Micro, Macro, International, Crypto |
| **Languages** | 50+ Languages, Grammar, Ancient/Modern |
| **Philosophy** | Branches, Schools, Thinkers |
| **Psychology** | Branches, Concepts, Disorders |

## Deployment

### Vercel Deployment

```bash
# 1. Install dependencies
npm install

# 2. Set environment variable in Vercel Dashboard
# Go to Project Settings > Environment Variables
# Add: VERCEL_AI_GATEWAY_KEY = your_gateway_key

# 3. Deploy
vercel --prod --yes
```

### Live Status

- **GitHub**: https://github.com/saanjaypatil78/RAG2.0-AUTONOMOUS
- **Vercel**: https://rag2-autonomous-jatrdoha5-sanjay-santosh-patil-s-projects.vercel.app ✅ LIVE

### Environment Variables

Add these in Vercel Dashboard > Settings > Environment Variables:

```bash
# Required for Free AI Models (choose ONE or BOTH):
NVIDIA_API_KEY=nv-xxx...        # Get from https://build.nvidia.com (FREE!)
OPENROUTER_API_KEY=sk-or-xxx... # Get from https://openrouter.ai (FREE!)

# Optional - Google OAuth:
GOOGLE_CLIENT_ID=xxx...
GOOGLE_CLIENT_SECRET=xxx...

# Already configured:
VERCEL_AI_GATEWAY_KEY=your_gateway_key
```

## FREE API Keys Setup

### 1. NVIDIA (Recommended - Best Models!)
1. Go to https://build.nvidia.com
2. Sign up with Google/Email
3. Verify phone number
4. Generate API key
5. Use for Kimi K2.5 (TOP TIER!)

### 2. OpenRouter (Alternative)
1. Go to https://openrouter.ai
2. Sign up for free tier
3. Get API key
4. Access Claude, GPT, DeepSeek R1, Qwen Coder

```bash
# Vercel AI Gateway - SINGLE KEY for all providers!
VERCEL_AI_GATEWAY_KEY=vg_xxx...

# Optional: Direct keys (fallback)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## API Usage

```bash
# Call the AGI API
curl -X POST https://your-app.vercel.app/api/agi \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum entanglement",
    "mode": "reasoning"
  }'
```

## Knowledge Search Example

```python
# Search across all domains
results = agi.search_knowledge("quantum physics")
# Returns: physics, chemistry topics related to quantum

results = agi.search_knowledge("world war 2")
# Returns: history, modern era

results = agi.search_knowledge("democracy")
# Returns: civics, political systems
```

## Sequential Thinking

```python
analysis = agi.think_sequentially(
    "What are the best strategies for economic development?",
    depth=5
)
# Returns step-by-step reasoning
```

## What's New in v2.0

- Single API key via Vercel AI Gateway
- AGI-style auto model selection
- Sequential thinking engine
- Expanded knowledge base (50+ languages)
- Vercel deployment ready
- MCP sequential thinking integration
- **One-click deployment from GitHub**

## One-Click Deploy

Deploy any GitHub repo to Vercel in one command!

### Python (Recommended)

```bash
# Install dependencies
pip install requests

# Run one-click deploy
python vercel_oneclick_deploy.py --vercel-token YOUR_TOKEN --repo owner/repo

# Example
python vercel_oneclick_deploy.py -v vercel_xxx -r saanjaypatil78/myapp -p myapp
```

### Or use environment variables

```bash
export VERCEL_TOKEN=your_vercel_token
python vercel_oneclick_deploy.py --repo username/repo
```

### Get Vercel Token
1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Use it with --vercel-token flag

### Rust Version (Alternative)

```bash
cd rust-deploy
cargo build --release
./target/release/vercel-deploy --vercel-token TOKEN --repo owner/repo
```

## License

MIT

---

**RAG2.0 AGI** - One Key. Infinite Intelligence.
