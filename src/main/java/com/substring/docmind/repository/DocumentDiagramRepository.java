package com.substring.docmind.repository;

import com.substring.docmind.entity.DocumentDiagram;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentDiagramRepository extends JpaRepository<DocumentDiagram, UUID> {

    List<DocumentDiagram> findByDocumentId(UUID documentId);

    List<DocumentDiagram> findByDocumentIdAndPageNumber(UUID documentId, int pageNumber);

    List<DocumentDiagram> findByDocumentIdIn(List<UUID> documentIds);
}
