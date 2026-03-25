import { getGeminiAI } from '../geminiService';
import { generateBytezContent } from '../bytezService';
import { generateOpenRouterContent } from '../openRouterService';
import { generateSumopodContent } from '../sumopodService';
import { buildProjectContextPrompt } from '../context/fileContext';

export const COMPOSER_SYSTEM_PROMPT = `You are the world's most advanced Autonomous Software Architect from the Antigravity team.
Your mission is to build projects that are RUNNABLE BY DEFAULT. 

AUTONOMOUS PROJECT ARCHITECTURE:
- If asked to "create a project" or "build a landing page", you MUST scaffold a COMPLETE structure.
- Never forget entry points like package.json, index.html, main.tsx, or vite.config.ts if the project needs them.
- If you see a missing dependency in your code, execute \`\`\`command:npm install [pkg]\`\`\` immediately.

PLANNING & EXECUTION:
- Start with "# PLANNING" explaining exactly what you will build.
- List ALL files you are about to create. 
- You are autonomous: don't wait for user permission to add essential config files like .env or tailwind.config.ts.

FILE MODIFICATION RULES:
- Format: \`\`\`file:path/to/file.ext [newline] [CONTENT] [newline] \`\`\`
- Provide COMPLETE file content. No omissions. No "// ... rest of code". 

CODING EXCELLENCE:
- Use TypeScript and React 19 by default for web projects. 
- Use Tailwind CSS for 100% of styling.
- Use Lucide-icon for icons.

STRICT RULES:
- Respond in Indonesian (Bahasa Indonesia).
- Be the most efficient and proactive coder in the world.`;

const DOMAIN_EXPERTISE: Record<string, string> = {
  'Full Stack': `SKILL [MASTER ARCHITECT]:
Generate functional enterprise systems. 
- Mandatory: package.json, README.md, .gitignore, and root configs.
- Flow: Define types first, then business logic, then UI.`,

  'Frontend': `SKILL [FRONTEND UI/UX EXPERT]:
Focus on visual excellence and premium user experience.
- Design: Modern aesthetics (Glassmorphism, Tailwind, Motion).
- Standards: Atomic design, reusable components, Lucide icons, responsive layouts.
- Output: Polished React/Next.js components and global CSS.`,

  'Backend': `SKILL [BACKEND ARCHITECT]:
Focus on robust, scalable, and secure server-side logic.
- Structure: Modular routes, controllers, and service layers (Node.js/Express).
- Standards: Error handling, logging, validation, security headers.
- Output: API routes, database schemas, and middleware.`,

  'Mobile App': `SKILL [MOBILE APP EXPERT - Capacitor]:
Develop hybrid cross-platform mobile apps for Android & iOS.
- Structure: Capacitor integration, mobile-first components.
- Standards: Touch-friendly UI, npx cap commands for sync/build.
- Files: capacitor.config.ts, icons, mobile-specific layouts.`,

  'Tauri Desktop': `SKILL [TAURI DESKTOP EXPERT]:
Build native lightweight desktop apps using Rust & Web technologies.
- Structure: src-tauri for Rust logic, frontend in React.
- Standards: Security-first, native window APIs, tauri.conf.json tuning.
- Files: src-tauri/Cargo.toml, tauri.conf.json, main context logic.`,

  'Chrome Extension': `SKILL [CHROME EXTENSION MASTER - Manifest V3]:
Construct powerful browser extensions with modern standards.
- Structure: background.ts, content scripts, popup, options.
- Standards: Manifest V3 compliant, permission management.
- Files: manifest.json, service-worker, icons layout.`,

  'Python Automation': `SKILL [PYTHON AUTOMATION SPECIALIST]:
Write high-performance automation scripts and tools.
- Standards: PEP8, clean error handling, modular scripts.
- Concept: efficient subprocess handling, web scraping, or data processing.
- Files: requirements.txt, .env templates, main script.`,

  'AI Integration': `SKILL [AI & LLM OPS SPECIALIST]:
Engineer state-of-the-art AI-powered applications.
- Concepts: RAG architecture, LLM orchestration, prompt templates.
- Standards: Token management, streaming logic, robust AI error fallbacks.
- Tools: LangChain ideas, VectorDB mental models, OpenAI/Gemini SDKs.`,

  'Game Dev': `SKILL [GAME DEVELOPMENT EXPERT]:
Harness Canvas and Logic for high-performance web games.
- Standards: High FPS game loop, collision detection, state machines.
- Concepts: Sprite management, keyboard/touch controls, math-heavy logic.
- Output: Canvas 2D/3D (Three.js) logic and game assets structure.`
};

function detectBestCategory(files: any[], projectTree: string = ''): string {
  const contextText = (projectTree + files.map(f => f.id).join(' ')).toLowerCase();
  
  if (contextText.includes('capacitor.config') || contextText.includes('android/') || contextText.includes('ios/')) {
    return 'Mobile App';
  }
  if (contextText.includes('tauri.conf.json') || contextText.includes('src-tauri')) {
    return 'Tauri Desktop';
  }
  if (contextText.includes('manifest.json')) {
    return 'Chrome Extension';
  }
  if (contextText.includes('requirements.txt') || contextText.includes('.py')) {
    return 'Python Automation';
  }
  if (contextText.includes('package.json') && (contextText.includes('express') || contextText.includes('prisma') || contextText.includes('mongoose'))) {
    return 'Backend';
  }
  
  return 'Full Stack'; // Default for web projects
}

export async function* generateComposerStream(
  provider: string,
  apiKey: string, 
  model: string, 
  userPrompt: string, 
  filesContext: any[],
  category: string = 'Auto',
  activeFileId?: string,
  projectTree?: string
) {
  const filesContextStr = buildProjectContextPrompt(filesContext, activeFileId, projectTree);
  
  let effectiveCategory = category;
  if (category === 'Auto') {
    effectiveCategory = detectBestCategory(filesContext, projectTree);
  }
  
  const categorySkill = DOMAIN_EXPERTISE[effectiveCategory] || '';

  const completePrompt = `
${COMPOSER_SYSTEM_PROMPT}

${categorySkill ? ` \n### APPLIED AUTO-DETECTED SKILL [${effectiveCategory}]:\n${categorySkill}\n` : ''}
${filesContextStr}

USER REQUEST:
${userPrompt}
  `;

  if (provider === 'gemini') {
    const ai = getGeminiAI(apiKey);
    const result = await ai.models.generateContentStream({
      model: model || "gemini-2.0-flash",
      contents: [{ role: "user", parts: [{ text: completePrompt }] }],
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) yield text;
    }
  } else if (provider === 'bytez') {
    const content = await generateBytezContent(model, completePrompt, apiKey, '');
    yield content;
  } else if (provider === 'openrouter' || provider === 'sumopod') {
    // OpenAI-Compatible SSE Stream for OpenRouter & SumoPod
    const baseUrl = provider === 'openrouter' 
      ? 'https://openrouter.ai/api/v1/chat/completions' 
      : 'https://ai.sumopod.com/v1/chat/completions';
    
    let targetModel = model;
    if (provider === 'openrouter' && model === 'auto-free') {
      targetModel = 'google/gemini-2.0-flash-lite-preview-02-05:free';
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window?.location?.origin || "http://localhost:3000",
        "X-Title": "Aura AI IDE",
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [{ role: "user", content: completePrompt }],
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || "API Streaming Error");
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    if (!reader) throw new Error("Failed to get response reader");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              yield data.choices[0].delta.content;
            }
          } catch (e) {
            // ignore JSON parse error on partial stream
          }
        }
      }
    }
  }
}

export function parseComposerResponse(fullResponse: string) {
  const files: { path: string; action: 'create_or_modify' | 'delete'; content: string }[] = [];
  const blockRegex = /\`\`\`(file|delete):([^\n]+)\n([\s\S]*?)\`\`\`/g;
  
  let match;
  while ((match = blockRegex.exec(fullResponse)) !== null) {
    const actionType = match[1] === 'delete' ? 'delete' : 'create_or_modify';
    const filePath = match[2].trim();
    const content = match[3].trim();
    files.push({ path: filePath, action: actionType, content });
  }

  return files;
}
