import React, { useEffect, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import {
	BookOpen,
	Brain,
	ChevronRight,
	Layers3,
	Plus,
	RotateCcw,
	Target,
	ListChecks,
	Shuffle,
} from "lucide-react";
import {
	createNotebook,
	getNotebookDetail,
	getNotebookOverview,
} from "../../services/notebookService";
import "./NotebookPage.css";

const notebookValue = (item) => String(item?.item?.meaning || item?.item?.subtitle || "").trim();

const normalize = (value) => String(value || "").trim().toLowerCase();

const NotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [overview, setOverview] = useState({ myNotebooks: [], discoverNotebooks: [] });
	const [selectedNotebook, setSelectedNotebook] = useState(null);
	const [selectedNotebookDetail, setSelectedNotebookDetail] = useState(null);
	const [pageMessage, setPageMessage] = useState("");
	const [createName, setCreateName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);
	const [activeMode, setActiveMode] = useState("flashcard");
	const [flashIndex, setFlashIndex] = useState(0);
	const [flashRevealed, setFlashRevealed] = useState(false);
	const [quizIndex, setQuizIndex] = useState(0);
	const [quizAnswer, setQuizAnswer] = useState("");
	const [quizFeedback, setQuizFeedback] = useState("");
	const [miniAnswers, setMiniAnswers] = useState({});
	const [miniSubmitted, setMiniSubmitted] = useState(false);

	const activeItems = selectedNotebookDetail?.items || [];
	const miniItems = useMemo(() => activeItems.slice(0, 5), [activeItems]);
	const flashItem = activeItems.length ? activeItems[flashIndex % activeItems.length] : null;
	const quizItem = activeItems.length ? activeItems[quizIndex % activeItems.length] : null;

	useEffect(() => {
		const loadOverview = async () => {
			setLoading(true);
			const res = await getNotebookOverview(8);
			if (res && res.errCode === 0) {
				const payload = {
					myNotebooks: Array.isArray(res.myNotebooks) ? res.myNotebooks : [],
					discoverNotebooks: Array.isArray(res.discoverNotebooks) ? res.discoverNotebooks : [],
				};
				setOverview(payload);
				const firstNotebook = payload.myNotebooks[0] || payload.discoverNotebooks[0] || null;
				setSelectedNotebook(firstNotebook);
				if (firstNotebook) {
					const detail = await getNotebookDetail(firstNotebook.id);
					if (detail?.errCode === 0) {
						setSelectedNotebookDetail(detail.notebook);
					}
				}
				setPageMessage("");
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setPageMessage(res?.errMessage || "Không tải được sổ tay.");
			}
			setLoading(false);
		};

		loadOverview();
	}, [history]);

	useEffect(() => {
		setFlashIndex(0);
		setFlashRevealed(false);
		setQuizIndex(0);
		setQuizAnswer("");
		setQuizFeedback("");
		setMiniAnswers({});
		setMiniSubmitted(false);
	}, [selectedNotebookDetail?.id]);

	const selectNotebook = async (notebook) => {
		setSelectedNotebook(notebook);
		setLoading(true);
		const detail = await getNotebookDetail(notebook.id);
		if (detail && detail.errCode === 0) {
			setSelectedNotebookDetail(detail.notebook);
			setPageMessage("");
		} else {
			setPageMessage(detail?.errMessage || "Không mở được sổ tay.");
		}
		setLoading(false);
	};

	const handleCreateNotebook = async () => {
		const name = createName.trim();
		if (!name) {
			setPageMessage("Nhập tên sổ tay trước khi tạo.");
			return;
		}

		setCreateLoading(true);
		const created = await createNotebook({ name });
		if (created && created.errCode === 0 && created.notebook) {
			setCreateName("");
			setPageMessage("Đã tạo sổ tay mới.");
			const refreshed = await getNotebookOverview(8);
			if (refreshed?.errCode === 0) {
				const payload = {
					myNotebooks: Array.isArray(refreshed.myNotebooks) ? refreshed.myNotebooks : [],
					discoverNotebooks: Array.isArray(refreshed.discoverNotebooks) ? refreshed.discoverNotebooks : [],
				};
				setOverview(payload);
				await selectNotebook(created.notebook);
			}
		} else if (created?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setPageMessage(created?.errMessage || "Không tạo được sổ tay.");
		}
		setCreateLoading(false);
	};

	const handleFlashNext = () => {
		if (!activeItems.length) return;
		setFlashIndex((prev) => (prev + 1) % activeItems.length);
		setFlashRevealed(false);
	};

	const handleQuizCheck = () => {
		if (!quizItem) return;
		const expected = normalize(notebookValue(quizItem));
		const given = normalize(quizAnswer);
		if (!expected) {
			setQuizFeedback("Chưa có dữ liệu để kiểm tra.");
			return;
		}
		if (given && (expected.includes(given) || given.includes(expected))) {
			setQuizFeedback("Đúng rồi.");
		} else {
			setQuizFeedback(`Đáp án: ${notebookValue(quizItem)}`);
		}
	};

	const handleQuizNext = () => {
		if (!activeItems.length) return;
		setQuizIndex((prev) => (prev + 1) % activeItems.length);
		setQuizAnswer("");
		setQuizFeedback("");
	};

	const miniScore = miniItems.reduce((score, item) => {
		const expected = normalize(notebookValue(item));
		const given = normalize(miniAnswers[item.id]);
		if (!expected || !given) {
			return score;
		}
		return score + Number(expected.includes(given) || given.includes(expected));
	}, 0);

	return (
		<div className="notebook-page">
			<section className="notebook-hero">
				<div className="notebook-hero-copy">
					<div className="notebook-kicker">
						<BookOpen size={16} />
						<span>Notebook</span>
					</div>
					<h1>Sổ tay học tập</h1>
					<p>
						Lưu từ vựng, kanji và ngữ pháp vào từng sổ tay riêng, rồi học lại bằng
						flashcard, quizz và mini test ngay trong một màn hình.
					</p>
					<div className="notebook-hero-actions">
						<button type="button" onClick={() => history.push("/")}>Quay về trang chủ</button>
					</div>
				</div>
				<div className="notebook-hero-card">
					<h2>Tạo sổ tay mới</h2>
					<p>Nhập tên và bắt đầu lưu các mục từ dictionary, kanji hoặc ngữ pháp.</p>
					<div className="notebook-create-row">
						<input
							type="text"
							placeholder="Tên sổ tay"
							value={createName}
							onChange={(event) => setCreateName(event.target.value)}
						/>
						<button type="button" onClick={handleCreateNotebook} disabled={createLoading}>
							<Plus size={16} />
							<span>{createLoading ? "Đang tạo..." : "Tạo sổ tay"}</span>
						</button>
					</div>
				</div>
			</section>

			{pageMessage && <div className="notebook-message">{pageMessage}</div>}

			<section className="notebook-sections">
				<div className="notebook-section">
					<div className="section-head">
						<h2>Sổ tay của tôi</h2>
						<span>{overview.myNotebooks.length}</span>
					</div>
					<div className="notebook-grid">
						{overview.myNotebooks.map((notebook) => (
							<button
								type="button"
								className={`notebook-card ${selectedNotebook?.id === notebook.id ? "active" : ""}`}
								key={notebook.id}
								onClick={() => selectNotebook(notebook)}
							>
								<h3>{notebook.name}</h3>
								<p>{notebook.description || "Chưa có mô tả"}</p>
								<small>{notebook.itemsCount} mục</small>
							</button>
						))}
						{!overview.myNotebooks.length && !loading && (
							<div className="notebook-empty-card">Chưa có sổ tay nào.</div>
						)}
					</div>
				</div>

				<div className="notebook-section">
					<div className="section-head">
						<h2>Khám phá</h2>
						<span>{overview.discoverNotebooks.length}</span>
					</div>
					<div className="notebook-grid discover-grid">
						{overview.discoverNotebooks.map((notebook) => (
							<button
								type="button"
								className={`notebook-card discover ${selectedNotebook?.id === notebook.id ? "active" : ""}`}
								key={notebook.id}
								onClick={() => selectNotebook(notebook)}
							>
								<div className="discover-owner">
									<span>{notebook.owner?.username || "Ẩn danh"}</span>
									<ChevronRight size={14} />
								</div>
								<h3>{notebook.name}</h3>
								<p>{notebook.description || "Sổ tay nổi bật"}</p>
								<small>{notebook.itemsCount} mục</small>
							</button>
						))}
						{!overview.discoverNotebooks.length && !loading && (
							<div className="notebook-empty-card">Chưa có sổ tay để khám phá.</div>
						)}
					</div>
				</div>
			</section>

			<section className="notebook-workbench">
				<div className="workbench-head">
					<div>
						<h2>{selectedNotebookDetail?.name || "Chọn một sổ tay"}</h2>
						<p>{selectedNotebookDetail?.description || "Mở sổ tay để xem danh sách từ và chế độ học."}</p>
					</div>
					<div className="workbench-meta">
						<span>{activeItems.length} mục</span>
						<span>{selectedNotebookDetail?.owner?.username || selectedNotebook?.owner?.username || "Bạn"}</span>
					</div>
				</div>

				<div className="mode-tabs">
					<button type="button" className={activeMode === "flashcard" ? "active" : ""} onClick={() => setActiveMode("flashcard")}>
						<Layers3 size={16} />
						<span>Flashcard</span>
					</button>
					<button type="button" className={activeMode === "quiz" ? "active" : ""} onClick={() => setActiveMode("quiz")}>
						<Brain size={16} />
						<span>Quizz</span>
					</button>
					<button type="button" className={activeMode === "mini" ? "active" : ""} onClick={() => setActiveMode("mini")}>
						<Target size={16} />
						<span>Mini Test</span>
					</button>
				</div>

				{loading && <div className="workbench-empty">Đang tải sổ tay...</div>}

				{!loading && (
					<>
						{activeMode === "flashcard" && (
							<div className="mode-panel flashcard-panel">
								{flashItem ? (
									<>
										<div className="flashcard-card">
											<div className="flashcard-label">{flashItem.item?.type || "item"}</div>
											<h3>{flashItem.item?.title || "Không có tiêu đề"}</h3>
											<p>{flashRevealed ? notebookValue(flashItem) : "Nhấn để xem đáp án"}</p>
										</div>
										<div className="mode-actions">
											<button type="button" onClick={() => setFlashRevealed((prev) => !prev)}>
												{flashRevealed ? "Ẩn đáp án" : "Lật thẻ"}
											</button>
											<button type="button" onClick={handleFlashNext}>
												<RotateCcw size={16} />
												<span>Thẻ tiếp</span>
											</button>
										</div>
									</>
								) : (
									<div className="workbench-empty">Sổ tay này chưa có mục nào.</div>
								)}
							</div>
						)}

						{activeMode === "quiz" && (
							<div className="mode-panel quiz-panel">
								{quizItem ? (
									<>
										<div className="quiz-card">
											<div className="quiz-question">Hãy đoán nghĩa của:</div>
											<h3>{quizItem.item?.title || "Mục hiện tại"}</h3>
											<p>{quizItem.item?.subtitle || ""}</p>
											<input
												type="text"
												placeholder="Nhập đáp án"
												value={quizAnswer}
												onChange={(event) => setQuizAnswer(event.target.value)}
											/>
											{quizFeedback && <div className="quiz-feedback">{quizFeedback}</div>}
										</div>
										<div className="mode-actions">
											<button type="button" onClick={handleQuizCheck}>Kiểm tra</button>
											<button type="button" onClick={handleQuizNext}>
												<ChevronRight size={16} />
												<span>Câu tiếp</span>
											</button>
										</div>
									</>
								) : (
									<div className="workbench-empty">Sổ tay này chưa có mục nào.</div>
								)}
							</div>
						)}

						{activeMode === "mini" && (
							<div className="mode-panel mini-panel">
								{miniItems.length ? (
									<>
										<div className="mini-head">
											<Shuffle size={16} />
											<span>Làm nhanh 5 câu từ notebook hiện tại</span>
										</div>
										<div className="mini-list">
											{miniItems.map((item, index) => (
												<label key={item.id} className="mini-item">
													<div>
														<strong>{index + 1}. {item.item?.title}</strong>
														<p>{item.item?.subtitle || item.item?.meaning}</p>
													</div>
													<input
														type="text"
														placeholder="Đáp án ngắn"
														value={miniAnswers[item.id] || ""}
														onChange={(event) =>
															setMiniAnswers((prev) => ({ ...prev, [item.id]: event.target.value }))
														}
													/>
												</label>
											))}
										</div>
										<div className="mode-actions">
											<button type="button" onClick={() => setMiniSubmitted(true)}>
												<ListChecks size={16} />
												<span>Chấm điểm</span>
											</button>
											<div className="mini-score">{miniSubmitted ? `${miniScore}/${miniItems.length}` : "Chưa chấm"}</div>
										</div>
									</>
								) : (
									<div className="workbench-empty">Sổ tay này chưa có mục nào.</div>
								)}
							</div>
						)}
					</>
				)}
			</section>
		</div>
	);
};

export default NotebookPage;
