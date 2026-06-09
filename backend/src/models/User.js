const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  nickname: { 
    type: String, 
    default: '' 
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  
  // 观看历史
  history: [{
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    title: String,
    cover: String,
    episode: { type: Number, default: 1 },
    progress: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // 收藏
  favorites: [{
    movieId: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie' },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // 设置
  settings: {
    theme: { type: String, default: 'dark' },
    defaultQuality: { type: String, default: 'auto' },
    autoPlay: { type: Boolean, default: true },
    skipIntro: { type: Boolean, default: false },
    danmakuEnabled: { type: Boolean, default: true },
    danmakuOpacity: { type: Number, default: 0.8 },
    danmakuSize: { type: Number, default: 1.0 },
    danmakuSpeed: { type: Number, default: 1.0 }
  },
  
  // 设备信息
  devices: [{
    deviceId: String,
    deviceName: String,
    platform: String,
    lastLogin: { type: Date, default: Date.now }
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 密码验证
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 更新前自动更新时间
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);
