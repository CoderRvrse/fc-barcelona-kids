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

        // ========= HERO ROLLING BALL ANIMATION (Greenfield Rebuild) =========

        /**
         * Configuration object for precise control of animation behavior
         */
        const HERO_CONFIG = {
          text: 'FC BARCELONA',
          ballSize: 120,            // px
          capTopGap: 8,             // px gap above cap line during roll
          endGapRight: 16,          // px between A's right edge and ball
          baselineYOffset: 4,       // small +Y after drop to sit on baseline
          rollDuration: 900,        // ms
          dropDuration: 380,        // ms
          ease: 'power3.out',       // if using GSAP; otherwise implement cubic
          revealOvershootLeft: 100, // px
          revealOvershootRight: 160 // px
        };

        /**
         * Initialize hero animation system
         */
        function initHero(config = HERO_CONFIG) {
          // DOM elements
          const heroSection = document.getElementById('hero');
          const svg = document.getElementById('heroTitle');
          const ballRolling = document.getElementById('heroBall');
          const ballIdle = document.getElementById('heroBallIdle');

          if (!heroSection || !svg || !ballRolling || !ballIdle) {
            console.warn('[Hero] Required DOM elements not found');
            return;
          }

          // Check for reduced motion preference
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          if (prefersReducedMotion) {
            showFinalState();
            return;
          }

          // State variables
          let isAnimating = false;
          let geometry = null;

          // Dev toggle for testing (set window.__heroSkipAnimation = true to skip to final state)
          if (window.__heroSkipAnimation) {
            showFinalState();
            return;
          }

          /**
           * Build SVG structure with text and reveal mask
           */
          function buildSVGStructure() {
            // Get container dimensions
            const rect = svg.getBoundingClientRect();
            const viewBoxWidth = Math.max(1200, rect.width);
            const viewBoxHeight = Math.max(200, rect.height);

            svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Clear existing content
            svg.innerHTML = '';

            // Add title element
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = config.text;
            title.id = 'heroTitleLbl';
            svg.appendChild(title);

            // Create defs for clipPath
            const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
            clipPath.id = 'textRevealClip';
            clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');

            const clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            clipRect.id = 'revealRect';
            clipRect.setAttribute('x', '0');
            clipRect.setAttribute('y', '0');
            clipRect.setAttribute('width', '0');
            clipRect.setAttribute('height', '0');
            clipRect.setAttribute('rx', '8');
            clipRect.setAttribute('ry', '8');

            clipPath.appendChild(clipRect);
            defs.appendChild(clipPath);
            svg.appendChild(defs);

            // Masked text (revealed progressively)
            const maskedText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            maskedText.id = 'titleMasked';
            maskedText.textContent = config.text;
            maskedText.setAttribute('x', `${viewBoxWidth / 2}`);
            maskedText.setAttribute('y', `${viewBoxHeight / 2}`);
            maskedText.setAttribute('clip-path', 'url(#textRevealClip)');
            svg.appendChild(maskedText);

            // Solid text (final state)
            const solidText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            solidText.id = 'titleSolid';
            solidText.textContent = config.text;
            solidText.setAttribute('x', `${viewBoxWidth / 2}`);
            solidText.setAttribute('y', `${viewBoxHeight / 2}`);
            solidText.style.opacity = '0';
            solidText.style.transition = 'opacity 0.35s ease';
            svg.appendChild(solidText);

            return { maskedText, solidText, clipRect };
          }

          /**
           * Calculate precise geometry for animation paths
           */
          async function calculateGeometry() {
            // Wait for fonts to load
            try {
              await document.fonts.ready;
            } catch (e) {
              console.log('[Hero] Font loading failed, continuing anyway');
            }

            const { maskedText, solidText, clipRect } = buildSVGStructure();

            // Force layout and get text metrics
            maskedText.setAttribute('visibility', 'visible');
            const textBBox = maskedText.getBBox();

            // Calculate key coordinates
            const capLineY = textBBox.y; // Top of text
            const baselineY = textBBox.y + textBBox.height; // Bottom of text

            // Get final 'A' glyph position
            const lastCharIndex = config.text.trim().length - 1;
            let lastCharBox;

            try {
              lastCharBox = maskedText.getExtentOfChar(lastCharIndex);
            } catch {
              // Fallback: estimate based on average character width
              const avgCharWidth = textBBox.width / config.text.trim().length;
              lastCharBox = {
                x: textBBox.x + textBBox.width - avgCharWidth,
                y: textBBox.y,
                width: avgCharWidth,
                height: textBBox.height
              };
            }

            // Get ball size from CSS variable
            const ballSize = parseFloat(
              getComputedStyle(document.documentElement)
                .getPropertyValue('--ball-size')
                .trim()
            ) || config.ballSize;

            const ballRadius = ballSize / 2;

            // Calculate animation coordinates (in SVG space)
            const startX = textBBox.x - config.revealOvershootLeft;
            const startY = capLineY - ballRadius - config.capTopGap;

            const rollEndX = lastCharBox.x + lastCharBox.width + config.endGapRight;
            const rollEndY = startY; // Same Y as start (rolling along cap line)

            const finalX = rollEndX;
            const finalY = baselineY - ballRadius + config.baselineYOffset;

            // Setup reveal clipPath
            const clipX = Math.round(textBBox.x - config.revealOvershootLeft);
            const clipY = Math.round(textBBox.y - 20);
            const clipHeight = Math.round(textBBox.height + 40);
            const clipMaxWidth = Math.round(textBBox.width + config.revealOvershootLeft + config.revealOvershootRight);

            clipRect.setAttribute('x', String(clipX));
            clipRect.setAttribute('y', String(clipY));
            clipRect.setAttribute('height', String(clipHeight));
            clipRect.setAttribute('width', '0');

            return {
              textBBox,
              lastCharBox,
              ballSize,
              ballRadius,
              startX,
              startY,
              rollEndX,
              rollEndY,
              finalX,
              finalY,
              clipX,
              clipY,
              clipHeight,
              clipMaxWidth,
              maskedText,
              solidText,
              clipRect
            };
          }

          /**
           * Convert SVG coordinates to page coordinates
           */
          function svgToPageCoords(svgX, svgY) {
            const ctm = svg.getScreenCTM();
            if (!ctm) return { x: svgX, y: svgY };

            return {
              x: ctm.a * svgX + ctm.c * svgY + ctm.e,
              y: ctm.b * svgX + ctm.d * svgY + ctm.f
            };
          }

          /**
           * Position a ball element at SVG coordinates
           */
          function positionBall(ballElement, svgX, svgY, rotation = 0) {
            const pageCoords = svgToPageCoords(svgX, svgY);
            const ballRadius = geometry.ballRadius;

            ballElement.style.transform =
              `translate(${pageCoords.x - ballRadius}px, ${pageCoords.y - ballRadius}px) rotate(${rotation}deg)`;
          }

          /**
           * Update reveal progress (0 to 1)
           */
          function setRevealProgress(progress) {
            if (!geometry) return;

            const clampedProgress = Math.max(0, Math.min(1, progress));
            const width = Math.round(geometry.clipMaxWidth * clampedProgress);

            geometry.clipRect.setAttribute('width', String(width));

            // Snap to full width at 98% to prevent clipping
            if (clampedProgress >= 0.98) {
              geometry.clipRect.setAttribute('width', String(geometry.clipMaxWidth));
            }
          }

          /**
           * Complete animation and show final state
           */
          function finishAnimation() {
            if (!geometry) return;

            // Show solid text
            geometry.solidText.style.opacity = '1';

            // Hide rolling ball, show idle ball
            ballRolling.style.opacity = '0';
            ballIdle.style.opacity = '1';

            // Position idle ball at final coordinates
            positionBall(ballIdle, geometry.finalX, geometry.finalY);

            // Clean up masked text after transition
            setTimeout(() => {
              if (geometry.maskedText.parentNode) {
                geometry.maskedText.style.display = 'none';
              }
            }, 400);

            isAnimating = false;
          }

          /**
           * Show final state immediately (for reduced motion or dev toggle)
           */
          function showFinalState() {
            calculateGeometry().then(geom => {
              geometry = geom;

              // Show solid text
              geometry.solidText.style.opacity = '1';
              geometry.maskedText.style.display = 'none';

              // Hide rolling ball, show idle ball at final position
              ballRolling.style.opacity = '0';
              ballIdle.style.opacity = '1';
              positionBall(ballIdle, geometry.finalX, geometry.finalY);

              // Set full reveal
              setRevealProgress(1);
            });
          }

          /**
           * Run the rolling ball animation
           */
          async function runAnimation() {
            if (isAnimating) return;
            isAnimating = true;

            geometry = await calculateGeometry();

            // Position rolling ball at start
            positionBall(ballRolling, geometry.startX, geometry.startY);
            ballRolling.style.opacity = '1';

            // Position idle ball at final location (hidden)
            positionBall(ballIdle, geometry.finalX, geometry.finalY);
            ballIdle.style.opacity = '0';

            // Animate with GSAP if available, otherwise use RAF
            if (window.gsap) {
              animateWithGSAP();
            } else {
              animateWithRAF();
            }
          }

          /**
           * GSAP animation implementation
           */
          function animateWithGSAP() {
            const tl = window.gsap.timeline({
              defaults: { ease: config.ease }
            });

            // Rolling phase
            tl.to({ progress: 0 }, {
              duration: config.rollDuration / 1000,
              progress: 1,
              onUpdate: function() {
                const t = this.targets()[0].progress;
                const x = geometry.startX + (geometry.rollEndX - geometry.startX) * t;
                const rotation = t * 360 * 2; // 2 full rotations during roll

                positionBall(ballRolling, x, geometry.rollEndY, rotation);
                setRevealProgress(t);
              }
            });

            // Dropping phase
            tl.to({ y: geometry.rollEndY }, {
              duration: config.dropDuration / 1000,
              y: geometry.finalY,
              ease: 'bounce.out',
              onUpdate: function() {
                positionBall(ballRolling, geometry.rollEndX, this.targets()[0].y, 720);
                setRevealProgress(1);
              },
              onComplete: finishAnimation
            });
          }

          /**
           * RequestAnimationFrame fallback animation
           */
          function animateWithRAF() {
            const startTime = performance.now();
            const rollEndTime = startTime + config.rollDuration;
            const dropEndTime = rollEndTime + config.dropDuration;

            function step(currentTime) {
              if (currentTime <= rollEndTime) {
                // Rolling phase
                const progress = (currentTime - startTime) / config.rollDuration;
                const easedProgress = easeOutCubic(progress);
                const x = geometry.startX + (geometry.rollEndX - geometry.startX) * easedProgress;
                const rotation = easedProgress * 360 * 2;

                positionBall(ballRolling, x, geometry.rollEndY, rotation);
                setRevealProgress(easedProgress);

                requestAnimationFrame(step);
              } else if (currentTime <= dropEndTime) {
                // Dropping phase
                const dropProgress = (currentTime - rollEndTime) / config.dropDuration;
                const easedDrop = easeOutBounce(dropProgress);
                const y = geometry.rollEndY + (geometry.finalY - geometry.rollEndY) * easedDrop;

                positionBall(ballRolling, geometry.rollEndX, y, 720);
                setRevealProgress(1);

                requestAnimationFrame(step);
              } else {
                // Animation complete
                positionBall(ballRolling, geometry.finalX, geometry.finalY, 720);
                setRevealProgress(1);
                finishAnimation();
              }
            }

            requestAnimationFrame(step);
          }

          /**
           * Cubic ease-out function
           */
          function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 3);
          }

          /**
           * Bounce ease-out function
           */
          function easeOutBounce(t) {
            const n1 = 7.5625;
            const d1 = 2.75;

            if (t < 1 / d1) {
              return n1 * t * t;
            } else if (t < 2 / d1) {
              return n1 * (t -= 1.5 / d1) * t + 0.75;
            } else if (t < 2.5 / d1) {
              return n1 * (t -= 2.25 / d1) * t + 0.9375;
            } else {
              return n1 * (t -= 2.625 / d1) * t + 0.984375;
            }
          }

          /**
           * Handle window resize
           */
          function handleResize() {
            if (!geometry) return;

            // Recalculate geometry and reposition idle ball if animation is complete
            if (!isAnimating) {
              calculateGeometry().then(newGeometry => {
                geometry = newGeometry;
                positionBall(ballIdle, geometry.finalX, geometry.finalY);
                setRevealProgress(1);
              });
            }
          }

          // Setup resize handler with debouncing
          let resizeTimeout;
          window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 150);
          });

          // Setup intersection observer for initial trigger
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting && !isAnimating) {
                runAnimation();
                observer.unobserve(entry.target);
              }
            });
          }, { threshold: 0.1 });

          observer.observe(heroSection);

          // Expose API for testing and manual control
          window.__heroAnimation = {
            run: runAnimation,
            showFinal: showFinalState,
            config: config
          };
        }

        // Initialize hero animation when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => initHero(HERO_CONFIG));
        } else {
          initHero(HERO_CONFIG);
        }

        // ========= SAFE AUTOPLAY PATCH =========
        // Ensures animation runs reliably even if gates fail
        (() => {
          // ---- knobs ----
          const AUTOPLAY = true;          // force a run on first view
          const IO_THRESHOLD = 0.15;      // 15% of hero visible
          const IO_ROOT_MARGIN = '0px 0px -20% 0px'; // trigger slightly before fully in view
          const AUTORUN_TIMEOUT_MS = 1800; // fallback if IO never fires
          // ----------------

          const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

          // guard: API must exist
          if (!window.__heroAnimation) return;

          // if we intentionally skip, bail early
          if (window.__heroSkipAnimation === true) return;

          // ensure idle/rolling balls have the intended initial vis
          const rollBall = document.getElementById('heroBall');
          const idleBall = document.getElementById('heroBallIdle');
          if (rollBall) rollBall.style.opacity = '0'; // will be shown on run()
          if (idleBall) idleBall.style.opacity = '0'; // shown after run() finishes

          const runOnce = () => {
            if (prefersReduced) {
              window.__heroAnimation.showFinal?.();
              return;
            }
            window.__heroAnimation.run?.();
            // clean up any observers/timeouts when we do run
            obs?.disconnect?.();
            if (autorunTimer) clearTimeout(autorunTimer);
          };

          let autorunTimer = null;
          let obs = null;

          // fall back if visibility was hidden on load (e.g., background tab)
          const whenVisible = (fn) => {
            if (document.visibilityState === 'visible') fn();
            else {
              const onVis = () => {
                if (document.visibilityState === 'visible') {
                  document.removeEventListener('visibilitychange', onVis);
                  fn();
                }
              };
              document.addEventListener('visibilitychange', onVis);
            }
          };

          // Fonts gate — only if your hero waits on fonts. If not, you can remove.
          const onFontsReady = async () => {
            try {
              await document.fonts?.ready;
            } catch (e) {
              // Font loading failed, continue anyway
              console.warn('Font loading failed:', e);
            }
          };

          const bootstrap = async () => {
            await onFontsReady();

            // IntersectionObserver gating (preferred)
            const hero = document.getElementById('hero') || document.getElementById('heroTitle') || document.body;
            if ('IntersectionObserver' in window) {
              obs = new IntersectionObserver((entries) => {
                const e = entries[0];
                if (e?.isIntersecting && e.intersectionRatio >= IO_THRESHOLD) runOnce();
              }, { root: null, threshold: IO_THRESHOLD, rootMargin: IO_ROOT_MARGIN });
              obs.observe(hero);
            }

            // Fallback autorun: if IO never fires (layout/position quirks), run anyway
            if (AUTOPLAY) {
              autorunTimer = setTimeout(() => whenVisible(runOnce), AUTORUN_TIMEOUT_MS);
            }
          };

          // Kick it off
          if (document.readyState === 'complete' || document.readyState === 'interactive') {
            bootstrap();
          } else {
            window.addEventListener('DOMContentLoaded', bootstrap, { once: true });
          }

          // last-chance safety: if still nothing by full load, run
          window.addEventListener('load', () => {
            setTimeout(() => {
              // if we never ran (e.g., both gates failed), try one more time
              if (rollBall && +getComputedStyle(rollBall).opacity === 0 &&
                  idleBall && +getComputedStyle(idleBall).opacity === 0) {
                whenVisible(runOnce);
              }
            }, 500);
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
})();
