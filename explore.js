(() => {
  'use strict';

  function makeQuiz(groups) {
    const words = [];
    const longest = Math.max(...groups.map(group => group.words.length));
    for (let row = 0; row < longest; row++) {
      for (const group of groups) {
        if (group.words[row]) words.push(group.words[row]);
      }
    }
    return Array.from({length: 20}, (_, i) => {
      const word = words[i % words.length];
      const reverse = i >= words.length;
      const sameGroup = groups.find(group => group.words.includes(word)).words;
      const distractors = [...sameGroup, ...words].filter(item => item !== word);
      const choices = [...new Set(distractors.map(item => item[reverse ? 1 : 0]))]
        .filter(value => value !== word[reverse ? 1 : 0]);
      const correct = i % 3;
      const options = [choices[i % choices.length], choices[(i + 1) % choices.length]];
      options.splice(correct, 0, word[reverse ? 1 : 0]);
      return {
        visual: word[2],
        prompt: reverse ? 'Pilih maksud bagi “' + word[0] + '”.' : 'Pilih bahasa Inggeris untuk “' + word[1] + '”.',
        options, correct, hint: word[0] + ' · ' + word[1]
      };
    });
  }

  const habitat = [
    ['Camel', 'Desert'], ['Goat', 'Mountains'], ['Jellyfish', 'Ocean'],
    ['Penguin', 'Polar region'], ['Polar bear', 'Polar region'], ['Shark', 'Ocean'], ['Tiger', 'Jungle']
  ];
  const roomMarkers = [
    ['Bedroom', 54, 36], ['Bathroom', 80, 36], ['Hall', 34, 61],
    ['Living room', 56, 58], ['Dining room', 75, 65], ['Kitchen', 83, 53],
    ['Stairs', 51, 79], ['Cellar', 74, 82]
  ];
  const shuffle = words => {
    const result = [...words];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const html = value => String(value).replace(/[&<>"']/g, c => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]
  ));

  function open(topic, image, modal, back) {
    const groups = window.QUEST_VOCAB[topic.id];
    let groupIndex = 0;
    let mode = 'learn';
    let position = 0;
    let revealed = false;
    let dayCount = 0;

    modal('<div class="vocab-explore" id="vocabExplore"></div>');
    const root = document.getElementById('vocabExplore');
    const group = () => groups[groupIndex];
    const current = () => group().words[position];
    const action = (name, label, extra = '') =>
      '<button type="button" data-action="' + name + '" ' + extra + '>' + html(label) + '</button>';

    function learn() {
      const word = current();
      const house = topic.id === 'old-house' && groupIndex === 0;
      const scene = house ? '<div class="vocab-house"><img src="' + html(image) +
        '" alt="The Old House cutaway, with a cellar below the living room and kitchen">' +
        roomMarkers.map(([term, x, y], index) => {
          const item = group().words.findIndex(entry => entry[0] === term);
          return '<button type="button" class="vocab-pin" data-action="word" data-i="' + item +
            '" style="left:' + x + '%;top:' + y + '%" aria-label="' + html(term) +
            '" aria-pressed="' + (item === position) + '">' + (index + 1) + '</button>';
        }).join('') + '</div>' : '';
      return scene + '<div class="vocab-card" aria-live="polite"><span aria-hidden="true">' +
        html(word[2]) + '</span><strong lang="en">' + html(word[0]) +
        '</strong><small lang="ms">' + html(word[1]) + '</small></div>' +
        '<div class="vocab-words">' + group().words.map(([name], i) =>
          action('word', name, 'lang="en" data-i="' + i + '" aria-pressed="' + (i === position) + '"')
        ).join('') + '</div>';
    }

    function practice() {
      const word = current();
      const isHabitat = mode === 'habitat';
      const example = habitat[position];
      const answer = isHabitat ? example[1] : word[0];
      const clue = isHabitat ? 'Pilih satu habitat yang biasa dikaitkan dengan ' + example[0] + '.' :
        'Pilih bahasa Inggeris untuk “' + word[1] + '”.';
      const pool = isHabitat ? groups[1].words : group().words;
      const alternatives = pool.map(entry => entry[0]).filter(term => term !== answer);
      const options = [answer, alternatives[position % alternatives.length],
        alternatives[(position + 1) % alternatives.length]];
      const ordered = options.slice(position % 3).concat(options.slice(0, position % 3));
      return '<p lang="ms">' + html(clue) + '</p><div class="vocab-words">' +
        ordered.map(term => action('answer', term, 'lang="en" data-correct="' + (term === answer) + '"')).join('') +
        '</div><p class="vocab-feedback" role="status">' + (revealed ? 'Jawapan: ' + html(answer) : '') + '</p>' +
        '<div class="vocab-actions">' + action('reveal', 'Tunjuk jawapan') +
        action('next', 'Seterusnya / Langkau') + '</div>';
    }

    let dayOrder = [];
    function days() {
      const names = group().words.map(word => word[0]);
      if (!dayOrder.length) dayOrder = shuffle(names);
      return '<p lang="ms">Ketik hari mengikut turutan, bermula dengan Monday.</p><p class="vocab-feedback" role="status">' +
        (dayCount === 7 ? 'Syabas! Semua hari telah disusun.' : '') + '</p><div class="vocab-words">' +
        dayOrder.filter(name => names.indexOf(name) >= dayCount).map(name =>
          action('day', name, 'lang="en" data-correct="' + (names[dayCount] === name) + '"')).join('') +
        '</div><ol class="vocab-days" lang="en" aria-label="Days in order">' +
        names.slice(0, dayCount).map(name => '<li>' + html(name) + '</li>').join('') +
        '</ol>' + action('days', 'Mula semula');
    }

    function render(focus) {
      root.innerHTML = '<h2 id="dialogTitle">Explore · ' + html(topic.title) + '</h2>' +
        '<p lang="ms">Belajar dan cuba semula tanpa markah.</p><div class="vocab-groups" aria-label="Vocabulary groups">' +
        groups.map((entry, i) => action('group', entry.name, 'data-i="' + i +
          '" aria-pressed="' + (i === groupIndex) + '"')).join('') +
        '</div><div class="vocab-actions">' +
        action('learn', 'Kad kata', 'aria-pressed="' + (mode === 'learn') + '"') +
        action('practice', 'Padankan kata', 'aria-pressed="' + (mode === 'practice') + '"') +
        (topic.id === 'free-time' && groupIndex === 0 ? action('days', 'Susun hari') : '') +
        (topic.id === 'old-house' && groupIndex === 1 ? action('habitat', 'Haiwan dan habitat') : '') +
        '</div><div class="vocab-content">' + (mode === 'learn' ? learn() : mode === 'days' ? days() : practice()) +
        '</div>' + action('back', 'Kembali ke pilihan Quest');
      if (focus) {
        const target = root.querySelector(focus) || root.querySelector('.vocab-content');
        if (!target.matches('button')) target.tabIndex = -1;
        target.focus();
      }
    }

    root.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      const name = button.dataset.action;
      const i = Number(button.dataset.i);
      let focus = '[data-action="' + name + '"]';
      if (name === 'back') { back(); return; }
      if (name === 'group') {
        groupIndex = i;
        position = 0;
        mode = 'learn';
        focus += '[data-i="' + i + '"]';
      } else if (name === 'word') {
        position = i;
        focus += '[data-i="' + i + '"]';
      } else if (name === 'answer' || name === 'day') {
        if (name === 'day' && button.dataset.correct === 'true') {
          dayCount++;
          render('.vocab-words button');
          return;
        }
        const correct = button.dataset.correct === 'true';
        root.querySelector('.vocab-feedback').textContent = correct ? 'Betul!' : 'Cuba lagi.';
        button.dataset.result = correct ? 'ok' : 'retry';
        return;
      } else if (name === 'reveal') {
        revealed = true;
        render(focus);
        return;
      } else if (name === 'next') {
        position = (position + 1) % (mode === 'habitat' ? habitat.length : group().words.length);
      } else {
        mode = name;
        position = 0;
        if (name === 'days') { dayCount = 0; dayOrder = []; }
      }
      revealed = false;
      render(focus);
    });

    render();
  }

  window.QuestExplore = {open, makeQuiz};
})();
