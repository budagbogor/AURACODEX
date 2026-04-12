# Development Log (DevLog)

Log rekam jejak historis pengembangan fitur pada AURA AI IDE.

## [2026-04-10] - Tailwind Website Generation Hardening (v15.3.159)
- **Generator Guardrails**: Menambahkan aturan prompt baru agar AURA tidak lagi mengarang utility Tailwind invalid seperti `text-text`, `bg-text`, atau token yang tidak benar-benar didefinisikan.
- **CSS Sanitization**: Memperkeras normalisasi `src/index.css` agar blok scaffold duplikat seperti `@layer base`, `@theme`, dan `@keyframes` yang bentrok tidak ikut lolos ke workspace hasil generate.
- **Recovery Quality**: Jalur ekstraksi file AI kini lebih aman untuk kasus website/full app yang sebelumnya bisa menghasilkan Tailwind overlay error saat preview atau build.
- **Verification**: Build AURA dan simulasi end-to-end generator website lulus setelah patch diterapkan.

## [2026-04-12] - Tailwind Alias Recovery For Website Generation (v15.3.161)
- **Alias Sanitization**: AURA sekarang menormalkan utility alias yang rawan gagal di blok `@apply`, terutama `bg-surface`, `bg-card`, `bg-popover`, dan pasangan foreground-nya, menjadi utility Tailwind bawaan yang valid.
- **HTML Style Recovery**: Sanitasi ini juga melindungi style block yang muncul di `index.html`, sehingga error `Cannot apply unknown utility class` tidak lagi lolos saat website baru dibangun dari prompt.
- **Prompt Guardrails**: Instruksi generator dipertegas agar model tidak lagi memakai alias design-token tersebut pada CSS `@apply` atau `<style>` inline.
- **Verification**: Build produksi AURA lulus setelah patch diterapkan.

## [2026-04-11] - Advanced Chat Revision Safety (v15.3.160)
- **Revision Intent Detection**: AURA sekarang membedakan prompt revisi bertahap dari prompt generasi proyek baru, sehingga mode chat lebih fokus pada pengembangan lanjutan project yang sudah ada.
- **Active File Guidance**: Prompt ke model kini membawa konteks file aktif dan target workspace yang lebih sempit agar perubahan tidak melebar tanpa alasan.
- **Sensitive File Protection**: Auto-apply draft akan ditahan saat revisi menyentuh file sensitif seperti config, entrypoint, styling inti, atau area Tauri yang berisiko memicu error lanjutan.
- **Safer Iteration Loop**: Revisi yang terlalu luas kini diarahkan ke review draft terlebih dahulu sebelum diterapkan, mengurangi kerusakan saat user meminta banyak perubahan bertahap lewat chat.
- **Verification**: Build produksi AURA lulus setelah hardening mode revisi diterapkan.

## [2026-03-24] - Fase 1, 2, 3, & 4 Completed
- **Smart Routing**: Berhasil mengimplementasikan auto-fallback OpenRouter & auto-budget SumoPod.
- **Autonomous Terminal**: Menambahkan pendeteksi error terminal (exit code != 0) yang memicu auto-fix otonom via AI Composer.
- **Internal Browser**: Implementasi Regex dinamis untuk menangkap port localhost dari stdout terminal.
- **Autonomous Agent (Fase 4)**: 
  - **Real-time Disk Sync**: Integrasi `@tauri-apps/plugin-fs` pada `onApplyCode`. File yang dibuat AI langsung tersimpan di disk asli secara otonom.
  - **Planning Phase**: AI sekarang diwajibkan melakukan *Planning Phase* sebelum memberikan kode, meningkatkan akurasi arsitektur.
  - **Multi-file Handling**: Mendukung pembuatan banyak file sekaligus (scaffolding) dan aksi penghapusan file (`delete`).
- **UX**: Shortcut `Ctrl+F12` ditambahkan untuk toggle browser preview.
- **Robustness**: Audit dependensi dan perbaikan TypeScript (`tsc --noEmit` clean).
- **Final Polish (Fase 5)**:
  - **Nested Explorer**: Sidebar kini mendukung struktur Folder Tree rekursif dengan ikon yang serasi.
  - **Aura Premium Design**: Implementasi Glassmorphism v2, Custom Gradients, dan Glow effects di seluruh UI.
  - **Global UX**: Scrollbar yang lebih halus, transisi animasi Framer Motion, dan tipografi JetBrains Mono.
  - **Version**: AURA AI IDE v5.4.0 (Stable Release).

## [2026-03-24] - System Lean Optimization (v5.6.0)
- **Supabase Deprecation**: Menghapus seluruh integrasi Supabase (Service, State, UI) untuk performa lokal yang lebih ringan.
- **Tauri Native Focus**: Menghapus dependensi Electron fallback; aplikasi kini 100% Tauri Native.
- **Layout Intelligence**: Implementasi mode "DEFAULT LOOK" dan "ZEN ONLY" di tab Settings.
- **Keyboard Shortcuts**: Menambahkan `Ctrl+B` (Sidebar) dan `Ctrl+`` (Terminal) ke kernel sistem.
- **Documentation**: Sinkronisasi seluruh dokumen (PRD, DevPlan, README, Guide) ke status v5.6.0 Stable.

**Status Kendala Saat Ini:**
- Tidak ada (System in Stable Lean State).

**Langkah Selanjutnya:**
- Pemeliharaan rutin dan monitoring performa pada proyek skala besar.
