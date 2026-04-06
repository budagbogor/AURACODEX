import { useAppStore } from '../store/useAppStore';
import { getGeminiAI } from '../services/geminiService';
import { fetchOpenRouterModels, generateOpenRouterContent } from '../services/openRouterService';
import { fetchBytezModels, generateBytezContent } from '../services/bytezService';
import { generateSumopodContent } from '../services/sumopodService';
import { ensurePuterSignedIn, fetchPuterModels, generatePuterContent, isPuterSignedIn, preparePuterClient, signInPuterInteractive } from '../services/puterService';

export const useAiManager = (appendTerminalOutput: (data: string | string[]) => void) => {
  const store = useAppStore();
  const MODEL_REFRESH_TIMEOUT_MS = 8000;
  const CONNECTION_TEST_TIMEOUT_MS = 9000;

  const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error(message)), timeoutMs);
      })
    ]);
  };

  const createTimeoutSignal = (timeoutMs: number) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);

    return {
      signal: controller.signal,
      dispose: () => window.clearTimeout(timer)
    };
  };

  const providerLabel = (provider: string) => provider === 'openrouter'
    ? 'OpenRouter'
    : provider === 'bytez'
      ? 'Bytez'
      : provider === 'sumopod'
        ? 'SumoPod'
        : provider === 'puter'
          ? 'Puter.js'
          : provider === 'ollama'
            ? 'Ollama'
            : provider === 'gemini'
              ? 'Gemini'
              : provider;

  const CONNECTION_TEST_PROBE = 'Balas tepat dengan token ini tanpa kata tambahan: AURA_OK';

  const validateDeepTestResponse = (provider: string, content: unknown) => {
    const text = typeof content === 'string' ? content.trim() : String(content ?? '').trim();
    if (!text) {
      throw new Error(`Provider ${providerLabel(provider)} merespons kosong saat deep test.`);
    }

    if (!/AURA_OK/i.test(text)) {
      throw new Error(`Provider ${providerLabel(provider)} merespons, tetapi hasil deep test tidak sesuai token validasi.`);
    }

    return text;
  };

  const normalizeAiError = (error: any) => {
    if (error?.name === 'AbortError') {
      return 'Permintaan timeout. Cek koneksi internet atau coba lagi.';
    }

    const rawMessage = error?.message || String(error || 'Unknown AI error');
    if (/timeout/i.test(rawMessage)) {
      return rawMessage;
    }
    if (/401|403|unauthorized|invalid api key|invalid key|forbidden/i.test(rawMessage)) {
      return 'API key tidak valid atau tidak punya akses ke model ini.';
    }
    if (/429|rate limit|quota/i.test(rawMessage)) {
      return 'Limit atau kuota provider sedang habis. Coba model lain atau ulangi beberapa saat lagi.';
    }
    if (/network|failed to fetch|load puter/i.test(rawMessage)) {
      return 'Gagal terhubung ke provider. Periksa internet, firewall, atau endpoint provider.';
    }

    return rawMessage;
  };

  const getActiveModel = () => {
    if (store.aiProvider === 'openrouter') return store.openRouterModel;
    if (store.aiProvider === 'bytez') return store.bytezModel;
    if (store.aiProvider === 'sumopod') return store.sumopodModel;
    if (store.aiProvider === 'puter') return store.puterModel;
    if (store.aiProvider === 'ollama') return store.selectedModel;
    return store.selectedModel;
  };

  const refreshModels = async () => {
    store.setIsFetchingModels(true);
    try {
      appendTerminalOutput(`[AI] Memuat katalog model ${providerLabel(store.aiProvider)}...`);
      if (store.aiProvider === 'openrouter') {
        const models = await withTimeout(fetchOpenRouterModels(), MODEL_REFRESH_TIMEOUT_MS, 'Refresh model OpenRouter timeout. Coba lagi.');
        if (models.length > 0) store.setDynamicFreeModels(models);
      } else if (store.aiProvider === 'bytez') {
        const models = await withTimeout(fetchBytezModels(store.bytezApiKey), MODEL_REFRESH_TIMEOUT_MS, 'Refresh model Bytez timeout. Coba lagi.');
        if (models.length > 0) store.setDynamicBytezModels(models);
      } else if (store.aiProvider === 'puter') {
        const models = await withTimeout(fetchPuterModels(), MODEL_REFRESH_TIMEOUT_MS, 'Refresh model Puter.js timeout. Coba lagi.');
        if (models.length > 0) store.setDynamicPuterModels(models);
      }
      appendTerminalOutput(`[AI] Katalog model ${providerLabel(store.aiProvider)} berhasil diperbarui.`);
    } catch (err: any) {
      const message = normalizeAiError(err);
      console.error("Failed to fetch models:", err);
      appendTerminalOutput(`[AI ERROR] Gagal memuat katalog ${providerLabel(store.aiProvider)}: ${message}`);
    } finally {
      store.setIsFetchingModels(false);
    }
  };

  const preparePuter = async () => {
    try {
      await preparePuterClient();
    } catch (err) {
      console.error('Failed to prepare Puter.js:', err);
    }
  };

  const signInPuter = async () => {
    store.setTestingStatus((prev: any) => ({ ...prev, puter: 'loading' }));
    store.setTestError((prev: any) => ({ ...prev, puter: '' }));
    appendTerminalOutput('[AI] Membuka login Puter.js...');
    try {
      await withTimeout(signInPuterInteractive(), CONNECTION_TEST_TIMEOUT_MS, 'Login Puter.js timeout. Coba lagi.');
      const signedIn = await isPuterSignedIn();
      if (!signedIn) {
        throw new Error('Login Puter.js belum aktif setelah popup ditutup.');
      }
      store.setTestingStatus((prev: any) => ({ ...prev, puter: 'success' }));
      store.setTestMeta((prev: any) => ({
        ...prev,
        puter: {
          checkedAt: Date.now(),
          model: store.puterModel,
          success: true
        }
      }));
      appendTerminalOutput('[AI] Puter.js sign-in berhasil.');
    } catch (err: any) {
      const message = normalizeAiError(err);
      store.setTestingStatus((prev: any) => ({ ...prev, puter: 'error' }));
      store.setTestError((prev: any) => ({ ...prev, puter: message }));
      store.setTestMeta((prev: any) => ({
        ...prev,
        puter: {
          checkedAt: Date.now(),
          model: store.puterModel,
          success: false
        }
      }));
      appendTerminalOutput(`[AI ERROR] Puter.js sign-in gagal. ${message}`);
    }
  };

  const testAiConnection = async (provider: any) => {
    const activeModel = provider === 'openrouter'
      ? store.openRouterModel
      : provider === 'bytez'
        ? store.bytezModel
        : provider === 'sumopod'
          ? store.sumopodModel
          : provider === 'puter'
            ? store.puterModel
            : store.selectedModel;

    if (provider !== 'puter' && provider !== 'ollama') {
      const credential = provider === 'gemini'
        ? store.geminiApiKey
        : provider === 'openrouter'
          ? store.openRouterApiKey
          : provider === 'bytez'
            ? store.bytezApiKey
            : store.sumopodApiKey;

      if (!credential?.trim()) {
        const message = 'API key belum diisi.';
        store.setTestingStatus((prev: any) => ({ ...prev, [provider]: 'error' }));
        store.setTestError((prev: any) => ({ ...prev, [provider]: message }));
        appendTerminalOutput(`[AI ERROR] ${providerLabel(provider)}: ${message}`);
        return;
      }
    }

    store.setTestingStatus((prev: any) => ({ ...prev, [provider]: 'loading' }));
    store.setTestError((prev: any) => ({ ...prev, [provider]: '' }));
    appendTerminalOutput(`[AI] Menjalankan deep test ${providerLabel(provider)} dengan model ${activeModel}...`);
    try {
      if (provider === 'gemini') {
        const ai = getGeminiAI(store.geminiApiKey);
        const response = await withTimeout(ai.models.generateContent({
          model: store.selectedModel,
          contents: [{ role: 'user', parts: [{ text: CONNECTION_TEST_PROBE }] }]
        }), CONNECTION_TEST_TIMEOUT_MS, 'Deep test Gemini timeout. Coba lagi.');
        validateDeepTestResponse(provider, response.text);
      } else if (provider === 'openrouter') {
        const response = await withTimeout(
          generateOpenRouterContent(store.openRouterModel, CONNECTION_TEST_PROBE, store.openRouterApiKey, [], []),
          CONNECTION_TEST_TIMEOUT_MS,
          'Deep test OpenRouter timeout. Coba lagi.'
        );
        validateDeepTestResponse(provider, response);
      } else if (provider === 'bytez') {
        const response = await withTimeout(
          generateBytezContent(
            store.bytezModel,
            CONNECTION_TEST_PROBE,
            store.bytezApiKey,
            store.geminiApiKey,
            [],
            []
          ),
          CONNECTION_TEST_TIMEOUT_MS,
          'Deep test Bytez timeout. Coba lagi.'
        );
        validateDeepTestResponse(provider, response);
      } else if (provider === 'sumopod') {
        const response = await withTimeout(
          generateSumopodContent(
            store.sumopodApiKey,
            store.sumopodModel,
            [{ role: 'user', content: CONNECTION_TEST_PROBE }],
            { temperature: 0, max_tokens: 16 }
          ),
          CONNECTION_TEST_TIMEOUT_MS,
          'Deep test SumoPod timeout. Coba lagi.'
        );
        validateDeepTestResponse(provider, response);
      } else if (provider === 'puter') {
        await ensurePuterSignedIn(false);
        const response = await withTimeout(
          generatePuterContent(store.puterModel, [{ role: 'user', content: CONNECTION_TEST_PROBE }], true),
          CONNECTION_TEST_TIMEOUT_MS,
          'Deep test Puter.js timeout. Coba lagi.'
        );
        validateDeepTestResponse(provider, response);
      } else if (provider === 'ollama') {
        const { signal, dispose } = createTimeoutSignal(CONNECTION_TEST_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(`${store.ollamaUrl}/api/generate`, {
            method: 'POST',
            signal,
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: activeModel,
              prompt: CONNECTION_TEST_PROBE,
              stream: false
            })
          });
        } finally {
          dispose();
        }
        if (!res.ok) throw new Error('Gagal terhubung ke Ollama');
        const data = await res.json();
        validateDeepTestResponse(provider, data?.response);
      }
      store.setTestingStatus((prev: any) => ({ ...prev, [provider]: 'success' }));
      store.setTestMeta((prev: any) => ({
        ...prev,
        [provider]: {
          checkedAt: Date.now(),
          model: activeModel,
          success: true
        }
      }));
      appendTerminalOutput(`[AI] ${providerLabel(provider)} lolos deep test. Model aktif: ${activeModel}`);
    } catch (err: any) {
      const message = normalizeAiError(err);
      store.setTestingStatus((prev: any) => ({ ...prev, [provider]: 'error' }));
      store.setTestError((prev: any) => ({ ...prev, [provider]: message }));
      store.setTestMeta((prev: any) => ({
        ...prev,
        [provider]: {
          checkedAt: Date.now(),
          model: activeModel,
          success: false
        }
      }));
      appendTerminalOutput(`[AI ERROR] ${providerLabel(provider)} gagal. ${message}`);
    }
  };

  const applyStagingCode = (path: string, newContent: string, action: 'create_or_modify' | 'delete') => {
    store.setStagingFiles(prev => {
      const filtered = prev.filter(s => s.path !== path);
      const existingFile = store.files.find(f => f.id === path);
      const original = existingFile?.content || '';
      return [...filtered, {
        path,
        originalContent: original,
        existedBefore: Boolean(existingFile),
        newContent: action === 'delete' ? '' : newContent,
        action,
        status: 'pending'
      }];
    });
  };

  return {
    ...store,
    activeModel: getActiveModel(),
    refreshModels,
    preparePuter,
    signInPuter,
    testAiConnection,
    applyStagingCode,
    mcpTools: store.mcpServers.flatMap((server: any) =>
      (server.tools || []).map((tool: any) => ({
        ...tool,
        clientName: server.name
      }))
    )
  };
};
