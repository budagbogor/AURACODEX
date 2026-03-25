import React, { useState, useRef, useEffect } from 'react';
import { generateComposerStream, parseComposerResponse } from '../../services/ai/composerService';
import { auditProjectStructure } from '../../services/ai/structureVerifier';
import { CodeBlockPreview } from './CodeBlockPreview';
import { FileItem } from '../../types';
import { Send, Bot, User, RefreshCw, Cpu, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
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
  autoFixMessage
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
      
      const stream = generateComposerStream(provider, apiKey, model, userMessage, files, category, activeFileId, projectTree);
      
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

      if (fileCount > 0 && appendTerminalOutput) {
        appendTerminalOutput(`[AI SUCCESS] Berhasil menerapkan ${fileCount} file ke Editor.`);
        
        // --- AUTONOMOUS STRUCTURE AUDIT ---
        const missingFiles = auditProjectStructure(parseComposerResponse(fullResponse), projectTree);
        if (missingFiles.length > 0) {
           appendTerminalOutput(`[AURA MAGIC] Mendeteksi struktur belum lengkap. Melengkapi: ${missingFiles.join(', ')}...`);
           const autoPrompt = `Proyek ini sepertinya belum lengkap. Tolong buatkan file penting berikut agar project bisa langsung beroperasi: ${missingFiles.join(', ')}. Pastikan file tersebut memiliki konten standar yang valid.`;
           // Trigger recursive send with auto-correction prompt
           setTimeout(() => handleSend(autoPrompt, true), 1000);
        } else {
           appendTerminalOutput(`[AURA MAGIC] AI selesai memodifikasi ${fileCount} file. Proyek terlihat solid.`);
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
                  <div className="w-6 h-6 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]"><Bot size={12} /></div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 italic">Aura AI</span>
                </>
              )}
            </div>
            
            <div className={cn(
              "w-[98%] p-3 rounded-xl text-[11px] leading-snug shadow-xl max-w-full glass-card transition-all hover:border-white/20",
              msg.role === 'user' 
                ? "bg-blue-600/15 border-blue-500/30 text-blue-50 rounded-tr-none self-end" 
                : "bg-white/5 border-white/10 text-gray-300 rounded-tl-none"
            )}>
              <div className="prose prose-invert prose-sm max-w-none break-all whitespace-pre-wrap !text-[11px] !leading-tight">
                <Markdown
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const fileMatch = /language-(file|delete):([^\n]+)/.exec(className || '');
                      const cmdMatch = /language-command:([^\n]+)/.exec(className || '');

                      if (!inline && fileMatch) {
                        return (
                          <div className="my-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs flex items-center justify-between gap-3 shadow-sm backdrop-blur-sm">
                            <span className="flex items-center gap-2 font-mono break-all">
                              <span className="opacity-50 text-blue-300">File:</span> 
                              <b>{fileMatch[2].trim()}</b>
                            </span>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/20 text-blue-300 font-bold uppercase tracking-wider text-[9px] animate-pulse whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                              Sedang Di Tulis...
                            </span>
                          </div>
                        );
                      }

                      if (!inline && cmdMatch) {
                        return (
                          <div className="my-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between gap-3 shadow-sm backdrop-blur-sm">
                            <span className="flex items-center gap-2 font-mono break-all">
                              <span className="opacity-50 text-emerald-300">Terminal:</span> 
                              <b>{cmdMatch[1].trim()}</b>
                            </span>
                            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase tracking-wider text-[9px] animate-pulse whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
                              Menjalankan Perintah...
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
                <div className="text-[10px] text-gray-500">
                  <span className="text-blue-400 font-bold">{files.length}</span> files in context
                </div>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-[#2a2a2a] text-[10px] text-gray-300 border border-white/10 rounded px-1.5 py-1 outline-none hover:border-blue-500/50 transition-colors cursor-pointer font-bold"
                  title="Pilih Kategori / Skill Standar"
                >
                  <optgroup label="Web & Enterprise">
                    <option value="Auto">Auto (Smart)</option>
                    <option value="Full Stack">Full Stack</option>
                    <option value="Frontend">Frontend UI/UX</option>
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
