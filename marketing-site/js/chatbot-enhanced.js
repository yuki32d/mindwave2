function getFallbackResponse(message) {
    const lowerMessage = message.toLowerCase();

    // PRICING & COST QUESTIONS
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing') ||
        lowerMessage.includes('how much') || lowerMessage.includes('subscription') || lowerMessage.includes('plan')) {

        if (lowerMessage.includes('free') || lowerMessage.includes('trial')) {
            return "Yes! MindWave offers a FREE plan with:\\n\\n✓ All core features\\n✓ AI game builder\\n✓ Up to 50 students\\n✓ 100 AI calls/month\\n✓ No credit card required\\n\\nReady to start? Click 'Get Started' above!";
        } else if (lowerMessage.includes('school') || lowerMessage.includes('institution') || lowerMessage.includes('enterprise')) {
            return "For schools and institutions, we offer custom pricing based on:\\n\\n• Number of teachers\\n• Student count\\n• Required features\\n• Training needs\\n\\nContact our sales team for a personalized quote!";
        } else {
            return "MindWave Pricing:\\n\\n💎 Free Plan: $0 - Perfect for trying out\\n🚀 Pro Plan: $29/month - For individual educators\\n🏫 School Plan: Custom pricing\\n\\nAll plans include AI features, analytics, and unlimited students!\\n\\nWant to start with our free trial?";
        }
    }

    // FEATURES & CAPABILITIES
    if (lowerMessage.includes('feature') || lowerMessage.includes('what can') || lowerMessage.includes('what does') ||
        lowerMessage.includes('capabilities') || lowerMessage.includes('functions')) {

        if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence')) {
            return "MindWave's AI Features:\\n\\n🤖 AI Quiz Builder - Generate quizzes from any topic\\n📚 AI Tutor - 24/7 homework help\\n🎯 Smart Recommendations - Personalized learning paths\\n📊 Predictive Analytics - Identify struggling students\\n\\nOur AI saves teachers 5+ hours per week!";
        } else if (lowerMessage.includes('game') || lowerMessage.includes('gamification')) {
            return "Interactive Game Templates:\\n\\n🎮 Memory Match\\n🧩 Crossword Puzzles\\n🔍 Word Searches\\n🎯 Drag-and-Drop\\n🏆 Jeopardy-Style Quizzes\\n📊 Live Multiplayer Quizzes\\n\\nMake learning fun and engaging!";
        } else if (lowerMessage.includes('analytics') || lowerMessage.includes('tracking') || lowerMessage.includes('progress')) {
            return "Analytics & Tracking:\\n\\n📊 Real-time dashboards\\n📈 Student progress tracking\\n🎯 Knowledge gap identification\\n⏱️ Time-on-task metrics\\n🏆 Engagement scores\\n📧 Automated reports\\n\\nData-driven insights for better teaching!";
        } else {
            return "MindWave Key Features:\\n\\n✨ AI Game Builder\\n🎮 Interactive Quizzes\\n📊 Real-time Analytics\\n🏆 Student Leaderboards\\n📚 AI Tutor (24/7)\\n🔗 Google Classroom Integration\\n💻 GitHub Integration\\n\\nWant details on a specific feature?";
        }
    }

    // GETTING STARTED & DEMO
    if (lowerMessage.includes('demo') || lowerMessage.includes('trial') || lowerMessage.includes('start') ||
        lowerMessage.includes('begin') || lowerMessage.includes('how to use') || lowerMessage.includes('get started')) {

        if (lowerMessage.includes('demo') || lowerMessage.includes('show me')) {
            return "I'd love to show you MindWave!\\n\\n🎥 Watch Demo Video\\n📅 Schedule Live Demo\\n🆓 Start Free Trial\\n\\nThe quickest way? Sign up free and create your first quiz in under 2 minutes!\\n\\nClick 'Get Started' to begin!";
        } else {
            return "Getting Started is Easy:\\n\\n1️⃣ Sign up free (no credit card)\\n2️⃣ Create your first quiz using AI\\n3️⃣ Share with students via join code\\n4️⃣ Watch engagement soar!\\n\\nReady? Click 'Get Started' above!";
        }
    }

    // INTEGRATION QUESTIONS
    if (lowerMessage.includes('integrate') || lowerMessage.includes('google classroom') ||
        lowerMessage.includes('github') || lowerMessage.includes('lms') || lowerMessage.includes('connect')) {

        if (lowerMessage.includes('google') || lowerMessage.includes('classroom')) {
            return "Google Classroom Integration:\\n\\n✓ Import classes & students\\n✓ Sync assignments automatically\\n✓ Grade synchronization\\n✓ One-click setup\\n\\nSeamlessly works with your existing workflow!";
        } else if (lowerMessage.includes('github')) {
            return "GitHub Integration:\\n\\n✓ Sync coding assignments\\n✓ Track student repositories\\n✓ Automated code review\\n✓ Project management\\n\\nPerfect for computer science courses!";
        } else {
            return "MindWave Integrations:\\n\\n🎓 Google Classroom\\n💻 GitHub\\n📚 Canvas LMS (coming soon)\\n📊 Google Sheets\\n🔗 API access available\\n\\nNeed a specific integration? Let us know!";
        }
    }

    // TECHNICAL & SUPPORT
    if (lowerMessage.includes('contact') || lowerMessage.includes('support') || lowerMessage.includes('help') ||
        lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('bug')) {

        if (lowerMessage.includes('email') || lowerMessage.includes('mail')) {
            return "📧 Email Support:\\n\\nsupport@mindwave.com\\n\\nWe typically respond within 24 hours!\\n\\nFor urgent issues, use the live chat on our dashboard.";
        } else if (lowerMessage.includes('phone') || lowerMessage.includes('call')) {
            return "We don't offer phone support yet, but you can:\\n\\n💬 Live Chat (fastest)\\n📧 Email: support@mindwave.com\\n📅 Schedule a video call\\n\\nHow can I help you right now?";
        } else {
            return "Need Help?\\n\\n💬 Live Chat: Right here!\\n📧 Email: support@mindwave.com\\n📚 Help Center: mindwave.com/help\\n🎥 Video Tutorials: Available in dashboard\\n\\nWhat can I help you with?";
        }
    }

    // STUDENT/TEACHER SPECIFIC
    if (lowerMessage.includes('student') || lowerMessage.includes('pupil') || lowerMessage.includes('learner')) {

        if (lowerMessage.includes('how many') || lowerMessage.includes('limit') || lowerMessage.includes('maximum')) {
            return "Student Limits:\\n\\n🆓 Free Plan: Up to 50 students\\n🚀 Pro Plan: Unlimited students\\n🏫 School Plan: Unlimited students\\n\\nNo per-student fees ever!";
        } else if (lowerMessage.includes('track') || lowerMessage.includes('monitor') || lowerMessage.includes('progress')) {
            return "Student Tracking:\\n\\n✓ Individual progress dashboards\\n✓ Quiz performance history\\n✓ Time spent learning\\n✓ Knowledge gap analysis\\n✓ Engagement metrics\\n\\nSee exactly how each student is doing!";
        } else {
            return "For Students:\\n\\n🎮 Fun, game-based learning\\n🤖 24/7 AI tutor help\\n🏆 Leaderboards & achievements\\n📱 Works on any device\\n✨ No downloads needed\\n\\nJoin with a simple code from your teacher!";
        }
    }

    if (lowerMessage.includes('teacher') || lowerMessage.includes('educator') || lowerMessage.includes('instructor')) {
        return "For Teachers:\\n\\n⏱️ Save 5+ hours/week\\n🤖 AI-powered content creation\\n📊 Automated grading\\n📈 Real-time analytics\\n🎮 Boost engagement 3x\\n💡 No tech skills needed\\n\\nFocus on teaching, not admin work!";
    }

    // SUBJECT/TOPIC SPECIFIC
    if (lowerMessage.includes('subject') || lowerMessage.includes('topic') || lowerMessage.includes('math') ||
        lowerMessage.includes('science') || lowerMessage.includes('history') || lowerMessage.includes('language')) {
        return "MindWave works for ALL subjects:\\n\\n📐 Math & Science\\n📚 English & Literature\\n🌍 History & Geography\\n💻 Computer Science\\n🎨 Arts & Music\\n🌐 Foreign Languages\\n\\nOur AI adapts to any topic you teach!";
    }

    // COMPARISON QUESTIONS
    if (lowerMessage.includes('vs') || lowerMessage.includes('versus') || lowerMessage.includes('compare') ||
        lowerMessage.includes('kahoot') || lowerMessage.includes('quizizz') || lowerMessage.includes('quizlet')) {
        return "Why Choose MindWave?\\n\\n✨ AI-powered quiz generation\\n🎮 More game variety\\n📊 Better analytics\\n🤖 Built-in AI tutor\\n💻 GitHub integration\\n💰 Better pricing\\n\\nTry it free and see the difference!";
    }

    // SECURITY & PRIVACY
    if (lowerMessage.includes('secure') || lowerMessage.includes('privacy') || lowerMessage.includes('safe') ||
        lowerMessage.includes('data') || lowerMessage.includes('gdpr') || lowerMessage.includes('coppa')) {
        return "Security & Privacy:\\n\\n🔒 Bank-level encryption\\n✓ GDPR compliant\\n✓ COPPA compliant\\n✓ SOC 2 certified\\n🛡️ Regular security audits\\n📋 Transparent privacy policy\\n\\nYour data is safe with us!";
    }

    // DEVICE/PLATFORM
    if (lowerMessage.includes('mobile') || lowerMessage.includes('app') || lowerMessage.includes('ipad') ||
        lowerMessage.includes('tablet') || lowerMessage.includes('phone') || lowerMessage.includes('device')) {
        return "Works on ANY Device:\\n\\n📱 Smartphones\\n💻 Laptops\\n🖥️ Desktops\\n📲 Tablets (iPad, Android)\\n🌐 Any web browser\\n\\nNo downloads needed - just visit mindwave.com!";
    }

    // ACCOUNT/LOGIN
    if (lowerMessage.includes('account') || lowerMessage.includes('login') || lowerMessage.includes('sign up') ||
        lowerMessage.includes('register') || lowerMessage.includes('password')) {
        return "Account Help:\\n\\n✓ Sign up free at mindwave.com\\n✓ Use Google/Microsoft login\\n✓ Forgot password? Click 'Reset'\\n✓ One account for all features\\n\\nNeed help? I'm here!";
    }

    // GENERAL/DEFAULT RESPONSE
    if (lowerMessage.includes('hi') || lowerMessage.includes('hello') || lowerMessage.includes('hey')) {
        return "Hi there! 👋\\n\\nI'm Nova, your MindWave assistant!\\n\\nI can help you with:\\n• Features & pricing\\n• Getting started\\n• Technical support\\n• Demo requests\\n\\nWhat would you like to know?";
    }

    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return "You're welcome! 😊\\n\\nAnything else you'd like to know about MindWave?\\n\\nI'm here to help!";
    }

    // ULTIMATE FALLBACK
    return "Great question! 🤔\\n\\nI can help you with:\\n\\n💰 Pricing & plans\\n✨ Features & capabilities\\n🚀 Getting started\\n📞 Contact & support\\n\\nWhat would you like to know more about?";
}

