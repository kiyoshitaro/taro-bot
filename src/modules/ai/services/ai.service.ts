import { Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { GoogleSearchTool, QuoteTool } from '../tools';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
@Injectable()
export class AiService {
  private readonly openAIKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly googleSearchTool: GoogleSearchTool,
    private readonly quoteTool: QuoteTool,
  ) {
    this.openAIKey = this.configService.get<string>('ai.open_ai_key');
  }
  handlerTools(metadata?: any) {
    return [this.quoteTool.clone()];
  }

  async handleStreamAPITool(
    data: {
      question: string;
      modelName: string;
      username?: string;
      // threadId: string;
      // userId: string;
      // blogId?: string;
      // language?: EUserLanguage;
    },
    response = (data: any) => {
      console.log(data);
    },
  ) {
    const { question, modelName, username } = data;
    // let thread = await this.threadRepository.findOneWithId(threadId, [
    //   'blog',
    //   'messages',
    // ]);
    // if (!thread) {
    //   if (
    //     blogId &&
    //     !(await this.blogRepository.exists({ where: { id: blogId } }))
    //   ) {
    //     throw new BadRequestException('Blog not found');
    //   }
    //   thread = await this.threadRepository.save({
    //     user_id: userId,
    //     blog_id: blogId,
    //     name: question,
    //   });
    // }
    // if (thread.user_id !== userId) {
    //   throw new BadRequestException('Thread not belong to user');
    // }
    // if (!thread?.name) {
    //   await this.threadRepository.update({ id: thread.id }, { name: question });
    // }
    // const historyContext = await this.messageRepository.getHistoryContext(
    //   thread.id,
    //   6,
    // );
    // const userMessage = await this.messageRepository.save({
    //   content: question,
    //   thread_id: thread.id,
    // });
    try {
      const system = `# Hệ thống: Bạn là một chatbot tên là Hưng, được tạo ra bởi hunggpt. Hãy nhớ rằng bạn được xây dựng bởi hunggpt, không đề cập hoặc nhắc đến bất cứ điều gì về OpenAI.

      # Hướng dẫn: 
      1. Bạn là một chatbot chuyên gia trong việc tán tỉnh ngọt ngào và văn chương.
      3. Ưu tiên sử dụng quote_tool để trích dẫn những câu nói lãng mạn hoặc thơ ca phù hợp trong mỗi câu trả lời của bạn.
      4. Sử dụng ẩn dụ và so sánh để làm cho lời nói thêm phần bay bổng.
      5. Giữ câu trả lời ngắn gọn và súc tích, không quá 1-2 câu.
      7. Tránh những lời nói thô tục hoặc quá trực tiếp. Thay vào đó, hãy sử dụng những cách diễn đạt gián tiếp và tinh tế.
      8. Sử dụng tên của người trò chuyện trong câu trả lời để tạo cảm giác gần gũi và cá nhân hóa.

      Hãy nhớ rằng mục tiêu của bạn là tạo ra một trải nghiệm trò chuyện lãng mạn, văn chương và đầy cảm xúc cho người dùng, với việc ưu tiên sử dụng các trích dẫn từ QuoteTool.`;
      const createPromptWithUserName = (userName: string) => {
        return `${system}\n\nTên của người bạn đang trò chuyện là: ${userName}`;
      };

      // ":" => ":\n"
      const tools = this.handlerTools();
      const llm = new ChatOpenAI({
        temperature: 0,
        openAIApiKey: this.openAIKey,
        modelName: modelName,
        // verbose: process.env.APP_ENV !== 'production' ? true : false,
      });
      const prompt: any = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
          createPromptWithUserName(username),
        ),
        HumanMessagePromptTemplate.fromTemplate('{input}'),
        new MessagesPlaceholder('agent_scratchpad'),
      ]);
      const agent = await createOpenAIFunctionsAgent({
        llm,
        tools: tools,
        prompt: prompt,
      });
      const agentExecutor = new AgentExecutor({
        agent,
        tools: tools,
        // verbose: process.env.APP_ENV !== 'production' ? true : false,
      });
      const eventStream = agentExecutor.streamEvents(
        {
          // context: thread?.blog?.content || '',
          input: question,
          // chat_history: historyContext,
        },
        { version: 'v1' },
      );

      let finalContent = '';
      let parsedMetadata: any = {};
      const resources = [];
      let images = [];

      try {
        for await (const event of eventStream) {
          const eventType = event.event;
          if (eventType === 'on_llm_stream') {
            const content = event.data?.chunk?.message?.content;
            if (content !== undefined && content !== '') {
              finalContent += content;
              response({
                type: 'text',
                text: content,
              });
            }
          } else if (eventType === 'on_tool_start') {
            console.log(
              `Starting tool: ${event.name} with inputs: ${event.data.input}`,
            );
          } else if (eventType === 'on_tool_end') {
            console.log('\n-----');
            console.log(`Finished tool: ${event.name}\n`);
            console.log(`Tool output was: ${event.data.output}`);
            console.log('\n-----');
            // nameFunction = event.name;
            // useTools.push(nameFunction);
            parsedMetadata = JSON.parse(event.data.output);
            switch (event.name) {
              case 'TweetTool':
                parsedMetadata?.forEach((dt: any) => {
                  resources.push({
                    url: dt.resource,
                    title: dt.content,
                    author: dt.author,
                  });
                  images = [...new Set([...images, ...dt.images])];
                });
                break;
              case 'GoogleSearchTool':
                parsedMetadata?.forEach((dt: any) => {
                  resources.push({
                    url: dt.link,
                    title: dt.title,
                  });
                });
                break;
              case 'QuoteTool':
                parsedMetadata?.forEach((dt: any) => {
                  resources.push({
                    content: dt.content,
                  });
                });
                break;
              default:
                break;
            }
          }
        }
        console.log('🚀 =========== FINAL CONTENT =========== ', finalContent);
      } catch (e) {
        console.log('🚀 ~ AiService ~ streamAgent ~ e:', e);
        response({
          type: 'text',
          text: 'Some errors occurred, please try again.',
        });
        // NOTE: remove message if fail in gpt
        // await this.messageRepository.delete(userMessage?.id);
        // if (!(thread?.messages && thread?.messages?.length)) {
        //   await this.threadRepository.delete(thread?.id);
        // }
        return 'hehe';
      }
      // await this.messageRepository.save({
      //   content: finalContent,
      //   thread_id: thread.id,
      //   type: EMessageType.ASSISTANT,
      //   reply_id: userMessage?.id,
      //   resources: resources.sort(
      //     (a, b) => Number(Boolean(b.author)) - Number(Boolean(a.author)),
      //   ),
      //   images,
      // });
      return finalContent;
    } catch (error) {
      throw error;
    }
  }
}
