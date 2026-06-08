package com.example.sentriflow.sms

/**
 * Fast heuristic pre-filter for SMS scam detection.
 *
 * Runs BEFORE the TinyBERT model (~1ms) to:
 *   - Short-circuit obvious scams (score > 0.85 → skip ML)
 *   - Short-circuit obvious safe messages (score < 0.15 → skip ML)
 *   - Provide additional signal for combined scoring
 *
 * Detects: suspicious URLs, urgency language, impersonation, shortened links,
 *          APK downloads, suspicious domains, excessive caps, money requests.
 */
object RuleEngine {

    data class RuleResult(
        val score: Float,
        val flags: List<String>,
        val shouldEscalateToML: Boolean,
        val details: Map<String, Any> = emptyMap()
    )

    // ── Trusted domains — URLs from these hosts are not flagged ─────────────
    private val TRUSTED_DOMAINS = setOf(
        // Telecom
        "airtel.in", "airtel.com", "jio.com", "vodafone.in", "vi.in", "bsnl.co.in",
        // Banks (official domains only — not subdomains of spoofed sites)
        "sbi.co.in", "onlinesbi.sbi", "hdfcbank.com", "icicibank.com", "axisbank.com",
        "kotak.com", "pnbindia.in", "bankofbaroda.in", "canarabank.in", "yesbank.in",
        "indusind.com", "federalbank.co.in", "idfcfirstbank.com", "rbi.org.in",
        // UPI / payments
        "npci.org.in", "bhimupi.org.in", "paytm.com", "phonepe.com", "gpay.app",
        // E-commerce / delivery
        "amazon.in", "amazon.com", "flipkart.com", "myntra.com", "meesho.com",
        "swiggy.com", "zomato.com", "bigbasket.com", "nykaa.com", "dunzo.com",
        // Government
        "gov.in", "nic.in", "uidai.gov.in", "incometax.gov.in", "mca.gov.in",
        // Big tech
        "google.com", "apple.com", "microsoft.com", "youtube.com",
    )

    private fun isTrustedUrl(url: String): Boolean {
        return try {
            val host = java.net.URI(url).host?.lowercase() ?: return false
            TRUSTED_DOMAINS.any { trusted -> host == trusted || host.endsWith(".$trusted") }
        } catch (_: Exception) {
            false
        }
    }

    // ── Suspicious URL patterns ──────────────────────────────────────────────
    private val SUSPICIOUS_URL_REGEX = Regex(
        """https?://[^\s]+""", RegexOption.IGNORE_CASE
    )
    private val SHORTENED_LINK_REGEX = Regex(
        """(?:bit\.ly|tinyurl\.com|goo\.gl|t\.co|is\.gd|rb\.gy|cutt\.ly|shorturl\.at|tiny\.cc)/[^\s]+""",
        RegexOption.IGNORE_CASE
    )
    private val APK_LINK_REGEX = Regex(
        """https?://[^\s]+\.apk""", RegexOption.IGNORE_CASE
    )
    private val SUSPICIOUS_DOMAIN_REGEX = Regex(
        """https?://(?:[^\s/]*(?:verify|secure|update|login|bank|sbi|icici|hdfc|paytm|phonepe|gpay|upi)[^\s/]*\.(?:xyz|tk|ml|ga|cf|gq|top|work|click|link|info|site|online|buzz))[^\s]*""",
        RegexOption.IGNORE_CASE
    )

    // ── Urgency language ─────────────────────────────────────────────────────
    private val URGENCY_WORDS = listOf(
        "urgent", "immediately", "expire", "expiring", "hurry", "quick",
        "fast", "asap", "today only", "last chance", "deadline", "now only",
        "act now", "limited time", "don't delay", "within 24 hours",
        "account will be", "will be blocked", "will be suspended",
        "will be closed", "will be deactivated"
    )

    // ── Financial threat patterns ────────────────────────────────────────────
    private val FINANCIAL_THREAT_WORDS = listOf(
        "blocked", "suspended", "deactivated", "closed", "frozen",
        "limited", "restricted", "disabled", "terminated", "hold",
        "seized", "locked", "cancelled"
    )

    // ── KYC/verification scam ────────────────────────────────────────────────
    private val KYC_SCAM_WORDS = listOf(
        "kyc", "verify", "verification", "update kyc", "pan card",
        "aadhar", "aadhaar", "identity verification", "document upload",
        "re-kyc", "e-kyc", "kyc expir"
    )

    // ── Money request patterns ───────────────────────────────────────────────
    private val MONEY_REQUEST_WORDS = listOf(
        "send money", "transfer", "pay now", "payment required",
        "amount due", "send rs", "deposit", "pay rs", "send ₹",
        "pay ₹", "processing fee", "registration fee"
    )

    // ── Prize/lottery scam ───────────────────────────────────────────────────
    private val PRIZE_SCAM_WORDS = listOf(
        "congratulations", "winner", "won", "prize", "lottery",
        "reward", "cashback", "bonus", "gift", "lucky draw",
        "you have been selected", "you are selected", "claim your"
    )

    // ── OTP/sensitive data request ───────────────────────────────────────────
    private val OTP_SCAM_WORDS = listOf(
        "share otp", "send otp", "share your otp", "tell your otp",
        "share pin", "share cvv", "card number", "enter otp",
        "share password", "send pin", "share your pin"
    )

    // ── Impersonation patterns ───────────────────────────────────────────────
    private val IMPERSONATION_WORDS = listOf(
        "rbi", "reserve bank", "income tax", "government of india",
        "police", "court", "legal action", "complaint filed",
        "cyber cell", "enforcement directorate", "cbi", "it department"
    )

    // ── Phishing action patterns ─────────────────────────────────────────────
    private val PHISHING_ACTION_WORDS = listOf(
        "click here", "click link", "tap here", "visit link",
        "login here", "sign in", "update now", "click below",
        "open link", "download app", "install app"
    )

    /**
     * Analyze an SMS message using rule-based heuristics.
     *
     * @param sender The SMS sender (phone number or short code)
     * @param body The SMS body text
     * @return [RuleResult] with score (0.0–1.0), flags, and ML escalation decision
     */
    fun analyze(sender: String, body: String): RuleResult {
        val lower = body.lowercase()
        var score = 0f
        val flags = mutableListOf<String>()
        val details = mutableMapOf<String, Any>()

        // ── 1. URL Analysis ──────────────────────────────────────────────────
        val urls = SUSPICIOUS_URL_REGEX.findAll(body).map { it.value }.toList()
        if (urls.isNotEmpty()) {
            details["urls"] = urls
            val untrustedUrls = urls.filter { !isTrustedUrl(it) }
            if (untrustedUrls.isNotEmpty()) {
                score += 0.12f
                flags.add("suspicious_url")
            }
        }

        val shortened = SHORTENED_LINK_REGEX.findAll(body).map { it.value }.toList()
        if (shortened.isNotEmpty()) {
            score += 0.15f
            flags.add("shortened_link")
            details["shortened_links"] = shortened
        }

        if (APK_LINK_REGEX.containsMatchIn(body)) {
            score += 0.25f
            flags.add("apk_download")
        }

        if (SUSPICIOUS_DOMAIN_REGEX.containsMatchIn(body)) {
            score += 0.20f
            flags.add("suspicious_domain")
        }

        // ── 2. Keyword Category Matching ─────────────────────────────────────
        val categoryScores = mapOf(
            "urgency"           to Pair(URGENCY_WORDS, 0.12f),
            "financial_threat"  to Pair(FINANCIAL_THREAT_WORDS, 0.15f),
            "kyc_verification"  to Pair(KYC_SCAM_WORDS, 0.14f),
            "payment_request"   to Pair(MONEY_REQUEST_WORDS, 0.18f),
            "prize_scam"        to Pair(PRIZE_SCAM_WORDS, 0.16f),
            "sensitive_data_request" to Pair(OTP_SCAM_WORDS, 0.20f),
            "impersonation"     to Pair(IMPERSONATION_WORDS, 0.16f),
            "phishing_link"     to Pair(PHISHING_ACTION_WORDS, 0.14f),
        )

        var matchedCategories = 0
        for ((flag, pair) in categoryScores) {
            val (words, weight) = pair
            val matchCount = words.count { lower.contains(it) }
            if (matchCount > 0) {
                // Bonus for multiple matches within same category
                val categoryScore = weight * (1f + (matchCount - 1) * 0.2f)
                score += categoryScore
                flags.add(flag)
                matchedCategories++
            }
        }

        // Compound risk: multiple categories = multiplicative boost
        if (matchedCategories >= 3) {
            score *= 1.15f
            flags.add("multi_category_compound")
        }
        if (matchedCategories >= 5) {
            score *= 1.10f
        }

        // ── 3. Sender Analysis ───────────────────────────────────────────────
        val senderClean = sender.replace(Regex("""[\s\-+]"""), "")
        val isNumericSender = senderClean.matches(Regex("""^\d{10,13}$"""))
        val isShortCode = senderClean.matches(Regex("""^[A-Z]{2,6}\d*$"""))

        if (isNumericSender && !isShortCode) {
            score += 0.05f
            flags.add("unknown_sender")
        }

        // ── 4. Excessive Capitals ────────────────────────────────────────────
        if (body.length > 20) {
            val upperCount = body.count { it.isUpperCase() }
            val ratio = upperCount.toFloat() / body.length
            if (ratio > 0.4f) {
                score += 0.06f
                flags.add("excessive_capitals")
            }
        }

        // ── Clamp and decide ─────────────────────────────────────────────────
        score = score.coerceIn(0f, 1f)

        // Short-circuit decisions:
        //   > 0.85: definitely scam, skip ML
        //   < 0.15: definitely safe, skip ML
        //   middle: escalate to ML for nuanced classification
        val shouldEscalateToML = score in 0.15f..0.85f

        return RuleResult(
            score = score,
            flags = flags,
            shouldEscalateToML = shouldEscalateToML,
            details = details
        )
    }
}
