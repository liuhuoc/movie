import pymongo
from itemadapter import ItemAdapter

class MongoPipeline:
    def __init__(self, mongo_uri, mongo_db):
        self.mongo_uri = mongo_uri
        self.mongo_db = mongo_db
    
    @classmethod
    def from_crawler(cls, crawler):
        return cls(
            mongo_uri=crawler.settings.get('MONGO_URI'),
            mongo_db=crawler.settings.get('MONGO_DB')
        )
    
    def open_spider(self, spider):
        self.client = pymongo.MongoClient(self.mongo_uri)
        self.db = self.client[self.mongo_db]
        # 创建索引
        self.db.movies.create_index('title')
        self.db.movies.create_index([('title', 'text'), ('alias', 'text')])
        self.db.movies.create_index('spiderSource')
    
    def close_spider(self, spider):
        self.client.close()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # 使用upsert更新或插入
        self.db.movies.update_one(
            {
                'title': adapter.get('title'),
                'spiderSource': adapter.get('spiderSource')
            },
            {
                '$set': dict(adapter),
                '$setOnInsert': {'createdAt': __import__('datetime').datetime.now()}
            },
            upsert=True
        )
        
        spider.logger.info(f"已保存影片: {adapter.get('title')}")
        return item
