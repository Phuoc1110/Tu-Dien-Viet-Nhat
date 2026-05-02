import React, { useContext, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { ArrowLeft, BookText, CheckCircle2, Circle, Clock3, Languages, PencilLine, Zap } from "lucide-react";
import { UserContext } from "../../../Context/UserProvider";
import { getPassageAnalysis, getReadingPassageDetail, upsertReadingProgress } from "../../../services/readingService";
import AnnotatedText from "../../../components/AnnotatedText/AnnotatedText";
import "./ReadingDetailViewPage.css";

const STATUS_OPTIONS = [
	{ value: "not_started", label: "Not started", icon: Circle },
	{ value: "in_progress", label: "Reading", icon: BookText },
	{ value: "completed", label: "Completed", icon: CheckCircle2 },
];

function ReadingDetailViewPage() {
	const history = useHistory();
	const { id } = useParams();
	const { user, admin } = useContext(UserContext);

	const [passage, setPassage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updating, setUpdating] = useState(false);
	const [currentStatus, setCurrentStatus] = useState("not_started");
	const [analysis, setAnalysis] = useState(null);
	const [analysisLoading, setAnalysisLoading] = useState(false);
	const [analysisError, setAnalysisError] = useState("");
	const [showAnalysis, setShowAnalysis] = useState(false);

	const actorId = user?.account?.id ?? admin?.account?.id;
	const canEditPassage = Boolean(
		passage?.author?.id && (admin?.isAuthenticated || Number(passage.author.id) === Number(actorId))
	);

	useEffect(() => {
		let mounted = true;

		async function load() {
			setLoading(true);
			const res = await getReadingPassageDetail(id);
			if (!mounted) return;
			if (res?.errCode === 0 && res?.passage) {
				setPassage(res.passage);
				setCurrentStatus(res.passage.myProgress?.status || "not_started");
				setError("");
				loadAnalysis(id);
			} else if (res?.errCode === -2) {
				history.push("/login");
			} else if (res?.errCode === 1) {
				setError("Bài đọc không tồn tại hoặc đã bị xóa.");
			} else {
				setError(res?.errMessage || "Không tải được bài đọc");
			}
			setLoading(false);
		}

		async function loadAnalysis(passageId) {
			setAnalysisLoading(true);
			setAnalysisError("");
			const res = await getPassageAnalysis(passageId);
			if (!mounted) return;
			if (res?.errCode === 0 && res?.analysis) setAnalysis(res.analysis);
			else setAnalysisError(res?.errMessage || "Không phân tích được bài đọc");
			setAnalysisLoading(false);
		}

		if (id) load();
		return () => {
			mounted = false;
		};
	}, [id, history]);

	const handleStatusChange = async (newStatus) => {
		if (newStatus === currentStatus) return;
		setUpdating(true);
		const now = new Date().toISOString();
		const lastReadAt = newStatus !== "not_started" ? now : null;
		const completedAt = newStatus === "completed" ? now : null;
		const res = await upsertReadingProgress(id, newStatus, lastReadAt, completedAt);
		if (res?.errCode === 0) setCurrentStatus(newStatus);
		else setError(res?.errMessage || "Không cập nhật được tiến độ");
		setUpdating(false);
	};

	if (loading) {
		return (
			<div className="rd-page">
				<div className="rd-shell">
					<div className="rd-loading">Loading...</div>
				</div>
			</div>
		);
	}

	if (error || !passage) {
		return (
			<div className="rd-page">
				<div className="rd-shell">
					<div className="rd-error">{error || "Không thể tải bài đọc"}</div>
				</div>
			</div>
		);
	}

	return (
		<div className="rd-page">
			<div className="rd-shell">
				<header className="rd-header">
					<button className="rd-back" onClick={() => history.push("/reading")}> <ArrowLeft /> Back</button>
					<div className="rd-controls">
						{canEditPassage && (
							<button className="rd-edit" onClick={() => history.push(`/reading/${id}/edit`)}> <PencilLine /> Edit</button>
						)}
					</div>
				</header>

				<section className="rd-hero">
					<div className="rd-hero-left">
						<h1 className="rd-title">{passage.title || "Untitled"}</h1>
						<p className="rd-summary">{passage.summary}</p>
						<div className="rd-badges">
							<span className="badge">{passage.level || "mixed"}</span>
							<span className="badge muted">{passage.topic || "general"}</span>
						</div>
						<div className="rd-meta">
							<div><Clock3 /> {passage.estimatedMinutes || 8} min</div>
							<div><Languages /> {new Date(passage.createdAt).toLocaleDateString()}</div>
							<div>By {passage.author?.username || "Community"}</div>
						</div>
					</div>

					<div className="rd-hero-right">
						<div className="rd-status">
							<label>Your status</label>
							<strong>{STATUS_OPTIONS.find(s => s.value === currentStatus)?.label}</strong>
						</div>
						<button className="rd-toggle-analysis" onClick={() => setShowAnalysis(v => !v)}>
							<Zap /> {showAnalysis ? 'Hide analysis' : 'Show analysis'}
						</button>
					</div>
				</section>

				<main className="rd-main">
					<article className="rd-article">
						<div className="rd-actions">
							{STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
								<button key={value} className={`rd-status-btn ${currentStatus === value ? 'active' : ''}`} onClick={() => handleStatusChange(value)} disabled={updating}>
									<Icon /> {label}
								</button>
							))}
						</div>

						<section className="rd-content">
							<h3>Original</h3>
							<div className="rd-text">{passage.content}</div>
							<h3>Translation</h3>
							<div className="rd-translation">{passage.translation || 'No translation provided.'}</div>
						</section>
					</article>

					<aside className="rd-aside">
						<div className="rd-card">
							<strong>Facts</strong>
							<div>Level: {passage.level || 'mixed'}</div>
							<div>Topic: {passage.topic || 'general'}</div>
							<div>Updated: {new Date(passage.updatedAt).toLocaleDateString()}</div>
						</div>
						<div className="rd-card">
							<strong>Creator</strong>
							<div>{passage.author?.username || 'Community'}</div>
						</div>
					</aside>
				</main>

				{showAnalysis && (
					<section className="rd-analysis">
						{analysisError && <div className="analysis-error">{analysisError}</div>}
						{analysisLoading && !analysis && <div className="analysis-loading">Analyzing...</div>}
						{analysis && <AnnotatedText analysis={analysis} loading={analysisLoading} />}
					</section>
				)}

				<footer className="rd-footer">Created: {new Date(passage.createdAt).toLocaleDateString()}</footer>
			</div>
		</div>
	);
}

export default ReadingDetailViewPage;