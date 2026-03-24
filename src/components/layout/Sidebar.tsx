import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { getFileIcon, getFolderIcon } from '@/utils/icons';
import Markdown from 'react-markdown';
import { AuraLogo } from '@/components/layout/AuraLogo';
import { 
  FileCode, Search, Sparkles, GitBranch, Github, Globe, HelpCircle, 
  Settings, ChevronRight, X, RotateCcw, Monitor, Smartphone, Layout, 
  Eye, FolderOpen, Download, Terminal, Plus,
  FolderTree, RefreshCw, Bot, User, ImageIcon, FileIcon, Paperclip, Send,
  Cpu, ExternalLink, CheckCircle, AlertTriangle, Play, ChevronDown, Database,
  ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { FileItem, ChatMessage, CodeProblem, McpServer, TerminalSession } from '@/types';
import { 
  FREE_MODELS, BYTEZ_MODELS, SUMOPOD_MODELS, GEMINI_MODELS,
  SUPER_CLAUDE_SKILLS, SUPER_CLAUDE_COMMANDS, MCP_TEMPLATES 
} from '@/utils/constants';
import { AiComposerPanel } from '../AiComposer/AiComposerPanel';

interface SidebarProps {
  layoutMode: 'classic' | 'modern';
  zenMode: boolean;
  sidebarTab: 'files' | 'search' | 'git' | 'ai' | 'github' | 'settings' | 'browser' | 'database';
  setSidebarTab: (tab: 'files' | 'search' | 'git' | 'ai' | 'github' | 'settings' | 'browser' | 'database') => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isResizingSidebar: boolean;
  setIsResizingSidebar: (isResizing: boolean) => void;
  setShowGuideModal: (show: boolean) => void;
  files: FileItem[];
  setFiles: (files: FileItem[] | ((prev: FileItem[]) => FileItem[])) => void;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  fileSearchInput: string;
  setFileSearchInput: (input: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  composerMessages: any[];
  setComposerMessages: React.Dispatch<React.SetStateAction<any[]>>;
  chatInput: string;
  setChatInput: (input: string) => void;
  isAiLoading: boolean;
  handleSendMessage: () => void;
  attachedFiles: { name: string; type: string; data: string; content?: string }[];
  setAttachedFiles: React.Dispatch<React.SetStateAction<{ name: string; type: string; data: string; content?: string }[]>>;
  removeAttachment: (index: number) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;
  githubUser: any | null;
  githubConnected: boolean;
  setGithubConnected: (connected: boolean) => void;
  githubToken: string;
  setGithubToken: (token: string) => void;
  githubRepos: any[];
  setGithubRepos: (repos: any[]) => void;
  isFetchingRepos: boolean;
  setIsFetchingRepos: (fetching: boolean) => void;
  repoSearchInput: string;
  setRepoSearchInput: (input: string) => void;
  handleCloneRepo: (repo: any) => void;
  browserUrl: string;
  setBrowserUrl: (url: string) => void;
  browserSrcDoc: string | null;
  setBrowserSrcDoc: (doc: string | null) => void;
  setShowBrowser: (show: boolean) => void;
  isTauri: boolean;
  TauriCommand: any;
  openFolderNative: () => void;
  createNewFile: () => void;
  openFolder: () => void;
  closeFolder: () => void;
  autoPreview: (force?: boolean) => void;
  onAiSuccess?: (stats: { fileCount: number; commands: string[] }) => void;
  exportProject: () => void;
  handleGithubPush: () => void;
  executeCommand: (cmd: string) => void;
  appendTerminalOutput: (msg: string | string[], sessionId?: string) => void;
  handleContextMenu: (e: React.MouseEvent, fileId: string) => void;

  // Settings specific state
  relayout: (preset: 'default' | 'zen') => void;
  setLayoutMode: (mode: 'classic' | 'modern') => void;
  setZenMode: (mode: boolean) => void;
  aiProvider: 'gemini' | 'openrouter' | 'bytez' | 'sumopod';
  setAiProvider: (provider: 'gemini' | 'openrouter' | 'bytez' | 'sumopod') => void;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  bytezApiKey: string;
  setBytezApiKey: (key: string) => void;
  bytezModel: string;
  setBytezModel: (model: string) => void;
  sumopodApiKey: string;
  setSumopodApiKey: (key: string) => void;
  sumopodModel: string;
  setSumopodModel: (model: string) => void;
  openRouterApiKey: string;
  setOpenRouterApiKey: (key: string) => void;
  openRouterModel: string;
  setOpenRouterModel: (model: string) => void;
  dynamicFreeModels: any[];
  isFetchingModels: boolean;
  refreshModels: () => void;
  systemInstruction: string;
  setSystemInstruction: (inst: string) => void;
  aiRules: string;
  setAiRules: (rules: string) => void;
  selectedSkill: string;
  setSelectedSkill: (skill: string) => void;
  context7Mode: boolean;
  setContext7Mode: (mode: boolean) => void;
  mcpServers: McpServer[];
  setMcpServers: React.Dispatch<React.SetStateAction<McpServer[]>>;
  selectedMcpTemplateIdx: number | 'custom';
  setSelectedMcpTemplateIdx: (idx: number | 'custom') => void;
  mcpTemplateData: Record<string, string>;
  setMcpTemplateData: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  newMcpName: string;
  setNewMcpName: (name: string) => void;
  newMcpType: 'sse' | 'stdio';
  setNewMcpType: (type: 'sse' | 'stdio') => void;
  newMcpUrl: string;
  setNewMcpUrl: (url: string) => void;
  newMcpEnvStr: string;
  setNewMcpEnvStr: (env: string) => void;
  showMcpLogsFor: string | null;
  setShowMcpLogsFor: (name: string | null) => void;
  activeMcpLogs: string[];
  setActiveMcpLogs: (logs: string[]) => void;
  testingStatus: Record<string, 'idle' | 'loading' | 'success' | 'error'>;
  testAiConnection: (provider: 'gemini' | 'openrouter' | 'bytez' | 'sumopod') => Promise<void>;
  testGithubConnection: () => Promise<void>;
  resetAllConnections: () => void;
  testError: Record<string, string>;
  nativeProjectPath: string | null;
}

type FileTreeItem = {
  id: string;
  name: string;
  kind: 'file' | 'folder';
  children?: FileTreeItem[];
  file?: FileItem;
};

const buildFileTree = (files: FileItem[], rootPath: string | null): FileTreeItem[] => {
  const root: FileTreeItem[] = [];
  
  files.forEach(file => {
    let relPath = file.id;
    if (rootPath && file.id.startsWith(rootPath)) {
      relPath = file.id.substring(rootPath.length).replace(/^[\\/]/, '');
    }
    
    const parts = relPath.split(/[\\/]/);
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      if (!part) return;
      const isLast = index === parts.length - 1;
      let existing = currentLevel.find(item => item.name === part);
      
      if (existing) {
        if (!isLast && existing.kind === 'folder') {
          currentLevel = existing.children!;
        }
      } else {
        const newItem: FileTreeItem = {
          id: isLast ? file.id : parts.slice(0, index + 1).join('/'),
          name: part,
          kind: isLast ? 'file' : 'folder',
          children: isLast ? undefined : [],
          file: isLast ? file : undefined
        };
        currentLevel.push(newItem);
        if (!isLast) {
          currentLevel = newItem.children!;
        }
      }
    });
  });
  
  const sortTree = (items: FileTreeItem[]) => {
    items.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    items.forEach(item => {
      if (item.children) sortTree(item.children);
    });
  };
  
  sortTree(root);
  return root;
};

const TreeItem: React.FC<{
  item: FileTreeItem;
  level: number;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  handleContextMenu: (e: React.MouseEvent, id: string) => void;
}> = ({ item, level, activeFileId, setActiveFileId, handleContextMenu }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = activeFileId === item.id;

  if (item.kind === 'folder') {
    return (
      <div className="flex flex-col">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-0.5 hover:bg-white/5 cursor-pointer group transition-colors"
          style={{ paddingLeft: `${level * 10 + 8}px` }}
        >
          <span className={cn("transition-transform duration-200", isOpen ? "rotate-90" : "")}>
            <ChevronRightIcon size={12} className="text-gray-500" />
          </span>
          {getFolderIcon(isOpen)}
          <span className="text-[11px] text-gray-400 font-medium truncate">{item.name}</span>
        </div>
        {isOpen && item.children?.map(child => (
          <TreeItem 
            key={child.id} 
            item={child} 
            level={level + 1} 
            activeFileId={activeFileId} 
            setActiveFileId={setActiveFileId}
            handleContextMenu={handleContextMenu}
          />
        ))}
      </div>
    );
  }

  return (
    <div 
      onClick={() => setActiveFileId(item.id)}
      onContextMenu={(e) => handleContextMenu(e, item.id)}
      className={cn(
        "flex items-center gap-2 px-2 py-0.5 cursor-pointer text-[12px] transition-colors group relative border-l-2 border-transparent",
        isSelected ? "bg-blue-600/10 text-blue-400 border-blue-500" : "hover:bg-white/5 text-[#cccccc]"
      )}
      style={{ paddingLeft: `${level * 10 + 20}px` }}
    >
      {getFileIcon(item.name)}
      <span className="truncate">{item.name}</span>
      {isSelected && <div className="absolute right-2 w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  layoutMode, zenMode, sidebarTab, setSidebarTab,
  sidebarWidth, setSidebarWidth, isResizingSidebar, setIsResizingSidebar,
  setShowGuideModal, files, setFiles, activeFileId, setActiveFileId,
  fileSearchInput, setFileSearchInput, chatMessages, setChatMessages,
  composerMessages, setComposerMessages,
  chatInput, setChatInput, isAiLoading, handleSendMessage,
  attachedFiles, setAttachedFiles, removeAttachment, handleFileUpload,
  fileInputRef, chatEndRef, githubUser, githubConnected, setGithubConnected,
  githubToken, setGithubToken, githubRepos, setGithubRepos,
  isFetchingRepos, setIsFetchingRepos, repoSearchInput, setRepoSearchInput,
  handleCloneRepo, browserUrl, setBrowserUrl, browserSrcDoc, setBrowserSrcDoc,
  setShowBrowser, isTauri, TauriCommand, openFolderNative,
  createNewFile, openFolder, closeFolder, exportProject,
  autoPreview, onAiSuccess,
  handleGithubPush, executeCommand,
  appendTerminalOutput, handleContextMenu,

  relayout, setLayoutMode, setZenMode, aiProvider, setAiProvider,
  geminiApiKey, setGeminiApiKey, selectedModel, setSelectedModel,
  bytezApiKey, setBytezApiKey, bytezModel, setBytezModel,
  sumopodApiKey, setSumopodApiKey, sumopodModel, setSumopodModel,
  openRouterApiKey, setOpenRouterApiKey, openRouterModel, setOpenRouterModel,
  dynamicFreeModels, isFetchingModels, refreshModels,
  systemInstruction, setSystemInstruction, aiRules, setAiRules,
  selectedSkill, setSelectedSkill, context7Mode, setContext7Mode,
  resetAllConnections,
  mcpServers, setMcpServers,
  selectedMcpTemplateIdx, setSelectedMcpTemplateIdx, mcpTemplateData, setMcpTemplateData,
  newMcpName, setNewMcpName, newMcpType, setNewMcpType,
  newMcpUrl, setNewMcpUrl, newMcpEnvStr, setNewMcpEnvStr,
  showMcpLogsFor, setShowMcpLogsFor, activeMcpLogs, setActiveMcpLogs,
  testingStatus, testAiConnection,
  testGithubConnection, testError,
  nativeProjectPath
}) => {

  const ConnectionStatus: React.FC<{ 
    status: 'idle' | 'loading' | 'success' | 'error', 
    error?: string,
    onTest: () => void,
    label?: string
  }> = ({ status, error, onTest, label = "Test Connection" }) => {
    return (
      <div className="flex flex-col gap-2 mt-1">
        <button 
          onClick={onTest}
          disabled={status === 'loading'}
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border",
            status === 'success' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
            status === 'error' ? "bg-red-500/10 border-red-500/30 text-red-400" :
            "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
          )}
        >
          {status === 'loading' ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle size={12} />
          ) : status === 'error' ? (
            <AlertTriangle size={12} />
          ) : (
            <Play size={12} />
          )}
          {status === 'loading' ? 'Testing...' : status === 'success' ? 'Connected' : status === 'error' ? 'Failed' : label}
        </button>
        {status === 'error' && error && (
          <p className="text-[9px] text-red-400/70 italic px-1 leading-tight">{error}</p>
        )}
      </div>
    );
  };

  if (zenMode) return null;

  return (
    <>
      {/* Activity Bar */}
      <div className={cn(
        "w-12 h-full bg-[#181818] flex flex-col items-center py-4 gap-3 z-50 glass-dark shrink-0",
        layoutMode === 'modern' ? "border-l border-white/5" : "border-r border-white/5"
      )}>
        <div 
          onClick={() => setSidebarTab('files')}
          title="Explorer (Ctrl+Shift+E)"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'files' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <FileCode size={20} className={cn("transition-transform duration-200", sidebarTab === 'files' && "scale-110")} />
          {sidebarTab === 'files' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('search')}
          title="Search (Ctrl+Shift+F)"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'search' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <Search size={20} className={cn("transition-transform duration-200", sidebarTab === 'search' && "scale-110")} />
          {sidebarTab === 'search' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('ai')}
          title="Aura AI Chat (Ctrl+Shift+A)"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'ai' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <Sparkles size={20} className={cn("transition-transform duration-200", sidebarTab === 'ai' && "scale-110")} />
          {sidebarTab === 'ai' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('git')}
          title="Source Control (Ctrl+Shift+G)"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'git' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <GitBranch size={20} className={cn("transition-transform duration-200", sidebarTab === 'git' && "scale-110")} />
          {sidebarTab === 'git' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('github')}
          title="GitHub Integration"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'github' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <Github size={20} className={cn("transition-transform duration-200", sidebarTab === 'github' && "scale-110")} />
          {githubConnected && (
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 border border-[#333] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          )}
          {sidebarTab === 'github' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('browser')}
          title="Internal Browser"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'browser' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <Globe size={20} className={cn("transition-transform duration-200", sidebarTab === 'browser' && "scale-110")} />
          {sidebarTab === 'browser' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div 
          onClick={() => setSidebarTab('database')}
          title="Database Explorer"
          className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'database' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
          <Database size={20} className={cn("transition-transform duration-200", sidebarTab === 'database' && "scale-110")} />
          {sidebarTab === 'database' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
        </div>
        <div className="mt-auto flex flex-col gap-2 w-full items-center">
          <div 
            onClick={() => setShowGuideModal(true)}
            title="Panduan Workflow"
            className="p-2 cursor-pointer transition-all duration-200 rounded-xl text-[#858585] hover:text-white hover:bg-white/5"
          >
            <HelpCircle size={20} />
          </div>
          <div 
            onClick={() => setSidebarTab('settings')}
            title="Settings"
            className={cn("p-2 cursor-pointer transition-all duration-200 rounded-xl group relative", sidebarTab === 'settings' ? "text-white bg-blue-600/20 shadow-lg shadow-blue-500/10" : "text-[#858585] hover:text-white hover:bg-white/5")}
        >
            <Settings size={20} className={cn("transition-transform duration-200", sidebarTab === 'settings' && "scale-110")} />
            {sidebarTab === 'settings' && <motion.div layoutId="activeTab" className="absolute left-[-12px] w-1 h-8 bg-blue-500 rounded-r-full" />}
          </div>
        </div>
      </div>

      {/* Sidebar Content */}
      <motion.div 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarWidth, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        style={{ width: sidebarWidth }}
        className={cn(
          "bg-[#252526] h-full flex flex-col overflow-hidden relative transition-[width] duration-75 shrink-0",
          layoutMode === 'modern' ? "border-l border-white/5" : "border-r border-white/5"
        )}
      >
        {/* Resizer Handle (Vertical) */}
        <div 
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingSidebar(true);
            document.body.style.cursor = 'col-resize';
          }}
          className={cn(
            "absolute top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50",
            layoutMode === 'modern' ? "left-0" : "right-0"
          )}
        />
        
        {/* Sidebar Header */}
        <div className="p-2 text-[10px] uppercase tracking-widest font-black text-[#bbbbbb] flex justify-between items-center border-b border-white/5 bg-[#252526]/50 backdrop-blur-sm sticky top-0 z-10 min-h-[40px]">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse" />
            {sidebarTab === 'files' && ''}
            {sidebarTab === 'search' && 'Search'}
            {sidebarTab === 'git' && 'Source Control'}
            {sidebarTab === 'ai' && 'Aura AI Chat'}
            {sidebarTab === 'github' && 'GitHub'}
            {sidebarTab === 'settings' && 'Settings'}
            {sidebarTab === 'browser' && 'Browser'}
            {sidebarTab === 'database' && 'Database Explorer'}
          </span>
          <div className="flex items-center gap-2">
            {sidebarTab === 'ai' && (
              <button onClick={() => setChatMessages([])} title="Clear Chat" className="hover:text-white transition-colors">
                <RefreshCw size={14} />
              </button>
            )}
            {sidebarTab === 'files' && (
              <div className="flex items-center gap-2.5">
                <button onClick={createNewFile} title="New File" className="hover:text-white transition-colors">
                  <Plus size={14} />
                </button>
                {TauriCommand && (
                  <button onClick={openFolderNative} title="Open Folder Proyek (Native - Support Terminal/NPM)" className="hover:text-yellow-400 transition-colors relative group">
                    <FolderTree size={14} />
                  </button>
                )}
                <button onClick={openFolder} title="Open Folder Lokal (Web)" className="hover:text-white transition-colors">
                  <FolderOpen size={14} />
                </button>
                
                <div className="w-[1px] h-3.5 bg-white/10 my-auto mx-0.5" />
                
                <div className="w-[1px] h-3.5 bg-white/10 my-auto mx-0.5" />
                
                <button onClick={() => autoPreview()} title="Live Preview Auto" className="hover:text-green-400 transition-colors">
                  <Play size={14} />
                </button>
                <button onClick={exportProject} title="Export Project (ZIP)" className="hover:text-white transition-colors">
                  <Download size={14} />
                </button>

                <div className="w-[1px] h-3.5 bg-white/10 my-auto mx-0.5" />

                <button onClick={closeFolder} title="Close Folder" className="hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
            {sidebarTab === 'git' && (
              <div className="flex gap-2.5">
                <button onClick={() => executeCommand('git fetch')} title="Fetch from Remote" className="hover:text-blue-400 transition-colors">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => executeCommand('git status')} title="Check Status" className="hover:text-white transition-colors">
                  <Search size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            
            {/* FILES TAB */}
            {sidebarTab === 'files' && (
              <motion.div 
                key="files"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-1 px-2 py-1 hover:bg-[#2a2d2e] cursor-pointer group">
                  <ChevronDown size={16} />
                  <span className="text-[13px] font-bold">AURA-PROJECT</span>
                </div>
                <div className="flex flex-col mt-1">
                  {buildFileTree(files, nativeProjectPath).map(item => (
                    <TreeItem 
                      key={item.id} 
                      item={item} 
                      level={0} 
                      activeFileId={activeFileId} 
                      setActiveFileId={setActiveFileId}
                      handleContextMenu={handleContextMenu}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            
            {/* SEARCH TAB */}
            {sidebarTab === 'search' && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col p-4 gap-4"
              >
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585] group-focus-within:text-blue-500 transition-colors" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search text in files..."
                    className="w-full bg-[#3c3c3c] border border-white/5 rounded-md py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                    autoFocus
                  />
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold px-1">Results</p>
                  <div className="text-center py-10 opacity-30 italic text-[11px]">No search results yet</div>
                </div>
              </motion.div>
            )}

            {/* AI TAB */}
            {sidebarTab === 'ai' && (
              <motion.div 
                key="ai"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col h-full overflow-hidden"
              >
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
                  onSuccess={onAiSuccess}
                  projectTree={files.map(f => f.id).join('\n')}
                  messages={composerMessages}
                  setMessages={setComposerMessages}
                  onExecuteCommand={executeCommand}
                  onApplyCode={(path, content, action) => {
                    const isDelete = action === 'delete';
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
                    if (!isDelete && activeFileId !== path) setActiveFileId(path);
                  }}
                />
              </motion.div>
            )}


            {/* GITHUB TAB */}
            {sidebarTab === 'github' && (
              <motion.div 
                key="github"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col p-4 gap-4"
              >
                {!githubToken ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                    <Github size={48} className="opacity-20" />
                    <div className="space-y-1">
                      <p className="text-[13px] font-bold text-white">GitHub not connected</p>
                      <p className="text-[11px] text-gray-500">Enter your Personal Access Token in Settings to manage repositories.</p>
                    </div>
                    <button 
                      onClick={() => setSidebarTab('settings')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[12px] font-bold transition-all"
                    >
                      Configure in Settings
                    </button>
                  </div>
                ) : (
                  <>
                    <ConnectionStatus 
                      status={testingStatus.github || 'idle'} 
                      error={testError.github}
                      onTest={testGithubConnection}
                      label="Refresh Connection"
                    />

                    {githubUser && (
                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-3">
                        <img 
                          src={githubUser.avatar_url} 
                          alt={githubUser.login} 
                          className="w-10 h-10 rounded-full border border-emerald-500/50"
                        />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-[12px] font-bold text-white truncate">{githubUser.name || githubUser.login}</h4>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <p className="text-[10px] text-gray-500 truncate leading-tight">@{githubUser.login}</p>
                        </div>
                        <a 
                          href={githubUser.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                          title="View on GitHub"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                    
                    <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#858585] group-focus-within:text-blue-500 transition-colors" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search your repositories..."
                        value={repoSearchInput}
                        onChange={e => setRepoSearchInput(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-white/5 rounded-md py-1.5 pl-9 pr-3 text-[13px] focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                      />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar min-h-0">
                      {isFetchingRepos ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50 animate-pulse">
                          <RefreshCw size={24} className="animate-spin mb-2" />
                          <span className="text-[11px]">Fetching repositories...</span>
                        </div>
                      ) : githubRepos.length === 0 ? (
                        <div className="text-center py-10 opacity-30 italic text-[11px]">No repositories found</div>
                      ) : (
                        githubRepos.filter(r => r.name.toLowerCase().includes(repoSearchInput.toLowerCase())).map(repo => (
                          <div 
                            key={repo.id}
                            className="p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer group transition-all"
                            onClick={() => handleCloneRepo(repo)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[13px] font-bold text-gray-200 group-hover:text-white truncate">{repo.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-gray-500 uppercase">{repo.private ? 'Private' : 'Public'}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate mb-2">{repo.description || 'No description'}</p>
                            <div className="flex items-center gap-3 text-[10px] text-gray-600">
                              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> {repo.language || 'Plain'}</div>
                              <div className="flex items-center gap-1">⭐ {repo.stargazers_count}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {/* BROWSER TAB */}
            {sidebarTab === 'browser' && (
              <motion.div 
                key="browser"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col p-4 gap-4"
              >
                <div className="space-y-4">
                  <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl space-y-2">
                    <h4 className="text-[12px] font-bold text-blue-400 flex items-center gap-2 italic">
                      <Monitor size={14} /> Internal Preview Mode
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Aura's internal browser allows you to preview your HTML/JS applications side-by-side with the code.
                    </p>
                    <button 
                      onClick={() => setShowBrowser(true)}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Layout size={14} /> Open Preview Panel
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase px-2">Global URL Navigation</label>
                    <div className="relative group">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500" size={14} />
                      <input 
                        type="text" 
                        placeholder="https://google.com"
                        value={browserUrl}
                        onChange={e => setBrowserUrl(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-white/5 rounded-xl py-2 pl-9 pr-3 text-[12px] focus:outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setBrowserUrl('https://www.google.com/search?igu=1')} className="p-2 bg-white/5 rounded-lg text-[10px] hover:bg-white/10 text-gray-400">Google</button>
                    <button onClick={() => setBrowserUrl('https://github.com')} className="p-2 bg-white/5 rounded-lg text-[10px] hover:bg-white/10 text-gray-400">GitHub</button>
                    <button onClick={() => setBrowserUrl('https://stackblitz.com')} className="p-2 bg-white/5 rounded-lg text-[10px] hover:bg-white/10 text-gray-400">StackBlitz</button>
                    <button onClick={() => setBrowserUrl('https://tailwindcss.com')} className="p-2 bg-white/5 rounded-lg text-[10px] hover:bg-white/10 text-gray-400">Tailwind Docs</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* DATABASE TAB */}
            {sidebarTab === 'database' && (
              <motion.div 
                key="database"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col p-4 gap-6 overflow-y-auto custom-scrollbar"
              >

                {/* MCP Database Tools */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#adbac7] flex items-center gap-2">
                      <Database size={14} className="text-orange-500" /> Database Tools
                    </h3>
                    <span className="text-[10px] text-gray-600 font-mono">MCP Protocol</span>
                  </div>

                  <div className="space-y-2">
                    {mcpServers.some(s => s.name.toLowerCase().includes('sql') || s.name.toLowerCase().includes('db') || s.name.toLowerCase().includes('postgres')) ? (
                      mcpServers.filter(s => s.name.toLowerCase().includes('sql') || s.name.toLowerCase().includes('db') || s.name.toLowerCase().includes('postgres')).map(s => (
                        <div key={s.name} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-orange-400 group-hover:text-orange-300 transition-colors">{s.name}</span>
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </div>
                          <div className="space-y-1.5">
                            {s.tools.map((t: any) => (
                              <button 
                                key={t.name}
                                className="w-full text-left px-2 py-1.5 bg-black/20 hover:bg-black/40 rounded text-[11px] text-gray-400 hover:text-white transition-all flex items-center justify-between italic"
                              >
                                <span className="truncate max-w-[150px]">{t.name}</span>
                                <Plus size={10} className="opacity-0 group-hover:opacity-50" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-30">
                        <Database size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-[10px] italic">No active Database servers found. Connect SQLite or Postgres via Settings.</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SETTINGS TAB */}
            {sidebarTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-3 space-y-4 custom-scrollbar h-full overflow-y-auto"
              >
                {/* Visual Section */}
                <section className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                    <Layout size={12} /> Appearance & Layout
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between p-2.5 bg-[#333333]/50 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="space-y-0.5">
                        <p className="text-[11px] font-medium text-white italic">Layout Presets</p>
                        <p className="text-[9px] text-gray-500">Quick toggle modes</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => relayout('default')} className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-[9px] font-bold hover:bg-blue-600 hover:text-white transition-all">DEFAULT</button>
                        <button onClick={() => relayout('zen')} className="px-2 py-1 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg text-[9px] font-bold hover:bg-purple-600 hover:text-white transition-all">ZEN</button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* AI Configuration Section */}
                <section className="space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-purple-500 flex items-center gap-2">
                    <Sparkles size={12} /> AI Intelligence Center
                  </h3>
                  
                  <div className="space-y-3 bg-black/20 p-2.5 rounded-xl border border-white/5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Provider & Model</label>
                      <div className="flex flex-col gap-1.5">
                        <select 
                          value={aiProvider}
                          onChange={(e: any) => setAiProvider(e.target.value)}
                          className="bg-[#3c3c3c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] outline-none text-white focus:border-purple-500/50"
                        >
                          <option value="gemini">Google Gemini</option>
                          <option value="openrouter">OpenRouter</option>
                          <option value="bytez">Bytez AI</option>
                          <option value="sumopod">SumoPod</option>
                        </select>
                        <select 
                          value={aiProvider === 'gemini' ? selectedModel : aiProvider === 'openrouter' ? openRouterModel : aiProvider === 'bytez' ? bytezModel : sumopodModel}
                          onChange={(e: any) => {
                            if (aiProvider === 'gemini') setSelectedModel(e.target.value);
                            else if (aiProvider === 'openrouter') setOpenRouterModel(e.target.value);
                            else if (aiProvider === 'bytez') setBytezModel(e.target.value);
                            else setSumopodModel(e.target.value);
                          }}
                          className="bg-[#3c3c3c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] outline-none text-white focus:border-purple-500/50 w-full"
                        >
                          {aiProvider === 'gemini' && GEMINI_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                          {aiProvider === 'openrouter' && dynamicFreeModels.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name.replace('Free:', '')}</option>
                          ))}
                          {aiProvider === 'bytez' && BYTEZ_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                          {aiProvider === 'sumopod' && SUMOPOD_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <ConnectionStatus 
                        status={testingStatus[aiProvider] || 'idle'} 
                        error={testError[aiProvider]} 
                        onTest={() => testAiConnection(aiProvider)} 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">API Key Authorization</label>
                      <input 
                        type="password" 
                        placeholder={aiProvider === 'gemini' ? "Gemini Key..." : aiProvider === 'openrouter' ? "Token..." : aiProvider === 'bytez' ? "Bytez Key..." : "SumoPod Key..."}
                        value={aiProvider === 'gemini' ? geminiApiKey : aiProvider === 'openrouter' ? openRouterApiKey : aiProvider === 'bytez' ? bytezApiKey : sumopodApiKey}
                        onChange={(e) => {
                          if (aiProvider === 'gemini') setGeminiApiKey(e.target.value);
                          else if (aiProvider === 'openrouter') setOpenRouterApiKey(e.target.value);
                          else if (aiProvider === 'bytez') setBytezApiKey(e.target.value);
                          else setSumopodApiKey(e.target.value);
                        }}
                        className="w-full bg-[#3c3c3c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] outline-none text-white focus:border-purple-500/50"
                      />
                    </div>
                  </div>

                </section>

                {/* Integrations Section */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#adbac7] flex items-center gap-2 italic">
                    <Github size={12} /> Service Integrations
                  </h3>
                  
                  <div className="space-y-3">
                    {/* GitHub Config */}
                    <div className="p-3 bg-black/20 rounded-2xl border border-white/5 space-y-2">
                      <div className="flex items-center gap-2">
                        <Github size={14} className="text-[#adbac7]" />
                        <span className="text-[11px] font-bold">GitHub Token</span>
                      </div>
                      <input 
                        type="password" 
                        placeholder="ghp_xxxxxxxxxxxx"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] outline-none focus:border-blue-500/50"
                      />
                      <ConnectionStatus 
                        status={testingStatus.github || 'idle'} 
                        error={testError.github}
                        onTest={testGithubConnection}
                        label="Refresh"
                      />
                    </div>



                    {/* Reset Connections Button */}
                    <div className="pt-1">
                      <button 
                        onClick={resetAllConnections}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/50 rounded-2xl text-[11px] font-bold text-red-400 transition-all group"
                      >
                        <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                        Reset All Connections
                      </button>
                      <p className="text-[9px] text-gray-600 mt-1.5 text-center px-4 italic">
                        Menghapus seluruh API Keys, Token, dan data login dari memori IDE.
                      </p>
                    </div>
                  </div>
                </section>

                {/* MCP PROCOL SECTION */}
                <section className="space-y-3">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <ExternalLink size={12} /> MCP Server Protocol
                  </h3>
                  
                  <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-2xl space-y-3">
                    {/* Context7 Native Integration Toggle */}
                    <div 
                      onClick={() => setContext7Mode(!context7Mode)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer group mb-1",
                        context7Mode ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="space-y-0.5">
                        <p className={cn("text-[11px] font-bold flex items-center gap-1.5", context7Mode ? "text-orange-400" : "text-gray-300")}>
                          <Cpu size={12} /> Context7 Mode (Native)
                        </p>
                        <p className="text-[9px] text-gray-500 leading-tight">Auto-Documentation MCP Server</p>
                      </div>
                      <div className={cn("w-7 h-3.5 rounded-full relative transition-colors", context7Mode ? "bg-orange-500" : "bg-gray-700")}>
                        <div className={cn("absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all", context7Mode ? "left-4" : "left-0.5")} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Load MCP Template</label>
                      <select 
                        value={selectedMcpTemplateIdx === 'custom' ? 'custom' : selectedMcpTemplateIdx}
                        onChange={(e: any) => setSelectedMcpTemplateIdx(e.target.value === 'custom' ? 'custom' : parseInt(e.target.value))}
                        className="w-full bg-[#3c3c3c] border border-white/10 rounded-lg px-2 py-1.5 text-[11px] outline-none"
                      >
                        {MCP_TEMPLATES.map((t, i) => <option key={i} value={i}>{t.label}</option>)}
                        <option value="custom">Custom Implementation</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-500 uppercase">Server Host / Endpoint</label>
                      <input 
                        type="text" 
                        value={newMcpUrl}
                        onChange={(e) => setNewMcpUrl(e.target.value)}
                        className="w-full bg-[#3c3c3c] border border-white/10 rounded-xl px-2 py-1.5 text-[10px] outline-none font-mono"
                        placeholder="https://mcp-server.example.com/sse"
                      />
                    </div>

                    <button 
                      className="w-full py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-[10px] font-bold rounded-xl shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={12} /> Register MCP Server
                    </button>
                    
                    <div className="pt-1.5 border-t border-white/5 space-y-1.5">
                      <p className="text-[9px] text-gray-500 italic">Connected Servers:</p>
                      {mcpServers.length === 0 ? (
                        <p className="text-[9px] text-gray-700 italic text-center">No MCP servers registered</p>
                      ) : (
                        mcpServers.map((s, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 bg-white/5 rounded-lg border border-white/5">
                            <span className="text-[10px] font-bold text-orange-400">{s.name}</span>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <button onClick={() => setShowMcpLogsFor(s.name)} className="text-[9px] hover:text-white transition-colors">Logs</button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>

                <div className="py-6 text-center opacity-30">
                  <AuraLogo size={32} className="mx-auto mb-1.5" />
                  <p className="text-[9px] font-bold uppercase tracking-widest italic">Aura AI IDE — v1.0.2 Premium</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

