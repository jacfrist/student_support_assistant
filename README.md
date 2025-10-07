# Student Support Assistant Builder

A modern Next.js application that allows Student Support offices to create AI-powered assistants for helping students with common questions and processes. Staff can upload their existing guides, FAQs, and documentation, and the system automatically creates intelligent assistants that students can chat with 24/7.

## 🚀 Features

### For Staff
- **Easy Assistant Creation**: Upload documents and create AI assistants without technical knowledge
- **Document Monitoring**: Automatic syncing when documents are updated
- **Quality Testing**: Built-in testing system to ensure response quality
- **Analytics Dashboard**: Track usage, common questions, and performance metrics
- **Customizable Appearance**: Brand assistants with custom colors and welcome messages

### For Students
- **24/7 Availability**: Get help anytime with intelligent AI assistants
- **Natural Conversations**: Chat naturally with assistants that understand context
- **Source Citations**: See which documents answers come from for transparency
- **Mobile Friendly**: Works seamlessly on all devices

## 🛠 Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **AI**: Amplify AI Assistants
- **File Processing**: Support for PDF, DOCX, TXT, and Markdown files
- **File Monitoring**: Real-time document synchronization

## 📋 Prerequisites

Before setting up the application, ensure you have:

- Node.js 18+ installed
- Amplify API key and assistant ID
- Git

## ⚡ Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd student-support-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your configuration:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/student-support-assistant

   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Email Configuration (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@domain.com
   SMTP_PASS=your_app_password

   # Application Settings
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000

   # File Upload Settings
   MAX_FILE_SIZE=50MB
   UPLOAD_DIR=./uploads
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Visit the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📁 Project Structure

```
student-support-assistant/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── chat/              # Student chat interface
│   ├── dashboard/         # Staff management interface
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
├── lib/                   # Utility libraries
│   ├── ai-service.ts     # AI integration
│   ├── document-processor.ts # File processing
│   ├── file-monitor.ts   # Document monitoring
│   ├── mongodb.ts        # Database connection
│   └── types.ts          # TypeScript definitions
├── public/               # Static assets
├── uploads/              # Document upload directory
└── README.md            # This file
```

## 🔧 Configuration

### Database Setup

The application uses MongoDB to store assistants, documents, conversations, and analytics. Make sure your MongoDB instance is running and accessible.

### Amplify AI Integration

You'll need an Amplify API key and assistant ID. Add them to your environment variables:

```env
AMPLIFY_API_KEY=your_amplify_api_key_here
AMPLIFY_ASSISTANT_ID=your_amplify_assistant_id_here
```

To get your assistant ID:
1. Create an assistant at www.vanderbilt.ai
2. Collect your assistant's ID from the dashboard
3. Add it to your environment variables

### File Processing

The system supports these file formats:
- PDF documents
- Microsoft Word (DOCX)
- Plain text (TXT)
- Markdown (MD)

### Document Monitoring

The file monitoring system watches specified folders for changes and automatically processes new or updated documents.

## 📖 Usage Guide

### Creating Your First Assistant

1. **Access the Dashboard**
   - Navigate to `/dashboard`
   - Click "Create Assistant"

2. **Fill in Basic Information**
   - Name: Choose a descriptive name (e.g., "Financial Aid Helper")
   - Description: Explain what the assistant helps with
   - Welcome Message: Write a greeting for students

3. **Set Document Folder**
   - Provide the path to your documents folder
   - The system will automatically process all supported files

4. **Customize Appearance**
   - Choose colors to match your brand
   - Set response style (professional, friendly, formal)
   - Configure response length and citations

5. **Test Your Assistant**
   - Go to the Testing page
   - Add common questions students ask
   - Run tests to ensure quality responses

6. **Share with Students**
   - Your assistant will be available at `/chat/[assistant-name]`
   - Share the link with students

### Managing Documents

The system automatically monitors your document folder for changes:

- **Adding Files**: Simply add new documents to the folder
- **Updating Files**: Save changes to existing documents
- **Removing Files**: Delete files from the folder

All changes are processed automatically within minutes.

### Quality Assurance

Use the built-in testing system to ensure your assistant provides good responses:

1. **Create Test Questions**: Add common student questions
2. **Run Tests**: Execute tests to see how the assistant responds
3. **Review Results**: Check response quality and citations
4. **Improve Documentation**: Add more documents if responses are incomplete

### Analytics and Monitoring

Track your assistant's performance through the analytics dashboard:

- **Usage Statistics**: See how many students are using the assistant
- **Popular Questions**: Identify the most common student questions
- **Response Times**: Monitor assistant performance
- **Document Usage**: See which documents are cited most often
- **Student Satisfaction**: Track feedback ratings

## 🔐 Security Considerations

- Never commit API keys or sensitive data to version control
- Use environment variables for all configuration
- Regularly update dependencies
- Monitor file upload directories for security
- Implement proper access controls for staff areas

## 📊 Monitoring and Maintenance

### Regular Tasks

1. **Review Analytics**: Check weekly for usage patterns and issues
2. **Update Documents**: Keep information current in monitored folders
3. **Run Tests**: Regularly test assistant responses for quality
4. **Check Logs**: Monitor server logs for errors or issues

### Performance Optimization

- Monitor response times and optimize if needed
- Review document collection size and archive old files
- Check database performance and optimize queries
- Scale infrastructure based on usage patterns

## 🤝 Contributing

When contributing to this project:

1. Follow TypeScript best practices
2. Write tests for new functionality
3. Update documentation for changes
4. Use semantic commit messages
5. Test thoroughly before submitting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Assistant not responding**
- Check OpenAI API key is valid
- Verify MongoDB connection
- Check server logs for errors

**Documents not processing**
- Verify file formats are supported
- Check folder permissions
- Look for processing errors in logs

**Poor response quality**
- Add more relevant documents
- Improve document organization
- Run quality tests and iterate

**Slow performance**
- Check database query performance
- Monitor API response times
- Consider caching strategies

### Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test with simple examples first
4. Contact support with specific error details

## 🚀 Deployment

For production deployment:

1. **Environment Setup**
   - Set production environment variables
   - Configure secure database connection
   - Set up proper logging

2. **Build and Deploy**
   ```bash
   npm run build
   npm start
   ```

3. **Post-Deployment**
   - Test all functionality
   - Set up monitoring
   - Configure backups
   - Enable SSL/HTTPS

---

**Happy Building! 🎉**

Create amazing AI assistants that help students succeed in their academic journey.