// Telegram WebApp Integration & WalletConnect Deep-link Fix Helper
import { database } from '../firebase';
import { ref, update, set, get } from 'firebase/database';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
  allows_write_to_pm?: boolean;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          query_id?: string;
          user?: TelegramUser;
          receiver?: TelegramUser;
          chat_type?: string;
          chat_instance?: string;
          start_param?: string;
          auth_date?: number;
          hash?: string;
        };
        version?: string;
        platform?: string;
        colorScheme?: 'light' | 'dark';
        themeParams?: TelegramThemeParams;
        isExpanded?: boolean;
        viewportHeight?: number;
        viewportStableHeight?: number;
        headerColor?: string;
        backgroundColor?: string;
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        enableClosingConfirmation: () => void;
        disableClosingConfirmation?: () => void;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        sendData?: (data: string) => void;
      };
    };
  }
}

export const isTelegramWebApp = (): boolean => {
  return typeof window !== 'undefined' && Boolean(
    window.Telegram?.WebApp?.initDataUnsafe?.user || 
    window.Telegram?.WebApp?.initDataUnsafe?.start_param || 
    window.Telegram?.WebApp?.platform ||
    (window.Telegram?.WebApp?.initData && window.Telegram.WebApp.initData.length > 0)
  );
};

export const getTelegramWebApp = () => {
  if (typeof window !== 'undefined') {
    return window.Telegram?.WebApp;
  }
  return undefined;
};

export const getTelegramUser = (): TelegramUser | null => {
  if (typeof window === 'undefined') return null;

  // 1. Direct from Telegram WebApp
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser && tgUser.id) {
    try {
      localStorage.setItem('tg_user_data', JSON.stringify(tgUser));
    } catch (e) {}
    return tgUser;
  }

  // 2. Fallback to cached Telegram user in localStorage
  try {
    const cached = localStorage.getItem('tg_user_data');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  return null;
};

export const getTelegramInitData = (): string => {
  if (typeof window === 'undefined') return '';
  return window.Telegram?.WebApp?.initData || '';
};

export const getTelegramPlatform = (): string => {
  if (typeof window === 'undefined') return 'browser';
  return window.Telegram?.WebApp?.platform || 'browser';
};

export const getTelegramThemeParams = (): TelegramThemeParams | undefined => {
  if (typeof window === 'undefined') return undefined;
  return window.Telegram?.WebApp?.themeParams;
};

/**
 * Maps Telegram language code (e.g. 'en', 'ru', 'fa', 'es', 'fr', 'zh', 'ar', 'de', 'it', 'ja', 'ko', 'id')
 * to the app's supported language codes.
 */
export const getTelegramPreferredLanguage = (): string | null => {
  const tgUser = getTelegramUser();
  if (!tgUser?.language_code) return null;

  const raw = tgUser.language_code.toLowerCase().trim();
  const langMap: Record<string, string> = {
    'en': 'EN',
    'ru': 'RU',
    'fa': 'FA',
    'es': 'ES',
    'fr': 'FR',
    'zh': 'ZH',
    'ar': 'AR',
    'de': 'DE',
    'it': 'IT',
    'ja': 'JA',
    'ko': 'KO',
    'id': 'ID',
    'az': 'AZ',
    'ckb': 'CKB'
  };

  return langMap[raw] || null;
};

/**
 * Synchronize Telegram user profile into Firebase Realtime Database
 */
export const syncTelegramUserToFirebase = async (
  user?: TelegramUser | null, 
  walletAddress?: string
): Promise<void> => {
  const tgUser = user || getTelegramUser();
  if (!tgUser || !tgUser.id) return;

  const tgId = String(tgUser.id);
  const now = Date.now();

  try {
    // 1. Update /telegramUsers/{tgId}
    const tgUserRef = ref(database, `telegramUsers/${tgId}`);
    const tgSnapshot = await get(tgUserRef);
    const existing = tgSnapshot.exists() ? tgSnapshot.val() : {};

    await update(tgUserRef, {
      id: tgId,
      username: tgUser.username || existing.username || '',
      firstName: tgUser.first_name || existing.firstName || '',
      lastName: tgUser.last_name || existing.lastName || '',
      photoUrl: tgUser.photo_url || existing.photoUrl || '',
      languageCode: tgUser.language_code || existing.languageCode || '',
      isPremium: Boolean(tgUser.is_premium),
      address: walletAddress || existing.address || '',
      lastActive: now,
      createdAt: existing.createdAt || now,
      platform: getTelegramPlatform()
    });

    // 2. If wallet address is provided, also link into /users/{walletAddress}
    if (walletAddress) {
      const userRef = ref(database, `users/${walletAddress}`);
      await update(userRef, {
        telegramId: tgId,
        telegramUsername: tgUser.username || '',
        telegramFirstName: tgUser.first_name || '',
        telegramLastName: tgUser.last_name || '',
        telegramPhotoUrl: tgUser.photo_url || '',
        telegramLanguage: tgUser.language_code || '',
        isTelegramPremium: Boolean(tgUser.is_premium),
        lastActive: now
      });
    }
  } catch (err) {
    console.warn("Failed to sync Telegram user data to Firebase:", err);
  }
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
 * Retrieves sanitized Telegram Bot username without any leading '@'
 */
export const getTelegramBotUsername = (): string => {
  const envBot = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || 'SolanaGoldBot';
  return String(envBot).trim().replace(/^@+/, '');
};

/**
 * Generates a valid Telegram Mini App direct deep-link without '@'
 * Format: https://t.me/<bot_username>/app?startapp=<wallet_or_code>
 */
export const getTelegramReferralUrl = (referralAddress: string): string => {
  const botUsername = getTelegramBotUsername();
  const cleanAddr = referralAddress && referralAddress.trim().length > 0 ? referralAddress.trim() : 'GOLDEN';
  if (cleanAddr.startsWith('http')) {
    return cleanAddr.replace(/t\.me\/@+/g, 't.me/');
  }
  return `https://t.me/${botUsername}/app?startapp=${cleanAddr}`;
};

/**
 * Opens Telegram share link dialog for referral sharing
 * Strictly ensures no '@' is present in the t.me bot URL to avoid "user not found" errors
 */
export const shareTelegramReferralLink = (referralAddress: string, customMessage?: string) => {
  const botUsername = getTelegramBotUsername();
  const cleanAddr = referralAddress && referralAddress.trim().length > 0 ? referralAddress.trim() : 'GOLDEN';
  let shareUrl = cleanAddr.startsWith('http') 
    ? cleanAddr.replace(/t\.me\/@+/g, 't.me/') 
    : `https://t.me/${botUsername}/app?startapp=${cleanAddr}`;

  // Double-sanitize to guarantee no '@' immediately follows 't.me/'
  shareUrl = shareUrl.replace(/t\.me\/@+/g, 't.me/');
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
