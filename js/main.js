/**
 * ═══════════════════════════════════════════════════════════════
 *  SHLOK SHAH — Neobrutalist Portfolio · Main JavaScript
 *  Clean, performant ES6+ with GPU-accelerated animations
 * ═══════════════════════════════════════════════════════════════
 */

;(() => {
  'use strict'

  /* ──────────────────────────────────────────────
   *  §0  UTILITIES & CONSTANTS
   * ────────────────────────────────────────────── */

  const lerp = (a, b, t) => a + (b - a) * t
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
  const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const $ = (sel, ctx = document) => ctx.querySelector(sel)
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)]

  // Shared mouse state (updated once, consumed by many)
  const mouse = { x: 0, y: 0 }
  document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY })

  /* ──────────────────────────────────────────────
   *  §1  CUSTOM CURSOR
   * ────────────────────────────────────────────── */

  const initCursor = () => {
    if (isTouchDevice()) {
      const cursor = $('#custom-cursor')
      if (cursor) cursor.style.display = 'none'
      return
    }

    const dot  = $('.cursor-dot')
    const ring = $('.cursor-ring')
    if (!dot || !ring) return

    let ringX = 0, ringY = 0
    let isClicking = false

    // Direct dot placement, lerped ring
    const moveCursor = () => {
      dot.style.transform  = `translate(${mouse.x}px, ${mouse.y}px) translate(-50%, -50%)${isClicking ? ' scale(0.6)' : ''}`
      ringX = lerp(ringX, mouse.x, 0.15)
      ringY = lerp(ringY, mouse.y, 0.15)
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`
      requestAnimationFrame(moveCursor)
    }
    requestAnimationFrame(moveCursor)

    // Click shrink
    document.addEventListener('mousedown', () => { isClicking = true;  dot.classList.add('clicking') })
    document.addEventListener('mouseup',   () => { isClicking = false; dot.classList.remove('clicking') })

    // Hover scale-up on interactive elements
    const hoverTargets = 'a, button, .magnetic, .tag, .skill-card'
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverTargets)) ring.classList.add('hovering')
    })
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverTargets)) ring.classList.remove('hovering')
    })
  }

  /* ──────────────────────────────────────────────
   *  §2  PARTICLE CONSTELLATION (Hero Background)
   * ────────────────────────────────────────────── */

  const initParticles = () => {
    const canvas = $('#particles-canvas')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const hero = canvas.closest('#hero') || canvas.parentElement
    let W, H
    let animating = true
    const PARTICLE_COUNT = 80
    const CONNECT_DIST   = 120
    const particles = []

    // Mouse particle (follows cursor over hero)
    const mousePt = { x: -9999, y: -9999, r: 0, vx: 0, vy: 0, alpha: 0 }

    const resize = () => {
      W = hero.offsetWidth
      H = hero.offsetHeight
      canvas.width  = W
      canvas.height = H
    }

    class Particle {
      constructor() {
        this.x = Math.random() * (W || 1)
        this.y = Math.random() * (H || 1)
        this.r = 1 + Math.random() * 2
        this.vx = (Math.random() - 0.5) * 0.4
        this.vy = (Math.random() - 0.5) * 0.4
        this.alpha = 0.3 + Math.random() * 0.7
      }
      update() {
        this.x += this.vx
        this.y += this.vy
        if (this.x < 0)  this.x = W
        if (this.x > W)  this.x = 0
        if (this.y < 0)  this.y = H
        if (this.y > H)  this.y = 0
      }
      draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,230,41,${this.alpha})`
        ctx.fill()
      }
    }

    const init = () => {
      resize()
      particles.length = 0
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle())
    }

    const connectParticles = (pts) => {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x
          const dy = pts[i].y - pts[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.45
            ctx.beginPath()
            ctx.moveTo(pts[i].x, pts[i].y)
            ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(255,230,41,${opacity})`
            ctx.lineWidth = 0.6
            ctx.stroke()
          }
        }
      }
    }

    const loop = () => {
      if (!animating) { requestAnimationFrame(loop); return }
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => { p.update(); p.draw() })

      // Include mouse particle for connections
      const allPts = [...particles, mousePt]
      connectParticles(allPts)

      requestAnimationFrame(loop)
    }

    // Track mouse position relative to canvas
    hero.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect()
      mousePt.x = e.clientX - rect.left
      mousePt.y = e.clientY - rect.top
    })
    hero.addEventListener('mouseleave', () => {
      mousePt.x = -9999
      mousePt.y = -9999
    })

    // Pause when hero is not visible
    const observer = new IntersectionObserver(([entry]) => {
      animating = entry.isIntersecting
    }, { threshold: 0.05 })
    observer.observe(hero)

    window.addEventListener('resize', resize)
    init()
    loop()
  }

  /* ──────────────────────────────────────────────
   *  §3  MAGNETIC BUTTON EFFECT
   * ────────────────────────────────────────────── */

  const initMagnetic = () => {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top  + rect.height / 2
        const dx = clamp((e.clientX - cx) * 0.25, -8, 8)
        const dy = clamp((e.clientY - cy) * 0.25, -8, 8)
        el.style.transform = `translate(${dx}px, ${dy}px)`
      })

      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.45s cubic-bezier(.23,1,.32,1)'
        el.style.transform  = 'translate(0, 0)'
        // Remove inline transition after settling
        el.addEventListener('transitionend', () => { el.style.transition = '' }, { once: true })
      })
    })
  }

  /* ──────────────────────────────────────────────
   *  §4  3D TILT ON SKILL CARDS
   * ────────────────────────────────────────────── */

  const initTilt = () => {
    $$('.tilt-card').forEach(card => {
      card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top  + rect.height / 2
        // Normalise to -1…1
        const px = (e.clientX - cx) / (rect.width / 2)
        const py = (e.clientY - cy) / (rect.height / 2)
        const maxTilt = 8
        const rotX = -py * maxTilt   // vertical offset → X rotation
        const rotY =  px * maxTilt   // horizontal offset → Y rotation

        card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`

        // Cursor-following highlight via CSS custom properties
        const percentX = ((e.clientX - rect.left) / rect.width) * 100
        const percentY = ((e.clientY - rect.top)  / rect.height) * 100
        card.style.setProperty('--highlight-x', `${percentX}%`)
        card.style.setProperty('--highlight-y', `${percentY}%`)
      })

      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(.23,1,.32,1)'
        card.style.transform  = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)'
        card.addEventListener('transitionend', () => { card.style.transition = '' }, { once: true })
      })
    })
  }

  /* ──────────────────────────────────────────────
   *  §5  TEXT SCRAMBLE EFFECT
   * ────────────────────────────────────────────── */

  const initScramble = () => {
    const chars = '!@#$%^&*()_+-=[]{}|;:,./<>?ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const randomChar = () => chars[Math.floor(Math.random() * chars.length)]

    /**
     * Scramble a single text node character-by-character.
     * @param {Element} el  – the element whose direct text content to scramble
     */
    const scrambleElement = (el) => {
      // Collect text nodes only (preserve child <span> etc.)
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      const textNodes = []
      let node
      while ((node = walker.nextNode())) textNodes.push(node)

      textNodes.forEach(tNode => {
        const original = tNode.textContent
        const len = original.length
        let completed = 0

        // Per-character staggered scramble
        original.split('').forEach((targetChar, i) => {
          if (targetChar === ' ') { completed++; return } // skip spaces

          const delay = i * 30              // stagger
          const scrambleDuration = 300       // ms of cycling
          const interval = 40               // ms per cycle frame
          let elapsed = 0

          setTimeout(() => {
            const timer = setInterval(() => {
              elapsed += interval
              // Build current string: settled chars + scrambling char + remaining
              const currentArr = original.split('')
              currentArr[i] = randomChar()
              // Reconstruct full text preserving settled characters
              tNode.textContent = currentArr.map((c, idx) => {
                if (idx < completed) return original[idx]
                if (idx === i) return elapsed >= scrambleDuration ? targetChar : randomChar()
                if (idx > i) return original[idx]
                return c
              }).join('')

              if (elapsed >= scrambleDuration) {
                clearInterval(timer)
                completed++
                if (completed >= len) tNode.textContent = original
              }
            }, interval)
          }, delay)
        })
      })
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          scrambleElement(entry.target)
          obs.unobserve(entry.target) // once
        }
      })
    }, { threshold: 0.3 })

    $$('.scramble').forEach(el => observer.observe(el))
  }

  /* ──────────────────────────────────────────────
   *  §6  COUNTER ANIMATION (Stats)
   * ────────────────────────────────────────────── */

  const initCounters = () => {
    const easeOutExpo = t => (t === 1) ? 1 : 1 - Math.pow(2, -10 * t)
    const duration = 2000

    const animateCounter = (el) => {
      const target = +el.dataset.target
      const start  = performance.now()

      const tick = (now) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const value = Math.round(easeOutExpo(progress) * target)
        el.textContent = value
        if (progress < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }

    const statsSection = $('.about-stats')
    if (!statsSection) return

    const observer = new IntersectionObserver(([entry], obs) => {
      if (entry.isIntersecting) {
        $$('.stat-num[data-target]', statsSection).forEach(animateCounter)
        obs.unobserve(entry.target)
      }
    }, { threshold: 0.3 })

    observer.observe(statsSection)
  }

  /* ──────────────────────────────────────────────
   *  §7  SCROLL PROGRESS BAR
   * ────────────────────────────────────────────── */

  const initScrollProgress = () => {
    const bar = $('#scroll-progress')
    if (!bar) return

    let ticking = false
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0
      bar.style.width = `${pct}%`
      ticking = false
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true }
    }, { passive: true })
  }

  /* ──────────────────────────────────────────────
   *  §8  TYPING EFFECT
   * ────────────────────────────────────────────── */

  const initTyping = () => {
    const el = $('#typed')
    if (!el) return

    const phrases = [
      'BS Student @ IIT Madras',
      'BTech Student @ NxtWave',
      'Full-Stack Developer',
      'Python Programmer',
      'React Developer',
      'Problem Solver',
      'Never Giving Up'
    ]

    let phraseIdx = 0
    let charIdx   = 0
    let deleting  = false

    const TYPE_SPEED   = 90
    const DELETE_SPEED  = 50
    const PAUSE_AT_END  = 1800

    const tick = () => {
      const current = phrases[phraseIdx]

      if (!deleting) {
        el.textContent = current.slice(0, ++charIdx)
        if (charIdx === current.length) {
          deleting = true
          setTimeout(tick, PAUSE_AT_END)
          return
        }
        setTimeout(tick, TYPE_SPEED)
      } else {
        el.textContent = current.slice(0, --charIdx)
        if (charIdx === 0) {
          deleting = false
          phraseIdx = (phraseIdx + 1) % phrases.length
        }
        setTimeout(tick, DELETE_SPEED)
      }
    }

    // Start after loader finishes (~2200ms)
    setTimeout(tick, 2200)
  }

  /* ──────────────────────────────────────────────
   *  §9  SPINNING TEXT RING (Canvas)
   * ────────────────────────────────────────────── */

  const initRingCanvas = () => {
    const canvas = $('#ringCanvas')
    if (!canvas) return

    const ctx    = canvas.getContext('2d')
    const SIZE   = 440
    canvas.width  = SIZE
    canvas.height = SIZE

    const text   = 'NEVER  GIVING  UP  ✦  NEVER  GIVING  UP  ✦  '
    const radius = 210
    let angle    = 0
    let spinSpeed = 0.25 // Fast initial spin

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.save()
      ctx.translate(SIZE / 2, SIZE / 2)
      ctx.rotate(angle)

      ctx.font         = '800 14px "DM Mono", monospace'
      ctx.textAlign     = 'center'
      ctx.textBaseline  = 'middle'
      ctx.fillStyle     = '#FFE629'
      ctx.strokeStyle   = 'rgba(0,0,0,0.8)'
      ctx.lineWidth     = 3

      const totalChars = text.length
      const step = (Math.PI * 2) / totalChars

      for (let i = 0; i < totalChars; i++) {
        const theta = step * i
        ctx.save()
        ctx.rotate(theta)
        ctx.translate(0, -radius)
        ctx.strokeText(text[i], 0, 0)
        ctx.fillText(text[i], 0, 0)
        ctx.restore()
      }

      ctx.restore()
      
      // Decelerate once loaded
      if (document.body.classList.contains('site-loaded')) {
        spinSpeed = lerp(spinSpeed, 0.015, 0.02)
      }
      
      angle += spinSpeed
      requestAnimationFrame(draw)
    }

    draw()
  }

  /* ──────────────────────────────────────────────
   *  §10  SCROLL REVEAL
   * ────────────────────────────────────────────── */

  const initReveal = () => {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          obs.unobserve(entry.target)
        }
      })
    }, { threshold: 0.1 })

    $$('.reveal').forEach(el => observer.observe(el))
  }

  /* ──────────────────────────────────────────────
   *  §11  ACTIVE NAV LINK HIGHLIGHTING
   * ────────────────────────────────────────────── */

  const initActiveNav = () => {
    const sections = $$('section[id]')
    const navLinks = $$('nav a[href^="#"]')
    if (!sections.length || !navLinks.length) return

    let ticking = false

    const update = () => {
      const scrollY = window.scrollY + 80 // offset for fixed nav

      sections.forEach(section => {
        const top = section.offsetTop
        const bottom = top + section.offsetHeight
        const id = section.getAttribute('id')

        if (scrollY >= top && scrollY < bottom) {
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`)
          })
        }
      })
      ticking = false
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true }
    }, { passive: true })
  }

  /* ──────────────────────────────────────────────
   *  §12  HAMBURGER MENU
   * ────────────────────────────────────────────── */

  const initHamburger = () => {
    const btn  = $('#hamburger-btn')
    const menu = $('#mobileMenu')
    if (!btn || !menu) return

    const toggle = (open) => {
      const isOpen = typeof open === 'boolean' ? open : !btn.classList.contains('open')
      btn.classList.toggle('open', isOpen)
      menu.classList.toggle('open', isOpen)
      btn.setAttribute('aria-expanded', String(isOpen))
    }

    btn.addEventListener('click', () => toggle())

    // Close on link click
    $$('a', menu).forEach(link => link.addEventListener('click', () => toggle(false)))

    // Close on outside click
    document.addEventListener('click', e => {
      if (btn.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
        toggle(false)
      }
    })
  }

  /* ──────────────────────────────────────────────
   *  §13  LOADER
   * ────────────────────────────────────────────── */

  const initLoader = () => {
    const loader = $('#loader')
    if (!loader) return

    const status = loader.querySelector('.loader-status')
    const messages = ['INITIALIZING', 'LOADING ASSETS', 'COMPILING', 'ALMOST THERE', 'READY']
    let msgIdx = 0

    // Cycle status text
    const statusInterval = setInterval(() => {
      if (status) {
        msgIdx = (msgIdx + 1) % messages.length
        status.textContent = messages[msgIdx]
      }
    }, 350)

    // Fade out after 1800ms
    window.addEventListener('load', () => {
      setTimeout(() => {
        clearInterval(statusInterval)
        if (status) status.textContent = 'READY'
        loader.style.transition = 'opacity 0.4s ease'
        loader.style.opacity = '0'
        document.body.classList.add('site-loaded')
        setTimeout(() => {
          loader.style.display = 'none'
        }, 400)
      }, 1800)
    })
  }

  /* ──────────────────────────────────────────────
   *  §14  CONNECT FORM (mailto)
   * ────────────────────────────────────────────── */

  const initConnectForm = () => {
    window.sendConnect = () => {
      const name    = ($('#c-name')    || {}).value?.trim()
      const email   = ($('#c-email')   || {}).value?.trim()
      const subject = ($('#c-subject') || {}).value?.trim() || '(No subject)'
      const message = ($('#c-message') || {}).value?.trim()

      // Validation
      if (!name || !email || !message) {
        alert('Please fill in Name, Email, and Message.')
        return
      }

      const body = `Hi Shlok,\n\nName: ${name}\nEmail: ${email}\n\n${message}`
      const mailto = `mailto:1207shhloshah@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      window.open(mailto, '_blank')

      // Show toast
      const toast = $('#connect-toast')
      if (toast) {
        toast.classList.add('show')
        setTimeout(() => toast.classList.remove('show'), 4000)
      }
    }
  }

  /* ──────────────────────────────────────────────
   *  §15  SMOOTH SCROLL
   * ────────────────────────────────────────────── */

  const initSmoothScroll = () => {
    const NAV_OFFSET = 60

    document.addEventListener('click', e => {
      const anchor = e.target.closest('a[href^="#"]')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (href === '#' || href.length < 2) return

      const target = $(href)
      if (!target) return

      e.preventDefault()
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET
      window.scrollTo({ top, behavior: 'smooth' })
    })
  }

  /* ──────────────────────────────────────────────
   *  §16  SPOTLIGHT / MOUSE GRADIENT ON DARK SECTIONS
   * ────────────────────────────────────────────── */

  const initSpotlight = () => {
    const sections = $$('#hero, #journey, #connect')

    sections.forEach(section => {
      if (!section) return

      section.addEventListener('mousemove', e => {
        const rect = section.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        section.style.setProperty('--mouse-x', `${x}px`)
        section.style.setProperty('--mouse-y', `${y}px`)
      })
    })
  }

  /* ──────────────────────────────────────────────
   *  §17  1% TOP UX/UI 3D PARALLAX AVATAR
   * ────────────────────────────────────────────── */

  const initAvatar3D = () => {
    const scene = $('.avatar-scene')
    const frame = $('.avatar-frame')
    const canvas = $('#ringCanvas')
    const shine = $('.avatar-shine')
    if (!scene || !frame || !canvas || !shine) return

    let targetRotateX = 0, targetRotateY = 0
    let targetShiftX = 0, targetShiftY = 0
    
    // Dramatic initial angles and shifts for layered assembly entry
    let currentRotateX = -45, currentRotateY = 120
    let currentShiftX = 90, currentShiftY = -70

    scene.addEventListener('mousemove', e => {
      const rect = scene.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      
      // Normalized values between -1 and 1
      const px = (e.clientX - cx) / (rect.width / 2)
      const py = (e.clientY - cy) / (rect.height / 2)
      
      const maxTilt = 18 // 18 degrees max tilt for premium depth feel
      targetRotateX = -py * maxTilt
      targetRotateY = px * maxTilt
      
      // Shift canvas in opposite direction (parallax)
      const maxShift = 25 // 25px max shift
      targetShiftX = -px * maxShift
      targetShiftY = -py * maxShift

      // Shift the light shine overlay inside the avatar
      const frameRect = frame.getBoundingClientRect()
      const percentX = ((e.clientX - frameRect.left) / frameRect.width) * 100
      const percentY = ((e.clientY - frameRect.top) / frameRect.height) * 100
      shine.style.setProperty('--shine-x', `${percentX}%`)
      shine.style.setProperty('--shine-y', `${percentY}%`)
      shine.style.transform = `translate3d(${-px * 10}px, ${-py * 10}px, 60px)`
    })

    scene.addEventListener('mouseleave', () => {
      targetRotateX = 0
      targetRotateY = 0
      targetShiftX = 0
      targetShiftY = 0
      shine.style.transform = 'translate3d(0, 0, 60px)'
    })

    // Smooth lerped loop for organic 60fps movement
    const update = () => {
      // Only animate transitions once page loader fades out
      if (document.body.classList.contains('site-loaded')) {
        currentRotateX = lerp(currentRotateX, targetRotateX, 0.07) // slightly slower for premium card weight
        currentRotateY = lerp(currentRotateY, targetRotateY, 0.07)
        currentShiftX  = lerp(currentShiftX, targetShiftX, 0.05)   // slower parallax shift for physical depth separation
        currentShiftY  = lerp(currentShiftY, targetShiftY, 0.05)
      }

      frame.style.transform = `perspective(1000px) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg) scale(1.03)`
      canvas.style.transform = `translate(-50%, -50%) translate3d(${currentShiftX}px, ${currentShiftY}px, -40px)`

      requestAnimationFrame(update)
    }
    requestAnimationFrame(update)
  }

  /* ══════════════════════════════════════════════
   *  BOOT — Initialise everything on DOM ready
   * ══════════════════════════════════════════════ */

  const boot = () => {
    initLoader()        // §13 — must be first (blocks UI briefly)
    initCursor()        // §1
    initParticles()     // §2
    initMagnetic()      // §3
    initTilt()          // §4
    initScramble()      // §5
    initCounters()      // §6
    initScrollProgress()// §7
    initTyping()        // §8
    initRingCanvas()    // §9
    initReveal()        // §10
    initActiveNav()     // §11
    initHamburger()     // §12
    initConnectForm()   // §14
    initSmoothScroll()  // §15
    initSpotlight()     // §16
    initAvatar3D()      // §17
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
