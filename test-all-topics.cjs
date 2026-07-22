const WebSocket = require('ws');

async function run() {
  const res = await fetch('https://api-futures.kucoin.com/api/v1/bullet-public', { method: 'POST' });
  const json = await res.json();
  const data = json.data;
  const token = data.token;
  const endpoint = data.instanceServers[0].endpoint;
  const wsUrl = `${endpoint}?token=${token}&connectId=test_all`;
  
  console.log('Connecting to:', wsUrl);
  const ws = new WebSocket(wsUrl);
  
  ws.on('open', () => {
    console.log('WS Connection Open!');
    
    // Subscribe to ticker v1
    ws.send(JSON.stringify({
      id: 1,
      type: 'subscribe',
      topic: '/contractMarket/ticker:XBTUSDTM',
      privateChannel: false,
      response: true
    }));

    // Subscribe to ticker v2
    ws.send(JSON.stringify({
      id: 2,
      type: 'subscribe',
      topic: '/contractMarket/tickerV2:XBTUSDTM',
      privateChannel: false,
      response: true
    }));

    // Subscribe to candle 1min
    ws.send(JSON.stringify({
      id: 3,
      type: 'subscribe',
      topic: '/contractMarket/limitCandle:XBTUSDTM_1min',
      privateChannel: false,
      response: true
    }));

    // Subscribe to Level 2 Depth 5
    ws.send(JSON.stringify({
      id: 4,
      type: 'subscribe',
      topic: '/contractMarket/level2Depth5:XBTUSDTM',
      privateChannel: false,
      response: true
    }));
  });
  
  ws.on('message', (msg) => {
    const parsed = JSON.parse(msg.toString());
    console.log('Received topic:', parsed.topic, 'subject:', parsed.subject, 'type:', parsed.type);
    if (parsed.type === 'message') {
      console.log('Data:', JSON.stringify(parsed.data));
    } else {
      console.log('Control:', JSON.stringify(parsed));
    }
  });

  ws.on('error', (err) => {
    console.error('WS Error:', err);
  });

  ws.on('close', () => {
    console.log('WS Connection Closed');
  });

  setTimeout(() => {
    ws.close();
  }, 15000);
}

run().catch(console.error);
