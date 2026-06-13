import { generateBatchStockMetadata, apiKeyStorage } from './server/gemini.ts';
import { ToolType } from './types.ts';

const mockItems = [{ id: 'test-1', frames: ['data:image/jpeg;base64,...'] }];

async function run() {
  apiKeyStorage.run({ provider: 'nvidia', activeIndex: 0, nvidia: { keys: [process.env.NVIDIA_API_KEY] } }, async () => {
    try {
      console.log('Testing NVIDIA Batch Metadata');
      const res = await generateBatchStockMetadata(mockItems, 5, '', ToolType.IMAGE, 0.8, 'stepfun-ai/step-3.5-flash');
      console.log('Final Output:', res);
    } catch (e) {
      console.error(e);
    }
  });
}
run();