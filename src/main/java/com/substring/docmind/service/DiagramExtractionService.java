package com.substring.docmind.service;

import com.substring.docmind.entity.DocumentDiagram;
import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.repository.DocumentDiagramRepository;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.PDXObject;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
public class DiagramExtractionService {

    private final DocumentDiagramRepository diagramRepository;
    private final String uploadDir;

    public DiagramExtractionService(
            DocumentDiagramRepository diagramRepository,
            @Value("${app.upload.dir:uploads}") String uploadDir) {
        this.diagramRepository = diagramRepository;
        this.uploadDir = uploadDir;
    }

    /**
     * Extracts embedded architecture diagrams, workflow charts, and system designs from PDF pages.
     */
    public List<DocumentDiagram> extractAndSaveDiagrams(DocumentMetadata metadata, MultipartFile file) {
        List<DocumentDiagram> diagrams = new ArrayList<>();
        String filename = metadata.getFilename();

        if (filename == null || !filename.toLowerCase().endsWith(".pdf")) {
            return diagrams;
        }

        try {
            byte[] fileBytes = file.getBytes();
            try (PDDocument document = Loader.loadPDF(fileBytes)) {
                Path diagramDir = Paths.get(uploadDir, "diagrams", metadata.getId().toString());
                Files.createDirectories(diagramDir);

                int pageIndex = 1;
                for (PDPage page : document.getPages()) {
                    PDResources resources = page.getResources();
                    if (resources == null) {
                        pageIndex++;
                        continue;
                    }

                    int imageCountOnPage = 1;
                    for (COSName name : resources.getXObjectNames()) {
                        try {
                            PDXObject xObject = resources.getXObject(name);
                            if (xObject instanceof PDImageXObject imageXObject) {
                                BufferedImage image = imageXObject.getImage();
                                if (image == null) continue;

                                int width = image.getWidth();
                                int height = image.getHeight();

                                // Filter out tiny icons, decorative bullets, or zero-dimension images
                                if (width < 120 || height < 120) {
                                    continue;
                                }

                                String imageFileName = String.format("diagram_p%d_%d.png", pageIndex, imageCountOnPage);
                                Path targetPath = diagramDir.resolve(imageFileName);

                                ImageIO.write(image, "PNG", targetPath.toFile());

                                String caption = String.format("Architecture / System diagram from Page %d of %s", pageIndex, metadata.getFilename());

                                DocumentDiagram diagram = DocumentDiagram.builder()
                                        .documentId(metadata.getId())
                                        .pageNumber(pageIndex)
                                        .imageFileName(imageFileName)
                                        .imagePath(targetPath.toAbsolutePath().toString())
                                        .contentType("image/png")
                                        .width(width)
                                        .height(height)
                                        .caption(caption)
                                        .build();

                                DocumentDiagram saved = diagramRepository.save(diagram);
                                diagrams.add(saved);
                                log.info("Extracted diagram #{} from page {} of {} ({}x{})", saved.getId(), pageIndex, filename, width, height);

                                imageCountOnPage++;
                            }
                        } catch (Exception imgEx) {
                            log.warn("Could not extract image '{}' on page {}: {}", name.getName(), pageIndex, imgEx.getMessage());
                        }
                    }
                    pageIndex++;
                }
            }
        } catch (Exception e) {
            log.warn("Diagram extraction skipped or failed for {}: {}", filename, e.getMessage());
        }

        return diagrams;
    }
}
