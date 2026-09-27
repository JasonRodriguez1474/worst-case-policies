<script lang="ts">
	import type { PolicyFormData, SecurityFramework, PolicySet } from '$lib/types';
	import PolicyPreview from '$lib/components/PolicyPreview.svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';

	let formData: PolicyFormData = {
		organizationName: '',
		framework: 'PCI-DSS',
		constraints: ''
	};

	let isLoading = false;
	let generatedPolicies: PolicySet | null = null;
	let error: string | null = null;
	let showSuccess = false;

	const frameworkOptions: SecurityFramework[] = [
		'PCI-DSS',
		'HIPAA',
		'NIST 800-171',
		'CMMC Level 1'
	];

	const constraintExamples = [
		'Remote workforce, cloud infrastructure',
		'Healthcare data, patient privacy requirements',
		'Financial transactions, multi-tenant SaaS',
		'IoT devices, edge computing environments',
		'Third-party integrations, API security'
	];

	async function handleSubmit() {
		if (!isFormValid) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/generate-policies', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				throw new Error(`Failed to generate policies: ${response.statusText}`);
			}

			generatedPolicies = await response.json();
			showSuccess = true;
			setTimeout(() => showSuccess = false, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unexpected error occurred';
		} finally {
			isLoading = false;
		}
	}

	$: isFormValid =
		formData.organizationName.trim().length > 0 &&
		formData.organizationName.trim().length <= 20 &&
		formData.constraints.trim().length > 0 &&
		formData.constraints.trim().length <= 500;

	function resetForm() {
		generatedPolicies = null;
		error = null;
		showSuccess = false;
		formData = {
			organizationName: '',
			framework: 'PCI-DSS',
			constraints: ''
		};
	}
</script>

<div class="page-container">
	<div class="hero-section" in:fade={{ duration: 600 }}>
		<div class="hero-content">
			<h1 class="hero-title gradient-text animate-fadeInUp">
				AI-Powered Security Policy Generator
			</h1>
			<div class="hero-subtitle" in:fly={{ y: 30, duration: 800, delay: 200 }}>
				<p class="lead">
					Generate comprehensive cybersecurity policies tailored to your organization's specific needs.
					<strong>Built for educational purposes and security training.</strong>
				</p>
				<div class="research-note">
					<div class="info-icon">⚠️</div>
					<div class="info-text">
						<strong>Research Tool:</strong> This generator intentionally uses the lowest-performing LLM we've benchmarked to demonstrate policy vulnerabilities. Perfect for cybersecurity students conducting mock audits and identifying weaknesses in AI-generated policies.
					</div>
				</div>
			</div>
		</div>
	</div>

	{#if !generatedPolicies}
		<div class="form-container" in:fly={{ y: 50, duration: 600, delay: 400 }}>
			<form on:submit|preventDefault={handleSubmit} class="policy-form">
				<div class="form-header">
					<h2 class="form-title">Configure Your Security Framework</h2>
					<p class="form-description">Customize policies based on your organization's specific requirements and compliance needs.</p>
				</div>
				
				<div class="form-grid">
					<div class="form-group">
						<label for="organizationName" class="form-label">
							<span class="label-icon">🏢</span>
							Organization Name
							<span class="required">*</span>
						</label>
						<div class="input-wrapper">
							<input
								id="organizationName"
								type="text"
								bind:value={formData.organizationName}
								placeholder="Enter your organization name"
								maxlength="20"
								class="form-input"
								required
							/>
							<span class="char-count" class:warning={formData.organizationName.length > 15}>{formData.organizationName.length}/20</span>
						</div>
					</div>

					<div class="form-group">
						<label for="framework" class="form-label">
							<span class="label-icon">🛡️</span>
							Compliance Framework
							<span class="required">*</span>
						</label>
						<div class="select-wrapper">
							<select id="framework" bind:value={formData.framework} class="form-select" required>
								{#each frameworkOptions as option (option)}
									<option value={option}>{option}</option>
								{/each}
							</select>
							<div class="select-arrow">▼</div>
						</div>
					</div>

					<div class="form-group full-width">
						<label for="constraints" class="form-label">
							<span class="label-icon">📋</span>
							Specific Constraints & Considerations
							<span class="required">*</span>
						</label>
						<div class="textarea-wrapper">
							<textarea
								id="constraints"
								bind:value={formData.constraints}
								placeholder="Describe your specific roles, systems, data types, or constraints. Examples: {constraintExamples.join(', ')}"
								maxlength="500"
								rows="4"
								class="form-textarea"
								required
							></textarea>
							<span class="char-count" class:warning={formData.constraints.length > 400}>{formData.constraints.length}/500</span>
						</div>
						<div class="examples-section">
							<p class="examples-title">Example constraints:</p>
							<div class="example-tags">
								{#each constraintExamples as example (example)}
									<button type="button" class="example-tag" on:click={() => formData.constraints = example}>
										{example}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				{#if error}
					<div class="alert error-alert" in:fly={{ x: -50, duration: 400 }} out:fade>
						<div class="alert-icon">❌</div>
						<div class="alert-content">
							<strong>Generation Failed</strong>
							<p>{error}</p>
						</div>
					</div>
				{/if}

				{#if showSuccess}
					<div class="alert success-alert" in:scale={{ duration: 500, easing: elasticOut }}>
						<div class="alert-icon">✅</div>
						<div class="alert-content">
							<strong>Policies Generated Successfully!</strong>
							<p>Your security policies are ready for review.</p>
						</div>
					</div>
				{/if}

				<div class="form-actions">
					<button type="submit" disabled={!isFormValid || isLoading} class="submit-btn" class:loading={isLoading}>
						<span class="btn-content">
							{#if isLoading}
								<div class="spinner"></div>
								Generating Policies...
							{:else}
								<span class="btn-icon">🚀</span>
								Generate Security Policies
							{/if}
						</span>
					</button>
					<p class="form-footer-text">
						Generation typically takes 15-30 seconds. Your policies will be available for download as PDF.
					</p>
				</div>
			</form>
		</div>
	{:else}
		<PolicyPreview
			policies={generatedPolicies}
			organizationName={formData.organizationName}
			framework={formData.framework}
			on:reset={resetForm}
		/>
	{/if}
</div>

<style>
	.page-container {
		min-height: 80vh;
		position: relative;
	}

	/* Hero Section */
	.hero-section {
		text-align: center;
		margin-bottom: 4rem;
		position: relative;
		background: linear-gradient(135deg, rgba(97, 164, 212, 0.1), rgba(20, 70, 118, 0.05));
		border-radius: var(--border-radius-lg);
		padding: 4rem 2rem;
		overflow: hidden;
	}

	.hero-section::before {
		content: '';
		position: absolute;
		top: -50%;
		left: -50%;
		width: 200%;
		height: 200%;
		background: radial-gradient(circle, rgba(97, 164, 212, 0.1) 0%, transparent 50%);
		animation: rotate 20s linear infinite;
	}

	@keyframes rotate {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}

	.hero-content {
		position: relative;
		z-index: 1;
	}

	.hero-title {
		font-size: clamp(2.5rem, 5vw, 3.5rem);
		font-weight: 700;
		margin-bottom: 1.5rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.hero-subtitle {
		max-width: 800px;
		margin: 0 auto;
	}

	.lead {
		font-size: 1.25rem;
		font-weight: 400;
		color: var(--fsp-dark-gray);
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.research-note {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		background: rgba(255, 255, 255, 0.8);
		backdrop-filter: blur(10px);
		padding: 1.5rem;
		border-radius: var(--border-radius);
		border: 1px solid rgba(250, 167, 47, 0.3);
		box-shadow: var(--shadow-md);
		text-align: left;
		max-width: 700px;
		margin: 0 auto;
	}

	.info-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.info-text {
		font-size: 0.95rem;
		line-height: 1.5;
	}

	/* Form Container */
	.form-container {
		max-width: 900px;
		margin: 0 auto;
	}

	.policy-form {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-xl);
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.form-header {
		text-align: center;
		padding: 3rem 2rem 2rem;
		background: var(--gradient-primary);
		color: white;
		position: relative;
	}

	.form-title {
		font-size: 2rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.form-description {
		font-size: 1rem;
		opacity: 0.9;
		max-width: 600px;
		margin: 0 auto;
	}

	.form-grid {
		padding: 2.5rem;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	.form-group {
		position: relative;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	.form-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
		color: var(--fsp-dark-gray);
		font-size: 0.95rem;
	}

	.label-icon {
		font-size: 1rem;
	}

	.required {
		color: var(--fsp-orange);
		font-weight: 700;
	}

	/* Input Styles */
	.input-wrapper,
	.select-wrapper,
	.textarea-wrapper {
		position: relative;
	}

	.form-input,
	.form-select,
	.form-textarea {
		width: 100%;
		padding: 1rem 1.25rem;
		border: 2px solid var(--fsp-light-gray);
		border-radius: var(--border-radius-sm);
		font-size: 1rem;
		font-family: inherit;
		transition: var(--transition);
		background: white;
		color: var(--fsp-dark-gray);
	}

	.form-input:focus,
	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--fsp-light-blue);
		box-shadow: 0 0 0 3px rgba(97, 164, 212, 0.1);
		transform: translateY(-1px);
	}

	.form-textarea {
		resize: vertical;
		min-height: 120px;
		line-height: 1.6;
	}

	.select-wrapper {
		position: relative;
	}

	.select-arrow {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		pointer-events: none;
		color: var(--fsp-dark-gray);
		font-size: 0.8rem;
	}

	.char-count {
		position: absolute;
		bottom: -1.75rem;
		right: 0;
		font-size: 0.8rem;
		color: var(--fsp-dark-gray);
		opacity: 0.7;
		font-weight: 500;
	}

	.char-count.warning {
		color: var(--fsp-orange);
		font-weight: 600;
	}

	/* Example Tags */
	.examples-section {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--fsp-light-gray);
	}

	.examples-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--fsp-dark-gray);
		margin-bottom: 0.75rem;
	}

	.example-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.example-tag {
		background: var(--fsp-light-gray);
		border: 1px solid rgba(97, 164, 212, 0.3);
		color: var(--fsp-dark-gray);
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.85rem;
		cursor: pointer;
		transition: var(--transition-fast);
	}

	.example-tag:hover {
		background: var(--fsp-light-blue);
		color: white;
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	/* Alerts */
	.alert {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1.25rem;
		border-radius: var(--border-radius-sm);
		margin-bottom: 1.5rem;
		backdrop-filter: blur(10px);
	}

	.error-alert {
		background: rgba(248, 215, 218, 0.9);
		border: 1px solid #f5c6cb;
		color: #721c24;
	}

	.success-alert {
		background: rgba(212, 237, 218, 0.9);
		border: 1px solid #c3e6cb;
		color: #155724;
	}

	.alert-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.alert-content strong {
		display: block;
		margin-bottom: 0.25rem;
		font-weight: 600;
	}

	.alert-content p {
		margin: 0;
		font-size: 0.95rem;
		opacity: 0.9;
	}

	/* Submit Button */
	.form-actions {
		padding: 0 2.5rem 2.5rem;
		text-align: center;
	}

	.submit-btn {
		width: 100%;
		max-width: 400px;
		background: var(--gradient-secondary);
		color: white;
		border: none;
		padding: 1.25rem 2rem;
		font-size: 1.1rem;
		font-weight: 600;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: var(--transition);
		position: relative;
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}

	.submit-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
		transition: left 0.6s ease;
	}

	.submit-btn:hover:not(:disabled)::before {
		left: 100%;
	}

	.submit-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.submit-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
		transform: none;
		box-shadow: var(--shadow-sm);
	}

	.btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		position: relative;
		z-index: 1;
	}

	.btn-icon {
		font-size: 1.1rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.form-footer-text {
		margin-top: 1rem;
		font-size: 0.9rem;
		color: rgba(50, 77, 87, 0.7);
		font-style: italic;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.hero-section {
			padding: 3rem 1.5rem;
		}

		.hero-title {
			font-size: 2.5rem;
		}

		.research-note {
			flex-direction: column;
			text-align: center;
		}

		.form-grid {
			grid-template-columns: 1fr;
			gap: 1.5rem;
			padding: 2rem 1.5rem;
		}

		.form-header {
			padding: 2rem 1.5rem 1.5rem;
		}

		.form-title {
			font-size: 1.75rem;
		}

		.example-tags {
			justify-content: center;
		}
	}

	@media (max-width: 480px) {
		.hero-section {
			padding: 2rem 1rem;
		}

		.hero-title {
			font-size: 2rem;
		}

		.form-grid {
			padding: 1.5rem 1rem;
		}

		.form-header {
			padding: 1.5rem 1rem;
		}

		.submit-btn {
			padding: 1rem 1.5rem;
			font-size: 1rem;
		}
	}
</style>
