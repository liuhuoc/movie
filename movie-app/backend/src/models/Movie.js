const mongoose = require('mongoose');

const sourceSchema = new mongoose.Schema({
  siteName: { type: String, default: '' },
  siteUrl: { type: String, default: '' },
  playUrl: { type: String, default: '' },
  quality: { type: String, default: 'HD' },
  episodeCount: { type: Number, default: 0 },
  episodes: [{
    name: String,
    url: String
  }],
  updatedAt: { type: Date, default: Date.now }
});

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  originalTitle: { type: String },
  alias: [{ type: String }],
  type: { type: String, enum: ['movie', 'tv', 'variety', 'anime'], required: true },
  category: [{ type: String }],
  year: { type: Number },
  area: { type: String },
  language: { type: String },
  cover: { type: String },
  poster: { type: String },
  backdrop: { type: String },
  screenshots: [{ type: String }],
  director: [{ type: String }],
  actor: [{ type: String }],
  writer: [{ type: String }],
  description: { type: String },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  status: { type: String, enum: ['ongoing', 'completed', 'upcoming'], default: 'ongoing' },
  totalEpisodes: { type: Number, default: 0 },
  currentEpisode: { type: Number, default: 0 },
  updateSchedule: { type: String },
  duration: { type: Number },
  sources: [sourceSchema],
  tags: [{ type: String }],
  viewCount: { type: Number, default: 0 },
  spiderSource: { type: String },
  spiderUrl: { type: String },
  spiderUpdatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

movieSchema.index({ title: 'text', alias: 'text', description: 'text' });
movieSchema.index({ type: 1, year: -1 });
movieSchema.index({ category: 1 });
movieSchema.index({ rating: -1 });
movieSchema.index({ spiderUpdatedAt: -1 });

movieSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Movie', movieSchema);
