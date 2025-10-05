# Amplify AI Integration Guide

This document explains how the Student Support Assistant integrates with Amplify AI assistants.

## 🔄 What Changed

### Removed Dependencies
- ❌ `openai` package
- ❌ OpenAI API key requirement
- ❌ GPT-4 model calls
- ❌ Majik AI integration

### Added Integration
- ✅ Direct Amplify API calls via fetch
- ✅ Vanderbilt AI endpoint integration
- ✅ Fallback responses when API unavailable
- ✅ Support for custom Amplify assistant IDs

## 🔧 Configuration

### Environment Variables

```env
# Required
AMPLIFY_API_KEY=amp-v1-wuxkWNosD5AtNe5EDHEvhraDYY5zyCjGkRvdbIsLBRA
AMPLIFY_ASSISTANT_ID=your_amplify_assistant_id_here
```

### API Integration Details

The system now calls Amplify's API with this structure:

```json
{
  "data": {
    "temperature": 0.5,
    "max_tokens": 4096,
    "dataSources": [],
    "messages": [
      {"role": "system", "content": "System prompt with context"},
      {"role": "user", "content": "User message"},
      {"role": "assistant", "content": "Previous response"},
      {"role": "user", "content": "Current user message"}
    ],
    "options": {
      "assistantId": "your_amplify_assistant_id",
      "model": {"id": "gpt-4o-mini"},
      "prompt": "System prompt content"
    }
  }
}
```

## 🎯 Benefits

### Better Integration
- **Native Amplify Support**: Direct integration with Vanderbilt AI assistants
- **Custom Assistant IDs**: Use specific Amplify assistants per student support assistant
- **Simplified Configuration**: Fewer environment variables needed

### Improved Reliability
- **Graceful Fallbacks**: When Amplify API is unavailable, provides helpful fallback responses
- **Error Handling**: Better error messages and recovery
- **Context Preservation**: Maintains conversation context and document citations

### Cost Efficiency
- **No OpenAI Costs**: Eliminates OpenAI API usage charges
- **Amplify Pricing**: Leverage Amplify's potentially more cost-effective pricing
- **Optimized Calls**: Efficient API usage with proper context management

## 🔄 Migration Process

If you were previously using OpenAI or Majik:

1. **Update Environment Variables**
   ```bash
   # Remove
   OPENAI_API_KEY=...
   MAJIK_API_KEY=...
   MAJIK_API_ENDPOINT=...
   MAJIK_MODEL=...
   MAJIK_ASSISTANT_ID=...
   
   # Add
   AMPLIFY_API_KEY=amp-v1-wuxkWNosD5AtNe5EDHEvhraDYY5zyCjGkRvdbIsLBRA
   AMPLIFY_ASSISTANT_ID=your_assistant_id
   ```

2. **Create Amplify Assistant**
   - Go to www.vanderbilt.ai
   - Create a new assistant
   - Configure it for student support
   - Copy the assistant ID

3. **Test Integration**
   - Create a test assistant in the dashboard
   - Try chatting with it to verify Amplify responses
   - Check the console for any API errors

4. **Verify Functionality**
   - Document processing still works
   - Citations are generated correctly
   - Conversation history is maintained
   - Fallback responses work when API is down

## 🛠 Customization

### Multiple Assistant Support
Each student support assistant can use different Amplify assistant IDs by configuring them in the database or environment.

### Response Customization
The system respects the assistant's configured settings:
- Response style (formal/friendly/professional)
- Maximum response length
- Citation preferences

## 🐛 Troubleshooting

### Common Issues

**"Amplify API error: 401"**
- Check your `AMPLIFY_API_KEY` is correct
- Verify the API key has proper permissions

**"Amplify API error: 404"**
- Verify your `AMPLIFY_ASSISTANT_ID` exists
- Check that the assistant is properly configured at www.vanderbilt.ai

**Fallback responses appearing**
- Check network connectivity to Amplify API
- Verify API endpoint is accessible
- Review server logs for detailed error messages

### Debug Mode
Enable debug logging by checking browser console and server logs for detailed Amplify API interaction information.

## 📈 Monitoring

The system logs all Amplify API interactions:
- Request/response times
- Error rates
- Fallback usage
- Assistant performance metrics

Monitor these through your application's analytics dashboard to ensure optimal performance.

---

**Need Help?** Check the main README.md for general setup instructions or contact support for Amplify-specific integration assistance.