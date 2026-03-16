const http = require('http');
const https = require('https');
const { parseStringPromise } = require('xml2js');

const TUNEIN_BASE = 'http://opml.radiotime.com';

async function searchStations(query) {
  const url = `${TUNEIN_BASE}/Search.ashx?query=${encodeURIComponent(query)}&render=json`;
  const data = await fetchJson(url);
  return parseStationResults(data);
}

async function browseCategory(category) {
  const categoryMap = {
    music: 'c=music',
    news: 'c=news',
    sports: 'c=sports',
    talk: 'c=talk',
    top: 'c=trending',
  };
  const param = categoryMap[category] || `c=${category}`;
  const url = `${TUNEIN_BASE}/Browse.ashx?${param}&render=json`;
  const data = await fetchJson(url);
  return parseStationResults(data);
}

async function resolveStreamUrl(stationId) {
  const url = `${TUNEIN_BASE}/Tune.ashx?id=${stationId}&render=json`;
  const data = await fetchJson(url);

  if (data?.body?.[0]?.url) {
    return data.body[0].url;
  }

  // Fallback: try non-json to get direct URL
  const plainUrl = `${TUNEIN_BASE}/Tune.ashx?id=${stationId}`;
  const text = await fetchText(plainUrl);
  const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return lines[0] || null;
}

function parseStationResults(data) {
  if (!data?.body) return [];

  const results = [];
  const items = Array.isArray(data.body) ? data.body : [data.body];

  for (const item of items) {
    if (Array.isArray(item.children)) {
      for (const child of item.children) {
        if (child.type === 'audio' || child.item === 'station') {
          results.push({
            stationId: child.guide_id || child.preset_id || '',
            name: child.text || '',
            description: child.subtext || '',
            logo: child.image || '',
            streamUrl: child.URL || child.url || '',
          });
        }
      }
    }
    // Top-level audio items
    if (item.type === 'audio' || item.item === 'station') {
      results.push({
        stationId: item.guide_id || item.preset_id || '',
        name: item.text || '',
        description: item.subtext || '',
        logo: item.image || '',
        streamUrl: item.URL || item.url || '',
      });
    }
  }

  return results;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      })
      .on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

module.exports = { searchStations, browseCategory, resolveStreamUrl };
