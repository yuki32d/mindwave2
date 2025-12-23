// Marketing Chatbot with Groq API Integration
// Modern chatbot for MindWave marketing website

class MarketingChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.groqApiKey = null; // Will be set from environment or config
        this.botName = "MindWave Assistant";
        this.botAvatar = "🤖";

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
                            <div class="chatbot-avatar">${this.botAvatar}</div>
                            <div class="chatbot-info">
                                <h3>${this.botName}</h3>
                                <p>Online • Ready to help</p>
                            </div>
                        </div>
                        <button class="chatbot-close" id="chatbotClose">
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
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
        const sendBtn = document.getElementById('chatbotSend');
        const input = document.getElementById('chatbotInput');

        toggleBtn.addEventListener('click', () => this.toggleChat());
        closeBtn.addEventListener('click', () => this.toggleChat());
        sendBtn.addEventListener('click', () => this.sendMessage());
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
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

        const systemPrompt = `You are MindWave Assistant, a helpful AI assistant for MindWave - an AI-powered educational gamification platform. 

About MindWave:
- AI-powered platform that transforms learning into engaging games
- Features: Interactive quizzes, AI game builder, real-time analytics, leaderboards
- Target audience: Educators, schools, and educational institutions
- Pricing: Free tier available, premium plans starting at $29/month
- Key benefits: Increased student engagement, personalized learning, easy-to-use interface

Your role:
- Answer questions about MindWave's features, pricing, and benefits
- Help users understand how MindWave can improve their teaching/learning
- Provide friendly, concise, and helpful responses
- Encourage users to sign up for a free trial or request a demo
- If asked about technical support, direct them to support@mindwave.com

Keep responses conversational, friendly, and under 100 words.`;

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
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

        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
            return "MindWave offers flexible pricing:\n\n• Free Plan: Perfect for trying out\n• Pro Plan: $29/month for educators\n• School Plan: Custom pricing for institutions\n\nWould you like to start with our free trial?";
        }

        if (lowerMessage.includes('feature') || lowerMessage.includes('what') || lowerMessage.includes('mindwave')) {
            return "MindWave is an AI-powered gamification platform that makes learning fun! 🎮\n\nKey features:\n• AI Game Builder\n• Interactive Quizzes\n• Real-time Analytics\n• Student Leaderboards\n• Progress Tracking\n\nWant to see it in action? Request a demo!";
        }

        if (lowerMessage.includes('demo') || lowerMessage.includes('trial')) {
            return "Great! You can start a free trial right now:\n\n1. Click 'Get Started' on our homepage\n2. Create your account\n3. Start building games immediately!\n\nNo credit card required. Need help getting started?";
        }

        if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help')) {
            return "I'm here to help! You can:\n\n• Email: support@mindwave.com\n• Live Chat: Right here!\n• Schedule a call: Book a demo\n\nWhat would you like to know about MindWave?";
        }

        return "Thanks for your question! MindWave helps educators create engaging learning experiences through AI-powered games. Would you like to know more about our features, pricing, or see a demo?";
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
                `<button class="quick-reply-btn" onclick="marketingChatbot.handleQuickReply('${reply}')">${reply}</button>`
            ).join('')}
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
