const fs = require('fs');

const langs = ['ES', 'FR', 'ZH', 'AR', 'RU', 'FA', 'CKB', 'AZ', 'DE', 'IT', 'PL', 'JA', 'KO', 'ID', 'MS', 'SV'];

// Just basic translations for some keys 
const translationsDict = {
  investInUsGold: {
    ES: 'Invertir en $usGOLD', FR: 'Investir dans $usGOLD', ZH: '投资 $usGOLD', AR: 'استثمر في $usGOLD', RU: 'Инвестировать в $usGOLD', FA: 'سرمایه‌گذاری در $usGOLD', CKB: 'Veberhênan di $usGOLD de', AZ: '$usGOLD-a sərmayə qoyun', DE: 'In $usGOLD investieren', IT: 'Investi in $usGOLD', PL: 'Zainwestuj w $usGOLD', JA: '$usGOLDに投資する', KO: '$usGOLD 투자', ID: 'Investasi di $usGOLD', MS: 'Melabur dalam $usGOLD', SV: 'Investera i $usGOLD'
  },
  walletNotLinked: {
    ES: 'BILLETERA NO VINCULADA', FR: 'PORTEFEUILLE NON LIÉ', ZH: '钱包未连结', AR: 'المحفظة غير مرتبطة', RU: 'КОШЕЛЕК НЕ ПРИВЯЗАН', FA: 'کیف پول متصل نیست', CKB: 'Cuzdan nayê girêdan', AZ: 'CÜZDAN BAĞLANMAYIB', DE: 'WALLET NICHT VERBUNDEN', IT: 'PORTAFOGLIO NON COLLEGATO', PL: 'PORTFEL NIEPOWIĄZANY', JA: 'ウォレットがリンクされていません', KO: '지갑이 연결되지 않았습니다', ID: 'DOMPET TIDAK TERTAUT', MS: 'DOMPET TIDAK DIPAUT', SV: 'PLÅNBOK EJ LÄNKAD'
  },
  yourOfficialId: {
    ES: 'TU ID OFICIAL', FR: 'VOTRE ID OFFICIEL', ZH: '您的官方ID', AR: 'معرفك الرسمي', RU: 'ВАШ ОФИЦИАЛЬНЫЙ ID', FA: 'شناسه رسمی شما', CKB: 'IDYA TE YA FERMÎ', AZ: 'SİZİN RƏSMİ İD', DE: 'IHRE OFFIZIELLE ID', IT: 'IL TUO ID UFFICIALE', PL: 'TWÓJ OFICJALNY ID', JA: 'あなたの公式ID', KO: '귀하의 공식 ID', ID: 'ID RESMI ANDA', MS: 'ID RASMI ANDA', SV: 'DITT OFFICIELLA ID'
  },
  balance: {
    ES: 'Saldo', FR: 'Solde', ZH: '余额', AR: 'رصيد', RU: 'Баланс', FA: 'موجودی', CKB: 'Hevseng', AZ: 'Balans', DE: 'Guthaben', IT: 'Saldo', PL: 'Saldo', JA: '残高', KO: '잔액', ID: 'Saldo', MS: 'Baki', SV: 'Saldo'
  },
  processing: {
    ES: 'Procesando...', FR: 'Traitement...', ZH: '处理中...', AR: 'معالجة...', RU: 'Обработка...', FA: 'در حال پردازش...', CKB: 'Pêvajo...', AZ: 'Emal edilir...', DE: 'Verarbeitung...', IT: 'Elaborazione...', PL: 'Przetwarzanie...', JA: '処理中...', KO: '처리 중...', ID: 'Memproses...', MS: 'Sedang memproses...', SV: 'Bearbetar...'
  },
  confirmJoin: {
    ES: 'Confirmar y Unirse', FR: 'Confirmer et Rejoindre', ZH: '确认并加入', AR: 'تأكيد وانضمام', RU: 'Подтвердить и Присоединиться', FA: 'تایید و پیوستن', CKB: 'Pejirandin û Tevlîbûn', AZ: 'Təsdiq et və Qoşul', DE: 'Bestätigen und Beitreten', IT: 'Conferma e Partecipa', PL: 'Potwierdź i Dołącz', JA: '確認して参加', KO: '확인 및 가입', ID: 'Konfirmasi & Gabung', MS: 'Sahkan & Sertai', SV: 'Bekräfta och Gå med'
  }
};

let c = fs.readFileSync('src/translations.ts', 'utf8');

for (const lang of langs) {
  const segmentRegex = new RegExp('"' + lang + '":\\s*\\{([^\\}]+)\\}', 'g');
  c = c.replace(segmentRegex, (match, innerProps) => {
    let replacedProps = innerProps;
    for (const [key, transMap] of Object.entries(translationsDict)) {
      if (transMap[lang]) {
        const keyValRegex = new RegExp('"' + key + '":\\s*"[^"]+"', 'g');
        replacedProps = replacedProps.replace(keyValRegex, '"' + key + '": "' + transMap[lang] + '"');
      }
    }
    return '"' + lang + '": {' + replacedProps + '}';
  });
}

fs.writeFileSync('src/translations.ts', c);
console.log("Updated translations");
