const axios = require('axios');
const WebSocket = require('ws');

async function test() {
  const { data } = await axios.post('https://api-futures.kucoin.com/api/v1/bullet-public');
  const token = data.data.token;
  const endpoint = data.data.instanceServers[0].endpoint;
  const ws = new WebSocket(`${endpoint}?token=${token}&connectId=test`);
  
  ws.on('open', () => {
    ws.send(JSON.stringify({
      id: Date.now(),
      type: 'subscribe',
      topic: '/contractMarket/ticker:XBTUSDTM',
      privateChannel: false,
      response: true
    }));
    ws.send(JSON.stringify({
      id: Date.now() + 1,
      type: 'subscribe',
      topic: '/contract/instrument:XBTUSDTM',
      privateChannel: false,
      response: true
    }));
  });
  
  ws.on('message', (data) => {
    console.log(data.toString());
  });
}
test();
