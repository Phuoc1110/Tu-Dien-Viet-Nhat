import React, { useEffect, useMemo, useState } from "react";
import { 
	RefreshCcw, 
	Search, 
	FileText,
	WritingHand,
	Trash2,
	Edit2,
	Plus
} from "lucide-react";
import "./EssayPage.css";

const EssayPage = () => {
	const [essays, setEssays] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [query, setQuery] = useState("");
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [formData, setFormData] = useState({
		title: "",
		content: "",
		level: "N5",
	});

	const filteredEssays = useMemo(() => {
		return essays.filter(essay => 
			essay.title.toLowerCase().includes(query.toLowerCase()) ||
			essay.content.toLowerCase().includes(query.toLowerCase())
		);
	}, [essays, query]);

	useEffect(() => {
		// Load essays from localStorage (client-side storage)
		const stored = localStorage.getItem("userEssays");
		try {
			const data = stored ? JSON.parse(stored) : [];
			setEssays(Array.isArray(data) ? data : []);
			setError("");
		} catch (e) {
			setError("Khong the tai danh sach bai van");
		}
		setLoading(false);
	}, []);

	const handleSaveEssay = () => {
		if (!formData.title.trim() || !formData.content.trim()) {
			setError("Vui long nhap tieu de va noi dung");
			return;
		}

		let updated;
		if (editingId) {
			updated = essays.map(essay =>
				essay.id === editingId
					? { ...essay, ...formData, updatedAt: new Date().toISOString() }
					: essay
			);
		} else {
			updated = [
				...essays,
				{
					id: Date.now(),
					...formData,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				},
			];
		}

		setEssays(updated);
		localStorage.setItem("userEssays", JSON.stringify(updated));
		setFormData({ title: "", content: "", level: "N5" });
		setShowForm(false);
		setEditingId(null);
		setError("");
	};

	const handleEditEssay = (essay) => {
		setFormData({
			title: essay.title,
			content: essay.content,
			level: essay.level || "N5",
		});
		setEditingId(essay.id);
		setShowForm(true);
	};

	const handleDeleteEssay = (id) => {
		if (window.confirm("Ban co chac chan muon xoa bai van nay?")) {
			const updated = essays.filter(essay => essay.id !== id);
			setEssays(updated);
			localStorage.setItem("userEssays", JSON.stringify(updated));
		}
	};

	const handleCancel = () => {
		setShowForm(false);
		setEditingId(null);
		setFormData({ title: "", content: "", level: "N5" });
	};

	return (
		<div className="essay-page">
			{/* Header Section */}
			<section className="essay-hero">
				<div className="essay-hero-copy">
					<div className="essay-kicker">
						<WritingHand size={16} />
						<span>Bai van</span>
					</div>
					<h1>Thuc hanh viet bai van</h1>
					<p>
						Tao va quan ly cac bai van cua ban. Tap luyen viet bai van Tieng Nhat 
						da tai theo cac cap do khac nhau.
					</p>
					{!showForm && (
						<button 
							className="essay-create-btn"
							onClick={() => setShowForm(true)}
						>
							<Plus size={18} /> Tao bai van moi
						</button>
					)}
				</div>
				<div className="essay-hero-card">
					<h2>Thong ke</h2>
					<p>Tong bai van: <strong>{essays.length}</strong></p>
					<div className="essay-level-summary">
						{["N5", "N4", "N3", "N2", "N1"].map(level => (
							<div key={level} className="level-count">
								<span>{level}</span>
								<strong>{essays.filter(e => e.level === level).length}</strong>
							</div>
						))}
					</div>
					<button 
						type="button" 
						className="reload-btn" 
						onClick={() => window.location.reload()}
					>
						<RefreshCcw size={15} /> Lam moi
					</button>
				</div>
			</section>

			{/* Form Section */}
			{showForm && (
				<section className="essay-form-section">
					<div className="essay-form-container">
						<h2>{editingId ? "Chinh sua bai van" : "Tao bai van moi"}</h2>
						<form onSubmit={(e) => { e.preventDefault(); handleSaveEssay(); }}>
							<div className="form-group">
								<label>Tieu de *</label>
								<input
									type="text"
									placeholder="Nhap tieu de bai van..."
									value={formData.title}
									onChange={(e) => setFormData({ ...formData, title: e.target.value })}
									maxLength={160}
								/>
								<span className="char-count">{formData.title.length}/160</span>
							</div>

							<div className="form-group">
								<label>Cap do *</label>
								<select
									value={formData.level}
									onChange={(e) => setFormData({ ...formData, level: e.target.value })}
								>
									<option value="N5">N5 (Beginner)</option>
									<option value="N4">N4 (Elementary)</option>
									<option value="N3">N3 (Intermediate)</option>
									<option value="N2">N2 (Upper-Intermediate)</option>
									<option value="N1">N1 (Advanced)</option>
								</select>
							</div>

							<div className="form-group">
								<label>Noi dung *</label>
								<textarea
									placeholder="Viet noi dung bai van cua ban..."
									value={formData.content}
									onChange={(e) => setFormData({ ...formData, content: e.target.value })}
									rows={12}
									maxLength={5000}
								/>
								<span className="char-count">{formData.content.length}/5000</span>
							</div>

							{error && <div className="form-error">{error}</div>}

							<div className="form-actions">
								<button type="submit" className="btn-save">
									{editingId ? "Cap nhat" : "Tao"} bai van
								</button>
								<button type="button" className="btn-cancel" onClick={handleCancel}>
									Huy
								</button>
							</div>
						</form>
					</div>
				</section>
			)}

			{/* Search Section */}
			{!showForm && (
				<section className="essay-search-section">
					<div className="essay-search-wrap">
						<Search size={18} />
						<input
							type="text"
							placeholder="Tim bai van theo tieu de hoac noi dung..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
				</section>
			)}

			{/* Essays List */}
			{!showForm && (
				<section className="essay-grid">
					{loading && <div className="essay-empty">Dang tai bai van...</div>}
					{!loading && error && essays.length === 0 && (
						<div className="essay-empty error">{error}</div>
					)}
					{!loading && essays.length === 0 && !error && (
						<div className="essay-empty">
							Chua co bai van nao. <br />
							<button className="link-btn" onClick={() => setShowForm(true)}>
								Tao bai van dau tien
							</button>
						</div>
					)}
					{!loading && essays.length > 0 && filteredEssays.length === 0 && (
						<div className="essay-empty">Khong tim thay bai van phu hop.</div>
					)}
					{!loading &&
						filteredEssays.map((essay) => (
							<article className="essay-card" key={essay.id}>
								<div className="essay-card-header">
									<div className="essay-card-title">
										<FileText size={20} />
										<h3>{essay.title}</h3>
									</div>
									<span className="essay-level-badge">{essay.level}</span>
								</div>

								<p className="essay-preview">
									{essay.content.substring(0, 150)}
									{essay.content.length > 150 ? "..." : ""}
								</p>

								<div className="essay-meta">
									<span className="essay-date">
										{new Date(essay.createdAt).toLocaleDateString("vi-VN")}
									</span>
									{essay.updatedAt !== essay.createdAt && (
										<span className="essay-updated">
											Cap nhat: {new Date(essay.updatedAt).toLocaleDateString("vi-VN")}
										</span>
									)}
					</div>

								<div className="essay-actions">
									<button
										className="btn-edit"
										onClick={() => handleEditEssay(essay)}
										title="Chinh sua"
									>
										<Edit2 size={16} />
									</button>
									<button
										className="btn-delete"
										onClick={() => handleDeleteEssay(essay.id)}
										title="Xoa"
									>
										<Trash2 size={16} />
									</button>
								</div>
							</article>
						))}
				</section>
			)}
		</div>
	);
};

export default EssayPage;
