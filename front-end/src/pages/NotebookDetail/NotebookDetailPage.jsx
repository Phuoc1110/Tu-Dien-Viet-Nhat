import React, { useContext, useEffect, useMemo, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Edit3,
	Filter,
	Play,
	// PlusCircle,
	// RotateCcw,
	Search,
	Settings,
	Shuffle,
	Trash2,
} from "lucide-react";
import { UserContext } from "../../Context/UserProvider";
import SpeakButton from "../../components/SpeakButton/SpeakButton";
import {
	deleteNotebook,
	getNotebookDetail,
	updateNotebook,
} from "../../services/notebookService";
import "./NotebookDetailPage.css";

const chunkItems = (items, chunkSize = 2) => {
	const result = [];
	for (let i = 0; i < items.length; i += chunkSize) {
		result.push(items.slice(i, i + chunkSize));
	}
	return result;
};

const hasKanjiChar = (text) => /[\u4E00-\u9FFF]/.test(String(text || ""));
const WORDS_PER_PAGE = 10;

const NotebookDetailPage = () => {
	const history = useHistory();
	const location = useLocation();
	const { id } = useParams();
	const { user } = useContext(UserContext);
	const [loading, setLoading] = useState(true);
	const [notebook, setNotebook] = useState(null);
	const [message, setMessage] = useState("");
	const [searchKeyword, setSearchKeyword] = useState("");
	const [isEditingName, setIsEditingName] = useState(false);
	const [editingName, setEditingName] = useState("");
	const [activeMode, setActiveMode] = useState("list");
	const [isFlashcardView, setIsFlashcardView] = useState(false);
	const [flashIndex, setFlashIndex] = useState(0);
	const [isCardFlipped, setIsCardFlipped] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);
	const [fieldVisibility, setFieldVisibility] = useState({
		vocabulary: true,
		reading: true,
		meaning: true,
	});
	const cameFromExplore = Boolean(location.state?.fromExplore);

	const currentUserId = user?.account?.id;
	const isOwner = useMemo(() => {
		if (!notebook || !currentUserId) {
			return false;
		}
		return Number(notebook.userId) === Number(currentUserId);
	}, [notebook, currentUserId]);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			const res = await getNotebookDetail(id);
			if (res?.errCode === 0 && res.notebook) {
				setNotebook(res.notebook);
				setEditingName(res.notebook.name || "");
				setMessage("");
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setMessage(res?.errMessage || "Không tải được sổ tay");
			}
			setLoading(false);
		};

		load();
	}, [history, id]);

	const filteredItems = useMemo(() => {
		const rawItems = notebook?.items || [];
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			return rawItems;
		}
		return rawItems.filter((entry) => {
			const title = String(entry?.item?.title || "").toLowerCase();
			const meaning = String(entry?.item?.meaning || "").toLowerCase();
			return title.includes(keyword) || meaning.includes(keyword);
		});
	}, [notebook?.items, searchKeyword]);

	const flashItems = useMemo(() => {
		return filteredItems.filter((entry) => Boolean(entry?.item?.title));
	}, [filteredItems]);

	const activeFlashItem =
		flashItems.length > 0 ? flashItems[flashIndex % flashItems.length] : null;

	const frontText = useMemo(() => {
		const title = activeFlashItem?.item?.title || "";
		if (!title) {
			return "-";
		}
		return title;
	}, [activeFlashItem]);

	const backReading = useMemo(() => {
		const title = activeFlashItem?.item?.title || "";
		if (!hasKanjiChar(title)) {
			return "";
		}
		return activeFlashItem?.item?.subtitle || "";
	}, [activeFlashItem]);

	const backMeaning = useMemo(() => {
		return activeFlashItem?.item?.meaning || activeFlashItem?.item?.subtitle || "-";
	}, [activeFlashItem]);

	const flashSpeakText = useMemo(() => {
		return activeFlashItem?.item?.title || activeFlashItem?.item?.subtitle || "";
	}, [activeFlashItem]);

	const totalPages = useMemo(() => {
		const pages = Math.ceil(filteredItems.length / WORDS_PER_PAGE);
		return pages > 0 ? pages : 1;
	}, [filteredItems.length]);

	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * WORDS_PER_PAGE;
		const end = start + WORDS_PER_PAGE;
		return filteredItems.slice(start, end);
	}, [currentPage, filteredItems]);

	const twoColumnRows = useMemo(() => chunkItems(paginatedItems, 2), [paginatedItems]);

	useEffect(() => {
		setFlashIndex(0);
		setIsCardFlipped(false);
	}, [searchKeyword, notebook?.id]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchKeyword, notebook?.id]);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	const handleSaveNotebookName = async () => {
		const nextName = editingName.trim();
		if (!nextName) {
			setMessage("Tên sổ tay không được để trống");
			return;
		}
		const res = await updateNotebook(id, { name: nextName });
		if (res?.errCode === 0) {
			setNotebook((prev) => (prev ? { ...prev, name: nextName } : prev));
			setMessage("Đã cập nhật tên sổ tay");
			setIsEditingName(false);
		} else {
			setMessage(res?.errMessage || "Không thể cập nhật tên sổ tay");
		}
	};

	const handleDeleteNotebook = async () => {
		const accepted = window.confirm("Bạn có chắc muốn xóa sổ tay này?");
		if (!accepted) {
			return;
		}

		const res = await deleteNotebook(id);
		if (res?.errCode === 0) {
			history.push("/notebook");
			return;
		}
		setMessage(res?.errMessage || "Không thể xóa sổ tay");
	};

	const handlePrevFlash = () => {
		if (!flashItems.length) {
			return;
		}
		setFlashIndex((prev) => (prev - 1 + flashItems.length) % flashItems.length);
		setIsCardFlipped(false);
	};

	const handleNextFlash = () => {
		if (!flashItems.length) {
			return;
		}
		setFlashIndex((prev) => (prev + 1) % flashItems.length);
		setIsCardFlipped(false);
	};

	const gotoFirstPage = () => setCurrentPage(1);
	const gotoPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
	const gotoNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	const gotoLastPage = () => setCurrentPage(totalPages);
	const toggleFieldVisibility = (field) => {
		setFieldVisibility((prev) => ({
			...prev,
			[field]: !prev[field],
		}));
	};

	return (
		<div className="notebook-detail-page">
			<div className="notebook-detail-shell">
				<div className="notebook-detail-breadcrumb">
					<button type="button" className="breadcrumb-link-btn" onClick={() => history.push("/notebook")}>Từ của tôi</button>
					<span>/</span>
					<button
						type="button"
						className="breadcrumb-link-btn"
						onClick={() => history.push(cameFromExplore ? "/notebook/explore" : "/notebook/list")}
					>
						{cameFromExplore ? "Khám phá" : "Danh sách sổ tay"}
					</button>
					<span>/</span>
					{" "}
					<button
						type="button"
						className="breadcrumb-link-btn"
						onClick={() => {
							setIsFlashcardView(false);
							setActiveMode("list");
						}}
					>
						{notebook?.name || "..."}
					</button>
					{isFlashcardView ? " / FlashCard" : ""}
				</div>

				<div className="notebook-detail-main">
					<div className="notebook-detail-left">
						<div className="notebook-mode-tabs">
							<button
								type="button"
								className={isFlashcardView ? "active" : ""}
								onClick={() => {
									setActiveMode("flashcard");
									setIsFlashcardView(true);
								}}
							>
								FlashCard
							</button>
							<button
								type="button"
								className={activeMode === "quiz" ? "active" : ""}
								onClick={() => {
									setActiveMode("quiz");
									setIsFlashcardView(false);
								}}
							>
								Quizz
							</button>
							<button
								type="button"
								className={activeMode === "practice" ? "active" : ""}
								onClick={() => {
									setActiveMode("practice");
									setIsFlashcardView(false);
								}}
							>
								Luyện nói, viết
							</button>
							<button
								type="button"
								className={activeMode === "mini-test" ? "active" : ""}
								onClick={() => {
									setActiveMode("mini-test");
									setIsFlashcardView(false);
								}}
							>
								Mini Test
							</button>
						</div>

						{isFlashcardView ? (
							<div className="flashcard-mode-panel">
								<div className="flashcard-mode-header">
									<h2>Từ vựng</h2>
									<div className="flashcard-mode-actions">
										{/* <select>
											<option>Tất cả</option>
										</select> */}
										<button type="button" className="tiny-btn"><Settings size={18} /></button>
									</div>
								</div>

								<div className="flashcard-board">
									{loading && <div className="word-loading">Đang tải sổ tay...</div>}
									{message && !loading && <div className="word-message">{message}</div>}
									{!loading && !flashItems.length && (
										<div className="word-empty">Sổ tay này chưa có từ nào.</div>
									)}

									{!loading && Boolean(activeFlashItem) && (
										<div className="flashcard-stage">
											<button type="button" className="nav-arrow left" onClick={handlePrevFlash}>
												<ChevronLeft size={24} />
											</button>

											<div
												className={`flashcard-3d ${isCardFlipped ? "flipped" : ""}`}
												onClick={() => setIsCardFlipped((prev) => !prev)}
											>
												<div className="flashcard-face front">
													<SpeakButton
														text={flashSpeakText}
														iconSize={34}
														className="flashcard-speak-btn"
														preventPropagation
														title="Đọc từ"
													/>
													<h3>{frontText}</h3>
													<p className="detail-link">Xem chi tiết</p>
												</div>
												<div className="flashcard-face back">
													{backReading ? <p className="back-reading">{backReading}</p> : null}
													<p className="back-meaning">{backMeaning}</p>
												</div>
											</div>

											<button type="button" className="nav-arrow right" onClick={handleNextFlash}>
												<ChevronRight size={24} />
											</button>
										</div>
									)}
								</div>

								{Boolean(activeFlashItem) && (
									<div className="flashcard-bottom-actions">
										<div className="flash-progress">
											{flashItems.length ? `${flashIndex + 1}/${flashItems.length}` : "0/0"}
										</div>
										<button type="button" className="flip-btn" onClick={() => setIsCardFlipped((prev) => !prev)}>
											Mặt sau
										</button>
										<div className="learning-state-row">
											<button type="button" className="known-btn">Đã thuộc</button>
											<button type="button" className="unknown-btn">Chưa thuộc</button>
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="notebook-word-panel">
								<div className="word-panel-tools">
									<div className="tool-left">
										<label>
											<input
												type="checkbox"
												checked={fieldVisibility.vocabulary}
												onChange={() => toggleFieldVisibility("vocabulary")}
											/>
											Từ vựng
										</label>
										<label>
											<input
												type="checkbox"
												checked={fieldVisibility.reading}
												onChange={() => toggleFieldVisibility("reading")}
											/>
											Phiên âm
										</label>
										<label>
											<input
												type="checkbox"
												checked={fieldVisibility.meaning}
												onChange={() => toggleFieldVisibility("meaning")}
											/>
											Nghĩa
										</label>
										{/* <button type="button" className="tiny-btn" aria-label="note"><Edit3 size={14} /></button> */}
									</div>
									<div className="tool-right">
										{/* <button type="button" className="tiny-btn"><RotateCcw size={16} /></button> */}
										<button type="button" className="tiny-btn"><Download size={16} /></button>
										{/* <button type="button" className="tiny-btn"><PlusCircle size={16} /></button> */}
										<button type="button" className="tiny-btn"><Play size={16} /></button>
										<button type="button" className="tiny-btn"><Shuffle size={16} /></button>
									</div>
								</div>

								{loading && <div className="word-loading">Đang tải sổ tay...</div>}
								{message && !loading && <div className="word-message">{message}</div>}

								<div className="word-list-body">
									{twoColumnRows.map((row, index) => (
										<div key={`row-${index}`} className="word-row">
											{row.map((entry) => (
												<div key={entry.id} className="word-item-card">
													{fieldVisibility.vocabulary && (
														<div className="word-line-row">
															<div className="word-main-line">
																<SpeakButton
																	text={entry.item?.title || entry.item?.subtitle || ""}
																	iconSize={18}
																	className="tiny-btn"
																	title="Đọc từ"
																/>
																<strong>{entry.item?.title || "-"}</strong>
															</div>
														</div>
													)}
													{fieldVisibility.reading && (
														<div className="word-line-row">
															<p className="word-sub">{entry.item?.subtitle || "-"}</p>
														</div>
													)}
													{fieldVisibility.meaning && (
														<div className="word-line-row">
															<p className="word-meaning">{entry.item?.meaning || "-"}</p>
														</div>
													)}
													{!fieldVisibility.vocabulary && !fieldVisibility.reading && !fieldVisibility.meaning && (
														<div className="word-empty-line">&nbsp;</div>
													)}
													{/* <div className="word-note-row">
														<button type="button" className="add-note-btn">+ Thêm ghi chú</button>
													</div> */}
												</div>
											))}
											{row.length === 1 && <div className="word-item-card placeholder" />}
										</div>
									))}
									{!loading && filteredItems.length === 0 && (
										<div className="word-empty">Sổ tay này chưa có từ nào.</div>
									)}
								</div>

								{!loading && filteredItems.length > 0 && (
									<div className="word-pagination">
										<button
											type="button"
											className="page-btn"
											onClick={gotoFirstPage}
											disabled={currentPage === 1}
										>
											&laquo;
										</button>
										<button
											type="button"
											className="page-btn"
											onClick={gotoPreviousPage}
											disabled={currentPage === 1}
										>
											&lsaquo;
										</button>
										<span className="page-number">{currentPage}</span>
										<button
											type="button"
											className="page-btn"
											onClick={gotoNextPage}
											disabled={currentPage >= totalPages}
										>
											&rsaquo;
										</button>
										<button
											type="button"
											className="page-btn"
											onClick={gotoLastPage}
											disabled={currentPage >= totalPages}
										>
											&raquo;
										</button>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="notebook-detail-right">
						<div className="search-box">
							<Search size={18} />
							<input
								type="text"
								placeholder="Tìm kiếm"
								value={searchKeyword}
								onChange={(event) => setSearchKeyword(event.target.value)}
							/>
							<button type="button" className="tiny-btn"><Filter size={16} /></button>
						</div>

						<div className="notebook-info-card">
							{isEditingName ? (
								<div className="edit-name-row">
									<input
										type="text"
										value={editingName}
										onChange={(event) => setEditingName(event.target.value)}
									/>
									<button type="button" onClick={handleSaveNotebookName}>Lưu</button>
								</div>
							) : (
								<div className="name-row">
									<h3>{notebook?.name || "-"}</h3>
									<div className="name-actions">
										{isOwner && (
											<>
												<button type="button" className="tiny-btn" onClick={() => setIsEditingName(true)}><Edit3 size={16} /></button>
												<button type="button" className="tiny-btn danger" onClick={handleDeleteNotebook}><Trash2 size={16} /></button>
											</>
										)}
									</div>
								</div>
							)}
							<p>{notebook?.itemsCount || 0} từ</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotebookDetailPage;
