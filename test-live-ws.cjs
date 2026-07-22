const WebSocket = require('ws');

async function run() {
  const res = await fetch('https://api-futures.kucoin.com/api/v1/bullet-public', { method: 'POST' });
  const json = await res.json();
  const data = json.data;
  const token = data.token;
  const endpoint = data.instanceServers[0].endpoint;
  const wsUrl = `${endpoint}?token=${token}&connectId=test_123`;
  
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
  });
  
  let msgCount = 0;
  ws.on('message', (msg) => {
    msgCount++;
    if (msgCount <= 10) {
      console.log(`Msg #${msgCount}:`, msg.toString());
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
  }, 4000);
}

run().catch(console.error);
