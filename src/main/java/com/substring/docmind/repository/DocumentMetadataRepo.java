package com.substring.docmind.repository;

import com.substring.docmind.entity.DocumentMetadata;
import com.substring.docmind.entity.DocumentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentMetadataRepo extends JpaRepository<DocumentMetadata, UUID> {

    List<DocumentMetadata> findByStatus(DocumentStatus status);

    List<DocumentMetadata> findAllByOrderByCreatedAtDesc();


}
