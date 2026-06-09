const WebSocket = require('ws');

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  
  // 存储连接
  const clients = new Map();
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket 客户端已连接');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(ws, data, clients);
      } catch (error) {
        console.error('WebSocket 消息解析错误:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket 客户端已断开');
      // 清理客户端
      for (const [key, value] of clients.entries()) {
        if (value === ws) {
          clients.delete(key);
          break;
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
    });
  });
  
  console.log('WebSocket 服务已启动');
  return wss;
};

const handleMessage = (ws, data, clients) => {
  const { type, payload } = data;
  
  switch (type) {
    case 'auth':
      // 用户认证
      clients.set(payload.userId, ws);
      ws.send(JSON.stringify({ type: 'auth_success' }));
      break;
      
    case 'danmaku':
      // 弹幕消息广播
      broadcastDanmaku(payload, clients);
      break;
      
    case 'sync':
      // 播放进度同步
      handleSync(ws, payload, clients);
      break;
      
    default:
      console.log('未知消息类型:', type);
  }
};

const broadcastDanmaku = (payload, clients) => {
  const message = JSON.stringify({
    type: 'danmaku',
    payload
  });
  
  // 广播给所有客户端
  for (const ws of clients.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
};

const handleSync = (ws, payload, clients) => {
  const { userId, videoId, progress } = payload;
  
  // 存储同步数据到Redis或数据库
  // 这里简化处理，实际应存入数据库
  
  // 广播给同一用户的其他设备
  for (const [key, clientWs] of clients.entries()) {
    if (key.startsWith(userId) && clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'sync_update',
        payload: { videoId, progress }
      }));
    }
  }
};

module.exports = setupWebSocket;
