package com.example.sentriflow.sms

import org.junit.Assert.*
import org.junit.Test

class RuleEngineTest {

    // ── Legitimate messages ───────────────────────────────────────────────────

    @Test
    fun `genuine OTP from bank produces low score`() {
        val result = RuleEngine.analyze(
            sender = "VM-HDFCBK",
            body = "Your OTP for login is 482931. Valid for 10 minutes. Do not share."
        )
        assertTrue("Expected low risk for bank OTP: ${result.score}", result.score < 0.45f)
    }

    @Test
    fun `delivery notification produces low score`() {
        val result = RuleEngine.analyze(
            sender = "DM-AMZN",
            body = "Your Amazon order #123-456 has been delivered. Thank you for shopping with us."
        )
        assertTrue("Expected safe score: ${result.score}", result.score < 0.25f)
    }

    // ── High-risk scam patterns ───────────────────────────────────────────────

    @Test
    fun `APK download link triggers apk_download flag and high score`() {
        val result = RuleEngine.analyze(
            sender = "9876543210",
            body = "Install this app now: http://malicious.xyz/update.apk"
        )
        assertTrue("apk_download flag expected", "apk_download" in result.flags)
        assertTrue("High risk expected for APK link: ${result.score}", result.score >= 0.45f)
    }

    @Test
    fun `OTP sharing request triggers sensitive_data_request flag`() {
        val result = RuleEngine.analyze(
            sender = "9876543210",
            body = "Please share your OTP with our agent to complete the KYC verification."
        )
        assertTrue("sensitive_data_request flag expected", "sensitive_data_request" in result.flags)
        assertTrue("High risk expected: ${result.score}", result.score >= 0.45f)
    }

    @Test
    fun `prize scam triggers prize_scam flag`() {
        val result = RuleEngine.analyze(
            sender = "8800001234",
            body = "Congratulations! You have won a prize of Rs 50,000 in our lucky draw. Claim your reward now!"
        )
        assertTrue("prize_scam flag expected", "prize_scam" in result.flags)
    }

    @Test
    fun `impersonation of government agency triggers impersonation flag`() {
        val result = RuleEngine.analyze(
            sender = "1234567890",
            body = "This is a notice from the Income Tax department. Legal action will be taken."
        )
        assertTrue("impersonation flag expected", "impersonation" in result.flags)
    }

    @Test
    fun `KYC scam triggers kyc_verification flag`() {
        val result = RuleEngine.analyze(
            sender = "VM-KYCSMS",
            body = "Your KYC is expiring. Update your PAN card and Aadhaar immediately to avoid account suspension."
        )
        assertTrue("kyc_verification flag expected", "kyc_verification" in result.flags)
        assertTrue("financial_threat flag expected", "financial_threat" in result.flags)
    }

    @Test
    fun `suspicious shortened link triggers shortened_link flag`() {
        val result = RuleEngine.analyze(
            sender = "VM-SCAMLNK",
            body = "Click here to verify your account: bit.ly/abc123"
        )
        assertTrue("shortened_link flag expected", "shortened_link" in result.flags)
    }

    @Test
    fun `payment request triggers payment_request flag`() {
        val result = RuleEngine.analyze(
            sender = "9123456789",
            body = "Send money Rs 5000 to your friend now. Pay now using UPI."
        )
        assertTrue("payment_request flag expected", "payment_request" in result.flags)
    }

    // ── ML escalation decision ────────────────────────────────────────────────

    @Test
    fun `score above 0_85 means should NOT escalate to ML`() {
        // A message designed to max out the rule score
        val result = RuleEngine.analyze(
            sender = "9876543210",
            body = "URGENT! Share OTP with RBI officer immediately. KYC expiring. " +
                "Pay Rs 500 now or account will be blocked. Click here: http://malicious.xyz/update.apk"
        )
        assertTrue("Expected very high score: ${result.score}", result.score >= 0.85f)
        assertFalse("Should NOT escalate to ML when rules are certain", result.shouldEscalateToML)
    }

    @Test
    fun `score below 0_15 means should NOT escalate to ML`() {
        val result = RuleEngine.analyze(
            sender = "DM-AMZN",
            body = "Hi, your package is out for delivery today."
        )
        assertTrue("Expected very low score: ${result.score}", result.score < 0.15f)
        assertFalse("Should NOT escalate to ML for clearly safe messages", result.shouldEscalateToML)
    }

    @Test
    fun `ambiguous message in middle range should escalate to ML`() {
        val result = RuleEngine.analyze(
            sender = "VMBANK",
            body = "Your account has been temporarily limited. Please verify your details."
        )
        // Should be in the ambiguous zone (0.15–0.85)
        assertTrue("Score should be in ML escalation range: ${result.score}",
            result.score in 0.15f..0.85f)
        assertTrue("Should escalate to ML for ambiguous messages", result.shouldEscalateToML)
    }

    // ── Sender analysis ───────────────────────────────────────────────────────

    @Test
    fun `numeric sender triggers unknown_sender flag`() {
        val result = RuleEngine.analyze(
            sender = "9876543210",
            body = "Hi, how are you?"
        )
        assertTrue("unknown_sender flag expected for 10-digit number",
            "unknown_sender" in result.flags)
    }

    @Test
    fun `alphabetic short code does not trigger unknown_sender`() {
        val result = RuleEngine.analyze(
            sender = "HDFCBK",
            body = "Your balance is Rs 10,000."
        )
        assertFalse("HDFCBK is a known short code, not an unknown sender",
            "unknown_sender" in result.flags)
    }

    // ── Score boundaries ─────────────────────────────────────────────────────

    @Test
    fun `score is clamped between 0 and 1`() {
        val result = RuleEngine.analyze(
            sender = "9876543210",
            body = "URGENT URGENT share OTP pin cvv card number APK install KYC RBI police blocked click here bit.ly/x"
        )
        assertTrue("Score must not exceed 1.0: ${result.score}", result.score <= 1.0f)
        assertTrue("Score must not be negative: ${result.score}", result.score >= 0.0f)
    }
}
