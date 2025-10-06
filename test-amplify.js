const { AIService } = require('./lib/ai-service');
const fs = require('fs');

async function testAmplify() {
  try {
    console.log('Testing Amplify document upload and AI response...');
    
    const result = await AIService.generateResponse(
      'mge6qt2ige2ux9ctmg', // Financial Aid Helper ID
      'What is the refund policy for tuition if I withdraw from classes?',
      []
    );
    
    console.log('AI Response:', result.response);
    console.log('Citations:', result.citations);
    console.log('Response Time:', result.responseTime, 'ms');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAmplify();