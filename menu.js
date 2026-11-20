
const elArrayIndicesCb = document.querySelector('.array-indices-cb');
const elSpaceCountInput = document.querySelector('.space-count-input');
const elSaveBtn = document.querySelector('.save-btn');

const defaultSettings = {showArrayIndices: true, spaceCount: 4};
let settings = {...defaultSettings};

const getSettings = async () => {
  const storedSettings = await browser.storage.sync.get(['showArrayIndices', 'spaceCount']);
  return {...defaultSettings, ...storedSettings};
};

const notifyPage = async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, {action: 'settings-changed'});
};

elArrayIndicesCb.addEventListener('change', async (event) => {
  settings.showArrayIndices = event.target.checked;
});

elSpaceCountInput.addEventListener('change', async (event) => {
  const valStr = event.target.value;
  let valInt = valStr ? parseInt(valStr) : 4;
  if (valInt < 0) valInt = 0;
  if (valInt > 16) valInt = 16;
  settings.spaceCount = valInt;
});

elSaveBtn.addEventListener('click', async (event) => {
  await browser.storage.sync.set(settings);
  notifyPage();
  window.close();
});

const launch = async () => {
  settings = await getSettings();
  elArrayIndicesCb.checked = settings.showArrayIndices;
  elSpaceCountInput.value = `${settings.spaceCount}`;
};

launch();
