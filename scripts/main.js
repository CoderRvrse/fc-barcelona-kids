(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reduceMotion = prefersReducedMotion.matches;

    // Ultra-defensive GSAP guard
    const gsapSafe = (...args) => (window.gsap?.to ? window.gsap.to(...args) : null);

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

        // ClipPath hero text reveal with ball animation
        (() => {
            const TEXT = 'FC BARCELONA';
            const svg = document.querySelector('.hero-svg');
            const maskedGroup = document.getElementById('maskedGroup');
            const revealRect = document.getElementById('revealRect');
            const titleMasked = document.getElementById('titleMasked');
            const titleSolid = document.getElementById('titleSolid');
            const ball = document.getElementById('heroBall');

            if (!svg || !revealRect || !titleMasked || !titleSolid || !ball) return;

            // Ensure consistent text (defensive)
            titleMasked.textContent = TEXT;
            titleSolid.textContent = TEXT;

            const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (prefersReduced) {
                maskedGroup?.setAttribute('display', 'none');
                titleSolid.style.opacity = '1';
                return;
            }

            // Ball animation: roll → drop → bounce beside the 'A'
            let rafId = 0;
            let ballAnimationId = 0;
            let rotation = 0;

            // Helper: apply translate/rotate to ball
            const setBall = (x, y, rot) => {
                if (!ball) return;
                const r = 56; // ball radius (112px / 2)
                ball.style.transform = `translate(${x - r}px, ${y - r}px) rotate(${rot}deg)`;
            };

            function animateBallSequence() {
                if (!textBBox) return;

                // Compute target position beside the 'A'
                const vb = svg.viewBox.baseVal;
                const cx = vb.x + vb.width / 2;
                const cy = vb.y + vb.height / 2;

                const r = 56; // ball radius
                const BALL_GAP = 24; // space between A and ball
                const targetXpx = Math.round(textBBox.x + textBBox.width + BALL_GAP + r);
                const baselineY = Math.round(cy + textBBox.height * 0.10); // visually nice baseline
                const targetYpx = Math.round(baselineY);

                // Position ball for start of animation
                if (ball) {
                    ball.style.position = 'absolute';
                    ball.style.willChange = 'transform';
                }

                // Animation durations
                const rollDuration = 0.9; // seconds
                const drop = Math.max(14, Math.round(r * 0.18));
                const bounceDuration = 0.5; // seconds

                const prefersReduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

                if (prefersReduce || !ball) {
                    // No animations: put ball at target and show solid text
                    setBall(targetXpx, targetYpx, 0);
                    setProgress(1);
                    return;
                }

                if (window.gsap) {
                    // GSAP timeline version
                    const startX = Math.round(targetXpx + r * 3); // start to the right, roll in
                    const startY = targetYpx;

                    setBall(startX, startY, 0);

                    const tl = gsap.timeline({
                        defaults: { ease: 'power3.out' }
                    });

                    tl.to({}, {
                        duration: rollDuration,
                        onUpdate() {
                            const t = this.progress(); // 0→1
                            const x = startX + (targetXpx - startX) * t;
                            rotation = 360 * t * 1.5; // spin while rolling
                            setBall(x, startY, rotation);
                            // Drive reveal progress with roll
                            setProgress(Math.min(0.98, t)); // final snap happens inside setProgress
                        }
                    })
                    .to(ball, {
                        duration: bounceDuration,
                        // drop + bounce using y transform
                        onStart() {
                            // ensure we ended roll at target
                            setBall(targetXpx, startY, rotation);
                        },
                        onUpdate() {
                            const t = this.progress(); // 0→1
                            // simple bounce curve (yoyo-like)
                            const y = targetYpx + (t < 0.5 ? drop * (t / 0.5) : drop * (1 - (t - 0.5) / 0.5));
                            setBall(targetXpx, y, rotation);
                        },
                        onComplete() {
                            setBall(targetXpx, targetYpx, rotation);
                            // Ensure reveal is fully snapped + solid title shown
                            setProgress(1);
                        }
                    });
                } else {
                    // RAF fallback
                    const start = performance.now();
                    const startX = Math.round(targetXpx + r * 3);
                    const startY = targetYpx;
                    setBall(startX, startY, 0);

                    const rollMs = rollDuration * 1000;
                    const bounceMs = bounceDuration * 1000;

                    const step = (now) => {
                        const elapsed = now - start;
                        if (elapsed <= rollMs) {
                            const t = elapsed / rollMs;
                            const x = startX + (targetXpx - startX) * t;
                            rotation = 360 * t * 1.5;
                            setBall(x, startY, rotation);
                            setProgress(Math.min(0.98, t));
                            ballAnimationId = requestAnimationFrame(step);
                            return;
                        }

                        const dropElapsed = elapsed - rollMs;
                        if (dropElapsed <= bounceMs) {
                            const t = dropElapsed / bounceMs; // 0→1
                            const y = targetYpx + (t < 0.5 ? drop * (t / 0.5) : drop * (1 - (t - 0.5) / 0.5));
                            setBall(targetXpx, y, rotation);
                            ballAnimationId = requestAnimationFrame(step);
                            return;
                        }

                        setBall(targetXpx, targetYpx, rotation);
                        setProgress(1); // ensure solid + snap
                    };

                    ballAnimationId = requestAnimationFrame(step);
                }
            }

            let textBBox = null;
            let rectX = 0;
            let totalWidth = 0;
            const LEFT_GUARD = 120;  // generous margin before centered 'F'
            const RIGHT_GUARD = 120; // extra generous overshoot past 'A' to eliminate any clipping
            const TOP_GUARD = 24;    // vertical padding above text
            const BOT_GUARD = 24;    // vertical padding below text

            function setProgress(progress) {
                if (!textBBox) return false;

                // Clamp + pixel-round for stability
                progress = Math.max(0, Math.min(1, progress));

                if (progress >= 0.98) {
                    // Hard snap +2px to obliterate any subpixel clipping on the last glyph
                    const width = totalWidth + 2;
                    revealRect.setAttribute('width', String(width));
                    finishReveal();
                    return true;
                }

                const width = Math.round((totalWidth + 2) * progress);
                revealRect.setAttribute('width', String(width));
                return false;
            }

            function finishReveal() {
                // Show solid, hide masked for clean final state
                titleSolid.style.opacity = '1';
                setTimeout(() => maskedGroup?.setAttribute('display', 'none'), 350);
                cancelAnimationFrame(rafId);
                cancelAnimationFrame(ballAnimationId);
            }

            // Expose for debugging and replay
            window.__heroRevealSetProgress = setProgress;

            // Safety net: check if ball is already past end (handles race conditions)
            function isBallPastEnd() {
                if (!textBBox) return false;
                const ballBounds = ball.getBoundingClientRect();
                const ballCenterX = (ballBounds.left + ballBounds.right) / 2;
                const endThreshold = textBBox.x + textBBox.width + RIGHT_GUARD;
                return ballCenterX >= endThreshold;
            }

            async function runHeroReveal(replay = false) {
                // Wait for fonts to avoid glyph jumps
                if (document.fonts?.ready) {
                    try {
                        await document.fonts.ready;
                    } catch (e) {
                        console.log('[font-loading] Font ready promise failed, continuing anyway');
                    }
                }

                // Compute text bbox once after fonts load for stable glyph geometry
                if (!textBBox) {
                    // Force layout and ensure text is visible for measurement
                    titleMasked.setAttribute('visibility', 'visible');

                    // Get bbox of centered text
                    textBBox = titleMasked.getBBox();

                    // For centered text with text-anchor="middle", start the reveal well before left edge
                    rectX = Math.round(textBBox.x - LEFT_GUARD);
                    const rectY = Math.round(textBBox.y - TOP_GUARD);
                    const rectH = Math.round(textBBox.height + TOP_GUARD + BOT_GUARD);
                    totalWidth = Math.round(textBBox.width + LEFT_GUARD + RIGHT_GUARD);

                    // Set initial rect position and dimensions
                    revealRect.setAttribute('x', String(rectX));
                    revealRect.setAttribute('y', String(rectY));
                    revealRect.setAttribute('height', String(rectH));
                    revealRect.setAttribute('width', '0');

                    console.log('[hero-reveal] Centered FC BARCELONA bounds:', {
                        text: TEXT,
                        centered: 'text-anchor=middle',
                        bboxX: textBBox.x,
                        bboxWidth: textBBox.width,
                        rectX: rectX,
                        totalWidth: totalWidth,
                        leftGuard: LEFT_GUARD,
                        rightGuard: RIGHT_GUARD,
                        svgViewBox: '0 0 1200 220'
                    });
                }

                // Reset for replay
                if (replay) {
                    cancelAnimationFrame(rafId);
                    cancelAnimationFrame(ballAnimationId);
                    maskedGroup?.setAttribute('display', null);
                    revealRect.setAttribute('width', '0');
                    titleSolid.style.opacity = '0';
                    ball.style.transform = '';
                }

                // Safety net: if ball is already past end, force final state
                if (isBallPastEnd()) {
                    finishReveal();
                    return;
                }

                // Start the new ball sequence (roll → drop → bounce)
                animateBallSequence();
            }

            // Expose for replay functionality
            window.runHeroReveal = runHeroReveal;

            // Intersection observer for initial trigger
            let playedOnce = false;
            const heroObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !playedOnce) {
                        playedOnce = true;
                        runHeroReveal();
                    }
                });
            }, { threshold: 0.1 });

            heroObserver.observe(svg);

            // Page hidden: pause updates
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    cancelAnimationFrame(rafId);
                    cancelAnimationFrame(ballAnimationId);
                } else if (!prefersReduced) {
                    rafId = requestAnimationFrame(tick);
                }
            });
        })();

        // Replay button functionality
        (() => {
            const replayBtn = document.querySelector('.hero-replay');
            if (!replayBtn || reduceMotion) return;

            replayBtn.addEventListener('click', () => {
                if (typeof window.runHeroReveal === 'function') {
                    window.runHeroReveal(true);
                }
            });
        })();

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
            tl.from('.top-bar', { y: -80, duration: 0.6, ease: 'power2.out' })
                .from('.hero-kicker', { opacity: 0, y: 30, duration: 0.4, ease: 'power2.out' }, '-=0.2')
                .from('.hero-title .title-line', { opacity: 0, y: 40, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, '-=0.1')
                .from('.hero-subtitle', { opacity: 0, y: 30, duration: 0.5, ease: 'power2.out' }, '-=0.2')
                .from('.hero-cta .btn', { opacity: 0, y: 24, duration: 0.45, stagger: 0.1, ease: 'power2.out' }, '-=0.2')
                .from('.hero-statistics .stat-card', { opacity: 0, y: 30, duration: 0.4, stagger: 0.08, ease: 'power2.out' }, '-=0.3');

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
})();
