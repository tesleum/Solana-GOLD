  // Initialize Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid' as any, color: '#121214' },
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
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series as any;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch Klines when symbol changes
  useEffect(() => {
    let isMounted = true;
    const fetchKlines = async () => {
      try {
        const response = await axios.get(`/api/kucoin/kline?symbol=${selectedSymbol}&granularity=1`);
        if (!isMounted || !response.data || !response.data.data) return;
        
        // Data format: [ [time, open, close, high, low, volume, turnover], ... ]
        // lightweight-charts needs { time, open, high, low, close }
        const formattedData = response.data.data.map((item: any) => ({
          time: (item[0] / 1000) as any,
          open: parseFloat(item[1]),
          high: parseFloat(item[3]),
          low: parseFloat(item[4]),
          close: parseFloat(item[2]),
        })).sort((a: any, b: any) => a.time - b.time);

        if (seriesRef.current) {
          seriesRef.current.setData(formattedData);
        }
      } catch (err) {
        console.error("Failed to fetch klines:", err);
      }
    };
    
    fetchKlines();
    return () => { isMounted = false; };
  }, [selectedSymbol]);
