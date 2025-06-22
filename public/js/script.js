// Codedx Platform - Enhanced JavaScript
// Performance optimized with modern ES6+ features

class CodedxPlatform {
    constructor() {
        this.init();
        this.setupEventListeners();
        this.setupAccessibility();
        this.setupPerformanceOptimizations();
    }

    init() {
        console.log('🚀 Codedx Platform Initialized');
        this.setupMobileNavigation();
        this.setupSmoothScrolling();
        this.setupButtonEffects();
        this.setupProgressTracking();
        this.setupKeyboardShortcuts();
    }

    // Mobile Navigation with improved UX
    setupMobileNavigation() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        
        if (!hamburger || !navMenu) return;

        let isMenuOpen = false;

        const toggleMenu = () => {
            isMenuOpen = !isMenuOpen;
            hamburger.classList.toggle('active', isMenuOpen);
            navMenu.classList.toggle('active', isMenuOpen);
            
            // Accessibility
            hamburger.setAttribute('aria-expanded', isMenuOpen);
            navMenu.setAttribute('aria-hidden', !isMenuOpen);
            
            // Prevent body scroll when menu is open
            document.body.style.overflow = isMenuOpen ? 'hidden' : '';
        };

        hamburger.addEventListener('click', toggleMenu);

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (isMenuOpen && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
                toggleMenu();
            }
        });

        // Close menu on nav link click
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (isMenuOpen) toggleMenu();
            });
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                toggleMenu();
            }
        });
    }

    // Enhanced smooth scrolling with easing
    setupSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const target = document.querySelector(targetId);
                
                if (target) {
                    const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                    const targetPosition = target.offsetTop - headerHeight - 20;
                    
                    this.smoothScrollTo(targetPosition, 800);
                }
            });
        });
    }

    // Custom smooth scroll with easing
    smoothScrollTo(targetPosition, duration) {
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;

        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        };

        const animation = (currentTime) => {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = easeInOutCubic(progress);
            
            window.scrollTo(0, startPosition + distance * ease);
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        };

        requestAnimationFrame(animation);
    }

    // Enhanced button effects with performance optimization
    setupButtonEffects() {
        // Throttle function for performance
        const throttle = (func, limit) => {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        };

        // Enhanced button hover effects
        const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-signup');
        
        buttons.forEach(button => {
            let isPressed = false;

            const handleMouseEnter = throttle(() => {
                if (!isPressed) {
                    button.style.transform = 'translateY(-3px)';
                    button.style.transition = 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
                }
            }, 16);

            const handleMouseLeave = throttle(() => {
                if (!isPressed) {
                    button.style.transform = 'translateY(0)';
                }
            }, 16);

            const handleMouseDown = () => {
                isPressed = true;
                button.style.transform = 'translateY(2px)';
                button.style.transition = 'all 0.05s ease';
            };

            const handleMouseUp = () => {
                isPressed = false;
                setTimeout(() => {
                    button.style.transform = 'translateY(-2px)';
                    button.style.transition = 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
                }, 50);
            };

            button.addEventListener('mouseenter', handleMouseEnter);
            button.addEventListener('mouseleave', handleMouseLeave);
            button.addEventListener('mousedown', handleMouseDown);
            button.addEventListener('mouseup', handleMouseUp);

            // Touch events for mobile
            button.addEventListener('touchstart', handleMouseDown, { passive: true });
            button.addEventListener('touchend', handleMouseUp, { passive: true });
        });

        // Special 3D effect for signup button
        this.setupSignupButtonEffect();
    }

    setupSignupButtonEffect() {
        const signUpButton = document.querySelector('.btn-signup');
        if (!signUpButton) return;

        let pressTimer;

        const handlePress = () => {
            signUpButton.style.transform = 'translateY(4px)';
            signUpButton.style.boxShadow = '0 2px 0 #92400e, 0 4px 8px rgba(0, 0, 0, 0.2)';
        };

        const handleRelease = () => {
            clearTimeout(pressTimer);
            pressTimer = setTimeout(() => {
                signUpButton.style.transform = 'translateY(-3px)';
                signUpButton.style.boxShadow = '0 8px 0 #92400e, 0 12px 20px rgba(0, 0, 0, 0.4)';
            }, 50);
        };

        const handleClick = () => {
            // Create ripple effect
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                width: 20px;
                height: 20px;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%) scale(0);
            `;
            
            signUpButton.style.position = 'relative';
            signUpButton.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        };

        signUpButton.addEventListener('mousedown', handlePress);
        signUpButton.addEventListener('mouseup', handleRelease);
        signUpButton.addEventListener('mouseleave', handleRelease);
        signUpButton.addEventListener('click', handleClick);
    }

    // Progress tracking for lessons
    setupProgressTracking() {
        // Auto-save progress every 30 seconds if on a lesson page
        if (window.location.pathname.includes('/lesson/')) {
            setInterval(() => {
                this.saveProgress();
            }, 30000);
        }

        // Save progress before page unload
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
        });
    }

    async saveProgress() {
        try {
            const currentPath = window.location.pathname;
            const match = currentPath.match(/\/lesson\/(\d+)\/(\d+)/);
            
            if (match) {
                const [, chapter, lesson] = match;
                const timeSpent = this.getTimeSpentOnPage();
                
                // Save time spent
                localStorage.setItem('currentLessonTime', timeSpent);
                localStorage.setItem('lastActivity', Date.now());
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    getTimeSpentOnPage() {
        const startTime = parseInt(localStorage.getItem('pageStartTime') || Date.now());
        return Math.floor((Date.now() - startTime) / 1000);
    }

    // Keyboard shortcuts for better UX
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showNotification('Search feature coming soon! 🔍', 'info');
            }

            // Escape to close modals/menus
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    closeAllModals() {
        const activeElements = document.querySelectorAll('.active');
        activeElements.forEach(el => {
            if (el.classList.contains('nav-menu') || el.classList.contains('hamburger')) {
                el.classList.remove('active');
            }
        });
    }

    // Accessibility enhancements
    setupAccessibility() {
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
    }

    setupFocusManagement() {
        // Skip to content link
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: #8b5cf6;
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1001;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    }

    setupScreenReaderSupport() {
        // Add ARIA labels where needed
        const buttons = document.querySelectorAll('button:not([aria-label])');
        buttons.forEach(button => {
            const text = button.textContent.trim();
            if (text) {
                button.setAttribute('aria-label', text);
            }
        });

        // Live region for dynamic content
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        document.body.appendChild(liveRegion);
        this.liveRegion = liveRegion;
    }

    // Performance optimizations
    setupPerformanceOptimizations() {
        this.setupLazyLoading();
        this.setupResizeHandler();
    }

    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    setupResizeHandler() {
        let resizeTimer;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const isMobile = window.innerWidth < 768;
                document.body.classList.toggle('mobile', isMobile);
            }, 250);
        });
    }

    // Utility methods
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#8b5cf6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: 'VT323', monospace;
            font-size: 16px;
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;

        document.body.appendChild(notification);

        if (this.liveRegion) {
            this.liveRegion.textContent = message;
        }

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    setupEventListeners() {
        // Page visibility API for performance
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveProgress();
            }
        });

        // Store page start time
        localStorage.setItem('pageStartTime', Date.now());
    }
}

// Initialize platform when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.codedxPlatform = new CodedxPlatform();
    });
} else {
    window.codedxPlatform = new CodedxPlatform();
}

// Add CSS animations
if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        @keyframes ripple {
            to {
                transform: translate(-50%, -50%) scale(4);
                opacity: 0;
            }
        }
        
        .mobile .nav-menu {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
        }
        
        .mobile .nav-menu.active {
            transform: translateX(0);
        }
    `;
    document.head.appendChild(style);
} 