import { Play, RotateCcw, Settings2, X } from 'lucide-react';
import type { AiProvider, VisualReviewProvider } from '@/types';

type TaskPreset = {
  id: string;
  label: string;
  description: string;
  executionChecklist?: string[];
};

type SkillInfo = {
  checklist?: string[];
};

type ModelOption = {
  id: string;
  name: string;
  meta?: string;
  badge?: string;
};

type RecommendationChip = {
  id: string;
  name: string;
  badge: string;
};

type ProviderOption = {
  id: string;
  name: string;
};

type Props = {
  isOpen: boolean;
  provider: AiProvider;
  visualReviewProvider: VisualReviewProvider;
  providerOptions: ProviderOption[];
  visualReviewProviderOptions: ProviderOption[];
  activeModel: string;
  aiModelSearch: string;
  onChangeSearch: (value: string) => void;
  onClose: () => void;
  onProviderChange: (provider: AiProvider) => void;
  onVisualReviewProviderChange: (provider: VisualReviewProvider) => void;
  onModelChange: (model: string) => void;
  onRefreshModels: () => void | Promise<void>;
  onResetProvider: () => void;
  onTestConnection: () => void | Promise<void>;
  onSignInPuter?: () => void | Promise<void>;
  onCredentialChange: (value: string) => void;
  onToggleAutoApplyDrafts: (enabled: boolean) => void;
  onApplyDeveloperTaskPreset: (presetId: string) => void;
  activeTaskPreset: TaskPreset;
  taskPresets: TaskPreset[];
  activeCollectiveSkill: SkillInfo | null | undefined;
  filteredRecommendedOptions: ModelOption[];
  filteredAllOtherOptions: ModelOption[];
  recommendationChips: RecommendationChip[];
  activeAiCredential: string;
  aiAutoApplyDrafts: boolean;
  isFetchingModels: boolean;
  testingStatus: string | undefined;
  testError?: string;
  activeTestMeta?: { checkedAt?: number; model?: string; success?: boolean };
};

export function AiSettingsModal(props: Props) {
  const {
    isOpen,
    provider,
    visualReviewProvider,
    providerOptions,
    visualReviewProviderOptions,
    activeModel,
    aiModelSearch,
    onChangeSearch,
    onClose,
    onProviderChange,
    onVisualReviewProviderChange,
    onModelChange,
    onRefreshModels,
    onResetProvider,
    onTestConnection,
    onSignInPuter,
    onCredentialChange,
    onToggleAutoApplyDrafts,
    onApplyDeveloperTaskPreset,
    activeTaskPreset,
    taskPresets,
    activeCollectiveSkill,
    filteredRecommendedOptions,
    filteredAllOtherOptions,
    recommendationChips,
    activeAiCredential,
    aiAutoApplyDrafts,
    isFetchingModels,
    testingStatus,
    testError,
    activeTestMeta
  } = props;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[125] flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Settings2 size={15} className="text-blue-400" />
              AI Settings
            </div>
            <div className="mt-0.5 text-[11px] text-[#8a93a1]">
              Global provider, model, credential, dan preset kerja untuk seluruh workspace.
            </div>
          </div>
          <button onClick={onClose} className="rounded-md border border-white/10 bg-white/5 p-2 text-[#a8a8a8] hover:bg-white/10 hover:text-white">
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[78vh] space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Developer Task</div>
            <div className="flex flex-wrap gap-2">
              {taskPresets.map((preset) => {
                const active = activeTaskPreset.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => onApplyDeveloperTaskPreset(preset.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                      active ? 'border-violet-500/30 bg-violet-500/15 text-violet-100' : 'border-white/10 bg-white/5 text-[#d4d4d4] hover:bg-white/10'
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 rounded-xl border border-white/8 bg-[#0d0d0d] px-3 py-2 text-[11px] leading-5 text-[#98a0ad]">
              <div className="font-semibold text-white">{activeTaskPreset.label}</div>
              <div>{activeTaskPreset.description}</div>
              <div className="mt-1 text-[#7e7e7e]">Skill aktif: {activeTaskPreset.label}</div>
              <details className="mt-2 rounded-lg border border-white/6 bg-white/[0.03] px-2.5 py-2">
                <summary className="cursor-pointer list-none text-[9px] font-semibold uppercase tracking-[0.16em] text-[#7f8795]">
                  Checklist & Quality Gates
                </summary>
                {activeTaskPreset.executionChecklist?.length ? (
                  <div className="mt-1.5 space-y-1">
                    {activeTaskPreset.executionChecklist.slice(0, 5).map((item) => (
                      <div key={item} className="text-[10px] leading-5 text-[#a8b0bc]">• {item}</div>
                    ))}
                  </div>
                ) : null}
                {activeCollectiveSkill?.checklist?.length ? (
                  <div className="mt-2 space-y-1 border-t border-white/6 pt-2">
                    {activeCollectiveSkill.checklist.slice(0, 6).map((item) => (
                      <div key={item} className="text-[10px] leading-5 text-[#a8b0bc]">• {item}</div>
                    ))}
                  </div>
                ) : null}
              </details>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Provider</div>
              <select value={provider} onChange={(event) => onProviderChange(event.target.value as AiProvider)} className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-[13px] text-white outline-none focus:border-blue-500/40">
                {providerOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>

            <label className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Model</div>
              <input value={aiModelSearch} onChange={(event) => onChangeSearch(event.target.value)} placeholder="Cari model, provider, context, atau harga..." className="h-9 w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-3 text-[12px] text-white outline-none placeholder:text-[#666] focus:border-blue-500/40" />
              <select value={activeModel} onChange={(event) => onModelChange(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-[13px] text-white outline-none placeholder:text-[#666] focus:border-blue-500/40">
                {filteredRecommendedOptions.length > 0 ? (
                  <optgroup label="Recommended for Coding">
                    {filteredRecommendedOptions.map((model) => <option key={model.id} value={model.id}>{model.badge ? `[${model.badge}] ${model.name}${model.meta ? ` | ${model.meta}` : ''}` : `${model.name}${model.meta ? ` | ${model.meta}` : ''}`}</option>)}
                  </optgroup>
                ) : null}
                <optgroup label="All Models">
                  {filteredAllOtherOptions.map((model) => <option key={model.id} value={model.id}>{model.badge ? `[${model.badge}] ${model.name}${model.meta ? ` | ${model.meta}` : ''}` : `${model.name}${model.meta ? ` | ${model.meta}` : ''}`}</option>)}
                </optgroup>
              </select>
              {filteredRecommendedOptions.length === 0 && filteredAllOtherOptions.length === 0 ? (
                <div className="text-[10px] text-amber-300">Tidak ada model yang cocok dengan pencarian ini. Coba kata kunci lain atau klik `Refresh Models`.</div>
              ) : null}
              <div className="text-[10px] text-[#7f8795]">Dropdown ini mengikuti katalog provider aktif. Pencarian memfilter nama model, provider, context, dan harga.</div>
            </label>
          </div>

          <label className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Visual Review Provider</div>
            <select
              value={visualReviewProvider}
              onChange={(event) => onVisualReviewProviderChange(event.target.value as VisualReviewProvider)}
              className="h-10 w-full rounded-xl border border-white/10 bg-[#101010] px-3 text-[13px] text-white outline-none focus:border-blue-500/40"
            >
              {visualReviewProviderOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <div className="text-[10px] leading-5 text-[#7f8795]">
              Pakai provider terpisah untuk review UI/runtime. `Same as Coding Provider` menjaga alur tetap sederhana. Untuk screenshot review paling kuat, gunakan `Gemini` atau `OpenRouter`.
            </div>
          </label>

          {recommendationChips.length > 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Coding Recommendations</div>
              <div className="flex flex-wrap gap-1.5">
                {recommendationChips.map((chip) => (
                  <button key={chip.id} onClick={() => onModelChange(chip.id)} className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold transition-colors ${activeModel === chip.id ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100' : 'border-white/10 bg-white/5 text-[#d2d2d2] hover:bg-white/10'}`}>
                    <span className="text-[9px] uppercase tracking-wide text-[#8fb5ff]">{chip.badge}</span>
                    <span className="max-w-[220px] truncate">{chip.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">
              <span>{provider === 'puter' ? 'Auth Token / API Key' : provider === 'ollama' ? 'Server URL' : 'API Key'}</span>
              <span className="text-[10px] normal-case tracking-normal text-[#6f6f6f]">{provider === 'puter' ? 'Tidak diperlukan untuk Puter.js' : 'Berlaku global'}</span>
            </div>
            <input
              type={provider === 'ollama' ? 'text' : 'password'}
              value={activeAiCredential}
              onChange={(event) => onCredentialChange(event.target.value)}
              placeholder={provider === 'openrouter' ? 'sk-or-...' : provider === 'bytez' ? 'bytez-key-...' : provider === 'sumopod' ? 'sumopod-key-...' : provider === 'puter' ? 'Puter.js tidak memerlukan API key' : provider === 'ollama' ? 'http://localhost:11434' : 'api key...'}
              disabled={provider === 'puter'}
              className={`h-10 w-full rounded-xl border border-white/10 px-3 text-[13px] text-white outline-none placeholder:text-[#666] focus:border-blue-500/40 ${provider === 'puter' ? 'cursor-not-allowed bg-[#0d0d0d] text-[#666] opacity-70' : 'bg-[#101010]'}`}
            />
          </label>

          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f8795]">Draft Apply Mode</div>
                <div className="mt-1 text-[11px] leading-5 text-[#98a0ad]">
                  Jika aktif, draft hasil AI langsung ditulis ke workspace tanpa review manual.
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleAutoApplyDrafts(!aiAutoApplyDrafts)}
                className={`inline-flex min-w-[82px] items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  aiAutoApplyDrafts
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-100'
                    : 'border-white/10 bg-white/5 text-[#c9ced8]'
                }`}
              >
                {aiAutoApplyDrafts ? 'Auto Apply On' : 'Manual Review'}
              </button>
            </div>
            <div className="mt-2 text-[10px] leading-5 text-[#7f8795]">
              Untuk flow agentic yang lebih mulus, gunakan `Auto Apply On`. Review manual lebih cocok saat kamu sedang mengaudit parser atau struktur file.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => void onRefreshModels()} disabled={isFetchingModels} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-40">
              <RotateCcw size={13} />
              {isFetchingModels ? 'Refreshing...' : 'Refresh Models'}
            </button>
            <button onClick={onResetProvider} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-white/10">
              <RotateCcw size={13} />
              Reset Provider
            </button>
            {provider === 'puter' ? (
              <button onClick={() => void onSignInPuter?.()} disabled={testingStatus === 'loading'} className="inline-flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold text-sky-100 transition-colors hover:bg-sky-500/15 disabled:opacity-40">
                <Play size={13} />
                Sign In Puter
              </button>
            ) : null}
            <button onClick={() => void onTestConnection()} disabled={testingStatus === 'loading' || (provider !== 'puter' && provider !== 'ollama' && !activeAiCredential.trim())} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40">
              <Play size={13} />
              {testingStatus === 'loading' ? 'Testing...' : 'Deep Test'}
            </button>
            <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${testingStatus === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : testingStatus === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : testingStatus === 'loading' ? 'border-amber-500/30 bg-amber-500/10 text-amber-200' : 'border-white/10 bg-white/5 text-[#a8a8a8]'}`}>
              {testingStatus || 'idle'}
            </div>
          </div>

          <div className="rounded-xl border border-white/8 bg-[#0d0d0d] px-3 py-2 text-[11px] leading-5 text-[#98a0ad]">
            Pengaturan ini berlaku global. Deep test sekarang mencoba generate nyata kecil dan memvalidasi token respons, jadi status <code>success</code> lebih dekat ke kondisi API key dan model yang benar-benar bisa dipakai.
            {provider === 'puter' ? <div className="mt-2 text-sky-200">Puter.js di desktop lebih stabil jika login dipicu dulu lewat tombol <code>Sign In Puter</code>, baru lanjut deep test atau generate.</div> : null}
            {activeTestMeta?.checkedAt ? <div className="mt-2 text-[#7f8795]">Tes terakhir: {new Date(activeTestMeta.checkedAt).toLocaleTimeString()} • model {activeTestMeta.model || '-'}</div> : null}
            {testingStatus === 'error' && testError ? <div className="mt-2 text-red-300">{testError}</div> : null}
            {testingStatus === 'loading' ? <div className="mt-2 text-amber-300">Sedang menjalankan deep test generate kecil. Timeout otomatis 9 detik.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
