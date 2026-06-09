import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/movie_provider.dart';
import '../theme/app_theme.dart';
import '../widgets/movie_card.dart';
import 'movie_detail_screen.dart';

class CategoryScreen extends ConsumerStatefulWidget {
  const CategoryScreen({super.key});

  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  String _selectedType = 'movie';
  String? _selectedCategory;
  int? _selectedYear;

  final List<Map<String, dynamic>> _types = [
    {'key': 'movie', 'label': '电影'},
    {'key': 'tv', 'label': '电视剧'},
    {'key': 'variety', 'label': '综艺'},
    {'key': 'anime', 'label': '动漫'},
  ];

  final List<String> _categories = [
    '动作', '科幻', '爱情', '喜剧', '悬疑', '恐怖', '动画', '纪录片'
  ];

  final List<int> _years = List.generate(15, (i) => DateTime.now().year - i);

  @override
  Widget build(BuildContext context) {
    final moviesAsync = ref.watch(
      movieListProvider(MovieListParams(
        type: _selectedType,
        category: _selectedCategory,
        year: _selectedYear,
      )),
    );

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // 类型选择
            _buildTypeSelector(),

            // 筛选器
            _buildFilterBar(),

            // 影片列表
            Expanded(
              child: moviesAsync.when(
                data: (movies) => GridView.builder(
                  padding: const EdgeInsets.all(16),
                  gridDelegate:
                      const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 3,
                    childAspectRatio: 0.65,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: movies.length,
                  itemBuilder: (context, index) {
                    final movie = movies[index];
                    return MovieCard(
                      movie: movie,
                      onTap: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => MovieDetailScreen(
                              movieId: movie.id,
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
                loading: () => const Center(
                  child: CircularProgressIndicator(color: AppTheme.primaryColor),
                ),
                error: (error, _) => Center(
                  child: Text('加载失败: $error'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: _types.map((type) {
          final isSelected = _selectedType == type['key'];
          return GestureDetector(
            onTap: () {
              setState(() {
                _selectedType = type['key'];
                _selectedCategory = null;
              });
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected
                    ? AppTheme.primaryColor
                    : AppTheme.cardColor,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                type['label'],
                style: TextStyle(
                  color: isSelected ? Colors.white : AppTheme.textSecondary,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // 分类筛选
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildFilterChip('全部', null, _selectedCategory == null),
                  ..._categories.map((cat) => _buildFilterChip(
                        cat,
                        cat,
                        _selectedCategory == cat,
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          // 年份筛选
          PopupMenuButton<int?>(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: AppTheme.cardColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    _selectedYear?.toString() ?? '年份',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const Icon(
                    Icons.arrow_drop_down,
                    size: 18,
                    color: AppTheme.textSecondary,
                  ),
                ],
              ),
            ),
            onSelected: (year) {
              setState(() => _selectedYear = year);
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: null,
                child: Text('全部年份'),
              ),
              ..._years.map((year) => PopupMenuItem(
                    value: year,
                    child: Text('$year'),
                  )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? value, bool isSelected) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) {
          setState(() => _selectedCategory = value);
        },
        backgroundColor: AppTheme.cardColor,
        selectedColor: AppTheme.primaryColor.withOpacity(0.2),
        checkmarkColor: AppTheme.primaryColor,
        labelStyle: TextStyle(
          color: isSelected ? AppTheme.primaryColor : AppTheme.textSecondary,
          fontSize: 12,
        ),
      ),
    );
  }
}
