# Security Policy Generator

AI-powered security policy generation tool built with SvelteKit and OpenRouter. Generates structured, compliance-ready Access Control, Acceptable Usage, and Incident Response policies conforming to frameworks including PCI-DSS, HIPAA, NIST 800-171, and CMMC Level 1.

## AI Model Configuration

The generation pipeline uses OpenRouter via the AI SDK (`@openrouter/ai-sdk-provider`).

- **Default Model:** `meta-llama/llama-3.1-8b-instruct` (High throughput, strict IFEval 80.4% formatting adherence, $0.05/M prompt, $0.08/M completion).
- **Configurable Override:** Set the private `OPENROUTER_MODEL` environment variable (locally in `.env`). Recommended alternatives:
  - `nvidia/nemotron-3-nano-30b-a3b` (High reasoning MoE, 256K context, MMLU 81.1%)
  - `mistralai/ministral-3b-2512` (Compact edge multimodal model)

Each request trims the override once and shares the selected model across all three concurrent generations. Unset, empty, or whitespace-only values use the default. Every nonblank value passes through without validation or automatic substitution; provider failures retain the HTTP 500 `{"error":"Failed to generate policies"}` response.

**Before rollout:** The deployment operator must inspect `OPENROUTER_MODEL`. Explicitly replace `mistralai/ministral-3b` with `mistralai/ministral-3b-2512`, or `mistralai/mistral-nemo` with `meta-llama/llama-3.1-8b-instruct`, to preserve the previously effective model. Leave other values unchanged. Local configuration does not establish the deployed value.

For detailed benchmark comparisons, sunset analysis of retired models (`mistralai/ministral-3b` and `mistralai/mistral-nemo`), and provider availability findings, see [MODEL_SUNSET_AND_MIGRATION.md](./MODEL_SUNSET_AND_MIGRATION.md).

## Developing

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
