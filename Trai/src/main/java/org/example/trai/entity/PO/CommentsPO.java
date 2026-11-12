package org.example.trai.entity.PO;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CommentsPO {
    private Long id;
    private Long userId;
    private Long postId;
    private Long rootId;
    private Long replyId;
    private Long replyUserId;
    private String content;
    private Integer replyCount;
    private LocalDateTime createTime;
    private Integer state;
}
