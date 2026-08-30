package com.substring.docmind.repository;

import com.substring.docmind.entity.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    /**
     * Find all messages for a conversation
     */
    List<ChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    /**
     * Find messages with pagination
     */
    Page<ChatMessage> findByConversationIdOrderByCreatedAtDesc(UUID conversationId, Pageable pageable);

    /**
     * Count messages for a conversation
     */
    Long countByConversationId(UUID conversationId);

    /**
     * Delete messages for a conversation
     */
    void deleteByConversationId(UUID conversationId);
}
