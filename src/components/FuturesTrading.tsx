import React, { useEffect, useState, useRef, useMemo } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, CircularProgress, 
  alpha, useTheme, Button, Divider, Slider, IconButton, InputBase, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Badge
} from '@mui/material';
import { 
  Activity, ChevronLeft, BarChart2, Info, ArrowUpRight, ArrowDownRight, 
  Settings, RefreshCw, AlertTriangle, Play, Square, User, Wallet, Check, X,
  Maximize2, ZoomIn, ZoomOut
} from 'lucide-react';
import { t } from '../translations';
import axios from 'axios';
import { database } from '../firebase';
import { ref, onValue, update, push, remove, get } from 'firebase/database';
import * as LightweightCharts from 'lightweight-charts';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
const { createChart } = LightweightCharts;

interface ContractData {
  symbol: string;
  price: number;
  indexPrice: number;
  markPrice: number;
  priceChangeRate: number;
  volume24h: number;
  turnover24h: number;
  fundingRate: number;
  multiplier?: number;
  lotSize?: number;
}

interface OrderBookItem {
  price: number;
  size: number;
}

interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
}

interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: number; // in contracts
  entryPrice: number;
  markPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnL: number;
  roe: number;
  isDemo?: boolean;
}

interface OpenOrder {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  price?: number;
  size: number;
  isDemo?: boolean;
}

export function FuturesTrading({ language, effectiveAddress }: { language: string; effectiveAddress?: string | null }) {
  const theme = useTheme();
  
  // App states
  const [contracts, setContracts] = useState<Record<string, ContractData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [orderType, setOrderType] = useState<'limit' | 'market'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [isChartReady, setIsChartReady] = useState(false);
  const [leverage, setLeverage] = useState<number>(20);
  const [amount, setAmount] = useState<string>('');
  const [priceInput, setPriceInput] = useState<string>('');
  const [unit, setUnit] = useState<'LOTS' | 'USDT'>('LOTS');
  const [marginMode, setMarginMode] = useState<'ISOLATED' | 'CROSS'>('ISOLATED');
  
  const [orderBook, setOrderBook] = useState<OrderBook>({ bids: [], asks: [] });
  const [currentTab, setCurrentTab] = useState<'positions' | 'orders' | 'history' | 'assets'>('positions');
  
  // API vs Demo Mode States
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [apiStatus, setApiStatus] = useState<'connected' | 'error' | 'none'>('none');
  const [accountBalance, setAccountBalance] = useState<{ total: number, available: number }>({ total: 0, available: 0 });
  const [positions, setPositions] = useState<Position[]>([]);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<any[]>([]);

  // Demo / User Futures Trading Engine Balance
  const [demoBalance, setDemoBalance] = useState<number>(0);
  const [demoPositions, setDemoPositions] = useState<Position[]>([]);
  const [demoOrders, setDemoOrders] = useState<OpenOrder[]>([]);
  const [demoHistory, setDemoHistory] = useState<any[]>([]);

  // Sync user data from Firebase (Balance, Positions, Orders, History)
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val.futuresBalance !== undefined) {
            setDemoBalance(parseFloat(val.futuresBalance) || 0);
          } else {
            const initBal = parseFloat(val.usGoldBalance || val.totalInvested || '0') || 0;
            setDemoBalance(initBal);
          }
          
          if (val.futuresPositions) {
            setDemoPositions(Object.values(val.futuresPositions));
          } else {
            setDemoPositions([]);
          }
          
          if (val.futuresOrders) {
            setDemoOrders(Object.values(val.futuresOrders));
          } else {
            setDemoOrders([]);
          }
          
          if (val.futuresHistory) {
            setDemoHistory(Object.values(val.futuresHistory).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)));
          } else {
            setDemoHistory([]);
          }
        }
      });
      return () => unsub();
    }
  }, [effectiveAddress]);

  // Refs for WebSockets
  const wsRef = useRef<WebSocket | null>(null);
  const connectId = useRef<string>(Math.random().toString(36).substring(2, 10));
  const pingInterval = useRef<NodeJS.Timeout | null>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const [symbols, setSymbols] = useState<string[]>(['XBTUSDTM', 'ETHUSDTM', 'SOLUSDTM', 'XRPUSDTM', 'ADAUSDTM']);

  // Fetch settings from Firebase
  useEffect(() => {
    const generalRef = ref(database, "mlmSettings/general");
    const unsub = onValue(generalRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.futuresTokens) {
        const tokenList = data.futuresTokens.split(",").map((s: string) => s.trim()).filter(Boolean);
        if (tokenList.length > 0) {
          setSymbols(tokenList);
        }
      }
    });
    return () => unsub();
  }, []);

  // Initialize and Fetch General Market Data
  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const res = await axios.get('/api/kucoin/contracts/active');
        if (!isMounted) return;
        
        const activeContracts = res.data.data;
        const initialData: Record<string, ContractData> = {};
        
        symbols.forEach(sym => {
          const contract = activeContracts.find((c: any) => c.symbol === sym);
          if (contract) {
            initialData[sym] = {
              symbol: sym,
              price: parseFloat(contract.lastTradePrice || '0'),
              indexPrice: parseFloat(contract.indexPrice || '0'),
              markPrice: parseFloat(contract.markPrice || '0'),
              priceChangeRate: parseFloat(contract.priceChangeRate || '0'),
              volume24h: parseFloat(contract.volume24h || '0'),
              turnover24h: parseFloat(contract.turnover24h || '0'),
              fundingRate: parseFloat(contract.fundingFeeRate || '0'),
              multiplier: parseFloat(contract.multiplier || '1'),
              lotSize: parseFloat(contract.lotSize || '1')
            };
          }
        });
        
        setContracts(initialData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch initial contracts', err);
        if (isMounted) setLoading(false);
      }
    };

    if (symbols.length > 0) {
      fetchInitialData();
    }

    return () => {
      isMounted = false;
    };
  }, [symbols]);

  // Fetch Private API data from backend proxy
  const fetchPrivateData = async () => {
    try {
      // 1. Fetch Account Balance
      const accRes = await axios.get('/api/kucoin/account');
      if (accRes.data && accRes.data.code === '200000' && accRes.data.data) {
        setAccountBalance({
          total: parseFloat(accRes.data.data.marginBalance || '0'),
          available: parseFloat(accRes.data.data.availableBalance || '0')
        });
        setApiStatus('connected');
        setIsDemoMode(false);
      } else {
        setApiStatus('error');
      }

      // 2. Fetch Real Positions
      const posRes = await axios.get('/api/kucoin/positions');
      if (posRes.data && posRes.data.code === '200000' && Array.isArray(posRes.data.data)) {
        const mappedPos: Position[] = posRes.data.data.map((p: any) => ({
          symbol: p.symbol,
          side: p.currentQty > 0 ? 'long' : 'short',
          size: Math.abs(p.currentQty),
          entryPrice: parseFloat(p.avgEntryPrice),
          markPrice: parseFloat(p.markPrice),
          leverage: p.realLeverage,
          margin: parseFloat(p.posMargin),
          unrealizedPnL: parseFloat(p.unrealisedPnL),
          roe: parseFloat(p.unrealisedRoe) * 100
        }));
        setPositions(mappedPos);
      }

      // 3. Fetch Real Open Orders
      const ordRes = await axios.get('/api/kucoin/orders');
      if (ordRes.data && ordRes.data.code === '200000' && Array.isArray(ordRes.data.data)) {
        const mappedOrders: OpenOrder[] = ordRes.data.data.map((o: any) => ({
          id: o.orderId,
          symbol: o.symbol,
          side: o.side,
          type: o.type,
          price: parseFloat(o.price),
          size: o.size
        }));
        setOpenOrders(mappedOrders);
      }
    } catch (err) {
      console.warn("Kucoin private API authentication failed, falling back to Demo Trading Mode.", err);
      setApiStatus('error');
      setIsDemoMode(true);
    }
  };

  useEffect(() => {
    fetchPrivateData();
  }, [selectedSymbol]);

  // Initialize Chart
  useEffect(() => {
    if (!selectedSymbol || !chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#121214' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    });

    // Handle potential API changes or initialization issues
    let series: any;
    try {
      if (typeof (chart as any).addCandlestickSeries === 'function') {
        series = (chart as any).addCandlestickSeries({
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else if (typeof (chart as any).addSeries === 'function') {
        series = (chart as any).addSeries('Candlestick', {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        });
      } else {
        throw new Error('addCandlestickSeries not found on chart object');
      }
    } catch (e) {
      console.error('Lightweight Charts Initialization Error:', e);
      return;
    }

    chartRef.current = chart;
    seriesRef.current = series;
    setIsChartReady(true);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setIsChartReady(false);
    };
  }, [selectedSymbol]);

  // Fetch Klines when symbol changes or chart is ready
  useEffect(() => {
    if (!isChartReady || !selectedSymbol) return;
    let isMounted = true;
    const fetchKlines = async () => {
      let formattedData: any[] = [];
      try {
        const response = await axios.get(`/api/kucoin/kline?symbol=${selectedSymbol}&granularity=1`);
        if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
          const mapByTime = new Map<number, any>();
          response.data.data.forEach((item: any) => {
            let t = parseInt(item[0], 10);
            if (t > 10000000000) t = Math.floor(t / 1000);
            const open = parseFloat(item[1]);
            const high = parseFloat(item[2]);
            const low = parseFloat(item[3]);
            const close = parseFloat(item[4]);

            if (!isNaN(t) && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
              mapByTime.set(t, { time: t as any, open, high, low, close });
            }
          });

          formattedData = Array.from(mapByTime.values()).sort((a, b) => a.time - b.time);
        }
      } catch (err) {
        console.warn("Failed to fetch API klines, generating fallback candlestick data:", err);
      }

      // Fallback synthetic candles if API returns no data
      if (formattedData.length === 0) {
        const curPrice = contracts[selectedSymbol]?.price || 65000;
        const nowSec = Math.floor(Date.now() / 1000);
        let lastClose = curPrice * 0.98;
        for (let i = 100; i >= 0; i--) {
          const time = nowSec - i * 60;
          const delta = (Math.random() - 0.49) * (lastClose * 0.005);
          const open = lastClose;
          const close = open + delta;
          const high = Math.max(open, close) + Math.abs(delta) * Math.random();
          const low = Math.min(open, close) - Math.abs(delta) * Math.random();
          lastClose = close;
          formattedData.push({ time: time as any, open, high, low, close });
        }
      }

      if (isMounted && seriesRef.current && formattedData.length > 0) {
        seriesRef.current.setData(formattedData);
      }
    };

    fetchKlines();
    return () => { isMounted = false; };
  }, [selectedSymbol, isChartReady]);

  // WebSocket Connection (Stream feeds dynamically based on symbol)
  useEffect(() => {
    if (!selectedSymbol) return;

    let isMounted = true;
    setOrderBook({ bids: [], asks: [] });

    const connectToKucoinWS = async () => {
      try {
        const response = await axios.post('/api/kucoin/bullet-public');
        if (!isMounted) return;
        
        const data = response.data.data;
        const token = data.token;
        const endpoint = data.instanceServers[0].endpoint;
        
        const wsUrl = `${endpoint}?token=${token}&connectId=${connectId.current}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          
          // Subscribe to Ticker
          ws.send(JSON.stringify({
            id: Date.now(),
            type: 'subscribe',
            topic: `/contractMarket/ticker:${selectedSymbol}`,
            privateChannel: false,
            response: true
          }));

          // Subscribe to Instrument Mark/Index Price
          ws.send(JSON.stringify({
            id: Date.now() + 1,
            type: 'subscribe',
            topic: `/contract/instrument:${selectedSymbol}`,
            privateChannel: false,
            response: true
          }));

          // Subscribe to Klines (1min)
          ws.send(JSON.stringify({
            id: Date.now() + 2,
            type: 'subscribe',
            topic: `/contractMarket/limitCandle:${selectedSymbol}_1min`,
            privateChannel: false,
            response: true
          }));

          // Subscribe to Order Book Level 2 Depth 5
          ws.send(JSON.stringify({
            id: Date.now() + 3,
            type: 'subscribe',
            topic: `/contractMarket/level2Depth5:${selectedSymbol}`,
            privateChannel: false,
            response: true
          }));

          // Setup ping
          pingInterval.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ id: Date.now(), type: 'ping' }));
            }
          }, data.instanceServers[0].pingInterval || 18000);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          const message = JSON.parse(event.data);
          
          // Real-time kline update
          if (message.type === 'message' && (message.subject === 'candle.stick' || message.subject === 'kline')) {
            const candleData = message.data;
            if (candleData && candleData.candles && seriesRef.current) {
              const candle = candleData.candles;
              let t = parseInt(candle[0], 10);
              // Handle milliseconds vs seconds
              if (t > 10000000000) t = Math.floor(t / 1000);
              
              seriesRef.current.update({
                time: t as any,
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4]),
              });
            }
          }

          // Real-time price update
          if (message.type === 'message' && (message.subject === 'ticker' || message.subject === 'tickerV2')) {
            const data = message.data;
            if (data && data.price) {
              const currentPrice = parseFloat(data.price);
              
              setContracts(prev => {
                const existing = prev[selectedSymbol];
                if (!existing) return prev;
                return {
                  ...prev,
                  [selectedSymbol]: {
                    ...existing,
                    price: currentPrice
                  }
                };
              });

              // Update live position metrics in real-time
              setDemoPositions(prev => prev.map(pos => {
                if (pos.symbol !== selectedSymbol) return pos;
                const pnl = pos.side === 'long' 
                  ? pos.size * (currentPrice - pos.entryPrice)
                  : pos.size * (pos.entryPrice - currentPrice);
                const roe = (pnl / pos.margin) * 100;
                return {
                  ...pos,
                  markPrice: currentPrice,
                  unrealizedPnL: pnl,
                  roe: roe
                };
              }));

              // Check if limit orders can be triggered
              if (demoOrders.length > 0) {
                const fillable = demoOrders.filter(ord => {
                  if (ord.symbol !== selectedSymbol || ord.type !== 'limit' || !ord.price) return false;
                  if (ord.side === 'buy' && currentPrice <= ord.price) return true;
                  if (ord.side === 'sell' && currentPrice >= ord.price) return true;
                  return false;
                });

                if (fillable.length > 0 && effectiveAddress) {
                  fillable.forEach(ord => {
                    const entry = ord.price || currentPrice;
                    const margin = (ord.size * entry) / leverage;
                    const posId = Math.random().toString(36).substring(2, 10);
                    const newPos: Position = {
                      symbol: ord.symbol,
                      side: ord.side === 'buy' ? 'long' : 'short',
                      size: ord.size,
                      entryPrice: entry,
                      markPrice: currentPrice,
                      leverage: leverage,
                      margin: margin,
                      unrealizedPnL: 0,
                      roe: 0,
                      isDemo: true
                    };
                    
                    // Atomic-like update to Firebase
                    update(ref(database, `users/${effectiveAddress}/futuresPositions/${posId}`), newPos);
                    remove(ref(database, `users/${effectiveAddress}/futuresOrders/${ord.id}`));
                    push(ref(database, `users/${effectiveAddress}/futuresHistory`), {
                      id: ord.id,
                      symbol: ord.symbol,
                      side: ord.side === 'buy' ? 'Buy (Limit)' : 'Sell (Limit)',
                      type: 'Limit Fill',
                      price: entry,
                      size: ord.size,
                      timestamp: Date.now(),
                      time: new Date().toLocaleTimeString(),
                      status: 'Filled'
                    });
                  });
                }
              }
            }
          }

          // Instrument Mark & Index Price Stream
          if (message.type === 'message' && message.subject === 'mark.index.price') {
            const data = message.data;
            if (data) {
              const mark = parseFloat(data.markPrice);
              const index = parseFloat(data.indexPrice);
              setContracts(prev => {
                const existing = prev[selectedSymbol];
                if (!existing) return prev;
                return {
                  ...prev,
                  [selectedSymbol]: {
                    ...existing,
                    markPrice: mark || existing.markPrice,
                    indexPrice: index || existing.indexPrice
                  }
                };
              });
            }
          }

          // Real-time Level 2 Order Book update
          if (message.type === 'message' && (message.subject === 'level2' || message.subject === 'level2Depth5')) {
            const data = message.data;
            if (data && (data.bids || data.asks)) {
              const mappedBids = (data.bids || []).map((b: any) => ({
                price: parseFloat(b[0]),
                size: parseFloat(b[1])
              }));
              const mappedAsks = (data.asks || []).map((a: any) => ({
                price: parseFloat(a[0]),
                size: parseFloat(a[1])
              }));
              setOrderBook({ bids: mappedBids, asks: mappedAsks });
            }
          }
        };

        ws.onerror = (err) => {
          console.error('Kucoin WS Error', err);
        };

        ws.onclose = () => {
          if (pingInterval.current) clearInterval(pingInterval.current);
          if (isMounted) {
            setTimeout(connectToKucoinWS, 5000);
          }
        };
      } catch (err) {
        console.error('Failed to connect KuCoin websocket feed', err);
        if (isMounted) {
          setTimeout(connectToKucoinWS, 10000);
        }
      }
    };

    connectToKucoinWS();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (pingInterval.current) clearInterval(pingInterval.current);
    };
  }, [selectedSymbol]);

  // Format Helper Methods
  const formatPrice = (price: number) => {
    if (!price) return '...';
    return price < 1 ? price.toFixed(4) : price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatPercentage = (val: number) => {
    if (isNaN(val)) return '0.00%';
    return `${val > 0 ? '+' : ''}${(val * 100).toFixed(2)}%`;
  };

  const getContractPrice = () => {
    if (!selectedSymbol || !contracts[selectedSymbol]) return 0;
    return contracts[selectedSymbol].price;
  };

  // Place Order Action (Supports Real and Demo Hybrid Modes)
  const handlePlaceOrder = async () => {
    const activeContract = selectedSymbol ? contracts[selectedSymbol] : null;
    const multiplier = activeContract?.multiplier || 1;
    const lotSize = activeContract?.lotSize || 1;
    const curPrice = getContractPrice();
    const targetPrice = orderType === 'limit' ? parseFloat(priceInput) : curPrice;

    if (orderType === 'limit' && (isNaN(targetPrice) || targetPrice <= 0)) {
      alert("Please enter a valid limit price");
      return;
    }

    let size = parseFloat(amount);
    if (unit === 'USDT') {
      const rawSize = size / (targetPrice * multiplier);
      // Round to nearest lot size
      size = Math.floor(rawSize / lotSize) * lotSize;
    }

    if (isNaN(size) || size <= 0) {
      alert(unit === 'USDT'
        ? `USDT amount is too small. Minimum contract size is ${lotSize} LOTS (${(lotSize * targetPrice * multiplier).toFixed(2)} USDT)`
        : `Please enter a valid size. Must be in multiples of ${lotSize} LOTS`
      );
      return;
    }

    const calculatedUsdt = size * targetPrice * multiplier;
    const estimatedMargin = calculatedUsdt / leverage;

    // A. Live Real Trading Mode
    if (!isDemoMode && apiStatus === 'connected') {
      try {
        const orderPayload = {
          clientOid: Math.random().toString(36).substring(2, 15),
          side: side === 'buy' ? 'buy' : 'sell',
          symbol: selectedSymbol,
          type: orderType,
          leverage: leverage,
          size: size,
          price: orderType === 'limit' ? targetPrice.toString() : undefined,
          marginMode: marginMode
        };

        const res = await axios.post('/api/kucoin/order', orderPayload);
        if (res.data && res.data.code === '200000') {
          alert(`Real Order placed successfully on FOREX (Margin Mode: ${marginMode})!`);
          fetchPrivateData();
        } else {
          alert(`FOREX Error: ${res.data.msg || 'Failed to place order'}`);
        }
      } catch (err: any) {
        console.error("Failed placing real order", err);
        alert(`API Error: ${err.response?.data?.error || err.message}`);
      }
      return;
    }

    // B. Interactive Demo Simulator Mode
    if (estimatedMargin > demoBalance) {
      alert("Insufficient futures margin balance! Top up in your Wallet page.");
      return;
    }

    const newBal = Math.max(0, demoBalance - estimatedMargin);
    setDemoBalance(newBal);
    if (effectiveAddress) {
      update(ref(database, `users/${effectiveAddress}`), { futuresBalance: newBal });
    }

    if (orderType === 'market') {
      // Open Simulated Position immediately
      const posId = Math.random().toString(36).substring(2, 10);
      const newPos: Position = {
        symbol: selectedSymbol!,
        side: side === 'buy' ? 'long' : 'short',
        size: size,
        entryPrice: curPrice,
        markPrice: curPrice,
        leverage: leverage,
        margin: estimatedMargin,
        unrealizedPnL: 0,
        roe: 0,
        isDemo: true
      };
      
      if (effectiveAddress) {
        update(ref(database, `users/${effectiveAddress}/futuresPositions/${posId}`), newPos);
        push(ref(database, `users/${effectiveAddress}/futuresHistory`), {
          id: posId,
          symbol: selectedSymbol,
          side: side === 'buy' ? 'Buy (Long)' : 'Sell (Short)',
          type: 'Market',
          price: curPrice,
          size: size,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString(),
          status: 'Filled'
        });
      }

      alert(`Position opened successfully (${marginMode} Margin)!`);
    } else {
      // Place in Open Orders list
      const orderId = Math.random().toString(36).substring(2, 10);
      const newOrder: OpenOrder = {
        id: orderId,
        symbol: selectedSymbol!,
        side: side === 'buy' ? 'buy' : 'sell',
        type: 'limit',
        price: targetPrice,
        size: size,
        isDemo: true
      };
      
      if (effectiveAddress) {
        update(ref(database, `users/${effectiveAddress}/futuresOrders/${orderId}`), newOrder);
      }

      alert(`Limit order placed successfully (${marginMode} Margin)!`);
    }

    setAmount('');
    setPriceInput('');
  };

  // Close Position (Real vs. Demo)
  const handleClosePosition = async (pos: Position) => {
    if (pos.isDemo) {
      // Return margin + pnl to demo balance
      const totalReturned = pos.margin + pos.unrealizedPnL;
      const newBal = demoBalance + totalReturned;
      
      if (effectiveAddress) {
        update(ref(database, `users/${effectiveAddress}`), { futuresBalance: newBal });
        
        // Find position ID in Firebase if it's stored as an object with IDs as keys
        // We can just iterate or use a property. Since we're using onValue to set local demoPositions, 
        // we might need to store the firebase key in the Position type.
        // For now, let's assume we can match by symbol and side or just use a lookup.
        const userRef = ref(database, `users/${effectiveAddress}/futuresPositions`);
        get(userRef).then((snapshot) => {
          if (snapshot.exists()) {
            const positions = snapshot.val();
            const key = Object.keys(positions).find(k => 
              positions[k].symbol === pos.symbol && positions[k].side === pos.side
            );
            if (key) {
              remove(ref(database, `users/${effectiveAddress}/futuresPositions/${key}`));
            }
          }
        });

        push(ref(database, `users/${effectiveAddress}/futuresHistory`), {
          id: Math.random().toString(36).substring(2, 10),
          symbol: pos.symbol,
          side: pos.side === 'long' ? 'Close Long' : 'Close Short',
          type: 'Market Close',
          price: pos.markPrice,
          size: pos.size,
          timestamp: Date.now(),
          time: new Date().toLocaleTimeString(),
          status: 'Closed'
        });
      }

      alert("Position closed successfully! Margin and profit returned to wallet.");
      return;
    }

    // Real API Close order
    try {
      const closePayload = {
        clientOid: Math.random().toString(36).substring(2, 15),
        side: pos.side === 'long' ? 'sell' : 'buy',
        symbol: pos.symbol,
        type: 'market',
        size: pos.size,
        closeOrder: true
      };
      const res = await axios.post('/api/kucoin/order', closePayload);
      if (res.data && res.data.code === '200000') {
        alert("Real position close request submitted!");
        fetchPrivateData();
      } else {
        alert(`Close failed: ${res.data.msg}`);
      }
    } catch (err: any) {
      alert(`API Error: ${err.message}`);
    }
  };

  // Cancel Open Order (Real vs. Demo)
  const handleCancelOrder = async (ord: OpenOrder) => {
    if (ord.isDemo) {
      const estimatedMargin = (ord.size * (ord.price || 0)) / leverage;
      
      if (effectiveAddress) {
        update(ref(database, `users/${effectiveAddress}`), { futuresBalance: demoBalance + estimatedMargin });
        remove(ref(database, `users/${effectiveAddress}/futuresOrders/${ord.id}`));
      }
      
      alert("Simulated order canceled!");
      return;
    }

    // Real API cancel
    try {
      const res = await axios.delete(`/api/kucoin/order/${ord.id}`);
      if (res.data && res.data.code === '200000') {
        alert("Real order canceled successfully!");
        fetchPrivateData();
      } else {
        alert(`Cancel failed: ${res.data.msg}`);
      }
    } catch (err: any) {
      alert(`API Error: ${err.message}`);
    }
  };

  const activePositions = isDemoMode ? demoPositions : positions;
  const activeOrders = isDemoMode ? demoOrders : openOrders;
  const activeHistory = isDemoMode ? demoHistory : orderHistory;
  const activeBalanceTotal = isDemoMode ? demoBalance : accountBalance.total;
  const activeBalanceAvailable = isDemoMode ? demoBalance : accountBalance.available;

  // Render Symbols Table List
  if (!selectedSymbol) {
    return (
      <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 10 }}>
        {/* Dynamic header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" fontWeight="900" sx={{ 
              fontFamily: '"Cinzel", serif', 
              background: 'linear-gradient(to bottom, #FFDF73, #D4AF37)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              textShadow: `0 2px 10px ${alpha('#D4AF37', 0.2)}`
            }}>
              Empire Futures
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Perpetual Contracts • Powered by FOREX Live Stream
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {apiStatus === 'connected' ? (
              <Badge variant="dot" color="success" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <IconButton size="small" sx={{ color: '#4caf50', bgcolor: alpha('#4caf50', 0.1) }}>
                  <User size={18} />
                </IconButton>
              </Badge>
            ) : (
              <IconButton size="small" onClick={fetchPrivateData} sx={{ color: '#ff9800', bgcolor: alpha('#ff9800', 0.1) }}>
                <AlertTriangle size={18} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Demo Mode Notice */}
        {isDemoMode && (
          <Box sx={{ 
            display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 3, 
            bgcolor: alpha('#D4AF37', 0.08), borderRadius: '16px', 
            border: `1px solid ${alpha('#D4AF37', 0.2)}` 
          }}>
            <Info color="#D4AF37" size={20} />
            <Box>
              <Typography variant="subtitle2" fontWeight="bold" color="#D4AF37">
                Demo Trading Mode Active (${demoBalance.toLocaleString()} USDT)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Securely trade real-time live markets with simulated funds synced to your Treasury.
              </Typography>
            </Box>
          </Box>
        )}

        <Card sx={{ 
          bgcolor: alpha('#121214', 0.8),
          borderRadius: '24px',
          border: `1px solid ${alpha('#fff', 0.05)}`,
          overflow: 'hidden',
          boxShadow: `0 8px 32px ${alpha('#000', 0.5)}`
        }}>
          {/* Table Header */}
          <Stack direction="row" sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.2) }}>
            <Typography variant="caption" sx={{ flex: 1, color: alpha('#fff', 0.5), fontWeight: 700 }}>Contract</Typography>
            <Typography variant="caption" sx={{ flex: 1, color: alpha('#fff', 0.5), fontWeight: 700, textAlign: 'right' }}>Price</Typography>
            <Typography variant="caption" sx={{ flex: 1, color: alpha('#fff', 0.5), fontWeight: 700, textAlign: 'right' }}>24h Change</Typography>
          </Stack>

          {loading && Object.keys(contracts).length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#D4AF37' }} />
            </Box>
          ) : (
            <Stack divider={<Divider sx={{ borderColor: alpha('#fff', 0.03) }} />}>
              {symbols.map(symbol => {
                const data = contracts[symbol];
                if (!data) return null;

                const isUp = data.priceChangeRate >= 0;
                const color = isUp ? '#00b894' : '#ff7675';
                const bg = isUp ? alpha('#00b894', 0.12) : alpha('#ff7675', 0.12);
                
                return (
                  <Box 
                    key={symbol} 
                    onClick={() => {
                      setSelectedSymbol(symbol);
                      setPriceInput(data.price.toString());
                    }}
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: alpha('#D4AF37', 0.04) }
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="900" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {symbol.replace('USDTM', '')}
                        <Box sx={{ 
                          fontSize: '10px', fontWeight: 'bold', px: 1, py: 0.2, 
                          bgcolor: alpha('#fff', 0.08), color: alpha('#fff', 0.6), 
                          borderRadius: '4px', letterSpacing: 1
                        }}>
                          PERP
                        </Box>
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.4) }}>
                        Vol {(data.turnover24h / 1000000).toFixed(1)}M USDT
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, textAlign: 'right' }}>
                      <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#fff' }}>
                        ${formatPrice(data.price)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.4) }}>
                        Mark: ${formatPrice(data.markPrice)}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Box sx={{ 
                        bgcolor: bg, 
                        color: color,
                        px: 2, 
                        py: 0.75, 
                        borderRadius: '8px',
                        fontWeight: 900,
                        minWidth: '90px',
                        textAlign: 'center',
                        fontSize: '0.9rem'
                      }}>
                        {formatPercentage(data.priceChangeRate)}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Card>
      </Box>
    );
  }

  // Active Symbol Detailed Trading Screen
  const activeContract = contracts[selectedSymbol];
  const isUp = activeContract ? activeContract.priceChangeRate >= 0 : true;
  const priceColor = isUp ? '#00b894' : '#ff7675';

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', pb: 10 }}>
      {/* 1. Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, pb: 2 }}>
        <IconButton onClick={() => setSelectedSymbol(null)} sx={{ color: '#fff', mr: 1, bgcolor: alpha('#fff', 0.05) }}>
          <ChevronLeft />
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight="900" color="#fff">
              {selectedSymbol.replace('USDTM', '')}
            </Typography>
            <Box sx={{ 
              fontSize: '10px', fontWeight: 'bold', px: 1, py: 0.2, 
              bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37', 
              borderRadius: '4px', letterSpacing: 1
            }}>
              PERP
            </Box>
            {isDemoMode && (
              <Box sx={{ 
                fontSize: '10px', fontWeight: 'bold', px: 1, py: 0.2, 
                bgcolor: alpha('#ff9800', 0.15), color: '#ff9800', 
                borderRadius: '4px', letterSpacing: 1
              }}>
                DEMO
              </Box>
            )}
          </Box>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
            FOREX Live Order Book
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" fontWeight="900" sx={{ color: priceColor }}>
            ${formatPrice(activeContract?.price || 0)}
          </Typography>
          <Typography variant="caption" sx={{ color: priceColor }}>
            {formatPercentage(activeContract?.priceChangeRate || 0)}
          </Typography>
        </Box>
      </Box>

      {/* 2. Market Stats Sub-header */}
      <Stack direction="row" spacing={3} sx={{ mb: 3, p: 1.5, bgcolor: alpha('#000', 0.2), borderRadius: '12px', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        <Box>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), display: 'block' }}>Index Price</Typography>
          <Typography variant="body2" fontWeight="bold" color="#fff">${formatPrice(activeContract?.indexPrice || 0)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), display: 'block' }}>Mark Price</Typography>
          <Typography variant="body2" fontWeight="bold" color="#fff">${formatPrice(activeContract?.markPrice || 0)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), display: 'block' }}>Funding Rate</Typography>
          <Typography variant="body2" fontWeight="bold" sx={{ color: '#D4AF37' }}>{formatPercentage(activeContract?.fundingRate || 0)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), display: 'block' }}>24h Turnover</Typography>
          <Typography variant="body2" fontWeight="bold" color="#fff">${((activeContract?.turnover24h || 0) / 1000000).toFixed(2)}M</Typography>
        </Box>
      </Stack>

      {/* 3. Main Candlestick Chart (Lightweight Charts Native) */}
      <Card sx={{ bgcolor: '#121214', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '16px', overflow: 'hidden', mb: 3 }}>
        <Box 
          ref={chartContainerRef} 
          sx={{ width: '100%', height: '400px', position: 'relative' }} 
        />
      </Card>

      {/* 4. Two-Column Layout (Order Book & Trade Entry) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr' }, gap: 3, mb: 4 }}>
        
        {/* Left column: Live Order Book */}
        <Box sx={{ order: { xs: 2, md: 1 } }}>
          <Card sx={{ bgcolor: alpha('#121214', 0.8), border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px', p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" color="#fff" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Activity size={16} color="#D4AF37" /> Live Order Book
            </Typography>

            {/* Asks (Sell Orders - Top) */}
            <Stack spacing={0.5} sx={{ mb: 1, direction: 'column-reverse', display: 'flex' }}>
              {orderBook.asks.slice(0, 5).reverse().map((ask, idx) => {
                const percentage = Math.min((ask.size / Math.max(...orderBook.asks.map(a => a.size), 1)) * 100, 100);
                return (
                  <Box key={`ask-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', py: 0.5, px: 1, borderRadius: '4px', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, bgcolor: alpha('#ff7675', 0.1), width: `${percentage}%`, zIndex: 0, transition: 'width 0.3s' }} />
                    <Typography variant="caption" sx={{ color: '#ff7675', fontWeight: 'bold', zIndex: 1 }}>${formatPrice(ask.price)}</Typography>
                    <Typography variant="caption" sx={{ color: '#fff', zIndex: 1 }}>{ask.size.toFixed(3)}</Typography>
                  </Box>
                );
              })}
            </Stack>

            {/* Mid Price Separator */}
            <Box sx={{ py: 1, borderTop: `1px solid ${alpha('#fff', 0.05)}`, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, my: 1, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ color: priceColor }}>
                ${formatPrice(activeContract?.price || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Spread: $0.05
              </Typography>
            </Box>

            {/* Bids (Buy Orders - Bottom) */}
            <Stack spacing={0.5}>
              {orderBook.bids.slice(0, 5).map((bid, idx) => {
                const percentage = Math.min((bid.size / Math.max(...orderBook.bids.map(b => b.size), 1)) * 100, 100);
                return (
                  <Box key={`bid-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', py: 0.5, px: 1, borderRadius: '4px', overflow: 'hidden' }}>
                    <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, bgcolor: alpha('#00b894', 0.1), width: `${percentage}%`, zIndex: 0, transition: 'width 0.3s' }} />
                    <Typography variant="caption" sx={{ color: '#00b894', fontWeight: 'bold', zIndex: 1 }}>${formatPrice(bid.price)}</Typography>
                    <Typography variant="caption" sx={{ color: '#fff', zIndex: 1 }}>{bid.size.toFixed(3)}</Typography>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Box>

        {/* Right column: Trade Form Panel */}
        <Box sx={{ order: { xs: 1, md: 2 } }}>
          <Card sx={{ bgcolor: alpha('#121214', 0.95), border: `1px solid ${alpha('#D4AF37', 0.2)}`, borderRadius: '24px', p: 2 }}>
            
            {/* Long vs Short Toggle Buttons */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, p: 0.5, bgcolor: alpha('#000', 0.4), borderRadius: '12px' }}>
              <Button 
                fullWidth 
                onClick={() => setSide('buy')}
                sx={{ 
                  borderRadius: '8px',
                  bgcolor: side === 'buy' ? '#00b894' : 'transparent',
                  color: '#fff',
                  fontWeight: 'bold',
                  py: 1,
                  '&:hover': { bgcolor: side === 'buy' ? '#00b894' : alpha('#fff', 0.05) }
                }}
              >
                Buy (Long)
              </Button>
              <Button 
                fullWidth 
                onClick={() => setSide('sell')}
                sx={{ 
                  borderRadius: '8px',
                  bgcolor: side === 'sell' ? '#ff7675' : 'transparent',
                  color: '#fff',
                  fontWeight: 'bold',
                  py: 1,
                  '&:hover': { bgcolor: side === 'sell' ? '#ff7675' : alpha('#fff', 0.05) }
                }}
              >
                Sell (Short)
              </Button>
            </Stack>

            {/* Order Type Buttons */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Button 
                fullWidth 
                size="small"
                onClick={() => setOrderType('market')}
                sx={{ 
                  borderRadius: '6px',
                  bgcolor: orderType === 'market' ? alpha('#fff', 0.1) : 'transparent',
                  color: orderType === 'market' ? '#fff' : alpha('#fff', 0.5),
                  fontWeight: orderType === 'market' ? 800 : 500,
                }}
              >
                Market Order
              </Button>
              <Button 
                fullWidth 
                size="small"
                onClick={() => setOrderType('limit')}
                sx={{ 
                  borderRadius: '6px',
                  bgcolor: orderType === 'limit' ? alpha('#fff', 0.1) : 'transparent',
                  color: orderType === 'limit' ? '#fff' : alpha('#fff', 0.5),
                  fontWeight: orderType === 'limit' ? 800 : 500,
                }}
              >
                Limit Order
              </Button>
            </Stack>

            {/* Margin Mode Selection */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), mb: 0.5, display: 'block' }}>Margin Mode</Typography>
              <Stack direction="row" spacing={1}>
                <Button 
                  fullWidth 
                  size="small"
                  onClick={() => setMarginMode('CROSS')}
                  sx={{ 
                    borderRadius: '8px',
                    py: 1,
                    bgcolor: marginMode === 'CROSS' ? alpha('#D4AF37', 0.15) : 'transparent',
                    border: `1px solid ${marginMode === 'CROSS' ? '#D4AF37' : alpha('#fff', 0.15)}`,
                    color: marginMode === 'CROSS' ? '#D4AF37' : alpha('#fff', 0.5),
                    fontWeight: marginMode === 'CROSS' ? 800 : 500,
                    textTransform: 'none'
                  }}
                >
                  Cross Margin
                </Button>
                <Button 
                  fullWidth 
                  size="small"
                  onClick={() => setMarginMode('ISOLATED')}
                  sx={{ 
                    borderRadius: '8px',
                    py: 1,
                    bgcolor: marginMode === 'ISOLATED' ? alpha('#D4AF37', 0.15) : 'transparent',
                    border: `1px solid ${marginMode === 'ISOLATED' ? '#D4AF37' : alpha('#fff', 0.15)}`,
                    color: marginMode === 'ISOLATED' ? '#D4AF37' : alpha('#fff', 0.5),
                    fontWeight: marginMode === 'ISOLATED' ? 800 : 500,
                    textTransform: 'none'
                  }}
                >
                  Isolated Margin
                </Button>
              </Stack>
            </Box>

            {/* Price Input (if limit) */}
            {orderType === 'limit' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), mb: 0.5, display: 'block' }}>Limit Price</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: alpha('#000', 0.5), borderRadius: '12px', p: 1, border: `1px solid ${alpha('#fff', 0.1)}` }}>
                  <InputBase 
                    fullWidth 
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    sx={{ color: '#fff', fontWeight: 'bold' }} 
                  />
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>USDT</Typography>
                </Box>
              </Box>
            )}

            {/* Size Unit Toggle & Input */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>
                  Size {unit === 'USDT' ? '(Estimated Contracts)' : '(Contracts)'}
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ bgcolor: alpha('#000', 0.5), borderRadius: '6px', p: 0.25 }}>
                  {['LOTS', 'USDT'].map((u) => (
                    <Box
                      key={u}
                      onClick={() => setUnit(u as 'LOTS' | 'USDT')}
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        color: unit === u ? '#121214' : alpha('#fff', 0.5),
                        bgcolor: unit === u ? '#D4AF37' : 'transparent',
                        transition: 'all 0.2s',
                      }}
                    >
                      {u}
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: alpha('#000', 0.5), borderRadius: '12px', p: 1, border: `1px solid ${alpha('#fff', 0.1)}` }}>
                <InputBase 
                  fullWidth 
                  placeholder="0.00" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  sx={{ color: '#fff', fontWeight: 'bold' }} 
                />
                <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 'bold', ml: 1 }}>{unit}</Typography>
              </Box>
              
              {/* Show equivalent converted value if USDT is selected */}
              {unit === 'USDT' && activeContract && (
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), mt: 0.5, display: 'block' }}>
                  ≈ {(() => {
                    const enteredValue = parseFloat(amount) || 0;
                    const contractPrice = orderType === 'limit' ? parseFloat(priceInput) || activeContract.price : activeContract.price;
                    const mult = activeContract.multiplier || 1;
                    const lSize = activeContract.lotSize || 1;
                    if (contractPrice <= 0) return 0;
                    return (Math.floor((enteredValue / (contractPrice * mult)) / lSize) * lSize).toFixed(3);
                  })()} LOTS (Lot Size: {activeContract.lotSize || 1})
                </Typography>
              )}
            </Box>

            {/* Leverage Slider */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>Leverage Mode</Typography>
                <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 800 }}>
                  {leverage}x {marginMode === 'CROSS' ? 'Cross' : 'Isolated'}
                </Typography>
              </Box>
              <Slider 
                value={leverage}
                min={1}
                max={100}
                onChange={(_, val) => setLeverage(val as number)}
                sx={{
                  color: '#D4AF37',
                  py: 1,
                  '& .MuiSlider-thumb': {
                    width: 18,
                    height: 18,
                    border: '2px solid #D4AF37',
                    bgcolor: '#121214',
                  }
                }}
              />
              <Stack direction="row" justifyContent="space-between">
                {[1, 10, 25, 50, 75, 100].map(val => (
                  <Typography key={val} variant="caption" sx={{ color: alpha('#fff', 0.3), cursor: 'pointer' }} onClick={() => setLeverage(val)}>
                    {val}x
                  </Typography>
                ))}
              </Stack>
            </Box>

            {/* Estimated Stats */}
            <Box sx={{ p: 1.5, bgcolor: alpha('#000', 0.3), borderRadius: '12px', mb: 2, border: `1px dashed ${alpha('#fff', 0.05)}` }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>Available Margin</Typography>
                <Typography variant="caption" color="#fff" fontWeight="bold">
                  ${activeBalanceAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.5) }}>Order Cost (Margin)</Typography>
                <Typography variant="caption" color="#fff" fontWeight="bold">
                  ${(() => {
                    const enteredSize = parseFloat(amount) || 0;
                    const contractPrice = orderType === 'limit' ? parseFloat(priceInput) || activeContract?.price || 0 : activeContract?.price || 0;
                    const mult = activeContract?.multiplier || 1;
                    if (unit === 'USDT') {
                      return (enteredSize / leverage).toFixed(2);
                    } else {
                      return ((enteredSize * contractPrice * mult) / leverage).toFixed(2);
                    }
                  })()} USDT
                </Typography>
              </Stack>
            </Box>

            {/* Execute Button */}
            <Button 
              fullWidth 
              onClick={handlePlaceOrder}
              sx={{ 
                bgcolor: side === 'buy' ? '#00b894' : '#ff7675', 
                color: '#fff',
                fontWeight: 900,
                py: 2,
                borderRadius: '12px',
                fontSize: '1rem',
                textTransform: 'none',
                boxShadow: `0 4px 20px ${alpha(side === 'buy' ? '#00b894' : '#ff7675', 0.3)}`,
                '&:hover': { bgcolor: side === 'buy' ? '#007a61' : '#cc5252' }
              }}
            >
              Confirm {side === 'buy' ? 'Buy / Long' : 'Sell / Short'} Order
            </Button>
          </Card>
        </Box>
      </Box>

      {/* 5. Positions, Active Orders, History Tab panel */}
      <Card sx={{ bgcolor: alpha('#121214', 0.8), border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '24px', overflow: 'hidden' }}>
        
        {/* Navigation tabs */}
        <Stack direction="row" spacing={1} sx={{ bgcolor: alpha('#000', 0.3), p: 1, borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
          {[
            { id: 'positions', label: `Positions (${activePositions.length})` },
            { id: 'orders', label: `Active Orders (${activeOrders.length})` },
            { id: 'history', label: 'History' },
            { id: 'assets', label: 'Assets' }
          ].map(tab => (
            <Button 
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              sx={{ 
                color: currentTab === tab.id ? '#D4AF37' : alpha('#fff', 0.5),
                fontWeight: currentTab === tab.id ? 'bold' : 'normal',
                bgcolor: currentTab === tab.id ? alpha('#D4AF37', 0.1) : 'transparent',
                px: 2,
                borderRadius: '10px',
                textTransform: 'none'
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>

        <Box sx={{ p: 2 }}>
          {/* TAB 1: Positions */}
          {currentTab === 'positions' && (
            <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              {activePositions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: alpha('#fff', 0.4) }}>
                  No active perpetual positions
                </Box>
              ) : (
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Contract</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Side</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Size</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Entry Price</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Mark Price</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Unrealized PnL</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activePositions.map((pos, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{pos.symbol}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Box sx={{ 
                            px: 1, py: 0.25, borderRadius: '4px', display: 'inline-block',
                            bgcolor: pos.side === 'long' ? alpha('#00b894', 0.15) : alpha('#ff7675', 0.15),
                            color: pos.side === 'long' ? '#00b894' : '#ff7675', fontWeight: 'bold', fontSize: '12px'
                          }}>
                            {pos.side.toUpperCase()}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{pos.size}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>${formatPrice(pos.entryPrice)}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>${formatPrice(pos.markPrice)}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Typography fontWeight="bold" sx={{ color: pos.unrealizedPnL >= 0 ? '#00b894' : '#ff7675' }}>
                            ${pos.unrealizedPnL.toFixed(2)} ({pos.roe.toFixed(2)}%)
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            onClick={() => handleClosePosition(pos)}
                            sx={{ textTransform: 'none', py: 0.25 }}
                          >
                            Close Market
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}

          {/* TAB 2: Active Orders */}
          {currentTab === 'orders' && (
            <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              {activeOrders.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: alpha('#fff', 0.4) }}>
                  No open limit orders pending execution
                </Box>
              ) : (
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Contract</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Type</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Side</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Price</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Size</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeOrders.map((ord, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{ord.symbol}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{ord.type.toUpperCase()}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Typography fontWeight="bold" sx={{ color: ord.side === 'buy' ? '#00b894' : '#ff7675' }}>
                            {ord.side.toUpperCase()}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>${formatPrice(ord.price || 0)}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{ord.size}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            size="small" 
                            onClick={() => handleCancelOrder(ord)}
                            sx={{ textTransform: 'none', py: 0.25 }}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}

          {/* TAB 3: Order History */}
          {currentTab === 'history' && (
            <TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
              {activeHistory.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4, color: alpha('#fff', 0.4) }}>
                  No trade history to display
                </Box>
              ) : (
                <Table size="small" sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Time</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Contract</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Side</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Type</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Execution Price</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Size</TableCell>
                      <TableCell sx={{ color: alpha('#fff', 0.4), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeHistory.map((hist, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ color: alpha('#fff', 0.6), borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{hist.time}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{hist.symbol}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{hist.side}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{hist.type}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>${formatPrice(hist.price)}</TableCell>
                        <TableCell sx={{ color: '#fff', borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>{hist.size}</TableCell>
                        <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.05)}` }}>
                          <Badge badgeContent={hist.status} color={hist.status === 'Filled' ? 'success' : 'default'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TableContainer>
          )}

          {/* TAB 4: Assets (Detailed overview) */}
          {currentTab === 'assets' && (
            <Stack spacing={3} sx={{ py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha('#000', 0.3), borderRadius: '16px', border: `1px solid ${alpha('#fff', 0.05)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Wallet color="#D4AF37" size={32} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="#fff">Total Margin Balance</Typography>
                    <Typography variant="caption" color="text.secondary">USDT-Margined Wallet</Typography>
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight="900" color="#fff">
                  ${activeBalanceTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha('#000', 0.3), borderRadius: '16px', border: `1px solid ${alpha('#fff', 0.05)}` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Info color="#D4AF37" size={32} />
                  <Box>
                    <Typography variant="body1" fontWeight="bold" color="#fff">Available Free Margin</Typography>
                    <Typography variant="caption" color="text.secondary">Funds available for opening positions</Typography>
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight="900" sx={{ color: '#4caf50' }}>
                  ${activeBalanceAvailable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </Typography>
              </Box>
            </Stack>
          )}
        </Box>
      </Card>
    </Box>
  );
}
