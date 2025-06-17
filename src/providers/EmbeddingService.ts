import { pipeline, Pipeline, FeatureExtractionPipeline } from '@xenova/transformers';

export class EmbeddingService {
    private static model: Promise<FeatureExtractionPipeline> | null = null;
    
    private static async getModel(): Promise<FeatureExtractionPipeline> {
        if (!this.model) {
            this.model = pipeline(
                'feature-extraction', 
                'Xenova/all-MiniLM-L6-v2',
                {
                    quantized: true,
                    progress_callback: (data: any) => {
                        console.log(`Download progress: ${data.progress * 100}%`);
                    }
                }
            ) as Promise<FeatureExtractionPipeline>;
        }
        return this.model!; // 非空断言，因为model初始化后不会为null
    }

    public static async getEmbedding(text: string): Promise<number[]> {
        if (!text.trim()) {
            throw new Error('Input text cannot be empty');
        }

        const extractor = await this.getModel();
        try {
            const output = await extractor(text, { 
                pooling: 'mean',
                normalize: true
            });
            return Array.from(output.data);
        } catch (error) {
            console.error('Embedding generation failed:', error);
            throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}