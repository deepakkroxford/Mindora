package com.substring.docmind.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashcardDeckResponseDto {

    private String title;
    private List<String> documentNames;
    private List<FlashcardDto> cards;
    private boolean isCached;
}
