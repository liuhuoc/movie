import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 用户信息
              _buildUserHeader(context),
              const SizedBox(height: 24),

              // 统计
              _buildStats(),
              const SizedBox(height: 24),

              // 功能列表
              _buildSectionTitle(context, '我的内容'),
              _buildMenuItem(
                icon: Icons.history,
                title: '观看历史',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.favorite,
                title: '我的收藏',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.download,
                title: '离线缓存',
                onTap: () {},
              ),
              const SizedBox(height: 16),

              _buildSectionTitle(context, '设置'),
              _buildMenuItem(
                icon: Icons.palette,
                title: '主题设置',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.play_circle_outline,
                title: '播放设置',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.chat_bubble_outline,
                title: '弹幕设置',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.storage,
                title: '缓存管理',
                onTap: () {},
              ),
              const SizedBox(height: 16),

              _buildSectionTitle(context, '关于'),
              _buildMenuItem(
                icon: Icons.info_outline,
                title: '关于应用',
                onTap: () {},
              ),
              _buildMenuItem(
                icon: Icons.update,
                title: '检查更新',
                onTap: () {},
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(32),
            ),
            child: const Icon(
              Icons.person,
              size: 32,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '未登录',
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '登录后可同步观看记录',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withOpacity(0.8),
                      ),
                ),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppTheme.primaryColor,
              elevation: 0,
            ),
            child: const Text('登录'),
          ),
        ],
      ),
    );
  }

  Widget _buildStats() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _buildStatItem('观看', '0'),
        _buildStatItem('收藏', '0'),
        _buildStatItem('下载', '0'),
      ],
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }

  Widget _buildMenuItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    String? subtitle,
  }) {
    return ListTile(
      leading: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: AppTheme.cardColor,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppTheme.textSecondary, size: 20),
      ),
      title: Text(title),
      subtitle: subtitle != null
          ? Text(
              subtitle,
              style: const TextStyle(color: AppTheme.textMuted),
            )
          : null,
      trailing: const Icon(
        Icons.chevron_right,
        color: AppTheme.textMuted,
      ),
      onTap: onTap,
      contentPadding: EdgeInsets.zero,
    );
  }
}
