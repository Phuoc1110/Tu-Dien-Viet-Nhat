import React, { useEffect, useMemo, useRef, useState } from "react";
import "./WordImages.css";

const WordImages = ({ word }) => {
	const [images, setImages] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const requestIdRef = useRef(0);

	const normalizedWord = useMemo(() => (word || "").trim(), [word]);

	useEffect(() => {
		const run = async () => {
			const currentRequestId = requestIdRef.current + 1;
			requestIdRef.current = currentRequestId;

			if (!normalizedWord) {
				setImages([]);
				setError("");
				setIsLoading(false);
				return;
			}

			setIsLoading(true);
			setError("");
			setImages([]);

			try {
				const endpoint =
					"https://ja.wikipedia.org/w/api.php?action=query&generator=search" +
					`&gsrsearch=${encodeURIComponent(normalizedWord)}` +
					"&gsrlimit=5&prop=pageimages&pithumbsize=640&format=json&origin=*";

				const response = await fetch(endpoint);
				if (!response.ok) {
					throw new Error("Không thể kết nối nguồn ảnh.");
				}

				const data = await response.json();
				const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
				const nextImages = pages
					.map((page) => page?.thumbnail?.source)
					.filter(Boolean)
					.slice(0, 3);

				if (requestIdRef.current !== currentRequestId) {
					return;
				}

				setImages(nextImages);
				setError("");
			} catch (err) {
				if (requestIdRef.current !== currentRequestId) {
					return;
				}
				setImages([]);
				setError(err.message || "Không thể tải ảnh minh họa.");
			}

			setIsLoading(false);
		};

		run();
	}, [normalizedWord]);

	const googleUrl = normalizedWord
		? `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(normalizedWord)}`
		: "https://www.google.com/imghp";

	return (
		<div className="word-images-block">
			<div className="word-images-header">
				<div className="word-images-title">Hình ảnh từ vựng</div>
				<a href={googleUrl} target="_blank" rel="noreferrer">
					Xem thêm...
				</a>
			</div>

			{isLoading && <p className="word-images-status">Đang tải ảnh...</p>}

			{error && <p className="word-images-status error">{error}</p>}

			{!isLoading && !error && images.length === 0 && (
				<p className="word-images-status">Chưa có ảnh minh họa cho từ này.</p>
			)}

			{images.length > 0 && (
				<div className="word-images-grid">
					{images.map((imageUrl, index) => (
						<figure className="word-image-card" key={`${imageUrl}-${index}`}>
							<div className="word-image-frame">
								<img src={imageUrl} alt={`${normalizedWord} ${index + 1}`} />
							</div>
							<figcaption>Ảnh {index + 1}</figcaption>
						</figure>
					))}
				</div>
			)}
		</div>
	);
};

export default WordImages;
