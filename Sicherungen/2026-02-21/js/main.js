/* ============================================================================
   VIRTUE COMPLIANCE — Shared JavaScript
   Navigation, Cookie-Consent, Scroll-Reveal, FAQ.
   Wird auf jeder Seite eingebunden.
   ============================================================================ */

document.addEventListener('DOMContentLoaded', function () {

    /* — Navigation: Scroll-Effekt — */
    const nav = document.getElementById('nav');
    if (nav) {
        window.addEventListener('scroll', function () {
            nav.classList.toggle('scrolled', window.scrollY > 40);
        });
    }

    /* — Navigation: Mobile Toggle — */
    const toggle = document.getElementById('navToggle');
    const links  = document.querySelector('.nav-links');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            const open = links.style.display === 'flex';
            if (open) { links.removeAttribute('style'); return; }
            Object.assign(links.style, {
                display: 'flex', flexDirection: 'column', position: 'absolute',
                top: '100%', left: '0', right: '0', background: 'white',
                padding: '16px 24px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                borderRadius: '0 0 12px 12px', zIndex: '999'
            });
        });
        links.querySelectorAll('a').forEach(function (a) {
            a.addEventListener('click', function () { links.removeAttribute('style'); });
        });
    }

    /* — FAQ Accordion — */
    document.querySelectorAll('.faq-question').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var item   = btn.closest('.faq-item');
            var answer = item.querySelector('.faq-answer');
            var active = item.classList.contains('active');

            document.querySelectorAll('.faq-item').forEach(function (i) {
                i.classList.remove('active');
                i.querySelector('.faq-answer').style.maxHeight = '0';
            });

            if (!active) {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });

    /* — Scroll Reveal — */
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e, i) {
            if (e.isIntersecting) {
                setTimeout(function () { e.target.classList.add('visible'); }, i * 60);
                observer.unobserve(e.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { observer.observe(el); });

    /* — Smooth Scroll (Anchor Links) — */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var href = a.getAttribute('href');
            if (href === '#') return;
            var target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (links) links.removeAttribute('style');
            }
        });
    });

    /* — Contact Form — */
    var contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var btn = contactForm.querySelector('.btn-form-submit');
            btn.innerHTML = '<span>Wird gesendet...</span>';
            btn.disabled = true;
            fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { 'Accept': 'application/json' }
            }).then(function (resp) {
                if (resp.ok) {
                    contactForm.style.display = 'none';
                    document.getElementById('formSuccess').style.display = 'block';
                } else {
                    btn.innerHTML = '<span>Fehler – bitte erneut versuchen</span>';
                    btn.disabled = false;
                }
            }).catch(function () {
                btn.innerHTML = '<span>Fehler – bitte erneut versuchen</span>';
                btn.disabled = false;
            });
        });
    }
});
