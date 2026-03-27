/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  FileCode, 
  Search, 
  MessageSquare, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  X, 
  Terminal, 
  Play,
  Cpu,
  Smartphone,
  Monitor,
  Sparkles,
  Send,
  User,
  Bot,
  FolderOpen,
  Save,
  Github,
  Download,
  ExternalLink,
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  Replace,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Eye,
  EyeOff,
  Layout,
  HelpCircle,
  BookOpen,
  Info,
  RefreshCw,
  FolderPlus,
  FilePlus,
  Package,
  Globe,
  Database,
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Maximize2,
  Folder,
  Keyboard,
  FolderTree,
  CloudUpload,
  CloudDownload,
  GitBranch
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { getFileIcon } from './utils/icons';
import { EditorArea } from '@/components/layout/EditorArea';
import { BottomPanel } from '@/components/layout/BottomPanel';
import { Sidebar } from '@/components/layout/Sidebar';
import { AiComposerPanel } from '@/components/AiComposer/AiComposerPanel';
import { AuraLogo } from '@/components/layout/AuraLogo';
import { GuideModal } from '@/components/features/GuideModal';
import { CreateProjectModal } from '@/components/modals/CreateProjectModal';
import { twMerge } from 'tailwind-merge';
import { 
  AI_PROVIDERS, 
  GEMINI_MODELS, 
  FREE_MODELS, 
  BYTEZ_MODELS, 
  SUMOPOD_MODELS, 
  AURA_COLLECTIVE, 
  SUPER_CLAUDE_COMMANDS, 
  MCP_TEMPLATES 
} from '@/utils/constants';
import { getGeminiAI, generateGeminiStream } from './services/geminiService';
import { generateOpenRouterContent, fetchFreeModels, type OpenRouterModel } from './services/openRouterService';
import { generateBytezContent } from './services/bytezService';
import { fetchUserRepos, cloneRepository, pushProjectToGitHub, fetchUserProfile } from './services/githubService';
import { generateSumopodContent } from './services/sumopodService';
import { mcpManager } from './services/mcpService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useGithub } from './hooks/useGithub';
import { useTerminal } from './hooks/useTerminal';
import { useAiManager } from './hooks/useAiManager';
import { useLayout } from './hooks/useLayout';
import { useEditor } from './hooks/useEditor';
import { useAiChat } from './hooks/useAiChat';

// Windows Installer / Desktop Mode Helpers - Improved for V2 compat
const getIsTauri = () => typeof window !== 'undefined' && (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);
const getIsElectron = () => typeof window !== 'undefined' && !!(window as any).electronAPI;

interface McpTemplateArg {
  key: string;
  label: string;
  placeholder: string;
  type: 'env' | 'arg';
}

interface McpTemplate {
  name: string;
  label: string;
  type: 'sse' | 'stdio';
  commandTemplate: string;
  requirements: McpTemplateArg[];
}

// MCP Templates are now imported from @/utils/constants


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FileItem {
  id: string;
  name: string;
  content: string;
  language: string;
  path?: string;
  lastModified?: number;
}

interface StagingFile {
  path: string;
  originalContent: string;
  newContent: string;
  action: 'create_or_modify' | 'delete';
  status: 'pending' | 'accepted' | 'rejected';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TerminalSession {
  id: string;
  name: string;
  output: string[];
}

interface CodeProblem {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

// McpServer interface and other types are inherited or imported as needed


// Inline GuideModal removed





export default function App() {
  const {
    layoutMode, setLayoutMode,
    zenMode, setZenMode,
    showBottomPanel, setShowBottomPanel,
    showAiPanel, setShowAiPanel,
    sidebarTab, setSidebarTab,
    bottomTab, setBottomTab,
    context7Mode, setContext7Mode,
    sidebarWidth, setSidebarWidth,
    bottomHeight, setBottomHeight,
    aiPanelWidth, setAiPanelWidth,
    isResizingSidebar, setIsResizingSidebar,
    isResizingBottom, setIsResizingBottom,
    isResizingAiPanel, setIsResizingAiPanel,
    showCommandPalette, setShowCommandPalette,
    showFileSearch, setShowFileSearch,
    showGuideModal, setShowGuideModal,
    showCreateProjectModal, setShowCreateProjectModal,
    commandInput, setCommandInput,
    fileSearchInput, setFileSearchInput,
    repoSearchInput, setRepoSearchInput,
    newMcpName, setNewMcpName,
    newMcpUrl, setNewMcpUrl,
    newMcpType, setNewMcpType,
    newMcpEnvStr, setNewMcpEnvStr,
    selectedMcpTemplateIdx, setSelectedMcpTemplateIdx,
    mcpTemplateData, setMcpTemplateData,
    showMcpLogsFor, setShowMcpLogsFor,
    activeMcpLogs, setActiveMcpLogs,
    TauriCommand, setTauriCommand,
    tauriDialog, setTauriDialog,
    tauriFs, setTauriFs
  } = useLayout();

  const {
    files, setFiles,
    activeFileId, setActiveFileId,
    activeFile,
    projectName, setProjectName,
    problems, setProblems,
    isScanning, setIsScanning,
    editorFontSize, setEditorFontSize,
    nativeProjectPath, setNativeProjectPath,
    stagingFiles, setStagingFiles,
    autoFixTrigger, setAutoFixTrigger,
    autoFixMsg, setAutoFixMsg
  } = useEditor();

  const {
    chatMessages, setChatMessages,
    composerMessages, setComposerMessages,
    chatInput, setChatInput,
    isAiLoading, setIsAiLoading,
    attachedFiles, setAttachedFiles,
    selectedSkill, setSelectedSkill,
    activeAgentId, setActiveAgentId,
    aiRules, setAiRules,
    systemInstruction, setSystemInstruction
  } = useAiChat();

  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('http://localhost:3000');

  // Synchronous CWD tracking for terminal to avoid React state batching delays
  const terminalCwdRef = useRef<string | null>(nativeProjectPath);
  useEffect(() => {
    terminalCwdRef.current = nativeProjectPath;
  }, [nativeProjectPath]);

  const [mcpServers, setMcpServers] = useState<any[]>(() => {
    const saved = localStorage.getItem('aura_mcp_servers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((p: any) => ({
          ...p,
          type: p.type || 'sse',
          tools: p.tools || []
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeProcessRef = useRef<any>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- Layout Coordination Fase 5 ---
  // Pastikan panel AI tidak muncul duplikat di kiri dan kanan
  // Logic has been moved to useLayout.ts


  // -- HOOKS --
  const {
    terminalSessions,
    setTerminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    currentSession,
    appendTerminalOutput,
    addTerminalSession,
    closeTerminalSession
  } = useTerminal();

  const {
    aiProvider, setAiProvider,
    geminiApiKey, setGeminiApiKey,
    openRouterApiKey, setOpenRouterApiKey,
    bytezApiKey, setBytezApiKey,
    sumopodApiKey, setSumopodApiKey,
    selectedModel, setSelectedModel,
    openRouterModel, setOpenRouterModel,
    bytezModel, setBytezModel,
    sumopodModel, setSumopodModel,
    dynamicFreeModels,
    setDynamicFreeModels,
    isFetchingModels,
    setIsFetchingModels,
    testAiConnection,
    testingStatus,
    setTestingStatus,
    testError,
    setTestError,
    ollamaUrl,
    setOllamaUrl
  } = useAiManager(appendTerminalOutput);

  // syncFilesFromNativePath will be defined later but we need it for useGithub
  // Since useGithub needs it as a prop, we pass it. 
  // We will move its definition above the hooks or use a ref.
  
  const {
    githubConnected,
    githubToken,
    setGithubToken,
    githubUser,
    setGithubUser,
    githubRepos,
    setGithubRepos,
    isFetchingRepos,
    setIsFetchingRepos,
    handleCloneRepo,
    testGithubConnection
  } = useGithub({
    isTauri: getIsTauri() || !!tauriDialog,
    tauriDialog,
    tauriFs,
    appendTerminalOutput,
    setNativeProjectPath,
    setFiles,
    syncFilesFromNativePath: async (path: string) => await syncFilesFromNativePath(path),
    setProjectName,
    setSidebarTab: (tab: any) => setSidebarTab(tab),
    setActiveFileId,
    setTestingStatus,
    setTestError
  });


  const handleSaveFile = async () => {
    if (!activeFile) return;
    
    if (getIsTauri() || !!tauriFs) {
      try {
        const { writeTextFile } = await import('@tauri-apps/plugin-fs');
        if (activeFile.path) {
          await writeTextFile(activeFile.path, activeFile.content);
          appendTerminalOutput(`[SYSTEM] File saved to disk: ${activeFile.path}`);
        } else {
          // Fallback if no path
          const blob = new Blob([activeFile.content], { type: 'text/plain' });
          saveAs(blob, activeFile.name);
        }
      } catch (err) {
        console.error("Desktop Save Error:", err);
      }
    } else {
      // Web Mode: Download via file-saver
      const blob = new Blob([activeFile.content], { type: 'text/plain' });
      saveAs(blob, activeFile.name);
      appendTerminalOutput(`[AURA] File downloaded: ${activeFile.name}`);
    }
  };

  const closeFolder = async () => {
    // 1. Kill active terminal process
    if (activeProcessRef.current) {
      try { await activeProcessRef.current.kill(); } catch (e) {}
      activeProcessRef.current = null;
    }

    // 2. Clear File Explorer
    setFiles([]);
    setActiveFileId('');
    setProjectName('AURA-PROJECT');
    setNativeProjectPath(null);

    // 3. Clear AI Panels (Restart Chat)
    setChatMessages([
      { role: 'assistant', content: 'Welcome to **Aura AI IDE**. I am your coding assistant. How can I help you today?' }
    ]);
    setComposerMessages([
      { role: 'assistant', content: 'Assalamualaikum...' }
    ]);
    setAttachedFiles([]);

    // 4. Reset Terminal Sessions
    setTerminalSessions([
      { id: 'default', name: 'Terminal', output: ['\u001b[36m⚡ AURA TERMINAL ENGINE V5.0.0\u001b[0m', 'Ready for intelligent development...', ''] }
    ]);
    setActiveTerminalId('default');

    // 5. Clear Problems & UI Tabs
    setProblems([]);
    setSidebarTab('files');
    setBottomTab('terminal');

    appendTerminalOutput('[SYSTEM] Project closed. All panels reset.');
  };



  const resetAllConnections = () => {
    if (!confirm("Apakah Anda yakin ingin menghapus SEMUA koneksi (API Keys, GitHub Token, Supabase)? Ini tidak dapat dibatalkan.")) return;

    // Reset States
    setGeminiApiKey('');
    setOpenRouterApiKey('');
    setBytezApiKey('');
    setSumopodApiKey('');
    setGithubToken('');
    setGithubToken('');
    setGithubUser(null);
    setTestingStatus({});
    setTestError({});

    // Reset LocalStorage
    const keysToRemove = [
      'aura_github_token', 'aura_supabase_url', 'aura_supabase_key', 
      'aura_supabase_connected', 'aura_gemini_key', 'aura_openrouter_key', 
      'aura_bytez_key', 'sumopodApiKey', 'aiProvider'
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));

    appendTerminalOutput('[SYSTEM] Seluruh koneksi dan kredensial telah dihapus.');
    alert("Seluruh koneksi telah berhasil di-reset.");
  };



  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts': return <FileCode size={14} className="text-blue-400" />;
      case 'jsx':
      case 'js': return <FileCode size={14} className="text-yellow-400" />;
      case 'css': return <FileCode size={14} className="text-blue-500" />;
      case 'html': return <FileCode size={14} className="text-orange-500" />;
      case 'json': return <FileCode size={14} className="text-yellow-600" />;
      case 'md': return <FileCode size={14} className="text-white" />;
      default: return <FileIcon size={14} className="text-gray-400" />;
    }
  };

  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, fileId: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, fileId });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // --- TERMINAL ERROR LISTENER (Self-Healing Phase 8) ---
  useEffect(() => {
    const handleTerminalError = (e: any) => {
      const { message } = e.detail;
      appendTerminalOutput(`[AURA SELF-HEALING] 🛡️ Mendeteksi kegagalan eksekusi: ${message}`);
      appendTerminalOutput(`[AURA SELF-HEALING] 🤖 Meminta intervensi AI untuk perbaikan otomatis...`);
      
      const fixPrompt = `Terminal error detected: "${message}". Please analyze the current project state and fix the root cause of this error.`;
      
      // Trigger AI Composer auto-fix
      setAutoFixMsg(fixPrompt);
      setAutoFixTrigger(Date.now());
      
      // Switch to AI tab to show progress
      setShowAiPanel(true);
    };

    window.addEventListener('terminal-error' as any, handleTerminalError);
    return () => window.removeEventListener('terminal-error' as any, handleTerminalError);
  }, [appendTerminalOutput, setAutoFixMsg, setAutoFixTrigger, setShowAiPanel]);

  // --- RESTORE TAURI INITIALIZATION (v2.6.6-PRO) ---
  useEffect(() => {
    // Definisi helper deteksi runtime yang sangat ketat
    const runtimeIsTauri = typeof window !== 'undefined' && 
                          !!(window as any).__TAURI_INTERNALS__;

    if (runtimeIsTauri) {
      const initTauri = async () => {
        // Tunggu hingga environment benar-benar siap
        await new Promise(resolve => setTimeout(resolve, 500));
        
        try {
          try {
            const { Command } = await import('@tauri-apps/plugin-shell');
            if (Command) setTauriCommand(() => Command);
          } catch (e) { console.warn('Skip Shell:', e); }

          try {
            const dialog = await import('@tauri-apps/plugin-dialog');
            if (dialog) setTauriDialog(() => dialog);
          } catch (e) { console.warn('Skip Dialog:', e); }

          try {
            const fs = await import('@tauri-apps/plugin-fs');
            if (fs) setTauriFs(() => fs);
          } catch (e) { console.warn('Skip FS:', e); }

          appendTerminalOutput('[SYSTEM] Tauri Desktop Engine Initialized.');
          console.log('[DEBUG] Tauri 2.6.6-PRO Initialized via Static Bundled Imports.');
        } catch (err: any) {
          console.error('General Tauri Load Error:', err);
        }
      };
      initTauri();
    }
  }, [setTauriCommand, setTauriDialog, setTauriFs]);




  useEffect(() => {
    localStorage.setItem('aura_mcp_servers', JSON.stringify(mcpServers));
  }, [mcpServers]);

  const refreshModels = async () => {
    setIsFetchingModels(true);
    try {
      const models = await fetchFreeModels();
      // Keep "Smart Auto-Select" at the top
      setDynamicFreeModels([FREE_MODELS[0], ...models.filter(m => m.id !== 'auto-free')]);
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setIsFetchingModels(false);
    }
  };

  const relayout = (preset: 'default' | 'zen') => {
    if (preset === 'default') {
      setLayoutMode('classic');
      setZenMode(false);
      setShowAiPanel(true);
      setShowBottomPanel(true);
      setSidebarTab('files');
    } else if (preset === 'zen') {
      setZenMode(true);
      setShowAiPanel(false);
      setShowBottomPanel(false);
    }
    const displayPreset = preset === 'default' ? 'DEFAULT LOOK' : 'ZEN ONLY';
    appendTerminalOutput(`[SYSTEM] Layout switched to ${displayPreset} mode.`);
  };

  const scanForProblems = async () => {
    if (isScanning || !activeFile) return;
    setIsScanning(true);
    setBottomTab('problems');
    setProblems([]);
    
    // Simulate local scanning first for speed
    const localProblems: CodeProblem[] = [];
    const lines = activeFile.content.split('\n');
    
    lines.forEach((line, index) => {
      // Simple regex checks
      if (line.includes('console.log')) {
        localProblems.push({ line: index + 1, severity: 'info', message: '💡 [TIP] Gunakan logger kustom daripada console.log di production.' });
      }
      if (line.includes('any') && activeFile.language === 'typescript') {
        localProblems.push({ line: index + 1, severity: 'warning', message: '⚠️ [TS] Hindari tipe "any". Gunakan interface atau tipe yang lebih spesifik.' });
      }
      if (line.match(/var\s+/)) {
        localProblems.push({ line: index + 1, severity: 'warning', message: '⚠️ [JS] Gunakan "let" atau "const" alih-alih "var".' });
      }
      if (line.match(/==\s+/) && !line.includes('===')) {
        localProblems.push({ line: index + 1, severity: 'warning', message: '⚠️ [JS] Gunakan strict equality (===) untuk perbandingan yang lebih aman.' });
      }
      // Security & Best Practices
      if (line.includes('eval(')) {
        localProblems.push({ line: index + 1, severity: 'error', message: '🚫 [SECURITY] Bahaya penggunaan eval()! Ini dapat memicu XSS.' });
      }
      if (line.includes('innerHTML')) {
        localProblems.push({ line: index + 1, severity: 'warning', message: '⚠️ [SECURITY] Hati-hati dengan innerHTML. Gunakan textContent jika memungkinkan.' });
      }
      if (line.includes('TODO:') || line.includes('FIXME:')) {
        localProblems.push({ line: index + 1, severity: 'info', message: '📝 [MAINTAIN] Ditemukan catatan tugas (TODO/FIXME) di baris ini.' });
      }
    });

    setProblems(localProblems);

    // Then use AI for deeper analysis if requested or as a second pass
    try {
      const currentSkill = AURA_COLLECTIVE.find(s => s.name === selectedSkill);
      const skillInstruction = currentSkill ? currentSkill.instruction : '';
      
      const prompt = `System Instruction: ${systemInstruction}
      ${skillInstruction ? `\nSkill Focus: ${skillInstruction}` : ''}
      ${aiRules ? `\nUser Rules: ${aiRules}` : ''}
      
      Analyze the following code for potential errors, bugs, or improvements. 
      Return the results ONLY as a JSON array of objects with this structure: 
      [{"line": number, "severity": "error" | "warning" | "info", "message": "string"}]
      
      Code to analyze (${activeFile.name}):
      ${activeFile.content}`;

      let resultText = '';
      if (aiProvider === 'gemini') {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
        const ai = getGeminiAI(apiKey);
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        });
        resultText = response.text || '[]';
      } else if (aiProvider === 'bytez') {
        const googleKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
        resultText = await generateBytezContent(bytezModel, prompt, bytezApiKey, googleKey);
      } else {
        const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
        resultText = await generateOpenRouterContent(openRouterModel, prompt, apiKey);
      }

      // Sanitize AI response: remove markdown code blocks and excess text
      let cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        try {
          const aiProblems = JSON.parse(jsonMatch[0]);
          if (Array.isArray(aiProblems)) {
            setProblems(prev => [...prev, ...aiProblems]);
            appendTerminalOutput(`✅ Scan tuntas: Ditemukan ${localProblems.length} isu lokal & ${aiProblems.length} isu AI.`);
          }
        } catch (parseErr) {
          console.error('[SCAN] JSON Parse Error:', parseErr);
          appendTerminalOutput(`⚠️ Gagal memproses paket data AI (JSON Error).`);
        }
      } else {
        appendTerminalOutput(`✅ Scan tuntas: ${localProblems.length} isu lokal ditemukan. AI tidak mendeteksi isu tambahan.`);
      }
    } catch (error) {
      console.error('AI Scan Error:', error);
      appendTerminalOutput(`AI Scan failed, showing local results only.`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: value } : f));
    }
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && attachedFiles.length === 0) || isAiLoading) return;

    // --- SMART PERSONA ORCHESTRATOR (v8.0.0-Elite) ---
    const lowerInput = chatInput.toLowerCase();
    let detectedAgent = AURA_COLLECTIVE.find(a => a.id === 'pm'); // Default Orchestrator
    
    if (lowerInput.match(/ui|design|style|css|color|aesthetic|glassmorphism|bento|palette/)) {
      detectedAgent = AURA_COLLECTIVE.find(a => a.id === 'uiux');
    } else if (lowerInput.match(/error|debug|bug|crash|fix|troubleshoot|rca|failed/)) {
      detectedAgent = AURA_COLLECTIVE.find(a => a.id === 'debugger');
    } else if (lowerInput.match(/architect|structure|solid|pattern|scalability|design pattern/)) {
      detectedAgent = AURA_COLLECTIVE.find(a => a.id === 'architect');
    } else if (lowerInput.match(/security|vulnerability|auth|encrypt|audit|leak/)) {
      detectedAgent = AURA_COLLECTIVE.find(a => a.id === 'security');
    }

    if (detectedAgent && detectedAgent.name !== selectedSkill) {
      setSelectedSkill(detectedAgent.name);
      setActiveAgentId(detectedAgent.id);
      appendTerminalOutput(`[AURA SWARM] Switching to ${detectedAgent.name} for this task...`);
    }

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      let content = '';
      const currentSkill = AURA_COLLECTIVE.find(s => s.name === (detectedAgent?.name || selectedSkill));
      const skillInstruction = currentSkill ? currentSkill.instruction : '';
      
      // Check for commands in input
      let activeCommandInstruction = '';
      const command = SUPER_CLAUDE_COMMANDS.find(c => chatInput.trim().startsWith(c.command));
      if (command) {
        activeCommandInstruction = `\nActive Command: ${command.instruction}`;
      }

      // Context7 (Deep Context & MCP Docs)
      let deepContext = '';
      if (context7Mode) {
        // Collect all open files with their contents
        const allFilesContext = files.map(f => {
          return `--- File: ${f.name} (${f.language}) ---\n${f.content || '(empty)'}\n`;
        }).join('\n');

        const context7Active = mcpServers.find(s => s.name === 'context7' && s.connected);

        deepContext = `
[DEEP CONTEXT - CONTEXT7 MODE ACTIVE]
1. Workspace Context: You are analyzing a full workspace. All opened files are provided below.
2. Documentation Engine: ${context7Active ? 'CONNECTED' : 'STANDBY'}. 
   IMPORTANT: You have access to the Context7 MCP Server for real-time documentation (>2000 libraries). 
   To prevent hallucinations or using outdated syntax, ALWAYS use the available MCP tools to fetch the latest documentation for any libraries, frameworks, or APIs being discussed (e.g., Next.js, React, Tailwind v4, etc.).

Workspace Files:
${allFilesContext}

Active File: ${activeFile?.name || 'None'}
Integrations:
- GitHub: ${githubConnected ? 'Connected' : 'Disconnected'}
- ACTIVE MCP Servers: ${mcpServers.filter(s => s.connected).map(s => s.name).join(', ') || 'None'}
`;
      }

      let prompt = `System Instruction: ${systemInstruction}
            ${skillInstruction ? `\nSkill Focus: ${skillInstruction}` : ''}
            ${aiRules ? `\nUser Rules: ${aiRules}` : ''}
            ${activeCommandInstruction}
            ${deepContext}
            
            Current File: ${activeFile?.name || 'None'} (${activeFile?.language || 'None'})
            Content:
            ${activeFile?.content || 'No file open.'}
            
            User Request:
            ${userMsg.content}`;

      // Append text file contents to prompt
      attachedFiles.forEach(file => {
        if (!file.type.startsWith('image/')) {
          prompt += `\n\n--- Attached File: ${file.name} ---\n${file.content || 'No content'}`;
        }
      });

      if (aiProvider === 'gemini') {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
        
        // Initial empty assistant message
        const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
        setChatMessages(prev => [...prev, assistantMsg]);
        
        let fullResponse = '';
        try {
          const stream = generateGeminiStream(apiKey, selectedModel, prompt, attachedFiles, chatMessages);
          let lastUpdateTime = Date.now();
          
          for await (const chunk of stream) {
            fullResponse += chunk;
            const now = Date.now();
            if (now - lastUpdateTime > 50) {
              setChatMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: fullResponse };
                return newMsgs;
              });
              lastUpdateTime = now;
            }
          }
          
          // Final update to guarantee the last chunk is rendered
          setChatMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: fullResponse };
            return newMsgs;
          });
        } catch (streamErr: any) {
          console.error('Stream Error:', streamErr);
          setChatMessages(prev => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], content: `Error: ${streamErr.message}` };
            return newMsgs;
          });
        }
      } else if (aiProvider === 'bytez') {
        const googleKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
        content = await generateBytezContent(bytezModel, prompt, bytezApiKey, googleKey, attachedFiles, chatMessages);
        setChatMessages(prev => [...prev, { role: 'assistant', content: content }]);
      } else if (aiProvider === 'sumopod') {
        if (!sumopodApiKey) throw new Error('SumoPod API Key is required. Please set it in Settings.');
        content = await generateSumopodContent(sumopodApiKey, sumopodModel, [
          { role: 'system', content: `${systemInstruction}\nRules:\n${aiRules}\n${activeCommandInstruction}` },
          ...chatMessages.map(m => ({ role: m.role as any, content: m.content })),
          { role: 'user', content: prompt }
        ]);
        setChatMessages(prev => [...prev, { role: 'assistant', content: content }]);
      } else {
        const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
        if (!apiKey) throw new Error('OpenRouter API Key is missing. Please set it in Settings.');
        content = await generateOpenRouterContent(openRouterModel, prompt, apiKey, attachedFiles, chatMessages);
        setChatMessages(prev => [...prev, { role: 'assistant', content: content }]);
      }

      setAttachedFiles([]); // Clear attachments after sending
    } catch (error: any) {
      console.error('AI Error:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message || 'Failed to connect to AI service.'}` }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as string;
        if (file.type.startsWith('image/')) {
          setAttachedFiles(prev => [...prev, { name: file.name, type: file.type, data }]);
        } else {
          // For text files, read as text too
          const textReader = new FileReader();
          textReader.onload = (textEvent) => {
            const content = textEvent.target?.result as string;
            setAttachedFiles(prev => [...prev, { name: file.name, type: file.type, data, content }]);
          };
          textReader.readAsText(file);
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createNewFile = () => {
    const newFile: FileItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: `new-file-${files.length + 1}.ts`,
      content: '',
      language: 'typescript'
    };
    setFiles([...files, newFile]);
    setActiveFileId(newFile.id);
  };

  const openFolder = async () => {
    try {
      // @ts-ignore - File System Access API
      const dirHandle = await window.showDirectoryPicker();
      const newFiles: FileItem[] = [];
      
      async function scan(handle: any) {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const content = await file.text();
            const ext = file.name.split('.').pop();
            newFiles.push({
              id: Math.random().toString(36).substr(2, 9),
              name: file.name,
              content: content,
              language: ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'js' || ext === 'jsx' ? 'javascript' : ext || 'plaintext'
            });
          }
        }
      }
      
      await scan(dirHandle);
      if (newFiles.length > 0) {
        setFiles(newFiles);
        setActiveFileId(newFiles[0].id);
        setNativeProjectPath(null); // Web handles don't have native paths
        appendTerminalOutput([
          `Opened folder: ${dirHandle.name}`, 
          `Loaded ${newFiles.length} files.`, 
          `[WARNING] Folder dibuka via Browser API. Terminal tidak mendukung perintah sistem (npm/git) dalam mode ini.`
        ]);
      }
    } catch (err) {
      console.error('Error opening folder:', err);
      appendTerminalOutput('Error: Could not open local folder. (Browser may block this in iframes)');
    }
  };

  const saveAllToDisk = async (targetPath: string) => {
    if (!tauriFs) {
      appendTerminalOutput('[ERROR] Tauri FS API tidak tersedia.');
      return;
    }
    
    appendTerminalOutput(`[SYSTEM] Menyimpan ${files.length} file ke disk: ${targetPath}...`);
    try {
      for (const file of files) {
        // Construct full path and normalize
        let fullPath = file.id.includes(':') ? file.id : `${targetPath}/${file.name}`.replace(/\/+/g, '/').replace(/\\+/g, '\\');
        
        // Ensure parent directory exists
        const pathParts = fullPath.split(/[\\/]/);
        pathParts.pop();
        let currentDir = "";
        for (const part of pathParts) {
          if (!part) continue;
          currentDir += (currentDir ? "/" : "") + part;
          if (currentDir.length <= 3 && currentDir.includes(':')) continue; // Skip Windows drive root
          try { await tauriFs.mkdir(currentDir, { recursive: true }); } catch (e) {}
        }
        
        await tauriFs.writeTextFile(fullPath, file.content);
      }
      appendTerminalOutput('[SYSTEM] ✅ Berhasil menyimpan semua file ke disk.');
    } catch (err: any) {
      console.error('Save All to Disk Error:', err);
      appendTerminalOutput(`[ERROR] Gagal menyimpan file: ${err.message}`);
    }
  };

  const syncFilesFromNativePath = async (rootPath: string) => {
    if (!tauriFs) return;
    const newFiles: FileItem[] = [];

    async function scanNative(currentPath: string) {
      const entries = await tauriFs.readDir(currentPath);
      for (const entry of entries) {
        const fullPath = `${currentPath}/${entry.name}`;
        if (entry.isDirectory) {
          await scanNative(fullPath);
        } else if (entry.isFile) {
          const content = await tauriFs.readTextFile(fullPath);
          const ext = entry.name.split('.').pop();
          newFiles.push({
            id: fullPath, // Use full path as ID for native files
            name: entry.name,
            content: content,
            language: ext === 'ts' || ext === 'tsx' ? 'typescript' : ext === 'js' || ext === 'jsx' ? 'javascript' : ext || 'plaintext'
          });
        }
      }
    }

    try {
      await scanNative(rootPath);
      if (newFiles.length > 0) {
        setFiles(newFiles);
        setActiveFileId(newFiles[0].id);
        const folderName = rootPath.split(/[\\/]/).pop() || rootPath;
        setProjectName(folderName.toUpperCase());
        appendTerminalOutput(`[NATIVE] Sync lengkap: ${newFiles.length} file dimuat dari ${rootPath}`);
      }
    } catch (err: any) {
      console.error('Scan Native Error:', err);
      appendTerminalOutput(`[ERROR] Gagal memindai folder: ${err.message}`);
    }
  };

  const openFolderNative = async () => {
    if (!tauriDialog) {
      alert("Fitur Native Dialog hanya tersedia di aplikasi Desktop (.exe).");
      return;
    }
    
    try {
      const selected = await tauriDialog.open({
        directory: true,
        multiple: false,
        title: 'Pilih Folder Project (Native)'
      });

      if (selected && typeof selected === 'string') {
        const normalizedPath = selected.replace(/\\/g, '/');
        
        // --- MEMORY-TO-DISK SYNC (v2.4.2) ---
        if (files.length > 0 && !nativeProjectPath) {
           const shouldDump = window.confirm(
             "Ditemukan pekerjaan di memori (AURA Memory).\n\n" +
             "Apakah Anda ingin menyimpan file yang sudah ada ke folder baru ini sebelum melakukan sinkronisasi?"
           );
           if (shouldDump) {
             await saveAllToDisk(normalizedPath);
           }
        }

        setNativeProjectPath(normalizedPath);
        appendTerminalOutput([`[SYSTEM] Folder Native dipilih: ${normalizedPath}`, '[SYSTEM] Menyinkronkan file...']);
        
        await syncFilesFromNativePath(normalizedPath);
        
        appendTerminalOutput('[SYSTEM] Terminal & Editor kini terhubung langsung ke Disk lokal.');
        alert("Sinkronisasi Native Berhasil! Anda sekarang bekerja langsung di file sistem PC Anda.");
      }
    } catch (err: any) {
      console.error('Native Dialog Error:', err);
      appendTerminalOutput(`[ERROR] Gagal membuka folder native: ${err.message}`);
    }
  };

  const handleCreateProjectConfirm = async (path: string, projectName: string) => {
    if (!tauriFs) {
      alert("Fitur Native FS hanya tersedia di aplikasi Desktop (.exe).");
      return;
    }
    try {
      // Normalize and construct full path
      const fullPath = `${path}/${projectName}`.replace(/\\/g, '/');
      
      // Create directory silently
      await tauriFs.mkdir(fullPath, { recursive: true });
      
      // Mount the new project folder to Explorer
      setNativeProjectPath(fullPath);
      appendTerminalOutput([`[SYSTEM] Project baru dibuat di: ${fullPath}`, '[SYSTEM] Membuka project...']);
      
      await syncFilesFromNativePath(fullPath);
      
      appendTerminalOutput('[SYSTEM] Project kini aktif. Anda bisa menggunakan AI Composer untuk mengisi struktur otomatis.');
      setShowCreateProjectModal(false);
    } catch (err: any) {
      console.error('Create Project Error:', err);
      appendTerminalOutput(`[ERROR] Gagal membuat project: ${err.message}`);
      alert(`Gagal membuat project: ${err.message}`);
    }
  };

  const handleAiSuccess = (stats: { fileCount: number; commands: string[] }) => {
    appendTerminalOutput(`[AURA MAGIC] AI selesai memodifikasi ${stats.fileCount} file.`);
    
    const packageJson = files.find(f => f.name === 'package.json');
    if (packageJson) {
      appendTerminalOutput('[AURA MAGIC] Terdeteksi package.json. Menyiapkan environment otomatis...');
      
      // Proactively run installation if many files changed or project structure is new
      if (stats.fileCount > 3 || stats.commands.some(c => c.includes('create') || c.includes('vite'))) {
        appendTerminalOutput('[AURA MAGIC] Menjalankan alur: npm install -> npm run dev');
        // We use wait logic or separate commands for better reliability on Windows
        executeCommand('npm install');
        setTimeout(() => {
           executeCommand('npm run dev');
        }, 1500);
      } else {
        // Just run dev if it's an existing project with minor changes
        executeCommand('npm run dev');
      }
    } else {
      appendTerminalOutput('[AURA MAGIC] Perubahan diterapkan. (Manual: npm install jika diperlukan)');
    }
  };

  const handleApplyCode = async (path: string, content: string, action?: 'create_or_modify' | 'delete') => {
    const isDelete = action === 'delete';
    
    // 1. Update React State
    setFiles(currentFiles => {
      if (isDelete) {
        return currentFiles.filter(f => f.id !== path && f.name !== path);
      }
      const idx = currentFiles.findIndex(f => f.id === path || f.name === path);
      if (idx !== -1) {
        const existing = currentFiles[idx];
        if (existing.content === content) return currentFiles;
        const updated = [...currentFiles];
        updated[idx] = { ...existing, content, lastModified: Date.now() };
        return updated;
      }
      return [...currentFiles, { 
        id: path, 
        name: path.split('/').pop() || path, 
        content, 
        language: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript',
        lastModified: Date.now()
      }];
    });

    // 2. Sync to Native Disk (Tauri)
    if (nativeProjectPath && tauriFs) {
      try {
        let fullPath = path;
        if (!path.startsWith(nativeProjectPath) && !path.includes(':')) {
          fullPath = `${nativeProjectPath}/${path}`.replace(/\/+/g, '/').replace(/\\+/g, '\\');
        }
        
        if (isDelete) {
          try { await tauriFs.removeFile(fullPath); } catch (e) {}
        } else {
          const pathParts = fullPath.split(/[\\/]/);
          pathParts.pop(); 
          let currentDir = "";
          for (const part of pathParts) {
            if (!part) continue;
            currentDir += (currentDir ? "/" : "") + part;
            if (currentDir.length <= 3 && currentDir.includes(':')) continue; 
            try { await tauriFs.mkdir(currentDir, { recursive: true }); } catch (e) {}
          }
          await tauriFs.writeTextFile(fullPath, content);
        }
      } catch (err) {
        console.error('[AURA FS] Sync Error:', err);
      }
    }

    if (!isDelete && activeFileId !== path) setActiveFileId(path);
  };

  const handleStageCode = (path: string, content: string, action: 'create_or_modify' | 'delete' = 'create_or_modify') => {
    setStagingFiles(prev => {
      const existingIdx = prev.findIndex(f => f.path === path);
      const originalFile = files.find(f => f.id === path || f.name === path);
      const originalContent = originalFile ? originalFile.content : "";

      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = { 
          ...updated[existingIdx], 
          newContent: content, 
          action,
          status: 'pending' 
        };
        return updated;
      }

      return [...prev, {
        path,
        originalContent,
        newContent: content,
        action,
        status: 'pending'
      }];
    });
  };

  const handleAcceptStaging = async () => {
    for (const sFile of stagingFiles) {
      if (sFile.status !== 'rejected') {
        await handleApplyCode(sFile.path, sFile.newContent, sFile.action);
      }
    }
    setStagingFiles([]);
    appendTerminalOutput(`[AI] ${stagingFiles.length} file telah diterapkan ke project.`);
  };

  const handleDiscardStaging = () => {
    setStagingFiles([]);
    appendTerminalOutput(`[AI] Perubahan dibatalkan.`);
  };

  const handleUpdateStagingStatus = (path: string, status: 'accepted' | 'rejected') => {
    setStagingFiles(prev => prev.map(f => f.path === path ? { ...f, status } : f));
  };

  const handleAutoPreview = (force: boolean = false) => {
    appendTerminalOutput('[AURA] Preview internal telah dihapus. Silakan gunakan browser sistem (Chrome/Edge/dll) untuk melihat perubahan pada localhost.');
  };

  const exportProject = async () => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.name, file.content);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'aura-project.zip');
    appendTerminalOutput('Project exported as aura-project.zip');
  };



  const handleGithubPush = async () => {
    if (!githubToken) {
      alert("GitHub Token belum dikonfigurasi. Silakan ke tab GitHub untuk menghubungkan profil Anda.");
      setSidebarTab('github');
      return;
    }
    
    // We suggest the current project name, replacing spaces with dashes for GitHub standards
    const suggestedName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const name = prompt("Sebutkan nama repositori GitHub untuk project ini:", suggestedName);
    
    if (!name) return;

    appendTerminalOutput(`[GITHUB] Memulai pengiriman (Push) ${files.length} file ke repositori '${name}'...`);
    try {
      await pushProjectToGitHub(githubToken, name, files, (msg: string) => {
        appendTerminalOutput(`[GITHUB] ${msg}`);
      });
      alert("Berhasil mem-push kode ke GitHub!");
    } catch (err: any) {
      console.error('GitHub Push Error:', err);
      appendTerminalOutput(`[GITHUB ERROR] Gagal push ke GitHub: ${err.message}`);
      alert("Gagal mem-push ke GitHub. Silakan periksa koneksi atau token Anda.");
    }
  };

  const [terminalInput, setTerminalInput] = useState('');

  const executeCommand = async (command: string) => {
    const val = command.trim();
    if (!val) return;

    setBottomTab('terminal');
    setShowBottomPanel(true);

    const sessionId = activeTerminalId;
    const appendOutput = (data: string) => {
      appendTerminalOutput(data, sessionId);
      
      // --- AUTO PREVIEW DETECTION (v11.0.12) ---
      if (data.includes('Local:   http://localhost:') || data.includes('http://localhost:3000') || data.includes('http://localhost:5173')) {
         const match = data.match(/http:\/\/localhost:\d+/);
         if (match) {
            setPreviewUrl(match[0]);
            setShowPreviewPanel(true);
         }
      }
    };

    // --- NATIVE SYNC GUARD (v2.4.2) ---
    if (!nativeProjectPath) {
      const confirmSync = window.confirm(
        "AURA TERMINAL: Eksekusi perintah (seperti npm) membutuhkan file fisik di disk.\n\n" +
        "Folder proyek belum ditentukan. Ingin memilih folder sekarang untuk sinkronisasi?"
      );
      if (confirmSync) {
        await openFolderNative();
        return;
      }
      appendOutput('[ERROR] Gagal eksekusi: Perintah terminal membutuhkan Native Mode (Sinkronisasi Disk).');
      return;
    }

    const cwdDisplay = nativeProjectPath || 'aura-project';
    appendOutput(`${cwdDisplay} $ ${val}`);

    const isWindows = window.navigator.platform.toLowerCase().includes('win');
    const trimmedVal = val.trim();
    const isNpm = trimmedVal.startsWith('npm');

    if (trimmedVal === 'npm install' || trimmedVal === 'npm i') {
       const hasPackageJson = files.some(f => f.name === 'package.json');
       if (!hasPackageJson) {
          appendOutput(`[SYSTEM] ⚠️ WARNING: 'package.json' tidak ditemukan.`);
          const defaultPackageJson = {
            name: projectName.toLowerCase().replace(/\s+/g, '-'),
            version: "1.0.0",
            private: true,
            dependencies: {},
            scripts: { "dev": "vite", "build": "vite build", "preview": "vite preview" }
          };
          handleApplyCode('package.json', JSON.stringify(defaultPackageJson, null, 2), 'create_or_modify');
          appendOutput(`[SYSTEM] ✅ 'package.json' dibuat otomatis.`);
       }
    }

    let finalCommand = val;
    let fullPath = "";
    if ((getIsTauri() || !!TauriCommand) && isWindows && (val.startsWith('npm') || val.startsWith('npx'))) {
       try {
          const binaryName = val.split(' ')[0];
          // Use full path to binary for better reliability on Windows
          const checkCmd = TauriCommand.create('cmd', ['/C', 'where', binaryName]);
          const out = await checkCmd.execute();
          if (out.code === 0 && out.stdout) {
              const lines = out.stdout.split(/\r?\n/).filter(l => l.trim());
              // PREFER .cmd or .exe on Windows to avoid sh scripts
              const preferred = lines.find(l => l.toLowerCase().endsWith('.cmd') || l.toLowerCase().endsWith('.exe')) || lines[0];
              fullPath = preferred.trim();
          } else {
              // FALLBACK: Check standard paths if 'where' fails
              const commonPaths = [
                  `C:\\Program Files\\nodejs\\${binaryName}.cmd`,
                  `C:\\Program Files\\nodejs\\${binaryName}.exe`,
                  `C:\\Users\\${window.process?.env?.USERNAME || 'User'}\\AppData\\Roaming\\npm\\${binaryName}.cmd`
              ];
              for (const p of commonPaths) {
                  try {
                      const exists = await TauriCommand.create('cmd', ['/C', 'if exist', p, 'echo YES']).execute();
                      if (exists.stdout.includes('YES')) { fullPath = p; break; }
                  } catch(e) {}
              }
          }

          if (fullPath) {
              // Don't build a single quoted string, finalCommand acts as a flag
              finalCommand = val;
              appendOutput(`[AURA INFO] Resolved ${binaryName} to: ${fullPath}`);
          }
       } catch (e) {
          console.warn('Path resolution failed:', e);
       }
    }

    if ((getIsTauri() || !!TauriCommand) && TauriCommand) {
      try {
        const cwdReference = terminalCwdRef.current || nativeProjectPath;
        const normalizedCwd = (cwdReference || '.').replace(/\//g, '\\');
        const shellExe = isWindows ? 'cmd' : 'sh';

        if (activeProcessRef.current) {
          try { await activeProcessRef.current.kill(); } catch (e) {}
          activeProcessRef.current = null;
        }

        setCommandHistory(prev => [val, ...prev.filter(h => h !== val)].slice(0, 50));
        setHistoryIndex(-1);

        if (val.trim() === 'clear' || val.trim() === 'cls') {
          setTerminalSessions(prev => prev.map(s => s.id === sessionId ? { ...s, output: [] } : s));
          return;
        }
        if (val.trim() === 'aura diagnostic') {
          appendOutput(`[DIAGNOSTIC] OS: ${isWindows ? 'Windows' : 'Unix'}`);
          appendOutput(`[DIAGNOSTIC] CWD: ${normalizedCwd}`);
          try {
             const nodeCheck = await TauriCommand.create('cmd', ['/C', 'node', '-v']).execute();
             appendOutput(`[DIAGNOSTIC] Node: ${nodeCheck.stdout.trim()}`);
             const npmCheck = await TauriCommand.create('cmd', ['/C', 'npm', '-v']).execute();
             appendOutput(`[DIAGNOSTIC] NPM: ${npmCheck.stdout.trim()}`);
          } catch(e) {}
          return;
        }
        if (val.trim() === 'pwd') { appendOutput(normalizedCwd); return; }

        if (val.trim().startsWith('cd ')) {
          const target = val.trim().substring(3).trim().replace(/"/g, '').replace(/'/g, '');
          let newPath = '';
          if (target === '..') {
            const parts = normalizedCwd.split('\\'); parts.pop();
            newPath = parts.join('\\') || 'C:\\';
          } else if (/^[a-zA-Z]:\\/.test(target)) {
            newPath = target.replace(/\//g, '\\');
          } else {
            newPath = `${normalizedCwd}\\${target}`.replace(/\//g, '\\');
          }
          newPath = newPath.replace(/\\\\/g, '\\');
          terminalCwdRef.current = newPath;
          setNativeProjectPath(newPath);
          appendOutput(`✓ Pindah ke: ${newPath}`);
          return;
        }

        appendOutput(`[SYSTEM] Menjalankan melalui ${shellExe} (Native CLI): ${val}`);
        setTerminalSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRunning: true, currentCommand: trimmedVal } : s));

        let cmdInstance;
        if (isWindows) {
          // Solusi Final: Membongkar arguments secara utuh agar Rust/Tauri tidak mengacak-acak quotes untuk cmd /c
          let binary = val.split(' ')[0];
          let args = val.split(' ').slice(1);
          if (finalCommand && fullPath) {
             binary = fullPath;
          }
          // Parsing && untuk Windows agar cmd menanggapinya sebagai operator shell asli
          const parsedArgs = args.map(a => a === '&&' || a === '&' ? a : a);
          cmdInstance = TauriCommand.create('cmd', ['/D', '/C', binary, ...parsedArgs], { cwd: normalizedCwd });
        } else {
          cmdInstance = TauriCommand.create('sh', ['-c', val], { cwd: normalizedCwd });
        }

        let stdoutBuffer = '';
        let stderrBuffer = '';
        const handleData = (data: string, isError = false) => {
          if (!data) return;
          appendOutput(data);
          if (isError) stderrBuffer += data + '\n'; else stdoutBuffer += data + '\n';
          const urlRegex = /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::\]):\d+)/i;
          const match = data.match(urlRegex);
          if (match && match[0]) {
             const detectedUrl = match[0].replace(/0\.0\.0\.0|\[::\]/, 'localhost');
             appendTerminalOutput(`[AURA BROWSER] 🚀 Server Aktif: ${detectedUrl}`);
             TauriCommand.create('cmd', ['/C', 'start', detectedUrl]).execute().catch(() => {});
          }
        };

        cmdInstance.on('stdout', data => handleData(data));
        cmdInstance.on('stderr', data => handleData(data, true));
        cmdInstance.on('close', data => {
          activeProcessRef.current = null;
          setTerminalSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isRunning: false } : s));
          if (data?.code !== 0 && data?.code !== null) {
            appendOutput(`Process exited with code ${data.code}`);
            const errLog = stderrBuffer.trim() ? stderrBuffer : stdoutBuffer;
            if (errLog) {
               const shortLog = errLog.length > 2500 ? errLog.substring(errLog.length - 2500) : errLog;
               appendOutput(`[AUTO-FIX] Mendelegasikan perbaikan ke AI...`);
               setAutoFixMsg(`Terminal command \`${val}\` gagal (${data.code}).\n\nLog:\n\`\`\`\n${shortLog}\n\`\`\``);
               setAutoFixTrigger(c => c + 1);
            }
          } else {
             if (trimmedVal.includes('npm install')) {
                setTimeout(async () => {
                   const check = await TauriCommand.create('cmd', ['/C', 'if exist node_modules (echo YES)'], { cwd: normalizedCwd }).execute();
                   if (!check.stdout.includes('YES')) {
                      appendOutput(`[SYSTEM] ⚠️ WARNING: node_modules TIDAK ditemukan.`);
                      executeCommand('npm install --no-bin-links');
                   }
                }, 1000);
             }
             appendOutput(`Process completed successfully.`);
          }
        });
        activeProcessRef.current = await cmdInstance.spawn();
      } catch (err: any) { appendOutput(`[ERROR] ${err?.message}`); }
    } else { 
      appendOutput(`[BROWSER MODE] Perintah "${val}" tidak didukung.`); 
      appendOutput(`[INFO] Gunakan aplikasi Desktop (.exe) untuk fitur terminal penuh.`);
    }
  };

  const handleTerminalKill = async () => {
    if (activeProcessRef.current) {
      try {
        await activeProcessRef.current.kill();
        appendTerminalOutput('[SYSTEM] Process terminated.');
        activeProcessRef.current = null;
      } catch (e) {}
    }
  };

  const handleTerminalCommand = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = terminalInput.trim();
      if (val) { setTerminalInput(''); await executeCommand(val); }
    } else if (e.key === 'c' && e.ctrlKey) {
      handleTerminalKill();
    }
  };

    return (
    <div className="h-[100dvh] w-full bg-[#1e1e1e] text-[#cccccc] flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 relative">

      
      {/* Top Menu Bar Professional */}
      <div className="h-8 bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 text-[12px] text-[#cccccc] gap-1 shrink-0 z-[60] relative">
        {/* File Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>File</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[240px] z-[70] backdrop-blur-xl bg-opacity-95">
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={createNewFile}>
              <div className="flex items-center gap-2"><FilePlus size={14} /> <span>New File</span></div>
              <span className="text-[10px] opacity-40">Ctrl+N</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setShowCreateProjectModal(true)}>
              <FolderPlus size={14} /> <span>New Project / Clone</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={(getIsTauri() || !!tauriDialog) ? openFolderNative : openFolder}>
              <FolderOpen size={14} /> <span>Open Folder...</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-red-500/20 hover:text-red-400 cursor-pointer transition-colors flex items-center gap-2" onClick={closeFolder}>
              <X size={14} /> <span>Close Project</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={handleSaveFile}>
              <div className="flex items-center gap-2"><Save size={14} /> <span>Save Active File</span></div>
              <span className="text-[10px] opacity-40">Ctrl+S</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={exportProject}>
              <Download size={14} /> <span>Export Project (ZIP)</span>
            </div>
          </div>
        </div>

        {/* Edit Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>Edit</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[220px] z-[70] backdrop-blur-xl bg-opacity-95">
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2"><Undo size={14} /> <span>Undo</span></div>
              <span className="text-[10px] opacity-40">Ctrl+Z</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2"><Redo size={14} /> <span>Redo</span></div>
              <span className="text-[10px] opacity-40">Ctrl+Y</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2"><Scissors size={14} /> <span>Cut</span></div>
              <span className="text-[10px] opacity-40">Ctrl+X</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2"><Copy size={14} /> <span>Copy</span></div>
              <span className="text-[10px] opacity-40">Ctrl+C</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between opacity-50">
              <div className="flex items-center gap-2"><Clipboard size={14} /> <span>Paste</span></div>
              <span className="text-[10px] opacity-40">Ctrl+V</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => setSidebarTab('search')}>
              <div className="flex items-center gap-2"><Search size={14} /> <span>Find in Files</span></div>
              <span className="text-[10px] opacity-40">Ctrl+Shift+F</span>
            </div>
          </div>
        </div>

        {/* View Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>View</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[260px] z-[70] backdrop-blur-xl bg-opacity-95">
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => setShowAiPanel(!showAiPanel)}>
              <div className="flex items-center gap-2"><PanelRight size={14} /> <span>Aura AI Assistant Panel</span></div>
              {showAiPanel && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => setShowBottomPanel(!showBottomPanel)}>
              <div className="flex items-center gap-2"><PanelBottom size={14} /> <span>Terminal & Output View</span></div>
              {showBottomPanel && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('files')}>
              <FileCode size={14} className="text-blue-400" /> <span>Explorer</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('git')}>
              <Github size={14} /> <span>Source Control</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('database')}>
              <Database size={14} /> <span>Databases</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 hover:bg-blue-400 hover:text-white cursor-pointer transition-colors flex items-center justify-between group/item" onClick={() => relayout('default')}>
              <div className="flex items-center gap-2"><Layout size={14} /> <span>Layout: Default</span></div>
              {!zenMode && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
            </div>
            <div className="px-3 py-1.5 hover:bg-purple-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => relayout('zen')}>
              <div className="flex items-center gap-2"><Eye size={14} /> <span>Layout: Zen Mode</span></div>
              {zenMode && <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>}
            </div>
          </div>
        </div>

        {/* Terminal Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>Terminal</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[220px] z-[70] backdrop-blur-xl bg-opacity-95">
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => addTerminalSession()}>
               <Plus size={14} /> <span>New Terminal</span>
             </div>
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => executeCommand('clear')}>
               <RefreshCw size={14} /> <span>Clear Terminal</span>
             </div>
             <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
             <div className="px-3 py-1.5 hover:bg-emerald-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between group/cmd" onClick={() => executeCommand('npm run dev')}>
               <div className="flex items-center gap-2"><Play size={14} className="text-emerald-400" /> <span>Run Dev Server</span></div>
               <span className="text-[9px] opacity-40 uppercase">npm dev</span>
             </div>
             <div className="px-3 py-1.5 hover:bg-purple-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => executeCommand('npm run build')}>
               <div className="flex items-center gap-2"><Package size={14} className="text-purple-400" /> <span>Build Application</span></div>
               <span className="text-[9px] opacity-40 uppercase">npm build</span>
             </div>
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center justify-between" onClick={() => executeCommand('npm install')}>
               <div className="flex items-center gap-2"><RefreshCw size={14} className="text-blue-400" /> <span>Install/Update</span></div>
               <span className="text-[9px] opacity-40 uppercase">npm install</span>
             </div>
          </div>
        </div>

        {/* Settings Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>Settings</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[220px] z-[70] backdrop-blur-xl bg-opacity-95">
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('settings')}>
               <Settings size={14} /> <span>Global Settings</span>
             </div>
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('github')}>
               <Github size={14} /> <span>GitHub Sync Config</span>
             </div>
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setSidebarTab('database')}>
               <Database size={14} /> <span>Database Explorer</span>
             </div>
             <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
             <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={resetAllConnections}>
               <RefreshCw size={14} /> <span>Reset All Connectors</span>
             </div>
          </div>
        </div>

        {/* Help Menu */}
        <div className="relative group cursor-pointer hover:text-white px-3 py-1.5 transition-colors rounded">
          <span>Help</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[200px] z-[70] backdrop-blur-xl bg-opacity-95">
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => setShowGuideModal(true)}>
              <BookOpen size={14} /> <span>Guidance & Tips</span>
            </div>
            <div className="px-3 py-1.5 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2" onClick={() => window.open('https://github.com/budagbogor/AURA-IDE-BOA', '_blank')}>
              <Github size={14} /> <span>Source Repository</span>
            </div>
            <div className="h-[1px] bg-white/5 my-1 mx-2"></div>
            <div className="px-3 py-1.5 flex items-center gap-2 text-white/40 cursor-default">
              <Info size={14} /> <span className="text-[10px]">AURA AI IDE v3.1.1-PRO</span>
            </div>
          </div>
        </div>
      </div>

      <div 
        className={cn(
          "flex-1 flex min-h-0 overflow-hidden transition-all duration-300",
          layoutMode === 'modern' ? "flex-row-reverse" : "flex-row"
        )}
      >
      {/* Guide Modal */}
      <GuideModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[200] w-48 glass-card rounded-lg shadow-2xl p-1"
          >
            <div 
              onClick={() => {
                const file = files.find(f => f.id === contextMenu.fileId);
                if (file) {
                  const newName = prompt('Rename file:', file.name);
                  if (newName) setFiles(prev => prev.map(f => f.id === file.id ? { ...f, name: newName } : f));
                }
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded cursor-pointer text-[12px]"
            >
              <RefreshCw size={12} /> Rename
            </div>
            <div 
              onClick={() => {
                const newFiles = files.filter(f => f.id !== contextMenu.fileId);
                setFiles(newFiles);
                if (activeFileId === contextMenu.fileId) {
                  setActiveFileId(newFiles.length > 0 ? newFiles[0].id : '');
                }
                setContextMenu(null);
              }}
              className="flex items-center gap-2 px-3 py-2 hover:bg-red-500/20 text-red-400 rounded cursor-pointer text-[12px]"
            >
              <X size={12} /> Delete
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowCommandPalette(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-2xl glass-card rounded-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <ChevronRight size={18} className="text-blue-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Type a command or search..."
                  className="bg-transparent border-none outline-none text-white text-lg w-full"
                  value={commandInput}
                  onChange={e => setCommandInput(e.target.value)}
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {[
                  { icon: <Monitor size={16} />, label: 'Build Windows App (.exe) - Cloud Build (GitHub Actions)', action: () => {
                      appendTerminalOutput('[AURA SYSTEM] Persiapan Cloud Build Desktop...');
                      appendTerminalOutput('1. Pastikan Anda sudah Push kode terbaru ke GitHub.');
                      appendTerminalOutput('2. Buka tab Actions di GitHub.com.');
                      appendTerminalOutput('3. Tunggu hingga workflow "Build Windows EXE (Tauri)" selesai.');
                      appendTerminalOutput('4. Download hasil build (.msi) dari bagian "Artifacts".');
                      setBottomTab('terminal');
                    } 
                  },
                  { icon: <Monitor size={16} />, label: 'Build Windows App (.exe) - Local (Tauri)', action: () => {
                      appendTerminalOutput('[AURA SYSTEM] Persiapan Lokal Build Desktop (Tauri)...');
                      appendTerminalOutput('Silakan jalankan "npm run build:tauri" di terminal lokal Anda.');
                      appendTerminalOutput('Pastikan Rust sudah terinstall (rustup.rs).');
                      setBottomTab('terminal');
                    } 
                  },
                  { icon: <Smartphone size={16} />, label: 'Build Android App (.apk) - Cloud Build (GitHub Actions)', action: () => {
                      appendTerminalOutput('[AURA SYSTEM] Persiapan Cloud Build Android...');
                      appendTerminalOutput('1. Pastikan Anda sudah Push kode terbaru ke GitHub.');
                      appendTerminalOutput('2. Buka tab Actions di GitHub.com.');
                      appendTerminalOutput('3. Tunggu hingga workflow "Build Android APK" selesai (centang hijau).');
                      appendTerminalOutput('4. Scroll ke bawah halaman tersebut ke kolom "Artifacts".');
                      appendTerminalOutput('5. Download file "aura-ide-android-debug-apk" yang berisi file .apk Anda.');
                      setBottomTab('terminal');
                    } 
                  },
                  { icon: <Smartphone size={16} />, label: 'Build Android App (.apk) - Local (Capacitor)', action: () => {
                      appendTerminalOutput('[AURA SYSTEM] Persiapan Lokal Build Android (Capacitor)...');
                      appendTerminalOutput('1. Jalankan "npm run build" untuk update aset.');
                      appendTerminalOutput('2. Jalankan "npx cap sync" untuk sinkronisasi.');
                      appendTerminalOutput('3. Jalankan "npx cap open android" untuk membuka di Android Studio.');
                      appendTerminalOutput('Build APK secara manual di Android Studio.');
                      setBottomTab('terminal');
                    } 
                  },
                  { icon: <Layout size={16} />, label: 'Relayout: Default', action: () => relayout('default') },
                  { icon: <Eye size={16} />, label: 'Relayout: Zen', action: () => relayout('zen') },
                  { icon: <FileCode size={16} />, label: 'Create New File', action: createNewFile },
                  { icon: <FolderOpen size={16} />, label: 'Open Folder', action: openFolder },
                  { icon: <X size={16} />, label: 'Close Folder', action: closeFolder },
                  { icon: <Download size={16} />, label: 'Export Project', action: exportProject },
                  { icon: <Layout size={16} />, label: 'Toggle Layout Mode', action: () => setLayoutMode(layoutMode === 'classic' ? 'modern' : 'classic') },
                  { icon: <Eye size={16} />, label: 'Toggle Zen Mode', action: () => setZenMode(!zenMode) },
                  { icon: <Sparkles size={16} />, label: 'Scan Code for Problems', action: scanForProblems },
                  { icon: <Terminal size={16} />, label: 'Clear Terminal', action: () => setTerminalSessions(prev => prev.map(s => s.id === activeTerminalId ? { ...s, output: ['Terminal cleared.'] } : s)) },
                ].filter(cmd => cmd.label.toLowerCase().includes(commandInput.toLowerCase())).map((cmd, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      cmd.action();
                      setShowCommandPalette(false);
                      setCommandInput('');
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="text-[#858585] group-hover:text-blue-500 transition-colors">
                      {cmd.icon}
                    </div>
                    <span className="text-[14px]">{cmd.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Search */}
      <AnimatePresence>
        {showFileSearch && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
            onClick={() => setShowFileSearch(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="w-full max-w-2xl glass-card rounded-xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center gap-3">
                <Search size={18} className="text-blue-500" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search files by name..."
                  className="bg-transparent border-none outline-none text-white text-lg w-full"
                  value={fileSearchInput}
                  onChange={e => setFileSearchInput(e.target.value)}
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                {files.filter(f => f.name.toLowerCase().includes(fileSearchInput.toLowerCase())).map((file, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      setActiveFileId(file.id);
                      setShowFileSearch(false);
                      setFileSearchInput('');
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-lg cursor-pointer transition-colors group"
                  >
                    <FileCode size={16} className="text-blue-400" />
                    <div className="flex flex-col">
                      <span className="text-[14px]">{file.name}</span>
                      <span className="text-[10px] text-[#858585]">AURA-PROJECT</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

            {/* Activity Bar & Sidebar */}
      <Sidebar
        layoutMode={layoutMode}
        zenMode={zenMode}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        isResizingSidebar={isResizingSidebar}
        setIsResizingSidebar={setIsResizingSidebar}
        setShowGuideModal={setShowGuideModal}
        files={files}
        setFiles={setFiles}
        activeFileId={activeFileId}
        setActiveFileId={setActiveFileId}
        fileSearchInput={fileSearchInput}
        setFileSearchInput={setFileSearchInput}
        chatMessages={chatMessages}
        setChatMessages={setChatMessages}
        composerMessages={composerMessages}
        setComposerMessages={setComposerMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isAiLoading={isAiLoading}
        handleSendMessage={handleSendMessage}
        attachedFiles={attachedFiles}
        setAttachedFiles={setAttachedFiles}
        removeAttachment={removeAttachment}
        handleFileUpload={handleFileUpload}
        fileInputRef={fileInputRef}
        chatEndRef={chatEndRef}
        githubUser={githubUser}
        githubConnected={githubConnected}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
        githubRepos={githubRepos}
        setGithubRepos={setGithubRepos}
        isFetchingRepos={isFetchingRepos}
        setIsFetchingRepos={setIsFetchingRepos}
        repoSearchInput={repoSearchInput}
        setRepoSearchInput={setRepoSearchInput}
        handleCloneRepo={handleCloneRepo}
        isTauri={getIsTauri() || !!tauriDialog}
        TauriCommand={TauriCommand}
        openFolderNative={openFolderNative}
        createNewFile={createNewFile}
        openFolder={openFolder}
        closeFolder={closeFolder}
        autoPreview={handleAutoPreview}
        onAiSuccess={handleAiSuccess}
        exportProject={exportProject}
        handleGithubPush={handleGithubPush}
        executeCommand={executeCommand}
        appendTerminalOutput={appendTerminalOutput}
        handleContextMenu={handleContextMenu}
        relayout={relayout}
        setLayoutMode={setLayoutMode}
        setZenMode={setZenMode}
        aiProvider={aiProvider}
        setAiProvider={setAiProvider}
        geminiApiKey={geminiApiKey}
        setGeminiApiKey={setGeminiApiKey}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        bytezApiKey={bytezApiKey}
        setBytezApiKey={setBytezApiKey}
        bytezModel={bytezModel}
        setBytezModel={setBytezModel}
        sumopodApiKey={sumopodApiKey}
        setSumopodApiKey={setSumopodApiKey}
        sumopodModel={sumopodModel}
        setSumopodModel={setSumopodModel}
        openRouterApiKey={openRouterApiKey}
        setOpenRouterApiKey={setOpenRouterApiKey}
        openRouterModel={openRouterModel}
        setOpenRouterModel={setOpenRouterModel}
        dynamicFreeModels={dynamicFreeModels}
        isFetchingModels={isFetchingModels}
        refreshModels={refreshModels}
        systemInstruction={systemInstruction}
        setSystemInstruction={setSystemInstruction}
        aiRules={aiRules}
        setAiRules={setAiRules}
        selectedSkill={selectedSkill}
        setSelectedSkill={setSelectedSkill}
        context7Mode={context7Mode}
        setContext7Mode={setContext7Mode}
        resetAllConnections={resetAllConnections}
        mcpServers={mcpServers}
        setMcpServers={setMcpServers}
        selectedMcpTemplateIdx={selectedMcpTemplateIdx}
        setSelectedMcpTemplateIdx={setSelectedMcpTemplateIdx}
        mcpTemplateData={mcpTemplateData}
        setMcpTemplateData={setMcpTemplateData}
        newMcpName={newMcpName}
        setNewMcpName={setNewMcpName}
        newMcpType={newMcpType}
        setNewMcpType={setNewMcpType}
        newMcpUrl={newMcpUrl}
        setNewMcpUrl={setNewMcpUrl}
        newMcpEnvStr={newMcpEnvStr}
        setNewMcpEnvStr={setNewMcpEnvStr}
        showMcpLogsFor={showMcpLogsFor}
        setShowMcpLogsFor={setShowMcpLogsFor}
        activeMcpLogs={activeMcpLogs}
        setActiveMcpLogs={setActiveMcpLogs}

        testingStatus={testingStatus}
        testAiConnection={testAiConnection}
        testGithubConnection={testGithubConnection}
        testError={testError}
        nativeProjectPath={nativeProjectPath}
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        problems={problems}
        onFocusProblem={(p: any) => {
          const file = files.find(f => f.path === p.path || f.name === p.file);
          if (file) {
            setActiveFileId(file.id);
            setBottomTab('problems');
          }
        }}
        activeAgentId={activeAgentId}
        setActiveAgentId={setActiveAgentId}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Editor & Browser Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs & Actions */}
        <div className="h-9 bg-[#252526] flex items-center justify-between border-b border-white/5 pr-2">
          <div className="flex items-center overflow-x-auto flex-1 h-full scrollbar-hide">
            {files.map(file => (
              <div 
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={cn(
                  "h-full flex items-center gap-2 px-4 cursor-pointer text-[12px] border-r border-white/5 min-w-[140px] transition-all duration-200 group relative",
                  activeFileId === file.id ? "bg-[#1e1e1e] text-white" : "bg-[#2d2d2d] text-[#969696] hover:bg-[#1e1e1e] hover:text-[#cccccc]"
                )}
              >
                {getFileIcon(file.name)}
                <span className="truncate flex-1 font-medium">{file.name}</span>
                <X 
                  size={12} 
                  className="opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded p-0.5 transition-all" 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFiles = files.filter(f => f.id !== file.id);
                    setFiles(newFiles);
                    if (activeFileId === file.id) {
                      setActiveFileId(newFiles.length > 0 ? newFiles[0].id : '');
                    }
                  }} 
                />
                {activeFileId === file.id && <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => {
                if (files.length > 1) {
                  setFiles([files[0]]);
                  setActiveFileId(files[0].id);
                }
              }}
              className="p-1.5 text-[#858585] hover:text-white hover:bg-white/5 rounded transition-colors"
              title="Close All Other Tabs"
            >
              <X size={14} />
            </button>
          </div>
        </div>

                {/* Editor & Browser Split View */}
        <div className="flex-1 flex min-h-0 relative">
          <EditorArea
            files={files}
            setFiles={setFiles}
            activeFileId={activeFileId}
            setActiveFileId={setActiveFileId}
            projectName={projectName}
            nativeProjectPath={nativeProjectPath}
            activeFile={activeFile}
            handleEditorChange={handleEditorChange}
            editorFontSize={parseInt(editorFontSize as any) || 14}
            openFolder={openFolder}
            onCreateProject={() => setShowCreateProjectModal(true)}
            setSidebarTab={setSidebarTab}
            createNewFile={createNewFile}
            handleCloneRepo={handleCloneRepo}
            stagingFiles={stagingFiles}
            onAcceptStaging={handleAcceptStaging}
            onDiscardStaging={handleDiscardStaging}
            onUpdateStagingStatus={handleUpdateStagingStatus}
            onAiAction={(action: 'fix' | 'explain' | 'refactor') => {
              setShowAiPanel(true);
              const file = files.find(f => f.id === activeFileId);
              if (!file) return;
              
              let prompt = '';
              if (action === 'fix') prompt = `Analisis file ${file.name} dan perbaiki error atau bug yang ditemukan secara otonom.`;
              else if (action === 'explain') prompt = `Berikan penjelasan mendalam (Architecture Review) tentang file ${file.name}.`;
              else if (action === 'refactor') prompt = `Sarankan dan terapkan refactoring pada file ${file.name} agar lebih clean dan efisien.`;
              
              setComposerMessages(prev => [...prev, { role: 'user', content: prompt }]);
            }}
          />
        </div>
      </div>

        {/* Bottom Panel (Terminal & Problems) */}
        {showBottomPanel && (
          <BottomPanel
            zenMode={zenMode}
            bottomHeight={bottomHeight}
            setIsResizingBottom={setIsResizingBottom}
            bottomTab={bottomTab}
            setBottomTab={setBottomTab}
            terminalSessions={terminalSessions}
            setTerminalSessions={setTerminalSessions}
            activeTerminalId={activeTerminalId}
            setActiveTerminalId={setActiveTerminalId}
            addTerminalSession={addTerminalSession}
            closeTerminalSession={closeTerminalSession}
            terminalInput={terminalInput}
            setTerminalInput={setTerminalInput}
            handleTerminalCommand={handleTerminalCommand}
            problems={problems}
            activeFile={activeFile}
            isScanning={isScanning}
            scanForProblems={scanForProblems}
            nativeProjectPath={nativeProjectPath}
            commandHistory={commandHistory}
            historyIndex={historyIndex}
            setHistoryIndex={setHistoryIndex}
            onKillProcess={handleTerminalKill}
          />
        )}

      </div>
      
      {/* 3rd Column (Right Panel): AI Chat / Composer / Preview */}
      {!zenMode && (showAiPanel || showPreviewPanel) && (
        <div 
          style={{ width: aiPanelWidth }}
          className={cn(
            "h-full flex flex-col shrink-0 bg-[#202021] z-30 transition-all duration-300 shadow-2xl relative",
            layoutMode === 'modern' ? "border-r border-white/5" : "border-l border-white/5"
          )}
        >
          {/* Vertical Resizer Handle for AI Panel */}
          <div 
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizingAiPanel(true);
              document.body.style.cursor = 'col-resize';
            }}
            className={cn(
              "absolute top-0 bottom-0 w-1 px-0.5 cursor-col-resize hover:bg-blue-500/40 transition-colors z-50",
              layoutMode === 'modern' ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
            )}
          />
          <div className="p-3 border-b border-white/5 bg-[#252526]/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="flex gap-4 items-center">
              <button 
                onClick={() => { setShowPreviewPanel(false); setShowAiPanel(true); }} 
                className={cn("text-[11px] font-black tracking-widest uppercase flex items-center gap-2 transition-colors", !showPreviewPanel ? "text-blue-400" : "text-white/50 hover:text-white")}
              >
                <Sparkles size={14} /> Aura AI
              </button>
              <button 
                onClick={() => { setShowPreviewPanel(true); setShowAiPanel(false); }} 
                className={cn("text-[11px] font-black tracking-widest uppercase flex items-center gap-2 transition-colors", showPreviewPanel ? "text-emerald-400" : "text-white/50 hover:text-white")}
              >
                <Globe size={14} /> Preview
              </button>
            </div>
            <button 
              onClick={() => { setShowAiPanel(false); setShowPreviewPanel(false); }} 
              className="hover:bg-red-500/20 hover:text-red-400 p-1 rounded-md transition-colors text-white/50" 
              title="Sembunyikan Panel"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {showPreviewPanel ? (
               <div className="w-full h-full bg-white relative flex flex-col">
                 <div className="h-10 bg-gray-100 flex items-center px-3 border-b border-gray-300 gap-2 shrink-0">
                    <button onClick={() => { const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement; if (iframe) iframe.src = previewUrl; }} className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"><RotateCcw size={14} /></button>
                    <input type="text" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement; if (iframe) iframe.src = previewUrl; } }} className="flex-1 bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors"><ExternalLink size={14} /></a>
                 </div>
                 <iframe id="preview-iframe" src={previewUrl} className="flex-1 w-full bg-white border-none" title="App Preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
               </div>
            ) : (
              <AiComposerPanel 
                provider={aiProvider}
                apiKey={
                  aiProvider === 'gemini' ? geminiApiKey : 
                  aiProvider === 'openrouter' ? openRouterApiKey : 
                  aiProvider === 'bytez' ? bytezApiKey :
                  sumopodApiKey
                }
                model={
                  aiProvider === 'gemini' ? selectedModel : 
                  aiProvider === 'openrouter' ? openRouterModel : 
                  aiProvider === 'bytez' ? bytezModel :
                  sumopodModel
                }
                files={files}
                activeFileId={activeFileId}
                appendTerminalOutput={appendTerminalOutput}
                onSuccess={handleAiSuccess}
                projectTree={files.map(f => f.id).join('\n')}
                messages={composerMessages}
                setMessages={setComposerMessages}
                autoFixTrigger={autoFixTrigger}
                autoFixMessage={autoFixMsg}
                onExecuteCommand={executeCommand}
                onApplyCode={handleApplyCode}
                nativeProjectPath={nativeProjectPath}
                mcpTools={mcpServers.filter(s => s.connected).flatMap(s => s.tools || [])}
                ollamaUrl={ollamaUrl}
                activeAgentId={activeAgentId}
              />
            )}
          </div>
        </div>
      )}

      </div>

      {/* Status Bar & Footer */}
      <div className="z-50 flex flex-col shrink-0">
        <div className="h-6 bg-[#007acc] text-white flex items-center px-3 text-[11px] gap-4 shadow-2xl backdrop-blur-md bg-opacity-90">
          <div className="flex items-center gap-1 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors">
            <ChevronRight size={12} />
            <span className="font-medium">main*</span>
          </div>
          <div className="flex items-center gap-3 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors">
            <div className="flex items-center gap-1">
              <X size={12} className="text-white/70" />
              <span>0</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-white/70" />
              <span>{problems.length}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center h-full">
            <div className="hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10 text-white/70 italic gap-3">
              <span>Ctrl+P Search Files</span>
              <span className="opacity-40">|</span>
              <span>Ctrl+Shift+P Commands</span>
            </div>
            <div 
              onClick={() => setZenMode(!zenMode)}
              className={cn(
                "hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10",
                zenMode && "bg-white/20 text-blue-200"
              )}
              title="Toggle Zen Mode"
            >
              {zenMode ? <EyeOff size={12} className="mr-1" /> : <Eye size={12} className="mr-1" />}
              Zen
            </div>
            <div className="hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10">Spaces: 2</div>
            <div className="hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10 uppercase tracking-tighter opacity-80">UTF-8</div>
            <div className="hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10 font-bold uppercase tracking-widest text-[10px]">{activeFile?.language || 'No File'}</div>
            <div className="flex items-center gap-2 hover:bg-white/10 px-3 h-full cursor-pointer transition-colors border-l border-white/10 bg-white/5" title={`Active Model: ${aiProvider === 'gemini' ? selectedModel : openRouterModel}`}>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              <span className="font-black tracking-tighter">AURA AI ONLINE</span>
              <span className="text-white/70 text-[10px] ml-1">({aiProvider === 'gemini' ? selectedModel : openRouterModel})</span>
            </div>
          </div>
        </div>
        <div className="h-5 bg-[#1e1e1e] border-t border-white/5 flex items-center justify-center text-[10px] text-[#858585]">
          &copy; 2026 B.O.A. Indonesia
        </div>
      </div>

      <CreateProjectModal 
        isOpen={showCreateProjectModal} 
        onClose={() => setShowCreateProjectModal(false)}
        onConfirm={handleCreateProjectConfirm}
        tauriDialog={tauriDialog}
      />
    </div>
  );
}
