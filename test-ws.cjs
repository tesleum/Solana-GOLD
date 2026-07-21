const WebSocket = require('ws');
const token = "2neAiuYvAU61ZDXANAGAsiL4-iAExhsBXZxftpOeh_55i3Ysy2q2LEsEWU64mdzUOPusi34M_wGoSf7iNyEWJ55oUphpk3fQP-xSTxbV9gDMvz7DiRSPvNiYB9J6i9GjsxUuhPw3Blq6rhZlGykT3Vp1phUafnulOOpts-MEmEHD5T6jW2IeK-iQ-uO5oINqJBvJHl5Vs9Y=.9s4Ffbgp1--7tfDGHrfVPw==";
const ws = new WebSocket("wss://ws-api-futures.kucoin.com/?token=" + token + "&connectId=123");
ws.on('open', () => {
  ws.send(JSON.stringify({
    id: 1,
    type: 'subscribe',
    topic: '/contractMarket/limitCandle:XBTUSDTM_1min',
    privateChannel: false,
    response: true
  }));
});
ws.on('message', data => {
  console.log(data.toString());
});
setTimeout(() => ws.close(), 5000);
