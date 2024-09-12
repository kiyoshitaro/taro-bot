import TelegramBotApi, {
  ChatId,
  SendMessageOptions,
} from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { parserMessageTelegram } from './utils';
import { COMMAND_KEYS } from './constants/command-keys';
import { Handler } from './handlers';

@Injectable()
export class TelegramBot {
  public bot: TelegramBotApi;

  public handlers: Record<string, Handler>;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('telegram.token');
    const isBot = Boolean(Number(process.env.IS_BOT || 0));
    if (isBot) {
      this.bot = new TelegramBotApi(token, {
        polling: true,
        request: {
          url: '',
          agentOptions: {
            keepAlive: true,
            family: 4,
          },
        },
      });
    } else {
      this.bot = new TelegramBotApi(token, { polling: false });
    }
    this.bot.on('polling_error', (msg) => console.log(msg));
  }

  async deleteMessage(chatId: ChatId, messageId: number, seconds = 0) {
    const timeout = setTimeout(async () => {
      try {
        await this.bot.deleteMessage(chatId, messageId);
      } catch (error) {
        console.log('🚀 ~ TelegramBot ~ timeout ~ error:', error);
      }
      clearTimeout(timeout);
    }, seconds * 1000);
  }

  async sendMessage(
    chatId: ChatId,
    text: string,
    options?: SendMessageOptions,
  ) {
    try {
      return this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      console.log('🚀 ~ file: telegram-bot.ts:89 ~ error:', error);
    }
  }

  setupStartCommand(callback: any) {
    this.bot.onText(/\/start/, (msg) => {
      callback(parserMessageTelegram(msg));
    });
  }

  userReply(callback: any) {
    this.bot.on('message', (msg) => {
      callback(parserMessageTelegram(msg));
    });
  }

  registerHandlers(handlers: Record<string, Handler>) {
    this.handlers = handlers;
  }

  async start() {
    const userInputHandler = this.handlers[COMMAND_KEYS.USER_INPUT];
    if (userInputHandler) {
      this.userReply(this.handlers[COMMAND_KEYS.USER_INPUT].handler);
    }
  }
}
