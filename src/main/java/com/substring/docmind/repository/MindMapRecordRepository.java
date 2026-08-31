package com.substring.docmind.repository;

import com.substring.docmind.entity.MindMapRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MindMapRecordRepository extends JpaRepository<MindMapRecord, UUID> {

    List<MindMapRecord> findAllByOrderByCreatedAtDesc();

    List<MindMapRecord> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
