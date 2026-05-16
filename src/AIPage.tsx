import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Typography, CircularProgress, Chip, Stack, alpha } from '@mui/material';
import { Send, Bot, User as UserIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIPageProps {
  effectiveAddress: string | null;
  allUsersData: Record<string, any>;
  transactions: any[];
  language: string;
}

const getLocalizedQuestions = (lang: string) => {
  const map: Record<string, string[]> = {
    EN: ['How do I optimize my network?', 'What are my current MLM positions?', 'How to add referrals?', 'Tell me about SolGold investment.'],
    ES: ['¿Cómo optimizo mi red?', '¿Cuáles son mis posiciones actuales?', '¿Cómo añado referidos?', 'Cuéntame sobre la inversión en SolGold.'],
    FR: ['Comment optimiser mon réseau ?', 'Quelles sont mes positions actuelles ?', 'Comment ajouter des filleuls ?', 'Parlez-moi de l\'investissement SolGold.'],
    ZH: ['如何优化我的网络？', '我目前的头寸是什么？', '如何增加推荐人？', '告诉我有关 SolGold 投资的信息。'],
    AR: ['كيف أقوم بتحسين شبكتي؟', 'ما هي مراكزي الحالية؟', 'كيف تضيف إحالات؟', 'أخبرني عن استثمار SolGold.'],
    RU: ['Как оптимизировать мою сеть?', 'Каковы мои текущие позиции?', 'Как добавить рефералов?', 'Расскажите об инвестициях SolGold.'],
    FA: ['چگونه شبکه خود را بهینه کنم؟', 'موقعیت‌های فعلی من چیست؟', 'چگونه زیرمجموعه اضافه کنم؟', 'درباره سرمایه‌گذاری SolGold توضیح دهید.'],
    DE: ['Wie maximiere ich meinen Profit?', 'Was sind meine aktuellen Positionen?', 'Wie füge ich Referrals hinzu?', 'Erzähl mir vom SolGold Investment.'],
    IT: ['Come ottimizzo la mia rete?', 'Quali sono le mie posizioni attuali?', 'Come aggiungere referral?', 'Parlami dell\'investimento in SolGold.'],
    JA: ['ネットワークを最適化するには？', '私の現在のポジションは？', '紹介を追加するには？', 'SolGold投資について教えてください。'],
    KO: ['네트워크를 최적화하는 방법은?', '나의 현재 직위는 무엇입니까?', '추천인을 추가하는 방법은?', 'SolGold 투자에 대해 알려주세요.'],
    ID: ['Bagaimana cara mengoptimalkan jaringan?', 'Apa posisi saya saat ini?', 'Bagaimana cara menambah referensi?', 'Ceritakan tentang investasi SolGold.']
  };
  return map[lang] || map['EN'];
};

const getInitialMessages = (lang: string, systemPrompt: string) => {
  const greetings: Record<string, string> = {
    EN: 'Hello! I am your AI assistant. How can I help you regarding Solana Gold, your MLM positions, or optimizing your network?',
    ES: '¡Hola! Soy tu asistente de IA. ¿Cómo puedo ayudarte con respecto a Solana Gold, tus posiciones de MLM o la optimización de tu red?',
    FR: 'Bonjour! Je suis votre assistant IA. Comment puis-je vous aider concernant Solana Gold, vos positions MLM ou l\'optimisation de votre réseau?',
    ZH: '你好！我是您的AI助手。关于Solana Gold、您的MLM头寸或优化您的网络，我能帮到您什么吗？',
    AR: 'مرحبًا! أنا مساعد الذكاء الاصطناعي الخاص بك. كيف يمكنني مساعدتك بخصوص Solana Gold أو مراكزك أو تحسين شبكتك؟',
    RU: 'Здравствуйте! Я ваш ИИ-ассистент. Чем могу помочь в отношении Solana Gold, ваших позиций или оптимизации вашей сети?',
    FA: 'سلام! من دستیار هوش مصنوعی شما هستم. چگونه می‌توانم در مورد Solana Gold، موقعیت‌های شما یا بهینه‌سازی شبکه کمک کنم؟',
    DE: 'Hallo! Ich bin dein KI-Assistent. Wie kann ich dir bezüglich Solana Gold, deinen MLM-Positionen oder der Optimierung deines Netzwerks helfen?',
    IT: 'Ciao! Sono il tuo assistente IA. Come posso aiutarti riguardo a Solana Gold, alle tue posizioni o all\'ottimizzazione della tua rete?',
    JA: 'こんにちは！AIアシスタントです。Solana Gold、あなたのポジション、またはネットワークの最適化についてどうすればお手伝いできますか？',
    KO: '안녕하세요! AI 어시스턴트입니다. Solana Gold, 포지션 또는 네트워크 최적화에 대해 어떻게 도와드릴까요?',
    ID: 'Halo! Saya asisten AI Anda. Bagaimana saya bisa membantu Anda mengenai Solana Gold, posisi Anda, atau mengoptimalkan jaringan Anda?'
  };
  return [
    { role: 'system' as const, content: systemPrompt },
    { role: 'assistant' as const, content: greetings[lang] || greetings['EN'] }
  ];
};

const uiTranslations: Record<string, Record<string, string>> = {
  EN: {
    subtitle: 'Ask about plans, positions, or Solana Gold.',
    clearChat: 'Clear Chat',
    placeholder: 'Message AI Assistant...',
    disclaimer: 'AI can make mistakes. Consider verifying important information.'
  },
  ES: {
    subtitle: 'Pregunte sobre planes, posiciones o Solana Gold.',
    clearChat: 'Borrar Chat',
    placeholder: 'Mensaje al Asistente de IA...',
    disclaimer: 'La IA puede cometer errores. Considere verificar la información importante.'
  },
  FR: {
    subtitle: 'Renseignez-vous sur les plans, les positions ou Solana Gold.',
    clearChat: 'Effacer le chat',
    placeholder: 'Message à l\'assistant virtuel...',
    disclaimer: 'L\'IA peut faire des erreurs. Pensez à vérifier les informations importantes.'
  },
  ZH: {
    subtitle: '询问有关计划、头寸或 Solana Gold 的信息。',
    clearChat: '清除聊天',
    placeholder: '向 AI 助手发送消息...',
    disclaimer: '人工智能可能会犯错。请考虑验证重要信息。'
  },
  AR: {
    subtitle: 'اسأل عن الخطط أو المراكز أو Solana Gold.',
    clearChat: 'مسح الدردشة',
    placeholder: 'رسالة لمساعد الذكاء الاصطناعي...',
    disclaimer: 'يمكن أن يرتكب الذكاء الاصطناعي أخطاء. يرجى التحقق من المعلومات المهمة.'
  },
  RU: {
    subtitle: 'Спрашивайте о планах, позициях или Solana Gold.',
    clearChat: 'Очистить чат',
    placeholder: 'Сообщение ИИ-ассистенту...',
    disclaimer: 'ИИ может ошибаться. Проверяйте важную информацию.'
  },
  FA: {
    subtitle: 'درباره برنامه‌ها، موقعیت‌ها یا Solana Gold بپرسید.',
    clearChat: 'پاک کردن چت',
    placeholder: 'پیام به دستیار هوش مصنوعی...',
    disclaimer: 'هوش مصنوعی ممکن است اشتباه کند. لطفاً اطلاعات مهم را بررسی کنید.'
  },
  DE: {
    subtitle: 'Fragen Sie nach Plänen, Positionen oder Solana Gold.',
    clearChat: 'Chat löschen',
    placeholder: 'Nachricht an KI-Assistent...',
    disclaimer: 'KI kann Fehler machen. Überprüfen Sie wichtige Informationen.'
  },
  IT: {
    subtitle: 'Chiedi sui piani, sulle posizioni o su Solana Gold.',
    clearChat: 'Cancella chat',
    placeholder: 'Messaggio all\'assistente IA...',
    disclaimer: 'L\'IA può commettere errori. Considera di verificare le informazioni importanti.'
  },
  JA: {
    subtitle: 'プラン、ポジション、またはSolana Goldについて質問する。',
    clearChat: 'チャットをクリア',
    placeholder: 'AIアシスタントにメッセージを送信...',
    disclaimer: 'AIは間違えることがあります。重要な情報は確認してください。'
  },
  KO: {
    subtitle: '플랜, 포지션 또는 Solana Gold에 대해 물어보세요.',
    clearChat: '채팅 지우기',
    placeholder: 'AI 어시스턴트에게 메시지 보내기...',
    disclaimer: 'AI는 실수를 할 수 있습니다. 중요한 정보는 확인하는 것이 좋습니다.'
  },
  ID: {
    subtitle: 'Tanyakan tentang rencana, posisi, atau Solana Gold.',
    clearChat: 'Hapus Obrolan',
    placeholder: 'Pesan Asisten AI...',
    disclaimer: 'AI bisa membuat kesalahan. Pertimbangkan untuk memverifikasi informasi penting.'
  },
  CKB: {
    subtitle: 'پرسیار بکە دەربارەی پلانەکان، پێگەکان، یان سۆلانا گۆڵد.',
    clearChat: 'سڕینەوەی چات',
    placeholder: 'نامە بۆ یاریدەدەری زیرەکی دەستکرد...',
    disclaimer: 'زیرەکی دەستکرد دەکرێت هەڵە بکات. تکایە زانیارییە گرنگەکان پشتڕاست بکەرەوە.'
  },
  AZ: {
    subtitle: 'Planlar, mövqelər və ya Solana Gold haqqında soruşun.',
    clearChat: 'Çatı təmizlə',
    placeholder: 'Süni İntellekt köməkçisinə mesaj...',
    disclaimer: 'Süni intellekt səhvlər edə bilər. Vacib məlumatları yoxlamağı nəzərə alın.'
  }
};

const getUiText = (lang: string, key: string) => {
  return uiTranslations[lang]?.[key] || uiTranslations['EN'][key];
};

export function AIPage({ effectiveAddress, allUsersData, transactions, language }: AIPageProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant' | 'system', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial system prompt setup
    const userData = effectiveAddress ? allUsersData[effectiveAddress] : null;
    let userStatsText = `The user is not logged in or has no positions yet.`;
    if (effectiveAddress && userData) {
      userStatsText = `
User Wallet: ${effectiveAddress}
User Investments (estimated): $${userData.totalInvested || 0}
User Referrals count: ${Object.values(allUsersData).filter((u: any) => u.referredBy === effectiveAddress).length}
User Total Earnings (MLM): $${userData.totalEarnings || 0}
`;
    }

    const systemPrompt = `You are a helpful AI assistant for the Solana Gold (USGOLD) platform, a gold-backed cryptocurrency platform running an MLM/referral program.
    
    Context:
    - Language requested: ${language}
    - Platform: Solana Gold (USGOLD)
    - ${userStatsText}
    
    About Solana Gold (USGOLD):
    - It is a secure, gold-backed digital asset on the Solana blockchain.
    - Features a 10-tier MLM network. Users earn referral commissions by inviting others.
    - An investment involves purchasing USGOLD, where a percentage goes to the MLM downline, App Pools, and Community Vaults.
    
    You can answer questions about:
    - Investment plans and gold investments (how to buy, benefits of USGOLD)
    - Current positions in the MLM network
    - Suggestions on how to add referrals and build a downline
    - Optimizing the user's MLM network for maximum profit
    - Solana Gold mechanics (distribution of funds, tiers)

    CRITICAL RULES:
    1. DO NOT answer questions unrelated to Solana Gold, USGOLD, cryptocurrency, marketing, referral networking, or investments, EXCEPT for V2RAY configuration.
    2. If a user asks something unrelated or outside of your domain (e.g., coding, general history, other unrelated topics), politely decline and steer the conversation back to the Solana Gold platform, their network plans, and investment options.
    3. If the user asks for a V2RAY configuration, provide exactly this configuration: vless://2da90515-0566-46fa-b0a4-540f4b85b87a@178.239.151.29:8443?type=tcp&encryption=none&security=none#Tesla%20Europe
    4. Please provide concise, friendly, and actionable advice. Respond in the requested Language (${language}).
    `;

    const storageKey = `ai_chat_${effectiveAddress || 'guest'}`;
    const savedMessages = localStorage.getItem(storageKey);
    
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (parsed.length > 0) {
          // Update the system prompt in the saved messages to keep it up to date
          if (parsed[0].role === 'system') {
            parsed[0].content = systemPrompt;
          }
          setMessages(parsed);
          return;
        }
      } catch (e) {
        console.error("Failed to parse saved AI messages");
      }
    }

    setMessages(getInitialMessages(language, systemPrompt));
  }, [effectiveAddress, allUsersData, language]);

  useEffect(() => {
    const storageKey = `ai_chat_${effectiveAddress || 'guest'}`;
    if (messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, effectiveAddress]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Request failed');
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let assistantMessage = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                assistantMessage += `\nError: ${data.error}`;
              } else if (data.content) {
                assistantMessage += data.content;
              }
              setMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1] = { role: 'assistant', content: assistantMessage };
                return newArr;
              });
            } catch (e) {
              // Ignore malformed JSON during stream
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev => {
        const newArr = [...prev];
        if (newArr[newArr.length - 1].role === 'assistant' && newArr[newArr.length - 1].content === '') {
          newArr[newArr.length - 1] = { role: 'assistant', content: `Error: ${err.message}` };
          return newArr;
        }
        return [...prev, { role: 'assistant', content: `Error: ${err.message}` }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', pt: 2, pb: 2, px: { xs: 1, sm: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, px: 1 }}>
        <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.5) }}>
          {getUiText(language, 'subtitle')}
        </Typography>
        {messages.length > 2 && (
          <Chip 
            label={getUiText(language, 'clearChat')} 
            size="small"
            onClick={() => {
              setMessages(getInitialMessages(language, messages[0]?.content || ''));
              localStorage.removeItem(`ai_chat_${effectiveAddress || 'guest'}`);
            }}
            sx={{ bgcolor: alpha('#ff4d4d', 0.1), color: '#ff4d4d', border: `1px solid ${alpha('#ff4d4d', 0.3)}` }} 
          />
        )}
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', mb: 2, pr: 1 }} ref={scrollRef}>
        <Stack spacing={2}>
          {messages.filter(m => m.role !== 'system').map((msg, i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 1.5 }}>
              {msg.role === 'assistant' && (
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#D4AF37', 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={20} color="#D4AF37" />
                </Box>
              )}
              <Box sx={{ 
                bgcolor: msg.role === 'user' ? alpha('#D4AF37', 0.15) : 'transparent',
                p: msg.role === 'user' ? 2 : 1, 
                borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '8px',
                maxWidth: '85%',
                color: '#fff',
              }}>
                {msg.role === 'user' ? (
                  <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>{msg.content}</Typography>
                ) : (
                  <Box className="markdown-body" sx={{ 
                    '& p': { m: 0, mb: 1, '&:last-child': { mb: 0 }, lineHeight: 1.6 },
                    '& strong': { color: '#D4AF37' },
                    '& a': { color: '#F3E5AB' },
                    '& ul, & ol': { mt: 0, mb: 1, pl: 3 },
                    '& li': { mb: 0.5 },
                  }}>
                    <Box sx={{ position: 'relative' }}>
                      <ReactMarkdown>{msg.content || (isLoading && i === messages.length - 1 ? '' : '...')}</ReactMarkdown>
                      {isLoading && msg.role === 'assistant' && i === messages.length - 1 && (
                        <Box component="span" sx={{
                          display: 'inline-block',
                          width: '8px',
                          height: '1.2em',
                          bgcolor: '#D4AF37',
                          ml: 0.5,
                          verticalAlign: 'middle',
                          animation: 'pulse 1s infinite alternate'
                        }} />
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 1.5, alignItems: 'flex-end' }}>
              <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: alpha('#D4AF37', 0.2), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={20} color="#D4AF37" />
              </Box>
              <Box sx={{ p: 1 }}>
                <Typography sx={{ color: alpha('#ffffff', 0.5), fontSize: '1.2rem', animation: 'pulse 1.5s infinite' }}>•••</Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </Box>

      <Box sx={{ mt: 'auto', position: 'relative' }}>
        {messages.length <= 2 && (
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: 1, 
            mb: 2, 
            justifyContent: 'center',
            maxHeight: '120px',
            overflowY: 'auto',
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none'
          }}>
            {getLocalizedQuestions(language).map(q => (
              <Chip 
                key={q} 
                label={q} 
                onClick={() => setInput(q)} 
                sx={{ 
                  bgcolor: alpha('#121214', 0.6), 
                  color: alpha('#ffffff', 0.8), 
                  border: `1px solid ${alpha('#ffffff', 0.1)}`, 
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s',
                  fontSize: '0.85rem',
                  py: 1,
                  px: 0.5,
                  '&:hover': { 
                    bgcolor: alpha('#D4AF37', 0.2), 
                    color: '#D4AF37',
                    borderColor: alpha('#D4AF37', 0.4),
                  } 
                }} 
              />
            ))}
          </Box>
        )}

        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-end', bgcolor: alpha('#1a1b1f', 0.8), borderRadius: '24px', border: `1px solid ${alpha('#ffffff', 0.1)}`, p: '4px' }}>
          <TextField
            fullWidth
            multiline
            maxRows={5}
            variant="outlined"
            placeholder={getUiText(language, 'placeholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            InputProps={{
              sx: {
                color: '#fff',
                py: 1.5,
                px: 2,
                '& fieldset': { border: 'none' },
              }
            }}
          />
          <IconButton 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            sx={{ 
              m: 0.5,
              width: 40,
              height: 40,
              bgcolor: input.trim() && !isLoading ? '#D4AF37' : alpha('#ffffff', 0.1), 
              color: input.trim() && !isLoading ? '#1a1b1f' : alpha('#ffffff', 0.3), 
              '&:hover': { bgcolor: input.trim() && !isLoading ? '#F3E5AB' : alpha('#ffffff', 0.1) },
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
          >
            <Send size={18} style={{ marginLeft: '2px' }} />
          </IconButton>
        </Box>
        
        <Typography sx={{ textAlign: 'center', fontSize: '0.7rem', color: alpha('#ffffff', 0.4), mt: 1 }}>
          {getUiText(language, 'disclaimer')}
        </Typography>
      </Box>
    </Box>
  );
}
