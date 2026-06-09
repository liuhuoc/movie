import scrapy
import re
from urllib.parse import urljoin

class BaseMovieSpider(scrapy.Spider):
    """影视爬虫基类"""
    
    custom_settings = {
        'DOWNLOAD_DELAY': 2,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 2,
    }
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.max_pages = kwargs.get('max_pages', 10)
    
    def extract_text(self, selector, xpath, default=''):
        """安全提取文本"""
        try:
            text = selector.xpath(xpath).get(default)
            return self.clean_text(text)
        except:
            return default
    
    def extract_list(self, selector, xpath):
        """提取列表"""
        try:
            texts = selector.xpath(xpath).getall()
            return [self.clean_text(t) for t in texts if self.clean_text(t)]
        except:
            return []
    
    def clean_text(self, text):
        """清理文本"""
        if not text:
            return ''
        return re.sub(r'\s+', ' ', text).strip()
    
    def extract_year(self, text):
        """提取年份"""
        match = re.search(r'(19|20)\d{2}', text)
        return int(match.group()) if match else None
    
    def extract_number(self, text):
        """提取数字"""
        match = re.search(r'\d+', str(text))
        return int(match.group()) if match else 0
    
    def absolute_url(self, base_url, url):
        """转换为绝对URL"""
        if not url:
            return ''
        if url.startswith('http'):
            return url
        return urljoin(base_url, url)
