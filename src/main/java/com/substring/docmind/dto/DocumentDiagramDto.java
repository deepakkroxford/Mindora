package com.substring.docmind.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentDiagramDto {

    private UUID id;
    private UUID documentId;
    private String documentName;
    private int pageNumber;
    private String imageUrl;
    private int width;
    private int height;
    private String caption;
}
