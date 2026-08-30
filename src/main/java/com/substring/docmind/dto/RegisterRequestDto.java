package com.substring.docmind.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequestDto {

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email cannot be empty")
    private String email;

    @NotBlank(message = "Name cannot be empty")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    private String name;

    @NotBlank(message = "Password cannot be empty")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotBlank(message = "Password confirmation cannot be empty")
    private String confirmPassword;

    public boolean passwordsMatch() {
        return password != null && password.equals(confirmPassword);
    }
}
