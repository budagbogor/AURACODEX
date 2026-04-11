import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import {
  FolderOpen, Save, ChevronRight, PanelLeft, TerminalSquare, FileText, Play, Square, LoaderCircle,
  Plus, X, ExternalLink, Sparkles, Eraser, GitBranch, RotateCcw, Settings2
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { AiProvider, AttachedFile, FileItem, VisualReviewProvider } from '@/types';
import { useTerminal } from '@/hooks/useTerminal';
import { useAiManager } from '@/hooks/useAiManager';
import { useWorkspaceUiEffects, fallbackWorkspaceTabAfterFileRemoval } from '@/hooks/useWorkspaceUiEffects';
import { useTerminalVerificationEffects } from '@/hooks/useTerminalVerificationEffects';
import { TerminalAdapter } from '@/components/layout/TerminalAdapter';
import { terminalEngine } from '@/core/terminal-engine';
import { getFileIcon, getFolderIcon } from '@/utils/icons';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { AiComposerPanel } from '@/components/ai/AiComposerPanel';
import { AiSettingsModal } from '@/components/ai/AiSettingsModal';
import { AiActivityPanel } from '@/components/ai/AiActivityPanel';
import { capturePreviewSnapshot, capturePreviewScreenshot, type PreviewScreenshot, type PreviewSnapshot } from '@/services/previewReviewService';
import {
  buildAiPromptEnvelope,
  buildAttachmentPromptContext,
  buildStarterReplacementPrompt,
  buildVerificationRecoveryPrompt,
  buildUiReviewLoopPrompt,
  isErrorFixPrompt,
  isIterativeRevisionPrompt,
  isLikelyCodingPrompt,
  trimChatHistoryForAi,
  shouldRunUiReviewLoop
} from '@/features/ai/aiWorkflowSupport';
import { generateAiProviderResponse, prepareAiDraftBundle, type PreparedAiDraftBundle } from '@/features/ai/aiOrchestrator';
import { buildProjectRulesContext } from '@/services/ai/projectRulesService';
import {
  buildUserPromptMessage,
  createDraftReadyActivityUpdate,
  createFailureActivityUpdate,
  createGeneratingActivityUpdate,
  createNoDraftActivityUpdate,
  createPlanningActivityPayload,
  createStandaloneDraftEntry,
  mergePendingDrafts
} from '@/features/ai/aiSessionSupport';
import { AI_PROVIDERS, AURA_COLLECTIVE, DEVELOPER_TASK_PRESETS, GEMINI_MODELS } from '@/utils/constants';
import {
  AI_ACTIVITY_TAB_ID,
  PREVIEW_TAB_ID,
  CODING_MODEL_LABELS,
  CODING_MODEL_PRIORITIES,
  PUTER_MODEL_FALLBACKS,
  SUMOPOD_MODEL_FALLBACKS,
  analyzeWorkspaceHealth,
  buildDeveloperPromptPrefix,
  buildExplorerTree,
  collectParentFolderPaths,
  detectWorkDomains,
  detectWorkspacePackageManager,
  formatCompactPrice,
  formatModelDropdownLabel,
  getLanguageByExtension,
  getRelativeFilePath,
  getTerminalStatusTone,
  inferExecutionPlan,
  inferPreferredWorkspaceTargets,
  inferSuggestedVerificationCommands,
  isUiFirstPrompt,
  isWeakFrontendOutput,
  isTextAttachmentName,
  normalizePath,
  readWorkspaceFiles,
  readWorkspaceFolders,
  type AiActivityEntry,
  type ExplorerNode,
  type HeaderMenuKey,
  type WorkspaceHealthIssue
} from '@/features/workspace/workspaceSupport';
import {
  removeDraftFromList,
  removeWorkspaceFileFromList,
  resolveAppliedDraftFiles,
  resolveDiscardedDraftFiles,
  upsertWorkspaceFileList
} from '@/features/workspace/workspaceDraftSupport';
import {
  buildCloneTerminalOutput,
  buildCreateProjectTerminalOutput,
  buildStarterProjectFiles,
  buildWorkspaceSessionUpdate,
  getWorkspaceDisplayName
} from '@/features/workspace/workspaceLifecycleSupport';
import { logDiagnostic } from '@/utils/diagnostics';
import {
  ensureActiveFileTab,
  resolveCloseTabState,
  syncOpenFileTabs
} from '@/features/workspace/workspaceTabSupport';
import {
  createVerificationDetail,
  createVerificationSummary,
  shouldRefreshWorkspaceAfterCommand,
  upsertVerificationStepInEntries
} from '@/features/ai/aiVerificationSupport';
import { BYTEZ_MODELS as BYTEZ_MODEL_FALLBACK } from '@/services/bytezService';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));
const MonacoDiffEditor = lazy(() => import('@monaco-editor/react').then((module) => ({ default: module.DiffEditor })));

const GITHUB_REPO_URL_PATTERN = /https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:\/)?/i;
const REVISION_SENSITIVE_PATH_PATTERN = /^(?:package(?:-lock)?\.json|vite\.config\.(?:ts|js|mjs|cjs)|postcss\.config\.(?:js|mjs|cjs)|tailwind\.config\.(?:js|ts|mjs|cjs)|tsconfig(?:\.[^.]+)?\.json|src\/main\.tsx|src\/index\.css|src-tauri\/tauri\.conf\.json|src-tauri\/Cargo\.toml)$/i;

const tightenPreferredTargetsForRevision = (
  preferredTargets: string[],
  activeFile: FileItem | null,
  rootPath: string | null
) => {
  const next = new Set<string>();
  const activeRelativePath = activeFile?.path ? getRelativeFilePath(activeFile.path, rootPath) : '';
  const activeParent = activeRelativePath.split('/').slice(0, -1).join('/');
  const activeGrandParent = activeRelativePath.split('/').slice(0, -2).join('/');

  if (activeParent) next.add(activeParent);
  if (activeGrandParent && activeGrandParent !== activeParent) next.add(activeGrandParent);
  preferredTargets.forEach((target) => {
    if (!target) return;
    if (!activeParent || target === activeParent || target.startsWith(`${activeParent}/`) || activeParent.startsWith(`${target}/`)) {
      next.add(target);
    }
  });
  preferredTargets.slice(0, 2).forEach((target) => next.add(target));

  return Array.from(next).filter(Boolean).slice(0, 4);
};

const detectHighRiskRevisionDrafts = (
  generatedFiles: PreparedAiDraftBundle['generatedFiles'],
  preferredTargets: string[],
  activeFile: FileItem | null,
  rootPath: string | null
) => {
  const activeRelativePath = activeFile?.path ? getRelativeFilePath(activeFile.path, rootPath) : '';
  const activeParent = activeRelativePath.split('/').slice(0, -1).join('/');

  return generatedFiles.filter((file) => {
    const relativePath = normalizePath(file.relativePath);
    const insidePreferredTarget = preferredTargets.some((target) => relativePath.startsWith(`${normalizePath(target)}/`) || relativePath === normalizePath(target));
    const nearActiveFile = Boolean(activeParent) && (relativePath.startsWith(`${normalizePath(activeParent)}/`) || relativePath === normalizePath(activeRelativePath));
    const sensitive = REVISION_SENSITIVE_PATH_PATTERN.test(relativePath);
    return sensitive || (!insidePreferredTarget && !nearActiveFile);
  });
};

type SumopodCatalogModel = {
  id: string;
  name: string;
  provider?: string;
  context?: number;
  inputPrice?: number;
  outputPrice?: number;
};

const parseCatalogNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const match = raw.match(/\$?\s*([0-9]+(?:[,.][0-9]+)*)/);
  if (!match) return undefined;
  const normalized = match[1].includes('.') && !match[1].includes(',')
    ? match[1]
    : match[1].replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const prettifySumopodModelName = (id: string, badge?: string) => {
  const label = id
    .replace(/^gemini\//, 'Gemini ')
    .replace(/^openrouter:/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bGpt\b/g, 'GPT')
    .replace(/\bGlm\b/g, 'GLM')
    .replace(/\bMini\b/g, 'Mini');
  return badge ? `${label} (${badge})` : label;
};

const splitDelimitedCatalogLine = (line: string) => {
  const delimiter = line.includes('\t') ? '\t' : ',';
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
};

const normalizeSumopodCatalogModel = (item: any): SumopodCatalogModel | null => {
  const id = String(item?.id || item?.model || item?.Model || item?.slug || '').trim();
  if (!id) return null;
  const badge = String(item?.badge || item?.discount || item?.Discount || '').trim();
  const name = String(item?.name || item?.displayName || item?.Name || '').trim() || prettifySumopodModelName(id, badge);
  const provider = String(item?.provider || item?.Provider || '').trim() || undefined;
  const context = parseCatalogNumber(item?.context ?? item?.contextLength ?? item?.context_length ?? item?.['Context Length']);
  const inputPrice = parseCatalogNumber(item?.inputPrice ?? item?.input_price ?? item?.input ?? item?.['Input Price']);
  const outputPrice = parseCatalogNumber(item?.outputPrice ?? item?.output_price ?? item?.output ?? item?.['Output Price']);

  return {
    id,
    name,
    provider,
    context,
    inputPrice,
    outputPrice
  };
};

const isLikelySumopodModelId = (line: string) => {
  const value = line.trim();
  if (!value) return false;
  if (/\s/.test(value)) return false;
  if (/^(model|provider|context|input|output|price)$/i.test(value)) return false;
  if (/^(\/?1m tokens|90% off)$/i.test(value)) return false;
  if (/^\$/.test(value)) return false;
  if (/^[0-9,]+$/.test(value)) return false;
  return /[a-z]/i.test(value) && /[-/.0-9]/.test(value);
};

const parsePlainSumopodCatalog = (raw: string) => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(model|provider|context length|input price|output price)$/i.test(line));
  const models: SumopodCatalogModel[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const id = lines[index];
    if (!isLikelySumopodModelId(id)) continue;

    let cursor = index + 1;
    const badge = /^90%\s*off$/i.test(lines[cursor] || '') ? lines[cursor++] : '';
    const providerLine = lines[cursor++] || '';
    const providerMatch = providerLine.match(/^([A-Za-z0-9_.-]+)\s*([0-9][0-9,]*)?$/);
    const provider = providerMatch?.[1] || providerLine.split(/\s+/)[0] || undefined;
    let context = parseCatalogNumber(providerMatch?.[2] || providerLine);

    if (!context && /^[0-9][0-9,]*$/.test(lines[cursor] || '')) {
      context = parseCatalogNumber(lines[cursor++]);
    }

    while (cursor < lines.length && !/^\$/.test(lines[cursor])) cursor += 1;
    const inputPrice = parseCatalogNumber(lines[cursor++]);
    while (cursor < lines.length && !/^\$/.test(lines[cursor])) cursor += 1;
    const outputPrice = parseCatalogNumber(lines[cursor]);

    models.push({
      id,
      name: prettifySumopodModelName(id, badge),
      provider,
      context,
      inputPrice,
      outputPrice
    });
  }

  return models;
};

const parseDelimitedSumopodCatalog = (raw: string) => raw
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((line) => !/^model(?:,|\t)/i.test(line))
  .map((line) => {
    const columns = splitDelimitedCatalogLine(line);
    if (columns.length < 4) return null;
    const hasDiscountColumn = /%/.test(columns[1] || '');
    return normalizeSumopodCatalogModel({
      id: columns[0],
      badge: hasDiscountColumn ? columns[1] : '',
      provider: columns[hasDiscountColumn ? 2 : 1],
      context: columns[hasDiscountColumn ? 3 : 2],
      inputPrice: columns[hasDiscountColumn ? 4 : 3],
      outputPrice: columns[hasDiscountColumn ? 5 : 4]
    });
  })
  .filter(Boolean) as SumopodCatalogModel[];

const parseSumopodCatalogText = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.models) ? parsed.models : Array.isArray(parsed?.data) ? parsed.data : [];
    const models = items.map(normalizeSumopodCatalogModel).filter(Boolean) as SumopodCatalogModel[];
    if (models.length > 0) return Array.from(new Map(models.map((model) => [model.id, model])).values());
  } catch {
    // Continue with text-based catalog parsing.
  }

  const delimited = /,|\t/.test(trimmed) ? parseDelimitedSumopodCatalog(trimmed) : [];
  const models = delimited.length > 0 ? delimited : parsePlainSumopodCatalog(trimmed);
  return Array.from(new Map(models.map((model) => [model.id, model])).values());
};







export default function AppFull() {
  const store = useAppStore();
  const terminalCommandRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCloningRepo, setIsCloningRepo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceFolders, setWorkspaceFolders] = useState<string[]>([]);
  const [editorMode, setEditorMode] = useState<'monaco' | 'textarea'>('monaco');
  const [devServerUrl, setDevServerUrl] = useState<string | null>(null);
  const [resizeMode, setResizeMode] = useState<'sidebar' | 'bottom' | 'ai' | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [activeMenu, setActiveMenu] = useState<HeaderMenuKey | null>(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiModelSearch, setAiModelSearch] = useState('');
  const [cloneRepoUrl, setCloneRepoUrl] = useState('');
  const [cloneDestination, setCloneDestination] = useState('');
  const [showConnectRepoModal, setShowConnectRepoModal] = useState(false);
  const [connectRepoUrl, setConnectRepoUrl] = useState('');
  const [connectRepoBranch, setConnectRepoBranch] = useState('main');
  const [connectRepoToken, setConnectRepoToken] = useState(() => localStorage.getItem('aura_github_token') || '');
  const [isConnectingRepo, setIsConnectingRepo] = useState(false);
  const [isTestingGithubToken, setIsTestingGithubToken] = useState(false);
  const [githubTokenStatus, setGithubTokenStatus] = useState<{
    tone: 'idle' | 'success' | 'error';
    message: string;
  }>({ tone: 'idle', message: '' });
  const [detectedOriginUrl, setDetectedOriginUrl] = useState('');
  const [draftViewMode, setDraftViewMode] = useState<'editor' | 'diff'>('diff');
  const [openFileTabs, setOpenFileTabs] = useState<string[]>([]);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<string>('');
  const [bottomPanelTab, setBottomPanelTab] = useState<'terminal' | 'problems'>('terminal');
  const [aiActivityEntries, setAiActivityEntries] = useState<AiActivityEntry[]>([]);
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);
  const [previewSnapshot, setPreviewSnapshot] = useState<PreviewSnapshot | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<PreviewScreenshot | null>(null);
  const [isPreviewInspecting, setIsPreviewInspecting] = useState(false);
  const [showPreviewInspectorDetails, setShowPreviewInspectorDetails] = useState(false);
  const lastOpenedPreviewRef = useRef<string | null>(null);
  const verificationActivityByCommandRef = useRef<Record<string, string>>({});
  const verificationQueueByActivityRef = useRef<Record<string, string[]>>({});
  const activityContextByIdRef = useRef<Record<string, { userPrompt: string; domains: string[]; preferredTargets: string[]; taskPresetId: string }>>({});
  const previewReviewAttemptedRef = useRef<Record<string, boolean>>({});
  const verificationRecoveryAttemptsRef = useRef<Record<string, number>>({});
  const latestVerificationActivityIdRef = useRef<string | null>(null);
  const runtimeRecoverySignatureRef = useRef<Record<string, string>>({});
  const aiRunIdRef = useRef(0);
  const activeAiActivityIdRef = useRef<string | null>(null);
  const terminal = useTerminal(
    (url) => {
      setDevServerUrl(url);
      store.setShowBottomPanel(true);
    },
    (command) => {
      const normalized = command.trim().toLowerCase();
      if (
        normalized === workspacePackageManager.devCommand.toLowerCase() ||
        normalized === 'npm run dev' ||
        normalized === 'pnpm dev' ||
        normalized === 'yarn dev' ||
        normalized === 'bun run dev'
      ) {
        setDevServerUrl(null);
        lastOpenedPreviewRef.current = null;
      }
    }
  );
  const aiManager = useAiManager(terminal.appendTerminalOutput);

  useEffect(() => {
    if (showAiSettings && store.aiProvider === 'puter') {
      void aiManager.preparePuter();
    }
  }, [showAiSettings, store.aiProvider]);

  const activeFile = useMemo(
    () => store.files.find((file) => file.id === store.activeFileId) || store.files[0] || null,
    [store.files, store.activeFileId]
  );
  const explorerTree = useMemo(
    () => buildExplorerTree(store.files, workspaceFolders, store.nativeProjectPath),
    [store.files, workspaceFolders, store.nativeProjectPath]
  );
  const workspaceHealth = useMemo(
    () => analyzeWorkspaceHealth(store.files, store.nativeProjectPath),
    [store.files, store.nativeProjectPath]
  );
  const activeAiCredential = useMemo(() => {
    switch (store.aiProvider) {
      case 'openrouter':
        return store.openRouterApiKey;
      case 'bytez':
        return store.bytezApiKey;
      case 'sumopod':
        return store.sumopodApiKey;
      case 'puter':
        return store.puterApiKey;
      case 'ollama':
        return store.ollamaUrl;
      default:
        return store.geminiApiKey;
    }
  }, [
    store.aiProvider,
    store.openRouterApiKey,
    store.bytezApiKey,
    store.sumopodApiKey,
    store.puterApiKey,
    store.ollamaUrl,
    store.geminiApiKey
  ]);
  const aiModelOptions = useMemo(() => {
    const prioritizeModels = (provider: string, models: Array<{ id: string; name: string; meta?: string }>) => {
      const priorities = CODING_MODEL_PRIORITIES[provider] || [];
      const scored = models.map((model, index) => {
        const priorityIndex = priorities.indexOf(model.id);
        const badge = CODING_MODEL_LABELS[model.id];
        return {
          ...model,
          badge,
          sortPriority: priorityIndex === -1 ? 999 : priorityIndex,
          originalIndex: index
        };
      });

      return scored.sort((a, b) => {
        if (a.sortPriority !== b.sortPriority) return a.sortPriority - b.sortPriority;
        return a.originalIndex - b.originalIndex;
      });
    };

    switch (store.aiProvider) {
      case 'openrouter':
        return prioritizeModels('openrouter', [{ id: 'auto-free', name: 'Auto Select (OpenRouter)', meta: 'fallback' }, ...(store.dynamicFreeModels.length > 0 ? store.dynamicFreeModels : [])]
          .map((model: any) => ({
            id: model.id,
            name: model.name || model.id,
            meta: [
              formatCompactPrice(model.prompt_price, ''),
              model.context_length ? `${Intl.NumberFormat().format(model.context_length)} ctx` : ''
            ].filter(Boolean).join(' • ')
          })));
      case 'bytez':
        return prioritizeModels('bytez', (store.dynamicBytezModels.length > 0 ? store.dynamicBytezModels : BYTEZ_MODEL_FALLBACK)
          .map((model: any) => ({
            id: model.id,
            name: model.name || model.id,
            meta: model.priceLabel || ''
          })));
      case 'sumopod':
        return prioritizeModels('sumopod', (store.dynamicSumopodModels.length > 0 ? store.dynamicSumopodModels : SUMOPOD_MODEL_FALLBACKS)
          .map((model: any) => ({
          id: model.id,
          name: model.name,
          meta: [
            model.provider || '',
            typeof model.context === 'number' && model.context > 0 ? `${Intl.NumberFormat().format(model.context)} ctx` : '',
            typeof model.inputPrice === 'number'
              ? `${formatCompactPrice(model.inputPrice)} in • ${formatCompactPrice(model.outputPrice ?? 0)} out`
              : ''
          ].filter(Boolean).join(' • ')
        })));
      case 'puter':
        return prioritizeModels('puter', (store.dynamicPuterModels.length > 0 ? store.dynamicPuterModels : PUTER_MODEL_FALLBACKS)
          .map((model: any) => ({
            id: model.id,
            name: model.name || model.id,
            meta: [
              model.provider ? `${model.provider}` : '',
              typeof model.cost?.input === 'number'
                ? `${model.cost.input}/${model.cost.tokens || 1000000} in`
                : ''
            ].filter(Boolean).join(' • ')
          })));
      case 'ollama':
        return prioritizeModels('ollama', [
          { id: 'llama3', name: 'Llama 3', meta: 'local' },
          { id: 'mistral', name: 'Mistral', meta: 'local' },
          { id: 'codellama', name: 'CodeLlama', meta: 'local' },
          { id: 'deepseek-coder', name: 'DeepSeek Coder', meta: 'local' },
          { id: 'qwen2.5-coder', name: 'Qwen 2.5 Coder', meta: 'local' }
        ]);
      default:
        return prioritizeModels('gemini', GEMINI_MODELS.map((model) => ({ id: model.id, name: model.name, meta: 'google' })));
    }
  }, [
    store.aiProvider,
    store.dynamicFreeModels,
    store.dynamicBytezModels,
    store.dynamicPuterModels,
    store.dynamicSumopodModels
  ]);
  const aiRecommendationChips = useMemo(() => {
    const priorities = CODING_MODEL_PRIORITIES[store.aiProvider] || [];
    return priorities
      .map((modelId) => {
        const found = aiModelOptions.find((item) => item.id === modelId);
        if (!found) return null;
        return {
          id: found.id,
          name: found.name,
          badge: (found as any).badge || CODING_MODEL_LABELS[found.id] || 'Recommended'
        };
      })
      .filter(Boolean) as Array<{ id: string; name: string; badge: string }>;
  }, [store.aiProvider, aiModelOptions]);
  const aiRecommendedOptions = useMemo(
    () => aiRecommendationChips
      .map((chip) => aiModelOptions.find((model) => model.id === chip.id))
      .filter(Boolean) as Array<{ id: string; name: string; meta?: string; badge?: string }>,
    [aiRecommendationChips, aiModelOptions]
  );
  const aiAllOtherOptions = useMemo(
    () => aiModelOptions.filter((model) => !aiRecommendedOptions.some((recommended) => recommended.id === model.id)),
    [aiModelOptions, aiRecommendedOptions]
  );
  const aiModelSearchNormalized = aiModelSearch.trim().toLowerCase();
  const filteredRecommendedOptions = useMemo(
    () => aiRecommendedOptions.filter((model) => formatModelDropdownLabel(model).toLowerCase().includes(aiModelSearchNormalized)),
    [aiRecommendedOptions, aiModelSearchNormalized]
  );
  const filteredAllOtherOptions = useMemo(
    () => aiAllOtherOptions.filter((model) => formatModelDropdownLabel(model).toLowerCase().includes(aiModelSearchNormalized)),
    [aiAllOtherOptions, aiModelSearchNormalized]
  );
  const activeTaskPreset = useMemo(
    () => DEVELOPER_TASK_PRESETS.find((preset) => preset.id === store.aiTaskPreset) || DEVELOPER_TASK_PRESETS[0],
    [store.aiTaskPreset]
  );
  const isFastFixDraft = useMemo(
    () => isErrorFixPrompt(store.chatInput, store.attachedFiles),
    [store.chatInput, store.attachedFiles]
  );
  const activeCollectiveSkill = useMemo(
    () => AURA_COLLECTIVE.find((skill) => skill.id === store.activeAgentId || skill.name === store.selectedSkill) || null,
    [store.activeAgentId, store.selectedSkill]
  );
  const activeDomainFocus = useMemo(
    () => detectWorkDomains(store.chatInput || activeTaskPreset.label, activeFile, store.files),
    [store.chatInput, activeTaskPreset.label, activeFile, store.files]
  );
  const activePreferredTargets = useMemo(
    () => inferPreferredWorkspaceTargets(activeDomainFocus, store.files, store.nativeProjectPath, activeFile),
    [activeDomainFocus, store.files, store.nativeProjectPath, activeFile]
  );
  const activeProcessingEntry = useMemo(() => {
    if (!store.isAiLoading) return null;
    const directMatch = activeAiActivityIdRef.current
      ? aiActivityEntries.find((entry) => entry.id === activeAiActivityIdRef.current)
      : null;
    if (directMatch) return directMatch;
    return aiActivityEntries.find((entry) => entry.status === 'planning' || entry.status === 'working') || null;
  }, [aiActivityEntries, store.isAiLoading]);
  const activeTestMeta = store.testMeta[store.aiProvider];
  const visualReviewProviderOptions = useMemo(
    () => [{ id: 'same', name: 'Same as Coding Provider' }, ...AI_PROVIDERS],
    []
  );
  const workspacePackageManager = useMemo(
    () => detectWorkspacePackageManager(store.files),
    [store.files]
  );
  const pendingDrafts = useMemo(
    () => store.stagingFiles.filter((file) => file.status === 'pending'),
    [store.stagingFiles]
  );
  const problemEntries = useMemo(() => {
    const entries: string[] = [];
    if (workspaceError) entries.push(workspaceError);
    workspaceHealth.forEach((issue) => entries.push(`${issue.title}: ${issue.detail}`));
    const providerError = store.testError[store.aiProvider];
    if (providerError) entries.push(`AI ${store.aiProvider}: ${providerError}`);
    return entries;
  }, [workspaceError, workspaceHealth, store.testError, store.aiProvider]);
  const totalProblemCount = store.problems.length + problemEntries.length;
  const stagingByPath = useMemo(
    () => new Map(store.stagingFiles.map((file) => [normalizePath(file.path), file])),
    [store.stagingFiles]
  );
  const activeDraft = activeFile ? stagingByPath.get(normalizePath(activeFile.path || activeFile.id)) : undefined;
  const resolveAiActivityFileId = (filePath: string) => {
    const fullFile = store.files.find((file) => normalizePath(file.path || file.id).endsWith(normalizePath(filePath)));
    return fullFile?.id || null;
  };

  const pushAiActivity = (
    title: string,
    summary: string,
    status: 'planning' | 'working' | 'done' | 'error',
    files: string[] = [],
    domains: string[] = [],
    steps: AiActivityEntry['steps'] = []
  ) => {
    const entryId = `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setAiActivityEntries((prev) => [
      {
        id: entryId,
        title,
        summary,
        files,
        domains,
        createdAt: Date.now(),
        status,
        steps
      },
      ...prev
    ]);
    return entryId;
  };

  const pushAiActivityEntry = (entry: AiActivityEntry) => {
    setAiActivityEntries((prev) => [entry, ...prev]);
    return entry.id;
  };

  const updateAiActivity = (
    activityId: string,
    updates: Partial<Pick<AiActivityEntry, 'title' | 'summary' | 'files' | 'domains' | 'suggestedCommands' | 'status' | 'steps'>>
  ) => {
    setAiActivityEntries((prev) => prev.map((entry) => (
      entry.id === activityId ? { ...entry, ...updates } : entry
    )));
  };

  const upsertVerificationStep = (
    activityId: string,
    command: string,
    status: 'planning' | 'working' | 'done' | 'error',
    detail: string
  ) => {
    setAiActivityEntries((prev) => upsertVerificationStepInEntries(prev, activityId, command, status, detail));
  };

  const appendAiActivityStep = (
    activityId: string,
    step: NonNullable<AiActivityEntry['steps']>[number]
  ) => {
    setAiActivityEntries((prev) => prev.map((entry) => {
      if (entry.id !== activityId) return entry;
      const steps = [...(entry.steps || [])];
      const existingIndex = steps.findIndex((item) => item.label === step.label);
      if (existingIndex >= 0) {
        steps[existingIndex] = step;
      } else {
        steps.push(step);
      }
      return { ...entry, steps };
    }));
  };

  const markAiActivityStopped = (activityId: string, message: string) => {
    setAiActivityEntries((prev) => prev.map((entry) => {
      if (entry.id !== activityId) return entry;
      return {
        ...entry,
        status: 'error',
        summary: message,
        steps: (entry.steps || []).map((step) => (
          step.status === 'working' || step.status === 'planning'
            ? {
                ...step,
                status: 'error',
                detail: step.label === 'Generating' ? message : step.detail
              }
            : step
        ))
      };
    }));
  };

  const handleStopAiPrompt = () => {
    if (!store.isAiLoading) return;
    aiRunIdRef.current += 1;
    const activityId = activeAiActivityIdRef.current;
    const message = 'Permintaan AI dihentikan oleh pengguna.';
    if (activityId) {
      markAiActivityStopped(activityId, message);
    }
    activeAiActivityIdRef.current = null;
    store.setIsAiLoading(false);
    terminal.appendTerminalOutput(`[AI] ${message}`);
    store.setChatMessages((prev) => [...prev, { role: 'assistant', content: `[AURA] ${message}` }]);
    setWorkspaceError(message);
  };

  const buildAutoVerificationCommands = (
    suggestedCommands: Array<{ label: string; command: string; reason: string }>
  ) => {
    const priorities = ['install', 'build', 'run dev', 'dev', 'lint'];
    const sorted = [...suggestedCommands].sort((a, b) => {
      const aIndex = priorities.findIndex((item) => a.label.toLowerCase().includes(item));
      const bIndex = priorities.findIndex((item) => b.label.toLowerCase().includes(item));
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    const picked: string[] = [];
    for (const item of sorted) {
      const normalized = item.command.trim().toLowerCase();
      const isInstall = /(?:^|\s)(npm|pnpm|yarn|bun)\s+(install|i)\b/.test(normalized);
      const isBuild = /\b(run\s+build|build)\b/.test(normalized);
      const isDev = /\b(run\s+dev|dev)\b/.test(normalized);
      const isLint = /\b(run\s+lint|lint)\b/.test(normalized);
      if (!isInstall && !isBuild && !isDev && !isLint) continue;
      if (!picked.some((command) => command.toLowerCase() === normalized)) {
        picked.push(item.command);
      }
      if (picked.length >= 4) break;
    }

    return picked;
  };

  const runVerificationCommandForActivity = (activityId: string, command: string, detail: string) => {
    verificationActivityByCommandRef.current[command.toLowerCase()] = activityId;
    latestVerificationActivityIdRef.current = activityId;
    upsertVerificationStep(activityId, command, 'working', detail);
    store.setShowBottomPanel(true);
    terminal.appendTerminalOutput(`[AURA] Menjalankan verifikasi dari AI Activity: ${command}`);
    terminal.executeTerminalCommand(command);
  };

  const runAutoVerificationQueue = (activityId: string, commands: string[]) => {
    if (!commands.length) return;
    verificationQueueByActivityRef.current[activityId] = [...commands];
    const [firstCommand, ...rest] = commands;
    verificationQueueByActivityRef.current[activityId] = rest;
    runVerificationCommandForActivity(
      activityId,
      firstCommand,
      'Verifikasi otomatis dimulai dari alur AI setelah file berhasil ditulis ke workspace.'
    );
  };

  const detectRecoverableRuntimeError = (lines: string[]) => {
    const windowLines = lines.slice(-80);
    const joined = windowLines.join('\n');
    if (!joined.trim()) return null;

    const patterns = [
      /Failed to resolve import/i,
      /Cannot apply unknown utility class/i,
      /Failed to load PostCSS config/i,
      /Transform failed with \d+ error/i,
      /\[plugin:vite:import-analysis\]/i,
      /\[plugin:vite:css\]/i,
      /\[@tailwindcss\/vite:generate:(?:serve|build)\]/i,
      /Does the file exist\?/i
    ];

    if (!patterns.some((pattern) => pattern.test(joined))) {
      return null;
    }

    return windowLines.slice(-20).join('\n');
  };

  const generateCurrentProviderResponse = (promptWithPreset: string, attachments: AttachedFile[] = []) =>
    generateAiProviderResponse({
      provider: store.aiProvider,
      promptWithPreset,
      attachments,
      historyBeforePrompt: [],
      temperature: store.aiTemperature,
      geminiApiKey: store.geminiApiKey,
      selectedModel: store.selectedModel,
      openRouterApiKey: store.openRouterApiKey,
      openRouterModel: store.openRouterModel,
      bytezApiKey: store.bytezApiKey,
      bytezModel: store.bytezModel,
      sumopodApiKey: store.sumopodApiKey,
      sumopodModel: store.sumopodModel,
      puterModel: store.puterModel
    });

  const collectVerificationRecoveryFiles = (preferredTargets: string[]) => {
    const normalizedTargets = preferredTargets.map((target) => normalizePath(target).replace(/^\/+/, ''));
    const candidateFiles = [...store.files]
      .filter((file) => /\.(tsx?|jsx?|css|scss|sass|less|html|json|mjs|cjs)$/i.test(file.name))
      .map((file) => ({
        ...file,
        relativePath: getRelativeFilePath(file.id, store.nativeProjectPath || '')
      }))
      .sort((a, b) => {
        const aPreferred = normalizedTargets.some((target) => a.relativePath.startsWith(target));
        const bPreferred = normalizedTargets.some((target) => b.relativePath.startsWith(target));
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
        return a.relativePath.localeCompare(b.relativePath);
      })
      .slice(0, 16);

    return candidateFiles.map((file) => ({
      relativePath: file.relativePath,
      content: file.content.length > 16000
        ? `${file.content.slice(0, 16000)}\n/* ...truncated for verification recovery... */`
        : file.content
    }));
  };

  const runVerificationRecoveryLoop = async ({
    activityId,
    failedCommand,
    recoveryMode = 'verification-failure'
  }: {
    activityId: string;
    failedCommand: string;
    recoveryMode?: 'verification-failure' | 'runtime-error';
  }) => {
    const context = activityContextByIdRef.current[activityId];
    if (!context) return false;

    const attempts = verificationRecoveryAttemptsRef.current[activityId] || 0;
    if (attempts >= 1) {
      return false;
    }

    const normalizedCommand = failedCommand.trim().toLowerCase();
    const canRecoverVerificationFailure = /(install|build|lint)/.test(normalizedCommand);
    const canRecoverRuntimeError =
      recoveryMode === 'runtime-error' &&
      normalizedCommand === workspacePackageManager.devCommand.toLowerCase();

    if (!canRecoverVerificationFailure && !canRecoverRuntimeError) {
      return false;
    }

    verificationRecoveryAttemptsRef.current[activityId] = attempts + 1;
    const terminalLines = terminal.currentSession?.output || [];
    const terminalOutput = terminalLines.slice(-120).join('\n').trim() || 'No terminal output captured.';
    const relevantFiles = collectVerificationRecoveryFiles(context.preferredTargets);

    appendAiActivityStep(activityId, {
      label: 'Auto Fix Loop',
      detail: recoveryMode === 'runtime-error'
        ? `AURA mendeteksi error runtime saat \`${failedCommand}\` masih berjalan dan mencoba memperbaikinya otomatis.`
        : `Verifikasi \`${failedCommand}\` gagal. AURA mencoba memperbaiki penyebab error dari log terminal lalu menjalankan ulang command.`,
      status: 'working'
    });

    const recoveryPrompt = buildVerificationRecoveryPrompt({
      userPrompt: context.userPrompt,
      failedCommand,
      terminalOutput,
      domains: context.domains,
      preferredTargets: context.preferredTargets,
      projectRulesContext: buildProjectRulesContext({
        files: useAppStore.getState().files,
        rootPath: store.nativeProjectPath,
        activeFilePath: activeFile?.path || activeFile?.id || null,
        prompt: context.userPrompt,
        domains: context.domains
      }),
      relevantFiles
    });

    const responseText = await generateCurrentProviderResponse(recoveryPrompt);
    const recoveryBundle = prepareAiDraftBundle({
      responseText,
      activeFile,
      nativeProjectPath: store.nativeProjectPath,
      preferredTargets: context.preferredTargets,
      files: useAppStore.getState().files,
      domains: context.domains
    });

    if (recoveryBundle.generatedFiles.length === 0) {
      appendAiActivityStep(activityId, {
        label: 'Auto Fix Loop',
        detail: 'Model tidak mengembalikan patch perbaikan yang valid untuk recovery loop.',
        status: 'error'
      });
      return false;
    }

    for (const draft of recoveryBundle.nextDrafts) {
      appendAiActivityStep(activityId, {
        label: `Recovery Write • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
        detail: `Menulis perbaikan recovery ke ${draft.path}.`,
        status: 'working'
      });
      await applyResolvedDraft(draft);
      upsertWorkspaceFile(draft.path, draft.newContent);
      openCenterFile(draft.path);
      appendAiActivityStep(activityId, {
        label: `Recovery Write • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
        detail: `Perbaikan recovery selesai untuk ${draft.path}.`,
        status: 'done'
      });
    }

    await refreshWorkspaceFromDisk();

    appendAiActivityStep(activityId, {
      label: 'Auto Fix Loop',
      detail: `Recovery loop menulis ${recoveryBundle.generatedFiles.length} file dan menjalankan ulang \`${failedCommand}\`.`,
      status: 'done'
    });

    updateAiActivity(activityId, {
      status: 'working',
      summary: `AURA mencoba recovery otomatis setelah \`${failedCommand}\` gagal.`
    });

    runVerificationCommandForActivity(
      activityId,
      failedCommand,
      `Recovery loop menjalankan ulang \`${failedCommand}\` setelah menerapkan patch otomatis.`
    );
    return true;
  };

  const collectPreviewReviewFiles = (preferredTargets: string[]) => {
    const normalizedTargets = preferredTargets.map((target) => normalizePath(target).replace(/^\/+/, ''));
    const frontendFiles = [...store.files]
      .filter((file) => /\.(tsx?|jsx?|css|scss|sass|less|html)$/i.test(file.name))
      .map((file) => ({
        ...file,
        relativePath: getRelativeFilePath(file.id, store.nativeProjectPath || '')
      }))
      .sort((a, b) => {
        const aPreferred = normalizedTargets.some((target) => a.relativePath.startsWith(target));
        const bPreferred = normalizedTargets.some((target) => b.relativePath.startsWith(target));
        if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
        return a.relativePath.localeCompare(b.relativePath);
      })
      .slice(0, 12);

    return frontendFiles.map((file) => ({
      relativePath: file.relativePath,
      content: file.content.length > 12000
        ? `${file.content.slice(0, 12000)}\n/* ...truncated for preview review... */`
        : file.content
    }));
  };

  const runUiReviewLoop = async ({
    activityId,
    userPrompt,
    domains,
    preferredTargets,
    taskPresetId,
    generatedFiles
  }: {
    activityId: string;
    userPrompt: string;
    domains: string[];
    preferredTargets: string[];
    taskPresetId: string;
    generatedFiles: PreparedAiDraftBundle['generatedFiles'];
  }) => {
    if (!shouldRunUiReviewLoop(domains, taskPresetId) || generatedFiles.length === 0) {
      return { refinedCount: 0, suggestedCommands: [] as Array<{ label: string; command: string; reason: string }> };
    }

    const reviewPreset = DEVELOPER_TASK_PRESETS.find((preset) => preset.id === taskPresetId) || activeTaskPreset;
    const weakUiOutput = isWeakFrontendOutput(generatedFiles, userPrompt);

    appendAiActivityStep(activityId, {
      label: 'UI Review',
      detail: weakUiOutput
        ? 'Output awal terlalu lemah, jadi quality gate memaksa regenerasi UI utama dengan struktur yang lebih kuat.'
        : 'Menjalankan quality gate UI/UX otomatis untuk mengkritik hierarchy, contrast, spacing, fallback state, dan polish visual.',
      status: 'working'
    });

    const reviewPrompt = buildUiReviewLoopPrompt({
      userPrompt,
      domains,
      preferredTargets,
      projectRulesContext: buildProjectRulesContext({
        files: useAppStore.getState().files,
        rootPath: store.nativeProjectPath,
        activeFilePath: activeFile?.path || activeFile?.id || null,
        prompt: userPrompt,
        domains
      }),
      checklist: [
        ...(reviewPreset.executionChecklist || []),
        ...((activeCollectiveSkill?.checklist || []).slice(0, 6))
      ],
      forceRewrite: weakUiOutput,
      generatedFiles: generatedFiles.map((file) => ({
        relativePath: file.relativePath,
        content: file.content
      }))
    });

    const responseText = await generateAiProviderResponse({
      provider: store.aiProvider,
      promptWithPreset: reviewPrompt,
      attachments: [],
      historyBeforePrompt: [],
      temperature: store.aiTemperature,
      geminiApiKey: store.geminiApiKey,
      selectedModel: store.selectedModel,
      openRouterApiKey: store.openRouterApiKey,
      openRouterModel: store.openRouterModel,
      bytezApiKey: store.bytezApiKey,
      bytezModel: store.bytezModel,
      sumopodApiKey: store.sumopodApiKey,
      sumopodModel: store.sumopodModel,
      puterModel: store.puterModel
    });

    if (responseText.trim() === 'NO_UI_CHANGES_NEEDED') {
      appendAiActivityStep(activityId, {
        label: 'UI Review',
        detail: 'Quality gate UI menyatakan tidak perlu refinement tambahan.',
        status: 'done'
      });
      return { refinedCount: 0, suggestedCommands: [] as Array<{ label: string; command: string; reason: string }> };
    }

    const reviewBundle = prepareAiDraftBundle({
      responseText,
      activeFile,
      nativeProjectPath: store.nativeProjectPath,
      preferredTargets,
      files: useAppStore.getState().files,
      domains
    });

    if (reviewBundle.generatedFiles.length === 0) {
      appendAiActivityStep(activityId, {
        label: 'UI Review',
        detail: 'Loop review selesai, tetapi model tidak mengembalikan refinement file yang valid.',
        status: 'done'
      });
      return { refinedCount: 0, suggestedCommands: [] as Array<{ label: string; command: string; reason: string }> };
    }

    appendAiActivityStep(activityId, {
      label: 'UI Review',
      detail: `Quality gate menemukan ${reviewBundle.generatedFiles.length} refinement file untuk meningkatkan hasil UI.`,
      status: 'done'
    });

    for (const draft of reviewBundle.nextDrafts) {
      appendAiActivityStep(activityId, {
        label: `Refining • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
        detail: `Menerapkan refinement UI ke ${draft.path}.`,
        status: 'working'
      });
      upsertWorkspaceFile(draft.path, draft.newContent);
      await applyResolvedDraft(draft);
      appendAiActivityStep(activityId, {
        label: `Refining • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
        detail: `Refinement UI selesai untuk ${draft.path}.`,
        status: 'done'
      });
      openCenterFile(draft.path);
    }

    return {
      refinedCount: reviewBundle.generatedFiles.length,
      suggestedCommands: reviewBundle.suggestedCommands
    };
  };

  const runPreviewReviewLoop = async (activityId: string) => {
    if (!devServerUrl) return;
    if (previewReviewAttemptedRef.current[activityId]) return;

    const context = activityContextByIdRef.current[activityId];
    if (!context) return;
    if (!shouldRunUiReviewLoop(context.domains, context.taskPresetId)) return;

    const reviewPreset = DEVELOPER_TASK_PRESETS.find((preset) => preset.id === context.taskPresetId) || activeTaskPreset;

    previewReviewAttemptedRef.current[activityId] = true;

    appendAiActivityStep(activityId, {
      label: 'Preview Review',
      detail: `Membaca runtime preview dari ${devServerUrl} untuk quality gate UI berbasis hasil render yang tersedia.`,
      status: 'working'
    });

    try {
      const snapshot = await capturePreviewSnapshot(devServerUrl);
      const reviewProvider = store.visualReviewProvider === 'same'
        ? store.aiProvider
        : store.visualReviewProvider;
      const screenshotAttachment = previewScreenshot ? [{
        name: 'preview-runtime.png',
        type: 'image/png',
        data: previewScreenshot.dataUrl
      }] : [];

      if (snapshot.shellOnly) {
        appendAiActivityStep(activityId, {
          label: 'Preview Review',
          detail: snapshot.summary,
          status: 'done'
        });
        updateAiActivity(activityId, {
          summary: 'Draft berhasil ditulis dan preview hidup, tetapi runtime review visual dilewati karena halaman masih terbaca sebagai shell SPA.'
        });
        return;
      }

      if (snapshot.starterTemplate) {
        appendAiActivityStep(activityId, {
          label: 'Preview Review',
          detail: snapshot.summary,
          status: 'error'
        });

        const recoveryPrompt = buildStarterReplacementPrompt({
          userPrompt: context.userPrompt,
          preferredTargets: context.preferredTargets,
          projectRulesContext: buildProjectRulesContext({
            files: useAppStore.getState().files,
            rootPath: store.nativeProjectPath,
            activeFilePath: activeFile?.path || activeFile?.id || null,
            prompt: context.userPrompt,
            domains: context.domains
          }),
          generatedFiles: collectPreviewReviewFiles(context.preferredTargets),
          previewSnapshotContext: snapshot.promptContext
        });

        const responseText = await generateAiProviderResponse({
          provider: store.aiProvider,
          promptWithPreset: recoveryPrompt,
          attachments: [],
          historyBeforePrompt: [],
          temperature: store.aiTemperature,
          geminiApiKey: store.geminiApiKey,
          selectedModel: store.selectedModel,
          openRouterApiKey: store.openRouterApiKey,
          openRouterModel: store.openRouterModel,
          bytezApiKey: store.bytezApiKey,
          bytezModel: store.bytezModel,
          sumopodApiKey: store.sumopodApiKey,
          sumopodModel: store.sumopodModel,
          puterModel: store.puterModel
        });

        const recoveryBundle = prepareAiDraftBundle({
          responseText,
          activeFile,
          nativeProjectPath: store.nativeProjectPath,
          preferredTargets: context.preferredTargets,
          files: useAppStore.getState().files,
          domains: context.domains
        });

        if (recoveryBundle.generatedFiles.length === 0) {
          updateAiActivity(activityId, {
            summary: 'Preview masih starter scaffold, tetapi model tidak mengembalikan file entrypoint pengganti.'
          });
          return;
        }

        for (const draft of recoveryBundle.nextDrafts) {
          appendAiActivityStep(activityId, {
            label: `Starter Fix • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
            detail: `Mengganti starter scaffold lewat ${draft.path}.`,
            status: 'working'
          });
          upsertWorkspaceFile(draft.path, draft.newContent);
          await applyResolvedDraft(draft);
          appendAiActivityStep(activityId, {
            label: `Starter Fix • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
            detail: `Starter scaffold diganti pada ${draft.path}.`,
            status: 'done'
          });
          openCenterFile(draft.path);
        }

        updateAiActivity(activityId, {
          summary: 'Preview menunjukkan starter scaffold, jadi AURA memaksa perbaikan entrypoint utama sebelum dianggap selesai.'
        });
        setPreviewRefreshKey((prev) => prev + 1);
        return;
      }

      const reviewPrompt = buildUiReviewLoopPrompt({
        userPrompt: context.userPrompt,
        domains: context.domains,
        preferredTargets: context.preferredTargets,
        projectRulesContext: buildProjectRulesContext({
          files: useAppStore.getState().files,
          rootPath: store.nativeProjectPath,
          activeFilePath: activeFile?.path || activeFile?.id || null,
          prompt: context.userPrompt,
          domains: context.domains
        }),
        checklist: [
          ...(reviewPreset.executionChecklist || []),
          ...((activeCollectiveSkill?.checklist || []).slice(0, 6))
        ],
        generatedFiles: collectPreviewReviewFiles(context.preferredTargets),
        reviewMode: 'preview',
        previewSnapshotContext: snapshot.promptContext
      });

      const responseText = await generateAiProviderResponse({
        provider: reviewProvider,
        promptWithPreset: reviewPrompt,
        attachments: reviewProvider === 'gemini' || reviewProvider === 'openrouter'
          ? screenshotAttachment
          : [],
        historyBeforePrompt: [],
        temperature: store.aiTemperature,
        geminiApiKey: store.geminiApiKey,
        selectedModel: store.selectedModel,
        openRouterApiKey: store.openRouterApiKey,
        openRouterModel: store.openRouterModel,
        bytezApiKey: store.bytezApiKey,
        bytezModel: store.bytezModel,
        sumopodApiKey: store.sumopodApiKey,
        sumopodModel: store.sumopodModel,
        puterModel: store.puterModel
      });

      if (responseText.trim() === 'NO_UI_CHANGES_NEEDED') {
        appendAiActivityStep(activityId, {
          label: 'Preview Review',
          detail: 'Runtime preview lolos quality gate. Tidak ada refinement tambahan yang diperlukan.',
          status: 'done'
        });
        return;
      }

      const reviewBundle = prepareAiDraftBundle({
        responseText,
        activeFile,
        nativeProjectPath: store.nativeProjectPath,
        preferredTargets: context.preferredTargets,
        files: useAppStore.getState().files,
        domains: context.domains
      });

      if (reviewBundle.generatedFiles.length === 0) {
        appendAiActivityStep(activityId, {
          label: 'Preview Review',
          detail: 'Preview review selesai, tetapi model tidak mengembalikan refinement file yang valid.',
          status: 'done'
        });
        return;
      }

      appendAiActivityStep(activityId, {
        label: 'Preview Review',
        detail: `Runtime review via ${reviewProvider} menemukan ${reviewBundle.generatedFiles.length} refinement file tambahan.`,
        status: 'done'
      });

      for (const draft of reviewBundle.nextDrafts) {
        appendAiActivityStep(activityId, {
          label: `Preview Refining • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
          detail: `Menerapkan refinement dari runtime preview ke ${draft.path}.`,
          status: 'working'
        });
        upsertWorkspaceFile(draft.path, draft.newContent);
        await applyResolvedDraft(draft);
        appendAiActivityStep(activityId, {
          label: `Preview Refining • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
          detail: `Refinement runtime preview selesai untuk ${draft.path}.`,
          status: 'done'
        });
        openCenterFile(draft.path);
      }

      updateAiActivity(activityId, {
        summary: `Draft selesai, preview runtime direview, dan ${reviewBundle.generatedFiles.length} refinement tambahan diterapkan.`
      });
    } catch (error: any) {
      appendAiActivityStep(activityId, {
        label: 'Preview Review',
        detail: error?.message || String(error),
        status: 'error'
      });
      updateAiActivity(activityId, {
        summary: `Preview review gagal dijalankan: ${error?.message || error}`
      });
    }
  };

  const inspectPreviewSnapshot = async (url: string) => {
    setIsPreviewInspecting(true);
    try {
      const [snapshot, screenshot] = await Promise.all([
        capturePreviewSnapshot(url),
        capturePreviewScreenshot(url).catch(() => null)
      ]);
      setPreviewSnapshot(snapshot);
      setPreviewScreenshot(screenshot);
      return snapshot;
    } finally {
      setIsPreviewInspecting(false);
    }
  };

  const handleManualPreviewReview = async () => {
    const latestActivity = aiActivityEntries[0];
    if (!latestActivity?.id || !devServerUrl) return;
    previewReviewAttemptedRef.current[latestActivity.id] = false;
    await runPreviewReviewLoop(latestActivity.id);
  };

  const openCenterFile = (fileId: string) => {
    setOpenFileTabs((prev) => prev.includes(fileId) ? prev : [...prev, fileId]);
    store.setActiveFileId(fileId);
    setActiveWorkspaceTab(fileId);
  };

  const openPreviewTab = () => {
    if (!devServerUrl) return;
    setActiveWorkspaceTab(PREVIEW_TAB_ID);
  };

  const closeCenterFileTab = (fileId: string) => {
    const nextState = resolveCloseTabState({
      openFileTabs,
      closingFileId: fileId,
      activeWorkspaceTab,
      hasAiActivity: aiActivityEntries.length > 0
    });
    setOpenFileTabs(nextState.nextTabs);
    store.setActiveFileId(nextState.nextActiveFileId || '');
    setActiveWorkspaceTab(nextState.nextWorkspaceTab);
  };

  const upsertWorkspaceFile = (absolutePath: string, content: string) => {
    store.setFiles((prev) => upsertWorkspaceFileList(prev, absolutePath, content));
  };

  const removeWorkspaceFile = (absolutePath: string) => {
    const normalizedPath = normalizePath(absolutePath);
    const nextFiles = removeWorkspaceFileFromList(store.files, absolutePath);
    store.setFiles(nextFiles);
    if (normalizePath(store.activeFileId) === normalizedPath) {
      const fallbackTab = fallbackWorkspaceTabAfterFileRemoval(nextFiles, store.activeFileId, aiActivityEntries.length);
      if (fallbackTab && fallbackTab !== AI_ACTIVITY_TAB_ID) {
        openCenterFile(fallbackTab);
      } else {
        store.setActiveFileId('');
        setActiveWorkspaceTab(fallbackTab);
      }
    }
  };

  const persistWorkspaceFile = async (targetPath: string, content: string) => {
    await invoke('write_workspace_file', {
      path: targetPath,
      content
    });
  };

  const removeWorkspaceFileFromDisk = async (targetPath: string) => {
    await invoke('delete_workspace_file', {
      path: targetPath
    });
  };

  const refreshWorkspaceFromDisk = async (rootPath = store.nativeProjectPath) => {
    if (!rootPath) return [] as FileItem[];

    const [loadedFiles, loadedFolders] = await Promise.all([
      readWorkspaceFiles(rootPath),
      readWorkspaceFolders(rootPath)
    ]);

    setWorkspaceFolders(loadedFolders);
    store.setFiles(loadedFiles);
    return loadedFiles;
  };

  const applyResolvedDraft = async (draft: typeof store.stagingFiles[number]) => {
    try {
      if (draft.action === 'delete') {
        await removeWorkspaceFileFromDisk(draft.path);
        store.setFiles((prev) => resolveAppliedDraftFiles(prev, draft));
      } else {
        await persistWorkspaceFile(draft.path, draft.newContent);
        store.setFiles((prev) => resolveAppliedDraftFiles(prev, draft));
      }

      store.setStagingFiles((prev) => removeDraftFromList(prev, draft.path));
      setWorkspaceFolders((prev) => Array.from(new Set([...prev, ...collectParentFolderPaths(draft.path, store.nativeProjectPath)])));
      terminal.appendTerminalOutput(`[AURA] Draft diterapkan ke workspace: ${draft.path}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      throw new Error(`Gagal menerapkan ${draft.path}: ${message}`);
    }
  };

  const applyDraftToDisk = async (draftPath: string) => {
    const draft = stagingByPath.get(normalizePath(draftPath));
    if (!draft) return;
    await applyResolvedDraft(draft);
  };

  const discardDraftChange = (draftPath: string) => {
    const draft = stagingByPath.get(normalizePath(draftPath));
    if (!draft) return;

    store.setFiles((prev) => resolveDiscardedDraftFiles(prev, draft));
    store.setStagingFiles((prev) => removeDraftFromList(prev, draft.path));
    terminal.appendTerminalOutput(`[AURA] Draft dibatalkan: ${draft.path}`);
  };

  const runAiSuggestedCommand = (activityId: string, command: string) => {
    verificationQueueByActivityRef.current[activityId] = [];
    runVerificationCommandForActivity(activityId, command, 'Menjalankan verifikasi dari panel AI Activity melalui terminal.');
  };

  useWorkspaceUiEffects({
    files: store.files,
    activeFileId: store.activeFileId,
    activeFile,
    activeDraft,
    explorerTree,
    aiActivityCount: aiActivityEntries.length,
    openFileTabs,
    activeWorkspaceTab,
    setOpenFileTabs,
    setActiveWorkspaceTab,
    setExpandedFolders,
    setDraftViewMode,
    setActiveFileId: store.setActiveFileId
  });

  useEffect(() => {
    logDiagnostic('info', 'workspace', 'AppFull mounted');
  }, []);

  useEffect(() => {
    if (!workspaceError) return;
    logDiagnostic('warn', 'workspace', 'Workspace error set', workspaceError);
  }, [workspaceError]);

  useEffect(() => {
    if (!devServerUrl) return;
    logDiagnostic('info', 'preview', 'Detected dev server URL', devServerUrl);
  }, [devServerUrl]);

  useEffect(() => {
    if (!devServerUrl) {
      setPreviewSnapshot(null);
      setPreviewScreenshot(null);
      return;
    }

    void inspectPreviewSnapshot(devServerUrl).catch((error) => {
      console.warn('[AURA] Failed to inspect preview snapshot:', error);
    });
  }, [devServerUrl, previewRefreshKey]);

  useEffect(() => {
    const currentCommand = terminal.currentSession?.currentCommand?.trim().toLowerCase();
    const processStatus = terminal.currentSession?.processStatus;
    const output = terminal.currentSession?.output || [];
    const devCommand = workspacePackageManager.devCommand.toLowerCase();

    if (currentCommand !== devCommand) return;
    if (processStatus !== 'running') return;

    const runtimeErrorLog = detectRecoverableRuntimeError(output);
    if (!runtimeErrorLog) return;

    const activityId =
      verificationActivityByCommandRef.current[devCommand] ||
      latestVerificationActivityIdRef.current;
    if (!activityId) return;

    const nextSignature = `${activityId}::${runtimeErrorLog}`;
    if (runtimeRecoverySignatureRef.current[activityId] === nextSignature) {
      return;
    }
    runtimeRecoverySignatureRef.current[activityId] = nextSignature;

    appendAiActivityStep(activityId, {
      label: 'Runtime Error Watch',
      detail: 'AURA mendeteksi error runtime dari dev server dan memulai recovery otomatis.',
      status: 'working'
    });

    void runVerificationRecoveryLoop({
      activityId,
      failedCommand: workspacePackageManager.devCommand,
      recoveryMode: 'runtime-error'
    }).then((recovered) => {
      if (!recovered) {
        appendAiActivityStep(activityId, {
          label: 'Runtime Error Watch',
          detail: 'AURA mendeteksi error runtime, tetapi belum menemukan patch otomatis yang valid.',
          status: 'error'
        });
      }
    }).catch((error) => {
      console.warn('[AURA] Runtime recovery failed:', error);
      appendAiActivityStep(activityId, {
        label: 'Runtime Error Watch',
        detail: 'Recovery otomatis dari runtime error gagal dijalankan.',
        status: 'error'
      });
    });
  }, [
    terminal.currentSession?.currentCommand,
    terminal.currentSession?.processStatus,
    terminal.currentSession?.output,
    workspacePackageManager.devCommand
  ]);

  useEffect(() => {
    if (!store.showAiPanel) return;
    if (store.aiProvider === 'openrouter' || store.aiProvider === 'puter') {
      void aiManager.refreshModels();
      return;
    }

    if (store.aiProvider === 'bytez' && store.bytezApiKey.trim()) {
      void aiManager.refreshModels();
    }
  }, [store.showAiPanel, store.aiProvider, store.bytezApiKey]);

  useEffect(() => {
    const handleWindowPointerDown = () => setActiveMenu(null);
    window.addEventListener('pointerdown', handleWindowPointerDown);
    return () => window.removeEventListener('pointerdown', handleWindowPointerDown);
  }, []);

  useEffect(() => {
    if (!store.showBottomPanel) return;
    const timeout = window.setTimeout(() => terminalCommandRef.current?.focus(), 120);
    return () => window.clearTimeout(timeout);
  }, [store.showBottomPanel, store.activeTerminalId]);

  useEffect(() => {
    if (!resizeMode) return;

    const handlePointerMove = (event: MouseEvent) => {
      if (resizeMode === 'sidebar') {
        const nextWidth = Math.min(Math.max(event.clientX, 180), 520);
        store.setSidebarWidth(nextWidth);
        return;
      }

      if (resizeMode === 'ai') {
        const nextWidth = Math.min(Math.max(window.innerWidth - event.clientX, 280), 640);
        store.setAiPanelWidth(nextWidth);
        return;
      }

      const nextHeight = Math.min(Math.max(window.innerHeight - event.clientY, 160), 520);
      store.setBottomHeight(nextHeight);
    };

    const handlePointerUp = () => {
      setResizeMode(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = resizeMode === 'sidebar' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizeMode, store]);

  const handleOpenFolder = async () => {
    setIsOpeningFolder(true);
    setWorkspaceError(null);
    setDevServerUrl(null);
    logDiagnostic('info', 'workspace', 'Open folder requested');

    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Open Workspace Folder'
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      const normalizedRoot = normalizePath(selected);
      const [loadedFiles, loadedFolders] = await Promise.all([
        readWorkspaceFiles(normalizedRoot),
        readWorkspaceFolders(normalizedRoot)
      ]);

      setWorkspaceFolders(loadedFolders);
      store.setNativeProjectPath(normalizedRoot);
        store.setProjectName(getWorkspaceDisplayName(normalizedRoot));
        store.setFiles(loadedFiles);
        if (loadedFiles[0]?.id) {
          openCenterFile(loadedFiles[0].id);
        } else {
          store.setActiveFileId('');
          setActiveWorkspaceTab('');
        }
        store.setShowSidebar(true);
        store.setShowBottomPanel(true);
        store.setShowAiPanel(true);
        store.setTerminalSessions((prev) => prev.map(buildWorkspaceSessionUpdate(normalizedRoot, store.activeTerminalId)));
      logDiagnostic('info', 'workspace', 'Workspace opened', normalizedRoot);
    } catch (error: any) {
      console.error('[AURA] Failed to open workspace:', error);
      logDiagnostic('error', 'workspace', 'Failed to open workspace', error?.stack || error?.message || error);
      setWorkspaceError(error?.message || 'Failed to open workspace folder.');
    } finally {
      setIsOpeningFolder(false);
    }
  };

  const handleSaveActiveFile = async () => {
    if (!activeFile || !store.nativeProjectPath) return;
    setIsSaving(true);
    setWorkspaceError(null);

    try {
      const targetPath = activeFile.path || activeFile.id;
      const parentDir = targetPath.split('/').slice(0, -1).join('/');
      if (parentDir) {
        await mkdir(parentDir, { recursive: true });
      }
      await persistWorkspaceFile(targetPath, activeFile.content);
      store.setFiles((prev) => prev.map((file) =>
        file.id === activeFile.id ? { ...file, lastModified: Date.now() } : file
      ));
      store.setStagingFiles((prev) => prev.filter((item) => normalizePath(item.path) !== normalizePath(targetPath)));
    } catch (error: any) {
      console.error('[AURA] Failed to save file:', error);
      setWorkspaceError(error?.message || 'Failed to save active file.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditorChange = (value: string) => {
    if (!activeFile) return;
    store.setFiles((prev) =>
      prev.map((file) => (file.id === activeFile.id ? { ...file, content: value } : file))
    );
    if (activeDraft) {
      store.setStagingFiles((prev) => prev.map((item) =>
        normalizePath(item.path) === normalizePath(activeDraft.path)
          ? { ...item, newContent: value }
          : item
      ));
    }
  };

  const handleOpenDetectedPreview = async () => {
    if (!devServerUrl) return;

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      try {
        await Command.create('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Start-Process '${devServerUrl}'`]).execute();
        return;
      } catch {
        await Command.create('cmd', ['/C', 'start', '', devServerUrl]).execute();
        return;
      }
    } catch {
      window.open(devServerUrl, '_blank');
    }
  };

  useTerminalVerificationEffects({
    nativeProjectPath: store.nativeProjectPath,
    workspaceDevCommand: workspacePackageManager.devCommand,
    devServerUrl,
    lastOpenedPreviewRef,
    verificationActivityByCommandRef,
    setFiles: store.setFiles,
    setWorkspaceFolders,
    updateAiActivity,
    upsertVerificationStep,
    onPreviewDetected: () => {
      setPreviewRefreshKey((prev) => prev + 1);
      openPreviewTab();
    },
    onVerificationResolved: ({ activityId, succeeded, command }) => {
      const queue = verificationQueueByActivityRef.current[activityId] || [];
      if (!succeeded) {
        void (async () => {
          const recovered = await runVerificationRecoveryLoop({
            activityId,
            failedCommand: command
          }).catch((error) => {
            console.warn('[AURA] Verification recovery failed:', error);
            return false;
          });

          if (recovered) {
            return;
          }

          verificationQueueByActivityRef.current[activityId] = [];
          updateAiActivity(activityId, {
            status: 'error',
            summary: `Verifikasi berhenti di \`${command}\`. Cek terminal untuk detail error sebelum melanjutkan.`
          });
        })();
        return;
      }

      verificationRecoveryAttemptsRef.current[activityId] = 0;
      runtimeRecoverySignatureRef.current[activityId] = '';

      if (
        queue.length === 0 &&
        devServerUrl &&
        command.trim().toLowerCase() === workspacePackageManager.devCommand.toLowerCase()
      ) {
        void runPreviewReviewLoop(activityId);
        return;
      }

      if (queue.length === 0) {
        return;
      }

      const [nextCommand, ...rest] = queue;
      verificationQueueByActivityRef.current[activityId] = rest;
      runVerificationCommandForActivity(
        activityId,
        nextCommand,
        `Langkah verifikasi berikutnya berjalan otomatis setelah \`${command}\` selesai.`
      );
    }
  });

  const handleCloseFolder = async () => {
    setWorkspaceError(null);
    setDevServerUrl(null);

    try {
      store.setFiles([]);
        store.setActiveFileId('');
        setOpenFileTabs([]);
        setAiActivityEntries([]);
        setActiveWorkspaceTab('');
      store.setNativeProjectPath(null);
      store.setProjectName('AURA-WORKSPACE');
      setWorkspaceFolders([]);
      setExpandedFolders({});
      setDevServerUrl(null);
      store.setShowSidebar(false);
      store.setShowAiPanel(false);
      store.setShowBottomPanel(false);
      store.setChatMessages([]);
      store.setAttachedFiles([]);

      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (error: any) {
      console.error('[AURA] Failed to close workspace:', error);
      setWorkspaceError(error?.message || 'Failed to close workspace and relaunch app.');
    }
  };

  const handleBrowseCloneDestination = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
        title: 'Select Clone Destination'
      });

      if (selected && typeof selected === 'string') {
        setCloneDestination(normalizePath(selected));
      }
    } catch (error) {
      console.error('[AURA] Failed to browse clone destination:', error);
    }
  };

  const handleGitClone = async () => {
    const repoUrl = cloneRepoUrl.trim();
    const destination = cloneDestination.trim();
    if (!repoUrl || !destination) return;

    setIsCloningRepo(true);
    setWorkspaceError(null);
    setDevServerUrl(null);

    try {
      const { Command } = await import('@tauri-apps/plugin-shell');
      const repoName =
        repoUrl
          .split('/')
          .filter(Boolean)
          .pop()
          ?.replace(/\.git$/i, '') || 'cloned-repo';
      const targetPath = normalizePath(`${destination}/${repoName}`);

      const cloneCommand = Command.create('git', ['clone', repoUrl, targetPath], {
        cwd: destination
      });

      const outputLines: string[] = [];
      cloneCommand.stdout.on('data', (data) => {
        const chunk = `${data}`.trim();
        if (chunk) outputLines.push(chunk);
      });
      cloneCommand.stderr.on('data', (data) => {
        const chunk = `${data}`.trim();
        if (chunk) outputLines.push(chunk);
      });

      const result = await cloneCommand.execute();
      if (result.code !== 0) {
        throw new Error(outputLines.join('\n') || 'git clone failed.');
      }

      const [loadedFiles, loadedFolders] = await Promise.all([
        readWorkspaceFiles(targetPath),
        readWorkspaceFolders(targetPath)
      ]);

      setWorkspaceFolders(loadedFolders);
      store.setNativeProjectPath(targetPath);
      store.setProjectName(getWorkspaceDisplayName(targetPath, repoName));
      store.setFiles(loadedFiles);
        if (loadedFiles[0]?.id) {
          openCenterFile(loadedFiles[0].id);
        } else {
          store.setActiveFileId('');
          setActiveWorkspaceTab('');
        }
      store.setShowSidebar(true);
      store.setShowAiPanel(true);
      store.setShowBottomPanel(true);
      store.setTerminalSessions((prev) => prev.map(
        buildWorkspaceSessionUpdate(
          targetPath,
          store.activeTerminalId,
          buildCloneTerminalOutput(repoUrl, targetPath, outputLines)
        )
      ));

      setCloneRepoUrl('');
      setCloneDestination('');
      setActiveMenu(null);
    } catch (error: any) {
      console.error('[AURA] Failed to clone repository:', error);
      setWorkspaceError(error?.message || 'Failed to clone repository.');
    } finally {
      setIsCloningRepo(false);
    }
  };

  const runGitCommandInWorkspace = async (
    args: string[],
    cwd: string,
    env?: Record<string, string>
  ) => {
    const { Command } = await import('@tauri-apps/plugin-shell');
    const outputLines: string[] = [];
    const command = Command.create('git', args, {
      cwd,
      env: {
        GIT_TERMINAL_PROMPT: '0',
        ...env
      }
    });

    command.stdout.on('data', (data) => {
      const chunk = `${data}`.trim();
      if (chunk) outputLines.push(chunk);
    });

    command.stderr.on('data', (data) => {
      const chunk = `${data}`.trim();
      if (chunk) outputLines.push(chunk);
    });

    const result = await command.execute();
    const resultStdout = `${result.stdout || ''}`.trim();
    const resultStderr = `${result.stderr || ''}`.trim();
    if (resultStdout) outputLines.push(resultStdout);
    if (resultStderr) outputLines.push(resultStderr);
    return {
      code: result.code,
      output: Array.from(new Set(outputLines)).join('\n').trim()
    };
  };

  const buildGitPushArgs = (branchName: string, repoUrl: string) => {
    const githubToken = localStorage.getItem('aura_github_token') || '';
    const normalizedRepoUrl = repoUrl.trim().toLowerCase();
    if (githubToken && normalizedRepoUrl.startsWith('https://github.com/')) {
      const auth = btoa(`x-access-token:${githubToken}`);
      return ['-c', `http.extraHeader=AUTHORIZATION: Basic ${auth}`, 'push', '-u', 'origin', branchName];
    }
    return ['push', '-u', 'origin', branchName];
  };

  const inspectWorkspaceGitConnection = async (workspacePath: string) => {
    const { exists } = await import('@tauri-apps/plugin-fs');
    const normalizedWorkspace = normalizePath(workspacePath);
    const hasLocalGit = await exists(`${normalizedWorkspace}/.git`);
    let originUrl = '';

    if (hasLocalGit) {
      try {
        const remoteResult = await runGitCommandInWorkspace(['config', '--get', 'remote.origin.url'], normalizedWorkspace);
        if (remoteResult.code === 0) {
          originUrl = remoteResult.output.trim();
        }
      } catch {
        originUrl = '';
      }
    }

    return {
      hasLocalGit,
      originUrl
    };
  };

  const listWorkspaceGitRemotes = async (workspacePath: string) => {
    const remoteListResult = await runGitCommandInWorkspace(['remote'], workspacePath);
    if (remoteListResult.code !== 0) return [];
    return remoteListResult.output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  };

  const handleOpenConnectRepoModal = async () => {
    if (!store.nativeProjectPath) {
      setWorkspaceError('Buka workspace proyek dulu sebelum menghubungkan repository GitHub.');
      return;
    }

    try {
      const gitInfo = await inspectWorkspaceGitConnection(store.nativeProjectPath);
      setDetectedOriginUrl(gitInfo.originUrl);
      setConnectRepoUrl(gitInfo.originUrl || '');
      setConnectRepoBranch('main');
      setConnectRepoToken(localStorage.getItem('aura_github_token') || '');
      setGithubTokenStatus({ tone: 'idle', message: '' });
      setShowConnectRepoModal(true);
      setActiveMenu(null);
    } catch (error: any) {
      setWorkspaceError(error?.message || 'Gagal membaca status Git workspace.');
    }
  };

  const handleSaveGithubToken = () => {
    const token = connectRepoToken.trim();
    if (!token) {
      setGithubTokenStatus({ tone: 'error', message: 'Token masih kosong, belum ada yang disimpan.' });
      return;
    }
    localStorage.setItem('aura_github_token', token);
    setConnectRepoToken(token);
    setGithubTokenStatus({ tone: 'success', message: 'GitHub token berhasil disimpan lokal di AURA.' });
  };

  const handleClearGithubToken = () => {
    localStorage.removeItem('aura_github_token');
    setConnectRepoToken('');
    setGithubTokenStatus({ tone: 'idle', message: 'GitHub token dihapus dari penyimpanan lokal AURA.' });
  };

  const handleTestGithubToken = async () => {
    const token = connectRepoToken.trim();
    if (!token) {
      setGithubTokenStatus({ tone: 'error', message: 'Isi GitHub token dulu sebelum menjalankan test.' });
      return;
    }

    setIsTestingGithubToken(true);
    setGithubTokenStatus({ tone: 'idle', message: 'Sedang menguji token GitHub...' });

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      const payload = await response.json() as { login?: string };
      localStorage.setItem('aura_github_token', token);
      setConnectRepoToken(token);
      setGithubTokenStatus({
        tone: 'success',
        message: `GitHub token valid${payload?.login ? ` untuk akun ${payload.login}` : ''}.`
      });
    } catch (error: any) {
      setGithubTokenStatus({
        tone: 'error',
        message: `GitHub token gagal dipakai: ${error?.message || 'unknown error'}.`
      });
    } finally {
      setIsTestingGithubToken(false);
    }
  };

  const publishWorkspaceToGithub = async ({
    repoUrl,
    branchName,
    token,
    closeModalOnSuccess = true,
    source = 'modal'
  }: {
    repoUrl: string;
    branchName: string;
    token?: string;
    closeModalOnSuccess?: boolean;
    source?: 'modal' | 'chat';
  }) => {
    const workspacePath = store.nativeProjectPath ? normalizePath(store.nativeProjectPath) : '';
    const normalizedRepoUrl = repoUrl.trim();
    const normalizedBranchName = branchName.trim() || 'main';

    if (!workspacePath) {
      setWorkspaceError('Workspace aktif belum tersedia.');
      return false;
    }

    if (!normalizedRepoUrl) {
      setWorkspaceError('URL repository GitHub wajib diisi.');
      return false;
    }

    const effectiveToken = (token || connectRepoToken).trim();
    if (effectiveToken) {
      localStorage.setItem('aura_github_token', effectiveToken);
    }

    setIsConnectingRepo(true);
    setWorkspaceError(null);

    try {
      const gitInfo = await inspectWorkspaceGitConnection(workspacePath);
      terminal.appendTerminalOutput(`[AURA] Menyiapkan koneksi Git untuk workspace: ${workspacePath}`);
      if (source === 'chat') {
        terminal.appendTerminalOutput(`[AURA] Perintah chat terdeteksi: publish workspace ke ${normalizedRepoUrl}`);
      }

      if (!gitInfo.hasLocalGit) {
        terminal.appendTerminalOutput('[AURA] Repo Git lokal belum ada. Menjalankan `git init`...');
        const initResult = await runGitCommandInWorkspace(['init'], workspacePath);
        if (initResult.code !== 0) {
          throw new Error(initResult.output || 'git init failed.');
        }
      }

      const branchResult = await runGitCommandInWorkspace(['branch', '-M', normalizedBranchName], workspacePath);
      if (branchResult.code === 0) {
        terminal.appendTerminalOutput(`[AURA] Branch default diarahkan ke ${normalizedBranchName}.`);
      } else if (branchResult.output) {
        terminal.appendTerminalOutput(`[AURA][git] ${branchResult.output}`);
      }

      const refreshedGitInfo = await inspectWorkspaceGitConnection(workspacePath);
      if (refreshedGitInfo.originUrl) {
        if (normalizePath(refreshedGitInfo.originUrl) !== normalizePath(normalizedRepoUrl)) {
          terminal.appendTerminalOutput(`[AURA] Remote origin lama terdeteksi: ${refreshedGitInfo.originUrl}`);
          const setUrlResult = await runGitCommandInWorkspace(['remote', 'set-url', 'origin', normalizedRepoUrl], workspacePath);
          if (setUrlResult.code !== 0) {
            if (setUrlResult.output) {
              terminal.appendTerminalOutput(`[AURA][git] ${setUrlResult.output}`);
            }
            throw new Error(setUrlResult.output || 'git remote set-url origin failed.');
          }
          terminal.appendTerminalOutput(`[AURA] Remote origin diperbarui ke ${normalizedRepoUrl}`);
        } else {
          terminal.appendTerminalOutput(`[AURA] Remote origin sudah mengarah ke ${normalizedRepoUrl}`);
        }
      } else {
        const addRemoteResult = await runGitCommandInWorkspace(['remote', 'add', 'origin', normalizedRepoUrl], workspacePath);
        if (addRemoteResult.code !== 0) {
          if (addRemoteResult.output) {
            terminal.appendTerminalOutput(`[AURA][git] ${addRemoteResult.output}`);
          }
          const remoteNames = await listWorkspaceGitRemotes(workspacePath);
          if (remoteNames.includes('origin')) {
            terminal.appendTerminalOutput('[AURA] Remote origin ternyata sudah ada. Mencoba memperbarui URL origin...');
            const setUrlResult = await runGitCommandInWorkspace(['remote', 'set-url', 'origin', normalizedRepoUrl], workspacePath);
            if (setUrlResult.code !== 0) {
              if (setUrlResult.output) {
                terminal.appendTerminalOutput(`[AURA][git] ${setUrlResult.output}`);
              }
              throw new Error(setUrlResult.output || addRemoteResult.output || 'git remote set-url origin failed.');
            }
            terminal.appendTerminalOutput(`[AURA] Remote origin diperbarui ke ${normalizedRepoUrl}`);
          } else {
            throw new Error(addRemoteResult.output || 'git remote add origin failed.');
          }
        } else {
          terminal.appendTerminalOutput(`[AURA] Remote origin berhasil ditambahkan: ${normalizedRepoUrl}`);
        }
      }

      terminal.appendTerminalOutput('[AURA] Menambahkan semua perubahan workspace ke staging...');
      const addAllResult = await runGitCommandInWorkspace(['add', '-A'], workspacePath);
      if (addAllResult.code !== 0) {
        throw new Error(addAllResult.output || 'git add -A failed.');
      }

      const stagedStatusResult = await runGitCommandInWorkspace(['status', '--porcelain'], workspacePath);
      if (stagedStatusResult.code !== 0) {
        throw new Error(stagedStatusResult.output || 'git status --porcelain failed.');
      }

      const hasChangesToCommit = Boolean(stagedStatusResult.output.trim());
      if (hasChangesToCommit) {
        terminal.appendTerminalOutput('[AURA] Membuat commit otomatis untuk sinkronisasi workspace...');
        const commitResult = await runGitCommandInWorkspace(
          [
            '-c',
            'user.name=AURA IDE',
            '-c',
            'user.email=aura@local',
            'commit',
            '-m',
            'chore: publish workspace from AURA IDE'
          ],
          workspacePath
        );
        if (commitResult.code !== 0) {
          throw new Error(commitResult.output || 'git commit failed.');
        }
      } else {
        terminal.appendTerminalOutput('[AURA] Tidak ada perubahan baru untuk di-commit. Melanjutkan ke proses push.');
      }

      terminal.appendTerminalOutput(`[AURA] Mendorong branch ${normalizedBranchName} ke GitHub...`);
      const pushArgs = buildGitPushArgs(normalizedBranchName, normalizedRepoUrl);
      const pushResult = await runGitCommandInWorkspace(pushArgs, workspacePath);
      if (pushResult.code !== 0) {
        throw new Error(
          pushResult.output ||
          'git push failed. Pastikan token GitHub di Settings sudah benar atau remote repo menerima kredensial Git kamu.'
        );
      }

      setDetectedOriginUrl(normalizedRepoUrl);
      if (closeModalOnSuccess) {
        setShowConnectRepoModal(false);
      }
      terminal.appendTerminalOutput('[AURA] Workspace berhasil dipublish ke GitHub. Repo lokal, remote origin, commit, dan push sudah selesai otomatis.');
      if (source === 'chat') {
        store.setChatMessages((prev) => [...prev, { role: 'assistant', content: `[AURA] Project berhasil dipublish ke ${normalizedRepoUrl}` }]);
      }
      return true;
    } catch (error: any) {
      const message = error?.message || 'Gagal menghubungkan workspace ke repository GitHub.';
      setWorkspaceError(message);
      terminal.appendTerminalOutput(`[AURA ERROR] ${message}`);
      if (source === 'chat') {
        store.setChatMessages((prev) => [...prev, { role: 'assistant', content: `[AURA GITHUB ERROR] ${message}` }]);
      }
      return false;
    } finally {
      setIsConnectingRepo(false);
    }
  };

  const handleConnectRepository = async () => {
    await publishWorkspaceToGithub({
      repoUrl: connectRepoUrl,
      branchName: connectRepoBranch,
      token: connectRepoToken,
      closeModalOnSuccess: true,
      source: 'modal'
    });
  };

  const handleImportSumopodModels = async (file: File) => {
    try {
      const raw = await file.text();
      const models = parseSumopodCatalogText(raw);
      if (models.length === 0) {
        throw new Error('Tidak ada model SumoPod valid yang bisa dibaca dari file ini. Gunakan JSON, CSV, TSV, atau teks tabel model.');
      }

      store.setDynamicSumopodModels(models);
      if (store.aiProvider === 'sumopod' && !models.some((model) => model.id === aiManager.activeModel)) {
        store.setSumopodModel(models[0].id);
      }

      setWorkspaceError(`[AURA] Katalog SumoPod custom berhasil diimport: ${models.length} model dari ${file.name}.`);
    } catch (error: any) {
      setWorkspaceError(`[AURA] Gagal import katalog SumoPod: ${error?.message || error}`);
    }
  };

  const handleClearSumopodModels = () => {
    store.setDynamicSumopodModels([]);
    if (store.aiProvider === 'sumopod') {
      store.setSumopodModel(SUMOPOD_MODEL_FALLBACKS[0]?.id || 'seed-2-0-pro');
    }
    setWorkspaceError('[AURA] Katalog SumoPod custom dihapus. AURA kembali memakai katalog bawaan.');
  };

  const handleAiProviderChange = (provider: AiProvider) => {
    store.setAiProvider(provider);
    if (provider === 'openrouter' && !store.openRouterModel) store.setOpenRouterModel('auto-free');
    if (provider === 'bytez' && !store.bytezModel) store.setBytezModel(BYTEZ_MODEL_FALLBACK[0]?.id || 'default');
    if (provider === 'sumopod' && !store.sumopodModel) store.setSumopodModel(SUMOPOD_MODEL_FALLBACKS[0]?.id || 'seed-2-0-pro');
    if (provider === 'puter' && !store.puterModel) store.setPuterModel('openrouter:anthropic/claude-sonnet-4.5');
    store.setShowAiPanel(true);

    const activePreset = DEVELOPER_TASK_PRESETS.find((preset) => preset.id === store.aiTaskPreset);
    const recommendedModel = activePreset?.providerModels?.[provider];
    if (recommendedModel) {
      switch (provider) {
        case 'openrouter':
          store.setOpenRouterModel(recommendedModel);
          break;
        case 'bytez':
          store.setBytezModel(recommendedModel);
          break;
        case 'sumopod':
          store.setSumopodModel(recommendedModel);
          break;
        case 'puter':
          store.setPuterModel(recommendedModel);
          break;
        case 'ollama':
        case 'gemini':
          store.setSelectedModel(recommendedModel);
          break;
      }
    }
  };

  const handleVisualReviewProviderChange = (provider: VisualReviewProvider) => {
    store.setVisualReviewProvider(provider);
    setWorkspaceError(
      provider === 'same'
        ? 'Visual review mengikuti provider coding aktif.'
        : `Visual review dipisah ke provider ${provider}.`
    );
  };

  const handleAiCredentialChange = (value: string) => {
    switch (store.aiProvider) {
      case 'openrouter':
        store.setOpenRouterApiKey(value);
        break;
      case 'bytez':
        store.setBytezApiKey(value);
        break;
      case 'sumopod':
        store.setSumopodApiKey(value);
        break;
      case 'puter':
        store.setPuterApiKey(value);
        break;
      case 'ollama':
        store.setOllamaUrl(value);
        break;
      default:
        store.setGeminiApiKey(value);
        break;
    }
  };

  const handleAiModelChange = (value: string) => {
    switch (store.aiProvider) {
      case 'openrouter':
        store.setOpenRouterModel(value);
        break;
      case 'bytez':
        store.setBytezModel(value);
        break;
      case 'sumopod':
        store.setSumopodModel(value);
        break;
      case 'puter':
        store.setPuterModel(value);
        break;
      default:
        store.setSelectedModel(value);
        break;
    }
  };

  const handleApplyDeveloperTaskPreset = (presetId: string) => {
    const preset = DEVELOPER_TASK_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    store.setAiTaskPreset(preset.id);
    store.setSelectedSkill(preset.skillId);
    store.setActiveAgentId(preset.agentId);
    store.setSystemInstruction(preset.systemInstruction);
    store.setAiRules(preset.aiRules);

    const recommendedModel = (preset.providerModels as Record<string, string | undefined>)[store.aiProvider];
    if (recommendedModel) {
      handleAiModelChange(recommendedModel);
    }

    setWorkspaceError(`Developer preset aktif: ${preset.label} • skill ${preset.skillId}`);
  };

  const handleResetCurrentProvider = () => {
    switch (store.aiProvider) {
      case 'openrouter':
        store.setOpenRouterApiKey('');
        store.setOpenRouterModel('auto-free');
        break;
      case 'bytez':
        store.setBytezApiKey('');
        store.setBytezModel(BYTEZ_MODEL_FALLBACK[0]?.id || 'default');
        break;
      case 'sumopod':
        store.setSumopodApiKey('');
        store.setSumopodModel(SUMOPOD_MODEL_FALLBACKS[0]?.id || 'seed-2-0-pro');
        store.setDynamicSumopodModels([]);
        store.setSumopodSessionCookie('');
        store.setSumopodSessionAuthorization('');
        break;
      case 'puter':
        store.setPuterModel(PUTER_MODEL_FALLBACKS[0]?.id || 'openrouter:anthropic/claude-sonnet-4.5');
        break;
      case 'ollama':
        store.setOllamaUrl('http://localhost:11434');
        store.setSelectedModel('llama3');
        break;
      default:
        store.setGeminiApiKey('');
        store.setSelectedModel(GEMINI_MODELS[0]?.id || 'gemini-2.0-flash-exp');
        break;
    }

    store.setTestingStatus((prev: any) => ({ ...prev, [store.aiProvider]: 'idle' }));
    store.setTestError((prev: any) => ({ ...prev, [store.aiProvider]: '' }));
    store.setTestMeta((prev: any) => ({ ...prev, [store.aiProvider]: {} }));
    setWorkspaceError(`${AI_PROVIDERS.find((provider) => provider.id === store.aiProvider)?.name || store.aiProvider} settings reset.`);
  };

  const removeChatAttachment = (index: number) => {
    store.setAttachedFiles((prev) => prev.filter((_: AttachedFile, currentIndex: number) => currentIndex !== index));
  };

  const readFilesAsAttachments = async (selectedFiles: File[]) => Promise.all(selectedFiles.map((file) => new Promise<AttachedFile>((resolve, reject) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      const shouldReadAsText = !isImage && (file.type.startsWith('text/') || isTextAttachmentName(file.name));

      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.onload = (loadEvent) => {
        const result = `${loadEvent.target?.result || ''}`;
        resolve({
          name: file.name,
          type: file.type || (isImage ? 'image/*' : 'text/plain'),
          data: result,
          content: shouldReadAsText ? result : undefined
        });
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else if (shouldReadAsText) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }))).catch((error: any) => {
      setWorkspaceError(error?.message || 'Failed to read selected attachment.');
      return [] as AttachedFile[];
    });
  
  const appendChatAttachments = async (selectedFiles: File[]) => {
    if (!selectedFiles.length) return;
    const nextAttachments = await readFilesAsAttachments(selectedFiles);

    if (nextAttachments.length > 0) {
      store.setAttachedFiles((prev) => [...prev, ...nextAttachments]);
    }
  };

  const handleChatFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    await appendChatAttachments(Array.from(files));

    event.target.value = '';
  };

  const handleChatPaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardFiles = Array.from(event.clipboardData?.files || []).filter((file) => file.size > 0);
    if (!clipboardFiles.length) return;

    event.preventDefault();
    await appendChatAttachments(clipboardFiles.map((file, index) => {
      if (file.name) return file;
      const extension = file.type.split('/')[1] || 'bin';
      return new File([file], `pasted-image-${Date.now()}-${index + 1}.${extension}`, { type: file.type || 'application/octet-stream' });
    }));
  };

  const handleOpenChatAttachmentPicker = async () => {
    if (chatFileInputRef.current) {
      chatFileInputRef.current.click();
      return;
    }

    try {
      const selected = await openDialog({
        directory: false,
        multiple: true,
        title: 'Attach Files or Images'
      });

      if (!selected) return;
      setWorkspaceError('Fallback attach via native dialog belum lengkap. Hidden file input sekarang dipakai sebagai jalur utama.');
    } catch (error: any) {
      setWorkspaceError(error?.message || 'Failed to open attachment picker.');
    }
  };

  const applyAiResponseToWorkspace = async (
    draftBundle: PreparedAiDraftBundle,
    activityId?: string | null,
    domains: string[] = [],
    preferredTargets: string[] = [],
    originalPrompt: string = '',
    revisionMode = false
  ) => {
    const { generatedFiles, nextDrafts, suggestedCommands, readySteps } = draftBundle;
    if (generatedFiles.length === 0) return;

    try {
      store.setShowSidebar(true);

      const generatedFolders = generatedFiles.flatMap((item) => collectParentFolderPaths(item.absolutePath, store.nativeProjectPath));
      setExpandedFolders((prev) => {
        const next = { ...prev };
        generatedFolders.forEach((folder) => {
          next[folder] = true;
        });
        return next;
      });

      terminal.appendTerminalOutput(
        `[AURA] AI menyiapkan ${generatedFiles.length} file: ${generatedFiles.map((item) => item.relativePath).join(', ')}`
      );
      const highRiskRevisionDrafts = revisionMode
        ? detectHighRiskRevisionDrafts(generatedFiles, preferredTargets, activeFile, store.nativeProjectPath)
        : [];
      const shouldBlockAutoApplyForRevision =
        revisionMode && (generatedFiles.length > 6 || highRiskRevisionDrafts.length > 0);

      if (shouldBlockAutoApplyForRevision) {
        terminal.appendTerminalOutput(
          `[AURA] Revision safety aktif. Auto-apply ditahan karena perubahan menyentuh area sensitif atau terlalu luas: ${highRiskRevisionDrafts.map((item) => item.relativePath).join(', ') || `${generatedFiles.length} files`}`
        );
      }

      if (store.aiAutoApplyDrafts && !shouldBlockAutoApplyForRevision) {
        terminal.appendTerminalOutput('[AURA] Auto-apply draft aktif. Menulis perubahan AI langsung ke workspace...');
        store.setStagingFiles((prev) =>
          prev.filter((item) => !nextDrafts.some((draft) => normalizePath(draft.path) === normalizePath(item.path)))
        );

        for (const draft of nextDrafts) {
          if (activityId) {
            appendAiActivityStep(activityId, {
              label: `Writing • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
              detail: `Menulis perubahan ke ${draft.path}.`,
              status: 'working'
            });
          }

          await applyResolvedDraft(draft);
          upsertWorkspaceFile(draft.path, draft.newContent);
          openCenterFile(draft.path);

          if (activityId) {
            appendAiActivityStep(activityId, {
              label: `Writing • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
              detail: `Perubahan berhasil ditulis ke ${draft.path}.`,
              status: 'done'
            });
          }
        }

        const loadedFiles = await refreshWorkspaceFromDisk();
        generatedFiles.forEach((generatedFile) => {
          if (loadedFiles.some((file) => normalizePath(file.id) === normalizePath(generatedFile.absolutePath))) {
            openCenterFile(generatedFile.absolutePath);
          }
        });

        if (activityId) {
          updateAiActivity(activityId, createDraftReadyActivityUpdate(draftBundle, domains));

          const reviewResult = await runUiReviewLoop({
            activityId,
            userPrompt: originalPrompt,
            domains,
            preferredTargets,
            taskPresetId: activityContextByIdRef.current[activityId]?.taskPresetId || store.aiTaskPreset,
            generatedFiles
          });
          const finalSuggestedCommands = reviewResult.suggestedCommands.length > 0
            ? reviewResult.suggestedCommands
            : suggestedCommands;
          const autoVerificationCommands = buildAutoVerificationCommands(finalSuggestedCommands);

          updateAiActivity(activityId, {
            status: 'done',
            summary: autoVerificationCommands.length > 0
              ? `AI membuat, menulis, meninjau UI, dan mulai memverifikasi ${generatedFiles.length + reviewResult.refinedCount} file di workspace.`
              : `AI membuat, menulis, dan meninjau ${generatedFiles.length + reviewResult.refinedCount} file ke workspace.`
          });

          if (autoVerificationCommands.length > 0) {
            appendAiActivityStep(activityId, {
              label: 'Verification Queue',
              detail: `Menyiapkan verifikasi otomatis: ${autoVerificationCommands.join(' -> ')}.`,
              status: 'planning'
            });
            runAutoVerificationQueue(activityId, autoVerificationCommands);
          }
        } else {
          pushAiActivityEntry({
            ...createStandaloneDraftEntry(draftBundle, domains),
            title: 'AI files written to workspace',
            summary: `AI langsung menulis ${generatedFiles.length} file ke workspace.`,
            status: 'done'
          });
        }

        setWorkspaceError(`AI langsung menulis ${generatedFiles.length} file ke workspace.`);
        return;
      }

      generatedFiles.forEach((generatedFile) => {
        upsertWorkspaceFile(generatedFile.absolutePath, generatedFile.content);
      });
      store.setStagingFiles((prev) => mergePendingDrafts(prev, nextDrafts));
      generatedFiles.forEach((generatedFile) => {
        openCenterFile(generatedFile.absolutePath);
      });
      setWorkspaceFolders((prev) => Array.from(new Set([...prev, ...generatedFolders])));
      if (activityId) {
        updateAiActivity(activityId, createDraftReadyActivityUpdate(draftBundle, domains));
      } else {
        pushAiActivityEntry(createStandaloneDraftEntry(draftBundle, domains));
      }
      if (store.aiAutoApplyDrafts && !shouldBlockAutoApplyForRevision) {
        terminal.appendTerminalOutput('[AURA] Auto-apply draft aktif. Menulis perubahan AI langsung ke workspace...');
        for (const draft of nextDrafts) {
          appendAiActivityStep(activityId || '', {
            label: `Writing • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
            detail: `Menulis perubahan ke ${draft.path}.`,
            status: 'working'
          });
          await applyResolvedDraft(draft);
          appendAiActivityStep(activityId || '', {
            label: `Writing • ${getRelativeFilePath(draft.path, store.nativeProjectPath || '')}`,
            detail: `Perubahan berhasil ditulis ke ${draft.path}.`,
            status: 'done'
          });
        }
        if (activityId) {
          const reviewResult = await runUiReviewLoop({
            activityId,
            userPrompt: originalPrompt,
            domains,
            preferredTargets,
            taskPresetId: activityContextByIdRef.current[activityId]?.taskPresetId || store.aiTaskPreset,
            generatedFiles
          });
          const finalSuggestedCommands = reviewResult.suggestedCommands.length > 0 ? reviewResult.suggestedCommands : suggestedCommands;
          const autoVerificationCommands = buildAutoVerificationCommands(finalSuggestedCommands);
          updateAiActivity(activityId, {
            status: 'done',
            summary: autoVerificationCommands.length > 0
              ? `AI membuat, menulis, meninjau UI, dan mulai memverifikasi ${generatedFiles.length + reviewResult.refinedCount} file di workspace.`
              : `AI membuat, menulis, dan meninjau ${generatedFiles.length + reviewResult.refinedCount} file ke workspace.`
          });
          if (autoVerificationCommands.length > 0) {
            appendAiActivityStep(activityId, {
              label: 'Verification Queue',
              detail: `Menyiapkan verifikasi otomatis: ${autoVerificationCommands.join(' -> ')}.`,
              status: 'planning'
            });
            runAutoVerificationQueue(activityId, autoVerificationCommands);
          }
        }
        setWorkspaceError(`AI langsung menerapkan ${generatedFiles.length} file ke workspace.`);
      } else {
        setWorkspaceError(
          shouldBlockAutoApplyForRevision
            ? `AURA menahan auto-apply karena revisi menyentuh area sensitif atau terlalu luas. Review ${generatedFiles.length} draft file dulu sebelum Apply.`
            : `AI membuat ${generatedFiles.length} draft file. Review dulu lalu Apply ke workspace.`
        );
      }
    } catch (error: any) {
      terminal.appendTerminalOutput(`[AI DRAFT ERROR] ${error?.message || error}`);
      setWorkspaceError(`AI menghasilkan kode, tetapi gagal menyiapkan draft workspace: ${error?.message || error}`);
    }
  };

  const handleSendAiPrompt = async () => {
    const prompt = store.chatInput.trim();
    if (!prompt) return;
    const githubRepoUrlMatch = prompt.match(GITHUB_REPO_URL_PATTERN);
    const isGithubPublishIntent = Boolean(
      githubRepoUrlMatch?.[0] &&
      /\b(push|publish|upload|unggah|kirim|hubungkan|connect|repo|repository|github)\b/i.test(prompt)
    );
    if (isGithubPublishIntent && githubRepoUrlMatch?.[0]) {
      const repoUrl = githubRepoUrlMatch[0].replace(/\/$/, '');
      const token = localStorage.getItem('aura_github_token') || connectRepoToken.trim();
      store.setChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
      store.setChatInput('');
      store.setAttachedFiles([]);
      store.setShowAiPanel(true);
      store.setShowBottomPanel(true);

      if (!store.nativeProjectPath) {
        const message = 'Buka atau buat workspace dulu sebelum publish ke GitHub.';
        terminal.appendTerminalOutput(`[AURA GITHUB] ${message}`);
        store.setChatMessages((prev) => [...prev, { role: 'assistant', content: `[AURA] ${message}` }]);
        setWorkspaceError(message);
        return;
      }

      if (!token) {
        setConnectRepoUrl(repoUrl);
        setConnectRepoBranch('main');
        setConnectRepoToken('');
        setGithubTokenStatus({
          tone: 'error',
          message: 'Token GitHub belum tersimpan. Isi token, test, lalu klik Init, Connect & Push.'
        });
        setShowConnectRepoModal(true);
        const message = 'Saya menemukan URL GitHub di prompt, tetapi token GitHub belum tersimpan. Modal Connect GitHub sudah dibuka dan URL repo sudah diisi.';
        terminal.appendTerminalOutput(`[AURA GITHUB] ${message}`);
        store.setChatMessages((prev) => [...prev, { role: 'assistant', content: `[AURA] ${message}` }]);
        return;
      }

      setConnectRepoUrl(repoUrl);
      setConnectRepoBranch(connectRepoBranch.trim() || 'main');
      setConnectRepoToken(token);
      terminal.appendTerminalOutput(`[AURA GITHUB] Menjalankan publish otomatis dari prompt chat ke ${repoUrl}`);
      await publishWorkspaceToGithub({
        repoUrl,
        branchName: connectRepoBranch.trim() || 'main',
        token,
        closeModalOnSuccess: false,
        source: 'chat'
      });
      return;
    }
    const runId = aiRunIdRef.current + 1;
    aiRunIdRef.current = runId;
    activeAiActivityIdRef.current = null;
    logDiagnostic('info', 'ai', 'Prompt send requested', prompt.slice(0, 160));
    const attachments = [...store.attachedFiles] as AttachedFile[];
    const prioritizeFastFix = isErrorFixPrompt(prompt, attachments);
    const workDomains = detectWorkDomains(prompt, activeFile, store.files);
    const uiFirstPrompt = isUiFirstPrompt(prompt);
    const mobileFirstPrompt = /(mobile|android|ios|apk|capacitor|native app|aplikasi mobile)/i.test(prompt);
    const revisionMode = isIterativeRevisionPrompt(prompt, {
      hasActiveFile: Boolean(activeFile),
      workspaceFileCount: store.files.length
    });
    const effectiveTaskPresetId = prioritizeFastFix && store.aiTaskPreset === 'fullstack'
      ? 'bug-fix'
      : mobileFirstPrompt && store.aiTaskPreset === 'fullstack'
      ? 'mobile-app'
      : uiFirstPrompt && store.aiTaskPreset === 'fullstack'
        ? 'frontend-ui'
        : store.aiTaskPreset;
    const effectiveTaskPreset = DEVELOPER_TASK_PRESETS.find((preset) => preset.id === effectiveTaskPresetId) || activeTaskPreset;
    const effectiveSkillName = effectiveTaskPreset.skillId || store.selectedSkill;
    const inferredPreferredTargets = inferPreferredWorkspaceTargets(workDomains, store.files, store.nativeProjectPath, activeFile);
    const preferredTargets = revisionMode
      ? tightenPreferredTargetsForRevision(inferredPreferredTargets, activeFile, store.nativeProjectPath)
      : inferredPreferredTargets;
    const executionPlan = inferExecutionPlan(workDomains, preferredTargets, prompt);
    const projectRulesContext = buildProjectRulesContext({
      files: store.files,
      rootPath: store.nativeProjectPath,
      activeFilePath: activeFile?.path || activeFile?.id || null,
      prompt,
      domains: workDomains
    });
    const isLikelyCodingRequest = isLikelyCodingPrompt(prompt);
    let activityId: string | null = null;

    const historyBeforePrompt = trimChatHistoryForAi([...store.chatMessages], prioritizeFastFix);
    store.setChatMessages((prev) => [...prev, { role: 'user', content: buildUserPromptMessage(prompt, attachments) }]);
    store.setChatInput('');
    store.setAttachedFiles([]);
    store.setShowAiPanel(true);

    try {
      store.setIsAiLoading(true);
      if (isLikelyCodingRequest) {
        const planningActivity = createPlanningActivityPayload({
          domains: workDomains,
          executionPlan,
          preferredTargets
        });
        activityId = pushAiActivity(
          planningActivity.title,
          planningActivity.summary,
          planningActivity.status,
          planningActivity.files,
          planningActivity.domains,
          planningActivity.steps
        );
        activeAiActivityIdRef.current = activityId;
        activityContextByIdRef.current[activityId] = {
          userPrompt: prompt,
          domains: workDomains,
          preferredTargets,
          taskPresetId: effectiveTaskPresetId
        };
        previewReviewAttemptedRef.current[activityId] = false;
        verificationRecoveryAttemptsRef.current[activityId] = 0;
      }
      let responseText = '';
      const developerContext = buildDeveloperPromptPrefix(effectiveTaskPresetId, effectiveSkillName);
      const attachmentContext = buildAttachmentPromptContext(attachments, { compact: prioritizeFastFix });
      const promptWithPreset = buildAiPromptEnvelope({
        developerContext,
        projectRulesContext,
        domains: workDomains,
        preferredTargets,
        executionPlan,
        attachmentContext,
        prompt,
        prioritizeFastFix,
        revisionMode,
        activeFilePath: activeFile?.path || activeFile?.id || ''
      });

      if (activityId) {
        updateAiActivity(activityId, createGeneratingActivityUpdate({
          domains: workDomains,
          preferredTargets,
          executionPlan,
          provider: store.aiProvider,
          model: aiManager.activeModel
        }));
      }

      responseText = await generateAiProviderResponse({
        provider: store.aiProvider,
        promptWithPreset,
        attachments,
        historyBeforePrompt,
        temperature: store.aiTemperature,
        geminiApiKey: store.geminiApiKey,
        selectedModel: store.selectedModel,
        openRouterApiKey: store.openRouterApiKey,
        openRouterModel: store.openRouterModel,
        bytezApiKey: store.bytezApiKey,
        bytezModel: store.bytezModel,
        sumopodApiKey: store.sumopodApiKey,
        sumopodModel: store.sumopodModel,
        puterModel: store.puterModel
      });

      if (aiRunIdRef.current !== runId) {
        return;
      }

      const draftBundle = prepareAiDraftBundle({
        responseText,
        activeFile,
        nativeProjectPath: store.nativeProjectPath,
        preferredTargets,
        files: store.files,
        domains: workDomains
      });

      if (activityId && draftBundle.generatedFiles.length === 0) {
        updateAiActivity(activityId, createNoDraftActivityUpdate(workDomains));
      }

      if (aiRunIdRef.current !== runId) {
        return;
      }

      store.setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: draftBundle.assistantChatContent }
      ]);
      await applyAiResponseToWorkspace(draftBundle, activityId, workDomains, preferredTargets, prompt, revisionMode);
    } catch (error: any) {
      if (aiRunIdRef.current !== runId) {
        return;
      }
      const message = error?.message || 'Unknown AI error';
      logDiagnostic('error', 'ai', 'Prompt handling failed', error?.stack || message);
      terminal.appendTerminalOutput(`[AI ERROR] ${message}`);
      if (activityId) {
        updateAiActivity(activityId, createFailureActivityUpdate(message, workDomains));
      }
      store.setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[AURA AI ERROR] ${message}` }
      ]);
    } finally {
      if (aiRunIdRef.current === runId) {
        store.setIsAiLoading(false);
        activeAiActivityIdRef.current = null;
      }
    }
  };

  const handleCreateProject = async (path: string, projectName: string) => {
    setIsCreatingProject(true);
    setWorkspaceError(null);
    setDevServerUrl(null);
    logDiagnostic('info', 'workspace', 'Create project requested', `${projectName} @ ${path}`);

    try {
      const basePath = normalizePath(path);
      const normalizedProjectName = projectName.trim().replace(/[^\w-]+/g, '-');
      const projectRoot = normalizePath(`${basePath}/${normalizedProjectName}`);
      const { srcRoot, filesToWrite, initialFilePath } = buildStarterProjectFiles(projectRoot, projectName);

      await mkdir(srcRoot, { recursive: true });
      for (const file of filesToWrite) {
        await writeTextFile(file.path, file.content);
      }

      const [loadedFiles, loadedFolders] = await Promise.all([
        readWorkspaceFiles(projectRoot),
        readWorkspaceFolders(projectRoot)
      ]);
      setWorkspaceFolders(loadedFolders);
      store.setNativeProjectPath(projectRoot);
      store.setProjectName(getWorkspaceDisplayName(projectRoot, normalizedProjectName));
      store.setFiles(loadedFiles);
      if (initialFilePath) {
        const initialFile = loadedFiles.find((file) => normalizePath(file.id) === normalizePath(initialFilePath));
        if (initialFile?.id) {
          openCenterFile(initialFile.id);
        } else {
          store.setActiveFileId('');
          setActiveWorkspaceTab('');
        }
      } else {
        store.setActiveFileId('');
        setOpenFileTabs([]);
        setActiveWorkspaceTab('');
      }
      store.setShowSidebar(true);
      store.setShowAiPanel(true);
      store.setShowBottomPanel(true);
      store.setShowCreateProjectModal(false);
      store.setTerminalSessions((prev) => prev.map(
        buildWorkspaceSessionUpdate(
          projectRoot,
          store.activeTerminalId,
          buildCreateProjectTerminalOutput(projectRoot)
        )
      ));
      logDiagnostic('info', 'workspace', 'Project created', projectRoot);
    } catch (error: any) {
      console.error('[AURA] Failed to create project:', error);
      logDiagnostic('error', 'workspace', 'Failed to create project', error?.stack || error?.message || error);
      setWorkspaceError(error?.message || 'Failed to create clean starter project.');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  const renderExplorerNodes = (nodes: ExplorerNode[], depth = 0): React.ReactNode =>
    nodes.map((node) => {
      if (node.type === 'folder') {
        const isOpen = expandedFolders[node.id] ?? depth < 1;
        return (
          <div key={node.id}>
            <button
              onClick={() => toggleFolder(node.id)}
              className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] leading-4 text-[#bfc7d2] hover:bg-white/5"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <span className={`inline-block text-[10px] text-[#7f8aa3] transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                ▶
              </span>
              <span className="inline-flex shrink-0">{getFolderIcon(isOpen)}</span>
              <span className="truncate font-medium">{node.name}</span>
            </button>
            {isOpen && node.children ? renderExplorerNodes(node.children, depth + 1) : null}
          </div>
        );
      }

      const isActive = node.fileId === activeFile?.id;
      const hasPendingDraft = node.fileId ? stagingByPath.has(normalizePath(node.fileId)) : false;
      return (
        <button
          key={node.id}
          onClick={() => node.fileId && openCenterFile(node.fileId)}
          className={`flex w-full items-center gap-1.5 border-l px-2 py-1 text-left text-[11px] leading-4 transition-colors ${
            isActive
              ? 'border-blue-500 bg-blue-500/10 text-blue-300'
              : 'border-transparent text-[#c8c8c8] hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${24 + depth * 12}px` }}
          title={node.name}
        >
          <span className="inline-flex shrink-0">{getFileIcon(node.name)}</span>
          <span className="truncate">{node.name}</span>
          {hasPendingDraft && (
            <span className="ml-auto rounded-full border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-200">
              Draft
            </span>
          )}
        </button>
      );
    });

  const renderHeaderMenu = (menu: HeaderMenuKey, label: string, items: React.ReactNode) => (
    <div className="relative" onPointerDown={(event) => event.stopPropagation()}>
      <button
        onClick={() => setActiveMenu((prev) => (prev === menu ? null : menu))}
        className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
          activeMenu === menu ? 'bg-white/10 text-white' : 'text-[#c5c5c5] hover:bg-white/5 hover:text-white'
        }`}
      >
        {label}
      </button>
      {activeMenu === menu && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[220px] rounded-xl border border-white/10 bg-[#202020] p-1 shadow-2xl">
          {items}
        </div>
      )}
    </div>
  );

  const menuItemClassName = 'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[10px] text-[#d6d6d6] transition-colors hover:bg-white/8 hover:text-white';
  return (
    <div className="aura-workspace compact-ui h-screen w-screen overflow-hidden bg-[#1e1e1e] text-[#d4d4d4] flex flex-col">
      <header className="aura-shell-header shrink-0 border-b border-white/5 bg-[#171717]">
        <div className="flex items-center justify-between gap-3 px-3 py-1.5">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="truncate text-[12px] font-semibold text-white">{store.projectName || 'Workspace'}</div>
              <div className="hidden truncate text-[10px] text-[#6f7784] xl:block">
                {store.nativeProjectPath || 'No workspace opened'}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-white/6 bg-white/[0.02] p-0.5">
              <button
                onClick={() => store.setShowSidebar((prev) => !prev)}
                title="Toggle sidebar"
                className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                  store.showSidebar ? 'bg-white/8 text-white' : 'text-[#8b93a0] hover:text-white'
                }`}
              >
                <PanelLeft size={13} />
              </button>
              <button
                onClick={() => store.setShowBottomPanel((prev) => !prev)}
                title="Toggle terminal"
                className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                  store.showBottomPanel ? 'bg-white/8 text-white' : 'text-[#8b93a0] hover:text-white'
                }`}
              >
                <TerminalSquare size={13} />
              </button>
              <button
                onClick={() => store.setShowAiPanel((prev) => !prev)}
                title="Toggle AI"
                className={`rounded-md px-2 py-1 text-[10px] transition-colors ${
                  store.showAiPanel ? 'bg-white/8 text-white' : 'text-[#8b93a0] hover:text-white'
                }`}
              >
                <Sparkles size={13} />
              </button>
            </div>
            <button
              onClick={() => store.setShowCreateProjectModal(true)}
              title="New project"
              className="rounded-lg border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-white/[0.07]"
            >
              New
            </button>
            <button
              onClick={handleOpenFolder}
              disabled={isOpeningFolder}
              title="Open folder"
              className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              Open
            </button>
            <button
              onClick={handleSaveActiveFile}
              disabled={!activeFile || isSaving}
              title="Save file"
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/5 px-3 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {renderHeaderMenu('file', 'Menu', (
              <>
                <button onClick={() => { store.setShowCreateProjectModal(true); setActiveMenu(null); }} className={menuItemClassName}>
                  <Plus size={14} /> New Project
                </button>
                <button onClick={() => { void handleOpenFolder(); setActiveMenu(null); }} className={menuItemClassName}>
                  <FolderOpen size={14} /> Open Folder
                </button>
                <button onClick={() => { void handleSaveActiveFile(); setActiveMenu(null); }} className={menuItemClassName}>
                  <Save size={14} /> Save File
                </button>
                <button onClick={() => { void handleCloseFolder(); setActiveMenu(null); }} className={menuItemClassName}>
                  <RotateCcw size={14} /> Close Folder
                </button>
                <button onClick={() => { setEditorMode((prev) => (prev === 'monaco' ? 'textarea' : 'monaco')); setActiveMenu(null); }} className={menuItemClassName}>
                  <FileText size={14} /> {editorMode === 'monaco' ? 'Use Textarea' : 'Use Monaco'}
                </button>
                <button onClick={() => { store.setShowSidebar((prev) => !prev); setActiveMenu(null); }} className={menuItemClassName}>
                  <PanelLeft size={14} /> Toggle Sidebar
                </button>
                <button onClick={() => { store.setShowBottomPanel((prev) => !prev); setActiveMenu(null); }} className={menuItemClassName}>
                  <TerminalSquare size={14} /> Toggle Terminal
                </button>
                <button onClick={() => { store.setShowAiPanel((prev) => !prev); setActiveMenu(null); }} className={menuItemClassName}>
                  <Sparkles size={14} /> Toggle AI
                </button>
                <button onClick={() => { terminal.clearTerminalSession(); setActiveMenu(null); }} className={menuItemClassName}>
                  <Eraser size={14} /> Clear Terminal
                </button>
                <button onClick={() => { terminal.executeTerminalCommand('git status'); setActiveMenu(null); }} className={menuItemClassName}>
                  <GitBranch size={14} /> Git Status
                </button>
                <button onClick={() => { void handleOpenConnectRepoModal(); }} className={menuItemClassName}>
                  <ExternalLink size={14} /> Connect GitHub Repo
                </button>
                <button onClick={() => { setIsCloningRepo(true); setActiveMenu(null); }} className={menuItemClassName}>
                  <GitBranch size={14} /> Clone Repository
                </button>
                <button onClick={() => { setShowAiSettings(true); setActiveMenu(null); }} className={menuItemClassName}>
                  <Settings2 size={14} /> AI Settings
                </button>
              </>
            ))}
          </div>
          <div className="text-[10px] text-[#6f7685]">
            {activeFile?.name || 'No file selected'}
          </div>
        </div>
      </header>

      {workspaceError && (
        <div className="shrink-0 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {workspaceError}
        </div>
      )}

      {workspaceHealth.length > 0 && (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-200">
            Health
          </div>
          <div className="space-y-2">
            {workspaceHealth.map((issue, index) => (
              <div
                key={`${issue.title}-${index}`}
                className={`rounded-xl border px-3 py-2 text-xs leading-5 ${
                  issue.severity === 'error'
                    ? 'border-red-500/20 bg-red-500/10 text-red-200'
                    : 'border-amber-500/20 bg-black/10 text-amber-100'
                }`}
              >
                <div className="font-semibold">{issue.title}</div>
                <div>{issue.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {store.showSidebar && (
          <>
            <aside
              className="shrink-0 border-r border-white/5 bg-[#202020] flex flex-col"
              style={{ width: store.sidebarWidth }}
            >
            <div className="px-4 py-3 border-b border-white/5 text-xs font-bold uppercase tracking-wide text-[#8a8a8a]">
              Explorer
            </div>
            <div className="flex-1 overflow-y-auto">
              {store.files.length === 0 ? (
                <div className="p-4 text-sm text-[#777]">Belum ada file. Buka folder workspace dulu.</div>
              ) : (
                <div className="py-1">
                  {renderExplorerNodes(explorerTree)}
                </div>
              )}
            </div>
            </aside>
            <div
              onMouseDown={() => setResizeMode('sidebar')}
              className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500/30"
              title="Resize sidebar"
            />
          </>
        )}

        <main className="flex-1 min-w-0 flex">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="h-10 shrink-0 border-b border-white/5 bg-[#141414] px-3 flex items-end gap-1 overflow-x-auto">
              {aiActivityEntries.length > 0 && (
                <button
                  onClick={() => setActiveWorkspaceTab(AI_ACTIVITY_TAB_ID)}
                  className={`mt-2 inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] transition-colors ${
                    activeWorkspaceTab === AI_ACTIVITY_TAB_ID
                      ? 'border-blue-500/30 bg-[#1a1a1a] text-blue-200'
                      : 'border-white/10 bg-white/[0.03] text-[#aeb5c1] hover:bg-white/[0.06]'
                  }`}
                >
                  <Sparkles size={12} />
                  AI Activity
                </button>
              )}
              {devServerUrl && (
                <button
                  onClick={openPreviewTab}
                  className={`mt-2 inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] transition-colors ${
                    activeWorkspaceTab === PREVIEW_TAB_ID
                      ? 'border-emerald-500/30 bg-[#1a1a1a] text-emerald-200'
                      : 'border-white/10 bg-white/[0.03] text-[#aeb5c1] hover:bg-white/[0.06]'
                  }`}
                >
                  <ExternalLink size={12} />
                  Preview
                </button>
              )}
              {openFileTabs.map((fileId) => {
                const tabFile = store.files.find((file) => file.id === fileId);
                if (!tabFile) return null;
                const isActiveTab = activeWorkspaceTab === fileId;
                const isDraftTab = stagingByPath.has(normalizePath(fileId));
                return (
                  <div
                    key={fileId}
                    className={`mt-2 inline-flex items-center gap-2 rounded-t-lg border border-b-0 px-3 py-1.5 text-[11px] ${
                      isActiveTab
                        ? 'border-white/10 bg-[#1a1a1a] text-white'
                        : 'border-white/10 bg-white/[0.03] text-[#aeb5c1]'
                    }`}
                  >
                    <button onClick={() => openCenterFile(fileId)} className="inline-flex items-center gap-2">
                      <span className="inline-flex">{getFileIcon(tabFile.name)}</span>
                      <span className="max-w-[180px] truncate">{tabFile.name}</span>
                      {isDraftTab && <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-amber-200">Draft</span>}
                    </button>
                    <button onClick={() => closeCenterFileTab(fileId)} className="text-[#7f8795] hover:text-white">
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="h-10 shrink-0 border-b border-white/5 bg-[#161616] px-4 flex items-center gap-2 text-sm">
              <ChevronRight size={14} className="text-[#666d79]" />
              <span className="text-[11px] font-medium text-[#707887]">{store.projectName}</span>
              <ChevronRight size={14} className="text-[#555]" />
              <span className="inline-flex">
                {activeWorkspaceTab === AI_ACTIVITY_TAB_ID
                  ? <Sparkles size={13} className="text-blue-300" />
                  : activeWorkspaceTab === PREVIEW_TAB_ID
                    ? <ExternalLink size={13} className="text-emerald-300" />
                    : activeFile ? getFileIcon(activeFile.name) : null}
              </span>
              <span className="text-[13px] font-medium text-white">
                {activeWorkspaceTab === AI_ACTIVITY_TAB_ID
                  ? 'AI Activity'
                  : activeWorkspaceTab === PREVIEW_TAB_ID
                    ? 'Preview'
                    : activeFile?.name || 'No file selected'}
              </span>
              {activeWorkspaceTab === PREVIEW_TAB_ID && devServerUrl && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-200">
                    Live
                  </span>
                  <button
                    onClick={() => setPreviewRefreshKey((prev) => prev + 1)}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-white hover:bg-white/[0.08]"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => void handleManualPreviewReview()}
                    className="rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-medium text-blue-100 hover:bg-blue-500/15"
                  >
                    Review This Screen
                  </button>
                  <button
                    onClick={() => void handleOpenDetectedPreview()}
                    className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-100 hover:bg-emerald-500/15"
                  >
                    Browser
                  </button>
                </div>
              )}
              {activeDraft && (
                <span className="ml-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-200">
                  AI Draft
                </span>
              )}
              {pendingDrafts.length > 0 && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => void Promise.all(pendingDrafts.map((draft) => applyDraftToDisk(draft.path))).catch((error) => setWorkspaceError(error?.message || 'Failed to apply AI drafts.'))}
                    className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/15"
                  >
                    Apply All
                  </button>
                  <button
                    onClick={() => pendingDrafts.forEach((draft) => discardDraftChange(draft.path))}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Discard All
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0">
              {activeWorkspaceTab === AI_ACTIVITY_TAB_ID ? (
                <AiActivityPanel
                  entries={aiActivityEntries}
                  isAiLoading={store.isAiLoading}
                  resolveFileId={resolveAiActivityFileId}
                  onOpenFile={openCenterFile}
                  onRunSuggestedCommand={runAiSuggestedCommand}
                />
              ) : activeWorkspaceTab === PREVIEW_TAB_ID && devServerUrl ? (
                <div className="flex h-full min-h-0 flex-col bg-[#131313]">
                  <div className="border-b border-white/5 px-4 py-2.5">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-[#9aa3b2]">
                      <div className="min-w-0 truncate">
                        Runtime preview aktif di <span className="text-emerald-300">{devServerUrl}</span>
                      </div>
                      <button
                        onClick={() => setShowPreviewInspectorDetails((prev) => !prev)}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/[0.08]"
                      >
                        {showPreviewInspectorDetails ? 'Hide Inspector' : 'Show Inspector'}
                      </button>
                    </div>
                    <div className="mt-2 hidden flex-wrap gap-2 text-[10px]">
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[#d4d8df]">
                        {previewSnapshot?.shellOnly ? 'Shell Only' : 'Runtime Visible'}
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[#d4d8df]">
                        {previewSnapshot
                          ? `${previewSnapshot.sectionCount} section • ${previewSnapshot.headings.length} heading • ${previewSnapshot.buttons.length} button`
                          : 'Inspector belum siap'}
                      </div>
                      {previewSnapshot?.title ? (
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[#d4d8df]">
                          {previewSnapshot.title}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex min-h-0 flex-1 bg-[#0f0f10]">
                    {showPreviewInspectorDetails && (
                      <div className="flex min-h-0 w-[190px] shrink-0 flex-col border-r border-white/5 bg-[#141414]">
                        <div className="border-b border-white/5 px-3 py-3">
                          <div className="text-[11px] font-semibold text-white">
                            Inspector
                          </div>
                          <div className="mt-1 text-[11px] leading-5 text-[#9ba3b0]">
                            {isPreviewInspecting
                              ? 'Menganalisis snapshot preview...'
                              : (previewSnapshot?.summary || 'Snapshot preview belum tersedia.')}
                          </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[11px] text-[#c8d0dc]">
                          <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <div className="text-[#7f8795]">Headings</div>
                            <div className="mt-1 text-white">
                              {(previewSnapshot?.headings.length ? previewSnapshot.headings.slice(0, 3).join(' • ') : 'Tidak ada heading yang terdeteksi')}
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
                            <div className="text-[#7f8795]">Primary Actions</div>
                            <div className="mt-1 text-white">
                              {(previewSnapshot?.buttons.length ? previewSnapshot.buttons.slice(0, 3).join(' • ') : 'Tidak ada tombol yang terdeteksi')}
                            </div>
                          </div>
                          <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[#aeb7c5]">
                            {previewSnapshot?.bodyTextSample || 'Belum ada body text yang berarti.'}
                          </div>
                          {previewScreenshot ? (
                            <img
                              src={previewScreenshot.dataUrl}
                              alt="Preview runtime screenshot"
                              className="w-full rounded-lg border border-white/10 bg-[#0f0f10]"
                            />
                          ) : (
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[#9da6b3]">
                              Screenshot runtime belum tersedia.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="min-h-0 flex-1 bg-[#0f0f10] p-3">
                      <iframe
                        key={`${devServerUrl}-${previewRefreshKey}`}
                        src={devServerUrl}
                        title="AURA Preview"
                        className="h-full w-full rounded-xl border border-white/10 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : activeFile ? (
                <div className="flex h-full min-h-0 flex-col">
                  {activeDraft && (
                    <div className="flex items-center justify-between border-b border-amber-500/10 bg-amber-500/5 px-4 py-2 text-[11px] text-amber-100">
                      <div className="min-w-0 pr-4">
                        Draft AI aktif untuk file ini. Review isi editor lalu apply ke workspace jika sudah cocok.
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDraftViewMode((prev) => prev === 'diff' ? 'editor' : 'diff')}
                          className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-semibold text-blue-100 hover:bg-blue-500/15"
                        >
                          {draftViewMode === 'diff' ? 'Edit Draft' : 'Show Diff'}
                        </button>
                        <button
                          onClick={() => void applyDraftToDisk(activeDraft.path).catch((error) => setWorkspaceError(error?.message || 'Failed to apply draft file.'))}
                          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/15"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => discardDraftChange(activeDraft.path)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/[0.08]"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    {activeDraft && draftViewMode === 'diff' ? (
                      editorMode === 'monaco' ? (
                        <Suspense
                          fallback={
                            <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-sm text-[#858585]">
                              Loading diff editor...
                            </div>
                          }
                        >
                          <MonacoDiffEditor
                            height="100%"
                            theme="vs-dark"
                            original={activeDraft.originalContent}
                            modified={activeDraft.newContent}
                            language={activeFile.language}
                            options={{
                              readOnly: true,
                              renderSideBySide: true,
                              minimap: { enabled: false },
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 14
                            }}
                          />
                        </Suspense>
                      ) : (
                        <div className="grid h-full min-h-0 grid-cols-2 divide-x divide-white/5">
                          <div className="min-h-0 bg-[#171717] p-3">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8a8f99]">Original</div>
                            <pre className="h-full overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-6 text-[#8f97a3]">{activeDraft.originalContent || '// file baru'}</pre>
                          </div>
                          <div className="min-h-0 bg-[#1b1b1b] p-3">
                            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">Draft Baru</div>
                            <pre className="h-full overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-6 text-[#d4d4d4]">{activeDraft.newContent}</pre>
                          </div>
                        </div>
                      )
                    ) : editorMode === 'monaco' ? (
                      <Suspense
                        fallback={
                          <div className="h-full w-full flex items-center justify-center bg-[#1e1e1e] text-sm text-[#858585]">
                            Loading Monaco editor...
                          </div>
                        }
                      >
                        <MonacoEditor
                          height="100%"
                          theme="vs-dark"
                          language={activeFile.language}
                          value={activeFile.content}
                          onChange={(value) => handleEditorChange(value ?? '')}
                          options={{
                            fontSize: 14,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 16 },
                            fontFamily: 'JetBrains Mono, monospace',
                            smoothScrolling: true,
                            lineNumbersMinChars: 3,
                          }}
                        />
                      </Suspense>
                    ) : (
                      <textarea
                        value={activeFile.content}
                        onChange={(event) => handleEditorChange(event.target.value)}
                        className="h-full w-full resize-none border-none bg-[#1e1e1e] p-4 font-mono text-sm text-[#d4d4d4] outline-none"
                        spellCheck={false}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center text-center px-6">
                  <div className="text-2xl font-bold text-white">Workspace Ready</div>
                  <p className="mt-3 max-w-lg text-sm text-[#858585]">
                    Fondasi workspace baru sudah hidup. Sekarang editor dan terminal native dasar sudah mulai tersambung,
                    lalu kita bisa tambah AI panel dan explorer bertingkat secara bertahap.
                  </p>
                </div>
              )}
            </div>

            {store.showBottomPanel && (
              <section
                className="aura-terminal-panel shrink-0 border-t border-white/5 bg-[#111111] flex flex-col"
                style={{ height: store.bottomHeight }}
              >
              <div
                onMouseDown={() => setResizeMode('bottom')}
                className="h-1 shrink-0 cursor-row-resize bg-transparent transition-colors hover:bg-blue-500/30"
                title="Resize terminal panel"
              />
              <div className="flex shrink-0 items-center justify-between border-b border-white/5 bg-[#151515] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
                  <button
                    onClick={() => setBottomPanelTab('terminal')}
                    className={`rounded-xl border px-2.5 py-1 text-[10px] font-medium ${
                      bottomPanelTab === 'terminal'
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                        : 'border-white/10 bg-white/[0.04] text-[#9da5b3]'
                    }`}
                  >
                    Terminal
                  </button>
                  <button
                    onClick={() => setBottomPanelTab('problems')}
                    className={`rounded-xl border px-2.5 py-1 text-[10px] font-medium ${
                      bottomPanelTab === 'problems'
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                        : 'border-white/10 bg-white/[0.04] text-[#9da5b3]'
                    }`}
                  >
                    Problems
                    {totalProblemCount > 0 ? ` (${totalProblemCount})` : ''}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {terminal.currentSession?.isRunning ? (
                    <div className="inline-flex max-w-[280px] items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium text-emerald-100">
                      <LoaderCircle size={11} className="shrink-0 animate-spin" />
                      <span className="shrink-0">Running</span>
                      {terminal.currentSession.currentCommand ? (
                        <span className="truncate text-emerald-200/90">{terminal.currentSession.currentCommand}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    onClick={() => terminalEngine.stop(store.activeTerminalId, terminal.appendTerminalOutput)}
                    disabled={!terminal.currentSession?.isRunning}
                    className="inline-flex items-center gap-1 rounded-xl border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-40"
                  >
                    <Square size={12} />
                    Stop
                  </button>
                  <button
                    onClick={() => terminal.clearTerminalSession()}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-[#d4d4d4] hover:bg-white/[0.08]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 bg-[#0c0c0c]">
                {bottomPanelTab === 'terminal' && terminal.currentSession ? (
                  <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0b0b0b]">
                    <div className="min-h-0 flex-1 overflow-hidden">
                      <TerminalAdapter
                        id={terminal.currentSession.id}
                        output={terminal.currentSession.output}
                        isRunning={!!terminal.currentSession.isRunning}
                        currentCommand={terminal.currentSession.currentCommand}
                      />
                    </div>
                    <div className="flex h-9 shrink-0 items-center gap-2 border-t border-white/5 bg-[#0b0b0b] px-3 font-mono text-[12px] text-[#9fb7d8]">
                      <span className="shrink-0 text-[#8fb2da]">{`PS ${terminal.currentSession?.cwd || store.nativeProjectPath || 'not set'}>`}</span>
                      <input
                        ref={terminalCommandRef}
                        value={terminal.terminalInput}
                        onChange={(event) => terminal.setTerminalInput(event.target.value)}
                        onKeyDown={terminal.handleTerminalCommand}
                        placeholder=""
                        className="h-full min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-transparent"
                        spellCheck={false}
                      />
                      <span className="inline-block h-[13px] w-[6px] animate-pulse rounded-sm bg-[#9fb7d8]/80 align-middle" />
                    </div>
                  </div>
                ) : bottomPanelTab === 'problems' ? (
                  <div className="h-full w-full overflow-auto bg-[#0b0b0b] px-3 py-2.5 font-mono text-[11px] leading-5 text-[#d4d4d4]">
                    {totalProblemCount > 0 ? (
                      <div className="space-y-2">
                        {store.problems.map((problem, index) => (
                          <div key={`${problem.message}-${index}`} className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2 text-[#d4d4d4]">
                            <div className="flex items-center gap-2 text-[10px] text-[#9aa3b2]">
                              <span className={`${problem.severity === 'error' ? 'text-red-300' : problem.severity === 'warning' ? 'text-amber-300' : 'text-sky-300'}`}>
                                {problem.severity}
                              </span>
                              {problem.path ? <span className="truncate">{problem.path}</span> : null}
                              {problem.line ? <span>{`:${problem.line}`}</span> : null}
                            </div>
                            <div className="mt-1 text-[#d4d4d4]">{problem.message}</div>
                          </div>
                        ))}
                        {problemEntries.map((problem, index) => (
                          <div key={`${problem}-${index}`} className="rounded-lg border border-white/6 bg-white/[0.03] px-3 py-2 text-[#d4d4d4]">
                            {problem}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[#8f97a3]">No problems</div>
                    )}
                  </div>
                ) : null}
              </div>

              </section>
            )}
          </div>

          {store.showAiPanel && (
            <>
              <div
                onMouseDown={() => setResizeMode('ai')}
                className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-blue-500/30"
                title="Resize AI panel"
              />
              <AiComposerPanel
                width={store.aiPanelWidth}
                provider={store.aiProvider}
                providerOptions={AI_PROVIDERS}
                activeModel={aiManager.activeModel}
                modelOptions={aiModelOptions}
                taskPreset={activeTaskPreset}
                taskPresetOptions={DEVELOPER_TASK_PRESETS}
                selectedSkill={store.selectedSkill}
                activeSkill={activeCollectiveSkill}
                testingStatus={store.testingStatus[store.aiProvider]}
                testError={store.testError[store.aiProvider]}
                domainFocus={activeDomainFocus}
                preferredTargets={activePreferredTargets}
                chatMessages={store.chatMessages}
                chatInput={store.chatInput}
                attachedFiles={store.attachedFiles}
                isAiLoading={store.isAiLoading}
                processingEntry={activeProcessingEntry}
                fastFixMode={isFastFixDraft}
                onOpenSettings={() => setShowAiSettings(true)}
                onClearChat={() => {
                  store.setChatMessages([]);
                  store.setAttachedFiles([]);
                }}
                onClosePanel={() => store.setShowAiPanel(false)}
                onChangeTaskPreset={handleApplyDeveloperTaskPreset}
                onChangeChatInput={(value) => store.setChatInput(value)}
                onSendPrompt={handleSendAiPrompt}
                onStopPrompt={handleStopAiPrompt}
                onRemoveAttachment={removeChatAttachment}
                onOpenAttach={() => void handleOpenChatAttachmentPicker()}
                onTextareaKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendAiPrompt();
                  }
                }}
                onTextareaPaste={(event) => void handleChatPaste(event)}
              />
            </>
          )}

        </main>
      </div>

      <div className="h-7 shrink-0 border-t border-white/5 bg-[#181818] px-4 flex items-center justify-between text-xs text-[#858585]">
        <div>{activeFile?.language || 'workspace-shell'}</div>
        <div>{store.files.length} files loaded</div>
      </div>

      <input
        ref={chatFileInputRef}
        type="file"
        multiple
        accept="image/*,.txt,.md,.mdx,.json,.jsonc,.ts,.tsx,.js,.jsx,.css,.scss,.sass,.less,.html,.htm,.yml,.yaml,.toml,.env,.gitignore,.npmrc,.sh,.ps1,.bat,.cmd,.rs,.py,.java,.kt,.go,.c,.cpp,.h,.hpp,.cs,.php,.rb,.swift,.sql,.prisma,.xml,.svg"
        className="hidden"
        onChange={handleChatFileUpload}
      />

      <AiSettingsModal
        isOpen={showAiSettings}
        provider={store.aiProvider}
        visualReviewProvider={store.visualReviewProvider}
        providerOptions={AI_PROVIDERS}
        visualReviewProviderOptions={visualReviewProviderOptions}
        activeModel={aiManager.activeModel}
        aiModelSearch={aiModelSearch}
        onChangeSearch={setAiModelSearch}
        onClose={() => setShowAiSettings(false)}
        onProviderChange={handleAiProviderChange}
        onVisualReviewProviderChange={handleVisualReviewProviderChange}
        onModelChange={handleAiModelChange}
        onRefreshModels={aiManager.refreshModels}
        onResetProvider={handleResetCurrentProvider}
        onTestConnection={() => aiManager.testAiConnection(store.aiProvider)}
        onSignInPuter={aiManager.signInPuter}
        onImportSumopodModels={handleImportSumopodModels}
        onClearSumopodModels={handleClearSumopodModels}
        onCredentialChange={handleAiCredentialChange}
        onToggleAutoApplyDrafts={store.setAiAutoApplyDrafts}
        onApplyDeveloperTaskPreset={handleApplyDeveloperTaskPreset}
        activeTaskPreset={activeTaskPreset}
        taskPresets={DEVELOPER_TASK_PRESETS}
        activeCollectiveSkill={activeCollectiveSkill}
        filteredRecommendedOptions={filteredRecommendedOptions}
        filteredAllOtherOptions={filteredAllOtherOptions}
        recommendationChips={aiRecommendationChips}
        activeAiCredential={activeAiCredential}
        aiAutoApplyDrafts={store.aiAutoApplyDrafts}
        isFetchingModels={store.isFetchingModels}
        testingStatus={store.testingStatus[store.aiProvider]}
        testError={store.testError[store.aiProvider]}
        activeTestMeta={activeTestMeta}
        sumopodCustomModelCount={store.dynamicSumopodModels.length}
      />

      <CreateProjectModal
        isOpen={store.showCreateProjectModal}
        onClose={() => store.setShowCreateProjectModal(false)}
        onConfirm={handleCreateProject}
        isTauri={true}
        tauriDialog={{ open: openDialog }}
      />

      {isCloningRepo && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center bg-black/50 px-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <GitBranch size={15} className="text-blue-400" />
                Clone Repository
              </div>
              <button
                onClick={() => setIsCloningRepo(false)}
                className="rounded-md border border-white/10 bg-white/5 p-2 text-[#a8a8a8] hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Repository URL
                </div>
                <input
                  value={cloneRepoUrl}
                  onChange={(event) => setCloneRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository.git"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500/40"
                />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Destination Folder
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={cloneDestination}
                    onChange={(event) => setCloneDestination(event.target.value)}
                    placeholder="Choose folder..."
                    className="h-10 flex-1 rounded-xl border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500/40"
                  />
                  <button
                    onClick={() => void handleBrowseCloneDestination()}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    Browse
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs leading-5 text-blue-100">
                Setelah clone berhasil, AURA akan langsung membuka repository hasil clone sebagai workspace aktif.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-[#252526] px-4 py-3">
              <button
                onClick={() => setIsCloningRepo(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#a8a8a8] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleGitClone()}
                disabled={!cloneRepoUrl.trim() || !cloneDestination.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
              >
                Clone & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {showConnectRepoModal && (
        <div className="fixed inset-0 z-[121] flex items-start justify-center bg-black/50 px-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ExternalLink size={15} className="text-emerald-400" />
                Connect GitHub Repository
              </div>
              <button
                onClick={() => setShowConnectRepoModal(false)}
                className="rounded-md border border-white/10 bg-white/5 p-2 text-[#a8a8a8] hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-5 text-[#aeb7c5]">
                Workspace aktif: <span className="text-white">{store.nativeProjectPath || 'Belum ada workspace'}</span>
                {detectedOriginUrl ? (
                  <div className="mt-1 text-[11px] text-emerald-200">Remote origin saat ini: {detectedOriginUrl}</div>
                ) : (
                  <div className="mt-1 text-[11px] text-[#8e97a6]">Belum ada remote origin yang terdeteksi di workspace ini.</div>
                )}
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Repository URL
                </div>
                <input
                  value={connectRepoUrl}
                  onChange={(event) => setConnectRepoUrl(event.target.value)}
                  placeholder="https://github.com/owner/repository.git"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500/40"
                />
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  Default Branch
                </div>
                <input
                  value={connectRepoBranch}
                  onChange={(event) => setConnectRepoBranch(event.target.value)}
                  placeholder="main"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500/40"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-[#8a8a8a]">
                  <span>GitHub Token</span>
                  <span className="text-[10px] normal-case tracking-normal text-[#6f7785]">Classic PAT atau fine-grained token</span>
                </div>
                <input
                  type="password"
                  value={connectRepoToken}
                  onChange={(event) => {
                    setConnectRepoToken(event.target.value);
                    setGithubTokenStatus({ tone: 'idle', message: '' });
                  }}
                  placeholder="ghp_... atau github_pat_..."
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-sm text-white outline-none placeholder:text-[#666] focus:border-blue-500/40"
                />
                <div className="mt-2 text-[11px] leading-5 text-[#8e97a6]">
                  Token ini dipakai untuk push HTTPS ke GitHub dan disimpan lokal di AURA. Jika kosong, AURA tetap mencoba memakai kredensial Git yang sudah ada di sistem.
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void handleTestGithubToken()}
                    disabled={isTestingGithubToken}
                    className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/15 disabled:opacity-50"
                  >
                    {isTestingGithubToken ? 'Testing...' : 'Test Token'}
                  </button>
                  <button
                    onClick={handleSaveGithubToken}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/15"
                  >
                    Save Token
                  </button>
                  <button
                    onClick={handleClearGithubToken}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#d5d8de] hover:bg-white/[0.08]"
                  >
                    Clear Token
                  </button>
                </div>
                {githubTokenStatus.message ? (
                  <div
                    className={`mt-3 rounded-lg border px-3 py-2 text-[11px] leading-5 ${
                      githubTokenStatus.tone === 'success'
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                        : githubTokenStatus.tone === 'error'
                          ? 'border-red-500/20 bg-red-500/10 text-red-200'
                          : 'border-white/10 bg-white/[0.03] text-[#c5ccd8]'
                    }`}
                  >
                    {githubTokenStatus.message}
                  </div>
                ) : null}
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-100">
                AURA akan membuat repo Git lokal jika workspace ini belum punya <code>.git</code>, lalu menambahkan atau memperbarui remote <code>origin</code>, membuat commit otomatis, dan langsung push ke GitHub. Jika token GitHub diisi di sini, AURA akan memakainya otomatis untuk push.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/5 bg-[#252526] px-4 py-3">
              <button
                onClick={() => setShowConnectRepoModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-[#a8a8a8] hover:text-white"
              >
                Cancel
              </button>
                <button
                  onClick={() => void handleConnectRepository()}
                  disabled={!store.nativeProjectPath || !connectRepoUrl.trim() || isConnectingRepo}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
                >
                {isConnectingRepo ? 'Publishing...' : 'Init, Connect & Push'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

