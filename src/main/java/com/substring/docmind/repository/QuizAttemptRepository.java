package com.substring.docmind.repository;

import com.substring.docmind.entity.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, UUID> {

    List<QuizAttempt> findAllByOrderByCreatedAtDesc();

    List<QuizAttempt> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
