<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { marked } from 'marked';
	import { exportToPDF } from '$lib/utils/pdfExporter';
	import { fade, fly, scale } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';
	import type { PolicySet, SecurityFramework } from '$lib/types';

	export let policies: PolicySet;
	export let organizationName: string;
	export let framework: SecurityFramework;

	const dispatch = createEventDispatcher();

	let activePolicy: 'accessControl' | 'acceptableUsage' | 'incidentResponse' = 'accessControl';
	let isExporting = false;

	const policyTitles = {
		accessControl: 'Access Control Policy',
		acceptableUsage: 'Acceptable Usage Policy',
		incidentResponse: 'Incident Response Policy'
	};

	function resetForm() {
		dispatch('reset');
	}

	async function handleExport() {
		isExporting = true;
		try {
			await exportToPDF(policies, organizationName, framework);
		} catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export policies. Please try again.');
		} finally {
			isExporting = false;
		}
	}

	$: currentPolicyContent = policies[activePolicy];
	$: renderedHTML = marked(currentPolicyContent);
</script>

<div class="policy-preview" in:fade={{ duration: 500 }}>
	<div class="preview-header" in:fly={{ y: -30, duration: 600, delay: 100 }}>
		<div class="header-content">
			<div class="success-badge" in:scale={{ duration: 400, delay: 200, easing: elasticOut }}>
				✓ Policies Generated
			</div>
			<h2 class="preview-title gradient-text">Security Policies for {organizationName}</h2>
			<div class="framework-badge">
				<span class="badge-icon">🛡️</span>
				<span class="badge-text">Compliance Framework: <strong>{framework}</strong></span>
			</div>
		</div>

		<div class="action-buttons" in:fly={{ x: 30, duration: 500, delay: 300 }}>
			<button class="secondary-btn" on:click={resetForm}>
				<span class="btn-icon">🔄</span>
				Generate New Policies
			</button>
			<button class="export-btn" on:click={handleExport} disabled={isExporting} class:loading={isExporting}>
				<span class="btn-content">
					{#if isExporting}
						<div class="spinner"></div>
						Exporting...
					{:else}
						<span class="btn-icon">💾</span>
						Export as PDF Bundle
					{/if}
				</span>
			</button>
		</div>
	</div>

	<div class="tabs-container" in:fly={{ y: 20, duration: 500, delay: 400 }}>
		<div class="policy-tabs">
			<button
				class="tab {activePolicy === 'accessControl' ? 'active' : ''}"
				on:click={() => (activePolicy = 'accessControl')}
			>
				<span class="tab-icon">🔐</span>
				<span class="tab-text">Access Control</span>
			</button>
			<button
				class="tab {activePolicy === 'acceptableUsage' ? 'active' : ''}"
				on:click={() => (activePolicy = 'acceptableUsage')}
			>
				<span class="tab-icon">📋</span>
				<span class="tab-text">Acceptable Usage</span>
			</button>
			<button
				class="tab {activePolicy === 'incidentResponse' ? 'active' : ''}"
				on:click={() => (activePolicy = 'incidentResponse')}
			>
				<span class="tab-icon">⚡</span>
				<span class="tab-text">Incident Response</span>
			</button>
		</div>
	</div>

	<div class="policy-content" in:fly={{ y: 30, duration: 500, delay: 500 }}>
		<div class="policy-card">
			<div class="policy-header">
				<div class="policy-title-section">
					<h3 class="policy-title">{policyTitles[activePolicy]}</h3>
					<div class="policy-meta">
						<span class="meta-item">
							<span class="meta-icon">📄</span>
							Generated for {organizationName}
						</span>
						<span class="meta-item">
							<span class="meta-icon">🕰️</span>
							{new Date().toLocaleDateString()}
						</span>
					</div>
				</div>
			</div>

			<div class="rendered-content">
				<!-- eslint-disable-next-line svelte/no-at-html-tags -->
				{@html renderedHTML}
			</div>
		</div>
	</div>
</div>

<style>
	.policy-preview {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	/* Header Styles */
	.preview-header {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: var(--border-radius-lg);
		padding: 3rem 2rem 2rem;
		margin-bottom: 3rem;
		box-shadow: var(--shadow-xl);
		border: 1px solid rgba(255, 255, 255, 0.2);
		position: relative;
		overflow: hidden;
	}

	.preview-header::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: var(--gradient-primary);
	}

	.header-content {
		text-align: center;
		margin-bottom: 2rem;
	}

	.success-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(34, 197, 94, 0.1);
		color: #16a34a;
		padding: 0.5rem 1rem;
		border-radius: 25px;
		font-weight: 600;
		font-size: 0.9rem;
		border: 1px solid rgba(34, 197, 94, 0.2);
		margin-bottom: 1rem;
	}

	.preview-title {
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 700;
		margin-bottom: 1.5rem;
		line-height: 1.2;
		letter-spacing: -0.02em;
	}

	.framework-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--fsp-light-blue);
		color: white;
		padding: 0.75rem 1.5rem;
		border-radius: 25px;
		font-weight: 500;
		box-shadow: var(--shadow-md);
	}

	.badge-icon {
		font-size: 1.1rem;
	}

	.badge-text strong {
		font-weight: 700;
	}

	/* Action Buttons */
	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.secondary-btn,
	.export-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 1.75rem;
		border-radius: var(--border-radius);
		font-weight: 600;
		cursor: pointer;
		transition: var(--transition);
		border: none;
		font-size: 1rem;
		position: relative;
		overflow: hidden;
		box-shadow: var(--shadow-md);
	}

	.secondary-btn {
		background: var(--fsp-dark-gray);
		color: white;
	}

	.secondary-btn:hover {
		background: #2a3f47;
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.export-btn {
		background: var(--gradient-secondary);
		color: white;
	}

	.export-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.export-btn:disabled {
		background: #ccc;
		cursor: not-allowed;
		transform: none;
	}

	.btn-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-icon {
		font-size: 1rem;
	}

	/* Tabs */
	.tabs-container {
		margin-bottom: 2rem;
	}

	.policy-tabs {
		display: flex;
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(10px);
		border-radius: var(--border-radius);
		padding: 0.5rem;
		box-shadow: var(--shadow-md);
		gap: 0.25rem;
	}

	.tab {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 1.5rem;
		background: none;
		border: none;
		cursor: pointer;
		font-weight: 500;
		color: var(--fsp-dark-gray);
		border-radius: var(--border-radius-sm);
		transition: var(--transition);
		position: relative;
	}

	.tab:hover:not(.active) {
		background: rgba(97, 164, 212, 0.1);
		color: var(--fsp-light-blue);
		transform: translateY(-1px);
	}

	.tab.active {
		background: var(--fsp-light-blue);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.tab-icon {
		font-size: 1.1rem;
	}

	.tab-text {
		font-size: 0.95rem;
	}

	/* Policy Content */
	.policy-content {
		margin-bottom: 2rem;
	}

	.policy-card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(20px);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-xl);
		border: 1px solid rgba(255, 255, 255, 0.2);
		overflow: hidden;
	}

	.policy-header {
		background: var(--gradient-primary);
		color: white;
		padding: 2rem;
		position: relative;
	}

	.policy-header::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
	}

	.policy-title-section {
		text-align: center;
	}

	.policy-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 1rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.policy-meta {
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.meta-icon {
		font-size: 1rem;
	}

	.rendered-content {
		padding: 3rem;
		line-height: 1.7;
		color: var(--fsp-dark-gray);
		max-height: 70vh;
		overflow-y: auto;
		position: relative;
	}

	/* Custom Scrollbar */
	.rendered-content::-webkit-scrollbar {
		width: 8px;
	}

	.rendered-content::-webkit-scrollbar-track {
		background: rgba(213, 218, 226, 0.3);
		border-radius: 4px;
	}

	.rendered-content::-webkit-scrollbar-thumb {
		background: var(--fsp-light-blue);
		border-radius: 4px;
	}

	.rendered-content::-webkit-scrollbar-thumb:hover {
		background: var(--fsp-navy);
	}

	/* Content Styling */
	.rendered-content :global(h1) {
		color: var(--fsp-navy);
		border-bottom: 3px solid var(--fsp-light-blue);
		padding-bottom: 0.75rem;
		margin-bottom: 2rem;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.rendered-content :global(h2) {
		color: var(--fsp-light-blue);
		margin-top: 2.5rem;
		margin-bottom: 1.25rem;
		font-size: 1.4rem;
		font-weight: 600;
		position: relative;
		padding-left: 1rem;
	}

	.rendered-content :global(h2)::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.25rem;
		width: 4px;
		height: 1.5rem;
		background: var(--fsp-orange);
		border-radius: 2px;
	}

	.rendered-content :global(h3) {
		color: var(--fsp-dark-gray);
		margin-top: 2rem;
		margin-bottom: 1rem;
		font-weight: 600;
	}

	.rendered-content :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 2rem 0;
		border-radius: var(--border-radius-sm);
		overflow: hidden;
		box-shadow: var(--shadow-sm);
	}

	.rendered-content :global(th),
	.rendered-content :global(td) {
		padding: 1rem 1.25rem;
		text-align: left;
		border-bottom: 1px solid var(--fsp-light-gray);
	}

	.rendered-content :global(th) {
		background: linear-gradient(135deg, var(--fsp-light-blue), var(--fsp-navy));
		color: white;
		font-weight: 600;
		text-transform: uppercase;
		font-size: 0.85rem;
		letter-spacing: 0.05em;
	}

	.rendered-content :global(tbody tr):hover {
		background: rgba(97, 164, 212, 0.05);
	}

	.rendered-content :global(ul),
	.rendered-content :global(ol) {
		margin-bottom: 1.5rem;
		padding-left: 2rem;
	}

	.rendered-content :global(li) {
		margin-bottom: 0.75rem;
		line-height: 1.6;
	}

	.rendered-content :global(li)::marker {
		color: var(--fsp-light-blue);
	}

	.rendered-content :global(p) {
		margin-bottom: 1.25rem;
	}

	.rendered-content :global(strong) {
		color: var(--fsp-navy);
		font-weight: 600;
	}

	.rendered-content :global(code) {
		background: rgba(97, 164, 212, 0.1);
		color: var(--fsp-navy);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.9em;
	}

	.rendered-content :global(blockquote) {
		border-left: 4px solid var(--fsp-orange);
		background: rgba(250, 167, 47, 0.05);
		padding: 1rem 1.5rem;
		margin: 1.5rem 0;
		border-radius: 0 var(--border-radius-sm) var(--border-radius-sm) 0;
		font-style: italic;
	}

	/* Spinner Animation */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Responsive Design */
	@media (max-width: 968px) {
		.policy-tabs {
			flex-direction: column;
		}

		.tab {
			justify-content: flex-start;
		}

		.action-buttons {
			flex-direction: column;
			align-items: center;
		}

		.secondary-btn,
		.export-btn {
			width: 100%;
			max-width: 300px;
		}
	}

	@media (max-width: 768px) {
		.preview-header {
			padding: 2rem 1.5rem;
		}

		.rendered-content {
			padding: 2rem 1.5rem;
		}

		.policy-header {
			padding: 1.5rem;
		}

		.policy-meta {
			flex-direction: column;
			gap: 1rem;
		}

		.preview-title {
			font-size: 1.75rem;
		}

		.policy-title {
			font-size: 1.5rem;
		}
	}

	@media (max-width: 480px) {
		.policy-preview {
			padding: 0 0.5rem;
		}

		.preview-header {
			padding: 1.5rem 1rem;
		}

		.rendered-content {
			padding: 1.5rem 1rem;
			max-height: 60vh;
		}

		.policy-header {
			padding: 1rem;
		}

		.tab {
			padding: 0.75rem 1rem;
		}

		.tab-text {
			font-size: 0.85rem;
		}
	}
</style>
