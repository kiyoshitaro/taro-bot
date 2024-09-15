import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@/database';
import { configAI } from './configs/ai';
import { AiService } from './services/ai.service';
import { GoogleSearchTool, QuoteTool } from './tools';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { TChatModel, TTextEmbedding } from './ai.types';
import { VectorStoreModule } from '@/vectorstore-db/vector-store.module';
import { MilvusModule } from '@/milvus-db/milvus.module';

const tools = [GoogleSearchTool, QuoteTool];

@Module({
  imports: [
    DatabaseModule,
    VectorStoreModule,
    MilvusModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configAI],
    }),
  ],
  controllers: [],
  // @ts-ignore
  providers: [
    AiService,
    ...tools,
    {
      provide: 'CHAT_OPENAI',
      useFactory: async (config: ConfigService) => {
        const openAIApiKey = config.get<string>('ai.open_ai_key');
        const chatModels: TChatModel = {
          'gpt-3.5-turbo': new ChatOpenAI({
            openAIApiKey,
            modelName: 'gpt-3.5-turbo',
            temperature: 0.7,
          }),
          'gpt-4': new ChatOpenAI({
            openAIApiKey,
            modelName: 'gpt-4',
            temperature: 0.7,
          }),
          'gpt-4-turbo': new ChatOpenAI({
            openAIApiKey,
            modelName: 'gpt-4-turbo',
            temperature: 0.7,
          }),
          'gpt-4o': new ChatOpenAI({
            openAIApiKey,
            modelName: 'gpt-4o',
            temperature: 0.7,
          }),
          'gpt-4o-mini': new ChatOpenAI({
            openAIApiKey,
            modelName: 'gpt-4o-mini',
            temperature: 0.7,
          }),
        };
        return chatModels;
      },
      inject: [ConfigService],
    },
    {
      provide: 'TEXT_EMBEDDING',
      useFactory: async (config: ConfigService) => {
        const openAIApiKey = config.get<string>('ai.open_ai_key');
        const textEmbeddings: TTextEmbedding = {
          'text-embedding-3-small': new OpenAIEmbeddings({
            openAIApiKey,
            modelName: 'text-embedding-3-small',
          }),
          'text-embedding-3-large': new OpenAIEmbeddings({
            openAIApiKey,
            modelName: 'text-embedding-3-large',
          }),
        };
        return textEmbeddings;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AiService, ...tools, 'TEXT_EMBEDDING', 'CHAT_OPENAI'],
})
export class AiModule implements OnApplicationBootstrap {
  constructor(private aiService: AiService) {}

  async onApplicationBootstrap() {
    // const t = await this.aiService.getGoogleInfo('what is bitcoin');
    // console.log('🚀 ~ AiModule ~ onApplicationBootstrap ~ t:', t);
  }
}
