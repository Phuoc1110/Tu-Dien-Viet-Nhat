import React, { useEffect, useMemo, useState, useRef, useContext } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { searchKanjis, searchSentences, recognizeImageText } from "../../services/dictionaryService";
import {
	getTopSearchKeywordsToday,
	getWordSearchHistoryPage,
} from "../../services/searchHistoryService";
import { getLatestWordContributions, getWordContributions, addWordContribution } from "../../services/wordContributionService";
import { createReport } from "../../services/userService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import { Search, PenTool, SearchX, AlertTriangle, Camera } from "lucide-react";
import { UserContext } from "../../Context/UserProvider";
import { toast } from "react-toastify";
import "./KanjiPage.css";

const KanjiPage = () => {
	const { search } = useLocation();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [kanjiDetail, setKanjiDetail] = useState(null);
	const [relatedKanjis, setRelatedKanjis] = useState([]);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [dropdownResults, setDropdownResults] = useState([]);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const searchWrapRef = useRef(null);
	const [activeKanji, setActiveKanji] = useState(null);
	const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
	const [replayKey, setReplayKey] = useState(0);
	const [isStrokePlaying, setIsStrokePlaying] = useState(false);
	const [fallbackExamples, setFallbackExamples] = useState([]);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isImageUploading, setIsImageUploading] = useState(false);
	const imageInputRef = useRef(null);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);
	const [recentHistory, setRecentHistory] = useState([]);
	const [topKeywords, setTopKeywords] = useState([]);
	const [latestContributions, setLatestContributions] = useState([]);
	const [contributions, setContributions] = useState([]);
	const [newContribution, setNewContribution] = useState("");
	const [submittingContribution, setSubmittingContribution] = useState(false);
	const [contributionError, setContributionError] = useState("");
	const [replyingTo, setReplyingTo] = useState(null);
	const [replyContent, setReplyContent] = useState("");
	const [expandedReplies, setExpandedReplies] = useState({});
	
	const { user } = useContext(UserContext);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	const normalizeStrokePaths = (value) => {
		if (!value) return [];

		if (Array.isArray(value)) {
			return value
				.map((item, index) => {
					if (typeof item === "string") {
						return { d: item, order: index + 1 };
					}
					if (item && typeof item === "object") {
						return {
							d: item.d || item.path || "",
							order: item.order || index + 1,
						};
					}
					return null;
				})
				.filter((item) => item && item.d);
		}

		if (typeof value === "string") {
			try {
				return normalizeStrokePaths(JSON.parse(value));
			} catch (e) {
				return [];
			}
		}

		if (typeof value === "object" && Array.isArray(value.paths)) {
			return normalizeStrokePaths(value.paths);
		}

		return [];
	};

	const strokePaths = useMemo(
		() => normalizeStrokePaths(kanjiDetail?.strokePaths),
		[kanjiDetail]
	);

	useEffect(() => {
		setCurrentStrokeIndex(strokePaths.length ? strokePaths.length - 1 : 0);
		setReplayKey((prev) => prev + 1);
		setIsStrokePlaying(false);
	}, [kanjiDetail?.id, strokePaths.length]);

	useEffect(() => {
		if (!isStrokePlaying || !strokePaths.length) {
			return undefined;
		}

		if (currentStrokeIndex >= strokePaths.length - 1) {
			setIsStrokePlaying(false);
			return undefined;
		}

		const timer = setTimeout(() => {
			setCurrentStrokeIndex((prev) => prev + 1);
		}, 900);

		return () => clearTimeout(timer);
	}, [isStrokePlaying, strokePaths.length, currentStrokeIndex]);

	const kanjiWords = useMemo(() => {
		if (!kanjiDetail?.words || !Array.isArray(kanjiDetail.words)) {
			return [];
		}

		return kanjiDetail.words.slice(0, 10);
	}, [kanjiDetail]);

	const kanjiExamples = useMemo(() => {
		if (!kanjiWords.length) {
			return [];
		}

		const seen = new Set();
		const examples = [];

		for (const word of kanjiWords) {
			for (const item of word.examples || []) {
				const key = `${item.japaneseSentence}__${item.vietnameseTranslation}`;
				if (!seen.has(key)) {
					seen.add(key);
					examples.push({ ...item, relatedWord: word.word });
				}
				if (examples.length >= 8) {
					return examples;
				}
			}
		}

		return examples;
	}, [kanjiWords]);

	const displayedKanjiExamples = useMemo(() => {
		if (kanjiExamples.length >= 5) {
			return kanjiExamples.slice(0, 5);
		}

		return kanjiExamples.concat(fallbackExamples).slice(0, 5);
	}, [kanjiExamples, fallbackExamples]);

	useEffect(() => {
		const runFallbackExamples = async () => {
			if (!kanjiDetail?.characterKanji) {
				setFallbackExamples([]);
				return;
			}

			if (kanjiExamples.length >= 5) {
				setFallbackExamples([]);
				return;
			}

			const query = kanjiDetail.characterKanji;
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
					.filter((item) => item.japaneseSentence?.includes(query) || item.vietnameseTranslation)
					.map((item) => ({
						...item,
						relatedWord: kanjiDetail.characterKanji,
					}));
				setFallbackExamples(sentences.slice(0, Math.max(0, 5 - kanjiExamples.length)));
			} else {
				setFallbackExamples([]);
			}
		};

		runFallbackExamples();
	}, [kanjiDetail?.characterKanji, kanjiExamples.length]);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);
	const hasKeyword = keyword.trim().length > 0;
	const getTermLabel = (item) => String(item?.word || item?.searchTerm || item?.keyword || "").trim();
	const getTermCount = (item) => Number(item?.count || item?.searchCount || 0) || 0;

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		let mounted = true;

		const loadSidebarData = async () => {
			const [historyRes, topRes, contributionRes] = await Promise.all([
				getWordSearchHistoryPage(8, 0),
				getTopSearchKeywordsToday(8),
				getLatestWordContributions(6, 0),
			]);

			if (!mounted) {
				return;
			}

			setRecentHistory(Array.isArray(historyRes?.items) ? historyRes.items : []);
			setTopKeywords(Array.isArray(topRes) ? topRes : []);
			setLatestContributions(Array.isArray(contributionRes) ? contributionRes : []);
		};

		loadSidebarData();

		return () => {
			mounted = false;
		};
	}, []);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setKanjiDetail(null);
				setRelatedKanjis([]);
				setActiveKanji(null);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchKanjis(keyword.trim());

			if (res && res.errCode === 0 && res.kanjis && res.kanjis.length > 0) {
				setRelatedKanjis(res.kanjis);
				setActiveKanji(res.kanjis[0]);
				setKanjiDetail(res.kanjis[0]);
				setCurrentStrokeIndex(0);
			} else {
				setKanjiDetail(null);
				setRelatedKanjis([]);
				setActiveKanji(null);
				setError((res && res.errMessage) || "Kanji not found");
			}

			setLoading(false);
		};

		runSearch();
	}, [keyword]);

	useEffect(() => {
		const fetchContributions = async () => {
			if (kanjiDetail?.id) {
				const res = await getWordContributions({
					wordId: kanjiDetail.id,
					targetType: "kanji",
				});
				setContributions(Array.isArray(res) ? res : []);
			} else {
				setContributions([]);
			}
		};
		fetchContributions();
	}, [kanjiDetail?.id]);

	useEffect(() => {
		if (!searchInput.trim()) {
			setDropdownResults([]);
			setErrorDropdown("");
			setHighlightedDropdownIndex(-1);
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

	useEffect(() => {
		if (isDropdownOpen && highlightedDropdownIndex >= 0) {
			const dropdownList = searchWrapRef.current?.querySelector('.dropdown-list');
			const activeItem = dropdownList?.querySelector('.active');
			if (activeItem) {
				activeItem.scrollIntoView({ block: "nearest" });
			}
		}
	}, [highlightedDropdownIndex, isDropdownOpen]);

	const runDropdownSearch = async (query) => {
		setLoadingDropdown(true);
		setErrorDropdown("");
		const res = await searchKanjis(query, 8);
		if (res && res.errCode === 0) {
			setDropdownResults(res.kanjis || []);
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
				if (prev < 0) return 0;
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
				if (prev < 0) return dropdownResults.length - 1;
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
				handleSelectKanji(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				if (newKeyword.trim().length > 25 || /[。、！？\n]/.test(newKeyword.trim())) {
					history.push(`/analysis?text=${encodeURIComponent(newKeyword.trim())}`);
					return;
				}
				history.push(`/kanji?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const openImagePicker = () => {
		if (isImageUploading) return;
		imageInputRef.current?.click();
	};

	const handleImagePick = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;

		const formData = new FormData();
		formData.append("image", file);

		setIsImageUploading(true);

		try {
			const response = await recognizeImageText(formData);
			if (response && response.errCode === 0) {
				const recognizedText = String(response.text || response.words?.join(" ") || "").trim();
				if (recognizedText) {
					setSearchInput(recognizedText);
					history.push(`/kanji?q=${encodeURIComponent(recognizedText)}`);
					return;
				}
			}
			alert("Không nhận được chữ nào từ ảnh này.");
		} catch (error) {
			console.error("Image OCR error:", error);
			alert("Không thể đọc ảnh lúc này.");
		} finally {
			setIsImageUploading(false);
		}
	};

	const handleAddContribution = async (parentId = null, contentOverride = null) => {
		const contentToSubmit = parentId ? contentOverride : newContribution;
		if (!kanjiDetail?.characterKanji || !contentToSubmit?.trim()) {
			return;
		}

		if (!user) {
			history.push("/login");
			return;
		}

		setSubmittingContribution(true);
		setContributionError("");

		const created = await addWordContribution({
			word: kanjiDetail.characterKanji,
			wordId: kanjiDetail.id,
			content: contentToSubmit,
			targetType: "kanji",
			parentId: parentId,
		});

		if (created) {
			if (parentId) {
				setContributions((prev) => prev.map(c => 
					c.id === parentId ? { ...c, replies: [...(c.replies || []), created] } : c
				));
				setReplyingTo(null);
				setReplyContent("");
			} else {
				setContributions((prev) => [created, ...prev].slice(0, 100));
				setNewContribution("");
			}
		} else {
			setContributionError("Không gửi được bình luận. Vui lòng thử lại.");
		}

		setSubmittingContribution(false);
	};

	const handleContributionKeyDown = (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (!submittingContribution && newContribution.trim()) {
				handleAddContribution(null, null);
			}
		}
	};

	const handleReplyKeyDown = (event, itemId) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (!submittingContribution && replyContent.trim()) {
				handleAddContribution(itemId, replyContent);
			}
		}
	};

	const handleReportContribution = async (commentId) => {
		if (!isLoggedIn) {
			toast.error("Vui lòng đăng nhập để báo cáo.");
			return;
		}
		const reason = window.prompt("Lý do báo cáo bình luận này?");
		if (!reason) return;

		const res = await createReport({
			targetType: "kanji",
			targetId: commentId,
			reason: reason.trim(),
		});

		if (res?.errCode === 0) {
			toast.success("Báo cáo đã được gửi cho quản trị viên.");
		} else {
			toast.error(res?.errMessage || "Không thể gửi báo cáo.");
		}
	};

	const handleSearchInputChange = (event) => {
		setSearchInput(event.target.value);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectKanji = (kanji) => {
		history.push(`/kanji?q=${kanji.characterKanji}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const handleSelectRelatedKanji = (kanji) => {
		setActiveKanji(kanji);
		setKanjiDetail(kanji);
		setCurrentStrokeIndex(0);
		setIsDropdownOpen(false);
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
				{dropdownResults.map((item, index) => (
					<button
						type="button"
						key={item.id}
						className={`kanji-dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectKanji(item)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{item.characterKanji}</strong>
							<span>{item.sinoVietnamese}</span>
						</div>
						<p>{item.kunyomi}</p>
					</button>
				))}
			</div>
		);
	};

	const renderStrokeOrder = () => {
		if (!kanjiDetail) return null;

		if (!strokePaths.length) {
			return (
				<div className="stroke-side-card stroke-side-empty">
					<h3>Hướng dẫn viết nét</h3>
					<p className="stroke-empty">
						Chưa có dữ liệu nét vẽ cho kanji này. Bạn cần nạp `strokePaths` vào
						database để hiển thị thứ tự viết.
					</p>
				</div>
			);
		}

		const maxStrokeIndex = Math.min(
			isStrokePlaying ? currentStrokeIndex : strokePaths.length - 1,
			strokePaths.length - 1
		);
		const displayedStrokes = strokePaths.slice(0, maxStrokeIndex + 1);

		return (
			<div className="stroke-side-card">
				<div className="stroke-side-toolbar">
					<div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
						<span className="stroke-auto-badge">Nét vẽ</span>
						<span className="stroke-progress">Nét {maxStrokeIndex + 1}/{strokePaths.length}</span>
					</div>
					<button
						className="stroke-replay-btn"
						onClick={() => {
							setCurrentStrokeIndex(0);
							setReplayKey((prev) => prev + 1);
							setIsStrokePlaying(true);
						}}
					>
						Vẽ lại
					</button>
				</div>
				<svg key={`stroke-svg-${kanjiDetail.id}-${replayKey}`} viewBox="0 0 109 109" className="stroke-guide-svg" aria-label="Kanji stroke guide">
					<rect x="0" y="0" width="109" height="109" fill="var(--da-surface)" stroke="var(--da-border)" strokeWidth="2" />
					<path d="M54.5 0V109" stroke="var(--da-border)" strokeWidth="1" />
					<path d="M0 54.5H109" stroke="var(--da-border)" strokeWidth="1" />
					{displayedStrokes.map((item, index) => {
						const isCurrentStroke = isStrokePlaying && index === maxStrokeIndex;
						return (
							<path
								key={`stroke-guide-${index}`}
								d={item.d}
								fill="none"
								stroke={isCurrentStroke ? "var(--da-accent-red)" : "var(--da-accent-gold)"}
								strokeWidth={isCurrentStroke ? "4" : "3"}
								strokeLinecap="round"
								strokeLinejoin="round"
								opacity={isCurrentStroke ? "1" : "0.55"}
								pathLength="1"
								className={isCurrentStroke ? "kanji-stroke-animate" : ""}
								style={{
									strokeDasharray: 1,
									strokeDashoffset: isCurrentStroke ? 1 : 0
								}}
							/>
						);
					})}
				</svg>
			</div>
		);
	};

	return (
		<div className="mazii-home kanji-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Hán tự</div>
						<input
							type="text"
							placeholder="Tra Hán tự"
							value={searchInput}
							onChange={handleSearchInputChange}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button type="button" title="Chụp ảnh để tra cứu" onClick={openImagePicker} disabled={isImageUploading}>
								<Camera size={15} />
								<span>{isImageUploading ? "..." : "Ảnh"}</span>
							</button>
							<button
								type="button"
								title="Tìm kiếm"
								onClick={() => {
									if (searchInput.trim()) {
										if (searchInput.trim().length > 25 || /[。、！？\n]/.test(searchInput.trim())) {
											history.push(`/analysis?text=${encodeURIComponent(searchInput.trim())}`);
											return;
										}
										history.push(`/kanji?q=${searchInput.trim()}`);
										setIsDropdownOpen(false);
										setHighlightedDropdownIndex(-1);
									}
								}}
							>
								<Search size={15} />
								<span>Tìm</span>
							</button>
							<button type="button" title="Nhập chữ viết tay" onClick={() => setIsKanjiDrawOpen(true)}>
								<PenTool size={15} />
								<span>Write</span>
							</button>
						</div>

						<input
							ref={imageInputRef}
							type="file"
							accept="image/*"
							capture="environment"
							onChange={handleImagePick}
							style={{ display: "none" }}
						/>
						<button className="lang-switch">Nhật - Việt</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${searchInput}`)}>
							Từ vựng
						</button>
						<button className="tab-active">Hán tự</button>
						<button onClick={() => history.push(`/sentence?q=${searchInput}`)}>
							Mẫu câu
						</button>
						<button onClick={() => history.push(`/grammar?q=${searchInput}`)}>
							Ngữ pháp
						</button>
						<button onClick={() => history.push(`/analysis?text=${encodeURIComponent(searchInput)}`)}>
							Phân tích
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
					{(!kanjiDetail || loading || error) ? (
						<div className="detail-card empty-state-container" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
							{loading && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<p style={{ color: "#64748b" }}>Đang tải...</p>
								</div>
							)}
							{error && !loading && (
								<div className="empty-state-content error-state" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ margin: "0 auto 24px", width: "100px", height: "100px", borderRadius: "50%", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
										<SearchX size={48} color="#64748b" />
									</div>
									<h3 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Không tìm thấy Hán tự</h3>
									<p style={{ color: "#475569", fontSize: "16px", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
										Rất tiếc, không có kết quả nào phù hợp với từ khóa <strong style={{ color: "#0f172a" }}>"{keyword}"</strong>. Hãy kiểm tra lại chính tả hoặc thử một từ khóa khác.
									</p>
								</div>
							)}
							{!loading && !error && !kanjiDetail && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ margin: "0 auto 24px", width: "80px", height: "80px", borderRadius: "20px", background: "linear-gradient(135deg, #ebf4ff, #fff0db)", border: "1px solid #d3e5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: "900", color: "#1f5f95" }}>漢</div>
									<h3 style={{ fontSize: "20px", color: "#1e293b", marginBottom: "8px" }}>Nhập một chữ kanji để bắt đầu</h3>
									<p style={{ color: "#64748b" }}>Bạn có thể tìm theo chữ kanji, âm hán việt hoặc vẽ kanji bằng nút A文.</p>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="detail-left">
								<div className="detail-card">
									<div className="detail-overview-grid">
										<div>
											<div className="detail-head">
												<div>
													<h1>{kanjiDetail.characterKanji}</h1>
													<div className="detail-reading">{kanjiDetail.meaning}</div>
												</div>
												<div className="detail-actions">
													<button
														type="button"
														onClick={() => {
															setNotebookPickerItem({
																type: "kanji",
																id: kanjiDetail.id,
																label: kanjiDetail.characterKanji,
																subtitle: kanjiDetail.sinoVietnamese,
																meaning: kanjiDetail.meaning,
															});
															setIsNotebookPickerOpen(true);
														}}
													>
														+
													</button>
													{/* <button>SVG</button> */}
												</div>
											</div>
											<div className="detail-meta">
												<div>Số nét: {kanjiDetail.strokeCount}</div>
												<div>JLPT: {kanjiDetail.jlptLevel ? `N${kanjiDetail.jlptLevel}` : "-"}</div>
												<div>Tần suất: #{kanjiDetail.frequencyRank}/2500</div>
											</div>
										</div>
										<div className="detail-stroke-wrap">
											{renderStrokeOrder()}
										</div>
									</div>
									<div className="detail-section">
										<h3>Kunyomi</h3>
										{getReadingItems(kanjiDetail.kunyomi).length ? (
											<ul className="reading-list">
												{getReadingItems(kanjiDetail.kunyomi).map((item, idx) => (
													<li key={idx}>{item.trim()}</li>
												))}
											</ul>
										) : (
											<p>-</p>
										)}
									</div>
									<div className="detail-section">
										<h3>Onyomi</h3>
										{getReadingItems(kanjiDetail.onyomi).length ? (
											<ul className="reading-list">
												{getReadingItems(kanjiDetail.onyomi).map((item, idx) => (
													<li key={idx}>{item.trim()}</li>
												))}
											</ul>
										) : (
											<p>-</p>
										)}
									</div>
									{kanjiDetail.components && (
										<div className="detail-section">
											<h3>Bộ - Kanji Breakdown</h3>
											<div className="kanji-components">
												<div className="component-item">
													<span className="component-symbol">+</span>
													<span className="component-name">{kanjiDetail.components}</span>
												</div>
											</div>
										</div>
									)}
									<div className="detail-section">
										<h3>Nghĩa</h3>
										<p>{kanjiDetail.meaning}</p>
									</div>
									{kanjiWords.length > 0 && (
										<div className="detail-section">
											<h3>Từ vựng chứa kanji này</h3>
											<div className="kanji-word-table-wrap">
												<table className="kanji-word-table">
													<thead>
														<tr>
															<th>Từ</th>
															<th>Đọc</th>
															<th>Nghĩa</th>
														</tr>
													</thead>
													<tbody>
														{kanjiWords.map((word) => (
															<tr key={word.id}>
																<td>{word.word}</td>
																<td>{word.reading || "-"}</td>
																<td>{word.meanings?.[0]?.definition || "-"}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									)}
									{displayedKanjiExamples.length > 0 && (
										<div className="detail-section">
											<h3>Ví dụ</h3>
											<div className="kanji-example-list">
												{displayedKanjiExamples.map((example) => (
													<div className="kanji-example-item" key={example.id}>
														<p className="kanji-example-jp">{example.japaneseSentence}</p>
														<p className="kanji-example-vi">{example.vietnameseTranslation}</p>
														<small>Từ liên quan: {example.relatedWord}</small>
													</div>
												))}
											</div>
										</div>
									)}

									<div className="detail-section">
										<h3>Có {contributions.length} ý kiến đóng góp</h3>
										<div className="contribution-list">
											{contributions.map((item) => (
												<div className="contribution-item" key={item.id}>
													<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
														<p>{item.content}</p>
														<button
															type="button"
															onClick={() => handleReportContribution(item.id)}
															title="Báo cáo bình luận"
															style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
														>
															<AlertTriangle size={14} />
														</button>
													</div>
													<div className="contribution-meta">
														<small>{item.author}</small>
														<small>{new Date(item.createdAt).toLocaleString("vi-VN")}</small>
														<button
															className="reply-btn"
															onClick={() => setReplyingTo(replyingTo === item.id ? null : item.id)}
															style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.85em", marginLeft: "12px", textDecoration: "underline" }}
														>
															Trả lời
														</button>
													</div>
													
													{replyingTo === item.id && (
														<div className="contribution-form" style={{ marginTop: "12px", borderLeft: "2px solid #e2e8f0", paddingLeft: "12px" }}>
															<textarea
																autoFocus
																value={replyContent}
																onChange={(e) => setReplyContent(e.target.value)}
																onKeyDown={(e) => handleReplyKeyDown(e, item.id)}
																placeholder="Viết trả lời..."
																style={{ minHeight: "60px" }}
															/>
															<div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
																<button type="button" onClick={() => handleAddContribution(item.id, replyContent)} disabled={submittingContribution} style={{ padding: "6px 12px", fontSize: "0.9em" }}>
																	{submittingContribution ? "Đang gửi..." : "Gửi"}
																</button>
																<button type="button" onClick={() => setReplyingTo(null)} style={{ background: "transparent", color: "#64748b", padding: "6px 12px", fontSize: "0.9em" }}>
																	Hủy
																</button>
															</div>
														</div>
													)}

													{item.replies && item.replies.length > 0 && (
														<div className="replies-list" style={{ marginLeft: "20px", marginTop: "12px", borderLeft: "2px solid #e2e8f0", paddingLeft: "16px" }}>
															{!expandedReplies[item.id] ? (
																<button
																	type="button"
																	onClick={() => setExpandedReplies(prev => ({ ...prev, [item.id]: true }))}
																	style={{ background: "transparent", border: "none", cursor: "pointer", color: "#3b82f6", fontSize: "0.9em", fontWeight: "bold" }}
																>
																	Xem {item.replies.length} câu trả lời
																</button>
															) : (
																<>
																	<button
																		type="button"
																		onClick={() => setExpandedReplies(prev => ({ ...prev, [item.id]: false }))}
																		style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.9em", marginBottom: "8px" }}
																	>
																		Thu gọn
																	</button>
																	{item.replies.map(reply => (
																		<div className="contribution-item reply-item" key={reply.id} style={{ borderBottom: "none", paddingBottom: "0", marginBottom: "12px" }}>
																			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
																				<p style={{ fontSize: "0.95em", margin: 0 }}>{reply.content}</p>
																				<button
																					type="button"
																					onClick={() => handleReportContribution(reply.id)}
																					title="Báo cáo bình luận"
																					style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8" }}
																				>
																					<AlertTriangle size={14} />
																				</button>
																			</div>
																			<div className="contribution-meta">
																				<small>{reply.author}</small>
																				<small>{new Date(reply.createdAt).toLocaleString("vi-VN")}</small>
																				<button
																					className="reply-btn"
																					onClick={() => {
																						setReplyingTo(item.id);
																						setReplyContent(`@${reply.author} `);
																					}}
																					style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.85em", marginLeft: "12px", textDecoration: "underline" }}
																				>
																					Trả lời
																				</button>
																			</div>
																		</div>
																	))}
																</>
															)}
														</div>
													)}
												</div>
											))}
											{contributions.length === 0 && (
												<p className="contribution-empty">Chưa có đóng góp nào cho hán tự này.</p>
											)}
										</div>
										<div className="contribution-form">
											<textarea
												value={newContribution}
												onChange={(e) => setNewContribution(e.target.value)}
												onKeyDown={handleContributionKeyDown}
												placeholder="Thêm ghi chú hoặc mẹo ghi nhớ kanji. Ấn SHIFT + ENTER để xuống dòng"
											/>
											{contributionError && (
												<p className="contribution-empty">{contributionError}</p>
											)}
											<button
												type="button"
												onClick={() => handleAddContribution(null, null)}
												disabled={submittingContribution}
											>
												{submittingContribution ? "Đang gửi..." : "Gửi"}
											</button>
										</div>
									</div>
								</div>
							</div>
							<div className="detail-right">
								{hasKeyword ? (
									<div className="lookup-panel">
										<h3>Kết quả tra cứu kanji</h3>
										<div className="related-list">
											{relatedKanjis.map((item) => (
												<button
													key={item.id}
													className={
														activeKanji && activeKanji.id === item.id
															? "related-active"
															: ""
													}
													onClick={() => handleSelectRelatedKanji(item)}
												>
													<strong>{item.characterKanji}</strong>
													<span>{item.sinoVietnamese}</span>
												</button>
											))}
										</div>
									</div>
								) : (
									<>
										<div className="lookup-panel">
											<h3>Lich su gan day</h3>
											<div className="related-list default-list">
												{recentHistory.slice(0, 6).map((item) => {
													const term = getTermLabel(item);
													if (!term) return null;
													return (
														<button
															type="button"
															key={item.id}
															onClick={() => history.push(`/kanji?q=${encodeURIComponent(term)}`)}
														>
															<strong>{term}</strong>
														</button>
													);
												})}
												{recentHistory.length === 0 && <p className="side-empty">Chua co lich su.</p>}
											</div>
										</div>

										<div className="lookup-panel">
											<h3>Tu khoa hot</h3>
											<div className="chip-list">
												{topKeywords.slice(0, 8).map((item, index) => {
													const term = getTermLabel(item);
													if (!term) return null;
													return (
														<button
															type="button"
															key={`${term}-${index}`}
															onClick={() => history.push(`/kanji?q=${encodeURIComponent(term)}`)}
														>
															{term}
															<span>{getTermCount(item)}</span>
														</button>
													);
												})}
												{topKeywords.length === 0 && <p className="side-empty">Chua co du lieu hot.</p>}
											</div>
										</div>

										<div className="lookup-panel">
											<h3>Gop y moi</h3>
											<div className="feedback-list">
												{latestContributions.slice(0, 4).map((item) => (
													<div key={item.id} className="feedback-item">
														<strong>{item.word || "Tu vung"}</strong>
														<p>{item.content}</p>
													</div>
												))}
												{latestContributions.length === 0 && <p className="side-empty">Chua co gop y.</p>}
											</div>
										</div>
									</>
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default KanjiPage;
