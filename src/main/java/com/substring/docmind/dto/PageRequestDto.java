package com.substring.docmind.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PageRequestDto {

    @Min(value = 0, message = "Page must be >= 0")
    private Integer page = 0;

    @Min(value = 1, message = "Size must be >= 1")
    @Max(value = 100, message = "Size cannot exceed 100")
    private Integer size = 20;

    private String sortBy = "createdAt";

    private String sortOrder = "desc"; // asc or desc
}
