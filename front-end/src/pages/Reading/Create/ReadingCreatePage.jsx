import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, BookText, Clock3, Languages, PencilLine, Sparkles, X } from "lucide-react";
import { createReadingPassage, getReadingPassageDetail, updateReadingPassage } from "../../../services/readingService";
import "./ReadingCreatePage.css";

const DEFAULT_FORM = {
	title: "",
	summary: "",
	content: "",
	translation: "",
	level: "mixed",
	topic: "",
	estimatedMinutes: "5",
};

const excerpt = (text, maxLength = 180) => {
	const value = String(text || "").trim();
	if (!value) {
		return "";
	}
	if (value.length <= maxLength) {
		return value;
	}
	return `${value.slice(0, maxLength).trim()}...`;
};

const ReadingCreatePage = () => {
	const history = useHistory();
	const { id } = useParams();
	const isEditing = Boolean(id);
	const [form, setForm] = useState(DEFAULT_FORM);
	const [initialForm, setInitialForm] = useState(DEFAULT_FORM);
	const [loading, setLoading] = useState(false);
	const [pageLoading, setPageLoading] = useState(isEditing);
	const [error, setError] = useState("");
	const [pageError, setPageError] = useState("");

	const exitRoute = useMemo(() => (isEditing ? `/reading/${id}` : "/reading"), [id, isEditing]);
	const pageTitle = isEditing ? "Sua bai doc" : "Tao bai doc";
	const submitLabel = isEditing ? "Luu thay doi" : "Tao bai doc";

	const preview = useMemo(() => {
		return {
			title: form.title.trim() || "Untitled passage",
			summary: excerpt(form.summary, 160) || "No summary provided.",
			content: excerpt(form.content, 280) || "Original text will appear here.",
			translation: excerpt(form.translation, 200) || "Translation will appear here.",
			topic: form.topic.trim() || "general",
			level: form.level || "mixed",
			time: `${form.estimatedMinutes || 5} min`,
		};
	}, [form]);

	useEffect(() => {
		let cancelled = false;

		const loadPassage = async () => {
			if (!isEditing || !id) {
				setPageLoading(false);
				return;
			}

			setPageLoading(true);
			setPageError("");
			const res = await getReadingPassageDetail(id);

			if (cancelled) {
				return;
			}

			if (res?.errCode === 0 && res?.passage) {
				const nextForm = {
					title: res.passage.title || "",
					summary: res.passage.summary || "",
					content: res.passage.content || "",
					translation: res.passage.translation || "",
					level: res.passage.level || "mixed",
					topic: res.passage.topic || "",
					estimatedMinutes: String(res.passage.estimatedMinutes || 5),
				};
				setForm(nextForm);
				setInitialForm(nextForm);
				setError("");
			} else if (res?.errCode === -2) {
				history.push("/login");
				return;
			} else {
				setPageError(res?.errMessage || "Khong tai duoc bai doc.");
			}

			setPageLoading(false);
		};

		loadPassage();

		return () => {
			cancelled = true;
		};
	}, [id, isEditing, history]);

	const handleReset = () => {
		setForm(isEditing ? initialForm : DEFAULT_FORM);
		setError("");
	};

	const handleSubmit = async () => {
		const title = form.title.trim();
		const content = form.content.trim();

		if (!title || !content) {
			setError("Vui long nhap tieu de va noi dung bai doc.");
			return;
		}

		setLoading(true);
		setError("");

		const payload = {
			title,
			summary: form.summary.trim(),
			content,
			translation: form.translation.trim(),
			level: form.level,
			topic: form.topic.trim(),
			estimatedMinutes: form.estimatedMinutes,
		};

		const res = isEditing ? await updateReadingPassage(id, payload) : await createReadingPassage(payload);

		if (res?.errCode === 0 && res?.passage?.id) {
			history.push(`/reading/${res.passage.id}`);
			return;
		}

		if (res?.errCode === -2) {
			history.push("/login");
			return;
		}

		setError(res?.errMessage || "Khong luu duoc bai doc.");
		setLoading(false);
	};

	if (pageLoading) {
		return (
			<div className="reading-create-page">
				<div className="reading-create-shell">
					<div className="reading-create-top glass-panel">
						<div className="reading-create-brand">
							<div className="reading-create-brand-mark">
								<Sparkles size={16} />
							</div>
							<div>
								<p>Yomu Studio</p>
								<span>{pageTitle}</span>
							</div>
						</div>
						<button type="button" className="reading-create-back" onClick={() => history.push(exitRoute)}>
							<ArrowLeft size={16} />
							<span>Quay lai</span>
						</button>
					</div>
					<div className="reading-create-state glass-panel">Dang tai bai doc...</div>
				</div>
			</div>
		);
	}

	if (pageError) {
		return (
			<div className="reading-create-page">
				<div className="reading-create-shell">
					<div className="reading-create-top glass-panel">
						<div className="reading-create-brand">
							<div className="reading-create-brand-mark">
								<Sparkles size={16} />
							</div>
							<div>
								<p>Yomu Studio</p>
								<span>{pageTitle}</span>
							</div>
						</div>
						<button type="button" className="reading-create-back" onClick={() => history.push(exitRoute)}>
							<ArrowLeft size={16} />
							<span>Quay lai</span>
						</button>
					</div>
					<div className="reading-create-error-state glass-panel">
						<AlertCircle size={18} />
						<span>{pageError}</span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="reading-create-page">
			<div className="reading-create-shell">
				<div className="reading-create-top glass-panel">
					<div className="reading-create-brand">
						<div className="reading-create-brand-mark">
							<Sparkles size={16} />
						</div>
						<div>
							<p>Yomu Studio</p>
							<span>{isEditing ? "Edit passage" : "Create passage"}</span>
						</div>
					</div>
					<button type="button" className="reading-create-back" onClick={() => history.push(exitRoute)}>
						<ArrowLeft size={16} />
						<span>Quay lai</span>
					</button>
				</div>

				<section className="reading-create-hero glass-panel">
					<div className="reading-create-hero-copy">
						<div className="reading-create-kicker">
							<PencilLine size={16} />
							<span>{pageTitle}</span>
						</div>
						<h1>{isEditing ? "Polish an existing passage" : "Build a new reading passage from scratch"}</h1>
						<p>
							Keep the left side focused on the raw editor and use the preview rail to check how the final
							reading will feel before saving.
						</p>
					</div>

					<div className="reading-create-hero-meta">
						<div className="reading-create-mini-stat">
							<BookText size={16} />
							<span>Original + translation</span>
						</div>
						<div className="reading-create-mini-stat">
							<Languages size={16} />
							<span>Level, topic, timing</span>
						</div>
						<div className="reading-create-mini-stat">
							<Clock3 size={16} />
							<span>Designed for fast review</span>
						</div>
					</div>
				</section>

				<div className="reading-create-grid">
					<section className="reading-editor-card glass-panel">
						<div className="reading-editor-head">
							<div>
								<p className="reading-create-kicker">Editor</p>
								<h2>{isEditing ? "Chinh sua bai doc" : "Thong tin bai doc"}</h2>
							</div>
							<button type="button" className="reading-create-close" onClick={() => history.push(exitRoute)}>
								<X size={18} />
							</button>
						</div>

						<div className="reading-create-form-grid">
							<label className="reading-create-field reading-create-field-wide">
								<span>Title *</span>
								<input
									type="text"
									placeholder="Vi du: Cuoc song o Tokyo"
									value={form.title}
									onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
								/>
							</label>

							<label className="reading-create-field reading-create-field-wide">
								<span>Summary</span>
								<textarea
									rows={3}
									placeholder="Mo ta ngan ve noi dung bai doc"
									value={form.summary}
									onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
								/>
							</label>

							<label className="reading-create-field reading-create-field-wide">
								<span>Original text *</span>
								<textarea
									rows={10}
									placeholder="Nhap doan bai doc tieng Nhat"
									value={form.content}
									onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
								/>
							</label>

							<label className="reading-create-field reading-create-field-wide">
								<span>Translation</span>
								<textarea
									rows={7}
									placeholder="Nhap ban dich tieng Viet"
									value={form.translation}
									onChange={(event) => setForm((prev) => ({ ...prev, translation: event.target.value }))}
								/>
							</label>

							<label className="reading-create-field">
								<span>Level</span>
								<select
									value={form.level}
									onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value }))}
								>
									<option value="mixed">Mixed</option>
									<option value="N5">N5</option>
									<option value="N4">N4</option>
									<option value="N3">N3</option>
									<option value="N2">N2</option>
									<option value="N1">N1</option>
								</select>
							</label>

							<label className="reading-create-field">
								<span>Topic</span>
								<input
									type="text"
									placeholder="Vi du: travel, school, life"
									value={form.topic}
									onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
								/>
							</label>

							<label className="reading-create-field">
								<span>Estimated minutes</span>
								<input
									type="number"
									min="1"
									max="60"
									value={form.estimatedMinutes}
									onChange={(event) => setForm((prev) => ({ ...prev, estimatedMinutes: event.target.value }))}
								/>
							</label>
						</div>

						{error && <div className="reading-create-inline-error">{error}</div>}

						<div className="reading-create-actions">
							<button type="button" className="reading-create-secondary" onClick={handleReset} disabled={loading}>
								Lam moi
							</button>
							<button type="button" className="reading-create-secondary" onClick={() => history.push(exitRoute)} disabled={loading}>
								Huy
							</button>
							<button type="button" className="reading-create-primary" onClick={handleSubmit} disabled={loading}>
								{loading ? (isEditing ? "Dang luu..." : "Dang tao...") : submitLabel}
							</button>
						</div>
					</section>

					<aside className="reading-preview-card glass-panel">
						<div className="reading-preview-head">
							<p className="reading-create-kicker">Live preview</p>
							<h2>{preview.title}</h2>
							<p>{preview.summary}</p>
						</div>

						<div className="reading-preview-meta-row">
							<span className="reading-preview-chip">{preview.level}</span>
							<span className="reading-preview-chip">{preview.topic}</span>
							<span className="reading-preview-chip">{preview.time}</span>
						</div>

						<div className="reading-preview-block">
							<span className="reading-preview-label">Original</span>
							<p className="japanese-font">{preview.content}</p>
						</div>

						<div className="reading-preview-block is-translation">
							<span className="reading-preview-label">Translation</span>
							<p>{preview.translation}</p>
						</div>
					</aside>
				</div>
			</div>
		</div>
	);
};

export default ReadingCreatePage;