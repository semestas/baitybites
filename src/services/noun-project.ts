
import OAuth from 'oauth-1.0a';
import CryptoJS from 'crypto-js';

export class NounProjectService {
    private oauth: OAuth;
    private key: string;
    private secret: string;
    private baseUrl = 'https://api.thenounproject.com/v2';

    constructor() {
        this.key = process.env.NOUN_PROJECT_KEY || '';
        this.secret = process.env.NOUN_PROJECT_SECRET || '';

        this.oauth = new OAuth({
            consumer: {
                key: this.key,
                secret: this.secret,
            },
            signature_method: 'HMAC-SHA1',
            hash_function(base_string, key) {
                return CryptoJS.HmacSHA1(base_string, key).toString(CryptoJS.enc.Base64);
            },
        });
    }

    async getIconByTerm(term: string) {
        const url = `${this.baseUrl}/icon?query=${term}&limit=1`;
        const request_data = {
            url: url,
            method: 'GET',
        };

        const headers = this.oauth.toHeader(this.oauth.authorize(request_data)) as any;

        const response = await fetch(url, {
            headers: {
                ...headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Noun Project API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.icons?.[0] || null;
    }

    async getIconById(id: string) {
        const url = `${this.baseUrl}/icon/${id}`;
        const request_data = {
            url: url,
            method: 'GET',
        };

        const headers = this.oauth.toHeader(this.oauth.authorize(request_data)) as any;

        const response = await fetch(url, {
            headers: {
                ...headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Noun Project API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.icon;
    }
}

export const nounProject = new NounProjectService();
