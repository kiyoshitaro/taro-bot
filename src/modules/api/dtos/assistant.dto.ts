import { EUserLanguage } from '@/shared/constants/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AssistantDTO {
  @ApiProperty({ required: true })
  question: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  thread_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(EUserLanguage)
  language?: EUserLanguage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  blog_id?: string;
}
