const axios = require('axios');
const WebSocket = require('ws');

async function run() {
  const res = await axios.post('https://api-futures.kucoin.com/api/v1/bullet-public');
  const token = res.data.data.token;
  const endpoint = res.data.data.instanceServers[0].endpoint;
  
  const ws = new WebSocket(`${endpoint}?token=${token}&connectId=123`);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: 1,
      type: 'subscribe',
      topic: '/contractMarket/tickerV2:XBTUSDTM',
      privateChannel: false,
      response: true
    }));
  });
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'message') {
      console.log('Received:', JSON.stringify(msg));
    }
  });
  setTimeout(() => ws.close(), 3000);
}
run();
