// Marketing Chatbot with Groq API Integration
// Modern chatbot for MindWave marketing website

class MarketingChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.groqApiKey = null; // Will be set from environment or config
        this.botName = "Nova";
        this.botAvatar = "✨";

        this.quickReplies = [
            "What is MindWave?",
            "Pricing & Plans",
            "Features",
            "Get Started",
            "Contact Sales",
            "Demo Request"
        ];

        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.sendWelcomeMessage();
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container">
                <!-- Floating Button -->
                <button class="chatbot-button" id="chatbotToggle">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    </svg>
                    <span class="chatbot-badge">1</span>
                </button>
                
                <!-- Chat Window -->
                <div class="chatbot-window" id="chatbotWindow">
                    <!-- Header -->
                    <div class="chatbot-header">
                        <div class="chatbot-header-left">
                            <button class="chatbot-settings-btn" id="chatbotSettingsBtn" title="Settings">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="12" cy="5" r="2"/>
                                    <circle cx="12" cy="12" r="2"/>
                                    <circle cx="12" cy="19" r="2"/>
                                </svg>
                            </button>
                            <div class="chatbot-avatar">${this.botAvatar}</div>
                            <div class="chatbot-info">
                                <h3>${this.botName}</h3>
                                <p>Online • Ready to help</p>
                            </div>
                        </div>
                        <div class="chatbot-header-right">
                            <button class="chatbot-new-chat" id="chatbotNewChat" title="Start new conversation">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                </svg>
                                New
                            </button>
                            <button class="chatbot-close" id="chatbotClose" title="Close chat">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Settings Panel -->
                    <div class="chatbot-settings-panel" id="chatbotSettingsPanel">
                        <div class="chatbot-settings-header">
                            <h3>Settings</h3>
                            <button class="chatbot-settings-close" id="chatbotSettingsClose">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                                </svg>
                            </button>
                        </div>
                        <div class="chatbot-settings-content">
                            <div class="chatbot-settings-item" id="settingSound">
                                <svg class="chatbot-settings-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                                </svg>
                                <div class="chatbot-settings-text">
                                    <h4>Turn on sound</h4>
                                </div>
                                <div class="settings-toggle" data-setting="sound"></div>
                            </div>
                            <div class="chatbot-settings-item" id="settingLanguage">
                                <svg class="chatbot-settings-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                                </svg>
                                <div class="chatbot-settings-text">
                                    <h4>Change language</h4>
                                </div>
                            </div>
                            <div class="chatbot-settings-item" id="settingEmail">
                                <svg class="chatbot-settings-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                                </svg>
                                <div class="chatbot-settings-text">
                                    <h4>Email transcript</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Messages Area -->
                    <div class="chatbot-messages" id="chatbotMessages">
                        <div class="date-separator">Today</div>
                    </div>
                    
                    <!-- Input Area -->
                    <div class="chatbot-input-area">
                        <input 
                            type="text" 
                            class="chatbot-input" 
                            id="chatbotInput" 
                            placeholder="Type your message..."
                            autocomplete="off"
                        />
                        <button class="chatbot-send-btn" id="chatbotSend">
                            <svg viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        const toggleBtn = document.getElementById('chatbotToggle');
        const closeBtn = document.getElementById('chatbotClose');
        const newChatBtn = document.getElementById('chatbotNewChat');
        const settingsBtn = document.getElementById('chatbotSettingsBtn');
        const settingsCloseBtn = document.getElementById('chatbotSettingsClose');
        const sendBtn = document.getElementById('chatbotSend');
        const input = document.getElementById('chatbotInput');

        toggleBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.toggleChat());
        newChatBtn.addEventListener('click', () => this.startNewChat());
        settingsBtn.addEventListener('click', () => this.toggleSettings());
        settingsCloseBtn.addEventListener('click', () => this.toggleSettings());
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        // Settings toggle switches
        const soundToggle = document.querySelector('[data-setting="sound"]');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                soundToggle.classList.toggle('active');
                // Save setting to localStorage
                localStorage.setItem('chatbot_sound', soundToggle.classList.contains('active'));
            });
            // Load saved setting
            if (localStorage.getItem('chatbot_sound') === 'true') {
                soundToggle.classList.add('active');
            }
        }

        // Email transcript handler
        const emailSetting = document.getElementById('settingEmail');
        if (emailSetting) {
            emailSetting.addEventListener('click', () => this.emailTranscript());
        }

        // Language setting handler
        const languageSetting = document.getElementById('settingLanguage');
        if (languageSetting) {
            languageSetting.addEventListener('click', () => this.changeLanguage());
        }
    }

    toggleChat() {
        this.isOpen = !this.isOpen;
        const window = document.getElementById('chatbotWindow');
        const badge = document.querySelector('.chatbot-badge');

        if (this.isOpen) {
            window.classList.add('open');
            if (badge) badge.style.display = 'none';
        } else {
            window.classList.remove('open');
        }
    }

    sendWelcomeMessage() {
        setTimeout(() => {
            this.addBotMessage(
                `Hi there! 👋\n\nI'm ${this.botName}. Feel free to ask me a question or select one of the topics below!`,
                this.quickReplies
            );
        }, 500);
    }

    startNewChat() {
        // Clear messages
        const messagesDiv = document.getElementById('chatbotMessages');
        messagesDiv.innerHTML = '<div class="date-separator">Today</div>';

        // Reset messages array
        this.messages = [];

        // Send welcome message again
        this.sendWelcomeMessage();
    }

    toggleSettings() {
        const panel = document.getElementById('chatbotSettingsPanel');
        panel.classList.toggle('open');
    }

    emailTranscript() {
        const email = prompt('Enter your email address to receive the chat transcript:');
        if (email && email.includes('@')) {
            alert(`Chat transcript will be sent to ${email}`);
            this.toggleSettings();
        } else if (email) {
            alert('Please enter a valid email address');
        }
    }

    changeLanguage() {
        alert('Language selection coming soon! Currently only English is supported.');
    }


    async sendMessage() {
        const input = document.getElementById('chatbotInput');
        const message = input.value.trim();

        if (!message) return;

        // Add user message
        this.addUserMessage(message);
        input.value = '';

        // Show typing indicator
        this.showTyping();

        // Get AI response
        try {
            const response = await this.getGroqResponse(message);
            this.hideTyping();
            this.addBotMessage(response);
        } catch (error) {
            this.hideTyping();
            this.addBotMessage("I apologize, but I'm having trouble connecting right now. Please try again or contact us at support@mindwave.com");
        }
    }

    async getGroqResponse(userMessage) {
        // Check if Groq API key is available
        const apiKey = this.groqApiKey || 'YOUR_GROQ_API_KEY_HERE';

        const systemPrompt = `You are Nova, the AI assistant for MindWave - an innovative AI-powered educational gamification platform.

ABOUT MINDWAVE:
MindWave transforms traditional learning into engaging, interactive game experiences. We help educators create fun, effective learning content that students actually enjoy.

CORE FEATURES:
1. AI Quiz Builder
   - Generate quizzes instantly from any topic using AI
   - Multiple question types: MCQ, True/False, Fill-in-the-blank
   - Auto-grading and instant feedback
   - Customizable difficulty levels

2. Interactive Game Templates
   - Memory Match games
   - Crossword puzzles
   - Word searches
   - Drag-and-drop activities
   - Jeopardy-style quiz games

3. Live Quiz Mode
   - Real-time multiplayer quizzes
   - Student join codes
   - Live leaderboards
   - Instant results and analytics

4. AI Tutor
   - 24/7 homework help
   - Step-by-step explanations
   - Personalized learning support
   - Multi-subject coverage

5. Analytics Dashboard
   - Track student progress
   - Identify knowledge gaps
   - Performance metrics
   - Engagement insights

6. GitHub Integration
   - Sync coding assignments
   - Track student repositories
   - Code review tools
   - Project management

7. Google Classroom Integration
   - Import classes and students
   - Sync assignments
   - Grade synchronization
   - Seamless workflow

PRICING:
- Free Plan: Try all features, limited games
- Pro Plan: $29/month for individual educators
- School Plan: Custom pricing for institutions
- All plans include: AI features, analytics, unlimited students

TARGET USERS:
- K-12 Teachers
- College Professors
- Corporate Trainers
- Tutoring Centers
- Homeschool Educators
- EdTech Enthusiasts

KEY BENEFITS:
✓ Increase student engagement by 3x
✓ Save 5+ hours/week on content creation
✓ AI-powered personalization
✓ Real-time progress tracking
✓ Works on any device
✓ No technical skills required

GETTING STARTED:
1. Sign up for free at mindwave.com
2. Create your first quiz using AI
3. Share with students via join code
4. Watch engagement soar!

YOUR ROLE AS NOVA:
- Answer questions about features, pricing, and use cases
- Help users understand how MindWave solves their problems
- Provide specific examples and recommendations
- Be friendly, enthusiastic, and helpful
- Keep responses concise (under 100 words)
- Encourage users to try the free trial
- Direct technical issues to support@mindwave.com

CONVERSATION STYLE:
- Friendly and approachable
- Use emojis sparingly (1-2 per response)
- Focus on benefits, not just features
- Ask clarifying questions when needed
- Provide actionable next steps

Remember: You're helping educators transform education through gamification!`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey} `
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile', // Fast Groq model
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 200
                })
            });

            if (!response.ok) {
                throw new Error('Groq API error');
            }

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error('Groq API Error:', error);
            // Fallback to predefined responses
            return this.getFallbackResponse(userMessage);
        }
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();

        // PRICING & COST QUESTIONS
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing') ||
            lowerMessage.includes('how much') || lowerMessage.includes('subscription') || lowerMessage.includes('plan')) {

            if (lowerMessage.includes('free') || lowerMessage.includes('trial')) {
                return "Yes! MindWave offers a FREE plan with:\n\n✓ All core features\n✓ AI game builder\n✓ Up to 50 students\n✓ 100 AI calls/month\n✓ No credit card required\n\nReady to start? Click 'Get Started' above!";
            } else if (lowerMessage.includes('school') || lowerMessage.includes('institution') || lowerMessage.includes('enterprise')) {
                return "For schools and institutions, we offer custom pricing based on:\n\n• Number of teachers\n• Student count\n• Required features\n• Training needs\n\nContact our sales team for a personalized quote!";
            } else {
                return "MindWave Pricing:\n\n💎 Free Plan: $0 - Perfect for trying out\n🚀 Pro Plan: $29/month - For individual educators\n🏫 School Plan: Custom pricing\n\nAll plans include AI features, analytics, and unlimited students!\n\nWant to start with our free trial?";
            }
        }

        // FEATURES & CAPABILITIES
        if (lowerMessage.includes('feature') || lowerMessage.includes('what can') || lowerMessage.includes('what does') ||
            lowerMessage.includes('capabilities') || lowerMessage.includes('functions')) {

            if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence')) {
                return "MindWave's AI Features:\n\n🤖 AI Quiz Builder - Generate quizzes from any topic\n📚 AI Tutor - 24/7 homework help\n🎯 Smart Recommendations - Personalized learning paths\n📊 Predictive Analytics - Identify struggling students\n\nOur AI saves teachers 5+ hours per week!";
            } else if (lowerMessage.includes('game') || lowerMessage.includes('gamification')) {
                return "Interactive Game Templates:\n\n🎮 Memory Match\n🧩 Crossword Puzzles\n🔍 Word Searches\n🎯 Drag-and-Drop\n🏆 Jeopardy-Style Quizzes\n📊 Live Multiplayer Quizzes\n\nMake learning fun and engaging!";
            } else if (lowerMessage.includes('analytics') || lowerMessage.includes('tracking') || lowerMessage.includes('progress')) {
                return "Analytics & Tracking:\n\n📊 Real-time dashboards\n📈 Student progress tracking\n🎯 Knowledge gap identification\n⏱️ Time-on-task metrics\n🏆 Engagement scores\n📧 Automated reports\n\nData-driven insights for better teaching!";
            } else {
                return "MindWave Key Features:\n\n✨ AI Game Builder\n🎮 Interactive Quizzes\n📊 Real-time Analytics\n🏆 Student Leaderboards\n📚 AI Tutor (24/7)\n🔗 Google Classroom Integration\n💻 GitHub Integration\n\nWant details on a specific feature?";
            }
        }

        // GETTING STARTED & DEMO
        if (lowerMessage.includes('demo') || lowerMessage.includes('start') || lowerMessage.includes('begin') ||
            lowerMessage.includes('how to use') || lowerMessage.includes('get started')) {

            if (lowerMessage.includes('demo') || lowerMessage.includes('show me')) {
                return "I'd love to show you MindWave!\n\n🎥 Watch Demo Video\n📅 Schedule Live Demo\n🆓 Start Free Trial\n\nThe quickest way? Sign up free and create your first quiz in under 2 minutes!\n\nClick 'Get Started' to begin!";
            } else {
                return "Getting Started is Easy:\n\n1️⃣ Sign up free (no credit card)\n2️⃣ Create your first quiz using AI\n3️⃣ Share with students via join code\n4️⃣ Watch engagement soar!\n\nReady? Click 'Get Started' above!";
            }
        }

        // SUPPORT & CONTACT
        if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help') ||
            lowerMessage.includes('problem') || lowerMessage.includes('issue')) {

            if (lowerMessage.includes('email') || lowerMessage.includes('mail')) {
                return "📧 Email Support:\n\nsupport@mindwave.com\n\nWe typically respond within 24 hours!\n\nFor urgent issues, use the live chat on our dashboard.";
            } else {
                return "Need Help?\n\n💬 Live Chat: Right here!\n📧 Email: support@mindwave.com\n📚 Help Center: mindwave.com/help\n🎥 Video Tutorials: Available in dashboard\n\nWhat can I help you with?";
            }
        }

        // GREETINGS
        if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
            return "Hi there! 👋\n\nI'm Nova, your MindWave assistant!\n\nI can help you with:\n• Features & pricing\n• Getting started\n• Technical support\n• Demo requests\n\nWhat would you like to know?";
        }

        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return "You're welcome! 😊\n\nAnything else you'd like to know about MindWave?\n\nI'm here to help!";
        }

        // DEFAULT FALLBACK
        return "Great question! 🤔\n\nI can help you with:\n\n💰 Pricing & plans\n✨ Features & capabilities\n🚀 Getting started\n📞 Contact & support\n\nWhat would you like to know more about?";
    }

    addUserMessage(text) {
        const messagesDiv = document.getElementById('chatbotMessages');
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        const messageHTML = `
            <div class="message user">
                <div class="message-avatar">👤</div>
                <div class="message-content">
                    <div class="message-bubble">${this.escapeHtml(text)}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
            `;

        messagesDiv.insertAdjacentHTML('beforeend', messageHTML);
        this.scrollToBottom();
    }

    addBotMessage(text, quickReplies = null) {
        const messagesDiv = document.getElementById('chatbotMessages');
        const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        let quickRepliesHTML = '';
        if (quickReplies && quickReplies.length > 0) {
            quickRepliesHTML = `
            <div class="quick-replies">
                ${quickReplies.map(reply =>
                `<button class="quick-reply-btn" data-reply="${this.escapeHtml(reply)}">${reply}</button>`
            ).join('')
                }
                </div>
            `;
        }

        const messageHTML = `
            <div class="message bot">
                <div class="message-avatar">${this.botAvatar}</div>
                <div class="message-content">
                    <div class="message-bubble">${this.formatMessage(text)}</div>
                    <div class="message-time">${time}</div>
                    ${quickRepliesHTML}
                </div>
            </div>
            `;

        messagesDiv.insertAdjacentHTML('beforeend', messageHTML);

        // Add event listeners to quick reply buttons using event delegation
        if (quickReplies && quickReplies.length > 0) {
            setTimeout(() => {
                const buttons = messagesDiv.querySelectorAll('.quick-reply-btn:not([data-listener])');
                buttons.forEach(btn => {
                    btn.setAttribute('data-listener', 'true');
                    btn.addEventListener('click', () => {
                        this.handleQuickReply(btn.getAttribute('data-reply'));
                    });
                });
            }, 0);
        }

        this.scrollToBottom();
    }

    handleQuickReply(reply) {
        const input = document.getElementById('chatbotInput');
        input.value = reply;
        this.sendMessage();
    }

    showTyping() {
        const messagesDiv = document.getElementById('chatbotMessages');
        const typingHTML = `
            <div class="message bot typing-message">
                <div class="message-avatar">${this.botAvatar}</div>
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
            `;
        messagesDiv.insertAdjacentHTML('beforeend', typingHTML);
        this.scrollToBottom();
    }

    hideTyping() {
        const typing = document.querySelector('.typing-message');
        if (typing) typing.remove();
    }

    scrollToBottom() {
        const messagesDiv = document.getElementById('chatbotMessages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    formatMessage(text) {
        // Convert line breaks to <br>
        return text.replace(/\n/g, '<br>');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public method to set Groq API key
    setGroqApiKey(apiKey) {
        this.groqApiKey = apiKey;
    }
}

// Initialize chatbot when DOM is ready
let marketingChatbot;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        marketingChatbot = new MarketingChatbot();
    });
} else {
    marketingChatbot = new MarketingChatbot();
}

// Export for use in other scripts
window.MarketingChatbot = MarketingChatbot;
window.marketingChatbot = marketingChatbot;
