import { Entity, Column } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('quotes')
export class QuoteEntity extends BaseEntity {
  @Column({ nullable: true })
  author?: string;

  @Column({ nullable: true })
  content?: string;

  @Column('simple-json', { nullable: true })
  tags?: string[];

  @Column('simple-json', { nullable: true })
  comments?: string[];

  @Column({ nullable: true })
  likes: number;
}
