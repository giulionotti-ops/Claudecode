// ?sheet=1 renders the character proposal sheet; otherwise the film
const Q = new URLSearchParams(location.search);
await import(Q.get('sheet') ? './sheet.js' : './film.js');
