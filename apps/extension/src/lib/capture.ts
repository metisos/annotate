/**
 * On-demand capture: queries the active tab for either a text selection or
 * (if it's a YouTube watch page) the video metadata. No persistent content
 * script — uses chrome.scripting.executeScript on demand.
 */

export interface TextCapture {
  kind: 'text';
  url: string;
  title: string;
  ogImage?: string;
  author?: string;
  selectedText: string;
  context: string;
}

export interface VideoCapture {
  kind: 'video';
  url: string;          // canonical youtube watch URL
  title: string;
  ogImage?: string;
  author?: string;
  channelName?: string;
  videoId: string;      // YouTube video ID
  currentTime: number;  // current playback head (for default start)
  duration: number;     // total video duration
}

export type CaptureResult = TextCapture | VideoCapture;

export async function captureFromActiveTab(): Promise<CaptureResult | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) return null;

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractFromPage,
  });

  return (result?.result as CaptureResult | null) ?? null;
}

function extractFromPage(): TextCapture | VideoCapture | null {
  const meta = (name: string) =>
    document
      .querySelector(`meta[property="${name}"], meta[name="${name}"]`)
      ?.getAttribute('content') ?? undefined;

  const sel = window.getSelection?.();
  const selectedText = (sel?.toString() ?? '').trim();

  // If something is highlighted, prefer text capture
  if (selectedText) {
    let context = '';
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
    if (range) {
      let node: Node | null = range.commonAncestorContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      while (node && node instanceof HTMLElement) {
        if (/^(P|ARTICLE|SECTION|MAIN|BLOCKQUOTE|LI|DIV)$/.test(node.tagName)) {
          const text = node.innerText?.trim() ?? '';
          if (text.length >= selectedText.length + 32) {
            context = text.slice(0, 2000);
            break;
          }
        }
        node = node.parentElement;
      }
    }
    return {
      kind: 'text',
      url: document.location.href,
      title: meta('og:title') ?? document.title,
      ogImage: meta('og:image'),
      author: meta('article:author') ?? meta('author'),
      selectedText,
      context,
    };
  }

  // No selection — check for YouTube watch page
  const ytMatch =
    document.location.hostname.endsWith('youtube.com') &&
    new URLSearchParams(document.location.search).get('v');
  if (ytMatch) {
    const video = document.querySelector('video');
    const currentTime = Math.max(0, Math.floor(video?.currentTime ?? 0));
    const duration = Math.max(0, Math.floor(video?.duration ?? 0));
    const channelName =
      (document.querySelector('ytd-channel-name a, ytd-video-owner-renderer a') as HTMLElement | null)
        ?.innerText?.trim() ?? undefined;
    return {
      kind: 'video',
      url: `https://www.youtube.com/watch?v=${ytMatch}`,
      title: meta('og:title') ?? document.title.replace(/ - YouTube$/, ''),
      ogImage: meta('og:image'),
      channelName,
      videoId: ytMatch,
      currentTime,
      duration,
    };
  }

  return null;
}
