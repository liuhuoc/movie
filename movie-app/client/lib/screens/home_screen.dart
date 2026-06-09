import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/movie_provider.dart';
import '../models/movie_model.dart';
import '../theme/app_theme.dart';
import '../widgets/movie_card.dart';
import '../widgets/section_header.dart';
import '../widgets/shimmer_loading.dart';
import 'movie_detail_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final moviesAsync = ref.watch(
      movieListProvider(const MovieListParams(sort: 'updatedAt')),
    );
    final recommendationsAsync = ref.watch(recommendationsProvider(null));

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 顶部应用栏
          SliverToBoxAdapter(
            child: _buildHeader(context),
          ),

          // 推荐影片
          SliverToBoxAdapter(
            child: recommendationsAsync.when(
              data: (movies) => _buildHorizontalSection(
                context,
                title: '热门推荐',
                movies: movies,
              ),
              loading: () => const ShimmerHorizontalList(),
              error: (_, __) => const SizedBox.shrink(),
            ),
          ),

          // 最新更新
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: SectionHeader(
                title: '最新更新',
                onSeeAll: () {},
              ),
            ),
          ),

          // 影片网格
          moviesAsync.when(
            data: (movies) => SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  childAspectRatio: 0.65,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 16,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final movie = movies[index];
                    return MovieCard(
                      movie: movie,
                      onTap: () => _navigateToDetail(context, movie),
                    );
                  },
                  childCount: movies.length,
                ),
              ),
            ),
            loading: () => const SliverToBoxAdapter(
              child: ShimmerGrid(),
            ),
            error: (error, _) => SliverToBoxAdapter(
              child: Center(
                child: Text('加载失败: $error'),
              ),
            ),
          ),

          const SliverPadding(padding: EdgeInsets.only(bottom: 24)),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 60, 16, 16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppTheme.primaryColor.withOpacity(0.1),
            Colors.transparent,
          ],
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(
              Icons.play_arrow_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '影视聚合',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
                Text(
                  '发现精彩内容',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_outlined),
            color: AppTheme.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildHorizontalSection(
    BuildContext context, {
    required String title,
    required List<Movie> movies,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: SectionHeader(
            title: title,
            onSeeAll: () {},
          ),
        ),
        SizedBox(
          height: 200,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: movies.length,
            itemBuilder: (context, index) {
              final movie = movies[index];
              return Padding(
                padding: const EdgeInsets.only(right: 12),
                child: MovieCard(
                  movie: movie,
                  width: 140,
                  onTap: () => _navigateToDetail(context, movie),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  void _navigateToDetail(BuildContext context, Movie movie) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MovieDetailScreen(movieId: movie.id),
      ),
    );
  }
}
