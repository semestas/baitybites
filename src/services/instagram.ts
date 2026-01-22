import type { Sql } from "../db/schema";

interface InstagramMedia {
    id: string;
    media_url: string;
    caption?: string;
    timestamp: string;
    like_count?: number;
    comments_count?: number;
}

export class InstagramService {
    private db: Sql;

    constructor(db: Sql) {
        this.db = db;
    }

    private async getAccessToken(): Promise<string | null> {
        const [setting] = await this.db`SELECT value FROM settings WHERE key = 'instagram_access_token' LIMIT 1`;
        return setting ? setting.value : (process.env.INSTAGRAM_ACCESS_TOKEN || null);
    }

    async syncGallery() {
        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            console.warn("Instagram Access Token not configured.");
            return { success: false, message: "Token not configured" };
        }

        try {
            const url = `https://graph.instagram.com/me/media?fields=id,media_url,caption,timestamp,like_count,comments_count&access_token=${accessToken}`;
            const response = await fetch(url);
            const result = (await response.json()) as any;

            if (!result.data) {
                throw new Error(result.error?.message || "Failed to fetch Instagram media");
            }

            const allMedia = result.data as InstagramMedia[];

            // 1. Slide 1-3: The most recent posts
            const recentPosts = [...allMedia]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 3);

            // 2. Slide 4-6: The most likes/comments (excluding the ones already in Recent)
            const recentIds = new Set(recentPosts.map(p => p.id));
            const popularPosts = [...allMedia]
                .filter(p => !recentIds.has(p.id)) // "not the last three posts" (assuming last = recent)
                .sort((a, b) => {
                    const scoreA = (a.like_count || 0) + (a.comments_count || 0);
                    const scoreB = (b.like_count || 0) + (b.comments_count || 0);
                    return scoreB - scoreA;
                })
                .slice(0, 3);

            // 3. Update Gallery
            // We only replace items with source='instagram'. 
            // This allows manual items to exist if they have different display_order, 
            // but effectively we are reserving slots 1-6 for Instagram if they exist.
            await this.db.begin(async (sql: any) => {
                await sql`DELETE FROM gallery WHERE source = 'instagram'`;

                // Insert Recent (Slots 1-3)
                for (let i = 0; i < recentPosts.length; i++) {
                    const p = recentPosts[i];
                    if (!p) continue;
                    await sql`
                        INSERT INTO gallery (image_url, title, description, display_order, source, external_id, engagement_score)
                        VALUES (${p.media_url}, 'IG Recent', ${p.caption || ''}, ${i + 1}, 'instagram', ${p.id}, ${(p.like_count || 0) + (p.comments_count || 0)})
                    `;
                }

                // Insert Popular (Slots 4-6)
                for (let i = 0; i < popularPosts.length; i++) {
                    const p = popularPosts[i];
                    if (!p) continue;
                    await sql`
                        INSERT INTO gallery (image_url, title, description, display_order, source, external_id, engagement_score)
                        VALUES (${p.media_url}, 'IG Popular', ${p.caption || ''}, ${i + 4}, 'instagram', ${p.id}, ${(p.like_count || 0) + (p.comments_count || 0)})
                    `;
                }
            });

            return {
                success: true,
                message: `Sync successful. Updated ${recentPosts.length} recent and ${popularPosts.length} popular items.`
            };
        } catch (error: any) {
            console.error("Instagram Sync Error:", error);
            return { success: false, message: error.message };
        }
    }
}
