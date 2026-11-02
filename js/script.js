/* Close the mobile menu after a link is tapped */
  document.querySelectorAll('#site-nav a').forEach(function(a){
    a.addEventListener('click', function(){ document.getElementById('nav-toggle').checked = false; });
  });
  /* Close an open graphic with the Esc key */
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    if(location.hash.indexOf('#gfx-') === 0){ location.hash = '!'; }
    else if(location.hash === '#resume-view' || location.hash.indexOf('#cert-') === 0){ location.hash = '!'; }
  });

/* "Home" (and the logo) always glides back to the very top of the page */
document.querySelectorAll('a[href="#home"]').forEach(function(a){
  a.addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('nav-toggle').checked = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', '#home');
  });
});

/* Menu links (About, Skills, Work, Education, Hire Me…): land with the section title
   neatly just below the sticky header instead of leaving a big gap or hiding it */
document.querySelectorAll('a[href^="#"]').forEach(function(a){
  var id = a.getAttribute('href');
  if (id === '#home' || id === '#' || id === '#!' || id === '#resume-view' || id.indexOf('#gfx-') === 0 || id.indexOf('#cert-') === 0) return;
  if (a.closest('.lightbox')) return;
  a.addEventListener('click', function(e){
    var section = document.querySelector(id);
    if (!section) return;
    e.preventDefault();
    document.getElementById('nav-toggle').checked = false;
    var isSection = section.matches('main > .section');
    var fullScreen = isSection && window.matchMedia('(min-width: 861px) and (min-height: 640px)').matches;
    var target = (fullScreen || !isSection) ? section : (section.querySelector('.section-head') || section);
    var header = document.querySelector('.site-header');
    var offset = (header ? header.offsetHeight : 0) + (fullScreen ? 0 : 28);
    if (!isSection) {
      section.classList.remove('is-flash'); void section.offsetWidth; section.classList.add('is-flash');
    }
    var y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    history.replaceState(null, '', id);
  });
});

/* Keep project logos inside their card (e.g. if a logo font is still loading) */
function fitLogos(){
  document.querySelectorAll('.site-logo').forEach(function(el){
    el.style.transform='';
    var box=el.parentElement.clientWidth-32, w=el.scrollWidth;
    if(w>box) el.style.transform='scale('+(box/w).toFixed(3)+')';
  });
}
window.addEventListener('load', fitLogos);
window.addEventListener('resize', fitLogos);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLogos);
