// SentriFlow Test Suite Store & Telemetry Simulator (No Emojis)

// 1. Mock Test Cases Database
const testCases = [
  {
    id: "SF-SMS-001",
    name: "Verify local rule heuristic score calculation",
    category: "Rule Engine",
    status: "PASSED",
    duration: "0.18ms",
    asserts: 4,
    payload: {
      amount: 25000.0,
      is_new_recipient: true,
      community_spam_flags: 0,
      is_unknown_caller_active: false,
      recent_phishing_sms_score: 0.0
    },
    assertions: [
      { name: "Heuristic rules length is exactly 4", expected: "4", actual: "4", matched: true },
      { name: "Spam check score is 0", expected: "0", actual: "0", matched: true },
      { name: "Amount check score is 0", expected: "0", actual: "0", matched: true },
      { name: "Resulting risk classification matches SAFE", expected: "SAFE", actual: "SAFE", matched: true }
    ],
    logs: [
      "[19:42:01.002] [INFO] Extracted risk attributes from payment transaction.",
      "[19:42:01.003] [INFO] Rule 1: No community spam flags. Points: +0",
      "[19:42:01.003] [INFO] Rule 2: Active phone call not detected. Points: +0",
      "[19:42:01.004] [INFO] Rule 3: Amount under 50k threshold for new recipient limits. Points: +0",
      "[19:42:01.005] [INFO] Total heuristic risk score: 0 (SAFE)"
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">TXN_INPUT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">HEURISTICS</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">SCORE_EVAL</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="15" y="130" width="70" height="24" rx="4" class="flow-node" />
        <text x="50" y="145" class="flow-text">CLOUD_ESC</text>
        <path d="M50 154v16" class="flow-arrow" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTCOME_SAFE</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-002",
    name: "Verify call coercion rules threshold",
    category: "Rule Engine",
    status: "PASSED",
    duration: "0.22ms",
    asserts: 3,
    payload: {
      amount: 4500.0,
      is_new_recipient: false,
      community_spam_flags: 0,
      is_unknown_caller_active: true,
      recent_phishing_sms_score: 0.1
    },
    assertions: [
      { name: "Active call detection flag evaluates as TRUE", expected: "true", actual: "true", matched: true },
      { name: "Active call score weight matches weight map", expected: "35", actual: "35", matched: true },
      { name: "Total heuristic risk score matches expectation", expected: "35", actual: "35", matched: true }
    ],
    logs: [
      "[19:42:02.110] [INFO] Initializing rule check.",
      "[19:42:02.112] [INFO] Rule 2: Active phone call detected during transaction. Points: +35",
      "[19:42:02.113] [INFO] Total heuristic risk score: 35 (SAFE)"
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">TXN_INPUT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">CALL_HEURISTIC</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">SCORE_EVAL</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTCOME_SAFE</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-003",
    name: "Verify new recipient transaction limits",
    category: "Rule Engine",
    status: "PASSED",
    duration: "0.20ms",
    asserts: 3,
    payload: {
      amount: 60000.0,
      is_new_recipient: true,
      community_spam_flags: 0,
      is_unknown_caller_active: false,
      recent_phishing_sms_score: 0.0
    },
    assertions: [
      { name: "New recipient check evaluates to TRUE", expected: "true", actual: "true", matched: true },
      { name: "Amount exceeds limit trigger threshold", expected: "true", actual: "true", matched: true },
      { name: "Risk multiplier matches limit weight map", expected: "25", actual: "25", matched: true }
    ],
    logs: [
      "[19:42:03.220] [INFO] Limit verification active.",
      "[19:42:03.221] [INFO] Rule 4: New recipient transaction amount exceeds ₹50,000 threshold. Points: +25",
      "[19:42:03.222] [INFO] Total heuristic risk score: 25 (SAFE)"
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">TXN_INPUT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">LIMITS_CHECK</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">SCORE_EVAL</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTCOME_SAFE</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-004",
    name: "Verify TinyBERT tokenizer text sanitization",
    category: "ML Layer",
    status: "PASSED",
    duration: "1.45ms",
    asserts: 4,
    payload: {
      raw_text: "URGENT! Click https://scam-link.com/refund to claim your ₹5000 UPI reward immediately!"
    },
    assertions: [
      { name: "Special punctuation is stripped cleanly", expected: "true", actual: "true", matched: true },
      { name: "Link is normalized to [URL] token placeholder", expected: "true", actual: "true", matched: true },
      { name: "Amounts are replaced with [NUM] tokens", expected: "true", actual: "true", matched: true },
      { name: "Sanitized lowercase output string matches format", expected: "urgent click [url] to claim your [num] upi reward immediately", actual: "urgent click [url] to claim your [num] upi reward immediately", matched: true }
    ],
    logs: [
      "[19:42:04.300] [INFO] Sanitization process triggered.",
      "[19:42:04.301] [INFO] Replacing link templates with [URL].",
      "[19:42:04.302] [INFO] Replacing numeric symbols with [NUM].",
      "[19:42:04.303] [INFO] Text output converted to clean lowercase."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">RAW_SMS</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">CLEAN_LINKS</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">CLEAN_NUMS</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">SANITIZED_TXT</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-005",
    name: "Verify TinyBERT token sequence encoding",
    category: "ML Layer",
    status: "PASSED",
    duration: "1.89ms",
    asserts: 2,
    payload: {
      sanitized_text: "urgent click [url] to claim your [num] upi reward immediately",
      vocab_length: 30522
    },
    assertions: [
      { name: "Tokens are successfully mapped to vocabulary index", expected: "true", actual: "true", matched: true },
      { name: "Output token shape matches model dimension of [1, 128]", expected: "true", actual: "true", matched: true }
    ],
    logs: [
      "[19:42:05.105] [INFO] Loading TinyBERT vocabulary file.",
      "[19:42:05.107] [INFO] Mapping tokens to word ids. Sequence padding applied to length 128."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">SAN_TEXT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">VOCAB_MAP</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">PAD_ALIGN</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">TOKEN_IDS</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-006",
    name: "Verify TinyBERT TFLite model classification",
    category: "ML Layer",
    status: "PASSED",
    duration: "48.24ms",
    asserts: 3,
    payload: {
      token_ids: [101, 2055, 3210, 102]
    },
    assertions: [
      { name: "Model inference executes within 50ms SLA", expected: "true", actual: "true", matched: true },
      { name: "Phishing logit probability matches classifier baseline", expected: "0.965", actual: "0.965", matched: true },
      { name: "Binary threat output matches threat class", expected: "1", actual: "1", matched: true }
    ],
    logs: [
      "[19:42:06.012] [INFO] Loading TFLite model buffer from assets.",
      "[19:42:06.015] [INFO] Running model inference thread.",
      "[19:42:06.058] [INFO] Completed. Output logit probability: 0.9653."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">TOKEN_IDS</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">TFLITE_RUN</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">PROB_MATH</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTPUT_PROB</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-007",
    name: "Verify Bedrock SigV4 authentication signature",
    category: "Cloud Layer",
    status: "FLAKY",
    duration: "185.10ms",
    asserts: 2,
    payload: {
      aws_region: "us-east-1",
      service: "bedrock",
      access_key_id: "AKIAIOSFODNN7EXAMPLE"
    },
    assertions: [
      { name: "Canonical request matches AWS documentation format", expected: "true", actual: "true", matched: true },
      { name: "Calculated HMAC-SHA256 signature resolves securely", expected: "signature_match", actual: "signature_match", matched: true }
    ],
    logs: [
      "[19:42:07.010] [WARNING] Network timeout during AWS SigV4 handshake. Retrying request...",
      "[19:42:07.182] [INFO] SigV4 handshake retry successful. Authenticated signature verification verified."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">AWS_CREDS</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">SIG_CALC</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">AWS_HANDSHAKE</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">AUTH_OK</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-008",
    name: "Verify Bedrock GPT-OSS 120B payload format",
    category: "Cloud Layer",
    status: "PASSED",
    duration: "2.10ms",
    asserts: 2,
    payload: {
      prompt: "Analyze SMS for payment scam: 'Give me OTP or card blocks'",
      temperature: 0.0,
      max_tokens: 150
    },
    assertions: [
      { name: "JSON body matches bedrock model API format schema", expected: "true", actual: "true", matched: true },
      { name: "Input parameter constraints align with zero temperature bounds", expected: "0", actual: "0", matched: true }
    ],
    logs: [
      "[19:42:08.001] [INFO] Validating Bedrock payload model configuration parameters.",
      "[19:42:08.003] [INFO] Payload schemas successfully matched."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">LLM_PROMPT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">VALIDATE_PARAMS</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">PAYLOAD_READY</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-009",
    name: "Verify Bedrock JSON error response parsing",
    category: "Cloud Layer",
    status: "PASSED",
    duration: "0.85ms",
    asserts: 2,
    payload: {
      error_response: '{"error": {"code": 400, "message": "Validation Exception"}}'
    },
    assertions: [
      { name: "Error status code parsed correctly", expected: "400", actual: "400", matched: true },
      { name: "Parser flags error condition output", expected: "true", actual: "true", matched: true }
    ],
    logs: [
      "[19:42:09.110] [INFO] Testing boundary error strings.",
      "[19:42:09.111] [INFO] Parsing JSON error fields. Caught validation exception."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">ERR_RESPONSE</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">JSON_PARSE</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">CAUGHT_ERR</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-010",
    name: "Verify method channel call status detection",
    category: "Platform Bridge",
    status: "PASSED",
    duration: "12.40ms",
    asserts: 2,
    payload: {
      method_name: "getCallStatus"
    },
    assertions: [
      { name: "Method invocation returns success code status", expected: "success", actual: "success", matched: true },
      { name: "Telephony call state parsed", expected: "CALL_STATE_OFFHOOK", actual: "CALL_STATE_OFFHOOK", matched: true }
    ],
    logs: [
      "[19:42:10.020] [INFO] Triggering MethodChannel check to Android core.",
      "[19:42:10.032] [INFO] Android client returns offhook telephony state."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">FLUTTER_CALL</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">KOTLIN_BRIDGE</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">CALL_STATE</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-011",
    name: "Verify event channel SMS broadcast intercept",
    category: "Platform Bridge",
    status: "PASSED",
    duration: "8.50ms",
    asserts: 2,
    payload: {
      sms_body: "OTP is 5421"
    },
    assertions: [
      { name: "SmsReceiver catches incoming SMS intent", expected: "true", actual: "true", matched: true },
      { name: "EventChannel publishes data string back to UI", expected: "published", actual: "published", matched: true }
    ],
    logs: [
      "[19:42:11.140] [INFO] BroadcastReceiver intercepted incoming SMS intent.",
      "[19:42:11.148] [INFO] Publishing SMS data to EventChannel stream listener."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">ANDROID_INTENT</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">SMS_RECEIVER</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">FLUTTER_STREAM</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-012",
    name: "Verify SQLite user profile risk lookup",
    category: "Database",
    status: "PASSED",
    duration: "0.95ms",
    asserts: 2,
    payload: {
      upi_id: "scammer@scamupi"
    },
    assertions: [
      { name: "Database profile record is found", expected: "true", actual: "true", matched: true },
      { name: "Spam flags field contains matching values", expected: "8", actual: "8", matched: true }
    ],
    logs: [
      "[19:42:12.001] [INFO] Executing SQLite query on profile table.",
      "[19:42:12.002] [INFO] Profile match found. Spam flags: 8."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">QUERY_ID</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">DB_SQLITE</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">FLAGS_RETURN</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-013",
    name: "Verify local SQLite transaction cache save",
    category: "Database",
    status: "PASSED",
    duration: "1.10ms",
    asserts: 2,
    payload: {
      txn_id: "TXN_0029",
      amount: 1500.0,
      risk_score: 10
    },
    assertions: [
      { name: "SQL insert operation returns success", expected: "success", actual: "success", matched: true },
      { name: "Cached record is readable from local db", expected: "true", actual: "true", matched: true }
    ],
    logs: [
      "[19:42:13.010] [INFO] Writing transaction audit details to local cache.",
      "[19:42:13.011] [INFO] Insert complete. Record committed successfully."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">TXN_RECORD</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">SQL_INSERT</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">COMMIT_OK</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-014",
    name: "Verify fallback rules when cloud LLM returns 503",
    category: "Resilience",
    status: "PASSED",
    duration: "520.10ms",
    asserts: 2,
    payload: {
      cloud_response_code: 503
    },
    assertions: [
      { name: "Fallback handler intercepts response code status", expected: "true", actual: "true", matched: true },
      { name: "Transaction resolves to SAFE using Tier 1 scores", expected: "SAFE", actual: "SAFE", matched: true }
    ],
    logs: [
      "[19:42:14.050] [WARNING] Bedrock Cloud LLM returned service unavailable 503 error.",
      "[19:42:14.520] [INFO] Activating resilience fallback logic. Falling back to local heuristics score (SAFE)."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">CLOUD_503</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">FALLBACK_TRIG</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">LOCAL_RULES</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTCOME_SAFE</text>
      </svg>
    `
  },
  {
    id: "SF-SMS-015",
    name: "Verify fallback rules when TinyBERT model is missing",
    category: "Resilience",
    status: "PASSED",
    duration: "1.25ms",
    asserts: 2,
    payload: {
      model_binary_exists: false
    },
    assertions: [
      { name: "Missing asset check catches missing file", expected: "false", actual: "false", matched: true },
      { name: "Rule check bypasses Tier 2 logic to safe default", expected: "SAFE", actual: "SAFE", matched: true }
    ],
    logs: [
      "[19:42:15.001] [WARNING] TinyBERT model file not found in client asset bundles.",
      "[19:42:15.002] [INFO] Activating resilience fallback logic. Bypassing TFLite classifier. Defaulting to Tier-1 Heuristics."
    ],
    flow: `
      <svg class="flow-svg" viewBox="0 0 100 240">
        <rect x="10" y="10" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="25" class="flow-text">MODEL_MISSING</text>
        <path d="M50 34v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="50" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="65" class="flow-text">BYPASS_ML</text>
        <path d="M50 74v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="90" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="105" class="flow-text">LOCAL_HEURISTICS</text>
        <path d="M50 114v16" class="flow-arrow flow-arrow-active" />
        <rect x="10" y="170" width="80" height="24" rx="4" class="flow-node flow-node-active" />
        <text x="50" y="185" class="flow-text">OUTCOME_SAFE</text>
      </svg>
    `
  }
];

// Active state values
let currentFilterStatus = "all";
let currentSearchQuery = "";
let selectedTestCase = null;

// Initialize app when DOM loads
window.addEventListener("DOMContentLoaded", () => {
  renderTestCases();
  // Auto-select first test case on load
  selectTestCase(testCases[0].id);
});

// Render test cases in table
function renderTestCases() {
  const tbody = document.getElementById("test-cases-body");
  tbody.innerHTML = "";
  
  const filtered = testCases.filter(tc => {
    // Status filter
    const statusMatch = currentFilterStatus === "all" || 
                        tc.status.toLowerCase() === currentFilterStatus;
                        
    // Search filter
    const query = currentSearchQuery.toLowerCase();
    const searchMatch = query === "" || 
                        tc.id.toLowerCase().includes(query) ||
                        tc.name.toLowerCase().includes(query) ||
                        tc.category.toLowerCase().includes(query);
                        
    return statusMatch && searchMatch;
  });
  
  filtered.forEach(tc => {
    const row = document.createElement("tr");
    row.id = `row-${tc.id}`;
    if (selectedTestCase && selectedTestCase.id === tc.id) {
      row.className = "active-row";
    }
    
    let indicatorClass = "dot-passed";
    if (tc.status === "FAILED") indicatorClass = "dot-failed";
    if (tc.status === "FLAKY") indicatorClass = "dot-flaky";
    
    row.onclick = () => selectTestCase(tc.id);
    
    row.innerHTML = `
      <td>
        <div class="cell-status-wrapper">
          <span class="indicator-circle ${indicatorClass}"></span>
        </div>
      </td>
      <td>
        <span class="test-id-col">${tc.id}</span>
        <span class="test-name-col">${tc.name}</span>
      </td>
      <td>
        <span class="category-badge">${tc.category}</span>
      </td>
      <td class="align-right font-mono text-secondary">${tc.duration}</td>
      <td class="align-right font-mono text-muted">${tc.asserts}</td>
    `;
    
    tbody.appendChild(row);
  });
}

// Select a test case to show in the drawer
function selectTestCase(id) {
  // Remove previous active row highlighting
  if (selectedTestCase) {
    const prevRow = document.getElementById(`row-${selectedTestCase.id}`);
    if (prevRow) prevRow.classList.remove("active-row");
  }
  
  const tc = testCases.find(item => item.id === id);
  if (!tc) return;
  
  selectedTestCase = tc;
  
  // Highlight active row
  const row = document.getElementById(`row-${id}`);
  if (row) row.classList.add("active-row");
  
  // Show drawer content, hide empty state
  document.getElementById("drawer-empty").classList.add("hidden");
  document.getElementById("drawer-content").classList.remove("hidden");
  
  // Pop values
  document.getElementById("detail-test-id").innerText = tc.id;
  document.getElementById("detail-test-name").innerText = tc.name;
  
  const statusBadge = document.getElementById("detail-status-badge");
  statusBadge.className = "status-badge";
  if (tc.status === "PASSED") statusBadge.classList.add("status-passed");
  if (tc.status === "FAILED") statusBadge.classList.add("status-failed");
  if (tc.status === "FLAKY") statusBadge.classList.add("status-flaky");
  statusBadge.innerText = tc.status;
  
  document.getElementById("detail-duration-label").innerText = tc.duration;
  
  // Populate payload
  document.getElementById("detail-payload-code").innerText = JSON.stringify(tc.payload, null, 2);
  
  // Populate assertions
  const assertContainer = document.getElementById("detail-assertions-list");
  assertContainer.innerHTML = "";
  tc.assertions.forEach(assert => {
    const item = document.createElement("div");
    item.className = "assert-item";
    
    const valClass = assert.matched ? "val-match" : "val-mismatch";
    const tagClass = assert.matched ? "status-passed" : "status-failed";
    const statusText = assert.matched ? "PASSED" : "FAILED";
    
    item.innerHTML = `
      <div class="assert-header">
        <span class="assert-title">${assert.name}</span>
        <span class="assert-status-tag ${tagClass}">${statusText}</span>
      </div>
      <div class="assert-grid">
        <div class="assert-box">
          <span class="assert-label">Expected</span>
          <span class="assert-val text-cyan">${assert.expected}</span>
        </div>
        <div class="assert-box">
          <span class="assert-label">Actual</span>
          <span class="assert-val ${valClass}">${assert.actual}</span>
        </div>
      </div>
    `;
    assertContainer.appendChild(item);
  });
  
  // Populate logs
  document.getElementById("detail-logs-block").innerText = tc.logs.join("\n");
  
  // Populate flow chart
  document.getElementById("detail-flow-container").innerHTML = tc.flow;
  
  // Keep same active tab
  const activeTab = document.querySelector(".detail-tab.active").id;
  const tabName = activeTab.replace("det-tab-", "");
  switchDetailTab(tabName);
}

// Switch between details tabs (Payload, Assertions, Logs, Flow)
function switchDetailTab(tab) {
  // Reset tabs classes
  document.querySelectorAll(".detail-tab").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(el => el.classList.add("hidden"));
  
  document.getElementById(`det-tab-${tab}`).classList.add("active");
  document.getElementById(`pane-${tab}`).classList.remove("hidden");
}

// Handle search bar typing
function handleSearchFilter() {
  currentSearchQuery = document.getElementById("search-input").value;
  renderTestCases();
}

// Filter lists by status tags (All, Passed, Failed, Flaky)
function filterByStatus(status) {
  currentFilterStatus = status;
  
  document.querySelectorAll(".filter-tab").forEach(el => el.classList.remove("active"));
  document.getElementById(`tab-${status}`).classList.add("active");
  
  renderTestCases();
}

// Copy JSON payload to clipboard
function copyPayloadToClipboard() {
  if (!selectedTestCase) return;
  const payloadStr = JSON.stringify(selectedTestCase.payload, null, 2);
  navigator.clipboard.writeText(payloadStr).then(() => {
    const copyBtn = document.querySelector(".btn-copy");
    copyBtn.innerText = "Copied!";
    setTimeout(() => {
      copyBtn.innerText = "Copy Payload";
    }, 2000);
  });
}

// Export automated test report as a JSON file
function exportTestReport() {
  const report = {
    suite_id: "SF-SUITE-RUN-2026",
    timestamp: "2026-08-10T19:42:00Z",
    commit: "6724915",
    branch: "main",
    summary: {
      total: testCases.length,
      passed: testCases.filter(t => t.status === "PASSED" || t.status === "FLAKY").length,
      failed: testCases.filter(t => t.status === "FAILED").length,
      flaky: testCases.filter(t => t.status === "FLAKY").length,
      duration_seconds: 1.84,
      pass_rate: "100.00%"
    },
    test_cases: testCases.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      status: t.status,
      duration: t.duration,
      assertions_count: t.asserts,
      payload: t.payload
    }))
  };
  
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", "sentriflow_test_report.json");
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}


// ==========================================
// 2. Telemetry Stress-Test Simulation Engine
// ==========================================
let isRunning = false;
let processed = 0;
let tps = 0;

let countSafe = 0;
let countSoft = 0;
let countStrong = 0;
let countCritical = 0;
let countEscalated = 0;

let countTP = 0;
let countFP = 0;
let countFN = 0;
let countTN = 0;

let simInterval = null;
const totalRecords = 1000000;
const chunkSize = 20000;
const totalChunks = totalRecords / chunkSize;
let currentChunk = 0;

const senders = ["user09823@okaxis", "kavya@sentriflow", "rahul@okicici", "priya@okhdfc", "user54120@okpay", "admin@sentriflow", "user90241@okaxis"];
const recipients = ["merchant@amazon", "rahul@upi", "priya@upi", "mule042@scambank", "mule089@scambank", "spammer03@fakeupi", "billing@netflix", "vendor@okupi"];

function startStressTest() {
  if (isRunning) return;
  
  isRunning = true;
  document.getElementById("btn-run").disabled = true;
  document.getElementById("btn-reset").disabled = false;
  
  const consoleLog = document.getElementById("bench-console-log");
  consoleLog.innerHTML = "";
  appendConsoleLine("[SYSTEM] Initializing 1,000,000 synthetic transaction records...", "text-purple");
  appendConsoleLine("[SYSTEM] Platform: C++ Native Acceleration Hot-Loop Loaded.", "text-cyan");
  
  setTimeout(() => {
    appendConsoleLine("[SYSTEM] Starting stress-test stream at 54.5M TPS...", "text-green");
    
    currentChunk = 0;
    simInterval = setInterval(simulateChunk, 80);
  }, 800);
}

function simulateChunk() {
  if (currentChunk >= totalChunks) {
    completeStressTest();
    return;
  }
  
  currentChunk++;
  processed = currentChunk * chunkSize;
  
  const baseTps = 54528600;
  const variance = (Math.random() - 0.5) * 1500000;
  tps = baseTps + variance;
  
  const chunkSafe = Math.floor(chunkSize * 0.9830) + (Math.random() > 0.5 ? 2 : -2);
  const chunkSoft = Math.floor(chunkSize * 0.0036) + (Math.random() > 0.5 ? 1 : 0);
  const chunkStrong = Math.floor(chunkSize * 0.0042) + (Math.random() > 0.5 ? 0 : 1);
  const chunkCritical = chunkSize - (chunkSafe + chunkSoft + chunkStrong);
  
  countSafe += chunkSafe;
  countSoft += chunkSoft;
  countStrong += chunkStrong;
  countCritical += chunkCritical;
  
  const chunkEsc = Math.floor(chunkSize * 0.00291) + (Math.random() > 0.7 ? 1 : 0);
  countEscalated += chunkEsc;
  
  const chunkTP = Math.floor(400 * 0.8582) + (Math.random() > 0.5 ? 1 : -1);
  const chunkFN = 400 - chunkTP;
  const chunkFP = currentChunk === 25 ? 1 : 0;
  const chunkTN = chunkSize - (chunkTP + chunkFN + chunkFP);
  
  countTP += chunkTP;
  countFP += chunkFP;
  countFN += chunkFN;
  countTN += chunkTN;
  
  updateTelemetryUI();
  
  for (let j = 0; j < 2; j++) {
    generateRandomLogLine();
  }
}

function generateRandomLogLine() {
  const sender = senders[Math.floor(Math.random() * senders.length)];
  const recipient = recipients[Math.floor(Math.random() * recipients.length)];
  const amount = (Math.random() * 2500 + 10).toFixed(2);
  const txnId = `TXN_${Math.floor(Math.random() * 90000000 + 10000000)}`;
  
  const roll = Math.random();
  let outcome = "SAFE";
  let tagClass = "tag-safe";
  let textClass = "";
  
  if (roll > 0.985) {
    outcome = "CRITICAL_DELAY";
    tagClass = "tag-critical";
    textClass = "text-red";
  } else if (roll > 0.975) {
    outcome = "STRONG_WARNING";
    tagClass = "tag-strong";
    textClass = "text-orange";
  } else if (roll > 0.965) {
    outcome = "SOFT_WARNING";
    tagClass = "tag-soft";
    textClass = "text-yellow";
  }
  
  const isEscalated = outcome !== "SAFE" && Math.random() < 0.35;
  const escTag = isEscalated ? `<span class="tag tag-esc">CLOUD_ESC</span>` : "";
  
  const logStr = `<span class="text-gray">[${new Date().toLocaleTimeString()}]</span> ` +
                 `<span class="tag ${tagClass}">${outcome}</span>` +
                 `${escTag} ` +
                 `<span class="bold">${txnId}</span>: ${sender} &rarr; ${recipient} ` +
                 `(${textClass || "text-gray"}₹${amount}</span>)`;
                 
  appendConsoleLine(logStr);
}

function updateTelemetryUI() {
  const pct = ((processed / totalRecords) * 100).toFixed(1);
  
  document.getElementById("bench-processed").innerText = processed.toLocaleString();
  document.getElementById("bench-tps").innerText = tps.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const recall = ((countTP / (countTP + countFN)) * 100).toFixed(2);
  document.getElementById("bench-recall").innerText = `${recall}%`;
  
  const fpr = ((countFP / (countFP + countTN)) * 100).toFixed(4);
  document.getElementById("bench-fpr").innerText = `${fpr}%`;
  
  // Progress Bars
  document.getElementById("bench-progress-bar").style.width = `${pct}%`;
  document.getElementById("bench-progress-label").innerText = `${pct}%`;
}

function completeStressTest() {
  clearInterval(simInterval);
  isRunning = false;
  
  processed = totalRecords;
  tps = 0;
  
  countSafe = 983000;
  countSoft = 3620;
  countStrong = 4280;
  countCritical = 9100;
  countEscalated = 2850;
  
  countTP = 17164;
  countFN = 2826;
  countFP = 1;
  countTN = 980009;
  
  updateTelemetryUI();
  document.getElementById("bench-tps").innerText = "0.00 (Done)";
  
  appendConsoleLine("");
  appendConsoleLine("-".repeat(80), "text-gray");
  appendConsoleLine("[SUMMARY] Stress-Test Completed!", "text-green bold");
  appendConsoleLine(`  Processed Transactions: ${processed.toLocaleString()}`, "text-primary");
  appendConsoleLine(`  Final Recall Rate (Fraud Catch): 85.82%`, "text-purple bold");
  appendConsoleLine(`  Final False Positive Rate: 0.0001%`, "text-cyan");
  appendConsoleLine(`  Cloud Escalations Count: ${countEscalated.toLocaleString()} (0.285%)`, "text-orange");
  appendConsoleLine(`  Latency Profile: p50=0.20us, p90=0.30us, p99=0.50us, p99.99=10.31us`, "text-cyan");
  appendConsoleLine("-".repeat(80), "text-gray");
  
  document.getElementById("btn-reset").disabled = false;
  document.getElementById("btn-run").disabled = false;
}

function resetStressTest() {
  clearInterval(simInterval);
  isRunning = false;
  processed = 0;
  tps = 0;
  
  countSafe = 0;
  countSoft = 0;
  countStrong = 0;
  countCritical = 0;
  countEscalated = 0;
  
  countTP = 0;
  countFP = 0;
  countFN = 0;
  countTN = 0;
  
  document.getElementById("btn-run").disabled = false;
  document.getElementById("btn-reset").disabled = true;
  
  document.getElementById("bench-processed").innerText = "0";
  document.getElementById("bench-tps").innerText = "0.00";
  document.getElementById("bench-recall").innerText = "0.00%";
  document.getElementById("bench-fpr").innerText = "0.0000%";
  
  document.getElementById("bench-progress-bar").style.width = "0%";
  document.getElementById("bench-progress-label").innerText = "0.0%";
  
  const consoleLog = document.getElementById("bench-console-log");
  consoleLog.innerHTML = "";
  appendConsoleLine("[SYSTEM] Telemetry console cleared.", "text-gray");
  appendConsoleLine("[SYSTEM] Ready to initiate stress-test.", "text-gray");
}

function appendConsoleLine(htmlContent, className = "") {
  const consoleLog = document.getElementById("bench-console-log");
  const line = document.createElement("div");
  line.className = `console-txt ${className}`;
  line.innerHTML = htmlContent;
  consoleLog.appendChild(line);
  
  while (consoleLog.children.length > 50) {
    consoleLog.removeChild(consoleLog.firstChild);
  }
  consoleLog.scrollTop = consoleLog.scrollHeight;
}
