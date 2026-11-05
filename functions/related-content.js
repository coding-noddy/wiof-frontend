/**
 * Automatic related content (Phase 2 step 4)
 * ==========================================
 * "Explore next" shows an admin's own links first. To fill the rest with
 * items about the same thing (not just the same element), this module finds,
 * for every blog and active action, the blogs and actions whose text is most
 * alike, and stores them in `related_auto/{type}_{id}`:
 *
 *   { blogs: [{id, score}], actions: [{id, score}], version, computedAt }
 *
 * Method: keyword relevance (TF-IDF with cosine similarity), the standard
 * content-based approach, computed on the server so a page reads one small
 * doc. Text is weighted by field (title and topic count more than body
 * text), common words are dropped, words are reduced to a simple stem, and
 * a small WIOF thesaurus maps words that mean the same thing ("vegan",
 * "plant-based", "meat-free") to one concept so they match each other.
 * Sharing an element adds a small bonus. Matches below MIN_SCORE are left
 * out, so a weak match is never shown as "related".
 *
 * Recomputed whenever a blog or action is written (onBlogWritten,
 * onActionWritten in index.js), and by scripts/rebuild-related-content.js.
 * The whole corpus is small (tens of items), so a full rebuild is cheap and
 * keeps every list consistent with the current IDF.
 */

const RELATED_AUTO = 'related_auto';
const RELATED_VERSION = 1;
const MIN_SCORE = 0.08;
// Occasions have a sentence or two of text, so chance overlaps score higher:
// a stricter bar (on staging, 0.08–0.09 matches were things like World Sparrow
// Day -> a Covid story; 0.10+ were right, e.g. Vegetarian Day -> Veganism).
const OCCASION_MIN_SCORE = 0.1;
// ...and at least this many terms in common, so one shared word can't carry
// a match: "World Run Day" shared only "run" with "Stop Unnecessary Running
// Water". (A word and its thesaurus concept count as two, as for
// "plant-based" -> #plantdiet.)
const OCCASION_MIN_SHARED = 2;
// Calendar boilerplate that says nothing about an occasion's topic.
const OCCASION_BOILERPLATE = /\b(world|worldwide|international|national|global|day|days|week|month|year|years|yearly|annual|annually|celebrat\w*|observ\w*|commemorat\w*|awareness|dedicated|held|marks?|aims?|raise|raising|spread|recogni[sz]\w*|honou?r\w*|occasion|event|people|across|around|together|whole|highlight\w*|importance|issues?)\b/gi;
const ELEMENT_BONUS = 0.04;
const PER_TYPE = 4;
const BODY_WORDS = 600;

const STOPWORDS = new Set(`
a about above after again against all also am an and any are as at be because been before being below between both
but by can could did do does doing done down during each even every few for from further get gets getting go goes
going got had has have having he her here hers herself him himself his how however i if in into is it its itself
just let like make makes many may me might more most much must my myself need needs new no nor not now of off often
on once one only or other our ours ourselves out over own per put quite rather really same say says see she should
so some still such take than that the their theirs them themselves then there these they thing things this those
though through to too try under until up upon us use used uses using very via want was way ways we well were what
when where whether which while who whom why will with within without would yet you your yours yourself yourselves
day days time times year years people person world one two three first lot lots part simple simply small big good
great best better help helps keep kind know life live make made making much right think today together around back
another always never ever every everyone everything something someone anything nothing etc
`.split(/\s+/).filter(Boolean));

// Words with the same meaning, mapped to one concept token. Applied after
// stemming, so list the stemmed form (see stem()).
const THESAURUS = {
  vegan: 'plantdiet', vegetarian: 'plantdiet', plant_based: 'plantdiet', meatfree: 'plantdiet', meatless: 'plantdiet', veganism: 'plantdiet',
  dairy: 'plantdiet', meat: 'plantdiet',
  recycl: 'recycle', reus: 'reuse', reusabl: 'reuse', refill: 'reuse', secondhand: 'reuse', repair: 'reuse', upcycl: 'reuse',
  wast: 'waste', trash: 'waste', garbag: 'waste', litter: 'waste', landfill: 'waste', plastic: 'plastic',
  electric: 'energy', electricity: 'energy', power: 'energy', solar: 'renewable', wind: 'renewable', renewabl: 'renewable',
  rainwat: 'waterconserve', harvest: 'waterconserve', tap: 'waterconserve', shower: 'waterconserve', leak: 'waterconserve',
  river: 'river', rivers: 'river', lake: 'river', ocean: 'ocean', sea: 'ocean', marin: 'ocean',
  tree: 'greenery', plant: 'greenery', garden: 'greenery', gardening: 'greenery', vegetabl: 'greenery', fruit: 'greenery', soil: 'greenery', compost: 'compost',
  bee: 'pollinator', honey: 'pollinator', butterfli: 'pollinator', pollin: 'pollinator',
  pollut: 'pollution', pollution: 'pollution', emission: 'carbon', smog: 'pollution', aqi: 'pollution', emiss: 'carbon', carbon: 'carbon', co2: 'carbon', greenhous: 'carbon',
  bike: 'mobility', cycl: 'mobility', walk: 'mobility', bus: 'mobility', commut: 'mobility', car: 'mobility',
  meditat: 'mindful', medit: 'mindful', mindful: 'mindful', mindfuln: 'mindful', yoga: 'mindful', silenc: 'mindful', breath: 'mindful', sleep: 'wellbeing', health: 'wellbeing', healthi: 'wellbeing',
  food: 'food', meal: 'food', recip: 'food', eat: 'food', cook: 'food', diet: 'food',
  spend: 'consume', shop: 'consume', shopp: 'consume', buy: 'consume', purchas: 'consume', cloth: 'consume', closet: 'consume', declutt: 'consume'
};

/** A crude English stem: enough to match "recycling"/"recycled"/"recycle". */
function stem(word) {
  let w = word;
  if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 4 && /(ss|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
  for (const suffix of ['ation', 'ness', 'ment', 'ing', 'ers', 'ed', 'er', 'ly', 's', 'e']) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

/** Text → terms: lower case, no HTML, no stopwords, stemmed, thesaurus concepts added. */
function terms(text) {
  const cleaned = String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .toLowerCase()
    .replace(/plant[\s-]based/g, 'plant_based')
    .replace(/meat[\s-]free/g, 'meatfree')
    .replace(/second[\s-]hand/g, 'secondhand');
  const result = [];
  for (const raw of cleaned.split(/[^a-z0-9_]+/)) {
    if (raw.length < 3 || STOPWORDS.has(raw) || /^\d+$/.test(raw)) continue;
    const s = stem(raw);
    result.push(s);
    const concept = THESAURUS[raw] || THESAURUS[s];
    if (concept) result.push(`#${concept}`);
  }
  return result;
}

const words = (text, max) => String(text || '').replace(/<[^>]*>/g, ' ').split(/\s+/).slice(0, max).join(' ');
const list = (value) => (Array.isArray(value) ? value.join(' ') : '');

/** The weighted text fields of a blog, action or calendar occasion. */
function fieldsOf(item) {
  if (item.type === 'occasion') {
    const topic = (text) => String(text || '').replace(OCCASION_BOILERPLATE, ' ');
    return [
      [topic(item.title), 3],
      [topic(item.description), 2]
    ];
  }
  if (item.type === 'blog') {
    return [
      [item.title, 3],
      [item.subCategory, 3],
      [item.shortDescription, 2],
      [words(item.content, BODY_WORDS), 1]
    ];
  }
  return [
    [item.title, 3],
    [`${list(item.tags)} ${list(item.categories).replace(/-/g, ' ')}`, 3],
    [item.shortDescription, 2],
    [`${item.description || ''} ${list(item.instructions)}`, 1]
  ];
}

/**
 * TF-IDF vectors (unit length) for every item. Document frequency comes from
 * the targets (blogs and actions) only: calendar occasions are queries, so
 * adding them must not shift how rare a word is among the things we suggest.
 */
function vectorize(items) {
  const tfs = items.map((item) => {
    const tf = new Map();
    for (const [text, weight] of fieldsOf(item)) {
      for (const term of terms(text)) tf.set(term, (tf.get(term) || 0) + weight);
    }
    return tf;
  });
  const df = new Map();
  tfs.forEach((tf, i) => {
    if (items[i].type === 'occasion') return;
    for (const term of tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  });
  const n = items.filter((item) => item.type !== 'occasion').length;
  return tfs.map((tf) => {
    const vector = new Map();
    let norm = 0;
    for (const [term, count] of tf) {
      const weight = Math.log(1 + count) * (Math.log((n + 1) / ((df.get(term) || 0) + 1)) + 1);
      vector.set(term, weight);
      norm += weight * weight;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [term, weight] of vector) vector.set(term, weight / norm);
    return vector;
  });
}

function cosine(a, b) {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let sum = 0;
  for (const [term, weight] of small) {
    const other = large.get(term);
    if (other) sum += weight * other;
  }
  return sum;
}

/**
 * Related lists for every item. `items`: [{type: 'blog'|'action', id,
 * elements: string[], ...text fields}]. Returns Map(`${type}_${id}` ->
 * {blogs, actions}), each best first, at most PER_TYPE, score >= MIN_SCORE.
 */
/** Terms two vectors have in common (words and thesaurus concepts). */
function sharedTerms(a, b) {
  let n = 0;
  for (const term of a.keys()) if (b.has(term)) n++;
  return n;
}

function computeRelated(items) {
  const vectors = vectorize(items);
  const result = new Map();
  items.forEach((item, i) => {
    const scored = [];
    items.forEach((other, j) => {
      if (i === j || other.type === 'occasion') return; // occasions are never suggested
      let score = cosine(vectors[i], vectors[j]);
      if (score <= 0) return;
      if (item.type === 'occasion' && sharedTerms(vectors[i], vectors[j]) < OCCASION_MIN_SHARED) return;
      if ((item.elements || []).some((e) => (other.elements || []).includes(e))) score += ELEMENT_BONUS;
      if (score >= (item.type === 'occasion' ? OCCASION_MIN_SCORE : MIN_SCORE)) scored.push({ type: other.type, id: other.id, score: Math.round(score * 1000) / 1000 });
    });
    scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    const pick = (type) => scored.filter((s) => s.type === type).slice(0, PER_TYPE).map(({ id, score }) => ({ id, score }));
    result.set(`${item.type}_${item.id}`, { blogs: pick('blog'), actions: pick('action') });
  });
  return result;
}

/** Blogs and active actions as matcher items. */
function corpusFrom(blogDocs, actionDocs, occasionDocs = []) {
  const blogs = blogDocs.map((doc) => {
    const d = doc.data() || {};
    return {
      type: 'blog', id: doc.id, title: d.title, subCategory: d.subCategory, shortDescription: d.shortDescription, content: d.content,
      elements: d.category ? [String(d.category).toLowerCase()] : []
    };
  });
  const actions = actionDocs
    .filter((doc) => (doc.data() || {}).isActive === true)
    .map((doc) => {
      const d = doc.data() || {};
      return {
        type: 'action', id: doc.id, title: d.title, tags: d.tags, categories: d.categories,
        shortDescription: d.shortDescription, description: d.description, instructions: d.instructions,
        elements: Array.isArray(d.elementIds) ? d.elementIds : []
      };
    });
  // Calendar occasions: matched to stories and actions for "Today on WIOF", never suggested themselves.
  const occasions = occasionDocs.map((doc) => {
    const d = doc.data() || {};
    return { type: 'occasion', id: doc.id, title: d.occasion, description: d.description, elements: [] };
  });
  return [...blogs, ...actions, ...occasions];
}

/**
 * Rebuilds related_auto for the whole corpus. Writes only docs whose lists
 * changed, and deletes docs for items that no longer exist (or were
 * deactivated). Dry run unless `apply`. Returns a report.
 */
async function rebuildRelatedContent(db, { apply = true, FieldValue } = {}) {
  const [blogSnap, actionSnap, occasionSnap, autoSnap] = await Promise.all([
    db.collection('Blogs').get(),
    db.collection('actions').get(),
    db.collection('Envcal').get(),
    db.collection(RELATED_AUTO).get()
  ]);
  const related = computeRelated(corpusFrom(blogSnap.docs, actionSnap.docs, occasionSnap.docs));
  const existing = new Map(autoSnap.docs.map((doc) => [doc.id, doc.data() || {}]));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const writes = [];
  for (const [docId, lists] of related) {
    const old = existing.get(docId);
    if (!old || old.version !== RELATED_VERSION || !same(old.blogs, lists.blogs) || !same(old.actions, lists.actions)) {
      writes.push({ docId, data: { ...lists, version: RELATED_VERSION } });
    }
  }
  const deletes = [...existing.keys()].filter((docId) => !related.has(docId));
  if (apply) {
    let batch = db.batch();
    let count = 0;
    const flush = async () => { if (count) { await batch.commit(); batch = db.batch(); count = 0; } };
    for (const { docId, data } of writes) {
      batch.set(db.collection(RELATED_AUTO).doc(docId), { ...data, computedAt: FieldValue ? FieldValue.serverTimestamp() : new Date() });
      if (++count === 400) await flush();
    }
    for (const docId of deletes) {
      batch.delete(db.collection(RELATED_AUTO).doc(docId));
      if (++count === 400) await flush();
    }
    await flush();
  }
  return { items: related.size, written: writes.length, deleted: deletes.length, related };
}

module.exports = { RELATED_AUTO, RELATED_VERSION, MIN_SCORE, OCCASION_MIN_SCORE, computeRelated, corpusFrom, rebuildRelatedContent, terms, stem };
