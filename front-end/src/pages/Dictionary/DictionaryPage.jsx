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
			const res = await searchWords(keyword.trim(), 20);

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
				// Fetch related words
				const relatedRes = await searchWords(keyword.trim(), 6);
				if (relatedRes && relatedRes.errCode === 0) {
					const related = (relatedRes.words || []).filter(
						(item) => item.id !== mainWord.id
					);
					setRelatedWords(related.slice(0, 5));
				}
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
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const runDropdownSearch = async (query) => {
		setLoadingDropdown(true);
		setErrorDropdown("");
		const res = await searchWords(query, 8);
		if (res && res.errCode === 0) {
			setDropdownResults(res.words || []);
		} else {
			setDropdownResults([]);
			setErrorDropdown((res && res.errMessage) || "Search failed");
		}
		setLoadingDropdown(false);
	};

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				history.push(`/dictionary?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
			}
		}
	};

	const handleSelectWord = (word) => {
		const selectedQuery = pickBestQueryToken(word, searchInput || keyword);
		history.push(`/dictionary?q=${encodeURIComponent(selectedQuery)}`);
		setIsDropdownOpen(true);
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
				{dropdownResults.map((word) => (
					<button
						type="button"
						key={word.id}
						className="dropdown-item"
						onClick={() => handleSelectWord(word)}
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
							onChange={(e) => setSearchInput(e.target.value)}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button>Tìm kiếm</button>
							<button type="button" onClick={() => setIsKanjiDrawOpen(true)}>A文</button>
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
						{wordDetail && (
							<div className="detail-card">
								<div className="detail-head">
									<div>
										<h1>{wordDetail.word}</h1>
										<div className="detail-reading">
											{wordDetail.reading || "-"}
										</div>
									</div>
									<div className="detail-actions">
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
											+
										</button>
									</div>
								</div>
								<div className="detail-meta">
									<span>Cấp độ: {wordDetail.jlptLevel ? `N${wordDetail.jlptLevel}` : "-"}</span>
								</div>

								{wordDetail.meanings && wordDetail.meanings.length > 0 && (
									<div className="detail-section">
										<h3>Danh từ</h3>
										<ul>
											{wordDetail.meanings.map((meaning) => (
												<li key={meaning.id}>
													{meaning.partOfSpeech ? `${meaning.partOfSpeech}: ` : ""}
													{meaning.definition}
												</li>
											))}
										</ul>
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
						<div className="lookup-panel">
							<h3>Các từ liên quan tới {keyword}</h3>
							<div className="related-list">
								{relatedWords.map((item) => (
									<button
										key={item.id}
										onClick={() => history.push(`/dictionary?q=${item.word}`)}
									>
										<strong>{item.word}</strong>
										<span>{item.reading}</span>
										{item.meanings && item.meanings.length > 0 && (
											<p>{item.meanings[0].definition}</p>
										)}
									</button>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default DictionaryPage;
