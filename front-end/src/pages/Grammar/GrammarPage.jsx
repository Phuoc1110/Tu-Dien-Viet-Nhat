import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { searchGrammars } from "../../services/dictionaryService";
import { getLatestWordContributions, getWordContributions, addWordContribution } from "../../services/wordContributionService";
import { createReport } from "../../services/userService";
import KanjiDrawModal from "../../components/KanjiDrawModal/KanjiDrawModal";
import NotebookPickerModal from "../../components/NotebookPickerModal/NotebookPickerModal";
import { Search, PenTool, SearchX, AlertTriangle } from "lucide-react";
import { UserContext } from "../../Context/UserProvider";
import { toast } from "react-toastify";
import "./GrammarPage.css";

const GrammarPage = () => {
	const history = useHistory();
	const { search } = useLocation();
	const searchWrapRef = useRef(null);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [dropdownResults, setDropdownResults] = useState([]);
	const [highlightedDropdownIndex, setHighlightedDropdownIndex] = useState(-1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [grammars, setGrammars] = useState([]);
	const [defaultGrammars, setDefaultGrammars] = useState([]);
	const [activeGrammar, setActiveGrammar] = useState(null);
	const [isKanjiDrawOpen, setIsKanjiDrawOpen] = useState(false);
	const [isNotebookPickerOpen, setIsNotebookPickerOpen] = useState(false);
	const [notebookPickerItem, setNotebookPickerItem] = useState(null);
	const [contributions, setContributions] = useState([]);
	const [newContribution, setNewContribution] = useState("");
	const [submittingContribution, setSubmittingContribution] = useState(false);
	const [contributionError, setContributionError] = useState("");
	const [replyingTo, setReplyingTo] = useState(null);
	const [replyContent, setReplyContent] = useState("");
	const [expandedReplies, setExpandedReplies] = useState({});
	
	const { user } = useContext(UserContext);
	const isLoggedIn = !!(user?.isAuthenticated && user?.account?.id);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);
	const hasKeyword = keyword.trim().length > 0;

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		let mounted = true;

		const loadDefaultGrammars = async () => {
			setLoading(true);
			const seedWords = ["は", "です", "する", "ない", "よう", "ため", "ば", "ので"];
			const randomSeed = seedWords[Math.floor(Math.random() * seedWords.length)] || "は";
			const res = await searchGrammars(randomSeed, 24);

			if (!mounted) {
				return;
			}

			if (res && res.errCode === 0) {
				const shuffled = [...(res.grammars || [])]
					.sort(() => Math.random() - 0.5)
					.slice(0, 16);
				setDefaultGrammars(shuffled);
				if (!keyword.trim()) {
					setActiveGrammar(shuffled[0] || null);
				}
			} else {
				setDefaultGrammars([]);
			}
			setLoading(false);
		};

		loadDefaultGrammars();

		return () => {
			mounted = false;
		};
	}, [keyword]);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setGrammars([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchGrammars(keyword.trim(), 20);
			if (res && res.errCode === 0) {
				const list = res.grammars || [];
				setGrammars(list);
				setActiveGrammar(list[0] || null);
				if (!list.length) {
					setError("Khong tim thay ngu phap phu hop");
				}
			} else {
				setGrammars([]);
				setActiveGrammar(null);
				setError((res && res.errMessage) || "Search failed");
			}
			setLoading(false);
		};

		runSearch();
	}, [keyword]);

	useEffect(() => {
		if (!hasKeyword && defaultGrammars.length && !activeGrammar) {
			setActiveGrammar(defaultGrammars[0]);
		}
	}, [hasKeyword, defaultGrammars, activeGrammar]);

	useEffect(() => {
		const fetchContributions = async () => {
			if (activeGrammar?.id) {
				const res = await getWordContributions({
					wordId: activeGrammar.id,
					targetType: "grammar",
				});
				setContributions(Array.isArray(res) ? res : []);
			} else {
				setContributions([]);
			}
		};
		fetchContributions();
	}, [activeGrammar?.id]);

	useEffect(() => {
		if (!searchInput.trim()) {
			setDropdownResults([]);
			setErrorDropdown("");
			setHighlightedDropdownIndex(-1);
			return;
		}

		const debounce = setTimeout(async () => {
			setLoadingDropdown(true);
			setErrorDropdown("");
			const res = await searchGrammars(searchInput.trim(), 8);
			if (res && res.errCode === 0) {
				setDropdownResults(res.grammars || []);
				setHighlightedDropdownIndex(-1);
			} else {
				setDropdownResults([]);
				setHighlightedDropdownIndex(-1);
				setErrorDropdown((res && res.errMessage) || "Search failed");
			}
			setLoadingDropdown(false);
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
				handleSelectGrammar(dropdownResults[highlightedDropdownIndex]);
				return;
			}

			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				if (newKeyword.trim().length > 25 || /[。、！？\n]/.test(newKeyword.trim())) {
					history.push(`/analysis?text=${encodeURIComponent(newKeyword.trim())}`);
					return;
				}
				history.push(`/grammar?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
				setHighlightedDropdownIndex(-1);
			}
		}
	};

	const handleAddContribution = async (parentId = null, contentOverride = null) => {
		const contentToSubmit = parentId ? contentOverride : newContribution;
		if (!activeGrammar?.title || !contentToSubmit?.trim()) {
			return;
		}

		if (!isLoggedIn) {
			history.push("/login");
			return;
		}

		setSubmittingContribution(true);
		setContributionError("");

		const created = await addWordContribution({
			word: activeGrammar.title,
			wordId: activeGrammar.id,
			content: contentToSubmit,
			targetType: "grammar",
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
			targetType: "grammar",
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

	const handleSelectGrammar = (item) => {
		history.push(`/grammar?q=${item.title}`);
		setIsDropdownOpen(false);
		setHighlightedDropdownIndex(-1);
	};

	const toBulletLines = (value) => {
		if (!value) {
			return [];
		}
		return value
			.split(/\n|;/)
			.map((line) => line.trim())
			.filter(Boolean);
	};

	const renderDropdownBody = () => {
		if (loadingDropdown) {
			return <div className="dropdown-status">Dang tra cuu...</div>;
		}

		if (errorDropdown) {
			return <div className="dropdown-status error">{errorDropdown}</div>;
		}

		if (!dropdownResults.length) {
			return <div className="dropdown-status">Khong co du lieu phu hop.</div>;
		}

		return (
			<div className="dropdown-list">
				{dropdownResults.map((item, index) => (
					<button
						type="button"
						key={item.id}
						className={`grammar-dropdown-item ${highlightedDropdownIndex === index ? "active" : ""}`}
						onClick={() => handleSelectGrammar(item)}
						onMouseEnter={() => setHighlightedDropdownIndex(index)}
					>
						<div className="dropdown-item-main">
							<strong>{item.title}</strong>
							<span>{item.jlptLevel ? `N${item.jlptLevel}` : "-"}</span>
						</div>
						<p>{item.meaning}</p>
					</button>
				))}
			</div>
		);
	};

	const displayedGrammars = hasKeyword ? grammars : defaultGrammars;

	return (
		<div className="mazii-home grammar-page">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Ngữ Pháp</div>
						<input
							type="text"
							placeholder="Tra ngu phap"
							value={searchInput}
							onChange={handleSearchInputChange}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button 
								type="button"
								title="Tìm kiếm"
								onClick={() => {
									if (searchInput.trim()) {
										if (searchInput.trim().length > 25 || /[。、！？\n]/.test(searchInput.trim())) {
											history.push(`/analysis?text=${encodeURIComponent(searchInput.trim())}`);
											return;
										}
										history.push(`/grammar?q=${searchInput.trim()}`);
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
						<button className="lang-switch">Nhat - Viet</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${searchInput}`)}>
							Từ vựng
						</button>
						<button onClick={() => history.push(`/kanji?q=${searchInput}`)}>
							Hán tự
						</button>
						<button onClick={() => history.push(`/sentence?q=${searchInput}`)}>
							Mẫu câu
						</button>
						<button className="tab-active">Ngữ pháp</button>
						<button onClick={() => history.push(`/analysis?text=${searchInput}`)}>
							Phân tích
						</button>
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

				<div className="grammar-content-grid">
					{(!activeGrammar || loading || error) ? (
						<div className="detail-card grammar-detail-card empty-state-container" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
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
									<h3 style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginBottom: "12px" }}>Không tìm thấy Ngữ pháp</h3>
									<p style={{ color: "#475569", fontSize: "16px", maxWidth: "420px", margin: "0 auto", lineHeight: "1.6" }}>
										Rất tiếc, không có kết quả nào phù hợp với từ khóa <strong style={{ color: "#0f172a" }}>"{keyword}"</strong>. Hãy kiểm tra lại chính tả hoặc thử một từ khóa khác.
									</p>
								</div>
							)}
							{!loading && !error && !activeGrammar && (
								<div className="empty-state-content" style={{ textAlign: "center", padding: "60px 20px" }}>
									<div className="empty-state-visual" style={{ margin: "0 auto 24px", width: "80px", height: "80px", borderRadius: "20px", background: "linear-gradient(135deg, #ebf4ff, #eef2ff)", border: "1px solid #d3e5f5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px", fontWeight: "900", color: "#1f5f95" }}>文</div>
									<h3 style={{ fontSize: "20px", color: "#1e293b", marginBottom: "8px" }}>Nhập một ngữ pháp để bắt đầu</h3>
									<p style={{ color: "#64748b" }}>Nhập tên ngữ pháp để xem giải thích chi tiết và các ví dụ minh họa.</p>
								</div>
							)}
						</div>
					) : (
						<>
							<div className="grammar-left">
								<div className="detail-card grammar-detail-card">
									<div className="grammar-head">
										<div>
											<h1>{activeGrammar.title}</h1>
											<p>{activeGrammar.meaning}</p>
										</div>
										<button
											type="button"
											className="grammar-add-btn"
											onClick={() => {
												setNotebookPickerItem({
													type: "grammar",
													id: activeGrammar.id,
													label: activeGrammar.title,
													subtitle: activeGrammar.jlptLevel ? `N${activeGrammar.jlptLevel}` : "",
													meaning: activeGrammar.meaning,
												});
												setIsNotebookPickerOpen(true);
											}}
										>
											+
										</button>
									</div>

									<div className="detail-section">
										<span className="grammar-jlpt-badge">
											JLPT N{activeGrammar.jlptLevel || "?"}
										</span>
									</div>

									<div className="detail-section">
										<h3>Cấu trúc</h3>
										<ul className="grammar-dot-list">
											{toBulletLines(activeGrammar.formation).map((line, idx) => (
												<li key={idx}>{line}</li>
											))}
											{!toBulletLines(activeGrammar.formation).length && <li>-</li>}
										</ul>
									</div>

									<div className="detail-section">
										<h3>Nghĩa</h3>
										<ul className="grammar-dot-list">
											{toBulletLines(activeGrammar.usageNote || activeGrammar.meaning).map(
												(line, idx) => (
													<li key={idx}>{line}</li>
												)
											)}
										</ul>
									</div>

									<div className="detail-section">
										<h3>Ví dụ</h3>
										<div className="grammar-example-list">
											{(activeGrammar.examples || []).map((example) => (
												<div className="grammar-example-item" key={example.id}>
													<p className="grammar-example-jp">{example.japaneseSentence}</p>
													{example.readingSentence && (
														<p className="grammar-example-reading">{example.readingSentence}</p>
													)}
													<p className="grammar-example-vi">{example.vietnameseTranslation}</p>
												</div>
											))}
											{!(activeGrammar.examples || []).length && (
												<p>Chua co vi du</p>
											)}
										</div>
									</div>

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
												<p className="contribution-empty">Chưa có đóng góp nào cho ngữ pháp này.</p>
											)}
										</div>
										<div className="contribution-form">
											<textarea
												value={newContribution}
												onChange={(e) => setNewContribution(e.target.value)}
												onKeyDown={handleContributionKeyDown}
												placeholder="Thêm ghi chú hoặc ví dụ. Ấn SHIFT + ENTER để xuống dòng"
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

							<div className="grammar-right">
								<div className="lookup-panel grammar-list-panel">
									{displayedGrammars.map((item) => (
										<button
											key={item.id}
											type="button"
											className={`grammar-list-item ${
												activeGrammar && activeGrammar.id === item.id ? "active" : ""
											}`}
											onClick={() => setActiveGrammar(item)}
										>
											<span className="grammar-list-jlpt">N{item.jlptLevel || "?"}</span>
											<strong>{item.title}</strong>
											<p>{item.meaning}</p>
										</button>
									))}
									{displayedGrammars.length === 0 && !loading && <p>Chua co du lieu ngu phap.</p>}
								</div>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export default GrammarPage;
