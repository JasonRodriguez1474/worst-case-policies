import JSZip from 'jszip';
import MarkdownIt from 'markdown-it';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { PolicySet, SecurityFramework } from '$lib/types';

interface PDFOptions {
	margin: number;
	fontSize: number;
	lineHeight: number;
	pageHeight: number;
	pageWidth: number;
}

const defaultOptions: PDFOptions = {
	margin: 20,
	fontSize: 10,
	lineHeight: 1.4,
	pageHeight: 297, // A4 height in mm
	pageWidth: 210 // A4 width in mm
};

export async function exportToPDF(
	policies: PolicySet,
	organizationName: string,
	framework: SecurityFramework
): Promise<void> {
	try {
		const zip = new JSZip();

		// Create PDFs for each policy
		const accessControlPdf = await createPolicyPDF(
			policies.accessControl,
			'Access Control Policy',
			organizationName,
			framework
		);

		const acceptableUsagePdf = await createPolicyPDF(
			policies.acceptableUsage,
			'Acceptable Usage Policy',
			organizationName,
			framework
		);

		const incidentResponsePdf = await createPolicyPDF(
			policies.incidentResponse,
			'Incident Response Policy',
			organizationName,
			framework
		);

		// Add PDFs to zip
		zip.file(`${organizationName}_Access_Control_Policy.pdf`, accessControlPdf);
		zip.file(`${organizationName}_Acceptable_Usage_Policy.pdf`, acceptableUsagePdf);
		zip.file(`${organizationName}_Incident_Response_Policy.pdf`, incidentResponsePdf);

		// Generate and download zip
		const zipBlob = await zip.generateAsync({ type: 'blob' });
		downloadBlob(
			zipBlob,
			`${organizationName}_Security_Policies_${framework.replace(/\s+/g, '_')}.zip`
		);
	} catch (error) {
		console.error('Error exporting policies:', error);
		throw new Error('Failed to export policies');
	}
}

async function createPolicyPDF(
	markdownContent: string,
	policyTitle: string,
	organizationName: string,
	framework: SecurityFramework
): Promise<Uint8Array> {
	const options = defaultOptions;

	// Convert markdown to HTML using markdown-it
	const md = new MarkdownIt();
	const htmlContent = md.render(markdownContent);

	// Create PDF document
	const doc = new jsPDF({
		unit: 'mm',
		format: 'a4',
		orientation: 'portrait'
	});

	// Set default font
	doc.setFontSize(options.fontSize);
	let yPosition = options.margin;

	// Add title
	doc.setFontSize(16);
	doc.setFont('helvetica', 'bold');
	doc.text(policyTitle, options.margin, yPosition);
	yPosition += 10;

	// Add organization name
	doc.setFontSize(14);
	doc.text(organizationName, options.margin, yPosition);
	yPosition += 8;

	// Add framework and date
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	doc.text(`Framework: ${framework}`, options.margin, yPosition);
	yPosition += 5;
	doc.text(`Generated: ${new Date().toLocaleDateString()}`, options.margin, yPosition);
	yPosition += 10;

	// Parse and render HTML content
	yPosition = await renderHtmlContent(doc, htmlContent, options.margin, yPosition, options);

	// Generate PDF as Uint8Array
	const pdfOutput = doc.output('arraybuffer');
	return new Uint8Array(pdfOutput);
}

async function renderHtmlContent(
	doc: jsPDF,
	htmlContent: string,
	leftMargin: number,
	startY: number,
	options: PDFOptions
): Promise<number> {
	const parser = new DOMParser();
	const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
	const body = htmlDoc.body;
	
	let yPosition = startY;
	const pageHeight = options.pageHeight - options.margin;
	const pageWidth = options.pageWidth - (2 * options.margin);

	function checkPageBreak(requiredSpace: number = 10): void {
		if (yPosition + requiredSpace > pageHeight) {
			doc.addPage();
			yPosition = options.margin;
		}
	}

	function processElement(element: Element): void {
		const tagName = element.tagName.toLowerCase();

		switch (tagName) {
			case 'h1':
			case 'h2':
			case 'h3':
			case 'h4':
			case 'h5':
			case 'h6': {
				checkPageBreak(15);
				yPosition += 5;
				const headingSize = tagName === 'h1' ? 14 : tagName === 'h2' ? 12 : 11;
				doc.setFontSize(headingSize);
				doc.setFont('helvetica', 'bold');
				const headingText = element.textContent || '';
				const headingLines = doc.splitTextToSize(headingText, pageWidth);
				doc.text(headingLines, leftMargin, yPosition);
				yPosition += headingLines.length * (headingSize * 0.35) + 5;
				doc.setFontSize(options.fontSize);
				doc.setFont('helvetica', 'normal');
				break;
			}

			case 'p': {
				checkPageBreak(10);
				yPosition += 3;
				const text = element.textContent || '';
				if (text.trim()) {
					const lines = doc.splitTextToSize(text, pageWidth);
					doc.text(lines, leftMargin, yPosition);
					yPosition += lines.length * (options.fontSize * 0.35) + 3;
				}
				break;
			}

			case 'ul':
			case 'ol': {
				checkPageBreak(15);
				yPosition += 3;
				const listItems = Array.from(element.children);
				listItems.forEach((li, index) => {
					checkPageBreak(8);
					const bullet = tagName === 'ul' ? '•' : `${index + 1}.`;
					const liText = li.textContent || '';
					const indentedText = `${bullet} ${liText}`;
					const liLines = doc.splitTextToSize(indentedText, pageWidth - 10);
					doc.text(liLines, leftMargin + 5, yPosition);
					yPosition += liLines.length * (options.fontSize * 0.35) + 2;
				});
				yPosition += 3;
				break;
			}

			case 'table': {
				checkPageBreak(30);
				const tableData: string[][] = [];
				const rows = Array.from(element.querySelectorAll('tr'));
				
				rows.forEach(row => {
					const cells = Array.from(row.querySelectorAll('th, td'));
					const rowData = cells.map(cell => cell.textContent || '');
					tableData.push(rowData);
				});

				if (tableData.length > 0) {
					autoTable(doc, {
						head: [tableData[0]],
						body: tableData.slice(1),
						startY: yPosition,
						margin: { left: leftMargin },
						theme: 'grid',
						headStyles: {
							fillColor: [240, 240, 240],
							textColor: [0, 0, 0],
							fontSize: options.fontSize,
							fontStyle: 'bold'
						},
						bodyStyles: {
							fontSize: options.fontSize,
							textColor: [0, 0, 0]
						},
						styles: {
							cellPadding: 3,
							lineColor: [0, 0, 0],
							lineWidth: 0.5
						}
					});
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					yPosition = (doc as any).lastAutoTable.finalY + 10;
				}
				break;
			}

			case 'strong':
			case 'b':
				// These are handled inline, skip for now
				break;

			case 'em':
			case 'i':
				// These are handled inline, skip for now  
				break;

			case 'br':
				yPosition += options.fontSize * 0.35;
				break;

			default:
				// For other elements, process their children
				Array.from(element.children).forEach(child => {
					processElement(child);
				});
				
				// If it's a text node or leaf element, add the text
				if (element.children.length === 0) {
					const text = element.textContent || '';
					if (text.trim()) {
						checkPageBreak(8);
						const lines = doc.splitTextToSize(text, pageWidth);
						doc.text(lines, leftMargin, yPosition);
						yPosition += lines.length * (options.fontSize * 0.35) + 2;
					}
				}
		}
	}

	// Process all child elements
	Array.from(body.children).forEach(child => {
		processElement(child);
	});

	return yPosition;
}

function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';

	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);

	URL.revokeObjectURL(url);
}
