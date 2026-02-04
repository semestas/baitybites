import { v2 as cloudinary } from 'cloudinary';

// The CLOUDINARY_URL environment variable is automatically read by the SDK
// But we can ensure config just in case or for debugging
cloudinary.config({
    secure: true
});

export const uploadToCloudinary = async (file: File, folder: string = 'baitybites'): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'auto',
                    transformation: [
                        {
                            width: 1000,
                            crop: 'limit', // Resize only if larger than 1000px
                            quality: 'auto', // Automatic quality optimization
                            fetch_format: 'auto' // Automatic format selection (WebP for modern browsers)
                        }
                    ]
                },
                (error, result) => {
                    if (error) {
                        console.error('Cloudinary error:', error);
                        return reject(error);
                    }
                    if (!result) {
                        return reject(new Error('No result from Cloudinary'));
                    }
                    resolve(result.secure_url);
                }
            );
            uploadStream.end(buffer);
        });
    } catch (error) {
        console.error('Cloudinary upload failed:', error);
        throw error;
    }
};
