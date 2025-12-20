// ===================================
// MindWave Marketing Site - JavaScript
// Interactive Features
// ===================================

document.addEventListener('DOMContentLoaded', function () {

    // ===================================
    // Smooth Scroll Navigation
    // ===================================
    const navLinks = document.querySelectorAll('a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#" or "#signup" etc (not a section)
            if (href === '#' || href === '#signup' || href === '#demo' || href === '#contact') {
                return;
            }

            e.preventDefault();
            const targetId = href.substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navLinksContainer = document.getElementById('navLinks');
                navLinksContainer.classList.remove('active');
            }
        });
    });

    // ===================================
    // Sticky Navigation with Scroll Effect
    // ===================================
    const navbar = document.getElementById('navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        // Add shadow when scrolled
        if (scrollTop > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        lastScrollTop = scrollTop;
    });

    // ===================================
    // Mobile Menu Toggle
    // ===================================
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinksContainer = document.getElementById('navLinks');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', function () {
            navLinksContainer.classList.toggle('active');

            // Change icon
            const icon = this.querySelector('i');
            if (navLinksContainer.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // ===================================
    // FAQ Accordion
    // ===================================
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', function () {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // ===================================
    // Scroll Animations (Fade In)
    // ===================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .step, .pricing-card, .faq-item');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // ===================================
    // Button Click Effects
    // ===================================
    const buttons = document.querySelectorAll('.btn');

    buttons.forEach(button => {
        button.addEventListener('click', function (e) {
            // Create ripple effect
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.classList.add('ripple');

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // ===================================
    // Pricing Card Hover Effect
    // ===================================
    const pricingCards = document.querySelectorAll('.pricing-card');

    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', function () {
            // Add subtle scale effect
            this.style.transition = 'all 0.3s ease';
        });
    });

    // ===================================
    // Form Handling (for future signup forms)
    // ===================================
    const signupLinks = document.querySelectorAll('a[href="#signup"]');

    signupLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            // Redirect to marketing login (role selection)
            window.location.href = 'website-login.html';
        });
    });

    // ===================================
    // Demo Request Links
    // ===================================
    const demoLinks = document.querySelectorAll('a[href="#demo"]');

    demoLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            // For now, show alert
            // In future, this will open a demo request form
            alert('Demo request feature coming soon! For now, please contact us at demo@mindwave.app');
        });
    });

    // ===================================
    // Parallax Effect on Hero
    // ===================================
    const hero = document.querySelector('.hero');
    const heroCircles = document.querySelectorAll('.hero-bg-circle');

    window.addEventListener('scroll', function () {
        const scrolled = window.pageYOffset;
        const heroHeight = hero.offsetHeight;

        if (scrolled < heroHeight) {
            heroCircles.forEach((circle, index) => {
                const speed = (index + 1) * 0.3;
                circle.style.transform = `translateY(${scrolled * speed}px)`;
            });
        }
    });

    // ===================================
    // Add Ripple Effect Styles Dynamically
    // ===================================
    const style = document.createElement('style');
    style.textContent = `
        .btn {
            position: relative;
            overflow: hidden;
        }
        
        .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple-animation 0.6s ease-out;
            pointer-events: none;
        }
        
        @keyframes ripple-animation {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    // ===================================
    // Pricing Calculator
    // ===================================
    const studentCountSlider = document.getElementById('studentCount');
    const studentCountValue = document.getElementById('studentCountValue');
    const monthlyPriceDisplay = document.getElementById('monthlyPrice');
    const annualPriceDisplay = document.getElementById('annualPrice');
    const savingsDisplay = document.getElementById('savings');

    if (studentCountSlider) {
        function calculatePrice(studentCount) {
            let monthlyPrice;

            if (studentCount <= 50) {
                monthlyPrice = 19;
            } else if (studentCount <= 200) {
                monthlyPrice = 49;
            } else if (studentCount <= 500) {
                monthlyPrice = 99;
            } else {
                monthlyPrice = 199;
            }

            return monthlyPrice;
        }

        function updatePricing() {
            const studentCount = parseInt(studentCountSlider.value);
            const monthlyPrice = calculatePrice(studentCount);
            const annualPrice = Math.round(monthlyPrice * 12 * 0.8); // 20% discount
            const savings = (monthlyPrice * 12) - annualPrice;

            // Update displays with animation
            studentCountValue.textContent = studentCount;
            monthlyPriceDisplay.textContent = monthlyPrice;
            annualPriceDisplay.textContent = annualPrice;
            savingsDisplay.textContent = savings;

            // Update slider background
            const percentage = ((studentCount - 10) / (1000 - 10)) * 100;
            studentCountSlider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--gray-200) ${percentage}%, var(--gray-200) 100%)`;
        }

        studentCountSlider.addEventListener('input', updatePricing);
        updatePricing(); // Initial calculation
    }

    // ===================================
    // Success Modal for Forms
    // ===================================
    window.showSuccessModal = function (title, message) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Create success modal
        const modal = document.createElement('div');
        modal.className = 'success-modal';
        modal.innerHTML = `
            <div class="success-icon">
                <i class="fas fa-check"></i>
            </div>
            <h3>${title}</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="closeSuccessModal()">Got it!</button>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // Show with animation
        setTimeout(() => {
            overlay.classList.add('show');
            modal.classList.add('show');
        }, 10);
    };

    window.closeSuccessModal = function () {
        const overlay = document.querySelector('.modal-overlay');
        const modal = document.querySelector('.success-modal');

        if (overlay && modal) {
            overlay.classList.remove('show');
            modal.classList.remove('show');

            setTimeout(() => {
                overlay.remove();
                modal.remove();
            }, 300);
        }
    };

    // ===================================
    // Console Welcome Message
    // ===================================
    console.log('%c🧠 MindWave Marketing Site', 'font-size: 20px; font-weight: bold; color: #4F46E5;');
    console.log('%cBuilt with ❤️ for modern education', 'font-size: 12px; color: #666;');

});

// ===================================
// Utility Functions
// ===================================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Check if element is in viewport
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}
