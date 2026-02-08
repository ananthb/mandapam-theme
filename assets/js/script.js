const body = document.querySelector('body')
const menuTrigger = document.querySelector('#main-menu-mobile-toggle');
const menuContainer = document.querySelector('#main-menu-mobile');

menuTrigger.addEventListener("click", () => {
    menuContainer.classList.toggle('open');
    menuTrigger.classList.toggle('is-active')
    body.classList.toggle('lock-scroll')
});
