import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post, Response, UseGuards } from '@nestjs/common';
import { AiService } from '@/ai/services/ai.service';
import { CurrentUser } from '@/shared/decorators/user.decorator';
import { TJWTPayload } from '@/shared/types';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AssistantDTO } from '../dtos/assistant.dto';

@ApiTags('Assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly aiService: AiService) {}

  @Post('conversation')
  @ApiOperation({ summary: 'conversation assistant' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async chatBot(
    @CurrentUser() user: TJWTPayload,
    @Body() body: AssistantDTO,
    @Response() res: any,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const callback = (data: any = {}) => {
      // console.log('🚀 ~ AssistantController ~ callback ~ data:', data);
      res.write(`${JSON.stringify(data)}\n\n\n`);
    };
    const data = {
      question: body?.question,
      threadId: body?.thread_id,
      blogId: body?.blog_id,
      userId: user?.sub,
      language: body?.language,
      // modelName: 'gpt-3.5-turbo-0125',
      modelName: 'gpt-4o-mini',
    };

    await this.aiService.handleStreamAPITool(data, callback);
    res.end();
  }
}
