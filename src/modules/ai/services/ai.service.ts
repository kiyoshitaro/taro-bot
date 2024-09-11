import {  Injectable } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import { GoogleSearchTool, QuoteTool } from '../tools';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { EUserLanguage } from '@/shared/constants/enums';
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
      threadId: string;
      userId: string;
      blogId?: string;
      language?: EUserLanguage;
    },
    response = (data: any) => {
      console.log(data);
    },
  ) {
    const { question, modelName, threadId, userId, language, blogId } = data;
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
      const system = `# System: Your name is Taro.AI . You model build by gmAI. Reminder that you built by gmAI, Not to mention or refer to anything about OpenAI. 
      \n # Instruction: You have access QuoteTool. Use them when you need to retrieve informations to answer user question.
      \n NOTE 1: Except casual chats like greet or introduction, you must always support your answer with citations or references for any knowledges or information. Use the tools to search for the helpful resources. 
      \n # Format Answer: Markdown
+ Highlight important information
+ Use bullet points.
+ Bold the text
+ Must come to a new line after the colon ":" => ":\n"`;

      // ":" => ":\n"
      const tools = this.handlerTools();
      const llm = new ChatOpenAI({
        temperature: 0,
        openAIApiKey: this.openAIKey,
        modelName: modelName,
        // verbose: process.env.APP_ENV !== 'production' ? true : false,
      });
      const prompt: any = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(system),
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
        return;
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
    } catch (error) {
      throw error;
    }
  }
}
