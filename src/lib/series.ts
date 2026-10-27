import { z } from "zod";

export type Series = {
  id: string;
  title: string;
  contentType?: "donghua" | "anime";
  episode: string;
  episodeUpdatedAt?: string;
  genre: string;
  rating: string;
  views: string;
  viewCount?: number;
  status: "Ongoing" | "Tamat" | "Segera hadir";
  image: string;
  bannerImage?: string;
  featured?: boolean;
  color: string;
  summary: string;
};

export const publicSeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  contentType: z.enum(["donghua", "anime"]),
  episode: z.string(),
  episodeUpdatedAt: z.string().datetime({ offset: true }).optional(),
  genre: z.string(),
  rating: z.string(),
  views: z.string(),
  viewCount: z.number().optional(),
  status: z.enum(["Ongoing", "Tamat", "Segera hadir"]),
  image: z.string(),
  bannerImage: z.string().optional(),
  featured: z.boolean().optional(),
  color: z.string(),
  summary: z.string(),
});

export const series: Series[] = [
  {
    id: "renegade-immortal",
    title: "Renegade Immortal",
    episode: "EP 164",
    genre: "Fantasi",
    rating: "9.4",
    views: "306 rb",
    status: "Ongoing",
    image: "photo-1518709268805-4e9042af9f23",
    color: "#6e275d",
    summary: "Wang Lin menapaki jalan kultivasi yang berliku, menghadapi takdir dan rahasia kuno di dunia para abadi.",
  },
  {
    id: "the-supreme-dantian",
    title: "The Supreme Dantian",
    episode: "EP 34",
    genre: "Aksi",
    rating: "9.1",
    views: "15 rb",
    status: "Ongoing",
    image: "photo-1519608487953-e999c86e7455",
    color: "#373f9c",
    summary: "Sebuah dantian misterius mengubah hidup seorang pemuda dan membawanya menuju puncak dunia persilatan.",
  },
  {
    id: "primeval-overlord",
    title: "Primeval Overlord",
    episode: "EP 27",
    genre: "Petualangan",
    rating: "8.8",
    views: "19 rb",
    status: "Ongoing",
    image: "photo-1470252649378-9c29740c9fa8",
    color: "#28747b",
    summary: "Di tengah benua yang dipenuhi klan kuno, seorang pendekar muda memburu kekuatan yang telah lama hilang.",
  },
  {
    id: "tales-of-demons",
    title: "Tales of Demons and Gods",
    episode: "EP 470",
    genre: "Fantasi",
    rating: "9.2",
    views: "213 rb",
    status: "Ongoing",
    image: "photo-1462331940025-496dfbfc7564",
    color: "#6f334a",
    summary: "Nie Li terlahir kembali dengan pengetahuan masa depan. Kali ini, ia akan melindungi kota dan orang-orang yang dicintainya.",
  },
  {
    id: "tales-herding-gods",
    title: "Tales of Herding Gods",
    episode: "EP 106",
    genre: "Petualangan",
    rating: "9.0",
    views: "189 rb",
    status: "Ongoing",
    image: "photo-1451187580459-43490279c0fa",
    color: "#265a65",
    summary: "Di sebuah desa terpencil, seorang anak dibesarkan oleh para tetua misterius dan bersiap mengungkap dunia di luar sana.",
  },
  {
    id: "golden-curse",
    title: "Golden Curse",
    episode: "EP 12",
    genre: "Aksi",
    rating: "8.6",
    views: "10 rb",
    status: "Ongoing",
    image: "photo-1534796636912-3b95b3ab5986",
    color: "#78602e",
    summary: "Kutukan emas membangkitkan kekuatan kuno sekaligus memulai perburuan yang mengguncang seluruh kerajaan.",
  },
  {
    id: "battle-through-heavens",
    title: "Battle Through the Heavens",
    episode: "EP 215",
    genre: "Aksi",
    rating: "9.5",
    views: "266 rb",
    status: "Ongoing",
    image: "photo-1519681393784-d120267933ba",
    color: "#5c3430",
    summary: "Xiao Yan berlatih tanpa henti untuk memenuhi janji lama dan membuktikan bahwa kejayaan dapat diraih kembali.",
  },
  {
    id: "a-mortals-journey",
    title: "A Mortal's Journey",
    episode: "EP 196",
    genre: "Fantasi",
    rating: "9.3",
    views: "31 rb",
    status: "Ongoing",
    image: "photo-1518837695005-2083093ee35b",
    color: "#315c78",
    summary: "Seorang pemuda biasa menempuh jalan panjang menuju keabadian, selangkah demi selangkah.",
  },
  {
    id: "soul-land",
    title: "Soul Land II",
    episode: "EP 175",
    genre: "Petualangan",
    rating: "9.1",
    views: "83 rb",
    status: "Ongoing",
    image: "photo-1500530855697-b586d89ba3ee",
    color: "#39694e",
    summary: "Era baru dimulai saat generasi muda membangkitkan jiwa bela diri dan menantang batas kekuatannya.",
  },
  {
    id: "jade-dynasty",
    title: "Jade Dynasty",
    episode: "Tamat",
    genre: "Fantasi",
    rating: "9.0",
    views: "72 rb",
    status: "Tamat",
    image: "photo-1500534623283-312aade485b7",
    color: "#427b78",
    summary: "Pertarungan antara kebaikan dan kegelapan menguji kesetiaan seorang murid pada jalan yang ia pilih.",
  },
  {
    id: "beyond-times-gaze",
    title: "Beyond Time's Gaze",
    episode: "EP 44",
    genre: "Fantasi",
    rating: "8.9",
    views: "99 rb",
    status: "Ongoing",
    image: "photo-1534447677768-be436bb09401",
    color: "#3d3974",
    summary: "Rahasia langit terungkap saat seorang pengembara menemukan jejak peradaban yang telah lama terlupakan.",
  },
  {
    id: "great-ruler",
    title: "The Great Ruler",
    episode: "EP 95",
    genre: "Aksi",
    rating: "9.2",
    views: "72 rb",
    status: "Tamat",
    image: "photo-1511497584788-876760111969",
    color: "#30566b",
    summary: "Mu Chen meninggalkan kampung halamannya demi menaklukkan dunia luas dan menjadi penguasa yang sesungguhnya.",
  },
];

export const featured = [series[0], series[3], series[6]];
export const categories = ["Semua", "Aksi", "Fantasi", "Petualangan"];
export const popular = [series[0], series[6], series[4], series[10], series[8]];
export const imageUrl = (id: string, width = 1000) =>
  id.startsWith("http")
    ? id
    : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`;
