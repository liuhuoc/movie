#!/usr/bin/env python3
"""
爬虫运行脚本
支持运行单个爬虫或批量运行
"""

import sys
import os
import argparse
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from spider.spiders.douban import DoubanSpider
from spider.spiders.generic_cms import GenericCMSSpider


def run_douban(movie_type='movie', max_pages=5):
    """运行豆瓣爬虫"""
    process = CrawlerProcess(get_project_settings())
    process.crawl(DoubanSpider, movie_type=movie_type, max_pages=max_pages)
    process.start()


def run_cms(cms_url, cms_type='apple_cms', max_pages=10):
    """运行CMS爬虫"""
    process = CrawlerProcess(get_project_settings())
    process.crawl(GenericCMSSpider, cms_url=cms_url, cms_type=cms_type, max_pages=max_pages)
    process.start()


def run_all():
    """运行所有爬虫"""
    process = CrawlerProcess(get_project_settings())
    
    # 豆瓣电影
    process.crawl(DoubanSpider, movie_type='movie', max_pages=3)
    
    # 豆瓣电视剧
    process.crawl(DoubanSpider, movie_type='tv', max_pages=3)
    
    process.start()


def main():
    parser = argparse.ArgumentParser(description='影视爬虫运行工具')
    parser.add_argument('spider', choices=['douban', 'cms', 'all'], help='要运行的爬虫')
    parser.add_argument('--type', default='movie', help='影片类型 (movie/tv)')
    parser.add_argument('--cms-url', help='CMS站点URL')
    parser.add_argument('--cms-type', default='apple_cms', help='CMS类型')
    parser.add_argument('--pages', type=int, default=5, help='最大页数')
    
    args = parser.parse_args()
    
    if args.spider == 'douban':
        run_douban(args.type, args.pages)
    elif args.spider == 'cms':
        if not args.cms_url:
            print('错误: CMS爬虫需要提供 --cms-url 参数')
            sys.exit(1)
        run_cms(args.cms_url, args.cms_type, args.pages)
    elif args.spider == 'all':
        run_all()


if __name__ == '__main__':
    main()
