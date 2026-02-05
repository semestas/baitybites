import { v2 as cloudinary } from 'cloudinary';

// Cloudinary automatically reads CLOUDINARY_URL from env, but let's be explicit to ensure it's picked up
if (process.env.CLOUDINARY_URL) {
    const url = process.env.CLOUDINARY_URL;
    const matches = url.match(/cloudinary:\/\/(\d+):([^@]+)@([^/]+)/);
    if (matches) {
        cloudinary.config({
            cloud_name: matches[3],
            api_key: matches[1],
            api_secret: matches[2],
            secure: true
        });
        // console.log("Cloudinary configured via URL parsing");
    } else {
        cloudinary.config({ secure: true });
    }
} else {
    cloudinary.config({ secure: true });
}

export const uploadToCloudinary = async (file: File, folder: string = 'baitybites'): Promise<string> => {
    // console.log(`Starting Cloudinary upload for file: ${file.name}, size: ${file.size}`);
    const config = cloudinary.config();
    if (!config.api_key) {
        console.error("Cloudinary Error: API Key is missing. Please check CLOUDINARY_URL environment variable.");
        throw new Error("Cloudinary configuration failed: API Key missing. Please set CLOUDINARY_URL.");
    }
    try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Cloudinary upload timed out (50s)'));
            }, 50000);

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'auto',
                    transformation: [
                        {
                            width: 1000,
                            crop: 'limit',
                            quality: 'auto',
                            fetch_format: 'auto'
                        }
                    ]
                },
                (error, result) => {
                    clearTimeout(timeout);
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
