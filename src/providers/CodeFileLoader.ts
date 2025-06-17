import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeChunk } from '../types';
import { EmbeddingService } from './EmbeddingService';

export class CodeFileLoader implements CodeFileLoader {
  async loadFiles(filePaths: string[]): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    
    for (const filePath of filePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const embedding = await EmbeddingService.getEmbedding(content);
        
        chunks.push({
          filePath,
          content,
          embedding
        });
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    return chunks;
  }
}