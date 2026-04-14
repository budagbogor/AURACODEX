import { FileText, Image as ImageIcon, LoaderCircle, Paperclip, Send, Settings2, Sparkles, Square, X } from 'lucide-react';
import type { AiProvider, AttachedFile, ChatMessage } from '@/types';

type TaskPreset = {
  id: string;
  label: string;
  description: string;
  executionChecklist?: string[];
};

type SkillInfo = {
  description?: string;
  workflow?: string[];
};

type ModelOption = {
  id: string;
  name: string;
};

type ProviderOption = {
  id: string;
  name: string;
};

type ProcessingEntry = {
  title: string;
  summary: string;
  files: string[];
  steps?: Array<{
    label: string;
    detail: string;
    status: 'planning' | 'working' | 'done' | 'error';
  }>;
};

type Props = {
  width: number;
  provider: AiProvider;
  providerOptions: ProviderOption[];
  activeModel: string;
  modelOptions: ModelOption[];
  taskPreset: TaskPreset;
  taskPresetOptions: TaskPreset[];
  selectedSkill: string;
  activeSkill: SkillInfo | null | undefined;
  testingStatus: string | undefined;
  testError?: string;
  domainFocus: string[];
  preferredTargets: string[];
  chatMessages: ChatMessage[];
  chatInput: string;
  attachedFiles: AttachedFile[];
  isAiLoading: boolean;
  processingEntry: ProcessingEntry | null;
  fastFixMode?: boolean;
  onOpenSettings: () => void;
  onClearChat: () => void;
  onClosePanel: () => void;
  onChangeTaskPreset: (presetId: string) => void;
  onChangeChatInput: (value: string) => void;
  onSendPrompt: () => void | Promise<void>;
  onStopPrompt: () => void;
  onRemoveAttachment: (index: number) => void;
  onOpenAttach: () => void;
  onTextareaKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onTextareaPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void | Promise<void>;
};

export function AiComposerPanel({
  width,
  provider,
  providerOptions,
  activeModel,
  modelOptions,
  taskPreset,
  taskPresetOptions,
  selectedSkill,
  activeSkill,
  testingStatus,
  domainFocus,
  preferredTargets,
  chatMessages,
  chatInput,
  attachedFiles,
  isAiLoading,
  processingEntry,
  fastFixMode = false,
  onOpenSettings,
  onClosePanel,
  onChangeTaskPreset,
  onChangeChatInput,
  onSendPrompt,
  onStopPrompt,
  onRemoveAttachment,
  onOpenAttach,
  onTextareaKeyDown,
  onTextareaPaste
}: Props) {
  const providerName = providerOptions.find((item) => item.id === provider)?.name || provider;
  const modelName = modelOptions.find((item) => item.id === activeModel)?.name || activeModel;

  return (
    <aside
      className="aura-ai-panel shrink-0 min-h-0 border-l border-white/5 bg-[#141414] flex flex-col"
      style={{ width }}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
          <Sparkles size={13} className="text-blue-400" />
          AI Composer
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-[#b8b8b8] hover:bg-white/10 hover:text-white"
            title="AI settings"
          >
            <Settings2 size={13} />
          </button>
          <button
            onClick={onClosePanel}
            className="rounded-md border border-white/10 bg-white/5 p-1.5 text-[#b8b8b8] hover:bg-white/10 hover:text-white"
            title="Close AI panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-white/5 px-3 py-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#d7dbe2]">
              <span className="font-semibold text-white">{providerName}</span>
              <span className="text-[#59606d]">/</span>
              <span className="max-w-[180px] truncate text-[#c2c8d2]">{modelName}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-[#808895]">
              <label className="sr-only" htmlFor="aura-task-preset-select">Task mode</label>
              <select
                id="aura-task-preset-select"
                value={taskPreset.id}
                onChange={(event) => onChangeTaskPreset(event.target.value)}
                className="rounded-md border border-white/10 bg-[#181818] px-2 py-1 text-[10px] font-medium text-[#d7dbe2] outline-none focus:border-blue-500/40"
                title="AI task mode"
              >
                {taskPresetOptions.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <span className="truncate text-[#727b88]">{taskPreset.label}</span>
            </div>
            {fastFixMode ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                Fast Error Fix active
              </div>
            ) : null}
          </div>
          {testingStatus === 'error' ? (
            <div className="rounded-full bg-red-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-red-200">
              Error
            </div>
          ) : null}
        </div>

        {isAiLoading ? (
          <div className="mt-2 rounded-lg border border-blue-500/15 bg-blue-500/[0.07] px-3 py-2">
            <div className="flex items-center gap-2 text-[11px] text-blue-100">
              <LoaderCircle size={13} className="animate-spin text-blue-300" />
              <span className="font-semibold">AURA sedang menjalankan prompt...</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {chatMessages.length === 0 ? (
          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-[11px] leading-5 text-[#9098a5]">
            Tulis instruksi kerja di sini.
            <div className="mt-1 text-[#727b88]">Hasil perubahan akan muncul di panel tengah.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-lg px-3 py-2.5 text-[12px] leading-5 ${
                  message.role === 'user'
                    ? 'ml-8 border border-blue-500/20 bg-blue-500/10 text-blue-100'
                    : 'mr-8 border border-white/10 bg-white/5 text-[#d4d4d4]'
                }`}
              >
                <div>{message.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/5 bg-[#121212] px-3 py-2.5">
        {attachedFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-[#d7dbe2]"
              >
                {file.type.startsWith('image/') ? (
                  <ImageIcon size={12} className="shrink-0 text-blue-300" />
                ) : (
                  <FileText size={12} className="shrink-0 text-emerald-300" />
                )}
                <span className="max-w-[180px] truncate">{file.name}</span>
                <button
                  onClick={() => onRemoveAttachment(index)}
                  className="rounded-md p-0.5 text-[#8d95a3] hover:bg-white/10 hover:text-white"
                  title="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <textarea
          value={chatInput}
          onChange={(event) => onChangeChatInput(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          onPaste={(event) => void onTextareaPaste(event)}
          placeholder="Tulis prompt AI di sini..."
          className="min-h-[72px] w-full resize-none rounded-lg border border-white/10 bg-[#0f0f0f] px-3 py-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-[#666] focus:border-blue-500/40"
        />
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenAttach}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-white/[0.08]"
              title="Attach image or file"
            >
              <Paperclip size={14} />
              Attach
            </button>
            {isAiLoading ? (
              <button
                onClick={onStopPrompt}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold text-red-100 hover:bg-red-500/15"
                title="Stop AI request"
              >
                <Square size={14} />
                Stop
              </button>
            ) : (
              <button
                onClick={() => void onSendPrompt()}
                disabled={!chatInput.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500 disabled:opacity-40"
              >
                <Send size={14} />
                Send
              </button>
            )}
          </div>
          {testingStatus === 'error' ? (
            <div className="text-[10px] text-red-300">Provider error. Cek settings.</div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
