import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { getFileIcon } from '../../utils/icons';
import { Check, X, Code } from 'lucide-react';

interface CodeBlockPreviewProps {
  filePath: string;
  content: string;
  action: 'create_or_modify' | 'delete';
  onAccept: (filePath: string, content: string) => void;
  onReject: (filePath: string) => void;
}

export const CodeBlockPreview: React.FC<CodeBlockPreviewProps> = ({
  filePath,
  content,
  action,
  onAccept,
  onReject
}) => {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');

  const handleAccept = () => {
    setStatus('accepted');
    onAccept(filePath, content);
  };

  const handleReject = () => {
    setStatus('rejected');
    onReject(filePath);
  };

  if (status !== 'pending') {
    return (
      <div className={`p-2 my-2 text-xs rounded-lg border \${status === 'accepted' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
        {status === 'accepted' ? '✓ Accepted changes to ' : '✗ Rejected changes to '} 
        <strong>{filePath}</strong>
      </div>
    );
  }

  return (
    <div className="my-3 border border-blue-500/30 bg-[#1e1e1e] rounded-xl overflow-hidden shadow-lg shadow-blue-500/10">
      <div className="flex items-center justify-between px-3 py-2 bg-[#252526] border-b border-white/10">
        <div className="flex items-center gap-2">
          {getFileIcon(filePath)}
          <span className="text-xs font-bold text-gray-200">{filePath}</span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
            {action === 'delete' ? 'DELETE' : 'UPDATE'}
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleReject}
            className="p-1 rounded hover:bg-red-500/20 text-gray-400 font-bold hover:text-red-400 transition-colors"
            title="Reject"
          >
            <X size={14} />
          </button>
          <button 
            onClick={handleAccept}
            className="p-1 rounded hover:bg-emerald-500/20 text-gray-400 font-bold hover:text-emerald-400 transition-colors"
            title="Accept"
          >
            <Check size={14} />
          </button>
        </div>
      </div>
      
      {action !== 'delete' && (
        <div className="p-3 text-xs overflow-x-auto max-h-[300px] custom-scrollbar text-gray-300">
          <pre><code>{content}</code></pre>
        </div>
      )}
    </div>
  );
};
