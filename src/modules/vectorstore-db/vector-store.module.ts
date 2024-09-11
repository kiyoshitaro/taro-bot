import { Inject, Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@/database';
import { configLangchain } from './configs/langchain';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OpenAIEmbeddings } from '@langchain/openai';
import { QuoteEntity } from './entities/quote.entity';
import { QuoteRepository } from './repositories/quote.repository';
// import { QuoteRepository as QuoteDBRepository } from '@/database/repositories/quote.repository';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forRootAsync({
      name: 'vector',
      useFactory: (config: ConfigService) => config.get('langchain.db'),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([QuoteEntity], 'vector'),
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configLangchain],
    }),
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
    QuoteRepository
  ],
  exports: [
    QuoteRepository,
    'TEXT_EMBEDDING_3_LARGE',
  ],
})
export class VectorStoreModule implements OnApplicationBootstrap {
  constructor(
    @Inject('TEXT_EMBEDDING_3_LARGE')
    public embeddingModel: OpenAIEmbeddings,
    private quoteRepository: QuoteRepository,
    // private quoteDBRepository: QuoteDBRepository,
  ) { }
  async onApplicationBootstrap() {
    const t = await this.quoteRepository.queryOrmVector('Mục đích chiến đấu', 2, true);
    console.log(t)
    // const quotes = await this.quoteDBRepository.find({select: ['id','content']});
    // console.log(quotes)
    // const batchSize = 50; // Adjust this value based on your needs
    // for (let i = 44 * batchSize; i < quotes.length; i += batchSize) {
    //   const batch = quotes.slice(i, i + batchSize);
    //   // await this.quoteRepository.ormAddDocuments(batch.map((quote) => ({
    //   //   pageContent: quote?.content
    //   // })));
    //   console.log(`Processed batch ${i / batchSize + 1}: ${batch.length} quotes`);
    // }
  }
}
