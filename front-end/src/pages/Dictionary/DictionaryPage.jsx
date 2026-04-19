import React, { useContext, useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { searchSentences, searchWords } from "../../services/dictionaryService";
import { addWordSearchHistory } from "../../services/searchHistoryService";
import { UserContext } from "../../Context/UserProvider";
import {
	addWordContribution,
	getWordContributions,
} from "../../services/wordContributionService";
import WordImages from "../../components/WordImages/WordImages";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import SpeakButton from "../../components/SpeakButton/SpeakButton";
import { normalizeSearchKeyword } from "../../utils/searchKeywordNormalizer";
import "./DictionaryPage.css"; // Using the new CSS file

const splitVariants = (raw) =>
	String(raw || "")
		.split(/[;；,，、|/]+/)
		.map((item) => item.trim())
		.filter(Boolean);

const normalize = (raw) => String(raw || "").trim().toLowerCase();

const pickBestQueryToken = (entry, typedValue) => {
	const typed = normalize(typedValue);
	const variants = [
		...splitVariants(entry?.word),
		...splitVariants(entry?.reading),
		...splitVariants(entry?.romaji),
	];

	const exact = variants.find((token) => normalize(token) === typed);
	if (exact) {
		return exact;
	}

	const partial = variants.find((token) => normalize(token).includes(typed));
	if (partial) {
		return partial;
	}

	return splitVariants(entry?.word)[0] || entry?.word || "";
};

const getReadingItems = (value) => {
	if (!value) {
		return [];
	}
	return value
		.split(/[;；,、]/)
		.map((item) => item.trim())
		.filter(Boolean);
};

const getMeaningTexts = (entry) => {
	if (!Array.isArray(entry?.meanings)) {
		return [];
	}
	return entry.meanings
		.map((item) => String(item?.definition || "").trim())
		.filter(Boolean);
};

const getRomajiItems = (value) => {
	if (!value) {
		return [];
	}
	return String(value)
		.split(/[;；,，、|/]+/)
		.map((item) => item.trim())
		.filter(Boolean);
};

const tokenizeMeaning = (value) =>
	String(value || "")
		.toLowerCase()
		.split(/[\s,.;:!?()\[\]{}\-_/\\]+/)
		.map((token) => token.trim())
		.filter((token) => token.length >= 2);

const buildBigrams = (value) => {
	const text = String(value || "").trim().toLowerCase();
	if (!text) {
		return new Set();
	}
	if (text.length === 1) {
		return new Set([text]);
	}
	const grams = new Set();
	for (let i = 0; i < text.length - 1; i += 1) {
		grams.add(text.slice(i, i + 2));
	}
	return grams;
};

const jaccardScore = (setA, setB) => {
	if (!setA.size || !setB.size) {
		return 0;
	}
	let intersection = 0;
	setA.forEach((item) => {
		if (setB.has(item)) {
			intersection += 1;
		}
	});
	const union = setA.size + setB.size - intersection;
	return union ? intersection / union : 0;
};

const readingSimilarity = (mainReadings, candidateReadings) => {
	if (!mainReadings.length || !candidateReadings.length) {
		return 0;
	}
	let best = 0;
	mainReadings.forEach((mainToken) => {
		const mainSet = buildBigrams(mainToken);
		candidateReadings.forEach((candidateToken) => {
			const candidateSet = buildBigrams(candidateToken);
			const score = jaccardScore(mainSet, candidateSet);
			if (score > best) {
				best = score;
			}
		});
	});
	return best;
};

const romajiSimilarity = (mainRomaji, candidateRomaji) => {
	if (!mainRomaji.length || !candidateRomaji.length) {
		return 0;
	}
	let best = 0;
	mainRomaji.forEach((mainToken) => {
		const mainSet = buildBigrams(mainToken);
		candidateRomaji.forEach((candidateToken) => {
			const candidateSet = buildBigrams(candidateToken);
			const score = jaccardScore(mainSet, candidateSet);
			if (score > best) {
				best = score;
			}
		});
	});
	return best;
};

const meaningSimilarity = (mainMeanings, candidateMeanings) => {
	if (!mainMeanings.length || !candidateMeanings.length) {
		return 0;
	}
	let best = 0;
	mainMeanings.forEach((mainText) => {
		const mainSet = new Set(tokenizeMeaning(mainText));
		candidateMeanings.forEach((candidateText) => {
			const candidateSet = new Set(tokenizeMeaning(candidateText));
			const score = jaccardScore(mainSet, candidateSet);
			if (score > best) {
				best = score;
			}
		});
	});
	return best;
};

const pickRelatedWords = (mainWord, pool) => {
	if (!mainWord || !Array.isArray(pool) || !pool.length) {
		return [];
	}

	const mainReadings = getReadingItems(mainWord.reading);
	const mainMeanings = getMeaningTexts(mainWord);
	const mainRomaji = getRomajiItems(mainWord.romaji);
	const mainWordToken = normalize(mainWord.word);
	const mainReadingToken = normalize(mainReadings[0] || mainWord.reading || "");
	const simpleMeaningTokens = tokenizeMeaning(mainMeanings.join(" ")).slice(0, 6);

	const scored = pool
		.filter((item) => item?.id && item.id !== mainWord.id)
		.map((item) => {
			const candidateReadings = getReadingItems(item.reading);
			const candidateMeanings = getMeaningTexts(item);
			const candidateRomaji = getRomajiItems(item.romaji);
			const readingScore = readingSimilarity(mainReadings, candidateReadings);
			const romajiScore = romajiSimilarity(mainRomaji, candidateRomaji);
			const meaningScore = meaningSimilarity(mainMeanings, candidateMeanings);
			const score = readingScore * 0.45 + romajiScore * 0.2 + meaningScore * 0.35;
			return { item, score, readingScore, romajiScore, meaningScore };
		})
		.sort((a, b) => b.score - a.score);

	const strongMatch = scored.filter(
		(entry) => entry.readingScore >= 0.42 || entry.romajiScore >= 0.42 || entry.meaningScore >= 0.28
	);

	const pickedEntries = [];
	const pickedIds = new Set();

	const pushEntry = (entry) => {
		if (!entry?.item?.id || pickedIds.has(entry.item.id)) {
			return;
		}
		pickedEntries.push(entry);
		pickedIds.add(entry.item.id);
	};

	strongMatch.forEach(pushEntry);

	if (pickedEntries.length < 5) {
		const simpleFallback = scored.filter((entry) => {
			const item = entry.item;
			const itemWord = normalize(item.word);
			const itemReading = normalize(item.reading);
			const itemRomaji = normalize(item.romaji);
			const itemMeanings = getMeaningTexts(item).map((text) => normalize(text));

			const byReading =
				mainReadingToken.length >= 2 && itemReading.includes(mainReadingToken.slice(0, 2));
			const byRomaji =
				mainRomaji[0] && itemRomaji.includes(normalize(mainRomaji[0]).slice(0, 2));
			const byWord =
				mainWordToken.length >= 1 &&
				(itemWord.includes(mainWordToken.slice(0, 1)) || mainWordToken.includes(itemWord));
			const byMeaning = simpleMeaningTokens.some((token) =>
				itemMeanings.some((meaning) => meaning.includes(token))
			);

			return byReading || byRomaji || byWord || byMeaning;
		});

		simpleFallback.forEach(pushEntry);
	}

	if (pickedEntries.length < 5) {
		scored.forEach(pushEntry);
	}

	const picked = pickedEntries.slice(0, 5).map((entry) => entry.item);

	return picked;
};

const DictionaryPage = () => {
	const { search } = useLocation();
	const history = useHistory();
	const { user } = useContext(UserContext);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [wordDetail, setWordDetail] = useState(null);
	const [relatedWords, setRelatedWords] = useState([]);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [dropdownResults, setDropdownResults] = useState([]);
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [contributions, setContributions] = useState([]);
	const [newContribution, setNewContribution] = useState("");
	const [submittingContribution, setSubmittingContribution] = useState(false);
	const [contributionError, setContributionError] = useState("");
	const [fallbackExamples, setFallbackExamples] = useState([]);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);
	const searchWrapRef = useRef(null);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		setContributionError("");
	}, [wordDetail?.id]);

	useEffect(() => {
		if (!wordDetail?.word) {
			setContributions([]);
			setContributionError("");
			setFallbackExamples([]);
			return;
		}
		getWordContributions({ word: wordDetail.word, wordId: wordDetail.id }).then((items) => {
			setContributions(Array.isArray(items) ? items : []);
		});
	}, [wordDetail]);

	useEffect(() => {
		const runFallbackExamples = async () => {
			if (!wordDetail?.word) {
				setFallbackExamples([]);
				return;
			}

			if (Array.isArray(wordDetail.examples) && wordDetail.examples.length >= 5) {
				setFallbackExamples([]);
				return;
			}

			const query = (wordDetail.word || keyword || "").trim();
			if (!query) {
				setFallbackExamples([]);
				return;
			}

			const res = await searchSentences(query, 20);
			if (res && res.errCode === 0) {
				const seen = new Set();
				const sentences = (res.sentences || [])
					.filter((item) => {
						const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
						if (seen.has(key)) return false;
						seen.add(key);
						return true;
					})
					.slice(0, 5);
				setFallbackExamples(sentences);
			} else {
				setFallbackExamples([]);
			}
		};

		runFallbackExamples();
	}, [keyword, wordDetail]);

	const displayedExamples = useMemo(() => {
		const source =
			Array.isArray(wordDetail?.examples) && wordDetail.examples.length > 0
				? wordDetail.examples
				: fallbackExamples;

		const seen = new Set();
		return (source || [])
			.filter((item) => {
				const key = `${item?.japaneseSentence || ""}__${item?.vietnameseTranslation || ""}`;
				if (seen.has(key)) {
					return false;
				}
				seen.add(key);
				return true;
			})
			.slice(0, 5);
	}, [wordDetail?.examples, fallbackExamples]);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setWordDetail(null);
				setRelatedWords([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
				const normalizedKeyword = keyword.trim().toLowerCase();
				const convertedKeyword = normalizeSearchKeyword(keyword.trim());
				const res = await searchWords(convertedKeyword, 20);

			if (res && res.errCode === 0 && res.words && res.words.length > 0) {
				const exactMatches = res.words.filter((item) => {
					const candidates = [
						...splitVariants(item.word),
						...splitVariants(item.reading),
						...splitVariants(item.romaji),
					];
					return candidates.some((token) => normalize(token) === normalizedKeyword);
				});

				const pickByExampleCount = (items) =>
					[...items].sort((a, b) => {
						const aCount = Array.isArray(a.examples) ? a.examples.length : 0;
						const bCount = Array.isArray(b.examples) ? b.examples.length : 0;
						return bCount - aCount;
					})[0];

				const mainWord =
					pickByExampleCount(exactMatches) || pickByExampleCount(res.words) || res.words[0];
				setWordDetail(mainWord);
				if (isLoggedIn) {
					addWordSearchHistory({
						word: mainWord.word,
						meaning: mainWord.meanings?.[0]?.definition || "",
					});
				}

				const candidateMap = new Map();
				(res.words || []).forEach((item) => {
					if (item?.id) {
						candidateMap.set(item.id, item);
					}
				});

				const firstReading = getReadingItems(mainWord.reading)[0];
				if (firstReading) {
					const byReadingRes = await searchWords(firstReading, 30);
					if (byReadingRes?.errCode === 0) {
						(byReadingRes.words || []).forEach((item) => {
							if (item?.id) {
								candidateMap.set(item.id, item);
							}
						});
					}
				}

				const related = pickRelatedWords(mainWord, Array.from(candidateMap.values()));
				setRelatedWords(related);
			} else {
				setWordDetail(null);
				setRelatedWords([]);
				setError((res && res.errMessage) || "Word not found");
			}

			setLoading(false);
		};

		runSearch();
	}, [isLoggedIn, keyword]);

	useEffect(() => {
		if (!searchInput.trim() || searchInput === keyword) {
			setDropdownResults([]);
			setHighlightedDropdownIndex(-1);
			setErrorDropdown("");
			return;
		}

		const debounce = setTimeout(() => {
			runDropdownSearch(searchInput.trim());
		}, 220);

		return () => clearTimeout(debounce);
	}, [searchInput, keyword]);

	useEffect(() => {
		const handleOutsideClick = (event) => {
			if (!searchWrapRef.current?.contains(event.target)) {
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const runDropdownSearch = async (query) => {
		const convertedQuery = normalizeSearchKeyword(query);
		setLoadingDropdown(true);
		setErrorDropdown("");
		const res = await searchWords(convertedQuery, 8);
		if (res && res.errCode === 0) {
			setDropdownResults(res.words || []);
			setHighlightedDropdownIndex(-1);
		} else {
			setDropdownResults([]);
			setHighlightedDropdownIndex(-1);
			setErrorDropdown((res && res.errMessage) || "Search failed");
		}
		setLoadingDropdown(false);
	};

	const handleSearch = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!dropdownResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) {
					return 0;
				}
				return (prev + 1) % dropdownResults.length;
			});
			return;
		}

		if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!dropdownResults.length) {
				return;
			}
			setIsDropdownOpen(true);
			setHighlightedDropdownIndex((prev) => {
				if (prev < 0) {
					return dropdownResults.length - 1;
				}
				return (prev - 1 + dropdownResults.length) % dropdownResults.length;
			});
			return;
		}

		if (e.key === "Escape") {
			setIsDropdownOpen(false);
			setHighlightedDropdownIndex(-1);
			return;
		}

		if (e.key === "Enter") {
			e.preventDefault();
			if (
				isDropdownOpen &&
				highlightedDropdownIndex >= 0 &&
				highlightedDropdownIndex < dropdownResults.length
			) {
				handleSelectWord(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				const convertedKeyword = normalizeSearchKeyword(newKeyword.trim());
				setSearchInput(convertedKeyword);
				history.push(`/dictionary?q=${encodeURIComponent(convertedKeyword)}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const handleSearchInputChange = (event) => {
		const nextValue = event.target.value;
		setSearchInput(nextValue);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectWord = (word) => {
		const selectedQuery = pickBestQueryToken(word, searchInput || keyword);
		const convertedQuery = normalizeSearchKeyword(selectedQuery);
		setSearchInput(convertedQuery);
		history.push(`/dictionary?q=${encodeURIComponent(convertedQuery)}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const handleAddContribution = async () => {
		if (!wordDetail?.word || !newContribution.trim()) {
			return;
		}

		if (!isLoggedIn) {
			history.push("/login");
			return;
		}

		setSubmittingContribution(true);
		setContributionError("");

		const created = await addWordContribution({
			word: wordDetail.word,
			wordId: wordDetail.id,
			content: newContribution,
		});

		if (created) {
			setContributions((prev) => [created, ...prev].slice(0, 100));
			setNewContribution("");
		} else {
			setContributionError("Không gửi được bình luận. Vui lòng thử lại.");
		}

		setSubmittingContribution(false);
	};

	const renderDropdownBody = () => {
		if (loadingDropdown) {
			return <div className="dropdown-status">Đang tra cứu...</div>;
		}

		if (errorDropdown) {
			return <div className="dropdown-status error">{errorDropdown}</div>;
		}

		if (!dropdownResults.length) {
			return <div className="dropdown-status">Không có dữ liệu phù hợp.</div>;
		}

		return (
			<div className="dropdown-list">
				{dropdownResults.map((word, index) => (
					<button
						type="button"
						key={word.id}
						className={`dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectWord(word)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{word.word}</strong>
							<span>{word.reading || "-"}</span>
						</div>
						<p>{word.meanings?.[0]?.definition || "Chưa có nghĩa"}</p>
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="mazii-home">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Từ vựng</div>
						<input
							type="text"
							placeholder="Tra từ điển Nhật - Việt"
							value={searchInput}
							onChange={handleSearchInputChange}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button type="button" onClick={() => setIsDropdownOpen(true)}>
								🔍
							</button>
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>
								A文
							</button>
						</div>

						<button className="lang-switch">Nhật - Việt</button>
					</div>
					<div className="mazii-mode-tabs">
						<button className="tab-active">Từ vựng</button>
						<button onClick={() => history.push(`/kanji?q=${keyword}`)}>
							Hán tự
						</button>
						<button onClick={() => history.push(`/sentence?q=${keyword}`)}>
							Mẫu câu
						</button>
						<button onClick={() => history.push(`/grammar?q=${keyword}`)}>
							Ngữ pháp
						</button>
						{/* <button>Nhật - Nhật</button> */}
					</div>
					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</div>

				<div className="dictionary-hero">
					<div>
						<p className="dictionary-hero-kicker">Tra cứu Nhật - Việt</p>
						<h2>
							Tìm nghĩa, ví dụ, kanji và lưu từ ngay trên cùng một màn hình.
						</h2>
						<p className="dictionary-hero-copy">
							Giao diện này ưu tiên tốc độ tra cứu, đọc nhanh, rồi chuyển thẳng sang lưu từ hoặc xem nội dung liên quan.
						</p>
					</div>
					<div className="dictionary-hero-stats">
						<div className="hero-stat-card">
							<span>Trạng thái</span>
							<strong>{isLoggedIn ? "Đã đăng nhập" : "Chế độ khách"}</strong>
						</div>
						<div className="hero-stat-card">
							<span>Từ liên quan</span>
							<strong>{relatedWords.length}</strong>
						</div>
					</div>
				</div>

				<KanjiDrawModal
					open={isKanjiDrawOpen}
					onClose={() => setIsKanjiDrawOpen(false)}
					anchorRef={searchWrapRef}
					onPick={(value) => {
						setSearchInput((prev) => `${prev || ""}${value}`);
						setIsDropdownOpen(true);
					}}
				/>
				<NotebookPickerModal
					open={isNotebookPickerOpen}
					onClose={() => {
						setIsNotebookPickerOpen(false);
						setNotebookPickerItem(null);
					}}
					item={notebookPickerItem}
				/>

				<div className="mazii-content-grid detail-mode">
					<div className="detail-left">
						{loading && <div className="detail-card">Đang tải...</div>}
						{error && <div className="detail-card error">{error}</div>}
						{!loading && !error && !wordDetail && (
							<div className="detail-card empty-state-card">
								<div className="empty-state-visual">辞</div>
								<h3>Nhập một từ để bắt đầu tra cứu</h3>
								<p>
									Bạn có thể tìm theo chữ Nhật, kana, romaji hoặc gõ từ tiếng Việt nếu dữ liệu hỗ trợ.
								</p>
							</div>
						)}
						{wordDetail && (
							<div className="detail-card">
								<div className="detail-topline">
									<div className="detail-tag">Từ đang xem</div>
									<div className="detail-tag soft">{wordDetail.word?.length || 0} ký tự</div>
								</div>
								<div className="detail-head">
									<div>
										<h1>{wordDetail.word}</h1>
										<div className="detail-reading">
											{wordDetail.reading || "-"}
										</div>
									</div>
									<div className="detail-actions">
										<SpeakButton
											text={wordDetail.word || wordDetail.reading}
											title="Đọc từ"
										/>
										<button
											type="button"
											onClick={() => {
											setNotebookPickerItem({
												type: "word",
												id: wordDetail.id,
												label: wordDetail.word,
												subtitle: wordDetail.reading,
												meaning: wordDetail.meanings?.[0]?.definition || "",
											});
											setIsNotebookPickerOpen(true);
											}}
										>
												Lưu
										</button>
									</div>
								</div>
								<div className="detail-meta">
									<span>Cấp độ: {wordDetail.jlptLevel ? `N${wordDetail.jlptLevel}` : "-"}</span>
									<span>Kanji: {wordDetail.kanjis?.length || 0}</span>
									<span>Ví dụ: {displayedExamples.length}</span>
								</div>
								{Array.isArray(wordDetail.meanings) && wordDetail.meanings.length > 0 && (
									<div className="meaning-preview-row">
										{wordDetail.meanings.slice(0, 3).map((meaning) => (
											<div className="meaning-chip" key={meaning.id}>
												{/* <span>{meaning.partOfSpeech || "-"}</span> */}
												<strong>{meaning.definition}</strong>
											</div>
										))}
									</div>
								)}

								

								{displayedExamples.length > 0 && (
									<div className="detail-section">
										<h3>Ví dụ</h3>
										<ul>
											{displayedExamples.map((example) => (
												<li key={example.id}>
													<strong>{example.japaneseSentence}</strong>
													<p>{example.vietnameseTranslation}</p>
												</li>
											))}
										</ul>
									</div>
								)}

								<div className="detail-section">
									<h3>Hình ảnh từ vựng</h3>
									<WordImages word={wordDetail.word} />
								</div>

								<div className="detail-section">
									<h3>Có {contributions.length} ý kiến đóng góp</h3>
									<div className="contribution-list">
										{contributions.map((item) => (
											<div className="contribution-item" key={item.id}>
												<p>{item.content}</p>
												<div className="contribution-meta">
													<small>{item.author}</small>
													<small>{new Date(item.createdAt).toLocaleString("vi-VN")}</small>
												</div>
											</div>
										))}
										{contributions.length === 0 && (
											<p className="contribution-empty">Chưa có đóng góp nào cho từ này.</p>
										)}
									</div>
									<div className="contribution-form">
										<textarea
											value={newContribution}
											onChange={(e) => setNewContribution(e.target.value)}
											placeholder="Thêm nghĩa hoặc ví dụ. Ấn SHIFT + ENTER để xuống dòng"
										/>
										{contributionError && (
											<p className="contribution-empty">{contributionError}</p>
										)}
										<button
											type="button"
											onClick={handleAddContribution}
											disabled={submittingContribution}
										>
											{submittingContribution ? "Đang gửi..." : "Gửi"}
										</button>
									</div>
								</div>

							</div>
						)}
					</div>
					<div className="detail-right">
						<div className="lookup-panel quick-summary-panel">
							<h3>Tổng quan</h3>
							<div className="summary-grid">
								<div>
									<span>Trạng thái</span>
									<strong>{isLoggedIn ? "Đã đăng nhập" : "Chưa đăng nhập"}</strong>
								</div>
								<div>
									<span>Đóng góp</span>
									<strong>{contributions.length}</strong>
								</div>
								<div>
									<span>Gợi ý liên quan</span>
									<strong>{relatedWords.length}</strong>
								</div>
							</div>
						</div>

						{wordDetail?.kanjis && wordDetail.kanjis.length > 0 && (
							<div className="lookup-panel">
								<h3>Các chữ kanji của {wordDetail.word}</h3>
								<div className="kanji-list">
									{wordDetail.kanjis.map((kanji) => (
										<button
											key={kanji.id}
											type="button"
											className="kanji-info-card"
											onClick={() => history.push(`/kanji?q=${kanji.characterKanji}`)}
										>
											<div className="kanji-card-head">
												<strong className="kanji-char">{kanji.characterKanji}</strong>
												<span className="kanji-head-reading">
													[{getReadingItems(kanji.onyomi)[0] || "-"}]
												</span>
											</div>
											<p className="kanji-meaning">{(kanji.meaning || "-").toUpperCase()}</p>
											<div className="kanji-reading-lines">
												<p>
													<span>Hán tự:</span> {kanji.characterKanji} - {(kanji.meaning || "-").toUpperCase()}
												</p>
												<p>
													<span>訓:</span> {getReadingItems(kanji.kunyomi).join(" ") || "-"}
												</p>
												<p>
													<span>音:</span> {getReadingItems(kanji.onyomi).join(" ") || "-"}
												</p>
											</div>
											{kanji.jlptLevel && (
												<small className="kanji-jlpt">JLPT N{kanji.jlptLevel}</small>
											)}
										</button>
									))}
								</div>
							</div>
						)}

						{relatedWords.length > 0 && (
							<div className="lookup-panel">
								<h3>Từ liên quan</h3>
								<div className="related-list">
									{relatedWords.map((item) => (
										<button
											type="button"
											key={item.id}
											onClick={() => history.push(`/dictionary?q=${encodeURIComponent(item.word || item.reading || "")}`)}
										>
											<strong>{item.word}</strong>
											<span>{item.reading || "-"}</span>
											<p>{item.meanings?.[0]?.definition || "Chưa có nghĩa"}</p>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default DictionaryPage;
