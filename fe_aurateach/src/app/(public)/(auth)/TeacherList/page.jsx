// TeacherList/page.jsx
import styles from "./page.module.css";

const quickFilters = [
	"Toán học",
	"Ngữ văn",
	"Tieng Anh",
	"Vật lý",
	"Hóa học",
	"Sinh học",
	"Lịch sử",
	"Địa lý",
];

const tutors = [
	{
		id: 1,
		name: "Nguyễn Tùng Dương",
		rating: 4.9,
		reviews: 128,
		location: "Bách Khoa",
		desc: "Mình là sinh viên năm 3 ĐH Bách Khoa, có kinh nghiệm gia sư môn Toán và Lý lớp 10-12.",
		tags: ["Gia sư Toán THCS", "Lý lớp 10-12"],
		avatar:
			"https://images.unsplash.com/photo-1628157588553-5eeea00af15c?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 2,
		name: "Nguyễn Hoàng Phương",
		rating: 5.0,
		reviews: 98,
		location: "Pháp Ngữ",
		desc: "Sinh viên khoa Sư phạm Ngữ văn, nhiệt tình và có phương pháp học văn mới lạ, không khô cứng.",
		tags: ["Luyện thi đại học", "Tiếng Anh giao tiếp"],
		avatar:
			"https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 3,
		name: "Vũ Ngọc Bảo Thy",
		rating: 4.8,
		reviews: 42,
		location: "Bách Khoa",
		desc: "Gia sư với tư duy tượng hình lập luận, chuyên rèn chữ đẹp và bồi dưỡng Toán, Tiếng Việt.",
		tags: ["Giáo viên cấp 1", "Nền nếp đẹp"],
		avatar:
			"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 4,
		name: "Lê Vũ Gia Bảo",
		rating: 4.7,
		reviews: 218,
		location: "Đại học Đà Nẵng",
		desc: "Với phương pháp giải nhanh trắc nghiệm môn Hóa, thầy đã giúp hàng trăm học sinh đạt điểm cao.",
		tags: ["Luyện thi Hóa", "Hóa học kỳ 12"],
		avatar:
			"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 5,
		name: "Lương Hoài Nhật Linh",
		rating: 4.9,
		reviews: 151,
		location: "Cần Thơ",
		desc: "Bản thân em đã có kinh nghiệm gia sư cả online và offline cho nhiều học sinh từ lớp 6 đến lớp 10.",
		tags: ["Cấp 2", "Cực dễ hiểu"],
		avatar:
			"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 6,
		name: "Nguyễn Hoàng Duy",
		rating: 0.0,
		reviews: 0,
		location: "FPT Uni",
		desc: "Thân thiện, hoạt bát, diễn đạt theo lộ trình dạy hiện đại giúp học sinh tiếp thu kiến thức nhanh hơn.",
		tags: ["SQL", "Database"],
		avatar:
			"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 7,
		name: "Nguyễn Quỳnh Nga",
		rating: 4.5,
		reviews: 112,
		location: "Hà Nội",
		desc: "Em là sinh viên năm 2 Đại học Kinh tế Quốc dân. Đã có kinh nghiệm dạy gia sư trực tiếp cho nhiều bé.",
		tags: ["Mobile Dev", "Flutter"],
		avatar:
			"https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=140&q=80",
	},
	{
		id: 8,
		name: "Trần Nguyễn Khánh Vy",
		rating: 4.8,
		reviews: 183,
		location: "Đại học Nam",
		desc: "Với niềm đam mê văn chương và khoa học tự nhiên cân bằng, mình luôn tìm tòi những phương pháp học vui.",
		tags: ["PHP", "Laravel"],
		avatar:
			"https://images.unsplash.com/photo-1542204625-de293a9b7b1a?auto=format&fit=crop&w=140&q=80",
	},
];

function StarIcon() {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path d="M12 3.5l2.72 5.51 6.08.89-4.4 4.28 1.04 6.05L12 17.38l-5.44 2.85 1.04-6.05-4.4-4.28 6.08-.89L12 3.5z" />
		</svg>
	);
}

export default function TeacherListPage() {
	return (
		<main className={styles.teacherListPage}>
			<section className={`container-center ${styles.searchSection}`}>
				<div className={styles.searchCard}>
					<h1>Khám phá Gia sư tài năng</h1>
					<p>
						Tìm kiếm người đồng hành hoàn hảo cho hành trình học tập của bạn. Hàng
						ngàn gia sư chất lượng cao đã sẵn sàng hỗ trợ bạn.
					</p>

					<form className={styles.searchForm}>
						<div className={styles.inputWrap}>
							<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
								<path
									d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
									stroke="currentColor"
									strokeWidth="1.8"
									strokeLinecap="round"
								/>
							</svg>
							<input
								type="text"
								placeholder="Tên gia sư, môn học..."
								aria-label="Tìm kiếm gia sư"
							/>
						</div>
						<button type="submit">Tìm kiếm</button>
					</form>

					<div className={styles.quickFilter}>
						<span>Phổ biến:</span>
						<div>
							{quickFilters.map((item) => (
								<button type="button" key={item}>
									{item}
								</button>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className={`container-center ${styles.listSection}`}>
				<div className={styles.listHead}>
					<h2>959 gia sư phù hợp</h2>
					<button type="button" className={styles.sortBtn}>
						Mới nhất
						<span>▾</span>
					</button>
				</div>

				<div className={styles.grid}>
					{tutors.map((tutor) => (
						<article className={styles.card} key={tutor.id}>
							<div className={styles.cardTop}>
								<img src={tutor.avatar} alt={tutor.name} />
								<div className={styles.rating}>
									<span className={styles.star}>
										<StarIcon />
									</span>
									<span>{tutor.rating.toFixed(1)}</span>
									<small>({tutor.reviews})</small>
								</div>
							</div>

							<h3>{tutor.name}</h3>
							<p className={styles.meta}>Gia sư tại {tutor.location}</p>
							<p className={styles.desc}>{tutor.desc}</p>

							<div className={styles.tags}>
								{tutor.tags.map((tag) => (
									<span key={tag}>{tag}</span>
								))}
							</div>

							<button type="button" className={styles.detailBtn}>
								Xem chi tiết
							</button>
						</article>
					))}
				</div>

				<div className={styles.pagination}>
					<button type="button">Trước</button>
					<button type="button" className={styles.activePage}>
						1
					</button>
					<button type="button">2</button>
					<button type="button">3</button>
					<span>...</span>
					<button type="button">10</button>
					<button type="button">Sau</button>
				</div>
			</section>
		</main>
	);
}