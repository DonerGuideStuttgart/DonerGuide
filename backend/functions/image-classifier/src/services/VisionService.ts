import axios from 'axios';

export interface VisionAnalysisResult {
    category: 'food' | 'place' | 'discard';
    confidence: number;
}

export class VisionService {
    private endpoint: string;
    private key: string;
    private isMockMode: boolean;

    constructor() {
        this.endpoint = process.env.IMAGE_CLASSIFIER_VISION_ENDPOINT || '';
        this.key = process.env.IMAGE_CLASSIFIER_VISION_KEY || '';
        this.isMockMode = !this.key;

        if (this.isMockMode) {
            console.warn('VisionService: No API key found. Running in MOCK mode.');
        } else {
            // Ensure endpoint doesn't have a trailing slash and ends with the analyze path
            if (!this.endpoint.endsWith('/analyze')) {
                this.endpoint = this.endpoint.replace(/\/$/, '') + '/vision/v3.2/analyze';
            }
        }
    }

    /**
     * Analyzes an image using Azure AI Vision v3.2.
     * @param buffer The image data.
     * @returns The classification result and confidence.
     */
    public async analyzeImage(buffer: Buffer): Promise<VisionAnalysisResult> {
        if (this.isMockMode) {
            return this.getMockAnalysis();
        }

        try {
            const response = await axios.post(
                this.endpoint,
                buffer,
                {
                    params: {
                        visualFeatures: 'Categories'
                    },
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.key,
                        'Content-Type': 'application/octet-stream'
                    }
                }
            );

            const categories = response.data.categories || [];
            return this.mapCategoriesToResult(categories);
        } catch (error: any) {
            console.error('VisionService: Analysis failed:', error.response?.data || error.message);
            throw new Error(`Vision analysis failed: ${error.message}`);
        }
    }

    private mapCategoriesToResult(categories: any[]): VisionAnalysisResult {
        if (!categories || categories.length === 0) {
            return { category: 'discard', confidence: 0 };
        }

        // Sort by confidence to get the best match
        const sorted = categories.sort((a: any, b: any) => b.score - a.score);
        
        for (const cat of sorted) {
            const name = cat.name.toLowerCase();
            const confidence = cat.score;

            if (name.startsWith('food_')) {
                return { category: 'food', confidence };
            }

            if (name.startsWith('building_') || name.startsWith('indoor_') || name.startsWith('outdoor_')) {
                return { category: 'place', confidence };
            }
        }

        return { category: 'discard', confidence: 0 };
    }

    private getMockAnalysis(): VisionAnalysisResult {
        // Simple mock logic: alternate between food, place, and discard
        const random = Math.random();
        if (random > 0.6) {
            return { category: 'food', confidence: 0.95 };
        } else if (random > 0.2) {
            return { category: 'place', confidence: 0.85 };
        } else {
            return { category: 'discard', confidence: 0.5 };
        }
    }
}
