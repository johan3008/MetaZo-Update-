
import { generateBatchStockMetadata, apiKeyStorage } from './server/gemini.ts';
import { ToolType } from './types.ts';

const mockItems = [{ id: 'test-2', frames: ['data:image/jpeg;base64,...'] }];

async function run() {
  apiKeyStorage.run({ 
    provider: 'nvidia', 
    activeIndex: 0, 
    keys: [process.env.NVIDIA_API_KEY],
    gemini: { keys: [process.env.GEMINI_API_KEY] },
    nvidia: { keys: [process.env.NVIDIA_API_KEY] }
  }, async () => {
    try {
      console.log('Testing NVIDIA Batch Metadata');
      const res = await generateBatchStockMetadata(mockItems, 5, '', ToolType.IMAGE, 0.8, 'stepfun-ai/step-3.5-flash');
      console.log('Final Output:', JSON.stringify(res, null, 2));
    } catch (e) {
      console.error(e);
    }
  });
}
run();
