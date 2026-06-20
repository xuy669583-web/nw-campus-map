const fs = require('fs');
const path = require('path');

const contentDir = path.join(__dirname, '..', 'content');
const outputDir = path.join(__dirname, '..', 'public', 'data');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseValue(value) {
  value = value.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (!isNaN(Number(value)) && value !== '' && !isNaN(parseFloat(value))) {
    if (value.includes('.')) return parseFloat(value);
    return parseInt(value, 10);
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value);
    } catch (e) {}
  }
  return value;
}

function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, content: text };
  
  const yaml = match[1];
  const body = match[2].trim();
  
  const data = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.startsWith('- ')) {
      if (currentKey) {
        if (!data[currentKey]) data[currentKey] = [];
        const value = trimmed.slice(2).trim();
        data[currentKey].push(parseValue(value));
      }
    } else if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      
      if (value === '') {
        currentKey = key;
        if (!data[key]) data[key] = [];
      } else {
        currentKey = null;
        data[key] = parseValue(value);
      }
    }
  }
  
  return { data, content: body };
}

function parsePOIs() {
  const poisDir = path.join(contentDir, 'pois');
  if (!fs.existsSync(poisDir)) {
    console.log('content/pois directory not found');
    return [];
  }
  
  const files = fs.readdirSync(poisDir).filter(f => f.endsWith('.md'));
  const pois = [];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(poisDir, file), 'utf8');
    const parsed = parseFrontmatter(content);
    const data = parsed.data;
    
    if (data.visible === false) continue;
    
    const position = [];
    if (data.lng !== undefined) position.push(parseFloat(data.lng));
    if (data.lat !== undefined) position.push(parseFloat(data.lat));
    
    const poi = {
      name: data.name || '',
      type: data.type || '',
      subtype: data.subtype || data.type || '',
      position: position.length === 2 ? position : [0, 0],
      info: data.info || data.address || '',
      description: data.description || data.detail || '',
      pastImages: data.pastImages || [],
      currentImages: data.currentImages || [],
    };
    
    pois.push(poi);
  }
  
  pois.sort((a, b) => {
    const sortA = a.sort !== undefined ? a.sort : 0;
    const sortB = b.sort !== undefined ? b.sort : 0;
    return sortA - sortB;
  });
  
  return pois;
}

ensureDir(outputDir);
const pois = parsePOIs();
fs.writeFileSync(path.join(outputDir, 'pois.json'), JSON.stringify(pois, null, 2));
console.log(`Built ${pois.length} POIs to public/data/pois.json`);
