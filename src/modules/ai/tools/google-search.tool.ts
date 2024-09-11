import { Injectable } from '@nestjs/common';
import { BaseTool } from './base.tool';
import * as z from 'zod';

@Injectable()
export class GoogleSearchTool extends BaseTool {
  public clone(config?: any): this {
    return super.clone(config);
  }
  // schema = z.object({}) as any;

  private readonly googleApiKey: string;
  private readonly googleCSEId: string;
  name = 'google_search_tool';
  description = `A custom search engine. useful for when you need to answer questions about current events. input should be a search query. outputs a JSON array of results.`;
  instruction = '';
  constructor() {
    super();
    this.googleApiKey =
      process.env.GOOGLE_SEARCH_API_KEY;
    this.googleCSEId = process.env.GOOGLE_SEARCH_CSEID;
  }

  async _call(input: any) {
    const results = await getGoogleInfo(input, 3);
    return JSON.stringify(results);
  }
}

export async function getGoogleInfo(
  input: string,
  take: number = 10,
): Promise<{ title: string; link: string; snippet: string }[]> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${
        process.env.GOOGLE_SEARCH_API_KEY
      }&cx=${process.env.GOOGLE_SEARCH_CSEID || '63599782adb0747e7'}&q=${encodeURIComponent(input)}`,
    );
    if (!res.ok) {
      throw new Error(
        `Got ${res.status} error from Google custom search: ${res.statusText}`,
      );
    }
    const json = await res.json();
    const results =
      json?.items?.map((item, idx) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        link_number: idx + 1,
        // images: item?.cse_image?.map((dt) => dt?.src).filter((dt) => dt) ,
      })) ?? [];
    return results.slice(0, take);
  } catch (error) {
    console.log('🚀 ~ AiService ~ getGoogleInfo ~ error:', error);
    return [];
  }
}
