import fs from 'fs';

/**
 * Comprehensive Provider Testing
 * Test semua provider untuk metadata accuracy dan performance
 */

const PROVIDERS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'meta-llama/llama-3.2-90b-vision-preview',
    envKey: 'GROQ_API_KEY'
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4-turbo',
    envKey: 'OPENAI_API_KEY'
  },
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'google/gemini-2.0-flash-001',
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

const TEST_PROMPT = `Analyze this request and return structured metadata as JSON:
{
  "provider": "current_provider",
  "timestamp": "current_time",
  "models_available": true,
  "connection_status": "success|failed",
  "response_format": "valid|invalid",
  "latency_ms": 0
}
Always respond ONLY with valid JSON.`;

async function testProvider(providerName, config) {
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
    console.log(`\n🔄 Testing ${providerName.toUpperCase()}...`);
    
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
            role: 'system',
            content: 'You are a JSON metadata analyzer. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: TEST_PROMPT
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
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
        console.log(`   Model: ${config.model}`);
        console.log(`   Latency: ${latency}ms`);
        console.log(`   Response Valid: ✓`);
        console.log(`   Metadata: ${JSON.stringify(parsed).substring(0, 100)}...`);
        
        return {
          provider: providerName,
          status: 'SUCCESS',
          model: config.model,
          latency_ms: latency,
          response_valid: true,
          metadata_sample: parsed
        };
      } catch (parseErr) {
        console.log(`⚠️  ${providerName.toUpperCase()}: Response not valid JSON`);
        console.log(`   Raw: ${content.substring(0, 100)}`);
        
        return {
          provider: providerName,
          status: 'PARTIAL',
          reason: 'Response not valid JSON',
          latency_ms: latency,
          raw_response: content.substring(0, 100)
        };
      }
    } else {
      console.log(`❌ ${providerName.toUpperCase()}: API Error - ${responseStatus}`);
      console.log(`   Message: ${data.error?.message || 'Unknown error'}`);
      
      return {
        provider: providerName,
        status: 'FAILED',
        http_status: responseStatus,
        error: data.error?.message || 'Unknown error',
        latency_ms: latency
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.log(`❌ ${providerName.toUpperCase()}: Network/Connection Error`);
    console.log(`   Error: ${error.message}`);
    
    return {
      provider: providerName,
      status: 'FAILED',
      error: error.message,
      latency_ms: latency
    };
  }
}

async function runAllTests() {
  console.log('═════════════════════════════════════════════');
  console.log('  MULTI-PROVIDER METADATA TEST SUITE');
  console.log('═════════════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('Testing all AI providers for metadata generation...\n');

  const results = [];
  
  for (const [providerName, config] of Object.entries(PROVIDERS)) {
    const result = await testProvider(providerName, config);
    results.push(result);
    // Add delay between providers to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n═════════════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═════════════════════════════════════════════\n');

  const summary = {
    total_providers: results.length,
    successful: results.filter(r => r.status === 'SUCCESS').length,
    partial: results.filter(r => r.status === 'PARTIAL').length,
    failed: results.filter(r => r.status === 'FAILED').length,
    skipped: results.filter(r => r.status === 'SKIPPED').length,
    results: results
  };

  console.log(`✅ Successful: ${summary.successful}/${summary.total_providers}`);
  console.log(`⚠️  Partial: ${summary.partial}/${summary.total_providers}`);
  console.log(`❌ Failed: ${summary.failed}/${summary.total_providers}`);
  console.log(`⊘ Skipped: ${summary.skipped}/${summary.total_providers}\n`);

  // Save detailed report
  const reportFile = 'provider-test-report.json';
  fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));
  console.log(`📄 Detailed report saved to: ${reportFile}`);

  return summary;
}

runAllTests().then(summary => {
  console.log('\n✓ Test suite completed.');
  process.exit(summary.failed > 0 ? 1 : 0);
}).catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
