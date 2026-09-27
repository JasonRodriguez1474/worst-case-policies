import { json } from '@sveltejs/kit';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';
import type { PolicyFormData, PolicySet, SecurityFramework } from '$lib/types';
import { OPENROUTER_API_KEY } from '$env/static/private';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

const DEFAULT_MODEL = 'meta-llama/llama-3.1-8b-instruct';
const openrouter = createOpenRouter({ apiKey: OPENROUTER_API_KEY });

export async function POST({ request }: RequestEvent) {
	try {
		const formData: PolicyFormData = await request.json();

		// Validate input
		if (!formData.organizationName || !formData.framework || !formData.constraints) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		if (formData.organizationName.length > 20) {
			return json({ error: 'Organization name too long' }, { status: 400 });
		}

		if (formData.constraints.length > 500) {
			return json({ error: 'Constraints too long' }, { status: 400 });
		}

		const frameworkMapping = getFrameworkRequirements(formData.framework);

		// Generate Access Control Policy
		const accessControlPrompt = `Create a comprehensive Access Control Policy for ${formData.organizationName} that must comply with ${formData.framework} requirements. 

Organization specifics: ${formData.constraints}

The policy must follow this EXACT format:

# Access Control Policy - ${formData.organizationName}

## Purpose & Scope
[Detailed purpose and scope section]

## Policy Statements - Core requirements according to policy type
[Comprehensive policy statements with numbered requirements]

## Roles & Responsibilities
[Clear role definitions and responsibilities]

## Compliance & Enforcement
[Enforcement mechanisms and compliance requirements]

## Review Cycle
[Policy review and update procedures]

## Appendices
# Appendix A: Glossary
[Key terms and definitions]

## Framework-Specific Requirements
[Specific ${formData.framework} control requirements]

## Framework Mappings
| Policy | Control ID | Description
[Table mapping policy requirements to ${formData.framework} controls]

Key requirements for ${formData.framework}:
${frameworkMapping.accessControl.join('\n')}`;

		// Generate Acceptable Usage Policy
		const acceptableUsagePrompt = `Create a comprehensive Acceptable Usage Policy for ${formData.organizationName} that must comply with ${formData.framework} requirements.

Organization specifics: ${formData.constraints}

The policy must follow this EXACT format:

# Acceptable Usage Policy - ${formData.organizationName}

## Purpose & Scope
[Detailed purpose and scope section]

## Policy Statements - Core requirements according to policy type
[Comprehensive policy statements with numbered requirements]

## Roles & Responsibilities
[Clear role definitions and responsibilities]

## Compliance & Enforcement
[Enforcement mechanisms and compliance requirements]

## Review Cycle
[Policy review and update procedures]

## Appendices
# Appendix A: Glossary
[Key terms and definitions]

## Framework-Specific Requirements
[Specific ${formData.framework} control requirements]

## Framework Mappings
| Policy | Control ID | Description
[Table mapping policy requirements to ${formData.framework} controls]

Key requirements for ${formData.framework}:
${frameworkMapping.acceptableUsage.join('\n')}`;

		// Generate Incident Response Policy
		const incidentResponsePrompt = `Create a comprehensive Incident Response Policy for ${formData.organizationName} that must comply with ${formData.framework} requirements.

Organization specifics: ${formData.constraints}

The policy must follow this EXACT format:

# Incident Response Policy - ${formData.organizationName}

## Purpose & Scope
[Detailed purpose and scope section]

## Policy Statements - Core requirements according to policy type
[Comprehensive policy statements with numbered requirements]

## Roles & Responsibilities
[Clear role definitions and responsibilities]

## Compliance & Enforcement
[Enforcement mechanisms and compliance requirements]

## Review Cycle
[Policy review and update procedures]

## Appendices
# Appendix A: Glossary
[Key terms and definitions]

## Framework-Specific Requirements
[Specific ${formData.framework} control requirements]

## Framework Mappings
| Policy | Control ID | Description
[Table mapping policy requirements to ${formData.framework} controls]

Key requirements for ${formData.framework}:
${frameworkMapping.incidentResponse.join('\n')}`;

		const modelId = env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;

		// Generate all three policies concurrently
		const [accessControlResult, acceptableUsageResult, incidentResponseResult] = await Promise.all([
			generateText({
				model: openrouter(modelId),
				prompt: accessControlPrompt
			}),
			generateText({
				model: openrouter(modelId),
				prompt: acceptableUsagePrompt
			}),
			generateText({
				model: openrouter(modelId),
				prompt: incidentResponsePrompt
			})
		]);

		const policies: PolicySet = {
			accessControl: accessControlResult.text,
			acceptableUsage: acceptableUsageResult.text,
			incidentResponse: incidentResponseResult.text
		};

		return json(policies);
	} catch (error) {
		console.error('Error generating policies:', error);
		return json({ error: 'Failed to generate policies' }, { status: 500 });
	}
}

function getFrameworkRequirements(framework: SecurityFramework) {
	const requirements = {
		'PCI-DSS': {
			accessControl: [
				'Requirement 7: Restrict access to cardholder data by business need-to-know',
				'Requirement 8: Identify and authenticate access to system components',
				'Strong access control measures and authentication procedures',
				'Role-based access control (RBAC) implementation',
				'Multi-factor authentication for administrative access'
			],
			acceptableUsage: [
				'Requirement 12: Maintain a policy that addresses information security',
				'User education and awareness requirements',
				'Prohibition of unauthorized cardholder data access',
				'Clear guidelines for system usage and data handling'
			],
			incidentResponse: [
				'Requirement 12.10: Implement an incident response plan',
				'Security incident detection and response procedures',
				'Forensic preservation requirements',
				'Communication protocols for security incidents'
			]
		},
		HIPAA: {
			accessControl: [
				'§164.308(a)(3) - Assigned security responsibility',
				'§164.308(a)(4) - Information access management',
				'§164.312(a)(1) - Access control standards',
				'§164.312(d) - Person or entity authentication',
				'Minimum necessary standard compliance'
			],
			acceptableUsage: [
				'§164.308(a)(5) - Security awareness and training',
				'§164.530(b) - Training requirements',
				'PHI handling and usage guidelines',
				'Workforce access restrictions and monitoring'
			],
			incidentResponse: [
				'§164.308(a)(6) - Security incident procedures',
				'§164.404 - Notification to individuals',
				'§164.406 - Notification to the media',
				'§164.408 - Notification to the Secretary',
				'Breach notification requirements within 60 days'
			]
		},
		'NIST 800-171': {
			accessControl: [
				'3.1.1 - Limit system access to authorized users',
				'3.1.2 - Limit system access to authorized functions',
				'3.1.3 - Control CUI in accordance with approved authorizations',
				'3.5.1 - Identify system users and processes',
				'3.5.2 - Authenticate system users and processes'
			],
			acceptableUsage: [
				'3.2.1 - Ensure that managers, systems administrators receive security training',
				'3.2.2 - Ensure that personnel are trained to carry out assigned responsibilities',
				'CUI handling and marking requirements',
				'System usage monitoring and restrictions'
			],
			incidentResponse: [
				'3.6.1 - Establish operational incident-handling capability',
				'3.6.2 - Track, document, and report incidents',
				'3.6.3 - Test incident response capability',
				'CUI incident reporting to government authorities'
			]
		},
		'CMMC Level 1': {
			accessControl: [
				'AC.L1-3.1.1 - Limit information system access',
				'AC.L1-3.1.2 - Limit information system access to authorized functions',
				'IA.L1-3.5.1 - Identify information system users',
				'IA.L1-3.5.2 - Authenticate information system users',
				'Basic access controls and user identification'
			],
			acceptableUsage: [
				'AT.L1-3.2.1 - Ensure security awareness training',
				'AT.L1-3.2.2 - Ensure role-based security training',
				'FCI protection and handling requirements',
				'System usage guidelines and restrictions'
			],
			incidentResponse: [
				'IR.L1-3.6.1 - Establish incident handling capability',
				'IR.L1-3.6.2 - Track and document security incidents',
				'Basic incident response procedures',
				'Security incident documentation requirements'
			]
		}
	};

	return requirements[framework];
}
