package com.substring.docmind.repository;

import com.substring.docmind.entity.Conversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, UUID> {

    /**
     * Find all conversations for a user with pagination
     */
    Page<Conversation> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

    /**
     * Find all conversations for a user
     */
    List<Conversation> findByUserIdOrderByUpdatedAtDesc(UUID userId);

    /**
     * Find conversation by ID and user ID
     */
    Optional<Conversation> findByIdAndUserId(UUID id, UUID userId);

    /**
     * Search conversations by title
     */
    @Query("SELECT c FROM Conversation c WHERE c.user.id = :userId AND LOWER(c.title) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Conversation> searchByTitle(@Param("userId") UUID userId, @Param("keyword") String keyword, Pageable pageable);

    /**
     * Count conversations for a user
     */
    Long countByUserId(UUID userId);
}
