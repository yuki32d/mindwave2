// ==================== AI CODING ASSISTANT ====================
// Universal AI coding assistant for all 50+ programming languages

// Language detection helper
function detectLanguage(code) {
    const lowerCode = code.toLowerCase();

    // Python
    if (code.includes('def ') || code.includes('import ') || code.includes('print(')) return 'python';

    // JavaScript
    if (code.includes('function') || code.includes('const ') || code.includes('let ') || code.includes('console.log')) return 'javascript';

    // Java
    if (code.includes('public class') || code.includes('System.out')) return 'java';

    // C++
    if (code.includes('#include') || code.includes('std::') || code.includes('cout')) return 'cpp';

    // C#
    if (code.includes('using System') || code.includes('Console.WriteLine')) return 'csharp';

    // More languages can be added...
    return 'unknown';
}

// Simple fallback code analysis (when AI is not available)
function analyzeCodeSimple(code, language, hintLevel) {
    if (!code || code.trim() === '') {
        return "Start typing your code and I'll help you! 💻";
    }

    // Python-specific checks
    if (language === 'python') {
        if (code.includes('print') && !code.includes('(')) {
            return "Oops! The print function needs parentheses (). Try print() 😊";
        }
        if (code.includes('print(') && !code.includes('"') && !code.includes("'")) {
            return "Almost there! Strings need quotes around them. Try 'Hello World' 💡";
        }
        if (code === 'print("Hello World")' || code === "print('Hello World')") {
            return "Perfect! You're a natural! 🌟✨";
        }
    }

    // JavaScript-specific checks
    if (language === 'javascript') {
        if (code.includes('console.log') && !code.includes('(')) {
            return "Don't forget the parentheses! Try console.log() 😊";
        }
        if (code.includes('console.log(') && !code.includes('"') && !code.includes("'")) {
            return "Strings need quotes! Try 'Hello World' 💡";
        }
    }

    return "Keep going! You're on the right track! 💪";
}

export { detectLanguage, analyzeCodeSimple };
