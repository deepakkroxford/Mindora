package com.substring.docmind.dto;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MindMapNodeDto {

    private String id;
    private String label;
    private String description;
    private String category; // e.g. Core Architecture, Security, Data Flow, Configuration, Best Practice
    
    @Builder.Default
    private List<String> keywords = new ArrayList<>();
    
    @Builder.Default
    private List<MindMapNodeDto> children = new ArrayList<>();
}
