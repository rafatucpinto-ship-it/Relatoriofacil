import { jsPDF } from 'jspdf';
import { ReportData, ReportTemplate } from '../types';

export const generatePDF = async (report: ReportData, template: ReportTemplate): Promise<boolean> => {
  try {
    const doc = new jsPDF();
    const margin = 15;
    let y = margin;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    const hideEmptyFields = localStorage.getItem('hideEmptyFields') === 'true';

    // Helper to add text and advance Y
    const addText = (text: string, size: number = 10, isBold: boolean = false, align: 'left' | 'center' = 'left') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      
      if (align === 'center') {
        doc.text(text, pageWidth / 2, y, { align: 'center' });
      } else {
        // Basic text wrapping
        const lines = doc.splitTextToSize(text || '', contentWidth);
        // Ensure strictly string[] or string for doc.text
        doc.text(lines, margin, y);
        return lines.length * (size * 0.5); // approximate height increment
      }
      return size * 0.5;
    };

    // Header
    y += addText('Relatório de Execução', 18, true, 'center');
    y += 10;
    y += addText('AUTOMAÇÃO – MINA SERRA SUL', 14, true, 'center');
    y += 15;

    // Draw a line
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Fields
    const labelSize = 11;
    const valueSize = 11;
    const lineHeight = 7;

    const addField = (label: string, value: string) => {
      // Skip empty fields if config is enabled
      if (hideEmptyFields && (!value || value.trim() === '')) {
          return;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(labelSize);
      doc.text(label, margin, y);
      
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(valueSize);
      
      // Handle text wrapping for values
      const lines = doc.splitTextToSize(value || '', contentWidth - labelWidth - 2);
      doc.text(lines, margin + labelWidth + 2, y);
      
      y += (lines.length * lineHeight);
      
      // Page break check
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
    };

    addField('Data: ', report.date ? new Date(report.date).toLocaleDateString('pt-BR') : '');
    addField('Equipamento: ', report.equipment);
    addField('Nº OM: ', report.omNumber);
    addField('Tipo de Atividade: ', report.activityType);
    addField('Horário: ', `${report.startTime} às ${report.endTime}`);
    addField('Desvio IAMO: ', report.iamoDeviation ? `Sim (${report.iamoDeviationDetails})` : 'Não');
    addField('OM Finalizada: ', report.omFinished ? 'Sim' : 'Não');
    addField('Pendências: ', report.pendings ? `Sim (${report.pendingDetails || ''})` : 'Não');
    addField('Equipe (Turno): ', report.team);
    addField('Centro de Trabalho: ', report.workCenter);
    addField('Técnicos: ', report.technicians);

    y += 5;
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Fixed fields from template (Only show if not empty or if hiding is disabled)
    if (!hideEmptyFields || (template.omDescription && template.omDescription.trim())) {
      doc.setFont('helvetica', 'bold');
      doc.text('Descrição da OM:', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      const omLines = doc.splitTextToSize(template.omDescription || '', contentWidth);
      doc.text(omLines, margin, y);
      y += (omLines.length * 7) + 5;
    }

    // Use specific activity text from report, otherwise fall back to template default
    const activityText = report.activityExecuted || template.activityExecuted || '';
    
    if (!hideEmptyFields || activityText.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text('Atividade Executada:', margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      
      const actLines = doc.splitTextToSize(activityText, contentWidth);
      doc.text(actLines, margin, y);
      y += (actLines.length * 7) + 10;
    }

    // Photos
    if (report.photos && report.photos.length > 0) {
      // Ensure we start on a new page if space is low
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        y = margin;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Evidências Fotográficas:', margin, y);
      y += 10;

      const imgWidth = 80;
      const imgHeight = 60;
      let xPos = margin;
      
      report.photos.forEach((photo, index) => {
          // Calculate space needed (image + caption)
          const captionHeight = photo.caption ? 10 : 0; // Approximate
          const itemTotalHeight = imgHeight + captionHeight + 5;

          // Check page break (simplified logic for grid)
          if (index % 2 === 0 && y + itemTotalHeight > doc.internal.pageSize.getHeight() - margin) {
              doc.addPage();
              y = margin;
              xPos = margin;
          }

          try {
              let base64Data = typeof photo === 'string' ? photo : photo.base64;
              const caption = typeof photo === 'string' ? '' : photo.caption;

              // Validate string presence
              if (base64Data && base64Data.length > 100) {
                  
                  // Clean up prefix if exists
                  if (base64Data.includes(',')) {
                      base64Data = base64Data.split(',')[1];
                  }

                  // Add image
                  // Using simplified signature to avoid overload resolution errors where number is assigned to string
                  (doc as any).addImage(base64Data, 'JPEG', xPos, y, imgWidth, imgHeight);
              } else {
                  throw new Error("Invalid image data");
              }
              
              if (caption) {
                  doc.setFont('helvetica', 'italic');
                  doc.setFontSize(9);
                  // Center text relative to image
                  const textLines = doc.splitTextToSize(caption, imgWidth);
                  // Strict string check for doc.text to avoid overload errors
                  const finalCaption = Array.isArray(textLines) ? textLines.join('\n') : textLines;
                  doc.text(finalCaption, xPos, y + imgHeight + 5);
              }
          } catch (e) {
              console.error("Error adding image to PDF:", e);
              // Draw a placeholder or "Error" text where image should be so layout doesn't break
              doc.setDrawColor(200, 200, 200);
              doc.setFillColor(240, 240, 240);
              doc.rect(xPos, y, imgWidth, imgHeight, 'F');
              doc.setDrawColor(0, 0, 0);
              doc.setFillColor(0, 0, 0);
              doc.setFontSize(8);
              doc.text("Imagem Indisponível", xPos + 10, y + (imgHeight / 2));
          }

          // Grid logic (2 columns)
          if (index % 2 === 0) {
              xPos += imgWidth + 10;
          } else {
              xPos = margin;
              y += imgHeight + 20; 
          }
      });
    }

    const fileName = `Relatorio_OM${report.omNumber || 'XXX'}_${report.date}.pdf`;

    // --- Saving Logic (Download Only) ---
    try {
        doc.save(fileName);
        return true;
    } catch (finalError) {
        console.error("Save error:", finalError);
        alert("Não foi possível baixar o PDF. Tente usar um navegador diferente ou libere memória.");
        return false;
    }

  } catch (criticalError) {
      console.error("Critical error generating PDF:", criticalError);
      alert("Erro crítico ao gerar o PDF.");
      return false;
  }
};