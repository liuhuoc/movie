const mongoose = require('mongoose');

const danmakuSchema = new mongoose.Schema({
  videoId: { 
    type: String, 
    required: true, 
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  username: { 
    type: String, 
    default: '匿名用户' 
  },
  
  // 弹幕内容
  text: { 
    type: String, 
    required: true,
    maxlength: 100 
  },
  
  // 时间位置（秒）
  time: { 
    type: Number, 
    required: true 
  },
  
  // 样式
  color: { 
    type: String, 
    default: '#FFFFFF' 
  },
  type: { 
    type: String, 
    enum: ['scroll', 'top', 'bottom'], 
    default: 'scroll' 
  },
  size: { 
    type: Number, 
    default: 1.0 
  },
  
  // 状态
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'approved' 
  },
  
  // 点赞
  likes: { 
    type: Number, 
    default: 0 
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 复合索引
danmakuSchema.index({ videoId: 1, time: 1 });
danmakuSchema.index({ videoId: 1, createdAt: -1 });

module.exports = mongoose.model('Danmaku', danmakuSchema);
