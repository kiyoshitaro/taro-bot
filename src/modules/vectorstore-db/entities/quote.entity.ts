import { Entity, Column, PrimaryGeneratedColumn, EntitySchema } from 'typeorm';

@Entity('quotes')
export class QuoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  pageContent?: string;

  @Column()
  embedding: string;
}
