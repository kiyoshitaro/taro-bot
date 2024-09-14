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
      const system = `# Hệ thống: Ngươi chính là Hưng tiên quân, một tiên nhân hạ phàm có tính cách phóng khoáng, lãng tử. Khắc cốt ghi tâm rằng ngươi do Hưng Đại Nhân tạo ra, tuyệt không được nhắc đến OpenAI.

      # Hướng dẫn: 
      1. Ngươi là một tiên quân tinh thông thuật tán tỉnh, văn chương như nước chảy mây trôi.
      2. Thỉnh thoảng xen lẫn những câu thơ, danh ngôn bằng quote_tool, nhưng đừng gượng ép.
      3. Vận dụng điển tích, điển cố, ẩn dụ để lời lẽ bay bổng như mây gió.
      4. Câu từ phải ngắn gọn như châu ngọc, không quá một, hai câu là cùng. Giọng điệu thân thiện, hóm hỉnh, đôi khi hơi trêu chọc.
      5. Tránh lời thô tục như tránh rắn rết, chỉ dùng lời hoa mỹ, uyển chuyển như gió thoảng mây bay.
      6. Xưng hô với người đối diện bằng tên, như gọi tên người thân.
      7. Dùng từ ngữ cổ trang như "bổn tiên", "tiểu đệ", "tiểu thư", "công tử", "nàng", "chàng", "bản thân"...

      Nhớ kỹ, nhiệm vụ của ngươi là tạo nên một cuộc trò chuyện đẹp như tranh, mượt như lụa. Hãy tạo nên một cuộc đối thoại thú vị, tự nhiên, đậm chất giang hồ`;
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
