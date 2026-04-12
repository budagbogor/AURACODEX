import type { AttachedFile } from '@/types';
import type { AiActivityEntry } from '@/features/workspace/workspaceSupport';

export const isLikelyCodingPrompt = (prompt: string) =>
  /(buat|bikin|generate|create|refactor|fix|perbaiki|ubah|edit|implement|scaffold|bangun|coding|code|file|component|api|ui|ux)/i.test(prompt);

export const isIterativeRevisionPrompt = (
  prompt: string,
  options?: {
    hasActiveFile?: boolean;
    workspaceFileCount?: number;
  }
) => {
  const revisionSignal = /(revisi|revise|revision|ubah|edit|adjust|tweak|polish|refine|lanjutkan|continue|improve|improvement|kembangkan|develop|tambahkan|update|rapikan|extend|modif)/i.test(prompt);
  const existingProjectSignal = (options?.hasActiveFile || false) || (options?.workspaceFileCount || 0) > 4;
  const freshGenerationSignal = /(buat dari nol|from scratch|generate project|create project|new project|project baru|landing page baru|website baru|aplikasi baru)/i.test(prompt);
  return revisionSignal && existingProjectSignal && !freshGenerationSignal;
};

export const isErrorFixPrompt = (prompt: string, attachments: AttachedFile[] = []) => {
  const hasImageAttachment = attachments.some((file) => file.type.startsWith('image/'));
  return (
    /(error|bug|fix|perbaiki|debug|stack trace|exception|failed|gagal|warning|warn|cannot|undefined|null|traceback|vite|build error|console)/i.test(prompt) ||
    (hasImageAttachment && /(screenshot|screen shoot|error|bug|console|log|fix|perbaiki|debug)/i.test(prompt))
  );
};

export const trimChatHistoryForAi = (history: Array<{ role: string; content: string }>, prioritizeSpeed = false) => {
  const limit = prioritizeSpeed ? 4 : 10;
  return history.slice(-limit);
};

export const buildAttachmentPromptContext = (attachments: AttachedFile[], options?: { compact?: boolean }) => {
  if (!attachments.length) return '';
  const compact = options?.compact ?? false;
  const attachmentLimit = compact ? 4 : attachments.length;
  const visibleAttachments = attachments.slice(0, attachmentLimit);

  const sections = visibleAttachments.map((file, index) => {
    if (file.type.startsWith('image/')) {
      return [
        `Attachment ${index + 1}: ${file.name}`,
        'Type: image',
        compact
          ? 'Instruction: fokus baca pesan error, nama file, stack trace, overlay build/dev, dan petunjuk root cause dari gambar ini.'
          : 'Instruction: analisis gambar ini jika relevan dengan prompt.'
      ].join('\n');
    }

    if (file.content) {
      const maxLength = compact ? 6000 : 12000;
      const trimmedContent = file.content.length > maxLength
        ? `${file.content.slice(0, maxLength)}\n...[truncated]`
        : file.content;

      return [
        `Attachment ${index + 1}: ${file.name}`,
        `Type: ${file.type || 'text/plain'}`,
        'Content:',
        trimmedContent
      ].join('\n');
    }

    return [
      `Attachment ${index + 1}: ${file.name}`,
      `Type: ${file.type || 'binary'}`,
      'Content: binary attachment attached; use filename/type as context.'
    ].join('\n');
  });

  const hiddenAttachmentNotice = attachments.length > attachmentLimit
    ? `\n\nAdditional attachments omitted for speed: ${attachments.length - attachmentLimit}`
    : '';

  return ['Attached Context Files:', ...sections].join('\n\n') + hiddenAttachmentNotice;
};

const buildErrorFixContract = () => [
  'Fast Error Fix Contract:',
  '- Prioritaskan kecepatan diagnosis dan patch yang aman.',
  '- Gunakan screenshot, console log, stack trace, dan nama file untuk menemukan root cause paling mungkin.',
  '- Fokus pada file yang sudah ada lebih dulu. Jangan refactor besar jika patch kecil cukup.',
  '- Jika error menunjukkan import path, module missing, undefined symbol, atau build failure, perbaiki penyebab langsungnya sebelum polish lain.',
  '- Jika bukti belum cukup, lakukan asumsi paling masuk akal dan tulis patch yang paling kecil.',
  '- Output tetap harus mengikuti Workspace Output Contract agar AURA bisa langsung menerapkan file.'
].join('\n');

const buildRevisionSafetyContract = ({
  activeFilePath,
  preferredTargets
}: {
  activeFilePath?: string | null;
  preferredTargets: string[];
}) => [
  'Advanced Revision Contract:',
  '- Anda sedang mengembangkan project yang SUDAH ADA, bukan membuat ulang project dari nol.',
  '- Prioritaskan edit inkremental pada file yang sudah ada dan pertahankan arsitektur yang sudah berjalan.',
  '- Jangan mengganti entrypoint, config, package manifest, atau styling foundation kecuali prompt benar-benar membutuhkan itu.',
  activeFilePath ? `- File fokus aktif saat ini: ${activeFilePath}` : '- Tidak ada file fokus aktif; gunakan target workspace yang disarankan.',
  preferredTargets.length > 0 ? `- Batasi perubahan utama ke area ini lebih dulu:\n${preferredTargets.map((target) => `  - ${target}`).join('\n')}` : '- Batasi perubahan utama ke area kerja yang paling relevan.',
  '- Jika revisi bisa diselesaikan dengan mengubah 1-3 file, jangan menyebarkan perubahan ke banyak file tambahan.',
  '- Jangan menduplikasi scaffold seperti App shell, main entry, Tailwind base, atau config yang sudah ada.',
  '- Untuk CSS @apply atau <style> di index.html, pakai utility Tailwind bawaan yang valid seperti bg-slate-900, text-slate-50, dan border-slate-800; hindari alias seperti bg-surface atau bg-card.',
  '- Jika harus menyentuh file sensitif seperti package.json, vite.config, src/index.css, src/main.tsx, atau src-tauri/tauri.conf.json, lakukan hanya bila benar-benar perlu untuk memenuhi revisi.'
].join('\n');

export const buildWorkspaceOutputContract = () => [
  'Workspace Output Contract:',
  '- Jika kamu mengubah kode, keluarkan satu section per file dengan format wajib `File: relative/path.ext` lalu fenced code block tepat di bawahnya.',
  '- Jangan gabungkan beberapa file dalam satu code block.',
  '- Jangan tulis prose di antara baris `File:` dan fenced code block file itu.',
  '- Selalu sertakan path file yang jelas, misalnya File: src/App.tsx atau path=src/App.tsx.',
  '- Jika membuat file baru, gunakan path file baru yang lengkap.',
  '- Jika file tampak frontend, prioritaskan target folder frontend yang disarankan.',
  '- Jika file tampak backend atau tauri, prioritaskan target folder backend/tauri yang disarankan.',
  '- Gunakan satu arsitektur project yang konsisten. Jangan buat campuran root src + frontend/ + backend/ + api/ sekaligus kecuali user secara eksplisit meminta monorepo atau multi-service.',
  '- Untuk web app biasa atau fullstack kecil, default-kan ke satu app utama di root workspace: frontend di src/, backend ringan di api/ atau src/server/, bukan frontend/ dan backend/ terpisah.',
  '- Jangan membuat package.json tambahan di frontend/ atau backend/ kecuali user secara eksplisit meminta struktur terpisah.',
  '- Jaga dependency tetap ramping. Tambahkan library hanya jika benar-benar diperlukan untuk routing, accessibility, data, atau maintainability yang jelas.',
  '- Jika menambah dependency, update package.json app utama yang relevan dan jangan duplikasi package manifest tanpa alasan kuat.',
  '- Untuk frontend professional, prioritaskan hasil yang matang lewat struktur, token, dan state UI lengkap, bukan lewat banyak dependency dekoratif.',
  '- Jika user meminta web, landing page, dashboard, atau app baru, jangan biarkan starter scaffold tetap aktif. Ganti file entry utama seperti src/App.tsx, src/main.tsx, page.tsx, atau index.html sesuai arsitektur project.',
  '- Fokus pada implementasi nyata yang bisa langsung diterapkan ke workspace.'
].join('\n');

export const buildProfessionalUiContract = () => [
  'Professional UI Contract:',
  '- Gunakan satu bahasa visual yang tenang, professional, dan konsisten. Jangan membuat UI yang ramai atau terasa seperti template AI generik.',
  '- Mulai dari information hierarchy, CTA priority, navigation clarity, dan section rhythm sebelum dekorasi visual.',
  '- Pilih satu style direction yang jelas untuk solusi ini, misalnya minimal premium, editorial, soft bento, modern commerce, atau dashboard clean. Jangan campur banyak style sekaligus.',
  '- Pilih satu color palette yang koheren dengan 1 accent utama, surface yang jelas, dan text contrast yang sehat.',
  '- Pilih pasangan typography yang masuk akal untuk produk dan jaga scale heading/body/action tetap konsisten.',
  '- Definisikan token visual yang jelas: spacing, type scale, radii, border, surface, accent, dan focus ring.',
  '- Jaga kontras kuat, focus state jelas, dan struktur heading yang benar. Accessibility adalah syarat minimum, bukan polish tambahan.',
  '- Untuk halaman marketing atau landing page, buat narasi yang jelas: hero, trust signal, value, proof, detail, CTA close.',
  '- Hindari hero generik + kumpulan card acak. Setiap section harus punya fungsi yang jelas.',
  '- Jangan bergantung pada gambar placeholder rusak. Layout tetap harus terlihat bagus tanpa gambar.',
  '- Pastikan CSS atau styling layer rapi, terorganisir, dan tidak terasa seperti dump class acak tanpa ritme.',
  '- Utamakan layout yang implementable dan maintainable. Tambahkan dependency UI hanya jika benar-benar memberi nilai yang jelas.',
  '- Prefer quality bar ala shadcn blocks, React Spectrum accessibility, Open UI patterns, dan design-token discipline.',
  '- Jika prompt tidak menyebut style khusus, pilih desain yang lebih sederhana, tajam, dan product-grade daripada efek dekoratif.'
].join('\n');

export const buildUiStyleDecisionContract = () => [
  'UI Style Decision Contract:',
  '- Before writing UI code, silently decide the product archetype: commerce, SaaS dashboard, editorial, portfolio, docs, or utility app.',
  '- Pick exactly one style direction that fits the request, for example calm premium, modern commerce, editorial minimal, soft bento, or dense productivity UI.',
  '- Pick exactly one palette strategy with clear surface, text, border, muted, and accent roles. Do not mix unrelated accent colors.',
  '- Pick exactly one typography mood and keep it consistent across headings, body, metadata, and actions.',
  '- Decide layout density up front: airy, balanced, or compact. Apply it consistently across sections and component spacing.',
  '- Choose reusable section patterns first, then implement components from those patterns instead of improvising each block independently.',
  '- If the prompt is broad, prefer a simpler premium product UI over a flashy but weak layout.'
].join('\n');

export const buildUiDesignSystemGenerationContract = () => [
  'UI Design System Generation Contract:',
  '- Before writing UI code, internally generate a compact design-system recommendation for this request.',
  '- Decide and keep consistent: page pattern, section order, CTA placement, style direction, palette roles, typography pairing, spacing rhythm, radii, borders, elevation, focus treatment, and motion tone.',
  '- For landing pages, think in conversion-oriented sections such as hero, trust signal, value explanation, supporting proof, detail bands, and final CTA close.',
  '- For product UI, think in information architecture first: navigation, primary workspace, secondary controls, empty states, and error or loading states.',
  '- Surface the result in the code through consistent tokens and repeated composition patterns, not through a verbose prose explanation.',
  '- Prefer strong structure and calm density over visual effects.',
  '- If the brief is ambiguous, choose a premium, simple, and implementable product direction.'
].join('\n');

export const buildUiAntiPatternGate = () => [
  'UI Anti-Pattern Gate:',
  '- Avoid AI-generic layouts that look like a hero, three cards, and random gradient blocks without narrative purpose.',
  '- Avoid empty decorative space that weakens content density or forces the user to scroll without reward.',
  '- Avoid harsh neon accents, accidental purple bias, and mixed visual languages unless the brief truly calls for it.',
  '- Avoid giant border radii, exaggerated shadows, and glass effects unless they directly support the chosen style direction.',
  '- Avoid shipping a screen that looks broken when images, icons, or remote assets fail.',
  '- Avoid noisy headers, duplicate controls, and redundant informational panels in IDE-like UIs.'
].join('\n');

export const buildUiCriticalQualityGate = () => [
  'UI Critical Quality Gate:',
  '- Ensure primary interactive targets are comfortably clickable and mobile-safe, roughly 44x44 minimum hit area.',
  '- Keep body text readable on mobile and avoid tiny typography that looks elegant but fails in real use.',
  '- Keep body line-height in a comfortable range and avoid long unreadable paragraphs without width control.',
  '- Reserve space for async or missing content so the layout does not collapse or jump awkwardly.',
  '- Add explicit loading, empty, error, and disabled states for important UI blocks and buttons.',
  '- Prefer SVG/icon systems or real assets over emoji-like decoration.',
  '- Respect reduced-motion expectations and keep transitions restrained, usually short transform/opacity transitions.',
  '- Keep z-index, elevation, and overlay behavior simple and intentional instead of stacking arbitrary values.',
  '- If images or illustrations fail, the screen must still look complete and intentional.'
].join('\n');

export const buildTailwindUiContract = () => [
  'Tailwind UI Implementation Contract:',
  '- Untuk pekerjaan frontend/UI di AURA, default-kan styling ke Tailwind CSS v4 kecuali user secara eksplisit meminta CSS biasa, SCSS, atau library styling lain.',
  '- Gunakan utility class secara disiplin dengan struktur yang terbaca. Jangan membuat class soup acak tanpa grouping yang jelas.',
  '- Gunakan token warna, spacing, radius, shadow, dan typography secara konsisten melalui kombinasi utility yang stabil.',
  '- Jangan mengarang utility alias yang tidak didefinisikan, seperti text-text, bg-text, atau border-bg. Gunakan utility Tailwind bawaan atau token AURA yang benar-benar ada.',
  '- Jika ada pola yang berulang, ekstrak ke komponen atau helper class yang masuk akal daripada mengulang blok utility yang kacau.',
  '- Jangan mencampur Tailwind dengan file CSS besar yang redundant kecuali benar-benar dibutuhkan untuk base layer atau animation khusus.',
  '- Jangan menggandakan @theme, @layer base, atau keyframes yang sama di src/index.css. Jika baseline sudah ada, tambahkan hanya ekstensi yang benar-benar baru.',
  '- Pastikan layout tetap bagus di mobile, tablet, dan desktop menggunakan breakpoint yang sengaja dipilih, bukan sekadar ditumpuk.',
  '- Gunakan layout dengan gap yang konsisten dan hindari spacing acak yang sulit dirawat.',
  '- Untuk komponen bergaya design-system, utamakan struktur utility yang tenang, reusable, dan mudah dipahami.'
].join('\n');

export const buildFrontendAppReadyContract = () => [
  'Frontend App Ready Contract:',
  '- Jika user meminta website, landing page, dashboard, toko online, atau web app, hasil akhir harus siap dijalankan sebagai aplikasi frontend nyata, bukan hanya kumpulan komponen lepas.',
  '- Pastikan entrypoint utama benar-benar diganti dan terhubung, misalnya src/main.tsx dan src/App.tsx untuk Vite React biasa.',
  '- Jika menggunakan Tailwind, dependency dan wiring yang dibutuhkan harus ikut dibuat atau diperbarui di package.json dan file style entry yang relevan.',
  '- Jangan berhenti di satu hero section. Hasil minimal harus punya struktur halaman yang utuh, state dasar yang masuk akal, dan navigasi/CTA yang jelas jika konteksnya membutuhkan itu.',
  '- Jika membuat komponen baru, pastikan komponen itu benar-benar diimpor dan dipakai oleh entry page utama.',
  '- Jangan membuat file pendukung yatim yang tidak pernah dirender.',
  '- Jika request mengarah ke produk/toko/dashboard, sertakan data mock, section pendukung, dan interaksi dasar yang membuat aplikasi terasa hidup.',
  '- Pastikan preview tidak lagi menampilkan starter scaffold atau halaman kosong sebelum task dianggap selesai.'
].join('\n');

export const buildFrontendRealismContract = () => [
  'Frontend Realism Contract:',
  '- Jangan kirim website yang berisi link kosong seperti href="#", href="", to="#", to="", atau javascript:void(0), kecuali anchor itu benar-benar punya target id section yang ada di halaman.',
  '- Untuk landing page atau website company, sertakan link navigasi dan CTA yang terasa nyata, misalnya ke #services, #about, #contact, /products, /services, mailto:, tel:, atau WhatsApp link.',
  '- Untuk commerce, dashboard, katalog, atau app dengan banyak card, sertakan seed/mock data yang realistis dalam array atau module data agar UI terasa hidup dan tidak kosong.',
  '- Untuk testimonial, layanan, pricing, produk, FAQ, atau team section, isi dengan data dummy yang believable: nama, label, ringkasan, harga, rating, lokasi, atau metadata lain yang relevan.',
  '- Sertakan strategi gambar atau ilustrasi yang nyata: local asset di src/assets, inline SVG, URL gambar yang masuk akal, atau placeholder visual yang tetap intentional jika gambar gagal.',
  '- Setiap gambar harus punya alt text yang jelas dan layout tetap utuh walau gambar tidak termuat.',
  '- Hindari lorem ipsum, CTA generik tanpa tujuan, dan tombol yang tidak melakukan apa-apa.',
  '- Jika request membutuhkan detail mendalam, utamakan realisme konten dan keterhubungan antar section sebelum menambah efek visual.',
  '- Jika membuat website atau app yang tampak siap tayang, jangan berhenti di struktur visual saja. Pastikan ada data awal, target link, dan copy yang cukup rinci agar preview terasa seperti produk nyata.'
].join('\n');

const inferFrontendSeedProfile = (prompt: string) => {
  if (/(dashboard|admin|analytics|crm|erp|saas|monitoring|backoffice)/i.test(prompt)) {
    return [
      '- Buat seed data dashboard yang nyata: sidebar nav, KPI cards, recent activity, alerts, chart series, dan 5-8 row tabel.',
      '- Sertakan data user atau team summary, status badge, due date, dan metadata waktu agar panel tidak terasa kosong.',
      '- Pastikan semua CTA seperti View detail, Manage, Export, atau Contact support mengarah ke route atau anchor nyata.'
    ];
  }

  if (/(toko|store|shop|ecommerce|e-commerce|catalog|katalog|produk|product)/i.test(prompt)) {
    return [
      '- Buat seed data commerce yang realistis: kategori, 6-8 featured products, price, rating, stock state, badge promo, dan testimonial pembeli.',
      '- Sertakan link nyata ke /products, /products/:slug, /cart, /checkout, atau anchor section yang sesuai.',
      '- Sediakan gambar produk melalui local asset, inline SVG, atau URL gambar yang masuk akal dengan alt text yang baik.'
    ];
  }

  if (/(bengkel|service|servis|agency|company|company profile|profil perusahaan|landing|website|bisnis|klinik|resto|restaurant|travel|hotel)/i.test(prompt)) {
    return [
      '- Buat seed data website bisnis yang realistis: nav links, 4-6 layanan atau value props, 3 testimonial, FAQ singkat, contact methods, dan service area atau jam operasional jika relevan.',
      '- CTA utama harus punya tujuan nyata seperti #contact, #booking, tel:, mailto:, WhatsApp, atau halaman /services.',
      '- Sertakan hero visual, service illustration, atau gallery starter agar halaman terasa hidup walau data masih dummy.'
    ];
  }

  if (/(portfolio|creative|studio|freelance|personal brand|agency profile)/i.test(prompt)) {
    return [
      '- Buat seed data portfolio yang realistis: 3-6 project cards, client/result highlights, testimonial, process steps, social links, dan contact section.',
      '- Gunakan link nyata ke #work, #about, #contact, GitHub, Dribbble, Behance, LinkedIn, atau halaman project.',
      '- Sertakan visual preview project melalui local asset, inline SVG mockup, atau image URL yang masuk akal.'
    ];
  }

  return [
    '- Buat seed data dasar yang realistis: navigation links, supporting sections, 3-6 cards/item, testimonial atau trust proof, dan contact methods.',
    '- Pastikan CTA dan navigation mengarah ke route, anchor, atau protocol link yang benar-benar dipakai halaman.',
    '- Sediakan strategi visual nyata melalui asset lokal, SVG, atau image URL yang masuk akal dengan fallback yang tetap intentional.'
  ];
};

export const buildFrontendSeedDataBlueprint = (prompt: string) => [
  'Frontend Seed Data Blueprint:',
  '- Jangan hanya membuat layout. Siapkan konten awal yang believable agar preview terlihat seperti produk nyata sejak pertama dijalankan.',
  '- Jika membuat section berulang, selalu sediakan array data atau module seed agar konten mudah dirawat dan terasa konsisten.',
  '- Jika memakai gambar, pilih salah satu: local asset di src/assets, inline SVG, atau URL gambar yang masuk akal. Jangan biarkan section visual kosong total.',
  ...inferFrontendSeedProfile(prompt)
].join('\n');

export const buildWebProductionModeContract = () => [
  'Web App Production Mode Contract:',
  '- Untuk request web app/frontend biasa, gunakan satu app frontend tunggal yang deterministik.',
  '- Arsitektur default yang diizinkan: package.json, index.html, tsconfig.json, vite.config.ts, postcss.config.js, tailwind.config.js, src/App.tsx, src/main.tsx, src/index.css, src/components/*, src/pages/*, src/lib/*, src/data/*, src/assets/*, src/hooks/*, src/types/*, src/utils/*.',
  '- Jangan membuat struktur frontend tambahan seperti frontend/, client/, app-shell/, atau folder eksperimen lain kecuali user memintanya secara eksplisit.',
  '- Jika memakai import alias internal, default-kan ke @/* -> src/* dan jaga agar config Vite/TypeScript tetap sinkron.',
  '- Jangan membuat backend, API, atau Tauri files untuk request frontend biasa kecuali user memang memintanya.',
  '- Fokuskan output ke aplikasi yang bisa langsung install, build, dan dev dengan jalur Vite React tunggal yang sehat.'
].join('\n');

export const buildMobileAppModeContract = () => [
  'Mobile App Mode Contract:',
  '- Default AURA untuk mobile adalah Capacitor + React kecuali user secara eksplisit meminta Expo atau React Native. Gunakan pola dari skill Expo/React Native sebagai quality guidance, bukan dependency default.',
  '- Mulai dari mobile app map: layar utama, pola navigasi, app shell, persistent actions, dan state/data model sebelum menulis komponen.',
  '- Entry app tetap harus sehat sebagai Vite React app, tetapi tambahkan capacitor.config.ts yang valid untuk menyiapkan jalur hybrid mobile.',
  '- Susun layar seperti aplikasi: top app bar, bottom tabs untuk 3-5 destinasi utama bila cocok, stack/detail screen untuk drill-down, dan back affordance yang jelas.',
  '- Prioritaskan file di src/App.tsx, src/main.tsx, src/components/*, src/pages/* atau src/screens/*, src/data/*, src/hooks/*, src/lib/*, src/assets/*, dan capacitor.config.ts.',
  '- Jaga safe area, touch targets, scroll containers, keyboard overlap, sticky bottom actions, spacing mobile-first, dan hindari layout marketing page yang hanya disamarkan sebagai mobile app.',
  '- Pastikan layout tidak keluar kanvas preview: hindari transform/position absolute/fixed berlebihan untuk struktur utama, set root/shell dengan min-h-screen, w-full, overflow-x-hidden, dan gunakan .aura-mobile-shell atau .aura-mobile-screen bila membuat frame mobile.',
  '- Untuk list dan feed, gunakan seed arrays di src/data/*, key stabil, card/row reusable, empty/loading/error/offline states, serta hindari satu file raksasa berisi DOM statis.',
  '- Jika user meminta data nyata, siapkan seed data screen-friendly seperti cards, lists, stats, booking slots, vehicles, orders, notifications, chats, cart items, atau account summaries sesuai konteks app.',
  '- Sertakan strategi gambar/media yang realistis: src/assets, inline SVG, URL gambar masuk akal, atau fallback visual yang tetap rapi. Jangan tinggalkan image slot kosong.',
  '- Tambahkan state mobile penting jika relevan: permission denied, network/offline, sync pending, disabled submit, skeleton/loading, empty result, dan validasi form.',
  '- Untuk baseline Capacitor + React, jangan menambahkan package React Native atau Expo seperti tailwindcss-react-native, nativewind, react-native, expo, metro, atau @react-navigation/* kecuali user secara eksplisit meminta stack React Native/Expo.',
  '- Jangan membuat app.json, babel.config.js, atau metro.config.js untuk baseline Capacitor + React. Gunakan vite.config.ts, tsconfig.json, package.json, src/index.css, dan capacitor.config.ts.',
  '- Jaga package tetap ramping. Jangan menambah native plugin kecuali prompt membutuhkan kamera, geolocation, filesystem, notifications, biometrics, atau capability native spesifik.',
  '- Jangan membuat folder android/ atau ios/ dari model secara bebas. Cukup siapkan scaffold konfigurasi dan aplikasi utama yang mobile-ready sampai user meminta native sync/build.'
].join('\n');

export const buildMobileUiUxDesignContract = () => [
  'Mobile UI/UX Design Contract:',
  '- Treat mobile as touch-first product design, not a narrow desktop viewport. Define the user journey, primary task, and screen hierarchy before choosing visual decoration.',
  '- The app must render in a normal browser preview without black screen, duplicated off-canvas panels, huge negative margins, or rotated/translated root containers.',
  '- Respect platform conventions conceptually: iOS-style back affordance/top actions and bottom tabs where appropriate; Android-style top back/menu patterns, bottom navigation, or FAB when the primary action needs it.',
  '- Keep touch targets generous: aim for at least 44px on iOS-like targets and 48px on Android-like targets, with at least 8px spacing between adjacent controls.',
  '- Keep mobile typography readable: body text should usually be 16px+, metadata/labels should not become tiny, line-height must feel comfortable, and hierarchy must be visible through size, weight, and color.',
  '- Keep contrast accessible: normal text should target WCAG AA contrast, UI boundaries and icons need visible contrast, and color must never be the only signal for errors, warnings, or status.',
  '- Add interaction feedback: pressed states, disabled states, loading state for operations over roughly 1 second, and clear recovery text for errors. Avoid silent taps.',
  '- Use progressive disclosure: keep each screen focused on its primary job, move detail into drill-down views, and avoid overwhelming first screens with every feature at once.',
  '- For forms, design for thumbs and keyboards: correct input types, concise labels, inline validation, visible error text, disabled submit while invalid, and no keyboard-covered primary action.',
  '- For media-heavy screens, reserve image aspect-ratio space, provide fallback visuals, and keep layout stable when remote images fail or load slowly.',
  '- For lists, use reusable cards/rows, stable keys, realistic seed data, empty states, loading skeletons, pull-to-refresh or refresh affordance when context fits, and avoid massive static markup.',
  '- Create a compact semantic design system in code: atmosphere, palette roles, typography scale, spacing rhythm, radii, elevation, focus/pressed states, and icon style. Reflect it through reusable components and tokens.',
  '- Convert vague prompts into specific UI decisions internally: product archetype, target user, screen set, navigation pattern, content density, style mood, palette role, and component inventory.',
  '- Separate content from UI where useful: put products, menu items, onboarding slides, profile data, cart items, orders, notifications, and settings rows in src/data/* rather than hardcoding every repeated item.',
  '- Prefer calm, product-grade motion: opacity/transform transitions, restrained haptics language if described, no flashy motion that hurts performance or clarity.'
].join('\n');

export const buildComponentSystemQualityGate = () => [
  'Component System Quality Gate:',
  '- Komponen harus memiliki tanggung jawab yang jelas dan nama yang sesuai isi.',
  '- Hindari file CSS besar yang menumpuk semua styling jika struktur komponen dan utility sudah cukup.',
  '- Untuk tombol, card, nav, dan section berulang, jaga konsistensi radius, spacing, border, dan hover state.',
  '- Jangan campur gaya utility mentah, inline style, dan CSS ad-hoc tanpa alasan kuat.',
  '- Jika memakai pola ala shadcn, pertahankan disiplin varian, spacing, dan semantic hierarchy alih-alih menimpa semuanya dengan warna mentah.'
].join('\n');

export const buildAiPromptEnvelope = ({
  developerContext,
  projectRulesContext,
  domains,
  preferredTargets,
  executionPlan,
  attachmentContext,
  prompt,
  prioritizeFastFix = false,
  revisionMode = false,
  activeFilePath = ''
}: {
  developerContext: string;
  projectRulesContext?: string;
  domains: string[];
  preferredTargets: string[];
  executionPlan: string[];
  attachmentContext: string;
  prompt: string;
  prioritizeFastFix?: boolean;
  revisionMode?: boolean;
  activeFilePath?: string;
}) => {
  const domainContext = `Active Work Domains: ${domains.join(', ')}`;
  const targetContext = preferredTargets.length > 0
    ? `Preferred Workspace Targets:\n${preferredTargets.map((target) => `- ${target}`).join('\n')}`
    : 'Preferred Workspace Targets:\n- workspace root';
  const planContext = `Suggested Execution Plan:\n${executionPlan.map((step, index) => `${index + 1}. ${step}`).join('\n')}`;
  const focusContext = activeFilePath ? `Active File Focus: ${activeFilePath}` : '';

  return [
    developerContext,
    projectRulesContext || '',
    domainContext,
    targetContext,
    focusContext,
    planContext,
    prioritizeFastFix ? buildErrorFixContract() : '',
    !prioritizeFastFix && revisionMode ? buildRevisionSafetyContract({ activeFilePath, preferredTargets }) : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildProfessionalUiContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildUiStyleDecisionContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildUiDesignSystemGenerationContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildUiAntiPatternGate() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildUiCriticalQualityGate() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildTailwindUiContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildFrontendAppReadyContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildFrontendRealismContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildFrontendSeedDataBlueprint(prompt) : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system')) ? buildWebProductionModeContract() : '',
    !prioritizeFastFix && domains.includes('mobile') ? buildMobileAppModeContract() : '',
    !prioritizeFastFix && domains.includes('mobile') ? buildMobileUiUxDesignContract() : '',
    !prioritizeFastFix && (domains.includes('frontend') || domains.includes('design-system') || domains.includes('mobile')) ? buildComponentSystemQualityGate() : '',
    buildWorkspaceOutputContract(),
    attachmentContext,
    `User Request:\n${prompt}`
  ].filter(Boolean).join('\n\n');
};

export const buildPlanningActivitySteps = (
  domains: string[],
  executionPlan: string[],
  preferredTargets: string[]
): AiActivityEntry['steps'] => ([
  {
    label: 'Planning',
    detail: `Menganalisis prompt, task preset, skill aktif, dan domain kerja: ${domains.join(', ')}.`,
    status: 'working'
  },
  {
    label: 'Execution Plan',
    detail: executionPlan.join(' '),
    status: 'planning'
  },
  {
    label: 'Generating',
    detail: 'Menunggu model mulai menyusun solusi.',
    status: 'planning'
  },
  {
    label: 'Workspace Draft',
    detail: `Draft file akan muncul di panel tengah. Target folder utama: ${preferredTargets.join(', ') || 'workspace root'}.`,
    status: 'planning'
  }
]);

export const buildGeneratingActivitySteps = ({
  domains,
  preferredTargets,
  executionPlan,
  provider,
  model
}: {
  domains: string[];
  preferredTargets: string[];
  executionPlan: string[];
  provider: string;
  model: string;
}): AiActivityEntry['steps'] => ([
  {
    label: 'Planning',
    detail: `Prompt sudah dipahami. Domain aktif: ${domains.join(', ')}. Target: ${preferredTargets.join(', ') || 'workspace root'}.`,
    status: 'done'
  },
  {
    label: 'Execution Plan',
    detail: executionPlan.join(' '),
    status: 'done'
  },
  {
    label: 'Generating',
    detail: `Menggunakan ${provider} • ${model} untuk menghasilkan perubahan.`,
    status: 'working'
  },
  {
    label: 'Workspace Draft',
    detail: 'Menunggu respons model untuk diubah menjadi draft file.',
    status: 'planning'
  }
]);

export const buildNoDraftActivitySteps = (): AiActivityEntry['steps'] => ([
  {
    label: 'Planning',
    detail: 'Analisis tugas selesai.',
    status: 'done'
  },
  {
    label: 'Generating',
    detail: 'Model selesai menjawab tanpa menghasilkan file baru.',
    status: 'done'
  },
  {
    label: 'Workspace Draft',
    detail: 'Tidak ada draft file yang perlu diterapkan.',
    status: 'done'
  }
]);

export const buildFailureActivitySteps = (message: string): AiActivityEntry['steps'] => ([
  {
    label: 'Planning',
    detail: 'Prompt sudah diproses, tetapi request berakhir gagal.',
    status: 'done'
  },
  {
    label: 'Generating',
    detail: message,
    status: 'error'
  },
  {
    label: 'Workspace Draft',
    detail: 'Tidak ada file yang dibuat karena request gagal.',
    status: 'error'
  }
]);

export const buildDraftReadyActivitySteps = ({
  domains,
  preferredTargets,
  responseText,
  generatedCount,
  inferExecutionPlan
}: {
  domains: string[];
  preferredTargets: string[];
  responseText: string;
  generatedCount: number;
  inferExecutionPlan: (domains: string[], preferredTargets: string[], prompt: string) => string[];
}): AiActivityEntry['steps'] => ([
  {
    label: 'Planning',
    detail: 'AURA sudah menentukan arah implementasi berdasarkan prompt dan preset task.',
    status: 'done'
  },
  {
    label: 'Execution Plan',
    detail: inferExecutionPlan(domains, preferredTargets, responseText).join(' '),
    status: 'done'
  },
  {
    label: 'Generating',
    detail: 'Model selesai menghasilkan respons coding dan struktur file.',
    status: 'done'
  },
  {
    label: 'Workspace Draft',
    detail: `${generatedCount} file draft siap direview di panel tengah. Target utama: ${preferredTargets.join(', ') || 'workspace root'}.`,
    status: 'done'
  }
]);

export const buildAssistantChatContent = (generatedDraftCount: number, responseText: string) =>
  generatedDraftCount > 0
    ? `[AURA] Rencana coding selesai. Saya sudah menyiapkan ${generatedDraftCount} file. Tab file dibuka di panel tengah dan struktur folder diperbarui di explorer kiri.`
    : (responseText || 'Model tidak mengembalikan teks.');

export const shouldRunUiReviewLoop = (domains: string[], taskPreset: string) =>
  domains.includes('frontend') ||
  domains.includes('mobile') ||
  domains.includes('design-system') ||
  taskPreset === 'frontend-ui' ||
  taskPreset === 'mobile-app' ||
  taskPreset === 'fullstack';

export const buildUiReviewLoopPrompt = ({
  userPrompt,
  domains,
  preferredTargets,
  projectRulesContext = '',
  checklist,
  generatedFiles,
  reviewMode = 'source',
  previewSnapshotContext = '',
  forceRewrite = false
}: {
  userPrompt: string;
  domains: string[];
  preferredTargets: string[];
  projectRulesContext?: string;
  checklist: string[];
  generatedFiles: Array<{ relativePath: string; content: string }>;
  reviewMode?: 'source' | 'preview';
  previewSnapshotContext?: string;
  forceRewrite?: boolean;
}) => {
  const fileSections = generatedFiles.map((file) => [
    `File: ${file.relativePath}`,
    '```',
    file.content,
    '```'
  ].join('\n')).join('\n\n');

  return [
    reviewMode === 'preview' ? 'Preview Review Loop:' : 'UI Review Loop:',
    reviewMode === 'preview'
      ? 'Review the current runtime/frontend output critically as a senior design engineer using both preview snapshot data and source files.'
      : 'Review the generated frontend/UI output critically as a senior design engineer.',
    'Your job is to improve weak hierarchy, poor contrast, generic composition, broken spacing rhythm, weak typography, missing responsive behavior, weak CTA clarity, and bad fallback states.',
    forceRewrite ? 'The current output is too weak. Do not make tiny refinements. Replace the main screen structure with a stronger, product-grade Tailwind implementation.' : '',
    'Only return files that actually need refinement.',
    'If no UI improvement is needed, respond exactly with: NO_UI_CHANGES_NEEDED',
    '',
    `Original user request:\n${userPrompt}`,
    '',
    `Active domains: ${domains.join(', ')}`,
    `Preferred targets:\n${preferredTargets.map((item) => `- ${item}`).join('\n') || '- workspace root'}`,
    '',
    projectRulesContext,
    '',
    buildProfessionalUiContract(),
    buildUiStyleDecisionContract(),
    buildUiCriticalQualityGate(),
    buildTailwindUiContract(),
    buildFrontendAppReadyContract(),
    buildFrontendRealismContract(),
    buildFrontendSeedDataBlueprint(userPrompt),
    buildWebProductionModeContract(),
    domains.includes('mobile') || /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileAppModeContract() : '',
    domains.includes('mobile') || /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileUiUxDesignContract() : '',
    buildComponentSystemQualityGate(),
    '',
    'UI quality checklist:',
    ...checklist.map((item) => `- ${item}`),
    '',
    reviewMode === 'preview' ? 'Preview snapshot:' : '',
    reviewMode === 'preview' ? previewSnapshotContext : '',
    '',
    buildWorkspaceOutputContract(),
    '',
    reviewMode === 'preview' ? 'Current workspace files relevant to preview:' : 'Current generated files:',
    fileSections
  ].filter(Boolean).join('\n');
};

export const buildStarterReplacementPrompt = ({
  userPrompt,
  preferredTargets,
  projectRulesContext = '',
  generatedFiles,
  previewSnapshotContext
}: {
  userPrompt: string;
  preferredTargets: string[];
  projectRulesContext?: string;
  generatedFiles: Array<{ relativePath: string; content: string }>;
  previewSnapshotContext: string;
}) => {
  const fileSections = generatedFiles.map((file) => [
    `File: ${file.relativePath}`,
    '```',
    file.content,
    '```'
  ].join('\n')).join('\n\n');

  return [
    'Starter Replacement Recovery:',
    'The preview still shows the default AURA starter scaffold. This means the main app entrypoint was not replaced successfully.',
    'Your job is to replace the starter with a real application implementation that matches the user request.',
    'You must update the true entry files, not only add supporting components.',
    'If the project is a normal Vite React app, ensure src/App.tsx and any required supporting files are updated so the preview no longer shows starter content.',
    '',
    `Original user request:\n${userPrompt}`,
    '',
    `Preferred targets:\n${preferredTargets.map((item) => `- ${item}`).join('\n') || '- workspace root'}`,
    '',
    projectRulesContext,
    '',
    'Preview evidence:',
    previewSnapshotContext,
    '',
    buildProfessionalUiContract(),
    buildUiStyleDecisionContract(),
    buildUiCriticalQualityGate(),
    buildTailwindUiContract(),
    buildFrontendAppReadyContract(),
    buildFrontendRealismContract(),
    buildFrontendSeedDataBlueprint(userPrompt),
    buildWebProductionModeContract(),
    /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileAppModeContract() : '',
    /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileUiUxDesignContract() : '',
    buildComponentSystemQualityGate(),
    buildWorkspaceOutputContract(),
    '',
    'Current generated files:',
    fileSections
  ].filter(Boolean).join('\n');
};

export const buildVerificationRecoveryPrompt = ({
  userPrompt,
  failedCommand,
  terminalOutput,
  domains,
  preferredTargets,
  projectRulesContext = '',
  relevantFiles
}: {
  userPrompt: string;
  failedCommand: string;
  terminalOutput: string;
  domains: string[];
  preferredTargets: string[];
  projectRulesContext?: string;
  relevantFiles: Array<{ relativePath: string; content: string }>;
}) => {
  const fileSections = relevantFiles.map((file) => [
    `File: ${file.relativePath}`,
    '```',
    file.content,
    '```'
  ].join('\n')).join('\n\n');

  return [
    'Verification Recovery Loop:',
    'A verification command failed after the AI wrote files to the workspace.',
    'Your job is to fix the real cause of the failure using the smallest coherent set of file edits.',
    'Do not rewrite the whole app unless the failure truly requires it.',
    'Only return files that need to change.',
    '',
    `Original user request:\n${userPrompt}`,
    '',
    `Failed command: ${failedCommand}`,
    '',
    `Active domains: ${domains.join(', ')}`,
    `Preferred targets:\n${preferredTargets.map((item) => `- ${item}`).join('\n') || '- workspace root'}`,
    '',
    projectRulesContext,
    '',
    buildProfessionalUiContract(),
    buildUiCriticalQualityGate(),
    buildTailwindUiContract(),
    buildFrontendAppReadyContract(),
    buildFrontendRealismContract(),
    domains.includes('mobile') || /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileAppModeContract() : '',
    domains.includes('mobile') || /mobile|android|ios|apk|capacitor/i.test(userPrompt) ? buildMobileUiUxDesignContract() : '',
    buildComponentSystemQualityGate(),
    buildWorkspaceOutputContract(),
    '',
    'Terminal failure log:',
    '```text',
    terminalOutput,
    '```',
    '',
    'Relevant workspace files:',
    fileSections || 'No relevant files were captured.'
  ].filter(Boolean).join('\n');
};
