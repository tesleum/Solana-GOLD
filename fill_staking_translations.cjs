const fs = require('fs');

const code = fs.readFileSync('src/translations.ts', 'utf8');
const transCode = code.slice(code.indexOf('export const translations'), code.indexOf('export const t ='));

let cleaned = transCode
  .replace(/export const translations: Record<Lang, Record<string, string>> =/g, 'module.exports =');

fs.writeFileSync('temp_trans.cjs', cleaned);

const translations = require('./temp_trans.cjs');
const enKeys = Object.keys(translations.EN);

const stakingTranslations = {
  "EN": {
    "goldReserveYield": "SECURE FIXED INCOME",
    "stakeUsGold": "STAKE usGOLD",
    "lockupYourHoldings": "Lock up your usGOLD stablecoin to earn guaranteed 2% monthly fixed yield.",
    "stakedVault": "STAKED VAULT",
    "stakingAmount": "STAKING AMOUNT",
    "solanaRequired": "SOLANA REQUIRED",
    "rate": "Rate",
    "fee": "Fee",
    "adjustStakingAmount": "Adjust Staking Amount",
    "selectLockupPeriod": "SELECT LOCKUP PERIOD & FIXED YIELD RATE",
    "month": "Month",
    "connectWalletToStake": "Connect Wallet to Stake usGOLD",
    "stakeUsGoldNow": "STAKE usGOLD NOW",
    "creatingStakeVault": "Creating Stake Vault...",
    "activeStakingVaults": "Active Staking Vaults",
    "active": "Active",
    "noActiveVaults": "No Active Vaults",
    "stakeUsGoldDirectly": "Stake usGOLD directly using SOL to start earning guaranteed 2% monthly yield.",
    "monthLockedVault": "Month Locked Vault",
    "total": "Total",
    "accruedYield": "Accrued Yield",
    "countdown": "Countdown",
    "claimYield": "Claim Yield",
    "perSecondRealTime": "Per-second real-time"
  },
  "FA": {
    "goldReserveYield": "درآمد ثابت امن",
    "stakeUsGold": "سپرده‌گذاری usGOLD",
    "lockupYourHoldings": "استیبل‌کوین usGOLD خود را قفل کنید تا سود ثابت ماهانه ۲٪ تضمین‌شده کسب کنید.",
    "stakedVault": "گاوصندوق سپرده",
    "stakingAmount": "مقدار سپرده",
    "solanaRequired": "سولانا مورد نیاز",
    "rate": "نرخ",
    "fee": "کارمزد",
    "adjustStakingAmount": "تنظیم مقدار سپرده",
    "selectLockupPeriod": "انتخاب دوره قفل و نرخ سود ثابت",
    "month": "ماه",
    "connectWalletToStake": "اتصال کیف پول برای سپرده‌گذاری usGOLD",
    "stakeUsGoldNow": "سپرده‌گذاری usGOLD اکنون",
    "creatingStakeVault": "در حال ایجاد گاوصندوق سپرده...",
    "activeStakingVaults": "گاوصندوق‌های سپرده فعال",
    "active": "فعال",
    "noActiveVaults": "هیچ گاوصندوق فعالی وجود ندارد",
    "stakeUsGoldDirectly": "استیبل‌کوین usGOLD را مستقیماً با استفاده از SOL سپرده‌گذاری کنید تا کسب سود ماهانه ۲٪ تضمین‌شده آغاز شود.",
    "monthLockedVault": "گاوصندوق قفل‌شده ماهانه",
    "total": "کل",
    "accruedYield": "سود انباشته",
    "countdown": "شمارش معکوس",
    "claimYield": "برداشت سود",
    "perSecondRealTime": "در لحظه (ثانیه‌ای)"
  },
  "AR": {
    "goldReserveYield": "دخل ثابت آمن",
    "stakeUsGold": "رهن usGOLD",
    "lockupYourHoldings": "اقفل العملة المستقرة usGOLD الخاصة بك لكسب عائد شهري ثابت مضمون بنسبة 2%.",
    "stakedVault": "خزنة مرهونة",
    "stakingAmount": "مبلغ الرهان",
    "solanaRequired": "سولانا المطلوب",
    "rate": "المعدل",
    "fee": "الرسوم",
    "adjustStakingAmount": "ضبط مبلغ الرهان",
    "selectLockupPeriod": "تحديد فترة القفل ومعدل العائد الثابت",
    "month": "شهر",
    "connectWalletToStake": "ربط المحفظة لرهن usGOLD",
    "stakeUsGoldNow": "رهن usGOLD الآن",
    "creatingStakeVault": "جاري إنشاء خزنة الرهان...",
    "activeStakingVaults": "خزائن الرهان النشطة",
    "active": "نشط",
    "noActiveVaults": "لا توجد خزائن نشطة",
    "stakeUsGoldDirectly": "رهن usGOLD مباشرة باستخدام SOL لبدء كسب عائد شهري ثابت بنسبة 2%.",
    "monthLockedVault": "خزنة مقفلة بالشهر",
    "total": "المجموع",
    "accruedYield": "العائد المتراكم",
    "countdown": "العد التنازلي",
    "claimYield": "مطالبة العائد",
    "perSecondRealTime": "في الوقت الفعلي (بالثانية)"
  },
  "ES": {
    "goldReserveYield": "INGRESOS FIJOS SEGUROS",
    "stakeUsGold": "HACER STAKING DE usGOLD",
    "lockupYourHoldings": "Bloquea tu stablecoin usGOLD para ganar un rendimiento mensual fijo garantizado del 2%.",
    "stakedVault": "BÓVEDA EN STAKING",
    "stakingAmount": "CANTIDAD DE STAKING",
    "solanaRequired": "SOLANA REQUERIDO",
    "rate": "Tasa",
    "fee": "Comisión",
    "adjustStakingAmount": "Ajustar cantidad de staking",
    "selectLockupPeriod": "SELECCIONAR PERIODO DE BLOQUEO Y TASA DE RENDIMIENTO FIJA",
    "month": "Mes",
    "connectWalletToStake": "Conectar billetera para hacer Staking de usGOLD",
    "stakeUsGoldNow": "HACER STAKING DE usGOLD AHORA",
    "creatingStakeVault": "Creando bóveda de staking...",
    "activeStakingVaults": "Bóvedas de Staking Activas",
    "active": "Activo",
    "noActiveVaults": "No hay bóvedas activas",
    "stakeUsGoldDirectly": "Haga Staking de usGOLD directamente usando SOL para comenzar a ganar un rendimiento mensual fijo del 2%.",
    "monthLockedVault": "Bóveda Bloqueada por Mes",
    "total": "Total",
    "accruedYield": "Rendimiento Acumulado",
    "countdown": "Cuenta regresiva",
    "claimYield": "Reclamar Rendimiento",
    "perSecondRealTime": "Tiempo real por segundo"
  },
  "FR": {
    "goldReserveYield": "REVENU FIXE SÉCURISÉ",
    "stakeUsGold": "STAKER usGOLD",
    "lockupYourHoldings": "Bloquez votre stablecoin usGOLD pour gagner un rendement mensuel fixe garanti de 2%.",
    "stakedVault": "COFFRE STAKÉ",
    "stakingAmount": "MONTANT DE STAKING",
    "solanaRequired": "SOLANA REQUIS",
    "rate": "Taux",
    "fee": "Frais",
    "adjustStakingAmount": "Ajuster le montant du staking",
    "selectLockupPeriod": "SÉLECTIONNER LA PÉRIODE DE BLOCAGE ET LE TAUX DE RENDEMENT FIXE",
    "month": "Mois",
    "connectWalletToStake": "Connecter le portefeuille pour staker usGOLD",
    "stakeUsGoldNow": "STAKER usGOLD MAINTENANT",
    "creatingStakeVault": "Création du coffre de staking...",
    "activeStakingVaults": "Coffres de staking actifs",
    "active": "Actif",
    "noActiveVaults": "Aucun coffre actif",
    "stakeUsGoldDirectly": "Stakez l usGOLD directement en utilisant SOL pour commencer à gagner 2% de rendement mensuel fixe.",
    "monthLockedVault": "Coffre verrouillé par mois",
    "total": "Total",
    "accruedYield": "Rendement cumulé",
    "countdown": "Compte à rebours",
    "claimYield": "Réclamer le rendement",
    "perSecondRealTime": "Temps réel par seconde"
  },
  "ZH": {
    "goldReserveYield": "安全固定收益",
    "stakeUsGold": "质押 usGOLD",
    "lockupYourHoldings": "锁定您的 usGOLD 稳定币，即可赚取每月 2% 的保证固定收益。",
    "stakedVault": "质押金库",
    "stakingAmount": "质押金额",
    "solanaRequired": "所需 SOLANA",
    "rate": "费率",
    "fee": "手续费",
    "adjustStakingAmount": "调整质押金额",
    "selectLockupPeriod": "选择锁定周期和固定收益率",
    "month": "个月",
    "connectWalletToStake": "连接钱包以质押 usGOLD",
    "stakeUsGoldNow": "立即质押 usGOLD",
    "creatingStakeVault": "正在创建质押金库...",
    "activeStakingVaults": "活跃质押金库",
    "active": "活跃",
    "noActiveVaults": "无活跃金库",
    "stakeUsGoldDirectly": "直接使用 SOL 质押 usGOLD，开始赚取每月 2% 的固定收益。",
    "monthLockedVault": "月锁定金库",
    "total": "总计",
    "accruedYield": "累积收益",
    "countdown": "倒计时",
    "claimYield": "领取收益",
    "perSecondRealTime": "每秒实时更新"
  },
  "RU": {
    "goldReserveYield": "БЕЗОПАСНЫЙ ФИКСИРОВАННЫЙ ДОХОД",
    "stakeUsGold": "СТЕКИНГ usGOLD",
    "lockupYourHoldings": "Заблокируйте свой стейблкоин usGOLD, чтобы получать гарантированный фиксированный доход 2% в месяц.",
    "stakedVault": "СТЕКИНГ-ХРАНИЛИЩЕ",
    "stakingAmount": "СУММА СТЕКИНГА",
    "solanaRequired": "ТРЕБУЕТСЯ SOLANA",
    "rate": "Ставка",
    "fee": "Комиссия",
    "adjustStakingAmount": "Изменить сумму стекинга",
    "selectLockupPeriod": "ВЫБЕРИТЕ ПЕРИОД БЛОКИРОВКИ И ФИКСИРОВАННУЮ ДОХОДНОСТЬ",
    "month": "Месяц",
    "connectWalletToStake": "Подключите кошелек для стекинга usGOLD",
    "stakeUsGoldNow": "СТЕКИРУЙТЕ usGOLD СЕЙЧАС",
    "creatingStakeVault": "Создание стекинг-хранилища...",
    "activeStakingVaults": "Активные стекинг-хранилища",
    "active": "Активный",
    "noActiveVaults": "Нет активных хранилищ",
    "stakeUsGoldDirectly": "Стекируйте usGOLD напрямую с помощью SOL, чтобы зарабатывать гарантированный ежемесячный доход 2%.",
    "monthLockedVault": "Хранилище с месячной блокировкой",
    "total": "Итого",
    "accruedYield": "Накопленный доход",
    "countdown": "Обратный отсчет",
    "claimYield": "Забрать доход",
    "perSecondRealTime": "В реальном времени (посекундно)"
  }
};

for (const [lang, obj] of Object.entries(translations)) {
  if (!translations[lang]) translations[lang] = {};
  if (stakingTranslations[lang]) {
    Object.assign(translations[lang], stakingTranslations[lang]);
  } else {
    // For other languages, default to English or translated if missing
    for (const [k, v] of Object.entries(stakingTranslations.EN)) {
      if (!translations[lang][k]) {
        translations[lang][k] = v;
      }
    }
  }
}

let newFileContent = "export type Lang = 'EN' | 'ES' | 'FR' | 'ZH' | 'AR' | 'RU' | 'FA' | 'CKB' | 'AZ' | 'DE' | 'IT' | 'PL' | 'JA' | 'KO' | 'ID' | 'MS' | 'SV';\n\n";
newFileContent += "export const translations: Record<Lang, Record<string, string>> = {\n";

const langs = Object.keys(translations);
langs.forEach((lang, lIdx) => {
  newFileContent += `  "${lang}": {\n`;
  const keys = Object.keys(translations[lang]);
  keys.forEach((k, kIdx) => {
    const val = translations[lang][k].replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    newFileContent += `    "${k}": "${val}"${kIdx < keys.length - 1 ? ',' : ''}\n`;
  });
  newFileContent += `  }${lIdx < langs.length - 1 ? ',' : ''}\n`;
});

newFileContent += "};\n\n";
newFileContent += "export const t = (key: string, lang: string): string => {\n";
newFileContent += "  const tLang = translations[lang as Lang] || translations['EN'];\n";
newFileContent += "  return tLang[key] || translations['EN'][key] || key;\n";
newFileContent += "};\n";

fs.writeFileSync('src/translations.ts', newFileContent);
try { fs.unlinkSync('temp_trans.cjs'); } catch(e) {}
console.log("Successfully updated translations.ts with staking translations!");
