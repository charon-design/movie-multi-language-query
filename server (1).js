const express = require('express');
const path = require('path');
const fetch = global.fetch;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

const localData = [
  {
    title: '流浪地球',
    title_en: 'The Wandering Earth',
    type: '电影',
    region: '中国',
    year: 2019,
    yearCategory: '2010s',
    nationality: '中国',
    summary: '中国科幻电影，讲述未来太阳危机下人类推动地球离开太阳系的故事。',
    actors: [
      { name: '屈楚萧', name_en: 'Jackson Yee' },
      { name: '吴京', name_en: 'Jing Wu' },
      { name: '李光洁', name_en: 'Gao Jie Li' }
    ]
  },
  {
    title: '甄嬛传',
    title_en: 'Empresses in the Palace',
    type: '电视剧',
    region: '中国',
    year: 2011,
    yearCategory: '2010s',
    nationality: '中国',
    summary: '宫廷权谋剧，讲述甄嬛从少女进入后宫到成为太后的成长历程。',
    actors: [
      { name: '孙俪', name_en: 'Silu Sun' },
      { name: '陈建斌', name_en: 'Jianbin Chen' }
    ]
  },
  {
    title: 'The Godfather',
    title_en: 'The Godfather',
    type: '电影',
    region: '美国',
    year: 1972,
    yearCategory: '1970s',
    nationality: '美国',
    summary: '经典美国黑帮电影，讲述科里昂家族的兴衰与权力传承。',
    actors: [
      { name: '马龙·白兰度', name_en: 'Marlon Brando' },
      { name: '阿尔·帕西诺', name_en: 'Al Pacino' }
    ]
  },
  {
    title: 'Breaking Bad',
    title_en: 'Breaking Bad',
    type: '电视剧',
    region: '美国',
    year: 2008,
    yearCategory: '2000s',
    nationality: '美国',
    summary: '美国犯罪剧情剧，讲述高中化学老师转行制造毒品后的蜕变。',
    actors: [
      { name: '布莱恩·科兰斯顿', name_en: 'Bryan Cranston' },
      { name: '亚伦·保尔', name_en: 'Aaron Paul' }
    ]
  },
  {
    title: '寄生虫',
    title_en: 'Parasite',
    type: '电影',
    region: '韩国',
    year: 2019,
    yearCategory: '2010s',
    nationality: '韩国',
    summary: '韩国黑色喜剧电影，揭示贫富差距与阶层对立。',
    actors: [
      { name: '宋康昊', name_en: 'Song Kang-ho' },
      { name: '朴素丹', name_en: 'Park So-dam' }
    ]
  }
];

function normalizeText(text) {
  return String(text || '').trim().toLowerCase();
}

function matchSearch(item, keyword) {
  if (!keyword) return true;
  const words = keyword.split(/\s+/).filter(Boolean);
  const source = [
    item.title,
    item.title_en,
    item.summary,
    item.region,
    item.nationality,
    ...(item.actors || []).map(actor => `${actor.name} ${actor.name_en}`)
  ]
    .join(' ')
    .toLowerCase();
  return words.every(word => source.includes(word));
}

function buildFilter({ query, region, type, year, nationality }) {
  const keyword = normalizeText(query);

  return item => {
    const matchRegion = !region || item.region === region;
    const matchType = !type || item.type === type;
    const matchYear = !year || item.yearCategory === year;
    const matchNationality = !nationality || normalizeText(item.nationality).includes(normalizeText(nationality));
    const matchKeyword = matchSearch(item, keyword);
    return matchRegion && matchType && matchYear && matchNationality && matchKeyword;
  };
}

function languageToRegion(code) {
  const map = {
    zh: '中国',
    ja: '日本',
    ko: '韩国',
    en: '美国',
    fr: '法国',
    de: '德国',
    hi: '印度',
    th: '泰国'
  };
  return map[code] || code;
}

function yearToCategory(year) {
  if (!year) return '';
  const n = Number(year);
  if (Number.isNaN(n)) return '';
  const decade = Math.floor(n / 10) * 10;
  return decade ? `${decade}s` : '';
}

const tmdbImageBase = 'https://image.tmdb.org/t/p/w500';

function getPosterUrl(item) {
  if (item.poster_path) return `${tmdbImageBase}${item.poster_path}`;
  if (item.backdrop_path) return `${tmdbImageBase}${item.backdrop_path}`;
  if (item.image && item.image.medium) return item.image.medium;
  if (item.image && item.image.original) return item.image.original;
  return '';
}

function stripHtml(str) {
  return String(str || '').replace(/<[^>]+>/g, '').trim();
}

async function tmdbSearch(query) {
  if (!TMDB_API_KEY) return [];
  const results = [];
  const language = 'zh-CN';
  const searchPaths = [
    { path: 'search/movie', type: '电影' },
    { path: 'search/tv', type: '电视剧' }
  ];

  for (const { path: apiPath, type } of searchPaths) {
    const url = `https://api.themoviedb.org/3/${apiPath}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1&include_adult=false&language=${language}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const json = await res.json();
    if (!Array.isArray(json.results)) continue;

    results.push(...json.results.map(item => ({
      title: item.title || item.name || item.original_title || item.original_name || '',
      title_en: item.original_title || item.original_name || item.title || item.name || '',
      type,
      region: languageToRegion(item.original_language),
      year: item.release_date ? Number(item.release_date.slice(0, 4)) : (item.first_air_date ? Number(item.first_air_date.slice(0, 4)) : ''),
      yearCategory: item.release_date ? yearToCategory(item.release_date.slice(0, 4)) : (item.first_air_date ? yearToCategory(item.first_air_date.slice(0, 4)) : ''),
      nationality: languageToRegion(item.original_language),
      summary: item.overview || item.name || '',
      poster_url: getPosterUrl(item),
      actors: []
    })));
  }

  const personUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=1&language=${language}`;
  const personRes = await fetch(personUrl);
  if (personRes.ok) {
    const json = await personRes.json();
    if (Array.isArray(json.results) && json.results.length) {
      const person = json.results[0];
      const creditsUrl = `https://api.themoviedb.org/3/person/${person.id}/combined_credits?api_key=${TMDB_API_KEY}&language=${language}`;
      const creditsRes = await fetch(creditsUrl);
      if (creditsRes.ok) {
        const credits = await creditsRes.json();
        if (Array.isArray(credits.cast)) {
          results.push(...credits.cast.map(item => ({
            title: item.title || item.name || item.original_title || item.original_name || '',
            title_en: item.original_title || item.original_name || item.title || item.name || '',
            type: item.media_type === 'tv' ? '电视剧' : '电影',
            region: languageToRegion(item.original_language),
            year: item.release_date ? Number(item.release_date.slice(0, 4)) : (item.first_air_date ? Number(item.first_air_date.slice(0, 4)) : ''),
            yearCategory: item.release_date ? yearToCategory(item.release_date.slice(0, 4)) : (item.first_air_date ? yearToCategory(item.first_air_date.slice(0, 4)) : ''),
            nationality: languageToRegion(item.original_language),
            summary: item.overview || item.name || '',
            poster_url: getPosterUrl(item),
            actors: [{ name: person.name, name_en: person.name }]
          })));
        }
      }
    }
  }

  return results;
}

async function tvMazeSearch(query) {
  const results = [];
  const showUrl = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
  const showRes = await fetch(showUrl);
  if (showRes.ok) {
    const json = await showRes.json();
    if (Array.isArray(json)) {
      results.push(...json.map(item => {
        const show = item.show || {};
        return {
          title: show.name || '',
          title_en: show.name || '',
          type: show.type === 'Show' || show.type === 'Scripted' ? '电视剧' : show.type || '影视',
          region: show.network?.country?.name || (show.webChannel?.country?.name || '未知'),
          year: show.premiered ? Number(show.premiered.slice(0, 4)) : '',
          yearCategory: show.premiered ? yearToCategory(show.premiered.slice(0, 4)) : '',
          nationality: show.network?.country?.name || show.webChannel?.country?.name || '未知',
          summary: stripHtml(show.summary),
          poster_url: show.image?.medium || show.image?.original || '',
          actors: []
        };
      }));
    }
  }

  const personUrl = `https://api.tvmaze.com/search/people?q=${encodeURIComponent(query)}`;
  const personRes = await fetch(personUrl);
  if (personRes.ok) {
    const json = await personRes.json();
    if (Array.isArray(json)) {
      for (const item of json.slice(0, 3)) {
        const person = item.person;
        if (!person?.id) continue;
        const creditsUrl = `https://api.tvmaze.com/people/${person.id}/castcredits?embed=show`;
        const creditsRes = await fetch(creditsUrl);
        if (!creditsRes.ok) continue;
        const credits = await creditsRes.json();
        if (!Array.isArray(credits)) continue;
        results.push(...credits.map(credit => {
          const show = credit._embedded?.show || {};
          return {
            title: show.name || '',
            title_en: show.name || '',
            type: show.type === 'Show' || show.type === 'Scripted' ? '电视剧' : show.type || '影视',
            region: show.network?.country?.name || show.webChannel?.country?.name || '未知',
            year: show.premiered ? Number(show.premiered.slice(0, 4)) : '',
            yearCategory: show.premiered ? yearToCategory(show.premiered.slice(0, 4)) : '',
            nationality: show.network?.country?.name || show.webChannel?.country?.name || '未知',
            summary: stripHtml(show.summary),
            poster_url: show.image?.medium || show.image?.original || '',
            actors: [{ name: person.name, name_en: person.name }]
          };
        }));
      }
    }
  }

  return results;
}

async function omdbSearch(query) {
  if (!OMDB_API_KEY) return [];
  const searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}&type=movie`;
  const res = await fetch(searchUrl);
  if (!res.ok) return [];
  const json = await res.json();
  if (!Array.isArray(json.Search)) return [];
  return json.Search.map(item => ({
    title: item.Title || '',
    title_en: item.Title || '',
    type: item.Type === 'movie' ? '电影' : item.Type,
    region: '美国',
    year: item.Year ? Number(item.Year.slice(0, 4)) : '',
    yearCategory: item.Year ? yearToCategory(item.Year.slice(0, 4)) : '',
    nationality: '美国',
    summary: '',
    actors: []
  }));
}

function dedupeResults(items) {
  const map = new Map();
  items.forEach(item => {
    const key = `${item.title}|${item.title_en}|${item.year}`;
    if (!map.has(key)) {
      map.set(key, item);
    }
  });
  return Array.from(map.values());
}

app.use(express.static(path.join(__dirname)));

app.get('/api/search', async (req, res) => {
  const query = req.query.q || '';
  const region = req.query.region || '';
  const type = req.query.type || '';
  const year = req.query.year || '';
  const nationality = req.query.nationality || '';

  let results = localData.slice();

  if (query) {
    try {
      const external = [];
      external.push(...await tvMazeSearch(query));
      if (TMDB_API_KEY) {
        external.push(...await tmdbSearch(query));
      }
      if (OMDB_API_KEY) {
        external.push(...await omdbSearch(query));
      }
      results = results.concat(external);
    } catch (error) {
      console.error('External search failed:', error.message);
    }
  }

  const filtered = results.filter(buildFilter({ query, region, type, year, nationality }));
  res.json(dedupeResults(filtered));
});

app.listen(port, () => {
  console.log(`Movie search app listening at http://localhost:${port}`);
  console.log(`TMDB enabled: ${Boolean(TMDB_API_KEY)}`);
  console.log(`OMDB enabled: ${Boolean(OMDB_API_KEY)}`);
});
