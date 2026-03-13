const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
require("dotenv").config();
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_NAME,
	api_key: process.env.CLOUDINARY_KEY,
	api_secret: process.env.CLOUDINARY_SECRET,
});

const storage = new CloudinaryStorage({
	cloudinary,
	params: async (req, file) => {
		const isVideo = (file.mimetype || "").startsWith("video/");
		const allowedFormats = isVideo
			? ["mp4", "webm", "mov"]
			: ["jpg", "png", "jpeg", "webp", "jfif"];
		return {
			folder: "SocialMedia",
			resource_type: isVideo ? "video" : "image",
			allowed_formats: allowedFormats,
		};
	},
});

// Default uploader (images and small files)
const uploadCloud = multer({
	storage,
	limits: { fileSize: 10 * 1024 * 1024 },
}); // 10MB per file

// Media uploader (supports larger video files)
const uploadMedia = multer({
	storage,
	limits: { fileSize: 500 * 1024 * 1024 }, // up to ~500MB for videos
});

module.exports = {
	uploadCloud,
	uploadMedia,
};
