import { Inject, Injectable } from '@nestjs/common';
import { ChatId } from 'node-telegram-bot-api';
import { TelegramBot } from '../telegram-bot';
import { Handler } from './handler';
import { AiService } from '@/ai/services/ai.service';

@Injectable()
export class UserInputHandler implements Handler {
  @Inject(TelegramBot)
  private readonly bot: TelegramBot;

  @Inject(AiService)
  private readonly aiService: AiService;

  handler = async (data: {
    chatId: ChatId;
    telegramId: string;
    messageId: number;
    text: string;
    reply_to_message_id: number;
    firstName: string;
  }) => {
    try {
      // TODO: write logic for user input
      // {
      //   messageId: 5611,
      //   chatId: -1002103555207,
      //   telegramId: 5665860415,
      //   firstName: 'kiyoshi',
      //   text: 'acs',
      //   message_thread_id: 10,
      //   reply_to_message_id: 10
      // }
      const result = await this.aiService.handleStreamAPITool(
        {
          question: data.text,
          modelName: 'gpt-4o-mini',
          username: data.firstName,
        },
        (data: any) => {},
      );
      console.log(result);
      await this.bot.sendMessage(data.chatId, result);

      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };
}
