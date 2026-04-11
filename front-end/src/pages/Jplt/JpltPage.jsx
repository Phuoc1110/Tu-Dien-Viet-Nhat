import React from "react";
import { useHistory } from "react-router-dom";
import { GraduationCap, Layers3, Medal, Repeat2 } from "lucide-react";
import "./JpltPage.css";

const jpltLevels = [
	{
		level: "N5",
		description: "Làm quen nền tảng chữ, từ vựng và mẫu câu cơ bản.",
		icon: Layers3,
	},
	{
		level: "N4",
		description: "Mở rộng cấu trúc ngữ pháp và đọc hiểu ngắn.",
		icon: Repeat2,
	},
	{
		level: "N3",
		description: "Tăng tốc từ vựng, nghe và đọc cho học tập thực tế.",
		icon: GraduationCap,
	},
	{
		level: "N2",
		description: "Luyện chuyên sâu cho tài liệu học thuật và công việc.",
		icon: Medal,
	},
	{
		level: "N1",
		description: "Ôn tập chiến lược để chinh phục cấp độ cao nhất.",
		icon: Medal,
	},
];

const JpltPage = () => {
	const history = useHistory();

	return (
		<div className="jplt-page">
			<section className="jplt-hero">
				<div className="jplt-hero-copy">
					<div className="jplt-kicker">
						<GraduationCap size={16} />
						<span>JPLT</span>
					</div>
					<h1>Lộ trình luyện thi JPLT</h1>
					<p>
						Chọn nhanh cấp độ bạn muốn ôn tập để đi vào bộ nội dung phù hợp hơn,
						giảm thời gian dò tìm.
					</p>
					<button type="button" onClick={() => history.push("/")}>
						Quay về trang chủ
					</button>
				</div>
				<div className="jplt-hero-card">
					<h2>Học theo cấp độ</h2>
					<p>Đi từ nền tảng đến nâng cao theo từng mức N5 đến N1.</p>
				</div>
			</section>

			<section className="jplt-grid">
				{jpltLevels.map((item) => {
					const Icon = item.icon;
					return (
						<article className="jplt-card" key={item.level}>
							<div className="jplt-card-top">
								<div className="jplt-card-icon">
									<Icon size={20} />
								</div>
								<span>{item.level}</span>
							</div>
							<p>{item.description}</p>
						</article>
					);
				})}
			</section>
		</div>
	);
};

export default JpltPage;
