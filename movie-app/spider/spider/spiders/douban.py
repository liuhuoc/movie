import scrapy
from urllib.parse import urljoin
from ..items import MovieItem
from .base import BaseMovieSpider


class DoubanSpider(BaseMovieSpider):
    """豆瓣电影爬虫 - 用于获取影片元数据"""
    
    name = 'douban'
    allowed_domains = ['movie.douban.com']
    
    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
    }
    
    def __init__(self, movie_type='movie', **kwargs):
        super().__init__(**kwargs)
        self.movie_type = movie_type
        self.start_urls = [
            f'https://movie.douban.com/j/new_search_subjects?sort=U&range=0,10&tags={movie_type}&start=0',
        ]
    
    def parse(self, response):
        """解析影片列表"""
        import json
        data = json.loads(response.text)
        
        for subject in data.get('data', []):
            item = MovieItem()
            item['title'] = subject.get('title', '')
            item['cover'] = subject.get('cover', '')
            item['rating'] = float(subject.get('rate', 0)) if subject.get('rate') else 0
            item['spiderSource'] = 'douban'
            item['spiderUrl'] = subject.get('url', '')
            
            # 请求详情页
            if item['spiderUrl']:
                yield scrapy.Request(
                    item['spiderUrl'],
                    callback=self.parse_detail,
                    meta={'item': item}
                )
    
    def parse_detail(self, response):
        """解析影片详情"""
        item = response.meta['item']
        
        # 基本信息
        info_text = response.xpath('//div[@id="info"]').get('')
        
        # 导演
        item['director'] = response.xpath('//a[@rel="v:directedBy"]/text()').getall()
        
        # 演员
        item['actor'] = response.xpath('//a[@rel="v:starring"]/text()').getall()
        
        # 类型
        item['category'] = response.xpath('//span[@property="v:genre"]/text()').getall()
        
        # 年份
        year_text = response.xpath('//span[@class="year"]/text()').get('')
        item['year'] = self.extract_year(year_text)
        
        # 描述
        desc = response.xpath('//span[@property="v:summary"]/text()').get('')
        item['description'] = self.clean_text(desc)
        
        # 时长
        duration = response.xpath('//span[@property="v:runtime"]/text()').get('')
        item['duration'] = self.extract_number(duration)
        
        yield item
