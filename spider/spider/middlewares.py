import random
from fake_useragent import UserAgent

class UserAgentMiddleware:
    def __init__(self):
        self.ua = UserAgent(fallback='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    def process_request(self, request, spider):
        request.headers['User-Agent'] = self.ua.random
        return None

class ProxyMiddleware:
    def process_request(self, request, spider):
        # 如果有代理池，可以在这里设置
        # request.meta['proxy'] = 'http://proxy:port'
        return None
