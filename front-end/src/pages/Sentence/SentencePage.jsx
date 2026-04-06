import React, { useEffect, useMemo, useRef, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { searchSentences } from "../../services/dictionaryService";
import "./SentencePage.css";

const SentencePage = () => {
	const history = useHistory();
	const { search } = useLocation();
	const searchWrapRef = useRef(null);
	const [searchInput, setSearchInput] = useState("");
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [loadingDropdown, setLoadingDropdown] = useState(false);
	const [errorDropdown, setErrorDropdown] = useState("");
	const [dropdownResults, setDropdownResults] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [sentences, setSentences] = useState([]);

	const keyword = useMemo(() => {
		const params = new URLSearchParams(search);
		return params.get("q") || params.get("keyword") || "";
	}, [search]);

	useEffect(() => {
		setSearchInput(keyword);
	}, [keyword]);

	useEffect(() => {
		const runSearch = async () => {
			if (!keyword.trim()) {
				setSentences([]);
				setError("");
				return;
			}

			setLoading(true);
			setError("");
			const res = await searchSentences(keyword.trim(), 20);
			if (res && res.errCode === 0) {
				setSentences(res.sentences || []);
				if (!res.sentences?.length) {
					setError("Không tìm thấy mẫu câu phù hợp");
				}
			} else {
				setSentences([]);
				setError((res && res.errMessage) || "Search failed");
			}
			setLoading(false);
		};

		runSearch();
	}, [keyword]);

	useEffect(() => {
		if (!searchInput.trim() || searchInput === keyword) {
			setDropdownResults([]);
			setErrorDropdown("");
			return;
		}

		const debounce = setTimeout(async () => {
			setLoadingDropdown(true);
			setErrorDropdown("");
			const res = await searchSentences(searchInput.trim(), 8);
			if (res && res.errCode === 0) {
				setDropdownResults(res.sentences || []);
			} else {
				setDropdownResults([]);
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
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const handleSearch = (e) => {
		if (e.key === "Enter") {
			const newKeyword = e.target.value;
			if (newKeyword.trim()) {
				history.push(`/sentence?q=${newKeyword.trim()}`);
				setIsDropdownOpen(false);
			}
		}
	};

	const handleSelectSentence = (item) => {
		history.push(`/sentence?q=${item.japaneseSentence}`);
		setIsDropdownOpen(false);
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
				{dropdownResults.map((item) => (
					<button
						type="button"
						key={item.id}
						className="dropdown-item"
						onClick={() => handleSelectSentence(item)}
					>
						<div className="dropdown-item-main">
							<strong>{item.japaneseSentence}</strong>
						</div>
						<p>{item.vietnameseTranslation}</p>
					</button>
				))}
			</div>
		);
	};

	return (
		<div className="mazii-home">
			<div className="mazii-shell">
				<div className="mazii-search-wrap" ref={searchWrapRef}>
					<div className="mazii-search-bar">
						<div className="search-leading">Mau cau</div>
						<input
							type="text"
							placeholder="Tra mau cau"
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onFocus={() => setIsDropdownOpen(true)}
							onKeyDown={handleSearch}
						/>
						<div className="search-actions">
							<button>Tim kiem</button>
						</div>
						<button className="lang-switch">Nhat - Viet</button>
					</div>
					<div className="mazii-mode-tabs">
						<button onClick={() => history.push(`/dictionary?q=${searchInput}`)}>
							Tu vung
						</button>
						<button onClick={() => history.push(`/kanji?q=${searchInput}`)}>
							Han tu
						</button>
						<button className="tab-active">Mau cau</button>
						<button onClick={() => history.push(`/grammar?q=${searchInput}`)}>
							Ngu phap
						</button>
						{/* <button>Nhat - Nhat</button> */}
					</div>
					{isDropdownOpen && searchInput.trim() && (
						<div className="mazii-dropdown">{renderDropdownBody()}</div>
					)}
				</div>

				<div className="sentence-results">
					<div className="sentence-card">
						<h2>
							Ket qua tra cuu mau cau cua <span>{keyword || "..."}</span>
						</h2>
						{loading && <p>Dang tai...</p>}
						{error && <p className="sentence-error">{error}</p>}
						{!loading &&
							!error &&
							sentences.map((item) => (
								<div className="sentence-item" key={item.id}>
									<p className="sentence-jp">{item.japaneseSentence}</p>
									<p className="sentence-vi">{item.vietnameseTranslation}</p>
									{item.word && (
										<small className="sentence-word">
											Tu lien quan: {item.word.word}
										</small>
									)}
								</div>
							))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SentencePage;
