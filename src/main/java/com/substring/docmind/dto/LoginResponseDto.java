package com.substring.docmind.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {

    private String token;
    private String email;
    private String name;
    private String role;
    private Long expiresIn; // Token expiration time in milliseconds

    public static LoginResponseDto fromUser(String token, String email, String name, String role, Long expiresIn) {
        return LoginResponseDto.builder()
                .token(token)
                .email(email)
                .name(name)
                .role(role)
                .expiresIn(expiresIn)
                .build();
    }
}
