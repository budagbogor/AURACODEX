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
  Paperclip,
  Image as ImageIcon,
  File as FileIcon,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Maximize2,
  Layout,
  Eye,
  EyeOff,
  Folder,
  HelpCircle,
  BookOpen,
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
  SUPER_CLAUDE_SKILLS, 
  SUPER_CLAUDE_COMMANDS, 
  MCP_TEMPLATES 
} from '@/utils/constants';
import { getGeminiAI, generateGeminiStream } from './services/geminiService';
import { generateOpenRouterContent, fetchFreeModels, type OpenRouterModel } from './services/openRouterService';
import { generateBytezContent } from './services/bytezService';
import { saveProjectToCloud, loadProjectFromCloud, listCloudProjects } from './services/supabaseService';
import { fetchUserRepos, cloneRepository, pushProjectToGitHub } from './services/githubService';
import { generateSumopodContent } from './services/sumopodService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Windows Installer / Desktop Mode Helpers
const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

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



// --- Desktop Title Bar (Premium Trae/VS Code Style) ---
const TitleBar = ({ projectName }: { projectName: string }) => {
  const [tauriWindow, setTauriWindow] = useState<any>(null);

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/window').then(m => setTauriWindow(m.getCurrentWindow()));
    }
  }, []);

  if (!isTauri && !isElectron) return null;

  return (
    <div className="h-10 bg-[#0c0c0c] border-b border-white/5 flex items-center justify-between px-4 select-none z-50 sticky top-0 relative">
      {/* Drag Region Overlay */}
      <div 
        data-tauri-drag-region 
        className="absolute inset-0 z-0" 
        style={{ WebkitAppRegion: isElectron ? 'drag' : undefined } as any}
      />

      {/* Left Area: Logo & Name */}
      <div className="flex items-center gap-2 pointer-events-none z-10 relative">
        <AuraLogo size={18} />
        <span className="text-[11px] font-bold text-gray-400 tracking-widest uppercase">Aura AI IDE</span>
      </div>
      
      {/* Center Area: Folder & Search */}
      <div className="flex-1 flex justify-center h-full items-center pointer-events-none gap-4 z-10 relative">
        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
          <Folder size={12} className="text-blue-400" />
          <span className="text-[11px] font-bold text-blue-300 uppercase tracking-tight">{projectName}</span>
        </div>
        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[11px] text-gray-400 flex items-center gap-2">
          <Search size={12} />
          <span>Search or type a command... (Ctrl+P)</span>
        </div>
      </div>

      {/* Right Area: Windows Controls */}
      <div className="flex items-center z-20 relative">
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isTauri) tauriWindow?.minimize();
            else if (isElectron) (window as any).electronAPI.minimize();
          }} 
          className="p-2 hover:bg-white/10 text-gray-400 transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="currentColor" width="10" height="1" x="1" y="6"/></svg>
        </button>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isTauri) tauriWindow?.toggleMaximize();
            else if (isElectron) (window as any).electronAPI.maximize();
          }} 
          className="p-2 hover:bg-white/10 text-gray-400 transition-colors cursor-pointer"
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect fill="none" stroke="currentColor" width="9" height="9" x="1.5" y="1.5"/></svg>
        </button>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (isTauri) tauriWindow?.close();
            else if (isElectron) (window as any).electronAPI.close();
          }} 
          className="p-2 hover:bg-red-500/80 hover:text-white text-gray-400 transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [TauriCommand, setTauriCommand] = useState<any>(null);
  const [tauriDialog, setTauriDialog] = useState<any>(null);
  const [tauriFs, setTauriFs] = useState<any>(null);
  const [nativeProjectPath, setNativeProjectPath] = useState<string | null>(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const activeProcessRef = useRef<any>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      import('@tauri-apps/plugin-shell').then(m => { setTauriCommand(() => m.Command); });
      import('@tauri-apps/plugin-dialog').then(m => { setTauriDialog(m); });
      import('@tauri-apps/plugin-fs').then(m => { setTauriFs(m); });
      import('@tauri-apps/api/window').then(m => { m.getCurrentWindow().maximize().catch(() => {}); });
    }
    
    // Cleanup active process on unmount
    return () => {
      if (activeProcessRef.current) {
        activeProcessRef.current.kill().catch(() => {});
      }
    };
  }, []);

  const [files, setFiles] = useState<FileItem[]>([]);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [fileSearchInput, setFileSearchInput] = useState('');
  const [repoSearchInput, setRepoSearchInput] = useState('');
  const [activeFileId, setActiveFileId] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'classic' | 'modern'>('classic');
  const [projectName, setProjectName] = useState('AURA-PROJECT');
  const activeFile = files.find(f => f.id === activeFileId) || (files.length > 0 ? files[0] : null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        setShowFileSearch(true);
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowFileSearch(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [bottomTab, setBottomTab] = useState<'terminal' | 'problems' | 'output' | 'debug'>('terminal');
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'git' | 'ai' | 'github' | 'settings' | 'browser' | 'database'>('files');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Welcome to **Aura AI IDE**. I am your coding assistant. How can I help you today?' }
  ]);
  const [composerMessages, setComposerMessages] = useState<any[]>([
    { role: 'assistant', content: 'Halo! Saya adalah Aura AI Composer. Ketik permintaan Anda, dan saya akan membuat/mengedit kode untuk Anda.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [terminalSessions, setTerminalSessions] = useState<TerminalSession[]>([
    { id: 'default', name: 'Terminal', output: ['Aura Terminal v4.0.0 (Cursor Core)', 'Ready for input...'] }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState('default');
  
  const currentSession = terminalSessions.find(s => s.id === activeTerminalId) || terminalSessions[0];

  const appendTerminalOutput = (data: string | string[], sessionId?: string) => {
    const targetId = sessionId || activeTerminalId;
    const lines = Array.isArray(data) ? data : [data];
    setTerminalSessions(prev => prev.map(s => 
      s.id === targetId ? { ...s, output: [...s.output, ...lines] } : s
    ));
  };

  const addTerminalSession = () => {
    const newId = `term-${Date.now()}`;
    const newSession: TerminalSession = {
      id: newId,
      name: `Terminal ${terminalSessions.length + 1}`,
      output: [`[AURA] New session started at ${new Date().toLocaleTimeString()}`]
    };
    setTerminalSessions(prev => [...prev, newSession]);
    setActiveTerminalId(newId);
  };

  const closeTerminalSession = (id: string) => {
    if (terminalSessions.length <= 1) return;
    setTerminalSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeTerminalId === id) {
        setActiveTerminalId(filtered[0].id);
      }
      return filtered;
    });
  };
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('aura_github_token') || '');
  const [githubUser, setGithubUser] = useState<any | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);

  const handleCloneRepo = async (repo: any) => {
    if (!githubToken) return;

    let selectedPath: string | null = null;
    let projectDirHandle: any = null; // Web mode only

    if (isTauri && tauriDialog) {
      // Desktop Mode: Get real OS path
      try {
        const selected = await tauriDialog.open({
          directory: true,
          multiple: false,
          title: `Pilih Folder (Select as folder repository) untuk Meng-clone ${repo.name}`
        });
        if (selected && typeof selected === 'string') {
          selectedPath = `${selected.replace(/\\/g, '/')}/${repo.name}`;
          appendTerminalOutput(`[GITHUB] Target folder (Native): ${selectedPath}`);
        } else {
          appendTerminalOutput('[GITHUB] Clone dibatalkan oleh pengguna.');
          return;
        }
      } catch (err) {
        console.error('Tauri Dialog Error:', err);
        return;
      }
    } else {
      // Web Mode: Original Directory Picker
      try {
        // @ts-ignore
        const baseDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        projectDirHandle = await baseDirHandle.getDirectoryHandle(repo.name, { create: true });
      } catch (err) {
        console.log('User cancelled or directory picker unsupported:', err);
        appendTerminalOutput('[GITHUB] Clone cancelled. Please select a folder to save the repository.');
        return;
      }
    }

    setIsFetchingRepos(true);
    appendTerminalOutput(`[GITHUB] Cloning repository ${repo.full_name}...`);
    
    try {
      const { cloneRepository } = await import('./services/githubService');
      const clonedFiles = await cloneRepository(githubToken, repo.owner.login, repo.name);
      
      if (clonedFiles.length > 0) {
        appendTerminalOutput(`[SYSTEM] Menyimpan ${clonedFiles.length} file ke ${selectedPath ? 'Disk Lokal' : 'Memori Browser'}...`);
        
        if (selectedPath && tauriFs) {
          // Desktop Logic: Write to real disk using Tauri FS
          try {
            await tauriFs.mkdir(selectedPath, { recursive: true });
          } catch (e) {}

          for (const file of clonedFiles) {
            const pathParts = file.id.split('/');
            const fileName = pathParts.pop()!;
            let currentPath = selectedPath;
            
            // Recreate folder structure
            for (const dirName of pathParts) {
              currentPath = `${currentPath}/${dirName}`;
              try {
                await tauriFs.mkdir(currentPath, { recursive: true });
              } catch (e) {}
            }
            
            await tauriFs.writeTextFile(`${currentPath}/${fileName}`, file.content);
          }
          
          setNativeProjectPath(selectedPath);
          // Update state immediately with cloned files so sidebar shows them right away
          // We map the relative ID to absolute path for consistency with syncFilesFromNativePath
          const mappedFiles = clonedFiles.map(f => ({
            ...f,
            id: `${selectedPath}/${f.id}`
          }));
          setFiles(mappedFiles);
          
          // Re-sync to ensure everything is perfect
          await syncFilesFromNativePath(selectedPath);
          
          appendTerminalOutput(`[SUCCESS] Clone berhasil! Terminal kini aktif di: ${selectedPath}`);
          alert(`Berhasil meng-clone ke ${selectedPath}. Terminal sekarang terhubung.`);
        } else if (projectDirHandle) {
          // Web Logic: Original FileSystem API
          for (const file of clonedFiles) {
            const pathParts = file.id.split('/');
            const fileName = pathParts.pop()!;
            let currentDir = projectDirHandle;
            for (const dirName of pathParts) {
              currentDir = await currentDir.getDirectoryHandle(dirName, { create: true });
            }
            const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(file.content);
            await writable.close();
          }
          setFiles(clonedFiles);
        }

        setProjectName(repo.name.toUpperCase());
        setSidebarTab('files');
        if (clonedFiles.length > 0) setActiveFileId(clonedFiles[0].id);
      } else {
        appendTerminalOutput(`[GITHUB] Repository ${repo.full_name} is empty.`);
      }
    } catch (error) {
      appendTerminalOutput(`[GITHUB] Error cloning repository: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingRepos(false);
    }
  };


  const handleSaveFile = async () => {
    if (!activeFile) return;
    
    if (isTauri) {
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

  const closeFolder = () => {
    setFiles([]);
    setActiveFileId('');
    setProjectName('AURA-PROJECT');
    appendTerminalOutput('Folder closed.');
  };

  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('aura_supabase_url') || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(() => localStorage.getItem('aura_supabase_key') || '');
  const [supabaseConnected, setSupabaseConnected] = useState(() => localStorage.getItem('aura_supabase_connected') === 'true');
  const [isSupabaseTesting, setIsSupabaseTesting] = useState(false);

  const testSupabase = async () => {
    const activeUrl = supabaseUrl || DEFAULT_SUPABASE_URL;
    const activeKey = supabaseAnonKey || DEFAULT_SUPABASE_KEY;
    
    if (!activeUrl || !activeKey) return;
    
    setTestingStatus(prev => ({ ...prev, supabase: 'loading' }));
    appendTerminalOutput(`[CLOUD] Mencoba menghubungkan ke Supabase: ${activeUrl}...`);
    try {
      const { testSupabaseConnection } = await import('./services/supabaseService');
      const success = await testSupabaseConnection({ url: activeUrl, anonKey: activeKey });
      if (success) {
        setSupabaseConnected(true);
        localStorage.setItem('aura_supabase_connected', 'true');
        setTestingStatus(prev => ({ ...prev, supabase: 'success' }));
        appendTerminalOutput('✓ Berhasil terhubung ke Supabase Cloud!');
      }
    } catch (err: any) {
      setSupabaseConnected(false);
      localStorage.setItem('aura_supabase_connected', 'false');
      setTestingStatus(prev => ({ ...prev, supabase: 'error' }));
      setTestError(prev => ({ ...prev, supabase: err.message }));
      appendTerminalOutput(`✗ Gagal terhubung: ${err.message}`);
    }
  };

  const testGithubConnection = async () => {
    if (!githubToken) return;
    setTestingStatus(prev => ({ ...prev, github: 'loading' }));
    try {
      const { fetchUserProfile } = await import('./services/githubService');
      const profile = await fetchUserProfile(githubToken);
      setGithubUser(profile);
      setGithubConnected(true);
      setTestingStatus(prev => ({ ...prev, github: 'success' }));
      appendTerminalOutput(`[GITHUB] Koneksi berhasil! Terhubung sebagai @${profile.login}`);
    } catch (err: any) {
      setGithubConnected(false);
      setTestingStatus(prev => ({ ...prev, github: 'error' }));
      setTestError(prev => ({ ...prev, github: err.message }));
      appendTerminalOutput(`[GITHUB ERROR] ${err.message}`);
    }
  };

  const testAiConnection = async (provider: 'gemini' | 'openrouter' | 'bytez' | 'sumopod') => {
    setTestingStatus(prev => ({ ...prev, [provider]: 'loading' }));
    try {
      if (provider === 'gemini') {
        const apiKey = geminiApiKey || process.env.GEMINI_API_KEY || '';
        if (!apiKey) throw new Error('API Key kosong');
        const { getGeminiAI } = await import('./services/geminiService');
        const ai = getGeminiAI(apiKey);
        await ai.models.generateContent({
          model: selectedModel,
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }]
        });
      } else if (provider === 'openrouter') {
        const apiKey = openRouterApiKey || process.env.OPENROUTER_API_KEY || '';
        if (!apiKey) throw new Error('API Key kosong');
        const { generateOpenRouterContent } = await import('./services/openRouterService');
        await generateOpenRouterContent(openRouterModel, 'ping', apiKey);
      } else if (provider === 'bytez') {
        const apiKey = bytezApiKey || '';
        if (!apiKey) throw new Error('API Key kosong');
        const { generateBytezContent } = await import('./services/bytezService');
        await generateBytezContent(bytezModel, 'ping', apiKey, geminiApiKey);
      } else if (provider === 'sumopod') {
        const apiKey = sumopodApiKey || '';
        if (!apiKey) throw new Error('API Key kosong');
        const { generateSumopodContent } = await import('./services/sumopodService');
        await generateSumopodContent(apiKey, sumopodModel, [{ role: 'user', content: 'ping' }]);
      }
      setTestingStatus(prev => ({ ...prev, [provider]: 'success' }));
      appendTerminalOutput(`[AI] Koneksi ${provider.toUpperCase()} berhasil!`);
    } catch (err: any) {
      setTestingStatus(prev => ({ ...prev, [provider]: 'error' }));
      setTestError(prev => ({ ...prev, [provider]: err.message }));
      appendTerminalOutput(`[AI ERROR] ${provider.toUpperCase()}: ${err.message}`);
    }
  };

  const resetAllConnections = () => {
    if (!confirm("Apakah Anda yakin ingin menghapus SEMUA koneksi (API Keys, GitHub Token, Supabase)? Ini tidak dapat dibatalkan.")) return;

    // Reset States
    setGeminiApiKey('');
    setOpenRouterApiKey('');
    setBytezApiKey('');
    setSumopodApiKey('');
    setGithubToken('');
    setGithubConnected(false);
    setGithubUser(null);
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setSupabaseConnected(false);
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
  const [newMcpName, setNewMcpName] = useState(MCP_TEMPLATES[0].name);
  const [newMcpUrl, setNewMcpUrl] = useState(MCP_TEMPLATES[0].commandTemplate);
  const [newMcpType, setNewMcpType] = useState<'sse' | 'stdio'>(MCP_TEMPLATES[0].type as any);
  const [newMcpEnvStr, setNewMcpEnvStr] = useState('');
  const [selectedMcpTemplateIdx, setSelectedMcpTemplateIdx] = useState<number | 'custom'>(0);
  const [mcpTemplateData, setMcpTemplateData] = useState<Record<string, string>>({});
  const [showMcpLogsFor, setShowMcpLogsFor] = useState<string | null>(null);
  const [activeMcpLogs, setActiveMcpLogs] = useState<string[]>([]);
  const [testingStatus, setTestingStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [testError, setTestError] = useState<Record<string, string>>({});
  const [editorFontSize, setEditorFontSize] = useState(14);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openrouter' | 'bytez' | 'sumopod'>(() => (localStorage.getItem('aiProvider') as any) || 'gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('aura_gemini_key') || process.env.GEMINI_API_KEY || '');
  const [openRouterApiKey, setOpenRouterApiKey] = useState(() => localStorage.getItem('aura_openrouter_key') || process.env.OPENROUTER_API_KEY || '');
  const [bytezApiKey, setBytezApiKey] = useState(() => localStorage.getItem('aura_bytez_key') || process.env.BYTEZ_API_KEY || '');
  const [sumopodApiKey, setSumopodApiKey] = useState(() => localStorage.getItem('sumopodApiKey') || '');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [openRouterModel, setOpenRouterModel] = useState('auto-free');
  const [bytezModel, setBytezModel] = useState(() => localStorage.getItem('bytezModel') || BYTEZ_MODELS[0].id);
  const [sumopodModel, setSumopodModel] = useState(() => localStorage.getItem('sumopodModel') || SUMOPOD_MODELS[0].id);
  const [dynamicFreeModels, setDynamicFreeModels] = useState<OpenRouterModel[]>(FREE_MODELS);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; type: string; data: string; content?: string }[]>([]);
  const [problems, setProblems] = useState<CodeProblem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [aiRules, setAiRules] = useState<string>('');
  const [context7Mode, setContext7Mode] = useState(false);
  const [systemInstruction, setSystemInstruction] = useState<string>('You are an expert AI coding assistant.');
  const [selectedSkill, setSelectedSkill] = useState<string>('Default');
  const [browserUrl, setBrowserUrl] = useState<string>('https://www.google.com/search?igu=1');
  const [browserSrcDoc, setBrowserSrcDoc] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(480);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [browserWidth, setBrowserWidth] = useState(window.innerWidth / 2);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const [isResizingBrowser, setIsResizingBrowser] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        let newWidth;
        if (layoutMode === 'modern') {
          newWidth = window.innerWidth - e.clientX - 56; // 56 is Activity Bar width
        } else {
          newWidth = e.clientX - 56;
        }
        if (newWidth > 150 && newWidth < 900) {
          setSidebarWidth(newWidth);
        }
      }

      if (isResizingBottom) {
        const newHeight = window.innerHeight - e.clientY - 44; // 24 (Status Bar) + 20 (Copyright)
        if (newHeight > 60 && newHeight < window.innerHeight - 100) {
          setBottomPanelHeight(newHeight);
        }
      }

      if (isResizingBrowser) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < window.innerWidth - 400) {
          setBrowserWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingBottom(false);
      setIsResizingBrowser(false);
      document.body.style.cursor = 'default';
    };

    if (isResizingSidebar || isResizingBottom || isResizingBrowser) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingBottom, isResizingBrowser, layoutMode]);

  useEffect(() => {
    localStorage.setItem('aura_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('aura_openrouter_key', openRouterApiKey);
  }, [openRouterApiKey]);

  useEffect(() => {
    localStorage.setItem('aura_bytez_key', bytezApiKey);
    localStorage.setItem('bytezModel', bytezModel);
    localStorage.setItem('sumopodApiKey', sumopodApiKey);
    localStorage.setItem('sumopodModel', sumopodModel);
    localStorage.setItem('aiProvider', aiProvider);
  }, [bytezApiKey, bytezModel, sumopodApiKey, sumopodModel, aiProvider]);

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

  useEffect(() => {
    localStorage.setItem('aura_github_token', githubToken);
    if (githubToken) {
      const loadProfile = async () => {
        try {
          const { fetchUserProfile, fetchUserRepos } = await import('./services/githubService');
          const profile = await fetchUserProfile(githubToken);
          setGithubUser(profile);
          setGithubConnected(true);
          
          // Also fetch repos if they are empty
          if (githubRepos.length === 0) {
            const repos = await fetchUserRepos(githubToken);
            setGithubRepos(repos);
          }
        } catch (err) {
          console.error("Failed to load GitHub profile:", err);
          setGithubConnected(false);
          setGithubUser(null);
        }
      };
      loadProfile();
    } else {
      setGithubConnected(false);
      setGithubUser(null);
      setGithubRepos([]);
    }
  }, [githubToken]);

  useEffect(() => {
    localStorage.setItem('aura_supabase_url', supabaseUrl);
    localStorage.setItem('aura_supabase_key', supabaseAnonKey);
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    localStorage.setItem('aura_mcp_servers', JSON.stringify(mcpServers));
  }, [mcpServers]);

  useEffect(() => {
    if (aiProvider === 'openrouter') {
      refreshModels();
    }
  }, [aiProvider]);

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

  const relayout = (preset: 'default' | 'zen' | 'modern') => {
    if (preset === 'default') {
      setLayoutMode('classic');
      setZenMode(false);
      setShowBrowser(false);
    } else if (preset === 'zen') {
      setZenMode(true);
    } else if (preset === 'modern') {
      setLayoutMode('modern');
      setZenMode(false);
    }
    appendTerminalOutput(`Layout switched to ${preset} mode.`);
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
        localProblems.push({ line: index + 1, severity: 'info', message: 'Consider removing console.log for production.' });
      }
      if (line.includes('any') && activeFile.language === 'typescript') {
        localProblems.push({ line: index + 1, severity: 'warning', message: 'Avoid using "any" type in TypeScript.' });
      }
      if (line.match(/var\s+/)) {
        localProblems.push({ line: index + 1, severity: 'warning', message: 'Use "let" or "const" instead of "var".' });
      }
      if (line.match(/==\s+/) && !line.includes('===')) {
        localProblems.push({ line: index + 1, severity: 'warning', message: 'Use strict equality (===) instead of (==).' });
      }
    });

    setProblems(localProblems);

    // Then use AI for deeper analysis if requested or as a second pass
    try {
      const currentSkill = SUPER_CLAUDE_SKILLS.find(s => s.name === selectedSkill);
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

      const jsonMatch = resultText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const aiProblems = JSON.parse(jsonMatch[0]);
        setProblems(prev => [...prev, ...aiProblems]);
        appendTerminalOutput(`Scan complete: Found ${localProblems.length + aiProblems.length} potential issues.`);
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

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAiLoading(true);

    try {
      let content = '';
      const currentSkill = SUPER_CLAUDE_SKILLS.find(s => s.name === selectedSkill);
      const skillInstruction = currentSkill ? currentSkill.instruction : '';
      
      // Check for commands in input
      let activeCommandInstruction = '';
      const command = SUPER_CLAUDE_COMMANDS.find(c => chatInput.trim().startsWith(c.command));
      if (command) {
        activeCommandInstruction = `\nActive Command: ${command.instruction}`;
      }

      // Context7 (Deep Context)
      let deepContext = '';
      if (context7Mode) {
        // Collect all open files with their contents
        const allFilesContext = files.map(f => {
          return `--- File: ${f.name} (${f.language}) ---\n${f.content || '(empty)'}\n`;
        }).join('\n');

        deepContext = `
[DEEP CONTEXT - CONTEXT7 MODE (Workspace Overview)]
You are analyzing a full workspace. Here are all the files currently opened in the IDE:
${allFilesContext}

Active File: ${activeFile?.name || 'None'}
Integrations:
- GitHub: ${githubConnected ? 'Connected' : 'Disconnected'}
- Supabase: ${supabaseConnected ? 'Connected' : 'Disconnected'}
- MCP Servers: ${mcpServers.filter(s => s.connected).map(s => s.name).join(', ') || 'None'}
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
      appendTerminalOutput('[AURA MAGIC] Terdeteksi package.json. Menyiapkan environment...');
      
      // Auto-run install and start if it looks like a new project or significant change
      if (stats.fileCount > 3 || stats.commands.some(c => c.includes('create-react-app') || c.includes('vite'))) {
        executeCommand('npm install && npm start');
        appendTerminalOutput('[AURA MAGIC] Menjalankan npm install & start di latar belakang...');
        
        // Wait for dev server to potentially start, then switch to browser
        setTimeout(() => {
          setSidebarTab('browser');
          handleAutoPreview(true);
        }, 5000);
      } else {
        handleAutoPreview(true);
      }
    } else {
      // Static/React Sandbox
      handleAutoPreview(true);
      setSidebarTab('browser');
    }
  };

  const handleAutoPreview = (force: boolean = false) => {
    if (!force) setShowBrowser(true);
    else {
      setShowBrowser(true);
      setSidebarTab('browser');
    }
    const hasPackageJson = files.some(f => f.name === 'package.json');
    const activeFileIsReact = activeFile?.name.endsWith('.tsx') || activeFile?.name.endsWith('.jsx');
    
    if (hasPackageJson && !activeFileIsReact) {
      setBrowserSrcDoc(null);
      setBrowserUrl('http://localhost:3000');
      appendTerminalOutput('[PREVIEW] Menampilkan localhost:3000. Pastikan dev server sudah running.');
    } else if (activeFileIsReact) {
      // REACT SANDBOX MODE (Babel-Standalone)
      setBrowserUrl('');
      const code = activeFile?.content || '';
      
      const srcDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { background: #0f172a; color: white; min-height: 100vh; margin: 0; font-family: sans-serif; }
            #root { height: 100%; width: 100%; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel" data-presets="react,typescript">
            ${code.replace(/export\s+default\s+function/g, 'function App')}
            ${code.includes('export default function') ? '' : (code.includes('function App') ? '' : 'function App() { return <div>Mohon gunakan "export default function App" untuk pratinjau.</div>; }')}
            
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(<App />);
          </script>
        </body>
        </html>
      `;
      setBrowserSrcDoc(srcDoc);
      appendTerminalOutput(`[PREVIEW] Generating React Sandbox for ${activeFile?.name}...`);
    } else {
      const htmlFile = files.find(f => f.name.endsWith('index.html') || f.name.endsWith('.html'));
      if (htmlFile) {
        let htmlContent = htmlFile.content;
        
        // Inject Tailwind if missing
        if (!htmlContent.includes('cdn.tailwindcss.com')) {
          htmlContent = htmlContent.replace('</head>', '<script src="https://cdn.tailwindcss.com"></script></head>');
        }

        // Inject CSS & JS ke dalam HTML
        files.forEach(f => {
          if (f.name.endsWith('.css')) {
            const cssRegex = new RegExp(`<link[^>]*href=["']\\.?/?${f.name}["'][^>]*>`, 'g');
            if (cssRegex.test(htmlContent)) {
              htmlContent = htmlContent.replace(cssRegex, `<style>${f.content}</style>`);
            } else {
              htmlContent = htmlContent.replace('</head>', `<style>${f.content}</style></head>`);
            }
          }
          if (f.name.endsWith('.js')) {
            const jsRegex = new RegExp(`<script[^>]*src=["']\\.?/?${f.name}["'][^>]*>.*?</script>`, 'g');
            if (jsRegex.test(htmlContent)) {
              htmlContent = htmlContent.replace(jsRegex, `<script>${f.content}</script>`);
            } else {
               htmlContent = htmlContent.replace('</body>', `<script>${f.content}</script></body>`);
            }
          }
        });
        
        setBrowserUrl('');
        setBrowserSrcDoc(htmlContent);
        appendTerminalOutput(`[PREVIEW] Menampilkan ${htmlFile.name} dengan Tailwind CDN.`);
      } else {
        appendTerminalOutput('[PREVIEW] Gagal: Tidak menemukan file yang bisa dipratinjau (.tsx, .jsx, atau .html).');
        alert('Harap buat file index.html atau gunakan file React (.tsx) untuk Live Preview.');
      }
    }
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

  const DEFAULT_SUPABASE_URL = 'https://ngbzuagtzlepqutnkfeo.supabase.co';
  const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nYnp1YWd0emxlcHF1dG5rZmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzgzOTcsImV4cCI6MjA4OTU1NDM5N30.x5hacVx08FJboVxTIPJaXIOF9XG2axc8AzF7qmQV1DM';

  const handleCloudSave = async () => {
    const activeUrl = supabaseUrl || DEFAULT_SUPABASE_URL;
    const activeKey = supabaseAnonKey || DEFAULT_SUPABASE_KEY;
    
    if (!activeUrl || !activeKey) {
      alert("Kredensial Cloud belum dikonfigurasi.");
      return;
    }
    const name = prompt("Simpan ke Supabase Cloud dengan Nama Project:", projectName);
    if (!name) return;
    
    appendTerminalOutput(`[CLOUD] Mengekspor ${files.length} file ke Supabase...`);
    try {
      await saveProjectToCloud({ url: activeUrl, anonKey: activeKey }, name, files);
      setProjectName(name);
      appendTerminalOutput(`[CLOUD] Project '${name}' berhasil disimpan menggunakan ${supabaseUrl ? 'Database Custom (Pengguna)' : 'Database Default Aura'}!`);
      alert("Berhasil disimpan ke Cloud!");
    } catch (err: any) {
      console.error(err);
      appendTerminalOutput(`[CLOUD ERROR] ${err.message}`);
      alert("Gagal menyimpan ke Cloud. Lihat output terminal untuk detailnya.");
    }
  };

  const handleCloudLoad = async () => {
    const activeUrl = supabaseUrl || DEFAULT_SUPABASE_URL;
    const activeKey = supabaseAnonKey || DEFAULT_SUPABASE_KEY;

    if (!activeUrl || !activeKey) {
      alert("Kredensial Cloud belum dikonfigurasi.");
      return;
    }
    try {
      appendTerminalOutput(`[CLOUD] Mengambil daftar proyek dari ${supabaseUrl ? 'Database Custom' : 'Database Default'}...`);
      const list = await listCloudProjects({ url: activeUrl, anonKey: activeKey });
      
      if (!list || list.length === 0) {
        alert("Belum ada project yang tersimpan di Cloud.");
        return;
      }
      
      const names = list.map((l: any) => l.project_name).join("\n- ");
      const name = prompt(`Pilih nama project untuk dimuat:\n\n- ${names}\n\n(Ketik nama project persis seperti di atas)`);
      
      if (!name) return;
      
      appendTerminalOutput(`[CLOUD] Mengunduh project '${name}'...`);
      const project = await loadProjectFromCloud({ url: activeUrl, anonKey: activeKey }, name);
      
      if (project && project.files) {
        setFiles(project.files);
        if (project.files.length > 0) setActiveFileId(project.files[0].id);
        setProjectName(project.project_name);
        appendTerminalOutput(`[CLOUD] Project '${project.project_name}' berhasil dimuat dengan ${project.files.length} file!`);
      }
    } catch (err: any) {
      console.error(err);
      appendTerminalOutput(`[CLOUD ERROR] ${err.message}`);
      alert(`Gagal memuat dari Cloud: ${err.message}`);
    }
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
    
    // Switch to terminal tab and bottom panel
    setBottomTab('terminal');
    setShowBottomPanel(true);

    const sessionId = activeTerminalId;
    const appendOutput = (data: string) => {
      appendTerminalOutput(data, sessionId);
    };

    // Build a VSCode-like prompt with full path
    const cwdDisplay = nativeProjectPath || 'aura-project';
    appendOutput(`${cwdDisplay} $ ${val}`);

    // If running in Tauri Desktop mode, use PowerShell as the universal shell (like VSCode)
    if (isTauri && TauriCommand) {
      try {
        const normalizedCwd = (nativeProjectPath || '.').replace(/\//g, '\\');

        // Kill existing process if any
        if (activeProcessRef.current) {
          try { await activeProcessRef.current.kill(); } catch (e) {}
          activeProcessRef.current = null;
        }

        // Add to history
        setCommandHistory(prev => [val, ...prev.filter(h => h !== val)].slice(0, 50));
        setHistoryIndex(-1);

        // --- BUILT-IN COMMANDS (handled locally, no shell needed) ---
        if (val.trim() === 'clear' || val.trim() === 'cls') {
          setTerminalSessions(prev => prev.map(s => s.id === sessionId ? { ...s, output: [] } : s));
          return;
        }
        if (val.trim() === 'aura diagnostic') {
          appendOutput(`[DIAGNOSTIC] OS: Windows`);
          appendOutput(`[DIAGNOSTIC] CWD: ${normalizedCwd}`);
          appendOutput(`[DIAGNOSTIC] Tauri Shell Plugin: Loaded`);
          appendOutput(`[DIAGNOSTIC] Shell Engine: PowerShell (VSCode-compatible)`);
          return;
        }
        if (val.trim() === 'pwd') {
          appendOutput(normalizedCwd);
          return;
        }

        // --- Handle 'cd' command to change working directory ---
        if (val.trim().startsWith('cd ')) {
          const target = val.trim().substring(3).trim().replace(/"/g, '').replace(/'/g, '');
          let newPath = '';
          if (target === '..') {
            const parts = normalizedCwd.split('\\');
            parts.pop();
            newPath = parts.join('\\') || 'C:\\';
          } else if (/^[a-zA-Z]:\\/.test(target) || /^[a-zA-Z]:\\\\/.test(target)) {
            // Absolute path
            newPath = target.replace(/\//g, '\\');
          } else {
            newPath = `${normalizedCwd}\\${target}`.replace(/\//g, '\\');
          }
          setNativeProjectPath(newPath.replace(/\\\\/g, '\\'));
          appendOutput(`✓ Pindah ke: ${newPath}`);
          return;
        }

        // --- UNIVERSAL SHELL EXECUTION (Tauri v2 Standard) ---
        let cmdInstance;
        try {
          // Setup the command listener first
          cmdInstance = TauriCommand.create(
            'powershell',
            ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', val],
            { cwd: normalizedCwd }
          );
        } catch (psErr: any) {
          // Fallback to cmd.exe
          cmdInstance = TauriCommand.create(
            'cmd',
            ['/C', val],
            { cwd: normalizedCwd }
          );
        }

        if (!cmdInstance) throw new Error("Gagal menginisialisasi Command instance.");

        // Attach listeners to the command instance BEFORE spawning (v2 API)
        cmdInstance.on('stdout', (data: string) => {
          if (data) appendOutput(data);
        });

        cmdInstance.on('stderr', (data: string) => {
          if (data) appendOutput(data);
        });

        cmdInstance.on('close', (data: { code: number | null }) => {
          activeProcessRef.current = null;
          if (data?.code !== 0 && data?.code !== null) {
            appendOutput(`Process exited with code ${data.code}`);
          }
        });

        // Spawn the process
        const child = await cmdInstance.spawn();
        activeProcessRef.current = child;

        return; 
      } catch (err: any) {
        console.error('Tauri Shell Error:', err);
        appendOutput(`[ERROR] ${err?.message || 'Gagal menjalankan perintah.'}`);
        activeProcessRef.current = null;
      }
    } else {
      // Fallback Simulator (only for Browser mode where no Tauri is available)
      const cmd = val.toLowerCase();
      if (cmd === 'clear' || cmd === 'cls') {
        setTerminalSessions(prev => prev.map(s => s.id === sessionId ? { ...s, output: [] } : s));
      } else if (cmd === 'ls' || cmd === 'dir') {
        appendOutput(files.map(f => f.name).join('  '));
      } else if (cmd === 'help') {
        appendOutput('Available: clear, ls, help, build, aura --version');
      } else if (cmd === 'build' || cmd === 'npm run build') {
        appendOutput('> aura-project@1.0.0 build');
        appendOutput('✓ built in 1.23s (Simulated)');
      } else if (cmd === 'aura --version') {
        appendOutput('Aura IDE v5.1.1 (Browser Simulator)');
      } else {
        appendOutput(`[BROWSER MODE] Perintah "${val}" tidak didukung. Harap gunakan aplikasi Desktop (.exe) untuk akses Terminal asli.`);
      }
    }
  };

  const handleTerminalCommand = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const val = terminalInput.trim();
      if (!val) return;
      setTerminalInput('');
      await executeCommand(val);
    }
  };

    return (
    <div className="h-[100dvh] w-full bg-[#1e1e1e] text-[#cccccc] flex flex-col overflow-hidden font-sans selection:bg-blue-500/30 relative">
      <TitleBar projectName={projectName} />
      
      {/* Top Menu Bar */}
      <div className="h-8 bg-[#1e1e1e] border-b border-white/5 flex items-center px-4 text-[12px] text-[#cccccc] gap-4 shrink-0 z-[60] relative">
        <div className="relative group cursor-pointer hover:text-white px-2 py-1.5">
          <span>File</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[180px]">
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={isTauri ? openFolderNative : openFolder}>Open Folder</div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={createNewFile}>New File</div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={handleSaveFile}>Save Active File (Ctrl+S)</div>
            <div className="h-[1px] bg-white/10 my-1"></div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={exportProject}>Export Project (ZIP)</div>
          </div>
        </div>
        <div className="relative group cursor-pointer hover:text-white px-2 py-1.5">
          <span>View</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[190px]">
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex justify-between items-center" onClick={() => setShowAiPanel(!showAiPanel)}>
              <span>Panel AI Chat (Kanan)</span>
              {showAiPanel && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
            </div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex justify-between items-center" onClick={() => setShowBottomPanel(!showBottomPanel)}>
              <span>Panel Terminal (Bawah)</span>
              {showBottomPanel && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
            </div>
            <div className="h-[1px] bg-white/10 my-1"></div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setLayoutMode(layoutMode === 'classic' ? 'modern' : 'classic')}>Toggle Modern Layout</div>
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setZenMode(!zenMode)}>Toggle Zen Mode</div>
          </div>
        </div>
        <div className="relative group cursor-pointer hover:text-white px-2 py-1.5">
          <span>Settings</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[200px]">
             <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setSidebarTab('settings')}>Pengaturan Global</div>
             <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setSidebarTab('github')}>Koneksi GitHub</div>
             <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setSidebarTab('database')}>Koneksi Database</div>
          </div>
        </div>
        <div className="relative group cursor-pointer hover:text-white px-2 py-1.5">
          <span>Help</span>
          <div className="absolute top-full left-0 mt-0 bg-[#252526] border border-white/10 rounded shadow-2xl py-1 hidden group-hover:block min-w-[160px]">
            <div className="px-4 py-2 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors" onClick={() => setShowGuideModal(true)}>Read Guidance</div>
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
                  { icon: <Layout size={16} />, label: 'Relayout: Modern', action: () => relayout('modern') },
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
        setGithubConnected={setGithubConnected}
        githubToken={githubToken}
        setGithubToken={setGithubToken}
        githubRepos={githubRepos}
        setGithubRepos={setGithubRepos}
        isFetchingRepos={isFetchingRepos}
        setIsFetchingRepos={setIsFetchingRepos}
        repoSearchInput={repoSearchInput}
        setRepoSearchInput={setRepoSearchInput}
        handleCloneRepo={handleCloneRepo}
        browserUrl={browserUrl}
        setBrowserUrl={setBrowserUrl}
        browserSrcDoc={browserSrcDoc}
        setBrowserSrcDoc={setBrowserSrcDoc}
        setShowBrowser={setShowBrowser}
        isTauri={isTauri}
        TauriCommand={TauriCommand}
        openFolderNative={openFolderNative}
        createNewFile={createNewFile}
        openFolder={openFolder}
        closeFolder={closeFolder}
        autoPreview={handleAutoPreview}
        onAiSuccess={handleAiSuccess}
        exportProject={exportProject}
        handleCloudSave={handleCloudSave}
        handleCloudLoad={handleCloudLoad}
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
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseAnonKey={supabaseAnonKey}
        setSupabaseAnonKey={setSupabaseAnonKey}
        supabaseConnected={supabaseConnected}
        setSupabaseConnected={setSupabaseConnected}
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
        testSupabase={testSupabase}
        testingStatus={testingStatus}
        testAiConnection={testAiConnection}
        testGithubConnection={testGithubConnection}
        testError={testError}
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
            <button 
              onClick={() => setShowBrowser(!showBrowser)}
              className={cn(
                "p-1.5 rounded transition-colors flex items-center gap-1.5 text-xs font-medium",
                showBrowser ? "bg-blue-600 text-white" : "text-[#858585] hover:text-white hover:bg-white/5"
              )}
              title="Toggle Internal Browser"
            >
              <Globe size={14} />
              <span>Browser</span>
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
            showBrowser={showBrowser}
            setShowBrowser={setShowBrowser}
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
            browserWidth={browserWidth}
            setIsResizingBrowser={setIsResizingBrowser}
            browserUrl={browserUrl}
            setBrowserUrl={setBrowserUrl}
            browserSrcDoc={browserSrcDoc}
            setBrowserSrcDoc={setBrowserSrcDoc}
          />
        </div>
      </div>

        {/* Bottom Panel (Terminal & Problems) */}
        {showBottomPanel && (
          <BottomPanel
            zenMode={zenMode}
            bottomPanelHeight={bottomPanelHeight}
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
          />
        )}

      </div>
      
      {/* 3rd Column (Right Panel): AI Chat / Composer */}
      {!zenMode && showAiPanel && (
        <div 
          className={cn(
            "h-full w-[360px] flex flex-col shrink-0 bg-[#202021] z-30 transition-all duration-300 shadow-2xl",
            layoutMode === 'modern' ? "border-r border-white/5" : "border-l border-white/5"
          )}
        >
          <div className="p-3 border-b border-white/5 bg-[#252526]/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <span className="text-[11px] font-black tracking-widest uppercase text-blue-400 flex items-center gap-2">
              <Sparkles size={14} /> Aura AI Prompt
            </span>
            <button 
              onClick={() => setShowAiPanel(false)} 
              className="hover:bg-red-500/20 hover:text-red-400 p-1 rounded-md transition-colors text-white/50" 
              title="Sembunyikan Panel (Tampilkan via Menu View)"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
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
              onExecuteCommand={executeCommand}
              onApplyCode={(path, content) => {
                setFiles(currentFiles => {
                  const idx = currentFiles.findIndex(f => f.id === path || f.name === path);
                  if (idx !== -1) {
                    const existing = currentFiles[idx];
                    if (existing.content === content) return currentFiles;
                    const updated = [...currentFiles];
                    updated[idx] = { ...existing, content };
                    return updated;
                  }
                  return [...currentFiles, { 
                    id: path, 
                    name: path.split('/').pop() || path, 
                    content, 
                    language: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript'
                  }];
                });
                if (activeFileId !== path) setActiveFileId(path);
              }}
            />
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
            <div className="hover:bg-white/10 px-3 h-full flex items-center cursor-pointer transition-colors border-l border-white/10 text-white/70 italic">
              Ctrl+Shift+P for Commands
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
