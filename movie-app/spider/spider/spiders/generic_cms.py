import scrapy
import re
from urllib.parse import urljoin, parse_qs, urlparse
from ..items import MovieItem
from .base import BaseMovieSpider


class GenericCMSSpider(BaseMovieSpider):
    """
    通用CMS爬虫
    支持苹果CMS、飞飞CMS等常见影视CMS系统
    """
    
    name = 'generic_cms'
    
    # CMS API配置
    cms_configs = {
        'apple_cms': {
            'base_url': '',  # 需要配置
            'api_path': '/api.php/provide/vod/',
            'params': {
                'ac': 'detail',
                'pg': '{page}',
            }
        }
    }
    
    def __init__(self, cms_url=None, cms_type='apple_cms', **kwargs):
        super().__init__(**kwargs)
        self.cms_url = cms_url
        self.cms_type = cms_type
        
        if cms_url:
            self.start_urls = [self.build_api_url(1)]
    
    def build_api_url(self, page):
        """构建API请求URL"""
        config = self.cms_configs.get(self.cms_type, self.cms_configs['apple_cms'])
        base = self.cms_url or config['base_url']
        api_path = config['api_path']
        
        params = []
        for key, value in config['params'].items():
            val = value.format(page=page) if '{page}' in value else value
            params.append(f"{key}={val}")
        
        return f"{base}{api_path}?{'&'.join(params)}"
    
    def parse(self, response):
        """解析CMS API返回的JSON数据"""
        import json
        
        try:
            data = json.loads(response.text)
        except:
            self.logger.error(f"JSON解析失败: {response.url}")
            return
        
        if data.get('code') != 1:
            self.logger.error(f"API返回错误: {data.get('msg')}")
            return
        
        movies = data.get('list', [])
        
        for movie_data in movies:
            item = self.parse_cms_movie(movie_data)
            if item:
                yield item
        
        # 分页
        page = response.meta.get('page', 1)
        if page < self.max_pages and len(movies) > 0:
            next_page = page + 1
            yield scrapy.Request(
                self.build_api_url(next_page),
                callback=self.parse,
                meta={'page': next_page}
            )
    
    def parse_cms_movie(self, data):
        """解析CMS影片数据"""
        item = MovieItem()
        
        item['title'] = data.get('vod_name', '')
        item['originalTitle'] = data.get('vod_sub', '')
        item['type'] = self.map_type(data.get('type_id', 1))
        item['category'] = data.get('vod_class', '').split(',') if data.get('vod_class') else []
        item['year'] = self.extract_year(data.get('vod_year', ''))
        item['area'] = data.get('vod_area', '')
        item['language'] = data.get('vod_lang', '')
        item['cover'] = data.get('vod_pic', '')
        item['director'] = data.get('vod_director', '').split(',') if data.get('vod_director') else []
        item['actor'] = data.get('vod_actor', '').split(',') if data.get('vod_actor') else []
        item['writer'] = data.get('vod_writer', '').split(',') if data.get('vod_writer') else []
        item['description'] = data.get('vod_content', '')
        item['rating'] = float(data.get('vod_score', 0)) if data.get('vod_score') else 0
        item['status'] = 'completed' if data.get('vod_serial', '') == '0' else 'ongoing'
        item['totalEpisodes'] = self.extract_number(data.get('vod_total', 0))
        item['currentEpisode'] = self.extract_number(data.get('vod_serial', 0))
        item['updateSchedule'] = data.get('vod_remarks', '')
        item['duration'] = self.extract_number(data.get('vod_duration', 0))
        item['spiderSource'] = self.cms_type
        item['spiderUrl'] = data.get('vod_play_url', '')
        
        # 解析播放源
        item['sources'] = self.parse_play_sources(data)
        
        return item
    
    def parse_play_sources(self, data):
        """解析播放源"""
        sources = []
        
        # 苹果CMS格式: url$$$url#name$url#name$$$...
        play_url = data.get('vod_play_url', '')
        play_from = data.get('vod_play_from', '')
        
        if not play_url:
            return sources
        
        # 分割不同源
        source_groups = play_url.split('$$$')
        source_names = play_from.split('$$$') if play_from else [f'源{i+1}' for i in range(len(source_groups))]
        
        for i, group in enumerate(source_groups):
            if not group.strip():
                continue
            
            episodes = []
            # 分割不同集
            ep_parts = group.split('#')
            
            for ep in ep_parts:
                if '$' in ep:
                    name, url = ep.split('$', 1)
                    episodes.append({
                        'name': name.strip(),
                        'url': url.strip()
                    })
            
            if episodes:
                sources.append({
                    'siteName': source_names[i] if i < len(source_names) else f'源{i+1}',
                    'siteUrl': '',
                    'playUrl': episodes[0]['url'] if episodes else '',
                    'quality': 'HD',
                    'episodeCount': len(episodes),
                    'episodes': episodes
                })
        
        return sources
    
    def map_type(self, type_id):
        """映射CMS类型到统一类型"""
        type_map = {
            1: 'movie',
            2: 'tv',
            3: 'variety',
            4: 'anime',
        }
        return type_map.get(type_id, 'movie')
