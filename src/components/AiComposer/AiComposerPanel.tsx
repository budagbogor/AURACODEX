import React, { useState, useRef, useEffect } from 'react';
import { generateComposerStream, parseComposerResponse } from '../../services/ai/composerService';
import { auditProjectStructure } from '../../services/ai/structureVerifier';
import { generateAuraRules } from '../../services/ai/auraRules';
import { memoryManager } from '../../services/ai/memoryManager';
import { FileItem } from '../../types';
import { Send, Bot, User, RefreshCw, Cpu, Loader2, Globe, Sparkles, FileCode } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AURA_COLLECTIVE } from '../../utils/constants';
import Markdown from 'react-markdown';

interface AiComposerPanelProps {
  provider: string;
  apiKey: string;
  model: string;
  files: FileItem[];
  activeFileId: string;
  onApplyCode: (filePath: string, content: string, action?: 'create_or_modify' | 'delete') => void;
  onExecuteCommand?: (command: string) => void;
  appendTerminalOutput?: (msg: string) => void;
  projectTree?: string;
  onSuccess?: (stats: { fileCount: number; commands: string[] }) => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  autoFixTrigger?: number;
  autoFixMessage?: string;
  nativeProjectPath?: string | null;
  mcpTools?: any[];
  ollamaUrl?: string;
  activeAgentId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  parsedFiles?: { path: string; action: 'create_or_modify' | 'delete'; content: string }[];
}

export const AiComposerPanel: React.FC<AiComposerPanelProps> = ({
  provider,
  apiKey,
  model,
  files,
  activeFileId,
  onApplyCode,
  onExecuteCommand,
  appendTerminalOutput,
  projectTree,
  onSuccess,
  messages,
  setMessages,
  autoFixTrigger,
  autoFixMessage,
  nativeProjectPath,
  mcpTools = [],
  ollamaUrl = 'http://localhost:11434',
  activeAgentId = 'pm'
}) => {
  const [input, setInput] = useState('');
  const [category, setCategory] = useState('Auto');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (autoFixTrigger && autoFixTrigger > 0 && autoFixMessage && !isLoading) {
      handleSend(autoFixMessage);
    }
  }, [autoFixTrigger]);

  const handleSend = async (overrideMsg?: string, isAutoCorrection: boolean = false) => {
    const userMessage = typeof overrideMsg === 'string' ? overrideMsg : input;
    if (!userMessage.trim() || isLoading) return;
    
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }, { role: 'assistant', content: '⚠️ API Key belum diatur. Silakan atur di Settings terlebih dahulu.' }]);
      if (typeof overrideMsg !== 'string') setInput('');
      return;
    }

    if (typeof overrideMsg !== 'string') setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (appendTerminalOutput) appendTerminalOutput(`[AI] Menyusun rencana untuk: ${userMessage.substring(0, 30)}...`);
      
      const stream = generateComposerStream(provider, apiKey, model, userMessage, files, category, activeFileId, projectTree, mcpTools, ollamaUrl);
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      let lastUIUpdate = Date.now();
      let lastApplyUpdate = Date.now();
      let appliedCommands = new Set<string>();

      for await (const chunk of stream) {
        fullResponse += chunk;
        const now = Date.now();
        
        // 1. Update Chat UI (Text) - Throttle 100ms
        if (now - lastUIUpdate > 100) {
          setMessages(prev => {
            const newMessages = [...prev];
            const last = newMessages[newMessages.length - 1];
            if (last) last.content = fullResponse;
            return newMessages;
          });
          lastUIUpdate = now;
        }

        // 2. Real-time Apply Code (Zero-Click) - Throttle 400ms
        if (now - lastApplyUpdate > 400) {
          const fileRegex = /\`\`\`(file|delete):([^\n]+)\n([\s\S]*?)(?:\`\`\`|$)/g;
          let match;
          while ((match = fileRegex.exec(fullResponse)) !== null) {
            const action = match[1] === 'delete' ? 'delete' : 'create_or_modify';
            onApplyCode(match[2].trim(), match[3], action);
          }
          
          // Streaming Terminal Commands - Execute as soon as block is closed
          const cmdStreamingRegex = /```(?:command:([^\n]*)|command)\n?([\s\S]*?)```/g;
          let streamingMatch;
          while ((streamingMatch = cmdStreamingRegex.exec(fullResponse)) !== null) {
             const cmd = (streamingMatch[1] || streamingMatch[2]).trim();
             if (cmd && !appliedCommands.has(cmd)) {
                if (onExecuteCommand) onExecuteCommand(cmd);
                appliedCommands.add(cmd);
             }
          }

          lastApplyUpdate = now;
        }
      }

      // --- FINAL PASS (Safety & Consistency) ---
      setMessages(prev => {
        const newMessages = [...prev];
        const last = newMessages[newMessages.length - 1];
        if (last) last.content = fullResponse;
        return newMessages;
      });

      // Final Apply for all files
      const finalRegex = /\`\`\`(file|delete):([^\n]+)\n([\s\S]*?)(?:\`\`\`|$)/g;
      let finalMatch;
      let fileCount = 0;
      while ((finalMatch = finalRegex.exec(fullResponse)) !== null) {
        const action = finalMatch[1] === 'delete' ? 'delete' : 'create_or_modify';
        onApplyCode(finalMatch[2].trim(), finalMatch[3], action);
        fileCount++;
      }

      // Final Terminal Commands - Execute only at the END if block is fully closed
      // Enhanced Regex to support both ```command:cmd``` and ```command\ncmd\n```
      const finalCmdRegex = /```(?:command:([^\n]*)|command)\n?([\s\S]*?)```/g;
      let finalCmdMatch;
      while ((finalCmdMatch = finalCmdRegex.exec(fullResponse)) !== null) {
        const cmd = (finalCmdMatch[1] || finalCmdMatch[2]).trim();
        if (cmd && !appliedCommands.has(cmd)) {
          if (onExecuteCommand) onExecuteCommand(cmd);
          appliedCommands.add(cmd);
        }
      }

      // --- MEMORY EXTRACTION (v2.3.0) ---
      if (nativeProjectPath) {
        await memoryManager.extractAndMerge(nativeProjectPath, fullResponse);
      }

        if (fileCount > 0 && appendTerminalOutput) {
           appendTerminalOutput(`[AI SUCCESS] Berhasil menerapkan ${fileCount} file ke Editor.`);
           
           // --- SECURITY HOOK (v1.4.0) ---
           const secretRegex = /(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AKIA[0-9A-Z]{16}|xox[bpg]-[0-9]+-[a-zA-Z0-9]+)/g;
           if (secretRegex.test(fullResponse)) {
              appendTerminalOutput(`[AURA SECURITY] ⚠️ Terdeteksi data sensitif (API Key/Token) dalam kode! Mohon pindahkan ke file .env segera.`);
           }

           // --- AURA RULES GENERATION (v1.4.0) ---
           const rules = generateAuraRules(parseComposerResponse(fullResponse), projectTree);
           rules.forEach(rule => {
              onApplyCode(rule.path, rule.content, 'create_or_modify');
           });
           if (rules.length > 0) {
              appendTerminalOutput(`[AURA RULES] Otomatis membuat ${rules.length} panduan proyek di .aura/rules/`);
           }

           // --- ELITE DESIGN & STRUCTURE AUDIT ---
        const missingFiles = auditProjectStructure(parseComposerResponse(fullResponse), projectTree);
        if (missingFiles.length > 0) {
           appendTerminalOutput(`[AURA ELITE] Mendeteksi ketidakkonsistenan Desain & Struktur.`);
           appendTerminalOutput(`[AURA ELITE] Melengkapi manifest penting: ${missingFiles.join(', ')}...`);
           const autoPrompt = `Project ini membutuhkan sentuhan akhir untuk standar World-Class. Tolong buatkan file berikut dengan desain premium (Bento/Glassmorphism/Tokens): ${missingFiles.join(', ')}. Pastikan setiap file memiliki estetika tinggi.`;
           // Trigger recursive send with auto-correction prompt
           setTimeout(() => handleSend(autoPrompt, true), 1000);
        } else {
           appendTerminalOutput(`[AURA ELITE] Desain & Struktur terverifikasi: WORLD-CLASS.`);
        }

        if (onSuccess) onSuccess({ fileCount, commands: Array.from(appliedCommands) });
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Terjadi error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] bg-aura-gradient overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar pb-10">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-end" : "items-start")}>
            <div className={cn(
              "flex items-center gap-2 opacity-60 px-2",
              msg.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              {msg.role === 'user' ? (
                <>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-400">You</span>
                  <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]"><User size={12} /></div>
                </>
              ) : (
                <>
                  <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                    <Bot size={12} />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic flex items-center gap-1">
                    Aura AI 
                    <span className="opacity-40 text-[8px]">— {AURA_COLLECTIVE.find(a => a.id === activeAgentId)?.name || 'Orchestrator'}</span>
                  </span>
                </>
              )}
            </div>
            
            <div className={cn(
              "w-full p-4 rounded-2xl text-[11px] leading-relaxed shadow-xl max-w-full glass-card transition-all hover:border-white/20",
              msg.role === 'user' 
                ? "bg-blue-600/20 border-blue-500/40 text-blue-50 rounded-tr-none self-end" 
                : "bg-white/5 border-white/10 text-gray-300 rounded-tl-none"
            )}>
              <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap !text-[11px] !leading-normal">
                <Markdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const fileMatch = /language-(file|delete):([^\n]+)/.exec(className || '');
                      const cmdMatch = /language-command:([^\n]+)/.exec(className || '');
                      
                      // Check if the current message is still being streamed
                      const isLastMessage = idx === messages.length - 1;
                      const isCurrentlyStreaming = isLoading && isLastMessage;
                      
                      // Check if this specific block is closed (by looking at the children and context)
                      // A more robust way: if it's NOT the last message, it's definitely closed.
                      // If it IS the last message, we check if the full content ends with ```
                      const isBlockClosed = !isLastMessage || msg.content.trim().endsWith('```');

                      if (!inline && fileMatch) {
                        const fileName = fileMatch[2].trim();
                        const isWriting = isCurrentlyStreaming && !isBlockClosed;

                        return (
                          <div className={cn(
                            "my-1 p-2 rounded-lg border text-[10px] flex items-center justify-between gap-2 shadow-sm",
                            isWriting 
                              ? "bg-blue-500/5 border-blue-500/20 text-blue-400" 
                              : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 opacity-80"
                          )}>
                            <div className="flex items-center gap-2 min-w-0">
                               <FileCode size={12} className={isWriting ? "animate-pulse" : ""} />
                               <span className="font-mono truncate">{fileName}</span>
                            </div>
                            <span className="text-[8px] font-bold uppercase tracking-tighter opacity-70">
                               {isWriting ? "Writing..." : "Applied"}
                            </span>
                          </div>
                        );
                      }

                      if (!inline && cmdMatch) {
                        const cmd = cmdMatch[1].trim();
                        const isRunning = isCurrentlyStreaming && !isBlockClosed;
                        
                        return (
                          <div className={cn(
                            "my-3 p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 shadow-md transition-all",
                            isRunning
                              ? "bg-purple-500/10 border-purple-500/30 text-purple-400 animate-pulse"
                              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                          )}>
                            <span className="flex items-center gap-2 font-mono break-words font-bold min-w-0 flex-1">
                              <span className="opacity-50 shrink-0">Log:</span> 
                              {cmd}
                            </span>
                            <span className={cn(
                              "flex items-center gap-1.5 px-2 py-1 rounded-lg font-black uppercase tracking-wider text-[9px] shrink-0",
                              isRunning ? "bg-purple-500/20 text-purple-300" : "bg-emerald-500/20 text-emerald-300"
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isRunning ? "bg-purple-400" : "bg-emerald-400"
                              )} />
                              {isRunning ? "Menjalankan..." : "Selesai"}
                            </span>
                          </div>
                        );
                      }
                      
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {msg.content}
                </Markdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-2 animate-pulse p-2">
            <Loader2 className="animate-spin text-purple-400" size={16} />
            <span className="text-xs text-purple-400">Thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-[#252526] border-t border-white/5">
         <div className="flex items-center gap-2 mb-2 px-1">
            <div className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
              <span className="text-blue-400 font-bold">{files.length}</span> files in context
            </div>
         </div>
         <div className="relative bg-[#1e1e1e] border border-white/10 rounded-2xl focus-within:border-blue-500/50 transition-all p-2 shadow-inner">
            <textarea 
              placeholder="Ask Composer to create or edit files... (Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-transparent border-none outline-none text-[13px] text-white p-2 min-h-[60px] max-h-[200px] resize-none"
            />
            <div className="flex items-center justify-between mt-1 px-1">
              <div className="flex items-center gap-3">
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#2a2a2a] text-[10px] text-gray-300 border border-white/10 rounded px-1.5 py-1 outline-none hover:border-blue-500/50 transition-colors cursor-pointer font-bold"
                  title="Pilih Kategori / Skill Standar"
                >
                  <optgroup label="Web & Enterprise">
                    <option value="Auto">Auto (Smart)</option>
                    <option value="Full Stack">Full Stack</option>
                    <option value="Frontend Elite">Frontend Elite</option>
                    <option value="Security Auditor">Security Auditor</option>
                    <option value="TDD Master">TDD Master</option>
                    <option value="Frontend">Elite UI/UX Master</option>
                    <option value="Backend">Backend API</option>
                  </optgroup>
                  <optgroup label="Apps & Platforms">
                    <option value="Mobile App">Mobile App (Capacitor)</option>
                    <option value="Tauri Desktop">Tauri (Desktop App)</option>
                    <option value="Chrome Extension">Chrome Extension</option>
                  </optgroup>
                  <optgroup label="Automation & AI">
                    <option value="Python Automation">Python / Automation</option>
                    <option value="AI Integration">AI / LLM Ops</option>
                  </optgroup>
                  <optgroup label="Creative">
                    <option value="Game Dev">Game Dev (Canvas)</option>
                  </optgroup>
                </select>
              </div>
              <button 
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-xl transition-all shadow-lg",
                  input.trim() && !isLoading ? "bg-blue-600 text-white hover:bg-blue-500 scale-105" : "bg-gray-700 text-gray-500 opacity-50 cursor-not-allowed"
                )}
              >
                <Send size={16} />
              </button>
            </div>
         </div>
          <div className="mt-2 text-center">
            <span className="text-[9px] text-gray-600">Standard Concept Selection (v5.4.0) - Elite Mode</span>
          </div>
      </div>
    </div>
  );
};
