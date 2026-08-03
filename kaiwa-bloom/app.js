(() => {
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const data = window.KAIWA_DATA;

  let state = JSON.parse(localStorage.getItem('kb') || '{}');
  state = {
    screen: 'home',
    topic: 'work',
    idx: 0,
    dlg: data.dialogues[0]?.id,
    ri: 0,
    role: 'A',
    saved: [],
    learned: [],
    bookId: data.books[0]?.id,
    ...state,
  };

  let recorder;
  let stream;
  let chunks = [];
  let voices = [];

  const persist = () => localStorage.setItem('kb', JSON.stringify(state));
  const topics = () => data.topics;
  const sentences = (topic = state.topic) => data.sentences.filter((item) => item.topic === topic);
  const currentSentence = () => sentences()[Math.min(state.idx, Math.max(0, sentences().length - 1))];
  const currentDialogue = () => data.dialogues.find((item) => item.id === state.dlg) || data.dialogues[0];
  const topicById = (id) => topics().find((item) => item.id === id);
  const bookById = (id) => data.books.find((item) => item.id === id);
  const sentencesByBook = (id) => data.sentences.filter((item) => item.sourceBook === id);
  const dialoguesByBook = (id) => {
    const topicIds = new Set(sentencesByBook(id).map((item) => item.topic));
    return data.dialogues.filter((dialogue) => topicIds.has(dialogue.topic));
  };
  const topicCountForBook = (id) => new Set(sentencesByBook(id).map((item) => item.topic)).size;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 1900);
  }

  function stopAll() {
    speechSynthesis.cancel();
    if (recorder && recorder.state === 'recording') recorder.stop();
  }

  function go(screen) {
    stopAll();
    state.screen = screen;
    persist();
    render();
    scrollTo(0, 0);
  }

  function nav(active) {
    const items = [
      ['home', '⌂', 'Trang chủ'],
      ['topics', '▦', 'Chủ đề'],
      ['lesson', '♬', 'Luyện nghe'],
      ['role', '◉', 'Hội thoại'],
      ['profile', '♙', 'Cá nhân'],
    ];
    return `<nav class="nav">${items.map((item) => `
      <button data-go="${item[0]}" class="${active === item[0] ? 'active' : ''}">
        <span>${item[1]}</span>${item[2]}
      </button>`).join('')}</nav>`;
  }

  function header(title, subtitle, back = 'home', action = '') {
    return `<div class="head">
      <button class="ib" data-go="${back}" aria-label="Quay lại">‹</button>
      <div class="head-copy"><div class="eyebrow">KAIWA BLOOM</div><h2>${title}</h2><p>${subtitle}</p></div>
      ${action || '<div class="head-spacer"></div>'}
    </div>`;
  }

  function render() {
    const screens = {
      home: homeScreen,
      topics: topicsScreen,
      lesson: lessonScreen,
      role: roleScreen,
      library: libraryScreen,
      book: bookScreen,
      review: reviewScreen,
      profile: profileScreen,
    };
    app.innerHTML = (screens[state.screen] || homeScreen)();
  }

  function homeScreen() {
    const currentTopic = topicById(state.topic) || topics()[0];
    const list = sentences(currentTopic.id);
    const done = list.filter((item) => state.learned.includes(item.id)).length;
    const progress = list.length ? Math.round((done / list.length) * 100) : 0;
    const featured = ['work', 'daily', 'hospital', 'transport']
      .map(topicById)
      .filter(Boolean);

    return `<section class="screen home-screen">
      <div class="top home-top">
        <div class="profile">
          <div class="avatar">N</div>
          <div><b>Ngọc</b><div class="mut">🌸 ${Math.max(1, state.learned.length)} ngày liên tục</div></div>
        </div>
        <div class="spacer"></div>
        <button class="ib" data-go="topics" aria-label="Tìm chủ đề">⌕</button>
        <button class="ib" data-act="settings" aria-label="Cài đặt">⚙</button>
      </div>

      <div class="home-wrap">
        <article class="home-hero-card">
          <div class="hero-copy">
            <div class="hero-kicker">おはよう、Ngọc 🌸</div>
            <h1>Hôm nay mình<br><span>luyện nói 5 câu</span> nhé!</h1>
            <p>Những tình huống thật sự cần khi sống và làm việc tại Nhật.</p>
            <button class="hero-start" data-go="lesson">Bắt đầu luyện Kaiwa <span>→</span></button>
          </div>
          <div class="sensei-art" aria-hidden="true">
            <div class="sakura s1">✿</div><div class="sakura s2">✿</div>
            <div class="sensei-halo"></div>
            <div class="sensei-body"><div class="sensei-hair"></div><div class="sensei-face"></div><div class="sensei-bang"></div><div class="sensei-eye left"></div><div class="sensei-eye right"></div><div class="sensei-mouth"></div><div class="sensei-shirt"></div><div class="sensei-bow"></div></div>
          </div>
        </article>

        <article class="continue-card" data-go="lesson">
          <div class="continue-icon">${currentTopic.icon}</div>
          <div class="continue-copy">
            <div class="section-kicker">TIẾP TỤC BÀI GẦN NHẤT</div>
            <h3>${currentTopic.title}</h3>
            <p>Câu ${Math.min(state.idx + 1, Math.max(1, list.length))}/${Math.max(1, list.length)} · ${progress}% hoàn thành</p>
            <div class="bar"><i style="width:${progress}%"></i></div>
          </div>
          <div class="continue-arrow">›</div>
        </article>

        <div class="section-title-row"><div><div class="section-kicker">HỌC NHANH</div><h2>Lối tắt hôm nay</h2></div></div>
        <div class="quick-grid">
          <button class="quick-card q-topics" data-go="topics"><span>▦</span><b>Chọn chủ đề</b><small>${topics().length} tình huống</small></button>
          <button class="quick-card q-role" data-go="role"><span>◉</span><b>Đóng vai A/B</b><small>${data.dialogues.length} hội thoại</small></button>
          <button class="quick-card q-review" data-go="review"><span>★</span><b>Ôn tập hôm nay</b><small>${state.saved.length} câu đã lưu</small></button>
          <button class="quick-card q-library" data-go="library"><span>▤</span><b>Thư viện</b><small>${data.books.length} nguồn tài liệu</small></button>
        </div>

        <div class="section-title-row featured-title"><div><div class="section-kicker">GỢI Ý CHO NGỌC</div><h2>Chủ đề nổi bật</h2></div><button data-go="topics">Xem tất cả</button></div>
        <div class="featured-scroll">
          ${featured.map((topic) => {
            const total = sentences(topic.id).length;
            const learned = sentences(topic.id).filter((item) => state.learned.includes(item.id)).length;
            return `<button class="featured-topic" data-topic="${topic.id}">
              <div class="featured-icon">${topic.icon}</div>
              <div><b>${topic.title}</b><small>${learned}/${total} câu đã học</small></div>
              <span>›</span>
            </button>`;
          }).join('')}
        </div>
      </div>
      ${nav('home')}
    </section>`;
  }

  function topicsScreen() {
    return `<section class="screen">
      ${header('Chủ đề Kaiwa', 'Chọn tình huống bạn muốn luyện hôm nay')}
      <div class="list topic-list">${topics().map((topic) => {
        const total = sentences(topic.id).length;
        const learned = sentences(topic.id).filter((item) => state.learned.includes(item.id)).length;
        const progress = total ? Math.round((learned / total) * 100) : 0;
        return `<article class="card topic" data-topic="${topic.id}">
          <div class="art">${topic.icon}</div>
          <div><div class="pill">${topic.jp || ''}</div><h3>${topic.title}</h3><p>${topic.desc || ''}</p><div class="bar"><i style="width:${progress}%"></i></div><p>${total} câu · ${progress}% đã học</p></div>
        </article>`;
      }).join('')}</div>
      ${nav('topics')}
    </section>`;
  }

  function lessonScreen() {
    const item = currentSentence();
    const list = sentences();
    const topic = topicById(state.topic);
    if (!item) return `<section class="screen">${header(topic?.title || 'Bài học', 'Chưa có câu', 'topics')}<div class="empty">Chưa có dữ liệu.</div>${nav('lesson')}</section>`;

    return `<section class="screen">
      ${header(topic.title, `Câu ${state.idx + 1}/${list.length}`, 'topics')}
      <div class="lesson">
        <div class="scene"><div class="bubble">${item.japanese}</div><div class="people"><span>👩🏻‍💼</span><span>👩🏻‍🔧</span></div></div>
        <div class="card">
          <span class="pill">${item.sourceKind === 'expanded' ? 'Hội thoại mở rộng' : `Nguồn sách · trang ${item.sourcePage || '?'}`}</span>
          <div class="jp">${item.japanese}</div><div class="fur">${item.furigana || ''}</div><p class="vi">${item.vietnamese}</p>
          <div class="note">💡 ${item.note || 'Mẫu câu thực tế.'}</div>
          <div class="actions"><button data-speak="normal">🔊<br>Nghe</button><button data-speak="slow">🐢<br>Chậm</button><button data-speak="segments">▤<br>Từng cụm</button><button data-act="record">🎙️<br>Đọc theo</button></div>
          <audio id="play" controls hidden></audio>
          <button class="next" data-act="next">Câu tiếp theo →</button>
          <div class="twocol"><button data-act="save">${state.saved.includes(item.id) ? '★ Đã lưu' : '☆ Lưu câu'}</button><button data-act="openRole">Đóng vai A/B</button></div>
        </div>
      </div>${nav('lesson')}
    </section>`;
  }

  function roleScreen() {
    const dialogue = currentDialogue();
    const line = dialogue.lines[state.ri];
    const mine = line.speaker === state.role;
    return `<section class="screen">
      ${header('Đóng vai hội thoại', dialogue.title, 'home')}
      <div class="lesson role">
        <div class="scene"><div class="bubble"><b>Nhân vật ${line.speaker} · ${mine ? 'Lượt của bạn' : 'App đọc'}</b><br>${line.japanese}<br><span class="mut">${line.vietnamese}</span></div><div class="people"><span>👩🏻‍🔧</span><span>👩🏻‍💼</span></div></div>
        <div class="card"><div class="role-status">${mine ? '🎙️ Đến lượt bạn' : '🔊 Đến lượt app'}</div><button class="main ${recorder && recorder.state === 'recording' ? 'rec' : ''}" data-act="roleMain">${recorder && recorder.state === 'recording' ? '■' : mine ? '🎙️' : '▶'}</button><div class="status">Bạn đóng vai ${state.role} · câu ${state.ri + 1}/${dialogue.lines.length}</div><audio id="roleplay" controls hidden></audio><div class="twocol"><button data-act="swap">Đổi vai A/B</button><button data-act="restart">Bắt đầu lại</button><button data-act="prev">← Câu trước</button><button data-act="rnext">Câu sau →</button></div></div>
        <div class="card history">${dialogue.lines.map((item) => `<div class="line"><b>${item.speaker === state.role ? 'VAI CỦA BẠN' : 'APP ĐỌC'} · ${item.speaker}</b><p>${item.japanese}</p><small>${item.vietnamese}</small></div>`).join('')}</div>
      </div>${nav('role')}
    </section>`;
  }

  function libraryScreen() {
    const totalSentences = data.sentences.length;
    const totalDialogues = data.dialogues.length;
    return `<section class="screen child-screen library-screen">
      ${header('Thư viện tài liệu', 'Ba nguồn đã được chuẩn hóa để học', 'home')}
      <div class="library-intro">
        <div><div class="section-kicker">KHO NỘI DUNG CỦA NGỌC</div><h3>${totalSentences} câu · ${totalDialogues} hội thoại</h3><p>Mỗi nội dung đều ghi rõ nguồn sách hoặc đánh dấu là hội thoại luyện tập mở rộng.</p></div>
        <div class="library-flower">✿</div>
      </div>
      <div class="library-list">${data.books.map((book, index) => {
        const bookSentences = sentencesByBook(book.id);
        const bookDialogues = dialoguesByBook(book.id);
        const learned = bookSentences.filter((item) => state.learned.includes(item.id)).length;
        const progress = bookSentences.length ? Math.round((learned / bookSentences.length) * 100) : 0;
        return `<article class="library-card book-tone-${index + 1}">
          <div class="book-cover"><div class="book-cover-glow"></div><span>${book.icon || '📖'}</span><small>Nguồn ${index + 1}</small></div>
          <div class="book-info">
            <div class="book-label">TÀI LIỆU ĐÃ THÊM</div><h3>${book.title}</h3><p>${book.description || ''}</p>
            <div class="book-meta"><span>${bookSentences.length} câu</span><span>${topicCountForBook(book.id)} chủ đề</span><span>${bookDialogues.length} hội thoại</span></div>
            <div class="bar book-progress"><i style="width:${progress}%"></i></div><small class="progress-label">${progress}% nội dung đã học</small>
            <div class="book-actions"><button data-book-view="${book.id}">Xem nội dung</button><button class="book-study" data-book-study="${book.id}">Học ngay →</button></div>
          </div>
        </article>`;
      }).join('')}</div>
      <div class="library-note"><b>Vì sao chỉ thấy số câu đã nhập?</b><p>v0.1 đang chứa phần nội dung đã chuẩn hóa. Dữ liệu từ ba sách sẽ tiếp tục được bổ sung theo từng phiên bản.</p></div>
    </section>`;
  }

  function bookScreen() {
    const book = bookById(state.bookId) || data.books[0];
    const bookSentences = sentencesByBook(book.id);
    const grouped = [...new Set(bookSentences.map((item) => item.topic))]
      .map((topicId) => ({ topic: topicById(topicId), items: bookSentences.filter((item) => item.topic === topicId) }))
      .filter((group) => group.topic);

    return `<section class="screen child-screen">
      ${header(book.title, `${bookSentences.length} câu đã chuẩn hóa`, 'library')}
      <div class="book-detail-hero"><div class="book-detail-icon">${book.icon || '📖'}</div><div><div class="section-kicker">NỘI DUNG TRONG SÁCH</div><h3>${topicCountForBook(book.id)} chủ đề học</h3><p>${book.description || ''}</p></div></div>
      <div class="list book-topic-list">${grouped.map((group) => `<article class="card book-topic-card" data-book-topic="${group.topic.id}" data-book-id="${book.id}"><div class="art small-art">${group.topic.icon}</div><div><div class="pill">${group.topic.jp || ''}</div><h3>${group.topic.title}</h3><p>${group.items.length} câu từ tài liệu này</p><span class="inline-link">Mở bài học →</span></div></article>`).join('')}</div>
    </section>`;
  }

  function reviewScreen() {
    const list = data.sentences.filter((item) => state.saved.includes(item.id));
    return `<section class="screen">${header('Ôn tập', 'Những câu bạn đã lưu')}<div class="list">${list.length ? list.map((item) => `<div class="card"><div class="jp" style="font-size:17px">${item.japanese}</div><p class="vi">${item.vietnamese}</p><button class="small" data-sentence="${item.id}">Mở bài học</button></div>`).join('') : '<div class="empty">Chưa lưu câu nào.</div>'}</div>${nav('home')}</section>`;
  }

  function profileScreen() {
    return `<section class="screen">${header('Hồ sơ của Ngọc', 'Tiến độ học Kaiwa')}<div style="text-align:center;padding:18px"><div class="avatar" style="width:88px;height:88px;margin:auto;font-size:32px">N</div><h2>${Math.max(1, state.learned.length)} ngày liên tục 🌸</h2></div><div class="stats"><div class="card stat"><b>${state.learned.length}</b><span>Đã học</span></div><div class="card stat"><b>${state.saved.length}</b><span>Đã lưu</span></div><div class="card stat"><b>${data.dialogues.length}</b><span>Hội thoại</span></div></div>${nav('profile')}</section>`;
  }

  function speak(text, rate = 0.86, done) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.volume = 1;
    if (voices[0]) utterance.voice = voices[0];
    utterance.onend = () => done && done();
    speechSynthesis.speak(utterance);
  }

  function speakSegments(parts) {
    let index = 0;
    const next = () => {
      if (index >= parts.length) return;
      speak(parts[index++], 0.66, () => setTimeout(next, 300));
    };
    next();
  }

  async function record(audioId, advance = false) {
    try {
      if (recorder && recorder.state === 'recording') {
        recorder.stop();
        return;
      }
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        render();
        setTimeout(() => {
          const audio = document.getElementById(audioId);
          if (audio) {
            audio.src = URL.createObjectURL(blob);
            audio.hidden = false;
          }
        }, 0);
        if (advance) setTimeout(() => { state.ri = Math.min(state.ri + 1, currentDialogue().lines.length - 1); render(); }, 800);
      };
      recorder.start();
      render();
    } catch (error) {
      showToast(`Không mở được micro: ${error.message}`);
    }
  }

  document.addEventListener('click', (event) => {
    const goButton = event.target.closest('[data-go]');
    if (goButton) return go(goButton.dataset.go);

    const topicButton = event.target.closest('[data-topic]');
    if (topicButton) {
      state.topic = topicButton.dataset.topic;
      state.idx = 0;
      const relatedDialogue = data.dialogues.find((item) => item.topic === state.topic);
      if (relatedDialogue) state.dlg = relatedDialogue.id;
      persist();
      return go('lesson');
    }

    const viewBook = event.target.closest('[data-book-view]');
    if (viewBook) {
      state.bookId = viewBook.dataset.bookView;
      persist();
      return go('book');
    }

    const studyBook = event.target.closest('[data-book-study]');
    if (studyBook) {
      const first = sentencesByBook(studyBook.dataset.bookStudy)[0];
      if (!first) return showToast('Tài liệu này chưa có câu học.');
      state.topic = first.topic;
      state.idx = sentences(first.topic).findIndex((item) => item.id === first.id);
      const relatedDialogue = data.dialogues.find((item) => item.topic === first.topic);
      if (relatedDialogue) state.dlg = relatedDialogue.id;
      persist();
      return go('lesson');
    }

    const bookTopic = event.target.closest('[data-book-topic]');
    if (bookTopic) {
      const bookId = bookTopic.dataset.bookId;
      const topicId = bookTopic.dataset.bookTopic;
      const first = sentencesByBook(bookId).find((item) => item.topic === topicId);
      state.topic = topicId;
      state.idx = Math.max(0, sentences(topicId).findIndex((item) => item.id === first?.id));
      const relatedDialogue = data.dialogues.find((item) => item.topic === topicId);
      if (relatedDialogue) state.dlg = relatedDialogue.id;
      persist();
      return go('lesson');
    }

    const sentenceButton = event.target.closest('[data-sentence]');
    if (sentenceButton) {
      const item = data.sentences.find((value) => value.id === sentenceButton.dataset.sentence);
      state.topic = item.topic;
      state.idx = sentences().findIndex((value) => value.id === item.id);
      return go('lesson');
    }

    const speakButton = event.target.closest('[data-speak]');
    if (speakButton) {
      const item = currentSentence();
      return speakButton.dataset.speak === 'segments'
        ? speakSegments(item.segments || [item.japanese])
        : speak(item.japanese, speakButton.dataset.speak === 'slow' ? 0.66 : 0.86);
    }

    const action = event.target.closest('[data-act]')?.dataset.act;
    if (!action) return;
    if (action === 'settings') showToast('Phần cài đặt chi tiết sẽ có trong bản tiếp theo.');
    if (action === 'next') {
      const item = currentSentence();
      if (!state.learned.includes(item.id)) state.learned.push(item.id);
      state.idx = (state.idx + 1) % sentences().length;
      persist();
      render();
    }
    if (action === 'save') {
      const item = currentSentence();
      const index = state.saved.indexOf(item.id);
      index < 0 ? state.saved.push(item.id) : state.saved.splice(index, 1);
      persist();
      render();
    }
    if (action === 'record') record('play');
    if (action === 'openRole') go('role');
    if (action === 'roleMain') {
      const line = currentDialogue().lines[state.ri];
      line.speaker === state.role
        ? record('roleplay', true)
        : speak(line.japanese, 0.8, () => { state.ri = Math.min(state.ri + 1, currentDialogue().lines.length - 1); render(); });
    }
    if (action === 'swap') { state.role = state.role === 'A' ? 'B' : 'A'; state.ri = 0; persist(); render(); }
    if (action === 'restart') { state.ri = 0; render(); }
    if (action === 'prev') { state.ri = Math.max(0, state.ri - 1); render(); }
    if (action === 'rnext') { state.ri = Math.min(currentDialogue().lines.length - 1, state.ri + 1); render(); }
  });

  speechSynthesis.onvoiceschanged = () => { voices = speechSynthesis.getVoices().filter((voice) => voice.lang?.startsWith('ja')); };
  voices = speechSynthesis.getVoices().filter((voice) => voice.lang?.startsWith('ja'));
  render();
})();