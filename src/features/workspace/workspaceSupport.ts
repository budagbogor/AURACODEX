import { readDir, readTextFile } from '@tauri-apps/plugin-fs';
import type { FileItem } from '@/types';
import { AURA_COLLECTIVE, DEVELOPER_TASK_PRESETS } from '@/utils/constants';

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  'target'
]);

const TEXT_FILE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'json', 'jsonc', 'css', 'scss', 'sass', 'less',
  'html', 'htm', 'md', 'mdx', 'txt', 'yml', 'yaml', 'toml', 'env', 'gitignore', 'npmrc',
  'sh', 'ps1', 'bat', 'cmd', 'rs', 'py', 'java', 'kt', 'go', 'c', 'cpp', 'h', 'hpp', 'cs',
  'php', 'rb', 'swift', 'sql', 'prisma', 'xml', 'svg', 'lock'
]);

const TEXT_ATTACHMENT_EXTENSIONS = new Set([
  'txt', 'md', 'mdx', 'json', 'jsonc', 'ts', 'tsx', 'js', 'jsx', 'css', 'scss', 'sass', 'less',
  'html', 'htm', 'yml', 'yaml', 'toml', 'env', 'gitignore', 'npmrc', 'sh', 'ps1', 'bat', 'cmd',
  'rs', 'py', 'java', 'kt', 'go', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'swift', 'sql',
  'prisma', 'xml', 'svg'
]);

export type ExplorerNode = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  fileId?: string;
  children?: ExplorerNode[];
};

export type WorkspaceHealthIssue = {
  severity: 'warning' | 'error';
  title: string;
  detail: string;
};

export type AiActivityEntry = {
  id: string;
  title: string;
  summary: string;
  files: string[];
  domains?: string[];
  suggestedCommands?: Array<{
    label: string;
    command: string;
    reason: string;
  }>;
  createdAt: number;
  status?: 'planning' | 'working' | 'done' | 'error';
  steps?: Array<{
    label: string;
    detail: string;
    status: 'planning' | 'working' | 'done' | 'error';
  }>;
};

export type AiGeneratedFile = {
  absolutePath: string;
  relativePath: string;
  name: string;
  content: string;
  language: string;
};

export type HeaderMenuKey = 'file' | 'edit' | 'view' | 'terminal' | 'git' | 'ai' | 'help';

export const AI_ACTIVITY_TAB_ID = '__aura_ai_activity__';
export const PREVIEW_TAB_ID = '__aura_preview__';

export const CODING_MODEL_PRIORITIES: Record<string, string[]> = {
  sumopod: ['seed-2-0-pro', 'gpt-5.1-codex-mini', 'gpt-5.2-codex'],
  openrouter: ['qwen/qwen3-coder:free', 'mistralai/devstral-small-2505:free', 'x-ai/grok-code-fast-1'],
  bytez: ['Qwen/Qwen2.5-Coder-32B-Instruct', 'deepseek-ai/DeepSeek-R1', 'google/gemini-2.5-pro'],
  puter: ['openrouter:qwen/qwen3-coder:free', 'openrouter:mistralai/devstral-small-2505:free', 'openrouter:anthropic/claude-sonnet-4.5'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-thinking-exp', 'gemini-2.0-pro-exp-02-05'],
  ollama: ['qwen2.5-coder', 'deepseek-coder', 'codellama']
};

export const CODING_MODEL_LABELS: Record<string, string> = {
  'seed-2-0-pro': 'Cheapest Coding',
  'gpt-5-mini': 'Balanced Dev',
  'gpt-5.1-codex': 'Best Coding',
  'gpt-5.1-codex-mini': 'Balanced Dev',
  'gpt-5.2-codex': 'Best Coding',
  'qwen/qwen3-coder:free': 'Cheapest Coding',
  'mistralai/devstral-small-2505:free': 'Balanced Dev',
  'x-ai/grok-code-fast-1': 'Best Coding',
  'Qwen/Qwen2.5-Coder-32B-Instruct': 'Cheapest Coding',
  'deepseek-ai/DeepSeek-R1': 'Balanced Dev',
  'google/gemini-2.5-pro': 'Best Coding',
  'openrouter:qwen/qwen3-coder:free': 'Cheapest Coding',
  'openrouter:mistralai/devstral-small-2505:free': 'Balanced Dev',
  'openrouter:anthropic/claude-sonnet-4.5': 'Best Coding',
  'gemini-2.0-flash': 'Cheapest Coding',
  'gemini-2.0-flash-thinking-exp': 'Balanced Dev',
  'gemini-2.0-pro-exp-02-05': 'Best Coding',
  'qwen2.5-coder': 'Cheapest Coding',
  'deepseek-coder': 'Balanced Dev',
  'codellama': 'Best Coding'
};

export const PUTER_MODEL_FALLBACKS = [
  { id: 'openrouter:qwen/qwen3-coder:free', name: 'OpenRouter | Qwen 3 Coder (Free) via Puter.js' },
  { id: 'openrouter:mistralai/devstral-small-2505:free', name: 'OpenRouter | Devstral Small (Free) via Puter.js' },
  { id: 'openrouter:x-ai/grok-code-fast-1', name: 'OpenRouter | Grok Code Fast 1 via Puter.js' },
  { id: 'openrouter:anthropic/claude-sonnet-4.5', name: 'OpenRouter | Claude Sonnet 4.5 via Puter.js' },
  { id: 'openrouter:openai/gpt-4o-mini', name: 'OpenRouter | GPT-4o Mini via Puter.js' },
  { id: 'openrouter:meta-llama/llama-3.1-8b-instruct', name: 'OpenRouter | Llama 3.1 8B via Puter.js' }
];

export const SUMOPOD_MODEL_FALLBACKS = [
  { id: 'seed-2-0-mini', name: 'Seed 2.0 Mini (90% Off)', provider: 'byteplus', inputPrice: 0.01, outputPrice: 0.04, context: 256000 },
  { id: 'seed-2-0-lite', name: 'Seed 2.0 Lite (90% Off)', provider: 'byteplus', inputPrice: 0.03, outputPrice: 0.2, context: 256000 },
  { id: 'MiniMax-M2.7-highspeed', name: 'MiniMax M2.7 Highspeed (90% Off)', provider: 'minimax', inputPrice: 0.03, outputPrice: 0.12, context: 204800 },
  { id: 'seed-2-0-pro', name: 'Seed 2.0 Pro (90% Off)', provider: 'byteplus', inputPrice: 0.05, outputPrice: 0.3, context: 256000 },
  { id: 'text-embedding-3-small', name: 'Text Embedding 3 Small', provider: 'openai', inputPrice: 0.02, outputPrice: 0, context: 8191 },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', inputPrice: 0.05, outputPrice: 0.4, context: 272000 },
  { id: 'gemini/gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'google', inputPrice: 0.07, outputPrice: 0.3, context: 1048576 },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', provider: 'openai', inputPrice: 0.1, outputPrice: 0.4, context: 1047576 },
  { id: 'gemini/gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google', inputPrice: 0.1, outputPrice: 0.4, context: 1048576 },
  { id: 'gemini/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', provider: 'google', inputPrice: 0.1, outputPrice: 0.4, context: 1048576 },
  { id: 'glm-5', name: 'GLM 5', provider: 'z.ai', inputPrice: 0.1, outputPrice: 0.32, context: 200000 },
  { id: 'glm-5.1', name: 'GLM 5.1', provider: 'z.ai', inputPrice: 0.1, outputPrice: 0.32, context: 200000 },
  { id: 'glm-5-turbo', name: 'GLM 5 Turbo', provider: 'z.ai', inputPrice: 0.12, outputPrice: 0.4, context: 200000 },
  { id: 'text-embedding-3-large', name: 'Text Embedding 3 Large', provider: 'openai', inputPrice: 0.13, outputPrice: 0, context: 8191 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', inputPrice: 0.15, outputPrice: 0.6, context: 128000 },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini', provider: 'openai', inputPrice: 0.25, outputPrice: 2, context: 272000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', inputPrice: 0.25, outputPrice: 2, context: 272000 },
  { id: 'deepseek-v3-2', name: 'DeepSeek V3.2', provider: 'byteplus', inputPrice: 0.28, outputPrice: 0.42, context: 96000 },
  { id: 'gemini/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google', inputPrice: 0.3, outputPrice: 2.5, context: 1048576 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'openai', inputPrice: 0.4, outputPrice: 1.6, context: 1047576 },
  { id: 'gemini/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', provider: 'google', inputPrice: 0.5, outputPrice: 3, context: 1048576 },
  { id: 'glm-4-7', name: 'GLM 4.7', provider: 'byteplus', inputPrice: 0.6, outputPrice: 2.2, context: 200000 },
  { id: 'kimi-k2-5-260127', name: 'Kimi K2.5 260127', provider: 'byteplus', inputPrice: 0.6, outputPrice: 3, context: 256000 },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', provider: 'anthropic', inputPrice: 1, outputPrice: 5, context: 200000 },
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai', inputPrice: 1.25, outputPrice: 10, context: 272000 },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai', inputPrice: 1.25, outputPrice: 10, context: 272000 },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex', provider: 'openai', inputPrice: 1.25, outputPrice: 10, context: 272000 },
  { id: 'gemini/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google', inputPrice: 1.25, outputPrice: 10, context: 1048576 },
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'openai', inputPrice: 1.75, outputPrice: 14, context: 272000 },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex', provider: 'openai', inputPrice: 1.75, outputPrice: 14, context: 272000 },
  { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', inputPrice: 2, outputPrice: 8, context: 1047576 },
  { id: 'gemini/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', provider: 'google', inputPrice: 2, outputPrice: 12, context: 1048576 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', inputPrice: 2.5, outputPrice: 10, context: 128000 }
];

export const normalizePath = (value: string) => value.replace(/\\/g, '/').replace(/\/+/g, '/');

export const getLanguageByExtension = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'css':
    case 'scss':
    case 'sass':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'rs':
      return 'rust';
    case 'py':
      return 'python';
    default:
      return 'text';
  }
};

const shouldLoadFile = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower === '.env' || lower === '.gitignore') return true;
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  return TEXT_FILE_EXTENSIONS.has(ext);
};

export const isTextAttachmentName = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower === '.env' || lower === '.gitignore') return true;
  const ext = lower.includes('.') ? lower.split('.').pop() || '' : '';
  return TEXT_ATTACHMENT_EXTENSIONS.has(ext);
};

export const shouldIgnorePath = (path: string) => {
  const normalized = normalizePath(path);
  return (
    normalized.includes('/src-tauri/target') ||
    Array.from(IGNORED_DIRECTORIES).some((dir) => normalized.includes(`/${dir}/`) || normalized.endsWith(`/${dir}`))
  );
};

export async function readWorkspaceFiles(rootPath: string) {
  const walk = async (dir: string): Promise<FileItem[]> => {
    const entries = await readDir(dir);
    const loaded: FileItem[] = [];

    for (const entry of entries) {
      if (!entry.name) continue;
      const entryPath = normalizePath(`${dir}/${entry.name}`);

      if (entry.isDirectory) {
        if (IGNORED_DIRECTORIES.has(entry.name) || shouldIgnorePath(entryPath)) {
          continue;
        }
        loaded.push(...await walk(entryPath));
        continue;
      }

      if (!entry.isFile || !shouldLoadFile(entry.name)) continue;

      try {
        const content = await readTextFile(entryPath);
        loaded.push({
          id: entryPath,
          path: entryPath,
          name: entry.name,
          content,
          language: getLanguageByExtension(entry.name),
          lastModified: Date.now()
        });
      } catch (error) {
        console.warn('[AURA] Skipping unreadable file:', entryPath, error);
      }
    }

    return loaded;
  };

  return walk(rootPath);
}

export async function readWorkspaceFolders(rootPath: string) {
  const folders = new Set<string>();

  const walk = async (dir: string): Promise<void> => {
    const entries = await readDir(dir);

    for (const entry of entries) {
      if (!entry.name || !entry.isDirectory) continue;
      const entryPath = normalizePath(`${dir}/${entry.name}`);
      folders.add(entryPath);

      if (entry.name === '.git' || entry.name === 'target' || entry.name === 'node_modules') {
        continue;
      }

      await walk(entryPath);
    }
  };

  await walk(rootPath);
  return Array.from(folders);
}

export const detectWorkspacePackageManager = (files: FileItem[]) => {
  const fileNames = files.map((file) => file.name.toLowerCase());

  if (fileNames.includes('pnpm-lock.yaml')) {
    return { label: 'pnpm', installCommand: 'pnpm install', devCommand: 'pnpm dev', buildCommand: 'pnpm build' };
  }
  if (fileNames.includes('yarn.lock')) {
    return { label: 'yarn', installCommand: 'yarn install', devCommand: 'yarn dev', buildCommand: 'yarn build' };
  }
  if (fileNames.includes('bun.lock') || fileNames.includes('bun.lockb')) {
    return { label: 'bun', installCommand: 'bun install', devCommand: 'bun run dev', buildCommand: 'bun run build' };
  }

  return { label: 'npm', installCommand: 'npm install', devCommand: 'npm run dev', buildCommand: 'npm run build' };
};

export const detectWorkspacePackageManagerAt = (
  files: FileItem[],
  rootPath?: string | null,
  packageRelativeRoot = ''
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const normalizedPackageRoot = normalizePath(packageRelativeRoot).replace(/^\/+|\/+$/g, '');
  const scopedFileNames = files
    .map((file) => getRelativeFilePath(file.path || file.id, normalizedRoot))
    .filter((relativePath) => {
      if (!normalizedPackageRoot) return !relativePath.includes('/');
      return relativePath.startsWith(`${normalizedPackageRoot}/`);
    })
    .map((relativePath) => relativePath.split('/').pop()?.toLowerCase() || '');

  if (scopedFileNames.includes('pnpm-lock.yaml')) {
    return {
      label: 'pnpm',
      installCommand: normalizedPackageRoot ? `pnpm --dir ${normalizedPackageRoot} install` : 'pnpm install',
      devCommand: normalizedPackageRoot ? `pnpm --dir ${normalizedPackageRoot} dev` : 'pnpm dev',
      buildCommand: normalizedPackageRoot ? `pnpm --dir ${normalizedPackageRoot} build` : 'pnpm build'
    };
  }
  if (scopedFileNames.includes('yarn.lock')) {
    return {
      label: 'yarn',
      installCommand: normalizedPackageRoot ? `yarn --cwd ${normalizedPackageRoot} install` : 'yarn install',
      devCommand: normalizedPackageRoot ? `yarn --cwd ${normalizedPackageRoot} dev` : 'yarn dev',
      buildCommand: normalizedPackageRoot ? `yarn --cwd ${normalizedPackageRoot} build` : 'yarn build'
    };
  }
  if (scopedFileNames.includes('bun.lock') || scopedFileNames.includes('bun.lockb')) {
    return {
      label: 'bun',
      installCommand: normalizedPackageRoot ? `bun --cwd ${normalizedPackageRoot} install` : 'bun install',
      devCommand: normalizedPackageRoot ? `bun --cwd ${normalizedPackageRoot} run dev` : 'bun run dev',
      buildCommand: normalizedPackageRoot ? `bun --cwd ${normalizedPackageRoot} run build` : 'bun run build'
    };
  }

  return {
    label: 'npm',
    installCommand: normalizedPackageRoot ? `npm --prefix ${normalizedPackageRoot} install` : 'npm install',
    devCommand: normalizedPackageRoot ? `npm --prefix ${normalizedPackageRoot} run dev` : 'npm run dev',
    buildCommand: normalizedPackageRoot ? `npm --prefix ${normalizedPackageRoot} run build` : 'npm run build'
  };
};

export const getTerminalStatusTone = (status?: 'idle' | 'running' | 'success' | 'failed') => {
  switch (status) {
    case 'running':
      return { dot: 'bg-amber-400', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-200' };
    case 'success':
      return { dot: 'bg-emerald-400', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' };
    case 'failed':
      return { dot: 'bg-red-400', badge: 'border-red-500/30 bg-red-500/10 text-red-200' };
    default:
      return { dot: 'bg-[#6f7785]', badge: 'border-white/8 bg-white/[0.03] text-[#8d95a3]' };
  }
};

export const getAiActivityTone = (status?: 'planning' | 'working' | 'done' | 'error') => {
  switch (status) {
    case 'working':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-200';
    case 'done':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200';
    case 'error':
      return 'border-red-500/20 bg-red-500/10 text-red-200';
    default:
      return 'border-blue-500/20 bg-blue-500/10 text-blue-200';
  }
};

export const buildDeveloperPromptPrefix = (taskPresetId: string, selectedSkill: string) => {
  const preset = DEVELOPER_TASK_PRESETS.find((item) => item.id === taskPresetId);
  if (!preset) return '';
  const skill = AURA_COLLECTIVE.find((item) => item.name === selectedSkill || item.id === preset.agentId);
  const skillWorkflow = skill?.workflow?.map((item: string) => `- ${item}`).join('\n') || '';
  const skillChecklist = skill?.checklist?.map((item: string) => `- ${item}`).join('\n') || '';
  const taskChecklist = preset.executionChecklist?.map((item: string) => `- ${item}`).join('\n') || '';
  const antiPatterns = skill?.antiPatterns?.map((item: string) => `- ${item}`).join('\n') || '';

  return [
    `Developer Task Preset: ${preset.label}`,
    `Developer Skill: ${selectedSkill}`,
    `Task Focus: ${preset.description}`,
    `Execution Rules: ${preset.aiRules}`,
    `System Role: ${preset.systemInstruction}`,
    skill ? `Skill Role: ${skill.description}` : '',
    skillWorkflow ? `Skill Workflow:\n${skillWorkflow}` : '',
    taskChecklist ? `Task Execution Checklist:\n${taskChecklist}` : '',
    skillChecklist ? `Quality Checklist:\n${skillChecklist}` : '',
    antiPatterns ? `Avoid These Anti-Patterns:\n${antiPatterns}` : '',
    'Coding Output Rules:',
    '- Prioritaskan solusi yang benar-benar bisa dijalankan, bukan pseudo-code.',
    '- Jika membuat atau mengubah file, gunakan path file yang jelas.',
    '- Untuk UI/UX, hasil harus responsif, rapi, dan siap dipakai di project nyata.',
    '- Untuk mobile app, gunakan pola Capacitor + React yang mobile-first dengan navigation dan touch target yang masuk akal.',
    '- Untuk bugfix, jelaskan akar masalah secara singkat lalu berikan patch final.',
    '- Untuk refactor/fullstack, jaga struktur file dan dependency tetap konsisten.'
  ].join('\n');
};

export const formatCompactPrice = (value?: number | null, fallbackLabel?: string) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value === 0) return 'free';
    return `$${value.toFixed(value < 0.001 ? 6 : value < 0.01 ? 4 : 2)}`;
  }
  return fallbackLabel || '';
};

export const formatModelDropdownLabel = (model: { name: string; meta?: string; badge?: string }) => {
  const parts = [model.name];
  if (model.meta) parts.push(model.meta);
  const label = parts.join(' | ');
  return model.badge ? `[${model.badge}] ${label}` : label;
};

export const detectWorkDomains = (prompt: string, activeFile: FileItem | null, files: FileItem[]) => {
  const signals = new Set<string>();
  const source = `${prompt}\n${activeFile?.path || activeFile?.name || ''}\n${files.map((file) => file.path || file.name).join('\n')}`.toLowerCase();

  if (/src\/|component|tsx|jsx|css|tailwind|responsive|layout|ui|ux|frontend|page|react/.test(source)) signals.add('frontend');
  if (/mobile|android|ios|apk|capacitor|native shell|tab bar|bottom nav|safe-area|touch target/.test(source)) signals.add('mobile');
  if (/api|server|backend|route|controller|service|schema|database|sql|auth|endpoint/.test(source)) signals.add('backend');
  if (/tauri|src-tauri|rust|invoke|plugin-shell|plugin-fs|desktop/.test(source)) signals.add('tauri');
  if (/security|auth|token|secret|sanitize|escape|permission|owasp|csrf|xss/.test(source)) signals.add('security');
  if (/design system|token|typography|spacing|component library|theme|a11y|accessibility/.test(source)) signals.add('design-system');
  if (signals.size === 0) signals.add('frontend');
  return Array.from(signals);
};

export const isUiFirstPrompt = (prompt: string) =>
  /(landing page|homepage|home page|company profile|profile company|dashboard|website|web app|app web|toko|shop|storefront|commerce|portfolio|marketing page|saas ui|ui redesign|desain ui|ui ux|frontend ui|tailwind)/i.test(prompt);

export const isWeakFrontendOutput = (
  generatedFiles: AiGeneratedFile[],
  userPrompt = ''
) => {
  const appLikeFiles = generatedFiles.filter((file) => /src\/App\.tsx|src\/main\.tsx|src\/components\/|src\/pages\/|src\/index\.css|index\.html/i.test(file.relativePath));
  const classSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/className=|class=/g);
    return total + (matches?.length || 0);
  }, 0);
  const sectionSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/<section\b|hero|testimonial|feature|service|cta|footer|navbar/gi);
    return total + (matches?.length || 0);
  }, 0);
  const utilitySignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/(?:bg-|text-|px-|py-|grid|flex|rounded|shadow|max-w-|min-h-|gap-)/g);
    return total + (matches?.length || 0);
  }, 0);
  const emptyLinkSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/(?:href|to)=["'](?:#|#\s*|javascript:void\(0\)|)["']/gi);
    return total + (matches?.length || 0);
  }, 0);
  const meaningfulLinkSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/(?:href|to)=["'](?:#[a-z0-9-]{2,}|\/[a-z0-9/_-]+|https?:\/\/|mailto:|tel:|https:\/\/wa\.me\/)[^"']*["']/gi);
    return total + (matches?.length || 0);
  }, 0);
  const imageSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/<img\b|backgroundImage=|src=["'][^"']+\.(?:png|jpe?g|webp|svg|gif)|from ['"][^'"]+\.(?:png|jpe?g|webp|svg|gif)|\/images\/|src\/assets\/|unsplash|pexels|placehold|data:image\/|<svg\b/gi);
    return total + (matches?.length || 0);
  }, 0);
  const mockDataSignalCount = generatedFiles.reduce((total, file) => {
    const matches = file.content.match(/\b(?:const|export const)\s+(?:navItems|links|services|features|products|testimonials|faqs|faqItems|team|teamMembers|pricing|stats|contacts?|gallery|portfolio|projects)\s*=\s*\[|\.map\(\s*\(|rating|price|location|quote|role|label/gi);
    return total + (matches?.length || 0);
  }, 0);
  const hasEntrypoint = generatedFiles.some((file) => /src\/App\.tsx|src\/main\.tsx|index\.html/i.test(file.relativePath));
  const uiFirst = isUiFirstPrompt(userPrompt);
  const realismPrompt =
    /(landing page|landingpage|website|homepage|dashboard|toko|store|commerce|catalog|katalog|bengkel|company profile|profil perusahaan|saas|app|aplikasi)/i.test(
      userPrompt
    );

  if (!uiFirst) return false;
  if (!hasEntrypoint) return true;
  if (appLikeFiles.length < 4) return true;
  if (classSignalCount < 12) return true;
  if (utilitySignalCount < 24) return true;
  if (sectionSignalCount < 6) return true;
  if (realismPrompt && emptyLinkSignalCount > 0) return true;
  if (realismPrompt && meaningfulLinkSignalCount < 2) return true;
  if (realismPrompt && imageSignalCount < 1) return true;
  if (realismPrompt && mockDataSignalCount < 3) return true;
  return false;
};

export const getRelativeFilePath = (filePath: string, rootPath?: string | null) => {
  const normalizedFilePath = normalizePath(filePath);
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  if (!normalizedRoot) return normalizedFilePath;
  if (!normalizedFilePath.startsWith(normalizedRoot)) return normalizedFilePath;
  return normalizedFilePath.slice(normalizedRoot.length).replace(/^\/+/, '') || normalizedFilePath;
};

export const inferPreferredWorkspaceTargets = (
  domains: string[],
  files: FileItem[],
  rootPath?: string | null,
  activeFile?: FileItem | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const existingFolders = new Set<string>();

  files.forEach((file) => {
    const normalized = normalizePath(file.path || file.id);
    const relative = normalizedRoot ? getRelativeFilePath(normalized, normalizedRoot) : normalized;
    const segments = relative.split('/').filter(Boolean);
    for (let index = 0; index < segments.length - 1; index += 1) {
      existingFolders.add(segments.slice(0, index + 1).join('/'));
    }
  });

  const domainFolders: Record<string, string[]> = {
    frontend: ['src/components', 'src/pages', 'src/app', 'src/routes', 'src', 'components', 'pages', 'client/src/components', 'client/src'],
    mobile: ['src/screens', 'src/pages', 'src/components', 'src/mobile', 'src/lib', 'src/data', 'src'],
    backend: ['src/api', 'src/server', 'src/services', 'src/lib', 'server', 'api', 'backend', 'client/src/api', 'src'],
    tauri: ['src-tauri/src', 'src-tauri/capabilities', 'src-tauri'],
    security: ['src/server', 'src/api', 'src/lib', 'server', 'api', 'src-tauri/src'],
    'design-system': ['src/components/ui', 'src/design-system', 'src/ui', 'src/components', 'components', 'ui', 'src']
  };

  const ranked = new Set<string>();
  const activeFileParent = activeFile?.path ? getRelativeFilePath(activeFile.path, normalizedRoot).split('/').slice(0, -1).join('/') : '';
  if (activeFileParent) ranked.add(activeFileParent);

  domains.forEach((domain) => {
    (domainFolders[domain] || []).forEach((folder) => {
      if (!folder) return;
      if (existingFolders.has(folder) || folder.startsWith('src-tauri') || folder.startsWith('src')) ranked.add(folder);
    });
  });

  if (ranked.size === 0) {
    if (existingFolders.has('src')) ranked.add('src');
    if (existingFolders.has('src/components')) ranked.add('src/components');
    if (existingFolders.has('src-tauri/src')) ranked.add('src-tauri/src');
  }

  return Array.from(ranked).filter(Boolean).slice(0, 6);
};

export const inferExecutionPlan = (domains: string[], preferredTargets: string[], prompt: string) => {
  const steps: string[] = ['Review request, active task preset, and workspace context before editing files.'];

  if (domains.includes('frontend')) {
    steps.push(`Create or update UI foundation in ${preferredTargets[0] || 'src/components'} before touching secondary files.`);
    steps.push('Connect page/component structure, props, and state flow so the UI is actually usable.');
    steps.push('Refine styles, responsiveness, and interaction polish after the structure is stable.');
  }
  if (domains.includes('backend')) {
    steps.push(`Implement API/service layer in ${preferredTargets.find((target) => /api|server|service/.test(target)) || preferredTargets[0] || 'src/api'} before wiring UI consumers.`);
    steps.push('Connect data flow, validation, and error handling after the backend shape is clear.');
  }
  if (domains.includes('tauri')) {
    steps.push(`Handle desktop/native integration in ${preferredTargets.find((target) => target.startsWith('src-tauri')) || 'src-tauri/src'} after app-level flow is defined.`);
  }
  if (domains.includes('design-system')) {
    steps.push('Normalize tokens, components, and visual language before duplicating UI patterns.');
  }
  if (domains.includes('security')) {
    steps.push('Review auth, sensitive flows, and unsafe patterns before finalizing implementation.');
  }

  if (/build|browser|localhost|npm run dev|preview|run/i.test(prompt)) {
    steps.push('Verify the resulting project can install, build, and run in the browser after code changes are prepared.');
  } else {
    steps.push('Do a quick implementation sanity check before marking the draft ready.');
  }

  return Array.from(new Set(steps)).slice(0, 6);
};

export const getWorkspacePackageManifest = (files: FileItem[], rootPath?: string | null) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const packagePath = normalizedRoot ? `${normalizedRoot}/package.json` : 'package.json';
  const packageFile = files.find((file) => normalizePath(file.path || file.id) === packagePath);
  if (!packageFile?.content) return null;

  try {
    return JSON.parse(packageFile.content) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
};

export const getPrimaryWorkspacePackageTarget = (files: FileItem[], rootPath?: string | null) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const readManifest = (relativePath: string) => {
    const absolutePath = normalizedRoot ? `${normalizedRoot}/${relativePath}` : relativePath;
    const packageFile = files.find((file) => normalizePath(file.path || file.id) === normalizePath(absolutePath));
    if (!packageFile?.content) return null;

    try {
      return JSON.parse(packageFile.content) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
    } catch {
      return null;
    }
  };

  const summarize = (relativePath: string) => {
    const manifest = readManifest(relativePath);
    if (!manifest) return null;
    return {
      packageRoot: relativePath === 'package.json' ? '' : relativePath.replace(/\/package\.json$/i, ''),
      manifest,
      dependencyCount: Object.keys(manifest.dependencies || {}).length + Object.keys(manifest.devDependencies || {}).length,
      scriptCount: Object.keys(manifest.scripts || {}).length
    };
  };

  const rootSummary = summarize('package.json');
  const frontendSummary = summarize('frontend/package.json');
  const clientSummary = summarize('client/package.json');
  const nestedPreferred = [frontendSummary, clientSummary].find((entry) => entry && entry.dependencyCount > 0 && entry.scriptCount > 0);

  if (rootSummary && rootSummary.dependencyCount > 0) {
    return {
      packageRoot: rootSummary.packageRoot,
      manifest: rootSummary.manifest,
      isNested: false
    };
  }

  if (nestedPreferred) {
    return {
      packageRoot: nestedPreferred.packageRoot,
      manifest: nestedPreferred.manifest,
      isNested: true
    };
  }

  if (rootSummary) {
    return {
      packageRoot: rootSummary.packageRoot,
      manifest: rootSummary.manifest,
      isNested: false
    };
  }

  return null;
};

export const inferSuggestedVerificationCommands = (
  files: FileItem[],
  rootPath: string | null | undefined,
  domains: string[],
  packageManager: ReturnType<typeof detectWorkspacePackageManager>
) => {
  const packageTarget = getPrimaryWorkspacePackageTarget(files, rootPath);
  const manifest = packageTarget?.manifest || getWorkspacePackageManifest(files, rootPath);
  if (!manifest) return [];

  const packageRoot = packageTarget?.packageRoot || '';
  const effectivePackageManager = detectWorkspacePackageManagerAt(files, rootPath, packageRoot) || packageManager;
  const hasNodeModules = files.some((file) => {
    const relativePath = getRelativeFilePath(file.path || file.id, rootPath);
    return packageRoot
      ? relativePath.startsWith(`${packageRoot}/`) && relativePath.includes('/node_modules/')
      : relativePath.includes('/node_modules/');
  });
  const scripts = manifest.scripts || {};
  const commands: Array<{ label: string; command: string; reason: string }> = [];
  const hasDependencies = Object.keys(manifest.dependencies || {}).length > 0 || Object.keys(manifest.devDependencies || {}).length > 0;

  if (hasDependencies && !hasNodeModules) {
    commands.push({ label: 'Install', command: effectivePackageManager.installCommand, reason: 'Pasang dependency dulu agar draft bisa diverifikasi.' });
  }
  if (scripts.build) {
    commands.push({ label: 'Build', command: effectivePackageManager.buildCommand, reason: 'Cek apakah perubahan berhasil dikompilasi tanpa error.' });
  }
  if (scripts.dev) {
    commands.push({
      label: packageRoot ? `Run Dev (${packageRoot})` : 'Run Dev',
      command: effectivePackageManager.devCommand,
      reason: domains.includes('frontend') || domains.includes('design-system')
        ? 'Lihat hasil UI langsung di browser.'
        : 'Jalankan workspace untuk verifikasi perilaku runtime.'
    });
  }
  if (scripts.lint) {
    const lintCommand =
      effectivePackageManager.label === 'pnpm' ? (packageRoot ? `pnpm --dir ${packageRoot} lint` : 'pnpm lint') :
      effectivePackageManager.label === 'yarn' ? (packageRoot ? `yarn --cwd ${packageRoot} lint` : 'yarn lint') :
      effectivePackageManager.label === 'bun' ? (packageRoot ? `bun --cwd ${packageRoot} run lint` : 'bun run lint') :
      (packageRoot ? `npm --prefix ${packageRoot} run lint` : 'npm run lint');
    commands.push({ label: 'Lint', command: lintCommand, reason: 'Validasi kualitas dasar dan error statis setelah draft siap.' });
  }

  return commands.slice(0, 4);
};

export const rewriteCommandForPrimaryWorkspaceApp = (
  command: string,
  files: FileItem[],
  rootPath?: string | null
) => {
  const trimmed = command.trim();
  if (!trimmed) return trimmed;

  const normalized = trimmed.toLowerCase();
  const packageTarget = getPrimaryWorkspacePackageTarget(files, rootPath);
  if (!packageTarget?.packageRoot) return trimmed;

  const packageRoot = packageTarget.packageRoot;
  const manifest = packageTarget.manifest || {};
  const scripts = manifest.scripts || {};
  const packageManager = detectWorkspacePackageManagerAt(files, rootPath, packageRoot);

  const alreadyScoped = /\s(--prefix|--cwd|--dir)\s/i.test(trimmed);
  if (alreadyScoped) return trimmed;

  const isInstall = /^(npm|pnpm|yarn|bun)\s+(install|i)\b/i.test(trimmed);
  const isDev = /^(npm\s+run\s+dev|pnpm\s+dev|yarn\s+dev|bun\s+run\s+dev)\b/i.test(trimmed);
  const isBuild = /^(npm\s+run\s+build|pnpm\s+build|yarn\s+build|bun\s+run\s+build)\b/i.test(trimmed);
  const isLint = /^(npm\s+run\s+lint|pnpm\s+lint|yarn\s+lint|bun\s+run\s+lint)\b/i.test(trimmed);

  if (isInstall) return packageManager.installCommand;
  if (isDev && scripts.dev) return packageManager.devCommand;
  if (isBuild && scripts.build) return packageManager.buildCommand;
  if (isLint && scripts.lint) {
    if (packageManager.label === 'pnpm') return `pnpm --dir ${packageRoot} lint`;
    if (packageManager.label === 'yarn') return `yarn --cwd ${packageRoot} lint`;
    if (packageManager.label === 'bun') return `bun --cwd ${packageRoot} run lint`;
    return `npm --prefix ${packageRoot} run lint`;
  }

  return trimmed;
};

export const resolveAiCandidatePath = (
  candidatePath: string,
  preferredTargets: string[],
  normalizedRoot: string,
  files: FileItem[] = [],
  activeFile?: FileItem | null
) => {
  const cleanedCandidate = candidatePath.replace(/^\/+/, '');
  if (/^[A-Za-z]:[\\/]/.test(candidatePath)) return normalizePath(candidatePath);
  const normalizedCandidate = normalizePath(cleanedCandidate);
  const existingExactMatch = files.find((file) => normalizePath(getRelativeFilePath(file.path || file.id, normalizedRoot)) === normalizedCandidate);
  if (existingExactMatch) {
    return normalizePath(existingExactMatch.path || existingExactMatch.id);
  }
  if (cleanedCandidate.includes('/')) {
    const basename = cleanedCandidate.split('/').pop()?.toLowerCase() || '';
    const candidateDir = normalizePath(cleanedCandidate.split('/').slice(0, -1).join('/'));
    const suffixMatches = files.filter((file) => {
      const filePath = normalizePath(file.path || file.id);
      return filePath.toLowerCase().endsWith(`/${normalizedCandidate.toLowerCase()}`);
    });

    if (suffixMatches.length === 1) {
      return normalizePath(suffixMatches[0].path || suffixMatches[0].id);
    }

    if (candidateDir) {
      const preferredMatch = preferredTargets.find((target) => {
        const normalizedTarget = normalizePath(target).toLowerCase();
        return normalizedTarget === candidateDir.toLowerCase() || normalizedTarget.endsWith(`/${candidateDir.toLowerCase()}`);
      });
      if (preferredMatch) {
        return normalizedRoot
          ? normalizePath(`${normalizedRoot}/${preferredMatch}/${cleanedCandidate.split('/').pop()}`)
          : normalizePath(`${preferredMatch}/${cleanedCandidate.split('/').pop()}`);
      }

      const directorySuffixMatches = files.filter((file) => {
        const filePath = normalizePath(file.path || file.id);
        const fileDir = filePath.split('/').slice(0, -1).join('/').toLowerCase();
        return file.name?.toLowerCase() === basename && (fileDir === candidateDir.toLowerCase() || fileDir.endsWith(`/${candidateDir.toLowerCase()}`));
      });
      if (directorySuffixMatches.length === 1) {
        return normalizePath(directorySuffixMatches[0].path || directorySuffixMatches[0].id);
      }
    }

    return normalizedRoot ? normalizePath(`${normalizedRoot}/${cleanedCandidate}`) : normalizePath(cleanedCandidate);
  }

  const normalizedCandidateName = cleanedCandidate.toLowerCase();
  const basenameMatches = files.filter((file) => (file.name || '').toLowerCase() === normalizedCandidateName);

  if (activeFile?.name?.toLowerCase() === normalizedCandidateName && activeFile.path) {
    return normalizePath(activeFile.path);
  }

  if (basenameMatches.length === 1) {
    return normalizePath(basenameMatches[0].path || basenameMatches[0].id);
  }

  if (preferredTargets.length > 0) {
    return normalizedRoot
      ? normalizePath(`${normalizedRoot}/${preferredTargets[0]}/${cleanedCandidate}`)
      : normalizePath(`${preferredTargets[0]}/${cleanedCandidate}`);
  }
  return normalizedRoot ? normalizePath(`${normalizedRoot}/${cleanedCandidate}`) : normalizePath(cleanedCandidate);
};

const compareExplorerNodes = (a: ExplorerNode, b: ExplorerNode) => {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
};

export const buildExplorerTree = (files: FileItem[], folders: string[], rootPath?: string | null) => {
  const root: ExplorerNode = { id: 'root', name: 'root', type: 'folder', path: rootPath || '', children: [] };

  folders.forEach((folderPath) => {
    const relativePath = getRelativeFilePath(folderPath, rootPath);
    const segments = relativePath.split('/').filter(Boolean);
    let current = root;
    segments.forEach((segment, index) => {
      if (!current.children) current.children = [];
      const currentFolderPath = segments.slice(0, index + 1).join('/');
      let next = current.children.find((child) => child.type === 'folder' && child.path === currentFolderPath);
      if (!next) {
        next = { id: `folder:${currentFolderPath}`, name: segment, type: 'folder', path: currentFolderPath, children: [] };
        current.children.push(next);
      }
      current = next;
    });
  });

  files.forEach((file) => {
    const relativePath = getRelativeFilePath(file.path || file.id, rootPath);
    const segments = relativePath.split('/').filter(Boolean);
    let current = root;
    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      if (!current.children) current.children = [];
      if (isLeaf) {
        current.children.push({ id: file.id, name: file.name, type: 'file', path: file.path || file.id, fileId: file.id });
        return;
      }
      const folderPath = segments.slice(0, index + 1).join('/');
      let next = current.children.find((child) => child.type === 'folder' && child.path === folderPath);
      if (!next) {
        next = { id: `folder:${folderPath}`, name: segment, type: 'folder', path: folderPath, children: [] };
        current.children.push(next);
      }
      current = next;
    });
  });

  const sortNodes = (nodes: ExplorerNode[]) => {
    nodes.sort(compareExplorerNodes);
    nodes.forEach((node) => { if (node.children) sortNodes(node.children); });
  };

  sortNodes(root.children || []);
  return root.children || [];
};

export const analyzeWorkspaceHealth = (files: FileItem[], rootPath?: string | null) => {
  const issues: WorkspaceHealthIssue[] = [];
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const byPath = new Map(files.map((file) => [normalizePath(file.path || file.id), file]));
  const rootPackagePath = normalizedRoot ? `${normalizedRoot}/package.json` : 'package.json';
  const clientPackagePath = normalizedRoot ? `${normalizedRoot}/client/package.json` : 'client/package.json';
  const clientSrcPath = normalizedRoot ? `${normalizedRoot}/client/src` : 'client/src';

  const rootPackage = byPath.get(rootPackagePath);
  const clientPackage = byPath.get(clientPackagePath);
  const hasClientSource = files.some((file) => {
    const target = normalizePath(file.path || file.id);
    return target.includes(`${clientSrcPath}/`) || target === clientSrcPath;
  });

  if (rootPackage) {
    try {
      const manifest = JSON.parse(rootPackage.content) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const dependencyCount = Object.keys(manifest.dependencies || {}).length + Object.keys(manifest.devDependencies || {}).length;
      const scripts = manifest.scripts || {};
      const usesVite = Object.values(scripts).some((script) => /\bvite\b/i.test(script));
      const hasViteDependency = Boolean(manifest.dependencies?.vite || manifest.devDependencies?.vite);
      const frontendPackagePath = normalizedRoot ? `${normalizedRoot}/frontend/package.json` : 'frontend/package.json';
      const frontendPackage = byPath.get(frontendPackagePath);
      const hasNestedAppManifest = Boolean(clientPackage || frontendPackage);

      if (dependencyCount === 0 && Object.keys(scripts).length > 0 && !hasNestedAppManifest) {
        issues.push({
          severity: 'warning',
          title: 'Package Root Masih Kosong',
          detail: 'package.json root punya scripts, tetapi belum punya dependencies/devDependencies. npm install akan terlihat sukses, tapi tidak akan menyiapkan tool build apa pun.'
        });
      }
      if (dependencyCount === 0 && Object.keys(scripts).length > 0 && hasNestedAppManifest) {
        issues.push({
          severity: 'warning',
          title: 'Struktur Project Campuran',
          detail: 'Root package.json terlihat seperti shell, tetapi app utama ada di folder frontend/client. AURA akan mengarahkan verifikasi ke app yang paling lengkap, tetapi struktur ini sebaiknya disederhanakan.'
        });
      }
      if (usesVite && !hasViteDependency) {
        issues.push({
          severity: 'error',
          title: 'Script Memanggil Vite Tanpa Dependency',
          detail: 'Script dev/build di root memanggil Vite, tetapi package.json aktif tidak mendeklarasikan `vite`, jadi npm run dev/build akan gagal.'
        });
      }
    } catch {
      issues.push({
        severity: 'warning',
        title: 'package.json Tidak Bisa Dibaca',
        detail: 'AURA menemukan package.json root, tetapi kontennya tidak valid untuk dianalisis.'
      });
    }
  }

  if (hasClientSource && !clientPackage) {
    issues.push({
      severity: 'warning',
      title: 'Frontend Terlihat Terpisah',
      detail: 'Ditemukan folder client/src, tetapi tidak ada client/package.json. Ini tanda struktur proyek belum selesai atau frontend belum diinisialisasi penuh.'
    });
  }

  return issues;
};

const extractLastMatch = (source: string, pattern: RegExp) => {
  const matches = Array.from(source.matchAll(pattern));
  const last = matches.at(-1);
  return last?.[1] ? last[1].replace(/^["'`]|["'`]$/g, '').trim() : '';
};

const sanitizeAiCandidatePath = (value: string) => {
  const trimmed = value
    .replace(/^['"`]+|['"`]+$/g, '')
    .replace(/^[(*\s]+|[)*,\s:;]+$/g, '')
    .replace(/^file\s*[:=]\s*/i, '')
    .replace(/^path\s*[:=]\s*/i, '')
    .replace(/^filename\s*[:=]\s*/i, '')
    .replace(/^\/+/, '');

  const withoutInlineComment = trimmed
    .replace(/\*\/.*$/g, '')
    .replace(/\s+#.*$/g, '')
    .replace(/[<>:"|?*]/g, '');

  return withoutInlineComment.replace(/\\/g, '/').trim();
};

const extractFilePathFromFenceInfo = (info: string, preface: string) => {
  const explicitPatterns = [
    /(?:file|path|filename)\s*[:=]\s*([^\s`]+)/gi,
    /([A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+)/g,
    /([A-Za-z0-9_.-]+\.[A-Za-z0-9]+)/g
  ];

  const prefaceLines = preface
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-6)
    .reverse();

  for (const source of [info, ...prefaceLines]) {
    for (const pattern of explicitPatterns) {
      const candidate = extractLastMatch(source, pattern);
      if (candidate) {
        const sanitized = sanitizeAiCandidatePath(candidate);
        if (sanitized) {
          return sanitized;
        }
      }
    }
  }

  return '';
};

export const collectParentFolderPaths = (absolutePath: string, rootPath?: string | null) => {
  if (!rootPath) return [];
  const normalizedRoot = normalizePath(rootPath);
  const relative = getRelativeFilePath(absolutePath, normalizedRoot);
  const segments = relative.split('/').filter(Boolean);
  const folders: string[] = [];
  for (let index = 0; index < segments.length - 1; index += 1) {
    folders.push(normalizePath(`${normalizedRoot}/${segments.slice(0, index + 1).join('/')}`));
  }
  return folders;
};

const SCRIPT_EXTENSIONS = new Set(['ts', 'tsx', 'js', 'jsx']);
const ROOT_LEVEL_CONFIG_NAMES = new Set([
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts',
  'capacitor.config.ts'
]);
const NODE_BUILTIN_IMPORTS = new Set([
  'fs', 'path', 'os', 'url', 'node:fs', 'node:path', 'node:os', 'node:url', 'process'
]);
const TAILWIND_UTILITY_SIGNAL = /\b(className|class)\s*=\s*["'{`][^"'`]*(?:flex|grid|px-|py-|mx-|my-|gap-|bg-|text-|rounded|shadow|items-|justify-|min-h-|max-w-|w-|h-)/i;
const KNOWN_RUNTIME_DEPENDENCIES: Record<string, string> = {
  clsx: '^2.1.1',
  'lucide-react': '^0.542.0',
  '@iconify/react': '^5.0.1',
  'react-router-dom': '^7.8.0',
  'class-variance-authority': '^0.7.1',
  'tailwind-merge': '^2.5.2',
  '@capacitor/core': '^8.2.0',
  '@radix-ui/react-slot': '^1.1.0'
};
const KNOWN_DEV_DEPENDENCIES: Record<string, string> = {
  tailwindcss: '^4.1.13',
  '@tailwindcss/vite': '^4.1.13',
  '@tailwindcss/postcss': '^4.1.13',
  postcss: '^8.4.49',
  autoprefixer: '^10.4.20',
  '@capacitor/cli': '^8.2.0',
  '@capacitor/android': '^8.2.0'
};
const CAPACITOR_WEB_INCOMPATIBLE_DEPENDENCIES = new Set([
  'tailwindcss-react-native',
  'nativewind',
  'react-native',
  'react-native-web',
  'expo',
  '@expo/vector-icons',
  'metro',
  '@react-native/babel-preset',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  '@react-navigation/native-stack'
]);
const MISPLACED_MOBILE_NATIVE_CONFIG_NAMES = new Set([
  'app.json',
  'babel.config.js',
  'babel.config.cjs',
  'metro.config.js',
  'metro.config.cjs'
]);
const WEB_PRODUCTION_ROOT_FILES = new Set([
  'package.json',
  'index.html',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'vite.config.mjs',
  'postcss.config.js',
  'postcss.config.cjs',
  'postcss.config.mjs',
  'tailwind.config.js',
  'tailwind.config.cjs',
  'tailwind.config.mjs',
  'tailwind.config.ts'
]);
const MOBILE_PRODUCTION_ROOT_FILES = new Set([
  ...WEB_PRODUCTION_ROOT_FILES,
  'capacitor.config.ts'
]);
const WEB_PRODUCTION_ALLOWED_PREFIXES = [
  'src/App.',
  'src/main.',
  'src/index.css',
  'src/components/',
  'src/pages/',
  'src/lib/',
  'src/data/',
  'src/assets/',
  'src/hooks/',
  'src/types/',
  'src/utils/'
];
const MOBILE_PRODUCTION_ALLOWED_PREFIXES = [
  ...WEB_PRODUCTION_ALLOWED_PREFIXES,
  'src/screens/',
  'src/mobile/'
];

const getExtension = (filePath: string) => filePath.split('.').pop()?.toLowerCase() || '';
const getBaseName = (filePath: string) => normalizePath(filePath).split('/').pop()?.toLowerCase() || '';
const buildDefaultFrontendTsConfig = () => `${JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    useDefineForClassFields: true,
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'Bundler',
    allowImportingTsExtensions: false,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: 'react-jsx',
    strict: true,
    baseUrl: '.',
    paths: {
      '@/*': ['src/*']
    }
  },
  include: ['src']
}, null, 2)}\n`;
const isWebProductionAllowedPath = (relativePath: string) => {
  const normalized = normalizePath(relativePath).replace(/^\/+/, '');
  if (WEB_PRODUCTION_ROOT_FILES.has(normalized)) return true;
  return WEB_PRODUCTION_ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};
const isMobileProductionAllowedPath = (relativePath: string) => {
  const normalized = normalizePath(relativePath).replace(/^\/+/, '');
  if (MOBILE_PRODUCTION_ROOT_FILES.has(normalized)) return true;
  return MOBILE_PRODUCTION_ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};
const isBackendOrDesktopRelativePath = (relativePath: string) =>
  /^(api\/|backend\/|server\/|src\/server\/|src\/api\/|src-tauri\/)/i.test(normalizePath(relativePath).replace(/^\/+/, ''));
const isMobileRelativePath = (relativePath: string) =>
  /^(capacitor\.config\.ts|src\/screens\/|src\/mobile\/)/i.test(normalizePath(relativePath).replace(/^\/+/, ''));

const getFileDirectory = (relativePath: string) => {
  const normalized = normalizePath(relativePath);
  const parts = normalized.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
};

const resolveRelativeImportTarget = (fromRelativePath: string, importPath: string) => {
  const baseDir = getFileDirectory(fromRelativePath);
  const baseParts = baseDir ? baseDir.split('/').filter(Boolean) : [];
  const importParts = importPath.split('/').filter(Boolean);
  const resolvedParts = [...baseParts];

  importParts.forEach((part) => {
    if (part === '.') return;
    if (part === '..') {
      resolvedParts.pop();
      return;
    }
    resolvedParts.push(part);
  });

  return normalizePath(resolvedParts.join('/'));
};

const buildRelativeImportPath = (fromRelativePath: string, toRelativePath: string) => {
  const fromDirParts = getFileDirectory(fromRelativePath).split('/').filter(Boolean);
  const toParts = normalizePath(toRelativePath).split('/').filter(Boolean);

  while (fromDirParts.length > 0 && toParts.length > 0 && fromDirParts[0] === toParts[0]) {
    fromDirParts.shift();
    toParts.shift();
  }

  const backtrack = new Array(fromDirParts.length).fill('..');
  const combined = [...backtrack, ...toParts].join('/');
  return combined.startsWith('.') ? combined : `./${combined || ''}`.replace(/\/+$/, '');
};

const stripKnownScriptExtension = (value: string) => value.replace(/\.(tsx|ts|jsx|js)$/i, '');

const normalizeGeneratedRelativePath = (relativePath: string) => {
  const normalized = normalizePath(relativePath).replace(/^\/+/, '');
  const baseName = getBaseName(normalized);

  if (ROOT_LEVEL_CONFIG_NAMES.has(baseName)) {
    return baseName;
  }

  return normalized;
};

const sanitizeGeneratedCodeContent = (content: string) => {
  const trimmedContent = content.replace(/\s+$/, '');
  if (!trimmedContent.trim()) return trimmedContent;

  const lines = trimmedContent.split('\n');
  const diffSignalCount = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('diff --git') ||
      trimmed.startsWith('index ') ||
      trimmed.startsWith('@@') ||
      trimmed.startsWith('+++') ||
      trimmed.startsWith('---') ||
      (/^[+-](?!\s*$)/.test(trimmed) && !/^[+-]{3}/.test(trimmed))
    );
  }).length;

  const shouldStripPatchArtifacts =
    diffSignalCount >= 2 ||
    lines.some((line) => /^[+-](import|export|const |let |var |function |class |type |interface )/.test(line.trim()));

  if (!shouldStripPatchArtifacts) {
    return trimmedContent;
  }

  const sanitizedLines = lines
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      return !(
        trimmed.startsWith('diff --git') ||
        trimmed.startsWith('index ') ||
        trimmed.startsWith('@@') ||
        trimmed.startsWith('+++') ||
        trimmed.startsWith('---')
      );
    })
    .map((line) => {
      if (/^\+(?!\+\+)/.test(line)) {
        return line.slice(1);
      }
      if (/^-(?!-)/.test(line)) {
        return '';
      }
      return line;
    });

  return sanitizedLines.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '');
};

const toPascalCase = (value: string) =>
  value
    .replace(/\.[^.]+$/g, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('') || 'GeneratedSection';

const hasTopLevelComponentShape = (content: string) =>
  /export\s+default|export\s+function|function\s+[A-Z]|const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\(|const\s+[A-Z][A-Za-z0-9_]*\s*=\s*\{/m.test(content);

const canWrapBareJsxSnippet = (content: string) => {
  const firstMeaningfulLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) return false;
  if (firstMeaningfulLine.startsWith('</')) return false;
  if (/^(className|title|src|href|alt|onClick|id|role|style)\s*=/.test(firstMeaningfulLine)) return false;
  return firstMeaningfulLine.startsWith('<') || firstMeaningfulLine.startsWith('{');
};

const buildRecoveredComponentFile = (relativePath: string, content: string) => {
  const componentName = toPascalCase(getBaseName(relativePath));
  const normalizedBody = content.trim().replace(/\t/g, '  ');

  if (canWrapBareJsxSnippet(normalizedBody)) {
    return [
      `export function ${componentName}() {`,
      '  return (',
      '    <>',
      ...normalizedBody.split('\n').map((line) => `      ${line}`.replace(/\s+$/g, '')),
      '    </>',
      '  );',
      '}',
      '',
      `export default ${componentName};`
    ].join('\n');
  }

  return [
    `export function ${componentName}() {`,
    '  return (',
    '    <section className="rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/10 p-6 text-sm text-amber-100">',
    `      <p>Generated content for ${componentName} was incomplete and has been replaced with a safe fallback.</p>`,
    '    </section>',
    '  );',
    '}',
    '',
    `export default ${componentName};`
  ].join('\n');
};

const ensureValidGeneratedComponentShape = (relativePath: string, content: string) => {
  const extension = getExtension(relativePath);
  if (!['tsx', 'jsx'].includes(extension)) return content;
  if (hasTopLevelComponentShape(content)) return content;
  if (!/(<|<\/|\/>)/.test(content)) return content;
  return buildRecoveredComponentFile(relativePath, content);
};

const isAcceptableGeneratedPath = (relativePath: string) => {
  const normalized = normalizeGeneratedRelativePath(relativePath);
  const baseName = getBaseName(normalized);
  const extension = getExtension(normalized);

  if (!normalized) return false;
  if (MISPLACED_MOBILE_NATIVE_CONFIG_NAMES.has(baseName) && normalized.includes('/')) return false;
  if (ROOT_LEVEL_CONFIG_NAMES.has(baseName)) return true;
  if (baseName === 'package.json' || baseName === 'index.html') return true;
  if (/\/(?:package\.json|index\.html|vite\.config\.(?:ts|js|mjs|cjs))$/i.test(normalized)) return true;
  if (SCRIPT_EXTENSIONS.has(extension) || ['css', 'scss', 'sass', 'less', 'html', 'json'].includes(extension)) return true;
  return false;
};

const normalizePackageImportName = (importSource: string) => {
  if (!importSource || importSource.startsWith('.') || importSource.startsWith('/')) return '';
  if (importSource.startsWith('@/') || importSource === '@') return '';
  if (importSource.startsWith('~/') || importSource === '~') return '';
  if (NODE_BUILTIN_IMPORTS.has(importSource) || importSource.startsWith('node:')) return '';
  if (importSource.startsWith('@')) {
    const [scope, pkg] = importSource.split('/');
    return scope && pkg ? `${scope}/${pkg}` : importSource;
  }
  return importSource.split('/')[0];
};

const collectGeneratedPackageRequirements = (generatedFiles: AiGeneratedFile[]) => {
  const runtimeDeps = new Set<string>();
  const devDeps = new Set<string>();

  generatedFiles.forEach((file) => {
    const relativePath = normalizePath(file.relativePath);
    const baseName = getBaseName(relativePath);
    const isScriptFile = SCRIPT_EXTENSIONS.has(getExtension(relativePath));

    if (ROOT_LEVEL_CONFIG_NAMES.has(baseName)) {
      devDeps.add('tailwindcss');
      devDeps.add('@tailwindcss/vite');
      devDeps.add('@tailwindcss/postcss');
      devDeps.add('postcss');
      devDeps.add('autoprefixer');
      if (baseName === 'capacitor.config.ts') {
        runtimeDeps.add('@capacitor/core');
        devDeps.add('@capacitor/cli');
        devDeps.add('@capacitor/android');
      }
    }

    if (/@tailwind|tailwindcss/i.test(file.content) || TAILWIND_UTILITY_SIGNAL.test(file.content)) {
      devDeps.add('tailwindcss');
      devDeps.add('@tailwindcss/vite');
      devDeps.add('@tailwindcss/postcss');
      devDeps.add('postcss');
      devDeps.add('autoprefixer');
    }

    if (isScriptFile) {
      const importMatches = Array.from(file.content.matchAll(/(?:import|export)\s+[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g));
      importMatches.forEach((match) => {
        const source = normalizePackageImportName(match[1] || match[2] || '');
        if (!source) return;
        runtimeDeps.add(source);
      });

      if (/capacitor|statusbar|splashscreen|keyboard|haptics|applaunch|safe-area/i.test(file.content) || /mobile|android|ios/i.test(relativePath)) {
        runtimeDeps.add('@capacitor/core');
        devDeps.add('@capacitor/cli');
        devDeps.add('@capacitor/android');
      }
    }
  });

  runtimeDeps.delete('react');
  runtimeDeps.delete('react-dom');
  runtimeDeps.delete('@vitejs/plugin-react');

  return { runtimeDeps, devDeps };
};

const ensureTailwindEntrypoints = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const usesTailwindUtilities = generatedFiles.some((file) => TAILWIND_UTILITY_SIGNAL.test(file.content));

  if (!usesTailwindUtilities) {
    return generatedFiles;
  }

  const ensureFile = (relativePath: string, contentFactory: (existing?: string) => string) => {
    const normalizedRelativePath = normalizePath(relativePath);
    const absolutePath = normalizedRoot ? normalizePath(`${normalizedRoot}/${normalizedRelativePath}`) : normalizedRelativePath;
    const generated = generatedFiles.find((file) => normalizePath(file.relativePath) === normalizedRelativePath);
    const workspace = workspaceFiles.find((file) => normalizePath(getRelativeFilePath(file.path || file.id, normalizedRoot)) === normalizedRelativePath);
    const nextContent = contentFactory(generated?.content || workspace?.content);

    if (generated) {
      generated.content = nextContent;
      return;
    }

    generatedFiles.push({
      absolutePath,
      relativePath: normalizedRelativePath,
      name: normalizedRelativePath.split('/').pop() || normalizedRelativePath,
      content: nextContent,
      language: getLanguageByExtension(normalizedRelativePath)
    });
  };

  const buildDefaultTailwindIndexCss = () => [
    '@import "tailwindcss";',
    '',
    '@theme {',
    '  --font-sans: "Inter", "Segoe UI", sans-serif;',
    '  --color-background: #020617;',
    '  --color-foreground: #f8fafc;',
    '  --color-surface: #0f172a;',
    '  --color-surface-foreground: #f8fafc;',
    '  --color-card: #0f172a;',
    '  --color-card-foreground: #f8fafc;',
    '  --color-popover: #0f172a;',
    '  --color-popover-foreground: #f8fafc;',
    '  --color-primary: #2563eb;',
    '  --color-primary-foreground: #eff6ff;',
    '  --color-secondary: #e2e8f0;',
    '  --color-secondary-foreground: #0f172a;',
    '  --color-muted: #1e293b;',
    '  --color-muted-foreground: #94a3b8;',
    '  --color-accent: #1d4ed8;',
    '  --color-accent-foreground: #eff6ff;',
    '  --color-border: #cbd5e1;',
    '  --color-input: #cbd5e1;',
    '  --color-ring: #60a5fa;',
    '  --color-navy-50: #eff6ff;',
    '  --color-navy-100: #dbeafe;',
    '  --color-navy-200: #bfdbfe;',
    '  --color-navy-300: #93c5fd;',
    '  --color-navy-400: #60a5fa;',
    '  --color-navy-500: #3b82f6;',
    '  --color-navy-600: #2563eb;',
    '  --color-navy-700: #1d4ed8;',
    '  --color-navy-800: #1e3a8a;',
    '  --color-navy-900: #172554;',
    '  --color-navy-950: #0f172a;',
    '  --color-primary-dark: #0f172a;',
    '  --color-secondary-light: #f8fafc;',
    '  --color-accent-primary: #2563eb;',
    '  --color-accent-secondary: #1d4ed8;',
    '  --color-gray-muted: #64748b;',
    '  --color-border-color: #cbd5e1;',
    '  --shadow-card: 0 18px 45px rgba(15, 23, 42, 0.10);',
    '  --shadow-soft: 0 24px 70px rgba(15, 23, 42, 0.18);',
    '  --animate-slideUp: slideUp 0.7s ease-out both;',
    '}',
    '',
    '@utility bg-background { background-color: var(--color-background); }',
    '@utility text-foreground { color: var(--color-foreground); }',
    '@utility bg-surface { background-color: var(--color-surface); }',
    '@utility text-surface { color: var(--color-surface); }',
    '@utility text-surface-foreground { color: var(--color-surface-foreground); }',
    '@utility border-surface { border-color: var(--color-surface); }',
    '@utility bg-card { background-color: var(--color-card); }',
    '@utility text-card-foreground { color: var(--color-card-foreground); }',
    '@utility bg-popover { background-color: var(--color-popover); }',
    '@utility text-popover-foreground { color: var(--color-popover-foreground); }',
    '@utility bg-primary { background-color: var(--color-primary); }',
    '@utility text-primary { color: var(--color-primary); }',
    '@utility text-primary-foreground { color: var(--color-primary-foreground); }',
    '@utility bg-secondary { background-color: var(--color-secondary); }',
    '@utility text-secondary { color: var(--color-secondary); }',
    '@utility text-secondary-foreground { color: var(--color-secondary-foreground); }',
    '@utility bg-muted { background-color: var(--color-muted); }',
    '@utility text-muted { color: var(--color-muted); }',
    '@utility text-muted-foreground { color: var(--color-muted-foreground); }',
    '@utility bg-accent { background-color: var(--color-accent); }',
    '@utility text-accent { color: var(--color-accent); }',
    '@utility text-accent-foreground { color: var(--color-accent-foreground); }',
    '@utility border-border { border-color: var(--color-border); }',
    '@utility border-input { border-color: var(--color-input); }',
    '@utility ring-ring { --tw-ring-color: var(--color-ring); }',
    '',
    '@keyframes slideUp {',
    '  from {',
    '    opacity: 0;',
    '    transform: translateY(18px);',
    '  }',
    '  to {',
    '    opacity: 1;',
    '    transform: translateY(0);',
    '  }',
    '}',
    '',
    '@layer base {',
    '  html {',
    '    scroll-behavior: smooth;',
    '    min-height: 100%;',
    '  }',
    '',
    '  html,',
    '  body,',
    '  #root {',
    '    width: 100%;',
    '    min-width: 0;',
    '  }',
    '',
    '  body {',
    '    @apply bg-slate-950 text-slate-100 antialiased;',
    '    min-height: 100vh;',
    '    margin: 0;',
    '    overflow-x: hidden;',
    '  }',
    '',
    '  #root {',
    '    min-height: 100vh;',
    '    isolation: isolate;',
    '    overflow-x: hidden;',
    '  }',
    '',
    '  *,',
    '  *::before,',
    '  *::after {',
    '    box-sizing: border-box;',
    '  }',
    '}',
    '',
    '@layer components {',
    '  .aura-mobile-shell {',
    '    width: min(100%, 430px);',
    '    min-height: 100vh;',
    '    margin-inline: auto;',
    '    overflow-x: hidden;',
    '    background: var(--color-background);',
    '    color: var(--color-foreground);',
    '  }',
    '',
    '  .aura-mobile-screen {',
    '    min-height: 100vh;',
    '    min-height: 100dvh;',
    '    overflow-x: hidden;',
    '    padding-left: max(1rem, env(safe-area-inset-left));',
    '    padding-right: max(1rem, env(safe-area-inset-right));',
    '    padding-top: max(1rem, env(safe-area-inset-top));',
    '    padding-bottom: max(1rem, env(safe-area-inset-bottom));',
    '  }',
    '}',
    ''
  ].join('\n');

  const buildDefaultMainEntrypoint = () =>
    "import './index.css';\nimport React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n);\n";

  const buildDefaultPostCssConfig = () =>
    [
      'export default {',
      '  plugins: {',
      '    "@tailwindcss/postcss": {},',
      '    autoprefixer: {},',
      '  },',
      '};',
      ''
    ].join('\n');

  const normalizeThemeReferences = (value: string) =>
    value
      .replace(/theme\(['"]colors\.background['"]\)/gi, 'var(--color-background)')
      .replace(/theme\(['"]colors\.foreground['"]\)/gi, 'var(--color-foreground)')
      .replace(/theme\(['"]colors\.surface['"]\)/gi, 'var(--color-surface)')
      .replace(/theme\(['"]colors\.surface-foreground['"]\)/gi, 'var(--color-surface-foreground)')
      .replace(/theme\(['"]colors\.card['"]\)/gi, 'var(--color-card)')
      .replace(/theme\(['"]colors\.card-foreground['"]\)/gi, 'var(--color-card-foreground)')
      .replace(/theme\(['"]colors\.primary['"]\)/gi, 'var(--color-primary)')
      .replace(/theme\(['"]colors\.primary-foreground['"]\)/gi, 'var(--color-primary-foreground)')
      .replace(/theme\(['"]colors\.secondary['"]\)/gi, 'var(--color-secondary)')
      .replace(/theme\(['"]colors\.secondary-foreground['"]\)/gi, 'var(--color-secondary-foreground)')
      .replace(/theme\(['"]colors\.muted['"]\)/gi, 'var(--color-muted)')
      .replace(/theme\(['"]colors\.muted-foreground['"]\)/gi, 'var(--color-muted-foreground)')
      .replace(/theme\(['"]colors\.accent['"]\)/gi, 'var(--color-accent)')
      .replace(/theme\(['"]colors\.accent-foreground['"]\)/gi, 'var(--color-accent-foreground)')
      .replace(/theme\(['"]colors\.border['"]\)/gi, 'var(--color-border)')
      .replace(/theme\(['"]colors\.input['"]\)/gi, 'var(--color-input)')
      .replace(/theme\(['"]colors\.ring['"]\)/gi, 'var(--color-ring)')
      .replace(/theme\(['"]colors\.secondary-light['"]\)/gi, 'var(--color-secondary-light)')
      .replace(/theme\(['"]colors\.primary-dark['"]\)/gi, 'var(--color-primary-dark)')
      .replace(/theme\(['"]colors\.accent-primary['"]\)/gi, 'var(--color-accent-primary)')
      .replace(/theme\(['"]colors\.accent-secondary['"]\)/gi, 'var(--color-accent-secondary)')
      .replace(/theme\(['"]colors\.gray-muted['"]\)/gi, 'var(--color-gray-muted)')
      .replace(/theme\(['"]colors\.border-color['"]\)/gi, 'var(--color-border-color)');

  const hasBalancedCssBlocks = (value: string) => {
    let braceBalance = 0;
    let parenBalance = 0;
    for (const char of value) {
      if (char === '{') braceBalance += 1;
      if (char === '}') braceBalance -= 1;
      if (char === '(') parenBalance += 1;
      if (char === ')') parenBalance -= 1;
      if (braceBalance < 0 || parenBalance < 0) return false;
    }
    return braceBalance === 0 && parenBalance === 0;
  };

  const stripCssAtRuleBlocks = (value: string, atRules: string[]) => {
    let next = value;

    for (const atRule of atRules) {
      let cursor = 0;
      while (cursor < next.length) {
        const index = next.indexOf(atRule, cursor);
        if (index === -1) break;

        const blockStart = next.indexOf('{', index);
        if (blockStart === -1) break;

        let depth = 0;
        let end = -1;
        for (let i = blockStart; i < next.length; i += 1) {
          const char = next[i];
          if (char === '{') depth += 1;
          if (char === '}') {
            depth -= 1;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }

        if (end === -1) break;
        next = `${next.slice(0, index)}${next.slice(end + 1)}`;
        cursor = index;
      }
    }

    return next;
  };

  const sanitizeTailwindCssContent = (value: string) => {
    const withoutDuplicateScaffold = stripCssAtRuleBlocks(value, ['@layer base', '@keyframes slideUp']);

    const normalized = normalizeThemeReferences(
      withoutDuplicateScaffold
        .replace(/@import\s+["']tailwindcss["'];?\s*/gi, '')
        .replace(/@tailwind\s+base;\s*/gi, '')
        .replace(/@tailwind\s+components;\s*/gi, '')
        .replace(/@tailwind\s+utilities;\s*/gi, '')
        .replace(/@theme\s*\{[\s\S]*?\}\s*/gi, '')
        .replace(/@utility\s+[^{]+\{[^{}]*\}\s*/gi, '')
        .replace(/\btext-text\b/gi, 'text-foreground')
        .replace(/\bbg-text\b/gi, 'bg-foreground')
        .replace(/@apply\s+border-border\s*;/gi, 'border-color: var(--color-border);')
        .replace(/@apply\s+bg-background\s*;/gi, 'background-color: var(--color-background);')
        .replace(/@apply\s+text-foreground\s*;/gi, 'color: var(--color-foreground);')
        .replace(/@apply\s+bg-surface\s*;/gi, 'background-color: var(--color-surface);')
        .replace(/@apply\s+text-surface\s*;/gi, 'color: var(--color-surface);')
        .replace(/@apply\s+text-surface-foreground\s*;/gi, 'color: var(--color-surface-foreground);')
        .replace(/@apply\s+border-surface\s*;/gi, 'border-color: var(--color-surface);')
        .replace(/@apply\s+bg-card\s*;/gi, 'background-color: var(--color-card);')
        .replace(/@apply\s+text-card-foreground\s*;/gi, 'color: var(--color-card-foreground);')
        .replace(/@apply\s+([^;]*\btext-foreground\b[^;]*);/gi, (_match, classes: string) => {
          const remaining = classes
            .split(/\s+/)
            .filter(Boolean)
            .filter((className) => className.toLowerCase() !== 'text-foreground');
          return `${remaining.length ? `@apply ${remaining.join(' ')};\n` : ''}color: var(--color-foreground);`;
        })
        .trim()
    );

    if (!normalized) return '';
    return hasBalancedCssBlocks(normalized) ? normalized : '';
  };

  ensureFile('src/index.css', (existing) => {
    if (existing && /\bimport\s+['"]\.\/index\.css['"]|ReactDOM\.createRoot|from\s+['"]react['"]/i.test(existing)) {
      return buildDefaultTailwindIndexCss();
    }

    const base = buildDefaultTailwindIndexCss();

    if (!existing?.trim()) {
      return base;
    }

    const sanitizedExisting = sanitizeTailwindCssContent(existing);

    return sanitizedExisting ? `${base}\n${sanitizedExisting}\n` : base;
  });

  ensureFile('src/main.tsx', (existing) => {
    if (existing && /@tailwind\s+base;|@tailwind\s+components;|@tailwind\s+utilities;|@layer\s+base\b/i.test(existing)) {
      return buildDefaultMainEntrypoint();
    }

    if (!existing?.trim()) {
      return buildDefaultMainEntrypoint();
    }

    const withoutLegacyStarterCss = existing.replace(/^\s*import\s+['"]\.\/style\.css['"];?\s*$/gim, '').trim();

    if (/import\s+['"]\.\/index\.css['"];?/i.test(withoutLegacyStarterCss)) {
      return `${withoutLegacyStarterCss}\n`;
    }

    return `import './index.css';\n${withoutLegacyStarterCss}\n`;
  });

  ensureFile('vite.config.ts', (existing) => {
    const baseline = [
      "import { fileURLToPath, URL } from 'node:url';",
      "import tailwindcss from '@tailwindcss/vite';",
      "import react from '@vitejs/plugin-react';",
      "import { defineConfig } from 'vite';",
      '',
      'export default defineConfig({',
      '  plugins: [react(), tailwindcss()],',
      '  resolve: {',
      '    alias: {',
      "      '@': fileURLToPath(new URL('./src', import.meta.url))",
      '    }',
      '  },',
      '});',
      ''
    ].join('\n');

    if (!existing?.trim()) {
      return baseline;
    }

    if (/@tailwindcss\/vite|tailwindcss\(\)/i.test(existing)) {
      let normalized = existing;
      if (!/fileURLToPath|new URL\('\.\/src', import\.meta\.url\)/i.test(normalized)) {
        normalized = normalized.includes("import { fileURLToPath, URL } from 'node:url';")
          ? normalized
          : `import { fileURLToPath, URL } from 'node:url';\n${normalized}`;
      }
      if (!/alias\s*:\s*\{[\s\S]*['"]@['"]\s*:/i.test(normalized)) {
        if (/resolve\s*:\s*\{/i.test(normalized)) {
          normalized = normalized.replace(
            /resolve\s*:\s*\{/i,
            "resolve: {\n    alias: {\n      '@': fileURLToPath(new URL('./src', import.meta.url))\n    },"
          );
        } else if (/defineConfig\s*\(\s*\{/i.test(normalized)) {
          normalized = normalized.replace(
            /defineConfig\s*\(\s*\{/i,
            "defineConfig({\n  resolve: {\n    alias: {\n      '@': fileURLToPath(new URL('./src', import.meta.url))\n    }\n  },"
          );
        }
      }
      return normalized;
    }

    const withImport = existing.includes("import tailwindcss from '@tailwindcss/vite';")
      ? existing
      : `import tailwindcss from '@tailwindcss/vite';\n${existing}`;

    if (/plugins\s*:\s*\[/i.test(withImport)) {
      return withImport.replace(/plugins\s*:\s*\[/i, 'plugins: [tailwindcss(), ');
    }

    return baseline;
  });

  ensureFile('postcss.config.js', (existing) => {
    if (existing && /(?:tailwindcss\s*:|require\(['"]tailwindcss['"]\)|from\s+['"]tailwindcss['"]|plugins\s*:\s*\[[^\]]*tailwindcss)/i.test(existing)) {
      return buildDefaultPostCssConfig();
    }

    if (existing && /@tailwindcss\/postcss|autoprefixer/i.test(existing)) {
      return existing;
    }

    return buildDefaultPostCssConfig();
  });

  ensureFile('tsconfig.json', (existing) => {
    if (!existing?.trim()) {
      return buildDefaultFrontendTsConfig();
    }

    try {
      const parsed = JSON.parse(existing);
      const compilerOptions = parsed.compilerOptions || {};
      const paths = compilerOptions.paths || {};
      return `${JSON.stringify({
        ...parsed,
        compilerOptions: {
          ...compilerOptions,
          baseUrl: compilerOptions.baseUrl || '.',
          paths: {
            ...paths,
            '@/*': Array.isArray(paths['@/*']) && paths['@/*'].length > 0 ? paths['@/*'] : ['src/*']
          }
        }
      }, null, 2)}\n`;
    } catch {
      return buildDefaultFrontendTsConfig();
    }
  });

  return generatedFiles;
};

const ensureGeneratedPackageManifest = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const packageRelativePath = 'package.json';
  const packageAbsolutePath = normalizedRoot ? normalizePath(`${normalizedRoot}/${packageRelativePath}`) : packageRelativePath;
  const generatedPackage = generatedFiles.find((file) => normalizePath(file.relativePath) === packageRelativePath);
  const workspacePackage = workspaceFiles.find((file) => normalizePath(getRelativeFilePath(file.path || file.id, normalizedRoot)) === packageRelativePath);

  if (!generatedPackage && !workspacePackage) {
    return generatedFiles;
  }

  let manifest: Record<string, any> = {};
  let workspaceManifest: Record<string, any> = {};

  try {
    manifest = JSON.parse(workspacePackage?.content || generatedPackage?.content || '{}');
  } catch {
    manifest = {};
  }

  try {
    workspaceManifest = JSON.parse(workspacePackage?.content || '{}');
  } catch {
    workspaceManifest = {};
  }

  const existingDependencies = { ...(manifest.dependencies || {}) };
  const existingDevDependencies = { ...(manifest.devDependencies || {}) };
  const { runtimeDeps, devDeps } = collectGeneratedPackageRequirements(generatedFiles);
  const enforcesCapacitorWebRuntime = generatedFiles.some((file) => {
    const relativePath = normalizePath(file.relativePath);
    return (
      relativePath === 'capacitor.config.ts' ||
      relativePath === 'vite.config.ts' ||
      relativePath === 'index.html' ||
      relativePath === 'src/main.tsx' ||
      /CapacitorConfig|@capacitor\/core|@capacitor\/cli/i.test(file.content)
    );
  });

  runtimeDeps.forEach((dependency) => {
    if (KNOWN_RUNTIME_DEPENDENCIES[dependency]) {
      delete existingDevDependencies[dependency];
      existingDependencies[dependency] = KNOWN_RUNTIME_DEPENDENCIES[dependency];
      return;
    }
    if (existingDependencies[dependency] || existingDevDependencies[dependency]) return;
    existingDependencies[dependency] = 'latest';
  });

  devDeps.forEach((dependency) => {
    if (KNOWN_DEV_DEPENDENCIES[dependency]) {
      delete existingDependencies[dependency];
      existingDevDependencies[dependency] = KNOWN_DEV_DEPENDENCIES[dependency];
      return;
    }
    if (existingDependencies[dependency] || existingDevDependencies[dependency]) return;
    existingDevDependencies[dependency] = 'latest';
  });

  if (enforcesCapacitorWebRuntime) {
    CAPACITOR_WEB_INCOMPATIBLE_DEPENDENCIES.forEach((dependency) => {
      delete existingDependencies[dependency];
      delete existingDevDependencies[dependency];
    });
  }

  const nextManifest = {
    ...workspaceManifest,
    ...manifest,
    name: manifest.name || workspaceManifest.name,
    version: manifest.version || workspaceManifest.version,
    private: typeof workspaceManifest.private === 'boolean' ? workspaceManifest.private : manifest.private,
    type: manifest.type || workspaceManifest.type,
    scripts: {
      ...(workspaceManifest.scripts || {}),
      ...(manifest.scripts || {})
    },
    dependencies: Object.keys(existingDependencies).length > 0 ? existingDependencies : undefined,
    devDependencies: Object.keys(existingDevDependencies).length > 0 ? existingDevDependencies : undefined
  };

  const nextPackageContent = `${JSON.stringify(nextManifest, null, 2)}\n`;

  if (generatedPackage) {
    generatedPackage.content = nextPackageContent;
    return generatedFiles;
  }

  return [
    ...generatedFiles,
    {
      absolutePath: packageAbsolutePath,
      relativePath: packageRelativePath,
      name: 'package.json',
      content: nextPackageContent,
      language: 'json'
    }
  ];
};

const ensureDeterministicFrontendScaffold = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const frontendSignal = generatedFiles.some((file) =>
    /^src\/(App\.tsx|main\.tsx|components\/|pages\/|index\.css)$/i.test(normalizePath(file.relativePath))
  );

  if (!frontendSignal) {
    return generatedFiles;
  }

  const getWorkspaceContent = (relativePath: string) =>
    workspaceFiles.find((file) =>
      normalizePath(getRelativeFilePath(file.path || file.id, normalizedRoot)) === normalizePath(relativePath)
    )?.content;

  const upsertFile = (relativePath: string, content: string, language?: string) => {
    const normalizedRelativePath = normalizePath(relativePath);
    const absolutePath = normalizedRoot ? normalizePath(`${normalizedRoot}/${normalizedRelativePath}`) : normalizedRelativePath;
    const existing = generatedFiles.find((file) => normalizePath(file.relativePath) === normalizedRelativePath);
    if (existing) {
      existing.content = content;
      return;
    }
    generatedFiles.push({
      absolutePath,
      relativePath: normalizedRelativePath,
      name: normalizedRelativePath.split('/').pop() || normalizedRelativePath,
      content,
      language: language || getLanguageByExtension(normalizedRelativePath)
    });
  };

  const defaultIndexHtml = [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '    <title>AURA App</title>',
    '  </head>',
    '  <body>',
    '    <div id="root"></div>',
    '    <script type="module" src="/src/main.tsx"></script>',
    '  </body>',
    '</html>',
    ''
  ].join('\n');

  const defaultMainTsx = [
    "import './index.css';",
    "import React from 'react';",
    "import ReactDOM from 'react-dom/client';",
    "import App from './App';",
    '',
    "ReactDOM.createRoot(document.getElementById('root')!).render(",
    '  <React.StrictMode>',
    '    <App />',
    '  </React.StrictMode>',
    ');',
    ''
  ].join('\n');

  const defaultViteConfig = [
    "import { fileURLToPath, URL } from 'node:url';",
    "import tailwindcss from '@tailwindcss/vite';",
    "import react from '@vitejs/plugin-react';",
    "import { defineConfig } from 'vite';",
    '',
    'export default defineConfig({',
    '  plugins: [react(), tailwindcss()],',
    '  resolve: {',
    '    alias: {',
    "      '@': fileURLToPath(new URL('./src', import.meta.url))",
    '    }',
    '  },',
    '});',
    ''
  ].join('\n');
  const defaultTsConfig = buildDefaultFrontendTsConfig();

  const findGeneratedFile = (relativePath: string) =>
    generatedFiles.find((file) => normalizePath(file.relativePath) === normalizePath(relativePath));

  const generatedScreenCandidate = [
    'src/pages/landing/index.tsx',
    'src/pages/index.tsx',
    'src/pages/home/index.tsx',
    'src/components/screens/LandingPage.tsx',
    'src/components/screens/HomePage.tsx'
  ].find((candidate) => findGeneratedFile(candidate));

  const buildAppEntrypoint = (targetPath: string) => {
    const importPath = buildRelativeImportPath('src/App.tsx', targetPath);
    const componentName =
      targetPath.includes('/landing/')
        ? 'LandingPage'
        : targetPath.includes('/home/')
          ? 'HomePage'
          : 'PrimaryScreen';

    return [
      `import ${componentName} from '${importPath}';`,
      '',
      'export default function App() {',
      `  return <${componentName} />;`,
      '}',
      ''
    ].join('\n');
  };

  const currentAppFile = findGeneratedFile('src/App.tsx');
  const workspaceAppContent = getWorkspaceContent('src/App.tsx') || '';
  const appLooksLikeStarter =
    /AURA Starter|Project baru ini dibuat dari AURA IDE|import ['"]\.\/style\.css['"]|AURA_EMPTY_ENTRY|return null;?/i.test(
      currentAppFile?.content || workspaceAppContent
    );

  upsertFile('index.html', getWorkspaceContent('index.html') || defaultIndexHtml, 'html');
  upsertFile('src/main.tsx', getWorkspaceContent('src/main.tsx') || defaultMainTsx, 'typescript');
  upsertFile('vite.config.ts', getWorkspaceContent('vite.config.ts') || defaultViteConfig, 'typescript');
  upsertFile('tsconfig.json', getWorkspaceContent('tsconfig.json') || defaultTsConfig, 'json');

  if (generatedScreenCandidate && (!currentAppFile || appLooksLikeStarter)) {
    upsertFile('src/App.tsx', buildAppEntrypoint(generatedScreenCandidate), 'typescript');
  }

  return generatedFiles;
};

const ensureDeterministicMobileScaffold = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const mobileSignal = generatedFiles.some((file) =>
    isMobileRelativePath(file.relativePath) || /capacitor|android|ios|mobile app|bottom nav|safe-area/i.test(file.content)
  );

  if (!mobileSignal) {
    return generatedFiles;
  }

  const existingCapacitorConfig = generatedFiles.find((file) => normalizePath(file.relativePath) === 'capacitor.config.ts')
    || workspaceFiles.find((file) => normalizePath(getRelativeFilePath(file.path || file.id, normalizedRoot)) === 'capacitor.config.ts');

  if (!existingCapacitorConfig) {
    generatedFiles.push({
      absolutePath: normalizedRoot ? normalizePath(`${normalizedRoot}/capacitor.config.ts`) : 'capacitor.config.ts',
      relativePath: 'capacitor.config.ts',
      name: 'capacitor.config.ts',
      language: 'typescript',
      content: [
        "import type { CapacitorConfig } from '@capacitor/cli';",
        '',
        'const config: CapacitorConfig = {',
        "  appId: 'com.aura.generated.app',",
        "  appName: 'Aura Mobile App',",
        "  webDir: 'dist',",
        '  server: {',
        "    androidScheme: 'https'",
        '  }',
        '};',
        '',
        'export default config;',
        ''
      ].join('\n')
    });
  }

  return generatedFiles;
};

const resolveMissingRelativeModuleImport = (
  fromRelativePath: string,
  importPath: string,
  knownRelativePaths: Set<string>
) => {
  const resolvedTarget = resolveRelativeImportTarget(fromRelativePath, importPath);
  const normalizedResolved = normalizePath(resolvedTarget);
  const directCandidates = [
    normalizedResolved,
    `${normalizedResolved}.tsx`,
    `${normalizedResolved}.ts`,
    `${normalizedResolved}.jsx`,
    `${normalizedResolved}.js`,
    `${normalizedResolved}/index.tsx`,
    `${normalizedResolved}/index.ts`,
    `${normalizedResolved}/index.jsx`,
    `${normalizedResolved}/index.js`
  ];

  const exactMatch = directCandidates.find((candidate) => knownRelativePaths.has(candidate));
  if (exactMatch) {
    return buildRelativeImportPath(fromRelativePath, exactMatch);
  }

  const requestedBase = stripKnownScriptExtension(normalizedResolved).toLowerCase();
  const baseName = requestedBase.split('/').pop() || '';
  if (!baseName) return importPath;

  const basenameMatches = Array.from(knownRelativePaths).filter((candidate) => {
    const normalizedCandidate = stripKnownScriptExtension(normalizePath(candidate)).toLowerCase();
    return normalizedCandidate.endsWith(`/${baseName}`) || normalizedCandidate === baseName;
  });

  if (basenameMatches.length === 1) {
    return buildRelativeImportPath(fromRelativePath, basenameMatches[0]);
  }

  const currentDir = getFileDirectory(fromRelativePath).toLowerCase();
  const sameTreeMatch = basenameMatches.find((candidate) => {
    const candidateDir = getFileDirectory(candidate).toLowerCase();
    return currentDir && (candidateDir === currentDir || candidateDir.startsWith(`${currentDir}/`));
  });

  if (sameTreeMatch) {
    return buildRelativeImportPath(fromRelativePath, sameTreeMatch);
  }

  return importPath;
};

const buildComponentStubFromImport = (statement: string) => {
  const importMatch = statement.match(/import\s+(.+?)\s+from\s+["'][^"']+["']/);
  if (!importMatch) return '';

  const specifier = importMatch[1].trim();
  const lines: string[] = ["import React from 'react';", ''];

  const defaultPart = specifier.includes('{')
    ? specifier.split('{')[0].replace(/,$/, '').trim()
    : specifier;
  const namedPartMatch = specifier.match(/\{([^}]+)\}/);
  const namedExports = namedPartMatch
    ? namedPartMatch[1]
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.split(/\s+as\s+/i)[0]?.trim())
        .filter(Boolean) as string[]
    : [];

  if (defaultPart && !/^\*/.test(defaultPart)) {
    lines.push(`const ${defaultPart} = () => null;`);
    lines.push('');
    lines.push(`export default ${defaultPart};`);
  }

  if (namedExports.length > 0) {
    if (defaultPart && !/^\*/.test(defaultPart)) {
      lines.push('');
    }
    namedExports.forEach((name, index) => {
      lines.push(`export function ${name}() {`);
      lines.push('  return null;');
      lines.push('}');
      if (index < namedExports.length - 1) {
        lines.push('');
      }
    });
  }

  return `${lines.join('\n')}\n`;
};

const ensureMissingRelativeComponentStubs = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const workspaceRelativePaths = new Set(
    workspaceFiles.map((file) => getRelativeFilePath(file.path || file.id, normalizedRoot)).map(normalizePath)
  );
  const generatedRelativePaths = new Set(generatedFiles.map((file) => normalizePath(file.relativePath)));
  const knownRelativePaths = new Set([...workspaceRelativePaths, ...generatedRelativePaths]);
  const missingStubs = new Map<string, string>();

  generatedFiles.forEach((generatedFile) => {
    const extension = getExtension(generatedFile.relativePath);
    if (!SCRIPT_EXTENSIONS.has(extension)) return;

    const importMatches = Array.from(
      generatedFile.content.matchAll(/import\s+.+?\s+from\s+["'](\.[^"']+)["'];?/g)
    );

    importMatches.forEach((match) => {
      const statement = match[0];
      const importPath = match[1];
      if (importPath.endsWith('.css')) return;

      const resolvedTarget = normalizePath(resolveRelativeImportTarget(generatedFile.relativePath, importPath));
      const directCandidates = [
        resolvedTarget,
        `${resolvedTarget}.tsx`,
        `${resolvedTarget}.ts`,
        `${resolvedTarget}.jsx`,
        `${resolvedTarget}.js`,
        `${resolvedTarget}/index.tsx`,
        `${resolvedTarget}/index.ts`,
        `${resolvedTarget}/index.jsx`,
        `${resolvedTarget}/index.js`
      ];

      if (directCandidates.some((candidate) => knownRelativePaths.has(candidate))) {
        return;
      }

      if (!/^(src\/components\/|src\/pages\/|src\/screens\/)/i.test(resolvedTarget)) {
        return;
      }

      const stubRelativePath = `${resolvedTarget}.tsx`;
      if (knownRelativePaths.has(stubRelativePath) || missingStubs.has(stubRelativePath)) {
        return;
      }

      const stubContent = buildComponentStubFromImport(statement);
      if (!stubContent.trim()) {
        return;
      }

      missingStubs.set(stubRelativePath, stubContent);
      knownRelativePaths.add(stubRelativePath);
    });
  });

  missingStubs.forEach((content, relativePath) => {
    const absolutePath = normalizedRoot ? normalizePath(`${normalizedRoot}/${relativePath}`) : relativePath;
    generatedFiles.push({
      absolutePath,
      relativePath,
      name: getBaseName(relativePath),
      content,
      language: getLanguageByExtension(relativePath)
    });
  });

  return generatedFiles;
};

export const normalizeGeneratedFrontendFiles = (
  generatedFiles: AiGeneratedFile[],
  workspaceFiles: FileItem[] = [],
  rootPath?: string | null
) => {
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const frontendSignal = generatedFiles.some((file) =>
    /^src\/(App\.tsx|main\.tsx|components\/|pages\/|index\.css|data\/|assets\/|lib\/)/i.test(normalizePath(file.relativePath))
  );
  const mobileSignal = generatedFiles.some((file) => isMobileRelativePath(file.relativePath) || /capacitor|android|ios|mobile app|safe-area/i.test(file.content));
  const backendOrDesktopSignal = generatedFiles.some((file) => isBackendOrDesktopRelativePath(file.relativePath));
  const constrainToWebProduction = frontendSignal && !mobileSignal && !backendOrDesktopSignal;
  const constrainToMobileProduction = mobileSignal && !backendOrDesktopSignal;
  const relocatedFiles = generatedFiles
    .filter((file) => isAcceptableGeneratedPath(file.relativePath))
    .filter((file) => {
      if (constrainToMobileProduction) return isMobileProductionAllowedPath(file.relativePath);
      if (constrainToWebProduction) return isWebProductionAllowedPath(file.relativePath);
      return true;
    })
    .map((file) => {
    const nextRelativePath = normalizeGeneratedRelativePath(file.relativePath);
    const nextAbsolutePath = normalizedRoot ? normalizePath(`${normalizedRoot}/${nextRelativePath}`) : nextRelativePath;
    return nextRelativePath === file.relativePath
      ? file
      : {
          ...file,
          relativePath: nextRelativePath,
          absolutePath: nextAbsolutePath,
          name: nextRelativePath.split('/').pop() || file.name
        };
    });
  const workspaceRelativePaths = new Set(
    workspaceFiles.map((file) => getRelativeFilePath(file.path || file.id, normalizedRoot)).map(normalizePath)
  );
  const generatedRelativePaths = new Set(relocatedFiles.map((file) => normalizePath(file.relativePath)));
  const knownRelativePaths = new Set([...workspaceRelativePaths, ...generatedRelativePaths]);

  const normalizedFiles = relocatedFiles.map((generatedFile) => {
    const extension = getExtension(generatedFile.relativePath);
    if (!SCRIPT_EXTENSIONS.has(extension)) {
      return generatedFile;
    }

    const currentDir = getFileDirectory(generatedFile.relativePath);
    const sameDirCandidates = ['style.css', 'styles.css', 'index.css', 'app.css', 'App.css']
      .map((name) => normalizePath(currentDir ? `${currentDir}/${name}` : name))
      .filter((candidate, index, array) => array.indexOf(candidate) === index);

    let nextContent = ensureValidGeneratedComponentShape(generatedFile.relativePath, generatedFile.content).replace(
      /(import\s+["'])(\.[^"']+\.css)(["'];?)/g,
      (_fullMatch, prefix: string, importPath: string, suffix: string) => {
        const resolvedTarget = resolveRelativeImportTarget(generatedFile.relativePath, importPath);
        if (knownRelativePaths.has(resolvedTarget)) {
          return `${prefix}${importPath}${suffix}`;
        }

        const fallbackTarget = sameDirCandidates.find((candidate) => knownRelativePaths.has(candidate));
        if (!fallbackTarget) {
          return `${prefix}${importPath}${suffix}`;
        }

        const normalizedImport = buildRelativeImportPath(generatedFile.relativePath, fallbackTarget);
        return `${prefix}${normalizedImport}${suffix}`;
      }
    );

    nextContent = nextContent.replace(
      /(import\s+[^'"]*?from\s+["'])(\.[^"']+)(["'])/g,
      (_fullMatch, prefix: string, importPath: string, suffix: string) => {
        if (importPath.endsWith('.css')) {
          return `${prefix}${importPath}${suffix}`;
        }
        const normalizedImport = resolveMissingRelativeModuleImport(
          generatedFile.relativePath,
          importPath,
          knownRelativePaths
        );
        return `${prefix}${normalizedImport}${suffix}`;
      }
    );

    return nextContent === generatedFile.content
      ? generatedFile
      : {
          ...generatedFile,
          content: nextContent
        };
  });

  const withDeterministicScaffold = ensureDeterministicFrontendScaffold(normalizedFiles, workspaceFiles, rootPath);
  const withDeterministicMobileScaffold = ensureDeterministicMobileScaffold(withDeterministicScaffold, workspaceFiles, rootPath);
  const withTailwindEntrypoints = ensureTailwindEntrypoints(withDeterministicMobileScaffold, workspaceFiles, rootPath);
  const withMissingComponentStubs = ensureMissingRelativeComponentStubs(withTailwindEntrypoints, workspaceFiles, rootPath);
  return ensureGeneratedPackageManifest(withMissingComponentStubs, workspaceFiles, rootPath);
};

export const extractAiGeneratedFiles = (
  responseText: string,
  activeFile: FileItem | null,
  rootPath?: string | null,
  preferredTargets: string[] = [],
  files: FileItem[] = []
): AiGeneratedFile[] => {
  const codeFenceRegex = /```([^\n`]*)\n([\s\S]*?)```/g;
  const found = new Map<string, AiGeneratedFile>();
  const normalizedRoot = rootPath ? normalizePath(rootPath) : '';
  const matches = Array.from(responseText.matchAll(codeFenceRegex));

  matches.forEach((match) => {
    const info = (match[1] || '').trim();
    const content = sanitizeGeneratedCodeContent((match[2] || '').replace(/\s+$/, ''));
    if (!content.trim()) return;
    const preface = responseText.slice(Math.max(0, (match.index || 0) - 180), match.index || 0);
    let candidatePath = extractFilePathFromFenceInfo(info, preface);
    if (!candidatePath && matches.length === 1 && activeFile?.path) candidatePath = activeFile.path;
    if (!candidatePath) return;

    const absolutePath = resolveAiCandidatePath(candidatePath, preferredTargets, normalizedRoot, files, activeFile);
    const name = absolutePath.split('/').pop() || candidatePath;
    found.set(absolutePath, {
      absolutePath,
      relativePath: normalizedRoot ? getRelativeFilePath(absolutePath, normalizedRoot) : absolutePath,
      name,
      content,
      language: getLanguageByExtension(name)
    });
  });

  return normalizeGeneratedFrontendFiles(Array.from(found.values()), files, rootPath);
};
