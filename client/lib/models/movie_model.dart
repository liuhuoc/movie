class Movie {
  final String id;
  final String title;
  final String? originalTitle;
  final List<String> alias;
  final String type;
  final List<String> category;
  final int? year;
  final String? area;
  final String? language;
  final String? cover;
  final String? poster;
  final String? backdrop;
  final List<String> director;
  final List<String> actor;
  final List<String> writer;
  final String? description;
  final double rating;
  final String status;
  final int totalEpisodes;
  final int currentEpisode;
  final String? updateSchedule;
  final int? duration;
  final List<Source> sources;
  final List<String> tags;
  final int viewCount;
  final DateTime? updatedAt;

  Movie({
    required this.id,
    required this.title,
    this.originalTitle,
    this.alias = const [],
    required this.type,
    this.category = const [],
    this.year,
    this.area,
    this.language,
    this.cover,
    this.poster,
    this.backdrop,
    this.director = const [],
    this.actor = const [],
    this.writer = const [],
    this.description,
    this.rating = 0,
    this.status = 'ongoing',
    this.totalEpisodes = 0,
    this.currentEpisode = 0,
    this.updateSchedule,
    this.duration,
    this.sources = const [],
    this.tags = const [],
    this.viewCount = 0,
    this.updatedAt,
  });

  factory Movie.fromJson(Map<String, dynamic> json) {
    return Movie(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      originalTitle: json['originalTitle'],
      alias: List<String>.from(json['alias'] ?? []),
      type: json['type'] ?? 'movie',
      category: List<String>.from(json['category'] ?? []),
      year: json['year'],
      area: json['area'],
      language: json['language'],
      cover: json['cover'],
      poster: json['poster'],
      backdrop: json['backdrop'],
      director: List<String>.from(json['director'] ?? []),
      actor: List<String>.from(json['actor'] ?? []),
      writer: List<String>.from(json['writer'] ?? []),
      description: json['description'],
      rating: (json['rating'] ?? 0).toDouble(),
      status: json['status'] ?? 'ongoing',
      totalEpisodes: json['totalEpisodes'] ?? 0,
      currentEpisode: json['currentEpisode'] ?? 0,
      updateSchedule: json['updateSchedule'],
      duration: json['duration'],
      sources: (json['sources'] as List? ?? [])
          .map((s) => Source.fromJson(s))
          .toList(),
      tags: List<String>.from(json['tags'] ?? []),
      viewCount: json['viewCount'] ?? 0,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  String get displayTitle => title;
  
  String get yearText => year != null ? '$year' : '';
  
  String get episodeText {
    if (type == 'movie') return '';
    if (status == 'completed') {
      return '全$totalEpisodes集';
    }
    return '更新至$currentEpisode集';
  }
  
  String get typeText {
    switch (type) {
      case 'movie':
        return '电影';
      case 'tv':
        return '电视剧';
      case 'variety':
        return '综艺';
      case 'anime':
        return '动漫';
      default:
        return '其他';
    }
  }
}

class Source {
  final String siteName;
  final String siteUrl;
  final String playUrl;
  final String quality;
  final int episodeCount;
  final List<Episode> episodes;

  Source({
    required this.siteName,
    required this.siteUrl,
    required this.playUrl,
    this.quality = 'HD',
    this.episodeCount = 0,
    this.episodes = const [],
  });

  factory Source.fromJson(Map<String, dynamic> json) {
    return Source(
      siteName: json['siteName'] ?? '',
      siteUrl: json['siteUrl'] ?? '',
      playUrl: json['playUrl'] ?? '',
      quality: json['quality'] ?? 'HD',
      episodeCount: json['episodeCount'] ?? 0,
      episodes: (json['episodes'] as List? ?? [])
          .map((e) => Episode.fromJson(e))
          .toList(),
    );
  }
}

class Episode {
  final String name;
  final String url;

  Episode({
    required this.name,
    required this.url,
  });

  factory Episode.fromJson(Map<String, dynamic> json) {
    return Episode(
      name: json['name'] ?? '',
      url: json['url'] ?? '',
    );
  }
}
