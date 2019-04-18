//

import axios from 'axios';
import marked from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

import 'normalize.css';
import './style.css';

import posts from './posts';


const ARTICLE_LIST = [
  {title: '想要抓住未来吗', path: '/preface', dir: false, script: null},
  {title: '第一章 - 常量', path: '/ch01', dir: true, script: posts.ch01},
  {title: '第二章 - 每秒', path: '/ch02', dir: true, script: posts.ch02},
  {title: '第三章 - 点灯', path: '/ch03', dir: true, script: posts.ch03},
  {title: '第四章 - 宿命', path: '/ch04', dir: true, script: posts.ch04},
  {title: '第五章 - 循环', path: '/ch05', dir: true, script: posts.ch05},
  {title: '间奏一 - 观测', path: '/in01', dir: true, script: posts.in01},
  {title: '第六章 - 约定', path: '/ch06', dir: true, script: posts.ch06},
];

const FRONTPAGE_PATH = '/preface';


const pathInfo = {};
for (const {path, ...other} of ARTICLE_LIST) {
  pathInfo[path] = other;
}

const sidebar = document.createElement('div');
function refreshSidebar(currentPath) {
  const ul = document.createElement('ul');
  for (const {title, path} of ARTICLE_LIST) {
    const li = document.createElement('li');
    if (path === currentPath) {
      li.innerText = title;
    } else {
      const a = document.createElement('a');
      a.href = '#' + path;
      a.innerText = title;
      a.addEventListener('click', () => history.pushState(null, title, a.href));
      li.appendChild(a);
    }
    ul.appendChild(li);
  }
  while (sidebar.firstChild) {
    sidebar.removeChild(sidebar.firstChild);
  }
  sidebar.appendChild(ul);
}

const article = document.createElement('div');
article.innerText = 'Loading...';

const app = document.createElement('div');
app.id = 'app';
app.appendChild(sidebar);
app.appendChild(article);
document.body.appendChild(app);

let stopper = null;
function refreshPage() {
  stopper && stopper();

  let path = window.location.hash.slice(1);
  if (path === '/' || path === '') {
    path = FRONTPAGE_PATH;
  }

  document.title = `${pathInfo[path].title} | Butterfly`;

  refreshSidebar(path);

  const postInfo = pathInfo[path];
  const postPath = postInfo.dir ?
    '/posts' + path + '/index.md' :
    '/posts' + path + '.md';

  const baseUrl = window.location.origin.replace(/\/$/, '') +
    window.location.pathname;
  axios
    .get(baseUrl + postPath)
    .then(resp => {
      const renderer = new marked.Renderer();
      let codeblockCount = 0;

      const originalParagraph = renderer.paragraph;
      const promisedCodeMap = {};
      const basePath = path;
      renderer.paragraph = function(rawText) {
        const text = rawText.replace(/\$([^\$]*)\$/g, (match, latexString) => {
          return katex.renderToString(latexString);
        });
        const result = text.match(/^{% include_code (\S+) (\d+):(\d+) %}$/)
        if (result === null) {
          return originalParagraph(text);
        }

        const [_whole, path, startLine, endLine] = result;
        const blockId = 'codeblock-' + codeblockCount;
        codeblockCount += 1;

        const codePath = '/posts' + basePath + '/' + path;
        promisedCodeMap[codePath] =
          promisedCodeMap[codePath] ||
          axios
            .get(baseUrl + codePath)
            .then(resp => resp.data);
        promisedCodeMap[codePath]
          .then(code => {
            const snippet =
              code.split('\n').slice(startLine - 1, endLine - 1).join('\n');
            document.querySelector('#' + blockId).innerHTML =
              renderer.code(snippet, 'javascript');
          });

        return `<div id="${blockId}">Loading code snippet...</div>`;
      }

      const html = marked(resp.data, {renderer});
      article.innerHTML = html;

      stopper = postInfo.script && postInfo.script();
    });
}

refreshPage();
window.onpopstate = refreshPage;
