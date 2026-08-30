# DocMind Enhancement Implementation Guide

## ✅ Completed (Tasks 1-2)

### Task 1: Input Validation & Error Handling
**Files Created/Updated:**
- `ErrorCode.java` - Standard error codes (4001-5099)
- `ErrorDetailsDto.java` - Error response DTO with error codes
- `ChatRequestDto.java` - Enhanced validation (NotBlank, Size, Min, Max, Pattern)
- `SearchRequestDto.java` - Enhanced validation
- `GlobalExceptionHandler.java` - Comprehensive error handlers with error codes

**Key Features:**
- Standardized error codes (e.g., `4001` for validation, `4221` for processing)
- Field-level error details
- Trace IDs for debugging
- Centralized exception handling

### Task 2: JWT Authentication Foundation
**Files Created:**
- `User.java` - User entity with role-based access
- `JwtUtil.java` - JWT token generation/validation
- `JwtAuthenticationFilter.java` - Filter to validate JWT on requests
- `SecurityConfig.java` - Spring Security configuration
- `LoginRequestDto.java` - Login request validation
- `LoginResponseDto.java` - Login response with token
- `RegisterRequestDto.java` - Registration request validation
- `UserRepository.java` - Database access for users
- **pom.xml** - Added Spring Security, JJWT, Resilience4j dependencies

**Key Features:**
- JWT token generation with email + role
- Token validation & expiration checking
- BCrypt password encoding
- CORS configuration
- Public/protected endpoint routing

---

## 📋 Remaining Tasks Implementation Guide

### Task 3: AuthService & Authentication Endpoints

**Create `AuthService.java`:**
```java
@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public LoginResponseDto login(LoginRequestDto request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Invalid credentials");
        }
        
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        String token = jwtUtil.generateToken(user.getEmail(), user.getRole());
        Long expiresIn = jwtUtil.getTokenExpirationTime(token);
        
        return LoginResponseDto.fromUser(token, user.getEmail(), user.getName(), user.getRole(), expiresIn);
    }

    public User register(RegisterRequestDto request) {
        if (!request.passwordsMatch()) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already registered");
        }
        
        User user = User.builder()
            .email(request.getEmail())
            .name(request.getName())
            .password(passwordEncoder.encode(request.getPassword()))
            .role("USER")
            .enabled(true)
            .build();
        
        return userRepository.save(user);
    }
}
```

**Create `AuthController.java`:**
```java
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponseDto>> login(@Valid @RequestBody LoginRequestDto request) {
        LoginResponseDto response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.<LoginResponseDto>builder()
            .success(true)
            .data(response)
            .timestamp(LocalDateTime.now())
            .build());
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@Valid @RequestBody RegisterRequestDto request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.<Void>builder()
                .success(true)
                .message("User registered successfully")
                .timestamp(LocalDateTime.now())
                .build());
    }
}
```

---

### Task 4: Rate Limiting (Resilience4j)

**Update `application-dev.yml`:**
```yaml
resilience4j:
  ratelimiter:
    instances:
      document-upload:
        registerHealthIndicator: true
        limitRefreshPeriod: 1m
        limitForPeriod: 10
        timeoutDuration: 5s
      chat-query:
        registerHealthIndicator: true
        limitRefreshPeriod: 1m
        limitForPeriod: 30
        timeoutDuration: 5s
```

**Create `RateLimitingAspect.java`:**
```java
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class RateLimitingAspect {
    private final RateLimiterRegistry rateLimiterRegistry;

    @Around("@annotation(rateLimit)")
    public Object rateLimitRequest(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        RateLimiter rateLimiter = rateLimiterRegistry.rateLimiter(rateLimit.value());
        
        if (!rateLimiter.acquirePermission()) {
            throw new RuntimeException(ErrorCode.RATE_LIMIT_EXCEEDED.getMessage());
        }
        
        return pjp.proceed();
    }
}

// Add @RateLimit("document-upload") to DocumentController.uploadDocument()
// Add @RateLimit("chat-query") to ChatController.askQuestion()
```

---

### Task 5: Conversation History

**Create `Conversation.java` Entity:**
```java
@Entity
@Table(name = "conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Conversation {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne
    private User user;
    
    private String title;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

@Entity
@Table(name = "chat_messages")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne
    private Conversation conversation;
    
    private String question;
    private String answer;
    
    @CreationTimestamp
    private LocalDateTime timestamp;
}
```

**Create Repositories and Service:**
- `ConversationRepository`
- `ChatMessageRepository`
- `ConversationService` - CRUD operations
- `ConversationController` - REST endpoints (/api/v1/conversations)

---

### Task 6: Pagination

**Update DTOs with Pagination:**
```java
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PageRequestDto {
    @Min(0)
    private Integer page = 0;
    
    @Min(1) @Max(100)
    private Integer size = 20;
    
    private String sortBy = "createdAt";
    private String sortOrder = "desc";
}

@Getter @Setter @Builder
public class PageResponseDto<T> {
    private List<T> content;
    private Integer currentPage;
    private Integer totalPages;
    private Long totalElements;
    private Boolean hasNext;
    private Boolean hasPrevious;
}
```

**Update Controllers:**
```java
@GetMapping
public ResponseEntity<ApiResponse<PageResponseDto<DocumentMetadataDto>>> listDocuments(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<DocumentMetadata> docs = documentRepository.findAll(pageable);
    // Map to PageResponseDto
}
```

---

### Task 7: Audit Logging

**Create `AuditLog.java` Entity:**
```java
@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne
    private User user;
    
    private String action; // UPLOAD, DELETE, QUERY, etc.
    private String entity; // DOCUMENT, CONVERSATION, etc.
    private String entityId;
    private String details;
    
    @CreationTimestamp
    private LocalDateTime timestamp;
}
```

**Create Audit Aspect:**
```java
@Aspect
@Component
@Slf4j
@RequiredArgsConstructor
public class AuditAspect {
    private final AuditLogRepository auditLogRepository;
    
    @AfterReturning("@annotation(auditable)")
    public void audit(JoinPoint jp, Auditable auditableAnnotation) {
        // Log user action to database
    }
}
```

---

## 🎨 Frontend Implementation Guide

### Task 8: Error Boundaries

```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught:', error);
    this.setState({ hasError: true, error });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Wrap in App.tsx
<ErrorBoundary>
  <AppProvider>
    <App />
  </AppProvider>
</ErrorBoundary>
```

### Task 9: Loading Skeletons

```typescript
// src/components/Skeleton.tsx
export const DocumentSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
    <div className="h-4 bg-gray-300 rounded"></div>
  </div>
);
```

### Task 10: Dark Mode

```typescript
// src/context/ThemeContext.tsx
export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(
    localStorage.getItem('theme') === 'dark'
  );

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark) }}>
      <div className={isDark ? 'dark' : ''}>{children}</div>
    </ThemeContext.Provider>
  );
};
```

### Task 11-13: Remaining Frontend Features

- **Copy to Clipboard**: Use `navigator.clipboard.writeText()`
- **Search Debouncing**: Use lodash debounce or custom hook
- **Search History**: Store in localStorage with timestamps
- **Auth UI**: Create Login/Register pages with form validation

---

## 🔧 Configuration Updates

Add to `application-dev.yml`:
```yaml
app:
  jwt:
    secret: ${JWT_SECRET:YourSecureSecretKeyHere}
    expiration: 86400000 # 24 hours
  
  audit:
    enabled: true
    
  auth:
    password-min-length: 8
    password-require-special: true

server:
  servlet:
    context-path: /api
```

---

## ✨ Testing Checklist

- [ ] User registration with validation
- [ ] Login returns valid JWT token
- [ ] Protected endpoints reject invalid tokens
- [ ] Rate limiting blocks requests > limit
- [ ] Conversation history persists
- [ ] Pagination works correctly
- [ ] Audit logs record all actions
- [ ] Error responses include error codes
- [ ] Frontend error boundary catches errors
- [ ] Dark mode persists on reload

---

## Next Steps

1. Create AuthService and AuthController (Task 3)
2. Implement Rate Limiting annotations (Task 4)
3. Create Conversation entities and services (Task 5)
4. Add pagination to existing endpoints (Task 6)
5. Implement audit logging (Task 7)
6. Build frontend error handling and UI features (Tasks 8-13)

Would you like me to proceed with any specific task?
