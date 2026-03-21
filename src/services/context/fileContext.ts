import { FileItem } from '../../types';

export function buildProjectContextPrompt(files: FileItem[], activeFileId?: string): string {
  if (!files || files.length === 0) {
    return "Tidak ada file terbuka di proyek.";
  }

  const fileTree = files.map(f => `- ${f.id} (${f.language})`).join('\n');
  
  let contentDump = files.map(f => {
    return `
--- FILE: ${f.id} ---
\`\`\`${f.language}
${f.content}
\`\`\`
`.trim();
  }).join('\n\n');

  const activeInfo = activeFileId ? `File yang sedang aktif di Editor: ${activeFileId}` : '';

  return `
Konteks Proyek:
Struktur File (File Terbuka):
${fileTree}

${activeInfo}

Isi File:
${contentDump}
  `.trim();
}
