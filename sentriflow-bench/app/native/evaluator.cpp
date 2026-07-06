#if defined(_MSC_VER)
    #define EXPORT __declspec(dllexport)
#else
    #define EXPORT
#endif

extern "C" {
    // Evaluates a batch of transaction features and outputs risk scores.
    EXPORT void evaluate_batch(
        const double* amounts,
        const bool* is_new_recipients,
        const int* community_spam_flags,
        const bool* is_unknown_callers,
        const double* recent_sms_scores,
        int* risk_scores,
        int size
    ) {
        #pragma omp parallel for
        for (int i = 0; i < size; ++i) {
            int score = 0;
            
            // 1. Community flags
            if (community_spam_flags[i] > 5) {
                score += 40;
            }
            
            // 2. Unknown caller active
            if (is_unknown_callers[i]) {
                score += 35;
            }
            
            // 3. Phishing SMS score
            if (recent_sms_scores[i] > 0.70) {
                score += 45;
            }
            
            // 4. Large amount limit on new recipient
            if (amounts[i] > 50000.0 && is_new_recipients[i]) {
                score += 25;
            }
            
            // Cap risk score at 100
            if (score > 100) {
                score = 100;
            }
            
            risk_scores[i] = score;
        }
    }
}
