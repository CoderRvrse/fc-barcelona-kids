/* eslint-env browser */

(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = prefersReducedMotion.matches;

    // Ultra-defensive GSAP guard (removed unused variable)

    // Production error telemetry (console-based, no external deps)
    window.addEventListener("error", e => {
        console.log("[prod-error]", e.message, e.filename, e.lineno);
    });
    window.addEventListener("unhandledrejection", e => {
        console.log("[prod-rejection]", e.reason?.message || String(e.reason));
    });

    const onReady = (callback) => {
        if (document.readyState !== 'loading') {
            callback();
        } else {
            document.addEventListener('DOMContentLoaded', callback);
        }
    };

    onReady(() => {
        const body = document.body;

        window.addEventListener('load', () => {
            requestAnimationFrame(() => body.classList.add('page-loaded'));
        });

        const progressBar = document.querySelector('.scroll-progress span');
        const updateProgress = () => {
            if (!progressBar) return;
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = `${progress}%`;
        };
        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        const navToggle = document.querySelector('.nav-toggle');
        const primaryNav = document.querySelector('.primary-nav');

        const closeNav = () => {
            if (!navToggle) return;
            navToggle.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('nav-open');
        };

        if (navToggle && primaryNav) {
            navToggle.addEventListener('click', () => {
                const expanded = navToggle.getAttribute('aria-expanded') === 'true';
                navToggle.setAttribute('aria-expanded', String(!expanded));
                document.body.classList.toggle('nav-open', !expanded);
            });
        }

        primaryNav?.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => closeNav());
        });

        const smoothScrollTo = (target) => {
            if (!target) return;
            if (reduceMotion) {
                target.scrollIntoView({ behavior: 'auto', block: 'start' });
                return;
            }

            const startY = window.pageYOffset;
            const rect = target.getBoundingClientRect();
            const targetY = rect.top + window.pageYOffset - 72;
            const distance = targetY - startY;
            const duration = Math.min(1000, Math.max(450, Math.abs(distance)));
            let startTime = null;

            const easeInOutQuad = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / duration, 1);
                const eased = easeInOutQuad(progress);
                window.scrollTo(0, startY + distance * eased);
                if (progress < 1) requestAnimationFrame(step);
            };

            requestAnimationFrame(step);
        };

        document.querySelectorAll('a[href^="#"]').forEach((link) => {
            const targetId = link.getAttribute('href')?.slice(1);
            if (!targetId) return;
            link.addEventListener('click', (event) => {
                const target = document.getElementById(targetId);
                if (!target) return;
                event.preventDefault();
                closeNav();
                smoothScrollTo(target);
            });
        });

        const animateObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    animateObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.25, rootMargin: '0px 0px -10%' });

        document.querySelectorAll('[data-animate]').forEach((el) => animateObserver.observe(el));

        const sections = document.querySelectorAll('section[data-section]');
        const navLinks = Array.from(document.querySelectorAll('.nav-link'));

        const setActiveLink = (id) => {
            navLinks.forEach((link) => {
                const href = link.getAttribute('href') || '';
                link.classList.toggle('is-active', href === `#${id}`);
            });
        };

        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    if (id) setActiveLink(id);
                }
            });
        }, { threshold: 0.55 });

        sections.forEach((section) => sectionObserver.observe(section));
        setActiveLink('hero');

        const parallaxItems = Array.from(document.querySelectorAll('[data-parallax]'));
        if (parallaxItems.length && !reduceMotion) {
            let ticking = false;
            const applyParallax = () => {
                const scrollY = window.pageYOffset;
                parallaxItems.forEach((el) => {
                    const speed = parseFloat(el.dataset.speed || '0.2');
                    el.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
                });
                ticking = false;
            };
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(applyParallax);
                    ticking = true;
                }
            }, { passive: true });
            applyParallax();
        }

        const countObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.count || '0', 10);
                    if (!Number.isNaN(target)) {
                        if (reduceMotion) {
                            el.textContent = target.toLocaleString();
                        } else {
                            animateCount(el, target);
                        }
                    }
                    countObserver.unobserve(el);
                }
            });
        }, { threshold: 0.6 });

        document.querySelectorAll('[data-count]').forEach((el) => countObserver.observe(el));

        const animateCount = (el, target) => {
            const duration = 1600;
            const start = performance.now();
            const step = (now) => {
                const progress = Math.min((now - start) / duration, 1);
                const value = Math.floor(target * progress);
                el.textContent = value.toLocaleString();
                if (progress < 1) {
                    requestAnimationFrame(step);
                } else {
                    el.textContent = target.toLocaleString();
                }
            };
            requestAnimationFrame(step);
        };

        const skillObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const badge = entry.target;
                    const value = parseInt(badge.dataset.value || '0', 10);
                    const progress = Math.max(0, Math.min(100, value)) / 100;
                    badge.style.setProperty('--progress', progress.toString());
                    badge.classList.add('is-active');
                    skillObserver.unobserve(badge);
                }
            });
        }, { threshold: 0.6 });

        document.querySelectorAll('.skill-badge').forEach((badge) => skillObserver.observe(badge));

        window.addEventListener('load', () => {
            document.querySelectorAll('.skeleton').forEach((overlay) => overlay.classList.add('is-loaded'));
        });

        initCarousel(reduceMotion);
        initForm(reduceMotion);

        if (window.gsap && !reduceMotion) {
            const tl = window.gsap.timeline();
            // Guard helper to prevent GSAP missing target warnings
            const exists = sel => !!document.querySelector(sel);

            if (exists('.top-bar')) {
                tl.from('.top-bar', { y: -80, duration: 0.6, ease: 'power2.out' });
            }
            if (exists('.hero-kicker')) {
                tl.from('.hero-kicker', { opacity: 0, y: 30, duration: 0.4, ease: 'power2.out' }, '-=0.2');
            }
            if (exists('.hero-subtitle')) {
                tl.from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }, '-=0.2');
            }
            if (exists('.hero-cta .btn')) {
                tl.from('.hero-cta .btn', { opacity: 0, y: 24, duration: 0.45, stagger: 0.1, ease: 'power2.out' }, '-=0.2');
            }
            if (exists('.hero-statistics .stat-card')) {
                tl.from('.hero-statistics .stat-card', { opacity: 0, y: 30, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, '-=0.3');
            }

            // Animate new brand logo
            (function animateBrandLogo() {
                const el = document.getElementById("brandLogo");
                if (!el || !window.gsap) return;

                // subtle entrance
                window.gsap.set(el, { transformOrigin: "50% 50%", y: 2, scale: 0.94, opacity: 0 });
                window.gsap.to(el, {
                    y: 0,
                    scale: 1,
                    opacity: 1,
                    duration: 0.6,
                    ease: "power2.out",
                    overwrite: "auto"
                });

                // micro hover polish
                el.addEventListener("mouseenter", () => {
                    window.gsap.to(el, { y: -1, scale: 1.02, duration: 0.18, ease: "power1.out" });
                });
                el.addEventListener("mouseleave", () => {
                    window.gsap.to(el, { y: 0, scale: 1.0, duration: 0.2, ease: "power1.inOut" });
                });
            })();
        }
    });

    function initCarousel(reduceMotion) {
        const slider = document.querySelector('[data-carousel]');
        if (!slider) return;

        const track = slider.querySelector('.slider-track');
        const slides = Array.from(slider.querySelectorAll('.testimonial-slide'));
        const prevBtn = slider.querySelector('[data-carousel-prev]');
        const nextBtn = slider.querySelector('[data-carousel-next]');
        const dots = Array.from(slider.querySelectorAll('.dot'));
        let index = 0;
        let autoPlayId;

        const updateSlider = () => {
            const offset = -index * 100;
            if (track) {
                track.style.transform = `translateX(${offset}%)`;
            }
            slides.forEach((slide, i) => slide.classList.toggle('is-active', i === index));
            dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        };

        const goTo = (newIndex) => {
            if (newIndex < 0) newIndex = slides.length - 1;
            if (newIndex >= slides.length) newIndex = 0;
            index = newIndex;
            updateSlider();
        };

        prevBtn?.addEventListener('click', () => goTo(index - 1));
        nextBtn?.addEventListener('click', () => goTo(index + 1));
        dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

        const startAutoPlay = () => {
            if (reduceMotion) return;
            stopAutoPlay();
            autoPlayId = window.setInterval(() => goTo(index + 1), 6000);
        };

        const stopAutoPlay = () => {
            if (autoPlayId) {
                window.clearInterval(autoPlayId);
                autoPlayId = undefined;
            }
        };

        slider.addEventListener('mouseenter', stopAutoPlay);
        slider.addEventListener('mouseleave', startAutoPlay);

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAutoPlay();
            } else {
                startAutoPlay();
            }
        });

        let pointerStart = null;
        slider.addEventListener('pointerdown', (event) => {
            pointerStart = { x: event.clientX, time: Date.now(), id: event.pointerId };
            slider.setPointerCapture(event.pointerId);
        });

        slider.addEventListener('pointerup', (event) => {
            if (!pointerStart) return;
            const deltaX = event.clientX - pointerStart.x;
            const elapsed = Date.now() - pointerStart.time;
            if (Math.abs(deltaX) > 50 && elapsed < 600) {
                goTo(deltaX > 0 ? index - 1 : index + 1);
            }
            slider.releasePointerCapture(pointerStart.id);
            pointerStart = null;
        });

        updateSlider();
        startAutoPlay();
    }

    function initForm(reduceMotion) {
        const form = document.querySelector('.interest-form');
        if (!form) return;
        const statusEl = form.querySelector('.form-status');
        const submitBtn = form.querySelector('button[type="submit"]');
        const confettiContainer = document.querySelector('.confetti-container');
        const fields = Array.from(form.querySelectorAll('input, select, textarea'));

        const showMessage = (field, message, type = 'error') => {
            const msgEl = field.parentElement?.querySelector('.field-message');
            if (!msgEl) return;
            msgEl.textContent = message;
            msgEl.classList.toggle('success', type === 'success');
        };

        fields.forEach((field) => {
            field.addEventListener('input', () => {
                if (field.validity.valid) {
                    showMessage(field, 'Looks great!', 'success');
                } else {
                    showMessage(field, '');
                }
            });

            field.addEventListener('blur', () => {
                if (!field.validity.valid) {
                    const message = field.validationMessage || 'Please complete this field.';
                    showMessage(field, message);
                }
            });
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            let formValid = true;
            fields.forEach((field) => {
                if (!field.checkValidity()) {
                    formValid = false;
                    showMessage(field, field.validationMessage || 'Please fill out this field.');
                } else {
                    showMessage(field, 'Looks great!', 'success');
                }
            });

            if (!formValid) {
                if (statusEl) statusEl.textContent = 'Review highlighted fields before submitting.';
                return;
            }

            if (statusEl) statusEl.textContent = '';
            submitBtn?.classList.add('is-loading');

            window.setTimeout(() => {
                submitBtn?.classList.remove('is-loading');
                if (statusEl) statusEl.textContent = 'Visca! We have your submission and will reply soon.';
                form.reset();
                fields.forEach((field) => showMessage(field, ''));
                if (!reduceMotion) {
                    launchConfetti(confettiContainer);
                }
            }, 1100);
        });
    }

    function launchConfetti(container) {
        if (!container) return;
        const pieces = 24;
        for (let i = 0; i < pieces; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.top = `${Math.random() * 20}%`;
            piece.style.background = Math.random() > 0.5
                ? 'linear-gradient(135deg, #a50044, #ffcb05)'
                : 'linear-gradient(135deg, #004d98, #8fc1ff)';
            piece.style.animationDelay = `${Math.random() * 0.6}s`;
            piece.style.transform = `scale(${0.7 + Math.random() * 0.8})`;
            container.appendChild(piece);
            window.setTimeout(() => piece.remove(), 2000);
        }
    }

    window.addEventListener('error', (event) => {
        console.error('Global Error:', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error,
        });
    });

    window.safeAnimate = (element, animation) => {
        try {
            return window.gsap ? window.gsap.to(element, animation) : null;
        } catch (error) {
            console.warn('Animation failed:', error);
            return null;
        }
    };

    // Performance monitoring (development only)
    if ('performance' in window) {
        window.addEventListener('load', () => {
            const navTiming = performance.getEntriesByType('navigation')[0];
            if (navTiming && navTiming.loadEventEnd && navTiming.loadEventStart) {
                const loadTime = navTiming.loadEventEnd - navTiming.loadEventStart;
                const domTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
                if (loadTime > 0) console.log(`Page Load Time: ${Math.round(loadTime)}ms`);
                if (domTime > 0) console.log(`DOM Content Loaded: ${Math.round(domTime)}ms`);
            }
        });
    }

    if (!reduceMotion && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        let frameCount = 0;
        let frameStart = performance.now();

        const trackFPS = () => {
            frameCount += 1;
            const now = performance.now();
            const elapsed = now - frameStart;

            if (elapsed >= 1000) {
                const fps = Math.round((frameCount * 1000) / elapsed);
                console.log(`Current FPS: ${fps}`);
                frameCount = 0;
                frameStart = now;
            }

            requestAnimationFrame(trackFPS);
        };

        requestAnimationFrame(trackFPS);
    }

    // Back-to-top control functionality
    (function backToTopControl() {
        const btn = document.getElementById("backToTop");
        const topSentinel = document.getElementById("top-sentinel");
        if (!btn || !topSentinel) return;

        // show/hide with IntersectionObserver
        const show = () => btn.style.opacity = "1";
        const hide = () => btn.style.opacity = "0";
        btn.style.opacity = "0";

        if ("IntersectionObserver" in window) {
            new IntersectionObserver(([e]) => e.isIntersecting ? hide() : show(), { threshold: 0.01 })
                .observe(topSentinel);
        } else {
            // fallback
            const onScroll = () => (window.scrollY > window.innerHeight) ? show() : hide();
            window.addEventListener("scroll", onScroll, { passive: true });
            onScroll();
        }

        // click smooth-scroll + fun kick
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            try { window.scrollTo({ top: 0, behavior: "smooth" }); }
            catch { window.scrollTo(0, 0); }

            // little kick if GSAP present
            if (window.gsap) {
                window.gsap.fromTo(".bt-ball", { rotate: 0, scale: 1 }, { rotate: -18, scale: 1.06, duration: 0.18, ease: "power2.out" })
                    .then(() => window.gsap.to(".bt-ball", { rotate: 0, scale: 1, duration: 0.2, ease: "power2.inOut" }));
            }
        });

        // JS cleanup of stray orbs in bottom-right ~160x160 area
const KEEP = new Set([btn, ...btn.querySelectorAll("*")]);
const kill = (el) => {
    if (KEEP.has(el)) return false;
    const cs = getComputedStyle(el);
    const fixed = cs.position === "fixed";
    if (!fixed) return false;
            const r = el.getBoundingClientRect();
            const nearBR = (window.innerWidth - r.right <= 160) && (window.innerHeight - r.bottom <= 160);
            const smallish = (r.width * r.height) <= 40000; // ~200x200
            if (nearBR && smallish) { el.dataset.hiddenBy = "bt-cleanup"; el.style.display = "none"; return true; }
            return false;
        };
        // sweep a few frames after load
        requestAnimationFrame(() => requestAnimationFrame(() => {
            [...document.body.querySelectorAll("*")].forEach(kill);
        }));
})();
})(); // Close backToTopControl function

// ===== BARÇA TRADING CARDS v1 ==========================================

(function tradingCards() {
    const squadGrid = document.getElementById('squadGrid');
    if (!squadGrid) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        document.documentElement.classList.add('rm');
    }

    let currentlyFlipped = null;

    // Fetch and render squad data
    async function initTradingCards() {
        try {
            const dataUrl = new URL('./data/squad.json', location.href).toString();
            const response = await fetch(dataUrl, { cache: 'no-store' });
            const players = await response.json();
            renderTradingCards(players);
            initializeInteractions();
            initializeLazyLoading();
            initializeVisibilityObserver();
        } catch (error) {
            console.error('Failed to load squad data:', error);
            squadGrid.innerHTML = '<div class="error-message">Unable to load squad data</div>';
        }
    }

    // Render trading cards
    function renderTradingCards(players) {
        const fragment = document.createDocumentFragment();

        players.forEach(player => {
            const article = document.createElement('article');
            article.className = 'card';
            article.setAttribute('tabindex', '0');
            article.setAttribute('aria-label', `${player.name} trading card`);
            article.setAttribute('data-player', player.id);
            article.setAttribute('data-rarity', player.rarity);

            article.innerHTML = `
                <div class="card__glass"></div>
                <div class="card__wrap">
                    <div class="card__side card__front" aria-hidden="false">
                        <div class="card__shine" aria-hidden="true"></div>
                        <header class="card__header">
                            <span class="card__badge">#${player.number}</span>
                            <span class="card__rarity">${player.rarity}</span>
                        </header>
                        <img class="card__img"
                             loading="lazy"
                             decoding="async"
                             src="${player.img}"
                             onerror="this.src='assets/placeholder-coach.svg';"
                             alt="">
                        <h3 class="card__name">${player.name}</h3>
                        <p class="card__meta">${player.role} • ${player.position}</p>
                    </div>

                    <div class="card__side card__back" aria-hidden="true">
                        <h4 class="card__backTitle">Season <span>${player.season}</span></h4>
                        <div class="card__stats">
                            ${generateStatsHTML(player.stats)}
                        </div>
                        <div class="card__traits">
                            ${player.traits.map(trait => `<span class="chip">${trait}</span>`).join('')}
                        </div>
                        <button class="card__close" aria-label="Close details">×</button>
                    </div>
                </div>
            `;

            fragment.appendChild(article);
        });

        squadGrid.appendChild(fragment);
    }

    // Generate stats HTML
    function generateStatsHTML(stats) {
        const statLabels = {
            games: 'Games',
            goals: 'Goals',
            assists: 'Assists',
            cleanSheets: 'Clean Sheets',
            saves: 'Saves',
            savePct: 'Save %',
            xgPrevented: 'xG Prevented',
            shotsOnTarget: 'Shots on Target',
            xG: 'xG',
            dribbleSuccess: 'Dribble Success',
            chancesCreated: 'Chances Created',
            passAccuracy: 'Pass Accuracy',
            passesCompleted: 'Passes Completed',
            progCarries: 'Progressive Carries',
            tacklesWon: 'Tackles Won',
            pressures: 'Pressures',
            duelsWon: 'Duels Won',
            aerialWins: 'Aerial Wins',
            interceptions: 'Interceptions',
            keyPasses: 'Key Passes',
            dribbles: 'Dribbles',
            shots: 'Shots',
            crosses: 'Crosses',
            blocks: 'Blocks',
            clearances: 'Clearances'
        };

        return Object.entries(stats)
            .slice(0, 5) // Limit to 5 stats max
            .map(([key, value]) => {
                const label = statLabels[key] || key;
                const displayValue = (key === 'savePct' || key === 'passAccuracy' || key === 'dribbleSuccess')
                    ? `${value}%`
                    : key === 'xgPrevented' && value > 0
                    ? `+${value}`
                    : value;

                return `<div class="stat-item"><span>${label}</span><b>${displayValue}</b></div>`;
            })
            .join('');
    }

    // Initialize interactions
    function initializeInteractions() {
        // Card flip handlers
        squadGrid.addEventListener('click', handleCardClick);
        squadGrid.addEventListener('keydown', handleCardKeydown);

        // Click outside to unflip
        document.addEventListener('click', handleOutsideClick);

        // Parallax tilt (if motion not reduced)
        if (!prefersReducedMotion) {
            squadGrid.addEventListener('pointermove', handlePointerMove);
            squadGrid.addEventListener('pointerleave', handlePointerLeave);
        }
    }

    function handleCardClick(e) {
        const card = e.target.closest('.card');
        if (!card) return;

        const closeBtn = e.target.closest('.card__close');
        if (closeBtn) {
            e.preventDefault();
            e.stopPropagation();
            unflipCard(card);
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        flipCard(card);
    }

    function handleCardKeydown(e) {
        const card = e.target.closest('.card');
        if (!card) return;

        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flipCard(card);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (card.querySelector('.card__wrap').classList.contains('is-flipped')) {
                unflipCard(card);
            }
        }
    }

    function handleOutsideClick(e) {
        if (!e.target.closest('.card') && currentlyFlipped) {
            unflipCard(currentlyFlipped);
        }
    }

    function handlePointerMove(e) {
        const card = e.target.closest('.card');
        if (!card || card.querySelector('.card__wrap').classList.contains('is-flipped')) return;

        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 degrees
        const rotateY = ((x - centerX) / centerX) * 10;

        const cardWrap = card.querySelector('.card__wrap');
        cardWrap.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    function handlePointerLeave(e) {
        const card = e.target.closest('.card');
        if (!card || card.querySelector('.card__wrap').classList.contains('is-flipped')) return;

        const cardWrap = card.querySelector('.card__wrap');
        cardWrap.style.transform = '';
    }

    function flipCard(card) {
        const cardWrap = card.querySelector('.card__wrap');
        const frontFace = card.querySelector('.card__front');
        const backFace = card.querySelector('.card__back');

        // Unflip any currently flipped card
        if (currentlyFlipped && currentlyFlipped !== card) {
            unflipCard(currentlyFlipped);
        }

        // Toggle current card
        if (cardWrap.classList.contains('is-flipped')) {
            unflipCard(card);
        } else {
            cardWrap.classList.add('is-flipped');
            card.setAttribute('aria-expanded', 'true');
            frontFace.setAttribute('aria-hidden', 'true');
            backFace.setAttribute('aria-hidden', 'false');
            currentlyFlipped = card;

            // Reset any tilt transform
            if (!prefersReducedMotion) {
                cardWrap.style.transform = '';
            }
        }
    }

    function unflipCard(card) {
        const cardWrap = card.querySelector('.card__wrap');
        const frontFace = card.querySelector('.card__front');
        const backFace = card.querySelector('.card__back');

        cardWrap.classList.remove('is-flipped');
        card.setAttribute('aria-expanded', 'false');
        frontFace.setAttribute('aria-hidden', 'false');
        backFace.setAttribute('aria-hidden', 'true');

        if (currentlyFlipped === card) {
            currentlyFlipped = null;
        }
    }

    // Initialize lazy loading for images
    function initializeLazyLoading() {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });

        // Observe all card images
        document.querySelectorAll('.card__img').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Initialize visibility observer for entrance animations
    function initializeVisibilityObserver() {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    cardObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '-10% 0px',
            threshold: 0.3
        });

        // Observe all cards
        document.querySelectorAll('.card').forEach(card => {
            cardObserver.observe(card);
        });
    }

    // Initialize trading cards when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTradingCards);
    } else {
        initTradingCards();
    }
})();

// Formation Lab Integration
(() => {
    function loadFormationLab() {
        // Only load if Formation Lab section exists
        if (document.getElementById('flabPitch')) {
            const script = document.createElement('script');
            script.src = './scripts/formation.js?v=22';
            script.defer = true;
            document.head.appendChild(script);
        }
    }

    // Initialize Formation Lab when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadFormationLab);
    } else {
        loadFormationLab();
    }
})();





