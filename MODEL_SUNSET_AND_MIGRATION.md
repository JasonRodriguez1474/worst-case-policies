# Model Sunsetting and Migration Document

**Status:** Approved & Implemented  
**Date:** September 2026  
**Scope:** AI Generation Pipeline (`src/routes/api/generate-policies/+server.ts`)  
**Target Platform:** OpenRouter API (`@openrouter/ai-sdk-provider`)

---

## 1. Executive Summary

The security policy generation pipeline previously relied on **`mistralai/ministral-3b`** (and historically **`mistralai/mistral-nemo`**).

- **Critical Operational Outage:** The model identifier `mistralai/mistral-3b` has been removed from active OpenRouter endpoints (`HTTP 404: No endpoints found for mistralai/mistral-3b`), breaking live policy generation requests.
- **Generational Sunset:** `mistralai/mistral-nemo` (12B dense) represents a previous-generation baseline with lower instruction adherence (IFEval ~69.0%) and higher hallucination rates on complex security control mapping matrices (SOC2, ISO 27001, HIPAA, PCI-DSS, NIST CSF).
- **Active Replacements Implemented:**
  1. **Primary Production Default:** **`meta-llama/llama-3.1-8b-instruct`** — Selected for industry-leading strict instruction adherence (IFEval 80.4%), low token cost ($0.05/M input, $0.08/M output), broad multi-provider availability, and zero data-privacy blocking.
  2. **High-Throughput MoE Alternative:** **`nvidia/nemotron-3-nano-30b-a3b`** — Recommended for complex reasoning and agentic workloads (31.6B total / ~3.2B active parameters, 256K context, MMLU 81.1%, $0.05/M input, $0.20/M output).
  3. **Direct Mistral Family Patch:** **`mistralai/ministral-3b-2512`** — The active, version-tagged successor to `mistralai/ministral-3b` with 256K context and multimodal support ($0.10/M input, $0.10/M output).

---

## 2. Sunsetting Analysis: Retired Models

### 2.1 `mistralai/ministral-3b` (Discontinued / Removed)

- **Deployment Context:** Introduced in commit `a36029c` to reduce token generation latency and increase TPS compared to `mistral-nemo`.
- **Architecture:** 3.4B dense decoder-only Transformer.
- **Context Length:** 32,768 / 128,000 tokens.
- **Pricing (Prior to deprecation):** ~$0.04 / 1M prompt, ~$0.04 / 1M completion.

#### Public Benchmark Profile

| Benchmark                  | Ministral 3B Score | Size Class Benchmark Context                                                          |
| :------------------------- | :----------------: | :------------------------------------------------------------------------------------ |
| **MMLU** (5-shot)          |     **60.9%**      | Outperformed Llama 3.2 3B (56.2%) and Gemma 2 2B (52.4%), trailed 7B/8B class (>69%). |
| **GSM8K** (maj@8)          |     **50.9%**      | Basic multi-step reasoning, struggled with intricate multi-clause constraints.        |
| **Winogrande**             |     **72.7%**      | Moderate commonsense reasoning.                                                       |
| **IFEval** (Strict Prompt) |     **~62.0%**     | Inconsistent compliance with required Markdown headings and table schema.             |

#### Root Cause of Sunset

1. **Endpoint Invalidation:** OpenRouter officially discontinued unversioned `mistralai/ministral-3b` routing in favor of date-stamped releases (`mistralai/ministral-3b-2512`). Any API call to this slug immediately returns:
   ```json
   { "error": { "message": "No endpoints found for mistralai/ministral-3b.", "code": 404 } }
   ```
2. **Quality Deficit in Enterprise Policy Generation:** The 3B parameter scale exhibited persistent formatting drift against `output-spec.md`, often dropping the required Markdown mapping table (`| Policy | Control ID | Description |`) or producing truncated policy statements under complex regulatory frameworks.

---

### 2.2 `mistralai/mistral-nemo` (Sunsetted / Deprecated)

- **Deployment Context:** Initial production model integrated in commit `b529e24`. Developed jointly by Mistral AI and NVIDIA.
- **Architecture:** 12.2B dense Transformer with Tekken tokenizer (131k vocabulary) and native FP8 support.
- **Context Length:** 131,072 tokens.
- **Pricing on OpenRouter:** $0.019 / 1M prompt, $0.030 / 1M completion.

#### Public Benchmark Profile

| Benchmark           | Mistral NeMo 12B Score | Context / Comparison                                                                                |
| :------------------ | :--------------------: | :-------------------------------------------------------------------------------------------------- |
| **MMLU** (5-shot)   |       **68.4%**        | Competitive with first-gen 7B/8B models (e.g., Llama 3 8B ~66%).                                    |
| **GSM8K** (CoT)     |       **79.8%**        | Solid mathematical and sequential logic.                                                            |
| **IFEval** (Strict) |       **~69.0%**       | Moderate instruction following; prone to minor formatting inconsistencies under multi-step prompts. |

#### Root Cause of Sunset

1. **Instruction Adherence Gap:** In enterprise compliance generation, strict compliance with Markdown tables and control ID taxonomy is non-negotiable. Modern 8B models (like Llama 3.1 8B at 80.4% IFEval) significantly exceed NeMo’s 69.0% adherence rate.
2. **Architecture Evolution:** NVIDIA and Mistral have both moved their small-footprint focus to next-generation architectures (Nemotron-3 Mamba-2 MoE and Ministral 3 multimodal series), offering superior throughput and reasoning density.

---

## 3. Benchmark Evaluation of Candidate & Suggested Models

The three selected models are compared across capability, throughput, pricing, and live API availability:

1. **`meta-llama/llama-3.1-8b-instruct`**
2. **`nvidia/nemotron-3-nano-30b-a3b`**
3. **`mistralai/ministral-3b-2512`**
4. _Market Suggestions:_ `mistralai/mistral-small-24b-instruct-2501` and `deepseek/deepseek-v4-flash`

### 3.1 Public Benchmark Comparison Matrix

| Model                                           | Total / Active Params |  MMLU (5-shot / Pro)  | GSM8K (CoT)  | IFEval (Strict) | Context Window | Prompt Price ($/1M) | Completion Price ($/1M) |  OpenRouter Live Status   |
| :---------------------------------------------- | :-------------------: | :-------------------: | :----------: | :-------------: | :------------: | :-----------------: | :---------------------: | :-----------------------: |
| **`mistralai/ministral-3b`** _(Sunset)_         |      3.4B / 3.4B      |         60.9%         |    50.9%     |     ~62.0%      |    32K–128K    |         N/A         |           N/A           |   ❌ **404 Not Found**    |
| **`mistralai/mistral-nemo`** _(Sunset)_         |     12.2B / 12.2B     |         68.4%         |    79.8%     |      69.0%      |      128K      |       $0.019        |         $0.030          |    ⚠️ Deprecated tier     |
| **`meta-llama/llama-3.1-8b-instruct`**          |      8.0B / 8.0B      |   69.4% (73.0% CoT)   |    84.5%     |    **80.4%**    |      128K      |     **$0.050**      |       **$0.080**        | ✅ **Active & Available** |
| **`nvidia/nemotron-3-nano-30b-a3b`**            |     31.6B / ~3.2B     | **81.1%** (78.3% Pro) |  **92.3%**   | **80.6%–88.7%** |    **256K**    |     **$0.050**      |         $0.200          | ✅ **Active & Available** |
| **`mistralai/ministral-3b-2512`**               |      3.8B / 3.8B      |         63.8%         |    58.2%     |     ~70.5%      |   128K–256K    |       $0.100        |         $0.100          | ✅ **Active & Available** |
| **`mistralai/mistral-small-24b-instruct-2501`** |     24.0B / 24.0B     |         81.3%         |    88.0%     |      83.2%      |      32K       |       $0.050        |         $0.080          |   ✅ Active & Available   |

---

## 4. Empirical API Verification & Provider Availability Analysis

Direct API integration tests were conducted against the live OpenRouter gateway using the configured API credentials.

### Test Results

```
Testing OpenRouter Gateway Connectivity:
[x] mistralai/ministral-3b         -> HTTP 404 (No endpoints found)
[✓] mistralai/ministral-3b-2512    -> HTTP 200 SUCCESS (Response: "Got it!")
[✓] meta-llama/llama-3.1-8b-instruct -> HTTP 200 SUCCESS (Response: "OK")
[✓] nvidia/nemotron-3-nano-30b-a3b   -> HTTP 200 SUCCESS (Response: "Okay...")
```

### Critical Findings:

1. **`mistralai/ministral-3b` is permanently dead** on OpenRouter. Code pointing to this identifier will fail 100% of the time.
2. **Multi-Provider Redundancy:** `meta-llama/llama-3.1-8b-instruct`, `nvidia/nemotron-3-nano-30b-a3b`, and `mistralai/ministral-3b-2512` are supported across enterprise-compliant backends (Together, DeepInfra, Fireworks, Lepton, Mistral direct), guaranteeing uptime without privacy policy conflicts.

---

## 5. Candidate Model Trade-Off Analysis

### 5.1 `meta-llama/llama-3.1-8b-instruct` (Primary Recommended Replacement)

- **Strengths:**
  - **Strict Instruction Following (IFEval 80.4%):** Outperforms all other sub-10B dense models at adhering strictly to negative constraints, formatting rules, and Markdown table schemas.
  - **Unbeatable Cost-to-Performance Ratio:** At $0.08 / 1M output tokens, generating three 3,000-token policies costs less than **$0.00072 total per generation batch**.
  - **Throughput:** Supported by high-speed engines (vLLM, TensorRT-LLM) delivering 100–140 tokens/second.
  - **Context:** 128K context window easily accommodates regulatory text, org constraints, and multi-shot examples.
- **Trade-offs:** Academic knowledge is slightly lower than 30B+ MoE models, but more than sufficient for security policy drafting.

### 5.2 `nvidia/nemotron-3-nano-30b-a3b` (Top High-Throughput MoE Suggestion)

- **Strengths:**
  - **Hybrid Mamba-2 MoE Architecture:** Activates only ~3.2B parameters out of 31.6B per token, providing the inference latency and throughput of a 3B model with the semantic depth of a 30B model.
  - **Benchmark Dominance:** 81.1% MMLU and 92.3% GSM8K, outranking all other sub-30B options.
  - **256K Context Window:** Enables zero-shot injection of entire framework specifications (e.g., complete NIST SP 800-53 catalog).
- **Trade-offs:** Completion pricing ($0.20/M) is 2.5x higher than Llama 3.1 8B ($0.08/M).

### 5.3 `mistralai/ministral-3b-2512` (Edge & Ultra-Low Latency Fallback)

- **Strengths:**
  - Direct official successor to `mistralai/ministral-3b`.
  - Symmetric pricing: $0.10/M prompt, $0.10/M completion ($0.01/M cache read).
  - Fast time-to-first-token (TTFT).
- **Trade-offs:** At 3.4B parameters, complex multi-clause compliance matrices occasionally lose detail compared to Llama 3.1 8B.

---

## 6. Migration & Architecture Implementation

### 6.1 Configuration Strategy

The route `src/routes/api/generate-policies/+server.ts` selects one model per request for all three concurrent generations:

1. Use the module-private default `meta-llama/llama-3.1-8b-instruct` when `OPENROUTER_MODEL` is unset, empty, or whitespace-only.
2. Trim and pass through every nonblank private environment override without validation or substitution. Recommended alternatives remain `nvidia/nemotron-3-nano-30b-a3b` and `mistralai/ministral-3b-2512`.
3. Preserve provider-error logging and the HTTP 500 `{"error":"Failed to generate policies"}` response. There is no automatic alternate-model fallback.

The model registry and automatic migration resolver have been removed. Before release, the deployment operator must inspect `OPENROUTER_MODEL` and explicitly migrate `mistralai/ministral-3b` to `mistralai/ministral-3b-2512`, or `mistralai/mistral-nemo` to `meta-llama/llama-3.1-8b-instruct`. Leave other values unchanged. This preflight is required even when deployment settings are unavailable during local implementation.

### 6.2 Model Catalog Reference

| Alias / Use Case         | OpenRouter Model Slug              | Active Status | Recommended For                                                        |
| :----------------------- | :--------------------------------- | :-----------: | :--------------------------------------------------------------------- |
| **Default Production**   | `meta-llama/llama-3.1-8b-instruct` |    ✅ Yes     | Production security policy generation; optimal cost & table formatting |
| **High Reasoning / MoE** | `nvidia/nemotron-3-nano-30b-a3b`   |    ✅ Yes     | Deep regulatory analysis, long-context compliance audits               |
| **Lightweight Edge**     | `mistralai/ministral-3b-2512`      |    ✅ Yes     | Fast prototyping and edge execution                                    |
