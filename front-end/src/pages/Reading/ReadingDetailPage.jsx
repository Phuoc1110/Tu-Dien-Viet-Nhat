import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { 
	ArrowLeft, 
	BookOpenCheck, 
	Clock3, 
	CheckCircle2, 
	Circle, 
	AlertCircle 
} from "lucide-react";
import { 
	getReadingPassageDetail, 
	upsertReadingProgress 
} from "../../services/readingService";
import "./ReadingDetailPage.css";

const STATUS_OPTIONS = [
	{ value: "not_started", label: "Chua bat dau", icon: Circle },
	{ value: "in_progress", label: "Dang doc", icon: BookOpenCheck },
	{ value: "completed", label: "Da doc xong", icon: CheckCircle2 },
];

const ReadingDetailPage = () => {
	const history = useHistory();
	const { id } = useParams();
	
	const [passage, setPassage] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [updating, setUpdating] = useState(false);
	const [currentStatus, setCurrentStatus] = useState("in_progress");

	useEffect(() => {
		const loadData = async () => {
			setLoading(true);
			const res = await getReadingPassageDetail(id);
			
			if (res?.errCode === 0 && res?.passage) {
				setPassage(res.passage);
				setCurrentStatus(res.passage.myProgress?.status || "not_started");
				setError("");
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

	const handleStatusChange = async (newStatus) => {
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
				<div className="reading-detail-loading">Dang tai bai doc...</div>
			</div>
		);
	}

	if (error || !passage) {
		return (
			<div className="reading-detail-page">
				<button 
					className="reading-back-btn"
					onClick={() => history.push("/reading")}
				>
					<ArrowLeft size={18} /> Quay lai
				</button>
				<div className="reading-detail-error">
					<AlertCircle size={32} />
					<p>{error || "Khong the tai bai doc"}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="reading-detail-page">
			<button 
				className="reading-back-btn"
				onClick={() => history.push("/reading")}
			>
				<ArrowLeft size={18} /> Quay lai
			</button>

			<article className="reading-detail-container">
				{/* Header Section */}
				<div className="reading-detail-header">
					<div className="reading-detail-title-section">
						<div className="reading-detail-meta">
							<span className="reading-level-badge">{passage.level || "mixed"}</span>
							{passage.topic && <span className="reading-topic-badge">{passage.topic}</span>}
						</div>
						<h1>{passage.title}</h1>
						{passage.summary && <p className="reading-summary">{passage.summary}</p>}
					</div>

					<div className="reading-detail-stats">
						<div className="stat-item">
							<Clock3 size={18} />
							<span>{passage.estimatedMinutes || 5} phut</span>
						</div>
						{passage.author && (
							<div className="stat-item">
								<BookOpenCheck size={18} />
								<span>Tac gia: {passage.author.username}</span>
							</div>
						)}
					</div>
				</div>

				{/* Progress Status */}
				<div className="reading-progress-section">
					<h3>Tien do doc:</h3>
					<div className="reading-status-buttons">
						{STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
							<button
								key={value}
								className={`status-btn ${currentStatus === value ? "active" : ""}`}
								onClick={() => handleStatusChange(value)}
								disabled={updating}
								title={label}
							>
								<Icon size={20} />
								<span>{label}</span>
							</button>
						))}
					</div>
				</div>

				{/* Main Content */}
				<div className="reading-content-section">
					<div className="japanese-text">
						<h3>Noi dung</h3>
						<div className="text-content">
							{passage.content}
						</div>
					</div>

					{/* Translation */}
					{passage.translation && (
						<div className="translation-section">
							<h3>Dich nghia</h3>
							<div className="translation-content">
								{passage.translation}
							</div>
						</div>
					)}
				</div>

				{/* Footer Info */}
				<div className="reading-detail-footer">
					<p className="text-muted">
						Ngay tao: {new Date(passage.createdAt).toLocaleDateString("vi-VN")}
					</p>
					{passage.myProgress?.completedAt && (
						<p className="text-success">
							✓ Ban da doc xong bai nay vao {new Date(passage.myProgress.completedAt).toLocaleDateString("vi-VN")}
						</p>
					)}
				</div>
			</article>
		</div>
	);
};

export default ReadingDetailPage;
