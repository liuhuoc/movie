import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/movie_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/shimmer_loading.dart';
import 'player_screen.dart';

class MovieDetailScreen extends ConsumerWidget {
  final String movieId;

  const MovieDetailScreen({
    super.key,
    required this.movieId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final movieAsync = ref.watch(movieDetailProvider(movieId));

    return Scaffold(
      body: movieAsync.when(
        data: (movie) {
          if (movie == null) {
            return const Center(child: Text('影片不存在'));
          }
          return _buildContent(context, movie);
        },
        loading: () => const ShimmerDetail(),
        error: (error, _) => Center(child: Text('加载失败: $error')),
      ),
    );
  }

  Widget _buildContent(BuildContext context, movie) {
    return CustomScrollView(
      slivers: [
        // 顶部海报
        SliverAppBar(
          expandedHeight: 300,
          pinned: true,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(
              fit: StackFit.expand,
              children: [
                // 背景图
                CachedNetworkImage(
                  imageUrl: movie.backdrop ?? movie.cover ?? '',
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(
                    color: AppTheme.cardColor,
                  ),
                  errorWidget: (_, __, ___) => Container(
                    color: AppTheme.cardColor,
                    child: const Icon(Icons.image_not_supported),
                  ),
                ),
                // 渐变遮罩
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.transparent,
                        AppTheme.backgroundColor.withOpacity(0.8),
                        AppTheme.backgroundColor,
                      ],
                      stops: const [0.5, 0.8, 1.0],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // 内容
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 标题
                Text(
                  movie.title,
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 8),

                // 元信息
                Wrap(
                  spacing: 8,
                  children: [
                    if (movie.year != null)
                      _buildTag(movie.year.toString()),
                    _buildTag(movie.typeText),
                    if (movie.area != null)
                      _buildTag(movie.area),
                    if (movie.rating > 0)
                      _buildRatingTag(movie.rating),
                  ],
                ),
                const SizedBox(height: 16),

                // 操作按钮
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _playMovie(context, movie),
                        icon: const Icon(Icons.play_arrow),
                        label: const Text('立即播放'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.favorite_border),
                      style: IconButton.styleFrom(
                        backgroundColor: AppTheme.cardColor,
                        foregroundColor: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      onPressed: () {},
                      icon: const Icon(Icons.share_outlined),
                      style: IconButton.styleFrom(
                        backgroundColor: AppTheme.cardColor,
                        foregroundColor: AppTheme.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // 简介
                if (movie.description != null && movie.description!.isNotEmpty)
                  ...[
                    Text(
                      '简介',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      movie.description!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondary,
                            height: 1.6,
                          ),
                    ),
                    const SizedBox(height: 24),
                  ],

                // 演员
                if (movie.actor.isNotEmpty)
                  ...[
                    Text(
                      '演员',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: movie.actor
                          .take(10)
                          .map((name) => _buildTag(name))
                          .toList(),
                    ),
                    const SizedBox(height: 24),
                  ],

                // 选集
                if (movie.sources.isNotEmpty &&
                    movie.sources.first.episodes.isNotEmpty)
                  _buildEpisodeList(context, movie),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTag(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.cardColor,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          color: AppTheme.textSecondary,
        ),
      ),
    );
  }

  Widget _buildRatingTag(double rating) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withOpacity(0.2),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.star,
            size: 14,
            color: AppTheme.primaryColor,
          ),
          const SizedBox(width: 4),
          Text(
            rating.toStringAsFixed(1),
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEpisodeList(BuildContext context, movie) {
    final episodes = movie.sources.first.episodes;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '选集',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: 12),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            childAspectRatio: 1.5,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: episodes.length,
          itemBuilder: (context, index) {
            final episode = episodes[index];
            return GestureDetector(
              onTap: () => _playEpisode(context, movie, episode.url),
              child: Container(
                decoration: BoxDecoration(
                  color: AppTheme.cardColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AppTheme.primaryColor.withOpacity(0.3),
                    width: 1,
                  ),
                ),
                child: Center(
                  child: Text(
                    episode.name,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                    textAlign: TextAlign.center,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  void _playMovie(BuildContext context, movie) {
    final playUrl = movie.sources.isNotEmpty
        ? movie.sources.first.playUrl
        : '';
    if (playUrl.isNotEmpty) {
      _playEpisode(context, movie, playUrl);
    }
  }

  void _playEpisode(BuildContext context, movie, String url) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerScreen(
          title: movie.title,
          videoUrl: url,
          movieId: movie.id,
        ),
      ),
    );
  }
}
