
const cx = (className) => `JSON-THING-${className}`;
let obj = null;
const keyExpandedMap = {};
let rootEl;

const defaultSettings = {showArrayIndices: true, spaceCount: 4};
const getSettings = async () => {
  const storedSettings = await browser.storage.sync.get(['showArrayIndices', 'spaceCount']);
  return {...defaultSettings, ...storedSettings};
};
let settings = {...defaultSettings};
const loadSettings = async () => {
  settings = await getSettings();
};

const getValType = (val) => {
  if (val === null)                      return 'NULL';
  if (typeof val === 'number')           return 'NUMBER';
  if (typeof val === 'string')           return 'STRING';
  if ((val === true) || (val === false)) return 'BOOLEAN';
  if (Array.isArray(val))                return 'ARRAY';
  if (typeof val === 'object')           return 'OBJECT';
  return 'UNKNOWN';
};

const isUrl = (str) => {
  if (str.startsWith('https://')) return true;
  if (str.startsWith('http://')) return true;
  return false;
};

const escapeStr = (str) => {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&bsol;&quot;')
    .replaceAll('\n', '&bsol;n')
    .replaceAll('\t', '&bsol;t')
    .replaceAll('\r', '&bsol;r')
    .replaceAll("'", '&#39;');
};

const makeLineEl = (level=0, html='', elCaret) => {
  const el = document.createElement('div');
  const chars = new Array(level * settings.spaceCount).fill('&nbsp;').join('');
  el.innerHTML = `<span class="${cx('whitespace')}">${chars}</span>`;
  if (elCaret) {
    const elCaretCon = document.createElement('span');
    elCaretCon.className = cx('caret-con');
    elCaretCon.appendChild(elCaret);
    el.appendChild(elCaretCon);
  }
  el.insertAdjacentHTML('beforeend', html);
  el.className = cx('line');
  return el;
};
const makeNodeEl = () => {
  const el = document.createElement('div');
  el.className = cx('node');
  return el;
};
const makeCaretEl = (isLast, path, isExpanded) => {
  const elCaret = document.createElement('div');
  elCaret.className = `${cx('caret')} ${cx(isExpanded ? 'expanded' : 'collapsed')}`;
  elCaret.addEventListener('click', onClickCaret.bind(null, isLast, path));
  return elCaret;
};

const pathToKey = (path) => path.join('.');
const pathToVal = (path) => {
  let val = obj;
  const parts = [...path];
  while (parts.length) {
    const part = parts.shift();
    val = val[part];
  }
  return val;
};

const getIsExpanded = (path) => {
  const key = pathToKey(path);
  const isExpanded = keyExpandedMap[key];
  return (isExpanded == null) ? true: isExpanded;
};
const setIsExpanded = (path, isExpanded) => {
  const key = pathToKey(path);
  keyExpandedMap[key] = isExpanded;
};

const onClickCaret = (isLast, path, event) => {
  const val = pathToVal(path);
  const isExpanded = getIsExpanded(path);
  const nodeEl = event.currentTarget.closest(`.${cx('node')}`);
  setIsExpanded(path, !isExpanded);
  renderData(path, nodeEl, val, isLast);
};

const renderData = (path, domEl, val, isLast=true) => {
  const level = path.length;
  const key = path[path.length - 1];
  const type = getValType(val);
  const keyHtml = (() => {
    if (key == null) return `<span class="${cx('comment')}">JSON: </span>`;
    if (typeof key === 'number') return settings.showArrayIndices ? `<span class="${cx('comment')}">[${key}] </span>` : '';
    return `<span class="${cx('key')}">"${escapeStr(key)}"</span><span class="${cx('chrome')}">: </span>`;
  })();
  const commaHtml = isLast ? '' : `<span class="${cx('chrome')}">,</span>`;

  domEl.innerHTML = '';

  if (type === 'OBJECT') {
    const keys = Object.keys(val);
    const isExpanded = getIsExpanded(path);
    const isEmpty = !keys.length;
    const treatExpanded = isExpanded && !isEmpty;

    let line1Html = `${keyHtml}<span class="${cx('chrome')}">{</span> <span class="${cx('comment')}">${keys.length}</span>`;
    if (!treatExpanded) line1Html += ` <span class="${cx('chrome')}">}</span>${commaHtml}`;
    const elCaret = isEmpty ? null : makeCaretEl(isLast, path, isExpanded);
    const elLine1 = makeLineEl(level, line1Html, elCaret);
    domEl.appendChild(elLine1);

    if (treatExpanded) {
      keys.forEach((key, i) => {
        const elChild = makeNodeEl();
        renderData([...path, key], elChild, val[key], (i === keys.length - 1));
        domEl.appendChild(elChild);
      });
      const elLine2 = makeLineEl(level, `<span class="${cx('chrome')}">}</span>${commaHtml}`);
      domEl.appendChild(elLine2);
      domEl.classList.add(cx('parent'));
    }
  } else if (type === 'ARRAY') {
    const isExpanded = getIsExpanded(path);
    const isEmpty = !val.length;
    const treatExpanded = isExpanded && !isEmpty;

    let line1Html = `${keyHtml}<span class="${cx('chrome')}">[</span> <span class="${cx('comment')}">${val.length}</span>`;
    if (!treatExpanded) line1Html += ` <span class="${cx('chrome')}">]</span>${commaHtml}`;
    const elCaret = isEmpty ? null : makeCaretEl(isLast, path, isExpanded);
    const elLine1 = makeLineEl(level, line1Html, elCaret);
    domEl.appendChild(elLine1);

    if (treatExpanded) {
      val.forEach((childVal, i) => {
        const elChild = makeNodeEl();
        renderData([...path, i], elChild, childVal, (i === val.length - 1));
        domEl.appendChild(elChild);
      });
      const elLine2 = makeLineEl(level, `<span class="${cx('chrome')}">]</span>${commaHtml}`);
      domEl.appendChild(elLine2);
      domEl.classList.add(cx('parent'));
    }
  } else if (type === 'STRING') {
    const html = isUrl(val)
      ? `${keyHtml}<span class="${cx('string')}">"<a href="${encodeURI(val)}">${escapeStr(val)}</a>"</span>${commaHtml}`
      : `${keyHtml}<span class="${cx('string')}">"${escapeStr(val)}"</span>${commaHtml}`;
    const elLine = makeLineEl(level, html);
    domEl.appendChild(elLine);
  } else if (type === 'NUMBER') {
    const elLine = makeLineEl(level, `${keyHtml}<span class="${cx('number')}">${val}</span>${commaHtml}`);
    domEl.appendChild(elLine);
  } else if (type === 'UNKNOWN') {
    const elLine = makeLineEl(level, `${keyHtml}<span class="${cx('unknown')}">???</span>${commaHtml}`);
    domEl.appendChild(elLine);
  } else if (type === 'NULL') {
    const elLine = makeLineEl(level, `${keyHtml}<span class="${cx('null')}">null</span>${commaHtml}`);
    domEl.appendChild(elLine);
  } else if (type === 'BOOLEAN') {
    const elLine = makeLineEl(level, `${keyHtml}<span class="${cx('boolean')}">${val}</span>${commaHtml}`);
    domEl.appendChild(elLine);
  }
};

const getJsonData = () => {
  if (document.contentType !== 'application/json') return null;
  const str = document.body.textContent;
  let obj = null;
  try {
    obj = JSON.parse(str);
  } catch (error) {
    console.warn('content type is JSON, but failed to parse the string');
  }
  return obj;
};

const rerender = async () => {
  console.log('JSON Thing settings saved.');
  await loadSettings();
  if (rootEl && (obj !== undefined)) {
    renderData([], rootEl, obj);
  }
};

const launch = async () => {
  obj = getJsonData();
  if (obj == null) return;

  await loadSettings();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'settings-changed') rerender();
  });

  rootEl = makeNodeEl();
  renderData([], rootEl, obj);
  rootEl.classList.add(cx('root'));

  document.body.classList.add(cx('body'));
  document.body.replaceChildren(rootEl);
};

launch();
