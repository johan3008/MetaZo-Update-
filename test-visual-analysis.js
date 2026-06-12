import fs from 'fs';
import path from 'path';

/**
 * Visual Analysis Test - Test metadata generation dengan actual image
 * Untuk validate semua provider output quality
 */

const PROVIDERS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    envKey: 'GROQ_API_KEY'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo',
    envKey: 'OPENAI_API_KEY'
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4-turbo',
    envKey: 'OPENROUTER_API_KEY'
  },
  mistral: {
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'pixtral-12b',
    envKey: 'MISTRAL_API_KEY'
  },
  blackbox: {
    endpoint: 'https://api.blackbox.ai/v1/chat/completions',
    model: 'blackboxai',
    envKey: 'BLACKBOX_API_KEY'
  },
  nvidia: {
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    model: 'step-3.5-flash',
    envKey: 'NVIDIA_API_KEY'
  }
};

// Find a test image
function getTestImage() {
  const possibleImages = ['test.jpg', 'test.png', 'test.eps', 'test2.jpg', 'test3.jpg'];
  for (const img of possibleImages) {
    if (fs.existsSync(img)) {
      console.log(`📷 Using test image: ${img}`);
      return img;
    }
  }
  console.log('❌ No test image found. Create a test.jpg or test.png in current directory.');
  return null;
}

// Convert image to base64
function imageToBase64(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('base64');
}

// Get MIME type
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/jpeg';
}

async function testProviderVisualAnalysis(providerName, config, imageBase64, mimeType) {
  const apiKey = process.env[config.envKey];
  
  if (!apiKey) {
    console.log(`❌ ${providerName.toUpperCase()}: Missing ${config.envKey}`);
    return {
      provider: providerName,
      status: 'SKIPPED',
      reason: `API Key not found: ${config.envKey}`
    };
  }

  const startTime = Date.now();
  
  try {
    console.log(`\n🔄 ${providerName.toUpperCase()} - Analyzing image for metadata...`);
    
    // Build message with image
    const userContent = [
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${imageBase64}`
        }
      },
      {
        type: 'text',
        text: `Analyze this image and generate stock photography metadata as JSON:
{
  "visual_subject": "main object or subject",
  "key_attributes": ["list", "of", "attributes"],
  "dominant_colors": ["color1", "color2"],
  "style_category": "photography|illustration|3d_render|other",
  "commercial_value": "high|medium|low",
  "recommended_tags": ["tag1", "tag2", "tag3"],
  "brief_description": "one sentence describing the image"
}

RULES:
- Only describe what you can see visually
- Be specific and commercial-focused
- Return ONLY valid JSON, no additional text
`
      }
    ];

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: userContent
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const latency = Date.now() - startTime;
    const responseStatus = response.status;
    const data = await response.json();

    if (responseStatus === 200 && data.choices && data.choices[0]) {
      const content = data.choices[0].message.content;
      
      try {
        const parsed = JSON.parse(content);
        console.log(`✅ ${providerName.toUpperCase()}: SUCCESS`);
        console.log(`   Latency: ${latency}ms`);
        console.log(`   Visual Subject: ${parsed.visual_subject}`);
        console.log(`   Tags: ${parsed.recommended_tags?.slice(0, 3).join(', ')}`);
        console.log(`   Description: ${parsed.brief_description?.substring(0, 60)}...`);
        
        return {
          provider: providerName,
          status: 'SUCCESS',
          model: config.model,
          latency_ms: latency,
          metadata: parsed,
          accuracy_score: parsed.visual_subject && parsed.recommended_tags ? 8 : 5
        };
      } catch (parseErr) {
        console.log(`⚠️  ${providerName.toUpperCase()}: Invalid JSON response`);
        console.log(`   Raw: ${content.substring(0, 80)}`);
        
        return {
          provider: providerName,
          status: 'FAILED',
          reason: 'Invalid JSON response',
          latency_ms: latency,
          raw_response: content.substring(0, 100)
        };
      }
    } else {
      console.log(`❌ ${providerName.toUpperCase()}: HTTP Error ${responseStatus}`);
      if (data.error) {
        console.log(`   Error: ${data.error.message}`);
      }
      
      return {
        provider: providerName,
        status: 'FAILED',
        http_status: responseStatus,
        error_message: data.error?.message || 'Unknown error'
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`❌ ${providerName.toUpperCase()}: Connection Error`);
    console.log(`   ${error.message}`);
    
    return {
      provider: providerName,
      status: 'FAILED',
      error: error.message,
      latency_ms: latency
    };
  }
}

async function runVisualAnalysisTests() {
  // Find test image
  const imagePath = getTestImage();
  if (!imagePath) {
    console.log('\n📸 Creating a simple test image...');
    // Could create a minimal test image here, but for now just exit
    console.log('Please provide a test image (test.jpg, test.png, etc)');
    process.exit(1);
  }

  const imageBase64 = imageToBase64(imagePath);
  const mimeType = getMimeType(imagePath);
  const fileStats = fs.statSync(imagePath);

  console.log('═════════════════════════════════════════════');
  console.log('  VISUAL ANALYSIS TEST - METADATA QUALITY');
  console.log('═════════════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Test Image: ${imagePath} (${(fileStats.size / 1024).toFixed(2)} KB)`);
  console.log(`MIME Type: ${mimeType}`);
  console.log('Testing all AI providers for visual analysis accuracy...\n');

  const results = [];
  
  for (const [providerName, config] of Object.entries(PROVIDERS)) {
    const result = await testProviderVisualAnalysis(providerName, config, imageBase64, mimeType);
    results.push(result);
    // Add delay between providers
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n═════════════════════════════════════════════');
  console.log('  VISUAL ANALYSIS SUMMARY');
  console.log('═════════════════════════════════════════════\n');

  const summary = {
    timestamp: new Date().toISOString(),
    test_image: imagePath,
    image_size_kb: (fileStats.size / 1024).toFixed(2),
    total_providers: results.length,
    successful: results.filter(r => r.status === 'SUCCESS').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    avg_latency_ms: results
      .filter(r => r.latency_ms)
      .reduce((sum, r) => sum + r.latency_ms, 0) / results.filter(r => r.latency_ms).length,
    detailed_results: results
  };

  console.log(`✅ Successful: ${summary.successful}/${summary.total_providers}`);
  console.log(`❌ Failed: ${summary.failed}/${summary.total_providers}`);
  console.log(`⊘ Skipped: ${summary.skipped}/${summary.total_providers}`);
  console.log(`⏱️  Average Latency: ${summary.avg_latency_ms.toFixed(0)}ms\n`);

  // Save detailed report
  const reportFile = 'visual-analysis-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  console.log(`📄 Detailed report saved to: ${reportFile}`);

  // Display top results
  const successful = results.filter(r => r.status === 'SUCCESS').sort((a, b) => (b.latency_ms || 0) - (a.latency_ms || 0));
  if (successful.length > 0) {
    console.log('\n🏆 Provider Rankings (by speed):');
    successful.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.provider.toUpperCase()} - ${r.latency_ms}ms`);
    });
  }

  return summary;
}

// Fix: rename the inner function to avoid conflict
async function testProviderWithImage(providerName, config, imageBase64, mimeType) {
  return testProviderVisualAnalysis(providerName, config, imageBase64, mimeType);
}

runVisualAnalysisTests().then(summary => {
  console.log('\n✓ Visual analysis test completed.');
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
