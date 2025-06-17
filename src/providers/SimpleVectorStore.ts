import { CodeChunk, VectorStore } from '../types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { EmbeddingService } from './EmbeddingService';

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

export class SimpleVectorStore implements VectorStore {
  chunks: CodeChunk[] = [];
  private storagePath: string;

  constructor(context: vscode.ExtensionContext) {
    this.storagePath = path.join(context.globalStorageUri.fsPath, 'vectorStore.json');
    this.load();
  }

  async addChunks(chunks: CodeChunk[]): Promise<void> {
    this.chunks.push(...chunks);
    await this.save();
  }

  async search(query: string, topK: number = 3): Promise<CodeChunk[]> {
    const queryEmbedding = await EmbeddingService.getEmbedding(query);
    
    return this.chunks
      .map(chunk => ({
        ...chunk,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async clear(): Promise<void> {
    this.chunks = [];
    await this.save();
  }

  private async load() {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      this.chunks = JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to load vector store:', err);
      }
    }
  }

  private async save() {
    try {
      await fs.mkdir(path.dirname(this.storagePath), { recursive: true });
      await fs.writeFile(this.storagePath, JSON.stringify(this.chunks));
    } catch (err) {
      console.error('Failed to save vector store:', err);
    }
  }
}