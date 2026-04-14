import type { AiProvider, AttachedFile, ChatMessage, FileItem, StagingFile } from '@/types';
import {
  detectWorkspacePackageManager,
  extractAiGeneratedFiles,
  inferExecutionPlan,
  inferSuggestedVerificationCommands,
  normalizePath
} from '@/features/workspace/workspaceSupport';
import {
  buildAssistantChatContent,
  buildDraftReadyActivitySteps
} from '@/features/ai/aiWorkflowSupport';
import { generateGeminiStream } from '@/services/geminiService';
import { generateOpenRouterContent } from '@/services/openRouterService';
import { generateBytezContent } from '@/services/bytezService';
import { generateSumopodContent } from '@/services/sumopodService';
import { generatePuterContent } from '@/services/puterService';

type ProviderGenerationInput = {
  provider: AiProvider;
  promptWithPreset: string;
  attachments: AttachedFile[];
  historyBeforePrompt: ChatMessage[];
  temperature: number;
  geminiApiKey: string;
  selectedModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
  bytezApiKey: string;
  bytezModel: string;
  sumopodApiKey: string;
  sumopodModel: string;
  puterModel: string;
};

export type PreparedAiDraftBundle = {
  responseText: string;
  generatedFiles: ReturnType<typeof extractAiGeneratedFiles>;
  nextDrafts: StagingFile[];
  suggestedCommands: Array<{
    label: string;
    command: string;
    reason: string;
  }>;
  readySteps: Array<{
    label: string;
    detail: string;
    status: 'planning' | 'working' | 'done' | 'error';
  }>;
  assistantChatContent: string;
};

export const generateAiProviderResponse = async ({
  provider,
  promptWithPreset,
  attachments,
  historyBeforePrompt,
  temperature,
  geminiApiKey,
  selectedModel,
  openRouterApiKey,
  openRouterModel,
  bytezApiKey,
  bytezModel,
  sumopodApiKey,
  sumopodModel,
  puterModel
}: ProviderGenerationInput) => {
  if (provider === 'gemini') {
    let streamedText = '';
    for await (const chunk of generateGeminiStream(
      geminiApiKey,
      selectedModel,
      promptWithPreset,
      attachments,
      historyBeforePrompt,
      temperature
    )) {
      streamedText += chunk;
    }
    return streamedText;
  }

  if (provider === 'openrouter') {
    return generateOpenRouterContent(
      openRouterModel,
      promptWithPreset,
      openRouterApiKey,
      attachments,
      historyBeforePrompt
    );
  }

  if (provider === 'bytez') {
    return generateBytezContent(
      bytezModel,
      promptWithPreset,
      bytezApiKey,
      geminiApiKey,
      attachments,
      historyBeforePrompt
    );
  }

  if (provider === 'sumopod') {
    return generateSumopodContent(
      sumopodApiKey,
      sumopodModel,
      [...historyBeforePrompt, { role: 'user', content: promptWithPreset }]
    );
  }

  if (provider === 'puter') {
    return generatePuterContent(
      puterModel,
      [...historyBeforePrompt, { role: 'user', content: promptWithPreset }]
    );
  }

  throw new Error('Composer Ollama belum disambungkan di workspace baru. Gunakan provider cloud dulu atau lanjutkan saya sambungkan Ollama berikutnya.');
};

export const prepareAiDraftBundle = ({
  responseText,
  activeFile,
  nativeProjectPath,
  preferredTargets,
  files,
  domains
}: {
  responseText: string;
  activeFile: FileItem | null;
  nativeProjectPath: string | null;
  preferredTargets: string[];
  files: FileItem[];
  domains: string[];
}): PreparedAiDraftBundle => {
  const generatedFiles = extractAiGeneratedFiles(responseText, activeFile, nativeProjectPath, preferredTargets, files);
  const nextDrafts = generatedFiles.map((generatedFile) => {
    const existing = files.find((file) => normalizePath(file.id) === normalizePath(generatedFile.absolutePath));
    return {
      path: generatedFile.absolutePath,
      originalContent: existing?.content || '',
      existedBefore: Boolean(existing),
      newContent: generatedFile.content,
      action: generatedFile.action,
      status: 'pending' as const
    };
  });

  const packageManager = detectWorkspacePackageManager(files);
  const suggestedCommands = inferSuggestedVerificationCommands(files, nativeProjectPath, domains, packageManager);
  const readySteps = buildDraftReadyActivitySteps({
    domains,
    preferredTargets,
    responseText,
    generatedCount: generatedFiles.length,
    inferExecutionPlan
  });

  return {
    responseText,
    generatedFiles,
    nextDrafts,
    suggestedCommands,
    readySteps,
    assistantChatContent: buildAssistantChatContent(generatedFiles.length, responseText)
  };
};
