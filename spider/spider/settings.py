import os
from dotenv import load_dotenv

load_dotenv()

BOT_NAME = 'movie_spider'

SPIDER_MODULES = ['spider.spiders']
NEWSPIDER_MODULE = 'spider.spiders'

# 遵守robots.txt规则
ROBOTSTXT_OBEY = False

# 并发配置
CONCURRENT_REQUESTS = 8
CONCURRENT_REQUESTS_PER_DOMAIN = 4
DOWNLOAD_DELAY = 1
RANDOMIZE_DOWNLOAD_DELAY = 0.5

# 请求头
DEFAULT_REQUEST_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

# 中间件
DOWNLOADER_MIDDLEWARES = {
    'spider.middlewares.UserAgentMiddleware': 543,
    'spider.middlewares.ProxyMiddleware': 544,
}

# 管道
ITEM_PIPELINES = {
    'spider.pipelines.MongoPipeline': 300,
}

# 自动限速
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 1
AUTOTHROTTLE_MAX_DELAY = 10
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0

# 重试
RETRY_ENABLED = True
RETRY_TIMES = 3
RETRY_HTTP_CODES = [500, 502, 503, 504, 408, 429]

# 超时
DOWNLOAD_TIMEOUT = 30

# 编码
FEED_EXPORT_ENCODING = 'utf-8'

# MongoDB配置
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
MONGO_DB = os.getenv('MONGO_DB', 'movie_app')

# Redis配置
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# 日志
LOG_LEVEL = 'INFO'
