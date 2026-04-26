import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import {
	ChevronLeft,
	ChevronRight,
	Download,
	Edit3,
	Filter,
	Play,
	RefreshCw,
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
import { evaluateQuizAnswer, generateQuiz, reviewFlashcard } from "../../services/quizService";
import "./NotebookDetailPage.css";

const chunkItems = (items, chunkSize = 2) => {
	const result = [];
	for (let i = 0; i < items.length; i += chunkSize) {
		result.push(items.slice(i, i + chunkSize));
	}
	return result;
};

const hasKanjiChar = (text) => /[\u4E00-\u9FFF]/.test(String(text || ""));
const hasJapaneseChar = (text) => /[\u3040-\u30FF\u4E00-\u9FFF]/.test(String(text || ""));
const WORDS_PER_PAGE = 10;

const NotebookDetailPage = () => {
	const history = useHistory();
	const location = useLocation();
	const { id } = useParams();
	const { user } = useContext(UserContext);
	const [loading, setLoading] = useState(true);
	const [notebook, setNotebook] = useState(null);
	const [orderedItems, setOrderedItems] = useState([]);
	const [message, setMessage] = useState("");
	const [loadError, setLoadError] = useState(false);
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
	const [quizQuestionMode, setQuizQuestionMode] = useState("auto");
	const [quizAnswerMode, setQuizAnswerMode] = useState("Multiple_Choice");
	const [quizWordIndex, setQuizWordIndex] = useState(0);
	const [quizData, setQuizData] = useState(null);
	const [quizAnswer, setQuizAnswer] = useState("");
	const [quizLoading, setQuizLoading] = useState(false);
	const [quizEvaluating, setQuizEvaluating] = useState(false);
	const [quizFeedback, setQuizFeedback] = useState(null);
	const [quizError, setQuizError] = useState("");
	const [quizStats, setQuizStats] = useState({ total: 0, correct: 0, wrong: 0 });
	const [miniTestCount, setMiniTestCount] = useState(5);
	const [miniTestSession, setMiniTestSession] = useState(null);
	const [miniTestQuestion, setMiniTestQuestion] = useState(null);
	const [miniTestAnswer, setMiniTestAnswer] = useState("");
	const [miniTestLoading, setMiniTestLoading] = useState(false);
	const [miniTestEvaluating, setMiniTestEvaluating] = useState(false);
	const [miniTestFeedback, setMiniTestFeedback] = useState(null);
	const [miniTestError, setMiniTestError] = useState("");
	const [isPlayingList, setIsPlayingList] = useState(false);
	const [flashcardReviewLoading, setFlashcardReviewLoading] = useState(false);
	const [flashcardFilter, setFlashcardFilter] = useState("unremembered");
	const playSessionRef = useRef({ active: false, token: 0 });
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
			setLoadError(false);
			const res = await getNotebookDetail(id);
			if (res?.errCode === 0 && res.notebook) {
				setNotebook(res.notebook);
				setOrderedItems(Array.isArray(res.notebook.items) ? res.notebook.items : []);
				setEditingName(res.notebook.name || "");
				setMessage("");
				setLoadError(false);
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setMessage(res?.errMessage || "Không tải được sổ tay");
				setLoadError(true);
			}
			setLoading(false);
		};

		load();
	}, [history, id]);

	useEffect(() => {
		if (!notebook?.id) {
			return;
		}
		setOrderedItems(Array.isArray(notebook.items) ? notebook.items : []);
	}, [notebook?.id, notebook?.items]);

	useEffect(() => {
		setFlashcardFilter("unremembered");
		setFlashIndex(0);
		setIsCardFlipped(false);
	}, [notebook?.id]);

	useEffect(() => {
		return () => {
			playSessionRef.current = { active: false, token: playSessionRef.current.token + 1 };
			if (window?.speechSynthesis) {
				window.speechSynthesis.cancel();
			}
		};
	}, []);

	const filteredItems = useMemo(() => {
		const rawItems = orderedItems || [];
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			return rawItems;
		}
		return rawItems.filter((entry) => {
			const title = String(entry?.item?.title || "").toLowerCase();
			const meaning = String(entry?.item?.meaning || "").toLowerCase();
			return title.includes(keyword) || meaning.includes(keyword);
		});
	}, [orderedItems, searchKeyword]);

	const quizItems = useMemo(() => {
		return filteredItems.filter(
			(entry) => ["word", "kanji", "grammar"].includes(entry?.itemType) && entry?.item?.id
		);
	}, [filteredItems]);

	const flashItems = useMemo(() => {
		return filteredItems.filter((entry) => Boolean(entry?.item?.title));
	}, [filteredItems]);

	const flashcardItems = useMemo(() => {
		return flashItems.filter((entry) => {
			const remembered = Boolean(entry?.isRemembered);
			if (flashcardFilter === "remembered") {
				return remembered;
			}
			if (flashcardFilter === "all") {
				return true;
			}
			return !remembered;
		});
	}, [flashItems, flashcardFilter]);

	const activeFlashItem =
		flashcardItems.length > 0 ? flashcardItems[flashIndex % flashcardItems.length] : null;
	const canGoPrevFlash = flashIndex > 0;
	const canGoNextFlash = flashIndex < flashcardItems.length - 1;

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
		if (!flashcardItems.length) {
			setFlashIndex(0);
			setIsCardFlipped(false);
			return;
		}
		if (flashIndex > flashcardItems.length - 1) {
			setFlashIndex(flashcardItems.length - 1);
			setIsCardFlipped(false);
		}
	}, [flashcardItems.length, flashIndex]);

	useEffect(() => {
		setQuizWordIndex(0);
		setQuizData(null);
		setQuizAnswer("");
		setQuizFeedback(null);
		setQuizError("");
		setQuizStats({ total: 0, correct: 0, wrong: 0 });
		setMiniTestSession(null);
		setMiniTestQuestion(null);
		setMiniTestAnswer("");
		setMiniTestFeedback(null);
		setMiniTestError("");
	}, [notebook?.id, searchKeyword]);

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
		if (!flashcardItems.length || !canGoPrevFlash) {
			return;
		}
		setFlashIndex((prev) => Math.max(0, prev - 1));
		setIsCardFlipped(false);
	};

	const handleNextFlash = () => {
		if (!flashcardItems.length || !canGoNextFlash) {
			return;
		}
		setFlashIndex((prev) => Math.min(flashcardItems.length - 1, prev + 1));
		setIsCardFlipped(false);
	};

	const advanceFlashcard = () => {
		if (!flashcardItems.length) {
			return;
		}
		setFlashIndex((prev) => Math.min(flashcardItems.length - 1, prev + 1));
		setIsCardFlipped(false);
	};

	const gotoFirstPage = () => setCurrentPage(1);
	const gotoPreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
	const gotoNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));
	const gotoLastPage = () => setCurrentPage(totalPages);

	const stopReadingList = () => {
		playSessionRef.current = { active: false, token: playSessionRef.current.token + 1 };
		if (window?.speechSynthesis) {
			window.speechSynthesis.cancel();
		}
		setIsPlayingList(false);
	};

	const handleDownloadVisibleWords = () => {
		if (!filteredItems.length) {
			setMessage("Không có từ nào để tải xuống.");
			return;
		}

		const text = filteredItems
			.map((entry, index) => {
				const title = entry?.item?.title || "";
				const subtitle = entry?.item?.subtitle || "";
				const meaning = entry?.item?.meaning || "";
				const line = [title, subtitle, meaning].filter(Boolean).join(" | ");
				return `${index + 1}. ${line || "-"}`;
			})
			.join("\n");

		const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");
		const safeName = String(notebook?.name || `notebook-${id}`)
			.trim()
			.replace(/[^a-zA-Z0-9-_\s]/g, "")
			.replace(/\s+/g, "-")
			.toLowerCase();

		link.href = url;
		link.download = `${safeName || `notebook-${id}`}-visible-words.txt`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		window.URL.revokeObjectURL(url);
	};

	const handlePlayVisibleWords = () => {
		if (!filteredItems.length) {
			setMessage("Không có từ nào để đọc.");
			return;
		}

		if (!window?.speechSynthesis) {
			setMessage("Trình duyệt chưa hỗ trợ chức năng phát âm tự động.");
			return;
		}

		if (isPlayingList) {
			stopReadingList();
			return;
		}

		window.speechSynthesis.cancel();
		const token = playSessionRef.current.token + 1;
		playSessionRef.current = { active: true, token };
		setIsPlayingList(true);

		const speakNext = (index) => {
			if (!playSessionRef.current.active || playSessionRef.current.token !== token) {
				return;
			}

			if (index >= filteredItems.length) {
				setIsPlayingList(false);
				playSessionRef.current = { active: false, token };
				return;
			}

			const current = filteredItems[index];
			const text = current?.item?.title || current?.item?.subtitle || current?.item?.meaning || "";
			if (!text) {
				speakNext(index + 1);
				return;
			}

			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = hasJapaneseChar(text) ? "ja-JP" : "vi-VN";
			utterance.rate = 0.92;
			utterance.onend = () => speakNext(index + 1);
			utterance.onerror = () => speakNext(index + 1);
			window.speechSynthesis.speak(utterance);
		};

		speakNext(0);
	};

	const handleFlashcardReview = async (action) => {
		if (!activeFlashItem?.itemType || !activeFlashItem?.itemId) {
			return;
		}

		setFlashcardReviewLoading(true);
		setMessage("");

		const res = await reviewFlashcard({
			itemType: activeFlashItem.itemType,
			itemId: activeFlashItem.itemId,
			action,
		});

		if (res?.errCode === 0) {
			const isRemembered = Boolean(res?.data?.isRemembered ?? (action === "known"));
			const removedFromCurrentFilter =
				(flashcardFilter === "unremembered" && isRemembered) ||
				(flashcardFilter === "remembered" && !isRemembered);
			setOrderedItems((prev) =>
				(prev || []).map((entry) => {
					if (entry.id !== activeFlashItem.id) {
						return entry;
					}
					return {
						...entry,
						isRemembered,
						reviewState: isRemembered ? "remembered" : "unremembered",
					};
				})
			);
			setNotebook((prev) => {
				if (!prev?.items) {
					return prev;
				}
				return {
					...prev,
					items: (prev.items || []).map((entry) => {
						if (entry.id !== activeFlashItem.id) {
							return entry;
						}
						return {
							...entry,
							isRemembered,
							reviewState: isRemembered ? "remembered" : "unremembered",
						};
					}),
				};
			});
			if (!removedFromCurrentFilter) {
				advanceFlashcard();
			}
		} else {
			setMessage(res?.errMessage || "Không cập nhật được trạng thái flashcard.");
		}

		setFlashcardReviewLoading(false);
	};

	const handleShuffleVisibleWords = () => {
		if (filteredItems.length < 2) {
			setMessage("Cần ít nhất 2 từ để trộn thứ tự.");
			return;
		}

		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			setOrderedItems((prev) => shuffleArray(prev));
			setCurrentPage(1);
			return;
		}

		setOrderedItems((prev) => {
			const matched = [];
			const unmatched = [];

			(prev || []).forEach((entry) => {
				const title = String(entry?.item?.title || "").toLowerCase();
				const meaning = String(entry?.item?.meaning || "").toLowerCase();
				if (title.includes(keyword) || meaning.includes(keyword)) {
					matched.push(entry);
				} else {
					unmatched.push(entry);
				}
			});

			return [...shuffleArray(matched), ...unmatched];
		});
		setCurrentPage(1);
	};

	const toggleFieldVisibility = (field) => {
		setFieldVisibility((prev) => ({
			...prev,
			[field]: !prev[field],
		}));
	};

	const activeQuizEntry = quizItems.length
		? quizItems[quizWordIndex % quizItems.length]
		: null;

	const getSupportedModesByEntry = (entry) => {
		if (!entry?.itemType) {
			return ["meaning"];
		}

		if (entry.itemType === "word") {
			const title = entry.item?.title || "";
			if (hasKanjiChar(title)) {
				return ["meaning", "reading", "kanji"];
			}
			return ["meaning"];
		}

		if (entry.itemType === "kanji") {
			return ["meaning", "kanji", "reading"];
		}

		return ["meaning", "grammar"];
	};

	const buildMiniTestQuestions = (entries, requestedCount) => {
		const count = Math.max(1, Math.min(Number(requestedCount) || 5, 20));
		const pool = [];

		entries.forEach((entry) => {
			const supportedModes = getSupportedModesByEntry(entry);
			const modes = quizQuestionMode === "auto"
				? supportedModes
				: supportedModes.includes(quizQuestionMode)
				? [quizQuestionMode]
				: [supportedModes[0]];

			modes.forEach((mode) => {
				pool.push({ entry, preferredMode: mode });
			});
		});

		const shuffledPool = shuffleArray(pool);
		if (!shuffledPool.length) {
			return [];
		}

		if (shuffledPool.length >= count) {
			return shuffledPool.slice(0, count);
		}

		const expanded = [...shuffledPool];
		while (expanded.length < count) {
			expanded.push(shuffledPool[expanded.length % shuffledPool.length]);
		}
		return expanded;
	};

	const shuffleArray = (list) => {
		const arr = [...list];
		for (let i = arr.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	};

	const loadQuizQuestionByEntry = async (entry, preferredMode = quizQuestionMode) => {
		if (!entry?.item?.id) {
			return;
		}

		setQuizLoading(true);
		setQuizError("");
		setQuizFeedback(null);
		setQuizAnswer("");

		const res = await generateQuiz({
			itemType: entry.itemType,
			itemId: entry.item.id,
			wordId: entry.itemType === "word" ? entry.item.id : undefined,
			mode: preferredMode === "auto" ? undefined : preferredMode,
			quizMode: quizAnswerMode,
		});

		if (res?.errCode === 0) {
			setQuizData(res.data);
		} else {
			setQuizData(null);
			setQuizError(res?.errMessage || "Không tạo được câu hỏi.");
		}

		setQuizLoading(false);
	};

	useEffect(() => {
		if (activeMode !== "quiz" || !activeQuizEntry) {
			return;
		}

		setQuizData(null);
		setQuizAnswer("");
		setQuizFeedback(null);
		setQuizError("");
		loadQuizQuestionByEntry(activeQuizEntry);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMode, activeQuizEntry?.item?.id, activeQuizEntry?.itemType, quizQuestionMode, quizAnswerMode]);

	const handleGenerateQuizForNotebook = async () => {
		if (!activeQuizEntry) {
			setQuizError("Notebook chưa có mục học tập để tạo quiz.");
			return;
		}

		setQuizData(null);
		setQuizFeedback(null);
		await loadQuizQuestionByEntry(activeQuizEntry);
	};

	const handleEvaluateNotebookQuiz = async () => {
		if (!quizData?.itemId || !quizData?.itemType || !quizData?.mode) {
			return;
		}
		if (!quizAnswer.trim()) {
			setQuizError("Vui lòng nhập hoặc chọn đáp án.");
			return;
		}

		setQuizEvaluating(true);
		setQuizError("");

		const res = await evaluateQuizAnswer({
			itemType: quizData.itemType,
			itemId: quizData.itemId,
			wordId: quizData.wordId,
			userAnswer: quizAnswer,
			mode: quizData.mode,
		});

		if (res?.errCode === 0) {
			setQuizFeedback(res.data);
			setQuizStats((prev) => ({
				total: prev.total + 1,
				correct: prev.correct + (res.data.isCorrect ? 1 : 0),
				wrong: prev.wrong + (res.data.isCorrect ? 0 : 1),
			}));
		} else {
			setQuizFeedback(null);
			setQuizError(res?.errMessage || "Không chấm được đáp án.");
		}

		setQuizEvaluating(false);
	};

	const goToPrevQuizWord = () => {
		if (!quizItems.length) return;
		setQuizWordIndex((prev) => (prev - 1 + quizItems.length) % quizItems.length);
		setQuizData(null);
		setQuizAnswer("");
		setQuizFeedback(null);
		setQuizError("");
	};

	const goToNextQuizWord = () => {
		if (!quizItems.length) return;
		setQuizWordIndex((prev) => (prev + 1) % quizItems.length);
		setQuizData(null);
		setQuizAnswer("");
		setQuizFeedback(null);
		setQuizError("");
	};

	const loadMiniTestQuestion = async (questionItem) => {
		const entry = questionItem?.entry;
		if (!entry?.item?.id) {
			setMiniTestQuestion(null);
			setMiniTestError("Không có dữ liệu để tạo câu hỏi mini test.");
			return;
		}

		setMiniTestLoading(true);
		setMiniTestError("");
		setMiniTestFeedback(null);
		setMiniTestAnswer("");

		const res = await generateQuiz({
			itemType: entry.itemType,
			itemId: entry.item.id,
			wordId: entry.itemType === "word" ? entry.item.id : undefined,
			mode: questionItem?.preferredMode,
			quizMode: quizAnswerMode,
		});

		if (res?.errCode === 0) {
			setMiniTestQuestion(res.data);
		} else {
			setMiniTestQuestion(null);
			setMiniTestError(res?.errMessage || "Không tạo được câu hỏi mini test.");
		}

		setMiniTestLoading(false);
	};

	const handleStartMiniTest = async () => {
		if (!quizItems.length) {
			setMiniTestError("Notebook chưa có mục học tập để làm mini test.");
			return;
		}

		const selectedEntries = shuffleArray(quizItems);
		const questions = buildMiniTestQuestions(selectedEntries, miniTestCount);

		if (!questions.length) {
			setMiniTestError("Không tạo được bộ câu hỏi mini test từ dữ liệu hiện tại.");
			return;
		}

		const newSession = {
			questions,
			index: 0,
			score: 0,
			answers: [],
		};

		setMiniTestSession(newSession);
		setMiniTestFeedback(null);
		await loadMiniTestQuestion(questions[0]);
	};

	const handleSkipMiniTestQuestion = async () => {
		if (!miniTestSession || !miniTestQuestion?.itemId) {
			return;
		}

		const nextIndex = miniTestSession.index + 1;
		const updatedAnswers = [
			...miniTestSession.answers,
			{
				itemType: miniTestQuestion.itemType,
				itemId: miniTestQuestion.itemId,
				mode: miniTestQuestion.mode,
				isCorrect: false,
				skipped: true,
				userAnswer: "",
			},
		];

		setMiniTestFeedback({
			isCorrect: false,
			skipped: true,
			message: "Đã bỏ qua câu này.",
		});
		setMiniTestSession((prev) => ({
			...prev,
			index: nextIndex,
			answers: updatedAnswers,
		}));

		if (nextIndex < miniTestSession.questions.length) {
			await loadMiniTestQuestion(miniTestSession.questions[nextIndex]);
		} else {
			setMiniTestQuestion(null);
			setMiniTestAnswer("");
		}
	};

	const handleSubmitMiniTestAnswer = async () => {
		if (!miniTestSession || !miniTestQuestion?.itemId || !miniTestQuestion?.itemType || !miniTestQuestion?.mode) {
			return;
		}
		if (!miniTestAnswer.trim()) {
			setMiniTestError("Vui lòng nhập hoặc chọn đáp án.");
			return;
		}

		setMiniTestEvaluating(true);
		setMiniTestError("");

		const res = await evaluateQuizAnswer({
			itemType: miniTestQuestion.itemType,
			itemId: miniTestQuestion.itemId,
			wordId: miniTestQuestion.wordId,
			userAnswer: miniTestAnswer,
			mode: miniTestQuestion.mode,
		});

		if (res?.errCode !== 0) {
			setMiniTestError(res?.errMessage || "Không chấm được câu trả lời mini test.");
			setMiniTestEvaluating(false);
			return;
		}

		const result = res.data;
		setMiniTestFeedback(result);

		const nextIndex = miniTestSession.index + 1;
		const updatedAnswers = [
			...miniTestSession.answers,
			{
				itemType: miniTestQuestion.itemType,
				itemId: miniTestQuestion.itemId,
				mode: miniTestQuestion.mode,
				isCorrect: Boolean(result.isCorrect),
				correctAnswer: result.correctAnswer,
				userAnswer: miniTestAnswer,
			},
		];

		const updatedSession = {
			...miniTestSession,
			index: nextIndex,
			score: miniTestSession.score + (result.isCorrect ? 1 : 0),
			answers: updatedAnswers,
		};

		setMiniTestSession(updatedSession);

		if (nextIndex < miniTestSession.questions.length) {
			await loadMiniTestQuestion(miniTestSession.questions[nextIndex]);
		} else {
			setMiniTestQuestion(null);
			setMiniTestAnswer("");
		}

		setMiniTestEvaluating(false);
	};

	const miniTestAnsweredCount = miniTestSession?.answers?.length || 0;
	const miniTestCorrectCount = miniTestSession?.answers?.filter((item) => item.isCorrect).length || 0;
	const miniTestSkippedCount = miniTestSession?.answers?.filter((item) => item.skipped).length || 0;
	const miniTestAccuracy = miniTestAnsweredCount
		? Math.round((miniTestCorrectCount / miniTestAnsweredCount) * 100)
		: 0;
	const quizAccuracy = quizStats.total ? Math.round((quizStats.correct / quizStats.total) * 100) : 0;

	const returnToNotebookOverview = () => {
		stopReadingList();
		setActiveMode("list");
		setIsFlashcardView(false);
		setQuizData(null);
		setQuizAnswer("");
		setQuizFeedback(null);
		setQuizError("");
		setMiniTestSession(null);
		setMiniTestQuestion(null);
		setMiniTestAnswer("");
		setMiniTestFeedback(null);
		setMiniTestError("");
		setFlashIndex(0);
		setIsCardFlipped(false);
		setFlashcardFilter("unremembered");
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
					<button type="button" className="breadcrumb-link-btn breadcrumb-current-btn" onClick={returnToNotebookOverview}>
						{notebook?.name || "..."}
					</button>
				</div>

				<section className="notebook-detail-hero">
					<div className="hero-title-wrap">
						<p className="hero-kicker">Notebook Detail</p>
						<h1>{notebook?.name || "Sổ tay"}</h1>
						<p>
							{notebook?.itemsCount || 0} mục học tập. Bạn có thể chuyển nhanh giữa danh sách, flashcard,
							quiz và mini test.
						</p>
						<div className="hero-chip-row">
							<span>Danh sách</span>
							<span>FlashCard</span>
							<span>Quiz</span>
							<span>Mini Test</span>
						</div>
					</div>
					<div className="hero-badges">
						<div className="hero-badge-card">
							<span>Số mục</span>
							<strong>{notebook?.itemsCount || 0}</strong>
						</div>
						<div className="hero-badge-card">
							<span>Từ đang lọc</span>
							<strong>{filteredItems.length}</strong>
						</div>
						<div className="hero-badge-card">
							<span>Quyền chỉnh sửa</span>
							<strong>{isOwner ? "Chủ sở hữu" : "Chỉ xem"}</strong>
						</div>
					</div>
				</section>

				<div className="notebook-detail-main">
					<div className="notebook-detail-left">
						<div className="notebook-mode-tabs">
							<button
								type="button"
								className={activeMode === "list" && !isFlashcardView ? "active" : ""}
								onClick={() => {
									setActiveMode("list");
									setIsFlashcardView(false);
								}}
							>
								List
							</button>
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
								Quiz
							</button>
							{/* <button
								type="button"
								className={activeMode === "practice" ? "active" : ""}
								onClick={() => {
									setActiveMode("practice");
									setIsFlashcardView(false);
								}}
							>
								Luyện nói, viết
							</button> */}
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

						<div className="mode-banner">
							<div>
								<span className="mode-banner-label">Chế độ đang mở</span>
								<strong>
									{activeMode === "flashcard"
										? "FlashCard"
										: activeMode === "quiz"
										? "Quiz"
										: activeMode === "mini-test"
										? "Mini Test"
										: "Danh sách"}
								</strong>
							</div>
							<p>Giữ các công cụ học tập ở ngay trong cùng một không gian để chuyển chế độ nhanh hơn.</p>
						</div>

						{isFlashcardView ? (
							<div className="flashcard-mode-panel">
								<div className="flashcard-mode-header">
									<h2>Từ vựng</h2>
									<div className="flashcard-mode-actions">
										<div className="flashcard-filter-group">
											<button
												type="button"
												className={flashcardFilter === "unremembered" ? "tiny-btn is-active" : "tiny-btn"}
												onClick={() => {
													setFlashcardFilter("unremembered");
													setFlashIndex(0);
													setIsCardFlipped(false);
												}}
												title="Chỉ hiện từ chưa nhớ"
											>
												Chưa nhớ
											</button>
											<button
												type="button"
												className={flashcardFilter === "remembered" ? "tiny-btn is-active" : "tiny-btn"}
												onClick={() => {
													setFlashcardFilter("remembered");
													setFlashIndex(0);
													setIsCardFlipped(false);
												}}
												title="Chỉ hiện từ đã nhớ"
											>
												Đã nhớ
											</button>
											<button
												type="button"
												className={flashcardFilter === "all" ? "tiny-btn is-active" : "tiny-btn"}
												onClick={() => {
													setFlashcardFilter("all");
													setFlashIndex(0);
													setIsCardFlipped(false);
												}}
												title="Hiện toàn bộ từ"
											>
												Toàn bộ
											</button>
										</div>
										<button type="button" className="tiny-btn"><Settings size={18} /></button>
									</div>
								</div>

								<div className="flashcard-board">
									{loading && <div className="word-loading">Đang tải sổ tay...</div>}
									{message && !loading && <div className="word-message">{message}</div>}
									{!loading && !loadError && !flashcardItems.length && (
										<div className="word-empty">Không có từ phù hợp với bộ lọc flashcard này.</div>
									)}

									{!loading && Boolean(activeFlashItem) && (
										<div className="flashcard-stage">
											<button
												type="button"
												className="nav-arrow left"
												onClick={handlePrevFlash}
												disabled={!canGoPrevFlash}
											>
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

											<button
												type="button"
												className="nav-arrow right"
												onClick={handleNextFlash}
												disabled={!canGoNextFlash}
											>
												<ChevronRight size={24} />
											</button>
										</div>
									)}
								</div>

								{Boolean(activeFlashItem) && (
									<div className="flashcard-bottom-actions">
										<div className="flash-progress">
											{flashcardItems.length ? `${flashIndex + 1}/${flashcardItems.length}` : "0/0"}
										</div>
										<button type="button" className="flip-btn" onClick={() => setIsCardFlipped((prev) => !prev)}>
											Mặt sau
										</button>
										<div className="learning-state-row">
											<button
												type="button"
												className="known-btn"
												onClick={() => handleFlashcardReview("known")}
												disabled={flashcardReviewLoading}
											>
												{flashcardReviewLoading ? "Đang lưu..." : "Đã thuộc"}
											</button>
											<button
												type="button"
												className="unknown-btn"
												onClick={() => handleFlashcardReview("unknown")}
												disabled={flashcardReviewLoading}
											>
												{flashcardReviewLoading ? "Đang lưu..." : "Chưa thuộc"}
											</button>
										</div>
									</div>
								)}
							</div>
						) : activeMode === "quiz" ? (
							<div className="notebook-word-panel">
								<div className="quiz-notebook-head">
									<div className="quiz-mode-picks">
										<select
											value={quizQuestionMode}
											onChange={(event) => setQuizQuestionMode(event.target.value)}
										>
											<option value="auto">Tự chọn dạng</option>
											<option value="reading">Kanji - Cách đọc</option>
											<option value="meaning">Nghĩa tiếng Việt</option>
											<option value="kanji">Nhận diện mặt chữ</option>
											<option value="grammar">Nhận diện mẫu ngữ pháp</option>
										</select>
										<select
											value={quizAnswerMode}
											onChange={(event) => setQuizAnswerMode(event.target.value)}
										>
											<option value="Multiple_Choice">Trắc nghiệm</option>
											<option value="Typing">Gõ đáp án</option>
										</select>
									</div>
									<div className="quiz-word-nav">
										<button type="button" className="tiny-btn" onClick={goToPrevQuizWord}>
											<ChevronLeft size={18} />
										</button>
										<span>
											{quizItems.length ? `${quizWordIndex + 1}/${quizItems.length}` : "0/0"}
										</span>
										<button type="button" className="tiny-btn" onClick={goToNextQuizWord}>
											<ChevronRight size={18} />
										</button>
									</div>
								</div>

								<div className="quiz-summary-strip">
									<div>
										<span>Đã làm</span>
										<strong>{quizStats.total}</strong>
									</div>
									<div>
										<span>Đúng</span>
										<strong>{quizStats.correct}</strong>
									</div>
									<div>
										<span>Sai</span>
										<strong>{quizStats.wrong}</strong>
									</div>
									<div>
										<span>Tỉ lệ</span>
										<strong>{quizAccuracy}%</strong>
									</div>
								</div>

								<div className="word-list-body">
									{!activeQuizEntry ? (
										<div className="word-empty">Notebook chưa có mục học tập để luyện quiz.</div>
									) : (
										<div className="quiz-box">
											<div className="quiz-card-top">
												<p className="quiz-current-word">
													Mục hiện tại ({activeQuizEntry.itemType}): <strong>{activeQuizEntry.item?.title || "-"}</strong>
												</p>
												<p className="quiz-helper-text">
													Câu hỏi sẽ tự sinh lại khi đổi mục, đổi dạng câu hỏi hoặc đổi chế độ trả lời.
												</p>
											</div>
											<div className="quiz-action-row">
												<button
													type="button"
													className="quiz-reroll-btn"
													onClick={handleGenerateQuizForNotebook}
													disabled={quizLoading}
													title="Tạo câu hỏi mới"
												>
													<RefreshCw size={16} className={quizLoading ? "spinning" : ""} />
												</button>
												<span className="quiz-action-hint">Reroll câu hỏi</span>
											</div>

											{quizError && <p className="quiz-msg error">{quizError}</p>}

											{quizData && (
												<div className="quiz-question-card">
													<div className="quiz-question-head">
														<span>Dạng câu hỏi</span>
														<strong>{quizData.mode}</strong>
														<span className="quiz-mode-chip">{quizData.quizMode === "Typing" ? "Gõ đáp án" : "Trắc nghiệm"}</span>
													</div>
													<p className="quiz-question">{quizData.questionText}</p>
													{Array.isArray(quizData.options) && quizData.options.length > 0 ? (
														<div className="quiz-option-list">
															{quizData.options.map((option) => (
																<button
																	type="button"
																	key={option}
																	className={quizAnswer === option ? "active" : ""}
																	onClick={() => setQuizAnswer(option)}
																>
																	{option}
																</button>
															))}
														</div>
													) : (
														<input
															type="text"
															value={quizAnswer}
															onChange={(event) => setQuizAnswer(event.target.value)}
															placeholder="Nhập đáp án"
															className="quiz-answer-input"
														/>
													)}

													<button
														type="button"
														className="quiz-main-btn"
														onClick={handleEvaluateNotebookQuiz}
														disabled={quizEvaluating}
													>
														{quizEvaluating ? "Đang chấm..." : "Chấm điểm"}
													</button>

													{quizFeedback && (
														<div className={`quiz-result-box ${quizFeedback.isCorrect ? "ok" : "wrong"}`}>
															<p>{quizFeedback.isCorrect ? "Chính xác" : "Sai"}</p>
															{!quizFeedback.isCorrect && <p>Đáp án đúng: {quizFeedback.correctAnswer}</p>}
														</div>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							</div>
						) : activeMode === "mini-test" ? (
							<div className="notebook-word-panel">
								<div className="quiz-notebook-head">
									<div className="quiz-mode-picks">
										<select
											value={quizQuestionMode}
											onChange={(event) => setQuizQuestionMode(event.target.value)}
										>
											<option value="auto">Tự chọn dạng</option>
											<option value="reading">Kanji - Cách đọc</option>
											<option value="meaning">Nghĩa tiếng Việt</option>
											<option value="kanji">Nhận diện mặt chữ</option>
											<option value="grammar">Nhận diện mẫu ngữ pháp</option>
										</select>
										<select
											value={quizAnswerMode}
											onChange={(event) => setQuizAnswerMode(event.target.value)}
										>
											<option value="Multiple_Choice">Trắc nghiệm</option>
											<option value="Typing">Gõ đáp án</option>
										</select>
										<select
											value={miniTestCount}
											onChange={(event) => setMiniTestCount(Number(event.target.value))}
										>
											<option value={5}>5 câu</option>
											<option value={10}>10 câu</option>
											<option value={15}>15 câu</option>
										</select>
									</div>
									<button type="button" className="quiz-main-btn" onClick={handleStartMiniTest}>
										Bắt đầu Mini Test
									</button>
								</div>

								<div className="quiz-summary-strip mini-summary-strip">
									<div>
										<span>Đã làm</span>
										<strong>{miniTestAnsweredCount}</strong>
									</div>
									<div>
										<span>Đúng</span>
										<strong>{miniTestCorrectCount}/{miniTestSession?.questions?.length || miniTestCount}</strong>
									</div>
									<div>
										<span>Bỏ qua</span>
										<strong>{miniTestSkippedCount}</strong>
									</div>
									<div>
										<span>Tỉ lệ</span>
										<strong>{miniTestAccuracy}%</strong>
									</div>
								</div>

								<div className="word-list-body">
									{miniTestError && <p className="quiz-msg error">{miniTestError}</p>}
									{!miniTestSession && <div className="word-empty">Chọn cấu hình và bấm bắt đầu để làm bài.</div>}

									{miniTestSession && !miniTestQuestion && miniTestSession.index >= miniTestSession.questions.length && (
										<div className="mini-test-summary mini-test-complete-card">
											<p className="mini-test-complete-kicker">Mini Test Completed</p>
											<h3>Hoàn thành Mini Test</h3>
											<div className="mini-test-score-ring">
												<strong>{miniTestSession.score}</strong>
												<span>/{miniTestSession.questions.length} câu</span>
											</div>
											<div className="mini-test-metrics-grid">
												<div>
													<span>Đúng</span>
													<strong>{miniTestCorrectCount}/{miniTestSession.questions.length}</strong>
												</div>
												<div>
													<span>Bỏ qua</span>
													<strong>{miniTestSkippedCount}</strong>
												</div>
												<div>
													<span>Tỉ lệ đúng</span>
													<strong>{miniTestAccuracy}%</strong>
												</div>
											</div>
											<button type="button" className="quiz-main-btn mini-test-restart-btn" onClick={handleStartMiniTest}>
												Làm lại Mini Test
											</button>
										</div>
									)}

									{miniTestSession && miniTestQuestion && (
										<div className="quiz-question-card">
											<p className="quiz-current-word">
												Câu {miniTestSession.index + 1}/{miniTestSession.questions.length}
											</p>
											<p className="quiz-question">{miniTestQuestion.questionText}</p>

											{Array.isArray(miniTestQuestion.options) && miniTestQuestion.options.length > 0 ? (
												<div className="quiz-option-list">
													{miniTestQuestion.options.map((option) => (
														<button
															type="button"
															key={option}
															className={miniTestAnswer === option ? "active" : ""}
															onClick={() => setMiniTestAnswer(option)}
														>
															{option}
														</button>
													))}
												</div>
											) : (
												<input
													type="text"
													value={miniTestAnswer}
													onChange={(event) => setMiniTestAnswer(event.target.value)}
													placeholder="Nhập đáp án"
													className="quiz-answer-input"
												/>
											)}

											<button
												type="button"
												className="quiz-main-btn"
												onClick={handleSubmitMiniTestAnswer}
												disabled={miniTestLoading || miniTestEvaluating}
											>
												{miniTestLoading || miniTestEvaluating ? "Đang xử lý..." : "Nộp câu trả lời"}
											</button>
											<button type="button" className="quiz-secondary-btn" onClick={handleSkipMiniTestQuestion} disabled={miniTestLoading || miniTestEvaluating}>
												Bỏ qua
											</button>

											{miniTestFeedback && (
												<div className={`quiz-result-box ${miniTestFeedback.isCorrect ? "ok" : "wrong"}`}>
													<p>{miniTestFeedback.skipped ? "Đã bỏ qua" : miniTestFeedback.isCorrect ? "Đúng" : "Sai"}</p>
														{!miniTestFeedback.isCorrect && !miniTestFeedback.skipped && (
															<p>Đáp án đúng: {miniTestFeedback.correctAnswer}</p>
														)}
												</div>
											)}
										</div>
									)}
								</div>
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
										<button
											type="button"
											className="tiny-btn"
											title="Tải từ đang hiển thị"
											onClick={handleDownloadVisibleWords}
										>
											<Download size={16} />
										</button>
										{/* <button type="button" className="tiny-btn"><PlusCircle size={16} /></button> */}
										<button
											type="button"
											className={`tiny-btn ${isPlayingList ? "is-active" : ""}`}
											title={isPlayingList ? "Dừng đọc" : "Đọc lần lượt"}
											onClick={handlePlayVisibleWords}
										>
											<Play size={16} />
										</button>
										<button
											type="button"
											className="tiny-btn"
											title="Trộn từ đang hiển thị"
											onClick={handleShuffleVisibleWords}
										>
											<Shuffle size={16} />
										</button>
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
									{!loading && !loadError && filteredItems.length === 0 && (
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
