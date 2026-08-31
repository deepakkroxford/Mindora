package com.substring.docmind;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.junit.jupiter.api.Test;

import java.awt.*;
import java.awt.geom.RoundRectangle2D;
import java.awt.image.BufferedImage;
import java.io.File;

public class GenerateSampleDiagramPdf {

    @Test
    public void generateDiagramPdf() throws Exception {
        System.out.println("Generating sample architecture diagram image...");
        BufferedImage diagramImg = createArchitectureDiagram();

        System.out.println("Creating PDF with embedded architecture diagram...");
        PDDocument document = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        PDImageXObject pdImage = LosslessFactory.createFromImage(document, diagramImg);

        try (PDPageContentStream cs = new PDPageContentStream(document, page)) {
            // Draw Architecture Diagram Image
            float imgWidth = 500;
            float imgHeight = 280;
            float imgX = 50;
            float imgY = 460;
            cs.drawImage(pdImage, imgX, imgY, imgWidth, imgHeight);

            // Title
            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 17);
            cs.setNonStrokingColor(new Color(15, 23, 42));
            cs.newLineAtOffset(50, 780);
            cs.showText("Mindora Enterprise Distributed Cloud Architecture");
            cs.endText();

            // Subtitle
            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
            cs.setNonStrokingColor(new Color(100, 116, 139));
            cs.newLineAtOffset(50, 760);
            cs.showText("System Architecture Specification & Multi-Tier Vector Search Pipeline");
            cs.endText();

            // Section 1: Overview Text
            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
            cs.setNonStrokingColor(new Color(15, 23, 42));
            cs.newLineAtOffset(50, 425);
            cs.showText("1. System Architecture Components Overview");
            cs.endText();

            String[] bodyLines = {
                "As illustrated in the architecture diagram above, client requests first terminate at the API Gateway.",
                "The Spring Cloud Gateway handles stateless JWT token verification, dynamic route dispatching, and rate limiting.",
                "Downstream microservices communicate asynchronously and store embeddings in PostgreSQL pgvector.",
                "Repeated queries check the multi-tier Redis Semantic Cache with sub-15ms latency.",
                "Reciprocal Rank Fusion (RRF) merges dense vector similarity scores with BM25 sparse keyword indices.",
                "This guarantees 100% grounded technical responses with zero hallucinations."
            };

            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 9.5f);
            cs.setNonStrokingColor(new Color(51, 65, 85));
            cs.setLeading(16);
            cs.newLineAtOffset(50, 402);
            for (String line : bodyLines) {
                cs.showText(line);
                cs.newLine();
            }
            cs.endText();

            // Footer
            cs.beginText();
            cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE), 8);
            cs.setNonStrokingColor(new Color(148, 163, 184));
            cs.newLineAtOffset(50, 50);
            cs.showText("Page 1 • Mindora Cloud Systems Design • Confidential");
            cs.endText();
        }

        File pdfOutput = new File("/Users/deepakkumarsingh/Desktop/Mindora-Rag-project/Mindora_Cloud_Architecture_With_Diagram.pdf");
        document.save(pdfOutput);
        document.close();

        System.out.println("SUCCESS! Created PDF: " + pdfOutput.getAbsolutePath());
    }

    private static BufferedImage createArchitectureDiagram() {
        int width = 1000;
        int height = 560;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();

        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Dark modern background
        g.setColor(new Color(11, 15, 25));
        g.fillRect(0, 0, width, height);

        // Grid lines
        g.setColor(new Color(25, 35, 55));
        for (int x = 0; x < width; x += 40) {
            g.drawLine(x, 0, x, height);
        }
        for (int y = 0; y < height; y += 40) {
            g.drawLine(0, y, width, y);
        }

        // Header Title on Diagram
        g.setFont(new Font("SansSerif", Font.BOLD, 22));
        g.setColor(new Color(45, 212, 191));
        g.drawString("MINDORA RAG CLUSTER & SYSTEM ARCHITECTURE", 40, 50);

        // 1. Client App Node
        drawNode(g, 60, 160, 180, 110, "React 19 Client", "• Tailwind & Glassmorphism\n• Lightbox & Zoom Canvas\n• Streaming SSE Receiver", new Color(14, 165, 233));

        // Arrow 1
        drawArrow(g, 240, 215, 340, 215, "HTTPS / JWT");

        // 2. API Gateway & Security
        drawNode(g, 340, 140, 200, 150, "API Gateway & Security", "• Spring Cloud Gateway\n• JWT Filter Chain\n• Sliding-Window Rate Limit\n• SSL Termination", new Color(20, 184, 166));

        // Arrow 2 (Up to Cache)
        drawArrow(g, 440, 140, 440, 80, "");
        drawNode(g, 350, 20, 180, 60, "Redis Multi-Tier Cache", "• Semantic Cache (2h TTL)\n• Rate Limiter Token Bucket", new Color(245, 158, 11));

        // Arrow 3 (To RAG Core)
        drawArrow(g, 540, 215, 640, 215, "Scoped Vector Query");

        // 3. RAG Core & Spring AI
        drawNode(g, 640, 140, 220, 150, "Spring AI & Hybrid RAG", "• dense & sparse RRF\n• OpenAI text-embedding-3\n• Prompt Guardrails (<45%)\n• PDFBox Diagram Extractor", new Color(168, 85, 247));

        // Arrow 4 (Down to Storage)
        drawArrow(g, 750, 290, 750, 360, "Nearest Neighbor (<=>)");

        // 4. PostgreSQL & pgvector Database
        drawNode(g, 620, 360, 260, 140, "PostgreSQL 17 + pgvector", "• HNSW Cosine Index\n• 1536-dim Embedding Vector\n• Document Diagram Metadata\n• Persistent Quiz & Mind Maps", new Color(16, 185, 129));

        g.dispose();
        return image;
    }

    private static void drawNode(Graphics2D g, int x, int y, int w, int h, String title, String body, Color accent) {
        g.setColor(new Color(20, 28, 48));
        g.fill(new RoundRectangle2D.Float(x, y, w, h, 18, 18));

        g.setColor(accent);
        g.setStroke(new BasicStroke(2.0f));
        g.draw(new RoundRectangle2D.Float(x, y, w, h, 18, 18));

        g.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 40));
        g.fill(new RoundRectangle2D.Float(x, y, w, 34, 18, 18));

        g.setFont(new Font("SansSerif", Font.BOLD, 13));
        g.setColor(Color.WHITE);
        g.drawString(title, x + 14, y + 23);

        g.setFont(new Font("SansSerif", Font.PLAIN, 11));
        g.setColor(new Color(203, 213, 225));
        int textY = y + 54;
        for (String line : body.split("\n")) {
            g.drawString(line, x + 14, textY);
            textY += 18;
        }
    }

    private static void drawArrow(Graphics2D g, int x1, int y1, int x2, int y2, String label) {
        g.setColor(new Color(45, 212, 191));
        g.setStroke(new BasicStroke(2.0f, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));
        g.drawLine(x1, y1, x2, y2);

        int size = 8;
        if (x1 == x2 && y1 > y2) {
            g.fillPolygon(new int[]{x2, x2 - size, x2 + size}, new int[]{y2, y2 + size, y2 + size}, 3);
        } else if (x1 == x2 && y1 < y2) {
            g.fillPolygon(new int[]{x2, x2 - size, x2 + size}, new int[]{y2, y2 - size, y2 - size}, 3);
        } else {
            g.fillPolygon(new int[]{x2, x2 - size, x2 - size}, new int[]{y2, y2 - size, y2 + size}, 3);
        }

        if (label != null && !label.isEmpty()) {
            g.setFont(new Font("SansSerif", Font.BOLD, 10));
            g.setColor(new Color(148, 163, 184));
            g.drawString(label, (x1 + x2) / 2 - 30, y1 - 8);
        }
    }
}
