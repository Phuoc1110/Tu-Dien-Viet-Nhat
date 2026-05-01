import React, { useState } from "react";
import { X, BookOpen } from "lucide-react";
import "./AnnotatedText.css";

const JLPT_COLORS = {
	N5: "#10b981", // green
	N4: "#3b82f6", // blue
	N3: "#f59e0b", // amber
	N2: "#ef4444", // red
	N1: "#8b5cf6", // purple
	unknown: "#9ca3af", // gray
};

const WordDetailPopup = ({ token, onClose }) => {
	if (!token) return null;

	const jlptLevel = token.jlptLevel || "unknown";
	
	return (
		<div className="word-detail-popup" onClick={(e) => e.stopPropagation()}>
			<button className="popup-close-btn" onClick={onClose}>
				<X size={16} />
			</button>

			<div className="popup-header">
				<h3 className="popup-word">{token.text}</h3>
				<span 
					className="popup-jlpt-badge" 
					style={{ backgroundColor: JLPT_COLORS[jlptLevel] }}
				>
					{jlptLevel}
				</span>
			</div>

			{token.reading && (
				<div className="popup-reading">
					<strong>Reading (Hiragana):</strong> {token.reading}
				</div>
			)}

			{token.baseForm && token.baseForm !== token.text && (
				<div className="popup-base-form">
					<strong>Base form:</strong> {token.baseForm}
				</div>
			)}

			{token.pos && (
				<div className="popup-pos">
					<strong>Part of Speech:</strong> {token.pos}
					{token.pos1 && <span> - {token.pos1}</span>}
				</div>
			)}

			{token.meaning && (
				<div className="popup-meaning">
					<strong>Meaning:</strong>
					<p>{token.meaning}</p>
				</div>
			)}

			{token.isKanji && (
				<>
					{token.strokeCount && (
						<div className="popup-stroke">
							<strong>Strokes:</strong> {token.strokeCount}
						</div>
					)}
					{token.onyomi && (
						<div className="popup-kanji-reading">
							<strong>On'yomi:</strong> {token.onyomi}
						</div>
					)}
					{token.kunyomi && (
						<div className="popup-kanji-reading">
							<strong>Kun'yomi:</strong> {token.kunyomi}
						</div>
					)}
				</>
			)}

			{token.grammarTag && (
				<div className="popup-grammar">
					<strong>Grammar Pattern:</strong> {token.grammarTag}
				</div>
			)}
		</div>
	);
};

const Token = ({ token, onWordClick }) => {
	if (token.type === "spacing") {
		return <span key={token.id}>{token.text}</span>;
	}

	const jlptLevel = token.jlptLevel || "unknown";
	const hasData = token.meaning || token.pos;
	const readingText = token.reading ? (
		<ruby>
			{token.text}
			<rt>{token.reading}</rt>
		</ruby>
	) : (
		token.text
	);

	if (!hasData) {
		return <span key={token.id}>{readingText}</span>;
	}

	return (
		<button
			key={token.id}
			className="annotated-token"
			style={{ 
				borderBottomColor: JLPT_COLORS[jlptLevel],
				color: JLPT_COLORS[jlptLevel],
			}}
			onClick={() => onWordClick(token)}
			title={`${token.meaning || ""} (${jlptLevel})`}
		>
			{readingText}
		</button>
	);
};

const AnnotatedText = ({ analysis, loading = false }) => {
	const [selectedToken, setSelectedToken] = useState(null);

	if (loading) {
		return (
			<div className="annotated-text-container">
				<div className="annotated-loading">
					<div className="spinner"></div>
					<p>Analyzing text...</p>
				</div>
			</div>
		);
	}

	if (!analysis || !analysis.sentences || analysis.sentences.length === 0) {
		return (
			<div className="annotated-text-container">
				<p className="annotated-empty">No analysis available</p>
			</div>
		);
	}

	// Add IDs to tokens for React keys
	const sentencesWithIds = analysis.sentences.map((sentence, idx) => ({
		...sentence,
		id: idx,
		tokens: sentence.tokens.map((token, tidx) => ({
			...token,
			id: `${idx}-${tidx}`,
		})),
	}));

	return (
		<div 
			className="annotated-text-container"
			onClick={() => setSelectedToken(null)}
		>
			<div className="annotated-stats">
				<div className="stat-box">
					<span className="stat-label">Total Words:</span>
					<span className="stat-value">{analysis.analysis?.totalWords || 0}</span>
				</div>
				<div className="stat-box">
					<span className="stat-label">Unique Words:</span>
					<span className="stat-value">{analysis.analysis?.uniqueWords || 0}</span>
				</div>
				<div className="stat-box">
					<span className="stat-label">Difficulty:</span>
					<span className="stat-value" style={{ color: JLPT_COLORS[analysis.analysis?.estimatedDifficulty] }}>
						{analysis.analysis?.estimatedDifficulty || "N3"}
					</span>
				</div>
			</div>

			<div className="annotated-jlpt-distribution">
				<h4>Vocabulary by JLPT Level:</h4>
				<div className="distribution-bars">
					{["N5", "N4", "N3", "N2", "N1"].map((level) => {
						const count = analysis.analysis?.jlptLevelDistribution?.[level] || 0;
						const total = analysis.analysis?.totalWords || 1;
						const percentage = (count / total) * 100;
						return (
							<div key={level} className="distribution-bar-item">
								<div className="bar-label">{level}</div>
								<div className="bar-container">
									<div
										className="bar-fill"
										style={{
											width: `${percentage}%`,
											backgroundColor: JLPT_COLORS[level],
										}}
									/>
								</div>
								<div className="bar-count">{count}</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="annotated-sentences">
				<h4>
					<BookOpen size={16} />
					<span>Annotated Text</span>
				</h4>
				<div className="sentences-content">
					{sentencesWithIds.map((sentence) => (
						<div key={sentence.id} className="annotated-sentence">
							<div className="sentence-text">
								{sentence.tokens.map((token) => (
									<Token
										key={token.id}
										token={token}
										onWordClick={setSelectedToken}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</div>

			{selectedToken && (
				<WordDetailPopup 
					token={selectedToken} 
					onClose={() => setSelectedToken(null)}
				/>
			)}
		</div>
	);
};

export default AnnotatedText;
