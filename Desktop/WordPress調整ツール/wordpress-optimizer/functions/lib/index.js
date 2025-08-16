"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConfig = exports.healthCheck = exports.aggregateUsageStats = exports.proxyRequest = exports.getSecureKey = exports.storeSecureKey = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");
admin.initializeApp();
const corsHandler = cors({ origin: true });
// セキュアなAPIキー保存・取得機能
exports.storeSecureKey = functions.https.onCall(async (data, context) => {
    try {
        const { userId, encryptedKey } = data;
        if (!userId || !encryptedKey) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
        }
        // Firestoreにセキュアに保存
        await admin.firestore()
            .collection("secure_keys")
            .doc(userId)
            .set({
            encryptedKey,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error storing secure key:", error);
        throw new functions.https.HttpsError('internal', 'Failed to store secure key');
    }
});
exports.getSecureKey = functions.https.onCall(async (data, context) => {
    try {
        const { userId } = data;
        if (!userId) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing userId parameter');
        }
        const doc = await admin.firestore()
            .collection("secure_keys")
            .doc(userId)
            .get();
        if (!doc.exists) {
            return { encryptedKey: null };
        }
        const docData = doc.data();
        return { encryptedKey: (docData === null || docData === void 0 ? void 0 : docData.encryptedKey) || null };
    }
    catch (error) {
        console.error("Error getting secure key:", error);
        throw new functions.https.HttpsError('internal', 'Failed to get secure key');
    }
});
// プロキシ機能（CORS回避用）
exports.proxyRequest = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            if (req.method !== "POST") {
                res.status(405).send("Method not allowed");
                return;
            }
            const { url, method, headers, body } = req.body;
            if (!url) {
                res.status(400).send("Missing URL parameter");
                return;
            }
            // セキュリティ: 許可されたドメインのみ
            const allowedDomains = [
                "generativelanguage.googleapis.com",
                // WordPressサイトは動的に追加される想定
            ];
            const urlObj = new URL(url);
            const isAllowed = allowedDomains.some(domain => urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`));
            if (!isAllowed) {
                res.status(403).send("Domain not allowed");
                return;
            }
            // プロキシリクエスト実行
            const response = await fetch(url, {
                method: method || "GET",
                headers: headers || {},
                body: body ? JSON.stringify(body) : undefined,
            });
            const responseData = await response.text();
            res.status(response.status).json({
                data: responseData,
                status: response.status,
                headers: Object.fromEntries(response.headers.entries()),
            });
        }
        catch (error) {
            console.error("Proxy request error:", error);
            res.status(500).send("Proxy request failed");
        }
    });
});
// 使用統計の集約（オプション）
exports.aggregateUsageStats = functions.firestore
    .document("usage_logs/{logId}")
    .onCreate(async (snap, context) => {
    try {
        const data = snap.data();
        const userId = data.userId;
        const date = new Date().toISOString().split("T")[0];
        // 日別統計を更新
        const statsRef = admin.firestore()
            .collection("usage_stats")
            .doc(`${userId}_${date}`);
        await statsRef.set({
            userId,
            date,
            apiCalls: admin.firestore.FieldValue.increment(1),
            tokensUsed: admin.firestore.FieldValue.increment(data.tokensUsed || 0),
            estimatedCost: admin.firestore.FieldValue.increment(data.estimatedCost || 0),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error("Error aggregating usage stats:", error);
    }
});
// ヘルスチェック
exports.healthCheck = functions.https.onCall(async (data, context) => {
    return {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    };
});
// 設定バリデーション
exports.validateConfig = functions.https.onCall(async (data, context) => {
    try {
        const { config } = data;
        // 基本的なバリデーション
        const validations = {
            hasGeminiKey: !!config.geminiApiKey,
            hasSites: config.sites && config.sites.length > 0,
            hasValidModel: ["gemini-2.5-pro", "gemini-2.5-flash"].includes(config.selectedModel),
        };
        const isValid = Object.values(validations).every(Boolean);
        return {
            isValid,
            validations,
            recommendations: generateRecommendations(validations),
        };
    }
    catch (error) {
        console.error("Config validation error:", error);
        throw new functions.https.HttpsError("internal", "Validation failed");
    }
});
function generateRecommendations(validations) {
    const recommendations = [];
    if (!validations.hasGeminiKey) {
        recommendations.push("Gemini APIキーを設定してください");
    }
    if (!validations.hasSites) {
        recommendations.push("WordPressサイトを少なくとも1つ登録してください");
    }
    if (!validations.hasValidModel) {
        recommendations.push("有効なGeminiモデルを選択してください");
    }
    return recommendations;
}
//# sourceMappingURL=index.js.map