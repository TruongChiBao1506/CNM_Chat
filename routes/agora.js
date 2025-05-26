const express = require('express');
const router = express.Router();
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

// Lấy từ Agora Console
const appID = "58a57bf3ead5405087e8444784154f5b";
const appCertificate = ""; // Thay bằng App Certificate của bạn

router.get('/rtc-token', (req, res) => {
    // Log để debug
    console.log('📢 API token được gọi với params:', req.query);

    // Lấy thông tin từ query params
    const channelName = req.query.channel;
    const uid = parseInt(req.query.uid) || 0;
    const role = RtcRole.PUBLISHER;

    // Kiểm tra thông tin bắt buộc
    if (!channelName) {
        console.error('❌ Thiếu tham số channel');
        return res.status(400).json({ error: 'Channel name is required' });
    }

    // Tạo token với thời hạn 1 giờ
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTimestamp = currentTimestamp + expirationTimeInSeconds;

    // Tạo token
    try {
        const token = RtcTokenBuilder.buildTokenWithUid(
            appID,
            appCertificate,
            channelName,
            uid,
            role,
            privilegeExpireTimestamp
        );

        console.log(`✅ Đã tạo token cho kênh ${channelName}, uid: ${uid}`);
        console.log(`✅ Token: ${token.substring(0, 20)}...`);

        // Kiểm tra token có phải là ASCII string
        if (!/^[\x00-\x7F]*$/.test(token)) {
            console.error('❌ Token không phải là ASCII string');
            return res.status(500).json({ error: 'Generated token is not valid ASCII' });
        }

        return res.json({ token });
    } catch (error) {
        console.error('❌ Lỗi khi tạo token:', error);
        return res.status(500).json({ error: 'Failed to generate token' });
    }
});

module.exports = router;