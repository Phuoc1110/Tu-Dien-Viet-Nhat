import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { getNotebookOverview } from "../../services/notebookService";
import "./ExploreNotebookPage.css";

const formatDate = (value) => {
	if (!value) {
		return "-";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "-";
	}
	return date.toISOString().slice(0, 10);
};

const ExploreNotebookPage = () => {
	const history = useHistory();
	const [loading, setLoading] = useState(true);
	const [discoverNotebooks, setDiscoverNotebooks] = useState([]);
	const [filteredNotebooks, setFilteredNotebooks] = useState([]);
	const [searchKeyword, setSearchKeyword] = useState("");
	const [message, setMessage] = useState("");

	const loadExplore = useCallback(async () => {
		setLoading(true);
		const res = await getNotebookOverview(100);
		if (res && res.errCode === 0) {
			const notebooks = Array.isArray(res.discoverNotebooks) ? res.discoverNotebooks : [];
			setDiscoverNotebooks(notebooks);
			setFilteredNotebooks(notebooks);
			setMessage("");
		} else if (res?.errCode === -2) {
			history.push("/login");
			return;
		} else {
			setMessage(res?.errMessage || "Không tải được danh sách khám phá.");
		}
		setLoading(false);
	}, [history]);

	useEffect(() => {
		loadExplore();
	}, [loadExplore]);

	useEffect(() => {
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			setFilteredNotebooks(discoverNotebooks);
			return;
		}
		const filtered = discoverNotebooks.filter((notebook) => {
			const name = String(notebook.name || "").toLowerCase();
			const ownerName = String(notebook.owner?.username || "").toLowerCase();
			return name.includes(keyword) || ownerName.includes(keyword);
		});
		setFilteredNotebooks(filtered);
	}, [searchKeyword, discoverNotebooks]);

	return (
		<div className="explore-notebook-page">
			<div className="explore-notebook-shell">
				<div className="explore-breadcrumb">
					<button type="button" className="breadcrumb-link-btn" onClick={() => history.push("/notebook")}>
						Từ của tôi
					</button>
					<span>/</span>
					<span>Khám phá</span>
				</div>

				<div className="explore-header">
					<h1>Khám phá Sổ tay</h1>
				</div>

				<div className="explore-tools">
					<div className="search-box">
						<Search size={18} />
						<input
							type="text"
							placeholder="Tìm kiếm sổ tay"
							value={searchKeyword}
							onChange={(event) => setSearchKeyword(event.target.value)}
						/>
						<button type="button" className="tiny-btn">
							<Filter size={16} />
						</button>
					</div>
				</div>

				{message && <div className="explore-message">{message}</div>}

				<div className="explore-list-body">
					{loading && <div className="explore-loading">Đang tải danh sách khám phá...</div>}

					{!loading && filteredNotebooks.length === 0 && (
						<div className="explore-empty">Không có sổ tay khám phá nào.</div>
					)}

					{!loading && filteredNotebooks.length > 0 && (
						<div className="explore-grid">
							{filteredNotebooks.map((notebook) => (
								<button
									type="button"
									key={notebook.id}
									className="explore-card"
									onClick={() => history.push(`/notebook/${notebook.id}`, { fromExplore: true })}
								>
									<h3>{notebook.name}</h3>
									<p className="card-count">({notebook.itemsCount || 0} từ)</p>
									<div className="card-meta">
										<span className="owner">{notebook.owner?.username || "Ẩn danh"}</span>
										<span className="date">Ngày tạo: {formatDate(notebook.createdAt)}</span>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default ExploreNotebookPage;
