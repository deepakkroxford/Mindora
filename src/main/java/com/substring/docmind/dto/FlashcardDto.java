package com.substring.docmind.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashcardDto {

    private String id;
    private String front;
    private String back;
    private String category;
    private String hint;
}
