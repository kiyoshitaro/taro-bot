import { Inject, Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import { QuoteRepository } from '@/vectorstore-db/repositories/quote.repository';

@Injectable()
export class QuoteTool extends BaseTool {
  @Inject(QuoteRepository)
  private readonly quoteRepository: QuoteRepository;

  public clone(config?: any): this {
    return super.clone(config);
  }
  // schema = z.object({}) as any;

  name = 'quote_tool';
  description = `Công cụ quote_tool. Hữu ích khi bạn cần trả lời câu hỏi bằng các trích dẫn. Đầu vào nên là một câu truy vấn tìm kiếm. Đầu ra là một mảng JSON chứa các kết quả.`;
  instruction = '';
  constructor() {
    super();
  }

  async _call(input: any) {
    const results = await this.getQuoteInfo(input);
    return JSON.stringify(results);
  }
  async getQuoteInfo(
    input: string,
    take: number = 2,
  ): Promise<{ content: string }[]> {
    try {
      const t = await this.quoteRepository.queryOrmVector(input, take, true);
      return t.map((quote) => ({ content: quote.pageContent }));
    } catch (error) {
      console.log('🚀 ~ AiService ~ getQuoteInfo ~ error:', error);
      return [];
    }
  }
}
