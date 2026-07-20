(() => {
  const body = document.body;
  const navToggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-site-nav]');

  const closeNav = () => {
    if (!navToggle || !nav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    body.classList.remove('nav-open');
  };

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const opening = navToggle.getAttribute('aria-expanded') !== 'true';
      navToggle.setAttribute('aria-expanded', String(opening));
      nav.classList.toggle('is-open', opening);
      body.classList.toggle('nav-open', opening);
    });

    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeNav();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeNav();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 930) closeNav();
    });
  }

  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  const filterGroups = document.querySelectorAll('[data-filter-group]');
  filterGroups.forEach((group) => {
    const buttons = group.querySelectorAll('[data-filter]');
    const targetSelector = group.getAttribute('data-filter-target');
    const items = document.querySelectorAll(targetSelector || '[data-filter-item]');

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const selected = button.getAttribute('data-filter') || 'all';
        buttons.forEach((candidate) => {
          candidate.setAttribute('aria-pressed', String(candidate === button));
        });

        items.forEach((item) => {
          const topics = (item.getAttribute('data-topics') || '').split(/\s+/);
          item.hidden = selected !== 'all' && !topics.includes(selected);
        });
      });
    });
  });

  const revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries, revealObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

    revealNodes.forEach((node) => observer.observe(node));
  } else {
    revealNodes.forEach((node) => node.classList.add('is-visible'));
  }

  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy');
      if (!value || !navigator.clipboard) return;
      const original = button.textContent;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = original; }, 1600);
      } catch (_) {
        // Clipboard access may be unavailable on local file previews.
      }
    });
  });
})();

(() => {
  const form = document.querySelector('[data-search-form]');
  const input = document.querySelector('[data-search-input]');
  const resultsNode = document.querySelector('[data-search-results]');
  const statusNode = document.querySelector('[data-search-status]');
  if (!form || !input || !resultsNode || !statusNode) return;

  let records = [];
  const escapeHtml = (value = '') => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

  const normalize = (value = '') => String(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  const scoreRecord = (record, terms) => {
    const title = normalize(record.title);
    const description = normalize(record.description);
    const text = normalize(record.text);
    let score = 0;
    for (const term of terms) {
      if (title === term) score += 80;
      else if (title.includes(term)) score += 30;
      if (description.includes(term)) score += 12;
      if (text.includes(term)) score += 4;
    }
    return score;
  };

  const render = (query, updateUrl = true) => {
    const cleaned = query.trim();
    if (updateUrl) {
      const url = new URL(window.location.href);
      if (cleaned) url.searchParams.set('q', cleaned);
      else url.searchParams.delete('q');
      window.history.replaceState({}, '', url);
    }
    if (!cleaned) {
      resultsNode.innerHTML = '';
      statusNode.textContent = 'Enter a word or phrase to begin.';
      return;
    }
    const terms = normalize(cleaned).split(/\s+/).filter(Boolean);
    const matches = records
      .map((record) => ({ ...record, score: scoreRecord(record, terms) }))
      .filter((record) => record.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 50);

    statusNode.textContent = matches.length === 1 ? '1 result' : `${matches.length} results`;
    resultsNode.innerHTML = matches.length
      ? matches.map((record) => {
          const external = /^https?:\/\//i.test(record.url || '');
          return `<article class="search-result"><span class="search-result__type">${escapeHtml(record.type)}</span><h2><a href="${escapeHtml(record.url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(record.title)}</a></h2><p>${escapeHtml(record.description || '')}</p></article>`;
        }).join('')
      : '<div class="callout"><p>No matching content was found. Try a broader term.</p></div>';
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    render(input.value);
  });

  fetch('/search.json')
    .then((response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      records = Array.isArray(data) ? data : [];
      const initial = new URLSearchParams(window.location.search).get('q') || '';
      input.value = initial;
      if (initial) render(initial, false);
    })
    .catch(() => {
      statusNode.textContent = 'Search is temporarily unavailable.';
    });
})();
