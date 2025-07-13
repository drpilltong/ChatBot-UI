/* Element Cache */
const $messages = document.getElementById('messages');
const $form = document.getElementById('chat-form');
const $input = document.getElementById('user-input');
const $newChatBtn = document.getElementById('new-chat');
const $historyList = document.getElementById('history-list');
const $welcome = document.getElementById('welcome');

/* 상태 */
let chats = loadChats();
let currentId = null;

/* LocalStorage Helpers */
function loadChats() {
  try {
    return JSON.parse(localStorage.getItem('piChats')) || {};
  } catch {
    return {};
  }
}
function saveChats() {
  localStorage.setItem('piChats', JSON.stringify(chats));
}

/* UI */
function renderHistory() {
  $historyList.innerHTML = '';
  Object.entries(chats).forEach(([id, chat]) => {
    const li = document.createElement('li');
    li.dataset.id = id;
    li.className = id === currentId ? 'active' : '';

    /* 제목 */
    const span = document.createElement('span');
    span.className = 'chat-title';
    span.textContent = chat.title || '제목 없음';

    /* 삭제 버튼 */
    const del = document.createElement('button');
    del.className = 'del-btn';
    del.dataset.id = id;
    del.title = '삭제';
    del.textContent = '×';

    li.append(span, del);
    $historyList.appendChild(li);
  });
}

function renderMessages() {
  $messages.innerHTML = '';
  if (!currentId) return;
  chats[currentId].messages.forEach((m) =>
    appendMessage(m.text, m.sender, false)
  );
  $messages.scrollTop = $messages.scrollHeight;
}

function toggleUI(showWelcome) {
  $welcome.classList.toggle('hidden', !showWelcome);
  $messages.classList.toggle('hidden', showWelcome);
  $form.classList.toggle('hidden', showWelcome);
}

/* 메세지 돔 */
function appendMessage(text, sender = 'user', save = true) {
  const div = document.createElement('div');
  div.className = `msg ${sender}`;
  div.textContent = text;
  $messages.appendChild(div);

  if (save && currentId) {
    chats[currentId].messages.push({ text, sender });
    saveChats();
  }
}

/* 새 채팅 */
function startNewChat() {
  currentId = Date.now().toString();
  chats[currentId] = { title: '새 채팅', messages: [] };
  saveChats();
  renderHistory();
  renderMessages();
  toggleUI(false);
  $input.focus();
}

/* 채팅내역 삭제 */
$historyList.addEventListener('click', (e) => {
  const delBtn = e.target.closest('.del-btn');
  if (delBtn) {
    const id = delBtn.dataset.id;
    if (confirm('해당 채팅을 삭제할까요?')) {
      delete chats[id];
      saveChats();

      /* 현재 열려 있던 대화를 지웠다면 다른 대화나 웰컴 화면으로 */
      if (currentId === id) currentId = null;
      const ids = Object.keys(chats);
      if (ids.length) currentId = currentId ?? ids[0];

      renderHistory();
      renderMessages();
      toggleUI(!currentId);
    }
    return;
  }

  /* 채팅 항목 클릭 */
  const li = e.target.closest('li');
  if (!li) return;
  currentId = li.dataset.id;
  renderHistory();
  renderMessages();
  toggleUI(false);
});

/* 백엔드 호출 */
async function fetchBotReply(userText) {
  try {
    const res = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: currentId ?? 'default',
        message: userText,
      }),
    });
    const data = await res.json();
    return data.reply ?? '(응답이 없습니다)';
  } catch (err) {
    console.error(err);
    return '(서버 오류)';
  }
}

/* 양식 전송 */
$form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $input.value.trim();
  if (!text) return;

  if (!currentId) startNewChat(); // 첫 대화
  appendMessage(text, 'user');
  $input.value = '';

  /* 첫 유저 메시지를 제목으로 */
  if (chats[currentId].title === '새 채팅')
    chats[currentId].title = text.slice(0, 20) || '제목 없음';

  const botText = await fetchBotReply(text);
  appendMessage(botText, 'bot');

  renderHistory(); // 제목 갱신
});

/* 초기화면 */
$newChatBtn.addEventListener('click', startNewChat);

(function init() {
  if (Object.keys(chats).length === 0) {
    toggleUI(true); // 웰컴 화면
  } else {
    currentId = Object.keys(chats)[0];
    renderHistory();
    renderMessages();
    toggleUI(false);
  }
})();
