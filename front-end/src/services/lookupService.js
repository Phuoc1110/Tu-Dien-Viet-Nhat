import axios from "../setup/axios";

const normalize = (value) => String(value || "").trim().toLowerCase();

const pickBestWord = (words, query) => {
  const cleanedQuery = normalize(query);
  if (!Array.isArray(words) || !words.length) {
    return null;
  }

  const exact = words.find((item) => {
    const candidates = [item?.word, item?.reading, item?.romaji].map(normalize);
    return candidates.includes(cleanedQuery);
  });

  return exact || words[0] || null;
};

const formatExamples = (sentences) => {
  if (!Array.isArray(sentences)) {
    return [];
  }

  return sentences
    .map((item) => ({
      japaneseSentence: String(item?.japaneseSentence || item?.sentence || "").trim(),
      readingSentence: String(item?.readingSentence || item?.reading || "").trim(),
      vietnameseTranslation: String(item?.vietnameseTranslation || item?.translation || item?.meaning || "").trim(),
    }))
    .filter((item) => item.japaneseSentence || item.readingSentence || item.vietnameseTranslation)
    .slice(0, 5);
};

const formatKanji = (kanji) => {
  if (!kanji) {
    return null;
  }

  const relatedWords = Array.isArray(kanji.words)
    ? kanji.words
        .map((word) => ({
          word: String(word?.word || "").trim(),
          reading: String(word?.reading || word?.romaji || "").trim(),
          meaning: String(word?.meanings?.[0]?.definition || word?.meanings?.[0]?.meaning || "").trim(),
        }))
        .filter((item) => item.word || item.reading || item.meaning)
        .slice(0, 5)
    : [];

  return {
    characterKanji: String(kanji?.characterKanji || kanji?.kanji || "").trim(),
    meaning: String(kanji?.meaning || "").trim(),
    kunyomi: String(kanji?.kunyomi || "").trim(),
    onyomi: String(kanji?.onyomi || "").trim(),
    strokeCount: Number(kanji?.strokeCount) || null,
    jlptLevel: Number(kanji?.jlptLevel) || null,
    relatedWords,
  };
};

const chooseBestKanji = (kanjis, query) => {
  if (!Array.isArray(kanjis) || !kanjis.length) {
    return null;
  }

  const cleanedQuery = normalize(query);
  return (
    kanjis.find((item) => normalize(item?.characterKanji) === cleanedQuery) ||
    kanjis.find((item) => normalize(item?.meaning).includes(cleanedQuery)) ||
    kanjis[0] ||
    null
  );
};

const isKanjiOnly = (value) => {
  const text = String(value || "").trim();
  return !!text && /^[\u4E00-\u9FFF]+$/.test(text);
};

const isGrammarLike = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  return /[〜~]|\s/.test(text) || /(ば|ので|ため|よう|ながら|ても|たら|なら|から|けど|けれど|んです|です|ます)$/.test(text);
};

const lookup = async (text) => {
  const query = String(text || "").trim();
  if (!query) {
    return { error: "Thiếu từ cần tra cứu" };
  }

  try {
    const [wordRes, kanjiRes, grammarRes, sentenceRes] = await Promise.all([
      axios.get(`/api/dictionary/search?q=${encodeURIComponent(query)}&limit=10`),
      axios.get(`/api/dictionary/kanji/search?q=${encodeURIComponent(query)}&limit=10`),
      axios.get(`/api/dictionary/grammar/search?q=${encodeURIComponent(query)}&limit=5`),
      axios.get(`/api/dictionary/sentence/search?q=${encodeURIComponent(query)}&limit=5`),
    ]);

    if (wordRes?.errCode !== 0 && grammarRes?.errCode !== 0 && sentenceRes?.errCode !== 0) {
      return { error: "Không tìm thấy dữ liệu phù hợp" };
    }

    const word = pickBestWord(wordRes?.words || [], query);
    const grammar = Array.isArray(grammarRes?.grammars) ? grammarRes.grammars[0] || null : null;
    const kanji = formatKanji(chooseBestKanji(kanjiRes?.kanjis || [], query));
    const examples = formatExamples(sentenceRes?.sentences || []);

    return {
      text: query,
      kanji: word?.word || query,
      reading: word?.reading || word?.romaji || "",
      meaning:
        word?.meanings?.[0]?.definition ||
        word?.meanings?.[0]?.meaning ||
        word?.meaning ||
        "",
      grammar: grammar
        ? {
            title: grammar.title || grammar.word || query,
            meaning: grammar.meaning || grammar.description || "",
            formation: grammar.formation || "",
            usageNote: grammar.usageNote || "",
            jlptLevel: grammar.jlptLevel || null,
          }
        : null,
      kanjiInfo: kanji,
      bestTab: isKanjiOnly(query) && kanji ? "kanji" : grammar && isGrammarLike(query) ? "grammar" : "vocabulary",
      examples,
    };
  } catch (error) {
    return { error: "Network error" };
  }
};

export default { lookup };
