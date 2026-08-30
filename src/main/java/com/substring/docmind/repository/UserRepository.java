package com.substring.docmind.repository;

import com.substring.docmind.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;


public interface UserRepository extends JpaRepository<User, UUID> {
    
    /**
     * Find user by email
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Check if user exists by email
     */
    Boolean existsByEmail(String email);
}
