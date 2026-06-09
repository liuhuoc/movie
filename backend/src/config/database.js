const mongoose = require('mongoose');

// 内存存储模式（当MongoDB不可用时）
let memoryStore = new Map();
let useMemoryStore = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_app');
    console.log(`MongoDB 已连接: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB 连接失败，切换到内存存储模式:', error.message);
    useMemoryStore = true;
    // 不退出进程，继续使用内存存储
  }
};

// 获取存储模式
const isMemoryStore = () => useMemoryStore;
const getMemoryStore = () => memoryStore;
const setMemoryStore = (key, value) => memoryStore.set(key, value);

module.exports = connectDB;
module.exports.isMemoryStore = isMemoryStore;
module.exports.getMemoryStore = getMemoryStore;
module.exports.setMemoryStore = setMemoryStore;
