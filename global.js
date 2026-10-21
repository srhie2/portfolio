console.log("IT'S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

const BASE_PATH =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1'
    ? '/'
    : '/portfolio/';

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'cv/', title: 'CV' },
  { url: 'https://github.com/srhie2', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

let currentPath = location.pathname.replace(/\/index\.html$/, '/');

for (let p of pages) {
  let url = p.url;

  if (!url.startsWith('http')) {
    url = BASE_PATH + url;
  }

  let a = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  let linkPath = a.pathname.replace(/\/index\.html$/, '/');

  if (a.host === location.host && linkPath === currentPath) {
    a.classList.add('current');
  }

  if (a.host !== location.host) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }

  nav.append(a);
}

document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

let select = document.querySelector('.color-scheme select');

function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty(
    'color-scheme',
    colorScheme
  );

  select.value = colorScheme;
}

if ('colorScheme' in localStorage) {
  setColorScheme(localStorage.colorScheme);
}

select.addEventListener('input', function (event) {
  let colorScheme = event.target.value;

  setColorScheme(colorScheme);
  localStorage.colorScheme = colorScheme;
});

export async function fetchJSON(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const data = await response.json();

    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON:', error);
    throw error;
  }
}
export function renderProjects(
  projects,
  containerElement,
  headingLevel = 'h2'
) {
  containerElement.innerHTML = '';

  for (const project of projects) {
    const article = document.createElement('article');

    const imageURL = new URL(
      project.image,
      import.meta.url
    ).href;

    const projectLink = project.url
      ? `<br>
         <a href="${project.url}"
            target="_blank"
            rel="noopener noreferrer">
           View project on GitHub
         </a>`
      : '';

    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${imageURL}" alt="${project.title}">
      <p>${project.description}${projectLink}</p>
    `;

    containerElement.appendChild(article);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}