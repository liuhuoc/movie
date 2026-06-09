import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/movie_model.dart';
import '../services/api_service.dart';

// API服务提供者
final apiServiceProvider = Provider<ApiService>((ref) {
  final api = ApiService();
  api.init();
  return api;
});

// 影片列表状态
final movieListProvider = StateNotifierProvider.family<MovieListNotifier,
    AsyncValue<List<Movie>>, MovieListParams>((ref, params) {
  return MovieListNotifier(ref.read(apiServiceProvider), params);
});

class MovieListParams {
  final String? type;
  final String? category;
  final int? year;
  final String? sort;

  const MovieListParams({
    this.type,
    this.category,
    this.year,
    this.sort,
  });

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is MovieListParams &&
        other.type == type &&
        other.category == category &&
        other.year == year &&
        other.sort == sort;
  }

  @override
  int get hashCode => Object.hash(type, category, year, sort);
}

class MovieListNotifier extends StateNotifier<AsyncValue<List<Movie>>> {
  final ApiService _api;
  final MovieListParams _params;
  int _page = 1;
  bool _hasMore = true;

  MovieListNotifier(this._api, this._params)
      : super(const AsyncValue.loading()) {
    loadMovies();
  }

  Future<void> loadMovies({bool refresh = false}) async {
    if (refresh) {
      _page = 1;
      _hasMore = true;
    }

    if (!_hasMore && !refresh) return;

    try {
      final movies = await _api.getMovies(
        type: _params.type,
        category: _params.category,
        year: _params.year,
        sort: _params.sort,
        page: _page,
      );

      if (movies.length < 20) {
        _hasMore = false;
      }

      if (_page == 1) {
        state = AsyncValue.data(movies);
      } else {
        final currentMovies = state.value ?? [];
        state = AsyncValue.data([...currentMovies, ...movies]);
      }

      _page++;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  void loadMore() {
    loadMovies();
  }
}

// 搜索状态
final searchProvider = StateNotifierProvider<SearchNotifier,
    AsyncValue<List<Movie>>>((ref) {
  return SearchNotifier(ref.read(apiServiceProvider));
});

class SearchNotifier extends StateNotifier<AsyncValue<List<Movie>>> {
  final ApiService _api;

  SearchNotifier(this._api) : super(const AsyncValue.data([]));

  Future<void> search(String keyword) async {
    if (keyword.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }

    state = const AsyncValue.loading();

    try {
      final movies = await _api.searchMovies(keyword);
      state = AsyncValue.data(movies);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }
}

// 影片详情状态
final movieDetailProvider = FutureProvider.family<Movie?, String>((ref, id) {
  return ref.read(apiServiceProvider).getMovieDetail(id);
});

// 推荐影片状态
final recommendationsProvider = FutureProvider.family<List<Movie>, String?>(
    (ref, type) {
  return ref.read(apiServiceProvider).getRecommendations(type: type);
});
