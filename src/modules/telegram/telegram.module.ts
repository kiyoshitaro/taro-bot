import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { TelegramBot } from './telegram-bot';
import { HandlerService } from './services/handler.service';
import { ComingSoonHandler, UserInputHandler } from './handlers';
import { configTelegram } from './config/telegram';
import { AiModule } from '@/ai/ai.module';

const handlers = [ComingSoonHandler, UserInputHandler, HandlerService];
@Module({
  imports: [
    DatabaseModule,
    AiModule,
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: [configTelegram],
    }),
  ],
  controllers: [],
  providers: [...handlers, TelegramBot],
  exports: [],
})
export class TelegramModule implements OnApplicationBootstrap {
  constructor(
    private telegramBot: TelegramBot,
    private handlerService: HandlerService,
  ) {}

  async onApplicationBootstrap() {
    const handlers = this.handlerService.getHandlers();
    this.telegramBot.registerHandlers(handlers);
    await this.telegramBot.start();
  }
}
