package com.substring.docmind.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageResponseDto<T> {

    private List<T> content;
    private Integer currentPage;
    private Integer pageSize;
    private Long totalElements;
    private Integer totalPages;
    private Boolean hasNext;
    private Boolean hasPrevious;
    private Boolean isFirst;
    private Boolean isLast;

    public static <T> PageResponseDto<T> of(List<T> content, Integer page, Integer size, 
                                              Long totalElements) {
        int totalPages = (int) Math.ceil((double) totalElements / size);
        return PageResponseDto.<T>builder()
            .content(content)
            .currentPage(page)
            .pageSize(size)
            .totalElements(totalElements)
            .totalPages(totalPages)
            .hasNext(page < totalPages - 1)
            .hasPrevious(page > 0)
            .isFirst(page == 0)
            .isLast(page == totalPages - 1)
            .build();
    }
}
