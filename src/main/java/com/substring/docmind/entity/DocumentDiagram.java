package com.substring.docmind.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_diagrams")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentDiagram {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "page_number", nullable = false)
    private int pageNumber;

    @Column(name = "image_file_name", nullable = false)
    private String imageFileName;

    @Column(name = "image_path", nullable = false, length = 1000)
    private String imagePath;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    private int width;
    private int height;

    @Column(length = 1000)
    private String caption;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
