import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import {
  FileItem, ChatMessage, TerminalSession, CodeProblem, StagingFile,
  SidebarTab, BottomTab, LayoutMode, AiProvider, VisualReviewProvider
} from '../types';

interface AppState {
  projectName: string;
  nativeProjectPath: string | null;
  files: FileItem[];
  activeFileId: string;
  setProjectName: (name: string) => void;
  setNativeProjectPath: (path: string | null) => void;
  setFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  setActiveFileId: (id: string) => void;

  problems: CodeProblem[];
  isScanning: boolean;
  editorFontSize: number;
  stagingFiles: StagingFile[];
  autoFixTrigger: number;
  autoFixMsg: string;
  setProblems: (problems: CodeProblem[]) => void;
  setIsScanning: (scanning: boolean) => void;
  setEditorFontSize: (size: number) => void;
  setStagingFiles: (files: StagingFile[] | ((prev: StagingFile[]) => StagingFile[])) => void;
  setAutoFixTrigger: (trigger: number | ((prev: number) => number)) => void;
  setAutoFixMsg: (msg: string) => void;

  layoutMode: LayoutMode;
  zenMode: boolean;
  showSidebar: boolean;
  showBottomPanel: boolean;
  showAiPanel: boolean;
  sidebarTab: SidebarTab;
  bottomTab: BottomTab;
  sidebarWidth: number;
  bottomHeight: number;
  aiPanelWidth: number;
  setLayoutMode: (mode: LayoutMode) => void;
  setZenMode: (zen: boolean) => void;
  setShowSidebar: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowBottomPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowAiPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setBottomTab: (tab: BottomTab) => void;
  setSidebarWidth: (width: number) => void;
  setBottomHeight: (height: number) => void;
  setAiPanelWidth: (width: number) => void;

  aiProvider: AiProvider;
  visualReviewProvider: VisualReviewProvider;
  selectedModel: string;
  isAiLoading: boolean;
  systemInstruction: string;
  aiRules: string;
  aiTemperature: number;
  aiAutoApplyDrafts: boolean;
  chatMessages: ChatMessage[];
  composerMessages: any[];
  chatInput: string;
  attachedFiles: any[];
  selectedSkill: string;
  activeAgentId: string;
  aiTaskPreset: string;
  context7Mode: boolean;
  geminiApiKey: string;
  openRouterApiKey: string;
  bytezApiKey: string;
  sumopodApiKey: string;
  puterApiKey: string;
  sumopodCatalogUrl: string;
  sumopodSessionCookie: string;
  sumopodSessionAuthorization: string;
  ollamaUrl: string;
  openRouterModel: string;
  bytezModel: string;
  sumopodModel: string;
  puterModel: string;
  dynamicFreeModels: any[];
  dynamicBytezModels: any[];
  dynamicPuterModels: any[];
  dynamicSumopodModels: any[];
  isFetchingModels: boolean;
  testingStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  testError: Record<string, string>;
  testMeta: Record<string, { checkedAt?: number; model?: string; success?: boolean }>;
  setAiProvider: (provider: AiProvider) => void;
  setVisualReviewProvider: (provider: VisualReviewProvider) => void;
  setSelectedModel: (model: string) => void;
  setIsAiLoading: (loading: boolean) => void;
  setSystemInstruction: (instr: string) => void;
  setAiRules: (rules: string) => void;
  setAiTemperature: (temp: number) => void;
  setAiAutoApplyDrafts: (enabled: boolean) => void;
  setChatMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setComposerMessages: (msgs: any[] | ((prev: any[]) => any[])) => void;
  setChatInput: (input: string) => void;
  setAttachedFiles: (files: any[] | ((prev: any[]) => any[])) => void;
  setSelectedSkill: (skill: string) => void;
  setActiveAgentId: (id: string) => void;
  setAiTaskPreset: (preset: string) => void;
  setContext7Mode: (mode: boolean) => void;
  setGeminiApiKey: (key: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setBytezApiKey: (key: string) => void;
  setSumopodApiKey: (key: string) => void;
  setPuterApiKey: (key: string) => void;
  setSumopodCatalogUrl: (url: string) => void;
  setSumopodSessionCookie: (value: string) => void;
  setSumopodSessionAuthorization: (value: string) => void;
  setOllamaUrl: (url: string) => void;
  setOpenRouterModel: (model: string) => void;
  setBytezModel: (model: string) => void;
  setSumopodModel: (model: string) => void;
  setPuterModel: (model: string) => void;
  setDynamicFreeModels: (models: any[]) => void;
  setDynamicBytezModels: (models: any[]) => void;
  setDynamicPuterModels: (models: any[]) => void;
  setDynamicSumopodModels: (models: any[]) => void;
  setIsFetchingModels: (fetching: boolean) => void;
  setTestingStatus: (status: any | ((prev: any) => any)) => void;
  setTestError: (error: any | ((prev: any) => any)) => void;
  setTestMeta: (meta: any | ((prev: any) => any)) => void;

  terminalSessions: TerminalSession[];
  activeTerminalId: string;
  setTerminalSessions: (sessions: TerminalSession[] | ((prev: TerminalSession[]) => TerminalSession[])) => void;
  setActiveTerminalId: (id: string) => void;

  showCommandPalette: boolean;
  showFileSearch: boolean;
  showGuideModal: boolean;
  showCreateProjectModal: boolean;
  commandInput: string;
  fileSearchInput: string;
  setShowCommandPalette: (show: boolean) => void;
  setShowFileSearch: (show: boolean) => void;
  setShowGuideModal: (show: boolean) => void;
  setShowCreateProjectModal: (show: boolean) => void;
  setCommandInput: (val: string) => void;
  setFileSearchInput: (val: string) => void;

  mcpServers: any[];
  setMcpServers: (servers: any[] | ((prev: any[]) => any[])) => void;
}

const appStore = createStore<AppState>((set) => ({
  projectName: 'AURA-PROJECT',
  nativeProjectPath: null,
  files: [],
  activeFileId: '',
  setProjectName: (name) => set({ projectName: name }),
  setNativeProjectPath: (path) => set({ nativeProjectPath: path }),
  setFiles: (updater) => set((state) => ({
    files: typeof updater === 'function' ? updater(state.files) : updater
  })),
  setActiveFileId: (id) => set({ activeFileId: id }),

  problems: [],
  isScanning: false,
  editorFontSize: 14,
  stagingFiles: [],
  autoFixTrigger: 0,
  autoFixMsg: '',
  setProblems: (problems) => set({ problems }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setEditorFontSize: (size) => set({ editorFontSize: size }),
  setStagingFiles: (updater) => set((state) => ({
    stagingFiles: typeof updater === 'function' ? updater(state.stagingFiles) : updater
  })),
  setAutoFixTrigger: (updater) => set((state) => ({
    autoFixTrigger: typeof updater === 'function' ? updater(state.autoFixTrigger) : updater
  })),
  setAutoFixMsg: (msg) => set({ autoFixMsg: msg }),

  layoutMode: 'classic',
  zenMode: false,
  showSidebar: true,
  showBottomPanel: true,
  showAiPanel: true,
  sidebarTab: 'files',
  bottomTab: 'terminal',
  sidebarWidth: 260,
  bottomHeight: 200,
  aiPanelWidth: 460,
  setLayoutMode: (mode) => set({ layoutMode: mode }),
  setZenMode: (zen) => set({ zenMode: zen }),
  setShowSidebar: (show) => set((state) => ({
    showSidebar: typeof show === 'function' ? show(state.showSidebar) : show
  })),
  setShowBottomPanel: (show) => set((state) => ({
    showBottomPanel: typeof show === 'function' ? show(state.showBottomPanel) : show
  })),
  setShowAiPanel: (show) => set((state) => ({
    showAiPanel: typeof show === 'function' ? show(state.showAiPanel) : show
  })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setBottomTab: (tab) => set({ bottomTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setBottomHeight: (height) => set({ bottomHeight: height }),
  setAiPanelWidth: (width) => set({ aiPanelWidth: width }),

  aiProvider: (localStorage.getItem('aiProvider') as AiProvider) || 'sumopod',
  visualReviewProvider: (localStorage.getItem('aura_visual_review_provider') as VisualReviewProvider) || 'same',
  selectedModel: 'gemini-2.0-flash-exp',
  isAiLoading: false,
  systemInstruction: localStorage.getItem('aura_system_instruction') || 'You are Aura, the Lead Orchestrator of the AURA Collective.',
  aiRules: localStorage.getItem('aura_ai_rules') || '',
  aiTemperature: parseFloat(localStorage.getItem('aura_ai_temperature') || '0.7'),
  aiAutoApplyDrafts: localStorage.getItem('aura_ai_auto_apply_drafts') == null
    ? true
    : localStorage.getItem('aura_ai_auto_apply_drafts') === 'true',
  chatMessages: [],
  composerMessages: [{ role: 'assistant', content: 'Assalamualaikum' }],
  chatInput: '',
  attachedFiles: [],
  selectedSkill: 'Aura Orchestrator',
  activeAgentId: 'pm',
  aiTaskPreset: localStorage.getItem('aura_ai_task_preset') || 'fullstack',
  context7Mode: true,
  geminiApiKey: localStorage.getItem('aura_gemini_key') || '',
  openRouterApiKey: localStorage.getItem('aura_openrouter_key') || '',
  bytezApiKey: localStorage.getItem('aura_bytez_key') || '',
  sumopodApiKey: localStorage.getItem('sumopodApiKey') || '',
  puterApiKey: localStorage.getItem('aura_puter_key') || '',
  sumopodCatalogUrl: localStorage.getItem('aura_sumopod_catalog_url') || 'https://sumopod.com/dashboard/ai/models',
  sumopodSessionCookie: localStorage.getItem('aura_sumopod_session_cookie') || '',
  sumopodSessionAuthorization: localStorage.getItem('aura_sumopod_session_authorization') || '',
  ollamaUrl: localStorage.getItem('aura_ollama_url') || 'http://localhost:11434',
  openRouterModel: 'auto-free',
  bytezModel: localStorage.getItem('bytezModel') || 'default',
  sumopodModel: localStorage.getItem('sumopodModel') || 'glm-5-code',
  puterModel: localStorage.getItem('puterModel') || 'openrouter:anthropic/claude-sonnet-4.5',
  dynamicFreeModels: [],
  dynamicBytezModels: [],
  dynamicPuterModels: [],
  dynamicSumopodModels: JSON.parse(localStorage.getItem('aura_sumopod_models') || '[]'),
  isFetchingModels: false,
  testingStatus: {},
  testError: {},
  testMeta: {},
  setAiProvider: (provider) => {
    localStorage.setItem('aiProvider', provider);
    set({ aiProvider: provider });
  },
  setVisualReviewProvider: (provider) => {
    localStorage.setItem('aura_visual_review_provider', provider);
    set({ visualReviewProvider: provider });
  },
  setSelectedModel: (model) => set({ selectedModel: model }),
  setIsAiLoading: (loading) => set({ isAiLoading: loading }),
  setSystemInstruction: (instr) => {
    localStorage.setItem('aura_system_instruction', instr);
    set({ systemInstruction: instr });
  },
  setAiRules: (rules) => {
    localStorage.setItem('aura_ai_rules', rules);
    set({ aiRules: rules });
  },
  setAiTemperature: (temp) => {
    localStorage.setItem('aura_ai_temperature', temp.toString());
    set({ aiTemperature: temp });
  },
  setAiAutoApplyDrafts: (enabled) => {
    localStorage.setItem('aura_ai_auto_apply_drafts', String(enabled));
    set({ aiAutoApplyDrafts: enabled });
  },
  setChatMessages: (updater) => set((state) => ({
    chatMessages: typeof updater === 'function' ? updater(state.chatMessages) : updater
  })),
  setComposerMessages: (updater) => set((state) => ({
    composerMessages: typeof updater === 'function' ? updater(state.composerMessages) : updater
  })),
  setChatInput: (input) => set({ chatInput: input }),
  setAttachedFiles: (updater) => set((state) => ({
    attachedFiles: typeof updater === 'function' ? updater(state.attachedFiles) : updater
  })),
  setSelectedSkill: (skill) => set({ selectedSkill: skill }),
  setActiveAgentId: (id) => set({ activeAgentId: id }),
  setAiTaskPreset: (preset) => { localStorage.setItem('aura_ai_task_preset', preset); set({ aiTaskPreset: preset }); },
  setContext7Mode: (mode) => set({ context7Mode: mode }),
  setGeminiApiKey: (key) => { localStorage.setItem('aura_gemini_key', key); set({ geminiApiKey: key }); },
  setOpenRouterApiKey: (key) => { localStorage.setItem('aura_openrouter_key', key); set({ openRouterApiKey: key }); },
  setBytezApiKey: (key) => { localStorage.setItem('aura_bytez_key', key); set({ bytezApiKey: key }); },
  setSumopodApiKey: (key) => { localStorage.setItem('sumopodApiKey', key); set({ sumopodApiKey: key }); },
  setPuterApiKey: (key) => { localStorage.setItem('aura_puter_key', key); set({ puterApiKey: key }); },
  setSumopodCatalogUrl: (url) => { localStorage.setItem('aura_sumopod_catalog_url', url); set({ sumopodCatalogUrl: url }); },
  setSumopodSessionCookie: (value) => { localStorage.setItem('aura_sumopod_session_cookie', value); set({ sumopodSessionCookie: value }); },
  setSumopodSessionAuthorization: (value) => { localStorage.setItem('aura_sumopod_session_authorization', value); set({ sumopodSessionAuthorization: value }); },
  setOllamaUrl: (url) => { localStorage.setItem('aura_ollama_url', url); set({ ollamaUrl: url }); },
  setOpenRouterModel: (model) => set({ openRouterModel: model }),
  setBytezModel: (model) => { localStorage.setItem('bytezModel', model); set({ bytezModel: model }); },
  setSumopodModel: (model) => { localStorage.setItem('sumopodModel', model); set({ sumopodModel: model }); },
  setPuterModel: (model) => { localStorage.setItem('puterModel', model); set({ puterModel: model }); },
  setDynamicFreeModels: (models) => set({ dynamicFreeModels: models }),
  setDynamicBytezModels: (models) => set({ dynamicBytezModels: models }),
  setDynamicPuterModels: (models) => set({ dynamicPuterModels: models }),
  setDynamicSumopodModels: (models) => {
    localStorage.setItem('aura_sumopod_models', JSON.stringify(models));
    set({ dynamicSumopodModels: models });
  },
  setIsFetchingModels: (fetching) => set({ isFetchingModels: fetching }),
  setTestingStatus: (updater) => set((state) => ({
    testingStatus: typeof updater === 'function' ? updater(state.testingStatus) : updater
  })),
  setTestError: (updater) => set((state) => ({
    testError: typeof updater === 'function' ? updater(state.testError) : updater
  })),
  setTestMeta: (updater) => set((state) => ({
    testMeta: typeof updater === 'function' ? updater(state.testMeta) : updater
  })),

  terminalSessions: [{
    id: 'default',
    name: 'Terminal',
          output: ['Welcome to AURA AI Terminal v15.3.154'],
    cwd: undefined,
    processStatus: 'idle',
    lastExitCode: null,
    commandHistory: [],
    historyIndex: -1
  }],
  activeTerminalId: 'default',
  setTerminalSessions: (updater) => set((state) => ({
    terminalSessions: typeof updater === 'function' ? updater(state.terminalSessions) : updater
  })),
  setActiveTerminalId: (id) => set({ activeTerminalId: id }),

  showCommandPalette: false,
  showFileSearch: false,
  showGuideModal: false,
  showCreateProjectModal: false,
  commandInput: '',
  fileSearchInput: '',
  setShowCommandPalette: (show) => set({ showCommandPalette: show }),
  setShowFileSearch: (show) => set({ showFileSearch: show }),
  setShowGuideModal: (show) => set({ showGuideModal: show }),
  setShowCreateProjectModal: (show) => set({ showCreateProjectModal: show }),
  setCommandInput: (val) => set({ commandInput: val }),
  setFileSearchInput: (val) => set({ fileSearchInput: val }),

  mcpServers: [],
  setMcpServers: (updater) => set((state) => ({
    mcpServers: typeof updater === 'function' ? updater(state.mcpServers) : updater
  })),
}));

type UseAppStore = {
  (): AppState;
  <T>(selector: (state: AppState) => T): T;
  getState: typeof appStore.getState;
  setState: typeof appStore.setState;
  subscribe: typeof appStore.subscribe;
};

const useAppStoreBase = <T,>(selector?: (state: AppState) => T) => {
  const state = useSyncExternalStore(appStore.subscribe, appStore.getState, appStore.getState);
  return selector ? selector(state) : state;
};

export const useAppStore = useAppStoreBase as UseAppStore;
useAppStore.getState = appStore.getState;
useAppStore.setState = appStore.setState;
useAppStore.subscribe = appStore.subscribe;
