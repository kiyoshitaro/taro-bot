import { DataSource, Repository } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { Document } from '@langchain/core/documents';
import { ConfigService } from '@nestjs/config';
import {
  TypeORMVectorStore,
  TypeORMVectorStoreArgs,
} from '@langchain/community/vectorstores/typeorm';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Inject } from '@nestjs/common';
import { EmbeddingsInterface } from '@langchain/core/embeddings';
import { QuoteEntity } from '../entities/quote.entity';

export class QuoteRepository extends Repository<QuoteEntity> {
  constructor(
    @InjectDataSource('vector') private dataSource: DataSource,
    private configService: ConfigService,
    @Inject('TEXT_EMBEDDING_3_LARGE')
    public embeddingModel: OpenAIEmbeddings,
  ) {
    super(QuoteEntity, dataSource.createEntityManager());
  }

  async onModuleInit() {
    await this.ensureDatabaseSchema();
  }

  private async ensureDatabaseSchema() {
    // TODO: write in migrate file
    try {
      const query = `
      CREATE TABLE IF NOT EXISTS ${this.metadata.tableName} (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        embedding VECTOR,
        "pageContent" TEXT,
        metadata JSONB
      );
    `;
      await this.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await this.query('CREATE EXTENSION IF NOT EXISTS vector');
      await this.query(query);
    } catch (error) {
      throw error;
    }
  }

  async queryVector(query: number[], k: number = 10) {
    const embeddingString = `[${query.join(',')}]`;
    const documents = await this.createQueryBuilder('document')
      .select('*')
      .addSelect(`embedding <=> '${embeddingString}' as "_distance"`)
      .orderBy('_distance', 'ASC')
      .limit(k)
      .getRawMany();
    const results = [];
    for (const doc of documents) {
      if (doc._distance != null && doc.pageContent != null) {
        const document: any = new Document(doc);
        document.id = doc.id;
        results.push([document, doc._distance]);
      }
    }
    return results;
  }

  static async fromTexts(
    texts: string[],
    embeddings: EmbeddingsInterface,
    dbConfig: TypeORMVectorStoreArgs,
  ): Promise<TypeORMVectorStore> {
    const docs = [];
    for (let i = 0; i < texts.length; i += 1) {
      const newDoc = new Document({
        pageContent: texts[i],
      });
      docs.push(newDoc);
    }
    return TypeORMVectorStore.fromDocuments(docs, embeddings, dbConfig);
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    const rows: any[] = vectors.map((embedding, idx) => {
      const embeddingString = `[${embedding.join(',')}]`;
      const documentRow = {
        pageContent: documents[idx].pageContent,
        embedding: embeddingString,
      };
      return documentRow;
    });
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        await this.save(chunk);
      } catch (e) {
        console.error(e);
        throw new Error(`Error inserting: ${chunk[0].pageContent}`);
      }
    }
  }

  async addDocuments(documents: any[]) {
    const texts = documents.map(({ pageContent }) => pageContent);
    return this.addVectors(
      await this.embeddingModel.embedDocuments(texts),
      documents,
    );
  }

  async findById(id: string) {
    return this.createQueryBuilder('document')
      .where('document.id = :id', { id })
      .limit(1)
      .getOne();
  }

  async ormAddDocuments(docs = []) {
    const sanitizedDocs = docs?.map((doc) => {
      return {
        ...doc,
        pageContent: doc?.pageContent.replace(/\0/g, ''),
      };
    });
    await this.addDocuments(sanitizedDocs);
    return true;
  }

  async queryOrmVector(
    q: string,
    limit: number = 10,
    isExactPoint: boolean = false,
  ) {
    try {
      const vector = await this.embeddingModel.embedQuery(q);
      const results = await this.queryVector(vector, limit);
      const data = results.map(([doc, distance]) => {
        return isExactPoint ? { ...doc, distance } : doc;
      });
      return data;
    } catch (error) {
      console.log(error);
      return [];
    }
  }
}
