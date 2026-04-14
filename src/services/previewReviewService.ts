import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';

const isTauriDesktop =
  typeof window !== 'undefined' &&
  (!!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__);

export type PreviewSnapshot = {
  url: string;
  title: string;
  shellOnly: boolean;
  starterTemplate: boolean;
  sectionCount: number;
  headings: string[];
  buttons: string[];
  links: string[];
  images: string[];
  bodyTextSample: string;
  summary: string;
  promptContext: string;
};

export type PreviewScreenshot = {
  path: string;
  dataUrl: string;
  visuallyBlank: boolean;
};

const fetchPreviewHtml = async (url: string) => {
  if (isTauriDesktop) {
    return invoke<string>('proxy_http_request', {
      request: {
        url,
        method: 'GET'
      }
    });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Preview fetch failed: HTTP ${response.status}`);
  }

  return response.text();
};

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const isLikelyAuraStarter = (title: string, bodyText: string, headings: string[]) => {
  const haystack = `${title} ${bodyText} ${headings.join(' ')}`.toLowerCase();
  return (
    haystack.includes('aura starter') ||
    haystack.includes('project baru ini dibuat dari aura ide') ||
    haystack.includes('fondasi vite + react + typescript')
  );
};

const isLikelySpaShell = (bodyMarkup: string, bodyText: string, headings: string[], buttons: string[], links: string[]) => {
  const compactMarkup = bodyMarkup.replace(/\s+/g, ' ').trim().toLowerCase();
  const rootOnlyPatterns = [
    /^<div id="root"><\/div>$/,
    /^<div id='root'><\/div>$/,
    /^<div id="app"><\/div>$/,
    /^<div id='app'><\/div>$/
  ];

  return (
    rootOnlyPatterns.some((pattern) => pattern.test(compactMarkup)) ||
    (
      bodyText.length < 80 &&
      headings.length === 0 &&
      buttons.length === 0 &&
      links.length < 2
    )
  );
};

export const capturePreviewSnapshot = async (url: string): Promise<PreviewSnapshot> => {
  const html = await fetchPreviewHtml(url);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const title = normalizeText(doc.title || '');
  const bodyText = normalizeText(doc.body?.textContent || '');
  const headings = Array.from(doc.querySelectorAll('h1, h2, h3'))
    .map((node) => normalizeText(node.textContent || ''))
    .filter(Boolean)
    .slice(0, 10);
  const buttons = Array.from(doc.querySelectorAll('button, [role="button"]'))
    .map((node) => normalizeText(node.textContent || ''))
    .filter(Boolean)
    .slice(0, 10);
  const links = Array.from(doc.querySelectorAll('a[href]'))
    .map((node) => normalizeText(node.textContent || (node as HTMLAnchorElement).href || ''))
    .filter(Boolean)
    .slice(0, 10);
  const images = Array.from(doc.querySelectorAll('img'))
    .map((node) => {
      const image = node as HTMLImageElement;
      const alt = normalizeText(image.alt || '');
      const src = normalizeText(image.getAttribute('src') || '');
      return alt ? `${alt}${src ? ` (${src})` : ''}` : src;
    })
    .filter(Boolean)
    .slice(0, 10);
  const sectionCount = doc.querySelectorAll('main, section, article, nav, header, footer').length;
  const bodyMarkup = normalizeText(doc.body?.innerHTML || '');
  const shellOnly = isLikelySpaShell(bodyMarkup, bodyText, headings, buttons, links);
  const starterTemplate = isLikelyAuraStarter(title, bodyText, headings);
  const bodyTextSample = bodyText.slice(0, 1200);

  const summary = shellOnly
    ? 'Preview aktif, tetapi HTML yang terbaca hanya shell SPA/root placeholder. Runtime DOM belum cukup kaya untuk review visual otomatis.'
    : starterTemplate
      ? 'Preview aktif, tetapi yang tampil masih starter scaffold AURA. Entrypoint app utama belum benar-benar diganti oleh hasil AI.'
    : `Preview runtime terbaca. ${headings.length} heading, ${buttons.length} tombol, ${links.length} link, ${images.length} image reference, ${sectionCount} structural section.`;

  const promptContext = [
    `Preview URL: ${url}`,
    `Preview title: ${title || '(untitled)'}`,
    `Shell only: ${shellOnly ? 'yes' : 'no'}`,
    `Starter template visible: ${starterTemplate ? 'yes' : 'no'}`,
    `Section count: ${sectionCount}`,
    `Headings: ${headings.length ? headings.map((item) => `- ${item}`).join('\n') : '- none detected'}`,
    `Buttons: ${buttons.length ? buttons.map((item) => `- ${item}`).join('\n') : '- none detected'}`,
    `Links: ${links.length ? links.map((item) => `- ${item}`).join('\n') : '- none detected'}`,
    `Images: ${images.length ? images.map((item) => `- ${item}`).join('\n') : '- none detected'}`,
    `Visible text sample:\n${bodyTextSample || '(no meaningful body text detected)'}`
  ].join('\n\n');

  return {
    url,
    title,
    shellOnly,
    starterTemplate,
    sectionCount,
    headings,
    buttons,
    links,
    images,
    bodyTextSample,
    summary,
    promptContext
  };
};

const bytesToDataUrl = (bytes: Uint8Array, mimeType: string) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${mimeType};base64,${btoa(binary)}`;
};

const analyzeScreenshotVisualBlankness = async (dataUrl: string) => {
  if (typeof window === 'undefined') return false;

  return new Promise<boolean>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = Math.max(1, Math.min(160, image.naturalWidth || image.width || 1));
        const height = Math.max(1, Math.min(160, image.naturalHeight || image.height || 1));
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          resolve(false);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const { data } = context.getImageData(0, 0, width, height);

        let lightPixels = 0;
        let darkPixels = 0;
        let totalPixels = 0;

        for (let index = 0; index < data.length; index += 16) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const alpha = data[index + 3];
          if (alpha < 8) continue;

          totalPixels += 1;
          const luminance = (red + green + blue) / 3;
          if (luminance >= 245) lightPixels += 1;
          if (luminance <= 10) darkPixels += 1;
        }

        if (totalPixels === 0) {
          resolve(false);
          return;
        }

        const lightRatio = lightPixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;
        resolve(lightRatio >= 0.94 || darkRatio >= 0.94);
      } catch {
        resolve(false);
      }
    };
    image.onerror = () => resolve(false);
    image.src = dataUrl;
  });
};

export const capturePreviewScreenshot = async (url: string): Promise<PreviewScreenshot | null> => {
  if (!isTauriDesktop) return null;

  const path = await invoke<string>('capture_preview_screenshot', { url });
  const bytes = await readFile(path);
  const dataUrl = bytesToDataUrl(bytes, 'image/png');
  const visuallyBlank = await analyzeScreenshotVisualBlankness(dataUrl);

  return {
    path,
    dataUrl,
    visuallyBlank
  };
};
