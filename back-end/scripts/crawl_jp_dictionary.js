import axios from "axios";
import { load } from "cheerio";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, "output");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "jp_dictionary_crawl.json");

const DEFAULT_KEYWORDS = ["japanese", "study", "school"];
const REQUEST_DELAY_MS = Number(process.env.REQUEST_DELAY_MS || 1000);
const MAX_RESULTS_PER_SOURCE = Number(process.env.MAX_RESULTS_PER_SOURCE || 5);

const SOURCES = [
	{
		name: "jisho",
		buildUrl: (keyword) => `https://jisho.org/search/${encodeURIComponent(keyword)}`,
		parse: (html, keyword, url) => {
			const $ = load(html);
			const results = [];

			$(".concept_light").each((index, element) => {
				if (results.length >= MAX_RESULTS_PER_SOURCE) {
					return false;
				}

				const term = cleanText(
					$(element).find(".concept_light-representation .text").first().text()
				);
				const reading = cleanText(
					$(element).find(".concept_light-representation .furigana").text()
				).replace(/\s+/g, "");
				const meanings = $(element)
					.find(".meanings-wrapper .meaning-meaning")
					.map((_, meaningEl) => cleanText($(meaningEl).text()))
					.get()
					.filter(Boolean);

				if (!term && meanings.length === 0) {
					return;
				}

				results.push({
					source: "jisho",
					keyword,
					url,
					term,
					reading,
					meanings,
				});
			});

			return results;
		},
	},
	{
		name: "weblio",
		buildUrl: (keyword) => `https://www.weblio.jp/content/${encodeURIComponent(keyword)}`,
		parse: (html, keyword, url) => {
			const $ = load(html);
			const title = cleanText($("meta[property='og:title']").attr("content"));
			const description = cleanText(
				$("meta[property='og:description']").attr("content")
			);

			if (!title && !description) {
				return [];
			}

			return [
				{
					source: "weblio",
					keyword,
					url,
					term: title,
					reading: "",
					meanings: description ? [description] : [],
				},
			];
		},
	},
];

function cleanText(value) {
	if (!value) {
		return "";
	}

	return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

async function delay(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
	const response = await axios.get(url, {
		headers: {
			"User-Agent":
				"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
			Accept: "text/html,application/xhtml+xml",
			"Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
		},
		timeout: 20000,
	});

	return response.data;
}

function dedupe(items) {
	const seen = new Set();
	const output = [];

	for (const item of items) {
		const key = [
			item.source,
			item.term || "",
			item.reading || "",
			item.meanings?.join("|") || "",
		].join("|");

		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		output.push(item);
	}

	return output;
}

async function crawlKeyword(keyword) {
	const results = [];

	for (const source of SOURCES) {
		const url = source.buildUrl(keyword);

		try {
			const html = await fetchHtml(url);
			const parsed = source.parse(html, keyword, url);
			results.push(...parsed);
		} catch (error) {
			results.push({
				source: source.name,
				keyword,
				url,
				error: error?.message || "Fetch failed",
			});
		}

		if (REQUEST_DELAY_MS > 0) {
			await delay(REQUEST_DELAY_MS);
		}
	}

	return results;
}

async function run() {
	const keywords = process.argv.slice(2);
	const targetKeywords = keywords.length ? keywords : DEFAULT_KEYWORDS;
	const allResults = [];

	for (const keyword of targetKeywords) {
		const rows = await crawlKeyword(keyword);
		allResults.push(...rows);
	}

	const deduped = dedupe(allResults);
	await fs.mkdir(OUTPUT_DIR, { recursive: true });
	await fs.writeFile(
		OUTPUT_FILE,
		JSON.stringify(
			{
				generatedAt: new Date().toISOString(),
				count: deduped.length,
				items: deduped,
			},
			null,
			2
		),
		"utf8"
	);

	console.log(`Saved ${deduped.length} items to ${OUTPUT_FILE}`);
}

run().catch((error) => {
	console.error("Crawler failed:", error);
	process.exitCode = 1;
});
