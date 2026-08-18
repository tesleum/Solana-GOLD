// Telegram WebApp Integration & WalletConnect Deep-link Fix Helper

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        enableClosingConfirmation: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        initDataUnsafe?: {
          query_id?: string;
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          start_param?: string;
        };
        isExpanded?: boolean;
        platform?: string;
        viewportHeight?: number;
      };
    };
  }
}

export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(
    window.Telegram?.WebApp?.initDataUnsafe?.user || 
    window.Telegram?.WebApp?.initDataUnsafe?.start_param || 
    window.Telegram?.WebApp?.platform
  );
};

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined') {
    return window.Telegram?.WebApp;
  }
  return undefined;
};

export const getTelegramUser = () => {
  if (typeof window !== 'undefined') {
    return window.Telegram?.WebApp?.initDataUnsafe?.user;
  }
  return undefined;
};

/**
 * Extract referral start_param from Telegram WebApp initData or URL parameters.
 */
export const getTelegramReferralParam = (): string | null => {
  if (typeof window === 'undefined') return null;

  // 1. Check Telegram initDataUnsafe.start_param (passed via t.me/bot?startapp=REFERRER_ADDR)
  const tgStartParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (tgStartParam) {
    let clean = tgStartParam.trim();
    if (clean.startsWith('ref_')) {
      clean = clean.substring(4);
    }
    if (clean.length > 3) {
      return clean;
    }
  }

  // 2. Fallback to URL search parameters (?ref=... or ?start=... or ?startapp=...)
  const urlParams = new URLSearchParams(window.location.search);
  const start = urlParams.get('ref') || urlParams.get('start') || urlParams.get('startapp');
  if (start) {
    let clean = start.trim();
    if (clean.startsWith('ref_')) {
      clean = clean.substring(4);
    }
    if (clean.length > 3) {
      return clean;
    }
  }

  return null;
};

/**
 * Trigger Telegram Haptic Feedback
 */
export const triggerTelegramHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
  const tg = getTelegramWebApp();
  if (tg?.HapticFeedback) {
    if (style === 'success' || style === 'warning') {
      tg.HapticFeedback.notificationOccurred(style === 'success' ? 'success' : 'warning');
    } else {
      tg.HapticFeedback.impactOccurred(style);
    }
  }
};

/**
 * Initializes Telegram Mini App view & sets up WalletConnect link interception.
 * WalletConnect deep links (wc:, phantom:, safepal:, trust:, https://...) don't open
 * correctly in Telegram Mini App iframe unless handled via tg.openLink(url).
 */
export const initTelegramIntegration = () => {
  if (typeof window === 'undefined') return;

  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#000000');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
      if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
    } catch (e) {
      console.warn("Telegram WebApp initialization error:", e);
    }

    // Capture referral param
    const refCode = getTelegramReferralParam();
    if (refCode) {
      localStorage.setItem('referrer', refCode);
    }

    // FIX WALLETCONNECT IN TELEGRAM MINI-APP:
    // Intercept window.open & anchor navigation for deep links / universal links
    const originalWindowOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      const urlStr = url?.toString() || '';
      if (tg.openLink && urlStr) {
        if (
          urlStr.startsWith('wc:') ||
          urlStr.startsWith('phantom:') ||
          urlStr.startsWith('safepal:') ||
          urlStr.startsWith('trust:') ||
          urlStr.startsWith('solflare:') ||
          urlStr.includes('phantom.app') ||
          urlStr.includes('walletconnect') ||
          urlStr.includes('link.trustwallet.com')
        ) {
          tg.openLink(urlStr);
          return null;
        }
      }
      return originalWindowOpen.call(window, url, target, features);
    };
  }
};

/**
 * Opens Telegram share link dialog for referral sharing
 */
export const shareTelegramReferralLink = (referralAddress: string, customMessage?: string) => {
  const botUsername = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || 'usgold_bot';
  const cleanAddr = referralAddress && referralAddress.trim().length > 0 ? referralAddress.trim() : 'GOLDEN';
  const shareUrl = cleanAddr.startsWith('http') 
    ? cleanAddr 
    : `https://t.me/${botUsername}/app?startapp=${cleanAddr}`;
  const text = customMessage || `🎁 Join me on Solana GOLD! Stake usGOLD to earn yield + get 1 usGOLD referral bonus!`;
  
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;

  const tg = getTelegramWebApp();
  if (isTelegramWebApp() && tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(telegramShareUrl);
      return;
    } catch (e) {
      console.warn("tg.openTelegramLink error, falling back:", e);
    }
  }
  if (isTelegramWebApp() && tg?.openLink) {
    try {
      tg.openLink(telegramShareUrl);
      return;
    } catch (e) {
      console.warn("tg.openLink error, falling back:", e);
    }
  }
  
  // Safe browser link opening for desktop and mobile web
  try {
    const a = document.createElement('a');
    a.href = telegramShareUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    window.open(telegramShareUrl, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Universal Share using Web Share API when supported, with fallback to Telegram / Clipboard
 */
export const shareReferral = async (
  referralAddress: string, 
  title?: string, 
  customMessage?: string
): Promise<{ success: boolean; method: 'web_share' | 'telegram' | 'clipboard' }> => {
  const cleanAddr = referralAddress && referralAddress.trim().length > 0 ? referralAddress.trim() : 'GOLDEN';
  const refUrl = typeof window !== 'undefined' ? `${window.location.origin}?ref=${cleanAddr}` : `https://solanagold.pro/?ref=${cleanAddr}`;
  const shareTitle = title || 'Solana GOLD - usGOLD Staking & Yield Vaults';
  const shareText = customMessage || '🎁 Join me on Solana GOLD! Stake usGOLD to earn guaranteed monthly yield + get 1 usGOLD referral bonus!';

  // 1. If running inside Telegram Mini App, use Telegram direct sharing
  if (isTelegramWebApp()) {
    shareTelegramReferralLink(cleanAddr, shareText);
    return { success: true, method: 'telegram' };
  }

  // 2. Web Share API (Mobile Safari, Chrome Android, supported Desktop browsers)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const shareData = {
        title: shareTitle,
        text: shareText,
        url: refUrl,
      };
      if (!navigator.canShare || navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true, method: 'web_share' };
      }
    } catch (err: any) {
      // User cancelled share sheet or error
      if (err.name === 'AbortError') {
        return { success: false, method: 'web_share' };
      }
      console.warn("navigator.share failed, fallback to telegram or clipboard:", err);
    }
  }

  // 3. Fallback: Telegram share URL
  try {
    shareTelegramReferralLink(cleanAddr, shareText);
    return { success: true, method: 'telegram' };
  } catch (e) {
    // 4. Clipboard fallback
    try {
      await navigator.clipboard.writeText(refUrl);
      return { success: true, method: 'clipboard' };
    } catch (clipErr) {
      return { success: false, method: 'clipboard' };
    }
  }
};
