package org.example.trai.entity.DTO;

import lombok.Data;

@Data
public class CommentsGetDTO {
    private Long postId;
    // 后续做二次查询类似分页
}
