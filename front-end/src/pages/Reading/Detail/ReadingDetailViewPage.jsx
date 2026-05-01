import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { 
	ArrowLeft, 
	BookOpenCheck,
	BookText,
	ChevronDown,
	Clock3, 
	CheckCircle2, 
	Circle, 
	AlertCircle,
	Languages,
	UserRound,
	Zap,
} from "lucide-react";
import { 
	getReadingPassageDetail, 
	upsertReadingProgress,
	getPassageAnalysis,
} from "../../../services/readingService";
import AnnotatedText from "../../../components/AnnotatedText/AnnotatedText";
import "./ReadingDetailViewPage.css";

const STATUS_OPTIONS = [
	{ value: "not_started", label: "Chua bat dau", icon: Circle },
	{ value: "in_progress", label: "Dang doc", icon: BookOpenCheck },
	{ value: "completed", label: "Da doc xong", icon: CheckCircle2 },
];

const ReadingDetailViewPage = () => {
	const history = useHistory();
	const { id } = useParams();
	
	const [passage, setPassage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updating, setUpdating] = useState(false);
	const [currentStatus, setCurrentStatus] = useState("completed");
	const [analysis, setAnalysis] = useState(null);
	const [analysisLoading, setAnalysisLoading] = useState(false);
	const [analysisError, setAnalysisError] = useState("");
	const [showAnalysis, setShowAnalysis] = useState(false);

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			const res = await getReadingPassageDetail(id);
			
			if (res?.errCode === 0 && res?.passage) {
				setPassage(res.passage);
				setCurrentStatus(res.passage.myProgress?.status || "completed");
				setError("");
				
				// Load analysis automatically
				loadAnalysis(id);
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else if (res?.errCode === 1) {
				setError("Bai doc khong ton tai hoac da bi xoa.");
				setPassage(null);
			} else {
				setError(res?.errMessage || "Khong tai duoc bai doc");
				setPassage(null);
			}
			setLoading(false);
		};

		if (id) {
			loadData();
		}
	}, [id, history]);

	const loadAnalysis = async (passageId) => {
		setAnalysisLoading(true);
		setAnalysisError("");
		const res = await getPassageAnalysis(passageId);
		
		if (res?.errCode === 0 && res?.analysis) {
			setAnalysis(res.analysis);
		} else {
			setAnalysisError(res?.errMessage || "Khong phan tich duoc bai doc");
		}
		setAnalysisLoading(false);
	};

	const handleStatusChange = async (newStatus) => {
		if (newStatus === currentStatus) {
			return;
		}

		setUpdating(true);
		const now = new Date().toISOString();
		const payload = {
			status: newStatus,
			lastReadAt: newStatus !== "not_started" ? now : null,
			completedAt: newStatus === "completed" ? now : null,
		};

		const res = await upsertReadingProgress(id, newStatus, payload.lastReadAt, payload.completedAt);
		
		if (res?.errCode === 0) {
			setCurrentStatus(newStatus);
		} else {
			setError(res?.errMessage || "Khong cap nhat duoc tien do");
		}
		setUpdating(false);
	};

	if (loading) {
		return (
			<div className="reading-detail-page">
				<div className="reading-detail-loading">Loading reading detail...</div>
			</div>
		);
	}

	if (error || !passage) {
		return (
			<div className="reading-detail-page">
				<div className="reading-detail-error">
					<AlertCircle size={32} />
					<p>{error || "Khong the tai bai doc"}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="reading-detail-page">

			<main className="reading-detail-shell">
				<button className="reading-back-btn" onClick={() => history.push("/reading")}>
					<ArrowLeft size={18} />
					<span>Back to list</span>
				</button>

				<article className="reading-detail-container glass-panel">
					<div className="reading-article-meta">
						<div className="reading-detail-meta">
							<span className="reading-level-badge">{passage.level || "N3"}</span>
							<span className="reading-topic-badge">{passage.topic || "Education"}</span>
						</div>

						<h1 className="reading-japanese-title">{passage.title || "未来の教育"}</h1>
						<p className="reading-subtitle">{passage.summary || "Giáo dục tương lai"}</p>

						<div className="reading-detail-stats">
							<div className="stat-item">
								<Clock3 size={17} />
								<span>{passage.estimatedMinutes || 8} minutes</span>
							</div>
							<div className="stat-item">
								<UserRound size={17} />
								<span>{passage.author?.username || "Author"}</span>
							</div>
						</div>
					</div>

					<div className="reading-progress-section">
						<h3 className="reading-section-title">Progress Tracker</h3>
						<div className="reading-status-buttons">
							{STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
								<button
									key={value}
									className={`status-btn ${currentStatus === value ? "active" : ""} ${updating ? "is-updating" : ""}`}
									onClick={() => handleStatusChange(value)}
									disabled={updating}
									title={label}
								>
									<Icon size={18} />
									<span>
										{value === "not_started" ? "Not started" : value === "in_progress" ? "Reading" : "Finished"}
									</span>
								</button>
							))}
						</div>
					</div>

					<div className="reading-content-section">
						<div className="reading-pane japanese-text">
							<h3 className="reading-section-title">
								<BookText size={16} />
								<span>Original Content</span>
							</h3>
							<div className="text-content japanese-font">{passage.content}</div>
						</div>

						<div className="reading-pane translation-section">
							<h3 className="reading-section-title">
								<Languages size={16} />
								<span>Translation</span>
							</h3>
							<div className="translation-content">
								{passage.translation || "Chua co ban dich."}
							</div>
						</div>
					</div>

					<div className="reading-analysis-section">
						<button 
							className={`analysis-toggle-btn ${showAnalysis ? "active" : ""}`}
							onClick={() => setShowAnalysis(!showAnalysis)}
						>
							<Zap size={16} />
							<span>Text Analysis</span>
							<ChevronDown 
								size={16} 
								style={{ 
									transform: showAnalysis ? "rotate(180deg)" : "rotate(0deg)",
									transition: "transform 0.3s ease",
								}} 
							/>
						</button>
						
						{showAnalysis && (
							<div className="analysis-content">
								{analysisError && (
									<div className="analysis-error">
										<AlertCircle size={16} />
										<p>{analysisError}</p>
									</div>
								)}
								{analysis && (
									<AnnotatedText 
										analysis={analysis} 
										loading={analysisLoading}
									/>
								)}
								{analysisLoading && !analysis && (
									<div className="analysis-loading">
										<p>Analyzing passage...</p>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="reading-detail-footer">
						<p className="text-muted">
							Created: {new Date(passage.createdAt).toLocaleDateString("vi-VN")}
						</p>
					</div>
				</article>
			</main>
		</div>
	);
};

export default ReadingDetailViewPage;
