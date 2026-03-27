import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

interface TerminalAdapterProps {
  id: string;
  output: string[];
  isRunning: boolean;
  onData?: (data: string) => void;
  height?: number;
}

export const TerminalAdapter: React.FC<TerminalAdapterProps> = ({
  id,
  output,
  isRunning,
  onData,
  height = 300
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize XTerm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#cccccc',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      rows: Math.floor(height / 20) || 15
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Tambahkan Link Provider untuk mendeteksi URL localhost di terminal
    term.registerLinkProvider({
      provideLinks(bufferLineNumber, callback) {
        const line = term.buffer.active.getLine(bufferLineNumber - 1);
        if (!line) { callback(undefined); return; }
        
        const text = line.translateToString(true);
        const urlRegex = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::\]):\d+/ig;
        const links: any[] = [];
        let match;
        
        while ((match = urlRegex.exec(text)) !== null) {
          links.push({
            range: {
              start: { x: match.index + 1, y: bufferLineNumber },
              end: { x: match.index + match[0].length, y: bufferLineNumber }
            },
            text: match[0],
            activate: (e: any, urlText: string) => {
              const detectedUrl = urlText.replace(/0\.0\.0\.0|\[::\]/, 'localhost');
              // Jika di Tauri, buka dengan kapabilitas OS secara native (browser default PC)
              if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                import('@tauri-apps/plugin-shell').then(({ Command }) => {
                  Command.create('cmd', ['/C', 'start', detectedUrl]).execute().catch(() => {});
                }).catch(() => window.open(detectedUrl, '_blank'));
              } else {
                window.open(detectedUrl, '_blank');
              }
            }
          });
        }
        callback(links);
      }
    });

    // Handle incoming terminal data directly via EventBus
    const handleWrite = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id === id) {
        // Direct write bypasses React render cycle
        term.write(customEvent.detail.data.replace(/\n/g, '\r\n') + '\r\n');
      }
    };
    
    // Add event listener
    window.addEventListener('terminal-write', handleWrite);

    // Initial output clear/fill (only for historical data from state)
    // Avoid double printing if it's already running. Usually historical data is just array of strings
    term.clear();
    output.forEach(line => {
       term.writeln(line.replace(/\n/g, '\r\n'));
    });

    // Cleanup
    return () => {
      window.removeEventListener('terminal-write', handleWrite);
      term.dispose();
      xtermRef.current = null;
    };
  }, [id]); // Re-init ONLY if session ID changes

  // Handle user input in terminal (we separate this to avoid re-binding)
  useEffect(() => {
    if (xtermRef.current && onData) {
      const disposable = xtermRef.current.onData(data => onData(data));
      return () => disposable.dispose();
    }
  }, [onData]);

  // Handle resizing gracefully
  useEffect(() => {
    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      ref={terminalRef} 
      className="xterm-container h-full w-full overflow-hidden px-4 pt-2" 
      style={{ backgroundColor: '#0a0a0a' }}
    />
  );
};
