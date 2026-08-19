const fs = require('fs');
let code = fs.readFileSync('server/gemini.ts', 'utf8');

code = code.replace(
`        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
           // Reuse the validation/padding logic by breaking out and returning
           return processPromptResults(parsed, count, subject, userNegativePrompt);
        }
      } catch (err: any) {`,
`        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
           // Reuse the validation/padding logic by breaking out and returning
           return processPromptResults(parsed, count, subject, userNegativePrompt);
        }
        throw new Error('Missing or empty prompts array in JSON response');
      } catch (err: any) {`
);

code = code.replace(
`          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
        } catch (err: any) {`,
`          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.prompts) && parsed.prompts.length > 0) {
            return processPromptResults(parsed, count, subject, userNegativePrompt);
          }
          throw new Error('Missing or empty prompts array in JSON response');
        } catch (err: any) {`
);

fs.writeFileSync('server/gemini.ts', code);
