const redis = require('redis');

let client = null;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    
    client.on('error', (err) => {
      console.error('Redis 错误:', err);
    });
    
    await client.connect();
    console.log('Redis 已连接');
  } catch (error) {
    console.error('Redis 连接失败:', error.message);
  }
};

const getRedis = () => client;

module.exports = connectRedis;
module.exports.getRedis = getRedis;
