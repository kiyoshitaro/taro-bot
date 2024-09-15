import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OpenAIEmbeddings } from '@langchain/openai';
import { configMilvus } from './configs/milvus';
import { QuoteMilvusRepository } from './repositories/quote-milvus.repository';
import { VectorStoreModule } from '@/vectorstore-db/vector-store.module';
import { QuoteRepository } from '@/vectorstore-db/repositories/quote.repository';
import { DataType, MilvusClient } from '@zilliz/milvus2-sdk-node';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configMilvus],
    }),
    VectorStoreModule,
  ],
  controllers: [],
  providers: [
    {
      provide: 'TEXT_EMBEDDING_3_LARGE',
      useFactory: async (config: ConfigService) => {
        try {
          return new OpenAIEmbeddings({
            modelName: 'text-embedding-3-large',
            openAIApiKey: config.get<string>('langchain.open_ai_key'),
          });
        } catch (e) {
          console.log('TEXT_EMBEDDING_3_LARGE');
          console.error(e);
          throw e;
        }
      },
      inject: [ConfigService],
    },
    QuoteMilvusRepository,
  ],
  exports: ['TEXT_EMBEDDING_3_LARGE', QuoteMilvusRepository],
})
export class MilvusModule implements OnApplicationBootstrap {
  constructor(
    @Inject('TEXT_EMBEDDING_3_LARGE')
    public embeddingModel: OpenAIEmbeddings,
    public quoteMilvusRepository: QuoteMilvusRepository,
    public quoteRepository: QuoteRepository,
  ) {}
  migrateFromPgToMilvus = async () => {
    const batchSize = 100;
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const quotes = await this.quoteRepository.find({
        take: batchSize,
        skip: skip,
      });
      if (quotes.length === 0) {
        hasMore = false;
        break;
      }
      const vectors = quotes.map((quote) => JSON.parse(quote.embedding));
      const documents = quotes.map((quote) => ({
        pageContent: quote.pageContent,
        metadata: {}, // Add metadata if needed
      }));
      await this.quoteMilvusRepository.addVectors(vectors, documents);
      console.log(`Added batch of ${quotes.length} quotes to Milvus`);
      skip += batchSize;
    }
    console.log('Finished adding all quotes to Milvus');
  };

  async onApplicationBootstrap() {
    // await this.migrateFromPgToMilvus();
    await this.quoteMilvusRepository.exportData();
    // const client = new MilvusClient({
    //   address: 'localhost:19530',
    // });
    // const vector = await this.embeddingModel.embedQuery('Mục đích chiến đấu');
    // const searchResp = await client.search({
    //   collection_name: 'quotes',
    //   search_params: {
    //     anns_field: 'embedding',
    //     topk: 2,
    //     metric_type: 'L2',
    //     params: JSON.stringify({ ef: 64 }),
    //   },
    //   // output_fields: ['pageContent'],
    //   // vector_type: DataType.FloatVector,
    //   vectors: [vector],
    // });
    // console.log(searchResp.status, searchResp.results);

    // console.log(
    //   '🚀 ~ MilvusModule ~ onApplicationBootstrap ~ quotes:',
    //   JSON.parse(quotes.embedding).length,
    // );
    // const t = await this.quoteMilvusRepository.queryOrmVector(
    //   'Mục đích chiến đấu',
    //   2,
    // );
    // console.log('🚀 ~ MilvusModule ~ onApplicationBootstrap ~ t:', t);
  }
}
