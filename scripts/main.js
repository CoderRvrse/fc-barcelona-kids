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

        // Cap line rolling ball with baseline resting - pixel-perfect implementation
        (() => {
          const TEXT = 'FC BARCELONA';              // final string
          const GAP_RIGHT = 16;                      // gap between A and ball
          const LEFT_GUARD = 100;                    // reveal start overshoot
          const RIGHT_GUARD = 160;                   // reveal end overshoot
          const OFFSET_Y = 4;                        // baseline hug tweak
          const TOP_GAP = 8;                         // tiny gap above cap line for roll

          const svg    = document.getElementById('heroTitle');
          const masked = document.getElementById('titleMasked');
          const solid  = document.getElementById('titleSolid');
          const rect   = document.getElementById('revealRectPx');
          const ball   = document.getElementById('heroBall');
          const idle   = document.getElementById('heroBallIdle');

          if (!svg || !masked || !solid || !rect || !ball || !idle) return;

          masked.textContent = TEXT;
          solid.textContent  = TEXT;

          // Utility: get numeric px from CSS var
          const ballSize = () => {
            const v = getComputedStyle(document.documentElement).getPropertyValue('--ball-size').trim();
            return parseFloat(v) || 120;
          };

          // Convert SVG local coords → page pixels
          function svgToPage(x, y) {
            const ctm = svg.getScreenCTM();
            return {
              x: ctm.a * x + ctm.c * y + ctm.e,
              y: ctm.b * x + ctm.d * y + ctm.f
            };
          }

          async function measureAndAnimate() {
            try { await document.fonts?.ready; } catch {}

            // Ensure it has layout
            masked.setAttribute('visibility', 'visible');

            // Full text bbox (in SVG user space)
            const textBox = masked.getBBox(); // {x,y,width,height}
            const baselineY = textBox.y + textBox.height;  // bottom line
            const capY      = textBox.y;                   // top line

            // Final 'A' glyph extent (precise)
            const lastIdx = TEXT.trim().length - 1;
            let aBox;
            try {
              aBox = masked.getExtentOfChar(lastIdx);
            } catch {
              // Fallback: estimate last glyph box
              const avg = textBox.width / Math.max(1, TEXT.trim().length);
              aBox = { x: textBox.x + textBox.width - avg, y: textBox.y, width: avg, height: textBox.height };
            }

            // ----- Reveal rect setup -----
            const rectX   = Math.round(textBox.x - LEFT_GUARD);
            const rectW   = Math.round(textBox.width + LEFT_GUARD + RIGHT_GUARD);
            rect.setAttribute('x', rectX);
            rect.setAttribute('y', Math.floor(textBox.y) - 20);
            rect.setAttribute('height', Math.ceil(textBox.height) + 40);
            rect.setAttribute('width', '0');

            // ----- Path key points (in SVG user space) -----
            const B = ballSize();
            const R = B / 2;

            // Rolling start (a little before the text)
            const startX = rectX - R;            // left of reveal rect
            const startY = capY - R - TOP_GAP;   // sits on top of cap line

            // Rolling end directly over the final A's right edge + GAP_RIGHT
            const rollEndX = aBox.x + aBox.width + GAP_RIGHT;
            const rollEndY = startY;

            // Drop destination — baseline hug at A's right
            const restX = rollEndX;
            const restY = baselineY - R + OFFSET_Y;

            // ----- Pre-position both balls -----
            // Rolling ball starts at (startX,startY)
            const sPage = svgToPage(startX, startY);
            ball.style.transform = `translate(${sPage.x}px, ${sPage.y}px)`;
            ball.style.opacity = '1';

            // Idle spinner is pre-placed at final resting coords, but hidden
            const rPage = svgToPage(restX, restY);
            idle.style.transform = `translate(${rPage.x}px, ${rPage.y}px)`;
            idle.style.opacity = '0';

            // ----- Drive the reveal rect width in sync with roll progress -----
            function setRevealProgress(p) {
              const clamp = Math.max(0, Math.min(1, p));
              if (clamp >= 0.98) {
                rect.setAttribute('width', String(rectW)); // snap to full
                return;
              }
              rect.setAttribute('width', String(Math.round(rectW * clamp)));
            }

            // ----- Animate (GSAP if available; otherwise RAF) -----
            const hasGSAP = !!window.gsap;
            const ROLL_MS = 900;
            const DROP_MS = 380;

            function placeBall(x, y, rot = 0) {
              const p = svgToPage(x, y);
              ball.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${rot}deg)`;
            }

            function finish() {
              // solid on, masked off
              solid.style.opacity = '1';
              setTimeout(() => masked.remove(), 400);

              // hide rolling, show idle at the exact same spot
              ball.style.opacity = '0';
              idle.style.opacity = '1';
            }

            if (hasGSAP) {
              const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

              // Roll across cap line
              tl.to({ t: 0 }, {
                duration: ROLL_MS / 1000,
                t: 1,
                onUpdate(self) {
                  const t = self.targets()[0].t;
                  const x = startX + (rollEndX - startX) * t;
                  const y = rollEndY;
                  placeBall(x, y, t * 360);
                  setRevealProgress(t);
                }
              });

              // Drop to the baseline hug at A's right
              tl.to({ y: rollEndY }, {
                duration: DROP_MS / 1000,
                y: restY,
                ease: "bounce.out",
                onUpdate(self) {
                  placeBall(rollEndX, self.targets()[0].y, 360);
                  setRevealProgress(1);
                },
                onComplete: finish
              });
            } else {
              // RAF fallback
              const t0 = performance.now();
              const tRollEnd = t0 + ROLL_MS;
              const tDropEnd = tRollEnd + DROP_MS;

              function step(now) {
                if (now <= tRollEnd) {
                  const k = (now - t0) / ROLL_MS;
                  const x = startX + (rollEndX - startX) * k;
                  placeBall(x, rollEndY, k * 360);
                  setRevealProgress(k);
                  requestAnimationFrame(step);
                } else if (now <= tDropEnd) {
                  const k = (now - tRollEnd) / DROP_MS;
                  const y = rollEndY + (restY - rollEndY) * k;
                  placeBall(rollEndX, y, 360);
                  setRevealProgress(1);
                  requestAnimationFrame(step);
                } else {
                  placeBall(rollEndX, restY, 360);
                  setRevealProgress(1);
                  finish();
                }
              }
              requestAnimationFrame(step);
            }

            // On resize, recompute everything (debounced)
            let rid;
            window.addEventListener('resize', () => {
              cancelAnimationFrame(rid);
              rid = requestAnimationFrame(() => {
                // restart measurement + layout, skip animation for simplicity
                measureAndPlaceIdleOnly();
              });
            });

            // Utility: place only the idle spinner and finalize text (used by resize)
            function measureAndPlaceIdleOnly() {
              const box = masked.getBBox();
              const base = box.y + box.height;
              let lastBox;
              try { lastBox = masked.getExtentOfChar(lastIdx); }
              catch {
                const avg = box.width / Math.max(1, TEXT.trim().length);
                lastBox = { x: box.x + box.width - avg, y: box.y, width: avg, height: box.height };
              }
              const restX2 = lastBox.x + lastBox.width + GAP_RIGHT;
              const restY2 = base - R + OFFSET_Y;
              const r2 = svgToPage(restX2, restY2);
              idle.style.transform = `translate(${r2.x}px, ${r2.y}px)`;
              idle.style.opacity = '1';
              ball.style.opacity = '0';
              solid.style.opacity = '1';
              rect.setAttribute('width', String(rectW));
            }
          }

          if (document.readyState !== 'loading') measureAndAnimate();
          else document.addEventListener('DOMContentLoaded', measureAndAnimate, { once: true });
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
