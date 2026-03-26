import { FileItem } from '../../types';

/**
 * Membangun prompt konteks proyek yang cerdas.
 * v6.0.0: Sekarang menyertakan metadata proyek dan peringkat relevansi.
 */
export function buildProjectContextPrompt(files: FileItem[], activeFileId?: string, projectTree?: string): string {
  if ((!files || files.length === 0) && !projectTree) {
    return "Tidak ada konteks proyek yang tersedia.";
  }

  // 1. Identifikasi Metadata Penting (misal: package.json)
  const pkgFile = files.find(f => f.name === 'package.json' || f.id.endsWith('package.json'));
  let projectMetadata = "";
  if (pkgFile) {
    try {
       const pkg = JSON.parse(pkgFile.content);
       projectMetadata = `DEPENDENSI UTAMA: ${Object.keys(pkg.dependencies || {}).join(', ')}`;
    } catch (e) {}
  }

  // 2. Perankingan File (Jika terlalu banyak file terbuka, prioritaskan yang aktif & terkait)
  const MAX_FILES_IN_CONTEXT = 30;
  let sortedFiles = [...files];
  
  if (files.length > MAX_FILES_IN_CONTEXT) {
     sortedFiles = files.sort((a, b) => {
        if (a.id === activeFileId) return -1;
        if (b.id === activeFileId) return 1;
        // Prioritaskan file source daripada config jika sudah terlalu banyak
        const isAConfig = a.name.includes('config') || a.name.includes('.json');
        const isBConfig = b.name.includes('config') || b.name.includes('.json');
        if (isAConfig && !isBConfig) return 1;
        if (!isAConfig && isBConfig) return -1;
        return 0;
     }).slice(0, MAX_FILES_IN_CONTEXT);
  }

  const openFilesList = sortedFiles.map(f => `- ${f.id} (${f.language})`).join('\n');
  
  let contentDump = sortedFiles.map(f => {
    return `
### FILE CONTENT: ${f.id}
\`\`\`${f.language}
${f.content}
\`\`\`
`.trim();
  }).join('\n\n');

  const activeInfo = activeFileId ? `**FILE AKTIF SAAT INI**: ${activeFileId}` : '';

  return `
=== KONTEKS PROYEK (ENVIRONMENT) ===
${projectMetadata ? `METADATA: ${projectMetadata}\n` : ''}
${projectTree ? `\nSTRUKTUR DIREKTORI PROYEK (TREE):\n${projectTree}\n` : ''}

DAFTAR FILE TERBUKA DI EDITOR (TAB):
${openFilesList}
${files.length > MAX_FILES_IN_CONTEXT ? `\n(Catatan: ${files.length - MAX_FILES_IN_CONTEXT} file lainnya disembunyikan untuk efisiensi token)\n` : ''}

${activeInfo}

=== ISI FILE (Sangat Penting untuk Akurasi): ===
${contentDump}
  `.trim();
}
