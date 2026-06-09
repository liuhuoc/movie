import 'package:dio/dio.dart';
import '../models/movie_model.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  late Dio _dio;
  String? _token;

  // 服务器地址，实际使用时应从配置读取
  static const String baseUrl = 'http://localhost:3000/api';

  void init() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // 添加拦截器
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        // 处理错误
        handler.next(error);
      },
    ));
  }

  void setToken(String token) {
    _token = token;
  }

  void clearToken() {
    _token = null;
  }

  // ========== 影片相关 ==========

  Future<List<Movie>> getMovies({
    String? type,
    String? category,
    int? year,
    String? sort,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _dio.get('/movies', queryParameters: {
        if (type != null) 'type': type,
        if (category != null) 'category': category,
        if (year != null) 'year': year,
        if (sort != null) 'sort': sort,
        'page': page,
        'limit': limit,
      });

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data.map((json) => Movie.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('获取影片列表失败: $e');
      return [];
    }
  }

  Future<List<Movie>> searchMovies(String keyword, {int page = 1}) async {
    try {
      final response = await _dio.get('/movies/search', queryParameters: {
        'q': keyword,
        'page': page,
      });

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data.map((json) => Movie.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('搜索影片失败: $e');
      return [];
    }
  }

  Future<Movie?> getMovieDetail(String id) async {
    try {
      final response = await _dio.get('/movies/$id');

      if (response.data['success'] == true) {
        return Movie.fromJson(response.data['data']);
      }
      return null;
    } catch (e) {
      print('获取影片详情失败: $e');
      return null;
    }
  }

  Future<List<Movie>> getRecommendations({String? type, int limit = 10}) async {
    try {
      final response = await _dio.get('/movies/recommend/list', queryParameters: {
        if (type != null) 'type': type,
        'limit': limit,
      });

      if (response.data['success'] == true) {
        final List data = response.data['data'];
        return data.map((json) => Movie.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('获取推荐影片失败: $e');
      return [];
    }
  }

  // ========== 用户相关 ==========

  Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      final response = await _dio.post('/users/login', data: {
        'username': username,
        'password': password,
      });

      if (response.data['success'] == true) {
        final token = response.data['data']['token'];
        setToken(token);
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('登录失败: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> register(
    String username,
    String password, {
    String? nickname,
  }) async {
    try {
      final response = await _dio.post('/users/register', data: {
        'username': username,
        'password': password,
        if (nickname != null) 'nickname': nickname,
      });

      if (response.data['success'] == true) {
        final token = response.data['data']['token'];
        setToken(token);
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('注册失败: $e');
      return null;
    }
  }

  // ========== 弹幕相关 ==========

  Future<List<Map<String, dynamic>>> getDanmaku(
    String videoId, {
    double? startTime,
    double? endTime,
  }) async {
    try {
      final response = await _dio.get('/danmaku/$videoId', queryParameters: {
        if (startTime != null) 'startTime': startTime,
        if (endTime != null) 'endTime': endTime,
      });

      if (response.data['success'] == true) {
        return List<Map<String, dynamic>>.from(response.data['data']);
      }
      return [];
    } catch (e) {
      print('获取弹幕失败: $e');
      return [];
    }
  }

  Future<bool> sendDanmaku({
    required String videoId,
    required String text,
    required double time,
    String? color,
    String? type,
  }) async {
    try {
      final response = await _dio.post('/danmaku', data: {
        'videoId': videoId,
        'text': text,
        'time': time,
        if (color != null) 'color': color,
        if (type != null) 'type': type,
      });

      return response.data['success'] == true;
    } catch (e) {
      print('发送弹幕失败: $e');
      return false;
    }
  }

  // ========== 同步相关 ==========

  Future<bool> syncProgress({
    required String movieId,
    required String title,
    String? cover,
    int episode = 1,
    double progress = 0,
    double duration = 0,
  }) async {
    try {
      final response = await _dio.post('/sync/progress', data: {
        'movieId': movieId,
        'title': title,
        if (cover != null) 'cover': cover,
        'episode': episode,
        'progress': progress,
        'duration': duration,
      });

      return response.data['success'] == true;
    } catch (e) {
      print('同步进度失败: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> getProgress(String movieId) async {
    try {
      final response = await _dio.get('/sync/progress/$movieId');

      if (response.data['success'] == true) {
        return response.data['data'];
      }
      return null;
    } catch (e) {
      print('获取进度失败: $e');
      return null;
    }
  }
}
