package com.substring.docmind.controller;

import com.substring.docmind.dto.ApiResponse;
import com.substring.docmind.dto.DocumentDiagramDto;
import com.substring.docmind.entity.DocumentDiagram;
import com.substring.docmind.repository.DocumentDiagramRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/diagrams")
@Tag(name = "Document Diagrams", description = "Endpoints for retrieving extracted architecture diagrams and image citations")
@Slf4j
public class DiagramController {

    private final DocumentDiagramRepository diagramRepository;

    public DiagramController(DocumentDiagramRepository diagramRepository) {
        this.diagramRepository = diagramRepository;
    }

    @GetMapping("/{id}/image")
    @Operation(summary = "Stream raw diagram image by ID")
    public ResponseEntity<Resource> getDiagramImage(@PathVariable UUID id) {
        return diagramRepository.findById(id)
                .map(diagram -> {
                    try {
                        Path path = Paths.get(diagram.getImagePath());
                        if (!Files.exists(path)) {
                            return ResponseEntity.notFound().<Resource>build();
                        }

                        byte[] data = Files.readAllBytes(path);
                        MediaType mediaType = diagram.getContentType().equalsIgnoreCase("image/jpeg")
                                ? MediaType.IMAGE_JPEG
                                : MediaType.IMAGE_PNG;

                        return ResponseEntity.ok()
                                .contentType(mediaType)
                                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                                .body((Resource) new ByteArrayResource(data));
                    } catch (IOException e) {
                        log.error("Failed to read diagram image file: {}", e.getMessage());
                        return ResponseEntity.internalServerError().<Resource>build();
                    }
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/document/{documentId}")
    @Operation(summary = "Get all diagrams extracted from a document")
    public ResponseEntity<ApiResponse<List<DocumentDiagramDto>>> getDiagramsByDocument(@PathVariable UUID documentId) {
        List<DocumentDiagram> diagrams = diagramRepository.findByDocumentId(documentId);

        List<DocumentDiagramDto> dtos = diagrams.stream()
                .map(d -> DocumentDiagramDto.builder()
                        .id(d.getId())
                        .documentId(d.getDocumentId())
                        .pageNumber(d.getPageNumber())
                        .imageUrl("/api/v1/diagrams/" + d.getId() + "/image")
                        .width(d.getWidth())
                        .height(d.getHeight())
                        .caption(d.getCaption())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(
                ApiResponse.<List<DocumentDiagramDto>>builder()
                        .success(true)
                        .message("Diagrams retrieved successfully")
                        .data(dtos)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }
}
