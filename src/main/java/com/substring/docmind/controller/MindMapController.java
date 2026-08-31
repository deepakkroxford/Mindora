package com.substring.docmind.controller;

import com.substring.docmind.dto.ApiResponse;
import com.substring.docmind.dto.MindMapGenerationRequestDto;
import com.substring.docmind.dto.MindMapResponseDto;
import com.substring.docmind.service.MindMapService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/mindmap")
@Tag(name = "Concept Mind Map", description = "Endpoints for generating interactive visual mind maps and concept trees from documents")
public class MindMapController {

    private final MindMapService mindMapService;

    public MindMapController(MindMapService mindMapService) {
        this.mindMapService = mindMapService;
    }

    @PostMapping("/generate")
    @Operation(summary = "Generate interactive hierarchical concept mind map and persist to PostgreSQL")
    public ResponseEntity<ApiResponse<MindMapResponseDto>> generateMindMap(
            @RequestBody MindMapGenerationRequestDto request,
            Principal principal) {

        String userEmail = principal != null ? principal.getName() : null;
        MindMapResponseDto mindMap = mindMapService.generateMindMap(request, userEmail);

        return ResponseEntity.ok(
                ApiResponse.<MindMapResponseDto>builder()
                        .success(true)
                        .message("Mind map generated successfully")
                        .data(mindMap)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @PostMapping("/save")
    @Operation(summary = "Save a new or cloned mind map to PostgreSQL")
    public ResponseEntity<ApiResponse<MindMapResponseDto>> saveMindMap(
            @RequestBody MindMapResponseDto request,
            Principal principal) {
        String userEmail = principal != null ? principal.getName() : null;
        MindMapResponseDto saved = mindMapService.saveMindMap(request, userEmail);

        return ResponseEntity.ok(
                ApiResponse.<MindMapResponseDto>builder()
                        .success(true)
                        .message("Knowledge graph saved to vault")
                        .data(saved)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an existing mind map with modified title or edited nodes")
    public ResponseEntity<ApiResponse<MindMapResponseDto>> updateMindMap(
            @PathVariable UUID id,
            @RequestBody MindMapResponseDto request,
            Principal principal) {
        String userEmail = principal != null ? principal.getName() : null;
        MindMapResponseDto updated = mindMapService.updateMindMap(id, request, userEmail);

        return ResponseEntity.ok(
                ApiResponse.<MindMapResponseDto>builder()
                        .success(true)
                        .message("Knowledge graph updated successfully")
                        .data(updated)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @GetMapping("/saved")
    @Operation(summary = "Get user's saved mind maps from PostgreSQL")
    public ResponseEntity<ApiResponse<List<MindMapResponseDto>>> getSavedMindMaps(Principal principal) {
        String userEmail = principal != null ? principal.getName() : null;
        List<MindMapResponseDto> savedMaps = mindMapService.getSavedMindMaps(userEmail);

        return ResponseEntity.ok(
                ApiResponse.<List<MindMapResponseDto>>builder()
                        .success(true)
                        .message("Saved mind maps retrieved successfully")
                        .data(savedMaps)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a saved mind map record from PostgreSQL")
    public ResponseEntity<ApiResponse<Void>> deleteMindMap(@PathVariable UUID id) {
        mindMapService.deleteMindMap(id);

        return ResponseEntity.ok(
                ApiResponse.<Void>builder()
                        .success(true)
                        .message("Mind map deleted successfully")
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }
}
