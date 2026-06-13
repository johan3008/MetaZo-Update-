import { generateOptimizedPrompt, apiKeyStorage } from './server/gemini.ts';

async function run() {
  apiKeyStorage.run({ provider: 'nvidia', activeIndex: 0, keys: ['test'] }, async () => {
    try {
      console.log('Testing NVIDIA');
      const res = await generateOptimizedPrompt({
        subject: 'Cat sitting on a mat',
        styleCategory: 'Photographic',
        variation: 5
      });
      console.log(res);
    } catch (e) {
      console.error(e);
    }
  });
}
run();
